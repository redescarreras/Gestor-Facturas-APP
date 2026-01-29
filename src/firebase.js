import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// 1. AÑADE ESTE IMPORT:
import { getDatabase } from "firebase/database"; 

// --- TUS CLAVES DE FIREBASE ---
// Mantén las que ya tenías. 
// NOTA: Ve a la consola de Firebase > Configuración del Proyecto.
// Si ves una línea nueva que dice "databaseURL", añádela aquí abajo.
const firebaseConfig = {
  apiKey: "TU_API_KEY_ACTUAL",
  authDomain: "TU_PROJECT_ID.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROJECT_ID.appspot.com",
  messagingSenderId: "TU_NUMERO",
  appId: "TU_APP_ID",
  // databaseURL: "https://....firebasedatabase.app" // <--- AÑÁDELA SI LA TIENES EN LA CONSOLA
};

const app = initializeApp(firebaseConfig);

// Base de datos principal (la que usas ahora)
const db = getFirestore(app);

// Autenticación
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// 2. INICIALIZA LA REALTIME DATABASE:
const realtimeDb = getDatabase(app); 

// 3. AÑADE 'realtimeDb' AL EXPORT FINAL:
export { db, auth, googleProvider, realtimeDb };