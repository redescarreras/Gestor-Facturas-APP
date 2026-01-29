import React, { useState, useEffect } from 'react';
import { realtimeDb } from './firebase'; 
import { ref, push, onValue, remove, serverTimestamp } from "firebase/database";
import { Lock, HardHat, PlusCircle, List, BarChart, Settings } from 'lucide-react'; // Usando dependencias de tu package.json

function App() {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [nuevaObra, setNuevaObra] = useState("");
  const [obras, setObras] = useState([]);
  const [errorPin, setErrorPin] = useState(false);

  const PIN_CORRECTO = "1482"; 

  useEffect(() => {
    if (isAuthenticated) {
      const obrasRef = ref(realtimeDb, 'obras');
      const unsubscribe = onValue(obrasRef, (snapshot) => {
        const data = snapshot.val();
        const lista = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];
        setObras(lista.sort((a, b) => b.createdAt - a.createdAt));
      });
      return () => unsubscribe();
    }
  }, [isAuthenticated]);

  const acceder = (e) => {
    e.preventDefault();
    if (pin === PIN_CORRECTO) {
      if (document.activeElement) document.activeElement.blur();
      setIsAuthenticated(true);
    } else {
      setErrorPin(true);
      setPin("");
    }
  };

  const guardar = (e) => {
    e.preventDefault();
    if (!nuevaObra.trim()) return;
    if (document.activeElement) document.activeElement.blur();
    push(ref(realtimeDb, 'obras'), {
      nombre: nuevaObra,
      fecha: new Date().toLocaleString(),
      createdAt: serverTimestamp()
    });
    setNuevaObra("");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-red-600 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-xs text-center">
          <img src="/app-redes/logo-redes_Transparente-216x216.png" className="w-32 mx-auto mb-6" alt="Redes Carreras" />
          <form onSubmit={acceder}>
            <input 
              type="password" 
              inputMode="numeric"
              className={`w-full text-center text-3xl border-2 p-2 rounded mb-4 outline-none ${errorPin ? 'border-red-500' : 'border-gray-200'}`}
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
            />
            <button className="w-full bg-red-600 text-white py-3 rounded font-bold uppercase tracking-wider">Acceder</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-red-600 text-white p-4 shadow-lg flex justify-between items-center">
        <div className="flex items-center gap-2">
          <HardHat size={24} />
          <h1 className="font-bold text-lg italic tracking-tight">REDES CARRERAS S.L.</h1>
        </div>
        <button onClick={() => setIsAuthenticated(false)} className="opacity-70"><Lock size={20} /></button>
      </header>

      <main className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
        {/* MODULO 1: FORMULARIO */}
        <section className="bg-white p-4 rounded shadow border-t-4 border-red-600">
          <div className="flex items-center gap-2 mb-4 text-red-600">
            <PlusCircle size={20} />
            <h2 className="font-bold uppercase text-sm">Registro de Obras</h2>
          </div>
          <form onSubmit={guardar} className="flex flex-col gap-2">
            <input 
              type="text" 
              className="border p-3 rounded bg-gray-50 outline-none focus:border-red-600"
              placeholder="Concepto de obra..."
              value={nuevaObra}
              onChange={(e) => setNuevaObra(e.target.value)}
            />
            <button className="bg-red-600 text-white p-3 rounded font-bold">GUARDAR</button>
          </form>
        </section>

        {/* MODULO 2: LISTADO */}
        <section className="bg-white p-4 rounded shadow border-t-4 border-red-600">
          <div className="flex items-center gap-2 mb-4 text-red-600">
            <List size={20} />
            <h2 className="font-bold uppercase text-sm">Historial Reciente</h2>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {obras.map((o) => (
              <div key={o.id} className="flex justify-between items-center p-3 bg-red-50 rounded border border-red-100">
                <div className="flex-1 pr-4">
                  <p className="font-bold text-gray-800 leading-tight">{o.nombre}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{o.fecha}</p>
                </div>
                <button onClick={() => remove(ref(realtimeDb, `obras/${o.id}`))} className="text-red-300 hover:text-red-600">✕</button>
              </div>
            ))}
          </div>
        </section>

        {/* MODULO 3: ESTADÍSTICAS */}
        <section className="bg-white p-4 rounded shadow border-t-4 border-red-600 flex flex-col items-center justify-center">
          <BarChart className="text-red-600 mb-2" size={30} />
          <p className="text-3xl font-black text-red-600">{obras.length}</p>
          <p className="text-[10px] uppercase font-bold text-gray-400">Total Registros</p>
        </section>

        {/* MODULO 4: AJUSTES / ESTADO */}
        <section className="bg-white p-4 rounded shadow border-t-4 border-red-600 flex flex-col items-center justify-center">
          <Settings className="text-red-600 mb-2 animate-spin-slow" size={30} />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <p className="text-[10px] uppercase font-bold text-gray-400">Sistema Online</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;