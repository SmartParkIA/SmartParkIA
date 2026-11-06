const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const mqtt = require("mqtt");

// 1. Cargar credenciales
const serviceAccount = require("./serviceAccountKey.json");

// 2. Inicializar Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

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