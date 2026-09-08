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

test("groups the original nodes, preserves all 27 destinations and calls listeners once", (t) => {
  const { app, toolbar, pack, premium, group, trigger } = setup(t);
  const ids = [...toolbar.querySelectorAll("[data-menu-id]")].map((el) => el.dataset.menuId).sort();
  let packClicks = 0;
  let premiumClicks = 0;
  pack.addEventListener("click", () => packClicks++);
  premium.addEventListener("click", () => premiumClicks++);
  app.start();
  for (let i = 0; i < 10; i++) app.reconcile();
  assert.equal(toolbar.querySelectorAll('[data-ppbui-group="shop"]').length, 1);
  assert.equal(toolbar.querySelectorAll('button[data-menu-id]:not([aria-haspopup])').length, 27);
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
  const { app, doc, window, pack, premium, trigger } = setup(t);
  const key = (node, value) => node.dispatchEvent(new window.KeyboardEvent("keydown", { key: value, bubbles: true }));
  app.start();
  trigger().focus();
  key(trigger(), "ArrowUp");
  assert.equal(doc.activeElement, pack);
  key(pack, "Home");
  assert.equal(doc.activeElement, premium);
  pack.hidden = true;
  key(premium, "ArrowDown");
  assert.equal(doc.activeElement, premium);
  key(premium, "Escape");
  assert.equal(trigger().getAttribute("aria-expanded"), "false");
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


// These six additional destinations model the public HUD contract, not a live capture.
function completeFixture() {
  const dom = new JSDOM(fixture);
  const doc = dom.window.document;
  const toolbar = doc.querySelector(".pokeidle-top-toolbar");
  const city = doc.querySelector('[data-menu-group="social"]').cloneNode(true);
  city.dataset.menuGroup = "city";
  const trigger = city.querySelector("button");
  trigger.dataset.menuId = "city";
  trigger.setAttribute("aria-label", "Cidade");
  trigger.querySelector("span").textContent = "Cidade";
  trigger.setAttribute("aria-controls", "native-city-menu");
  const dropdown = city.querySelector('[role="menu"]');
  dropdown.id = "native-city-menu";
  dropdown.replaceChildren();
  const button = (id) => {
    const node = doc.createElement("button");
    node.className = "pokeidle-top-toolbar__dropdown-btn";
    node.dataset.menuId = id;
    node.innerHTML = `<span>${id}</span>`;
    node.setAttribute("aria-label", id);
    return node;
  };
  for (const id of ["npc-shop", "market", "storage", "professions"]) dropdown.append(button(id));
  toolbar.append(city);
  for (const id of ["event-calendar", "gacha"]) doc.querySelector('[data-menu-group="events"] [role="menu"]').append(button(id));
  const html = toolbar.outerHTML;
  dom.window.close();
  return html;
}

const actionSelector = 'button[data-menu-id]:not([aria-haspopup="menu"])';

test("all 33 destinations follow the approved order without replacing actions, shortcuts or native badges", t => {
  const { app, toolbar } = setup(t, completeFixture());
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
  const { app, window, toolbar } = setup(t, completeFixture());
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
  const { app, toolbar } = setup(t, completeFixture());
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
  const { app, window, toolbar } = setup(t, completeFixture());
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
  const { app, toolbar } = setup(t, completeFixture());
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
  const { app, toolbar } = setup(t, completeFixture());
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
