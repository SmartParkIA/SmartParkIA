import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config.js";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [mensajeColor, setMensajeColor] = useState("#94a3b8");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("Iniciando sesión...");
    setMensajeColor("#00f2fe");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Verificar que el documento exista
      const docRef = doc(db, "users", userCredential.user.uid);
      await getDoc(docRef);

      setMensaje("¡Bienvenido! Redirigiendo...");
      setMensajeColor("#10b981");

      setTimeout(() => navigate("/perfil"), 800);
    } catch (error) {
      console.error("Error de login:", error);

      let msg = "Error: " + error.message;
      switch (error.code) {
        case "auth/invalid-email":
          msg = "Correo inválido.";
          break;
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          msg = "Correo o contraseña incorrectos.";
          break;
        case "auth/too-many-requests":
          msg = "Demasiados intentos. Intenta más tarde.";
          break;
      }
      setMensaje(msg);
      setMensajeColor("#ef4444");
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="card">
        <h2>SmartPark IA</h2>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Contraseña</label>
          <div className="password-container">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword((v) => !v)}
              aria-label="Mostrar/ocultar contraseña"
            >
              {showPassword ? (
                <FaEyeSlash size={20} color="#00f2fe" />
              ) : (
                <FaEye size={20} color="#94a3b8" />
              )}
            </button>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Iniciando..." : "Iniciar Sesión"}
          </button>
        </form>

        {mensaje && (
          <p id="mensaje" style={{ color: mensajeColor }}>
            {mensaje}
          </p>
        )}

        <div className="link">
          <Link to="/recuperar-contrasena">Olvidé mi contraseña</Link>
        </div>

        <div className="link">
         ¿No tienes cuenta? <Link to="/registro">Regístrate aquí</Link>
        </div>
      </div>
       

      {/* Estilos embebidos para mantener "un solo archivo" */}
      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          font-family: 'Segoe UI', system-ui, sans-serif;
          padding: 20px;
          box-sizing: border-box;
        }
        .login-page .card {
          background: #1e293b;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          width: 100%;
          max-width: 400px;
          border: 1px solid rgba(0, 242, 254, 0.15);
        }
        .login-page .card h2 {
          text-align: center;
          color: #00f2fe;
          margin: 0 0 24px;
          font-size: 28px;
          letter-spacing: 0.5px;
        }
        .login-page .card label {
          display: block;
          color: #94a3b8;
          font-size: 14px;
          margin: 16px 0 8px;
        }
        .login-page .card input {
          width: 100%;
          padding: 12px 14px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 14px;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s;
        }
        .login-page .card input:focus { border-color: #00f2fe; }
        .login-page .password-container { position: relative; }
        .login-page .password-container input { padding-right: 45px; }
        .login-page .toggle-password {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 6px;
        }
        .login-page .card form > button[type="submit"] {
          width: 100%;
          padding: 12px;
          margin-top: 24px;
          background: linear-gradient(135deg, #00f2fe, #4facfe);
          color: #0f172a;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .login-page .card form > button[type="submit"]:hover { opacity: 0.9; }
        .login-page .card form > button[type="submit"]:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .login-page #mensaje {
          text-align: center;
          margin-top: 16px;
          font-size: 14px;
          min-height: 20px;
        }
        .login-page .link {
          text-align: center;
          margin-top: 16px;
          color: #94a3b8;
          font-size: 14px;
        }
        .login-page .link a {
          color: #00f2fe;
          text-decoration: none;
        }
        .login-page .link a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}