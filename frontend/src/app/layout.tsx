import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "映作 · 素材工作室", description: "上传灵感，制作属于你的图片素材" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
