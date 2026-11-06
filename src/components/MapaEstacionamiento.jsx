import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  doc, getDoc, collection, query, where, getDocs,
} from "firebase/firestore";
import { db } from "../firebase/config.js";
import {
  FaArrowLeft, FaBuilding, FaCar, FaMapMarkerAlt, FaClock,
  FaCheckCircle, FaTimesCircle, FaSpinner, FaLayerGroup,
  FaParking, FaLock, FaInfoCircle, FaPhone, FaCalendarAlt,
} from "react-icons/fa";

export default function MapaEstacionamiento() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [estacionamiento, setEstacionamiento] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pisoActual, setPisoActual] = useState(0);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Cargar estacionamiento + reservas activas ---
  useEffect(() => {
    const cargar = async () => {
      try {
        const snap = await getDoc(doc(db, "estacionamientos", id));
        if (!snap.exists()) {
          navigate("/estacionamientos", { replace: true });
          return;
        }
        const est = { id: snap.id, ...snap.data() };
        setEstacionamiento(est);

        // Reservas activas de este estacionamiento
        const q = query(
          collection(db, "reservas"),
          where("estacionamiento", "==", est.nombre),
          where("estado", "==", "activa")
        );
        const rSnap = await getDocs(q);
        const lista = [];
        rSnap.forEach((d) => lista.push({ id: d.id, ...d.data() }));
        setReservas(lista);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id, navigate]);

  // --- Generar pisos y cajones ---
  const pisos = useMemo(() => {
    if (!estacionamiento) return [];
    const capacidad = Number(estacionamiento.capacidad) || 0;
    const pisosArr = [];
    let restantes = capacidad;
    let pisoNum = 1;

    while (restantes > 0) {
      const cant = Math.min(10, restantes);
      const spots = [];
      for (let i = 1; i <= cant; i++) {
        const nombre = `P${pisoNum}-${String(i).padStart(2, "0")}`;
        const ocupada = reservas.find(
          (r) =>
            (r.espacio || "").toUpperCase().replace(/\s+/g, "") ===
            nombre.toUpperCase().replace(/\s+/g, "")
        );
        spots.push({ nombre, ocupado: !!ocupada, reserva: ocupada });
      }
      pisosArr.push({ numero: pisoNum, spots });
      restantes -= cant;
      pisoNum++;
    }
    return pisosArr;
  }, [estacionamiento, reservas]);

  const piso = pisos[pisoActual];

  const stats = useMemo(() => {
    const total = pisos.reduce((acc, p) => acc + p.spots.length, 0);
    const ocupados = pisos.reduce(
      (acc, p) => acc + p.spots.filter((s) => s.ocupado).length,
      0
    );
    return { total, ocupados, libres: total - ocupados };
  }, [pisos]);

  const handleClickSpot = (spot) => {
    if (spot.ocupado) {
      showToast("Este cajón ya está ocupado", "error");
      return;
    }
    navigate(
      `/reservar?cajon=${encodeURIComponent(spot.nombre)}&estacionamiento=${encodeURIComponent(
        estacionamiento.nombre
      )}`
    );
  };

  // ============ RENDER ============
  if (loading) {
    return (
      <div className="map-page center-state">
        <FaSpinner className="spin" size={38} color="#00f2fe" />
        <p>Cargando mapa...</p>
      </div>
    );
  }

  if (!estacionamiento) return null;

  // Split floor spots into 2 rows for a nice parking look
  const mitad = Math.ceil((piso?.spots.length || 0) / 2);
  const filaTop = piso?.spots.slice(0, mitad) || [];
  const filaBot = piso?.spots.slice(mitad) || [];

  return (
    <div className="map-page">
      {/* Fondo animado */}
      <div className="bg-animated">
        <div className="bg-blob blob-1"></div>
        <div className="bg-blob blob-2"></div>
        <div className="bg-grid"></div>
      </div>

      <div className="container">
        {/* Header */}
        <header className="map-header">
          <Link to="/estacionamientos" className="back-link">
            <FaArrowLeft /> Volver
          </Link>
          <div className="header-info">
            <h2>
              <FaBuilding className="title-icon" /> {estacionamiento.nombre}
            </h2>
            <div className="meta">
              <span><FaMapMarkerAlt /> {estacionamiento.direccion}, {estacionamiento.ciudad}</span>
              <span><FaClock /> {estacionamiento.hora_apertura} - {estacionamiento.hora_cierre}</span>
              <span><FaPhone /> {estacionamiento.telefono}</span>
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total"><FaLayerGroup /></div>
            <div><span>Total</span><h3>{stats.total}</h3></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon free"><FaCheckCircle /></div>
            <div><span>Libres</span><h3>{stats.libres}</h3></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon occ"><FaLock /></div>
            <div><span>Ocupados</span><h3>{stats.ocupados}</h3></div>
          </div>
        </div>

        {/* Piso selector */}
        <div className="floors-tabs">
          {pisos.map((p, i) => (
            <button
              key={p.numero}
              className={`floor-tab ${i === pisoActual ? "active" : ""}`}
              onClick={() => setPisoActual(i)}
            >
              <FaLayerGroup /> Piso {p.numero}
              <span className="floor-count">
                {p.spots.filter((s) => !s.ocupado).length}/{p.spots.length}
              </span>
            </button>
          ))}
        </div>

        {/* Leyenda */}
        <div className="legend">
          <div className="legend-item">
            <div className="spot-swatch libre"></div>
            <span>Libre</span>
          </div>
          <div className="legend-item">
            <div className="spot-swatch ocupado"></div>
            <span>Ocupado</span>
          </div>
          <div className="legend-info">
            <FaInfoCircle /> Haz clic en un cajón libre para reservarlo
          </div>
        </div>

        {/* Mapa del piso */}
        {piso && (
          <div className="parking-canvas" key={piso.numero}>
            <div className="canvas-header">
              <span className="canvas-title">
                <FaLayerGroup /> Piso {piso.numero} · {piso.spots.length} cajones
              </span>
              <span className="canvas-live">
                <span className="live-dot"></span>
                Actualizado
              </span>
            </div>

            {/* Row top */}
            <div className="spots-row">
              {filaTop.map((spot) => (
                <Spot
                  key={spot.nombre}
                  spot={spot}
                  onClick={() => handleClickSpot(spot)}
                />
              ))}
            </div>

            {/* Lane */}
            <div className="lane">
              <div className="lane-line"></div>
              <div className="lane-arrows">
                <span>➜</span>
                <span className="lane-label">Pasillo</span>
                <span>➜</span>
              </div>
              <div className="lane-line"></div>
            </div>

            {/* Row bottom */}
            {filaBot.length > 0 && (
              <div className="spots-row">
                {filaBot.map((spot) => (
                  <Spot
                    key={spot.nombre}
                    spot={spot}
                    onClick={() => handleClickSpot(spot)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === "success" ? <FaCheckCircle /> : <FaTimesCircle />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Estilos */}
      <style>{`
        @keyframes fadeIn       { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp     { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop          { 0% { transform: scale(0); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @keyframes spin         { to { transform: rotate(360deg); } }
        @keyframes pulse        { 0%,100% { opacity: .4; } 50% { opacity: .9; } }
        @keyframes float        { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes blobMove1 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(80px,-60px) scale(1.15); }
        }
        @keyframes blobMove2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(-100px,80px) scale(1.1); }
        }
        @keyframes gridMove {
          from { background-position: 0 0; }
          to   { background-position: 60px 60px; }
        }
        @keyframes liveDot {
          0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,.6); }
          50%     { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
        }
        @keyframes spotPulse {
          0%,100% { box-shadow: 0 0 0 1px rgba(0,242,254,.4), 0 0 12px rgba(0,242,254,.15); }
          50%     { box-shadow: 0 0 0 1px rgba(0,242,254,.7), 0 0 20px rgba(0,242,254,.35); }
        }
        @keyframes arrowSlide {
          0%,100% { transform: translateX(0); opacity: .6; }
          50%     { transform: translateX(6px); opacity: 1; }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(30px) scale(.9); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          25%     { transform: translateX(-6px); }
          75%     { transform: translateX(6px); }
        }

        * { box-sizing: border-box; }

        .map-page {
          min-height: 100vh;
          background: #0f172a;
          font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif;
          color: #e2e8f0;
          padding: 30px 20px 60px;
          position: relative;
          overflow-x: hidden;
          animation: fadeIn .5s ease;
        }
        .map-page.center-state {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 16px;
          color: #94a3b8;
        }
        .spin { animation: spin 1s linear infinite; }

        .bg-animated {
          position: fixed; inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .bg-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: .25;
        }
        .blob-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #10b981, transparent 70%);
          top: -180px; left: -150px;
          animation: blobMove1 18s ease-in-out infinite;
        }
        .blob-2 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, #00f2fe, transparent 70%);
          bottom: -200px; right: -180px;
          animation: blobMove2 22s ease-in-out infinite;
        }
        .bg-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,242,254,.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,242,254,.04) 1px, transparent 1px);
          background-size: 60px 60px;
          animation: gridMove 8s linear infinite;
          mask-image: radial-gradient(circle at center, black 30%, transparent 80%);
          -webkit-mask-image: radial-gradient(circle at center, black 30%, transparent 80%);
        }

        .container {
          max-width: 1100px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        /* ============ HEADER ============ */
        .map-header {
          margin-bottom: 24px;
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
          background: rgba(30,41,59,.5);
          margin-bottom: 14px;
          transition: all .2s;
        }
        .back-link:hover {
          color: #00f2fe;
          border-color: rgba(0,242,254,.4);
          transform: translateX(-3px);
        }
        .header-info h2 {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #e2e8f0;
          font-size: 30px;
          margin: 0 0 8px;
          letter-spacing: -0.5px;
        }
        .title-icon { color: #00f2fe; animation: float 3s ease-in-out infinite; }
        .meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          color: #94a3b8;
          font-size: 13px;
        }
        .meta span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .meta svg { color: #00f2fe; font-size: 12px; }

        /* ============ STATS ============ */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .stat-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          background: rgba(30,41,59,.75);
          border: 1px solid rgba(148,163,184,.15);
          border-radius: 14px;
          backdrop-filter: blur(10px);
          animation: fadeInUp .5s cubic-bezier(0.34,1.56,0.64,1) backwards;
        }
        .stat-card:nth-child(1) { animation-delay: .05s; }
        .stat-card:nth-child(2) { animation-delay: .12s; }
        .stat-card:nth-child(3) { animation-delay: .19s; }
        .stat-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        .stat-icon.total { background: rgba(0,242,254,.15); color: #00f2fe; }
        .stat-icon.free  { background: rgba(16,185,129,.15); color: #10b981; }
        .stat-icon.occ   { background: rgba(100,116,139,.2); color: #94a3b8; }
        .stat-card span {
          color: #94a3b8;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .8px;
          font-weight: 600;
        }
        .stat-card h3 {
          color: #e2e8f0;
          font-size: 22px;
          font-weight: 800;
          margin: 2px 0 0;
          letter-spacing: -0.5px;
        }

        /* ============ FLOOR TABS ============ */
        .floors-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
          animation: fadeInUp .5s ease .15s backwards;
        }
        .floor-tab {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(30,41,59,.6);
          border: 1px solid #334155;
          color: #94a3b8;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all .2s;
          font-family: inherit;
        }
        .floor-tab:hover {
          color: #00f2fe;
          border-color: rgba(0,242,254,.3);
        }
        .floor-tab.active {
          background: linear-gradient(135deg, #00f2fe, #4facfe);
          color: #0f172a;
          border-color: transparent;
          box-shadow: 0 6px 18px rgba(0,242,254,.3);
        }
        .floor-count {
          background: rgba(0,0,0,.25);
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }
        .floor-tab.active .floor-count {
          background: rgba(15,23,42,.2);
          color: #0f172a;
        }

        /* ============ LEGEND ============ */
        .legend {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 16px;
          padding: 12px 16px;
          background: rgba(30,41,59,.6);
          border: 1px solid rgba(148,163,184,.15);
          border-radius: 12px;
          backdrop-filter: blur(8px);
          font-size: 13px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
        }
        .spot-swatch {
          width: 18px; height: 18px;
          border-radius: 5px;
        }
        .spot-swatch.libre {
          background: rgba(0,242,254,.08);
          border: 2px solid #00f2fe;
        }
        .spot-swatch.ocupado {
          background: #334155;
          border: 2px solid #475569;
        }
        .legend-info {
          margin-left: auto;
          color: #64748b;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .legend-info svg { color: #00f2fe; }

        /* ============ PARKING CANVAS ============ */
        .parking-canvas {
          background: rgba(15,23,42,.85);
          border: 1px solid rgba(0,242,254,.15);
          border-radius: 20px;
          padding: 24px;
          backdrop-filter: blur(10px);
          box-shadow: 0 20px 50px rgba(0,0,0,.5);
          animation: fadeInUp .6s ease;
        }
        .canvas-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 16px;
          margin-bottom: 24px;
          border-bottom: 1px dashed rgba(148,163,184,.2);
        }
        .canvas-title {
          color: #e2e8f0;
          font-size: 14px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-transform: uppercase;
          letter-spacing: .5px;
        }
        .canvas-title svg { color: #00f2fe; }
        .canvas-live {
          color: #10b981;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
        }
        .live-dot {
          width: 8px; height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: liveDot 2s ease-in-out infinite;
        }

        /* ============ SPOTS ============ */
        .spots-row {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          padding: 8px 0;
        }

        .spot {
          width: 90px;
          height: 110px;
          border-radius: 10px;
          background: rgba(0,242,254,.06);
          border: 2px solid #00f2fe;
          color: #00f2fe;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          cursor: pointer;
          transition: all .25s cubic-bezier(0.34,1.56,0.64,1);
          font-family: inherit;
          position: relative;
          animation: spotPulse 3s ease-in-out infinite;
        }
        .spot:nth-child(2n)  { animation-delay: .3s; }
        .spot:nth-child(3n)  { animation-delay: .6s; }
        .spot:nth-child(4n)  { animation-delay: .9s; }
        .spot:hover {
          background: rgba(0,242,254,.2);
          transform: translateY(-4px) scale(1.03);
          box-shadow: 0 12px 24px rgba(0,242,254,.3);
        }
        .spot:active { transform: translateY(-1px) scale(.98); }

        .spot-num {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: .5px;
        }
        .spot-icon {
          font-size: 22px;
          opacity: .9;
        }
        .spot-status {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: .8px;
          font-weight: 700;
          opacity: .8;
        }

        /* Ocupado */
        .spot.ocupado {
          background: #334155;
          border-color: #475569;
          color: #94a3b8;
          cursor: not-allowed;
          animation: none;
          opacity: .85;
        }
        .spot.ocupado:hover {
          transform: none;
          box-shadow: none;
          background: #334155;
        }

        /* Lane */
        .lane {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 12px 0;
          padding: 0 16px;
        }
        .lane-line {
          flex: 1;
          height: 2px;
          background: repeating-linear-gradient(
            to right,
            rgba(250,204,21,.6) 0,
            rgba(250,204,21,.6) 14px,
            transparent 14px,
            transparent 28px
          );
        }
        .lane-arrows {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #facc15;
          font-size: 16px;
          font-weight: 900;
        }
        .lane-arrows span:first-child,
        .lane-arrows span:last-child {
          animation: arrowSlide 1.5s ease-in-out infinite;
        }
        .lane-arrows span:last-child { animation-delay: .75s; }
        .lane-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #facc15;
          font-weight: 700;
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
          .header-info h2 { font-size: 22px; }
          .meta { font-size: 12px; }
          .stats-grid { grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
          .stat-icon { width: 36px; height: 36px; font-size: 16px; }
          .stat-card { padding: 10px 12px; gap: 10px; }
          .stat-card h3 { font-size: 18px; }
          .spot { width: 70px; height: 90px; }
          .spot-num { font-size: 11px; }
          .spot-icon { font-size: 18px; }
          .parking-canvas { padding: 16px; }
        }
      `}</style>
    </div>
  );
}

// Componente interno para el spot
function Spot({ spot, onClick }) {
  return (
    <button
      className={`spot ${spot.ocupado ? "ocupado" : "libre"}`}
      onClick={onClick}
      title={spot.ocupado ? "Cajón ocupado" : "Reservar este cajón"}
    >
      <span className="spot-icon">
        {spot.ocupado ? <FaLock /> : <FaCar />}
      </span>
      <span className="spot-num">{spot.nombre}</span>
      <span className="spot-status">{spot.ocupado ? "Ocupado" : "Libre"}</span>
    </button>
  );
}