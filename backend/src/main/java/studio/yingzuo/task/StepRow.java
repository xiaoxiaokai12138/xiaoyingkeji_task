package studio.yingzuo.task;

import java.time.Instant;

public record StepRow(String taskId, String stage, String status, Instant startedAt, Instant finishedAt, String errorMessage) {}
