import { inventoryConfig as config } from "./config.js";
import { findParts, inventoryText, locale, readCreatures, readItems, readSlot } from "./dom.js";
import { mountSortControl } from "./toolbar.js";
import { createInventoryViews, viewText } from "./views.js";
import { createInventoryScroll } from "./scroll.js";

export function mountInventory(root, preference) {
  let parts = {};
  let baseline = [];
  let scope = null;
  let ranks = new Map();
  const scroll = createInventoryScroll(root);
  let viewMode = "grid";
  const views = createInventoryViews(root);
  const disclosure = document.createElement("div");
  disclosure.dataset.ppbuiInventoryTools = "";
  const bar = document.createElement("div");
  bar.className = "inventory-slots-toolbar";
  bar.dataset.ppbuiModule = config.id;
  const order = document.createElement("select");
  order.className = "game-window__select";
  order.dataset.ppbuiOrder = "";
  for (const mode of config.modes) {
    const option = document.createElement("option"); option.value = mode; order.append(option);
  }
  const button = () => {
    const node = document.createElement("button"); node.type = "button"; node.className = "pokeidle-btn"; return node;
  };
  const apply = button();
  const clear = button();
  const viewBar = document.createElement("div");
  viewBar.className = "inventory-slots-toolbar";
  viewBar.dataset.ppbuiInventoryViews = "";
  viewBar.setAttribute("role", "group");
  const viewButtons = config.views.map(mode => {
    const node = button(); node.dataset.ppbuiViewMode = mode; viewBar.append(node); return node;
  });
  const status = document.createElement("p");
  status.className = "inventory-slots-hint";
  status.dataset.ppbuiInventoryStatus = "";
  status.setAttribute("role", "status");
  clear.dataset.ppbuiInventoryClear = "";
  bar.append(apply, viewBar);
  disclosure.append(bar, status);
  const control = mountSortControl(root, order, bar, clear, () => [apply, ...viewButtons].find(node => !node.disabled));
  const sort = () => {
    const { grid } = parts;
    if (!grid) return 0;
    const mode = preference.get();
    const slots = baseline.filter(node => node.nodeType === 1 && node.matches(config.selectors.slot));
    const advanced = mode === "iv" || mode === "quality";
    const creatures = advanced || mode === "price" ? readCreatures(parts.body) : new Map();
    const items = mode === "price" ? readItems(parts.body) : new Map();
    const data = slots.map(node => readSlot(node, creatures, items));
    const applicable = row => mode === "name" || mode === "rarity" || mode === "price" || (mode === "quantity" ? !row.pokemon : row.pokemon);
    const eligible = row => mode !== "original" && applicable(row) && (mode === "name" || row[mode] !== null);
    const ordered = data.filter(eligible).sort((a, b) => {
      const ar = ranks.get(a.key), br = ranks.get(b.key);
      if (ar !== undefined || br !== undefined) return (ar ?? Infinity) - (br ?? Infinity);
      return mode === "name" ? a.name.localeCompare(b.name, locale(), { sensitivity: "base", numeric: true }) : b[mode] - a[mode];
    });
    for (const row of ordered) if (!ranks.has(row.key)) ranks.set(row.key, ranks.size);
    let index = 0;
    // Inapplicable slots and native empty cells retain their positions.
    const positions = new Map(data.map(row => [row.node, eligible(row)]));
    const result = baseline.map(node => positions.get(node) ? ordered[index++].node : node);
    const focused = document.activeElement;
    views.render(grid, result, viewMode, parts);
    if (grid.contains(focused) && document.activeElement !== focused) focused.focus({ preventScroll: true });
    return advanced || mode === "price" || mode === "rarity" ? data.filter(row => applicable(row) && row[mode] === null).length : 0;
  };
  const sync = () => {
    const next = findParts(root);
    if (!next.toolbar || !next.search || !next.category || !next.grid) { disclosure.remove(); control.sync({}); return; }
    const nextScope = JSON.stringify([next.search.value, next.category.value]);
    const sameScope = scope === nextScope;
    scroll.begin(next, nextScope, `${viewMode}:${preference.get()}`);
    if (!sameScope) ranks = new Map();
    scope = nextScope;
    const replaced = next.grid !== parts.grid;
    if (replaced) baseline = views.nativeNodes(next.grid);
    else {
      baseline = baseline.filter(node => next.grid.contains(node));
      const children = views.nativeNodes(next.grid);
      for (let index = 0; index < children.length; index++) {
        const node = children[index];
        if (baseline.includes(node)) continue;
        const following = children.slice(index + 1).find(child => baseline.includes(child));
        baseline.splice(following ? baseline.indexOf(following) : baseline.length, 0, node);
      }
    }
    parts = next;
    if (disclosure.previousElementSibling !== next.toolbar) next.toolbar.after(disclosure);
    const text = inventoryText();
    const content = (node, value) => { if (node.textContent !== value) node.textContent = value; };
    if (order.getAttribute("aria-label") !== text.order) order.setAttribute("aria-label", text.order);
    if (document.activeElement !== order) {
      [...order.options].forEach((option, index) => content(option, `${text.order}: ${text.modes[index]}`));
      if (order.value !== preference.get()) order.value = preference.get();
    }
    content(apply, text.apply); content(clear, text.clear);
    const count = baseline.filter(node => node.nodeType === 1 && node.matches(config.selectors.slot)).length;
    const filtered = Boolean(next.search.value) || next.category.value !== "all";
    const labels = viewText();
    if (viewBar.getAttribute("aria-label") !== labels.label) viewBar.setAttribute("aria-label", labels.label);
    viewButtons.forEach((node, index) => {
      content(node, labels.modes[index]);
      const active = config.views[index] === viewMode;
      if (node.getAttribute("aria-pressed") !== String(active)) node.setAttribute("aria-pressed", String(active));
      const className = `pokeidle-btn${active ? " pokeidle-btn--primary" : ""}`;
      if (node.className !== className) node.className = className;
    });
    const disabled = !filtered;
    if (clear.disabled !== disabled) clear.disabled = disabled;
    if (apply.disabled !== (preference.get() === "original")) apply.disabled = preference.get() === "original";
    const unavailable = sort();
    const warning = ["price", "rarity"].includes(preference.get()) ? text.unavailableValues : text.unavailable;
    const message = [!count && filtered ? text.empty : "", unavailable ? `${unavailable} ${warning}` : "", !preference.saved() ? text.unsaved : ""].filter(Boolean).join(" ");
    content(status, message);
    if (status.hidden !== !message) status.hidden = !message;
    control.sync(next);
    scroll.restore();
    control.position();
  };
  const changeOrder = () => { preference.set(order.value); ranks = new Map(); sync(); };
  const reapply = () => { ranks = new Map(); scroll.forgetAnchor(); sync(); };
  const changeView = event => {
    const mode = event.target.dataset.ppbuiViewMode;
    if (config.views.includes(mode)) { viewMode = mode; sync(); }
  };
  const reset = () => {
    let current = findParts(root);
    if (current.search?.value) {
      current.search.value = "";
      current.search.dispatchEvent(new root.ownerDocument.defaultView.Event("input", { bubbles: true }));
    }
    // Native input/change handlers rebuild the controls synchronously.
    current = findParts(root);
    if (current.category && [...current.category.options].some(option => option.value === "all")) {
      current.category.value = "all";
      current.category.dispatchEvent(new root.ownerDocument.defaultView.Event("change", { bubbles: true }));
    }
    sync();
    findParts(root).search?.focus({ preventScroll: true });
  };
  order.addEventListener("change", changeOrder);
  apply.addEventListener("click", reapply);
  clear.addEventListener("click", reset);
  viewBar.addEventListener("click", changeView);
  sync();
  return {
    sync,
    cleanup() {
      scroll.cleanup();
      order.removeEventListener("change", changeOrder);
      apply.removeEventListener("click", reapply);
      clear.removeEventListener("click", reset);
      viewBar.removeEventListener("click", changeView);
      control.cleanup();
      views.cleanup(parts.grid, baseline.filter(node => parts.grid?.contains(node)));
      disclosure.remove();
    },
  };
}
