import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { mountGeneticist } from "../src/modules/geneticist/controller.js";
import { createGeneticistModule } from "../src/modules/geneticist/index.js";
import { findGeneticist } from "../src/modules/geneticist/dom.js";
import geneticistStyles from "../src/modules/geneticist/styles.js";

const labels = {
  "npc.iv.tab_reroll": "Reroll IVs",
  "npc.iv.tab_extract": "Extract",
  "npc.iv.tab_materials": "Genetic Materials",
};

function primaryNav(doc, active = "extract") {
  const nav = doc.createElement("nav");
  nav.className = "npc-shop__tabs npc-iv__primary-tabs";
  for (const [mode, label] of [
    ["reroll", "Reroll IVs"], ["extract", "Extract"], ["materials", "Genetic Materials"],
    ["awakening", "Awakening"], ["exchange", "Exchange"],
  ]) {
    const button = doc.createElement("button");
    button.type = "button";
    button.className = "npc-shop__tab";
    button.textContent = label;
    button.dataset.mode = mode;
    if (mode === active) button.classList.add("is-active");
    nav.append(button);
  }
  return nav;
}

function speciesContent(doc) {
  const content = doc.createElement("section");
  content.className = "npc-shop__content npc-iv__content npc-genetic__content";
  const filters = doc.createElement("div");
  filters.className = "npc-genetic__filters";
  const search = doc.createElement("input"); search.type = "search";
  const select = doc.createElement("select"); select.add(new doc.defaultView.Option("All", ""));
  const quality = doc.createElement("label"); quality.className = "npc-genetic__quality";
  const qualityInput = doc.createElement("input"); qualityInput.type = "checkbox"; qualityInput.checked = true;
  quality.append(qualityInput, doc.createTextNode("Rare"));
  filters.append(search, select, quality);
  const list = doc.createElement("div");
  list.className = "npc-genetic__species-list";
  for (const name of ["Bulbasaur", "Charmander", "Squirtle"]) {
    const card = doc.createElement("button");
    card.type = "button";
    card.className = "npc-genetic__species";
    card.textContent = name;
    list.append(card);
  }
  content.append(filters, list);
  return { content, list };
}

function creatureContent(doc, species) {
  const content = doc.createElement("section");
  content.className = "npc-shop__content npc-iv__content npc-genetic__content";
  const toolbar = doc.createElement("div"); toolbar.className = "npc-genetic__toolbar";
  const back = doc.createElement("button"); back.type = "button"; back.textContent = "Change Species";
  const title = doc.createElement("strong"); title.textContent = species;
  toolbar.append(back, title);
  const filters = doc.createElement("div"); filters.className = "npc-genetic__filters";
  const search = doc.createElement("input"); search.type = "search"; search.placeholder = "Search Pokémon";
  const location = doc.createElement("select"); location.add(new doc.defaultView.Option("All locations", ""));
  const sort = doc.createElement("select"); sort.add(new doc.defaultView.Option("Name", "name"));
  const qualities = doc.createElement("div"); qualities.className = "npc-genetic__quality-filters";
  const quality = doc.createElement("label"); quality.className = "npc-genetic__quality";
  const qualityInput = doc.createElement("input"); qualityInput.type = "checkbox"; qualityInput.checked = true;
  quality.append(qualityInput, doc.createTextNode("Rare")); qualities.append(quality);
  filters.append(search, location, sort, qualities);
  const list = doc.createElement("div"); list.className = "npc-genetic__creature-list";
  const creature = doc.createElement("button"); creature.type = "button"; creature.className = "npc-nature__pokemon npc-genetic__creature"; creature.textContent = species + " #1";
  list.append(creature);
  content.append(toolbar, filters, list);
  return content;
}

function setup(t, active = "extract") {
  const dom = new JSDOM("<!doctype html><html lang='en'><body><section class='game-window npc-shop-window npc-iv-window'><header class='pokeidle-panel__titlebar'>Geneticist</header><div class='pokeidle-panel__body'></div></section></body></html>", { pretendToBeVisual: true });
  const { document: doc } = dom.window;
  const root = doc.querySelector(".npc-iv-window");
  const body = root.querySelector(".pokeidle-panel__body");
  dom.window.PokeIdle = {
    NPC: { panel: { body } },
    Localization: { get: () => "en" },
    t: key => labels[key] || key,
  };
  const renderSpecies = () => {
    const nav = primaryNav(doc, "extract");
    const species = speciesContent(doc);
    body.replaceChildren(nav, species.content);
    for (const card of species.list.children) {
      card.addEventListener("click", () => renderCreatures(card.textContent));
    }
    return species;
  };
  const renderCreatures = species => {
    const nav = primaryNav(doc, "extract");
    const content = creatureContent(doc, species);
    content.querySelector(".npc-genetic__toolbar button").addEventListener("click", renderSpecies);
    body.replaceChildren(nav, content);
  };
  const nav = primaryNav(doc, active);
  const species = speciesContent(doc);
  body.append(nav, species.content);
  for (const card of species.list.children) card.addEventListener("click", () => renderCreatures(card.textContent));
  const controller = mountGeneticist(root);
  t.after(() => { controller.cleanup(); dom.window.close(); });
  return { dom, doc, root, body, controller, renderSpecies, renderCreatures, species };
}

function standaloneHarness(t, active, buildContent) {
  const dom = new JSDOM("<!doctype html><html lang='en'><body><section class='game-window npc-shop-window npc-iv-window'><header class='pokeidle-panel__titlebar'>Geneticist</header><div class='pokeidle-panel__body'></div></section></body></html>", { pretendToBeVisual: true });
  const doc = dom.window.document;
  const root = doc.querySelector(".npc-iv-window");
  const body = root.querySelector(".pokeidle-panel__body");
  dom.window.PokeIdle = { NPC: { panel: { body } }, Localization: { get: () => "en" }, t: key => labels[key] || key };
  const fixture = buildContent(doc);
  body.append(primaryNav(doc, active), fixture.content);
  const controller = mountGeneticist(root);
  t.after(() => { controller.cleanup(); dom.window.close(); });
  return { dom, doc, root, body, controller, ...fixture };
}

function rerollContent(doc) {
  const content = doc.createElement("section");
  content.className = "npc-shop__content npc-nature__content npc-iv__content";
  const filters = doc.createElement("div"); filters.className = "npc-genetic__filters";
  for (const label of ["Quality", "Element", "Location", "Variant", "Sort"]) {
    const select = doc.createElement("select");
    select.setAttribute("aria-label", label);
    select.add(new doc.defaultView.Option("All " + label, ""));
    filters.append(select);
  }
  const search = doc.createElement("input");
  search.type = "search"; search.className = "npc-nature__search npc-iv__search"; search.placeholder = "Search Pokémon";
  const list = doc.createElement("div"); list.className = "npc-shop__list npc-nature__pokemon-list npc-iv__pokemon-list";
  const card = doc.createElement("button"); card.type = "button"; card.className = "npc-nature__pokemon npc-iv__pokemon"; card.textContent = "Bulbasaur";
  list.append(card); content.append(filters, search, list);
  return { content, filters, search, list };
}

function awakeningContent(doc) {
  const content = doc.createElement("section"); content.className = "npc-shop__content npc-iv__content npc-genetic__content genetic-awk__content";
  const layout = doc.createElement("div"); layout.className = "genetic-awk";
  const picker = doc.createElement("section"); picker.className = "genetic-awk__picker";
  const search = doc.createElement("input"); search.type = "search"; search.placeholder = "Search Pokémon";
  const list = doc.createElement("div"); list.className = "genetic-awk__list";
  const card = doc.createElement("button"); card.type = "button"; card.className = "genetic-awk__creature rarity-rare"; card.textContent = "Gengar";
  list.append(card); picker.append(search, list);
  const detail = doc.createElement("section"); detail.className = "genetic-awk__detail";
  layout.append(picker, detail); content.append(layout);
  return { content, picker, search, list };
}

function exchangeContent(doc) {
  const content = doc.createElement("section"); content.className = "npc-shop__content npc-iv__content npc-genetic__content genetic-awk__content";
  const layout = doc.createElement("div"); layout.className = "genetic-exchange";
  const sources = doc.createElement("div"); sources.className = "npc-genetic__species-list genetic-exchange__sources";
  const sourceNames = ["Gengar Material × 20", "Pikachu Material × 11", "Dragonite Material × 4"];
  const sourceCards = sourceNames.map((name, index) => {
    const source = doc.createElement("button"); source.type = "button";
    source.className = `npc-genetic__species npc-genetic__material rarity-rare${index === 0 ? " is-selected" : ""}`;
    source.textContent = name;
    sources.append(source);
    return source;
  });
  const targets = doc.createElement("section"); targets.className = "genetic-exchange__targets";
  const radio = doc.createElement("input"); radio.type = "radio"; radio.name = "genetic-exchange-target";
  const units = doc.createElement("input"); units.type = "number"; units.value = "1";
  targets.append(radio, units); layout.append(sources, targets); content.append(layout);
  return { content, layout, sources, sourceCards, targets, radio, units };
}

test("unified filter grammar preserves native Reroll controls and centers primary tab labels", t => {
  const s = standaloneHarness(t, "reroll", rerollContent);
  let changes = 0, inputs = 0;
  s.filters.querySelector("select").addEventListener("change", () => { changes += 1; });
  s.search.addEventListener("input", () => { inputs += 1; });
  s.controller.sync();

  const head = s.body.querySelector("[data-ppbui-geneticist-filter-head='filters']");
  assert.equal(head?.textContent, "Filters");
  assert.equal(s.filters.classList.contains("ppbui-geneticist-filter-grid"), true);
  assert.equal(s.search.classList.contains("ppbui-geneticist-filter-search"), true);
  assert.equal(s.search.classList.contains("ppbui-input"), true);
  assert.equal(s.filters.getAttribute("role"), "group");
  assert.equal(s.filters.getAttribute("aria-label"), "Filters");
  s.filters.querySelector("select").dispatchEvent(new s.dom.window.Event("change", { bubbles: true }));
  s.search.dispatchEvent(new s.dom.window.Event("input", { bubbles: true }));
  assert.equal(changes, 1, "native select listener identity is preserved");
  assert.equal(inputs, 1, "native search listener identity is preserved");
  assert.match(geneticistStyles, /justify-content:center!important/);
  assert.match(geneticistStyles, /text-align:center!important/);
});

test("Extract quality checkboxes keep native checkbox semantics instead of receiving text-input chrome", t => {
  const s = setup(t);
  const checkbox = s.body.querySelector(".npc-genetic__quality input[type='checkbox']");
  assert.ok(checkbox);
  assert.equal(checkbox.classList.contains("ppbui-input"), false);
  assert.equal(s.body.querySelector(".npc-genetic__filters").classList.contains("ppbui-geneticist-filter-grid"), true);
  assert.equal(s.body.querySelector("[data-ppbui-geneticist-filter-head='filters']")?.textContent, "Filters");
});

test("Awakening reuses the filter surface for its native search without fabricating unsupported filters", t => {
  const s = standaloneHarness(t, "awakening", awakeningContent);
  assert.equal(s.picker.classList.contains("ppbui-geneticist-filter-stack"), true);
  assert.equal(s.search.classList.contains("ppbui-input"), true);
  assert.equal(s.search.getAttribute("aria-label"), "Search Pokémon");
  assert.equal(s.picker.querySelector("[data-ppbui-geneticist-filter-head='filters']")?.textContent, "Filters");
  assert.equal(s.picker.querySelectorAll("select").length, 0, "Better UI does not invent rarity/location/sort state");
});

test("Exchange keeps native source/target semantics and only normalizes the discovery surface", t => {
  const s = standaloneHarness(t, "exchange", exchangeContent);
  assert.equal(s.layout.querySelector("[data-ppbui-geneticist-filter-head='materials']")?.textContent, "Available materials");
  assert.equal(s.sources.classList.contains("ppbui-geneticist-discovery-list"), true);
  assert.equal(s.layout.querySelectorAll("input[type='search'], select").length, 0, "no incomplete client-side Exchange filter is fabricated");
  assert.equal(s.radio.classList.contains("ppbui-input"), false);
  assert.equal(s.units.classList.contains("ppbui-input"), false);
});

test("Exchange source clicks remain in native Exchange ownership before native handlers run", t => {
  const s = standaloneHarness(t, "exchange", exchangeContent);
  let nativeSawExchangeAncestor = false;
  let nativeSawOriginalParent = false;
  s.sourceCards[1].addEventListener("click", () => {
    nativeSawExchangeAncestor = Boolean(s.sourceCards[1].closest(".genetic-exchange"));
    nativeSawOriginalParent = s.sourceCards[1].parentElement === s.sources;
  });

  s.sourceCards[1].click();

  assert.equal(nativeSawExchangeAncestor, true);
  assert.equal(nativeSawOriginalParent, true);
  assert.equal(s.sourceCards[1].parentElement, s.sources);
  assert.equal(s.sources.parentElement, s.layout);
  assert.equal(s.root.hasAttribute("data-ppbui-geneticist-layout"), false);
});

test("unified filter decoration is mutation-free once settled in Reroll, Awakening and Exchange", async t => {
  for (const [mode, builder] of [["reroll", rerollContent], ["awakening", awakeningContent], ["exchange", exchangeContent]]) {
    const s = standaloneHarness(t, mode, builder);
    s.controller.sync();
    const observer = new s.dom.window.MutationObserver(() => {});
    observer.observe(s.root, { subtree: true, childList: true, attributes: true, characterData: true });
    s.controller.sync();
    s.controller.sync();
    await Promise.resolve();
    assert.equal(observer.takeRecords().length, 0, mode + " stable sync must not mutate settled DOM");
    observer.disconnect();
  }
});

test("Genetic Materials is hidden narrowly and native Extract handles active-material recovery", t => {
  const s = setup(t, "materials");
  const materials = [...s.body.querySelectorAll(".npc-iv__primary-tabs button")].find(button => button.textContent === "Genetic Materials");
  const extract = [...s.body.querySelectorAll(".npc-iv__primary-tabs button")].find(button => button.textContent === "Extract");
  let clicks = 0;
  extract.addEventListener("click", () => { clicks += 1; });
  s.controller.sync();
  assert.equal(materials.hidden, true);
  assert.equal(s.dom.window.getComputedStyle(materials).display, "none", "Better UI tab styling must not override the hidden Materials tab");
  assert.equal(materials.hasAttribute("data-ppbui-geneticist-materials"), true);
  assert.equal(clicks, 1, "recovery delegates to the native Extract tab control");
  assert.equal([...s.body.querySelectorAll(".npc-iv__primary-tabs button")].filter(button => button.hidden).length, 1);
});

test("active Materials recovery also hides a synchronously rebuilt native Materials tab", t => {
  const dom = new JSDOM("<!doctype html><html><body><section class='npc-iv-window'><header class='pokeidle-panel__titlebar'></header><div class='pokeidle-panel__body'></div></section></body></html>", { pretendToBeVisual: true });
  t.after(() => dom.window.close());
  const doc = dom.window.document;
  const root = doc.querySelector(".npc-iv-window");
  const body = root.querySelector(".pokeidle-panel__body");
  dom.window.PokeIdle = { NPC: { panel: { body } }, Localization: { get: () => "en" }, t: key => labels[key] || key };
  const initial = primaryNav(doc, "materials");
  body.append(initial, speciesContent(doc).content);
  const initialExtract = [...initial.children].find(button => button.textContent === "Extract");
  initialExtract.addEventListener("click", () => {
    const replacement = primaryNav(doc, "extract");
    body.replaceChildren(replacement, speciesContent(doc).content);
  });

  const controller = mountGeneticist(root);
  t.after(() => controller.cleanup());
  const currentTabs = [...body.querySelectorAll(".npc-iv__primary-tabs button")];
  const currentMaterials = currentTabs.find(button => button.textContent === "Genetic Materials");
  const currentExtract = currentTabs.find(button => button.textContent === "Extract");
  assert.equal(currentMaterials.hidden, true, "replacement Materials is hidden in the same mount/reconcile");
  assert.equal(dom.window.getComputedStyle(currentMaterials).display, "none", "replacement Materials remains visually hidden after tab styling");
  assert.equal(currentExtract.classList.contains("is-active"), true);
  assert.equal(currentTabs.filter(button => button.hidden).length, 1);
});

test("species card activation preserves the native list as a persistent chooser while native handlers render creatures", t => {
  const s = setup(t);
  const originalList = s.body.querySelector(".npc-genetic__species-list");
  const cards = [...originalList.querySelectorAll(".npc-genetic__species")];
  cards[1].click();
  s.controller.sync();
  const pane = s.root.querySelector("[data-ppbui-geneticist-species-pane]");
  assert.equal(pane.hidden, false);
  assert.equal(pane.querySelector(".npc-genetic__species-list"), originalList, "native species buttons/listeners are moved, not cloned");
  assert.equal(s.body.querySelector(".npc-genetic__creature-list")?.textContent, "Charmander #1");
  assert.equal(cards[1].getAttribute("aria-pressed"), "true");
  assert.equal(s.root.dataset.ppbuiGeneticistLayout, "split");
  assert.equal(
    s.dom.window.getComputedStyle(s.body.querySelector(".npc-iv__primary-tabs")).display,
    "none",
    "primary Geneticist tabs are not reachable while choosing individual Pokémon",
  );

  cards[2].click();
  s.controller.sync();
  assert.equal(s.body.querySelector(".npc-genetic__creature-list")?.textContent, "Squirtle #1");
  assert.equal(cards[1].getAttribute("aria-pressed"), "false");
  assert.equal(cards[2].getAttribute("aria-pressed"), "true");
});

test("returning to native species step releases stale chooser and adopts the fresh native render", t => {
  const s = setup(t);
  s.body.querySelectorAll(".npc-genetic__species")[0].click();
  s.controller.sync();
  assert.equal(s.dom.window.getComputedStyle(s.body.querySelector(".npc-iv__primary-tabs")).display, "none");
  s.body.querySelector(".npc-genetic__toolbar button").click();
  s.controller.sync();
  assert.equal(s.root.hasAttribute("data-ppbui-geneticist-layout"), false);
  assert.equal(s.root.querySelector("[data-ppbui-geneticist-species-pane]").hidden, true);
  assert.ok(s.body.querySelector(".npc-genetic__species-list"), "fresh native species list remains in the body");
  assert.notEqual(
    s.dom.window.getComputedStyle(s.body.querySelector(".npc-iv__primary-tabs")).display,
    "none",
    "primary tabs return with the native species step",
  );
});

test("reconcile activates the native cinematic Skip path exactly once without replacing host AnimeFX", t => {
  const s = setup(t);
  const originalEffect = () => "native";
  s.dom.window.PokeIdle.AnimeFX = { geneticExtraction: originalEffect };
  const cinematic = s.doc.createElement("div"); cinematic.className = "npc-extraction";
  const skip = s.doc.createElement("button"); skip.className = "npc-extraction__skip";
  let clicks = 0; skip.addEventListener("click", () => { clicks += 1; });
  cinematic.append(skip); s.doc.body.append(cinematic);
  s.controller.sync(); s.controller.sync(); s.controller.sync();
  assert.equal(clicks, 1);
  assert.equal(cinematic.hasAttribute("data-ppbui-geneticist-skipped"), true);
  assert.equal(s.dom.window.PokeIdle.AnimeFX.geneticExtraction, originalEffect, "animation ownership remains native");
  s.controller.cleanup();
  assert.equal(cinematic.hasAttribute("data-ppbui-geneticist-skipped"), false, "cleanup releases the marker it owns");
});

test("stable reconcile does not mutate settled DOM and cleanup restores current native tab visibility", async t => {
  const s = setup(t);
  s.controller.sync();
  const observer = new s.dom.window.MutationObserver(() => {});
  observer.observe(s.root, { subtree: true, childList: true, attributes: true, characterData: true });
  s.controller.sync(); s.controller.sync();
  await Promise.resolve();
  assert.equal(observer.takeRecords().length, 0);
  observer.disconnect();
  const materials = [...s.body.querySelectorAll(".npc-iv__primary-tabs button")].find(button => button.textContent === "Genetic Materials");
  s.controller.cleanup();
  assert.equal(materials.hidden, false);
  assert.equal(materials.hasAttribute("data-ppbui-geneticist-materials"), false);
  assert.equal(s.root.classList.contains("ppbui-geneticist"), false);
  assert.equal(s.root.querySelector("[data-ppbui-geneticist-species-pane]"), null);
});

test("discovery requires the current native NPC panel body and module reacquires replacement roots", t => {
  const dom = new JSDOM("<!doctype html><html><body><section id='stale' class='npc-iv-window'><div class='pokeidle-panel__body'></div></section><section id='old' class='npc-iv-window'><div class='pokeidle-panel__body'></div></section></body></html>");
  t.after(() => dom.window.close());
  const doc = dom.window.document;
  const old = doc.querySelector("#old"), oldBody = old.querySelector(".pokeidle-panel__body");
  dom.window.PokeIdle = { NPC: { panel: { body: oldBody } } };
  const previous = globalThis.document; globalThis.document = doc; t.after(() => { globalThis.document = previous; });
  assert.equal(findGeneticist(doc), old);
  const module = createGeneticistModule();
  assert.equal(module.shouldMount(), true); assert.equal(module.getMountKey(), old);
  const fresh = doc.createElement("section"); fresh.className = "npc-iv-window"; fresh.innerHTML = "<div class='pokeidle-panel__body'></div>";
  old.replaceWith(fresh); dom.window.PokeIdle.NPC.panel.body = fresh.firstElementChild;
  assert.equal(module.shouldMount(), true); assert.equal(module.getMountKey(), fresh);
});

test("cleanup restores Better UI species selection semantics without overwriting newer host state", t => {
  const s = setup(t);
  const cards = [...s.body.querySelectorAll(".npc-genetic__species")];
  cards[1].click();
  s.controller.sync();
  const splitTabs = s.body.querySelector(".npc-iv__primary-tabs");
  assert.equal(s.dom.window.getComputedStyle(splitTabs).display, "none");
  assert.equal(cards[1].getAttribute("aria-pressed"), "true");
  assert.equal(cards[1].classList.contains("ppbui-geneticist-species--active"), true);
  cards[0].setAttribute("aria-pressed", "mixed");
  s.controller.cleanup();
  assert.notEqual(s.dom.window.getComputedStyle(splitTabs).display, "none", "cleanup restores native tab access");
  assert.equal(s.root.hasAttribute("data-ppbui-geneticist-layout"), false);
  assert.equal(cards[1].hasAttribute("aria-pressed"), false);
  assert.equal(cards[1].classList.contains("ppbui-geneticist-species--active"), false);
  assert.equal(cards[0].getAttribute("aria-pressed"), "mixed", "newer host ownership survives cleanup");
});

test("repeated native rerenders prune detached ownership before cleanup", async t => {
  const s = setup(t);
  s.body.querySelector(".npc-genetic__species").click();
  s.controller.sync();
  assert.equal(s.root.dataset.ppbuiGeneticistLayout, "split");
  const retired = [];
  for (let cycle = 0; cycle < 12; cycle += 1) {
    const previous = [...s.body.querySelectorAll(".npc-genetic__creature, .npc-iv__primary-tabs .npc-shop__tab")];
    s.renderCreatures(`Bulbasaur ${cycle}`);
    s.controller.sync();
    assert.equal(
      s.dom.window.getComputedStyle(s.body.querySelector(".npc-iv__primary-tabs")).display,
      "none",
      "replacement primary tabs stay unavailable while the individual picker remains active",
    );
    const detached = previous.filter(node => !node.isConnected);
    for (const node of detached) {
      assert.equal(node.classList.contains("ppbui-geneticist-card"), false);
      assert.equal(node.classList.contains("ppbui-geneticist-tab"), false);
      if (node.textContent === "Genetic Materials") {
        assert.equal(node.hidden, false);
        assert.equal(node.hasAttribute("data-ppbui-geneticist-materials"), false);
      }
    }
    retired.push(...detached);
  }
  assert.ok(retired.length > 20, "fixture retired many native nodes");

  const observers = retired.map(node => {
    const observer = new s.dom.window.MutationObserver(() => {});
    observer.observe(node, { attributes: true, subtree: true });
    return observer;
  });
  s.controller.cleanup();
  await Promise.resolve();
  const mutations = observers.reduce((count, observer) => count + observer.takeRecords().length, 0);
  observers.forEach(observer => observer.disconnect());
  assert.equal(mutations, 0, "cleanup no longer touches detached native renders retained by old ownership maps");
});
