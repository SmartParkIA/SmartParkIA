// Funciones puras (sin Firebase) para poder probarlas fácilmente.

/** Convierte un documento de Firestore en el formato que usa la interfaz. */
export function normalizarSede(id, data = {}) {
  // Acepta `ubicacion` (GeoPoint de Firestore) o campos `lat` y `lng`.
  const lat = data.ubicacion?.latitude ?? data.lat ?? data.latitud
  const lng = data.ubicacion?.longitude ?? data.lng ?? data.longitud

  return {
    id,
    nombre: data.nombre ?? 'Sede sin nombre',
    direccion: data.direccion ?? '',
    lat: lat == null ? NaN : Number(lat),
    lng: lng == null ? NaN : Number(lng),
    espaciosTotales: Number(data.espaciosTotales ?? data.capacidad ?? 0),
    espaciosDisponibles: Number(data.espaciosDisponibles ?? data.disponibles ?? 0),
    tarifaHora: Number(data.tarifaHora ?? data.tarifa ?? 0),
    horario: data.horario ?? '',
  }
}

export function tieneUbicacion(sede) {
  return Number.isFinite(sede.lat) && Number.isFinite(sede.lng)
}

/** 'lleno' sin lugares, 'pocos' con menos del 20% libre, 'libre' en otro caso. */
export function estadoDeSede({ espaciosDisponibles, espaciosTotales }) {
  if (espaciosDisponibles <= 0) return 'lleno'
  if (espaciosDisponibles / espaciosTotales < 0.2) return 'pocos'
  return 'libre'
}

export function filtrarSedes(sedes, { busqueda = '', soloDisponibles = false } = {}) {
  const q = busqueda.trim().toLowerCase()
  return sedes.filter(
    (s) =>
      (!soloDisponibles || s.espaciosDisponibles > 0) &&
      (!q || `${s.nombre} ${s.direccion}`.toLowerCase().includes(q)),
  )
}

// ---------------------------------------------------------------------------
// Detalle de una sede (horarios, precios, reglas...) y enlace "Cómo llegar"
// ---------------------------------------------------------------------------

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

const ETIQUETAS_TARIFA = {
  hora: 'Por hora',
  fraccion: 'Fracción',
  diaCompleto: 'Día completo',
  noche: 'Pensión nocturna',
  mensual: 'Mensual',
}

const sinAcentos = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1)
const texto = (valor) => String(valor ?? '').trim()

/** Posición del primer día de la semana mencionado ('lunes a viernes' -> 0). */
function posicionDia(clave) {
  const k = sinAcentos(clave)
  const i = DIAS.findIndex((d) => k.startsWith(sinAcentos(d)))
  return i === -1 ? DIAS.length : i
}

/** Acepta una lista o un texto con saltos de línea y devuelve una lista limpia. */
function comoLista(valor) {
  const items = Array.isArray(valor) ? valor : typeof valor === 'string' ? valor.split(/\r?\n/) : []
  return items.map(texto).filter(Boolean)
}

function normalizarHorarios(data) {
  const { horarios } = data
  if (horarios && typeof horarios === 'object' && Object.keys(horarios).length) {
    return Object.entries(horarios)
      .map(([dia, horas], orden) => ({ dia: capitalizar(texto(dia)), horas: texto(horas), orden }))
      .filter((h) => h.dia && h.horas)
      .sort((a, b) => posicionDia(a.dia) - posicionDia(b.dia) || a.orden - b.orden)
      .map(({ dia, horas }) => ({ dia, horas }))
  }
  const horario = texto(data.horario)
  return horario ? [{ dia: 'Todos los días', horas: horario }] : []
}

const esMonto = (v) => v != null && v !== '' && Number.isFinite(Number(v))

function normalizarTarifas(data) {
  const { tarifas } = data
  if (tarifas && typeof tarifas === 'object' && Object.keys(tarifas).length) {
    const claves = Object.keys(tarifas)
    const orden = (k) => {
      const i = Object.keys(ETIQUETAS_TARIFA).indexOf(k)
      return i === -1 ? Number.MAX_SAFE_INTEGER : i
    }
    return claves
      .filter((k) => esMonto(tarifas[k]))
      .sort((a, b) => orden(a) - orden(b))
      .map((k) => ({ concepto: ETIQUETAS_TARIFA[k] ?? capitalizar(k), monto: Number(tarifas[k]) }))
  }
  return esMonto(data.tarifaHora) && Number(data.tarifaHora) > 0
    ? [{ concepto: ETIQUETAS_TARIFA.hora, monto: Number(data.tarifaHora) }]
    : []
}

/** Convierte los campos extra del documento de una sede en listas listas para mostrar. */
export function normalizarDetalle(data = {}) {
  return {
    referencia: texto(data.referencia),
    telefono: texto(data.telefono),
    horarios: normalizarHorarios(data),
    tarifas: normalizarTarifas(data),
    reglas: comoLista(data.reglas),
    servicios: comoLista(data.servicios),
  }
}

/** Enlace de Google Maps para llegar a la sede: coordenadas, o dirección si no hay. */
export function urlComoLlegar(sede) {
  const base = 'https://www.google.com/maps/dir/?api=1&destination='
  if (tieneUbicacion(sede)) return `${base}${sede.lat},${sede.lng}`
  const direccion = texto(sede.direccion)
  return direccion ? `${base}${encodeURIComponent(direccion)}` : null
}
