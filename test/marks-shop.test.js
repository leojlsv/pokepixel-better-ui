import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { setupShop } from "./fixtures/marks-shop.js";
import { mountShop } from "../src/modules/marks-shop/controller.js";
import { findShop } from "../src/modules/marks-shop/dom.js";
import { createMarksShopModule } from "../src/modules/marks-shop/index.js";
import { createBetterUI } from "../src/core/bootstrap.js";

function setup(t, tab = "buy") {
  const dom = new JSDOM("<!doctype html><html lang='en'><body></body></html>", { pretendToBeVisual: true });
  const fixture = setupShop(dom.window.document); fixture.npc.shopTab = tab; fixture.render();
  const before = fixture.root.outerHTML, controller = mountShop(fixture.root);
  t.after(() => { controller.cleanup(); dom.window.close(); });
  return { ...fixture, dom, controller, before };
}
test("purchase list preserves every original action, input and computed total", t => {
  const s = setup(t), row = s.root.querySelector(".npc-shop__buy-card"), input = row.querySelector('input');
  assert.ok(row.parentNode.classList.contains("ppbui-shop-list"));
  input.value = "7"; input.dispatchEvent(new s.dom.window.Event("input", { bubbles: true }));
  assert.equal(row.querySelector(".npc-shop__custom-total").textContent, "700");
  row.querySelector(".npc-shop__custom-button").click(); assert.deepEqual(s.npc.purchases, [["Poké Ball", 7]]);
  s.root.querySelectorAll(".ppbui-shop-modes button")[1].click();
  assert.equal(row.parentNode.classList.contains("ppbui-shop-list"), false); assert.equal(row.querySelector('input'), input);
  s.controller.cleanup(); assert.equal(s.root.querySelector('.ppbui-shop-modes'), null);
});
test("species grouping selects original checkboxes once, supports partial selection and never sells", t => {
  const s = setup(t, "pokemon"), group = s.root.querySelector(".ppbui-shop-group"), check = group.querySelector('input');
  assert.equal(s.npc.selectedCreatures.size, 0); assert.equal(group.querySelectorAll('.npc-shop__pokemon-row').length, 2);
  check.click(); assert.deepEqual([...s.npc.selectedCreatures], ["a", "b"]); assert.deepEqual(s.npc.changes, ["a", "b"]); assert.equal(s.npc.sales, 0);
  group.querySelector('.npc-shop__pokemon-row input').click(); assert.equal(check.indeterminate, true);
  group.querySelector('button').click(); assert.equal(group.querySelector('.ppbui-shop-group-body').hidden, false);
  assert.match(group.textContent, /1\/2 selected/); assert.match(group.textContent, /1,030/);
});
test("flat view and cleanup restore original rows, selection and order without cloning", t => {
  const s = setup(t, "pokemon"), rows = [...s.root.querySelectorAll('.npc-shop__pokemon-row')];
  s.root.querySelector('.ppbui-shop-group input').click();
  s.root.querySelectorAll('.ppbui-shop-modes button')[1].click();
  assert.deepEqual([...s.root.querySelector('.npc-shop__list--pokemon').children], rows);
  assert.deepEqual([...s.npc.selectedCreatures], ["a", "b"]);
  s.root.querySelectorAll('.ppbui-shop-modes button')[0].click(); s.controller.cleanup();
  assert.equal(s.root.outerHTML.replace('Sell 2 Pokémon', 'Sell selected').includes('ppbui-'), false);
  assert.deepEqual([...s.root.querySelector('.npc-shop__list--pokemon').children], rows);
});
test("stable reconciliation is mutation-free and initial cleanup is exact", async t => {
  for (const tab of ["buy", "pokemon"]) {
    const s = setup(t, tab), mutations = [], observer = new s.dom.window.MutationObserver(m => mutations.push(...m));
    observer.observe(s.root, { childList: true, subtree: true, attributes: true, characterData: true });
    for (let i = 0; i < 5; i++) s.controller.sync();
    await Promise.resolve(); observer.disconnect(); assert.equal(mutations.length, 0);
    s.controller.cleanup(); assert.equal(s.root.outerHTML, s.before);
  }
});
test("native filter rebuild keeps hidden selections explicit and new captures unselected", t => {
  const s = setup(t, "pokemon"); s.root.querySelector('.ppbui-shop-group input').click();
  s.npc.shopPokemonQuery = "Gastly"; s.render(); s.controller.sync();
  assert.match(s.root.querySelector('.ppbui-shop-selection').textContent, /2 selected · 2 outside/);
  s.root.querySelector('.ppbui-shop-group input').click(); assert.equal(s.npc.selectedCreatures.size, 3);
  s.npc.shopPokemonQuery = ""; s.npc.shopCreatures.push({ ...s.npc.shopCreatures[0], id: "new" }); s.render(); s.controller.sync();
  assert.equal(s.npc.selectedCreatures.has("new"), false); assert.equal(s.root.querySelector('.ppbui-shop-group input').indeterminate, true);
  assert.equal(s.npc.sales, 0);
});
test("mismatched rows, duplicate IDs and unsafe locations leave native list usable", t => {
  for (const alter of [s => { s.root.querySelector('.npc-shop__item-info b').textContent = 'Unexpected'; }, s => { s.npc.shopCreatures[1].id = 'a'; }, s => { s.npc.shopCreatures[0].location = 'team'; }]) {
    const s = setup(t, "pokemon"); s.controller.cleanup(); alter(s); const controller = mountShop(s.root);
    assert.equal(s.root.querySelector('.ppbui-shop-group'), null); assert.match(s.root.querySelector('.ppbui-shop-selection').textContent, /unavailable/);
    assert.ok(s.root.querySelector('.npc-shop__sell-button')); assert.equal(s.npc.sales, 0); controller.cleanup();
  }
});
test("group keys use species IDs, even for nicknames or identical translated names", t => {
  const s = setup(t, "pokemon"); s.npc.shopCreatures[0].nickname = "Sparky"; s.npc.shopCreatures[2].species.name = 'Pikachu'; s.render(); s.controller.sync();
  assert.equal(s.root.querySelectorAll('.ppbui-shop-group').length, 2);
  s.root.querySelector('.ppbui-shop-group input').click(); assert.deepEqual([...s.npc.selectedCreatures], ['a', 'b']);
});
test("detached group controls and disabled native checkboxes cannot select stale Pokémon", t => {
  const s = setup(t, "pokemon"), checkbox = s.root.querySelector('.ppbui-shop-group input');
  s.render(); checkbox.click(); assert.equal(s.npc.selectedCreatures.size, 0); s.controller.sync();
  s.root.querySelector('.npc-shop__pokemon-row input').disabled = true; s.controller.sync();
  assert.equal(s.root.querySelector('.ppbui-shop-group input').disabled, true);
});
test("mount target requires NPC-owned shop shell, not a different NPC panel", t => {
  const s = setup(t), previous = globalThis.document; globalThis.document = s.dom.window.document; t.after(() => { globalThis.document = previous; });
  assert.equal(findShop(), s.root); s.npc.panel = { body: s.dom.window.document.createElement('div') }; assert.equal(findShop(), null);
});
test("changed protected state and a sale in progress block group selection", t => {
  const s = setup(t, "pokemon"), group = s.root.querySelector('.ppbui-shop-group input');
  s.npc.shopCreatures[0].locked = true; group.click(); assert.equal(s.npc.selectedCreatures.size, 0);
  s.npc.shopCreatures[0].locked = false; s.controller.sync(); group.click();
  s.root.querySelector('.npc-shop__sell-button').disabled = true; s.controller.sync();
  assert.equal(group.disabled, true); group.click(); assert.equal(s.npc.selectedCreatures.size, 2);
});
test("replacing a native checkbox never invokes its detached listener", t => {
  const s = setup(t, "pokemon"), old = s.root.querySelector('.npc-shop__pokemon-row input');
  old.replaceWith(old.cloneNode()); s.root.querySelector('.ppbui-shop-group input').click();
  assert.equal(s.npc.changes.length, 0);
});
test("core handles full window replacement, disabling and re-enabling without duplicates", t => {
  const s = setup(t, 'pokemon'); s.controller.cleanup();
  const keys = ['document', 'window', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const original = new Map(keys.map(key => [key, globalThis[key]]));
  for (const key of keys) globalThis[key] = typeof s.dom.window[key] === 'function' && key !== 'MutationObserver' ? s.dom.window[key].bind(s.dom.window) : s.dom.window[key];
  let enabled = true;
  const app = createBetterUI({ modules: [createMarksShopModule()], preferences: { isEnabled: () => enabled, subscribe: () => () => {} } });
  t.after(() => { app.stop(); for (const [key, value] of original) globalThis[key] = value; });
  app.start(); assert.equal(s.root.querySelectorAll('.ppbui-shop-group').length, 2);
  enabled = false; app.reconcile(); assert.equal(s.root.querySelector('.ppbui-shop-group'), null);
  enabled = true; app.reconcile(); s.root.remove();
  const next = setupShop(s.dom.window.document); next.npc.shopTab = 'pokemon'; next.render(); app.reconcile(); app.reconcile();
  assert.equal(next.root.querySelectorAll('.ppbui-shop-group').length, 2); assert.equal(next.npc.selectedCreatures.size, 0);
  app.stop(); assert.equal(next.root.querySelector('[data-ppbui-module]'), null);
});
