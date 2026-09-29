import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const source = await readFile(new URL("./pokepixel-evidence-probe.user.js", import.meta.url), "utf8");
let nextUuid = 0;

// Small asynchronous IndexedDB fixture: tests event persistence and transaction
// ordering, without requiring a live game or extending production dependencies.
function fakeIndexedDB() {
  const rows = new Map();
  const sessions = new Map();
  let nextId = 1;
  const database = {
    objectStoreNames: { contains: name => name === "sessions" || name === "records" },
    createObjectStore() { throw new Error("stores already created"); },
    transaction() {
      let pending = 0;
      const tx = { oncomplete: null, onerror: null, onabort: null };
      let closeTimer;
      function issue(read) {
        const req = { result: undefined, error: null, onsuccess: null, onerror: null };
        pending++;
        queueMicrotask(() => {
          try {
            req.result = read();
            req.onsuccess?.();
          } catch (error) {
            req.error = error;
            req.onerror?.();
            tx.onerror?.();
          }
          pending--;
          clearTimeout(closeTimer);
          closeTimer = setTimeout(() => { if (!pending) tx.oncomplete?.(); }, 0);
        });
        return req;
      }
      const store = name => ({
        add(value) { return issue(() => {
          if (name === "sessions") sessions.set(value.id, structuredClone(value));
          else rows.set(nextId++, structuredClone(value));
        }); },
        put(value) { return issue(() => { sessions.set(value.id, structuredClone(value)); }); },
        get(id) { return issue(() => structuredClone(sessions.get(id))); },
        getAll() { return issue(() => [...sessions.values()].map(value => structuredClone(value))); },
        delete(id) { return issue(() => (name === "sessions" ? sessions : rows).delete(id)); },
        index() {
          return {
            openCursor(selector) {
              const matches = [...rows.entries()].filter(([, value]) => value.sessionId === selector.value);
              let n = 0;
              const req = { onsuccess: null, onerror: null, result: null };
              function advance() {
                issue(() => {
                  const pair = matches[n++];
                  req.result = pair ? {
                    value: { id: pair[0], ...pair[1] },
                    continue: advance,
                    delete: () => rows.delete(pair[0]),
                  } : null;
                  req.onsuccess?.();
                });
              }
              advance();
              return req;
            },
          };
        },
      });
      tx.objectStore = store;
      return tx;
    },
  };
  return {
    rows, sessions,
    indexedDB: {
      open() {
        const req = { result: database, onsuccess: null, onerror: null, onupgradeneeded: null };
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      },
    },
  };
}

function makeFixture(db = fakeIndexedDB(), resumeId = null, beforeInject = null) {
  const dom = new JSDOM("<!doctype html><html><body><button id='assign'>Assign worker</button></body></html>", {
    url: "https://pokepixel.nietore.com/play", runScripts: "outside-only", pretendToBeVisual: true,
  });
  const w = dom.window;
  w.indexedDB = db.indexedDB;
  w.IDBKeyRange = { only: value => ({ value }) };
  w.crypto.randomUUID = () => "test-" + (++nextUuid);
  w.Request = globalThis.Request;
  w.Headers = globalThis.Headers;
  w.TextDecoder = globalThis.TextDecoder;
  let calls = 0;
  let response = { status: 200, ok: true, url: "https://pokepixel.nietore.com/professions/farming",
    headers: new Headers({ "content-type": "application/json", "content-length": "65" }),
    body: {},
    clone: () => ({ text: async () => JSON.stringify({ assigned: true, csrf_token: "hidden-result" }) }),
  };
  const originalFetch = async (...args) => { calls++; return response; };
  w.fetch = originalFetch;
  class TestSocket extends w.EventTarget {
    constructor(url) { super(); this.url = url; this.sent = []; }
    send(value) { this.sent.push(value); return "sent"; }
  }
  w.WebSocket = TestSocket;
  if (resumeId) w.sessionStorage.setItem("ppbui:evidence:active-tab:v1", resumeId);
  if (beforeInject) beforeInject(w);
  w.eval(source);
  w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
  const api = w.__PPBUI_EVIDENCE__;
  return { db, dom, w, api, originalFetch, response, calls: () => calls,
    setResponse: value => { response = value; } };
}

test("records synthetic UI, HTTP and WS while preserving transport results and redacting secrets", async t => {
  const { db, dom, w, api, originalFetch, response, calls } = makeFixture();
  t.after(() => dom.window.close());
  assert.equal(api.stats().recording, false);
  const id = await api.start();
  w.document.getElementById("assign").click();
  const returned = await w.fetch("/professions/farming/workers/assign?token=bad", {
    method: "POST", body: JSON.stringify({ creature_id: 42, csrf_token: "private" }),
  });
  assert.equal(returned, response);
  assert.equal(calls(), 1);
  const socket = new w.WebSocket("wss://pokepixel.nietore.com/socket?access_token=private");
  assert.equal(socket.send(JSON.stringify({ action: "assign", slot_index: 1, auth: "private" })), "sent");
  socket.dispatchEvent(new w.MessageEvent("message", { data: JSON.stringify({ state: "ok", sessionId: "private" }) }));
  await new Promise(resolve => setTimeout(resolve, 30));
  await api.stop();
  assert.equal(w.fetch, originalFetch);
  assert.equal(api.stats().recording, false);
  const entries = [...db.rows.values()].filter(entry => entry.sessionId === id);
  assert.ok(entries.some(entry => entry.kind === "ui.click" && entry.data.target.path.includes("#assign")));
  const request = entries.find(entry => entry.kind === "http.request");
  assert.ok(request);
  assert.equal(request.data.requestBody.creature_id, 42);
  assert.equal(request.data.requestBody.csrf_token, "[REDACTED]");
  assert.doesNotMatch(request.data.url, /token=bad/);
  assert.ok(entries.some(entry => entry.kind === "http.response" && entry.data.status === 200));
  assert.ok(entries.some(entry => entry.kind === "http.body" && entry.data.body.csrf_token === "[REDACTED]"));
  assert.ok(entries.some(entry => entry.kind === "ws.out" && entry.data.payload.auth === "[REDACTED]"));
  assert.ok(entries.some(entry => entry.kind === "ws.in" && entry.data.payload.sessionId === "[REDACTED]"));
  assert.equal(db.sessions.get(id).status, "stopped");
  assert.equal(db.sessions.get(id).events, entries.length);
  assert.ok(db.sessions.get(id).bytes > 0);
});

test("accepts browser-level evidence only while recording and redacts CDP payloads", async t => {
  const { db, dom, w, api } = makeFixture();
  t.after(() => dom.window.close());
  assert.equal(api.ingestBrowserEvent("browser.http.request", { requestId: "before" }), false);
  const id = await api.start();
  const realm = value => w.JSON.parse(JSON.stringify(value));
  assert.equal(api.ingestBrowserEvent("browser.http.request", realm({
    requestId: "cdp-1",
    request: {
      method: "POST",
      url: "https://pokepixel.nietore.com/professions/farming/workers/assign?token=secret",
      headers: { Authorization: "Bearer private", "Idempotency-Key": "keep-name" },
      postData: JSON.stringify({ creature_id: 77, csrf_token: "private" }),
    },
  })), true);
  assert.equal(api.ingestBrowserEvent("browser.http.response", realm({
    requestId: "cdp-1", response: { status: 200, url: "https://pokepixel.nietore.com/professions/farming/workers/assign" },
  })), true);
  assert.equal(api.ingestBrowserEvent("browser.http.body", realm({
    requestId: "cdp-1", result: { body: JSON.stringify({ assigned: true, session: "private" }), base64Encoded: false },
  })), true);
  assert.equal(api.ingestBrowserEvent("browser.ws.opening", realm({
    requestId: "ws-1", url: "wss://pokepixel.nietore.com/socket?code=must-not-leak&token=private",
  })), true);
  assert.equal(api.ingestBrowserEvent("browser.ws.in", realm({
    requestId: "ws-1", response: { opcode: 2, mask: false, payloadData: "c2VjcmV0LWJpbmFyeQ==" },
  })), true);
  assert.equal(api.ingestBrowserEvent("browser.ws.out", realm({
    requestId: "ws-1", response: { opcode: 2, mask: true, payloadData: "b3V0Ym91bmQtc2VjcmV0" },
  })), true);
  await assert.rejects(api.export(), /Pare a gravação/);
  await api.stop();
  assert.equal(api.ingestBrowserEvent("browser.http.request", { requestId: "after" }), false);
  const rows = [...db.rows.values()].filter(row => row.sessionId === id && row.kind.startsWith("browser."));
  assert.equal(rows.length, 6);
  const request = rows.find(row => row.kind === "browser.http.request");
  assert.equal(request.data.request.postData.creature_id, 77);
  assert.equal(request.data.request.postData.csrf_token, "[REDACTED]");
  assert.equal(request.data.request.headers.Authorization, "[REDACTED]");
  assert.doesNotMatch(request.data.request.url, /token=secret/);
  const responseBody = rows.find(row => row.kind === "browser.http.body");
  assert.equal(responseBody.data.result.body.session, "[REDACTED]");
  const wsOpen = rows.find(row => row.kind === "browser.ws.opening");
  assert.doesNotMatch(wsOpen.data.url, /must-not-leak|private/);
  const binary = rows.find(row => row.kind === "browser.ws.in");
  assert.equal(binary.data.response.payloadData, "[BINARY_OMITTED]");
  assert.equal(binary.data.response.payloadBytes, 13);
  assert.doesNotMatch(JSON.stringify(binary), /c2VjcmV0LWJpbmFyeQ/);
  const binaryOut = rows.find(row => row.kind === "browser.ws.out");
  assert.equal(binaryOut.data.response.payloadData, "[BINARY_OMITTED]");
  assert.doesNotMatch(JSON.stringify(binaryOut), /b3V0Ym91bmQtc2VjcmV0/);
});

test("UI actions are excluded from recording, repeated injection is idempotent, and session listing survives stop", async t => {
  const { db, dom, w, api } = makeFixture();
  t.after(() => dom.window.close());
  assert.equal(w.document.querySelectorAll("#ppbui-evidence-probe").length, 1);
  w.eval(source);
  assert.equal(w.document.querySelectorAll("#ppbui-evidence-probe").length, 1);
  await api.start();
  w.document.querySelector("#ppbui-evidence-probe").shadowRoot.querySelector("summary").click();
  await api.stop();
  assert.equal([...db.rows.values()].some(row => row.kind === "ui.click"), false);
  assert.equal((await api.sessions()).length, 1);
});

test("records storage mutations without changing stored values and omits probe-private keys", async t => {
  const { db, dom, w, api } = makeFixture();
  t.after(() => dom.window.close());
  const nativeSet = w.Storage.prototype.setItem;
  const id = await api.start();
  w.localStorage.setItem("farm:worker", JSON.stringify({ creature_id: 25, slot: 2 }));
  w.sessionStorage.setItem("auth-token", "private-token");
  w.sessionStorage.setItem("ppbui:evidence:panel-pos:v1", "top-left");
  w.localStorage.removeItem("farm:worker");
  assert.equal(w.sessionStorage.getItem("auth-token"), "private-token");
  await api.stop();
  assert.equal(w.Storage.prototype.setItem, nativeSet);
  const rows = [...db.rows.values()].filter(row => row.sessionId === id && row.kind.startsWith("storage."));
  const farm = rows.find(row => row.kind === "storage.set" && row.data.key === "farm:worker");
  assert.equal(farm.data.area, "local");
  assert.equal(farm.data.value.creature_id, 25);
  const auth = rows.find(row => row.kind === "storage.set" && row.data.key === "auth-token");
  assert.equal(auth.data.value, "[REDACTED]");
  assert.equal(rows.some(row => String(row.data.key || "").startsWith("ppbui:evidence:")), false);
  assert.ok(rows.some(row => row.kind === "storage.remove" && row.data.key === "farm:worker"));
});

test("captures bounded chunked JSON without Content-Length and records oversized-response gap", async t => {
  const { db, dom, w, api, setResponse } = makeFixture();
  t.after(() => dom.window.close());
  const id = await api.start();
  function response(text) {
    return {
      status: 200, ok: true, url: "https://pokepixel.nietore.com/hunts",
      headers: new Headers({ "content-type": "application/json" }),
      body: {},
      clone() {
        const bytes = new TextEncoder().encode(text);
        return {
          body: new ReadableStream({
            start(controller) { controller.enqueue(bytes); controller.close(); },
          }),
        };
      },
    };
  }
  setResponse(response(JSON.stringify({ pokemon: "Pidgeot", secret: "never-log" })));
  await w.fetch("/hunts");
  setResponse(response(JSON.stringify({ list: "x".repeat(60000) })));
  await w.fetch("/hunts");
  await new Promise(resolve => setTimeout(resolve, 40));
  await api.stop();
  const rows = [...db.rows.values()].filter(row => row.sessionId === id);
  assert.ok(rows.some(row => row.kind === "http.body" && row.data.body.pokemon === "Pidgeot"));
  assert.ok(rows.some(row => row.kind === "http.body.skipped" && row.data.reason === "stream_exceeds_body_limit"));
});

test("same-tab hard reload resumes persisted identity without replaying a game command", async t => {
  const shared = fakeIndexedDB();
  const first = makeFixture(shared);
  t.after(() => first.dom.window.close());
  const id = await first.api.start();
  first.w.document.getElementById("assign").click();
  await new Promise(resolve => setTimeout(resolve, 420));
  first.dom.window.close();
  const second = makeFixture(shared, id);
  t.after(() => second.dom.window.close());
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(second.api.stats().recording, true);
  assert.equal(second.api.stats().sessionId, id);
  second.w.document.getElementById("assign").click();
  await second.api.stop();
  const rows = [...shared.rows.values()].filter(row => row.sessionId === id);
  assert.ok(rows.some(row => row.kind === "probe.resumed"));
  assert.equal(rows.filter(row => row.kind === "ui.click").length, 2);
  assert.equal(new Set(rows.map(row => row.documentId)).size, 2);
  assert.equal(shared.sessions.get(id).events, rows.length);
});

test("stop marks unresolved fetch explicitly without affecting its later result", async t => {
  // Install the native pending fetch callback before the recorder starts.
  let resolveNative;
  let called = 0;
  const another = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://pokepixel.nietore.com/play", runScripts: "outside-only",
  });
  t.after(() => another.window.close());
  const win = another.window;
  const fixtureDb = fakeIndexedDB();
  win.indexedDB = fixtureDb.indexedDB;
  win.IDBKeyRange = { only: value => ({ value }) };
  win.crypto.randomUUID = () => "pending-" + (++nextUuid);
  win.Headers = Headers;
  win.Request = Request;
  win.TextEncoder = TextEncoder;
  win.TextDecoder = TextDecoder;
  win.fetch = () => {
    called++;
    return new Promise(resolve => { resolveNative = resolve; });
  };
  win.eval(source);
  win.document.dispatchEvent(new win.Event("DOMContentLoaded"));
  const controller = win.__PPBUI_EVIDENCE__;
  const id = await controller.start();
  const result = win.fetch("/professions/farming/workers/remove", { method: "POST" });
  await controller.stop();
  assert.equal(called, 1);
  const incomplete = [...fixtureDb.rows.values()].filter(row => row.sessionId === id && row.kind === "http.incomplete");
  assert.equal(incomplete.length, 1);
  assert.equal(incomplete[0].data.reason, "stop_before_response");
  resolveNative({ status: 200, ok: true, url: "https://pokepixel.nietore.com/professions/farming/workers/remove",
    headers: new Headers(), body: null });
  assert.equal((await result).status, 200);
  assert.equal(controller.stats().recording, false);
});

test("stop marks an unfinished cloned HTTP body after a response", async t => {
  const fixture = makeFixture();
  t.after(() => fixture.dom.window.close());
  let resolveBody;
  const res = {
    status: 200, ok: true, url: "https://pokepixel.nietore.com/professions/farming/workforce",
    headers: new Headers({ "content-type": "application/json", "content-length": "12" }),
    body: {},
    clone: () => ({ text: () => new Promise(resolve => { resolveBody = resolve; }) }),
  };
  fixture.setResponse(res);
  const id = await fixture.api.start();
  await fixture.w.fetch("/professions/farming/workforce");
  await new Promise(resolve => setTimeout(resolve, 20));
  await fixture.api.stop();
  const items = [...fixture.db.rows.values()].filter(row => row.sessionId === id);
  assert.ok(items.some(row => row.kind === "http.response"));
  assert.ok(items.some(row => row.kind === "http.body.skipped" &&
    row.data.reason === "stop_before_body_completed"));
  resolveBody('{"ok":true}');
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(fixture.api.stats().pendingBodies, 0);
});

test("XHR forwards native request, observes header names and explicitly marks oversized text", async t => {
  let lastXhr;
  const fixture = makeFixture(fakeIndexedDB(), null, win => {
    win.XMLHttpRequest = class FakeXHR extends win.EventTarget {
      constructor() {
        super();
        lastXhr = this;
        this.responseType = "";
        this.responseText = "";
        this.status = 200;
        this.responseURL = "";
      }
      open(method, url) {
        this.method = method; this.url = url;
      }
      setRequestHeader(name, value) {
        this.headers ||= [];
        this.headers.push([name, value]);
      }
      send(body) {
        this.sent = body;
        return "sent";
      }
      getResponseHeader(name) {
        return name === "content-type" ? "application/json" : null;
      }
    };
  });
  t.after(() => fixture.dom.window.close());
  const { w, api, db } = fixture;
  const nativeOpen = w.XMLHttpRequest.prototype.open;
  const nativeSend = w.XMLHttpRequest.prototype.send;
  const nativeHeader = w.XMLHttpRequest.prototype.setRequestHeader;
  const id = await api.start();
  const xhr = new w.XMLHttpRequest();
  xhr.open("POST", "/professions/farming/workers/assign");
  xhr.setRequestHeader("Idempotency-Key", "private-id");
  xhr.setRequestHeader("Authorization", "private-bearer");
  assert.equal(xhr.send(JSON.stringify({ creature_id: 1, token: "secret-value" })), "sent");
  assert.equal(lastXhr, xhr);
  assert.equal(xhr.sent, '{"creature_id":1,"token":"secret-value"}');
  xhr.responseText = JSON.stringify({ collection: "x".repeat(80000) });
  xhr.dispatchEvent(new w.Event("loadend"));
  await api.stop();
  assert.equal(w.XMLHttpRequest.prototype.open, nativeOpen);
  assert.equal(w.XMLHttpRequest.prototype.send, nativeSend);
  assert.equal(w.XMLHttpRequest.prototype.setRequestHeader, nativeHeader);
  const entries = [...db.rows.values()].filter(row => row.sessionId === id);
  assert.ok(entries.some(row => row.kind === "http.request" &&
    row.data.headers.includes("idempotency-key") && row.data.requestBody.token === "[REDACTED]"),
  JSON.stringify(entries.filter(row => row.kind === "http.request"), null, 2));
  assert.ok(entries.some(row => row.kind === "http.body.skipped" &&
    row.data.reason === "xhr_text_exceeds_body_limit"));
  assert.equal(entries.some(row => JSON.stringify(row).includes("private-bearer")), false);
  assert.equal(entries.some(row => row.kind === "http.incomplete"), false);
});

test("panel retains keyboard focus while starting and exposes export result after a failure", async t => {
  const fixture = makeFixture();
  t.after(() => fixture.dom.window.close());
  const { w, api } = fixture;
  const root = w.document.querySelector("#ppbui-evidence-probe").shadowRoot;
  const button = root.getElementById("toggle");
  const status = root.getElementById("state");
  button.focus();
  const startPromise = api.start();
  assert.equal(button.getAttribute("aria-disabled"), "true");
  assert.equal(button.disabled, false);
  assert.equal(root.activeElement, button);
  await startPromise;
  assert.equal(status.textContent, "GRAVANDO");
  assert.equal(root.getElementById("export").getAttribute("aria-disabled"), "true");
  const stopPromise = api.stop();
  assert.equal(button.getAttribute("aria-disabled"), "true");
  assert.equal(root.activeElement, button);
  await stopPromise;
  assert.equal(button.getAttribute("aria-disabled"), "false");
  assert.equal(root.activeElement, button);
});
