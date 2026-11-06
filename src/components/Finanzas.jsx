import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config.js";
import { 
  FaCalendarDay, FaCalendarWeek, FaCalendarAlt, 
  FaParking, FaSpinner, FaChartLine, FaChartPie, FaChartArea 
} from "react-icons/fa";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend,
  AreaChart, Area 
} from "recharts";

const COLORS = ['#10b981', '#00f2fe', '#f59e0b', '#ef4444'];

export default function Finanzas() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ hoy: 0, semana: 0, mes: 0, reservasHoy: 0 });
  const [datosGraficaBarras, setDatosGraficaBarras] = useState([]);
  const [datosGraficaPastel, setDatosGraficaPastel] = useState([]);
  const [datosGraficaMes, setDatosGraficaMes] = useState([]);

  useEffect(() => {
    const cargarEstadisticas = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "reservas"));
        
        let gananciasHoy = 0;
        let gananciasSemana = 0;
        let gananciasMes = 0;
        let reservasDelDia = 0;

        let activas = 0, canceladas = 0, pasadas = 0;
        const gananciasPorDia = {}; 
        const gananciasPorDiaMes = {}; 

        const hoy = new Date();
        const offset = hoy.getTimezoneOffset();
        // Fecha de hoy en formato YYYY-MM-DD (para comparar con fechaCreacion)
        const fechaHoyStr = new Date(hoy.getTime() - (offset * 60 * 1000)).toISOString().split("T")[0];
        const mesActualStr = fechaHoyStr.substring(0, 7);
        
        const diaSemana = hoy.getDay() === 0 ? 7 : hoy.getDay();
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - diaSemana + 1);
        inicioSemana.setHours(0, 0, 0, 0);

        // Inicializar los últimos 7 días
        const ultimos7Dias = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(hoy);
          d.setDate(d.getDate() - i);
          const str = new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split("T")[0];
          ultimos7Dias.push(str);
          gananciasPorDia[str] = 0;
        }

        // Inicializar todos los días del mes
        const diasEnMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= diasEnMes; i++) {
          const diaStr = String(i).padStart(2, '0');
          const fechaStr = `${mesActualStr}-${diaStr}`;
          gananciasPorDiaMes[fechaStr] = 0;
        }

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const estado = (data.estado || "").toLowerCase();
          
          // 1. FALLBACK DE COSTO: Si no tiene costoTotal, calculamos 50 x horas
          let costo = Number(data.costoTotal);
          if (isNaN(costo) || costo === 0) {
            const horas = parseInt(data.duracion, 10) || 0;
            costo = horas * 50;
          }

          // 2. USAR FECHA DE CREACIÓN PARA LAS GANANCIAS
          // Extraemos el "YYYY-MM-DD" de fechaCreacion (o usamos la de reserva si no hay)
          const fechaPagoStr = data.fechaCreacion ? data.fechaCreacion.split("T")[0] : data.fecha;
          
          if (estado === "cancelada") {
            canceladas++;
          } else {
            // Sumar ganancias basadas en el día del PAGO
            if (fechaPagoStr === fechaHoyStr) { gananciasHoy += costo; reservasDelDia++; }
            
            const datePagoObj = new Date(`${fechaPagoStr}T00:00:00`);
            if (datePagoObj >= inicioSemana) { gananciasSemana += costo; }
            if (fechaPagoStr && fechaPagoStr.startsWith(mesActualStr)) { gananciasMes += costo; }
            
            // Clasificar la reserva por su fecha de uso
            const dateUsoObj = new Date(`${data.fecha}T${data.horario || "00:00"}`);
            const fin = new Date(dateUsoObj.getTime() + (parseInt(data.duracion) || 0) * 60 * 60 * 1000);
            if (fin < new Date()) pasadas++;
            else activas++;

            // Sumar a gráficas
            if (gananciasPorDia[fechaPagoStr] !== undefined) {
              gananciasPorDia[fechaPagoStr] += costo;
            }
            if (gananciasPorDiaMes[fechaPagoStr] !== undefined) {
              gananciasPorDiaMes[fechaPagoStr] += costo;
            }
          }
        });

        setStats({ hoy: gananciasHoy, semana: gananciasSemana, mes: gananciasMes, reservasHoy: reservasDelDia });

        setDatosGraficaBarras(ultimos7Dias.map(fecha => ({
          dia: fecha.split("-")[2] + "/" + fecha.split("-")[1],
          ganancias: gananciasPorDia[fecha]
        })));

        const datosMes = Object.keys(gananciasPorDiaMes).map(fecha => {
          const diaNum = parseInt(fecha.split("-")[2], 10);
          return {
            dia: (diaNum === 1 || diaNum % 5 === 0) ? fecha.split("-")[2] : "", 
            ganancias: gananciasPorDiaMes[fecha]
          };
        });
        setDatosGraficaMes(datosMes);

        setDatosGraficaPastel([
          { name: "Activas", value: activas },
          { name: "Completadas", value: pasadas },
          { name: "Canceladas", value: canceladas }
        ]);

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
        <p>Calculando finanzas...</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", animation: "fadeIn 0.4s ease" }}>
      <h2 style={{ color: "#fff", fontSize: "24px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
        <FaChartLine color="#00f2fe" /> Panel de Finanzas
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" }}>
        <div style={cardStyle}><div style={iconBoxStyle("#10b981")}><FaCalendarDay size={24} /></div><div><p style={labelStyle}>Ganancias de Hoy</p><h3 style={valueStyle}>${stats.hoy} <span style={currencyStyle}>MXN</span></h3></div></div>
        <div style={cardStyle}><div style={iconBoxStyle("#00f2fe")}><FaCalendarWeek size={24} /></div><div><p style={labelStyle}>Esta Semana</p><h3 style={valueStyle}>${stats.semana} <span style={currencyStyle}>MXN</span></h3></div></div>
        <div style={cardStyle}><div style={iconBoxStyle("#f59e0b")}><FaCalendarAlt size={24} /></div><div><p style={labelStyle}>Este Mes</p><h3 style={valueStyle}>${stats.mes} <span style={currencyStyle}>MXN</span></h3></div></div>
        <div style={cardStyle}><div style={iconBoxStyle("#ef4444")}><FaParking size={24} /></div><div><p style={labelStyle}>Reservas de Hoy</p><h3 style={valueStyle}>{stats.reservasHoy} <span style={currencyStyle}>autos</span></h3></div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px", marginBottom: "20px" }}>
        <div style={chartCardStyle}>
          <h3 style={chartTitleStyle}><FaChartLine color="#00f2fe" /> Ganancias (Últimos 7 días)</h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={datosGraficaBarras} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="dia" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#00f2fe', color: '#fff' }} />
                <Bar dataKey="ganancias" fill="#00f2fe" radius={[5, 5, 0, 0]}>
                  {datosGraficaBarras.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.ganancias > 0 ? "#00f2fe" : "#334155"} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={chartCardStyle}>
          <h3 style={chartTitleStyle}><FaChartPie color="#10b981" /> Estado de las Reservas</h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={datosGraficaPastel} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                  {datosGraficaPastel.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={chartCardStyle}>
        <h3 style={chartTitleStyle}><FaChartArea color="#10b981" /> Ganancias del Mes Actual.</h3>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <AreaChart data={datosGraficaMes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGanancias" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="dia" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
              <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#10b981', color: '#fff' }} />
              <Area type="monotone" dataKey="ganancias" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorGanancias)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const cardStyle = { background: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(10px)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "16px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" };
const iconBoxStyle = (color) => ({ width: "50px", height: "50px", borderRadius: "12px", background: `${color}20`, border: `1px solid ${color}50`, color: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 0 15px ${color}30` });
const labelStyle = { color: "#94a3b8", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px" };
const valueStyle = { color: "#fff", fontSize: "24px", fontWeight: "800", margin: 0, display: "flex", alignItems: "baseline", gap: "4px" };
const currencyStyle = { fontSize: "12px", color: "#00f2fe", fontWeight: "600" };
const chartCardStyle = { background: "#1e293b", border: "1px solid rgba(0, 242, 254, 0.15)", borderRadius: "16px", padding: "20px", boxShadow: "0 10px 25px rgba(0,0,0,0.4)" };
const chartTitleStyle = { color: "#e2e8f0", fontSize: "16px", fontWeight: "700", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" };