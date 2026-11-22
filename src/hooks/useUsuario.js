import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebaseConfig.js'

const USAR_DEMO = import.meta.env.VITE_SEDES_DEMO === 'true'
const USUARIO_DEMO = { uid: 'demo-user', email: 'demo@smartpark.test' }

/**
 * Devuelve el usuario con sesión iniciada en Firebase Auth.
 * `cargando` es true mientras Firebase revisa si hay una sesión guardada.
 * Con VITE_SEDES_DEMO=true devuelve un usuario de prueba.
 */
export function useUsuario() {
  const [estado, setEstado] = useState(
    USAR_DEMO ? { usuario: USUARIO_DEMO, cargando: false } : { usuario: null, cargando: true },
  )

  useEffect(() => {
    if (USAR_DEMO) return undefined
    return onAuthStateChanged(auth, (usuario) => setEstado({ usuario, cargando: false }))
  }, [])

  return estado
}