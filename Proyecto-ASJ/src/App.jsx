import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import OrdenesPage from "./pages/OrdenesPage";
import EstadisticasPage from "./pages/EstadisticasPage";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <div className="topNav">
        <NavLink className={({ isActive }) => `navBtn ${isActive ? "navBtnActive" : ""}`} to="/">
          Órdenes
        </NavLink>
        <NavLink className={({ isActive }) => `navBtn ${isActive ? "navBtnActive" : ""}`} to="/estadisticas">
          Estadísticas
        </NavLink>
      </div>

      <Routes>
        <Route path="/" element={<OrdenesPage />} />
        <Route path="/estadisticas" element={<EstadisticasPage />} />
      </Routes>
    </BrowserRouter>
  );
}
