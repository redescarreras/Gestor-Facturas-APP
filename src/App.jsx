import React, { useState, useEffect } from 'react';
import { realtimeDb } from './firebase'; 
import { ref, push, onValue, remove, serverTimestamp } from "firebase/database";

function App() {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [factura, setFactura] = useState("");
  const [listaFacturas, setListaFacturas] = useState([]);
  const [error, setError] = useState(false);

  // --- CONFIGURA TU PIN AQUÍ ---
  const PIN_CORRECTO = "1482"; 

  useEffect(() => {
    if (isAuthenticated) {
      const facturasRef = ref(realtimeDb, 'facturas');
      const unsubscribe = onValue(facturasRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const lista = Object.keys(data).map(id => ({ id, ...data[id] }));
          setListaFacturas(lista.sort((a, b) => b.createdAt - a.createdAt));
        } else {
          setListaFacturas([]);
        }
      });
      return () => unsubscribe();
    }
  }, [isAuthenticated]);

  const manejarLogin = (e) => {
    e.preventDefault();
    if (pin === PIN_CORRECTO) {
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPin("");
    }
  };

  const guardar = (e) => {
    e.preventDefault();
    if (!factura.trim()) return;
    push(ref(realtimeDb, 'facturas'), {
      nombre: factura,
      fecha: new Date().toLocaleString('es-ES'),
      createdAt: serverTimestamp()
    });
    setFactura("");
  };

  // PANTALLA DE BLOQUEO (PIN)
  if (!isAuthenticated) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 p-6">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-xs text-center">
          <h1 className="text-2xl font-black mb-6 text-slate-800">🔐 PRIVADO</h1>
          <form onSubmit={manejarLogin}>
            <input 
              type="password" 
              inputMode="numeric"
              pattern="[0-9]*"
              className={`w-full text-center text-3xl letter-spacing-widest border-2 p-3 rounded-xl mb-4 outline-none transition-colors ${error ? 'border-red-500 animate-bounce' : 'border-gray-200 focus:border-blue-500'}`}
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
            />
            {error && <p className="text-red-500 text-sm mb-4">PIN incorrecto</p>}
            <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold active:scale-95 transition-transform">
              ACCEDER
            </button>
          </form>
        </div>
      </div>
    );
  }

  // APP PRINCIPAL
  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-10">
      <header className="p-4 bg-white shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <h1 className="font-black text-xl text-blue-600">MIS FACTURAS</h1>
        <button onClick={() => setIsAuthenticated(false)} className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-500">Bloquear</button>
      </header>

      <div className="p-4">
        <form onSubmit={guardar} className="flex gap-2 mb-6">
          <input 
            type="text" 
            className="flex-1 border p-4 rounded-2xl shadow-sm outline-none focus:border-blue-500 text-lg"
            placeholder="Concepto..."
            value={factura}
            onChange={(e) => setFactura(e.target.value)}
          />
          <button className="bg-blue-600 text-white w-14 h-14 rounded-2xl text-2xl shadow-lg active:scale-90 transition-transform">＋</button>
        </form>

        <div className="space-y-3">
          {listaFacturas.map((f) => (
            <div key={f.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <p className="font-bold text-gray-800">{f.nombre}</p>
                <p className="text-xs text-gray-400">{f.fecha}</p>
              </div>
              <button onClick={() => remove(ref(realtimeDb, `facturas/${f.id}`))} className="text-gray-200 hover:text-red-400 p-2 text-xl">✕</button>
            </div>
          ))}
          {listaFacturas.length === 0 && <p className="text-center text-gray-400 mt-10">Lista vacía</p>}
        </div>
      </div>
    </div>
  );
}

export default App;