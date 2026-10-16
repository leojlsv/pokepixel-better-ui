import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createTeamPresetStorage } from "../src/modules/team-presets/storage.js";
import { createTeamMovesetStorage } from "../src/modules/team-movesets/storage.js";
import { readScopedRecords, trainerStorageKey } from "../src/core/trainer-storage-scope.js";

const team = id => ({ members: [{ id, name: id }], activeId: id, orderVerified: true });
const moves = id => ({ moves: [{ id, name: id }] });
const testLocks = { request: async (_key, _options, callback) => callback() };

test("native Storage.length/key enumeration reconstructs Team entries and tombstones", t => {
  const dom = new JSDOM("", { url: "https://pokepixel.nietore.com/play/" });
  t.after(() => dom.window.close());
  const target = dom.window.localStorage, owner = () => "trainer-a";
  const store = createTeamPresetStorage({ storage: () => target, owner, makeId: (() => {
    let id = 0; return () => `team-${++id}`;
  })() });
  store.upsert("One", team("a")); store.upsert("Two", team("b"));
  assert.deepEqual(store.list().map(entry => entry.name), ["One", "Two"]);
  assert.equal(target.getItem("ppbui:team-presets:v3:trainer-a"), null, "new data is written as per-entry records");
  assert.ok(target.key(0), "native DOM Storage exposes standard key enumeration");
  assert.equal(store.remove(store.list()[0].id), true);
  assert.deepEqual(createTeamPresetStorage({ storage: () => target, owner }).list().map(entry => entry.name), ["Two"]);
  assert.deepEqual(readScopedRecords(target, trainerStorageKey("ppbui:team-presets:v3:", owner()), records => records).map(item => item.name), ["Two"]);
});

test("native Storage enumerates Moveset entries without borrowing other owners", t => {
  const dom = new JSDOM("", { url: "https://pokepixel.nietore.com/play/" });
  t.after(() => dom.window.close());
  const disk = dom.window.localStorage;
  const storeA = createTeamMovesetStorage({ storage: () => disk, owner: () => "trainer-a", makeId: () => "A" });
  const storeB = createTeamMovesetStorage({ storage: () => disk, owner: () => "trainer-b", makeId: () => "B" });
  storeA.upsert("creature-1", "A", moves("thunder"));
  storeB.upsert("creature-1", "B", moves("flame"));
  assert.deepEqual(createTeamMovesetStorage({ storage: () => disk, owner: () => "trainer-a" }).list("creature-1").map(x => x.name), ["A"]);
  assert.deepEqual(createTeamMovesetStorage({ storage: () => disk, owner: () => "trainer-b" }).list("creature-1").map(x => x.name), ["B"]);
});

test("real DOM Storage legacy claim is explicit and owner-exclusive with Web Locks", async t => {
  const dom = new JSDOM("", { url: "https://pokepixel.nietore.com/play/" });
  t.after(() => dom.window.close());
  const disk = dom.window.localStorage, old = JSON.stringify([{ id: "legacy", name: "Old", ...team("owned-by-a") }]);
  disk.setItem("ppbui:team-presets:v2", old);
  const a = createTeamPresetStorage({ storage: () => disk, owner: () => "trainer-a", locks: () => testLocks });
  const b = createTeamPresetStorage({ storage: () => disk, owner: () => "trainer-b", locks: () => testLocks });
  assert.deepEqual(b.list(), []);
  assert.equal(await a.claimLegacy(), true);
  assert.equal(await b.claimLegacy(), false);
  assert.equal(disk.getItem("ppbui:team-presets:v2"), old, "unscoped original is not changed");
  assert.deepEqual(a.list().map(x => x.name), ["Old"]);
  assert.deepEqual(b.list(), []);
});

test("malformed owner record is protected instead of replaced", t => {
  const dom = new JSDOM("", { url: "https://pokepixel.nietore.com/play/" });
  t.after(() => dom.window.close());
  const disk = dom.window.localStorage, key = "ppbui:team-presets:v3:trainer-a:entry:bad";
  disk.setItem(key, "not-json");
  const store = createTeamPresetStorage({ storage: () => disk, owner: () => "trainer-a" });
  assert.equal(store.isPersistent(), false);
  assert.deepEqual(store.list(), []);
  assert.equal(store.upsert("Session", team("a"))?.created, true);
  assert.equal(disk.getItem(key), "not-json", "malformed disk data is preserved");
  assert.equal(store.isPersistent(), false);
});

test("a post-import identity error never releases a committed Team legacy claim to another trainer", async () => {
  const data = new Map([["ppbui:team-presets:v2", JSON.stringify([{ id: "legacy", name: "Legacy", ...team("A-001") }])]]);
  let ownerBroken = false;
  const disk = {
    values: data, getItem: key => data.get(key) ?? null,
    setItem(key, value) {
      data.set(key, value);
      if (key.endsWith(":import")) ownerBroken = true;
    },
    removeItem: key => data.delete(key),
  };
  const a = createTeamPresetStorage({
    storage: () => disk,
    locks: () => testLocks,
    owner: () => { if (ownerBroken) throw new Error("owner rehydration failed"); return "trainer-a"; },
  });
  const b = createTeamPresetStorage({ storage: () => disk, locks: () => testLocks, owner: () => "trainer-b" });
  assert.equal(await a.claimLegacy(), false, "a failed final identity check must not report success");
  assert.equal(data.get("ppbui:team-presets:v3:legacy-claim"), "trainer-a");
  assert.ok(data.has("ppbui:team-presets:v3:trainer-a:import"));
  assert.equal(await b.claimLegacy(), false);
  assert.deepEqual(b.list(), []);
});

test("a post-import identity error never releases a committed Moveset legacy claim to another trainer", async () => {
  const data = new Map([["ppbui:team-movesets:v1", JSON.stringify([{
    id: "legacy", name: "Legacy", creatureId: "A-001", ...moves("thunder"),
  }])]]);
  let ownerBroken = false;
  const disk = {
    values: data, getItem: key => data.get(key) ?? null,
    setItem(key, value) {
      data.set(key, value);
      if (key.endsWith(":import")) ownerBroken = true;
    },
    removeItem: key => data.delete(key),
  };
  const a = createTeamMovesetStorage({
    storage: () => disk, locks: () => testLocks,
    owner: () => { if (ownerBroken) throw new Error("owner rehydration failed"); return "trainer-a"; },
  });
  const b = createTeamMovesetStorage({ storage: () => disk, locks: () => testLocks, owner: () => "trainer-b" });
  assert.equal(await a.claimLegacy(), false);
  assert.equal(data.get("ppbui:team-movesets:v2:legacy-claim"), "trainer-a");
  assert.ok(data.has("ppbui:team-movesets:v2:trainer-a:import"));
  assert.equal(await b.claimLegacy(), false);
  assert.deepEqual(b.list(), []);
});

const queuedLocks = () => {
  const pending = new Map();
  return {
    request(name, _options, callback) {
      const started = (pending.get(name) || Promise.resolve()).then(callback);
      pending.set(name, started.then(() => undefined, () => undefined));
      return started;
    },
  };
};

const testDisk = () => {
  const values = new Map();
  return {
    values,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
};

test("Web Locks serialize competing same-record Team edits and reject the stale winner", async () => {
  const disk = testDisk(), locks = queuedLocks(), owner = () => "trainer-a";
  const create = () => createTeamPresetStorage({
    storage: () => disk, owner, makeId: () => "id", mutationLocks: () => locks,
  });
  const firstTab = create();
  assert.equal((await firstTab.upsert("Original", team("a"))).created, true);
  const secondTab = create();
  const baseline = firstTab.list()[0];
  const [first, second] = await Promise.all([
    firstTab.updatePreset("id", "First edit", team("b"), baseline),
    secondTab.updatePreset("id", "Second edit", team("c"), baseline),
  ]);
  assert.equal(first?.name, "First edit");
  assert.equal(second, null, "the second tab must detect a conflict while holding the lock");
  assert.deepEqual(create().list().map(p => [p.name, p.members[0].id]), [["First edit", "b"]]);
});

test("Web Locks reject two concurrent same-name Teams and repair a generated-id collision", async () => {
  const disk = testDisk(), locks = queuedLocks(), owner = () => "trainer-a";
  const create = () => createTeamPresetStorage({
    storage: () => disk, owner, makeId: () => "duplicate",
    mutationLocks: () => locks,
  });
  const a = create(), b = create();
  const [first, rejected] = await Promise.all([
    a.upsert("Same Name", team("a"), null),
    b.upsert("Same Name", team("b"), null),
  ]);
  assert.equal(first?.created, true);
  assert.equal(rejected, null);
  const second = await b.upsert("Other Name", team("b"), null);
  assert.equal(second?.created, true);
  const records = create().list();
  assert.deepEqual(records.map(record => record.name), ["Same Name", "Other Name"]);
  assert.equal(new Set(records.map(record => record.id)).size, 2);
});

test("Web Locks serialize competing same-record Moveset edits and same-name creation", async () => {
  const disk = testDisk(), locks = queuedLocks(), owner = () => "trainer-a";
  const create = id => createTeamMovesetStorage({
    storage: () => disk, owner, makeId: () => id, mutationLocks: () => locks,
  });
  const a = create("a");
  assert.equal((await a.upsert("creature", "Original", moves("initial"))).created, true);
  const b = create("b"), original = a.list("creature")[0];
  const [first, second] = await Promise.all([
    a.replaceSnapshot(original.id, "creature", moves("changed-a"), original),
    b.replaceSnapshot(original.id, "creature", moves("changed-b"), original),
  ]);
  assert.equal(first.ok, true);
  assert.deepEqual(second, { ok: false, reason: "conflict" });
  assert.deepEqual(create("c").list("creature")[0].moves.map(m => m.id), ["changed-a"]);
  const c = create("c"), d = create("d");
  const [created, collided] = await Promise.all([
    c.upsert("creature", "Same", moves("c"), null),
    d.upsert("creature", "Same", moves("d"), null),
  ]);
  assert.equal(created?.created, true);
  assert.equal(collided, null);
  assert.equal(create("e").list("creature").filter(p => p.name === "Same").length, 1);
});

test("missing Web Locks on browser-backed writes must retain drafts only in session", async () => {
  const disk = testDisk();
  const teamStore = createTeamPresetStorage({
    storage: () => disk, owner: () => "trainer-a",
    mutationLocks: () => null, makeId: () => "team-only",
  });
  const movesStore = createTeamMovesetStorage({
    storage: () => disk, owner: () => "trainer-a",
    mutationLocks: () => null, makeId: () => "moves-only",
  });
  assert.equal(teamStore.upsert("Team", team("a"))?.created, true);
  assert.equal(movesStore.upsert("a", "Moves", moves("m"))?.created, true);
  assert.equal(teamStore.isPersistent(), false);
  assert.equal(movesStore.isPersistent(), false);
  assert.deepEqual(disk.values.size, 0, "unsupported locks must never emit unsafe shared persistent writes");
  assert.equal(teamStore.list().length, 1);
  assert.equal(movesStore.list().length, 1);
});

test("browser Web Locks recovery persists earlier isolated session-only drafts without discarding them", async () => {
  const disk = testDisk(), locks = queuedLocks(), owner = () => "trainer-a";
  let lockingSupported = false;
  const store = createTeamPresetStorage({
    storage: () => disk, owner, makeId: (() => { let id = 0; return () => `team-${++id}`; })(),
    mutationLocks: () => lockingSupported ? locks : null,
  });
  assert.equal(store.upsert("Offline team", team("a"))?.created, true);
  assert.equal(store.isPersistent(), false);
  assert.equal(disk.values.size, 0);
  lockingSupported = true;
  assert.equal((await store.upsert("After recovery", team("b"))).created, true);
  assert.equal(store.isPersistent(), true);
  assert.deepEqual(createTeamPresetStorage({ storage: () => disk, owner }).list().map(entry => entry.name), ["Offline team", "After recovery"]);
});

test("recovering session drafts cannot overwrite another tab's intervening Team and Moveset changes", () => {
  const disk = testDisk(), owner = () => "trainer-a";
  const aStorage = { ...disk, setItem(key, value) { if (this.denied) throw new Error("quota"); disk.setItem(key, value); }, denied: false };
  const teamsA = createTeamPresetStorage({ storage: () => aStorage, owner, makeId: () => "team" });
  teamsA.upsert("Original", team("a"));
  const teamsB = createTeamPresetStorage({ storage: () => disk, owner });
  aStorage.denied = true;
  assert.equal(teamsA.rename("team", "Local draft"), true);
  assert.equal(teamsA.isPersistent(), false);
  assert.equal(teamsB.rename("team", "Remote saved"), true);
  aStorage.denied = false;
  assert.equal(teamsA.rename("team", "Local final"), false);
  assert.deepEqual(createTeamPresetStorage({ storage: () => disk, owner }).list().map(x => x.name), ["Remote saved"]);
  assert.equal(teamsA.isPersistent(), false, "conflicting session edit is retained but not written over another tab");

  const movesA = createTeamMovesetStorage({ storage: () => aStorage, owner, makeId: () => "moves" });
  movesA.upsert("a", "Original", moves("m1"));
  const movesB = createTeamMovesetStorage({ storage: () => disk, owner });
  aStorage.denied = true;
  assert.equal(movesA.replaceSnapshot("moves", "a", moves("local")).ok, true);
  assert.equal(movesB.replaceSnapshot("moves", "a", moves("remote")).ok, true);
  aStorage.denied = false;
  assert.equal(movesA.replaceSnapshot("moves", "a", moves("local-final")).ok, false);
  assert.deepEqual(createTeamMovesetStorage({ storage: () => disk, owner }).list("a")[0].moves.map(m => m.id), ["remote"]);
});

test("recovered disjoint session drafts merge with remote new entries without dropping either", () => {
  const disk = testDisk(), owner = () => "trainer-a";
  const aStorage = { ...disk, denied: true, setItem(key, value) { if (this.denied) throw new Error("quota"); disk.setItem(key, value); } };
  const a = createTeamPresetStorage({ storage: () => aStorage, owner, makeId: (() => { let n = 0; return () => `a${++n}`; })() });
  const b = createTeamPresetStorage({ storage: () => disk, owner, makeId: () => "b" });
  a.upsert("Offline", team("a")); b.upsert("Remote", team("b"));
  aStorage.denied = false;
  a.upsert("Another", team("c"));
  assert.deepEqual(createTeamPresetStorage({ storage: () => disk, owner }).list().map(x => x.name).sort(), ["Another", "Offline", "Remote"]);
});

test("recovered disjoint Moveset drafts merge safely with other-tab additions", () => {
  const disk = testDisk(), owner = () => "trainer-a";
  const offlineDisk = { ...disk, denied: true, setItem(key, value) { if (this.denied) throw new Error("quota"); disk.setItem(key, value); } };
  const offline = createTeamMovesetStorage({ storage: () => offlineDisk, owner, makeId: () => "offline" });
  const online = createTeamMovesetStorage({ storage: () => disk, owner, makeId: () => "online" });
  assert.equal(offline.upsert("c", "Offline", moves("a"))?.created, true);
  assert.equal(online.upsert("c", "Remote", moves("b"))?.created, true);
  offlineDisk.denied = false;
  assert.equal(offline.upsert("c", "Another", moves("c"))?.created, true);
  const saved = createTeamMovesetStorage({ storage: () => disk, owner }).list("c");
  assert.deepEqual(saved.map(x => x.name).sort(), ["Another", "Offline", "Remote"]);
  assert.equal(new Set(saved.map(x => x.marker)).size, 3, "per-creature marker numbering remains unique");
});

test("a queued Team write checks its caller lifecycle again when the Web Lock is granted", async () => {
  const disk = testDisk(), waiting = [];
  const locks = {
    request(_name, _options, callback) {
      return new Promise(resolve => waiting.push(() => resolve(callback())));
    },
  };
  const store = createTeamPresetStorage({
    storage: () => disk, owner: () => "trainer-a",
    mutationLocks: () => locks, makeId: () => "queued-team",
  });
  let mounted = true;
  const pending = store.upsert("After cleanup", team("a"), null, () => mounted);
  assert.equal(waiting.length, 1);
  mounted = false;
  waiting.shift()();
  assert.equal(await pending, null);
  assert.equal(disk.values.size, 0, "a lock granted after teardown cannot commit the obsolete write");
});

test("a queued Moveset update is rejected after the owner changes or its view closes", async () => {
  const disk = testDisk(), owner = () => trainer;
  let trainer = "trainer-a", validView = true;
  const base = createTeamMovesetStorage({
    storage: () => disk, owner, makeId: () => "saved",
  });
  assert.equal(base.upsert("c", "Original", moves("before"))?.created, true);
  const waiting = [];
  const locks = {
    request(_name, _options, callback) {
      return new Promise(resolve => waiting.push(() => resolve(callback())));
    },
  };
  const store = createTeamMovesetStorage({
    storage: () => disk, owner, mutationLocks: () => locks,
  });
  const current = store.list("c")[0];
  const pending = store.replaceSnapshot(current.id, "c", moves("after"), current, () => validView);
  validView = false;
  waiting.shift()();
  assert.equal((await pending).ok, false);
  assert.deepEqual(base.reload()[0].moves.map(x => x.id), ["before"]);

  validView = true;
  const queuedUnderA = store.remove(current.id, "c", current, () => validView);
  trainer = "trainer-b";
  waiting.shift()();
  assert.equal(await queuedUnderA, false);
  trainer = "trainer-a";
  assert.deepEqual(base.reload().map(x => x.name), ["Original"]);
});

test("legacy import queued under a Web Lock aborts after its confirmation view is torn down", async () => {
  const disk = testDisk(), waiting = [];
  disk.setItem("ppbui:team-presets:v2", JSON.stringify([{ id: "old", name: "Legacy", ...team("a") }]));
  const locks = {
    request(_name, _options, callback) {
      return new Promise(resolve => waiting.push(() => resolve(callback())));
    },
  };
  const store = createTeamPresetStorage({
    storage: () => disk, owner: () => "trainer-a", locks: () => locks,
  });
  let viewCurrent = true;
  const queued = store.claimLegacy(() => viewCurrent);
  assert.equal(waiting.length, 1);
  viewCurrent = false;
  waiting.shift()();
  assert.equal(await queued, false);
  assert.equal(disk.getItem("ppbui:team-presets:v3:legacy-claim"), null);
  assert.equal(disk.getItem("ppbui:team-presets:v3:trainer-a:import"), null);
});
