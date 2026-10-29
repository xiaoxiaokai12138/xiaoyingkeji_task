export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, credentials: "same-origin", cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body?.code ?? "REQUEST_FAILED", body?.message ?? "请求暂时不可用，请稍后重试");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
