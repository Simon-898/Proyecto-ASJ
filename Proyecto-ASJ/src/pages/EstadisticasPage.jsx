import { useEffect, useMemo, useState } from "react";
import "../App.css";

const API = "http://localhost:8081/api/ordenes";

function formatCLP(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function monthKeyFromISO(iso) {
  if (!iso) return "";
  // iso esperado: "YYYY-MM-DD"
  return String(iso).slice(0, 7); // "YYYY-MM"
}

function currentMonthKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

export default function EstadisticasPage() {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(false);

  const [mes, setMes] = useState(currentMonthKey()); // YYYY-MM

  const cargar = () => {
    setLoading(true);
    fetch(API)
      .then((r) => r.json())
      .then((data) => setOrdenes(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Error cargando stats", e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const mesesDisponibles = useMemo(() => {
    const set = new Set();
    for (const o of ordenes) {
      const k = monthKeyFromISO(o.fechaLlegada);
      if (k) set.add(k);
    }
    return Array.from(set).sort().reverse();
  }, [ordenes]);

  const ordenesMes = useMemo(() => {
    return ordenes.filter((o) => monthKeyFromISO(o.fechaLlegada) === mes);
  }, [ordenes, mes]);

  const totales = useMemo(() => {
    let count = 0;
    let trans = 0;
    let monto = 0;

    for (const o of ordenesMes) {
      count += 1;
      trans += safeNum(o.cantidadTranspaletas);
      monto += safeNum(o.montoClp);
    }

    return { count, trans, monto };
  }, [ordenesMes]);

  const porCliente = useMemo(() => {
    const map = new Map();
    for (const o of ordenesMes) {
      const k = o.cliente || "Sin cliente";
      if (!map.has(k)) map.set(k, { cliente: k, ordenes: 0, transpaletas: 0, monto: 0 });
      const row = map.get(k);
      row.ordenes += 1;
      row.transpaletas += safeNum(o.cantidadTranspaletas);
      row.monto += safeNum(o.montoClp);
    }
    return Array.from(map.values()).sort((a, b) => b.monto - a.monto);
  }, [ordenesMes]);

  const porZona = useMemo(() => {
    const map = new Map();
    for (const o of ordenesMes) {
      const k = o.zona || "Sin zona";
      if (!map.has(k)) map.set(k, { zona: k, ordenes: 0, transpaletas: 0, monto: 0 });
      const row = map.get(k);
      row.ordenes += 1;
      row.transpaletas += safeNum(o.cantidadTranspaletas);
      row.monto += safeNum(o.montoClp);
    }
    return Array.from(map.values()).sort((a, b) => b.monto - a.monto);
  }, [ordenesMes]);

  return (
    <div className="page">
      <div className="sectionTitle">Estadísticas</div>

      <div className="statsTopRow">
        <div className="statsPicker">
          <label className="label">Mes</label>
          <select className="select" value={mes} onChange={(e) => setMes(e.target.value)}>
            {mesesDisponibles.length === 0 ? (
              <option value={mes}>{mes}</option>
            ) : (
              mesesDisponibles.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="statsPicker">
          <button className="btn btnPrimary" onClick={cargar} disabled={loading}>
            {loading ? "Cargando..." : "Actualizar datos"}
          </button>
        </div>
      </div>

      <div className="statsGrid">
        <div className="statsCard">
          <div className="statsLabel">Órdenes (mes)</div>
          <div className="statsValue">{totales.count}</div>
        </div>

        <div className="statsCard">
          <div className="statsLabel">Transpaletas (mes)</div>
          <div className="statsValue">{totales.trans}</div>
        </div>

        <div className="statsCard">
          <div className="statsLabel">Monto total (mes)</div>
          <div className="statsValue">{formatCLP(totales.monto)}</div>
        </div>

        <div className="statsCard">
          <div className="statsLabel">Mes seleccionado</div>
          <div className="statsValue">{mes}</div>
        </div>
      </div>

      <div className="sectionTitle">Por Cliente</div>
      {porCliente.length === 0 ? (
        <p className="muted">No hay datos para este mes.</p>
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Órdenes</th>
                <th>Transpaletas</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {porCliente.map((r) => (
                <tr key={r.cliente}>
                  <td>{r.cliente}</td>
                  <td>{r.ordenes}</td>
                  <td>{r.transpaletas}</td>
                  <td>{formatCLP(r.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="sectionTitle">Por Zona</div>
      {porZona.length === 0 ? (
        <p className="muted">No hay datos para este mes.</p>
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Zona</th>
                <th>Órdenes</th>
                <th>Transpaletas</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {porZona.map((r) => (
                <tr key={r.zona}>
                  <td>{r.zona}</td>
                  <td>{r.ordenes}</td>
                  <td>{r.transpaletas}</td>
                  <td>{formatCLP(r.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
