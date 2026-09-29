import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createCoupledCards } from "../src/modules/coupled-workspace/cards.js";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createStandaloneCardModeModule } from "../src/modules/coupled-workspace/standalone.js";

test("re-rendering unchanged Cards data leaves the observed DOM unchanged", t => {
  const dom = new JSDOM("<!doctype html><html lang=\"pt-BR\"><body></body></html>", {
    url: "https://fixture.invalid", pretendToBeVisual: true,
  });
  const win = dom.window;
  const cards = createCoupledCards({ win, textOnly: true });
  t.after(() => { cards.cleanup(); win.close(); });
  cards.setMode("cards");
  const summary = {
    protocol: 1, available: true, status: "running", activeMs: 2500,
    seen: 5, captured: 2, failed: 3,
    rarityCounts: { rare: { captured: 1, seen: 2 } },
    currentTarget: { speciesId: "pikachu", species: "Pikachu", elements: ["electric"] },
    specialHistory: [], lootHistory: [],
  };
  cards.render(summary);
  const observer = new win.MutationObserver(() => {});
  observer.observe(cards.root, {
    childList: true, attributes: true, subtree: true,
    attributeFilter: ["hidden", "disabled", "aria-hidden", "aria-disabled", "lang"],
  });
  cards.render(summary);
  const changes = observer.takeRecords();
  observer.disconnect();
  const offenders = changes.map(change => `${change.type}:${change.attributeName || "children"}:${change.target.outerHTML?.slice(0, 105) || change.target.nodeName}`);
  assert.equal(changes.length, 0, `unchanged data changed ${changes.length} observed DOM nodes\n${offenders.join("\n")}`);
});

test("native Elements retry after transient icon failure and late in-place hydration", t => {
  const dom = new JSDOM("<!doctype html><html lang='pt-BR'><body></body></html>", {
    url: "https://fixture.invalid", pretendToBeVisual: true,
  });
  const win = dom.window;
  let failOnce = true;
  const icons = {
    definition: type => ({ label: type, color: "#ffcc00" }),
    create(type) {
      if (failOnce) { failOnce = false; throw new Error("native icon temporarily unavailable"); }
      const image = win.document.createElement("img");
      image.src = `/first-${type}.png`;
      return image;
    },
  };
  win.PokeIdle = { ElementIcons: icons };
  const cards = createCoupledCards({ win });
  t.after(() => { cards.cleanup(); win.close(); });
  const summary = { status: "running", currentTarget: { speciesId: "pikachu", species: "Pikachu", elements: ["electric"] } };
  cards.setMode("cards");
  assert.throws(() => cards.render(summary), /temporarily unavailable/);
  cards.render(summary);
  const target = cards.root.querySelector('[data-card-elements="target"]');
  assert.match(target.querySelector("img")?.src || "", /first-electric\.png$/);
  icons.create = type => {
    const image = win.document.createElement("img");
    image.src = `/second-${type}.png`;
    return image;
  };
  cards.render(summary);
  assert.match(target.querySelector("img")?.src || "", /second-electric\.png$/);
  const observer = new win.MutationObserver(() => {});
  observer.observe(target, { childList: true, subtree: true });
  cards.render(summary);
  assert.equal(observer.takeRecords().length, 0, "stable hydrated Elements must not rebuild their icons");
  observer.disconnect();
});

test("the central observer reaches quiescence with unchanged standalone Cards", async t => {
  const dom = new JSDOM(`<!doctype html><html lang="pt-BR"><head></head><body>
    <nav class="pokeidle-top-toolbar"><button data-menu-id="inventory">Inventory</button></nav>
  </body></html>`, { url: "https://fixture.invalid", pretendToBeVisual: true });
  const win = dom.window;
  const previous = new Map();
  for (const key of ["document", "window", "MutationObserver", "requestAnimationFrame", "cancelAnimationFrame"]) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  }
  let nextId = 0;
  const pending = new Map();
  Object.defineProperties(globalThis, {
    document: { configurable: true, value: win.document },
    window: { configurable: true, value: win },
    MutationObserver: { configurable: true, value: win.MutationObserver },
    requestAnimationFrame: { configurable: true, value: fn => { pending.set(++nextId, fn); return nextId; } },
    cancelAnimationFrame: { configurable: true, value: id => { pending.delete(id); } },
  });
  const app = createBetterUI({ modules: [createStandaloneCardModeModule()] });
  t.after(() => {
    app.stop();
    win.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  app.start();
  let frames = 0;
  for (; frames < 6; frames++) {
    await Promise.resolve();
    const callbacks = [...pending.values()];
    pending.clear();
    if (!callbacks.length) break;
    callbacks.forEach(callback => callback());
  }
  await Promise.resolve();
  assert.ok(frames < 6, "a stable Card Mode must not cause an unbounded observer/reconcile loop");
  assert.equal(pending.size, 0, "no follow-up animation frame should be queued by unchanged Cards");
});
