import { db } from "./firebase/config.js";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { showToast } from "./toast.js";

const tableBody = document.getElementById("userTableBody");

onSnapshot(collection(db, "users"), (snapshot) => {
    if (!tableBody) return;
    tableBody.innerHTML = "";

    if (snapshot.empty) {
        tableBody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>No hay usuarios.</td></tr>";
        return;
    }

    snapshot.forEach((userDoc) => {
        const data = userDoc.data();
        const userId = userDoc.id;
        const correo = data.correo || data.email || "Sin correo";
        const rol = data.rol || "usuario";
        const activo = data.estado === true;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${correo}</td>
            <td>
                <select class="role-select" data-id="${userId}">
                    <option value="usuario" ${rol === "usuario" ? "selected" : ""}>Usuario</option>
                    <option value="admin" ${rol === "admin" ? "selected" : ""}>Administrador</option>
                </select>
            </td>
            <td>
                <span style="font-weight: bold; color: ${activo ? "#10b981" : "#ef4444"};">
                    ${activo ? "Activo" : "Bloqueado"}
                </span>
            </td>
            <td>
                <button class="action-btn ${activo ? "btn-danger" : "btn-success"} status-btn" data-id="${userId}" data-estado="${activo}">
                    ${activo ? "Bloquear" : "Activar"}
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Eventos de los botones
    document.querySelectorAll(".role-select").forEach(select => {
        select.addEventListener("change", async (e) => {
            try {
                await updateDoc(doc(db, "users", e.target.getAttribute("data-id")), { rol: e.target.value });
                showToast("Rol actualizado", "success");
            } catch (error) { showToast("Error al actualizar rol", "error"); }
        });
    });

    document.querySelectorAll(".status-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            const nuevoEstado = e.target.getAttribute("data-estado") !== "true";
            try {
                await updateDoc(doc(db, "users", id), { estado: nuevoEstado });
                showToast(`Usuario ${nuevoEstado ? "activado" : "bloqueado"}`, "success");
            } catch (error) { showToast("Error al cambiar estado", "error"); }
        });
    });
});