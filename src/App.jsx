import React, { useState, useEffect } from 'react';
import { realtimeDb } from './firebase'; 
import { ref, push, onValue, remove, serverTimestamp } from "firebase/database";
import { HardHat, ClipboardList, PlusCircle, Trash2, Lock } from 'lucide-react'; // Usando lucide-react del package.json

function App() {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [obra, setObra] = useState("");
  const [listaObras, setListaObras] = useState([]);
  const [error, setError] = useState(false);

  const PIN_CORRECTO = "1482"; 

  useEffect(() => {
    if (isAuthenticated) {
      const obrasRef = ref(realtimeDb, 'obras');
      return onValue(obrasRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const lista = Object.keys(data).map(id => ({ id, ...data[id] }));
          setListaObras(lista.sort((a, b) => b.createdAt - a.createdAt));
        } else {
          setListaObras([]);
        }
      });
    }
  }, [isAuthenticated]);

  const manejarLogin = (e) => {
    e.preventDefault();
    if (pin === PIN_CORRECTO) {
      if (document.activeElement) document.activeElement.blur();
      setIsAuthenticated(true);
    } else {
      setError(true);
      setPin("");
    }
  };

  const guardarObra = (e) => {
    e.preventDefault();
    if (!obra.trim()) return;
    if (document.activeElement) document.activeElement.blur();

    push(ref(realtimeDb, 'obras'), {
      nombre: obra,
      fecha: new Date().toLocaleString('es-ES'),
      createdAt: serverTimestamp()
    });
    setObra("");
  };

  // 1. PANTALLA DE ACCESO
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-xs text-center">
          <img src="/app-redes/logo-redes_Transparente-216x216.png" className="w-32 mx-auto mb-6" alt="Logo" />
          <form onSubmit={manejarLogin}>
            <input 
              type="password" 
              inputMode="numeric"
              className={`w-full text-center text-3xl border-2 p-3 rounded-xl mb-4 outline-none ${error ? 'border-red-500 animate-pulse' : 'border-gray-100'}`}
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
            />
            <button className="w-full bg-black text-white py-4 rounded-xl font-bold uppercase tracking-widest">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  // 2. APP REDES CARRERAS (4 MÓDULOS)
  return (
    <div className="min-h-screen bg-gray-100 font-sans text-slate-900">
      {/* HEADER */}
      <header className="bg-white border-b p-4 sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <HardHat className="text-orange-500" />
          <span className="font-black text-lg">REDES CARRERAS</span>
        </div>
        <button onClick={() => setIsAuthenticated(false)}><Lock size={20} className="text-gray-400" /></button>
      </header>

      <main className="p-4 max-w-lg mx-auto grid grid-cols-1 gap-4">
        
        {/* MÓDULO 1: FORMULARIO DE ALTA */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4 text-blue-600">
            <PlusCircle size={18} />
            <h2 className="font-bold uppercase text-sm">Nueva Gestión</h2>
          </div>
          <form onSubmit={guardarObra} className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 bg-gray-50 border-none p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre de la obra o concepto..."
              value={obra}
              onChange={(e) => setObra(e.target.value)}
            />
            <button className="bg-black text-white px-6 rounded-xl font-bold">＋</button>
          </form>
        </section>

        {/* MÓDULO 2: LISTADO EN TIEMPO REAL */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4 text-gray-500">
            <ClipboardList size={18} />
            <h2 className="font-bold uppercase text-sm">Registro de Actividad</h2>
          </div>
          <div className="space-y-3">
            {listaObras.map((o) => (
              <div key={o.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex-1 pr-4">
                  <p className="font-bold text-sm leading-tight">{o.nombre}</p>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase font-medium">{o.fecha}</p>
                </div>
                <button onClick={() => remove(ref(realtimeDb, `obras/${o.id}`))} className="text-gray-300 hover:text-red-500">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {listaObras.length === 0 && <p className="text-center text-gray-300 py-4 text-sm font-medium italic">Sin datos registrados</p>}
          </div>
        </section>

        {/* MÓDULO 3 Y 4: RESUMEN Y ESTADISTICAS */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 p-4 rounded-2xl text-white">
            <p className="text-[10px] opacity-60 uppercase font-bold mb-1">Total Obras</p>
            <p className="text-3xl font-black">{listaObras.length}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-col items-center justify-center">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mb-1"></div>
             <p className="text-[10px] text-gray-400 font-bold uppercase">Online</p>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;