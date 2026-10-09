import css from "./styles.js";
import { config } from "./config.js";
import { parts, shopRuntime, shopText, rowsIn, identifyRows, groupRecords, visibleCreatures, selectionCounts, saleValue, checkboxOf } from "./dom.js";

export function mountShop(root) {
  const doc = root.ownerDocument, expanded = new Set();
  const make = (tag, className = "") => { const node = doc.createElement(tag); node.className = className; return node; };
  const content = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  const ownedClasses = new Map();
  const ownClass = (node, ...classes) => {
    if (!node) return;
    let owned = ownedClasses.get(node); if (!owned) { owned = new Map(); ownedClasses.set(node, owned); }
    for (const className of classes.filter(Boolean)) {
      if (!owned.has(className)) owned.set(className, node.classList.contains(className));
      if (!node.classList.contains(className)) node.classList.add(className);
    }
  };
  const releaseClasses = () => {
    for (const [node, classes] of ownedClasses) for (const [className, had] of classes) if (!had) node.classList.remove(className);
    ownedClasses.clear();
  };
  const inheritOwnedClass = (from, to, className) => {
    if (!from || !to || from === to || !to.classList.contains(className) || ownedClasses.get(from)?.get(className) !== false) return;
    let owned = ownedClasses.get(to); if (!owned) { owned = new Map(); ownedClasses.set(to, owned); }
    if (!owned.has(className)) owned.set(className, false);
  };
  const hadTabMarker = root.hasAttribute("data-ppbui-shop-tab"), originalTabMarker = root.getAttribute("data-ppbui-shop-tab");
  const hadBuyViewMarker = root.hasAttribute("data-ppbui-shop-buy-view"), originalBuyViewMarker = root.getAttribute("data-ppbui-shop-buy-view");
  const quantityDeltas = [100, 500, 1000];
  const quantityStepsSelector = "[data-ppbui-shop-quantity-steps]";
  const quantityStepGroups = new Set();
  ownClass(root, "ppbui-window", "ppbui-root", "ppbui-scroll-scope", "ppbui-marks-shop");
  ownClass(root.querySelector(":scope > .pokeidle-panel__titlebar"), "ppbui-titlebar");
  ownClass(root.querySelector(":scope > .pokeidle-panel__body"), "ppbui-shop-body");
  const style = make("style"); style.dataset.ppbuiModule = "marks-shop"; style.textContent = css; root.append(style);
  let grouped = true, buyView = "list", list, records = [], groups = [], anchors = [], toolbar, toolbarTab = "", summary, searchWrap, searchNode, searchCopy, active = true, selecting = false;
  function releaseSearchLabel(preferred = null) {
    if (searchWrap?.isConnected) {
      const current = preferred?.isConnected && searchWrap.contains(preferred)
        ? preferred
        : !preferred
          ? searchWrap.querySelector(config.selectors.search)
          : null;
      if (current?.isConnected && searchWrap.contains(current)) searchWrap.replaceWith(current);
      else searchWrap.remove();
    } else searchWrap?.remove();
    searchWrap = searchNode = searchCopy = null;
  }
  function syncSearchLabel(search) {
    if (searchNode !== search || !searchWrap?.isConnected) {
      releaseSearchLabel(search);
      if (!search?.isConnected) return;
      searchWrap = make("label", "ppbui-shop-search-label ppbui-root"); searchCopy = make("span", "ppbui-shop-search-copy"); searchNode = search;
      search.before(searchWrap); searchWrap.append(searchCopy, search);
    }
    const label = search.getAttribute("aria-label") || search.placeholder || "Search";
    content(searchCopy, label);
  }
  function removeQuantitySteps() {
    for (const node of quantityStepGroups) node.remove();
    quantityStepGroups.clear();
  }
  function syncQuantitySteps(npc, text) {
    for (const node of quantityStepGroups) if (!node.isConnected || !root.contains(node)) quantityStepGroups.delete(node);
    if (npc?.shopTab !== "buy") { removeQuantitySteps(); return; }
    for (const purchase of root.querySelectorAll(config.selectors.customPurchase)) {
      const input = purchase.querySelector(config.selectors.buyQuantity);
      let steps = purchase.querySelector(":scope > " + quantityStepsSelector);
      if (!input) { steps?.remove(); continue; }
      if (!steps) {
        steps = make("div", "ppbui-shop-quantity-steps ppbui-root");
        steps.dataset.ppbuiShopQuantitySteps = "";
        steps.setAttribute("role", "group");
        for (const delta of quantityDeltas) {
          const button = make("button", "pokeidle-btn ppbui-button ppbui-button--compact ppbui-shop-quantity-step");
          button.type = "button";
          button.dataset.ppbuiShopQuantityStep = String(delta);
          content(button, "+" + delta);
          steps.append(button);
        }
        purchase.append(steps);
      }
      quantityStepGroups.add(steps);
      const label = text.addQuantity || "Add to quantity";
      if (steps.getAttribute("aria-label") !== label) steps.setAttribute("aria-label", label);
      for (const button of steps.querySelectorAll("[data-ppbui-shop-quantity-step]")) {
        const delta = Number(button.dataset.ppbuiShopQuantityStep);
        const aria = label + ": " + delta;
        if (button.getAttribute("aria-label") !== aria) button.setAttribute("aria-label", aria);
      }
    }
  }
  function incrementQuantity(event) {
    const button = event.target?.closest?.("[data-ppbui-shop-quantity-step]");
    if (!active || !button || !root.contains(button) || button.disabled) return;
    const purchase = button.closest(config.selectors.customPurchase), input = purchase?.querySelector(config.selectors.buyQuantity);
    if (!input?.isConnected || input.disabled || input.readOnly || input.type !== "number") return;
    const current = input.valueAsNumber, delta = Number(button.dataset.ppbuiShopQuantityStep);
    if (!Number.isFinite(current) || !Number.isFinite(delta) || delta <= 0) return;
    const bound = value => value === "" ? null : Number(value);
    const minimum = bound(input.min), maximum = bound(input.max);
    let next = current + delta;
    if (Number.isFinite(minimum)) next = Math.max(minimum, next);
    if (Number.isFinite(maximum)) next = Math.min(maximum, next);
    if (!Number.isFinite(next) || next === current) return;
    input.value = String(next);
    input.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true }));
  }
  function decoratePokemonRecord(record) {
    ownClass(record.row, "ppbui-card");
    ownClass(record.row.querySelector(config.selectors.rarity), "ppbui-quality-badge");
  }
  function syncTabPresentation(tab, p) {
    if (tab === "buy") {
      for (const node of root.querySelectorAll(".npc-shop__list")) ownClass(node, "ppbui-scroll");
      for (const node of root.querySelectorAll(".npc-shop__buy-card")) ownClass(node, "ppbui-card");
      for (const node of root.querySelectorAll(".npc-shop__category,.npc-shop__purchase-button")) ownClass(node, "ppbui-button", "ppbui-button--compact");
      for (const node of root.querySelectorAll(".npc-shop__custom-button")) ownClass(node, "ppbui-button", "ppbui-button--primary");
      for (const node of root.querySelectorAll(".npc-shop__custom-purchase input")) ownClass(node, "ppbui-input");
      for (const node of root.querySelectorAll(".npc-shop__item-category")) ownClass(node, "ppbui-badge");
    } else if (tab === "sell") {
      for (const node of root.querySelectorAll(".npc-shop__list")) ownClass(node, "ppbui-scroll");
      for (const node of root.querySelectorAll(".npc-shop__sell-row")) ownClass(node, "ppbui-card");
      for (const node of root.querySelectorAll(".npc-shop__sell-button")) ownClass(node, "ppbui-button", "ppbui-button--danger", "ppbui-button--action");
      for (const node of root.querySelectorAll(".npc-shop__sell-quantity input")) ownClass(node, "ppbui-input");
    } else if (tab === "pokemon") {
      ownClass(p.list, "ppbui-scroll");
      if (!(grouped && list === p.list && records.length)) {
        for (const node of root.querySelectorAll(".npc-shop__pokemon-row")) ownClass(node, "ppbui-card");
        for (const node of root.querySelectorAll(".npc-shop__rarity")) ownClass(node, "ppbui-quality-badge");
      }
      for (const node of root.querySelectorAll(".npc-shop__quality")) ownClass(node, "ppbui-button", "ppbui-button--compact");
      for (const node of root.querySelectorAll(".npc-shop__sell-button")) ownClass(node, "ppbui-button", "ppbui-button--danger", "ppbui-button--action");
    } else if (tab === "buyback") {
      for (const node of root.querySelectorAll(".npc-shop__list")) ownClass(node, "ppbui-scroll");
      for (const node of root.querySelectorAll(".npc-shop__buyback-row")) ownClass(node, "ppbui-card");
      for (const node of root.querySelectorAll(".npc-shop__buyback-button")) ownClass(node, "ppbui-button", "ppbui-button--primary");
    }
    for (const node of root.querySelectorAll(".npc-shop__close")) ownClass(node, "ppbui-button", "ppbui-button--ghost");
  }
  function restoreGroups() {
    const ownedGroups = new Set(groups.map(group => group.node));
    for (const [row, anchor] of anchors) {
      const currentGroup = row.closest?.(".ppbui-shop-group");
      if (row.isConnected && anchor.isConnected && currentGroup && ownedGroups.has(currentGroup)) anchor.replaceWith(row);
      else anchor.remove();
    }
    for (const group of groups) group.node.remove();
    anchors = []; groups = []; records = []; list = null;
  }
  function selectionContext(npc = shopRuntime(root), currentParts = parts(root)) {
    const current = visibleCreatures(npc, doc);
    if (!active || !npc || npc.shopTab !== "pokemon" || !current || currentParts.list !== list || (npc.selectedCreatures?.size > 0 && currentParts.sell?.disabled)) return null;
    return { currentById: new Map(current.map(c => [c.id, c])) };
  }
  function validSelection(group, context = selectionContext()) {
    if (!context) return false;
    const { currentById } = context;
    return group.records.every(r => currentById.get(r.creature.id) === r.creature && r.row.isConnected && list.contains(r.row) && r.checkbox.isConnected && r.row.contains(r.checkbox) && !r.checkbox.disabled);
  }
  function buildGroups(npc, target) {
    const found = identifyRows(target, npc);
    if (!found) return false;
    list = target; records = found;
    for (const record of records) decoratePokemonRecord(record);
    for (const r of records) { const anchor = doc.createComment("ppbui-shop-row"); r.row.before(anchor); anchors.push([r.row, anchor]); }
    groups = groupRecords(records, npc).map((group, index) => {
      const node = make("section", "ppbui-shop-group ppbui-card"), header = make("div", "ppbui-shop-group-header"), facts = make("div", "ppbui-shop-group-facts");
      const checkbox = make("input"), button = make("button", "ppbui-button ppbui-icon-button ppbui-shop-group-toggle"), body = make("div", "ppbui-shop-group-body ppbui-scroll");
      const name = make("strong", "ppbui-shop-group-name"), meta = make("span", "ppbui-shop-group-meta"), total = make("span", "ppbui-shop-group-total");
      checkbox.type = "checkbox"; button.type = "button";
      body.id = `ppbui-shop-group-${index + 1}`; button.setAttribute("aria-controls", body.id); facts.append(name, meta, total);
      const entry = { ...group, node, checkbox, button, body, nameNode:name, metaNode:meta, totalNode:total };
      button.addEventListener("click", () => { if (expanded.has(group.key)) expanded.delete(group.key); else expanded.add(group.key); sync(); });
      checkbox.addEventListener("change", () => {
        const selected = checkbox.checked;
        selecting = true;
        try {
          const context = selectionContext();
          if (validSelection(entry, context)) for (const r of entry.records) {
            if (!active || parts(root).list !== list || !list.contains(r.row) || checkboxOf(r.row) !== r.checkbox || r.checkbox.disabled) break;
            if (r.checkbox.checked !== selected) r.checkbox.click();
          }
        } finally { selecting = false; }
        sync();
      });
      header.append(checkbox, facts, button); body.append(...group.records.map(r => r.row)); node.append(header, body); target.append(node);
      return entry;
    });
    return true;
  }
  function syncGroups(npc, text, currentParts) {
    const rawLocale = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en";
    const locale = String(rawLocale || "en").replace(/_/g, "-");
    const format = value => {
      try { return Number(value).toLocaleString(locale); }
      catch { return Number(value).toLocaleString("en"); }
    };
    const context = selectionContext(npc, currentParts);
    for (const group of groups) {
      const selected = group.records.filter(r => r.checkbox.checked).length;
      group.checkbox.checked = selected === group.records.length;
      group.checkbox.indeterminate = selected > 0 && selected < group.records.length;
      group.checkbox.disabled = !validSelection(group, context);
      const values = group.records.map(r => saleValue(r.creature)), total = values.every(v => v !== null) ? format(values.reduce((a, b) => a + b, 0)) : "—";
      const label = `${group.name} · ${selected}/${group.records.length} ${text.selected} · ${text.total}: ${total}`;
      content(group.nameNode, group.name); content(group.metaNode, `${selected}/${group.records.length} ${text.selected}`); content(group.totalNode, `${text.total}: ${total}`);
      const aria = `${text.select}: ${group.name}`;
      if (group.checkbox.getAttribute("aria-label") !== aria) group.checkbox.setAttribute("aria-label", aria);
      const open = expanded.has(group.key);
      if (group.body.hidden === open) group.body.hidden = !open;
      if (group.button.getAttribute("aria-expanded") !== String(open)) group.button.setAttribute("aria-expanded", String(open));
      if (group.button.dataset.open !== String(open)) group.button.dataset.open = String(open);
      const disclosureLabel = `${text.review}: ${group.name}`;
      if (group.button.getAttribute("aria-label") !== disclosureLabel) group.button.setAttribute("aria-label", disclosureLabel);
    }
    if (summary) {
      const counts = selectionCounts(npc, records);
      content(summary, `${counts.total} ${text.selected} · ${counts.hidden} ${text.hidden}`);
    }
  }
  function sync() {
    if (!active || selecting) return;
    const p = parts(root), npc = shopRuntime(root), text = shopText(doc);
    const tab = String(npc?.shopTab || ""); if (root.dataset.ppbuiShopTab !== tab) root.dataset.ppbuiShopTab = tab;
    if (searchWrap?.isConnected && searchNode && !searchNode.isConnected && p.search && searchNode !== p.search && searchWrap.contains(p.search)) inheritOwnedClass(searchNode, p.search, "ppbui-input");
    ownClass(p.body, "ppbui-shop-body"); ownClass(p.search, "ppbui-input"); ownClass(p.content, "ppbui-shop-content");
    syncSearchLabel(p.search);
    for (const node of p.tabs) ownClass(node, "ppbui-button", "ppbui-shop-tab");
    syncTabPresentation(tab, p);
    syncQuantitySteps(npc, text);
    const applicable = npc?.shopTab === "buy" || npc?.shopTab === "pokemon";
    if (root.dataset.ppbuiShopBuyView !== buyView) root.dataset.ppbuiShopBuyView = buyView;
    if (toolbar && (toolbar.previousElementSibling !== p.heading || !applicable || toolbarTab !== npc?.shopTab)) { toolbar.remove(); toolbar = null; toolbarTab = ""; }
    if (!toolbar && p.heading && applicable) {
      toolbar = make("div", "npc-shop__categories ppbui-shop-modes ppbui-root");
      toolbarTab = npc.shopTab;
      toolbar.dataset.ppbuiShopModes = toolbarTab;
      for (const option of [0, 1]) {
        const button = make("button", "pokeidle-btn npc-shop__category ppbui-button ppbui-button--compact"); button.type = "button";
        button.addEventListener("click", () => {
          if (toolbarTab === "buy") buyView = option === 0 ? "list" : "cards";
          else grouped = option === 0;
          sync();
        });
        toolbar.append(button);
      }
      p.heading.after(toolbar);
    }
    if (toolbar) [...toolbar.children].forEach((button, i) => {
      const buy = toolbarTab === "buy";
      content(button, (buy ? [text.list, text.cards] : [text.groups, text.list])[i]);
      const pressed = buy ? buyView === (i === 0 ? "list" : "cards") : grouped === (i === 0);
      if (button.getAttribute("aria-pressed") !== String(pressed)) button.setAttribute("aria-pressed", String(pressed));
      if (button.classList.contains("is-active") !== pressed) button.classList.toggle("is-active", pressed);
    });
    if (list && (list !== p.list || !grouped || records.length !== rowsIn(list).length || records.some(r => !r.row.isConnected || !list.contains(r.row) || !r.checkbox.isConnected || !r.row.contains(r.checkbox)) || groups.some(g => !g.node.isConnected || !list.contains(g.node)))) restoreGroups();
    if (summary && (summary.parentElement !== p.footer || summary.nextElementSibling !== p.sell)) { summary.remove(); summary = null; }
    if (npc?.shopTab === "pokemon" && p.footer) {
      if (!summary) { summary = make("p", "ppbui-shop-selection"); summary.setAttribute("role", "status"); p.footer.insertBefore(summary, p.sell); }
      if (grouped && p.list && !list && !buildGroups(npc, p.list)) content(summary, text.unavailable);
      else if (list) syncGroups(npc, text, p);
      else {
        const count = selectionCounts(npc, rowsIn(p.list).map(row => ({ checkbox: checkboxOf(row) })));
        content(summary, `${count.total} ${text.selected} · ${count.hidden} ${text.hidden}`);
      }
    }
  }
  root.addEventListener("click", incrementQuantity);
  root.addEventListener("change", sync);
  sync();
  return { sync, cleanup() {
    active = false; root.removeEventListener("click", incrementQuantity); root.removeEventListener("change", sync); removeQuantitySteps(); restoreGroups(); toolbar?.remove(); summary?.remove(); releaseSearchLabel(); style.remove(); expanded.clear();
    if (hadTabMarker) root.setAttribute("data-ppbui-shop-tab", originalTabMarker); else root.removeAttribute("data-ppbui-shop-tab");
    if (hadBuyViewMarker) root.setAttribute("data-ppbui-shop-buy-view", originalBuyViewMarker); else root.removeAttribute("data-ppbui-shop-buy-view");
    releaseClasses();
  } };
}
