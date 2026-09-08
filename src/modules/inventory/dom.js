import { inventoryConfig as config } from "./config.js";
export const locale = () => document.defaultView?.PokeIdle?.Localization?.get?.() || document.documentElement.lang || "pt";
export const inventoryText = () => config.text[locale().split(/[-_]/)[0]] || config.text.en;
export const findInventory = () => document.querySelector(config.selectors.root);
export function findParts(root) {
  const toolbar = root.querySelector(config.selectors.toolbar);
  return { toolbar, search: toolbar?.querySelector(config.selectors.search), category: toolbar?.querySelector(config.selectors.category), grid: root.querySelector(config.selectors.grid), body: root.querySelector(config.selectors.body) };
}
export function readInventoryScene(body) {
  const view = document.defaultView;
  const cached = view?.PokeIdle?.ReactiveWindows?.cached?.();
  return [...(Array.isArray(cached) ? cached : []), view?.SceneManager?._scene]
    .find(candidate => candidate?._panel?.body === body);
}
export function readCreatures(body) {
  const scene = readInventoryScene(body);
  // Only read the scene that owns this native panel; never request creature data.
  return scene?._panel?.body === body && Array.isArray(scene._creatures)
    ? new Map(scene._creatures.map(creature => [String(creature.id), creature])) : new Map();
}
export function readItems(body) {
  const items = readInventoryScene(body)?._items;
  const result = new Map();
  if (Array.isArray(items)) for (const item of items) {
    if (!result.has(item.name)) result.set(item.name, []);
    result.get(item.name).push(item);
  }
  return result;
}
export function readSlot(node, creatures = new Map(), items = new Map()) {
  const pokemon = node.classList.contains("inventory-slot--pokemon");
  const label = node.getAttribute("aria-label") || "";
  let name = label.replace(/,\s*[\d.,\s]+\s+(?:units?|unidades?)$/iu, "");
  const template = document.defaultView?.PokeIdle?.t?.("inventory.slot_aria", { name: "__NAME__", count: "__COUNT__" });
  if (template?.includes("__NAME__") && template.includes("__COUNT__")) {
    const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = escape(template).replace("__NAME__", "(?<name>.+?)").replace("__COUNT__", ".+?");
    name = label.match(new RegExp(`^${pattern}$`, "u"))?.groups?.name || name;
  }
  const numeric = selector => {
    const value = node.querySelector(selector)?.textContent?.replace(/[^0-9]/g, "");
    return value ? Number(value) : null;
  };
  const creature = pokemon ? creatures.get(node.dataset.creatureId) : null;
  const number = value => (typeof value === "number" || (typeof value === "string" && value.trim())) && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
  const ivs = Object.values(creature?.ivs || {}).map(number);
  const iv = number(creature?.iv_total) ?? (ivs.length === 6 && ivs.every(value => value !== null) ? ivs.reduce((sum, value) => sum + value, 0) : null);
  const prices = new Set((items.get(name) || []).map(item => number(item.sell_price)));
  const sellValue = number(creature?.sell_value);
  const price = pokemon ? (sellValue || (number(creature?.sell_price) ?? sellValue)) : prices.size === 1 ? [...prices][0] : null;
  const rarities = config.rarities.filter(value => node.classList.contains(`rarity-${value}`));
  const rarity = rarities.length === 1 ? config.rarities.indexOf(rarities[0]) : null;
  return { node, name, pokemon, key: pokemon && node.dataset.creatureId ? `pokemon:${node.dataset.creatureId}` : `${pokemon ? "pokemon" : "item"}:${name}`, quantity: numeric(config.selectors.quantity), level: numeric(config.selectors.level), iv, quality: number(creature?.quality_multiplier), price, rarity };
}
export function placeNodes(grid, nodes) {
  for (let index = 0; index < nodes.length; index++) if (grid.childNodes[index] !== nodes[index]) grid.insertBefore(nodes[index], grid.childNodes[index] || null);
}
