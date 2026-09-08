import css from "./styles.js";
import { parts, shopRuntime, shopText, rowsIn, identifyRows, groupRecords, visibleCreatures, selectionCounts, saleValue, checkboxOf } from "./dom.js";

export function mountShop(root) {
  const doc = root.ownerDocument, expanded = new Set();
  const make = (tag, className = "") => { const node = doc.createElement(tag); node.className = className; return node; };
  const content = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  const style = make("style"); style.dataset.ppbuiModule = "marks-shop"; style.textContent = css; root.append(style);
  let mode = "list", grouped = true, buyList, list, records = [], groups = [], anchors = [], toolbar, summary, active = true, selecting = false;
  function restoreGroups() {
    for (const [row, anchor] of anchors) { if (row.isConnected && anchor.isConnected) anchor.replaceWith(row); else anchor.remove(); }
    for (const group of groups) group.node.remove();
    anchors = []; groups = []; records = []; list = null;
  }
  function validSelection(group) {
    const npc = shopRuntime(root), current = visibleCreatures(npc, doc);
    if (!active || !npc || npc.shopTab !== "pokemon" || !current || parts(root).list !== list || (npc.selectedCreatures?.size > 0 && parts(root).sell?.disabled)) return false;
    const currentById = new Map(current.map(c => [c.id, c]));
    return group.records.every(r => currentById.get(r.creature.id) === r.creature && r.row.isConnected && list.contains(r.row) && checkboxOf(r.row) === r.checkbox && !r.checkbox.disabled);
  }
  function buildGroups(npc, target) {
    const found = identifyRows(target, npc);
    if (!found) return false;
    list = target; records = found;
    for (const r of records) { const anchor = doc.createComment("ppbui-shop-row"); r.row.before(anchor); anchors.push([r.row, anchor]); }
    groups = groupRecords(records, npc).map(group => {
      const node = make("section", "ppbui-shop-group"), header = make("div", "npc-shop__content-heading ppbui-shop-group-header");
      const checkbox = make("input"), button = make("button", "pokeidle-btn"), body = make("div", "ppbui-shop-group-body");
      checkbox.type = "checkbox"; button.type = "button";
      const entry = { ...group, node, checkbox, button, body };
      button.addEventListener("click", () => { if (expanded.has(group.key)) expanded.delete(group.key); else expanded.add(group.key); sync(); });
      checkbox.addEventListener("change", () => {
        const selected = checkbox.checked;
        selecting = true;
        try {
          if (validSelection(entry)) for (const r of entry.records) {
            if (!active || parts(root).list !== list || !list.contains(r.row) || checkboxOf(r.row) !== r.checkbox || r.checkbox.disabled) break;
            if (r.checkbox.checked !== selected) r.checkbox.click();
          }
        } finally { selecting = false; }
        sync();
      });
      header.append(checkbox, button); body.append(...group.records.map(r => r.row)); node.append(header, body); target.append(node);
      return entry;
    });
    return true;
  }
  function syncGroups(npc, text) {
    const format = value => Number(value).toLocaleString(doc.documentElement.lang || "en");
    for (const group of groups) {
      const selected = group.records.filter(r => r.checkbox.checked).length;
      group.checkbox.checked = selected === group.records.length;
      group.checkbox.indeterminate = selected > 0 && selected < group.records.length;
      group.checkbox.disabled = !validSelection(group);
      const values = group.records.map(r => saleValue(r.creature)), total = values.every(v => v !== null) ? format(values.reduce((a, b) => a + b, 0)) : "—";
      const label = `${group.name} · ${selected}/${group.records.length} ${text.selected} · ${text.total}: ${total}`;
      content(group.button, `${expanded.has(group.key) ? "▾" : "▸"} ${label}`);
      const aria = `${text.select}: ${group.name}`;
      if (group.checkbox.getAttribute("aria-label") !== aria) group.checkbox.setAttribute("aria-label", aria);
      const open = expanded.has(group.key);
      if (group.body.hidden === open) group.body.hidden = !open;
      if (group.button.getAttribute("aria-expanded") !== String(open)) group.button.setAttribute("aria-expanded", String(open));
    }
    if (summary) {
      const counts = selectionCounts(npc, records);
      content(summary, `${counts.total} ${text.selected} · ${counts.hidden} ${text.hidden}`);
    }
  }
  function sync() {
    if (!active || selecting) return;
    const p = parts(root), npc = shopRuntime(root), text = shopText(doc);
    if (buyList !== p.buy) { buyList?.classList.remove("ppbui-shop-list"); buyList = p.buy; }
    if (buyList && buyList.classList.contains("ppbui-shop-list") !== (mode === "list")) buyList.classList.toggle("ppbui-shop-list", mode === "list");
    const applicable = npc?.shopTab === "buy" || npc?.shopTab === "pokemon";
    if (toolbar && (toolbar.previousElementSibling !== p.heading || !applicable)) { toolbar.remove(); toolbar = null; }
    if (!toolbar && p.heading && applicable) {
      toolbar = make("div", "npc-shop__categories ppbui-shop-modes");
      for (const option of [0, 1]) {
        const button = make("button", "pokeidle-btn npc-shop__category"); button.type = "button";
        button.addEventListener("click", () => { if (shopRuntime(root)?.shopTab === "buy") mode = option === 0 ? "list" : "cards"; else grouped = option === 0; sync(); });
        toolbar.append(button);
      }
      p.heading.after(toolbar);
    }
    if (toolbar) [...toolbar.children].forEach((button, i) => {
      content(button, npc.shopTab === "buy" ? [text.list, text.cards][i] : [text.groups, text.list][i]);
      const pressed = npc.shopTab === "buy" ? (mode === "list") === (i === 0) : grouped === (i === 0);
      if (button.getAttribute("aria-pressed") !== String(pressed)) button.setAttribute("aria-pressed", String(pressed));
      if (button.classList.contains("is-active") !== pressed) button.classList.toggle("is-active", pressed);
    });
    if (list && (list !== p.list || !grouped || records.length !== rowsIn(list).length || records.some(r => !list.contains(r.row) || checkboxOf(r.row) !== r.checkbox) || groups.some(g => !list.contains(g.node)))) restoreGroups();
    if (summary && summary.nextElementSibling !== p.footer) { summary.remove(); summary = null; }
    if (npc?.shopTab === "pokemon" && p.footer) {
      if (!summary) { summary = make("p", "npc-shop__content-heading ppbui-shop-selection"); summary.setAttribute("role", "status"); p.footer.before(summary); }
      if (grouped && p.list && !list && !buildGroups(npc, p.list)) content(summary, text.unavailable);
      else if (list) syncGroups(npc, text);
      else {
        const count = selectionCounts(npc, rowsIn(p.list).map(row => ({ checkbox: checkboxOf(row) })));
        content(summary, `${count.total} ${text.selected} · ${count.hidden} ${text.hidden}`);
      }
    }
  }
  root.addEventListener("change", sync);
  sync();
  return { sync, cleanup() {
    active = false; root.removeEventListener("change", sync); restoreGroups(); buyList?.classList.remove("ppbui-shop-list"); toolbar?.remove(); summary?.remove(); style.remove(); expanded.clear();
  } };
}
