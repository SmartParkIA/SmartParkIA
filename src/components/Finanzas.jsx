import { useEffect, useState, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config.js";
import {
  FaCalendarDay, FaCalendarWeek, FaCalendarAlt,
  FaParking, FaSpinner, FaChartLine, FaChartPie, FaChartArea,
  FaFileExcel, FaRobot, FaCheckCircle, FaTimesCircle,
  FaInfoCircle, FaMagic, FaBolt, FaFire, FaClock,
  FaBrain, FaSync, FaArrowUp, FaArrowDown, FaMinus,
  FaFileAlt, FaChevronRight, FaBell, FaExclamationTriangle,
  FaCommentDots, FaTimes, FaPaperPlane,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";

import { descargarArchivo } from "./descargarArchivo.jsx";

const COLORS = ["#10b981", "#00f2fe", "#f59e0b", "#ef4444"];
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/* ==========================================
   HOOK: Contador animado
   ========================================== */
function useCountUp(end, duration = 1500) {
  const [value, setValue] = useState(0);
  const endRef = useRef(end);

  useEffect(() => {
    endRef.current = end;
    let startTime = null;
    let rafId;
    const start = 0;

    const animate = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (endRef.current - start) * eased));
      if (progress < 1) rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [end, duration]);

  return value;
}

/* ==========================================
   COMPONENTE: Tarjeta de estadística
   ========================================== */
function StatCard({ icon: Icon, label, value, unit, color, delay = 0 }) {
  const animatedValue = useCountUp(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, type: "spring", stiffness: 100 }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="gradient-border card-shimmer stat-card"
      style={statCardStyle}
    >
      <motion.div
        style={iconBoxStyle(color)}
        whileHover={{ rotate: 12, scale: 1.15 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Icon size={24} />
      </motion.div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={labelStyle}>{label}</p>
        <h3 style={valueStyle}>
          ${animatedValue.toLocaleString("es-MX")}
          <span style={{ ...currencyStyle, color }}>{unit}</span>
        </h3>
      </div>
    </motion.div>
  );
}

/* ==========================================
   COMPONENTE: Botón con efectos
   ========================================== */
function ActionButton({ icon: Icon, label, loadingLabel, loading, onClick, gradient }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={loading}
      whileHover={!loading ? { scale: 1.03, boxShadow: "0 10px 30px rgba(0,0,0,0.4)" } : {}}
      whileTap={!loading ? { scale: 0.97 } : {}}
      className="action-btn"
      style={{
        ...buttonStyle,
        background: loading ? "#334155" : gradient,
        cursor: loading ? "wait" : "pointer",
      }}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.span
            key="loading"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            style={{ display: "flex" }}
          >
            <FaSpinner />
          </motion.span>
        ) : (
          <motion.span
            key="icon"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            style={{ display: "flex" }}
          >
            <Icon />
          </motion.span>
        )}
      </AnimatePresence>
      <span>{loading ? loadingLabel : label}</span>
    </motion.button>
  );
}

/* ==========================================
   COMPONENTE: Toast
   ========================================== */
function Toast({ toast, onClose }) {
  const isError = toast.type === "error";
  const Icon = isError ? FaTimesCircle : toast.type === "info" ? FaInfoCircle : FaCheckCircle;
  const color = isError ? "#ef4444" : toast.type === "info" ? "#00f2fe" : "#10b981";

  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 400, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 400, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      style={{
        background: "rgba(15, 23, 42, 0.95)",
        border: `1px solid ${color}`,
        borderRadius: "12px",
        padding: "14px 20px",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        boxShadow: `0 10px 40px ${color}40`,
        backdropFilter: "blur(10px)",
        minWidth: "280px",
        fontWeight: 600,
      }}
    >
      <Icon size={20} color={color} />
      <span style={{ fontSize: "14px" }}>{toast.message}</span>
    </motion.div>
  );
}

/* ==========================================
   ANIMACIÓN: Papel PDF bailarín
   ========================================== */
function PdfBailarin({ size = 110 }) {
  return (
    <div style={{ width: size, height: size, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", width: size * 0.75, height: size * 0.75, borderRadius: "50%", background: "radial-gradient(circle, rgba(0, 242, 254, 0.45), transparent 70%)", filter: "blur(8px)" }} />
      {["♪", "♫", "♪"].map((nota, i) => (
        <motion.div key={`nota-${i}`} initial={{ opacity: 0 }} animate={{ y: [size * 0.1, -size * 0.35], x: [0, (i - 1) * size * 0.15], opacity: [0, 1, 0], rotate: [0, (i - 1) * 20] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
          style={{ position: "absolute", top: size * 0.15, left: `calc(50% + ${(i - 1) * size * 0.22}px)`, fontSize: size * 0.18, color: "#00f2fe", fontWeight: 800, textShadow: "0 0 10px rgba(0, 242, 254, 0.9)", pointerEvents: "none" }}>
          {nota}
        </motion.div>
      ))}
      {[0, 1, 2, 3].map((i) => {
        const angulo = (i / 4) * Math.PI * 2; const radio = size * 0.4;
        return (
          <motion.div key={`sparkle-${i}`} animate={{ opacity: [0, 1, 0], scale: [0.3, 1, 0.3], rotate: [0, 180, 360] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
            style={{ position: "absolute", left: `calc(50% + ${Math.cos(angulo) * radio}px)`, top: `calc(50% + ${Math.sin(angulo) * radio}px)`, transform: "translate(-50%, -50%)", fontSize: size * 0.1, pointerEvents: "none" }}>
            ✨
          </motion.div>
        );
      })}
      <motion.div animate={{ scaleX: [1, 0.7, 1], opacity: [0.5, 0.25, 0.5] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", bottom: size * 0.1, width: size * 0.45, height: size * 0.06, borderRadius: "50%", background: "rgba(0, 242, 254, 0.6)", filter: "blur(6px)" }} />
      <motion.div animate={{ y: [0, -size * 0.08, 0, -size * 0.04, 0], rotate: [-10, 5, -5, 8, -10] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        style={{ width: size * 0.52, height: size * 0.68, background: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)", borderRadius: size * 0.04, boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4), 0 0 25px rgba(0, 242, 254, 0.4), inset 0 1px 0 rgba(255,255,255,0.8)", position: "relative", display: "flex", flexDirection: "column", padding: size * 0.07, gap: size * 0.03, zIndex: 2 }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: size * 0.16, height: size * 0.16, background: "linear-gradient(225deg, #94a3b8 0%, #cbd5e1 50%, #e2e8f0 100%)", clipPath: "polygon(0 0, 100% 0, 100% 100%)", borderTopRightRadius: size * 0.04 }} />
        <div style={{ height: size * 0.035, background: "linear-gradient(90deg, #10b981, #00f2fe)", borderRadius: size * 0.01, width: "65%", marginTop: size * 0.04, boxShadow: "0 1px 4px rgba(16, 185, 129, 0.5)" }} />
        <div style={{ height: size * 0.018, background: "#cbd5e1", borderRadius: size * 0.008, width: "100%" }} />
        <div style={{ height: size * 0.018, background: "#cbd5e1", borderRadius: size * 0.008, width: "88%" }} />
        <div style={{ height: size * 0.018, background: "#cbd5e1", borderRadius: size * 0.008, width: "92%" }} />
        <div style={{ height: size * 0.018, background: "#cbd5e1", borderRadius: size * 0.008, width: "75%" }} />
        <div style={{ marginTop: "auto", background: "linear-gradient(135deg, #ef4444, #b91c1c)", color: "#fff", borderRadius: size * 0.015, padding: `${size * 0.015}px 0`, fontSize: size * 0.08, fontWeight: 900, textAlign: "center", letterSpacing: "1.5px", boxShadow: "0 2px 6px rgba(239, 68, 68, 0.5)" }}>
          PDF
        </div>
      </motion.div>
    </div>
  );
}

/* ==========================================
   INSIGHT IA POR GRÁFICA
   ========================================== */
function InsightGraficaIA({ tipo, insights, onAnalizar }) {
  const insight = insights[tipo];

  if (!insight) {
    return (
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => onAnalizar(tipo)}
        style={{ width: "100%", marginTop: "12px", padding: "10px 14px", background: "rgba(139, 92, 246, 0.08)", border: "1px dashed rgba(139, 92, 246, 0.4)", borderRadius: "8px", color: "#a78bfa", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "12px", fontWeight: 600, transition: "all 0.2s" }}>
        <FaBrain size={14} /> Analizar esta gráfica con IA
      </motion.button>
    );
  }

  if (insight.cargando) {
    return (
      <div style={{ marginTop: "12px", padding: "12px 14px", background: "rgba(139, 92, 246, 0.05)", borderRadius: "8px" }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ color: "#a78bfa", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <FaSpinner style={{ animation: "spin 1s linear infinite" }} /> La IA está analizando esta gráfica...
        </motion.div>
      </div>
    );
  }

  if (insight.error) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{ marginTop: "12px", padding: "12px 14px", background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(0, 242, 254, 0.05))", border: "1px solid rgba(139, 92, 246, 0.25)", borderRadius: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
        <FaBrain size={12} color="#a78bfa" />
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.5px" }}>Insight IA</span>
      </div>
      <p style={{ margin: "0 0 6px", color: "#e2e8f0", fontSize: "13px", fontWeight: 600 }}>{insight.observacion}</p>
      <p style={{ margin: "0 0 6px", color: "#94a3b8", fontSize: "12px" }}><strong style={{ color: "#00f2fe" }}>Patrón:</strong> {insight.patron}</p>
      <p style={{ margin: 0, color: "#94a3b8", fontSize: "12px" }}><strong style={{ color: "#10b981" }}>Acción:</strong> {insight.accionSugerida}</p>
    </motion.div>
  );
}

/* ==========================================
   RESUMEN SEMANAL IA (tarjeta grande)
   ========================================== */
function ResumenSemanalIA({ analisis, cargando, onRegenerar }) {
  if (cargando || !analisis) {
    return (
      <div className="gradient-border chart-card" style={{ marginTop: "30px" }}>
        <h3 style={chartTitleStyle}>
          <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} style={{ display: "inline-flex", color: "#a78bfa" }}>
            <FaBrain size={18} />
          </motion.span>
          Generando análisis semanal con IA...
        </h3>
        <div style={{ display: "grid", gap: "10px" }}>
          {[...Array(4)].map((_, i) => (
            <motion.div key={i} animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.1 }} style={{ height: "60px", borderRadius: "8px", background: "rgba(30, 41, 59, 0.6)" }} />
          ))}
        </div>
      </div>
    );
  }

  const miniStat = { background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "14px" };
  const miniLabel = { color: "#64748b", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 6px" };
  const seccionTitulo = { color: "#fff", fontSize: "13px", fontWeight: 700, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" };

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="gradient-border chart-card" style={{ marginTop: "30px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px", flexWrap: "wrap" }}>
        <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 3 }} style={{ background: "linear-gradient(135deg, #8b5cf6, #00f2fe)", padding: "12px", borderRadius: "14px", display: "flex", boxShadow: "0 0 25px rgba(139, 92, 246, 0.5)" }}>
          <FaBrain size={22} color="#fff" />
        </motion.div>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <h3 style={{ color: "#fff", fontSize: "20px", fontWeight: 800, margin: 0 }}>{analisis.titulo}</h3>
          <p style={{ color: "#94a3b8", fontSize: "12px", margin: "4px 0 0" }}>Análisis generado con IA · {new Date().toLocaleDateString("es-MX", { dateStyle: "long" })}</p>
        </div>
        <motion.button whileHover={{ scale: 1.1, rotate: 180 }} whileTap={{ scale: 0.9 }} onClick={onRegenerar} title="Regenerar análisis" style={{ background: "rgba(0, 242, 254, 0.1)", border: "1px solid rgba(0, 242, 254, 0.3)", color: "#00f2fe", borderRadius: "10px", padding: "10px", cursor: "pointer", display: "flex" }}>
          <FaSync size={16} />
        </motion.button>
      </div>

      {/* Grillas responsivas */}
      <div className="grid-stats-3">
        <div style={miniStat}>
          <p style={miniLabel}>Score de rendimiento</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
            <span style={{ fontSize: "30px", fontWeight: 900, color: "#00f2fe" }}>{analisis.scoreRendimiento}</span>
            <span style={{ fontSize: "12px", color: "#64748b" }}>/100</span>
          </div>
          <div style={{ height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", marginTop: "8px", overflow: "hidden" }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${analisis.scoreRendimiento}%` }} transition={{ duration: 1.5, ease: "easeOut" }} style={{ height: "100%", background: "linear-gradient(90deg, #00f2fe, #10b981)" }} />
          </div>
        </div>
        <div style={miniStat}>
          <p style={miniLabel}>Tendencia</p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {analisis.tendencia === "positiva" && <FaArrowUp color="#10b981" size={22} />}
            {analisis.tendencia === "negativa" && <FaArrowDown color="#ef4444" size={22} />}
            {analisis.tendencia === "estable" && <FaMinus color="#f59e0b" size={22} />}
            <span style={{ fontSize: "26px", fontWeight: 900, color: analisis.tendencia === "positiva" ? "#10b981" : analisis.tendencia === "negativa" ? "#ef4444" : "#f59e0b" }}>
              {analisis.porcentajeCambio > 0 ? "+" : ""}{analisis.porcentajeCambio}%
            </span>
          </div>
        </div>
        <div style={miniStat}>
          <p style={miniLabel}>Confianza predicción</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
            <span style={{ fontSize: "30px", fontWeight: 900, color: "#a78bfa" }}>{analisis.confianza}%</span>
          </div>
          <div style={{ height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", marginTop: "8px", overflow: "hidden" }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${analisis.confianza}%` }} transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }} style={{ height: "100%", background: "linear-gradient(90deg, #a78bfa, #00f2fe)" }} />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h4 style={seccionTitulo}><FaFileAlt size={14} color="#00f2fe" /> Resumen Ejecutivo</h4>
        <p style={{ color: "#cbd5e1", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>{analisis.resumenEjecutivo}</p>
      </div>

      <div className="grid-stats-2">
        <div style={{ ...miniStat, borderColor: "rgba(0, 242, 254, 0.3)", background: "rgba(0, 242, 254, 0.05)" }}>
          <p style={miniLabel}>🔮 Predicción mañana</p>
          <p style={{ fontSize: "22px", fontWeight: 800, color: "#00f2fe", margin: 0 }}>${analisis.prediccionProximoDia.toLocaleString("es-MX")} MXN</p>
        </div>
        <div style={{ ...miniStat, borderColor: "rgba(139, 92, 246, 0.3)", background: "rgba(139, 92, 246, 0.05)" }}>
          <p style={miniLabel}>🎯 Próxima semana</p>
          <p style={{ fontSize: "22px", fontWeight: 800, color: "#a78bfa", margin: 0 }}>${analisis.prediccionProximaSemana.toLocaleString("es-MX")} MXN</p>
        </div>
      </div>

      <div className="grid-stats-2">
        <div style={miniStat}>
          <p style={miniLabel}>📈 Día más rentable</p>
          <p style={{ fontSize: "16px", fontWeight: 700, color: "#10b981", margin: 0 }}>{analisis.diaMasRentable}</p>
        </div>
        <div style={miniStat}>
          <p style={miniLabel}>📉 Día menos rentable</p>
          <p style={{ fontSize: "16px", fontWeight: 700, color: "#ef4444", margin: 0 }}>{analisis.diaMenosRentable}</p>
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h4 style={seccionTitulo}><FaBrain size={14} color="#a78bfa" /> Insights Clave</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {analisis.insights.map((insight, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }} style={{ display: "flex", gap: "10px", padding: "10px 14px", background: "rgba(139, 92, 246, 0.08)", borderLeft: "3px solid #a78bfa", borderRadius: "6px", color: "#cbd5e1", fontSize: "13px" }}>
              <FaChevronRight size={10} color="#a78bfa" style={{ flexShrink: 0, marginTop: "5px" }} />{insight}
            </motion.div>
          ))}
        </div>
      </div>

      {analisis.alertas && analisis.alertas.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h4 style={seccionTitulo}><FaBell size={14} color="#f59e0b" /> Alertas</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {analisis.alertas.map((alerta, i) => {
              const mapa = { info: { bg: "rgba(0, 242, 254, 0.1)", border: "#00f2fe", icon: FaInfoCircle }, warning: { bg: "rgba(245, 158, 11, 0.1)", border: "#f59e0b", icon: FaExclamationTriangle }, success: { bg: "rgba(16, 185, 129, 0.1)", border: "#10b981", icon: FaCheckCircle }, error: { bg: "rgba(239, 68, 68, 0.1)", border: "#ef4444", icon: FaTimesCircle } };
              const c = mapa[alerta.tipo] || mapa.info; const Icon = c.icon;
              return (
                <div key={i} style={{ display: "flex", gap: "10px", padding: "10px 14px", background: c.bg, borderLeft: `3px solid ${c.border}`, borderRadius: "6px", color: "#cbd5e1", fontSize: "13px", alignItems: "flex-start" }}>
                  <Icon size={13} color={c.border} style={{ flexShrink: 0, marginTop: "4px" }} />{alerta.mensaje}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h4 style={seccionTitulo}><FaCheckCircle size={14} color="#10b981" /> Recomendaciones</h4>
        <div style={{ display: "grid", gap: "8px" }}>
          {analisis.recomendaciones.map((rec, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }} style={{ display: "flex", gap: "10px", padding: "10px 14px", background: "rgba(16, 185, 129, 0.08)", borderLeft: "3px solid #10b981", borderRadius: "6px", color: "#cbd5e1", fontSize: "13px" }}>
              <span style={{ background: "#10b981", color: "#fff", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>{rec}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ==========================================
   CHAT IA FLOTANTE
   ========================================== */
function ChatIA({ abierto, onToggle, mensajes, input, setInput, onEnviar, cargando }) {
  return (
    <>
      <motion.button onClick={onToggle} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} animate={{ rotate: abierto ? 135 : 0 }}
        className="chat-toggle"
        style={{ position: "fixed", bottom: "30px", right: "30px", width: "60px", height: "60px", borderRadius: "50%", background: "linear-gradient(135deg, #8b5cf6, #00f2fe)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 30px rgba(139, 92, 246, 0.5)", zIndex: 9998 }}>
        {abierto ? <FaTimes size={24} /> : <FaCommentDots size={24} />}
      </motion.button>

      <AnimatePresence>
        {abierto && (
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="chat-window"
            style={{ position: "fixed", bottom: "100px", right: "30px", width: "380px", maxHeight: "550px", background: "rgba(15, 23, 42, 0.98)", border: "1px solid rgba(139, 92, 246, 0.4)", borderRadius: "16px", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6)", backdropFilter: "blur(10px)", zIndex: 9998 }}>
            <div style={{ padding: "16px", background: "linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(0, 242, 254, 0.1))", borderBottom: "1px solid rgba(139, 92, 246, 0.3)", display: "flex", alignItems: "center", gap: "10px" }}>
              <FaRobot color="#a78bfa" size={22} />
              <div>
                <p style={{ margin: 0, color: "#fff", fontWeight: 700, fontSize: "14px" }}>Asistente IA</p>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "11px" }}>Pregúntame sobre tus finanzas</p>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {mensajes.length === 0 && (
                <div style={{ color: "#64748b", fontSize: "13px", textAlign: "center", padding: "20px" }}>
                  👋 ¡Hola! Soy tu asistente. Prueba con:
                  <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
                    {["¿Cuál es mi mejor día?", "¿Cómo va la semana?", "¿Qué debo mejorar?"].map((sug) => (
                      <button key={sug} onClick={() => setInput(sug)} style={{ background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.3)", color: "#c4b5fd", padding: "6px 12px", borderRadius: "12px", fontSize: "11px", cursor: "pointer" }}>
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mensajes.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ alignSelf: msg.rol === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                  <div style={{ padding: "10px 14px", borderRadius: msg.rol === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: msg.rol === "user" ? "linear-gradient(135deg, #8b5cf6, #6366f1)" : "rgba(30, 41, 59, 0.9)", color: "#fff", fontSize: "13px", lineHeight: 1.5 }}>
                    {msg.texto}
                    {msg.recomendacion && <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: "12px", color: "#c4b5fd" }}>💡 {msg.recomendacion}</div>}
                  </div>
                </motion.div>
              ))}

              {cargando && (
                <div style={{ alignSelf: "flex-start", padding: "10px 14px", background: "rgba(30, 41, 59, 0.9)", borderRadius: "14px 14px 14px 4px" }}>
                  <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ color: "#a78bfa", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <FaSpinner style={{ animation: "spin 1s linear infinite" }} /> Pensando...
                  </motion.div>
                </div>
              )}
            </div>

            <div style={{ padding: "12px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: "8px" }}>
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !cargando && onEnviar()} placeholder="Escribe tu pregunta..." disabled={cargando}
                style={{ flex: 1, background: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(139, 92, 246, 0.3)", borderRadius: "8px", padding: "10px 14px", color: "#fff", fontSize: "13px", outline: "none" }} />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onEnviar} disabled={cargando || !input.trim()}
                style={{ background: "linear-gradient(135deg, #8b5cf6, #00f2fe)", border: "none", borderRadius: "8px", padding: "10px 14px", color: "#fff", cursor: cargando || !input.trim() ? "not-allowed" : "pointer", opacity: cargando || !input.trim() ? 0.5 : 1, display: "flex", alignItems: "center" }}>
                <FaPaperPlane size={14} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ==========================================
   COMPONENTE PRINCIPAL
   ========================================== */
export default function Finanzas() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ hoy: 0, semana: 0, mes: 0, reservasHoy: 0 });
  const [datosGraficaBarras, setDatosGraficaBarras] = useState([]);
  const [datosGraficaPastel, setDatosGraficaPastel] = useState([]);
  const [datosGraficaMes, setDatosGraficaMes] = useState([]);
  const [reservasRaw, setReservasRaw] = useState([]);
  const [generando, setGenerando] = useState({ pdf: false, excel: false });
  const [toast, setToast] = useState(null);

  const [analisisSemanal, setAnalisisSemanal] = useState(null);
  const [cargandoAnalisis, setCargandoAnalisis] = useState(false);
  const [insightsGraficas, setInsightsGraficas] = useState({});
  const [chatAbierto, setChatAbierto] = useState(false);
  const [chatMensajes, setChatMensajes] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatCargando, setChatCargando] = useState(false);

  const showToast = (message, type = "success") => setToast({ message, type });

  useEffect(() => {
    const cargarEstadisticas = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "reservas"));
        const reservasTemporales = [];

        let gananciasHoy = 0, gananciasSemana = 0, gananciasMes = 0, reservasDelDia = 0;
        let activas = 0, canceladas = 0, pasadas = 0;
        const gananciasPorDia = {};
        const gananciasPorDiaMes = {};

        const hoy = new Date();
        const offset = hoy.getTimezoneOffset();
        const fechaHoyStr = new Date(hoy.getTime() - offset * 60 * 1000).toISOString().split("T")[0];
        const mesActualStr = fechaHoyStr.substring(0, 7);

        const diaSemana = hoy.getDay() === 0 ? 7 : hoy.getDay();
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - diaSemana + 1);
        inicioSemana.setHours(0, 0, 0, 0);

        const ultimos7Dias = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(hoy);
          d.setDate(d.getDate() - i);
          const str = new Date(d.getTime() - offset * 60 * 1000).toISOString().split("T")[0];
          ultimos7Dias.push(str);
          gananciasPorDia[str] = 0;
        }

        const diasEnMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= diasEnMes; i++) {
          const diaStr = String(i).padStart(2, "0");
          gananciasPorDiaMes[`${mesActualStr}-${diaStr}`] = 0;
        }

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const estado = (data.estado || "").toLowerCase();

          let costo = Number(data.costoTotal);
          if (isNaN(costo) || costo === 0) {
            costo = (parseInt(data.duracion, 10) || 0) * 50;
          }

          const fechaPagoStr = data.fechaCreacion ? data.fechaCreacion.split("T")[0] : data.fecha;
          reservasTemporales.push({ ...data, costoTotal: costo });

          if (estado === "cancelada") {
            canceladas++;
          } else {
            if (fechaPagoStr === fechaHoyStr) {
              gananciasHoy += costo;
              reservasDelDia++;
            }
            const datePagoObj = new Date(`${fechaPagoStr}T00:00:00`);
            if (datePagoObj >= inicioSemana) gananciasSemana += costo;
            if (fechaPagoStr && fechaPagoStr.startsWith(mesActualStr)) gananciasMes += costo;

            const dateUsoObj = new Date(`${data.fecha}T${data.horario || "00:00"}`);
            const fin = new Date(dateUsoObj.getTime() + (parseInt(data.duracion) || 0) * 60 * 60 * 1000);
            if (fin < new Date()) pasadas++;
            else activas++;

            if (gananciasPorDia[fechaPagoStr] !== undefined) gananciasPorDia[fechaPagoStr] += costo;
            if (gananciasPorDiaMes[fechaPagoStr] !== undefined) gananciasPorDiaMes[fechaPagoStr] += costo;
          }
        });

        setStats({ hoy: gananciasHoy, semana: gananciasSemana, mes: gananciasMes, reservasHoy: reservasDelDia });
        setReservasRaw(reservasTemporales);

        setDatosGraficaBarras(
          ultimos7Dias.map((fecha) => ({
            dia: fecha.split("-")[2] + "/" + fecha.split("-")[1],
            ganancias: gananciasPorDia[fecha],
          }))
        );

        setDatosGraficaMes(
          Object.keys(gananciasPorDiaMes).map((fecha) => {
            const diaNum = parseInt(fecha.split("-")[2], 10);
            return { dia: diaNum === 1 || diaNum % 5 === 0 ? fecha.split("-")[2] : "", ganancias: gananciasPorDiaMes[fecha] };
          })
        );

        setDatosGraficaPastel([
          { name: "Activas", value: activas },
          { name: "Completadas", value: pasadas },
          { name: "Canceladas", value: canceladas },
        ]);
      } catch (error) {
        console.error("Error al cargar estadísticas:", error);
        showToast("Error al cargar los datos", "error");
      } finally {
        setLoading(false);
      }
    };

    cargarEstadisticas();
  }, []);

  useEffect(() => {
    if (!loading && datosGraficaBarras.length > 0 && stats.semana > 0) {
      generarAnalisisSemanal();
    }
  }, [loading]);

  const handleDescargarPDF = async () => {
    setGenerando((prev) => ({ ...prev, pdf: true }));
    try {
      await descargarArchivo(`${API_BASE}/api/generar-pdf`, { datos: { stats } }, "informe-financiero-ia.pdf");
      showToast("¡Informe IA generado con éxito!", "success");
    } catch (err) {
      showToast("No se pudo generar el PDF. Verifica el servidor.", "error");
    } finally {
      setGenerando((prev) => ({ ...prev, pdf: false }));
    }
  };

  const handleDescargarExcel = async () => {
    setGenerando((prev) => ({ ...prev, excel: true }));
    try {
      await descargarArchivo(`${API_BASE}/api/generar-excel`, { reservas: reservasRaw }, "reservas-estacionamiento.xlsx");
      showToast("¡Excel exportado con éxito!", "success");
    } catch (err) {
      showToast("No se pudo generar el Excel.", "error");
    } finally {
      setGenerando((prev) => ({ ...prev, excel: false }));
    }
  };

  const generarAnalisisSemanal = async () => {
    setCargandoAnalisis(true);
    try {
      const res = await fetch(`${API_BASE}/api/analisis-semanal`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stats, datosGraficaBarras, datosGraficaPastel }) });
      if (!res.ok) throw new Error("Error");
      const data = await res.json();
      setAnalisisSemanal(data);
    } catch (err) {
      console.error("Error análisis semanal:", err);
      showToast("No se pudo generar el análisis semanal", "error");
    } finally {
      setCargandoAnalisis(false);
    }
  };

  const generarInsightGrafica = async (tipo) => {
    setInsightsGraficas((prev) => ({ ...prev, [tipo]: { cargando: true } }));
    try {
      const datosMap = { barras: datosGraficaBarras, pastel: datosGraficaPastel, area: datosGraficaMes };
      const res = await fetch(`${API_BASE}/api/insight-grafica`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipoGrafica: tipo, datos: datosMap[tipo], contexto: "Estacionamiento SmartPark, análisis de finanzas" }) });
      if (!res.ok) throw new Error("Error");
      const data = await res.json();
      setInsightsGraficas((prev) => ({ ...prev, [tipo]: data }));
    } catch (err) {
      setInsightsGraficas((prev) => ({ ...prev, [tipo]: { error: true } }));
    }
  };

  const enviarPregunta = async () => {
    if (!chatInput.trim() || chatCargando) return;
    const pregunta = chatInput.trim();
    setChatInput("");
    setChatMensajes((prev) => [...prev, { rol: "user", texto: pregunta }]);
    setChatCargando(true);

    try {
      const res = await fetch(`${API_BASE}/api/preguntar-ia`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pregunta, contexto: { stats, datosGraficaBarras, datosGraficaPastel } }) });
      if (!res.ok) throw new Error("Error");
      const data = await res.json();
      setChatMensajes((prev) => [...prev, { rol: "ia", texto: data.respuesta, recomendacion: data.recomendacion }]);
    } catch (err) {
      setChatMensajes((prev) => [...prev, { rol: "ia", texto: "No pude procesar tu pregunta. Intenta de nuevo." }]);
    } finally {
      setChatCargando(false);
    }
  };

  if (loading) {
    return (
      <>
        <AnimacionesCSS />
        <div style={{ position: "relative", padding: "40px 20px" }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", color: "#00f2fe" }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }} style={{ width: "60px", height: "60px", borderRadius: "50%", border: "3px solid rgba(0, 242, 254, 0.2)", borderTopColor: "#00f2fe", boxShadow: "0 0 30px #00f2fe60" }} />
            <p style={{ fontSize: "16px", fontWeight: 600 }}>Calculando finanzas...</p>
            <div className="loading-grid">
              {[...Array(4)].map((_, i) => (
                <motion.div key={i} animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.15 }} style={{ height: "80px", borderRadius: "16px", background: "rgba(30, 41, 59, 0.6)" }} />
              ))}
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <AnimacionesCSS />

      <div style={{ position: "relative", width: "100%", padding: "20px", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", top: "-100px", left: "-100px", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0, 242, 254, 0.25), transparent 70%)", filter: "blur(60px)", animation: "blobMove1 18s ease-in-out infinite" }} />
          <div style={{ position: "absolute", top: "40%", right: "-80px", width: "350px", height: "350px", borderRadius: "50%", background: "radial-gradient(circle, rgba(16, 185, 129, 0.25), transparent 70%)", filter: "blur(60px)", animation: "blobMove2 22s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: "-100px", left: "30%", width: "450px", height: "450px", borderRadius: "50%", background: "radial-gradient(circle, rgba(245, 158, 11, 0.15), transparent 70%)", filter: "blur(70px)", animation: "blobMove3 25s ease-in-out infinite" }} />
          <div className="grid-bg" style={{ position: "absolute", inset: 0, opacity: 0.6 }} />
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          
          <motion.h2 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="header-title" style={{ color: "#fff", fontSize: "28px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "14px", fontWeight: 800, letterSpacing: "-0.5px" }}>
            <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              style={{ background: "linear-gradient(135deg, #00f2fe, #10b981)", padding: "10px", borderRadius: "12px", display: "flex", color: "#fff", boxShadow: "0 0 25px rgba(0, 242, 254, 0.5)" }}>
              <FaChartLine size={24} />
            </motion.div>
            Panel de Finanzas
            <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} style={{ display: "inline-flex", color: "#f59e0b", marginLeft: "auto" }}>
              <FaFire size={22} />
            </motion.span>
          </motion.h2>

          {/* PANEL DE ACCIONES IA */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
            className="action-panel" style={actionPanelStyle}>
            <div style={{ flex: 1, display: "flex", gap: "15px", flexWrap: "wrap", width: "100%" }}>
              <ActionButton icon={FaRobot} label="Generar Informe IA (PDF)" loadingLabel="Generando con IA..." loading={generando.pdf} onClick={handleDescargarPDF} gradient="linear-gradient(135deg, #10b981, #00f2fe)" />
              <ActionButton icon={FaFileExcel} label="Descargar Excel" loadingLabel="Generando..." loading={generando.excel} onClick={handleDescargarExcel} gradient="linear-gradient(135deg, #f59e0b, #ef4444)" />
            </div>
            <motion.div whileHover={{ scale: 1.1, rotate: -5 }}
              className="pdf-animation"
              style={{ width: "110px", height: "110px", flexShrink: 0, borderRadius: "16px", overflow: "hidden", background: "rgba(0, 242, 254, 0.05)", border: "1px solid rgba(0, 242, 254, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PdfBailarin size={100} />
            </motion.div>
          </motion.div>

          {/* TARJETAS DE ESTADÍSTICAS */}
          <div className="stats-grid">
            <StatCard icon={FaCalendarDay} label="Ganancias de Hoy" value={stats.hoy} unit="MXN" color="#10b981" delay={0.1} />
            <StatCard icon={FaCalendarWeek} label="Esta Semana" value={stats.semana} unit="MXN" color="#00f2fe" delay={0.2} />
            <StatCard icon={FaCalendarAlt} label="Este Mes" value={stats.mes} unit="MXN" color="#f59e0b" delay={0.3} />
            <StatCard icon={FaParking} label="Reservas de Hoy" value={stats.reservasHoy} unit="autos" color="#ef4444" delay={0.4} />
          </div>

          {/* GRÁFICAS */}
          <div className="charts-grid">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.6 }} className="gradient-border chart-card">
              <h3 style={chartTitleStyle}>
                <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ repeat: Infinity, duration: 3 }} style={{ display: "inline-flex", color: "#00f2fe" }}><FaBolt size={18} /></motion.span>
                Ganancias (Últimos 7 días)
              </h3>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={datosGraficaBarras} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="dia" stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#00f2fe", color: "#fff", borderRadius: "8px" }} />
                    <Bar dataKey="ganancias" radius={[8, 8, 0, 0]} animationDuration={1500}>
                      {datosGraficaBarras.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.ganancias > 0 ? "#00f2fe" : "#334155"} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <InsightGraficaIA tipo="barras" insights={insightsGraficas} onAnalizar={generarInsightGrafica} />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6, duration: 0.6 }} className="gradient-border chart-card">
              <h3 style={chartTitleStyle}>
                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: "linear" }} style={{ display: "inline-flex", color: "#10b981" }}><FaChartPie size={18} /></motion.span>
                Estado de las Reservas
              </h3>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={datosGraficaPastel} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none" animationDuration={1500}>
                      {datosGraficaPastel.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#fff", borderRadius: "8px" }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <InsightGraficaIA tipo="pastel" insights={insightsGraficas} onAnalizar={generarInsightGrafica} />
            </motion.div>
          </div>

          {/* GRÁFICA DE ÁREA */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }} className="gradient-border chart-card">
            <h3 style={chartTitleStyle}>
              <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2 }} style={{ display: "inline-flex", color: "#10b981" }}><FaChartArea size={18} /></motion.span>
              Ganancias del Mes Actual
              <FaClock size={14} color="#64748b" style={{ marginLeft: "auto" }} />
            </h3>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={datosGraficaMes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGanancias" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="dia" stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
                  <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8" }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#10b981", color: "#fff", borderRadius: "8px" }} />
                  <Area type="monotone" dataKey="ganancias" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorGanancias)" animationDuration={2000} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <InsightGraficaIA tipo="area" insights={insightsGraficas} onAnalizar={generarInsightGrafica} />
          </motion.div>
        </div>

        <ResumenSemanalIA analisis={analisisSemanal} cargando={cargandoAnalisis} onRegenerar={generarAnalisisSemanal} />

        <ChatIA abierto={chatAbierto} onToggle={() => setChatAbierto(!chatAbierto)} mensajes={chatMensajes} input={chatInput} setInput={setChatInput} onEnviar={enviarPregunta} cargando={chatCargando} />

        <AnimatePresence>
          {(generando.pdf || generando.excel) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15, 23, 42, 0.85)", backdropFilter: "blur(8px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" }}>
              <motion.div initial={{ scale: 0.5, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 150 }} style={{ width: "260px", height: "260px", borderRadius: "24px", background: "rgba(0, 242, 254, 0.08)", border: "2px solid rgba(0, 242, 254, 0.4)", padding: "15px", boxShadow: "0 0 60px rgba(0, 242, 254, 0.4)" }}>
                <PdfBailarin size={230} />
              </motion.div>
              <motion.p animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ color: "#00f2fe", fontSize: "18px", fontWeight: 700, letterSpacing: "1px", display: "flex", alignItems: "center", gap: "10px" }}>
                <FaMagic /> Procesando con Inteligencia Artificial...
              </motion.p>
              <p style={{ color: "#94a3b8", fontSize: "13px" }}>Redactando tu informe personalizado</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 10000, display: "flex", flexDirection: "column", gap: "10px" }}>
          <AnimatePresence>{toast && <Toast toast={toast} onClose={() => setToast(null)} />}</AnimatePresence>
        </div>
      </div>
    </>
  );
}

/* ==========================================
   COMPONENTE: Inyecta los keyframes de animación y RESPONSIVE
   ========================================== */
function AnimacionesCSS() {
  return (
    <style>{`
      @keyframes blobMove1 {
        0%, 100% { transform: translate(0, 0) scale(1); }
        33% { transform: translate(30px, -50px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.9); }
      }
      @keyframes blobMove2 {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50% { transform: translate(-40px, 30px) scale(1.15); }
      }
      @keyframes blobMove3 {
        0%, 100% { transform: translate(0, 0) scale(1); }
        33% { transform: translate(50px, 30px) scale(0.95); }
        66% { transform: translate(-30px, -40px) scale(1.05); }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .grid-bg {
        background-image:
          linear-gradient(rgba(0, 242, 254, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 242, 254, 0.05) 1px, transparent 1px);
        background-size: 40px 40px;
      }
      .gradient-border {
        position: relative;
        border-radius: 16px;
        overflow: hidden;
      }
      .gradient-border::before {
        content: '';
        position: absolute;
        inset: 0;
        padding: 1.5px;
        border-radius: 16px;
        background: linear-gradient(135deg, #00f2fe, #10b981, #f59e0b);
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
                mask-composite: exclude;
        pointer-events: none;
        opacity: 0.4;
        transition: opacity 0.3s;
        z-index: 2;
      }
      .gradient-border:hover::before {
        opacity: 1;
      }
      .card-shimmer {
        position: relative;
        overflow: hidden;
      }
      .card-shimmer::after {
        content: '';
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%);
        background-size: 200% 100%;
        animation: shimmer 3s infinite linear;
        pointer-events: none;
        z-index: 1;
      }

      /* ==========================================
         🔥 AQUI ESTAN LAS CLASES RESPONSIVAS 🔥
         ========================================== */
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }

      .charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 20px;
        margin-bottom: 20px;
      }

      .chart-card {
        background: rgba(30, 41, 59, 0.6);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        padding: 22px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        position: relative;
        z-index: 0;
      }

      .grid-stats-3 {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 20px;
      }

      .grid-stats-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 20px;
      }

      .loading-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
        width: 100%;
        max-width: 900px;
      }

      /* 📱 RESPONSIVE PARA TABLETS Y CELULARES */
      @media (max-width: 900px) {
        .charts-grid { grid-template-columns: 1fr; }
        .pdf-animation { display: none; } /* Ocultamos el PDF bailarín para ahorrar espacio */
        .action-panel { flex-direction: column; }
        .action-btn { width: 100%; justify-content: center; }
      }

      @media (max-width: 600px) {
        .stats-grid { grid-template-columns: 1fr; }
        .grid-stats-3 { grid-template-columns: 1fr; }
        .grid-stats-2 { grid-template-columns: 1fr; }
        .loading-grid { grid-template-columns: 1fr 1fr; }
        .header-title { font-size: 22px !important; }
        .chat-window {
          width: calc(100vw - 40px) !important;
          right: 20px !important;
          bottom: 90px !important;
        }
        .chat-toggle { right: 20px !important; bottom: 20px !important; }
      }
    `}</style>
  );
}

/* ==========================================
   ESTILOS (objetos JS)
   ========================================== */
const statCardStyle = {
  background: "rgba(15, 23, 42, 0.7)",
  backdropFilter: "blur(10px)",
  borderRadius: "16px",
  padding: "20px",
  display: "flex",
  alignItems: "center",
  gap: "16px",
  cursor: "pointer",
  transition: "transform 0.3s",
  position: "relative",
  zIndex: 0,
};

const iconBoxStyle = (color) => ({
  width: "52px", height: "52px", borderRadius: "14px", background: `${color}20`, border: `1px solid ${color}50`, color: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 20px ${color}40`,
});

const labelStyle = { color: "#94a3b8", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const valueStyle = { color: "#fff", fontSize: "26px", fontWeight: 800, margin: 0, display: "flex", alignItems: "baseline", gap: "6px" };
const currencyStyle = { fontSize: "12px", fontWeight: 600, marginLeft: "4px" };
const actionPanelStyle = { display: "flex", alignItems: "center", gap: "20px", marginBottom: "30px", background: "rgba(15, 23, 42, 0.5)", padding: "20px", borderRadius: "16px", border: "1px solid rgba(0, 242, 254, 0.2)", boxShadow: "0 10px 40px rgba(0, 0, 0, 0.4)", backdropFilter: "blur(10px)" };
const buttonStyle = { display: "flex", alignItems: "center", gap: "10px", padding: "14px 24px", border: "none", borderRadius: "12px", color: "#fff", fontWeight: 700, fontSize: "14px", transition: "all 0.2s", boxShadow: "0 6px 20px rgba(0, 0, 0, 0.3)" };
const chartTitleStyle = { color: "#e2e8f0", fontSize: "16px", fontWeight: 700, marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" };