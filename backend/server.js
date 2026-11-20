require("dotenv").config();
// server.js (justo después de require("dotenv").config();)
console.log("🔑 Clave Gemini detectada:", process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "SÍ (longitud: " + process.env.GOOGLE_GENERATIVE_AI_API_KEY.length + ")" : "NO");
 
const express = require("express");
const cors = require("cors");
const mqtt = require("mqtt");
const { db, FieldValue, adminAuth } = require("./firebaseAdmin");
// ==========================================
// NUEVAS DEPENDENCIAS: REPORTES CON IA (GEMINI)
// ==========================================
const { generateText, Output  } = require("ai");
const { google } = require("@ai-sdk/google");
const { z } = require("zod");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
 
const app = express();
 
app.use(cors());
app.use(express.json({ limit: "10mb" }));
 
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
 
    const coincidencia = topic.match(/^smartpark\/cajones\/([^/]+)\/estado$/);
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
 
    await db.collection("lugares").doc(cajonId).set(
      {
        ocupado: datos.ocupado,
        distancia: datos.distancia,
        estado,
        ultimaActualizacion: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
 
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
    mqtt: mqttConectado ? "conectado" : "desconectado",
    ia: process.env.GOOGLE_GENERATIVE_AI_API_KEY
      ? "configurada (Gemini)"
      : "no configurada"
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
      nombre, direccion, ciudad, capacidad,
      hora_apertura, hora_cierre, telefono, lat, lng
    } = req.body;
 
    if (
      typeof nombre !== "string" ||
      typeof direccion !== "string" ||
      typeof ciudad !== "string" ||
      typeof telefono !== "string" ||
      !nombre.trim() || !direccion.trim() ||
      !ciudad.trim() || !telefono.trim() ||
      capacidad === undefined || capacidad === null ||
      String(capacidad).trim() === "" ||
      !hora_apertura || !hora_cierre
    ) {
      return res.status(400).json({ mensaje: "Todos los campos son obligatorios." });
    }
 
    const capacidadNumero = Number(capacidad);
    if (!Number.isSafeInteger(capacidadNumero) || capacidadNumero <= 0) {
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
      typeof hora === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);
 
    if (!horaValida(hora_apertura) || !horaValida(hora_cierre)) {
      return res.status(400).json({
        mensaje: "Las horas deben tener el formato HH:MM."
      });
    }
 
    if (
      typeof lat !== "number" || typeof lng !== "number" ||
      !Number.isFinite(lat) || !Number.isFinite(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180
    ) {
      return res.status(400).json({
        mensaje: "Debes seleccionar una ubicación válida en el mapa."
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
        ...nuevoEstacionamiento,
        fecha_registro: undefined
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
// 6. REPORTES CON IA (GEMINI): PDF Y EXCEL
// ==========================================
 
// --- MODELO DE GEMINI A USAR ---
const MODELO_IA = "gemini-3.5-flash-lite";
 
 
// --- ESQUEMA DEL INFORME (Zod) ---
const informeSchema = z.object({
  titulo: z.string().describe(
    'Título profesional y llamativo del informe, ej: "Análisis de Rendimiento Financiero - Estacionamiento SmartPark"'
  ),
  resumenEjecutivo: z.string().describe(
    "Párrafo de 3 a 5 frases que resuma la salud financiera general del estacionamiento."
  ),
  puntosClave: z.array(z.string()).min(3).max(5).describe(
    "3 a 5 insights clave, cada uno una frase concisa y accionable."
  ),
  recomendacion: z.string().describe(
    "Una recomendación estratégica y accionable basada en los datos."
  )
});
// ==========================================
// 7. FUNCIONES AVANZADAS CON IA
// ==========================================
 
// --- SCHEMA: Análisis semanal ---
const analisisSemanalSchema = z.object({
  titulo: z.string().describe("Título llamativo, máx 8 palabras"),
  resumenEjecutivo: z.string().describe("Párrafo de 3-4 frases resumiendo la semana"),
  tendencia: z.enum(["positiva", "negativa", "estable"]),
  porcentajeCambio: z.number().describe("Cambio vs semana anterior, puede ser negativo"),
  prediccionProximoDia: z.number().describe("Predicción de ganancias para mañana en MXN"),
  prediccionProximaSemana: z.number().describe("Predicción de ganancias para la próxima semana en MXN"),
  confianza: z.number().min(0).max(100).describe("Confianza de la predicción, 0-100"),
  diaMasRentable: z.string().describe("Nombre del día más rentable"),
  diaMenosRentable: z.string().describe("Nombre del día menos rentable"),
  insights: z.array(z.string()).min(3).max(5).describe("Insights clave, cada uno 1-2 frases"),
  alertas: z.array(z.object({
    tipo: z.enum(["info", "warning", "success", "error"]),
    mensaje: z.string()
  })).describe("0-3 alertas importantes"),
  recomendaciones: z.array(z.string()).min(2).max(4).describe("Acciones concretas"),
  scoreRendimiento: z.number().min(0).max(100).describe("Score general 0-100")
});
 
// --- SCHEMA: Insight de gráfica ---
const insightGraficaSchema = z.object({
  titulo: z.string().describe("Título corto de la gráfica, máx 6 palabras"),
  observacion: z.string().describe("Observación clave con números, 1-2 frases"),
  patron: z.string().describe("Patrón detectado, 1 frase"),
  accionSugerida: z.string().describe("Acción imperativa, 1 frase")
});
 
// --- SCHEMA: Respuesta de chat ---
const respuestaChatSchema = z.object({
  respuesta: z.string().describe("Respuesta clara, máximo 3 frases"),
  recomendacion: z.string().describe("Tip breve y accionable")
});
 
// --- Helper: formatear datos para la IA ---
function formatearDatosSemana(stats, datosGraficaBarras, datosGraficaPastel) {
  const dias = (datosGraficaBarras || []).map(d => `  ${d.dia}: $${d.ganancias} MXN`).join("\n");
  const estados = (datosGraficaPastel || []).map(e => `  ${e.name}: ${e.value}`).join("\n");
 
  return `
=== MÉTRICAS ACTUALES ===
Ganancias hoy: $${stats.hoy} MXN
Ganancias esta semana: $${stats.semana} MXN
Ganancias este mes: $${stats.mes} MXN
Reservas hoy: ${stats.reservasHoy}
 
=== ÚLTIMOS 7 DÍAS ===
${dias}
 
=== ESTADO DE RESERVAS ===
${estados}
  `.trim();
}
 
// --- ENDPOINT: Análisis semanal completo ---
app.post("/api/analisis-semanal", async (req, res) => {
  const inicio = Date.now();
  try {
    const { stats, datosGraficaBarras, datosGraficaPastel } = req.body;
 
    if (!stats || !datosGraficaBarras || !datosGraficaPastel) {
      return res.status(400).json({ mensaje: "Faltan datos para el análisis." });
    }
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return res.status(500).json({ mensaje: "IA no configurada." });
    }
 
    const datosTexto = formatearDatosSemana(stats, datosGraficaBarras, datosGraficaPastel);
    console.log("🧠 [Análisis Semanal] Llamando a Gemini...");
 
    const { output } = await generateText({
      model: google(MODELO_IA),
      output: Output.object({ schema: analisisSemanalSchema }),
      system: "Eres un analista financiero experto en estacionamientos. Analizas datos y generas insights accionables en español. Sé específico con números.",
      prompt: `Analiza estos datos del estacionamiento SmartPark y genera un análisis semanal:\n\n${datosTexto}\n\nInstrucciones:\n- Predicciones basadas en patrones de los 7 días\n- Score de rendimiento objetivo (0-100)\n- Insights específicos con números\n- Recomendaciones medibles y accionables`,
      maxOutputTokens: 1200
    });
 
    console.log(`🧠 [Análisis Semanal] OK en ${Date.now() - inicio}ms`);
    return res.json(output);
  } catch (error) {
    console.error("❌ [Análisis Semanal]:", error.message);
    const { status, mensaje, detalle } = formatearErrorIA(error);
    return res.status(status).json({ mensaje, detalle });
  }
});
 
// --- ENDPOINT: Insight por gráfica ---
app.post("/api/insight-grafica", async (req, res) => {
  try {
    const { tipoGrafica, datos, contexto } = req.body;
 
    if (!tipoGrafica || !datos) {
      return res.status(400).json({ mensaje: "Faltan datos de la gráfica." });
    }
 
    const { output } = await generateText({
      model: google(MODELO_IA),
      output: Output.object({ schema: insightGraficaSchema }),
      system: "Eres un analista de datos visual. Generas insights breves y concretos sobre gráficas financieras en español.",
      prompt: `Analiza esta gráfica tipo "${tipoGrafica}" con estos datos: ${JSON.stringify(datos)}.\nContexto: ${contexto || "estacionamiento SmartPark"}.\n\nGenera: título corto, observación clave con números, patrón detectado, y acción sugerida imperativa.`,
      maxOutputTokens: 400
    });
 
    return res.json(output);
  } catch (error) {
    console.error("❌ [Insight Gráfica]:", error.message);
    const { status, mensaje, detalle } = formatearErrorIA(error);
    return res.status(status).json({ mensaje, detalle });
  }
});
 
// --- ENDPOINT: Chat con IA sobre datos ---
app.post("/api/preguntar-ia", async (req, res) => {
  try {
    const { pregunta, contexto } = req.body;
 
    if (!pregunta || typeof pregunta !== "string" || pregunta.trim().length < 3) {
      return res.status(400).json({ mensaje: "Haz una pregunta válida." });
    }
    if (pregunta.length > 500) {
      return res.status(400).json({ mensaje: "La pregunta es muy larga (máx 500)." });
    }
 
    const { output } = await generateText({
      model: google(MODELO_IA),
      output: Output.object({ schema: respuestaChatSchema }),
      system: "Eres un asistente financiero del estacionamiento SmartPark. Respondes basándote SOLO en los datos proporcionados. Si no sabes algo, dilo. Español, máximo 3 frases.",
      prompt: `Datos:\n${JSON.stringify(contexto, null, 2)}\n\nPregunta: "${pregunta}"`,
      maxOutputTokens: 400
    });
 
    return res.json(output);
  } catch (error) {
    console.error("❌ [Chat IA]:", error.message);
    const { status, mensaje, detalle } = formatearErrorIA(error);
    return res.status(status).json({ mensaje, detalle });
  }
});
// --- HELPERS ---
 
function validarStats(stats) {
  if (!stats || typeof stats !== "object") return null;
  const limpio = {
    hoy: Number(stats.hoy),
    semana: Number(stats.semana),
    mes: Number(stats.mes),
    reservasHoy: Number(stats.reservasHoy)
  };
  if (Object.values(limpio).some((v) => !Number.isFinite(v) || v < 0)) {
    return null;
  }
  return limpio;
}
 
function calcularStatsDeReservas(reservas) {
  const hoy = new Date();
  const offset = hoy.getTimezoneOffset();
  const fechaHoyStr = new Date(hoy.getTime() - offset * 60 * 1000)
    .toISOString().split("T")[0];
  const mesActualStr = fechaHoyStr.substring(0, 7);
 
  const diaSemana = hoy.getDay() === 0 ? 7 : hoy.getDay();
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - diaSemana + 1);
  inicioSemana.setHours(0, 0, 0, 0);
 
  let hoyTotal = 0, semana = 0, mes = 0, reservasHoy = 0;
 
  for (const r of reservas) {
    const estado = (r.estado || "").toLowerCase();
    if (estado === "cancelada") continue;
 
    let costo = Number(r.costoTotal);
    if (isNaN(costo) || costo === 0) {
      costo = (parseInt(r.duracion, 10) || 0) * 50;
    }
 
    const fechaPagoStr = r.fechaCreacion
      ? r.fechaCreacion.split("T")[0]
      : r.fecha;
 
    if (fechaPagoStr === fechaHoyStr) {
      hoyTotal += costo;
      reservasHoy++;
    }
 
    const fechaPagoObj = new Date(`${fechaPagoStr}T00:00:00`);
    if (fechaPagoObj >= inicioSemana) semana += costo;
    if (fechaPagoStr && fechaPagoStr.startsWith(mesActualStr)) mes += costo;
  }
 
  return { hoy: hoyTotal, semana, mes, reservasHoy };
}
 
/**
 * Traduce errores del SDK / Google Gemini a respuestas HTTP claras.
 * Gemini usa códigos como API_KEY_INVALID, RESOURCE_EXHAUSTED, PERMISSION_DENIED.
 */
function formatearErrorIA(error) {
  const msg = String(error?.message || error || "");
  const cause = String(error?.cause?.message || "");
  const todo = (msg + " " + cause).toLowerCase();
 
  // 🔑 Clave inválida
  if (
    todo.includes("api_key_invalid") ||
    todo.includes("api key not valid") ||
    todo.includes("invalid api key") ||
    todo.includes("invalid_api_key") ||
    todo.includes("400") && todo.includes("api key")
  ) {
    return {
      status: 401,
      mensaje:
        "La clave de Google Gemini es inválida o no tiene permisos. Revisa GOOGLE_GENERATIVE_AI_API_KEY en tu .env."
    };
  }
 
  // 🚫 Sin permisos
  if (
    todo.includes("permission_denied") ||
    todo.includes("permission denied") ||
    todo.includes("403")
  ) {
    return {
      status: 403,
      mensaje:
        "La API key de Gemini no tiene permisos para usar el modelo. Revisa la configuración en Google AI Studio."
    };
  }
 
  // 💸 Cuota / límite agotado
  if (
    todo.includes("resource_exhausted") ||
    todo.includes("resource exhausted") ||
    todo.includes("quota") ||
    todo.includes("rate limit") ||
    todo.includes("429")
  ) {
    return {
      status: 429,
      mensaje:
        "Se alcanzó el límite gratuito de Gemini. Espera un minuto (el límite se reinicia automáticamente) o revisa tu plan en Google AI Studio."
    };
  }
 
  // 🕒 Timeout
  if (
    todo.includes("timeout") ||
    todo.includes("etimedout") ||
    todo.includes("aborted") ||
    todo.includes("deadline")
  ) {
    return {
      status: 504,
      mensaje:
        "Gemini tardó demasiado en responder. Intenta generar el informe de nuevo."
    };
  }
 
  // 🌐 Sin conexión
  if (
    todo.includes("econnrefused") ||
    todo.includes("enotfound") ||
    todo.includes("network") ||
    todo.includes("fetch failed")
  ) {
    return {
      status: 503,
      mensaje:
        "No se pudo conectar con el servicio de Gemini. Revisa tu conexión a internet."
    };
  }
 
  // ⚠️ Servicio no disponible
  if (
    todo.includes("unavailable") ||
    todo.includes("503") ||
    todo.includes("overloaded")
  ) {
    return {
      status: 503,
      mensaje:
        "Gemini está temporalmente saturado. Espera unos segundos e intenta de nuevo."
    };
  }
 
  // 🧩 Error de formato/validación del schema
  if (todo.includes("schema") || todo.includes("validation")) {
    return {
      status: 502,
      mensaje:
        "Gemini devolvió un formato inesperado. Intenta generar el informe de nuevo."
    };
  }
 
  return {
    status: 500,
    mensaje: "No se pudo generar el informe con IA (Gemini).",
    detalle: msg
  };
}
 
function construirResumenDatos(stats) {
  const fmt = (n) => Number(n).toLocaleString("es-MX");
  const fechaHoy = new Date().toLocaleDateString("es-MX", { dateStyle: "long" });
  return [
    `Fecha del informe: ${fechaHoy}`,
    `Ganancias de hoy: $${fmt(stats.hoy)} MXN`,
    `Ganancias acumuladas de la semana: $${fmt(stats.semana)} MXN`,
    `Ganancias acumuladas del mes: $${fmt(stats.mes)} MXN`,
    `Reservas registradas hoy: ${stats.reservasHoy}`
  ].join("\n");
}
 
async function generarInformeIA(stats) {
  const resumenDatos = construirResumenDatos(stats);
 
  const { output } = await generateText({
    model: google(MODELO_IA),
    output: Output.object({
      schema: informeSchema,
    }),
    system:
      "Eres un analista financiero senior especializado en estacionamientos urbanos. Escribes en español profesional, conciso, analítico y orientado a la acción. Nunca inventas datos que no se te hayan proporcionado.",
    prompt: `Genera un informe financiero profesional para el estacionamiento SmartPark con los siguientes datos:\n\n${resumenDatos}\n\nEl informe debe analizar la evolución de los ingresos, identificar patrones y ofrecer una recomendación concreta.`,
  });
 
  return output;
}
 
// --- ENDPOINT: HEALTH CHECK DE IA ---
app.get("/api/health/ia", async (req, res) => {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return res.status(500).json({
      ok: false,
      mensaje:
        "GOOGLE_GENERATIVE_AI_API_KEY no está configurada en el servidor."
    });
  }
 
  try {
    const inicio = Date.now();
    await generateText({
      model: google(MODELO_IA),
      prompt: "Responde solo con la palabra: OK",
      maxTokens: 5
    });
    return res.json({
      ok: true,
      proveedor: "Google Gemini",
      modelo: MODELO_IA,
      latenciaMs: Date.now() - inicio
    });
  } catch (error) {
    const { status, mensaje, detalle } = formatearErrorIA(error);
    console.error("Health check IA falló:", error.message);
    return res.status(status).json({ ok: false, mensaje, detalle });
  }
});
 
// ------------------------------------------
// 6.1 Generar PDF con IA
// ------------------------------------------
app.post("/api/generar-pdf", async (req, res) => {
  const inicio = Date.now();
 
  try {
    const stats = validarStats(req.body?.datos?.stats);
    if (!stats) {
      return res.status(400).json({
        mensaje: "Los datos de estadísticas son inválidos o están incompletos."
      });
    }
 
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return res.status(500).json({
        mensaje:
          "Falta la variable GOOGLE_GENERATIVE_AI_API_KEY en el entorno del servidor."
      });
    }
 
    // 1) Generar informe con IA (Gemini)
    const informeIA = await generarInformeIA(stats);
    console.log(`[PDF] Gemini respondió en ${Date.now() - inicio}ms`);
 
    // 2) Construir el PDF
    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
      bufferPages: true
    });
 
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="informe-financiero-ia.pdf"'
    );
    doc.pipe(res);
 
    // Barra superior decorativa
    doc.rect(0, 0, doc.page.width, 8).fill("#10b981");
    doc.moveDown(2);
 
    // Título
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .fillColor("#0f172a")
      .text(informeIA.titulo, { align: "center" });
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#64748b")
      .text(
        `Generado el ${new Date().toLocaleDateString("es-MX", {
          dateStyle: "long"
        })}`,
        { align: "center" }
      );
    doc.moveDown(1.5);
 
    // --- Caja de resumen numérico ---
    const statsBoxY = doc.y;
    const boxWidth = doc.page.width - 100;
    const boxHeight = 110;
 
    doc
      .roundedRect(50, statsBoxY, boxWidth, boxHeight, 8)
      .fillAndStroke("#F8FAFC", "#E2E8F0");
 
    doc
      .fillColor("#0F172A")
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("Resumen numérico del período", 65, statsBoxY + 14);
 
    const statsLines = [
      `Ganancias de hoy:        $${stats.hoy.toLocaleString("es-MX")} MXN`,
      `Ganancias de la semana:  $${stats.semana.toLocaleString("es-MX")} MXN`,
      `Ganancias del mes:       $${stats.mes.toLocaleString("es-MX")} MXN`,
      `Reservas registradas hoy: ${stats.reservasHoy}`
    ];
 
    doc.font("Helvetica").fontSize(10).fillColor("#334155");
    statsLines.forEach((line, i) => {
      doc.text(line, 70, statsBoxY + 38 + i * 16);
    });
 
    doc.y = statsBoxY + boxHeight + 20;
 
    // --- Resumen Ejecutivo ---
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#10b981")
      .text("Resumen Ejecutivo");
    doc.moveDown(0.5);
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#333333")
      .text(informeIA.resumenEjecutivo, { align: "justify", lineGap: 3 });
    doc.moveDown(1.5);
 
    // --- Puntos Clave ---
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#0ea5e9")
      .text("Puntos Clave");
    doc.moveDown(0.5);
    informeIA.puntosClave.forEach((punto) => {
      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor("#333333")
        .text(`•  ${punto}`, { indent: 15, lineGap: 2 });
      doc.moveDown(0.3);
    });
    doc.moveDown(1);
 
    // --- Recomendación ---
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#f59e0b")
      .text("Recomendación Estratégica");
    doc.moveDown(0.5);
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#333333")
      .text(informeIA.recomendacion, { align: "justify", lineGap: 3 });
 
    // --- Pie de página con numeración ---
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(9)
        .fillColor("#888888")
        .text(
          `Informe generado con Google Gemini — SmartPark · Página ${i + 1} de ${range.count}`,
          50,
          doc.page.height - 40,
          { align: "center", width: doc.page.width - 100 }
        );
    }
 
    doc.end();
    console.log(`[PDF] Total ${Date.now() - inicio}ms`);
  } catch (error) {
    console.error("Error al generar PDF:", error);
    if (!res.headersSent) {
      const { status, mensaje, detalle } = formatearErrorIA(error);
      return res.status(status).json({ mensaje, detalle });
    }
  }
});
 
// ------------------------------------------
// 6.2 Generar Excel con IA
// ------------------------------------------
app.post("/api/generar-excel", async (req, res) => {
  const inicio = Date.now();
 
  try {
    const { reservas } = req.body;
 
    if (!Array.isArray(reservas) || reservas.length === 0) {
      return res.status(400).json({
        mensaje: "No hay reservas para exportar."
      });
    }
 
    // 1) Calcular stats desde las reservas
    const stats = calcularStatsDeReservas(reservas);
 
    // 2) Intentar generar informe con IA (si falla, seguimos sin él)
    let informeIA = null;
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      try {
        informeIA = await generarInformeIA(stats);
        console.log(`[Excel] Gemini respondió en ${Date.now() - inicio}ms`);
      } catch (err) {
        console.warn(
          "[Excel] No se pudo generar informe IA, se exportará solo la tabla:",
          err.message
        );
      }
    }
 
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Panel de Finanzas SmartPark";
    workbook.created = new Date();
 
    // --- HOJA 1: Informe IA ---
    if (informeIA) {
      const wsInforme = workbook.addWorksheet("Informe IA");
      wsInforme.getColumn(1).width = 100;
      let row = 1;
 
      // Título
      wsInforme.addRow([informeIA.titulo]);
      wsInforme.getRow(row).font = {
        size: 18,
        bold: true,
        color: { argb: "FF0F172A" }
      };
      wsInforme.getRow(row).alignment = { wrapText: true, vertical: "middle" };
      wsInforme.getRow(row).height = 50;
      row++;
 
      // Fecha
      wsInforme.addRow([
        `Generado con Google Gemini el ${new Date().toLocaleDateString("es-MX", {
          dateStyle: "long"
        })}`
      ]);
      wsInforme.getRow(row).font = {
        size: 10,
        italic: true,
        color: { argb: "FF64748B" }
      };
      row++;
 
      wsInforme.addRow([]); row++;
 
      // Resumen Ejecutivo
      wsInforme.addRow(["RESUMEN EJECUTIVO"]);
      wsInforme.getRow(row).font = {
        size: 12,
        bold: true,
        color: { argb: "FF10B981" }
      };
      row++;
      wsInforme.addRow([informeIA.resumenEjecutivo]);
      wsInforme.getRow(row).alignment = { wrapText: true, vertical: "top" };
      wsInforme.getRow(row).height = 90;
      row++;
 
      wsInforme.addRow([]); row++;
 
      // Puntos Clave
      wsInforme.addRow(["PUNTOS CLAVE"]);
      wsInforme.getRow(row).font = {
        size: 12,
        bold: true,
        color: { argb: "FF0EA5E9" }
      };
      row++;
      for (const p of informeIA.puntosClave) {
        wsInforme.addRow([`•  ${p}`]);
        wsInforme.getRow(row).alignment = { wrapText: true, vertical: "top" };
        row++;
      }
 
      wsInforme.addRow([]); row++;
 
      // Recomendación
      wsInforme.addRow(["RECOMENDACIÓN ESTRATÉGICA"]);
      wsInforme.getRow(row).font = {
        size: 12,
        bold: true,
        color: { argb: "FFF59E0B" }
      };
      row++;
      wsInforme.addRow([informeIA.recomendacion]);
      wsInforme.getRow(row).alignment = { wrapText: true, vertical: "top" };
      wsInforme.getRow(row).height = 80;
      row++;
 
      wsInforme.addRow([]); row++;
 
      // Resumen numérico
      wsInforme.addRow(["RESUMEN NUMÉRICO"]);
      wsInforme.getRow(row).font = {
        size: 12,
        bold: true,
        color: { argb: "FF00F2FE" }
      };
      row++;
 
      wsInforme.addRow([
        `Ganancias de hoy: $${stats.hoy.toLocaleString("es-MX")} MXN`
      ]);
      row++;
      wsInforme.addRow([
        `Ganancias de la semana: $${stats.semana.toLocaleString("es-MX")} MXN`
      ]);
      row++;
      wsInforme.addRow([
        `Ganancias del mes: $${stats.mes.toLocaleString("es-MX")} MXN`
      ]);
      row++;
      wsInforme.addRow([`Reservas registradas hoy: ${stats.reservasHoy}`]);
    }
 
    // --- HOJA 2: Reservas ---
    const wsReservas = workbook.addWorksheet("Reservas", {
      views: [{ state: "frozen", ySplit: 1 }]
    });
 
    wsReservas.columns = [
      { header: "Fecha de Uso", key: "fecha", width: 16 },
      { header: "Horario", key: "horario", width: 12 },
      { header: "Estado", key: "estado", width: 14 },
      { header: "Duración (hrs)", key: "duracion", width: 15 },
      {
        header: "Costo Total (MXN)",
        key: "costoTotal",
        width: 20,
        style: { numFmt: '"$"#,##0.00' }
      },
      { header: "Fecha de Pago", key: "fechaCreacion", width: 22 }
    ];
 
    const headerRow = wsReservas.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF10B981" }
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 22;
 
    reservas.forEach((r) => {
      wsReservas.addRow({
        fecha: r.fecha || "",
        horario: r.horario || "",
        estado: r.estado || "",
        duracion: parseInt(r.duracion, 10) || 0,
        costoTotal: Number(r.costoTotal) || 0,
        fechaCreacion: r.fechaCreacion
          ? new Date(r.fechaCreacion).toLocaleString("es-MX")
          : ""
      });
    });
 
    const totalesRow = wsReservas.addRow({
      fecha: "TOTAL",
      costoTotal: { formula: `SUM(E2:E${reservas.length + 1})` }
    });
    totalesRow.font = {
      bold: true,
      size: 12,
      color: { argb: "FF00F2FE" }
    };
    totalesRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" }
    };
 
    // --- Enviar archivo ---
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="reservas-estacionamiento.xlsx"'
    );
 
    await workbook.xlsx.write(res);
    res.end();
    console.log(`[Excel] Total ${Date.now() - inicio}ms`);
  } catch (error) {
    console.error("Error al generar Excel:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        mensaje: "No se pudo generar el archivo Excel.",
        detalle: error.message
      });
    }
  }
});
 
// ==========================================
// 7. INICIAR SERVIDOR
// ==========================================
app.get("/api/health/ia", async (req, res) => {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return res.status(500).json({
      ok: false,
      mensaje: "GOOGLE_GENERATIVE_AI_API_KEY no está configurada."
    });
  }
 
  try {
    const inicio = Date.now();
    await generateText({
      model: google(MODELO_IA),
      prompt: "Responde solo con la palabra: OK",
      maxOutputTokens: 5
    });
    return res.json({
      ok: true,
      proveedor: "Google Gemini",
      modelo: MODELO_IA,
      latenciaMs: Date.now() - inicio
    });
  } catch (error) {
    console.error("Health check IA falló:", error.message);
    return res.status(500).json({
      ok: false,
      mensaje: error.message
    });
  }
});
const servidor = app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
  console.log("Firebase Firestore preparado.");
 
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.warn(
      "⚠️  GOOGLE_GENERATIVE_AI_API_KEY no está definida. Los endpoints de IA fallarán."
    );
  } else {
    console.log(`IA de Google Gemini configurada (modelo: ${MODELO_IA}).`);
  }
});
 
function cerrarServidor() {
  console.log("Cerrando conexiones...");
  clienteMQTT.end(true);
  servidor.close(() => process.exit(0));
}
 
process.on("SIGINT", cerrarServidor);
process.on("SIGTERM", cerrarServidor);
 
// ==========================================
// AUTENTICACIÓN DE ADMINISTRADORES
// ==========================================
 
async function verificarAdministrador(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";
 
    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        autorizado: false,
        mensaje: "No se proporcionó un token de autenticación."
      });
    }
 
    const token = authorization.split(" ")[1];
 
    const decodedToken = await adminAuth.verifyIdToken(token);
 
    const userRef = db.collection("users").doc(decodedToken.uid);
    const userSnap = await userRef.get();
 
    if (!userSnap.exists) {
      return res.status(403).json({
        autorizado: false,
        mensaje: "El usuario no está registrado."
      });
    }
 
    const userData = userSnap.data();
 
    if (userData.rol !== "admin" || userData.estado !== true) {
      return res.status(403).json({
        autorizado: false,
        mensaje: "No tienes permisos para validar accesos."
      });
    }
 
    req.admin = {
      uid: decodedToken.uid
    };
 
    next();
 
  } catch (error) {
    console.error("Error de autenticación:", error.message);
 
    return res.status(401).json({
      autorizado: false,
      mensaje: "La sesión no es válida o ha expirado."
    });
  }
}
 
 
// ==========================================
// AUTENTICACIÓN DE USUARIOS
// ==========================================
 
async function verificarUsuario(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";
 
    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        autorizado: false,
        mensaje: "No se proporcionó un token de autenticación."
      });
    }
 
    const token = authorization.split(" ")[1];
 
    const decodedToken = await adminAuth.verifyIdToken(token);
 
    req.usuario = {
      uid: decodedToken.uid
    };
 
    next();
 
  } catch (error) {
    console.error("Error de autenticación del usuario:", error.message);
 
    return res.status(401).json({
      autorizado: false,
      mensaje: "La sesión no es válida o ha expirado."
    });
  }
}
 
 
// ==========================================
// COTIZAR ESTANCIA ACTIVA
// ==========================================
 
app.post("/api/pagos/cotizar", verificarUsuario, async (req, res) => {
  try {
    const uid = req.usuario.uid;
 
    // Buscar los accesos registrados por este usuario.
    const consulta = await db
      .collection("accesos")
      .where("uid", "==", uid)
      .get();
 
    // Filtrar entradas autorizadas, activas y pendientes de pago.
    const posiblesEstancias = consulta.docs.filter((doc) => {
      const acceso = doc.data();
 
      return (
        acceso.tipo === "entrada" &&
        acceso.estado === "autorizado" &&
        acceso.estanciaEstado === "activa" &&
        acceso.pagoEstado === "pendiente" &&
        acceso.horaSalida == null &&
        typeof acceso.reservaId === "string" &&
        acceso.reservaId.trim() !== ""
      );
    });
 
    // Comprobar que la reserva asociada también esté activa.
    const resultados = await Promise.all(
      posiblesEstancias.map(async (doc) => {
        const acceso = doc.data();
 
        const reservaRef = db
          .collection("reservas")
          .doc(acceso.reservaId);
 
        const reservaSnap = await reservaRef.get();
 
        if (!reservaSnap.exists) {
          return null;
        }
 
        const reserva = reservaSnap.data();
 
        // Ignorar reservas canceladas, finalizadas o inexistentes.
        if (reserva.estado !== "activa") {
          return null;
        }
 
        return doc;
      })
    );
 
    // Conservar únicamente las estancias válidas.
    const estanciasActivas = resultados.filter(Boolean);
 
    console.log(
      "ESTANCIAS VÁLIDAS PARA COTIZAR:",
      estanciasActivas.map((doc) => {
        const acceso = doc.data();
 
        return {
          accesoId: doc.id,
          placa: acceso.placa,
          estacionamiento: acceso.estacionamiento,
          espacio: acceso.espacio,
          reservaId: acceso.reservaId
        };
      })
    );
 
    if (estanciasActivas.length === 0) {
      return res.status(404).json({
        disponible: false,
        mensaje: "No tienes una estancia activa pendiente de pago."
      });
    }
 
    if (estanciasActivas.length > 1) {
      return res.status(409).json({
        disponible: false,
        mensaje: "Tienes más de una estancia activa. Se requiere identificar cuál deseas pagar."
      });
    }
 
    const documento = estanciasActivas[0];
    const acceso = documento.data();
 
    // Obtener la hora de entrada registrada en Firestore.
    const horaEntrada = acceso.horaEntrada?.toDate?.();
 
    if (!horaEntrada || Number.isNaN(horaEntrada.getTime())) {
      return res.status(400).json({
        disponible: false,
        mensaje: "La hora de entrada no es válida."
      });
    }
 
    // Validar la tarifa por hora.
    const tarifaHora = Number(acceso.tarifaHora);
 
    if (!Number.isFinite(tarifaHora) || tarifaHora <= 0) {
      return res.status(400).json({
        disponible: false,
        mensaje: "No se pudo determinar la tarifa por hora."
      });
    }
 
    // Calcular el tiempo real transcurrido.
    const ahora = Date.now();
 
    const milisegundosEstacionado = Math.max(
      0,
      ahora - horaEntrada.getTime()
    );
 
    const minutosEstacionado =
      milisegundosEstacionado / 60000;
 
    // Cobro proporcional al tiempo real, redondeado a centavos.
    const monto = Number(
      ((tarifaHora * milisegundosEstacionado) / 3600000).toFixed(2)
    );
 
    return res.status(200).json({
      disponible: true,
      mensaje: "Cotización calculada correctamente.",
      cotizacion: {
        accesoId: documento.id,
        reservaId: acceso.reservaId,
        estacionamiento: acceso.estacionamiento,
        espacio: acceso.espacio,
        placa: acceso.placa,
        horaEntrada: horaEntrada.toISOString(),
        minutosEstacionado: Number(minutosEstacionado.toFixed(2)),
        tarifaHora,
        monto,
        moneda: "MXN"
      }
    });
 
  } catch (error) {
    console.error("Error al calcular el pago:", error);
 
    return res.status(500).json({
      disponible: false,
      mensaje: "No fue posible calcular el pago."
    });
  }
});
 
 
// ==========================================
// CONFIRMAR PAGO Y GENERAR QR DE SALIDA
// ==========================================
 
app.post("/api/pagos/confirmar", verificarUsuario, async (req, res) => {
  try {
    const uid = req.usuario.uid;
    const { accesoId } = req.body;
 
    if (typeof accesoId !== "string" || !accesoId.trim()) {
      return res.status(400).json({
        pagado: false,
        mensaje: "Debes proporcionar el identificador de la estancia."
      });
    }
 
    const accesoRef = db.collection("accesos").doc(accesoId.trim());
 
    // Crear referencias para el pago y el QR.
    const pagoRef = db.collection("pagos").doc();
    const qrSalidaRef = db.collection("codigos_qr").doc();
 
    const resultado = await db.runTransaction(async (transaction) => {
      const accesoSnap = await transaction.get(accesoRef);
 
      if (!accesoSnap.exists) {
        throw new Error("ESTANCIA_NO_ENCONTRADA");
      }
 
      const acceso = accesoSnap.data();
 
      if (acceso.uid !== uid) {
        throw new Error("ESTANCIA_NO_AUTORIZADA");
      }
 
      if (
        acceso.tipo !== "entrada" ||
        acceso.estanciaEstado !== "activa"
      ) {
        throw new Error("ESTANCIA_NO_ACTIVA");
      }
 
      if (acceso.pagoEstado === "pagado") {
        throw new Error("PAGO_YA_REALIZADO");
      }
 
      if (acceso.horaSalida) {
        throw new Error("ESTANCIA_FINALIZADA");
      }
 
      const horaEntrada = acceso.horaEntrada?.toDate?.();
      const tarifaHora = Number(acceso.tarifaHora);
 
      if (
        !horaEntrada ||
        Number.isNaN(horaEntrada.getTime()) ||
        !Number.isFinite(tarifaHora) ||
        tarifaHora <= 0
      ) {
        throw new Error("DATOS_ESTANCIA_INVALIDOS");
      }
 
      // Recalcular el importe en el servidor.
      const ahora = Date.now();
 
      const milisegundosEstacionado = Math.max(
        0,
        ahora - horaEntrada.getTime()
      );
 
      const monto = Number(
        ((tarifaHora * milisegundosEstacionado) / 3600000).toFixed(2)
      );
 
      const referencia = `SP-${pagoRef.id}`;
 
      // Registrar el pago simulado.
      transaction.create(pagoRef, {
        uid,
        reservaId: acceso.reservaId,
        accesoId: accesoRef.id,
        monto,
        moneda: "MXN",
        metodo: "simulado",
        estado: "pagado",
        referencia,
        creadoEn: FieldValue.serverTimestamp()
      });
 
      // Crear QR exclusivo para la salida.
      transaction.create(qrSalidaRef, {
        uid,
        reservaId: acceso.reservaId,
        accesoId: accesoRef.id,
        tipo: "salida",
        estado: "activo",
        creadoEn: FieldValue.serverTimestamp(),
        expiraEn: new Date(Date.now() + 60 * 60 * 1000),
        escaneadoEn: null
      });
 
      // Actualizar la estancia.
      transaction.update(accesoRef, {
        pagoEstado: "pagado",
        pagoId: pagoRef.id,
        qrSalidaId: qrSalidaRef.id,
        montoPagado: monto,
        pagoConfirmadoEn: FieldValue.serverTimestamp()
      });
 
      return {
        pagoId: pagoRef.id,
        qrSalidaId: qrSalidaRef.id,
        reservaId: acceso.reservaId,
        monto,
        moneda: "MXN",
        referencia
      };
    });
 
    return res.status(200).json({
      pagado: true,
      mensaje: "Pago simulado registrado correctamente.",
      pago: resultado
    });
 
  } catch (error) {
    console.error("Error al confirmar pago:", error.message);
 
    const errores = {
      ESTANCIA_NO_ENCONTRADA: [404, "No encontramos la estancia."],
      ESTANCIA_NO_AUTORIZADA: [403, "Esta estancia no pertenece a tu usuario."],
      ESTANCIA_NO_ACTIVA: [409, "La estancia no está activa."],
      PAGO_YA_REALIZADO: [409, "Esta estancia ya fue pagada."],
      ESTANCIA_FINALIZADA: [409, "La estancia ya fue finalizada."],
      DATOS_ESTANCIA_INVALIDOS: [400, "Los datos de la estancia no son válidos."]
    };
 
    const [status, mensaje] = errores[error.message] || [
      500,
      "No fue posible registrar el pago."
    ];
 
    return res.status(status).json({
      pagado: false,
      mensaje
    });
  }
});
 
 
 
// ==========================================
// VALIDAR QR Y REGISTRAR ACCESO
// ==========================================
 
app.post(
  "/api/accesos/validar-qr",
  verificarAdministrador,
  async (req, res) => {
    try {
      const { qrId } = req.body;
 
      if (typeof qrId !== "string" || !qrId.trim()) {
        return res.status(400).json({
          autorizado: false,
          mensaje: "Debes proporcionar un código QR."
        });
      }
 
      const resultado = await db.runTransaction(async (transaction) => {
        const qrRef = db.collection("codigos_qr").doc(qrId.trim());
        const qrSnap = await transaction.get(qrRef);
 
        if (!qrSnap.exists) {
          throw new Error("QR_NO_ENCONTRADO");
        }
 
        const qrData = qrSnap.data();
 
        if (qrData.estado !== "activo") {
          throw new Error(
            qrData.estado === "escaneado"
              ? "QR_YA_UTILIZADO"
              : "QR_NO_ACTIVO"
          );
        }
 
        // ==========================================
        // VALIDAR QR DE SALIDA
        // ==========================================
 
        if (qrData.tipo === "salida") {
 
          if (!qrData.uid || !qrData.accesoId || !qrData.reservaId) {
            throw new Error("QR_INCOMPLETO");
          }
 
          // Verificar que el QR no haya expirado.
          const expiraSalida = qrData.expiraEn?.toDate?.();
 
          if (
            !expiraSalida ||
            Number.isNaN(expiraSalida.getTime()) ||
            Date.now() > expiraSalida.getTime()
          ) {
            throw new Error("QR_EXPIRADO");
          }
 
          // Buscar la estancia relacionada con el QR.
          const accesoSalidaRef = db
            .collection("accesos")
            .doc(qrData.accesoId);
 
          const accesoSalidaSnap = await transaction.get(accesoSalidaRef);
 
          if (!accesoSalidaSnap.exists) {
            throw new Error("ACCESO_NO_ENCONTRADO");
          }
 
          const accesoSalida = accesoSalidaSnap.data();
 
          // Verificar que el QR corresponda a la estancia.
          if (
            accesoSalida.uid !== qrData.uid ||
            accesoSalida.reservaId !== qrData.reservaId ||
            accesoSalida.qrSalidaId !== qrRef.id
          ) {
            throw new Error("QR_SALIDA_NO_COINCIDE");
          }
 
          // Verificar que el pago esté confirmado.
          if (accesoSalida.pagoEstado !== "pagado") {
            throw new Error("PAGO_NO_CONFIRMADO");
          }
 
          // Verificar que la estancia siga activa.
          if (accesoSalida.estanciaEstado !== "activa") {
            throw new Error("ESTANCIA_NO_ACTIVA");
          }
 
          if (accesoSalida.horaSalida) {
            throw new Error("ESTANCIA_YA_FINALIZADA");
          }
 
          // Consumir el QR de salida.
          transaction.update(qrRef, {
            estado: "escaneado",
            escaneadoEn: FieldValue.serverTimestamp(),
            escaneadoPor: req.admin.uid
          });
 
          // Registrar la hora real de salida.
          transaction.update(accesoSalidaRef, {
            horaSalida: FieldValue.serverTimestamp(),
            estanciaEstado: "finalizada",
            salidaAutorizadaPor: req.admin.uid,
            qrSalidaEscaneadoEn: FieldValue.serverTimestamp()
          });
 
          return {
            tipo: "salida",
            accesoId: accesoSalidaRef.id,
            reservaId: accesoSalida.reservaId,
            estacionamiento: accesoSalida.estacionamiento || "",
            espacio: accesoSalida.espacio || "",
            placa: accesoSalida.placa || ""
          };
        }
 
 
        if (!qrData.uid || !qrData.reservaId) {
          throw new Error("QR_INCOMPLETO");
        }
 
        const reservaRef = db.collection("reservas").doc(qrData.reservaId);
        const reservaSnap = await transaction.get(reservaRef);
 
        if (!reservaSnap.exists) {
          throw new Error("RESERVA_NO_ENCONTRADA");
        }
 
        const reserva = reservaSnap.data();
 
        if (reserva.estado === "cancelada") {
          throw new Error("RESERVA_CANCELADA");
        }
 
        if (reserva.uid !== qrData.uid) {
          throw new Error("USUARIO_NO_COINCIDE");
        }
 
        const expira = qrData.expiraEn?.toDate?.();
 
        if (
          !expira ||
          Number.isNaN(expira.getTime()) ||
          Date.now() > expira.getTime()
        ) {
          throw new Error("QR_EXPIRADO");
        }
 
        const accesoRef = db.collection("accesos").doc();
 
        // Consumir el QR.
        transaction.update(qrRef, {
          estado: "escaneado",
          escaneadoEn: FieldValue.serverTimestamp(),
          escaneadoPor: req.admin.uid
        });
 
        // Actualizar el registro de reserva.
        transaction.update(reservaRef, {
          qrEscaneado: true,
          qrEscaneadoAt: FieldValue.serverTimestamp()
        });
 
        // Crear el registro de entrada.
        // Calcular tarifa por hora
const costoReserva = Number(reserva.costoTotal);
 
const duracionReservaHoras = parseFloat(
  String(reserva.duracion || "").replace(",", ".")
);
 
const tarifaHora =
  Number.isFinite(costoReserva) &&
  Number.isFinite(duracionReservaHoras) &&
  duracionReservaHoras > 0
    ? Number((costoReserva / duracionReservaHoras).toFixed(2))
    : null;
 
        // Crear registro de entrada
        transaction.create(accesoRef, {
          qrId: qrRef.id,
          reservaId: reservaRef.id,
          uid: qrData.uid,
          administradorUid: req.admin.uid,
 
          estacionamiento: reserva.estacionamiento || "",
          espacio: reserva.espacio || "",
          placa: reserva.placa || "",
          marca: reserva.marca || "",
          modelo: reserva.modelo || "",
 
          tipo: "entrada",
          estado: "autorizado",
          estanciaEstado: "activa",
 
          horaEntrada: FieldValue.serverTimestamp(),
          fechaAcceso: FieldValue.serverTimestamp(),
 
          costoReserva: Number.isFinite(costoReserva)
            ? costoReserva
            : null,
 
          duracionReservaHoras:
            Number.isFinite(duracionReservaHoras) &&
            duracionReservaHoras > 0
              ? duracionReservaHoras
              : null,
 
          tarifaHora,
 
          horaSalida: null,
          pagoEstado: "pendiente",
          pagoId: null,
          qrSalidaId: null
        });
 
        return {
          accesoId: accesoRef.id,
          reservaId: reservaRef.id,
          estacionamiento: reserva.estacionamiento || "",
          espacio: reserva.espacio || "",
          placa: reserva.placa || "",
          marca: reserva.marca || "",
          modelo: reserva.modelo || ""
        };
      });
 
      return res.status(200).json({
        autorizado: true,
        mensaje: resultado.tipo === "salida"
          ? "Salida autorizada correctamente."
          : "Acceso autorizado correctamente.",
        acceso: resultado
      });
 
    } catch (error) {
      console.error("Error al validar QR:", error.message);
 
      const errores = {
        QR_NO_ENCONTRADO: [404, "El código QR no existe."],
        QR_YA_UTILIZADO: [409, "Este código QR ya fue utilizado."],
        QR_NO_ACTIVO: [403, "El código QR no está activo."],
        QR_INCOMPLETO: [400, "El código QR no contiene los datos necesarios."],
        RESERVA_NO_ENCONTRADA: [404, "No encontramos la reserva."],
        RESERVA_CANCELADA: [403, "La reserva fue cancelada."],
        USUARIO_NO_COINCIDE: [403, "El QR no corresponde al propietario de la reserva."],
        QR_EXPIRADO: [403, "El código QR ha expirado."],
        ACCESO_NO_ENCONTRADO: [404, "No encontramos la estancia."],
        QR_SALIDA_NO_COINCIDE: [403, "El QR de salida no corresponde a esta estancia."],
        PAGO_NO_CONFIRMADO: [403, "El pago no está confirmado."],
        ESTANCIA_NO_ACTIVA: [409, "La estancia ya no está activa."],
        ESTANCIA_YA_FINALIZADA: [409, "Esta estancia ya fue finalizada."],
      };
 
      const [status, mensaje] = errores[error.message] || [
        500,
        "Ocurrió un error al procesar el acceso."
      ];
 
      return res.status(status).json({
        autorizado: false,
        mensaje
      });
    }
  }
);