import { useEffect, useMemo, useState, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/config.js";
import {
  FaRobot, FaTimes, FaVolumeUp, FaVolumeMute, FaPlay,
  FaRedo, FaCheckCircle, FaChevronRight, FaParking,
  FaArrowRight, FaArrowUp, FaSpinner, FaDoorOpen,
  FaMapMarkerAlt, FaCompass, FaMicrophone, FaSignInAlt,
} from "react-icons/fa";

// Extrae el piso del nombre del cajón (P2-05 → 2)
function extractPiso(espacio) {
  const m = (espacio || "").match(/P(\d+)/i);
  return m ? parseInt(m[1], 10) : 1;
}

export default function AsistenteVirtual() {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reserva, setReserva] = useState(null);
  const [step, setStep] = useState(-1);
  const [autoPlay, setAutoPlay] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const synthRef = useRef(null);

  const hasVoice =
    typeof window !== "undefined" && "speechSynthesis" in window;

  // Init voice
  useEffect(() => {
    synthRef.current = hasVoice ? window.speechSynthesis : null;
    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [hasVoice]);

  // Cargar reserva activa
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setLoading(false);
        return;
      }
      try {
        const q = query(
          collection(db, "reservas"),
          where("uid", "==", u.uid)
        );
        const snap = await getDocs(q);
        let activa = null;
        snap.forEach((d) => {
          const data = { id: d.id, ...d.data() };
          if ((data.estado || "").toLowerCase() === "activa") activa = data;
        });
        setReserva(activa);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Pasos de navegación
  const pasos = useMemo(() => {
    if (!reserva) return [];
    const piso = extractPiso(reserva.espacio);
    return [
      {
        icon: FaDoorOpen,
        title: "Bienvenido",
        text: `Bienvenido a ${reserva.estacionamiento}. Estás en la entrada principal.`,
      },
      {
        icon: FaArrowRight,
        title: "Paso 1",
        text: "Camina hacia el pasillo central siguiendo las líneas amarillas.",
      },
      {
        icon: FaArrowUp,
        title: "Paso 2",
        text:
          piso > 1
            ? `Toma el elevador y sube al piso ${piso}.`
            : "Tu cajón está en la planta baja, no necesitas subir.",
      },
      {
        icon: FaCompass,
        title: "Paso 3",
        text:
          piso > 1
            ? `Al salir del elevador en el piso ${piso}, gira a la derecha.`
            : "Al entrar, gira ligeramente a la derecha.",
      },
      {
        icon: FaParking,
        title: "Paso 4",
        text: `Tu cajón ${reserva.espacio} está al final del pasillo, junto a la pared.`,
      },
      {
        icon: FaCheckCircle,
        title: "¡Llegaste!",
        text: `¡Has llegado a tu cajón ${reserva.espacio}! Que tengas un excelente día.`,
      },
    ];
  }, [reserva]);

  // Hablar
  const hablar = (texto) => {
    if (!synthRef.current || muted) return;
    synthRef.current.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "es-MX";
    u.rate = 1;
    u.pitch = 1.05;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synthRef.current.speak(u);
  };

  const detenerVoz = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setSpeaking(false);
    }
  };

  const siguientePaso = () => {
    if (step < pasos.length - 1) {
      const next = step + 1;
      setStep(next);
      hablar(pasos[next].text);
    }
  };

  const iniciarGuia = () => {
    setStep(0);
    hablar(pasos[0].text);
  };

  const reiniciar = () => {
    detenerVoz();
    setStep(-1);
  };

  // Auto-avance
  useEffect(() => {
    if (!autoPlay || step < 0 || step >= pasos.length - 1) return;
    if (speaking) return;
    const t = setTimeout(() => siguientePaso(), 3500);
    return () => clearTimeout(t);
  }, [autoPlay, step, speaking, pasos.length]);

  // Detener voz al cerrar
  useEffect(() => {
    if (!open) detenerVoz();
  }, [open]);

  const progress = step < 0 ? 0 : ((step + 1) / pasos.length) * 100;

  return (
    <>
      {/* ========= FAB ========= */}
      <button
        className={`av-fab ${open ? "open" : ""} ${speaking ? "speaking" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir asistente"
      >
        {!open && (
          <>
            <span className="av-ring"></span>
            <span className="av-ring av-ring-2"></span>
          </>
        )}
        {open ? <FaTimes /> : <FaRobot />}
        {!open && reserva && <span className="av-badge">1</span>}
      </button>

      {/* ========= PANEL ========= */}
      {open && (
        <div className="av-panel">
          <header className="av-header">
            <div className={`av-avatar ${speaking ? "speaking" : ""}`}>
              <FaRobot />
            </div>
            <div className="av-header-info">
              <h3>Asistente SmartPark</h3>
              <p>
                <span className={`av-dot ${speaking ? "speaking" : ""}`}></span>
                {speaking ? "Hablando..." : "En línea"}
              </p>
            </div>
            <button
              className="av-btn"
              onClick={() => {
                setMuted((v) => !v);
                if (!muted) detenerVoz();
              }}
              title={muted ? "Activar voz" : "Silenciar"}
            >
              {muted ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>
          </header>

          <div className="av-body">
            {loading ? (
              <div className="av-loading">
                <FaSpinner className="spin" size={28} color="#00f2fe" />
                <p>Buscando tu reserva...</p>
              </div>
            ) : !reserva ? (
              <div className="av-empty">
                <div className="av-empty-icon">
                  <FaMapMarkerAlt />
                </div>
                <h4>Sin reserva activa</h4>
                <p>
                  Cuando reserves un cajón, podré guiarte paso a paso hasta él.
                </p>
                <a
                  href="#/reservar"
                  className="av-cta"
                  onClick={() => setOpen(false)}
                >
                  <FaSignInAlt /> Ir a Reservar
                </a>
              </div>
            ) : step < 0 ? (
              <div className="av-welcome">
                <div className="av-welcome-icon">
                  <FaRobot />
                </div>
                <h4>¡Hola! 👋</h4>
                <p>
                  Tienes una reserva activa en{" "}
                  <strong>{reserva.estacionamiento}</strong> para el cajón{" "}
                  <strong>{reserva.espacio}</strong>.
                </p>
                <p className="av-sub">
                  ¿Quieres que te guíe hasta tu lugar paso a paso?
                </p>
                <button className="av-cta" onClick={iniciarGuia}>
                  <FaPlay /> Iniciar guía
                </button>
              </div>
            ) : (
              <div className="av-steps">
                <div className="av-progress">
                  <div
                    className="av-progress-bar"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="av-progress-text">
                  Paso {step + 1} de {pasos.length}
                </div>

                <div className="av-step" key={step}>
                  <div className="av-step-icon">
                    {(() => {
                      const Icon = pasos[step].icon;
                      return <Icon />;
                    })()}
                  </div>
                  <h4>{pasos[step].title}</h4>
                  <p>{pasos[step].text}</p>
                </div>

                <div className="av-controls">
                  {step < pasos.length - 1 ? (
                    <button className="av-cta" onClick={siguientePaso}>
                      Siguiente <FaChevronRight />
                    </button>
                  ) : (
                    <button
                      className="av-cta av-cta-success"
                      onClick={reiniciar}
                    >
                      <FaRedo /> Reiniciar
                    </button>
                  )}
                  <button
                    className="av-btn av-btn-secondary"
                    onClick={() =>
                      speaking ? detenerVoz() : hablar(pasos[step].text)
                    }
                    title={speaking ? "Detener" : "Repetir"}
                  >
                    {speaking ? <FaVolumeMute /> : <FaMicrophone />}
                  </button>
                </div>

                <label className="av-toggle">
                  <input
                    type="checkbox"
                    checked={autoPlay}
                    onChange={(e) => setAutoPlay(e.target.checked)}
                  />
                  <span>Avanzar automáticamente</span>
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========= ESTILOS ========= */}
      <style>{`
        @keyframes av-pulse {
          0%   { transform: scale(1);   opacity: .7; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes av-float {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-6px); }
        }
        @keyframes av-slideIn {
          from { opacity: 0; transform: translateY(20px) scale(.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes av-spin { to { transform: rotate(360deg); } }
        @keyframes av-bounce {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-4px); }
        }
        @keyframes av-dot {
          0%,100% { opacity: 1; }
          50%     { opacity: .3; }
        }
        @keyframes av-speaking {
          0%,100% { transform: scale(1);    box-shadow: 0 10px 40px rgba(0,242,254,.5); }
          50%     { transform: scale(1.05); box-shadow: 0 15px 50px rgba(0,242,254,.8); }
        }
        @keyframes av-avatarPulse {
          0%,100% { transform: scale(1); }
          50%     { transform: scale(1.08); }
        }

        /* ========= FAB ========= */
        .av-fab {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00f2fe, #4facfe);
          color: #0f172a;
          border: none;
          font-size: 26px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 40px rgba(0, 242, 254, 0.5);
          z-index: 9999;
          transition: transform .3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow .3s, background .3s;
          animation: av-float 3s ease-in-out infinite;
        }
        .av-fab:hover {
          transform: scale(1.1);
          box-shadow: 0 15px 50px rgba(0, 242, 254, 0.7);
        }
        .av-fab.open {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          animation: none;
          box-shadow: 0 10px 40px rgba(239, 68, 68, 0.5);
        }
        .av-fab.speaking {
          animation: av-speaking 1s ease-in-out infinite;
        }
        .av-fab > svg {
          position: relative;
          z-index: 2;
        }
        .av-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid #00f2fe;
          pointer-events: none;
          animation: av-pulse 2s ease-out infinite;
        }
        .av-ring-2 { animation-delay: 1s; }
        .av-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 22px;
          height: 22px;
          background: #ef4444;
          color: #fff;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #0f172a;
          animation: av-bounce 1.5s ease-in-out infinite;
        }

        /* ========= PANEL ========= */
        .av-panel {
          position: fixed;
          bottom: 100px;
          right: 24px;
          width: 360px;
          max-height: calc(100vh - 140px);
          background: #1e293b;
          border: 1px solid rgba(0, 242, 254, 0.25);
          border-radius: 20px;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 242, 254, 0.1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          z-index: 9999;
          animation: av-slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          backdrop-filter: blur(20px);
        }

        .av-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: linear-gradient(135deg, rgba(0, 242, 254, 0.1), rgba(16, 185, 129, 0.05));
          border-bottom: 1px solid rgba(0, 242, 254, 0.15);
        }
        .av-avatar {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00f2fe, #4facfe);
          color: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          position: relative;
          flex-shrink: 0;
        }
        .av-avatar.speaking {
          animation: av-avatarPulse 0.8s ease-in-out infinite;
        }
        .av-avatar.speaking::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid #00f2fe;
          animation: av-pulse 1s ease-out infinite;
        }
        .av-header-info {
          flex: 1;
          min-width: 0;
        }
        .av-header-info h3 {
          margin: 0;
          font-size: 15px;
          color: #e2e8f0;
          font-weight: 700;
        }
        .av-header-info p {
          margin: 2px 0 0;
          font-size: 12px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .av-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          display: inline-block;
        }
        .av-dot.speaking {
          background: #00f2fe;
          animation: av-dot 0.8s ease-in-out infinite;
        }

        .av-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: all 0.2s;
          flex-shrink: 0;
          font-family: inherit;
        }
        .av-btn:hover {
          color: #00f2fe;
          border-color: rgba(0, 242, 254, 0.4);
          background: rgba(0, 242, 254, 0.1);
        }
        .av-btn-secondary {
          background: transparent;
        }

        .av-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
          font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif;
        }

        .av-loading {
          text-align: center;
          padding: 30px 10px;
          color: #94a3b8;
        }
        .av-loading p {
          margin-top: 12px;
          font-size: 13px;
        }
        .spin { animation: av-spin 1s linear infinite; }

        /* Empty / Welcome */
        .av-empty, .av-welcome {
          text-align: center;
          padding: 12px 0;
          animation: av-slideIn 0.4s ease;
        }
        .av-empty-icon, .av-welcome-icon {
          width: 72px;
          height: 72px;
          margin: 0 auto 16px;
          border-radius: 50%;
          background: rgba(0, 242, 254, 0.1);
          border: 2px dashed rgba(0, 242, 254, 0.35);
          color: #00f2fe;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          animation: av-bounce 3s ease-in-out infinite;
        }
        .av-welcome-icon {
          background: linear-gradient(135deg, rgba(0, 242, 254, 0.15), rgba(16, 185, 129, 0.1));
          border-style: solid;
        }
        .av-empty h4, .av-welcome h4 {
          margin: 0 0 10px;
          color: #e2e8f0;
          font-size: 17px;
        }
        .av-empty p, .av-welcome p {
          margin: 0 0 8px;
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.6;
        }
        .av-welcome p strong { color: #00f2fe; }
        .av-sub {
          font-size: 12px !important;
          color: #64748b !important;
          margin-bottom: 20px !important;
        }

        .av-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 22px;
          background: linear-gradient(135deg, #00f2fe, #4facfe);
          color: #0f172a;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          text-decoration: none;
          margin-top: 8px;
          width: 100%;
        }
        .av-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 242, 254, 0.35);
        }
        .av-cta-success {
          background: linear-gradient(135deg, #10b981, #059669);
        }
        .av-cta-success:hover {
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4);
        }

        /* Steps */
        .av-steps {
          animation: av-slideIn 0.3s ease;
        }
        .av-progress {
          height: 6px;
          background: rgba(51, 65, 85, 0.5);
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .av-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #00f2fe, #10b981);
          border-radius: 999px;
          transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 0 10px rgba(0, 242, 254, 0.5);
        }
        .av-progress-text {
          font-size: 11px;
          color: #64748b;
          text-align: right;
          margin-bottom: 16px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .av-step {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(0, 242, 254, 0.15);
          border-radius: 14px;
          padding: 20px 16px;
          text-align: center;
          margin-bottom: 16px;
          animation: av-slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          min-height: 140px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .av-step-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(16, 185, 129, 0.15));
          color: #00f2fe;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          margin-bottom: 12px;
        }
        .av-step h4 {
          margin: 0 0 8px;
          color: #00f2fe;
          font-size: 15px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .av-step p {
          margin: 0;
          color: #e2e8f0;
          font-size: 14px;
          line-height: 1.6;
        }

        .av-controls {
          display: flex;
          gap: 10px;
          margin-bottom: 12px;
        }
        .av-controls .av-cta {
          flex: 1;
          margin-top: 0;
        }

        .av-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #64748b;
          cursor: pointer;
          user-select: none;
        }
        .av-toggle input {
          accent-color: #00f2fe;
          cursor: pointer;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .av-panel {
            right: 12px;
            left: 12px;
            width: auto;
            bottom: 90px;
            max-height: calc(100vh - 120px);
          }
          .av-fab {
            bottom: 16px;
            right: 16px;
            width: 56px;
            height: 56px;
            font-size: 22px;
          }
        }
      `}</style>
    </>
  );
}