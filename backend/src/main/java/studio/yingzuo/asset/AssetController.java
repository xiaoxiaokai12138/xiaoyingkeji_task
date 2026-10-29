package studio.yingzuo.asset;

import java.io.IOException;
import java.nio.file.Files;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import studio.yingzuo.api.ApiException;
import studio.yingzuo.identity.SessionService;

@RestController
@RequestMapping("/api/assets")
public class AssetController {
    private final AssetService assets;
    private final SessionService sessions;
    public AssetController(AssetService assets, SessionService sessions) { this.assets = assets; this.sessions = sessions; }
    @PostMapping public ResponseEntity<AssetService.AssetView> upload(@CookieValue(name=SessionService.COOKIE, required=false) String token,
            @RequestParam("file") MultipartFile file, @RequestParam String templateId) throws IOException {
        String userId = sessions.require(token).id();
        return ResponseEntity.status(201).body(AssetService.AssetView.of(assets.upload(file, templateId, userId)));
    }
    @GetMapping("/{id}/content") public ResponseEntity<Resource> content(@PathVariable String id,
            @CookieValue(name=SessionService.COOKIE, required=false) String token) {
        AssetRow row = assets.requireOwned(id, sessions.require(token).id());
        if (!Files.isRegularFile(assets.path(row))) throw ApiException.notFound();
        return ResponseEntity.ok().contentType(MediaType.valueOf(row.mimeType())).header("Cache-Control", "private, no-store")
                .header("X-Content-Type-Options", "nosniff").body(new FileSystemResource(assets.path(row)));
    }
}
