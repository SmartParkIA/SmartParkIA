
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";

import RegistrarEstacionamiento from "./pages/RegistrarEstacionamiento";
import Disponibilidad from "./pages/Disponibilidad";

function App() {
  return (
    <BrowserRouter>
      <nav className="navegacion-smartpark">
        <Link to="/">Registrar estacionamiento</Link>
        <Link to="/disponibilidad">Disponibilidad en tiempo real</Link>
      </nav>

      <Routes>
        <Route path="/" element={<RegistrarEstacionamiento />} />
        <Route path="/disponibilidad" element={<Disponibilidad />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
