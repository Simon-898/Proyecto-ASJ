package cl.papa.ordenes;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ordenes")
public class OrdenController {

    private final OrdenRepository repository;

    public OrdenController(OrdenRepository repository) {
        this.repository = repository;
    }

    // Listar todas o por estado
    @GetMapping
    public List<Orden> listar(@RequestParam(required = false) EstadoOrden estado) {
        if (estado == null) {
            return repository.findAll();
        }
        return repository.findByEstadoOrderByFechaLlegadaAsc(estado);
    }

    // Ingresar una orden (cuando llega la OC)
    @PostMapping
    public Orden crear(@RequestBody Orden orden) {
        orden.setEstado(EstadoOrden.OC_RECIBIDA);
        return repository.save(orden);
    }

    // Editar datos generales
    @PutMapping("/{id}")
    public ResponseEntity<Orden> editar(
            @PathVariable Long id,
            @RequestBody Orden body) {

        return repository.findById(id)
                .map(o -> {
                    o.setNumeroOrden(body.getNumeroOrden());
                    o.setOt(body.getOt());
                    o.setFechaLlegada(body.getFechaLlegada());
                    o.setMontoClp(body.getMontoClp());
                    o.setObservacion(body.getObservacion());
                    o.setHes(body.getHes());
                    return ResponseEntity.ok(repository.save(o));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Cambiar estado (avance del flujo)
    @PatchMapping("/{id}/estado")
    public ResponseEntity<Orden> cambiarEstado(
            @PathVariable Long id,
            @RequestParam EstadoOrden estado) {

        return repository.findById(id)
                .map(o -> {
                    o.setEstado(estado);
                    return ResponseEntity.ok(repository.save(o));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Eliminar (por si se ingresó mal)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
