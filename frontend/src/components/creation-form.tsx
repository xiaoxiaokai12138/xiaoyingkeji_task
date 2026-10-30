"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Asset, Stage, Task, Template, User } from "@/lib/types";
import { request, ApiError } from "@/lib/http";
import { historyKey, mergeTasks, stageLabels, stages } from "@/lib/tasks";
import { UploadEditor } from "./upload-editor";

export function CreationForm({ template, user }: { template: Template; user: User }) {
  const client = useQueryClient();
  const [assets, setAssets] = useState<(Asset | null)[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [failure, setFailure] = useState<Stage | "">("");
  const [delays, setDelays] = useState<Record<Stage,string>>({ ASSET_CHECK: "2000", GENERATE: "2000", FINALIZE: "2000" });
  const pending = useRef<{ signature: string; id: string } | null>(null);
  const sending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const ready = assets.length === template.requiredImageCount && assets.every(Boolean);
  const invalidDelay = advanced && stages.some(stage => !delays[stage].trim() || !Number.isInteger(Number(delays[stage])) || Number(delays[stage]) < 0 || Number(delays[stage]) > 30000);

  async function submit() {
    if (sending.current || !ready || invalidDelay) return;
    sending.current = true; setSubmitting(true); setMessage(null);
    const simulation = advanced ? { failAtStage: failure || null, stageDelayMs: Object.fromEntries(stages.map(stage => [stage,Number(delays[stage])])) } : undefined;
    const payload = { templateId: template.id, assetIds: assets.map(asset => asset!.id), simulation };
    const signature = JSON.stringify(payload);
    const submission = pending.current?.signature === signature ? pending.current : { signature, id: crypto.randomUUID() };
    pending.current = submission;
    const abort = new AbortController(); controller.current = abort;
    try {
      const task = await request<Task>("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, clientRequestId: submission.id }), signal: abort.signal });
      if (abort.signal.aborted) return;
      client.setQueryData<Task[]>(historyKey(user.id), previous => mergeTasks([task],previous));
      void client.invalidateQueries({ queryKey: historyKey(user.id), exact: true });
      pending.current = null;
      setMessage({ error: false, text: "任务已受理，可在创作记录中查看进度，也可以继续创建。" });
    } catch (error) {
      if (abort.signal.aborted) return;
      setMessage({ error: true, text: error instanceof ApiError ? error.message : "提交请求未能确认，请检查网络后重试。同一次重试不会重复创建任务。" });
    } finally { sending.current = false; if (!abort.signal.aborted) setSubmitting(false); }
  }
  return <div className="creation-form">
    <UploadEditor template={template} disabled={submitting} onChange={setAssets} />
    <details className="simulation-controls"><summary>演示设置</summary>
      <label className="checkbox-label"><input type="checkbox" checked={advanced} disabled={submitting} onChange={event => setAdvanced(event.target.checked)} />启用本次任务的模拟参数</label>
      <fieldset disabled={!advanced || submitting}><legend className="sr-only">模拟参数</legend><label>指定失败阶段<select value={failure} onChange={event => setFailure(event.target.value as Stage | "")}><option value="">全部成功</option>{stages.map(stage => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}</select></label><div className="delay-fields">{stages.map(stage => <label key={stage}>{stageLabels[stage]}（毫秒）<input type="number" min="0" max="30000" step="100" value={delays[stage]} onChange={event => setDelays({ ...delays, [stage]: event.target.value })} /></label>)}</div></fieldset>
      {invalidDelay && <p className="error-message" role="alert">每阶段耗时需要是 0～30000 的整数。</p>}
    </details>
    <div className="submit-area"><button className="button create-button" disabled={!ready || submitting || invalidDelay} onClick={() => { void submit(); }}>{submitting ? "正在提交…" : "开始制作 ✦"}</button><p>{ready ? "任务受理后会继续后台处理，无需停留等待。" : `请先准备好 ${template.requiredImageCount} 张图片。`}</p></div>
    {message && <p className={message.error ? "error-message submit-message" : "success-message submit-message"} role={message.error ? "alert" : "status"}>{message.text}</p>}
  </div>;
}
