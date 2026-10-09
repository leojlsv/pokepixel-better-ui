import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { setupShop } from "./fixtures/marks-shop.js";
import { mountShop } from "../src/modules/marks-shop/controller.js";
import { findShop, saleValue } from "../src/modules/marks-shop/dom.js";
import { createMarksShopModule } from "../src/modules/marks-shop/index.js";
import { createBetterUI } from "../src/core/bootstrap.js";
import shopCss from "../src/modules/marks-shop/styles.js";

function setup(t, tab = "buy") {
  const dom = new JSDOM("<!doctype html><html lang='en'><body></body></html>", { pretendToBeVisual: true });
  const fixture = setupShop(dom.window.document); fixture.npc.shopTab = tab; fixture.render();
  const before = fixture.root.outerHTML, controller = mountShop(fixture.root);
  t.after(() => { controller.cleanup(); dom.window.close(); });
  return { ...fixture, dom, controller, before };
}
test("Buy restores List/Cards with List as default while quantity is the primary visible purchase flow", t => {
  const s = setup(t), row = s.root.querySelector(".npc-shop__buy-card"), input = row.querySelector('input');
  const rows = [...s.root.querySelectorAll('.npc-shop__buy-card')], modes = [...s.root.querySelectorAll('.ppbui-shop-modes button')];
  assert.deepEqual(modes.map(button => button.textContent), ["List", "Cards"]);
  assert.equal(s.root.dataset.ppbuiShopBuyView, "list");
  assert.equal(modes[0].getAttribute('aria-pressed'), 'true');
  assert.equal(row.querySelectorAll('.npc-shop__purchase-button').length, 4, "native quick-buy actions stay intact in the DOM");
  assert.match(shopCss, /\.npc-shop__purchase-button\.ppbui-button\s*\{[\s\S]*?display:none!important;/i, "quick-buy presets leave the Better UI visual flow without being deleted");
  assert.match(shopCss, /data-ppbui-shop-buy-view="list"[\s\S]*?grid-template-columns:minmax\(0,1fr\)!important;/i, "list view is a true one-column catalog");
  input.value = "7"; input.dispatchEvent(new s.dom.window.Event("input", { bubbles: true }));
  const steps = [...row.querySelectorAll('[data-ppbui-shop-quantity-step]')];
  assert.deepEqual(steps.map(button => button.textContent), ["+100", "+500", "+1000"]);
  steps[0].click(); steps[1].click(); steps[2].click();
  assert.equal(input.value, "1607"); assert.equal(row.querySelector(".npc-shop__custom-total").textContent, "160700");
  assert.deepEqual(s.npc.purchases, [], "quantity steppers never execute a purchase");
  row.querySelector(".npc-shop__custom-button").click(); assert.deepEqual(s.npc.purchases, [["Poké Ball", 1607]]);
  modes[1].click(); assert.equal(s.root.dataset.ppbuiShopBuyView, "cards"); assert.deepEqual([...s.root.querySelectorAll('.npc-shop__buy-card')], rows, "view switch only restyles native rows");
  modes[0].click(); assert.equal(s.root.dataset.ppbuiShopBuyView, "list"); assert.deepEqual([...s.root.querySelectorAll('.npc-shop__buy-card')], rows);
  s.controller.sync(); assert.equal(row.querySelector('input'), input);
});
test("quantity steppers clamp to native limits, fail closed and survive native rerenders", t => {
  const s = setup(t), row = s.root.querySelector('.npc-shop__buy-card'), input = row.querySelector('input'), stale = row.querySelector('[data-ppbui-shop-quantity-step="100"]');
  input.value = "999950"; input.dispatchEvent(new s.dom.window.Event("input", { bubbles: true })); stale.click();
  assert.equal(input.value, "1000000"); assert.equal(s.npc.purchases.length, 0);
  input.value = ""; row.querySelector('[data-ppbui-shop-quantity-step="500"]').click(); assert.equal(input.value, "", "invalid native quantities remain untouched");
  input.value = "10"; input.disabled = true; row.querySelector('[data-ppbui-shop-quantity-step="1000"]').click(); assert.equal(input.value, "10"); input.disabled = false;
  s.render(); s.controller.sync();
  const freshRow = s.root.querySelector('.npc-shop__buy-card'), freshInput = freshRow.querySelector('input');
  assert.equal(freshRow.querySelectorAll('[data-ppbui-shop-quantity-steps]').length, 1);
  stale.click(); assert.equal(freshInput.value, "1", "detached stale steppers are inert under delegated ownership");
  freshRow.querySelector('[data-ppbui-shop-quantity-step="100"]').click(); assert.equal(freshInput.value, "101");
  s.controller.cleanup(); assert.equal(s.root.querySelector('[data-ppbui-shop-quantity-steps]'), null); assert.ok(freshRow.querySelector('.npc-shop__custom-button')); assert.equal(freshRow.querySelector('input'), freshInput);
});
test("hidden quick-buy nodes remain native and callable for compatibility", t => {
  const s = setup(t), row = s.root.querySelector('.npc-shop__buy-card'), quick = row.querySelector('.npc-shop__purchase-button');
  quick.click();
  assert.deepEqual(s.npc.purchases, [["Poké Ball", 1]], "Better UI hides but does not reimplement or detach the native quick-buy action");
});
test("species grouping selects original checkboxes once, supports partial selection and never sells", t => {
  const s = setup(t, "pokemon"), group = s.root.querySelector(".ppbui-shop-group"), check = group.querySelector('input');
  assert.ok(group.querySelector('.ppbui-shop-group-header > button').classList.contains('ppbui-button'));
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
  for (const tab of ["buy", "sell", "pokemon", "buyback"]) {
    const s = setup(t, tab), mutations = [], observer = new s.dom.window.MutationObserver(m => mutations.push(...m));
    observer.observe(s.root, { childList: true, subtree: true, attributes: true, characterData: true });
    for (let i = 0; i < 5; i++) s.controller.sync();
    await Promise.resolve(); observer.disconnect(); assert.equal(mutations.length, 0);
    s.controller.cleanup(); assert.equal(s.root.outerHTML, s.before);
  }
});
test("large grouped Pokémon inventory stays bounded and validates visibility once per sync", t => {
  const s = setup(t, "pokemon");
  s.controller.cleanup();
  const seed = s.npc.shopCreatures[0];
  s.npc.shopCreatures = Array.from({ length: 240 }, (_, index) => ({
    ...seed,
    id: `bulk-${index}`,
    species_id: `species-${index % 24}`,
    species: { name: `Species ${index % 24}` },
    species_name: `Species ${index % 24}`,
    quality: index % 2 ? "rare" : "common",
    level: 10 + (index % 50),
    sell_value: 100 + index,
  }));
  let filterChecks = 0;
  const filters = s.npc.pokemonQualityFilters;
  const originalHas = filters.has.bind(filters);
  filters.has = value => { filterChecks += 1; return originalHas(value); };
  s.render();
  const controller = mountShop(s.root);
  t.after(() => controller.cleanup());
  assert.equal(s.root.querySelectorAll(".ppbui-shop-group").length, 24);
  assert.match(shopCss, /\.npc-shop__list--pokemon\s*\{\s*grid-auto-rows:max-content!important;\s*\}/i, "large group inventories must scroll instead of shrinking every group header");
  filterChecks = 0;
  controller.sync();
  assert.ok(filterChecks <= 260, `visibility filtering should be O(n) per sync, got ${filterChecks} checks for 240 Pokémon`);
  const first = s.root.querySelector(".ppbui-shop-group");
  const toggle = first.querySelector(".ppbui-shop-group-toggle");
  toggle.click();
  assert.equal(first.querySelector(".ppbui-shop-group-body").hidden, false);
  assert.match(shopCss, /\.ppbui-shop-group-body\s*\{[^}]*max-height:min\(360px,50vh\)[^}]*overflow-y:auto/i);
  const beforeSales = s.npc.sales;
  first.querySelector('input[type="checkbox"]').click();
  assert.ok(s.npc.selectedCreatures.size > 0);
  assert.equal(s.npc.sales, beforeSales, "group selection remains selection-only even with a large inventory");
});
test("stable grouped sync reuses captured native checkbox references instead of rediscovering every row", t => {
  const s = setup(t, "pokemon");
  s.controller.cleanup();
  const seed = s.npc.shopCreatures[0];
  s.npc.shopCreatures = Array.from({ length: 240 }, (_, index) => ({
    ...seed,
    id: `bulk-${index}`,
    species_id: `species-${index % 24}`,
    species: { name: `Species ${index % 24}` },
    species_name: `Species ${index % 24}`,
    quality: index % 2 ? "rare" : "common",
    level: 10 + (index % 50),
    sell_value: 100 + index,
  }));
  s.render();
  const controller = mountShop(s.root);
  t.after(() => controller.cleanup());
  const rows = [...s.root.querySelectorAll(".npc-shop__pokemon-row")];
  let rowQueries = 0;
  for (const row of rows) {
    const querySelector = row.querySelector.bind(row);
    row.querySelector = (...args) => { rowQueries += 1; return querySelector(...args); };
  }
  controller.sync();
  assert.equal(rowQueries, 0, "stable validation should trust the captured checkbox identity and only verify ownership/connectivity");
  const old = rows[0].querySelector('input[type="checkbox"]');
  old.replaceWith(old.cloneNode());
  s.root.querySelector('.ppbui-shop-group input').click();
  assert.equal(s.npc.changes.length, 0, "replacing a checkbox still invalidates the captured row safely");
});
test("full overhaul claims the complete native shop shell across all four tabs without replacing controls", t => {
  for (const tab of ["buy", "sell", "pokemon", "buyback"]) {
    const s = setup(t, tab), search = s.root.querySelector('.npc-shop__search'), tabs = [...s.root.querySelectorAll('.npc-shop__tab')];
    assert.ok(s.root.classList.contains('ppbui-window')); assert.ok(s.root.classList.contains('ppbui-root')); assert.ok(s.root.classList.contains('ppbui-scroll-scope')); assert.ok(s.root.classList.contains('ppbui-marks-shop'));
    assert.equal(s.root.dataset.ppbuiShopTab, tab); assert.ok(search.classList.contains('ppbui-input')); assert.ok(s.root.querySelector('.npc-shop__content').classList.contains('ppbui-shop-content'));
    const searchLabel = s.root.querySelector('.ppbui-shop-search-label'); assert.equal(searchLabel.querySelector('input'), search); assert.equal(searchLabel.querySelector('.ppbui-shop-search-copy').textContent, search.getAttribute('aria-label'));
    assert.equal(tabs.length, 4); assert.ok(tabs.every(node => node.classList.contains('ppbui-button') && node.classList.contains('ppbui-shop-tab')));
    s.controller.sync(); assert.equal(s.root.querySelector('.npc-shop__search'), search); assert.deepEqual([...s.root.querySelectorAll('.npc-shop__tab')], tabs);
    s.controller.cleanup(); assert.equal(s.root.outerHTML, s.before);
  }
});
test("search wrapper preserves repeated native input replacements and cleanup restores the latest node exactly", t => {
  const s = setup(t, "buy"), original = s.root.querySelector('.npc-shop__search');
  let current = original;
  for (let i = 0; i < 2; i++) {
    const replacement = current.cloneNode(true);
    current.replaceWith(replacement);
    current = replacement;
    s.controller.sync();
    assert.equal(s.root.querySelector('.npc-shop__search'), current, "sync must preserve the host replacement instead of removing it with the old wrapper");
    assert.equal(s.root.querySelector('.ppbui-shop-search-label')?.querySelector('.npc-shop__search'), current);
  }
  s.controller.cleanup();
  assert.equal(s.root.querySelector('.npc-shop__search'), current);
  assert.equal(s.root.querySelector('.ppbui-shop-search-label'), null);
  assert.equal(s.root.outerHTML, s.before);
});
test("Sell Items keeps native selection, quantity and Sell handlers authoritative", t => {
  const s = setup(t, "sell"), row = s.root.querySelector('.npc-shop__sell-row'), checkbox = row.querySelector('input[type="checkbox"]'), quantity = row.querySelector('.npc-shop__sell-quantity input'), sell = s.root.querySelector('.npc-shop__sell-button');
  assert.ok(row.classList.contains('ppbui-card')); assert.ok(quantity.classList.contains('ppbui-input')); assert.ok(sell.classList.contains('ppbui-button--danger'));
  checkbox.click(); assert.equal(s.npc.selectedItems.has('potion'), true); assert.equal(s.npc.itemSales, 0);
  quantity.value = "2"; quantity.dispatchEvent(new s.dom.window.Event("input", { bubbles:true }));
  assert.equal(row.querySelector('.npc-shop__price').textContent, "150"); assert.equal(s.root.querySelector('.npc-shop__sell-quantity input'), quantity);
  sell.click(); assert.equal(s.npc.itemSales, 1, "Better UI must leave the original Sell button as the only executor");
});
test("Sell Items and Sell Pokémon Select All stay in the footer without a second framed row", t => {
  for (const tab of ["sell", "pokemon"]) {
    const s = setup(t, tab), selectAll = s.root.querySelector('.npc-shop__select-all');
    assert.ok(selectAll);
    assert.equal(selectAll.parentElement.classList.contains('npc-shop__sell-footer'), true);
    if (tab === "pokemon") {
      const summary = s.root.querySelector('.ppbui-shop-selection');
      assert.equal(summary.parentElement, selectAll.parentElement, "Pokémon selection summary belongs to the existing native footer instead of creating another strip");
      assert.equal(summary.classList.contains('npc-shop__content-heading'), false);
    }
  }
  const normalized = shopCss.replace(/\s+/g, ' ');
  assert.match(normalized, /\.npc-shop__select-all \{[^}]*min-height:0!important;[^}]*padding:0!important;[^}]*border:0!important;[^}]*background:transparent!important;[^}]*box-shadow:none!important;/, "native Select All frame is neutralized so the footer owns the single divider");
  assert.match(normalized, /\.ppbui-shop-selection \{[^}]*padding:0!important;[^}]*border:0!important;[^}]*background:transparent!important;/, "selection summary is quiet footer text rather than a second framed row");
});
test("Buyback keeps each native action node and handler while adopting the overhaul presentation", t => {
  const s = setup(t, "buyback"), row = s.root.querySelector('.npc-shop__buyback-row'), action = row.querySelector('.npc-shop__buyback-button');
  assert.ok(row.classList.contains('ppbui-card')); assert.ok(action.classList.contains('ppbui-button--primary'));
  s.controller.sync(); assert.equal(row.querySelector('.npc-shop__buyback-button'), action);
  action.click(); assert.equal(s.npc.buybacks, 1);
});
test("underscore locale tags cannot break Pokémon grouping", t => {
  const dom = new JSDOM("<!doctype html><html lang='pt_BR'><body></body></html>", { pretendToBeVisual:true }), fixture = setupShop(dom.window.document);
  fixture.npc.shopTab = "pokemon"; fixture.render();
  const before = fixture.root.outerHTML, controller = mountShop(fixture.root);
  t.after(() => { controller.cleanup(); dom.window.close(); });
  assert.equal(fixture.root.querySelectorAll('.ppbui-shop-group').length, 2); assert.equal(fixture.root.dataset.ppbuiShopTab, 'pokemon');
  controller.cleanup(); assert.equal(fixture.root.outerHTML, before);
});
test("cleanup never steals a native Pokémon row that the host reparented away from a PPBUI group", t => {
  const s = setup(t, "pokemon"), list = s.root.querySelector('.npc-shop__list--pokemon'), row = s.root.querySelector('.ppbui-shop-group .npc-shop__pokemon-row');
  list.append(row); assert.equal(row.parentElement, list);
  s.controller.cleanup(); assert.equal(row.parentElement, list, "host-owned placement must win over a stale PPBUI restoration anchor");
});
test("group disclosure has an explicit controlled region and structured facts", t => {
  const s = setup(t, "pokemon"), group = s.root.querySelector('.ppbui-shop-group'), toggle = group.querySelector('.ppbui-shop-group-toggle');
  const body = s.root.ownerDocument.getElementById(toggle.getAttribute('aria-controls'));
  assert.ok(body); assert.equal(body, group.querySelector('.ppbui-shop-group-body')); assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  const facts = group.querySelector('.ppbui-shop-group-facts'); assert.ok(facts); assert.equal(toggle.children.length, 0, "disclosure remains a compact dedicated affordance");
  assert.ok(facts.querySelector('.ppbui-shop-group-name')); assert.match(facts.querySelector('.ppbui-shop-group-meta').textContent, /0\/2 selected/); assert.match(facts.querySelector('.ppbui-shop-group-total').textContent, /1,030/);
  toggle.click(); assert.equal(toggle.getAttribute('aria-expanded'), 'true'); assert.equal(body.hidden, false);
});
test("group totals consume verified native sale values without inventing a local price floor", t => {
  assert.equal(saleValue({ sell_value:12 }), 12);
  assert.equal(saleValue({ sell_value:0 }), 0);
  assert.equal(saleValue({ sell_value:0, sell_price:7 }), 7);
  assert.equal(saleValue({ sell_value:"9" }), 9);
  assert.equal(saleValue({ sell_value:"bad" }), null);
  assert.equal(saleValue({ sell_value:null }), null);

  const s = setup(t, "pokemon");
  s.controller.cleanup();
  s.npc.shopCreatures[0].sell_value = 12;
  s.npc.shopCreatures[1].sell_value = 0;
  s.render();
  const controller = mountShop(s.root);
  assert.match(s.root.querySelector('.ppbui-shop-group-total').textContent, /12/);
  controller.cleanup();

  s.npc.shopCreatures[1].sell_value = "not-a-price";
  s.render();
  const failClosed = mountShop(s.root);
  assert.match(s.root.querySelector('.ppbui-shop-group-total').textContent, /—/);
  failClosed.cleanup();
});
test("overhaul CSS keeps responsive List/Cards, quantity-first purchase flow and no deprecated pixel-art overlay", () => {
  assert.doesNotMatch(shopCss, /min-width\s*:\s*490px/i); assert.doesNotMatch(shopCss, /ppbui-shop-list/); assert.match(shopCss, /container-name\s*:\s*ppbui-marks-shop/i); assert.match(shopCss, /@container ppbui-marks-shop \(max-width:420px\)/i);
  assert.match(shopCss, /\.npc-shop__buy-card\.ppbui-card\s*\{[\s\S]*?min-height:auto!important;/i, "Buy cards must keep their automatic minimum so narrow grid tracks cannot crush native controls");
  assert.match(shopCss, /\.npc-shop__custom-purchase input\.ppbui-input\s*\{[\s\S]*?font:700 var\(--ppbui-font-size-secondary\)/i, "quantity input is promoted above compact metadata sizing");
  assert.doesNotMatch(shopCss, /image-rendering\s*:\s*pixelated/i, "Mark's Shop must not reintroduce the deprecated pixel-art rendering overlay");
  assert.match(shopCss, /ppbui-button--danger/); assert.match(shopCss, /--ppbui-selected/); assert.match(shopCss, /--ppbui-focus/);
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
test("non-shop NPC windows are rejected by the shop sentinel before their large subtree is scanned", t => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
  const { document } = dom.window, previous = globalThis.document;
  globalThis.document = document;
  t.after(() => { globalThis.document = previous; dom.window.close(); });
  const root = document.createElement("section"); root.className = "game-window npc-shop-window npc-nature-window";
  const body = document.createElement("div"); body.className = "pokeidle-panel__body";
  const tabs = document.createElement("nav"); tabs.className = "npc-shop__tabs";
  tabs.append(document.createElement("button"), document.createElement("button"));
  const list = document.createElement("div"); list.className = "npc-shop__list npc-nature__pokemon-list";
  for (let i = 0; i < 500; i++) {
    const card = document.createElement("button"); card.className = "npc-nature__pokemon npc-iv__pokemon";
    card.innerHTML = `<img><span><b>Pokemon ${i}</b><small>metadata</small><em>nature</em></span><span>cost</span>`;
    list.append(card);
  }
  body.append(tabs, list); root.append(body); document.body.append(root);
  dom.window.PokeIdle = { NPC: { panel: { body } } };
  let subtreeQueries = 0;
  const querySelector = root.querySelector.bind(root), querySelectorAll = root.querySelectorAll.bind(root);
  root.querySelector = (...args) => { subtreeQueries++; return querySelector(...args); };
  root.querySelectorAll = (...args) => { subtreeQueries++; return querySelectorAll(...args); };
  assert.equal(findShop(), null);
  assert.equal(subtreeQueries, 0, "Nature/Geneticist impostors must fail the exclusive shop-shell check before any root scan");
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
