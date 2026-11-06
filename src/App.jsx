import { Suspense, lazy } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/login.jsx'

const ReservarEspacio = lazy(() => import('./components/ReservarEspacio.jsx'))
const Registro        = lazy(() => import('./components/Registro.jsx'))

// Descomenta cuando crees esos archivos:
 const Perfil              = lazy(() => import('./components/Perfil.jsx'))
 const RecuperarContrasena = lazy(() => import('./components/RecuperarContrasena.jsx'))

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
          <Route path="/"         element={<Login />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/reservar" element={<ReservarEspacio />} />

          {/* Descomenta cuando existan: */}
          {<Route path="/perfil"              element={<Perfil />} /> }
          { <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} /> }

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

export default App