const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Render guarda los saltos de línea como "\n" literales,
        // hay que convertirlos a saltos reales.
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });

const db = getFirestore(firebaseApp);

console.log("Firebase Admin conectado correctamente.");

module.exports = {
  db,
  FieldValue,
};