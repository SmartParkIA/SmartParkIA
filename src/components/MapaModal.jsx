import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { X, MapPin, Check, Loader2, Crosshair } from "lucide-react";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const pinAnimado = L.divIcon({
  className: "mm-pin-wrapper",
  html: `<div class="mm-pin"><span class="mm-pin-ripple"></span><span class="mm-pin-ripple mm-pin-ripple--2"></span><span class="mm-pin-dot"></span></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

/* ============== ESTILOS GLOBALES INYECTADOS ============== */
const STYLE_ID = "mapa-modal-global-styles";
function inyectarEstilos() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .mm-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0);
      backdrop-filter: blur(0); display:flex; align-items:center; justify-content:center;
      z-index: 1000; padding: 20px;
      transition: background .45s ease, backdrop-filter .45s ease; }
    .mm-overlay--show { background: rgba(15,23,42,.62); backdrop-filter: blur(10px); }

    .mm-modal { width: min(960px,100%); height: min(720px,100%);
      background:#fff; border-radius:20px; overflow:hidden; display:flex; flex-direction:column;
      box-shadow: 0 30px 90px rgba(0,0,0,.45);
      opacity:0; transform: scale(.92) translateY(20px);
      transition: all .5s cubic-bezier(.34,1.56,.64,1); }
    .mm-modal--show { opacity:1; transform: scale(1) translateY(0); }

    .mm-header { padding: 20px 24px; display:flex; align-items:center; gap:14px;
      border-bottom: 1px solid #e5e7eb;
      background: linear-gradient(135deg,#f8fafc 0%,#eef2ff 100%);
      position: relative; overflow: hidden; }
    .mm-header::before { content:''; position:absolute; top:-50%; left:-50%; width:200%; height:200%;
      background: radial-gradient(circle at center, rgba(99,102,241,.18) 0%, transparent 60%);
      animation: mmHeaderPulse 4s ease-in-out infinite; pointer-events:none; }
    @keyframes mmHeaderPulse { 0%,100%{transform:scale(1);opacity:.5;} 50%{transform:scale(1.35);opacity:.85;} }

    .mm-header-icon { width:44px; height:44px; border-radius:12px;
      background: linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
      display:flex; align-items:center; justify-content:center;
      box-shadow: 0 8px 22px rgba(99,102,241,.45);
      animation: mmIconFloat 3s ease-in-out infinite; position:relative; z-index:1; }
    @keyframes mmIconFloat { 0%,100%{transform:translateY(0) rotate(0);} 50%{transform:translateY(-4px) rotate(6deg);} }

    .mm-header-text { flex:1; position:relative; z-index:1; }
    .mm-header-text h3 { margin:0; font-size:1.1rem; color:#111827; }
    .mm-header-text p { margin:2px 0 0; font-size:.85rem; color:#6b7280; }

    .mm-close { background:transparent; border:none; color:#6b7280; cursor:pointer; padding:8px;
      border-radius:10px; display:flex; transition: all .3s ease; position:relative; z-index:1; }
    .mm-close:hover { background:#fee2e2; color:#dc2626; transform: rotate(90deg) scale(1.12); }

    .mm-map-wrapper { flex:1; position:relative; overflow:hidden; background:#eef2f7; min-height: 240px; }

    .mm-map-loading { position:absolute; inset:0; display:flex; flex-direction:column;
      align-items:center; justify-content:center; gap:14px;
      background: linear-gradient(135deg,#f1f5f9,#e0e7ff); color:#6366f1;
      font-size:.9rem; font-weight:600; animation: mmMapFadeIn .4s ease; }
    @keyframes mmMapFadeIn { from{opacity:0;} to{opacity:1;} }

    .mm-map { width:100%; height:100%; animation: mmMapReveal .7s ease both; }
    @keyframes mmMapReveal {
      from { opacity:0; filter: blur(6px) saturate(.5); transform: scale(1.02); }
      to   { opacity:1; filter: blur(0) saturate(1);   transform: scale(1); }
    }
    .mm-map .leaflet-container { width:100%; height:100%; font-family: inherit; background:#eef2f7; }
    .mm-map .leaflet-tile-pane { filter: brightness(1.05) saturate(.85) contrast(1.02); }

    .mm-hint { position:absolute; bottom:16px; left:50%; transform:translateX(-50%);
      background: rgba(17,24,39,.88); color:#fff; padding:8px 16px; border-radius:999px;
      font-size:.82rem; display:flex; align-items:center; gap:8px; backdrop-filter: blur(8px);
      animation: mmHintBounce 2.5s ease-in-out infinite; pointer-events:none; z-index:500; }
    @keyframes mmHintBounce { 0%,100%{transform:translateX(-50%) translateY(0);} 50%{transform:translateX(-50%) translateY(-6px);} }

    .mm-coords { padding:16px 24px; display:flex; align-items:center; gap:12px;
      background:#f8fafc; border-top:1px solid #e5e7eb; font-size:.9rem; transition: all .4s ease; }
    .mm-coords--active { background: linear-gradient(135deg,#ecfdf5,#d1fae5); animation: mmCoordsFlash .7s ease; }
    @keyframes mmCoordsFlash {
      0%{background:linear-gradient(135deg,#ecfdf5,#d1fae5);}
      50%{background:linear-gradient(135deg,#a7f3d0,#6ee7b7);}
      100%{background:linear-gradient(135deg,#ecfdf5,#d1fae5);}
    }
    .mm-coords-icon { color:#6366f1; flex-shrink:0; }
    .mm-coords--active .mm-coords-icon { color:#059669; }
    .mm-coords-text { display:flex; flex-direction:column; gap:2px; }
    .mm-coords-label { font-size:.72rem; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; }
    .mm-coords-value { font-family: ui-monospace, "SF Mono", monospace; font-weight:600; color:#111827; font-size:.95rem; }
    .mm-coords-empty { color:#9ca3af; font-style:italic; }

    .mm-error { padding:12px 24px; background:#fef2f2; color:#dc2626; font-size:.85rem; animation: mmShake .4s ease; }
    @keyframes mmShake { 0%,100%{transform:translateX(0);} 25%{transform:translateX(-6px);} 75%{transform:translateX(6px);} }

    .mm-footer { padding:16px 24px; display:flex; gap:12px; justify-content:flex-end;
      border-top:1px solid #e5e7eb; background:#fff; }
    .mm-btn { padding:10px 20px; border-radius:10px; font-size:.9rem; font-weight:600;
      border:none; cursor:pointer; display:inline-flex; align-items:center; gap:8px;
      transition: all .3s cubic-bezier(.34,1.56,.64,1); position:relative; overflow:hidden; }
    .mm-btn:disabled { opacity:.5; cursor:not-allowed; }
    .mm-btn--ghost { background:#f3f4f6; color:#374151; }
    .mm-btn--ghost:hover:not(:disabled) { background:#e5e7eb; transform: translateY(-2px); }
    .mm-btn--primary { background: linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
      box-shadow: 0 4px 14px rgba(99,102,241,.45); }
    .mm-btn--primary:hover:not(:disabled) { transform: translateY(-2px) scale(1.02);
      box-shadow: 0 10px 26px rgba(99,102,241,.55); }
    .mm-btn--primary::after { content:''; position:absolute; inset:0;
      background: linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);
      transform: translateX(-100%); animation: mmShimmer 2.6s ease infinite; }
    @keyframes mmShimmer { 0%{transform:translateX(-100%);} 100%{transform:translateX(100%);} }

    .mm-spin { animation: mmSpin 1s linear infinite; }
    @keyframes mmSpin { to{transform:rotate(360deg);} }

    .mm-pin-wrapper { background:transparent !important; border:none !important; }
    .mm-pin { position:relative; width:40px; height:40px; display:flex; align-items:center; justify-content:center; }
    .mm-pin-dot { width:20px; height:20px; border-radius:50%;
      background: linear-gradient(135deg,#ef4444,#dc2626); border:3px solid #fff;
      box-shadow: 0 4px 14px rgba(239,68,68,.55); z-index:3;
      animation: mmPinDrop .5s cubic-bezier(.34,1.56,.64,1); }
    @keyframes mmPinDrop {
      0%{transform:translateY(-40px) scale(.3); opacity:0;}
      60%{transform:translateY(4px) scale(1.15); opacity:1;}
      100%{transform:translateY(0) scale(1);}
    }
    .mm-pin-ripple { position:absolute; inset:5px; border-radius:50%;
      border:2px solid #ef4444; animation: mmPinRipple 2s ease-out infinite; z-index:1; }
    .mm-pin-ripple--2 { animation-delay: 1s; }
    @keyframes mmPinRipple { 0%{transform:scale(.5); opacity:.85;} 100%{transform:scale(2.6); opacity:0;} }
  `;
  document.head.appendChild(style);
}

/* ============== AUXILIARES ============== */
function CapturarClick({ onSelect }) {
  useMapEvents({
    click(e) { onSelect({ lat: e.latlng.lat, lng: e.latlng.lng }); },
  });
  return null;
}

function MapSetup({ coordsIniciales }) {
  const map = useMap();
  useEffect(() => {
    const fix = () => map.invalidateSize();
    const t1 = setTimeout(fix, 80);
    const t2 = setTimeout(fix, 300);
    const t3 = setTimeout(() => {
      fix();
      map.flyTo(
        coordsIniciales
          ? [coordsIniciales.lat, coordsIniciales.lng]
          : [19.4326, -99.1332],
        coordsIniciales ? 17 : 13,
        { duration: 1.8, easeLinearity: 0.25 }
      );
    }, 700);

    const onResize = () => fix();
    window.addEventListener("resize", onResize);
    const observer = new ResizeObserver(fix);
    const container = map.getContainer();
    if (container) observer.observe(container);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, [map, coordsIniciales]);
  return null;
}

/* ============== COMPONENTE PRINCIPAL ============== */
export default function MapaModal({ onCerrar, onConfirmar, coordsIniciales }) {
  const [coords, setCoords] = useState(coordsIniciales || null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [visible, setVisible] = useState(false);
  const [mapaListo, setMapaListo] = useState(false);

  useEffect(() => {
    inyectarEstilos();
    const raf = requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => setMapaListo(true), 550);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, []);

  function confirmar() {
    if (!coords) {
      setError("Haz clic en el mapa para elegir una ubicación.");
      return;
    }
    // Pequeño delay para que el shimmer del botón se aprecie
    setGuardando(true);
    setTimeout(() => onConfirmar(coords), 250);
  }

  return (
    <div
      className={`mm-overlay ${visible ? "mm-overlay--show" : ""}`}
      onClick={onCerrar}
    >
      <div
        className={`mm-modal ${visible ? "mm-modal--show" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mm-header">
          <div className="mm-header-icon"><MapPin size={22} /></div>
          <div className="mm-header-text">
            <h3>Selecciona la ubicación</h3>
            <p>Haz clic en el mapa para marcar la sede</p>
          </div>
          <button className="mm-close" onClick={onCerrar} aria-label="Cerrar">
            <X size={20} />
          </button>
        </header>

        <div className="mm-map-wrapper">
          {mapaListo ? (
            <div className="mm-map">
              <MapContainer
                center={[19.4326, -99.1332]}
                zoom={12}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={19}
                />
                <CapturarClick onSelect={setCoords} />
                <MapSetup coordsIniciales={coordsIniciales} />
                {coords && (
                  <Marker position={[coords.lat, coords.lng]} icon={pinAnimado} />
                )}
              </MapContainer>
            </div>
          ) : (
            <div className="mm-map-loading">
              <Loader2 className="mm-spin" size={32} />
              <span>Cargando mapa…</span>
            </div>
          )}

          <div className="mm-hint">
            <Crosshair size={16} />
            <span>Haz clic en cualquier punto del mapa</span>
          </div>
        </div>

        <div className={`mm-coords ${coords ? "mm-coords--active" : ""}`}>
          {coords ? (
            <>
              <MapPin size={16} className="mm-coords-icon" />
              <div className="mm-coords-text">
                <span className="mm-coords-label">Ubicación seleccionada</span>
                <span className="mm-coords-value">
                  {coords.lat.toFixed(6)}° , {coords.lng.toFixed(6)}°
                </span>
              </div>
            </>
          ) : (
            <>
              <Crosshair size={16} className="mm-coords-icon" />
              <span className="mm-coords-empty">
                Aún no has seleccionado un punto
              </span>
            </>
          )}
        </div>

        {error && <div className="mm-error">{error}</div>}

        <footer className="mm-footer">
          <button
            className="mm-btn mm-btn--ghost"
            onClick={onCerrar}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            className="mm-btn mm-btn--primary"
            onClick={confirmar}
            disabled={guardando || !coords}
          >
            {guardando ? (
              <><Loader2 size={16} className="mm-spin" /> Aplicando...</>
            ) : (
              <><Check size={16} /> Confirmar ubicación</>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}