import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where, onSnapshot, getDoc, doc,
} from "firebase/firestore";
import { auth, db } from "../firebase/config.js";
import {
  FaRobot, FaTimes, FaVolumeUp, FaVolumeMute, FaPlay,
  FaRedo, FaCheckCircle, FaChevronRight, FaParking,
  FaArrowRight, FaArrowUp, FaSpinner, FaDoorOpen,
  FaMapMarkerAlt, FaCompass, FaMicrophone, FaSignInAlt,
  FaQrcode, FaListUl,
} from "react-icons/fa";

function extractPiso(espacio) {
  const m = (espacio || "").match(/P(\d+)/i);
  return m ? parseInt(m[1], 10) : 1;
}

function isReservaPast(r) {
  if (!r.fecha || !r.horario) return true;
  const inicio = new Date(`${r.fecha}T${r.horario}`);
  const dur = parseInt(r.duracion, 10) || 0;
  const fin = new Date(inicio.getTime() + dur * 60 * 60 * 1000);
  return fin < new Date();
}

const SHOWN_KEY = "smartpark:shown-arrivals";

export default function AsistenteVirtual() {
  /* ============ 1. useState ============ */
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reserva, setReserva] = useState(null);
  const [reservasActivas, setReservasActivas] = useState([]);
  const [step, setStep] = useState(-1);
  const [autoPlay, setAutoPlay] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const [showLlegada, setShowLlegada] = useState(false);
  const [llegadaInfo, setLlegadaInfo] = useState(null);

  /* ============ 2. useRef ============ */
  const synthRef = useRef(null);
  const shownQRsRef = useRef(new Set());
  const hasVoice =
    typeof window !== "undefined" && "speechSynthesis" in window;

  /* ============ 3. Cargar QRs ya mostrados ============ */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SHOWN_KEY) || "[]");
      shownQRsRef.current = new Set(saved);
    } catch {
      shownQRsRef.current = new Set();
    }
  }, []);

  /* ============ 4. Init voz ============ */
  useEffect(() => {
    synthRef.current = hasVoice ? window.speechSynthesis : null;
    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [hasVoice]);

  /* ============ 5. Auth ============ */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setReservasActivas([]);
        setReserva(null);
        setOpen(false);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  /* ============ 6. Listener en tiempo real de codigos_qr ============ */
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "codigos_qr"),
      where("uid", "==", user.uid),
      where("estado", "in", ["activo", "escaneado"])
    );

    const unsub = onSnapshot(q, async (snap) => {
      try {
        const qrs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const scannedQRs = qrs.filter((x) => x.estado === "escaneado");
        const reservaIds = [
          ...new Set(scannedQRs.map((x) => x.reservaId).filter(Boolean)),
        ];

        const activas = [];
        for (const rid of reservaIds) {
          try {
            const rSnap = await getDoc(doc(db, "reservas", rid));
            if (!rSnap.exists()) continue;
            const rData = { id: rSnap.id, ...rSnap.data() };

            if ((rData.estado || "").toLowerCase() === "cancelada") continue;
            if (isReservaPast(rData)) continue;

            const qr = scannedQRs.find((x) => x.reservaId === rid);
            if (!qr) continue;

            activas.push({ ...rData, _qr: qr });
          } catch (err) {
            console.warn("Error fetching reserva:", err);
          }
        }

        setReservasActivas(activas);
        setLoading(false);

        const newlyScanned = scannedQRs.filter((qr) => {
          if (shownQRsRef.current.has(qr.id)) return false;
          const scannedAt = qr.escaneadoEn?.toDate?.();
          if (!scannedAt) return true;
          const minutesAgo = (Date.now() - scannedAt.getTime()) / 60000;
          return minutesAgo < 30;
        });

        if (newlyScanned.length > 0) {
          const latest = newlyScanned[0];
          const correspondiente = activas.find(
            (r) => r.id === latest.reservaId
          );
          if (correspondiente) {
            setLlegadaInfo({ reserva: correspondiente, qr: latest });
            setShowLlegada(true);
            shownQRsRef.current.add(latest.id);
            localStorage.setItem(
              SHOWN_KEY,
              JSON.stringify([...shownQRsRef.current])
            );
          }
        }
      } catch (err) {
        console.error("Error procesando snapshot de QR:", err);
        setLoading(false);
      }
    });

    return () => unsub();
  }, [user]);

  /* ============ 7. Sincronizar reserva con la lista ============ */
  useEffect(() => {
    const stillActive = reservasActivas.some((r) => r.id === reserva?.id);

    if (reserva && !stillActive) {
      if (reservasActivas.length === 1) {
        setReserva(reservasActivas[0]);
        setStep(-1);
      } else if (reservasActivas.length === 0) {
        setReserva(null);
        setStep(-1);
        setOpen(false);
      } else {
        setReserva(null);
        setStep(-1);
      }
      return;
    }

    if (!reserva && reservasActivas.length === 1) {
      setReserva(reservasActivas[0]);
    }
  }, [reservasActivas, reserva]);

  /* ============ 8. Pasos ============ */
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

  /* ============ 9. Funciones ============ */
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
    if (pasos.length === 0) return;
    setStep(0);
    hablar(pasos[0].text);
  };

  const reiniciar = () => {
    detenerVoz();
    setStep(-1);
  };

  const seleccionarReserva = (r) => {
    detenerVoz();
    setReserva(r);
    setStep(-1);
  };

  const volverASeleccion = () => {
    detenerVoz();
    setReserva(null);
    setStep(-1);
  };

  /* ============ 10. Auto-start ============ */
  useEffect(() => {
    if (!autoStart) return;
    if (!reserva || pasos.length === 0) return;
    if (step >= 0) return;
    setStep(0);
    hablar(pasos[0].text);
    setAutoStart(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, reserva, pasos.length, step]);

  /* ============ 11. Auto-avance ============ */
  useEffect(() => {
    if (!autoPlay || step < 0 || step >= pasos.length - 1) return;
    if (speaking) return;
    const t = setTimeout(() => siguientePaso(), 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, step, speaking, pasos.length]);

  /* ============ 12. Detener voz al cerrar ============ */
  useEffect(() => {
    if (!open) detenerVoz();
  }, [open]);

  /* ============ 13. Handlers del modal ============ */
  const handleVerInstrucciones = () => {
    setShowLlegada(false);
    const r = llegadaInfo?.reserva;
    if (r) {
      setReserva(r);
      setOpen(true);
      setAutoStart(true);
    }
  };

  const handleDespues = () => {
    setShowLlegada(false);
  };

  const progress =
    step < 0 ? 0 : ((step + 1) / Math.max(pasos.length, 1)) * 100;

  const shouldShowAssistant = reservasActivas.length > 0;

  /* ============ 14. Si no hay nada → null ============ */
  if (!shouldShowAssistant && !showLlegada) return null;

  /* ============ 15. Render ============ */
  return (
    <>
      {/* ========= FAB ========= */}
      {shouldShowAssistant && (
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
          {!open && reservasActivas.length > 0 && (
            <span className="av-badge">{reservasActivas.length}</span>
          )}
        </button>
      )}

      {/* ========= PANEL ========= */}
      {open && shouldShowAssistant && (
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
            {reservasActivas.length > 1 && step < 0 && (
              <button
                className="av-btn"
                onClick={volverASeleccion}
                title="Cambiar reserva"
              >
                <FaListUl />
              </button>
            )}
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
                <p>Cargando...</p>
              </div>
            ) : !reserva && reservasActivas.length > 1 ? (
              <div className="av-selection">
                <div className="av-selection-icon">
                  <FaListUl />
                </div>
                <h4>Elige tu reserva</h4>
                <p className="av-sub">Tienes varias reservas activas</p>
                <div className="av-selection-list">
                  {reservasActivas.map((r) => (
                    <button
                      key={r.id}
                      className="av-selection-item"
                      onClick={() => seleccionarReserva(r)}
                    >
                      <div className="av-selection-icon-small">
                        <FaParking />
                      </div>
                      <div className="av-selection-info">
                        <strong>{r.espacio || "—"}</strong>
                        <span>{r.estacionamiento || "—"}</span>
                        <small>
                          {r.fecha} · {r.horario}
                        </small>
                      </div>
                      <FaChevronRight />
                    </button>
                  ))}
                </div>
              </div>
            ) : reserva && step < 0 ? (
              <div className="av-welcome">
                <div className="av-welcome-icon">
                  <FaRobot />
                </div>
                <h4>¡Hola! 👋</h4>
                <p>
                  Reserva en <strong>{reserva.estacionamiento}</strong> para el
                  cajón <strong>{reserva.espacio}</strong>.
                </p>
                <p className="av-sub">
                  ¿Quieres que te guíe hasta tu lugar paso a paso?
                </p>
                <button className="av-cta" onClick={iniciarGuia}>
                  <FaPlay /> Iniciar guía
                </button>
                {reservasActivas.length > 1 && (
                  <button
                    className="av-cta av-cta-ghost"
                    onClick={volverASeleccion}
                    style={{ marginTop: 8 }}
                  >
                    <FaListUl /> Cambiar reserva
                  </button>
                )}
              </div>
            ) : reserva ? (
              <div className="av-steps">
                <div className="av-progress">
                  <div
                    className="av-progress-bar"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="av-progress-text">
                  {reserva.espacio} · Paso {step + 1} de {pasos.length}
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
            ) : null}
          </div>
        </div>
      )}

      {/* ========= MODAL DE LLEGADA (CON AUTO ANIMADO) ========= */}
      {showLlegada && llegadaInfo && (
        <div className="av-arrival-overlay" onClick={handleDespues}>
          <div
            className="av-arrival-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ========= ESCENA ========= */}
            <div className="av-ar-scene">
              <div className="av-ar-sky"></div>

              <div className="av-ar-buildings">
                <span></span><span></span><span></span><span></span><span></span>
              </div>

              <div className="av-ar-sign">P</div>

              <div className="av-ar-spot">
                <span className="av-ar-spot-mark"></span>
              </div>

              <div className="av-ar-road"></div>

              <div className="av-ar-speed">
                <span></span><span></span><span></span><span></span>
              </div>

              <div className="av-ar-car">
                <div className="av-ar-car-shadow"></div>
                <div className="av-ar-car-body">
                  <div className="av-ar-car-roof"></div>
                  <div className="av-ar-car-window"></div>
                  <div className="av-ar-car-window-back"></div>
                  <div className="av-ar-car-door"></div>
                  <div className="av-ar-car-headlight"></div>
                  <div className="av-ar-car-taillight"></div>
                  <div className="av-ar-car-beam"></div>
                </div>
                <div className="av-ar-wheel av-ar-wheel-back"><span></span></div>
                <div className="av-ar-wheel av-ar-wheel-front"><span></span></div>
              </div>

              <div className="av-ar-check">
                <FaCheckCircle />
                <span className="av-ar-check-ring"></span>
                <span className="av-ar-check-ring av-ar-check-ring--2"></span>
              </div>

              <div className="av-ar-sparkles">
                <span></span><span></span><span></span>
                <span></span><span></span><span></span>
              </div>
            </div>

            {/* ========= TEXTO ========= */}
            <div className="av-ar-content">
              <h2>¡Llegaste!</h2>
              <p className="av-ar-sub">
                <FaMapMarkerAlt /> {llegadaInfo.reserva.estacionamiento}
              </p>
              <div className="av-ar-badge">
                <FaParking /> Cajón <strong>{llegadaInfo.reserva.espacio}</strong>
              </div>
            </div>

            {/* ========= BOTONES ========= */}
            <div className="av-ar-actions">
              <button className="av-ar-btn av-ar-btn--ghost" onClick={handleDespues}>
                <FaTimes /> Después
              </button>
              <button
                className="av-ar-btn av-ar-btn--primary"
                onClick={handleVerInstrucciones}
              >
                <FaRobot /> Usar asistente
                <span className="av-ar-btn-shimmer"></span>
              </button>
            </div>

            {/* ========= CONFETTI ========= */}
            <div className="av-ar-confetti">
              <span></span><span></span><span></span><span></span>
              <span></span><span></span><span></span><span></span>
              <span></span><span></span><span></span><span></span>
            </div>
          </div>
        </div>
      )}

      {/* ========= ESTILOS ========= */}
      <style>{`
        @keyframes av-pulse { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes av-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes av-slideIn { from { opacity: 0; transform: translateY(20px) scale(.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes av-spin { to { transform: rotate(360deg); } }
        @keyframes av-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes av-dot { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
        @keyframes av-speaking { 0%,100% { transform: scale(1); box-shadow: 0 10px 40px rgba(0,242,254,.5); } 50% { transform: scale(1.05); box-shadow: 0 15px 50px rgba(0,242,254,.8); } }
        @keyframes av-avatarPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }

        /* ========= FAB ========= */
        .av-fab {
          position: fixed; bottom: 24px; right: 24px;
          width: 64px; height: 64px; border-radius: 50%;
          background: linear-gradient(135deg, #00f2fe, #4facfe);
          color: #0f172a; border: none; font-size: 26px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 10px 40px rgba(0,242,254,.5); z-index: 9999;
          transition: transform .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s, background .3s;
          animation: av-float 3s ease-in-out infinite;
        }
        .av-fab:hover { transform: scale(1.1); box-shadow: 0 15px 50px rgba(0,242,254,.7); }
        .av-fab.open { background: linear-gradient(135deg,#ef4444,#dc2626); animation: none; box-shadow: 0 10px 40px rgba(239,68,68,.5); }
        .av-fab.speaking { animation: av-speaking 1s ease-in-out infinite; }
        .av-fab > svg { position: relative; z-index: 2; }
        .av-ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid #00f2fe; pointer-events: none; animation: av-pulse 2s ease-out infinite; }
        .av-ring-2 { animation-delay: 1s; }
        .av-badge {
          position: absolute; top: -4px; right: -4px;
          min-width: 22px; height: 22px; padding: 0 5px;
          background: #ef4444; color: #fff; border-radius: 999px;
          font-size: 11px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #0f172a;
          animation: av-bounce 1.5s ease-in-out infinite;
        }

        /* ========= PANEL ========= */
        .av-panel {
          position: fixed; bottom: 100px; right: 24px;
          width: 360px; max-height: calc(100vh - 140px);
          background: #1e293b;
          border: 1px solid rgba(0,242,254,.25);
          border-radius: 20px;
          box-shadow: 0 25px 70px rgba(0,0,0,.6), 0 0 0 1px rgba(0,242,254,.1);
          overflow: hidden; display: flex; flex-direction: column;
          z-index: 9999;
          animation: av-slideIn .35s cubic-bezier(.16,1,.3,1);
          backdrop-filter: blur(20px);
        }

        .av-header {
          display: flex; align-items: center; gap: 12px; padding: 16px;
          background: linear-gradient(135deg, rgba(0,242,254,.1), rgba(16,185,129,.05));
          border-bottom: 1px solid rgba(0,242,254,.15);
        }
        .av-avatar {
          width: 46px; height: 46px; border-radius: 50%;
          background: linear-gradient(135deg,#00f2fe,#4facfe);
          color: #0f172a; display: flex; align-items: center; justify-content: center;
          font-size: 22px; position: relative; flex-shrink: 0;
        }
        .av-avatar.speaking { animation: av-avatarPulse .8s ease-in-out infinite; }
        .av-avatar.speaking::after {
          content: ''; position: absolute; inset: -4px; border-radius: 50%;
          border: 2px solid #00f2fe; animation: av-pulse 1s ease-out infinite;
        }
        .av-header-info { flex: 1; min-width: 0; }
        .av-header-info h3 { margin: 0; font-size: 15px; color: #e2e8f0; font-weight: 700; }
        .av-header-info p {
          margin: 2px 0 0; font-size: 12px; color: #94a3b8;
          display: flex; align-items: center; gap: 6px;
        }
        .av-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; }
        .av-dot.speaking { background: #00f2fe; animation: av-dot .8s ease-in-out infinite; }

        .av-btn {
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(15,23,42,.7);
          border: 1px solid rgba(148,163,184,.2);
          color: #94a3b8; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; transition: all .2s; flex-shrink: 0; font-family: inherit;
        }
        .av-btn:hover { color: #00f2fe; border-color: rgba(0,242,254,.4); background: rgba(0,242,254,.1); }
        .av-btn-secondary { background: transparent; }

        .av-body {
          padding: 20px; overflow-y: auto; flex: 1;
          font-family: 'Outfit','Segoe UI',system-ui,sans-serif;
        }

        .av-loading { text-align: center; padding: 30px 10px; color: #94a3b8; }
        .av-loading p { margin-top: 12px; font-size: 13px; }
        .spin { animation: av-spin 1s linear infinite; }

        /* Empty / Welcome / Selection */
        .av-empty, .av-welcome, .av-selection {
          text-align: center; padding: 12px 0;
          animation: av-slideIn .4s ease;
        }
        .av-empty-icon, .av-welcome-icon, .av-selection-icon {
          width: 72px; height: 72px; margin: 0 auto 16px;
          border-radius: 50%;
          background: rgba(0,242,254,.1);
          border: 2px dashed rgba(0,242,254,.35);
          color: #00f2fe; display: flex; align-items: center; justify-content: center;
          font-size: 30px; animation: av-bounce 3s ease-in-out infinite;
        }
        .av-welcome-icon, .av-selection-icon {
          background: linear-gradient(135deg, rgba(0,242,254,.15), rgba(16,185,129,.1));
          border-style: solid;
        }
        .av-empty h4, .av-welcome h4, .av-selection h4 { margin: 0 0 10px; color: #e2e8f0; font-size: 17px; }
        .av-empty p, .av-welcome p, .av-selection p {
          margin: 0 0 8px; color: #94a3b8; font-size: 13px; line-height: 1.6;
        }
        .av-welcome p strong { color: #00f2fe; }
        .av-sub { font-size: 12px !important; color: #64748b !important; margin-bottom: 20px !important; }

        /* Selection list */
        .av-selection-list { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
        .av-selection-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px;
          background: rgba(15,23,42,.6);
          border: 1px solid rgba(0,242,254,.15);
          border-radius: 12px;
          cursor: pointer; color: #e2e8f0;
          font-family: inherit; text-align: left; width: 100%;
          transition: all .2s;
        }
        .av-selection-item:hover {
          border-color: rgba(0,242,254,.5);
          background: rgba(0,242,254,.08);
          transform: translateY(-1px);
        }
        .av-selection-item > svg { color: #00f2fe; font-size: 12px; flex-shrink: 0; }
        .av-selection-icon-small {
          width: 40px; height: 40px; border-radius: 10px;
          background: linear-gradient(135deg, rgba(0,242,254,.2), rgba(16,185,129,.15));
          color: #00f2fe; display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .av-selection-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .av-selection-info strong { font-size: 14px; color: #00f2fe; letter-spacing: .5px; }
        .av-selection-info span { font-size: 12px; color: #e2e8f0; font-weight: 500; }
        .av-selection-info small { font-size: 11px; color: #64748b; }

        /* Botones CTA */
        .av-cta {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 22px;
          background: linear-gradient(135deg,#00f2fe,#4facfe);
          color: #0f172a; border: none; border-radius: 10px;
          font-size: 14px; font-weight: 700;
          cursor: pointer; transition: all .2s; font-family: inherit;
          text-decoration: none; margin-top: 8px; width: 100%;
        }
        .av-cta:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,242,254,.35); }
        .av-cta-ghost { background: rgba(0,242,254,.1); color: #00f2fe; border: 1px solid rgba(0,242,254,.35); }
        .av-cta-ghost:hover { background: rgba(0,242,254,.2); box-shadow: none; }
        .av-cta-success { background: linear-gradient(135deg,#10b981,#059669); }
        .av-cta-success:hover { box-shadow: 0 10px 25px rgba(16,185,129,.4); }

        /* Steps */
        .av-steps { animation: av-slideIn .3s ease; }
        .av-progress { height: 6px; background: rgba(51,65,85,.5); border-radius: 999px; overflow: hidden; margin-bottom: 8px; }
        .av-progress-bar {
          height: 100%; background: linear-gradient(90deg,#00f2fe,#10b981);
          border-radius: 999px;
          transition: width .4s cubic-bezier(.16,1,.3,1);
          box-shadow: 0 0 10px rgba(0,242,254,.5);
        }
        .av-progress-text {
          font-size: 11px; color: #64748b; text-align: right;
          margin-bottom: 16px; font-weight: 600;
          text-transform: uppercase; letter-spacing: .5px;
        }
        .av-step {
          background: rgba(15,23,42,.7);
          border: 1px solid rgba(0,242,254,.15);
          border-radius: 14px; padding: 20px 16px;
          text-align: center; margin-bottom: 16px;
          animation: av-slideIn .4s cubic-bezier(.34,1.56,.64,1);
          min-height: 140px;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
        }
        .av-step-icon {
          width: 56px; height: 56px; border-radius: 14px;
          background: linear-gradient(135deg, rgba(0,242,254,.2), rgba(16,185,129,.15));
          color: #00f2fe; display: flex; align-items: center; justify-content: center;
          font-size: 26px; margin-bottom: 12px;
        }
        .av-step h4 { margin: 0 0 8px; color: #00f2fe; font-size: 15px; text-transform: uppercase; letter-spacing: .5px; }
        .av-step p { margin: 0; color: #e2e8f0; font-size: 14px; line-height: 1.6; }

        .av-controls { display: flex; gap: 10px; margin-bottom: 12px; }
        .av-controls .av-cta { flex: 1; margin-top: 0; }

        .av-toggle {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: #64748b; cursor: pointer; user-select: none;
        }
        .av-toggle input { accent-color: #00f2fe; cursor: pointer; }

        /* ========= MODAL DE LLEGADA ========= */
        @keyframes avArFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .av-arrival-overlay {
          position: fixed; inset: 0;
          background: rgba(15,23,42,.88);
          backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center;
          z-index: 99999; padding: 20px;
          animation: avArFadeIn .3s ease;
        }

        @keyframes avArModalIn {
          0%   { opacity: 0; transform: scale(.7) translateY(40px); }
          60%  { opacity: 1; transform: scale(1.04) translateY(-5px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .av-arrival-modal {
          position: relative; max-width: 460px; width: 100%;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(16,185,129,.4);
          border-radius: 24px; padding: 24px;
          text-align: center; overflow: hidden;
          box-shadow: 0 40px 100px rgba(0,0,0,.7), 0 0 60px rgba(16,185,129,.15);
          animation: avArModalIn .6s cubic-bezier(.34,1.56,.64,1);
        }

        /* ========= ESCENA ========= */
        .av-ar-scene {
          position: relative;
          width: 100%; height: 190px;
          margin: 0 0 20px;
          border-radius: 16px;
          overflow: hidden;
          background: linear-gradient(180deg, #0b1220 0%, #1e293b 55%, #334155 100%);
        }
        .av-ar-sky {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at top, rgba(0,242,254,.18) 0%, transparent 60%);
        }
        .av-ar-buildings {
          position: absolute;
          bottom: 60px; left: 0; right: 0;
          height: 42px;
          display: flex;
          align-items: flex-end;
          gap: 4px;
          padding: 0 6px;
          opacity: .35;
        }
        .av-ar-buildings span {
          flex: 1;
          background: linear-gradient(180deg, #1e293b, #0f172a);
          border-radius: 2px 2px 0 0;
        }
        .av-ar-buildings span:nth-child(1) { height: 40%; }
        .av-ar-buildings span:nth-child(2) { height: 70%; }
        .av-ar-buildings span:nth-child(3) { height: 50%; }
        .av-ar-buildings span:nth-child(4) { height: 90%; }
        .av-ar-buildings span:nth-child(5) { height: 60%; }

        @keyframes avArSignFloat {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50%      { transform: translateY(-4px) rotate(5deg); }
        }
        .av-ar-sign {
          position: absolute;
          top: 12px; right: 14px;
          width: 34px; height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 17px; font-weight: 900;
          box-shadow: 0 0 20px rgba(16,185,129,.7);
          animation: avArSignFloat 2.5s ease-in-out infinite;
          z-index: 3;
        }

        @keyframes avArSpotPulse {
          0%, 100% { border-color: rgba(16,185,129,.5); box-shadow: 0 0 0 0 rgba(16,185,129,.4); }
          50%      { border-color: rgba(16,185,129,1);  box-shadow: 0 0 20px rgba(16,185,129,.6); }
        }
        .av-ar-spot {
          position: absolute;
          bottom: 30px; right: 26px;
          width: 105px; height: 52px;
          border: 2px dashed rgba(16,185,129,.7);
          border-radius: 8px;
          animation: avArSpotPulse 2s ease-in-out infinite;
          z-index: 3;
        }
        .av-ar-spot-mark {
          position: absolute;
          bottom: 4px; left: 50%;
          transform: translateX(-50%);
          width: 20px; height: 3px;
          background: rgba(16,185,129,.5);
          border-radius: 2px;
        }

        @keyframes avArRoadMove { to { background-position: 40px 0; } }
        .av-ar-road {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 30px;
          background: linear-gradient(180deg, #0f172a, #1e293b);
          border-top: 2px solid rgba(0,242,254,.2);
        }
        .av-ar-road::before {
          content: '';
          position: absolute;
          top: 50%; left: 0; right: 0;
          height: 2px; margin-top: -1px;
          background: repeating-linear-gradient(
            90deg,
            rgba(0,242,254,.6) 0 20px,
            transparent 20px 40px
          );
          background-size: 40px 2px;
          animation: avArRoadMove 1s linear infinite;
        }

        /* AUTO */
        @keyframes avArDriveIn {
          0%   { transform: translateX(calc(-50% - 420px)) scale(.7); opacity: 0; }
          30%  { opacity: 1; }
          70%  { transform: translateX(calc(-50% + 18px)) scale(1.06); }
          85%  { transform: translateX(calc(-50% - 8px)) scale(1); }
          100% { transform: translateX(-50%) scale(1); }
        }
        .av-ar-car {
          position: absolute;
          bottom: 30px;
          left: 50%;
          width: 130px;
          height: 70px;
          transform: translateX(-50%);
          animation: avArDriveIn 2s cubic-bezier(.34,1.56,.64,1) forwards;
          z-index: 10;
        }

        @keyframes avArShadowPulse {
          0%, 100% { transform: translateX(-50%) scaleX(1); opacity: .5; }
          50%      { transform: translateX(-50%) scaleX(1.12); opacity: .75; }
        }
        .av-ar-car-shadow {
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 120px; height: 10px;
          background: radial-gradient(ellipse, rgba(0,0,0,.65) 0%, transparent 70%);
          border-radius: 50%;
          animation: avArShadowPulse 2s ease-in-out infinite;
        }

        .av-ar-car-body {
          position: absolute;
          top: 14px; left: 0; right: 0; bottom: 16px;
          background: linear-gradient(180deg, #00f2fe 0%, #4facfe 50%, #0f172a 100%);
          border-radius: 16px 22px 6px 6px;
          box-shadow:
            0 6px 20px rgba(0,242,254,.5),
            inset 0 -3px 6px rgba(0,0,0,.35),
            inset 0 2px 4px rgba(255,255,255,.25);
          overflow: hidden;
        }

        .av-ar-car-roof {
          position: absolute;
          top: 0; left: 22%; right: 18%;
          height: 26%;
          background: linear-gradient(180deg, #00f2fe, #4facfe);
          border-radius: 20px 20px 0 0;
        }
        .av-ar-car-window {
          position: absolute;
          top: 8px; left: 24%; right: 20%;
          height: 16px;
          background: linear-gradient(180deg, rgba(15,23,42,.95), rgba(30,41,59,.7));
          border-radius: 6px 8px 3px 3px;
          border: 1px solid rgba(0,242,254,.3);
        }
        .av-ar-car-window-back {
          position: absolute;
          top: 9px; left: 6%;
          width: 12%; height: 14px;
          background: rgba(15,23,42,.95);
          border-radius: 3px;
        }
        .av-ar-car-door {
          position: absolute;
          top: 26px; left: 38%;
          width: 30%; height: 1.5px;
          background: rgba(15,23,42,.4);
        }

        @keyframes avArHeadlightGlow {
          0%, 100% { box-shadow: 0 0 8px #ffe764, 0 0 16px rgba(255,231,100,.6); }
          50%      { box-shadow: 0 0 16px #ffe764, 0 0 32px rgba(255,231,100,.9); }
        }
        .av-ar-car-headlight {
          position: absolute;
          bottom: 8px; right: 4px;
          width: 9px; height: 6px;
          border-radius: 50%;
          background: #ffe764;
          animation: avArHeadlightGlow 1.2s ease-in-out infinite;
        }
        .av-ar-car-taillight {
          position: absolute;
          bottom: 8px; left: 4px;
          width: 7px; height: 5px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 8px #ef4444;
        }

        @keyframes avArBeamPulse {
          0%, 100% { opacity: .4; }
          50%      { opacity: .95; }
        }
        .av-ar-car-beam {
          position: absolute;
          bottom: 4px; right: -35px;
          width: 35px; height: 14px;
          background: linear-gradient(90deg, rgba(255,231,100,.6), transparent);
          clip-path: polygon(0 30%, 100% 0, 100% 100%, 0 70%);
          animation: avArBeamPulse 1.5s ease-in-out infinite;
        }

        @keyframes avArWheelSpin { to { transform: rotate(360deg); } }
        .av-ar-wheel {
          position: absolute;
          bottom: 0;
          width: 22px; height: 22px;
          border-radius: 50%;
          background: radial-gradient(circle, #1e293b 0%, #0b1220 70%);
          border: 3px solid #0f172a;
          box-shadow: 0 2px 6px rgba(0,0,0,.6);
          animation: avArWheelSpin .6s linear infinite;
          z-index: 2;
        }
        .av-ar-wheel span {
          position: absolute;
          inset: 4px;
          background: conic-gradient(
            from 0deg,
            #334155 0deg 30deg, #64748b 30deg 60deg,
            #334155 60deg 90deg, #64748b 90deg 120deg,
            #334155 120deg 150deg, #64748b 150deg 180deg,
            #334155 180deg 210deg, #64748b 210deg 240deg,
            #334155 240deg 270deg, #64748b 270deg 300deg,
            #334155 300deg 330deg, #64748b 330deg 360deg
          );
          border-radius: 50%;
        }
        .av-ar-wheel-back { left: 14px; }
        .av-ar-wheel-front { right: 14px; }

        @keyframes avArSpeedFade {
          0%   { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(-120px); }
        }
        .av-ar-speed { position: absolute; inset: 0; pointer-events: none; z-index: 5; }
        .av-ar-speed span {
          position: absolute;
          height: 2px; width: 60px;
          background: linear-gradient(90deg, rgba(0,242,254,.9), transparent);
          border-radius: 2px;
          animation: avArSpeedFade 1.4s ease-out forwards;
        }
        .av-ar-speed span:nth-child(1) { top: 30%; left: 60%; animation-delay: .1s; }
        .av-ar-speed span:nth-child(2) { top: 50%; left: 70%; animation-delay: .3s; }
        .av-ar-speed span:nth-child(3) { top: 65%; left: 55%; animation-delay: .2s; }
        .av-ar-speed span:nth-child(4) { top: 45%; left: 65%; animation-delay: .4s; }

        @keyframes avArCheckPop {
          0%   { transform: translateX(-50%) scale(0) rotate(-180deg); opacity: 0; }
          60%  { transform: translateX(-50%) scale(1.3) rotate(10deg); opacity: 1; }
          100% { transform: translateX(-50%) scale(1) rotate(0); }
        }
        .av-ar-check {
          position: absolute;
          top: 12px; left: 50%;
          width: 50px; height: 50px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #34d399);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 26px;
          box-shadow: 0 8px 24px rgba(16,185,129,.6);
          transform: translateX(-50%) scale(0);
          animation: avArCheckPop .7s cubic-bezier(.34,1.56,.64,1) 1.4s forwards;
          z-index: 20;
        }
        @keyframes avArRingPulse {
          0%   { transform: scale(.8); opacity: .9; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .av-ar-check-ring {
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 2px solid rgba(16,185,129,.7);
          animation: avArRingPulse 2s ease-out infinite;
          pointer-events: none;
        }
        .av-ar-check-ring--2 { animation-delay: 1s; }

        @keyframes avArSparkle {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0); }
          50%      { opacity: 1; transform: scale(1) rotate(180deg); }
        }
        .av-ar-sparkles { position: absolute; inset: 0; pointer-events: none; }
        .av-ar-sparkles span {
          position: absolute;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #00f2fe;
          box-shadow: 0 0 8px #00f2fe;
          animation: avArSparkle 2s ease-in-out infinite;
        }
        .av-ar-sparkles span:nth-child(1) { top: 20%; left: 15%; animation-delay: 0s; }
        .av-ar-sparkles span:nth-child(2) { top: 35%; right: 20%; background: #10b981; box-shadow: 0 0 8px #10b981; animation-delay: .3s; }
        .av-ar-sparkles span:nth-child(3) { top: 65%; left: 25%; background: #f59e0b; box-shadow: 0 0 8px #f59e0b; animation-delay: .6s; }
        .av-ar-sparkles span:nth-child(4) { top: 50%; right: 10%; animation-delay: .9s; }
        .av-ar-sparkles span:nth-child(5) { top: 78%; right: 30%; background: #8b5cf6; box-shadow: 0 0 8px #8b5cf6; animation-delay: 1.2s; }
        .av-ar-sparkles span:nth-child(6) { top: 25%; left: 45%; animation-delay: 1.5s; }

        /* TEXTO */
        .av-ar-content { margin-bottom: 20px; position: relative; z-index: 2; }
        .av-ar-content h2 {
          color: #fff;
          font-size: 28px;
          margin: 0 0 8px;
          letter-spacing: -0.5px;
          font-weight: 900;
          background: linear-gradient(135deg, #00f2fe, #10b981);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .av-ar-sub {
          color: #94a3b8;
          font-size: 14px;
          margin: 0 0 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .av-ar-sub svg { color: #00f2fe; }

        .av-ar-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(0,242,254,.1);
          border: 1px solid rgba(0,242,254,.3);
          border-radius: 999px;
          color: #00f2fe;
          font-size: 13px;
          font-weight: 600;
        }
        .av-ar-badge svg { font-size: 12px; }
        .av-ar-badge strong { color: #fff; letter-spacing: .5px; }

        /* BOTONES */
        .av-ar-actions { display: flex; gap: 10px; position: relative; z-index: 2; }
        .av-ar-btn {
          flex: 1;
          padding: 13px 18px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: inherit;
          position: relative;
          overflow: hidden;
          transition: all .2s;
        }
        .av-ar-btn--ghost {
          background: rgba(255,255,255,.05);
          color: #94a3b8;
          border: 1px solid rgba(148,163,184,.25);
        }
        .av-ar-btn--ghost:hover {
          background: rgba(255,255,255,.1);
          color: #e2e8f0;
        }
        .av-ar-btn--primary {
          background: linear-gradient(135deg, #00f2fe, #4facfe);
          color: #0f172a;
          box-shadow: 0 8px 24px rgba(0,242,254,.4);
        }
        .av-ar-btn--primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0,242,254,.6);
        }
        @keyframes avArShimmer {
          0%   { left: -100%; }
          100% { left: 100%; }
        }
        .av-ar-btn-shimmer {
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent);
          animation: avArShimmer 2.5s ease-in-out infinite;
          pointer-events: none;
        }

        /* CONFETTI */
        @keyframes avArConfetti {
          0%   { transform: translateY(-20px) rotate(0); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
        }
        .av-ar-confetti {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          border-radius: 24px;
        }
        .av-ar-confetti span {
          position: absolute;
          width: 8px; height: 8px;
          top: -10px;
          border-radius: 2px;
          animation: avArConfetti 3s ease-out infinite;
        }
        .av-ar-confetti span:nth-child(1)  { left: 8%;  background: #00f2fe; animation-delay: 0s; }
        .av-ar-confetti span:nth-child(2)  { left: 18%; background: #10b981; animation-delay: .3s; }
        .av-ar-confetti span:nth-child(3)  { left: 28%; background: #f59e0b; animation-delay: .6s; }
        .av-ar-confetti span:nth-child(4)  { left: 38%; background: #8b5cf6; animation-delay: .2s; }
        .av-ar-confetti span:nth-child(5)  { left: 48%; background: #ef4444; animation-delay: .5s; }
        .av-ar-confetti span:nth-child(6)  { left: 58%; background: #00f2fe; animation-delay: .8s; }
        .av-ar-confetti span:nth-child(7)  { left: 68%; background: #10b981; animation-delay: .4s; }
        .av-ar-confetti span:nth-child(8)  { left: 78%; background: #f59e0b; animation-delay: .7s; }
        .av-ar-confetti span:nth-child(9)  { left: 88%; background: #8b5cf6; animation-delay: .15s; }
        .av-ar-confetti span:nth-child(10) { left: 13%; background: #ef4444; animation-delay: .9s; }
        .av-ar-confetti span:nth-child(11) { left: 63%; background: #00f2fe; animation-delay: 1.1s; }
        .av-ar-confetti span:nth-child(12) { left: 43%; background: #10b981; animation-delay: 1.3s; }

        @media (max-width: 480px) {
          .av-panel { right: 12px; left: 12px; width: auto; bottom: 90px; max-height: calc(100vh - 120px); }
          .av-fab { bottom: 16px; right: 16px; width: 56px; height: 56px; font-size: 22px; }
          .av-ar-scene { height: 160px; }
          .av-ar-content h2 { font-size: 24px; }
        }
      `}</style>
    </>
  );
}