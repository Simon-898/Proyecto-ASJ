// src/pages/OrdenesPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import logo from "../assets/asj.png";
import "../App.css";

const API = "http://localhost:8081/api/ordenes";

const ESTADOS = [
  { key: "OC_RECIBIDA", label: "OC Recibidas" },
  { key: "EJECUTADA", label: "Ejecutadas" },
  { key: "HES_RECIBIDO", label: "HES Recibido" },
  { key: "FACTURADA", label: "Facturadas" },
  { key: "PAGADA", label: "Pagadas" },
];


const CLIENTES = ["Tottus", "Sodimac", "TCL", "Simi", "Papa Johns", "Otro"];
const ZONAS = ["Norte", "Centro", "Sur"];

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

const emptyForm = () => ({
  numeroOrden: "",
  ot: "",
  fechaLlegada: "",
  montoClp: "",
  cantidadTranspaletas: "",
  cliente: "",
  clienteOtro: "",
  tienda: "",
  zona: "Centro",
  observacion: "",
});

export default function OrdenesPage() {
  const [estado, setEstado] = useState("ALL");
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Buscar solo por OC
  const [q, setQ] = useState("");
  const [sortDir, setSortDir] = useState("asc");

  // Filtro por zona
  const [zonaFiltro, setZonaFiltro] = useState("ALL");

  // ===== NUEVA ORDEN PDF =====
  const fileNuevaOcRef = useRef(null);
  const [creando, setCreando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [pdfSeleccionado, setPdfSeleccionado] = useState(null);
  const [form, setForm] = useState(emptyForm());

  // ✅ input file para PDF opcional en MANUAL
  const fileManualPdfRef = useRef(null);
  const [manualPdf, setManualPdf] = useState(null);

  // ===== NUEVA ORDEN MANUAL =====
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manual, setManual] = useState(emptyForm());

  // ===== EDITAR =====
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editOrden, setEditOrden] = useState(null);
  const [edit, setEdit] = useState({
    ...emptyForm(),
    hes: "",
    numeroFactura: "",
  });

  // ===== SELECCIÓN =====
  const [seleccion, setSeleccion] = useState(new Set());

  const toggleSeleccion = (id) => {
    setSeleccion((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const seleccionarTodas = (items) => {
    if (items.length === 0) return;
    if (seleccion.size === items.length) {
      setSeleccion(new Set());
    } else {
      setSeleccion(new Set(items.map((o) => o.id)));
    }
  };

  const exportarCSV = (items) => {
    const rows = items
      .filter((o) => seleccion.has(o.id))
      .map((o) => ({
        "N° Orden (OC)": o.numeroOrden,
        OT: o.ot,
        "Fecha doc": o.fechaLlegada,
        "Monto Neto": o.montoClp,
        Transpaletas: o.cantidadTranspaletas ?? "",
        HES: o.hes ?? "",
        Cliente: o.cliente ?? "",
        Tienda: o.tienda ?? "",
        Zona: o.zona ?? "",
        "N° Factura": o.numeroFactura ?? "",
        Estado: o.estado,
        Observación: o.observacion ?? "",
      }));

    if (rows.length === 0) return;

    const headers = Object.keys(rows[0]).join(";");
    const csv = [headers, ...rows.map((r) => Object.values(r).join(";"))].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `ordenes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const respaldarZIP = () => {
    window.open(`${API}/backup`, "_blank");
  };

  const cargar = () => {
    setLoading(true);
    const url = estado === "ALL" ? API : `${API}?estado=${estado}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => setOrdenes(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error cargando órdenes", err))
      .finally(() => setLoading(false));
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
          cliente: orden.cliente ?? null,
          tienda: orden.tienda ?? null,
          zona: orden.zona ?? null,
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
          cliente: orden.cliente ?? null,
          tienda: orden.tienda ?? null,
          zona: orden.zona ?? null,
        }),
      });

      cargar();
      return;
    }

    await fetch(`${API}/${orden.id}/estado?estado=${next}`, { method: "PATCH" });
    cargar();
  };

  // ===== NUEVA ORDEN PDF =====
  const abrirSelectorNuevaOc = () => {
    setPdfSeleccionado(null);
    setForm(emptyForm());
    setMostrarForm(false);
    fileNuevaOcRef.current?.click();
  };

  const parsearPdfNuevaOrden = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") return alert("Solo se permite PDF");

    setPdfSeleccionado(null);
    setForm(emptyForm());
    setMostrarForm(false);

    try {
      setCreando(true);
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`${API}/parse-oc-pdf`, { method: "POST", body: fd });
      if (!res.ok) return alert("Error leyendo PDF: " + (await res.text()));

      const data = await res.json();

      setPdfSeleccionado(file);
      setForm((prev) => ({
        ...prev,
        numeroOrden: data.numeroOrden ?? "",
        ot: data.ot ?? "",
        fechaLlegada: data.fechaDocumento ?? "",
        montoClp: data.montoNetoClp ?? "",
        cantidadTranspaletas: data.cantidadTranspaletas ?? "",
        observacion: data.observacion ?? "",
        cliente: "",
        clienteOtro: "",
        tienda: "",
        zona: "Centro",
      }));

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
    if (!form.cliente?.trim()) return alert("Falta Cliente");
    if (form.cliente === "Otro" && !form.clienteOtro.trim()) return alert("Escribe el nombre del cliente");
    if (!form.tienda?.trim()) return alert("Falta Tienda");
    if (!form.zona?.trim()) return alert("Falta Zona");
    if (!pdfSeleccionado) return alert("Falta el PDF");

    try {
      setCreando(true);

      const clienteFinal = (form.cliente === "Otro" ? form.clienteOtro : form.cliente).trim();

      const resCrear = await fetch(`${API}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numeroOrden: form.numeroOrden.trim(),
          ot: form.ot.trim(),
          fechaLlegada: form.fechaLlegada.trim(),
          montoClp: Number(form.montoClp),
          observacion: form.observacion?.trim() || null,
          cantidadTranspaletas: form.cantidadTranspaletas === "" ? null : Number(form.cantidadTranspaletas),
          cliente: clienteFinal,
          tienda: form.tienda.trim(),
          zona: form.zona.trim(),
        }),
      });

      if (!resCrear.ok) return alert("Error creando orden: " + (await resCrear.text()));
      const ordenCreada = await resCrear.json();

      const fd = new FormData();
      fd.append("file", pdfSeleccionado);

      const resPdf = await fetch(`${API}/${ordenCreada.id}/oc-pdf`, { method: "POST", body: fd });

      if (!resPdf.ok) {
        alert("La orden se creó, pero falló adjuntar PDF: " + (await resPdf.text()));
      } else {
        alert("Orden creada desde PDF ✅");
      }

      setMostrarForm(false);
      setPdfSeleccionado(null);
      setForm(emptyForm());

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
    setForm(emptyForm());
  };

  // ===== NUEVA ORDEN MANUAL =====
  const abrirManual = () => {
    setManual(emptyForm());
    setManualPdf(null);
    setManualOpen(true);
  };

  const guardarManual = async () => {
    if (!manual.numeroOrden?.trim()) return alert("Falta N° Orden (OC)");
    if (!manual.ot?.trim()) return alert("Falta OT");
    if (!manual.fechaLlegada?.trim()) return alert("Falta fecha");
    if (!manual.montoClp?.toString().trim()) return alert("Falta monto neto (CLP)");
    if (!manual.cliente?.trim()) return alert("Falta Cliente");
    if (manual.cliente === "Otro" && !manual.clienteOtro.trim()) return alert("Escribe el nombre del cliente");
    if (!manual.tienda?.trim()) return alert("Falta Tienda");
    if (!manual.zona?.trim()) return alert("Falta Zona");

    try {
      setManualSaving(true);

      const clienteFinal = (manual.cliente === "Otro" ? manual.clienteOtro : manual.cliente).trim();

      const res = await fetch(`${API}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numeroOrden: manual.numeroOrden.trim(),
          ot: manual.ot.trim(),
          fechaLlegada: manual.fechaLlegada.trim(),
          montoClp: Number(manual.montoClp),
          observacion: manual.observacion?.trim() || null,
          cantidadTranspaletas: manual.cantidadTranspaletas === "" ? null : Number(manual.cantidadTranspaletas),
          cliente: clienteFinal,
          tienda: manual.tienda.trim(),
          zona: manual.zona.trim(),
        }),
      });

      if (!res.ok) return alert("Error creando orden: " + (await res.text()));
      const ordenCreada = await res.json();

      // ✅ PDF opcional manual
      if (manualPdf) {
        const fd = new FormData();
        fd.append("file", manualPdf);

        const resPdf = await fetch(`${API}/${ordenCreada.id}/oc-pdf`, { method: "POST", body: fd });
        if (!resPdf.ok) {
          alert("Orden creada ✅ pero falló adjuntar PDF: " + (await resPdf.text()));
        }
      }

      alert("Orden creada ✅ (manual)");
      setManualOpen(false);
      setManual(emptyForm());
      setManualPdf(null);

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

    // ✅ si el cliente NO está en lista, lo cargamos como "Otro" para editarlo
    const isKnown = CLIENTES.includes(o.cliente);
    const clienteEdit = isKnown ? (o.cliente ?? "") : "Otro";
    const clienteOtroEdit = isKnown ? "" : (o.cliente ?? "");

    setEdit({
      ...emptyForm(),
      numeroOrden: o.numeroOrden ?? "",
      ot: o.ot ?? "",
      fechaLlegada: o.fechaLlegada ?? "",
      montoClp: o.montoClp ?? "",
      cantidadTranspaletas: o.cantidadTranspaletas ?? "",
      cliente: clienteEdit,
      clienteOtro: clienteOtroEdit,
      tienda: o.tienda ?? "",
      zona: o.zona ?? "Centro",
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
    if (!edit.cliente?.toString().trim()) return alert("Falta Cliente");
    if (edit.cliente === "Otro" && !edit.clienteOtro.trim()) return alert("Escribe el nombre del cliente");
    if (!edit.tienda?.toString().trim()) return alert("Falta Tienda");
    if (!edit.zona?.toString().trim()) return alert("Falta Zona");

    try {
      setEditSaving(true);

      const clienteFinal = (edit.cliente === "Otro" ? edit.clienteOtro : edit.cliente).trim();

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
          cantidadTranspaletas: edit.cantidadTranspaletas === "" ? null : Number(edit.cantidadTranspaletas),
          numeroFactura: edit.numeroFactura?.toString().trim() || null,
          cliente: clienteFinal || null,
          tienda: edit.tienda?.toString().trim() || null,
          zona: edit.zona?.toString().trim() || null,
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

  const mostrarColFactura = estado === "FACTURADA" || estado === "PAGADA" || estado === "ALL";

  const zonasDisponibles = useMemo(() => {
    const s = new Set();
    for (const o of ordenes) if (o?.zona) s.add(o.zona);
    return Array.from(s);
  }, [ordenes]);

  const qn = norm(q);

  const ordenesFiltradas = ordenes
    .filter((o) => {
      if (qn && !norm(o.numeroOrden).includes(qn)) return false;
      if (zonaFiltro !== "ALL" && norm(o.zona) !== norm(zonaFiltro)) return false;
      return true;
    })
    .sort((a, b) => {
      const ams = parseISODateToMs(a.fechaLlegada);
      const bms = parseISODateToMs(b.fechaLlegada);
      const diff = ams - bms;
      return sortDir === "asc" ? diff : -diff;
    });

  // limpia selección fantasma al cambiar filtros
  useEffect(() => {
    setSeleccion((prev) => {
      const ids = new Set(ordenesFiltradas.map((o) => o.id));
      const n = new Set();
      for (const id of prev) if (ids.has(id)) n.add(id);
      return n;
    });
  }, [estado, zonaFiltro, q, sortDir, ordenes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page">
      <div className="header">
        <div className="brand">
          <div className="brandMark">
            <img className="brandLogo" src={logo} alt="ASJ Group" />
          </div>
          <div className="brandTitle">
            <h1>ÓRDENES</h1>
            <span>Gestión local de Órdenes de Compra • ASJ Group</span>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="tabs">
          <button onClick={() => setEstado("ALL")} className={`btn btnTab ${estado === "ALL" ? "btnPrimary" : ""}`}>
            Todas
          </button>

          {ESTADOS.map((e) => (
            <button key={e.key} onClick={() => setEstado(e.key)} className={`btn btnTab ${estado === e.key ? "btnPrimary" : ""}`}>
              {e.label}
            </button>
          ))}
        </div>

        <div className="actions">
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por N° Orden de Compra" />

          <select className="select" value={zonaFiltro} onChange={(e) => setZonaFiltro(e.target.value)}>
            <option value="ALL">Todas las zonas</option>
            {[...new Set([...ZONAS, ...zonasDisponibles])].map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>

          <button className="btn" onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
            Fecha: {sortDir === "asc" ? "↑" : "↓"}
          </button>

          <button className="btn btnPrimary" onClick={abrirManual}>
            Nueva orden (Manual)
          </button>

          <button className="btn btnPrimary" onClick={abrirSelectorNuevaOc} disabled={creando}>
            {creando ? "Procesando..." : "Nueva orden (PDF)"}
          </button>

          {/* ===== ACCIONES MASIVAS ===== */}
          <div className="bulkActions">
            <span className="muted">Seleccionadas: {seleccion.size}</span>

            <button className="btn" disabled={seleccion.size === 0} onClick={() => exportarCSV(ordenesFiltradas)}>
              Exportar seleccionadas (CSV)
            </button>

            <button className="btn" onClick={respaldarZIP}>
              Respaldar (ZIP)
            </button>
          </div>

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
        </div>
      </div>

      <div className="sectionTitle">Estado: {estado}</div>

      {loading ? (
        <p className="muted">Cargando...</p>
      ) : ordenesFiltradas.length === 0 ? (
        <p className="muted">No hay órdenes para este filtro.</p>
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th className="thIcon">
                  <input
                    type="checkbox"
                    checked={ordenesFiltradas.length > 0 && seleccion.size === ordenesFiltradas.length}
                    onChange={() => seleccionarTodas(ordenesFiltradas)}
                  />
                </th>
                <th>N° Orden (OC)</th>
                <th>OT</th>
                <th>Fecha doc</th>
                <th>Monto Neto</th>
                <th>Transpaletas</th>
                <th>HES</th>
                <th>Cliente</th>
                <th>Tienda</th>
                <th>Zona</th>
                {mostrarColFactura && <th>N° Factura</th>}
                <th>OC</th>
                <th>Acción</th>
                <th>Editar</th>
                <th className="thIcon">🗑️</th>
              </tr>
            </thead>

            <tbody>
              {ordenesFiltradas.map((o) => (
                <tr key={o.id}>
                  <td className="tdIcon">
                    <input type="checkbox" checked={seleccion.has(o.id)} onChange={() => toggleSeleccion(o.id)} />
                  </td>

                  <td>{o.numeroOrden}</td>
                  <td>{o.ot}</td>
                  <td>{o.fechaLlegada}</td>
                  <td>{formatCLP(o.montoClp)}</td>
                  <td>{o.cantidadTranspaletas ?? "-"}</td>
                  <td>{o.hes ?? "-"}</td>
                  <td>{o.cliente ?? "-"}</td>
                  <td>{o.tienda ?? "-"}</td>
                  <td>{o.zona ?? "-"}</td>
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

                  <td className="tdIcon">
                    <button className="iconDangerBtn" onClick={() => eliminarOrden(o)} title="Eliminar">
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= MODAL PDF ================= */}
      {mostrarForm && (
        <div className="modalOverlay" onMouseDown={cerrarForm}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2>Nueva orden desde PDF</h2>
              <button className="iconBtn" onClick={cerrarForm} aria-label="Cerrar">
                ✕
              </button>
            </div>

            <div className="modalBody">
              <div className="grid">
                <div>
                  <label className="label">N° Orden (OC)</label>
                  <input className="input" value={form.numeroOrden} onChange={(e) => setForm((p) => ({ ...p, numeroOrden: e.target.value }))} />
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
                  <input className="input" type="number" value={form.montoClp} onChange={(e) => setForm((p) => ({ ...p, montoClp: e.target.value }))} />
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

                {/* ✅ Cliente con "Otro" editable también en PDF */}
                <div>
                  <label className="label">Cliente</label>
                  <select
                    className="select"
                    value={form.cliente}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((p) => ({ ...p, cliente: v, clienteOtro: v === "Otro" ? p.clienteOtro : "" }));
                    }}
                  >
                    <option value="">(Seleccionar)</option>
                    {CLIENTES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  {form.cliente === "Otro" && (
                    <input
                      className="input"
                      style={{ marginTop: 8 }}
                      placeholder="Escribe el cliente..."
                      value={form.clienteOtro}
                      onChange={(e) => setForm((p) => ({ ...p, clienteOtro: e.target.value }))}
                    />
                  )}
                </div>

                <div>
                  <label className="label">Tienda</label>
                  <input className="input" value={form.tienda} onChange={(e) => setForm((p) => ({ ...p, tienda: e.target.value }))} />
                </div>

                <div>
                  <label className="label">Zona</label>
                  <select className="select" value={form.zona} onChange={(e) => setForm((p) => ({ ...p, zona: e.target.value }))}>
                    {ZONAS.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="gridFull">
                  <label className="label">Observación</label>
                  <textarea className="textarea" rows={3} value={form.observacion} onChange={(e) => setForm((p) => ({ ...p, observacion: e.target.value }))} />
                </div>

                <div className="gridFull fileNote">
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

      {/* ================= MODAL MANUAL ================= */}
      {manualOpen && (
        <div className="modalOverlay" onMouseDown={() => setManualOpen(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2>Nueva orden (Manual)</h2>
              <button className="iconBtn" onClick={() => setManualOpen(false)} aria-label="Cerrar">
                ✕
              </button>
            </div>

            <div className="modalBody">
              <div className="grid">
                <div>
                  <label className="label">N° Orden (OC)</label>
                  <input className="input" value={manual.numeroOrden} onChange={(e) => setManual((p) => ({ ...p, numeroOrden: e.target.value }))} />
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
                  <input className="input" type="number" value={manual.montoClp} onChange={(e) => setManual((p) => ({ ...p, montoClp: e.target.value }))} />
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

                {/* ✅ Cliente con Otro editable */}
                <div>
                  <label className="label">Cliente</label>
                  <select
                    className="select"
                    value={manual.cliente}
                    onChange={(e) => {
                      const v = e.target.value;
                      setManual((p) => ({ ...p, cliente: v, clienteOtro: v === "Otro" ? p.clienteOtro : "" }));
                    }}
                  >
                    <option value="">(Seleccionar)</option>
                    {CLIENTES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  {manual.cliente === "Otro" && (
                    <input
                      className="input"
                      style={{ marginTop: 8 }}
                      placeholder="Escribe el cliente..."
                      value={manual.clienteOtro}
                      onChange={(e) => setManual((p) => ({ ...p, clienteOtro: e.target.value }))}
                    />
                  )}
                </div>

                <div>
                  <label className="label">Tienda</label>
                  <input className="input" value={manual.tienda} onChange={(e) => setManual((p) => ({ ...p, tienda: e.target.value }))} />
                </div>

                <div>
                  <label className="label">Zona</label>
                  <select className="select" value={manual.zona} onChange={(e) => setManual((p) => ({ ...p, zona: e.target.value }))}>
                    {ZONAS.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ✅ PDF opcional en manual */}
                <div className="gridFull">
                  <label className="label">PDF (opcional)</label>

                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <button className="btn" type="button" onClick={() => fileManualPdfRef.current?.click()}>
                      Adjuntar PDF
                    </button>

                    <span className="muted">{manualPdf ? manualPdf.name : "Sin PDF"}</span>

                    {manualPdf && (
                      <button className="btn btnDanger" type="button" onClick={() => setManualPdf(null)}>
                        Quitar
                      </button>
                    )}
                  </div>

                  <input
                    ref={fileManualPdfRef}
                    type="file"
                    accept="application/pdf"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      if (f.type !== "application/pdf") return alert("Solo PDF");
                      setManualPdf(f);
                    }}
                  />
                </div>

                <div className="gridFull">
                  <label className="label">Observación</label>
                  <textarea className="textarea" rows={3} value={manual.observacion} onChange={(e) => setManual((p) => ({ ...p, observacion: e.target.value }))} />
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

      {/* ================= MODAL EDITAR ================= */}
      {editOpen && (
        <div className="modalOverlay" onMouseDown={() => setEditOpen(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h2>Editar orden</h2>
              <button className="iconBtn" onClick={() => setEditOpen(false)} aria-label="Cerrar">
                ✕
              </button>
            </div>

            <div className="modalBody">
              <div className="grid">
                <div>
                  <label className="label">N° Orden (OC)</label>
                  <input className="input" value={edit.numeroOrden} onChange={(e) => setEdit((p) => ({ ...p, numeroOrden: e.target.value }))} />
                </div>

                <div>
                  <label className="label">OT</label>
                  <input className="input" value={edit.ot} onChange={(e) => setEdit((p) => ({ ...p, ot: e.target.value }))} />
                </div>

                <div>
                  <label className="label">Fecha doc</label>
                  <input className="input" type="date" value={edit.fechaLlegada} onChange={(e) => setEdit((p) => ({ ...p, fechaLlegada: e.target.value }))} />
                </div>

                <div>
                  <label className="label">Monto NETO (CLP)</label>
                  <input className="input" type="number" value={edit.montoClp} onChange={(e) => setEdit((p) => ({ ...p, montoClp: e.target.value }))} />
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

                {/* ✅ Cliente editable */}
                <div>
                  <label className="label">Cliente</label>
                  <select
                    className="select"
                    value={edit.cliente}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEdit((p) => ({ ...p, cliente: v, clienteOtro: v === "Otro" ? p.clienteOtro : "" }));
                    }}
                  >
                    <option value="">(Seleccionar)</option>
                    {CLIENTES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  {edit.cliente === "Otro" && (
                    <input
                      className="input"
                      style={{ marginTop: 8 }}
                      placeholder="Escribe el cliente..."
                      value={edit.clienteOtro}
                      onChange={(e) => setEdit((p) => ({ ...p, clienteOtro: e.target.value }))}
                    />
                  )}
                </div>

                <div>
                  <label className="label">Tienda</label>
                  <input className="input" value={edit.tienda} onChange={(e) => setEdit((p) => ({ ...p, tienda: e.target.value }))} />
                </div>

                <div>
                  <label className="label">Zona</label>
                  <select className="select" value={edit.zona} onChange={(e) => setEdit((p) => ({ ...p, zona: e.target.value }))}>
                    {ZONAS.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">HES</label>
                  <input className="input" value={edit.hes} onChange={(e) => setEdit((p) => ({ ...p, hes: e.target.value }))} />
                </div>

                <div>
                  <label className="label">N° Factura</label>
                  <input className="input" value={edit.numeroFactura} onChange={(e) => setEdit((p) => ({ ...p, numeroFactura: e.target.value }))} />
                </div>

                <div className="gridFull">
                  <label className="label">Observación</label>
                  <textarea className="textarea" rows={3} value={edit.observacion} onChange={(e) => setEdit((p) => ({ ...p, observacion: e.target.value }))} />
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
