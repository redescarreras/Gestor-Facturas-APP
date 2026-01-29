import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutGrid, FileText, Calendar, Settings, Plus, Search, Folder, 
  Calculator, TrendingUp, DollarSign, X, CheckCircle, Trash2, 
  ChevronRight, PieChart, Users, Building, MapPin, Menu, Printer,
  Filter, AlertCircle, Save, Edit, MoreVertical, Download, Loader2,
  FolderOpen, ArrowLeft, Home, WifiOff
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, onSnapshot, addDoc, updateDoc, 
  doc, deleteDoc, query, orderBy, setDoc, getDoc 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// --- CONFIGURACIÓN FIREBASE (REAL) ---
const firebaseConfig = {
  apiKey: "AIzaSyCO_phXPPwZEgQEQlug69bvG5snSbRYZfQ",
  authDomain: "gestor-facturas-b665a.firebaseapp.com",
  databaseURL: "https://gestor-facturas-b665a-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gestor-facturas-b665a",
  storageBucket: "gestor-facturas-b665a.firebasestorage.app",
  messagingSenderId: "178513177002",
  appId: "1:178513177002:web:d470b0d03e5ef64bf3e3d3"
};

// Inicialización Segura
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- COMPONENTE DE NOTIFICACIÓN (TOAST) ---
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

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('panel');
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Navegación Carpetas
  const [navState, setNavState] = useState({ empresa: null, encargado: null });

  // Estados UI
  const [modalOpen, setModalOpen] = useState(false);
  const [editingObra, setEditingObra] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Configuración
  const [config, setConfig] = useState({
    empresas: ['Elecnor', 'Magtel', 'Ezentis', 'Circet'],
    encargados: ['Juan Pérez', 'Ana García'],
    centrales: ['Madrid Centro', 'Sevilla Norte', 'Valencia Puerto']
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
    estado: 'pendiente'
  };
  const [formData, setFormData] = useState(initialObraState);

  const [reportFilter, setReportFilter] = useState({
    empresa: 'Todas',
    encargado: 'Todos',
    mes: 'Todos'
  });

  const showToast = (msg, type = 'success') => {
    setNotification({ show: true, message: msg, type });
  };

  // --- AUTENTICACIÓN Y CARGA DE DATOS ---
  useEffect(() => {
    // 1. Autenticación Anónima (Vital para poder leer/escribir en Firebase)
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        loadData(); 
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error("Error autenticación:", error);
          showToast("Error de conexión con la nube", "error");
        });
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const loadData = () => {
    // 2. Escuchar Obras
    const q = query(collection(db, "obras"));
    const unsubscribeObras = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setObras(data);
      setLoading(false);
    }, (error) => {
      console.error("Error Firestore:", error);
      // Solo mostramos error si no es por permisos iniciales
      if (error.code !== 'permission-denied') {
         showToast("Error de sincronización.", "error");
      }
      setLoading(false);
    });

    // 3. Escuchar Configuración
    const configRef = doc(db, "configuracion", "listas_generales");
    const unsubscribeConfig = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) setConfig(docSnap.data());
      else setDoc(configRef, config);
    });
  };

  // --- LÓGICA DE NEGOCIO ---
  const handleSaveObra = async (e) => {
    e.preventDefault();
    if (!user) { showToast("Conectando...", "info"); return; }

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

    showToast("Guardando en la nube...", "info");

    try {
      if (esEdicion) {
        await updateDoc(doc(db, "obras", editingObra.id), obraData);
      } else {
        await addDoc(collection(db, "obras"), { ...obraData, createdAt: new Date() });
      }
      showToast(esEdicion ? "Actualizado correctamente" : "Obra guardada y sincronizada", "success");
    } catch (error) {
      console.error(error);
      showToast("Error al guardar. Verifica permisos.", "error");
    }
  };

  const handleDelete = async (id) => {
    if (confirm("⚠️ ¿Eliminar expediente? Esta acción se sincronizará en todos los dispositivos.")) {
      try {
        await deleteDoc(doc(db, "obras", id));
        showToast("Expediente eliminado", "success");
      } catch (error) {
        showToast("No tienes permiso para eliminar", "error");
      }
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
    } catch (error) {
      showToast("Error de sincronización", 'error');
    }
  };

  // --- FILTROS Y CARPETAS ---
  const treeData = useMemo(() => {
    const tree = {};
    obras.forEach(obra => {
      const emp = obra.cliente || 'Sin Empresa';
      const enc = obra.encargado || 'Sin Encargado';
      if (!tree[emp]) tree[emp] = { totalPendiente: 0, encargados: {} };
      if (obra.estado === 'pendiente') {
        const importe = parseFloat(obra.importe) || 0;
        tree[emp].totalPendiente += importe;
        if (!tree[emp].encargados[enc]) tree[emp].encargados[enc] = { totalPendiente: 0 };
        tree[emp].encargados[enc].totalPendiente += importe;
      } else {
        if (!tree[emp].encargados[enc]) tree[emp].encargados[enc] = { totalPendiente: 0 };
      }
    });
    return tree;
  }, [obras]);

  const obrasFiltradas = useMemo(() => {
    return obras.filter(o => {
      const matchSearch = 
        o.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        o.idCarreras?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.idObra?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.cliente?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (searchQuery) return matchSearch;

      if (activeTab === 'reportes' || activeTab === 'cierres') {
        const matchEmpresa = reportFilter.empresa === 'Todas' || o.cliente === reportFilter.empresa;
        const matchEncargado = reportFilter.encargado === 'Todos' || o.encargado === reportFilter.encargado;
        const matchMes = reportFilter.mes === 'Todos' || o.mes === reportFilter.mes;
        return matchSearch && matchEmpresa && matchEncargado && matchMes;
      }

      if (activeTab === 'panel') {
        if (navState.empresa && o.cliente !== navState.empresa) return false;
        if (navState.encargado && o.encargado !== navState.encargado) return false;
        return true;
      }
      return matchSearch;
    });
  }, [obras, searchQuery, activeTab, reportFilter, navState]);

  const totales = useMemo(() => {
    const base = obrasFiltradas.reduce((acc, curr) => acc + (curr.importe || 0), 0);
    const iva = base * 0.21;
    const retencion = obrasFiltradas.reduce((acc, curr) => acc + (curr.tieneRetencion ? (curr.importe * 0.05) : 0), 0);
    return { base, iva, retencion, totalFinal: base + iva - retencion };
  }, [obrasFiltradas]);

  const formCalculos = useMemo(() => {
    const base = parseFloat(formData.importe) || 0;
    const iva = base * 0.21;
    const ret = formData.tieneRetencion ? base * 0.05 : 0;
    const total = base + iva - ret;
    return { base, iva, ret, total };
  }, [formData.importe, formData.tieneRetencion]);

  const handlePrint = () => window.print();

  // Reset al cambiar pestaña
  useEffect(() => {
    if (activeTab !== 'panel') {
      setNavState({ empresa: null, encargado: null });
      setSearchQuery('');
    }
  }, [activeTab]);

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 flex flex-col md:flex-row print:bg-white">
      <Toast show={notification.show} message={notification.message} type={notification.type} onClose={() => setNotification({ ...notification, show: false })} />

      <style>{`
        @media print {
          aside, header, .no-print, .fab-button, .modal-overlay, button, .input-filter { display: none !important; }
          main { margin: 0 !important; padding: 20px !important; overflow: visible !important; height: auto !important; width: 100% !important; background: white !important; }
          body { background: white !important; font-size: 11px; color: black; }
          .print-header { display: flex !important; margin-bottom: 30px; border-bottom: 2px solid #cc0000; padding-bottom: 15px; flex-direction: row !important; justify-content: space-between !important; align-items: center !important; }
          .card-resumen { border: 1px solid #ddd !important; box-shadow: none !important; margin-bottom: 15px; page-break-inside: avoid; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { padding: 6px 8px; border: 1px solid #ccc; text-align: left; }
          th { background-color: #f0f0f0 !important; font-weight: bold; color: black !important; }
          tr { page-break-inside: avoid; }
          .text-red-600 { color: #cc0000 !important; }
        }
        .print-header { display: none; }
      `}</style>

      {/* SIDEBAR */}
      <aside className="bg-[#1a1a1a] text-white w-full md:w-64 flex-shrink-0 flex flex-col shadow-2xl z-20 print:hidden">
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <img src="./logo-redes_Transparente-216x216.png" className="h-10 w-10 brightness-0 invert" alt="Logo" onError={(e) => e.target.style.display='none'} />
          <div>
            <h1 className="font-bold text-lg leading-tight">REDES<br/>CARRERAS</h1>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavButton icon={LayoutGrid} label="Panel Principal" active={activeTab === 'panel'} onClick={() => setActiveTab('panel')} />
          <NavButton icon={FileText} label="Reportes" active={activeTab === 'reportes'} onClick={() => setActiveTab('reportes')} />
          <NavButton icon={Calendar} label="Cierres / Mensual" active={activeTab === 'cierres'} onClick={() => setActiveTab('cierres')} />
          <NavButton icon={Settings} label="Ajustes" active={activeTab === 'ajustes'} onClick={() => setActiveTab('ajustes')} />
        </nav>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-gray-50/50 print:h-auto print:overflow-visible">
        
        {/* CABECERA PDF */}
        <div className="print-header w-full">
          <div className="flex items-center gap-6">
             <img src="./logo-redes_Transparente-216x216.png" style={{height: '80px', width: 'auto', objectFit: 'contain'}} alt="Logo" />
             <div>
               <h1 className="text-3xl font-bold text-gray-900 leading-none">REDES CARRERAS S.L.</h1>
               <p className="text-base text-gray-600 mt-1">Informe de Gestión</p>
             </div>
          </div>
          <div className="text-right text-xs text-gray-500">
             <p className="font-bold">{new Date().toLocaleDateString()}</p>
             <p>Gestión Cloud</p>
          </div>
        </div>

        {/* TOP BAR */}
        <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm z-10 no-print">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            {activeTab === 'panel' && <><LayoutGrid className="text-red-600"/> Panel Principal</>}
            {activeTab === 'reportes' && <><FileText className="text-red-600"/> Reportes</>}
            {activeTab === 'cierres' && <><Calendar className="text-red-600"/> Cierres de Mes</>}
            {activeTab === 'ajustes' && <><Settings className="text-red-600"/> Ajustes</>}
          </h2>
          <div className="flex items-center gap-4">
            {activeTab === 'panel' && (
              <button 
                onClick={() => { setFormData(initialObraState); setEditingObra(null); setModalOpen(true); }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                <Plus size={18} /> <span className="hidden sm:inline">Añadir Obra</span>
              </button>
            )}
          </div>
        </header>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 print:p-0">
          
          {/* PANEL PRINCIPAL */}
          {activeTab === 'panel' && (
            <div className="space-y-6">
              
              {/* BARRA SUPERIOR */}
              <div className="flex flex-col md:flex-row gap-4 justify-between items-end no-print">
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input 
                    type="text" 
                    placeholder="Buscar ID, Obra, Cliente..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none shadow-sm"
                  />
                </div>
                {!searchQuery && (
                  <div className="flex-1 px-4 flex items-center text-sm text-gray-500 overflow-x-auto">
                    <button onClick={() => setNavState({empresa: null, encargado: null})} className="flex items-center hover:text-red-600 transition-colors">
                      <Home size={16} className="mr-1"/> Inicio
                    </button>
                    {navState.empresa && (
                      <>
                        <ChevronRight size={16} className="mx-2 text-gray-300"/>
                        <button onClick={() => setNavState({...navState, encargado: null})} className="hover:text-red-600 transition-colors font-medium">
                          {navState.empresa}
                        </button>
                      </>
                    )}
                    {navState.encargado && (
                      <>
                        <ChevronRight size={16} className="mx-2 text-gray-300"/>
                        <span className="font-bold text-gray-800">{navState.encargado}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* CONTENIDO */}
              {(searchQuery || (navState.empresa && navState.encargado)) ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden card-resumen animate-in fade-in slide-in-from-bottom-2">
                  {!searchQuery && navState.empresa && (
                    <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setNavState({...navState, encargado: null})} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                          <ArrowLeft size={20} />
                        </button>
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">{navState.encargado}</h3>
                          <p className="text-xs text-gray-500">{navState.empresa}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase">Pendiente</p>
                        <p className="text-xl font-bold text-red-600">{totales.base.toLocaleString()} €</p>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 uppercase text-xs">
                        <tr>
                          <th className="px-6 py-4">ID Carreras</th>
                          <th className="px-6 py-4">Obra / ID</th>
                          <th className="px-6 py-4">Importe</th>
                          <th className="px-6 py-4 text-center">Retención</th>
                          <th className="px-6 py-4 text-center">Estado</th>
                          <th className="px-6 py-4 text-right no-print">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {obrasFiltradas.map(obra => (
                          <tr key={obra.id} className="hover:bg-red-50/30 transition-colors group">
                            <td className="px-6 py-4 font-mono font-medium text-gray-500">{obra.idCarreras || "-"}</td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900">{obra.nombre}</div>
                              <div className="text-xs text-gray-500">{obra.idObra}</div>
                              {searchQuery && <div className="text-[10px] text-red-500 mt-1">{obra.cliente} - {obra.encargado}</div>}
                            </td>
                            <td className="px-6 py-4 font-bold text-gray-900">
                              {Number(obra.importe).toLocaleString('es-ES', {minimumFractionDigits: 2})} €
                            </td>
                            <td className="px-6 py-4 text-center">
                              {obra.tieneRetencion ? <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-1 rounded font-bold">5%</span> : <span className="text-gray-300">-</span>}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                obra.estado === 'cobrado' ? 'bg-green-100 text-green-700' : 
                                obra.estado === 'facturado' ? 'bg-blue-100 text-blue-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {obra.estado.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right no-print">
                               <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleEdit(obra)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit size={16}/></button>
                                  <button onClick={() => handleDelete(obra.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                               </div>
                            </td>
                          </tr>
                        ))}
                        {obrasFiltradas.length === 0 && (
                          <tr><td colSpan="6" className="p-8 text-center text-gray-400">No se encontraron expedientes.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : !navState.empresa ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in">
                  {Object.keys(treeData).length === 0 && !loading && <p className="col-span-full text-center text-gray-400 py-10">No hay obras registradas.</p>}
                  
                  {Object.keys(treeData).map(empresa => (
                    <div 
                      key={empresa} 
                      onClick={() => setNavState({ ...navState, empresa })}
                      className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-red-200 cursor-pointer transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                        <Building size={80} />
                      </div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="bg-red-50 p-3 rounded-xl text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                          <Folder size={28} strokeWidth={1.5} />
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-1">{empresa}</h3>
                      <p className="text-xs text-gray-500 mb-4">{Object.keys(treeData[empresa].encargados).length} encargados</p>
                      
                      <div className="border-t border-gray-100 pt-3">
                        <p className="text-xs text-gray-400 uppercase font-bold mb-1">Pendiente Total</p>
                        <p className="text-xl font-bold text-red-600 group-hover:text-red-700">
                          {treeData[empresa].totalPendiente.toLocaleString()} €
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="animate-in fade-in">
                  <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setNavState({empresa: null, encargado: null})} className="p-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft size={20} className="text-gray-600" />
                      </button>
                      <h2 className="text-xl font-bold text-gray-800">{navState.empresa}</h2>
                    </div>
                    <div className="text-right px-2">
                      <span className="text-xs text-gray-500 uppercase font-bold">Total Pendiente Empresa</span>
                      <p className="text-2xl font-bold text-red-600">{treeData[navState.empresa]?.totalPendiente.toLocaleString()} €</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.keys(treeData[navState.empresa]?.encargados || {}).map(encargado => (
                      <div 
                        key={encargado}
                        onClick={() => setNavState({ ...navState, encargado })}
                        className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="bg-blue-50 p-3 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Users size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800">{encargado}</h4>
                            <p className="text-xs text-gray-500">Ver obras</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-500 uppercase">Pendiente</span>
                          <span className="text-lg font-bold text-gray-900">
                            {treeData[navState.empresa].encargados[encargado].totalPendiente.toLocaleString()} €
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* REPORTES, CIERRES, AJUSTES Y MODAL */}
          {(activeTab === 'reportes' || activeTab === 'cierres') && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center no-print">
                <div className="flex items-center gap-2 text-gray-500 font-bold text-sm mr-2">
                  <Filter size={18} /> FILTRAR:
                </div>
                <select className="input-filter" value={reportFilter.empresa} onChange={(e) => setReportFilter({...reportFilter, empresa: e.target.value})}>
                  <option value="Todas">Todas las Empresas</option>
                  {config.empresas?.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <select className="input-filter" value={reportFilter.encargado} onChange={(e) => setReportFilter({...reportFilter, encargado: e.target.value})}>
                  <option value="Todos">Todos los Encargados</option>
                  {config.encargados?.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                {activeTab === 'cierres' && (
                  <select className="input-filter" value={reportFilter.mes} onChange={(e) => setReportFilter({...reportFilter, mes: e.target.value})}>
                    <option value="Todos">Todos los Meses</option>
                    {[...new Set(obras.map(o => o.mes))].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                )}
                <button onClick={handlePrint} className="ml-auto bg-gray-900 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-black transition shadow-lg">
                  <Download size={16} /> Descargar PDF / Imprimir
                </button>
              </div>

              {activeTab === 'cierres' && reportFilter.mes !== 'Todos' && (
                <div className="mb-4 border-b-2 border-red-600 pb-2">
                  <h3 className="text-xl font-bold uppercase text-gray-800">Cierre Mensual: {reportFilter.mes}</h3>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ReportCard title="Base Imponible" amount={totales.base} color="text-gray-900" />
                <ReportCard title="Total IVA (21%)" amount={totales.iva} color="text-blue-600" />
                <ReportCard title="Retenciones (5%)" amount={totales.retencion} color="text-orange-600" isNegative />
                <ReportCard title="LÍQUIDO A PERCIBIR" amount={totales.totalFinal} color="text-red-600" isBold />
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 card-resumen">
                <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">Desglose Detallado</h3>
                <div className="space-y-4">
                  {Object.entries(obrasFiltradas.reduce((acc, obra) => {
                      const key = activeTab === 'cierres' ? obra.mes : obra.cliente;
                      if (!acc[key]) acc[key] = { base: 0, iva: 0, ret: 0, count: 0 };
                      const importe = obra.importe || 0;
                      acc[key].base += importe;
                      acc[key].iva += importe * 0.21;
                      if(obra.tieneRetencion) acc[key].ret += importe * 0.05;
                      acc[key].count += 1;
                      return acc;
                  }, {})).map(([group, data]) => (
                    <div key={group} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-all">
                      <div className="mb-2 sm:mb-0">
                        <p className="font-bold text-gray-900">{group}</p>
                        <p className="text-xs text-gray-500">{data.count} expedientes</p>
                      </div>
                      <div className="text-right flex gap-6 text-sm">
                        <div>
                           <p className="text-gray-400 text-xs uppercase">Base</p>
                           <p className="font-bold">{data.base.toLocaleString()} €</p>
                        </div>
                        {data.ret > 0 && (
                          <div>
                            <p className="text-orange-400 text-xs uppercase">Retenido</p>
                            <p className="font-bold text-orange-600">-{data.ret.toLocaleString()} €</p>
                          </div>
                        )}
                        <div>
                           <p className="text-green-600 text-xs uppercase font-bold">Líquido</p>
                           <p className="font-bold text-green-700 text-lg">
                             {(data.base + data.iva - data.ret).toLocaleString()} €
                           </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {activeTab === 'cierres' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 card-resumen mt-6">
                   <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">Relación de Obras Entregadas</h3>
                   <table className="w-full text-xs text-left">
                     <thead>
                       <tr className="border-b">
                         <th className="py-2">Fecha</th>
                         <th className="py-2">ID</th>
                         <th className="py-2">Obra</th>
                         <th className="py-2 text-right">Base</th>
                       </tr>
                     </thead>
                     <tbody>
                       {obrasFiltradas.map(o => (
                         <tr key={o.id} className="border-b border-gray-50">
                           <td className="py-1">{new Date(o.fecha).toLocaleDateString()}</td>
                           <td className="py-1">{o.idCarreras}</td>
                           <td className="py-1">{o.nombre}</td>
                           <td className="py-1 text-right">{Number(o.importe).toLocaleString()} €</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ajustes' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2"><Settings size={18}/> Listas Desplegables</h3>
                  <p className="text-xs text-gray-500 mt-1">Configura aquí las opciones que aparecen al crear una obra.</p>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                  <ConfigSection title="Empresas / Clientes" items={config.empresas} onAdd={(val) => updateConfigList('empresas', 'add', val)} onDelete={(val) => updateConfigList('empresas', 'delete', val)} />
                  <ConfigSection title="Encargados de Obra" items={config.encargados} onAdd={(val) => updateConfigList('encargados', 'add', val)} onDelete={(val) => updateConfigList('encargados', 'delete', val)} />
                  <ConfigSection title="Centrales / Zonas" items={config.centrales} onAdd={(val) => updateConfigList('centrales', 'add', val)} onDelete={(val) => updateConfigList('centrales', 'delete', val)} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL FORMULARIO */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print modal-overlay">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gray-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold">{editingObra ? 'Editar Expediente' : 'Añadir Obra'}</h3>
              <button onClick={() => setModalOpen(false)}><X className="text-gray-400 hover:text-white"/></button>
            </div>
            
            <form onSubmit={handleSaveObra} className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Sección 1 */}
              <div className="space-y-4 md:col-span-1 border-r border-gray-100 pr-4">
                <InputGroup label="ID Carreras">
                  <input required className="input-field" value={formData.idCarreras} onChange={e => setFormData({...formData, idCarreras: e.target.value})} placeholder="Ej. EXP-2024-001" />
                </InputGroup>
                <InputGroup label="ID Obra (Cliente)">
                  <input className="input-field" value={formData.idObra} onChange={e => setFormData({...formData, idObra: e.target.value})} placeholder="Ej. OT-998877" />
                </InputGroup>
                <InputGroup label="Nº Contrato">
                   <input className="input-field" value={formData.contrato} onChange={e => setFormData({...formData, contrato: e.target.value})} />
                </InputGroup>
              </div>

              {/* Sección 2 */}
              <div className="space-y-4 md:col-span-1 border-r border-gray-100 pr-4">
                <InputGroup label="Nombre Obra">
                  <textarea required rows={2} className="input-field resize-none" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                </InputGroup>
                <InputGroup label="Cliente">
                   <select required className="input-field" value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value})}>
                     <option value="">Seleccionar...</option>
                     {config.empresas?.map(op => <option key={op} value={op}>{op}</option>)}
                   </select>
                </InputGroup>
                <InputGroup label="Zona / Central">
                   <select required className="input-field" value={formData.central} onChange={e => setFormData({...formData, central: e.target.value})}>
                     <option value="">Seleccionar...</option>
                     {config.centrales?.map(op => <option key={op} value={op}>{op}</option>)}
                   </select>
                </InputGroup>
              </div>

              {/* Sección 3 */}
              <div className="space-y-4 md:col-span-1">
                <InputGroup label="Fecha">
                   <input type="date" required className="input-field" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} />
                </InputGroup>
                <InputGroup label="Base Imponible (€)">
                   <input type="number" step="0.01" required className="input-field font-bold text-lg" value={formData.importe} onChange={e => setFormData({...formData, importe: e.target.value})} />
                </InputGroup>
                <InputGroup label="Encargado">
                   <select required className="input-field" value={formData.encargado} onChange={e => setFormData({...formData, encargado: e.target.value})}>
                     <option value="">Seleccionar...</option>
                     {config.encargados?.map(op => <option key={op} value={op}>{op}</option>)}
                   </select>
                </InputGroup>
                
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-2 shadow-inner">
                   <label className="flex items-center gap-2 cursor-pointer mb-3">
                     <input type="checkbox" className="w-4 h-4 text-red-600 rounded" checked={formData.tieneRetencion} onChange={e => setFormData({...formData, tieneRetencion: e.target.checked})} />
                     <span className="text-sm font-bold text-gray-700">Aplicar 5% Retención</span>
                   </label>
                   
                   <div className="space-y-2 text-xs text-gray-600 border-t border-gray-200 pt-2">
                      <div className="flex justify-between">
                        <span>Base:</span> 
                        <span className="font-medium">{formCalculos.base.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span>+ IVA (21%):</span> 
                        <span className="font-medium">{formCalculos.iva.toFixed(2)} €</span>
                      </div>
                      {formData.tieneRetencion && (
                        <div className="flex justify-between text-orange-600">
                          <span>- Retención (5%):</span> 
                          <span className="font-medium">-{formCalculos.ret.toFixed(2)} €</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between font-black text-gray-900 text-lg pt-2 border-t border-gray-200 mt-2">
                        <span>TOTAL:</span> 
                        <span>{formCalculos.total.toFixed(2)} €</span>
                      </div>
                   </div>
                </div>

                <div className="flex bg-gray-100 rounded-lg p-1 mt-2">
                    {['pendiente', 'facturado', 'cobrado'].map(st => (
                      <button type="button" key={st} onClick={() => setFormData({...formData, estado: st})} className={`flex-1 py-1 text-xs font-bold rounded capitalize ${formData.estado === st ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}>{st}</button>
                    ))}
                </div>
              </div>

              <div className="md:col-span-3 pt-4 border-t border-gray-100 flex justify-end gap-3">
                 <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50">Cancelar</button>
                 <button 
                    type="submit" 
                    className="px-8 py-2 rounded-lg text-white font-bold shadow-lg shadow-red-200 flex items-center gap-2 bg-red-600 hover:bg-red-700 active:scale-95 transition-all"
                 >
                    Guardar Obra
                 </button>
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

  const handleAdd = () => {
    if (newValue.trim()) {
      onAdd(newValue.trim());
      setNewValue('');
    }
  };

  return (
    <div>
      <h4 className="font-bold text-gray-700 text-sm mb-3">{title}</h4>
      <div className="flex gap-2 mb-3">
        <input 
          type="text" 
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Añadir nuevo..."
          className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-red-500"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 rounded-lg"><Plus size={16}/></button>
      </div>
      <ul className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 text-sm max-h-40 overflow-y-auto">
        {items.map((item, idx) => (
          <li key={idx} className="px-3 py-2 flex justify-between items-center group">
            <span className="text-gray-600">{item}</span>
            <button onClick={() => onDelete(item)} className="text-gray-300 hover:text-red-500 transition-colors">
              <Trash2 size={14} />
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="px-3 py-2 text-gray-400 italic text-xs">Lista vacía</li>}
      </ul>
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
  return <div><label className="text-xs font-bold text-gray-500 uppercase ml-1 block mb-1">{label}</label>{children}</div>;
}

const style = document.createElement('style');
style.innerHTML = `
  .input-field { width: 100%; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.6rem 1rem; font-size: 0.875rem; outline: none; }
  .input-filter { background: #f9fafb; border: 1px solid #d1d5db; border-radius: 0.5rem; padding: 0.5rem; font-size: 0.875rem; }
`;
document.head.appendChild(style);