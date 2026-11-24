import { useState } from "react";
import {
  MapPin,
  Building2,
  CarFront,
  Clock3,
  Phone,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
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

function horaAMinutos(horaStr) {
  if (!/^\d{2}:\d{2}$/.test(horaStr)) return null;
  const [horas, minutos] = horaStr.split(":").map(Number);
  if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) return null;
  return horas * 60 + minutos;
}

async function obtenerDireccionDesdeCoordenadas(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
    lat
  )}&lon=${encodeURIComponent(lng)}&addressdetails=1&accept-language=es`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("No se pudo consultar la dirección.");

  const data = await res.json();
  const addr = data.address || {};

  const calle = addr.road || addr.pedestrian || addr.path || "";
  const numero = addr.house_number ? ` #${addr.house_number}` : "";
  const colonia =
    addr.neighbourhood ||
    addr.suburb ||
    addr.residential ||
    addr.quarter ||
    "";

  const partesDireccion = [
    calle ? `${calle}${numero}` : "",
    colonia,
  ].filter(Boolean);

  const direccion =
    partesDireccion.length > 0
      ? partesDireccion.join(", ")
      : (data.display_name || "").split(",").slice(0, 2).join(",").trim();

  const ciudad =
    addr.city ||
    addr.town ||
    addr.municipality ||
    addr.county ||
    addr.state_district ||
    addr.state ||
    "";

  return { direccion, ciudad };
}

function validarFormulario(datos, coords) {
  const errores = {};

  const nombre = datos.nombre.trim();
  if (!nombre) {
    errores.nombre = "Ingresa el nombre del estacionamiento.";
  } else if (nombre.length < 3) {
    errores.nombre = "El nombre debe tener al menos 3 caracteres.";
  } else if (nombre.length > 100) {
    errores.nombre = "El nombre no puede superar los 100 caracteres.";
  }

  if (!datos.direccion.trim()) {
    errores.direccion = "Selecciona el lugar en el mapa para obtener la dirección.";
  }

  if (!datos.ciudad.trim()) {
    errores.ciudad = "Selecciona el lugar en el mapa para obtener la ciudad o municipio.";
  }

  const capacidadNum = Number(datos.capacidad);
  if (!datos.capacidad) {
    errores.capacidad = "Indica la capacidad de vehículos.";
  } else if (!Number.isInteger(capacidadNum) || capacidadNum <= 0) {
    errores.capacidad = "La capacidad debe ser un número entero mayor que 0.";
  } else if (capacidadNum > 10000) {
    errores.capacidad = "Revisa la capacidad: el máximo permitido es 10,000.";
  }

  const digitosTelefono = datos.telefono.replace(/\D/g, "");
  if (!digitosTelefono) {
    errores.telefono = "Ingresa un teléfono de contacto.";
  } else if (digitosTelefono.length !== 10) {
    errores.telefono = "El teléfono debe tener exactamente 10 dígitos.";
  }

  const aperturaMin = horaAMinutos(datos.hora_apertura);
  const cierreMin = horaAMinutos(datos.hora_cierre);

  if (aperturaMin === null) {
    errores.hora_apertura = "Selecciona una hora de apertura válida.";
  }
  if (cierreMin === null) {
    errores.hora_cierre = "Selecciona una hora de cierre válida.";
  }
  if (aperturaMin !== null && cierreMin !== null && aperturaMin === cierreMin) {
    errores.hora_cierre = "La hora de cierre no puede ser igual a la de apertura.";
  }

  const latValida =
    typeof coords?.lat === "number" &&
    Number.isFinite(coords.lat) &&
    coords.lat >= -90 &&
    coords.lat <= 90;
  const lngValida =
    typeof coords?.lng === "number" &&
    Number.isFinite(coords.lng) &&
    coords.lng >= -180 &&
    coords.lng <= 180;

  if (!coords || !latValida || !lngValida) {
    errores.coordenadas = "Selecciona una ubicación válida en el mapa.";
  }

  return errores;
}

function RegistrarEstacionamiento() {
  const [formulario, setFormulario] = useState(formularioInicial);
  const [coordenadas, setCoordenadas] = useState(null);
  const [errores, setErrores] = useState({});
  const [edicionManualUbicacion, setEdicionManualUbicacion] = useState({
    direccion: false,
    ciudad: false,
  });
  const [confirmarLimpiar, setConfirmarLimpiar] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [buscandoDireccion, setBuscandoDireccion] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

  function manejarCambio(evento) {
    const { name, value } = evento.target;

    if (name === "direccion" && !edicionManualUbicacion.direccion) return;
    if (name === "ciudad" && !edicionManualUbicacion.ciudad) return;

    let valorLimpio = value;

    if (name === "telefono") {
      valorLimpio = value.replace(/\D/g, "").slice(0, 10);
    } else if (name === "capacidad") {
      valorLimpio = value.replace(/\D/g, "");
    }

    setFormulario((anterior) => ({ ...anterior, [name]: valorLimpio }));
    setConfirmarLimpiar(false);
    setErrores((prev) => {
      if (!prev[name]) return prev;
      const copia = { ...prev };
      delete copia[name];
      if (name === "hora_apertura" || name === "hora_cierre") {
        delete copia.hora_cierre;
      }
      return copia;
    });
    setMensaje(null);
  }

  function bloquearNoDigitos(evento) {
    const teclasPermitidas = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
    ];
    if (
      teclasPermitidas.includes(evento.key) ||
      evento.ctrlKey ||
      evento.metaKey
    ) {
      return;
    }
    if (!/^\d$/.test(evento.key)) {
      evento.preventDefault();
    }
  }

  function aplicarResultadoUbicacion(direccion, ciudad) {
    const faltaDireccion = !direccion?.trim();
    const faltaCiudad = !ciudad?.trim();

    setFormulario((prev) => ({
      ...prev,
      direccion: direccion || "",
      ciudad: ciudad || "",
    }));

    setEdicionManualUbicacion({
      direccion: faltaDireccion,
      ciudad: faltaCiudad,
    });

    setErrores((prev) => {
      const copia = { ...prev };
      if (!faltaDireccion) delete copia.direccion;
      if (!faltaCiudad) delete copia.ciudad;
      return copia;
    });

    if (faltaDireccion || faltaCiudad) {
      setMensaje({
        tipo: "aviso",
        texto:
          "El mapa no devolvió todos los datos de esta zona. Habilitamos el campo faltante para que puedas completarlo manualmente.",
      });
    }
  }

  async function manejarConfirmarMapa(coords) {
    setCoordenadas(coords);
    setModalAbierto(false);
    setConfirmarLimpiar(false);
    setMensaje(null);
    setErrores((prev) => {
      const copia = { ...prev };
      delete copia.coordenadas;
      return copia;
    });

    if (coords?.direccion || coords?.ciudad) {
      aplicarResultadoUbicacion(coords.direccion || "", coords.ciudad || "");
      return;
    }

    if (typeof coords?.lat === "number" && typeof coords?.lng === "number") {
      setBuscandoDireccion(true);
      try {
        const { direccion, ciudad } = await obtenerDireccionDesdeCoordenadas(
          coords.lat,
          coords.lng
        );
        aplicarResultadoUbicacion(direccion, ciudad);
      } catch {
        setFormulario((prev) => ({
          ...prev,
          direccion: "",
          ciudad: "",
        }));
        setEdicionManualUbicacion({ direccion: true, ciudad: true });
        setMensaje({
          tipo: "aviso",
          texto:
            "Ubicación guardada, pero no se pudo consultar la dirección automática. Ya puedes escribir la dirección y ciudad manualmente.",
        });
      } finally {
        setBuscandoDireccion(false);
      }
    }
  }

  async function registrarEstacionamiento(evento) {
    evento.preventDefault();
    setMensaje(null);
    setConfirmarLimpiar(false);

    const nuevosErrores = validarFormulario(formulario, coordenadas);
    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      setMensaje({
        tipo: "error",
        texto: "Revisa los campos marcados antes de enviar el formulario.",
      });
      return;
    }

    setCargando(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/estacionamientos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formulario.nombre.trim(),
          direccion: formulario.direccion.trim(),
          ciudad: formulario.ciudad.trim(),
          capacidad: Number(formulario.capacidad),
          hora_apertura: formulario.hora_apertura,
          hora_cierre: formulario.hora_cierre,
          telefono: formulario.telefono.replace(/\D/g, ""),
          lat: coordenadas.lat,
          lng: coordenadas.lng,
          coordenadaId: coordenadas.id,
        }),
      });

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
      setEdicionManualUbicacion({ direccion: false, ciudad: false });
      setErrores({});
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          error.message === "Failed to fetch"
            ? "No hay conexión con el servidor. Verifica tu conexión a internet o que el backend esté activo."
            : error.message,
      });
    } finally {
      setCargando(false);
    }
  }

  function solicitarLimpiarFormulario() {
    const hayDatos =
      coordenadas !== null ||
      formulario.nombre.trim() !== "" ||
      formulario.direccion.trim() !== "" ||
      formulario.ciudad.trim() !== "" ||
      formulario.capacidad !== "" ||
      formulario.telefono !== "" ||
      formulario.hora_apertura !== formularioInicial.hora_apertura ||
      formulario.hora_cierre !== formularioInicial.hora_cierre;

    if (!hayDatos) {
      ejecutarLimpiarFormulario();
      return;
    }

    setConfirmarLimpiar(true);
  }

  function ejecutarLimpiarFormulario() {
    setFormulario(formularioInicial);
    setCoordenadas(null);
    setEdicionManualUbicacion({ direccion: false, ciudad: false });
    setErrores({});
    setConfirmarLimpiar(false);
    setMensaje({
      tipo: "aviso",
      texto: "Se limpiaron todos los campos del formulario.",
    });
  }

  const bloqueado = cargando || buscandoDireccion;

  return (
    <div className="pagina">
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
        .coordenadas-card--error {
          border-color: #ef4444;
          background: #fef2f2;
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

        .campo input[readOnly] {
          cursor: not-allowed;
          opacity: 0.85;
        }

        .error-campo {
          display: block;
          margin-top: 5px;
          font-size: .8rem;
          font-weight: 500;
          color: #dc2626;
        }
        .campo input[aria-invalid="true"] {
          border-color: #ef4444;
        }

        .mensaje.aviso {
          background: #fffbeb;
          border: 1px solid #fcd34d;
          color: #92400e;
        }

        .confirmacion-limpiar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          padding: 12px 16px;
          margin-top: 14px;
          border-radius: 10px;
          background: #fffbeb;
          border: 1px solid #fcd34d;
          color: #92400e;
          font-size: .88rem;
        }
        .confirmacion-limpiar__info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
        }
        .confirmacion-limpiar__botones {
          display: flex;
          gap: 8px;
        }
        .confirmacion-limpiar__btn {
          padding: 6px 12px;
          border-radius: 7px;
          border: none;
          font-size: .82rem;
          font-weight: 600;
          cursor: pointer;
        }
        .confirmacion-limpiar__btn--cancelar {
          background: #fef3c7;
          color: #78350f;
        }
        .confirmacion-limpiar__btn--confirmar {
          background: #d97706;
          color: #fff;
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

        <form className="formulario" onSubmit={registrarEstacionamiento} noValidate>
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
              aria-invalid={Boolean(errores.nombre)}
            />
            {errores.nombre && <span className="error-campo">{errores.nombre}</span>}
          </div>

          <div className="campo">
            <label htmlFor="direccion">Dirección completa *</label>
            <input
              id="direccion"
              name="direccion"
              type="text"
              placeholder={
                buscandoDireccion
                  ? "Obteniendo dirección..."
                  : edicionManualUbicacion.direccion
                  ? "Escribe la calle, número y colonia..."
                  : "Selecciona el lugar en el mapa"
              }
              value={formulario.direccion}
              onChange={manejarCambio}
              readOnly={!edicionManualUbicacion.direccion}
              aria-readonly={!edicionManualUbicacion.direccion}
              maxLength={200}
              aria-invalid={Boolean(errores.direccion)}
            />
            {errores.direccion && (
              <span className="error-campo">{errores.direccion}</span>
            )}
          </div>

          <div className="campo">
            <label htmlFor="ciudad">Ciudad o municipio *</label>
            <input
              id="ciudad"
              name="ciudad"
              type="text"
              placeholder={
                buscandoDireccion
                  ? "Obteniendo ciudad o municipio..."
                  : edicionManualUbicacion.ciudad
                  ? "Escribe la ciudad o municipio..."
                  : "Selecciona el lugar en el mapa"
              }
              value={formulario.ciudad}
              onChange={manejarCambio}
              readOnly={!edicionManualUbicacion.ciudad}
              aria-readonly={!edicionManualUbicacion.ciudad}
              maxLength={100}
              aria-invalid={Boolean(errores.ciudad)}
            />
            {errores.ciudad && <span className="error-campo">{errores.ciudad}</span>}
          </div>

          <div className="seccion-titulo">
            <MapPinned size={19} />
            <h4>Ubicación geográfica</h4>
          </div>

          <div className="coordenadas-seccion">
            <div
              className={`coordenadas-card ${
                coordenadas ? "coordenadas-card--activa" : ""
              } ${errores.coordenadas ? "coordenadas-card--error" : ""}`}
            >
              <div className="coordenadas-icono">
                {coordenadas ? <Sparkles size={20} /> : <MapPin size={20} />}
              </div>
              <div className="coordenadas-texto">
                {coordenadas ? (
                  <>
                    <strong>
                      {buscandoDireccion
                        ? "Buscando dirección..."
                        : "Ubicación seleccionada"}
                    </strong>
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
                disabled={bloqueado}
              >
                <MapPinned size={16} />
                {coordenadas ? "Cambiar" : "Abrir mapa"}
              </button>
            </div>
            {errores.coordenadas && (
              <span className="error-campo">{errores.coordenadas}</span>
            )}
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
                type="text"
                inputMode="numeric"
                placeholder="Ej. 120"
                value={formulario.capacidad}
                onKeyDown={bloquearNoDigitos}
                onChange={manejarCambio}
                maxLength={5}
                aria-invalid={Boolean(errores.capacidad)}
              />
              <small>Número total de vehículos que puede recibir.</small>
              {errores.capacidad && (
                <span className="error-campo">{errores.capacidad}</span>
              )}
            </div>

            <div className="campo">
              <label htmlFor="telefono">Teléfono de contacto *</label>
              <div className="entrada-icono">
                <Phone size={17} />
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  inputMode="numeric"
                  placeholder="Ej. 5512345678"
                  value={formulario.telefono}
                  onKeyDown={bloquearNoDigitos}
                  onChange={manejarCambio}
                  maxLength={10}
                  aria-invalid={Boolean(errores.telefono)}
                />
              </div>
              {errores.telefono && (
                <span className="error-campo">{errores.telefono}</span>
              )}
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
                  aria-invalid={Boolean(errores.hora_apertura)}
                />
              </div>
              {errores.hora_apertura && (
                <span className="error-campo">{errores.hora_apertura}</span>
              )}
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
                  aria-invalid={Boolean(errores.hora_cierre)}
                />
              </div>
              {errores.hora_cierre && (
                <span className="error-campo">{errores.hora_cierre}</span>
              )}
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
              ) : mensaje.tipo === "aviso" ? (
                <AlertTriangle size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
              <span>{mensaje.texto}</span>
            </div>
          )}

          {confirmarLimpiar && (
            <div className="confirmacion-limpiar" role="alert">
              <div className="confirmacion-limpiar__info">
                <AlertTriangle size={18} />
                <span>¿Seguro que deseas limpiar todos los campos?</span>
              </div>
              <div className="confirmacion-limpiar__botones">
                <button
                  type="button"
                  className="confirmacion-limpiar__btn confirmacion-limpiar__btn--cancelar"
                  onClick={() => setConfirmarLimpiar(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="confirmacion-limpiar__btn confirmacion-limpiar__btn--confirmar"
                  onClick={ejecutarLimpiarFormulario}
                >
                  Sí, limpiar
                </button>
              </div>
            </div>
          )}

          <div className="acciones">
            <button
              type="button"
              className="boton-secundario"
              onClick={solicitarLimpiarFormulario}
              disabled={bloqueado}
            >
              <RotateCcw size={17} />
              Limpiar
            </button>

            <button
              type="submit"
              className="boton-principal"
              disabled={bloqueado}
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
          onConfirmar={manejarConfirmarMapa}
        />
      )}
    </div>
  );
}

export default RegistrarEstacionamiento;