import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/config.js";
import {
  FaSearch, FaChevronDown, FaTimes, FaCheck, FaHistory,
  FaParking, FaCalendarAlt, FaClock, FaHourglassHalf, FaCar,
  FaSpinner, FaArrowLeft, FaFilter, FaTimesCircle, FaCheckCircle,
  FaBroom, FaClipboardList, FaRegClock, FaChartBar, FaFire,
  FaLayerGroup, FaRegCalendarCheck, FaRegCalendarTimes, FaBolt,
  FaStar, FaRegStar, FaRoute, FaInfoCircle,
} from "react-icons/fa";

const ESTADOS = [
  { value: "",           label: "Todos los estados", icon: FaClipboardList },
  { value: "Finalizada", label: "Finalizadas",       icon: FaCheckCircle },
  { value: "Cancelada",  label: "Canceladas",        icon: FaTimesCircle },
];

// Calcula el estado real de una reserva
function calcularEstado(r) {
  const estado = (r.estado || "").toLowerCase();
  if (estado === "cancelada") return "cancelada";
  if (estado === "finalizada") return "finalizada";
  if (estado === "activa") {
    const inicio = new Date(`${r.fecha}T${r.horario}`);
    const dur = parseInt(r.duracion, 10) || 0;
    const fin = new Date(inicio.getTime() + dur * 60 * 60 * 1000);
    return fin < new Date() ? "finalizada" : "activa";
  }
  return "otra";
}

export default function Historial() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const uidRef = useRef(null);

  // --------- Cerrar dropdown al clic fuera ---------
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // --------- Carga de reservas ---------
  const cargar = async (uid, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const q = query(collection(db, "reservas"), where("uid", "==", uid));
      const snap = await getDocs(q);
      const data = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() }));

      const historial = data
        .map((r) => ({ ...r, _estadoReal: calcularEstado(r) }))
        .filter((r) => r._estadoReal === "finalizada" || r._estadoReal === "cancelada");

      historial.sort((a, b) => {
        const fa = new Date(`${a.fecha || "2000-01-01"}T${a.horario || "00:00"}`);
        const fb = new Date(`${b.fecha || "2000-01-01"}T${b.horario || "00:00"}`);
        return fb - fa;
      });

      setReservas(historial);
    } catch (err) {
      console.error("Error cargando historial:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // --------- Auth + primera carga ---------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate("/login", { replace: true });
        return;
      }
      setUser(u);
      uidRef.current = u.uid;
      await cargar(u.uid);
    });
    return () => unsub();
  }, [navigate]);

  // --------- Auto-refresh cada 30s ---------
  useEffect(() => {
    if (!uidRef.current) return;
    const id = setInterval(() => {
      if (uidRef.current) cargar(uidRef.current, true);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // --------- Filtrado ---------
  const filtradas = useMemo(() => {
    return reservas.filter((r) => {
      const q = busqueda.trim().toLowerCase();
      const matchBusqueda =
        !q ||
        (r.estacionamiento || "").toLowerCase().includes(q) ||
        (r.espacio || "").toLowerCase().includes(q) ||
        (r.placa || "").toLowerCase().includes(q) ||
        (r.marca || "").toLowerCase().includes(q);

      const matchEstado =
        !estadoFiltro ||
        (r._estadoReal || "").toLowerCase() === estadoFiltro.toLowerCase();

      return matchBusqueda && matchEstado;
    });
  }, [reservas, busqueda, estadoFiltro]);

  // --------- Stats ---------
  const stats = useMemo(() => {
    const total = reservas.length;
    const finalizadas = reservas.filter((r) => r._estadoReal === "finalizada").length;
    const canceladas = reservas.filter((r) => r._estadoReal === "cancelada").length;
    const auto = reservas.filter(
      (r) => r._estadoReal === "finalizada" && (r.estado || "").toLowerCase() === "activa"
    ).length;
    return { total, finalizadas, canceladas, auto };
  }, [reservas]);

  const estadoActual = ESTADOS.find((e) => e.value === estadoFiltro) || ESTADOS[0];

  const limpiar = () => {
    setBusqueda("");
    setEstadoFiltro("");
  };

  const getEstadoInfo = (r) => {
    const real = r._estadoReal || calcularEstado(r);
    if (real === "finalizada") {
      const eraActiva = (r.estado || "").toLowerCase() === "activa";
      return {
        label: eraActiva ? "FINALIZADA AUTO" : "FINALIZADA",
        cls: "finalizada",
        icon: eraActiva ? FaRegClock : FaCheckCircle,
        auto: eraActiva,
      };
    }
    if (real === "cancelada")
      return { label: "CANCELADA", cls: "cancelada", icon: FaTimesCircle, auto: false };
    return { label: real.toUpperCase(), cls: "otra", icon: FaHistory, auto: false };
  };

  // ============ RENDER ============
  return (
    <div className="hist-page">
      {/* ========= FONDO ANIMADO ========= */}
      <div className="bg-animated">
        <div className="bg-blob blob-1"></div>
        <div className="bg-blob blob-2"></div>
        <div className="bg-blob blob-3"></div>
        <div className="bg-blob blob-4"></div>
        <div className="bg-grid"></div>
        <div className="bg-grid bg-grid-far"></div>
        <div className="bg-scanline"></div>
        <div className="bg-particles">
          {Array.from({ length: 22 }).map((_, i) => (
            <span
              key={i}
              className={`particle ${i % 3 === 0 ? "particle-big" : ""}`}
              style={{
                left: `${(i * 4.7 + 3) % 100}%`,
                animationDelay: `${i * 0.7}s`,
                animationDuration: `${8 + (i % 5) * 2}s`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="container">
        {/* ========= HEADER ========= */}
        <header className="hist-header">
          <div>
            <Link to="/perfil" className="back-link">
              <FaArrowLeft /> Volver al perfil
            </Link>
            <h2>
              <FaHistory className="title-icon" /> Historial de Reservaciones
              {refreshing && <FaSpinner className="spin refresh-indicator" />}
            </h2>
            <p className="subtitle">
              {stats.total > 0
                ? `${stats.total} reserva${stats.total !== 1 ? "s" : ""} en tu historial · se actualiza cada 30s`
                : "Aquí verás tus reservas pasadas"}
            </p>
          </div>
        </header>

        {/* ========= STATS ========= */}
        {stats.total > 0 && (
          <div className="stats-grid">
            <div className="stat-card stat-total">
              <div className="stat-icon"><FaChartBar /></div>
              <div>
                <span>Total</span>
                <h3>{stats.total}</h3>
              </div>
            </div>
            <div className="stat-card stat-final">
              <div className="stat-icon"><FaCheckCircle /></div>
              <div>
                <span>Finalizadas</span>
                <h3>{stats.finalizadas}</h3>
              </div>
            </div>
            <div className="stat-card stat-cancel">
              <div className="stat-icon"><FaTimesCircle /></div>
              <div>
                <span>Canceladas</span>
                <h3>{stats.canceladas}</h3>
              </div>
            </div>
            {stats.auto > 0 && (
              <div className="stat-card stat-auto">
                <div className="stat-icon"><FaBolt /></div>
                <div>
                  <span>Auto-finalizadas</span>
                  <h3>{stats.auto}</h3>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========= FILTROS ========= */}
        <div className="filtros">
          <div className="input-wrap">
            <FaSearch className="search-icon" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por estacionamiento, cajón, placa o marca..."
            />
            {busqueda && (
              <button className="clear-input" onClick={() => setBusqueda("")} aria-label="Limpiar">
                <FaTimes />
              </button>
            )}
          </div>

          <div className={`custom-select ${dropdownOpen ? "open" : ""}`} ref={dropdownRef}>
            <button
              type="button"
              className="select-trigger"
              onClick={() => setDropdownOpen((v) => !v)}
            >
              <span className="select-label">
                <FaFilter className="filter-icon" />
                {estadoActual.label}
              </span>
              <FaChevronDown className="chevron" />
            </button>

            {dropdownOpen && (
              <div className="select-options">
                {ESTADOS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = opt.value === estadoFiltro;
                  return (
                    <div
                      key={opt.value || "all"}
                      className={`option ${selected ? "selected" : ""}`}
                      onClick={() => {
                        setEstadoFiltro(opt.value);
                        setDropdownOpen(false);
                      }}
                    >
                      <Icon /> {opt.label}
                      {selected && <FaCheck className="check-icon" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {(busqueda || estadoFiltro) && (
            <button className="btn-limpiar" onClick={limpiar}>
              <FaBroom /> Limpiar
            </button>
          )}

          <button
            className="btn-refresh"
            onClick={() => uidRef.current && cargar(uidRef.current, true)}
            disabled={refreshing}
            title="Actualizar ahora"
          >
            <FaRoute className={refreshing ? "spin" : ""} />
          </button>
        </div>

        {/* ========= CONTENIDO ========= */}
        {loading ? (
          <div className="loader-state">
            <div className="loader-ring">
              <FaSpinner className="spin" size={42} color="#10b981" />
            </div>
            <p>Cargando historial...</p>
          </div>
        ) : reservas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><FaClipboardList /></div>
            <h3>Aún no tienes historial</h3>
            <p>Tus reservas finalizadas y canceladas aparecerán aquí.</p>
            <Link to="/reservar" className="btn-cta">
              <FaParking /> Hacer una reserva
            </Link>
          </div>
        ) : filtradas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><FaSearch /></div>
            <h3>Sin resultados</h3>
            <p>Prueba con otro término o cambia el filtro.</p>
            <button className="btn-cta" onClick={limpiar}>
              <FaBroom /> Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="hist-grid">
            {filtradas.map((r, i) => {
              const info = getEstadoInfo(r);
              const EstadoIcon = info.icon;
              return (
                <div
                  key={r.id}
                  className={`hist-card ${info.cls}`}
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  {/* Encabezado */}
                  <div className="card-top">
                    <h3>
                      <FaParking className="title-mini" />
                      {r.estacionamiento || "Estacionamiento"}
                    </h3>
                    <span
                      className={`badge ${info.cls}`}
                      title={
                        info.auto
                          ? "Finalizada automáticamente al pasar la hora"
                          : info.cls === "finalizada"
                          ? "Reserva completada"
                          : "Reserva cancelada"
                      }
                    >
                      <EstadoIcon /> {info.label}
                    </span>
                  </div>

                  {/* Chip auto */}
                  {info.auto && (
                    <div className="auto-tag">
                      <FaBolt /> Finalizada automáticamente
                    </div>
                  )}

                  {/* Cajón destacado */}
                  <div className="cajon-box">
                    <FaParking className="cajon-icon" />
                    <div>
                      <span>Cajón</span>
                      <p>{r.espacio || "—"}</p>
                    </div>
                    <div className="cajon-decoration">
                      <FaLayerGroup />
                    </div>
                  </div>

                  {/* Detalles */}
                  <div className="detalle-grid">
                    <div className="detalle">
                      <FaCalendarAlt />
                      <span>{r.fecha || "—"}</span>
                    </div>
                    <div className="detalle">
                      <FaClock />
                      <span>{r.horario || "—"}</span>
                    </div>
                    <div className="detalle">
                      <FaHourglassHalf />
                      <span>{r.duracion || "—"}</span>
                    </div>
                    {r.placa && (
                      <div className="detalle">
                        <FaCar />
                        <span className="placa">{r.placa}</span>
                      </div>
                    )}
                  </div>

                  {/* Vehículo */}
                  {(r.marca || r.modelo) && (
                    <div className="vehiculo-info">
                      <FaCar />
                      <span>
                        {r.marca}
                        {r.modelo && ` · ${r.modelo}`}
                      </span>
                      <FaStar className="star-deco" />
                    </div>
                  )}

                  {/* Footer */}
                  <div className="card-footer">
                    {r.fechaCreacion ? (
                      <>
                        <FaRegCalendarCheck />
                        Reservado el{" "}
                        {new Date(r.fechaCreacion).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </>
                    ) : (
                      <>
                        <FaInfoCircle /> Sin fecha de creación
                      </>
                    )}
                  </div>

                  {/* Acento lateral */}
                  <div className="accent-line"></div>
                  <div className="card-shine"></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========= ESTILOS ========= */}
      <style>{`
        /* ============== ANIMACIONES ============== */
        @keyframes fadeIn       { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp     { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin         { to { transform: rotate(360deg); } }
        @keyframes pulse        { 0%,100% { opacity: .4; } 50% { opacity: .9; } }
        @keyframes float        { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes pop          { 0% { transform: scale(0); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @keyframes blobMove1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%     { transform: translate(80px,-60px) scale(1.15); }
          66%     { transform: translate(-40px,40px) scale(0.95); }
        }
        @keyframes blobMove2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(-100px,80px) scale(1.1); }
        }
        @keyframes blobMove3 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%     { transform: translate(60px,100px) scale(1.05); }
          80%     { transform: translate(-80px,-40px) scale(0.9); }
        }
        @keyframes blobMove4 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(120px,-100px) scale(1.2); }
        }
        @keyframes gridMove {
          from { background-position: 0 0; }
          to   { background-position: 60px 60px; }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes particleFloat {
          0%   { transform: translateY(100vh) scale(0); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(-20vh) scale(1); opacity: 0; }
        }
        @keyframes accentGrow {
          from { transform: scaleY(0); }
          to   { transform: scaleY(1); }
        }
        @keyframes badgePulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,.35); }
          50%     { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
        }
        @keyframes shine {
          0%   { transform: translateX(-100%) skewX(-20deg); }
          100% { transform: translateX(200%) skewX(-20deg); }
        }
        @keyframes statPop {
          0%   { transform: scale(.8); opacity: 0; }
          70%  { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes ringRotate {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes starTwinkle {
          0%,100% { transform: scale(1); opacity: .7; }
          50%     { transform: scale(1.2); opacity: 1; }
        }
        @keyframes autoPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,.4); }
          50%     { box-shadow: 0 0 0 8px rgba(245,158,11,0); }
        }

        /* ============== BASE ============== */
        * { box-sizing: border-box; }

        .hist-page {
          min-height: 100vh;
          background: #0f172a;
          font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif;
          color: #e2e8f0;
          padding: 30px 20px 60px;
          position: relative;
          overflow-x: hidden;
          animation: fadeIn .5s ease;
        }

        /* ============== FONDO ANIMADO ============== */
        .bg-animated {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .bg-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: .35;
          will-change: transform;
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
        .blob-3 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #6366f1, transparent 70%);
          top: 40%; left: 50%;
          animation: blobMove3 20s ease-in-out infinite;
        }
        .blob-4 {
          width: 350px; height: 350px;
          background: radial-gradient(circle, #f59e0b, transparent 70%);
          top: 10%; right: 10%;
          opacity: .18;
          animation: blobMove4 25s ease-in-out infinite;
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
        .bg-grid-far {
          background-image:
            linear-gradient(rgba(99,102,241,.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,.05) 1px, transparent 1px);
          background-size: 120px 120px;
          animation-duration: 15s;
          animation-direction: reverse;
        }
        .bg-scanline {
          position: absolute;
          inset: 0;
          height: 100vh;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(0,242,254,.06) 50%,
            transparent 100%
          );
          animation: scanline 10s linear infinite;
        }
        .bg-particles { position: absolute; inset: 0; }
        .particle {
          position: absolute;
          bottom: 0;
          width: 4px; height: 4px;
          background: #00f2fe;
          border-radius: 50%;
          box-shadow: 0 0 8px #00f2fe;
          animation: particleFloat linear infinite;
          opacity: 0;
        }
        .particle-big {
          width: 6px; height: 6px;
          background: #10b981;
          box-shadow: 0 0 12px #10b981;
        }

        /* ============== CONTENEDOR ============== */
        .container {
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        /* ============== HEADER ============== */
        .hist-header {
          margin-bottom: 22px;
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
          border: 1px solid rgba(148,163,184,.2);
          background: rgba(30,41,59,.5);
          backdrop-filter: blur(8px);
          margin-bottom: 14px;
          transition: all .2s;
        }
        .back-link:hover {
          color: #00f2fe;
          border-color: rgba(0,242,254,.4);
          transform: translateX(-3px);
        }
        .hist-header h2 {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #e2e8f0;
          font-size: 30px;
          margin: 0;
          letter-spacing: -0.5px;
        }
        .title-icon {
          color: #10b981;
          animation: float 3s ease-in-out infinite;
        }
        .refresh-indicator {
          color: #f59e0b;
          font-size: 16px;
          margin-left: 6px;
        }
        .subtitle {
          color: #94a3b8;
          font-size: 14px;
          margin: 6px 0 0;
        }

        /* ============== STATS ============== */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }
        .stat-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          background: rgba(30,41,59,.7);
          border: 1px solid rgba(148,163,184,.15);
          border-radius: 14px;
          backdrop-filter: blur(10px);
          animation: statPop .5s cubic-bezier(0.34,1.56,0.64,1) backwards;
          transition: transform .25s, border-color .25s, box-shadow .25s;
        }
        .stat-card:nth-child(1) { animation-delay: .05s; }
        .stat-card:nth-child(2) { animation-delay: .15s; }
        .stat-card:nth-child(3) { animation-delay: .25s; }
        .stat-card:nth-child(4) { animation-delay: .35s; }
        .stat-card:hover {
          transform: translateY(-3px);
          border-color: rgba(0,242,254,.35);
          box-shadow: 0 12px 28px rgba(0,0,0,.4);
        }
        .stat-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
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
        .stat-total .stat-icon   { background: rgba(0,242,254,.15); color: #00f2fe; }
        .stat-final .stat-icon   { background: rgba(16,185,129,.15); color: #10b981; }
        .stat-cancel .stat-icon  { background: rgba(239,68,68,.15); color: #ef4444; }
        .stat-auto .stat-icon    { background: rgba(245,158,11,.15); color: #f59e0b; animation: autoPulse 2.5s ease-in-out infinite; }

        /* ============== FILTROS ============== */
        .filtros {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 24px;
          padding: 14px;
          background: rgba(30,41,59,.65);
          border: 1px solid rgba(0,242,254,.15);
          border-radius: 16px;
          backdrop-filter: blur(12px);
          animation: fadeInUp .5s ease .1s backwards;
        }
        .input-wrap { position: relative; flex: 1; min-width: 220px; }
        .search-icon {
          position: absolute;
          left: 14px; top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          pointer-events: none;
          transition: color .2s;
        }
        .input-wrap:focus-within .search-icon { color: #10b981; }
        .input-wrap input {
          width: 100%;
          padding: 12px 40px 12px 42px;
          border-radius: 12px;
          border: 1px solid rgba(148,163,184,.2);
          background: #0f172a;
          color: #e2e8f0;
          outline: none;
          font-size: 14px;
          font-family: inherit;
          transition: border-color .2s, box-shadow .2s;
        }
        .input-wrap input:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16,185,129,.15);
        }
        .input-wrap input::placeholder { color: #64748b; }
        .clear-input {
          position: absolute;
          right: 10px; top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          transition: color .2s, background .2s;
        }
        .clear-input:hover { color: #ef4444; background: rgba(239,68,68,.1); }

        .custom-select { position: relative; flex: 0 0 auto; min-width: 200px; }
        .select-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid rgba(148,163,184,.2);
          background: #0f172a;
          color: #e2e8f0;
          font-size: 14px;
          cursor: pointer;
          transition: border-color .2s, box-shadow .2s;
          font-family: inherit;
        }
        .select-trigger:hover,
        .custom-select.open .select-trigger { border-color: #10b981; }
        .custom-select.open .select-trigger { box-shadow: 0 0 0 3px rgba(16,185,129,.15); }
        .select-label { display: flex; align-items: center; gap: 8px; }
        .filter-icon { color: #10b981; }
        .chevron {
          color: #94a3b8;
          transition: transform .3s ease, color .2s;
        }
        .custom-select.open .chevron { transform: rotate(180deg); color: #10b981; }

        .select-options {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          width: 100%;
          background: #1e293b;
          border: 1px solid rgba(0,242,254,.2);
          border-radius: 14px;
          box-shadow: 0 10px 40px rgba(0,0,0,.6);
          padding: 6px;
          z-index: 100;
          animation: fadeInUp .2s ease;
          backdrop-filter: blur(8px);
        }
        .option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 14px;
          color: #94a3b8;
          cursor: pointer;
          transition: all .15s ease;
        }
        .option:hover {
          background: rgba(16,185,129,.1);
          color: #10b981;
          padding-left: 18px;
        }
        .option.selected {
          background: #10b981;
          color: #fff;
          font-weight: 600;
        }
        .check-icon { margin-left: auto; font-size: 12px; }

        .btn-limpiar {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid rgba(148,163,184,.2);
          background: rgba(30,41,59,.5);
          color: #94a3b8;
          font-size: 13px;
          cursor: pointer;
          font-family: inherit;
          transition: all .2s;
          animation: fadeIn .3s ease;
        }
        .btn-limpiar:hover {
          background: rgba(239,68,68,.1);
          color: #ef4444;
          border-color: rgba(239,68,68,.3);
          transform: translateY(-1px);
        }

        .btn-refresh {
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid rgba(148,163,184,.2);
          background: rgba(30,41,59,.5);
          color: #94a3b8;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all .2s;
        }
        .btn-refresh:hover:not(:disabled) {
          border-color: rgba(0,242,254,.4);
          color: #00f2fe;
          transform: rotate(45deg);
        }
        .btn-refresh:disabled { opacity: .6; cursor: not-allowed; }

        /* ============== LOADER ============== */
        .loader-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 80px 20px;
          color: #94a3b8;
          animation: fadeIn .3s ease;
        }
        .loader-ring {
          width: 90px; height: 90px;
          border-radius: 50%;
          border: 2px dashed rgba(16,185,129,.3);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: ringRotate 4s linear infinite;
        }
        .spin { animation: spin 1s linear infinite; }

        /* ============== EMPTY ============== */
        .empty-state {
          text-align: center;
          padding: 70px 20px;
          color: #94a3b8;
          animation: fadeInUp .5s ease;
          background: rgba(30,41,59,.5);
          border: 1px dashed rgba(0,242,254,.2);
          border-radius: 18px;
          backdrop-filter: blur(8px);
        }
        .empty-icon {
          width: 90px; height: 90px;
          margin: 0 auto 20px;
          background: rgba(16,185,129,.1);
          border: 2px dashed rgba(16,185,129,.4);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 38px;
          color: #10b981;
          animation: pulse 3s ease-in-out infinite;
        }
        .empty-state h3 {
          color: #e2e8f0;
          font-size: 20px;
          margin: 0 0 8px;
        }
        .empty-state p { margin: 0 0 24px; font-size: 14px; }
        .btn-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 22px;
          background: linear-gradient(135deg, #00f2fe, #4facfe);
          color: #0f172a;
          border: none;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: opacity .2s, transform .15s, box-shadow .2s;
          font-family: inherit;
        }
        .btn-cta:hover {
          opacity: .95;
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0,242,254,.35);
        }

        /* ============== GRID ============== */
        .hist-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        /* ============== CARD ============== */
        .hist-card {
          background: rgba(30,41,59,.85);
          border: 1px solid rgba(148,163,184,.15);
          border-radius: 18px;
          padding: 20px 20px 20px 24px;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 28px rgba(0,0,0,.35);
          animation: fadeInUp .55s cubic-bezier(0.16,1,0.3,1) backwards;
          transition: transform .3s ease, box-shadow .3s ease, border-color .3s;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .hist-card:hover {
          transform: translateY(-5px);
          border-color: rgba(0,242,254,.35);
          box-shadow: 0 18px 40px rgba(0,0,0,.5);
        }

        .accent-line {
          position: absolute;
          top: 0; left: 0;
          width: 4px;
          height: 100%;
          transform-origin: top;
          animation: accentGrow .6s cubic-bezier(0.16,1,0.3,1) .15s both;
        }
        .hist-card.finalizada .accent-line {
          background: linear-gradient(180deg, #10b981, #059669);
          box-shadow: 0 0 12px rgba(16,185,129,.6);
        }
        .hist-card.cancelada .accent-line {
          background: linear-gradient(180deg, #ef4444, #b91c1c);
          box-shadow: 0 0 12px rgba(239,68,68,.6);
        }
        .hist-card.otra .accent-line {
          background: linear-gradient(180deg, #64748b, #475569);
        }

        .card-shine {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,.06) 50%, transparent 70%);
          transform: translateX(-100%) skewX(-20deg);
        }
        .hist-card:hover .card-shine {
          animation: shine .8s ease;
        }

        .card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .card-top h3 {
          color: #e2e8f0;
          font-size: 16px;
          font-weight: 600;
          margin: 0;
          line-height: 1.3;
          flex: 1;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .title-mini { color: #00f2fe; font-size: 14px; margin-top: 3px; flex-shrink: 0; }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .5px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .badge.finalizada {
          background: rgba(16,185,129,.15);
          color: #10b981;
          border: 1px solid rgba(16,185,129,.4);
          animation: badgePulse 2.5s ease-in-out infinite;
        }
        .badge.cancelada {
          background: rgba(239,68,68,.12);
          color: #ef4444;
          border: 1px solid rgba(239,68,68,.35);
        }
        .badge.otra {
          background: rgba(100,116,139,.15);
          color: #94a3b8;
          border: 1px solid rgba(100,116,139,.35);
        }

        .auto-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          background: rgba(245,158,11,.12);
          border: 1px solid rgba(245,158,11,.4);
          border-radius: 999px;
          font-size: 11px;
          color: #f59e0b;
          font-weight: 600;
          align-self: flex-start;
          animation: fadeIn .4s ease .3s both, autoPulse 2.5s ease-in-out infinite;
        }

        .cajon-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: rgba(15,23,42,.9);
          border: 1px solid rgba(0,242,254,.15);
          border-radius: 12px;
          transition: border-color .2s, background .2s;
          position: relative;
          overflow: hidden;
        }
        .hist-card:hover .cajon-box {
          border-color: rgba(0,242,254,.35);
          background: rgba(15,23,42,1);
        }
        .cajon-icon {
          color: #00f2fe;
          font-size: 22px;
          flex-shrink: 0;
          animation: float 4s ease-in-out infinite;
        }
        .cajon-box span {
          display: block;
          color: #64748b;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .5px;
        }
        .cajon-box p {
          margin: 2px 0 0;
          color: #00f2fe;
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.3px;
        }
        .cajon-decoration {
          margin-left: auto;
          color: rgba(0,242,254,.15);
          font-size: 28px;
          transition: color .3s, transform .3s;
        }
        .hist-card:hover .cajon-decoration {
          color: rgba(0,242,254,.35);
          transform: scale(1.15) rotate(-6deg);
        }

        .detalle-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .detalle {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: rgba(15,23,42,.6);
          border: 1px solid rgba(148,163,184,.1);
          border-radius: 8px;
          font-size: 12px;
          color: #94a3b8;
          transition: border-color .2s, transform .15s;
        }
        .detalle:hover {
          border-color: rgba(0,242,254,.3);
          transform: translateY(-1px);
        }
        .detalle svg {
          color: #10b981;
          font-size: 14px;
          flex-shrink: 0;
        }
        .detalle .placa {
          color: #00f2fe;
          font-weight: 600;
          letter-spacing: .5px;
        }

        .vehiculo-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(0,242,254,.04);
          border: 1px dashed rgba(0,242,254,.2);
          border-radius: 8px;
          font-size: 13px;
          color: #94a3b8;
        }
        .vehiculo-info svg { color: #00f2fe; }
        .star-deco {
          margin-left: auto;
          color: #f59e0b;
          font-size: 11px;
          animation: starTwinkle 2s ease-in-out infinite;
        }

        .card-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          font-size: 11px;
          margin-top: auto;
          padding-top: 8px;
          border-top: 1px dashed rgba(148,163,184,.15);
        }
        .card-footer svg { color: #64748b; }

        /* ============== RESPONSIVE ============== */
        @media (max-width: 700px) {
          .hist-header h2 { font-size: 22px; }
          .filtros { flex-direction: column; align-items: stretch; }
          .custom-select { width: 100%; }
          .btn-limpiar, .btn-refresh { justify-content: center; }
          .hist-grid { grid-template-columns: 1fr; }
          .detalle-grid { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}