import { describe, expect, it } from "vitest";
import { historyKey, mergeTasks, newest, taskKey } from "./tasks";
import { task } from "@/test/task-fixtures";

describe("任务快照合并", () => {
  it("拒绝过期响应、不同任务和终态回退", () => {
    const done = task("a", { status: "SUCCEEDED", version: 7, resultUrl: "/result" });
    expect(newest(done, task("a", { status: "RUNNING", version: 8 }))).toBe(done);
    expect(newest(done, task("b", { version: 99 }))).toBe(done);
    const running = task("a", { status: "RUNNING", version: 3 });
    expect(newest(running, task("a", { version: 2 }))).toBe(running);
  });
  it("旧历史响应不会移除刚受理的任务或覆盖较新的状态", () => {
    const current = [task("new",{version:2,status:"RUNNING"}),task("done",{version:7,status:"SUCCEEDED"})];
    const merged=mergeTasks([task("done",{version:1,status:"RUNNING"})],current);
    expect(merged).toBe(current); expect(merged.map(item => item.id)).toContain("new");
  });
  it("查询键同时区分用户和任务", () => {
    expect(taskKey("alice","1")).not.toEqual(taskKey("bob","1"));
    expect(taskKey("alice","1")).not.toEqual(taskKey("alice","2"));
    expect(historyKey("alice")).not.toEqual(historyKey("bob"));
  });
});
