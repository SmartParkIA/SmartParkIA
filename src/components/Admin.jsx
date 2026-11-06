import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase/config.js";
// Importa tus estilos globales si no los tienes en index.css
// import "../styles/perfil.css"; 

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Cargar usuarios de Firestore al entrar a la página
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
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // 2. Cambiar el rol del usuario
  const handleRoleChange = async (userId, newRole) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { rol: newRole });
      
      // Actualizar el estado local para que la tabla se refresque
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, rol: newRole } : u))
      );
    } catch (error) {
      console.error("Error al actualizar rol:", error);
      alert("No se pudo actualizar el rol.");
    }
  };

  // 3. Bloquear o Activar usuario
  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const userRef = doc(db, "users", userId);
      
      await updateDoc(userRef, { estado: newStatus });
      
      // Actualizar el estado local
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, estado: newStatus } : u))
      );
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      alert("No se pudo actualizar el estado.");
    }
  };

  return (
    <div className="admin-container">
      
      {/* El Dashboard ya no está aquí, ahora vive en Finanzas.jsx */}

      <h2>Gestión de Usuarios</h2>
      
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Correo Electrónico</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", color: "var(--text-secondary)" }}>
                  Cargando usuarios...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", color: "var(--text-secondary)" }}>
                  No hay usuarios registrados.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                // Verificamos si está activo (asumiendo que en Firebase guardas un booleano)
                const estaActivo = user.estado === true;

                return (
                  <tr key={user.id}>
                    <td>{user.correo || user.email || "Sin correo"}</td>
                    <td>
                      <select
                        className="role-select"
                        value={user.rol || "usuario"}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      >
                        <option value="usuario">Usuario</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: "bold",
                          color: estaActivo ? "#10b981" : "#ef4444",
                        }}
                      >
                        {estaActivo ? "Activo" : "Bloqueado"}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`action-btn ${estaActivo ? "btn-danger" : "btn-success"}`}
                        onClick={() => handleStatusToggle(user.id, estaActivo)}
                      >
                        {estaActivo ? "Bloquear" : "Activar"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ESTILOS ESPECÍFICOS PARA LA TABLA DE ADMIN */}
      <style>{`
        .admin-container {
          width: 100%;
          animation: fadeIn 0.4s ease;
        }

        .admin-container h2 {
          color: #e2e8f0;
          font-size: 26px;
          margin: 0 0 24px;
        }

        .table-container {
          background: #1e293b;
          border: 1px solid rgba(0, 242, 254, 0.15);
          border-radius: 16px;
          overflow-x: auto;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          min-width: 600px;
        }

        th {
          background-color: rgba(0, 0, 0, 0.2);
          color: #00f2fe;
          padding: 16px 20px;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        td {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          color: #e2e8f0;
          font-size: 15px;
        }

        tr:last-child td {
          border-bottom: none;
        }

        tr:hover {
          background-color: rgba(0, 242, 254, 0.04);
        }

        select {
          background: #0f172a;
          color: #ffffff;
          border: 1px solid #334155;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          outline: none;
          font-family: 'Outfit', sans-serif;
        }

        select:focus {
          border-color: #00f2fe;
        }

        .action-btn {
          padding: 8px 14px;
          border-radius: 6px;
          border: none;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: 0.2s;
          font-family: 'Outfit', sans-serif;
        }

        .btn-success {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .btn-success:hover {
          background: #10b981;
          color: #ffffff;
        }

        .btn-danger {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .btn-danger:hover {
          background: #ef4444;
          color: #ffffff;
        }
      `}</style>
    </div>
  );
}