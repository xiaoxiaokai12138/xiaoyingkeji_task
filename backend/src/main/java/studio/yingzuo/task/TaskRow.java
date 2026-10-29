package studio.yingzuo.task;

import java.time.Instant;

public record TaskRow(String id, String userId, String templateId, String templateTitle, String clientRequestId,
        String requestFingerprint, String status, String stage, String simulationJson, String resultAssetId,
        String failedStage, String errorCode, String errorMessage, Instant createdAt, Instant startedAt,
        Instant finishedAt, long version) {}
