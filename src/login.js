import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./firebase/config.js";
import { doc, getDoc } from "firebase/firestore";

// Referencias a los elementos del DOM
const form = document.getElementById("loginForm");
const mensaje = document.getElementById("mensaje");
const passwordInput = document.getElementById("password");
const togglePasswordBtn = document.getElementById("togglePassword");
const eyeIcon = document.getElementById("eyeIcon");

// SVGs para mostrar u ocultar la contraseña
const eyeOpenSVG = `<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>`;
const eyeClosedSVG = `<path d="M2 4.27L3.28 3 21 20.72 19.73 22l-3.06-3.06A10.96 10.96 0 0 1 12 19.5C7 19.5 2.73 16.39 1 12c.79-2 2.11-3.74 3.77-5.03L2 4.27zm10 10.73a3 3 0 0 1-3-3c0-.22.03-.44.08-.65l3.57 3.57A2.7 2.7 0 0 1 12 15zm7.23-2.97A10.95 10.95 0 0 0 23 12c-1.73-4.39-6-7.5-11-7.5-1.56 0-3.05.3-4.42.85l2.17 2.17A5 5 0 0 1 17 12c0 .76-.17 1.48-.47 2.12l2.7 2.91z"/>`;

// Alternar visibilidad de la contraseña
togglePasswordBtn.addEventListener("click", () => {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        eyeIcon.innerHTML = eyeClosedSVG;
    } else {
        passwordInput.type = "password";
        eyeIcon.innerHTML = eyeOpenSVG;
    }
});

// Manejar el evento de envío del formulario de login
form.addEventListener("submit", async (e) => {
    e.preventDefault(); // Evita que la página se recargue por defecto

    const email = document.getElementById("email").value;
    const password = passwordInput.value;

    mensaje.style.color = "#0d6efd";
    mensaje.textContent = "Iniciando sesión...";

    try {
        // 1. Autenticar credenciales en Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await user.reload();

        // Validar si el correo electrónico ha sido verificado
        if (!user.emailVerified) {
            mensaje.style.color = "red";
            mensaje.textContent = "Debes verificar tu correo antes de iniciar sesión.";
            return;
        }

        // 2. Obtener el documento del usuario desde Firestore usando su UID exacto
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        let rol = "usuario"; // Valor por defecto si no se encuentra el documento

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            console.log("Datos del usuario en Firestore:", userData);
            
            if (userData.rol) {
                rol = String(userData.rol).trim().toLowerCase();
            }
        } else {
            console.warn("No existe un documento en Firestore para el UID:", user.uid);
        }

        mensaje.style.color = "green";
        mensaje.textContent = "¡Bienvenido!";

        // 3. Redirección basada en el rol solicitado
        setTimeout(() => {
            if (rol.includes("admi")) {
                // Si el rol es "admi" (o incluye admi), va al perfil general / admin
                window.location.replace("perfil.html");
            } else {
                // Si el rol es "usuario", va al perfil de usuario con acceso al mapa
                window.location.replace("perfilUsuario.html");
            }
        }, 1200);

    } catch (error) {
        console.error("Error en login:", error);
        mensaje.style.color = "red";

        // Manejo de errores comunes de Firebase Auth
        switch (error.code) {
            case "auth/invalid-email":
                mensaje.textContent = "Correo inválido.";
                break;
            case "auth/invalid-credential":
            case "auth/wrong-password":
            case "auth/user-not-found":
                mensaje.textContent = "Correo o contraseña incorrectos.";
                break;
            default:
                mensaje.textContent = error.message;
        }
    }
});