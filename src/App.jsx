import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutGrid, FileText, Calendar, Settings, Plus, Search, Folder, 
  Calculator, TrendingUp, DollarSign, X, CheckCircle, Trash2, 
  ChevronRight, PieChart, Users, Building, MapPin, Menu, Printer,
  Filter, AlertCircle, Save, Edit, MoreVertical, Download, Loader2,
  FolderOpen, ArrowLeft, Home, WifiOff, Upload, Database, CalendarRange,
  History, Lock, FileInput, Receipt, CheckSquare, FileSpreadsheet,
  PiggyBank, RefreshCw
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, onSnapshot, addDoc, updateDoc, 
  doc, deleteDoc, query, orderBy, setDoc, getDoc, writeBatch 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCO_phXPPwZEgQEQlug69bvG5snSbRYZfQ",
  authDomain: "gestor-facturas-b665a.firebaseapp.com",
  databaseURL: "https://gestor-facturas-b665a-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gestor-facturas-b665a",
  storageBucket: "gestor-facturas-b665a.firebasestorage.app",
  messagingSenderId: "178513177002",
  appId: "1:178513177002:web:d470b0d03e5ef64bf3e3d3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const Toast = ({ message, type, show, onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  const bgColors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    warning: 'bg-orange-500'
  };

  return (
    <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-xl shadow-2xl z-[100] flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${bgColors[type] || 'bg-gray-900'} text-white`}>
      {type === 'info' && <Loader2 size={20} className="animate-spin" />}
      {type === 'success' && <CheckCircle size={20} />}
      {type === 'error' && <AlertCircle size={20} />}
      {type === 'warning' && <WifiOff size={20} />}
      <span className="font-medium text-sm">{message}</span>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('panel');
  const [obras, setObras] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [facturas, setFacturas] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [navState, setNavState] = useState({ empresa: null, encargado: null });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingObra, setEditingObra] = useState(null);
  const [viewCiclo, setViewCiclo] = useState(null);
  const [confirmCierre, setConfirmCierre] = useState(false);
  const [cierreEmpresa, setCierreEmpresa] = useState('Todas');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // ESTADOS MÓDULO FACTURAS
  const [selectedForInvoice, setSelectedForInvoice] = useState([]);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceToPrint, setInvoiceToPrint] = useState(null);
  const [editingFactura, setEditingFactura] = useState(null);

  // ESTADO NUEVO: MÓDULO RETENCIONES
  const [retencionesFilter, setRetencionesFilter] = useState('Todas');

  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientData, setNewClientData] = useState({ nombre: '', cif: '', direccion: '' });

  const [config, setConfig] = useState({
    empresas: ['Elecnor', 'Magtel', 'Ezentis', 'Circet'],
    encargados: ['Juan Pérez', 'Ana García'],
    centrales: ['Madrid Centro', 'Sevilla Norte', 'Valencia Puerto'],
    contratos: ['Marco 2024', 'Anexo 1'],
    empresasFacturacion: [
      {
        nombre: 'ELECNOR SERVICIOS Y PROYECTOS S.A.U',
        cif: 'A-79486833',
        direccion: 'CALLE MARQUES DE MONDEJAR, 33\nMADRID, CP: 28028'
      },
      {
        nombre: 'ZENER COMUNICACIONES, S.A.U',
        cif: 'A47078605',
        direccion: 'Ronda de Valvecarrizo, 47 Naves B-11 y B-14\nTres Cantos, CP: 28760'
      }
    ]
  });

  const initialObraState = {
    idCarreras: '',
    idObra: '',
    nombre: '',
    cliente: '',
    central: '',
    encargado: '',
    importe: '',
    fecha: new Date().toISOString().split('T')[0],
    tieneRetencion: false,
    contrato: '',
    numFactura: '',
    estado: 'pendiente',
    observaciones: '',
    uuii: ''
  };
  const [formData, setFormData] = useState(initialObraState);

  // Formulario Factura
  const [invoiceForm, setInvoiceForm] = useState({
    clienteIdx: 0,
    numFactura: '',
    fecha: new Date().toISOString().split('T')[0],
    numContrato: '',
    numPedido: '',
    retencion: false,
    prontoPago: false,
    formaPago: 'CONFIRMING A 120 DÍAS',
    usarImporteManual: false,
    importeManual: ''
  });

  const [reportFilter, setReportFilter] = useState({ empresa: 'Todas', encargado: 'Todos' });
  const isEncargadoFilter = reportFilter.encargado !== 'Todos';

  const showToast = (msg, type = 'success') => {
    setNotification({ show: true, message: msg, type });
  };

  const loadData = () => {
    const qObras = query(collection(db, "obras"));
    onSnapshot(qObras, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setObras(data);
      setLoading(false);
    });

    const qCiclos = query(collection(db, "ciclos"), orderBy("fecha", "desc"));
    onSnapshot(qCiclos, (snapshot) => {
      setCiclos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qFacturas = query(collection(db, "facturas"));
    onSnapshot(qFacturas, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      data.sort((a, b) => {
        const getNum = (str) => {
          const match = String(str || "").match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        };
        
        const numA = getNum(a.numFactura);
        const numB = getNum(b.numFactura);
        
        if (numA === numB) {
          const yearA = parseInt(String(a.numFactura || "0").split('-')[2] || "0", 10);
          const yearB = parseInt(String(b.numFactura || "0").split('-')[2] || "0", 10);
          return yearA - yearB;
        }
        
        return numA - numB;
      });
      
      setFacturas(data);
    });

    const configRef = doc(db, "configuracion", "listas_generales");
    onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (!data.empresasFacturacion) {
          data.empresasFacturacion = config.empresasFacturacion;
          setDoc(configRef, data);
        }
        setConfig(data);
      } else {
        setDoc(configRef, config);
      }
    });
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        loadData(); 
      } else {
        signInAnonymously(auth).catch((error) => {
          showToast("Error de conexión con la nube", "error");
        });
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleSaveObra = async (e) => {
    e.preventDefault();
    if (!user) return showToast("Esperando conexión...", "info");

    const obraData = {
      ...formData,
      importe: parseFloat(formData.importe) || 0,
      mes: new Date(formData.fecha).toLocaleString('es-ES', { month: 'long', year: 'numeric' }),
      updatedAt: new Date(),
      updatedBy: user.uid
    };

    setModalOpen(false);
    setFormData(initialObraState);
    const esEdicion = !!editingObra;
    setEditingObra(null);
    showToast("Guardando...", "info");

    try {
      if (esEdicion) await updateDoc(doc(db, "obras", editingObra.id), obraData);
      else await addDoc(collection(db, "obras"), { ...obraData, createdAt: new Date() });
      showToast(esEdicion ? "Actualizado" : "Guardado", "success");
    } catch (error) {
      showToast("Error al guardar", "error");
    }
  };

  const handleCerrarCiclo = async () => {
    if (!user) return;
    
    const obrasPendientes = obras.filter(o => o.estado === 'pendiente' && (cierreEmpresa === 'Todas' || o.cliente === cierreEmpresa));
    
    if (obrasPendientes.length === 0) return showToast(`No hay obras pendientes ${cierreEmpresa !== 'Todas' ? `para ${cierreEmpresa}` : ''}.`, "warning");

    setConfirmCierre(false);
    showToast("Cerrando ciclo...", "info");

    try {
      const obrasSanitizadas = obrasPendientes.map(obra => {
        const clean = { ...obra };
        Object.keys(clean).forEach(key => clean[key] === undefined && delete clean[key]);
        if (clean.createdAt && typeof clean.createdAt.toDate === 'function') clean.createdAt = clean.createdAt.toDate().toISOString();
        if (clean.updatedAt && typeof clean.updatedAt.toDate === 'function') clean.updatedAt = clean.updatedAt.toDate().toISOString();
        return clean;
      });

      const prefix = cierreEmpresa === 'Todas' ? 'Cierre General' : `Cierre ${cierreEmpresa}`;
      const nombreCiclo = `${prefix} - ${new Date().toLocaleDateString('es-ES', {day: 'numeric', month: 'short', year: 'numeric'})}`;
      
      const cicloRef = await addDoc(collection(db, "ciclos"), {
        nombre: nombreCiclo, 
        fecha: new Date().toISOString(), 
        obras: obrasSanitizadas, 
        totalObras: obrasSanitizadas.length, 
        creadoPor: user.uid,
        empresaCierre: cierreEmpresa 
      });

      let batch = writeBatch(db);
      let count = 0;
      for (const obra of obrasPendientes) {
        batch.update(doc(db, "obras", obra.id), { estado: 'facturado', cicloId: cicloRef.id });
        if (++count >= 450) { await batch.commit(); batch = writeBatch(db); count = 0; }
      }
      if (count > 0) await batch.commit();
      
      setCierreEmpresa('Todas'); 
      showToast("¡Ciclo cerrado con éxito!", "success");
    } catch (error) {
      showToast("Error al procesar el cierre.", "error");
    }
  };

  const subtotalFactura = useMemo(() => {
    if (!viewCiclo || selectedForInvoice.length === 0) return 0;
    return selectedForInvoice.reduce((sum, id) => {
      const o = viewCiclo.obras.find(x => x.id === id);
      if(!o) return sum;
      const base = parseFloat(o.importe) || 0;
      const plus = o.tieneRetencion ? base * 0.05 : 0;
      const uuii = (parseFloat(o.uuii) || 0) * 1.5;
      return sum + base + plus + uuii;
    }, 0);
  }, [selectedForInvoice, viewCiclo]);

  // Esta variable maneja si el usuario ha escrito un total manual o si usa la suma de las obras
  const effectiveSubtotalDisplay = invoiceForm.usarImporteManual ? (parseFloat(invoiceForm.importeManual) || 0) : subtotalFactura;

  const handleCreateFactura = async (e) => {
    e.preventDefault();
    if (!invoiceForm.numFactura.trim()) return showToast("Falta número de factura", "warning");

    showToast("Generando factura...", "info");
    const clienteData = config.empresasFacturacion[invoiceForm.clienteIdx];
    
    // MATEMÁTICA CORREGIDA PARA CREACIÓN DE FACTURA USANDO EL SUBTOTAL EFECTIVO:
    const prontoPagoAmount = invoiceForm.prontoPago ? effectiveSubtotalDisplay * 0.05 : 0;
    const baseImponibleNeta = effectiveSubtotalDisplay - prontoPagoAmount;
    const ivaAmount = baseImponibleNeta * 0.21;
    
    const retencionAmount = invoiceForm.retencion ? effectiveSubtotalDisplay * 0.05 : 0; 
    
    const totalAmount = baseImponibleNeta + ivaAmount - retencionAmount;

    const obrasDetalle = selectedForInvoice.map(id => {
      const o = viewCiclo.obras.find(x => x.id === id);
      const base = parseFloat(o.importe) || 0;
      const totalLinea = base + (o.tieneRetencion ? base * 0.05 : 0) + ((parseFloat(o.uuii) || 0) * 1.5);
      return { id: o.id, idCarreras: o.idCarreras, nombre: o.nombre, total: totalLinea };
    });

    const facturaDoc = {
      numFactura: invoiceForm.numFactura,
      fecha: invoiceForm.fecha,
      contrato: invoiceForm.numContrato,
      pedido: invoiceForm.numPedido,
      cliente: clienteData,
      obras: obrasDetalle,
      subtotal: effectiveSubtotalDisplay, // Guardamos el importe (manual o sumado)
      retencion: retencionAmount,
      retencionSolicitada: false,
      prontoPago: prontoPagoAmount,
      iva: ivaAmount,
      total: totalAmount,
      formaPago: invoiceForm.formaPago,
      cicloId: viewCiclo.id,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, "facturas"), facturaDoc);

      let batch = writeBatch(db);
      selectedForInvoice.forEach(obraId => {
        batch.update(doc(db, "obras", obraId), { numFactura: invoiceForm.numFactura });
      });

      const updatedObrasCiclo = viewCiclo.obras.map(o => 
        selectedForInvoice.includes(o.id) ? { ...o, numFactura: invoiceForm.numFactura } : o
      );
      batch.update(doc(db, "ciclos", viewCiclo.id), { obras: updatedObrasCiclo });

      await batch.commit();

      setInvoiceModalOpen(false);
      setSelectedForInvoice([]);
      setViewCiclo({...viewCiclo, obras: updatedObrasCiclo}); 
      
      setInvoiceForm({ ...invoiceForm, numFactura: '', numContrato: '', numPedido: '', retencion: false, prontoPago: false, usarImporteManual: false, importeManual: '' });
      showToast("Factura generada y asignada con éxito", "success");
      setActiveTab('facturas'); 
      
    } catch (error) {
      console.error(error);
      showToast("Error al generar factura", "error");
    }
  };

  const printSpecificInvoice = (factura) => {
    setInvoiceToPrint(factura);
    setTimeout(() => {
      window.print();
      setInvoiceToPrint(null);
    }, 500);
  };

  const handleSyncOldInvoices = async () => {
    if (!user) return showToast("Esperando conexión...", "info");
    if (!confirm("¿Generar facturas oficiales y retenciones para expedientes de ciclos antiguos que ya tengan asignado un Nº Factura manual?")) return;

    showToast("Sincronizando expedientes...", "info");
    const existingFacturaNums = new Set(facturas.map(f => f.numFactura));
    const newFacturasMap = {};

    ciclos.forEach(ciclo => {
      if (ciclo.obras && Array.isArray(ciclo.obras)) {
        ciclo.obras.forEach(obra => {
          if (obra.numFactura && !existingFacturaNums.has(obra.numFactura)) {
            if (!newFacturasMap[obra.numFactura]) {
              let clienteData = { nombre: obra.cliente || 'CLIENTE SIN ASIGNAR', cif: 'Desconocido', direccion: 'Desconocida' };
              const clienteConfig = config.empresasFacturacion?.find(c => c.nombre.toLowerCase().includes((obra.cliente||'').toLowerCase()));
              if (clienteConfig) clienteData = clienteConfig;

              newFacturasMap[obra.numFactura] = {
                numFactura: obra.numFactura,
                fecha: ciclo.fecha.split('T')[0],
                contrato: obra.contrato || '',
                pedido: '',
                cliente: clienteData,
                obras: [],
                subtotal: 0,
                retencion: 0,
                retencionSolicitada: false,
                prontoPago: 0,
                iva: 0,
                total: 0,
                formaPago: 'CONFIRMING A 120 DÍAS',
                cicloId: ciclo.id,
                createdAt: new Date().toISOString()
              };
            }

            const base = parseFloat(obra.importe) || 0;
            const totalLinea = base + (obra.tieneRetencion ? base * 0.05 : 0) + ((parseFloat(obra.uuii) || 0) * 1.5);
            
            newFacturasMap[obra.numFactura].obras.push({
              id: obra.id, idCarreras: obra.idCarreras, nombre: obra.nombre, total: totalLinea
            });
            newFacturasMap[obra.numFactura].subtotal += totalLinea;
          }
        });
      }
    });

    const facturasToCreate = Object.values(newFacturasMap);
    if (facturasToCreate.length === 0) return showToast("No hay facturas antiguas para sincronizar.", "info");

    try {
      let batch = writeBatch(db);
      let count = 0;
      for (const f of facturasToCreate) {
        f.retencion = f.subtotal * 0.05; 
        f.prontoPago = 0;
        f.iva = f.subtotal * 0.21;
        f.total = f.subtotal - f.retencion + f.iva;

        batch.set(doc(collection(db, "facturas")), f);
        if (++count >= 400) { await batch.commit(); batch = writeBatch(db); count = 0; }
      }
      if (count > 0) await batch.commit();
      showToast(`¡Sincronización completa! Se crearon ${facturasToCreate.length} facturas.`, "success");
    } catch (error) {
      showToast("Error al sincronizar", "error");
    }
  };

  const retencionesData = useMemo(() => {
    return facturas
      .filter(f => f.retencion > 0)
      .map(f => {
        const parts = f.fecha.split('-'); 
        const fechaElegibleStr = `${parseInt(parts[0]) + 1}-${parts[1]}-${parts[2]}`;
        const hoy = new Date().toISOString().split('T')[0];

        let estadoRetencion = 'en_espera';
        if (f.retencionSolicitada) {
          estadoRetencion = 'solicitada';
        } else if (hoy >= fechaElegibleStr) {
          estadoRetencion = 'pendiente_solicitar';
        }

        return { ...f, fechaElegibleStr, estadoRetencion };
      })
      .sort((a, b) => {
        const getNum = (str) => {
          const match = String(str || "").match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        };
        const numA = getNum(a.numFactura);
        const numB = getNum(b.numFactura);
        
        if (numA === numB) {
          const yearA = parseInt(String(a.numFactura || "0").split('-')[2] || "0", 10);
          const yearB = parseInt(String(b.numFactura || "0").split('-')[2] || "0", 10);
          return yearA - yearB;
        }
        
        return numA - numB;
      });
  }, [facturas]);

  const retencionesFiltradas = useMemo(() => {
    if (retencionesFilter === 'Todas') return retencionesData;
    return retencionesData.filter(r => r.estadoRetencion === retencionesFilter);
  }, [retencionesData, retencionesFilter]);

  const handleMarcarRetencion = async (id) => {
    if (!confirm("¿Confirmas que ya has reclamado el cobro de esta retención?")) return;
    try {
      await updateDoc(doc(db, "facturas", id), { 
        retencionSolicitada: true,
        fechaSolicitudRetencion: new Date().toISOString()
      });
      showToast("Retención marcada como Solicitada", "success");
    } catch (error) {
      showToast("Error al actualizar la retención", "error");
    }
  };

  const handleUpdateFacturaCiclo = async (obraId, currentFactura) => {
    const nuevaFactura = prompt("Asignar Nº Factura Manualmente:", currentFactura || "");
    if (nuevaFactura === null) return;
    try {
      const updatedObrasCiclo = (viewCiclo.obras || []).map(o => o.id === obraId ? { ...o, numFactura: nuevaFactura } : o);
      await updateDoc(doc(db, "ciclos", viewCiclo.id), { obras: updatedObrasCiclo });
      await updateDoc(doc(db, "obras", obraId), { numFactura: nuevaFactura });
      setViewCiclo({ ...viewCiclo, obras: updatedObrasCiclo });
      showToast("Nº Factura asignado", "success");
    } catch (error) { showToast("Error al actualizar factura", "error"); }
  };

  const handleUpdateImporteCiclo = async (obraId, currentImporte) => {
    const nuevoImporteStr = prompt("Modificar Importe Base (€):", currentImporte || "0");
    if (nuevoImporteStr === null) return;
    const parseado = parseFloat(nuevoImporteStr.replace(',', '.'));
    if (isNaN(parseado)) return showToast("Importe no válido", "error");
    try {
      const updatedObrasCiclo = (viewCiclo.obras || []).map(o => o.id === obraId ? { ...o, importe: parseado } : o);
      await updateDoc(doc(db, "ciclos", viewCiclo.id), { obras: updatedObrasCiclo });
      await updateDoc(doc(db, "obras", obraId), { importe: parseado });
      setViewCiclo({ ...viewCiclo, obras: updatedObrasCiclo });
      showToast("Importe modificado", "success");
    } catch (error) { showToast("Error al actualizar importe", "error"); }
  };

  const handleDelete = async (id) => {
    if (confirm("⚠️ ¿Eliminar expediente?")) {
      try {
        await deleteDoc(doc(db, "obras", id));
        showToast("Eliminado", "success");
      } catch (error) { showToast("Error al eliminar", "error"); }
    }
  };

  const handleEdit = (obra) => {
    setEditingObra(obra);
    setFormData(obra);
    setModalOpen(true);
  };

  const updateConfigList = async (type, action, value) => {
    const currentList = config[type] || [];
    let newList = [...currentList];
    if (action === 'add') newList.push(value);
    else if (action === 'delete') newList = newList.filter(item => item !== value);
    setConfig(prev => ({ ...prev, [type]: newList }));
    try {
      await setDoc(doc(db, "configuracion", "listas_generales"), { ...config, [type]: newList });
    } catch (error) { showToast("Error config", 'error'); }
  };

  const handleExportBackup = () => {
    const dataStr = JSON.stringify(obras, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_Gestión_de_Obras_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!Array.isArray(data)) throw new Error();
        if (!confirm(`Importar ${data.length} obras?`)) return;
        showToast(`Importando...`, "info");
        for (const item of data) {
           if(item.id) await setDoc(doc(db, "obras", item.id), item);
           else await addDoc(collection(db, "obras"), item);
        }
        showToast(`Completado`, "success");
      } catch (error) { showToast("Archivo inválido", "error"); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const sourceData = useMemo(() => {
    if (activeTab === 'cierres' && viewCiclo) return viewCiclo.obras || []; 
    return obras;
  }, [obras, activeTab, viewCiclo]);

  const obrasFiltradas = useMemo(() => {
    const filtered = sourceData.filter(o => {
      const matchSearch = 
        o.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        o.idCarreras?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.idObra?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.cliente?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (searchQuery) return matchSearch;
      if (activeTab === 'reportes') {
        if (o.estado !== 'pendiente') return false; 
        const matchEmpresa = reportFilter.empresa === 'Todas' || o.cliente === reportFilter.empresa;
        const matchEncargado = reportFilter.encargado === 'Todos' || o.encargado === reportFilter.encargado;
        return matchEmpresa && matchEncargado;
      }
      if (activeTab === 'cierres' && viewCiclo) {
        const matchEmpresa = reportFilter.empresa === 'Todas' || o.cliente === reportFilter.empresa;
        const matchEncargado = reportFilter.encargado === 'Todos' || o.encargado === reportFilter.encargado;
        return matchEmpresa && matchEncargado;
      }
      if (activeTab === 'panel') {
        if (o.estado !== 'pendiente') return false; 
        if (navState.empresa && o.cliente !== navState.empresa) return false;
        if (navState.encargado && o.encargado !== navState.encargado) return false;
        return true;
      }
      return matchSearch;
    });

    return filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [sourceData, searchQuery, activeTab, reportFilter, navState, viewCiclo]);

  const totales = useMemo(() => {
    const base = obrasFiltradas.reduce((acc, curr) => acc + (parseFloat(curr.importe) || 0), 0);
    const iva = base * 0.21;
    const plus = obrasFiltradas.reduce((acc, curr) => acc + (curr.tieneRetencion ? (parseFloat(curr.importe) * 0.05) : 0), 0);
    const uuii = obrasFiltradas.reduce((acc, curr) => acc + ((parseFloat(curr.uuii) || 0) * 1.50), 0);
    const totalConIva = base + iva + plus + uuii;
    const totalSinIva = base + plus + uuii;
    const totalBasePlus = base + plus;
    return { base, iva, plus, uuii, totalConIva, totalSinIva, totalBasePlus };
  }, [obrasFiltradas]);

  const treeData = useMemo(() => {
    const tree = {};
    obras.forEach(obra => {
      const emp = obra.cliente || 'Sin Empresa';
      const enc = obra.encargado || 'Sin Encargado';
      if (!tree[emp]) tree[emp] = { totalPendiente: 0, encargados: {} };
      if (obra.estado === 'pendiente') {
        const base = parseFloat(obra.importe) || 0;
        const plus = obra.tieneRetencion ? base * 0.05 : 0;
        const uuiiVal = (parseFloat(obra.uuii) || 0) * 1.50;
        const totalObra = base + plus + uuiiVal;
        tree[emp].totalPendiente += totalObra;
        if (!tree[emp].encargados[enc]) tree[emp].encargados[enc] = { totalPendiente: 0 };
        tree[emp].encargados[enc].totalPendiente += totalObra;
      } else {
        if (!tree[emp].encargados[enc]) tree[emp].encargados[enc] = { totalPendiente: 0 };
      }
    });
    return tree;
  }, [obras]);

  const handlePrint = () => window.print();

  useEffect(() => {
    if (activeTab !== 'panel') { setNavState({ empresa: null, encargado: null }); setSearchQuery(''); }
    if (activeTab !== 'cierres') { setViewCiclo(null); setSelectedForInvoice([]); }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 flex flex-col md:flex-row print:bg-white relative">
      <Toast show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ ...notification, show: false })} />

      <style>{`
        @media print {
          @page { margin: ${invoiceToPrint ? '0' : 'auto'}; } 
          .hide-on-invoice-print { display: ${invoiceToPrint ? 'none !important' : 'block'}; }
          aside, header, .no-print, .fab-button, .modal-overlay, button, .input-filter { display: none !important; }
          main { margin: 0 !important; padding: ${invoiceToPrint ? '0' : '20px'} !important; overflow: visible !important; height: auto !important; width: 100% !important; background: white !important; }
          body { background: white !important; font-size: 11px; color: black; }
          .print-header { display: ${invoiceToPrint ? 'none !important' : 'flex !important'}; margin-bottom: 30px; border-bottom: 2px solid #cc0000; padding-bottom: 15px; flex-direction: row !important; justify-content: space-between !important; align-items: center !important; }
          .card-resumen { border: 1px solid #ddd !important; box-shadow: none !important; margin-bottom: 15px; page-break-inside: avoid; }
          .break-page { page-break-before: always; }
          .invoice-wrapper { display: ${invoiceToPrint ? 'block !important' : 'none'}; padding: 15mm; width: 100%; box-sizing: border-box; }
          .invoice-table th, .invoice-table td { padding: 8px; border: 1px solid #ddd; text-align: left; }
          .invoice-table th { background-color: #f8f9fa !important; font-weight: bold; }
        }
        .print-header, .invoice-wrapper { display: none; }
      `}</style>

      {/* PLANTILLA DE FACTURA PARA IMPRESIÓN */}
      {invoiceToPrint && (
        <div className="invoice-wrapper bg-white text-black font-sans absolute top-0 left-0 w-full z-50">
          <div className="flex justify-between border-b-2 border-red-600 pb-4 mb-6 items-end">
            <div>
              <h1 className="text-3xl font-extrabold text-red-600 tracking-tight leading-none mb-1">REDES CARRERAS S.L.</h1>
              <p className="font-bold text-sm text-gray-700 uppercase tracking-widest">Telecomunicaciones</p>
            </div>
          </div>
          <div className="flex justify-between mb-10 text-sm">
            <div className="w-5/12">
              <h3 className="font-extrabold border-b border-gray-300 pb-1 mb-3 text-gray-500 uppercase text-xs">Empresa</h3>
              <p className="font-bold text-base mb-1">REDES CARRERAS S.L.</p>
              <p>CIF: B87152963</p>
              <p>CALLE LAGUNA DEL MARQUESADO</p>
              <p>Nº.30 NAVE: D</p>
              <p>MADRID, CP: 28021</p>
              <p>TEL: 630241775</p>
            </div>
            <div className="w-5/12">
              <h3 className="font-extrabold border-b border-gray-300 pb-1 mb-3 text-gray-500 uppercase text-xs">Facturar A</h3>
              <p className="font-bold text-base mb-1">{invoiceToPrint.cliente.nombre}</p>
              <p>CIF: {invoiceToPrint.cliente.cif}</p>
              <p className="whitespace-pre-line leading-relaxed">{invoiceToPrint.cliente.direccion}</p>
            </div>
          </div>
          <div className="bg-gray-100/80 p-5 rounded-lg mb-8 grid grid-cols-2 gap-y-3 border border-gray-200 text-sm">
            {invoiceToPrint.contrato && <p><span className="font-bold text-gray-600">N.º DE CONTRATO:</span> <span className="font-medium">{invoiceToPrint.contrato}</span></p>}
            {invoiceToPrint.pedido && <p><span className="font-bold text-gray-600">N.º DE PEDIDO:</span> <span className="font-medium">{invoiceToPrint.pedido}</span></p>}
            <p><span className="font-bold text-gray-600">FACTURA N.º:</span> <span className="font-black text-lg text-red-600 ml-2">{invoiceToPrint.numFactura}</span></p>
            <p><span className="font-bold text-gray-600">Fecha de Emisión:</span> <span className="font-medium">{new Date(invoiceToPrint.fecha).toLocaleDateString('es-ES')}</span></p>
          </div>
          <table className="w-full invoice-table mb-10 text-sm border-collapse">
            <thead>
              <tr>
                <th className="w-12 text-center text-gray-600">N.º</th>
                <th className="text-gray-600">Descripción de los Trabajos (ID - Obra)</th>
                <th className="w-32 text-right text-gray-600">Importe</th>
              </tr>
            </thead>
            <tbody>
              {invoiceToPrint.obras.map((obra, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="text-center font-bold text-gray-400">{idx + 1}</td>
                  <td>
                    <span className="font-mono text-gray-600 mr-2">{obra.idCarreras}</span> 
                    <span className="font-medium">{obra.nombre}</span>
                  </td>
                  <td className="text-right font-medium">{obra.total.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end mb-10">
            <div className="w-80 bg-gray-50/50 border border-gray-300 p-4 rounded-lg text-sm">
              <div className="flex justify-between font-bold border-b border-gray-200 pb-2 mb-3">
                <span className="text-gray-600">TOTAL BRUTO:</span>
                <span>{invoiceToPrint.subtotal.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
              </div>
              {invoiceToPrint.prontoPago > 0 && (
                <div className="flex justify-between mb-2 text-blue-600 font-medium border-b border-gray-100 pb-2">
                  <span>5% PRONTO PAGO:</span>
                  <span>-{invoiceToPrint.prontoPago.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
                </div>
              )}
              {/* Mostramos la Base Imponible Real (Bruto - Pronto Pago) si hubo descuento */}
              {invoiceToPrint.prontoPago > 0 && (
                <div className="flex justify-between font-bold mb-3 text-gray-700">
                  <span>BASE IMPONIBLE NETA:</span>
                  <span>{(invoiceToPrint.subtotal - invoiceToPrint.prontoPago).toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
                </div>
              )}
              {invoiceToPrint.retencion > 0 && (
                <div className="flex justify-between mb-2 text-red-600 font-medium">
                  <span>5% RETENCIÓN:</span>
                  <span>-{invoiceToPrint.retencion.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
                </div>
              )}
              <div className="flex justify-between mb-3 text-gray-700 font-medium">
                <span>IVA 21%:</span>
                <span>{invoiceToPrint.iva.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
              </div>
              <div className="flex justify-between font-black text-lg border-t-2 border-red-600 pt-3 text-gray-900 mt-2">
                <span>A COBRAR:</span>
                <span>{invoiceToPrint.total.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
              </div>
            </div>
          </div>
          <div className="font-bold border-t-2 border-red-600 pt-4 text-sm text-gray-800">
            <p>FORMA DE PAGO: <span className="font-black ml-2">{invoiceToPrint.formaPago}</span></p>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-16 pt-4 border-t border-gray-100">
            Factura generada por Sistema de Facturación REDES CARRERAS S.L
          </p>
        </div>
      )}

      <aside className="bg-[#1a1a1a] text-white w-full md:w-64 flex-shrink-0 flex flex-col shadow-2xl z-20 print:hidden hide-on-invoice-print">
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <img src="./logo-redes_Transparente-216x216.png" className="h-10 w-10 brightness-0 invert" alt="Logo" onError={(e) => e.target.style.display='none'} />
          <div><h1 className="font-bold text-lg leading-tight">REDES<br/>CARRERAS</h1></div>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavButton icon={LayoutGrid} label="Panel Principal" active={activeTab === 'panel'} onClick={() => setActiveTab('panel')} />
          <NavButton icon={FileText} label="Reportes" active={activeTab === 'reportes'} onClick={() => setActiveTab('reportes')} />
          <NavButton icon={History} label="Cierre de Ciclos" active={activeTab === 'cierres'} onClick={() => setActiveTab('cierres')} />
          <NavButton icon={Receipt} label="Facturas Emitidas" active={activeTab === 'facturas'} onClick={() => setActiveTab('facturas')} />
          <NavButton icon={PiggyBank} label="Retenciones" active={activeTab === 'retenciones'} onClick={() => setActiveTab('retenciones')} />
          <NavButton icon={Settings} label="Ajustes" active={activeTab === 'ajustes'} onClick={() => setActiveTab('ajustes')} />
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-gray-50/50 print:h-auto print:overflow-visible hide-on-invoice-print">
        <div className="print-header w-full">
          <div className="flex items-center gap-6">
             <img src="./logo-redes_Transparente-216x216.png" style={{height: '80px', width: 'auto', objectFit: 'contain'}} alt="Logo" />
             <div><h1 className="text-3xl font-bold text-gray-900 leading-none">REDES CARRERAS S.L.</h1><p className="text-base text-gray-600 mt-1">Informe de Gestión</p></div>
          </div>
          <div className="text-right text-xs text-gray-500">
             <p className="font-bold">{new Date().toLocaleDateString()}</p>
             {viewCiclo && <p>Ciclo: {viewCiclo.nombre}</p>}
          </div>
        </div>

        <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm z-10 no-print">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            {activeTab === 'panel' && <><LayoutGrid className="text-red-600"/> Panel Principal</>}
            {activeTab === 'reportes' && <><FileText className="text-red-600"/> Reportes Generales</>}
            {activeTab === 'cierres' && <><History className="text-red-600"/> Historial de Cierres</>}
            {activeTab === 'facturas' && <><Receipt className="text-red-600"/> Facturas Emitidas</>}
            {activeTab === 'retenciones' && <><PiggyBank className="text-red-600"/> Control Retenciones</>}
            {activeTab === 'ajustes' && <><Settings className="text-red-600"/> Ajustes</>}
          </h2>
          <div className="flex items-center gap-4">
            {activeTab === 'panel' && (
              <button onClick={() => { setFormData(initialObraState); setEditingObra(null); setModalOpen(true); }} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md transition-all active:scale-95">
                <Plus size={18} /> <span className="hidden sm:inline">Añadir Obra</span>
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 print:p-0">
          
          {activeTab === 'panel' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-end no-print">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input type="text" placeholder="Buscar ID, Obra, Cliente..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none shadow-sm" />
                </div>
                {!searchQuery && (
                  <div className="flex-1 px-4 flex items-center text-sm text-gray-500 overflow-x-auto">
                    <button onClick={() => setNavState({empresa: null, encargado: null})} className="flex items-center hover:text-red-600 transition-colors"><Home size={16} className="mr-1"/> Inicio</button>
                    {navState.empresa && <><ChevronRight size={16} className="mx-2 text-gray-300"/><button onClick={() => setNavState({...navState, encargado: null})} className="hover:text-red-600 transition-colors font-medium">{navState.empresa}</button></>}
                    {navState.encargado && <><ChevronRight size={16} className="mx-2 text-gray-300"/><span className="font-bold text-gray-800">{navState.encargado}</span></>}
                  </div>
                )}
              </div>

              {(searchQuery || (navState.empresa && navState.encargado)) ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden card-resumen animate-in fade-in slide-in-from-bottom-2">
                  {!searchQuery && navState.empresa && (
                    <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center">
                      <div className="flex items-center gap-3"><button onClick={() => setNavState({...navState, encargado: null})} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><ArrowLeft size={20} /></button><div><h3 className="font-bold text-lg text-gray-800">{navState.encargado}</h3><p className="text-xs text-gray-500">{navState.empresa}</p></div></div>
                      <div className="text-right"><p className="text-xs text-gray-500 uppercase">Pendiente (Sin IVA)</p><p className="text-xl font-bold text-red-600">{totales.totalSinIva.toLocaleString()} €</p></div>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 uppercase text-xs">
                        <tr><th className="px-6 py-4">Fecha</th><th className="px-6 py-4">ID Carreras</th><th className="px-6 py-4">Obra / ID</th><th className="px-6 py-4">Importe Base</th><th className="px-6 py-4 text-center">Total 5% Incl.</th><th className="px-6 py-4 text-center">Estado</th><th className="px-6 py-4 text-right no-print">Acciones</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {obrasFiltradas.map(obra => {
                          const base = parseFloat(obra.importe) || 0;
                          const totalConPlus = base + (obra.tieneRetencion ? base * 0.05 : 0);
                          return (
                          <tr key={obra.id} className="hover:bg-red-50/30 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">{new Date(obra.fecha).toLocaleDateString()}</td>
                            <td className="px-6 py-4 font-mono font-medium text-gray-500">{obra.idCarreras || "-"}</td>
                            <td className="px-6 py-4"><div className="font-medium text-gray-900">{obra.nombre}</div><div className="text-xs text-gray-500">{obra.idObra}</div>{searchQuery && <div className="text-[10px] text-red-500 mt-1">{obra.cliente} - {obra.encargado}</div>}</td>
                            <td className="px-6 py-4 font-bold text-gray-900">{Number(obra.importe).toLocaleString('es-ES', {minimumFractionDigits: 2})} €</td>
                            <td className="px-6 py-4 text-center font-bold text-blue-800">{totalConPlus.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</td>
                            <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold ${obra.estado === 'cobrado' ? 'bg-green-100 text-green-700' : obra.estado === 'facturado' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{obra.estado.toUpperCase()}</span></td>
                            <td className="px-6 py-4 text-right no-print"><div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleEdit(obra)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit size={16}/></button><button onClick={() => handleDelete(obra.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button></div></td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : !navState.empresa ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in">
                  {Object.keys(treeData).length === 0 && !loading && <p className="col-span-full text-center text-gray-400 py-10">No hay obras registradas.</p>}
                  {Object.keys(treeData).map(empresa => (
                    <div key={empresa} onClick={() => setNavState({ ...navState, empresa })} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-red-200 cursor-pointer transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110"><Building size={80} /></div>
                      <div className="flex items-start justify-between mb-4"><div className="bg-red-50 p-3 rounded-xl text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors"><Folder size={28} strokeWidth={1.5} /></div></div>
                      <h3 className="text-lg font-bold text-gray-800 mb-1">{empresa}</h3><p className="text-xs text-gray-500 mb-4">{Object.keys(treeData[empresa].encargados).length} encargados</p>
                      <div className="border-t border-gray-100 pt-3"><p className="text-xs text-gray-400 uppercase font-bold mb-1">Pendiente (Sin IVA)</p><p className="text-xl font-bold text-red-600 group-hover:text-red-700">{treeData[empresa].totalPendiente.toLocaleString()} €</p></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                  {Object.keys(treeData[navState.empresa]?.encargados || {}).map(encargado => (
                    <div key={encargado} onClick={() => setNavState({ ...navState, encargado })} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all group">
                        <div className="flex items-center gap-4 mb-4"><div className="bg-blue-50 p-3 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors"><Users size={24} /></div><div><h4 className="font-bold text-gray-800">{encargado}</h4><p className="text-xs text-gray-500">Ver obras</p></div></div>
                        <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center"><span className="text-xs font-bold text-gray-500 uppercase">Pendiente (Sin IVA)</span><span className="text-lg font-bold text-gray-900">{treeData[navState.empresa].encargados[encargado].totalPendiente.toLocaleString()} €</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reportes' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center no-print">
                <div className="flex items-center gap-2 text-gray-500 font-bold text-sm mr-2"><Filter size={18} /> FILTRAR:</div>
                <select className="input-filter" value={reportFilter.empresa} onChange={(e) => setReportFilter({...reportFilter, empresa: e.target.value})}><option value="Todas">Todas las Empresas</option>{config.empresas?.map(e => <option key={e} value={e}>{e}</option>)}</select>
                <select className="input-filter" value={reportFilter.encargado} onChange={(e) => setReportFilter({...reportFilter, encargado: e.target.value})}><option value="Todos">Todos los Encargados</option>{config.encargados?.map(e => <option key={e} value={e}>{e}</option>)}</select>
                <button onClick={handlePrint} className="ml-auto bg-gray-900 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-black transition shadow-lg"><Download size={16} /> Imprimir / PDF</button>
              </div>

              <div className={`grid grid-cols-2 ${isEncargadoFilter ? 'md:grid-cols-4' : 'md:grid-cols-5'} gap-4`}>
                <ReportCard title="Base Imponible" amount={totales.base} color="text-gray-900" />
                {!isEncargadoFilter && <ReportCard title="Total IVA (21%)" amount={totales.iva} color="text-blue-600" />}
                <ReportCard title="Plus (5%)" amount={totales.plus} color="text-blue-700" />
                <ReportCard title="Total (Base + Plus)" amount={totales.totalBasePlus} color="text-purple-700" />
                <ReportCard title="TOTAL FACTURACIÓN" amount={isEncargadoFilter ? totales.totalBasePlus : totales.totalConIva} color="text-red-600" isBold />
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 card-resumen">
                <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">Desglose por Empresa</h3>
                <div className="space-y-4">
                  {Object.entries(obrasFiltradas.reduce((acc, obra) => {
                      const key = obra.cliente;
                      if (!acc[key]) acc[key] = { base: 0, iva: 0, plus: 0, uuii: 0, count: 0 };
                      const importe = parseFloat(obra.importe) || 0;
                      const uuiiVal = (parseFloat(obra.uuii) || 0) * 1.50;
                      acc[key].base += importe;
                      acc[key].iva += importe * 0.21;
                      acc[key].uuii += uuiiVal;
                      if(obra.tieneRetencion) acc[key].plus += importe * 0.05;
                      acc[key].count += 1;
                      return acc;
                  }, {})).map(([group, data]) => (
                    <div key={group} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-all">
                      <div className="mb-2 sm:mb-0 w-1/4"><p className="font-bold text-gray-900">{group}</p><p className="text-xs text-gray-500">{data.count} expedientes</p></div>
                      <div className="text-right flex-1 flex justify-end gap-6 text-sm">
                        <div className="w-24"><p className="text-gray-400 text-xs">Base</p><p className="font-medium">{data.base.toLocaleString()} €</p></div>
                        {!isEncargadoFilter && <div className="w-20"><p className="text-gray-400 text-xs">IVA</p><p className="font-medium text-blue-600">{data.iva.toLocaleString()} €</p></div>}
                        <div className="w-20"><p className="text-gray-400 text-xs">Plus</p><p className="font-medium text-blue-800">{data.plus.toLocaleString()} €</p></div>
                        {data.uuii > 0 && <div className="w-20"><p className="text-gray-400 text-xs">UUII</p><p className="font-medium text-purple-600">{data.uuii.toLocaleString()} €</p></div>}
                        <div className="w-24"><p className="text-gray-400 text-xs font-bold">Total</p><p className="font-bold text-green-700 text-lg">{(data.base + (isEncargadoFilter ? 0 : data.iva) + data.plus + (isEncargadoFilter ? 0 : data.uuii)).toLocaleString()} €</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 card-resumen mt-6 break-page">
                   <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">Detalle de Expedientes</h3>
                   <table className="w-full text-xs text-left">
                     <thead><tr className="border-b bg-gray-50"><th className="py-2 px-2">Fecha</th><th className="py-2 px-2">ID</th><th className="py-2 px-2">Central</th><th className="py-2 px-2">Obra</th><th className="py-2 px-2">Encargado</th><th className="py-2 px-2">Observaciones</th><th className="py-2 px-2 text-right">Total 5% Incl.</th></tr></thead>
                     <tbody>
                       {obrasFiltradas.map(o => {
                         const base = parseFloat(o.importe) || 0;
                         const plus = o.tieneRetencion ? base * 0.05 : 0;
                         const uuiiVal = (parseFloat(o.uuii) || 0) * 1.50;
                         const totalFila = base + plus + uuiiVal;
                         return (
                           <tr key={o.id} className="border-b border-gray-50"><td className="py-1 px-2">{new Date(o.fecha).toLocaleDateString()}</td><td className="py-1 px-2 font-mono">{o.idCarreras}</td><td className="py-1 px-2">{o.central}</td><td className="py-1 px-2">{o.nombre}</td><td className="py-1 px-2 font-medium text-gray-700">{o.encargado}</td><td className="py-1 px-2 italic text-gray-500">{o.observaciones}</td><td className="py-1 px-2 text-right font-bold text-blue-900">{totalFila.toLocaleString()} €</td></tr>
                         )
                       })}
                     </tbody>
                   </table>
              </div>
            </div>
          )}

          {activeTab === 'facturas' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center no-print">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Facturas Emitidas</h3>
                  <p className="text-sm text-gray-500">Consulta y descarga las facturas generadas desde los cierres de ciclo.</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                   <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 uppercase text-xs">
                     <tr><th className="px-6 py-4">Nº Factura</th><th className="px-6 py-4">Fecha</th><th className="px-6 py-4">Cliente</th><th className="px-6 py-4">Obras</th><th className="px-6 py-4 text-right">Total Factura</th><th className="px-6 py-4 text-center">Acciones</th></tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {facturas.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-gray-400">No hay facturas emitidas todavía. Genera una desde un Cierre de Ciclo o sincroniza las antiguas en Ajustes.</td></tr>}
                     {facturas.map(f => (
                       <tr key={f.id} className="hover:bg-red-50/30 transition-colors group">
                         <td className="px-6 py-4 font-bold text-red-600">{f.numFactura}</td>
                         <td className="px-6 py-4 text-gray-500">{new Date(f.fecha).toLocaleDateString()}</td>
                         <td className="px-6 py-4 font-medium text-gray-900">{f.cliente.nombre}</td>
                         <td className="px-6 py-4 text-gray-500">{f.obras.length} expedientes</td>
                         <td className="px-6 py-4 text-right font-black text-gray-900">{f.total.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</td>
                         <td className="px-6 py-4 text-center">
                           <div className="flex justify-center gap-2">
                             <button onClick={() => setEditingFactura({...f, retencionEnabled: f.retencion > 0, prontoPagoEnabled: f.prontoPago > 0})} className="inline-flex items-center justify-center bg-blue-100 text-blue-700 p-2 rounded hover:bg-blue-200 transition-colors" title="Editar Factura"><Edit size={16} /></button>
                             <button onClick={() => printSpecificInvoice(f)} className="inline-flex items-center justify-center bg-gray-900 text-white p-2 rounded hover:bg-red-600 transition-colors" title="Imprimir"><Printer size={16} /></button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'retenciones' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center no-print">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Control de Retenciones (5%)</h3>
                  <p className="text-sm text-gray-500">Gestiona y reclama las retenciones de facturas emitidas (disponibles 1 año después).</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center no-print">
                <div className="flex items-center gap-2 text-gray-500 font-bold text-sm mr-2"><Filter size={18} /> FILTRAR ESTADO:</div>
                <select className="input-filter bg-white" value={retencionesFilter} onChange={(e) => setRetencionesFilter(e.target.value)}>
                  <option value="Todas">Todas las Retenciones</option>
                  <option value="solicitada">🟢 Solicitadas / Cobradas</option>
                  <option value="pendiente_solicitar">🔴 Pendientes de Solicitar (Ya elegibles)</option>
                  <option value="en_espera">🟡 En Espera (Menos de 1 año)</option>
                </select>
                <button onClick={handlePrint} className="ml-auto bg-gray-900 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-black transition shadow-lg">
                  <Download size={16} /> Imprimir / PDF
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
                <ReportCard title="Total Retenido Histórico" amount={retencionesData.reduce((acc, r) => acc + r.retencion, 0)} color="text-gray-900" />
                <ReportCard title="Total En Espera" amount={retencionesData.filter(r => r.estadoRetencion === 'en_espera').reduce((acc, r) => acc + r.retencion, 0)} color="text-yellow-600" />
                <ReportCard title="Reclamable AHORA" amount={retencionesData.filter(r => r.estadoRetencion === 'pendiente_solicitar').reduce((acc, r) => acc + r.retencion, 0)} color="text-red-600" isBold />
                <ReportCard title="Total Solicitado / Cobrado" amount={retencionesData.filter(r => r.estadoRetencion === 'solicitada').reduce((acc, r) => acc + r.retencion, 0)} color="text-green-600" />
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden card-resumen">
                <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2 p-6 print:block hidden">
                  Informe de Retenciones - {retencionesFilter.replace('_', ' ').toUpperCase()}
                </h3>
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 uppercase text-xs">
                    <tr>
                      <th className="px-6 py-4">Nº Factura</th>
                      <th className="px-6 py-4">Fecha Factura</th>
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4 bg-gray-100">Reclamable Desde</th>
                      <th className="px-6 py-4 text-right">Retención (5%)</th>
                      <th className="px-6 py-4 text-center">Estado</th>
                      <th className="px-6 py-4 text-center no-print">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {retencionesFiltradas.length === 0 && (
                      <tr><td colSpan="7" className="text-center py-8 text-gray-400">No hay retenciones en esta categoría.</td></tr>
                    )}
                    {retencionesFiltradas.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">{r.numFactura}</td>
                        <td className="px-6 py-4 text-gray-500">{new Date(r.fecha).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-medium text-gray-700">{r.cliente.nombre}</td>
                        <td className="px-6 py-4 font-mono font-bold text-gray-800 bg-gray-50/50">{new Date(r.fechaElegibleStr).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right font-bold text-red-600">{r.retencion.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</td>
                        <td className="px-6 py-4 text-center">
                          {r.estadoRetencion === 'solicitada' && <span className="bg-green-100 text-green-700 border border-green-200 px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-wider">Solicitada</span>}
                          {r.estadoRetencion === 'pendiente_solicitar' && <span className="bg-red-100 text-red-700 border border-red-200 px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-wider shadow-sm animate-pulse">Pendiente</span>}
                          {r.estadoRetencion === 'en_espera' && <span className="bg-yellow-100 text-yellow-700 border border-yellow-200 px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-wider">En Espera</span>}
                        </td>
                        <td className="px-6 py-4 text-center no-print">
                          {r.estadoRetencion === 'pendiente_solicitar' ? (
                            <button onClick={() => handleMarcarRetencion(r.id)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 whitespace-nowrap">
                              ¡Reclamar Ya!
                            </button>
                          ) : r.estadoRetencion === 'solicitada' ? (
                            <CheckCircle size={24} className="mx-auto text-green-500"/>
                          ) : (
                            <Lock size={20} className="mx-auto text-gray-300" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'cierres' && !viewCiclo && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center no-print">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Historial de Ciclos</h3>
                  <p className="text-sm text-gray-500">Consulta los cierres pasados o genera uno nuevo.</p>
                </div>
                <button onClick={() => setConfirmCierre(true)} className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-transform active:scale-95">
                  <Lock size={18} /> Cerrar Ciclo Actual
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {ciclos.length === 0 && <p className="col-span-full text-center text-gray-400 py-12 bg-white rounded-xl border border-dashed border-gray-300">No hay ciclos cerrados todavía.</p>}
                {ciclos.map(ciclo => (
                  <div key={ciclo.id} onClick={() => setViewCiclo(ciclo)} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg cursor-pointer transition-all group">
                    <div className="flex justify-between items-start mb-4"><div className="bg-blue-50 p-3 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors"><History size={24}/></div><span className="text-xs text-gray-400 font-mono">{new Date(ciclo.fecha).toLocaleDateString()}</span></div>
                    <h4 className="font-bold text-lg text-gray-800 mb-1">{ciclo.nombre}</h4><p className="text-sm text-gray-500 mb-4">{ciclo.totalObras} expedientes en lote</p>
                    <div className="border-t border-gray-100 pt-3"><p className="text-xs text-gray-400 uppercase">Total Valor (Sin IVA)</p><p className="text-xl font-bold text-gray-900">{(ciclo.obras || []).reduce((acc, o) => acc + (parseFloat(o.importe)||0), 0).toLocaleString('es-ES', {minimumFractionDigits: 2})} €</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'cierres' && viewCiclo && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center no-print">
                <button onClick={() => setViewCiclo(null)} className="flex items-center gap-2 text-gray-600 hover:text-red-600 font-bold"><ArrowLeft size={18}/> Volver al Historial</button>
                <div className="flex items-center gap-4">
                  <select className="input-filter" value={reportFilter.empresa} onChange={(e) => setReportFilter({...reportFilter, empresa: e.target.value})}><option value="Todas">Todas</option>{config.empresas?.map(e => <option key={e} value={e}>{e}</option>)}</select>
                  <select className="input-filter" value={reportFilter.encargado} onChange={(e) => setReportFilter({...reportFilter, encargado: e.target.value})}><option value="Todos">Todos los Encargados</option>{config.encargados?.map(e => <option key={e} value={e}>{e}</option>)}</select>
                  <button onClick={handlePrint} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-200 font-bold"><Printer size={16} /> Imprimir Lote</button>
                  <button disabled={selectedForInvoice.length === 0} onClick={() => setInvoiceModalOpen(true)} className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 font-bold shadow-md transition-all ${selectedForInvoice.length > 0 ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}><FileSpreadsheet size={16} /> Generar Factura ({selectedForInvoice.length})</button>
                </div>
              </div>

              <div className="mb-4 border-b-2 border-red-600 pb-2 flex justify-between items-end">
                <h3 className="text-xl font-bold uppercase text-gray-800">{viewCiclo.nombre}</h3>
                <p className="text-sm font-medium text-gray-500">Gestión de Cobro</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 card-resumen mt-6 break-page">
                   <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">Expedientes disponibles para Facturar</h3>
                   <table className="w-full text-xs text-left">
                     <thead>
                       <tr className="border-b bg-gray-50">
                         <th className="py-2 px-2 text-center"><CheckSquare size={14} className="mx-auto text-gray-400"/></th>
                         <th className="py-2 px-2">Fecha</th>
                         <th className="py-2 px-2">ID</th>
                         <th className="py-2 px-2">Nº Factura Asignado</th>
                         <th className="py-2 px-2">Central</th>
                         <th className="py-2 px-2">Obra</th>
                         <th className="py-2 px-2 text-right">Base</th>
                         <th className="py-2 px-2 text-right">Total 5% Incl.</th>
                       </tr>
                     </thead>
                     <tbody>
                       {obrasFiltradas.map(o => {
                         const base = parseFloat(o.importe) || 0;
                         const plus = o.tieneRetencion ? base * 0.05 : 0;
                         const uuiiVal = (parseFloat(o.uuii) || 0) * 1.50;
                         const totalFila = base + plus + uuiiVal;
                         const isFacturado = !!o.numFactura;

                         return (
                           <tr key={o.id} className={`border-b border-gray-50 ${isFacturado ? 'bg-gray-50' : 'hover:bg-red-50'}`}>
                             <td className="py-1 px-2 text-center">
                               {isFacturado ? (
                                 <span className="text-[9px] font-bold text-green-600 block leading-tight">YA<br/>EMITIDA</span>
                               ) : (
                                 <input type="checkbox" className="w-4 h-4 text-red-600 rounded cursor-pointer" checked={selectedForInvoice.includes(o.id)} onChange={(e) => { if (e.target.checked) setSelectedForInvoice([...selectedForInvoice, o.id]); else setSelectedForInvoice(selectedForInvoice.filter(id => id !== o.id)); }} />
                               )}
                             </td>
                             <td className="py-1 px-2 text-gray-500">{new Date(o.fecha).toLocaleDateString()}</td>
                             <td className="py-1 px-2 font-mono font-bold text-gray-700">{o.idCarreras}</td>
                             <td className="py-1 px-2 flex items-center gap-2">
                               <span className={isFacturado ? "font-bold text-gray-800" : "text-gray-300 italic"}>{o.numFactura || "Pendiente"}</span>
                               {!isFacturado && <button onClick={() => handleUpdateFacturaCiclo(o.id, o.numFactura)} className="text-blue-600 hover:text-blue-800 p-1 no-print"><Edit size={12}/></button>}
                             </td>
                             <td className="py-1 px-2">{o.central}</td>
                             <td className="py-1 px-2">{o.nombre}</td>
                             <td className="py-1 px-2 text-right">
                                <div className="flex items-center justify-end gap-2 text-gray-500">
                                   <span className="font-medium">{base.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
                                   {!isFacturado && <button onClick={() => handleUpdateImporteCiclo(o.id, o.importe)} className="text-blue-600 hover:text-blue-800 p-1 no-print"><Edit size={12}/></button>}
                                </div>
                             </td>
                             <td className="py-1 px-2 text-right font-bold text-blue-900">{totalFila.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</td>
                           </tr>
                         )
                       })}
                     </tbody>
                   </table>
              </div>
            </div>
          )}

          {activeTab === 'ajustes' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in pb-10">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-blue-800 flex items-center gap-2"><Database size={18}/> Copia de Seguridad y Sincronización</h3>
                    <p className="text-xs text-blue-600 mt-1">Exporta tus datos, importa copias o genera facturas masivamente del histórico.</p>
                  </div>
                  <button onClick={handleSyncOldInvoices} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm whitespace-nowrap"><RefreshCw size={16}/> Sincronizar Facturas Antiguas</button>
                </div>
                <div className="p-6 flex flex-col md:flex-row gap-6 items-center">
                  <div className="flex-1 w-full"><button onClick={handleExportBackup} className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"><Download size={32} className="text-gray-400 group-hover:text-blue-600 mb-2"/><span className="font-bold text-gray-700 group-hover:text-blue-700">Exportar Datos</span><span className="text-xs text-gray-400 mt-1">Descargar archivo .JSON</span></button></div>
                  <div className="flex-1 w-full relative"><input type="file" accept=".json" onChange={handleImportBackup} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" /><div className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"><Upload size={32} className="text-gray-400 group-hover:text-green-600 mb-2"/><span className="font-bold text-gray-700 group-hover:text-green-700">Importar Datos</span><span className="text-xs text-gray-400 mt-1">Subir archivo .JSON</span></div></div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2"><Settings size={18}/> Listas Desplegables</h3>
                  <p className="text-xs text-gray-500 mt-1">Configura aquí las opciones simples que aparecen al crear una obra.</p>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <ConfigSection title="Empresas / Clientes" items={config.empresas} onAdd={(val) => updateConfigList('empresas', 'add', val)} onDelete={(val) => updateConfigList('empresas', 'delete', val)} />
                  <ConfigSection title="Encargados de Obra" items={config.encargados} onAdd={(val) => updateConfigList('encargados', 'add', val)} onDelete={(val) => updateConfigList('encargados', 'delete', val)} />
                  <ConfigSection title="Centrales / Zonas" items={config.centrales} onAdd={(val) => updateConfigList('centrales', 'add', val)} onDelete={(val) => updateConfigList('centrales', 'delete', val)} />
                  <ConfigSection title="Nº Contratos" items={config.contratos} onAdd={(val) => updateConfigList('contratos', 'add', val)} onDelete={(val) => updateConfigList('contratos', 'delete', val)} />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
                <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-red-800 flex items-center gap-2"><Building size={18}/> Entidades de Facturación (Clientes)</h3>
                    <p className="text-xs text-red-600 mt-1">Datos fiscales de los clientes para autocompletar la cabecera de las facturas.</p>
                  </div>
                  <button onClick={() => setShowAddClient(!showAddClient)} className="bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-red-700 flex items-center gap-1">
                    {showAddClient ? <X size={14}/> : <Plus size={14}/>} {showAddClient ? 'Cancelar' : 'Añadir Cliente'}
                  </button>
                </div>
                <div className="p-6">
                  {showAddClient && (
                    <div className="mb-6 bg-white border-2 border-red-100 p-4 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2">
                      <h4 className="font-bold text-gray-800 mb-3 text-sm">Nuevo Cliente de Facturación</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <InputGroup label="Nombre Legal"><input className="input-field" value={newClientData.nombre} onChange={e => setNewClientData({...newClientData, nombre: e.target.value})} placeholder="Ej. EMPRESA S.A." /></InputGroup>
                        <InputGroup label="CIF/NIF"><input className="input-field" value={newClientData.cif} onChange={e => setNewClientData({...newClientData, cif: e.target.value})} placeholder="Ej. B12345678" /></InputGroup>
                        <div className="md:col-span-2">
                          <InputGroup label="Dirección Completa"><textarea rows={2} className="input-field resize-none" value={newClientData.direccion} onChange={e => setNewClientData({...newClientData, direccion: e.target.value})} placeholder="Calle, Número, Ciudad, CP..." /></InputGroup>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowAddClient(false)} className="px-4 py-2 text-xs font-bold text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">Cancelar</button>
                        <button onClick={() => {
                          if(!newClientData.nombre || !newClientData.cif) return showToast("Nombre y CIF son obligatorios", "warning");
                          const nuevas = [...(config.empresasFacturacion||[]), newClientData];
                          setConfig({...config, empresasFacturacion: nuevas});
                          setDoc(doc(db, "configuracion", "listas_generales"), {...config, empresasFacturacion: nuevas});
                          setNewClientData({nombre: '', cif: '', direccion: ''});
                          setShowAddClient(false);
                          showToast("Cliente añadido con éxito", "success");
                        }} className="px-4 py-2 text-xs font-bold text-white bg-red-600 rounded hover:bg-red-700 transition-colors shadow-md">Guardar Cliente</button>
                      </div>
                    </div>
                  )}

                  {(!config.empresasFacturacion || config.empresasFacturacion.length === 0) && !showAddClient && <p className="text-sm text-gray-500 italic">No hay clientes configurados.</p>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {config.empresasFacturacion?.map((emp, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50 relative group transition-all hover:border-red-200">
                        <button onClick={() => {
                           const nuevas = config.empresasFacturacion.filter((_, i) => i !== idx);
                           setConfig({...config, empresasFacturacion: nuevas});
                           setDoc(doc(db, "configuracion", "listas_generales"), {...config, empresasFacturacion: nuevas});
                           showToast("Cliente eliminado", "success");
                        }} className="absolute top-2 right-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white rounded shadow-sm"><Trash2 size={16}/></button>
                        <h4 className="font-bold text-sm text-gray-900 mb-1">{emp.nombre}</h4>
                        <p className="text-xs text-gray-600 font-mono mb-2">CIF: {emp.cif}</p>
                        <p className="text-xs text-gray-500 whitespace-pre-line">{emp.direccion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL CREACIÓN FACTURA OFICIAL */}
      {invoiceModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print modal-overlay overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
            <div className="bg-red-600 text-white px-6 py-4 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2"><Receipt size={22}/> Emisión de Factura</h3>
                <p className="text-xs text-red-200">Se van a facturar {selectedForInvoice.length} expedientes.</p>
              </div>
              <button onClick={() => setInvoiceModalOpen(false)}><X className="text-red-200 hover:text-white"/></button>
            </div>
            
            <form onSubmit={handleCreateFactura} className="p-6 overflow-y-auto flex flex-col gap-6 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-700 border-b pb-2">1. Datos del Cliente</h4>
                  <InputGroup label="Facturar A (Seleccionar de Ajustes)">
                    <select className="input-field border-gray-300 font-bold" value={invoiceForm.clienteIdx} onChange={e => setInvoiceForm({...invoiceForm, clienteIdx: e.target.value})}>
                      {config.empresasFacturacion?.map((emp, i) => (
                        <option key={i} value={i}>{emp.nombre}</option>
                      ))}
                    </select>
                  </InputGroup>
                  {config.empresasFacturacion && config.empresasFacturacion[invoiceForm.clienteIdx] && (
                    <div className="bg-gray-50 p-3 rounded border border-gray-100 text-xs text-gray-600">
                      <p><strong>CIF:</strong> {config.empresasFacturacion[invoiceForm.clienteIdx].cif}</p>
                      <p className="whitespace-pre-line">{config.empresasFacturacion[invoiceForm.clienteIdx].direccion}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-700 border-b pb-2">2. Identificación de Factura</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Nº de Factura *"><input required className="input-field border-red-300 bg-red-50 text-red-900 font-bold" value={invoiceForm.numFactura} onChange={e => setInvoiceForm({...invoiceForm, numFactura: e.target.value})} placeholder="Ej. 38-06-26" /></InputGroup>
                    <InputGroup label="Fecha Emisión *"><input type="date" required className="input-field" value={invoiceForm.fecha} onChange={e => setInvoiceForm({...invoiceForm, fecha: e.target.value})} /></InputGroup>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Nº Contrato (Opcional)"><input className="input-field" value={invoiceForm.numContrato} onChange={e => setInvoiceForm({...invoiceForm, numContrato: e.target.value})} placeholder="Ej. 509/86200" /></InputGroup>
                    <InputGroup label="Nº Pedido (Opcional)"><input className="input-field" value={invoiceForm.numPedido} onChange={e => setInvoiceForm({...invoiceForm, numPedido: e.target.value})} placeholder="Ej. PED-2026" /></InputGroup>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                   <h4 className="font-bold text-gray-700 border-b pb-2">3. Condiciones Comerciales</h4>
                   
                   <InputGroup label="Forma de Pago Estipulada">
                      <select className="input-field bg-gray-100" value={invoiceForm.formaPago} onChange={e => setInvoiceForm({...invoiceForm, formaPago: e.target.value})}>
                        <option value="CONFIRMING A 120 DÍAS">CONFIRMING A 120 DÍAS</option>
                        <option value="CONFIRMING A 90 DÍAS">CONFIRMING A 90 DÍAS</option>
                        <option value="CONFIRMING A 60 DÍAS">CONFIRMING A 60 DÍAS</option>
                        <option value="PAGO TRANSFERENCIA BANCARIA">PAGO TRANSFERENCIA BANCARIA</option>
                      </select>
                   </InputGroup>
                   
                   <label className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg cursor-pointer hover:bg-red-100 transition-colors">
                     <input type="checkbox" className="w-5 h-5 text-red-600 rounded" checked={invoiceForm.retencion} onChange={e => setInvoiceForm({...invoiceForm, retencion: e.target.checked})} />
                     <div><span className="font-bold text-red-900 block text-sm">Aplicar 5% de Retención</span></div>
                   </label>
                   
                   <label className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                     <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={invoiceForm.prontoPago} onChange={e => setInvoiceForm({...invoiceForm, prontoPago: e.target.checked})} />
                     <div><span className="font-bold text-blue-900 block text-sm">Aplicar 5% de Pronto Pago</span></div>
                   </label>

                   <label className="flex items-center gap-3 p-3 mt-4 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                     <input type="checkbox" className="w-5 h-5 text-gray-600 rounded" checked={invoiceForm.usarImporteManual} onChange={e => {
                        const isChecked = e.target.checked;
                        setInvoiceForm({...invoiceForm, usarImporteManual: isChecked, importeManual: isChecked ? subtotalFactura : ''})
                     }} />
                     <div>
                       <span className="font-bold text-gray-900 block text-sm">Modificar Importe Bruto Manualmente</span>
                       <span className="text-[10px] text-gray-500 leading-none">Permite ajustar el importe base si sumas conceptos extra.</span>
                     </div>
                   </label>

                   {invoiceForm.usarImporteManual && (
                     <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                       <InputGroup label="Total Bruto Personalizado (€)">
                         <input type="number" step="0.01" required={invoiceForm.usarImporteManual} className="input-field border-gray-300 font-bold text-lg text-gray-900" value={invoiceForm.importeManual} onChange={e => setInvoiceForm({...invoiceForm, importeManual: e.target.value})} />
                       </InputGroup>
                     </div>
                   )}
                 </div>

                 <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg border border-gray-800 flex flex-col justify-center">
                    <h4 className="font-bold text-gray-400 border-b border-gray-700 pb-2 mb-4 uppercase text-xs tracking-wider">4. Resumen Liquidación</h4>
                    <div className="space-y-3 font-mono text-sm">
                      <div className="flex justify-between items-center text-gray-300">
                        <span>TOTAL BRUTO:</span>
                        <span className="font-bold text-white text-lg">{effectiveSubtotalDisplay.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
                      </div>
                      
                      {invoiceForm.prontoPago && (
                        <>
                          <div className="flex justify-between items-center text-blue-400 border-b border-gray-700 pb-2">
                            <span>5% PRONTO PAGO:</span>
                            <span>-{(effectiveSubtotalDisplay * 0.05).toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
                          </div>
                          <div className="flex justify-between items-center text-gray-200 font-bold">
                            <span>BASE IMPONIBLE NETA:</span>
                            <span>{(effectiveSubtotalDisplay - (effectiveSubtotalDisplay * 0.05)).toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
                          </div>
                        </>
                      )}

                      {invoiceForm.retencion && (
                        <div className="flex justify-between items-center text-red-400">
                          <span>5% RETENCIÓN:</span>
                          <span>-{(effectiveSubtotalDisplay * 0.05).toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center text-gray-300 border-b border-gray-700 pb-3">
                        <span>IVA 21%:</span>
                        <span>{((effectiveSubtotalDisplay - (invoiceForm.prontoPago ? effectiveSubtotalDisplay * 0.05 : 0)) * 0.21).toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 text-green-400">
                        <span className="font-black text-lg">A COBRAR:</span>
                        <span className="font-black text-2xl">
                          {((effectiveSubtotalDisplay - (invoiceForm.prontoPago ? effectiveSubtotalDisplay*0.05 : 0)) + ((effectiveSubtotalDisplay - (invoiceForm.prontoPago ? effectiveSubtotalDisplay*0.05 : 0))*0.21) - (invoiceForm.retencion ? effectiveSubtotalDisplay*0.05 : 0)).toLocaleString('es-ES', {minimumFractionDigits: 2})} €
                        </span>
                      </div>
                    </div>
                 </div>
              </div>
              <div className="pt-4 flex justify-between items-center border-t border-gray-200">
                <p className="text-xs text-gray-500 italic">* Revisa que el Nº Factura no exista previamente. Esta acción es irreversible.</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setInvoiceModalOpen(false)} className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-200">Cancelar</button>
                  <button type="submit" className="px-8 py-3 rounded-lg text-white font-black shadow-xl shadow-red-200/50 flex items-center gap-2 bg-red-600 hover:bg-red-700 active:scale-95 transition-all text-lg"><CheckSquare size={20}/> Emitir Factura Oficial</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMAR CIERRE */}
      {confirmCierre && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-gray-900 mb-2">¿Cerrar Ciclo de Facturación?</h3>
            <p className="text-sm text-gray-600 mb-4">Selecciona qué empresa deseas incluir en este cierre. Las obras pendientes pasarán a estado "Facturadas".</p>
            
            <div className="mb-6 bg-gray-50 p-4 border border-gray-200 rounded-xl">
              <label className="text-xs font-bold text-gray-700 uppercase block mb-2">Filtrar por Empresa:</label>
              <select 
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500 font-medium"
                value={cierreEmpresa} 
                onChange={e => setCierreEmpresa(e.target.value)}
              >
                <option value="Todas">Todas las Empresas (Cierre General)</option>
                {config.empresas?.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              
              <div className="mt-3 flex justify-between items-center text-sm">
                <span className="text-gray-500">Expedientes a cerrar:</span>
                <span className="font-black text-red-600 text-lg">
                  {obras.filter(o => o.estado === 'pendiente' && (cierreEmpresa === 'Todas' || o.cliente === cierreEmpresa)).length}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setConfirmCierre(false); setCierreEmpresa('Todas'); }} className="flex-1 py-2.5 rounded-lg border border-gray-300 font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={handleCerrarCiclo} className="flex-1 py-2.5 rounded-lg bg-red-600 font-bold text-white hover:bg-red-700 transition-colors">Confirmar Cierre</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDICIÓN DE FACTURAS */}
      {editingFactura && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print modal-overlay">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold flex items-center gap-2"><Edit size={20}/> Editar Factura {editingFactura.numFactura}</h3>
              <button onClick={() => setEditingFactura(null)}><X className="text-gray-400 hover:text-white"/></button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                // MATEMÁTICA CORREGIDA PARA EDICIÓN DE FACTURA:
                const subtotal = parseFloat(editingFactura.subtotal) || 0;
                
                const prontoPagoAmount = editingFactura.prontoPagoEnabled ? subtotal * 0.05 : 0;
                const baseImponibleNeta = subtotal - prontoPagoAmount;
                const ivaAmount = baseImponibleNeta * 0.21;
                
                const retencionAmount = editingFactura.retencionEnabled ? subtotal * 0.05 : 0;
                
                const totalAmount = baseImponibleNeta + ivaAmount - retencionAmount;

                await updateDoc(doc(db, "facturas", editingFactura.id), {
                  fecha: editingFactura.fecha,
                  contrato: editingFactura.contrato || '',
                  pedido: editingFactura.pedido || '',
                  cliente: editingFactura.cliente,
                  subtotal: subtotal, // Guardamos el nuevo subtotal si lo modificaron
                  retencion: retencionAmount,
                  prontoPago: prontoPagoAmount,
                  iva: ivaAmount,
                  total: totalAmount
                });
                showToast("Factura actualizada con éxito", "success");
                setEditingFactura(null);
              } catch(err) {
                showToast("Error al guardar cambios", "error");
              }
            }} className="p-6 overflow-y-auto flex flex-col gap-6">
              
              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Fecha Emisión *">
                  <input type="date" required className="input-field" value={editingFactura.fecha} onChange={e => setEditingFactura({...editingFactura, fecha: e.target.value})} />
                </InputGroup>
                <InputGroup label="Cambiar Cliente Fiscal">
                  <select className="input-field border-gray-300 font-bold" 
                    value={config.empresasFacturacion?.findIndex(c => c.cif === editingFactura.cliente.cif) >= 0 ? config.empresasFacturacion?.findIndex(c => c.cif === editingFactura.cliente.cif) : -1}
                    onChange={e => {
                      if(e.target.value !== "-1") setEditingFactura({...editingFactura, cliente: config.empresasFacturacion[e.target.value]});
                    }}>
                    <option value={-1} disabled>-- Cliente Genérico --</option>
                    {config.empresasFacturacion?.map((emp, i) => (
                      <option key={i} value={i}>{emp.nombre}</option>
                    ))}
                  </select>
                </InputGroup>
              </div>

              <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg text-xs text-gray-600">
                <p className="font-bold text-gray-900 mb-1">Cliente actual en factura:</p>
                <p><strong>{editingFactura.cliente.nombre}</strong></p>
                <p>CIF: {editingFactura.cliente.cif}</p>
                <p className="whitespace-pre-line leading-tight mt-1">{editingFactura.cliente.direccion}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Nº Contrato">
                  <input className="input-field" value={editingFactura.contrato || ''} onChange={e => setEditingFactura({...editingFactura, contrato: e.target.value})} placeholder="Opcional..." />
                </InputGroup>
                <InputGroup label="Nº Pedido">
                  <input className="input-field" value={editingFactura.pedido || ''} onChange={e => setEditingFactura({...editingFactura, pedido: e.target.value})} placeholder="Opcional..." />
                </InputGroup>
                
                {/* AÑADIDO: Campo para editar el importe (Base Imponible) en facturas existentes */}
                <div className="col-span-2">
                  <InputGroup label="Base Imponible (Total Bruto €)">
                    <input type="number" step="0.01" required className="input-field font-black text-gray-900 bg-white border-2 border-gray-300" value={editingFactura.subtotal || 0} onChange={e => setEditingFactura({...editingFactura, subtotal: e.target.value})} />
                  </InputGroup>
                  <p className="text-[10px] text-gray-500 mt-1 italic">Edita este importe si necesitas cuadrar la factura por conceptos extra.</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3 mt-2">
                 <h4 className="font-bold text-gray-700 border-b pb-2 text-sm uppercase">Condiciones Comerciales</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <label className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg cursor-pointer hover:bg-red-100 transition-colors">
                     <input type="checkbox" className="w-5 h-5 text-red-600 rounded" checked={editingFactura.retencionEnabled} onChange={e => setEditingFactura({...editingFactura, retencionEnabled: e.target.checked})} />
                     <div><span className="font-bold text-red-900 block text-sm">Aplicar 5% de Retención</span></div>
                   </label>
                   <label className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                     <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={editingFactura.prontoPagoEnabled} onChange={e => setEditingFactura({...editingFactura, prontoPagoEnabled: e.target.checked})} />
                     <div><span className="font-bold text-blue-900 block text-sm">Aplicar 5% Pronto Pago</span></div>
                   </label>
                 </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setEditingFactura(null)} className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-8 py-2 rounded-lg text-white font-bold shadow-lg shadow-blue-200 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all"><Save size={18}/> Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUBCOMPONENTES AUXILIARES ---
function ConfigSection({ title, items = [], onAdd, onDelete }) {
  const [newValue, setNewValue] = useState('');
  const handleAdd = () => { if(newValue.trim()) { onAdd(newValue.trim()); setNewValue(''); } };
  return (
    <div>
      <h4 className="font-bold text-gray-700 text-sm mb-3">{title}</h4>
      <div className="flex gap-2 mb-3"><input type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Añadir nuevo..." className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-red-500" onKeyDown={(e) => e.key === 'Enter' && handleAdd()} /><button onClick={handleAdd} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 rounded-lg"><Plus size={16}/></button></div>
      <ul className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 text-sm max-h-40 overflow-y-auto">{items.map((item, idx) => (<li key={idx} className="px-3 py-2 flex justify-between items-center group"><span className="text-gray-600">{item}</span><button onClick={() => onDelete(item)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button></li>))}{items.length === 0 && <li className="px-3 py-2 text-gray-400 italic text-xs">Lista vacía</li>}</ul>
    </div>
  );
}

function NavButton({ icon: Icon, label, active, onClick }) { 
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
      <Icon size={20} />
      <span className="font-medium text-sm">{label}</span>
    </button>
  ); 
}

function ReportCard({ title, amount, color, isNegative, isBold }) { 
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm card-resumen">
      <p className="text-xs text-gray-500 uppercase font-bold mb-1">{title}</p>
      <p className={`text-xl ${isBold ? 'font-black' : 'font-bold'} ${color}`}>
        {isNegative && '-'}{amount.toLocaleString('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €
      </p>
    </div>
  ); 
}

function InputGroup({ label, children }) { 
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase ml-1 block mb-1">{label}</label>
      {children}
    </div>
  ); 
}

const style = document.createElement('style');
style.innerHTML = `.input-field { width: 100%; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.6rem 1rem; font-size: 0.875rem; outline: none; } .input-filter { background: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.5rem; font-size: 0.875rem; }`;
document.head.appendChild(style);