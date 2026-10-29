"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Asset, Template } from "@/lib/types";
import { request, ApiError } from "@/lib/http";

export function UploadEditor({ template, disabled = false, onChange }: { template: Template; disabled?: boolean; onChange?: (assets: (Asset | null)[]) => void }) {
  const [assets, setAssets] = useState<(Asset | null)[]>(() => Array(template.requiredImageCount).fill(null));
  const values = useRef<(Asset | null)[]>(Array(template.requiredImageCount).fill(null));
  function ready(index: number, asset: Asset | null) {
    const next = [...values.current]; next[index] = asset; values.current = next; setAssets(next); onChange?.(next);
  }
  return <section className="upload-editor" aria-label="上传制作素材"><div className="section-heading"><h2>上传图片</h2><span className="subtle">{assets.filter(Boolean).length} / {template.requiredImageCount} 已准备</span></div><div className="upload-grid">{assets.map((_, index) => <UploadSlot key={index} index={index} template={template} disabled={disabled} onReady={asset => ready(index, asset)} />)}</div><p className="upload-help">JPEG / PNG · 每张不超过 {template.maxFileSizeBytes / 1024 / 1024} MiB</p></section>;
}

function UploadSlot({ index, template, disabled, onReady }: { index: number; template: Template; disabled: boolean; onReady: (asset: Asset | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const preview = useRef<string | null>(null);
  const serial = useRef(0);
  const [view, setView] = useState<{ preview: string | null; status: "empty" | "uploading" | "ready" | "error"; error?: string }>({ preview: null, status: "empty" });
  useEffect(() => () => { controller.current?.abort(); if (preview.current) URL.revokeObjectURL(preview.current); }, []);
  function clear() {
    serial.current++; controller.current?.abort();
    if (preview.current) URL.revokeObjectURL(preview.current);
    preview.current = null; onReady(null); setView({ preview: null, status: "empty" });
  }
  async function choose(file: File) {
    serial.current++; const attempt = serial.current; controller.current?.abort();
    if (preview.current) URL.revokeObjectURL(preview.current);
    preview.current = null; onReady(null);
    const error = !template.acceptedMimeTypes.includes(file.type) ? "请选择 JPEG 或 PNG 图片" : !file.size ? "图片不能为空" : file.size > template.maxFileSizeBytes ? "图片不能超过 5 MiB" : null;
    if (error) { setView({ preview: null, status: "error", error }); return; }
    const url = URL.createObjectURL(file); preview.current = url;
    const abort = new AbortController(); controller.current = abort;
    setView({ preview: url, status: "uploading" });
    const data = new FormData(); data.append("file", file); data.append("templateId", template.id);
    try {
      const asset = await request<Asset>("/api/assets", { method: "POST", body: data, signal: abort.signal });
      if (serial.current !== attempt || abort.signal.aborted) return;
      setView({ preview: asset.previewUrl, status: "ready" }); onReady(asset);
      URL.revokeObjectURL(url); preview.current = null;
    } catch (error) {
      if (serial.current !== attempt || abort.signal.aborted) return;
      setView({ preview: url, status: "error", error: error instanceof ApiError ? error.message : "上传失败，请检查网络后重新选择" });
    }
  }
  return <div className={`upload-slot ${view.status}`}>
    <input ref={input} type="file" hidden accept={template.acceptedMimeTypes.join(",")} aria-label={`第 ${index + 1} 张图片文件`} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void choose(file); }} />
    {view.preview ? <div className="upload-preview"><Image src={view.preview} alt={`第 ${index + 1} 张素材预览`} fill sizes="300px" unoptimized /></div> : <button className="upload-empty" disabled={disabled} onClick={() => input.current?.click()}><span aria-hidden="true">＋</span><strong>选择第 {index + 1} 张图片</strong><small>点击上传图片</small></button>}
    <div className="upload-status" role="status">{view.status === "uploading" ? "正在上传…" : view.status === "ready" ? "✓ 上传完成" : view.status === "error" ? <span className="error-message">{view.error}</span> : null}</div>
    {view.status !== "empty" && <div className="upload-actions"><button disabled={disabled} className="text-button" aria-label={`替换第 ${index + 1} 张图片`} onClick={() => input.current?.click()}>重新选择</button><button disabled={disabled} className="text-button" aria-label={`移除第 ${index + 1} 张图片`} onClick={clear}>移除</button></div>}
  </div>;
}
