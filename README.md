# SmartPark IA

## Descripción

Se desarrolla aplicación multiplataforma para los servicios privados de acceso publico. Se requiere el control de la gestión inteligente de estacionamientos, con detección de espacios ocupados o disponibles en tiempo real y seguimiento de reservas.

## Objetivo

<<<<<<< HEAD
Desarrollar una aplicacion multiplataforma de gestion de estacionamientos, los servicios privados de acceso publico, en un periodo de cuatro meses utilizando scrum y las etiquetas html, css, js, mysql.
=======
Desarrollar una aplicacion multiplataforma de gestion de estacionamientos, los servicios privados de acceso publico, en un periodo de cuatro meses utilizando scrum y las tecnologías web modernas.
>>>>>>> 276e803ac8cbbc17b782fef14f971b41ca1eac38

## Equipo de desarrollo

- SM: Barrera Gonzales Angelica Yolotzin
- Barrera Perez Marco Antonio
- Hernandez Ruiz Luis Enrique
- Cuin Arvizu Victor Rey
- Melgar Angeles Gabriela Sarahi
- Mercado Mendez Estefani
- Juan Jonathan Solano Miranda

## Funcionalidades

Control de usuarios

- [ ] Registro de usuario
- [ ] Inicio y cierre de sesión
- [ ] Recuperar contraseña
- [ ] Perfil y vehículo
- [ ] Control de usuarios (administrador)

Consulta de estacionamientos

- [ ] Ver estacionamientos
- [ ] Información detallada
- [ ] Consultar y comparar disponibilidad
- [ ] Mapa de espacios

IoT en tiempo real

- [ ] Detección de ocupación y liberación
- [ ] Disponibilidad en tiempo real
- [ ] Monitoreo de dispositivos IoT

Reservaciones

- [ ] Reservar espacio
- [ ] Ver reserva
- [ ] Cancelar reserva
- [ ] Historial de reservaciones

Acceso con QR

- [ ] Generar código QR de acceso
- [ ] Escanear y validar QR
- [ ] Apertura de barrera con servomotor
- [ ] Bitacora de accesos

Smartwatch y notificaciones

- [ ] Vincular smartwatch
- [ ] Notificaciones de reserva
- [ ] Notificaciones de acceso y tiempo
- [ ] Preferencias de notificaciones

Inteligencia artificial

- [ ] Tiempo estimado de liberación
- [ ] Predicción de ocupación
- [ ] Análisis de demanda
- [ ] Informes inteligentes

Administración

- [ ] Registrar estacionamiento
- [ ] Modificar estacionamiento
- [ ] Desactivar estacionamiento
- [ ] Configurar espacios

Reportes

- [ ] Reporte de ocupación y reservaciones
- [ ] Historial de ocupación
- [ ] Estadísticas con gráficas

Multiplataforma

- [ ] Uso multiplataforma

## Actores

| Actor | Tipo |
| --- | --- |
| Usuario | Principal |
| Administrador | Principal |
| Sistema IoT | Secundario (dispositivo) |
| Smartwatch | Secundario (dispositivo) |
| Modulo de IA | Secundario (sistema) |
| Servicios externos | Secundario (sistema) |

## Tecnologias utilizadas

- HTML
- CSS
- JS
- React
<<<<<<< HEAD
- MySQL
- Node.js + Express
- Firebase
=======
- Node.js + Express
- Firebase (Auth & Firestore)
>>>>>>> 276e803ac8cbbc17b782fef14f971b41ca1eac38
- HiveMQ (MQTT)
- Firebase Cloud Messaging (FCM)
- Python

## Pila tecnológica

| Capa | Tecnología | Uso |
|---|---|---|
| Frontend | React (con Vite) | Aplicación multiplataforma para usuario y administrador |
| Wearable | Wear OS (Android Studio) | App del smartwatch con notificaciones |
<<<<<<< HEAD
| Backend y datos relacionales | Base de datos SQL | Reservaciones, estacionamientos, bitácora e historial |
| Datos en tiempo real y autenticación | Firebase (proyecto smartpark-ia) | Cuentas, perfiles, vehículos y sincronización |
| Mensajería IoT | HiveMQ (MQTT) | Comunicación entre sensores, escáner y la app |
| Hardware | ESP32, sensores de ocupación, escáner QR, servomotor | Detección de espacios y apertura de barrera |
| Interfaz | react-icons, paleta negro, blanco y grises | Estilo visual y animaciones |
=======
| Base de datos y Auth | Firebase (Firestore + Auth) | Almacenamiento NoSQL en tiempo real, gestión de usuarios, perfiles y roles |
| Backend y API | Node.js + Express | Servidor central para validación de QR, lógica de negocio y Firebase Admin SDK |
| Mensajería IoT | HiveMQ (MQTT) | Comunicación ligera para la transmisión del estado de sensores (ocupado/libre) |
| Hardware | ESP32, sensores de ocupación, escáner QR, servomotor | Detección física de espacios y apertura de barrera de acceso |
| Interfaz y Estilos | CSS Modules / Tailwind / react-icons | Diseño visual bajo paleta de negro, blanco y grises con iconos responsivos |
>>>>>>> 276e803ac8cbbc17b782fef14f971b41ca1eac38
| Gestión del proyecto | GitHub Projects, planning poker | Backlog, sprints, tamaños y estados |

## Programa

FECHA DE INICIO: 18 DE SEPTIEMBRE  
FECHA DE FINALIZACION: 20 DE NOVIEMBRE  

---

<<<<<<< HEAD
## 🚀 División de Sprints (Estructura de Sprints Scrum - 2 semanas c/u)

### **Sprint 1: Configuración Inicial, Usuarios y Alta de Estacionamientos** *(Semanas 1 y 2)*

- **Objetivo del Sprint:** Establecer las bases tecnológicas del proyecto, la arquitectura multiplataforma inicial, el control de usuarios y la gestión administrativa básica de los estacionamientos.

- **Tareas / Funcionalidades asociadas:**
  * Configuración del entorno base (HTML, CSS, JS, React, Node.js + Express, MySQL, Firebase).
=======
## División de Sprints (Estructura de Sprints Scrum - 2 semanas c/u)

### **Sprint 1: Configuración Inicial, Usuarios y Alta de Estacionamientos** *(Semanas 1 y 2)*

- **Objetivo del Sprint:** Establecer las bases tecnológicas del proyecto, la arquitectura multiplataforma inicial, el control de usuarios mediante Firebase Auth y Firestore, y la gestión administrativa básica.

- **Tareas / Funcionalidades asociadas:**
  * Configuración del entorno base (HTML, CSS, JS, React, Node.js + Express, Firebase).
>>>>>>> 276e803ac8cbbc17b782fef14f971b41ca1eac38
  * Registro de usuario
  * Inicio y cierre de sesión
  * Recuperar contraseña
  * Perfil y vehículo
  * Registrar estacionamiento

### **Sprint 2: Gestión de Espacios, Catálogos y Sistema de Reservas** *(Semanas 3 y 4)*

<<<<<<< HEAD
- **Objetivo del Sprint:** Desarrollar la experiencia de búsqueda, consulta cartográfica/detallada de estacionamientos y el flujo completo de reservaciones para los usuarios.
=======
- **Objetivo del Sprint:** Desarrollar la experiencia de búsqueda, consulta de estacionamientos y el flujo completo de reservaciones sincronizadas en tiempo real con Firestore.
>>>>>>> 276e803ac8cbbc17b782fef14f971b41ca1eac38

- **Tareas / Funcionalidades asociadas:**
  * Control de usuarios (administrador)
  * Ver estacionamientos
  * Información detallada
  * Consultar y comparar disponibilidad
  * Mapa de espacios
  * Reservar espacio
  * Ver reserva
  * Cancelar reserva
  * Historial de reservaciones

### **Sprint 3: Integración IoT, Accesos Automatizados y Hardware** *(Semanas 5 y 6)*

<<<<<<< HEAD
- **Objetivo del Sprint:** Implementar la conectividad en tiempo real con sensores físicos mediante protocolos ligeros y automatizar el acceso vehicular seguro por medio de códigos QR.
=======
- **Objetivo del Sprint:** Implementar la conectividad en tiempo real con sensores físicos vía MQTT (HiveMQ) y automatizar el acceso vehicular seguro por medio de códigos QR.
>>>>>>> 276e803ac8cbbc17b782fef14f971b41ca1eac38

- **Tareas / Funcionalidades asociadas:**
  * Detección de ocupación y liberación 
  * Disponibilidad en tiempo real
  * Monitoreo de dispositivos IoT
  * Generar código QR de acceso
  * Escanear y validar QR
  * Apertura de barrera con servomotor
  * Bitácora de accesos
  * Modificar estacionamiento
  * Desactivar estacionamiento
  * Configurar espacios

### **Sprint 4: Inteligencia Artificial, Notificaciones, Reportes y Cierre Multiplataforma** *(Semanas 7 y 8)*

<<<<<<< HEAD
- **Objetivo del Sprint:** Integrar los modelos predictivos de IA, la sincronización con smartwatch, el sistema de notificaciones push, la reportería avanzada y la validación multiplataforma final.
=======
- **Objetivo del Sprint:** Integrar los modelos predictivos de IA (Python), la sincronización con smartwatch, el sistema de notificaciones push (FCM), la reportería avanzada y la validación multiplataforma final.
>>>>>>> 276e803ac8cbbc17b782fef14f971b41ca1eac38

- **Tareas / Funcionalidades asociadas:**
  * Vincular smartwatch
  * Notificaciones de reserva
  * Notificaciones de acceso y tiempo
  * Preferencias de notificaciones
  * Tiempo estimado de liberación
  * Predicción de ocupación
  * Análisis de demanda
  * Informes inteligentes
  * Reporte de ocupación y reservaciones
  * Historial de ocupación
  * Estadísticas con gráficas
<<<<<<< HEAD
  * Uso multiplataforma
=======
  * Uso multiplataforma
>>>>>>> 276e803ac8cbbc17b782fef14f971b41ca1eac38
