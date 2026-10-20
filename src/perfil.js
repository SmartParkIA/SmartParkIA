import { auth, db } from "./firebase/config.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { showToast } from "./toast.js";

const nameEl = document.getElementById("userName");
const emailEl = document.getElementById("userEmail");
const roleEl = document.getElementById("userRole");
const profileImage = document.getElementById("profileImage");
const fileInput = document.getElementById("fileInput");

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
            } else {
                profileImage.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombres)}&background=0072ff&color=fff&size=130`;
            }
        }
    } catch (error) {
        console.error("Error al obtener datos:", error);
    }
});

if (fileInput) {
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(uploadEvent) {
            const base64Image = uploadEvent.target.result;
            profileImage.src = base64Image;

            if (auth.currentUser) {
                try {
                    await updateDoc(doc(db, "users", auth.currentUser.uid), { photoURL: base64Image });
                    showToast("¡Foto actualizada!", "success");
                } catch (error) {
                    showToast("Error al guardar la foto", "error");
                }
            }
        };
        reader.readAsDataURL(file);
    });
}