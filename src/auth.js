import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig.js";

export async function registrarUsuarioCompleto(email, password, nombres, apellidoPaterno, apellidoMaterno, fechaNacimiento) {
  try {
    console.log("Iniciando registro en Auth...");
    // 1. Crear usuario en Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("Usuario creado en Auth con UID:", user.uid);

    // 2. Guardar todos los campos en Cloud Firestore
    console.log("Guardando en Firestore...");
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      nombres: nombres,
      apellidoPaterno: apellidoPaterno,
      apellidoMaterno: apellidoMaterno,
      correo: email,
      fechaNacimiento: new Date(fechaNacimiento),
      estado: true,
      rol: "usuario",
      fechaCreacion: new Date()
    });

    console.log("¡Guardado exitoso en Firestore!");
    return { exito: true, user };
  } catch (error) {
    console.error("Error detallado en el registro:", error.code, error.message);
    return { exito: false, error: error.message };
  }
}