// Consulta de sedes registradas en Cloud Firestore (colección "sedes").
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { db } from '../firebaseConfig.js'
import { normalizarDetalle, normalizarSede } from './sedesUtils.js'

// Con VITE_SEDES_DEMO=true en tu .env se usan datos de ejemplo,
// útil mientras todavía no hay sedes cargadas en Firestore.
const USAR_DEMO = import.meta.env.VITE_SEDES_DEMO === 'true'
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

const SEDES_DEMO = [
  { id: 'demo-1', nombre: 'Sede Reforma', direccion: 'Av. Paseo de la Reforma 250', lat: 19.427, lng: -99.1677, espaciosTotales: 120, espaciosDisponibles: 34, tarifaHora: 40, horario: '06:00 – 23:00' },
  { id: 'demo-2', nombre: 'Sede Alameda', direccion: 'Av. Juárez 70', lat: 19.4352, lng: -99.1412, espaciosTotales: 80, espaciosDisponibles: 6, tarifaHora: 35, horario: '07:00 – 22:00' },
  { id: 'demo-3', nombre: 'Sede Zócalo', direccion: 'Calle 5 de Febrero 12', lat: 19.4326, lng: -99.1332, espaciosTotales: 60, espaciosDisponibles: 0, tarifaHora: 30, horario: '07:00 – 21:00' },
  { id: 'demo-4', nombre: 'Sede Polanco', direccion: 'Av. Presidente Masaryk 360', lat: 19.4338, lng: -99.195, espaciosTotales: 150, espaciosDisponibles: 72, tarifaHora: 55, horario: '24 horas' },
  { id: 'demo-5', nombre: 'Sede Chapultepec', direccion: 'Calzada Mahatma Gandhi s/n', lat: 19.4204, lng: -99.1819, espaciosTotales: 200, espaciosDisponibles: 118, tarifaHora: 25, horario: '06:00 – 20:00' },
]

// Campos extra que, en producción, viven en el mismo documento de la sede.
const DETALLES_DEMO = {
  'demo-1': {
    referencia: 'Frente al Ángel de la Independencia',
    telefono: '5555550101',
    horarios: { lunes: '06:00 – 23:00', martes: '06:00 – 23:00', miércoles: '06:00 – 23:00', jueves: '06:00 – 23:00', viernes: '06:00 – 23:00', sábado: '07:00 – 23:00', domingo: '08:00 – 20:00' },
    tarifas: { hora: 40, fraccion: 12, diaCompleto: 260, mensual: 2200 },
    reglas: ['Altura máxima de 2.10 m.', 'Conserva tu boleto; el boleto perdido tiene un costo de $150.', 'No se permite pernoctar sin pensión nocturna.'],
    servicios: ['Vigilancia 24 h', 'Techado', 'Acceso para personas con discapacidad'],
  },
  'demo-2': {
    referencia: 'A una cuadra del Palacio de Bellas Artes',
    horarios: { 'lunes a viernes': '07:00 – 22:00', sábado: '08:00 – 22:00' },
    tarifas: { hora: 35, diaCompleto: 220 },
    reglas: ['Altura máxima de 1.90 m.', 'Pago en caja antes de recoger el vehículo.'],
    servicios: ['Vigilancia', 'Pago con tarjeta'],
  },
  'demo-3': {
    reglas: ['No se aceptan vehículos de carga.', 'Horario de salida hasta las 21:00.'],
  },
  'demo-4': {
    referencia: 'Entrada por Av. Presidente Masaryk',
    telefono: '5555550104',
    tarifas: { hora: 55, noche: 180, mensual: 3200 },
    reglas: ['Servicio de valet disponible.', 'Altura máxima de 2.00 m.'],
    servicios: ['Abierto 24 h', 'Carga para autos eléctricos', 'Valet parking'],
  },
}

export async function obtenerSedes() {
  if (USAR_DEMO) {
    await esperar(500)
    return SEDES_DEMO
  }

  try {
    const snapshot = await getDocs(collection(db, 'sedes'))
    return snapshot.docs.map((d) => normalizarSede(d.id, d.data()))
  } catch (error) {
    console.error('Error al consultar las sedes:', error.code, error.message)
    if (error.code === 'permission-denied') {
      throw new Error('No tienes permiso para ver las sedes. Inicia sesión e inténtalo de nuevo.')
    }
    throw new Error('No se pudieron cargar las sedes. Revisa tu conexión e inténtalo de nuevo.')
  }
}

/** Tarea 026: carga los detalles de UNA sede (se llama al seleccionarla). */
export async function obtenerDetalleSede(id) {
  if (USAR_DEMO) {
    await esperar(400)
    const base = SEDES_DEMO.find((s) => s.id === id) ?? {}
    return normalizarDetalle({ ...base, ...DETALLES_DEMO[id] })
  }

  let snapshot
  try {
    snapshot = await getDoc(doc(db, 'sedes', id))
  } catch (error) {
    console.error('Error al consultar el detalle de la sede:', error.code, error.message)
    if (error.code === 'permission-denied') {
      throw new Error('No tienes permiso para ver esta sede. Inicia sesión e inténtalo de nuevo.')
    }
    throw new Error('No se pudo cargar la información de la sede. Revisa tu conexión e inténtalo de nuevo.')
  }

  if (!snapshot.exists()) throw new Error('Esta sede ya no está disponible.')
  return normalizarDetalle(snapshot.data())
}
