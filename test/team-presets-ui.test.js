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

function hudDom() {
  const dom = new JSDOM(`<div class="pokeidle-team-hud"><div class="pokeidle-team-hud__list"><div class="pokeidle-team-card is-leader" data-creature-id="a" style="--element-color:#68c64a"><img src="https://example.test/a.png" alt="A"><span class="pokeidle-team-card__name">A</span><span class="pokeidle-team-card__compact-level">Lv.45</span><div class="pokeidle-team-card__hp-bar"><span class="pokeidle-team-card__bar-text">50 / 100</span></div><div class="pokeidle-team-card__xp-bar"><span class="pokeidle-team-card__bar-text pokeidle-team-card__bar-text--xp">25%</span></div></div></div></div>`, { pretendToBeVisual: true });
  const root = dom.window.document.body.firstChild;
  dom.window.PokeIdle = { Localization: { get: () => "pt-BR" }, PersistentHud: { _teamHud: { el: root, _creatures: [{ id: "a", is_leader: true, level: 45, hp: 50, max_hp: 100, exp: 125, exp_current_level: 100, exp_next_level: 200 }] } } };
  return { dom, root };
}

test("Team HUD preset disclosure really leaves layout when collapsed and restores on toggle", t => {
  const { dom, root } = hudDom();
  const controller = mountTeamPresets(root, { store: store([]), apply: async () => ({ ok: true }), capture: async () => ({ ok: true, snapshot: { members: [{ id: "a", name: "A" }], activeId: "a", orderVerified: true } }) });
  t.after(() => { controller.cleanup(); dom.window.close(); });
  const panel = root.querySelector("[data-ppbui-team-presets-panel]"), toggle = root.querySelector(".ppbui-team-presets-toggle");
  assert.equal(panel.hidden, true); assert.equal(panel.style.display, "none"); assert.equal(toggle.getAttribute("aria-expanded"), "false");
  toggle.click(); assert.equal(panel.hidden, false); assert.equal(panel.style.display, ""); assert.equal(toggle.getAttribute("aria-expanded"), "true");
  toggle.click(); assert.equal(panel.hidden, true); assert.equal(panel.style.display, "none"); assert.equal(toggle.getAttribute("aria-expanded"), "false");
});

test("Team HUD preset uses name and controls on first row with six official-order Pokémon below", t => {
  const { dom, root } = hudDom();
  const controller = mountTeamPresets(root, { store: store(), apply: async () => ({ ok: true }), capture: async () => ({ ok: true, snapshot: preset }) });
  t.after(() => { controller.cleanup(); dom.window.close(); });
  root.querySelector(".ppbui-team-presets-toggle").click();
  const row = root.querySelector("[data-ppbui-team-presets-row]");
  const head = row.querySelector("[data-ppbui-team-presets-row-head]");
  const actions = [...head.querySelectorAll("[data-ppbui-team-presets-row-actions] button")];
  const preview = row.querySelector("[data-ppbui-team-presets-members]");
  const members = [...preview.querySelectorAll("[data-ppbui-team-presets-member]")];

  assert.equal(head.querySelector("[data-ppbui-team-presets-name]").textContent, "Gym");
  assert.equal(head.querySelector("[data-ppbui-team-presets-count]").textContent, "6/6");
  assert.deepEqual(actions.map(button => button.textContent), ["↑", "↓", "⚙", "▶"]);
  assert.equal(actions[3].dataset.primary, "true");
  assert.equal(members.length, 6);
  assert.deepEqual(members.map(node => node.querySelector("[data-ppbui-team-presets-member-position]").textContent), ["1", "2", "3", "4", "5", "6"]);
  assert.equal(members[4].dataset.active, "true"); assert.equal(members[0].dataset.active, "false");
  assert.match(preview.getAttribute("aria-label"), /5\. E · Ativo/);
});

test("Team preset preview uses native element color instead of HP/EXP bars without cloning native cards", t => {
  const { dom, root } = hudDom();
  const controller = mountTeamPresets(root, { store: store(), apply: async () => ({ ok: true }), capture: async () => ({ ok: true, snapshot: preset }) });
  t.after(() => { controller.cleanup(); dom.window.close(); });
  root.querySelector(".ppbui-team-presets-toggle").click();
  const first = root.querySelector("[data-ppbui-team-presets-member]");
  assert.equal(first.querySelector("img").src, "https://example.test/a.png");
  assert.equal(first.querySelector("[data-ppbui-team-presets-member-level]").textContent, "Lv.45");
  const element = first.querySelector("[data-ppbui-team-presets-member-element]");
  assert.equal(element.style.getPropertyValue("--ppbui-element-color"), "#68c64a");
  assert.equal(first.querySelector("[data-ppbui-team-presets-member-bars]"), null);
  assert.equal(root.querySelectorAll(".pokeidle-team-card").length, 1, "preview must not duplicate the native Team HUD card class");
});

test("Team preset preview sync refreshes live state without rebuilding preview members", t => {
  const { dom, root } = hudDom();
  const controller = mountTeamPresets(root, { store: store(), apply: async () => ({ ok: true }), capture: async () => ({ ok: true, snapshot: preset }) });
  t.after(() => { controller.cleanup(); dom.window.close(); });
  root.querySelector(".ppbui-team-presets-toggle").click();
  const first = root.querySelector("[data-ppbui-team-presets-member]");
  const native = root.querySelector(".pokeidle-team-card");
  const creature = dom.window.PokeIdle.PersistentHud._teamHud._creatures[0];

  native.querySelector(".pokeidle-team-card__compact-level").textContent = "Lv.46";
  native.classList.add("is-fainted");
  Object.assign(creature, { level: 46, hp: 0, exp: 180, exp_current_level: 100, exp_next_level: 200 });
  controller.sync();

  assert.equal(root.querySelector("[data-ppbui-team-presets-member]"), first, "sync must keep the existing preview node");
  assert.equal(first.querySelector("[data-ppbui-team-presets-member-level]").textContent, "Lv.46");
  assert.equal(first.dataset.fainted, "true");
  assert.equal(first.querySelector("[data-ppbui-team-presets-member-element]").style.getPropertyValue("--ppbui-element-color"), "#68c64a");

});

test("Team HUD preset controls remain visually subordinate while Apply stays identifiable", t => {
  const { dom, root } = hudDom();
  const controller = mountTeamPresets(root, { store: store(), apply: async () => ({ ok: true }), capture: async () => ({ ok: true, snapshot: preset }) });
  t.after(() => { controller.cleanup(); dom.window.close(); });
  const css = root.querySelector('style[data-ppbui-module="team-presets"]').textContent;
  assert.match(css, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css, /opacity:\.58/);
  assert.match(css, /button\[data-primary="true"\]/);
  assert.match(css, /height:50px/);
  assert.match(css, /scrollbar-color:var\(--ui-gold-dark/);
  assert.match(css, /justify-content:center/);
  assert.match(css, /\[data-ppbui-team-presets-panel\]\[hidden\] \{ display:none!important; \}/);
  assert.doesNotMatch(css, /linear-gradient|border-radius/i, "Team Presets HUD must not introduce prohibited visual styling");
});

test("Team preset manager keeps 260x124 minimum cards and prioritizes composition over maintenance controls", t => {
  const dom = new JSDOM(`<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"><section class="team-section team-section--roster"></section></div></div>`);
  dom.window.document.documentElement.lang = "pt-BR";
  const root = dom.window.document.body.firstChild;
  const manager = mountTeamPresetManager(root, { store: store(), hudRoot: null, apply: async () => ({ ok: true }), capture: async () => ({ ok: true, snapshot: preset }), runExclusive: task => task(), onChange: () => {} });
  t.after(() => { manager.cleanup(); dom.window.close(); });
  const css = root.querySelector('style[data-ppbui-module="team-presets-manager"]').textContent;
  assert.match(css, /min-width:260px; min-height:124px/);
  assert.match(css, /height:22px!important/);
  assert.match(css, /background:#1d1d20/);
  assert.match(css, /border-color:#72cf64/);
  assert.match(css, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(css, /linear-gradient|border-radius/i, "Team Presets manager must not introduce prohibited visual styling");

  const card = root.querySelector("[data-ppbui-team-preset-card]");
  const members = [...card.querySelectorAll("[data-ppbui-team-preset-member]")];
  assert.equal(members.length, 6);
  assert.deepEqual(members.map(node => node.querySelector("[data-ppbui-team-preset-member-position]").textContent), ["1", "2", "3", "4", "5", "6"]);
  assert.deepEqual(members.map(node => node.querySelector("[data-ppbui-team-preset-member-level]").textContent), ["Lv.10", "Lv.11", "Lv.12", "Lv.13", "Lv.14", "Lv.15"]);
  assert.equal(members[4].dataset.active, "true");
  assert.match(members[4].getAttribute("aria-label"), /5\. E · Lv\.14 · Ativo/);
  assert.equal(card.querySelector("[data-ppbui-team-preset-card-meta] > span").textContent, "6/6");
  assert.equal(card.querySelector("[data-ppbui-team-preset-active-name]").textContent, "★ E");
  const icons = [...card.querySelectorAll("button")].map(button => button.textContent);
  for (const icon of ["↑", "↓", "×", "★", "↻", "▶"]) assert.ok(icons.includes(icon), `missing ${icon}`);
  assert.match(root.querySelector("[data-ppbui-team-preset-manager] > summary").textContent, /· 1$/);
});

test("Team preset manager recovers sprite and current level from Team HUD when saved metadata is incomplete", t => {
  const { dom, root: hudRoot } = hudDom();
  const doc = dom.window.document;
  const teamRoot = doc.createElement("div"); teamRoot.className = "pokeidle-team-panel"; teamRoot.innerHTML = `<div class="pokeidle-panel__body"><section class="team-section team-section--roster"></section></div>`; doc.body.append(teamRoot);
  const manager = mountTeamPresetManager(teamRoot, { store: store(), hudRoot, apply: async () => ({ ok: true }), capture: async () => ({ ok: true, snapshot: preset }), runExclusive: task => task(), onChange: () => {} });
  t.after(() => { manager.cleanup(); dom.window.close(); });

  const first = teamRoot.querySelector("[data-ppbui-team-preset-member]");
  assert.equal(first.querySelector("img").src, "https://example.test/a.png");
  assert.equal(first.querySelector("[data-ppbui-team-preset-member-level]").textContent, "Lv.45");
  assert.doesNotMatch(first.textContent, /^A$/, "live HUD visual should replace the text-only fallback for the current member");
});

test("manager geometry fits six slots and their controls in a 260x124 card", t => {
  const dom = new JSDOM(`<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"></div></div>`);
  const root = dom.window.document.body.firstChild;
  const manager = mountTeamPresetManager(root, { store: store(), hudRoot: null });
  t.after(() => { manager.cleanup(); dom.window.close(); });
  const card = root.querySelector("[data-ppbui-team-preset-card]");
  const style = node => dom.window.getComputedStyle(node);
  const cardStyle = style(card), members = card.querySelector("[data-ppbui-team-preset-members]");
  const controls = card.querySelector("[data-ppbui-team-preset-member-controls]");
  assert.equal(card.querySelectorAll("[data-ppbui-team-preset-member-controls]").length, 1);
  assert.equal(controls.querySelectorAll("button").length, 3);
  for (const button of controls.querySelectorAll("button")) {
    assert.equal(style(button).width, "22px");
    assert.equal(style(button).height, "22px");
    assert.equal(style(button).boxSizing, "border-box");
  }
  const rows = cardStyle.gridTemplateRows.split(" ").map(parseFloat);
  assert.ok(rows.reduce((sum, row) => sum + row, 0) + 3 * parseFloat(cardStyle.gap) + 2 * parseFloat(cardStyle.padding) + 2 <= 124);
  assert.equal(style(card.querySelector("[data-ppbui-team-preset-card-foot]")).gridRow, "4");
  assert.equal(members.querySelectorAll("button").length, 6, "one selection target per Pokémon");
});

test("HUD preset ordering updates the manager and keeps member order and active unchanged", t => {
  const { dom, root } = hudDom();
  const panel = dom.window.document.createElement("div"); panel.className = "pokeidle-team-panel"; panel.innerHTML = '<div class="pokeidle-panel__body"></div>'; dom.window.document.body.append(panel);
  const entries = [preset, { ...preset, id: "p2", name: "Second" }];
  const saved = store(entries);
  saved.movePreset = (id, delta) => { const i = entries.findIndex(p => p.id === id); [entries[i], entries[i + delta]] = [entries[i + delta], entries[i]]; return true; };
  const controller = mountTeamPresets(root, { store: saved });
  t.after(() => { controller.cleanup(); dom.window.close(); });
  root.querySelector('[data-move-preset="1"]').click();
  assert.deepEqual([...root.querySelectorAll('[data-ppbui-team-presets-name]')].map(n => n.textContent), ['Second', 'Gym']);
  assert.deepEqual([...panel.querySelectorAll('[data-ppbui-team-preset-card-head] input')].map(n => n.value), ['Second', 'Gym']);
  assert.equal(root.querySelector('[data-move-preset="-1"]').disabled, true);
  const down = root.querySelectorAll('[data-move-preset="1"]'); assert.equal(down[1].disabled, true);
  assert.equal(entries[1].activeId, "e");
  assert.deepEqual(entries[1].members.map(m => m.id), ['a','b','c','d','e','f']);
});

test("Team minimum width is scoped to the mounted manager and restored on cleanup", t => {
  const dom = new JSDOM('<style>.pokeidle-panel { min-width:300px; }</style><div class="pokeidle-panel pokeidle-team-panel" style="width:300px"><div class="pokeidle-panel__body"></div></div><div id="other" class="pokeidle-panel"></div>');
  t.after(() => dom.window.close());
  const root = dom.window.document.querySelector('.pokeidle-team-panel');
  const manager = mountTeamPresetManager(root, { store: store(), hudRoot: null });
  assert.equal(dom.window.getComputedStyle(root).minWidth, '340px');
  assert.equal(dom.window.getComputedStyle(dom.window.document.getElementById('other')).minWidth, '300px');
  manager.cleanup();
  assert.equal(dom.window.getComputedStyle(root).minWidth, '300px');
});
