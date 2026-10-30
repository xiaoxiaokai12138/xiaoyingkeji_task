"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request, ApiError } from "@/lib/http";
import type { User } from "@/lib/types";

type SessionContextValue = { user: User | null; busy: boolean; loading: boolean; error: string | null; openAccount: () => void };
const SessionContext = createContext<SessionContextValue | null>(null);
const personalKeys = new Set(["task", "tasks", "assets"]);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const changing = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const session = useQuery({ queryKey: ["session"], refetchOnWindowFocus: true, queryFn: async ({ signal }) => {
    try { return await request<User>("/api/session", { signal }); }
    catch (error) { if (error instanceof ApiError && error.status === 401) return null; throw error; }
  } });
  const demoUsers = useQuery({ queryKey: ["demo-users"], enabled: open, queryFn: ({ signal }) => request<User[]>("/api/demo-users", { signal }) });
  useEffect(() => { if (open && !dialog.current?.open) dialog.current?.showModal(); if (!open) dialog.current?.close(); }, [open]);
  const user = busy ? null : session.data ?? null;

  async function change(key: string | null) {
    if (changing.current) return;
    changing.current = true; setBusy(true); setActionError(null);
    await client.cancelQueries({ predicate: query => query.queryKey[0] === "session" || personalKeys.has(String(query.queryKey[0])) });
    client.removeQueries({ predicate: query => personalKeys.has(String(query.queryKey[0])) });
    try {
      const next = key === null ? await request<void>("/api/session", { method: "DELETE" }).then(() => null)
        : await request<User>("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ demoUserKey: key }) });
      client.setQueryData(["session"], next);
      setOpen(false);
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : "账户切换失败，请检查网络后重试");
      await client.refetchQueries({ queryKey: ["session"], exact: true });
    } finally { changing.current = false; setBusy(false); }
  }

  return <SessionContext.Provider value={{ user, busy, loading: session.isPending, error: session.isError ? "身份信息暂时无法加载" : null, openAccount: () => setOpen(true) }}>
    {children}
    <dialog ref={dialog} className="account-dialog" aria-labelledby="account-title" onCancel={() => setOpen(false)} onClose={() => setOpen(false)}>
      <div className="section-heading"><h2 id="account-title">选择演示账户</h2><button className="icon-button" aria-label="关闭账户窗口" onClick={() => setOpen(false)}>×</button></div>
      <p>每个账户拥有独立的素材和创作记录。切换后可随时回来继续查看。</p>
      <div className="account-list">{demoUsers.data?.map(item => <button className={`account-option ${session.data?.id === item.id ? "selected" : ""}`} key={item.id} disabled={busy} onClick={() => { void change(item.demoKey); }}><span className="avatar">{item.displayName.slice(0, 1)}</span><span>{item.displayName}<small>演示账户</small></span><span className="account-current">{session.data?.id === item.id ? "当前账户" : "选择 →"}</span></button>)}</div>
      {demoUsers.isPending && <p role="status">正在加载演示账户…</p>}
      {demoUsers.isError && <div role="alert"><p>账户列表加载失败</p><button className="button secondary" onClick={() => { void demoUsers.refetch(); }}>重新加载</button></div>}
      {actionError && <p className="error-message" role="alert">{actionError}</p>}
      {busy && <p role="status">正在切换账户…</p>}
      {session.data && <button className="button secondary account-logout" disabled={busy} onClick={() => { void change(null); }}>退出当前账户</button>}
      <p className="account-note">这是演示身份，不使用真实密码或个人信息。</p>
    </dialog>
  </SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("SessionProvider is required");
  return session;
}
