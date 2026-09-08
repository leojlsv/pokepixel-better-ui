import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { applyTeamPreset } from "../src/modules/team-presets/actions.js";
import { mountTeamPresets } from "../src/modules/team-presets/controller.js";
import { currentTeamSnapshot } from "../src/modules/team-presets/dom.js";
import { createTeamPresetStorage } from "../src/modules/team-presets/storage.js";

function memoryStorage(initial = null) {
  const values = new Map(initial ? [["ppbui:team-presets:v1", initial]] : []);
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test("preset storage upserts by name, renames and removes without losing instance ids", () => {
  const storage = memoryStorage(); let clock = 100;
  const store = createTeamPresetStorage({ storage: () => storage, now: () => ++clock, makeId: () => "preset-1" });
  const first = store.upsert("Hunt", { members: [{ id: "a", name: "Pikachu" }, { id: "b", name: "Gastly" }], leaderId: "a" });
  assert.equal(first.created, true); assert.equal(store.list()[0].leaderId, "a");
  const updated = store.upsert("hunt", { members: [{ id: "c", name: "Bulbasaur" }], leaderId: "c" });
  assert.equal(updated.created, false); assert.equal(store.list().length, 1); assert.deepEqual(store.list()[0].members.map(member => member.id), ["c"]);
  assert.equal(store.rename("preset-1", "Boss"), true); assert.equal(store.list()[0].name, "Boss");
  assert.equal(store.remove("preset-1"), true); assert.deepEqual(store.list(), []);
});

test("HUD snapshot keeps creature instance ids and current leader", () => {
  const dom = new JSDOM(`<div class="pokeidle-team-hud"><div class="pokeidle-team-hud__list"><div class="pokeidle-team-card" data-creature-id="a"><span class="pokeidle-team-card__name">Pikachu</span></div><div class="pokeidle-team-card" data-creature-id="b"><span class="pokeidle-team-card__name">Gastly</span></div></div></div>`);
  const root = dom.window.document.body.firstChild;
  dom.window.PokeIdle = { PersistentHud: { _teamHud: { el: root, _creatures: [{ id: "a" }, { id: "b", is_leader: true }] } } };
  assert.deepEqual(currentTeamSnapshot(root), { members: [{ id: "a", name: "Pikachu" }, { id: "b", name: "Gastly" }], leaderId: "b" });
  dom.window.close();
});

test("stable Team preset reconciliation is mutation-free", async t => {
  const dom = new JSDOM(`<div class="pokeidle-team-hud"><div class="pokeidle-team-hud__list"><div class="pokeidle-team-card" data-creature-id="a"><span class="pokeidle-team-card__name">Pikachu</span></div></div></div>`, { pretendToBeVisual: true });
  const root = dom.window.document.body.firstChild; dom.window.PokeIdle = { Localization: { get: () => "pt-BR" }, PersistentHud: { _teamHud: { el: root, _creatures: [{ id: "a", is_leader: true }] } } };
  const store = { list: () => [], reload: () => [], upsert: () => null, rename: () => false, remove: () => false, isPersistent: () => true };
  const controller = mountTeamPresets(root, { store, apply: async () => ({ ok: true }) }); t.after(() => { controller.cleanup(); dom.window.close(); });
  const seen = []; const observer = new dom.window.MutationObserver(records => seen.push(...records)); observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
  for (let index = 0; index < 5; index++) controller.sync(); await Promise.resolve(); observer.disconnect();
  assert.equal(seen.length, 0, seen.map(record => `${record.type}:${record.attributeName || record.target.nodeName}`).join(","));
});

function setupTeam({ current = ["a", "b", "c"], leader = "a", available = ["d", "e"] } = {}) {
  const slots = Array.from({ length: 6 }, (_, index) => `<button class="team-slot"><span>${index + 1}</span></button>`).join("");
  const dom = new JSDOM(`<button data-menu-id="team">Team</button><div class="pokeidle-team-panel"><div class="pokeidle-panel__body"><div class="team-slots">${slots}</div><button class="team-active-state">Active</button><div class="team-actions"><button class="pokeidle-btn pokeidle-btn--danger">Remove</button></div></div></div>`, { pretendToBeVisual: true });
  const doc = dom.window.document, root = doc.querySelector(".pokeidle-team-panel"), body = root.querySelector(".pokeidle-panel__body");
  const createMember = id => ({ id, name: id.toUpperCase(), hp: 100, max_hp: 100 });
  const scene = {
    _panel: { body }, _creatures: current.map(createMember), _available: available.map(createMember),
    _team: { member_ids: [...current], leader_id: leader }, _selectedId: current[0],
  };
  const active = root.querySelector(".team-active-state"), remove = root.querySelector(".pokeidle-btn--danger");
  const syncButtons = () => {
    const member = scene._creatures.find(entry => entry.id === scene._selectedId);
    active.disabled = !member || member.id === scene._team.leader_id || member.hp <= 0;
    remove.disabled = !member || member.id === scene._team.leader_id || scene._creatures.length <= 1;
  };
  root.querySelectorAll(".team-slot").forEach((slot, index) => slot.addEventListener("click", () => { scene._selectedId = scene._creatures[index]?.id || null; syncButtons(); }));
  active.addEventListener("click", () => { if (!active.disabled) scene._team.leader_id = scene._selectedId; syncButtons(); });
  remove.addEventListener("click", () => {
    if (remove.disabled) return;
    const index = scene._creatures.findIndex(member => member.id === scene._selectedId);
    if (index < 0) return;
    const [member] = scene._creatures.splice(index, 1); scene._available.push(member); scene._team.member_ids = scene._creatures.map(entry => entry.id); scene._selectedId = scene._creatures[0]?.id || null; syncButtons();
  });
  scene.requestEquipPicker = () => {
    doc.querySelector(".team-equip-picker")?.remove();
    const picker = doc.createElement("div"); picker.className = "team-equip-picker";
    const snapshot = [...scene._available];
    for (const member of snapshot) {
      const card = doc.createElement("button"); card.className = "team-equip-card"; card.textContent = member.name;
      card.addEventListener("click", () => {
        const index = scene._available.findIndex(entry => entry.id === member.id);
        if (index < 0 || scene._creatures.length >= 6) return;
        const [added] = scene._available.splice(index, 1); scene._creatures.push(added); scene._team.member_ids = scene._creatures.map(entry => entry.id); picker.remove(); syncButtons();
      });
      picker.append(card);
    }
    doc.body.append(picker);
  };
  dom.window.PokeIdle = { ReactiveWindows: { cached: () => [scene] } }; dom.window.SceneManager = { _scene: scene }; syncButtons();
  return { dom, doc, scene };
}

const preset = (ids, leader) => ({ name: "Preset", members: ids.map(id => ({ id, name: id.toUpperCase() })), leaderId: leader });

test("apply preset uses native Team actions sequentially and reaches exact membership and leader", async t => {
  const s = setupTeam(); t.after(() => s.dom.window.close());
  const result = await applyTeamPreset(s.doc, preset(["b", "d", "e"], "d"));
  assert.equal(result.ok, true); assert.deepEqual(new Set(s.scene._creatures.map(member => member.id)), new Set(["b", "d", "e"])); assert.equal(s.scene._team.leader_id, "d");
});

test("full Team can replace its current leader through a temporary retained leader", async t => {
  const s = setupTeam({ current: ["a", "b", "c", "d", "e", "f"], leader: "a", available: ["g"] }); t.after(() => s.dom.window.close());
  const result = await applyTeamPreset(s.doc, preset(["b", "c", "d", "e", "f", "g"], "g"));
  assert.equal(result.ok, true); assert.deepEqual(new Set(s.scene._creatures.map(member => member.id)), new Set(["b", "c", "d", "e", "f", "g"])); assert.equal(s.scene._team.leader_id, "g");
});

test("missing preset member aborts before changing native Team state", async t => {
  const s = setupTeam(); t.after(() => s.dom.window.close()); const before = s.scene._creatures.map(member => member.id);
  const result = await applyTeamPreset(s.doc, preset(["a", "z"], "a"));
  assert.equal(result.ok, false); assert.equal(result.reason, "member-unavailable"); assert.deepEqual(s.scene._creatures.map(member => member.id), before); assert.equal(s.scene._team.leader_id, "a");
});
