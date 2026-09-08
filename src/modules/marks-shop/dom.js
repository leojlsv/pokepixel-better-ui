import { config } from "./config.js";

const copy = {
  pt: ["Lista de compras e venda agrupada por espécie", "Lista", "Cards", "Grupos", "Pokémon", "selecionados", "fora do filtro", "Valor do grupo", "Agrupamento indisponível; use a lista nativa.", "Selecionar grupo", "Revisar"],
  en: ["Item purchase list and species groups for sales", "List", "Cards", "Groups", "Pokémon", "selected", "outside the filter", "Group value", "Grouping unavailable; use the native list.", "Select group", "Review"],
  es: ["Lista de compras y venta agrupada por especie", "Lista", "Tarjetas", "Grupos", "Pokémon", "seleccionados", "fuera del filtro", "Valor del grupo", "Agrupación no disponible; usa la lista original.", "Seleccionar grupo", "Revisar"],
  zh: ["道具购买列表与按种类分组出售", "列表", "卡片", "分组", "宝可梦", "已选", "筛选外", "组总价值", "无法分组；请使用原生列表。", "选择分组", "查看"],
};
export function shopText(doc = document) {
  const lang = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en";
  const [description, list, cards, groups, pokemon, selected, hidden, total, unavailable, select, review] = copy[lang.split(/[-_]/)[0]] || copy.en;
  return { name: "Mark’s Shop", description, list, cards, groups, pokemon, selected, hidden, total, unavailable, select, review };
}
export function shopRuntime(root) {
  const npc = root.ownerDocument.defaultView?.PokeIdle?.NPC;
  return npc?.panel?.body && root.contains(npc.panel.body) ? npc : null;
}
export function findShop() {
  return [...document.querySelectorAll(config.selectors.root)].find(root => shopRuntime(root) && parts(root).tabs.length === 4 && root.querySelector(config.selectors.shell)) || null;
}
export function parts(root) {
  const q = config.selectors;
  return { content: root.querySelector(q.content), heading: root.querySelector(q.heading), buy: root.querySelector(q.buy), list: root.querySelector(q.pokemon), tabs: [...root.querySelectorAll(q.tabs)], footer: root.querySelector(q.footer), sell: root.querySelector(q.sell) };
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
  const locale = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en";
  const query = String(npc.shopPokemonQuery || "").trim().toLocaleLowerCase(locale);
  return npc.shopCreatures.filter(c => c && !c.locked && c.species_id !== "ditto" && !c.is_shiny && !c.mega_active).filter(c => {
    const species = c.species || npc.shopSpecies?.[c.species_id] || {};
    const name = `${c.nickname || ""} ${c.species_name || ""} ${species.name || ""} ${c.species_id || ""}`.toLocaleLowerCase(locale);
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
export const saleValue = c => c.sell_value != null && Number.isFinite(Number(c.sell_value)) ? Math.max(25, Number(c.sell_value)) : null;
export function selectionCounts(npc, records) {
  const available = (npc?.shopCreatures || []).filter(c => c && !c.locked && c.species_id !== "ditto" && !c.is_shiny && !c.mega_active);
  const total = available.filter(c => npc.selectedCreatures?.has(c.id)).length;
  const visible = records.filter(r => r.checkbox.checked).length;
  return { total, hidden: Math.max(0, total - visible) };
}
