"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/lib/http";
import type { Template } from "@/lib/types";
import { Feedback } from "@/components/feedback";

export default function Home() {
  const [category, setCategory] = useState("");
  const categories = useQuery({ queryKey: ["categories"], queryFn: ({ signal }) => request<string[]>("/api/templates/categories", { signal }) });
  const templates = useQuery({ queryKey: ["templates", category], queryFn: ({ signal }) => request<Template[]>(`/api/templates${category ? `?category=${encodeURIComponent(category)}` : ""}`, { signal }) });
  return <main className="library">
    <section className="library-intro"><div><p className="eyebrow">每一份灵感，都值得被看见</p><h1>把日常，变成不寻常。</h1><p>挑选喜欢的模板，上传照片，开始一次轻松的创作。</p></div><span className="intro-stamp" aria-hidden="true">一张照片<br/>一份灵感<br/><em>一个故事 ↗</em></span></section>
    <section aria-label="模板素材库">
      <div className="section-heading"><h2>发现灵感<span>精选模板</span></h2><span className="subtle">图片创作 · 本地模拟</span></div>
      <div className="category-tabs" role="group" aria-label="按模板分类筛选">{["", ...(categories.data ?? [])].map(item => <button key={item || "all"} aria-pressed={category === item} className={`category-tab ${category === item ? "active" : ""}`} onClick={() => setCategory(item)}>{item || "全部模板"}</button>)}</div>
      {categories.isError && <Feedback title="分类加载失败" detail="可以先浏览全部模板，或重新加载分类。" onRetry={() => { void categories.refetch(); }} />}
      {templates.isPending ? <Feedback title="正在寻找灵感…" /> : templates.isError ? <Feedback title="模板加载失败" detail="暂时无法获取模板，请检查服务后重试。" onRetry={() => { void templates.refetch(); }} /> : !templates.data.length ? <Feedback title="这个分类还没有模板" detail="试试其他分类，发现更多创作可能。" /> : <div className="template-grid">{templates.data.map((template, index) => <Link href={`/templates/${template.id}`} className="template-card" key={template.id}>
        <div className="template-art"><Image src={template.coverUrl} alt={`${template.title}模板示例`} fill sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 20vw" unoptimized priority={index < 3} /><span className="image-count">{template.requiredImageCount} 张图片</span><div className="card-overlay"><span>{template.category}</span><h3>{template.title}</h3><span className="card-action">开始创作 ↗</span></div></div>
      </Link>)}</div>}
    </section><footer className="site-footer"><span>映作 · 让灵感成为作品</span><span>使用模拟生成器，无需真实 AI 服务</span></footer>
  </main>;
}
