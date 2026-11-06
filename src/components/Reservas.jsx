import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where, getDocs, addDoc, doc, updateDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase/config.js";
import {
  FaCar, FaParking, FaCalendarAlt, FaClock, FaHourglassHalf,
  FaCheckCircle, FaTimesCircle, FaSpinner, FaMapMarkedAlt,
  FaExclamationTriangle, FaLightbulb, FaArrowLeft, FaTrash,
  FaInfoCircle, FaSave,
} from "react-icons/fa";

const MARCAS = ["Nissan", "Chevrolet", "Volkswagen", "Toyota", "Ford", "Honda", "Kia", "Mazda", "Hyundai", "SEAT"];

export default function ReservarEspacio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeReserva, setActiveReserva] = useState(null);

  const [form, setForm] = useState({
    estacionamiento: "SmartPark Central - Zona A",
    espacio: "",
    fecha: "",
    horario: "",
    duracion: 2,
    marca: "",
    modelo: "",
    placa: "",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Lee el cajón si vienes del mapa: /#/reservar?cajon=Cajon A13
  useEffect(() => {
    const cajon = searchParams.get("cajon");
    if (cajon) setForm((f) => ({ ...f, espacio: cajon }));
  }, [searchParams]);

  // Auth + carga de reserva activa
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate("/login", { replace: true });
        return;
      }
      setUser(u);
      await cargarReserva(u.uid);
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const cargarReserva = async (uid) => {
    try {
      const q = query(collection(db, "reservas"), where("uid", "==", uid));
      const snap = await getDocs(q);
      let activa = null;
      snap.forEach((d) => {
        const data = { id: d.id, ...d.data() };
        if ((data.estado || "").toLowerCase() === "activa") activa = data;
      });
      setActiveReserva(activa);
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

  const hoyLocal = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split("T")[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.espacio.trim()) {
      showToast("Primero elige un cajón.", "error");
      return;
    }
    if (!form.fecha || !form.horario) {
      showToast("Completa fecha y horario.", "error");
      return;
    }

    const inicio = new Date(`${form.fecha}T${form.horario}`);
    const fin = new Date(inicio.getTime() + Number(form.duracion) * 60 * 60 * 1000);
    if (fin <= new Date()) {
      showToast("El horario seleccionado ya pasó.", "error");
      return;
    }

    setSaving(true);
    try {
      // Verificar solapamiento en el mismo cajón y fecha
      const q = query(
        collection(db, "reservas"),
        where("espacio", "==", form.espacio),
        where("fecha", "==", form.fecha)
      );
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

      await addDoc(collection(db, "reservas"), {
        uid: user.uid,
        estacionamiento: form.estacionamiento,
        espacio: form.espacio,
        fecha: form.fecha,
        horario: form.horario,
        duracion: `${form.duracion} horas`,
        estado: "activa",
        marca: form.marca,
        modelo: form.modelo,
        placa: form.placa,
        fechaCreacion: new Date().toISOString(),
      });

      showToast("¡Reserva confirmada!", "success");
      await cargarReserva(user.uid);
      setForm({
        estacionamiento: "SmartPark Central - Zona A",
        espacio: "",
        fecha: "",
        horario: "",
        duracion: 2,
        marca: "",
        modelo: "",
        placa: "",
      });
    } catch (err) {
      console.error(err);
      showToast("Error al crear la reserva", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmarCancelacion = async () => {
    if (!activeReserva) return;
    setCancelando(true);
    try {
      await updateDoc(doc(db, "reservas", activeReserva.id), { estado: "cancelada" });
      showToast("Reserva cancelada exitosamente.", "success");
      setModalOpen(false);
      setActiveReserva(null);
    } catch (err) {
      console.error(err);
      showToast("No se pudo cancelar la reserva.", "error");
    } finally {
      setCancelando(false);
    }
  };

  // ============ RENDER ============
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
          <Link to="/perfil" className="back-link">
            <FaArrowLeft /> Volver al perfil
          </Link>
          <h2>{activeReserva ? "Mi Reserva Activa" : "Nueva Reserva"}</h2>
        </header>

        {activeReserva ? (
          /* ============ VISTA: RESERVA ACTIVA ============ */
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
              <p className="reserva-hint">
                <FaCheckCircle color="#10b981" /> Tu lugar está asegurado.
              </p>
            </div>

            <div className="reserva-info">
              <div className="badge-active">
                <FaCheckCircle /> RESERVA ACTIVA
              </div>

              <div className="info-grid-2">
                <div className="info-item">
                  <label><FaParking /> Estacionamiento</label>
                  <p>{activeReserva.estacionamiento || "—"}</p>
                </div>

                <div className="info-item highlight">
                  <label><FaParking /> Cajón</label>
                  <p className="big-value">{activeReserva.espacio || "—"}</p>
                </div>

                <div className="info-item">
                  <label><FaCalendarAlt /> Fecha</label>
                  <p>{activeReserva.fecha || "—"}</p>
                </div>

                <div className="info-item">
                  <label><FaClock /> Horario</label>
                  <p>{activeReserva.horario || "—"}</p>
                </div>

                <div className="info-item">
                  <label><FaHourglassHalf /> Duración</label>
                  <p>{activeReserva.duracion || "—"}</p>
                </div>

                {activeReserva.placa && (
                  <div className="info-item">
                    <label><FaCar /> Placa</label>
                    <p>{activeReserva.placa}</p>
                  </div>
                )}
              </div>

              <button className="btn-cancel" onClick={() => setModalOpen(true)}>
                <FaTrash /> Cancelar Reserva
              </button>
            </div>
          </div>
        ) : (
          /* ============ VISTA: NUEVA RESERVA ============ */
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
                  <li>Al confirmar, el cajón quedará asignado exclusivamente a tu cuenta.</li>
                  <li>Tu lugar se mantendrá apartado hasta finalizar el horario.</li>
                  <li>Solo puedes tener una reserva activa a la vez.</li>
                </ul>
              </div>
            </div>

            <div className="reserva-info">
              <p className="intro">
                <FaInfoCircle /> Completa los datos para asegurar tu lugar antes de llegar.
              </p>

              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="estacionamiento">Estacionamiento / Zona</label>
                  <input
                    id="estacionamiento"
                    type="text"
                    value={form.estacionamiento}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="espacio">Cajón seleccionado</label>
                  <div className="input-with-action">
                    <input
                      id="espacio"
                      type="text"
                      placeholder="Ej. Cajon A13"
                      value={form.espacio}
                      onChange={handleChange}
                      required
                    />
                    <Link to="/mapa?modo=reservar" className="btn-mapa">
                      <FaMapMarkedAlt /> Mapa
                    </Link>
                  </div>
                  <small className="hint">También puedes escribirlo o volver desde el mapa.</small>
                </div>

                <div className="row">
                  <div className="field">
                    <label htmlFor="fecha">Fecha</label>
                    <input
                      id="fecha"
                      type="date"
                      value={form.fecha}
                      onChange={handleChange}
                      min={hoyLocal()}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="horario">Hora de inicio</label>
                    <input
                      id="horario"
                      type="time"
                      value={form.horario}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="duracion">Duración (horas)</label>
                  <input
                    id="duracion"
                    type="number"
                    value={form.duracion}
                    onChange={handleChange}
                    min="1"
                    max="12"
                    required
                  />
                </div>

                <div className="section-title">
                  <FaCar /> Datos del vehículo
                </div>

                <div className="row">
                  <div className="field">
                    <label htmlFor="marca">Marca</label>
                    <input
                      id="marca"
                      type="text"
                      list="listaMarcas"
                      placeholder="Ej. Nissan"
                      value={form.marca}
                      onChange={handleChange}
                      required
                    />
                    <datalist id="listaMarcas">
                      {MARCAS.map((m) => <option key={m} value={m} />)}
                    </datalist>
                  </div>
                  <div className="field">
                    <label htmlFor="modelo">Modelo</label>
                    <input
                      id="modelo"
                      type="text"
                      placeholder="Ej. Versa 2022"
                      value={form.modelo}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="placa">Placa</label>
                  <input
                    id="placa"
                    type="text"
                    placeholder="Ej. ABC-123-D"
                    maxLength={10}
                    value={form.placa}
                    onChange={handleChange}
                    required
                  />
                </div>

                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? (
                    <><FaSpinner className="spin" /> Guardando...</>
                  ) : (
                    <><FaSave /> Confirmar Reserva</>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ============ MODAL DE CANCELACIÓN ============ */}
      {modalOpen && (
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
              Estás a punto de liberar tu cajón{" "}
              <strong>{activeReserva?.espacio}</strong>. Esta acción no se puede
              deshacer y otra persona podría ocuparlo.
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
        @keyframes pulse      { 0%,100% { opacity: 0.4; } 50% { opacity: 0.85; } }
        @keyframes floatCar   { 0%,100% { transform: translate(-50%,-50%); } 50% { transform: translate(-50%,-55%); } }
        @keyframes driveIn    { 0% { transform: translate(-200%, -50%); } 70% { transform: translate(-45%, -50%); } 85% { transform: translate(-55%, -50%); } 100% { transform: translate(-50%, -50%); } }
        @keyframes headlight  { 0%,100% { box-shadow: 0 0 10px 2px rgba(255,231,100,.8); } 50% { box-shadow: 0 0 20px 6px rgba(255,231,100,1); } }
        @keyframes wheelSpin  { to { transform: rotate(720deg); } }
        @keyframes toastIn    { from { opacity: 0; transform: translateY(30px) scale(.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes modalIn    { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes overlayIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes shake      { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
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

        /* ============ CARD ============ */
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

        /* ============ VISUAL / ESCENA ============ */
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

        .reserva-hint {
          color: #94a3b8;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
          text-align: center;
          margin: 0;
        }

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

        /* ============ FORMULARIO / INFO ============ */
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

        .field { display: flex; flex-direction: column; gap: 6px; }
        .field label {
          color: #94a3b8;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .5px;
          font-weight: 600;
        }
        .field input, .field select {
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
        .field input:focus, .field select:focus {
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
        .input-with-action input { flex: 1; }
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
          margin-top: 8px;
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

        /* ============ INFO RESERVA ACTIVA ============ */
        .badge-active {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(16,185,129,.15);
          color: #10b981;
          border: 1px solid rgba(16,185,129,.4);
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1px;
          align-self: flex-start;
          animation: pop .5s cubic-bezier(0.34,1.56,0.64,1);
        }

        .info-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .info-item {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 10px;
          padding: 12px 14px;
          transition: border-color .2s;
          animation: fadeInUp .5s ease backwards;
        }
        .info-item:hover { border-color: rgba(0,242,254,.4); }
        .info-item label {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #94a3b8;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .5px;
          margin-bottom: 6px;
        }
        .info-item label svg { color: #00f2fe; }
        .info-item p {
          margin: 0;
          color: #e2e8f0;
          font-size: 15px;
        }
        .info-item.highlight {
          border-color: rgba(0,242,254,.4);
          background: rgba(0,242,254,.06);
        }
        .info-item .big-value {
          color: #00f2fe;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: .5px;
        }

        .btn-cancel {
          margin-top: 8px;
          width: 100%;
          padding: 13px;
          background: rgba(239,68,68,.1);
          color: #ef4444;
          border: 1px solid rgba(239,68,68,.35);
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all .2s;
          min-height: 46px;
        }
        .btn-cancel:hover {
          background: rgba(239,68,68,.2);
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(239,68,68,.25);
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
          justify-content: center;
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
        @media (max-width: 780px) {
          .reserva-card { grid-template-columns: 1fr; padding: 22px; }
          .parking-scene { width: 160px; height: 200px; }
          .info-grid-2 { grid-template-columns: 1fr; }
          .row { grid-template-columns: 1fr; }
          .res-header h2 { font-size: 22px; }
        }
      `}</style>
    </div>
  );
}