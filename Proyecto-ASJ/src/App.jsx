import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import OrdenesPage from "./pages/OrdenesPage";
import EstadisticasPage from "./pages/EstadisticasPage";
import VisitasPage from "./pages/VisitasPage";
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
        <NavLink className={({ isActive }) => `navBtn ${isActive ? "navBtnActive" : ""}`} to="/visitas">
          Visitas
        </NavLink>
      </div>

      <Routes>
        <Route path="/" element={<OrdenesPage />} />
        <Route path="/estadisticas" element={<EstadisticasPage />} />
        <Route path="/visitas" element={<VisitasPage />} />
      </Routes>
    </BrowserRouter>
  );
}
