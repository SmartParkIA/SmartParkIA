import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config.js";

/* ---------- PERFIL ---------- */
export const getPerfil = async (uid) => {
  if (!uid) return null;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const updatePerfil = async (uid, data) => {
  if (!uid) return;
  const ref = doc(db, "users", uid);
  await updateDoc(ref, data);
};

/* ---------- VEHÍCULOS (Múltiples) ---------- */
export const getVehiculos = async (uid) => {
  if (!uid) return [];
  try {
    const q = query(collection(db, "vehiculos"), where("uid", "==", uid));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al obtener vehículos:", error);
    return [];
  }
};

export const saveVehiculo = async (uid, vehiculo, docId = null) => {
  if (!uid) return;
  try {
    if (docId) {
      // Actualizar existente
      const docRef = doc(db, "vehiculos", docId);
      await updateDoc(docRef, { ...vehiculo, uid, fechaActualizacion: serverTimestamp() });
    } else {
      // Crear nuevo
      await addDoc(collection(db, "vehiculos"), {
        ...vehiculo,
        uid,
        fechaCreacion: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Error al guardar vehículo:", error);
    throw error;
  }
};