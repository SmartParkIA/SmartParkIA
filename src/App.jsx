import { Suspense, lazy } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login.jsx'

const Reservas            = lazy(() => import('./components/Reservas.jsx'))
const Registro            = lazy(() => import('./components/Registro.jsx'))
const Perfil              = lazy(() => import('./components/Perfil.jsx'))
const RecuperarContrasena = lazy(() => import('./components/RecuperarContrasena.jsx'))
const VerReserva          = lazy(() => import('./components/VerReserva.jsx'))
 const Historial          = lazy(() => import('./components/Historial.jsx'))
// Descomenta cuando conviertas el mapa:
// const Mapa = lazy(() => import('./components/Mapa.jsx'))

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
          <Route path="/"                     element={<Login />} />
          <Route path="/login"                element={<Login />} />
          <Route path="/registro"             element={<Registro />} />
          <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
 <Route path="/reservar"             element={<Reservas />} />
          <Route path="/perfil"               element={<Perfil />} />
          <Route path="/VerReserva"             element={<VerReserva />} />
 <Route path="/Historial"             element={<Historial />} />
          {/* <Route path="/mapa" element={<Mapa />} /> */}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

export default App