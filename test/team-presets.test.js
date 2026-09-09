import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { applyTeamPreset } from "../src/modules/team-presets/actions.js";
import { mountTeamPresets } from "../src/modules/team-presets/controller.js";
import { currentTeamSnapshot } from "../src/modules/team-presets/dom.js";
import { mountTeamPresetManager } from "../src/modules/team-presets/manager.js";
import { createTeamPresetStorage } from "../src/modules/team-presets/storage.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
}

const snapshot = (ids, activeId = ids[0]) => ({ members: ids.map(id => ({ id, name: id.toUpperCase() })), activeId, orderVerified: true });
const preset = (ids, activeId = ids[0], orderVerified = true) => ({ id: "preset", name: "Preset", ...snapshot(ids, activeId), orderVerified });

test("storage migrates v1 presets as unverified and only explicit confirmation unlocks their order", () => {
  const legacy = JSON.stringify([{ id: "preset-1", name: "Hunt", members: [{ id: "a", name: "A" }, { id: "b", name: "B" }], leaderId: "a", createdAt: 1, updatedAt: 1 }]);
  const storage = memoryStorage({ "ppbui:team-presets:v1": legacy }); let clock = 10;
  const store = createTeamPresetStorage({ storage: () => storage, now: () => ++clock, makeId: () => "new" });
  assert.equal(store.list()[0].activeId, "a"); assert.equal(store.list()[0].orderVerified, false); assert.ok(storage.getItem("ppbui:team-presets:v2"));
  assert.equal(store.moveMember("preset-1", "b", -1), true); assert.deepEqual(store.list()[0].members.map(member => member.id), ["b", "a"]); assert.equal(store.list()[0].orderVerified, false);
  assert.equal(store.confirmOrder("preset-1"), true); assert.equal(store.list()[0].orderVerified, true);
});

test("storage keeps official order, active id and preset ordering independently", () => {
  const storage = memoryStorage(); let clock = 100, id = 0;
  const store = createTeamPresetStorage({ storage: () => storage, now: () => ++clock, makeId: () => `p${++id}` });
  store.upsert("Gym", snapshot(["b", "c", "a"], "a")); store.upsert("PvP", snapshot(["d", "e"], "e"));
  assert.deepEqual(store.list()[0].members.map(member => member.id), ["b", "c", "a"]); assert.equal(store.list()[0].activeId, "a");
  assert.equal(store.movePreset("p2", -1), true); assert.equal(store.list()[0].name, "PvP"); assert.equal(store.setActive("p2", "d"), true); assert.equal(store.list()[0].activeId, "d");
});

test("HUD snapshot uses linked Team member_ids instead of HUD order or a stale cached scene", () => {
  const dom = new JSDOM(`<div class="pokeidle-team-hud"><div class="pokeidle-team-hud__list"><div class="pokeidle-team-card" data-creature-id="a"><span class="pokeidle-team-card__name">Exeggutor</span></div><div class="pokeidle-team-card" data-creature-id="b"><span class="pokeidle-team-card__name">Gyarados</span></div><div class="pokeidle-team-card" data-creature-id="c"><span class="pokeidle-team-card__name">Gengar</span></div><div class="pokeidle-team-card" data-creature-id="d"><span class="pokeidle-team-card__name">Raichu</span></div><div class="pokeidle-team-card" data-creature-id="e"><span class="pokeidle-team-card__name">Primeape</span></div><div class="pokeidle-team-card" data-creature-id="f"><span class="pokeidle-team-card__name">Arcanine</span></div></div></div><div class="pokeidle-team-panel"><div class="pokeidle-panel__body"></div></div>`);
  const root = dom.window.document.querySelector(".pokeidle-team-hud"), body = dom.window.document.querySelector(".pokeidle-panel__body");
  const stale = { _team: { member_ids: ["a", "b", "c", "d", "e", "f"], leader_id: "a" } }, live = { _panel: { body }, _team: { member_ids: ["e", "b", "c", "d", "a", "f"], leader_id: "a" } };
  dom.window.PokeIdle = { PersistentHud: { _teamHud: { el: root, _creatures: [{ id: "a", is_leader: true }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }, { id: "f" }] } }, ReactiveWindows: { cached: () => [stale, live] } };
  const result = currentTeamSnapshot(root);
  assert.deepEqual(result.members.map(member => member.id), ["e", "b", "c", "d", "a", "f"]); assert.equal(result.activeId, "a"); assert.equal(result.orderVerified, true);
  dom.window.close();
});

test("Team HUD Teams panel is collapsed by default and stable reconciliation is mutation-free", async t => {
  const dom = new JSDOM(`<div class="pokeidle-team-hud"><div class="pokeidle-team-hud__list"><div class="pokeidle-team-card" data-creature-id="a"><span class="pokeidle-team-card__name">A</span></div></div></div>`, { pretendToBeVisual: true });
  const root = dom.window.document.body.firstChild; dom.window.PokeIdle = { Localization: { get: () => "pt-BR" }, PersistentHud: { _teamHud: { el: root, _creatures: [{ id: "a", is_leader: true }] } } };
  const store = { list: () => [], reload: () => [], upsert: () => null, replaceSnapshot: () => false, rename: () => false, remove: () => false, movePreset: () => false, moveMember: () => false, setActive: () => false, confirmOrder: () => false, isPersistent: () => true };
  const controller = mountTeamPresets(root, { store, apply: async () => ({ ok: true }), capture: async () => ({ ok: true, snapshot: snapshot(["a"]) }) }); t.after(() => { controller.cleanup(); dom.window.close(); });
  const panel = root.querySelector("[data-ppbui-team-presets-panel]"), toggle = root.querySelector("[data-ppbui-team-presets-toolbar] button"); assert.equal(panel.hidden, true); toggle.click(); assert.equal(panel.hidden, false);
  const seen = []; const observer = new dom.window.MutationObserver(records => seen.push(...records)); observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
  for (let index = 0; index < 5; index++) controller.sync(); await Promise.resolve(); observer.disconnect(); assert.equal(seen.length, 0);
});

test("Team manager renders native-like preset cards at minimum 260x124 and supports manual order maintenance", t => {
  const dom = new JSDOM(`<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"><section class="team-section team-section--roster"></section></div></div>`);
  const root = dom.window.document.body.firstChild, storage = memoryStorage(), store = createTeamPresetStorage({ storage: () => storage, makeId: () => "p1" });
  store.upsert("Gym", snapshot(["a", "b", "c", "d", "e", "f"], "e"));
  const manager = mountTeamPresetManager(root, { store, hudRoot: null, apply: async () => ({ ok: true }), capture: async () => ({ ok: true, snapshot: snapshot(["a"]) }), runExclusive: task => task(), onChange: () => {} });
  t.after(() => { manager.cleanup(); dom.window.close(); });
  const css = root.querySelector('style[data-ppbui-module="team-presets-manager"]').textContent; assert.match(css, /min-width:260px; min-height:124px/); assert.equal(root.querySelectorAll("[data-ppbui-team-preset-member]").length, 6);
  const secondLeft = root.querySelectorAll("[data-ppbui-team-preset-member]")[1].querySelector("button"); secondLeft.click();
  assert.deepEqual(store.list()[0].members.map(member => member.id), ["a", "b", "c", "d", "e", "f"], "selection is presentation-only");
  root.querySelector("[data-ppbui-team-preset-member-controls] button").click(); assert.deepEqual(store.list()[0].members.slice(0, 2).map(member => member.id), ["b", "a"]);
  assert.equal(root.querySelector('[data-ppbui-team-preset-member-visual][aria-pressed="true"]').parentElement, root.querySelector('[data-ppbui-team-preset-member]'));
  root.querySelector('[data-active-control="true"]').click();
  assert.equal(store.list()[0].activeId, "b");
  assert.deepEqual(store.list()[0].members.map(member => member.id), ["b", "a", "c", "d", "e", "f"]);
  assert.equal(root.querySelector('[data-active-control="true"]').disabled, true);
});

function setupTeam({ current = ["a", "b", "c"], active = "a", available = ["d", "e"], delayed = false } = {}) {
  const slots = Array.from({ length: 6 }, (_, index) => `<button class="team-slot"><span>${index + 1}</span></button>`).join("");
  const dom = new JSDOM(`<button data-menu-id="team">Team</button><div class="pokeidle-team-panel"><div class="pokeidle-panel__body"><section class="team-section team-section--roster"><div class="team-slots">${slots}</div></section><section class="team-section team-section--profile"><div class="team-battle-order"><span>Battle order</span><button class="pokeidle-btn order-left">←</button><button class="pokeidle-btn order-right">→</button></div><button class="team-active-state">Active</button></section><div data-ppbui-module="team-presets"><button class="pokeidle-btn rogue-left">←</button></div><div class="team-actions"><button class="pokeidle-btn pokeidle-btn--danger">Remove</button></div></div></div>`, { pretendToBeVisual: true });
  const doc = dom.window.document, root = doc.querySelector(".pokeidle-team-panel"), body = root.querySelector(".pokeidle-panel__body");
  const createMember = id => ({ id, name: id.toUpperCase(), hp: 100, max_hp: 100 });
  const scene = { _panel: { body }, _creatures: current.map(createMember), _available: available.map(createMember), _team: { member_ids: [...current], leader_id: active }, _selectedId: current[0] };
  const activeButton = root.querySelector(".team-active-state"), remove = root.querySelector(".pokeidle-btn--danger"), left = root.querySelector(".order-left"), right = root.querySelector(".order-right"), rogue = root.querySelector(".rogue-left"); let rogueClicks = 0;
  rogue.addEventListener("click", () => rogueClicks++);
  const syncButtons = () => {
    const member = scene._creatures.find(entry => entry.id === scene._selectedId), position = scene._team.member_ids.indexOf(scene._selectedId);
    activeButton.disabled = !member || member.id === scene._team.leader_id || member.hp <= 0; remove.disabled = !member || member.id === scene._team.leader_id || scene._creatures.length <= 1;
    left.disabled = position <= 0; right.disabled = position < 0 || position >= scene._team.member_ids.length - 1;
  };
  root.querySelectorAll(".team-slot").forEach((slot, index) => slot.addEventListener("click", () => { scene._selectedId = scene._creatures[index]?.id || null; syncButtons(); }));
  activeButton.addEventListener("click", () => { if (!activeButton.disabled) scene._team.leader_id = scene._selectedId; syncButtons(); });
  remove.addEventListener("click", () => {
    if (remove.disabled) return; const index = scene._creatures.findIndex(member => member.id === scene._selectedId); if (index < 0) return;
    const [member] = scene._creatures.splice(index, 1);
    const finish = () => { scene._available.push(member); scene._team.member_ids = scene._team.member_ids.filter(id => id !== member.id); scene._selectedId = scene._team.member_ids[0] || null; syncButtons(); };
    if (delayed) dom.window.setTimeout(finish, 90); else finish();
  });
  const move = direction => {
    const index = scene._team.member_ids.indexOf(scene._selectedId), target = index + direction; if (index < 0 || target < 0 || target >= scene._team.member_ids.length) return;
    [scene._team.member_ids[index], scene._team.member_ids[target]] = [scene._team.member_ids[target], scene._team.member_ids[index]];
    scene._creatures.sort((a, b) => scene._team.member_ids.indexOf(a.id) - scene._team.member_ids.indexOf(b.id));
    if (delayed) { scene._orderBusy = true; dom.window.setTimeout(() => { scene._orderBusy = false; syncButtons(); }, 90); }
    syncButtons();
  };
  left.addEventListener("click", () => { if (!left.disabled) move(-1); }); right.addEventListener("click", () => { if (!right.disabled) move(1); });
  scene.requestEquipPicker = () => {
    doc.querySelector(".team-equip-picker")?.remove(); const picker = doc.createElement("div"); picker.className = "team-equip-picker"; const candidates = [...scene._available];
    for (const member of candidates) {
      const card = doc.createElement("button"); card.className = "team-equip-card"; card.textContent = member.name;
      card.addEventListener("click", () => {
        const index = scene._available.findIndex(entry => entry.id === member.id); if (index < 0 || scene._creatures.length >= 6) return;
        const added = scene._available[index]; scene._creatures.push(added); picker.remove();
        const finish = () => { scene._available = scene._available.filter(entry => entry.id !== added.id); scene._team.member_ids.push(added.id); syncButtons(); };
        if (delayed) dom.window.setTimeout(finish, 90); else finish();
      }); picker.append(card);
    }
    doc.body.append(picker);
  };
  const settle = () => new Promise(resolve => dom.window.setTimeout(resolve, delayed ? 90 : 0));
  scene.load = async () => {};
  scene.setLeader = async member => { await settle(); scene._team.leader_id = member.id; syncButtons(); };
  scene.removeMember = async member => {
    scene._creatures = scene._creatures.filter(entry => entry.id !== member.id);
    await settle(); scene._available.push(member);
    scene._team.member_ids = scene._team.member_ids.filter(id => id !== member.id); syncButtons();
  };
  scene.equipFromInventory = async (member, button) => {
    assert.equal(button.disabled, false); button.disabled = true;
    scene._creatures.push(member); await settle();
    scene._available = scene._available.filter(entry => entry.id !== member.id);
    scene._team.member_ids.push(member.id); syncButtons();
  };
  scene.persistOrder = async ids => {
    assert.equal(Boolean(scene._orderBusy), false);
    scene._orderBusy = true; scene._team.member_ids = [...ids]; await settle();
    scene._creatures.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    scene._orderBusy = false; syncButtons();
  };
  dom.window.PokeIdle = { ReactiveWindows: { cached: () => [scene] } }; dom.window.SceneManager = { _scene: scene }; syncButtons();
  return { dom, doc, scene, rogueClicks: () => rogueClicks };
}

test("apply reproduces exact composition, active Pokémon and official battle order using awaited native methods", async t => {
  const s = setupTeam(); t.after(() => s.dom.window.close());
  const result = await applyTeamPreset(s.doc, preset(["e", "b", "d"], "d"));
  assert.equal(result.ok, true); assert.deepEqual(s.scene._team.member_ids, ["e", "b", "d"]); assert.equal(s.scene._team.leader_id, "d"); assert.equal(s.rogueClicks(), 0);
});

test("apply can reorder an unchanged team without confusing active Pokémon with position 1", async t => {
  const s = setupTeam({ current: ["a", "b", "c"], active: "a", available: [] }); t.after(() => s.dom.window.close());
  const result = await applyTeamPreset(s.doc, preset(["c", "a", "b"], "a"));
  assert.equal(result.ok, true); assert.deepEqual(s.scene._team.member_ids, ["c", "a", "b"]); assert.equal(s.scene._team.leader_id, "a");
});

test("full Team can replace its active Pokémon and then restore exact target order", async t => {
  const s = setupTeam({ current: ["a", "b", "c", "d", "e", "f"], active: "a", available: ["g"] }); t.after(() => s.dom.window.close());
  const result = await applyTeamPreset(s.doc, preset(["g", "b", "c", "d", "e", "f"], "g"));
  assert.equal(result.ok, true); assert.deepEqual(s.scene._team.member_ids, ["g", "b", "c", "d", "e", "f"]); assert.equal(s.scene._team.leader_id, "g");
});

test("unverified legacy order and missing members abort before changing native Team state", async t => {
  const s = setupTeam(); t.after(() => s.dom.window.close()); const before = [...s.scene._team.member_ids];
  let result = await applyTeamPreset(s.doc, preset(["b", "a", "c"], "a", false)); assert.equal(result.ok, false); assert.equal(result.reason, "order-unverified"); assert.deepEqual(s.scene._team.member_ids, before);
  result = await applyTeamPreset(s.doc, preset(["a", "z"], "a")); assert.equal(result.ok, false); assert.equal(result.reason, "member-unavailable"); assert.deepEqual(s.scene._team.member_ids, before); assert.equal(s.scene._team.leader_id, "a");
});

test("captured element color survives reload as optional visual metadata", t => {
  const dom = new JSDOM('<div class="pokeidle-team-hud"><div class="pokeidle-team-card" data-creature-id="a" style="--element-color:#68c64a"></div></div>');
  t.after(() => dom.window.close());
  const root = dom.window.document.body.firstChild;
  dom.window.PokeIdle = { PersistentHud: { _teamHud: { el: root, _creatures: [{ id: 'a', name: 'A', elements: ['grass'] }] } } };
  const captured = currentTeamSnapshot(root), storage = memoryStorage();
  assert.equal(captured.members[0].elementColor, '#68c64a');
  const store = createTeamPresetStorage({ storage: () => storage, makeId: () => 'color' });
  store.upsert('Grass', captured);
  assert.equal(createTeamPresetStorage({ storage: () => storage }).list()[0].members[0].elementColor, '#68c64a');
});

test("different-sized presets wait for inventory/order reload and confirmed order persistence", async t => {
  const s = setupTeam({ delayed: true }); t.after(() => s.dom.window.close());
  for (const [ids, leader] of [[["e", "b", "d", "a", "c"], "d"], [["b", "e", "a"], "e"], [["c", "a", "d", "b"], "d"]]) {
    const result = await applyTeamPreset(s.doc, preset(ids, leader));
    assert.equal(result.ok, true, result.reason);
    assert.deepEqual(s.scene._team.member_ids, ids);
    assert.equal(s.scene._team.leader_id, leader);
    assert.equal(Boolean(s.scene._orderBusy), false, "optimistic order is not confirmation");
    assert.equal(s.scene._available.some(member => ids.includes(member.id)), false);
  }
});

test("preflight reloads native inventory before reporting a backpack member missing", async t => {
  const s = setupTeam({ available: [] }); t.after(() => s.dom.window.close());
  let loads = 0;
  s.scene.load = async () => { loads++; s.scene._available = [{ id: "d", name: "D", hp: 100 }]; };
  const result = await applyTeamPreset(s.doc, preset(["d", "a"], "d"));
  assert.equal(result.ok, true, result.reason); assert.equal(loads, 1);
  assert.deepEqual(s.scene._team.member_ids, ["d", "a"]);
});

test("direct apply never clicks slots, profile buttons or opens the backpack picker", async t => {
  const s = setupTeam({ delayed: true }); t.after(() => s.dom.window.close());
  s.dom.window.HTMLElement.prototype.click = () => assert.fail("unexpected simulated click");
  s.scene.requestEquipPicker = () => assert.fail("unexpected picker");
  const result = await applyTeamPreset(s.doc, preset(["e", "b", "d"], "d"));
  assert.equal(result.ok, true, result.reason);
  assert.deepEqual(s.scene._team.member_ids, ["e", "b", "d"]);
});

test("native rejected equip or optimistic order rollback cannot report success", async t => {
  const s = setupTeam(); t.after(() => s.dom.window.close());
  s.scene.equipFromInventory = async () => {};
  let result = await applyTeamPreset(s.doc, preset(["d", "a"], "d"));
  assert.equal(result.ok, false); assert.deepEqual(s.scene._team.member_ids, ["a", "b", "c"]);
  s.scene.persistOrder = async ids => {
    const previous = s.scene._team.member_ids; s.scene._orderBusy = true; s.scene._team.member_ids = ids;
    await new Promise(resolve => setTimeout(resolve, 20));
    s.scene._team.member_ids = previous; s.scene._orderBusy = false;
  };
  result = await applyTeamPreset(s.doc, preset(["c", "b", "a"], "a"));
  assert.equal(result.ok, false); assert.equal(result.reason, "order-final-state-mismatch");
});
