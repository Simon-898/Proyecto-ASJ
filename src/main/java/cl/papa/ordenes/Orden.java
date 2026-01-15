package cl.papa.ordenes;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
public class Orden {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // OC / Número orden de compra
    private String numeroOrden;

    // OT
    private String ot;

    // Fecha del documento (emisión) -> la guardamos aquí
    private LocalDate fechaLlegada;

    // Monto NETO CLP
    private Long montoClp;

    @Enumerated(EnumType.STRING)
    private EstadoOrden estado;

    // HES (cuando llegue)
    private String hes;

    private String numeroFactura;

    // Observación (texto)
    @Column(length = 1000)
    private String observacion;

    // Nombre del PDF guardado en disco
    private String ocPdf;

    // ✅ NUEVO: cantidad transpaletas (ej: 12)
    private Integer cantidadTranspaletas;

    public Orden() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNumeroOrden() {
        return numeroOrden;
    }

    public void setNumeroOrden(String numeroOrden) {
        this.numeroOrden = numeroOrden;
    }

    public String getOt() {
        return ot;
    }

    public void setOt(String ot) {
        this.ot = ot;
    }

    public LocalDate getFechaLlegada() {
        return fechaLlegada;
    }

    public void setFechaLlegada(LocalDate fechaLlegada) {
        this.fechaLlegada = fechaLlegada;
    }

    public Long getMontoClp() {
        return montoClp;
    }

    public void setMontoClp(Long montoClp) {
        this.montoClp = montoClp;
    }

    public EstadoOrden getEstado() {
        return estado;
    }

    public void setEstado(EstadoOrden estado) {
        this.estado = estado;
    }

    public String getHes() {
        return hes;
    }

    public void setHes(String hes) {
        this.hes = hes;
    }

    public String getObservacion() {
        return observacion;
    }

    public void setObservacion(String observacion) {
        this.observacion = observacion;
    }

    public String getOcPdf() {
        return ocPdf;
    }

    public void setOcPdf(String ocPdf) {
        this.ocPdf = ocPdf;
    }

    public Integer getCantidadTranspaletas() {
        return cantidadTranspaletas;
    }

    public void setCantidadTranspaletas(Integer cantidadTranspaletas) {
        this.cantidadTranspaletas = cantidadTranspaletas;
    }

    public String getNumeroFactura() {
        return numeroFactura;
    }

    public void setNumeroFactura(String numeroFactura) {
        this.numeroFactura = numeroFactura;
    }

}
