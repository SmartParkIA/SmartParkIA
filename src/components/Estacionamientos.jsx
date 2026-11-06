import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config.js";
import {
  FaMapMarkerAlt, FaPhone, FaClock, FaCar, FaSearch, FaBuilding,
  FaInfoCircle, FaSpinner, FaMapMarkedAlt, FaTimes, FaArrowRight,
  FaCity, FaCalendarAlt, FaCheckCircle, FaArrowLeft, FaLayerGroup,
} from "react-icons/fa";

export default function Estacionamientos() {
  const navigate = useNavigate();

  const [estacionamientos, setEstacionamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const snap = await getDocs(collection(db, "estacionamientos"));
        const data = [];
        snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
        data.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
        setEstacionamientos(data);
      } catch (err) {
        console.error("Error cargando estacionamientos:", err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const filtrados = estacionamientos.filter((e) => {
    const q = busqueda.trim().toLowerCase();
    return (
      !q ||
      (e.nombre || "").toLowerCase().includes(q) ||
      (e.ciudad || "").toLowerCase().includes(q) ||
      (e.direccion || "").toLowerCase().includes(q)
    );
  });

  const pisosDe = (cap) => Math.ceil((cap || 0) / 10);

  // ============ RENDER ============
  if (loading) {
    return (
      <div className="est-page center-state">
        <FaSpinner className="spin" size={38} color="#00f2fe" />
        <p>Cargando estacionamientos...</p>
      </div>
    );
  }

  return (
    <div className="est-page">
      {/* Fondo animado */}
      <div className="bg-animated">
        <div className="bg-blob blob-1"></div>
        <div className="bg-blob blob-2"></div>
        <div className="bg-grid"></div>
      </div>

      <div className="container">
        <header className="est-header">
          <Link to="/perfil" className="back-link">
            <FaArrowLeft /> Volver al perfil
          </Link>
          <h2>
            <FaBuilding className="title-icon" /> Estacionamientos Disponibles
          </h2>
          <p className="subtitle">
            {estacionamientos.length} plaza{estacionamientos.length !== 1 ? "s" : ""} registrada{estacionamientos.length !== 1 ? "s" : ""}
          </p>
        </header>

        {/* Buscador */}
        <div className="search-wrap">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, ciudad o dirección..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button className="clear-btn" onClick={() => setBusqueda("")}>
              <FaTimes />
            </button>
          )}
        </div>

        {/* Grid */}
        {filtrados.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><FaCar /></div>
            <h3>{busqueda ? "Sin resultados" : "No hay estacionamientos"}</h3>
            <p>{busqueda ? "Prueba con otro término." : "Aún no hay plazas registradas."}</p>
          </div>
        ) : (
          <div className="est-grid">
            {filtrados.map((e, i) => (
              <div
                key={e.id}
                className="est-card"
                style={{ animationDelay: `${i * 80}ms` }}
                onClick={() => setSeleccionado(e)}
              >
                <div className="est-card-top">
                  <div className="est-icon">
                    <FaBuilding />
                  </div>
                  <div className="est-badge">
                    <FaCheckCircle /> {e.estado?.toUpperCase() || "ACTIVO"}
                  </div>
                </div>

                <h3 className="est-name">{e.nombre || "Sin nombre"}</h3>

                <div className="est-info">
                  <span><FaMapMarkerAlt /> {e.direccion || "—"}, {e.ciudad || "—"}</span>
                  <span><FaClock /> {e.hora_apertura} - {e.hora_cierre}</span>
                  <span><FaLayerGroup /> {e.capacidad || 0} cajones · {pisosDe(e.capacidad)} piso{pisosDe(e.capacidad) !== 1 ? "s" : ""}</span>
                </div>

                <button className="est-btn">
                  Ver detalles <FaArrowRight />
                </button>

                <div className="est-shine"></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============ MODAL ============ */}
      {seleccionado && (
        <div className="modal-overlay" onClick={() => setSeleccionado(null)}>
          <div className="modal" onClick={(ev) => ev.stopPropagation()}>
            <button className="modal-close" onClick={() => setSeleccionado(null)}>
              <FaTimes />
            </button>

            <div className="modal-hero">
              <div className="modal-icon"><FaBuilding /></div>
              <h3>{seleccionado.nombre}</h3>
              <p className="modal-city">
                <FaMapMarkerAlt /> {seleccionado.ciudad}
              </p>
            </div>

            <div className="modal-body">
              <div className="modal-item">
                <div className="mi-icon"><FaMapMarkerAlt /></div>
                <div>
                  <span>Dirección</span>
                  <p>{seleccionado.direccion || "—"}</p>
                </div>
              </div>
              <div className="modal-item">
                <div className="mi-icon"><FaCity /></div>
                <div>
                  <span>Ciudad</span>
                  <p>{seleccionado.ciudad || "—"}</p>
                </div>
              </div>
              <div className="modal-item">
                <div className="mi-icon"><FaClock /></div>
                <div>
                  <span>Horario</span>
                  <p>{seleccionado.hora_apertura} - {seleccionado.hora_cierre}</p>
                </div>
              </div>
              <div className="modal-item">
                <div className="mi-icon"><FaPhone /></div>
                <div>
                  <span>Teléfono</span>
                  <p>{seleccionado.telefono || "—"}</p>
                </div>
              </div>
              <div className="modal-item">
                <div className="mi-icon"><FaLayerGroup /></div>
                <div>
                  <span>Capacidad</span>
                  <p>{seleccionado.capacidad || 0} cajones · {pisosDe(seleccionado.capacidad)} piso{pisosDe(seleccionado.capacidad) !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="modal-item">
                <div className="mi-icon"><FaCalendarAlt /></div>
                <div>
                  <span>Estado</span>
                  <p className="modal-estado">{seleccionado.estado || "activo"}</p>
                </div>
              </div>
            </div>

            <button
              className="modal-cta"
              onClick={() => navigate(`/mapa-estacionamiento/${seleccionado.id}`)}
            >
              <FaMapMarkedAlt /> Agendar cita
            </button>
          </div>
        </div>
      )}

      {/* ============ ESTILOS ============ */}
      <style>{`
        @keyframes fadeIn       { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp     { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin         { to { transform: rotate(360deg); } }
        @keyframes pulse        { 0%,100% { opacity: .4; } 50% { opacity: .85; } }
        @keyframes pop          { 0% { transform: scale(0); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
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
        @keyframes shine {
          0%   { transform: translateX(-100%) skewX(-20deg); }
          100% { transform: translateX(200%) skewX(-20deg); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(.9); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }

        * { box-sizing: border-box; }

        .est-page {
          min-height: 100vh;
          background: #0f172a;
          font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif;
          color: #e2e8f0;
          padding: 30px 20px 60px;
          position: relative;
          overflow-x: hidden;
          animation: fadeIn .5s ease;
        }
        .est-page.center-state {
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
          opacity: .28;
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
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        /* ============ HEADER ============ */
        .est-header {
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
        .est-header h2 {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #e2e8f0;
          font-size: 30px;
          margin: 0;
          letter-spacing: -0.5px;
        }
        .title-icon { color: #00f2fe; animation: float 3s ease-in-out infinite; }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .subtitle {
          color: #94a3b8;
          font-size: 14px;
          margin: 6px 0 0;
        }

        /* ============ SEARCH ============ */
        .search-wrap {
          position: relative;
          margin-bottom: 24px;
          animation: fadeInUp .5s ease .1s backwards;
        }
        .search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          pointer-events: none;
          transition: color .2s;
        }
        .search-wrap:focus-within .search-icon { color: #00f2fe; }
        .search-wrap input {
          width: 100%;
          padding: 14px 44px 14px 46px;
          border-radius: 14px;
          border: 1px solid rgba(148,163,184,.2);
          background: rgba(30,41,59,.7);
          color: #e2e8f0;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          backdrop-filter: blur(10px);
          transition: border-color .2s, box-shadow .2s;
        }
        .search-wrap input:focus {
          border-color: #00f2fe;
          box-shadow: 0 0 0 3px rgba(0,242,254,.15);
        }
        .clear-btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          transition: color .2s, background .2s;
        }
        .clear-btn:hover { color: #ef4444; background: rgba(239,68,68,.1); }

        /* ============ GRID ============ */
        .est-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .est-card {
          position: relative;
          background: rgba(30,41,59,.85);
          border: 1px solid rgba(148,163,184,.15);
          border-radius: 18px;
          padding: 22px;
          cursor: pointer;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 28px rgba(0,0,0,.35);
          animation: fadeInUp .55s cubic-bezier(0.16,1,0.3,1) backwards;
          transition: transform .3s, border-color .3s, box-shadow .3s;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .est-card:hover {
          transform: translateY(-5px);
          border-color: rgba(0,242,254,.35);
          box-shadow: 0 18px 40px rgba(0,0,0,.5);
        }
        .est-shine {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,.07) 50%, transparent 70%);
          transform: translateX(-100%) skewX(-20deg);
        }
        .est-card:hover .est-shine { animation: shine .8s ease; }

        .est-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .est-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: rgba(0,242,254,.12);
          color: #00f2fe;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .est-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          background: rgba(16,185,129,.15);
          color: #10b981;
          border: 1px solid rgba(16,185,129,.4);
        }
        .est-name {
          color: #e2e8f0;
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.3px;
        }
        .est-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
          color: #94a3b8;
          font-size: 13px;
        }
        .est-info span {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .est-info svg { color: #00f2fe; font-size: 13px; flex-shrink: 0; }

        .est-btn {
          margin-top: auto;
          padding: 10px 16px;
          background: linear-gradient(135deg, #00f2fe, #4facfe);
          color: #0f172a;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform .15s, box-shadow .2s;
          font-family: inherit;
        }
        .est-card:hover .est-btn {
          box-shadow: 0 8px 20px rgba(0,242,254,.35);
        }

        /* ============ EMPTY ============ */
        .empty-state {
          text-align: center;
          padding: 70px 20px;
          color: #94a3b8;
          animation: fadeInUp .5s ease;
        }
        .empty-icon {
          width: 90px; height: 90px;
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
        .empty-state h3 { color: #e2e8f0; font-size: 20px; margin: 0 0 8px; }
        .empty-state p { margin: 0; font-size: 14px; }

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
          border-radius: 20px;
          padding: 0;
          max-width: 480px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 70px rgba(0,0,0,.7);
          animation: modalIn .3s cubic-bezier(0.34,1.56,0.64,1);
          position: relative;
        }
        .modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          background: rgba(15,23,42,.7);
          border: 1px solid #334155;
          color: #94a3b8;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all .2s;
          z-index: 2;
        }
        .modal-close:hover {
          color: #ef4444;
          border-color: rgba(239,68,68,.5);
          transform: rotate(90deg);
        }

        .modal-hero {
          background: linear-gradient(135deg, rgba(0,242,254,.15), rgba(16,185,129,.15));
          padding: 32px 24px 24px;
          text-align: center;
          border-bottom: 1px solid rgba(0,242,254,.15);
        }
        .modal-icon {
          width: 72px; height: 72px;
          margin: 0 auto 16px;
          background: rgba(0,242,254,.15);
          border: 2px solid rgba(0,242,254,.4);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 34px;
          color: #00f2fe;
          animation: pop .5s cubic-bezier(0.34,1.56,0.64,1);
        }
        .modal-hero h3 {
          color: #e2e8f0;
          font-size: 24px;
          margin: 0 0 6px;
          letter-spacing: -0.3px;
        }
        .modal-city {
          color: #94a3b8;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin: 0;
        }
        .modal-city svg { color: #00f2fe; }

        .modal-body {
          padding: 22px 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .modal-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 12px 14px;
          background: rgba(15,23,42,.7);
          border: 1px solid rgba(148,163,184,.1);
          border-radius: 12px;
          animation: fadeInUp .3s ease backwards;
        }
        .modal-item:nth-child(1) { animation-delay: .05s; }
        .modal-item:nth-child(2) { animation-delay: .10s; }
        .modal-item:nth-child(3) { animation-delay: .15s; }
        .modal-item:nth-child(4) { animation-delay: .20s; }
        .modal-item:nth-child(5) { animation-delay: .25s; }
        .modal-item:nth-child(6) { animation-delay: .30s; }
        .mi-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(0,242,254,.1);
          color: #00f2fe;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }
        .modal-item span {
          display: block;
          color: #64748b;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .5px;
          margin-bottom: 3px;
        }
        .modal-item p {
          margin: 0;
          color: #e2e8f0;
          font-size: 14px;
          font-weight: 500;
        }
        .modal-estado {
          color: #10b981 !important;
          text-transform: uppercase;
          font-weight: 700 !important;
        }

        .modal-cta {
          margin: 8px 24px 24px;
          width: calc(100% - 48px);
          padding: 14px;
          background: linear-gradient(135deg, #00f2fe, #4facfe);
          color: #0f172a;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: transform .15s, box-shadow .2s;
          font-family: inherit;
        }
        .modal-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0,242,254,.4);
        }

        @media (max-width: 600px) {
          .est-header h2 { font-size: 22px; }
          .est-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}