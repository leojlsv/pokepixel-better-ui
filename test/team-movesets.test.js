import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { applyTeamMoveset } from "../src/modules/team-movesets/actions.js";
import { createMoveIcon } from "../src/modules/team-movesets/dom.js";
import { createTeamMovesetStorage } from "../src/modules/team-movesets/storage.js";

const move = (id, name = id) => ({ id, name, element: "ground" });
const four = prefix => [1, 2, 3, 4].map(index => move(`${prefix}${index}`, `${prefix.toUpperCase()} ${index}`));
const testLocks = { request: async (_name, _options, callback) => callback() };

test("Saved Movesets partition by trainer, suppress unknown owner and never auto-claim unscoped data", async () => {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), values: memory };
  let current = "trainer-a";
  const store = createTeamMovesetStorage({ storage: () => storage, owner: () => current, locks: () => testLocks, makeId: () => "preset-a" });
  assert.equal(store.upsert("creature-1", "A Set", { moves: four("a") })?.created, true);
  current = "trainer-b";
  assert.deepEqual(store.list("creature-1"), []);
  store.upsert("creature-1", "B Set", { moves: four("b") });
  current = "";
  assert.deepEqual(store.list(), []);
  assert.equal(store.upsert("creature-1", "No Owner", { moves: four("n") }), null);
  current = "trainer-a";
  assert.deepEqual(store.list().map(entry => entry.name), ["A Set"]);
  current = "trainer-b";
  assert.deepEqual(store.list().map(entry => entry.name), ["B Set"]);

  const legacy = JSON.stringify([{ id: "legacy", creatureId: "creature-9", name: "Old", moves: four("o") }]);
  storage.setItem("ppbui:team-movesets:v1", legacy);
  assert.equal(store.legacyCount(), 1);
  assert.deepEqual(store.list("creature-9"), []);
  assert.equal(await store.claimLegacy(), true, "explicit import merges without replacing already saved movesets");
  assert.deepEqual(store.list("creature-1").map(entry => entry.name), ["B Set"]);
  assert.equal(store.list("creature-9")[0].name, "Old");
  current = "trainer-c";
  assert.equal(store.legacyCount(), 0);
  assert.deepEqual(store.list("creature-9"), []);
  assert.equal(storage.getItem("ppbui:team-movesets:v1"), legacy);
});

test("duplicate and blank moveset ids are repaired without deleting siblings", () => {
  const raw = JSON.stringify([
    { id: "shared", creatureId: "creature-1", name: "One", moves: four("a") },
    { id: "shared", creatureId: "creature-1", name: "Two", moves: four("b") },
    { id: "", creatureId: "creature-2", name: "Three", moves: four("c") },
  ]);
  const values = new Map([["ppbui:team-movesets:v2:trainer-a", raw]]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
  const store = createTeamMovesetStorage({ storage: () => storage, owner: () => "trainer-a", makeId: () => "shared" });
  const ids = store.list().map(entry => entry.id);
  assert.equal(new Set(ids).size, 3);
  assert.ok(ids.every(Boolean));
  assert.equal(store.remove(ids[0], "creature-1"), true);
  assert.deepEqual(store.list("creature-1").map(entry => entry.name), ["Two"]);
  assert.equal(store.list("creature-2").length, 1);
  assert.equal(store.upsert("creature-2", "Four", { moves: four("d") })?.created, true);
  assert.equal(new Set(store.list().map(entry => entry.id)).size, 3);
});

test("two tabs writing different movesets cannot overwrite each other with stale full-array snapshots", () => {
  const memory = new Map();
  let nested = null;
  const storage = {
    getItem: key => memory.get(key) ?? null, values: memory,
    setItem(key, value) {
      if (nested && key.includes(":entry:")) { const callback = nested; nested = null; callback(); }
      memory.set(key, value);
    },
  };
  const a = createTeamMovesetStorage({ storage: () => storage, owner: () => "trainer-a", makeId: () => "a" });
  const b = createTeamMovesetStorage({ storage: () => storage, owner: () => "trainer-a", makeId: () => "b" });
  nested = () => b.upsert("creature-1", "Second", { moves: four("b") });
  assert.equal(a.upsert("creature-1", "First", { moves: four("a") })?.created, true);
  assert.deepEqual(a.list().map(entry => entry.name).sort(), ["First", "Second"]);
  assert.deepEqual(b.reload().map(entry => entry.name).sort(), ["First", "Second"], "storage event refresh reconciles the other tab");
});

test("moveset storage-denied session-only state survives A→B→A and remains isolated", () => {
  let current = "trainer-a";
  const storage = { getItem: () => null, setItem: () => { throw new Error("denied"); } };
  const store = createTeamMovesetStorage({ storage: () => storage, owner: () => current });
  assert.equal(store.upsert("creature-a", "Session", { moves: four("a") })?.created, true);
  current = "trainer-b";
  assert.deepEqual(store.list(), []);
  current = "trainer-a";
  assert.deepEqual(store.list().map(entry => entry.name), ["Session"]);
});

test("stale same-record Moveset edit is rejected rather than overwriting a second tab", () => {
  const memory = new Map(), disk = {
    values: memory,
    getItem: key => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
  };
  const a = createTeamMovesetStorage({ storage: () => disk, owner: () => "trainer-a", makeId: () => "same" });
  assert.equal(a.upsert("creature-1", "Hunt", { moves: four("a") }).created, true);
  const b = createTeamMovesetStorage({ storage: () => disk, owner: () => "trainer-a" });
  assert.equal(b.replaceSnapshot("same", "creature-1", { moves: four("b") }).ok, true);
  assert.deepEqual(a.replaceSnapshot("same", "creature-1", { moves: four("c") }), { ok: false, reason: "conflict" });
  assert.deepEqual(createTeamMovesetStorage({ storage: () => disk, owner: () => "trainer-a" }).list("creature-1")[0].moves.map(m => m.id), four("b").map(m => m.id));
});

test("Moveset legacy import serializes competing owner claims and rolls back failed write", async () => {
  const memory = new Map([["ppbui:team-movesets:v1", JSON.stringify([{ id: "old", creatureId: "a", name: "Old", moves: four("a") }])]]);
  let failImport = true;
  const storage = {
    getItem: key => memory.get(key) ?? null, values: memory,
    setItem(key, value) {
      if (failImport && key.endsWith(":import")) throw new Error("quota");
      memory.set(key, value);
    },
    removeItem: key => memory.delete(key),
  };
  const locks = {
    queue: Promise.resolve(),
    request(_name, _options, callback) {
      const run = this.queue.then(callback);
      this.queue = run.then(() => undefined, () => undefined);
      return run;
    },
  };
  const a = createTeamMovesetStorage({ storage: () => storage, owner: () => "trainer-a", locks: () => locks });
  const b = createTeamMovesetStorage({ storage: () => storage, owner: () => "trainer-b", locks: () => locks });
  assert.equal(await a.claimLegacy(), false);
  assert.equal(memory.get("ppbui:team-movesets:v2:legacy-claim"), undefined);
  assert.equal(a.legacyCount(), 1);
  failImport = false;
  const outcomes = await Promise.all([a.claimLegacy(), b.claimLegacy()]);
  assert.deepEqual(outcomes, [true, false]);
  assert.equal(a.list().length, 1);
  assert.equal(b.list().length, 0);
  assert.equal(memory.has("ppbui:team-movesets:v2:trainer-b:import"), false);
});

test("move icon keeps native filename mapping and accepts an already-resolved asset URL", () => {
  const dom=new JSDOM("",{url:"https://pokepixel.nietore.com/play/"}),doc=dom.window.document;
  dom.window.POKEIDLE_MOVE_ICON_MAP={earthquake:"earthquake-icon",preview:"data:image/png;base64,AA=="};
  assert.equal(createMoveIcon(doc,{id:"earthquake"}).getAttribute("src"),"img/moves/earthquake-icon.png");
  assert.equal(createMoveIcon(doc,{id:"preview"}).getAttribute("src"),"data:image/png;base64,AA==");
  dom.window.close();
});

test("Saved Moveset storage scopes presets to the individual creature and rejects ambiguous duplicate loadouts", () => {
  const memory = new Map(), storage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value), values: memory };
  let id = 0, time = 100;
  const store = createTeamMovesetStorage({ storage: () => storage, owner: () => "trainer-a", makeId: () => `preset-${++id}`, now: () => ++time });
  const rhydon = { moves: four("r") };
  const first = store.upsert("rhydon-1", "Hunt", rhydon);
  assert.equal(first.created, true);
  assert.equal(store.list("rhydon-1").length, 1);
  assert.equal(store.list("rhydon-2").length, 0, "another Rhydon instance must not inherit this preset");
  const duplicate = store.upsert("rhydon-1", "Boss", rhydon);
  assert.equal(duplicate.duplicateLoadout, true);
  assert.equal(duplicate.preset.name, "Hunt");
  assert.equal(store.list("rhydon-1").length, 1, "identical loadouts stay unambiguous for the active badge");
  const second = store.upsert("rhydon-1", "Boss", { moves: four("x") });
  assert.equal(first.preset.marker, 1);
  assert.equal(second.preset.marker, 2);
  store.remove(first.preset.id, "rhydon-1");
  assert.equal(store.list("rhydon-1")[0].marker, 2, "an existing M# marker is stable when an earlier preset is deleted");
  store.upsert("rhydon-2", "Boss", rhydon);
  assert.equal(store.list("rhydon-2").length, 1, "the same move IDs are valid on a distinct individual");
});

test("apply uses fresh native revision, verifies final ordered moves and emits native moveset.saved exactly once", async () => {
  const emitted = [], before = four("x"), wanted = four("r");
  let state = { creature_id: "b", revision: 8, mode: "manual", selected: before, available: [...before, ...wanted] };
  const win = { PokeIdle: {
    Auth: { getTrainerSummary: () => ({ id: "trainer-a" }), isAuthenticated: () => true },
    Api: {
      async getMoveset() { return structuredClone(state); },
      async saveMoveset(id, body) {
        assert.equal(id, "b");
        assert.deepEqual(body, { mode: "manual", move_ids: wanted.map(entry => entry.id), revision: 8 });
        state = { ...state, revision: 9, selected: wanted };
        return structuredClone(state);
      },
    },
    Bus: { emit: (name, data) => emitted.push([name, data]) },
  } };
  const result = await applyTeamMoveset(win, "b", { moves: wanted });
  assert.equal(result.ok, true);
  assert.deepEqual(result.current.moves.map(entry => entry.id), wanted.map(entry => entry.id));
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0][0], "moveset.saved");
  assert.equal(emitted[0][1].revision, 9);
});

test("apply rejects matching move IDs when the authoritative reread remains in auto mode", async () => {
  const emitted = [], before = four("x"), wanted = four("r");
  let state = { creature_id: "b", revision: 3, mode: "manual", selected: before, available: [...before, ...wanted] };
  const win = { PokeIdle: {
    Auth: { getTrainerSummary: () => ({ id: "trainer-a" }), isAuthenticated: () => true },
    Api: {
      async getMoveset() { return structuredClone(state); },
      async saveMoveset() {
        state = { ...state, revision: 4, mode: "auto", selected: wanted };
        return structuredClone(state);
      },
    },
    Bus: { emit: (...args) => emitted.push(args) },
  } };
  const result = await applyTeamMoveset(win, "b", { moves: wanted });
  assert.deepEqual(result, { ok: false, reason: "final-state-mismatch" });
  assert.equal(emitted.length, 0, "an unconfirmed manual preset must not publish moveset.saved");
});

test("a moveset read resolving after trainer A switches to B cannot write using the shared API instance", async () => {
  let current = "trainer-a", resolveRead;
  const deferredRead = new Promise(resolve => { resolveRead = resolve; });
  const writes = [], win = { PokeIdle: {
    Auth: { getTrainerSummary: () => ({ id: current }), isAuthenticated: () => true },
    Api: {
      getMoveset: () => deferredRead,
      saveMoveset: async (...args) => { writes.push(args); },
    },
  } };
  const pending = applyTeamMoveset(win, "a-001", { moves: four("a") });
  current = "trainer-b";
  resolveRead({ creature_id: "a-001", revision: 1, mode: "manual", selected: four("a"), available: four("a") });
  assert.deepEqual(await pending, { ok: false, reason: "owner-changed" });
  assert.deepEqual(writes, []);
});
test("a preset write that loses browser persistence falls back to session storage semantics", () => {
  const storage = {
    getItem: () => "[]",
    setItem() { throw new Error("denied"); },
  };
  const store = createTeamMovesetStorage({ storage: () => storage, owner: () => "trainer-a", makeId: () => "session-preset" });
  assert.equal(store.isPersistent(), true, "initial read is available before the write failure");
  const saved = store.upsert("b", "Hunt", { moves: four("r") });
  assert.equal(saved.created, true);
  assert.equal(store.isPersistent(), false);
  assert.equal(store.list("b").length, 1, "the in-session preset remains usable after persistence fails");
});
