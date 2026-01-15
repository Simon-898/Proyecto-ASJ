import { useEffect, useRef, useState } from "react";
import logo from "./assets/asj.png";

const API = "http://localhost:8081/api/ordenes";

const ESTADOS = [
  { key: "OC_RECIBIDA", label: "OC Recibidas" },
  { key: "EJECUTADA", label: "Ejecutadas" },
  { key: "HES_RECIBIDO", label: "HES Recibido" },
  { key: "FACTURADA", label: "Facturadas" },
  { key: "PAGADA", label: "Pagadas" },
];

const SIGUIENTE = {
  OC_RECIBIDA: "EJECUTADA",
  EJECUTADA: "HES_RECIBIDO",
  HES_RECIBIDO: "FACTURADA",
  FACTURADA: "PAGADA",
  PAGADA: null,
};

function formatCLP(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function parseISODateToMs(iso) {
  if (!iso || typeof iso !== "string") return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

function norm(s) {
  return (s ?? "").toString().toLowerCase().trim();
}

function App() {
  const [estado, setEstado] = useState("ALL");
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Selección (para exportar después)
  const [seleccion, setSeleccion] = useState(() => new Set());

  // Buscar solo por OC
  const [q, setQ] = useState("");
  const [sortDir, setSortDir] = useState("asc");

  // Nueva orden desde PDF
  const fileNuevaOcRef = useRef(null);
  const [creando, setCreando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [pdfSeleccionado, setPdfSeleccionado] = useState(null);

  const [form, setForm] = useState({
    numeroOrden: "",
    ot: "",
    fechaLlegada: "",
    montoClp: "",
    cantidadTranspaletas: "",
    observacion: "",
  });

  // Crear manual
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manual, setManual] = useState({
    numeroOrden: "",
    ot: "",
    fechaLlegada: "",
    montoClp: "",
    cantidadTranspaletas: "",
    observacion: "",
  });

  // Editar
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editOrden, setEditOrden] = useState(null);
  const [edit, setEdit] = useState({
    numeroOrden: "",
    ot: "",
    fechaLlegada: "",
    montoClp: "",
    cantidadTranspaletas: "",
    observacion: "",
    hes: "",
    numeroFactura: "",
  });

  const cargar = () => {
    setLoading(true);
    const url = estado === "ALL" ? API : `${API}?estado=${estado}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => setOrdenes(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error cargando órdenes", err))
      .finally(() => setLoading(false));
  };
  const respaldar = async () => {
    try {
      const res = await fetch(`${API}/backup`);
      if (!res.ok) return alert("Error creando respaldo: " + (await res.text()));

      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "backup_ordenes.zip"; // el backend igual manda un nombre con timestamp
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Error descargando respaldo");
    }
  };


  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  const avanzarEstado = async (orden) => {
    const next = SIGUIENTE[orden.estado];
    if (!next) return;

    if (next === "HES_RECIBIDO") {
      const hes = prompt("Ingresa el HES recibido por correo:");
      if (!hes || !hes.trim()) return;

      await fetch(`${API}/${orden.id}/estado?estado=${next}`, { method: "PATCH" });

      await fetch(`${API}/${orden.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numeroOrden: orden.numeroOrden,
          ot: orden.ot,
          fechaLlegada: orden.fechaLlegada,
          montoClp: orden.montoClp,
          estado: next,
          hes: hes.trim(),
          observacion: orden.observacion ?? null,
          cantidadTranspaletas: orden.cantidadTranspaletas ?? null,
          numeroFactura: orden.numeroFactura ?? null,
        }),
      });

      cargar();
      return;
    }

    if (next === "FACTURADA") {
      const nf = prompt("Ingresa el N° de Factura:");
      if (!nf || !nf.trim()) return;

      await fetch(`${API}/${orden.id}/estado?estado=${next}`, { method: "PATCH" });

      await fetch(`${API}/${orden.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numeroOrden: orden.numeroOrden,
          ot: orden.ot,
          fechaLlegada: orden.fechaLlegada,
          montoClp: orden.montoClp,
          estado: next,
          hes: orden.hes ?? null,
          observacion: orden.observacion ?? null,
          cantidadTranspaletas: orden.cantidadTranspaletas ?? null,
          numeroFactura: nf.trim(),
        }),
      });

      cargar();
      return;
    }

    await fetch(`${API}/${orden.id}/estado?estado=${next}`, { method: "PATCH" });
    cargar();
  };

  // ===== NUEVA ORDEN PDF =====
  const abrirSelectorNuevaOc = () => fileNuevaOcRef.current?.click();

  const parsearPdfNuevaOrden = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") return alert("Solo se permite PDF");

    try {
      setCreando(true);
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`${API}/parse-oc-pdf`, { method: "POST", body: fd });
      if (!res.ok) return alert("Error leyendo PDF: " + (await res.text()));

      const data = await res.json();

      setPdfSeleccionado(file);
      setForm({
        numeroOrden: data.numeroOrden ?? "",
        ot: data.ot ?? "",
        fechaLlegada: data.fechaDocumento ?? "",
        montoClp: data.montoNetoClp ?? "",
        cantidadTranspaletas: data.cantidadTranspaletas ?? "",
        observacion: data.observacion ?? "",
      });

      setMostrarForm(true);
    } catch (e) {
      console.error(e);
      alert("Error leyendo PDF");
    } finally {
      setCreando(false);
    }
  };

  const guardarNuevaOrden = async () => {
    if (!form.numeroOrden?.trim()) return alert("Falta N° Orden (OC)");
    if (!form.ot?.trim()) return alert("Falta OT");
    if (!form.fechaLlegada?.trim()) return alert("Falta fecha del documento");
    if (!form.montoClp?.toString().trim()) return alert("Falta monto neto (CLP)");
    if (!pdfSeleccionado) return alert("Falta el PDF");

    try {
      setCreando(true);

      const resCrear = await fetch(`${API}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numeroOrden: form.numeroOrden.trim(),
          ot: form.ot.trim(),
          fechaLlegada: form.fechaLlegada.trim(),
          montoClp: Number(form.montoClp),
          observacion: form.observacion?.trim() || null,
          cantidadTranspaletas:
            form.cantidadTranspaletas === "" ? null : Number(form.cantidadTranspaletas),
        }),
      });

      if (!resCrear.ok) return alert("Error creando orden: " + (await resCrear.text()));
      const ordenCreada = await resCrear.json();

      const fd = new FormData();
      fd.append("file", pdfSeleccionado);

      const resPdf = await fetch(`${API}/${ordenCreada.id}/oc-pdf`, {
        method: "POST",
        body: fd,
      });

      if (!resPdf.ok) {
        alert("La orden se creó, pero falló adjuntar PDF: " + (await resPdf.text()));
      } else {
        alert("Orden creada desde PDF ✅");
      }

      setMostrarForm(false);
      setPdfSeleccionado(null);
      setEstado("OC_RECIBIDA");
      setTimeout(() => cargar(), 150);
    } catch (e) {
      console.error(e);
      alert("Error guardando nueva orden");
    } finally {
      setCreando(false);
    }
  };

  const cerrarForm = () => {
    setMostrarForm(false);
    setPdfSeleccionado(null);
  };

  // ===== NUEVA ORDEN MANUAL =====
  const abrirManual = () => {
    setManual({
      numeroOrden: "",
      ot: "",
      fechaLlegada: "",
      montoClp: "",
      cantidadTranspaletas: "",
      observacion: "",
    });
    setManualOpen(true);
  };

  const guardarManual = async () => {
    if (!manual.numeroOrden?.trim()) return alert("Falta N° Orden (OC)");
    if (!manual.ot?.trim()) return alert("Falta OT");
    if (!manual.fechaLlegada?.trim()) return alert("Falta fecha");
    if (!manual.montoClp?.toString().trim()) return alert("Falta monto neto (CLP)");

    try {
      setManualSaving(true);

      const res = await fetch(`${API}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numeroOrden: manual.numeroOrden.trim(),
          ot: manual.ot.trim(),
          fechaLlegada: manual.fechaLlegada.trim(),
          montoClp: Number(manual.montoClp),
          observacion: manual.observacion?.trim() || null,
          cantidadTranspaletas:
            manual.cantidadTranspaletas === "" ? null : Number(manual.cantidadTranspaletas),
        }),
      });

      if (!res.ok) return alert("Error creando orden: " + (await res.text()));

      alert("Orden creada ✅ (manual)");
      setManualOpen(false);
      setEstado("OC_RECIBIDA");
      setTimeout(() => cargar(), 150);
    } catch (e) {
      console.error(e);
      alert("Error creando orden");
    } finally {
      setManualSaving(false);
    }
  };

  // ===== EDITAR =====
  const abrirEditar = (o) => {
    setEditOrden(o);
    setEdit({
      numeroOrden: o.numeroOrden ?? "",
      ot: o.ot ?? "",
      fechaLlegada: o.fechaLlegada ?? "",
      montoClp: o.montoClp ?? "",
      cantidadTranspaletas: o.cantidadTranspaletas ?? "",
      observacion: o.observacion ?? "",
      hes: o.hes ?? "",
      numeroFactura: o.numeroFactura ?? "",
    });
    setEditOpen(true);
  };

  const guardarEditar = async () => {
    if (!editOrden) return;

    if (!edit.numeroOrden?.toString().trim()) return alert("Falta N° Orden (OC)");
    if (!edit.ot?.toString().trim()) return alert("Falta OT");
    if (!edit.fechaLlegada?.toString().trim()) return alert("Falta fecha");
    if (!edit.montoClp?.toString().trim()) return alert("Falta monto");

    try {
      setEditSaving(true);

      const res = await fetch(`${API}/${editOrden.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numeroOrden: String(edit.numeroOrden).trim(),
          ot: String(edit.ot).trim(),
          fechaLlegada: String(edit.fechaLlegada).trim(),
          montoClp: Number(edit.montoClp),
          estado: editOrden.estado,
          hes: edit.hes?.toString().trim() || null,
          observacion: edit.observacion?.toString().trim() || null,
          cantidadTranspaletas:
            edit.cantidadTranspaletas === "" ? null : Number(edit.cantidadTranspaletas),
          numeroFactura: edit.numeroFactura?.toString().trim() || null,
        }),
      });

      if (!res.ok) return alert("Error guardando: " + (await res.text()));

      setEditOpen(false);
      setEditOrden(null);
      cargar();
      alert("Cambios guardados ✅");
    } catch (e) {
      console.error(e);
      alert("Error guardando cambios");
    } finally {
      setEditSaving(false);
    }
  };

  // ===== ELIMINAR =====
  const eliminarOrden = async (o) => {
    const ok = confirm(`¿Eliminar la orden ${o.numeroOrden}? (no se puede deshacer)`);
    if (!ok) return;

    try {
      const res = await fetch(`${API}/${o.id}`, { method: "DELETE" });
      if (!res.ok) return alert("Error eliminando: " + (await res.text()));

      alert("Orden eliminada 🗑️");
      cargar();
    } catch (e) {
      console.error(e);
      alert("Error eliminando");
    }
  };

  // Mostrar columna factura:
  const mostrarColFactura = estado === "FACTURADA" || estado === "PAGADA" || estado === "ALL";

  const qn = norm(q);
  const ordenesFiltradas = ordenes
    .filter((o) => {
      if (!qn) return true;
      return norm(o.numeroOrden).includes(qn);
    })
    .sort((a, b) => {
      const ams = parseISODateToMs(a.fechaLlegada);
      const bms = parseISODateToMs(b.fechaLlegada);
      const diff = ams - bms;
      return sortDir === "asc" ? diff : -diff;
    });

  // ✅ Helpers selección (sobre lo filtrado/visible)
  const idsFiltrados = ordenesFiltradas.map((o) => o.id);

  const isSelected = (id) => seleccion.has(id);

  const toggleOne = (id) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFilteredSelected =
    idsFiltrados.length > 0 && idsFiltrados.every((id) => seleccion.has(id));

  const toggleAllFiltered = () => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        idsFiltrados.forEach((id) => next.delete(id));
      } else {
        idsFiltrados.forEach((id) => next.add(id));
      }
      return next;
    });
  };
  const exportarSeleccionadasCSV = () => {
    if (!seleccion || seleccion.size === 0) {
      alert("No hay órdenes seleccionadas.");
      return;
    }

    const rows = ordenes
      .filter((o) => seleccion.has(o.id))
      .map((o) => ({
        "N° Orden (OC)": o.numeroOrden ?? "",
        OT: o.ot ?? "",
        "Fecha doc": o.fechaLlegada ?? "",
        "Monto Neto (CLP)": o.montoClp ?? "",
        Transpaletas: o.cantidadTranspaletas ?? "",
        HES: o.hes ?? "",
        "N° Factura": o.numeroFactura ?? "",
        Estado: o.estado ?? "",
        Observacion: (o.observacion ?? "").toString().replaceAll("\n", " ").trim(),
      }));

    // CSV con separador ; (mejor para Excel en español)
    const headers = Object.keys(rows[0]);
    const esc = (v) => {
      const s = (v ?? "").toString();
      // si contiene ; o " o saltos, se encierra en comillas y se duplican comillas
      if (/[;"\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
      return s;
    };

    const csv = [
      headers.join(";"),
      ...rows.map((r) => headers.map((h) => esc(r[h])).join(";")),
    ].join("\r\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const fileName = `ordenes_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )}_${pad(now.getHours())}${pad(now.getMinutes())}.csv`;

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  };


  return (
    <div className="page">
      <div className="header">
        <div className="brand">
          <img className="brandLogo" src={logo} alt="ASJ Group" />
          <div className="brandTitle">
            <h1>ORDENES</h1>
            <span>Gestión local de Órdenes de Compra • ASJ Group</span>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="tabs">
          <button
            onClick={() => setEstado("ALL")}
            className={`btn ${estado === "ALL" ? "btnTabActive btnPrimary" : ""}`}
          >
            Todas
          </button>

          {ESTADOS.map((e) => (
            <button
              key={e.key}
              onClick={() => setEstado(e.key)}
              className={`btn ${estado === e.key ? "btnTabActive btnPrimary" : ""}`}
            >
              {e.label}
            </button>
          ))}
        </div>

        <div className="actions">
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por N° Orden de Compra"
          />
          <button className="btn" onClick={exportarSeleccionadasCSV}>
            Exportar seleccionadas (CSV)
          </button>
          <button className="btn" onClick={respaldar}>
            Respaldar (ZIP)
          </button>



          <button className="btn" onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
            Fecha: {sortDir === "asc" ? "↑" : "↓"}
          </button>

          <button className="btn btnPrimary" onClick={abrirManual}>
            Nueva orden (Manual)
          </button>

          <button className="btn btnPrimary" onClick={abrirSelectorNuevaOc} disabled={creando}>
            {creando ? "Procesando..." : "Nueva orden (PDF)"}
          </button>

          <input
            ref={fileNuevaOcRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              parsearPdfNuevaOrden(file);
            }}
          />

          {/* ✅ contador */}
          <div style={{ color: "rgba(255,255,255,0.75)", fontWeight: 700 }}>
            Seleccionadas: {seleccion.size}
          </div>
        </div>
      </div>

      <div className="sectionTitle">Estado: {estado}</div>

      {loading ? (
        <p>Cargando...</p>
      ) : ordenesFiltradas.length === 0 ? (
        <p>No hay órdenes para este filtro.</p>
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                {/* ✅ checkbox header */}
                <th>
                  <input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFiltered} />
                </th>

                <th>N° Orden (OC)</th>
                <th>OT</th>
                <th>Fecha doc</th>
                <th>Monto Neto</th>
                <th>Transpaletas</th>
                <th>HES</th>
                {mostrarColFactura && <th>N° Factura</th>}
                <th>OC</th>
                <th>Acción</th>
                <th>Editar</th>
                <th>🗑️</th>
              </tr>
            </thead>

            <tbody>
              {ordenesFiltradas.map((o) => (
                <tr key={o.id}>
                  {/* ✅ checkbox fila */}
                  <td>
                    <input type="checkbox" checked={isSelected(o.id)} onChange={() => toggleOne(o.id)} />
                  </td>

                  <td>{o.numeroOrden}</td>
                  <td>{o.ot}</td>
                  <td>{o.fechaLlegada}</td>
                  <td>{formatCLP(o.montoClp)}</td>
                  <td>{o.cantidadTranspaletas ?? "-"}</td>
                  <td>{o.hes ?? "-"}</td>
                  {mostrarColFactura && <td>{o.numeroFactura ?? "-"}</td>}

                  <td>
                    {o.ocPdf ? (
                      <a className="linkBtn" href={`${API}/${o.id}/oc-pdf`} target="_blank" rel="noreferrer">
                        Ver OC
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td>
                    {SIGUIENTE[o.estado] ? (
                      <button className="btn btnSmall" onClick={() => avanzarEstado(o)}>
                        Avanzar → {SIGUIENTE[o.estado]}
                      </button>
                    ) : (
                      <span className="badgeOk">Finalizada ✓</span>
                    )}
                  </td>

                  <td>
                    <button className="btn btnSmall" onClick={() => abrirEditar(o)}>
                      Editar
                    </button>
                  </td>

                  <td>
                    <button className="btn btnSmall btnDanger" onClick={() => eliminarOrden(o)} title="Eliminar">
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL PDF */}
      {mostrarForm && (
        <div className="modalOverlay">
          <div className="modal">
            <div className="modalHeader">
              <h2>Nueva orden desde PDF</h2>
              <button className="btn btnGhost" onClick={cerrarForm}>
                ✕
              </button>
            </div>

            <div className="modalBody">
              <div className="grid">
                <div>
                  <label className="label">N° Orden (OC)</label>
                  <input
                    className="input"
                    value={form.numeroOrden}
                    onChange={(e) => setForm((p) => ({ ...p, numeroOrden: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="label">OT</label>
                  <input className="input" value={form.ot} onChange={(e) => setForm((p) => ({ ...p, ot: e.target.value }))} />
                </div>

                <div>
                  <label className="label">Fecha del documento</label>
                  <input
                    className="input"
                    type="date"
                    value={form.fechaLlegada}
                    onChange={(e) => setForm((p) => ({ ...p, fechaLlegada: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="label">Monto NETO (CLP)</label>
                  <input
                    className="input"
                    type="number"
                    value={form.montoClp}
                    onChange={(e) => setForm((p) => ({ ...p, montoClp: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="label">Transpaletas</label>
                  <input
                    className="input"
                    type="number"
                    value={form.cantidadTranspaletas}
                    onChange={(e) => setForm((p) => ({ ...p, cantidadTranspaletas: e.target.value }))}
                  />
                </div>

                <div className="gridFull">
                  <label className="label">Observación</label>
                  <textarea
                    className="textarea"
                    rows={3}
                    value={form.observacion}
                    onChange={(e) => setForm((p) => ({ ...p, observacion: e.target.value }))}
                  />
                </div>

                <div className="gridFull" style={{ color: "rgba(255,255,255,0.75)" }}>
                  <b>PDF:</b> {pdfSeleccionado?.name}
                </div>
              </div>
            </div>

            <div className="modalFooter">
              <button className="btn" onClick={cerrarForm} disabled={creando}>
                Cancelar
              </button>
              <button className="btn btnPrimary" onClick={guardarNuevaOrden} disabled={creando}>
                {creando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MANUAL */}
      {manualOpen && (
        <div className="modalOverlay">
          <div className="modal">
            <div className="modalHeader">
              <h2>Nueva orden (Manual)</h2>
              <button className="btn btnGhost" onClick={() => setManualOpen(false)}>
                ✕
              </button>
            </div>

            <div className="modalBody">
              <div className="grid">
                <div>
                  <label className="label">N° Orden (OC)</label>
                  <input
                    className="input"
                    value={manual.numeroOrden}
                    onChange={(e) => setManual((p) => ({ ...p, numeroOrden: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="label">OT</label>
                  <input className="input" value={manual.ot} onChange={(e) => setManual((p) => ({ ...p, ot: e.target.value }))} />
                </div>

                <div>
                  <label className="label">Fecha doc</label>
                  <input
                    className="input"
                    type="date"
                    value={manual.fechaLlegada}
                    onChange={(e) => setManual((p) => ({ ...p, fechaLlegada: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="label">Monto NETO (CLP)</label>
                  <input
                    className="input"
                    type="number"
                    value={manual.montoClp}
                    onChange={(e) => setManual((p) => ({ ...p, montoClp: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="label">Transpaletas</label>
                  <input
                    className="input"
                    type="number"
                    value={manual.cantidadTranspaletas}
                    onChange={(e) => setManual((p) => ({ ...p, cantidadTranspaletas: e.target.value }))}
                  />
                </div>

                <div className="gridFull">
                  <label className="label">Observación</label>
                  <textarea
                    className="textarea"
                    rows={3}
                    value={manual.observacion}
                    onChange={(e) => setManual((p) => ({ ...p, observacion: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="modalFooter">
              <button className="btn" onClick={() => setManualOpen(false)} disabled={manualSaving}>
                Cancelar
              </button>
              <button className="btn btnPrimary" onClick={guardarManual} disabled={manualSaving}>
                {manualSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {editOpen && (
        <div className="modalOverlay">
          <div className="modal">
            <div className="modalHeader">
              <h2>Editar orden</h2>
              <button className="btn btnGhost" onClick={() => setEditOpen(false)}>
                ✕
              </button>
            </div>

            <div className="modalBody">
              <div className="grid">
                <div>
                  <label className="label">N° Orden (OC)</label>
                  <input
                    className="input"
                    value={edit.numeroOrden}
                    onChange={(e) => setEdit((p) => ({ ...p, numeroOrden: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="label">OT</label>
                  <input className="input" value={edit.ot} onChange={(e) => setEdit((p) => ({ ...p, ot: e.target.value }))} />
                </div>

                <div>
                  <label className="label">Fecha doc</label>
                  <input
                    className="input"
                    type="date"
                    value={edit.fechaLlegada}
                    onChange={(e) => setEdit((p) => ({ ...p, fechaLlegada: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="label">Monto NETO (CLP)</label>
                  <input
                    className="input"
                    type="number"
                    value={edit.montoClp}
                    onChange={(e) => setEdit((p) => ({ ...p, montoClp: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="label">Transpaletas</label>
                  <input
                    className="input"
                    type="number"
                    value={edit.cantidadTranspaletas}
                    onChange={(e) => setEdit((p) => ({ ...p, cantidadTranspaletas: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="label">HES</label>
                  <input className="input" value={edit.hes} onChange={(e) => setEdit((p) => ({ ...p, hes: e.target.value }))} />
                </div>

                <div>
                  <label className="label">N° Factura</label>
                  <input
                    className="input"
                    value={edit.numeroFactura}
                    onChange={(e) => setEdit((p) => ({ ...p, numeroFactura: e.target.value }))}
                  />
                </div>

                <div className="gridFull">
                  <label className="label">Observación</label>
                  <textarea
                    className="textarea"
                    rows={3}
                    value={edit.observacion}
                    onChange={(e) => setEdit((p) => ({ ...p, observacion: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="modalFooter">
              <button className="btn" onClick={() => setEditOpen(false)} disabled={editSaving}>
                Cancelar
              </button>
              <button className="btn btnPrimary" onClick={guardarEditar} disabled={editSaving}>
                {editSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
