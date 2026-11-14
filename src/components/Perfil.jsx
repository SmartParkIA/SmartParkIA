import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  FaCamera,
  FaCheckCircle,
  FaEnvelope,
  FaExclamationCircle,
  FaSpinner,
  FaUser,
  FaUserShield,
  FaIdCard // Añadido para el icono del header
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/config.js";

export default function Perfil() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
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

  // --- Toast interno ---
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Subir foto ---
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

  // --- Datos derivados ---
  const nombreCompleto =
    `${userData?.nombres || ""} ${userData?.apellidoPaterno || ""} ${userData?.apellidoMaterno || ""}`
      .trim() || "Sin nombre";

  const avatarSrc =
    userData?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      userData?.nombres || "U"
    )}&background=0072ff&color=fff&size=130`;

  return (
    <div className="perfil-container">
      {/* FONDO ESTILO FINANZAS */}
      <div className="bg-grid"></div>
      <div className="bg-glow"></div>

      <div className="perfil-content">
        
        {/* HEADER ESTILO FINANZAS */}
        <div className="perfil-header">
          <div className="header-icon-box">
            <FaIdCard />
          </div>
          <div>
            <h2>Mi Información Personal</h2>
            <p className="subtitle">Gestiona los datos y la seguridad de tu cuenta</p>
          </div>
        </div>

        {loading ? (
          <div className="loader">
            <FaSpinner className="spin" size={32} color="#00f2fe" />
            <p>Sincronizando perfil...</p>
          </div>
        ) : (
          <div className="profile-card">
            {/* --- Avatar --- */}
            <div className="avatar-container">
              <div className="avatar-wrapper">
                <img src={avatarSrc} alt="Avatar" className="avatar" />
                <label htmlFor="fileInput" className="avatar-overlay">
                  {uploading ? <FaSpinner className="spin" /> : <FaCamera />}
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
                <div className="info-value">{nombreCompleto}</div>
              </div>
              
              <div className="info-group">
                <label>
                  <FaEnvelope /> Correo Electrónico
                </label>
                <div className="info-value">{userData?.correo || user?.email || "—"}</div>
              </div>

              <div className="info-group">
                <label>
                  <FaUserShield /> Rol en el Sistema
                </label>
                <div className="info-value role-container">
                  <span className="role-badge">
                    {userData?.rol || "usuario"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
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
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes toastIn { from { opacity: 0; transform: translateY(30px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes slideInRow { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        * { box-sizing: border-box; }
        
        .perfil-container {
          position: relative;
          width: 100%;
          min-height: 100vh;
          padding: 40px 20px;
          overflow: hidden;
          background-color: #050b14;
          font-family: 'Outfit', sans-serif;
        }

        /* === FONDO ESTILO FINANZAS === */
        .bg-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(0, 242, 254, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 242, 254, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          z-index: 0;
        }

        .bg-glow {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 400px;
          background: radial-gradient(ellipse at bottom, rgba(0, 242, 254, 0.1) 0%, transparent 70%);
          z-index: 0;
          pointer-events: none;
        }

        /* === CONTENIDO === */
        .perfil-content {
          position: relative;
          z-index: 1;
          max-width: 1000px;
          margin: 0 auto;
          animation: fadeIn 0.5s ease;
        }

        /* Header estilo Finanzas */
        .perfil-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 35px;
        }

        .header-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 55px;
          height: 55px;
          background: rgba(0, 242, 254, 0.1);
          border: 1px solid rgba(0, 242, 254, 0.4);
          border-radius: 14px;
          color: #00f2fe;
          font-size: 24px;
          box-shadow: 0 0 20px rgba(0, 242, 254, 0.2);
        }

        .perfil-header h2 {
          color: #ffffff;
          font-size: 28px;
          margin: 0;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .subtitle {
          color: #94a3b8;
          margin: 4px 0 0;
          font-size: 14px;
        }

        .spin { animation: spin 1s linear infinite; }
        
        .loader {
          text-align: center;
          padding: 60px 0;
          color: #94a3b8;
        }
        .loader p { margin-top: 14px; font-weight: 500; }

        /* === TARJETA PRINCIPAL (GLASSMORPHISM) === */
        .profile-card {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 40px;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(0, 242, 254, 0.15);
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          animation: slideInRow 0.5s ease;
        }

        /* === AVATAR === */
        .avatar-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .avatar-wrapper {
          position: relative;
          width: 150px;
          height: 150px;
          border-radius: 50%;
          padding: 4px;
          background: linear-gradient(135deg, #00f2fe, #0072ff);
          box-shadow: 0 0 30px rgba(0, 242, 254, 0.3);
          transition: transform 0.3s ease;
        }

        .avatar-wrapper:hover {
          transform: scale(1.02);
        }

        .avatar {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          background: #0f172a;
          border: 2px solid #050b14;
        }

        .avatar-overlay {
          position: absolute;
          inset: 4px; /* Para que quede dentro del borde de gradiente */
          border-radius: 50%;
          background: rgba(5, 11, 20, 0.8);
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
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          color: #00f2fe;
          border: 1px solid rgba(0, 242, 254, 0.4);
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .upload-btn:hover {
          background: rgba(0, 242, 254, 0.1);
          box-shadow: 0 0 15px rgba(0, 242, 254, 0.3);
        }

        /* === INFORMACIÓN === */
        .info-grid {
          display: flex;
          flex-direction: column;
          gap: 24px;
          justify-content: center;
        }

        .info-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .info-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #00f2fe;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .info-value {
          background: rgba(3, 7, 18, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 14px 20px;
          border-radius: 10px;
          font-size: 16px;
          color: #f8fafc;
          font-weight: 500;
          transition: border 0.3s ease;
        }

        .info-value:hover {
          border-color: rgba(0, 242, 254, 0.3);
        }

        .role-container {
          display: flex;
          align-items: center;
          padding: 10px 20px; /* Un poco menos de padding para el badge */
        }

        .role-badge {
          display: inline-flex;
          background: rgba(0, 242, 254, 0.15);
          color: #00f2fe;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 700;
          border: 1px solid rgba(0, 242, 254, 0.3);
          text-transform: capitalize;
          box-shadow: 0 0 10px rgba(0, 242, 254, 0.1);
        }

        /* === TOAST === */
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
          font-weight: 600;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
          animation: toastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: 999;
          font-family: inherit;
        }
        .toast.success { background: #10b981; color: #050b14; border: 1px solid #10b981; }
        .toast.error { background: #ef4444; color: #fff; border: 1px solid #ef4444; }

        /* === RESPONSIVE === */
        @media (max-width: 768px) {
          .profile-card {
            grid-template-columns: 1fr;
            padding: 30px 20px;
            gap: 30px;
            text-align: center;
          }
          .info-group label { justify-content: center; }
          .perfil-header { flex-direction: column; text-align: center; }
          .role-container { justify-content: center; }
        }
      `}</style>
    </div>
  );
}