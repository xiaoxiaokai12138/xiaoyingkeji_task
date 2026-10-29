"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { request, ApiError } from "@/lib/http";
import type { Template } from "@/lib/types";
import { Feedback } from "@/components/feedback";

export default function TemplateDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const template = useQuery({ queryKey: ["template", id], queryFn: ({ signal }) => request<Template>(`/api/templates/${encodeURIComponent(id)}`, { signal }) });
  if (template.isPending) return <main><Feedback title="正在加载模板…" /></main>;
  if (template.isError) return <main><Link className="back-link" href="/">← 返回模板</Link><Feedback title={template.error instanceof ApiError && template.error.status === 404 ? "没有找到这个模板" : "模板暂时无法加载"} detail="返回模板列表，或尝试重新加载。" onRetry={() => { void template.refetch(); }} /></main>;
  const item = template.data;
  return <main className="workspace"><section className="creation-panel"><Link className="back-link" href="/">← 返回模板</Link><div className="detail-heading"><h1>{item.title}</h1><span className="category-label">{item.category}</span></div><div className="detail-art"><Image src={item.coverUrl} alt={`${item.title}模板示例`} fill sizes="(max-width: 760px) 90vw, 420px" unoptimized priority /></div><p className="template-description">{item.description}</p><section className="requirements"><h2>素材要求</h2><p>需要 {item.requiredImageCount} 张图片 · JPEG / PNG · 每张不超过 {item.maxFileSizeBytes / 1024 / 1024} MiB</p></section></section><section className="history-panel"><div className="section-heading"><h2>创作记录</h2></div><Feedback title="好作品，从一份灵感开始" detail="你的图片制作记录将在这里呈现。" /></section></main>;
}
