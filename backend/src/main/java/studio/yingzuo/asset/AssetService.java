package studio.yingzuo.asset;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Arrays;
import java.util.UUID;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import studio.yingzuo.api.ApiException;
import studio.yingzuo.template.TemplateRow;
import studio.yingzuo.template.TemplateService;

@Service
public class AssetService {
    private final AssetMapper mapper;
    private final TemplateService templates;
    private final Path root;
    public AssetService(AssetMapper mapper, TemplateService templates, @Value("${STORAGE_ROOT:/app/data}") String root) throws IOException {
        this.mapper = mapper; this.templates = templates; this.root = Path.of(root).toAbsolutePath().normalize();
        Files.createDirectories(this.root);
    }
    public AssetRow requireOwned(String id, String userId) {
        AssetRow row = mapper.byId(id);
        if (row == null || !row.userId().equals(userId)) throw ApiException.notFound();
        return row;
    }
    public Path path(AssetRow row) {
        Path path = root.resolve(row.storagePath()).normalize();
        if (!path.startsWith(root)) throw new IllegalStateException("Invalid stored asset path");
        return path;
    }
    public AssetRow upload(MultipartFile file, String templateId, String userId) throws IOException {
        TemplateRow template = templates.require(templateId);
        if (file.isEmpty()) throw new ApiException(400, "EMPTY_IMAGE", "请选择一张非空图片");
        if (file.getSize() > template.maxFileSizeBytes()) throw new ApiException(413, "FILE_TOO_LARGE", "图片不能超过 5 MiB");
        String declared = file.getContentType();
        if (declared == null || !Arrays.asList(template.acceptedMimeTypes().split(",")).contains(declared))
            throw new ApiException(415, "UNSUPPORTED_IMAGE", "仅支持 JPEG 或 PNG 图片");
        byte[] bytes = file.getBytes();
        validateImage(bytes, declared);
        String id = UUID.randomUUID().toString();
        String relative = id + (declared.equals("image/png") ? ".png" : ".jpg");
        AssetRow row = new AssetRow(id, userId, "UPLOAD", relative, declared, bytes.length, Instant.now());
        Path target = path(row);
        try {
            Files.write(target, bytes);
            mapper.insert(row);
            return row;
        } catch (Exception ex) {
            Files.deleteIfExists(target);
            throw ex;
        }
    }
    public AssetRow copyAsResult(AssetRow source) throws IOException {
        String id = UUID.randomUUID().toString();
        AssetRow result = new AssetRow(id, source.userId(), "RESULT", id + (source.mimeType().equals("image/png") ? ".png" : ".jpg"), source.mimeType(), source.sizeBytes(), Instant.now());
        try { Files.copy(path(source), path(result)); return result; }
        catch (IOException ex) { Files.deleteIfExists(path(result)); throw ex; }
    }
    private void validateImage(byte[] bytes, String declared) {
        try (ImageInputStream input = ImageIO.createImageInputStream(new java.io.ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw new ApiException(415, "INVALID_IMAGE", "文件内容不是可读取的图片");
            ImageReader reader = readers.next();
            try {
                reader.setInput(input);
                String format = reader.getFormatName();
                String actual = format.equalsIgnoreCase("png") ? "image/png" : format.equalsIgnoreCase("jpeg") || format.equalsIgnoreCase("jpg") ? "image/jpeg" : "";
                if (!actual.equals(declared)) throw new ApiException(415, "IMAGE_TYPE_MISMATCH", "文件内容与声明的图片类型不一致");
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (width <= 0 || height <= 0 || (long)width * height > 24_000_000L)
                    throw new ApiException(400, "IMAGE_DIMENSIONS", "图片像素总量不能超过 2400 万");
                if (reader.read(0) == null) throw new ApiException(415, "INVALID_IMAGE", "图片内容损坏，请更换图片");
            } finally { reader.dispose(); }
        } catch (IOException ex) { throw new ApiException(415, "INVALID_IMAGE", "图片内容损坏或无法读取"); }
    }
    public record AssetView(String id, String previewUrl, String mimeType, long sizeBytes) {
        public static AssetView of(AssetRow row) { return new AssetView(row.id(), "/api/assets/"+row.id()+"/content", row.mimeType(), row.sizeBytes()); }
    }
}
