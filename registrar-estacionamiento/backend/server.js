
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { db, FieldValue } = require("./firebaseAdmin");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    mensaje: "API de SmartParkIA conectada con Firebase"
  });
});

// Registrar estacionamiento en Firestore
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
        ...nuevoEstacionamiento,
        fecha_registro: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error al registrar estacionamiento:", error);

    return res.status(500).json({
      mensaje: "No fue posible registrar el estacionamiento."
    });
  }
});

// Consultar estacionamientos de Firestore
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

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
  console.log("Conectado a Firebase Firestore");
});
