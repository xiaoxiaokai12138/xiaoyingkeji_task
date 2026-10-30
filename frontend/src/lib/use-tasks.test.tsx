import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { useTasks } from "./use-tasks";
import { task } from "@/test/task-fixtures";

const server=setupServer();
const clients: QueryClient[]=[];
function wrapper() {
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0,refetchOnWindowFocus:false}}}); clients.push(client);
  return function Wrapper({children}:{children:React.ReactNode}) { return <QueryClientProvider client={client}>{children}</QueryClientProvider>; };
}
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
beforeAll(()=>server.listen({onUnhandledFrame:"error"}));
afterEach(()=>{cleanup();clients.splice(0).forEach(client=>client.clear());server.resetHandlers();});
afterAll(()=>server.close());

describe("多任务查询生命周期",()=>{
  it("各任务互不覆盖，终态分别停轮询，全部完成后不再查询",async()=>{
    let completeA=false, aCalls=0,bCalls=0;
    server.use(http.get("*/api/tasks",()=>HttpResponse.json([task("a"),task("b")])),
      http.get("*/api/tasks/a",()=>{aCalls++;return HttpResponse.json(task("a",completeA?{status:"SUCCEEDED",version:7,resultUrl:"/a.png"}:{status:"RUNNING",stage:"GENERATE",version:3}));}),
      http.get("*/api/tasks/b",()=>{bCalls++;return HttpResponse.json(task("b",{status:"FAILED",stage:"ASSET_CHECK",failedStage:"ASSET_CHECK",errorMessage:"素材检查失败",version:3}));}));
    const {result}=renderHook(()=>useTasks("alice",40),{wrapper:wrapper()});
    await waitFor(()=>{expect(result.current.tasks.find(t=>t.id==="a")?.status).toBe("RUNNING");expect(result.current.tasks.find(t=>t.id==="b")?.status).toBe("FAILED");});
    const finishedB=bCalls; await act(async()=>{await pause(120);}); expect(bCalls).toBe(finishedB);
    completeA=true;
    await waitFor(()=>expect(result.current.tasks.find(t=>t.id==="a")?.status).toBe("SUCCEEDED"));
    expect(result.current.tasks.find(t=>t.id==="a")?.resultUrl).toBe("/a.png");
    expect(result.current.tasks.find(t=>t.id==="b")?.resultUrl).toBeNull();
    const finishedA=aCalls; await act(async()=>{await pause(120);}); expect(aCalls).toBe(finishedA);expect(bCalls).toBe(finishedB);
  });
  it("503 保留处理中信息，暂停查询并允许手动恢复",async()=>{
    let failing=true,calls=0;
    server.use(http.get("*/api/tasks",()=>HttpResponse.json([task("a",{status:"RUNNING",stage:"GENERATE",version:3})])),
      http.get("*/api/tasks/a",()=>{calls++;return failing?HttpResponse.json({code:"TEMPORARY",message:"暂时不可用"},{status:503}):HttpResponse.json(task("a",{status:"SUCCEEDED",version:7,resultUrl:"/a.png"}));}));
    const {result}=renderHook(()=>useTasks("alice",40),{wrapper:wrapper()});
    await waitFor(()=>expect(result.current.errors.has("a")).toBe(true));
    expect(result.current.tasks[0].status).toBe("RUNNING");
    const stopped=calls;await act(async()=>{await pause(120);});expect(calls).toBe(stopped);
    failing=false;await act(async()=>{await result.current.retryTask("a");});
    await waitFor(()=>expect(result.current.tasks[0].status).toBe("SUCCEEDED"));expect(result.current.errors.has("a")).toBe(false);
  });
  it("切换用户取消旧请求，迟到响应不能进入新用户记录",async()=>{
    let identity="alice",aborted=false,entered=false;let release!:()=>void;
    const gate=new Promise<void>(resolve=>{release=resolve;});
    server.use(http.get("*/api/tasks",()=>HttpResponse.json([task(identity==="alice"?"a":"b")])),
      http.get("*/api/tasks/a",async({request})=>{entered=true;request.signal.addEventListener("abort",()=>{aborted=true;});await gate;return HttpResponse.json(task("a",{status:"SUCCEEDED",version:7}));}),
      http.get("*/api/tasks/b",()=>HttpResponse.json(task("b",{status:"SUCCEEDED",version:7,resultUrl:"/b.png"}))));
    const {result,rerender}=renderHook(({user})=>useTasks(user,40),{initialProps:{user:"alice"},wrapper:wrapper()});
    await waitFor(()=>expect(entered).toBe(true));identity="bob";rerender({user:"bob"});
    await waitFor(()=>expect(result.current.tasks[0]?.id).toBe("b"));
    await waitFor(()=>expect(aborted).toBe(true));
    await act(async()=>{release();await pause(30);});
    expect(result.current.tasks.map(t=>t.id)).toEqual(["b"]);
  });
  it("刷新时从历史恢复未完成任务，离页取消跟踪",async()=>{
    let calls=0,done=false;
    server.use(http.get("*/api/tasks",()=>HttpResponse.json([task("active",{status:"RUNNING",stage:"GENERATE",version:3}),task("done",{status:"SUCCEEDED",version:7})])),
      http.get("*/api/tasks/active",()=>{calls++;return HttpResponse.json(task("active",done?{status:"SUCCEEDED",version:7}:{status:"RUNNING",stage:"GENERATE",version:3}));}),
      http.get("*/api/tasks/done",()=>{throw new Error("不应自动查询已完成任务");}));
    const first=renderHook(()=>useTasks("alice",40),{wrapper:wrapper()});await waitFor(()=>expect(calls).toBeGreaterThan(0));first.unmount();
    const stopped=calls;await act(async()=>{await pause(100);});expect(calls).toBe(stopped);
    const refreshed=renderHook(()=>useTasks("alice",40),{wrapper:wrapper()});await waitFor(()=>expect(calls).toBeGreaterThan(stopped));done=true;
    await waitFor(()=>expect(refreshed.result.current.tasks.every(t=>t.status==="SUCCEEDED")).toBe(true));
  });
});
