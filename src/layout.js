import { auth, db } from "./firebase/config.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

document.addEventListener("DOMContentLoaded", () => {
    const sidebarContainer = document.getElementById('sidebar-container');

    // Detectar subcarpeta
    const isSubfolder = window.location.pathname.includes('mapa-estacionamiento');
    const prefix = isSubfolder ? '../' : '';

    // 1. CREAR EL OVERLAY DIRECTAMENTE EN EL BODY (No dentro del menú)
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebarOverlay';
    document.body.appendChild(overlay);

    // 2. INYECTAR EL MENÚ
    if (sidebarContainer) {
        sidebarContainer.innerHTML = `
            <nav class="sidebar" id="sidebar">
                <div class="sidebar-header">SmartPark IA</div>
                <ul class="sidebar-menu">
                    <li id="menu-perfil"><a href="${prefix}perfil.html">Mi Perfil</a></li>
                    <li id="menu-usuario" style="display: none;"><a href="${prefix}mapa-estacionamiento/mapa.html">Mapa</a></li>
                    <li id="menu-admin" style="display: none;"><a href="${prefix}admin.html">Usuarios</a></li>
                </ul>
                <div class="sidebar-footer">
                    <button id="logoutBtn" class="logout-btn">
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

    // 3. LÓGICA DEL BOTÓN HAMBURGUESA (A prueba de fallos)
    const toggleBtn = document.getElementById("menuToggle");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", (e) => {
            e.preventDefault(); // Evita comportamientos extraños
            document.body.classList.toggle("sidebar-collapsed");
            console.log("Menú clickeado. Clase actual:", document.body.className); // Para debug
        });
    } else {
        console.warn("No se encontró el botón con id 'menuToggle'");
    }

    // 4. CERRAR MENÚ AL TOCAR EL FONDO OSCURO
    overlay.addEventListener("click", () => {
        document.body.classList.remove("sidebar-collapsed");
    });

    // 5. Resaltar menú activo
    const path = window.location.pathname.split("/").pop();
    const links = document.querySelectorAll('.sidebar-menu a');
    links.forEach(link => {
        if (link.getAttribute('href') && link.getAttribute('href').includes(path) && path !== "") {
            link.parentElement.classList.add('active');
        }
    });

    // 6. Roles
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const docSnap = await getDoc(doc(db, "users", user.uid));
                if (docSnap.exists()) {
                    const rol = docSnap.data().rol || "usuario";
                    if (rol === "admin") {
                        document.getElementById("menu-admin").style.display = "block";
                    } else {
                        document.getElementById("menu-usuario").style.display = "block";
                    }
                }
            } catch (error) {
                console.error("Error al obtener el rol:", error);
            }
        } else {
            window.location.replace(`${prefix}login.html`);
        }
    });

    // 7. Cerrar Sesión
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await signOut(auth);
            window.location.replace(`${prefix}login.html`);
        });
    }
});