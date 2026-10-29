package studio.yingzuo.task;

import java.util.List;
import java.util.Map;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record TaskRequest(@NotBlank @Size(max=64) String templateId,
        @NotNull @Size(min=1,max=10) List<@NotBlank @Size(max=36) String> assetIds,
        @NotBlank @Pattern(regexp="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}") String clientRequestId,
        @Valid Simulation simulation) {
    public record Simulation(Stage failAtStage, Map<Stage, @NotNull @Min(0) @Max(30000) Integer> stageDelayMs) {}
}
