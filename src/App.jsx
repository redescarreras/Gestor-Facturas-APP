import React, { useState, useEffect } from 'react';
import { auth, googleProvider, realtimeDb } from './firebase'; 
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { ref, push, onValue, remove } from "firebase/database";

function App() {
  const [user, setUser] = useState(null);
  const [factura, setFactura] = useState("");
  const [listaFacturas, setListaFacturas] = useState([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const facturasRef = ref(realtimeDb, 'facturas');
        // Escuchador en tiempo real
        const unsubscribeDb = onValue(facturasRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const lista = Object.keys(data).map(id => ({
              id: id,
              ...data[id]
            }));
            setListaFacturas(lista.reverse()); // Lo más nuevo arriba
          } else {
            setListaFacturas([]);
          }
        });
        return () => unsubscribeDb();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  const guardarFactura = (e) => {
    e.preventDefault();
    if (!factura || !user) return;
    const facturasRef = ref(realtimeDb, 'facturas');
    push(facturasRef, {
      nombre: factura,
      fecha: new Date().toLocaleString(),
      usuario: user.displayName,
      uid: user.uid
    });
    setFactura("");
  };

  const eliminarFactura = (id) => {
    const itemRef = ref(realtimeDb, `facturas/${id}`);
    remove(itemRef);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Acceso Privado</h1>
        <button onClick={login} className="bg-white border p-3 rounded-lg shadow flex items-center gap-2 hover:bg-gray-100">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="G" />
          Entrar con Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-md mx-auto">
        <header className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm">
          <span className="font-bold text-gray-600">v1.0.1</span>
          <button onClick={logout} className="text-red-500 text-sm">Salir</button>
        </header>

        <form onSubmit={guardarFactura} className="mb-8">
          <div className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 border p-3 rounded-lg shadow-inner outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nueva factura..."
              value={factura}
              onChange={(e) => setFactura(e.target.value)}
            />
            <button className="bg-blue-600 text-white p-3 rounded-lg font-bold">＋</button>
          </div>
        </form>

        <div className="space-y-3">
          {listaFacturas.map((f) => (
            <div key={f.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center animate-in fade-in duration-500">
              <div>
                <p className="font-bold">{f.nombre}</p>
                <p className="text-xs text-gray-400">{f.fecha}</p>
              </div>
              <button onClick={() => eliminarFactura(f.id)} className="text-gray-300 hover:text-red-500">✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;