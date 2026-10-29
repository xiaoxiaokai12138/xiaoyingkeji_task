import Link from "next/link";

export function Header() {
  return <header className="site-header"><Link href="/" className="brand" aria-label="映作，返回模板首页"><span className="brand-mark" aria-hidden="true">映</span><span>映作<span className="brand-sub">素材工作室</span></span></Link><nav aria-label="主导航"><Link href="/" className="nav-link">灵感模板</Link><span className="demo-badge">模拟创作体验</span></nav></header>;
}
