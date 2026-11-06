import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Suspense, lazy, useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout.jsx';
import Login from './components/login.jsx';
import { auth, db } from './firebase/config.js';

const Reservas            = lazy(() => import('./components/Reservas.jsx'));
const Registro            = lazy(() => import('./components/Registro.jsx'));
const Perfil              = lazy(() => import('./components/Perfil.jsx'));
const RecuperarContrasena = lazy(() => import('./components/RecuperarContrasena.jsx'));
const VerReserva          = lazy(() => import('./components/VerReserva.jsx'));
const Historial           = lazy(() => import('./components/Historial.jsx'));
const Estacionamientos    = lazy(() => import('./components/Estacionamientos.jsx'));
const MapaEstacionamiento = lazy(() => import('./components/MapaEstacionamiento.jsx'));
const Admin               = lazy(() => import('./components/Admin.jsx')); // Asegúrate de tener este componente

// --- COMPONENTE PARA PROTEGER RUTAS SEGÚN EL ROL ---
function RutaProtegida({ children, allowedRole }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists()) setUserData(snap.data());
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <div style={{ color: '#00f2fe', textAlign: 'center', padding: 40 }}>Verificando permisos...</div>;

  // Si no hay usuario o no ha verificado el correo, lo mandamos al login
  if (!user || !user.emailVerified) {
    return <Navigate to="/login" replace />;
  }

  // Si la ruta requiere un rol específico y el usuario no lo tiene, lo mandamos al perfil
  if (allowedRole && userData?.rol !== allowedRole) {
    return <Navigate to="/perfil" replace />;
  }

  return children;
}

function App() {
  return (
    <HashRouter>
      <Suspense fallback={<div style={{ color: '#00f2fe', textAlign: 'center', padding: 40 }}>Cargando...</div>}>
        <Routes>
          {/* RUTAS PÚBLICAS */}
          <Route path="/"                     element={<Login />} />
          <Route path="/login"                element={<Login />} />
          <Route path="/registro"             element={<Registro />} />
          <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />

          {/* RUTAS PROTEGIDAS CON EL LAYOUT */}
          <Route element={<Layout />}>
            
            {/* Rutas para TODOS los usuarios logueados */}
            <Route path="/perfil"               element={<RutaProtegida><Perfil /></RutaProtegida>} />
            
            {/* Rutas SOLO para USUARIOS NORMALES */}
            <Route path="/reservar"             element={<RutaProtegida><Reservas /></RutaProtegida>} />
            <Route path="/reservas"             element={<RutaProtegida><VerReserva /></RutaProtegida>} />
            <Route path="/historial"            element={<RutaProtegida><Historial /></RutaProtegida>} />
            <Route path="/estacionamientos"     element={<RutaProtegida><Estacionamientos /></RutaProtegida>} />
            <Route path="/mapa-estacionamiento/:id" element={<RutaProtegida><MapaEstacionamiento /></RutaProtegida>} />
            
            {/* Rutas SOLO para ADMINISTRADORES (allowedRole="admin") */}
            <Route path="/admin" element={<RutaProtegida allowedRole="admin"><Admin /></RutaProtegida>} />
            
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

export default App