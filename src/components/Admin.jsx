import { collection, doc, getDocs, updateDoc, deleteDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { 
  FaBan, FaCheckCircle, FaUsers, FaExclamationTriangle, 
  FaTrash, FaExclamationCircle 
} from "react-icons/fa";
import { db } from "../firebase/config.js";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  // Estados para el modal de confirmación de borrado
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersList);
      } catch (error) {
        console.error("Error al cargar usuarios:", error);
        showToast("Error al cargar la lista de usuarios", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { rol: newRole });
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, rol: newRole } : u))
      );
      showToast("Rol actualizado correctamente");
    } catch (error) {
      console.error("Error al actualizar rol:", error);
      showToast("No se pudo actualizar el rol. Revisa los permisos.", "error");
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { estado: newStatus });
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, estado: newStatus } : u))
      );
      showToast(`Usuario ${newStatus ? "activado" : "bloqueado"} correctamente`);
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      showToast("No se pudo actualizar el estado. Revisa los permisos.", "error");
    }
  };

  // --- LÓGICA DE ELIMINACIÓN INDIVIDUAL ---
  const handleEliminarClick = (id, correo) => {
    setConfirmDelete({ id, correo });
  };

  const handleConfirmarEliminar = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    
    try {
      // Eliminar un solo usuario
      await deleteDoc(doc(db, "users", confirmDelete.id));
      setUsers((prev) => prev.filter((u) => u.id !== confirmDelete.id));
      showToast("Usuario eliminado correctamente");
    } catch (error) {
      console.error("Error al eliminar:", error);
      showToast("Error de permisos: No se pudo eliminar de Firestore.", "error");
    } finally {
      setIsDeleting(false);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="admin-container">
      <div className="bg-grid"></div>
      <div className="bg-glow-bottom"></div>

      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          {toast.type === "error" ? <FaExclamationTriangle /> : <FaCheckCircle />}
          {toast.msg}
        </div>
      )}

      <div className="admin-content">
        <div className="admin-header">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div className="header-icon-box">
              <FaUsers />
            </div>
            <div>
              <h2>Gestión de Usuarios</h2>
              <p className="admin-subtitle">Administra roles y accesos del sistema en tiempo real</p>
            </div>
          </div>
        </div>
        
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario / Correo</th>
                <th>Rol de Acceso</th>
                <th>Estado Actual</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="empty-state">
                    <span className="spinner"></span> Sincronizando usuarios...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">
                    No hay usuarios registrados en la base de datos.
                  </td>
                </tr>
              ) : (
                users.map((user, index) => {
                  const estaActivo = user.estado === true;

                  return (
                    <tr 
                      key={user.id} 
                      className="animated-row"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <td data-label="Usuario">
                        <div className="user-email">
                          <span className="email-dot"></span>
                          {user.correo || user.email || "Sin correo"}
                        </div>
                      </td>
                      <td data-label="Rol">
                        <select
                          className="role-select"
                          value={user.rol || "usuario"}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        >
                          <option value="usuario">👤 Usuario</option>
                          <option value="admin">🛡️ Administrador</option>
                        </select>
                      </td>
                      <td data-label="Estado">
                        <span className={`status-badge ${estaActivo ? "active" : "blocked"}`}>
                          {estaActivo ? <FaCheckCircle /> : <FaBan />}
                          {estaActivo ? "Activo" : "Bloqueado"}
                        </span>
                      </td>
                      <td data-label="Acciones">
                        <div className="action-buttons-group">
                          <button
                            className={`action-btn ${estaActivo ? "btn-danger" : "btn-success"}`}
                            onClick={() => handleStatusToggle(user.id, estaActivo)}
                          >
                            {estaActivo ? "Bloquear" : "Activar"}
                          </button>
                          <button
                            className="action-btn btn-delete"
                            onClick={() => handleEliminarClick(user.id, user.correo || user.email || "Sin correo")}
                            title="Eliminar usuario"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN DE BORRADO */}
      {confirmDelete && (
        <div className="confirm-overlay" onClick={(e) => {
          if (e.target.className === "confirm-overlay") setConfirmDelete(null);
        }}>
          <div className="confirm-box">
            <div className="confirm-icon">
              <FaExclamationCircle />
            </div>
            <h3>¿Eliminar usuario?</h3>
            <p>
              Estás a punto de borrar a <strong>"{confirmDelete.correo}"</strong> de la base de datos.<br/>
              Esta acción no se puede deshacer.
            </p>
            <div className="confirm-actions">
              <button onClick={() => setConfirmDelete(null)} className="btn-cancel-confirm" disabled={isDeleting}>
                Cancelar
              </button>
              <button onClick={handleConfirmarEliminar} className="btn-delete-confirm" disabled={isDeleting}>
                {isDeleting ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-container {
          position: relative;
          width: 100%;
          min-height: 100vh;
          padding: 40px 20px;
          overflow: hidden;
          background-color: #050b14;
          font-family: 'Outfit', sans-serif;
          box-sizing: border-box;
        }

        .bg-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(0, 242, 254, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 242, 254, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          z-index: 0;
        }

        .bg-glow-bottom {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 300px;
          background: radial-gradient(ellipse at bottom, rgba(0, 242, 254, 0.15) 0%, transparent 70%);
          z-index: 0;
          pointer-events: none;
        }

        .admin-content {
          position: relative;
          z-index: 1;
          max-width: 1100px;
          margin: 0 auto;
        }

        .admin-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 35px;
          animation: fadeIn 0.4s ease;
        }

        .header-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 55px;
          height: 55px;
          background: rgba(0, 242, 254, 0.1);
          border: 1px solid rgba(0, 242, 254, 0.4);
          border-radius: 14px;
          color: #00f2fe;
          font-size: 24px;
          box-shadow: 0 0 20px rgba(0, 242, 254, 0.2);
        }

        .admin-header h2 {
          color: #ffffff;
          font-size: 28px;
          margin: 0;
          font-weight: 800;
          letter-spacing: 0.5px;
        }

        .admin-subtitle {
          color: #94a3b8;
          margin: 4px 0 0;
          font-size: 14px;
        }

        .table-container {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(0, 242, 254, 0.15);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 242, 254, 0.02);
          animation: fadeIn 0.6s ease;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        th {
          background: rgba(3, 7, 18, 0.5);
          color: #00f2fe;
          padding: 18px 24px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          font-weight: 700;
          border-bottom: 1px solid rgba(0, 242, 254, 0.15);
        }

        td {
          padding: 16px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          color: #e2e8f0;
          font-size: 15px;
          vertical-align: middle;
        }

        .animated-row {
          animation: slideInRow 0.4s ease forwards;
          opacity: 0;
          transition: background 0.2s ease;
        }

        .animated-row:hover {
          background: rgba(0, 242, 254, 0.03);
        }

        .user-email {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 500;
          color: #f8fafc;
        }

        .email-dot {
          width: 8px;
          height: 8px;
          background: #00f2fe;
          border-radius: 50%;
          box-shadow: 0 0 8px #00f2fe;
          flex-shrink: 0;
        }

        .role-select {
          background: rgba(0, 0, 0, 0.3);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          outline: none;
          font-family: inherit;
          font-size: 14px;
          transition: all 0.2s ease;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2300f2fe%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
          background-repeat: no-repeat;
          background-position: right 10px top 50%;
          background-size: 10px auto;
          padding-right: 30px;
        }

        .role-select:hover, .role-select:focus {
          border-color: rgba(0, 242, 254, 0.5);
          box-shadow: 0 0 10px rgba(0, 242, 254, 0.1);
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
        }

        .status-badge.active {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .status-badge.blocked {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .action-buttons-group {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .action-btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid transparent;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-success {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.3);
        }

        .btn-success:hover {
          background: #10b981;
          color: #050b14;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
        }

        .btn-danger {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .btn-danger:hover {
          background: #ef4444;
          color: #ffffff;
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
        }

        .btn-delete {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
          padding: 8px 12px;
        }

        .btn-delete:hover {
          background: #ef4444;
          color: #ffffff;
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
        }

        .empty-state {
          text-align: center;
          padding: 40px !important;
          color: #94a3b8;
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0, 242, 254, 0.3);
          border-top-color: #00f2fe;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }

        .admin-toast {
          position: fixed;
          bottom: 30px;
          right: 30px;
          padding: 14px 24px;
          border-radius: 12px;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          z-index: 3000;
          font-weight: 600;
          font-size: 14px;
          animation: slideInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .admin-toast.success { background: linear-gradient(135deg, #10b981, #059669); }
        .admin-toast.error { background: linear-gradient(135deg, #ef4444, #dc2626); }

        .confirm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(5, 11, 20, 0.85);
          backdrop-filter: blur(5px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2500;
          padding: 20px;
        }

        .confirm-box {
          background: #0f172a;
          border-radius: 20px;
          width: 100%;
          max-width: 400px;
          padding: 30px;
          border: 1px solid rgba(239, 68, 68, 0.3);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(239, 68, 68, 0.1);
          text-align: center;
          animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .confirm-icon {
          width: 60px;
          height: 60px;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin: 0 auto 20px;
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
        }

        .confirm-box h3 {
          margin: 0 0 10px 0;
          color: #f8fafc;
          font-size: 20px;
        }

        .confirm-box p {
          margin: 0 0 25px 0;
          color: #94a3b8;
          font-size: 14px;
          line-height: 1.5;
        }

        .confirm-box p strong { color: #f8fafc; }

        .confirm-actions {
          display: flex;
          gap: 12px;
        }

        .confirm-actions button {
          flex: 1;
          padding: 12px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-cancel-confirm {
          background: #334155;
          color: #e2e8f0;
        }

        .btn-cancel-confirm:hover {
          background: #475569;
        }

        .btn-delete-confirm {
          background: #ef4444;
          color: #fff;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
        }

        .btn-delete-confirm:hover {
          background: #dc2626;
          box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
        }

        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes popIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRow {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .admin-container { padding: 20px 15px; }
          .admin-header { flex-direction: column; text-align: center; gap: 10px; }
          .admin-header h2 { font-size: 22px; }
          
          .admin-table thead { display: none; }

          .admin-table, .admin-table tbody, .admin-table tr, .admin-table td {
            display: block;
            width: 100%;
          }

          .admin-table tr {
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(0, 242, 254, 0.2);
            border-radius: 12px;
            margin-bottom: 16px;
            padding: 16px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            position: relative;
          }

          .admin-table td {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px dashed rgba(255, 255, 255, 0.05);
            text-align: right;
            font-size: 14px;
          }

          .admin-table td:last-child { border-bottom: none; }

          .admin-table td::before {
            content: attr(data-label);
            font-weight: 700;
            color: #00f2fe;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-right: 15px;
            text-align: left;
          }

          .admin-table td[data-label="Usuario"] {
            display: block;
            text-align: left;
            font-size: 16px;
            border-bottom: 2px solid rgba(0, 242, 254, 0.2);
            padding-top: 0;
            margin-bottom: 10px;
          }
          .admin-table td[data-label="Usuario"]::before { display: none; }
          
          .user-email { font-size: 16px; font-weight: 700; color: #fff; }

          .role-select { width: 100%; max-width: 180px; }
          
          .action-buttons-group {
            width: 100%;
            justify-content: flex-end;
          }
          .action-btn {
            flex: 1;
            max-width: 120px;
            padding: 10px;
          }
          .btn-delete {
            flex: 0;
            min-width: 45px;
          }
          
          .admin-toast { bottom: 20px; right: 20px; left: 20px; justify-content: center; }
          .confirm-actions { flex-direction: column-reverse; }
        }
      `}</style>
    </div>
  );
}