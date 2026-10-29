package studio.yingzuo.task;

import java.util.EnumMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import studio.yingzuo.api.ApiException;

@Component
public class SimulationConfig {
    private final boolean demo;
    private final Map<Stage,Integer> defaults;
    public SimulationConfig(@Value("${DEMO_MODE:true}") boolean demo,
            @Value("${SIMULATION_ASSET_CHECK_MS:2000}") int check,
            @Value("${SIMULATION_GENERATE_MS:2000}") int generate,
            @Value("${SIMULATION_FINALIZE_MS:2000}") int finalizeMs) {
        this.demo = demo;
        this.defaults = Map.of(Stage.ASSET_CHECK, check, Stage.GENERATE, generate, Stage.FINALIZE, finalizeMs);
        if (defaults.values().stream().anyMatch(ms -> ms < 0 || ms > 30000)) throw new IllegalArgumentException("Simulation delays must be 0..30000 ms");
    }
    public Snapshot resolve(TaskRequest.Simulation input) {
        if (input != null && !demo) throw new ApiException(403, "SIMULATION_OVERRIDE_DISABLED", "当前环境不允许覆盖模拟参数");
        EnumMap<Stage,Integer> delays = new EnumMap<>(Stage.class); delays.putAll(defaults);
        if (input != null && input.stageDelayMs() != null) delays.putAll(input.stageDelayMs());
        if (delays.values().stream().anyMatch(ms -> ms == null || ms < 0 || ms > 30000)) throw new ApiException(400,"INVALID_DELAY","阶段耗时必须为 0～30000 毫秒");
        return new Snapshot(input == null ? null : input.failAtStage(), delays);
    }
    public record Snapshot(Stage failAtStage, Map<Stage,Integer> stageDelayMs) {}
}
