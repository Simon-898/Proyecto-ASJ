package cl.papa.ordenes.pdf;

public class OcParseResult {
    private String numeroOrden;     // 6001647013
    private String ot;              // OT876065
    private String fechaDocumento;  // YYYY-MM-DD (emisión)
    private Long montoNetoClp;      // neto sin IVA
    private String observacion;     // texto
    private Integer cantidadTranspaletas; // ✅ NUEVO

    public OcParseResult() {}

    public OcParseResult(
            String numeroOrden,
            String ot,
            String fechaDocumento,
            Long montoNetoClp,
            String observacion,
            Integer cantidadTranspaletas
    ) {
        this.numeroOrden = numeroOrden;
        this.ot = ot;
        this.fechaDocumento = fechaDocumento;
        this.montoNetoClp = montoNetoClp;
        this.observacion = observacion;
        this.cantidadTranspaletas = cantidadTranspaletas;
    }

    public String getNumeroOrden() { return numeroOrden; }
    public void setNumeroOrden(String numeroOrden) { this.numeroOrden = numeroOrden; }

    public String getOt() { return ot; }
    public void setOt(String ot) { this.ot = ot; }

    public String getFechaDocumento() { return fechaDocumento; }
    public void setFechaDocumento(String fechaDocumento) { this.fechaDocumento = fechaDocumento; }

    public Long getMontoNetoClp() { return montoNetoClp; }
    public void setMontoNetoClp(Long montoNetoClp) { this.montoNetoClp = montoNetoClp; }

    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }

    public Integer getCantidadTranspaletas() { return cantidadTranspaletas; }
    public void setCantidadTranspaletas(Integer cantidadTranspaletas) { this.cantidadTranspaletas = cantidadTranspaletas; }
}
