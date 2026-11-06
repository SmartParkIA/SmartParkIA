import { Suspense, lazy } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login.jsx'

const AsistenteVirtual            = lazy(() => import('./components/AsistenteVirtual.jsx'))
const Reservas            = lazy(() => import('./components/Reservas.jsx'))
const Registro            = lazy(() => import('./components/Registro.jsx'))
const Perfil              = lazy(() => import('./components/Perfil.jsx'))
const RecuperarContrasena = lazy(() => import('./components/RecuperarContrasena.jsx'))
const VerReserva          = lazy(() => import('./components/VerReserva.jsx'))
const Historial           = lazy(() => import('./components/Historial.jsx'))
const Estacionamientos    = lazy(() => import('./components/Estacionamientos.jsx'))
const MapaEstacionamiento = lazy(() => import('./components/MapaEstacionamiento.jsx'))

function App() {
  return (
    <HashRouter>
      <Suspense
        fallback={
          <div style={{ color: '#00f2fe', textAlign: 'center', padding: 40 }}>
            Cargando...
          </div>
        }
      >
        <Routes>
          {/* Auth */}
          <Route path="/"                     element={<Login />} />
          <Route path="/login"                element={<Login />} />
          <Route path="/registro"             element={<Registro />} />
          <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />

          {/* App */}
          <Route path="/perfil"               element={<Perfil />} />
          <Route path="/reservar"             element={<Reservas />} />
          <Route path="/VerReserva"             element={<VerReserva />} />
          <Route path="/historial"            element={<Historial />} />
          <Route path="/estacionamientos"     element={<Estacionamientos />} />
 <Route path="/AsistenteVirtual"     element={<AsistenteVirtual />} />
          {/* Mapa: OJO con el :id — es obligatorio */}
          <Route path="/mapa-estacionamiento/:id" element={<MapaEstacionamiento />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

export default App