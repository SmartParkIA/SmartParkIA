import { useState, useEffect } from "react";
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
  Edit3
} from "lucide-react";
import { auth } from "../firebase/config.js";
import "../styles/RegistrarEstacionamiento.css";

const formularioInicial = {
  nombre: "",
  direccion: "",
  ciudad: "",
  capacidad: "",
  hora_apertura: "06:00",
  hora_cierre: "22:00",
  telefono: ""
};

function RegistrarEstacionamiento() {
  const [modo, setModo] = useState("registrar"); // "registrar" o "modificar"
  const [listaEstacionamientos, setListaEstacionamientos] = useState([]);
  const [idSeleccionado, setIdSeleccionado] = useState("");
  
  const [formulario, setFormulario] = useState(formularioInicial);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    cargarEstacionamientos();
  }, []);

  async function cargarEstacionamientos() {
    try {
      const respuesta = await fetch("http://localhost:3001/api/estacionamientos");
      if (respuesta.ok) {
        const datos = await respuesta.json();
        setListaEstacionamientos(datos);
      }
    } catch (error) {
      console.error("No se pudo cargar la lista de estacionamientos:", error);
    }
  }

  function manejarCambio(evento) {
    const { name, value } = evento.target;
    setFormulario((anterior) => ({
      ...anterior,
      [name]: value
    }));
    setMensaje(null);
  }

  function seleccionarSedeAModificar(e) {
    const id = e.target.value;
    setIdSeleccionado(id);
    setMensaje(null);

    if (!id) {
      setFormulario(formularioInicial);
      return;
    }

    const sedeEncontrada = listaEstacionamientos.find((s) => s.id === id);
    if (sedeEncontrada) {
      setFormulario({
        nombre: sedeEncontrada.nombre || "",
        direccion: sedeEncontrada.direccion || "",
        ciudad: sedeEncontrada.ciudad || "",
        capacidad: sedeEncontrada.capacidad || "",
        hora_apertura: sedeEncontrada.hora_apertura || "06:00",
        hora_cierre: sedeEncontrada.hora_cierre || "22:00",
        telefono: sedeEncontrada.telefono || ""
      });
    }
  }

  async function enviarFormulario(evento) {
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
      const responsableActual = auth.currentUser?.email || "Administrador";

      let url = "http://localhost:3001/api/estacionamientos";
      let method = "POST";

      if (modo === "modificar") {
        if (!idSeleccionado) {
          setMensaje({ tipo: "error", texto: "Selecciona una sede para modificar." });
          setCargando(false);
          return;
        }
        url = `http://localhost:3001/api/estacionamientos/${idSeleccionado}`;
        method = "PUT";
      }

      const respuesta = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...formulario,
          capacidad: Number(formulario.capacidad),
          responsable: responsableActual
        })
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(resultado.mensaje || "No fue posible completar la operación.");
      }

      setMensaje({
        tipo: "exito",
        texto: resultado.mensaje
      });

      if (modo === "registrar") {
        setFormulario(formularioInicial);
      }
      
      cargarEstacionamientos();
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
    setIdSeleccionado("");
    setMensaje(null);
  }

  return (
    <div className="pagina">
      <main className="contenido">
        <div className="ruta">
          <span>Administración</span>
          <span>/</span>
          <strong>{modo === "registrar" ? "Registrar estacionamiento" : "Modificar estacionamiento"}</strong>
        </div>

        <section className="introduccion">
          <div className="introduccion-icono">
            {modo === "registrar" ? <Building2 size={27} /> : <Edit3 size={27} />}
          </div>
          <div>
            <h2>{modo === "registrar" ? "Registrar nueva sede" : "Modificar sede existente"}</h2>
            <p>
              {modo === "registrar"
                ? "Ingresa la información general para dar de alta una nueva sede."
                : "Selecciona una sede y actualiza su información en tiempo real."}
            </p>
          </div>
        </section>

        {/* Pestañas de control para Registrar / Modificar (HU-31) */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <button
            type="button"
            onClick={() => { setModo("registrar"); limpiarFormulario(); }}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
              background: modo === "registrar" ? "#00f2fe" : "#1e293b",
              color: modo === "registrar" ? "#000" : "#fff"
            }}
          >
            + Registrar Nueva
          </button>
          <button
            type="button"
            onClick={() => { setModo("modificar"); limpiarFormulario(); }}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
              background: modo === "modificar" ? "#00f2fe" : "#1e293b",
              color: modo === "modificar" ? "#000" : "#fff"
            }}
          >
            ✏️ Modificar Existente (HU-31)
          </button>
        </div>

        <form className="formulario" onSubmit={enviarFormulario}>
          <div className="formulario-cabecera">
            <div>
              <h3>{modo === "registrar" ? "Información general" : "Editar datos de la sede"}</h3>
              <p>Los campos marcados con * son obligatorios.</p>
            </div>

            <span className="estado-nuevo">
              <span className="punto" />
              {modo === "registrar" ? "Nueva sede" : "Modificando sede"}
            </span>
          </div>

          {modo === "modificar" && (
            <div className="campo" style={{ marginBottom: "20px", background: "#0f172a", padding: "15px", borderRadius: "8px", border: "1px solid #334155" }}>
              <label htmlFor="sedeSelect" style={{ color: "#00f2fe", fontWeight: "bold" }}>Selecciona el estacionamiento a modificar *</label>
              <select
                id="sedeSelect"
                value={idSeleccionado}
                onChange={seleccionarSedeAModificar}
                style={{ width: "100%", padding: "10px", marginTop: "8px", borderRadius: "6px", background: "#1e293b", color: "#fff", border: "1px solid #475569" }}
              >
                <option value="">-- Selecciona una sede --</option>
                {listaEstacionamientos.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.nombre} ({sede.ciudad})
                  </option>
                ))}
              </select>
            </div>
          )}

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
              disabled={cargando || (modo === "modificar" && !idSeleccionado)}
            >
              <Save size={18} />
              {cargando
                ? "Guardando..."
                : modo === "registrar"
                ? "Registrar sede"
                : "Guardar cambios"}
            </button>
          </div>
        </form>

        <p className="nota-inferior">
          <CheckCircle2 size={15} />
          {modo === "registrar"
            ? "La información se guardará en la base de datos del sistema."
            : "Los cambios se registrarán con fecha y usuario responsable en Firestore."}
        </p>
      </main>
    </div>
  );
}

export default RegistrarEstacionamiento;