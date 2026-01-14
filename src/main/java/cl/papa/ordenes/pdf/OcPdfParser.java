package cl.papa.ordenes.pdf;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class OcPdfParser {

    private static final Pattern P_OC_NUMERO = Pattern.compile(
            "(?i)N\\s*ú\\s*mero\\s*orden\\s*de\\s*compra\\s*:\\s*(\\d+)");

    private static final Pattern P_FECHA_EMISION = Pattern.compile(
            "(?i)Fecha\\s*de\\s*emisi\\s*ó\\s*n\\s*:\\s*(\\d{2}/\\d{2}/\\d{4})");

    private static final Pattern P_OT = Pattern.compile("\\bOT\\d+\\b", Pattern.CASE_INSENSITIVE);

    private static final Pattern P_NETO = Pattern.compile(
            "(?i)TOTAL\\s*COSTO\\s*NETO\\s*:\\s*\\$?\\s*([0-9\\.]+)");

    private static final Pattern P_OBS = Pattern.compile(
            "(?i)OBSERVACIONES\\s*:\\s*(.+)");

    // ✅ Soporta: transpaleta/transpaletas y traspaleta/traspaletas (typo común)
    // Ejemplos que cubre:
    // - "MP transpaletas manuales 12 uni"
    // - "rep 5 traspaleta manuales"
    // - "transpaleta 3"
    // - "traspaletas: 10"
    private static final Pattern P_TRANSPALETAS = Pattern.compile(
            "(?i)tras?npaletas?\\b[^\\d]{0,60}(\\d{1,3})");

    private static final DateTimeFormatter DMY = DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale.ROOT);

    public static OcParseResult parse(InputStream pdfInputStream) throws Exception {
        byte[] bytes = pdfInputStream.readAllBytes();

        try (PDDocument doc = Loader.loadPDF(bytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);

            stripper.setStartPage(1);
            stripper.setEndPage(1);

            String text = stripper.getText(doc);
            if (text == null)
                text = "";
            text = normalize(text);

            String numeroOrden = findFirstGroup(P_OC_NUMERO, text);
            String fechaEmision = findFirstGroup(P_FECHA_EMISION, text);
            String ot = findFirstMatch(P_OT, text);
            Long neto = parseMonto(findFirstGroup(P_NETO, text));
            String obs = findObs(P_OBS, text);

            // ✅ NUEVO
            Integer cantidadTranspaletas = findInt(P_TRANSPALETAS, text);

            String fechaIso = null;
            if (fechaEmision != null) {
                LocalDate d = LocalDate.parse(fechaEmision, DMY);
                fechaIso = d.toString();
            }

            return new OcParseResult(numeroOrden, ot, fechaIso, neto, obs, cantidadTranspaletas);
        }
    }

    private static String normalize(String s) {
        String out = s.replace("\u00A0", " ");
        out = out.replace("\r", "\n");
        out = out.replaceAll("[ \t]+", " ");
        return out;
    }

    private static String findFirstGroup(Pattern p, String text) {
        Matcher m = p.matcher(text);
        if (m.find())
            return safe(m.group(1));
        return null;
    }

    private static String findFirstMatch(Pattern p, String text) {
        Matcher m = p.matcher(text);
        if (m.find())
            return safe(m.group());
        return null;
    }

    private static String findObs(Pattern p, String text) {
        Matcher m = p.matcher(text);
        if (m.find()) {
            String line = m.group(1);
            if (line == null)
                return null;
            line = line.split("\n")[0];
            return safe(line);
        }
        return null;
    }

    private static Integer findInt(Pattern p, String text) {
        Matcher m = p.matcher(text);
        if (m.find()) {
            try {
                String g = m.group(1);
                if (g == null)
                    return null;
                return Integer.parseInt(g.trim());
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private static String safe(String s) {
        if (s == null)
            return null;
        String x = new String(s.getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8).trim();
        return x.isBlank() ? null : x;
    }

    private static Long parseMonto(String raw) {
        if (raw == null)
            return null;
        String digits = raw.replace(".", "").replace(" ", "").trim();
        if (digits.isBlank())
            return null;
        try {
            return Long.parseLong(digits);
        } catch (Exception e) {
            return null;
        }
    }
}
