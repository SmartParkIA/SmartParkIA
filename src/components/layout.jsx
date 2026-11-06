import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    FaBars,
    FaCalendarAlt,
    FaCog,
    FaHistory, FaMapMarkedAlt,
    FaParking,
    FaSignOutAlt,
    FaTimes,
    FaUser
} from "react-icons/fa";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/config.js";
import "../styles/layout.css";

export default function Layout() {
  const [userData, setUserData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const location = useLocation(); 

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate("/login", { replace: true });
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) setUserData(snap.data());
      } catch (err) {
        console.error("Error al obtener rol:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login", { replace: true });
  };

  if (loading) return <div style={{ color: '#00f2fe', textAlign: 'center', padding: 40 }}>Cargando...</div>;

  const isAdmin = userData?.rol === "admin";
  const isActive = (path) => location.pathname === path ? "active" : "";

  // --- Título dinámico del Navbar ---
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes("perfil")) return "Mi Perfil";
    if (path.includes("reservar")) return "Reservar Espacio";
    if (path.includes("reservas")) return "Mis Reservas";
    if (path.includes("historial")) return "Historial";
    if (path.includes("estacionamientos")) return "Estacionamientos";
    if (path.includes("admin")) return "Panel de Administración";
    return "SmartPark IA";
  };

  return (
    <div className={`layout-container ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      
      {/* ====== SIDEBAR ====== */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <span className="logo-icon">P</span>
            <h3>SmartPark IA</h3>
          </div>
          {/* Botón de cerrar solo visible en móviles */}
          <button className="close-btn-mobile" onClick={() => setSidebarOpen(false)}>
            <FaTimes />
          </button>
        </div>

        <nav className="sidebar-nav">
          <Link to="/perfil" className={isActive("/perfil")} onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
            <FaUser /> Mi Perfil
          </Link>

          {!isAdmin && (
            <>
              <Link to="/reservar" className={isActive("/reservar")} onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                <FaCalendarAlt /> Reservar Espacio
              </Link>
              <Link to="/reservas" className={isActive("/reservas")} onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                <FaMapMarkedAlt /> Mis Reservas
              </Link>
              <Link to="/historial" className={isActive("/historial")} onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                <FaHistory /> Historial
              </Link>
              <Link to="/estacionamientos" className={isActive("/estacionamientos")} onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                <FaParking /> Estacionamientos
              </Link>
            </>
          )}

          {isAdmin && (
            <Link to="/admin" className={isActive("/admin")} onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
              <FaCog /> Gestión de Usuarios
            </Link>
          )}
        </nav>

        {/* --- PERFIL DEL USUARIO EN EL SIDEBAR --- */}
        <div className="sidebar-user">
          <div className="user-info">
            <div className="user-avatar">
              {userData?.nombres ? userData.nombres.charAt(0).toUpperCase() : <FaUser />}
            </div>
            <div className="user-details">
              <span className="user-name">{userData?.nombres || "Usuario"}</span>
              <span className="user-email">{auth.currentUser?.email || "correo@ejemplo.com"}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Cerrar Sesión">
            <FaSignOutAlt />
          </button>
        </div>
      </aside>

      {/* Overlay para móviles */}
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ====== CONTENIDO PRINCIPAL ====== */}
      <div className="main-content">
        <header className="navbar">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <FaTimes /> : <FaBars />}
          </button>
          
          {/* Título Dinámico */}
          <div className="navbar-title-container">
            <span className="navbar-brand">{getPageTitle()}</span>
          </div>
        </header>

        <div className="page-content">
          <Outlet /> 
        </div>
      </div>
    </div>
  );
}