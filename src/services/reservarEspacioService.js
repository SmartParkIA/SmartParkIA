// Guarda una reserva de cajón en Firestore.
import { collection, doc, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../firebaseConfig.js'
import { bloquesDeHora, clave, rangoDeReserva } from './reservarEspacioUtils.js'

const USAR_DEMO = import.meta.env.VITE_SEDES_DEMO === 'true'

class ErrorOcupado extends Error {}

/**
 * Cada hora reservada crea un documento en "bloqueos" con un id único por
 * estacionamiento + cajón + hora. Si ese id ya existe, el cajón está ocupado.
 * Todo ocurre dentro de una transacción, así que dos personas no pueden
 * reservar el mismo cajón a la misma hora.
 * Devuelve el código de la reserva (6 caracteres).
 */
export async function crearReservaEspacio({ usuario, estacionamiento, espacio, fecha, horario, duracion }) {
  if (USAR_DEMO) {
    await new Promise((r) => setTimeout(r, 600))
    return Math.random().toString(36).slice(2, 8).toUpperCase()
  }

  const { inicio, fin } = rangoDeReserva({ fecha, horario, duracion })
  const base = `${clave(estacionamiento)}_${clave(espacio)}_`
  const bloques = bloquesDeHora(inicio, fin).map((b) => doc(db, 'bloqueos', base + b))
  const reservaRef = doc(collection(db, 'reservas'))

  try {
    await runTransaction(db, async (tx) => {
      const existentes = await Promise.all(bloques.map((ref) => tx.get(ref)))
      if (existentes.some((s) => s.exists())) throw new ErrorOcupado()

      bloques.forEach((ref) =>
        tx.set(ref, { userId: usuario.uid, reservaId: reservaRef.id, creadaEn: serverTimestamp() }),
      )
      tx.set(reservaRef, {
        userId: usuario.uid,
        userEmail: usuario.email ?? '',
        estacionamiento: estacionamiento.trim(),
        espacio: espacio.trim(),
        inicio: Timestamp.fromDate(inicio),
        fin: Timestamp.fromDate(fin),
        duracionHoras: Number(duracion),
        estado: 'activa',
        creadaEn: serverTimestamp(),
      })
    })
  } catch (error) {
    if (error instanceof ErrorOcupado) {
      throw new Error('Ese cajón ya está reservado en ese horario. Prueba con otra hora u otro cajón.')
    }
    console.error('Error al reservar:', error.code, error.message)
    if (error.code === 'permission-denied') {
      throw new Error('No tienes permiso para reservar. Inicia sesión e inténtalo de nuevo.')
    }
    throw new Error('No se pudo completar la reserva. Revisa tu conexión e inténtalo de nuevo.')
  }

  return reservaRef.id.slice(0, 6).toUpperCase()
}
