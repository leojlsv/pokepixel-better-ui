import { categoryEntries, categoryFocusTarget, categoryValue, isCategorySelect } from "./dom.js";

export function mountSortControl(root, order, bar, clear, nextControl) {
  let parts = {};
  let searchOriginal = null;
  let visualOwnership = null;
  let nativeTabsOwnership = null;
  const categoryProxy = document.createElement("select");
  categoryProxy.className = "game-window__select ppbui-select";
  categoryProxy.dataset.ppbuiInventoryCategoryProxy = "";
  const restoreSearch = () => {
    if (searchOriginal?.node.placeholder === "Search") {
      if (searchOriginal.placeholder === null) searchOriginal.node.removeAttribute("placeholder");
      else searchOriginal.node.setAttribute("placeholder", searchOriginal.placeholder);
    }
    if (searchOriginal?.ariaLabel === null && searchOriginal.appliedAriaLabel && searchOriginal.node.getAttribute("aria-label") === searchOriginal.appliedAriaLabel) {
      searchOriginal.node.removeAttribute("aria-label");
    }
  };
  const releaseVisualOwnership = () => {
    if (!visualOwnership) return;
    const { toolbar, search, category, hadRoot, hadInput, hadSelect, categoryWasSelect, categoryParent, categoryNext } = visualOwnership;
    if (!hadRoot) toolbar.classList.remove("ppbui-root");
    if (!hadInput) search?.classList.remove("ppbui-input");
    if (categoryWasSelect && !hadSelect) category?.classList.remove("ppbui-select");
    if (categoryWasSelect && category?.isConnected && categoryParent?.isConnected && category.parentNode === categoryParent) {
      categoryParent.insertBefore(category, categoryNext?.parentNode === categoryParent ? categoryNext : null);
    }
    visualOwnership = null;
  };
  const releaseNativeTabs = () => {
    if (!nativeTabsOwnership) return;
    const { node, hidden, marker } = nativeTabsOwnership;
    if (node?.isConnected || node) {
      node.hidden = hidden;
      if (marker === null) node.removeAttribute("data-ppbui-inventory-native-categories");
      else node.setAttribute("data-ppbui-inventory-native-categories", marker);
    }
    nativeTabsOwnership = null;
  };
  const ownNativeTabs = category => {
    if (nativeTabsOwnership?.node === category) return;
    releaseNativeTabs();
    nativeTabsOwnership = {
      node: category,
      hidden: category.hidden,
      marker: category.getAttribute("data-ppbui-inventory-native-categories"),
    };
    category.dataset.ppbuiInventoryNativeCategories = "";
    category.hidden = true;
  };
  const syncCategoryProxy = (category, label) => {
    const entries = categoryEntries(category);
    const signature = entries.map(entry => `${entry.value}\u0000${entry.label}`).join("\u0001");
    if (categoryProxy.dataset.ppbuiInventoryCategorySignature !== signature) {
      categoryProxy.replaceChildren(...entries.map(entry => {
        const option = document.createElement("option");
        option.value = entry.value;
        option.textContent = entry.label;
        return option;
      }));
      categoryProxy.dataset.ppbuiInventoryCategorySignature = signature;
    }
    const value = categoryValue(category);
    if (value && categoryProxy.value !== value) categoryProxy.value = value;
    if (label && categoryProxy.getAttribute("aria-label") !== label) categoryProxy.setAttribute("aria-label", label);
  };
  const anchor = document.createElement("span");
  anchor.className = "game-window__select";
  anchor.dataset.ppbuiOrderAnchor = "";
  anchor.setAttribute("aria-hidden", "true");
  bar.prepend(anchor);
  order.tabIndex = -1;
  const style = document.createElement("style");
  style.dataset.ppbuiInventoryStyle = "";
  style.textContent = `
    [data-ppbui-inventory-toolbar] > input.game-window__search { min-width:140px; width:auto; flex:1 1 180px; }
    [data-ppbui-inventory-toolbar] > select.game-window__select { min-width:120px; width:auto; flex:0 1 190px; max-width:220px; }
    [data-ppbui-order-anchor] { visibility:hidden; min-width:140px; width:100%; }
    [data-ppbui-inventory-views] { display:flex; flex-wrap:nowrap; gap:0; margin:0; flex-shrink:0; }
    [data-ppbui-inventory-views] > .ppbui-button { min-width:auto; border-width:var(--ppbui-separator-width); }
    [data-ppbui-inventory-views] > .ppbui-button + .ppbui-button { border-left:0; }
    [data-ppbui-inventory-clear] { flex-shrink: 0; }
    [data-ppbui-order] { position:absolute!important; z-index:5; min-width:0; margin:0; }
    @container (max-width:519px) {
      [data-ppbui-inventory-toolbar] { flex-wrap:wrap!important; }
      [data-ppbui-inventory-toolbar] > input.game-window__search { flex:1 1 220px; }
      [data-ppbui-inventory-toolbar] > select.game-window__select { flex:1 1 160px; max-width:none; }
      [data-ppbui-order-anchor] { min-width:0; }
    }
    @container (max-width:440px) {
      [data-ppbui-inventory-toolbar] > select.game-window__select { flex-basis:100%; }
      [data-ppbui-inventory-toolbar] > input.game-window__search { min-width:0; flex:1 1 140px; }
      [data-ppbui-inventory-views] { width:100%; }
      [data-ppbui-inventory-views] > .ppbui-button { flex:1 1 0; }
    }
  `;
  // The native refresh clears the body. Keep the actual select on the stable panel.
  root.append(style, order);
  const set = (key, value, priority = "") => {
    if (order.style.getPropertyValue(key) !== value || order.style.getPropertyPriority(key) !== priority) {
      order.style.setProperty(key, value, priority);
    }
  };
  const position = () => {
    if (!anchor.isConnected || !parts.body) { if (!order.hidden) order.hidden = true; return; }
    const box = anchor.getBoundingClientRect(), panel = root.getBoundingClientRect(), body = parts.body.getBoundingClientRect();
    const outside = box.top < body.top || box.bottom > body.bottom || box.left < body.left || box.right > body.right;
    const hidden = Boolean(body.height && outside);
    if (order.hidden !== hidden) order.hidden = hidden;
    const scaleX = panel.width && root.offsetWidth ? panel.width / root.offsetWidth : 1;
    const scaleY = panel.height && root.offsetHeight ? panel.height / root.offsetHeight : 1;
    set("left", `${(box.left - panel.left) / scaleX - root.clientLeft + root.scrollLeft}px`);
    set("top", `${(box.top - panel.top) / scaleY - root.clientTop + root.scrollTop}px`);
    // Shared PPBUI native-select ownership uses width:100%!important. The live
    // Backpack Sort is an absolute proxy for this bounded anchor, so its measured
    // geometry must win that shared declaration.
    const width = `${box.width / scaleX}px`;
    set("width", width, "important");
    set("max-width", width, "important");
    set("height", `${box.height / scaleY}px`, "important");
  };
  const tab = event => {
    if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) return;
    let target;
    const categoryControl = categoryFocusTarget(parts.category);
    const moreFilters = parts.toolbar?.querySelector("[data-ppbui-inventory-more-filters]");
    const previous = clear.disabled ? (moreFilters || parts.search || categoryControl) : clear;
    if (event.target === previous && !event.shiftKey) target = order;
    if (event.target === order) target = event.shiftKey ? previous : nextControl();
    if (event.target === nextControl() && event.shiftKey) target = order;
    if (target && !target.hidden) { event.preventDefault(); target.focus(); }
  };
  const drag = event => { if (event.buttons) position(); };
  root.addEventListener("keydown", tab);
  root.addEventListener("scroll", position, true);
  root.ownerDocument.addEventListener("pointermove", drag);
  root.ownerDocument.defaultView.addEventListener("resize", position);
  order.addEventListener("blur", position);
  const changeCategory = () => {
    const category = parts.category;
    if (!category || isCategorySelect(category)) return;
    const target = [...category.querySelectorAll(".inventory-category-tab[data-category]")]
      .find(tab => tab.dataset.category === categoryProxy.value);
    target?.click();
  };
  categoryProxy.addEventListener("change", changeCategory);
  return {
    position,
    sync(next, categoryLabel = "", searchLabel = "") {
      if (searchOriginal?.node !== next.search) {
        restoreSearch();
        searchOriginal = next.search ? { node: next.search, placeholder: next.search.getAttribute("placeholder"), ariaLabel: next.search.getAttribute("aria-label"), appliedAriaLabel: null } : null;
      }
      if (next.search && next.search.placeholder !== "Search") next.search.placeholder = "Search";
      if (next.search && searchOriginal && searchLabel) {
        const currentLabel = next.search.getAttribute("aria-label");
        if (searchOriginal.appliedAriaLabel && currentLabel !== searchOriginal.appliedAriaLabel) {
          searchOriginal.ariaLabel = currentLabel;
          searchOriginal.appliedAriaLabel = null;
        } else if (!searchOriginal.appliedAriaLabel && currentLabel !== searchOriginal.ariaLabel) {
          searchOriginal.ariaLabel = currentLabel;
        }
        if (searchOriginal.ariaLabel === null) {
          if (next.search.getAttribute("aria-label") !== searchLabel) next.search.setAttribute("aria-label", searchLabel);
          searchOriginal.appliedAriaLabel = searchLabel;
        }
      }
      const toolbarChanged = parts.toolbar !== next.toolbar;
      const ownershipChanged = Boolean(visualOwnership && (
        visualOwnership.toolbar !== next.toolbar ||
        visualOwnership.search !== next.search ||
        visualOwnership.category !== next.category
      ));
      if (toolbarChanged) {
        parts.toolbar?.removeAttribute("data-ppbui-inventory-toolbar");
      }
      if (ownershipChanged) {
        releaseVisualOwnership();
      }
      parts = next;
      if (next.toolbar && next.category) {
        if (!next.toolbar.hasAttribute("data-ppbui-inventory-toolbar")) next.toolbar.dataset.ppbuiInventoryToolbar = "";
        if (!visualOwnership) {
          const categoryWasSelect = isCategorySelect(next.category);
          visualOwnership = {
            toolbar: next.toolbar,
            search: next.search,
            category: next.category,
            hadRoot: next.toolbar.classList.contains("ppbui-root"),
            hadInput: next.search?.classList.contains("ppbui-input") || false,
            hadSelect: categoryWasSelect && next.category.classList.contains("ppbui-select"),
            categoryWasSelect,
            categoryParent: categoryWasSelect ? next.category.parentNode : null,
            categoryNext: categoryWasSelect ? next.category.nextSibling : null,
          };
          next.toolbar.classList.add("ppbui-root");
          next.search?.classList.add("ppbui-input");
          if (categoryWasSelect) next.category.classList.add("ppbui-select");
        }
        if (isCategorySelect(next.category)) {
          const nativeTabs = root.querySelector(".inventory-category-tabs");
          if (nativeTabs) ownNativeTabs(nativeTabs); else releaseNativeTabs();
          categoryProxy.remove();
          if (next.search && next.category.nextElementSibling !== next.search) next.search.before(next.category);
          const afterSearch = next.toolbar.querySelector("[data-ppbui-inventory-more-filters]") || next.search;
          if (afterSearch && clear.previousElementSibling !== afterSearch) afterSearch.after(clear);
        } else {
          ownNativeTabs(next.category);
          syncCategoryProxy(next.category, categoryLabel || next.category.getAttribute("aria-label") || "Category");
          if (next.search && categoryProxy.nextElementSibling !== next.search) next.search.before(categoryProxy);
          const afterSearch = next.toolbar.querySelector("[data-ppbui-inventory-more-filters]") || next.search;
          if (afterSearch && clear.previousElementSibling !== afterSearch) afterSearch.after(clear);
        }
      } else {
        releaseNativeTabs();
        categoryProxy.remove();
        clear.remove();
      }
      if (!anchor.isConnected || document.activeElement !== order) position();
    },
    cleanup() {
      restoreSearch();
      root.removeEventListener("keydown", tab);
      root.removeEventListener("scroll", position, true);
      root.ownerDocument.removeEventListener("pointermove", drag);
      root.ownerDocument.defaultView.removeEventListener("resize", position);
      order.removeEventListener("blur", position);
      categoryProxy.removeEventListener("change", changeCategory);
      parts.toolbar?.removeAttribute("data-ppbui-inventory-toolbar");
      releaseNativeTabs();
      releaseVisualOwnership();
      anchor.remove(); categoryProxy.remove(); clear.remove(); order.remove(); style.remove();
    },
  };
}
