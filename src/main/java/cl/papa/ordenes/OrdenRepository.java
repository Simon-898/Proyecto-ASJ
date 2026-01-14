package cl.papa.ordenes;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrdenRepository extends JpaRepository<Orden, Long> {
    List<Orden> findByEstadoOrderByFechaLlegadaAsc(EstadoOrden estado);
}
