import type { Stage, Task } from "./types";

export const stages: Stage[] = ["ASSET_CHECK", "GENERATE", "FINALIZE"];
export const stageLabels: Record<Stage, string> = { ASSET_CHECK: "素材检查", GENERATE: "模拟生成", FINALIZE: "结果整理" };
export const statusLabels = { QUEUED: "等待处理", RUNNING: "处理中", SUCCEEDED: "制作成功", FAILED: "制作失败" };
export const isTerminal = (task: Task) => task.status === "SUCCEEDED" || task.status === "FAILED";
export const taskKey = (userId: string, taskId: string) => ["task", userId, taskId] as const;
export const historyKey = (userId: string | null) => ["tasks", userId] as const;

export function newest(current: Task | undefined, incoming: Task): Task {
  if (!current) return incoming;
  if (current.id !== incoming.id || isTerminal(current) || incoming.version <= current.version) return current;
  return incoming;
}
export function mergeTasks(incoming: Task[], current: Task[] = []): Task[] {
  const map = new Map(current.map(task => [task.id, task]));
  let changed = false;
  for (const task of incoming) {
    const previous = map.get(task.id), next = newest(previous, task);
    if (next !== previous) { map.set(task.id, next); changed = true; }
  }
  return changed ? [...map.values()].sort((a,b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)) : current;
}
