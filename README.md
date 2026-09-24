# SmartParkIA
Proyecto SmartParkIA-Sistema Inteligente de Gestión de Estacionamientos

****

# Descripción general
- Se propone desarrollar una aplicación multiplataforma (móvil y web) para la gestión inteligente de estacionamientos, capaz de integrar diferentes estacionamientos dentro de una misma plataforma con control de usuarios.
- El sistema utiliza IoT para detectar en tiempo real si los espacios se encuentran ocupados o disponibles. Los dispositivos (ESP32 con sensores) publican la información mediante MQTT a través del broker HiveMQ, y la plataforma la pone a disposición de los usuarios.
- Los usuarios se registran, consultan la disponibilidad, conocen el tiempo aproximado de liberación de los espacios y reservan un lugar con anticipación. Al confirmar la reserva reciben un código QR personal; al llegar, lo presentan ante un escáner en la entrada, el sistema lo valida y un servomotor levanta la barrera de forma automática.
- La aplicación también se conecta a un smartwatch para que el usuario reciba diversas notificaciones (confirmación de reserva, recordatorios, acceso autorizado, fin de tiempo, etc.) directamente en su muñeca.
- Los administradores registran y administran los estacionamientos y los usuarios desde un panel web: configuran espacios, capacidad, horarios, dispositivos IoT y consultan reportes. Finalmente, se integra inteligencia artificial para analizar la información histórica, generar informes, identificar horarios de mayor demanda y estimar la disponibilidad futura.

## Objetivo general
Desarrollar una aplicación multiplataforma inteligente que permita gestionar y consultar múltiples estacionamientos mediante IoT e inteligencia artificial, con control de usuarios y acceso automatizado mediante código QR, escáner y servomotor, proporcionando información en tiempo real, notificaciones (incluido smartwatch) y datos útiles para la toma de decisiones.

### Definicion del proyecto
- Tipo:Aplicación multiplataforma con componente IoT (sistema IoT + app móvil + panel web).
- Plataformas: Android, iOS (React Native) y navegador web (React). Extensión de notificaciones a smartwatch (Wear OS / Apple Watch).
- Arquitectura: Cliente–servidor con API REST, comunicación en tiempo real y mensajería MQTT para IoT.
- Componentes: 
1) App móvil del usuario.
2) Panel web del administrador.
3) Backend/API.
4) Dispositivos IoT (ESP32, sensores, escáner QR y servomotor).
5) Broker HiveMQ.
6) Bases de datos Firebase y SQL.
7) Módulo de IA.
- Modelo de datos: Persistencia híbrida: Firebase (tiempo real, notificaciones, autenticación) y SQL (información estructurada e histórica).

## Funcionalidades
- Control de usuarios: Registro, inicio de sesión, recuperación de contraseña, perfil, vehículos, roles (Usuario/Administrador), bloqueo y administración de cuentas.
- Consulta de estacionamientos: Lista y mapa, detalle, disponibilidad, comparación y mapa de espacios con estado.
IoT en tiempo real:	Detección de ocupado/libre con sensores, publicación MQTT por HiveMQ, actualización inmediata y monitoreo de dispositivos.
- Reservaciones: Reservar, consultar, cancelar y ver historial; control de estados de la reserva.
- Acceso con QR: Generación de QR por reserva, escaneo, validación en el backend y apertura de barrera con servomotor; bitácora de entradas y salidas.
- Smartwatch y notificaciones: Vinculación del reloj y notificaciones de reservas, acceso, tiempo restante y alertas; preferencias de notificación.
- Inteligencia artificial: Tiempo estimado de liberación, predicción de ocupación, análisis de demanda e informes automáticos.
- Administración: Alta, edición y desactivación de estacionamientos, configuración de espacios y dispositivos.
- Reportes: Ocupación diaria/semanal/mensual, reservaciones, historial y estadísticas con gráficas; exportación.
- Multiplataforma: Misma cuenta y funciones en Android, iOS y web.

## Actores
- Usuario -> Principal
- Administrador -> Principal
- Sistema IoT -> Secundario(dispositivo)
- Smartwatch -> Secundario (dispositivo)
- Modulo de IA -> Secundario(sistema)
- Servicios externos -> Secudnario(sistema)

## Herramientas de dasarrollo
- App movil (multiplataforma) -> React Native
- Panel administrador (web) -> React
- Backend/API -> Node.js + Express
- Base de datos en un tiempo real -> Firebase (Realtime Database / Firestore)
- Base de datos relacional -> SQL (MySQL o PostgreSQL)
- Auntenticacion -> Firebase Authentication
- Mensajería IoT ->	HiveMQ (MQTT)
- Microcontrolador ->	ESP32
- Sensores ->	Ultrasonido / infrarrojo
- Escáner y actuador ->	Lector QR (módulo GM65 o ESP32-CAM) + servomotor
- Notificaciones ->	Firebase Cloud Messaging (FCM)
- Smartwatch ->	Wear OS / Apple Watch
- IA ->	Python (scikit-learn/pandas) o servicio de predicción
- Mapas -> API de mapas (ej. Google Maps)
- Control de versiones y gestión ->	Git/GitHub, Notion/Jira




