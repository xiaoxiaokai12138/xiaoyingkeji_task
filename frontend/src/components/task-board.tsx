"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useSession } from "./session";
import { Feedback } from "./feedback";
import { useTasks } from "@/lib/use-tasks";
import { stageLabels, stages, statusLabels } from "@/lib/tasks";
import type { Task } from "@/lib/types";

export function TaskBoard() {
  const session = useSession();
  const jobs = useTasks(session.user?.id ?? null);
  return <section className="history-panel" aria-label="个人创作记录">
    <div className="section-heading"><h2>创作记录 <span>{jobs.tasks.length} 个任务</span></h2><button className="icon-button" aria-label="刷新创作记录" disabled={!session.user || jobs.refreshing} onClick={() => { void jobs.refresh(); }}>↻</button></div>
    {session.loading ? <Feedback title="正在恢复身份…" /> : !session.user ? <div><Feedback title="你的灵感，值得被收藏" detail={session.error ?? "选择演示账户，查看属于自己的创作记录。"} /><button className="button secondary" onClick={session.openAccount}>选择账户</button></div> : jobs.loading ? <Feedback title="正在加载创作记录…" /> : <>
      {jobs.historyError && <div className="query-warning" role="alert"><p>记录刷新失败，已保留现有信息。</p><button className="text-button" onClick={() => { void jobs.refresh(); }}>恢复查询</button></div>}
      {!jobs.tasks.length && !jobs.historyError && <Feedback title="还没有创作记录" detail="上传喜欢的图片，制作第一份作品吧。" />}
      <div className="task-grid">{jobs.tasks.map(task => <TaskCard key={task.id} task={task} queryError={jobs.errors.has(task.id)} retry={() => { void jobs.retryTask(task.id); }} />)}</div>
    </>}
  </section>;
}

function TaskCard({ task, queryError, retry }: { task: Task; queryError: boolean; retry: () => void }) {
  const current = task.stage ? stages.indexOf(task.stage) : -1;
  const created = new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(task.createdAt));
  return <article className={`task-card ${task.status.toLowerCase()}`} aria-label={`${task.templateTitle}任务，${statusLabels[task.status]}`}>
    {task.status === "SUCCEEDED" && task.resultUrl ? <ResultPreview task={task} /> : <div className="task-placeholder"><span className={task.status === "RUNNING" ? "progress-orbit" : "placeholder-symbol"} aria-hidden="true">{task.status === "FAILED" ? "!" : task.status === "QUEUED" ? "◷" : "✧"}</span><strong>{task.status === "RUNNING" && task.stage ? `正在${stageLabels[task.stage]}…` : statusLabels[task.status]}</strong><small>{task.status === "QUEUED" ? "任务已保存，即将开始处理" : task.status === "FAILED" ? "本次制作已停止" : "可以继续浏览或创建其他任务"}</small></div>}
    <div className="task-body"><div className="task-title"><h3>{task.templateTitle}</h3><span className={`status-badge ${task.status.toLowerCase()}`}>{statusLabels[task.status]}</span></div><time dateTime={task.createdAt}>{created}</time>
      <ol className="task-stages" aria-label="处理阶段">{stages.map((stage,index) => <li key={stage} className={task.status === "SUCCEEDED" || index < current ? "done" : current === index ? task.status === "FAILED" ? "failed" : "active" : ""}><span aria-hidden="true">{task.status === "SUCCEEDED" || index < current ? "✓" : String(index+1).padStart(2,"0")}</span>{stageLabels[stage]}</li>)}</ol>
      {task.status === "FAILED" && <p className="task-failure">{task.failedStage && <strong>失败阶段：{stageLabels[task.failedStage]}<br/></strong>}{task.errorMessage || "制作未完成，请查看失败记录。"}</p>}
      {queryError && <div className="query-warning" role="alert"><p>状态更新失败，保留上次信息。</p><button className="text-button" aria-label={`恢复${task.templateTitle}任务${task.id.slice(0,6)}的查询`} onClick={retry}>恢复查询</button></div>}
      <span className="task-id">任务 {task.id.slice(0,8)}</span>
    </div>
  </article>;
}

function ResultPreview({ task }: { task: Task }) {
  const [open,setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); },[open]);
  return <><button className="result-thumbnail" aria-label={`预览${task.templateTitle}的制作结果`} onClick={() => setOpen(true)}><Image src={task.resultUrl!} alt={`${task.templateTitle}制作结果`} fill sizes="(max-width: 760px) 90vw, 300px" unoptimized /><span>预览作品 ↗</span></button>
    <dialog ref={dialog} className="result-dialog" aria-label={`${task.templateTitle}制作结果预览`} onCancel={() => setOpen(false)} onClose={() => setOpen(false)}><div className="section-heading"><h2>{task.templateTitle} · 制作结果</h2><button className="icon-button" aria-label="关闭结果预览" onClick={() => setOpen(false)}>×</button></div><Image src={task.resultUrl!} alt={`${task.templateTitle}完整制作结果`} width={1200} height={900} unoptimized /><p>模拟制作结果，可随时在个人记录中查看。</p></dialog>
  </>;
}
