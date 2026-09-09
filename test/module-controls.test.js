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
function setup(t, stored, fail = false) {
  const dom = new JSDOM(fixture, { pretendToBeVisual: true, url: "https://local.test" });
  const { window } = dom;
  const previous = new Map();
  for (const name of ["document", "MutationObserver", "requestAnimationFrame", "cancelAnimationFrame"]) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, value: typeof window[name] === "function" && name !== "MutationObserver" ? window[name].bind(window) : window[name] });
  }
  if (stored) window.localStorage.setItem(key, stored);
  const options = { defaults: { "menu-bar": true }, events: window, storage: () => {
    if (fail) throw new Error("Storage denied");
    return window.localStorage;
  } };
  const preferences = createModulePreferences(options);
  const controls = createModuleControls({ preferences, modules: [{ id: "menu-bar", name: text => text.name, description: text => text.description }] });
  const app = createBetterUI({ modules: [createMenuBarModule(), controls], preferences });
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
