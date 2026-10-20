import { auth, db } from "./firebase/config.js"; 
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const mensaje = document.getElementById("mensaje");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    
    // --- Lógica para mostrar/ocultar la contraseña ---
    const togglePassword = document.getElementById("togglePassword");
    const eyeIcon = document.getElementById("eyeIcon");

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener("click", () => {
            const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
            passwordInput.setAttribute("type", type);
            
            // Efecto visual en el ícono (opcional)
            if (type === "text") {
                eyeIcon.style.fill = "#00f2fe";
            } else {
                eyeIcon.style.fill = "#94a3b8";
            }
        });
    }

    // --- Lógica de Inicio de Sesión ---
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault(); // Evita que la página se recargue

            const email = emailInput.value;
            const password = passwordInput.value;

            mensaje.textContent = "Iniciando sesión...";
            mensaje.style.color = "#00f2fe";

            try {
                // 1. Autenticar al usuario
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                
                // 2. Verificar que el documento exista (Buena práctica)
                const docRef = doc(db, "users", userCredential.user.uid);
                const docSnap = await getDoc(docRef);

                mensaje.textContent = "¡Bienvenido! Redirigiendo...";
                mensaje.style.color = "#10b981";

                // 3. Redirigir (Todos van al mismo perfil)
                setTimeout(() => {
                    // Ya no importa el rol aquí, ambos entran a perfil.html
                    // layout.js se encargará de mostrar el menú correcto
                    window.location.href = "perfil.html"; 
                }, 800); 

            } catch (error) {
                console.error("Error de login:", error);
                
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
                    case "auth/too-many-requests":
                        mensaje.textContent = "Demasiados intentos. Intenta más tarde.";
                        break;
                    default:
                        mensaje.textContent = "Error: " + error.message;
                }
                mensaje.style.color = "#ef4444"; // Color rojo
            }
        });
    }
});