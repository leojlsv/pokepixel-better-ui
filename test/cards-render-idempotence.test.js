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

test("Story relative timestamps advance on unchanged data without replacing rows or churning the observer", t => {
  const now = Date.now();
  const originalNow = Date.now;
  let clock = now;
  Date.now = () => clock;
  const win = new JSDOM("<!doctype html><html lang='pt-BR'><body></body></html>", {
    url: "https://fixture.invalid", pretendToBeVisual: true,
  }).window;
  const cards = createCoupledCards({ win, textOnly: true });
  t.after(() => { Date.now = originalNow; cards.cleanup(); win.close(); });
  cards.setMode("cards");
  const summary = {
    status: "running",
    specialHistory: [{ atMs: now - 10_000, species: "Gengar", rarity: "epic", result: "captured", ball: "Ultra Ball" }],
    lootHistory: [{ atMs: now - 61_000, species: "Gengar", items: [] }],
  };
  cards.render(summary);
  const attempt = cards.root.querySelector(".ppbui-cards-attempt");
  const time = attempt.querySelector('[data-attempt-column="0"]');
  const loot = cards.root.querySelector(".ppbui-cards-loot-row");
  const lootTime = loot.querySelector(".ppbui-cards-loot-head span");
  assert.match(time.textContent, /10 seg/);
  assert.match(lootTime.textContent, /1 min/);

  const observer = new win.MutationObserver(() => {});
  observer.observe(cards.root, { childList: true, characterData: true, subtree: true });
  cards.render(summary);
  assert.equal(observer.takeRecords().length, 0, "same time bucket leaves DOM untouched");
  clock += 62_000;
  cards.render(summary);
  assert.equal(cards.root.querySelector(".ppbui-cards-attempt"), attempt);
  assert.equal(cards.root.querySelector(".ppbui-cards-loot-row"), loot);
  assert.match(time.textContent, /1 min/);
  assert.match(time.getAttribute("aria-label"), /1 min/);
  assert.match(lootTime.textContent, /2 min/);
  const mutations = observer.takeRecords();
  assert.equal(mutations.some(change => change.target === attempt.parentNode || change.target === loot.parentNode), false,
    "time refresh must not replace the Story lists");
  observer.disconnect();
});

test("new special-history events insert incrementally and keep all earlier DOM rows", t => {
  const win = new JSDOM("<!doctype html><html lang='pt-BR'><body></body></html>", {
    url: "https://fixture.invalid", pretendToBeVisual: true,
  }).window;
  const cards = createCoupledCards({ win, textOnly: true });
  t.after(() => { cards.cleanup(); win.close(); });
  cards.setMode("cards");
  const now = Date.now();
  const attempts = Array.from({ length: 1_200 }, (_, i) => ({
    atMs: now - i * 1000, species: "Gengar", rarity: "epic", result: "fled", ball: "Ultra Ball",
  }));
  cards.render({ specialHistory: attempts, lootHistory: [] });
  const body = cards.root.querySelector("[data-card-attempt-body]");
  const originalFirst = body.firstElementChild;
  const originalLast = body.lastElementChild;
  cards.render({
    specialHistory: [{ atMs: now + 1000, species: "Lanturn", rarity: "legendary", result: "captured" }, ...attempts],
    lootHistory: [],
  });
  assert.equal(body.children.length, 1_201, "full special history stays available");
  assert.equal(body.children[1], originalFirst, "new event does not reconstruct older rows");
  assert.equal(body.lastElementChild, originalLast, "tail identity is preserved");
  const captured = cards.root.querySelector('[data-card-attempt-result="captured"]');
  captured.click();
  assert.equal(body.children.length, 1, "existing result filter still applies to incremental data");
  assert.match(body.firstElementChild.textContent, /Lanturn/);
});

test("incremental Story retains existing sprites, changes only edited rows, and ignores malformed entries", async t => {
  const win = new JSDOM("<!doctype html><html lang='en-US'><body></body></html>", {
    url: "https://fixture.invalid", pretendToBeVisual: true,
  }).window;
  let resolveSpecies;
  win.PokeIdle = { Api: { getSpecies: () => new Promise(resolve => { resolveSpecies = resolve; }) } };
  const cards = createCoupledCards({ win });
  t.after(() => { cards.cleanup(); win.close(); });
  cards.setMode("cards");
  const now = Date.now();
  const original = [
    { atMs:now, speciesId:"gengar", species:"Gengar", rarity:"epic", result:"fled" },
    { atMs:now - 1000, speciesId:"gengar", species:"Gengar", rarity:"epic", result:"captured", ball:"Ultra Ball" },
    { atMs:now - 2000, speciesId:"gengar", species:"Gengar", rarity:"epic", result:"fled" },
  ];
  cards.render({
    specialHistory:[null, ...original],
    lootHistory:[null, {atMs:now, species:"Gengar", items:{unexpected:"shape"}}],
  });
  const body = cards.root.querySelector("[data-card-attempt-body]");
  assert.equal(body.children.length, 3);
  assert.equal(cards.root.querySelectorAll(".ppbui-cards-loot-row").length, 1);
  const first = body.children[0], middle = body.children[1], last = body.children[2];
  await Promise.resolve();
  resolveSpecies({ id:"gengar", normal_sprite_url:"/native-species/gengar.png" });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(body.children[0], first, "late native metadata must not recreate existing history");
  assert.match(first.querySelector("img")?.src || "", /native-species\/gengar\.png$/);
  const changed = original.map((entry, index) => index === 1 ? { ...entry, ball:"Great Ball" } : entry);
  cards.render({ specialHistory:changed, lootHistory:[] });
  assert.equal(body.children[0], first);
  assert.notEqual(body.children[1], middle, "an updated encounter row is replaced");
  assert.equal(body.children[2], last, "unaffected tail survives a middle correction");
  assert.match(body.children[1].textContent, /Great Ball/);
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
