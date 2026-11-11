import { predecirOcupacionReal } from './predictionModel.js';

export async function obtenerProyeccionHandler(req, res) {
    try {
        // Extraemos hora y día del query por si la interfaz los manda
        let { hora, dia } = req.query;

        // Si no se envían parámetros, usamos la hora y el día real del sistema automáticamente
        if (!hora || !dia) {
            const ahora = new Date();
            const horaActual = ahora.getHours();
            hora = `${horaActual}:00`;

            const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
            dia = diasSemana[ahora.getDay()];
        }

        // Esperamos la respuesta de la base de datos de Firebase
        const resultadoPrediccion = await predecirOcupacionReal(hora, dia);

        return res.status(200).json({
            status: "success",
            mensaje: "Datos obtenidos correctamente desde Firebase Firestore",
            data: resultadoPrediccion
        });
    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error interno al consultar Firebase",
            detalles: error.message
        });
    }
}