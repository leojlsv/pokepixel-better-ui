import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createMenuBarModule } from "../src/modules/menu-bar/index.js";
import { createCustomPokeballModule } from "../src/modules/custom-pokeball/index.js";
import { customPokeballConfig as config } from "../src/modules/custom-pokeball/config.js";
import { defaultCustomPokeballSettings, normalizeCustomPokeballSettings } from "../src/modules/custom-pokeball/store.js";

const markup = `<!doctype html><html lang="pt-BR"><head></head><body>
  <div class="pokeidle-top-toolbar">
    <button class="pokeidle-top-toolbar__btn" data-menu-id="team"><span class="pokeidle-top-toolbar__label">Equipe</span></button>
    <button class="pokeidle-top-toolbar__btn" data-menu-id="settings"><span class="pokeidle-top-toolbar__label">Config</span></button>
  </div>
  <button class="pokeidle-capture-prompt__ball"></button>
</body></html>`;

function captureKit() {
  function CaptureSequence() {
    this._el = globalThis.document.createElement("div");
    this._el.className = "pokeidle-capture-sequence";
  }
  CaptureSequence.prototype.setBallVariant = function (capsule) {
    const raw = String(typeof capsule === "string" ? capsule : capsule?.item_id || capsule?.name || "").toLowerCase();
    const variant = /pixel/.test(raw) ? "pixel" : /ultra/.test(raw) ? "ultra" : /super/.test(raw) ? "super" : /great/.test(raw) ? "great" : "basic";
    this._el.className = `pokeidle-capture-sequence capture-ball--${variant}`;
    this._el.dataset.captureBall = variant;
    return variant;
  };
  return { CaptureSequence };
}

function setup(t, stored = null, { menuBar = true, legacy = null, kit = true } = {}) {
  const dom = new JSDOM(markup, { pretendToBeVisual: true, url: "https://local.test" });
  const { window } = dom, doc = window.document;
  if (stored !== null) window.localStorage.setItem(config.storageKey, stored);
  if (legacy !== null) window.localStorage.setItem(config.legacyStorageKey, legacy);
  window.PokeIdle = { Localization: { get: () => "pt-BR" } };
  if (kit) window.PokeIdle.MapCharacterKit = captureKit();
  const previous = new Map();
  for (const name of ["document", "MutationObserver", "requestAnimationFrame", "cancelAnimationFrame"]) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, value:
      typeof window[name] === "function" && name !== "MutationObserver" ? window[name].bind(window) : window[name] });
  }
  const custom = createCustomPokeballModule(doc);
  const app = createBetterUI({ modules: menuBar ? [custom, createMenuBarModule()] : [custom] });
  t.after(() => {
    app.stop(); dom.window.close();
    for (const [name, descriptor] of previous) if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
  });
  return { app, doc, window,
    action: () => doc.querySelector('[data-menu-id="custom-pokeball"]'),
    dialog: () => doc.querySelector('[data-ppbui-custom-pokeball-dialog]'),
  };
}

test("Custom Pokéball exposes one independent editor for every supported ball under Trainer", t => {
  const s = setup(t);
  s.app.start();
  const action = s.action();
  assert.ok(action);
  const icon = action.querySelector(':scope > img.pokeidle-top-toolbar__icon');
  assert.ok(icon, "Custom Pokéball menu uses its owned bitmap icon");
  assert.match(icon.src, /\/assets\/menu-custom-pokeball-icon\.png$/);
  assert.equal(icon.draggable, false);
  assert.equal(icon.getAttribute("aria-hidden"), "true");
  assert.equal(action.querySelector('.pokeidle-menu-vector-icon'), null, "legacy generated SVG icon is removed");
  assert.equal(action.closest('[data-ppbui-group="player"]')?.dataset.ppbuiGroup, "player");
  action.click();
  const cards = [...s.dialog().querySelectorAll('[data-ball]')];
  assert.deepEqual(cards.map(card => card.dataset.ball), ["basic", "great", "super", "ultra", "pixel", "master"]);
  assert.deepEqual(cards.map(card => card.querySelector('.ppbui-custom-pokeball-card-head span').textContent),
    ["Poké Ball", "Great Ball", "Super Ball", "Ultra Ball", "Pixel Ball", "Master Ball"]);
  assert.equal(cards.every(card => card.querySelectorAll('input[type="color"]').length === 3), true);
  assert.equal(cards.every(card => card.querySelectorAll('.ppbui-custom-pokeball-hex').length === 3), true);
  assert.match(cards.at(-1).querySelector('[data-master-note]').textContent, /shell Basic/);
});

test("Custom Pokéball dialog title uses the shared game display typography", t => {
  const s = setup(t, null, { menuBar: false });
  s.app.start();
  const css = s.doc.querySelector('style[data-ppbui-style="custom-pokeball"]').textContent.replace(/\s+/g, " ");
  assert.match(css, /\.ppbui-custom-pokeball-title \{[^}]*font:500 var\(--ppbui-font-size-title\)\/var\(--ppbui-line-height-tight\) var\(--ppbui-font-display\);[^}]*letter-spacing:normal;/);
  assert.match(css, /\.ppbui-custom-pokeball-card \{[^}]*border-radius:var\(--ppbui-radius\);/);
  assert.match(css, /\.ppbui-custom-pokeball-preview \{[^}]*border-radius:var\(--ppbui-radius\);/);
  assert.match(css, /\.ppbui-custom-pokeball-color \{[^}]*border-radius:var\(--ppbui-control-radius\) !important;/);
});

test("each ball persists and applies its own palette without enabling the others", t => {
  const s = setup(t, null, { menuBar: false });
  s.app.start();
  s.action().click();
  const ultra = s.dialog().querySelector('[data-ball="ultra"]');
  ultra.querySelector('[data-enabled="ultra"]').click();
  const primary = ultra.querySelector('[data-color="ultra:primary"]');
  primary.value = "#123456";
  primary.dispatchEvent(new s.window.Event("input", { bubbles: true }));
  assert.equal(s.doc.documentElement.getAttribute('data-ppbui-custom-ball-ultra'), "1");
  assert.equal(s.doc.documentElement.getAttribute('data-ppbui-custom-ball-great'), "0");
  assert.equal(s.doc.documentElement.style.getPropertyValue('--ppbui-custom-ultra-primary'), "#123456");
  assert.equal(s.doc.documentElement.style.getPropertyValue('--ppbui-custom-great-primary'), "#4299ef");
  const stored = JSON.parse(s.window.localStorage.getItem(config.storageKey));
  assert.equal(stored.balls.ultra.enabled, true);
  assert.equal(stored.balls.ultra.primary, "#123456");
  assert.equal(stored.balls.great.enabled, false);
  assert.equal(stored.balls.pixel.enabled, false);
});

test("variant CSS targets Basic Great Super Ultra Pixel and Master independently while server cosmetics remain authoritative", t => {
  const s = setup(t, null, { menuBar: false });
  s.app.start();
  const css = s.doc.querySelector('style[data-ppbui-style="custom-pokeball"]').textContent.replace(/\s+/g, " ");
  for (const id of ["basic", "great", "super", "ultra", "pixel", "master"]) {
    assert.ok(css.includes(`data-ppbui-custom-ball-${id}="1"`), `missing ${id} enable selector`);
  }
  for (const variant of ["basic", "great", "super", "ultra", "pixel"]) assert.ok(css.includes(`capture-ball--${variant}`));
  assert.ok(css.includes('[data-ppbui-capture-ball="master"]'));
  assert.match(css, /:not\(\.has-cosmetic-ball\)/, "equipped server cosmetic animation remains outside local ball-type palette ownership");
  assert.match(css, /capture-ball--great[^}]+--ppbui-custom-great-primary/);
  assert.match(css, /capture-ball--ultra[^}]+--ppbui-custom-ultra-primary/);
  assert.match(css, /capture-ball--pixel[^}]+--ppbui-custom-pixel-primary/);
});

test("Master Ball gets a presentation-only marker and the native variant method still runs exactly once", t => {
  const s = setup(t, null, { menuBar: false });
  const prototype = s.window.PokeIdle.MapCharacterKit.CaptureSequence.prototype;
  const original = prototype.setBallVariant;
  s.app.start();
  assert.notEqual(prototype.setBallVariant, original);
  const master = new s.window.PokeIdle.MapCharacterKit.CaptureSequence();
  assert.equal(master.setBallVariant("master"), "basic");
  assert.equal(master._el.dataset.captureBall, "basic");
  assert.equal(master._el.dataset.ppbuiCaptureBall, "master");
  const ultra = new s.window.PokeIdle.MapCharacterKit.CaptureSequence();
  assert.equal(ultra.setBallVariant({ item_id: "ultra", name: "Ultra Ball" }), "ultra");
  assert.equal(ultra._el.dataset.ppbuiCaptureBall, undefined);
  s.app.stop();
  assert.equal(prototype.setBallVariant, original);
});

test("Master marker wrapper is inert after cleanup and never clobbers a later foreign wrapper", t => {
  const s = setup(t, null, { menuBar: false });
  const prototype = s.window.PokeIdle.MapCharacterKit.CaptureSequence.prototype;
  const original = prototype.setBallVariant;
  s.app.start();
  const ppbuiWrapper = prototype.setBallVariant;
  let foreignCalls = 0;
  const foreign = function () { foreignCalls++; return ppbuiWrapper.apply(this, arguments); };
  prototype.setBallVariant = foreign;
  s.app.stop();
  assert.equal(prototype.setBallVariant, foreign);
  const sequence = new s.window.PokeIdle.MapCharacterKit.CaptureSequence();
  assert.equal(sequence.setBallVariant("master"), "basic");
  assert.equal(foreignCalls, 1);
  assert.equal(sequence._el.dataset.ppbuiCaptureBall, undefined, "stale PPBUI wrapper may delegate native behavior but cannot mutate presentation after cleanup");
  prototype.setBallVariant = original;
});

test("strict colors, v1 migration, cross-tab updates, per-ball reset and exact cleanup remain local", t => {
  const legacy = '{"enabled":true,"primary":"#112233","secondary":"#445566","center":"#778899"}';
  const s = setup(t, null, { menuBar: false, legacy });
  const root = s.doc.documentElement;
  root.setAttribute('data-ppbui-custom-ball-ultra', 'external');
  root.style.setProperty('--ppbui-custom-ultra-primary', '#010203', 'important');
  s.app.start();
  assert.equal(root.getAttribute('data-ppbui-custom-ball-basic'), "1", "v1 generic palette migrates only to Basic");
  assert.equal(root.style.getPropertyValue('--ppbui-custom-basic-primary'), "#112233");
  assert.equal(root.getAttribute('data-ppbui-custom-ball-ultra'), "0");

  s.action().click();
  const hex = s.dialog().querySelector('[data-hex="pixel:center"]');
  hex.value = "wrong";
  hex.dispatchEvent(new s.window.Event("change", { bubbles: true }));
  assert.match(s.dialog().querySelector('[role="status"]').textContent, /#RRGGBB/);
  assert.equal(root.style.getPropertyValue('--ppbui-custom-pixel-center'), "#f1d536");

  s.window.localStorage.setItem(config.storageKey, JSON.stringify({ balls: {
    ultra: { enabled: true, primary: "#abcdef", secondary: "#101112", center: "#131415" },
  } }));
  s.window.dispatchEvent(new s.window.StorageEvent("storage", { key: config.storageKey }));
  assert.equal(root.getAttribute('data-ppbui-custom-ball-ultra'), "1");
  assert.equal(root.style.getPropertyValue('--ppbui-custom-ultra-primary'), "#abcdef");
  assert.equal(root.getAttribute('data-ppbui-custom-ball-great'), "0");

  s.dialog().querySelector('[data-reset="ultra"]').click();
  assert.equal(root.getAttribute('data-ppbui-custom-ball-ultra'), "0");
  assert.equal(root.style.getPropertyValue('--ppbui-custom-ultra-primary'), "#20252b");

  s.app.stop();
  assert.equal(root.getAttribute('data-ppbui-custom-ball-ultra'), "external");
  assert.equal(root.style.getPropertyValue('--ppbui-custom-ultra-primary'), "#010203");
  assert.equal(root.style.getPropertyPriority('--ppbui-custom-ultra-primary'), "important");
  assert.equal(s.doc.querySelector('[data-menu-id="custom-pokeball"]'), null);
  assert.equal(s.doc.querySelector('[data-ppbui-custom-pokeball-dialog]'), null);
});

test("normalizer rejects malformed fields without contaminating other ball profiles", () => {
  const state = normalizeCustomPokeballSettings({ balls: {
    great: { enabled: true, primary: "#ABCDEF", secondary: null, center: "#12345g" },
    ultra: { enabled: "yes", primary: "#010203", secondary: "#040506", center: "#070809" },
  } });
  assert.deepEqual(state.great, { enabled: true, primary: "#abcdef", secondary: "#f4f4f4", center: "#ed4b4b" });
  assert.deepEqual(state.ultra, { enabled: false, primary: "#010203", secondary: "#040506", center: "#070809" });
  const defaults = defaultCustomPokeballSettings();
  assert.deepEqual(Object.keys(state), Object.keys(defaults));
  assert.equal(state.pixel.enabled, false);
  assert.equal(state.master.enabled, false);
});
