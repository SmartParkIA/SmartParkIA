import { estadoDeSede } from '../services/sedesUtils.js'

const BAHIAS = 10
const ETIQUETA = { libre: 'Con lugares', pocos: 'Pocos lugares', lleno: 'Lleno' }

/** Franja de cajones: libres con borde blanco, ocupados rellenos. */
export function Bahias({ sede }) {
  const ocupadas = Math.round(BAHIAS * (1 - sede.espaciosDisponibles / sede.espaciosTotales)) || 0
  return (
    <span className="bahias" aria-hidden="true">
      {Array.from({ length: BAHIAS }, (_, i) => (
        <span key={i} className={i < ocupadas ? 'bahia bahia--ocupada' : 'bahia'} />
      ))}
    </span>
  )
}

export function ChipEstado({ sede }) {
  const estado = estadoDeSede(sede)
  return <span className={`estado estado--${estado}`}>{ETIQUETA[estado]}</span>
}
