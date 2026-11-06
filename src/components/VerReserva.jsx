import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where, getDocs, doc, updateDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase/config.js";
import {
  FaParking, FaCalendarAlt, FaClock, FaHourglassHalf, FaCar,
  FaCheckCircle, FaTimesCircle, FaSpinner, FaTrash,
  FaExclamationTriangle, FaArrowLeft, FaPlus, FaSearch,
  FaHistory,
} from "react-icons/fa";

export default function VerReservas() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [reservaACancelar, setReservaACancelar] = useState(null);
  const [cancelando, setCancelando] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  // --- Auth + carga ---
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

  // --- Clasificación ---
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

  // --- SOLO ACTIVAS ---
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

  // --- Cancelar ---
  const abrirModalCancelar = (reserva) => {
    setReservaACancelar(reserva);
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

  // --- Card (siempre activa) ---
  const renderCard = (r, i) => (
    <div
      key={r.id}
      className="reserva-item activa"
      style={{ animationDelay: `${i * 60}ms` }}
    >
      <div className="card-header">
        <div className="badge activa">
          <FaCheckCircle /> ACTIVA
        </div>
        <span className="fecha-creacion">
          {r.fechaCreacion
            ? new Date(r.fechaCreacion).toLocaleDateString("es-MX", {
                day: "2-digit", month: "short", year: "numeric",
              })
            : "—"}
        </span>
      </div>

      <div className="cajon-hero">
        <div className="cajon-icon">
          <FaParking />
        </div>
        <div>
          <span className="cajon-label">Cajón</span>
          <h3 className="cajon-value">{r.espacio || "—"}</h3>
          <p className="cajon-place">{r.estacionamiento || "—"}</p>
        </div>
      </div>

      <div className="data-grid">
        <div className="data-item">
          <FaCalendarAlt />
          <div><span>Fecha</span><p>{r.fecha || "—"}</p></div>
        </div>
        <div className="data-item">
          <FaClock />
          <div><span>Hora</span><p>{r.horario || "—"}</p></div>
        </div>
        <div className="data-item">
          <FaHourglassHalf />
          <div><span>Duración</span><p>{r.duracion || "—"}</p></div>
        </div>
        {r.placa && (
          <div className="data-item">
            <FaCar />
            <div><span>Placa</span><p className="placa">{r.placa}</p></div>
          </div>
        )}
      </div>

      {(r.marca || r.modelo) && (
        <div className="vehiculo-row">
          <FaCar />
          <span>{r.marca} {r.modelo && `· ${r.modelo}`}</span>
        </div>
      )}

      <button className="btn-cancelar" onClick={() => abrirModalCancelar(r)}>
        <FaTrash /> Cancelar reserva
      </button>
    </div>
  );

  // ============ RENDER ============
  if (loading) {
    return (
      <div className="vr-page center-state">
        <FaSpinner className="spin" size={38} color="#00f2fe" />
        <p>Cargando reservas...</p>
      </div>
    );
  }

  return (
    <div className="vr-page">
      <div className="container">
        {/* Header */}
        <header className="vr-header">
          <div>
            <Link to="/perfil" className="back-link">
              <FaArrowLeft /> Volver al perfil
            </Link>
            <h2>Mis Reservas Activas</h2>
            <p className="subtitle">
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
            </Link>
          </div>
        </header>

        {/* Búsqueda */}
        <div className="filters">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por cajón, placa o marca..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        {/* Lista */}
        {reservasActivas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FaParking />
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

      {/* ============ MODAL ============ */}
      {modalOpen && reservaACancelar && (
        <div
          className="modal-overlay"
          onClick={() => !cancelando && setModalOpen(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              <FaExclamationTriangle />
            </div>
            <h3>¿Cancelar Reserva?</h3>
            <p>
              Vas a liberar el cajón <strong>{reservaACancelar.espacio}</strong>{" "}
              del {reservaACancelar.fecha} a las {reservaACancelar.horario}.
              Otra persona podría ocuparlo.
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
                  <><FaSpinner className="spin" /> Cancelando...</>
                ) : (
                  <><FaTrash /> Sí, cancelar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ TOAST ============ */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === "success" ? <FaCheckCircle /> : <FaTimesCircle />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ============ ESTILOS ============ */}
      <style>{`
        @keyframes fadeIn     { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp   { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin       { to { transform: rotate(360deg); } }
        @keyframes pop        { 0% { transform: scale(0); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @keyframes pulse      { 0%,100% { opacity: .4; } 50% { opacity: .85; } }
        @keyframes toastIn    { from { opacity: 0; transform: translateY(30px) scale(.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes modalIn    { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes overlayIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes shake      { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        @keyframes glowActive { 0%,100% { box-shadow: 0 0 0 1px rgba(16,185,129,.35), 0 10px 30px rgba(16,185,129,.15); } 50% { box-shadow: 0 0 0 1px rgba(16,185,129,.6), 0 12px 40px rgba(16,185,129,.3); } }

        * { box-sizing: border-box; }

        .vr-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif;
          color: #e2e8f0;
          padding: 30px 20px 60px;
          animation: fadeIn .4s ease;
        }
        .vr-page.center-state {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 16px;
          color: #94a3b8;
        }
        .spin { animation: spin 1s linear infinite; }

        .container { max-width: 1200px; margin: 0 auto; }

        /* ============ HEADER ============ */
        .vr-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          animation: fadeInUp .5s ease;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 13px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid #334155;
          margin-bottom: 12px;
          transition: all .2s;
        }
        .back-link:hover {
          color: #00f2fe;
          border-color: rgba(0,242,254,.4);
          transform: translateX(-3px);
        }
        .vr-header h2 {
          color: #e2e8f0;
          font-size: 30px;
          margin: 0;
          letter-spacing: -0.5px;
        }
        .subtitle {
          color: #94a3b8;
          font-size: 14px;
          margin: 4px 0 0;
        }

        .header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn-new {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #00f2fe, #4facfe);
          color: #0f172a;
          border: none;
          border-radius: 10px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity .2s, transform .15s, box-shadow .2s;
        }
        .btn-new:hover {
          opacity: .95;
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0,242,254,.35);
        }

        .btn-history {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: rgba(30,41,59,.7);
          color: #94a3b8;
          border: 1px solid #334155;
          border-radius: 10px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all .2s;
        }
        .btn-history:hover {
          color: #00f2fe;
          border-color: rgba(0,242,254,.4);
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0,242,254,.15);
        }

        /* ============ SEARCH ============ */
        .filters {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 24px;
          animation: fadeInUp .5s ease .1s backwards;
        }

        .search-box {
          position: relative;
          flex: 1;
          min-width: 240px;
          max-width: 420px;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          pointer-events: none;
          transition: color .2s;
        }
        .search-box:focus-within .search-icon { color: #00f2fe; }
        .search-box input {
          width: 100%;
          padding: 12px 14px 12px 40px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 10px;
          color: #e2e8f0;
          font-size: 14px;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
          font-family: inherit;
        }
        .search-box input:focus {
          border-color: #00f2fe;
          box-shadow: 0 0 0 3px rgba(0,242,254,.15);
        }

        /* ============ GRID ============ */
        .reservas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
          animation: fadeIn .4s ease;
        }

        .reserva-item {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          animation: fadeInUp .5s cubic-bezier(0.16,1,0.3,1) backwards;
          transition: transform .25s, border-color .25s, box-shadow .25s;
          position: relative;
          overflow: hidden;
        }
        .reserva-item::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #10b981, #34d399);
        }

        .reserva-item:hover {
          transform: translateY(-4px);
          border-color: rgba(0,242,254,.3);
          box-shadow: 0 16px 40px rgba(0,0,0,.4);
        }
        .reserva-item.activa {
          animation: fadeInUp .5s cubic-bezier(0.16,1,0.3,1) backwards,
                     glowActive 3s ease-in-out infinite;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .5px;
        }
        .badge.activa {
          background: rgba(16,185,129,.15);
          color: #10b981;
          border: 1px solid rgba(16,185,129,.4);
        }
        .fecha-creacion {
          color: #64748b;
          font-size: 12px;
        }

        .cajon-hero {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 12px;
          transition: border-color .2s;
        }
        .reserva-item.activa .cajon-hero {
          border-color: rgba(16,185,129,.3);
          background: rgba(16,185,129,.05);
        }
        .cajon-icon {
          width: 48px;
          height: 48px;
          background: rgba(16,185,129,.15);
          color: #10b981;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }
        .cajon-label {
          color: #64748b;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .5px;
        }
        .cajon-value {
          color: #10b981;
          font-size: 20px;
          font-weight: 800;
          margin: 2px 0;
          letter-spacing: -0.3px;
        }
        .cajon-place {
          color: #94a3b8;
          font-size: 12px;
          margin: 0;
        }

        .data-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .data-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 10px;
          transition: border-color .2s;
        }
        .data-item:hover { border-color: rgba(0,242,254,.3); }
        .data-item > svg {
          color: #00f2fe;
          font-size: 16px;
          flex-shrink: 0;
        }
        .data-item span {
          display: block;
          color: #64748b;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .5px;
          margin-bottom: 2px;
        }
        .data-item p {
          margin: 0;
          color: #e2e8f0;
          font-size: 13px;
          font-weight: 600;
        }
        .data-item p.placa {
          letter-spacing: 1px;
          color: #00f2fe;
        }

        .vehiculo-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: rgba(0,242,254,.04);
          border: 1px dashed rgba(0,242,254,.2);
          border-radius: 10px;
          color: #94a3b8;
          font-size: 13px;
        }
        .vehiculo-row svg { color: #00f2fe; }

        .btn-cancelar {
          width: 100%;
          padding: 11px;
          background: rgba(239,68,68,.1);
          color: #ef4444;
          border: 1px solid rgba(239,68,68,.35);
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all .2s;
          font-family: inherit;
        }
        .btn-cancelar:hover {
          background: rgba(239,68,68,.2);
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(239,68,68,.25);
        }

        /* ============ EMPTY ============ */
        .empty-state {
          text-align: center;
          padding: 70px 20px;
          color: #94a3b8;
          animation: fadeInUp .5s ease;
        }
        .empty-icon {
          width: 90px;
          height: 90px;
          margin: 0 auto 20px;
          background: rgba(0,242,254,.08);
          border: 2px dashed rgba(0,242,254,.3);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 38px;
          color: #00f2fe;
          animation: pulse 3s ease-in-out infinite;
        }
        .empty-state h3 {
          color: #e2e8f0;
          font-size: 20px;
          margin: 0 0 8px;
        }
        .empty-state p {
          margin: 0 0 24px;
          font-size: 14px;
        }

        /* ============ MODAL ============ */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.8);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
          animation: overlayIn .25s ease;
        }
        .modal {
          background: #1e293b;
          border: 1px solid rgba(0,242,254,.2);
          border-radius: 18px;
          padding: 32px 28px;
          max-width: 420px;
          width: 100%;
          text-align: center;
          box-shadow: 0 25px 70px rgba(0,0,0,.7);
          animation: modalIn .3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .modal-icon {
          width: 68px; height: 68px;
          margin: 0 auto 16px;
          background: rgba(239,68,68,.15);
          color: #ef4444;
          border: 2px solid rgba(239,68,68,.4);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          animation: pop .5s cubic-bezier(0.34,1.56,0.64,1);
        }
        .modal h3 {
          color: #e2e8f0;
          font-size: 20px;
          margin: 0 0 12px;
        }
        .modal p {
          color: #94a3b8;
          font-size: 14px;
          line-height: 1.6;
          margin: 0 0 24px;
        }
        .modal p strong { color: #00f2fe; }

        .modal-buttons {
          display: flex;
          gap: 12px;
        }
        .btn-modal {
          flex: 1;
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all .2s;
          min-height: 46px;
          font-family: inherit;
        }
        .btn-modal:disabled { opacity: .6; cursor: not-allowed; }
        .btn-modal-cancel {
          background: transparent;
          color: #94a3b8;
          border: 1px solid #334155;
        }
        .btn-modal-cancel:hover:not(:disabled) {
          background: rgba(255,255,255,.05);
          color: #e2e8f0;
        }
        .btn-modal-confirm {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: #fff;
          border: none;
        }
        .btn-modal-confirm:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(239,68,68,.4);
        }

        /* ============ TOAST ============ */
        .toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 12px 40px rgba(0,0,0,.5);
          animation: toastIn .35s cubic-bezier(0.34,1.56,0.64,1);
          z-index: 10001;
        }
        .toast.success { background: #10b981; color: #0f172a; }
        .toast.error   { background: #ef4444; color: #fff; animation: toastIn .35s cubic-bezier(0.34,1.56,0.64,1), shake .4s ease .35s; }

        /* ============ RESPONSIVE ============ */
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