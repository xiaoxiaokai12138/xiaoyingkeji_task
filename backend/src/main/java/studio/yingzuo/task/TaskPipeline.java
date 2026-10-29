package studio.yingzuo.task;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import studio.yingzuo.asset.AssetRow;
import studio.yingzuo.api.ApiException;

@Service
public class TaskPipeline {
    private static final Logger log = LoggerFactory.getLogger(TaskPipeline.class);
    private final TaskMapper mapper;
    private final TaskTransactions transactions;
    private final GenerationEngine engine;
    private final StageDelay delay;
    private final ObjectMapper json;
    public TaskPipeline(TaskMapper mapper, TaskTransactions transactions, GenerationEngine engine, StageDelay delay, ObjectMapper json) {
        this.mapper=mapper; this.transactions=transactions; this.engine=engine; this.delay=delay; this.json=json;
    }
    public void execute(String id) {
        TaskRow task = mapper.byId(id);
        Stage current = Stage.ASSET_CHECK;
        AssetRow prepared = null;
        try {
            var config = json.readValue(task.simulationJson(), SimulationConfig.Snapshot.class);
            for (Stage stage : Stage.values()) {
                current = stage;
                transactions.start(id, stage);
                log.info("Task {} stage {} started", id, stage);
                delay.pause(config.stageDelayMs().get(stage));
                if (stage == config.failAtStage()) throw new SimulatedFailure(stage.label()+"阶段按模拟配置失败");
                AssetRow result = engine.perform(stage, task);
                if (stage == Stage.FINALIZE) {
                    prepared = result;
                    transactions.succeed(id, result);
                    prepared = null;
                } else transactions.complete(id, stage);
                log.info("Task {} stage {} completed", id, stage);
            }
        } catch (Exception ex) {
            boolean interrupted = ex instanceof InterruptedException;
            if (interrupted) Thread.currentThread().interrupt();
            String code = interrupted ? "PROCESS_INTERRUPTED" : ex instanceof SimulatedFailure ? "SIMULATED_FAILURE" : ex instanceof ApiException api ? api.code() : "GENERATION_ERROR";
            String message = interrupted ? "服务进程中断，任务未完成" : ex instanceof SimulatedFailure || ex instanceof ApiException ? ex.getMessage() : current.label()+"阶段发生错误，请查看服务日志";
            if (prepared != null) try { engine.discard(prepared); } catch (Exception cleanup) { log.warn("Cannot clean prepared result for {}", id, cleanup); }
            transactions.fail(id, current, code, message);
            log.warn("Task {} failed at {}: {}", id, current, message, ex);
        }
    }
    private static class SimulatedFailure extends RuntimeException { SimulatedFailure(String message) { super(message); } }
}
