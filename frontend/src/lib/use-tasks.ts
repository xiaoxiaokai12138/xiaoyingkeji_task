"use client";

import { useEffect } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { request, ApiError } from "./http";
import type { Task } from "./types";
import { historyKey, isTerminal, mergeTasks, newest, taskKey } from "./tasks";

const empty: Task[] = [];
export function useTasks(userId: string | null, intervalMs = 2000) {
  const client = useQueryClient();
  const history = useQuery({
    queryKey: historyKey(userId), enabled: !!userId, refetchOnWindowFocus: true,
    queryFn: async ({ signal }) => {
      const incoming = await request<Task[]>("/api/tasks", { signal });
      return mergeTasks(incoming, client.getQueryData<Task[]>(historyKey(userId)));
    },
  });
  const rows = history.data ?? empty;
  const active = userId ? rows.filter(task => !isTerminal(task)) : empty;
  const observed = useQueries({ queries: active.map(seed => ({
    queryKey: taskKey(userId!, seed.id),
    initialData: seed,
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const incoming = await request<Task>(`/api/tasks/${encodeURIComponent(seed.id)}`, { signal });
      if (incoming.id !== seed.id) throw new ApiError(502,"TASK_RESPONSE_MISMATCH","任务响应不匹配，请恢复查询");
      return newest(client.getQueryData<Task>(taskKey(userId!, seed.id)), incoming);
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: (query: { state: { status: string; data?: Task } }) => query.state.status === "error" || (query.state.data && isTerminal(query.state.data)) ? false : intervalMs,
    staleTime: (query: { state: { data?: Task } }) => query.state.data && isTerminal(query.state.data) ? Infinity : 0,
  })) });

  useEffect(() => {
    if (!userId || !observed.length) return;
    const latest = observed.flatMap(query => query.data ? [query.data] : []);
    const current = client.getQueryData<Task[]>(historyKey(userId)) ?? empty;
    const merged = mergeTasks(latest, current);
    if (merged !== current) client.setQueryData(historyKey(userId), merged);
  }, [client, userId, observed]);

  const errors = new Map(active.flatMap((task,index) => observed[index]?.isError ? [[task.id, observed[index].error] as const] : []));
  return {
    tasks: rows, loading: history.isPending && !!userId, historyError: history.isError, refreshing: history.isFetching,
    refresh: () => history.refetch(), errors,
    retryTask: (id: string) => observed[active.findIndex(task => task.id === id)]?.refetch(),
  };
}
