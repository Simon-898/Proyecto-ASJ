package cl.papa.ordenes;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "ordenes")
public class Orden {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Número de la Orden de Compra
    @Column(name = "numero_orden", nullable = false)
    private String numeroOrden;

    // OT (Orden de Trabajo)
    @Column(nullable = false)
    private String ot;

    // Fecha de llegada / fecha asociada a la OC (según como la trabajen)
    @Column(name = "fecha_llegada", nullable = false)
    private LocalDate fechaLlegada;

    // Monto en CLP
    @Column(name = "monto_clp", nullable = false)
    private Long montoClp;

    // Flujo real del proceso
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoOrden estado = EstadoOrden.OC_RECIBIDA;

    // HES (llega por correo cuando corresponde)
    @Column
    private String hes;

    @Column(length = 500)
    private String observacion;

    @Column(name = "oc_pdf")
    private String ocPdf;


    // Getters/Setters
    public Long getId() { return id; }

    public String getNumeroOrden() { return numeroOrden; }
    public void setNumeroOrden(String numeroOrden) { this.numeroOrden = numeroOrden; }

    public String getOt() { return ot; }
    public void setOt(String ot) { this.ot = ot; }

    public LocalDate getFechaLlegada() { return fechaLlegada; }
    public void setFechaLlegada(LocalDate fechaLlegada) { this.fechaLlegada = fechaLlegada; }

    public Long getMontoClp() { return montoClp; }
    public void setMontoClp(Long montoClp) { this.montoClp = montoClp; }

    public EstadoOrden getEstado() { return estado; }
    public void setEstado(EstadoOrden estado) { this.estado = estado; }

    public String getHes() { return hes; }
    public void setHes(String hes) { this.hes = hes; }

    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }

    public String getOcPdf() {
    return ocPdf;}

    public void setOcPdf(String ocPdf) {
    this.ocPdf = ocPdf;}

}
