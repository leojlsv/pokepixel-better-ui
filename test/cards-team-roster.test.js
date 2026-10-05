import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createCardModeCards } from "../src/modules/card-mode/cards.js";

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

function fixture(t, { pendingFirst = false } = {}) {
  const dom = new JSDOM("<!doctype html><html lang=\"pt-BR\"><body></body></html>", {
    url: "https://pokepixel.nietore.com/play/", pretendToBeVisual: true,
  });
  const win = dom.window;
  const calls = [];
  const listeners = new Map();
  const team = [
    { id: "a", name: "Gengar", level: 101, hp: 100, max_hp: 100, exp: 1000, is_leader: true },
    { id: "b", name: "Lanturn", level: 99, hp: 100, max_hp: 100, exp: 2000, is_leader: false },
    { id: "c", name: "Snorlax", level: 88, hp: 0, max_hp: 100, exp: 3000, is_leader: false },
  ];
  const bus = {
    on(name, callback) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(callback);
    },
    off(name, callback) { listeners.get(name)?.delete(callback); },
    emit(name, data) { for (const callback of listeners.get(name) || []) callback(data); },
  };
  let release = null;
  let leaderId = "a";
  let gate = pendingFirst;
  win.PokeIdle = {
    PersistentHud: { _teamHud: { _creatures: team } },
    Bus: bus,
    Api: {
      async setTeamLeader(id) {
        calls.push(id);
        if (gate) {
          gate = false;
          await new Promise(resolve => { release = resolve; });
        }
        leaderId = id;
        team.forEach(member => { member.is_leader = member.id === id; });
        return { xp_share: null };
      },
      async getTeam() { return { team: { leader_id: leaderId } }; },
    },
  };
  const cards = createCardModeCards({ win });
  cards.setMode("cards");
  cards.render(null);
  t.after(() => { cards.cleanup(); win.close(); });
  const find = selector => win.document.querySelector(selector);
  return {
    win, cards, team, calls, bus, listeners, find,
    release: () => release?.(),
    nativeLeader(id, { emit = true } = {}) {
      team.forEach(member => { member.is_leader = member.id === id; });
      if (emit) bus.emit("combat.leader_changed", { creature_id: id });
    },
  };
}

test("deprecated Fast A/B does not render or subscribe reward-driven leader actions", async t => {
  const f = fixture(t);
  assert.equal(f.find("[data-card-quick-leader]"), null);
  assert.equal(f.find("[data-card-quick-auto]"), null);
  assert.equal(f.find("[data-card-quick-toggle]"), null);
  assert.equal(f.find("[data-card-quick-select]"), null);
  assert.equal(f.win.document.querySelectorAll('[role="switch"]').length, 0);
  assert.equal(f.listeners.has("hunt.kill_reward"), false);
  assert.equal(f.listeners.has("hunt.rewards"), false);

  f.bus.emit("loot.received", { creature_id: "a", pokemon_exp: 150, pokemon_exp_total: 1150 });
  f.bus.emit("hunt.kill_reward", { kills: [{ seq: 1, pokemon_exp: 150 }] });
  f.bus.emit("hunt.rewards", { kills: 1 });
  f.bus.emit("xp_share.confirmed", { recipients: [{ creature_id: "b", exp: 2200 }] });
  f.team[0].exp += 150;
  f.cards.render(null);
  await settle();
  assert.deepEqual(f.calls, [], "native rewards never request gameplay changes");
  assert.equal(f.find('[data-card-team-member="a"]').getAttribute("aria-pressed"), "true");
  assert.equal(f.find('[data-card-team-member="c"]').disabled, true, "native faint guard remains");

  f.find('[data-card-team-member="b"]').click();
  await settle();
  assert.deepEqual(f.calls, ["b"], "only a deliberate roster click requests a switch");
  assert.equal(f.find('[data-card-team-member="b"]').getAttribute("aria-pressed"), "true");
});

test("Team roster keeps focus after an acknowledged switch, without stealing deliberate external focus", async t => {
  const f = fixture(t, { pendingFirst: true });
  const b = f.find('[data-card-team-member="b"]');
  b.focus();
  b.click();
  assert.deepEqual(f.calls, ["b"]);
  assert.equal(f.find('[data-card-team-member="b"]').disabled, true, "POST in flight locks Team");
  f.release();
  await settle();
  assert.equal(f.win.document.activeElement?.dataset?.cardTeamMember, "b");
  assert.equal(f.find('[data-card-control-status="team"]').textContent, "Ativo atualizado");

  const second = fixtureNested(t);
  const first = second.find('[data-card-team-member="b"]');
  const external = second.find('[data-card-story-tab="loot"]');
  first.focus();
  first.click();
  external.focus();
  second.release();
  await settle();
  assert.equal(second.win.document.activeElement, external);
});

function fixtureNested(t) {
  return fixture(t, { pendingFirst: true });
}

test("native HUD synchronization fences a second Team action until an explicit leader flag changes", async t => {
  const f = fixture(t);
  f.win.PokeIdle.Api.setTeamLeader = async id => {
    f.calls.push(id);
    return {};
  };
  const b = f.find('[data-card-team-member="b"]');
  b.focus();
  b.click();
  await settle();
  assert.deepEqual(f.calls, ["b"]);
  assert.equal(f.find('[data-card-team-member="a"]').disabled, true);
  assert.equal(f.find('[data-card-team-member="b"]').disabled, true);
  assert.match(f.find('[data-card-control-status="team"]').textContent, /aguardando Team HUD/);
  f.find('[data-card-team-member="b"]').click();
  assert.deepEqual(f.calls, ["b"]);
  f.team.forEach(member => { member.is_leader = false; });
  f.team.unshift(f.team.splice(1, 1)[0]);
  f.cards.render(null);
  assert.equal(f.find('[data-card-team-member="b"]').disabled, true,
    "array position cannot stand in for authoritative is_leader");
  f.team[0].is_leader = true;
  f.cards.render(null);
  assert.equal(f.find('[data-card-team-member="b"]').disabled, false);
  assert.equal(f.find('[data-card-control-status="team"]').textContent, "Ativo atualizado");
  assert.equal(f.win.document.activeElement?.dataset?.cardTeamMember, "b");
});

test("Team controls do not fake HUD confirmation when native event dispatch is missing", async t => {
  const f = fixture(t);
  f.win.PokeIdle.Api.setTeamLeader = async id => { f.calls.push(id); return {}; };
  f.win.PokeIdle.Bus.emit = () => { throw new Error("native bus unavailable"); };
  f.find('[data-card-team-member="b"]').click();
  await settle();
  assert.deepEqual(f.calls, ["b"]);
  assert.equal(f.find('[data-card-team-member="b"]').disabled, true);
  assert.match(f.find('[data-card-control-status="team"]').textContent, /atualização não chegou ao Team/);
});

test("failed native POST leaves the original leader active and does not queue retries", async t => {
  const f = fixture(t);
  f.win.PokeIdle.Api.setTeamLeader = async id => {
    f.calls.push(id);
    throw new Error("native cooldown");
  };
  f.find('[data-card-team-member="b"]').click();
  await settle();
  assert.deepEqual(f.calls, ["b"]);
  assert.equal(f.find('[data-card-control-status="team"]').textContent, "Troca indisponível");
  assert.equal(f.find('[data-card-team-member="a"]').getAttribute("aria-pressed"), "true");
  assert.equal(f.find('[data-card-team-member="b"]').disabled, false);
});

test("delayed POST cannot project an obsolete leader over an external change or ABA", async t => {
  for (const sequence of [["c"], ["c", "a"]]) {
    const f = fixture(t, { pendingFirst: true });
    const emitted = [];
    const originalEmit = f.bus.emit;
    let completePost;
    f.win.PokeIdle.Api.setTeamLeader = id => {
      f.calls.push(id);
      return new Promise(resolve => { completePost = () => resolve({ xp_share: null }); });
    };
    f.bus.emit = (name, data) => {
      if (name === "team.updated") emitted.push(data);
      originalEmit(name, data);
    };
    f.find('[data-card-team-member="b"]').click();
    for (const id of sequence) f.nativeLeader(id);
    // Server response is accepted, but the native event must not overwrite a newer leader.
    completePost();
    await settle();
    assert.equal(f.team.find(member => member.is_leader)?.id, sequence.at(-1));
    assert.equal(emitted.some(data => data?.leader_id === "b"), false);
    assert.match(f.find('[data-card-control-status="team"]').textContent, /Outro líder foi ativado/);
  }
});

test("silent external native leader state supersedes delayed POST without a Bus event", async t => {
  const f = fixture(t, { pendingFirst: true });
  const emitted = [];
  const originalEmit = f.bus.emit;
  let completePost;
  f.win.PokeIdle.Api.setTeamLeader = id => {
    f.calls.push(id);
    return new Promise(resolve => { completePost = () => resolve({ xp_share: null }); });
  };
  f.bus.emit = (name, data) => {
    if (name === "team.updated") emitted.push(data);
    originalEmit(name, data);
  };
  f.find('[data-card-team-member="b"]').click();
  f.nativeLeader("c", { emit: false });
  completePost();
  await settle();
  assert.equal(f.team.find(member => member.is_leader)?.id, "c");
  assert.deepEqual(emitted, []);
  assert.match(f.find('[data-card-control-status="team"]').textContent, /Outro líder foi ativado/);
});

test("native leader events refresh player without rebuilding history or unchanged roster nodes", t => {
  const f = fixture(t);
  const existing = f.find('[data-card-team-member="b"]');
  f.cards.render(null);
  assert.equal(f.find('[data-card-team-member="b"]'), existing);
  f.team[1].level = 100;
  f.cards.render(null);
  assert.notEqual(f.find('[data-card-team-member="b"]'), existing);
  assert.match(f.find('[data-card-team-member="b"]').getAttribute("aria-label"), /Lv\. 100/);

  const history = Array.from({ length: 700 }, (_, i) => ({
    atMs: i + 1, speciesId: "6", species: "Charizard", rarity: "epic", result: "fled", shiny: false,
  }));
  f.cards.render({ specialHistory: history, lootHistory: [] });
  const body = f.find("[data-card-attempt-body]");
  const first = body.querySelector("[data-attempt-column]");
  const signature = body.dataset.signature;
  f.nativeLeader("b");
  assert.equal(f.find('[data-card-field="player-name"]').textContent, "Lanturn");
  assert.equal(body.dataset.signature, signature);
  assert.equal(body.querySelector("[data-attempt-column]"), first);
});

test("locale and repeated unavailable-state renders keep one stable Team live region", t => {
  const f = fixture(t);
  f.team[1].name = f.team[0].name;
  f.team[1].level = f.team[0].level;
  f.cards.render(null);
  assert.match(f.find('[data-card-team-member="b"]').getAttribute("aria-label"), /^2, Gengar, Lv\. 101/);
  f.team.splice(0);
  f.cards.render(null);
  const status = f.find('[data-card-control-status="team"]');
  assert.equal(status.textContent, "Team indisponível");
  const observer = new f.win.MutationObserver(() => {});
  observer.observe(status, { childList: true, characterData: true, subtree: true });
  f.cards.render(null);
  f.cards.render(null);
  assert.equal(observer.takeRecords().length, 0);
  observer.disconnect();
  f.win.PokeIdle.Localization = { get: () => "en-US" };
  f.cards.render(null);
  assert.equal(status.textContent, "Team unavailable");
});
