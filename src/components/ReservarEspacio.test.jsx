// src/components/ReservarEspacio.jsx (Fragmento de los cambios clave)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUsuario } from "../hooks/useUsuario.js"; // 🔥 Hook
import { crearReservaEspacio } from "../services/reservarEspacioService.js"; // 🔥 Servicio
// ... (importa tus iconos)

export default function ReservarEspacio() {
  const navigate = useNavigate();
  const { usuario, cargando } = useUsuario(); // 🔥 Usamos el hook

  const [saving, setSaving] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    estacionamiento: "SmartPark Central - Zona A", // 🔥 Valor por defecto para la prueba
    espacio: "",
    fecha: "",
    horario: "",
    duracion: 2,
  });

  // ... (Tu lógica de handleChange)

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!usuario) {
      setError("Inicia sesión para reservar.");
      return;
    }

    if (!form.espacio.trim()) {
      setError("Debes seleccionar el estacionamiento y el cajón.");
      return;
    }

    const inicio = new Date(`${form.fecha}T${form.horario}`);
    if (inicio <= new Date()) {
      setError("El horario seleccionado ya pasó.");
      return;
    }

    setSaving(true);
    try {
      // 🔥 Llamamos al servicio
      const codigoReserva = await crearReservaEspacio({
        usuario,
        estacionamiento: form.estacionamiento,
        espacio: form.espacio,
        fecha: form.fecha,
        horario: form.horario,
        duracion: form.duracion.toString(),
      });

      // 🔥 Mensaje exacto que pide la prueba
      setMensajeExito(`Reserva confirmada. Tu código es ${codigoReserva}.`);
      setForm(prev => ({ ...prev, espacio: "" })); // Limpiar cajón
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (cargando) return <p>Cargando...</p>;

  return (
    <div className="res-page">
      {/* 🔥 Título exacto que pide la prueba */}
      <h2>Reservar Espacio</h2> 

      {!usuario && <div role="alert" style={{ color: "red" }}>Inicia sesión para reservar.</div>}
      {error && <div role="alert" style={{ color: "red" }}>{error}</div>}
      {mensajeExito && <div role="status" style={{ color: "green" }}>{mensajeExito}</div>}

      <form onSubmit={handleSubmit}>
        <div>
          {/* 🔥 Label exacto */}
          <label htmlFor="estacionamiento">Estacionamiento / Zona</label>
          <input 
            id="estacionamiento" 
            value={form.estacionamiento} 
            onChange={(e) => setForm({...form, estacionamiento: e.target.value})} 
          />
        </div>

        <div>
          {/* 🔥 Label exacto */}
          <label htmlFor="espacio">Cajón / Espacio Disponible</label>
          <input 
            id="espacio" 
            value={form.espacio} 
            onChange={(e) => setForm({...form, espacio: e.target.value})} 
          />
        </div>

        <div>
          <label htmlFor="fecha">Fecha</label>
          <input 
            id="fecha" 
            type="date"
            value={form.fecha} 
            onChange={(e) => setForm({...form, fecha: e.target.value})} 
          />
        </div>

        <div>
          {/* 🔥 Label exacto */}
          <label htmlFor="horario">Hora de Inicio</label>
          <input 
            id="horario" 
            type="time"
            value={form.horario} 
            onChange={(e) => setForm({...form, horario: e.target.value})} 
          />
        </div>

        <div>
          <label htmlFor="duracion">Duración (Horas)</label>
          <input 
            id="duracion" 
            type="number"
            value={form.duracion} 
            onChange={(e) => setForm({...form, duracion: e.target.value})} 
          />
        </div>

        <button type="submit" disabled={saving || !usuario}>
          {saving ? "Guardando..." : "Confirmar Reserva"}
        </button>
      </form>
    </div>
  );
}