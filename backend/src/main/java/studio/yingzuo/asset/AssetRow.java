package studio.yingzuo.asset;

import java.time.Instant;

public record AssetRow(String id, String userId, String purpose, String storagePath, String mimeType, long sizeBytes, Instant createdAt) {}
