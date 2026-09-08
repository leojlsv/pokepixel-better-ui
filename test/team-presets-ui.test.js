import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { mountTeamPresets } from "../src/modules/team-presets/controller.js";
import { mountTeamPresetManager } from "../src/modules/team-presets/manager.js";

const preset = {
  id: "p1",
  name: "Gym",
  members: ["a", "b", "c", "d", "e", "f"].map((id, index) => ({ id, name: id.toUpperCase(), level: 10 + index })),
  activeId: "e",
  orderVerified: true,
};

function store(list = [preset]) {
  return {
    list: () => list.map(entry => ({ ...entry, members: entry.members.map(member => ({ ...member })) })),
    reload: () => list,
    upsert: () => ({ created: true, preset }),
    replaceSnapshot: () => true,
    rename: () => true,
    remove: () => true,
    movePreset: () => true,
    moveMember: () => true,
    setActive: () => true,
    confirmOrder: () => true,
    isPersistent: () => true,
  };
}

test("Team HUD preset disclosure really leaves layout when collapsed and restores on toggle", t => {
  const dom = new JSDOM(`<div class="pokeidle-team-hud"><div class="pokeidle-team-hud__list"><div class="pokeidle-team-card" data-creature-id="a"><span class="pokeidle-team-card__name">A</span></div></div></div>`, { pretendToBeVisual: true });
  const root = dom.window.document.body.firstChild;
  dom.window.PokeIdle = { Localization: { get: () => "pt-BR" }, PersistentHud: { _teamHud: { el: root, _creatures: [{ id: "a", is_leader: true }] } } };
  const controller = mountTeamPresets(root, { store: store([]), apply: async () => ({ ok: true }), capture: async () => ({ ok: true, snapshot: { members: [{ id: "a", name: "A" }], activeId: "a", orderVerified: true } }) });
  t.after(() => { controller.cleanup(); dom.window.close(); });
  const panel = root.querySelector("[data-ppbui-team-presets-panel]"), toggle = root.querySelector(".ppbui-team-presets-toggle");
  assert.equal(panel.hidden, true); assert.equal(panel.style.display, "none"); assert.equal(toggle.getAttribute("aria-expanded"), "false");
  toggle.click(); assert.equal(panel.hidden, false); assert.equal(panel.style.display, ""); assert.equal(toggle.getAttribute("aria-expanded"), "true");
  toggle.click(); assert.equal(panel.hidden, true); assert.equal(panel.style.display, "none"); assert.equal(toggle.getAttribute("aria-expanded"), "false");
});

test("Team HUD preset styling follows existing dark/gold hierarchy and uses compact icon actions", t => {
  const dom = new JSDOM(`<div class="pokeidle-team-hud"><div class="pokeidle-team-hud__list"><div class="pokeidle-team-card" data-creature-id="a"><span class="pokeidle-team-card__name">A</span></div></div></div>`);
  const root = dom.window.document.body.firstChild;
  dom.window.PokeIdle = { Localization: { get: () => "pt-BR" }, PersistentHud: { _teamHud: { el: root, _creatures: [{ id: "a", is_leader: true }] } } };
  const controller = mountTeamPresets(root, { store: store(), apply: async () => ({ ok: true }), capture: async () => ({ ok: true, snapshot: preset }) });
  t.after(() => { controller.cleanup(); dom.window.close(); });
  const css = root.querySelector('style[data-ppbui-module="team-presets"]').textContent;
  assert.match(css, /color:#d8d3ca/); assert.match(css, /var\(--ui-gold-light,#f1d681\)/); assert.match(css, /\[data-ppbui-team-presets-panel\]\[hidden\] \{ display:none!important; \}/);
  assert.equal(root.querySelector(".ppbui-team-presets-icon").textContent, "⚙");
  root.querySelector(".ppbui-team-presets-toggle").click();
  assert.equal(root.querySelector("[data-ppbui-team-presets-save] button").textContent, "+");
  assert.equal(root.querySelector("[data-ppbui-team-presets-row] button").textContent, "▶");
  assert.equal(root.querySelector("[data-ppbui-team-presets-name]").textContent, "Gym");
});

test("Team preset manager keeps 260x124 cards and converts secondary actions to native compact icons", t => {
  const dom = new JSDOM(`<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"><section class="team-section team-section--roster"></section></div></div>`);
  const root = dom.window.document.body.firstChild;
  const manager = mountTeamPresetManager(root, { store: store(), hudRoot: null, apply: async () => ({ ok: true }), capture: async () => ({ ok: true, snapshot: preset }), runExclusive: task => task(), onChange: () => {} });
  t.after(() => { manager.cleanup(); dom.window.close(); });
  const css = root.querySelector('style[data-ppbui-module="team-presets-manager"]').textContent;
  assert.match(css, /min-width:260px; min-height:124px/); assert.match(css, /background:#141416ed/); assert.match(css, /color:#d8d3ca/);
  const card = root.querySelector("[data-ppbui-team-preset-card]");
  assert.equal(card.querySelectorAll("[data-ppbui-team-preset-member]").length, 6);
  const icons = [...card.querySelectorAll("button")].map(button => button.textContent);
  for (const icon of ["↑", "↓", "×", "★", "↻", "▶"]) assert.ok(icons.includes(icon), `missing ${icon}`);
  assert.match(root.querySelector("[data-ppbui-team-preset-manager] > summary").textContent, /\(1\)$/);
});
