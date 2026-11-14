
import mqtt from "mqtt";

const BROKER_URL = "ws://broker.hivemq.com:8000/mqtt";

export const MQTT_TOPIC =
  "smartparkia/juan-solano/estacionamiento-001/espacios";

let cliente = null;

export function conectarMQTT(onMessage, onStatus) {
  if (cliente) {
    cliente.end(true);
    cliente = null;
  }

  cliente = mqtt.connect(BROKER_URL, {
    clientId: `smartparkia_web_${Math.random().toString(16).slice(2, 10)}`,
    clean: true,
    connectTimeout: 10000,
    reconnectPeriod: 3000,
    keepalive: 60
  });

  cliente.on("connect", () => {
    console.log("Conectado a HiveMQ");
    onStatus("conectado");

    cliente.subscribe(MQTT_TOPIC, { qos: 0 }, (error) => {
      if (error) {
        console.error("Error al suscribirse:", error);
        onStatus("error");
      } else {
        console.log("Suscrito al tópico:", MQTT_TOPIC);
      }
    });
  });

  cliente.on("message", (topic, payload) => {
    if (topic !== MQTT_TOPIC) return;

    try {
      const datos = JSON.parse(payload.toString());
      onMessage(datos);
    } catch (error) {
      console.error("Mensaje MQTT inválido:", error);
    }
  });

  cliente.on("reconnect", () => {
    onStatus("reconectando");
  });

  cliente.on("offline", () => {
    onStatus("desconectado");
  });

  cliente.on("error", (error) => {
    console.error("Error MQTT:", error.message);
    onStatus("error");
  });

  return cliente;
}

export function publicarDisponibilidad(datos) {
  return new Promise((resolve, reject) => {
    if (!cliente || !cliente.connected) {
      reject(new Error("No hay conexión con HiveMQ"));
      return;
    }

    cliente.publish(
      MQTT_TOPIC,
      JSON.stringify(datos),
      { qos: 0, retain: false },
      (error) => {
        if (error) reject(error);
        else resolve();
      }
    );
  });
}

export function desconectarMQTT() {
  if (cliente) {
    cliente.end(true);
    cliente = null;
  }
}
