import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { mountCoupledWorkspaceAdapter } from "../src/modules/coupled-workspace/controller.js";

const type = suffix => `ppbui.coupled.${suffix}`;
const epoch = "a4ca0256cb7744bd832a16a751a0edc3";

function fixture(t, { markerCorrelation = 2, win = null } = {}) {
  const ownWindow = !win;
  const dom = ownWindow ? new JSDOM(`<!doctype html><html lang="pt-BR"><head></head><body>
    <nav class="pokeidle-top-toolbar"><button data-menu-id="inventory">Inventory</button></nav>
  </body></html>`, { url: "https://fixture.invalid/play", pretendToBeVisual: true }) : null;
  win ||= dom.window;
  const sent = [];
  const listeners = new Set();
  const timeouts = new Map();
  const nativeSetTimeout = win.setTimeout;
  const nativeClearTimeout = win.clearTimeout;
  let nextTimeout = 0;
  win.setTimeout = callback => { const id = ++nextTimeout; timeouts.set(id, callback); return id; };
  win.clearTimeout = id => timeouts.delete(id);
  let reads = 0;
  let sourceHook = null;
  const bridge = {
    postMessage(payload) { sent.push(payload); },
    addEventListener(name, listener) { if (name === "message") listeners.add(listener); },
    removeEventListener(name, listener) { if (name === "message") listeners.delete(listener); },
    send(payload) { for (const listener of [...listeners]) listener({ data: payload }); },
  };
  Object.defineProperty(win, "chrome", { configurable: true, value: { webview: bridge } });
  Object.defineProperty(win, "__PPBUI_COUPLED_WORKSPACE__", {
    configurable: true, value: { protocol: 1, viewCorrelation: markerCorrelation },
  });
  Object.defineProperty(win, "__POKEPIXEL_HUNT_ANALYZER_PUBLIC__", {
    configurable: true, value: { protocol: 1, getSummary() {
      reads++;
      return sourceHook?.() ?? { protocol: 1, available: true, capturedAtMs: Date.now() - 1000,
        status: "running", seen: 12, captured: 2, failed: 10, specialHistory: [], lootHistory: [] };
    } },
  });
  let adapter = mountCoupledWorkspaceAdapter(win);
  t.after(() => {
    adapter.cleanup();
    win.setTimeout = nativeSetTimeout;
    win.clearTimeout = nativeClearTimeout;
    if (ownWindow) dom.window.close();
  });
  const find = kind => sent.filter(item => item.type === type(kind)).at(-1);
  const send = (kind, fields = {}) => bridge.send({ type: type(kind), protocol: 1, ...fields });
  const handshake = (documentEpoch = epoch) => {
    const hello = find("session-hello");
    assert.ok(hello, "strict host requests session binding before capabilities");
    assert.match(hello.sessionId, /^[a-f0-9]{32}$/);
    assert.ok(Number.isSafeInteger(hello.mountOrdinal) && hello.mountOrdinal > 0);
    assert.equal(sent.slice(sent.lastIndexOf(hello) + 1).some(packet => packet.type === type("capabilities")),
      false, "no capability advertisement before document challenge");
    send("session-ready", { requestId: hello.requestId, sessionId: hello.sessionId,
      mountOrdinal: hello.mountOrdinal, documentEpoch });
    const caps = find("capabilities");
    assert.ok(caps);
    assert.equal(caps.documentEpoch, documentEpoch);
    assert.equal(caps.sessionId, hello.sessionId);
    assert.equal(caps.mountOrdinal, hello.mountOrdinal);
    assert.ok(Number.isSafeInteger(caps.capabilitySeq) && caps.capabilitySeq > 0);
    send("capabilities-accepted", { requestId: caps.requestId, ok: true,
      sessionId: hello.sessionId, mountOrdinal: hello.mountOrdinal,
      documentEpoch, capabilitySeq: caps.capabilitySeq });
    return { sessionId: hello.sessionId, mountOrdinal: hello.mountOrdinal,
      documentEpoch, capabilitySeq: caps.capabilitySeq };
  };
  const view = (session, viewMode, viewRevision, fields = {}) => {
    send("set-view", { ...session, viewMode, viewRevision, ...fields });
  };
  return { win, bridge, sent, send, find, handshake, view,
    get listenerCount() { return listeners.size; },
    sync() { adapter.sync(); },
    fireTimeout() {
      const [id, callback] = timeouts.entries().next().value ?? [];
      assert.ok(callback, "a bounded retry must be pending");
      timeouts.delete(id);
      callback();
    },
    remount() { adapter.cleanup(); adapter = mountCoupledWorkspaceAdapter(win); },
    replaceMount(factory) { adapter.cleanup(); adapter = factory(win); },
    setSourceHook(fn) { sourceHook = fn; },
    get reads() { return reads; },
    get cards() { return win.document.querySelector("[data-ppbui-coupled-cards]"); },
  };
}

test("strict correlated view ignores delayed, duplicate and conflicting revisions", t => {
  const f = fixture(t);
  const session = f.handshake();
  f.view(session, "cards", 20);
  assert.equal(f.cards.hidden, false);
  assert.equal(f.reads, 1);
  f.view(session, "game", 21);
  assert.equal(f.cards.hidden, true);
  f.view(session, "cards", 20);
  f.view(session, "game", 21);
  f.view(session, "cards", 21);
  assert.equal(f.cards.hidden, true);
  assert.equal(f.reads, 1);
  f.view(session, "cards", 22);
  f.view(session, "cards", 22);
  assert.equal(f.cards.hidden, false);
  assert.equal(f.reads, 2);
});

test("document-bound probe identifies only the current mount and disappears on cleanup", t => {
  const f = fixture(t);
  const session = f.handshake();
  const probeKey = Symbol.for("ppbui.coupled.document-session-probe");
  const probe = f.win.document[probeKey];
  assert.equal(typeof probe, "function");
  assert.deepEqual(probe(), {
    type: "ppbui.coupled.document-probe", protocol: 1,
    sessionId: session.sessionId, mountOrdinal: session.mountOrdinal,
    documentEpoch: session.documentEpoch, documentUrl: f.win.location.href,
  }, "the probe must expose the live document's exact session and URL");
  // The probe is explicitly scoped to one adapter instance; an earlier
  // callback cannot impersonate a replacement mount in the same DOM.
  f.remount();
  assert.notEqual(f.win.document[probeKey], probe);
  const next = f.handshake();
  assert.equal(f.win.document[probeKey]().sessionId, next.sessionId);
  assert.equal(f.win.document[probeKey]().mountOrdinal, session.mountOrdinal + 1);
  assert.equal(probe().sessionId, session.sessionId, "detached probe retains its old closed-over identity");
});

test("overlapping module images retire the old adapter and restore native toolbar after timeout/cleanup", async t => {
  const f = fixture(t);
  const original = f.handshake();
  f.view(original, "cards", 1);
  const doc = f.win.document;
  const rootAttribute = "data-ppbui-coupled-workspace";
  const probeKey = Symbol.for("ppbui.coupled.document-session-probe");
  const adapterKey = Symbol.for("ppbui.coupled.active-adapter");
  const nativeButton = doc.querySelector('[data-menu-id="inventory"]');
  const oldCardButton = f.cards.querySelector("button");
  assert.ok(oldCardButton);
  oldCardButton.focus();
  assert.equal(doc.activeElement, oldCardButton);
  assert.equal(doc.documentElement.getAttribute(rootAttribute), "true");
  assert.equal(f.listenerCount, 1);

  const freshModule = await import("../src/modules/coupled-workspace/controller.js?strict-overlap-cleanup");
  const replacement = freshModule.mountCoupledWorkspaceAdapter(f.win);
  t.after(() => replacement.cleanup());
  assert.equal(doc[adapterKey], replacement);
  assert.equal(f.listenerCount, 1, "new module instance must retire previous message handlers");
  assert.equal(doc.querySelectorAll("[data-ppbui-coupled-cards]").length, 1,
    "old Cards DOM must be cleaned before the replacement begins");
  assert.equal(doc.documentElement.hasAttribute(rootAttribute), false,
    "toolbar must remain available while the replacement has no ACK");
  assert.equal(doc.activeElement, nativeButton,
    "retiring focused Cards must move focus to a visible native action before removal");
  const sentAfterReplacement = f.sent.length;
  f.sync(); // An old core reference can still request sync after hot re-injection.
  assert.equal(f.sent.length, sentAfterReplacement, "retired adapter must stay inert");
  f.fireTimeout();
  assert.equal(doc.documentElement.hasAttribute(rootAttribute), false,
    "session timeout must not restore the hidden toolbar state of the old mount");
  f.fireTimeout(); // Bound retry issues a fresh session challenge.
  const next = f.handshake();
  assert.notEqual(next.sessionId, original.sessionId);
  assert.equal(doc[probeKey]().sessionId, next.sessionId);
  f.view(original, "cards", 999);
  assert.equal(doc.querySelector("[data-ppbui-coupled-cards]").hidden, true);
  f.view(next, "cards", 1);
  assert.equal(doc.documentElement.getAttribute(rootAttribute), "true");

  const newCardButton = doc.querySelector("[data-ppbui-coupled-cards] button");
  assert.ok(newCardButton);
  newCardButton.focus();
  assert.equal(doc.activeElement, newCardButton);

  replacement.cleanup();
  assert.equal(doc.activeElement, nativeButton,
    "removing a focused replacement must preserve keyboard reachability");
  assert.equal(f.listenerCount, 0);
  assert.equal(doc[adapterKey], undefined);
  assert.equal(doc.documentElement.hasAttribute(rootAttribute), false,
    "cleanup must not restore an old adapter's stale hidden-toolbar attribute");
  assert.equal(doc[probeKey], undefined);
});

test("hot reinjection moves focus to a native landmark when all toolbar actions are unavailable", t => {
  const f = fixture(t);
  const old = f.handshake();
  f.view(old, "cards", 1);
  const doc = f.win.document;
  const toolbar = doc.querySelector("nav");
  doc.querySelector('[data-menu-id="inventory"]').disabled = true;
  const oldCardButton = f.cards.querySelector("button");
  assert.ok(oldCardButton);
  oldCardButton.focus();
  assert.equal(doc.activeElement, oldCardButton);

  const replacement = mountCoupledWorkspaceAdapter(f.win);
  t.after(() => replacement.cleanup());
  assert.equal(doc.activeElement, toolbar,
    "remount must not strand focus in removed Cards when native actions are disabled");
  const next = f.handshake();
  f.view(next, "cards", 1);
  const newCardButton = doc.querySelector("[data-ppbui-coupled-cards] button");
  assert.ok(newCardButton);
  newCardButton.focus();
  replacement.cleanup();
  assert.equal(doc.activeElement, toolbar,
    "cleanup of the replacement must keep a reachable native landmark focused");
});

test("strict mode rejects pre-ACK commands, invalid epochs and malformed revisions", t => {
  const f = fixture(t);
  const hello = f.find("session-hello");
  f.send("session-ready", { requestId: hello.requestId, sessionId: "0".repeat(32),
    mountOrdinal: hello.mountOrdinal, documentEpoch: epoch });
  assert.equal(f.find("capabilities"), undefined);
  const session = f.handshake();
  f.view(session, "cards", 1);
  assert.equal(f.cards.hidden, false);
  // The source may be recent, but the host envelope remains authoritative.
  for (const mismatch of [
    { documentEpoch: "f".repeat(32) }, { sessionId: "0".repeat(32) },
    { mountOrdinal: session.mountOrdinal + 1 },
  ]) f.view(session, "game", 999, mismatch);
  for (const invalid of [undefined, null, 0, -1, 0.25, "42", NaN,
    Number.MAX_SAFE_INTEGER + 1]) f.view(session, "game", invalid);
  f.view(session, "game", 2, { protocol: 0 });
  assert.equal(f.cards.hidden, false);
  assert.equal(f.reads, 1);
  f.view(session, "game", 2);
  assert.equal(f.cards.hidden, true);
});

test("strict mode rejects old or wrong ACK and retries the same document after rejection", t => {
  const f = fixture(t);
  const hello = f.find("session-hello");
  f.send("set-view", { viewMode: "cards", viewRevision: 90,
    sessionId: hello.sessionId, mountOrdinal: hello.mountOrdinal, documentEpoch: epoch });
  assert.equal(f.cards.hidden, true);
  const session = f.handshake();
  f.view(session, "cards", 1);
  assert.equal(f.cards.hidden, false);
  // A changed native capability snapshot creates a distinct request.
  f.win.document.querySelector('[data-menu-id="inventory"]').disabled = true;
  f.sync();
  const pending = f.find("capabilities");
  assert.notEqual(pending.requestId, "caps-1");
  f.send("capabilities-accepted", { requestId: pending.requestId, ok: false,
    ...session, documentEpoch: "f".repeat(32) });
  assert.equal(f.cards.hidden, false, "wrong-epoch ACK must not change Cards");
  f.send("capabilities-accepted", { requestId: pending.requestId, ok: false,
    ...session, capabilitySeq: pending.capabilitySeq });
  assert.equal(f.cards.hidden, true);
  assert.equal(f.win.document.documentElement.hasAttribute("data-ppbui-coupled-workspace"), false);
  f.fireTimeout();
  const retry = f.find("capabilities");
  assert.notEqual(retry.requestId, pending.requestId);
  f.send("capabilities-accepted", { requestId: pending.requestId, ok: true, ...session });
  assert.equal(f.cards.hidden, true);
  f.send("capabilities-accepted", { requestId: retry.requestId, ok: true,
    ...session, capabilitySeq: retry.capabilitySeq });
  f.view(session, "cards", 1); // Already consumed before losing ACK.
  assert.equal(f.cards.hidden, true, "duplicate revision cannot revive a stale frame");
  f.view({ ...session, capabilitySeq: retry.capabilitySeq }, "cards", 2);
  assert.equal(f.cards.hidden, false);
});

test("strict adapter rejects old mount on the same document and ignores wrong-session actions", t => {
  const f = fixture(t);
  const first = f.handshake();
  f.view(first, "cards", 5);
  const action = f.win.document.querySelector('[data-menu-id="inventory"]');
  let clicks = 0;
  action.addEventListener("click", () => { clicks++; });
  f.send("open-surface", { requestId: "rhyxus-1", surfaceId: "inventory",
    sessionId: "0".repeat(32), mountOrdinal: first.mountOrdinal, documentEpoch: epoch });
  assert.equal(clicks, 0);
  f.send("open-surface", { requestId: "rhyxus-1", surfaceId: "inventory", ...first });
  f.send("open-surface", { requestId: "rhyxus-1", surfaceId: "inventory", ...first });
  f.send("open-surface", { requestId: "rhyxus-0", surfaceId: "inventory", ...first });
  f.send("open-surface", { requestId: "rhyxus-1.5", surfaceId: "inventory", ...first });
  f.send("open-surface", { requestId: "rhyxus-0", surfaceId: "inventory", ...first });
  assert.equal(clicks, 1);
  f.remount();
  const hello = f.find("session-hello");
  assert.notEqual(hello.sessionId, first.sessionId);
  assert.ok(hello.mountOrdinal > first.mountOrdinal);
  const latest = f.handshake();
  f.view(first, "cards", 999);
  assert.equal(f.cards.hidden, true, "old high-revision view may not revive replacement mount");
  f.view(latest, "cards", 1);
  assert.equal(f.cards.hidden, false);
  f.view(first, "game", 999);
  assert.equal(f.cards.hidden, false);
});

test("strict reentrant Game cancels a slow Cards entry, and stale Cards replay stays hidden", t => {
  const f = fixture(t);
  const session = f.handshake();
  f.setSourceHook(() => {
    f.view(session, "game", 12);
    return { protocol: 1, available: true, capturedAtMs: Date.now() - 1000,
      status: "running", seen: 999 };
  });
  f.view(session, "cards", 11);
  assert.equal(f.cards.hidden, true);
  assert.equal(f.reads, 1);
  f.view(session, "cards", 11);
  assert.equal(f.cards.hidden, true);
  f.setSourceHook(null);
  f.view(session, "cards", 13);
  assert.equal(f.cards.hidden, false);
  assert.equal(f.reads, 2);
});

test("strict session timeout retries hello and refuses a stale challenge", t => {
  const f = fixture(t);
  const old = f.find("session-hello");
  f.fireTimeout();
  f.fireTimeout();
  const latest = f.find("session-hello");
  assert.notEqual(latest.requestId, old.requestId);
  f.send("session-ready", { requestId: old.requestId, sessionId: old.sessionId,
    mountOrdinal: old.mountOrdinal, documentEpoch: epoch });
  assert.equal(f.find("capabilities"), undefined);
  const current = f.handshake();
  f.view(current, "cards", 1);
  assert.equal(f.cards.hidden, false);
});

test("strict timeout preserves high-water revision; only a newer re-ACK view may restore Cards", t => {
  const f = fixture(t);
  const session = f.handshake();
  f.view(session, "cards", 10);
  assert.equal(f.cards.hidden, false);
  const inventory = f.win.document.querySelector('[data-menu-id="inventory"]');
  inventory.disabled = true;
  f.sync();
  const oldPending = f.find("capabilities");
  f.fireTimeout();
  assert.equal(f.cards.hidden, true);
  assert.equal(f.win.document.documentElement.hasAttribute("data-ppbui-coupled-workspace"), false);
  let clicks = 0;
  f.win.document.querySelector('[data-menu-id="inventory"]').addEventListener("click", () => { clicks++; });
  f.send("open-surface", { requestId: "rhyxus-3", surfaceId: "inventory", ...session });
  assert.equal(clicks, 0, "a delayed native action cannot execute while host acceptance is lost");
  f.fireTimeout();
  const retry = f.find("capabilities");
  assert.notEqual(retry.requestId, oldPending.requestId);
  f.send("capabilities-accepted", { requestId: oldPending.requestId, ok: true, ...session });
  f.view(session, "cards", 11);
  assert.equal(f.cards.hidden, true, "view commands remain blocked until current ACK");
  f.send("capabilities-accepted", { requestId: retry.requestId, ok: true,
    ...session, capabilitySeq: retry.capabilitySeq });
  f.view(session, "cards", 10);
  assert.equal(f.cards.hidden, true);
  f.view(session, "cards", 11);
  assert.equal(f.cards.hidden, true,
    "a previous capability generation cannot reveal Cards between ACK and current revision");
  f.view({ ...session, capabilitySeq: retry.capabilitySeq }, "cards", 12);
  assert.equal(f.cards.hidden, false);
});

test("new mount rejects a recycled caps-1 ACK and both independent documents reject cross-profile views", t => {
  const a = fixture(t);
  const b = fixture(t);
  const firstA = a.handshake("a".repeat(32));
  const onlyB = b.handshake("b".repeat(32));
  a.view(onlyB, "cards", 100);
  b.view(firstA, "cards", 100);
  assert.equal(a.cards.hidden, true);
  assert.equal(b.cards.hidden, true);
  a.view(firstA, "cards", 1);
  b.view(onlyB, "cards", 1);
  assert.equal(a.cards.hidden, false);
  assert.equal(b.cards.hidden, false);
  a.remount();
  const hello = a.find("session-hello");
  a.send("session-ready", { requestId: hello.requestId, sessionId: hello.sessionId,
    mountOrdinal: hello.mountOrdinal, documentEpoch: firstA.documentEpoch });
  const latestCaps = a.find("capabilities");
  assert.equal(latestCaps.requestId, "caps-1", "new mount legitimately reuses the sequential request ID");
  a.send("capabilities-accepted", { requestId: "caps-1", ok: true, ...firstA });
  a.view(firstA, "cards", 500);
  assert.equal(a.cards.hidden, true);
  a.send("capabilities-accepted", { requestId: latestCaps.requestId, ok: true,
    sessionId: hello.sessionId, mountOrdinal: hello.mountOrdinal,
    documentEpoch: firstA.documentEpoch, capabilitySeq: latestCaps.capabilitySeq });
  a.view({ sessionId: hello.sessionId, mountOrdinal: hello.mountOrdinal,
    documentEpoch: firstA.documentEpoch, capabilitySeq: latestCaps.capabilitySeq }, "cards", 1);
  assert.equal(a.cards.hidden, false);
  assert.equal(b.cards.hidden, false);
});

test("a fresh copy of the bundle in the same document advances the mount ordinal", async t => {
  const f = fixture(t);
  const initial = f.handshake();
  f.view(initial, "cards", 1);
  const freshModule = await import("../src/modules/coupled-workspace/controller.js?strict-reinjected-copy");
  f.replaceMount(freshModule.mountCoupledWorkspaceAdapter);
  const hello = f.find("session-hello");
  assert.equal(hello.mountOrdinal, initial.mountOrdinal + 1,
    "the document retains its mount ordinal across independent JS module images");
  const next = f.handshake();
  f.view(initial, "cards", 900);
  assert.equal(f.cards.hidden, true);
  f.view(next, "cards", 1);
  assert.equal(f.cards.hidden, false);
});

test("ACK rejection moves focus from hidden Cards to the restored native toolbar", t => {
  const f = fixture(t);
  const session = f.handshake();
  f.view(session, "cards", 1);
  const cardButton = f.cards.querySelector("button");
  assert.ok(cardButton);
  cardButton.focus();
  assert.equal(f.win.document.activeElement, cardButton);
  const nativeButton = f.win.document.querySelector('[data-menu-id="inventory"]');
  nativeButton.textContent = "Updated inventory";
  f.sync();
  const pending = f.find("capabilities");
  f.send("capabilities-accepted", { requestId: pending.requestId, ok: false,
    ...session, capabilitySeq: pending.capabilitySeq });
  assert.equal(f.cards.hidden, true);
  assert.equal(f.win.document.documentElement.hasAttribute("data-ppbui-coupled-workspace"), false);
  assert.equal(f.win.document.activeElement, nativeButton);
});

test("resync-capabilities requests the bound adapter to reannounce without a DOM mutation", t => {
  const f = fixture(t);
  const session = f.handshake();
  f.view(session, "cards", 1);
  const oldCount = f.sent.filter(message => message.type === type("capabilities")).length;
  f.send("resync-capabilities", { ...session, documentEpoch: "f".repeat(32) });
  assert.equal(f.sent.filter(message => message.type === type("capabilities")).length, oldCount);
  f.send("resync-capabilities", { ...session });
  const updated = f.find("capabilities");
  assert.equal(updated.capabilitySeq, session.capabilitySeq + 1);
  f.send("capabilities-accepted", { ...session, requestId: updated.requestId,
    capabilitySeq: updated.capabilitySeq, ok: true });
  f.view(session, "game", 2);
  assert.equal(f.cards.hidden, false, "commands from the prior capability generation stay ignored");
  f.view({ ...session, capabilitySeq: updated.capabilitySeq }, "game", 3);
  assert.equal(f.cards.hidden, true);
});

test("a valid Game transition transfers keyboard focus out of hidden Cards", t => {
  const f = fixture(t);
  const session = f.handshake();
  f.view(session, "cards", 1);
  const cardButton = f.cards.querySelector("button");
  assert.ok(cardButton);
  cardButton.focus();
  assert.equal(f.win.document.activeElement, cardButton);
  f.view(session, "game", 2);
  assert.equal(f.cards.hidden, true);
  assert.equal(f.cards.contains(f.win.document.activeElement), false);
});

test("ACK failure with all native buttons unavailable never traps focus in hidden Cards", t => {
  const f = fixture(t);
  const session = f.handshake();
  f.view(session, "cards", 1);
  const cardButton = f.cards.querySelector("button");
  cardButton.focus();
  const button = f.win.document.querySelector('[data-menu-id="inventory"]');
  button.disabled = true;
  f.sync();
  const pending = f.find("capabilities");
  f.send("capabilities-accepted", { ...session, requestId: pending.requestId,
    capabilitySeq: pending.capabilitySeq, ok: false });
  assert.equal(f.cards.hidden, true);
  assert.equal(f.cards.contains(f.win.document.activeElement), false);
  assert.equal(f.win.document.activeElement, f.win.document.querySelector("nav"));
});
