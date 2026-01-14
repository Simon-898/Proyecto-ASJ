import { useEffect, useState } from "react";

function App() {
  const [ordenes, setOrdenes] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8081/api/ordenes")
      .then(res => res.json())
      .then(data => setOrdenes(data))
      .catch(err => console.error("Error cargando órdenes", err));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Órdenes</h1>

      <ul>
        {ordenes.map(o => (
          <li key={o.id}>
            {o.numeroOrden} | {o.ot} | {o.estado} | ${o.montoClp}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
