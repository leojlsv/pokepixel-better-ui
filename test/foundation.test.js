import assert from "node:assert/strict";
import { test } from "node:test";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createLifecycle } from "../src/core/lifecycle.js";
import { createDomObserver } from "../src/core/observer.js";

function mockBrowser(t) {
  const frames = new Map();
  const observers = [];
  let nextFrame = 0;
  t.mock.method(globalThis, "requestAnimationFrame", (callback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  t.mock.method(globalThis, "cancelAnimationFrame", (id) => frames.delete(id));
  t.mock.method(globalThis, "MutationObserver", class {
    constructor(callback) {
      this.callback = callback;
      this.observe = () => {};
      this.disconnect = () => {};
      observers.push(this);
    }
  });
  return {
    mutate(records) { observers[0].callback(records); },
    flush() {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback());
    },
    frames,
    observers,
  };
}

function fakeElement(className = "", parent = null, attributes = []) {
  const classes = new Set(String(className).split(/\s+/).filter(Boolean));
  const attrs = new Set(attributes);
  const matchesOne = selector => {
    const scoped = selector.match(/^\.([\w-]+)\[([\w-]+)\]$/);
    if (scoped) return classes.has(scoped[1]) && attrs.has(scoped[2]);
    return /^\.[\w-]+$/.test(selector) && classes.has(selector.slice(1));
  };
  return {
    nodeType: 1,
    parentElement: parent,
    matches(selector) {
      return selector.split(",").some(part => matchesOne(part.trim()));
    },
    closest(selector) {
      if (this.matches(selector)) return this;
      return parent?.closest?.(selector) || null;
    },
    querySelector() { return null; },
  };
}

// Node has no browser globals; each test restores its mocked implementations.
globalThis.document = { body: {} };
globalThis.requestAnimationFrame = () => {};
globalThis.cancelAnimationFrame = () => {};
globalThis.MutationObserver = class {};

test("stop cancels pending reconciliation and allows a clean restart", (t) => {
  const browser = mockBrowser(t);
  let mounts = 0;
  let cleanups = 0;
  const app = createBetterUI({ modules: [{
    id: "fixture",
    shouldMount: () => true,
    mount() {
      mounts++;
      return () => cleanups++;
    },
  }] });
  app.start();
  browser.mutate();
  app.stop();
  browser.flush();
  assert.equal(mounts, 1);
  assert.equal(cleanups, 1);
  app.start();
  assert.equal(mounts, 2);
  app.stop();
  assert.equal(cleanups, 2);
});

test("one observer coalesces bursts and reconciliation mounts/unmounts once", (t) => {
  const browser = mockBrowser(t);
  let present = true;
  let mounts = 0;
  let cleanups = 0;
  const app = createBetterUI({ modules: [{
    id: "fixture",
    shouldMount: () => present,
    mount() {
      mounts++;
      return () => cleanups++;
    },
  }] });
  app.start();
  app.start();
  browser.mutate();
  browser.mutate();
  assert.equal(browser.observers.length, 1);
  assert.equal(browser.frames.size, 1);
  browser.flush();
  assert.equal(mounts, 1);
  present = false;
  browser.mutate();
  browser.flush();
  assert.equal(cleanups, 1);
  present = true;
  browser.mutate();
  browser.flush();
  assert.equal(mounts, 2);
  app.stop();
  app.stop();
  assert.equal(cleanups, 2);
});

test("combat presentation churn does not wake the global UI reconciler", (t) => {
  const browser = mockBrowser(t);
  let reconciles = 0;
  const observer = createDomObserver(() => reconciles++);
  observer.start(document.body);

  const body = fakeElement();
  const burst = fakeElement("pokeidle-battle-popup-burst");
  const nameplate = fakeElement("pokeidle-nameplate-enemy");
  const platformMove = fakeElement("platform-hunt__move");
  const platformEffects = fakeElement("platform-hunt__effects");
  const relevant = fakeElement("game-window");

  browser.mutate([{ type: "childList", target: body, addedNodes: [burst], removedNodes: [] }]);
  browser.mutate([{ type: "attributes", target: nameplate, attributeName: "hidden" }]);
  browser.mutate([{ type: "childList", target: platformMove, addedNodes: [], removedNodes: [] }]);
  browser.mutate([{ type: "childList", target: platformEffects, addedNodes: [fakeElement("pokeidle-damage-popup")], removedNodes: [] }]);
  assert.equal(browser.frames.size, 0, "transient Hunt presentation must not schedule a full Better UI reconcile");

  browser.mutate([{ type: "childList", target: body, addedNodes: [relevant], removedNodes: [] }]);
  assert.equal(browser.frames.size, 1, "ordinary UI structure changes still schedule reconciliation");
  browser.flush();
  assert.equal(reconciles, 1);
  observer.stop();
});

test("Platform Hunt internal renderer churn never wakes global discovery but root lifecycle still does", (t) => {
  const browser = mockBrowser(t);
  const scopes = [];
  const observer = createDomObserver(scope => scopes.push(scope));
  observer.start(document.body);

  const body = fakeElement();
  const platform = fakeElement("platform-hunt", body);
  const teamSwitcher = fakeElement("platform-hunt__team-switcher", platform);
  const member = fakeElement("platform-hunt__team-member", teamSwitcher);
  const status = fakeElement("platform-hunt__team-status", member);

  // Mirrors renderTeamSwitcher(): reappend the button, rewrite aria-disabled,
  // and replace status text for every companion-vitals event.
  browser.mutate([{ type: "childList", target: teamSwitcher, addedNodes: [member], removedNodes: [member] }]);
  browser.mutate([{ type: "attributes", target: member, attributeName: "aria-disabled" }]);
  browser.mutate([{ type: "childList", target: status, addedNodes: [], removedNodes: [] }]);
  assert.equal(browser.frames.size, 0, "Platform Hunt owns its internal renderer mutations; Better UI consumes none of those descendants");

  browser.mutate([{ type: "childList", target: body, addedNodes: [platform], removedNodes: [] }]);
  assert.equal(browser.frames.size, 1, "attaching the Platform Hunt root must still wake the global lifecycle");
  browser.flush();
  assert.deepEqual(scopes, ["global"]);

  browser.mutate([{ type: "childList", target: body, addedNodes: [], removedNodes: [platform] }]);
  browser.flush();
  assert.deepEqual(scopes, ["global", "global"], "detaching the Platform Hunt root must still wake the global lifecycle");
  observer.stop();
});

test("Platform Hunt keeps the shared Buff Strip observable while ignoring its private renderer", (t) => {
  const browser = mockBrowser(t);
  const scopes = [];
  const observer = createDomObserver(scope => scopes.push(scope));
  observer.start(document.body);

  const body = fakeElement();
  const platform = fakeElement("platform-hunt", body);
  const buffHost = fakeElement("platform-hunt__buff-host", platform);
  const buffStrip = fakeElement("pokeidle-buff-strip", buffHost);
  const pill = fakeElement("pokeidle-buff-pill", buffStrip);

  browser.mutate([{ type: "childList", target: buffHost, addedNodes: [buffStrip], removedNodes: [] }]);
  browser.flush();
  browser.mutate([{ type: "childList", target: buffStrip, addedNodes: [pill], removedNodes: [] }]);
  browser.flush();
  assert.deepEqual(scopes, ["global", "global"], "Buff Strip is shared with Better UI and must remain observable inside Platform Hunt");
  observer.stop();
});

test("Team HUD auxiliary sibling churn is ignored while auxiliary root lifecycle stays global", (t) => {
  const browser = mockBrowser(t);
  const scopes = [];
  const observer = createDomObserver(scope => scopes.push(scope));
  observer.start(document.body);

  const body = fakeElement();
  const wallet = fakeElement("pokeidle-team-hud__wallet", body);
  const walletValue = fakeElement("pokeidle-currency__amount", wallet);
  const mobile = fakeElement("pokeidle-mobile-party-button", body);
  const mobileHp = fakeElement("pokeidle-mobile-party-button__hp", mobile);

  browser.mutate([{ type: "childList", target: wallet, addedNodes: [walletValue], removedNodes: [] }]);
  browser.mutate([{ type: "childList", target: mobile, addedNodes: [mobileHp], removedNodes: [] }]);
  assert.equal(browser.frames.size, 0, "vitals-driven wallet/mobile rerenders must not fan out into global discovery");

  browser.mutate([{ type: "childList", target: body, addedNodes: [wallet], removedNodes: [] }]);
  browser.flush();
  browser.mutate([{ type: "childList", target: body, addedNodes: [], removedNodes: [mobile] }]);
  browser.flush();
  assert.deepEqual(scopes, ["global", "global"], "adding/removing auxiliary roots remains lifecycle-visible");
  observer.stop();
});

test("enhanced Team HUD churn stays local while structural or mixed mutations promote to global", (t) => {
  const browser = mockBrowser(t);
  const scopes = [];
  const observer = createDomObserver(scope => scopes.push(scope));
  observer.start(document.body);

  const body = fakeElement();
  const hud = fakeElement("pokeidle-team-hud", body, ["data-ppbui-team-hud-enhanced"]);
  const list = fakeElement("pokeidle-team-hud__list", hud);
  const card = fakeElement("pokeidle-team-card", list);
  const relevant = fakeElement("game-window", body);

  browser.mutate([{ type: "childList", target: list, addedNodes: [card], removedNodes: [] }]);
  browser.flush();
  assert.deepEqual(scopes, ["team-hud"], "native card reappend should not wake every Better UI module");

  browser.mutate([{ type: "attributes", target: card, attributeName: "aria-disabled" }]);
  browser.mutate([{ type: "childList", target: body, addedNodes: [relevant], removedNodes: [] }]);
  browser.flush();
  assert.deepEqual(scopes, ["team-hud", "global"], "a relevant mutation in the same frame must promote local work to a full reconcile");

  browser.mutate([{ type: "childList", target: hud, addedNodes: [], removedNodes: [list] }]);
  browser.flush();
  assert.deepEqual(scopes, ["team-hud", "global", "global"], "replacing the Team HUD mount sentinel must re-run the lifecycle gate");
  observer.stop();
});

test("persistent Chat message churn stays local while tab-bar lifecycle remains global", (t) => {
  const browser = mockBrowser(t);
  const scopes = [];
  const observer = createDomObserver(scope => scopes.push(scope));
  observer.start(document.body);

  const body = fakeElement();
  const chat = fakeElement("pokeidle-persistent-chat", body);
  const tabs = fakeElement("pokeidle-persistent-chat__tabs", chat);
  const tab = fakeElement("pokeidle-persistent-chat__tab", tabs);
  const log = fakeElement("pokeidle-persistent-chat__log", chat);
  const message = fakeElement("pokeidle-chat-message", log);

  browser.mutate([{ type: "childList", target: log, addedNodes: [message], removedNodes: [] }]);
  browser.flush();
  browser.mutate([{ type: "attributes", target: tab, attributeName: "hidden" }]);
  browser.flush();
  assert.deepEqual(scopes, ["chat", "chat"], "message/unread churn should reconcile only Chat-aware modules");

  browser.mutate([{ type: "childList", target: chat, addedNodes: [], removedNodes: [tabs] }]);
  browser.flush();
  assert.deepEqual(scopes, ["chat", "chat", "global"], "replacing the Chat tab bar must re-run the full mount-key lifecycle");
  observer.stop();
});

test("different local observer scopes in one frame promote to global", (t) => {
  const browser = mockBrowser(t);
  const scopes = [];
  const observer = createDomObserver(scope => scopes.push(scope));
  observer.start(document.body);

  const body = fakeElement();
  const chat = fakeElement("pokeidle-persistent-chat", body);
  const log = fakeElement("pokeidle-persistent-chat__log", chat);
  const hud = fakeElement("pokeidle-team-hud", body, ["data-ppbui-team-hud-enhanced"]);
  const list = fakeElement("pokeidle-team-hud__list", hud);

  browser.mutate([{ type: "childList", target: log, addedNodes: [fakeElement("pokeidle-chat-message", log)], removedNodes: [] }]);
  browser.mutate([{ type: "childList", target: list, addedNodes: [fakeElement("pokeidle-team-card", list)], removedNodes: [] }]);
  browser.flush();

  assert.deepEqual(scopes, ["global"], "mixed Chat/Team HUD work cannot be represented by one local scope");
  observer.stop();
});

test("Team HUD observer scope reconciles only opted-in mounted modules", (t) => {
  const browser = mockBrowser(t);
  const calls = { globalMountCheck: 0, globalSync: 0, hudMountCheck: 0, hudSync: 0, presetMountCheck: 0, presetSync: 0 };
  const hudTriggers = [], presetTriggers = [];
  const app = createBetterUI({ modules: [
    {
      id: "global-fixture",
      shouldMount() { calls.globalMountCheck++; return true; },
      mount: () => () => {},
      reconcile() { calls.globalSync++; },
    },
    {
      id: "hud-fixture",
      observerScopes: ["team-hud"],
      shouldMount() { calls.hudMountCheck++; return true; },
      mount: () => () => {},
      reconcile(trigger) { calls.hudSync++; hudTriggers.push(trigger); },
    },
    {
      id: "preset-fixture",
      observerScopes: ["team-hud"],
      shouldMount() { calls.presetMountCheck++; return true; },
      mount: () => () => {},
      reconcile(trigger) { calls.presetSync++; presetTriggers.push(trigger); },
    },
  ] });
  app.start();
  assert.deepEqual(calls, { globalMountCheck: 1, globalSync: 1, hudMountCheck: 1, hudSync: 1, presetMountCheck: 1, presetSync: 1 });

  const body = fakeElement();
  const hud = fakeElement("pokeidle-team-hud", body, ["data-ppbui-team-hud-enhanced"]);
  const list = fakeElement("pokeidle-team-hud__list", hud);
  browser.mutate([{ type: "childList", target: list, addedNodes: [fakeElement("pokeidle-team-card", list)], removedNodes: [] }]);
  browser.flush();

  assert.deepEqual(calls, {
    globalMountCheck: 1, globalSync: 1,
    hudMountCheck: 1, hudSync: 2,
    presetMountCheck: 1, presetSync: 2,
  }, "local HUD churn must bypass document-wide shouldMount discovery");
  assert.deepEqual(hudTriggers, ["explicit", "observer:team-hud"]);
  assert.deepEqual(presetTriggers, ["explicit", "observer:team-hud"], "scoped modules receive the narrow trigger so they can avoid unrelated document discovery");
  app.stop();
});

test("destroy cleans healthy modules and retains failed cleanup ownership for retry", () => {
  const lifecycle = createLifecycle();
  const failure = new Error("fixture cleanup failed");
  let cleaned = false, attempts = 0;
  lifecycle.mount("broken", () => { if (++attempts === 1) throw failure; });
  lifecycle.mount("healthy", () => { cleaned = true; });
  assert.throws(() => lifecycle.destroy(), (error) => error === failure);
  assert.equal(cleaned, true);
  assert.equal(lifecycle.isMounted("broken"), true, "failed cleanup keeps ownership so reconcile cannot mount over leaked state");
  assert.equal(lifecycle.isMounted("healthy"), false);
  assert.doesNotThrow(() => lifecycle.destroy());
  assert.equal(attempts, 2);
  assert.equal(lifecycle.isMounted("broken"), false);
});

test("failed module cleanup cannot trigger a duplicate mount on later reconcile", (t) => {
  mockBrowser(t);
  t.mock.method(console, "error", () => {});
  let enabled = true, mounts = 0, cleanupAttempts = 0;
  const app = createBetterUI({ modules: [{
    id: "fixture",
    shouldMount: () => enabled,
    getMountKey: () => "stable-root",
    mount() {
      mounts++;
      return () => { cleanupAttempts++; throw new Error("fixture cleanup failed"); };
    },
  }] });
  app.start();
  enabled = false;
  app.reconcile();
  assert.equal(cleanupAttempts, 1);
  enabled = true;
  app.reconcile();
  assert.equal(mounts, 1, "failed cleanup retains module ownership instead of mounting a second instance");
});
