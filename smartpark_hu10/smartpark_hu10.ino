#include <WiFi.h>
#include <PubSubClient.h>

// ==========================================
// 1. CONFIGURACIÓN DE RED Y HIVEMQ
// ==========================================
const char* ssid = "INFINITUM51E3_2.4";          // Tu red WiFi
const char* password = "J4qUNSkh5T";    // Tu contraseña WiFi

// Datos del Broker HiveMQ
const char* mqtt_server = "broker.hivemq.com"; 
const int mqtt_port = 1883;                  

WiFiClient espClient;
PubSubClient client(espClient);

// ==========================================
// 2. CONFIGURACIÓN DE PINES Y SENSORES
// ==========================================
// Cajón 1 (Ultrasónico)
const int TRIG_PIN_1 = 5;
const int ECHO_PIN_1 = 18;
const char* mqtt_topic_1 = "smartpark/cajones/cajon_1/estado";
bool estadoOcupadoAnterior_1 = false;
const int DISTANCIA_UMBRAL_CM = 17; // Reducido a la mitad (aprox 17 cm) para evitar la pared

// Cajón 2 (Ultrasónico)
const int TRIG_PIN_2 = 19;
const int ECHO_PIN_2 = 21;
const char* mqtt_topic_2 = "smartpark/cajones/cajon_2/estado";
bool estadoOcupadoAnterior_2 = false;

// Cajón 3 (Infrarrojo TCRT5000)
const int SENSOR_IR_PIN_3 = 22;
const char* mqtt_topic_3 = "smartpark/cajones/cajon_3/estado";
bool estadoOcupadoAnterior_3 = false;

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
    String clientId = "ESP32_SmartPark_Multi_";
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

  // Configurar sensores ultrasónicos (Cajón 1 y 2)
  pinMode(TRIG_PIN_1, OUTPUT);
  pinMode(ECHO_PIN_1, INPUT);
  
  pinMode(TRIG_PIN_2, OUTPUT);
  pinMode(ECHO_PIN_2, INPUT);
  
  // Configurar sensor infrarrojo (Cajón 3)
  pinMode(SENSOR_IR_PIN_3, INPUT);

  setupWiFi();
  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();

  // ==========================================
  // LECTURA SENSOR 1 (Ultrasónico - Cajón 1)
  // ==========================================
  digitalWrite(TRIG_PIN_1, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN_1, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN_1, LOW);

  long duracion1 = pulseIn(ECHO_PIN_1, HIGH, 30000);
  float distanciaCm1 = (duracion1 == 0) ? 999.0 : (duracion1 * 0.034 / 2);
  bool estaOcupadoActual1 = (distanciaCm1 > 0 && distanciaCm1 <= DISTANCIA_UMBRAL_CM);

  if (estaOcupadoActual1 != estadoOcupadoAnterior_1) {
    estadoOcupadoAnterior_1 = estaOcupadoActual1;

    String payload = "{";
    payload += "\"cajonId\": \"cajon_1\",";
    payload += "\"ocupado\": " + String(estaOcupadoActual1 ? "true" : "false") + ",";
    payload += "\"distancia\": " + String(distanciaCm1);
    payload += "}";

    client.publish(mqtt_topic_1, payload.c_str());
    Serial.print("Enviado MQTT (cajon_1): ");
    Serial.println(payload);
  }

  delay(100);

  // ==========================================
  // LECTURA SENSOR 2 (Ultrasónico - Cajón 2)
  // ==========================================
  digitalWrite(TRIG_PIN_2, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN_2, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN_2, LOW);

  long duracion2 = pulseIn(ECHO_PIN_2, HIGH, 30000);
  float distanciaCm2 = (duracion2 == 0) ? 999.0 : (duracion2 * 0.034 / 2);
  bool estaOcupadoActual2 = (distanciaCm2 > 0 && distanciaCm2 <= DISTANCIA_UMBRAL_CM);

  if (estaOcupadoActual2 != estadoOcupadoAnterior_2) {
    estadoOcupadoAnterior_2 = estaOcupadoActual2;

    String payload = "{";
    payload += "\"cajonId\": \"cajon_2\",";
    payload += "\"ocupado\": " + String(estaOcupadoActual2 ? "true" : "false") + ",";
    payload += "\"distancia\": " + String(distanciaCm2);
    payload += "}";

    client.publish(mqtt_topic_2, payload.c_str());
    Serial.print("Enviado MQTT (cajon_2): ");
    Serial.println(payload);
  }

  delay(100);

  // ==========================================
  // LECTURA SENSOR 3 (Infrarrojo - Cajón 3)
  // ==========================================
  int valorIR = digitalRead(SENSOR_IR_PIN_3);
  
  // Nota: Si tu módulo IR manda LOW cuando detecta objeto, se queda como 'LOW'.
  // Si notas que funciona al revés, solo cambia 'LOW' por 'HIGH'.
  bool estaOcupadoActual3 = (valorIR == LOW); 

  if (estaOcupadoActual3 != estadoOcupadoAnterior_3) {
    estadoOcupadoAnterior_3 = estaOcupadoActual3;

    // Enviamos el JSON compatible con tu backend de Node.js
    String payload = "{";
    payload += "\"cajonId\": \"cajon_3\",";
    payload += "\"ocupado\": " + String(estaOcupadoActual3 ? "true" : "false") + ",";
    payload += "\"distancia\": " + String(estaOcupadoActual3 ? 5.0 : 50.0); // Simula una distancia pequeña o grande para el JSON
    payload += "}";

    client.publish(mqtt_topic_3, payload.c_str());
    Serial.print("Enviado MQTT (cajon_3 IR): ");
    Serial.println(payload);
  }

  delay(500);
}