package studio.yingzuo.template;

public record TemplateRow(String id, String title, String category, String description, String coverFile,
                          int requiredImageCount, String acceptedMimeTypes, long maxFileSizeBytes, int sortOrder) {}
