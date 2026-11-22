import { collection, getDocs } from "firebase/firestore";
import {
    CheckCircle2,
    Clock,
    Filter,
    History,
    RotateCcw
} from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "../firebase/config.js";
import "../styles/RegistrarEstacionamiento.css"; // Usamos tus estilos base

function normalizarTexto(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, " ")
    .trim();
}

function formatearEspacio(espacio) {
  if (!espacio) return "Sin asignar";
  const match = String(espacio).match(/^cajon[_\s-]*(\d+)$/i);
  if (match) {
    return `Cajón ${match[1].padStart(2, "0")}`;
  }
  return espacio;
}

function formatearFechaLocal(dateObj) {
  const d =
    dateObj instanceof Date && !Number.isNaN(dateObj.getTime())
      ? dateObj
      : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatearHoraLocal(dateObj) {
  const d =
    dateObj instanceof Date && !Number.isNaN(dateObj.getTime())
      ? dateObj
      : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function calcularHoraLiberacion(fecha, horario, duracion) {
  if (!fecha || !horario) return "—";
  const inicio = new Date(`${fecha}T${horario}`);
  if (Number.isNaN(inicio.getTime())) return "—";

  const horas = parseInt(duracion, 10) || 1;
  const fin = new Date(inicio.getTime() + horas * 60 * 60 * 1000);

  return `${formatearFechaLocal(fin)} ${formatearHoraLocal(fin).slice(0, 5)}`;
}

function HistorialOcupacion() {
  const [estacionamientos, setEstacionamientos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Filtros
  const [filtroEstacionamiento, setFiltroEstacionamiento] = useState("");
  const [filtroEspacio, setFiltroEspacio] = useState("");
  const [filtroFechaInicio, setFiltroFechaInicio] = useState("");
  const [filtroFechaFin, setFiltroFechaFin] = useState("");

  // 🌍 URL dinámica del backend
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

  useEffect(() => {
    cargarDatosIniciales(false);

    const intervalo = setInterval(() => {
      cargarDatosIniciales(true);
    }, 5000);

    return () => clearInterval(intervalo);
  }, []);

  async function cargarDatosIniciales(silencioso = false) {
    if (!silencioso) setCargando(true);
    let listaSedes = [];
    const registrosCargados = [];

    // 1. Cargar estacionamientos
    try {
      const respEst = await fetch(`${API_URL}/api/estacionamientos`);
      if (respEst.ok) {
        listaSedes = await respEst.json();
      }
    } catch (error) {
      console.warn("No se pudieron cargar sedes desde el backend:", error);
    }

    // 2. Historial de sensores IoT
    let tieneHistorialSensores = false;
    try {
      const respHist = await fetch(`${API_URL}/api/historial-ocupacion`);
      if (respHist.ok) {
        const eventosSensor = await respHist.json();
        if (eventosSensor.length > 0) {
          tieneHistorialSensores = true;
          eventosSensor.forEach((ev) => {
            const fechaEntradaObj = ev.horaOcupacionMs
              ? new Date(ev.horaOcupacionMs)
              : new Date();
            const fechaLocal = formatearFechaLocal(fechaEntradaObj);
            const horaEntradaStr = `${fechaLocal} ${formatearHoraLocal(fechaEntradaObj)}`;

            let horaSalidaStr = "En curso";
            if (ev.horaLiberacionMs) {
              const fechaSalidaObj = new Date(ev.horaLiberacionMs);
              horaSalidaStr = `${formatearFechaLocal(fechaSalidaObj)} ${formatearHoraLocal(fechaSalidaObj)}`;
            }

            registrosCargados.push({
              id: ev.id,
              estacionamiento: ev.estacionamiento,
              espacio: `${formatearEspacio(ev.cajonId)} (Sensor IoT)`,
              fecha: fechaLocal,
              horaOcupacion: horaEntradaStr,
              horaLiberacion: horaSalidaStr,
              estado: ev.estado
            });
          });
        }
      }
    } catch (error) {
      console.warn("No se pudo leer el historial de sensores:", error);
    }

    // 3. Fallback: Colección "lugares" si no hay historial
    if (!tieneHistorialSensores) {
      try {
        const snapLugares = await getDocs(collection(db, "lugares"));
        const sedePorDefecto = listaSedes[0]?.nombre || "Estacionamiento Centro";

        snapLugares.forEach((docSnap) => {
          const l = docSnap.data();
          if (typeof l.ocupado !== "boolean" && typeof l.estado !== "string") return;

          const ocupado = typeof l.ocupado === "boolean" ? l.ocupado : l.estado === "ocupado";
          const fechaAct = l.ultimaActualizacion?.toDate
            ? l.ultimaActualizacion.toDate()
            : l.ultimaActualizacion
              ? new Date(l.ultimaActualizacion)
              : new Date();

          const fechaLocal = formatearFechaLocal(fechaAct);
          const horaLocal = formatearHoraLocal(fechaAct);
          const distanciaTxt = typeof l.distancia === "number" ? ` · ${l.distancia} cm` : "";

          registrosCargados.push({
            id: `sensor-${docSnap.id}`,
            estacionamiento: l.estacionamiento || sedePorDefecto,
            espacio: `${formatearEspacio(docSnap.id)} (Sensor IoT${distanciaTxt})`,
            fecha: fechaLocal,
            horaOcupacion: `${fechaLocal} ${horaLocal}`,
            horaLiberacion: ocupado ? "En curso" : `${fechaLocal} ${horaLocal}`,
            estado: ocupado ? "Ocupado" : "Completado"
          });
        });
      } catch (error) {
        console.warn("No se pudo leer la colección lugares:", error);
      }
    }

    // 4. Colección "reservas" de Firestore
    try {
      const snapReservas = await getDocs(collection(db, "reservas"));
      const ahora = new Date();

      snapReservas.forEach((docSnap) => {
        const r = docSnap.data();
        const estadoRaw = (r.estado || "").toLowerCase();

        if (estadoRaw === "cancelada") return;

        const fecha = r.fecha || "";
        const horario = r.horario || "00:00";
        const inicio = new Date(`${fecha}T${horario}`);
        const durHoras = parseInt(r.duracion, 10) || 1;
        const fin = new Date(inicio.getTime() + durHoras * 60 * 60 * 1000);

        const estaOcupadoAhora =
          estadoRaw === "activa" &&
          !Number.isNaN(inicio.getTime()) &&
          inicio <= ahora &&
          fin > ahora;

        registrosCargados.push({
          id: docSnap.id,
          estacionamiento: r.estacionamiento || "Estacionamiento Centro",
          espacio: formatearEspacio(r.espacio),
          fecha,
          horaOcupacion: fecha ? `${fecha} ${horario}` : horario,
          horaLiberacion: estaOcupadoAhora
            ? "En curso"
            : calcularHoraLiberacion(fecha, horario, r.duracion),
          estado: estaOcupadoAhora ? "Ocupado" : "Completado"
        });
      });
    } catch (error) {
      console.warn("No se pudo leer la colección reservas:", error);
    }

    // Ordenar
    registrosCargados.sort((a, b) =>
      (b.horaOcupacion || "").localeCompare(a.horaOcupacion || "")
    );

    const nombresSedes = new Set(listaSedes.map((s) => s.nombre).filter(Boolean));
    registrosCargados.forEach((reg) => {
      if (reg.estacionamiento) nombresSedes.add(reg.estacionamiento);
    });

    setEstacionamientos(Array.from(nombresSedes));
    setHistorial(registrosCargados);
    if (!silencioso) setCargando(false);
  }

  function limpiarFiltros() {
    setFiltroEstacionamiento("");
    setFiltroEspacio("");
    setFiltroFechaInicio("");
    setFiltroFechaFin("");
  }

  // Filtrado dinámico
  const historialFiltrado = historial.filter((item) => {
    const coincideEstacionamiento = filtroEstacionamiento
      ? normalizarTexto(item.estacionamiento) === normalizarTexto(filtroEstacionamiento)
      : true;

    const coincideEspacio = filtroEspacio
      ? normalizarTexto(item.espacio).includes(normalizarTexto(filtroEspacio))
      : true;

    const fechaRegistro =
      item.fecha || (item.horaOcupacion ? item.horaOcupacion.slice(0, 10) : "");

    const coincideFechaInicio = filtroFechaInicio
      ? fechaRegistro >= filtroFechaInicio
      : true;

    const coincideFechaFin = filtroFechaFin
      ? fechaRegistro <= filtroFechaFin
      : true;

    return (
      coincideEstacionamiento &&
      coincideEspacio &&
      coincideFechaInicio &&
      coincideFechaFin
    );
  });

  return (
    <div className="pagina">
      {/* 🎨 ESTILOS RESPONSIVOS INTEGRADOS */}
      <style>{`
        .tabla-historial-wrapper {
          overflow-x: auto;
          margin-top: 15px;
        }
        .tabla-historial {
          width: 100%;
          border-collapse: collapse;
          color: #fff;
          text-align: left;
        }
        .tabla-historial th {
          border-bottom: 1px solid #334155;
          color: #00f2fe;
          font-size: 14px;
          padding: 12px;
        }
        .tabla-historial td {
          border-bottom: 1px solid #1e293b;
          font-size: 13px;
          padding: 12px;
        }
        
        .badge-estado {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }
        .badge-ocupado { background: #ef444433; color: #ef4444; }
        .badge-completado { background: #10b98133; color: #10b981; }

        /* 📱 DISEÑO RESPONSIVO PARA CELULARES */
        @media (max-width: 768px) {
          .tabla-historial-wrapper {
            overflow-x: visible;
          }
          .tabla-historial thead {
            display: none;
          }
          .tabla-historial, .tabla-historial tbody, .tabla-historial tr, .tabla-historial td {
            display: block;
            width: 100%;
          }
          .tabla-historial tr {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 12px;
            margin-bottom: 16px;
            padding: 16px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          }
          .tabla-historial td {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 8px 0;
            border-bottom: 1px dashed rgba(255,255,255,0.05);
            text-align: right;
          }
          .tabla-historial td:last-child {
            border-bottom: none;
            padding-bottom: 0;
            margin-top: 8px;
          }
          .tabla-historial td::before {
            content: attr(data-label);
            font-weight: 700;
            color: #00f2fe;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-right: 15px;
            text-align: left;
            flex-shrink: 0;
          }
          /* Destacar el estacionamiento como título de la tarjeta */
          .tabla-historial td[data-label="Estacionamiento"] {
            font-size: 16px;
            color: #fff;
            border-bottom: 2px solid rgba(0, 242, 254, 0.2);
            padding-top: 0;
            margin-bottom: 8px;
            display: block;
            text-align: left;
          }
          .tabla-historial td[data-label="Estacionamiento"]::before {
            display: none;
          }
        }
      `}</style>

      <main className="contenido">
        {/* Migas de pan */}
        <div className="ruta">
          <span>Administración</span>
          <span>/</span>
          <strong>Historial de ocupación</strong>
        </div>

        {/* Introducción */}
        <section className="introduccion">
          <div className="introduccion-icono">
            <History size={27} />
          </div>
          <div>
            <h2>Historial de ocupación por espacio</h2>
            <p>
              Consulta las horas de ocupación y liberación por sede, espacio y rango de fechas.
            </p>
          </div>
        </section>

        {/* Filtros de búsqueda */}
        <div className="formulario" style={{ marginBottom: "25px" }}>
          <div className="formulario-cabecera">
            <div className="seccion-titulo" style={{ margin: 0 }}>
              <Filter size={19} />
              <h4>Filtros de consulta</h4>
            </div>

            <button
              type="button"
              className="boton-secundario"
              onClick={limpiarFiltros}
              style={{ padding: "6px 12px", fontSize: "13px" }}
            >
              <RotateCcw size={15} />
              Limpiar filtros
            </button>
          </div>

          <div
            className="rejilla"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "15px",
              marginTop: "15px"
            }}
          >
            <div className="campo">
              <label htmlFor="filtroEstacionamiento">Estacionamiento</label>
              <select
                id="filtroEstacionamiento"
                value={filtroEstacionamiento}
                onChange={(e) => setFiltroEstacionamiento(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  background: "#0f172a",
                  color: "#fff",
                  border: "1px solid #334155"
                }}
              >
                <option value="">Todos los estacionamientos</option>
                {estacionamientos.map((nombreSede) => (
                  <option key={nombreSede} value={nombreSede}>
                    {nombreSede}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo">
              <label htmlFor="filtroEspacio">Espacio / Cajón</label>
              <input
                id="filtroEspacio"
                type="text"
                placeholder="Ej. Cajón 01 o Sensor"
                value={filtroEspacio}
                onChange={(e) => setFiltroEspacio(e.target.value)}
              />
            </div>

            <div className="campo">
              <label htmlFor="fechaInicio">Fecha inicio</label>
              <input
                id="fechaInicio"
                type="date"
                value={filtroFechaInicio}
                onChange={(e) => setFiltroFechaInicio(e.target.value)}
              />
            </div>

            <div className="campo">
              <label htmlFor="fechaFin">Fecha fin</label>
              <input
                id="fechaFin"
                type="date"
                value={filtroFechaFin}
                onChange={(e) => setFiltroFechaFin(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Tabla de Historial */}
        <div className="formulario">
          <div className="formulario-cabecera">
            <div>
              <h3>Registros de ocupación</h3>
              <p>Detalle cronológico de reservas y sensores IoT en tiempo real.</p>
            </div>
            <span className="estado-nuevo">
              <span className="punto" />
              {cargando ? "Cargando..." : `${historialFiltrado.length} registros`}
            </span>
          </div>

          <div className="tabla-historial-wrapper">
            <table className="tabla-historial">
              <thead>
                <tr>
                  <th>Estacionamiento</th>
                  <th>Espacio</th>
                  <th>Hora de Ocupación</th>
                  <th>Hora de Liberación</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {historialFiltrado.length > 0 ? (
                  historialFiltrado.map((item) => (
                    <tr key={item.id}>
                      {/* Añadimos data-label para el diseño responsivo */}
                      <td data-label="Estacionamiento" style={{ fontWeight: "600" }}>
                        {item.estacionamiento}
                      </td>
                      <td data-label="Espacio">{item.espacio}</td>
                      <td data-label="Ocupación">
                        <Clock
                          size={14}
                          style={{ marginRight: 6, color: "#00f2fe" }}
                        />
                        {item.horaOcupacion}
                      </td>
                      <td data-label="Liberación">
                        <Clock
                          size={14}
                          style={{ marginRight: 6, color: "#94a3b8" }}
                        />
                        {item.horaLiberacion}
                      </td>
                      <td data-label="Estado">
                        <span
                          className={`badge-estado ${
                            item.estado === "Ocupado" ? "badge-ocupado" : "badge-completado"
                          }`}
                        >
                          {item.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        textAlign: "center",
                        padding: "24px",
                        color: "#94a3b8",
                        display: "block", // Necesario para que se vea bien en móvil
                        width: "100%"
                      }}
                    >
                      No se encontraron registros con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="nota-inferior">
          <CheckCircle2 size={15} />
          Información sincronizada con la base de datos y sensores IoT del sistema.
        </p>
      </main>
    </div>
  );
}

export default HistorialOcupacion;