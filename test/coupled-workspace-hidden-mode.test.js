import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createCoupledWorkspaceModule } from "../src/modules/coupled-workspace/index.js";

const control = (type, extra = {}) => ({ type: `ppbui.coupled.${type}`, protocol: 1, ...extra });

function fixture(t) {
  const nativeNow = Date.now;
  let now = nativeNow();
  Date.now = () => now;
  const dom = new JSDOM(`<!doctype html><html lang="pt-BR"><head></head><body>
    <nav class="pokeidle-top-toolbar">
      <button data-menu-id="inventory">Inventory</button>
      <button data-menu-id="storage" disabled>Storage</button>
    </nav>
  </body></html>`, { url: "https://fixture.invalid", pretendToBeVisual: true });
  const win = dom.window;
  const calls = { reads: 0, frames: 0 };
  const sent = [];
  const listeners = new Set();
  const intervals = new Map();
  const frames = new Map();
  let nextId = 0;
  let providerHook = null;
  let analyzer = {
    protocol: 1, available: true, capturedAtMs: Date.now(),
    status: "running", seen: 12, captured: 1, failed: 11,
    specialHistory: [], lootHistory: [],
  };
  const bridge = {
    postMessage(payload) { sent.push(payload); },
    addEventListener(name, fn) { if (name === "message") listeners.add(fn); },
    removeEventListener(name, fn) { if (name === "message") listeners.delete(fn); },
    send(message) { for (const fn of listeners) fn({ data: message }); },
  };
  Object.defineProperties(win, {
    chrome: { configurable: true, value: { webview: bridge } },
    __PPBUI_COUPLED_WORKSPACE__: { configurable: true, value: { protocol: 1 } },
    __POKEPIXEL_HUNT_ANALYZER_PUBLIC__: { configurable: true, value: {
      protocol: 1,
      getSummary() { calls.reads += 1; return providerHook ? providerHook() : analyzer; },
    } },
  });
  win.setInterval = (fn, ms) => { assert.equal(ms, 1000); const id = ++nextId; intervals.set(id, fn); return id; };
  win.clearInterval = id => intervals.delete(id);
  const previous = new Map();
  for (const [key, value] of Object.entries({
    window: win, document: win.document, MutationObserver: win.MutationObserver,
    requestAnimationFrame: fn => { const id = ++nextId; frames.set(id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  const app = createBetterUI({ modules: [createCoupledWorkspaceModule()] });
  t.after(() => {
    app.stop();
    dom.window.close();
    Date.now = nativeNow;
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  return {
    app, win, bridge, sent, calls,
    get cards() { return win.document.querySelector("[data-ppbui-coupled-cards]"); },
    currentHandler() { return [...listeners][0] || null; },
    setAnalyzer(value) { analyzer = value; },
    getAnalyzer() { return analyzer; },
    advance(ms) { now += ms; },
    providerHook(fn) { providerHook = fn; },
    poll(n = 1) {
      for (let i = 0; i < n; i++) for (const callback of intervals.values()) callback();
    },
    async settle() {
      for (let step = 0; step < 12; step++) {
        await Promise.resolve();
        await Promise.resolve();
        if (!frames.size) return;
        const queued = [...frames.values()];
        frames.clear();
        for (const callback of queued) { calls.frames += 1; callback(); }
      }
      assert.fail("central observer did not settle");
    },
  };
}

test("coupled Game skips Analyzer reads on startup, ticks and core observer reconciles but keeps capabilities live", async t => {
  const f = fixture(t);
  f.app.start();
  await f.settle();
  assert.equal(f.cards.hidden, true);
  assert.equal(f.calls.reads, 0, "initial Game must not materialize hidden Cards");
  f.bridge.send(control("capabilities-accepted", { requestId: "caps-1", ok: true }));
  f.poll(12);
  for (let i = 0; i < 20; i++) f.app.reconcile();
  await f.settle();
  assert.equal(f.calls.reads, 0, "steady Game ticks and redundant sync must not read Analyzer");

  const toolbar = f.win.document.querySelector(".pokeidle-top-toolbar");
  const storage = toolbar.querySelector('[data-menu-id="storage"]');
  storage.disabled = false;
  toolbar.replaceWith(toolbar.cloneNode(true));
  await f.settle();
  const updated = f.sent.filter(packet => packet.type === "ppbui.coupled.capabilities").at(-1);
  assert.equal(updated.surfaces.find(item => item.id === "storage").available, true);
  assert.equal(f.cards.hidden, true);
  assert.equal(f.calls.reads, 0, "native toolbar discovery is independent of presentation");
});

test("return to Cards reads exactly one fresh full history after a long Game interval", async t => {
  const f = fixture(t);
  f.app.start();
  await f.settle();
  f.bridge.send(control("capabilities-accepted", { requestId: "caps-1", ok: true }));
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  await f.settle();
  assert.equal(f.calls.reads, 1, "accepted first entry must read fresh summary once");
  assert.equal(f.cards.hidden, false);
  assert.equal(f.cards.querySelector('[data-card-field="seen"]').textContent, "12");
  f.bridge.send(control("set-view", { viewMode: "game" }));
  const before = f.calls.reads;
  const history = Array.from({ length: 33 }, (_, i) => ({
    atMs: Date.now() - i * 1000, species: `Species ${i}`, rarity: "epic", result: "fled", ball: "Ultra Ball",
  }));
  f.setAnalyzer({ ...f.getAnalyzer(), capturedAtMs: Date.now() - 4000, seen: 45, specialHistory: history });
  f.poll(8);
  f.app.reconcile();
  await f.settle();
  assert.equal(f.calls.reads, before, "no background catch-up materialization during Game");

  f.setAnalyzer({ ...f.getAnalyzer(), capturedAtMs: Date.now() });
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  await f.settle();
  assert.equal(f.calls.reads, before + 1, "Game→Cards requires one fresh public read");
  assert.equal(f.cards.querySelector('[data-card-field="seen"]').textContent, "45");
  assert.equal(f.cards.querySelectorAll("[data-card-attempt-body] .ppbui-cards-attempt").length, 33,
    "all special History rows accumulated during Game are present");
});

test("Cards returns with unavailable state for stale, failed or unaccepted Analyzer and stops after cleanup", async t => {
  const f = fixture(t);
  f.app.start();
  await f.settle();
  f.bridge.send(control("set-view", { viewMode: "unknown" }));
  assert.equal(f.calls.reads, 0, "malformed host view commands must fail closed");
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  assert.equal(f.cards.hidden, true, "set-view before capability ACK remains fail closed");
  assert.equal(f.calls.reads, 0, "pre-ACK request must not read the Analyzer");
  f.bridge.send(control("capabilities-accepted", { requestId: "caps-1", ok: true }));
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  assert.equal(f.calls.reads, 1);
  f.bridge.send(control("set-view", { viewMode: "game" }));
  f.setAnalyzer({ ...f.getAnalyzer(), capturedAtMs: Date.now() - 4000, seen: 999 });
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  assert.equal(f.calls.reads, 2);
  assert.equal(f.cards.querySelector('[data-card-field="status"]').textContent, "Indisponível");
  assert.equal(f.cards.querySelector('[data-card-field="seen"]').textContent.includes("999"), false);
  f.bridge.send(control("set-view", { viewMode: "game" }));
  f.setAnalyzer(null);
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  assert.equal(f.calls.reads, 3);
  assert.equal(f.cards.querySelector("[data-card-attempt-body]").textContent, "Dados do Hunt Analyzer indisponíveis.");
  f.app.stop();
  const before = f.calls.reads;
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  f.poll(3);
  await f.settle();
  assert.equal(f.calls.reads, before, "unmounted adapter cannot read the old Analyzer");
});

test("Game remains presentation-silent through a thousand native mutations and still delegates native actions", async t => {
  const f = fixture(t);
  f.app.start();
  await f.settle();
  f.bridge.send(control("capabilities-accepted", { requestId: "caps-1", ok: true }));
  const inventory = f.win.document.querySelector('[data-menu-id="inventory"]');
  let nativeClicks = 0;
  inventory.addEventListener("click", () => nativeClicks++);
  const storage = f.win.document.querySelector('[data-menu-id="storage"]');
  for (let i = 0; i < 1000; i++) storage.disabled = !storage.disabled;
  storage.disabled = false;
  await f.settle();
  const latest = f.sent.filter(message => message.type === control("capabilities").type).at(-1);
  assert.equal(latest.surfaces.find(surface => surface.id === "storage").available, true);
  assert.equal(f.calls.reads, 0);
  f.bridge.send(control("open-surface", { surfaceId: "inventory", requestId: "open-1" }));
  assert.equal(nativeClicks, 1);
  assert.equal(f.sent.at(-1).ok, true);
  assert.equal(f.calls.reads, 0, "native dispatch cannot wake hidden Analyzer presentation");
  assert.equal(f.cards.hidden, true);
});

test("Game→Cards renders fresh H=1201 with retained filters and exposes fallback for old/future/thrown snapshots", async t => {
  const f = fixture(t);
  f.app.start();
  await f.settle();
  f.bridge.send(control("capabilities-accepted", { requestId: "caps-1", ok: true }));
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  await f.settle();
  const capturedFilter = f.cards.querySelector('[data-card-attempt-result="captured"]');
  capturedFilter.click();
  assert.equal(capturedFilter.getAttribute("aria-pressed"), "true");
  f.bridge.send(control("set-view", { viewMode: "game" }));
  f.advance(4001);
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  assert.equal(f.cards.querySelector('[data-card-field="status"]').textContent, "Indisponível",
    "age is evaluated against the advanced fake clock, not the old Cards entry time");
  f.bridge.send(control("set-view", { viewMode: "game" }));
  f.setAnalyzer({ ...f.getAnalyzer(), capturedAtMs: Date.now() + 100, seen: 999 });
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  assert.equal(f.cards.querySelector('[data-card-field="status"]').textContent, "Indisponível",
    "future timestamps must never be accepted");
  f.bridge.send(control("set-view", { viewMode: "game" }));
  f.providerHook(() => { throw new Error("Analyzer is temporarily unavailable"); });
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  assert.equal(f.cards.querySelector('[data-card-field="status"]').textContent, "Indisponível",
    "provider exceptions must render the existing unavailable state");
  f.bridge.send(control("set-view", { viewMode: "game" }));
  f.providerHook(null);
  const history = Array.from({ length: 1201 }, (_, i) => ({
    atMs: Date.now() - i * 1000,
    species: `Captured ${i}`,
    rarity: i % 2 ? "legendary" : "epic",
    result: "captured",
    chance: .1,
    ball: "Ultra Ball",
  }));
  f.setAnalyzer({ ...f.getAnalyzer(), capturedAtMs: Date.now(), seen: 1201, specialHistory: history });
  const before = f.calls.reads;
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  await f.settle();
  assert.equal(f.calls.reads, before + 1);
  assert.equal(f.cards.querySelector('[data-card-field="seen"]').textContent, "1,2k");
  assert.equal(f.cards.querySelectorAll('[data-card-attempt-body] .ppbui-cards-attempt').length, 1201);
  assert.equal(f.cards.querySelector('[data-card-attempt-result="captured"]').getAttribute("aria-pressed"), "true");
  assert.match(f.cards.querySelector('[data-card-attempt-body]').textContent, /Captured 1200/);
});

test("same-view messages do not duplicate the return read; reentrant provider commands cannot resurrect Cards", async t => {
  const f = fixture(t);
  f.app.start();
  await f.settle();
  f.bridge.send(control("capabilities-accepted", { requestId: "caps-1", ok: true }));
  const enter = control("set-view", { viewMode: "cards" });
  f.bridge.send(enter);
  f.bridge.send(enter);
  await f.settle();
  assert.equal(f.calls.reads, 1);
  f.bridge.send(control("set-view", { viewMode: "game" }));
  const readsBeforeRace = f.calls.reads;
  f.providerHook(() => {
    assert.equal(f.cards.hidden, true, "the public reader runs while previous Cards content stays hidden");
    f.bridge.send(control("set-view", { viewMode: "game" }));
    return { ...f.getAnalyzer(), capturedAtMs: Date.now(), seen: 444 };
  });
  f.bridge.send(enter);
  await f.settle();
  assert.equal(f.calls.reads, readsBeforeRace + 1);
  assert.equal(f.cards.hidden, true, "a nested Game intent supersedes the pending Cards transition");
  f.providerHook(null);
  f.bridge.send(enter);
  await f.settle();
  assert.equal(f.cards.hidden, false);
  assert.equal(f.cards.querySelector('[data-card-field="seen"]').textContent, "12",
    "the aborted public read must not leave the stale value on the dashboard");
});

test("capability rejection during a synchronous Cards provider call cancels reveal and retries on the native toolbar", async t => {
  const f = fixture(t);
  f.app.start();
  await f.settle();
  f.bridge.send(control("capabilities-accepted", { requestId: "caps-1", ok: true }));
  f.win.document.querySelector('[data-menu-id="storage"]').disabled = false;
  f.app.reconcile();
  const pending = f.sent.filter(message => message.type === control("capabilities").type).at(-1);
  assert.notEqual(pending.requestId, "caps-1");
  f.providerHook(() => {
    f.bridge.send(control("capabilities-accepted", { requestId: pending.requestId, ok: false }));
    return { ...f.getAnalyzer(), capturedAtMs: Date.now(), seen: 444 };
  });
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  assert.equal(f.cards.hidden, true);
  assert.equal(f.win.document.documentElement.hasAttribute("data-ppbui-coupled-workspace"), false,
    "rejected capability ACK restores the native toolbar");
  f.providerHook(null);
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  assert.equal(f.cards.hidden, true, "host commands fail closed while capability acceptance is lost");
});

test("an old callback cannot touch a replacement mount or revive a closed document", async t => {
  const f = fixture(t);
  f.app.start();
  await f.settle();
  const oldHandler = f.currentHandler();
  const oldRoot = f.cards;
  f.app.stop();
  assert.equal(oldRoot.isConnected, false);
  oldHandler({ data: control("set-view", { viewMode: "cards" }) });
  assert.equal(f.calls.reads, 0);
  f.app.start();
  await f.settle();
  assert.notEqual(f.cards, oldRoot, "the second mount owns a new root");
  oldHandler({ data: control("capabilities-accepted", { requestId: "caps-1", ok: true }) });
  oldHandler({ data: control("set-view", { viewMode: "cards" }) });
  assert.equal(f.cards.hidden, true);
  assert.equal(f.calls.reads, 0);
  f.bridge.send(control("capabilities-accepted", { requestId: "caps-1", ok: true }));
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  assert.equal(f.calls.reads, 1);
  assert.equal(f.cards.hidden, false);
});

test("cleanup while getSummary is in progress leaves no stale Cards presentation or native toolbar suppression", async t => {
  const f = fixture(t);
  f.app.start();
  await f.settle();
  f.bridge.send(control("capabilities-accepted", { requestId: "caps-1", ok: true }));
  f.providerHook(() => {
    assert.equal(f.cards.hidden, true);
    f.app.stop();
    return { ...f.getAnalyzer(), capturedAtMs: Date.now(), seen: 444 };
  });
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  assert.equal(f.calls.reads, 1);
  assert.equal(f.cards, null);
  assert.equal(f.win.document.documentElement.hasAttribute("data-ppbui-coupled-workspace"), false);
});

test("a due 1Hz Cards poll always reads again, including before the reveal observer is flushed", async t => {
  const f = fixture(t);
  f.app.start();
  await f.settle();
  f.bridge.send(control("capabilities-accepted", { requestId: "caps-1", ok: true }));
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  assert.equal(f.calls.reads, 1);
  f.advance(1000);
  f.setAnalyzer({ ...f.getAnalyzer(), capturedAtMs: Date.now(), seen: 77 });
  f.poll();
  assert.equal(f.calls.reads, 2, "a due poll cannot be mistaken for a duplicate observer frame");
  assert.equal(f.cards.querySelector('[data-card-field="seen"]').textContent, "77");
  await f.settle();
  assert.equal(f.calls.reads, 2, "the reveal observer cannot force an immediate extra read");
});

test("a synchronous Cards renderer failure preserves Game and restores native navigation", async t => {
  const f = fixture(t);
  f.win.PokeIdle = { PersistentHud: { _teamHud: { _creatures: [{
    get is_leader() { throw new Error("synthetic native Team read failed"); },
  }] } } };
  f.app.start();
  await f.settle();
  f.bridge.send(control("capabilities-accepted", { requestId: "caps-1", ok: true }));
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  assert.equal(f.calls.reads, 1, "the failing render still used exactly one current public summary");
  assert.equal(f.cards.hidden, true, "a partially rendered dashboard must remain hidden");
  assert.equal(f.win.document.documentElement.hasAttribute("data-ppbui-coupled-workspace"), false,
    "native toolbar must be available when Cards cannot render");
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  assert.equal(f.calls.reads, 1, "the failed capability handshake cannot reveal broken Cards");
});

test("a synchronous Game command during an in-flight Cards poll cancels the obsolete render", async t => {
  const f = fixture(t);
  f.app.start();
  await f.settle();
  f.bridge.send(control("capabilities-accepted", { requestId: "caps-1", ok: true }));
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  await f.settle();
  const before = f.calls.reads;
  assert.equal(f.cards.querySelector('[data-card-field="seen"]').textContent, "12");
  f.providerHook(() => {
    f.bridge.send(control("set-view", { viewMode: "game" }));
    return { ...f.getAnalyzer(), capturedAtMs: Date.now(), seen: 444 };
  });
  f.advance(1000);
  f.poll();
  assert.equal(f.calls.reads, before + 1);
  assert.equal(f.cards.hidden, true);
  assert.equal(f.cards.querySelector('[data-card-field="seen"]').textContent, "12",
    "obsolete tick data cannot update the hidden dashboard after Game wins");
  f.providerHook(null);
  f.setAnalyzer({ ...f.getAnalyzer(), capturedAtMs: Date.now(), seen: 66 });
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  assert.equal(f.cards.querySelector('[data-card-field="seen"]').textContent, "66",
    "reentry must use fresh public state after cancelling a stale tick");
});

test("explicit reconcile updates Cards before the pending reveal observer without duplicating its read", async t => {
  const f = fixture(t);
  f.app.start();
  await f.settle();
  f.bridge.send(control("capabilities-accepted", { requestId: "caps-1", ok: true }));
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  assert.equal(f.calls.reads, 1);
  f.setAnalyzer({ ...f.getAnalyzer(), capturedAtMs: Date.now(), seen: 88 });
  f.app.reconcile();
  assert.equal(f.calls.reads, 2);
  assert.equal(f.cards.querySelector('[data-card-field="seen"]').textContent, "88");
  await f.settle();
  assert.equal(f.calls.reads, 2,
    "the first observer frame caused by rendering must not duplicate the explicit refresh");
});

test("a Cards poll renderer failure also restores Game and keeps the native toolbar reachable", async t => {
  const f = fixture(t);
  f.app.start();
  await f.settle();
  f.bridge.send(control("capabilities-accepted", { requestId: "caps-1", ok: true }));
  f.bridge.send(control("set-view", { viewMode: "cards" }));
  await f.settle();
  f.win.PokeIdle = { PersistentHud: { _teamHud: { _creatures: [{
    get is_leader() { throw new Error("synthetic native Team read failed on tick"); },
  }] } } };
  f.advance(1000);
  f.poll();
  assert.equal(f.cards.hidden, true);
  assert.equal(f.win.document.documentElement.hasAttribute("data-ppbui-coupled-workspace"), false);
});
