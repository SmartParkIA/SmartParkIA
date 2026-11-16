import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import {
  History,
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw
} from "lucide-react";
import { db } from "../firebase/config.js";
import "../styles/RegistrarEstacionamiento.css";

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

  // Filtros de la HU-34
  const [filtroEstacionamiento, setFiltroEstacionamiento] = useState("");
  const [filtroEspacio, setFiltroEspacio] = useState("");
  const [filtroFechaInicio, setFiltroFechaInicio] = useState("");
  const [filtroFechaFin, setFiltroFechaFin] = useState("");

  useEffect(() => {
    cargarDatosIniciales(false);

    // Refresco automático cada 5 segundos para ver nuevos ingresos/salidas del circuito
    const intervalo = setInterval(() => {
      cargarDatosIniciales(true);
    }, 5000);

    return () => clearInterval(intervalo);
  }, []);

  async function cargarDatosIniciales(silencioso = false) {
    if (!silencioso) setCargando(true);
    let listaSedes = [];
    const registrosCargados = [];

    // 1. Cargar lista real de estacionamientos desde el backend
    try {
      const respEst = await fetch("http://localhost:3001/api/estacionamientos");
      if (respEst.ok) {
        listaSedes = await respEst.json();
      }
    } catch (error) {
      console.warn("No se pudieron cargar sedes desde el backend:", error);
    }

    // 2. Consultar todos los eventos históricos registrados por los sensores IoT
    let tieneHistorialSensores = false;
    try {
      const respHist = await fetch("http://localhost:3001/api/historial-ocupacion");
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

    // 3. Si aún no hay ciclos acumulados, mostramos el estado actual de "lugares"
    if (!tieneHistorialSensores) {
      try {
        const snapLugares = await getDocs(collection(db, "lugares"));
        const sedePorDefecto = listaSedes[0]?.nombre || "Estacionamiento Centro";

        snapLugares.forEach((docSnap) => {
          const l = docSnap.data();
          if (typeof l.ocupado !== "boolean" && typeof l.estado !== "string") {
            return;
          }

          const ocupado =
            typeof l.ocupado === "boolean" ? l.ocupado : l.estado === "ocupado";

          const fechaAct = l.ultimaActualizacion?.toDate
            ? l.ultimaActualizacion.toDate()
            : l.ultimaActualizacion
              ? new Date(l.ultimaActualizacion)
              : new Date();

          const fechaLocal = formatearFechaLocal(fechaAct);
          const horaLocal = formatearHoraLocal(fechaAct);
          const distanciaTxt =
            typeof l.distancia === "number" ? ` · ${l.distancia} cm` : "";

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

    // 4. Consultar registros históricos desde la colección "reservas" en Firestore
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

    // Ordenar del más reciente al más antiguo
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

  // Filtrado dinámico por estacionamiento, espacio y rango de fechas (HU-34)
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

          <div style={{ overflowX: "auto", marginTop: "15px" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                color: "#fff",
                textAlign: "left"
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #334155",
                    color: "#00f2fe",
                    fontSize: "14px"
                  }}
                >
                  <th style={{ padding: "12px" }}>Estacionamiento</th>
                  <th style={{ padding: "12px" }}>Espacio</th>
                  <th style={{ padding: "12px" }}>Hora de Ocupación</th>
                  <th style={{ padding: "12px" }}>Hora de Liberación</th>
                  <th style={{ padding: "12px" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {historialFiltrado.length > 0 ? (
                  historialFiltrado.map((item) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid #1e293b",
                        fontSize: "13px"
                      }}
                    >
                      <td style={{ padding: "12px", fontWeight: "600" }}>
                        {item.estacionamiento}
                      </td>
                      <td style={{ padding: "12px" }}>{item.espacio}</td>
                      <td style={{ padding: "12px" }}>
                        <Clock
                          size={14}
                          style={{ marginRight: 6, verticalAlign: "middle", color: "#00f2fe" }}
                        />
                        {item.horaOcupacion}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <Clock
                          size={14}
                          style={{ marginRight: 6, verticalAlign: "middle", color: "#94a3b8" }}
                        />
                        {item.horaLiberacion}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: "600",
                            background:
                              item.estado === "Ocupado" ? "#ef444433" : "#10b98133",
                            color: item.estado === "Ocupado" ? "#ef4444" : "#10b981"
                          }}
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
                        color: "#94a3b8"
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