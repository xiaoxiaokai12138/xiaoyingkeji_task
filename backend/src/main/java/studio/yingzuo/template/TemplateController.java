package studio.yingzuo.template;

import java.util.List;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/templates")
public class TemplateController {
    private final TemplateService service;
    public TemplateController(TemplateService service) { this.service = service; }
    @GetMapping("/categories") public List<String> categories() { return service.categories(); }
    @GetMapping public List<TemplateService.TemplateView> list(@RequestParam(required = false) String category) { return service.list(category); }
    @GetMapping("/{id}") public TemplateService.TemplateView detail(@PathVariable String id) { return service.view(service.require(id)); }
    @GetMapping("/{id}/cover") public ResponseEntity<Resource> cover(@PathVariable String id) {
        TemplateRow row = service.require(id);
        return ResponseEntity.ok().contentType(MediaType.valueOf("image/svg+xml"))
                .header("X-Content-Type-Options", "nosniff").body(new ClassPathResource("demo/" + row.coverFile()));
    }
}
