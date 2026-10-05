import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { mountTeam } from "../src/modules/team/controller.js";

const members = () => [
  { id: "a", name: "Pikachu", level: 20, power: 120, quality: "rare", elements: ["electric"], hp: 80, max_hp: 100, ivs: { hp: 20, atk: 22 }, atk: 40, def: 30, spa: 50, spd: 35, spe: 60 },
  { id: "b", name: "Marowak", level: 25, power: 160, quality: "epic", elements: ["ground"], hp: 0, max_hp: 120, ivs: { hp: 25, atk: 27 }, atk: 70, def: 65, spa: 25, spd: 45, spe: 30 },
];
const bodyMarkup = () => `<section class="team-section team-section--roster"><div class="team-slots">${Array.from({ length: 6 }, (_, index) => `<button class="team-slot"${index < 2 ? ` data-creature-id="${index === 0 ? "a" : "b"}"` : ""}>${index < 2 ? `<span class="team-slot__sprite">${index}</span>` : '<span class="team-slot__empty">+</span>'}</button>`).join("")}</div></section><section class="team-section team-section--profile"><div class="team-detail__hero"><div class="team-detail__info"><h2>Marowak</h2><div class="team-detail__level">Lv. 25</div><div class="team-detail__tags"><span class="pokeidle-element-icons"><span class="native-element-circle"><img src="ground.png" alt="Ground"></span></span><span class="team-quality quality-epic">Epic ×1.40 · IV 52/186</span></div></div></div><button class="pokeidle-ui-button team-configure-moves">Configure moves</button><button class="team-active-state">Active</button><div class="team-order-controls"><span class="team-order-label">Battle order Â· position 2</span><button class="pokeidle-btn team-order-button">â†</button><button class="pokeidle-btn team-order-button" disabled>â†’</button></div></section><section class="team-section team-section--vitals">Vitals</section><section class="team-section team-section--attributes">Stats</section><div class="team-actions"><button class="pokeidle-btn">Details</button><button class="pokeidle-btn pokeidle-btn--danger" disabled>Remove</button></div>`;

function setup(t) {
  const dom = new JSDOM(`<div class="pokeidle-team-panel" style="width:590px;height:680px"><div class="pokeidle-panel__body">${bodyMarkup()}</div><div class="pokeidle-resize-handle"></div></div>`, { url: "https://test.local", pretendToBeVisual: true });
  const root = dom.window.document.body.firstChild, body = root.firstChild;
  const scene = { _panel: { body }, _creatures: members(), _available: [
    { id: "c", name: "Bulbasaur", quality: "rare", hp: 50, max_hp: 50, elements: ["grass", "poison"] },
    { id: "d", name: "Gastly", quality: "epic", hp: 0, max_hp: 40, elements: ["ghost", "poison"] },
  ], _team: { member_ids: ["a", "b"], leader_id: "a" }, _selectedId: "b" };
  const colors = { electric: "#f7d02c", ground: "#e2bf65", grass: "#7ac74c", poison: "#a33ea1", ghost: "#735797" };
  const configureCalls = [];
  dom.window.SceneManager = { _scene: scene }; dom.window.PokeIdle = { Localization: { get: () => "pt-BR" }, DittoDisplayName: { get: member => member.name }, ElementIcons: { definition: element => ({ label: element, color: colors[element] }) }, MovesetConfig: { open: creatureId => configureCalls.push(String(creatureId)) } };
  root.querySelector(".team-configure-moves").addEventListener("click", () => dom.window.PokeIdle.MovesetConfig.open(scene._selectedId));
  const before = root.outerHTML, controller = mountTeam(root); t.after(() => { controller.cleanup(); dom.window.close(); });
  return { dom, root, body, scene, controller, before, configureCalls };
}

test("team overview enriches the six original slots without replacing their actions", t => {
  const s = setup(t), slots = [...s.root.querySelectorAll(".team-slot")]; let clicks = 0; slots[0].addEventListener("click", () => clicks++); slots[0].click();
  assert.equal(clicks, 1); assert.equal(slots.length, 6); assert.equal(slots[0].querySelector("[data-ppbui-team-level]").textContent, "Lv.20"); assert.equal(slots[0].querySelector("[data-ppbui-team-hp]").textContent, "80%"); assert.match(slots[0].getAttribute("aria-description"), /Pikachu/);
  assert.equal(slots[1].querySelector("[data-ppbui-team-level]").textContent, "Lv.25"); assert.equal(slots[1].querySelector("[data-ppbui-team-hp]").textContent, "0%"); assert.doesNotMatch(slots[1].textContent, /Derrotado/); assert.match(slots[1].getAttribute("aria-description"), /Derrotado/); assert.ok(slots[1].classList.contains("ppbui-team-fainted")); assert.equal(slots[2].querySelector("[data-ppbui-team-slot]"), null);
  assert.equal(s.root.querySelector(".team-detail__level").textContent, "Lv. 25", "native Level remains the single primary identity value when the host provides it");
  assert.equal(s.root.querySelector("[data-ppbui-team-profile-facts]"), null, "Team no longer injects dossier-only Pokémon facts");
  assert.equal(slots[0].dataset.creatureId, "a"); assert.equal(slots[1].dataset.creatureId, "b", "Team slots expose exact creature ids for the shared Pokémon hover/Profile entrypoint");
  assert.deepEqual(slots.map(slot => slot.querySelector("[data-ppbui-team-position]")?.textContent), ["1", "2", "3", "4", "5", "6"]);
  assert.ok(slots[0].classList.contains("ppbui-team-active")); assert.ok(slots[0].classList.contains("ppbui-pokemon-card--active")); assert.equal(slots[0].querySelector("[data-ppbui-team-active]"), null);
  assert.ok(slots[1].classList.contains("ppbui-team-selected")); assert.ok(slots[1].classList.contains("ppbui-pokemon-card--selected")); assert.equal(slots[1].querySelector("[data-ppbui-team-selected-marker]"), null);
  s.scene._selectedId = "a"; s.controller.sync(); assert.ok(slots[0].classList.contains("ppbui-team-selected")); assert.ok(slots[0].classList.contains("ppbui-team-active"));
});

test("Selected, Active, Fainted and Focus keep independent structural cues", t => {
  const s = setup(t), slot = s.root.querySelectorAll(".team-slot")[1];
  assert.ok(slot.classList.contains("ppbui-team-selected")); assert.ok(slot.classList.contains("ppbui-team-fainted"));
  assert.ok(slot.classList.contains("ppbui-pokemon-card--selected")); assert.ok(slot.classList.contains("ppbui-pokemon-card--fainted"));
  s.scene._team.leader_id = "b"; s.controller.sync();
  assert.ok(slot.classList.contains("ppbui-team-selected")); assert.ok(slot.classList.contains("ppbui-team-active")); assert.ok(slot.classList.contains("ppbui-team-fainted"));
  assert.ok(slot.classList.contains("ppbui-pokemon-card--selected")); assert.ok(slot.classList.contains("ppbui-pokemon-card--active")); assert.ok(slot.classList.contains("ppbui-pokemon-card--fainted"));
  assert.equal(slot.querySelector("[data-ppbui-team-selected-marker]"), null); assert.equal(slot.querySelector("[data-ppbui-team-active]"), null, "shared card states must not consume slot space with duplicate state text");
});

test("comparison is absent and repeated sync never reads comparison stats", t => {
  const s = setup(t);
  for (const member of s.scene._creatures) {
    for (const key of ["power", "quality", "quality_multiplier", "ivs", "atk", "def", "spa", "spd", "spe"]) {
      Object.defineProperty(member, key, { get() { assert.fail(`unexpected comparison read: ${key}`); } });
    }
  }
  for (const id of ["a", "b", "a", "b"]) {
    s.scene._selectedId = id; s.controller.sync();
    assert.equal(s.root.querySelector("[data-ppbui-team-compare]"), null);
  }
  const css = s.root.querySelector('style[data-ppbui-module="team"]').textContent;
  assert.doesNotMatch(css, /compare|positive|negative/);
  assert.equal(s.root.querySelector(".team-section--vitals").textContent, "Vitals", "native vitals node is preserved for exact cleanup");
  assert.doesNotMatch(css, /\.team-section--vitals \{[^}]*display:none!important/s, "Team returns native vitals ownership instead of hiding it for a dossier layout");
  assert.equal(s.root.querySelector(".team-section--attributes").textContent, "Stats", "native stats node is preserved for exact cleanup");
  assert.doesNotMatch(css, /\.team-section--attributes \{[^}]*display:none!important/s, "Team returns native attributes ownership instead of hiding it for a dossier layout");
});

test("Team returns to its compact management width and preserves responsive command controls", t => {
  const s = setup(t), css = s.root.querySelector('style[data-ppbui-module="team"]').textContent;
  assert.match(css, /min-width:min\(340px,calc\(100vw - 16px\)\)!important/);
  assert.match(css, /width:min\(480px,calc\(100vw - 16px\)\)!important/, "Team returns to the compact management surface now that Pokémon Profile owns the dossier");
  assert.match(css, /\.pokeidle-team-panel\[data-ppbui-team-enhanced\]:not\(\[data-ppbui-team-manual-height\]\) \{[^}]*min-height:0!important[^}]*height:auto!important[^}]*max-height:calc\(100vh - 16px\)!important/s);
  assert.match(css, /> \.pokeidle-panel__body \{[^}]*display:block!important[^}]*overflow-y:auto!important[^}]*font-family:var\(--ppbui-font-body\)!important/s);
  assert.match(css, /:not\(\[data-ppbui-team-manual-height\]\) > \.pokeidle-panel__body \{ flex:0 1 auto!important; max-height:calc\(100vh - 56px\); \}/);
  assert.match(css, /\[data-ppbui-team-manual-height\] > \.pokeidle-panel__body \{ flex:1 1 auto!important; max-height:none; \}/);
  assert.equal(s.root.style.height, "680px", "Better UI must not overwrite the native panel's inline geometry; content-fit is reversible CSS ownership");
  assert.match(css, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css, /@container \(max-width:439px\)[\s\S]*\.team-slots \{ grid-template-columns:repeat\(3,minmax\(0,1fr\)\); \}/, "Full Team may use 3x2 near minimum width instead of crushing management metadata into HUD-scale tracks");
  assert.match(css, /\.team-detail__hero \{[^}]*grid-template-columns:96px minmax\(0,1fr\)/s);
  assert.equal(s.root.querySelector(".ppbui-team-command-dock"), null, "Team no longer creates the dossier command dock");
  assert.equal(s.root.querySelector(".team-order-controls").parentElement, s.root.querySelector(".team-section--profile"));
  assert.match(css,/\.team-section--profile \{[^}]*display:grid!important[^}]*grid-template-columns:minmax\(0,1fr\) max-content max-content[^}]*grid-template-rows:auto var\(--ppbui-icon-button-size\)[^}]*align-items:center/s,"selected Team workspace pins native Configure Moves, Active and Battle order to one coherent command row");
  assert.match(css,/\.team-section--profile > button\.pokeidle-ui-button:not\(\.team-active-state\) \{[^}]*grid-column:1[^}]*grid-row:2[^}]*justify-self:start/s);
  assert.match(css,/\.team-active-state \{[^}]*grid-column:2[^}]*grid-row:2[^}]*justify-self:end[^}]*margin:0!important/s);
  assert.match(css,/\.team-order-controls \{[^}]*grid-column:3[^}]*grid-row:2[^}]*grid-template-columns:minmax\(32px,auto\) var\(--ppbui-icon-button-size\) var\(--ppbui-icon-button-size\)[^}]*justify-self:end/s);
  assert.match(css,/\.team-order-label \{[^}]*min-width:32px[^}]*min-height:var\(--ppbui-icon-button-size\)[^}]*place-items:center/s,"battle position reads as a compact value attached to the two native order actions");
  assert.equal(s.root.querySelector(".team-actions").parentElement, s.body, "native Details/Remove remain in their Team-owned location");
  assert.doesNotMatch(css, /\.team-section--vitals \{[^}]*display:none!important/s);
  assert.doesNotMatch(css, /\.team-section--attributes \{[^}]*display:none!important/s);
  assert.match(css, /@container \(max-width:519px\)/);
  assert.match(css, /> \.pokeidle-panel__body \{[^}]*padding:var\(--ppbui-space-2\) var\(--ppbui-space-4\) var\(--ppbui-space-4\)!important/s, "Team reduces the excessive gap above the roster");
  assert.match(css, /\.team-slots \{[^}]*align-items:stretch!important[^}]*margin:0!important[^}]*padding:0!important[^}]*overflow:hidden!important/s, "Team must neutralize the native 19px pedestal top padding instead of leaving the live structural gap in place");
  assert.match(css, /\.team-slot__xp-share \{[^}]*top:3px!important[^}]*right:3px!important[^}]*left:auto!important[^}]*border-radius:var\(--ppbui-radius\)!important[^}]*box-shadow:none!important/s, "native Shared Stone badge stays visible inside the Full Team card");
  assert.match(css, /\.team-slot__xp-share \{[^}]*grid-template-columns:18px auto[^}]*width:auto!important[^}]*min-width:22px!important/s, "Shared Stone carrier badge reserves intrinsic width for multi-digit counts without resizing the slot");
  assert.match(css, /\.team-slot__xp-share small \{[^}]*position:static!important[^}]*min-width:2\.5ch!important[^}]*white-space:nowrap/s, "Shared Stone count can grow to x10/x99 without an absolute-position collision");
  assert.match(css, /var\(--ppbui-font-size-meta\)/);
  assert.ok(s.root.querySelector(".team-slot").classList.contains("ppbui-pokemon-card")); assert.ok(s.root.querySelector(".team-slot").classList.contains("ppbui-pokemon-card--roster"));
  assert.ok(s.root.querySelector(".team-slot__sprite").classList.contains("ppbui-pokemon-card__visual"));
  assert.ok(s.root.querySelector("[data-ppbui-team-position]").classList.contains("ppbui-pokemon-card__position"));
  assert.ok(s.root.querySelector("[data-ppbui-team-slot]").classList.contains("ppbui-pokemon-card__meta"));
  assert.equal(s.root.querySelector("[data-ppbui-team-meter]"), null, "Full Team avoids duplicating the HP percentage with another nested meter");
  assert.match(css, /\.team-slot\.ppbui-pokemon-card--roster \{[^}]*min-height:62px!important[^}]*height:62px!important[^}]*overflow:visible!important[^}]*border:var\(--ppbui-border-width\) solid var\(--ppbui-pokemon-card-border\)!important;[^}]*border-top-color:var\(--ppbui-pokemon-card-top-border\)!important;[^}]*border-right-color:var\(--ppbui-pokemon-card-right-border\)!important;[^}]*border-bottom:var\(--ppbui-border-width\) solid var\(--ppbui-pokemon-card-bottom-border\)!important;[^}]*background:var\(--ppbui-bg-2\)!important;[^}]*box-shadow:none!important/s, "Full Team keeps compact navigation and flat semantic selected/active edges");
  assert.match(css, /\.team-slot > \[data-ppbui-team-slot\] \{ display:none!important; \}/, "Level/HP remain accessible in slot descriptions but visible telemetry moves into the selected Pokémon dossier");
  assert.match(css, /\.team-slot\.ppbui-pokemon-card--roster \+ \.team-slot\.ppbui-pokemon-card--roster \{ border-left:0!important; \}/);
  assert.match(css, /@container \(max-width:439px\)[\s\S]*\.team-slot\.ppbui-pokemon-card--roster:nth-child\(3n\+1\) \{ border-left:var\(--ppbui-border-width\) solid var\(--ppbui-pokemon-card-border\)!important; \}/);
  assert.match(css, /@container \(max-width:439px\)[\s\S]*\.team-slot\.ppbui-pokemon-card--roster:nth-child\(n\+4\) \{ border-top:0!important; \}/);
  assert.doesNotMatch(css, /\[data-ppbui-team-active\][^{]*\{/s, "active state no longer owns a visible slot badge");
  assert.match(css, /\.ppbui-team-picker-toolbar \{[^}]*display:grid[^}]*grid-template-columns:minmax\(140px,1fr\) minmax\(104px,132px\) minmax\(104px,132px\) auto/s, "Add Pokémon uses the approved one-row Search | Element | Rarity | Clear discovery rail at normal width");
  assert.match(css, /\.team-equip-picker\[data-ppbui-team-picker\] > \.pokeidle-panel__body \{[^}]*padding:0!important[^}]*background:var\(--ppbui-bg-0\)!important/s, "picker body joins the PPBUI shell instead of retaining native card chrome");
  assert.match(css, /\.team-equip-picker\[data-ppbui-team-picker\] \.team-equip-picker__grid \{[^}]*padding:var\(--ppbui-space-4\)!important[^}]*background:var\(--ppbui-bg-0\)!important/s, "native candidate grid keeps its layout contract inside a clean PPBUI content bay");
  assert.doesNotMatch(css, /\.team-equip-picker\[data-ppbui-team-picker\] \.team-equip-picker__grid \{[^}]*grid-template-columns/s, "Better UI must not replace the native candidate grid's responsive column contract");
  assert.match(css, /\[data-ppbui-team-picker\] \.team-equip-card \{[^}]*appearance:none!important[^}]*background-image:none!important[^}]*text-shadow:none!important[^}]*transform:none!important/s, "candidate actions keep native behavior while host visual chrome is fully released");
  assert.match(css, /\.team-equip-picker\[data-ppbui-team-picker\] \.ppbui-team-picker-toolbar > input\.game-window__search\.ppbui-input \{[^}]*-webkit-appearance:none!important[^}]*appearance:none!important[^}]*border-radius:var\(--ppbui-radius\)!important[^}]*background-image:none!important[^}]*clip-path:none!important/s, "Add Pokémon Search releases native rounded searchfield chrome with picker-owned specificity");
  assert.match(css, /\.team-equip-picker\[data-ppbui-team-picker\] \*::\-webkit-scrollbar-track \{[^}]*border-radius:var\(--ppbui-radius\)!important[^}]*background:var\(--ppbui-scrollbar-track\)!important/s, "picker-owned scrollbar track outranks legacy panel color/radius");
  assert.match(css, /\.team-equip-picker\[data-ppbui-team-picker\] \*::\-webkit-scrollbar-thumb \{[^}]*border-radius:var\(--ppbui-radius\)!important[^}]*background:var\(--ppbui-scrollbar-thumb\)!important/s, "picker-owned scrollbar thumb uses shared Miyazaki tokens instead of legacy gold/navy");
  assert.match(css, /\.team-equip-picker\[data-ppbui-team-picker\] \*::\-webkit-scrollbar-button \{[^}]*display:none!important[^}]*width:0!important[^}]*height:0!important/s, "picker scrollbar keeps native arrow buttons suppressed");
  assert.match(css, /@container \(max-width:419px\)[\s\S]*\.ppbui-team-picker-toolbar \{ grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\); \}/, "only genuinely narrow picker widths wrap the discovery rail");
  const orderButtons = [...s.root.querySelectorAll(".team-order-button")]; assert.ok(orderButtons.every(button => button.classList.contains("ppbui-icon-button") && !button.classList.contains("ppbui-icon-button--compact")), "Battle-order arrows use the standard 28px desktop target");
  assert.ok(s.root.querySelector(".team-active-state").classList.contains("ppbui-button"));
  assert.ok(s.root.querySelector(".team-active-state").classList.contains("pokeidle-btn"), "native Active/Activate control opts into the high-specificity PPBUI button bridge so host disabled/pressed chrome cannot leak");
  assert.ok(s.root.querySelector(".team-active-state").classList.contains("ppbui-button--primary"), "actionable activation delegates primary chrome to the shared PPBUI primitive");
  assert.ok([...s.root.querySelectorAll(".team-actions button")].every(button => button.classList.contains("ppbui-button")));
  assert.match(css, /\.pokeidle-panel__titlebar/);
  assert.match(css, /@media \(pointer:coarse\)[\s\S]*\.pokeidle-panel__titlebar button \{ min-width:40px; min-height:40px; \}/);
  assert.match(css, /\[data-ppbui-team-picker\] \.team-equip-card:hover/);
  assert.doesNotMatch(css, /font-size:(?:[7-9]|10)px/);
});

test("Team content-fit yields to the native resize handle and preserves the user-owned height", t => {
  const s = setup(t), handle = s.root.querySelector(".pokeidle-resize-handle");
  s.root.getBoundingClientRect = () => ({ width: 590, height: 412, top: 0, left: 0, right: 590, bottom: 412, x: 0, y: 0, toJSON() {} });
  handle.dispatchEvent(new s.dom.window.MouseEvent("pointerdown", { bubbles: true, button: 0 }));
  assert.equal(s.root.dataset.ppbuiTeamManualHeight, "");
  assert.equal(s.root.style.width, "590px", "manual resizing starts from the compact Better UI width before returning geometry ownership to the native resize handle");
  assert.equal(s.root.style.height, "412px", "native resizing starts from the current content-fit height instead of jumping back to 680px");
  assert.equal(s.dom.window.getComputedStyle(s.root).height, "412px", "manual resize releases the Better UI auto-height override immediately");
  s.root.style.height = "460px"; s.root.style.width = "530px";
  assert.equal(s.dom.window.getComputedStyle(s.root).height, "460px", "subsequent native inline height changes remain visually effective");
  s.controller.cleanup();
  assert.equal(s.root.hasAttribute("data-ppbui-team-manual-height"), false);
  assert.equal(s.root.style.height, "460px", "cleanup keeps the latest user/native geometry after manual resize");
  assert.equal(s.root.style.width, "530px", "cleanup keeps the latest user/native width after manual resize");
});

test("Team removes native pedestal/serif styling and aligns the selected workspace", t => {
  const s = setup(t), css = s.root.querySelector('style[data-ppbui-module="team"]').textContent;
  assert.match(css, /\.team-slot::before,[\s\S]*\.team-slot::after \{ display:none!important; content:none!important; \}/);
  assert.match(css, /\.team-slot__sprite \{[^}]*position:static!important[^}]*filter:none!important/s);
  assert.ok(s.root.querySelector(".team-slot__sprite").classList.contains("ppbui-pokemon-card__visual"), "sprite geometry is owned by the shared PokÃ©mon-card visual primitive");
  assert.match(css, /\.team-detail__portrait \{[^}]*border-radius:var\(--ppbui-radius\)!important[^}]*background:var\(--ppbui-bg-0\)!important[^}]*box-shadow:none!important/s);
  assert.match(css, /\.team-detail__info h2 \{[^}]*font:700 var\(--ppbui-font-size-title\)\/var\(--ppbui-line-height-tight\) var\(--ppbui-font-body\)!important[^}]*font-variant:normal!important/s, "Team keeps the compact selected-member heading instead of dossier-scale typography");
  assert.match(css, /\.team-tag \{[^}]*border-radius:var\(--ppbui-radius\)!important[^}]*font:700 var\(--ppbui-font-size-meta\)/s);
  const element = s.root.querySelector(".team-detail__tags .native-element-circle"), quality = s.root.querySelector(".team-quality");
  assert.ok(element.classList.contains("ppbui-element-icon"), "selected Team member consumes the shared project-wide Element icon primitive");
  assert.equal(element.style.getPropertyValue("--ppbui-element-color"), "#e2bf65");
  assert.ok(quality.classList.contains("ppbui-quality-badge"), "rarity/quality uses the shared square domain badge primitive");
  assert.ok(s.root.querySelector(".team-order-controls").classList.contains("ppbui-action-row"), "native Battle-order controls keep shared action styling without being relocated into a dossier dock");
  assert.equal(s.root.querySelector(".team-order-controls").parentElement, s.root.querySelector(".team-section--profile"));
  assert.match(css, /@container \(max-width:519px\)[\s\S]*\.team-detail__portrait \{ width:82px!important; height:82px!important; \}/);
  assert.doesNotMatch(css, /@container \(max-width:539px\)/, "Team command wrapping is content-driven instead of using the obsolete fixed-width breakpoint");
  assert.doesNotMatch(css, /Georgia|Palatino|Book Antiqua|var\(--ui-font-display\)/);
});

test("340px command workspace preserves representative localized labels without truncation rules", t => {
  const s = setup(t), active = s.root.querySelector(".team-active-state"), remove = s.root.querySelector(".pokeidle-btn--danger"), order = s.root.querySelector(".team-order-label");
  active.classList.add("is-active");
  const expected = {
    pt: ["Ativo", "Remover", "#2"],
    en: ["Active", "Remove", "#2"],
    es: ["Activo", "Quitar", "#2"],
    zh: ["出战", "移除", "#2"],
  };
  for (const [lang, labels] of Object.entries(expected)) {
    s.dom.window.PokeIdle.Localization.get = () => lang; s.controller.sync();
    assert.deepEqual([active.textContent, remove.textContent, order.textContent], labels, `localized command labels for ${lang}`);
  }
});

test("native actions stay in Team ownership with intact handlers and disabled state", t => {
  const s = setup(t), actions = s.root.querySelector(".team-actions"), details = actions.firstElementChild, profile = s.root.querySelector(".team-section--profile"), configure = profile.querySelector(".team-configure-moves"); let clicks = 0;
  details.addEventListener("click", () => clicks++); details.click(); configure.click(); assert.equal(clicks, 1); assert.deepEqual(s.configureCalls, ["b"], "Configure moves remains the native Team action and opens MovesetConfig for the exact selected creature"); assert.equal(configure.parentElement, profile); assert.equal(actions.parentElement, s.body); assert.equal(profile.querySelector(".team-active-state")?.parentElement, profile); assert.equal(actions.lastElementChild.disabled, true); assert.equal(profile.querySelector(".ppbui-team-command-dock"), null);
  s.controller.cleanup(); assert.equal(s.root.outerHTML, s.before);
});

test("add picker filters loaded native cards and preserves their add actions", t => {
  const s = setup(t), picker = s.dom.window.document.createElement("div"); picker.className = "team-equip-picker";
  picker.innerHTML = '<div class="pokeidle-panel__body"><p class="team-equip-picker__intro">Choose</p><div class="team-equip-picker__grid"><button class="team-equip-card"><span class="team-equip-card__info">Bulbasaur<span class="pokeidle-element-icons"><span class="native-element-circle"><img src="grass.png" alt="Grass"></span><span class="native-element-circle"><img src="poison.png" alt="Poison"></span></span></span></button><button class="team-equip-card is-fainted"><span class="team-equip-card__info">Gastly<span class="pokeidle-element-icons"><span class="native-element-circle"><img src="ghost.png" alt="Ghost"></span><span class="native-element-circle"><img src="poison.png" alt="Poison"></span></span></span></button></div></div>';
  s.dom.window.document.body.append(picker); let adds = 0; const cards = [...picker.querySelectorAll(".team-equip-card")]; cards[0].addEventListener("click", () => adds++); s.controller.sync();
  const toolbar = picker.querySelector(".ppbui-team-picker-toolbar"), search = toolbar.querySelector("input"), selects = toolbar.querySelectorAll("select"); assert.ok(toolbar);
  const pickerBody = picker.querySelector(".pokeidle-panel__body"), pickerGrid = picker.querySelector(".team-equip-picker__grid"), clear = toolbar.querySelector("button");
  assert.ok(picker.classList.contains("ppbui-scroll-scope"), "picker owns a scoped hostile-host scrollbar bridge so the actual descendant scroller receives pixel chrome");
  assert.ok([picker, pickerBody, pickerGrid].every(node => node.classList.contains("ppbui-scroll")), "known picker scroll surfaces also reserve shared pixel-scroll geometry");
  const candidateElements = [...picker.querySelectorAll(".native-element-circle")];
  assert.equal(candidateElements.length, 4); assert.ok(candidateElements.every(node => node.classList.contains("ppbui-element-icon") && node.classList.contains("ppbui-element-icon--small")));
  assert.equal(candidateElements[0].style.getPropertyValue("--ppbui-element-color"), "#7ac74c");
  assert.equal(clear.disabled, true, "Clear is quiet until a Better UI filter is active");
  search.value = "gast"; search.dispatchEvent(new s.dom.window.Event("input")); assert.equal(cards[0].hidden, true); assert.equal(cards[1].hidden, false);
  assert.equal(clear.disabled, false);
  search.value = ""; selects[0].value = "grass"; selects[0].dispatchEvent(new s.dom.window.Event("change")); assert.equal(cards[0].hidden, false); assert.equal(cards[1].hidden, true);
  selects[0].value = ""; selects[1].value = "rare"; selects[1].dispatchEvent(new s.dom.window.Event("change")); cards[0].click(); assert.equal(adds, 1); assert.equal(cards[1].hidden, true);
  clear.click(); assert.equal(cards.every(card => !card.hidden), true); assert.equal(clear.disabled, true); assert.equal(picker.querySelector(".ppbui-team-picker-empty").getAttribute("role"), "status"); assert.equal(picker.querySelector(".ppbui-team-picker-empty").getAttribute("aria-live"), "polite"); s.controller.cleanup(); assert.equal(picker.querySelector(".ppbui-team-picker-toolbar"), null); assert.equal(cards.every(card => !card.hidden), true); assert.equal(picker.classList.contains("ppbui-scroll-scope"), false); assert.ok([picker, pickerBody, pickerGrid].every(node => !node.classList.contains("ppbui-scroll")), "cleanup releases picker scrollbar ownership"); assert.ok(candidateElements.every(node => !node.classList.contains("ppbui-element-icon") && !node.hasAttribute("style")), "cleanup restores native Element wrappers exactly"); picker.remove();
});

test("add picker keeps discovery controls above candidates when native intro is absent", t => {
  const s = setup(t), picker = s.dom.window.document.createElement("div"); picker.className = "team-equip-picker";
  picker.innerHTML = '<div class="pokeidle-panel__body"><div class="team-equip-picker__grid"><button class="team-equip-card">Bulbasaur</button></div></div>';
  s.dom.window.document.body.append(picker); s.controller.sync();
  const grid = picker.querySelector(".team-equip-picker__grid"), toolbar = picker.querySelector(".ppbui-team-picker-toolbar");
  assert.ok(toolbar); assert.equal(toolbar.nextElementSibling, grid, "discovery rail remains above the native candidate grid without relying on intro copy");
  picker.remove();
});

test("stable reconciliation has no mutations and live values update", async t => {
  const s = setup(t); let mutations = 0; const observer = new s.dom.window.MutationObserver(records => mutations += records.length);
  observer.observe(s.root, { subtree: true, childList: true, attributes: true, characterData: true }); for (let index = 0; index < 5; index++) s.controller.sync(); await Promise.resolve(); assert.equal(mutations, 0);
  s.scene._creatures[0].hp = 50; s.controller.sync(); await Promise.resolve(); observer.disconnect(); assert.equal(s.root.querySelector(".team-slot [data-ppbui-team-hp]").textContent, "50%");
});

test("slot aria-description restores the latest legitimate native value", t => {
  const s = setup(t), slot = s.root.querySelector(".team-slot");
  slot.setAttribute("aria-description", "native refreshed description");
  s.controller.sync(); assert.match(slot.getAttribute("aria-description"), /Pikachu/);
  s.controller.cleanup(); assert.equal(slot.getAttribute("aria-description"), "native refreshed description");
});

test("a native full refresh is enhanced once and cleanup never resurrects stale nodes", t => {
  const s = setup(t), staleActions = s.root.querySelector(".team-actions"); s.body.innerHTML = bodyMarkup(); const freshActions = s.root.querySelector(".team-actions"), details = freshActions.firstElementChild; let clicks = 0;
  details.addEventListener("click", () => clicks++); s.controller.sync(); s.controller.sync(); details.click(); assert.equal(clicks, 1);
  assert.equal(s.root.querySelectorAll("[data-ppbui-team-compare]").length, 0); assert.equal(s.root.querySelectorAll("[data-ppbui-team-slot]").length, 2); s.controller.cleanup();
  assert.equal(freshActions.parentElement, s.body); assert.equal(staleActions.isConnected, false); assert.equal(s.root.querySelector("[data-ppbui-module]"), null);
});

test("native Battle order actions remain in the native Team profile with intact handlers", t => {
  const s = setup(t), order = s.root.querySelector('.team-order-controls'), left = order.querySelector('button'), right = order.lastElementChild;
  const active = s.root.querySelector('.team-active-state'), profile = s.root.querySelector('.team-section--profile');
  assert.equal(profile.querySelector('.ppbui-team-command-dock'), null);
  assert.equal(order.parentElement, profile);
  assert.equal(active.parentElement, profile);
  assert.equal(s.root.querySelector(".team-actions").parentElement, s.body);
  let moves = 0; left.onclick = () => moves++;
  left.click(); right.click(); assert.equal(moves, 1); assert.equal(right.disabled, true);
  s.controller.sync(); assert.equal(s.root.querySelector('.team-order-controls'), order);
  s.controller.cleanup();
  assert.equal(order.parentElement, s.root.querySelector('.team-section--profile'));
  assert.equal(active.nextElementSibling, order);
  left.click(); assert.equal(moves, 2);
  assert.equal(s.root.outerHTML, s.before);
});

test("Team cleanup releases only Team-owned roster card state and leaves sibling module cards intact", t => {
  const s = setup(t), presetCard = s.dom.window.document.createElement("div");
  presetCard.className = "ppbui-pokemon-card ppbui-pokemon-card--preset ppbui-pokemon-card--active";
  s.root.append(presetCard);
  s.controller.cleanup();
  assert.equal(presetCard.className, "ppbui-pokemon-card ppbui-pokemon-card--preset ppbui-pokemon-card--active", "disabling Team must not strip shared card classes owned by Team Presets or another sibling module");
});

test("compact active/removal labels preserve explanations, native state and cleanup", t => {
  const s = setup(t); s.dom.window.PokeIdle.Localization.get = () => 'en';
  const active = s.root.querySelector('.team-active-state'), remove = s.root.querySelector('.pokeidle-btn--danger');
  const activeText = 'âš” Active â€” this is the PokÃ©mon that hunts', blockedText = 'Choose another PokÃ©mon so you can remove this one';
  active.classList.add('is-active'); active.disabled = true; active.textContent = activeText; remove.textContent = blockedText;
  s.controller.sync();
  assert.equal(active.textContent, 'Active'); assert.equal(remove.textContent, 'Remove');
  assert.equal(active.classList.contains('ppbui-button--primary'), false, 'current Active is a status in standard button geometry, not a primary action');
  assert.equal(remove.disabled, true); assert.equal(remove.title, blockedText); assert.equal(remove.getAttribute('aria-description'), blockedText);
  const observer = new s.dom.window.MutationObserver(() => {}); observer.observe(s.root, {subtree:true,attributes:true,childList:true,characterData:true});
  for(let i=0;i<10;i++) s.controller.sync(); assert.equal(observer.takeRecords().length,0); observer.disconnect();
  s.controller.cleanup(); assert.equal(active.textContent, activeText); assert.equal(remove.textContent, blockedText);
  assert.equal(active.hasAttribute('title'),false); assert.equal(remove.hasAttribute('aria-description'),false);
});

test("same-node native state changes update compact button explanations", t => {
  const s = setup(t); s.dom.window.PokeIdle.Localization.get = () => 'en';
  const active=s.root.querySelector('.team-active-state'),remove=s.root.querySelector('.pokeidle-btn--danger');
  active.classList.add('is-active'); active.textContent='Active long explanation'; remove.textContent='Choose another PokÃ©mon'; s.controller.sync();
  active.classList.remove('is-active'); active.textContent='Make PokÃ©mon active'; remove.textContent='Remove from team'; remove.disabled=false; s.controller.sync();
  assert.equal(active.textContent,'Activate'); assert.equal(active.title,'Make PokÃ©mon active'); assert.equal(remove.textContent,'Remove'); assert.equal(remove.title,'Remove from team');
  s.controller.cleanup(); assert.equal(remove.textContent,'Remove from team');
});

test("compact # position label follows selection and native order with reversible text", t => {
  const s = setup(t), label = s.root.querySelector(".team-order-label");
  assert.equal(label.textContent, "#2");
  s.dom.window.PokeIdle.Localization.get = () => "en"; s.controller.sync();
  assert.equal(label.textContent, "#2");
  s.scene._team.member_ids = ["b", "a"]; s.controller.sync();
  assert.equal(label.textContent, "#1");
  s.scene._selectedId = "a"; s.controller.sync();
  assert.equal(label.textContent, "#2");
  label.textContent = "Battle order Â· position 2 (native refresh)"; s.controller.sync();
  assert.equal(label.textContent, "#2");
  s.controller.cleanup();
  assert.equal(label.textContent, "Battle order Â· position 2 (native refresh)");
  assert.equal(label.hasAttribute("title"), false);
});

test("Full Team reacquires the native Shared Stone badge when a native refresh omits its presentation node", t => {
  const s = setup(t), first = s.root.querySelectorAll(".team-slot")[0];
  s.scene.xpShareBadge = member => {
    if (member.id !== "a") return null;
    const badge = s.dom.window.document.createElement("span"); badge.className = "team-slot__xp-share is-carrier";
    const image = s.dom.window.document.createElement("img"); image.src = "/img/items/shared-stone-kanto.png"; image.alt = "";
    badge.append(image); return badge;
  };
  assert.equal(first.querySelector(".team-slot__xp-share"), null);
  s.controller.sync();
  const badge = first.querySelector(".team-slot__xp-share");
  assert.ok(badge, "official native xpShareBadge presentation is reacquired instead of fabricating an unrelated icon");
  assert.ok(badge.hasAttribute("data-ppbui-team-shared-stone-fallback"));
  assert.equal(badge.querySelector("img")?.getAttribute("src"), "/img/items/shared-stone-kanto.png");
  s.controller.sync();
  assert.equal(first.querySelectorAll(".team-slot__xp-share").length, 1, "stable sync must not duplicate the native Shared Stone fallback");
  s.controller.cleanup();
  assert.equal(first.querySelector("[data-ppbui-team-shared-stone-fallback]"), null, "cleanup removes only the fallback presentation owned by Better UI");
});
