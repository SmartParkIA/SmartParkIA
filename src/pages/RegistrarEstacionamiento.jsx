import { useState } from "react";
import {
  MapPin,
  Building2,
  CarFront,
  Clock3,
  Phone,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  MapPinned,
  Sparkles,
} from "lucide-react";
import MapaModal from "../components/MapaModal";
import "../styles/RegistrarEstacionamiento.css";

const formularioInicial = {
  nombre: "",
  direccion: "",
  ciudad: "",
  capacidad: "",
  hora_apertura: "06:00",
  hora_cierre: "22:00",
  telefono: "",
};

function RegistrarEstacionamiento() {
  const [formulario, setFormulario] = useState(formularioInicial);
  const [coordenadas, setCoordenadas] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  function manejarCambio(evento) {
    const { name, value } = evento.target;
    setFormulario((anterior) => ({ ...anterior, [name]: value }));
    setMensaje(null);
  }

  async function registrarEstacionamiento(evento) {
    evento.preventDefault();
    setMensaje(null);

    if (
      !formulario.nombre.trim() ||
      !formulario.direccion.trim() ||
      !formulario.ciudad.trim() ||
      !formulario.capacidad ||
      !formulario.telefono.trim() ||
      !formulario.hora_apertura ||
      !formulario.hora_cierre
    ) {
      setMensaje({
        tipo: "error",
        texto: "Completa todos los campos obligatorios.",
      });
      return;
    }

    if (!coordenadas) {
      setMensaje({
        tipo: "error",
        texto: "Selecciona la ubicación de la sede en el mapa.",
      });
      return;
    }

    if (
      !Number.isSafeInteger(Number(formulario.capacidad)) ||
      Number(formulario.capacidad) <= 0
    ) {
      setMensaje({
        tipo: "error",
        texto: "La capacidad debe ser un entero mayor que cero.",
      });
      return;
    }

    setCargando(true);
    try {
      const respuesta = await fetch(
        "http://localhost:3001/api/estacionamientos",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formulario,
            capacidad: Number(formulario.capacidad),
            lat: coordenadas.lat,
            lng: coordenadas.lng,
            coordenadaId: coordenadas.id,
          }),
        }
      );

      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje || "No fue posible registrar la sede."
        );
      }

      setMensaje({
        tipo: "exito",
        texto: `${resultado.mensaje} Folio: ${resultado.estacionamiento.id}`,
      });

      setFormulario(formularioInicial);
      setCoordenadas(null);
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          error.message === "Failed to fetch"
            ? "No hay conexión con el servidor. Verifica que el backend esté iniciado."
            : error.message,
      });
    } finally {
      setCargando(false);
    }
  }

  function limpiarFormulario() {
    setFormulario(formularioInicial);
    setCoordenadas(null);
    setMensaje(null);
  }

  return (
    <div className="pagina">
      {/* Estilos complementarios en el mismo archivo (animaciones) */}
      <style>{`
        .pagina { animation: reFadeIn .6s ease; }
        @keyframes reFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .introduccion {
          animation: reSlideIn .7s cubic-bezier(.34,1.56,.64,1);
        }
        @keyframes reSlideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .introduccion-icono {
          animation: reFloatIcon 3s ease-in-out infinite;
        }
        @keyframes reFloatIcon {
          0%,100% { transform: translateY(0) rotate(0deg); }
          50%     { transform: translateY(-4px) rotate(4deg); }
        }
        .formulario {
          animation: reFormIn .8s cubic-bezier(.34,1.56,.64,1) .15s backwards;
        }
        @keyframes reFormIn {
          from { opacity: 0; transform: translateY(24px) scale(.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Sección coordenadas */
        .coordenadas-seccion {
          margin-top: 6px;
          animation: reSectionIn .55s ease both;
        }
        @keyframes reSectionIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .coordenadas-card {
          display: flex; align-items: center; gap: 14px;
          padding: 16px 18px;
          background: linear-gradient(135deg, #f8fafc, #eef2ff);
          border: 1.5px dashed #c7d2fe;
          border-radius: 14px;
          transition: all .35s ease;
          position: relative; overflow: hidden;
        }
        .coordenadas-card::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(120deg,transparent 30%,rgba(255,255,255,.6) 50%,transparent 70%);
          transform: translateX(-100%);
          animation: reShimmer 4s ease infinite;
          pointer-events: none;
        }
        @keyframes reShimmer {
          0%,100% { transform: translateX(-100%); }
          50%     { transform: translateX(100%); }
        }

        .coordenadas-card--activa {
          background: linear-gradient(135deg, #ecfdf5, #f0fdf4);
          border: 1.5px solid #86efac;
          box-shadow: 0 6px 20px rgba(16,185,129,.12);
          animation: rePopIn .5s cubic-bezier(.34,1.56,.64,1);
        }
        @keyframes rePopIn {
          0%   { transform: scale(.96); }
          60%  { transform: scale(1.02); }
          100% { transform: scale(1); }
        }

        .coordenadas-icono {
          width: 42px; height: 42px; border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 16px rgba(99,102,241,.35);
          flex-shrink: 0;
          animation: rePulse 2.4s ease-in-out infinite;
        }
        .coordenadas-card--activa .coordenadas-icono {
          background: linear-gradient(135deg, #10b981, #059669);
          box-shadow: 0 6px 16px rgba(16,185,129,.35);
        }
        @keyframes rePulse {
          0%,100% { transform: scale(1); }
          50%     { transform: scale(1.06); }
        }

        .coordenadas-texto { flex: 1; display: flex; flex-direction: column; gap: 3px; }
        .coordenadas-texto strong { font-size: .93rem; color: #1f2937; }
        .coordenadas-texto small {
          font-size: .8rem; color: #6b7280;
          font-family: ui-monospace, monospace;
        }

        .coordenadas-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 16px; border-radius: 9px;
          border: none; cursor: pointer; font-weight: 600; font-size: .85rem;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          box-shadow: 0 4px 12px rgba(99,102,241,.35);
          transition: all .3s cubic-bezier(.34,1.56,.64,1);
          position: relative; overflow: hidden;
        }
        .coordenadas-btn:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 8px 22px rgba(99,102,241,.5);
        }
        .coordenadas-btn--ghost {
          background: #eef2ff; color: #4338ca;
          box-shadow: none;
        }
        .coordenadas-btn--ghost:hover:not(:disabled) {
          background: #e0e7ff;
        }
      `}</style>

      <main className="contenido">
        <div className="ruta">
          <span>Administración</span>
          <span>/</span>
          <strong>Registrar estacionamiento</strong>
        </div>

        <section className="introduccion">
          <div className="introduccion-icono">
            <Building2 size={27} />
          </div>
          <div>
            <h2>Registrar nueva sede</h2>
            <p>
              Ingresa la información general para dar de alta una nueva sede de
              estacionamiento.
            </p>
          </div>
        </section>

        <form className="formulario" onSubmit={registrarEstacionamiento}>
          <div className="formulario-cabecera">
            <div>
              <h3>Información general</h3>
              <p>Los campos marcados con * son obligatorios.</p>
            </div>
            <span className="estado-nuevo">
              <span className="punto" /> Nueva sede
            </span>
          </div>

          <div className="seccion-titulo">
            <MapPin size={19} />
            <h4>Datos de la sede</h4>
          </div>

          <div className="campo">
            <label htmlFor="nombre">Nombre del estacionamiento *</label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              placeholder="Ej. Estacionamiento Centro"
              value={formulario.nombre}
              onChange={manejarCambio}
              maxLength={100}
              required
            />
          </div>

          <div className="campo">
            <label htmlFor="direccion">Dirección completa *</label>
            <input
              id="direccion"
              name="direccion"
              type="text"
              placeholder="Calle, número, colonia..."
              value={formulario.direccion}
              onChange={manejarCambio}
              maxLength={200}
              required
            />
          </div>

          <div className="campo">
            <label htmlFor="ciudad">Ciudad o municipio *</label>
            <input
              id="ciudad"
              name="ciudad"
              type="text"
              placeholder="Ej. Nezahualcóyotl"
              value={formulario.ciudad}
              onChange={manejarCambio}
              maxLength={100}
              required
            />
          </div>

          {/* 🆕 Sección de coordenadas en el mapa */}
          <div className="seccion-titulo">
            <MapPinned size={19} />
            <h4>Ubicación geográfica</h4>
          </div>

          <div className="coordenadas-seccion">
            <div
              className={`coordenadas-card ${
                coordenadas ? "coordenadas-card--activa" : ""
              }`}
            >
              <div className="coordenadas-icono">
                {coordenadas ? <Sparkles size={20} /> : <MapPin size={20} />}
              </div>
              <div className="coordenadas-texto">
                {coordenadas ? (
                  <>
                    <strong>Ubicación seleccionada</strong>
                    <small>
                      Lat {coordenadas.lat.toFixed(6)} · Lng{" "}
                      {coordenadas.lng.toFixed(6)}
                      {coordenadas.id &&
                        ` · ID ${coordenadas.id.slice(0, 8)}…`}
                    </small>
                  </>
                ) : (
                  <>
                    <strong>Aún no seleccionas una ubicación</strong>
                    <small>Abre el mapa y haz clic sobre la sede.</small>
                  </>
                )}
              </div>
              <button
                type="button"
                className={`coordenadas-btn ${
                  coordenadas ? "coordenadas-btn--ghost" : ""
                }`}
                onClick={() => setModalAbierto(true)}
                disabled={cargando}
              >
                <MapPinned size={16} />
                {coordenadas ? "Cambiar" : "Abrir mapa"}
              </button>
            </div>
          </div>

          <div className="seccion-titulo">
            <CarFront size={19} />
            <h4>Capacidad y horarios</h4>
          </div>

          <div className="rejilla">
            <div className="campo">
              <label htmlFor="capacidad">Capacidad de vehículos *</label>
              <input
                id="capacidad"
                name="capacidad"
                type="number"
                placeholder="Ej. 120"
                min="1"
                step="1"
                value={formulario.capacidad}
                onChange={manejarCambio}
                required
              />
              <small>Número total de vehículos que puede recibir.</small>
            </div>

            <div className="campo">
              <label htmlFor="telefono">Teléfono de contacto *</label>
              <div className="entrada-icono">
                <Phone size={17} />
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  placeholder="Ej. 5512345678"
                  value={formulario.telefono}
                  onChange={manejarCambio}
                  maxLength={20}
                  required
                />
              </div>
            </div>

            <div className="campo">
              <label htmlFor="hora_apertura">Hora de apertura *</label>
              <div className="entrada-icono">
                <Clock3 size={17} />
                <input
                  id="hora_apertura"
                  name="hora_apertura"
                  type="time"
                  value={formulario.hora_apertura}
                  onChange={manejarCambio}
                  required
                />
              </div>
            </div>

            <div className="campo">
              <label htmlFor="hora_cierre">Hora de cierre *</label>
              <div className="entrada-icono">
                <Clock3 size={17} />
                <input
                  id="hora_cierre"
                  name="hora_cierre"
                  type="time"
                  value={formulario.hora_cierre}
                  onChange={manejarCambio}
                  required
                />
              </div>
            </div>
          </div>

          {mensaje && (
            <div
              className={`mensaje ${mensaje.tipo}`}
              role="status"
              aria-live="polite"
            >
              {mensaje.tipo === "exito" ? (
                <CheckCircle2 size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
              <span>{mensaje.texto}</span>
            </div>
          )}

          <div className="acciones">
            <button
              type="button"
              className="boton-secundario"
              onClick={limpiarFormulario}
              disabled={cargando}
            >
              <RotateCcw size={17} />
              Limpiar
            </button>

            <button
              type="submit"
              className="boton-principal"
              disabled={cargando}
            >
              <Save size={18} />
              {cargando ? "Registrando..." : "Registrar sede"}
            </button>
          </div>
        </form>

        <p className="nota-inferior">
          <CheckCircle2 size={15} />
          La información se guardará en la base de datos del sistema.
        </p>
      </main>

      {modalAbierto && (
        <MapaModal
          coordsIniciales={coordenadas}
          onCerrar={() => setModalAbierto(false)}
          onConfirmar={(c) => {
            setCoordenadas(c);
            setModalAbierto(false);
            setMensaje(null);
          }}
        />
      )}
    </div>
  );
}

export default RegistrarEstacionamiento;