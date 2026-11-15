import { predecirOcupacionReal } from './predictionModel.js';
import { db } from "../../firebase/config.js";
import { collection, getDocs } from "firebase/firestore";

export async function obtenerProyeccionHandler(req, res) {
    try {
        // Extraemos hora y día del query por si la interfaz los manda
        let { hora, dia } = req.query;
        const ahora = new Date();

        // Si no se envían parámetros, usamos la hora y el día real del sistema automáticamente
        if (!hora || !dia) {
            const horaActual = ahora.getHours();
            hora = `${horaActual}:00`;

            const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
            dia = diasSemana[ahora.getDay()];
        }

        // 1. Consultar el estado REAL de los cajones en Firebase Firestore en este instante
        let porcentajeReal = null;
        try {
            const querySnapshot = await getDocs(collection(db, "lugares"));
            let totalCajones = 0;
            let cajonesOcupados = 0;

            querySnapshot.forEach((doc) => {
                const datos = doc.data();
                if (typeof datos.ocupado === "boolean" || typeof datos.estado === "string") {
                    totalCajones++;
                    const estaOcupado = typeof datos.ocupado === "boolean" ? datos.ocupado : datos.estado === "ocupado";
                    if (estaOcupado) {
                        cajonesOcupados++;
                    }
                }
            });

            if (totalCajones > 0) {
                porcentajeReal = Math.round((cajonesOcupados / totalCajones) * 100);
            }
        } catch (dbError) {
            console.error("No se pudo leer Firestore en tiempo real, usando modelo base:", dbError);
        }

        // 2. Obtenemos la predicción base del modelo
        const resultadoPrediccion = await predecirOcupacionReal(hora, dia);

        // 3. Si logramos calcular el porcentaje real de los sensores, se lo asignamos a la respuesta
        if (porcentajeReal !== null && resultadoPrediccion) {
            resultadoPrediccion.porcentajeEstimado = porcentajeReal;
            
            // Actualizamos opcionalmente el nivel de saturación en base al porcentaje real
            if (porcentajeReal <= 40) resultadoPrediccion.nivelSaturacion = "Bajo";
            else if (porcentajeReal <= 75) resultadoPrediccion.nivelSaturacion = "Moderado";
            else resultadoPrediccion.nivelSaturacion = "Alto";
        }

        // Formateamos la hora bonita para la UI
        const horaFormateada = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (resultadoPrediccion) {
            resultadoPrediccion.horaConsulta = horaFormateada;
            resultadoPrediccion.diaSemana = dia;
        }

        return res.status(200).json({
            status: "success",
            mensaje: "Datos obtenidos correctamente en tiempo real desde Firebase",
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