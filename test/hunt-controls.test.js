import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createModulePreferences } from "../src/core/preferences.js";
import { createMenuBarModule } from "../src/modules/menu-bar/index.js";
import { createHuntControlsModule } from "../src/modules/hunt-controls/index.js";

const fixture = readFileSync(new URL("./fixtures/menu-bar.html", import.meta.url), "utf8");
const translations = {
  "hud.return_to_city_caps":"RETURN TO CITY",
  "hud.capture_caps":"CAPTURE",
  "hud.revive_caps":"REVIVE",
};

function createHuntBar(doc, { hidden = false } = {}) {
  const bar = doc.createElement("div");
  bar.className = "pokeidle-map-action-bar";
  bar.hidden = hidden;
  const make = (text, modifier = "") => {
    const button = doc.createElement("button");
    button.type = "button";
    button.className = `pokeidle-btn ${modifier} pokeidle-map-action-bar__button`.trim();
    button.textContent = text;
    return button;
  };
  const returnButton = make(translations["hud.return_to_city_caps"], "pokeidle-btn--danger");
  const captureButton = make(translations["hud.capture_caps"], "pokeidle-btn--primary");
  const reviveButton = make(translations["hud.revive_caps"], "pokeidle-btn--primary");
  reviveButton.hidden = true;
  bar.append(returnButton, captureButton, reviveButton);
  return { bar, returnButton, captureButton, reviveButton };
}

function setup(t, { hidden = false, menuEnabled = true } = {}) {
  const dom = new JSDOM(`<!doctype html><html lang="pt-BR"><head></head><body>${fixture}<div class="pokeidle-capture-prompt">native capture prompt</div></body></html>`, {
    pretendToBeVisual:true,
    url:"https://local.test",
  });
  const { window } = dom;
  const doc = window.document;
  const previous = new Map();
  for (const name of ["document", "MutationObserver", "requestAnimationFrame", "cancelAnimationFrame"]) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable:true, value:
      typeof window[name] === "function" && name !== "MutationObserver" ? window[name].bind(window) : window[name] });
  }
  window.PokeIdle = {
    t:key => translations[key] || key,
    Localization:{ get:() => "pt-BR" },
    NPC:{ open() {} },
  };
  const native = createHuntBar(doc, { hidden });
  doc.body.append(native.bar);
  const menuBar = createMenuBarModule();
  const huntControls = createHuntControlsModule({ menuBar, doc });
  const preferences = createModulePreferences({
    defaults:{ "menu-bar":true },
    storage:() => window.localStorage,
    events:window,
  });
  if (!menuEnabled) preferences.setEnabled("menu-bar", false);
  const app = createBetterUI({ modules:[menuBar, huntControls], preferences });
  t.after(() => {
    app.stop();
    dom.window.close();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  return { dom, window, doc, app, menuBar, huntControls, preferences, ...native };
}

test("classic Hunt moves the exact Return node into City, hides global Capture and keeps Revive native", t => {
  const s = setup(t);
  let returnClicks = 0;
  s.returnButton.addEventListener("click", () => returnClicks++);
  const promptBefore = s.doc.querySelector(".pokeidle-capture-prompt").outerHTML;

  s.app.start();

  const city = s.doc.querySelector('[data-ppbui-group="city"]');
  const dropdown = city.querySelector(":scope > .ppbui-menu-popup");
  const trigger = city.querySelector(':scope > button[aria-haspopup="menu"]');
  assert.equal(dropdown.firstElementChild, s.returnButton, "Return is the first City contextual action");
  assert.equal(s.returnButton.dataset.ppbuiMenuContextAction, "hunt-return");
  assert.equal(s.returnButton.dataset.ppbuiMenuContextVisible, "true");
  assert.equal(s.captureButton.parentNode, s.bar, "Capture remains owned by the game");
  assert.equal(s.captureButton.hasAttribute("data-ppbui-hunt-capture"), true);
  assert.equal(s.reviveButton.parentNode, s.bar, "Revive remains in the native gameplay lane");
  assert.equal(s.reviveButton.hasAttribute("data-ppbui-hunt-revive"), true);
  assert.equal(s.reviveButton.hidden, true, "Better UI does not alter native Revive availability");
  assert.equal(city.querySelectorAll(".ppbui-hunt-return-badge").length, 1);
  assert.equal(city.querySelector(".ppbui-hunt-return-badge").textContent, "Voltar");
  assert.match(trigger.getAttribute("aria-label"), /RETURN TO CITY/);
  assert.equal(s.doc.querySelector(".pokeidle-capture-prompt").outerHTML, promptBefore, "per-body capture UI is untouched");

  s.returnButton.click();
  assert.equal(returnClicks, 1, "moving the native node preserves exactly one original click path");

  trigger.focus();
  trigger.dispatchEvent(new s.window.KeyboardEvent("keydown", { key:"Home", bubbles:true }));
  assert.equal(s.doc.activeElement, s.returnButton, "Return participates as the first keyboard menu item");
});

test("contextual Return button centers its label", t => {
  const s = setup(t);
  s.app.start();
  const style = s.doc.head.querySelector('style[data-ppbui-style="hunt-controls"]');
  assert.ok(style, "Hunt Controls style is mounted");
  assert.match(style.textContent, /\[data-ppbui-hunt-return\][\s\S]*justify-content:center !important;/);
  assert.match(style.textContent, /\[data-ppbui-hunt-return\][\s\S]*text-align:center !important;/);
});

test("inactive Hunt hides the contextual Return cue without fabricating native hidden state", t => {
  const s = setup(t, { hidden:true });
  s.app.start();
  const city = s.doc.querySelector('[data-ppbui-group="city"]');
  const trigger = city.querySelector(':scope > button[aria-haspopup="menu"]');
  const badge = city.querySelector(".ppbui-hunt-return-badge");
  assert.equal(s.returnButton.dataset.ppbuiMenuContextVisible, "false");
  assert.equal(s.returnButton.hidden, false, "native Return hidden state is not repurposed");
  assert.equal(badge.hidden, true);
  assert.doesNotMatch(trigger.getAttribute("aria-label"), /RETURN TO CITY/);

  trigger.focus();
  trigger.dispatchEvent(new s.window.KeyboardEvent("keydown", { key:"Home", bubbles:true }));
  assert.notEqual(s.doc.activeElement, s.returnButton, "hidden contextual action is skipped by keyboard navigation");
});

test("cleanup restores the native action bar identity/order and removes all contextual ownership", t => {
  const s = setup(t);
  const nativeClasses = s.returnButton.className;
  const nativeCity = s.doc.querySelector('[data-menu-group="city"] > button[aria-haspopup="menu"]');
  const nativeCityAria = nativeCity.getAttribute("aria-label");
  s.app.start();
  s.app.stop();

  assert.deepEqual([...s.bar.children], [s.returnButton, s.captureButton, s.reviveButton]);
  assert.equal(s.returnButton.className, nativeClasses);
  assert.equal(s.returnButton.hasAttribute("data-ppbui-hunt-return"), false);
  assert.equal(s.captureButton.hasAttribute("data-ppbui-hunt-capture"), false);
  assert.equal(s.reviveButton.hasAttribute("data-ppbui-hunt-revive"), false);
  assert.equal(s.bar.hasAttribute("data-ppbui-hunt-controls"), false);
  assert.equal(s.doc.querySelector(".ppbui-hunt-return-badge"), null);
  assert.equal(nativeCity.getAttribute("aria-label"), nativeCityAria, "context availability never leaks into the restored native City accessible name");
});

test("disabling and re-enabling Menu Bar restores then re-adopts the exact native Return node", t => {
  const s = setup(t);
  s.app.start();
  assert.equal(s.returnButton.closest('[data-ppbui-group="city"]') !== null, true);

  s.preferences.setEnabled("menu-bar", false);
  assert.equal(s.returnButton.parentNode, s.bar, "before-teardown hook restores Return while the native origin is still connected");
  assert.equal(s.captureButton.hasAttribute("data-ppbui-hunt-capture"), false);
  assert.equal(s.doc.querySelector('[data-ppbui-group="city"]'), null);

  s.preferences.setEnabled("menu-bar", true);
  assert.equal(s.returnButton.closest('[data-ppbui-group="city"]') !== null, true);
  assert.equal(s.doc.querySelectorAll("[data-ppbui-hunt-return]").length, 1);
});

test("a native action-bar replacement discards stale moved controls and adopts only the replacement nodes", t => {
  const s = setup(t);
  s.app.start();
  const oldReturn = s.returnButton;
  const replacement = createHuntBar(s.doc);
  s.bar.replaceWith(replacement.bar);

  s.app.reconcile();

  const city = s.doc.querySelector('[data-ppbui-group="city"]');
  assert.equal(city.querySelector("[data-ppbui-hunt-return]"), replacement.returnButton);
  assert.equal(oldReturn.isConnected, false, "stale Return is never injected into the replacement native bar");
  assert.equal(replacement.captureButton.hasAttribute("data-ppbui-hunt-capture"), true);
  assert.equal(replacement.reviveButton.parentNode, replacement.bar);
  assert.equal(s.doc.querySelectorAll("[data-ppbui-hunt-return]").length, 1);
});

test("toolbar replacement during Hunt returns the native node before rebuilding the City integration", t => {
  const s = setup(t);
  s.app.start();
  const originalReturn = s.returnButton;
  const oldToolbar = s.doc.querySelector(".pokeidle-top-toolbar");
  oldToolbar.outerHTML = fixture;

  s.app.reconcile();

  const newToolbar = s.doc.querySelector(".pokeidle-top-toolbar");
  const newCity = newToolbar.querySelector('[data-ppbui-group="city"]');
  assert.notEqual(newToolbar, oldToolbar);
  assert.equal(newCity.querySelector("[data-ppbui-hunt-return]"), originalReturn);
  assert.equal(s.doc.querySelectorAll(".ppbui-hunt-return-badge").length, 1);
  assert.equal(s.doc.querySelectorAll("[data-ppbui-hunt-return]").length, 1);
});

test("stable Hunt reconciliation is mutation-free for observed host attributes and child lists", async t => {
  const s = setup(t);
  s.app.start();
  const observer = new s.window.MutationObserver(() => {});
  observer.observe(s.doc.body, { childList:true, subtree:true, attributes:true, attributeFilter:["hidden", "disabled", "aria-hidden", "aria-disabled"] });

  s.app.reconcile();
  s.app.reconcile();
  await Promise.resolve();

  assert.equal(observer.takeRecords().length, 0);
  observer.disconnect();
});

test("Hunt Controls fails closed when Menu Bar is disabled before startup", t => {
  const s = setup(t, { menuEnabled:false });
  s.app.start();
  assert.equal(s.returnButton.parentNode, s.bar);
  assert.equal(s.captureButton.hasAttribute("data-ppbui-hunt-capture"), false);
  assert.equal(s.bar.hasAttribute("data-ppbui-hunt-controls"), false);
  assert.equal(s.doc.querySelector("[data-ppbui-hunt-return]"), null);
});
