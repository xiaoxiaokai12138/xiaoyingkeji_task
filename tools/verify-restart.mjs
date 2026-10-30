import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

// Tokens stay in memory. The fixture printed by prepare contains only task IDs and a version.
const origin = process.env.BASE_URL ?? "http://frontend:3000";
let cookie = "";
async function call(path, init = {}) {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("Cookie", cookie);
  const response = await fetch(origin + path, { ...init, headers, signal: AbortSignal.timeout(15000) });
  const next = response.headers.getSetCookie();
  if (next.length) cookie = next[0].split(";", 1)[0];
  assert.ok(response.ok, `${path}: HTTP ${response.status}`);
  return response.headers.get("content-type")?.includes("json") ? response.json() : Buffer.from(await response.arrayBuffer());
}
await call("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ demoUserKey: "alice" }) });
const sample = await readFile(new URL("../demo-inputs/sample-1.png", import.meta.url));
async function until(id, predicate) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const task = await call(`/api/tasks/${id}`);
    if (predicate(task)) return task;
    await delay(100);
  }
  throw new Error(`Timed out observing ${id}`);
}
if (process.argv[2] === "prepare") {
  const data = new FormData();
  data.set("file", new Blob([sample], { type: "image/png" }), "restart-sample.png");
  data.set("templateId", "demo-portrait");
  const asset = await call("/api/assets", { method: "POST", body: data });
  async function submit(generateMs) {
    return call("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      templateId: "demo-portrait", assetIds: [asset.id], clientRequestId: randomUUID(),
      simulation: { stageDelayMs: { ASSET_CHECK: 100, GENERATE: generateMs, FINALIZE: 100 } },
    }) });
  }
  const completed = await submit(100);
  const terminal = await until(completed.id, task => task.status === "SUCCEEDED");
  const interrupted = await submit(30000);
  const running = await until(interrupted.id, task => task.status === "RUNNING" && task.stage === "GENERATE");
  assert.equal(running.steps.find(step => step.stage === "GENERATE").status, "RUNNING");
  const queued = await submit(100);
  assert.equal(queued.status, "QUEUED");
  console.log(JSON.stringify({ completedId: terminal.id, completedVersion: terminal.version, interruptedId: interrupted.id, queuedId: queued.id }));
} else if (process.argv[2] === "verify") {
  const fixture = JSON.parse(await readFile(process.env.FIXTURE_PATH ?? "/workspace/docs/restart.runtime.json", "utf8"));
  const interrupted = await call(`/api/tasks/${fixture.interruptedId}`);
  assert.equal(interrupted.status, "FAILED");
  assert.equal(interrupted.errorCode, "PROCESS_INTERRUPTED");
  assert.equal(interrupted.failedStage, "GENERATE");
  assert.deepEqual(interrupted.steps.map(step => [step.stage, step.status]), [["ASSET_CHECK", "SUCCEEDED"], ["GENERATE", "FAILED"]]);
  assert.ok(interrupted.errorMessage);
  const queued = await until(fixture.queuedId, task => task.status === "SUCCEEDED");
  assert.deepEqual(await call(queued.resultUrl), sample);
  const terminal = await call(`/api/tasks/${fixture.completedId}`);
  assert.equal(terminal.status, "SUCCEEDED");
  assert.equal(terminal.version, fixture.completedVersion);
  assert.deepEqual(await call(terminal.resultUrl), sample);
  const history = await call("/api/tasks");
  for (const id of [fixture.completedId, fixture.interruptedId, fixture.queuedId]) assert.ok(history.some(task => task.id === id));
  console.log(JSON.stringify({ result: "PASS", cases: ["interrupted-stage-failed", "later-stage-not-run", "queued-resumed", "terminal-unchanged", "persistent-result-bytes", "persistent-history"] }));
} else {
  throw new Error("Use prepare before forcibly restarting backend, then verify afterwards");
}
