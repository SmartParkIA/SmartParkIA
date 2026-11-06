import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { obtenerSedes } from '../services/sedesService.js'
import { estadoDeSede, filtrarSedes, tieneUbicacion } from '../services/sedesUtils.js'
import FichaSede from './FichaSede.jsx'
import { Bahias, ChipEstado } from './IndicadoresSede.jsx'
import './VerEstacionamientos.css'

const crearIcono = (sede, activo) =>
  L.divIcon({
    className: 'marcador-wrap',
    html: `<span class="marcador marcador--${estadoDeSede(sede)} ${activo ? 'marcador--activo' : ''}">${sede.espaciosDisponibles}</span>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  })

function TarjetaSede({ sede, activa, onSeleccionar }) {
  return (
    <li>
      <button
        type="button"
        className={`sede ${activa ? 'sede--activa' : ''}`}
        aria-pressed={activa}
        onClick={() => onSeleccionar(sede.id)}
      >
        <span className="sede__cabecera">
          <span className="sede__nombre">{sede.nombre}</span>
          <ChipEstado sede={sede} />
        </span>
        <span className="sede__direccion">{sede.direccion}</span>
        <Bahias sede={sede} />
        <span className="sede__datos">
          <span>
            <strong>{sede.espaciosDisponibles}</strong> de {sede.espaciosTotales} disponibles
          </span>
          <span>${sede.tarifaHora} por hora</span>
          {sede.horario && <span>{sede.horario}</span>}
        </span>
      </button>
    </li>
  )
}

function ControlDeMapa({ sede, vista }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
  }, [vista, map])
  useEffect(() => {
    if (sede && tieneUbicacion(sede)) map.flyTo([sede.lat, sede.lng], 16, { duration: 0.6 })
  }, [sede, map])
  return null
}

export default function VerEstacionamientos() {
  const [sedes, setSedes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [soloDisponibles, setSoloDisponibles] = useState(false)
  const [seleccionadaId, setSeleccionadaId] = useState(null)
  const [vista, setVista] = useState('lista') // solo afecta en pantallas chicas

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setSedes(await obtenerSedes())
    } catch (e) {
      setError(e.message || 'Ocurrió un error inesperado.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const visibles = useMemo(
    () => filtrarSedes(sedes, { busqueda, soloDisponibles }),
    [sedes, busqueda, soloDisponibles],
  )
  const enMapa = useMemo(() => visibles.filter(tieneUbicacion), [visibles])
  const seleccionada = sedes.find((s) => s.id === seleccionadaId) || null

  const limites = useMemo(() => {
    const conUbicacion = sedes.filter(tieneUbicacion)
    return conUbicacion.length
      ? L.latLngBounds(conUbicacion.map((s) => [s.lat, s.lng])).pad(0.15)
      : null
  }, [sedes])

  // Elegir una sede (en la lista o en el mapa) abre su ficha en el panel.
  const seleccionar = (id) => {
    setSeleccionadaId(id)
    setVista('lista')
  }

  return (
    <main className={`estacionamientos estacionamientos--${vista}`}>
      <header className="encabezado">
        <div className="encabezado__titulo">
          <span className="marca">SMARTPARK</span>
          <h1>Estacionamientos</h1>
        </div>
        <div className="vistas" role="group" aria-label="Cambiar vista">
          <button type="button" aria-pressed={vista === 'lista'} onClick={() => setVista('lista')}>
            Lista
          </button>
          <button type="button" aria-pressed={vista === 'mapa'} onClick={() => setVista('mapa')}>
            Mapa
          </button>
        </div>
      </header>

      <section className="panel" aria-label="Estacionamientos">
        {seleccionada ? (
          <FichaSede
            key={seleccionada.id}
            sede={seleccionada}
            onVolver={() => setSeleccionadaId(null)}
            onVerMapa={() => setVista('mapa')}
          />
        ) : (
          <>
            <div className="filtros">
              <input
                type="search"
                placeholder="Buscar por nombre o dirección"
                aria-label="Buscar estacionamiento"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <label className="filtros__check">
                <input
                  type="checkbox"
                  checked={soloDisponibles}
                  onChange={(e) => setSoloDisponibles(e.target.checked)}
                />
                Solo con lugares disponibles
              </label>
            </div>

            {cargando && (
              <p className="mensaje" role="status">
                Cargando estacionamientos…
              </p>
            )}

            {error && (
              <div className="mensaje mensaje--error" role="alert">
                <p>{error}</p>
                <button type="button" onClick={cargar}>
                  Reintentar
                </button>
              </div>
            )}

            {!cargando && !error && sedes.length === 0 && (
              <p className="mensaje">Todavía no hay estacionamientos registrados.</p>
            )}

            {!cargando && !error && sedes.length > 0 && visibles.length === 0 && (
              <p className="mensaje">
                No encontramos estacionamientos con esos filtros. Prueba con otra búsqueda o quita el filtro de disponibilidad.
              </p>
            )}

            {!cargando && !error && visibles.length > 0 && (
              <ul className="lista">
                {visibles.map((s) => (
                  <TarjetaSede key={s.id} sede={s} activa={s.id === seleccionadaId} onSeleccionar={seleccionar} />
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section className="mapa" aria-label="Mapa de estacionamientos">
        {limites ? (
          <MapContainer bounds={limites} scrollWheelZoom className="mapa__leaflet">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {enMapa.map((s) => (
              <Marker
                key={s.id}
                position={[s.lat, s.lng]}
                icon={crearIcono(s, s.id === seleccionadaId)}
                eventHandlers={{ click: () => seleccionar(s.id) }}
              />
            ))}
            <ControlDeMapa sede={seleccionada} vista={vista} />
          </MapContainer>
        ) : (
          !cargando && <p className="mensaje">Ninguna sede tiene ubicación registrada para mostrar en el mapa.</p>
        )}
      </section>
    </main>
  )
}
