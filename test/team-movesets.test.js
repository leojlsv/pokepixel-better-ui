import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { applyTeamMoveset } from "../src/modules/team-movesets/actions.js";
import { createMoveIcon } from "../src/modules/team-movesets/dom.js";
import { createTeamMovesetStorage } from "../src/modules/team-movesets/storage.js";

const move = (id, name = id) => ({ id, name, element: "ground" });
const four = prefix => [1, 2, 3, 4].map(index => move(`${prefix}${index}`, `${prefix.toUpperCase()} ${index}`));

test("move icon keeps native filename mapping and accepts an already-resolved asset URL", () => {
  const dom=new JSDOM("",{url:"https://pokepixel.nietore.com/play/"}),doc=dom.window.document;
  dom.window.POKEIDLE_MOVE_ICON_MAP={earthquake:"earthquake-icon",preview:"data:image/png;base64,AA=="};
  assert.equal(createMoveIcon(doc,{id:"earthquake"}).getAttribute("src"),"img/moves/earthquake-icon.png");
  assert.equal(createMoveIcon(doc,{id:"preview"}).getAttribute("src"),"data:image/png;base64,AA==");
  dom.window.close();
});

test("Saved Moveset storage scopes presets to the individual creature and rejects ambiguous duplicate loadouts", () => {
  const memory = new Map(), storage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) };
  let id = 0, time = 100;
  const store = createTeamMovesetStorage({ storage: () => storage, makeId: () => `preset-${++id}`, now: () => ++time });
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
test("a preset write that loses browser persistence falls back to session storage semantics", () => {
  const storage = {
    getItem: () => "[]",
    setItem() { throw new Error("denied"); },
  };
  const store = createTeamMovesetStorage({ storage: () => storage, makeId: () => "session-preset" });
  assert.equal(store.isPersistent(), true, "initial read is available before the write failure");
  const saved = store.upsert("b", "Hunt", { moves: four("r") });
  assert.equal(saved.created, true);
  assert.equal(store.isPersistent(), false);
  assert.equal(store.list("b").length, 1, "the in-session preset remains usable after persistence fails");
});
