import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config.js";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  FaTimes, FaCar, FaParking, FaCalendarAlt, FaClock, FaMoneyBillWave,
  FaMapMarkedAlt, FaRoute, FaLocationArrow, FaSpinner,
  FaCheckCircle, FaBuilding, FaCrosshairs, FaInfoCircle,
  FaDirections, FaFlagCheckered, FaExclamationTriangle,
} from "react-icons/fa";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ============ MARCADORES ============ */
const userIcon = L.divIcon({
  className: "dr-user-wrap",
  html: `<div class="dr-user">
    <span class="dr-user-halo"></span>
    <span class="dr-user-halo dr-user-halo-2"></span>
    <span class="dr-user-dot"><svg viewBox="0 0 24 24" width="12" height="12" fill="white"><circle cx="12" cy="12" r="6"/></svg></span>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const destIcon = L.divIcon({
  className: "dr-dest-wrap",
  html: `<div class="dr-dest">
    <span class="dr-dest-ripple"></span>
    <span class="dr-dest-ripple dr-dest-ripple-2"></span>
    <span class="dr-dest-ripple dr-dest-ripple-3"></span>
    <span class="dr-dest-pin">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>
    </span>
  </div>`,
  iconSize: [46, 46],
  iconAnchor: [23, 23],
});

/* ============ ESTILOS GLOBALES ============ */
const STYLE_ID = "detalle-reserva-styles";
function inyectarEstilos() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    /* Overlay + modal */
    .dr-overlay {
      position: fixed; inset: 0;
      background: rgba(15,23,42,0);
      backdrop-filter: blur(0px);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999; padding: 20px;
      transition: background .4s ease, backdrop-filter .4s ease;
    }
    .dr-overlay--show { background: rgba(15,23,42,.72); backdrop-filter: blur(12px); }
    .dr-modal {
      width: min(1000px, 100%); height: min(760px, 100%);
      background: #1e293b;
      border-radius: 22px; overflow: hidden;
      display: flex; flex-direction: column;
      box-shadow: 0 30px 90px rgba(0,0,0,.6), 0 0 0 1px rgba(0,242,254,.1);
      opacity: 0;
      transform: scale(.85) rotateX(-8deg) translateY(30px);
      transition: all .55s cubic-bezier(.34,1.56,.64,1);
    }
    .dr-modal--show { opacity: 1; transform: scale(1) rotateX(0) translateY(0); }

    /* Header */
    .dr-header {
      padding: 20px 24px; display: flex; align-items: center; gap: 14px;
      border-bottom: 1px solid rgba(0,242,254,.15);
      background: linear-gradient(135deg, rgba(0,242,254,.1), rgba(139,92,246,.1));
      position: relative; overflow: hidden; flex-shrink: 0;
    }
    .dr-header::before {
      content: ''; position: absolute; top: -50%; left: -50%;
      width: 200%; height: 200%;
      background: radial-gradient(circle, rgba(0,242,254,.25), transparent 55%);
      animation: drHeaderPulse 4s ease-in-out infinite;
      pointer-events: none;
    }
    @keyframes drHeaderPulse {
      0%,100% { transform: scale(1); opacity: .4; }
      50%     { transform: scale(1.4); opacity: .85; }
    }
    .dr-header-icon {
      width: 46px; height: 46px; border-radius: 13px;
      background: linear-gradient(135deg,#00f2fe,#4facfe);
      color: #0f172a;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
      box-shadow: 0 8px 22px rgba(0,242,254,.5);
      animation: drFloat 3s ease-in-out infinite;
      position: relative; z-index: 1;
    }
    @keyframes drFloat {
      0%,100% { transform: translateY(0) rotate(0); }
      50%     { transform: translateY(-4px) rotate(6deg); }
    }
    .dr-header-text { flex: 1; position: relative; z-index: 1; }
    .dr-header-text h3 { margin: 0; font-size: 1.1rem; color: #e2e8f0; letter-spacing: -0.3px; }
    .dr-header-text p { margin: 2px 0 0; font-size: .82rem; color: #94a3b8; }
    .dr-close {
      background: rgba(15,23,42,.6);
      border: 1px solid #334155; color: #94a3b8;
      width: 36px; height: 36px; border-radius: 50%; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all .3s; position: relative; z-index: 1;
    }
    .dr-close:hover {
      color: #ef4444; border-color: rgba(239,68,68,.5);
      transform: rotate(90deg) scale(1.1);
      background: rgba(239,68,68,.1);
    }

    /* Body */
    .dr-body {
      flex: 1; overflow-y: auto; padding: 22px 24px;
      display: flex; flex-direction: column; gap: 18px;
    }
    .dr-body::-webkit-scrollbar { width: 8px; }
    .dr-body::-webkit-scrollbar-track { background: transparent; }
    .dr-body::-webkit-scrollbar-thumb { background: rgba(0,242,254,.25); border-radius: 4px; }

    /* Sección título */
    .dr-section-title {
      display: flex; align-items: center; gap: 8px;
      color: #00f2fe; font-size: 12px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .8px;
      padding-bottom: 6px; border-bottom: 1px solid rgba(0,242,254,.15);
      animation: drFadeUp .4s ease;
    }

    /* Grid de info */
    .dr-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }
    .dr-info-card {
      background: rgba(15,23,42,.7);
      border: 1px solid rgba(148,163,184,.12);
      border-radius: 12px;
      padding: 14px;
      display: flex; align-items: center; gap: 12px;
      animation: drPopIn .5s cubic-bezier(.34,1.56,.64,1) backwards;
      transition: transform .25s, border-color .25s;
    }
    .dr-info-card:hover {
      transform: translateY(-2px);
      border-color: rgba(0,242,254,.3);
    }
    .dr-info-card:nth-child(1) { animation-delay: .05s; }
    .dr-info-card:nth-child(2) { animation-delay: .10s; }
    .dr-info-card:nth-child(3) { animation-delay: .15s; }
    .dr-info-card:nth-child(4) { animation-delay: .20s; }
    .dr-info-card:nth-child(5) { animation-delay: .25s; }
    .dr-info-card:nth-child(6) { animation-delay: .30s; }
    @keyframes drPopIn {
      0%   { opacity: 0; transform: scale(.9) translateY(8px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes drFadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .dr-info-icon {
      width: 40px; height: 40px; border-radius: 11px;
      background: rgba(0,242,254,.12); color: #00f2fe;
      display: flex; align-items: center; justify-content: center;
      font-size: 17px; flex-shrink: 0;
    }
    .dr-info-card--money .dr-info-icon {
      background: rgba(16,185,129,.15); color: #10b981;
    }
    .dr-info-content { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .dr-info-content span {
      color: #64748b; font-size: 10px;
      text-transform: uppercase; letter-spacing: .5px; font-weight: 600;
    }
    .dr-info-content p {
      color: #e2e8f0; font-size: 13px; font-weight: 600; margin: 0;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    /* Mapa */
    .dr-map-section {
      position: relative;
      border-radius: 16px; overflow: hidden;
      border: 1px solid rgba(0,242,254,.2);
      box-shadow: 0 10px 30px rgba(0,0,0,.4), inset 0 0 60px rgba(0,242,254,.03);
      animation: drFadeUp .5s ease .3s backwards;
      background: #0f172a;
    }
    .dr-map {
      height: 420px; width: 100%;
      animation: drMapReveal .8s ease both;
    }
    @keyframes drMapReveal {
      from { opacity: 0; filter: blur(6px) saturate(.5); }
      to   { opacity: 1; filter: blur(0) saturate(1); }
    }
    .dr-map .leaflet-container {
      width: 100%; height: 100%;
      background: #0f172a;
      font-family: 'Outfit', sans-serif;
    }
    .dr-map .leaflet-tile-pane {
      filter: brightness(1.05) saturate(.85) contrast(1.05);
    }

    /* Panel de stats flotante */
    .dr-stats {
      position: absolute; top: 14px; left: 14px; right: 14px;
      display: flex; gap: 10px; flex-wrap: wrap;
      z-index: 500; pointer-events: none;
    }
    .dr-stat {
      background: rgba(15,23,42,.92);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(0,242,254,.3);
      border-radius: 12px;
      padding: 10px 14px;
      display: flex; align-items: center; gap: 10px;
      box-shadow: 0 8px 25px rgba(0,0,0,.4);
      animation: drStatPop .5s cubic-bezier(.34,1.56,.64,1) backwards;
      pointer-events: auto;
    }
    .dr-stat:nth-child(1) { animation-delay: .4s; }
    .dr-stat:nth-child(2) { animation-delay: .5s; }
    .dr-stat:nth-child(3) { animation-delay: .6s; }
    @keyframes drStatPop {
      0%   { opacity: 0; transform: translateY(-10px) scale(.85); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    .dr-stat-icon {
      width: 32px; height: 32px; border-radius: 9px;
      background: linear-gradient(135deg,#00f2fe,#4facfe);
      color: #0f172a; display: flex; align-items: center; justify-content: center;
      font-size: 14px;
      animation: drIconBreathe 2.5s ease-in-out infinite;
    }
    @keyframes drIconBreathe {
      0%,100% { transform: scale(1); }
      50%     { transform: scale(1.08); }
    }
    .dr-stat-val { display: flex; flex-direction: column; gap: 1px; }
    .dr-stat-val small {
      color: #64748b; font-size: 9.5px;
      text-transform: uppercase; letter-spacing: .5px; font-weight: 600;
    }
    .dr-stat-val strong {
      color: #e2e8f0; font-size: 14px; font-weight: 800;
      font-family: ui-monospace, "SF Mono", monospace;
      letter-spacing: -0.3px;
    }

    /* Botón Google Maps */
    .dr-gmaps-btn {
      position: absolute; bottom: 14px; right: 14px;
      background: linear-gradient(135deg,#00f2fe,#4facfe);
      color: #0f172a;
      border: none; border-radius: 11px;
      padding: 10px 16px;
      font-size: 13px; font-weight: 800; cursor: pointer;
      display: inline-flex; align-items: center; gap: 8px;
      box-shadow: 0 8px 22px rgba(0,242,254,.5);
      transition: all .3s cubic-bezier(.34,1.56,.64,1);
      font-family: inherit;
      z-index: 500;
      animation: drBtnIn .6s ease .8s backwards;
    }
    @keyframes drBtnIn {
      from { opacity: 0; transform: translateY(10px) scale(.9); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .dr-gmaps-btn:hover {
      transform: translateY(-2px) scale(1.03);
      box-shadow: 0 12px 30px rgba(0,242,254,.65);
    }

    /* Loading state con pasos */
    .dr-loading {
      height: 420px; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 20px;
      background: linear-gradient(135deg,#0f172a,#1e293b);
      border-radius: 16px;
      animation: drFadeUp .4s ease;
    }
    .dr-loader {
      position: relative; width: 70px; height: 70px;
    }
    .dr-loader-ring {
      position: absolute; inset: 0;
      border: 3px solid transparent;
      border-top-color: #00f2fe;
      border-radius: 50%;
      animation: drSpin 1.2s linear infinite;
    }
    .dr-loader-ring:nth-child(2) {
      inset: 8px; border-top-color: #4facfe;
      animation-duration: .9s; animation-direction: reverse;
    }
    .dr-loader-ring:nth-child(3) {
      inset: 16px; border-top-color: #8b5cf6;
      animation-duration: .7s;
    }
    @keyframes drSpin { to { transform: rotate(360deg); } }

    .dr-steps { display: flex; flex-direction: column; gap: 8px; width: min(340px, 100%); }
    .dr-step {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px;
      background: rgba(30,41,59,.7);
      border: 1px solid rgba(148,163,184,.15);
      border-radius: 10px;
      font-size: 13px; color: #94a3b8;
      transition: all .3s;
    }
    .dr-step--active {
      border-color: rgba(0,242,254,.4);
      color: #e2e8f0;
      background: rgba(0,242,254,.08);
      animation: drStepPulse 1.4s ease-in-out infinite;
    }
    @keyframes drStepPulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(0,242,254,.2); }
      50%     { box-shadow: 0 0 0 6px rgba(0,242,254,0); }
    }
    .dr-step--done { color: #10b981; border-color: rgba(16,185,129,.35); }
    .dr-step-icon {
      width: 22px; height: 22px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; flex-shrink: 0;
      background: rgba(148,163,184,.15);
    }
    .dr-step--active .dr-step-icon {
      background: rgba(0,242,254,.25); color: #00f2fe;
    }
    .dr-step--done .dr-step-icon {
      background: rgba(16,185,129,.25); color: #10b981;
      animation: drCheckPop .4s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes drCheckPop {
      0%   { transform: scale(0); }
      100% { transform: scale(1); }
    }

    /* Error */
    .dr-error {
      padding: 20px; display: flex; flex-direction: column;
      align-items: center; gap: 14px;
      background: rgba(239,68,68,.1);
      border: 1px solid rgba(239,68,68,.3);
      border-radius: 16px;
      color: #fca5a5; text-align: center;
      animation: drShake .5s ease;
    }
    @keyframes drShake {
      0%,100% { transform: translateX(0); }
      20%,60% { transform: translateX(-8px); }
      40%,80% { transform: translateX(8px); }
    }
    .dr-error-icon {
      width: 52px; height: 52px; border-radius: 50%;
      background: rgba(239,68,68,.2); color: #ef4444;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px;
      animation: drErrorPulse 2s ease-in-out infinite;
    }
    @keyframes drErrorPulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,.4); }
      50%     { box-shadow: 0 0 0 12px rgba(239,68,68,0); }
    }
    .dr-error h4 { margin: 0; color: #fca5a5; font-size: 16px; }
    .dr-error p { margin: 0; font-size: 13px; max-width: 380px; }
    .dr-error button {
      background: linear-gradient(135deg,#00f2fe,#4facfe);
      color: #0f172a; border: none; border-radius: 10px;
      padding: 10px 18px; font-size: 13px; font-weight: 700;
      cursor: pointer; font-family: inherit;
      display: inline-flex; align-items: center; gap: 8px;
      transition: transform .2s;
    }
    .dr-error button:hover { transform: translateY(-2px); }

    /* Aviso de geolocalización denegada */
    .dr-warn {
      padding: 10px 14px; border-radius: 10px;
      background: rgba(245,158,11,.1);
      border: 1px solid rgba(245,158,11,.3);
      color: #fbbf24; font-size: 12px;
      display: flex; align-items: center; gap: 8px;
      animation: drFadeUp .4s ease;
    }

    /* Marcadores */
    .dr-user-wrap, .dr-dest-wrap { background: transparent !important; border: none !important; }
    .dr-user {
      position: relative; width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
    }
    .dr-user-halo {
      position: absolute; inset: 0; border-radius: 50%;
      background: #4facfe; opacity: .35;
      animation: drHalo 2s ease-out infinite;
    }
    .dr-user-halo-2 { animation-delay: 1s; }
    @keyframes drHalo {
      0%   { transform: scale(.5); opacity: .8; }
      100% { transform: scale(2.8); opacity: 0; }
    }
    .dr-user-dot {
      width: 18px; height: 18px; border-radius: 50%;
      background: linear-gradient(135deg,#4facfe,#00f2fe);
      border: 3px solid #fff;
      box-shadow: 0 4px 12px rgba(79,172,254,.7);
      z-index: 2;
      display: flex; align-items: center; justify-content: center;
      animation: drUserDrop .5s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes drUserDrop {
      0%   { transform: translateY(-20px) scale(.3); opacity: 0; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }

    .dr-dest {
      position: relative; width: 46px; height: 46px;
      display: flex; align-items: center; justify-content: center;
    }
    .dr-dest-pin {
      width: 30px; height: 30px;
      border-radius: 50% 50% 50% 0;
      background: linear-gradient(135deg,#ef4444,#dc2626);
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 6px 18px rgba(239,68,68,.6), 0 0 0 3px #fff;
      z-index: 3;
      animation: drDestDrop .6s cubic-bezier(.34,1.56,.64,1);
    }
    .dr-dest-pin svg { transform: rotate(45deg); }
    @keyframes drDestDrop {
      0%   { transform: rotate(-45deg) translateY(-50px) scale(.3); opacity: 0; }
      60%  { transform: rotate(-45deg) translateY(6px) scale(1.15); opacity: 1; }
      100% { transform: rotate(-45deg) translateY(0) scale(1); }
    }
    .dr-dest-ripple {
      position: absolute; inset: 8px; border-radius: 50%;
      border: 2px solid #ef4444;
      animation: drDestRipple 2.4s ease-out infinite;
      z-index: 1;
    }
    .dr-dest-ripple-2 { animation-delay: .8s; }
    .dr-dest-ripple-3 { animation-delay: 1.6s; }
    @keyframes drDestRipple {
      0%   { transform: scale(.4); opacity: .85; }
      100% { transform: scale(3); opacity: 0; }
    }

    /* Polyline animada */
    .dr-route-line path {
      stroke-dasharray: 10000;
      stroke-dashoffset: 10000;
      animation: drRouteDraw 2.2s ease-out forwards;
      filter: drop-shadow(0 0 6px rgba(0,242,254,.7));
    }
    @keyframes drRouteDraw {
      to { stroke-dashoffset: 0; }
    }

    /* Popups del mapa */
    .leaflet-popup-content-wrapper {
      background: #1e293b !important; color: #e2e8f0 !important;
      border-radius: 12px !important;
      border: 1px solid rgba(0,242,254,.3) !important;
      box-shadow: 0 12px 35px rgba(0,0,0,.6) !important;
    }
    .leaflet-popup-tip { background: #1e293b !important; }
    .leaflet-popup-content {
      margin: 10px 14px !important;
      font-family: 'Outfit', sans-serif !important;
      font-size: 12px;
    }

    @media (max-width: 640px) {
      .dr-modal { height: 100%; border-radius: 0; }
      .dr-map { height: 340px; }
      .dr-stats { flex-direction: column; align-items: flex-start; }
      .dr-info-grid { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(s);
}

/* ============ HELPERS DEL MAPA ============ */
function MapFit({ coords, trigger }) {
  const map = useMap();
  useEffect(() => {
    if (!coords || coords.length === 0) return;
    const t = setTimeout(() => {
      if (coords.length === 1) {
        map.flyTo(coords[0], 16, { duration: 1.8 });
      } else {
        map.flyToBounds(L.latLngBounds(coords), {
          padding: [80, 80], maxZoom: 16, duration: 1.8,
        });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [coords, trigger, map]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const fix = () => map.invalidateSize();
    const t1 = setTimeout(fix, 120);
    const t2 = setTimeout(fix, 500);
    const t3 = setTimeout(fix, 1200);
    const onResize = () => fix();
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      window.removeEventListener("resize", onResize);
    };
  }, [map]);
  return null;
}

/* ============ UTILS ============ */
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Tu navegador no soporta geolocalización"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === 1) reject(new Error("Permiso de ubicación denegado"));
        else if (err.code === 2) reject(new Error("Ubicación no disponible"));
        else reject(new Error("No se pudo obtener tu ubicación (timeout)"));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  });
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function getRoute(from, to) {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Fallo OSRM");
    const data = await res.json();
    if (!data.routes || !data.routes.length) throw new Error("Sin ruta");
    return { ...data.routes[0], isFallback: false };
  } catch (e) {
    // Fallback: línea recta
    const km = haversineKm(from, to);
    return {
      distance: km * 1000,
      duration: (km / 40) * 3600,
      geometry: { coordinates: [[from.lng, from.lat], [to.lng, to.lat]] },
      legs: [{ steps: [] }],
      isFallback: true,
    };
  }
}

const formatDist = (m) =>
  m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
const formatDur = (s) => {
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
};

/* ============ COMPONENTE PRINCIPAL ============ */
export default function DetalleReserva({ reserva, estacionamiento: estProp, onClose }) {
  const [visible, setVisible] = useState(false);
  const [mapoListo, setMapoListo] = useState(false);
  const [estacionamiento, setEstacionamiento] = useState(estProp || null);
  const [userPos, setUserPos] = useState(null);
  const [route, setRoute] = useState(null);
  const [error, setError] = useState(null);
  const [warnGeo, setWarnGeo] = useState(null);
  const [paso, setPaso] = useState(0); // 0=ubic, 1=est, 2=ruta, 3=listo
  const [refitTrigger, setRefitTrigger] = useState(0);

  useEffect(() => {
    inyectarEstilos();
    const raf = requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => setMapoListo(true), 550);
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    let cancel = false;
    const init = async () => {
      try {
        // Paso 0: ubicación del usuario
        setPaso(0);
        let pos = null;
        try {
          pos = await getUserLocation();
        } catch (geoErr) {
          if (cancel) return;
          setWarnGeo(geoErr.message);
        }
        if (cancel) return;
        setUserPos(pos);

        // Paso 1: estacionamiento
        setPaso(1);
        let est = estProp;
        if (!est) {
          const snap = await getDocs(collection(db, "estacionamientos"));
          est = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .find((e) => e.nombre === reserva.estacionamiento);
        }
        if (!est) throw new Error("No se encontró el estacionamiento");
        if (!Number.isFinite(est.lat) || !Number.isFinite(est.lng)) {
          throw new Error("El estacionamiento no tiene coordenadas registradas");
        }
        if (cancel) return;
        setEstacionamiento(est);

        // Paso 2: ruta (solo si hay ubicación del usuario)
        setPaso(2);
        if (pos) {
          const ruta = await getRoute(pos, { lat: est.lat, lng: est.lng });
          if (cancel) return;
          setRoute(ruta);
        }

        if (cancel) return;
        setPaso(3);
      } catch (e) {
        if (cancel) return;
        setError(e.message);
      }
    };
    init();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const abrirGoogleMaps = () => {
    if (!estacionamiento) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${estacionamiento.lat},${estacionamiento.lng}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const routeCoords = route
    ? route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
    : [];
  const boundsCoords = [
    ...(userPos ? [[userPos.lat, userPos.lng]] : []),
    ...(estacionamiento ? [[estacionamiento.lat, estacionamiento.lng]] : []),
    ...routeCoords,
  ];

  const loading = paso < 3 && !error;
  const pasos = [
    { label: "Obteniendo tu ubicación", icon: <FaLocationArrow /> },
    { label: "Localizando el estacionamiento", icon: <FaBuilding /> },
    { label: "Calculando ruta óptima", icon: <FaRoute /> },
  ];

  const contenido = (
    <div
      className={`dr-overlay ${visible ? "dr-overlay--show" : ""}`}
      onClick={handleOverlayClick}
    >
      <div className={`dr-modal ${visible ? "dr-modal--show" : ""}`}>
        <header className="dr-header">
          <div className="dr-header-icon"><FaMapMarkedAlt /></div>
          <div className="dr-header-text">
            <h3>Detalle de reserva</h3>
            <p>Cómo llegar a {reserva.estacionamiento}</p>
          </div>
          <button className="dr-close" onClick={onClose} aria-label="Cerrar">
            <FaTimes />
          </button>
        </header>

        <div className="dr-body">
          {warnGeo && (
            <div className="dr-warn">
              <FaInfoCircle /> {warnGeo} · Puedes usar Google Maps para navegar.
            </div>
          )}

          {/* Info de la reserva */}
          <div className="dr-section-title">
            <FaInfoCircle /> Información de la reserva
          </div>

          <div className="dr-info-grid">
            <div className="dr-info-card">
              <div className="dr-info-icon"><FaBuilding /></div>
              <div className="dr-info-content">
                <span>Estacionamiento</span>
                <p>{reserva.estacionamiento || "—"}</p>
              </div>
            </div>
            <div className="dr-info-card">
              <div className="dr-info-icon"><FaParking /></div>
              <div className="dr-info-content">
                <span>Cajón</span>
                <p>{reserva.espacio || "—"}</p>
              </div>
            </div>
            <div className="dr-info-card">
              <div className="dr-info-icon"><FaCalendarAlt /></div>
              <div className="dr-info-content">
                <span>Fecha</span>
                <p>{reserva.fecha || "—"}</p>
              </div>
            </div>
            <div className="dr-info-card">
              <div className="dr-info-icon"><FaClock /></div>
              <div className="dr-info-content">
                <span>Horario</span>
                <p>{reserva.horario || "—"}</p>
              </div>
            </div>
            <div className="dr-info-card">
              <div className="dr-info-icon"><FaCar /></div>
              <div className="dr-info-content">
                <span>Vehículo</span>
                <p>{reserva.marca} {reserva.modelo} · {reserva.placa}</p>
              </div>
            </div>
            <div className="dr-info-card dr-info-card--money">
              <div className="dr-info-icon"><FaMoneyBillWave /></div>
              <div className="dr-info-content">
                <span>Total</span>
                <p>${reserva.costoTotal ?? "—"} MXN</p>
              </div>
            </div>
          </div>

          {/* Mapa de ruta */}
          <div className="dr-section-title" style={{ marginTop: 4 }}>
            <FaRoute /> Cómo llegar
          </div>

          {error && (
            <div className="dr-error">
              <div className="dr-error-icon"><FaExclamationTriangle /></div>
              <h4>No se pudo calcular la ruta</h4>
              <p>{error}</p>
              <button onClick={abrirGoogleMaps}>
                <FaDirections /> Abrir en Google Maps
              </button>
            </div>
          )}

          {!error && loading && (
            <div className="dr-loading">
              <div className="dr-loader">
                <div className="dr-loader-ring"></div>
                <div className="dr-loader-ring"></div>
                <div className="dr-loader-ring"></div>
              </div>
              <div className="dr-steps">
                {pasos.map((p, i) => (
                  <div
                    key={i}
                    className={`dr-step ${
                      paso === i ? "dr-step--active" : ""
                    } ${paso > i ? "dr-step--done" : ""}`}
                  >
                    <div className="dr-step-icon">
                      {paso > i ? <FaCheckCircle /> : p.icon}
                    </div>
                    <span>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!error && !loading && mapoListo && estacionamiento && (
            <div className="dr-map-section">
              {route && (
                <div className="dr-stats">
                  <div className="dr-stat">
                    <div className="dr-stat-icon"><FaRoute /></div>
                    <div className="dr-stat-val">
                      <small>Distancia</small>
                      <strong>{formatDist(route.distance)}</strong>
                    </div>
                  </div>
                  <div className="dr-stat">
                    <div className="dr-stat-icon"><FaClock /></div>
                    <div className="dr-stat-val">
                      <small>Tiempo</small>
                      <strong>{formatDur(route.duration)}</strong>
                    </div>
                  </div>
                  {route.isFallback && (
                    <div className="dr-stat" style={{ borderColor: "rgba(245,158,11,.5)" }}>
                      <div className="dr-stat-icon" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
                        <FaExclamationTriangle />
                      </div>
                      <div className="dr-stat-val">
                        <small>Aviso</small>
                        <strong style={{ fontSize: 11 }}>Ruta aproximada</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="dr-map">
                <MapContainer
                  center={[estacionamiento.lat, estacionamiento.lng]}
                  zoom={14}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                  />
                  <InvalidateSize />
                  <MapFit coords={boundsCoords} trigger={refitTrigger} />

                  {userPos && (
                    <Marker position={[userPos.lat, userPos.lng]} icon={userIcon} />
                  )}
                  <Marker
                    position={[estacionamiento.lat, estacionamiento.lng]}
                    icon={destIcon}
                  >
                    <div style={{ color: "#00f2fe", fontWeight: 700 }}>
                      {estacionamiento.nombre}
                    </div>
                  </Marker>

                  {routeCoords.length > 1 && (
                    <>
                      {/* Halo de la ruta */}
                      <Polyline
                        positions={routeCoords}
                        pathOptions={{
                          color: "#00f2fe",
                          weight: 10,
                          opacity: 0.15,
                        }}
                      />
                      {/* Línea principal con animación */}
                      <Polyline
                        positions={routeCoords}
                        pathOptions={{
                          color: "#00f2fe",
                          weight: 4,
                          opacity: 1,
                          lineCap: "round",
                          className: "dr-route-line",
                        }}
                      />
                    </>
                  )}
                </MapContainer>
              </div>

              <button
                className="dr-gmaps-btn"
                onClick={abrirGoogleMaps}
                title="Abrir ruta en Google Maps"
              >
                <FaDirections /> Abrir en Google Maps
              </button>

              <button
                className="dr-gmaps-btn"
                style={{ bottom: "auto", top: 76, right: 14, padding: "8px 10px" }}
                onClick={() => setRefitTrigger((n) => n + 1)}
                title="Centrar ruta"
              >
                <FaCrosshairs />
              </button>
            </div>
          )}
        </div>

        <footer
          style={{
            padding: "14px 24px",
            borderTop: "1px solid rgba(0,242,254,.15)",
            display: "flex",
            justifyContent: "flex-end",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 22px",
              borderRadius: 10,
              border: "1px solid rgba(0,242,254,.3)",
              background: "rgba(0,242,254,.1)",
              color: "#00f2fe",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );

  return createPortal(contenido, document.body);
}