import { useEffect, useState } from "react";
import { db } from "../firebase/config.js";
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { 
  FaEdit, FaTrash, FaTimes, FaSave, FaBuilding, 
  FaSpinner, FaExclamationTriangle, FaCheckCircle, FaExclamationCircle
} from "react-icons/fa";
import "../styles/VerEstacionamientos.css"; 

export default function CrudEstacionamiento() {
  const [estacionamientos, setEstacionamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Estados para el Modal de Edición
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // NUEVO: Estado para el Modal de Confirmación de Borrado
  const [confirmDelete, setConfirmDelete] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const cargarEstacionamientos = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "estacionamientos"));
      const lista = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEstacionamientos(lista);
    } catch (error) {
      console.error("Error al cargar:", error);
      showToast("Error al cargar los estacionamientos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarEstacionamientos(); }, []);

  // NUEVO: Abre el modalito bonito en vez de window.confirm
  const handleEliminarClick = (id, nombre) => {
    setConfirmDelete({ id, nombre });
  };

  // NUEVO: Ejecuta la eliminación real
  const handleConfirmarEliminar = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, "estacionamientos", confirmDelete.id));
      setEstacionamientos(estacionamientos.filter(e => e.id !== confirmDelete.id));
      showToast("Estacionamiento eliminado correctamente");
    } catch (error) {
      showToast("Error al eliminar el estacionamiento", "error");
    } finally {
      setConfirmDelete(null); // Cierra el modal
    }
  };

  const handleAbrirEditar = (estacionamiento) => {
    setEditando({ ...estacionamiento });
    setModalAbierto(true);
  };

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const docRef = doc(db, "estacionamientos", editando.id);
      const { id, ...datosActualizados } = editando;
      datosActualizados.capacidad = Number(datosActualizados.capacidad);

      await updateDoc(docRef, datosActualizados);
      setEstacionamientos(estacionamientos.map(e => e.id === id ? { ...datosActualizados, id } : e));
      setModalAbierto(false);
      showToast("Estacionamiento actualizado correctamente");
    } catch (error) {
      showToast("Error al actualizar los datos", "error");
    } finally {
      setGuardando(false);
    }
  };

  const handleChangeEdicion = (e) => {
    setEditando({ ...editando, [e.target.name]: e.target.value });
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "50px", color: "#00f2fe" }}>
      <FaSpinner className="spin" size={40} />
    </div>
  );

  return (
    <div className="crud-page">
      
      {/* TOAST DE NOTIFICACIÓN */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === "error" ? <FaExclamationTriangle /> : <FaCheckCircle />}
          {toast.msg}
        </div>
      )}

      <div className="crud-container">
        <div className="crud-header">
          <h2><FaBuilding /> Gestión de Estacionamientos</h2>
          <p>Administra las sedes registradas en el sistema</p>
        </div>

        <div className="tabla-responsive">
          <table className="tabla-admin">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Dirección</th>
                <th>Ciudad</th>
                <th>Capacidad</th>
                <th>Horario</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {estacionamientos.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                    No hay estacionamientos registrados.
                  </td>
                </tr>
              ) : (
                estacionamientos.map((est) => (
                  <tr key={est.id}>
                    <td data-label="Nombre"><strong>{est.nombre}</strong></td>
                    <td data-label="Dirección">{est.direccion}</td>
                    <td data-label="Ciudad">{est.ciudad}</td>
                    <td data-label="Capacidad">{est.capacidad} cajones</td>
                    <td data-label="Horario">{est.hora_apertura} - {est.hora_cierre}</td>
                    <td data-label="Acciones">
                      <div className="acciones-celda">
                        <button onClick={() => handleAbrirEditar(est)} className="btn-accion btn-editar" title="Editar">
                          <FaEdit />
                        </button>
                        {/* AQUI LLAMAMOS A LA NUEVA FUNCIÓN */}
                        <button onClick={() => handleEliminarClick(est.id, est.nombre)} className="btn-accion btn-eliminar" title="Eliminar">
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================
          MODAL DE CONFIRMACIÓN DE BORRADO
          ========================================= */}
      {confirmDelete && (
        <div className="confirm-overlay" onClick={(e) => {
          if (e.target.className === "confirm-overlay") setConfirmDelete(null);
        }}>
          <div className="confirm-box">
            <div className="confirm-icon">
              <FaExclamationCircle />
            </div>
            <h3>¿Eliminar estacionamiento?</h3>
            <p>
              Estás a punto de borrar <strong>"{confirmDelete.nombre}"</strong>.<br/>
              Esta acción no se puede deshacer.
            </p>
            <div className="confirm-actions">
              <button onClick={() => setConfirmDelete(null)} className="btn-cancel-confirm">
                Cancelar
              </button>
              <button onClick={handleConfirmarEliminar} className="btn-delete-confirm">
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN (Se queda igual) */}
      {modalAbierto && editando && (
        <div className="modal-overlay" onClick={(e) => { if (e.target.className === "modal-overlay") setModalAbierto(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3><FaEdit /> Editar Estacionamiento</h3>
              <button onClick={() => setModalAbierto(false)} className="btn-cerrar"><FaTimes /></button>
            </div>

            <form onSubmit={handleGuardarEdicion}>
              <div className="form-group">
                <label>Nombre</label>
                <input className="form-input" name="nombre" value={editando.nombre} onChange={handleChangeEdicion} required />
              </div>
              <div className="form-group">
                <label>Dirección</label>
                <input className="form-input" name="direccion" value={editando.direccion} onChange={handleChangeEdicion} required />
              </div>
              <div className="form-group">
                <label>Ciudad</label>
                <input className="form-input" name="ciudad" value={editando.ciudad} onChange={handleChangeEdicion} required />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label>Apertura</label>
                  <input className="form-input" type="time" name="hora_apertura" value={editando.hora_apertura} onChange={handleChangeEdicion} required />
                </div>
                <div className="form-group">
                  <label>Cierre</label>
                  <input className="form-input" type="time" name="hora_cierre" value={editando.hora_cierre} onChange={handleChangeEdicion} required />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label>Capacidad (Cajones)</label>
                  <input className="form-input" type="number" name="capacidad" value={editando.capacidad} onChange={handleChangeEdicion} required />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input className="form-input" name="telefono" value={editando.telefono} onChange={handleChangeEdicion} required />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setModalAbierto(false)} className="btn-cancelar">Cancelar</button>
                <button type="submit" disabled={guardando} className="btn-guardar">
                  {guardando ? <FaSpinner className="spin" /> : <FaSave />}
                  {guardando ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}