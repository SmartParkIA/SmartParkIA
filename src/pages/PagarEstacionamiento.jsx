import { useEffect, useState } from "react";
import { auth } from "../firebase/config.js";
import { QRCodeCanvas } from "qrcode.react";
import {
  FaCar,
  FaParking,
  FaClock,
  FaMoneyBillWave,
  FaCheckCircle,
  FaSpinner,
  FaExclamationCircle,
  FaCreditCard,
  FaTimes,
  FaLock
} from "react-icons/fa";
import "../styles/PagarEstacionamiento.css";
 
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
 
export default function PagarEstacionamiento() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [qrSalida, setQrSalida] = useState(null);
  const [error, setError] = useState("");

  // 🆕 Estados para la simulación de pago con tarjeta
  const [modalPago, setModalPago] = useState(null); // cotización seleccionada
  const [tarjeta, setTarjeta] = useState({
    numero: "",
    titular: "",
    vencimiento: "",
    cvv: ""
  });
  const [erroresTarjeta, setErroresTarjeta] = useState({});
  const [pasoPago, setPasoPago] = useState("form"); // form | procesando | exito
  const [procesandoTarjeta, setProcesandoTarjeta] = useState(false);
 
  const obtenerCotizacion = async () => {
    try {
      setCargando(true);
      setError("");
 
      const usuario = auth.currentUser;
 
      if (!usuario) {
        throw new Error("Debes iniciar sesión.");
      }
 
      const token = await usuario.getIdToken();
 
      const response = await fetch(`${API_URL}/api/pagos/cotizar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
 
      const data = await response.json();
 
      if (!response.ok || !data.disponible) {
        throw new Error(data.mensaje || "No se pudo consultar la estancia.");
      }
 
      setCotizaciones(data.cotizaciones || []); 
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };
 
  useEffect(() => {
    obtenerCotizacion();
  }, []);
 
  // 🔁 Ahora retorna true/false para saber si el pago se confirmó
  const confirmarPago = async (accesoId) => {
    try {
      setProcesando(true);
      setError("");

      const usuario = auth.currentUser;

      if (!usuario) {
        throw new Error("Debes iniciar sesión.");
      }

      const token = await usuario.getIdToken();

      const response = await fetch(`${API_URL}/api/pagos/confirmar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ accesoId })
      });

      const data = await response.json();

      if (!response.ok || !data.pagado) {
        throw new Error(data.mensaje || "No se pudo confirmar el pago.");
      }

      setQrSalida(data.pago);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setProcesando(false);
    }
  };

  // ================================================================
  // 🆕 SIMULACIÓN DE PAGO CON TARJETA
  // ================================================================
  const abrirModalPago = (cotizacion) => {
    setModalPago(cotizacion);
    setPasoPago("form");
    setTarjeta({ numero: "", titular: "", vencimiento: "", cvv: "" });
    setErroresTarjeta({});
    setError("");
  };

  const cerrarModal = () => {
    if (procesandoTarjeta) return;
    setModalPago(null);
    setPasoPago("form");
  };

  const formatearNumeroTarjeta = (valor) => {
    const soloDigitos = valor.replace(/\D/g, "").slice(0, 16);
    return soloDigitos.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatearVencimiento = (valor) => {
    const soloDigitos = valor.replace(/\D/g, "").slice(0, 4);
    if (soloDigitos.length > 2) {
      return `${soloDigitos.slice(0, 2)}/${soloDigitos.slice(2)}`;
    }
    return soloDigitos;
  };

  const handleTarjetaChange = (e) => {
    const { name, value } = e.target;
    let nuevoValor = value;

    if (name === "numero") nuevoValor = formatearNumeroTarjeta(value);
    if (name === "vencimiento") nuevoValor = formatearVencimiento(value);
    if (name === "cvv") nuevoValor = value.replace(/\D/g, "").slice(0, 4);
    if (name === "titular") nuevoValor = value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ\s]/g, "");

    setTarjeta((prev) => ({ ...prev, [name]: nuevoValor }));
    setErroresTarjeta((prev) => ({ ...prev, [name]: "" }));
  };

  const validarTarjeta = () => {
    const errs = {};
    const numLimpio = tarjeta.numero.replace(/\s/g, "");

    if (numLimpio.length !== 16) {
      errs.numero = "El número debe tener 16 dígitos.";
    } else if (!/^\d+$/.test(numLimpio)) {
      errs.numero = "Solo se permiten números.";
    }

    if (!tarjeta.titular.trim()) {
      errs.titular = "El nombre del titular es obligatorio.";
    } else if (tarjeta.titular.trim().length < 5) {
      errs.titular = "Ingresa el nombre completo.";
    }

    if (tarjeta.vencimiento.length !== 5) {
      errs.vencimiento = "Formato MM/AA.";
    } else {
      const [mes, anio] = tarjeta.vencimiento.split("/").map(Number);
      const hoy = new Date();
      const anioActual = hoy.getFullYear() % 100;
      const mesActual = hoy.getMonth() + 1;
      if (mes < 1 || mes > 12) {
        errs.vencimiento = "Mes inválido.";
      } else if (anio < anioActual || (anio === anioActual && mes < mesActual)) {
        errs.vencimiento = "Tarjeta vencida.";
      }
    }

    if (tarjeta.cvv.length < 3) {
      errs.cvv = "CVV inválido (3-4 dígitos).";
    }

    setErroresTarjeta(errs);
    return Object.keys(errs).length === 0;
  };

  const procesarPagoTarjeta = async () => {
    if (!validarTarjeta()) return;

    setProcesandoTarjeta(true);
    setPasoPago("procesando");
    setError("");

    // ⏱️ Simulación: 2.5 segundos como si el banco procesara
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const exito = await confirmarPago(modalPago.accesoId);

    if (exito) {
      setPasoPago("exito");
      setTimeout(() => {
        setModalPago(null);
        setPasoPago("form");
      }, 1200);
    } else {
      setPasoPago("form");
    }

    setProcesandoTarjeta(false);
  };

  if (cargando) {
    return (
      <main className="pago-container">
        <FaSpinner className="pago-spinner" />
        <p>Consultando tu estancia...</p>
      </main>
    );
  }
 
  return (
    <>
      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeInModal 0.2s ease;
        }
        @keyframes fadeInModal { from { opacity: 0; } to { opacity: 1; } }

        .modal-card {
          background: #ffffff;
          border-radius: 20px;
          width: 100%;
          max-width: 440px;
          padding: 28px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          position: relative;
          color: #1e293b;
          animation: slideUpModal 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          max-height: 90vh;
          overflow-y: auto;
        }
        @keyframes slideUpModal {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .modal-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: #f1f5f9;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          z-index: 2;
        }
        .modal-close:hover:not(:disabled) {
          background: #fee2e2;
          color: #ef4444;
        }
        .modal-close:disabled { opacity: 0.5; cursor: not-allowed; }

        .modal-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .modal-header h2 {
          margin: 8px 0 4px;
          font-size: 20px;
          color: #0f172a;
        }
        .modal-header p {
          margin: 0;
          font-size: 13px;
          color: #64748b;
        }
        .modal-header svg { color: #00bcd4; font-size: 28px; }

        .modal-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
          border-radius: 12px;
          margin-bottom: 20px;
          color: #0f172a;
        }
        .modal-total span {
          font-size: 13px;
          font-weight: 600;
          opacity: 0.8;
        }
        .modal-total strong { font-size: 22px; font-weight: 900; }

        .card-preview {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
          color: #ffffff;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        }
        .card-preview::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(0, 242, 254, 0.25), transparent 70%);
          border-radius: 50%;
        }
        .card-chip {
          width: 36px;
          height: 26px;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          border-radius: 6px;
          margin-bottom: 18px;
          position: relative;
        }
        .card-chip::after {
          content: '';
          position: absolute;
          inset: 4px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }
        .card-number-display {
          font-size: 18px;
          letter-spacing: 2px;
          font-family: 'Courier New', monospace;
          margin-bottom: 16px;
          position: relative;
          z-index: 1;
          min-height: 24px;
        }
        .card-bottom {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          font-size: 11px;
          text-transform: uppercase;
          position: relative;
          z-index: 1;
        }
        .card-bottom small {
          display: block;
          opacity: 0.6;
          margin-bottom: 2px;
          font-size: 9px;
        }
        .card-bottom strong {
          font-size: 12px;
          letter-spacing: 1px;
        }

        .card-form-field { margin-bottom: 14px; }
        .card-form-field label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .card-form-field input {
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          font-size: 14px;
          font-family: inherit;
          color: #0f172a;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          background: #ffffff;
          box-sizing: border-box;
        }
        .card-form-field input:focus {
          border-color: #00bcd4;
          box-shadow: 0 0 0 3px rgba(0, 188, 212, 0.15);
        }
        .card-form-field input.input-error {
          border-color: #ef4444;
          background: #fef2f2;
        }
        .card-form-field .error-msg {
          display: block;
          font-size: 11px;
          color: #ef4444;
          font-weight: 600;
          margin-top: 4px;
        }
        .card-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .btn-pagar-tarjeta {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
          color: #0f172a;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 8px;
          transition: transform 0.2s, box-shadow 0.2s;
          font-family: inherit;
          box-shadow: 0 6px 20px rgba(0, 242, 254, 0.35);
        }
        .btn-pagar-tarjeta:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(0, 242, 254, 0.5);
        }
        .btn-pagar-tarjeta:disabled { opacity: 0.7; cursor: not-allowed; }

        .modal-security {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 14px;
          font-size: 11px;
          color: #64748b;
        }

        .pago-procesando, .pago-exitoso {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 20px;
          text-align: center;
        }
        .pago-procesando .spinner-big {
          font-size: 48px;
          color: #00bcd4;
          animation: spinCard 1s linear infinite;
          margin-bottom: 16px;
        }
        @keyframes spinCard { to { transform: rotate(360deg); } }
        .pago-procesando h3, .pago-exitoso h3 {
          margin: 0 0 8px;
          font-size: 18px;
          color: #0f172a;
        }
        .pago-procesando p, .pago-exitoso p {
          margin: 0;
          font-size: 13px;
          color: #64748b;
        }
        .pago-exitoso .check-big {
          font-size: 64px;
          color: #10b981;
          margin-bottom: 16px;
          animation: popCheckCard 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes popCheckCard {
          0% { transform: scale(0); }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .modal-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 14px;
        }

        @media (max-width: 480px) {
          .card-form-row { grid-template-columns: 1fr; }
          .modal-card { padding: 20px; }
        }
      `}</style>

      <main className="pago-container">
        <header className="pago-header">
          <FaMoneyBillWave />
          <div>
            <h1>Pagar estacionamiento</h1>
            <p>Consulta tu estancia y realiza tu pago simulado.</p>
          </div>
        </header>
 
        {error && !modalPago && (
          <div className="pago-error">
            <FaExclamationCircle />
            <span>{error}</span>
          </div>
        )}
 
        {!qrSalida && cotizaciones.length > 0 && (
          <section className="pago-estancias">
            <h2>Selecciona la estancia que deseas pagar</h2>

            {cotizaciones.map((cotizacion) => {
              const horasCompletas = Math.ceil(cotizacion.minutosEstacionado / 60);
              const montoCompleto = horasCompletas * cotizacion.tarifaHora;

              return (
                <article className="pago-card" key={cotizacion.accesoId}>
                  <h2>Detalle de tu estancia</h2>

                  <div className="pago-dato">
                    <FaParking />
                    <span>Estacionamiento</span>
                    <strong>{cotizacion.estacionamiento}</strong>
                  </div>

                  <div className="pago-dato">
                    <FaCar />
                    <span>Espacio</span>
                    <strong>{cotizacion.espacio}</strong>
                  </div>

                  <div className="pago-dato">
                    <FaCar />
                    <span>Vehículo</span>
                    <strong>{cotizacion.placa}</strong>
                  </div>

                  <div className="pago-dato">
                    <FaClock />
                    <span>Tiempo estacionado</span>
                    <strong>
                      {cotizacion.minutosEstacionado.toFixed(2)} minutos ({horasCompletas} {horasCompletas === 1 ? "hora" : "horas"} completa{horasCompletas === 1 ? "" : "s"})
                    </strong>
                  </div>

                  <div className="pago-dato">
                    <FaMoneyBillWave />
                    <span>Tarifa por hora</span>
                    <strong>${cotizacion.tarifaHora.toFixed(2)} MXN</strong>
                  </div>

                  <div className="pago-total">
                    <span>Total a pagar</span>
                    <strong>${montoCompleto.toFixed(2)} MXN</strong>
                  </div>

                  <p className="pago-aviso">
                    Este pago es una simulación y no representa un cobro real.
                  </p>

                  <button
                    className="btn-pagar"
                    onClick={() => abrirModalPago({ ...cotizacion, montoCompleto })}
                  >
                    <FaCheckCircle />
                    Pagar esta estancia
                  </button>
                </article>
              );
            })}
          </section>
        )}

        {qrSalida && (
          <section className="pago-card pago-exito">
            <FaCheckCircle className="pago-exito-icono" />
 
            <h2>¡Pago registrado correctamente!</h2>
 
            <div className="pago-total">
              <span>Total pagado</span>
              <strong>${qrSalida.monto.toFixed(2)} MXN</strong>
            </div>
 
            <div className="qr-salida">
              <h3>Tu código QR de salida</h3>
 
              <QRCodeCanvas
                value={qrSalida.qrSalidaId}
                size={240}
                bgColor="#FFFFFF"
                fgColor="#000000"
                level="H"
                includeMargin={true}
              />
 
              <p>Escanea este código al salir del estacionamiento.</p>
            </div>
 
            <p className="pago-aviso">
              Presenta este código QR al administrador para autorizar tu salida
              del estacionamiento.
            </p>
          </section>
        )}
 
        {cotizaciones.length === 0 && !qrSalida && !cargando && (
          <section className="pago-card pago-vacio">
            <FaParking />
            <h2>No hay estancia pendiente de pago</h2>
            <p>Cuando tengas una entrada activa, aparecerá aquí.</p>
 
            <button className="btn-pagar" onClick={obtenerCotizacion}>
              Actualizar
            </button>
          </section>
        )}
      </main>

      {/* 🆕 MODAL DE PAGO CON TARJETA (SIMULACIÓN) */}
      {modalPago && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && cerrarModal()}>
          <div className="modal-card">
            <button
              className="modal-close"
              onClick={cerrarModal}
              disabled={procesandoTarjeta}
              aria-label="Cerrar"
            >
              <FaTimes />
            </button>

            {pasoPago === "form" && (
              <>
                <div className="modal-header">
                  <FaCreditCard />
                  <h2>Pago seguro</h2>
                  <p>Ingresa los datos de tu tarjeta (simulación)</p>
                </div>

                <div className="modal-total">
                  <span>Total a pagar</span>
                  <strong>${modalPago.montoCompleto.toFixed(2)} MXN</strong>
                </div>

                {error && (
                  <div className="modal-error">
                    <FaExclamationCircle />
                    <span>{error}</span>
                  </div>
                )}

                <div className="card-preview">
                  <div className="card-chip"></div>
                  <div className="card-number-display">
                    {tarjeta.numero || "•••• •••• •••• ••••"}
                  </div>
                  <div className="card-bottom">
                    <div>
                      <small>Titular</small>
                      <strong>{tarjeta.titular || "NOMBRE COMPLETO"}</strong>
                    </div>
                    <div>
                      <small>Vence</small>
                      <strong>{tarjeta.vencimiento || "MM/AA"}</strong>
                    </div>
                  </div>
                </div>

                <div className="card-form-field">
                  <label>Número de tarjeta</label>
                  <input
                    type="text"
                    name="numero"
                    value={tarjeta.numero}
                    onChange={handleTarjetaChange}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    inputMode="numeric"
                    className={erroresTarjeta.numero ? "input-error" : ""}
                  />
                  {erroresTarjeta.numero && (
                    <span className="error-msg">{erroresTarjeta.numero}</span>
                  )}
                </div>

                <div className="card-form-field">
                  <label>Nombre del titular</label>
                  <input
                    type="text"
                    name="titular"
                    value={tarjeta.titular}
                    onChange={handleTarjetaChange}
                    placeholder="JUAN PEREZ"
                    maxLength={40}
                    className={erroresTarjeta.titular ? "input-error" : ""}
                  />
                  {erroresTarjeta.titular && (
                    <span className="error-msg">{erroresTarjeta.titular}</span>
                  )}
                </div>

                <div className="card-form-row">
                  <div className="card-form-field">
                    <label>Vencimiento</label>
                    <input
                      type="text"
                      name="vencimiento"
                      value={tarjeta.vencimiento}
                      onChange={handleTarjetaChange}
                      placeholder="MM/AA"
                      maxLength={5}
                      inputMode="numeric"
                      className={erroresTarjeta.vencimiento ? "input-error" : ""}
                    />
                    {erroresTarjeta.vencimiento && (
                      <span className="error-msg">{erroresTarjeta.vencimiento}</span>
                    )}
                  </div>
                  <div className="card-form-field">
                    <label>CVV</label>
                    <input
                      type="password"
                      name="cvv"
                      value={tarjeta.cvv}
                      onChange={handleTarjetaChange}
                      placeholder="•••"
                      maxLength={4}
                      inputMode="numeric"
                      className={erroresTarjeta.cvv ? "input-error" : ""}
                    />
                    {erroresTarjeta.cvv && (
                      <span className="error-msg">{erroresTarjeta.cvv}</span>
                    )}
                  </div>
                </div>

                <button
                  className="btn-pagar-tarjeta"
                  onClick={procesarPagoTarjeta}
                  disabled={procesandoTarjeta}
                >
                  <FaLock />
                  Pagar ${modalPago.montoCompleto.toFixed(2)} MXN
                </button>

                <div className="modal-security">
                  <FaLock /> Pago 100% simulado — no se cobra dinero real
                </div>
              </>
            )}

            {pasoPago === "procesando" && (
              <div className="pago-procesando">
                <FaSpinner className="spinner-big" />
                <h3>Procesando pago...</h3>
                <p>Estamos validando tu tarjeta con el banco.</p>
              </div>
            )}

            {pasoPago === "exito" && (
              <div className="pago-exitoso">
                <FaCheckCircle className="check-big" />
                <h3>¡Pago aprobado!</h3>
                <p>Tu código QR de salida aparecerá a continuación.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}