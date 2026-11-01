
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CarFront,
  CheckCircle2,
  CircleParking,
  Clock,
  Radio,
  RefreshCw,
  Wifi,
  WifiOff
} from "lucide-react";

import {
  conectarMQTT,
  desconectarMQTT,
  publicarDisponibilidad
} from "../services/mqttService";

import "../styles/Disponibilidad.css";

const espaciosIniciales = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  estado: index < 5 ? "ocupado" : "libre",
  actualizado: null
}));

function Disponibilidad() {
  const [espacios, setEspacios] = useState(espaciosIniciales);
  const [conexion, setConexion] = useState("conectando");
  const [ultimoMensaje, setUltimoMensaje] = useState(null);
  const [publicando, setPublicando] = useState(false);

  useEffect(() => {
    const cliente = conectarMQTT(
      (datos) => {
        if (
          !Number.isInteger(datos.spaceId) ||
          !["libre", "ocupado"].includes(datos.status)
        ) {
          console.warn("Actualización de espacio inválida:", datos);
          return;
        }

        setEspacios((anteriores) =>
          anteriores.map((espacio) =>
            espacio.id === datos.spaceId
              ? {
                  ...espacio,
                  estado: datos.status,
                  actualizado: datos.updatedAt || new Date().toISOString()
                }
              : espacio
          )
        );

        setUltimoMensaje(new Date());
      },
      (estado) => {
        setConexion(estado);
      }
    );

    return () => {
      cliente.end(true);
      desconectarMQTT();
    };
  }, []);

  const total = espacios.length;

  const ocupados = espacios.filter(
    (espacio) => espacio.estado === "ocupado"
  ).length;

  const libres = total - ocupados;

  const porcentaje = total
    ? Math.round((ocupados / total) * 100)
    : 0;

  async function simularCambio(espacio) {
    if (conexion !== "conectado") {
      alert("Primero debes conectar con HiveMQ.");
      return;
    }

    const nuevoEstado =
      espacio.estado === "libre" ? "ocupado" : "libre";

    const mensaje = {
      spaceId: espacio.id,
      status: nuevoEstado,
      updatedAt: new Date().toISOString(),
      source: "SmartParkIA-simulador"
    };

    setPublicando(true);

    try {
      await publicarDisponibilidad(mensaje);
    } catch (error) {
      alert(error.message);
    } finally {
      setPublicando(false);
    }
  }

  function simularTodos() {
    const disponibles = espacios.filter(
      (espacio) => espacio.estado === "libre"
    );

    const siguiente = disponibles[0] || espacios[0];

    if (siguiente) {
      simularCambio(siguiente);
    }
  }

  function regresar() {
    window.location.href = "/";
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

        <button className="disp-volver" onClick={regresar}>
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
                ? "Conectado a HiveMQ"
                : conexion === "conectando"
                ? "Conectando..."
                : conexion === "reconectando"
                ? "Reconectando..."
                : "Desconectado"}
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
                Monitoreo mediante protocolo MQTT
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

        <section className="disp-panel">
          <div className="disp-panel-cabecera">
            <div>
              <h3>Mapa de espacios</h3>
              <p>Estado individual de cada cajón de estacionamiento.</p>
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
              <button
                key={espacio.id}
                className={`espacio espacio-${espacio.estado}`}
                onClick={() => simularCambio(espacio)}
                disabled={conexion !== "conectado" || publicando}
                title={`Espacio ${espacio.id}: ${espacio.estado}. Pulsa para simular un cambio.`}
              >
                <CarFront size={29} />

                <strong>
                  E-{String(espacio.id).padStart(2, "0")}
                </strong>

                <span>
                  {espacio.estado === "libre" ? "DISPONIBLE" : "OCUPADO"}
                </span>
              </button>
            ))}
          </div>

          <div className="disp-acciones">
            <button
              className="disp-boton"
              onClick={simularTodos}
              disabled={conexion !== "conectado" || publicando}
            >
              <RefreshCw size={17} />
              Simular cambio de espacio
            </button>

            <span className="disp-ayuda">
              Pulsa un espacio para cambiar su estado mediante MQTT.
            </span>
          </div>
        </section>

        <section className="disp-actividad">
          <div>
            <Clock size={19} />
            <h3>Actividad de comunicación</h3>
          </div>

          <p>
            {ultimoMensaje
              ? `Última actualización recibida: ${ultimoMensaje.toLocaleTimeString()}`
              : "Esperando mensajes del broker MQTT..."}
          </p>

          <small>
            <Radio size={14} />
            Protocolo MQTT · Suscripción activa cuando hay conexión
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
