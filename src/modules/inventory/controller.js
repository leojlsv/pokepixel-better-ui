import { inventoryConfig as config } from "./config.js";
import { categoryValue, findParts, inventoryText, locale, readCreatures, readItems, readSlot, resetCategory } from "./dom.js";
import { mountSortControl } from "./toolbar.js";
import { createInventoryViews, viewText } from "./views.js";
import { createInventoryScroll } from "./scroll.js";

export function mountInventory(root, preference) {
  const doc=root.ownerDocument, hadWindowClass=root.classList.contains("ppbui-window");
  root.classList.add("ppbui-window");
  const shellStyle=doc.createElement("style");shellStyle.dataset.ppbuiInventoryShellStyle="";shellStyle.textContent=`
    .inventory-window--slots.ppbui-window { container-type:inline-size; max-width:calc(100vw - 16px); border:var(--ppbui-border-width) solid var(--ppbui-border-strong) !important; border-radius:var(--ppbui-window-radius) !important; background:var(--ppbui-bg-1) !important; color:var(--ppbui-text) !important; box-shadow:var(--ppbui-shadow-raised) !important; font-family:var(--ppbui-font-body) !important; }
    .inventory-window--slots.ppbui-window > .pokeidle-panel__titlebar { min-height:var(--ppbui-control-height); border:0!important; border-bottom:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-1)!important; color:var(--ppbui-text)!important; box-shadow:none!important; }
    .inventory-window--slots.ppbui-window > .pokeidle-panel__titlebar .pokeidle-panel__title { font:500 var(--ppbui-font-size-title)/var(--ppbui-line-height-tight) var(--ppbui-font-display)!important; letter-spacing:normal!important; }
    .inventory-window--slots.ppbui-window > .pokeidle-panel__titlebar button { border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-2)!important; color:var(--ppbui-text)!important; box-shadow:none!important; }
    .inventory-window--slots.ppbui-window > .pokeidle-panel__body { display:grid!important; grid-template-columns:minmax(0,1fr); align-content:start; gap:0; box-sizing:border-box; padding:0!important; background:var(--ppbui-bg-0) !important; color:var(--ppbui-text) !important; font-family:var(--ppbui-font-body) !important; }
    .inventory-window--slots.ppbui-window [data-ppbui-inventory-toolbar] { box-sizing:border-box; width:100%; margin:0!important; padding:var(--ppbui-space-3) var(--ppbui-space-4)!important; gap:var(--ppbui-space-2)!important; border:0!important; border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-1)!important; box-shadow:none!important; }
    .inventory-window--slots.ppbui-window .inventory-category-tabs[data-ppbui-inventory-native-categories][hidden] { display:none!important; }
    .inventory-window--slots.ppbui-window [data-ppbui-inventory-tools] { box-sizing:border-box; width:100%; margin:0; padding:var(--ppbui-space-2) var(--ppbui-space-4); border:0; border-bottom:var(--ppbui-border-width) solid var(--ppbui-border-strong); background:var(--ppbui-bg-2); }
    .inventory-window--slots.ppbui-window [data-ppbui-inventory-tools] > .inventory-slots-toolbar { display:grid; grid-template-columns:minmax(160px,235px) auto max-content; align-items:center; justify-content:start; gap:var(--ppbui-space-2); margin:0!important; padding:0!important; border:0!important; background:transparent!important; }
    .inventory-window--slots.ppbui-window [data-ppbui-inventory-category-proxy] { min-width:140px; width:clamp(140px,24%,190px); max-width:190px; flex:0 1 190px; }
    .inventory-window--slots.ppbui-window > select[data-ppbui-order] { width:235px!important; min-width:160px!important; max-width:235px!important; }
    .inventory-window--slots.ppbui-window [data-ppbui-inventory-toolbar] > input.game-window__search.ppbui-input { -webkit-appearance:none!important; appearance:none!important; box-sizing:border-box; min-height:var(--ppbui-control-height)!important; padding:0 var(--ppbui-control-padding-x)!important; border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-0)!important; background-image:none!important; color:var(--ppbui-text)!important; box-shadow:none!important; font:400 var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important; }
    .inventory-window--slots.ppbui-window,
    .inventory-window--slots.ppbui-window * { scrollbar-width:auto!important; scrollbar-color:var(--ppbui-scrollbar-thumb) var(--ppbui-scrollbar-track)!important; }
    .inventory-window--slots.ppbui-window::-webkit-scrollbar,
    .inventory-window--slots.ppbui-window *::-webkit-scrollbar { width:var(--ppbui-scrollbar-size)!important; height:var(--ppbui-scrollbar-size)!important; }
    .inventory-window--slots.ppbui-window::-webkit-scrollbar-track,
    .inventory-window--slots.ppbui-window *::-webkit-scrollbar-track { border:var(--ppbui-separator-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-scrollbar-track)!important; box-shadow:none!important; }
    .inventory-window--slots.ppbui-window::-webkit-scrollbar-thumb,
    .inventory-window--slots.ppbui-window *::-webkit-scrollbar-thumb { border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-scrollbar-thumb)!important; background-clip:border-box!important; box-shadow:none!important; }
    .inventory-window--slots.ppbui-window::-webkit-scrollbar-thumb:hover,
    .inventory-window--slots.ppbui-window *::-webkit-scrollbar-thumb:hover { background:var(--ppbui-scrollbar-thumb-hover)!important; }
    .inventory-window--slots.ppbui-window::-webkit-scrollbar-corner,
    .inventory-window--slots.ppbui-window *::-webkit-scrollbar-corner { border-radius:var(--ppbui-radius)!important; background:var(--ppbui-scrollbar-track)!important; }
    .inventory-window--slots.ppbui-window::-webkit-scrollbar-button,
    .inventory-window--slots.ppbui-window *::-webkit-scrollbar-button { display:none!important; width:0!important; height:0!important; }
    .inventory-window--slots.ppbui-window[data-ppbui-inventory-scroll],
    .inventory-window--slots.ppbui-window [data-ppbui-inventory-scroll] { scrollbar-width:auto!important; scrollbar-color:var(--ppbui-scrollbar-thumb) var(--ppbui-scrollbar-track)!important; scrollbar-gutter:stable!important; }
    .inventory-window--slots.ppbui-window[data-ppbui-inventory-scroll]::-webkit-scrollbar,
    .inventory-window--slots.ppbui-window [data-ppbui-inventory-scroll]::-webkit-scrollbar { width:var(--ppbui-scrollbar-size)!important; height:var(--ppbui-scrollbar-size)!important; }
    .inventory-window--slots.ppbui-window[data-ppbui-inventory-scroll]::-webkit-scrollbar-track,
    .inventory-window--slots.ppbui-window [data-ppbui-inventory-scroll]::-webkit-scrollbar-track { border:var(--ppbui-separator-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-scrollbar-track)!important; box-shadow:none!important; }
    .inventory-window--slots.ppbui-window[data-ppbui-inventory-scroll]::-webkit-scrollbar-thumb,
    .inventory-window--slots.ppbui-window [data-ppbui-inventory-scroll]::-webkit-scrollbar-thumb { border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-scrollbar-thumb)!important; background-clip:border-box!important; box-shadow:none!important; }
    .inventory-window--slots.ppbui-window[data-ppbui-inventory-scroll]::-webkit-scrollbar-thumb:hover,
    .inventory-window--slots.ppbui-window [data-ppbui-inventory-scroll]::-webkit-scrollbar-thumb:hover { background:var(--ppbui-scrollbar-thumb-hover)!important; }
    .inventory-window--slots.ppbui-window[data-ppbui-inventory-scroll]::-webkit-scrollbar-corner,
    .inventory-window--slots.ppbui-window [data-ppbui-inventory-scroll]::-webkit-scrollbar-corner { border-radius:var(--ppbui-radius)!important; background:var(--ppbui-scrollbar-track)!important; }
    @supports selector(::-webkit-scrollbar) {
      .inventory-window--slots.ppbui-window,
      .inventory-window--slots.ppbui-window *,
      .inventory-window--slots.ppbui-window[data-ppbui-inventory-scroll],
      .inventory-window--slots.ppbui-window [data-ppbui-inventory-scroll] { scrollbar-color:auto!important; }
    }
    .inventory-window--slots.ppbui-window .ppbui-pokemon-tools { box-sizing:border-box; width:calc(100% - (var(--ppbui-space-4) + var(--ppbui-space-4)))!important; margin:0 var(--ppbui-space-4)!important; padding:var(--ppbui-space-3) 0!important; }
    .inventory-window--slots.ppbui-window .inventory-slot-grid { box-sizing:border-box; width:100%; min-height:220px; margin:0!important; padding:var(--ppbui-space-4)!important; gap:var(--ppbui-space-2)!important; border:0!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-0)!important; box-shadow:none!important; }
    .inventory-window--slots.ppbui-window .inventory-slot { border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-2)!important; box-shadow:none!important; }
    .inventory-window--slots.ppbui-window .inventory-slot:not(.is-empty):hover { background:var(--ppbui-bg-3)!important; }
    .inventory-window--slots.ppbui-window .inventory-slot.is-empty { background:var(--ppbui-bg-0)!important; color:var(--ppbui-text-subtle)!important; opacity:1; }
    .inventory-window--slots.ppbui-window [data-ppbui-inventory-row] { box-sizing:border-box; margin:0; padding:var(--ppbui-space-2) var(--ppbui-space-3); border:0; border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border); border-radius:var(--ppbui-radius); background:transparent; }
    .inventory-window--slots.ppbui-window [data-ppbui-inventory-category] { box-sizing:border-box; margin:0; padding:0; border:0; border-top:var(--ppbui-separator-width) solid var(--ppbui-border); border-radius:var(--ppbui-radius); background:transparent; }
    .inventory-window--slots.ppbui-window [data-ppbui-inventory-category] > h3 { margin:0; padding:var(--ppbui-space-2) var(--ppbui-space-4); background:var(--ppbui-bg-1); color:var(--ppbui-text); }
    .inventory-window--slots.ppbui-window [data-ppbui-inventory-category] > .inventory-slot-grid { padding:var(--ppbui-space-3) var(--ppbui-space-4)!important; }
    @container (max-width:519px) {
      .inventory-window--slots.ppbui-window [data-ppbui-inventory-tools] > .inventory-slots-toolbar { grid-template-columns:minmax(0,1fr) auto max-content; }
      .inventory-window--slots.ppbui-window > select[data-ppbui-order] { min-width:0!important; }
    }
    @container (max-width:440px) {
      .inventory-window--slots.ppbui-window [data-ppbui-inventory-tools] > .inventory-slots-toolbar { grid-template-columns:minmax(0,1fr) auto; }
      .inventory-window--slots.ppbui-window [data-ppbui-inventory-views] { grid-column:1/-1; width:100%; }
    }
  `;doc.head.append(shellStyle);
  const scrollOwnership=new Map();
  const marker="data-ppbui-inventory-scroll";
  const ownScrollSurface=node=>{
    if(!node||scrollOwnership.has(node))return;
    scrollOwnership.set(node,{hadClass:node.classList.contains("ppbui-scroll"),marker:node.getAttribute(marker)});
    node.classList.add("ppbui-scroll");node.setAttribute(marker,"");
  };
  const releaseScrollSurface=node=>{
    const original=scrollOwnership.get(node);if(!original)return;
    if(!original.hadClass)node.classList.remove("ppbui-scroll");
    if(original.marker===null)node.removeAttribute(marker);else node.setAttribute(marker,original.marker);
    scrollOwnership.delete(node);
  };
  const syncScrollSurfaces=(body,grid)=>{
    const desired=new Set([root,body,grid].filter(Boolean));
    for(const node of [...scrollOwnership.keys()])if(!desired.has(node))releaseScrollSurface(node);
    desired.forEach(ownScrollSurface);
  };
  const hadStyle=root.hasAttribute("style");
  const minimum=root.style.getPropertyValue("min-width"), priority=root.style.getPropertyPriority("min-width");
  root.style.setProperty("min-width","min(520px, calc(100vw - 16px))","important");
  let parts = {};
  let baseline = [];
  let scope = null;
  let ranks = new Map();
  const scroll = createInventoryScroll(root);
  let viewMode = "grid";
  const views = createInventoryViews(root);
  const disclosure = document.createElement("div");
  disclosure.className = "ppbui-root";
  disclosure.dataset.ppbuiInventoryTools = "";
  const bar = document.createElement("div");
  bar.className = "inventory-slots-toolbar";
  bar.dataset.ppbuiModule = config.id;
  const order = document.createElement("select");
  order.className = "game-window__select ppbui-select";
  order.dataset.ppbuiOrder = "";
  for (const mode of config.modes) {
    const option = document.createElement("option"); option.value = mode; order.append(option);
  }
  const button = () => {
    const node = document.createElement("button"); node.type = "button"; node.className = "pokeidle-btn ppbui-button"; return node;
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
  status.className = "inventory-slots-hint ppbui-status";
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
    syncScrollSurfaces(next.body,next.grid);
    if (!next.toolbar || !next.search || !next.category || !next.grid) { disclosure.remove(); control.sync({}); return; }
    const activeCategory = categoryValue(next.category);
    if (!activeCategory) { disclosure.remove(); control.sync({}); return; }
    const nextScope = JSON.stringify([next.search.value, activeCategory]);
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
    const filtered = Boolean(next.search.value) || activeCategory !== "all";
    const labels = viewText();
    if (viewBar.getAttribute("aria-label") !== labels.label) viewBar.setAttribute("aria-label", labels.label);
    viewButtons.forEach((node, index) => {
      content(node, labels.modes[index]);
      const active = config.views[index] === viewMode;
      if (node.getAttribute("aria-pressed") !== String(active)) node.setAttribute("aria-pressed", String(active));
      const className = `pokeidle-btn ppbui-button${active ? " ppbui-button--primary" : ""}`;
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
    control.sync(next, text.scope);
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
    resetCategory(current.category);
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
      if(minimum)root.style.setProperty("min-width",minimum,priority);else root.style.removeProperty("min-width");
      if(!hadStyle && !root.getAttribute("style"))root.removeAttribute("style");
      scroll.cleanup();
      order.removeEventListener("change", changeOrder);
      apply.removeEventListener("click", reapply);
      clear.removeEventListener("click", reset);
      viewBar.removeEventListener("click", changeView);
      control.cleanup();
      views.cleanup(parts.grid, baseline.filter(node => parts.grid?.contains(node)));
      disclosure.remove();for(const node of [...scrollOwnership.keys()])releaseScrollSurface(node);shellStyle.remove();if(!hadWindowClass)root.classList.remove("ppbui-window");
    },
  };
}
