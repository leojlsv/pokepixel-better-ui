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

test("Team HUD preset preview renders a sprite sourced from native background-image", t => {
  const { dom, root } = hud();
  const controller = mountTeamPresets(root, { store: onePresetStore(), apply: async () => ({ ok: true }), capture: async () => ({ ok: true }) });
  t.after(() => { controller.cleanup(); dom.window.close(); });
  root.querySelector(".ppbui-team-presets-toggle").click();
  const member = root.querySelector("[data-ppbui-team-presets-member]");
  assert.equal(member.querySelector("img")?.src, spriteUrl);
  assert.equal(member.querySelector("[data-ppbui-team-presets-member-fallback]"), null);
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
  const controls = member.querySelector("[data-ppbui-team-preset-member-controls]");
  assert.equal(member.children[0], visual);
  assert.equal(member.children[1], controls);
  assert.equal(visual.querySelector("img")?.src, spriteUrl);
  assert.equal(visual.querySelector("[data-ppbui-team-preset-member-level]").textContent, "Lv.47");

  const css = teamRoot.querySelector('style[data-ppbui-module="team-presets-manager"]').textContent;
  assert.match(css, /grid-template-rows:40px 13px/);
  assert.match(css, /opacity:0; pointer-events:none/);
  assert.doesNotMatch(css.match(/\[data-ppbui-team-preset-member-controls\] \{[^}]+\}/)?.[0] || "", /position:absolute/);
});
