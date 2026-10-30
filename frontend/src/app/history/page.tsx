"use client";

import { TaskBoard } from "@/components/task-board";

export default function HistoryPage() {
  return <main className="history-page"><div className="history-intro"><p className="eyebrow">属于你的创作时刻</p><h1>我的创作</h1><p>查看每一次灵感的进度，也收藏已经完成的作品。</p></div><TaskBoard /></main>;
}
