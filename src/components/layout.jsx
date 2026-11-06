import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    FaBars, FaCalendarAlt, FaCar, FaCheckCircle, FaClipboardList,
    FaCog, FaHistory, FaMapMarkedAlt, FaParking, FaSignOutAlt,
    FaTimes, FaUser, FaChartPie 
} from "react-icons/fa";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/config.js";
import AsistenteVirtual from "./AsistenteVirtual";
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

  if (loading) return <div style={{ color: '#00f2fe', textAlign: 'center', padding: 40 }}>Cargando menú...</div>;

  const isAdmin = userData?.rol === "admin";
  const isActive = (path) => location.pathname === path ? "active" : "";

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes("mis-vehiculos")) return "Mis Vehículos";
    if (path.includes("perfil")) return "Mi Perfil";
    if (path.includes("reservar")) return "Reservar Espacio";
    if (path.includes("reservas")) return "Mis Reservas";
    if (path.includes("historial")) return "Historial";
    if (path.includes("estacionamientos")) return "Estacionamientos";
    if (path.includes("disponibilidad")) return "Disponibilidad";
    if (path.includes("finanzas")) return "Finanzas"; 
    if (path.includes("registrar-estacionamiento")) return "Registrar Estacionamiento";
    if (path.includes("admin")) return "Panel de Administración";
    return "SmartPark IA";
  };

  return (
    <div className={`layout-container ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <span className="logo-icon">SP</span>
            <h3>SmartPark IA</h3>
          </div>
          <button className="close-btn-mobile" onClick={() => setSidebarOpen(false)}>
            <FaTimes />
          </button>
        </div>

        <nav className="sidebar-nav">
          <Link to="/perfil" className={isActive("/perfil")} onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
            <FaUser /> Mi Perfil
          </Link>

          {/* --- MENÚ PARA USUARIOS NORMALES --- */}
          {!isAdmin && (
            <>
              {/* AHORA "MI VEHÍCULO" SOLO SE VE PARA USUARIOS */}
              <Link to="/mis-vehiculos" className={isActive("/mis-vehiculos")} onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                <FaCar /> Mi Vehículo
              </Link>

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
              <Link to="/disponibilidad" className={isActive("/disponibilidad")} onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                <FaCheckCircle /> Disponibilidad
              </Link>
            </>
          )}

          {/* --- MENÚ PARA ADMINISTRADORES --- */}
          {isAdmin && (
            <>
              <Link to="/admin" className={isActive("/admin")} onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                <FaCog /> Gestión de Usuarios
              </Link>
              
              <Link to="/finanzas" className={isActive("/finanzas")} onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                <FaChartPie /> Finanzas
              </Link>

              <Link to="/registrar-estacionamiento" className={isActive("/registrar-estacionamiento")} onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}>
                <FaClipboardList /> Registrar Estacionamiento
              </Link>
            </>
          )}
        </nav>

        <div className="sidebar-user">
          <div className="user-info">
            <div className="user-avatar">
              {userData?.nombres ? userData.nombres.charAt(0).toUpperCase() : <FaUser />}
            </div>
            <div className="user-details">
              <span className="user-name">{userData?.nombres || "Usuario"}</span>
              <span className="user-email">{auth.currentUser?.email || ""}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Cerrar Sesión">
            <FaSignOutAlt />
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      <div className="main-content">
        <header className="navbar">
          <div className="navbar-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <FaTimes /> : <FaBars />}
            </button>
            
            <div className="navbar-brand-container">
               <div className="navbar-icon" style={{ fontSize: '15px', fontWeight: '900', letterSpacing: '-0.5px' }}>
              SP
              </div>
              <div className="navbar-text">
                <h1>SmartPark IA</h1>
                <p>{getPageTitle()}</p>
              </div>
            </div>
          </div>

          <div className="navbar-right">
            <span className="admin-badge">
              <span className="pulse-dot"></span>
              {isAdmin ? "PANEL ADMINISTRATIVO" : "PANEL DE USUARIO"}
            </span>
          </div>
        </header>

        <div className="page-content">
          <Outlet /> 
        </div>
      </div>

      {!isAdmin && <AsistenteVirtual />}

    </div>
  );
}