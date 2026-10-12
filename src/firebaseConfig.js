import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAJVPRi2rCtqhOfM_d31ZfrFDl43JDAXME",
  authDomain: "smartpark-ia.firebaseapp.com",
  projectId: "smartpark-ia",
  storageBucket: "smartpark-ia.firebasestorage.app",
  messagingSenderId: "118354121865",
  appId: "1:118354121865:web:c53be199d438c4a4106258",
  measurementId: "G-6P0E8XNVHF"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);

// Prueba de conexión
console.log("Firebase inicializado correctamente para el proyecto:", app.options.projectId);