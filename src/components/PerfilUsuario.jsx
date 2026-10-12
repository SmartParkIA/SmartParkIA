import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FaUser, FaEnvelope, FaCalendarAlt,
  FaIdBadge, FaEdit, FaSave, FaTimes,
} from "react-icons/fa";
import { getPerfil, updatePerfil } from "../services/userService";
import toast from "react-hot-toast";

/* =========================================================
   ESTILOS (objetos reutilizables, sin CSS externo)
   ========================================================= */
const COLORS = {
  bg: "var(--gris-carbono)",
  border: "var(--gris-borde)",
  surface: "#0f0f0f",
  surfaceAlt: "#1E1E1E",
  text: "#FFFFFF",
  textMuted: "#B0B0B0",
  success: "#22c55e",
  danger: "#ef4444",
};

const styles = {
  card: {
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 20,
    padding: 28,
    maxWidth: 620,
    margin: "0 auto",
    boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
    paddingBottom: 20,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #1E1E1E, #2b2b2b)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #333",
    flexShrink: 0,
  },
  name: {
    color: COLORS.text,
    fontSize: 22,
    margin: "0 0 4px",
    fontWeight: 600,
  },
  meta: {
    color: COLORS.textMuted,
    fontSize: 13,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  fields: { display: "grid", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: 500,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  actions: {
    display: "flex",
    gap: 12,
    marginTop: 24,
    justifyContent: "flex-end",
  },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 20px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    border: "1px solid transparent",
    fontFamily: "inherit",
  },
  btnPrimary: {
    background: COLORS.text,
    color: "#000",
  },
  btnSecondary: {
    background: "transparent",
    color: COLORS.text,
    borderColor: "#333",
  },
  state: {
    color: COLORS.textMuted,
    textAlign: "center",
    padding: 24,
  },
};

// Estilos derivados (dependen de props/estado)
const badgeStyle = (activo) => ({
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  marginLeft: 6,
  background: activo ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
  color: activo ? COLORS.success : COLORS.danger,
});

const inputStyle = (editando, focused) => ({
  background: editando ? COLORS.surface : "transparent",
  border: `1px solid ${
    editando ? (focused ? COLORS.text : COLORS.border) : "transparent"
  }`,
  borderRadius: 10,
  padding: editando ? "12px 14px" : "4px 0",
  color: editando ? COLORS.text : "#eaeaea",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  boxShadow: focused && editando ? "0 0 0 3px rgba(255,255,255,0.08)" : "none",
  transition: "border-color .2s, box-shadow .2s, background .2s, padding .2s",
});

/* =========================================================
   CONFIGURACIÓN DE CAMPOS
   ========================================================= */
const CAMPOS = [
  { icon: <FaUser />,        label: "Nombres",             name: "nombres" },
  { icon: <FaUser />,        label: "Apellido Paterno",    name: "apellidoPaterno" },
  { icon: <FaUser />,        label: "Apellido Materno",    name: "apellidoMaterno" },
  { icon: <FaEnvelope />,    label: "Correo",              name: "correo" },
  { icon: <FaCalendarAlt />, label: "Fecha de Nacimiento", name: "fechaNacimiento" },
];

/* =========================================================
   SUBCOMPONENTE CAMPO
   ========================================================= */
function Campo({ icon, label, name, value, editando, onChange }) {
  const [focused, setFocused] = useState(false);

  return (
    <motion.div
      style={styles.field}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
    >
      <label htmlFor={`field-${name}`} style={styles.label}>
        {icon} {label}
      </label>
      <input
        id={`field-${name}`}
        name={name}
        value={value}
        onChange={onChange}
        disabled={!editando}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={inputStyle(editando, focused)}
      />
    </motion.div>
  );
}

/* =========================================================
   COMPONENTE PRINCIPAL
   ========================================================= */
export default function PerfilUsuario({ uid }) {
  const [perfil, setPerfil]     = useState(null);
  const [form, setForm]         = useState({});
  const [editando, setEditando] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        setLoading(true);
        const data = await getPerfil(uid);
        if (cancelado) return;
        setPerfil(data);
        setForm(data ?? {});
      } catch {
        toast.error("No se pudo cargar el perfil");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => { cancelado = true; };
  }, [uid]);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const cancelar = () => {
    setForm(perfil ?? {});
    setEditando(false);
  };

  const guardar = async () => {
    try {
      setSaving(true);
      const { uid: _u, ...rest } = form;
      await updatePerfil(uid, rest);
      setPerfil(form);
      setEditando(false);
      toast.success("Perfil actualizado ✨");
    } catch {
      toast.error("Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={styles.state}>Cargando perfil...</p>;
  if (!perfil) return <p style={styles.state}>Perfil no encontrado</p>;

  const activo = perfil.estado === true || perfil.estado === "activo";

  return (
    <motion.div
      style={styles.card}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Header */}
      <header style={styles.header}>
        <motion.div style={styles.avatar} whileHover={{ scale: 1.08, rotate: 5 }}>
          <FaUser size={28} color="#FFF" />
        </motion.div>
        <div>
          <h2 style={styles.name}>
            {perfil.nombres} {perfil.apellidoPaterno}
          </h2>
          <span style={styles.meta}>
            <FaIdBadge /> {perfil.rol}
            <span style={badgeStyle(activo)}>
              {activo ? "Activo" : "Inactivo"}
            </span>
          </span>
        </div>
      </header>

      {/* Campos */}
      <div style={styles.fields}>
        {CAMPOS.map((c) => (
          <Campo
            key={c.name}
            {...c}
            value={form[c.name] ?? ""}
            editando={editando}
            onChange={handleChange}
          />
        ))}
      </div>

      {/* Botones */}
      <div style={styles.actions}>
        {!editando ? (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setEditando(true)}
            style={{ ...styles.btn, ...styles.btnPrimary }}
          >
            <FaEdit /> Editar
          </motion.button>
        ) : (
          <>
            <motion.button
              whileHover={{ scale: saving ? 1 : 1.04 }}
              whileTap={{ scale: saving ? 1 : 0.96 }}
              onClick={cancelar}
              disabled={saving}
              style={{
                ...styles.btn,
                ...styles.btnSecondary,
                opacity: saving ? 0.6 : 1,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              <FaTimes /> Cancelar
            </motion.button>
            <motion.button
              whileHover={{ scale: saving ? 1 : 1.04 }}
              whileTap={{ scale: saving ? 1 : 0.96 }}
              onClick={guardar}
              disabled={saving}
              style={{
                ...styles.btn,
                ...styles.btnPrimary,
                opacity: saving ? 0.6 : 1,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              <FaSave /> {saving ? "Guardando..." : "Guardar"}
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
}