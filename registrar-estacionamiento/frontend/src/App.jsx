
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
  ParkingSquare
} from "lucide-react";
import "./App.css";

const formularioInicial = {
  nombre: "",
  direccion: "",
  ciudad: "",
  capacidad: "",
  hora_apertura: "06:00",
  hora_cierre: "22:00",
  telefono: ""
};

function App() {
  const [formulario, setFormulario] = useState(formularioInicial);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  function manejarCambio(evento) {
    const { name, value } = evento.target;

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value
    }));

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
        texto: "Completa todos los campos obligatorios."
      });
      return;
    }

    if (
      !Number.isSafeInteger(Number(formulario.capacidad)) ||
      Number(formulario.capacidad) <= 0
    ) {
      setMensaje({
        tipo: "error",
        texto: "La capacidad debe ser un entero mayor que cero."
      });
      return;
    }

    setCargando(true);

    try {
      const respuesta = await fetch(
        "http://localhost:3001/api/estacionamientos",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ...formulario,
            capacidad: Number(formulario.capacidad)
          })
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
        texto: `${resultado.mensaje} Folio: ${resultado.estacionamiento.id}`
      });

      setFormulario(formularioInicial);
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          error.message === "Failed to fetch"
            ? "No hay conexión con el servidor. Verifica que el backend esté iniciado."
            : error.message
      });
    } finally {
      setCargando(false);
    }
  }

  function limpiarFormulario() {
    setFormulario(formularioInicial);
    setMensaje(null);
  }

  return (
    <div className="pagina">
      <header className="encabezado">
        <div className="marca">
          <div className="marca-icono">
            <ParkingSquare size={28} />
          </div>

          <div>
            <h1>ParkAdmin</h1>
            <p>Administración de estacionamientos</p>
          </div>
        </div>

        <span className="etiqueta-admin">Panel administrativo</span>
      </header>

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
              Ingresa la información general para dar de alta
              una nueva sede de estacionamiento.
            </p>
          </div>
        </section>

        <form
          className="formulario"
          onSubmit={registrarEstacionamiento}
        >
          <div className="formulario-cabecera">
            <div>
              <h3>Información general</h3>
              <p>Los campos marcados con * son obligatorios.</p>
            </div>

            <span className="estado-nuevo">
              <span className="punto" />
              Nueva sede
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

          <div className="seccion-titulo">
            <CarFront size={19} />
            <h4>Capacidad y horarios</h4>
          </div>

          <div className="rejilla">
            <div className="campo">
              <label htmlFor="capacidad">
                Capacidad de vehículos *
              </label>
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

      <footer className="pie">
        ParkAdmin · Módulo de administración de estacionamientos
      </footer>
    </div>
  );
}

export default App;
