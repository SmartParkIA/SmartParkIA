import { useEffect, useState } from 'react'
import { obtenerDetalleSede } from '../services/sedesService.js'
import { tieneUbicacion, urlComoLlegar } from '../services/sedesUtils.js'
import { Bahias, ChipEstado } from './IndicadoresSede.jsx'
import './FichaSede.css'

const moneda = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/**
 * Ficha técnica de una sede.
 * Muestra enseguida lo que ya se sabe (nombre, disponibilidad, ubicación)
 * y carga en segundo plano horarios, precios y reglas (tarea 026).
 */
export default function FichaSede({ sede, onVolver, onVerMapa }) {
  const [detalle, setDetalle] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vigente = true // evita mostrar la respuesta de una sede que ya no está seleccionada
    setCargando(true)
    setError(null)
    setDetalle(null)

    obtenerDetalleSede(sede.id)
      .then((d) => vigente && setDetalle(d))
      .catch((e) => vigente && setError(e.message || 'No se pudo cargar la información de la sede.'))
      .finally(() => vigente && setCargando(false))

    return () => {
      vigente = false
    }
  }, [sede.id, intento])

  const comoLlegar = urlComoLlegar(sede)
  const sinInfo =
    detalle &&
    !detalle.horarios.length &&
    !detalle.tarifas.length &&
    !detalle.reglas.length &&
    !detalle.servicios.length &&
    !detalle.referencia &&
    !detalle.telefono

  return (
    <article className="ficha" aria-label={`Información de ${sede.nombre}`}>
      <div className="ficha__acciones">
        <button type="button" onClick={onVolver}>
          Volver a la lista
        </button>
        {tieneUbicacion(sede) && (
          <button type="button" className="ficha__mapa" onClick={onVerMapa}>
            Ver en el mapa
          </button>
        )}
      </div>

      <header className="ficha__cabecera">
        <h2>{sede.nombre}</h2>
        <ChipEstado sede={sede} />
      </header>
      <Bahias sede={sede} />
      <p className="ficha__disponibles">
        <strong>{sede.espaciosDisponibles}</strong> de {sede.espaciosTotales} lugares disponibles
      </p>

      <section className="ficha__seccion">
        <h3>Ubicación</h3>
        <p>{sede.direccion || 'Dirección no registrada'}</p>
        {detalle?.referencia && <p className="ficha__nota">{detalle.referencia}</p>}
        {detalle?.telefono && (
          <p>
            Teléfono: <a href={`tel:${detalle.telefono}`}>{detalle.telefono}</a>
          </p>
        )}
        {comoLlegar && (
          <a className="ficha__boton" href={comoLlegar} target="_blank" rel="noopener noreferrer">
            Cómo llegar
          </a>
        )}
      </section>

      {cargando && (
        <p className="mensaje" role="status">
          Cargando información de la sede…
        </p>
      )}

      {error && (
        <div className="mensaje mensaje--error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setIntento((n) => n + 1)}>
            Reintentar
          </button>
        </div>
      )}

      {detalle && (
        <>
          {detalle.horarios.length > 0 && (
            <section className="ficha__seccion">
              <h3>Horarios</h3>
              <dl className="ficha__filas">
                {detalle.horarios.map((h) => (
                  <div key={h.dia}>
                    <dt>{h.dia}</dt>
                    <dd>{h.horas}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {detalle.tarifas.length > 0 && (
            <section className="ficha__seccion">
              <h3>Precios</h3>
              <dl className="ficha__filas">
                {detalle.tarifas.map((t) => (
                  <div key={t.concepto}>
                    <dt>{t.concepto}</dt>
                    <dd>{moneda.format(t.monto)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {detalle.reglas.length > 0 && (
            <section className="ficha__seccion">
              <h3>Reglas del estacionamiento</h3>
              <ul className="ficha__reglas">
                {detalle.reglas.map((regla) => (
                  <li key={regla}>{regla}</li>
                ))}
              </ul>
            </section>
          )}

          {detalle.servicios.length > 0 && (
            <section className="ficha__seccion">
              <h3>Servicios</h3>
              <ul className="ficha__tags">
                {detalle.servicios.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>
          )}

          {sinInfo && <p className="mensaje">Esta sede todavía no tiene más información registrada.</p>}
        </>
      )}
    </article>
  )
}
