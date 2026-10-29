package studio.yingzuo.task;

import java.io.IOException;
import java.nio.file.Files;
import org.springframework.stereotype.Component;
import studio.yingzuo.asset.*;
import studio.yingzuo.api.ApiException;

@Component
public class GenerationEngine {
    private final TaskMapper tasks;
    private final AssetService assets;
    public GenerationEngine(TaskMapper tasks, AssetService assets) { this.tasks=tasks; this.assets=assets; }
    public AssetRow perform(Stage stage, TaskRow task) throws IOException {
        var ids = tasks.assetIds(task.id());
        if (ids.isEmpty()) throw new ApiException(400,"ASSET_UNAVAILABLE","任务素材缺失，请检查上传记录");
        if (stage == Stage.ASSET_CHECK) {
            for (String id : ids) {
                AssetRow asset = assets.requireOwned(id, task.userId());
                if (!Files.isRegularFile(assets.path(asset)) || !Files.isReadable(assets.path(asset)))
                    throw new ApiException(400,"ASSET_UNAVAILABLE","素材文件已不可用，制作无法继续");
            }
        }
        // The generation phase is deliberately simulated. Finalization copies the first input.
        return stage == Stage.FINALIZE ? assets.copyAsResult(assets.requireOwned(ids.getFirst(), task.userId())) : null;
    }
    public void discard(AssetRow result) throws IOException { Files.deleteIfExists(assets.path(result)); }
}
