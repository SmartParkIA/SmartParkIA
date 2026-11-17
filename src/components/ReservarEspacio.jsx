import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  FaArrowLeft,
  FaBolt,
  FaBuilding,
  FaCalendarCheck,
  FaCamera,
  FaCar,
  FaCheckCircle,
  FaCoins,
  FaExclamationTriangle,
  FaFire,
  FaHandHoldingUsd,
  FaHourglassHalf,
  FaInfoCircle,
  FaKey,
  FaLightbulb,
  FaMagic,
  FaMapMarkedAlt,
  FaMapPin,
  FaParking,
  FaReceipt,
  FaRocket,
  FaShieldAlt,
  FaSpinner,
  FaStar,
  FaStopwatch,
  FaTicketAlt,
  FaTimesCircle,
  FaUser
} from "react-icons/fa";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { auth, db } from "../firebase/config.js";
import { getVehiculos } from "../services/userService";

const MARCAS = ["Nissan", "Chevrolet", "Volkswagen", "Toyota", "Ford", "Honda", "Kia", "Mazda", "Hyundai", "SEAT"];
const PRECIO_HORA = 50;
const CAPACIDAD_TOTAL = 50;

const PALABRAS_PROHIBIDAS = [
  "puta", "puto", "putita", "putito", "mierda", "pendejo", "pendeja",
  "cabron", "cabrón", "verga", "chinga", "chingar", "chingada", "joder",
  "jodete", "jódete", "culo", "pedo", "mamon", "mamón", "pinche", "culero",
  "zorra", "perra", "idiota", "estupido", "estúpido", "estupida", "estúpida",
  "tonto", "tonta", "imbecil", "imbécil", "gilipollas", "marica", "maricon",
  "maricón", "wey", "güey", "mamada", "mamadas", "coño", "cojones", "hostia",
  "follar", "follador", "sudaca", "culiao", "cagada", "cagar", "cagon", "cagón",
  "ojete", "pito", "pitos", "chupar", "chupala", "chupalo", "concha", "conchudo",
  "pelotudo", "boludo", "boluda", "garcha", "garchar", "hijueputa", "hdp", "ptm",
  "shit", "bitch", "asshole", "fuck", "fucking", "dick", "pussy", "whore", "ass"
];

const normalizarTexto = (str = "") =>
  String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const contieneGroseria = (texto = "") => {
  const limpio = normalizarTexto(texto);
  return PALABRAS_PROHIBIDAS.some((p) => {
    const pLimpia = normalizarTexto(p);
    const re = new RegExp(`(?:^|[^a-z])${pLimpia}`, "i");
    return re.test(limpio);
  });
};

const esSpamTexto = (texto = "") => {
  const t = String(texto).trim();
  if (t.length < 3) return false;
  const compacto = normalizarTexto(t).replace(/[\s\-\.]/g, "");
  if (!compacto) return true;
  if (/(.{2,4})\1{2,}/i.test(compacto)) return true; 
  const unicos = new Set(compacto).size;
  if (compacto.length >= 4 && unicos <= 2) return true; 
  if (/^\d+$/.test(compacto)) return true; 
  return false;
};

const CARACTERES_INVALIDOS = /[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s\-\.]/;

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

  const [reservasDelDia, setReservasDelDia] = useState([]);
  const [reservasDelCajon, setReservasDelCajon] = useState([]);
  const [cargandoHoras, setCargandoHoras] = useState(false);

  const lastCorrectionToastRef = useRef(0);
  const totalPagar = Number(form.duracion) * PRECIO_HORA;

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const validarCampo = (id, value, strict = false) => {
    if (id === "marca" || id === "modelo") {
      const t = (value || "").trim();

      if (!t) return strict ? "Este campo es obligatorio." : "";
      if (t.length < 3) return "Mínimo 3 caracteres.";
      if (t.length > 30) return "Máximo 30 caracteres.";
      if (CARACTERES_INVALIDOS.test(value))
        return "Solo se permiten letras, números, espacios y guiones.";
      if (contieneGroseria(value))
        return "El texto contiene lenguaje no permitido.";
      if (esSpamTexto(value))
        return "El texto parece spam o inválido. Escribe un nombre real.";
      
      if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(t))
        return "El texto parece no ser una palabra real (demasiadas consonantes).";

      if (/(.)\1{2,}/.test(value))
        return "Evita repetir letras seguidas (ej. 'ooo').";
      return "";
    }

    if (id === "placa") {
      const v = (value || "").trim().toUpperCase();
      if (!v) return strict ? "La placa es obligatoria." : "";
      if (!strict && v.length < 6) return ""; 

      const clean = v.replace(/-/g, "");

      if (/[ÑQ]/.test(clean)) {
        return "Las letras Ñ y Q no son válidas en placas mexicanas.";
      }

      const isAutoEstandar = /^[A-Z]{3}\d{3,4}$/.test(clean);
      const isAutoNuevo = /^[A-Z]{3}\d{3}[A-Z]$/.test(clean);
      const isCamion = /^[A-Z]{2}\d{4,5}[A-Z]$/.test(clean);
      const isMoto = /^Y\d{3}[A-Z]{2}$/.test(clean);

      if (!isAutoEstandar && !isAutoNuevo && !isCamion && !isMoto) {
        return "Formato inválido. Ejemplos: ABC-123, ABC-1234, ABC-123-A, AA-1234-A, Y-123-AB.";
      }

      return "";
    }

    return "";
  };

  useEffect(() => {
    const cajonParam = searchParams.get("cajon");
    const estParam = searchParams.get("estacionamiento");
    const fechaParam = searchParams.get("fecha");
    const horarioParam = searchParams.get("horario");
    const duracionParam = searchParams.get("duracion");

    if (cajonParam || estParam || fechaParam || horarioParam || duracionParam) {
      setForm((prevForm) => ({
        ...prevForm,
        ...(cajonParam ? { espacio: cajonParam } : {}),
        ...(estParam ? { estacionamiento: estParam } : {}),
        ...(fechaParam ? { fecha: fechaParam } : {}),
        ...(horarioParam ? { horario: horarioParam } : {}),
        ...(duracionParam ? { duracion: duracionParam } : {}),
      }));
      setErrors((prev) => ({ ...prev, estacionamiento: "", espacio: "" }));
      
      window.history.replaceState(null, "", window.location.pathname);
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
        if ((data.estado || "").toLowerCase() === "activa") activas.push(data);
      });
      setReservasActivas(activas);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchDisponibilidadDia = async () => {
      if (!form.fecha || !form.estacionamiento) {
        setReservasDelDia([]);
        return;
      }
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

  const diaSaturado = Boolean(
    form.fecha && form.estacionamiento && reservasDelDia.length >= CAPACIDAD_TOTAL
  );

  const getSemaforoInfo = () => {
    if (!form.fecha || !form.estacionamiento) return null;
    const ocupados = reservasDelDia.length;
    const porcentajeLibre = ((CAPACIDAD_TOTAL - ocupados) / CAPACIDAD_TOTAL) * 100;

    if (porcentajeLibre > 50) return { color: "#10b981", bg: "rgba(16,185,129,0.1)", texto: "Alta disponibilidad", icon: <FaCheckCircle /> };
    if (porcentajeLibre > 0) return { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", texto: "Media disponibilidad", icon: <FaInfoCircle /> };
    return { color: "#ef4444", bg: "rgba(239,68,68,0.1)", texto: "Saturado (Sin horarios disponibles)", icon: <FaExclamationTriangle /> };
  };

  const checkHoraBloqueada = (horaStr) => {
    if (!form.fecha || !form.espacio) return false;
    if (diaSaturado) return true;

    const startSelected = new Date(`${form.fecha}T${horaStr}`);
    const endSelected = new Date(startSelected.getTime() + Number(form.duracion) * 60 * 60 * 1000);

    for (let r of reservasDelCajon) {
      const rStart = new Date(`${r.fecha}T${r.horario}`);
      const rDur = parseInt(r.duracion, 10) || 0;
      const rEnd = new Date(rStart.getTime() + rDur * 60 * 60 * 1000);

      if (startSelected < rEnd && endSelected > rStart) return true;
    }
    return false;
  };

  const horasDisponibles = [];
  for (let i = 0; i <= 23; i++) {
    const horaStr = `${String(i).padStart(2, "0")}:00`;
    horasDisponibles.push({ hora: horaStr, bloqueada: checkHoraBloqueada(horaStr) });
  }

  useEffect(() => {
    if (form.horario && checkHoraBloqueada(form.horario)) {
      setForm((prev) => ({ ...prev, horario: "" }));
      showToast("El horario seleccionado ya no está disponible para esa fecha o duración.", "info");
    }
  }, [form.fecha, form.duracion, reservasDelCajon, reservasDelDia]);

  const hoyLocal = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split("T")[0];
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    let newValue = value;

    if (id === "placa") {
      let raw = value.toUpperCase().replace(/O/g, "0").replace(/I/g, "1");
      
      const corregido = value.toUpperCase();
      if (raw !== corregido) {
        const ahora = Date.now();
        if (ahora - lastCorrectionToastRef.current > 3000) {
          showToast("Se corrigió automáticamente: O→0, I→1", "info");
          lastCorrectionToastRef.current = ahora;
        }
      }

      newValue = raw.replace(/[^A-Z0-9-]/g, "");
    }

    setForm((f) => ({ ...f, [id]: newValue }));

    if (modoVehiculo === "manual" && ["marca", "modelo", "placa"].includes(id)) {
      const errorMsg = validarCampo(id, newValue);
      setErrors((prev) => ({ ...prev, [id]: errorMsg }));
    } else {
      setErrors((prev) => ({ ...prev, [id]: "" }));
    }
  };

  const handleBlur = (e) => {
    const { id, value } = e.target;
    if (modoVehiculo === "manual" && ["marca", "modelo", "placa"].includes(id)) {
      const errorMsg = validarCampo(id, value, true);
      setErrors((prev) => ({ ...prev, [id]: errorMsg }));
    }
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

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, imagen: "El archivo debe ser una imagen válida." }));
      return showToast("El archivo debe ser una imagen válida.", "error");
    }

    if (file.size > 500 * 1024) {
      setErrors((prev) => ({ ...prev, imagen: "La imagen supera el límite de 500 KB." }));
      return showToast("La imagen es muy grande (máx. 500 KB).", "error");
    }

    setErrors((prev) => ({ ...prev, imagen: "" }));
    const reader = new FileReader();
    reader.onloadend = () => setImagenBase64(reader.result);
    reader.readAsDataURL(file);
  };

  const limpiarFormularioVehiculo = () => {
    setForm((prev) => ({ ...prev, marca: "", modelo: "", placa: "" }));
    setImagenBase64("");
    setErrors((prev) => ({ ...prev, marca: "", modelo: "", placa: "", vehiculo: "", imagen: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    if (reservasActivas.length >= MAX_RESERVAS) {
      setSaving(false);
      return showToast(`Límite alcanzado: Solo puedes tener hasta ${MAX_RESERVAS} reservas activas.`, "error");
    }

    const newErrors = {};

    if (!form.estacionamiento || form.estacionamiento.trim().length < 3) {
      newErrors.estacionamiento = "Debes usar el botón 'Elegir' para seleccionar una zona válida.";
    }
    if (!form.espacio || form.espacio.trim().length < 2) {
      newErrors.espacio = "Debes seleccionar un cajón desde el mapa.";
    }
    if (!form.fecha) newErrors.fecha = "La fecha es obligatoria";
    if (!form.horario) newErrors.horario = "Debes seleccionar una hora";

    if (diaSaturado) {
      newErrors.fecha = "Este estacionamiento está saturado en la fecha elegida.";
    }
    if (form.horario && checkHoraBloqueada(form.horario)) {
      newErrors.horario = "El horario seleccionado está ocupado o no disponible.";
    }

    const duracionNum = Number(form.duracion);
    if (!form.duracion || isNaN(duracionNum) || duracionNum < 1 || duracionNum > 8) {
      newErrors.duracion = "La duración debe ser entre 1 y 8 horas";
    }

    if (modoVehiculo === "registrado") {
      if (!vehiculoSeleccionado) newErrors.vehiculo = "Selecciona un vehículo de tu lista";
    } else {
      const errMarca = validarCampo("marca", form.marca, true);
      const errModelo = validarCampo("modelo", form.modelo, true);
      const errPlaca = validarCampo("placa", form.placa, true);

      if (errMarca) newErrors.marca = errMarca;
      if (errModelo) newErrors.modelo = errModelo;
      if (errPlaca) newErrors.placa = errPlaca;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSaving(false);
      return showToast("Revisa los campos marcados en rojo.", "error");
    }

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
        navigate("/reservas", { state: { nuevaReservaId: docRef.id } });
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

          <div className="reserva-info">
            <form onSubmit={handleSubmit} noValidate>

              <div className="field">
                <label><FaBuilding /> Estacionamiento / Zona</label>
                <div className="input-with-action">
                  <div className="input-icon" style={{ flex: 1 }}>
                    <FaMapPin className="input-icon-left" />
                    <input
                      id="estacionamiento"
                      type="text"
                      readOnly
                      onClick={() => showToast("Usa el botón 'Elegir' para abrir el mapa", "error")}
                      className={errors.estacionamiento ? "input-error" : ""}
                      value={form.estacionamiento}
                      placeholder="Elige del mapa"
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                  <Link to="/estacionamientos" className="btn-mapa">
                    <FaMapMarkedAlt /> Elegir
                  </Link>
                </div>
                {errors.estacionamiento && <span className="error-text"><FaExclamationTriangle /> {errors.estacionamiento}</span>}
              </div>

              <div className="field">
                <label><FaParking /> Cajón seleccionado</label>
                <div className="input-icon">
                  <FaKey className="input-icon-left" />
                  <input
                    id="espacio"
                    type="text"
                    readOnly
                    onClick={() => showToast("El cajón se selecciona desde el mapa", "error")}
                    className={errors.espacio ? "input-error" : ""}
                    value={form.espacio}
                    placeholder="Elige del mapa"
                    style={{ cursor: 'not-allowed', opacity: 0.8 }}
                  />
                </div>
                {errors.espacio && <span className="error-text"><FaExclamationTriangle /> {errors.espacio}</span>}
              </div>

              <div className="row">
                <div className="field">
                  <label><FaCalendarCheck /> Fecha</label>
                  <input
                    id="fecha"
                    type="date"
                    className={errors.fecha ? "input-error" : ""}
                    value={form.fecha}
                    onChange={handleChange}
                    min={hoyLocal()}
                  />
                  {errors.fecha && <span className="error-text"><FaExclamationTriangle /> {errors.fecha}</span>}

                  {semaforo && form.fecha && (
                    <div className="semaforo-badge" style={{ background: semaforo.bg, color: semaforo.color, border: `1px solid ${semaforo.color}` }}>
                      {semaforo.icon} {semaforo.texto}
                    </div>
                  )}
                </div>
                <div className="field">
                  <label><FaHourglassHalf /> Duración</label>
                  <input
                    id="duracion"
                    type="number"
                    className={errors.duracion ? "input-error" : ""}
                    value={form.duracion}
                    onChange={handleChange}
                    min="1"
                    max="8"
                  />
                  {errors.duracion && <span className="error-text"><FaExclamationTriangle /> {errors.duracion}</span>}
                </div>
              </div>

              <div className="field">
                <label><FaStopwatch /> Hora de inicio</label>
                {cargandoHoras ? (
                  <div style={{ color: "#00f2fe", display: "flex", gap: "10px", alignItems: "center", padding: "10px 0" }}>
                    <FaSpinner className="spin" /> Calculando disponibilidad...
                  </div>
                ) : !form.espacio ? (
                  <div className="error-text" style={{ padding: "10px", background: "rgba(245,158,11,0.1)", borderRadius: "8px", color: "#f59e0b" }}>
                    <FaInfoCircle /> Primero selecciona un cajón en el mapa para ver los horarios disponibles.
                  </div>
                ) : diaSaturado ? (
                  <div className="error-text" style={{ padding: "10px", background: "rgba(239,68,68,0.1)", borderRadius: "8px" }}>
                    <FaExclamationTriangle /> No hay horarios disponibles para esta fecha porque el estacionamiento está saturado. Elige otro día.
                  </div>
                ) : (
                  <>
                    <div className={`time-grid ${errors.horario ? "grid-error" : ""}`}>
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
                    {errors.horario && <span className="error-text"><FaExclamationTriangle /> {errors.horario}</span>}
                  </>
                )}
              </div>

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
                  <select
                    className={`form-input ${errors.vehiculo ? "input-error" : ""}`}
                    value={vehiculoSeleccionado}
                    onChange={seleccionarVehiculo}
                  >
                    <option value="">-- Selecciona un vehículo --</option>
                    {misVehiculos.map((v) => (
                      <option key={v.id} value={v.id}>{v.marca} {v.modelo} - {v.placa}</option>
                    ))}
                  </select>
                  {errors.vehiculo && <span className="error-text" style={{ marginBottom: "10px" }}><FaExclamationTriangle /> {errors.vehiculo}</span>}

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
                    <input
                      id="marca"
                      type="text"
                      list="listaMarcas"
                      placeholder="Marca (Ej. Chevrolet)"
                      className={errors.marca ? "input-error" : ""}
                      value={form.marca}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      maxLength={20}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <datalist id="listaMarcas">{MARCAS.map((m) => <option key={m} value={m} />)}</datalist>
                  {errors.marca && <span className="error-text"><FaExclamationTriangle /> {errors.marca}</span>}

                  <div className="input-icon">
                    <FaMagic className="input-icon-left" />
                    <input
                      id="modelo"
                      type="text"
                      placeholder="Modelo (Ej. Aveo)"
                      className={errors.modelo ? "input-error" : ""}
                      value={form.modelo}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      maxLength={30}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  {errors.modelo && <span className="error-text"><FaExclamationTriangle /> {errors.modelo}</span>}

                  <div className="input-icon">
                    <FaTicketAlt className="input-icon-left" />
                    <input
                      id="placa"
                      type="text"
                      placeholder="Placa (Ej. ABC-1234 o ABC-123-A)"
                      maxLength={10}
                      className={errors.placa ? "input-error" : ""}
                      value={form.placa}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  {errors.placa && <span className="error-text"><FaExclamationTriangle /> {errors.placa}</span>}

                  <div className="upload-row">
                    <div className={`upload-box ${errors.imagen ? "input-error" : ""}`}>
                      {imagenBase64 ? <img src={imagenBase64} alt="Auto" /> : <FaCamera color="#00f2fe" size={24} />}
                      <input type="file" accept="image/*" onChange={handleImageChange} />
                    </div>
                    <div className="upload-text">
                      <strong>Sube una foto</strong>
                      <small>(Opcional, máx. 500 KB)</small>
                    </div>
                  </div>
                  {errors.imagen && <span className="error-text"><FaExclamationTriangle /> {errors.imagen}</span>}
                </div>
              )}

              <button type="submit" className="btn-submit" disabled={saving}>
                {saving ? <><FaSpinner className="spin" /> Guardando...</> : <><FaRocket className="btn-rocket" /><span>Confirmar Reserva</span></>}
              </button>
            </form>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === "success" ? (
            <FaCheckCircle />
          ) : toast.type === "info" ? (
            <FaInfoCircle />
          ) : (
            <FaTimesCircle />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      <style>{`
        input.input-error,
        select.input-error,
        .form-input.input-error,
        .upload-box.input-error {
          border-color: #ef4444 !important;
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.3) !important;
          background: rgba(239, 68, 68, 0.05) !important;
        }

        @keyframes fadeIn       { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp     { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin         { to { transform: rotate(360deg); } }
        @keyframes pop          { 0% { transform: scale(0); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
      `}</style>
    </div>
  );
}