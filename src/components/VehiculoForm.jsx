import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config.js";
import {
  FaCar,
  FaHashtag,
  FaIdCard,
  FaSave,
  FaTag,
  FaCheckCircle,
  FaExclamationCircle,
  FaEdit,
  FaCamera,
  FaExclamationTriangle,
  FaTrash,
} from "react-icons/fa";
import { getVehiculos, saveVehiculo } from "../services/userService";
import "../styles/forms.css";

const MARCAS_VALIDAS = [
  "Nissan",
  "Chevrolet",
  "Volkswagen",
  "Toyota",
  "Ford",
  "Honda",
  "Kia",
  "Mazda",
  "Hyundai",
  "SEAT",
  "Renault",
  "Peugeot",
  "BMW",
  "Mercedes-Benz",
  "Audi",
  "Jeep",
  "Suzuki",
  "Mitsubishi",
  "Fiat",
  "Volvo",
  "Subaru",
  "Tesla",
  "RAM",
  "GMC",
  "Cadillac",
  "Porsche",
];

const PALABRAS_PROHIBIDAS = [
  "perro",
  "gato",
  "animal",
  "caca",
  "raton",
  "pajaro",
  "vaca",
  "caballo",
  "tonto",
  "idiota",
  "test",
  "prueba",
  "asdf",
  "qwerty",
  "pene",
  "puta",
  "puto",
  "mierda",
  "joto",
  "culero",
  "verga",
  "pito",
];

const TIPOS_IMAGEN_PERMITIDOS = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_IMAGEN_BYTES = 500 * 1024;
const MAX_VEHICULOS = 3;

const CAMPOS = [
  { icon: <FaIdCard />, label: "Placa", name: "placa", placeholder: "ABC-123-A" },
  { icon: <FaTag />, label: "Marca", name: "marca", placeholder: "Ej. Toyota", list: "listaMarcas" },
  { icon: <FaHashtag />, label: "Modelo", name: "modelo", placeholder: "Ej. Corolla 2020" },
];

function normalizarTexto(texto) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function resolverMarcaCanonica(valor) {
  const limpio = normalizarTexto(valor).replace(/[-_]+/g, " ");
  if (!limpio) return null;
  return (
    MARCAS_VALIDAS.find(
      (m) => normalizarTexto(m).replace(/[-_]+/g, " ") === limpio
    ) || null
  );
}

// =====================================================================
// 🇲🇽 VALIDACIÓN Y LIMPIEZA DE PLACA MEXICANA
// =====================================================================
export function limpiarEntradaPlaca(valor) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ñÑ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 9);
}

export function validarPlacaMexicana(valor) {
  const placa = (valor || "").trim();

  if (!placa) {
    return "La placa es obligatoria.";
  }

  if (/\s/.test(valor)) {
    return "La placa no debe contener espacios.";
  }

  if (/[ñÑáéíóúÁÉÍÓÚüÜ]/.test(valor)) {
    return "No se permiten ñ ni acentos en la placa.";
  }

  if (/[^A-Z0-9-]/.test(placa)) {
    return "La placa debe estar en MAYÚSCULAS y solo usar letras A-Z, números 0-9 y guiones.";
  }

  if (/--/.test(placa) || /^-|-$/.test(placa)) {
    return "Revisa la posición de los guiones en la placa.";
  }

  // Formatos aceptados:
  // - ABC-123-A (Nuevo)
  // - ABC-1234  (Edomex viejo)
  // - 123-ABC   (CDMX viejo)
  // - ABC123A / ABC1234 / 123ABC (Sin guiones)
  const regexPlacaMexicana =
    /^(?:[A-Z]{3}-\d{3}-[A-Z]|[A-Z]{3}-\d{4}|\d{3}-[A-Z]{3}|[A-Z]{3}\d{3}[A-Z]|[A-Z]{3}\d{4}|\d{3}[A-Z]{3})$/;

  if (!regexPlacaMexicana.test(placa)) {
    return "Formato inválido. Usa ej. ABC-123-A, ABC-1234, 123-ABC o sin guiones (ABC123A / ABC1234).";
  }

  return "";
}

export default function VehiculoForm() {
  const [uid, setUid] = useState(null);
  const [vehiculos, setVehiculos] = useState([]);
  const [form, setForm] = useState({ placa: "", marca: "", modelo: "" });
  const [imagenBase64, setImagenBase64] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const toastTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  const showToast = (msg, type) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

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
      setVehiculos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al cargar vehículos", error);
      showToast("No se pudieron cargar tus vehículos.", "error");
    }
  };

  useEffect(() => {
    cargarVehiculos();
  }, [uid]);

  const validateField = (name, value) => {
    let error = "";
    const trimmed = value.trim();
    const valorNormalizado = normalizarTexto(trimmed);

    if (name === "placa") {
      const placaError = validarPlacaMexicana(value);
      if (placaError) {
        error = placaError;
      } else {
        const placaUpper = trimmed.toUpperCase();
        const duplicada = vehiculos.some(
          (v) =>
            v.id !== editandoId &&
            (v.placa || "").trim().toUpperCase() === placaUpper
        );
        if (duplicada) {
          error = "Esta placa ya está registrada en tu lista.";
        }
      }
    }

    if (name === "marca") {
      if (!trimmed) {
        error = "La marca es obligatoria.";
      } else if (!resolverMarcaCanonica(trimmed)) {
        error = "Selecciona o escribe una marca válida (Ej. Toyota, Nissan).";
      }
    }

    if (name === "modelo") {
      if (!trimmed) {
        error = "El modelo es obligatorio.";
      } else if (trimmed.length < 2) {
        error = "El modelo debe tener al menos 2 caracteres.";
      } else if (trimmed.length > 25) {
        error = "El modelo es demasiado largo (máx. 25 caracteres).";
      } else if (!/^[a-zA-Z0-9\s\-]+$/.test(trimmed)) {
        error = "Solo se permiten letras, números, espacios y guiones.";
      } else if (/^[-]|[-]$/.test(trimmed)) {
        error = "El modelo no puede empezar ni terminar con guion.";
      } else if (/^\d+$/.test(trimmed)) {
        error = "El modelo debe incluir al menos una letra (Ej. Corolla 2020).";
      } else if (/(.)\1{3,}/.test(trimmed)) {
        error = "Ingresa un modelo válido (no repitas el mismo carácter).";
      } else if (PALABRAS_PROHIBIDAS.some((p) => valorNormalizado.includes(p))) {
        error = "Ingresa un modelo de vehículo válido.";
      } else {
        const anioMax = new Date().getFullYear() + 1;
        const anios = trimmed.match(/\b(19\d{2}|20\d{2})\b/g);
        if (anios) {
          const anioInvalido = anios.some((a) => {
            const num = Number(a);
            return num < 1970 || num > anioMax;
          });
          if (anioInvalido) {
            error = `Revisa el año del modelo (debe estar entre 1970 y ${anioMax}).`;
          }
        }
      }
    }

    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "placa") {
      newValue = limpiarEntradaPlaca(value);
    } else if (name === "marca") {
      newValue = value.replace(/[^a-zA-ZÀ-ÿ\s-]/g, "");
    } else if (name === "modelo") {
      newValue = value.replace(/[^a-zA-Z0-9\s-]/g, "");
    }

    setForm((f) => ({ ...f, [name]: newValue }));

    if (touched[name] || errors[name]) {
      const error = validateField(name, newValue);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!TIPOS_IMAGEN_PERMITIDOS.includes(file.type)) {
      showToast("Solo se permiten imágenes JPG, PNG o WEBP.", "error");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGEN_BYTES) {
      showToast("La imagen es muy grande (máx. 500 KB).", "error");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setImagenBase64(reader.result);
      }
    };
    reader.onerror = () => {
      showToast("No se pudo leer la imagen seleccionada.", "error");
    };
    reader.readAsDataURL(file);
  };

  const quitarImagen = () => {
    setImagenBase64("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEditar = (vehiculo) => {
    setForm({
      placa: vehiculo.placa || "",
      marca: vehiculo.marca || "",
      modelo: vehiculo.modelo || "",
    });
    setImagenBase64(vehiculo.imagen || "");
    setEditandoId(vehiculo.id);
    setErrors({});
    setTouched({});
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const limpiarFormulario = () => {
    setForm({ placa: "", marca: "", modelo: "" });
    setImagenBase64("");
    setEditandoId(null);
    setErrors({});
    setTouched({});
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

    setTouched({ placa: true, marca: true, modelo: true });

    const newErrors = {};
    ["placa", "marca", "modelo"].forEach((field) => {
      const err = validateField(field, form[field]);
      if (err) newErrors[field] = err;
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showToast("Revisa los campos marcados en rojo.", "error");
      return;
    }

    const marcaCanonica = resolverMarcaCanonica(form.marca) || form.marca.trim();

    const limpio = {
      placa: form.placa.trim().toUpperCase(),
      marca: marcaCanonica,
      modelo: form.modelo.trim().replace(/\s+/g, " "),
      imagen: imagenBase64,
    };

    setLoading(true);
    try {
      await saveVehiculo(uid, limpio, editandoId);
      showToast(
        editandoId ? "Vehículo actualizado 🚗" : "Vehículo registrado 🚗",
        "success"
      );
      limpiarFormulario();
      await cargarVehiculos();
    } catch {
      showToast("Error al guardar el vehículo", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!uid) {
    return (
      <div className="vehiculos-page">
        <div className="bg-grid"></div>
        <div className="loading-text">Sincronizando datos del usuario...</div>
      </div>
    );
  }

  const limiteAlcanzado = vehiculos.length >= MAX_VEHICULOS && !editandoId;

  return (
    <div className="vehiculos-page">
      <div className="bg-grid"></div>
      <div className="bg-glow"></div>

      <div className="vehiculos-content">
        <div className="page-header">
          <div className="header-icon-box">
            <FaCar />
          </div>
          <div>
            <h2>Mis Vehículos</h2>
            <p className="subtitle">Administra tu flota personal de transporte</p>
          </div>
        </div>

        <div className="vehiculos-layout">
          {/* COLUMNA IZQUIERDA */}
          <div className="lista-container">
            <h3 className="section-title">
              Registrados{" "}
              <span className="count-badge">
                {vehiculos.length}/{MAX_VEHICULOS}
              </span>
            </h3>

            <div className="cards-list">
              {vehiculos.length === 0 && (
                <div className="empty-card">
                  <FaCar size={40} color="rgba(0,242,254,0.3)" />
                  <p>Aún no tienes vehículos registrados.</p>
                </div>
              )}

              {vehiculos.map((v) => (
                <div
                  key={v.id}
                  className={`vehiculo-card ${editandoId === v.id ? "editing" : ""}`}
                >
                  <div className="vehiculo-card-img">
                    {v.imagen ? (
                      <img src={v.imagen} alt={`${v.marca} ${v.modelo}`} />
                    ) : (
                      <FaCar size={30} color="#00f2fe" />
                    )}
                  </div>

                  <div className="vehiculo-info">
                    <span className="vehiculo-placa">{v.placa}</span>
                    <h4>{v.marca}</h4>
                    <p>{v.modelo}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEditar(v)}
                    className="btn-edit"
                    title="Editar"
                  >
                    <FaEdit />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* COLUMNA DERECHA: FORMULARIO */}
          <form onSubmit={guardar} className="form-card" noValidate>
            <div className="form-header">
              <div className="form-icon-box">
                <FaCar size={22} />
              </div>
              <div>
                <h2>{editandoId ? "Editar Vehículo" : "Nuevo Vehículo"}</h2>
                <p>
                  {limiteAlcanzado
                    ? "Límite de vehículos alcanzado."
                    : "Ingresa los datos del automóvil."}
                </p>
              </div>
            </div>

            <div className="image-upload-group">
              <div
                className={`image-upload-wrapper ${
                  limiteAlcanzado ? "disabled" : ""
                }`}
              >
                {imagenBase64 ? (
                  <img
                    src={imagenBase64}
                    alt="Vista previa"
                    className="image-preview"
                  />
                ) : (
                  <div className="image-placeholder">
                    <FaCamera size={28} />
                    <span>Subir Foto (JPG, PNG, WEBP · máx. 500 KB)</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="image-input"
                  disabled={limiteAlcanzado || loading}
                />
              </div>

              {imagenBase64 && !limiteAlcanzado && (
                <button
                  type="button"
                  onClick={quitarImagen}
                  className="btn-remove-img"
                  disabled={loading}
                >
                  <FaTrash size={12} /> Quitar foto
                </button>
              )}
            </div>

            <div className="form-fields">
              {CAMPOS.map((c) => (
                <div className="form-group" key={c.name}>
                  <label className="form-label">
                    {c.icon} {c.label}
                  </label>
                  <input
                    name={c.name}
                    value={form[c.name]}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={c.placeholder}
                    className={`form-input ${errors[c.name] ? "input-error" : ""}`}
                    disabled={limiteAlcanzado || loading}
                    maxLength={c.name === "placa" ? 9 : 25}
                    list={c.list}
                    autoComplete="off"
                    aria-invalid={Boolean(errors[c.name])}
                  />
                  {c.name === "marca" && (
                    <datalist id="listaMarcas">
                      {MARCAS_VALIDAS.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  )}

                  {errors[c.name] && (
                    <span className="error-text">
                      <FaExclamationTriangle /> {errors[c.name]}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="form-actions">
              {editandoId && (
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Cancelar
                </button>
              )}

              <button
                type="submit"
                disabled={loading || limiteAlcanzado}
                className="btn-primary"
                style={{ flex: editandoId ? "1" : "1 1 100%" }}
              >
                <FaSave />{" "}
                {loading
                  ? "Guardando..."
                  : editandoId
                  ? "Actualizar"
                  : "Guardar Vehículo"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {toast && (
        <div className={`toast-alert ${toast.type}`} role="status">
          {toast.type === "success" ? (
            <FaCheckCircle size={20} />
          ) : (
            <FaExclamationCircle size={20} />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes errorSlide { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

        .vehiculos-page {
          position: relative;
          width: 100%;
          min-height: 100vh;
          padding: 40px 20px;
          background-color: #050b14;
          font-family: 'Outfit', sans-serif;
          overflow: hidden;
          box-sizing: border-box;
        }

        .bg-grid {
          position: absolute; inset: 0;
          background-image: 
            linear-gradient(rgba(0, 242, 254, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 242, 254, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          z-index: 0;
        }
        .bg-glow {
          position: absolute; bottom: 0; left: 0; right: 0; height: 400px;
          background: radial-gradient(ellipse at bottom, rgba(0, 242, 254, 0.1) 0%, transparent 70%);
          z-index: 0; pointer-events: none;
        }

        .vehiculos-content {
          position: relative; z-index: 1; max-width: 1100px; margin: 0 auto;
          animation: fadeIn 0.5s ease;
        }

        .page-header {
          display: flex; align-items: center; gap: 16px; margin-bottom: 35px;
        }
        .header-icon-box {
          display: flex; align-items: center; justify-content: center;
          width: 55px; height: 55px;
          background: rgba(0, 242, 254, 0.1); border: 1px solid rgba(0, 242, 254, 0.4);
          border-radius: 14px; color: #00f2fe; font-size: 24px;
          box-shadow: 0 0 20px rgba(0, 242, 254, 0.2);
        }
        .page-header h2 { color: #fff; font-size: 28px; margin: 0; font-weight: 800; }
        .subtitle { color: #94a3b8; margin: 4px 0 0; font-size: 14px; }

        .vehiculos-layout {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 30px;
          align-items: start;
        }

        .section-title {
          color: #fff; font-size: 18px; margin: 0 0 20px;
          display: flex; align-items: center; gap: 10px;
        }
        .count-badge {
          background: rgba(0, 242, 254, 0.1); color: #00f2fe;
          padding: 2px 10px; border-radius: 20px; font-size: 13px;
          border: 1px solid rgba(0, 242, 254, 0.3);
        }
        .cards-list { display: flex; flex-direction: column; gap: 16px; }

        .empty-card {
          background: rgba(15, 23, 42, 0.4); border: 1px dashed rgba(0, 242, 254, 0.2);
          padding: 40px 20px; border-radius: 16px; text-align: center;
          color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 12px;
        }

        .vehiculo-card {
          display: flex; align-items: center; gap: 16px;
          background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px; padding: 16px;
          transition: all 0.3s ease; position: relative;
        }
        .vehiculo-card:hover {
          border-color: rgba(0, 242, 254, 0.3);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), inset 0 0 15px rgba(0, 242, 254, 0.05);
          transform: translateX(5px);
        }
        .vehiculo-card.editing {
          border-color: #00f2fe;
          box-shadow: 0 0 20px rgba(0, 242, 254, 0.2);
        }

        .vehiculo-card-img {
          width: 70px; height: 70px; border-radius: 12px;
          background: rgba(0, 242, 254, 0.05); border: 1px solid rgba(0, 242, 254, 0.2);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; flex-shrink: 0;
        }
        .vehiculo-card-img img { width: 100%; height: 100%; object-fit: cover; }

        .vehiculo-info { flex: 1; }
        .vehiculo-placa {
          display: inline-block; background: rgba(255,255,255,0.1);
          color: #e2e8f0; font-family: monospace; font-size: 12px; font-weight: bold;
          padding: 2px 8px; border-radius: 4px; margin-bottom: 6px; letter-spacing: 1px;
        }
        .vehiculo-info h4 { margin: 0 0 4px; color: #fff; font-size: 16px; }
        .vehiculo-info p { margin: 0; color: #94a3b8; font-size: 13px; }

        .btn-edit {
          background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
          color: #00f2fe; width: 36px; height: 36px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s; flex-shrink: 0;
        }
        .btn-edit:hover { background: #00f2fe; color: #050b14; box-shadow: 0 0 15px rgba(0, 242, 254, 0.4); }

        .form-card {
          background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(24px);
          border: 1px solid rgba(0, 242, 254, 0.15);
          border-radius: 20px; padding: 30px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.6s ease;
        }

        .form-header {
          display: flex; align-items: center; gap: 14px; margin-bottom: 25px;
          padding-bottom: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .form-icon-box {
          width: 45px; height: 45px; border-radius: 12px;
          background: rgba(0, 242, 254, 0.1); border: 1px solid rgba(0, 242, 254, 0.3);
          color: #00f2fe; display: flex; align-items: center; justify-content: center;
          font-size: 20px;
        }
        .form-header h2 { margin: 0; color: #fff; font-size: 20px; font-weight: 700; }
        .form-header p { margin: 2px 0 0; color: #94a3b8; font-size: 13px; }

        .image-upload-group { margin-bottom: 25px; }
        .image-upload-wrapper {
          position: relative; width: 100%; height: 140px;
          border: 2px dashed rgba(0, 242, 254, 0.3); border-radius: 12px;
          background: rgba(3, 7, 18, 0.5); display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.3s; overflow: hidden;
        }
        .image-upload-wrapper:hover:not(.disabled) { border-color: #00f2fe; background: rgba(0, 242, 254, 0.05); }
        .image-upload-wrapper.disabled { opacity: 0.5; cursor: not-allowed; }
        
        .image-placeholder {
          display: flex; flex-direction: column; align-items: center; gap: 8px; color: #94a3b8;
        }
        .image-placeholder span { font-size: 13px; font-weight: 500; text-align: center; padding: 0 12px; }
        
        .image-preview { width: 100%; height: 100%; object-fit: cover; }
        .image-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

        .btn-remove-img {
          margin-top: 8px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #fca5a5;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-family: inherit;
        }
        .btn-remove-img:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.22);
        }

        .form-fields { display: flex; flex-direction: column; gap: 18px; margin-bottom: 30px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-label {
          display: flex; align-items: center; gap: 8px; color: #00f2fe;
          font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .form-input {
          background: rgba(3, 7, 18, 0.5); border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff; padding: 14px 16px; border-radius: 10px;
          font-size: 15px; font-family: inherit; transition: all 0.3s ease; outline: none;
        }
        .form-input:focus { border-color: #00f2fe; box-shadow: 0 0 15px rgba(0, 242, 254, 0.15); background: rgba(3, 7, 18, 0.8); }
        .form-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .form-input::placeholder { color: rgba(148, 163, 184, 0.4); }

        .form-input.input-error {
          border-color: #ef4444 !important;
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.3) !important;
          background: rgba(239, 68, 68, 0.05);
        }
        .form-input.input-error:focus {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2), 0 0 12px rgba(239, 68, 68, 0.4) !important;
        }
        .error-text {
          display: flex; align-items: center; gap: 6px;
          color: #ef4444; font-size: 12px; font-weight: 600;
          margin-top: 4px;
          animation: errorSlide 0.3s ease-out;
        }
        .error-text svg { font-size: 14px; flex-shrink: 0; }

        .form-actions { display: flex; gap: 12px; }
        .btn-primary, .btn-secondary {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 14px 20px; border-radius: 10px; font-weight: 700; font-size: 14px;
          cursor: pointer; transition: all 0.3s ease; font-family: inherit; border: none;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #00f2fe, #0072ff); color: #050b14;
          box-shadow: 0 4px 15px rgba(0, 242, 254, 0.3);
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0, 242, 254, 0.5);
        }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; filter: grayscale(0.5); }

        .btn-secondary {
          background: transparent; color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4);
        }
        .btn-secondary:hover:not(:disabled) { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

        .toast-alert {
          position: fixed; bottom: 24px; right: 24px;
          display: flex; align-items: center; gap: 10px; padding: 14px 24px;
          border-radius: 10px; font-size: 14px; font-weight: 600;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); z-index: 999;
          animation: toastIn 0.35s ease;
        }
        .toast-alert.success { background: #10b981; color: #050b14; }
        .toast-alert.error { background: #ef4444; color: #fff; }

        .loading-text { text-align: center; color: #00f2fe; padding: 40px; position: relative; z-index: 1; }

        @media (max-width: 850px) {
          .vehiculos-layout { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}