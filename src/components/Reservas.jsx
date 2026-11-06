import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where, getDocs, addDoc
} from "firebase/firestore";
import { auth, db } from "../firebase/config.js";
import { getVehiculos } from "../services/userService";
import {
  FaCar, FaParking, FaCalendarAlt, FaClock, 
  FaCheckCircle, FaTimesCircle, FaSpinner, FaMapMarkedAlt,
  FaLightbulb, FaArrowLeft, FaInfoCircle, FaSave, FaBuilding, FaCamera,
  FaMoneyBillWave // <-- Ícono para el dinero
} from "react-icons/fa";

const MARCAS = ["Nissan", "Chevrolet", "Volkswagen", "Toyota", "Ford", "Honda", "Kia", "Mazda", "Hyundai", "SEAT"];
const PRECIO_HORA = 50; // <-- TARIFA POR HORA

export default function ReservarEspacio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [reservasActivas, setReservasActivas] = useState([]);
  const MAX_RESERVAS = 3; 

  const [misVehiculos, setMisVehiculos] = useState([]);
  const [modoVehiculo, setModoVehiculo] = useState('registrado');
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState('');
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

  const [toast, setToast] = useState(null);

  // CÁLCULO DEL COSTO TOTAL
  const totalPagar = Number(form.duracion) * PRECIO_HORA;

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    const cajon = searchParams.get("cajon");
    const est = searchParams.get("estacionamiento");
    if (cajon || est) {
      setForm((f) => ({
        ...f,
        ...(cajon ? { espacio: cajon } : {}),
        ...(est ? { estacionamiento: est } : {}),
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
      if (vehiculosGuardados.length === 0) setModoVehiculo('manual');

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
      showToast("Error al cargar reservas", "error");
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    if (id === "placa") {
      setForm((f) => ({ ...f, placa: value.toUpperCase() }));
    } else {
      setForm((f) => ({ ...f, [id]: value }));
    }
  };

  const seleccionarVehiculo = (e) => {
    const id = e.target.value;
    setVehiculoSeleccionado(id);
    if (id) {
      const auto = misVehiculos.find(v => v.id === id);
      if (auto) {
        setForm(prev => ({ ...prev, marca: auto.marca, modelo: auto.modelo, placa: auto.placa }));
        setImagenBase64(auto.imagen || "");
      }
    } else {
      setForm(prev => ({ ...prev, marca: '', modelo: '', placa: '' }));
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
    setForm(prev => ({ ...prev, marca: '', modelo: '', placa: '' }));
    setImagenBase64("");
  };

  const hoyLocal = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split("T")[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (reservasActivas.length >= MAX_RESERVAS) {
      return showToast(`Solo puedes tener hasta ${MAX_RESERVAS} reservas activas.`, "error");
    }

    if (!form.estacionamiento.trim()) return showToast("Elige un estacionamiento en el mapa.", "error");
    if (!form.espacio.trim()) return showToast("Primero elige un cajón en el mapa.", "error");
    if (!form.fecha || !form.horario) return showToast("Completa fecha y horario.", "error");
    if (!form.marca || !form.modelo || !form.placa) return showToast("Completa los datos del vehículo.", "error");

    const inicio = new Date(`${form.fecha}T${form.horario}`);
    const fin = new Date(inicio.getTime() + Number(form.duracion) * 60 * 60 * 1000);
    if (fin <= new Date()) return showToast("El horario seleccionado ya pasó.", "error");

    setSaving(true);
    try {
      const q = query(collection(db, "reservas"), where("espacio", "==", form.espacio), where("fecha", "==", form.fecha));
      const snap = await getDocs(q);

      let choque = false;
      snap.forEach((d) => {
        const r = d.data();
        if ((r.estado || "").toLowerCase() !== "activa") return;
        const durNum = parseInt(r.duracion, 10) || 0;
        const rInicio = new Date(`${r.fecha}T${r.horario}`);
        const rFin = new Date(rInicio.getTime() + durNum * 60 * 60 * 1000);
        if (inicio < rFin && fin > rInicio) choque = true;
      });

      if (choque) {
        showToast("Ese cajón ya está reservado en ese horario.", "error");
        setSaving(false);
        return;
      }

      // GUARDAMOS EL COSTO EN FIRESTORE
      await addDoc(collection(db, "reservas"), {
        uid: user.uid,
        estacionamiento: form.estacionamiento,
        espacio: form.espacio,
        fecha: form.fecha,
        horario: form.horario,
        duracion: `${form.duracion} horas`,
        costoTotal: totalPagar, // <-- Guardamos el total
        estado: "activa",
        marca: form.marca,
        modelo: form.modelo,
        placa: form.placa,
        imagen: imagenBase64,
        fechaCreacion: new Date().toISOString(),
      });

      showToast("¡Reserva confirmada!", "success");
      await cargarReservas(user.uid);
      
      setForm((f) => ({ ...f, espacio: "", horario: "", marca: "", modelo: "", placa: "" }));
      setImagenBase64("");
      setVehiculoSeleccionado("");
      
    } catch (err) {
      console.error(err);
      showToast("Error al crear la reserva", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="res-page center-state">
        <FaSpinner className="spin" size={38} color="#00f2fe" />
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="res-page">
      <div className="container">
        
        <header className="res-header">
          <Link to="/perfil" className="back-link"><FaArrowLeft /> Volver al perfil</Link>
          <h2>Nueva Reserva</h2>
        </header>

        <div className="reserva-card">
          
          <div className="reserva-visual">
            <div className="parking-scene">
              <div className="parking-spot"></div>
              <div className="car">
                <div className="car-windshield"></div>
                <div className="car-headlights"></div>
                <div className="wheel wheel-tl"></div>
                <div className="wheel wheel-tr"></div>
                <div className="wheel wheel-bl"></div>
                <div className="wheel wheel-br"></div>
              </div>
            </div>
            <div className="tips-box">
              <h4><FaLightbulb /> Proceso de Reserva</h4>
              <ul>
                <li>Elige un estacionamiento y luego un cajón en el mapa.</li>
                <li>La tarifa es de <strong>${PRECIO_HORA} MXN por hora</strong>.</li>
                <li>Puedes tener hasta {MAX_RESERVAS} reservas activas.</li>
              </ul>
            </div>
          </div>

          <div className="reserva-info">
            <p className="intro">
              <FaInfoCircle /> 
              {reservasActivas.length >= MAX_RESERVAS 
                ? "Has alcanzado el límite de reservas. Ve a 'Mis Reservas' para cancelar una." 
                : "Completa los datos para asegurar tu lugar antes de llegar."}
            </p>

            <form onSubmit={handleSubmit}>
              <fieldset disabled={reservasActivas.length >= MAX_RESERVAS} style={{ border: "none", padding: 0, margin: 0, opacity: reservasActivas.length >= MAX_RESERVAS ? 0.5 : 1 }}>
                
                <div className="field">
                  <label htmlFor="estacionamiento"><FaBuilding /> Estacionamiento / Zona</label>
                  <input id="estacionamiento" type="text" placeholder="Selecciona uno desde el mapa" value={form.estacionamiento} onChange={handleChange} required />
                </div>

                <div className="field">
                  <label htmlFor="espacio"><FaParking /> Cajón seleccionado</label>
                  <div className="input-with-action">
                    <input id="espacio" type="text" placeholder="Ej. P1-05" value={form.espacio} onChange={handleChange} required />
                    <Link to="/estacionamientos" className="btn-mapa"><FaMapMarkedAlt /> Elegir en mapa</Link>
                  </div>
                  <small className="hint">Haz clic en "Elegir en mapa" para escoger la plaza y el cajón.</small>
                </div>

                <div className="row">
                  <div className="field">
                    <label htmlFor="fecha">Fecha</label>
                    <input id="fecha" type="date" value={form.fecha} onChange={handleChange} min={hoyLocal()} required />
                  </div>
                  <div className="field">
                    <label htmlFor="horario">Hora de inicio</label>
                    <input id="horario" type="time" value={form.horario} onChange={handleChange} required />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="duracion">Duración (horas)</label>
                  <input id="duracion" type="number" value={form.duracion} onChange={handleChange} min="1" max="12" required />
                </div>

                {/* RECUADRO DEL COSTO TOTAL */}
                <div style={{ 
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "rgba(0, 242, 254, 0.08)", padding: "15px", borderRadius: "10px",
                  border: "1px dashed rgba(0, 242, 254, 0.4)", marginBottom: "15px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#00f2fe" }}>
                    <FaMoneyBillWave size={20} />
                    <span style={{ fontSize: "14px", fontWeight: "600" }}>Costo Total a Pagar:</span>
                  </div>
                  <span style={{ fontSize: "20px", fontWeight: "800", color: "#00f2fe" }}>
                    ${totalPagar} MXN
                  </span>
                </div>

                <div className="section-title"><FaCar /> Datos del vehículo</div>

                <div style={{ display: "flex", background: "rgba(0, 0, 0, 0.3)", borderRadius: "8px", padding: "4px", marginBottom: "15px" }}>
                  <button type="button" style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "none", cursor: misVehiculos.length === 0 ? "not-allowed" : "pointer", fontWeight: "600", fontSize: "13px", background: modoVehiculo === 'registrado' ? "#00f2fe" : "transparent", color: modoVehiculo === 'registrado' ? "#0f172a" : "#94a3b8" }} onClick={() => setModoVehiculo('registrado')} disabled={misVehiculos.length === 0}>Usar registrado</button>
                  <button type="button" style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px", background: modoVehiculo === 'manual' ? "#00f2fe" : "transparent", color: modoVehiculo === 'manual' ? "#0f172a" : "#94a3b8" }} onClick={() => { setModoVehiculo('manual'); limpiarFormularioVehiculo(); }}>Ingresar manual</button>
                </div>

                {modoVehiculo === 'registrado' ? (
                  <div>
                    <select className="form-input" value={vehiculoSeleccionado} onChange={seleccionarVehiculo} style={{ width: "100%", padding: "12px", background: "#0f172a", border: "1px solid #334155", borderRadius: "10px", color: "#fff", marginBottom: "10px" }}>
                      <option value="">-- Selecciona un vehículo --</option>
                      {misVehiculos.map(v => (
                        <option key={v.id} value={v.id}>{v.marca} {v.modelo} - {v.placa}</option>
                      ))}
                    </select>

                    {vehiculoSeleccionado && (
                      <div style={{ display: "flex", alignItems: "center", gap: "15px", background: "rgba(0,0,0,0.2)", padding: "10px", borderRadius: "8px" }}>
                        {imagenBase64 ? <img src={imagenBase64} alt="Auto" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px", border: "1px solid #00f2fe" }} /> : <div style={{ width: "60px", height: "60px", borderRadius: "8px", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center" }}><FaCar size={24} color="#00f2fe" /></div>}
                        <div>
                          <p style={{ margin: 0, color: "#fff", fontWeight: "bold" }}>{form.marca} {form.modelo}</p>
                          <p style={{ margin: "4px 0 0", color: "#00f2fe", fontSize: "12px", letterSpacing: "1px" }}>{form.placa}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div>
                      <input id="marca" type="text" list="listaMarcas" placeholder="Marca (Ej. Nissan)" value={form.marca} onChange={handleChange} required style={{ width: "100%", padding: "12px", background: "#0f172a", border: "1px solid #334155", borderRadius: "10px", color: "#fff" }} />
                      <datalist id="listaMarcas">{MARCAS.map((m) => <option key={m} value={m} />)}</datalist>
                    </div>
                    <input id="modelo" type="text" placeholder="Modelo (Ej. Versa)" value={form.modelo} onChange={handleChange} required style={{ width: "100%", padding: "12px", background: "#0f172a", border: "1px solid #334155", borderRadius: "10px", color: "#fff" }} />
                    <input id="placa" type="text" placeholder="Placa (Ej. ABC-123)" maxLength={10} value={form.placa} onChange={handleChange} required style={{ width: "100%", padding: "12px", background: "#0f172a", border: "1px solid #334155", borderRadius: "10px", color: "#fff" }} />
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "15px", marginTop: "10px" }}>
                      <div style={{ position: "relative", width: "70px", height: "70px", borderRadius: "10px", background: "rgba(0,0,0,0.4)", border: "2px dashed #00f2fe", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {imagenBase64 ? <img src={imagenBase64} alt="Auto" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <FaCamera color="#00f2fe" size={24} />}
                        <input type="file" accept="image/*" onChange={handleImageChange} style={{ position: "absolute", width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} />
                      </div>
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>Sube una foto (Opcional)</span>
                    </div>
                  </div>
                )}
              </fieldset>

              {/* BOTÓN CON EL TOTAL DINÁMICO */}
              <button type="submit" className="btn-submit" disabled={saving || reservasActivas.length >= MAX_RESERVAS} style={{ marginTop: "20px" }}>
                {saving 
                  ? <><FaSpinner className="spin" /> Guardando...</> 
                  : <><FaSave /> Confirmar Reserva y Pagar ${totalPagar}</>}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === "success" ? <FaCheckCircle /> : <FaTimesCircle />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ESTILOS */}
      <style>{`
        @keyframes fadeIn     { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp   { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin       { to { transform: rotate(360deg); } }
        @keyframes pop        { 0% { transform: scale(0); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @keyframes pulse      { 0%,100% { opacity: 0.4; } 50% { opacity: 0.85; } }
        @keyframes floatCar   { 0%,100% { transform: translate(-50%,-50%); } 50% { transform: translate(-50%,-55%); } }
        @keyframes driveIn    { 0% { transform: translate(-200%, -50%); } 70% { transform: translate(-45%, -50%); } 85% { transform: translate(-55%, -50%); } 100% { transform: translate(-50%, -50%); } }
        @keyframes headlight  { 0%,100% { box-shadow: 0 0 10px 2px rgba(255,231,100,.8); } 50% { box-shadow: 0 0 20px 6px rgba(255,231,100,1); } }
        @keyframes wheelSpin  { to { transform: rotate(720deg); } }
        @keyframes toastIn    { from { opacity: 0; transform: translateY(30px) scale(.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes glow       { 0%,100% { box-shadow: 0 20px 60px rgba(0,0,0,.4); } 50% { box-shadow: 0 20px 70px rgba(0,242,254,.18); } }

        * { box-sizing: border-box; }

        .res-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif;
          color: #e2e8f0;
          padding: 30px 20px 60px;
          animation: fadeIn .4s ease;
        }
        .res-page.center-state {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 16px;
          color: #94a3b8;
        }
        .spin { animation: spin 1s linear infinite; }

        .container { max-width: 1000px; margin: 0 auto; }

        .res-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .res-header h2 {
          color: #e2e8f0;
          font-size: 26px;
          margin: 0;
          animation: fadeInUp .5s ease;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #334155;
          transition: all .2s;
        }
        .back-link:hover {
          color: #00f2fe;
          border-color: rgba(0,242,254,.4);
          transform: translateX(-3px);
        }

        .reserva-card {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 32px;
          background: #1e293b;
          border: 1px solid rgba(0,242,254,.15);
          border-radius: 18px;
          padding: 32px;
          animation: fadeInUp .6s cubic-bezier(0.16,1,0.3,1), glow 5s ease-in-out infinite;
        }

        .reserva-visual {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }
        .parking-scene {
          position: relative;
          width: 200px;
          height: 240px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .parking-spot {
          position: absolute;
          bottom: 20px;
          width: 140px;
          height: 180px;
          border: 3px dashed rgba(0,242,254,.4);
          border-radius: 14px;
          animation: pulse 3s ease-in-out infinite;
        }
        .car {
          position: relative;
          width: 70px;
          height: 110px;
          background: linear-gradient(160deg, #4facfe, #00f2fe);
          border-radius: 18px 18px 10px 10px;
          margin-bottom: 40px;
          box-shadow: 0 8px 24px rgba(0,242,254,.4);
          animation: driveIn 2s cubic-bezier(0.22,1,0.36,1) forwards,
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
        .wheel-tl { top: 16px;  left: -8px; }
        .wheel-tr { top: 16px;  right: -8px; }
        .wheel-bl { bottom: 16px; left: -8px; }
        .wheel-br { bottom: 16px; right: -8px; }

        .tips-box {
          background: rgba(0,242,254,.05);
          border: 1px solid rgba(0,242,254,.15);
          border-radius: 12px;
          padding: 18px;
          width: 100%;
          animation: fadeInUp .8s ease .2s backwards;
        }
        .tips-box h4 {
          color: #00f2fe;
          font-size: 14px;
          margin: 0 0 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tips-box ul {
          margin: 0; padding: 0;
          list-style: none;
          display: flex; flex-direction: column; gap: 10px;
        }
        .tips-box li {
          color: #94a3b8;
          font-size: 12px;
          line-height: 1.5;
          padding-left: 14px;
          position: relative;
        }
        .tips-box li::before {
          content: '•';
          position: absolute;
          left: 0;
          color: #00f2fe;
          font-weight: bold;
        }

        .reserva-info {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .intro {
          color: #94a3b8;
          font-size: 14px;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .intro svg { color: #00f2fe; }

        .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
        .field label {
          color: #94a3b8;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .5px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .field label svg { color: #00f2fe; }
        .field input, .field select, .form-input {
          width: 100%;
          padding: 12px 14px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 10px;
          color: #e2e8f0;
          font-size: 14px;
          outline: none;
          transition: border-color .2s, box-shadow .2s, transform .15s;
          font-family: inherit;
        }
        .field input:focus, .field select:focus, .form-input:focus {
          border-color: #00f2fe;
          box-shadow: 0 0 0 3px rgba(0,242,254,.15);
          transform: translateY(-1px);
        }
        .field .hint {
          color: #64748b;
          font-size: 12px;
          margin-top: 2px;
        }

        .row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

        .input-with-action {
          display: flex;
          gap: 8px;
        }
        .input-with-action input { flex: 1; min-width: 0; }
        .btn-mapa {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0 16px;
          background: rgba(0,242,254,.1);
          color: #00f2fe;
          border: 1px solid rgba(0,242,254,.3);
          border-radius: 10px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          transition: all .2s;
        }
        .btn-mapa:hover {
          background: rgba(0,242,254,.2);
          transform: translateY(-1px);
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #00f2fe;
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .5px;
          margin-top: 15px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(0,242,254,.15);
        }

        .btn-submit {
          margin-top: 8px;
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #00f2fe, #4facfe);
          color: #0f172a;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: opacity .2s, transform .15s, box-shadow .2s;
          min-height: 48px;
        }
        .btn-submit:hover:not(:disabled) {
          opacity: .95;
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0,242,254,.35);
        }
        .btn-submit:disabled { opacity: .7; cursor: not-allowed; }

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

        @media (max-width: 780px) {
          .reserva-card { grid-template-columns: 1fr; padding: 22px; }
          .parking-scene { width: 160px; height: 200px; }
          .row { grid-template-columns: 1fr; }
          .res-header h2 { font-size: 22px; }
          .input-with-action { flex-direction: column; }
          .btn-mapa { justify-content: center; padding: 12px; }
        }
      `}</style>
    </div>
  );
}