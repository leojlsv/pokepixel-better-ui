import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importIncoming } from "./import-incoming.mjs";

function sessionFile(sessionId, events) {
  const rows = [
    { kind: "evidence.format", schema: 1, exporter: "ppbui-probe" },
    { kind: "evidence.session", data: { id: sessionId, status: "stopped", events: events.length } },
    ...events.map((event, index) => ({
      ...event, sessionId, documentId: "document", seq: index + 1,
      at: "2026-09-28T18:00:00.000Z",
    })),
  ];
  return rows.map(row => JSON.stringify(row)).join("\n") + "\n";
}

test("incoming import is idempotent, indexes only unique captures and never emits payload values", async t => {
  const root = await mkdtemp(join(tmpdir(), "ppbui-evidence-incoming-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const incoming = join(root, "incoming");
  await mkdir(incoming);
  const first = sessionFile("farm-session-a", [
    { kind: "http.request", data: { reqId: "r1", via: "fetch", method: "GET",
      url: "https://pokepixel.nietore.com/api/v1/professions/farming/workforce?player=private-value" } },
    { kind: "http.response", data: { reqId: "r1", status: 200 } },
    { kind: "http.body.skipped", data: { reqId: "r1", reason: "stream_exceeds_body_limit" } },
    { kind: "http.request", data: { reqId: "r2", via: "fetch", method: "POST",
      url: "https://pokepixel.nietore.com/api/v1/professions/farming/workers/remove",
      requestBody: { slot_index: 2, secret: "DO_NOT_EXPOSE" } } },
    { kind: "http.incomplete", data: { reqId: "r2", reason: "stop_before_response" } },
    { kind: "http.request", data: { reqId: "r3", via: "fetch", method: "GET",
      url: "https://pokepixel.nietore.com/api/v1/professions/farming/workers/123e4567-e89b-12d3-a456-426614174000?x=DO_NOT_EXPOSE" } },
  ]);
  const second = sessionFile("farm-session-b", [
    { kind: "http.request", data: { reqId: "r1", via: "fetch", method: "POST",
      url: "https://pokepixel.nietore.com/api/v1/professions/farming/rewards/collect",
      requestBody: { slot_index: 1 } } },
    { kind: "http.response", data: { reqId: "r1", status: 200 } },
    { kind: "http.body", data: { reqId: "r1", body: { ok: true, reward: "DO_NOT_EXPOSE" } } },
  ]);
  await writeFile(join(incoming, "a.jsonl"), first);
  await writeFile(join(incoming, "duplicate.jsonl"), first);
  await writeFile(join(incoming, "b.json"), second);
  await writeFile(join(incoming, "broken.jsonl"), "not JSONL\n");

  const once = await importIncoming({ root, incoming });
  assert.deepEqual({ inputs: once.inputs, imported: once.imported, duplicates: once.duplicates, sessions: once.sessions },
    { inputs: 4, imported: 2, duplicates: 1, sessions: 2 });
  assert.deepEqual(once.failures, ["broken.jsonl"]);
  assert.equal(once.events, 9);
  const index = JSON.parse(await readFile(join(root, "contracts-index.json"), "utf8"));
  assert.equal(index.complete, false);
  assert.equal(index.requestsObserved, 4);
  const workforce = index.endpoints.find(item => item.methodPath === "GET /api/v1/professions/farming/workforce?player");
  assert.equal(workforce.calls, 1);
  assert.equal(workforce.bodySkipped, 1);
  const remove = index.endpoints.find(item => item.methodPath.endsWith("/farming/workers/remove"));
  assert.equal(remove.incomplete, 1);
  assert.equal(remove.calls, 1);
  assert.deepEqual(remove.requestFields, ["secret", "slot_index"]);
  assert.equal(JSON.stringify(index).includes("DO_NOT_EXPOSE"), false);
  assert.equal(JSON.stringify(index).includes("private-value"), false);
  assert.equal(JSON.stringify(index).includes("123e4567-e89b-12d3-a456-426614174000"), false);
  const report = JSON.parse(await readFile(join(root, "import-report.json"), "utf8"));
  assert.equal(JSON.stringify(report).includes("DO_NOT_EXPOSE"), false);
  assert.equal(JSON.stringify(report).includes("123e4567-e89b-12d3-a456-426614174000"), false);
  assert.equal((await readdir(incoming)).length, 4, "incoming originals remain intact");
  const again = await importIncoming({ root, incoming });
  assert.equal(again.duplicates, 1);
  assert.equal(again.events, once.events);
  const catalog = JSON.parse(await readFile(join(root, "catalog.json"), "utf8"));
  assert.equal(catalog.length, 2);
});

test("different exports of one session cannot silently double-count its requests", async t => {
  const root = await mkdtemp(join(tmpdir(), "ppbui-evidence-overlap-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const incoming = join(root, "incoming");
  await mkdir(incoming);
  const events = [{ kind: "http.request", data: { reqId: "r1", via: "fetch", method: "GET",
    url: "https://pokepixel.nietore.com/api/v1/professions/farming/workforce" } }];
  await writeFile(join(incoming, "early.jsonl"), sessionFile("same-session", events));
  await writeFile(join(incoming, "later.jsonl"), sessionFile("same-session", [...events,
    { kind: "http.incomplete", data: { reqId: "r1", reason: "stop_before_response" } }]));
  const outcome = await importIncoming({ root, incoming });
  assert.deepEqual(outcome.overlappingSessions, ["same-session"]);
  const index = JSON.parse(await readFile(join(root, "contracts-index.json"), "utf8"));
  assert.equal(index.complete, false);
  assert.equal(index.requestsObserved, 0, "uncertain overlapping exports are excluded from totals");
});
