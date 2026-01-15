package cl.papa.ordenes;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
public class Orden {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String numeroOrden; // N° Orden (OC)
    private String ot;

    private LocalDate fechaLlegada; // fecha doc

    private Long montoClp; // monto neto CLP

    @Enumerated(EnumType.STRING)
    private EstadoOrden estado;

    private String hes;

    private String numeroFactura;

    @Column(length = 2000)
    private String observacion;

    private String zona; // Norte / Centro / Sur

    private Integer cantidadTranspaletas;

    // PDF guardado (nombre de archivo)
    private String ocPdf;

    // ====== NUEVOS CAMPOS ======
    private String cliente; // Tottus, Sodimac, TCL, Simi, Papa Johns, Otros...
    private String tienda; // Ej: "HC NVA LA FLOR" o nombre tienda
    private String comuna; // Ej: La Florida
    private String region; // Ej: Región Metropolitana

    // ====== GETTERS/SETTERS ======
    public Long getId() {
        return id;
    }

    public String getZona() {
        return zona;
    }

    public void setZona(String zona) {
        this.zona = zona;
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

    public String getNumeroFactura() {
        return numeroFactura;
    }

    public void setNumeroFactura(String numeroFactura) {
        this.numeroFactura = numeroFactura;
    }

    public String getObservacion() {
        return observacion;
    }

    public void setObservacion(String observacion) {
        this.observacion = observacion;
    }

    public Integer getCantidadTranspaletas() {
        return cantidadTranspaletas;
    }

    public void setCantidadTranspaletas(Integer cantidadTranspaletas) {
        this.cantidadTranspaletas = cantidadTranspaletas;
    }

    public String getOcPdf() {
        return ocPdf;
    }

    public void setOcPdf(String ocPdf) {
        this.ocPdf = ocPdf;
    }

    public String getCliente() {
        return cliente;
    }

    public void setCliente(String cliente) {
        this.cliente = cliente;
    }

    public String getTienda() {
        return tienda;
    }

    public void setTienda(String tienda) {
        this.tienda = tienda;
    }

    public String getComuna() {
        return comuna;
    }

    public void setComuna(String comuna) {
        this.comuna = comuna;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }
}
