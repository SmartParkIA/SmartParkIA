import { auth, db } from "./firebase/config.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const nameEl = document.getElementById("userName");
const emailEl = document.getElementById("userEmail");
const roleEl = document.getElementById("userRole");
const profileImage = document.getElementById("profileImage");
const fileInput = document.getElementById("fileInput");
const logoutBtn = document.getElementById("logoutBtn");

// 1. Proteger ruta y cargar datos del usuario actual
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("login.html");
        return;
    }

    try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
            const data = userSnap.data();
            const nombres = data.nombres || "";
            const apellidoP = data.apellidoPaterno || "";
            const apellidoM = data.apellidoMaterno || "";
            
            nameEl.textContent = `${nombres} ${apellidoP} ${apellidoM}`.trim() || "Sin nombre";
            emailEl.textContent = data.correo || user.email;
            roleEl.textContent = data.rol || "usuario";

            if (data.photoURL) {
                profileImage.src = data.photoURL;
            }
        } else {
            nameEl.textContent = "Usuario sin perfil registrado";
            emailEl.textContent = user.email;
            roleEl.textContent = "usuario";
        }
    } catch (error) {
        console.error("Error al obtener datos del perfil:", error);
    }
});

// 2. Manejar la carga y actualización de la foto de perfil en Base64
if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(uploadEvent) {
            const base64Image = uploadEvent.target.result;
            profileImage.src = base64Image;

            const user = auth.currentUser;
            if (user) {
                try {
                    await updateDoc(doc(db, "users", user.uid), { photoURL: base64Image });
                    alert("¡Foto de perfil actualizada con éxito!");
                } catch (error) {
                    console.error("Error al guardar la foto:", error);
                    alert("No se pudo actualizar la imagen.");
                }
            }
        };
        reader.readAsDataURL(file);
    });
}

// 3. Manejar el cierre de sesión de forma segura
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.replace("login.html");
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            alert("No se pudo cerrar sesión.");
        }
    });
}