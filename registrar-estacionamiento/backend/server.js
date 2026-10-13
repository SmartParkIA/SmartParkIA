
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    mensaje: "API de registro de estacionamientos funcionando"
  });
});

// Registrar una nueva sede
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

    // Validar campos obligatorios
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
        mensaje: "La capacidad debe ser un número entero mayor que cero."
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

    if (!horaValida(hora_apertura) || !horaValida(hora_cierre)) {
      return res.status(400).json({
        mensaje: "Las horas deben tener el formato HH:MM."
      });
    }

    const sql = `
      INSERT INTO estacionamientos
      (
        nombre,
        direccion,
        ciudad,
        capacidad,
        hora_apertura,
        hora_cierre,
        telefono
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [resultado] = await db.execute(sql, [
      nombre.trim(),
      direccion.trim(),
      ciudad.trim(),
      capacidadNumero,
      hora_apertura,
      hora_cierre,
      telefono.trim()
    ]);

    return res.status(201).json({
      mensaje: "Estacionamiento registrado correctamente.",
      estacionamiento: {
        id: resultado.insertId,
        nombre: nombre.trim(),
        direccion: direccion.trim(),
        ciudad: ciudad.trim(),
        capacidad: capacidadNumero,
        hora_apertura,
        hora_cierre,
        telefono: telefono.trim(),
        estado: "activo"
      }
    });
  } catch (error) {
    console.error("Error al registrar estacionamiento:", error.message);

    return res.status(500).json({
      mensaje: "No fue posible registrar el estacionamiento."
    });
  }
});

// Consultar las sedes registradas
app.get("/api/estacionamientos", async (req, res) => {
  try {
    const [filas] = await db.execute(
      "SELECT * FROM estacionamientos ORDER BY id DESC"
    );

    res.json(filas);
  } catch (error) {
    console.error("Error al consultar estacionamientos:", error.message);

    res.status(500).json({
      mensaje: "No fue posible consultar los estacionamientos."
    });
  }
});

const PORT = process.env.PORT || 3001;

async function iniciarServidor() {
  try {
    await db.query("SELECT 1");

    app.listen(PORT, () => {
      console.log(`Servidor activo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(
      "No se pudo conectar a MySQL. Verifica XAMPP y el archivo .env.",
      error.message
    );
    process.exit(1);
  }
}

iniciarServidor();
