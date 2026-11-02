import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { FiXCircle } from "react-icons/fi";

/**
 * Botón "Cancelar Reserva".
 * Los estilos y animaciones están aquí mismo, controlados con estado de React.
 *
 * Props:
 *  - onClick:  () => void  -> se ejecuta al pulsar (abre tu modal de confirmación)
 *  - disabled: boolean
 */
export default function CancelarReserva({ onClick, disabled = false }) {
  const [hover, setHover] = useState(false);
  const [presionado, setPresionado] = useState(false);
  const [enfocado, setEnfocado] = useState(false);
  const [visible, setVisible] = useState(false);

  // Animación de entrada (fade-up)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const activo = hover && !disabled;
  const hundido = presionado && !disabled;

  const sinMovimiento =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const suave = "cubic-bezier(0.22, 1, 0.36, 1)";
  const rebote = "cubic-bezier(0.34, 1.56, 0.64, 1)";

  // ---------- Estilos ----------
  const estiloBoton = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    marginTop: "15px",
    padding: "13px 26px",
    borderRadius: "12px",
    border: `1px solid ${activo ? "rgba(239, 68, 68, 0.6)" : "var(--border-line)"}`,
    background: "transparent",
    color: activo ? "#f87171" : "var(--text-secondary)",
    fontFamily: "'Outfit', sans-serif",
    fontSize: "14px",
    fontWeight: 600,
    letterSpacing: "0.3px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : visible ? 1 : 0,
    overflow: "hidden",
    isolation: "isolate",
    WebkitTapHighlightColor: "transparent",
    outline: enfocado ? "2px solid #f87171" : "none",
    outlineOffset: "3px",
    boxShadow: activo ? "0 8px 24px rgba(239, 68, 68, 0.18)" : "none",
    transform: !visible
      ? "translateY(10px)"
      : hundido
      ? "translateY(0) scale(0.97)"
      : activo
      ? "translateY(-3px)"
      : "translateY(0)",
    transition: sinMovimiento
      ? "none"
      : [
          `transform ${hundido ? 120 : 350}ms ${suave}`,
          `opacity 500ms ${suave}`,
          `color 350ms ease`,
          `border-color 350ms ease`,
          `box-shadow 350ms ease`,
        ].join(", "),
  };

  // Relleno rojo que sube desde abajo
  const estiloRelleno = {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(239, 68, 68, 0.22), rgba(239, 68, 68, 0.08))",
    transform: activo ? "translateY(0)" : "translateY(100%)",
    transition: sinMovimiento ? "none" : `transform 450ms ${suave}`,
    zIndex: -1,
    pointerEvents: "none",
  };

  const estiloIcono = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "19px",
    transform: activo ? "rotate(90deg) scale(1.15)" : "rotate(0deg) scale(1)",
    transition: sinMovimiento ? "none" : `transform 500ms ${rebote}`,
  };

  return (
    <button
      type="button"
      style={estiloBoton}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPresionado(false);
      }}
      onMouseDown={() => setPresionado(true)}
      onMouseUp={() => setPresionado(false)}
      onTouchStart={() => setPresionado(true)}
      onTouchEnd={() => setPresionado(false)}
      onFocus={(e) => setEnfocado(e.target.matches(":focus-visible"))}
      onBlur={() => setEnfocado(false)}
    >
      <span style={estiloRelleno} aria-hidden="true" />
      <span style={estiloIcono}>
        <FiXCircle />
      </span>
      <span>Cancelar Reserva</span>
    </button>
  );
}

/**
 * Monta el botón dentro de un contenedor del HTML.
 * Uso: montarCancelarReserva(document.getElementById("..."), { onClick })
 */
export function montarCancelarReserva(contenedor, props = {}) {
  const root = createRoot(contenedor);
  root.render(<CancelarReserva {...props} />);
  return root;
}
