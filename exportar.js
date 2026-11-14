import admin from "firebase-admin";
import fs from "fs";

// Carga el archivo de credenciales de forma compatible con ES Modules
const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("./serviceAccountKey.json", import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function exportarDiccionario() {
  const collections = await db.listCollections();
  const diccionarioBaseDatos = {};

  for (const collection of collections) {
    console.log(`Leyendo colección: ${collection.id}...`);
    diccionarioBaseDatos[collection.id] = {};

    const snapshot = await collection.get();
    for (const doc of snapshot.docs) {
      diccionarioBaseDatos[collection.id][doc.id] = doc.data();
    }
  }

  fs.writeFileSync("diccionario_firestore.json", JSON.stringify(diccionarioBaseDatos, null, 2));
  console.log("¡Listo! Tu diccionario se guardó en 'diccionario_firestore.json'.");
}

exportarDiccionario().catch(console.error);