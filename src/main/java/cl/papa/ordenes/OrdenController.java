package cl.papa.ordenes;

import cl.papa.ordenes.pdf.OcPdfParser;
import cl.papa.ordenes.pdf.OcParseResult;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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
        if (estado == null)
            return repository.findAll();
        return repository.findByEstadoOrderByFechaLlegadaAsc(estado);
    }

    // Crear orden (manual o desde PDF)
    @PostMapping
    public Orden crear(@RequestBody Orden orden) {
        orden.setEstado(EstadoOrden.OC_RECIBIDA);
        return repository.save(orden);
    }

    // Editar
    @PutMapping("/{id}")
    public ResponseEntity<Orden> editar(@PathVariable Long id, @RequestBody Orden body) {
        return repository.findById(id)
                .map(o -> {
                    o.setNumeroOrden(body.getNumeroOrden());
                    o.setOt(body.getOt());
                    o.setFechaLlegada(body.getFechaLlegada());
                    o.setMontoClp(body.getMontoClp());
                    o.setObservacion(body.getObservacion());
                    o.setHes(body.getHes());
                    o.setNumeroFactura(body.getNumeroFactura());

                    o.setCliente(body.getCliente());
                    o.setTienda(body.getTienda());
                    o.setZona(body.getZona());

                    return ResponseEntity.ok(repository.save(o));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Cambiar estado
    @PatchMapping("/{id}/estado")
    public ResponseEntity<Orden> cambiarEstado(@PathVariable Long id, @RequestParam EstadoOrden estado) {
        return repository.findById(id)
                .map(o -> {
                    o.setEstado(estado);
                    return ResponseEntity.ok(repository.save(o));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Eliminar
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        if (!repository.existsById(id))
            return ResponseEntity.notFound().build();
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Subir PDF OC
    @PostMapping(path = "/{id}/oc-pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> subirOcPdf(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        if (file.isEmpty())
            return ResponseEntity.badRequest().body("Archivo vacío");

        String contentType = file.getContentType();
        if (contentType == null || !contentType.equalsIgnoreCase("application/pdf")) {
            return ResponseEntity.badRequest().body("Solo se permite PDF");
        }

        return repository.findById(id).map(orden -> {
            try {
                Path dir = Paths.get("data", "ocs");
                Files.createDirectories(dir);

                String safeNumero = orden.getNumeroOrden().replaceAll("[^a-zA-Z0-9-_]", "_");
                String filename = "OC-" + safeNumero + ".pdf";

                Path destino = dir.resolve(filename);
                Files.write(destino, file.getBytes());

                orden.setOcPdf(filename);
                repository.save(orden);

                return ResponseEntity.ok().body("PDF guardado como: " + filename);
            } catch (IOException e) {
                return ResponseEntity.internalServerError().body("Error guardando PDF: " + e.getMessage());
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    // Ver PDF
    @GetMapping("/{id}/oc-pdf")
    public ResponseEntity<?> verOcPdf(@PathVariable Long id) {
        return repository.findById(id).map(orden -> {
            try {
                if (orden.getOcPdf() == null || orden.getOcPdf().isBlank()) {
                    return ResponseEntity.status(404).body("Esta orden no tiene PDF asociado");
                }

                Path path = Paths.get("data", "ocs", orden.getOcPdf());
                if (!Files.exists(path)) {
                    return ResponseEntity.status(404).body("No se encontró el archivo en disco");
                }

                Resource resource = new UrlResource(path.toUri());

                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + orden.getOcPdf() + "\"")
                        .contentType(MediaType.APPLICATION_PDF)
                        .body(resource);

            } catch (Exception e) {
                return ResponseEntity.internalServerError().body("Error abriendo PDF: " + e.getMessage());
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    // Parsear PDF (solo devuelve JSON parseado)
    @PostMapping(path = "/parse-oc-pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> parseOcPdf(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty())
            return ResponseEntity.badRequest().body("Archivo vacío");

        String contentType = file.getContentType();
        if (contentType == null || !contentType.equalsIgnoreCase("application/pdf")) {
            return ResponseEntity.badRequest().body("Solo se permite PDF");
        }

        try {
            OcParseResult result = OcPdfParser.parse(file.getInputStream());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error leyendo PDF: " + e.getMessage());
        }
    }
}
