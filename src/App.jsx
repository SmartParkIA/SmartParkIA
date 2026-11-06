import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Suspense, lazy, useEffect, useState } from "react";
import {
  HashRouter,
  Navigate,
  Route,
  Routes
} from "react-router-dom";

import AsistenteVirtual from "./components/AsistenteVirtual.jsx";
import Layout from "./components/layout.jsx";
import Login from "./components/login.jsx";

import { auth, db } from "./firebase/config.js";

// ==========================================
// CARGA DE COMPONENTES
// ==========================================

const Reservas = lazy(() => import("./components/Reservas.jsx"));
const Registro = lazy(() => import("./components/Registro.jsx"));
const Perfil = lazy(() => import("./components/Perfil.jsx"));

const RecuperarContrasena = lazy(() =>
  import("./components/RecuperarContrasena.jsx")
);

const VerReserva = lazy(() =>
  import("./components/VerReserva.jsx")
);

const Historial = lazy(() =>
  import("./components/Historial.jsx")
);

const Estacionamientos = lazy(() =>
  import("./components/Estacionamientos.jsx")
);

const MapaEstacionamiento = lazy(() =>
  import("./components/MapaEstacionamiento.jsx")
);

const Admin = lazy(() =>
  import("./components/Admin.jsx")
);


// ==========================================
// COMPONENTE PARA PROTEGER RUTAS
// ==========================================

function RutaProtegida({ children, allowedRole }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const snap = await getDoc(
            doc(db, "users", currentUser.uid)
          );

          if (snap.exists()) {
            setUserData(snap.data());
          } else {
            setUserData(null);
          }

        } catch (error) {
          console.error(
            "Error obteniendo datos del usuario:",
            error
          );
          setUserData(null);
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          color: "#00f2fe",
          textAlign: "center",
          padding: 40
        }}
      >
        Verificando permisos...
      </div>
    );
  }

  // Verificar autenticación y correo
  if (!user || !user.emailVerified) {
    return <Navigate to="/login" replace />;
  }

  // Verificar rol
  if (allowedRole && userData?.rol !== allowedRole) {
    return <Navigate to="/perfil" replace />;
  }

  return children;
}


// ==========================================
// ASISTENTE VIRTUAL EXCLUSIVO PARA USUARIOS
// ==========================================

function AsistenteUsuario() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser && currentUser.emailVerified) {
        try {
          const snap = await getDoc(
            doc(db, "users", currentUser.uid)
          );

          if (snap.exists()) {
            setUserData(snap.data());
          } else {
            setUserData(null);
          }

        } catch (error) {
          console.error(
            "Error verificando el rol del asistente:",
            error
          );

          setUserData(null);
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Esperar a verificar la sesión
  if (loading) return null;

  // No mostrar si no está autenticado
  if (!user || !user.emailVerified) return null;

  // Mostrar exclusivamente a usuarios normales
  if (userData?.rol !== "usuario") return null;

  return <AsistenteVirtual />;
}


// ==========================================
// COMPONENTE PRINCIPAL APP
// ==========================================

function App() {
  return (
    <HashRouter>

      <Suspense
        fallback={
          <div
            style={{
              color: "#00f2fe",
              textAlign: "center",
              padding: 40
            }}
          >
            Cargando...
          </div>
        }
      >

        <Routes>

          {/* =================================
              RUTAS PÚBLICAS
          ================================= */}

          <Route
            path="/"
            element={<Login />}
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/registro"
            element={<Registro />}
          />

          <Route
            path="/recuperar-contrasena"
            element={<RecuperarContrasena />}
          />


          {/* =================================
              RUTAS PROTEGIDAS CON LAYOUT
          ================================= */}

          <Route element={<Layout />}>

            {/* USUARIOS AUTENTICADOS */}

            <Route
              path="/perfil"
              element={
                <RutaProtegida>
                  <Perfil />
                </RutaProtegida>
              }
            />


            {/* =================================
                RUTAS PARA USUARIOS NORMALES
            ================================= */}

            <Route
              path="/reservar"
              element={
                <RutaProtegida allowedRole="usuario">
                  <Reservas />
                </RutaProtegida>
              }
            />

            <Route
              path="/reservas"
              element={
                <RutaProtegida allowedRole="usuario">
                  <VerReserva />
                </RutaProtegida>
              }
            />

            <Route
              path="/historial"
              element={
                <RutaProtegida allowedRole="usuario">
                  <Historial />
                </RutaProtegida>
              }
            />

            <Route
              path="/estacionamientos"
              element={
                <RutaProtegida allowedRole="usuario">
                  <Estacionamientos />
                </RutaProtegida>
              }
            />

            <Route
              path="/mapa-estacionamiento/:id"
              element={
                <RutaProtegida allowedRole="usuario">
                  <MapaEstacionamiento />
                </RutaProtegida>
              }
            />


            {/* =================================
                RUTAS PARA ADMINISTRADORES
            ================================= */}

            <Route
              path="/admin"
              element={
                <RutaProtegida allowedRole="admin">
                  <Admin />
                </RutaProtegida>
              }
            />

          </Route>


          {/* =================================
              RUTA NO ENCONTRADA
          ================================= */}

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />

        </Routes>


        {/* =================================
            ASISTENTE VIRTUAL GLOBAL
            EXCLUSIVO PARA USUARIOS
        ================================= */}

        <AsistenteUsuario />

      </Suspense>

    </HashRouter>
  );
}

export default App;