import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createMenuBarModule } from "../src/modules/menu-bar/index.js";

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
  const app = createBetterUI({ modules: [createMenuBarModule()] });
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
  return { app, doc, window, toolbar, pack, premium,
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

test("native Poké Hub drag and minimize controls share the navigation rail without replacing their handlers", t => {
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
  toggle.addEventListener("click", () => toggles++);
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
  assert.match(css,/> :is\(\.pokeidle-pokehub__handle,\.pokeidle-pokehub__toggle\) \{[^}]*position:absolute !important[^}]*top:3px !important[^}]*height:56px !important[^}]*transform:none !important/s);
  assert.match(css,/> \.pokeidle-pokehub__handle \{[^}]*left:4px !important/s);
  assert.match(css,/> \.pokeidle-pokehub__toggle \{[^}]*right:4px !important/s);
  assert.match(css,/\.is-collapsed \{[^}]*min-height:38px !important[^}]*\}[\s\S]*\.is-collapsed > :is\([^}]*height:32px !important/s,'collapsed hub keeps a nonzero compact rail for the native controls');
  assert.match(css,/\.pokeidle-top-toolbar\[data-ppbui-menu-bar\] > \.pokeidle-top-toolbar__group \{[^}]*position:relative !important/s,'Better UI-owned toolbar groups provide the positioning context for their dropdowns');
  assert.match(css,/\.pokeidle-top-toolbar\[data-ppbui-menu-bar\] > \.pokeidle-top-toolbar__group > \.ppbui-menu-popup \{[^}]*position:absolute !important;[^}]*left:50% !important;[^}]*right:auto !important;[^}]*top:auto !important;[^}]*bottom:100% !important;[^}]*display:grid !important;[^}]*width:min\(282px,calc\(100vw - 16px\)\) !important;[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\) !important;[^}]*max-height:calc\(100dvh - 96px\) !important;[^}]*overflow-y:auto !important;[^}]*translateX\(-50%\) !important;/s,'every Better UI grouped popup owns a compact trigger-local upward shell');
  assert.match(css,/> \.ppbui-menu-popup::after \{[^}]*content:none !important;/s,'Better UI popup neutralizes the host downward-only pseudo shell');
  assert.match(css,/border-radius:var\(--ppbui-window-radius\) !important/,'opted-in toolbar/menu shells use the native-aligned window radius role');
  assert.match(css,/border-radius:var\(--ppbui-control-radius\) !important/,'opted-in toolbar actions use the fixed native-aligned control radius');
  assert.doesNotMatch(css,/@media \(max-width:760px\)[\s\S]*\.pokeidle-top-toolbar__label[^}]*display:none/s,'Better UI preserves visible top-rail labels because the native island already owns its narrow six-column reflow');
  handle.dispatchEvent(new doc.defaultView.Event("pointerdown", { bubbles:true }));
  toggle.click();
  assert.equal(dragStarts, 1);
  assert.equal(toggles, 1);

  app.stop();
  assert.equal(doc.querySelector('[data-ppbui-style="menu-bar"]'), null);
  assert.equal(toolbar.outerHTML, before);
});

test("every grouped dropdown keeps a trigger-local upward anchor under hostile live positioning", t => {
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
      ["position", "absolute"],
      ["left", "50%"],
      ["right", "auto"],
      ["top", "auto"],
      ["bottom", "100%"],
      ["transform", "translateX(-50%)"],
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
    assert.equal(window.getComputedStyle(dropdown).position, "absolute");
    assert.equal(window.getComputedStyle(dropdown).top, "auto");
    assert.equal(window.getComputedStyle(dropdown).bottom, "100%");
    assert.equal(window.getComputedStyle(dropdown).transform, "translateX(-50%)");
    assert.equal(window.getComputedStyle(dropdown).display, "grid");
    assert.equal(window.getComputedStyle(dropdown).gridTemplateColumns.replace(/\s+/g, ""), "repeat(3,minmax(0,1fr))");
  }
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
