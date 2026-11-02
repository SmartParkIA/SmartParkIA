import { Suspense, lazy, useEffect, useState } from 'react'
import VerEstacionamientos from './components/VerEstacionamientos.jsx'

// Se carga solo al entrar a #/reservar (así sus estilos globales no afectan a la otra pantalla).
const ReservarEspacio = lazy(() => import('./components/ReservarEspacio.jsx'))

const rutaActual = () => window.location.hash.replace(/^#/, '') || '/'

/**
 * Dos pantallas sin instalar nada extra:
 *   http://localhost:5173/            → ver estacionamientos
 *   http://localhost:5173/#/reservar  → reservar espacio
 */
function App() {
  const [ruta, setRuta] = useState(rutaActual)

  useEffect(() => {
    const alCambiar = () => setRuta(rutaActual())
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  if (ruta.startsWith('/reservar')) {
    return (
      <Suspense fallback={null}>
        <ReservarEspacio />
      </Suspense>
    )
  }
  return <VerEstacionamientos />
}

export default App
