package studio.yingzuo.template;

import java.util.Arrays;
import java.util.List;
import org.springframework.stereotype.Service;
import studio.yingzuo.api.ApiException;

@Service
public class TemplateService {
    private final TemplateMapper mapper;
    public TemplateService(TemplateMapper mapper) { this.mapper = mapper; }
    public TemplateRow require(String id) {
        TemplateRow row = mapper.findById(id);
        if (row == null) throw ApiException.notFound();
        return row;
    }
    public List<TemplateView> list(String category) {
        return mapper.findAll().stream().filter(t -> category == null || category.isBlank() || category.equals(t.category())).map(this::view).toList();
    }
    public List<String> categories() { return mapper.findAll().stream().map(TemplateRow::category).distinct().toList(); }
    public TemplateView view(TemplateRow row) {
        return new TemplateView(row.id(), row.title(), row.category(), "/api/templates/" + row.id() + "/cover", row.description(),
                row.requiredImageCount(), Arrays.asList(row.acceptedMimeTypes().split(",")), row.maxFileSizeBytes());
    }
    public record TemplateView(String id, String title, String category, String coverUrl, String description,
                               int requiredImageCount, List<String> acceptedMimeTypes, long maxFileSizeBytes) {}
}
