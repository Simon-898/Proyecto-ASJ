import { useEffect, useRef, useState } from "react";

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

function App() {
  const [estado, setEstado] = useState("OC_RECIBIDA");
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Flujo "Nueva orden desde PDF"
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

  const cargar = () => {
    setLoading(true);
    fetch(`${API}?estado=${estado}`)
      .then((res) => res.json())
      .then((data) => setOrdenes(data))
      .catch((err) => console.error("Error cargando órdenes", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  // ✅ Avanzar con reglas:
  // - EJECUTADA -> HES_RECIBIDO: pide HES
  // - HES_RECIBIDO -> FACTURADA: pide N° Factura
  const avanzarEstado = async (orden) => {
    const next = SIGUIENTE[orden.estado];
    if (!next) return;

    // 1) EJECUTADA -> HES_RECIBIDO (pide HES)
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

    // 2) HES_RECIBIDO -> FACTURADA (pide N° Factura)
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
          numeroFactura: nf.trim(), // ✅ guardamos aquí
        }),
      });

      cargar();
      return;
    }

    // 3) Otros avances: solo PATCH
    await fetch(`${API}/${orden.id}/estado?estado=${next}`, { method: "PATCH" });
    cargar();
  };

  // ========= NUEVA ORDEN DESDE PDF =========

  const abrirSelectorNuevaOc = () => {
    fileNuevaOcRef.current?.click();
  };

  const parsearPdfNuevaOrden = async (file) => {
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Solo se permite PDF");
      return;
    }

    try {
      setCreando(true);

      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`${API}/parse-oc-pdf`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const txt = await res.text();
        alert("Error leyendo PDF: " + txt);
        return;
      }

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

      // 1) Crear orden
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

      if (!resCrear.ok) {
        const txt = await resCrear.text();
        alert("Error creando orden: " + txt);
        return;
      }

      const ordenCreada = await resCrear.json();

      // 2) Subir PDF a esa orden
      const fd = new FormData();
      fd.append("file", pdfSeleccionado);

      const resPdf = await fetch(`${API}/${ordenCreada.id}/oc-pdf`, {
        method: "POST",
        body: fd,
      });

      if (!resPdf.ok) {
        const txt = await resPdf.text();
        alert("La orden se creó, pero falló adjuntar PDF: " + txt);
        setEstado("OC_RECIBIDA");
        setMostrarForm(false);
        cargar();
        return;
      }

      alert("Orden creada desde PDF ✅");
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

  return (
    <div style={{ padding: 20 }}>
      <h1>Órdenes</h1>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {ESTADOS.map((e) => (
            <button
              key={e.key}
              onClick={() => setEstado(e.key)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #555",
                cursor: "pointer",
                fontWeight: estado === e.key ? "700" : "400",
              }}
            >
              {e.label}
            </button>
          ))}
        </div>

        <div>
          <button
            onClick={abrirSelectorNuevaOc}
            disabled={creando}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #555",
              cursor: creando ? "not-allowed" : "pointer",
              opacity: creando ? 0.7 : 1,
              fontWeight: 700,
            }}
          >
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
        </div>
      </div>

      <h3 style={{ marginTop: 16 }}>Estado: {estado}</h3>

      {loading ? (
        <p>Cargando...</p>
      ) : ordenes.length === 0 ? (
        <p>No hay órdenes en este estado.</p>
      ) : (
        <table cellPadding="10" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th align="left">N° Orden (OC)</th>
              <th align="left">OT</th>
              <th align="left">Fecha doc</th>
              <th align="left">Monto Neto (CLP)</th>
              <th align="left">Transpaletas</th>
              <th align="left">HES</th>

              {/* ✅ solo mostrar Factura en pestañas Facturada / Pagada */}
              {(estado === "FACTURADA" || estado === "PAGADA") && (
                <th align="left">N° Factura</th>
              )}

              <th align="left">OC</th>
              <th align="left">Acción</th>
            </tr>
          </thead>

          <tbody>
            {ordenes.map((o) => (
              <tr key={o.id} style={{ borderTop: "1px solid #333" }}>
                <td>{o.numeroOrden}</td>
                <td>{o.ot}</td>
                <td>{o.fechaLlegada}</td>
                <td>${o.montoClp}</td>
                <td>{o.cantidadTranspaletas ?? "-"}</td>
                <td>{o.hes ?? "-"}</td>

                {(estado === "FACTURADA" || estado === "PAGADA") && (
                  <td>{o.numeroFactura ?? "-"}</td>
                )}

                <td>
                  {o.ocPdf ? (
                    <a
                      href={`${API}/${o.id}/oc-pdf`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-block",
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid #555",
                        textDecoration: "none",
                      }}
                    >
                      Ver OC
                    </a>
                  ) : (
                    "-"
                  )}
                </td>

                <td>
                  {SIGUIENTE[o.estado] ? (
                    <button
                      onClick={() => avanzarEstado(o)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid #555",
                        cursor: "pointer",
                      }}
                    >
                      Avanzar → {SIGUIENTE[o.estado]}
                    </button>
                  ) : (
                    <span>Finalizada</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {mostrarForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(760px, 100%)",
              background: "#1f1f1f",
              border: "1px solid #444",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <h2 style={{ marginTop: 0 }}>Nueva orden desde PDF</h2>
            <p style={{ marginTop: 0, opacity: 0.8 }}>
              Se autocompletó desde el PDF. Revisa y presiona <b>Guardar</b>.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6 }}>N° Orden (OC)</label>
                <input
                  value={form.numeroOrden}
                  onChange={(e) => setForm((p) => ({ ...p, numeroOrden: e.target.value }))}
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #555" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 6 }}>OT</label>
                <input
                  value={form.ot}
                  onChange={(e) => setForm((p) => ({ ...p, ot: e.target.value }))}
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #555" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 6 }}>Fecha del documento</label>
                <input
                  type="date"
                  value={form.fechaLlegada}
                  onChange={(e) => setForm((p) => ({ ...p, fechaLlegada: e.target.value }))}
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #555" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 6 }}>Monto NETO (CLP)</label>
                <input
                  type="number"
                  value={form.montoClp}
                  onChange={(e) => setForm((p) => ({ ...p, montoClp: e.target.value }))}
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #555" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 6 }}>Cantidad transpaletas</label>
                <input
                  type="number"
                  value={form.cantidadTranspaletas}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, cantidadTranspaletas: e.target.value }))
                  }
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #555" }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", marginBottom: 6 }}>Observación</label>
                <textarea
                  value={form.observacion}
                  onChange={(e) => setForm((p) => ({ ...p, observacion: e.target.value }))}
                  rows={3}
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #555" }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1", opacity: 0.85 }}>
                <b>PDF:</b> {pdfSeleccionado?.name}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button
                onClick={cerrarForm}
                disabled={creando}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #555",
                  cursor: creando ? "not-allowed" : "pointer",
                  opacity: creando ? 0.7 : 1,
                }}
              >
                Cancelar
              </button>

              <button
                onClick={guardarNuevaOrden}
                disabled={creando}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #555",
                  cursor: creando ? "not-allowed" : "pointer",
                  opacity: creando ? 0.7 : 1,
                  fontWeight: 800,
                }}
              >
                {creando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
