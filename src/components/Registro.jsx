import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config.js";
import { FaEye, FaEyeSlash, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

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

  const [showPassword, setShowPassword] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState(null); // "info" | "ok" | "error"
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.id]: e.target.value }));

  // Fuerza de contraseña simple
  const strength = (() => {
    const p = form.password;
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s; // 0..5
  })();

  const strengthLabel = ["Muy débil", "Débil", "Aceptable", "Buena", "Fuerte", "Excelente"][strength];
  const strengthColor = ["#ef4444", "#ef4444", "#f59e0b", "#f59e0b", "#10b981", "#10b981"][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        nombres: form.nombres,
        apellidoPaterno: form.apellidoPaterno,
        apellidoMaterno: form.apellidoMaterno,
        correo: form.email,
        fechaNacimiento: form.fechaNacimiento,
        estado: true,
        rol: "usuario",
        fechaCreacion: new Date().toISOString(),
      });

      setTipo("ok");
      setMensaje(
        "¡Registro exitoso! Te enviamos un correo para verificar tu cuenta."
      );
      setExito(true);

      setTimeout(() => navigate("/login"), 2500);
    } catch (error) {
      console.error("Error:", error.code, error.message);
      setTipo("error");
      if (error.code === "auth/email-already-in-use") {
        setMensaje("Este correo electrónico ya está registrado.");
      } else if (error.code === "auth/weak-password") {
        setMensaje("La contraseña es demasiado débil (mínimo 6 caracteres).");
      } else {
        setMensaje("Error: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

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
          <form onSubmit={handleSubmit}>
            <label htmlFor="nombres">Nombres</label>
            <input
              id="nombres"
              type="text"
              value={form.nombres}
              onChange={handleChange}
              required
            />

            <div className="row">
              <div className="col">
                <label htmlFor="apellidoPaterno">Apellido Paterno</label>
                <input
                  id="apellidoPaterno"
                  type="text"
                  value={form.apellidoPaterno}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col">
                <label htmlFor="apellidoMaterno">Apellido Materno</label>
                <input
                  id="apellidoMaterno"
                  type="text"
                  value={form.apellidoMaterno}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <label htmlFor="fechaNacimiento">Fecha de Nacimiento</label>
            <input
              id="fechaNacimiento"
              type="date"
              value={form.fechaNacimiento}
              onChange={handleChange}
              required
            />

            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />

            <label htmlFor="password">Contraseña</label>
            <div className="password-container">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
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
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pop {
          0%   { transform: scale(0); }
          60%  { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25%      { transform: translateX(-6px); }
          75%      { transform: translateX(6px); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); }
          50%      { box-shadow: 0 20px 70px rgba(0, 242, 254, 0.25); }
        }

        .reg-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          font-family: 'Segoe UI', system-ui, sans-serif;
          padding: 20px;
          box-sizing: border-box;
          animation: fadeIn 0.5s ease;
        }
        .reg-card {
          background: #1e293b;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          width: 100%;
          max-width: 480px;
          border: 1px solid rgba(0, 242, 254, 0.15);
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1), glow 4s ease-in-out infinite;
          transition: transform 0.3s;
        }
        .reg-card.is-success {
          animation: pop 0.5s ease;
          border-color: rgba(16, 185, 129, 0.4);
        }
        .reg-card h2 {
          text-align: center;
          color: #00f2fe;
          margin: 0;
          font-size: 28px;
          letter-spacing: 0.5px;
        }
        .subtitle {
          text-align: center;
          color: #94a3b8;
          font-size: 14px;
          margin: 4px 0 24px;
        }
        .reg-card label {
          display: block;
          color: #94a3b8;
          font-size: 14px;
          margin: 14px 0 6px;
        }
        .reg-card input {
          width: 100%;
          padding: 12px 14px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 14px;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.25s, box-shadow 0.25s, transform 0.15s;
        }
        .reg-card input:focus {
          border-color: #00f2fe;
          box-shadow: 0 0 0 3px rgba(0, 242, 254, 0.15);
          transform: translateY(-1px);
        }
        .row { display: flex; gap: 10px; }
        .col { flex: 1; }

        .password-container { position: relative; }
        .password-container input { padding-right: 45px; }
        .toggle-password {
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
          transition: transform 0.2s;
        }
        .toggle-password:hover { transform: translateY(-50%) scale(1.15); }

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
          background: #334155;
          border-radius: 4px;
          overflow: hidden;
        }
        .strength .fill {
          height: 100%;
          transition: width 0.4s ease, background 0.4s ease;
        }

        .submit-btn {
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
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
        }
        .submit-btn:hover:not(:disabled) {
          opacity: 0.95;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 242, 254, 0.3);
        }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(15, 23, 42, 0.3);
          border-top-color: #0f172a;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .msg {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-align: center;
          margin-top: 16px;
          font-size: 14px;
          animation: fadeInUp 0.3s ease;
        }
        .msg.info  { color: #00f2fe; }
        .msg.ok    { color: #10b981; }
        .msg.error { color: #ef4444; animation: shake 0.4s ease; }

        .success-box {
          text-align: center;
          padding: 20px 0;
          animation: fadeInUp 0.5s ease;
          color: #e2e8f0;
        }
        .success-box h3 {
          color: #10b981;
          margin: 16px 0 8px;
          font-size: 22px;
        }
        .success-box .redirect {
          color: #94a3b8;
          font-size: 13px;
          margin-top: 16px;
        }
        .pop { animation: pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }

        .reg-card .link {
          text-align: center;
          margin-top: 20px;
          color: #94a3b8;
          font-size: 14px;
        }
        .reg-card .link a {
          color: #00f2fe;
          text-decoration: none;
          transition: color 0.2s;
        }
        .reg-card .link a:hover { color: #4facfe; text-decoration: underline; }
      `}</style>
    </div>
  );
}