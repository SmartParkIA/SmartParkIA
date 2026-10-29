import { auth, db } from "./firebase/config.js";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { showToast } from "./toast.js";

document.addEventListener("DOMContentLoaded", () => {
    const reservaForm = document.getElementById("reservaForm");
    const btnReservar = document.getElementById("btnReservar");

    if (reservaForm) {
        reservaForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const user = auth.currentUser;
            if (!user) {
                showToast("No has iniciado sesión.", "error");
                return;
            }

            const estacionamiento = document.getElementById("estacionamiento").value;
            const espacio = document.getElementById("espacio").value;
            const fecha = document.getElementById("fecha").value;
            const horario = document.getElementById("horario").value;
            const duracion = document.getElementById("duracion").value;

            if (btnReservar) {
                btnReservar.textContent = "Procesando...";
                btnReservar.disabled = true;
            }

            try {
                // 1. Validar que no tenga otra activa
                const qUser = query(collection(db, "reservas"), where("uid", "==", user.uid), where("estado", "==", "activa"));
                const snapUser = await getDocs(qUser);
                if (!snapUser.empty) {
                    showToast("Ya tienes una reserva activa. Cancélala primero.", "error");
                    if (btnReservar) { btnReservar.textContent = "Confirmar Reserva"; btnReservar.disabled = false; }
                    return;
                }

                // 2. Validar que el cajón no esté ocupado
                const qCajon = query(collection(db, "reservas"), where("espacio", "==", espacio), where("estado", "==", "activa"));
                const snapCajon = await getDocs(qCajon);
                if (!snapCajon.empty) {
                    showToast("Ese cajón ya está ocupado por otra persona.", "error");
                    if (btnReservar) { btnReservar.textContent = "Confirmar Reserva"; btnReservar.disabled = false; }
                    return;
                }

                // 3. Guardar en Firestore TODOS los campos
                await addDoc(collection(db, "reservas"), {
                    uid: user.uid,
                    estacionamiento: estacionamiento,
                    espacio: espacio,
                    fecha: fecha,
                    horario: horario,
                    duracion: duracion + " horas",
                    estado: "activa", // <-- ESTE ES EL QUE FALTABA EN LA PRUEBA
                    fechaCreacion: new Date().toISOString()
                });

                showToast("¡Reserva confirmada con éxito!", "success");
                
                setTimeout(() => {
                    window.location.href = "ver-reserva.html"; 
                }, 1500);

            } catch (error) {
                console.error("Error al reservar:", error);
                showToast("Ocurrió un error al guardar la reserva.", "error");
                if (btnReservar) { btnReservar.textContent = "Confirmar Reserva"; btnReservar.disabled = false; }
            }
        });
    }
});