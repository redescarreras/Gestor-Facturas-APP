import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Settings, FileText, Plus, Edit2, Trash2, FolderOpen, 
  User, Briefcase, ChevronDown, ChevronUp, Save, X, Building, 
  CheckCircle, Clock, Search, Download, DollarSign, Activity, Archive, 
  Upload, Database, CalendarCheck
} from 'lucide-react';
// Importamos Firebase directamente aquí para asegurar la conexión
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy 
} from 'firebase/firestore';

// --- Configuración de Firebase Integrada ---
const firebaseConfig = {
  apiKey: "AIzaSyCO_phXPPwZEgQEQlug69bvG5snSbRYZfQ",
  authDomain: "gestor-facturas-b665a.firebaseapp.com",
  projectId: "gestor-facturas-b665a",
  storageBucket: "gestor-facturas-b665a.firebasestorage.app",
  messagingSenderId: "178513177002",
  appId: "1:178513177002:web:d470b0d03e5ef64bf3e3d3"
};

// Inicializar Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  // Evitar re-inicialización
}
const db = getFirestore(app);

// --- Utilitarios ---
const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value || 0);
};

const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// --- Componentes ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>{children}</div>
);

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
    <div>
      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-3xl font-black text-gray-800">{value}</h3>
    </div>
    <div className={`p-4 rounded-xl ${colorClass} bg-opacity-10 shadow-inner`}>
      <Icon size={28} className={colorClass.replace('bg-', 'text-')} />
    </div>
  </div>
);

const Badge = ({ status }) => {
  const styles = {
    facturado: 'bg-green-100 text-green-800 border-green-200',
    pendiente: 'bg-orange-100 text-orange-800 border-orange-200',
    archivado: 'bg-gray-100 text-gray-600 border-gray-200'
  };
  const labels = {
    facturado: 'FACTURADO',
    pendiente: 'PENDIENTE',
    archivado: 'CERRADO'
  };
  return (
    <span className={`px-3 py-1 text-[10px] font-extrabold rounded-full flex items-center gap-1.5 w-fit border ${styles[status] || styles.pendiente}`}>
      {status === 'facturado' ? <CheckCircle size={12} /> : status === 'archivado' ? <Archive size={12}/> : <Clock size={12} />}
      {labels[status] || 'PENDIENTE'}
    </span>
  );
};

export default function App() {
  const [view, setView] = useState('dashboard');
  
  // --- Estados de Datos (NUBE) ---
  const [obras, setObras] = useState([]);
  const [cierres, setCierres] = useState([]);
  const [loading, setLoading] = useState(true);

  // Configuración Local
  const [empresas, setEmpresas] = useState(() => JSON.parse(localStorage.getItem('empresas_rc')) || ['Elecnor-Circet', 'Magtel']);
  const [encargados, setEncargados] = useState(() => JSON.parse(localStorage.getItem('encargados_rc')) || ['Encargado 1', 'Encargado 2']);
  const [centrales, setCentrales] = useState(() => JSON.parse(localStorage.getItem('centrales_rc')) || ['Central Norte', 'Central Sur']);

  const [logoBase64, setLogoBase64] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    idRedes: '', actuacion: '', fecha: new Date().toISOString().split('T')[0],
    importe: '', plus5: false, viviendas: 'No procede', central: '',
    contrato: '', factura: '', observaciones: '', encargado: '', empresa: '', estado: 'pendiente'
  });

  const [expandedEmpresas, setExpandedEmpresas] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // --- Sincronización Firebase ---
  useEffect(() => {
    // Escuchar Obras
    const q = query(collection(db, "obras")); 
    const unsubscribeObras = onSnapshot(q, (snapshot) => {
      const obrasData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setObras(obrasData);
      setLoading(false);
    }, (error) => {
      console.error("Error al escuchar obras:", error);
      setLoading(false);
    });

    // Escuchar Cierres
    const qCierres = query(collection(db, "cierres"), orderBy("fecha", "desc"));
    const unsubscribeCierres = onSnapshot(qCierres, (snapshot) => {
      const cierresData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setCierres(cierresData);
    }, (error) => {
      console.error("Error al escuchar cierres:", error);
    });

    return () => { unsubscribeObras(); unsubscribeCierres(); };
  }, []);

  // Persistencia Configuración
  useEffect(() => localStorage.setItem('empresas_rc', JSON.stringify(empresas)), [empresas]);
  useEffect(() => localStorage.setItem('encargados_rc', JSON.stringify(encargados)), [encargados]);
  useEffect(() => localStorage.setItem('centrales_rc', JSON.stringify(centrales)), [centrales]);

  // Carga PDF
  useEffect(() => {
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
      .then(() => loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js'));
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = "./logo-redes_Transparente-216x216.png"; 
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      try { setLogoBase64(canvas.toDataURL('image/png')); } catch (e) {}
    };
  }, []);

  // --- Funciones ---
  const calculateTotal = (importe, plus5) => {
    const base = parseFloat(importe) || 0;
    return plus5 ? base * 1.05 : base;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const obraData = {
      ...formData,
      idRedes: parseInt(formData.idRedes) || 0,
      importe: parseFloat(formData.importe) || 0,
      total: calculateTotal(formData.importe, formData.plus5),
      year: new Date(formData.fecha).getFullYear(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "obras", editingId), obraData);
      } else {
        await addDoc(collection(db, "obras"), { ...obraData, createdAt: new Date().toISOString() });
      }
      setView('dashboard');
      setEditingId(null);
    } catch (error) {
      alert("Error al guardar en la nube: " + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar de la nube permanentemente?')) {
      try { await deleteDoc(doc(db, "obras", id)); } catch (error) { alert(error.message); }
    }
  };

  const handleCierreMes = async () => {
    const pendientes = obras.filter(o => o.estado === 'pendiente');
    if (pendientes.length === 0) { alert("No hay nada pendiente."); return; }
    const totalCierre = pendientes.reduce((acc, curr) => acc + curr.total, 0);
    
    if (confirm(`¿CERRAR MES?\nTotal: ${formatCurrency(totalCierre)}`)) {
      try {
        await addDoc(collection(db, "cierres"), {
          fecha: new Date().toISOString(), total: totalCierre,
          cantidadObras: pendientes.length, detalles: pendientes 
        });
        for (const obra of pendientes) {
          await updateDoc(doc(db, "obras", obra.id), { estado: 'archivado', fechaCierre: new Date().toISOString() });
        }
        alert("Mes cerrado.");
      } catch (error) { alert(error.message); }
    }
  };

  // --- Backup ---
  const handleExportBackup = () => {
    const blob = new Blob([JSON.stringify({ obras, cierres }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `backup_cloud_${new Date().toISOString().slice(0,10)}.json`; a.click();
  };

  // --- PDF ---
  const generatePDF = (type, filterValue = null) => {
    if (!window.jspdf) { alert("Cargando PDF..."); return; }
    const doc = new window.jspdf.jsPDF({ orientation: 'landscape' });
    let dataToPrint = [];
    let title = "";
    const activeObras = obras.filter(o => o.estado !== 'archivado');

    if (type === 'encargado') {
      dataToPrint = activeObras.filter(o => o.estado === 'pendiente' && o.encargado === filterValue);
      title = `PENDIENTES - ${filterValue.toUpperCase()}`;
    } else if (type === 'empresa') {
      dataToPrint = activeObras.filter(o => o.estado === 'pendiente' && o.empresa === filterValue);
      title = `PENDIENTES - ${filterValue.toUpperCase()}`;
    } else if (type === 'final') {
      dataToPrint = activeObras.filter(o => o.estado === 'pendiente');
      title = "REPORTE GLOBAL";
    }

    if (dataToPrint.length === 0) { alert("Sin datos."); return; }
    dataToPrint.sort((a, b) => b.idRedes - a.idRedes);

    const logoToUse = logoBase64 || "./logo-redes_Transparente-216x216.png";
    try { if (logoToUse) doc.addImage(logoToUse, 'PNG', 14, 10, 20, 20); } catch (e) {}
    
    doc.setFontSize(18); doc.setTextColor(220, 38, 38); doc.text("REDES CARRERAS", 40, 20);
    doc.setFontSize(12); doc.setTextColor(0); doc.text(title, 40, 28);
    doc.setFontSize(10); doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 250, 20);

    const columns = [
      { header: 'ID', dataKey: 'idRedes' }, { header: 'Empresa', dataKey: 'empresa' },
      { header: 'Encargado', dataKey: 'encargado' }, { header: 'Actuación', dataKey: 'actuacion' },
      { header: 'Fecha', dataKey: 'fecha' }, { header: 'Central', dataKey: 'central' },
      { header: 'Contrato', dataKey: 'contrato' }, { header: 'Base', dataKey: 'importe' },
      { header: '+5%', dataKey: 'plus5' }, { header: 'TOTAL', dataKey: 'total' }
    ];
    if (type === 'final') { columns.push({ header: 'IVA 21%', dataKey: 'iva' }); columns.push({ header: 'TOTAL FACTURA', dataKey: 'grandTotal' }); }

    const rows = dataToPrint.map(item => {
      const base = parseFloat(item.total);
      const iva = base * 0.21;
      return {
        idRedes: item.idRedes, empresa: item.empresa, encargado: item.encargado,
        actuacion: item.actuacion, fecha: new Date(item.fecha).toLocaleDateString(),
        central: item.central || '-', contrato: item.contrato || '-',
        importe: formatCurrency(item.importe), plus5: item.plus5 ? 'SÍ' : 'NO',
        total: formatCurrency(item.total), iva: formatCurrency(iva),
        grandTotal: formatCurrency(base + iva)
      };
    });

    doc.autoTable({ startY: 35, head: [columns.map(c => c.header)], body: rows.map(r => columns.map(c => r[c.dataKey])), styles: { fontSize: 8, halign: 'center' }, headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255] } });
    const totalPending = dataToPrint.reduce((acc, curr) => acc + curr.total, 0);
    const finalY = doc.lastAutoTable.finalY + 10;
    if (type === 'final') {
      const totalIVA = totalPending * 0.21;
      doc.setFontSize(14); doc.setTextColor(220, 38, 38); doc.setFont(undefined, 'bold');
      doc.text(`TOTAL A FACTURAR: ${formatCurrency(totalPending + totalIVA)}`, 14, finalY + 10);
    } else { doc.setFontSize(12); doc.text(`Total Base: ${formatCurrency(totalPending)}`, 14, finalY); }
    doc.save(`Reporte_${type}.pdf`);
  };

  // --- Render ---
  const renderDashboard = () => {
    const activeWorks = obras.filter(o => o.estado !== 'archivado');
    const filtered = activeWorks.filter(o => o.idRedes.toString().includes(searchTerm) || o.actuacion.toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => b.idRedes - a.idRedes);
    const totalPending = filtered.filter(o => o.estado === 'pendiente').reduce((a, b) => a + b.total, 0);

    return (
      <div className="space-y-8 pb-24 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <StatCard title="Pendiente (Nube)" value={formatCurrency(totalPending)} icon={DollarSign} colorClass="bg-red-600" />
           <StatCard title="Obras Activas" value={filtered.length} icon={FolderOpen} colorClass="bg-blue-500" />
           {loading && <div className="flex items-center gap-2 text-gray-500"><Activity className="animate-spin"/> Conectando...</div>}
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
           <div className="relative w-full md:w-96"><Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20}/><input className="w-full pl-12 pr-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-red-100 outline-none" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
           <button onClick={() => { setEditingId(null); setFormData({ ...formData, idRedes: '', importe: '', factura: '', contrato: '' }); setView('form'); }} className="w-full md:w-auto bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 shadow-lg font-bold flex items-center justify-center gap-2"><Plus size={20}/> Nueva Obra</button>
        </div>
        <div className="space-y-6">
          {empresas.map(emp => {
            const obrasEmp = filtered.filter(o => o.empresa === emp);
            const expanded = expandedEmpresas[emp];
            const totalEmp = obrasEmp.filter(o => o.estado === 'pendiente').reduce((a, b) => a + b.total, 0);
            return (
              <div key={emp} className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${expanded ? 'shadow-md border-red-100' : 'shadow-sm border-gray-100'}`}>
                <div onClick={() => setExpandedEmpresas(prev => ({ ...prev, [emp]: !prev[emp] }))} className="p-5 flex flex-col md:flex-row justify-between items-center cursor-pointer group hover:bg-gray-50/50">
                  <div className="flex items-center gap-4 w-full md:w-auto"><div className={`p-3 rounded-xl ${expanded ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'} transition-colors`}><Building size={24}/></div><div><h3 className="text-lg font-bold text-gray-800">{emp}</h3><p className="text-sm text-gray-500">{obrasEmp.length} obras</p></div></div>
                  <div className="flex items-center gap-6 mt-4 md:mt-0 w-full md:w-auto justify-between md:justify-end"><div className="text-right"><p className="text-xs text-gray-400 font-bold uppercase">Pendiente</p><p className="text-lg font-bold text-red-600">{formatCurrency(totalEmp)}</p></div><div className="p-2 rounded-full bg-white shadow-sm border border-gray-100">{expanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</div></div>
                </div>
                {expanded && (
                  <div className="border-t border-gray-100 bg-slate-50/50 p-6 animate-fade-in">
                    {encargados.map(enc => {
                      const obrasEnc = obrasEmp.filter(o => o.encargado === enc);
                      if (!obrasEnc.length) return null;
                      return (
                         <div key={enc} className="mb-8 last:mb-0">
                           <div className="flex items-center gap-2 mb-3 px-2"><User size={18} className="text-blue-600"/><h4 className="font-bold text-gray-700">{enc}</h4><span className="text-xs bg-white px-2 rounded border text-gray-500">{obrasEnc.length}</span></div>
                           <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                             <div className="overflow-x-auto">
                               <table className="w-full text-sm">
                                 <thead className="bg-gray-50 border-b border-gray-100"><tr><th className="px-5 py-3 text-left">ID</th><th className="px-5 py-3 text-left">Actuación</th><th className="px-5 py-3 text-right">Total</th><th className="px-5 py-3 text-center">Estado</th><th className="px-5 py-3 text-center">Acciones</th></tr></thead>
                                 <tbody className="divide-y divide-gray-100">
                                   {obrasEnc.map(o => (
                                     <tr key={o.id} className="hover:bg-red-50/10 transition-colors">
                                       <td className="px-5 py-3 font-bold text-gray-700">#{o.idRedes}</td>
                                       <td className="px-5 py-3"><div className="font-medium text-gray-800">{o.actuacion}</div><div className="text-xs text-gray-400">{new Date(o.fecha).toLocaleDateString()}</div>{o.central && <div className="text-[10px] text-blue-500 uppercase font-bold">{o.central}</div>}</td>
                                       <td className="px-5 py-3 text-right font-mono font-medium text-gray-700">{formatCurrency(o.total)}</td>
                                       <td className="px-5 py-3 flex justify-center"><Badge status={o.estado}/></td>
                                       <td className="px-5 py-3 text-center"><div className="flex justify-center gap-2"><button onClick={() => { setFormData(o); setEditingId(o.id); setView('form'); }} className="p-1.5 text-blue-600 bg-blue-50 rounded hover:bg-blue-100"><Edit2 size={16}/></button><button onClick={() => handleDelete(o.id)} className="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100"><Trash2 size={16}/></button></div></td>
                                     </tr>
                                   ))}
                                 </tbody>
                               </table>
                             </div>
                           </div>
                         </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderForm = () => (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden my-6 animate-fade-in">
      <div className="bg-red-600 p-6 flex justify-between items-center text-white"><h2 className="text-xl font-bold flex items-center gap-2">{editingId ? <Edit2 size={24}/> : <Plus size={24}/>} {editingId ? 'Editar Obra' : 'Nueva Obra'}</h2><button onClick={() => setView('dashboard')} className="hover:bg-white/20 p-2 rounded-lg"><X size={24}/></button></div>
      <form onSubmit={handleSave} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div><label className="block text-sm font-bold text-gray-700 mb-1">ID Empresa</label><input type="number" required className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" value={formData.idRedes} onChange={e => setFormData({...formData, idRedes: e.target.value})} placeholder="Ej: 101" /></div>
          <div><label className="block text-sm font-bold text-gray-700 mb-1">Actuación</label><input required className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" value={formData.actuacion} onChange={e => setFormData({...formData, actuacion: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-bold text-gray-700 mb-1">Empresa</label><select required className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-red-500 bg-white" value={formData.empresa} onChange={e => setFormData({...formData, empresa: e.target.value})}><option value="">Seleccionar...</option>{empresas.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
            <div><label className="block text-sm font-bold text-gray-700 mb-1">Encargado</label><select required className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-red-500 bg-white" value={formData.encargado} onChange={e => setFormData({...formData, encargado: e.target.value})}><option value="">Seleccionar...</option>{encargados.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div><label className="block text-sm font-bold text-gray-700 mb-1">Central</label><select className="w-full border p-3 rounded-lg bg-white" value={formData.central} onChange={e => setFormData({...formData, central: e.target.value})}><option value="">Seleccionar...</option>{centrales.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
             <div><label className="block text-sm font-bold text-gray-700 mb-1">Contrato</label><input className="w-full border p-3 rounded-lg" value={formData.contrato} onChange={e => setFormData({...formData, contrato: e.target.value})} /></div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
             <label className="block text-sm font-bold text-gray-700 mb-2">Económico</label>
             <input type="number" step="0.01" placeholder="Importe (€)" className="w-full border p-3 rounded-lg mb-3" value={formData.importe} onChange={e => setFormData({...formData, importe: e.target.value})} />
             <label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" className="w-5 h-5 text-red-600 rounded focus:ring-red-500" checked={formData.plus5} onChange={e => setFormData({...formData, plus5: e.target.checked})} /> <span className="text-gray-700 font-medium">Añadir Plus 5%</span></label>
             <div className="mt-3 pt-3 border-t flex justify-between"><span className="text-sm font-medium">Total:</span><span className="text-xl font-black text-red-600">{formatCurrency(calculateTotal(formData.importe, formData.plus5))}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-bold text-gray-700 mb-1">Fecha</label><input type="date" required className="w-full border p-3 rounded-lg" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} /></div>
            <div><label className="block text-sm font-bold text-gray-700 mb-1">Factura</label><input className="w-full border p-3 rounded-lg" placeholder="Opcional" value={formData.factura} onChange={e => setFormData({...formData, factura: e.target.value})} /></div>
          </div>
          <div><label className="block text-sm font-bold text-gray-700 mb-1">Estado</label><div className="flex gap-2"><button type="button" onClick={() => setFormData({...formData, estado: 'pendiente'})} className={`flex-1 py-2 rounded-lg text-sm font-bold border ${formData.estado === 'pendiente' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'border-gray-200'}`}>Pendiente</button><button type="button" onClick={() => setFormData({...formData, estado: 'facturado'})} className={`flex-1 py-2 rounded-lg text-sm font-bold border ${formData.estado === 'facturado' ? 'bg-green-50 border-green-500 text-green-700' : 'border-gray-200'}`}>Facturado</button></div></div>
        </div>
        <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-700 mb-1">Observaciones</label><textarea className="w-full border p-3 rounded-lg h-24 resize-none" value={formData.observaciones} onChange={e => setFormData({...formData, observaciones: e.target.value})}></textarea></div>
        <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={() => setView('dashboard')} className="px-6 py-3 rounded-lg border hover:bg-gray-50 font-bold">Cancelar</button><button type="submit" className="px-8 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 font-bold flex items-center gap-2"><Save size={20}/> Guardar (Nube)</button></div>
      </form>
    </div>
  );

  const renderConfig = () => (
    <div className="space-y-8 animate-fade-in pb-20">
      <Card className="p-6 border-blue-100 bg-blue-50/30">
         <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div><h3 className="text-xl font-bold text-blue-800 flex items-center gap-2"><Database size={24}/> Backup Nube</h3><p className="text-blue-600/80 text-sm">Descarga copia de seguridad de la nube.</p></div>
            <button onClick={handleExportBackup} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md"><Download size={18}/> Exportar</button>
         </div>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[ { t: 'Empresas', i: Building, d: empresas, s: setEmpresas }, { t: 'Encargados', i: User, d: encargados, s: setEncargados }, { t: 'Centrales', i: Settings, d: centrales, s: setCentrales } ].map((c, i) => (
           <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
             <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-red-50 text-red-600 rounded-xl"><c.i size={24}/></div><h3 className="font-bold text-xl text-gray-800">{c.t}</h3></div>
             <div className="flex gap-2 mb-4"><input id={`in-${i}`} className="flex-1 border p-2 rounded-lg" placeholder={`Añadir...`} /><button onClick={() => { const el = document.getElementById(`in-${i}`); if(el.value) { c.s([...c.d, el.value]); el.value=''; } }} className="bg-red-600 text-white p-2 rounded-lg"><Plus size={24}/></button></div>
             <ul className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-60">
               {c.d.map(item => (<li key={item} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg group hover:bg-white hover:shadow-sm"><span className="font-medium text-gray-700">{item}</span><button onClick={() => confirm(`¿Eliminar ${item}?`) && c.s(c.d.filter(x => x !== item))} className="text-gray-400 hover:text-red-500 p-2 rounded-md hover:bg-red-50"><Trash2 size={18}/></button></li>))}
             </ul>
           </div>
         ))}
      </div>
    </div>
  );

  const renderCierres = () => (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
       <div className="bg-gradient-to-r from-gray-900 to-black rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="relative z-10"><h3 className="text-2xl font-bold mb-2 text-red-500 flex items-center gap-2"><CalendarCheck size={28}/> Cierre de Mes</h3><p className="text-gray-400 max-w-lg">Archiva las obras pendientes en la nube y reinicia el contador.</p></div>
          <button onClick={handleCierreMes} className="relative z-10 bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-xl font-bold shadow-lg flex items-center gap-3 hover:scale-105 transition-all"><Archive size={24}/> CERRAR MES</button>
       </div>
       <div className="space-y-4">
          <h3 className="font-bold text-xl text-gray-800 ml-2">Historial (Nube)</h3>
          {cierres.length === 0 ? (<p className="text-center text-gray-400 py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">Sin cierres.</p>) : (
             cierres.map(cierre => (
                <div key={cierre.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                   <div><p className="text-sm text-gray-500 font-bold uppercase">{new Date(cierre.fecha).toLocaleDateString()}</p><p className="text-lg font-bold text-gray-800">{cierre.cantidadObras} obras</p></div>
                   <p className="text-2xl font-black text-gray-800">{formatCurrency(cierre.total)}</p>
                </div>
             ))
          )}
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 font-sans">
       <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
         <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView('dashboard')}>
               <img src="./logo-redes_Transparente-216x216.png" className="h-14 w-auto drop-shadow-sm hover:scale-105 transition-transform" onError={e => e.target.style.display='none'}/>
               <div className="hidden md:block"><h1 className="text-2xl font-black tracking-tight text-red-600 leading-none">REDES CARRERAS</h1><p className="text-xs text-gray-400 font-bold tracking-wide mt-1">GESTIÓN CLOUD</p></div>
            </div>
            <nav className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-xl overflow-x-auto">
               {[{ id: 'dashboard', icon: LayoutDashboard, label: 'Panel' }, { id: 'reports', icon: FileText, label: 'Reportes' }, { id: 'cierres', icon: CalendarCheck, label: 'Cierres' }, { id: 'config', icon: Settings, label: 'Ajustes' }].map(item => (
                 <button key={item.id} onClick={() => setView(item.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${view === item.id ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><item.icon size={18} strokeWidth={2.5}/> <span className="hidden sm:inline">{item.label}</span></button>
               ))}
            </nav>
         </div>
       </header>
       <main className="max-w-7xl mx-auto px-4 py-8">
          {view === 'dashboard' && renderDashboard()}
          {view === 'form' && renderForm()}
          {view === 'config' && renderConfig()}
          {view === 'cierres' && renderCierres()}
          {view === 'reports' && (
             <div className="max-w-5xl mx-auto space-y-6 pb-20">
                <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6"><div className="relative z-10"><h3 className="text-2xl font-bold mb-2">Reporte Final</h3><p className="text-white/80 max-w-md">Descarga el informe completo con desglose de IVA (21%).</p></div><button onClick={() => generatePDF('final')} className="relative z-10 bg-white text-red-600 px-8 py-4 rounded-xl font-bold shadow-lg flex items-center gap-3 hover:scale-105 transition-all"><Download size={24}/> DESCARGAR PDF</button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6 h-full flex flex-col"><div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100"><div className="p-2 bg-red-50 rounded-lg text-red-600"><User size={20}/></div><h4 className="font-bold text-lg text-gray-800">Por Encargado</h4></div><div className="space-y-2 flex-1 overflow-y-auto max-h-80 pr-2 custom-scrollbar">{encargados.map(e => (<button key={e} onClick={() => generatePDF('encargado', e)} className="w-full text-left p-3 rounded-lg hover:bg-red-50 hover:text-red-700 flex justify-between group border border-transparent hover:border-red-100"><span className="font-medium text-gray-700 group-hover:text-red-700">{e}</span><Download size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-all"/></button>))}</div></Card>
                  <Card className="p-6 h-full flex flex-col"><div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100"><div className="p-2 bg-red-50 rounded-lg text-red-600"><Building size={20}/></div><h4 className="font-bold text-lg text-gray-800">Por Empresa</h4></div><div className="space-y-2 flex-1 overflow-y-auto max-h-80 pr-2 custom-scrollbar">{empresas.map(e => (<button key={e} onClick={() => generatePDF('empresa', e)} className="w-full text-left p-3 rounded-lg hover:bg-red-50 hover:text-red-700 flex justify-between group border border-transparent hover:border-red-100"><span className="font-medium text-gray-700 group-hover:text-red-700">{e}</span><Download size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-all"/></button>))}</div></Card>
                </div>
             </div>
          )}
       </main>
    </div>
  );
}