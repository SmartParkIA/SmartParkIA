import { Suspense, lazy, useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from './firebase/config.js';
import AsistenteVirtual from './components/AsistenteVirtual';

// Páginas públicas
import Login from './components/login.jsx';
const Registro = lazy(() => import('./components/Registro.jsx'));
const RecuperarContrasena = lazy(() => import('./components/RecuperarContrasena.jsx'));
const Ticket = lazy(() => import('./components/Ticket.jsx'));   // 🆕 Página del QR

// Layout
import Layout from './components/layout.jsx';

// Páginas privadas
const Perfil = lazy(() => import('./components/Perfil.jsx')); 
const VehiculoForm = lazy(() => import('./components/VehiculoForm.jsx')); 
const Reservas = lazy(() => import('./components/Reservas.jsx'));
const VerReserva = lazy(() => import('./components/VerReserva.jsx'));
const Historial = lazy(() => import('./components/Historial.jsx'));
const Estacionamientos = lazy(() => import('./components/Estacionamientos.jsx'));
const MapaEstacionamiento = lazy(() => import('./components/MapaEstacionamiento.jsx'));
const Disponibilidad = lazy(() => import('./pages/Disponibilidad.jsx'));
const RegistrarEstacionamiento = lazy(() => import('./pages/RegistrarEstacionamiento.jsx'));
const Admin = lazy(() => import('./components/Admin.jsx'));

// NUEVO: Importamos la página de Finanzas
const Finanzas = lazy(() => import('./components/Finanzas.jsx'));
const descargarArchivo=lazy(()=>import("./components/descargarArchivo.jsx"))
// Protector de rutas
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

  if (loading) return <div style={{ color: '#00f2fe', textAlign: 'center', padding: 40 }}>Verificando...</div>;
  if (!user || !user.emailVerified) return <Navigate to="/login" replace />;
  if (allowedRole && userData?.rol !== allowedRole) return <Navigate to="/perfil" replace />;
  
  return children;
}

function App() {
  return (
    <HashRouter>
      <Suspense fallback={<div style={{ color: '#00f2fe', textAlign: 'center', padding: 40 }}>Cargando...</div>}>
        <Routes>
          {/* RUTAS PÚBLICAS */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />

          {/* 🆕 RUTA PÚBLICA DEL TICKET (QR) */}
          <Route path="/ticket" element={<Ticket />} />

          {/* RUTAS PRIVADAS */}
          <Route element={<Layout />}>
            
            <Route path="/perfil" element={<RutaProtegida><Perfil /></RutaProtegida>} />
            <Route path="/mis-vehiculos" element={<RutaProtegida allowedRole="usuario"><VehiculoForm /></RutaProtegida>} />
            
            <Route path="/reservar" element={<RutaProtegida allowedRole="usuario"><Reservas /></RutaProtegida>} />
            <Route path="/reservas" element={<RutaProtegida allowedRole="usuario"><VerReserva /></RutaProtegida>} />
            <Route path="/historial" element={<RutaProtegida allowedRole="usuario"><Historial /></RutaProtegida>} />
            <Route path="/estacionamientos" element={<RutaProtegida allowedRole="usuario"><Estacionamientos /></RutaProtegida>} />
            <Route path="/disponibilidad" element={<RutaProtegida allowedRole="usuario"><Disponibilidad /></RutaProtegida>} />
            <Route path="/mapa-estacionamiento/:id" element={<RutaProtegida allowedRole="usuario"><MapaEstacionamiento /></RutaProtegida>} />

            {/* RUTA DE ADMIN (Limpia, sin el Dashboard) */}
            <Route path="/admin" element={<RutaProtegida allowedRole="admin"><Admin /></RutaProtegida>} />
            
            {/* NUEVA RUTA DE FINANZAS */}
            <Route path="/finanzas" element={<RutaProtegida allowedRole="admin"><Finanzas /></RutaProtegida>} />

            <Route path="/registrar-estacionamiento" element={<RutaProtegida allowedRole="admin"><RegistrarEstacionamiento /></RutaProtegida>} />
            
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {/* ⬇️⬇️ El asistente va AQUÍ, FUERA de Routes pero DENTRO de HashRouter */}
      <AsistenteVirtual />
    </HashRouter>
  )
}

export default App;