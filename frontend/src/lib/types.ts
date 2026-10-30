export interface Template {
  id: string;
  title: string;
  category: string;
  coverUrl: string;
  description: string;
  requiredImageCount: number;
  acceptedMimeTypes: string[];
  maxFileSizeBytes: number;
}

export interface User { id: string; demoKey: string; displayName: string; }
export interface Asset { id: string; previewUrl: string; mimeType: string; sizeBytes: number; }

export type Stage = "ASSET_CHECK" | "GENERATE" | "FINALIZE";
export type TaskStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
export interface TaskStep { taskId: string; stage: Stage; status: string; startedAt: string; finishedAt: string | null; errorMessage: string | null; }
export interface Task {
  id: string; templateId: string; templateTitle: string; status: TaskStatus; stage: Stage | null;
  createdAt: string; startedAt: string | null; finishedAt: string | null; resultUrl: string | null;
  failedStage: Stage | null; errorCode: string | null; errorMessage: string | null; version: number; steps: TaskStep[];
}
