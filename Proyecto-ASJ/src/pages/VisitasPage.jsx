// src/pages/VisitasPage.jsx
import { useEffect, useMemo, useState } from "react";
import logo from "../assets/asj.png";
import "../App.css";

const API = "http://localhost:8081/api/ordenes";

function norm(s) {
  return (s ?? "").toString().toLowerCase().trim();
}

function addDays(isoDate, days) {
  if (!isoDate) return "";
  // isoDate esperado: "YYYY-MM-DD"
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function daysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return null;
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function formatCLP(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function VisitasPage() {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(false);

  // filtros
  const [q, setQ] = useState(""); // cliente/tienda
  const [zonaFiltro, setZonaFiltro] = useState("ALL");
  const [modo, setModo] = useState("PROXIMAS"); // PROXIMAS | VENCIDAS | TODAS
  const [sortBy, setSortBy] = useState("PROX_VISITA"); // PROX_VISITA | FECHA_TRABAJO
  const [sortDir, setSortDir] = useState("asc"); // asc/desc

  // para días restantes
  const hoyIso = useMemo(() => {
    const d = new Date();
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }, []);

  const cargar = () => {
    setLoading(true);
    fetch(API)
      .then((r) => r.json())
      .then((data) => setOrdenes(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Error cargando ordenes", e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  // armamos una “visita” por orden:
  // fechaTrabajo = fechaLlegada (la fecha del doc / trabajo según tu uso)
  // proximaVisita = fechaTrabajo + 150 días
  const visitas = useMemo(() => {
    return ordenes
      .map((o) => {
        const fechaTrabajo = o.fechaLlegada || ""; // <- si después agregas fechaRealTrabajo, la pones aquí
        const proximaVisita = addDays(fechaTrabajo, 150);
        const diasRestantes = proximaVisita ? daysBetween(hoyIso, proximaVisita) : null;

        return {
          id: o.id,
          numeroOrden: o.numeroOrden,
          cliente: o.cliente ?? "",
          tienda: o.tienda ?? "",
          zona: o.zona ?? "",
          transpaletas: o.cantidadTranspaletas ?? null,
          montoClp: o.montoClp ?? null,
          fechaTrabajo,
          proximaVisita,
          diasRestantes, // puede ser negativo si está vencida
          estado: o.estado ?? "",
        };
      })
      .filter((v) => v.fechaTrabajo); // si no hay fecha, no podemos calcular
  }, [ordenes, hoyIso]);

  const zonasDisponibles = useMemo(() => {
    const s = new Set();
    for (const v of visitas) if (v.zona) s.add(v.zona);
    return Array.from(s);
  }, [visitas]);

  const qn = norm(q);

  const visitasFiltradas = useMemo(() => {
    return visitas
      .filter((v) => {
        if (qn) {
          const hit = norm(v.cliente).includes(qn) || norm(v.tienda).includes(qn) || norm(v.numeroOrden).includes(qn);
          if (!hit) return false;
        }
        if (zonaFiltro !== "ALL" && norm(v.zona) !== norm(zonaFiltro)) return false;

        if (modo === "VENCIDAS") {
          return typeof v.diasRestantes === "number" && v.diasRestantes < 0;
        }
        if (modo === "PROXIMAS") {
          return typeof v.diasRestantes === "number" && v.diasRestantes >= 0;
        }
        return true; // TODAS
      })
      .sort((a, b) => {
        const aKey = sortBy === "FECHA_TRABAJO" ? a.fechaTrabajo : a.proximaVisita;
        const bKey = sortBy === "FECHA_TRABAJO" ? b.fechaTrabajo : b.proximaVisita;
        const diff = Date.parse(aKey) - Date.parse(bKey);
        return sortDir === "asc" ? diff : -diff;
      });
  }, [visitas, qn, zonaFiltro, modo, sortBy, sortDir]);

  const resumen = useMemo(() => {
    const total = visitasFiltradas.length;
    const vencidas = visitasFiltradas.filter((v) => typeof v.diasRestantes === "number" && v.diasRestantes < 0).length;
    const trans = visitasFiltradas.reduce((acc, v) => acc + (Number(v.transpaletas) || 0), 0);
    const dinero = visitasFiltradas.reduce((acc, v) => acc + (Number(v.montoClp) || 0), 0);
    return { total, vencidas, trans, dinero };
  }, [visitasFiltradas]);

  return (
    <div className="page">
      <div className="header">
        <div className="brand">
          <div className="brandMark">
            <img className="brandLogo" src={logo} alt="ASJ Group" />
          </div>
          <div className="brandTitle">
            <h1>VISITAS</h1>
            <span>Planificación • próxima visita = fecha trabajo + 150 días</span>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="tabs">
          <button className={`btn btnTab ${modo === "PROXIMAS" ? "btnPrimary" : ""}`} onClick={() => setModo("PROXIMAS")}>
            Próximas
          </button>
          <button className={`btn btnTab ${modo === "VENCIDAS" ? "btnPrimary" : ""}`} onClick={() => setModo("VENCIDAS")}>
            Vencidas
          </button>
          <button className={`btn btnTab ${modo === "TODAS" ? "btnPrimary" : ""}`} onClick={() => setModo("TODAS")}>
            Todas
          </button>
        </div>

        <div className="actions">
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por Cliente / Tienda / OC"
          />

          <select className="select" value={zonaFiltro} onChange={(e) => setZonaFiltro(e.target.value)}>
            <option value="ALL">Todas las zonas</option>
            {zonasDisponibles.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>

          <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="PROX_VISITA">Ordenar por próxima visita</option>
            <option value="FECHA_TRABAJO">Ordenar por fecha de trabajo</option>
          </select>

          <button className="btn" onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
            {sortDir === "asc" ? "↑" : "↓"}
          </button>

          <button className="btn" onClick={cargar}>
            Refrescar
          </button>
        </div>
      </div>

      <div className="sectionTitle">
        Hoy: <b>{hoyIso}</b> • Total: <b>{resumen.total}</b> • Vencidas: <b>{resumen.vencidas}</b> • Transpaletas:{" "}
        <b>{resumen.trans}</b> • Dinero: <b>{formatCLP(resumen.dinero)}</b>
      </div>

      {loading ? (
        <p className="muted">Cargando...</p>
      ) : visitasFiltradas.length === 0 ? (
        <p className="muted">No hay visitas para este filtro.</p>
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Tienda</th>
                <th>Zona</th>
                <th>Transpaletas</th>
                <th>Fecha trabajo</th>
                <th>Próxima visita (+150)</th>
                <th>Días restantes</th>
                <th>OC</th>
                <th>Estado</th>
              </tr>
            </thead>

            <tbody>
              {visitasFiltradas.map((v) => (
                <tr key={v.id}>
                  <td>{v.cliente || "-"}</td>
                  <td>{v.tienda || "-"}</td>
                  <td>{v.zona || "-"}</td>
                  <td>{v.transpaletas ?? "-"}</td>
                  <td>{v.fechaTrabajo}</td>
                  <td>{v.proximaVisita || "-"}</td>
                  <td>
                    {typeof v.diasRestantes === "number" ? (
                      v.diasRestantes < 0 ? (
                        <span className="badgeBad">Vencida ({v.diasRestantes})</span>
                      ) : (
                        <span className="badgeOk">{v.diasRestantes} días</span>
                      )
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{v.numeroOrden || "-"}</td>
                  <td>{v.estado || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
