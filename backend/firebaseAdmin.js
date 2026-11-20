const fs = require("fs");
const path = require("path");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

function leerJsonSeguro(rutaArchivo, origen) {
  try {
    const contenido = fs.readFileSync(rutaArchivo, "utf8");
    console.log(`🔐 Credenciales Firebase cargadas desde: ${origen}`);
    return JSON.parse(contenido);
  } catch (error) {
    throw new Error(
      `Error al leer o parsear credenciales de Firebase (${origen}): ${error.message}`
    );
  }
}

function cargarCredenciales() {
  const renderSecretPath = "/etc/secrets/serviceAccountKey.json";
  const localPath = path.join(__dirname, "serviceAccountKey.json");

  if (fs.existsSync(renderSecretPath)) {
    return leerJsonSeguro(renderSecretPath, renderSecretPath);
  }

  if (fs.existsSync(localPath)) {
    return leerJsonSeguro(localPath, localPath);
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      console.log("🔐 Credenciales Firebase cargadas desde: FIREBASE_SERVICE_ACCOUNT_JSON");
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (error) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_JSON no contiene un JSON válido: ${error.message}`
      );
    }
  }

  throw new Error(
    "No se encontró serviceAccountKey.json en /etc/secrets/serviceAccountKey.json ni en la carpeta local."
  );
}

const serviceAccount = cargarCredenciales();

const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(serviceAccount),
    });

const db = getFirestore(firebaseApp);
const adminAuth = getAuth(firebaseApp);

console.log("Firebase Admin conectado correctamente.");

module.exports = {
  db,
  FieldValue,
  adminAuth,
};