package studio.yingzuo;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SystemController {
    @GetMapping("/api/system")
    public Map<String, String> system() {
        return Map.of("name", "映作素材工作室", "version", "0.1.0", "status", "ready");
    }
}
