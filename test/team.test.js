import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { mountTeam } from "../src/modules/team/controller.js";

const members = () => [
  { id: "a", name: "Pikachu", level: 20, power: 120, quality: "rare", hp: 80, max_hp: 100, ivs: { hp: 20, atk: 22 }, atk: 40, def: 30, spa: 50, spd: 35, spe: 60 },
  { id: "b", name: "Marowak", level: 25, power: 160, quality: "epic", hp: 0, max_hp: 120, ivs: { hp: 25, atk: 27 }, atk: 70, def: 65, spa: 25, spd: 45, spe: 30 },
];
const bodyMarkup = () => `<section class="team-section team-section--roster"><div class="team-slots">${Array.from({ length: 6 }, (_, index) => `<button class="team-slot">${index < 2 ? `<span class="team-slot__sprite">${index}</span>` : '<span class="team-slot__empty">+</span>'}</button>`).join("")}</div></section><section class="team-section team-section--profile"><div class="team-detail__hero"><div class="team-detail__info"><h2>Marowak</h2></div></div><button class="team-active-state">Active</button><div class="team-order-controls"><span class="team-order-label">Battle order · position 2</span><button class="pokeidle-btn team-order-button">←</button><button class="pokeidle-btn team-order-button" disabled>→</button></div></section><section class="team-section team-section--vitals">Vitals</section><section class="team-section team-section--attributes">Stats</section><div class="team-actions"><button class="pokeidle-btn">Details</button><button class="pokeidle-btn pokeidle-btn--danger" disabled>Remove</button></div>`;

function setup(t) {
  const dom = new JSDOM(`<div class="pokeidle-team-panel"><div class="pokeidle-panel__body">${bodyMarkup()}</div></div>`, { url: "https://test.local", pretendToBeVisual: true });
  const root = dom.window.document.body.firstChild, body = root.firstChild;
  const scene = { _panel: { body }, _creatures: members(), _available: [
    { id: "c", name: "Bulbasaur", quality: "rare", hp: 50, max_hp: 50, elements: ["grass", "poison"] },
    { id: "d", name: "Gastly", quality: "epic", hp: 0, max_hp: 40, elements: ["ghost", "poison"] },
  ], _team: { member_ids: ["a", "b"], leader_id: "a" }, _selectedId: "b" };
  dom.window.SceneManager = { _scene: scene }; dom.window.PokeIdle = { Localization: { get: () => "pt-BR" }, DittoDisplayName: { get: member => member.name }, ElementIcons: { definition: element => ({ label: element }) } };
  const before = root.outerHTML, controller = mountTeam(root); t.after(() => { controller.cleanup(); dom.window.close(); });
  return { dom, root, body, scene, controller, before };
}

test("team overview enriches the six original slots without replacing their actions", t => {
  const s = setup(t), slots = [...s.root.querySelectorAll(".team-slot")]; let clicks = 0; slots[0].addEventListener("click", () => clicks++); slots[0].click();
  assert.equal(clicks, 1); assert.equal(slots.length, 6); assert.match(slots[0].textContent, /Lv\. 20 · 80% HP/); assert.match(slots[0].getAttribute("aria-description"), /Pikachu/);
  assert.match(slots[1].textContent, /Derrotado/); assert.ok(slots[1].classList.contains("ppbui-team-fainted")); assert.equal(slots[2].querySelector("[data-ppbui-team-slot]"), null);
});

test("comparison is absent and repeated sync never reads comparison stats", t => {
  const s = setup(t);
  for (const member of s.scene._creatures) {
    for (const key of ["power", "quality", "quality_multiplier", "ivs", "atk", "def", "spa", "spd", "spe"]) {
      Object.defineProperty(member, key, { get() { assert.fail(`unexpected comparison read: ${key}`); } });
    }
  }
  for (const id of ["a", "b", "a", "b"]) {
    s.scene._selectedId = id; s.controller.sync();
    assert.equal(s.root.querySelector("[data-ppbui-team-compare]"), null);
  }
  assert.doesNotMatch(s.root.querySelector("style").textContent, /compare|positive|negative/);
  assert.equal(s.root.querySelector(".team-section--vitals").textContent, "Vitals");
  assert.equal(s.root.querySelector(".team-section--attributes").textContent, "Stats");
});

test("native actions move intact, preserve disabled state and return on cleanup", t => {
  const s = setup(t), actions = s.root.querySelector(".team-actions"), details = actions.firstElementChild, profile = s.root.querySelector(".team-section--profile"); let clicks = 0;
  details.addEventListener("click", () => clicks++); details.click(); assert.equal(clicks, 1); assert.equal(actions.parentElement, profile.querySelector(".ppbui-team-profile-controls")); assert.equal(profile.querySelector(".team-active-state")?.textContent, "Active"); assert.equal(actions.lastElementChild.disabled, true);
  s.controller.cleanup(); assert.equal(s.root.outerHTML, s.before);
});

test("add picker filters loaded native cards and preserves their add actions", t => {
  const s = setup(t), picker = s.dom.window.document.createElement("div"); picker.className = "team-equip-picker";
  picker.innerHTML = '<div class="pokeidle-panel__body"><p class="team-equip-picker__intro">Choose</p><div class="team-equip-picker__grid"><button class="team-equip-card">Bulbasaur</button><button class="team-equip-card is-fainted">Gastly</button></div></div>';
  s.dom.window.document.body.append(picker); let adds = 0; const cards = [...picker.querySelectorAll(".team-equip-card")]; cards[0].addEventListener("click", () => adds++); s.controller.sync();
  const toolbar = picker.querySelector(".ppbui-team-picker-toolbar"), search = toolbar.querySelector("input"), selects = toolbar.querySelectorAll("select"); assert.ok(toolbar);
  search.value = "gast"; search.dispatchEvent(new s.dom.window.Event("input")); assert.equal(cards[0].hidden, true); assert.equal(cards[1].hidden, false);
  search.value = ""; selects[0].value = "grass"; selects[0].dispatchEvent(new s.dom.window.Event("change")); assert.equal(cards[0].hidden, false); assert.equal(cards[1].hidden, true);
  selects[0].value = ""; selects[1].value = "rare"; selects[1].dispatchEvent(new s.dom.window.Event("change")); cards[0].click(); assert.equal(adds, 1); assert.equal(cards[1].hidden, true);
  toolbar.querySelector("button").click(); assert.equal(cards.every(card => !card.hidden), true); s.controller.cleanup(); assert.equal(picker.querySelector(".ppbui-team-picker-toolbar"), null); assert.equal(cards.every(card => !card.hidden), true); picker.remove();
});

test("stable reconciliation has no mutations and live values update", async t => {
  const s = setup(t); let mutations = 0; const observer = new s.dom.window.MutationObserver(records => mutations += records.length);
  observer.observe(s.root, { subtree: true, childList: true, attributes: true, characterData: true }); for (let index = 0; index < 5; index++) s.controller.sync(); await Promise.resolve(); assert.equal(mutations, 0);
  s.scene._creatures[0].hp = 50; s.controller.sync(); await Promise.resolve(); observer.disconnect(); assert.match(s.root.querySelector(".team-slot").textContent, /50% HP/);
});

test("a native full refresh is enhanced once and cleanup never resurrects stale nodes", t => {
  const s = setup(t), staleActions = s.root.querySelector(".team-actions"); s.body.innerHTML = bodyMarkup(); const freshActions = s.root.querySelector(".team-actions"), details = freshActions.firstElementChild; let clicks = 0;
  details.addEventListener("click", () => clicks++); s.controller.sync(); s.controller.sync(); details.click(); assert.equal(clicks, 1);
  assert.equal(s.root.querySelectorAll("[data-ppbui-team-compare]").length, 0); assert.equal(s.root.querySelectorAll("[data-ppbui-team-slot]").length, 2); s.controller.cleanup();
  assert.equal(freshActions.parentElement, s.body); assert.equal(staleActions.isConnected, false); assert.equal(s.root.querySelector("[data-ppbui-module]"), null);
});

test("native Battle order actions stay in the profile with intact handlers and exact cleanup", t => {
  const s = setup(t), order = s.root.querySelector('.team-order-controls'), left = order.querySelector('button'), right = order.lastElementChild;
  const active = s.root.querySelector('.team-active-state'), info = s.root.querySelector('.team-detail__info');
  assert.equal(order.parentElement.parentElement, info);
  assert.equal(active.parentElement, order.parentElement);
  assert.equal(s.root.querySelector(".team-actions").parentElement, order.parentElement);
  let moves = 0; left.onclick = () => moves++;
  left.click(); right.click(); assert.equal(moves, 1); assert.equal(right.disabled, true);
  s.controller.sync(); assert.equal(s.root.querySelector('.team-order-controls'), order);
  s.controller.cleanup();
  assert.equal(order.parentElement, s.root.querySelector('.team-section--profile'));
  assert.equal(active.nextElementSibling, order);
  left.click(); assert.equal(moves, 2);
  assert.equal(s.root.outerHTML, s.before);
});

test("compact active/removal labels preserve explanations, native state and cleanup", t => {
  const s = setup(t); s.dom.window.PokeIdle.Localization.get = () => 'en';
  const active = s.root.querySelector('.team-active-state'), remove = s.root.querySelector('.pokeidle-btn--danger');
  const activeText = '⚔ Active — this is the Pokémon that hunts', blockedText = 'Choose another Pokémon so you can remove this one';
  active.classList.add('is-active'); active.disabled = true; active.textContent = activeText; remove.textContent = blockedText;
  s.controller.sync();
  assert.equal(active.textContent, '⚔ Active'); assert.equal(remove.textContent, 'Remove from team');
  assert.equal(remove.disabled, true); assert.equal(remove.title, blockedText); assert.equal(remove.getAttribute('aria-description'), blockedText);
  const observer = new s.dom.window.MutationObserver(() => {}); observer.observe(s.root, {subtree:true,attributes:true,childList:true,characterData:true});
  for(let i=0;i<10;i++) s.controller.sync(); assert.equal(observer.takeRecords().length,0); observer.disconnect();
  s.controller.cleanup(); assert.equal(active.textContent, activeText); assert.equal(remove.textContent, blockedText);
  assert.equal(active.hasAttribute('title'),false); assert.equal(remove.hasAttribute('aria-description'),false);
});

test("same-node native state changes update compact button explanations", t => {
  const s = setup(t); s.dom.window.PokeIdle.Localization.get = () => 'en';
  const active=s.root.querySelector('.team-active-state'),remove=s.root.querySelector('.pokeidle-btn--danger');
  active.classList.add('is-active'); active.textContent='Active long explanation'; remove.textContent='Choose another Pokémon'; s.controller.sync();
  active.classList.remove('is-active'); active.textContent='Make Pokémon active'; remove.disabled=false; s.controller.sync();
  assert.equal(active.textContent,'Make Pokémon active'); assert.equal(remove.title,'Remove from team');
  s.controller.cleanup(); assert.equal(remove.textContent,'Remove from team');
});

test("compact Position label follows selection and native order with reversible text", t => {
  const s = setup(t), label = s.root.querySelector(".team-order-label");
  assert.equal(label.textContent, "Posição 2");
  s.dom.window.PokeIdle.Localization.get = () => "en"; s.controller.sync();
  assert.equal(label.textContent, "Position 2");
  s.scene._team.member_ids = ["b", "a"]; s.controller.sync();
  assert.equal(label.textContent, "Position 1");
  s.scene._selectedId = "a"; s.controller.sync();
  assert.equal(label.textContent, "Position 2");
  label.textContent = "Battle order · position 2 (native refresh)"; s.controller.sync();
  assert.equal(label.textContent, "Position 2");
  s.controller.cleanup();
  assert.equal(label.textContent, "Battle order · position 2 (native refresh)");
  assert.equal(label.hasAttribute("title"), false);
});
