import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { query } from "./query.mjs";
import { archive } from "./archive.mjs";

test("offline query correlates request/response, endpoint shapes and filters", async t => {
  const dir = await mkdtemp(join(tmpdir(), "ppbui-evidence-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, "session.jsonl");
  const rows = [
    { kind: "evidence.format", schema: 1, exporter: "ppbui-probe" },
    { kind: "evidence.session", data: { id: "test-session", status: "stopped" } },
    { kind: "ui.click", data: { target: { menuId: "professions" } } },
    { kind: "http.request", data: { reqId: "r1", via: "fetch", method: "POST",
      url: "https://pokepixel.nietore.com/professions/farming/workers/assign",
      requestBody: { creature_id: 42, slot_index: 2 } } },
    { kind: "http.response", data: { reqId: "r1", status: 200 } },
    { kind: "http.body", data: { reqId: "r1", body: { data: { worker: { id: 42, slot: 2 } } } } },
    { kind: "http.request", data: { reqId: "r2", via: "xhr", method: "GET",
      url: "https://pokepixel.nietore.com/professions/farming/workforce", requestBody: null } },
    { kind: "http.body.skipped", data: { reqId: "r2", reason: "unknown_size" } },
    { kind: "http.request", data: { reqId: "r3", via: "fetch", method: "POST",
      url: "https://external.example/professions/farming/workers/assign",
      requestBody: { creature_id: 12 } } },
    { kind: "http.incomplete", data: { reqId: "r3", reason: "stop_before_response" } },
    { kind: "ws.in", data: { wsId: "sock1", payload: { event: "refresh" } } },
    { kind: "browser.http.request", data: { requestId: "cdp1", request: { method: "POST",
      url: "https://pokepixel.nietore.com/professions/farming/workers/remove",
      postData: { creature_id: 99 } } } },
    { kind: "browser.http.response", data: { requestId: "cdp1", response: { status: 204 } } },
    { kind: "browser.http.body", data: { requestId: "cdp1", result: { body: { removed: true } } } },
    { kind: "browser.http.request", data: { requestId: "cdp2", request: { method: "POST",
      url: "https://pokepixel.nietore.com/professions/farming/workers/assign",
      postData: { creature_id: 42, slot_index: 2 } } } },
    { kind: "browser.http.response", data: { requestId: "cdp2", response: { status: 200 } } },
  ];
  await writeFile(file, rows.map(row => JSON.stringify(row)).join("\n") + "\n");
  const result = await query(file, { kinds: ["http."], match: "farming", limit: 10 });
  assert.equal(result.invalid, 0);
  assert.equal(result.total, 14);
  assert.equal(result.timeline.length, 7);
  assert.equal(result.contracts.length, 5);
  const first = result.contracts.find(item => item.endpoint.startsWith("POST https://pokepixel.nietore.com") &&
    item.endpoint.includes("/assign") && item.source === "fetch");
  assert.equal(first.calls, 1);
  assert.deepEqual(first.statuses, { 200: 1 });
  assert.ok(first.requestFields.includes("slot_index"));
  assert.ok(first.responseFields.includes("data.worker.slot"));
  assert.equal(result.contracts.find(item => item.endpoint.includes("/workforce")).bodySkipped, 1);
  assert.equal(result.contracts.find(item => item.endpoint.includes("external.example")).incomplete, 1);
  const browserOnly = result.contracts.find(item => item.endpoint.includes("/workers/remove"));
  assert.equal(browserOnly.source, "cdp");
  assert.ok(browserOnly.requestFields.includes("creature_id"));
  assert.ok(browserOnly.responseFields.includes("removed"));
  const assignObservations = result.contracts.filter(item => item.endpoint.includes("pokepixel.nietore.com/professions/farming/workers/assign"));
  assert.deepEqual(assignObservations.map(item => item.source).sort(), ["cdp", "fetch"]);
  assert.ok(assignObservations.every(item => item.calls === 1));
  const cli = spawnSync(process.execPath, [fileURLToPath(new URL("./query.mjs", import.meta.url)), file, "--contracts"], {
    encoding: "utf8",
  });
  assert.equal(cli.status, 0, cli.stderr);
  assert.ok(JSON.parse(cli.stdout).contracts.some(item => item.endpoint.includes("/assign")));
});

test("archive stores immutable SHA-256 evidence, catalogues it and rejects corrupt lines", async t => {
  const dir = await mkdtemp(join(tmpdir(), "ppbui-evidence-archive-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const source = join(dir, "example.jsonl");
  const destination = join(dir, "archive");
  const rows = [
    { kind: "evidence.format", schema: 1, exporter: "ppbui-probe" },
    { kind: "evidence.session", data: { id: "test-archive-session", status: "stopped", events: 1 } },
    { kind: "ui.click", sessionId: "test-archive-session", documentId: "doc1",
      seq: 1, at: new Date().toISOString(), data: { target: { path: "button" } } },
  ];
  await writeFile(source, rows.map(row => JSON.stringify(row)).join("\n") + "\n");
  const one = await archive(source, "documented test", destination);
  const two = await archive(source, "duplicate test", destination);
  assert.equal(one.sha256, two.sha256);
  assert.equal((await stat(one.target)).size, one.events ? (await stat(source)).size : -1);
  const catalog = JSON.parse(await readFile(join(destination, "catalog.json"), "utf8"));
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].events, 1);
  assert.equal(catalog[0].label, "documented test");
  await writeFile(source, rows.map(row => JSON.stringify(row)).join("\n") + "\nINVALID");
  await assert.rejects(archive(source, "corrupt test", destination), /Arquivo inválido/);
  const duplicateSeq = [rows[0], rows[1], rows[2], { ...rows[2], data: { target: { path: "a" } } }];
  duplicateSeq[1] = { ...duplicateSeq[1], data: { ...duplicateSeq[1].data, events: 2 } };
  await writeFile(source, duplicateSeq.map(row => JSON.stringify(row)).join("\n") + "\n");
  await assert.rejects(archive(source, "duplicate seq", destination), /Sequência duplicada/);
});
