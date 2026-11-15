const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const mqtt = require("mqtt");
const express = require("express"); // <-- 1. Servidor API
const cors = require("cors");       // <-- 2. Permitir conexión con React

// Cargar credenciales
const serviceAccount = require("./serviceAccountKey.json");

// 2. Inicializar Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// --- CONFIGURACIÓN DE EXPRESS Y API BRIDGE ---
const app = express();
app.use(cors()); // Permite que el frontend (puerto 5173) consulte este backend sin bloqueos
app.use(express.json());

// Ruta para la predicción de ocupación en tiempo real basada en Firestore
app.get("/api/v1/prediccion/ocupacion", async (req, res) => {
  try {
    const fechaActual = new Date();
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const diaSemana = dias[fechaActual.getDay()];
    const horaConsulta = fechaActual.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Consultar el estado real de los cajones en Firestore en tiempo real
    const snapshot = await db.collection("lugares").get();
    let totalCajones = 0;
    let cajonesOcupados = 0;

    snapshot.forEach((doc) => {
      const datos = doc.data();
      if (typeof datos.ocupado === "boolean" || typeof datos.estado === "string") {
        totalCajones++;
        const estaOcupado = typeof datos.ocupado === "boolean" ? datos.ocupado : datos.estado === "ocupado";
        if (estaOcupado) {
          cajonesOcupados++;
        }
      }
    });

    const porcentajeReal = totalCajones > 0 ? Math.round((cajonesOcupados / totalCajones) * 100) : 0;

    let nivel = "Bajo";
    if (porcentajeReal > 40) nivel = "Moderado";
    if (porcentajeReal > 75) nivel = "Alto";

    res.json({
      status: "success",
      mensaje: "Datos obtenidos correctamente en tiempo real desde Firebase",
      data: {
        diaSemana: diaSemana,
        horaConsulta: horaConsulta,
        porcentajeEstimado: porcentajeReal,
        nivelSaturacion: nivel
      }
    });
  } catch (error) {
    console.error("Error al calcular la predicción:", error);
    res.status(500).json({ status: "error", message: "No se pudo calcular la predicción", detalles: error.message });
  }
});

// NUEVO ENDPOINT: Ruta para ordenar la apertura de la barrera (Servomotor) vía MQTT
app.post("/api/v1/barrera/abrir", (req, res) => {
  client.publish("smartpark/barrera/control", "ABRIR", (err) => {
    if (err) {
      console.error("❌ Error al publicar comando MQTT para la barrera:", err);
      return res.status(500).json({ status: "error", message: "No se pudo enviar la orden al ESP32" });
    }
    console.log("🔓 Comando 'ABRIR' enviado exitosamente al ESP32 (topic: smartpark/barrera/control)");
    res.json({ status: "success", mensaje: "Orden de apertura de barrera enviada al dispositivo" });
  });
});

// 3. Conexión al broker MQTT de HiveMQ
const mqttBroker = "mqtt://broker.hivemq.com:1883";
const topic = "smartpark/cajones/+/estado";

console.log("Conectando al broker MQTT de HiveMQ...");
const client = mqtt.connect(mqttBroker);

client.on("connect", () => {
  console.log("¡Conectado exitosamente a HiveMQ!");
  client.subscribe(topic, (err) => {
    if (!err) {
      console.log(`Suscrito correctamente al tópico: ${topic}`);
    }
  });
});

// 4. Escuchar mensajes del ESP32 y actualizar Firestore
client.on("message", async (topic, message) => {
  try {
    const payloadStr = message.toString();
    console.log(`Mensaje recibido [${topic}]: ${payloadStr}`);
    
    const data = JSON.parse(payloadStr);
    const cajonId = data.cajonId || "cajon_1";
    const cajonRef = db.collection("lugares").doc(cajonId);
    
    await cajonRef.set({
      ocupado: data.ocupado,
      distancia: data.distancia,
      estado: data.ocupado ? "ocupado" : "disponible",
      ultimaActualizacion: FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`✅ Firestore actualizado para ${cajonId}! Estado: ${data.ocupado ? "Ocupado" : "Disponible"}`);

  } catch (error) {
    console.error("❌ Error al procesar mensaje:", error);
  }
});

// 5. Iniciar servidor Express (Bridge) en el puerto 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor bridge y API corriendo en http://localhost:${PORT}`);
});