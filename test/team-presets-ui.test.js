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
    updatePreset: () => preset,
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

function deferred() {
  let resolve;
  const promise = new Promise(next => { resolve = next; });
  return { promise, resolve };
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

test("Team HUD preset uses one Apply per row plus the section-level Manage action", t => {
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
  assert.deepEqual(actions.map(button => button.textContent), ["Aplicar"]);
  assert.equal(actions[0].dataset.primary, "true");
  assert.equal(root.querySelectorAll(".ppbui-team-presets-manage").length, 1, "maintenance is exposed once at section level, not repeated per formation");
  assert.equal(root.querySelector("[data-move-preset]"), null, "preset-list ordering belongs only in the full Team manager");
  assert.equal(members.length, 6);
  assert.deepEqual(members.map(node => node.querySelector("[data-ppbui-team-presets-member-position]").textContent), ["1", "2", "3", "4", "5", "6"]);
  assert.equal(members[4].dataset.active, "true"); assert.equal(members[0].dataset.active, "false");
  assert.match(preview.getAttribute("aria-label"), /5\. E · Ativo/);
});

test("Team preset preview uses identity/order tokens without live combat telemetry", t => {
  const { dom, root } = hudDom();
  const controller = mountTeamPresets(root, { store: store(), apply: async () => ({ ok: true }), capture: async () => ({ ok: true, snapshot: preset }) });
  t.after(() => { controller.cleanup(); dom.window.close(); });
  root.querySelector(".ppbui-team-presets-toggle").click();
  const first = root.querySelector("[data-ppbui-team-presets-member]");
  assert.equal(first.querySelector("img").src, "https://example.test/a.png");
  assert.equal(first.querySelector("[data-ppbui-team-presets-member-level]"), null);
  assert.equal(first.querySelector("[data-ppbui-team-presets-member-hp]"), null);
  assert.equal(first.querySelector("[data-ppbui-team-presets-member-meter]"), null);
  assert.ok(first.classList.contains("ppbui-pokemon-card")); assert.ok(first.classList.contains("ppbui-pokemon-card--preset")); assert.ok(first.querySelector("[data-ppbui-team-presets-member-position]").classList.contains("ppbui-pokemon-card__position")); assert.ok(first.querySelector(".ppbui-pokemon-card__visual"));
  assert.equal(first.style.getPropertyValue("--ppbui-pokemon-card-accent"), "#68c64a");
  assert.equal(first.querySelector("[data-ppbui-team-presets-member-element]"), null);
  assert.equal(first.querySelector("[data-ppbui-team-presets-member-bars]"), null);
  assert.equal(root.querySelectorAll(".pokeidle-team-card").length, 1, "preview must not duplicate the native Team HUD card class");
});

test("Team preset preview ignores live HP, fainted and level churn without rebuilding identity tokens", t => {
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
  assert.equal(first.querySelector("[data-ppbui-team-presets-member-level]"), null);
  assert.equal(first.querySelector("[data-ppbui-team-presets-member-hp]"), null);
  assert.equal(first.querySelector("[data-ppbui-team-presets-member-meter]"), null);
  assert.equal(first.hasAttribute("data-fainted"), false);
  assert.equal(first.style.getPropertyValue("--ppbui-pokemon-card-accent"), "#68c64a");
  assert.equal(first.classList.contains("ppbui-pokemon-card--fainted"), false);

});

test("Team HUD quick recall keeps one section Manage and one semantic-primary Apply per preset", t => {
  const { dom, root } = hudDom();
  const controller = mountTeamPresets(root, { store: store(), apply: async () => ({ ok: true }), capture: async () => ({ ok: true, snapshot: preset }) });
  t.after(() => { controller.cleanup(); dom.window.close(); });
  const css = root.querySelector('style[data-ppbui-module="team-presets"]').textContent;
  root.querySelector(".ppbui-team-presets-toggle").click();
  const actions = root.querySelector("[data-ppbui-team-presets-row-actions]");
  assert.match(css, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css, /\[data-ppbui-team-presets-list\] \{[^}]*width:100%[^}]*min-width:0[^}]*scrollbar-gutter:auto/s, "Saved Team list must not reserve a permanent scrollbar gutter that leaves dead space after slot 6");
  assert.match(css, /\[data-ppbui-team-presets-members\] \{[^}]*width:100%[^}]*overflow:hidden[^}]*justify-self:stretch/s, "the six-member strip stretches through the full Saved Team row width without leaking decorative card overflow into a false scrollbar");
  assert.doesNotMatch(css, /\[data-ppbui-team-presets-list\] \{[^}]*scrollbar-gutter:stable/s, "a stable scrollbar gutter visibly shortens the six-slot strip when the list does not scroll");
  assert.match(css, /\[data-ppbui-team-presets-toolbar\] \{[^}]*gap:0[^}]*border:var\(--ppbui-separator-width\) solid var\(--ppbui-border\)[^}]*background:var\(--ppbui-bg-1\)/s, "disclosure and Manage read as one toolbar instead of two competing boxed buttons");
  assert.match(css, /\.ppbui-team-presets-toggle \{[^}]*border:0!important[^}]*background:transparent!important/s);
  assert.match(css, /\.ppbui-team-presets-manage \{[^}]*border-left:var\(--ppbui-separator-width\) solid var\(--ppbui-border\)!important[^}]*background:transparent!important/s);
  assert.doesNotMatch(css, /button\[data-primary="true"\][^{]*\{[^}]*background:var\(--ppbui-accent\)/s, "Team HUD must consume shared primary chrome instead of repainting Apply locally");
  assert.match(css, /\.ppbui-team-presets-(?:toggle|manage):disabled \{[^}]*color:var\(--ppbui-text-subtle\)!important/s, "integrated toolbar controls keep an explicit disabled presentation");
  assert.match(css, /height:44px/);
  assert.match(css, /border-radius:var\(--ppbui-radius\)/);
  assert.match(css, /var\(--ppbui-font-size-meta\)/);
  assert.doesNotMatch(css, /--ui-/);
  assert.doesNotMatch(css, /font-size:[7-9]px/);
  assert.equal(actions.classList.contains("ppbui-action-row"), true);
  assert.equal(actions.querySelector('[data-ppbui-team-preset-action="manage"]'), null);
  assert.equal(root.querySelector(".ppbui-team-presets-manage").classList.contains("ppbui-button"), true);
  assert.equal(actions.querySelector('[data-ppbui-team-preset-action="apply"]').classList.contains("ppbui-button--action"), false, "Manage and Apply share one visual height; primary remains semantic only");
  assert.equal(actions.querySelector('[data-ppbui-team-preset-action="apply"]').classList.contains("ppbui-button--primary"), true);
  const teamName = root.querySelector("[data-ppbui-team-presets-save] input");
  assert.ok(teamName.classList.contains("game-window__search") && teamName.classList.contains("ppbui-input"), "Team name field opts into the shared square native-field bridge");
  assert.equal(teamName.name, "ppbui-team-presets-save-name", "Better UI-owned Team name field exposes a stable form-field name for browser tooling/autofill");
  assert.match(css, /\.pokeidle-team-hud \[data-ppbui-team-presets\] \[data-ppbui-team-presets-save\] > input\.game-window__search\.ppbui-input \{[^}]*border:var\(--ppbui-border-width\) solid var\(--ppbui-accent\)!important[^}]*border-radius:var\(--ppbui-radius\)!important[^}]*background:var\(--ppbui-bg-0\)!important[^}]*box-shadow:none!important/s, "HUD Team name field must outrank hostile native panel fields with the square PPBUI accent edit boundary");
  assert.match(css, /\[data-ppbui-team-presets-list\] \{[^}]*scrollbar-gutter:auto/s);
  assert.match(css, /\[data-ppbui-team-presets-list\]::-webkit-scrollbar-thumb \{[^}]*border-radius:var\(--ppbui-radius\)!important[^}]*background:var\(--ppbui-scrollbar-thumb\)!important/s, "HUD Saved Teams vertical scroll must override the rounded gold/navy host scrollbar");
  assert.match(css, /\[data-ppbui-team-presets-panel\]\[hidden\] \{ display:none!important; \}/);
  assert.doesNotMatch(css, /\[data-ppbui-team-presets\] button \{/, "shared PPBUI button geometry must not be reimplemented locally");
  assert.doesNotMatch(css, /linear-gradient/i, "Team Presets HUD must not introduce prohibited visual styling");
});

test("Team preset manager fills the Team workspace with a contiguous six-member strip", t => {
  const dom = new JSDOM(`<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"><section class="team-section team-section--roster"></section><section class="team-section team-section--profile"></section><section class="team-section team-section--vitals"></section><section class="team-section team-section--attributes"></section></div></div>`);
  dom.window.document.documentElement.lang = "pt-BR";
  const root = dom.window.document.body.firstChild;
  const manager = mountTeamPresetManager(root, { store: store(), hudRoot: null, apply: async () => ({ ok: true }), capture: async () => ({ ok: true, snapshot: preset }), runExclusive: task => task(), onChange: () => {} });
  t.after(() => { manager.cleanup(); dom.window.close(); });
  const css = root.querySelector('style[data-ppbui-module="team-presets-manager"]').textContent;
  assert.equal(root.querySelector("[data-ppbui-team-preset-manager]").classList.contains("team-section"), false, "owned Saved Teams manager must not opt back into native team-section chrome");
  assert.match(css, /\[data-ppbui-team-preset-manager\] \{[^}]*border-radius:var\(--ppbui-radius\)!important[^}]*background:var\(--ppbui-bg-1\)!important[^}]*box-shadow:none!important/s);
  assert.match(css, /\.pokeidle-team-panel:has\(\[data-ppbui-team-preset-manager\]\) \{ min-width:min\(340px,calc\(100vw - 16px\)\)!important; \}/);
  assert.match(css, /\[data-ppbui-team-preset-card\] \{[^}]*width:100%[^}]*max-width:none[^}]*padding:0[^}]*border:0[^}]*border-top:var\(--ppbui-separator-width\) solid var\(--ppbui-border\)/s);
  assert.match(css, /\[data-ppbui-team-preset-manager\] \{[^}]*align-self:stretch[^}]*width:100%!important[^}]*max-width:none!important[^}]*margin:var\(--ppbui-space-2\) 0 0!important[^}]*padding:0!important/s, "Saved Teams must neutralize residual native team-section margins/padding and stretch across the available Team width");
  assert.match(css, /border-radius:var\(--ppbui-radius\)!important/);
  const memberVisual = root.querySelector("[data-ppbui-team-preset-member-visual]");
  assert.ok(memberVisual.classList.contains("ppbui-pokemon-card"), "member visual delegates state chrome to the shared Pokémon-card primitive");
  assert.ok(memberVisual.classList.contains("ppbui-pokemon-card--preset"), "Saved Formation uses the identity-token geometry instead of the live Team card geometry");
  assert.match(css, /var\(--ppbui-success\)/);
  assert.match(css, /\[data-ppbui-team-preset-members\] \{[^}]*grid-template-columns:repeat\(6,minmax\(0,1fr\)\)[^}]*gap:0/s);
  assert.match(css, /\[data-ppbui-team-preset-member-visual\]\.ppbui-pokemon-card--preset \{[^}]*width:100%!important[^}]*border-width:var\(--ppbui-separator-width\)!important/s);
  assert.doesNotMatch(css, /\.ppbui-button--primary[^}]*\{[^}]*background:var\(--ppbui-accent\)/s, "manager Apply delegates shared outlined primary chrome instead of repainting it locally");
  assert.match(css, /@media \(pointer:coarse\)[\s\S]*\[data-ppbui-team-preset-manager\] > summary \{ min-height:40px; \}/);
  assert.doesNotMatch(css, /--ui-|font-size:[7-9]px/);
  assert.doesNotMatch(css, /linear-gradient/i, "Team Presets manager must not introduce prohibited visual styling");
  assert.equal(root.querySelector(".team-section--profile").nextElementSibling, root.querySelector("[data-ppbui-team-preset-manager]"), "Saved teams follows the selected-member workspace now that Better UI hides native Vitals");

  const card = root.querySelector("[data-ppbui-team-preset-card]");
  assert.equal(card.classList.contains("team-section"), false, "owned Saved Team cards must not inherit native team-section margin/padding/radius chrome");
  const nameField = card.querySelector("[data-ppbui-team-preset-name-field]"), rename = nameField.querySelector("input");
  assert.equal(nameField.querySelector("span").textContent, "Nome do time", "saved-team rename has a persistent visible label instead of a raw text box");
  assert.ok(nameField.classList.contains("ppbui-field"));
  assert.ok(rename.classList.contains("game-window__search") && rename.classList.contains("ppbui-input"), "Saved Team rename field uses shared PPBUI field chrome");
  assert.match(rename.name, /^ppbui-team-preset-rename-/, "each Saved Team rename field exposes a browser-recognizable name");
  const members = [...card.querySelectorAll("[data-ppbui-team-preset-member]")];
  assert.equal(members.length, 6);
  assert.deepEqual(members.map(node => node.querySelector("[data-ppbui-team-preset-member-position]").textContent), ["1", "2", "3", "4", "5", "6"]);
  assert.equal(card.querySelectorAll("[data-ppbui-team-preset-member-level]").length, 0, "saved identity tokens do not project Level telemetry into the formation row");
  assert.equal(card.querySelectorAll("[data-ppbui-team-preset-member-hp], [data-ppbui-team-preset-member-meter]").length, 0, "saved identity tokens do not project live HP telemetry");
  assert.equal(members[4].dataset.active, "true");
  assert.ok(members[4].querySelector("[data-ppbui-team-preset-member-visual]").classList.contains("ppbui-pokemon-card--active"));
  assert.ok(members.every(node => node.querySelector("[data-ppbui-team-preset-member-visual]").classList.contains("ppbui-pokemon-card")));
  assert.equal(members[0].querySelector("[data-ppbui-team-preset-member-visual]").classList.contains("pokeidle-btn"), false, "generated Saved Team member cards must not inherit native button chrome");
  assert.match(members[4].getAttribute("aria-label"), /5\. E · Lv\.14 · Ativo/);
  assert.equal(card.querySelector("[data-ppbui-team-preset-card-meta] > span").textContent, "6/6");
  assert.equal(card.querySelector("[data-ppbui-team-preset-active-name]").textContent, "Ativo: E");
  assert.deepEqual([...card.querySelectorAll("[data-direction]")].map(button => button.dataset.direction), ["left", "right"], "single-preset manager hides irrelevant preset-order buttons");
  assert.equal(card.querySelector('[data-active-control="true"]').textContent, "Definir como ativo");
  assert.ok(card.querySelector('[data-active-control="true"]').classList.contains("ppbui-button--primary"), "actionable saved-member activation is a real primary action");
  assert.ok([...card.querySelectorAll("button")].some(button => button.textContent === "Aplicar"));
  assert.ok([...card.querySelectorAll("button")].some(button => button.textContent === "Atualizar time salvo"), "footer copy says what object will be overwritten");
  assert.equal([...card.querySelectorAll("button")].some(button => /[⚙▶★↻↑↓×]/u.test(button.textContent)), false);
  assert.match(root.querySelector("[data-ppbui-team-preset-manager] > summary").textContent, /· 1$/);
});

test("empty Team preset manager stays compact while preserving details semantics", t => {
  const dom = new JSDOM(`<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"><section class="team-section team-section--vitals"></section></div></div>`);
  const root = dom.window.document.body.firstChild, emptyStore = store([]);
  const manager = mountTeamPresetManager(root, { store: emptyStore, hudRoot: null });
  t.after(() => { manager.cleanup(); dom.window.close(); });
  const details = root.querySelector("[data-ppbui-team-preset-manager]"), css = root.querySelector('style[data-ppbui-module="team-presets-manager"]').textContent;
  assert.equal(details.tagName, "DETAILS"); assert.equal(details.dataset.empty, "true");
  assert.ok(details.querySelector("summary")); assert.ok(details.querySelector("[data-ppbui-team-preset-empty]"));
  assert.match(css, /\[data-ppbui-team-preset-manager\]\[data-empty="true"\] \{ padding:0; \}/);
  assert.match(css, /\[data-ppbui-team-preset-manager\] > summary \{[^}]*padding:var\(--ppbui-space-2\) var\(--ppbui-space-3\)/s);
  assert.match(css, /\[data-ppbui-team-preset-empty\] \{[^}]*margin:0[^}]*font-size:var\(--ppbui-font-size-meta\)/s);
});

test("Team preset manager may recover sprite art without replacing saved identity metadata", t => {
  const { dom, root: hudRoot } = hudDom();
  const doc = dom.window.document;
  const teamRoot = doc.createElement("div"); teamRoot.className = "pokeidle-team-panel"; teamRoot.innerHTML = `<div class="pokeidle-panel__body"><section class="team-section team-section--roster"></section></div>`; doc.body.append(teamRoot);
  const manager = mountTeamPresetManager(teamRoot, { store: store(), hudRoot, apply: async () => ({ ok: true }), capture: async () => ({ ok: true, snapshot: preset }), runExclusive: task => task(), onChange: () => {} });
  t.after(() => { manager.cleanup(); dom.window.close(); });

  const first = teamRoot.querySelector("[data-ppbui-team-preset-member]");
  assert.equal(first.querySelector("img").src, "https://example.test/a.png");
  assert.equal(first.querySelector("[data-ppbui-team-preset-member-level]"), null);
  assert.match(first.getAttribute("aria-label"), /Lv\.10/, "accessible snapshot metadata stays tied to the saved formation rather than live HUD level");
  assert.doesNotMatch(first.textContent, /^A$/, "live HUD visual should replace the text-only fallback for the current member");
});

test("Team preset manager ignores live HP and fainted churn because saved tokens are not combat telemetry", t => {
  const { dom, root: hudRoot } = hudDom();
  const doc = dom.window.document, teamRoot = doc.createElement("div");
  teamRoot.className = "pokeidle-team-panel"; teamRoot.innerHTML = `<div class="pokeidle-panel__body"><section class="team-section team-section--roster"></section></div>`; doc.body.append(teamRoot);
  const manager = mountTeamPresetManager(teamRoot, { store: store(), hudRoot, apply: async () => ({ ok: true }), capture: async () => ({ ok: true, snapshot: preset }), runExclusive: task => task(), onChange: () => {} });
  t.after(() => { manager.cleanup(); dom.window.close(); });

  const creature = dom.window.PokeIdle.PersistentHud._teamHud._creatures[0];
  const before = teamRoot.querySelector('[data-ppbui-team-preset-member-visual]');
  creature.hp = 40; creature.max_hp = 120; manager.sync();
  const afterNonFaintHit = teamRoot.querySelector('[data-ppbui-team-preset-member-visual]');
  assert.equal(afterNonFaintHit, before, "ordinary HP ticks must preserve manager card identity when the visible state is unchanged");

  creature.hp = 0; manager.sync();
  const fainted = teamRoot.querySelector('[data-ppbui-team-preset-member-visual]');
  assert.equal(fainted, before, "fainted transition must not rebuild a saved identity token");
  assert.equal(fainted.classList.contains("ppbui-pokemon-card--fainted"), false);

  creature.hp = 25; manager.sync();
  const revived = teamRoot.querySelector('[data-ppbui-team-preset-member-visual]');
  assert.equal(revived, before);
  assert.equal(revived.classList.contains("ppbui-pokemon-card--fainted"), false);
});

test("manager keeps member controls left and Update/Apply on the same footer row", t => {
  const dom = new JSDOM(`<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"></div></div>`);
  const root = dom.window.document.body.firstChild;
  const manager = mountTeamPresetManager(root, { store: store(), hudRoot: null });
  t.after(() => { manager.cleanup(); dom.window.close(); });
  const card = root.querySelector("[data-ppbui-team-preset-card]");
  const members = card.querySelector("[data-ppbui-team-preset-members]");
  const controls = card.querySelector("[data-ppbui-team-preset-member-controls]");
  assert.equal(card.querySelectorAll("[data-ppbui-team-preset-member-controls]").length, 1);
  assert.equal(controls.querySelectorAll("button").length, 3);
  assert.equal(controls.querySelectorAll(".ppbui-icon-button").length, 2);
  assert.equal(controls.querySelectorAll(".ppbui-icon-button--compact").length, 0, "move-member controls keep the standard 28px desktop target");
  assert.equal(controls.querySelector('[data-active-control="true"]').classList.contains("ppbui-button"), true);
  assert.equal(controls.querySelector('[data-active-control="true"]').classList.contains("ppbui-button--compact"), false);
  assert.equal(card.querySelector("[data-ppbui-team-preset-member-selection]"), null, "redundant Selected Pokémon text is removed from the compact maintenance row");
  assert.equal(controls.firstElementChild.getAttribute("data-direction"), "left", "member move/Active controls lead from the left edge");
  assert.equal(controls.children[1].dataset.activeControl, "true"); assert.equal(controls.lastElementChild.getAttribute("data-direction"), "right");
  const remove = card.querySelector(".ppbui-team-preset-delete"), apply = card.querySelector(".ppbui-button--primary");
  assert.equal(remove.classList.contains("ppbui-icon-button--compact"), false, "destructive delete keeps the standard icon target");
  assert.equal(card.querySelector('[data-ppbui-team-preset-card-head] [data-direction="up"]'), null, "single preset does not expose meaningless preset-order controls");
  assert.equal(apply.classList.contains("ppbui-button--action"), false, "Update and Apply share one standard footer height");
  assert.equal(members.querySelectorAll("button").length, 6, "one selection target per Pokémon");
  const foot = card.querySelector("[data-ppbui-team-preset-card-foot]"), footActions = foot.querySelector("[data-ppbui-team-preset-card-actions]");
  assert.equal(controls.parentElement, foot, "member maintenance is raised into the footer command row");
  assert.equal(footActions.parentElement, foot, "Update and Apply share that same command row");
  assert.equal(foot.firstElementChild, controls); assert.equal(foot.lastElementChild, footActions);
  assert.deepEqual([...footActions.querySelectorAll("button")].map(button => button.textContent), ["Update saved team", "Apply"]);
  const css = root.querySelector('style[data-ppbui-module="team-presets-manager"]').textContent;
  assert.match(css, /\[data-ppbui-team-preset-card\] \{[^}]*container-type:inline-size[^}]*container-name:ppbui-team-preset-card/s, "each Saved Team card owns its responsive container independently from the Team module");
  assert.match(css, /\[data-ppbui-team-preset-manager-grid\] \{[^}]*grid-template-columns:minmax\(0,1fr\)/s, "manager prioritizes one full-width preset card so the requested footer composition has room at normal Team width");
  assert.match(css, /\[data-ppbui-team-preset-card-foot\] \{[^}]*flex-wrap:wrap/s, "the footer keeps the normal-width row but may wrap from real intrinsic content pressure instead of a brittle hard breakpoint");
  assert.match(css, /\[data-ppbui-team-preset-card-foot\] > \[data-ppbui-team-preset-card-actions\] \{[^}]*flex-wrap:nowrap[^}]*margin-left:auto/s, "Update and Apply remain one action group when the footer needs to wrap");
  assert.doesNotMatch(css, /@container ppbui-team-preset-card \(max-width:359px\)/, "Saved Team footer responsiveness must not depend on a hard width unrelated to localized label pressure");
  assert.match(css, /\.pokeidle-team-panel \[data-ppbui-team-preset-manager\] \[data-ppbui-team-preset-name-field\] > input\.game-window__search\.ppbui-input,[\s\S]*border-color:var\(--ppbui-accent\)!important/s, "Saved Team name field selector must outrank the hostile host field bridge so the accent boundary survives live");
  assert.match(css, /\.pokeidle-team-panel \[data-ppbui-team-preset-manager\] input\.game-window__search\.ppbui-input,[\s\S]*border-radius:var\(--ppbui-radius\)!important[\s\S]*background:var\(--ppbui-bg-0\)!important/s, "Saved Teams Search/Team Name fields own the full square PPBUI chrome under hostile host CSS");
  assert.match(css, /\[data-ppbui-team-preset-manager\] \*::-webkit-scrollbar-thumb \{[^}]*border-radius:var\(--ppbui-radius\)!important[^}]*background:var\(--ppbui-scrollbar-thumb\)!important/s, "manager/composer vertical scrollbars must override legacy host scrollbar chrome");

  const memberCells = [...members.querySelectorAll("[data-ppbui-team-preset-member]")];
  const active = controls.querySelector('[data-active-control="true"]'), activeMember = memberCells[4].querySelector("button");
  activeMember.click();
  assert.equal(active.disabled, true); assert.equal(active.textContent, "Active"); assert.equal(active.dataset.current, "true");
  assert.equal(active.classList.contains("ppbui-button--primary"), false, "already-active is a status, not a disabled primary command");
  assert.match(css, /button\[data-active-control="true"\]\[data-current="true"\]:disabled \{[^}]*border:var\(--ppbui-separator-width\) solid var\(--ppbui-success\)!important[^}]*box-shadow:none!important[^}]*opacity:1!important/s, "current Active uses a flat success outline without the rejected special left rail");
  assert.doesNotMatch(css, /data-active-control="true"[^}]*border-left/s, "current Active must not retain the old green left-rail treatment");
  memberCells[0].querySelector("button").click();
  assert.equal(active.disabled, false); assert.equal(active.textContent, "Set active"); assert.equal(active.dataset.current, "false");
  assert.equal(active.classList.contains("ppbui-button--primary"), true);
});

test("Saved Team manager no longer projects dossier context into the Team window", t => {
  const exact = {
    id:"p-exact", name:"Exact Pikachu", activeId:"a2", orderVerified:false, updatedAt:2,
    members:[{ id:"x", name:"Raichu" }, { id:"a2", name:"Pikachu" }, { id:"z", name:"Snorlax" }],
  };
  const sameSpeciesOther = {
    id:"p-other", name:"Other Pikachu", activeId:"a", orderVerified:true, updatedAt:1,
    members:[{ id:"a", name:"Pikachu" }, { id:"q", name:"Gengar" }],
  };
  const dom = new JSDOM(`<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"><section class="team-section team-section--profile"><div class="team-detail__hero"></div><div class="ppbui-team-profile-controls"></div><section data-ppbui-team-movesets></section></section></div></div>`, { pretendToBeVisual:true, url:"https://pokepixel.nietore.com/play/" });
  const doc = dom.window.document, root = doc.body.firstChild, body = root.querySelector(".pokeidle-panel__body");
  const scene = { _panel:{ body }, _creatures:[{ id:"a", name:"Pikachu" }, { id:"a2", name:"Pikachu" }], _selectedId:"a2", _team:{ member_ids:["a","a2"], leader_id:"a" } };
  dom.window.SceneManager = { _scene:scene };
  dom.window.PokeIdle = { Localization:{ get:()=>"en" }, Api:{ async getCreatures(){ return { data:[] }; } } };
  const manager = mountTeamPresetManager(root, { store:store([sameSpeciesOther, exact]), hudRoot:null });
  t.after(() => { manager.cleanup(); dom.window.close(); });
  assert.equal(root.querySelector("[data-ppbui-team-profile-teams]"), null, "Team no longer embeds Pokémon-dossier Saved Team participation");
  scene._selectedId = "a"; manager.sync();
  assert.equal(root.querySelector("[data-ppbui-team-profile-teams]"), null, "switching selected Team member must not recreate the detached dossier projection");
  const oldProfile = root.querySelector(".team-section--profile");
  const nextProfile = doc.createElement("section"); nextProfile.className = "team-section team-section--profile"; nextProfile.innerHTML = '<div class="team-detail__hero"></div><div class="ppbui-team-profile-controls"></div>';
  oldProfile.replaceWith(nextProfile); manager.sync();
  assert.equal(root.querySelector("[data-ppbui-team-profile-teams]"), null, "native Team profile refresh remains free of dossier-owned context");
});

test("Pokémon dossier Saved Teams projection is mutation-free on stable sync", t => {
  const dom = new JSDOM(`<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"><section class="team-section team-section--profile"><div class="team-detail__hero"></div></section></div></div>`, { pretendToBeVisual:true });
  const root = dom.window.document.body.firstChild, body = root.querySelector(".pokeidle-panel__body");
  const scene = { _panel:{ body }, _creatures:[{ id:"a", name:"A" }], _selectedId:"a", _team:{ member_ids:["a"], leader_id:"a" } };
  dom.window.SceneManager = { _scene:scene }; dom.window.PokeIdle = { Localization:{ get:()=>"en" }, Api:{ async getCreatures(){ return { data:[] }; } } };
  const manager = mountTeamPresetManager(root, { store:store(), hudRoot:null });
  t.after(() => { manager.cleanup(); dom.window.close(); });
  const profile = root.querySelector(".team-section--profile"); let mutations = 0;
  const observer = new dom.window.MutationObserver(records => { mutations += records.length; }); observer.observe(profile, { subtree:true, childList:true, attributes:true, characterData:true });
  for (let index=0; index<6; index++) manager.sync();
  observer.disconnect(); assert.equal(mutations, 0);
});

test("Saved Team manager keeps Team free of empty dossier projection", t => {
  const dom = new JSDOM(`<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"><section class="team-section team-section--profile"><div class="team-detail__hero"></div><div class="ppbui-team-profile-controls"></div></section></div></div>`, { pretendToBeVisual:true });
  const root = dom.window.document.body.firstChild, body = root.querySelector(".pokeidle-panel__body");
  const scene = { _panel:{ body }, _creatures:[{ id:"a", name:"Pikachu" }], _selectedId:"a", _team:{ member_ids:["a"], leader_id:"a" } };
  dom.window.SceneManager = { _scene:scene }; dom.window.PokeIdle = { Localization:{ get:()=>"pt-BR" }, Api:{ async getCreatures(){ return { data:[] }; } } };
  const manager = mountTeamPresetManager(root, { store:store([]), hudRoot:null });
  t.after(() => { manager.cleanup(); dom.window.close(); });
  const profile = root.querySelector(".team-section--profile");
  assert.equal(profile.querySelector("[data-ppbui-team-profile-teams]"), null, "empty Saved Teams context belongs only to the dedicated Pokémon Profile");
});

test("manager exposes Edit and per-team collapse without mutating or losing the saved card state", t => {
  const dom = new JSDOM(`<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"></div></div>`, { pretendToBeVisual:true, url:"https://pokepixel.nietore.com/play/" });
  const root = dom.window.document.body.firstChild, saved = store(); let changeCalls = 0;
  dom.window.PokeIdle = { Localization:{ get:()=>"en" }, Api:{ async getCreatures(){ return { data:[] }; } } };
  const manager = mountTeamPresetManager(root, { store:saved, hudRoot:null, onChange:()=>changeCalls++ });
  t.after(() => { manager.cleanup(); dom.window.close(); });
  const card = root.querySelector('[data-ppbui-team-preset-card]'), collapse = card.querySelector('[data-ppbui-team-preset-collapse]'), body = card.querySelector('[data-ppbui-team-preset-card-body]');
  assert.equal(body.hidden, false); assert.equal(collapse.getAttribute("aria-expanded"), "true");
  collapse.click();
  assert.equal(body.hidden, true); assert.equal(collapse.getAttribute("aria-expanded"), "false"); assert.equal(changeCalls, 0, "collapse is local presentation state, not a Saved Team write");
  assert.ok(card.querySelector('[data-ppbui-team-preset-card-meta]'), "count/active summary remains visible when collapsed");
  manager.sync(); assert.equal(card.querySelector('[data-ppbui-team-preset-card-body]').hidden, true, "stable sync must preserve collapse state");
  const rename = card.querySelector('[data-ppbui-team-preset-name-field] input'); rename.value = "Gym renamed"; rename.dispatchEvent(new dom.window.Event("change"));
  const rerendered = root.querySelector('[data-ppbui-team-preset-card]'); assert.notEqual(rerendered, card); assert.equal(rerendered.querySelector('[data-ppbui-team-preset-card-body]').hidden, true, "a manager rerender must preserve collapse state by preset id");
  const nextCollapse = rerendered.querySelector('[data-ppbui-team-preset-collapse]'); nextCollapse.click();
  const edit = rerendered.querySelector('[data-ppbui-team-preset-edit]'); assert.equal(edit.textContent, "Edit"); edit.click();
  const panel = root.querySelector('[data-ppbui-team-preset-composer-panel]');
  assert.equal(panel.hidden, false); assert.equal(root.querySelector('[data-ppbui-team-preset-composer-name] input').value, "Gym");
  assert.deepEqual([...root.querySelectorAll('[data-ppbui-team-preset-composer-slot][data-filled="true"]')].map(node => node.dataset.memberId), ["a","b","c","d","e","f"]);
});

test("native Team body refresh keeps Saved Team controls connected with focus and caret intact", t => {
  const dom = new JSDOM(`<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"><section class="team-section team-section--profile"></section></div></div>`, { pretendToBeVisual:true, url:"https://pokepixel.nietore.com/play/" });
  const doc = dom.window.document, root = doc.body.firstChild, body = root.querySelector(".pokeidle-panel__body"), saved = store();
  const panel = { body, clearBody() { this.body.innerHTML = ""; } };
  dom.window.PokeIdle = {
    Localization:{ get:()=>"en" },
    ReactiveWindows:{ cached:()=>[{ _panel:panel }] },
    Api:{ async getCreatures(){ return { data:[] }; } },
  };
  const nativeClearBody = panel.clearBody, nativeAppendChild = body.appendChild;
  const manager = mountTeamPresetManager(root, { store:saved, hudRoot:null });
  t.after(() => { manager.cleanup(); dom.window.close(); });

  const details = root.querySelector("[data-ppbui-team-preset-manager]"), rename = details.querySelector("[data-ppbui-team-preset-name-field] input");
  rename.focus(); rename.value = "Gym draft"; rename.setSelectionRange(4, 8);
  assert.equal(doc.activeElement, rename); assert.deepEqual([rename.selectionStart, rename.selectionEnd], [4, 8]);

  const nativeRefresh = () => {
    panel.clearBody();
    const roster = doc.createElement("section"); roster.className = "team-section team-section--roster"; body.appendChild(roster);
    const profile = doc.createElement("section"); profile.className = "team-section team-section--profile"; body.appendChild(profile);
  };
  nativeRefresh();
  assert.equal(details.isConnected, true, "native clearBody must preserve the owned Saved Teams island instead of detaching it");
  assert.equal(body.lastElementChild, details, "native Team children continue to render before the persistent Saved Teams manager");
  assert.equal(doc.activeElement, rename, "native Team refresh must not steal focus from the active Saved Team field");
  assert.equal(rename.value, "Gym draft"); assert.deepEqual([rename.selectionStart, rename.selectionEnd], [4, 8], "typing caret/selection survives native Team refresh");

  manager.sync();
  assert.equal(details.querySelector("[data-ppbui-team-preset-name-field] input"), rename, "reconcile keeps the same interactive node after the native refresh");
  assert.equal(doc.activeElement, rename); assert.deepEqual([rename.selectionStart, rename.selectionEnd], [4, 8]);

  const edit = details.querySelector("[data-ppbui-team-preset-edit]"); edit.click();
  const composerName = details.querySelector("[data-ppbui-team-preset-composer-name] input");
  composerName.value = "Boss route"; composerName.focus(); composerName.setSelectionRange(2, 7);
  nativeRefresh(); manager.sync();
  assert.equal(details.querySelector("[data-ppbui-team-preset-composer-name] input"), composerName, "composer Team Name keeps node identity across native Team refresh");
  assert.equal(doc.activeElement, composerName); assert.equal(composerName.value, "Boss route"); assert.deepEqual([composerName.selectionStart, composerName.selectionEnd], [2, 7]);

  const search = details.querySelector("[data-ppbui-team-preset-composer-toolbar] input");
  search.value = "Pika"; search.focus(); search.setSelectionRange(4, 4);
  nativeRefresh(); manager.sync();
  assert.equal(details.querySelector("[data-ppbui-team-preset-composer-toolbar] input"), search, "composer Search stays live instead of being reconstructed");
  assert.equal(doc.activeElement, search); assert.equal(search.value, "Pika"); assert.deepEqual([search.selectionStart, search.selectionEnd], [4, 4]);

  const collapse = details.querySelector("[data-ppbui-team-preset-collapse]"), cardBody = details.querySelector("[data-ppbui-team-preset-card-body]");
  collapse.focus(); nativeRefresh(); manager.sync();
  assert.equal(doc.activeElement, collapse, "button focus survives a native refresh before activation");
  collapse.click(); assert.equal(cardBody.hidden, true, "the preserved control remains actionable after refresh");

  manager.cleanup();
  assert.equal(panel.clearBody, nativeClearBody, "cleanup restores the native Panel.clearBody method");
  assert.equal(body.appendChild, nativeAppendChild, "cleanup restores the native body appendChild method");
});

test("manager exposes local pending/rename feedback and disables its own controls during async Apply", async t => {
  const dom = new JSDOM(`<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"></div></div>`);
  const root = dom.window.document.body.firstChild, saved = store();
  let release;
  const runExclusive = task => new Promise(resolve => { release = async () => resolve(await task()); });
  const manager = mountTeamPresetManager(root, { store: saved, hudRoot: null, apply: async () => ({ ok: true }), capture: async () => ({ ok: true, snapshot: preset }), runExclusive });
  t.after(() => { manager.cleanup(); dom.window.close(); });
  const details = root.querySelector("[data-ppbui-team-preset-manager]"), card = details.querySelector("[data-ppbui-team-preset-card]");
  const applyButton = [...card.querySelectorAll("button")].find(button => button.textContent === "Apply"), localStatus = card.querySelector("[data-ppbui-team-preset-card-status]");
  applyButton.click(); await Promise.resolve();
  assert.equal(details.getAttribute("aria-busy"), "true"); assert.equal(applyButton.getAttribute("aria-busy"), "true"); assert.equal(applyButton.textContent, "Applying...");
  assert.equal(localStatus.textContent, "Applying team..."); assert.ok([...details.querySelectorAll("button,input")].every(node => node.disabled), "manager controls cannot accept conflicting operations while Apply is pending");
  await release(); await Promise.resolve(); await Promise.resolve();
  assert.equal(details.hasAttribute("aria-busy"), false); assert.equal(applyButton.hasAttribute("aria-busy"), false); assert.equal(applyButton.textContent, "Apply"); assert.equal(localStatus.textContent, "Team applied.");

  saved.rename = () => false;
  const rename = card.querySelector("[data-ppbui-team-preset-name-field] input"); rename.value = ""; rename.dispatchEvent(new dom.window.Event("change"));
  assert.equal(rename.value, "Gym"); assert.equal(localStatus.textContent, "Enter a team name."); assert.equal(localStatus.dataset.error, "true");

  saved.replaceSnapshot = () => false;
  const updateButton = [...card.querySelectorAll("button")].find(button => button.textContent === "Update saved team");
  updateButton.click(); await Promise.resolve();
  assert.equal(updateButton.textContent, "Updating..."); assert.equal(details.getAttribute("aria-busy"), "true");
  await release(); await Promise.resolve(); await Promise.resolve();
  assert.equal(details.hasAttribute("aria-busy"), false); assert.equal(updateButton.hasAttribute("aria-busy"), false); assert.equal(updateButton.textContent, "Update saved team");
  assert.equal(localStatus.textContent, "Could not update the saved team."); assert.equal(localStatus.dataset.error, "true");
});

test("pending HUD Save settling after cleanup cannot write or revive Saved Teams", async t => {
  const { dom, root } = hudDom(), saved = store([]), pending = deferred(); let writes = 0;
  saved.upsert = () => { writes += 1; return { created: true, preset }; };
  const controller = mountTeamPresets(root, { store: saved, capture: () => pending.promise });
  t.after(() => { controller.cleanup(); dom.window.close(); });
  const name = root.querySelector('[data-ppbui-team-presets-save] input'), save = root.querySelector('[data-ppbui-team-presets-save] button');
  name.value = "Late save"; save.click(); await Promise.resolve();
  controller.cleanup();
  pending.resolve({ ok: true, snapshot: preset }); await Promise.resolve(); await Promise.resolve();
  assert.equal(writes, 0, "a capture that completes after cleanup must not persist a preset");
  assert.equal(root.querySelector('[data-ppbui-team-presets]'), null, "settlement must not recreate the detached HUD controls");
});

test("captured HUD Apply cannot mutate the native Team after cleanup", async t => {
  const { dom,root }=hudDom();let applies=0;
  const controller=mountTeamPresets(root,{store:store(),apply:async()=>{applies+=1;return{ok:true};}});
  t.after(()=>dom.window.close());
  root.querySelector(".ppbui-team-presets-toggle").click();
  const apply=root.querySelector('[data-ppbui-team-preset-action="apply"]');
  controller.cleanup();apply.click();await Promise.resolve();
  assert.equal(applies,0,"a detached quick Apply cannot enter the authoritative Team mutation path");
});

test("pending manager Apply settling after cleanup cannot revive UI or native Team body guards", async t => {
  const dom = new JSDOM('<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"><section class="team-section team-section--profile"></section></div></div>');
  const root = dom.window.document.body.firstChild, body = root.querySelector('.pokeidle-panel__body'), saved = store(), pending = deferred();
  const panel = { body, clearBody() { this.body.innerHTML = ""; } }, nativeClearBody = panel.clearBody, nativeAppendChild = body.appendChild;
  dom.window.PokeIdle = { Localization:{ get:()=>"en" }, ReactiveWindows:{ cached:()=>[{ _panel:panel }] }, Api:{ async getCreatures(){ return { data:[] }; } } };
  const manager = mountTeamPresetManager(root, { store: saved, apply: () => pending.promise });
  t.after(() => { manager.cleanup(); dom.window.close(); });
  const details = root.querySelector('[data-ppbui-team-preset-manager]'), apply = [...details.querySelectorAll('button')].find(button => button.textContent === 'Apply');
  apply.click(); await Promise.resolve(); manager.cleanup();
  assert.equal(panel.clearBody, nativeClearBody); assert.equal(body.appendChild, nativeAppendChild); assert.equal(details.isConnected, false);
  pending.resolve({ ok:true }); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  assert.equal(details.isConnected, false, "settlement must not reconnect the cleaned manager");
  assert.equal(panel.clearBody, nativeClearBody, "settlement must not reinstall the native clearBody guard");
  assert.equal(body.appendChild, nativeAppendChild, "settlement must not reinstall the native appendChild guard");
});

test("pending manager Update settling after cleanup cannot replace the saved snapshot", async t => {
  const dom = new JSDOM('<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"></div></div>');
  const root = dom.window.document.body.firstChild, saved = store(), pending = deferred(); let replacements = 0;
  saved.replaceSnapshot = () => { replacements += 1; return true; };
  const manager = mountTeamPresetManager(root, { store: saved, capture: () => pending.promise });
  t.after(() => { manager.cleanup(); dom.window.close(); });
  const details = root.querySelector('[data-ppbui-team-preset-manager]'), update = [...details.querySelectorAll('button')].find(button => button.textContent === 'Update saved team');
  update.click(); await Promise.resolve(); manager.cleanup();
  pending.resolve({ ok:true, snapshot:preset }); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  assert.equal(replacements, 0, "a capture that completes after cleanup must not mutate saved state");
  assert.equal(details.isConnected, false, "settlement must not recreate the cleaned manager");
});

test("captured manager controls cannot synchronously mutate Saved Teams after cleanup", t => {
  const dom=new JSDOM('<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"></div></div>');
  const root=dom.window.document.body.firstChild,entries=[{...preset,orderVerified:false},{...preset,id:"p2",name:"Second"}],saved=store(entries),writes=[];
  saved.rename=(...args)=>{writes.push(["rename",...args]);return true;};
  saved.movePreset=(...args)=>{writes.push(["movePreset",...args]);return true;};
  saved.moveMember=(...args)=>{writes.push(["moveMember",...args]);return true;};
  saved.setActive=(...args)=>{writes.push(["setActive",...args]);return true;};
  saved.confirmOrder=(...args)=>{writes.push(["confirmOrder",...args]);return true;};
  const manager=mountTeamPresetManager(root,{store:saved,hudRoot:null});t.after(()=>dom.window.close());
  const card=root.querySelector('[data-ppbui-team-preset-card]');card.querySelectorAll('[data-ppbui-team-preset-member-visual]')[1].click();
  const rename=card.querySelector('[data-ppbui-team-preset-name-field] input'),down=card.querySelector('[data-direction="down"]'),right=card.querySelector('[data-ppbui-team-preset-member-controls] [data-direction="right"]'),active=card.querySelector('[data-active-control="true"]'),confirm=card.querySelector('.ppbui-is-warning');
  rename.value="Detached";manager.cleanup();
  rename.dispatchEvent(new dom.window.Event("change"));down.click();right.click();active.click();confirm.click();
  assert.deepEqual(writes,[],"detached rename/order/member/active/confirmation controls cannot reach the persistent store");
});

test("preset-list ordering is available only in Team manager and updates HUD order", t => {
  const { dom, root } = hudDom();
  const panel = dom.window.document.createElement("div"); panel.className = "pokeidle-team-panel"; panel.innerHTML = '<div class="pokeidle-panel__body"></div>'; dom.window.document.body.append(panel);
  const entries = [preset, { ...preset, id: "p2", name: "Second" }];
  const saved = store(entries);
  saved.movePreset = (id, delta) => { const i = entries.findIndex(p => p.id === id); [entries[i], entries[i + delta]] = [entries[i + delta], entries[i]]; return true; };
  const controller = mountTeamPresets(root, { store: saved });
  t.after(() => { controller.cleanup(); dom.window.close(); });
  root.querySelector(".ppbui-team-presets-toggle").click();
  assert.equal(root.querySelector("[data-move-preset]"), null);
  assert.equal(panel.querySelectorAll('[data-ppbui-team-preset-card] [data-direction="up"], [data-ppbui-team-preset-card] [data-direction="down"]').length, 4, "preset reorder controls appear only when ordering is meaningful");
  panel.querySelector('[data-ppbui-team-preset-card] [data-direction="down"]').click();
  assert.deepEqual([...root.querySelectorAll('[data-ppbui-team-presets-name]')].map(n => n.textContent), ['Second', 'Gym']);
  assert.deepEqual([...panel.querySelectorAll('[data-ppbui-team-preset-card-head] input')].map(n => n.value), ['Second', 'Gym']);
  assert.equal(panel.querySelector('[data-ppbui-team-preset-card] [data-direction="up"]').disabled, true);
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

test("saved-team deletion uses the native shop dialog and requires confirmed acceptance", async t => {
  const dom = new JSDOM('<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"></div></div>');
  const root=dom.window.document.body.firstChild, saved=store(); let calls=0,deleted=0,resolveDialog;
  saved.remove=()=>{deleted++;return true;};
  dom.window.confirm=()=>assert.fail('browser confirmation must not be used');
  dom.window.PokeIdle={Dialog:{confirm:(message,options)=>{calls++; assert.equal(options.danger,true);assert.equal(options.hint,'Gym');assert.equal(options.acceptLabel,'Delete'); return new Promise(resolve=>{resolveDialog=resolve;});}}};
  const manager=mountTeamPresetManager(root,{store:saved}); t.after(()=>{manager.cleanup();dom.window.close();});
  const remove=()=>root.querySelector('[data-ppbui-team-preset-card-head] button:last-child');
  remove().click();remove().click();assert.equal(calls,1);assert.equal(deleted,0);
  resolveDialog(false);await Promise.resolve();assert.equal(deleted,0);
  remove().click();resolveDialog(true);await Promise.resolve();assert.equal(deleted,1);
  remove().click();manager.cleanup();resolveDialog(true);await Promise.resolve();assert.equal(deleted,1);
});

test("missing or rejected native confirmation cannot delete saved teams", async t=>{
  const dom=new JSDOM('<div class="pokeidle-team-panel"><div class="pokeidle-panel__body"></div></div>'),root=dom.window.document.body.firstChild,saved=store();
  saved.remove=()=>assert.fail('must retain preset');
  const manager=mountTeamPresetManager(root,{store:saved});t.after(()=>{manager.cleanup();dom.window.close();});
  const remove=root.querySelector('[data-ppbui-team-preset-card-head] button:last-child');remove.click();
  assert.equal(root.querySelector('[data-ppbui-team-preset-manager-status]').dataset.error,'true');
  dom.window.PokeIdle={Dialog:{confirm:async()=>{throw new Error('unavailable');}}};remove.click();await Promise.resolve();
  assert.equal(root.querySelector('[data-ppbui-team-preset-manager-status]').dataset.error,'true');
});
