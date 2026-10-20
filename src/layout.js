
import { auth, db } from "./firebase/config.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";


document.addEventListener("DOMContentLoaded", () => {
    
    const sidebarContainer = document.getElementById('sidebar-container');

  
    if (sidebarContainer) {
        sidebarContainer.innerHTML = `
            <nav class="sidebar" id="sidebar">
                <div class="sidebar-header">SmartPark IA</div>
                
                <ul class="sidebar-menu">
                    <!-- ENLACE PARA TODOS LOS USUARIOS (Siempre visible) -->
                    <li id="menu-perfil"><a href="perfil.html">Mi Perfil</a></li>
                    
                    <!-- ENLACES EXCLUSIVOS PARA USUARIOS NORMALES (Ocultos por defecto) -->
                    <li id="menu-usuario" style="display: none;">
                        <a href="mapa-estacionamiento/mapa.html">Mapa</a>
                    </li>
                    <li id="menu-historial" style="display: none;">
                        <a href="historial.html">Mi Historial</a>
                    </li>

                    <!-- ENLACES EXCLUSIVOS PARA ADMINISTRADORES (Ocultos por defecto) -->
                    <li id="menu-admin" style="display: none;">
                        <a href="admin.html">Usuarios</a>
                    </li>
                    <li id="menu-reportes" style="display: none;">
                        <a href="reportes.html">Reportes</a>
                    </li>
                </ul>

                <div class="sidebar-footer">
                    <button id="logoutBtn" class="logout-btn">
                        <!-- Ícono SVG de salida -->
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Cerrar Sesión
                    </button>
                </div>
            </nav>
        `;
    }

    const toggleBtn = document.getElementById("menuToggle");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            document.body.classList.toggle("sidebar-collapsed");
        });
    }

    // ==========================================
    // 3. RESALTAR EL ENLACE ACTIVO
    // ==========================================
    // Compara la URL actual de la ventana con el 'href' de los enlaces.
    // Si coinciden, le pone la clase 'active' (que lo pinta de azul neón).
    const path = window.location.pathname.split("/").pop();
    const links = document.querySelectorAll('.sidebar-menu a');
    links.forEach(link => {
        if (link.getAttribute('href') === path) {
            link.parentElement.classList.add('active');
        }
    });

    // ==========================================
    // 4. LÓGICA DE ROLES (FIREBASE)
    // ==========================================
    // Aquí es donde le decimos al menú qué enlaces mostrar según quién esté logueado.
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                // Buscamos el documento del usuario en Firestore
                const docSnap = await getDoc(doc(db, "users", user.uid));
                
                if (docSnap.exists()) {
                    const rol = docSnap.data().rol || "usuario"; // Si no tiene rol, es "usuario" por defecto
                    
                    if (rol === "admin") {
                        // --- SI ES ADMINISTRADOR ---
                        document.getElementById("menu-admin").style.display = "block";
                        document.getElementById("menu-reportes").style.display = "block"; 
                    } else {
                        // --- SI ES USUARIO NORMAL ---
                        document.getElementById("menu-usuario").style.display = "block";
                        document.getElementById("menu-historial").style.display = "block"; 
                    }
                }
            } catch (error) {
                console.error("Error al obtener el rol del usuario:", error);
            }
        } else {
            // Si no hay usuario logueado, lo expulsamos al login
            window.location.replace("login.html");
        }
    });

    // ==========================================
    // 5. CERRAR SESIÓN
    // ==========================================
    // Escucha el clic en el botón de cerrar sesión, destruye la sesión y redirige.
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.replace("login.html");
            } catch (error) {
                console.error("Error al cerrar sesión:", error);
            }
        });
    }
});