const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

// En Render, el archivo estará en /etc/secrets/
const serviceAccountPath = fs.existsSync("/etc/secrets/serviceAccountKey.json")
  ? "/etc/secrets/serviceAccountKey.json"
  : path.join(__dirname, "serviceAccountKey.json");

const serviceAccount = require(serviceAccountPath);

const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(serviceAccount)
    });

const db = getFirestore(firebaseApp);

console.log("Firebase Admin conectado correctamente.");

module.exports = {
  db,
  FieldValue
};