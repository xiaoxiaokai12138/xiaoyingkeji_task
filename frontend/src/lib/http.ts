export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const signal = init?.signal;
  const cancel = () => controller.abort(signal?.reason);
  if (signal?.aborted) cancel(); else signal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), 30000);
  try {
  const endpoint = typeof window === "undefined" ? url : new URL(url, window.location.origin).toString();
  const response = await fetch(endpoint, { ...init, signal: controller.signal, credentials: "same-origin", cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body?.code ?? "REQUEST_FAILED", body?.message ?? "请求暂时不可用，请稍后重试");
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
  } finally { clearTimeout(timeout); signal?.removeEventListener("abort", cancel); }
}
