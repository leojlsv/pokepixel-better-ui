import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { mountTeamHud } from "../src/modules/team-hud/controller.js";

const card = (id, options = "") => `<div class="pokeidle-team-card ${options}" data-creature-id="${id}" style="--hp-percent:${id === "a" ? 72 : 0}%"><span class="pokeidle-team-card__icon"></span><span class="pokeidle-team-card__name">${id === "a" ? "Pikachu" : "Gastly"}</span><span class="pokeidle-team-card__compact-level">Lv. ${id === "a" ? 20 : 12}</span><div class="pokeidle-team-card__hp-bar"><span class="pokeidle-team-card__bar-text">${id === "a" ? "2198/2198" : "0/1040"}</span></div><div class="pokeidle-team-card__xp-bar"><span class="pokeidle-team-card__bar-text pokeidle-team-card__bar-text--xp">EXP 25%</span></div>${options.includes("is-xp-share-carrier") ? '<span class="pokeidle-team-card__xp-share is-carrier"><img src="shared-stone.png" alt=""><b>↗</b><small>×2</small></span>' : ""}</div>`;
function setup(t) {
  const dom = new JSDOM(`<div class="pokeidle-team-hud"><div class="pokeidle-team-hud__controls"><div class="pokeidle-team-hud__drag-handle">Equipe</div><button type="button" class="pokeidle-team-hud__collapse" aria-expanded="true">−</button></div><div class="pokeidle-trainer-hud__header"><div class="pokeidle-trainer-hud__info"><div class="pokeidle-trainer-hud__xp-bar"><i class="pokeidle-trainer-hud__xp-fill"></i><span class="pokeidle-trainer-hud__xp-text">EXP 50%</span></div><div class="pokeidle-trainer-hud__stamina-bar"><i class="pokeidle-trainer-hud__stamina-fill"></i><span class="pokeidle-trainer-hud__stamina-text">Stamina 23m / 8h</span></div><p class="pokeidle-trainer-hud__stamina-note">Start a hunt before leaving to use your stamina.</p></div></div><div class="pokeidle-team-hud__active"><div class="pokeidle-team-hud__active-elements"><span class="pokeidle-element-icons"><span class="native-element-circle"><img src="electric.png" alt="Electric"></span></span></div><div class="pokeidle-team-hud__active-bar pokeidle-team-hud__active-bar--hp"><span class="pokeidle-team-hud__active-bar-text">2198/2198</span></div><div class="pokeidle-team-hud__active-bar pokeidle-team-hud__active-bar--xp"><span class="pokeidle-team-hud__active-bar-text">EXP 25%</span></div></div><div class="pokeidle-team-hud__list">${card("a", "is-leader is-xp-share-carrier")}${card("b", "is-fainted")}<button class="pokeidle-team-card pokeidle-team-card--empty">+</button></div></div><div class="pokeidle-team-hud__wallet"></div>`, { pretendToBeVisual: true });
  const root = dom.window.document.body.firstChild, wallet = root.nextElementSibling, before = root.outerHTML, collapse = root.querySelector(".pokeidle-team-hud__collapse");
  let nativeCollapseCalls = 0;
  const runtime = { el: root, _collapseButton: collapse, _walletEl: wallet, _trainer: { exp: 250000, exp_current_level: 200000, exp_next_level: 300000 }, _creatures: [
    { id: "a", is_leader: true, elements: ["electric"], hp: 2198, max_hp: 2198, exp: 1500, exp_current_level: 1000, exp_next_level: 3000 },
    { id: "b", elements: ["ghost"], hp: 0, max_hp: 1040, exp: 400, exp_current_level: 200, exp_next_level: 1000 },
  ], setCollapsed(collapsed) { const value = Boolean(collapsed); root.classList.toggle("is-collapsed", value); collapse.textContent = value ? "+" : "−"; collapse.setAttribute("aria-expanded", value ? "false" : "true"); wallet.classList.toggle("is-hidden", value); } };
  collapse.addEventListener("click", () => { nativeCollapseCalls += 1; runtime.setCollapsed(!root.classList.contains("is-collapsed")); });
  dom.window.PokeIdle = { Localization: { get: () => "pt-BR" }, ElementIcons: { definition: element => ({ label: element, color: element === "electric" ? "#f7d02c" : "#735797" }) }, PersistentHud: { _teamHud: runtime } };
  const controller = mountTeamHud(root);
  t.after(() => { controller.cleanup(); dom.window.close(); }); return { dom, root, before, controller, collapse, wallet, nativeCollapseCalls: () => nativeCollapseCalls };
}

test("compact native cards gain HP and fainted state without replacing nodes", t => {
  const s = setup(t), cards = [...s.root.querySelectorAll(".pokeidle-team-card:not(.pokeidle-team-card--empty)")]; let clicks = 0; cards[0].addEventListener("click", () => clicks++); cards[0].click();
  assert.equal(clicks, 1); assert.equal(cards[0].querySelector("[data-ppbui-team-hud-hp] i").style.width, "100%"); assert.match(cards[0].getAttribute("aria-label"), /Pikachu · Lv\. 20 · 2198\/2198/);
  assert.ok(cards.every(card => card.classList.contains("ppbui-pokemon-card") && card.classList.contains("ppbui-pokemon-card--hud"))); assert.ok(cards[0].querySelector("[data-ppbui-team-hud-position]").classList.contains("ppbui-pokemon-card__position")); assert.ok(cards[0].querySelector("[data-ppbui-team-hud-hp]").classList.contains("ppbui-pokemon-card__meter"));
  assert.equal(cards[1].querySelector("[data-ppbui-team-hud-fainted]"), null); assert.match(cards[1].getAttribute("aria-label"), /Derrotado$/); assert.equal(s.root.querySelector(".pokeidle-team-card--empty [data-ppbui-team-hud-hp]"), null);
  assert.deepEqual(cards.map(card => card.querySelector("[data-ppbui-team-hud-position]").textContent), ["1", "2"]);
  assert.equal(cards[0].querySelector("[data-ppbui-team-hud-active]"), null); assert.match(cards[0].getAttribute("aria-label"), /Ativo$/);
});

test("HUD uses canonical battle order independently from active-first card order", t => {
  const s = setup(t), runtime = s.dom.window.PokeIdle.PersistentHud._teamHud;
  const nativeCards = [...s.root.querySelectorAll(".pokeidle-team-card:not(.pokeidle-team-card--empty)")];
  let originalClicks = 0; nativeCards[1].addEventListener("click", () => originalClicks++);
  runtime._team = { member_ids: ["b", "a"], leader_id: "a" }; s.controller.sync();
  const cards = [...s.root.querySelectorAll(".pokeidle-team-card:not(.pokeidle-team-card--empty)")];
  assert.deepEqual(cards.map(card => card.querySelector("[data-ppbui-team-hud-position]").textContent), ["1", "2"]);
  assert.deepEqual(cards.map(card => card.dataset.creatureId), ["b", "a"], "visual and keyboard order follow the canonical Battle Line");
  assert.equal(cards[0], nativeCards[1], "canonical ordering moves the original native card instead of replacing it");
  assert.equal(cards[1], nativeCards[0], "canonical ordering preserves native card identity and listeners");
  cards[0].click(); assert.equal(originalClicks, 1, "the moved native card keeps its original click listeners");
  assert.equal(cards[0].querySelector("[data-ppbui-team-hud-active]"), null);
  assert.equal(cards[1].querySelector("[data-ppbui-team-hud-active]"), null); assert.match(cards[1].getAttribute("aria-label"), /Ativo$/);
  const observer = new s.dom.window.MutationObserver(() => {}); observer.observe(s.root, { subtree: true, childList: true, attributes: true, characterData: true });
  for (let index = 0; index < 5; index++) s.controller.sync(); assert.equal(observer.takeRecords().length, 0, "stable canonical HUD order must not create a mutation loop"); observer.disconnect();
  s.controller.cleanup();
  assert.deepEqual([...s.root.querySelectorAll(".pokeidle-team-card:not(.pokeidle-team-card--empty)")].map(card => card.dataset.creatureId), ["a", "b"], "cleanup restores native leader-first card order");
});

test("HUD active elements consume the same shared square Element icon primitive", t => {
  const s = setup(t), list = s.root.querySelector(".pokeidle-team-hud__active-elements > .pokeidle-element-icons"), icon = list.firstElementChild;
  assert.ok(list.classList.contains("ppbui-element-icons"));
  assert.ok(icon.classList.contains("ppbui-element-icon")); assert.ok(icon.classList.contains("ppbui-element-icon--small"));
  assert.equal(icon.style.getPropertyValue("--ppbui-element-color"), "#f7d02c");
  s.controller.cleanup();
  assert.equal(list.classList.contains("ppbui-element-icons"), false); assert.equal(icon.classList.contains("ppbui-element-icon"), false); assert.equal(icon.hasAttribute("style"), false);
});

test("HUD prefers the Team scene linked to the current panel over stale cached order", t => {
  const s = setup(t), doc = s.dom.window.document, runtime = s.dom.window.PokeIdle.PersistentHud._teamHud;
  const panel = doc.createElement("div"); panel.className = "pokeidle-team-panel"; panel.innerHTML = '<div class="pokeidle-panel__body"></div>'; doc.body.append(panel);
  const body = panel.firstElementChild;
  const stale = { _team: { member_ids: ["a", "b"], leader_id: "a" } };
  const live = { _panel: { body }, _team: { member_ids: ["b", "a"], leader_id: "a" } };
  s.dom.window.PokeIdle.ReactiveWindows = { cached: () => [stale, live] };
  delete runtime._team; s.controller.sync();
  const cards = [...s.root.querySelectorAll(".pokeidle-team-card:not(.pokeidle-team-card--empty)")];
  assert.deepEqual(cards.map(card => card.querySelector("[data-ppbui-team-hud-position]").textContent), ["1", "2"]);
  assert.deepEqual(cards.map(card => card.dataset.creatureId), ["b", "a"]);
  panel.remove();
});

test("HUD keeps a single six-slot Battle Line at normal HUD width and wraps only when truly narrow", t => {
  const s = setup(t), css = s.root.querySelector('style[data-ppbui-module="team-hud"]').textContent;
  assert.match(css, /team-hud__list[^\{]*\{[^}]*grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/s);
  assert.match(css, /team-hud__list[^\{]*\{[^}]*gap:0!important/s);
  assert.match(css, /\.pokeidle-team-card\.ppbui-pokemon-card--hud \{[^}]*min-height:52px!important[^}]*height:52px!important[^}]*max-height:52px!important/s);
  assert.match(css, /\.pokeidle-team-card\.ppbui-pokemon-card--hud \{[^}]*overflow:hidden!important[^}]*border-top-color:var\(--ppbui-pokemon-card-top-border\)!important[^}]*border-right-color:var\(--ppbui-pokemon-card-right-border\)!important[^}]*background:var\(--ppbui-bg-2\)!important[^}]*box-shadow:none!important/s, "HUD micro-slots preserve selected/active semantics as flat edges without pixel-depth shadows");
  assert.match(css, /team-hud__list[^\{]*\{[^}]*padding:0!important[^}]*border:0!important[^}]*background:transparent!important/s, "HUD Battle Line avoids an extra frame around six already-framed micro-slots");
  assert.match(css, /@container \(max-width:279px\)[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(css, /minmax\(min\(108px,100%\),1fr\)/);
  assert.match(css, /\[data-ppbui-team-hud-exp\][^{]*\{[^}]*overflow:hidden[^}]*white-space:nowrap/s);
  assert.match(css, /\[data-ppbui-team-hud-hp-value\][^{]*\{[^}]*overflow:hidden[^}]*white-space:nowrap/s);
  assert.doesNotMatch(css, /\[data-ppbui-team-hud-(?:exp|hp-value)\][^{]*\{[^}]*text-overflow:ellipsis/s);
});

test("HUD micro-slots prioritize Level while keeping HP as a rail and Active accessible", t => {
  const s = setup(t), css = s.root.querySelector('style[data-ppbui-module="team-hud"]').textContent;
  const card = s.root.querySelector('[data-creature-id="a"]');
  assert.equal(card.querySelector("[data-ppbui-team-hud-active]"), null);
  assert.match(card.getAttribute("aria-label"), /Lv\. 20 .* Ativo$/);
  assert.ok(card.classList.contains("ppbui-pokemon-card--active"));
  assert.ok(card.classList.contains("ppbui-pokemon-card--hud"));
  assert.equal(card.querySelector("[data-ppbui-team-hud-meta]").textContent, "Lv.20");
  assert.ok(card.querySelector("[data-ppbui-team-hud-meta]").classList.contains("ppbui-pokemon-card__meta"));
  assert.doesNotMatch(card.querySelector("[data-ppbui-team-hud-meta]").textContent, /%/);
  assert.equal(card.querySelector("[data-ppbui-team-hud-hp] i").style.width, "100%", "HP remains available as the thin vitality rail instead of competing with Level text");
  assert.match(css, /\.pokeidle-team-card__name,[\s\S]*?\.pokeidle-team-card__xp-bar \{ display:none!important; \}/);
  assert.doesNotMatch(css, /\.pokeidle-team-card\.is-leader \{/, "active card chrome belongs to the shared Pokémon-card state primitive");
});

test("HUD keeps Active and Fainted explicit in accessibility when both states coexist", t => {
  const s = setup(t), card = s.root.querySelector('[data-creature-id="a"]'), css = s.root.querySelector('style[data-ppbui-module="team-hud"]').textContent;
  card.classList.add("is-fainted"); s.controller.sync();
  assert.equal(card.querySelector("[data-ppbui-team-hud-active]"), null);
  assert.equal(card.querySelector("[data-ppbui-team-hud-fainted]"), null);
  assert.match(card.getAttribute("aria-label"), /Ativo · Derrotado$/);
  assert.ok(card.classList.contains("ppbui-pokemon-card--active")); assert.ok(card.classList.contains("ppbui-pokemon-card--fainted"));
  assert.doesNotMatch(css, /\.pokeidle-team-card\.is-fainted \{/, "fainted chrome belongs to the shared Pokémon-card state primitive");
});

test("HUD migrates the complete native surface to one PPBUI visual system", t => {
  const s = setup(t), css = s.root.querySelector('style[data-ppbui-module="team-hud"]').textContent;
  assert.match(css, /\.pokeidle-team-hud\[data-ppbui-team-hud-enhanced\] \{[^}]*border:var\(--ppbui-border-width\) solid var\(--ppbui-border-strong\)!important[^}]*background:var\(--ppbui-bg-1\)!important[^}]*box-shadow:var\(--ppbui-shadow\)!important[^}]*font:var\(--ppbui-font-size-body\)/s, "Team HUD and Wallet use the same restrained project shadow");
  assert.match(css, /\.pokeidle-team-hud__controls \{[^}]*border-bottom:var\(--ppbui-separator-width\) solid var\(--ppbui-border\)!important/s);
  assert.match(css, /\.pokeidle-team-hud__collapse \{[^}]*width:var\(--ppbui-icon-button-size\)!important[^}]*border-radius:var\(--ppbui-radius\)!important[^}]*background:var\(--ppbui-bg-2\)!important/s);
  assert.match(css, /\.pokeidle-team-hud__collapse:active \{[^}]*background:var\(--ppbui-bg-0\)!important[^}]*box-shadow:none!important/s);
  assert.match(css, /@media \(pointer:coarse\)[\s\S]*\.pokeidle-team-hud__collapse \{ width:40px!important; min-width:40px; height:40px!important; min-height:40px; \}/);
  assert.match(css, /\.pokeidle-trainer-hud__header \{[^}]*border-radius:var\(--ppbui-radius\)!important[^}]*background:var\(--ppbui-bg-1\)!important/s);
  assert.match(css, /\.pokeidle-trainer-hud__name \{[^}]*font:700 var\(--ppbui-font-size-section\)\/var\(--ppbui-line-height-tight\) var\(--ppbui-font-body\)!important/s);
  assert.match(css, /\.pokeidle-team-hud__active \{[^}]*grid-template-columns:76px minmax\(0,1fr\)!important[^}]*border-radius:var\(--ppbui-radius\)!important[^}]*background:var\(--ppbui-bg-2\)!important/s);
  assert.match(css, /\.pokeidle-team-hud__active \{[^}]*border-left:var\(--ppbui-border-width\) solid var\(--element-color,var\(--ppbui-border-strong\)\)!important/s, "active element edge stays semantic while using the project 1px line token");
  assert.match(css, /\.pokeidle-team-hud__active-portrait \{[^}]*border-radius:var\(--ppbui-radius\)!important[^}]*background:var\(--ppbui-bg-0\)!important/s);
  assert.match(css, /\.pokeidle-team-hud__active-name \{[^}]*font:700 var\(--ppbui-font-size-section\)\/var\(--ppbui-line-height-tight\) var\(--ppbui-font-body\)!important/s);
  assert.match(css, /\.pokeidle-team-card__name,[\s\S]*?\.pokeidle-team-card__xp-bar \{ display:none!important; \}/);
  assert.match(css, /\.pokeidle-trainer-hud__stamina-note \{ display:none!important; \}/);
  assert.match(css, /\.pokeidle-team-card::before \{ display:none!important; content:none!important; \}/);
  assert.match(css, /\.pokeidle-team-card\.ppbui-pokemon-card--hud \{[^}]*border:var\(--ppbui-border-width\) solid var\(--ppbui-pokemon-card-border\)!important;[^}]*border-bottom:var\(--ppbui-border-width\) solid var\(--ppbui-pokemon-card-bottom-border\)!important;/s, "HUD consumes the same 2px shared Pokémon-card edge grammar as Team and Presets");
  assert.match(css, /\+ \.pokeidle-team-hud__wallet \{[^}]*box-sizing:border-box;[^}]*border-radius:var\(--ppbui-window-radius\)!important[^}]*background:var\(--ppbui-bg-1\)!important/s);
  assert.doesNotMatch(css, /\.pokeidle-team-hud__wallet \{[^}]*width:100%/s, "Wallet keeps its native HUD-relative geometry instead of expanding against the outer viewport");
  assert.match(css, /\.pokeidle-team-hud__list \{[^}]*gap:0!important/s, "HUD Battle Line is contiguous instead of accumulating framed gaps");
  assert.match(css, /\.pokeidle-team-card\.ppbui-pokemon-card--hud \+ \.pokeidle-team-card\.ppbui-pokemon-card--hud \{ border-left:0!important; \}/);
  assert.match(css, /@container \(max-width:279px\)[\s\S]*\.pokeidle-team-card\.ppbui-pokemon-card--hud:nth-child\(3n\+1\) \{ border-left:var\(--ppbui-border-width\) solid var\(--ppbui-pokemon-card-border\)!important; \}/);
  assert.match(css, /@container \(max-width:279px\)[\s\S]*\.pokeidle-team-card\.ppbui-pokemon-card--hud:nth-child\(n\+4\) \{ border-top:0!important; \}/);
  assert.match(css, /\.pokeidle-team-card__xp-share \{[^}]*top:2px!important[^}]*right:2px!important[^}]*left:auto!important[^}]*border-radius:var\(--ppbui-radius\)!important[^}]*box-shadow:none!important/s, "Shared Stone uses a contained square PPBUI badge instead of a floating native bubble");
  assert.match(css, /\.pokeidle-team-card__xp-share \{[^}]*grid-template-columns:16px auto[^}]*width:auto!important[^}]*min-width:20px!important/s, "HUD Shared Stone reserves intrinsic width for multi-digit counts without changing the six-slot grid");
  assert.match(css, /\.pokeidle-team-card__xp-share small \{[^}]*position:static!important[^}]*min-width:2\.5ch!important[^}]*white-space:nowrap/s, "HUD Shared Stone count can grow beyond x1 without absolute-position clipping");
  assert.match(css, /\.pokeidle-team-card\.ppbui-pokemon-card--hud:is\(\.is-xp-share-carrier,\.is-xp-share-recipient\) \{ overflow:visible!important; \}/, "Shared Stone is not clipped by the compact card shell");
  assert.ok(s.root.querySelector('.pokeidle-team-card__xp-share img'), "native Shared Stone image remains present");
  const count = s.root.querySelector('.pokeidle-team-card__xp-share small'); count.textContent = '×99'; s.controller.sync(); assert.equal(count.textContent, '×99', "Better UI preserves the native multi-digit Shared Stone count node/value");
  assert.doesNotMatch(css, /font-size:[7-9]px/);
});

test("HUD keeps native Shared Stone placeholders hidden when no Shared Stone applies", t => {
  const s = setup(t), card = s.root.querySelector('[data-creature-id="b"]'), placeholder = s.dom.window.document.createElement("span");
  placeholder.className = "pokeidle-team-card__xp-share"; placeholder.hidden = true;
  placeholder.innerHTML = '<img src="shared-stone.png" alt=""><b>↗</b><small hidden></small>'; card.append(placeholder);
  s.controller.sync();
  const css = s.root.querySelector('style[data-ppbui-module="team-hud"]').textContent;
  assert.match(css, /\.pokeidle-team-card__xp-share\[hidden\] \{ display:none!important; \}/, "PPBUI must not override the native hidden placeholder state");
  assert.equal(s.dom.window.getComputedStyle(placeholder).display, "none");
  const carrier = s.root.querySelector('[data-creature-id="a"] .pokeidle-team-card__xp-share');
  assert.equal(carrier.hidden, false); assert.notEqual(s.dom.window.getComputedStyle(carrier).display, "none");
});

test("HUD collapse keeps the native button contract authoritative while overriding PPBUI display precedence", t => {
  const s = setup(t), button = s.collapse, header = s.root.querySelector(".pokeidle-trainer-hud__header"), active = s.root.querySelector(".pokeidle-team-hud__active"), list = s.root.querySelector(".pokeidle-team-hud__list");
  const css = s.root.querySelector('style[data-ppbui-module="team-hud"]').textContent;
  assert.match(css, /\.is-collapsed > \.pokeidle-trainer-hud__header,[\s\S]*\.is-collapsed > \.pokeidle-team-hud__active,[\s\S]*\.is-collapsed > \.pokeidle-team-hud__list,[\s\S]*display:none!important/);
  assert.doesNotMatch(css, /\.is-collapsed > :not\(/, "collapse precedence must target the native contract instead of hiding arbitrary future direct children");
  button.click();
  assert.equal(s.nativeCollapseCalls(), 1, "Better UI must not install a competing collapse click handler");
  assert.equal(s.root.classList.contains("is-collapsed"), true); assert.equal(button.textContent, "+"); assert.equal(button.getAttribute("aria-expanded"), "false"); assert.ok(s.wallet.classList.contains("is-hidden"));
  assert.equal(header.matches("body:not(.pokeidle-mobile-portrait) .pokeidle-team-hud[data-ppbui-team-hud-enhanced].is-collapsed > .pokeidle-trainer-hud__header"), true);
  assert.equal(active.matches("body:not(.pokeidle-mobile-portrait) .pokeidle-team-hud[data-ppbui-team-hud-enhanced].is-collapsed > .pokeidle-team-hud__active"), true);
  assert.equal(list.matches("body:not(.pokeidle-mobile-portrait) .pokeidle-team-hud[data-ppbui-team-hud-enhanced].is-collapsed > .pokeidle-team-hud__list"), true);
  button.click();
  assert.equal(s.nativeCollapseCalls(), 2); assert.equal(s.root.classList.contains("is-collapsed"), false); assert.equal(button.textContent, "−"); assert.equal(button.getAttribute("aria-expanded"), "true"); assert.equal(s.wallet.classList.contains("is-hidden"), false);
  s.controller.cleanup(); button.click();
  assert.equal(s.nativeCollapseCalls(), 3, "cleanup leaves the original native listener and collapse state ownership intact"); assert.equal(s.root.classList.contains("is-collapsed"), true);
});

test("active HP keeps exact value while compact cards keep HP only as the thin rail", t => {
  const s = setup(t), active = s.root.querySelector(".pokeidle-team-hud__active [data-ppbui-team-hud-hp-value]"), cards = s.root.querySelectorAll(".pokeidle-team-card [data-ppbui-team-hud-hp-value]");
  assert.equal(active.textContent, "2,198 / 2,198"); assert.equal(cards.length, 0);
  assert.equal(s.root.querySelectorAll(".pokeidle-team-card [data-ppbui-team-hud-hp]").length, 2);
});

test("trainer EXP and STA use external labels and every bar exposes hover values", t => {
  const s = setup(t), rows = s.root.querySelectorAll("[data-ppbui-team-hud-trainer-row]");
  assert.equal(rows[0].firstElementChild.textContent, "EXP"); assert.equal(rows[0].querySelector("[data-ppbui-team-hud-exp]").textContent, "50,000 / 100,000 · 50%");
  assert.equal(rows[1].firstElementChild.textContent, "STA"); assert.equal(rows[1].querySelector("[data-ppbui-team-hud-sta]").textContent, "23m / 8h");
  assert.ok(rows[0].classList.contains("ppbui-meter-row")); assert.ok(rows[0].firstElementChild.classList.contains("ppbui-meter-row__label")); assert.ok(rows[0].lastElementChild.classList.contains("pokeidle-team-hud__active-bar")); assert.equal(rows[0].querySelector("[data-ppbui-team-hud-exp]").className, "pokeidle-team-hud__active-bar-text");
  const css = s.root.querySelector('style[data-ppbui-module="team-hud"]').textContent; assert.match(css, /--ppbui-meter-label-width:28px/); assert.match(css, /\[data-ppbui-team-hud-trainer-row\] > \.pokeidle-team-hud__active-bar \{[^}]*grid-column:auto!important; grid-row:auto!important;[^}]*margin:0!important/s, "moved native EXP/STA bars must release their original 1/-1 grid span so labels stay on the left"); assert.match(css, /\.pokeidle-trainer-hud__stamina-note \{ display:none!important; \}/);
  assert.match(css, /\[data-ppbui-team-hud-exp\] \{[^}]*font-size:var\(--ppbui-font-size-meta\)[^}]*line-height:1/s, "long trainer/Pokémon EXP values stay at metadata scale");
  assert.match(css, /\[data-ppbui-team-hud-hp-value\] \{[^}]*font-size:var\(--ppbui-font-size-meta\)[^}]*line-height:1/s, "long HP values stay at metadata scale");
  const bars = s.root.querySelectorAll(".pokeidle-trainer-hud__xp-bar,.pokeidle-trainer-hud__stamina-bar,.pokeidle-team-hud__active-bar");
  assert.equal([...bars].every(bar => Boolean(bar.title)), true);
});

test("active EXP stays exact while compact member EXP is visually suppressed", t => {
  const s = setup(t), active = s.root.querySelector(".pokeidle-team-hud__active [data-ppbui-team-hud-exp]"), cards = s.root.querySelectorAll(".pokeidle-team-card [data-ppbui-team-hud-exp]");
  assert.equal(active.textContent, "500 / 2,000 · 25%"); assert.equal(cards.length, 0);
  assert.equal(active.className, "pokeidle-team-hud__active-bar-text");
  assert.equal(s.root.querySelector(".pokeidle-team-hud__active-bar--xp > .pokeidle-team-hud__active-bar-text:not([data-ppbui-team-hud-exp])").textContent, "EXP 25%");
});

test("large HUD meter values compact visibly without losing exact title or accessibility text", t => {
  const s = setup(t), runtime = s.dom.window.PokeIdle.PersistentHud._teamHud;
  runtime._trainer.exp = 28689910; runtime._trainer.exp_current_level = 0; runtime._trainer.exp_next_level = 66430260;
  runtime._creatures[0].hp = 1354000; runtime._creatures[0].max_hp = 1382000;
  s.controller.sync();
  const trainer = s.root.querySelector(".pokeidle-trainer-hud__xp-bar [data-ppbui-team-hud-exp]");
  const hp = s.root.querySelector(".pokeidle-team-hud__active [data-ppbui-team-hud-hp-value]");
  assert.equal(trainer.textContent, "28.7M / 66.4M · 43%");
  assert.equal(trainer.title, "28,689,910 / 66,430,260 · 43%");
  assert.equal(trainer.getAttribute("aria-label"), trainer.title);
  assert.equal(s.root.querySelector(".pokeidle-trainer-hud__xp-bar").title, trainer.title);
  assert.equal(hp.textContent, "1.35M / 1.38M");
  assert.equal(hp.title, "1,354,000 / 1,382,000");
  assert.equal(hp.getAttribute("aria-label"), hp.title);
});

test("Enter and Space use the original leader click once and block fainted cards", t => {
  const s = setup(t), cards = [...s.root.querySelectorAll('[role="button"]')]; let active = 0, fainted = 0; cards[0].addEventListener("click", () => active++); cards[1].addEventListener("click", () => fainted++);
  assert.equal(cards[1].getAttribute("aria-disabled"), "true");
  cards[0].dispatchEvent(new s.dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true })); cards[0].dispatchEvent(new s.dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true })); cards[1].dispatchEvent(new s.dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  assert.equal(active, 2); assert.equal(fainted, 0);
});

test("fainted aria-disabled ownership follows native state and cleans up exactly", t => {
  const s = setup(t), runtime = s.dom.window.PokeIdle.PersistentHud._teamHud, card = s.root.querySelector('[data-creature-id="b"]');
  assert.equal(card.getAttribute("aria-disabled"), "true");
  card.setAttribute("aria-disabled", "false"); s.controller.sync(); assert.equal(card.getAttribute("aria-disabled"), "true");
  card.classList.remove("is-fainted"); runtime._creatures[1].hp = 40; s.controller.sync();
  assert.equal(card.getAttribute("aria-disabled"), "false", "latest native disabled state is restored when PPBUI no longer owns fainted state");
});

test("stable sync is mutation-free and native card replacement is enhanced once", async t => {
  const s = setup(t), seen = []; const observer = new s.dom.window.MutationObserver(records => seen.push(...records)); observer.observe(s.root, { subtree: true, childList: true, attributes: true, characterData: true });
  for (let index = 0; index < 5; index++) s.controller.sync(); await Promise.resolve(); assert.equal(seen.length, 0, seen.map(record => `${record.type}:${record.attributeName || record.target.nodeName}`).join(",")); observer.disconnect();
  s.root.querySelector(".pokeidle-team-hud__list").innerHTML = card("a"); s.controller.sync(); s.controller.sync(); assert.equal(s.root.querySelectorAll("[data-ppbui-team-hud-hp]").length, 1);
});

test("cleanup restores the exact current native accessibility state", t => {
  const s = setup(t), first = s.root.querySelector(".pokeidle-team-card"); first.setAttribute("title", "native update"); s.controller.cleanup();
  assert.equal(s.root.outerHTML.replace(' title="native update"', ""), s.before); assert.equal(first.title, "native update");
});
