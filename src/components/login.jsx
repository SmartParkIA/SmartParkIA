import {
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useState } from "react";
import { FaEnvelope, FaEye, FaEyeSlash, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/config.js";
import "../styles/registro.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Estados para validaciones y UI
  const [errors, setErrors] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [mensajeColor, setMensajeColor] = useState("#94a3b8");
  const [loading, setLoading] = useState(false);

  // Estados para manejar el reenvío de correo
  const [showResend, setShowResend] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState(null);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  const navigate = useNavigate();

  // --- VALIDACIÓN LOCAL (Formato) ---
  const validateField = (name, value) => {
    let error = "";
    if (name === "email") {
      if (!value.trim()) error = "El correo es obligatorio.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Ingresa un correo válido.";
    }
    if (name === "password") {
      if (!value) error = "La contraseña es obligatoria.";
    }
    return error;
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    if (id === "email") setEmail(value);
    if (id === "password") setPassword(value);

    // Validar en tiempo real y limpiar el error si el usuario está corrigiendo
    const error = validateField(id, value);
    setErrors((prev) => ({ ...prev, [id]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowResend(false);
    setMensaje("");
    setErrors({});

    // 1. Validar formato local antes de ir a Firebase
    const emailError = validateField("email", email);
    const passwordError = validateField("password", password);

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      setMensaje("Por favor, corrige los errores en el formulario.");
      setMensajeColor("#ef4444");
      return;
    }

    setMensaje("Iniciando sesión...");
    setMensajeColor("#00f2fe");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Forzar recarga para obtener el estado actualizado de verificación
      await user.reload();

      // 2. Verificar si el correo está verificado
      if (!user.emailVerified) {
        setUnverifiedUser(user);
        setMensaje("Debes verificar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja o spam.");
        setMensajeColor("#ef4444");
        setShowResend(true);
        setLoading(false);
        await signOut(auth);
        return;
      }

      // 3. Si está verificado, verificamos Firestore y redirigimos
      const docRef = doc(db, "users", user.uid);
      await getDoc(docRef);

      setMensaje("¡Bienvenido! Redirigiendo...");
      setMensajeColor("#10b981");
      setTimeout(() => navigate("/perfil"), 800);

    } catch (error) {
      console.error("Error de login:", error);
      let msg = "";
      let newErrors = {};

      // 4. Atrapar los errores de Firebase
      switch (error.code) {
        case "auth/invalid-email":
          msg = "El correo electrónico no tiene un formato válido.";
          newErrors.email = "Correo incorrecto.";
          break;
          
        case "auth/user-not-found":
          msg = "Este correo no está registrado en SmartPark IA.";
          newErrors.email = "Correo no existente.";
          break;
          
        case "auth/wrong-password":
          msg = "La contraseña es incorrecta.";
          newErrors.password = "Contraseña incorrecta.";
          break;

        case "auth/invalid-credential":
          // Firebase usa este error si la protección de enumeración está activa.
          // Pintamos ambos campos para que el usuario sepa que puede ser cualquiera.
          msg = "El correo o la contraseña son incorrectos. Verifica tus datos.";
          newErrors.email = "Verifica tu correo.";
          newErrors.password = "Verifica tu contraseña.";
          break;
          
        case "auth/too-many-requests":
          msg = "Demasiados intentos fallidos. Espera un momento e intenta de nuevo.";
          break;

        default:
          msg = "Error al iniciar sesión: " + error.message;
      }

      setErrors(newErrors);
      setMensaje(msg);
      setMensajeColor("#ef4444");
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!unverifiedUser) return;
    setResending(true);
    try {
      await sendEmailVerification(unverifiedUser);
      setMensaje("¡Correo de verificación reenviado! Revisa tu bandeja de entrada o spam.");
      setMensajeColor("#10b981");
      setShowResend(false);
    } catch (error) {
      console.error("Error al reenviar:", error);
      setMensaje("Error al reenviar el correo. Intenta más tarde.");
      setMensajeColor("#ef4444");
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerified = async () => {
    if (!unverifiedUser) return;
    setChecking(true);
    try {
      await unverifiedUser.reload();
      if (unverifiedUser.emailVerified) {
        setMensaje("¡Correo verificado! Bienvenido, redirigiendo...");
        setMensajeColor("#10b981");
        setShowResend(false);
        setTimeout(() => navigate("/perfil"), 800);
      } else {
        setMensaje("Aún no detectamos la verificación. Asegúrate de haber hecho clic en el enlace del correo.");
        setMensajeColor("#f59e0b");
      }
    } catch (error) {
      console.error("Error al comprobar verificación:", error);
      setMensaje("Error al comprobar el estado. Intenta más tarde.");
      setMensajeColor("#ef4444");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="login-page">
      <div className="card">
        <h2>SmartPark IA</h2>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">Correo electrónico</label>
          <div className="input-container">
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleChange}
              className={errors.email ? "input-error" : ""}
              placeholder="tu@correo.com"
            />
          </div>
          {errors.email && (
            <span className="error-text">
              <FaExclamationCircle /> {errors.email}
            </span>
          )}

          <label htmlFor="password">Contraseña</label>
          <div className="password-container">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={handleChange}
              className={errors.password ? "input-error" : ""}
              placeholder="••••••••"
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
          {errors.password && (
            <span className="error-text">
              <FaExclamationCircle /> {errors.password}
            </span>
          )}

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? <span className="spinner"></span> : "Iniciar Sesión"}
          </button>
        </form>

        {/* Mensajes de estado o error generales */}
        {mensaje && !showResend && (
          <p id="mensaje" style={{ color: mensajeColor }}>
            {mensaje}
          </p>
        )}

        {/* BOTONES PARA CUANDO EL CORREO NO ESTÁ VERIFICADO */}
        {showResend && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
            <p id="mensaje" style={{ color: mensajeColor, fontSize: "13px", textAlign: "center", margin: "0 0 5px" }}>
              {mensaje}
            </p>
            <button
              onClick={handleResendEmail}
              disabled={resending}
              className="btn-resend"
              style={{
                borderColor: "#00f2fe", color: "#00f2fe",
                opacity: resending ? 0.6 : 1, cursor: resending ? "not-allowed" : "pointer"
              }}
            >
              <FaEnvelope /> {resending ? "Reenviando..." : "Reenviar correo de verificación"}
            </button>

            <button
              onClick={handleCheckVerified}
              disabled={checking}
              className="btn-resend"
              style={{
                borderColor: "#10b981", color: "#10b981",
                opacity: checking ? 0.6 : 1, cursor: checking ? "not-allowed" : "pointer"
              }}
            >
              <FaCheckCircle /> {checking ? "Comprobando..." : "Ya verifiqué mi correo"}
            </button>
          </div>
        )}

        <div className="link">
          <Link to="/recuperar-contrasena">Olvidé mi contraseña</Link>
        </div>

        <div className="link">
          ¿No tienes cuenta? <Link to="/registro">Regístrate aquí</Link>
        </div>
      </div>

      {/* ESTILOS AÑADIDOS PARA LAS VALIDACIONES */}
      <style>{`
        .input-container { position: relative; width: 100%; }
        
        /* Estilos para cuando hay error */
        input.input-error {
          border-color: #ef4444 !important;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.2) !important;
        }
        
        input.input-error:focus {
          box-shadow: 0 0 16px rgba(239, 68, 68, 0.4) !important;
        }
        
        .error-text {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #ef4444;
          font-size: 12px;
          margin-top: 6px;
          font-weight: 500;
          animation: fadeIn 0.3s ease;
        }

        /* Botones de reenvío estilizados */
        .btn-resend {
          width: 100%;
          padding: 10px;
          background: transparent;
          border: 1px solid;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
          font-family: 'Outfit', sans-serif;
        }
      `}</style>
    </div>
  );
}