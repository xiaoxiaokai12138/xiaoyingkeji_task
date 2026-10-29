package studio.yingzuo.task;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name="worker.enabled",havingValue="true",matchIfMissing=true)
public class TaskWorker implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(TaskWorker.class);
    private final TaskMapper mapper;
    private final TaskTransactions transactions;
    private final TaskPipeline pipeline;
    private volatile boolean ready;
    public TaskWorker(TaskMapper mapper, TaskTransactions transactions, TaskPipeline pipeline) { this.mapper=mapper; this.transactions=transactions; this.pipeline=pipeline; }
    @Override public void run(ApplicationArguments args) { transactions.recoverInterrupted(); ready=true; }
    @Scheduled(fixedDelayString="${worker.poll-ms:500}")
    public void poll() {
        if (!ready) return;
        try {
            String id = mapper.nextQueued();
            if (id != null && transactions.claim(id)) pipeline.execute(id);
        } catch (Exception ex) { log.error("Task worker iteration failed; next iteration will retry",ex); }
    }
}
