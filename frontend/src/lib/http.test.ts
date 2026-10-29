import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, request } from "./http";

afterEach(() => vi.unstubAllGlobals());
describe("API 请求边界", () => {
  it("保留后端业务错误码及 HTTP 状态", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "INVALID_ASSET", message: "素材无效" }), { status: 400 })));
    await expect(request("/api/tasks")).rejects.toMatchObject({ status: 400, code: "INVALID_ASSET", message: "素材无效" });
  });
  it("代理返回非 JSON 时仍提供可理解的请求错误", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Bad Gateway", { status: 502 })));
    await expect(request("/api/tasks/1")).rejects.toBeInstanceOf(ApiError);
    await expect(request("/api/tasks/1")).rejects.toMatchObject({ status: 502, code: "REQUEST_FAILED" });
  });
  it("网络异常保持为请求异常，未伪造任务执行失败", async () => {
    const error = new TypeError("Failed to fetch");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
    await expect(request("/api/tasks/1")).rejects.toBe(error);
  });
  it("删除会话 204 不尝试解析不存在的 JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(request("/api/session", { method: "DELETE" })).resolves.toBeUndefined();
  });
});
