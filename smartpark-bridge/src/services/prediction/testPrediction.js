import { predecirOcupacionReal } from './predictionModel.js';
import { obtenerProyeccionHandler } from './predictionController.js';

console.log("=== PRUEBA DE PREDICCIÓN EN TIEMPO REAL ===");

async function ejecutarPrueba() {
    // Obtenemos la hora y día real actuales del sistema
    const ahora = new Date();
    const horaActual = `${ahora.getHours()}:00`;
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const diaActual = diasSemana[ahora.getDay()];

    console.log(`\n[Tarea 065] Consultando Firebase para el día de hoy (${diaActual}, ${horaActual} hrs)...`);
    const resultadoModelo = await predecirOcupacionReal(horaActual, diaActual);
    console.log(resultadoModelo);

    // Probando el controlador sin enviar parámetros (debe tomar el día y hora actual automáticamente)
    const reqFalsa = { query: {} }; 
    const resFalsa = {
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            console.log(`\n[Tarea 066] Respuesta automática de la API (Status ${this.statusCode}):`);
            console.log(JSON.stringify(data, null, 2));
        }
    };

    console.log("\n[Tarea 066] Probando controlador API automático...");
    await obtenerProyeccionHandler(reqFalsa, resFalsa);
}

ejecutarPrueba();