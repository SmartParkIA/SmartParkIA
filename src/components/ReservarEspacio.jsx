import { useEffect, useState } from 'react'
import { useUsuario } from '../hooks/useUsuario.js'
import { crearReservaEspacio } from '../services/reservarEspacioService.js'
import { fechaLocal, validarReservaEspacio } from '../services/reservarEspacioUtils.js'
import '../../css/perfil.css' // estilos globales de tus páginas (css/perfil.css en la raíz del proyecto)
import './ReservarEspacio.css'

/** Página "Reservar Espacio": misma estructura y clases que reservar.html. */
export default function ReservarEspacio() {
  const { usuario, cargando } = useUsuario()
  const [form, setForm] = useState({
    estacionamiento: 'SmartPark Central - Zona A',
    espacio: '',
    fecha: fechaLocal(new Date()),
    horario: '',
    duracion: '2',
  })
  const [mensaje, setMensaje] = useState(null) // { texto, error }
  const [enviando, setEnviando] = useState(false)

  const sinSesion = !cargando && !usuario

  // layout.js dibuja el menú lateral dentro de #sidebar-container (igual que en reservar.html).
  useEffect(() => {
    import('../layout.js').catch((e) => console.warn('No se pudo cargar layout.js:', e))
  }, [])

  // Sin sesión iniciada: se manda al inicio de sesión.
  useEffect(() => {
    if (!sinSesion) return undefined
    const t = setTimeout(() => window.location.assign('/login.html'), 2000)
    return () => clearTimeout(t)
  }, [sinSesion])

  const cambiar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  async function enviar(e) {
    e.preventDefault()
    if (!usuario) return

    const errorDeValidacion = validarReservaEspacio(form)
    if (errorDeValidacion) {
      setMensaje({ texto: errorDeValidacion, error: true })
      return
    }

    setEnviando(true)
    setMensaje(null)
    try {
      const codigo = await crearReservaEspacio({ usuario, ...form })
      setMensaje({ texto: `Reserva confirmada. Tu código es ${codigo}.`, error: false })
      setForm((f) => ({ ...f, espacio: '' }))
    } catch (err) {
      setMensaje({ texto: err.message, error: true })
    } finally {
      setEnviando(false)
    }
  }

  const aviso = sinSesion
    ? { texto: 'Inicia sesión para reservar. Te llevamos al inicio de sesión…', error: true }
    : mensaje

  return (
    <div className="reservar-pagina">
      {/* 1. Contenedor del menú lateral */}
      <div id="sidebar-container" />

      {/* 2. Contenido principal */}
      <div className="main-content">
        <header className="navbar">
          <div className="navbar__izq">
            <button type="button" className="menu-toggle" id="menuToggle">☰</button>
            <span className="navbar-brand">Nueva Reserva</span>
          </div>
        </header>

        <div className="container">
          <h2>Reservar Espacio</h2>

          <div className="profile-card reservar-tarjeta">
            {/* Lado izquierdo: animación y tips */}
            <div className="avatar-container reservar-lateral">
              <div className="parking-scene">
                <div className="car">
                  <div className="car-windshield" />
                  <div className="car-headlights" />
                </div>
              </div>
              <div className="reservar-tips">
                <h4>💡 Proceso de Reserva</h4>
                <ul>
                  <li>Al confirmar, el cajón quedará asignado exclusivamente a tu cuenta.</li>
                  <li>Tu lugar se mantendrá apartado hasta finalizar el horario seleccionado.</li>
                </ul>
              </div>
            </div>

            {/* Lado derecho: formulario */}
            <div className="info-grid reservar-info">
              <p className="reservar-intro">
                Completa los datos para asegurar tu lugar antes de llegar.
              </p>

              <form className="reservar-form" onSubmit={enviar} noValidate>
                <div className="info-group reservar-grupo">
                  <label className="form-label" htmlFor="estacionamiento">Estacionamiento / Zona</label>
                  <input
                    type="text" id="estacionamiento" className="form-input" required
                    value={form.estacionamiento} onChange={cambiar('estacionamiento')}
                  />
                </div>

                <div className="info-group reservar-grupo">
                  <label className="form-label" htmlFor="espacio">Cajón / Espacio Disponible</label>
                  <input
                    type="text" id="espacio" className="form-input" required
                    placeholder="Ej. Cajón #A-12"
                    value={form.espacio} onChange={cambiar('espacio')}
                  />
                </div>

                <div className="reservar-dos">
                  <div className="info-group reservar-grupo">
                    <label className="form-label" htmlFor="fecha">Fecha</label>
                    <input
                      type="date" id="fecha" className="form-input" required
                      min={fechaLocal(new Date())}
                      value={form.fecha} onChange={cambiar('fecha')}
                    />
                  </div>
                  <div className="info-group reservar-grupo">
                    <label className="form-label" htmlFor="horario">Hora de Inicio</label>
                    <input
                      type="time" id="horario" className="form-input" required
                      value={form.horario} onChange={cambiar('horario')}
                    />
                  </div>
                </div>

                <div className="info-group reservar-grupo">
                  <label className="form-label" htmlFor="duracion">Duración (Horas)</label>
                  <input
                    type="number" id="duracion" className="form-input" required min="1" max="12"
                    value={form.duracion} onChange={cambiar('duracion')}
                  />
                </div>

                {aviso && (
                  <p
                    className={`reservar-mensaje ${aviso.error ? 'reservar-mensaje--error' : ''}`}
                    role={aviso.error ? 'alert' : 'status'}
                  >
                    {aviso.texto}
                  </p>
                )}

                <button
                  type="submit" id="btnReservar" className="upload-btn reservar-enviar"
                  disabled={enviando || cargando || !usuario}
                >
                  {enviando ? 'Reservando…' : 'Confirmar Reserva'}
                </button>
              </form>

              <div className="reservar-volver">
                <a href="perfil.html">Volver al perfil</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
