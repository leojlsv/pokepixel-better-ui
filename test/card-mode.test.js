import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createStandaloneCardModeModule, resolveStandaloneRuntimeWindow } from "../src/modules/coupled-workspace/standalone.js";
import { createMenuBarModule } from "../src/modules/menu-bar/index.js";

function setup(t, { coupled = false, analyzerSummary = undefined, analyzerUi = undefined, extraModules = [] } = {}) {
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
  const setAnalyzerUi = value => {
    if (value === undefined) {
      delete window.__POKEPIXEL_HUNT_ANALYZER_UI__;
      return;
    }
    Object.defineProperty(window, "__POKEPIXEL_HUNT_ANALYZER_UI__", {
      configurable: true,
      value,
    });
  };
  setAnalyzerUi(analyzerUi);
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
    setAnalyzerUi,
  };
}

test("standalone userscript starts in Game and renders Analyzer data after entering Cards", t => {
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
  const toolbar = doc.querySelector(".pokeidle-top-toolbar");
  const toggle = doc.querySelector("[data-ppbui-card-mode-toggle]");
  assert.ok(cards);
  assert.ok(toggle);
  assert.equal(cards.hidden, true);
  assert.equal(toggle.parentElement, toolbar, "Cards/Game is a stable native-toolbar control instead of a movable HUD");
  assert.equal(toggle.querySelector(".pokeidle-top-toolbar__label")?.textContent, "Cards/Game");
  assert.equal(toggle.getAttribute("aria-pressed"), "false");
  assert.equal(toggle.dataset.ppbuiCardModeState, "game");
  assert.equal(doc.documentElement.getAttribute("data-ppbui-card-mode"), "game");
  assert.notEqual(doc.defaultView.getComputedStyle(doc.querySelector("#native-game-surface")).display, "none");
  toggle.click();
  assert.equal(cards.hidden, false);
  assert.equal(toggle.getAttribute("aria-pressed"), "true");
  assert.equal(toggle.dataset.ppbuiCardModeState, "cards");
  assert.equal(cards.querySelector('[data-card-field="seen"]').textContent, "12");
  assert.equal(doc.documentElement.hasAttribute("data-ppbui-coupled-workspace"), false);
  assert.equal(doc.documentElement.getAttribute("data-ppbui-card-mode"), "cards");
  assert.equal(cards.getAttribute("data-ppbui-text-only"), "true");
  assert.equal(cards.getAttribute("data-ppbui-combat-art"), "true");
  assert.equal(doc.defaultView.getComputedStyle(cards).position, "relative", "standalone Cards is a document surface, not a fixed overlay");
  assert.equal(doc.defaultView.getComputedStyle(doc.documentElement).overflow, "hidden", "Cards locks viewport scrolling at the document root");
  assert.equal(doc.defaultView.getComputedStyle(doc.body).overflow, "hidden", "Cards keeps page height pinned to the viewport and owns its own scroll");
  assert.equal(doc.defaultView.getComputedStyle(doc.querySelector("#native-game-surface")).display, "none", "native moving surface leaves layout/paint in Cards mode");
  assert.notEqual(doc.defaultView.getComputedStyle(toolbar).display, "none", "menu bar remains visible in Cards so the toggle never has to move");
  assert.equal(cards.querySelectorAll(".ppbui-element-icon").length, 0, "text-only Cards does not create type icons");
  assert.notEqual(doc.defaultView.getComputedStyle(cards.querySelector(".ppbui-cards-combat-art")).display, "none",
    "standalone Cards keeps only the static Active/Target art surface enabled");
  assert.equal(cards.querySelector('[data-card-sprite-fallback="target"]').hidden, false,
    "waiting Target keeps an explicit visual placeholder instead of a large empty card");
  const cardsCss = doc.querySelector("style[data-ppbui-coupled-cards-style]").textContent;
  assert.match(cardsCss, /\.ppbui-coupled-cards\[data-ppbui-text-only="true"\]\{[^}]*height:calc\(100vh - var\(--ppbui-card-mode-bottom-inset,0px\)\);height:calc\(100dvh - var\(--ppbui-card-mode-bottom-inset,0px\)\);min-height:0;[^}]*overflow:auto/,
    "standalone Card Mode height is bounded by the dynamic viewport and scroll stays inside Cards");
  assert.equal(doc.querySelector("[data-ppbui-card-mode-dock]"), null);
  assert.equal(doc.querySelector("[data-ppbui-card-mode-switch]"), null);
  assert.equal(cards.querySelector('[data-card-analyzer-open="current"]').hidden, true,
    "Analyzer drilldown stays absent when the optional UI contract is unavailable");
});

test("standalone Card Mode discovers the optional Analyzer UI bridge and deep-links semantically", async t => {
  const destinations = [];
  const summary = {
    protocol: 1, available: true, capturedAtMs: Date.now(), status: "running",
    seen: 12, captured: 4, failed: 8,
  };
  const analyzerUi = {
    protocol: 1,
    async navigate(destination) {
      destinations.push(destination);
      return { ok: true };
    },
  };
  const { app, doc, setAnalyzerUi } = setup(t, { analyzerSummary: summary });
  app.start();
  doc.querySelector("[data-ppbui-card-mode-toggle]").click();
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  const captureLink = cards.querySelector('[data-card-analyzer-open="current"]');
  const rarityLink = cards.querySelector('[data-card-analyzer-open="current-rarity"]');
  const storyLink = cards.querySelector("[data-card-analyzer-story]");
  assert.equal(captureLink.hidden, true);
  assert.equal(rarityLink.hidden, true);
  assert.equal(storyLink.hidden, true);

  setAnalyzerUi(analyzerUi);
  app.reconcile();
  assert.equal(captureLink.hidden, false, "late Analyzer UI availability is discovered without remounting Cards");
  assert.equal(rarityLink.hidden, false);
  assert.equal(storyLink.hidden, false);
  assert.equal(captureLink.getAttribute("aria-label"), "Abrir detalhes de Captura no Analyzer");
  assert.equal(rarityLink.getAttribute("aria-label"), "Abrir detalhes de raridade no Analyzer");
  assert.equal(storyLink.getAttribute("aria-label"), "Abrir Attempts no Analyzer");

  captureLink.click();
  await new Promise(resolve => setImmediate(resolve));
  rarityLink.click();
  await new Promise(resolve => setImmediate(resolve));
  storyLink.click();
  await new Promise(resolve => setImmediate(resolve));
  cards.querySelector('[data-card-story-tab="loot"]').click();
  assert.equal(storyLink.getAttribute("aria-label"), "Abrir histórico de Loot no Analyzer");
  storyLink.click();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(destinations, ["current", "current-rarity", "history-attempts", "history-loot"]);

  setAnalyzerUi({ protocol: 2, navigate: analyzerUi.navigate });
  app.reconcile();
  assert.equal(captureLink.hidden, true, "wrong UI protocol fails closed without affecting Card Mode");
  assert.equal(storyLink.hidden, true);
});

test("standalone Card Mode reserves the viewport strip occupied by a bottom native toolbar", t => {
  const { app, doc, window } = setup(t, {
    analyzerSummary: { protocol: 1, available: true, capturedAtMs: Date.now(), status: "running" },
  });
  const toolbar = doc.querySelector(".pokeidle-top-toolbar");
  Object.defineProperty(doc.documentElement, "clientHeight", { configurable: true, value: 720 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 720 });
  toolbar.getBoundingClientRect = () => ({
    left: 120, right: 640, top: 640, bottom: 700, width: 520, height: 60, x: 120, y: 640, toJSON() {},
  });

  app.start();
  doc.querySelector("[data-ppbui-card-mode-toggle]").click();
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  assert.equal(cards.style.getPropertyValue("--ppbui-card-mode-bottom-inset"), "88px",
    "Cards ends above a horizontal toolbar docked near the viewport bottom, including the 8px separation gap");
  const cardsCss = doc.querySelector("style[data-ppbui-coupled-cards-style]").textContent;
  assert.match(cardsCss, /height:calc\(100dvh - var\(--ppbui-card-mode-bottom-inset,0px\)\)/,
    "standalone Cards subtracts the measured bottom chrome from the dynamic viewport");

  toolbar.getBoundingClientRect = () => ({
    left: 120, right: 640, top: 600, bottom: 660, width: 520, height: 60, x: 120, y: 600, toJSON() {},
  });
  window.dispatchEvent(new window.Event("resize"));
  assert.equal(cards.style.getPropertyValue("--ppbui-card-mode-bottom-inset"), "128px",
    "toolbar geometry changes recompute the live reservation without remounting Card Mode");

  toolbar.getBoundingClientRect = () => ({
    left: 120, right: 640, top: 400, bottom: 460, width: 520, height: 60, x: 120, y: 400, toJSON() {},
  });
  window.dispatchEvent(new window.Event("resize"));
  assert.equal(cards.style.getPropertyValue("--ppbui-card-mode-bottom-inset"), "0px",
    "a horizontally dragged toolbar away from the bottom edge does not collapse the usable Cards height");

  toolbar.setAttribute("data-ppbui-menu-orientation", "vertical");
  window.dispatchEvent(new window.Event("resize"));
  assert.equal(cards.style.getPropertyValue("--ppbui-card-mode-bottom-inset"), "0px",
    "a vertical toolbar does not reserve a full-width bottom strip");
});

test("standalone Card Mode renders authoritative Active and Target art without enabling secondary type sprites", async t => {
  const { app, doc, window } = setup(t, {
    analyzerSummary: {
      protocol: 1, available: true, capturedAtMs: Date.now(), status: "running",
      currentTarget: {
        speciesId: "dragonite", zoneId: "zone-dragon", species: "Dragonite",
        level: 78, rarity: "legendary", shiny: true, elements: ["dragon", "flying"],
      },
      attemptHistory: [],
    },
  });
  const hud = doc.createElement("div");
  hud.className = "pokeidle-team-hud";
  doc.body.append(hud);
  window.PokeIdle = {
    PersistentHud: {
      _teamHud: {
        el: hud,
        _creatures: [{
          id: "lead", species_id: "gyarados", name: "Gyarados", level: 218,
          hp: 3200, max_hp: 3500, elements: ["water", "flying"], is_leader: true,
        }],
      },
    },
    Api: {
      async getSpecies(id) {
        return {
          id,
          name: id,
          normal_sprite_url: `/native-species/${id}.png`,
          shiny_sprite_url: `/native-species/${id}-shiny.png`,
        };
      },
    },
    Bus: { on() {}, off() {} },
  };
  app.start();
  doc.querySelector("[data-ppbui-card-mode-toggle]").click();
  await new Promise(resolve => window.setTimeout(resolve, 0));
  await new Promise(resolve => window.setTimeout(resolve, 0));
  app.reconcile();
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  const active = cards.querySelector('[data-card-sprite="player"]');
  const target = cards.querySelector('[data-card-sprite="target"]');
  assert.equal(active.hidden, false);
  assert.equal(target.hidden, false);
  assert.match(active.src, /\/native-species\/gyarados\.png$/);
  assert.match(target.src, /\/native-species\/dragonite-shiny\.png$/);
  assert.equal(cards.querySelectorAll(".ppbui-element-icon").length, 0,
    "enabling the two combat portraits does not re-enable secondary graphical type icons");
});

test("textual Card Mode keeps the only native type labels visible at narrow widths", t => {
  const { app, doc } = setup(t, {
    analyzerSummary: {
      protocol: 1, available: true, capturedAtMs: Date.now(), status: "running",
      currentTarget: { speciesId: "charmander", species: "Charmander", elements: ["fire"] },
    },
  });
  app.start();
  doc.querySelector("[data-ppbui-card-mode-toggle]").click();
  const cards = doc.querySelector('[data-ppbui-text-only="true"]');
  const target = cards.querySelector('[data-card-elements="target"]');
  assert.equal(target.querySelector("i")?.textContent, "Fogo");
  assert.equal(target.querySelector(".ppbui-element-icon"), null);
  const css = doc.querySelector("style[data-ppbui-coupled-cards-style]").textContent;
  assert.match(css, /\.ppbui-coupled-cards\[data-ppbui-text-only="true"\] \.ppbui-cards-element i\{display:(?:inline|block|inline-block)/,
    "text-only labels must override the narrow-width rule hiding icon-mode labels");
});

test("one fixed menu-bar toggle switches Cards and Game without moving DOM position", t => {
  const { app, doc, stop } = setup(t);
  app.start();
  const cards = doc.querySelector("[data-ppbui-coupled-cards]");
  const toolbar = doc.querySelector(".pokeidle-top-toolbar");
  const toggle = doc.querySelector("[data-ppbui-card-mode-toggle]");
  const initialParent = toggle.parentElement;
  const initialIndex = [...toolbar.children].indexOf(toggle);

  assert.equal(cards.hidden, true);
  assert.equal(toggle.getAttribute("aria-pressed"), "false");
  assert.equal(toggle.dataset.ppbuiCardModeState, "game");
  toggle.click();
  assert.equal(cards.hidden, false);
  assert.equal(toggle.isConnected, true);
  assert.equal(toggle.parentElement, initialParent);
  assert.equal(toggle.parentElement, toolbar);
  assert.equal([...toolbar.children].indexOf(toggle), initialIndex, "Cards keeps the toggle in the same toolbar slot");
  assert.equal(doc.documentElement.getAttribute("data-ppbui-card-mode"), "cards");
  assert.equal(doc.defaultView.getComputedStyle(doc.querySelector("#native-game-surface")).display, "none");
  assert.equal(toggle.getAttribute("aria-pressed"), "true");
  assert.equal(toggle.dataset.ppbuiCardModeState, "cards");

  toggle.click();
  assert.equal(cards.hidden, true);
  assert.equal(toggle.isConnected, true);
  assert.equal(toggle.parentElement, initialParent);
  assert.equal([...toolbar.children].indexOf(toggle), initialIndex, "Game keeps the toggle in the same toolbar slot");
  assert.equal(toggle.getAttribute("aria-pressed"), "false");
  assert.equal(toggle.dataset.ppbuiCardModeState, "game");

  stop();
  assert.equal(doc.querySelector("[data-ppbui-card-mode-toggle]"), null);
  assert.equal(doc.querySelector("[data-ppbui-coupled-cards]"), null);
  assert.equal(doc.querySelector("style[data-ppbui-card-mode-style]"), null);
  assert.equal(doc.documentElement.hasAttribute("data-ppbui-card-mode"), false);
  assert.equal(toolbar.hasAttribute("data-ppbui-card-mode-toolbar"), false);
  assert.equal(toolbar.hasAttribute("data-ppbui-card-mode-toolbar-path"), false);
});

test("Cards and Game preserve keyboard focus on the fixed menu-bar toggle", t => {
  const { app, doc } = setup(t);
  app.start();
  const toggle = doc.querySelector("[data-ppbui-card-mode-toggle]");
  const toolbar = doc.querySelector(".pokeidle-top-toolbar");

  toggle.focus();
  toggle.click();
  assert.equal(doc.activeElement, toggle);
  assert.equal(toggle.parentElement, toolbar);

  toggle.click();
  assert.equal(doc.activeElement, toggle);
  assert.equal(toggle.parentElement, toolbar);
  const css = doc.querySelector("style[data-ppbui-card-mode-style]")?.textContent || "";
  assert.match(css, /\[data-ppbui-card-mode-toggle\].*ppbui-card-mode-toggle-track/s);
  assert.doesNotMatch(css, /--ppbui-radius,0px/);
  assert.match(css, /\[data-ppbui-card-mode-toggle\]:focus-visible\{outline:2px solid var\(--ppbui-focus,#37b4d1\)!important;outline-offset:1px!important\}/);
});

test("toolbar reconstruction rehomes the same Cards/Game toggle, preserves owned focus and never steals external focus", t => {
  const { app, doc } = setup(t);
  app.start();
  const toggle = doc.querySelector("[data-ppbui-card-mode-toggle]");
  const oldToolbar = doc.querySelector(".pokeidle-top-toolbar");
  toggle.focus();
  assert.equal(doc.activeElement, toggle);
  const replacement = doc.createElement("nav"); replacement.className = "pokeidle-top-toolbar";
  replacement.innerHTML = '<button data-menu-id="inventory">Inventory</button>';
  oldToolbar.replaceWith(replacement);
  assert.equal(toggle.isConnected,false,"toggle follows toolbar ownership instead of floating independently");
  app.reconcile();
  assert.equal(toggle.isConnected,true);
  assert.equal(toggle.parentElement,replacement);
  assert.equal(toggle.dataset.ppbuiCardModeState,"game");
  assert.equal(toggle.getAttribute("aria-pressed"),"false");
  assert.equal(doc.activeElement,toggle,"Game-mode toolbar reconstruction restores focus only to the toggle that owned it");
  assert.equal(oldToolbar.hasAttribute("data-ppbui-card-mode-toolbar"),false);
  assert.equal(replacement.hasAttribute("data-ppbui-card-mode-toolbar"),true);
  assert.equal(doc.querySelectorAll("[data-ppbui-card-mode-toggle]").length,1);

  toggle.click();
  assert.equal(toggle.dataset.ppbuiCardModeState,"cards");
  const cardsReplacement = doc.createElement("nav"); cardsReplacement.className = "pokeidle-top-toolbar";
  cardsReplacement.innerHTML = '<button data-menu-id="inventory">Inventory</button>';
  replacement.replaceWith(cardsReplacement);
  assert.equal(toggle.isConnected,false);
  app.reconcile();
  assert.equal(toggle.parentElement,cardsReplacement);
  assert.equal(toggle.dataset.ppbuiCardModeState,"cards");
  assert.equal(toggle.getAttribute("aria-pressed"),"true");
  assert.equal(doc.activeElement,toggle,"Cards-mode toolbar reconstruction restores the owned keyboard focus");

  const external = doc.createElement("button"); external.textContent = "External"; doc.body.append(external);
  external.focus();
  assert.equal(doc.activeElement,external);
  const externalFocusReplacement = doc.createElement("nav"); externalFocusReplacement.className = "pokeidle-top-toolbar";
  externalFocusReplacement.innerHTML = '<button data-menu-id="inventory">Inventory</button>';
  cardsReplacement.replaceWith(externalFocusReplacement);
  app.reconcile();
  assert.equal(toggle.parentElement,externalFocusReplacement);
  assert.equal(toggle.dataset.ppbuiCardModeState,"cards");
  assert.equal(doc.activeElement,external,"toolbar reconstruction never steals deliberate focus from another connected control");
});

test("Cards keeps only the toolbar path and Cards surface visible even when the toolbar is nested", t => {
  const { app, doc } = setup(t);
  const shell = doc.createElement("div"); shell.id = "native-shell";
  const toolbar = doc.querySelector(".pokeidle-top-toolbar");
  const game = doc.querySelector("#native-game-surface");
  toolbar.before(shell); shell.append(toolbar, game);
  app.start();
  doc.querySelector("[data-ppbui-card-mode-toggle]").click();
  assert.equal(doc.defaultView.getComputedStyle(shell).display,"block");
  assert.notEqual(doc.defaultView.getComputedStyle(toolbar).display,"none");
  assert.equal(doc.defaultView.getComputedStyle(game).display,"none","nested game sibling is suppressed while toolbar stays visible");
  assert.equal(toolbar.querySelector("[data-ppbui-card-mode-toggle]")?.dataset.ppbuiCardModeState,"cards");
});

test("Cards refreshes toolbar-path ownership when the same native toolbar is reparented", t => {
  const { app, doc } = setup(t);
  const toolbar = doc.querySelector(".pokeidle-top-toolbar");
  const firstShell = doc.createElement("div"); firstShell.id = "first-shell";
  toolbar.before(firstShell); firstShell.append(toolbar);
  app.start();
  const toggle = doc.querySelector("[data-ppbui-card-mode-toggle]");
  toggle.click();
  assert.equal(firstShell.hasAttribute("data-ppbui-card-mode-toolbar-path"),true);

  const secondShell = doc.createElement("div"); secondShell.id = "second-shell";
  firstShell.after(secondShell); secondShell.append(toolbar);
  app.reconcile();

  assert.equal(toggle.parentElement,toolbar,"same toolbar keeps the same toggle node after reparenting");
  assert.equal(toggle.dataset.ppbuiCardModeState,"cards");
  assert.equal(firstShell.hasAttribute("data-ppbui-card-mode-toolbar-path"),false,"stale ancestor ownership is released");
  assert.equal(secondShell.hasAttribute("data-ppbui-card-mode-toolbar-path"),true,"new ancestor path is owned");
  assert.notEqual(doc.defaultView.getComputedStyle(toolbar).display,"none");
});

test("Card Mode preserves the mounted Better UI menu bar instead of tearing it down and rebuilding it", async t => {
  const { app, doc, window } = setup(t, { extraModules: [createMenuBarModule()] });
  app.start();
  await new Promise(resolve => window.setTimeout(resolve,0));
  const toolbar = doc.querySelector(".pokeidle-top-toolbar");
  const style = doc.querySelector('style[data-ppbui-style="menu-bar"]');
  const toggle = doc.querySelector("[data-ppbui-card-mode-toggle]");
  assert.ok(style);
  assert.ok(toggle);
  assert.equal(toolbar.hasAttribute("data-ppbui-menu-bar"),true);

  toggle.click();
  await new Promise(resolve => window.setTimeout(resolve,0));
  assert.equal(doc.querySelector('style[data-ppbui-style="menu-bar"]'),style,"Cards keeps the customized game bar mounted while the native surface is hidden");
  assert.equal(toolbar.hasAttribute("data-ppbui-menu-bar"),true);
  assert.equal(toggle.parentElement,toolbar);

  toggle.click();
  await new Promise(resolve => window.setTimeout(resolve,0));
  assert.equal(doc.querySelector('style[data-ppbui-style="menu-bar"]'),style,"Game reuses the same Better UI menu-bar mount");
  assert.equal(toolbar.hasAttribute("data-ppbui-menu-bar"),true);
  assert.equal(toggle.parentElement,toolbar);
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
  const toggle = doc.querySelector('[data-ppbui-card-mode-toggle]');
  toggle.click();
  assert.equal(cards.hidden, false);

  inventory.click();

  assert.equal(nativeClicks, 1, "Card Mode must not replace or suppress the native action");
  assert.equal(gameVisibleInsideNativeHandler, true, "Game must already be visible when the native handler runs");
  assert.equal(cards.hidden, true, "native navigation must reveal Game before the native surface opens");
  assert.equal(toggle.getAttribute("aria-pressed"), "false");
  assert.equal(toggle.dataset.ppbuiCardModeState, "game");
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
  doc.querySelector("[data-ppbui-card-mode-toggle]").click();

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
  assert.equal(doc.querySelector("[data-ppbui-card-mode-toggle]"), null);
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
  assert.equal(cleanups, 0, "Game keeps normal Better UI modules mounted on startup");

  const toggle = doc.querySelector('[data-ppbui-card-mode-toggle]');
  toggle.click();
  await new Promise(resolve => window.setTimeout(resolve, 0));
  assert.equal(mounts, 1);
  assert.equal(cleanups, 1, "Cards unmounts non-essential Better UI modules after entering textual mode");

  toggle.click();
  await new Promise(resolve => window.setTimeout(resolve, 0));
  assert.equal(mounts, 2, "Game restores normal Better UI modules");
  assert.equal(cleanups, 1);

  toggle.click();
  await new Promise(resolve => window.setTimeout(resolve, 0));
  assert.equal(cleanups, 2, "returning to Cards releases visual module DOM/listeners again");
});
