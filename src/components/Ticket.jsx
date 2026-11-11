import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  doc, getDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config.js";
import {
  FaSpinner, FaCheckCircle, FaTimesCircle, FaExclamationTriangle,
  FaParking, FaBuilding, FaArrowRight, FaCalendarAlt, FaClock,
  FaCar, FaQrcode, FaRoute,
} from "react-icons/fa";

export default function Ticket() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading"); // loading | ready | already | expired | error
  const [qr, setQr] = useState(null);
  const [reserva, setReserva] = useState(null);
  const [error, setError] = useState(null);
  const [showLlegada, setShowLlegada] = useState(false);

  useEffect(() => {
    const qrId = searchParams.get("qrId");
    if (!qrId) {
      setError("Falta el ID del código QR en la URL");
      setStatus("error");
      return;
    }

    let cancel = false;

    const validar = async () => {
      try {
        const qrRef = doc(db, "codigos_qr", qrId);
        const qrSnap = await getDoc(qrRef);

        if (!qrSnap.exists()) {
          setError("No encontramos ese código QR");
          setStatus("error");
          return;
        }

        const qrData = { id: qrSnap.id, ...qrSnap.data() };
        if (cancel) return;
        setQr(qrData);

        // 🔒 Verificar estado
        if (qrData.estado === "escaneado") {
          setStatus("already");
          return;
        }

        if (qrData.estado === "cancelado") {
          setStatus("expired");
          return;
        }

        // ⏱️ Verificar expiración manual (por si el cron no lo ha cancelado)
        const expira = qrData.expiraEn?.toDate?.() || new Date(qrData.expiraEn);
        if (new Date() > expira) {
          await updateDoc(qrRef, { estado: "cancelado" });
          setStatus("expired");
          return;
        }

        // ✅ Marcar como escaneado
        await updateDoc(qrRef, {
          estado: "escaneado",
          escaneadoEn: serverTimestamp(),
        });

        // 📥 Cargar la reserva
        const reservaSnap = await getDoc(doc(db, "reservas", qrData.reservaId));
        if (reservaSnap.exists()) {
          setReserva({ id: reservaSnap.id, ...reservaSnap.data() });
        }

        if (cancel) return;
        setStatus("ready");

        // 🎬 Mostrar modal de llegada con retraso para animación
        setTimeout(() => {
          if (!cancel) setShowLlegada(true);
        }, 700);
      } catch (err) {
        console.error(err);
        if (cancel) return;
        setError(err.message);
        setStatus("error");
      }
    };

    validar();
    return () => {
      cancel = true;
    };
  }, [searchParams]);

  return (
    <div className="tk-page">
      <div className="tk-bg">
        <div className="tk-blob b1"></div>
        <div className="tk-blob b2"></div>
        <div className="tk-grid"></div>
      </div>

      <div className="tk-container">
        {status === "loading" && (
          <div className="tk-card tk-card--loading">
            <div className="tk-orbit">
              <div className="tk-orbit-ring"></div>
              <div className="tk-orbit-ring"></div>
              <div className="tk-orbit-ring"></div>
              <FaSpinner className="tk-spin" size={26} color="#00f2fe" />
            </div>
            <h2>Validando tu código QR...</h2>
            <p>Estamos revisando tu reserva con el sistema.</p>
          </div>
        )}

        {status === "error" && (
          <div className="tk-card tk-card--error">
            <div className="tk-icon tk-icon--error">
              <FaTimesCircle />
              <span className="tk-icon-ring"></span>
            </div>
            <h2>No pudimos validar tu QR</h2>
            <p>{error}</p>
            <Link to="/reservas" className="tk-btn">
              <FaArrowRight /> Ir a mis reservas
            </Link>
          </div>
        )}

        {status === "already" && (
          <div className="tk-card tk-card--warn">
            <div className="tk-icon tk-icon--warn">
              <FaQrcode />
              <span className="tk-icon-ring"></span>
            </div>
            <h2>Este QR ya fue escaneado</h2>
            <p>
              El código ya fue utilizado previamente.
              {qr?.escaneadoEn && (
                <> Fue escaneado el{" "}
                  {qr.escaneadoEn.toDate?.().toLocaleString("es-MX") || "—"}
                </>
              )}
            </p>
            <Link to="/reservas" className="tk-btn">
              <FaArrowRight /> Ir a mis reservas
            </Link>
          </div>
        )}

        {status === "expired" && (
          <div className="tk-card tk-card--warn">
            <div className="tk-icon tk-icon--warn">
              <FaExclamationTriangle />
              <span className="tk-icon-ring"></span>
            </div>
            <h2>Este QR expiró</h2>
            <p>
              El código QR tenía 1 hora para ser escaneado y ya pasó ese
              tiempo. Genera uno nuevo desde "Mis Reservas".
            </p>
            <Link to="/reservas" className="tk-btn">
              <FaArrowRight /> Generar nuevo QR
            </Link>
          </div>
        )}

        {status === "ready" && reserva && (
          <div className="tk-card tk-card--ready">
            <div className="tk-icon tk-icon--success">
              <FaCheckCircle />
              <span className="tk-icon-ring"></span>
              <span className="tk-icon-ring tk-icon-ring--2"></span>
            </div>
            <h1>¡Llegaste!</h1>
            <p className="tk-subtitle">
              <FaQrcode /> Código QR validado correctamente
            </p>

            <div className="tk-info">
              <div className="tk-info-row">
                <FaBuilding />
                <div>
                  <span>Estacionamiento</span>
                  <p>{reserva.estacionamiento || "—"}</p>
                </div>
              </div>
              <div className="tk-info-row">
                <FaParking />
                <div>
                  <span>Cajón</span>
                  <p className="tk-hl">{reserva.espacio || "—"}</p>
                </div>
              </div>
              <div className="tk-info-row">
                <FaCalendarAlt />
                <div>
                  <span>Fecha</span>
                  <p>{reserva.fecha || "—"}</p>
                </div>
              </div>
              <div className="tk-info-row">
                <FaClock />
                <div>
                  <span>Horario</span>
                  <p>{reserva.horario || "—"}</p>
                </div>
              </div>
              <div className="tk-info-row">
                <FaCar />
                <div>
                  <span>Vehículo</span>
                  <p>
                    {reserva.marca} {reserva.modelo} · {reserva.placa}
                  </p>
                </div>
              </div>
            </div>

            <Link to="/reservas" className="tk-btn tk-btn--ghost">
              <FaRoute /> Ver mi reserva
            </Link>
          </div>
        )}
      </div>

      {/* ============ MODAL DE LLEGADA ============ */}
      {showLlegada && (
        <div
          className="tk-modal-overlay"
          onClick={() => setShowLlegada(false)}
        >
          <div
            className="tk-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tk-modal-icon">
              <FaCheckCircle />
              <span className="tk-modal-ring"></span>
              <span className="tk-modal-ring tk-modal-ring--2"></span>
            </div>
            <h2>¡Has llegado al estacionamiento!</h2>
            <p className="tk-modal-sub">
              {reserva?.estacionamiento || "Estacionamiento"}
            </p>

            <div className="tk-modal-confetti">
              <span></span><span></span><span></span><span></span>
              <span></span><span></span><span></span><span></span>
            </div>

            <button
              className="tk-btn"
              onClick={() => setShowLlegada(false)}
            >
              <FaCheckCircle /> Entendido
            </button>
          </div>
        </div>
      )}

      {/* ============ ESTILOS ============ */}
      <style>{`
        @keyframes tkFadeIn    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tkCardIn    { 0% { opacity: 0; transform: scale(.92) translateY(20px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes tkSpin      { to { transform: rotate(360deg); } }
        @keyframes tkRing      { 0% { transform: scale(.9); opacity: .9; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes tkOrbit     { to { transform: rotate(360deg); } }
        @keyframes tkOrbitRev  { to { transform: rotate(-360deg); } }
        @keyframes tkBlob1     { 0%,100% { transform: translate(0,0); } 50% { transform: translate(60px,-40px); } }
        @keyframes tkBlob2     { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-70px,50px); } }
        @keyframes tkGridMove  { to { background-position: 60px 60px; } }
        @keyframes tkRowIn     { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes tkModalIn   { 0% { opacity: 0; transform: scale(.7) translateY(40px); } 60% { opacity: 1; transform: scale(1.04) translateY(-5px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes tkConfetti  { 0% { transform: translateY(-30px) rotate(0); opacity: 1; } 100% { transform: translateY(80px) rotate(360deg); opacity: 0; } }
        @keyframes tkPopupRing { 0% { transform: scale(.8); opacity: .9; } 100% { transform: scale(2.4); opacity: 0; } }

        * { box-sizing: border-box; }
        .tk-page {
          min-height: 100vh;
          background: linear-gradient(135deg,#0f172a,#1e293b);
          color: #e2e8f0;
          font-family: 'Outfit','Segoe UI',system-ui,sans-serif;
          padding: 24px 20px;
          position: relative;
          overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          animation: tkFadeIn .4s ease;
        }
        .tk-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
        .tk-blob { position: absolute; width: 500px; height: 500px; border-radius: 50%; filter: blur(90px); opacity: .22; }
        .tk-blob.b1 { background: radial-gradient(circle,#00f2fe,transparent 70%); top: -180px; left: -150px; animation: tkBlob1 18s ease-in-out infinite; }
        .tk-blob.b2 { background: radial-gradient(circle,#8b5cf6,transparent 70%); bottom: -200px; right: -150px; animation: tkBlob2 22s ease-in-out infinite; }
        .tk-grid {
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(0,242,254,.04) 1px,transparent 1px), linear-gradient(90deg,rgba(0,242,254,.04) 1px,transparent 1px);
          background-size: 60px 60px;
          animation: tkGridMove 8s linear infinite;
          mask-image: radial-gradient(circle at center, black 30%, transparent 80%);
          -webkit-mask-image: radial-gradient(circle at center, black 30%, transparent 80%);
        }

        .tk-container { width: 100%; max-width: 520px; position: relative; z-index: 1; }
        .tk-card {
          background: #1e293b;
          border: 1px solid rgba(0,242,254,.2);
          border-radius: 22px;
          padding: 36px 28px;
          text-align: center;
          box-shadow: 0 30px 80px rgba(0,0,0,.5);
          animation: tkCardIn .5s cubic-bezier(.34,1.56,.64,1);
        }
        .tk-card--error, .tk-card--warn { border-color: rgba(239,68,68,.3); }
        .tk-card--warn { border-color: rgba(245,158,11,.35); }
        .tk-card h1 { color: #e2e8f0; font-size: 26px; margin: 0 0 8px; letter-spacing: -0.3px; }
        .tk-card h2 { color: #e2e8f0; font-size: 20px; margin: 16px 0 8px; }
        .tk-card p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 8px; }

        .tk-icon {
          position: relative;
          width: 84px; height: 84px;
          margin: 0 auto 18px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 40px;
          animation: tkCardIn .5s cubic-bezier(.34,1.56,.64,1);
        }
        .tk-icon--success { background: linear-gradient(135deg,#10b981,#34d399); color: #fff; box-shadow: 0 15px 40px rgba(16,185,129,.5); }
        .tk-icon--error { background: rgba(239,68,68,.15); color: #ef4444; border: 2px solid rgba(239,68,68,.4); }
        .tk-icon--warn { background: rgba(245,158,11,.15); color: #f59e0b; border: 2px solid rgba(245,158,11,.4); }
        .tk-icon-ring {
          position: absolute; inset: -8px;
          border: 2px solid currentColor;
          border-radius: 50%;
          opacity: .5;
          animation: tkRing 2s ease-out infinite;
          pointer-events: none;
        }
        .tk-icon-ring--2 { animation-delay: 1s; }

        .tk-subtitle {
          display: inline-flex; align-items: center; gap: 6px;
          color: #00f2fe !important;
          font-size: 12.5px !important;
          padding: 6px 12px;
          background: rgba(0,242,254,.08);
          border: 1px solid rgba(0,242,254,.25);
          border-radius: 999px;
          margin-top: 6px !important;
          margin-bottom: 20px !important;
        }

        .tk-info { display: grid; gap: 10px; text-align: left; margin: 20px 0; }
        .tk-info-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px;
          background: rgba(15,23,42,.6);
          border: 1px solid rgba(148,163,184,.1);
          border-radius: 12px;
          animation: tkRowIn .4s ease backwards;
        }
        .tk-info-row:nth-child(1) { animation-delay: .05s; }
        .tk-info-row:nth-child(2) { animation-delay: .10s; }
        .tk-info-row:nth-child(3) { animation-delay: .15s; }
        .tk-info-row:nth-child(4) { animation-delay: .20s; }
        .tk-info-row:nth-child(5) { animation-delay: .25s; }
        .tk-info-row > svg { color: #00f2fe; font-size: 16px; flex-shrink: 0; }
        .tk-info-row span { display: block; color: #64748b; font-size: 10.5px; text-transform: uppercase; letter-spacing: .5px; font-weight: 600; }
        .tk-info-row p { margin: 2px 0 0; color: #e2e8f0; font-size: 14px; font-weight: 600; }
        .tk-hl { color: #00f2fe !important; letter-spacing: 1px; }

        .tk-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 13px;
          background: linear-gradient(135deg,#00f2fe,#4facfe);
          color: #0f172a;
          border: none; border-radius: 12px;
          font-size: 14px; font-weight: 800;
          text-decoration: none; cursor: pointer;
          font-family: inherit;
          transition: transform .2s, box-shadow .2s;
        }
        .tk-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,242,254,.4); }
        .tk-btn--ghost { background: rgba(0,242,254,.1); color: #00f2fe; border: 1px solid rgba(0,242,254,.35); }

        .tk-orbit { position: relative; width: 90px; height: 90px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; }
        .tk-orbit-ring { position: absolute; inset: 0; border: 2px solid transparent; border-top-color: #00f2fe; border-radius: 50%; animation: tkOrbit 1.2s linear infinite; }
        .tk-orbit-ring:nth-child(2) { inset: 10px; border-top-color: #4facfe; animation-duration: .9s; animation-direction: reverse; }
        .tk-orbit-ring:nth-child(3) { inset: 20px; border-top-color: #8b5cf6; animation-duration: .7s; }
        .tk-spin { animation: tkSpin 1s linear infinite; }

        /* ============ MODAL DE LLEGADA ============ */
        .tk-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(15,23,42,.85);
          backdrop-filter: blur(10px);
          display: flex; align-items: center; justify-content: center;
          z-index: 99999; padding: 20px;
          animation: tkFadeIn .3s ease;
        }
        .tk-modal {
          position: relative;
          max-width: 420px; width: 100%;
          background: linear-gradient(135deg,#1e293b,#0f172a);
          border: 1px solid rgba(16,185,129,.4);
          border-radius: 24px;
          padding: 40px 28px;
          text-align: center;
          box-shadow: 0 40px 100px rgba(0,0,0,.7), 0 0 60px rgba(16,185,129,.2);
          animation: tkModalIn .6s cubic-bezier(.34,1.56,.64,1);
          overflow: hidden;
        }
        .tk-modal-icon {
          position: relative;
          width: 96px; height: 96px;
          margin: 0 auto 20px;
          background: linear-gradient(135deg,#10b981,#34d399);
          color: #fff;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 46px;
          box-shadow: 0 20px 50px rgba(16,185,129,.6);
        }
        .tk-modal-ring {
          position: absolute; inset: -8px;
          border: 2px solid rgba(16,185,129,.6);
          border-radius: 50%;
          animation: tkPopupRing 2s ease-out infinite;
          pointer-events: none;
        }
        .tk-modal-ring--2 { animation-delay: 1s; }
        .tk-modal h2 {
          color: #fff; font-size: 22px; margin: 0 0 8px;
          letter-spacing: -0.3px;
        }
        .tk-modal-sub {
          color: #00f2fe;
          font-size: 15px;
          font-weight: 700;
          margin: 0 0 28px;
        }
        .tk-modal-confetti { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .tk-modal-confetti span {
          position: absolute; width: 8px; height: 8px;
          border-radius: 50%; top: 0;
          animation: tkConfetti 2s ease-out forwards;
        }
        .tk-modal-confetti span:nth-child(1) { left: 10%; background: #00f2fe; animation-delay: .2s; }
        .tk-modal-confetti span:nth-child(2) { left: 22%; background: #10b981; animation-delay: .3s; }
        .tk-modal-confetti span:nth-child(3) { left: 35%; background: #f59e0b; animation-delay: .25s; }
        .tk-modal-confetti span:nth-child(4) { left: 50%; background: #8b5cf6; animation-delay: .35s; }
        .tk-modal-confetti span:nth-child(5) { left: 65%; background: #00f2fe; animation-delay: .4s; }
        .tk-modal-confetti span:nth-child(6) { left: 78%; background: #10b981; animation-delay: .3s; }
        .tk-modal-confetti span:nth-child(7) { left: 88%; background: #ef4444; animation-delay: .5s; }
        .tk-modal-confetti span:nth-child(8) { left: 42%; background: #f59e0b; animation-delay: .55s; }
      `}</style>
    </div>
  );
}