#include <WiFi.h>
#include <PubSubClient.h>

// ==========================================
// 1. CONFIGURACIÓN DE RED Y HIVEMQ
// ==========================================
const char* ssid = "INFINITUM51E3_2.4";          // Tu red WiFi
const char* password = "J4qUNSkh5T";    // Tu contraseña WiFi

// Datos del Broker HiveMQ[cite: 5]
const char* mqtt_server = "broker.hivemq.com"; 
const int mqtt_port = 1883;                   
const char* mqtt_topic = "smartpark/cajones/cajon_1/estado";

WiFiClient espClient;
PubSubClient client(espClient);

// ==========================================
// 2. CONFIGURACIÓN DE PINES (SOLO SENSOR)
// ==========================================
const int TRIG_PIN = 5;
const int ECHO_PIN = 18;

// Parámetros de detección
const int DISTANCIA_UMBRAL_CM = 20; // Menos de 20 cm = Ocupado
bool estadoOcupadoAnterior = false;  // Para enviar eventos solo cuando cambie el estado

// ==========================================
// 3. FUNCIONES DE CONEXIÓN
// ==========================================
void setupWiFi() {
  delay(10);
  Serial.println("\nConectando a WiFi...");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Conectado!");
  Serial.print("Direccion IP: ");
  Serial.println(WiFi.localIP());
}

void reconnectMQTT() {
  while (!client.connected()) {
    Serial.print("Intentando conexion MQTT con HiveMQ...");
    String clientId = "ESP32_SmartPark_Cajon1_";
    clientId += String(random(0xffff), HEX);

    if (client.connect(clientId.c_str())) {
      Serial.println("Conectado exitosamente a HiveMQ!");
    } else {
      Serial.print("Fallo conexion MQTT, rc=");
      Serial.print(client.state());
      Serial.println(" Intentando de nuevo en 5 segundos...");
      delay(5000);
    }
  }
}

// ==========================================
// 4. SETUP Y LOOP PRINCIPAL
// ==========================================
void setup() {
  Serial.begin(115200);

  // Configurar pines del sensor ultrasónico
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  setupWiFi();
  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();

  // --- LECTURA DEL SENSOR ULTRASÓNICO ---
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duracion = pulseIn(ECHO_PIN, HIGH);
  float distanciaCm = duracion * 0.034 / 2;

  bool estaOcupadoActual = (distanciaCm > 0 && distanciaCm <= DISTANCIA_UMBRAL_CM);

  // Monitoreo en Monitor Serie
  Serial.print("Distancia: ");
  Serial.print(distanciaCm);
  Serial.print(" cm | Estado: ");
  Serial.println(estaOcupadoActual ? "OCUPADO" : "LIBRE");

  // --- SI CAMBIA DE ESTADO, ENVIAR JSON A HIVEMQ ---
  if (estaOcupadoActual != estadoOcupadoAnterior) {
    estadoOcupadoAnterior = estaOcupadoActual;

    // Crear estructura JSON para el backend
    String payload = "{";
    payload += "\"cajonId\": \"cajon_1\",";
    payload += "\"ocupado\": " + String(estaOcupadoActual ? "true" : "false") + ",";
    payload += "\"distancia\": " + String(distanciaCm);
    payload += "}";

    // Publicar en HiveMQ[cite: 5]
    client.publish(mqtt_topic, payload.c_str());
    Serial.print("Evento enviado a HiveMQ: ");
    Serial.println(payload);
  }

  delay(500);
}