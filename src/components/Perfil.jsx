import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config.js";
import {
  FaBars, FaTimes, FaHome, FaParking, FaCalendarAlt, FaUser,
  FaCog, FaSignOutAlt, FaCamera, FaEnvelope, FaUserShield,
  FaSpinner, FaCheckCircle, FaExclamationCircle,
} from "react-icons/fa";

export default function Perfil() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);

  // --- Auth + carga de datos ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        navigate("/login", { replace: true });
        return;
      }
      setUser(u);
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) setUserData(snap.data());
      } catch (err) {
        console.error("Error al obtener datos:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [navigate]);

  // --- Toast interno (reemplazo de toast.js) ---
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Subir foto (base64 a Firestore) ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      showToast("La imagen es muy grande (máx. 800 KB)", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      setUploading(true);
      try {
        if (auth.currentUser) {
          await updateDoc(doc(db, "users", auth.currentUser.uid), {
            photoURL: base64,
          });
          setUserData((d) => ({ ...d, photoURL: base64 }));
          showToast("¡Foto actualizada!", "success");
        }
      } catch (err) {
        console.error(err);
        showToast("Error al guardar la foto", "error");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login", { replace: true });
  };

  // --- Datos derivados ---
  const nombreCompleto =
    `${userData?.nombres || ""} ${userData?.apellidoPaterno || ""} ${userData?.apellidoMaterno || ""}`
      .trim() || "Sin nombre";

  const avatarSrc =
    userData?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      userData?.nombres || "U"
    )}&background=0072ff&color=fff&size=130`;

  // --- Render ---
  return (
    <div className="perfil-page">
      {/* ====== SIDEBAR ====== */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h3>SmartPark IA</h3>
          <button
            className="close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <FaTimes />
          </button>
        </div>

        <nav className="sidebar-nav">
          <Link to="/" onClick={() => setSidebarOpen(false)}>
            <FaHome /> Inicio
          </Link>
          <Link to="/reservar" onClick={() => setSidebarOpen(false)}>
            <FaCalendarAlt /> Reservar
          </Link>
          <Link to="/perfil" className="active" onClick={() => setSidebarOpen(false)}>
            <FaUser /> Mi perfil
          </Link>
          <Link to="/Estacionamientos" onClick={() => setSidebarOpen(false)}>
            <FaParking /> Estacionamientos
          </Link>
             <Link to="/VerReserva" onClick={() => setSidebarOpen(false)}>
              <FaCog /> ver reservas
            </Link>
             
             <Link to="/Historial" onClick={() => setSidebarOpen(false)}>
              <FaCog /> Historial
            </Link>
          {userData?.rol === "admin" && (
            <Link to="/admin" onClick={() => setSidebarOpen(false)}>
              <FaCog /> Admin
            </Link>
          
            
          )}
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <FaSignOutAlt /> Cerrar sesión
        </button>
      </aside>

      {sidebarOpen && (
        <div className="overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ====== CONTENIDO PRINCIPAL ====== */}
      <div className="main-content">
        <header className="navbar">
          <button
            className="menu-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <FaBars />
          </button>
          <span className="navbar-brand">SmartPark IA</span>
        </header>

        <div className="container">
          <h2 className="title">Mi Información Personal</h2>

          {loading ? (
            <div className="loader">
              <FaSpinner className="spin" size={32} color="#00f2fe" />
              <p>Cargando perfil...</p>
            </div>
          ) : (
            <div className="profile-card">
              {/* --- Avatar --- */}
              <div className="avatar-container">
                <div className="avatar-wrapper">
                  <img src={avatarSrc} alt="Avatar" className="avatar" />
                  <label htmlFor="fileInput" className="avatar-overlay">
                    {uploading ? (
                      <FaSpinner className="spin" />
                    ) : (
                      <FaCamera />
                    )}
                  </label>
                  <input
                    type="file"
                    id="fileInput"
                    accept="image/*"
                    onChange={handleFileChange}
                    hidden
                  />
                </div>
                <label htmlFor="fileInput" className="upload-btn">
                  {uploading ? "Subiendo..." : "Cambiar Foto"}
                </label>
              </div>

              {/* --- Info --- */}
              <div className="info-grid">
                <div className="info-group">
                  <label>
                    <FaUser /> Nombres y Apellidos
                  </label>
                  <p>{nombreCompleto}</p>
                </div>
                <div className="info-group">
                  <label>
                    <FaEnvelope /> Correo Electrónico
                  </label>
                  <p>{userData?.correo || user?.email || "—"}</p>
                </div>
                <div className="info-group">
                  <label>
                    <FaUserShield /> Rol en el Sistema
                  </label>
                  <p className="role-badge">
                    {userData?.rol || "usuario"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ====== TOAST ====== */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === "success" ? <FaCheckCircle /> : <FaExclamationCircle />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ====== ESTILOS ====== */}
      <style>{`
        @keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp  { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn   { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes spin      { to { transform: rotate(360deg); } }
        @keyframes pop       { 0% { transform: scale(0); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @keyframes toastIn   { from { opacity: 0; transform: translateY(30px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes glow      { 0%, 100% { box-shadow: 0 20px 60px rgba(0,0,0,0.4); } 50% { box-shadow: 0 20px 70px rgba(0,242,254,0.2); } }

        * { box-sizing: border-box; }
        .perfil-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif;
          color: #e2e8f0;
          animation: fadeIn 0.4s ease;
          display: flex;
        }
        .spin { animation: spin 1s linear infinite; }

        /* ===== Sidebar ===== */
        .sidebar {
          position: fixed;
          top: 0; left: 0;
          height: 100vh;
          width: 260px;
          background: #0b1220;
          border-right: 1px solid rgba(0, 242, 254, 0.15);
          padding: 20px;
          display: flex;
          flex-direction: column;
          transform: translateX(-100%);
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 100;
        }
        .sidebar.open { transform: translateX(0); animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
        .sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        .sidebar-header h3 {
          color: #00f2fe;
          margin: 0;
          font-size: 20px;
        }
        .close-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 20px;
          cursor: pointer;
          transition: color 0.2s, transform 0.2s;
        }
        .close-btn:hover { color: #00f2fe; transform: rotate(90deg); }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }
        .sidebar-nav a {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          color: #94a3b8;
          text-decoration: none;
          border-radius: 8px;
          font-size: 15px;
          transition: background 0.2s, color 0.2s, transform 0.15s;
        }
        .sidebar-nav a:hover {
          background: rgba(0, 242, 254, 0.08);
          color: #00f2fe;
          transform: translateX(4px);
        }
        .sidebar-nav a.active {
          background: rgba(0, 242, 254, 0.15);
          color: #00f2fe;
          font-weight: 500;
        }

        .logout-btn {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s, transform 0.15s;
        }
        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          transform: translateY(-1px);
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          z-index: 99;
          animation: fadeIn 0.3s ease;
        }

        /* ===== Main ===== */
        .main-content { flex: 1; width: 100%; }

        .navbar {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 18px 24px;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(0, 242, 254, 0.1);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .menu-toggle {
          background: rgba(0, 242, 254, 0.1);
          border: 1px solid rgba(0, 242, 254, 0.25);
          color: #00f2fe;
          font-size: 18px;
          padding: 10px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }
        .menu-toggle:hover {
          background: rgba(0, 242, 254, 0.2);
          transform: scale(1.05);
        }
        .navbar-brand {
          color: #00f2fe;
          font-weight: 700;
          font-size: 20px;
          letter-spacing: 0.5px;
        }

        .container {
          padding: 40px 24px;
          max-width: 900px;
          margin: 0 auto;
        }
        .title {
          color: #e2e8f0;
          font-size: 26px;
          margin: 0 0 24px;
          animation: fadeInUp 0.5s ease;
        }

        .loader {
          text-align: center;
          padding: 60px 0;
          color: #94a3b8;
          animation: fadeIn 0.3s ease;
        }
        .loader p { margin-top: 14px; }

        /* ===== Card ===== */
        .profile-card {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 30px;
          background: #1e293b;
          border: 1px solid rgba(0, 242, 254, 0.15);
          border-radius: 16px;
          padding: 32px;
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1), glow 5s ease-in-out infinite;
        }

        .avatar-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }
        .avatar-wrapper {
          position: relative;
          width: 130px;
          height: 130px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid rgba(0, 242, 254, 0.3);
          animation: pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          transition: border-color 0.3s;
        }
        .avatar-wrapper:hover { border-color: #00f2fe; }
        .avatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .avatar-overlay {
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.7);
          color: #00f2fe;
          font-size: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          cursor: pointer;
          transition: opacity 0.25s ease;
        }
        .avatar-wrapper:hover .avatar-overlay { opacity: 1; }

        .upload-btn {
          background: linear-gradient(135deg, #00f2fe, #4facfe);
          color: #0f172a;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          display: inline-block;
        }
        .upload-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .info-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
          justify-content: center;
        }
        .info-group {
          animation: fadeInUp 0.5s ease backwards;
        }
        .info-group:nth-child(1) { animation-delay: 0.1s; }
        .info-group:nth-child(2) { animation-delay: 0.2s; }
        .info-group:nth-child(3) { animation-delay: 0.3s; }

        .info-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .info-group label svg { color: #00f2fe; }

        .info-group p {
          margin: 0;
          font-size: 17px;
          color: #e2e8f0;
          padding: 10px 14px;
          background: #0f172a;
          border-radius: 8px;
          border: 1px solid #334155;
          transition: border-color 0.2s;
        }
        .info-group p:hover { border-color: rgba(0, 242, 254, 0.4); }

        .role-badge {
          display: inline-block !important;
          text-transform: capitalize;
          font-weight: 600;
          color: #00f2fe !important;
        }

        /* ===== Toast ===== */
        .toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
          animation: toastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: 999;
        }
        .toast.success {
          background: #10b981;
          color: #0f172a;
        }
        .toast.error {
          background: #ef4444;
          color: #fff;
        }

        /* ===== Responsive ===== */
        @media (max-width: 720px) {
          .profile-card {
            grid-template-columns: 1fr;
            text-align: center;
            padding: 24px;
          }
          .info-group label { justify-content: center; }
          .container { padding: 24px 16px; }
          .title { font-size: 22px; }
        }
      `}</style>
    </div>
  );
}