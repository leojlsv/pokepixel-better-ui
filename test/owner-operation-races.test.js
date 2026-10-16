import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { applyTeamPreset } from "../src/modules/team-presets/actions.js";
import { mountTeamPresetManager } from "../src/modules/team-presets/manager.js";
import { mountTeamPresetComposer } from "../src/modules/team-presets/composer.js";
import { createTeamPresetStorage } from "../src/modules/team-presets/storage.js";
import { createPresetRuntime } from "../src/modules/team-presets/runtime.js";
import { applyTeamMoveset } from "../src/modules/team-movesets/actions.js";
import { createTeamMovesetStorage } from "../src/modules/team-movesets/storage.js";
import { mountPokemonProfile } from "../src/modules/pokemon-profile/controller.js";

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferredWebLocks() {
  const gate = deferred(), requests = [];
  return {
    requests,
    request(name, options, callback) {
      requests.push({ name, options });
      return gate.promise.then(() => callback());
    },
    grant() { gate.resolve(); },
  };
}
async function expectQueuedLock(locks) {
  for (let attempt = 0; attempt < 12 && !locks.requests.length; attempt++) await tick();
  assert.ok(locks.requests.length, "mutation must reach the deferred Web Lock before cancellation");
}
const teamPreset = members => ({
  id: "p1", name: "Test preset", orderVerified: true,
  members: members.map(id => ({ id, name: id.toUpperCase(), hp: 100 })),
  activeId: members[0],
});
const teamApi = (more = {}) => ({
  getTeam: async () => ({ team: { member_ids: ["a", "b"], leader_id: "a" } }),
  getCreatures: async location => ({ data: location === "team" ? [{ id: "a", hp: 100 }, { id: "b", hp: 100 }] : [] }),
  setTeamLeader: async () => ({}),
  addTeamMember: async () => ({}),
  removeTeamMember: async () => ({}),
  setTeamOrder: async () => ({}),
  ...more,
});
const auth = getOwner => ({
  isAuthenticated: () => true,
  getTrainerSummary: () => ({ id: getOwner() }),
});
function sharedStorage() {
  const values = new Map();
  return {
    values,
    get length() { return values.size; },
    key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

function setupConcurrentTeamManager(t, { orderVerified = true, capture, apply, mutationLocks } = {}) {
  const dom = new JSDOM('<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"></div></div>');
  const disk = sharedStorage();
  let activeOwner = "trainer-a";
  const owner = () => activeOwner;
  let now = 1000, serial = 0;
  const options = { storage: () => disk, owner, now: () => ++now, makeId: () => "team-" + ++serial };
  const seed = createTeamPresetStorage(options);
  const inserted = seed.upsert("Original", { members: [{ id: "a", name: "A" }, { id: "b", name: "B" }], activeId: "a", orderVerified });
  const other = seed.upsert("Other", { members: [{ id: "c", name: "C" }], activeId: "c", orderVerified: true });
  const a = mutationLocks ? createTeamPresetStorage({ ...options, mutationLocks: () => mutationLocks }) : seed;
  const b = createTeamPresetStorage(options);
  const panel = dom.window.document.querySelector(".pokeidle-team-panel");
  dom.window.PokeIdle = {
    Localization: { get: () => "en" },
    Dialog: { confirm: async () => true },
    Api: {
      getCreatures: async location => ({ data: location === "team" ? [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }] : [] }),
    },
  };
  const manager = mountTeamPresetManager(panel, {
    store: a, apply,
    capture: capture || (async () => ({ ok: true, snapshot: { members: [{ id: "a", name: "A" }], activeId: "a", orderVerified: true } })),
  });
  t.after(() => { manager.cleanup(); dom.window.close(); });
  const card = () => panel.querySelector('[data-ppbui-team-preset-card][data-preset-id="' + inserted.preset.id + '"]');
  return { dom, doc: dom.window.document, disk, a, b, card, panel, manager, inserted: inserted.preset, other: other.preset,
    owner: value => { activeOwner = value; } };
}

test("Manager queued Web Lock cannot commit rename after manager cleanup", async t => {
  const locks = deferredWebLocks(), s = setupConcurrentTeamManager(t, { mutationLocks: locks });
  const baseline = [...s.disk.values.entries()];
  const rename = s.card().querySelector("[data-ppbui-team-preset-name-field] input");
  rename.value = "Stale locked rename";
  rename.dispatchEvent(new s.dom.window.Event("change", { bubbles: true }));
  await expectQueuedLock(locks);
  s.manager.cleanup();
  locks.grant();
  await tick();
  await tick();
  assert.deepEqual([...s.disk.values.entries()], baseline, "a lock granted after unmount cannot persist A's rename");
});

test("Manager queued Web Lock cannot commit removal after manager cleanup", async t => {
  const locks = deferredWebLocks(), s = setupConcurrentTeamManager(t, { mutationLocks: locks });
  const baseline = [...s.disk.values.entries()];
  s.card().querySelector(".ppbui-team-preset-delete").click();
  await expectQueuedLock(locks);
  s.manager.cleanup();
  locks.grant();
  await tick();
  await tick();
  assert.deepEqual([...s.disk.values.entries()], baseline, "confirmed deletion must still be cancelled while queued");
});

test("Manager reports session-only storage when a rename succeeds without native Web Locks", t => {
  const s = setupConcurrentTeamManager(t, { mutationLocks: {} });
  const input = s.card().querySelector("[data-ppbui-team-preset-name-field] input");
  input.value = "Temporary edit";
  input.dispatchEvent(new s.dom.window.Event("change", { bubbles: true }));
  assert.equal(s.a.isPersistent(), false);
  const message = s.card().querySelector("[data-ppbui-team-preset-card-status]");
  assert.equal(message.dataset.error, "true");
  assert.match(message.textContent, /session/i);
});

test("Manager rejects stale A card actions when identity switches to B before sync, even with identical record IDs", async t => {
  let applied = 0;
  const s = setupConcurrentTeamManager(t, { apply: async () => { applied++; return { ok: true }; } });
  const card = s.card(), id = s.inserted.id;
  s.disk.setItem("ppbui:team-presets:v3:trainer-b", JSON.stringify([s.inserted]));
  s.owner("trainer-b");
  card.querySelector("[data-ppbui-team-preset-name-field] input").dispatchEvent(new s.dom.window.Event("change"));
  card.querySelector("[data-ppbui-team-preset-card-foot] .ppbui-button--primary").click();
  card.querySelector("[data-ppbui-team-preset-member-controls] [data-direction=right]").click();
  card.querySelector(".ppbui-team-preset-delete").click();
  card.querySelector("[data-ppbui-team-preset-edit]").click();
  await tick();
  assert.equal(applied, 0, "A's Apply must never run under B");
  const b = createTeamPresetStorage({ storage: () => s.disk, owner: () => "trainer-b" });
  assert.deepEqual(b.list(), [s.inserted], "B's matching-ID record stays untouched");
  assert.equal(s.doc.querySelector("[data-ppbui-team-preset-composer-panel]").hidden, true, "A editor cannot open under B");
});

test("Manager ignores the result of a locked mutation after owner changes while awaiting it", async t => {
  const s = setupConcurrentTeamManager(t), pending = deferred();
  const oldCard = s.card(), input = oldCard.querySelector("[data-ppbui-team-preset-name-field] input");
  s.a.rename = () => pending.promise;
  input.value = "Pending";
  input.dispatchEvent(new s.dom.window.Event("change", { bubbles: true }));
  s.owner("trainer-b");
  pending.resolve(true);
  await tick();
  assert.equal(input.value, "Pending", "completion of A's locked write must not rerender B's state");
  assert.equal(oldCard.querySelector("[data-ppbui-team-preset-card-status]").textContent, "");
});

test("Manager's stale rendered rename cannot overwrite another tab's changed Team record", async t => {
  const s = setupConcurrentTeamManager(t);
  assert.equal(s.b.rename(s.inserted.id, "Remote edit"), true);
  const input = s.card().querySelector("[data-ppbui-team-preset-name-field] input");
  input.value = "Stale tab edit";
  input.dispatchEvent(new s.dom.window.Event("change", { bubbles: true }));
  await tick();
  assert.equal(s.b.reload().find(preset => preset.id === s.inserted.id).name, "Remote edit");
  assert.equal(s.card().querySelector("[data-ppbui-team-preset-card-status]").dataset.error, "true");
});

test("Manager's awaited delete confirmation cannot delete a Team edited in another tab", async t => {
  const s = setupConcurrentTeamManager(t), gate = deferred();
  s.dom.window.PokeIdle.Dialog.confirm = () => gate.promise;
  s.card().querySelector(".ppbui-team-preset-delete").click();
  assert.equal(s.b.rename(s.inserted.id, "Remote edit"), true);
  gate.resolve(true);
  await tick();
  assert.equal(s.b.reload().find(preset => preset.id === s.inserted.id).name, "Remote edit");
  assert.equal(s.card().querySelector("[data-ppbui-team-preset-card-status]").dataset.error, "true");
});

test("Manager's stale member and active actions cannot overwrite another tab's Team", t => {
  const s = setupConcurrentTeamManager(t);
  assert.equal(s.b.rename(s.inserted.id, "Remote edit"), true);
  const before = s.b.reload().find(preset => preset.id === s.inserted.id);
  s.card().querySelector("[data-ppbui-team-preset-member-controls] [data-direction=right]").click();
  s.card().querySelectorAll("[data-ppbui-team-preset-member-visual]")[1].click();
  s.card().querySelector('[data-active-control="true"]').click();
  assert.deepEqual(s.b.reload().find(preset => preset.id === s.inserted.id), before);
});

test("Manager's delayed snapshot update cannot replace a newer Team record", async t => {
  const gate = deferred();
  const s = setupConcurrentTeamManager(t, { capture: () => gate.promise });
  s.card().querySelector("[data-ppbui-team-preset-card-foot] button:not(.ppbui-button--primary)").click();
  assert.equal(s.b.rename(s.inserted.id, "Remote edit"), true);
  gate.resolve({ ok: true, snapshot: { members: [{ id: "a", name: "A" }], activeId: "a", orderVerified: true } });
  await tick();
  const saved = s.b.reload().find(preset => preset.id === s.inserted.id);
  assert.equal(saved.name, "Remote edit");
  assert.deepEqual(saved.members.map(member => member.id), ["a", "b"]);
});

test("Composer's edit baseline preserves a newer Team record after another tab edits it", async t => {
  const s = setupConcurrentTeamManager(t);
  s.card().querySelector("[data-ppbui-team-preset-edit]").click();
  await tick();
  const input = s.doc.querySelector('input[name="ppbui-team-preset-composer-name"]');
  input.value = "Stale composer edit";
  input.dispatchEvent(new s.dom.window.Event("input", { bubbles: true }));
  assert.equal(s.b.rename(s.inserted.id, "Remote edit"), true);
  const save = s.doc.querySelector("[data-ppbui-team-preset-composer-actions] button:last-child");
  assert.equal(save.disabled, false);
  save.click();
  await tick();
  assert.equal(s.b.reload().find(preset => preset.id === s.inserted.id).name, "Remote edit");
  assert.equal(s.doc.querySelector("[data-ppbui-team-preset-composer-status]").dataset.error, "true");
});

test("team apply and runtime deny an initially unresolved trainer before the first native read", async t => {
  const dom = new JSDOM(""); t.after(() => dom.window.close());
  let reads = 0;
  dom.window.PokeIdle = {
    Auth: auth(() => ""), Bus: { emit() {} },
    Api: teamApi({ getTeam: async () => { reads++; return {}; } }),
  };
  assert.equal(createPresetRuntime(dom.window.document), null);
  const result = await applyTeamPreset(dom.window.document, teamPreset(["a"]));
  assert.deepEqual(result, { ok: false, reason: "owner-changed" });
  assert.equal(reads, 0);
});

test("moveset apply denies an initial anonymous identity with no Auth or presence provider", async () => {
  let reads = 0, writes = 0;
  const wanted = [1, 2, 3, 4].map(id => ({ id: "m" + id }));
  const win = { PokeIdle: {
    Api: {
      getMoveset: async () => { reads++; return { creature_id: "a", revision: 1, mode: "manual", selected: wanted, available: wanted }; },
      saveMoveset: async () => { writes++; },
    },
  } };
  assert.deepEqual(await applyTeamMoveset(win, "a", { moves: wanted }), { ok: false, reason: "owner-changed" });
  assert.equal(reads, 0);
  assert.equal(writes, 0);
});

test("runtime emits through the current native Bus after a PokeIdle shell replacement", async t => {
  const dom = new JSDOM(""); t.after(() => dom.window.close());
  const oldEvents = [], newEvents = [], api = teamApi();
  const first = { Auth: auth(() => "trainer-a"), Api: api, Bus: { emit: (...args) => oldEvents.push(args) } };
  dom.window.PokeIdle = first;
  const runtime = createPresetRuntime(dom.window.document);
  assert.ok(runtime);
  dom.window.PokeIdle = { ...first, Bus: { emit: (...args) => newEvents.push(args) } };
  await runtime.setLeader({ id: "a", hp: 100 });
  assert.equal(oldEvents.length, 0);
  assert.deepEqual(newEvents.map(args => args[0]), ["team.updated"]);
});

test("runtime discards an awaited native read after same-API A to B account transition", async t => {
  const dom = new JSDOM(""); t.after(() => dom.window.close());
  let owner = "trainer-a", creaturesReads = 0;
  const gate = deferred();
  dom.window.PokeIdle = {
    Auth: auth(() => owner), Bus: { emit() {} },
    Api: teamApi({
      getTeam: () => gate.promise,
      getCreatures: async () => { creaturesReads++; return { data: [] }; },
    }),
  };
  const runtime = createPresetRuntime(dom.window.document);
  assert.ok(runtime);
  const loading = runtime.load();
  owner = "trainer-b";
  gate.resolve({ team: { member_ids: ["a", "b"], leader_id: "a" } });
  await assert.rejects(loading, /owner-changed/);
  assert.equal(creaturesReads, 0, "a stale read must not schedule further B-scoped reads");
});

test("manager cleanup prevents pending apply from sending its first native mutation", async t => {
  const dom = new JSDOM('<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"></div></div>');
  t.after(() => dom.window.close());
  const gate = deferred(), commands = [];
  let reads = 0;
  dom.window.PokeIdle = {
    Auth: auth(() => "trainer-a"), Bus: { emit() {} },
    Api: teamApi({
      getTeam: () => { reads++; return gate.promise; },
      removeTeamMember: async id => { commands.push(["remove", id]); return {}; },
      setTeamLeader: async id => { commands.push(["leader", id]); return {}; },
      addTeamMember: async id => { commands.push(["add", id]); return {}; },
      setTeamOrder: async ids => { commands.push(["order", ids]); return {}; },
    }),
  };
  const entry = teamPreset(["a"]);
  const store = { owner: () => "trainer-a", list: () => [entry] };
  const manager = mountTeamPresetManager(dom.window.document.querySelector(".pokeidle-team-panel"), {
    store, apply: applyTeamPreset, runExclusive: task => task(),
  });
  t.after(() => manager.cleanup());
  dom.window.document.querySelector("[data-ppbui-team-preset-card-foot] .ppbui-button--primary").click();
  assert.equal(reads, 1, "apply has already issued its first native read");
  manager.cleanup();
  gate.resolve({ team: { member_ids: ["a", "b"], leader_id: "a" } });
  await tick();
  assert.deepEqual(commands, [], "cleanup must cancel the queued remove, leader and order calls");
});

function setupComposer(t) {
  const dom = new JSDOM('<section id="manager"><div data-ppbui-team-preset-manager-grid></div></section>');
  t.after(() => dom.window.close());
  let owner = "trainer-a", pending = null;
  dom.window.PokeIdle = {
    Localization: { get: () => "en" },
    Api: {
      getCreatures(location) {
        if (pending) return pending.promise;
        return Promise.resolve({ data: location === "team" ? [{ id: owner + "-team", name: "Team" }] : [] });
      },
    },
  };
  const store = { owner: () => owner, upsert: () => ({ created: true }) };
  const composer = mountTeamPresetComposer(dom.window.document.querySelector("#manager"), { store });
  t.after(() => composer.cleanup());
  const doc = dom.window.document;
  return {
    composer, doc, store,
    create: () => doc.querySelector("[data-ppbui-team-preset-composer-launch] button").click(),
    cancel: () => doc.querySelector("[data-ppbui-team-preset-composer-actions] button").click(),
    ids: () => [...doc.querySelectorAll("[data-ppbui-team-preset-candidate]")].map(node => node.dataset.memberId),
    owner: value => { owner = value; },
    hold: () => { pending = deferred(); return pending; },
  };
}

function setupLockedComposer(t, locks, { existing = false } = {}) {
  const dom = new JSDOM('<section id="manager"><div data-ppbui-team-preset-manager-grid></div></section>');
  const disk = sharedStorage(), options = { storage: () => disk, owner: () => "trainer-a" };
  if (existing) createTeamPresetStorage(options).upsert("Original", {
    members: [{ id: "a", name: "A" }], activeId: "a", orderVerified: true,
  });
  const store = createTeamPresetStorage({ ...options, mutationLocks: () => locks });
  dom.window.PokeIdle = {
    Localization: { get: () => "en" },
    Api: { getCreatures: async location => ({ data: location === "team" ? [{ id: "a", name: "A" }] : [] }) },
  };
  const doc = dom.window.document;
  const feedback = [];
  const composer = mountTeamPresetComposer(doc.querySelector("#manager"), {
    store, setManagerStatus: (...args) => feedback.push(args),
  });
  t.after(() => { composer.cleanup(); dom.window.close(); });
  return { dom, doc, disk, store, composer, feedback };
}

test("Composer reports session-only storage after Create without native Web Locks", async t => {
  const s = setupLockedComposer(t, {});
  s.doc.querySelector("[data-ppbui-team-preset-composer-launch] button").click();
  await tick();
  s.doc.querySelector("[data-ppbui-team-preset-candidate]").click();
  const input = s.doc.querySelector('input[name="ppbui-team-preset-composer-name"]');
  input.value = "Temporary";
  input.dispatchEvent(new s.dom.window.Event("input", { bubbles: true }));
  s.doc.querySelector("[data-ppbui-team-preset-composer-actions] button:last-child").click();
  await tick();
  assert.equal(s.store.isPersistent(), false);
  assert.equal(s.feedback[0]?.[1], true);
  assert.match(s.feedback[0]?.[0] || "", /session/i);
});

for (const editing of [false, true]) {
  test("Composer queued Web Lock cannot commit " + (editing ? "Edit" : "Create") + " after cleanup", async t => {
    const locks = deferredWebLocks(), s = setupLockedComposer(t, locks, { existing: editing });
    const initialBytes = [...s.disk.values.entries()];
    if (editing) {
      assert.equal(s.composer.edit(s.store.list()[0]), true);
      await tick();
    } else {
      s.doc.querySelector("[data-ppbui-team-preset-composer-launch] button").click();
      await tick();
      s.doc.querySelector("[data-ppbui-team-preset-candidate]").click();
    }
    const name = s.doc.querySelector('input[name="ppbui-team-preset-composer-name"]');
    name.value = "Abandoned edit";
    name.dispatchEvent(new s.dom.window.Event("input", { bubbles: true }));
    const save = s.doc.querySelector("[data-ppbui-team-preset-composer-actions] button:last-child");
    assert.equal(save.disabled, false);
    save.click();
    await expectQueuedLock(locks);
    s.composer.cleanup();
    locks.grant();
    await tick();
    await tick();
    assert.deepEqual([...s.disk.values.entries()], initialBytes, "abandoned draft must never persist after lock grant");
  });
}

test("Composer Create passes an explicit absent-name baseline and waits for asynchronous storage success", async t => {
  const s = setupComposer(t), gate = deferred(), requests = [];
  s.store.upsert = (...args) => { requests.push(args); return gate.promise; };
  s.create(); await tick();
  s.doc.querySelector("[data-ppbui-team-preset-candidate]").click();
  const name = s.doc.querySelector('input[name="ppbui-team-preset-composer-name"]');
  name.value = "New team"; name.dispatchEvent(new s.doc.defaultView.Event("input", { bubbles: true }));
  const panel = s.doc.querySelector("[data-ppbui-team-preset-composer-panel]");
  const save = panel.querySelector("[data-ppbui-team-preset-composer-actions] button:last-child");
  save.click();
  assert.equal(requests.length, 1);
  assert.equal(requests[0][2], null, "Create must require no same-name preset on disk");
  assert.equal(panel.hidden, false, "UI cannot report success while the locked mutation is pending");
  assert.equal(save.disabled, true, "a second write cannot queue before the first resolves");
  gate.resolve({ created: true });
  await tick();
  assert.equal(panel.hidden, true);
});

test("Composer ignores a locked Create result delivered after trainer A switches to B", async t => {
  const s = setupComposer(t), pending = deferred();
  s.store.upsert = () => pending.promise;
  s.create(); await tick();
  s.doc.querySelector("[data-ppbui-team-preset-candidate]").click();
  const name = s.doc.querySelector('input[name="ppbui-team-preset-composer-name"]');
  name.value = "A team"; name.dispatchEvent(new s.doc.defaultView.Event("input", { bubbles: true }));
  s.doc.querySelector("[data-ppbui-team-preset-composer-actions] button:last-child").click();
  s.owner("trainer-b");
  s.composer.sync();
  pending.resolve({ created: true });
  await tick();
  assert.equal(s.doc.querySelector("[data-ppbui-team-preset-composer-panel]").hidden, true);
  assert.equal(s.doc.querySelector("[data-ppbui-team-preset-composer-name] input").value, "");
});

test("composer openCreate A to B before sync clears cached A candidates while B is loading", async t => {
  const s = setupComposer(t);
  s.create(); await tick();
  assert.deepEqual(s.ids(), ["trainer-a-team"]);
  s.cancel();
  s.owner("trainer-b");
  const wait = s.hold();
  s.create();
  assert.deepEqual(s.ids(), [], "A candidates must disappear synchronously");
  wait.resolve({ data: [{ id: "trainer-b-team", name: "B Pokémon" }] });
  await tick();
  assert.deepEqual(s.ids(), ["trainer-b-team"]);
});

test("composer openEdit A to B before sync clears cached candidates and ignores stale A results", async t => {
  const s = setupComposer(t);
  s.create(); await tick();
  assert.deepEqual(s.ids(), ["trainer-a-team"]);
  s.owner("trainer-b");
  const wait = s.hold();
  const ok = s.composer.edit(teamPreset(["trainer-b-team"]));
  assert.equal(ok, true);
  assert.deepEqual(s.ids(), [], "old A candidate buttons must not remain in B's editor");
  wait.resolve({ data: [{ id: "trainer-b-team", name: "B Pokémon" }] });
  await tick();
  assert.deepEqual(s.ids(), ["trainer-b-team"]);
});

test("composer ignores an unresolved A read that finishes after B's editor has loaded", async t => {
  const s = setupComposer(t);
  const oldRead = s.hold();
  s.create();
  s.owner("trainer-b");
  const newRead = s.hold();
  assert.equal(s.composer.edit(teamPreset(["trainer-b-team"])), true);
  newRead.resolve({ data: [{ id: "trainer-b-team", name: "B Pokémon" }] });
  await tick();
  assert.deepEqual(s.ids(), ["trainer-b-team"]);
  oldRead.resolve({ data: [{ id: "trainer-a-team", name: "A Pokémon" }] });
  await tick();
  assert.deepEqual(s.ids(), ["trainer-b-team"], "A's late response must not overwrite B's candidates");
});

function setupProfile(t, { movesetStore, locks, savedMoves, legacyMoves } = {}) {
  const dom = new JSDOM('<div class="pokeidle-top-toolbar"><button data-menu-id="team"></button></div>', {
    url: "https://pokepixel.nietore.com/play/", pretendToBeVisual: true,
  });
  let owner = "trainer-a"; const calls = [];
  const move = { id: "earthquake", name: "Earthquake", element: "ground", power: 100 };
  dom.window.PokeIdle = {
    Auth: auth(() => owner),
    Localization: { get: () => "en-US" },
    t: key => key,
    Bus: { on() {}, off() {}, emit() {} },
    MovesetConfig: { open: id => calls.push(id) },
    Api: {
      async getCreatures(location) { return { data: location === "team" ? [{ id: "a", name: "A", hp: 100, max_hp: 100, level: 1 }] : [] }; },
      async getMoveset(id) { return { creature_id: id, revision: 1, mode: "manual", selected: [move], available: [move] }; },
    },
  };
  dom.window.confirm = () => true;
  if (locks) Object.defineProperty(dom.window.navigator, "locks", { configurable: true, value: locks });
  if (savedMoves) dom.window.localStorage.setItem("ppbui:team-movesets:v2:trainer-a", JSON.stringify(savedMoves));
  if (legacyMoves) dom.window.localStorage.setItem("ppbui:team-movesets:v1", JSON.stringify(legacyMoves));
  const mounted = mountPokemonProfile(dom.window.document, movesetStore ? { movesetStore } : undefined);
  t.after(() => { mounted.cleanup(); dom.window.close(); });
  return { doc: dom.window.document, win: dom.window, mounted,
    open: () => dom.window.__PPBUI_POKEMON_PROFILE__.open("a"), calls, owner: value => { owner = value; } };
}

const savedNativeMoveset = Object.freeze({
  id: "locked-moveset", creatureId: "a", name: "Original",
  moves: [{ id: "other", name: "Other" }], marker: 1, createdAt: 1, updatedAt: 1,
});

for (const operation of ["update", "remove"]) {
  test("Profile " + operation + " reports session-only persistence when native locks are unavailable", async t => {
    const s = setupProfile(t, { locks: {}, savedMoves: [savedNativeMoveset] });
    await s.open();
    s.doc.querySelector('[data-ppbui-profile-saved-action="' + operation + '"]').click();
    await tick();
    const status = s.doc.querySelector('[data-ppbui-profile-section-body="savedMoves"] > [data-ppbui-profile-status]');
    assert.ok(status);
    assert.equal(status.dataset.error, "true");
    assert.match(status.textContent, /session only/i);
  });
}

function scopedMovesetBytes(win) {
  return Array.from({ length: win.localStorage.length }, (_, index) => win.localStorage.key(index))
    .filter(key => key?.startsWith("ppbui:team-movesets:v2:trainer-a"))
    .sort().map(key => [key, win.localStorage.getItem(key)]);
}

for (const operation of ["save", "update", "remove"]) {
  test("Profile queued Web Lock cannot commit " + operation + " after cleanup", async t => {
    const locks = deferredWebLocks();
    const s = setupProfile(t, { locks, savedMoves: operation === "save" ? null : [savedNativeMoveset] });
    await s.open();
    const baseline = scopedMovesetBytes(s.win);
    if (operation === "save") {
      s.doc.querySelector("[data-ppbui-profile-preset-name]").value = "Queued";
      s.doc.querySelector("[data-ppbui-profile-save-current]").click();
    } else {
      s.doc.querySelector('[data-ppbui-profile-saved-action="' + operation + '"]').click();
    }
    await expectQueuedLock(locks);
    s.mounted.cleanup();
    locks.grant();
    await tick();
    await tick();
    assert.deepEqual(scopedMovesetBytes(s.win), baseline, "Profile cleanup must cancel a queued native-lock mutation");
  });
}

test("Profile queued Web Lock cannot commit Save after a newer render replaces the draft", async t => {
  const locks = deferredWebLocks(), s = setupProfile(t, { locks });
  await s.open();
  s.doc.querySelector("[data-ppbui-profile-preset-name]").value = "Stale render";
  s.doc.querySelector("[data-ppbui-profile-save-current]").click();
  await expectQueuedLock(locks);
  await s.open();
  locks.grant();
  await tick();
  await tick();
  assert.deepEqual(scopedMovesetBytes(s.win), [], "render epoch invalidates the stale write even while the Profile remains open");
});

test("Profile queued legacy import closes trainer A's stale UI when trainer B arrives", async t => {
  const locks = deferredWebLocks(), s = setupProfile(t, {
    locks, legacyMoves: [{ id: "legacy", creatureId: "a", name: "Old moves",
      moves: [{ id: "earthquake", name: "Earthquake" }], createdAt: 1, updatedAt: 1 }],
  });
  await s.open();
  const button = s.doc.querySelector("[data-ppbui-profile-import-legacy-moves]");
  assert.ok(button);
  button.click();
  await expectQueuedLock(locks);
  s.owner("trainer-b");
  locks.grant();
  await tick();
  await tick();
  assert.equal(s.doc.querySelector("[data-ppbui-pokemon-profile-window]").hidden, true);
  assert.equal(s.win.localStorage.getItem("ppbui:team-movesets:v2:legacy-claim"), null);
  assert.deepEqual(scopedMovesetBytes(s.win), [], "legacy import cannot claim ownerless data for stale A");
});

function setupConcurrentMovesets(t, { empty = false } = {}) {
  const disk = sharedStorage();
  let now = 100, serial = 0;
  const options = {
    owner: () => "trainer-a", storage: () => disk,
    now: () => ++now, makeId: () => "move-" + ++serial,
  };
  const a = createTeamMovesetStorage(options);
  const first = empty ? null : a.upsert("a", "Named", { moves: [{ id: "initial", name: "Initial" }] });
  const b = createTeamMovesetStorage(options);
  const profile = setupProfile(t, { movesetStore: a });
  return { ...profile, a, b, first, disk };
}

test("Profile's stale saved Moveset Update cannot overwrite another tab's edit", async t => {
  const s = setupConcurrentMovesets(t);
  await s.open();
  const update = s.doc.querySelector('[data-ppbui-profile-saved-action="update"]');
  assert.ok(update);
  assert.equal(s.b.replaceSnapshot(s.first.preset.id, "a", { moves: [{ id: "remote" }] }, s.b.list("a")[0]).ok, true);
  update.click();
  await tick();
  assert.deepEqual(s.b.reload()[0].moves.map(move => move.id), ["remote"]);
  assert.equal(s.doc.querySelector('[data-ppbui-profile-section-body="savedMoves"] [data-ppbui-profile-status]').dataset.error, "true");
});

test("Profile's stale saved Moveset Remove does not delete another tab's edit", async t => {
  const s = setupConcurrentMovesets(t);
  await s.open();
  const remove = s.doc.querySelector('[data-ppbui-profile-saved-action="remove"]');
  assert.ok(remove);
  assert.equal(s.b.replaceSnapshot(s.first.preset.id, "a", { moves: [{ id: "remote" }] }, s.b.list("a")[0]).ok, true);
  remove.click();
  await tick();
  assert.deepEqual(s.b.reload()[0].moves.map(move => move.id), ["remote"]);
  assert.equal(s.doc.querySelector('[data-ppbui-profile-section-body="savedMoves"] [data-ppbui-profile-status]').dataset.error, "true");
});

test("Profile captures existing named Moveset before native read and rejects late concurrent replacement", async t => {
  const s = setupConcurrentMovesets(t), gate = deferred();
  await s.open();
  const input = s.doc.querySelector("[data-ppbui-profile-preset-name]");
  input.value = "named";
  s.win.PokeIdle.Api.getMoveset = () => gate.promise;
  s.doc.querySelector("[data-ppbui-profile-save-current]").click();
  assert.equal(s.b.replaceSnapshot(s.first.preset.id, "a", { moves: [{ id: "remote" }] }, s.b.list("a")[0]).ok, true);
  gate.resolve({ creature_id: "a", revision: 2, mode: "manual", selected: [{ id: "earthquake" }], available: [{ id: "earthquake" }] });
  await tick();
  assert.deepEqual(s.b.reload()[0].moves.map(move => move.id), ["remote"]);
});

test("Profile Save requires absence of same-name Moveset before pending native read", async t => {
  const s = setupConcurrentMovesets(t, { empty: true }), gate = deferred();
  await s.open();
  const input = s.doc.querySelector("[data-ppbui-profile-preset-name]");
  input.value = "Named";
  s.win.PokeIdle.Api.getMoveset = () => gate.promise;
  s.doc.querySelector("[data-ppbui-profile-save-current]").click();
  const remote = s.b.upsert("a", "Named", { moves: [{ id: "remote" }] }, null);
  assert.equal(remote?.created, true);
  gate.resolve({ creature_id: "a", revision: 2, mode: "manual", selected: [{ id: "earthquake" }], available: [{ id: "earthquake" }] });
  await tick();
  assert.deepEqual(s.b.reload()[0].moves.map(move => move.id), ["remote"]);
});

test("Profile reports session-only persistence after Save when browser mutation locks are unavailable", async t => {
  const store = {
    owner: () => "trainer-a", list: () => [], legacyCount: () => 0,
    upsert: () => ({ created: true }),
    isPersistent: () => false,
  };
  const s = setupProfile(t, { movesetStore: store });
  await s.open();
  s.win.PokeIdle.Localization.get = () => "pt-BR";
  s.doc.querySelector("[data-ppbui-profile-preset-name]").value = "Session only";
  s.doc.querySelector("[data-ppbui-profile-save-current]").click();
  await tick();
  const status = s.doc.querySelector('[data-ppbui-profile-section-body="savedMoves"] > [data-ppbui-profile-status]');
  assert.ok(status);
  assert.equal(status.dataset.error, "true");
  assert.match(status.textContent, /apenas nesta sessão/i);
});

for (const action of ["apply", "update", "remove", "save"]) {
  test("Profile rejects stale A " + action + " click under B before any owner sync", async t => {
    let owner = "trainer-a";
    const operations = [], entry = {
      id: "preset-a", creatureId: "a", name: "A moves", marker: 1,
      moves: [{ id: "other", name: "Other" }],
    };
    const movesetStore = {
      owner: () => owner,
      list: () => [structuredClone(entry)],
      legacyCount: () => 0,
      upsert: (...args) => { operations.push(["upsert", args]); return { created: true }; },
      replaceSnapshot: (...args) => { operations.push(["replace", args]); return { ok: true }; },
      remove: (...args) => { operations.push(["remove", args]); return true; },
    };
    const s = setupProfile(t, { movesetStore });
    await s.open();
    const button = action === "save"
      ? s.doc.querySelector("[data-ppbui-profile-save-current]")
      : s.doc.querySelector('[data-ppbui-profile-saved-action="' + action + '"]');
    assert.ok(button);
    let reads = 0;
    s.win.PokeIdle.Api.getMoveset = async () => { reads++; return {}; };
    s.owner("trainer-b"); owner = "trainer-b";
    button.click();
    await tick();
    assert.equal(reads, 0, "a stale A click cannot issue B-scoped native reads");
    assert.deepEqual(operations, [], "a stale A click cannot change B's stored presets");
    assert.equal(s.doc.querySelector("[data-ppbui-pokemon-profile-window]").hidden, true);
  });
}

test("Profile A to B to A invalidates a pending native Moveset apply despite reused owner and Api", async t => {
  const preset = { id: "aba", creatureId: "a", name: "A loadout", marker: 1, moves: [{ id: "ice-beam", name: "Ice Beam" }] };
  const store = { owner: () => "trainer-a", list: () => [preset], legacyCount: () => 0 };
  const s = setupProfile(t, { movesetStore: store });
  await s.open();
  const button = s.doc.querySelector('[data-ppbui-profile-saved-action="apply"]');
  assert.ok(button);
  const deferredRead = deferred(), writes = [];
  s.win.PokeIdle.Api.getMoveset = () => deferredRead.promise;
  s.win.PokeIdle.Api.saveMoveset = (...args) => { writes.push(args); return Promise.resolve({}); };
  button.click();
  s.owner("trainer-b");
  s.mounted.sync();
  s.owner("trainer-a");
  s.mounted.sync();
  deferredRead.resolve({
    creature_id: "a", revision: 1, mode: "manual",
    selected: [{ id: "earthquake", name: "Earthquake" }],
    available: [{ id: "earthquake" }, { id: "ice-beam" }],
  });
  await tick();
  assert.deepEqual(writes, [], "the A/B/A identity round trip cannot authorize an old native save");
  assert.equal(s.doc.querySelector("[data-ppbui-pokemon-profile-window]").hidden, true);
});

test("stale Profile Configure Moves button cannot invoke B's native configurator after owner switches", async t => {
  const s = setupProfile(t);
  await s.open();
  const button = s.doc.querySelector("[data-ppbui-profile-configure-moves]");
  assert.ok(button);
  s.owner("trainer-b");
  button.click();
  assert.deepEqual(s.calls, []);
  assert.equal(s.doc.querySelector("[data-ppbui-pokemon-profile-window]").hidden, true, "stale A UI is closed");
});

test("Profile waits for asynchronous legacy claim and invalidates the result when its owner changes", async t => {
  const gate = deferred();
  let claims = 0;
  const movesetStore = {
    owner: () => owner,
    list: () => [],
    legacyCount: () => 1,
    claimLegacy: () => { claims++; return gate.promise; },
  };
  let owner = "trainer-a";
  const s = setupProfile(t, { movesetStore });
  await s.open();
  const button = s.doc.querySelector("[data-ppbui-profile-import-legacy-moves]");
  assert.ok(button);
  button.click();
  assert.equal(claims, 1);
  await Promise.resolve();
  assert.equal(button.isConnected, true, "import outcome must not be rendered before claim resolves");
  s.owner("trainer-b");
  owner = "trainer-b";
  gate.resolve(true);
  await tick();
  assert.equal(s.doc.querySelector("[data-ppbui-pokemon-profile-window]").hidden, true);
});

test("Profile displays a successful asynchronous legacy claim only after it resolves", async t => {
  const gate = deferred();
  let imported = false, calls = 0, owner = "trainer-a";
  const movesetStore = {
    owner: () => owner,
    list: () => imported ? [{ id: "remote", creatureId: "a", name: "Imported", marker: 1, moves: [{ id: "earthquake", name: "Earthquake" }] }] : [],
    legacyCount: () => imported ? 0 : 1,
    claimLegacy: async () => { calls++; await gate.promise; imported = true; return true; },
  };
  const s = setupProfile(t, { movesetStore });
  await s.open();
  const button = s.doc.querySelector("[data-ppbui-profile-import-legacy-moves]");
  button.click();
  assert.equal(calls, 1);
  assert.ok(button.isConnected, "pending import keeps the original UI until it resolves");
  gate.resolve();
  await tick();
  const status = s.doc.querySelector('[data-ppbui-profile-section-body="savedMoves"] > [data-ppbui-profile-status]');
  assert.ok(status);
  assert.equal(status.dataset.error, "false");
  assert.ok(status.textContent.trim().length > 0);
  assert.match(s.doc.querySelector("[data-ppbui-profile-saved]").textContent, /Imported/);
});

test("Profile observes another tab's owner-scoped Moveset changes without sync mutation churn", async t => {
  const s = setupProfile(t);
  await s.open();
  assert.equal(s.doc.querySelectorAll("[data-ppbui-profile-saved]").length, 0);
  const storageKey = "ppbui:team-movesets:v2:trainer-a:entry:other-tab";
  const record = {
    id: "other-tab", creatureId: "a", name: "Remote changes",
    marker: 1, moves: [{ id: "earthquake", name: "Earthquake" }],
  };
  s.win.localStorage.setItem(storageKey, JSON.stringify({ version: 1, record }));
  s.win.dispatchEvent(new s.win.StorageEvent("storage", { key: storageKey, storageArea: s.win.localStorage }));
  await new Promise(resolve => s.win.setTimeout(resolve, 25));
  await tick();
  assert.equal(s.doc.querySelectorAll("[data-ppbui-profile-saved]").length, 1);
  assert.match(s.doc.querySelector("[data-ppbui-profile-saved]").textContent, /Remote changes/);
  const observed = new s.win.MutationObserver(() => {});
  observed.observe(s.doc.body, { childList: true, subtree: true, attributes: true, characterData: true });
  s.mounted.sync();
  s.mounted.sync();
  assert.deepEqual(observed.takeRecords(), [], "stable sync remains quiescent after another tab's update");
  observed.disconnect();
});
