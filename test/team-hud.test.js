import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { mountTeamHud } from "../src/modules/team-hud/controller.js";

const card = (id, options = "") => `<div class="pokeidle-team-card ${options}" data-creature-id="${id}" style="--hp-percent:${id === "a" ? 72 : 0}%"><span class="pokeidle-team-card__name">${id === "a" ? "Pikachu" : "Gastly"}</span><span class="pokeidle-team-card__compact-level">Lv. ${id === "a" ? 20 : 12}</span><div class="pokeidle-team-card__hp-bar"><span class="pokeidle-team-card__bar-text">${id === "a" ? "2198/2198" : "0/1040"}</span></div><div class="pokeidle-team-card__xp-bar"><span class="pokeidle-team-card__bar-text pokeidle-team-card__bar-text--xp">EXP 25%</span></div></div>`;
function setup(t) {
  const dom = new JSDOM(`<div class="pokeidle-team-hud"><div class="pokeidle-trainer-hud__info"><div class="pokeidle-trainer-hud__xp-bar"><i class="pokeidle-trainer-hud__xp-fill"></i><span class="pokeidle-trainer-hud__xp-text">EXP 50%</span></div><div class="pokeidle-trainer-hud__stamina-bar"><i class="pokeidle-trainer-hud__stamina-fill"></i><span class="pokeidle-trainer-hud__stamina-text">Stamina 23m / 8h</span></div></div><div class="pokeidle-team-hud__active"><div class="pokeidle-team-hud__active-bar pokeidle-team-hud__active-bar--hp"><span class="pokeidle-team-hud__active-bar-text">2198/2198</span></div><div class="pokeidle-team-hud__active-bar pokeidle-team-hud__active-bar--xp"><span class="pokeidle-team-hud__active-bar-text">EXP 25%</span></div></div><div class="pokeidle-team-hud__list">${card("a", "is-leader")}${card("b", "is-fainted")}<button class="pokeidle-team-card pokeidle-team-card--empty">+</button></div></div>`, { pretendToBeVisual: true });
  const root = dom.window.document.body.firstChild, before = root.outerHTML;
  dom.window.PokeIdle = { Localization: { get: () => "pt-BR" }, PersistentHud: { _teamHud: { el: root, _trainer: { exp: 250000, exp_current_level: 200000, exp_next_level: 300000 }, _creatures: [
    { id: "a", is_leader: true, hp: 2198, max_hp: 2198, exp: 1500, exp_current_level: 1000, exp_next_level: 3000 },
    { id: "b", hp: 0, max_hp: 1040, exp: 400, exp_current_level: 200, exp_next_level: 1000 },
  ] } } };
  const controller = mountTeamHud(root);
  t.after(() => { controller.cleanup(); dom.window.close(); }); return { dom, root, before, controller };
}

test("compact native cards gain HP and fainted state without replacing nodes", t => {
  const s = setup(t), cards = [...s.root.querySelectorAll(".pokeidle-team-card:not(.pokeidle-team-card--empty)")]; let clicks = 0; cards[0].addEventListener("click", () => clicks++); cards[0].click();
  assert.equal(clicks, 1); assert.equal(cards[0].querySelector("[data-ppbui-team-hud-hp] i").style.width, ""); assert.match(cards[0].getAttribute("aria-label"), /Pikachu · Lv\. 20 · 2198\/2198/);
  assert.equal(cards[1].querySelector("[data-ppbui-team-hud-fainted]").textContent, "Derrotado"); assert.equal(s.root.querySelector(".pokeidle-team-card--empty [data-ppbui-team-hud-hp]"), null);
});

test("active and team HP use localized thousands separators", t => {
  const s = setup(t), active = s.root.querySelector(".pokeidle-team-hud__active [data-ppbui-team-hud-hp-value]"), cards = s.root.querySelectorAll(".pokeidle-team-card [data-ppbui-team-hud-hp-value]");
  assert.equal(active.textContent, "2,198 / 2,198"); assert.equal(cards[0].textContent, "2,198 / 2,198"); assert.equal(cards[1].textContent, "0 / 1,040");
});

test("trainer EXP and STA use external labels and every bar exposes hover values", t => {
  const s = setup(t), rows = s.root.querySelectorAll("[data-ppbui-team-hud-trainer-row]");
  assert.equal(rows[0].firstElementChild.textContent, "EXP"); assert.equal(rows[0].querySelector("[data-ppbui-team-hud-exp]").textContent, "50,000 / 100,000 · 50%");
  assert.equal(rows[1].firstElementChild.textContent, "STA"); assert.equal(rows[1].querySelector("[data-ppbui-team-hud-sta]").textContent, "23m / 8h");
  assert.ok(rows[0].classList.contains("pokeidle-team-hud__active-stat")); assert.ok(rows[0].lastElementChild.classList.contains("pokeidle-team-hud__active-bar")); assert.equal(rows[0].querySelector("[data-ppbui-team-hud-exp]").className, "pokeidle-team-hud__active-bar-text");
  const css = s.root.querySelector('style[data-ppbui-module="team-hud"]').textContent; assert.match(css, /display:flex !important; flex-direction:row !important/); assert.match(css, /active-stat-label \{ flex:0 0 28px/); assert.match(css, /> \.pokeidle-team-hud__active-bar \{ flex:1 1 auto/);
  const bars = s.root.querySelectorAll(".pokeidle-trainer-hud__xp-bar,.pokeidle-trainer-hud__stamina-bar,.pokeidle-team-hud__active-bar,.pokeidle-team-card__hp-bar,.pokeidle-team-card__xp-bar");
  assert.equal([...bars].every(bar => Boolean(bar.title)), true);
});

test("active and team bars show absolute level EXP with percentage", t => {
  const s = setup(t), active = s.root.querySelector(".pokeidle-team-hud__active [data-ppbui-team-hud-exp]"), cards = s.root.querySelectorAll(".pokeidle-team-card [data-ppbui-team-hud-exp]");
  assert.equal(active.textContent, "500 / 2,000 · 25%"); assert.equal(cards[0].textContent, "500 / 2,000 · 25%"); assert.equal(cards[1].textContent, "200 / 800 · 25%");
  assert.equal(active.className, "pokeidle-team-hud__active-bar-text"); assert.equal(cards[0].className, "pokeidle-team-card__bar-text");
  assert.equal(s.root.querySelector(".pokeidle-team-hud__active-bar--xp > .pokeidle-team-hud__active-bar-text:not([data-ppbui-team-hud-exp])").textContent, "EXP 25%");
});

test("Enter and Space use the original leader click once and block fainted cards", t => {
  const s = setup(t), cards = [...s.root.querySelectorAll('[role="button"]')]; let active = 0, fainted = 0; cards[0].addEventListener("click", () => active++); cards[1].addEventListener("click", () => fainted++);
  cards[0].dispatchEvent(new s.dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true })); cards[0].dispatchEvent(new s.dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true })); cards[1].dispatchEvent(new s.dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  assert.equal(active, 2); assert.equal(fainted, 0);
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
