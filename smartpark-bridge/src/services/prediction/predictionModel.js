import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Cargar credenciales de Firebase desde la raíz del proyecto o bridge
// (Ajusta la ruta si tu serviceAccountKey.json está en otra carpeta)
const serviceAccount = JSON.parse(
    fs.readFileSync('./serviceAccountKey.json', 'utf8')
);

// Inicializar Firebase Admin si no está inicializada
try {
    initializeApp({
        credential: cert(serviceAccount)
    });
} catch (error) {
    // Evita error si ya fue inicializada previamente
}

const db = getFirestore();

/**
 * Obtiene la ocupación real consultando la colección 'lugares' en Firestore
 */
export async function predecirOcupacionReal(horaObjetivo, diaObjetivo) {
    try {
        // Consultar todos los documentos dentro de la colección 'lugares'
        const snapshot = await db.collection('lugares').get();
        
        if (snapshot.empty) {
            return {
                porcentajeEstimado: 0,
                nivelSaturacion: "SIN DATOS EN FIREBASE"
            };
        }

        let totalCajones = 0;
        let cajonesOcupados = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            totalCajones++;
            // Verificamos el campo 'ocupado' que se ve en tu Firestore
            if (data.ocupado === true) {
                cajonesOcupados++;
            }
        });

        // Calcular el porcentaje de ocupación real actual en base a tus sensores/cajones
        const porcentajeReal = totalCajones > 0 ? Math.round((cajonesOcupados / totalCajones) * 100) : 0;

        return calcularEstadoSaturacion(porcentajeReal, horaObjetivo, diaObjetivo);

    } catch (error) {
        console.error("Error al conectar con Firebase:", error);
        return {
            porcentajeEstimado: 50,
            nivelSaturacion: "ERROR DE CONEXIÓN"
        };
    }
}

function calcularEstadoSaturacion(porcentaje, hora, dia) {
    let nivel = "BAJA";
    if (porcentaje >= 80) {
        nivel = "ALTA (Saturado)";
    } else if (porcentaje >= 50) {
        nivel = "MEDIA (Moderado)";
    }
    
    return {
        horaConsulta: hora,
        diaSemana: dia,
        porcentajeEstimado: porcentaje,
        nivelSaturacion: nivel
    };
}