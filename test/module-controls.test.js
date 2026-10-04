import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createModulePreferences } from "../src/core/preferences.js";
import { createMenuBarModule } from "../src/modules/menu-bar/index.js";
import { createModuleControls } from "../src/modules/module-controls/index.js";

const fixture = readFileSync(new URL("./fixtures/menu-bar.html", import.meta.url), "utf8");
const key = "ppbui:modules:v1";
function setup(t, stored, fail = false, legacyAppearance = null) {
  const dom = new JSDOM(fixture, { pretendToBeVisual: true, url: "https://local.test" });
  const { window } = dom;
  const previous = new Map();
  for (const name of ["document", "MutationObserver", "requestAnimationFrame", "cancelAnimationFrame"]) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, value: typeof window[name] === "function" && name !== "MutationObserver" ? window[name].bind(window) : window[name] });
  }
  if (stored) window.localStorage.setItem(key, stored);
  if (legacyAppearance) window.localStorage.setItem("ppbui:appearance:v1", legacyAppearance);
  const options = { defaults: { "menu-bar": true }, events: window, storage: () => {
    if (fail) throw new Error("Storage denied");
    return window.localStorage;
  } };
  const preferences = createModulePreferences(options);
  const menuBar = createMenuBarModule();
  const controls = createModuleControls({ preferences, modules: [{ id: "menu-bar", name: text => text.name, description: text => text.description }] });
  const app = createBetterUI({ modules: [menuBar, controls], preferences });
  const doc = window.document;
  t.after(() => {
    app.stop(); dom.window.close();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  return { app, doc, window, preferences, options,
    trigger: () => doc.querySelector('[aria-controls="ppbui-module-panel"]'),
    toggle: () => doc.querySelector('#ppbui-module-panel input[type="checkbox"]'),
  };
}

test("Module Controls stays mounted while textual Cards hides the native toolbar", () => {
  const controls = createModuleControls({ preferences: {}, modules: [] });
  assert.equal(controls.runsInCardMode, true);
});

test("corner mode UI is removed and legacy Squared storage is retired", t => {
  const { app, doc, window, trigger } = setup(t, null, false, '{"corners":"square"}');
  app.start(); trigger().click();
  assert.equal(doc.querySelector(".ppbui-module-appearance"), null);
  assert.equal(doc.querySelectorAll('#ppbui-module-panel select').length, 0);
  assert.equal(doc.documentElement.hasAttribute("data-ppbui-corners"), false);
  assert.equal(window.localStorage.getItem("ppbui:appearance:v1"), null);
});

test("Better UI panel owns viewport positioning independently from hostile native dropdown CSS", t => {
  const { app, doc, window } = setup(t);
  const hostile = doc.createElement("style");
  hostile.textContent = `
    .pokeidle-top-toolbar__dropdown { top:54px !important; bottom:auto !important; transform:translateY(80px) !important; }
    .pokeidle-top-toolbar__group > div { inset:54px auto auto 0 !important; transform:translateY(80px) !important; }
  `;
  doc.head.append(hostile);
  app.start();
  const group = doc.querySelector('[data-ppbui-module="module-controls"]');
  const panel = doc.querySelector("#ppbui-module-panel");
  const css = doc.querySelector('style[data-ppbui-style="module-controls"]').textContent.replace(/\s+/g, " ");
  assert.ok(group);
  assert.ok(panel);
  assert.equal(panel.classList.contains("pokeidle-top-toolbar__dropdown"), false, "Better UI preferences must not inherit native dropdown positioning");
  assert.equal(group.style.getPropertyValue("position"), "relative");
  assert.equal(group.style.getPropertyPriority("position"), "important");
  for (const [property, value] of [
    ["position", "fixed"],
    ["inset", "auto"],
    ["left", "8px"],
    ["right", "auto"],
    ["top", "8px"],
    ["bottom", "auto"],
    ["transform", "none"],
  ]) {
    assert.equal(panel.style.getPropertyValue(property), value, `${property} has the owned physical anchor value`);
    assert.equal(panel.style.getPropertyPriority(property), "important", `${property} is protected from late host !important rules`);
  }
  assert.equal(window.getComputedStyle(panel).position, "fixed");
  assert.equal(window.getComputedStyle(panel).bottom, "auto");
  assert.equal(window.getComputedStyle(panel).transform, "none");
  assert.match(css, /\[data-ppbui-module="module-controls"\] \{[^}]*position:relative !important;/);
  assert.match(css, /> \.ppbui-module-panel \{[^}]*position:fixed !important;[^}]*inset:auto !important;[^}]*left:8px !important;[^}]*right:auto !important;[^}]*top:8px !important;[^}]*bottom:auto !important;[^}]*display:grid;[^}]*transform:none !important;/);
});

test("Better UI panel flips beside a vertical toolbar at the left edge and stays inside viewport", t => {
  const { app, doc, window, trigger } = setup(t);
  Object.defineProperty(doc.documentElement, "clientWidth", { configurable:true, value:800 });
  Object.defineProperty(doc.documentElement, "clientHeight", { configurable:true, value:700 });
  Object.defineProperty(window, "innerWidth", { configurable:true, value:800 });
  Object.defineProperty(window, "innerHeight", { configurable:true, value:700 });
  app.start();
  const toolbar = doc.querySelector(".pokeidle-top-toolbar");
  toolbar.setAttribute("data-ppbui-menu-orientation", "vertical");
  const panel = doc.querySelector("#ppbui-module-panel");
  trigger().getBoundingClientRect = () => ({ left:4, right:80, top:80, bottom:136, width:76, height:56 });
  panel.getBoundingClientRect = () => {
    if (panel.style.position !== "fixed") return { left:-160, right:80, top:60, bottom:360, width:240, height:300 };
    const left = Number.parseFloat(panel.style.left) || 0;
    const top = Number.parseFloat(panel.style.top) || 0;
    return { left, right:left + 240, top, bottom:top + 300, width:240, height:300 };
  };

  trigger().click();

  const rect = panel.getBoundingClientRect();
  assert.ok(rect.left >= 8, `left edge is inside viewport: ${rect.left}`);
  assert.ok(rect.right <= 792, `right edge is inside viewport: ${rect.right}`);
  assert.ok(rect.top >= 8, `top edge is inside viewport: ${rect.top}`);
  assert.ok(rect.bottom <= 692, `bottom edge is inside viewport: ${rect.bottom}`);
  assert.ok(rect.left >= 80, "left-edge vertical toolbar opens preferences to its right when space exists");
});

test("Better UI panel flips below a horizontal toolbar near the top edge", t => {
  const { app, doc, window, trigger } = setup(t);
  Object.defineProperty(doc.documentElement, "clientWidth", { configurable:true, value:800 });
  Object.defineProperty(doc.documentElement, "clientHeight", { configurable:true, value:700 });
  Object.defineProperty(window, "innerWidth", { configurable:true, value:800 });
  Object.defineProperty(window, "innerHeight", { configurable:true, value:700 });
  app.start();
  const panel = doc.querySelector("#ppbui-module-panel");
  trigger().getBoundingClientRect = () => ({ left:700, right:780, top:16, bottom:72, width:80, height:56 });
  panel.getBoundingClientRect = () => {
    if (panel.style.position !== "fixed") return { left:540, right:780, top:-288, bottom:12, width:240, height:300 };
    const left = Number.parseFloat(panel.style.left) || 0;
    const top = Number.parseFloat(panel.style.top) || 0;
    return { left, right:left + 240, top, bottom:top + 300, width:240, height:300 };
  };

  trigger().click();

  const rect = panel.getBoundingClientRect();
  assert.ok(rect.left >= 8 && rect.right <= 792);
  assert.ok(rect.top >= 8 && rect.bottom <= 692);
  assert.ok(rect.top >= 72, "top-edge horizontal toolbar opens preferences below the trigger");
});

test("Better UI panel clamps its rendered rect through a containing-block offset and on resize", t => {
  const { app, doc, window, trigger } = setup(t);
  Object.defineProperty(doc.documentElement, "clientWidth", { configurable:true, value:800 });
  Object.defineProperty(doc.documentElement, "clientHeight", { configurable:true, value:700 });
  Object.defineProperty(window, "innerWidth", { configurable:true, value:800 });
  Object.defineProperty(window, "innerHeight", { configurable:true, value:700 });
  app.start();
  const panel = doc.querySelector("#ppbui-module-panel");
  let triggerRect = { left:700, right:780, top:620, bottom:676, width:80, height:56 };
  trigger().getBoundingClientRect = () => ({ ...triggerRect });
  panel.getBoundingClientRect = () => {
    const left = 120 + (Number.parseFloat(panel.style.left) || 0);
    const top = 50 + (Number.parseFloat(panel.style.top) || 0);
    return { left, right:left + 240, top, bottom:top + 300, width:240, height:300 };
  };

  trigger().click();
  let rect = panel.getBoundingClientRect();
  assert.ok(rect.left >= 8 && rect.right <= 792, `initial horizontal bounds: ${rect.left}..${rect.right}`);
  assert.ok(rect.top >= 8 && rect.bottom <= 692, `initial vertical bounds: ${rect.top}..${rect.bottom}`);

  Object.defineProperty(doc.documentElement, "clientWidth", { configurable:true, value:600 });
  Object.defineProperty(window, "innerWidth", { configurable:true, value:600 });
  triggerRect = { left:500, right:580, top:620, bottom:676, width:80, height:56 };
  window.dispatchEvent(new window.Event("resize"));
  rect = panel.getBoundingClientRect();
  assert.ok(rect.left >= 8 && rect.right <= 592, `resized horizontal bounds: ${rect.left}..${rect.right}`);
  assert.ok(rect.top >= 8 && rect.bottom <= 692, `resized vertical bounds: ${rect.top}..${rect.bottom}`);
});

test("Better UI panel title uses the shared game display typography", t => {
  const { app, doc } = setup(t);
  app.start();
  const css = doc.querySelector('style[data-ppbui-style="module-controls"]').textContent.replace(/\s+/g, " ");
  assert.match(css, /\.ppbui-module-panel > #ppbui-module-title \{[^}]*font:500 var\(--ppbui-font-size-title\)\/var\(--ppbui-line-height-tight\) var\(--ppbui-font-display\);[^}]*letter-spacing:normal;/);
});

test("controls survive disabling every optional module and preserve native actions", t => {
  const { app, doc, preferences, trigger, toggle } = setup(t);
  const toolbar = doc.querySelector('.pokeidle-top-toolbar');
  const before = toolbar.outerHTML;
  const pack = toolbar.querySelector('[data-menu-id="beta-goals"]');
  const settings = toolbar.querySelector('[data-menu-id="settings"]');
  let actions = 0;
  settings.addEventListener("click", () => actions++);
  pack.addEventListener("click", () => actions++);
  app.start();
  assert.equal(trigger().querySelector("img").alt, "Better UI");
  assert.ok(trigger().classList.contains("ppbui-button"));
  assert.ok(trigger().closest('[data-ppbui-module="module-controls"]').classList.contains("ppbui-root"));
  assert.ok(doc.querySelector("#ppbui-module-panel").classList.contains("ppbui-panel"));
  assert.ok(doc.querySelector(".ppbui-module-close").classList.contains("ppbui-button"));
  assert.ok(doc.querySelector(".ppbui-module-list").classList.contains("ppbui-scroll"));
  trigger().click();
  toggle().click();
  assert.equal(preferences.isEnabled("menu-bar"), false);
  assert.equal(pack.parentElement, toolbar);
  assert.ok(trigger().isConnected);
  assert.equal(trigger().getAttribute('aria-expanded'), 'true');
  assert.equal(doc.activeElement, toggle());
  assert.equal(actions, 0);
  assert.equal(doc.querySelectorAll('#ppbui-module-panel input[type=checkbox]').length, 1);
  assert.equal(preferences.isEnabled('module-controls'), true);
  for (let i=0;i<6;i++) toggle().click();
  assert.equal(pack.parentElement, toolbar);
  toggle().click();
  assert.ok(doc.querySelector('[data-ppbui-group="shop"]').contains(pack));
  assert.equal(doc.querySelectorAll('[data-ppbui-module="module-controls"]').length, 1);
  assert.equal(toolbar.lastElementChild.dataset.ppbuiModule, 'module-controls');
  app.stop();
  assert.equal(toolbar.outerHTML, before);
});

test("Better UI trigger uses an owned image even when Settings is a host vector icon", t => {
  const { app, doc, trigger } = setup(t);
  const settings = doc.querySelector('[data-menu-id="settings"]');
  const nativeIcon = settings.querySelector('.pokeidle-top-toolbar__icon');
  const vector = doc.createElement('span');
  vector.className = 'pokeidle-menu-vector-icon';
  vector.textContent = 'build';
  nativeIcon.replaceWith(vector);

  app.start();
  const image = trigger().querySelector(':scope > img.pokeidle-top-toolbar__icon');
  assert.ok(image, "Better UI must not clone a vector/font-backed Settings glyph");
  assert.equal(trigger().querySelector('.pokeidle-menu-vector-icon'), null);
  assert.equal(image.alt, "Better UI");
  assert.equal(image.draggable, false);
});

test("saved disabled preference is applied before mounting, persists, and ignores unknown settings", t => {
  const { app, doc, options, trigger, toggle } = setup(t, '{"menu-bar":false,"example":true,"module-controls":false}');
  app.start();
  assert.equal(doc.querySelector('[data-ppbui-group="shop"]'), null);
  assert.ok(trigger());
  trigger().click(); toggle().click();
  assert.equal(createModulePreferences(options).isEnabled('menu-bar'), true);
  toggle().click();
  assert.equal(createModulePreferences(options).isEnabled('menu-bar'), false);
});

test("storage failure keeps session controls usable and reports persistence failure", t => {
  const { app, doc, toggle } = setup(t, null, true);
  app.start(); toggle().click();
  assert.equal(doc.querySelector('[data-ppbui-group="shop"]'), null);
  assert.match(doc.querySelector('[role="status"]').textContent, /apenas nesta sessão/);
  toggle().click();
  assert.ok(doc.querySelector('[data-ppbui-group="shop"]'));
});

test("corrupt and nonboolean preferences cannot accidentally disable a module", t => {
  const { preferences, window, options } = setup(t, '{');
  assert.equal(preferences.isEnabled('menu-bar'), true);
  window.localStorage.setItem(key, '{"menu-bar":"false"}');
  assert.equal(createModulePreferences(options).isEnabled('menu-bar'), true);
});

test("cross-tab changes reconcile while running and unsubscribe on stop", t => {
  const { app, doc, window } = setup(t);
  app.start();
  window.localStorage.setItem(key, '{"menu-bar":false}');
  window.dispatchEvent(new window.StorageEvent('storage', {key}));
  assert.equal(doc.querySelector('[data-ppbui-group="shop"]'), null);
  app.stop();
  window.localStorage.setItem(key, '{"menu-bar":true}');
  window.dispatchEvent(new window.StorageEvent('storage', {key}));
  assert.equal(doc.querySelector('[data-ppbui-module]'), null);
});

test("panel keyboard, outside dismissal, locale and toolbar replacement", async t => {
  const { app, doc, window, trigger, toggle } = setup(t);
  app.start(); trigger().click();
  assert.equal(doc.activeElement, toggle());
  toggle().dispatchEvent(new window.KeyboardEvent('keydown', {key:'Escape',bubbles:true}));
  assert.equal(trigger().getAttribute('aria-expanded'), 'false');
  assert.equal(doc.activeElement, trigger());
  trigger().click();
  doc.body.dispatchEvent(new window.Event('pointerdown', {bubbles:true}));
  assert.equal(trigger().getAttribute('aria-expanded'), 'false');
  doc.documentElement.lang = 'en';
  await new Promise(resolve => window.setTimeout(resolve, 60));
  assert.equal(toggle().checked, true);
  assert.equal(toggle().parentElement.querySelector('strong').textContent, 'Menu bar');
  doc.querySelector('.pokeidle-top-toolbar').outerHTML = fixture;
  await new Promise(resolve => window.setTimeout(resolve, 60));
  assert.equal(doc.querySelectorAll('[data-ppbui-module="module-controls"]').length, 1);
  trigger().click(); toggle().click();
  assert.equal(doc.querySelector('[data-ppbui-group="shop"]'), null);
});

test("menu bar position setting is absent from Better UI settings", t => {
  const { app, doc, trigger } = setup(t);
  app.start(); trigger().click();
  assert.equal(doc.querySelector(".ppbui-module-orientation"), null);
  assert.equal(doc.querySelectorAll('#ppbui-module-panel select').length, 0);
});

test("theme disclosure persists independently and counts track module settings", async t => {
  const { app, doc, window, trigger, toggle, preferences } = setup(t);
  app.start(); trigger().click();
  const theme = doc.querySelector('[data-ppbui-theme="interface"]');
  assert.equal(theme.open, true);
  assert.match(theme.querySelector('summary').textContent, /1\/1 ativos/);
  theme.open = false;
  await new Promise(resolve => window.setTimeout(resolve, 20));
  assert.equal(preferences.isEnabled('menu-bar'), true);
  assert.equal(JSON.parse(window.localStorage.getItem('ppbui:module-groups:v1')).interface, false);
  preferences.setEnabled('menu-bar', false);
  assert.match(theme.querySelector('summary').textContent, /0\/1 ativos/);
  assert.equal(theme.open, false);
  app.stop(); app.start(); trigger().click();
  const restored = doc.querySelector('[data-ppbui-theme="interface"]');
  assert.equal(restored.open, false);
  assert.equal(doc.activeElement, restored.querySelector('summary'));
  restored.open = true; toggle().click();
  assert.equal(preferences.isEnabled('menu-bar'), true);
});
