import React from "react";
import { Toaster } from "react-hot-toast";
import PerfilVehiculo from "./pages/PerfilVehiculo";
import "./styles/theme.css";

export default function App() {
  // 🔑 UID del usuario logueado (aquí lo tomas de tu auth real)
  const uid = "ODqAZy6BQOO18FDZcV55Ur1Ahhn1";

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: "#121212", color: "#FFF", border: "1px solid #333" }
        }}
      />
      <PerfilVehiculo uid={uid} />
    </>
  );
}