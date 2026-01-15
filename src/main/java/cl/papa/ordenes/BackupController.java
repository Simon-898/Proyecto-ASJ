package cl.papa.ordenes;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@RestController
public class BackupController {

    private static final Path DB_PATH = Paths.get("data", "ordenes.db");
    private static final Path OCS_DIR = Paths.get("data", "ocs");

    @GetMapping("/api/ordenes/backup")
    public void backup(HttpServletResponse response) throws IOException {

        String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String filename = "backup_ordenes_" + ts + ".zip";

        response.setStatus(200);
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
        response.setContentType("application/zip");

        try (OutputStream out = response.getOutputStream();
             ZipOutputStream zip = new ZipOutputStream(out)) {

            // 1) DB
            if (Files.exists(DB_PATH)) {
                addFileToZip(zip, DB_PATH, "data/ordenes.db");
            } else {
                // opcional: crea un txt para avisar que no estaba
                addTextToZip(zip, "data/NO_DB.txt", "No se encontró data/ordenes.db");
            }

            // 2) PDFs (carpeta data/ocs)
            if (Files.exists(OCS_DIR) && Files.isDirectory(OCS_DIR)) {
                Files.walk(OCS_DIR)
                        .filter(Files::isRegularFile)
                        .forEach(path -> {
                            try {
                                // Mantener ruta dentro del zip: data/ocs/archivo.pdf
                                Path rel = Paths.get("data").resolve(OCS_DIR.getFileName()).resolve(OCS_DIR.relativize(path));
                                addFileToZip(zip, path, rel.toString().replace("\\", "/"));
                            } catch (IOException e) {
                                // si un pdf da error, metemos un txt de error dentro del zip
                                try {
                                    addTextToZip(zip,
                                            "data/ERROR_" + path.getFileName().toString() + ".txt",
                                            "Error agregando archivo: " + path + "\n" + e.getMessage());
                                } catch (IOException ignored) {}
                            }
                        });
            } else {
                addTextToZip(zip, "data/NO_OCS.txt", "No se encontró carpeta data/ocs");
            }

            zip.finish();
            zip.flush();
        }
    }

    private static void addFileToZip(ZipOutputStream zip, Path file, String zipEntryName) throws IOException {
        ZipEntry entry = new ZipEntry(zipEntryName);
        zip.putNextEntry(entry);
        Files.copy(file, zip);
        zip.closeEntry();
    }

    private static void addTextToZip(ZipOutputStream zip, String zipEntryName, String text) throws IOException {
        ZipEntry entry = new ZipEntry(zipEntryName);
        zip.putNextEntry(entry);
        zip.write(text.getBytes());
        zip.closeEntry();
    }
}
