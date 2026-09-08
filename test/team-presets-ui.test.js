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
  const dom = new JSDOM(`<div class="pokeidle-team-hud"><div class="pokeidle-team-hud__list"><div class="pokeidle-team-card is-leader" data-creature-id="a"><img src="https://example.test/a.png" alt="A"><span class="pokeidle-team-card__name">A</span><span class="pokeidle-team-card__compact-level">Lv.45</span><div class="pokeidle-team-card__hp-bar"><span class="pokeidle-team-card__bar-text">50 / 100</span></div><div class="pokeidle-team-card__xp-bar"><span class="pokeidle-team-card__bar-text pokeidle-team-card__bar-text--xp">25%</span></div></div></div></div>`, { pretendToBeVisual: true });
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
  assert.deepEqual(actions.map(button => button.textContent), ["⚙", "▶"]);
  assert.equal(actions[1].dataset.primary, "true");
  assert.equal(members.length, 6);
  assert.deepEqual(members.map(node => node.querySelector("[data-ppbui-team-presets-member-position]").textContent), ["1", "2", "3", "4", "5", "6"]);
  assert.equal(members[4].dataset.active, "true"); assert.equal(members[0].dataset.active, "false");
  assert.match(preview.getAttribute("aria-label"), /5\. E · Ativo/);
});

test("Team preset preview mirrors live Team HUD sprite level and HP/EXP bars without cloning native cards", t => {
  const { dom, root } = hudDom();
  const controller = mountTeamPresets(root, { store: store(), apply: async () => ({ ok: true }), capture: async () => ({ ok: true, snapshot: preset }) });
  t.after(() => { controller.cleanup(); dom.window.close(); });
  root.querySelector(".ppbui-team-presets-toggle").click();
  const first = root.querySelector("[data-ppbui-team-presets-member]");
  assert.equal(first.querySelector("img").src, "https://example.test/a.png");
  assert.equal(first.querySelector("[data-ppbui-team-presets-member-level]").textContent, "Lv.45");
  const bars = first.querySelector("[data-ppbui-team-presets-member-bars]");
  assert.equal(bars.hidden, false);
  assert.equal(bars.querySelector("[data-ppbui-team-presets-member-hp] > i").style.width, "50%");
  assert.equal(bars.querySelector("[data-ppbui-team-presets-member-xp] > i").style.width, "25%");
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
  assert.equal(first.querySelector("[data-ppbui-team-presets-member-hp] > i").style.width, "0%");
  assert.equal(first.querySelector("[data-ppbui-team-presets-member-xp] > i").style.width, "80%");
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
  assert.match(css, /background:#63c95a/);
  assert.match(css, /background:#4e91df/);
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
  assert.match(css, /opacity:0; pointer-events:none/);
  assert.match(css, /:hover \[data-ppbui-team-preset-member-controls\].*opacity:1; pointer-events:auto/s);
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
  const member = members.firstChild, visual = member.firstChild, controls = member.lastChild;
  const cardPadding = parseFloat(cardStyle.padding) * 2, border = 2;
  const slotWidth = (260 - cardPadding - border - 5 * parseFloat(style(members).gap)) / 6;
  assert.equal(style(controls).display, "grid");
  assert.equal(style(controls).gridTemplateColumns, "repeat(3,minmax(0,1fr))");
  for (const button of controls.children) {
    assert.equal(style(button).width, "100%", "must override native 24px icon width");
    assert.equal(parseFloat(style(button).minWidth), 0);
    assert.equal(style(button).boxSizing, "border-box");
  }
  assert.ok((slotWidth - 2 * parseFloat(style(controls).gap)) / 3 >= 10, "three controls fit the slot");
  const memberHeight = parseFloat(style(visual).height) + parseFloat(style(controls).height) + parseFloat(style(member).gap);
  const [head, meta] = cardStyle.gridTemplateRows.split(" ").map(parseFloat);
  assert.ok(head + meta + memberHeight + 2 * parseFloat(cardStyle.gap) + cardPadding + border <= 124);
  assert.equal(style(visual).boxSizing, "border-box");
  assert.equal(style(card.querySelector("[data-ppbui-team-preset-card-foot]")).gridRow, "2");
  assert.equal(style(controls).visibility, "visible", "opacity hides controls while leaving them keyboard-focusable");
});
