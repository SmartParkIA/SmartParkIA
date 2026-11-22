import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config.js";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  FaMapMarkerAlt, FaPhone, FaClock, FaCar, FaSearch, FaBuilding,
  FaSpinner, FaMapMarkedAlt, FaTimes, FaArrowRight,
  FaCity, FaCalendarAlt, FaCheckCircle, FaArrowLeft, FaLayerGroup,
  FaCrosshairs,
} from "react-icons/fa";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ============================================
   PIN ANIMADO (se inyecta globalmente)
   ============================================ */
const crearPinAnimado = (color, idx) =>
  L.divIcon({
    className: "est-pin-wrapper",
    html: `
      <div class="est-pin" style="--pin-color:${color};--pin-delay:${idx * 120}ms;">
        <span class="est-pin-ripple"></span>
        <span class="est-pin-ripple est-pin-ripple-2"></span>
        <span class="est-pin-ripple est-pin-ripple-3"></span>
        <span class="est-pin-body">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="white">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
          </svg>
        </span>
      </div>
    `,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -22],
  });

const PIN_STYLE_ID = "est-pin-global-styles";
function inyectarEstilosGlobales() {
  if (document.getElementById(PIN_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = PIN_STYLE_ID;
  style.textContent = `
    /* ===== Pin animado ===== */
    .est-pin-wrapper { background: transparent !important; border: none !important; }
    .est-pin {
      position: relative; width: 46px; height: 46px;
      display: flex; align-items: center; justify-content: center;
      animation: estPinDrop .6s cubic-bezier(.34,1.56,.64,1) var(--pin-delay,0ms) both;
    }
    @keyframes estPinDrop {
      0%   { transform: translateY(-60px) scale(.3); opacity: 0; }
      60%  { transform: translateY(8px) scale(1.15); opacity: 1; }
      100% { transform: translateY(0) scale(1); }
    }
    .est-pin-body {
      width: 30px; height: 30px;
      border-radius: 50% 50% 50% 0;
      background: var(--pin-color, #00f2fe);
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 6px 18px rgba(0,0,0,.45), 0 0 0 3px #fff;
      z-index: 3;
      transition: transform .3s ease, box-shadow .3s ease;
    }
    .est-pin-body svg { transform: rotate(45deg); }
    .est-pin-wrapper:hover .est-pin-body {
      transform: rotate(-45deg) scale(1.28);
      box-shadow: 0 10px 25px rgba(0,0,0,.55), 0 0 0 3px #fff, 0 0 22px var(--pin-color);
    }
    .est-pin-ripple {
      position: absolute; inset: 8px; border-radius: 50%;
      border: 2px solid var(--pin-color, #00f2fe);
      animation: estPinRipple 2.4s ease-out infinite;
      z-index: 1;
    }
    .est-pin-ripple-2 { animation-delay: .8s; }
    .est-pin-ripple-3 { animation-delay: 1.6s; }
    @keyframes estPinRipple {
      0%   { transform: scale(.4); opacity: .85; }
      100% { transform: scale(3); opacity: 0; }
    }

    /* ===== Popup Leaflet custom ===== */
    .leaflet-popup-content-wrapper {
      background: #1e293b !important;
      color: #e2e8f0 !important;
      border-radius: 14px !important;
      border: 1px solid rgba(0,242,254,.3) !important;
      box-shadow: 0 15px 40px rgba(0,0,0,.6) !important;
      animation: estPopupPop .3s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes estPopupPop {
      from { transform: scale(.85); opacity: 0; }
      to   { transform: scale(1); opacity: 1; }
    }
    .leaflet-popup-tip { background: #1e293b !important; border: 1px solid rgba(0,242,254,.3); }
    .leaflet-popup-content { margin: 14px 16px !important; font-family: 'Outfit','Segoe UI',sans-serif !important; }
    .leaflet-popup-close-button { color: #94a3b8 !important; font-size: 20px !important; padding: 4px 8px !important; }
    .leaflet-popup-close-button:hover { color: #00f2fe !important; }
    .leaflet-container { background: #0f172a !important; }
    .leaflet-tile-pane { filter: brightness(1.08) saturate(.85) contrast(1.05); }
  `;
  document.head.appendChild(style);
}

/* ============================================
   HELPERS DE MAPA
   ============================================ */
function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const fix = () => map.invalidateSize();
    const t1 = setTimeout(fix, 120);
    const t2 = setTimeout(fix, 500);
    const t3 = setTimeout(fix, 1200);
    const onResize = () => fix();
    window.addEventListener("resize", onResize);
    const observer = new ResizeObserver(fix);
    const c = map.getContainer();
    if (c) observer.observe(c);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, [map]);
  return null;
}

function MapFitBounds({ markers, trigger }) {
  const map = useMap();
  useEffect(() => {
    if (!markers || markers.length === 0) return;
    const t = setTimeout(() => {
      if (markers.length === 1) {
        map.flyTo([markers[0].lat, markers[0].lng], 16, { duration: 1.6 });
      } else {
        const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
        map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 15, duration: 1.6 });
      }
    }, 450);
    return () => clearTimeout(t);
  }, [markers, trigger, map]);
  return null;
}

/* ============================================
   COMPONENTE
   ============================================ */
export default function Estacionamientos() {
  const navigate = useNavigate();

  const [estacionamientos, setEstacionamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);
  const [refitTrigger, setRefitTrigger] = useState(0);

  useEffect(() => {
    inyectarEstilosGlobales();
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

  /* 🔒 Solo los que tienen coordenadas válidas */
  const conCoordenadas = useMemo(() => {
    return estacionamientos.filter(
      (e) =>
        Number.isFinite(e.lat) &&
        Number.isFinite(e.lng) &&
        e.lat >= -90 && e.lat <= 90 &&
        e.lng >= -180 && e.lng <= 180
    );
  }, [estacionamientos]);

  const sinCoordenadas = estacionamientos.length - conCoordenadas.length;

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return conCoordenadas;
    return conCoordenadas.filter(
      (e) =>
        (e.nombre || "").toLowerCase().includes(q) ||
        (e.ciudad || "").toLowerCase().includes(q) ||
        (e.direccion || "").toLowerCase().includes(q)
    );
  }, [conCoordenadas, busqueda]);

  const pisosDe = (cap) => Math.ceil((cap || 0) / 10);

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
      <div className="bg-animated">
        <div className="bg-blob blob-1"></div>
        <div className="bg-blob blob-2"></div>
        <div className="bg-blob blob-3"></div>
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
            {conCoordenadas.length} plaza{conCoordenadas.length !== 1 ? "s" : ""} con ubicación registrada
            {sinCoordenadas > 0 && (
              <span className="subtitle-warn">
                {" · "}{sinCoordenadas} oculta{sinCoordenadas !== 1 ? "s" : ""} por falta de coordenadas
              </span>
            )}
          </p>
        </header>

        {/* ============ MAPA ============ */}
        {conCoordenadas.length > 0 && (
          <section className="map-section">
            <div className="map-header">
              <div className="map-icon-wrap">
                <FaMapMarkedAlt />
                <span className="map-icon-ring"></span>
              </div>
              <div className="map-title">
                <h3>Mapa interactivo</h3>
                <p>
                  <span className="live-dot"></span>
                  {conCoordenadas.length} ubicaci{conCoordenadas.length !== 1 ? "ones" : "ón"} activa{conCoordenadas.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                className="map-refit-btn"
                onClick={() => setRefitTrigger((n) => n + 1)}
                title="Centrar todos los marcadores"
              >
                <FaCrosshairs />
              </button>
            </div>

            <div className="map-wrapper">
              <MapContainer
                center={[19.4326, -99.1332]}
                zoom={11}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={19}
                />
                <MapInvalidateSize />
                <MapFitBounds markers={filtrados} trigger={refitTrigger} />
                {filtrados.map((e, i) => {
                  const color = (e.estado || "activo") === "activo" ? "#00f2fe" : "#ef4444";
                  return (
                    <Marker
                      key={e.id}
                      position={[e.lat, e.lng]}
                      icon={crearPinAnimado(color, i)}
                    >
                      <Popup>
                        <div className="est-popup">
                          <h4>{e.nombre || "Sin nombre"}</h4>
                          <p>
                            <FaMapMarkerAlt /> {e.direccion || "—"}, {e.ciudad || "—"}
                          </p>
                          <p>
                            <FaClock /> {e.hora_apertura} - {e.hora_cierre}
                          </p>
                          <p>
                            <FaLayerGroup /> {e.capacidad || 0} cajones
                          </p>
                          <button
                            className="popup-btn"
                            onClick={() => setSeleccionado(e)}
                          >
                            Ver detalles <FaArrowRight />
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              <div className="map-legend">
                <div className="legend-item">
                  <span className="legend-dot legend-dot--activo"></span> Activo
                </div>
                <div className="legend-item">
                  <span className="legend-dot legend-dot--inactivo"></span> Inactivo
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============ BUSCADOR ============ */}
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

        {/* ============ GRID ============ */}
        {filtrados.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FaCar />
            </div>
            <h3>
              {busqueda
                ? "Sin resultados"
                : "No hay estacionamientos con coordenadas"}
            </h3>
            <p>
              {busqueda
                ? "Prueba con otro término."
                : sinCoordenadas > 0
                ? `Hay ${sinCoordenadas} plaza${sinCoordenadas !== 1 ? "s" : ""} registrada${sinCoordenadas !== 1 ? "s" : ""} pero sin coordenadas asignadas.`
                : "Aún no hay plazas registradas."}
            </p>
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
                  <span>
                    <FaMapMarkerAlt /> {e.direccion || "—"}, {e.ciudad || "—"}
                  </span>
                  <span>
                    <FaClock /> {e.hora_apertura} - {e.hora_cierre}
                  </span>
                  <span>
                    <FaLayerGroup /> {e.capacidad || 0} cajones ·{" "}
                    {pisosDe(e.capacidad)} piso
                    {pisosDe(e.capacidad) !== 1 ? "s" : ""}
                  </span>
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
            <button
              className="modal-close"
              onClick={() => setSeleccionado(null)}
            >
              <FaTimes />
            </button>

            <div className="modal-hero">
              <div className="modal-icon">
                <FaBuilding />
              </div>
              <h3>{seleccionado.nombre}</h3>
              <p className="modal-city">
                <FaMapMarkerAlt /> {seleccionado.ciudad}
              </p>
            </div>

            <div className="modal-body">
              <div className="modal-item">
                <div className="mi-icon">
                  <FaMapMarkerAlt />
                </div>
                <div>
                  <span>Dirección</span>
                  <p>{seleccionado.direccion || "—"}</p>
                </div>
              </div>
              <div className="modal-item">
                <div className="mi-icon">
                  <FaCity />
                </div>
                <div>
                  <span>Ciudad</span>
                  <p>{seleccionado.ciudad || "—"}</p>
                </div>
              </div>
              <div className="modal-item">
                <div className="mi-icon">
                  <FaClock />
                </div>
                <div>
                  <span>Horario</span>
                  <p>
                    {seleccionado.hora_apertura} - {seleccionado.hora_cierre}
                  </p>
                </div>
              </div>
              <div className="modal-item">
                <div className="mi-icon">
                  <FaPhone />
                </div>
                <div>
                  <span>Teléfono</span>
                  <p>{seleccionado.telefono || "—"}</p>
                </div>
              </div>
              <div className="modal-item">
                <div className="mi-icon">
                  <FaLayerGroup />
                </div>
                <div>
                  <span>Capacidad</span>
                  <p>
                    {seleccionado.capacidad || 0} cajones ·{" "}
                    {pisosDe(seleccionado.capacidad)} piso
                    {pisosDe(seleccionado.capacidad) !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="modal-item">
                <div className="mi-icon">
                  <FaCalendarAlt />
                </div>
                <div>
                  <span>Estado</span>
                  <p className="modal-estado">
                    {seleccionado.estado || "activo"}
                  </p>
                </div>
              </div>
              <div className="modal-item">
                <div className="mi-icon">
                  <FaMapMarkedAlt />
                </div>
                <div>
                  <span>Coordenadas</span>
                  <p>
                    {seleccionado.lat?.toFixed(6)},{" "}
                    {seleccionado.lng?.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>

            <button
              className="modal-cta"
              onClick={() =>
                navigate(`/mapa-estacionamiento/${seleccionado.id}`)
              }
            >
              <FaMapMarkedAlt /> Agendar cita
            </button>
          </div>
        </div>
      )}

      {/* ============ ESTILOS ============ */}
      <style>{`
        /* ====== Keyframes base ====== */
        @keyframes fadeIn       { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp     { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin         { to { transform: rotate(360deg); } }
        @keyframes pulse        { 0%,100% { opacity: .4; } 50% { opacity: .85; } }
        @keyframes pop          { 0% { transform: scale(0); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @keyframes blobMove1    { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(80px,-60px) scale(1.15); } }
        @keyframes blobMove2    { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-100px,80px) scale(1.1); } }
        @keyframes blobMove3    { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(60px,80px) scale(1.2); } }
        @keyframes gridMove     { from { background-position: 0 0; } to { background-position: 60px 60px; } }
        @keyframes shine        { 0% { transform: translateX(-100%) skewX(-20deg); } 100% { transform: translateX(200%) skewX(-20deg); } }
        @keyframes modalIn      { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes overlayIn    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes float        { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes sectionGlow {
          0%,100% { box-shadow: 0 20px 50px rgba(0,0,0,.4), 0 0 30px rgba(0,242,254,.06); }
          50%     { box-shadow: 0 20px 50px rgba(0,0,0,.4), 0 0 60px rgba(0,242,254,.18); }
        }
        @keyframes livePulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(0,242,254,.6); }
          50%     { box-shadow: 0 0 0 8px rgba(0,242,254,0); }
        }
        @keyframes ringPulse {
          0%   { transform: scale(.8); opacity: .9; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes legendPulse {
          0%,100% { transform: scale(1); opacity: 1; }
          50%     { transform: scale(1.3); opacity: .7; }
        }

        * { box-sizing: border-box; }

        .est-page {
          min-height: 100vh;
          background: #0f172a;
          font-family: 'Outfit','Segoe UI',system-ui,sans-serif;
          color: #e2e8f0;
          padding: 30px 20px 60px;
          position: relative; overflow-x: hidden;
          animation: fadeIn .5s ease;
        }
        .est-page.center-state {
          display:flex; flex-direction:column;
          align-items:center; justify-content:center; gap:16px;
          color:#94a3b8;
        }
        .spin { animation: spin 1s linear infinite; }

        /* ===== Fondo animado ===== */
        .bg-animated { position:fixed; inset:0; z-index:0; overflow:hidden; pointer-events:none; }
        .bg-blob { position:absolute; border-radius:50%; filter:blur(90px); opacity:.28; }
        .blob-1 { width:500px; height:500px; background: radial-gradient(circle,#10b981,transparent 70%); top:-180px; left:-150px; animation: blobMove1 18s ease-in-out infinite; }
        .blob-2 { width:600px; height:600px; background: radial-gradient(circle,#00f2fe,transparent 70%); bottom:-200px; right:-180px; animation: blobMove2 22s ease-in-out infinite; }
        .blob-3 { width:400px; height:400px; background: radial-gradient(circle,#8b5cf6,transparent 70%); top:40%; right:20%; animation: blobMove3 26s ease-in-out infinite; }
        .bg-grid {
          position:absolute; inset:0;
          background-image:
            linear-gradient(rgba(0,242,254,.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,242,254,.04) 1px, transparent 1px);
          background-size: 60px 60px;
          animation: gridMove 8s linear infinite;
          mask-image: radial-gradient(circle at center, black 30%, transparent 80%);
          -webkit-mask-image: radial-gradient(circle at center, black 30%, transparent 80%);
        }

        .container { max-width: 1200px; margin: 0 auto; position: relative; z-index: 1; }

        /* ===== Header ===== */
        .est-header { margin-bottom: 24px; animation: fadeInUp .5s ease; }
        .back-link {
          display:inline-flex; align-items:center; gap:8px;
          color:#94a3b8; text-decoration:none; font-size:13px;
          padding:6px 12px; border-radius:8px;
          border:1px solid #334155; background: rgba(30,41,59,.5);
          margin-bottom:14px; transition: all .2s;
        }
        .back-link:hover { color:#00f2fe; border-color: rgba(0,242,254,.4); transform: translateX(-3px); }
        .est-header h2 {
          display:flex; align-items:center; gap:12px;
          color:#e2e8f0; font-size:30px; margin:0; letter-spacing:-0.5px;
        }
        .title-icon { color:#00f2fe; animation: float 3s ease-in-out infinite; }
        .subtitle { color:#94a3b8; font-size:14px; margin:6px 0 0; }
        .subtitle-warn { color:#f59e0b; }

        /* ===== Mapa ===== */
        .map-section {
          position:relative;
          margin-bottom:28px; padding:20px;
          background: rgba(30,41,59,.75);
          backdrop-filter: blur(15px);
          border-radius:22px;
          border:1px solid rgba(0,242,254,.15);
          animation: fadeInUp .6s ease .1s backwards, sectionGlow 4s ease-in-out infinite;
        }
        .map-header { display:flex; align-items:center; gap:14px; margin-bottom:16px; }
        .map-icon-wrap {
          position:relative;
          width:48px; height:48px; border-radius:14px;
          background: linear-gradient(135deg,#00f2fe,#4facfe);
          color:#0f172a;
          display:flex; align-items:center; justify-content:center;
          font-size:22px;
          box-shadow: 0 8px 22px rgba(0,242,254,.4);
          animation: float 3s ease-in-out infinite;
        }
        .map-icon-ring {
          position:absolute; inset:-4px; border-radius:18px;
          border:2px solid rgba(0,242,254,.5);
          animation: ringPulse 2.4s ease-out infinite;
          pointer-events:none;
        }
        .map-title { flex:1; }
        .map-title h3 { margin:0; font-size:17px; color:#e2e8f0; letter-spacing:-0.3px; }
        .map-title p {
          margin:4px 0 0; font-size:13px; color:#94a3b8;
          display:flex; align-items:center; gap:8px;
        }
        .live-dot {
          display:inline-block; width:8px; height:8px; border-radius:50%;
          background:#00f2fe;
          animation: livePulse 1.8s ease-in-out infinite;
        }
        .map-refit-btn {
          width:40px; height:40px; border-radius:10px;
          background: rgba(0,242,254,.1);
          color:#00f2fe;
          border:1px solid rgba(0,242,254,.3);
          cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          font-size:16px;
          transition: all .3s cubic-bezier(.34,1.56,.64,1);
        }
        .map-refit-btn:hover {
          background: rgba(0,242,254,.2);
          transform: rotate(180deg) scale(1.1);
          box-shadow: 0 0 20px rgba(0,242,254,.4);
        }
        .map-refit-btn:active { transform: rotate(180deg) scale(.95); }

        .map-wrapper {
          height:480px; border-radius:16px; overflow:hidden;
          position:relative;
          border:1px solid rgba(0,242,254,.2);
          background:#0f172a;
        }
        .map-wrapper .leaflet-container {
          width:100%; height:100%; font-family:'Outfit',sans-serif;
          animation: fadeIn .8s ease;
        }

        .map-legend {
          position:absolute; bottom:16px; left:16px;
          background: rgba(15,23,42,.9);
          border:1px solid rgba(0,242,254,.25);
          border-radius:12px;
          padding:10px 14px;
          display:flex; flex-direction:column; gap:8px;
          font-size:12px;
          backdrop-filter: blur(10px);
          z-index:500;
          animation: fadeInUp .6s ease .8s backwards;
        }
        .legend-item { display:flex; align-items:center; gap:8px; color:#cbd5e1; }
        .legend-dot {
          width:10px; height:10px; border-radius:50%;
          animation: legendPulse 2s ease-in-out infinite;
        }
        .legend-dot--activo { background:#00f2fe; box-shadow: 0 0 8px #00f2fe; }
        .legend-dot--inactivo { background:#ef4444; box-shadow: 0 0 8px #ef4444; animation-delay: .5s; }

        /* ===== Contenido del popup ===== */
        .est-popup h4 { margin:0 0 8px; font-size:15px; color:#00f2fe; }
        .est-popup p {
          margin:4px 0; font-size:12px; color:#cbd5e1;
          display:flex; align-items:center; gap:6px;
        }
        .est-popup p svg { color:#00f2fe; font-size:11px; flex-shrink:0; }
        .popup-btn {
          margin-top:10px; width:100%;
          padding:8px 12px;
          background: linear-gradient(135deg,#00f2fe,#4facfe);
          color:#0f172a;
          border:none; border-radius:8px;
          font-size:12px; font-weight:700; cursor:pointer;
          display:inline-flex; align-items:center; justify-content:center; gap:6px;
          font-family:inherit;
          transition: transform .15s, box-shadow .2s;
        }
        .popup-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0,242,254,.4);
        }

        /* ===== Buscador ===== */
        .search-wrap { position:relative; margin-bottom:24px; animation: fadeInUp .5s ease .2s backwards; }
        .search-icon {
          position:absolute; left:16px; top:50%; transform: translateY(-50%);
          color:#64748b; pointer-events:none; transition: color .2s;
        }
        .search-wrap:focus-within .search-icon { color:#00f2fe; }
        .search-wrap input {
          width:100%;
          padding:14px 44px 14px 46px;
          border-radius:14px;
          border:1px solid rgba(148,163,184,.2);
          background: rgba(30,41,59,.7);
          color:#e2e8f0; font-size:14px; font-family:inherit; outline:none;
          backdrop-filter: blur(10px);
          transition: border-color .2s, box-shadow .2s;
        }
        .search-wrap input:focus {
          border-color:#00f2fe;
          box-shadow: 0 0 0 3px rgba(0,242,254,.15);
        }
        .clear-btn {
          position:absolute; right:10px; top:50%; transform: translateY(-50%);
          background:transparent; border:none; color:#64748b; cursor:pointer;
          padding:6px; border-radius:6px; transition: color .2s, background .2s;
        }
        .clear-btn:hover { color:#ef4444; background: rgba(239,68,68,.1); }

        /* ===== Grid ===== */
        .est-grid {
          display:grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap:20px;
        }
        .est-card {
          position:relative;
          background: rgba(30,41,59,.85);
          border:1px solid rgba(148,163,184,.15);
          border-radius:18px; padding:22px;
          cursor:pointer; backdrop-filter: blur(10px);
          box-shadow: 0 8px 28px rgba(0,0,0,.35);
          animation: fadeInUp .55s cubic-bezier(0.16,1,0.3,1) backwards;
          transition: transform .3s, border-color .3s, box-shadow .3s;
          overflow:hidden; display:flex; flex-direction:column; gap:14px;
        }
        .est-card:hover {
          transform: translateY(-5px);
          border-color: rgba(0,242,254,.35);
          box-shadow: 0 18px 40px rgba(0,0,0,.5);
        }
        .est-shine {
          position:absolute; inset:0; pointer-events:none;
          background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,.07) 50%, transparent 70%);
          transform: translateX(-100%) skewX(-20deg);
        }
        .est-card:hover .est-shine { animation: shine .8s ease; }

        .est-card-top { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .est-icon {
          width:52px; height:52px; border-radius:14px;
          background: rgba(0,242,254,.12); color:#00f2fe;
          display:flex; align-items:center; justify-content:center; font-size:24px;
        }
        .est-badge {
          display:inline-flex; align-items:center; gap:6px;
          padding:5px 12px; border-radius:20px;
          font-size:11px; font-weight:700;
          background: rgba(16,185,129,.15);
          color:#10b981;
          border:1px solid rgba(16,185,129,.4);
        }
        .est-name { color:#e2e8f0; font-size:18px; font-weight:700; margin:0; letter-spacing:-0.3px; }
        .est-info { display:flex; flex-direction:column; gap:8px; color:#94a3b8; font-size:13px; }
        .est-info span { display:flex; align-items:center; gap:8px; }
        .est-info svg { color:#00f2fe; font-size:13px; flex-shrink:0; }

        .est-btn {
          margin-top:auto; padding:10px 16px;
          background: linear-gradient(135deg,#00f2fe,#4facfe);
          color:#0f172a; border:none; border-radius:10px;
          font-size:13px; font-weight:700; cursor:pointer;
          display:inline-flex; align-items:center; justify-content:center; gap:8px;
          transition: transform .15s, box-shadow .2s;
          font-family:inherit;
        }
        .est-card:hover .est-btn { box-shadow: 0 8px 20px rgba(0,242,254,.35); }

        /* ===== Empty ===== */
        .empty-state { text-align:center; padding:70px 20px; color:#94a3b8; animation: fadeInUp .5s ease; }
        .empty-icon {
          width:90px; height:90px; margin:0 auto 20px;
          background: rgba(0,242,254,.08);
          border:2px dashed rgba(0,242,254,.3);
          border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:38px; color:#00f2fe;
          animation: pulse 3s ease-in-out infinite;
        }
        .empty-state h3 { color:#e2e8f0; font-size:20px; margin:0 0 8px; }
        .empty-state p { margin:0; font-size:14px; }

        /* ===== Modal ===== */
        .modal-overlay {
          position:fixed; inset:0;
          background: rgba(0,0,0,.8);
          backdrop-filter: blur(6px);
          display:flex; align-items:center; justify-content:center;
          z-index:10000; padding:20px;
          animation: overlayIn .25s ease;
        }
        .modal {
          background:#1e293b;
          border:1px solid rgba(0,242,254,.2);
          border-radius:20px; padding:0;
          max-width:480px; width:100%;
          max-height:90vh; overflow-y:auto;
          box-shadow: 0 25px 70px rgba(0,0,0,.7);
          animation: modalIn .3s cubic-bezier(0.34,1.56,0.64,1);
          position:relative;
        }
        .modal-close {
          position:absolute; top:14px; right:14px;
          background: rgba(15,23,42,.7);
          border:1px solid #334155; color:#94a3b8;
          width:34px; height:34px; border-radius:50%; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          transition: all .2s; z-index:2;
        }
        .modal-close:hover { color:#ef4444; border-color: rgba(239,68,68,.5); transform: rotate(90deg); }

        .modal-hero {
          background: linear-gradient(135deg, rgba(0,242,254,.15), rgba(16,185,129,.15));
          padding:32px 24px 24px; text-align:center;
          border-bottom:1px solid rgba(0,242,254,.15);
        }
        .modal-icon {
          width:72px; height:72px; margin:0 auto 16px;
          background: rgba(0,242,254,.15);
          border:2px solid rgba(0,242,254,.4);
          border-radius:20px;
          display:flex; align-items:center; justify-content:center;
          font-size:34px; color:#00f2fe;
          animation: pop .5s cubic-bezier(0.34,1.56,0.64,1);
        }
        .modal-hero h3 { color:#e2e8f0; font-size:24px; margin:0 0 6px; letter-spacing:-0.3px; }
        .modal-city {
          color:#94a3b8; font-size:14px;
          display:inline-flex; align-items:center; gap:6px; margin:0;
        }
        .modal-city svg { color:#00f2fe; }

        .modal-body { padding:22px 24px; display:flex; flex-direction:column; gap:12px; }
        .modal-item {
          display:flex; align-items:flex-start; gap:14px;
          padding:12px 14px;
          background: rgba(15,23,42,.7);
          border:1px solid rgba(148,163,184,.1);
          border-radius:12px;
          animation: fadeInUp .3s ease backwards;
        }
        .modal-item:nth-child(1) { animation-delay: .05s; }
        .modal-item:nth-child(2) { animation-delay: .10s; }
        .modal-item:nth-child(3) { animation-delay: .15s; }
        .modal-item:nth-child(4) { animation-delay: .20s; }
        .modal-item:nth-child(5) { animation-delay: .25s; }
        .modal-item:nth-child(6) { animation-delay: .30s; }
        .modal-item:nth-child(7) { animation-delay: .35s; }
        .mi-icon {
          width:36px; height:36px; border-radius:10px;
          background: rgba(0,242,254,.1); color:#00f2fe;
          display:flex; align-items:center; justify-content:center;
          font-size:16px; flex-shrink:0;
        }
        .modal-item span {
          display:block; color:#64748b; font-size:11px;
          text-transform:uppercase; letter-spacing:.5px; margin-bottom:3px;
        }
        .modal-item p { margin:0; color:#e2e8f0; font-size:14px; font-weight:500; }
        .modal-estado { color:#10b981 !important; text-transform:uppercase; font-weight:700 !important; }

        .modal-cta {
          margin:8px 24px 24px;
          width:calc(100% - 48px);
          padding:14px;
          background: linear-gradient(135deg,#00f2fe,#4facfe);
          color:#0f172a;
          border:none; border-radius:12px;
          font-size:15px; font-weight:800; cursor:pointer;
          display:inline-flex; align-items:center; justify-content:center; gap:10px;
          transition: transform .15s, box-shadow .2s;
          font-family:inherit;
        }
        .modal-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0,242,254,.4);
        }

        @media (max-width: 600px) {
          .est-header h2 { font-size:22px; }
          .est-grid { grid-template-columns: 1fr; }
          .map-wrapper { height: 360px; }
          .map-header { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}