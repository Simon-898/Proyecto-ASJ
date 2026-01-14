import { useEffect, useState } from "react";

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

  const cargar = () => {
    setLoading(true);
    fetch(`http://localhost:8081/api/ordenes?estado=${estado}`)
      .then((res) => res.json())
      .then((data) => setOrdenes(data))
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

    // Si va a HES_RECIBIDO, pedimos HES
    if (next === "HES_RECIBIDO") {
      const hes = prompt("Ingresa el HES recibido por correo:");
      if (!hes || !hes.trim()) return;

      // 1) Cambiar estado
      await fetch(
        `http://localhost:8081/api/ordenes/${orden.id}/estado?estado=${next}`,
        { method: "PATCH" }
      );

      // 2) Guardar HES (PUT con todos los campos)
      await fetch(`http://localhost:8081/api/ordenes/${orden.id}`, {
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
        }),
      });

      cargar();
      return;
    }

    // Para otros estados: solo PATCH
    await fetch(
      `http://localhost:8081/api/ordenes/${orden.id}/estado?estado=${next}`,
      { method: "PATCH" }
    );

    cargar();
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Órdenes</h1>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
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

      <h3 style={{ marginTop: 0 }}>Estado: {estado}</h3>

      {loading ? (
        <p>Cargando...</p>
      ) : ordenes.length === 0 ? (
        <p>No hay órdenes en este estado.</p>
      ) : (
        <table cellPadding="10" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th align="left">N° Orden</th>
              <th align="left">OT</th>
              <th align="left">Fecha llegada</th>
              <th align="left">Monto (CLP)</th>
              <th align="left">HES</th>
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
                <td>{o.hes ?? "-"}</td>

                {/* Columna OC: link para ver el PDF si existe */}
                <td>
                  {o.ocPdf ? (
                    <a
                      href={`http://localhost:8081/api/ordenes/${o.id}/oc-pdf`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver OC
                    </a>
                  ) : (
                    "-"
                  )}
                </td>

                {/* Columna Acción: avanzar estado */}
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
    </div>
  );
}

export default App;
