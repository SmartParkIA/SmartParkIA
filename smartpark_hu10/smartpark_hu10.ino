#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h> // Librería para manejar servos en ESP32

// ==========================================
// 1. CONFIGURACIÓN DE RED Y HIVEMQ
// ==========================================
const char* ssid = "INFINITUM51E3_2.4";          
const char* password = "J4qUNSkh5T";    

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
const int DISTANCIA_UMBRAL_CM = 17; 

// Cajón 2 (Ultrasónico)
const int TRIG_PIN_2 = 19;
const int ECHO_PIN_2 = 21;
const char* mqtt_topic_2 = "smartpark/cajones/cajon_2/estado";
bool estadoOcupadoAnterior_2 = false;

// Cajón 3 (Infrarrojo TCRT5000)
const int SENSOR_IR_PIN_3 = 22;
const char* mqtt_topic_3 = "smartpark/cajones/cajon_3/estado";
bool estadoOcupadoAnterior_3 = false;

// Servomotor para la Barrera (HU-19)
const int SERVO_PIN = 23;
Servo barreraServo;
const char* mqtt_topic_control_servo = "smartpark/barrera/control"; // Tópico para abrir/cerrar desde backend

// ==========================================
// 3. CALLBACK MQTT (Para recibir comandos de apertura)
// ==========================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String mensaje = "";
  for (int i = 0; i < length; i++) {
    mensaje += (char)payload[i];
  }

  Serial.print("Mensaje MQTT recibido [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(mensaje);

  // Si el backend envía la orden de abrir el acceso
  if (String(topic) == mqtt_topic_control_servo) {
    if (mensaje == "ABRIR") {
      Serial.println("¡Acceso autorizado! Abriendo barrera...");
      barreraServo.write(90); // Abre la barrera a 90 grados
      delay(4000);            // Mantiene abierta 4 segundos (tiempo configurable)
      barreraServo.write(0);  // Cierra la barrera automáticamente a 0 grados
      Serial.println("Barrera cerrada.");
    }
  }
}

// ==========================================
// 4. FUNCIONES DE CONEXIÓN
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
      client.subscribe(mqtt_topic_control_servo); // Suscribirse al canal de control de la barrera
    } else {
      Serial.print("Fallo conexion MQTT, rc=");
      Serial.print(client.state());
      Serial.println(" Intentando de nuevo en 5 segundos...");
      delay(5000);
    }
  }
}

// ==========================================
// 5. SETUP Y LOOP PRINCIPAL
// ==========================================
void setup() {
  Serial.begin(115200);

  // Inicializar servomotor
  ESP32PWM::allocateTimer(0);
  barreraServo.setPeriodHertz(50); // Frecuencia estándar para servos (50Hz)
  barreraServo.attach(SERVO_PIN, 500, 2400);
  barreraServo.write(0); // Iniciar con la barrera cerrada

  // Configurar sensores ultrasónicos y LED
  pinMode(TRIG_PIN_1, OUTPUT);
  pinMode(ECHO_PIN_1, INPUT);
  pinMode(TRIG_PIN_2, OUTPUT);
  pinMode(ECHO_PIN_2, INPUT);
  pinMode(SENSOR_IR_PIN_3, INPUT);

  setupWiFi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback); // Activar la función que escucha mensajes
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
  bool estaOcupadoActual2 = (duracion2 > 0 && distanciaCm2 <= DISTANCIA_UMBRAL_CM);

  if (estaOcupadoActual2 != estadoOcupadoAnterior_2) {
    estadoOcupadoAnterior_2 = estaOcupadoActual2;

    String payload = "{";
    payload += "\"cajonId\": \"cajon_2\",";
    payload += "\"ocupado\": " + String(estaOcupadoActual2 ? "true" : "false") + ",";
    payload += "\"distancia\": " + String(distanciaCm2);
    payload += "}";

    client.publish(mqtt_topic_2, payload.c_str());
  }

  delay(100);

  // ==========================================
  // LECTURA SENSOR 3 (Infrarrojo - Cajón 3)
  // =================================omotor
  // ==========================================
  int valorIR = digitalRead(SENSOR_IR_PIN_3);
  bool estaOcupadoActual3 = (valorIR == LOW); 

  if (estaOcupadoActual3 != estadoOcupadoAnterior_3) {
    estadoOcupadoAnterior_3 = estaOcupadoActual3;

    String payload = "{";
    payload += "\"cajonId\": \"cajon_3\",";
    payload += "\"ocupado\": " + String(estaOcupadoActual3 ? "true" : "false") + ",";
    payload += "\"distancia\": " + String(estaOcupadoActual3 ? 5.0 : 50.0);
    payload += "}";

    client.publish(mqtt_topic_3, payload.c_str());
  }

  delay(500);
}