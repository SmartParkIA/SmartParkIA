import { db, auth } from "./firebase/config.js";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";

const tableBody = document.getElementById("userTableBody");
const logoutBtn = document.getElementById("logoutBtn");

// 1. Proteger la ruta: Si no hay usuario autenticado, expulsarlo al login
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("login.html");
    } else {
        cargarUsuarios(); // Cargar la tabla solo si hay sesión activa
    }
});

// 2. Cargar y renderizar la lista de usuarios desde Firestore
async function cargarUsuarios() {
    if (!tableBody) return;
    tableBody.innerHTML = "<tr><td colspan='4' style='text-align:center; color: #E0E0E0;'>Cargando usuarios...</td></tr>";
    
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        tableBody.innerHTML = "";

        querySnapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            const userId = userDoc.id;

            const tr = document.createElement("tr");
            const correoUsuario = userData.correo || "Sin correo";
            const rolUsuario = userData.rol || "usuario";
            const estaActivo = userData.estado === true;

            tr.innerHTML = `
                <td>${correoUsuario}</td>
                <td>
                    <select class="role-select" data-id="${userId}">
                        <option value="usuario" ${rolUsuario === "usuario" ? "selected" : ""}>Usuario</option>
                        <option value="admin" ${rolUsuario === "admin" ? "selected" : ""}>Administrador</option>
                    </select>
                </td>
                <td>
                    <span style="font-weight: bold; color: ${estaActivo ? "#10b981" : "#ef4444"};">
                        ${estaActivo ? "Activo" : "Bloqueado"}
                    </span>
                </td>
                <td>
                    <button class="${estaActivo ? "btn-danger" : "btn-success"} status-btn" data-id="${userId}" data-estado="${estaActivo}">
                        ${estaActivo ? "Bloquear" : "Activar"}
                    </button>
                </td>
            `;

            tableBody.appendChild(tr);
        });

        agregarEventosBotones();

    } catch (error) {
        console.error("Error al cargar usuarios:", error);
        tableBody.innerHTML = "<tr><td colspan='4' style='text-align:center; color:#ef4444;'>Error al cargar los datos.</td></tr>";
    }
}

// 3. Gestionar eventos de cambio de rol y bloqueo/activación de usuarios
function agregarEventosBotones() {
    document.querySelectorAll(".role-select").forEach(select => {
        select.addEventListener("change", async (e) => {
            const userId = e.target.getAttribute("data-id");
            const nuevoRol = e.target.value;
            try {
                await updateDoc(doc(db, "users", userId), { rol: nuevoRol });
                alert("¡Rol actualizado con éxito!");
            } catch (error) {
                console.error("Error al actualizar rol:", error);
                alert("No se pudo actualizar el rol.");
            }
        });
    });

    document.querySelectorAll(".status-btn").forEach(button => {
        button.addEventListener("click", async (e) => {
            const userId = e.target.getAttribute("data-id");
            const estadoActual = e.target.getAttribute("data-estado") === "true";
            const nuevoEstado = !estadoActual;
            try {
                await updateDoc(doc(db, "users", userId), { estado: nuevoEstado });
                alert(`Usuario ${nuevoEstado ? "activado" : "bloqueado"} correctamente.`);
                cargarUsuarios(); 
            } catch (error) {
                console.error("Error al cambiar estado:", error);
                alert("No se pudo actualizar el estado.");
            }
        });
    });
}

// 4. Manejar el cierre de sesión seguro con window.location.replace
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
            // .replace() destruye el historial para que no puedan volver atrás
            window.location.replace("login.html");
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            alert("No se pudo cerrar sesión.");
        }
    });
}