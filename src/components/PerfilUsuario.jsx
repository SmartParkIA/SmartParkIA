import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FaUser, FaEnvelope, FaCalendarAlt, FaIdBadge, FaEdit, FaSave, FaTimes } from "react-icons/fa";
import { getPerfil, updatePerfil } from "../services/userService";
import toast from "react-hot-toast";

export default function PerfilUsuario({ uid }) {
  const [perfil, setPerfil] = useState(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await getPerfil(uid);
      setPerfil(data);
      setForm(data || {});
      setLoading(false);
    })();
  }, [uid]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const guardar = async () => {
    try {
      const { uid: _u, ...rest } = form;
      await updatePerfil(uid, rest);
      setPerfil(form);
      setEditando(false);
      toast.success("Perfil actualizado ✨");
    } catch (e) {
      toast.error("Error al actualizar");
    }
  };

  if (loading) return <p style={{ color: "#B0B0B0" }}>Cargando perfil...</p>;
  if (!perfil) return <p style={{ color: "#B0B0B0" }}>Perfil no encontrado</p>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      style={{
        background: "var(--gris-carbono)",
        border: "1px solid var(--gris-borde)",
        borderRadius: 20,
        padding: 28,
        maxWidth: 620,
        margin: "0 auto",
        boxShadow: "0 10px 40px rgba(0,0,0,0.6)"
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <motion.div
          whileHover={{ scale: 1.08, rotate: 5 }}
          style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "#1E1E1E",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #333"
          }}
        >
          <FaUser size={28} color="#FFF" />
        </motion.div>
        <div>
          <h2 style={{ color: "#FFF", fontSize: 22, margin: 0 }}>
            {perfil.nombres} {perfil.apellidoPaterno}
          </h2>
          <span style={{ color: "#B0B0B0", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <FaIdBadge /> {perfil.rol} · {perfil.estadotrue ? "Activo" : "Inactivo"}
          </span>
        </div>
      </div>

      {/* Campos */}
      <div style={{ display: "grid", gap: 16 }}>
        <Campo icon={<FaUser />} label="Nombres" name="nombres" value={form.nombres || ""} editando={editando} onChange={handleChange} />
        <Campo icon={<FaUser />} label="Apellido Paterno" name="apellidoPaterno" value={form.apellidoPaterno || ""} editando={editando} onChange={handleChange} />
        <Campo icon={<FaUser />} label="Apellido Materno" name="apellidoMaterno" value={form.apellidoMaterno || ""} editando={editando} onChange={handleChange} />
        <Campo icon={<FaEnvelope />} label="Correo" name="correo" value={form.correo || ""} editando={editando} onChange={handleChange} />
        <Campo icon={<FaCalendarAlt />} label="Fecha de Nacimiento" name="fechaNacimiento" value={form.fechaNacimiento || ""} editando={editando} onChange={handleChange} />
      </div>

      {/* Botones */}
      <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
        {!editando ? (
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setEditando(true)}
            style={btnStylePrimario}
          >
            <FaEdit /> Editar
          </motion.button>
        ) : (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setForm(perfil); setEditando(false); }}
              style={btnStyleSecundario}
            >
              <FaTimes /> Cancelar
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={guardar}
              style={btnStylePrimario}
            >
              <FaSave /> Guardar
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ---------- Subcomponente Campo ---------- */
function Campo({ icon, label, name, value, editando, onChange }) {
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#B0B0B0", marginBottom: 6 }}>
        {icon} {label}
      </label>
      <input name={name} value={value} onChange={onChange} disabled={!editando} />
    </motion.div>
  );
}

const btnStylePrimario = {
  background: "#FFFFFF", color: "#000", border: "none",
  padding: "10px 20px", borderRadius: 10, cursor: "pointer",
  display: "flex", alignItems: "center", gap: 8, fontWeight: 600
};

const btnStyleSecundario = {
  background: "transparent", color: "#FFF", border: "1px solid #333",
  padding: "10px 20px", borderRadius: 10, cursor: "pointer",
  display: "flex", alignItems: "center", gap: 8
};