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
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
    values,
  };
}

const testLocks = { request: async (_name, _options, callback) => callback() };
const snapshot = (ids, activeId = ids[0]) => ({ members: ids.map(id => ({ id, name: id.toUpperCase() })), activeId, orderVerified: true });
const preset = (ids, activeId = ids[0], orderVerified = true) => ({ id: "preset", name: "Preset", ...snapshot(ids, activeId), orderVerified });

test("Saved Teams never cross authenticated trainers, including a reused singleton and unresolved identity", () => {
  const disk = memoryStorage(); let trainer = "trainer-a", counter = 0;
  const store = createTeamPresetStorage({ storage: () => disk, owner: () => trainer, makeId: () => `team-${++counter}` });
  assert.equal(store.upsert("A Gym", snapshot(["A-001"]))?.created, true);
  assert.equal(store.list()[0].members[0].id, "A-001");
  trainer = "";
  assert.deepEqual(store.list(), [], "identity rehydration fails closed");
  assert.equal(store.upsert("Unknown", snapshot(["missing"])), null);
  trainer = "trainer-b";
  assert.deepEqual(store.list(), []);
  store.upsert("B Gym", snapshot(["B-001"]));
  assert.equal(store.list()[0].members[0].id, "B-001");
  trainer = "trainer-a";
  assert.deepEqual(store.list().map(entry => entry.name), ["A Gym"]);
  assert.equal(createTeamPresetStorage({ storage: () => disk, owner: () => "trainer-b" }).list()[0].members[0].id, "B-001");
  assert.equal(disk.getItem("ppbui:team-presets:v2"), null, "unscoped key is never written");
});

test("stale HUD Apply and Save from trainer A are inert before owner-change reconciliation", async t => {
  const dom = new JSDOM(`<div class="pokeidle-team-hud"><div class="pokeidle-team-hud__list"><div class="pokeidle-team-card" data-creature-id="a"><span class="pokeidle-team-card__name">A</span></div></div></div>`, {
    pretendToBeVisual: true, url: "https://pokepixel.nietore.com/play/",
  });
  t.after(() => dom.window.close());
  const root = dom.window.document.querySelector(".pokeidle-team-hud");
  let currentOwner = "trainer-a";
  dom.window.PokeIdle = {
    Auth: { getTrainerSummary: () => ({ id: currentOwner }), isAuthenticated: () => true },
    Localization: { get: () => "en" },
    PersistentHud: { _teamHud: { el: root, _creatures: [{ id: "a", name: "A", is_leader: true }] } },
  };
  const store = createTeamPresetStorage({
    storage: () => dom.window.localStorage,
    owner: () => currentOwner,
    makeId: (() => { let index = 0; return () => `preset-${++index}`; })(),
  });
  store.upsert("A Team", snapshot(["a"]));
  currentOwner = "trainer-b";
  store.upsert("B Team", snapshot(["b"]));
  currentOwner = "trainer-a";
  const applies = [], captures = [];
  const controller = mountTeamPresets(root, {
    store,
    apply: async (_doc, preset) => { applies.push(preset.name); return { ok: true }; },
    capture: async () => { captures.push(currentOwner); return { ok: true, snapshot: snapshot(["b"]) }; },
  });
  t.after(() => controller.cleanup());
  root.querySelector("[data-ppbui-team-presets-toolbar] button").click();
  const staleApply = root.querySelector('[data-ppbui-team-preset-action="apply"]');
  const name = root.querySelector('[name="ppbui-team-presets-save-name"]');
  name.value = "A draft";
  currentOwner = "trainer-b";
  staleApply.click();
  await Promise.resolve();
  assert.deepEqual(applies, [], "A's pre-switch Apply cannot run on trainer B");
  assert.equal(root.querySelector('[data-ppbui-team-presets-name]').textContent, "B Team");
  assert.equal(name.value, "", "switching owners discards the old trainer's draft name");
  name.value = "B draft";
  root.querySelector('[data-ppbui-team-presets-save] > button').click();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(captures, ["trainer-b"]);
  assert.deepEqual(store.list().map(entry => entry.name), ["B Team", "B draft"]);
  assert.equal(currentOwner, "trainer-b");
});

test("observed A→B→A invalidates pending HUD Save and Apply from the first A session", async t => {
  const dom = new JSDOM('<div class="pokeidle-team-hud"><div class="pokeidle-team-hud__list"><div class="pokeidle-team-card" data-creature-id="a"><span class="pokeidle-team-card__name">A</span></div></div></div>', {
    pretendToBeVisual: true, url: "https://pokepixel.nietore.com/play/",
  });
  t.after(() => dom.window.close());
  const root = dom.window.document.body.firstChild, disk = dom.window.localStorage;
  let currentOwner = "trainer-a", resolveCapture, resolveApply;
  const writes = [];
  dom.window.PokeIdle = {
    Auth: { isAuthenticated: () => true, getTrainerSummary: () => ({ id: currentOwner }) },
    Localization: { get: () => "en" },
    PersistentHud: { _teamHud: { el: root, _creatures: [{ id: "a", name: "A", is_leader: true }] } },
  };
  const store = createTeamPresetStorage({ storage: () => disk, owner: () => currentOwner, makeId: () => "team-a" });
  store.upsert("Original", snapshot(["a"]));
  const controller = mountTeamPresets(root, {
    store,
    capture: () => new Promise(resolve => { resolveCapture = resolve; }),
    apply: async (_doc, preset, { isCurrent }) => {
      await new Promise(resolve => { resolveApply = resolve; });
      if (isCurrent()) writes.push(preset.name);
      return { ok: true };
    },
  });
  t.after(() => controller.cleanup());
  root.querySelector(".ppbui-team-presets-toggle").click();
  root.querySelector('[data-ppbui-team-presets-save] input').value = "Stale A save";
  root.querySelector('[data-ppbui-team-presets-save] button').click();
  await Promise.resolve();
  assert.equal(typeof resolveCapture, "function");

  currentOwner = "trainer-b"; controller.sync();
  currentOwner = "trainer-a"; controller.sync();
  resolveCapture({ ok: true, snapshot: snapshot(["other-a"]) });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(store.list().map(entry => entry.name), ["Original"],
    "a capture from the first A session cannot save after an observed B login");

  const applyButton = root.querySelector('[data-ppbui-team-preset-action="apply"]');
  applyButton.click();
  await Promise.resolve();
  assert.equal(typeof resolveApply, "function");
  currentOwner = "trainer-b"; controller.sync();
  currentOwner = "trainer-a"; controller.sync();
  resolveApply();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(writes, [], "old A Apply must not mutate after the observed B session");
});

test("HUD legacy import requires confirmation, preserves original data and only then shows saved Team", async t => {
  const dom = new JSDOM('<div class="pokeidle-team-hud"><div class="pokeidle-team-hud__list"></div></div>', {
    pretendToBeVisual: true, url: "https://pokepixel.nietore.com/play/",
  });
  t.after(() => dom.window.close());
  const root = dom.window.document.querySelector(".pokeidle-team-hud"), disk = dom.window.localStorage;
  const legacy = JSON.stringify([{ id: "old", name: "Old Hunt", ...snapshot(["a"]) }]);
  disk.setItem("ppbui:team-presets:v2", legacy);
  dom.window.PokeIdle = {
    Auth: { getTrainerSummary: () => ({ id: "trainer-a" }), isAuthenticated: () => true },
    Localization: { get: () => "en" },
  };
  const store = createTeamPresetStorage({ storage: () => disk, owner: () => "trainer-a", locks: () => testLocks });
  let confirmations = 0;
  dom.window.confirm = () => { confirmations++; return confirmations > 1; };
  const mounted = mountTeamPresets(root, { store });
  t.after(() => mounted.cleanup());
  root.querySelector("[data-ppbui-team-presets-toolbar] button").click();
  const importButton = root.querySelector("[data-ppbui-team-presets-import-legacy]");
  assert.equal(importButton.hidden, false);
  assert.deepEqual(store.list(), []);
  importButton.click();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(confirmations, 1);
  assert.deepEqual(store.list(), [], "declining import must leave all owner records untouched");
  importButton.click();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(confirmations, 2);
  assert.deepEqual(store.list().map(entry => entry.name), ["Old Hunt"]);
  assert.equal(root.querySelector("[data-ppbui-team-presets-name]")?.textContent, "Old Hunt");
  assert.equal(importButton.hidden, true);
  assert.equal(disk.getItem("ppbui:team-presets:v2"), legacy);
});

test("unassigned legacy Teams require explicit one-owner import and preserve the original bytes", async () => {
  const legacy = JSON.stringify([{ id: "legacy", name: "Old", ...snapshot(["A-001"]) }]);
  const disk = memoryStorage({ "ppbui:team-presets:v2": legacy });
  const a = createTeamPresetStorage({ storage: () => disk, owner: () => "trainer-a", locks: () => testLocks });
  const b = createTeamPresetStorage({ storage: () => disk, owner: () => "trainer-b", locks: () => testLocks });
  assert.deepEqual(a.list(), []); assert.deepEqual(b.list(), []);
  assert.equal(a.legacyCount(), 1); assert.equal(await a.claimLegacy(), true);
  assert.equal(b.legacyCount(), 0); assert.equal(await b.claimLegacy(), false);
  assert.deepEqual(b.list(), []); assert.equal(a.list()[0].name, "Old");
  assert.equal(disk.getItem("ppbui:team-presets:v2"), legacy, "original unscoped data is never destroyed");
});

test("corrupted and duplicate Team ids are recovered so removal affects one preset only", () => {
  const disk = memoryStorage({
    "ppbui:team-presets:v3:trainer-a": JSON.stringify([
      { id: "", name: "No ID", ...snapshot(["a"]) },
      { id: "same", name: "First", ...snapshot(["b"]) },
      { id: "same", name: "Second", ...snapshot(["c"]) },
    ]),
  });
  const store = createTeamPresetStorage({ storage: () => disk, owner: () => "trainer-a", makeId: () => "same" });
  const before = store.list();
  assert.equal(new Set(before.map(entry => entry.id)).size, 3);
  assert.ok(before.every(entry => entry.id));
  assert.equal(store.remove(before[1].id), true);
  assert.deepEqual(store.list().map(entry => entry.name), ["No ID", "Second"]);
  assert.equal(store.upsert("Third", snapshot(["d"]))?.created, true);
  assert.equal(new Set(store.list().map(entry => entry.id)).size, 3, "new IDs cannot reuse an existing id");
  assert.deepEqual(createTeamPresetStorage({ storage: () => disk, owner: () => "trainer-a" }).list().map(entry => entry.name), ["No ID", "Second", "Third"]);
});

test("separate tabs cannot overwrite a distinct Team save even when writes interleave", () => {
  const disk = memoryStorage(); let nested = null;
  const underlyingSet = disk.setItem;
  disk.setItem = (key, value) => {
    if (nested && key.includes(":entry:")) { const callback = nested; nested = null; callback(); }
    underlyingSet(key, value);
  };
  const a = createTeamPresetStorage({ storage: () => disk, owner: () => "trainer-a", makeId: () => "id-a" });
  const b = createTeamPresetStorage({ storage: () => disk, owner: () => "trainer-a", makeId: () => "id-b" });
  nested = () => b.upsert("Second", snapshot(["B"]));
  assert.equal(a.upsert("First", snapshot(["A"]))?.created, true);
  const expected = ["First", "Second"];
  assert.deepEqual(a.list().map(entry => entry.name).sort(), expected);
  assert.deepEqual(b.reload().map(entry => entry.name).sort(), expected, "another tab's storage event reload picks up the first tab");
  assert.deepEqual(createTeamPresetStorage({ storage: () => disk, owner: () => "trainer-a" }).list().map(entry => entry.name).sort(), expected);
});

test("a storage-denied Team draft survives A→B→A without being exposed to B", () => {
  const disk = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
  let current = "trainer-a";
  const store = createTeamPresetStorage({ storage: () => disk, owner: () => current });
  assert.equal(store.upsert("Session A", snapshot(["A"]))?.created, true);
  assert.equal(store.isPersistent(), false);
  current = "trainer-b";
  assert.deepEqual(store.list(), []);
  current = "trainer-a";
  assert.deepEqual(store.list().map(entry => entry.name), ["Session A"]);
});

test("Team legacy claim refuses unprotected cross-tab adoption and can retry quota failure", async () => {
  const legacy = JSON.stringify([{ id: "legacy", name: "Old", ...snapshot(["A"]) }]);
  const existing = JSON.stringify([{ id: "current", name: "New", ...snapshot(["B"]) }]);
  const disk = memoryStorage({
    "ppbui:team-presets:v2": legacy,
    "ppbui:team-presets:v3:trainer-a": existing,
  });
  const noLocks = createTeamPresetStorage({ storage: () => disk, owner: () => "trainer-a", locks: () => null });
  assert.equal(await noLocks.claimLegacy(), false, "missing Web Locks must not leak legacy to a second trainer");
  assert.equal(disk.getItem("ppbui:team-presets:v3:legacy-claim"), null);
  let failImport = true;
  const set = disk.setItem;
  disk.setItem = (key, value) => {
    if (failImport && key.endsWith(":import")) throw new Error("storage quota");
    set(key, value);
  };
  const store = createTeamPresetStorage({ storage: () => disk, owner: () => "trainer-a", locks: () => testLocks });
  assert.equal(await store.claimLegacy(), false);
  assert.equal(disk.getItem("ppbui:team-presets:v3:legacy-claim"), null, "failed import must release claim even if scoped data exists");
  assert.equal(store.legacyCount(), 1);
  failImport = false;
  assert.equal(await store.claimLegacy(), true);
  assert.deepEqual(store.list().map(entry => entry.name).sort(), ["New", "Old"]);
  assert.equal(disk.getItem("ppbui:team-presets:v2"), legacy);
});

test("Team legacy v1 remains importable when ownerless v2 exists but is empty", async () => {
  const old = JSON.stringify([{ id: "legacy", name: "Fallback", members: [{ id: "a" }], leaderId: "a" }]);
  const disk = memoryStorage({ "ppbui:team-presets:v2": "[]", "ppbui:team-presets:v1": old });
  const store = createTeamPresetStorage({ storage: () => disk, owner: () => "trainer-a", locks: () => testLocks });
  assert.equal(store.legacyCount(), 1);
  assert.equal(await store.claimLegacy(), true);
  assert.equal(store.list()[0].name, "Fallback");
  assert.equal(store.list()[0].orderVerified, false);
});

test("malformed ownerless v2 does not permanently hide a valid v1 legacy backup", async () => {
  const originalCorrupt = '{"bad":';
  const v1 = JSON.stringify([{ id: "old", name: "Recovered", members: [{ id: "a" }], leaderId: "a" }]);
  const disk = memoryStorage({ "ppbui:team-presets:v2": originalCorrupt, "ppbui:team-presets:v1": v1 });
  const store = createTeamPresetStorage({ storage: () => disk, owner: () => "trainer-a", locks: () => testLocks });
  assert.equal(store.legacyCount(), 1);
  assert.equal(await store.claimLegacy(), true);
  assert.deepEqual(store.list().map(entry => [entry.name, entry.orderVerified]), [["Recovered", false]]);
  assert.equal(disk.getItem("ppbui:team-presets:v2"), originalCorrupt, "corrupt newer bytes remain untouched");
});

test("stale same-record Team edit cannot overwrite another tab's saved rename", () => {
  const disk = memoryStorage(), owner = () => "trainer-a";
  const a = createTeamPresetStorage({ storage: () => disk, owner, makeId: () => "same" });
  a.upsert("Original", snapshot(["a"]));
  const b = createTeamPresetStorage({ storage: () => disk, owner });
  assert.equal(b.rename("same", "Renamed in B"), true);
  assert.equal(a.updatePreset("same", "Original", snapshot(["b"])), null, "A stale editor must be rejected");
  assert.deepEqual(createTeamPresetStorage({ storage: () => disk, owner }).list().map(entry => [entry.name, entry.members[0].id]), [["Renamed in B", "a"]]);
});

test("storage migrates v1 presets as unverified and only explicit confirmation unlocks their order", async () => {
  const legacy = JSON.stringify([{ id: "preset-1", name: "Hunt", members: [{ id: "a", name: "A" }, { id: "b", name: "B" }], leaderId: "a", createdAt: 1, updatedAt: 1 }]);
  const storage = memoryStorage({ "ppbui:team-presets:v1": legacy }); let clock = 10;
  const store = createTeamPresetStorage({ storage: () => storage, owner: () => "trainer-a", locks: () => testLocks, now: () => ++clock, makeId: () => "new" });
  assert.equal(store.list().length, 0, "an ownerless legacy record must not be shown to an arbitrary trainer");
  assert.equal(store.legacyCount(), 1);
  assert.equal(await store.claimLegacy(), true, "legacy import requires explicit action");
  assert.equal(store.list()[0].activeId, "a"); assert.equal(store.list()[0].orderVerified, false);
  assert.ok(storage.getItem("ppbui:team-presets:v3:trainer-a:import"));
  const importedId = store.list()[0].id;
  assert.equal(store.moveMember(importedId, "b", -1), true); assert.deepEqual(store.list()[0].members.map(member => member.id), ["b", "a"]); assert.equal(store.list()[0].orderVerified, false);
  assert.equal(store.confirmOrder(importedId), true); assert.equal(store.list()[0].orderVerified, true);
});

test("storage keeps official order, active id and preset ordering independently", () => {
  const storage = memoryStorage(); let clock = 100, id = 0;
  const store = createTeamPresetStorage({ storage: () => storage, owner: () => "trainer-a", now: () => ++clock, makeId: () => `p${++id}` });
  store.upsert("Gym", snapshot(["b", "c", "a"], "a")); store.upsert("PvP", snapshot(["d", "e"], "e"));
  assert.deepEqual(store.list()[0].members.map(member => member.id), ["b", "c", "a"]); assert.equal(store.list()[0].activeId, "a");
  assert.equal(store.movePreset("p2", -1), true); assert.equal(store.list()[0].name, "PvP"); assert.equal(store.setActive("p2", "d"), true); assert.equal(store.list()[0].activeId, "d");
});

test("storage edits an existing preset atomically by id without name-based upsert ambiguity", () => {
  const storage = memoryStorage(); let clock = 200, id = 0;
  const store = createTeamPresetStorage({ storage: () => storage, owner: () => "trainer-a", now: () => ++clock, makeId: () => `p${++id}` });
  store.upsert("Gym", snapshot(["a", "b"], "a")); store.upsert("PvP", snapshot(["c", "d"], "c"));
  const before = store.list()[0];
  const updated = store.updatePreset("p1", "Gym edited", snapshot(["b", "e", "a"], "e"));
  assert.equal(updated.id, "p1"); assert.equal(updated.name, "Gym edited"); assert.equal(updated.createdAt, before.createdAt); assert.ok(updated.updatedAt > before.updatedAt);
  assert.deepEqual(updated.members.map(member => member.id), ["b", "e", "a"]); assert.equal(updated.activeId, "e"); assert.equal(updated.orderVerified, true);
  assert.equal(store.updatePreset("p1", "PvP", snapshot(["a"], "a")), null, "editing cannot collide with another preset name");
  assert.deepEqual(store.list()[0].members.map(member => member.id), ["b", "e", "a"], "a rejected edit must not partially replace the snapshot");
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

test("Team manager fills the available workspace and supports manual order maintenance", async t => {
  const dom = new JSDOM(`<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"><section class="team-section team-section--roster"></section></div></div>`);
  const root = dom.window.document.body.firstChild, storage = memoryStorage(), store = createTeamPresetStorage({ storage: () => storage, owner: () => "trainer-a", makeId: () => "p1" });
  store.upsert("Gym", snapshot(["a", "b", "c", "d", "e", "f"], "e"));
  const manager = mountTeamPresetManager(root, { store, hudRoot: null, apply: async () => ({ ok: true }), capture: async () => ({ ok: true, snapshot: snapshot(["a"]) }), runExclusive: task => task(), onChange: () => {} });
  t.after(() => { manager.cleanup(); dom.window.close(); });
  const css = root.querySelector('style[data-ppbui-module="team-presets-manager"]').textContent; assert.match(css, /min-width:min\(340px,calc\(100vw - 16px\)\)!important/); assert.match(css, /\[data-ppbui-team-preset-card\] \{[^}]*width:100%[^}]*max-width:none[^}]*padding:0/s); assert.match(css, /\[data-ppbui-team-preset-members\] \{[^}]*gap:0/s); assert.match(css, /border-radius:var\(--ppbui-radius\)!important/); assert.doesNotMatch(css, /--ui-/); assert.equal(root.querySelectorAll("[data-ppbui-team-preset-member]").length, 6);
  const secondLeft = root.querySelectorAll("[data-ppbui-team-preset-member]")[1].querySelector("button"); secondLeft.click();
  assert.deepEqual(store.list()[0].members.map(member => member.id), ["a", "b", "c", "d", "e", "f"], "selection is presentation-only");
  root.querySelector("[data-ppbui-team-preset-member-controls] button").click();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(store.list()[0].members.slice(0, 2).map(member => member.id), ["b", "a"]);
  assert.equal(root.querySelector('[data-ppbui-team-preset-member-visual][aria-pressed="true"]').parentElement, root.querySelector('[data-ppbui-team-preset-member]'));
  root.querySelector('[data-active-control="true"]').click();
  await new Promise(resolve => setTimeout(resolve, 0));
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
  dom.window.PokeIdle = {
    Auth: { getTrainerSummary: () => ({ id: "trainer-a" }), isAuthenticated: () => true },
    ReactiveWindows: { cached: () => [scene] }, Bus: { emit() {} },
    Api: {
      async getTeam() { await scene.load(); return { team: structuredClone(scene._team) }; },
      async getCreatures(location) { return { data: structuredClone(location === "team" ? scene._creatures : scene._available) }; },
      async setTeamLeader(id) { await scene.setLeader(scene._creatures.find(member => member.id === id)); return {}; },
      async removeTeamMember(id) { await scene.removeMember(scene._creatures.find(member => member.id === id)); return {}; },
      async addTeamMember(id) { await scene.equipFromInventory(scene._available.find(member => member.id === id), doc.createElement("button")); return {}; },
      async setTeamOrder(ids) { await scene.persistOrder(ids); return {}; },
    },
  }; dom.window.SceneManager = { _scene: scene }; syncButtons();
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
  const store = createTeamPresetStorage({ storage: () => storage, owner: () => "trainer-a", makeId: () => 'color' });
  store.upsert('Grass', captured);
  assert.equal(createTeamPresetStorage({ storage: () => storage, owner: () => "trainer-a" }).list()[0].members[0].elementColor, '#68c64a');
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
  s.scene.load = async () => { loads++; if (loads === 1) s.scene._available = [{ id: "d", name: "D", hp: 100 }]; };
  const result = await applyTeamPreset(s.doc, preset(["d", "a"], "d"));
  assert.equal(result.ok, true, result.reason); assert.ok(loads >= 1);
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

test("HUD-only apply uses PokemonCard API flow without a Team scene or window", async t => {
  const s = setupTeam(); t.after(() => s.dom.window.close());
  s.doc.body.replaceChildren(); s.dom.window.SceneManager = {};
  s.dom.window.PokeIdle.ReactiveWindows.cached = () => [];
  const events = []; s.dom.window.PokeIdle.Bus.emit = (event, payload) => events.push({event, payload});
  s.dom.window.HTMLElement.prototype.click = () => assert.fail("must not open Team");
  const result = await applyTeamPreset(s.doc, preset(["e", "b", "d"], "d"));
  assert.equal(result.ok, true, result.reason);
  assert.deepEqual(s.scene._team.member_ids, ["e", "b", "d"]);
  assert.equal(s.scene._team.leader_id, "d");
  assert.equal(s.doc.body.children.length, 0);
  assert.ok(events.some(({payload}) => payload.added_creature?.id === "d" && payload.added_creature.equipped));
  assert.ok(events.some(({payload}) => payload.removed_creature?.id === "a" && payload.removed_creature.location === "inventory"));
  assert.ok(events.some(({payload}) => payload.leader_id === "d"));
  assert.ok(events.some(({payload}) => payload.member_ids?.join() === "e,b,d"));
});
