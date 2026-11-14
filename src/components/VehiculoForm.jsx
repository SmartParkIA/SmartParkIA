import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth"; // <-- Agregado para obtener el usuario
import { auth } from "../firebase/config.js";      // <-- Agregado para obtener el usuario
import { FaCar, FaHashtag, FaIdCard, FaSave, FaTag, FaCheckCircle, FaExclamationCircle, FaEdit, FaCamera } from "react-icons/fa";
import { getVehiculos, saveVehiculo } from "../services/userService";
import "../styles/forms.css";

const CAMPOS = [
  { icon: <FaIdCard />, label: "Placa",  name: "placa",  placeholder: "ABC-123" },
  { icon: <FaTag />,    label: "Marca",  name: "marca",  placeholder: "Toyota" },
  { icon: <FaHashtag />,label: "Modelo", name: "modelo", placeholder: "Corolla 2020" },
];

export default function VehiculoForm() { // <-- Quitamos la prop { uid }
  const [uid, setUid] = useState(null);  // <-- Agregamos el estado local para el uid
  const [vehiculos, setVehiculos] = useState([]);
  const [form, setForm] = useState({ placa: "", marca: "", modelo: "" });
  const [imagenBase64, setImagenBase64] = useState(""); 
  const [editandoId, setEditandoId] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const MAX_VEHICULOS = 3;

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ESTO ES LO NUEVO: Obtiene el usuario logueado automáticamente
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUid(user.uid);
    });
    return () => unsub();
  }, []);

  const cargarVehiculos = async () => {
    if (!uid) return;
    try {
      const data = await getVehiculos(uid);
      setVehiculos(data);
    } catch (error) {
      console.error("Error al cargar vehículos", error);
    }
  };

  useEffect(() => {
    cargarVehiculos();
  }, [uid]);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      showToast("La imagen es muy grande (máx. 500 KB).", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagenBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleEditar = (vehiculo) => {
    setForm({
      placa: vehiculo.placa,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo
    });
    setImagenBase64(vehiculo.imagen || ""); 
    setEditandoId(vehiculo.id);
  };

  const limpiarFormulario = () => {
    setForm({ placa: "", marca: "", modelo: "" });
    setImagenBase64(""); 
    setEditandoId(null);
  };

  const guardar = async (e) => {
    e.preventDefault();

    if (!uid) {
      showToast("Espera un momento, cargando usuario...", "error");
      return;
    }

    if (!editandoId && vehiculos.length >= MAX_VEHICULOS) {
      showToast(`Solo puedes registrar hasta ${MAX_VEHICULOS} vehículos.`, "error");
      return;
    }

    const limpio = {
      placa: form.placa.trim().toUpperCase(),
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      imagen: imagenBase64 
    };

    if (!limpio.placa || !limpio.marca || !limpio.modelo) {
      showToast("Completa todos los campos", "error");
      return;
    }

    setLoading(true);
    try {
      await saveVehiculo(uid, limpio, editandoId);
      showToast(editandoId ? "Vehículo actualizado 🚗" : "Vehículo registrado 🚗", "success");
      limpiarFormulario();
      cargarVehiculos(); 
    } catch {
      showToast("Error al guardar el vehículo", "error");
    } finally {
      setLoading(false);
    }
  };

  // Si aún no carga el UID, no mostramos nada para evitar errores
  if (!uid) return <div style={{ color: "#00f2fe", textAlign: "center", padding: 40 }}>Cargando datos...</div>;

  const limiteAlcanzado = vehiculos.length >= MAX_VEHICULOS && !editandoId;

  return (
    <div className="vehiculos-layout" style={{ maxWidth: "1000px", margin: "0 auto" }}>
      
      {/* COLUMNA IZQUIERDA: TARJETAS */}
      <div className="vehiculos-lista">
        <h3 style={{ color: "#fff", margin: "0 0 15px", fontSize: "18px" }}>
          Mis Vehículos ({vehiculos.length}/{MAX_VEHICULOS})
        </h3>
        
        {vehiculos.length === 0 && (
          <div style={{ background: "rgba(15,23,42,0.6)", padding: "20px", borderRadius: "16px", color: "#94a3b8", textAlign: "center", border: "1px dashed rgba(255,255,255,0.1)" }}>
            Aún no tienes vehículos registrados.
          </div>
        )}

        {vehiculos.map((v) => (
          <div key={v.id} className="vehiculo-card">
            <div className="vehiculo-card-img">
              {v.imagen ? (
                <img src={v.imagen} alt={v.marca} />
              ) : (
                <FaCar size={30} color="#00f2fe" />
              )}
            </div>

            <div className="vehiculo-info">
              <span className="vehiculo-placa">{v.placa}</span>
              <h4>{v.marca}</h4>
              <p>{v.modelo}</p>
            </div>
            <button onClick={() => handleEditar(v)} className="btn-edit" title="Editar">
              <FaEdit />
            </button>
          </div>
        ))}
      </div>

      {/* COLUMNA DERECHA: FORMULARIO */}
      <form onSubmit={guardar} className="form-card">
        <header className="form-header">
          <div className="form-icon-box">
            <FaCar size={26} />
          </div>
          <div>
            <h2>{editandoId ? "Editar Vehículo" : "Registrar Vehículo"}</h2>
            <p>{limiteAlcanzado ? "Has alcanzado el límite." : "Ingresa los datos de tu auto."}</p>
          </div>
        </header>

        <div className="form-group" style={{ alignItems: "center", marginBottom: "20px" }}>
          <div className="image-upload-wrapper">
            {imagenBase64 ? (
              <img src={imagenBase64} alt="Vista previa" className="image-preview" />
            ) : (
              <div className="image-placeholder">
                <FaCamera size={30} color="#94a3b8" />
                <span>Subir foto (Opcional)</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="image-input"
              disabled={limiteAlcanzado}
            />
          </div>
        </div>

        <div className="form-fields">
          {CAMPOS.map((c) => (
            <div className="form-group" key={c.name}>
              <label className="form-label">{c.icon} {c.label}</label>
              <input
                name={c.name}
                value={form[c.name]}
                onChange={handleChange}
                placeholder={c.placeholder}
                className="form-input"
                disabled={limiteAlcanzado}
              />
            </div>
          ))}
        </div>

        <div className="form-actions">
          {editandoId && (
            <button type="button" onClick={limpiarFormulario} className="btn-secondary">
              Cancelar
            </button>
          )}
          
          <button 
            type="submit" 
            disabled={loading || limiteAlcanzado} 
            className="btn-primary"
            style={{ width: editandoId ? "auto" : "100%" }}
          >
            <FaSave /> {loading ? "Guardando..." : editandoId ? "Actualizar" : "Guardar Vehículo"}
          </button>
        </div>

        {toast && (
          <div className={`toast-alert ${toast.type}`}>
            {toast.type === "success" ? <FaCheckCircle size={20} /> : <FaExclamationCircle size={20} />}
            <span>{toast.msg}</span>
          </div>
        )}
      </form>

    </div>
  );
}