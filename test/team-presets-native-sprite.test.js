import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { mountTeamPresets } from "../src/modules/team-presets/controller.js";
import { currentTeamSnapshot, teamPresetHudMemberVisual } from "../src/modules/team-presets/dom.js";
import { mountTeamPresetManager } from "../src/modules/team-presets/manager.js";

const spriteUrl = "https://example.test/sprites/exeggutor.png";

function hud() {
  const dom = new JSDOM(`<div class="pokeidle-team-hud"><div class="pokeidle-team-hud__list"><div class="pokeidle-team-card is-leader" data-creature-id="a"><span class="pokemon-sprite" style="display:block;width:32px;height:32px;background-image:url('${spriteUrl}')"></span><span class="pokeidle-team-card__name">Exeggutor</span><span class="pokeidle-team-card__compact-level">Lv.47</span></div></div></div>`, { pretendToBeVisual: true });
  const root = dom.window.document.body.firstChild;
  dom.window.PokeIdle = {
    Localization: { get: () => "pt-BR" },
    PersistentHud: { _teamHud: { el: root, _creatures: [{ id: "a", name: "Exeggutor", level: 47, hp: 1014, max_hp: 1014, is_leader: true }] } },
  };
  return { dom, root };
}

function onePresetStore() {
  const preset = { id: "p1", name: "Gym", members: [{ id: "a", name: "Exeggutor", level: 47 }], activeId: "a", orderVerified: true };
  return {
    list: () => [{ ...preset, members: preset.members.map(member => ({ ...member })) }], reload: () => [],
    upsert: () => ({ created: true, preset }), replaceSnapshot: () => true, rename: () => true, remove: () => true,
    movePreset: () => true, moveMember: () => true, setActive: () => true, confirmOrder: () => true, isPersistent: () => true,
  };
}

test("native Team HUD background sprite is resolved and persisted in snapshots", t => {
  const { dom, root } = hud();
  t.after(() => dom.window.close());
  const visual = teamPresetHudMemberVisual(root, { id: "a", name: "Exeggutor" });
  assert.equal(visual.sprite, spriteUrl);
  assert.equal(visual.level, 47);
  const snapshot = currentTeamSnapshot(root);
  assert.equal(snapshot.members[0].sprite, spriteUrl);
  assert.equal(snapshot.members[0].level, 47);
});

test("Shared Stone status art is never captured as the saved Pokémon identity sprite", t => {
  const dom = new JSDOM(`<div class="pokeidle-team-hud"><div class="pokeidle-team-hud__list"><div class="pokeidle-team-card is-leader is-xp-share-carrier" data-creature-id="a"><div class="pokeidle-team-card__icon"><canvas class="pokeidle-team-card__charset"></canvas></div><span class="pokeidle-team-card__name">Exeggutor</span><span class="pokeidle-team-card__compact-level">Lv.47</span><span class="pokeidle-team-card__xp-share is-carrier"><img src="https://example.test/items/shared-stone.png" alt=""><b>↗</b><small>×10</small></span></div></div></div>`, { pretendToBeVisual: true });
  t.after(() => dom.window.close());
  const root = dom.window.document.body.firstChild, canvas = root.querySelector("canvas");
  canvas.toDataURL = () => "data:image/png;base64,POKEMON";
  dom.window.PokeIdle = {
    Localization: { get: () => "pt-BR" },
    PersistentHud: { _teamHud: { el: root, _creatures: [{ id: "a", name: "Exeggutor", level: 47, hp: 1014, max_hp: 1014, is_leader: true }] } },
  };
  const visual = teamPresetHudMemberVisual(root, { id: "a", name: "Exeggutor" });
  assert.equal(visual.sprite, "data:image/png;base64,POKEMON");
  assert.notEqual(visual.sprite, "https://example.test/items/shared-stone.png");
  const snapshot = currentTeamSnapshot(root);
  assert.equal(snapshot.members[0].sprite, "data:image/png;base64,POKEMON");
  assert.notEqual(snapshot.members[0].sprite, "https://example.test/items/shared-stone.png");
});

test("legacy Saved Team Shared Stone sprites are repaired from the live Pokémon visual", t => {
  const dom = new JSDOM(`<div class="pokeidle-team-hud"><div class="pokeidle-team-hud__list"><div class="pokeidle-team-card is-leader is-xp-share-carrier" data-creature-id="a"><div class="pokeidle-team-card__icon"><canvas class="pokeidle-team-card__charset"></canvas></div><span class="pokeidle-team-card__name">Rhydon</span><span class="pokeidle-team-card__compact-level">Lv.167</span><span class="pokeidle-team-card__xp-share is-carrier"><img src="/img/items/shared-stone-kanto.png" alt=""><b>↗</b><small>×1</small></span></div></div></div>`, { url: "https://example.test/game", pretendToBeVisual: true });
  t.after(() => dom.window.close());
  const root = dom.window.document.body.firstChild, canvas = root.querySelector("canvas");
  canvas.toDataURL = () => "data:image/png;base64,RHYDON";
  dom.window.PokeIdle = {
    Localization: { get: () => "en" },
    PersistentHud: { _teamHud: { el: root, _creatures: [{ id: "a", name: "Rhydon", level: 167, hp: 100, max_hp: 100, is_leader: true }] } },
  };
  const stale = { id: "a", name: "Rhydon", level: 167, sprite: "https://example.test/img/items/shared-stone-kanto.png" };
  const read = teamPresetHudMemberVisual(root, stale);
  assert.equal(read.sprite, "data:image/png;base64,RHYDON");
  assert.notEqual(read.sprite, stale.sprite);
});

test("Saved Team rejects a stale auxiliary badge URL even when the asset name is opaque", t => {
  const dom = new JSDOM(`<div class="pokeidle-team-hud"><div class="pokeidle-team-hud__list"><div class="pokeidle-team-card" data-creature-id="a"><div class="pokeidle-team-card__icon"><canvas></canvas></div><span class="pokeidle-team-card__name">Rhydon</span><span class="pokeidle-team-card__xp-share is-recipient"><img src="https://cdn.example.test/a/opaque-asset.png" alt=""></span></div></div></div>`, { pretendToBeVisual: true });
  t.after(() => dom.window.close());
  const root = dom.window.document.body.firstChild;
  root.querySelector("canvas").toDataURL = () => "data:image/png;base64,RHYDON";
  dom.window.PokeIdle = { PersistentHud: { _teamHud: { el: root, _creatures: [{ id: "a", name: "Rhydon" }] } } };
  const visual = teamPresetHudMemberVisual(root, { id: "a", name: "Rhydon", sprite: "https://cdn.example.test/a/opaque-asset.png" });
  assert.equal(visual.sprite, "data:image/png;base64,RHYDON");
});

test("Shared Stone heuristic only inspects the asset basename, not Pokémon sprite query or directory text", t => {
  const dom = new JSDOM(`<div class="pokeidle-team-hud"><div class="pokeidle-team-hud__list"><div class="pokeidle-team-card" data-creature-id="a"><div class="pokeidle-team-card__icon"><canvas></canvas></div><span class="pokeidle-team-card__name">Rhydon</span><span class="pokeidle-team-card__xp-share" hidden><img src="/img/items/shared-stone-kanto.png" alt=""></span></div></div></div>`, { url: "https://example.test/game", pretendToBeVisual: true });
  t.after(() => dom.window.close());
  const root = dom.window.document.body.firstChild, canvas = root.querySelector("canvas"); let serializations = 0;
  canvas.toDataURL = () => { serializations++; return "data:image/png;base64,LIVE"; };
  dom.window.PokeIdle = { PersistentHud: { _teamHud: { el: root, _creatures: [{ id: "a", name: "Rhydon" }] } } };
  const genuine = "/sprites/shared-stone-notes/rhydon.png?note=shared-stone#shared-stone";
  const visual = teamPresetHudMemberVisual(root, { id: "a", name: "Rhydon", sprite: genuine });
  assert.equal(visual.sprite, genuine);
  assert.equal(serializations, 0, "a genuine saved Pokémon sprite must keep the saved fast path");
});

test("Team HUD preset preview renders a sprite sourced from native background-image", t => {
  const { dom, root } = hud();
  const controller = mountTeamPresets(root, { store: onePresetStore(), apply: async () => ({ ok: true }), capture: async () => ({ ok: true }) });
  t.after(() => { controller.cleanup(); dom.window.close(); });
  root.querySelector(".ppbui-team-presets-toggle").click();
  const member = root.querySelector("[data-ppbui-team-presets-member]");
  assert.equal(member.querySelector("img")?.src, spriteUrl);
  assert.equal(member.querySelector("[data-ppbui-team-presets-member-fallback]"), null);
  const tokens = [...root.querySelectorAll("[data-ppbui-team-presets-member]")];
  assert.equal(tokens.length, 6, "partial saved formations retain a stable six-position skeleton");
  assert.equal(tokens.filter(token => token.dataset.empty === "true").length, 5);
});

test("Team preset manager keeps maintenance controls in a separate row below the visual tile", t => {
  const { dom, root: hudRoot } = hud();
  const teamRoot = dom.window.document.createElement("div");
  teamRoot.className = "pokeidle-team-panel";
  teamRoot.innerHTML = `<div class="pokeidle-panel__body"><section class="team-section team-section--roster"></section></div>`;
  dom.window.document.body.append(teamRoot);
  const manager = mountTeamPresetManager(teamRoot, { store: onePresetStore(), hudRoot, apply: async () => ({ ok: true }), capture: async () => ({ ok: true }), runExclusive: task => task(), onChange: () => {} });
  t.after(() => { manager.cleanup(); dom.window.close(); });

  const member = teamRoot.querySelector("[data-ppbui-team-preset-member]");
  const visual = member.querySelector("[data-ppbui-team-preset-member-visual]");
  const controls = teamRoot.querySelector("[data-ppbui-team-preset-member-controls]");
  assert.equal(member.children[0], visual);
  assert.equal(member.contains(controls), false);
  assert.equal(controls.parentElement.dataset.ppbuiTeamPresetCardFoot, "");
  assert.equal(visual.querySelector("img")?.src, spriteUrl);
  assert.equal(visual.querySelector("[data-ppbui-team-preset-member-level]"), null);
  assert.ok(visual.classList.contains("ppbui-pokemon-card--preset"));
  assert.match(visual.getAttribute("aria-label"), /Lv\.47/, "saved Level stays available as snapshot metadata without consuming token geometry");
  const tokens = [...teamRoot.querySelectorAll("[data-ppbui-team-preset-member]")];
  assert.equal(tokens.length, 6);
  assert.equal(tokens.filter(token => token.dataset.empty === "true").length, 5, "manager preserves empty saved positions without fabricating members");

  const css = teamRoot.querySelector('style[data-ppbui-module="team-presets-manager"]').textContent;
  assert.match(css, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css, /font-size:var\(--ppbui-font-size-meta\)/);
  assert.equal(controls.querySelectorAll("button").length, 3);
  assert.doesNotMatch(css.match(/\[data-ppbui-team-preset-member-controls\] \{[^}]+\}/)?.[0] || "", /position:absolute/);
});
