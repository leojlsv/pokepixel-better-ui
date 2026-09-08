import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { mountTeamPresets } from "../src/modules/team-presets/controller.js";
import { currentTeamSnapshot, teamPresetVisualReader } from "../src/modules/team-presets/dom.js";

function fixture(t, kind = "canvas") {
  const dom = new JSDOM(`<div class="pokeidle-team-hud">${["a", "b", "c", "d", "e", "f"].map(id => `<div class="pokeidle-team-card" data-creature-id="${id}">${kind === "canvas" ? "<canvas></canvas>" : '<span class="pokemon-sprite"></span>'}<span class="pokeidle-team-card__compact-level">Lv.42</span></div>`).join("")}</div><div class="pokeidle-team-panel"><div class="pokeidle-panel__body"><section class="team-section--roster"></section></div></div>`, { url: "https://example.test/game", pretendToBeVisual: true });
  const { document: doc } = dom.window, root = doc.querySelector(".pokeidle-team-hud");
  const creatures = ["a", "b", "c", "d", "e", "f"].map(id => ({ id, name: id, level: 42, hp: 10, max_hp: 20 }));
  dom.window.PokeIdle = { PersistentHud: { _teamHud: { el: root, _creatures: creatures } } };
  const calls = { canvas: 0, style: 0, scan: 0, index: 0, serialized: 0 };
  dom.window.HTMLCanvasElement.prototype.toDataURL = () => { calls.canvas++; return "data:image/png;base64," + "A".repeat(4096); };
  const getStyle = dom.window.getComputedStyle.bind(dom.window);
  dom.window.getComputedStyle = (...args) => { calls.style++; return getStyle(...args); };
  const queryAll = dom.window.Element.prototype.querySelectorAll;
  dom.window.Element.prototype.querySelectorAll = function(selector) {
    if (["*", "img", "canvas"].includes(selector) && this.closest(".pokeidle-team-card")) calls.scan++;
    if (this === root && selector.includes(".pokeidle-team-card")) calls.index++;
    return queryAll.call(this, selector);
  };
  const preset = { id: "p", name: "Team", activeId: "a", orderVerified: true, members: creatures.map(({ id, name, level }) => ({ id, name, level })) };
  const entries = [preset, { ...preset, id: "p2" }, { ...preset, id: "p3" }];
  const store = { list: () => entries.map(p => ({ ...p, members: p.members.map(m => ({ ...m })) })), isPersistent: () => true };
  const controller = mountTeamPresets(root, { store });
  t.after(() => { controller.cleanup(); dom.window.close(); });
  return { dom, doc, root, controller, calls, entries };
}

for (const kind of ["canvas", "missing"]) test(`repeated sync performs no sprite resolution or serialization (${kind})`, async t => {
  const { dom, doc, root, controller, calls, entries } = fixture(t, kind);
  assert.equal(calls.canvas, kind === "canvas" ? 6 : 0, "one capture per native source, shared across presets and manager");
  root.querySelector(".ppbui-team-presets-toggle").click();
  const details = doc.querySelector("[data-ppbui-team-preset-manager]"); details.open = true;
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));
  const stringify = JSON.stringify;
  t.mock.method(JSON, "stringify", (...args) => { calls.serialized++; return stringify(...args); });
  const first = doc.querySelector("[data-ppbui-team-preset-card]");
  const reset = () => Object.keys(calls).forEach(key => { calls[key] = 0; });
  reset();
  const observer = new dom.window.MutationObserver(() => {}); observer.observe(doc.body, { subtree: true, attributes: true, childList: true, characterData: true });
  for (let i = 0; i < 100; i++) controller.sync();
  assert.deepEqual(calls, { canvas: 0, style: 0, scan: 0, index: 100, serialized: 0 });
  assert.equal(doc.querySelector("[data-ppbui-team-preset-card]"), first);
  assert.equal(observer.takeRecords().length, 0, "unchanged sync must not feed the central observer"); observer.disconnect();
  root.querySelector(".ppbui-team-presets-toggle").click(); reset();
  for (let i = 0; i < 100; i++) controller.sync();
  assert.deepEqual(calls, { canvas: 0, style: 0, scan: 0, index: 0, serialized: 0 });
  // Even a new native card and changed manager metadata must not trigger expensive sync fallback.
  const native = root.querySelector(".pokeidle-team-card"); native.replaceWith(native.cloneNode(true));
  entries[0].name = "Renamed"; reset(); controller.sync();
  assert.equal(calls.canvas + calls.style + calls.scan + calls.serialized, 0);
});

test("saved sprites bypass native extraction; explicit capture refreshes changing canvas", t => {
  const { root, calls } = fixture(t);
  calls.canvas = 0; calls.style = 0; calls.scan = 0;
  const saved = "/sprites/saved.png";
  assert.equal(teamPresetVisualReader(root, { resolveSprites: true })({ id: "a", sprite: saved }).sprite, saved);
  assert.equal(calls.canvas + calls.style + calls.scan, 0);
  const canvas = root.querySelector("canvas"); canvas.toDataURL = () => "data:image/png;base64,NEW";
  const snapshot = currentTeamSnapshot(root);
  assert.equal(snapshot.members[0].sprite, "data:image/png;base64,NEW");
  assert.equal(teamPresetVisualReader(root)({ ...snapshot.members[0] }).sprite, "data:image/png;base64,NEW");
});

test("relative sprite URLs do not cause repeated image writes", t => {
  const { dom, doc, root, controller, entries } = fixture(t);
  entries.forEach(p => p.members.forEach(m => { m.sprite = "/sprites/a.png"; }));
  root.querySelector(".ppbui-team-presets-toggle").click(); controller.sync();
  const observer = new dom.window.MutationObserver(() => {}); observer.observe(doc.body, { subtree: true, attributes: true });
  for (let i = 0; i < 10; i++) controller.sync();
  assert.equal(observer.takeRecords().length, 0); observer.disconnect();
});

test("a late sprite is retried on explicit reopen, never by repeated sync", t => {
  const { root, controller, calls } = fixture(t, "missing");
  root.querySelector(".pokemon-sprite").style.backgroundImage = 'url("/sprites/late.png")';
  calls.style = 0; calls.scan = 0;
  controller.sync(); controller.sync();
  assert.equal(calls.style + calls.scan, 0);
  root.querySelector(".ppbui-team-presets-toggle").click();
  assert.equal(root.querySelector("[data-ppbui-team-presets-member] img").getAttribute("src"), "/sprites/late.png");
  calls.style = 0; calls.scan = 0;
  controller.sync(); controller.sync();
  assert.equal(calls.style + calls.scan, 0);
});
