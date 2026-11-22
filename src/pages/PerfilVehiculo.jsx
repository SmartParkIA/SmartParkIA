import React from "react";
import { motion } from "framer-motion";
import { FaUserCircle } from "react-icons/fa";
import PerfilUsuario from "../components/PerfilUsuario";
import VehiculoForm from "../components/VehiculoForm";

/* =========================================================
   COLORES
   ========================================================= */
const COLORS = {
  bg: "#0a0a0a",
  bgGradient: "radial-gradient(ellipse at top, #1a1a1a 0%, #0a0a0a 55%, #000 100%)",
  border: "#2a2a2a",
  borderStrong: "#3a3a3a",
  text: "#FFFFFF",
  textMuted: "#B0B0B0",
  accent: "#8b5cf6",
  accent2: "#06b6d4",
  glow: "rgba(139,92,246,0.18)",
  glow2: "rgba(6,182,212,0.12)",
};

/* =========================================================
   ESTILOS
   ========================================================= */
const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    padding: "48px 20px 80px",
    background: COLORS.bgGradient,
    overflow: "hidden",
  },
  // Halo violeta superior
  glowTop: {
    position: "absolute",
    top: -220,
    left: "20%",
    width: 640,
    height: 640,
    borderRadius: "50%",
    background: `radial-gradient(circle, ${COLORS.glow} 0%, transparent 70%)`,
    filter: "blur(40px)",
    pointerEvents: "none",
    zIndex: 0,
  },
  // Halo cyan inferior
  glowBottom: {
    position: "absolute",
    bottom: -240,
    right: "10%",
    width: 600,
    height: 600,
    borderRadius: "50%",
    background: `radial-gradient(circle, ${COLORS.glow2} 0%, transparent 70%)`,
    filter: "blur(50px)",
    pointerEvents: "none",
    zIndex: 0,
  },
  // Grid sutil de fondo
  gridOverlay: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
    backgroundSize: "48px 48px",
    maskImage: "radial-gradient(ellipse at center, #000 40%, transparent 90%)",
    WebkitMaskImage: "radial-gradient(ellipse at center, #000 40%, transparent 90%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: 1100,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 44,
  },
  avatarRing: {
    width: 84,
    height: 84,
    borderRadius: "50%",
    padding: 3,
    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})`,
    marginBottom: 18,
    boxShadow: `0 0 32px ${COLORS.glow}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: "#111",
    border: "2px solid #1a1a1a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    margin: 0,
    fontSize: 34,
    fontWeight: 800,
    letterSpacing: 1.5,
    background: `linear-gradient(135deg, #fff 0%, #b8b8ff 50%, #7dd3fc 100%)`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    textAlign: "center",
  },
  titleUnderline: {
    width: 80,
    height: 3,
    marginTop: 14,
    borderRadius: 999,
    background: `linear-gradient(90deg, transparent, ${COLORS.accent}, ${COLORS.accent2}, transparent)`,
    boxShadow: `0 0 12px ${COLORS.glow}`,
  },
  subtitle: {
    margin: "16px 0 0",
    fontSize: 13,
    color: COLORS.textMuted,
    letterSpacing: 0.6,
    textAlign: "center",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: 28,
    alignItems: "start",
  },
  cardWrapper: {
    position: "relative",
    borderRadius: 22,
    padding: 2,
    background: `linear-gradient(145deg, ${COLORS.borderStrong}, ${COLORS.border} 40%, #151515 100%)`,
    boxShadow:
      "0 20px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)",
  },
  cardGlowPerfil: {
    position: "absolute",
    inset: -1,
    borderRadius: 22,
    background: `linear-gradient(145deg, ${COLORS.accent}33, transparent 50%, ${COLORS.accent2}22)`,
    opacity: 0,
    transition: "opacity .4s",
    pointerEvents: "none",
    zIndex: 0,
  },
};

/* =========================================================
   VARIANTES DE ANIMACIÓN
   ========================================================= */
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.05 },
  },
};

const headerVariants = {
  hidden: { y: -24, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const cardVariants = {
  hidden: { y: 40, opacity: 0, scale: 0.97 },
  show: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

/* =========================================================
   COMPONENTE
   ========================================================= */
export default function PerfilVehiculo({ uid }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={styles.page}
    >
      {/* Fondos decorativos */}
      <div style={styles.glowTop} aria-hidden="true" />
      <div style={styles.glowBottom} aria-hidden="true" />
      <div style={styles.gridOverlay} aria-hidden="true" />

      <motion.div
        style={styles.container}
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.header style={styles.header} variants={headerVariants}>
          <motion.div
            style={styles.avatarRing}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 140, damping: 14 }}
            whileHover={{ scale: 1.08 }}
          >
            <motion.div
              style={styles.avatarInner}
              animate={{ boxShadow: [
                `0 0 0 0 ${COLORS.glow}`,
                `0 0 24px 4px ${COLORS.glow}`,
                `0 0 0 0 ${COLORS.glow}`,
              ] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <FaUserCircle size={44} color="#FFF" />
            </motion.div>
          </motion.div>

          <motion.h1
            style={styles.title}
            initial={{ opacity: 0, letterSpacing: "12px" }}
            animate={{ opacity: 1, letterSpacing: "1.5px" }}
            transition={{ delay: 0.35, duration: 0.8, ease: "easeOut" }}
          >
            Mi Perfil
          </motion.h1>

          <motion.div
            style={styles.titleUnderline}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 80, opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.6, ease: "easeOut" }}
          />

          <motion.p
            style={styles.subtitle}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            Administra tu información personal y tu vehículo
          </motion.p>
        </motion.header>

        {/* Grid de tarjetas */}
        <motion.div style={styles.grid} variants={containerVariants}>
          <CardWrapper index={0} accent="violet">
            <PerfilUsuario uid={uid} />
          </CardWrapper>

          <CardWrapper index={1} accent="cyan">
            <VehiculoForm uid={uid} />
          </CardWrapper>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* =========================================================
   WRAPPER con borde degradado + glow al hover
   ========================================================= */
function CardWrapper({ children, accent = "violet" }) {
  const accentColor = accent === "cyan" ? COLORS.accent2 : COLORS.accent;

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      style={styles.cardWrapper}
    >
      {/* Glow decorativo al hover */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          position: "absolute",
          inset: -1,
          borderRadius: 22,
          background: `linear-gradient(145deg, ${accentColor}44, transparent 55%, ${accentColor}22)`,
          filter: "blur(0.5px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Contenido */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          borderRadius: 20,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}