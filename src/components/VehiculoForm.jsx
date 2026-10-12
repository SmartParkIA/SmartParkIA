import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FaCar, FaIdCard, FaTag, FaHashtag, FaSave } from "react-icons/fa";
import { saveVehiculo, getVehiculo } from "../services/userService";
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
};

const styles = {
  form: {
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 20,
    padding: 28,
    maxWidth: 620,
    margin: "24px auto 0",
    boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
    paddingBottom: 18,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: COLORS.surfaceAlt,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #333",
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: 20,
    color: COLORS.text,
    fontWeight: 600,
  },
  subtitle: {
    margin: "2px 0 0",
    fontSize: 12,
    color: COLORS.textMuted,
  },
  fields: {
    display: "grid",
    gap: 16,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
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
  submitBtn: (loading) => ({
    marginTop: 22,
    width: "100%",
    background: COLORS.text,
    color: "#000",
    border: "none",
    padding: "14px",
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 15,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.6 : 1,
    transition: "opacity .2s",
    fontFamily: "inherit",
  }),
};

// Estilo derivado para el input (depende de focus)
const inputStyle = (focused) => ({
  background: COLORS.surface,
  border: `1px solid ${focused ? COLORS.text : COLORS.border}`,
  borderRadius: 10,
  padding: "12px 14px",
  color: COLORS.text,
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  boxShadow: focused ? "0 0 0 3px rgba(255,255,255,0.08)" : "none",
  transition: "border-color .2s, box-shadow .2s",
});

/* =========================================================
   CONFIGURACIÓN DE CAMPOS
   ========================================================= */
const CAMPOS = [
  { icon: <FaIdCard />, label: "Placa",  name: "placa",  placeholder: "ABC-123" },
  { icon: <FaTag />,    label: "Marca",  name: "marca",  placeholder: "Toyota" },
  { icon: <FaHashtag />,label: "Modelo", name: "modelo", placeholder: "Corolla 2020" },
];

/* =========================================================
   SUBCOMPONENTE CAMPO
   ========================================================= */
function Campo({ icon, label, name, value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false);
  const id = `vehiculo-${name}`;

  return (
    <motion.div
      style={styles.field}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
    >
      <label htmlFor={id} style={styles.label}>
        {icon} {label}
      </label>
      <input
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={inputStyle(focused)}
      />
    </motion.div>
  );
}

/* =========================================================
   COMPONENTE PRINCIPAL
   ========================================================= */
export default function VehiculoForm({ uid }) {
  const [form, setForm] = useState({ placa: "", marca: "", modelo: "" });
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const v = await getVehiculo(uid);
        if (cancelado || !v) return;
        setForm({
          placa:  v.placa  ?? "",
          marca:  v.marca  ?? "",
          modelo: v.modelo ?? "",
        });
      } catch {
        toast.error("No se pudo cargar el vehículo");
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => { cancelado = true; };
  }, [uid]);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const guardar = async (e) => {
    e.preventDefault();

    const limpio = {
      placa:  form.placa.trim().toUpperCase(),
      marca:  form.marca.trim(),
      modelo: form.modelo.trim(),
    };

    if (!limpio.placa || !limpio.marca || !limpio.modelo) {
      toast.error("Completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      await saveVehiculo(uid, limpio);
      setForm(limpio);
      toast.success("Vehículo guardado 🚗");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      onSubmit={guardar}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15 }}
      style={styles.form}
    >
      {/* Header */}
      <header style={styles.header}>
        <motion.div
          style={styles.iconWrap}
          animate={{ rotate: [0, 8, -8, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        >
          <FaCar size={26} color="#FFF" />
        </motion.div>
        <div>
          <h2 style={styles.title}>Datos del Vehículo</h2>
          <p style={styles.subtitle}>
            Registra o modifica la información de tu auto
          </p>
        </div>
      </header>

      {/* Campos */}
      <div style={styles.fields}>
        {CAMPOS.map((c) => (
          <Campo
            key={c.name}
            {...c}
            value={form[c.name]}
            onChange={handleChange}
          />
        ))}
      </div>

      {/* Botón */}
      <motion.button
        type="submit"
        disabled={loading || cargando}
        whileHover={{ scale: loading ? 1 : 1.02 }}
        whileTap={{ scale: loading ? 1 : 0.98 }}
        style={styles.submitBtn(loading || cargando)}
      >
        <FaSave /> {loading ? "Guardando..." : "Guardar Vehículo"}
      </motion.button>
    </motion.form>
  );
}