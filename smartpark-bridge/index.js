const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const mqtt = require("mqtt");
const express = require("express"); // <-- 1. Añadido para levantar el servidor API
const cors = require("cors");       // <-- 2. Añadido para permitir conexión con React

// Importar controlador de predicción (Ajusta la ruta si tu controller está en otra carpeta, ej: "./src/controllers/predictionController")
// const { obtenerPrediccionOcupacion } = require("./services/prediction/predictionController");

// 1. Cargar credenciales
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

// Ruta para la predicción de ocupación (Conectada con tu lógica de IA)
app.get("/api/v1/prediccion/ocupacion", async (req, res) => {
  try {
    // Aquí puedes llamar a tu función del controlador de predicción o retornar los datos calculados
    // Ejemplo de respuesta estándar para la interfaz de tu compañero:
    const fechaActual = new Date();
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const diaSemana = dias[fechaActual.getDay()];
    const horaConsulta = fechaActual.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    res.json({
      status: "success",
      data: {
        diaSemana: diaSemana,
        horaConsulta: horaConsulta,
        porcentajeEstimado: 35, // O el resultado real de tu modelo
        nivelSaturacion: "Moderado"
      }
    });
  } catch (error) {
    console.error("Error al calcular la predicción:", error);
    res.status(500).json({ status: "error", message: "No se pudo calcular la predicción" });
  }
});

// 3. Conexión al broker MQTT de HiveMQ
const mqttBroker = "mqtt://broker.hivemq.com:1883";
// MODIFICACIÓN: Usamos el comodín '+' para escuchar cajon_1, cajon_2 y cajon_3
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