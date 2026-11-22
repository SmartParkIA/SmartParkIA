 
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useState } from "react";
import {
    FaCar,
    FaCheckCircle,
    FaClock,
    FaExclamationCircle,
    FaMoneyBillWave,
    FaParking,
    FaSpinner
} from "react-icons/fa";
import { auth } from "../firebase/config.js";
import "../styles/PagarEstacionamiento.css";
 
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
 
export default function PagarEstacionamiento() {
  const [cotizacion, setCotizacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [qrSalida, setQrSalida] = useState(null);
  const [error, setError] = useState("");
 
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
 
      setCotizacion(data.cotizacion);
 
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };
 
  useEffect(() => {
    obtenerCotizacion();
  }, []);
 
  const confirmarPago = async () => {
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
        body: JSON.stringify({
          accesoId: cotizacion.accesoId
        })
      });
 
      const data = await response.json();
 
      if (!response.ok || !data.pagado) {
        throw new Error(data.mensaje || "No se pudo confirmar el pago.");
      }
 
      setQrSalida(data.pago);
 
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
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
    <main className="pago-container">
      <header className="pago-header">
        <FaMoneyBillWave />
        <div>
          <h1>Pagar estacionamiento</h1>
          <p>Consulta tu estancia y realiza tu pago simulado.</p>
        </div>
      </header>
 
      {error && (
        <div className="pago-error">
          <FaExclamationCircle />
          <span>{error}</span>
        </div>
      )}
 
      {!qrSalida && cotizacion && (
        <section className="pago-card">
          <h2>Detalle de tu estancia</h2>
 
          <div className="pago-dato">
            <FaParking />
            <span>Estacionamiento</span>
            <strong>{cotizacion.estacionamiento}</strong>
          </div>
 
          <div className="pago-dato">
            <FaCar />
            <span>Vehículo</span>
            <strong>{cotizacion.placa || "No registrada"}</strong>
          </div>
 
          <div className="pago-dato">
            <FaClock />
            <span>Tiempo estacionado</span>
            <strong>{cotizacion.minutosEstacionado.toFixed(2)} minutos</strong>
          </div>
 
          <div className="pago-dato">
            <FaMoneyBillWave />
            <span>Tarifa por hora</span>
            <strong>${cotizacion.tarifaHora.toFixed(2)} MXN</strong>
          </div>
 
          <div className="pago-total">
            <span>Total a pagar</span>
            <strong>${cotizacion.monto.toFixed(2)} MXN</strong>
          </div>
 
          <p className="pago-aviso">
            Este pago es una simulación y no representa un cobro real.
          </p>
 
          <button
            className="btn-pagar"
            onClick={confirmarPago}
            disabled={procesando}
          >
            {procesando ? (
              <>
                <FaSpinner className="pago-spinner" />
                Procesando pago...
              </>
            ) : (
              <>
                <FaCheckCircle />
                Confirmar pago
              </>
            )}
          </button>
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
 
      {!cotizacion && !qrSalida && !cargando && (
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
  );
}
