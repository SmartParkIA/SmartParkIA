require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mqtt = require("mqtt");
const { db, FieldValue } = require("./firebaseAdmin");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// ==========================================
// 1. CONFIGURACIÓN MQTT
// ==========================================

const MQTT_BROKER =
  process.env.MQTT_BROKER_URL || "mqtt://broker.hivemq.com:1883";

const MQTT_TOPIC =
  process.env.MQTT_TOPIC || "smartpark/cajones/+/estado";

let mqttConectado = false;

const clienteMQTT = mqtt.connect(MQTT_BROKER, {
  clientId: `smartpark_backend_${Math.random().toString(16).slice(2, 10)}`,
  clean: true,
  connectTimeout: 10000,
  reconnectPeriod: 5000,
  keepalive: 60
});

clienteMQTT.on("connect", () => {
  console.log("Conectado al broker HiveMQ.");

  clienteMQTT.subscribe(MQTT_TOPIC, { qos: 0 }, (error) => {
    if (error) {
      console.error("Error al suscribirse a MQTT:", error.message);
      mqttConectado = false;
      return;
    }

    mqttConectado = true;
    console.log("Suscripción MQTT activa:", MQTT_TOPIC);
  });
});

clienteMQTT.on("reconnect", () => {
  mqttConectado = false;
  console.log("Reconectando con HiveMQ...");
});

clienteMQTT.on("offline", () => {
  mqttConectado = false;
  console.log("Cliente MQTT desconectado.");
});

clienteMQTT.on("error", (error) => {
  mqttConectado = false;
  console.error("Error MQTT:", error.message);
});

// ==========================================
// 2. RECIBIR DATOS DEL ESP32 Y GUARDAR EN FIRESTORE
// ==========================================

clienteMQTT.on("message", async (topic, payload) => {
  try {
    const datos = JSON.parse(payload.toString());

    const coincidencia = topic.match(
      /^smartpark\/cajones\/([^/]+)\/estado$/
    );

    if (!coincidencia) {
      console.warn("Tópico MQTT no reconocido:", topic);
      return;
    }

    const cajonId = coincidencia[1];

    if (datos.cajonId !== cajonId) {
      console.warn("El cajonId no coincide con el tópico.");
      return;
    }

    if (
      typeof datos.ocupado !== "boolean" ||
      typeof datos.distancia !== "number" ||
      !Number.isFinite(datos.distancia) ||
      datos.distancia < 0
    ) {
      console.warn("Datos del sensor inválidos:", datos);
      return;
    }

    const estado = datos.ocupado ? "ocupado" : "disponible";

    const actualizacion = {
      ocupado: datos.ocupado,
      distancia: datos.distancia,
      estado,
      ultimaActualizacion: FieldValue.serverTimestamp()
    };

    await db
      .collection("lugares")
      .doc(cajonId)
      .set(actualizacion, { merge: true });

    console.log(
      `Firestore actualizado: ${cajonId} - ${estado} - ${datos.distancia} cm`
    );

  } catch (error) {
    console.error("Error procesando mensaje MQTT:", error.message);
  }
});

// ==========================================
// 3. API GENERAL
// ==========================================

app.get("/", (req, res) => {
  res.json({
    mensaje: "API de SmartParkIA conectada con Firebase y HiveMQ",
    mqtt: mqttConectado ? "conectado" : "desconectado"
  });
});

app.get("/api/mqtt/estado", (req, res) => {
  res.json({
    conectado: mqttConectado,
    broker: MQTT_BROKER,
    topico: MQTT_TOPIC
  });
});

// ==========================================
// 4. REGISTRAR ESTACIONAMIENTO (con coordenadas)
// ==========================================

app.post("/api/estacionamientos", async (req, res) => {
  try {
    const {
      nombre,
      direccion,
      ciudad,
      capacidad,
      hora_apertura,
      hora_cierre,
      telefono,
      lat,
      lng,
    } = req.body;

    // --- Validación de campos de texto ---
    if (
      typeof nombre !== "string" ||
      typeof direccion !== "string" ||
      typeof ciudad !== "string" ||
      typeof telefono !== "string" ||
      !nombre.trim() ||
      !direccion.trim() ||
      !ciudad.trim() ||
      !telefono.trim() ||
      capacidad === undefined ||
      capacidad === null ||
      String(capacidad).trim() === "" ||
      !hora_apertura ||
      !hora_cierre
    ) {
      return res.status(400).json({
        mensaje: "Todos los campos son obligatorios."
      });
    }

    // --- Validación de capacidad ---
    const capacidadNumero = Number(capacidad);
    if (!Number.isSafeInteger(capacidadNumero) || capacidadNumero <= 0) {
      return res.status(400).json({
        mensaje: "La capacidad debe ser un entero mayor que cero."
      });
    }

    // --- Validación de longitudes ---
    if (
      nombre.trim().length > 100 ||
      direccion.trim().length > 200 ||
      ciudad.trim().length > 100 ||
      telefono.trim().length > 20
    ) {
      return res.status(400).json({
        mensaje: "Uno o más campos exceden la longitud permitida."
      });
    }

    // --- Validación de horas ---
    const horaValida = (hora) =>
      typeof hora === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);

    if (!horaValida(hora_apertura) || !horaValida(hora_cierre)) {
      return res.status(400).json({
        mensaje: "Las horas deben tener el formato HH:MM."
      });
    }

    // --- Validación de coordenadas (obligatorias) ---
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        mensaje: "Debes seleccionar una ubicación válida en el mapa."
      });
    }

    // --- Documento a guardar (coordenadas dentro del mismo doc) ---
    const nuevoEstacionamiento = {
      nombre: nombre.trim(),
      direccion: direccion.trim(),
      ciudad: ciudad.trim(),
      capacidad: capacidadNumero,
      hora_apertura,
      hora_cierre,
      telefono: telefono.trim(),
      lat,
      lng,
      estado: "activo",
      fecha_registro: FieldValue.serverTimestamp()
    };

    const documento = await db
      .collection("estacionamientos")
      .add(nuevoEstacionamiento);

    return res.status(201).json({
      mensaje: "Estacionamiento registrado correctamente.",
      estacionamiento: {
        id: documento.id,
        nombre: nuevoEstacionamiento.nombre,
        direccion: nuevoEstacionamiento.direccion,
        ciudad: nuevoEstacionamiento.ciudad,
        capacidad: capacidadNumero,
        hora_apertura,
        hora_cierre,
        telefono: nuevoEstacionamiento.telefono,
        lat,
        lng,
        estado: "activo"
      }
    });

  } catch (error) {
    console.error("Error al registrar estacionamiento:", error);
    return res.status(500).json({
      mensaje: "No fue posible registrar el estacionamiento."
    });
  }
});

// ==========================================
// 5. CONSULTAR ESTACIONAMIENTOS
// ==========================================

app.get("/api/estacionamientos", async (req, res) => {
  try {
    const consulta = await db
      .collection("estacionamientos")
      .orderBy("fecha_registro", "desc")
      .get();

    const estacionamientos = consulta.docs.map((documento) => ({
      id: documento.id,
      ...documento.data()
    }));

    return res.json(estacionamientos);

  } catch (error) {
    console.error("Error al consultar estacionamientos:", error);
    return res.status(500).json({
      mensaje: "No fue posible consultar los estacionamientos."
    });
  }
});

// ==========================================
// 6. INICIAR SERVIDOR
// ==========================================

const servidor = app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
  console.log("Firebase Firestore preparado.");
});

function cerrarServidor() {
  console.log("Cerrando conexiones...");
  clienteMQTT.end(true);
  servidor.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", cerrarServidor);
process.on("SIGTERM", cerrarServidor);