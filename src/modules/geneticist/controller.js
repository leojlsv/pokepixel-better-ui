import css from "./styles.js";
import { nativeText, primaryTabs, tabByLabel } from "./dom.js";

let mountOrdinal = 0;

export function mountGeneticist(root) {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const style = doc.createElement("style");
  style.dataset.ppbuiModule = "geneticist";
  style.textContent = css;
  root.append(style);

  const ownedClasses = new Map();
  const ownedAttributes = new Map();
  const ownedSpeciesState = new Map();
  const hiddenTabs = new Map();
  const skippedCinematics = new Set();
  const filterHeads = new Set();
  const ownerToken = String(++mountOrdinal);
  let active = true;
  let preserved = null;

  const ownClass = (node, ...classes) => {
    if (!node) return;
    let owned = ownedClasses.get(node);
    if (!owned) { owned = new Map(); ownedClasses.set(node, owned); }
    for (const className of classes.filter(Boolean)) {
      if (!owned.has(className)) owned.set(className, node.classList.contains(className));
      node.classList.add(className);
    }
  };

  const ownAttribute = (node, name, value) => {
    if (!node || !name) return;
    let owned = ownedAttributes.get(node);
    if (!owned) { owned = new Map(); ownedAttributes.set(node, owned); }
    if (!owned.has(name)) owned.set(name, { previous: node.getAttribute(name), owned: null });
    const record = owned.get(name);
    const next = String(value);
    if (node.getAttribute(name) !== next) node.setAttribute(name, next);
    record.owned = next;
  };

  const releaseClassOwnership = (node, classes) => {
    for (const [className, had] of classes) if (!had) node.classList.remove(className);
  };

  const releaseClasses = () => {
    for (const [node, classes] of ownedClasses) releaseClassOwnership(node, classes);
    ownedClasses.clear();
  };

  const restoreAttributeOwnership = (node, attributes) => {
    for (const [name, record] of attributes) {
      if (node.getAttribute(name) !== record.owned) continue;
      if (record.previous === null) node.removeAttribute(name);
      else node.setAttribute(name, record.previous);
    }
  };

  const releaseAttributes = () => {
    for (const [node, attributes] of ownedAttributes) restoreAttributeOwnership(node, attributes);
    ownedAttributes.clear();
  };

  const pane = doc.createElement("aside");
  pane.className = "ppbui-geneticist-species-pane";
  pane.dataset.ppbuiGeneticistSpeciesPane = "";
  pane.hidden = true;
  const paneTitle = doc.createElement("strong");
  paneTitle.className = "ppbui-geneticist-species-title";
  paneTitle.textContent = geneticCopy("species", "Species");
  pane.append(paneTitle);
  root.append(pane);

  function geneticCopy(kind, fallback) {
    const lang = win?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en";
    const base = lang.split(/[-_]/)[0];
    const words = {
      species: { pt: "Espécies", en: "Species", es: "Especies", zh: "物种" },
      filters: { pt: "Filtros", en: "Filters", es: "Filtros", zh: "筛选" },
      materials: { pt: "Materiais disponíveis", en: "Available materials", es: "Materiales disponibles", zh: "可用材料" },
      search: { pt: "Buscar", en: "Search", es: "Buscar", zh: "搜索" },
    };
    return words[kind]?.[base] || words[kind]?.en || fallback;
  }

  const restorePreserved = () => {
    if (!preserved) return;
    const { anchor, list } = preserved;
    if (anchor.isConnected && anchor.parentNode) {
      anchor.before(list);
      anchor.remove();
    } else {
      list.remove();
    }
    preserved = null;
    pane.hidden = true;
    root.removeAttribute("data-ppbui-geneticist-layout");
  };

  const markSpecies = card => {
    const list = card?.closest?.(".npc-genetic__species-list");
    if (!list) return;
    for (const button of list.querySelectorAll(".npc-genetic__species")) {
      const selected = button === card;
      let owned = ownedSpeciesState.get(button);
      if (!owned) {
        owned = {
          hadActive: button.classList.contains("ppbui-geneticist-species--active"),
          ariaPressed: button.getAttribute("aria-pressed"),
          ownedActive: null,
          ownedAria: null,
        };
        ownedSpeciesState.set(button, owned);
      }
      button.classList.toggle("ppbui-geneticist-species--active", selected);
      owned.ownedActive = selected;
      owned.ownedAria = String(selected);
      button.setAttribute("aria-pressed", owned.ownedAria);
    }
  };

  const restoreSpeciesButton = (button, owned) => {
    if (button.classList.contains("ppbui-geneticist-species--active") === owned.ownedActive) {
      button.classList.toggle("ppbui-geneticist-species--active", owned.hadActive);
    }
    if (button.getAttribute("aria-pressed") === owned.ownedAria) {
      if (owned.ariaPressed === null) button.removeAttribute("aria-pressed");
      else button.setAttribute("aria-pressed", owned.ariaPressed);
    }
  };

  const restoreSpeciesState = () => {
    for (const [button, owned] of ownedSpeciesState) restoreSpeciesButton(button, owned);
    ownedSpeciesState.clear();
  };

  const preserveSpeciesList = (list, card) => {
    if (!list || pane.contains(list)) { markSpecies(card); return; }
    restorePreserved();
    const anchor = doc.createElement("span");
    anchor.hidden = true;
    anchor.dataset.ppbuiGeneticistSpeciesAnchor = "";
    list.before(anchor);
    pane.append(list);
    preserved = { anchor, list };
    pane.hidden = false;
    root.dataset.ppbuiGeneticistLayout = "split";
    ownClass(list, "ppbui-scroll");
    markSpecies(card);
  };

  const hideMaterialsButton = materials => {
    if (!materials) return;
    if (!hiddenTabs.has(materials)) hiddenTabs.set(materials, materials.hidden);
    materials.hidden = true;
    materials.dataset.ppbuiGeneticistMaterials = ownerToken;
  };

  const hideMaterials = () => {
    const materialsLabel = nativeText(root, "npc.iv.tab_materials", "Genetic Materials");
    const materials = tabByLabel(root, materialsLabel);
    if (!materials) return;
    hideMaterialsButton(materials);
    if (materials.classList.contains("is-active")) {
      const extract = tabByLabel(root, nativeText(root, "npc.iv.tab_extract", "Extract"));
      if (extract && !extract.disabled) {
        extract.click();
        const replacement = tabByLabel(root, materialsLabel);
        if (replacement !== materials) hideMaterialsButton(replacement);
      }
    }
  };

  const restoreMaterialsButton = (button, wasHidden) => {
    if (button.dataset.ppbuiGeneticistMaterials !== ownerToken) return;
    button.hidden = wasHidden;
    button.removeAttribute("data-ppbui-geneticist-materials");
  };

  const restoreTabs = () => {
    for (const [button, wasHidden] of hiddenTabs) restoreMaterialsButton(button, wasHidden);
    hiddenTabs.clear();
  };

  const skipExtractionCinematic = () => {
    const cinematic = doc.querySelector(".npc-extraction");
    if (!cinematic || cinematic.hasAttribute("data-ppbui-geneticist-skipped")) return;
    const skip = cinematic.querySelector(".npc-extraction__skip");
    if (!skip || skip.hidden || skip.disabled) return;
    cinematic.dataset.ppbuiGeneticistSkipped = ownerToken;
    skippedCinematics.add(cinematic);
    skip.click();
  };

  const restoreCinematics = () => {
    for (const cinematic of skippedCinematics) {
      if (cinematic.dataset.ppbuiGeneticistSkipped === ownerToken) {
        cinematic.removeAttribute("data-ppbui-geneticist-skipped");
      }
    }
    skippedCinematics.clear();
  };

  const pruneDetachedOwnership = () => {
    for (const [node, classes] of ownedClasses) {
      if (node.isConnected) continue;
      releaseClassOwnership(node, classes);
      ownedClasses.delete(node);
    }
    for (const [node, attributes] of ownedAttributes) {
      if (node.isConnected) continue;
      restoreAttributeOwnership(node, attributes);
      ownedAttributes.delete(node);
    }
    for (const [node, owned] of ownedSpeciesState) {
      if (node.isConnected) continue;
      restoreSpeciesButton(node, owned);
      ownedSpeciesState.delete(node);
    }
    for (const [node, wasHidden] of hiddenTabs) {
      if (node.isConnected) continue;
      restoreMaterialsButton(node, wasHidden);
      hiddenTabs.delete(node);
    }
    for (const node of skippedCinematics) {
      if (node.isConnected) continue;
      if (node.dataset.ppbuiGeneticistSkipped === ownerToken) node.removeAttribute("data-ppbui-geneticist-skipped");
      skippedCinematics.delete(node);
    }
    for (const node of filterHeads) {
      if (node.isConnected) continue;
      node.remove();
      filterHeads.delete(node);
    }
  };

  const ensureFilterHead = (anchor, kind = "filters") => {
    const parent = anchor?.parentNode;
    if (!parent) return null;
    let head = [...parent.children].find(node => node?.dataset?.ppbuiGeneticistFilterHead === kind) || null;
    if (!head) {
      head = doc.createElement("div");
      head.className = "ppbui-geneticist-filter-head";
      head.dataset.ppbuiGeneticistFilterHead = kind;
      const title = doc.createElement("strong");
      title.textContent = geneticCopy(kind === "materials" ? "materials" : "filters", kind === "materials" ? "Available materials" : "Filters");
      head.append(title);
      parent.insertBefore(head, anchor);
      filterHeads.add(head);
    }
    return head;
  };

  const labelFilterControl = control => {
    if (!control || control.hasAttribute("aria-label")) return;
    const placeholder = String(control.getAttribute("placeholder") || "").trim();
    const firstOption = control.tagName === "SELECT" ? String(control.options?.[0]?.textContent || "").trim() : "";
    ownAttribute(control, "aria-label", placeholder || firstOption || geneticCopy("search", "Search"));
  };

  const decorateFilters = () => {
    const body = root.querySelector(":scope > .pokeidle-panel__body");
    if (!body) return;

    const rerollSearch = body.querySelector(".npc-iv__content .npc-iv__search");
    const rerollList = body.querySelector(".npc-iv__content > .npc-iv__pokemon-list");
    if (rerollSearch && rerollList) {
      const targetContent = rerollList.parentElement;
      const filters = targetContent?.querySelector(":scope > .npc-genetic__filters");
      if (filters) {
        ensureFilterHead(filters);
        ownClass(targetContent, "ppbui-geneticist-reroll-target");
        ownClass(filters, "ppbui-geneticist-filter-grid");
        ownClass(rerollSearch, "ppbui-geneticist-filter-search");
        ownClass(rerollList, "ppbui-geneticist-filter-results");
        ownAttribute(filters, "role", "group");
        ownAttribute(filters, "aria-label", geneticCopy("filters", "Filters"));
        labelFilterControl(rerollSearch);
      }
    }

    body.querySelectorAll(".npc-genetic__content > .npc-genetic__filters").forEach(filters => {
      ensureFilterHead(filters);
      ownClass(filters, "ppbui-geneticist-filter-grid");
      ownAttribute(filters, "role", "group");
      ownAttribute(filters, "aria-label", geneticCopy("filters", "Filters"));
      filters.querySelectorAll("input[type='search'], select").forEach(labelFilterControl);
    });

    const awakeningPicker = body.querySelector(".genetic-awk__picker");
    const awakeningSearch = awakeningPicker?.querySelector(":scope > input[type='search']");
    if (awakeningPicker && awakeningSearch) {
      ensureFilterHead(awakeningSearch);
      ownClass(awakeningPicker, "ppbui-geneticist-filter-stack");
      ownClass(awakeningSearch, "ppbui-geneticist-filter-search");
      labelFilterControl(awakeningSearch);
    }

    const exchangeSources = body.querySelector(".genetic-exchange > .genetic-exchange__sources");
    if (exchangeSources) {
      ensureFilterHead(exchangeSources, "materials");
      ownClass(exchangeSources, "ppbui-geneticist-discovery-list");
    }
  };

  const styleCurrent = () => {
    ownClass(root, "ppbui-window", "ppbui-scroll-scope", "ppbui-geneticist");
    ownClass(root.querySelector(":scope > .pokeidle-panel__titlebar"), "ppbui-titlebar");
    const body = root.querySelector(":scope > .pokeidle-panel__body");
    ownClass(body, "ppbui-geneticist-body");
    primaryTabs(root).forEach(button => ownClass(button, "ppbui-geneticist-tab"));
    root.querySelectorAll(".npc-genetic__species, .npc-genetic__creature").forEach(card => ownClass(card, "ppbui-card", "ppbui-geneticist-card"));
    root.querySelectorAll(".npc-genetic__filters select").forEach(control => ownClass(control, "ppbui-select"));
    root.querySelectorAll(".npc-genetic__filters input[type='search'], .npc-genetic__filters input[type='text'], .npc-genetic__filters input[type='number'], .npc-iv__search, .genetic-awk__picker > input[type='search']")
      .forEach(control => ownClass(control, "ppbui-input"));
    root.querySelectorAll(".npc-genetic__species-list, .npc-genetic__creature-list").forEach(list => ownClass(list, "ppbui-scroll"));
  };

  const syncLayout = () => {
    const extract = tabByLabel(root, nativeText(root, "npc.iv.tab_extract", "Extract"));
    const extractActive = Boolean(extract?.classList.contains("is-active"));
    if (!extractActive) { restorePreserved(); return; }
    const speciesList = root.querySelector(":scope > .pokeidle-panel__body .npc-genetic__species-list");
    if (speciesList) {
      if (preserved?.list !== speciesList) restorePreserved();
      pane.hidden = true;
      root.removeAttribute("data-ppbui-geneticist-layout");
      return;
    }
    const creatures = root.querySelector(":scope > .pokeidle-panel__body .npc-genetic__creature-list");
    if (creatures && preserved?.list?.isConnected) {
      pane.hidden = false;
      root.dataset.ppbuiGeneticistLayout = "split";
    }
  };

  const onClickCapture = event => {
    if (!active) return;
    const extract = tabByLabel(root, nativeText(root, "npc.iv.tab_extract", "Extract"));
    if (!extract?.classList.contains("is-active")) return;
    const speciesCard = event.target?.closest?.(".npc-genetic__species");
    if (!speciesCard || !root.contains(speciesCard)) return;
    const list = speciesCard.closest(".npc-genetic__species-list");
    if (list && !pane.contains(list)) preserveSpeciesList(list, speciesCard);
    else markSpecies(speciesCard);
  };

  root.addEventListener("click", onClickCapture, true);

  function sync() {
    if (!active) return;
    pruneDetachedOwnership();
    hideMaterials();
    syncLayout();
    decorateFilters();
    styleCurrent();
    skipExtractionCinematic();
    pruneDetachedOwnership();
  }

  sync();

  return {
    sync,
    cleanup() {
      active = false;
      root.removeEventListener("click", onClickCapture, true);
      restorePreserved();
      restoreSpeciesState();
      restoreTabs();
      restoreCinematics();
      releaseAttributes();
      releaseClasses();
      for (const head of filterHeads) head.remove();
      filterHeads.clear();
      pane.remove();
      style.remove();
    },
  };
}
