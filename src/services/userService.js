import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

/* ---------- PERFIL ---------- */
export const getPerfil = async (uid) => {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const updatePerfil = async (uid, data) => {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, data);
};

/* ---------- VEHÍCULO ---------- */
// Crea la colección "vehiculos" si no existe y guarda el vehículo
export const saveVehiculo = async (uid, vehiculo) => {
  const colRef = collection(db, "vehiculos");
  const q = query(colRef, where("uid", "==", uid));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    // Actualiza el existente
    const docId = snapshot.docs[0].id;
    await updateDoc(doc(db, "vehiculos", docId), {
      ...vehiculo,
      uid,
      fechaActualizacion: serverTimestamp()
    });
    return docId;
  } else {
    // Crea uno nuevo
    const newDoc = await addDoc(colRef, {
      ...vehiculo,
      uid,
      fechaCreacion: serverTimestamp()
    });
    return newDoc.id;
  }
};

export const getVehiculo = async (uid) => {
  const q = query(collection(db, "vehiculos"), where("uid", "==", uid));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
};