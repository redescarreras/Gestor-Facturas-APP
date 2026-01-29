import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database"; 

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT_ID.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROJECT_ID.appspot.com",
  messagingSenderId: "TU_NUMERO",
  appId: "TU_APP_ID",
  // La URL de Realtime Database (la ves en la consola de Firebase)
  databaseURL: "https://TU_PROJECT_ID-default-rtdb.firebaseio.com" 
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar los servicios que necesitas
export const db = getFirestore(app);         // Firestore
export const auth = getAuth(app);            // Autenticación
export const googleProvider = new GoogleAuthProvider();
export const realtimeDb = getDatabase(app);  // Realtime Database