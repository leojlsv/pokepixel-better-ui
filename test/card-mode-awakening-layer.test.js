import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createCardModeModule } from "../src/modules/card-mode/index.js";

test("native Awakening keeps its exact NPC panel above Cards and its toolbar without replacing native actions", async t => {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>
    <main id="native-scene"><canvas></canvas></main>
    <nav class="pokeidle-top-toolbar" style="position:fixed;z-index:2147483000">
      <button type="button" data-ppbui-city-action="geneticist">Geneticista</button>
    </nav>
  </body></html>`, { url: "https://pokepixel.nietore.com/play/", pretendToBeVisual: true });
  const win = dom.window, doc = win.document;
  const globals = new Map();
  for (const name of ["window", "document", "MutationObserver", "requestAnimationFrame", "cancelAnimationFrame"]) {
    globals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value: typeof win[name] === "function" && name !== "MutationObserver" ? win[name].bind(win) : win[name],
    });
  }
  class SceneMap {}
  win.Scene_Map = SceneMap;
  win.SceneManager = { _scene: new SceneMap(), _nextScene: null };
  let nativeOpens = 0;
  let nativeConfirms = 0;
  let native = null;
  win.PokeIdle = { NPC: {
    panel: null,
    open() {
      nativeOpens++;
      if (native) {
        native.overlay.hidden = false;
        return;
      }
      const overlay = doc.createElement("div");
      overlay.className = "pokeidle-panel-overlay";
      overlay.style.position = "fixed";
      const el = doc.createElement("section");
      el.className = "pokeidle-panel game-window npc-shop-window npc-iv-window is-opening";
      const body = doc.createElement("div");
      body.className = "pokeidle-panel__body";
      body.innerHTML = '<section class="genetic-awk__content"><button class="genetic-awk__confirm" type="button">Complete Challenge</button></section>';
      body.querySelector("button").addEventListener("click", () => { nativeConfirms++; });
      el.append(body);
      overlay.append(el);
      doc.body.append(overlay);
      el.classList.remove("is-opening");
      this.panel = { overlay, el, body, isVisible: () => !overlay.hidden };
      native = this.panel;
    },
  } };
  const geneticist = doc.querySelector('[data-ppbui-city-action="geneticist"]');
  geneticist.addEventListener("click", () => win.PokeIdle.NPC.open({ kind: "iv", name: "Geneticista" }));
  const app = createBetterUI({ modules: [createCardModeModule()] });
  t.after(() => {
    app.stop();
    win.close();
    for (const [name, descriptor] of globals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });

  app.start();
  const toggle = doc.querySelector('[data-ppbui-card-mode-toggle]');
  toggle.click();
  // Team Details pins can sit above the menu bar at the host's own native tier.
  // The authorized Awakening panel must not be obscured by such a source card.
  const pinned = doc.createElement("div");
  pinned.className = "pokemon-card-shell";
  pinned.dataset.ppbuiCardModeWindow = "native-team-details";
  pinned.style.position = "fixed";
  pinned.style.zIndex = "2147483201";
  pinned.innerHTML = '<aside class="pokemon-card pokemon-card--pinned">Pinned Pokémon</aside>';
  doc.body.append(pinned);
  geneticist.click();
  await new Promise(resolve => win.setTimeout(resolve, 15));
  assert.equal(nativeOpens, 1, "opening the city destination invokes only the original native action");
  assert.equal(doc.documentElement.dataset.ppbuiCardMode, "cards");
  assert.equal(toggle.getAttribute("aria-pressed"), "true");
  assert.equal(native.overlay.dataset.ppbuiCardModeWindow, "native-action-city-geneticist");
  assert.notEqual(win.getComputedStyle(native.overlay).display, "none");
  assert.equal(win.getComputedStyle(doc.querySelector("#native-scene")).display, "none", "game renderer remains concealed");
  const modalLayer = Number(win.getComputedStyle(native.overlay).zIndex);
  const toolbarLayer = Number(win.getComputedStyle(doc.querySelector(".pokeidle-top-toolbar")).zIndex);
  const pinnedLayer = Number(win.getComputedStyle(pinned).zIndex);
  assert.ok(modalLayer > toolbarLayer, "Awakening must be above the Cards/Game toolbar, not behind it");
  assert.ok(modalLayer > pinnedLayer, "Awakening must be above its source Pokémon card even when pinned details remain open");
  assert.ok(modalLayer < 2147483500, "blocking native dialogs must still remain above Awakening");

  native.body.querySelector("button").click();
  assert.equal(nativeConfirms, 1, "native input and handlers stay unchanged");
  native.overlay.hidden = true;
  app.reconcile();
  assert.equal(native.overlay.hasAttribute("data-ppbui-card-mode-window"), false);
  assert.equal(doc.documentElement.dataset.ppbuiCardMode, "cards");
  geneticist.click();
  await new Promise(resolve => win.setTimeout(resolve, 15));
  assert.equal(nativeOpens, 2);
  assert.equal(native.overlay.dataset.ppbuiCardModeWindow, "native-action-city-geneticist");
  assert.ok(Number(win.getComputedStyle(native.overlay).zIndex) > toolbarLayer,
    "the same cached native window regains foreground ownership when reopened");
  toggle.click();
  assert.equal(native.overlay.hasAttribute("data-ppbui-card-mode-window"), false,
    "Game returns the overlay to native stacking rules");
});
