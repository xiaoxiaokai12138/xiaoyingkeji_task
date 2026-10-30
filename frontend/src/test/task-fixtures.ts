import type { Task } from "@/lib/types";

export function task(id: string, overrides: Partial<Task> = {}): Task {
  return { id, templateId: "demo-portrait", templateTitle: "光影肖像", status: "QUEUED", stage: null,
    createdAt: "2026-10-29T12:00:00Z", startedAt: null, finishedAt: null, resultUrl: null,
    failedStage: null, errorCode: null, errorMessage: null, version: 0, steps: [], ...overrides };
}
