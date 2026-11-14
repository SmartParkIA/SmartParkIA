import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where, getDocs, addDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase/config.js";
import { getVehiculos } from "../services/userService";
import {
  FaCar, FaParking, FaCalendarAlt, FaClock,
  FaCheckCircle, FaTimesCircle, FaSpinner, FaMapMarkedAlt,
  FaLightbulb, FaArrowLeft, FaInfoCircle, FaSave, FaBuilding, FaCamera,
  FaMoneyBillWave, FaRocket, FaBolt, FaStar, FaMagic, FaCheckDouble,
  FaShieldAlt, FaAward, FaChevronRight, FaCalendarCheck,
  FaKey, FaCoins, FaTicketAlt, FaHourglassHalf, FaReceipt,
  FaFire, FaUser, FaMapPin, FaLocationArrow, FaHandHoldingUsd,
  FaStopwatch, FaExclamationTriangle
} from "react-icons/fa";

const MARCAS = ["Nissan", "Chevrolet", "Volkswagen", "Toyota", "Ford", "Honda", "Kia", "Mazda", "Hyundai", "SEAT"];
const PRECIO_HORA = 50;

export default function ReservarEspacio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successFlash, setSuccessFlash] = useState(false);

  const [reservasActivas, setReservasActivas] = useState([]);
  const MAX_RESERVAS = 3;

  const [misVehiculos, setMisVehiculos] = useState([]);
  const [modoVehiculo, setModoVehiculo] = useState("registrado");
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState("");
  const [imagenBase64, setImagenBase64] = useState("");

  const [form, setForm] = useState({
    estacionamiento: "",
    espacio: "",
    fecha: "",
    horario: "",
    duracion: 2,
    marca: "",
    modelo: "",
    placa: "",
  });

  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);

  // 🔥 ESTADOS PARA DISPONIBILIDAD
  const [reservasDelDia, setReservasDelDia] = useState([]);
  const [reservasDelCajon, setReservasDelCajon] = useState([]);
  const [cargandoHoras, setCargandoHoras] = useState(false);

  const totalPagar = Number(form.duracion) * PRECIO_HORA;

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    const cajon = searchParams.get("cajon");
    const est = searchParams.get("estacionamiento");
    const f = searchParams.get("fecha");
    const h = searchParams.get("horario");
    const d = searchParams.get("duracion");

    if (cajon || est || f || h || d) {
      setForm((f) => ({
        ...f,
        ...(cajon ? { espacio: cajon } : {}),
        ...(est ? { estacionamiento: est } : {}),
        ...(f ? { fecha: f } : {}),
        ...(h ? { horario: h } : {}),
        ...(d ? { duracion: d } : {}),
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate("/login", { replace: true });
        return;
      }
      setUser(u);
      await cargarReservas(u.uid);
      const vehiculosGuardados = await getVehiculos(u.uid);
      setMisVehiculos(vehiculosGuardados);
      if (vehiculosGuardados.length === 0) setModoVehiculo("manual");
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const cargarReservas = async (uid) => {
    try {
      const q = query(collection(db, "reservas"), where("uid", "==", uid));
      const snap = await getDocs(q);
      const activas = [];
      snap.forEach((d) => {
        const data = { id: d.id, ...d.data() };
        if ((data.estado || "").toLowerCase() === "activa") {
          activas.push(data);
        }
      });
      setReservasActivas(activas);
    } catch (err) {
      console.error(err);
    }
  };

  // 🔥 SEMÁFORO DE FECHAS
  useEffect(() => {
    const fetchDisponibilidadDia = async () => {
      if (!form.fecha || !form.estacionamiento) return;
      try {
        const q = query(
          collection(db, "reservas"),
          where("estacionamiento", "==", form.estacionamiento),
          where("fecha", "==", form.fecha),
          where("estado", "==", "activa")
        );
        const snap = await getDocs(q);
        const lista = [];
        snap.forEach(d => lista.push(d.data()));
        setReservasDelDia(lista);
      } catch (err) {
        console.error("Error al calcular disponibilidad del día", err);
      }
    };
    fetchDisponibilidadDia();
  }, [form.fecha, form.estacionamiento]);

  // 🔥 BLOQUEO DE HORAS
  useEffect(() => {
    const fetchDisponibilidadCajon = async () => {
      if (!form.fecha || !form.estacionamiento || !form.espacio) {
        setReservasDelCajon([]);
        return;
      }
      setCargandoHoras(true);
      try {
        const q = query(
          collection(db, "reservas"),
          where("estacionamiento", "==", form.estacionamiento),
          where("espacio", "==", form.espacio),
          where("fecha", "==", form.fecha),
          where("estado", "==", "activa")
        );
        const snap = await getDocs(q);
        const lista = [];
        snap.forEach(d => lista.push(d.data()));
        setReservasDelCajon(lista);
      } catch (err) {
        console.error("Error al calcular disponibilidad del cajón", err);
      } finally {
        setCargandoHoras(false);
      }
    };
    fetchDisponibilidadCajon();
  }, [form.fecha, form.estacionamiento, form.espacio]);

  const getSemaforoInfo = () => {
    if (!form.fecha || !form.estacionamiento) return null;
    const capacidadTotal = 50; 
    const ocupados = reservasDelDia.length;
    const porcentajeLibre = ((capacidadTotal - ocupados) / capacidadTotal) * 100;

    if (porcentajeLibre > 50) return { color: "#10b981", bg: "rgba(16,185,129,0.1)", texto: "Alta disponibilidad", icon: <FaCheckCircle /> };
    if (porcentajeLibre > 20) return { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", texto: "Media disponibilidad", icon: <FaInfoCircle /> };
    return { color: "#ef4444", bg: "rgba(239,68,68,0.1)", texto: "Saturado", icon: <FaExclamationTriangle /> };
  };

  const checkHoraBloqueada = (horaStr) => {
    const startSelected = new Date(`${form.fecha}T${horaStr}`);
    const endSelected = new Date(startSelected.getTime() + Number(form.duracion) * 60 * 60 * 1000);

    for (let r of reservasDelCajon) {
      const rStart = new Date(`${r.fecha}T${r.horario}`);
      const rDur = parseInt(r.duracion, 10) || 0;
      const rEnd = new Date(rStart.getTime() + rDur * 60 * 60 * 1000);

      if (startSelected < rEnd && endSelected > rStart) {
        return true;
      }
    }
    return false;
  };

  // 🔥 AHORA MOSTRAMOS LAS 24 HORAS PARA QUE PUEDAS PROBAR LA RESERVA DE LA 01:25
  const horasDisponibles = [];
  for (let i = 0; i <= 23; i++) {
    const horaStr = `${String(i).padStart(2, "0")}:00`;
    horasDisponibles.push({
      hora: horaStr,
      bloqueada: checkHoraBloqueada(horaStr)
    });
  }

  const hoyLocal = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split("T")[0];
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    let newValue = id === "placa" ? value.toUpperCase() : value;
    setForm((f) => ({ ...f, [id]: newValue }));
    setErrors((prev) => ({ ...prev, [id]: "" }));
  };

  const handleSelectHora = (hora) => {
    setForm((f) => ({ ...f, horario: hora }));
    setErrors((prev) => ({ ...prev, horario: "" }));
  };

  const seleccionarVehiculo = (e) => {
    const id = e.target.value;
    setVehiculoSeleccionado(id);
    setErrors((prev) => ({ ...prev, vehiculo: "" }));
    if (id) {
      const auto = misVehiculos.find((v) => v.id === id);
      if (auto) {
        setForm((prev) => ({ ...prev, marca: auto.marca, modelo: auto.modelo, placa: auto.placa }));
        setImagenBase64(auto.imagen || "");
      }
    } else {
      setForm((prev) => ({ ...prev, marca: "", modelo: "", placa: "" }));
      setImagenBase64("");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) return showToast("La imagen es muy grande (máx. 500 KB)", "error");
    const reader = new FileReader();
    reader.onloadend = () => setImagenBase64(reader.result);
    reader.readAsDataURL(file);
  };

  const limpiarFormularioVehiculo = () => {
    setForm((prev) => ({ ...prev, marca: "", modelo: "", placa: "" }));
    setImagenBase64("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (reservasActivas.length >= MAX_RESERVAS) return showToast(`Solo puedes tener hasta ${MAX_RESERVAS} reservas activas.`, "error");
    if (!form.horario) return showToast("Selecciona una hora disponible.", "error");
    
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, "reservas"), {
        uid: user.uid,
        estacionamiento: form.estacionamiento,
        espacio: form.espacio,
        fecha: form.fecha,
        horario: form.horario,
        duracion: `${form.duracion} horas`,
        costoTotal: totalPagar,
        estado: "activa",
        marca: form.marca,
        modelo: form.modelo,
        placa: form.placa,
        imagen: imagenBase64,
        fechaCreacion: new Date().toISOString(),
      });

      setSuccessFlash(true);
      setTimeout(() => {
        navigate("/reservas", { state: { nuevaReserva: { ...form, id: docRef.id } } });
      }, 1500);
    } catch (err) {
      console.error(err);
      showToast("Error al crear la reserva", "error");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="res-page center-state">
        <div className="loading-orbit">
          <div className="loading-orbit-ring"></div>
          <div className="loading-orbit-ring"></div>
          <div className="loading-orbit-ring"></div>
          <FaSpinner className="spin loading-center" size={26} color="#00f2fe" />
        </div>
        <p>Cargando...</p>
      </div>
    );
  }

  const semaforo = getSemaforoInfo();

  return (
    <div className="res-page">
      <div className="bg-deco">
        <div className="bg-blob blob-1"></div>
        <div className="bg-blob blob-2"></div>
        <div className="bg-blob blob-3"></div>
        <div className="bg-grid"></div>
      </div>

      <div className="container">
        <header className="res-header">
          <Link to="/perfil" className="back-link"><FaArrowLeft /> Volver al perfil</Link>
          <h2>
            <span className="title-icon-wrap"><FaRocket className="title-icon" /><span className="title-icon-ring"></span></span>
            Nueva Reserva
          </h2>
          <span className="header-badge"><FaFire /> Rápido y seguro</span>
        </header>

        <div className="reserva-card">
          {/* ================= VISUAL (IZQUIERDA) ================= */}
          <div className="reserva-visual">
            <div className="parking-scene">
              <div className="parking-glow"></div>
              <div className="parking-floor"><span></span><span></span><span></span><span></span></div>
              <div className="parking-spot"></div>
              <div className="parking-sign">P</div>
              <div className="car">
                <div className="car-windshield"></div>
                <div className="car-headlights"></div>
                <div className="car-glow"></div>
                <div className="wheel wheel-tl"></div><div className="wheel wheel-tr"></div>
                <div className="wheel wheel-bl"></div><div className="wheel wheel-br"></div>
              </div>
            </div>

            <div className="tips-box">
              <h4><span className="tip-icon"><FaLightbulb /><span className="tip-icon-ring"></span></span> Proceso de Reserva</h4>
              <ul>
                <li><FaMapMarkedAlt /> Elige un estacionamiento y luego un cajón.</li>
                <li><FaCoins /> Tarifa de <strong>${PRECIO_HORA} MXN por hora</strong>.</li>
                <li><FaShieldAlt /> Hasta {MAX_RESERVAS} reservas activas.</li>
                <li><FaBolt /> Confirmación instantánea con tu QR.</li>
              </ul>
            </div>
          </div>

          {/* ================= FORMULARIO (DERECHA) ================= */}
          <div className="reserva-info">
            <form onSubmit={handleSubmit} noValidate>
              
              <div className="field">
                <label><FaBuilding /> Estacionamiento / Zona</label>
                <div className="input-icon">
                  <FaMapPin className="input-icon-left" />
                  <input id="estacionamiento" type="text" value={form.estacionamiento} onChange={handleChange} placeholder="Selecciona uno desde el mapa" required />
                </div>
              </div>

              <div className="field">
                <label><FaParking /> Cajón seleccionado</label>
                <div className="input-with-action">
                  <div className="input-icon" style={{ flex: 1 }}>
                    <FaKey className="input-icon-left" />
                    <input id="espacio" type="text" value={form.espacio} onChange={handleChange} placeholder="Ej. P1-05" required />
                  </div>
                  <Link to="/estacionamientos" className="btn-mapa"><FaMapMarkedAlt /> Elegir</Link>
                </div>
              </div>

              <div className="row">
                <div className="field">
                  <label><FaCalendarCheck /> Fecha</label>
                  <input id="fecha" type="date" value={form.fecha} onChange={handleChange} min={hoyLocal()} required />
                  {/* SEMÁFORO */}
                  {semaforo && form.fecha && (
                    <div className="semaforo-badge" style={{ background: semaforo.bg, color: semaforo.color, border: `1px solid ${semaforo.color}` }}>
                      {semaforo.icon} {semaforo.texto}
                    </div>
                  )}
                </div>
                <div className="field">
                  <label><FaHourglassHalf /> Duración</label>
                  <input id="duracion" type="number" value={form.duracion} onChange={handleChange} min="1" max="8" required />
                </div>
              </div>

              {/* 🔥 SELECTOR DE HORAS */}
              <div className="field">
                <label><FaStopwatch /> Hora de inicio</label>
                {cargandoHoras ? (
                  <div style={{ color: "#00f2fe", display: "flex", gap: "10px", alignItems: "center", padding: "10px 0" }}><FaSpinner className="spin" /> Calculando disponibilidad...</div>
                ) : (
                  <div className="time-grid">
                    {horasDisponibles.map((h) => (
                      <button
                        key={h.hora}
                        type="button"
                        disabled={h.bloqueada}
                        onClick={() => handleSelectHora(h.hora)}
                        className={`time-btn ${form.horario === h.hora ? "selected" : ""} ${h.bloqueada ? "blocked" : ""}`}
                      >
                        {h.hora}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* COSTO TOTAL */}
              <div className="cost-box" style={{ marginTop: "20px" }}>
                <div className="cost-icon"><FaHandHoldingUsd /><span className="cost-icon-ring"></span></div>
                <div className="cost-content">
                  <span className="cost-label">Costo total a pagar</span>
                  <div className="cost-value">
                    <span className="currency">$</span>
                    <span key={totalPagar} className="amount">{totalPagar}</span>
                    <span className="currency-name">MXN</span>
                  </div>
                </div>
                <div className="cost-info"><FaReceipt /><small>{form.duracion} h × ${PRECIO_HORA} / h</small></div>
              </div>

              {/* DATOS DEL VEHÍCULO */}
              <div className="section-title"><FaCar /> Datos del vehículo<span className="section-line"></span></div>
              <div className="veh-switch">
                <span className={`veh-indicator ${modoVehiculo}`}></span>
                <button type="button" className={modoVehiculo === "registrado" ? "active" : ""} onClick={() => { setModoVehiculo("registrado"); setErrors({}); }} disabled={misVehiculos.length === 0}>
                  <FaUser /> Usar registrado
                </button>
                <button type="button" className={modoVehiculo === "manual" ? "active" : ""} onClick={() => { setModoVehiculo("manual"); limpiarFormularioVehiculo(); }}>
                  <FaMagic /> Ingresar manual
                </button>
              </div>

              {modoVehiculo === "registrado" ? (
                <div className="veh-registrado">
                  <select className="form-input" value={vehiculoSeleccionado} onChange={seleccionarVehiculo}>
                    <option value="">-- Selecciona un vehículo --</option>
                    {misVehiculos.map((v) => (
                      <option key={v.id} value={v.id}>{v.marca} {v.modelo} - {v.placa}</option>
                    ))}
                  </select>
                  {vehiculoSeleccionado && (
                    <div className="veh-preview" style={{ marginTop: "10px" }}>
                      <div className="veh-preview-img">
                        {imagenBase64 ? <img src={imagenBase64} alt="Auto" /> : <FaCar size={24} color="#00f2fe" />}
                      </div>
                      <div>
                        <p className="veh-preview-title">{form.marca} {form.modelo}</p>
                        <p className="veh-preview-placa"><FaKey size={10} /> {form.placa}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="veh-manual">
                  <div className="input-icon">
                    <FaStar className="input-icon-left" />
                    <input id="marca" type="text" list="listaMarcas" placeholder="Marca (Ej. Nissan)" value={form.marca} onChange={handleChange} required />
                  </div>
                  <datalist id="listaMarcas">{MARCAS.map((m) => <option key={m} value={m} />)}</datalist>
                  
                  <div className="input-icon">
                    <FaMagic className="input-icon-left" />
                    <input id="modelo" type="text" placeholder="Modelo (Ej. Versa)" value={form.modelo} onChange={handleChange} required />
                  </div>
                  
                  <div className="input-icon">
                    <FaTicketAlt className="input-icon-left" />
                    <input id="placa" type="text" placeholder="Placa (Ej. ABC-123)" maxLength={10} value={form.placa} onChange={handleChange} required />
                  </div>

                  <div className="upload-row">
                    <div className="upload-box">
                      {imagenBase64 ? <img src={imagenBase64} alt="Auto" /> : <FaCamera color="#00f2fe" size={24} />}
                      <input type="file" accept="image/*" onChange={handleImageChange} />
                    </div>
                    <div className="upload-text"><strong>Sube una foto</strong><small>(Opcional, máx. 500 KB)</small></div>
                  </div>
                </div>
              )}

              <button type="submit" className="btn-submit" disabled={saving || reservasActivas.length >= MAX_RESERVAS}>
                {saving ? <><FaSpinner className="spin" /> Guardando...</> : <><FaRocket className="btn-rocket" /><span>Confirmar Reserva</span></>}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* TOAST Y ESTILOS (Se mantienen los tuyos) */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === "success" ? <FaCheckCircle /> : <FaTimesCircle />}
          <span>{toast.msg}</span>
        </div>
      )}

      <style>{`
        /* ... (AQUI PEGAS TODOS TUS ESTILOS ORIGINALES DE FONDO, CARRO, ETC) ... */
   /* ========== KEYFRAMES ========== */
        @keyframes fadeIn       { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp     { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin         { to { transform: rotate(360deg); } }
        @keyframes pop          { 0% { transform: scale(0); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @keyframes pulse        { 0%,100% { opacity: .4; } 50% { opacity: .85; } }
        @keyframes toastIn      { from { opacity: 0; transform: translateY(30px) scale(.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes toastBounce  { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px) scale(1.1); } }
        @keyframes shake        { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        @keyframes glow         { 0%,100% { box-shadow: 0 20px 60px rgba(0,0,0,.4); } 50% { box-shadow: 0 20px 70px rgba(0,242,254,.18); } }
        @keyframes floatCar     { 0%,100% { transform: translate(-50%,-50%); } 50% { transform: translate(-50%,-55%); } }
        @keyframes driveIn      { 0% { transform: translate(-200%,-50%); } 70% { transform: translate(-45%,-50%); } 85% { transform: translate(-55%,-50%); } 100% { transform: translate(-50%,-50%); } }
        @keyframes headlight    { 0%,100% { box-shadow: 0 0 10px 2px rgba(255,231,100,.8); } 50% { box-shadow: 0 0 20px 6px rgba(255,231,100,1); } }
        @keyframes wheelSpin    { to { transform: rotate(720deg); } }
        @keyframes carGlow      { 0%,100% { opacity: .4; transform: scale(1); } 50% { opacity: .8; transform: scale(1.1); } }
        @keyframes floorPulse   { 0%,100% { opacity: .3; } 50% { opacity: .7; } }
        @keyframes signBounce   { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-4px) rotate(3deg); } }
        @keyframes sparkleTwinkle{ 0%,100% { opacity: 0; transform: scale(0) rotate(0); } 50% { opacity: 1; transform: scale(1) rotate(180deg); } }
        @keyframes blobMove1    { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(80px,-60px) scale(1.15); } }
        @keyframes blobMove2    { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-100px,80px) scale(1.1); } }
        @keyframes blobMove3    { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(60px,80px) scale(1.2); } }
        @keyframes gridMove     { from { background-position: 0 0; } to { background-position: 60px 60px; } }
        @keyframes particleFloat{ 0% { transform: translate(0,0); opacity: .2; } 50% { opacity: .6; } 100% { transform: translate(-30px,-40px); opacity: 0; } }
        @keyframes iconFloat    { 0%,100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-4px) rotate(6deg); } }
        @keyframes iconWiggle   { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-8deg); } 75% { transform: rotate(8deg); } }
        @keyframes titleRing    { 0% { transform: scale(.9); opacity: .9; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes tipRing      { 0% { transform: scale(.9); opacity: .9; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes fieldSlideIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes numberPop    { 0% { transform: scale(.8); opacity: .4; } 60% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes costPulse    { 0%,100% { box-shadow: 0 0 0 0 rgba(0,242,254,.3); } 50% { box-shadow: 0 0 0 8px rgba(0,242,254,0); } }
        @keyframes costShimmer  { 0% { transform: translateX(-120%) skewX(-20deg); } 100% { transform: translateX(220%) skewX(-20deg); } }
        @keyframes ringPulse    { 0% { transform: scale(.9); opacity: .8; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes rocketBob    { 0%,100% { transform: translateY(0) rotate(-15deg); } 50% { transform: translateY(-3px) rotate(-10deg); } }
        @keyframes chevronSlide { 0%,100% { transform: translateX(0); } 50% { transform: translateX(4px); } }
        @keyframes shineSweep   { 0% { transform: translateX(-120%) skewX(-20deg); } 100% { transform: translateX(220%) skewX(-20deg); } }
        @keyframes uploadPulse  { 0%,100% { border-color: rgba(0,242,254,.4); } 50% { border-color: rgba(0,242,254,1); } }
        @keyframes flashIn      { from { opacity: 0; } to { opacity: 1; } }
        @keyframes successPop   { 0% { transform: scale(.6); opacity: 0; } 60% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes progressFill { from { width: 0; } to { width: 100%; } }
        @keyframes confettiFall { 0% { transform: translateY(-20px) rotate(0); opacity: 1; } 100% { transform: translateY(120px) rotate(360deg); opacity: 0; } }
        @keyframes orbitSpin    { to { transform: rotate(360deg); } }
        @keyframes orbitSpinRev { to { transform: rotate(-360deg); } }
        
        @keyframes errorSlide   { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

        /* ========== BASE ========== */
        * { box-sizing: border-box; }
        .res-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          font-family: 'Outfit','Segoe UI',system-ui,sans-serif;
          color: #e2e8f0;
          padding: 30px 20px 60px;
          animation: fadeIn .4s ease;
          position: relative;
          overflow-x: hidden;
        }
        .res-page.center-state {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 16px;
          color: #94a3b8;
        }
        .spin { animation: spin 1s linear infinite; }
        .container { max-width: 1000px; margin: 0 auto; position: relative; z-index: 1; }

        /* ========== FONDO DECO ========== */
        .bg-deco { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
        .bg-blob { position: absolute; border-radius: 50%; filter: blur(90px); opacity: .22; }
        .blob-1 { width: 480px; height: 480px; background: radial-gradient(circle,#00f2fe,transparent 70%); top: -160px; left: -120px; animation: blobMove1 20s ease-in-out infinite; }
        .blob-2 { width: 560px; height: 560px; background: radial-gradient(circle,#8b5cf6,transparent 70%); bottom: -180px; right: -160px; animation: blobMove2 24s ease-in-out infinite; }
        .blob-3 { width: 380px; height: 380px; background: radial-gradient(circle,#10b981,transparent 70%); top: 40%; right: 10%; animation: blobMove3 22s ease-in-out infinite; }
        .bg-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(0,242,254,.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,242,254,.04) 1px, transparent 1px);
          background-size: 60px 60px;
          animation: gridMove 8s linear infinite;
          mask-image: radial-gradient(circle at center, black 30%, transparent 80%);
          -webkit-mask-image: radial-gradient(circle at center, black 30%, transparent 80%);
        }
        .bg-particle {
          position: absolute; width: 6px; height: 6px;
          border-radius: 50%; background: #00f2fe;
          box-shadow: 0 0 12px rgba(0,242,254,.8);
        }
        .bp1 { top: 12%; left: 10%; animation: particleFloat 12s ease-in-out infinite; }
        .bp2 { top: 68%; left: 20%; background: #8b5cf6; box-shadow: 0 0 12px rgba(139,92,246,.8); animation: particleFloat 16s ease-in-out 1s infinite; }
        .bp3 { top: 30%; right: 15%; background: #10b981; box-shadow: 0 0 12px rgba(16,185,129,.8); animation: particleFloat 14s ease-in-out 2s infinite; }
        .bp4 { top: 78%; right: 22%; animation: particleFloat 18s ease-in-out 3s infinite; }
        .bp5 { top: 50%; left: 50%; background: #f59e0b; box-shadow: 0 0 12px rgba(245,158,11,.8); animation: particleFloat 20s ease-in-out 4s infinite; }

        /* ========== HEADER ========== */
        .res-header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 15px; margin-bottom: 24px; flex-wrap: wrap;
          animation: fadeInUp .5s ease;
        }
        .res-header h2 {
          color: #e2e8f0; font-size: 26px; margin: 0;
          display: inline-flex; align-items: center; gap: 12px;
        }
        .title-icon-wrap {
          position: relative;
          width: 40px; height: 40px; border-radius: 12px;
          background: linear-gradient(135deg,#00f2fe,#4facfe);
          color: #0f172a;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
          box-shadow: 0 8px 22px rgba(0,242,254,.4);
          animation: iconFloat 3s ease-in-out infinite;
        }
        .title-icon { transform: rotate(-15deg); }
        .title-icon-ring {
          position: absolute; inset: -3px;
          border: 2px solid rgba(0,242,254,.5);
          border-radius: 15px;
          animation: titleRing 2.4s ease-out infinite;
          pointer-events: none;
        }
        .header-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(245,158,11,.12);
          color: #f59e0b;
          border: 1px solid rgba(245,158,11,.35);
          padding: 6px 12px; border-radius: 999px;
          font-size: 11px; font-weight: 700;
          letter-spacing: .4px;
          animation: iconFloat 3s ease-in-out infinite;
        }
        .back-link {
          display: inline-flex; align-items: center; gap: 8px;
          color: #94a3b8; text-decoration: none; font-size: 14px;
          padding: 8px 14px; border-radius: 8px;
          border: 1px solid #334155;
          transition: all .2s;
        }
        .back-link:hover { color: #00f2fe; border-color: rgba(0,242,254,.4); transform: translateX(-3px); }

        /* ========== CARD PRINCIPAL ========== */
        .reserva-card {
          display: grid; grid-template-columns: 280px 1fr;
          gap: 32px;
          background: #1e293b;
          border: 1px solid rgba(0,242,254,.15);
          border-radius: 18px; padding: 32px;
          animation: fadeInUp .6s cubic-bezier(.16,1,.3,1), glow 5s ease-in-out infinite;
          position: relative;
          overflow: hidden;
        }
        .reserva-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg,#00f2fe,#4facfe,#8b5cf6,#00f2fe);
          background-size: 300% 100%;
          animation: shineSweep 4s linear infinite alternate;
          pointer-events: none;
        }

        /* ========== ESCENA ========== */
        .reserva-visual {
          display: flex; flex-direction: column;
          align-items: center; gap: 24px;
        }
        .parking-scene {
          position: relative;
          width: 220px; height: 260px;
          display: flex; align-items: flex-end; justify-content: center;
        }
        .parking-glow {
          position: absolute;
          bottom: 20px; left: 50%; transform: translateX(-50%);
          width: 180px; height: 60px;
          background: radial-gradient(ellipse, rgba(0,242,254,.35), transparent 70%);
          filter: blur(12px);
          animation: floorPulse 3s ease-in-out infinite;
          pointer-events: none;
        }
        .parking-floor {
          position: absolute;
          bottom: 10px; left: 50%; transform: translateX(-50%);
          width: 160px; height: 200px;
          display: flex; flex-direction: column;
          justify-content: space-around;
          pointer-events: none;
        }
        .parking-floor span {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,242,254,.25), transparent);
          animation: floorPulse 2.4s ease-in-out infinite;
        }
        .parking-floor span:nth-child(2) { animation-delay: .4s; }
        .parking-floor span:nth-child(3) { animation-delay: .8s; }
        .parking-floor span:nth-child(4) { animation-delay: 1.2s; }

        .parking-spot {
          position: absolute;
          bottom: 20px;
          width: 140px; height: 180px;
          border: 3px dashed rgba(0,242,254,.5);
          border-radius: 14px;
          animation: pulse 3s ease-in-out infinite;
        }
        .parking-sign {
          position: absolute;
          top: 10px; right: 30px;
          width: 32px; height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg,#00f2fe,#4facfe);
          color: #0f172a;
          display: flex; align-items: center; justify-content: center;
          font-weight: 900; font-size: 16px;
          box-shadow: 0 4px 14px rgba(0,242,254,.5);
          animation: signBounce 3s ease-in-out infinite;
        }

        .car {
          position: relative;
          width: 70px; height: 110px;
          background: linear-gradient(160deg, #4facfe, #00f2fe);
          border-radius: 18px 18px 10px 10px;
          margin-bottom: 40px;
          box-shadow: 0 8px 24px rgba(0,242,254,.4);
          animation: driveIn 2s cubic-bezier(.22,1,.36,1) forwards,
                     floatCar 3s ease-in-out 2s infinite;
          top: 50%; left: 50%;
          transform: translate(-50%,-50%);
        }
        .car-windshield {
          position: absolute;
          top: 14px; left: 10px; right: 10px; height: 24px;
          background: rgba(15,23,42,.65);
          border-radius: 8px 8px 4px 4px;
        }
        .car-headlights {
          position: absolute;
          bottom: 6px; left: 8px; right: 8px; height: 5px;
          background: #ffe764;
          border-radius: 4px;
          animation: headlight 1.5s ease-in-out infinite;
        }
        .car-glow {
          position: absolute; inset: -8px;
          border-radius: 22px;
          background: radial-gradient(circle, rgba(0,242,254,.4), transparent 60%);
          filter: blur(10px);
          animation: carGlow 2s ease-in-out infinite;
          pointer-events: none;
        }
        .wheel {
          position: absolute;
          width: 14px; height: 14px;
          background: #0b1220;
          border: 3px solid #334155;
          border-radius: 50%;
          animation: wheelSpin 1s linear infinite;
        }
        .wheel::after {
          content: ''; position: absolute; inset: 2px;
          background: #64748b; border-radius: 50%;
        }
        .wheel-tl { top: 16px; left: -8px; }
        .wheel-tr { top: 16px; right: -8px; }
        .wheel-bl { bottom: 16px; left: -8px; }
        .wheel-br { bottom: 16px; right: -8px; }

        .sparkles { position: absolute; inset: 0; pointer-events: none; }
        .sparkles span {
          position: absolute; width: 6px; height: 6px;
          background: #00f2fe;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(0,242,254,.8);
          animation: sparkleTwinkle 2.4s ease-in-out infinite;
        }
        .sparkles span:nth-child(1) { top: 8%; left: 6%; animation-delay: 0s; }
        .sparkles span:nth-child(2) { top: 18%; right: 8%; animation-delay: .3s; }
        .sparkles span:nth-child(3) { top: 48%; left: 2%; animation-delay: .6s; }
        .sparkles span:nth-child(4) { top: 62%; right: 4%; animation-delay: .9s; }
        .sparkles span:nth-child(5) { top: 78%; left: 8%; animation-delay: 1.2s; }
        .sparkles span:nth-child(6) { top: 82%; right: 12%; animation-delay: 1.5s; }

        /* ========== TIPS ========== */
        .tips-box {
          background: rgba(0,242,254,.05);
          border: 1px solid rgba(0,242,254,.15);
          border-radius: 12px;
          padding: 18px;
          width: 100%;
          animation: fadeInUp .8s ease .2s backwards;
        }
        .tips-box h4 {
          color: #00f2fe; font-size: 14px; margin: 0 0 12px;
          display: flex; align-items: center; gap: 10px;
        }
        .tip-icon {
          position: relative;
          width: 26px; height: 26px;
          border-radius: 8px;
          background: rgba(0,242,254,.15);
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 13px;
          animation: iconWiggle 3s ease-in-out infinite;
        }
        .tip-icon-ring {
          position: absolute; inset: -3px;
          border: 1.5px solid rgba(0,242,254,.5);
          border-radius: 10px;
          animation: tipRing 2s ease-out infinite;
        }
        .tips-box ul {
          margin: 0; padding: 0; list-style: none;
          display: flex; flex-direction: column; gap: 10px;
        }
        .tips-box li {
          color: #94a3b8; font-size: 12px; line-height: 1.5;
          padding-left: 20px; position: relative;
          animation: fadeInUp .5s ease backwards;
        }
        .tips-box li svg {
          position: absolute; left: 0; top: 2px;
          color: #00f2fe; font-size: 11px;
        }
        .tips-box li strong { color: #00f2fe; }

        .mini-perks {
          display: flex; gap: 6px; flex-wrap: wrap;
          justify-content: center; width: 100%;
          animation: fadeInUp .8s ease .4s backwards;
        }
        .perk {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 10px;
          background: rgba(16,185,129,.1);
          border: 1px solid rgba(16,185,129,.3);
          border-radius: 999px;
          font-size: 10.5px; font-weight: 700;
          color: #10b981;
          text-transform: uppercase;
          letter-spacing: .4px;
        }
        .perk svg { font-size: 10px; }

        /* ========== FORM ========== */
        .reserva-info { display: flex; flex-direction: column; gap: 18px; }
        .intro {
          color: #94a3b8; font-size: 14px; margin: 0;
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px;
          background: rgba(0,242,254,.05);
          border: 1px solid rgba(0,242,254,.15);
          border-radius: 10px;
          animation: fadeInUp .5s ease;
        }
        .intro-icon {
          width: 26px; height: 26px;
          border-radius: 8px;
          background: rgba(0,242,254,.15);
          color: #00f2fe;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 12px; flex-shrink: 0;
        }

        .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; animation: fieldSlideIn .5s ease backwards; }
        .field label {
          color: #94a3b8; font-size: 12px;
          text-transform: uppercase; letter-spacing: .5px;
          font-weight: 600;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .field label svg { color: #00f2fe; }
        .field input, .field select, .form-input {
          width: 100%;
          padding: 12px 14px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 10px;
          color: #e2e8f0; font-size: 14px; outline: none;
          transition: border-color .2s, box-shadow .2s, transform .15s;
          font-family: inherit;
        }
        .field input:focus, .field select:focus, .form-input:focus {
          border-color: #00f2fe;
          box-shadow: 0 0 0 3px rgba(0,242,254,.15);
          transform: translateY(-1px);
        }
        .field .hint {
          color: #64748b; font-size: 12px; margin-top: 2px;
          display: inline-flex; align-items: center; gap: 5px;
        }
        .field .hint svg { color: #00f2fe; font-size: 10px; }
        .row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; animation: fieldSlideIn .5s ease .3s backwards; }
        .row .field { margin-bottom: 0; }

        /* --- ESTILOS DE ERROR --- */
        .field input.input-error, .form-input.input-error {
          border-color: #ef4444 !important;
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.3) !important;
          background: rgba(239, 68, 68, 0.05);
        }
        .field input.input-error:focus, .form-input.input-error:focus {
          border-color: #ef4444 !important;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2), 0 0 12px rgba(239, 68, 68, 0.4) !important;
        }
        .error-text {
          display: flex; align-items: center; gap: 6px;
          color: #ef4444; font-size: 12px; font-weight: 600;
          margin-top: 4px;
          animation: errorSlide 0.3s ease-out;
        }
        .error-text svg { font-size: 14px; }

        /* Inputs con icono */
        .input-icon { position: relative; display: flex; align-items: center; width: 100%; }
        .input-icon-left {
          position: absolute; left: 14px;
          color: #64748b; font-size: 14px;
          pointer-events: none;
          transition: color .2s, transform .2s;
          z-index: 1;
        }
        .input-icon:focus-within .input-icon-left {
          color: #00f2fe;
          transform: scale(1.1) rotate(-6deg);
        }
        .input-icon input {
          padding-left: 40px !important;
        }

        /* Input con botón */
        .input-with-action { display: flex; gap: 8px; }
        .input-with-action .input-icon { flex: 1; min-width: 0; }
        .btn-mapa {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 0 16px;
          background: linear-gradient(135deg,#00f2fe,#4facfe);
          color: #0f172a;
          border: none;
          border-radius: 10px;
          text-decoration: none;
          font-size: 13px; font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
          transition: all .3s cubic-bezier(.34,1.56,.64,1);
          box-shadow: 0 4px 12px rgba(0,242,254,.3);
        }
        .btn-mapa:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 8px 20px rgba(0,242,254,.45);
        }
        .btn-mapa-arrow {
          font-size: 10px;
          transition: transform .3s;
        }
        .btn-mapa:hover .btn-mapa-arrow { transform: translateX(3px); }

        /* Costo */
        .cost-box {
          position: relative;
          display: flex; align-items: center; gap: 14px;
          padding: 16px 18px;
          background: linear-gradient(135deg,rgba(0,242,254,.08),rgba(79,172,254,.05));
          border: 1.5px dashed rgba(0,242,254,.4);
          border-radius: 14px;
          margin-bottom: 16px;
          overflow: hidden;
          animation: fieldSlideIn .5s ease .35s backwards;
        }
        .cost-icon {
          position: relative;
          width: 46px; height: 46px;
          border-radius: 13px;
          background: linear-gradient(135deg,#00f2fe,#4facfe);
          color: #0f172a;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
          box-shadow: 0 8px 22px rgba(0,242,254,.4);
          flex-shrink: 0;
          animation: iconFloat 3s ease-in-out infinite;
        }
        .cost-icon-ring {
          position: absolute; inset: -4px;
          border: 2px solid rgba(0,242,254,.5);
          border-radius: 16px;
          animation: costPulse 2s ease-out infinite;
        }
        .cost-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .cost-label {
          color: #94a3b8; font-size: 10.5px;
          text-transform: uppercase; letter-spacing: .5px;
          font-weight: 700;
        }
        .cost-value {
          display: flex; align-items: baseline; gap: 3px;
          color: #00f2fe;
        }
        .currency { font-size: 16px; font-weight: 700; }
        .amount {
          display: inline-block;
          font-size: 26px; font-weight: 900;
          letter-spacing: -1px;
          animation: numberPop .4s cubic-bezier(.34,1.56,.64,1);
        }
        .currency-name { font-size: 12px; font-weight: 700; margin-left: 2px; }
        .cost-info {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 10px;
          background: rgba(0,0,0,.3);
          border-radius: 8px;
          color: #94a3b8;
          font-size: 11px;
        }
        .cost-info svg { color: #00f2fe; font-size: 11px; }
        .cost-shine {
          position: absolute; top: 0; left: 0;
          width: 60px; height: 100%;
          background: linear-gradient(90deg,transparent,rgba(0,242,254,.2),transparent);
          transform: translateX(-120%) skewX(-20deg);
          animation: costShimmer 3s ease-in-out infinite;
          pointer-events: none;
        }

        /* Sección título */
        .section-title {
          display: flex; align-items: center; gap: 8px;
          color: #00f2fe; font-size: 13px; font-weight: 700;
          text-transform: uppercase; letter-spacing: .5px;
          margin-top: 14px; margin-bottom: 12px;
          position: relative;
        }
        .section-title svg { animation: iconWiggle 3s ease-in-out infinite; }
        .section-line {
          flex: 1; height: 1px;
          background: linear-gradient(90deg,rgba(0,242,254,.4),transparent);
          margin-left: 6px;
        }

        /* ========== SWITCH VEHÍCULO ========== */
        .veh-switch {
          position: relative;
          display: flex;
          background: rgba(0,0,0,.3);
          border-radius: 10px;
          padding: 4px;
          margin-bottom: 14px;
          overflow: hidden;
          animation: fieldSlideIn .5s ease .4s backwards;
        }
        .veh-indicator {
          position: absolute;
          top: 4px; bottom: 4px;
          width: calc(50% - 4px);
          background: linear-gradient(135deg,#00f2fe,#4facfe);
          border-radius: 7px;
          box-shadow: 0 4px 12px rgba(0,242,254,.4);
          transition: left .35s cubic-bezier(.34,1.56,.64,1);
        }
        .veh-indicator.registrado { left: 4px; }
        .veh-indicator.manual { left: calc(50% + 0px); }
        .veh-switch button {
          flex: 1;
          padding: 10px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-weight: 700; font-size: 12.5px;
          z-index: 1; position: relative;
          transition: color .3s;
          display: inline-flex; align-items: center; justify-content: center;
          gap: 6px;
          font-family: inherit;
        }
        .veh-switch button.active { color: #0f172a; }
        .veh-switch button:not(.active) { color: #94a3b8; }
        .veh-switch button:not(.active):hover { color: #cbd5e1; }
        .veh-switch button:disabled { cursor: not-allowed; }

        /* ========== VEH REGISTRADO ========== */
        .select-wrapper {
          position: relative;
          margin-bottom: 10px;
        }
        .select-wrapper .select-icon {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%);
          color: #00f2fe; font-size: 14px;
          pointer-events: none;
          z-index: 1;
        }
        .select-wrapper select {
          appearance: none;
          padding-left: 40px !important;
          padding-right: 36px !important;
          cursor: pointer;
          width: 100%;
        }
        .select-chevron {
          position: absolute; right: 14px; top: 50%;
          transform: translateY(-50%) rotate(90deg);
          color: #64748b; font-size: 11px;
          pointer-events: none;
        }

        .veh-preview {
          position: relative;
          display: flex; align-items: center; gap: 14px;
          background: rgba(0,0,0,.25);
          padding: 12px;
          border-radius: 10px;
          overflow: hidden;
          animation: fadeInUp .4s ease;
        }
        .veh-preview-img {
          width: 58px; height: 58px;
          border-radius: 9px;
          border: 1px solid rgba(0,242,254,.4);
          background: #0f172a;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .veh-preview-img img { width: 100%; height: 100%; object-fit: cover; }
        .veh-preview-title {
          margin: 0; color: #fff; font-weight: 700; font-size: 13px;
        }
        .veh-preview-placa {
          margin: 4px 0 0;
          color: #00f2fe; font-size: 11.5px;
          letter-spacing: 1px;
          display: inline-flex; align-items: center; gap: 4px;
        }
        .veh-preview-shine {
          position: absolute; top: 0; left: 0;
          width: 60px; height: 100%;
          background: linear-gradient(90deg,transparent,rgba(0,242,254,.2),transparent);
          transform: translateX(-120%) skewX(-20deg);
          animation: costShimmer 4s ease-in-out infinite;
          pointer-events: none;
        }

        /* ========== VEH MANUAL ========== */
        .veh-manual {
          display: flex; flex-direction: column; gap: 10px;
          animation: fadeInUp .4s ease;
        }
        .upload-row {
          display: flex; align-items: center; gap: 14px;
          margin-top: 6px;
        }
        .upload-box {
          position: relative;
          width: 70px; height: 70px;
          border-radius: 10px;
          background: rgba(0,0,0,.4);
          border: 2px dashed rgba(0,242,254,.5);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          animation: uploadPulse 2s ease-in-out infinite;
          transition: transform .2s;
        }
        .upload-box:hover { transform: scale(1.04); }
        .upload-box img { width: 100%; height: 100%; object-fit: cover; }
        .upload-box input {
          position: absolute; inset: 0;
          opacity: 0; cursor: pointer;
        }
        .upload-ring {
          position: absolute; inset: -6px;
          border: 1.5px solid rgba(0,242,254,.4);
          border-radius: 14px;
          animation: tipRing 2.5s ease-out infinite;
          pointer-events: none;
        }
        .upload-text { display: flex; flex-direction: column; gap: 2px; }
        .upload-text strong { color: #e2e8f0; font-size: 13px; }
        .upload-text small { color: #94a3b8; font-size: 11px; }

        /* ========== SUBMIT ========== */
        .btn-submit {
          position: relative;
          margin-top: 20px;
          width: 100%;
          padding: 14px 18px;
          background: linear-gradient(135deg,#00f2fe,#4facfe);
          color: #0f172a;
          border: none; border-radius: 12px;
          font-size: 15px; font-weight: 800;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          gap: 10px;
          min-height: 52px;
          font-family: inherit;
          overflow: hidden;
          box-shadow: 0 6px 20px rgba(0,242,254,.35);
          transition: transform .2s, box-shadow .2s;
        }
        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(0,242,254,.55);
        }
        .btn-submit:disabled { opacity: .7; cursor: not-allowed; }
        .btn-rocket { animation: rocketBob 1.6s ease-in-out infinite; }
        .btn-amount {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px;
          background: rgba(15,23,42,.25);
          border-radius: 8px;
          font-size: 13px; font-weight: 900;
        }
        .btn-amount svg { font-size: 11px; }
        .btn-chevron { animation: chevronSlide 1.4s ease-in-out infinite; font-size: 12px; }
        .btn-shine-1, .btn-shine-2 {
          position: absolute; top: 0; left: 0;
          width: 60px; height: 100%;
          background: linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);
          transform: translateX(-120%) skewX(-20deg);
          pointer-events: none;
        }
        .btn-shine-1 { animation: shineSweep 3s ease-in-out infinite; }
        .btn-shine-2 { animation: shineSweep 3s ease-in-out 1.5s infinite; }

        /* ========== FLASH DE ÉXITO ========== */
        .success-flash {
          position: fixed; inset: 0;
          background: rgba(15,23,42,.92);
          backdrop-filter: blur(14px);
          display: flex; align-items: center; justify-content: center;
          z-index: 20000;
          animation: flashIn .3s ease;
          padding: 20px;
        }
        .success-flash-inner {
          position: relative;
          text-align: center;
          padding: 40px 30px;
          max-width: 420px; width: 100%;
          background: linear-gradient(135deg,#1e293b,#0f172a);
          border: 1px solid rgba(0,242,254,.3);
          border-radius: 24px;
          box-shadow: 0 30px 80px rgba(0,0,0,.6);
          animation: successPop .5s cubic-bezier(.34,1.56,.64,1);
          overflow: hidden;
        }
        .success-icon {
          position: relative;
          width: 90px; height: 90px;
          margin: 0 auto 20px;
          background: linear-gradient(135deg,#10b981,#34d399);
          color: #fff;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 44px;
          box-shadow: 0 15px 40px rgba(16,185,129,.5);
          animation: pop .6s cubic-bezier(.34,1.56,.64,1);
        }
        .success-ring-1, .success-ring-2 {
          position: absolute; inset: -8px;
          border: 2px solid rgba(16,185,129,.5);
          border-radius: 50%;
          animation: ringPulse 2s ease-out infinite;
          pointer-events: none;
        }
        .success-ring-2 { animation-delay: 1s; }
        .success-flash-inner h2 {
          color: #fff; font-size: 22px;
          margin: 0 0 8px;
          animation: fadeInUp .5s ease .2s backwards;
        }
        .success-flash-inner p {
          color: #94a3b8; font-size: 14px;
          margin: 0 0 22px;
          display: inline-flex; align-items: center; gap: 6px;
          animation: fadeInUp .5s ease .35s backwards;
        }
        .success-flash-inner p svg { color: #00f2fe; }
        .success-progress {
          width: 100%; height: 4px;
          background: rgba(255,255,255,.08);
          border-radius: 999px;
          overflow: hidden;
          animation: fadeInUp .5s ease .4s backwards;
        }
        .success-progress span {
          display: block;
          height: 100%;
          background: linear-gradient(90deg,#10b981,#00f2fe,#4facfe);
          border-radius: 999px;
          width: 0;
          animation: progressFill 1.4s ease-out forwards;
        }
        .success-confetti {
          position: absolute; inset: 0;
          pointer-events: none; overflow: hidden;
        }
        .success-confetti span {
          position: absolute;
          width: 8px; height: 8px;
          border-radius: 50%;
          top: 0;
          animation: confettiFall 1.4s ease-out forwards;
        }
        .success-confetti span:nth-child(1) { left: 12%; background: #00f2fe; animation-delay: .1s; }
        .success-confetti span:nth-child(2) { left: 26%; background: #10b981; animation-delay: .2s; }
        .success-confetti span:nth-child(3) { left: 40%; background: #f59e0b; animation-delay: .15s; }
        .success-confetti span:nth-child(4) { left: 55%; background: #8b5cf6; animation-delay: .25s; }
        .success-confetti span:nth-child(5) { left: 68%; background: #00f2fe; animation-delay: .3s; }
        .success-confetti span:nth-child(6) { left: 82%; background: #10b981; animation-delay: .2s; }
        .success-confetti span:nth-child(7) { left: 18%; background: #ef4444; animation-delay: .35s; }
        .success-confetti span:nth-child(8) { left: 74%; background: #f59e0b; animation-delay: .4s; }

        /* ========== TOAST ========== */
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
        .toast-icon { display: flex; animation: toastBounce 1s ease-in-out infinite; }
        .toast.success { background: #10b981; color: #0f172a; }
        .toast.error   { background: #ef4444; color: #fff; animation: toastIn .35s cubic-bezier(.34,1.56,.64,1), shake .4s ease .35s; }

        /* ========== LOADING ========== */
        .loading-orbit {
          position: relative; width: 80px; height: 80px;
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

        /* ========== RESPONSIVE ========== */
        @media (max-width: 780px) {
          .reserva-card { grid-template-columns: 1fr; padding: 22px; }
          .parking-scene { width: 180px; height: 220px; }
          .row { grid-template-columns: 1fr; }
          .res-header h2 { font-size: 22px; }
          .input-with-action { flex-direction: column; }
          .btn-mapa { justify-content: center; padding: 12px; }
          .cost-box { flex-wrap: wrap; }
          .cost-info { width: 100%; justify-content: center; }
        }
/* ==========================================
   🔥 ESTILOS MEJORADOS: SEMÁFORO Y HORARIOS
   ========================================== */

/* Semáforo con animación de pulso */
.semaforo-badge {
  margin-top: 8px; 
  display: inline-flex; 
  align-items: center; 
  gap: 6px;
  padding: 6px 14px; 
  border-radius: 20px; 
  font-size: 12px; 
  font-weight: 700;
  letter-spacing: 0.5px;
  width: fit-content; 
  animation: fadeIn 0.3s ease, badgePulse 2s infinite alternate;
  box-shadow: 0 0 10px currentColor;
  border-width: 1px;
  border-style: solid;
}

/* Contenedor de las horas (Fondo sutil para agruparlos) */
.time-grid {
  display: grid; 
  grid-template-columns: repeat(auto-fill, minmax(75px, 1fr)); /* Botones un poco más anchos */
  gap: 10px; 
  margin-top: 10px; 
  max-height: 220px; 
  overflow-y: auto; 
  padding: 12px;
  background: rgba(15, 23, 42, 0.4); /* Fondo para enmarcar el selector */
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

/* Scrollbar estilo Cyberpunk */
.time-grid::-webkit-scrollbar {
  width: 6px;
}
.time-grid::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}
.time-grid::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 10px;
}
.time-grid::-webkit-scrollbar-thumb:hover {
  background: #00f2fe;
}

/* Botón de hora base */
.time-btn {
  background: rgba(30, 41, 59, 0.8); 
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e2e8f0; 
  padding: 10px 0; 
  border-radius: 10px; 
  font-weight: 700;
  cursor: pointer; 
  transition: all 0.2s ease; 
  font-family: inherit; 
  font-size: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Efecto al pasar el mouse (Hover) */
.time-btn:hover:not(.blocked) { 
  border-color: rgba(0, 242, 254, 0.6); 
  background: rgba(0, 242, 254, 0.15); 
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 242, 254, 0.2);
  color: #00f2fe;
}

/* Botón seleccionado (Activo) */
.time-btn.selected { 
  background: linear-gradient(135deg, #00f2fe, #0072ff);
  color: #050b14; /* Texto oscuro para mejor contraste */
  border-color: #00f2fe; 
  box-shadow: 0 0 15px rgba(0, 242, 254, 0.5);
  font-weight: 900;
  transform: scale(1.02); /* Un zoom muy leve */
}

/* Botón Bloqueado (Ocupado) - Sin tachado, solo apagado */
.time-btn.blocked { 
  background: rgba(15, 23, 42, 0.6); 
  color: #475569; /* Gris oscuro */
  border-color: rgba(255, 255, 255, 0.02); 
  cursor: not-allowed; 
  opacity: 0.6;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5); /* Efecto hundido */
}

/* Animaciones para el semáforo */
@keyframes badgePulse {
  0% { box-shadow: 0 0 5px currentColor; }
  100% { box-shadow: 0 0 15px currentColor; }
}
      `}</style>
    </div>
  );
}