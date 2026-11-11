import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where, getDocs, doc, updateDoc,
  addDoc, serverTimestamp, Timestamp,        // 🆕
} from "firebase/firestore";
import { auth, db } from "../firebase/config.js";
import { QRCodeSVG } from "qrcode.react";
import DetalleReserva from "./DetalleReserva";

import {
  FaParking, FaCalendarAlt, FaClock, FaHourglassHalf, FaCar,
  FaCheckCircle, FaTimesCircle, FaSpinner, FaTrash,
  FaExclamationTriangle, FaArrowLeft, FaPlus, FaSearch,
  FaHistory, FaQrcode, FaMoneyBillWave,
  FaRoute, FaMapMarkedAlt, FaLocationArrow, FaEye,
  FaTicketAlt, FaCompass, FaFire, FaBolt,
} from "react-icons/fa";

export default function VerReservas() {
  
  const navigate = useNavigate();
const location = useLocation();
const [initialHandled, setInitialHandled] = useState(false);
  const [user, setUser] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [reservaACancelar, setReservaACancelar] = useState(null);

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [reservaQR, setReservaQR] = useState(null);
  const [qrActual, setQrActual] = useState(null);      // 🆕 el doc de Firestore
const [creandoQR, setCreandoQR] = useState(false);   // 🆕 spinner mientras crea

  const [reservaDetalle, setReservaDetalle] = useState(null); // 🆕

  const [cancelando, setCancelando] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate("/login", { replace: true });
        return;
      }
      setUser(u);
      await cargarReservas(u.uid);
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);
  // 🆕 Abrir automáticamente el modal de la reserva recién creada
useEffect(() => {
  if (initialHandled || loading) return;
  const nueva = location.state?.nuevaReserva;
  if (!nueva) return;
  const found = reservas.find((r) => r.id === nueva.id) || nueva;
  setReservaDetalle(found);
  setInitialHandled(true);
  // Limpiar el state para que un refresh/back no vuelva a abrirlo
  navigate(location.pathname, { replace: true, state: {} });
}, [reservas, loading, location.state, initialHandled, navigate, location.pathname]);

  const cargarReservas = async (uid) => {
    try {
      const q = query(collection(db, "reservas"), where("uid", "==", uid));
      const snap = await getDocs(q);
      const data = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
      setReservas(data);
    } catch (err) {
      console.error(err);
      showToast("Error al cargar las reservas", "error");
    }
  };

  const clasificar = (r) => {
    const estado = (r.estado || "").toLowerCase();
    if (estado === "cancelada") return "cancelada";
    if (estado === "activa") {
      const inicio = new Date(`${r.fecha}T${r.horario}`);
      const dur = parseInt(r.duracion, 10) || 0;
      const fin = new Date(inicio.getTime() + dur * 60 * 60 * 1000);
      if (fin < new Date()) return "pasada";
      return "activa";
    }
    return "otra";
  };

  const reservasActivas = useMemo(() => {
    return reservas
      .filter((r) => clasificar(r) === "activa")
      .filter((r) => {
        const q = busqueda.trim().toLowerCase();
        return (
          !q ||
          (r.espacio || "").toLowerCase().includes(q) ||
          (r.estacionamiento || "").toLowerCase().includes(q) ||
          (r.placa || "").toLowerCase().includes(q) ||
          (r.marca || "").toLowerCase().includes(q)
        );
      });
  }, [reservas, busqueda]);

  const totalActivas = useMemo(
    () => reservas.filter((r) => clasificar(r) === "activa").length,
    [reservas]
  );

  const abrirModalCancelar = (r) => {
    setReservaACancelar(r);
    setModalOpen(true);
  };

  const confirmarCancelacion = async () => {
    if (!reservaACancelar) return;
    setCancelando(true);
    try {
      await updateDoc(doc(db, "reservas", reservaACancelar.id), {
        estado: "cancelada",
      });
      setReservas((prev) =>
        prev.map((r) =>
          r.id === reservaACancelar.id ? { ...r, estado: "cancelada" } : r
        )
      );
      showToast("Reserva cancelada exitosamente.", "success");
      setModalOpen(false);
      setReservaACancelar(null);
    } catch (err) {
      console.error(err);
      showToast("No se pudo cancelar la reserva.", "error");
    } finally {
      setCancelando(false);
    }
  };
/* ============================
   🆕 Generar o reutilizar QR
   ============================ */
const crearNuevoQR = async (r) => {
  const ahora = new Date();
  const expira = new Date(ahora.getTime() + 60 * 60 * 1000); // 1 hora

  const nuevoQR = {
    uid: user.uid,
    reservaId: r.id,
    estado: "activo",
    creadoEn: serverTimestamp(),
    expiraEn: Timestamp.fromDate(expira),
    escaneadoEn: null,
  };

  const docRef = await addDoc(collection(db, "codigos_qr"), nuevoQR);
  setQrActual({
    id: docRef.id,
    ...nuevoQR,
    creadoEn: ahora,
    expiraEn: expira,
  });
};

const abrirModalQR = async (r) => {
  setReservaQR(r);
  setQrModalOpen(true);
  setQrActual(null);
  setCreandoQR(true);

  try {
    // 🔍 Buscar QR activo o escaneado existente
    const q = query(
      collection(db, "codigos_qr"),
      where("reservaId", "==", r.id),
      where("uid", "==", user.uid),
      where("estado", "in", ["activo", "escaneado"])
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const data = { id: docSnap.id, ...docSnap.data() };

      // Verificar expiración
      if (data.estado === "activo") {
        const expira =
          data.expiraEn?.toDate?.() || new Date(data.expiraEn);
        if (new Date() > expira) {
          await updateDoc(doc(db, "codigos_qr", data.id), {
            estado: "cancelado",
          });
          await crearNuevoQR(r);
        } else {
          setQrActual(data);
        }
      } else {
        setQrActual(data);
      }
    } else {
      await crearNuevoQR(r);
    }
  } catch (err) {
    console.error(err);
    showToast("Error al generar el QR", "error");
  } finally {
    setCreandoQR(false);
  }
};

const generarTextoQR = (qr) => {
  if (!qr) return "";
  const baseUrl = window.location.origin;
  return `${baseUrl}/#/ticket?qrId=${encodeURIComponent(qr.id)}`;
};



  /* =====================================================
     🎯 TILT 3D siguiendo el cursor
     ===================================================== */
  const handleTilt = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rx = ((y - cy) / cy) * 5;
    const ry = ((cx - x) / cx) * 5;
    el.style.transform = `translateY(-6px) perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
  };
  const handleTiltLeave = (e) => {
    e.currentTarget.style.transform = "";
  };

  const renderCard = (r, i) => (
    <div
      key={r.id}
      className="reserva-item activa"
      style={{ animationDelay: `${i * 90}ms` }}
      onMouseMove={handleTilt}
      onMouseLeave={handleTiltLeave}
    >
      {/* Aro pulsante superior */}
      <span className="card-top-glow"></span>
      {/* Brillo que sigue el cursor */}
      <span className="card-spotlight"></span>
      {/* Carretera animada inferior */}
      <span className="card-road"></span>

      <div className="card-header">
        <div className="badge activa">
          <span className="badge-ring"></span>
          <FaCheckCircle className="badge-icon" />
          ACTIVA
        </div>
        <span className="fecha-creacion">
          <FaCalendarAlt />
          {r.fechaCreacion
            ? new Date(r.fechaCreacion).toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "—"}
        </span>
      </div>

      <div className="cajon-hero">
        <div className="cajon-icon">
          <FaParking />
          <span className="cajon-icon-ping"></span>
        </div>
        <div>
          <span className="cajon-label">Cajón</span>
          <h3 className="cajon-value">{r.espacio || "—"}</h3>
          <p className="cajon-place">
            <FaMapMarkedAlt /> {r.estacionamiento || "—"}
          </p>
        </div>
        <span className="cajon-shine"></span>
      </div>

      <div className="data-grid">
        <div className="data-item" style={{ animationDelay: `${i * 90 + 120}ms` }}>
          <FaCalendarAlt />
          <div>
            <span>Fecha</span>
            <p>{r.fecha || "—"}</p>
          </div>
        </div>
        <div className="data-item" style={{ animationDelay: `${i * 90 + 160}ms` }}>
          <FaClock />
          <div>
            <span>Hora</span>
            <p>{r.horario || "—"}</p>
          </div>
        </div>
        <div className="data-item" style={{ animationDelay: `${i * 90 + 200}ms` }}>
          <FaHourglassHalf />
          <div>
            <span>Duración</span>
            <p>{r.duracion || "—"}</p>
          </div>
        </div>
        {r.placa && (
          <div className="data-item" style={{ animationDelay: `${i * 90 + 240}ms` }}>
            <FaCar />
            <div>
              <span>Placa</span>
              <p className="placa">{r.placa}</p>
            </div>
          </div>
        )}

        <div
          className="data-item data-item--money"
          style={{ animationDelay: `${i * 90 + 280}ms` }}
        >
          <div className="money-icon">
            <FaMoneyBillWave />
            <span className="money-spark"></span>
          </div>
          <div>
            <span style={{ color: "#00f2fe" }}>Costo Total</span>
            <p className="money-value">${r.costoTotal || 0} MXN</p>
          </div>
        </div>
      </div>

      {(r.marca || r.modelo) && (
        <div className="vehiculo-row">
          <FaCar />
          <span>
            {r.marca} {r.modelo && `· ${r.modelo}`}
          </span>
        </div>
      )}

      {/* 🆕 Botón Cómo llegar (arriba, ancho completo) */}
      <button
        className="btn-route"
        onClick={() => setReservaDetalle(r)}
        title="Ver ruta en el mapa"
      >
        <FaRoute className="btn-route-icon" />
        <span>Cómo llegar</span>
        <FaLocationArrow className="btn-route-arrow" />
        <span className="btn-route-shimmer"></span>
      </button>

      <div className="card-actions">
        <button className="btn-qr" onClick={() => abrirModalQR(r)}>
          <FaQrcode /> Ver QR
        </button>
        <button className="btn-cancelar" onClick={() => abrirModalCancelar(r)}>
          <FaTrash /> Cancelar
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="vr-page center-state">
        <div className="loading-orbit">
          <div className="loading-orbit-ring"></div>
          <div className="loading-orbit-ring"></div>
          <div className="loading-orbit-ring"></div>
          <FaSpinner className="spin loading-center" size={26} color="#00f2fe" />
        </div>
        <p>Cargando reservas...</p>
      </div>
    );
  }

  return (
    <div className="vr-page">
      {/* Fondo decorativo */}
      <div className="bg-deco">
        <span className="deco-particle p1"></span>
        <span className="deco-particle p2"></span>
        <span className="deco-particle p3"></span>
        <span className="deco-particle p4"></span>
        <span className="deco-particle p5"></span>
        <span className="deco-ring r1"></span>
        <span className="deco-ring r2"></span>
      </div>

      <div className="container">
        <header className="vr-header">
          <div>
            <Link to="/perfil" className="back-link">
              <FaArrowLeft /> Volver al perfil
            </Link>
            <h2>
              <span className="title-icon-wrap">
                <FaParking className="title-icon" />
                <span className="title-icon-ring"></span>
              </span>
              Mis Reservas Activas
            </h2>
            <p className="subtitle">
              <span className="live-dot"></span>
              {totalActivas > 0
                ? `${totalActivas} reserva${totalActivas !== 1 ? "s" : ""} activa${totalActivas !== 1 ? "s" : ""}`
                : "No tienes reservas activas"}
            </p>
          </div>
          <div className="header-actions">
            <Link to="/historial" className="btn-history">
              <FaHistory /> Historial
            </Link>
            <Link to="/reservar" className="btn-new">
              <FaPlus /> Nueva reserva
              <span className="btn-new-shimmer"></span>
            </Link>
          </div>
        </header>

        <div className="filters">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por cajón, placa o marca..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button
                className="clear-search"
                onClick={() => setBusqueda("")}
                title="Limpiar"
              >
                <FaTimesCircle />
              </button>
            )}
          </div>
        </div>

        {reservasActivas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FaCar className="empty-car" />
              <span className="empty-ring"></span>
            </div>
            <h3>
              {totalActivas === 0
                ? "No tienes reservas activas"
                : "Sin resultados para tu búsqueda"}
            </h3>
            <p>
              {totalActivas === 0
                ? "Crea una nueva reserva y asegura tu cajón."
                : "Prueba con otro término de búsqueda."}
            </p>
            {totalActivas === 0 && (
              <Link to="/reservar" className="btn-new">
                <FaPlus /> Crear reserva
              </Link>
            )}
          </div>
        ) : (
          <div className="reservas-grid">
            {reservasActivas.map(renderCard)}
          </div>
        )}
      </div>
{/* ============ MODAL QR ============ */}
{qrModalOpen && reservaQR && (
  <div className="modal-overlay" onClick={() => setQrModalOpen(false)}>
    <div
      className="modal modal-qr"
      onClick={(e) => e.stopPropagation()}
      style={{ padding: "30px", maxWidth: "360px" }}
    >
      <button
        className="modal-close"
        onClick={() => setQrModalOpen(false)}
        aria-label="Cerrar"
      >
        <FaTimesCircle />
      </button>

      <div className="qr-header-icon">
        <FaTicketAlt />
        <span className="qr-header-ping"></span>
      </div>

      <h3 style={{ marginBottom: "5px" }}>Tu Código QR</h3>
      <p style={{ fontSize: "13px", marginBottom: "16px" }}>
        Escanéalo con la cámara de tu celular.
      </p>

      {/* Estado del QR */}
      {qrActual && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            marginBottom: "14px",
            borderRadius: "999px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: ".4px",
            textTransform: "uppercase",
            background:
              qrActual.estado === "activo"
                ? "rgba(16,185,129,.15)"
                : qrActual.estado === "escaneado"
                ? "rgba(0,242,254,.15)"
                : "rgba(239,68,68,.15)",
            color:
              qrActual.estado === "activo"
                ? "#10b981"
                : qrActual.estado === "escaneado"
                ? "#00f2fe"
                : "#ef4444",
            border: `1px solid ${
              qrActual.estado === "activo"
                ? "rgba(16,185,129,.4)"
                : qrActual.estado === "escaneado"
                ? "rgba(0,242,254,.4)"
                : "rgba(239,68,68,.4)"
            }`,
          }}
        >
          {qrActual.estado === "activo" && <FaCheckCircle />}
          {qrActual.estado === "escaneado" && <FaQrcode />}
          {qrActual.estado === "cancelado" && <FaExclamationTriangle />}
          {qrActual.estado === "activo" && "Válido por 1 hora"}
          {qrActual.estado === "escaneado" && "Ya escaneado"}
          {qrActual.estado === "cancelado" && "Expirado"}
        </div>
      )}

      {creandoQR ? (
        <div
          style={{
            width: "240px",
            height: "240px",
            margin: "0 auto 15px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fff",
            borderRadius: "12px",
          }}
        >
          <FaSpinner className="spin" size={32} color="#00f2fe" />
        </div>
      ) : qrActual ? (
        <div
          style={{
            position: "relative",
            background: "#ffffff",
            padding: "15px",
            borderRadius: "12px",
            display: "flex",
            justifyContent: "center",
            marginBottom: "15px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
          }}
        >
          <QRCodeSVG
            value={generarTextoQR(qrActual)}
            size={240}
            bgColor={"#ffffff"}
            fgColor={"#000000"}
            level={"L"}
            includeMargin={true}
          />
          {qrActual.estado !== "activo" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(15,23,42,.85)",
                borderRadius: "12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color:
                  qrActual.estado === "escaneado" ? "#00f2fe" : "#ef4444",
                fontSize: "14px",
                fontWeight: 800,
                gap: "10px",
                textAlign: "center",
                padding: "20px",
              }}
            >
              {qrActual.estado === "escaneado" ? (
                <>
                  <FaQrcode size={32} />
                  <span>Este QR ya fue escaneado</span>
                </>
              ) : (
                <>
                  <FaExclamationTriangle size={32} />
                  <span>Este QR expiró</span>
                </>
              )}
            </div>
          )}
        </div>
      ) : null}

      <div
        style={{
          background: "rgba(0,0,0,0.2)",
          padding: "12px",
          borderRadius: "10px",
          textAlign: "left",
          fontSize: "13px",
          marginBottom: "20px",
        }}
      >
        <p style={{ margin: "0 0 5px", color: "#00f2fe" }}>
          <strong>
            <FaBolt style={{ marginRight: 4 }} /> Resumen de Reserva:
          </strong>
        </p>
        <p style={{ margin: "0 0 3px", color: "#e2e8f0" }}>
          <FaParking style={{ color: "#00f2fe", marginRight: 6 }} />
          Cajón: {reservaQR.espacio}
        </p>
        <p style={{ margin: "0 0 3px", color: "#e2e8f0" }}>
          <FaCar style={{ color: "#00f2fe", marginRight: 6 }} />
          Placa: {reservaQR.placa}
        </p>
        <p
          style={{
            margin: "5px 0 0",
            color: "#00f2fe",
            fontWeight: "bold",
          }}
        >
          <FaMoneyBillWave style={{ marginRight: 6 }} />
          Total Pagado: ${reservaQR.costoTotal || 0} MXN
        </p>
      </div>

      <button
        className="btn-modal btn-modal-cancel"
        onClick={() => setQrModalOpen(false)}
        style={{
          width: "100%",
          background: "#00f2fe",
          color: "#0f172a",
          border: "none",
        }}
      >
        Cerrar
      </button>
    </div>
  </div>
)}
     
      {/* ============ MODAL CANCELAR ============ */}
      {modalOpen && reservaACancelar && (
        <div
          className="modal-overlay"
          onClick={() => !cancelando && setModalOpen(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              <FaExclamationTriangle />
              <span className="modal-icon-ping"></span>
            </div>
            <h3>¿Cancelar Reserva?</h3>
            <p>
              Vas a liberar el cajón <strong>{reservaACancelar.espacio}</strong> del{" "}
              {reservaACancelar.fecha} a las {reservaACancelar.horario}. Otra
              persona podría ocuparlo.
            </p>
            <div className="modal-buttons">
              <button
                className="btn-modal btn-modal-cancel"
                onClick={() => setModalOpen(false)}
                disabled={cancelando}
              >
                Volver atrás
              </button>
              <button
                className="btn-modal btn-modal-confirm"
                onClick={confirmarCancelacion}
                disabled={cancelando}
              >
                {cancelando ? (
                  <>
                    <FaSpinner className="spin" /> Cancelando...
                  </>
                ) : (
                  <>
                    <FaTrash /> Sí, cancelar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 🆕 MODAL DETALLE / RUTA ============ */}
      {reservaDetalle && (
        <DetalleReserva
          reserva={reservaDetalle}
          onClose={() => setReservaDetalle(null)}
        />
      )}

      {/* ============ TOAST ============ */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span className="toast-icon">
            {toast.type === "success" ? <FaCheckCircle /> : <FaTimesCircle />}
          </span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ============ ESTILOS ============ */}
      <style>{`
        /* ===================== KEYFRAMES ===================== */
        @keyframes fadeIn       { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp     { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin         { to { transform: rotate(360deg); } }
        @keyframes pop          { 0% { transform: scale(0); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @keyframes pulse        { 0%,100% { opacity: .4; } 50% { opacity: .85; } }
        @keyframes toastIn      { from { opacity: 0; transform: translateY(30px) scale(.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes toastBounce  { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px) scale(1.1); } }
        @keyframes modalIn      { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes overlayIn    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes shake        { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        @keyframes glowActive   { 0%,100% { box-shadow: 0 0 0 1px rgba(16,185,129,.35), 0 10px 30px rgba(16,185,129,.15); } 50% { box-shadow: 0 0 0 1px rgba(16,185,129,.6), 0 12px 40px rgba(16,185,129,.3); } }
        @keyframes badgeRing    { 0% { transform: scale(.8); opacity: .9; } 100% { transform: scale(2.6); opacity: 0; } }
        @keyframes badgeIconPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.18); } }
        @keyframes roadMove     { to { background-position: 60px 0; } }
        @keyframes cornerSparkle{ 0%,100% { opacity: .25; transform: rotate(0deg) scale(1); } 50% { opacity: 1; transform: rotate(45deg) scale(1.3); } }
        @keyframes heroShimmer  { 0% { transform: translateX(-120%) skewX(-20deg); } 100% { transform: translateX(220%) skewX(-20deg); } }
        @keyframes moneyPulse   { 0%,100% { text-shadow: 0 0 6px rgba(0,242,254,.3); } 50% { text-shadow: 0 0 14px rgba(0,242,254,.9); } }
        @keyframes moneySpark   { 0%,100% { opacity: .2; transform: scale(.8) rotate(0); } 50% { opacity: 1; transform: scale(1.3) rotate(180deg); } }
        @keyframes routeBtnPulse{ 0%,100% { box-shadow: 0 8px 24px rgba(0,242,254,.35), 0 0 0 0 rgba(0,242,254,.5); } 50% { box-shadow: 0 12px 30px rgba(0,242,254,.55), 0 0 0 8px rgba(0,242,254,0); } }
        @keyframes routeShimmer { 0% { transform: translateX(-120%) skewX(-20deg); } 100% { transform: translateX(220%) skewX(-20deg); } }
        @keyframes routeArrowBounce { 0%,100% { transform: translate(0,0); } 50% { transform: translate(3px,-3px); } }
        @keyframes routeIconWiggle   { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-8deg); } 75% { transform: rotate(8deg); } }
        @keyframes floatY       { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes decoFloat    { 0% { transform: translate(0,0) rotate(0); opacity: .2; } 50% { opacity: .6; } 100% { transform: translate(-30px,-40px) rotate(360deg); opacity: 0; } }
        @keyframes decoRing     { 0%,100% { transform: scale(1); opacity: .15; } 50% { transform: scale(1.5); opacity: .35; } }
        @keyframes liveDotPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(0,242,254,.6); } 50% { box-shadow: 0 0 0 8px rgba(0,242,254,0); } }
        @keyframes titleIconRing{ 0% { transform: scale(.9); opacity: .9; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes cajonPing    { 0% { transform: scale(.9); opacity: .9; } 100% { transform: scale(2.2); opacity: 0; } }
        @keyframes dataSlideIn  { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes emptyCarFloat{ 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-8px) rotate(4deg); } }
        @keyframes emptyRing    { 0% { transform: scale(.7); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes qrPop        { 0% { transform: scale(.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes orbitSpin    { to { transform: rotate(360deg); } }
        @keyframes orbitSpinRev { to { transform: rotate(-360deg); } }
        @keyframes btnNewShimmer{ 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        @keyframes searchIconPulse { 0%,100% { transform: translateY(-50%) scale(1); } 50% { transform: translateY(-50%) scale(1.15); } }

        /* ===================== LAYOUT ===================== */
        * { box-sizing: border-box; }
        .vr-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          font-family: 'Outfit','Segoe UI',system-ui,sans-serif;
          color: #e2e8f0;
          padding: 30px 20px 60px;
          animation: fadeIn .4s ease;
          position: relative;
          overflow-x: hidden;
        }
        .vr-page.center-state {
          display:flex; flex-direction:column;
          align-items:center; justify-content:center; gap:16px;
          color:#94a3b8;
        }
        .spin { animation: spin 1s linear infinite; }
        .container { max-width: 1200px; margin: 0 auto; position: relative; z-index: 1; }

        /* ===================== FONDO DECO ===================== */
        .bg-deco { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
        .deco-particle {
          position: absolute; width: 6px; height: 6px;
          border-radius: 50%; background: #00f2fe;
          box-shadow: 0 0 12px rgba(0,242,254,.8);
        }
        .p1 { top: 12%; left: 8%;  animation: decoFloat 12s ease-in-out infinite; }
        .p2 { top: 72%; left: 14%; animation: decoFloat 16s ease-in-out 1s infinite; background: #8b5cf6; box-shadow: 0 0 12px rgba(139,92,246,.8); }
        .p3 { top: 32%; right: 10%; animation: decoFloat 14s ease-in-out 2s infinite; background: #10b981; box-shadow: 0 0 12px rgba(16,185,129,.8); }
        .p4 { top: 82%; right: 18%; animation: decoFloat 18s ease-in-out 3s infinite; }
        .p5 { top: 50%; left: 50%;  animation: decoFloat 20s ease-in-out 4s infinite; background: #f59e0b; box-shadow: 0 0 12px rgba(245,158,11,.8); }
        .deco-ring {
          position: absolute; border: 1px solid rgba(0,242,254,.4);
          border-radius: 50%;
        }
        .r1 { width: 300px; height: 300px; top: -80px; right: -80px; animation: decoRing 6s ease-in-out infinite; }
        .r2 { width: 200px; height: 200px; bottom: -60px; left: -60px; animation: decoRing 8s ease-in-out 2s infinite; border-color: rgba(139,92,246,.4); }

        /* ===================== HEADER ===================== */
        .vr-header {
          display:flex; align-items:flex-end; justify-content:space-between;
          gap:20px; margin-bottom:24px; flex-wrap:wrap;
          animation: fadeInUp .5s ease;
        }
        .back-link {
          display:inline-flex; align-items:center; gap:8px;
          color:#94a3b8; text-decoration:none; font-size:13px;
          padding:6px 12px; border-radius:8px;
          border:1px solid #334155; margin-bottom:12px;
          transition: all .2s;
        }
        .back-link:hover { color:#00f2fe; border-color: rgba(0,242,254,.4); transform: translateX(-3px); }
        .vr-header h2 {
          display:flex; align-items:center; gap:12px;
          color:#e2e8f0; font-size:30px; margin:0; letter-spacing:-0.5px;
        }
        .title-icon-wrap {
          position: relative;
          width: 42px; height: 42px; border-radius: 12px;
          background: linear-gradient(135deg,#00f2fe,#4facfe);
          color: #0f172a;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px;
          box-shadow: 0 8px 22px rgba(0,242,254,.4);
          animation: floatY 3s ease-in-out infinite;
        }
        .title-icon-ring {
          position: absolute; inset: -3px;
          border: 2px solid rgba(0,242,254,.5);
          border-radius: 15px;
          animation: titleIconRing 2.4s ease-out infinite;
          pointer-events: none;
        }
        .subtitle {
          color:#94a3b8; font-size:14px; margin:8px 0 0;
          display: flex; align-items: center; gap: 8px;
        }
        .live-dot {
          display:inline-block; width:8px; height:8px; border-radius:50%;
          background: #00f2fe;
          animation: liveDotPulse 1.8s ease-in-out infinite;
        }
        .header-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .btn-new {
          position: relative; overflow: hidden;
          display:inline-flex; align-items:center; gap:8px;
          padding:12px 20px;
          background: linear-gradient(135deg,#00f2fe,#4facfe);
          color:#0f172a; border:none; border-radius:10px;
          text-decoration:none; font-size:14px; font-weight:700;
          cursor:pointer;
          transition: opacity .2s, transform .15s, box-shadow .2s;
        }
        .btn-new:hover { opacity:.95; transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,242,254,.35); }
        .btn-new-shimmer {
          position: absolute; inset: 0;
          background: linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);
          transform: translateX(-100%);
          animation: btnNewShimmer 2.8s ease-in-out infinite;
          pointer-events: none;
        }
        .btn-history {
          display:inline-flex; align-items:center; gap:8px;
          padding:12px 20px;
          background: rgba(30,41,59,.7); color:#94a3b8;
          border:1px solid #334155; border-radius:10px;
          text-decoration:none; font-size:14px; font-weight:600; cursor:pointer;
          transition: all .2s;
        }
        .btn-history:hover {
          color:#00f2fe; border-color: rgba(0,242,254,.4);
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0,242,254,.15);
        }

        /* ===================== FILTROS ===================== */
        .filters {
          display:flex; align-items:center; gap:16px; flex-wrap:wrap;
          margin-bottom:24px;
          animation: fadeInUp .5s ease .1s backwards;
        }
        .search-box { position:relative; flex:1; min-width:240px; max-width:420px; }
        .search-icon {
          position:absolute; left:14px; top:50%; transform: translateY(-50%);
          color:#64748b; pointer-events:none;
          transition: color .2s;
        }
        .search-box:focus-within .search-icon {
          color:#00f2fe;
          animation: searchIconPulse 1.5s ease-in-out infinite;
        }
        .search-box input {
          width:100%;
          padding:12px 40px 12px 40px;
          background:#1e293b;
          border:1px solid #334155; border-radius:10px;
          color:#e2e8f0; font-size:14px; outline:none;
          font-family: inherit;
          transition: border-color .2s, box-shadow .2s;
        }
        .search-box input:focus {
          border-color:#00f2fe;
          box-shadow: 0 0 0 3px rgba(0,242,254,.15);
        }
        .clear-search {
          position: absolute; right: 10px; top: 50%;
          transform: translateY(-50%);
          background: transparent; border: none; cursor: pointer;
          color: #64748b; display: flex; padding: 4px;
          border-radius: 6px;
          transition: color .2s, background .2s;
        }
        .clear-search:hover { color: #ef4444; background: rgba(239,68,68,.1); }

        /* ===================== GRID ===================== */
        .reservas-grid {
          display:grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap:20px;
          animation: fadeIn .4s ease;
        }

        /* ===================== CARD ===================== */
        .reserva-item {
          position: relative;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 16px; padding: 22px;
          display: flex; flex-direction: column; gap: 16px;
          animation: fadeInUp .55s cubic-bezier(.16,1,.3,1) backwards;
          transition: transform .25s ease, border-color .25s, box-shadow .25s;
          overflow: hidden;
          transform-style: preserve-3d;
          will-change: transform;
        }
        .reserva-item::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #10b981, #34d399, #00f2fe);
          background-size: 200% 100%;
          animation: glowActive 3s ease-in-out infinite;
        }
        .reserva-item:hover {
          border-color: rgba(0,242,254,.35);
          box-shadow: 0 20px 45px rgba(0,0,0,.5), 0 0 30px rgba(0,242,254,.08);
        }
        .reserva-item.activa {
          animation: fadeInUp .55s cubic-bezier(.16,1,.3,1) backwards,
                     glowActive 3s ease-in-out infinite;
        }

        /* Aro superior */
        .card-top-glow {
          position: absolute; top: -8px; left: 50%;
          width: 60%; height: 16px;
          background: radial-gradient(ellipse, rgba(0,242,254,.4), transparent 70%);
          transform: translateX(-50%);
          filter: blur(8px);
          animation: floatY 3s ease-in-out infinite;
          pointer-events: none;
        }

        /* Spotlight que sigue el cursor */
        .card-spotlight {
          position: absolute; inset: 0;
          background: radial-gradient(
            400px circle at var(--mx,50%) var(--my,50%),
            rgba(0,242,254,.1),
            transparent 40%
          );
          opacity: 0;
          transition: opacity .3s;
          pointer-events: none;
        }
        .reserva-item:hover .card-spotlight { opacity: 1; }

        /* Carretera animada inferior */
        .card-road {
          position: absolute; bottom: 0; left: 0; right: 0; height: 4px;
          background-image: repeating-linear-gradient(
            90deg,
            rgba(0,242,254,.6) 0 12px,
            transparent 12px 24px
          );
          background-size: 60px 100%;
          animation: roadMove 1.2s linear infinite;
          opacity: .6;
          pointer-events: none;
        }

        /* ===================== HEADER CARD ===================== */
        .card-header {
          display:flex; align-items:center; justify-content:space-between;
          gap:10px;
          position: relative; z-index: 1;
        }
        .badge {
          display:inline-flex; align-items:center; gap:6px;
          padding:6px 12px; border-radius: 999px;
          font-size:11px; font-weight:700; letter-spacing:.5px;
          position: relative;
        }
        .badge.activa {
          background: rgba(16,185,129,.15);
          color:#10b981;
          border:1px solid rgba(16,185,129,.4);
        }
        .badge-ring {
          position: absolute; inset: -2px;
          border-radius: 999px;
          border: 1.5px solid rgba(16,185,129,.6);
          animation: badgeRing 2s ease-out infinite;
          pointer-events: none;
        }
        .badge-icon { animation: badgeIconPulse 1.6s ease-in-out infinite; }
        .fecha-creacion {
          display: inline-flex; align-items: center; gap: 6px;
          color:#64748b; font-size:12px;
        }
        .fecha-creacion svg { font-size: 10px; }

        /* ===================== CAJÓN HERO ===================== */
        .cajon-hero {
          display:flex; align-items:center; gap:14px;
          padding:14px;
          background:#0f172a;
          border:1px solid #334155; border-radius:12px;
          transition: border-color .2s, background .3s;
          position: relative; overflow: hidden;
        }
        .reserva-item.activa .cajon-hero {
          border-color: rgba(16,185,129,.3);
          background: rgba(16,185,129,.05);
        }
        .cajon-icon {
          position: relative;
          width:48px; height:48px;
          background: rgba(16,185,129,.15); color:#10b981;
          border-radius:12px;
          display:flex; align-items:center; justify-content:center;
          font-size:22px; flex-shrink: 0;
          animation: floatY 3s ease-in-out infinite;
        }
        .cajon-icon-ping {
          position: absolute; inset: 0;
          border-radius: 12px;
          border: 1.5px solid rgba(16,185,129,.5);
          animation: cajonPing 2s ease-out infinite;
          pointer-events: none;
        }
        .cajon-label {
          color:#64748b; font-size:11px;
          text-transform: uppercase; letter-spacing:.5px;
        }
        .cajon-value {
          color:#10b981; font-size:20px; font-weight:800;
          margin:2px 0; letter-spacing:-.3px;
        }
        .cajon-place {
          color:#94a3b8; font-size:12px; margin:0;
          display: inline-flex; align-items: center; gap: 5px;
        }
        .cajon-place svg { color: #00f2fe; }
        .cajon-shine {
          position: absolute; top: 0; left: 0;
          width: 60px; height: 100%;
          background: linear-gradient(90deg,transparent,rgba(0,242,254,.15),transparent);
          transform: translateX(-120%) skewX(-20deg);
          pointer-events: none;
        }
        .reserva-item:hover .cajon-shine { animation: heroShimmer 1.2s ease; }

        /* ===================== DATA GRID ===================== */
        .data-grid {
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap:10px;
        }
        .data-item {
          display:flex; align-items:center; gap:10px;
          padding:10px 12px;
          background:#0f172a;
          border:1px solid #334155; border-radius:10px;
          transition: border-color .2s, transform .2s;
          animation: dataSlideIn .45s cubic-bezier(.16,1,.3,1) backwards;
        }
        .data-item:hover {
          border-color: rgba(0,242,254,.3);
          transform: translateY(-1px);
        }
        .data-item > svg {
          color:#00f2fe; font-size:16px; flex-shrink: 0;
          transition: transform .3s;
        }
        .data-item:hover > svg { transform: scale(1.15) rotate(-6deg); }
        .data-item span {
          display:block; color:#64748b; font-size:10px;
          text-transform: uppercase; letter-spacing:.5px; margin-bottom:2px;
        }
        .data-item p { margin:0; color:#e2e8f0; font-size:13px; font-weight:600; }
        .data-item p.placa { letter-spacing: 1px; color: #00f2fe; }

        .data-item--money {
          grid-column: 1 / -1;
          background: rgba(0,242,254,.05);
          border-color: rgba(0,242,254,.3);
        }
        .data-item--money:hover { border-color: rgba(0,242,254,.6); }
        .money-icon {
          position: relative;
          width: 34px; height: 34px; border-radius: 9px;
          background: rgba(0,242,254,.15);
          color: #00f2fe;
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; flex-shrink: 0;
        }
        .money-spark {
          position: absolute; top: -3px; right: -3px;
          width: 10px; height: 10px; border-radius: 50%;
          background: radial-gradient(circle,#fff,#00f2fe,transparent);
          animation: moneySpark 1.6s ease-in-out infinite;
          pointer-events: none;
        }
        .money-value {
          color: #fff !important;
          font-size: 16px !important;
          font-weight: 800 !important;
          animation: moneyPulse 2.4s ease-in-out infinite;
        }

        /* ===================== VEHÍCULO ===================== */
        .vehiculo-row {
          display:flex; align-items:center; gap:8px;
          padding:10px 12px;
          background: rgba(0,242,254,.04);
          border:1px dashed rgba(0,242,254,.2);
          border-radius:10px;
          color:#94a3b8; font-size:13px;
        }
        .vehiculo-row svg {
          color: #00f2fe;
          animation: badgeIconPulse 2.4s ease-in-out infinite;
        }

        /* ===================== BOTONES ===================== */
        .btn-route {
          position: relative; overflow: hidden;
          width: 100%; padding: 13px 18px;
          background: linear-gradient(135deg,#00f2fe,#4facfe);
          color: #0f172a;
          border: none; border-radius: 12px;
          font-size: 14px; font-weight: 800;
          cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
          gap: 10px;
          font-family: inherit;
          transition: transform .2s, box-shadow .2s;
          animation: routeBtnPulse 2.4s ease-in-out infinite;
        }
        .btn-route:hover {
          transform: translateY(-2px) scale(1.02);
        }
        .btn-route-icon { animation: routeIconWiggle 2s ease-in-out infinite; }
        .btn-route:hover .btn-route-icon { animation-duration: .8s; }
        .btn-route-arrow { animation: routeArrowBounce 1.4s ease-in-out infinite; }
        .btn-route-shimmer {
          position: absolute; inset: 0;
          background: linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);
          transform: translateX(-120%) skewX(-20deg);
          animation: routeShimmer 2.8s ease-in-out infinite;
          pointer-events: none;
        }

        .card-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .btn-qr {
          padding: 11px;
          background: rgba(0,242,254,.1);
          color: #00f2fe;
          border: 1px solid rgba(0,242,254,.3);
          border-radius: 10px;
          font-size: 13px; font-weight: 600;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          gap: 8px;
          transition: all .2s;
          font-family: inherit;
        }
        .btn-qr:hover {
          background: rgba(0,242,254,.2);
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(0,242,254,.25);
        }
        .btn-cancelar {
          padding: 11px;
          background: rgba(239,68,68,.1);
          color: #ef4444;
          border: 1px solid rgba(239,68,68,.35);
          border-radius: 10px;
          font-size: 13px; font-weight: 600;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          gap: 8px;
          transition: all .2s;
          font-family: inherit;
        }
        .btn-cancelar:hover {
          background: rgba(239,68,68,.2);
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(239,68,68,.25);
        }

        /* ===================== EMPTY ===================== */
        .empty-state {
          text-align:center; padding:70px 20px;
          color:#94a3b8;
          animation: fadeInUp .5s ease;
        }
        .empty-icon {
          position: relative;
          width: 110px; height: 110px;
          margin: 0 auto 20px;
          display: flex; align-items: center; justify-content: center;
        }
        .empty-car {
          font-size: 46px; color: #00f2fe;
          animation: emptyCarFloat 3s ease-in-out infinite;
          position: relative; z-index: 2;
          filter: drop-shadow(0 0 16px rgba(0,242,254,.5));
        }
        .empty-ring {
          position: absolute; inset: 0;
          border: 2px dashed rgba(0,242,254,.3);
          border-radius: 50%;
          animation: emptyRing 3s ease-out infinite;
        }
        .empty-state h3 { color:#e2e8f0; font-size:20px; margin:0 0 8px; }
        .empty-state p { margin:0 0 24px; font-size:14px; }

        /* ===================== LOADING ===================== */
        .loading-orbit {
          position: relative;
          width: 80px; height: 80px;
          display: flex; align-items: center; justify-content: center;
        }
        .loading-orbit-ring {
          position: absolute; inset: 0;
          border: 2px solid transparent;
          border-top-color: #00f2fe;
          border-radius: 50%;
          animation: orbitSpin 1.2s linear infinite;
        }
        .loading-orbit-ring:nth-child(2) {
          inset: 8px; border-top-color: #4facfe;
          animation-duration: .9s;
          animation-direction: reverse;
        }
        .loading-orbit-ring:nth-child(3) {
          inset: 16px; border-top-color: #8b5cf6;
          animation-duration: .7s;
        }

        /* ===================== MODALES ===================== */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.8);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          z-index: 10000; padding: 20px;
          animation: overlayIn .25s ease;
        }
        .modal {
          position: relative;
          background: #1e293b;
          border: 1px solid rgba(0,242,254,.2);
          border-radius: 18px;
          padding: 32px 28px;
          max-width: 420px; width: 100%;
          text-align: center;
          box-shadow: 0 25px 70px rgba(0,0,0,.7);
          animation: modalIn .3s cubic-bezier(.34,1.56,.64,1);
        }
        .modal-close {
          position: absolute; top: 12px; right: 12px;
          background: transparent; border: none; cursor: pointer;
          color: #64748b; font-size: 20px;
          padding: 4px; border-radius: 8px;
          transition: all .25s;
        }
        .modal-close:hover { color: #ef4444; transform: rotate(90deg); }

        .qr-header-icon {
          position: relative;
          width: 60px; height: 60px;
          margin: 0 auto 12px;
          border-radius: 16px;
          background: linear-gradient(135deg,#00f2fe,#4facfe);
          color: #0f172a;
          display: flex; align-items: center; justify-content: center;
          font-size: 26px;
          box-shadow: 0 8px 22px rgba(0,242,254,.4);
          animation: floatY 3s ease-in-out infinite;
        }
        .qr-header-ping {
          position: absolute; inset: -4px;
          border: 2px solid rgba(0,242,254,.5);
          border-radius: 20px;
          animation: titleIconRing 2s ease-out infinite;
          pointer-events: none;
        }

        .modal-icon {
          position: relative;
          width: 68px; height: 68px;
          margin: 0 auto 16px;
          background: rgba(239,68,68,.15);
          color: #ef4444;
          border: 2px solid rgba(239,68,68,.4);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 30px;
          animation: pop .5s cubic-bezier(.34,1.56,.64,1);
        }
        .modal-icon-ping {
          position: absolute; inset: -4px;
          border: 2px solid rgba(239,68,68,.5);
          border-radius: 50%;
          animation: cajonPing 2s ease-out infinite;
          pointer-events: none;
        }
        .modal h3 { color:#e2e8f0; font-size:20px; margin:0 0 12px; }
        .modal p { color:#94a3b8; font-size:14px; line-height:1.6; margin:0 0 24px; }
        .modal p strong { color: #00f2fe; }

        .modal-buttons { display: flex; gap: 12px; }
        .btn-modal {
          flex: 1; padding: 12px 20px;
          border-radius: 10px;
          font-size: 14px; font-weight: 600;
          cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
          gap: 8px;
          transition: all .2s;
          min-height: 46px;
          font-family: inherit;
        }
        .btn-modal:disabled { opacity: .6; cursor: not-allowed; }
        .btn-modal-cancel {
          background: transparent; color: #94a3b8;
          border: 1px solid #334155;
        }
        .btn-modal-cancel:hover:not(:disabled) { background: rgba(255,255,255,.05); color: #e2e8f0; }
        .btn-modal-confirm {
          background: linear-gradient(135deg,#ef4444,#dc2626);
          color: #fff; border: none;
        }
        .btn-modal-confirm:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(239,68,68,.4);
        }

        /* ===================== TOAST ===================== */
        .toast {
          position: fixed; bottom: 24px; right: 24px;
          display: flex; align-items: center; gap: 10px;
          padding: 14px 20px;
          border-radius: 10px;
          font-size: 14px; font-weight: 500;
          box-shadow: 0 12px 40px rgba(0,0,0,.5);
          animation: toastIn .35s cubic-bezier(.34,1.56,.64,1);
          z-index: 10001;
        }
        .toast-icon {
          display: flex;
          animation: toastBounce 1s ease-in-out infinite;
        }
        .toast.success { background: #10b981; color: #0f172a; }
        .toast.error   {
          background: #ef4444; color: #fff;
          animation: toastIn .35s cubic-bezier(.34,1.56,.64,1), shake .4s ease .35s;
        }

        /* ===================== RESPONSIVE ===================== */
        @media (max-width: 700px) {
          .vr-header { flex-direction: column; align-items: stretch; }
          .vr-header h2 { font-size: 24px; }
          .header-actions { flex-direction: column; }
          .header-actions .btn-new,
          .header-actions .btn-history { justify-content: center; }
          .filters { flex-direction: column; align-items: stretch; }
          .search-box { max-width: none; }
          .reservas-grid { grid-template-columns: 1fr; }
          .data-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}