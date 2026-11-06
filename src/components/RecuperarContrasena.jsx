import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/config.js";
import {
  FaEnvelope, FaPaperPlane, FaCheckCircle, FaTimesCircle,
  FaLightbulb, FaArrowLeft, FaSpinner, FaShieldAlt, FaLock,
} from "react-icons/fa";

export default function RecuperarContrasena() {
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState(null); // "info" | "ok" | "error"
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTipo("info");
    setMensaje("Enviando correo de recuperación...");

    try {
      await sendPasswordResetEmail(auth, email);
      setTipo("ok");
      setMensaje("¡Correo enviado! Revisa tu bandeja de entrada o spam.");
      setEnviado(true);
    } catch (error) {
      console.error(error);
      setTipo("error");
      if (error.code === "auth/user-not-found") {
        setMensaje("No existe una cuenta con ese correo.");
      } else if (error.code === "auth/invalid-email") {
        setMensaje("El correo ingresado no es válido.");
      } else {
        setMensaje("No se pudo enviar el correo. Verifica el correo ingresado.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rec-page">
      <div className="container">
        {/* ============== LADO IZQUIERDO ============== */}
        <div className="left-panel">
          <div className="left-top">
            <h1>
              ¡Hola! <span className="wave">👋</span>
            </h1>
            <p className="subtitle">
              Recupera tu cuenta contestando el formulario a la derecha.
            </p>

            {/* Escena animada: carro estacionándose */}
            <div className="parking-scene">
              <div className="parking-spot"></div>
              <div className="car">
                <div className="car-windshield"></div>
                <div className="car-headlights"></div>
                <div className="wheel wheel-tl"></div>
                <div className="wheel wheel-tr"></div>
                <div className="wheel wheel-bl"></div>
                <div className="wheel wheel-br"></div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="tips-container">
            <div className="tips-title">
              <FaLightbulb /> Tips para no perder tu acceso
            </div>
            <ul className="tips-list">
              <li>
                <strong>Usa un gestor de contraseñas:</strong> herramientas como
                1Password o Bitwarden guardan tus claves seguras.
              </li>
              <li>
                <strong>Guarda credenciales en el navegador:</strong> permite que
                mantenga una copia cifrada para autocompletar.
              </li>
              <li>
                <strong>Crea patrones memorables:</strong> combina frases cortas
                con números o caracteres especiales.
              </li>
              <li>
                <strong>Mantén tu correo al día:</strong> asegúrate de tener
                acceso a la cuenta vinculada a SmartPark IA.
              </li>
            </ul>
          </div>
        </div>

        {/* ============== LADO DERECHO ============== */}
        <div className={`right-panel ${enviado ? "is-success" : ""}`}>
          {enviado ? (
            <div className="success-box">
              <FaCheckCircle size={64} color="#27AD52" className="pop" />
              <h2>¡Correo enviado!</h2>
              <p className="desc">
                Revisa tu bandeja de entrada o la carpeta de spam. Sigue el enlace
                para restablecer tu contraseña.
              </p>
              <Link to="/login" className="back-btn">
                <FaArrowLeft /> Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h2>
                <FaShieldAlt className="title-icon" /> Restablecer acceso
              </h2>
              <p className="desc">
                Ingresa tu correo electrónico y te enviaremos las instrucciones
                para restablecer tu contraseña.
              </p>

              <form onSubmit={handleSubmit}>
                <label htmlFor="email">Correo electrónico</label>
                <div className="input-wrapper">
                  <FaEnvelope className="input-icon" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@ejemplo.com"
                    required
                    disabled={loading}
                  />
                </div>

                <button type="submit" disabled={loading} className="submit-btn">
                  {loading ? (
                    <>
                      <FaSpinner className="spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane /> Enviar enlace
                    </>
                  )}
                </button>
              </form>

              {mensaje && (
                <p className={`msg ${tipo}`}>
                  {tipo === "ok" && <FaCheckCircle />}
                  {tipo === "error" && <FaTimesCircle />}
                  {tipo === "info" && <FaSpinner className="spin" />}
                  <span>{mensaje}</span>
                </p>
              )}

              <div className="link">
                <Link to="/login">
                  <FaArrowLeft /> Volver al inicio de sesión
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ============== ESTILOS ============== */}
      <style>{`
        /* ======= ANIMACIONES ======= */
        @keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp  { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInLeft{ from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeInRight{ from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes spin      { to { transform: rotate(360deg); } }
        @keyframes pop       { 0% { transform: scale(0); } 60% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @keyframes wave      { 0%,100% { transform: rotate(0); } 25% { transform: rotate(20deg); } 75% { transform: rotate(-15deg); } }
        @keyframes shake     { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }

        /* Animación del carro: entra desde la izquierda y se estaciona */
        @keyframes driveIn {
          0%   { transform: translateX(-150px); }
          70%  { transform: translateX(15px); }
          85%  { transform: translateX(-6px); }
          100% { transform: translateX(0); }
        }
        @keyframes headlightGlow {
          0%,100% { opacity: 0.9; box-shadow: 0 0 10px 3px rgba(255, 230, 100, 0.9); }
          50%     { opacity: 1;   box-shadow: 0 0 18px 6px rgba(255, 230, 100, 1); }
        }
        @keyframes wheelSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(720deg); }
        }
        @keyframes pulse {
          0%,100% { opacity: 0.4; }
          50%     { opacity: 0.8; }
        }
        @keyframes float {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-6px); }
        }

        * { box-sizing: border-box; }

        .rec-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif;
          padding: 20px;
          animation: fadeIn 0.5s ease;
        }
        .rec-page .container {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          max-width: 1000px;
          width: 100%;
          background: #1e293b;
          border: 1px solid rgba(0, 242, 254, 0.15);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.5);
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* ========== LADO IZQUIERDO ========== */
        .left-panel {
          padding: 40px 32px;
          background: linear-gradient(160deg, #0b1220 0%, #1a2740 100%);
          display: flex;
          flex-direction: column;
          gap: 30px;
          animation: fadeInLeft 0.7s ease;
        }
        .left-panel h1 {
          color: #e2e8f0;
          font-size: 32px;
          margin: 0 0 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .left-panel .wave {
          display: inline-block;
          animation: wave 2s ease-in-out infinite;
          transform-origin: 70% 70%;
        }
        .left-panel .subtitle {
          color: #94a3b8;
          font-size: 15px;
          margin: 0 0 30px;
          line-height: 1.5;
        }

        /* ========== ESCENA DEL CARRO ========== */
        .parking-scene {
          position: relative;
          height: 160px;
          margin: 20px 0 30px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .parking-spot {
          position: absolute;
          bottom: 0;
          width: 220px;
          height: 100px;
          border: 3px dashed rgba(0, 242, 254, 0.4);
          border-radius: 10px;
          animation: pulse 3s ease-in-out infinite;
        }
        .car {
          position: relative;
          width: 140px;
          height: 60px;
          background: linear-gradient(135deg, #4facfe, #00f2fe);
          border-radius: 14px 30px 10px 10px;
          margin-bottom: 20px;
          animation: driveIn 2.5s cubic-bezier(0.22, 1, 0.36, 1) forwards,
                     float 3s ease-in-out 2.5s infinite;
          box-shadow: 0 8px 20px rgba(0, 242, 254, 0.4);
        }
        .car-windshield {
          position: absolute;
          top: 8px;
          right: 18px;
          width: 45px;
          height: 20px;
          background: rgba(15, 23, 42, 0.65);
          border-radius: 8px 14px 4px 4px;
        }
        .car-headlights {
          position: absolute;
          right: 2px;
          top: 50%;
          transform: translateY(-50%);
          width: 8px;
          height: 12px;
          background: #ffe764;
          border-radius: 50%;
          animation: headlightGlow 1.5s ease-in-out infinite;
        }
        .wheel {
          position: absolute;
          width: 18px;
          height: 18px;
          background: #0b1220;
          border: 3px solid #334155;
          border-radius: 50%;
          bottom: -8px;
          animation: wheelSpin 1s linear infinite;
        }
        .wheel::after {
          content: '';
          position: absolute;
          inset: 4px;
          background: #64748b;
          border-radius: 50%;
        }
        .wheel-tl { left: 12px; }
        .wheel-tr { right: 12px; }
        .wheel-bl { left: 12px; }
        .wheel-br { right: 12px; }

        /* ========== TIPS ========== */
        .tips-container {
          background: rgba(0, 242, 254, 0.05);
          border: 1px solid rgba(0, 242, 254, 0.15);
          border-radius: 12px;
          padding: 20px;
          animation: fadeInUp 0.8s ease backwards;
          animation-delay: 0.3s;
        }
        .tips-title {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #00f2fe;
          font-weight: 600;
          font-size: 15px;
          margin-bottom: 12px;
        }
        .tips-list {
          margin: 0;
          padding-left: 18px;
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.7;
        }
        .tips-list li { margin-bottom: 8px; }
        .tips-list strong { color: #e2e8f0; }

        /* ========== LADO DERECHO ========== */
        .right-panel {
          padding: 50px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          animation: fadeInRight 0.7s ease;
          position: relative;
        }
        .right-panel.is-success { align-items: center; text-align: center; }
        .right-panel h2 {
          color: #e2e8f0;
          font-size: 26px;
          margin: 0 0 10px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .right-panel .title-icon { color: #00f2fe; }
        .right-panel .desc {
          color: #94a3b8;
          font-size: 14px;
          margin: 0 0 28px;
          line-height: 1.6;
        }

        .right-panel label {
          display: block;
          color: #94a3b8;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .input-wrapper {
          position: relative;
          margin-bottom: 24px;
        }
        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          transition: color 0.2s;
          pointer-events: none;
        }
        .input-wrapper:focus-within .input-icon { color: #00f2fe; }

        .right-panel input {
          width: 100%;
          padding: 13px 14px 13px 42px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 10px;
          color: #e2e8f0;
          font-size: 14px;
          outline: none;
          transition: border-color 0.25s, box-shadow 0.25s, transform 0.15s;
        }
        .right-panel input:focus {
          border-color: #00f2fe;
          box-shadow: 0 0 0 3px rgba(0, 242, 254, 0.15);
          transform: translateY(-1px);
        }
        .right-panel input:disabled { opacity: 0.6; }

        .submit-btn {
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, #00f2fe, #4facfe);
          color: #0f172a;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          min-height: 48px;
        }
        .submit-btn:hover:not(:disabled) {
          opacity: 0.95;
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 242, 254, 0.35);
        }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .spin { animation: spin 1s linear infinite; }

        .msg {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-align: center;
          margin-top: 18px;
          font-size: 14px;
          animation: fadeInUp 0.3s ease;
        }
        .msg.info  { color: #00f2fe; }
        .msg.ok    { color: #27AD52; }
        .msg.error { color: #E11900; animation: fadeInUp 0.3s ease, shake 0.4s ease; }

        .right-panel .link {
          text-align: center;
          margin-top: 24px;
        }
        .right-panel .link a {
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: color 0.2s, transform 0.15s;
        }
        .right-panel .link a:hover {
          color: #00f2fe;
          transform: translateX(-3px);
        }

        /* ========== ÉXITO ========== */
        .success-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          animation: fadeInUp 0.5s ease;
        }
        .success-box h2 { margin: 8px 0 0; color: #27AD52; }
        .success-box .pop { animation: pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 20px;
          padding: 12px 22px;
          background: linear-gradient(135deg, #00f2fe, #4facfe);
          color: #0f172a;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
        }
        .back-btn:hover {
          opacity: 0.95;
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 242, 254, 0.35);
        }

        /* ========== RESPONSIVE ========== */
        @media (max-width: 820px) {
          .rec-page .container { grid-template-columns: 1fr; }
          .left-panel { padding: 30px 24px; }
          .right-panel { padding: 34px 24px; }
          .left-panel h1 { font-size: 26px; }
          .right-panel h2 { font-size: 22px; }
        }
      `}</style>
    </div>
  );
}