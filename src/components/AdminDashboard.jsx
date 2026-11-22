import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config.js";
import { 
  FaMoneyBillWave, FaCalendarDay, FaCalendarWeek, 
  FaCalendarAlt, FaParking, FaSpinner, FaChartLine 
} from "react-icons/fa";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    hoy: 0,
    semana: 0,
    mes: 0,
    reservasHoy: 0
  });

  useEffect(() => {
    const cargarEstadisticas = async () => {
      try {
        // 1. Traemos todas las reservas (para un proyecto real, esto se optimiza con consultas por fecha)
        const querySnapshot = await getDocs(collection(db, "reservas"));
        
        let gananciasHoy = 0;
        let gananciasSemana = 0;
        let gananciasMes = 0;
        let reservasDelDia = 0;

        // 2. Obtenemos las fechas de referencia
        const hoy = new Date();
        const fechaHoyStr = hoy.toISOString().split("T")[0]; // "YYYY-MM-DD"
        const mesActualStr = fechaHoyStr.substring(0, 7); // "YYYY-MM"

        // Calcular el inicio de la semana (Lunes)
        const diaSemana = hoy.getDay() === 0 ? 7 : hoy.getDay();
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - diaSemana + 1);
        inicioSemana.setHours(0, 0, 0, 0);

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const estado = (data.estado || "").toLowerCase();
          
          // Solo contamos las reservas que no están canceladas
          if (estado !== "cancelada") {
            const costo = Number(data.costoTotal) || 0;
            const fechaReserva = data.fecha; // "YYYY-MM-DD"
            const dateObj = new Date(`${data.fecha}T${data.horario || "00:00"}`);

            // Ganancias de Hoy y Reservas del Día
            if (fechaReserva === fechaHoyStr) {
              gananciasHoy += costo;
              reservasDelDia++;
            }

            // Ganancias de la Semana
            if (dateObj >= inicioSemana) {
              gananciasSemana += costo;
            }

            // Ganancias del Mes
            if (fechaReserva && fechaReserva.startsWith(mesActualStr)) {
              gananciasMes += costo;
            }
          }
        });

        setStats({
          hoy: gananciasHoy,
          semana: gananciasSemana,
          mes: gananciasMes,
          reservasHoy: reservasDelDia
        });

      } catch (error) {
        console.error("Error al cargar estadísticas:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarEstadisticas();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px", color: "#00f2fe" }}>
        <FaSpinner className="spin" size={40} style={{ animation: "spin 1s linear infinite" }} />
        <p>Calculando ganancias...</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", marginBottom: "40px" }}>
      
      {/* TÍTULO */}
      <h2 style={{ color: "#fff", fontSize: "24px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
        <FaChartLine color="#00f2fe" /> Resumen de Ganancias
      </h2>

      {/* TARJETAS DE ESTADÍSTICAS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
        
        {/* GANANCIAS HOY */}
        <div className="stat-card" style={cardStyle}>
          <div style={iconBoxStyle("#10b981")}>
            <FaCalendarDay size={24} />
          </div>
          <div>
            <p style={labelStyle}>Ganancias de Hoy</p>
            <h3 style={valueStyle}>${stats.hoy} <span style={currencyStyle}>MXN</span></h3>
          </div>
        </div>

        {/* GANANCIAS SEMANA */}
        <div className="stat-card" style={cardStyle}>
          <div style={iconBoxStyle("#00f2fe")}>
            <FaCalendarWeek size={24} />
          </div>
          <div>
            <p style={labelStyle}>Esta Semana</p>
            <h3 style={valueStyle}>${stats.semana} <span style={currencyStyle}>MXN</span></h3>
          </div>
        </div>

        {/* GANANCIAS MES */}
        <div className="stat-card" style={cardStyle}>
          <div style={iconBoxStyle("#f59e0b")}>
            <FaCalendarAlt size={24} />
          </div>
          <div>
            <p style={labelStyle}>Este Mes</p>
            <h3 style={valueStyle}>${stats.mes} <span style={currencyStyle}>MXN</span></h3>
          </div>
        </div>

        {/* RESERVAS DEL DÍA */}
        <div className="stat-card" style={cardStyle}>
          <div style={iconBoxStyle("#ef4444")}>
            <FaParking size={24} />
          </div>
          <div>
            <p style={labelStyle}>Reservas de Hoy</p>
            <h3 style={valueStyle}>{stats.reservasHoy} <span style={currencyStyle}>autos</span></h3>
          </div>
        </div>

      </div>
    </div>
  );
}

// ESTILOS EN LÍNEA PARA MANTENER EL COMPONENTE LIMPIO
const cardStyle = {
  background: "rgba(15, 23, 42, 0.7)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "16px",
  padding: "20px",
  display: "flex",
  alignItems: "center",
  gap: "16px",
  transition: "transform 0.3s ease, borderColor 0.3s ease",
  cursor: "default"
};

const iconBoxStyle = (color) => ({
  width: "50px",
  height: "50px",
  borderRadius: "12px",
  background: `${color}20`, // 20% de opacidad
  border: `1px solid ${color}50`,
  color: color,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxShadow: `0 0 15px ${color}30`
});

const labelStyle = {
  color: "#94a3b8",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  margin: "0 0 4px"
};

const valueStyle = {
  color: "#fff",
  fontSize: "24px",
  fontWeight: "800",
  margin: 0,
  display: "flex",
  alignItems: "baseline",
  gap: "4px"
};

const currencyStyle = {
  fontSize: "12px",
  color: "#00f2fe",
  fontWeight: "600"
};