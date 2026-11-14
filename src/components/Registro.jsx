import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config.js";
import { FaEye, FaEyeSlash, FaCheckCircle, FaTimesCircle, FaExclamationCircle } from "react-icons/fa";

export default function Registro() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombres: "",
    apellidoPaterno: "",
    apellidoMaterno: "",
    fechaNacimiento: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);

  // --- FUNCIÓN PARA CALCULAR LA EDAD ---
  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return 0;
    const hoy = new Date();
    const cumpleanos = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - cumpleanos.getFullYear();
    const mes = hoy.getMonth() - cumpleanos.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < cumpleanos.getDate())) {
      edad--;
    }
    return edad;
  };

  // --- VALIDACIÓN DE CAMPOS INDIVIDUALES ---
  const validateField = (name, value) => {
    let error = "";
    switch (name) {
      case "nombres":
      case "apellidoPaterno":
      case "apellidoMaterno":
        if (!value.trim()) error = "Este campo es obligatorio.";
        else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(value)) error = "Solo se permiten letras y espacios.";
        break;
      case "fechaNacimiento":
        if (!value) error = "La fecha es obligatoria.";
        else if (calcularEdad(value) < 18) error = "Debes ser mayor de 18 años.";
        break;
      case "email":
        if (!value) error = "El correo es obligatorio.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Ingresa un correo válido.";
        break;
      case "password":
        if (!value) error = "La contraseña es obligatoria.";
        else if (value.length < 8) error = "Mínimo 8 caracteres.";
        else if (!/[A-Z]/.test(value)) error = "Debe contener al menos una mayúscula.";
        else if (!/[a-z]/.test(value)) error = "Debe contener al menos una minúscula.";
        else if (!/\d/.test(value)) error = "Debe contener al menos un número.";
        else if (!/[^A-Za-z0-9]/.test(value)) error = "Debe contener un carácter especial (!@#$...).";
        break;
      default:
        break;
    }
    return error;
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setForm((f) => ({ ...f, [id]: value }));
    
    // Validar en tiempo real mientras escribe
    const error = validateField(id, value);
    setErrors((prev) => ({ ...prev, [id]: error }));
  };

  // Fuerza de contraseña simple (visual)
  const strength = (() => {
    const p = form.password;
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s; 
  })();

  const strengthLabel = ["Muy débil", "Débil", "Aceptable", "Buena", "Fuerte", "Excelente"][strength];
  const strengthColor = ["#ef4444", "#ef4444", "#f59e0b", "#f59e0b", "#10b981", "#10b981"][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Validar todos los campos antes de enviar
    const newErrors = {};
    Object.keys(form).forEach((key) => {
      const error = validateField(key, form[key]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTipo("error");
      setMensaje("Por favor, corrige los errores en el formulario.");
      return;
    }

    setLoading(true);
    setTipo("info");
    setMensaje("Registrando usuario y enviando correo...");

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const user = userCredential.user;

      await sendEmailVerification(user);

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        nombres: form.nombres.trim(),
        apellidoPaterno: form.apellidoPaterno.trim(),
        apellidoMaterno: form.apellidoMaterno.trim(),
        correo: form.email.toLowerCase().trim(),
        fechaNacimiento: form.fechaNacimiento,
        estado: true,
        rol: "usuario",
        fechaCreacion: new Date().toISOString(),
      });

      setTipo("ok");
      setMensaje("¡Registro exitoso! Te enviamos un correo para verificar tu cuenta.");
      setExito(true);

      setTimeout(() => navigate("/login"), 2500);
    } catch (error) {
      console.error("Error:", error.code, error.message);
      setTipo("error");
      if (error.code === "auth/email-already-in-use") {
        setErrors((prev) => ({ ...prev, email: "Este correo ya está registrado." }));
        setMensaje("Este correo electrónico ya está registrado.");
      } else if (error.code === "auth/weak-password") {
        setMensaje("La contraseña es demasiado débil.");
      } else {
        setMensaje("Error: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const hoy = new Date();
  hoy.setFullYear(hoy.getFullYear() - 18);
  const fechaMaxima = hoy.toISOString().split("T")[0];

  return (
    <div className="reg-page">
      <div className={`reg-card ${exito ? "is-success" : ""}`}>
        <h2>SmartPark IA</h2>
        <p className="subtitle">Crea tu cuenta</p>

        {exito ? (
          <div className="success-box">
            <FaCheckCircle size={56} color="#10b981" className="pop" />
            <h3>¡Cuenta creada!</h3>
            <p>{mensaje}</p>
            <p className="redirect">Redirigiendo al login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="nombres">Nombres</label>
            <input
              id="nombres"
              type="text"
              value={form.nombres}
              onChange={handleChange}
              className={errors.nombres ? "input-error" : ""}
            />
            {errors.nombres && <span className="error-text"><FaExclamationCircle /> {errors.nombres}</span>}

            <div className="row">
              <div className="col">
                <label htmlFor="apellidoPaterno">Apellido Paterno</label>
                <input
                  id="apellidoPaterno"
                  type="text"
                  value={form.apellidoPaterno}
                  onChange={handleChange}
                  className={errors.apellidoPaterno ? "input-error" : ""}
                />
                {errors.apellidoPaterno && <span className="error-text"><FaExclamationCircle /> {errors.apellidoPaterno}</span>}
              </div>
              <div className="col">
                <label htmlFor="apellidoMaterno">Apellido Materno</label>
                <input
                  id="apellidoMaterno"
                  type="text"
                  value={form.apellidoMaterno}
                  onChange={handleChange}
                  className={errors.apellidoMaterno ? "input-error" : ""}
                />
                {errors.apellidoMaterno && <span className="error-text"><FaExclamationCircle /> {errors.apellidoMaterno}</span>}
              </div>
            </div>

            <label htmlFor="fechaNacimiento">Fecha de Nacimiento</label>
            <input
              id="fechaNacimiento"
              type="date"
              value={form.fechaNacimiento}
              onChange={handleChange}
              max={fechaMaxima}
              className={errors.fechaNacimiento ? "input-error" : ""}
            />
            {errors.fechaNacimiento && <span className="error-text"><FaExclamationCircle /> {errors.fechaNacimiento}</span>}

            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className={errors.email ? "input-error" : ""}
            />
            {errors.email && <span className="error-text"><FaExclamationCircle /> {errors.email}</span>}

            <label htmlFor="password">Contraseña</label>
            <div className="password-container">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                className={errors.password ? "input-error" : ""}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((v) => !v)}
                aria-label="Mostrar/ocultar contraseña"
              >
                {showPassword ? (
                  <FaEyeSlash size={18} color="#00f2fe" />
                ) : (
                  <FaEye size={18} color="#94a3b8" />
                )}
              </button>
            </div>
            
            {/* Barra de fuerza */}
            {form.password && (
              <div className="strength">
                <div className="bar">
                  <div
                    className="fill"
                    style={{
                      width: `${(strength / 5) * 100}%`,
                      background: strengthColor,
                    }}
                  />
                </div>
                <span style={{ color: strengthColor }}>{strengthLabel}</span>
              </div>
            )}
            {errors.password && <span className="error-text"><FaExclamationCircle /> {errors.password}</span>}

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? <span className="spinner" /> : "Registrarse"}
            </button>
          </form>
        )}

        {mensaje && !exito && (
          <p className={`msg ${tipo}`}>
            {tipo === "ok" ? (
              <FaCheckCircle />
            ) : tipo === "error" ? (
              <FaTimesCircle />
            ) : null}
            <span>{mensaje}</span>
          </p>
        )}

        {!exito && (
          <div className="link">
            ¿Ya tienes una cuenta? <Link to="/login">Inicia sesión aquí</Link>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

        :root {
            --bg-deep: #03060d;
            --card-surface: rgba(15, 23, 42, 0.82);
            --border-line: rgba(255, 255, 255, 0.12);
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --neon-cyan: #00f2fe;
            --neon-blue: #0072ff;
            --neon-glow: rgba(0, 242, 254, 0.35);
            --error-red: #ef4444;
        }

        .reg-page {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            min-height: 100vh;
            padding: 40px 20px;
            background-color: var(--bg-deep);
            font-family: 'Outfit', "Segoe UI", system-ui, sans-serif;
            color: var(--text-primary);
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
        }

        .reg-page::before,
        .reg-page::after {
            content: '';
            position: absolute;
            border-radius: 50%;
            filter: blur(90px);
            opacity: 0.55;
            pointer-events: none;
            z-index: 0;
        }

        .reg-page::before {
            width: 380px;
            height: 380px;
            background: radial-gradient(circle, var(--neon-cyan) 0%, rgba(0, 242, 254, 0) 70%);
            top: 8%;
            left: 12%;
            animation: floatCyan 10s ease-in-out infinite alternate;
        }

        .reg-page::after {
            width: 420px;
            height: 420px;
            background: radial-gradient(circle, var(--neon-blue) 0%, rgba(0, 114, 255, 0) 70%);
            bottom: 8%;
            right: 12%;
            animation: floatBlue 12s ease-in-out infinite alternate;
        }

        @keyframes floatCyan {
            0% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(80px, 50px) scale(1.2); }
            100% { transform: translate(-40px, 90px) scale(0.9); }
        }

        @keyframes floatBlue {
            0% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(-90px, -60px) scale(1.15); }
            100% { transform: translate(50px, -40px) scale(0.95); }
        }

        .reg-card {
            position: relative;
            z-index: 1;
            background: var(--card-surface);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            padding: 36px 32px;
            border-radius: 20px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px var(--neon-glow);
            border: 1px solid var(--border-line);
            width: 100%;
            max-width: 440px;
            margin: auto;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .reg-card h2 {
            text-align: center;
            color: #ffffff;
            margin-top: 0;
            margin-bottom: 8px;
            font-weight: 800;
            letter-spacing: 1.5px;
            font-size: 26px;
            text-transform: uppercase;
            background: linear-gradient(135deg, #ffffff 30%, var(--neon-cyan));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            filter: drop-shadow(0 0 10px rgba(0, 242, 254, 0.4));
        }

        .subtitle {
            text-align: center;
            color: var(--text-secondary);
            font-size: 14px;
            margin: 0 0 24px;
        }

        .reg-card label {
            display: block;
            margin-top: 14px;
            font-weight: 600;
            color: var(--text-secondary);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .reg-card input {
            width: 100%;
            padding: 12px 16px;
            margin-top: 6px;
            background: rgba(3, 7, 18, 0.65);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 10px;
            color: #fff;
            box-sizing: border-box;
            font-size: 14px;
            font-weight: 500;
            letter-spacing: 0.3px;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: 'Outfit', sans-serif;
            outline: none;
        }

        .reg-card input:focus {
            border-color: var(--neon-cyan);
            box-shadow: 0 0 16px var(--neon-glow), inset 0 0 8px rgba(0, 242, 254, 0.1);
            background: rgba(3, 7, 18, 0.95);
            transform: translateY(-1px);
        }

        /* --- ESTILOS DE VALIDACIÓN --- */
        .reg-card input.input-error {
            border-color: var(--error-red);
            box-shadow: 0 0 10px rgba(239, 68, 68, 0.2);
        }
        
        .reg-card input.input-error:focus {
            border-color: var(--error-red);
            box-shadow: 0 0 16px rgba(239, 68, 68, 0.4);
        }

        .error-text {
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--error-red);
            font-size: 12px;
            margin-top: 6px;
            font-weight: 500;
            animation: fadeIn 0.3s ease;
        }

        .row { display: flex; gap: 12px; }
        .col { flex: 1; }

        .password-container {
            position: relative;
            width: 100%;
        }

        .password-container input {
            padding-right: 44px;
        }

        .toggle-password {
            position: absolute;
            right: 12px;
            top: 55%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            border-radius: 6px;
            transition: background 0.2s ease;
        }

        .strength {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 8px;
            font-size: 12px;
            animation: fadeIn 0.3s ease;
        }
        .strength .bar {
            flex: 1;
            height: 6px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            overflow: hidden;
        }
        .strength .fill {
            height: 100%;
            transition: width 0.4s ease, background 0.4s ease;
        }

        .submit-btn {
            position: relative;
            width: 100%;
            background: linear-gradient(135deg, var(--neon-blue), var(--neon-cyan));
            color: #03060d;
            font-weight: 800;
            border: none;
            padding: 14px;
            margin-top: 26px;
            border-radius: 10px;
            font-size: 15px;
            cursor: pointer;
            letter-spacing: 1px;
            text-transform: uppercase;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 20px rgba(0, 242, 254, 0.3);
            overflow: hidden;
            font-family: 'Outfit', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 48px;
        }

        .submit-btn:hover:not(:disabled) {
            transform: translateY(-2px) scale(1.01);
            box-shadow: 0 8px 25px rgba(0, 242, 254, 0.6);
            filter: brightness(1.1);
        }

        .submit-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }

        .spinner {
            width: 20px;
            height: 20px;
            border: 3px solid rgba(3, 6, 13, 0.3);
            border-top-color: #03060d;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        .msg {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            text-align: center;
            margin-top: 18px;
            font-weight: 600;
            font-size: 13px;
            animation: fadeInUp 0.3s ease;
        }
        .msg.info  { color: var(--neon-cyan); }
        .msg.ok    { color: #10b981; }
        .msg.error { color: var(--error-red); animation: shake 0.4s ease; }

        .success-box {
            text-align: center;
            padding: 20px 0;
            animation: fadeInUp 0.5s ease;
            color: var(--text-primary);
        }
        .success-box h3 {
            color: #10b981;
            margin: 16px 0 8px;
            font-size: 22px;
        }
        .success-box .redirect {
            color: var(--text-secondary);
            font-size: 13px;
            margin-top: 16px;
        }

        .reg-card .link {
            text-align: center;
            margin-top: 22px;
            font-size: 13px;
            color: var(--text-secondary);
        }
        .reg-card .link a {
            color: var(--neon-cyan);
            text-decoration: none;
            font-weight: 700;
            transition: all 0.2s ease;
        }

        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-6px); }
            75% { transform: translateX(6px); }
        }

        @media (max-width: 480px) {
            .reg-card { padding: 30px 20px; max-width: 95%; }
            .row { flex-direction: column; gap: 0; }
        }
      `}</style>
    </div>
  );
}