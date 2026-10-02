import { config } from "./config.js";

const copy = {
  pt: ["Lista de compras e venda agrupada por espécie", "Lista", "Cards", "Grupos", "Pokémon", "selecionados", "fora do filtro", "Valor do grupo", "Agrupamento indisponível; use a lista nativa.", "Selecionar grupo", "Revisar", "Adicionar à quantidade"],
  en: ["Item purchase list and species groups for sales", "List", "Cards", "Groups", "Pokémon", "selected", "outside the filter", "Group value", "Grouping unavailable; use the native list.", "Select group", "Review", "Add to quantity"],
  es: ["Lista de compras y venta agrupada por especie", "Lista", "Tarjetas", "Grupos", "Pokémon", "seleccionados", "fuera del filtro", "Valor del grupo", "Agrupación no disponible; usa la lista original.", "Seleccionar grupo", "Revisar", "Añadir a la cantidad"],
  zh: ["道具购买列表与按种类分组出售", "列表", "卡片", "分组", "宝可梦", "已选", "筛选外", "组总价值", "无法分组；请使用原生列表。", "选择分组", "查看", "增加数量"],
};
export function shopText(doc = document) {
  const lang = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en";
  const [description, list, cards, groups, pokemon, selected, hidden, total, unavailable, select, review, addQuantity] = copy[lang.split(/[-_]/)[0]] || copy.en;
  return { name: "Mark’s Shop", description, list, cards, groups, pokemon, selected, hidden, total, unavailable, select, review, addQuantity };
}
export function shopRuntime(root) {
  const npc = root.ownerDocument.defaultView?.PokeIdle?.NPC;
  return npc?.panel?.body && root.contains(npc.panel.body) ? npc : null;
}
export function findShop() {
  const shells = document.querySelectorAll(`${config.selectors.root} ${config.selectors.shell}`);
  for (const shell of shells) {
    const root = shell.closest(config.selectors.root);
    if (root && shopRuntime(root) && root.querySelectorAll(config.selectors.tabs).length === 4) return root;
  }
  return null;
}
export function parts(root) {
  const q = config.selectors;
  return {
    body: root.querySelector(q.body), search: root.querySelector(q.search), shell: root.querySelector(q.shell), sidebar: root.querySelector(q.sidebar),
    content: root.querySelector(q.content), heading: root.querySelector(q.heading), buy: root.querySelector(q.buy), list: root.querySelector(q.pokemon),
    tabs: [...root.querySelectorAll(q.tabs)], footer: root.querySelector(q.footer), sell: root.querySelector(q.sell),
  };
}
export const rowsIn = list => list ? [...list.querySelectorAll(config.selectors.row)] : [];
export const checkboxOf = row => row.querySelector(config.selectors.checkbox);
const qualityKey = value => {
  const key = String(value || "common").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return ({ fraca: "weak", comum: "common", incomum: "uncommon", rara: "rare", epica: "epic", lendaria: "legendary", mitica: "mythical" })[key] || key;
};
// Matches the native renderer's order; protected entries are never added to its DOM.
export function visibleCreatures(npc, doc) {
  if (!Array.isArray(npc?.shopCreatures) || typeof npc.pokemonQualityFilters?.has !== "function") return null;
  const rawLocale = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en";
  const locale = String(rawLocale || "en").replace(/_/g, "-");
  const lower = value => {
    try { return String(value || "").toLocaleLowerCase(locale); }
    catch { return String(value || "").toLowerCase(); }
  };
  const query = lower(String(npc.shopPokemonQuery || "").trim());
  return npc.shopCreatures.filter(c => c && !c.locked && c.species_id !== "ditto" && !c.is_shiny && !c.mega_active).filter(c => {
    const species = c.species || npc.shopSpecies?.[c.species_id] || {};
    const name = lower(`${c.nickname || ""} ${c.species_name || ""} ${species.name || ""} ${c.species_id || ""}`);
    return npc.pokemonQualityFilters.has(qualityKey(c.quality)) && (!query || name.includes(query));
  });
}
export function identifyRows(list, npc) {
  const rows = rowsIn(list), creatures = visibleCreatures(npc, list.ownerDocument);
  if (!creatures || rows.length !== creatures.length || new Set(creatures.map(c => String(c.id))).size !== creatures.length) return null;
  const names = list.ownerDocument.defaultView?.PokeIdle?.DittoDisplayName;
  if (typeof names?.get !== "function") return null;
  const records = rows.map((row, i) => ({ row, creature: creatures[i], checkbox: checkboxOf(row) }));
  return records.every(({ row, creature: c, checkbox }) => c.id && c.species_id && checkbox &&
    ["inventory", "storage"].includes(c.location) && c.captured_zone !== "starter_gift" &&
    row.querySelector(config.selectors.name)?.textContent.startsWith(`${names.get(c)} · `) &&
    checkbox.checked === Boolean(npc.selectedCreatures?.has(c.id))) ? records : null;
}
export function groupRecords(records, npc) {
  const groups = new Map();
  for (const record of records) {
    const c = record.creature, key = String(c.species_id);
    if (!groups.has(key)) groups.set(key, { key, name: c.species?.name || npc.shopSpecies?.[key]?.name || c.species_name || key, records: [] });
    groups.get(key).records.push(record);
  }
  return [...groups.values()];
}
export function saleValue(c) {
  const number = value => (typeof value === "number" || (typeof value === "string" && value.trim()))
    && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
  const sellValue = number(c?.sell_value);
  // Match the repository's native-value contract instead of reproducing the
  // shop's current pricing formula. A finite final sell_value is authoritative;
  // zero may fall back to a verified sell_price, exactly as Inventory does.
  return sellValue || (number(c?.sell_price) ?? sellValue);
}
export function selectionCounts(npc, records) {
  const available = (npc?.shopCreatures || []).filter(c => c && !c.locked && c.species_id !== "ditto" && !c.is_shiny && !c.mega_active);
  const total = available.filter(c => npc.selectedCreatures?.has(c.id)).length;
  const visible = records.filter(r => r.checkbox.checked).length;
  return { total, hidden: Math.max(0, total - visible) };
}
