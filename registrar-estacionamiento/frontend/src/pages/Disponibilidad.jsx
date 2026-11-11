import { useEffect, useState } from "react";

import {
  Activity,
  ArrowLeft,
  CarFront,
  CheckCircle2,
  CircleParking,
  Clock,
  Radio,
  Wifi,
  WifiOff,
  Sparkles
} from "lucide-react";

import {
  collection,
  onSnapshot
} from "firebase/firestore";

import { db } from "../firebase";

import "../styles/Disponibilidad.css";

function Disponibilidad() {
  const [espacios, setEspacios] = useState([]);
  const [conexion, setConexion] = useState("conectando");
  const [ultimoMensaje, setUltimoMensaje] = useState(null);
  
  // Estado nuevo para la predicción de la IA (sin afectar lo demás)
  const [prediccion, setPrediccion] = useState(null);

  useEffect(() => {
    const referencia = collection(db, "lugares");

    const cancelarSuscripcion = onSnapshot(
      referencia,
      (snapshot) => {
        const espaciosFirebase = snapshot.docs
          .map((documento) => {
            const datos = documento.data();

            // Ignorar documentos que no representan cajones
            if (
              typeof datos.ocupado !== "boolean" &&
              typeof datos.estado !== "string"
            ) {
              return null;
            }

            const ocupado =
              typeof datos.ocupado === "boolean"
                ? datos.ocupado
                : datos.estado === "ocupado";

            const fecha = datos.ultimaActualizacion;

            return {
              id: documento.id,
              estado: ocupado ? "ocupado" : "libre",
              distancia: datos.distancia ?? null,
              actualizado:
                fecha?.toDate
                  ? fecha.toDate()
                  : fecha
                    ? new Date(fecha)
                    : null
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.id.localeCompare(b.id));

        setEspacios(espaciosFirebase);
        setConexion("conectado");

        const fechas = espaciosFirebase
          .map((espacio) => espacio.actualizado)
          .filter(
            (fecha) =>
              fecha instanceof Date &&
              !Number.isNaN(fecha.getTime())
          );

        if (fechas.length > 0) {
          setUltimoMensaje(
            new Date(Math.max(...fechas.map((fecha) => fecha.getTime())))
          );
        }
      },
      (error) => {
        console.error("Error escuchando Firestore:", error);
        setConexion("error");
      }
    );

    return () => cancelarSuscripcion();
  }, []);

  // Efecto independiente para consultar la API de predicción (Bridge)
  useEffect(() => {
    async function obtenerPrediccionIA() {
      try {
        // Asegúrate de que tu backend smartpark-bridge esté corriendo en el puerto 3000 (o el que uses)
        const respuesta = await fetch("http://localhost:3000/api/v1/prediccion/ocupacion");
        const resultado = await respuesta.json();
        
        if (resultado.status === "success") {
          setPrediccion(resultado.data);
        }
      } catch (error) {
        console.error("No se pudo conectar con la API de predicción:", error);
      }
    }

    obtenerPrediccionIA();
  }, []);

  const total = espacios.length;

  const ocupados = espacios.filter(
    (espacio) => espacio.estado === "ocupado"
  ).length;

  const libres = total - ocupados;

  const porcentaje = total
    ? Math.round((ocupados / total) * 100)
    : 0;

  function regresar() {
    window.location.href = "/";
  }

  function nombreCajon(id) {
    const coincidencia = id.match(/^cajon_(\d+)$/i);

    return coincidencia
      ? `Cajón ${coincidencia[1]}`
      : id;
  }

  return (
    <div className="disponibilidad">
      <header className="disp-header">
        <div className="disp-marca">
          <div className="disp-logo">
            <CircleParking size={27} />
          </div>

          <div>
            <h1>SmartParkIA</h1>
            <p>Monitoreo inteligente de estacionamientos</p>
          </div>
        </div>

        <button
          className="disp-volver"
          onClick={regresar}
          type="button"
        >
          <ArrowLeft size={17} />
          Regresar
        </button>
      </header>

      <main className="disp-contenido">
        <div className="disp-titulo">
          <div>
            <span className="disp-subtitulo">
              MONITOREO / DISPONIBILIDAD
            </span>

            <h2>Disponibilidad en tiempo real</h2>

            <p>
              Consulta el estado actual de los espacios de estacionamiento.
            </p>
          </div>

          <div className={`conexion conexion-${conexion}`}>
            {conexion === "conectado" ? (
              <Wifi size={17} />
            ) : (
              <WifiOff size={17} />
            )}

            <span>
              {conexion === "conectado"
                ? "Conectado a Firebase"
                : conexion === "conectando"
                  ? "Conectando con Firebase..."
                  : "Error de conexión"}
            </span>
          </div>
        </div>

        <section className="disp-estacionamiento">
          <div className="disp-estacionamiento-info">
            <div className="disp-icono">
              <CircleParking size={25} />
            </div>

            <div>
              <h3>Estacionamiento Centro</h3>
              <p>
                <Activity size={14} />
                Monitoreo mediante sensores IoT y MQTT
              </p>
            </div>
          </div>

          <span className="disp-identificador">
            SEDE #001
          </span>
        </section>

        <section className="disp-estadisticas">
          <article className="disp-card">
            <span>Total de espacios</span>
            <div>
              <strong>{total}</strong>
              <CircleParking size={24} />
            </div>
          </article>

          <article className="disp-card">
            <span>Espacios disponibles</span>
            <div>
              <strong>{libres}</strong>
              <CheckCircle2 size={24} />
            </div>
          </article>

          <article className="disp-card">
            <span>Espacios ocupados</span>
            <div>
              <strong>{ocupados}</strong>
              <CarFront size={24} />
            </div>
          </article>
        </section>

        {/* --- NUEVA TARJETA DE PREDICCIÓN IA (Integración Tarea 065/066) --- */}
        <section className="disp-estadisticas" style={{ marginTop: "15px" }}>
          <article className="disp-card" style={{ gridColumn: "1 / -1", background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)", borderLeft: "4px solid #4f46e5" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <div>
                <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#4f46e5", fontWeight: "600", marginBottom: "4px" }}>
                  <Sparkles size={16} /> Pronóstico de Ocupación Inteligente (IA)
                </span>
                {prediccion ? (
                  <p style={{ fontSize: "0.9rem", color: "#4b5563", margin: "4px 0 0 0" }}>
                    Estimado para el día <strong>{prediccion.diaSemana}</strong> a las <strong>{prediccion.horaConsulta} hrs</strong>: <strong style={{ color: "#1f2937" }}>{prediccion.porcentajeEstimado}% de ocupación</strong> ({prediccion.nivelSaturacion})
                  </p>
                ) : (
                  <p style={{ fontSize: "0.9rem", color: "#6b7280", margin: "4px 0 0 0" }}>Cargando pronóstico desde el backend...</p>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <strong style={{ fontSize: "1.5rem", color: "#4f46e5" }}>
                  {prediccion ? `${prediccion.porcentajeEstimado}%` : "..."}
                </strong>
              </div>
            </div>
          </article>
        </section>

        <section className="disp-panel">
          <div className="disp-panel-cabecera">
            <div>
              <h3>Mapa de espacios</h3>
              <p>
                Estado real de los cajones registrados en Firebase.
              </p>
            </div>

            <div className="disp-leyenda">
              <span>
                <i className="punto-libre" /> Libre
              </span>

              <span>
                <i className="punto-ocupado" /> Ocupado
              </span>
            </div>
          </div>

          <div className="disp-progreso">
            <div className="disp-progreso-texto">
              <span>Ocupación del estacionamiento</span>
              <strong>{porcentaje}%</strong>
            </div>

            <div className="barra-fondo">
              <div
                className="barra-ocupacion"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>

          <div className="disp-grid">
            {espacios.map((espacio) => (
              <article
                key={espacio.id}
                className={`espacio espacio-${espacio.estado}`}
              >
                <CarFront size={29} />

                <strong>{nombreCajon(espacio.id)}</strong>

                <span>
                  {espacio.estado === "libre"
                    ? "DISPONIBLE"
                    : "OCUPADO"}
                </span>

                {espacio.distancia !== null && (
                  <small>
                    {espacio.distancia} cm
                  </small>
                )}
              </article>
            ))}
          </div>

          {espacios.length === 0 && (
            <div className="disp-actividad">
              <p>
                {conexion === "error"
                  ? "No se pudieron consultar los espacios."
                  : "Todavía no hay cajones registrados en Firestore."}
              </p>
            </div>
          )}
        </section>

        <section className="disp-actividad">
          <div>
            <Clock size={19} />
            <h3>Actividad de comunicación</h3>
          </div>

          <p>
            {ultimoMensaje
              ? `Última actualización del sensor: ${ultimoMensaje.toLocaleTimeString()}`
              : "Esperando la primera actualización del sensor..."}
          </p>

          <small>
            <Radio size={14} />
            ESP32 · HiveMQ MQTT · Firebase Firestore
          </small>
        </section>

        <div className="disp-pie">
          SmartParkIA · Sistema de monitoreo de disponibilidad
        </div>
      </main>
    </div>
  );
}

export default Disponibilidad;