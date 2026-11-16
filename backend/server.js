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

// Memoria para detectar cambios de estado (Libre <-> Ocupado) sin duplicar lecturas
const estadoPrevioCajones = new Map();
const sesionActivaCajones = new Map();

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
// 1.1. REGISTRAR EVENTOS EN HISTORIAL DE OCUPACIÓN (HU-34)
// ==========================================

async function registrarCambioHistorialSensor(cajonId, ocupadoActual, distancia) {
  try {
    let estadoAnterior = estadoPrevioCajones.get(cajonId);

    // Si el servidor acaba de iniciar, tomamos el último estado conocido en Firestore
    if (estadoAnterior === undefined) {
      const docPrevio = await db.collection("lugares").doc(cajonId).get();
      estadoAnterior = docPrevio.exists ? Boolean(docPrevio.data().ocupado) : false;
    }

    estadoPrevioCajones.set(cajonId, ocupadoActual);

    // Si el sensor sigue en el mismo estado, no creamos registros repetidos
    if (estadoAnterior === ocupadoActual) {
      return;
    }

    // Obtener el nombre de la sede activa para asociar el evento
    let nombreEstacionamiento = "Estacionamiento Centro";
    const estSnap = await db.collection("estacionamientos").limit(1).get();
    if (!estSnap.empty && estSnap.docs[0].data().nombre) {
      nombreEstacionamiento = estSnap.docs[0].data().nombre;
    }

    if (ocupadoActual === true) {
      // LIBRE -> OCUPADO (Nuevo ingreso detectado por el sensor)
      const nuevoRegistro = await db.collection("historial_ocupacion").add({
        cajonId,
        estacionamiento: nombreEstacionamiento,
        distanciaEntrada: distancia,
        horaOcupacion: FieldValue.serverTimestamp(),
        horaLiberacion: null,
        estado: "Ocupado"
      });

      sesionActivaCajones.set(cajonId, nuevoRegistro.id);
      console.log(`Historial HU-34: Ingreso registrado en ${cajonId}`);
    } else {
      // OCUPADO -> LIBRE (Salida detectada por el sensor)
      let docIdActivo = sesionActivaCajones.get(cajonId);

      if (!docIdActivo) {
        const abiertosSnap = await db
          .collection("historial_ocupacion")
          .where("cajonId", "==", cajonId)
          .where("estado", "==", "Ocupado")
          .limit(1)
          .get();

        if (!abiertosSnap.empty) {
          docIdActivo = abiertosSnap.docs[0].id;
        }
      }

      if (docIdActivo) {
        await db.collection("historial_ocupacion").doc(docIdActivo).update({
          horaLiberacion: FieldValue.serverTimestamp(),
          distanciaSalida: distancia,
          estado: "Completado"
        });
        sesionActivaCajones.delete(cajonId);
        console.log(`Historial HU-34: Liberación registrada en ${cajonId}`);
      } else {
        await db.collection("historial_ocupacion").add({
          cajonId,
          estacionamiento: nombreEstacionamiento,
          distanciaSalida: distancia,
          horaOcupacion: FieldValue.serverTimestamp(),
          horaLiberacion: FieldValue.serverTimestamp(),
          estado: "Completado"
        });
      }
    }
  } catch (err) {
    console.error("Error registrando cambio en historial_ocupacion:", err.message);
  }
}

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

    // Guardar evento histórico si cambió de libre a ocupado o viceversa
    await registrarCambioHistorialSensor(cajonId, datos.ocupado, datos.distancia);

    // Mantener actualización en tiempo real para Disponibilidad.jsx
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
      `Firestore actualizado: ${cajonId} -> ${estado} (${datos.distancia} cm)`
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
// 4. REGISTRAR ESTACIONAMIENTO
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
      telefono
    } = req.body;

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

    const capacidadNumero = Number(capacidad);

    if (
      !Number.isSafeInteger(capacidadNumero) ||
      capacidadNumero <= 0
    ) {
      return res.status(400).json({
        mensaje: "La capacidad debe ser un entero mayor que cero."
      });
    }

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

    const horaValida = (hora) =>
      typeof hora === "string" &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);

    if (
      !horaValida(hora_apertura) ||
      !horaValida(hora_cierre)
    ) {
      return res.status(400).json({
        mensaje: "Las horas deben tener el formato HH:MM."
      });
    }

    const nuevoEstacionamiento = {
      nombre: nombre.trim(),
      direccion: direccion.trim(),
      ciudad: ciudad.trim(),
      capacidad: capacidadNumero,
      hora_apertura,
      hora_cierre,
      telefono: telefono.trim(),
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
// 4.1. MODIFICAR ESTACIONAMIENTO (HU-31)
// ==========================================

app.put("/api/estacionamientos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      direccion,
      ciudad,
      capacidad,
      hora_apertura,
      hora_cierre,
      telefono,
      responsable
    } = req.body;

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

    const capacidadNumero = Number(capacidad);

    if (
      !Number.isSafeInteger(capacidadNumero) ||
      capacidadNumero <= 0
    ) {
      return res.status(400).json({
        mensaje: "La capacidad debe ser un entero mayor que cero."
      });
    }

    const horaValida = (hora) =>
      typeof hora === "string" &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);

    if (
      !horaValida(hora_apertura) ||
      !horaValida(hora_cierre)
    ) {
      return res.status(400).json({
        mensaje: "Las horas deben tener el formato HH:MM."
      });
    }

    const docRef = db.collection("estacionamientos").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({
        mensaje: "El estacionamiento no existe."
      });
    }

    const datosActualizados = {
      nombre: nombre.trim(),
      direccion: direccion.trim(),
      ciudad: ciudad.trim(),
      capacidad: capacidadNumero,
      hora_apertura,
      hora_cierre,
      telefono: telefono.trim(),
      responsable: responsable || "Administrador",
      ultima_modificacion: FieldValue.serverTimestamp()
    };

    await docRef.set(datosActualizados, { merge: true });

    return res.json({
      mensaje: "Estacionamiento modificado correctamente.",
      estacionamiento: {
        id,
        ...datosActualizados
      }
    });

  } catch (error) {
    console.error("Error al modificar estacionamiento:", error);

    return res.status(500).json({
      mensaje: "No fue posible modificar el estacionamiento."
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
// 5.1. CONSULTAR HISTORIAL DE OCUPACIÓN (HU-34)
// ==========================================

app.get("/api/historial-ocupacion", async (req, res) => {
  try {
    const consulta = await db
      .collection("historial_ocupacion")
      .orderBy("horaOcupacion", "desc")
      .limit(100)
      .get();

    const registros = consulta.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        cajonId: data.cajonId || "cajon_01",
        estacionamiento: data.estacionamiento || "Estacionamiento Centro",
        horaOcupacionMs: data.horaOcupacion?.toMillis ? data.horaOcupacion.toMillis() : null,
        horaLiberacionMs: data.horaLiberacion?.toMillis ? data.horaLiberacion.toMillis() : null,
        estado: data.estado || "Completado"
      };
    });

    return res.json(registros);
  } catch (error) {
    console.error("Error al consultar historial de ocupación:", error);
    return res.status(500).json({
      mensaje: "No fue posible consultar el historial de ocupación."
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