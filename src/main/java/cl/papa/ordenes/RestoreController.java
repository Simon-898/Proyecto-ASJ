package cl.papa.ordenes;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.sql.DataSource;
import java.io.*;
import java.nio.file.*;
import java.util.Comparator;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@RestController
@RequestMapping("/api/ordenes")
public class RestoreController {

    private static final Path DATA_DIR = Paths.get("data");
    private static final Path DB_PATH = DATA_DIR.resolve("ordenes.db");
    private static final Path OCS_DIR = DATA_DIR.resolve("ocs");

    private final DataSource dataSource;

    public RestoreController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @PostMapping(value = "/restore", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public String restore(@RequestParam("file") MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Archivo vacío.");
        }
        String name = (file.getOriginalFilename() == null) ? "" : file.getOriginalFilename().toLowerCase();
        if (!name.endsWith(".zip")) {
            throw new IllegalArgumentException("Debe ser un .zip");
        }

        Files.createDirectories(DATA_DIR);
        Files.createDirectories(OCS_DIR);

        // 1) extraer DB a TEMP primero (aún no tocamos la DB en uso)
        Path tempDir = Files.createTempDirectory("restore_ordenes_");
        Path tempDb = tempDir.resolve("ordenes.db");

        boolean dbFound = false;

        try (ZipInputStream zis = new ZipInputStream(file.getInputStream())) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                String entryName = entry.getName().replace("\\", "/");

                if (entry.isDirectory()) {
                    zis.closeEntry();
                    continue;
                }

                // esperamos "data/ordenes.db"
                if ("data/ordenes.db".equals(entryName)) {
                    copyZipEntry(zis, tempDb);
                    dbFound = true;
                }

                zis.closeEntry();
            }
        }

        if (!dbFound || !Files.exists(tempDb)) {
            cleanupDir(tempDir);
            throw new IllegalArgumentException("El ZIP no contiene data/ordenes.db");
        }

        // 2) CERRAR HIKARI para soltar el lock de SQLite
        closeHikari();

        // 3) Reemplazar DB (ahora debería dejar)
        // opcional: backup del db actual
        if (Files.exists(DB_PATH)) {
            Path backup = DATA_DIR.resolve("ordenes.db.bak");
            Files.copy(DB_PATH, backup, StandardCopyOption.REPLACE_EXISTING);
        }

        Files.copy(tempDb, DB_PATH, StandardCopyOption.REPLACE_EXISTING);

        // 4) Extraer PDFs data/ocs/** (si vienen)
        try (ZipInputStream zis = new ZipInputStream(file.getInputStream())) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                String entryName = entry.getName().replace("\\", "/");

                if (entry.isDirectory()) {
                    zis.closeEntry();
                    continue;
                }

                if (entryName.startsWith("data/ocs/")) {
                    Path out = DATA_DIR.resolve(entryName.substring("data/".length())); // deja "ocs/..."
                    Files.createDirectories(out.getParent());
                    copyZipEntry(zis, out);
                }

                zis.closeEntry();
            }
        }

        cleanupDir(tempDir);

        return "OK - Respaldo restaurado. Cierra y abre el programa para recargar la base de datos.";
    }

    private void closeHikari() {
        // Spring Boot normalmente usa Hikari. Si no es Hikari, esto no hará nada.
        if (dataSource instanceof HikariDataSource hk) {
            try {
                hk.close(); // suelta conexiones => suelta lock de sqlite
            } catch (Exception ignored) {}
        }
    }

    private static void copyZipEntry(InputStream in, Path out) throws IOException {
        Files.createDirectories(out.getParent());
        try (OutputStream os = Files.newOutputStream(out, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING)) {
            in.transferTo(os);
        }
    }

    private static void cleanupDir(Path dir) {
        try {
            if (dir == null || !Files.exists(dir)) return;
            Files.walk(dir)
                    .sorted(Comparator.reverseOrder())
                    .forEach(p -> {
                        try { Files.deleteIfExists(p); } catch (IOException ignored) {}
                    });
        } catch (IOException ignored) {}
    }
}
