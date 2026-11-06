import {
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useState } from "react";
import { FaEnvelope, FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/config.js";
import "../styles/registro.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [mensajeColor, setMensajeColor] = useState("#94a3b8");
  const [loading, setLoading] = useState(false);
  
  // Estados para manejar el reenvío de correo
  const [showResend, setShowResend] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState(null);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("Iniciando sesión...");
    setMensajeColor("#00f2fe");
    setLoading(true);
    setShowResend(false); // Ocultar botón al intentar de nuevo

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 1. VERIFICAR SI EL CORREO ESTÁ AUTENTICADO
      if (!user.emailVerified) {
        setUnverifiedUser(user); // Guardamos el usuario para el reenvío
        setMensaje("No autenticado: Debes verificar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada o spam.");
        setMensajeColor("#ef4444"); // Rojo
        setShowResend(true); // Mostramos el botón de reenviar
        setLoading(false);
        
        // Cerramos la sesión de Firebase para que no pueda entrar a rutas protegidas
        await signOut(auth); 
        return; // Detenemos el código aquí (NO redirige al perfil)
      }

      // 2. SI ESTÁ VERIFICADO, VERIFICAMOS FIRESTORE Y REDIRIGIMOS
      const docRef = doc(db, "users", user.uid);
      await getDoc(docRef);

      setMensaje("¡Bienvenido! Redirigiendo...");
      setMensajeColor("#10b981"); // Verde

      setTimeout(() => navigate("/perfil"), 800);
      
    } catch (error) {
      console.error("Error de login:", error);

      let msg = "Error: " + error.message;
      switch (error.code) {
        case "auth/invalid-email":
          msg = "El formato del correo es inválido.";
          break;
        case "auth/user-not-found":
          msg = "Este correo no está registrado. Por favor, regístrate.";
          break;
        case "auth/wrong-password":
        case "auth/invalid-credential":
          msg = "Contraseña incorrecta. Intenta de nuevo.";
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

  // Función para reenviar el correo de verificación
  const handleResendEmail = async () => {
    if (!unverifiedUser) return;
    try {
      await sendEmailVerification(unverifiedUser);
      setMensaje("¡Correo de verificación reenviado! Revisa tu bandeja de entrada.");
      setMensajeColor("#10b981");
      setShowResend(false);
    } catch (error) {
      console.error("Error al reenviar:", error);
      setMensaje("Error al reenviar el correo. Intenta más tarde.");
      setMensajeColor("#ef4444");
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
            {loading ? <span className="spinner"></span> : "Iniciar Sesión"}
          </button>
        </form>

        {/* Mensajes de estado o error */}
        {mensaje && (
          <p id="mensaje" style={{ color: mensajeColor }}>
            {mensaje}
          </p>
        )}

        {/* BOTÓN PARA REENVIAR EL CORREO (Solo aparece si no está verificado) */}
        {showResend && (
          <button 
            onClick={handleResendEmail} 
            style={{
              width: '100%', 
              marginTop: '10px', 
              padding: '10px', 
              background: 'transparent', 
              border: '1px solid #00f2fe', 
              color: '#00f2fe', 
              borderRadius: '8px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
          >
            <FaEnvelope /> Reenviar correo de verificación
          </button>
        )}

        <div className="link">
          <Link to="/recuperar-contrasena">Olvidé mi contraseña</Link>
        </div>

        <div className="link">
          ¿No tienes cuenta? <Link to="/registro">Regístrate aquí</Link>
        </div>
      </div>
    </div>
  );
}