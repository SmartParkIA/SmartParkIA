// Ayudas de la página "Reservar espacio" (sin Firebase, para poder probarlas).

const HORA_MS = 60 * 60 * 1000
const dos = (n) => String(n).padStart(2, '0')

/** Fecha local en formato AAAA-MM-DD, la que usa <input type="date">. */
export const fechaLocal = (d) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`

/** "Cajón #A-12" → "cajon-a-12" (compara sin importar mayúsculas, acentos ni símbolos). */
export const clave = (texto = '') =>
  String(texto)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Convierte fecha + hora de inicio + duración en las fechas de inicio y fin. */
export function rangoDeReserva({ fecha, horario, duracion }) {
  const inicio = new Date(`${fecha}T${horario}`)
  const fin = new Date(inicio.getTime() + Number(duracion) * HORA_MS)
  return { inicio, fin }
}

/** Un identificador por cada hora que ocupa la reserva: 10:30–12:30 ocupa las 10, 11 y 12. */
export function bloquesDeHora(inicio, fin) {
  const bloques = []
  const t = new Date(inicio)
  t.setMinutes(0, 0, 0)
  while (t < fin) {
    bloques.push(`${t.getFullYear()}${dos(t.getMonth() + 1)}${dos(t.getDate())}${dos(t.getHours())}`)
    t.setHours(t.getHours() + 1)
  }
  return bloques
}

/** Devuelve el primer error encontrado (texto) o null si todo está bien. */
export function validarReservaEspacio({ estacionamiento, espacio, fecha, horario, duracion }, ahora = Date.now()) {
  if (!clave(estacionamiento) || !clave(espacio)) return 'Escribe el estacionamiento y el cajón.'

  const { inicio } = rangoDeReserva({ fecha, horario, duracion })
  if (Number.isNaN(inicio.getTime())) return 'Elige la fecha y la hora de inicio.'
  if (inicio.getTime() < ahora) return 'La hora de inicio ya pasó. Elige una hora futura.'

  const horas = Number(duracion)
  if (!Number.isInteger(horas) || horas < 1 || horas > 12) return 'La duración debe ser de 1 a 12 horas.'
  return null
}
