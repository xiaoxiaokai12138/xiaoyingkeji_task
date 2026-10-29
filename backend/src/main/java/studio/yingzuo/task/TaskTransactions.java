package studio.yingzuo.task;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import studio.yingzuo.asset.AssetMapper;
import studio.yingzuo.asset.AssetRow;

@Service
public class TaskTransactions {
    private final TaskMapper tasks;
    private final AssetMapper assets;
    public TaskTransactions(TaskMapper tasks, AssetMapper assets) { this.tasks = tasks; this.assets = assets; }
    @Transactional public void recoverInterrupted() { tasks.interruptSteps(); tasks.interruptTasks(); }
    @Transactional public boolean claim(String id) { return tasks.claim(id) == 1; }
    @Transactional public void start(String id, Stage stage) {
        if (tasks.setStage(id, stage) != 1) throw new IllegalStateException("Task is no longer running");
        tasks.startStep(id, stage);
    }
    @Transactional public void complete(String id, Stage stage) { tasks.finishStep(id, stage); }
    @Transactional public void fail(String id, Stage stage, String code, String message) { tasks.failStep(id, stage, message); tasks.fail(id, code, message); }
    @Transactional public void succeed(String id, AssetRow result) {
        assets.insert(result);
        tasks.finishStep(id, Stage.FINALIZE);
        if (tasks.succeed(id, result.id()) != 1) throw new IllegalStateException("Task cannot transition to success");
    }
}
