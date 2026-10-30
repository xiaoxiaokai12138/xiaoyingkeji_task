import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { Asset, Task, Template } from "@/lib/types";
import { historyKey } from "@/lib/tasks";
import { task } from "@/test/task-fixtures";
import { CreationForm } from "./creation-form";

vi.mock("./upload-editor",()=>({UploadEditor:({onChange,disabled}:{onChange?:(assets:Asset[])=>void;disabled?:boolean})=><button disabled={disabled} onClick={()=>onChange?.([{id:"asset",previewUrl:"/asset.png",mimeType:"image/png",sizeBytes:10}])}>准备上传素材</button>}));
const server=setupServer();const clients:QueryClient[]=[];
const template:Template={id:"demo-portrait",title:"光影肖像",category:"人像风格",description:"",coverUrl:"/cover.svg",requiredImageCount:1,acceptedMimeTypes:["image/png"],maxFileSizeBytes:1024};
beforeAll(()=>server.listen({onUnhandledFrame:"error"}));
afterEach(()=>{cleanup();clients.splice(0).forEach(client=>client.clear());server.resetHandlers();});
afterAll(()=>server.close());
function form(){const client=new QueryClient({defaultOptions:{queries:{retry:false}}});clients.push(client);render(<QueryClientProvider client={client}><CreationForm template={template} user={{id:"alice",demoKey:"alice",displayName:"Alice"}} /></QueryClientProvider>);fireEvent.click(screen.getByText("准备上传素材"));return client;}

describe("任务受理与提交生命周期",()=>{
  it("提交中防重复，202 后释放按钮并保存等待任务",async()=>{
    let calls=0;let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
    server.use(http.post("*/api/tasks",async()=>{calls++;await gate;return HttpResponse.json(task("new"),{status:202});}));
    const client=form();const button=screen.getByRole("button",{name:"开始制作 ✦"});fireEvent.click(button);fireEvent.click(button);
    await waitFor(()=>expect(calls).toBe(1));expect(screen.getByRole("button",{name:"正在提交…"})).toBeDisabled();
    await act(async()=>{release();});
    await waitFor(()=>expect(screen.getByRole("button",{name:"开始制作 ✦"})).toBeEnabled());
    expect(client.getQueryData<Task[]>(historyKey("alice"))?.[0].status).toBe("QUEUED");
    expect(screen.getByText("任务已受理，可在右侧查看进度，也可以继续创建。")).toBeInTheDocument();
  });
  it("请求异常重试复用标识，成功后下一次制作使用新标识",async()=>{
    const ids:string[]=[];
    server.use(http.post("*/api/tasks",async({request})=>{const body=await request.json() as {clientRequestId:string};ids.push(body.clientRequestId);
      return ids.length===1?HttpResponse.json({code:"TEMPORARY",message:"网络暂时不可用"},{status:503}):HttpResponse.json(task(`task-${ids.length}`),{status:202});}));
    const client=form();fireEvent.click(screen.getByRole("button",{name:"开始制作 ✦"}));
    await screen.findByText("网络暂时不可用");fireEvent.click(screen.getByRole("button",{name:"开始制作 ✦"}));
    await screen.findByText("任务已受理，可在右侧查看进度，也可以继续创建。");
    expect(ids[0]).toBe(ids[1]);fireEvent.click(screen.getByRole("button",{name:"开始制作 ✦"}));
    await waitFor(()=>expect(client.getQueryData<Task[]>(historyKey("alice"))).toHaveLength(2));
    expect(ids[2]).not.toBe(ids[1]);
  });
});
