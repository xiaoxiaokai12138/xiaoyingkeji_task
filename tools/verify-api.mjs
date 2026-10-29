import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

const origin = process.env.BASE_URL ?? "http://frontend:3000";
function client() {
  let cookie = "";
  return async function call(path, init = {}) {
    const headers = new Headers(init.headers);
    if (cookie) headers.set("Cookie", cookie);
    const response = await fetch(origin + path, { ...init, headers, signal: AbortSignal.timeout(15000) });
    const setCookie = response.headers.getSetCookie();
    if (setCookie.length) cookie = setCookie[0].split(";", 1)[0];
    const data = response.headers.get("content-type")?.includes("json") ? await response.json() : Buffer.from(await response.arrayBuffer());
    return { status: response.status, data };
  };
}
const alice = client(), bob = client();
async function login(call, name) {
  const response = await call("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ demoUserKey: name }) });
  assert.equal(response.status, 200);
}
await login(alice, "alice"); await login(bob, "bob");
const sample = await readFile(new URL("../demo-inputs/sample-1.png", import.meta.url));
const data = new FormData(); data.set("file", new Blob([sample], { type: "image/png" }), "sample.png"); data.set("templateId", "demo-portrait");
const upload = await alice("/api/assets", { method: "POST", body: data }); assert.equal(upload.status, 201);
assert.equal((await bob(upload.data.previewUrl)).status, 404);

async function submit(failAtStage) {
  const body = { templateId: "demo-portrait", assetIds: [upload.data.id], clientRequestId: randomUUID(), simulation: {
    failAtStage, stageDelayMs: { ASSET_CHECK: 400, GENERATE: 600, FINALIZE: 400 },
  } };
  const init = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  const response = await alice("/api/tasks", init); assert.equal(response.status, 202); assert.equal(response.data.status, "QUEUED");
  const repeated = await alice("/api/tasks", init); assert.equal(repeated.data.id, response.data.id);
  return response.data.id;
}
async function terminal(id) {
  const stages = new Set();
  for (let attempt = 0; attempt < 150; attempt++) {
    const response = await alice(`/api/tasks/${id}`); assert.equal(response.status, 200);
    if (response.data.stage) stages.add(response.data.stage);
    if (["SUCCEEDED", "FAILED"].includes(response.data.status)) return { task: response.data, stages: [...stages] };
    await delay(200);
  }
  throw new Error("Task did not terminate within observation window");
}
const successId = await submit(null);
const failureIds = [];
for (const stage of ["ASSET_CHECK", "GENERATE", "FINALIZE"]) failureIds.push([stage, await submit(stage)]);
const succeeded = await terminal(successId); assert.equal(succeeded.task.status, "SUCCEEDED");
assert.deepEqual(succeeded.task.steps.map(step => step.stage), ["ASSET_CHECK", "GENERATE", "FINALIZE"]);
const image = await alice(succeeded.task.resultUrl); assert.equal(image.status, 200); assert.deepEqual(image.data, sample);
assert.equal((await bob(`/api/tasks/${successId}`)).status, 404);
assert.equal((await bob(succeeded.task.resultUrl)).status, 404);
for (const [stage, id] of failureIds) {
  const failed = (await terminal(id)).task;
  assert.equal(failed.status, "FAILED"); assert.equal(failed.failedStage, stage); assert.equal(failed.errorCode, "SIMULATED_FAILURE");
  assert.equal(failed.steps.length, ["ASSET_CHECK", "GENERATE", "FINALIZE"].indexOf(stage) + 1);
}
const again = await alice(`/api/tasks/${successId}`); assert.equal(again.data.status, "SUCCEEDED"); assert.equal(again.data.version, succeeded.task.version);
const history = await alice("/api/tasks"); assert.equal(history.status, 200); assert.ok(history.data.some(task => task.id === successId));
console.log(JSON.stringify({ result: "PASS", cases: ["session", "upload", "idempotency", "background-pipeline", "three-failure-stages", "private-result", "history", "terminal-stability"], observedStages: succeeded.stages, successId, failureIds: failureIds.map(([stage,id]) => ({stage,id})) }, null, 2));
