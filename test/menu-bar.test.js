import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createMenuBarModule } from "../src/modules/menu-bar/index.js";
import { buffStripConfig } from "../src/modules/buff-strip/config.js";

const fixture = readFileSync(new URL("./fixtures/menu-bar.html", import.meta.url), "utf8");

function setup(t, html = fixture) {
  const dom = new JSDOM(html, { pretendToBeVisual: true });
  const { window } = dom;
  const previous = new Map();
  for (const name of ["document", "MutationObserver", "requestAnimationFrame", "cancelAnimationFrame"]) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, value:
      typeof window[name] === "function" && name !== "MutationObserver" ? window[name].bind(window) : window[name] });
  }
  const menuBar = createMenuBarModule();
  const app = createBetterUI({ modules: [menuBar] });
  const doc = window.document;
  const toolbar = doc.querySelector(".pokeidle-top-toolbar");
  const pack = doc.querySelector('[data-menu-id="beta-goals"]');
  const premium = doc.querySelector('[data-menu-id="premium"]');
  t.after(() => {
    app.stop();
    dom.window.close();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  return { app, doc, window, toolbar, pack, premium, menuBar,
    group: () => doc.querySelector('[data-ppbui-group="shop"]'),
    trigger: () => doc.querySelector('[data-ppbui-group="shop"] > button'),
  };
}

test("groups the original nodes, preserves all 33 destinations and calls listeners once", (t) => {
  const { app, toolbar, pack, premium, group, trigger } = setup(t);
  const ids = [...toolbar.querySelectorAll("[data-menu-id]")].map((el) => el.dataset.menuId).sort();
  let packClicks = 0;
  let premiumClicks = 0;
  pack.addEventListener("click", () => packClicks++);
  premium.addEventListener("click", () => premiumClicks++);
  app.start();
  for (let i = 0; i < 10; i++) app.reconcile();
  assert.equal(toolbar.querySelectorAll('[data-ppbui-group="shop"]').length, 1);
  assert.equal(toolbar.querySelectorAll('button[data-menu-id]:not([aria-haspopup])').length, 33);
  assert.deepEqual([...toolbar.querySelectorAll("[data-menu-id]")].map((el) => el.dataset.menuId).sort(), ids);
  assert.equal(pack.parentElement, premium.parentElement);
  assert.ok(group().contains(pack));
  assert.notEqual(pack.parentElement, toolbar);
  trigger().click();
  assert.equal(packClicks + premiumClicks, 0);
  pack.click();
  assert.equal(packClicks, 1);
  assert.equal(trigger().getAttribute("aria-expanded"), "false");
  trigger().click();
  premium.click();
  assert.equal(premiumClicks, 1);
  assert.equal(premium.getAttribute("aria-keyshortcuts"), "L");
});

test("vector menu icons are never mistaken for labels and created group icons follow late native hydration", t => {
  const { app, toolbar } = setup(t);
  const premium = toolbar.querySelector('[data-menu-id="premium"]');
  const nativeIcon = premium.querySelector('.pokeidle-top-toolbar__icon');
  const vector = toolbar.ownerDocument.createElement('span');
  vector.className = 'pokeidle-menu-vector-icon';
  vector.textContent = 'diamond';
  nativeIcon.replaceWith(vector);

  const playerTrigger = toolbar.querySelector('[data-menu-group="player"] > button');
  const playerNativeIcon = playerTrigger.querySelector('.pokeidle-top-toolbar__icon');
  const playerVector = toolbar.ownerDocument.createElement('span');
  playerVector.className = 'pokeidle-menu-vector-icon';
  playerVector.textContent = 'badge';
  playerNativeIcon.replaceWith(playerVector);

  app.start();

  const shop = toolbar.querySelector('[data-ppbui-group="shop"]');
  const shopTrigger = shop.querySelector(':scope > button');
  assert.equal(shopTrigger.querySelector('.pokeidle-menu-vector-icon').textContent, 'diamond', 'created group preserves the vector glyph instead of renaming it as the label');
  assert.equal(shopTrigger.querySelector('.pokeidle-top-toolbar__label').textContent, 'Loja');
  assert.equal(playerTrigger.querySelector('.pokeidle-menu-vector-icon').textContent, 'badge', 'native group vector glyph is never treated as copy');
  assert.equal(playerTrigger.querySelector('.pokeidle-top-toolbar__label').textContent, 'Treinador');

  vector.textContent = 'storefront';
  app.reconcile();
  assert.equal(shopTrigger.querySelector('.pokeidle-menu-vector-icon').textContent, 'storefront', 'created group follows late host icon hydration without cloning action behavior');
});

test("cleanup restores native order, classes and nodes exactly; restarting is safe", (t) => {
  const { app, toolbar, pack, premium } = setup(t);
  const before = toolbar.outerHTML;
  app.start();
  app.stop();
  assert.equal(toolbar.outerHTML, before);
  assert.equal(pack.parentElement, toolbar);
  assert.equal(premium.parentElement, toolbar);
  app.start();
  app.stop();
  assert.equal(toolbar.outerHTML, before);
});

test("horizontal menu bar owns one 13-slot row and restores native orientation state", t => {
  const { app, doc, toolbar } = setup(t);
  app.start();
  assert.equal(toolbar.getAttribute("data-ppbui-menu-orientation"), "horizontal");
  const css = doc.querySelector('[data-ppbui-style="menu-bar"]').textContent;
  assert.match(css, /data-ppbui-menu-orientation="horizontal"\][^{]*\{[^}]*grid-auto-flow:column !important;[^}]*grid-template-columns:repeat\(13,minmax\(54px,1fr\)\) !important;[^}]*grid-template-rows:minmax\(56px,auto\) !important;/s);
  assert.match(css, /data-ppbui-menu-orientation="horizontal"\] > :is\([^}]*\) \{[^}]*grid-row:1 !important;/s);
  app.stop();
  assert.equal(toolbar.hasAttribute("data-ppbui-menu-orientation"), false);
});

test("native Poké Hub drag and minimize controls share the navigation rail without replacing their handlers", async t => {
  const { app, doc, toolbar } = setup(t);
  toolbar.classList.add("pokeidle-pokehub", "pokeidle-island");
  const handle = doc.createElement("button");
  handle.className = "pokeidle-pokehub__handle";
  handle.textContent = "⠿";
  const toggle = doc.createElement("button");
  toggle.className = "pokeidle-pokehub__toggle";
  toggle.textContent = "−";
  let dragStarts = 0, toggles = 0;
  handle.addEventListener("pointerdown", () => dragStarts++);
  toggle.addEventListener("click", () => { toggles++; toolbar.classList.toggle("is-collapsed"); });
  toolbar.prepend(handle, toggle);
  const before = toolbar.outerHTML;

  app.start();

  const css = doc.querySelector('[data-ppbui-style="menu-bar"]').textContent;
  assert.equal(toolbar.getAttribute("data-ppbui-menu-bar"), "");
  assert.equal(handle.parentElement, toolbar);
  assert.equal(toggle.parentElement, toolbar);
  assert.equal(toolbar.querySelector(".pokeidle-pokehub__handle"), handle);
  assert.equal(toolbar.querySelector(".pokeidle-pokehub__toggle"), toggle);
  assert.match(css,/\.pokeidle-top-toolbar\.pokeidle-pokehub\.pokeidle-island\[data-ppbui-menu-bar\] \{[^}]*padding:3px 32px !important/s);
  assert.doesNotMatch(css,/z-index:2147483645/,'toolbar does not fake shared layer ownership with a z-index override');
  assert.match(css,/> :is\(\.pokeidle-pokehub__handle,\.pokeidle-pokehub__toggle\) \{[^}]*position:absolute !important[^}]*top:3px !important[^}]*height:56px !important[^}]*transform:none !important/s);
  assert.match(css,/> \.pokeidle-pokehub__handle \{[^}]*left:4px !important/s);
  assert.match(css,/> \.pokeidle-pokehub__toggle \{[^}]*right:4px !important/s);
  assert.match(css,/\.is-collapsed \{[^}]*width:32px !important;[^}]*height:32px !important;[^}]*\}[\s\S]*\.is-collapsed > \.pokeidle-top-toolbar__btn:not\(\.pokeidle-pokehub__toggle\)[\s\S]*display:none !important;[\s\S]*\.is-collapsed > \.pokeidle-pokehub__toggle \{[^}]*display:grid !important;/s,'collapsed hub hides menu content and retains only the native restore toggle');
  assert.match(css,/\.pokeidle-top-toolbar\[data-ppbui-menu-bar\] > \.pokeidle-top-toolbar__group \{[^}]*position:relative !important/s,'Better UI-owned toolbar groups provide the positioning context for their dropdowns');
  assert.match(css,/\.pokeidle-top-toolbar\[data-ppbui-menu-bar\] > \.pokeidle-top-toolbar__group > \.ppbui-menu-popup \{[^}]*position:fixed !important;[^}]*left:8px !important;[^}]*top:8px !important;[^}]*bottom:auto !important;[^}]*display:grid !important;[^}]*width:min\(282px,calc\(100vw - 16px\)\) !important;[^}]*max-height:calc\(100dvh - 96px\) !important;[^}]*overflow-y:auto !important;[^}]*transform:none !important;/s,'every Better UI grouped popup is viewport-positioned and bounded');
  assert.match(css,/> \.ppbui-menu-popup::after \{[^}]*content:none !important;/s,'Better UI popup neutralizes the host downward-only pseudo shell');
  assert.match(css,/border-radius:var\(--ppbui-window-radius\) !important/,'opted-in toolbar/menu shells use the native-aligned window radius role');
  assert.match(css,/border-radius:var\(--ppbui-control-radius\) !important/,'opted-in toolbar actions use the fixed native-aligned control radius');
  assert.doesNotMatch(css,/@media \(max-width:760px\)[\s\S]*\.pokeidle-top-toolbar__label[^}]*display:none/s,'Better UI preserves visible top-rail labels because the native island already owns its narrow six-column reflow');
  const collapsedEvents = [];
  doc.defaultView.addEventListener("ppbui:menu-collapse-change", event => collapsedEvents.push(event.detail?.collapsed));
  handle.dispatchEvent(new doc.defaultView.Event("pointerdown", { bubbles:true }));
  toggle.click();
  await new Promise(resolve => doc.defaultView.setTimeout(resolve, 0));
  assert.equal(dragStarts, 1);
  assert.equal(toggles, 1);
  assert.equal(doc.defaultView.getComputedStyle(toolbar.querySelector('[data-menu-id="inventory"]')).display, "none");
  assert.equal(doc.defaultView.getComputedStyle(toggle).display, "grid");
  assert.equal(doc.defaultView.getComputedStyle(toolbar).width, "32px");
  toggle.click();
  await new Promise(resolve => doc.defaultView.setTimeout(resolve, 0));
  assert.equal(toggles, 2);
  assert.notEqual(doc.defaultView.getComputedStyle(toolbar.querySelector('[data-menu-id="inventory"]')).display, "none");
  assert.notEqual(doc.defaultView.getComputedStyle(toolbar.querySelector('[data-ppbui-group="player"]')).display, "none");
  assert.deepEqual(collapsedEvents.slice(-2), [true, false]);

  app.stop();
  assert.equal(doc.querySelector('[data-ppbui-style="menu-bar"]'), null);
  assert.equal(toolbar.outerHTML, before);
});

test("fresh Poké Hub geometry is materialized inside the viewport before any drag and restores when untouched", t => {
  const { app, window, toolbar } = setup(t);
  toolbar.classList.add("pokeidle-pokehub", "pokeidle-island");
  toolbar.style.cssText = "left:50%;top:auto;bottom:0;transform:translateX(-50%)";
  Object.defineProperty(window, "innerWidth", { configurable:true, value:900 });
  Object.defineProperty(window, "innerHeight", { configurable:true, value:700 });
  toolbar.getBoundingClientRect = () => ({ left:38, right:862, top:632, bottom:700, width:824, height:68 });
  const before = toolbar.getAttribute("style");

  app.start();

  assert.equal(toolbar.style.getPropertyValue("left"), "38px");
  assert.equal(toolbar.style.getPropertyValue("top"), "624px", "native 8px viewport margin is applied immediately instead of waiting for moveHub()");
  assert.equal(toolbar.style.getPropertyValue("bottom"), "auto");
  assert.equal(toolbar.style.getPropertyValue("transform"), "none");
  for (const property of ["left", "top", "bottom", "transform"]) {
    assert.equal(toolbar.style.getPropertyPriority(property), "important");
  }

  app.stop();
  assert.equal(toolbar.getAttribute("style"), before, "untouched host geometry is restored on cleanup");
});

test("late measurable Poké Hub geometry normalizes on reconcile and before the first popup opens", t => {
  const { app, window, toolbar } = setup(t);
  toolbar.classList.add("pokeidle-pokehub", "pokeidle-island");
  toolbar.style.cssText = "left:50%;top:auto;bottom:0;transform:translateX(-50%)";
  Object.defineProperty(window, "innerWidth", { configurable:true, value:900 });
  Object.defineProperty(window, "innerHeight", { configurable:true, value:700 });
  let measurable = false;
  toolbar.getBoundingClientRect = () => measurable ?
    ({ left:38, right:862, top:632, bottom:700, width:824, height:68 }) :
    ({ left:0, right:0, top:0, bottom:0, width:0, height:0 });

  app.start();
  assert.equal(toolbar.style.getPropertyValue("transform"), "translateX(-50%)");
  measurable = true;
  app.reconcile();
  assert.equal(toolbar.style.getPropertyValue("top"), "624px");
  assert.equal(toolbar.style.getPropertyValue("bottom"), "auto");
  assert.equal(toolbar.style.getPropertyValue("transform"), "none");

  app.stop();
  toolbar.style.cssText = "left:50%;top:auto;bottom:0;transform:translateX(-50%)";
  measurable = false;
  app.start();
  measurable = true;
  const city = toolbar.querySelector('[data-ppbui-group="city"]');
  city.dispatchEvent(new window.Event("pointerenter"));
  assert.equal(toolbar.style.getPropertyValue("top"), "624px", "popup activation retries geometry after late layout hydration");
  assert.equal(toolbar.style.getPropertyValue("transform"), "none");
});

test("native Poké Hub movement after mount remains authoritative on cleanup", t => {
  const { app, doc, window, toolbar } = setup(t);
  toolbar.classList.add("pokeidle-pokehub", "pokeidle-island");
  toolbar.style.cssText = "left:50%;top:auto;bottom:0;transform:translateX(-50%)";
  Object.defineProperty(window, "innerWidth", { configurable:true, value:900 });
  Object.defineProperty(window, "innerHeight", { configurable:true, value:700 });
  toolbar.getBoundingClientRect = () => ({ left:38, right:862, top:632, bottom:700, width:824, height:68 });
  const handle = doc.createElement("button");
  handle.className = "pokeidle-pokehub__handle";
  toolbar.prepend(handle);

  app.start();
  handle.dispatchEvent(new window.Event("pointerdown", { bubbles:true }));
  toolbar.style.setProperty("left", "120px", "important");
  toolbar.style.setProperty("top", "100px", "important");
  toolbar.style.setProperty("bottom", "auto", "important");
  toolbar.style.setProperty("transform", "none", "important");
  app.stop();

  assert.equal(toolbar.style.getPropertyValue("left"), "120px");
  assert.equal(toolbar.style.getPropertyValue("top"), "100px");
  assert.equal(toolbar.style.getPropertyValue("bottom"), "auto");
  assert.equal(toolbar.style.getPropertyValue("transform"), "none");
});

test("silent host geometry writes preserve the whole normalized geometry set on cleanup", t => {
  const { app, window, toolbar } = setup(t);
  toolbar.classList.add("pokeidle-pokehub", "pokeidle-island");
  toolbar.style.cssText = "left:50%;top:auto;bottom:0;transform:translateX(-50%)";
  Object.defineProperty(window, "innerWidth", { configurable:true, value:900 });
  Object.defineProperty(window, "innerHeight", { configurable:true, value:700 });
  toolbar.getBoundingClientRect = () => ({ left:38, right:862, top:632, bottom:700, width:824, height:68 });

  app.start();
  toolbar.style.setProperty("left", "120px", "important");
  toolbar.style.setProperty("top", "100px", "important");
  app.stop();

  assert.equal(toolbar.style.getPropertyValue("left"), "120px");
  assert.equal(toolbar.style.getPropertyValue("top"), "100px");
  assert.equal(toolbar.style.getPropertyValue("bottom"), "auto", "cleanup does not reintroduce the startup bottom anchor after any host geometry change");
  assert.equal(toolbar.style.getPropertyValue("transform"), "none", "cleanup keeps the host-compatible normalized transform as part of the same geometry set");
});

test("City adds native-controller shortcuts for Geneticista, Nature and Evolution Center", t => {
  const { app, window, toolbar } = setup(t);
  const opened = [];
  window.PokeIdle = {
    Localization: { get: () => "pt-BR" },
    NPC: { open: meta => opened.push(meta) },
  };

  app.start();
  for (let i = 0; i < 5; i++) app.reconcile();

  const city = toolbar.querySelector('[data-ppbui-group="city"]');
  const trigger = city.querySelector(":scope > button");
  const shortcuts = [...city.querySelectorAll("[data-ppbui-city-action]")];
  assert.deepEqual(shortcuts.map(button => button.lastElementChild.textContent), ["Geneticista", "Nature", "Evolution Center"]);
  assert.deepEqual(shortcuts.map(button => button.getAttribute("aria-label")), ["Geneticista", "Nature", "Evolution Center"]);
  for (const button of shortcuts) {
    const icon = button.querySelector("svg.pokeidle-menu-vector-icon.ppbui-menu-city-icon");
    assert.ok(icon, "City shortcuts use bundled vector artwork instead of emoji interface icons");
    assert.equal(icon.getAttribute("viewBox"), "0 0 24 24");
    assert.equal(icon.getAttribute("aria-hidden"), "true");
    assert.equal(button.querySelector(".pokeidle-top-toolbar__emoji"), null);
  }
  assert.equal(toolbar.querySelectorAll('button[data-menu-id]:not([aria-haspopup])').length, 33, "Better UI shortcuts never impersonate native destination IDs");
  assert.equal(shortcuts.length, 3, "stable reconciliation does not duplicate City shortcuts");

  for (const button of shortcuts) button.click();
  assert.deepEqual(opened, [
    { kind:"iv", name:"Geneticista" },
    { kind:"nature", name:"Nature" },
    { kind:"evolution", name:"Evolution Center" },
  ]);

  trigger.focus();
  trigger.dispatchEvent(new window.KeyboardEvent("keydown", { key:"End", bubbles:true }));
  assert.equal(window.document.activeElement, shortcuts[2], "existing menu keyboard navigation includes the new City actions");
  shortcuts[2].dispatchEvent(new window.KeyboardEvent("keydown", { key:"Escape", bubbles:true }));
  assert.equal(window.document.activeElement, trigger, "Escape returns focus from a Better UI City action to the City trigger");

  app.stop();
  assert.equal(toolbar.querySelectorAll("[data-ppbui-city-action]").length, 0);
  assert.equal(toolbar.querySelectorAll('button[data-menu-id]:not([aria-haspopup])').length, 33);
});

test("City shortcuts recover when the native NPC controller becomes available after mount", t => {
  const { app, window, toolbar } = setup(t);
  window.PokeIdle = { Localization: { get: () => "pt-BR" } };
  app.start();

  const city = toolbar.querySelector('[data-ppbui-group="city"]');
  const shortcuts = [...city.querySelectorAll("[data-ppbui-city-action]")];
  assert.equal(shortcuts.every(button => button.disabled), true);
  const css = window.document.querySelector('[data-ppbui-style="menu-bar"]').textContent;
  assert.match(css, /pokeidle-top-toolbar__dropdown-btn:hover:not\(:disabled\)/, "disabled popup actions are excluded from hover styling");
  assert.match(css, /pokeidle-top-toolbar__dropdown-btn:disabled \{[^}]*border-color:var\(--ppbui-border\)[^}]*background:var\(--ppbui-bg-1\)[^}]*color:var\(--ppbui-text-subtle\)[^}]*cursor:default/s, "disabled popup actions have an explicit design-system state");

  const opened = [];
  window.PokeIdle.NPC = { open: meta => opened.push(meta) };
  city.dispatchEvent(new window.Event("pointerenter"));
  assert.equal(shortcuts.every(button => !button.disabled), true, "opening City refreshes native capability without waiting for a DOM mutation/reconcile");
  shortcuts[0].click();
  assert.deepEqual(opened, [{ kind:"iv", name:"Geneticista" }]);
});

test("focused City trigger includes late native NPC shortcuts on the first keyboard command", t => {
  const { app, window, toolbar } = setup(t);
  window.PokeIdle = { Localization: { get: () => "pt-BR" } };
  app.start();

  const city = toolbar.querySelector('[data-ppbui-group="city"]');
  const trigger = city.querySelector(":scope > button");
  const shortcuts = [...city.querySelectorAll("[data-ppbui-city-action]")];
  trigger.focus();
  assert.equal(shortcuts.every(button => button.disabled), true);

  window.PokeIdle.NPC = { open() {} };
  trigger.dispatchEvent(new window.KeyboardEvent("keydown", { key:"End", bubbles:true }));

  assert.equal(shortcuts.every(button => !button.disabled), true);
  assert.equal(window.document.activeElement, shortcuts[2], "the first End after late NPC hydration reaches Evolution Center");
});

test("every grouped dropdown keeps viewport-owned positioning under hostile live rules", t => {
  const { app, doc, window, toolbar } = setup(t);
  const hostile = doc.createElement("style");
  hostile.textContent = `
    .pokeidle-top-toolbar__group { position:static !important; }
    .pokeidle-top-toolbar__dropdown {
      position:fixed !important;
      inset:54px auto auto 55% !important;
      transform:translateY(80px) !important;
      max-height:none !important;
      overflow:visible !important;
    }
  `;
  doc.head.append(hostile);
  app.start();
  const groups = [...toolbar.querySelectorAll('[data-ppbui-group]')];
  assert.equal(groups.length, 7);
  for (const group of groups) {
    const dropdown = group.querySelector(':scope > .pokeidle-top-toolbar__dropdown');
    assert.ok(dropdown, `${group.dataset.ppbuiGroup} keeps its dropdown`);
    assert.ok(dropdown.classList.contains("ppbui-menu-popup"), `${group.dataset.ppbuiGroup} opts into the Better UI popup shell`);
    assert.equal(group.style.getPropertyValue("position"), "relative");
    assert.equal(group.style.getPropertyPriority("position"), "important");
    for (const [property, value] of [
      ["position", "fixed"],
      ["left", "8px"],
      ["right", "auto"],
      ["top", "8px"],
      ["bottom", "auto"],
      ["transform", "none"],
      ["max-width", "calc(100vw - 16px)"],
      ["max-height", "calc(100dvh - 96px)"],
      ["overflow-x", "hidden"],
      ["overflow-y", "auto"],
      ["overscroll-behavior", "contain"],
    ]) {
      assert.equal(dropdown.style.getPropertyValue(property), value, `${group.dataset.ppbuiGroup} owns ${property}`);
      assert.equal(dropdown.style.getPropertyPriority(property), "important", `${group.dataset.ppbuiGroup} protects ${property}`);
    }
    assert.equal(window.getComputedStyle(group).position, "relative");
    assert.equal(window.getComputedStyle(dropdown).position, "fixed");
    assert.equal(window.getComputedStyle(dropdown).bottom, "auto");
    assert.equal(window.getComputedStyle(dropdown).transform, "none");
    assert.equal(window.getComputedStyle(dropdown).display, "grid");
    assert.equal(window.getComputedStyle(dropdown).gridTemplateColumns.replace(/\s+/g, ""), "repeat(3,minmax(0,1fr))");
  }
});

test("vertical dropdowns clamp inside both viewport edges", t => {
  const { app, window, toolbar, menuBar } = setup(t);
  Object.defineProperty(window, "innerWidth", { configurable:true, value:800 });
  Object.defineProperty(window, "innerHeight", { configurable:true, value:700 });
  app.start();
  menuBar.setOrientation("vertical");
  const group = toolbar.querySelector('[data-ppbui-group="player"]');
  const trigger = group.querySelector(":scope > button");
  const dropdown = group.querySelector(":scope > .pokeidle-top-toolbar__dropdown");
  trigger.getBoundingClientRect = () => ({ left:700, right:780, top:600, bottom:656, width:80, height:56 });
  toolbar.getBoundingClientRect = () => ({ left:700, right:780, top:100, bottom:700, width:80, height:600 });
  dropdown.getBoundingClientRect = () => ({ left:0, right:282, top:0, bottom:220, width:282, height:220 });
  group.dispatchEvent(new window.Event("pointerenter"));
  assert.equal(dropdown.style.left, "418px");
  assert.equal(dropdown.style.top, "472px");
  assert.equal(dropdown.style.getPropertyPriority("left"), "important");
  assert.equal(dropdown.style.getPropertyPriority("top"), "important");
  toolbar.getBoundingClientRect = () => ({ left:10, right:90, top:100, bottom:700, width:80, height:600 });
  trigger.getBoundingClientRect = () => ({ left:10, right:90, top:20, bottom:76, width:80, height:56 });
  group.dispatchEvent(new window.Event("pointerenter"));
  assert.equal(dropdown.style.left, "90px");
  assert.equal(dropdown.style.top, "8px");
});

test("vertical dropdown moves clear of the buff strip instead of covering it", t => {
  const { app, doc, window, toolbar, menuBar } = setup(t);
  Object.defineProperty(window, "innerWidth", { configurable:true, value:800 });
  Object.defineProperty(window, "innerHeight", { configurable:true, value:700 });
  app.start();
  menuBar.setOrientation("vertical");
  const buff = doc.createElement("div");
  buff.className = "pokeidle-buff-strip";
  buff.dataset.ppbuiBuffStrip = "";
  buff.getBoundingClientRect = () => ({ left:90, right:310, top:8, bottom:34, width:220, height:26 });
  doc.body.append(buff);
  const group = toolbar.querySelector('[data-ppbui-group="player"]');
  const trigger = group.querySelector(":scope > button");
  const dropdown = group.querySelector(":scope > .pokeidle-top-toolbar__dropdown");
  toolbar.getBoundingClientRect = () => ({ left:10, right:90, top:8, bottom:608, width:80, height:600 });
  trigger.getBoundingClientRect = () => ({ left:10, right:90, top:20, bottom:76, width:80, height:56 });
  dropdown.getBoundingClientRect = () => ({ left:0, right:282, top:0, bottom:220, width:282, height:220 });

  group.dispatchEvent(new window.Event("pointerenter"));
  assert.equal(dropdown.style.left, "90px");
  assert.equal(dropdown.style.top, "38px", "popup clears the 26px buff chip plus a 4px gap");
});

test("dropdown shrinks into the largest free region when a tall buff stack blocks both full placements", t => {
  const { app, doc, window, toolbar, menuBar } = setup(t);
  Object.defineProperty(window, "innerWidth", { configurable:true, value:800 });
  Object.defineProperty(window, "innerHeight", { configurable:true, value:700 });
  app.start();
  menuBar.setOrientation("vertical");
  const buff = doc.createElement("div");
  buff.className = "pokeidle-buff-strip";
  buff.dataset.ppbuiBuffStrip = "";
  buff.getBoundingClientRect = () => ({ left:90, right:310, top:8, bottom:250, width:220, height:242 });
  doc.body.append(buff);
  const group = toolbar.querySelector('[data-ppbui-group="player"]');
  const trigger = group.querySelector(":scope > button");
  const dropdown = group.querySelector(":scope > .pokeidle-top-toolbar__dropdown");
  toolbar.getBoundingClientRect = () => ({ left:10, right:90, top:8, bottom:608, width:80, height:600 });
  trigger.getBoundingClientRect = () => ({ left:10, right:90, top:20, bottom:76, width:80, height:56 });
  dropdown.getBoundingClientRect = () => ({ left:0, right:282, top:0, bottom:500, width:282, height:500 });

  group.dispatchEvent(new window.Event("pointerenter"));
  assert.equal(dropdown.style.left, "90px");
  assert.equal(dropdown.style.top, "254px");
  assert.equal(dropdown.style.getPropertyValue("max-height"), "438px");
  assert.equal(dropdown.style.getPropertyPriority("max-height"), "important");
});

test("open dropdown repositions when buff geometry changes after opening", t => {
  const { app, doc, window, toolbar, menuBar } = setup(t);
  Object.defineProperty(window, "innerWidth", { configurable:true, value:800 });
  Object.defineProperty(window, "innerHeight", { configurable:true, value:700 });
  app.start();
  menuBar.setOrientation("vertical");
  let buffRect = { left:90, right:310, top:300, bottom:326, width:220, height:26 };
  const buff = doc.createElement("div");
  buff.className = "pokeidle-buff-strip";
  buff.dataset.ppbuiBuffStrip = "";
  buff.getBoundingClientRect = () => ({ ...buffRect });
  doc.body.append(buff);
  const group = toolbar.querySelector('[data-ppbui-group="player"]');
  const trigger = group.querySelector(":scope > button");
  const dropdown = group.querySelector(":scope > .pokeidle-top-toolbar__dropdown");
  toolbar.getBoundingClientRect = () => ({ left:10, right:90, top:8, bottom:608, width:80, height:600 });
  trigger.getBoundingClientRect = () => ({ left:10, right:90, top:20, bottom:76, width:80, height:56 });
  dropdown.getBoundingClientRect = () => ({ left:0, right:282, top:0, bottom:220, width:282, height:220 });

  trigger.click();
  assert.equal(group.classList.contains("is-open"), true);
  assert.equal(dropdown.style.top, "8px");
  buffRect = { left:90, right:310, top:8, bottom:34, width:220, height:26 };
  window.dispatchEvent(new window.CustomEvent(buffStripConfig.events.geometryChange, {
    detail: { toolbar, strip:buff },
  }));
  assert.equal(dropdown.style.top, "38px");
});

test("native group activation and outside pointer close the new group", (t) => {
  const { app, doc, window, toolbar, group, trigger } = setup(t);
  const social = toolbar.querySelector('[data-menu-group="social"]');
  const socialTrigger = social.querySelector("button");
  social.classList.add("is-open");
  socialTrigger.setAttribute("aria-expanded", "true");
  socialTrigger.addEventListener("click", (event) => event.stopPropagation());
  app.start();
  trigger().click();
  assert.equal(social.classList.contains("is-open"), false);
  socialTrigger.click();
  assert.equal(group().classList.contains("is-open"), false);
  trigger().click();
  doc.body.dispatchEvent(new window.Event("pointerdown", { bubbles: true }));
  assert.equal(trigger().getAttribute("aria-expanded"), "false");
});

test("keyboard navigation skips unavailable destinations and Escape closes", (t) => {
  const { app, doc, window, toolbar, pack, premium, trigger } = setup(t);
  const gacha = toolbar.querySelector('[data-menu-id="gacha"]');
  const key = (node, value) => node.dispatchEvent(new window.KeyboardEvent("keydown", { key: value, bubbles: true }));
  app.start();
  trigger().focus();
  key(trigger(), "ArrowUp");
  assert.equal(doc.activeElement, gacha);
  key(gacha, "Home");
  assert.equal(doc.activeElement, premium);
  pack.hidden = true;
  key(premium, "ArrowDown");
  assert.equal(doc.activeElement, gacha);
  key(gacha, "Escape");
  assert.equal(trigger().getAttribute("aria-expanded"), "false");
  assert.equal(doc.activeElement, trigger(), "Escape returns focus to the group trigger");
});

test("central observer remounts after complete toolbar replacement", async (t) => {
  const { app, doc, window, toolbar } = setup(t);
  app.start();
  toolbar.outerHTML = fixture;
  await new Promise((resolve) => window.setTimeout(resolve, 60));
  const replacement = doc.querySelector(".pokeidle-top-toolbar");
  assert.notEqual(replacement, toolbar);
  assert.equal(replacement.querySelectorAll('[data-ppbui-group="shop"]').length, 1);
  assert.ok(replacement.querySelector('[data-ppbui-group="shop"] [data-menu-id="beta-goals"]'));
});

test("replaces partial button rerenders without retaining stale action nodes", (t) => {
  const { app, toolbar, premium, pack, group } = setup(t);
  const replacement = premium.cloneNode(true);
  let clicks = 0;
  replacement.addEventListener("click", () => clicks++);
  app.start();
  premium.replaceWith(replacement);
  app.reconcile();
  assert.ok(group().contains(replacement));
  assert.ok(group().contains(pack));
  assert.equal(premium.isConnected, false);
  replacement.click();
  assert.equal(clicks, 1);
  app.stop();
  assert.equal(replacement.parentElement, toolbar);
  assert.ok(replacement.classList.contains("pokeidle-top-toolbar__btn"));
  assert.equal(group(), null);
});

test("rebuilds a damaged group without duplicating buttons", (t) => {
  const { app, toolbar, group, trigger, pack, premium } = setup(t);
  app.start();
  trigger().remove();
  app.reconcile();
  assert.ok(trigger());
  assert.ok(group().contains(pack));
  assert.ok(group().contains(premium));
  assert.equal(toolbar.querySelectorAll('[data-menu-id="premium"]').length, 1);
});

test("missing buttons are not fabricated and join their group when supplied by the game", (t) => {
  const { app, toolbar, pack, group } = setup(t);
  pack.remove();
  app.start();
  assert.ok(group());
  assert.equal(toolbar.querySelector('[data-menu-id="beta-goals"]'), null);
  toolbar.append(pack);
  app.reconcile();
  assert.ok(group().contains(pack));
});
const actionSelector = 'button[data-menu-id]:not([aria-haspopup="menu"])';

test("all 33 destinations follow the approved order without replacing actions, shortcuts or native badges", t => {
  const { app, toolbar } = setup(t);
  const before = toolbar.outerHTML;
  const actions = [...toolbar.querySelectorAll(actionSelector)];
  const badges = [...toolbar.querySelectorAll('.pokeidle-top-toolbar__badge')];
  let clicks = 0;
  for (const button of actions) button.addEventListener("click", () => clicks++);
  app.start();
  const mapping = {
    player: "team profile encyclopedia species-goals promotion",
    city: "npc-shop market storage professions",
    activities: "quests battle-pass daily-gift",
    events: "event-calendar arena-pvp world-boss",
    social: "friends guild ranking shiny-captures streamer-referral",
    automation: "hunt-analyzer capture-records auto-helper offline-farm mini-view game-admin",
    shop: "premium beta-goals gacha",
  };
  assert.equal(toolbar.querySelectorAll(actionSelector).length, 33);
  assert.deepEqual([...toolbar.children].map(node => node.dataset.ppbuiGroup || node.dataset.menuId),
    "inventory hunts player city activities events social private-message automation shop settings".split(" "));
  for (const [id, expected] of Object.entries(mapping)) {
    const group = toolbar.querySelector(`[data-ppbui-group="${id}"]`);
    assert.deepEqual([...group.querySelectorAll(actionSelector)].map(node => node.dataset.menuId), expected.split(" "));
    group.querySelector("button").click();
  }
  assert.equal(clicks, 0);
  for (const button of actions) assert.ok(toolbar.contains(button));
  for (const badge of badges) assert.ok(toolbar.contains(badge));
  for (const button of actions) if (!button.disabled) button.click();
  assert.equal(clicks, actions.filter(button => !button.disabled).length);
  app.stop();
  // Open-state changes are interactive state, not structural modifications.
  const normalized = html => html.replace(/aria-expanded="true"/g, 'aria-expanded="false"').replace(/ is-open/g, '');
  assert.equal(normalized(toolbar.outerHTML), normalized(before));
});

test("native click toggling remains single and moved badge references still update", t => {
  const { app, toolbar, trigger } = setup(t);
  const group = toolbar.querySelector('[data-menu-group="activities"]');
  const nativeTrigger = group.querySelector("button");
  const badge = nativeTrigger.querySelector('.pokeidle-top-toolbar__badge');
  nativeTrigger.addEventListener("click", event => {
    event.stopPropagation();
    const next = !group.classList.contains("is-open");
    group.classList.toggle("is-open", next);
    nativeTrigger.setAttribute("aria-expanded", String(next));
  });
  app.start();
  nativeTrigger.click();
  assert.equal(nativeTrigger.getAttribute("aria-expanded"), "true");
  nativeTrigger.click();
  assert.equal(nativeTrigger.getAttribute("aria-expanded"), "false");
  trigger().click();
  nativeTrigger.click();
  assert.equal(trigger().getAttribute("aria-expanded"), "false");
  badge.hidden = false;
  badge.textContent = "7";
  app.reconcile();
  assert.equal(nativeTrigger.querySelector('.pokeidle-top-toolbar__badge'), badge);
  assert.equal(badge.textContent, "7");
});

test("central observer follows hidden states and empty groups without reviving restricted actions", async t => {
  const { app, window, toolbar } = setup(t);
  const boss = toolbar.querySelector('[data-menu-id="world-boss"]');
  const pvp = toolbar.querySelector('[data-menu-id="arena-pvp"]');
  const calendar = toolbar.querySelector('[data-menu-id="event-calendar"]');
  const admin = toolbar.querySelector('[data-menu-id="game-admin"]');
  admin.hidden = true;
  app.start();
  pvp.hidden = true;
  calendar.hidden = true;
  await new Promise(resolve => window.setTimeout(resolve, 70));
  const events = toolbar.querySelector('[data-ppbui-group="events"]');
  assert.equal(events.style.display, "none");
  assert.equal(admin.hidden, true);
  assert.equal(boss.hidden, true);
  calendar.hidden = false;
  await new Promise(resolve => window.setTimeout(resolve, 70));
  assert.equal(events.style.display, "");
  assert.equal(calendar.style.display, "");
  assert.equal(admin.hidden, true);
  assert.equal(window.getComputedStyle(admin).display, "none", "Better UI popup shell never revives a restricted native action");
  assert.equal(window.getComputedStyle(boss).display, "none", "native hidden menu actions remain visually hidden inside the owned popup shell");
});

test("localization follows the game and cleanup retains the latest native label", t => {
  const { app, window, toolbar } = setup(t);
  let language = "en-US";
  window.PokeIdle = { Localization: { get: () => language } };
  const nativeTrigger = toolbar.querySelector('[data-menu-group="player"] > button');
  const label = nativeTrigger.querySelector("span");
  app.start();
  assert.equal(label.textContent, "Trainer");
  for (const [code, expected] of [["pt-BR", "Treinador"], ["es-419", "Entrenador"], ["zh-CN", "训练家"]]) {
    language = code;
    label.textContent = `Native ${code}`;
    nativeTrigger.setAttribute("aria-label", `Native ${code}`);
    app.reconcile();
    assert.equal(label.textContent, expected);
  }
  app.stop();
  assert.equal(label.textContent, "Native zh-CN");
  assert.equal(nativeTrigger.getAttribute("aria-label"), "Native zh-CN");
});

test("alternative native grouping, unknown actions and hidden source groups remain safe", t => {
  const { app, toolbar } = setup(t);
  const automation = toolbar.querySelector('[data-menu-group="automation"] [role="menu"]');
  const settings = toolbar.querySelector('[data-menu-id="settings"]');
  automation.append(settings);
  const events = toolbar.querySelector('[data-menu-group="events"]');
  events.hidden = true;
  const unknown = toolbar.ownerDocument.createElement("button");
  unknown.dataset.menuId = "future-feature";
  unknown.textContent = "Future";
  automation.append(unknown);
  const before = toolbar.outerHTML;
  app.start();
  assert.equal(settings.parentElement, toolbar);
  assert.equal(unknown.parentElement, automation);
  assert.equal(toolbar.querySelector('[data-menu-id="species-goals"]').style.display, "none");
  app.stop();
  assert.equal(toolbar.outerHTML, before);
});

test("stable reconciliation does not produce a mutation loop", async t => {
  const { app, window, toolbar } = setup(t);
  app.start();
  await new Promise(resolve => window.setTimeout(resolve, 60));
  let count = 0;
  const probe = new window.MutationObserver(records => { count += records.length; });
  probe.observe(toolbar, { childList: true, subtree: true, attributes: true });
  for (let i = 0; i < 20; i++) app.reconcile();
  await new Promise(resolve => window.setTimeout(resolve, 60));
  probe.disconnect();
  assert.equal(count, 0);
});

test("partial rerender of an already grouped action restores native presentation and stops bubbling safely", t => {
  const { app, toolbar, premium, trigger } = setup(t);
  app.start();
  const replacement = premium.cloneNode(true);
  let clicks = 0;
  replacement.addEventListener("click", event => { event.stopPropagation(); clicks++; });
  premium.replaceWith(replacement);
  app.reconcile();
  trigger().click();
  replacement.click();
  assert.equal(clicks, 1);
  assert.equal(trigger().getAttribute("aria-expanded"), "false");
  app.stop();
  assert.equal(replacement.parentNode, toolbar);
  assert.equal(replacement.className, "pokeidle-top-toolbar__btn");
  assert.ok(replacement.querySelector("span").classList.contains("pokeidle-top-toolbar__label"));
});

test("removed destinations are not resurrected by cleanup", t => {
  const { app, toolbar, pack } = setup(t);
  app.start();
  pack.remove();
  app.reconcile();
  app.stop();
  assert.equal(toolbar.querySelector('[data-menu-id="beta-goals"]'), null);
});

test("native item reordering and trigger-label replacement reconcile without losing nodes", t => {
  const { app, toolbar } = setup(t);
  app.start();
  const player = toolbar.querySelector('[data-ppbui-group="player"]');
  const team = toolbar.querySelector('[data-menu-id="team"]');
  const dropdown = team.parentElement;
  dropdown.append(team);
  const replacement = toolbar.ownerDocument.createElement("span");
  replacement.className = "pokeidle-top-toolbar__label";
  replacement.textContent = "Native new label";
  player.querySelector('button > span').replaceWith(replacement);
  app.reconcile();
  assert.equal(player.querySelector('button > span'), replacement);
  assert.equal(replacement.textContent, "Treinador");
  assert.equal(dropdown.querySelector(actionSelector), team);
  app.stop();
  assert.equal(replacement.textContent, "Native new label");
});

test("native group replacement does not duplicate relocated actions or restore into detached sources", t => {
  const { app, toolbar } = setup(t);
  const original = toolbar.querySelector('[data-menu-group="events"]');
  const replacement = original.cloneNode(true);
  let clicks = 0;
  const newMastery = replacement.querySelector('[data-menu-id="species-goals"]');
  newMastery.addEventListener("click", () => clicks++);
  app.start();
  original.replaceWith(replacement);
  app.reconcile();
  const actions = [...toolbar.querySelectorAll(actionSelector)];
  assert.equal(actions.length, 33);
  assert.equal(new Set(actions.map(node => node.dataset.menuId)).size, 33);
  assert.ok(toolbar.querySelector('[data-ppbui-group="player"]').contains(newMastery));
  newMastery.click();
  assert.equal(clicks, 1);
  app.stop();
  assert.equal(toolbar.querySelectorAll(actionSelector).length, 33);
  assert.ok(replacement.contains(newMastery));
});
