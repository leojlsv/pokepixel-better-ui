import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createStandaloneCardModeModule, resolveStandaloneRuntimeWindow } from "../src/modules/coupled-workspace/standalone.js";

function setup(t, { coupled = false, analyzerSummary = undefined, extraModules = [] } = {}) {
  const dom = new JSDOM(`<!doctype html><html lang="pt-BR"><head></head><body>
    <button class="world-server-switch" style="position:fixed;top:8px;right:8px">Server</button>
    <section id="native-game-surface"><canvas width="320" height="180"></canvas><div class="moving-sprite">moving</div></section>
    <nav class="pokeidle-top-toolbar"><button data-menu-id="inventory">Inventory</button></nav>
  </body></html>`, { url: "https://pokepixel.nietore.com/play/", pretendToBeVisual: true });
  const { window } = dom;
  let currentAnalyzerSummary = analyzerSummary;
  if (analyzerSummary !== undefined) {
    Object.defineProperty(window, "__POKEPIXEL_HUNT_ANALYZER_PUBLIC__", {
      configurable: true,
      value: { protocol: 1, getSummary: () => currentAnalyzerSummary },
    });
  }
  if (coupled) {
    Object.defineProperty(window, "__PPBUI_COUPLED_WORKSPACE__", { configurable: true, value: { protocol: 1 } });
    Object.defineProperty(window, "chrome", { configurable: true, value: { webview: { postMessage() {} } } });
  }

  const previous = new Map();
  for (const name of ["window", "document", "MutationObserver", "requestAnimationFrame", "cancelAnimationFrame"]) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value: typeof window[name] === "function" && name !== "MutationObserver" ? window[name].bind(window) : window[name],
    });
  }

  const app = createBetterUI({ modules: [...extraModules, createStandaloneCardModeModule()] });
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    app.stop();
  };
  t.after(() => {
    stop();
    dom.window.close();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });

  return {
    app,
    stop,
    window,
    doc: window.document,
    setAnalyzerSummary(value) { currentAnalyzerSummary = value; },
  };
}

test("standalone userscript mounts Card Mode by default from the Analyzer public summary", t => {
  const { app, doc } = setup(t, {
    analyzerSummary: {
      protocol: 1,
      available: true,
      capturedAtMs: Date.now(),
      status: "running",
      activeMs: 5000,
      seen: 12,
      captured: 4,
      failed: 8,
      captureRate: 1 / 3,
    },
  });
  app.start();

  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  const switcher = doc.querySelector("[data-ppbui-card-mode-switch]");
  assert.ok(cards);
  assert.ok(switcher);
  assert.equal(cards.hidden, false);
  assert.deepEqual([...switcher.querySelectorAll("button")].map(button => button.textContent.trim()), ["Cards", "Game"]);
  assert.equal(switcher.parentElement, cards, "Cards/Game belongs to the textual Cards surface instead of floating over the game");
  assert.equal(switcher.querySelector('[data-ppbui-card-mode="cards"]').getAttribute("aria-pressed"), "true");
  assert.equal(switcher.querySelector('[data-ppbui-card-mode="game"]').getAttribute("aria-pressed"), "false");
  assert.equal(cards.querySelector('[data-card-field="seen"]').textContent, "12");
  assert.equal(doc.documentElement.hasAttribute("data-ppbui-coupled-workspace"), false);
  assert.equal(doc.documentElement.getAttribute("data-ppbui-card-mode"), "cards");
  assert.equal(cards.getAttribute("data-ppbui-text-only"), "true");
  assert.equal(doc.defaultView.getComputedStyle(cards).position, "relative", "standalone Cards is a document surface, not a fixed overlay");
  assert.equal(doc.defaultView.getComputedStyle(doc.querySelector("#native-game-surface")).display, "none", "native moving surface leaves layout/paint in Cards mode");
  assert.equal(cards.querySelectorAll(".ppbui-element-icon").length, 0, "text-only Cards does not create type icons");
});

test("textual Card Mode keeps the only native type labels visible at narrow widths", t => {
  const { app, doc } = setup(t, {
    analyzerSummary: {
      protocol: 1, available: true, capturedAtMs: Date.now(), status: "running",
      currentTarget: { speciesId: "charmander", species: "Charmander", elements: ["fire"] },
    },
  });
  app.start();
  const cards = doc.querySelector('[data-ppbui-text-only="true"]');
  const target = cards.querySelector('[data-card-elements="target"]');
  assert.equal(target.querySelector("i")?.textContent, "Fogo");
  assert.equal(target.querySelector(".ppbui-element-icon"), null);
  const css = doc.querySelector("style[data-ppbui-coupled-cards-style]").textContent;
  assert.match(css, /\.ppbui-coupled-cards\[data-ppbui-text-only="true"\] \.ppbui-cards-element i\{display:(?:inline|block|inline-block)/,
    "text-only labels must override the narrow-width rule hiding icon-mode labels");
});

test("Cards and Game remain directly switchable without a floating overlay", t => {
  const { app, doc, stop } = setup(t);
  app.start();
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  const switcher = doc.querySelector("[data-ppbui-card-mode-switch]");
  const cardsButton = switcher.querySelector('[data-ppbui-card-mode="cards"]');
  const gameButton = switcher.querySelector('[data-ppbui-card-mode="game"]');

  gameButton.click();
  assert.equal(cards.hidden, true);
  assert.equal(switcher.isConnected, true);
  assert.equal(switcher.parentElement, doc.querySelector("[data-ppbui-card-mode-dock]"), "Game mode owns a dedicated dock instead of widening native navigation into the server selector");
  assert.equal(switcher.closest(".pokeidle-top-toolbar"), null);
  assert.equal(doc.documentElement.getAttribute("data-ppbui-card-mode"), "game");
  assert.notEqual(doc.defaultView.getComputedStyle(doc.querySelector("#native-game-surface")).display, "none");
  assert.equal(gameButton.getAttribute("aria-pressed"), "true");

  cardsButton.click();
  assert.equal(cards.hidden, false);
  assert.equal(switcher.isConnected, true);
  assert.equal(switcher.parentElement, cards);
  assert.equal(cardsButton.getAttribute("aria-pressed"), "true");

  stop();
  assert.equal(doc.querySelector("[data-ppbui-card-mode-switch]"), null);
  assert.equal(doc.querySelector("[data-ppbui-coupled-cards]"), null);
  assert.equal(doc.querySelector("style[data-ppbui-card-mode-style]"), null);
  assert.equal(doc.documentElement.hasAttribute("data-ppbui-card-mode"), false);
});

test("Cards and Game preserve keyboard focus while the switch moves between surfaces", t => {
  const { app, doc } = setup(t);
  app.start();
  const switcher = doc.querySelector("[data-ppbui-card-mode-switch]");
  const cardsButton = switcher.querySelector('[data-ppbui-card-mode="cards"]');
  const gameButton = switcher.querySelector('[data-ppbui-card-mode="game"]');

  gameButton.focus();
  gameButton.click();
  assert.equal(doc.activeElement, gameButton);
  assert.equal(switcher.parentElement, doc.querySelector("[data-ppbui-card-mode-dock]"));

  cardsButton.focus();
  cardsButton.click();
  assert.equal(doc.activeElement, cardsButton);
  assert.equal(switcher.parentElement, doc.querySelector("[data-ppbui-coupled-cards]"));
  const css = doc.querySelector("style[data-ppbui-card-mode-style]")?.textContent || "";
  assert.match(css, /\.ppbui-card-mode-switch button:focus-visible\{outline:2px solid var\(--ppbui-focus,#37b4d1\);outline-offset:1px\}/);
});

test("Game mode keeps its Cards switch outside native navigation when the toolbar is reconstructed", t => {
  const { app, doc } = setup(t);
  app.start();
  const switcher = doc.querySelector("[data-ppbui-card-mode-switch]");
  switcher.querySelector('[data-ppbui-card-mode="game"]').click();
  const oldToolbar = doc.querySelector(".pokeidle-top-toolbar");
  const replacement = doc.createElement("nav"); replacement.className = "pokeidle-top-toolbar";
  replacement.innerHTML = '<button data-menu-id="inventory">Inventory</button>';
  oldToolbar.replaceWith(replacement);
  assert.equal(switcher.isConnected,true,"dedicated Game/Card dock survives native toolbar reconstruction");
  app.reconcile();
  assert.equal(switcher.isConnected,true);
  assert.equal(switcher.parentElement,doc.querySelector("[data-ppbui-card-mode-dock]"));
  assert.equal(replacement.contains(switcher),false,"native toolbar width/layout stays untouched");
  assert.equal(doc.querySelectorAll("[data-ppbui-card-mode-switch]").length,1);
});

test("Game/Card dock is positioned below the native toolbar instead of the top-right server selector", t => {
  const { app, doc, window } = setup(t);
  const toolbar = doc.querySelector(".pokeidle-top-toolbar");
  const server = doc.querySelector(".world-server-switch");
  toolbar.getBoundingClientRect = () => ({ left:300, right:700, top:0, bottom:64, width:400, height:64 });
  server.getBoundingClientRect = () => ({ left:880, right:1000, top:8, bottom:42, width:120, height:34 });
  Object.defineProperty(window, "innerWidth", { configurable:true, value:1024 });
  Object.defineProperty(window, "innerHeight", { configurable:true, value:768 });
  app.start();
  const switcher = doc.querySelector("[data-ppbui-card-mode-switch]");
  switcher.getBoundingClientRect = () => ({ left:0, right:118, top:0, bottom:34, width:118, height:34 });
  switcher.querySelector('[data-ppbui-card-mode="game"]').click();
  const dock = doc.querySelector("[data-ppbui-card-mode-dock]");
  assert.equal(dock.style.top,"70px");
  assert.equal(dock.style.left,"441px");
  assert.ok(Number.parseInt(dock.style.left,10)+118 < server.getBoundingClientRect().left,"dedicated centered dock does not overlap the server selector");
});

test("standalone runtime prefers Tampermonkey unsafeWindow when it owns the same document", t => {
  const { window } = setup(t);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis,"unsafeWindow");
  Object.defineProperty(globalThis,"unsafeWindow",{configurable:true,value:window});
  t.after(()=>descriptor?Object.defineProperty(globalThis,"unsafeWindow",descriptor):delete globalThis.unsafeWindow);
  const isolated = { document:window.document };
  assert.equal(resolveStandaloneRuntimeWindow(isolated),window);
});

test("native game navigation switches to Game before preserving the native action", t => {
  const { app, doc } = setup(t);
  const inventory = doc.querySelector('[data-menu-id="inventory"]');
  let nativeClicks = 0;
  let gameVisibleInsideNativeHandler = false;
  let cards = null;
  inventory.addEventListener("click", () => {
    nativeClicks += 1;
    gameVisibleInsideNativeHandler = cards?.hidden === true;
  });
  app.start();
  cards = doc.querySelector("[data-ppbui-coupled-cards]");
  const gameButton = doc.querySelector('[data-ppbui-card-mode="game"]');
  assert.equal(cards.hidden, false);

  inventory.click();

  assert.equal(nativeClicks, 1, "Card Mode must not replace or suppress the native action");
  assert.equal(gameVisibleInsideNativeHandler, true, "Game must already be visible when the native handler runs");
  assert.equal(cards.hidden, true, "native navigation must reveal Game before the native surface opens");
  assert.equal(gameButton.getAttribute("aria-pressed"), "true");
});

test("standalone Card Mode polls late Analyzer availability without remounting", t => {
  const { app, doc, window } = setup(t);
  let analyzerPoll = null;
  window.setInterval = callback => { analyzerPoll = callback; return 1; };
  window.clearInterval = () => {};
  app.start();
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  const before = cards;
  assert.equal(cards.querySelector('[data-card-field="seen"]').textContent, "—");
  assert.equal(typeof analyzerPoll, "function");

  Object.defineProperty(window, "__POKEPIXEL_HUNT_ANALYZER_PUBLIC__", {
    configurable: true,
    value: {
      protocol: 1,
      getSummary: () => ({
        protocol: 1,
        available: true,
        capturedAtMs: Date.now(),
        status: "running",
        seen: 27,
        captured: 9,
        failed: 18,
      }),
    },
  });
  analyzerPoll();

  assert.equal(doc.querySelector("[data-ppbui-coupled-cards]"), before);
  assert.equal(cards.querySelector('[data-card-field="seen"]').textContent, "27");
});

test("standalone Card Mode stays out of an active coupled WebView2 host", t => {
  const { app, doc } = setup(t, { coupled: true });
  app.start();
  assert.equal(doc.querySelector("[data-ppbui-card-mode-switch]"), null);
  assert.equal(doc.querySelector("[data-ppbui-coupled-cards]"), null);
});

test("textual Cards suspends other Better UI modules and Game remounts them", async t => {
  let mounts = 0;
  let cleanups = 0;
  const visualModule = {
    id: "visual-test-module",
    shouldMount: () => true,
    mount() {
      mounts += 1;
      return () => { cleanups += 1; };
    },
  };
  const { app, doc, window } = setup(t, { extraModules: [visualModule] });
  app.start();
  await new Promise(resolve => window.setTimeout(resolve, 0));
  assert.equal(mounts, 1);
  assert.equal(cleanups, 1, "Cards unmounts non-essential Better UI modules after entering textual mode");

  doc.querySelector('[data-ppbui-card-mode="game"]').click();
  await new Promise(resolve => window.setTimeout(resolve, 0));
  assert.equal(mounts, 2, "Game restores normal Better UI modules");
  assert.equal(cleanups, 1);

  doc.querySelector('[data-ppbui-card-mode="cards"]').click();
  await new Promise(resolve => window.setTimeout(resolve, 0));
  assert.equal(cleanups, 2, "returning to Cards releases visual module DOM/listeners again");
});
