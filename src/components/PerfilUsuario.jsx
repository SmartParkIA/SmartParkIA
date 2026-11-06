import { useEffect, useState } from "react";
import { FaUser, FaEnvelope, FaCalendarAlt, FaIdBadge, FaEdit, FaSave, FaTimes, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { getPerfil, updatePerfil } from "../services/userService";
import VehiculoForm from "./VehiculoForm"; // <-- IMPORTAMOS EL FORMULARIO DE VEHÍCULOS
import "../styles/forms.css";

export default function PerfilUsuario({ uid }) {
  const [perfil, setPerfil] = useState(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const data = await getPerfil(uid);
        setPerfil(data);
        setForm(data || {});
      } catch (error) {
        console.error("Error al cargar perfil:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const guardar = async () => {
    try {
      const { uid: _u, ...rest } = form;
      await updatePerfil(uid, rest);
      setPerfil(form);
      setEditando(false);
      showToast("Datos personales actualizados ✨", "success");
    } catch (e) {
      showToast("Error al actualizar los datos", "error");
    }
  };

  if (loading) return <p style={{ color: "#94a3b8", textAlign: "center" }}>Cargando perfil...</p>;
  if (!perfil) return <p style={{ color: "#94a3b8", textAlign: "center" }}>Perfil no encontrado</p>;

  return (
    <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
      
      {/* =========================================
          SECCIÓN 1: DATOS PERSONALES
         ========================================= */}
      <div className="form-card" style={{ marginBottom: "40px" }}>
        <header className="form-header">
          <div className="form-icon-box">
            <FaUser size={26} />
          </div>
          <div>
            <h2>{perfil.nombres} {perfil.apellidoPaterno}</h2>
            <p style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FaIdBadge /> {perfil.rol} · {perfil.estado ? "Activo" : "Inactivo"}
            </p>
          </div>
        </header>

        <div className="form-fields" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div className="form-group">
            <label className="form-label"><FaUser /> Nombres</label>
            <input name="nombres" value={form.nombres || ""} onChange={handleChange} disabled={!editando} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label"><FaUser /> Apellido Paterno</label>
            <input name="apellidoPaterno" value={form.apellidoPaterno || ""} onChange={handleChange} disabled={!editando} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label"><FaUser /> Apellido Materno</label>
            <input name="apellidoMaterno" value={form.apellidoMaterno || ""} onChange={handleChange} disabled={!editando} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label"><FaEnvelope /> Correo Electrónico</label>
            <input name="correo" value={form.correo || ""} onChange={handleChange} disabled={!editando} className="form-input" />
          </div>
        </div>

        <div className="form-actions">
          {!editando ? (
            <button onClick={() => setEditando(true)} className="btn-primary">
              <FaEdit /> Editar Datos
            </button>
          ) : (
            <>
              <button onClick={() => { setForm(perfil); setEditando(false); }} className="btn-secondary">
                <FaTimes /> Cancelar
              </button>
              <button onClick={guardar} className="btn-primary">
                <FaSave /> Guardar Cambios
              </button>
            </>
          )}
        </div>
      </div>

      {/* =========================================
          SECCIÓN 2: FORMULARIO DE VEHÍCULOS
         ========================================= */}
      <div style={{ marginTop: "20px" }}>
        <h2 style={{ color: "#fff", fontSize: "24px", marginBottom: "20px", paddingLeft: "10px", borderLeft: "4px solid #00f2fe" }}>
          Gestión de Vehículos
        </h2>
        {/* Aquí inyectamos el formulario del vehículo con su uid */}
        <VehiculoForm uid={uid} />
      </div>

      {/* TOAST */}
      {toast && (
        <div className={`toast-alert ${toast.type}`}>
          {toast.type === "success" ? <FaCheckCircle size={20} /> : <FaExclamationCircle size={20} />}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}