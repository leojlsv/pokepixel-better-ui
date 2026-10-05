import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { mountEvolutionCenter } from "../src/modules/evolution-center/controller.js";
import { findEvolutionModeSelect } from "../src/modules/evolution-center/dom.js";

function renderFilters(doc, root, mode = "") {
  let body = root.querySelector(":scope > .pokeidle-panel__body");
  if (!body) {
    body = doc.createElement("div");
    body.className = "pokeidle-panel__body";
    root.append(body);
  }
  const filters = doc.createElement("div");
  filters.className = "npc-evolution-filters";
  const search = doc.createElement("input"); search.type = "search"; filters.append(search);
  for (const values of [
    [["", "All Elements"], ["fire", "Fire"]],
    [["all", "All Qualities"], ["rare", "Rare"]],
    [["", "All Variants"], ["normal", "Normal"], ["shiny", "Shiny"]],
  ]) {
    const select = doc.createElement("select");
    values.forEach(([value, label]) => select.add(new doc.defaultView.Option(label, value)));
    filters.append(select);
  }
  const modeSelect = doc.createElement("select");
  modeSelect.setAttribute("aria-label", "All Evolutions");
  [["", "All Evolutions"], ["normal", "Normal Evolution"], ["mega", "Mega Evolution"]]
    .forEach(([value, label]) => modeSelect.add(new doc.defaultView.Option(label, value)));
  modeSelect.value = mode;
  filters.append(modeSelect);
  const sort = doc.createElement("select");
  [["name_asc", "Name A-Z"], ["level_desc", "Level ↓"]].forEach(([value, label]) => sort.add(new doc.defaultView.Option(label, value)));
  filters.append(sort, doc.createElement("button"));
  body.replaceChildren(filters);
  return modeSelect;
}

function setup(t, mode = "") {
  const dom = new JSDOM("<!doctype html><html><body><section class='npc-evolution-window'><div class='pokeidle-panel__body'></div></section></body></html>", { pretendToBeVisual: true });
  const doc = dom.window.document, root = doc.querySelector(".npc-evolution-window");
  const select = renderFilters(doc, root, mode), changes = [];
  select.addEventListener("change", () => changes.push(select.value));
  const controller = mountEvolutionCenter(root);
  t.after(() => { controller.cleanup(); dom.window.close(); });
  return { dom, doc, root, select, changes, controller };
}

test("Evolution mode is rendered as All/Normal/Mega buttons and initially selects Normal", t => {
  const s = setup(t);
  const buttons = [...s.root.querySelectorAll("[data-ppbui-evolution-mode] button")];
  assert.equal(findEvolutionModeSelect(s.root), s.select, "native select remains the authoritative mode control");
  assert.equal(s.select.hidden, true);
  assert.equal(s.select.value, "normal");
  assert.deepEqual(s.changes, ["normal"], "initial Normal mode is applied through the native change contract");
  assert.deepEqual(buttons.map(button => button.textContent), ["All", "Normal", "Mega"]);
  assert.deepEqual(buttons.map(button => button.getAttribute("aria-pressed")), ["false", "true", "false"]);
  assert.equal(buttons.every(button => button.type === "button"), true);
});

test("opening default converges to Normal even if the host preselects another mode", t => {
  const s = setup(t, "mega");
  assert.equal(s.select.value, "normal");
  assert.deepEqual(s.changes, ["normal"]);
  assert.equal(s.root.querySelector('[data-evolution-mode="normal"]').getAttribute("aria-pressed"), "true");
});

test("mode buttons preserve the native All/Normal/Mega states without executing evolution actions", t => {
  const s = setup(t);
  const buttons = [...s.root.querySelectorAll("[data-ppbui-evolution-mode] button")];
  buttons[2].click();
  assert.equal(s.select.value, "mega");
  assert.deepEqual(s.changes, ["normal", "mega"]);
  assert.deepEqual(buttons.map(button => button.getAttribute("aria-pressed")), ["false", "false", "true"]);
  buttons[0].click();
  assert.equal(s.select.value, "");
  assert.deepEqual(s.changes, ["normal", "mega", ""]);
  assert.deepEqual(buttons.map(button => button.getAttribute("aria-pressed")), ["true", "false", "false"]);
});

test("Clear-style native rerender may return to All without reapplying the opening default", t => {
  const s = setup(t);
  const replacement = renderFilters(s.doc, s.root, "");
  const changes = [];
  replacement.addEventListener("change", () => changes.push(replacement.value));
  s.controller.sync();
  const buttons = [...s.root.querySelectorAll("[data-ppbui-evolution-mode] button")];
  assert.equal(replacement.value, "", "Normal is an opening default, not a permanent forced filter");
  assert.deepEqual(changes, []);
  assert.deepEqual(buttons.map(button => button.getAttribute("aria-pressed")), ["true", "false", "false"]);
});

test("stable sync is mutation-free and cleanup restores the current native select", async t => {
  const s = setup(t, "normal"), observer = new s.dom.window.MutationObserver(() => {});
  observer.observe(s.root, { childList: true, subtree: true, attributes: true, characterData: true });
  s.controller.sync(); s.controller.sync();
  await Promise.resolve();
  assert.equal(observer.takeRecords().length, 0);
  observer.disconnect();
  s.controller.cleanup();
  assert.equal(s.root.querySelector("[data-ppbui-evolution-mode]"), null);
  assert.equal(s.select.hidden, false);
  assert.equal(s.select.hasAttribute("data-ppbui-evolution-mode-source"), false);
});
