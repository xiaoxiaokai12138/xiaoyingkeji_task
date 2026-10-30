import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { SessionProvider, useSession } from "./session";

const server=setupServer();const clients:QueryClient[]=[];
const originalClose=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,"close");
beforeAll(()=>{
  Object.defineProperty(HTMLDialogElement.prototype,"close",{configurable:true,value:function(this:HTMLDialogElement){this.open=false;}});
  server.listen({onUnhandledFrame:"error"});
});
afterEach(()=>{cleanup();clients.splice(0).forEach(client=>client.clear());server.resetHandlers();});
afterAll(()=>{server.close();if(originalClose)Object.defineProperty(HTMLDialogElement.prototype,"close",originalClose);else Reflect.deleteProperty(HTMLDialogElement.prototype,"close");});
function Identity(){const session=useSession();return <div><span>{session.user?.displayName??"访客"}</span>{session.error&&<p>{session.error}</p>}</div>;}

describe("身份请求异常边界",()=>{
  it("503 保留已知身份，401 才转为未登录",async()=>{
    let mode=200;
    server.use(http.get("*/api/session",()=>mode===200?HttpResponse.json({id:"alice",demoKey:"alice",displayName:"Alice"}):HttpResponse.json({code:"SESSION_REQUIRED",message:"请求不可用"},{status:mode})));
    const client=new QueryClient({defaultOptions:{queries:{retry:false}}});clients.push(client);
    render(<QueryClientProvider client={client}><SessionProvider><Identity/></SessionProvider></QueryClientProvider>);
    await screen.findByText("Alice");mode=503;
    await act(async()=>{await client.refetchQueries({queryKey:["session"],exact:true});});
    await screen.findByText("身份信息暂时无法加载");expect(screen.getByText("Alice")).toBeInTheDocument();
    mode=401;await act(async()=>{await client.refetchQueries({queryKey:["session"],exact:true});});
    await waitFor(()=>expect(screen.getByText("访客")).toBeInTheDocument());
  });
});
