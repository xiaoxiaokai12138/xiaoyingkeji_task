import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UploadEditor } from "./upload-editor";
import type { Asset, Template } from "@/lib/types";

const template: Template = { id: "demo", title: "示例", category: "测试", description: "", coverUrl: "/cover.svg", requiredImageCount: 1, acceptedMimeTypes: ["image/png"], maxFileSizeBytes: 1024 };
beforeEach(() => {
  let serial = 0;
  vi.stubGlobal("URL", class extends URL { static createObjectURL() { return `blob:preview-${++serial}`; } static revokeObjectURL = vi.fn(); });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("独立图片上传位", () => {
  it("校验失败不上传，并给出中文提示", () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    render(<UploadEditor template={template} />);
    fireEvent.change(screen.getByLabelText("第 1 张图片文件"), { target: { files: [new File(["x"], "bad.txt", { type: "text/plain" })] } });
    expect(screen.getByText("请选择 JPEG 或 PNG 图片")).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("替换时取消旧请求，迟到的旧响应不覆盖新素材", async () => {
    let first!: (response: Response) => void;
    let second!: (response: Response) => void;
    const fetcher = vi.fn().mockImplementationOnce(() => new Promise(resolve => { first = resolve; })).mockImplementationOnce(() => new Promise(resolve => { second = resolve; }));
    vi.stubGlobal("fetch", fetcher);
    const onChange = vi.fn();
    render(<UploadEditor template={template} onChange={onChange} />);
    const fileInput = screen.getByLabelText("第 1 张图片文件");
    fireEvent.change(fileInput, { target: { files: [new File(["a"], "a.png", { type: "image/png" })] } });
    fireEvent.change(fileInput, { target: { files: [new File(["b"], "b.png", { type: "image/png" })] } });
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
    const newer: Asset = { id: "new", previewUrl: "/new", mimeType: "image/png", sizeBytes: 1 };
    await act(async () => { second(new Response(JSON.stringify(newer))); });
    await waitFor(() => expect(screen.getByText("✓ 上传完成")).toBeInTheDocument());
    expect(new URL(screen.getByAltText("第 1 张素材预览").getAttribute("src")!, location.origin).pathname).toBe("/new");
    await act(async () => { first(new Response(JSON.stringify({ ...newer, id: "old" }))); });
    expect(onChange).toHaveBeenLastCalledWith([newer]);
    fireEvent.click(screen.getByLabelText("移除第 1 张图片"));
    expect(onChange).toHaveBeenLastCalledWith([null]);
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});
