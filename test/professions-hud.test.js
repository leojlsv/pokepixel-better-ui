import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { decorateProfessionTop3, mountProfessionsHud } from "../src/modules/professions-hud/controller.js";

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

async function waitFor(predicate, message = "condition", attempts = 30) {
  for (let index = 0; index < attempts; index += 1) {
    if (predicate()) return;
    await tick();
  }
  assert.fail(`Timed out waiting for ${message}`);
}

function workerCard({ slot = 1, id = "worker-1", name = "Machoke", locked = false } = {}) {
  return `
    <article class="profession-worker${locked ? " is-locked" : ""}" data-slot-index="${slot}" data-creature-id="${locked ? "" : id}">
      <b data-role="worker-name">${name}</b>
      <div class="profession-worker__actions">
        <button type="button" data-role="worker-collect">COLETAR</button>
        <button type="button">REMOVER POKÉMON</button>
      </div>
    </article>
  `;
}

function setup(t, { kind = "miner", workforce, confirm = true, locale = "pt" } = {}) {
  const dom = new JSDOM(`<!doctype html><html lang="pt"><body>
    <div class="prof-workforce">
      <section class="prof-work-stage ${kind}"></section>
      <section class="prof-work-manager">
        <div class="profession-workforce">
          <div class="profession-workforce__slots">
            ${workerCard()}
            <article class="profession-worker" data-slot-index="2" data-creature-id="">
              <div class="profession-worker__empty">
                <select aria-label="Pokémon para o slot 2">
                  <option value="">Selecionar Pokémon...</option>
                  <option value="a">A · Eficiência 91.0%</option>
                  <option value="b">B · Eficiência 120.5%</option>
                  <option value="c">C · Eficiência 105,2%</option>
                  <option value="d">D · Eficiência 70.0%</option>
                </select>
              </div>
            </article>
            ${workerCard({ slot: 3, id: "locked", locked: true })}
          </div>
        </div>
      </section>
    </div>
  </body></html>`, { url: "https://fixture.invalid" });
  t.after(() => dom.window.close());
  const { window } = dom;
  const doc = window.document;
  const calls = [];
  const toasts = [];
  const bus = [];
  const state = workforce || {
    max_slots: 3,
    workers: [{
      id: "assignment-row-1", creature_id: "worker-1", creature_name: "Machoke", slot_index: 1,
      rewards: { prof_stone_fragment: 2 }, efficiency: { total_basis: 9300 },
    }],
    candidates: [
      { id: "candidate-1", name: "Rhydon", efficiency: { total_basis: 11800 } },
      { id: "candidate-2", name: "Onix", efficiency: { total_basis: 10100 } },
      { id: "candidate-3", name: "Geodude", efficiency: { total_basis: 9900 } },
      { id: "candidate-4", name: "Sandshrew", efficiency: { total_basis: 8500 } },
    ],
  };
  let currentState = structuredClone(state);
  const api = {
    async getMiningWorkforce() { calls.push(["get"]); return { data: structuredClone(currentState) }; },
    async collectMiningRewards(slot) { calls.push(["collect", slot]); },
    async removeMiningWorker(slot) { calls.push(["remove", slot]); },
    async assignMiningWorker(id, slot) { calls.push(["assign", id, slot]); },
    async getFarmWorkforce() { calls.push(["get-farm"]); return { data: structuredClone(currentState) }; },
    async collectFarmRewards(slot) { calls.push(["collect-farm", slot]); },
    async removeFarmWorker(slot) { calls.push(["remove-farm", slot]); },
    async assignFarmWorker(id, slot) { calls.push(["assign-farm", id, slot]); },
  };
  const scene = {
    _panel: { body: doc.querySelector(".prof-workforce") },
    async reloadWorkforce() { calls.push(["refresh"]); },
  };
  window.SceneManager = { _scene: scene };
  window.PokeIdle = {
    Localization: { get: () => locale },
    Api: api,
    Dialog: { async confirm(...args) { calls.push(["confirm", ...args]); return confirm; } },
    Toast: {
      success(message) { toasts.push(["success", message]); },
      error(message) { toasts.push(["error", message]); },
    },
    Bus: { emit(name, payload) { bus.push([name, payload]); } },
  };
  const root = doc.querySelector(".profession-workforce");
  const controller = mountProfessionsHud(root);
  t.after(() => controller.cleanup());
  return {
    dom, window, doc, root, controller, calls, toasts, bus, api, scene,
    state: () => currentState,
    setState(next) { currentState = structuredClone(next); },
  };
}

test("Top 3 decorates native options without changing order, values or selection", t => {
  const s = setup(t);
  const select = s.root.querySelector(".profession-worker__empty select");
  select.value = "c";
  const beforeValues = [...select.options].map(option => option.value);
  decorateProfessionTop3(select);
  assert.deepEqual([...select.options].map(option => option.value), beforeValues);
  assert.equal(select.value, "c");
  assert.equal(select.options[1].textContent, "#3 · A · Eficiência 91.0%");
  assert.equal(select.options[2].textContent, "#1 · B · Eficiência 120.5%");
  assert.equal(select.options[3].textContent, "#2 · C · Eficiência 105,2%");
  assert.equal(select.options[4].textContent, "D · Eficiência 70.0%");
  assert.equal(s.calls.length, 0, "ranking must be DOM-only");
});

test("sync adds one swap action only to occupied unlocked workers and cleanup restores Top 3 text", t => {
  const s = setup(t);
  s.controller.sync();
  s.controller.sync();
  assert.equal(s.root.querySelectorAll("[data-ppbui-professions-swap]").length, 1);
  assert.equal(s.root.querySelector("[data-ppbui-professions-swap]").textContent, "TROCAR");
  assert.equal(s.root.querySelector("[data-ppbui-professions-swap]").getAttribute("aria-label"), "Trocar Machoke, Slot 1");
  assert.deepEqual(
    [...s.root.querySelector('.profession-worker[data-slot-index="1"] .profession-worker__actions').children]
      .filter(node => node.tagName === "BUTTON")
      .map(node => node.hasAttribute("data-role") ? "collect" : node.hasAttribute("data-ppbui-professions-swap") ? "swap" : "remove"),
    ["collect", "swap", "remove"]
  );
  s.root.querySelector('[data-role="worker-name"]').textContent = "Primeape";
  s.controller.sync();
  assert.equal(s.root.querySelector("[data-ppbui-professions-swap]").getAttribute("aria-label"), "Trocar Primeape, Slot 1");
  assert.equal(s.root.querySelector('.profession-worker[data-slot-index="3"] [data-ppbui-professions-swap]'), null);
  assert.match(s.root.querySelector('.profession-worker__empty option[value="b"]').textContent, /^#1 ·/);
  assert.equal(s.root.querySelector("[data-ppbui-professions-top3-hint]").textContent, "Top 3 por eficiência");
  assert.equal(s.root.querySelector('.profession-worker[data-slot-index="1"]').dataset.ppbuiProfessionsState, "occupied");
  assert.equal(s.root.querySelector('.profession-worker[data-slot-index="2"]').dataset.ppbuiProfessionsState, "empty");
  s.controller.cleanup();
  assert.equal(s.root.querySelectorAll("[data-ppbui-professions-swap]").length, 0);
  assert.equal(s.root.querySelector('.profession-worker__empty option[value="b"]').textContent, "B · Eficiência 120.5%");
  assert.equal(s.root.querySelector("[data-ppbui-professions-top3-hint]"), null);
  assert.equal(s.root.querySelector("[data-ppbui-professions-state]"), null);
  assert.equal(s.root.hasAttribute("data-ppbui-professions-hud-enhanced"), false);
});

test("Portuguese native Professions surface keeps Better UI copy Portuguese even when account locale is English", async t => {
  const s = setup(t, { locale: "en-US" });
  const trigger = s.root.querySelector("[data-ppbui-professions-swap]");
  assert.equal(trigger.textContent, "TROCAR");
  assert.equal(trigger.getAttribute("aria-label"), "Trocar Machoke, Slot 1");
  trigger.click();
  await waitFor(() => s.root.querySelector("[data-ppbui-professions-swap-panel]"), "swap panel");
  const panel = s.root.querySelector("[data-ppbui-professions-swap-panel]");
  assert.equal(panel.querySelector(".ppbui-professions-swap-head strong").textContent, "Troca de trabalhador");
  assert.equal(panel.querySelector(".ppbui-professions-swap-field").firstChild.textContent, "Substituir por");
  assert.equal(panel.querySelector(".ppbui-professions-swap-actions .ppbui-button--primary").textContent, "TROCAR");
});

test("opening swap reads fresh state and creates a ranked owned candidate select without writes", async t => {
  const s = setup(t);
  s.root.querySelector("[data-ppbui-professions-swap]").click();
  await waitFor(() => s.root.querySelector("[data-ppbui-professions-swap-panel]"), "swap panel");
  assert.deepEqual(s.calls, [["get"]]);
  const select = s.root.querySelector("[data-ppbui-professions-swap-candidate]");
  assert.deepEqual([...select.options].map(option => option.value), ["candidate-1", "candidate-2", "candidate-3", "candidate-4"]);
  assert.match(select.options[0].textContent, /^#1 · Rhydon · 118\.0%$/);
  assert.match(select.options[2].textContent, /^#3 · Geodude · 99\.0%$/);
  assert.doesNotMatch(select.options[3].textContent, /^#/);
  const facts = [...s.root.querySelectorAll(".ppbui-professions-swap-fact")];
  assert.deepEqual(facts.map(fact => fact.querySelector("span").textContent), ["Atual", "Novo", "Diferença"]);
  assert.equal(facts[0].querySelector("b").textContent, "Machoke · 93.0%");
  assert.equal(facts[1].querySelector("b").textContent, "Rhydon · 118.0%");
  assert.equal(facts[2].querySelector("b").textContent, "+25.0 p.p.");
  assert.equal(facts[2].dataset.direction, "up");
  assert.equal(s.calls.some(([name]) => ["collect", "remove", "assign"].includes(name)), false);
});

test("Professions refinement uses a stable three-action row and compact empty-slot layout", t => {
  const s = setup(t);
  const css = s.root.querySelector('style[data-ppbui-module="professions-hud"]').textContent;
  assert.match(css, /\.profession-worker__actions \{[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) !important/);
  assert.match(css, /\[data-ppbui-professions-state="empty"\],[\s\S]*min-height: 190px !important/);
  assert.match(css, /\.profession-worker__empty[\s\S]*justify-content: flex-start !important/);
  assert.doesNotMatch(css, /\.ppbui-professions-swap-button \{[^}]*\n\s*order\s*:/);
  assert.match(css, /\[data-ppbui-professions-swap-panel\] \{[\s\S]*border-left: var\(--ppbui-border-width\) solid var\(--ppbui-accent\)/);
});

test("stable Professions sync is mutation-free after enhancement is settled", async t => {
  const s = setup(t);
  const seen = [];
  const observer = new s.window.MutationObserver(records => seen.push(...records));
  observer.observe(s.root, { subtree: true, childList: true, attributes: true, characterData: true });
  s.controller.sync();
  s.controller.sync();
  await tick();
  observer.disconnect();
  assert.equal(seen.length, 0, seen.map(record => `${record.type}:${record.attributeName || record.target.nodeName}`).join(","));
});

test("Escape closes the inline chooser and restores focus to its swap trigger", async t => {
  const s = setup(t);
  const trigger = s.root.querySelector("[data-ppbui-professions-swap]");
  trigger.focus();
  trigger.click();
  await waitFor(() => s.root.querySelector("[data-ppbui-professions-swap-panel]"), "swap panel");
  const panel = s.root.querySelector("[data-ppbui-professions-swap-panel]");
  panel.dispatchEvent(new s.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
  assert.equal(s.root.querySelector("[data-ppbui-professions-swap-panel]"), null);
  assert.equal(s.doc.activeElement, trigger);
});

test("two confirmations while native confirm is pending produce one transaction", async t => {
  const s = setup(t);
  let resolveConfirm;
  let confirmCalls = 0;
  s.window.PokeIdle.Dialog.confirm = (...args) => {
    confirmCalls += 1;
    s.calls.push(["confirm", ...args]);
    return new Promise(resolve => { resolveConfirm = resolve; });
  };
  s.root.querySelector("[data-ppbui-professions-swap]").click();
  await waitFor(() => s.root.querySelector("[data-ppbui-professions-swap-panel]"), "swap panel");
  const confirm = s.root.querySelector("[data-ppbui-professions-swap-panel] .ppbui-button--primary");
  confirm.dispatchEvent(new s.window.MouseEvent("click", { bubbles: true }));
  confirm.dispatchEvent(new s.window.MouseEvent("click", { bubbles: true }));
  await waitFor(() => typeof resolveConfirm === "function", "pending confirmation");
  assert.equal(confirmCalls, 1);
  resolveConfirm(true);
  await waitFor(() => s.calls.some(([name]) => name === "refresh"), "native refresh");
  assert.equal(s.calls.filter(([name]) => name === "collect").length, 1);
  assert.equal(s.calls.filter(([name]) => name === "remove").length, 1);
  assert.equal(s.calls.filter(([name]) => name === "assign").length, 1);
});

test("a late first slot read cannot replace a newer slot chooser", async t => {
  const s = setup(t);
  const empty = s.root.querySelector('.profession-worker[data-slot-index="2"]');
  const template = s.doc.createElement("template");
  template.innerHTML = workerCard({ slot: 2, id: "worker-2", name: "Onix" });
  empty.replaceWith(template.content.firstElementChild);
  const next = structuredClone(s.state());
  next.workers.push({
    id: "assignment-row-2", creature_id: "worker-2", creature_name: "Onix", slot_index: 2,
    rewards: {}, efficiency: { total_basis: 8800 },
  });
  s.setState(next);
  s.controller.sync();

  let resolveFirst;
  let resolveSecond;
  let reads = 0;
  s.api.getMiningWorkforce = () => {
    reads += 1;
    s.calls.push(["get"]);
    return new Promise(resolve => {
      if (reads === 1) resolveFirst = resolve;
      else resolveSecond = resolve;
    });
  };
  const buttons = [...s.root.querySelectorAll("[data-ppbui-professions-swap]")];
  buttons[0].click();
  buttons[1].click();
  await waitFor(() => typeof resolveSecond === "function", "second workforce read");
  resolveSecond({ data: structuredClone(s.state()) });
  await waitFor(() => s.root.querySelector("[data-ppbui-professions-swap-panel]"), "newer chooser");
  assert.equal(s.root.querySelector("[data-ppbui-professions-swap-panel]").closest(".profession-worker").dataset.slotIndex, "2");
  resolveFirst({ data: structuredClone(s.state()) });
  await tick();
  await tick();
  assert.equal(s.root.querySelector("[data-ppbui-professions-swap-panel]").closest(".profession-worker").dataset.slotIndex, "2");
});

test("confirmed swap revalidates then collects, removes, assigns and refreshes in strict order", async t => {
  const s = setup(t);
  s.root.querySelector("[data-ppbui-professions-swap]").click();
  await waitFor(() => s.root.querySelector("[data-ppbui-professions-swap-panel]"), "swap panel");
  const select = s.root.querySelector("[data-ppbui-professions-swap-candidate]");
  select.value = "candidate-2";
  select.dispatchEvent(new s.window.Event("change", { bubbles: true }));
  s.root.querySelector("[data-ppbui-professions-swap-panel] .ppbui-button--primary").click();
  await waitFor(() => s.calls.some(([name]) => name === "refresh"), "native refresh");
  assert.deepEqual(s.calls.map(([name]) => name), ["get", "confirm", "get", "collect", "remove", "assign", "refresh"]);
  assert.deepEqual(s.calls.find(([name]) => name === "assign"), ["assign", "candidate-2", 1]);
  assert.deepEqual(s.bus.map(([name]) => name), ["inventory.updated", "creatures.updated"]);
  assert.equal(s.toasts.at(-1)?.[0], "success");
  assert.equal(s.root.hasAttribute("inert"), false);
  assert.equal(s.root.hasAttribute("aria-busy"), false);
  assert.equal(s.doc.activeElement, s.root.querySelector("[data-ppbui-professions-swap]"));
});

test("native worker replacement restores keyboard focus to the same slot's new swap action", async t => {
  const s = setup(t);
  s.scene.reloadWorkforce = async () => {
    s.calls.push(["refresh"]);
    const oldCard = s.root.querySelector('.profession-worker[data-slot-index="1"]');
    const template = s.doc.createElement("template");
    template.innerHTML = workerCard({ slot: 1, id: "candidate-1", name: "Rhydon" });
    oldCard.replaceWith(template.content.firstElementChild);
  };
  s.root.querySelector("[data-ppbui-professions-swap]").click();
  await waitFor(() => s.root.querySelector("[data-ppbui-professions-swap-panel]"), "swap panel");
  s.root.querySelector("[data-ppbui-professions-swap-panel] .ppbui-button--primary").click();
  await waitFor(() => s.calls.some(([name]) => name === "refresh"), "native refresh");
  await tick();
  const nextSwap = s.root.querySelector('.profession-worker[data-slot-index="1"] [data-ppbui-professions-swap]');
  assert.ok(nextSwap);
  assert.equal(nextSwap.getAttribute("aria-label"), "Trocar Rhydon, Slot 1");
  assert.equal(s.doc.activeElement, nextSwap);
});

test("post-confirm stale candidate fails closed before any workforce write", async t => {
  const s = setup(t);
  s.root.querySelector("[data-ppbui-professions-swap]").click();
  await waitFor(() => s.root.querySelector("[data-ppbui-professions-swap-panel]"), "swap panel");
  const next = structuredClone(s.state());
  next.candidates = next.candidates.filter(candidate => candidate.id !== "candidate-1");
  s.setState(next);
  s.root.querySelector("[data-ppbui-professions-swap-panel] .ppbui-button--primary").click();
  await waitFor(() => s.toasts.some(([kind]) => kind === "error"), "stale error");
  await waitFor(() => s.calls.some(([name]) => name === "refresh"), "stale refresh");
  assert.deepEqual(s.calls.map(([name]) => name), ["get", "confirm", "get", "refresh"]);
  assert.equal(s.bus.length, 0);
});

test("assignment failure after removal reports an uncertain outcome, does not retry, and refreshes", async t => {
  const s = setup(t);
  s.api.assignMiningWorker = async (id, slot) => {
    s.calls.push(["assign", id, slot]);
    throw new Error("assign denied");
  };
  s.root.querySelector("[data-ppbui-professions-swap]").click();
  await waitFor(() => s.root.querySelector("[data-ppbui-professions-swap-panel]"), "swap panel");
  s.root.querySelector("[data-ppbui-professions-swap-panel] .ppbui-button--primary").click();
  await waitFor(() => s.calls.some(([name]) => name === "refresh"), "native refresh");
  assert.deepEqual(s.calls.map(([name]) => name), ["get", "confirm", "get", "collect", "remove", "assign", "refresh"]);
  assert.equal(s.calls.filter(([name]) => name === "assign").length, 1);
  assert.match(s.toasts.at(-1)?.[1] || "", /Não foi possível confirmar/);
  assert.doesNotMatch(s.toasts.at(-1)?.[1] || "", /slot ficou livre/i);
  assert.deepEqual(s.bus.map(([name]) => name), ["inventory.updated", "creatures.updated"]);
});

test("Farm surface uses Farm APIs and a cancelled confirmation performs no write", async t => {
  const s = setup(t, { kind: "farmer", confirm: false });
  s.root.querySelector("[data-ppbui-professions-swap]").click();
  await waitFor(() => s.root.querySelector("[data-ppbui-professions-swap-panel]"), "swap panel");
  s.root.querySelector("[data-ppbui-professions-swap-panel] .ppbui-button--primary").click();
  await waitFor(() => s.calls.some(([name]) => name === "confirm"), "confirmation");
  assert.deepEqual(s.calls.map(([name]) => name), ["get-farm", "confirm"]);
});

test("cleanup while confirmation is pending fences every later workforce write", async t => {
  const s = setup(t);
  let resolveConfirm;
  s.window.PokeIdle.Dialog.confirm = (...args) => {
    s.calls.push(["confirm", ...args]);
    return new Promise(resolve => { resolveConfirm = resolve; });
  };
  s.root.querySelector("[data-ppbui-professions-swap]").click();
  await waitFor(() => s.root.querySelector("[data-ppbui-professions-swap-panel]"), "swap panel");
  const confirm = s.root.querySelector("[data-ppbui-professions-swap-panel] .ppbui-button--primary");
  confirm.click();
  await waitFor(() => typeof resolveConfirm === "function", "pending confirmation");
  s.controller.cleanup();
  resolveConfirm(true);
  await tick();
  await tick();
  assert.deepEqual(s.calls.map(([name]) => name), ["get", "confirm"]);
  assert.equal(s.bus.length, 0);
});
