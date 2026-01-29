import React, { useState, useEffect } from 'react';
import { realtimeDb } from './firebase'; 
import { ref, push, onValue, remove } from "firebase/database";

function App() {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [factura, setFactura] = useState("");
  const [listaFacturas, setListaFacturas] = useState([]);
  const [error, setError] = useState(false);

  const PIN_CORRECTO = "1482"; 

  useEffect(() => {
    if (isAuthenticated) {
      const facturasRef = ref(realtimeDb, 'facturas');
      const unsubscribe = onValue(facturasRef, (snapshot) => {
        const data = snapshot.val();
        const tempLista = data ? Object.values(data) : [];
        setListaFacturas(tempLista);
      });
      return () => unsubscribe();
    }
  }, [isAuthenticated]);

  const manejarLogin = (e) => {
    e.preventDefault();
    if (pin === PIN_CORRECTO) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPin("");
    }
  };

  const guardarFactura = (e) => {
    e.preventDefault();
    if (!factura) return;
    
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const facturasRef = ref(realtimeDb, 'facturas');
    push(facturasRef, {
      nombre: factura,
      fecha: new Date().toLocaleString()
    });
    setFactura("");
  };

  // PANTALLA DE PIN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded shadow-md w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-4 text-center">Acceso Privado</h1>
          <form onSubmit={manejarLogin}>
            <input 
              type="password" 
              inputMode="numeric"
              className={`border p-2 w-full rounded mb-4 text-center text-2xl ${error ? 'border-red-500' : ''}`}
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
            />
            <button className="bg-blue-500 text-white px-4 py-2 rounded w-full hover:bg-blue-600 font-bold">
              ENTRAR
            </button>
          </form>
        </div>
      </div>
    );
  }

  // TU APP ORIGINAL
  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-md flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-600">Mi Gestor de Facturas</h1>
        <button onClick={() => setIsAuthenticated(false)} className="text-sm text-gray-500 underline">Cerrar</button>
      </div>
      
      <form onSubmit={guardarFactura} className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <input 
          type="text" 
          placeholder="Concepto de factura..." 
          className="border p-2 w-full rounded mb-4"
          value={factura}
          onChange={(e) => setFactura(e.target.value)}
        />
        <button className="bg-blue-500 text-white px-4 py-2 rounded w-full hover:bg-blue-600">
          Guardar Factura
        </button>
      </form>

      <div className="mt-8 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Facturas Guardadas:</h2>
        <ul className="space-y-2">
          {listaFacturas.map((f, index) => (
            <li key={index} className="bg-white p-3 rounded shadow-sm border-l-4 border-blue-500 flex justify-between">
              <span>{f.nombre} - <span className="text-gray-400 text-sm">{f.fecha}</span></span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;