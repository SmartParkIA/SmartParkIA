 
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { auth } from "../firebase/config.js";
import {
  FaQrcode,
  FaCamera,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaCar,
  FaParking
} from "react-icons/fa";
import "../styles/EscanearAcceso.css";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
 
export default function EscanearAcceso() {
  const scannerRef = useRef(null);
  const procesandoRef = useRef(false);
 
  const [escaneando, setEscaneando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
 
  const iniciarCamara = async () => {
    try {
      setError("");
      setResultado(null);
      procesandoRef.current = false;
 
      if (!auth.currentUser) {
        setError("Debes iniciar sesión para escanear.");
        return;
      }
 
      const scanner = new Html5Qrcode("lector-qr");
      scannerRef.current = scanner;
 
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1
        },
        async (textoQR) => {
          if (procesandoRef.current) return;
 
          procesandoRef.current = true;
          setProcesando(true);
 
          try {
            await scanner.stop();
            setEscaneando(false);
 
        let qrId = null;
 
        try {
        const qrUrl = new URL(textoQR);
 
        // El QR actual utiliza HashRouter:
        // http://localhost:5173/#/ticket?qrId=IDENTIFICADOR
 
        const hashQuery = qrUrl.hash.includes("?")
            ? qrUrl.hash.split("?")[1]
            : "";
 
        qrId =
            qrUrl.searchParams.get("qrId") ||
            new URLSearchParams(hashQuery).get("qrId");
 
        } catch {
        // También permite leer un identificador QR directo.
        qrId = textoQR.trim();
        }
 
        if (!qrId) {
        throw new Error(
            "El código QR no contiene un identificador válido."
        );
        }
 
 
            const usuario = auth.currentUser;
            const token = await usuario.getIdToken();
 
            const response = await fetch(
              `${API_URL}/api/accesos/validar-qr`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ qrId })
              }
            );
 
            const data = await response.json();
 
            if (!response.ok || !data.autorizado) {
              setResultado({
                autorizado: false,
                mensaje: data.mensaje || "Acceso denegado."
              });
              return;
            }
 
            setResultado(data);
 
          } catch (err) {
            console.error(err);
            setError(err.message || "No se pudo validar el QR.");
          } finally {
            setProcesando(false);
          }
        },
        () => {}
      );
 
      setEscaneando(true);
 
    } catch (err) {
      console.error("Error al iniciar cámara:", err);
      setError(
        "No se pudo iniciar la cámara. Revisa los permisos del navegador."
      );
      setEscaneando(false);
    }
  };
 
  const detenerCamara = async () => {
    const scanner = scannerRef.current;
 
    if (scanner?.isScanning) {
      await scanner.stop();
    }
 
    setEscaneando(false);
  };
 
  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
 
      if (scanner?.isScanning) {
        scanner.stop().catch(console.error);
      }
    };
  }, []);
 
  const reiniciar = () => {
    setResultado(null);
    setError("");
    procesandoRef.current = false;
    setProcesando(false);
  };
 
  return (
    <main className="acceso-container">
      <section className="acceso-header">
        <div className="acceso-icono">
          <FaQrcode />
        </div>
 
        <div>
          <h1>Control de acceso</h1>
          <p>Escanea el boleto QR del cliente</p>
        </div>
      </section>
 
      <section className="acceso-panel">
        <div className="acceso-panel-titulo">
          <FaCamera />
          <h2>Lector QR</h2>
        </div>
 
        <div className="lector-contenedor">
          <div id="lector-qr"></div>
 
          {!escaneando && !procesando && !resultado && (
            <div className="lector-placeholder">
              <FaQrcode />
              <p>La cámara aparecerá aquí</p>
            </div>
          )}
        </div>
 
        {procesando && (
          <div className="acceso-procesando">
            <FaSpinner className="girar" />
            <span>Validando reserva...</span>
          </div>
        )}
 
        {error && (
          <div className="acceso-error">
            <FaTimesCircle />
            <span>{error}</span>
          </div>
        )}
 
       
{resultado && (
  <div
    className={
      resultado.autorizado
        ? "resultado-autorizado"
        : "resultado-denegado"
    }
  >
        {resultado.autorizado ? (
          <>
            <FaCheckCircle className="resultado-icono" />
 
            {resultado.acceso.tipo === "salida" ? (
              <>
                <h2>¡Salida autorizada!</h2>
                <p>{resultado.mensaje}</p>
 
                <div className="datos-acceso">
                  <p><FaParking /> {resultado.acceso.estacionamiento}</p>
                  <p>Espacio: {resultado.acceso.espacio}</p>
                  <p>Placa: {resultado.acceso.placa}</p>
                  <p>Estancia finalizada correctamente.</p>
                </div>
              </>
            ) : (
              <>
                <h2>¡Entrada autorizada!</h2>
                <p>{resultado.mensaje}</p>
 
                <div className="datos-acceso">
                  <p><FaParking /> {resultado.acceso.estacionamiento}</p>
                  <p>
                    <FaCar /> {resultado.acceso.marca} {resultado.acceso.modelo}
                  </p>
                  <p>Placa: {resultado.acceso.placa}</p>
                  <p>Espacio: {resultado.acceso.espacio}</p>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <FaTimesCircle className="resultado-icono" />
            <h2>Acceso denegado</h2>
            <p>{resultado.mensaje}</p>
          </>
        )}
      </div>
    )}
 
 
        <div className="acceso-acciones">
          {!escaneando && !procesando && (
            <button className="btn-iniciar" onClick={iniciarCamara}>
              <FaCamera />
              {resultado ? "Escanear otro QR" : "Activar cámara"}
            </button>
          )}
 
          {escaneando && (
            <button className="btn-detener" onClick={detenerCamara}>
              Detener cámara
            </button>
          )}
 
          {resultado && (
            <button className="btn-reiniciar" onClick={reiniciar}>
              Limpiar resultado
            </button>
          )}
        </div>
      </section>
 
      <p className="acceso-nota">
        <FaQrcode /> Cada código QR solamente puede utilizarse una vez.
      </p>
    </main>
  );
}
 