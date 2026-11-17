import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore"; 
import { Suspense, lazy, useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { auth, db } from './firebase/config.js'; 

import Login from './components/login.jsx';
const Registro = lazy(() => import('./components/Registro.jsx'));
const RecuperarContrasena = lazy(() => import('./components/RecuperarContrasena.jsx'));
import Layout from './components/layout.jsx';

const Perfil = lazy(() => import('./components/Perfil.jsx')); 
const VehiculoForm = lazy(() => import('./components/VehiculoForm.jsx')); 
const Reservas = lazy(() => import('./components/Reservas.jsx'));
const VerReserva = lazy(() => import('./components/VerReserva.jsx'));
const Historial = lazy(() => import('./components/Historial.jsx'));
const Estacionamientos = lazy(() => import('./components/Estacionamientos.jsx'));
const MapaEstacionamiento = lazy(() => import('./components/MapaEstacionamiento.jsx'));
const Disponibilidad = lazy(() => import('./pages/Disponibilidad.jsx'));
const RegistrarEstacionamiento = lazy(() => import('./pages/RegistrarEstacionamiento.jsx'));
const HistorialOcupacion = lazy(() => import('./pages/HistorialOcupacion.jsx'));
const Admin = lazy(() => import('./components/Admin.jsx'));
const Finanzas = lazy(() => import('./components/Finanzas.jsx'));
const CrudEstacionamiento = lazy(() => import('./components/crudestacionamineto.jsx'));

function RutaProtegida({ children, allowedRole }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc = null;
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        unsubDoc = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
          setLoading(false);
        });
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  if (loading) return <div style={{ color: '#00f2fe', textAlign: 'center', padding: 40 }}>Verificando...</div>;
  if (!user || !user.emailVerified) return <Navigate to="/login" replace />;
  
  // Validación dual (por si Firebase devuelve string)
  if (userData?.estado === false || String(userData?.estado).toLowerCase() === "false") {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && userData?.rol !== allowedRole) return <Navigate to="/perfil" replace />;
  
  return children;
}

function App() {
  return (
    <HashRouter>
      <Suspense fallback={<div style={{ color: '#00f2fe', textAlign: 'center', padding: 40 }}>Cargando...</div>}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />

          <Route element={<Layout />}>
            <Route path="/perfil" element={<RutaProtegida><Perfil /></RutaProtegida>} />
            
            <Route path="/mis-vehiculos" element={<RutaProtegida allowedRole="usuario"><VehiculoForm /></RutaProtegida>} />
            <Route path="/reservar" element={<RutaProtegida allowedRole="usuario"><Reservas /></RutaProtegida>} />
            <Route path="/reservas" element={<RutaProtegida allowedRole="usuario"><VerReserva /></RutaProtegida>} />
            <Route path="/historial" element={<RutaProtegida allowedRole="usuario"><Historial /></RutaProtegida>} />
            <Route path="/estacionamientos" element={<RutaProtegida allowedRole="usuario"><Estacionamientos /></RutaProtegida>} />
            <Route path="/disponibilidad" element={<RutaProtegida allowedRole="usuario"><Disponibilidad /></RutaProtegida>} />
            <Route path="/mapa-estacionamiento/:id" element={<RutaProtegida allowedRole="usuario"><MapaEstacionamiento /></RutaProtegida>} />

            <Route path="/admin" element={<RutaProtegida allowedRole="admin"><Admin /></RutaProtegida>} />
            <Route path="/finanzas" element={<RutaProtegida allowedRole="admin"><Finanzas /></RutaProtegida>} />
            <Route path="/registrar-estacionamiento" element={<RutaProtegida allowedRole="admin"><RegistrarEstacionamiento /></RutaProtegida>} />
            <Route path="/historial-ocupacion" element={<RutaProtegida allowedRole="admin"><HistorialOcupacion /></RutaProtegida>} />
            <Route path="/crud-estacionamiento" element={<RutaProtegida allowedRole="admin"><CrudEstacionamiento /></RutaProtegida>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

export default App;