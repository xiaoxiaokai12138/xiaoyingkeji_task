package studio.yingzuo.task;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.yingzuo.api.ApiException;
import studio.yingzuo.asset.*;
import studio.yingzuo.template.TemplateService;

@Service
public class TaskService {
    private final TaskMapper tasks;
    private final TemplateService templates;
    private final AssetService assets;
    private final SimulationConfig simulation;
    private final ObjectMapper json;
    public TaskService(TaskMapper tasks, TemplateService templates, AssetService assets, SimulationConfig simulation, ObjectMapper json) {
        this.tasks=tasks; this.templates=templates; this.assets=assets; this.simulation=simulation; this.json=json;
    }
    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public TaskView create(TaskRequest request, String userId) {
        String fingerprint = fingerprint(request);
        TaskRow existing = tasks.byRequest(userId, request.clientRequestId());
        if (existing != null) return sameRequest(existing, fingerprint);
        var template = templates.require(request.templateId());
        if (request.assetIds().size() != template.requiredImageCount() || new HashSet<>(request.assetIds()).size() != request.assetIds().size())
            throw new ApiException(400,"IMAGE_COUNT","请上传规定数量的不同图片");
        for (String id : request.assetIds()) {
            var asset = assets.requireOwned(id, userId);
            if (!asset.purpose().equals("UPLOAD") || asset.sizeBytes() > template.maxFileSizeBytes() ||
                    !Arrays.asList(template.acceptedMimeTypes().split(",")).contains(asset.mimeType()) || !Files.isReadable(assets.path(asset)))
                throw new ApiException(400,"INVALID_ASSET","素材不可用或不符合模板要求，请重新上传");
        }
        String config = write(simulation.resolve(request.simulation()));
        TaskRow row = new TaskRow(UUID.randomUUID().toString(),userId,template.id(),template.title(),request.clientRequestId(),fingerprint,
                "QUEUED",null,config,null,null,null,null,Instant.now(),null,null,0);
        try { tasks.insert(row); }
        catch (DuplicateKeyException ex) {
            TaskRow concurrent = tasks.byRequest(userId, request.clientRequestId());
            if (concurrent == null) throw ex;
            return sameRequest(concurrent, fingerprint);
        }
        for (int i=0;i<request.assetIds().size();i++) tasks.link(row.id(), request.assetIds().get(i),i);
        return view(row);
    }
    public TaskView get(String id, String userId) {
        TaskRow row = tasks.byId(id);
        if (row == null || !row.userId().equals(userId)) throw ApiException.notFound();
        return view(row);
    }
    public List<TaskView> history(String userId) { return tasks.history(userId).stream().map(this::view).toList(); }
    private TaskView sameRequest(TaskRow row, String fingerprint) {
        if (!row.requestFingerprint().equals(fingerprint)) throw new ApiException(409,"REQUEST_ID_CONFLICT","同一请求标识不能提交不同制作参数");
        return view(row);
    }
    private String fingerprint(TaskRequest request) {
        Map<String,Object> config = null;
        if (request.simulation() != null) {
            config = new TreeMap<>();
            config.put("failAtStage", String.valueOf(request.simulation().failAtStage()));
            config.put("stageDelayMs", request.simulation().stageDelayMs() == null ? Map.of() : new TreeMap<>(request.simulation().stageDelayMs()));
        }
        String canonical = write(List.of(request.templateId(), request.assetIds(), config == null ? "default" : config));
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
    private String write(Object value) { try { return json.writeValueAsString(value); } catch (JsonProcessingException ex) { throw new IllegalStateException(ex); } }
    private TaskView view(TaskRow row) {
        return new TaskView(row.id(),row.templateId(),row.templateTitle(),row.status(),row.stage(),row.createdAt(),row.startedAt(),row.finishedAt(),
                row.resultAssetId()==null ? null : "/api/assets/"+row.resultAssetId()+"/content", row.failedStage(),row.errorCode(),row.errorMessage(),row.version(),tasks.steps(row.id()));
    }
    public record TaskView(String id,String templateId,String templateTitle,String status,String stage,Instant createdAt,Instant startedAt,
            Instant finishedAt,String resultUrl,String failedStage,String errorCode,String errorMessage,long version,List<StepRow> steps) {}
}
