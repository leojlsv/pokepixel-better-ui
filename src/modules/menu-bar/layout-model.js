import { menuBarConfig } from "./config.js";

export const SYSTEM_IDS = Object.freeze({
  cardMode: "system:card-mode",
  moduleControls: "system:module-controls",
});
const RETIRED_OPTIONAL_IDS = new Set(["wallet:menu", "wallet:shop"]);

const VERSION = 2;
const BAR = "bar";
export const SLOT_CAPACITY = Object.freeze({ min:10, max:15, default:13 });
const groupId = id => `group:${id}`;
const nativeId = id => id === "pokemon-profile" ? "betterui:pokemon-profile" : `native:${id}`;
const cityId = id => `city-shortcut:${id}`;
const groupContainers = menuBarConfig.groups.map(group => groupId(group.id));
const movableContainers = Object.freeze([BAR, ...groupContainers]);

const descriptor = value => Object.freeze({
  ...value,
  allowedContainers: Object.freeze([...value.allowedContainers]),
});

const catalog = [];
for (const group of menuBarConfig.groups) {
  catalog.push(descriptor({
    id: groupId(group.id), kind: "group", groupId: group.id,
    defaultContainer: BAR, allowedContainers: [BAR],
  }));
}

for (const id of menuBarConfig.order) {
  if (menuBarConfig.groups.some(group => group.id === id)) continue;
  catalog.push(descriptor({
    id: nativeId(id), kind: "native", nativeId: id,
    defaultContainer: BAR, allowedContainers:movableContainers,
  }));
}

for (const group of menuBarConfig.groups) {
  for (const id of group.items) {
    const special = id === "pokemon-profile";
    catalog.push(descriptor({
      id: nativeId(id), kind: special ? "betterui" : "native", ...(special ? {} : { nativeId:id }),
      defaultContainer: groupId(group.id),
      allowedContainers:movableContainers,
    }));
  }
}

for (const shortcut of menuBarConfig.cityActions) {
  catalog.push(descriptor({
    id: cityId(shortcut.id), kind: "city-shortcut", nativeId: shortcut.id,
    defaultContainer: groupId("city"), allowedContainers: movableContainers,
  }));
}

catalog.push(
  descriptor({ id:SYSTEM_IDS.cardMode, kind:"system", defaultContainer:BAR, allowedContainers:movableContainers }),
  descriptor({ id:SYSTEM_IDS.moduleControls, kind:"system", defaultContainer:BAR, allowedContainers:movableContainers }),
);

export const MENU_CATALOG = Object.freeze(catalog);

const byId = new Map(MENU_CATALOG.map(entry => [entry.id, entry]));
const groupIds = new Set(groupContainers);
const systemOrder = Object.freeze([SYSTEM_IDS.cardMode, SYSTEM_IDS.moduleControls]);

const cloneLayout = layout => ({
  version: VERSION,
  bar: [...layout.bar],
  groups: Object.fromEntries(groupContainers.map(id => [id, [...(layout.groups[id] || [])]])),
  orientation: layout.orientation,
  slotCapacity: layout.slotCapacity,
  position: layout.position ? { left:layout.position.left, top:layout.position.top } : null,
});

function defaultGroups() {
  const groups = Object.fromEntries(groupContainers.map(id => [id, []]));
  for (const item of MENU_CATALOG) {
    if (!item.optional && item.defaultContainer !== BAR) groups[item.defaultContainer].push(item.id);
  }
  return groups;
}

export function defaultLayout() {
  const bar = menuBarConfig.order.map(id => menuBarConfig.groups.some(group => group.id === id) ? groupId(id) : nativeId(id));
  bar.push(...systemOrder);
  return { version:VERSION, bar, groups:defaultGroups(), orientation:"horizontal", slotCapacity:SLOT_CAPACITY.default, position:null };
}

function finiteCoordinate(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

function positionValue(raw) {
  if (raw === null) return { ok:true, value:null };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok:false, error:"invalid-position" };
  const left = finiteCoordinate(raw.left), top = finiteCoordinate(raw.top);
  if (left === null || top === null) return { ok:false, error:"invalid-position" };
  return { ok:true, value:{ left, top } };
}

function fail(error) { return { ok:false, layout:null, error }; }

export function slotCount(layout) {
  if (!layout || !Array.isArray(layout.bar) || !layout.groups || typeof layout.groups !== "object") return Infinity;
  let count = 0;
  for (const id of layout.bar) {
    if (groupIds.has(id) && id !== groupId("city") && !(layout.groups[id]?.length > 0)) continue;
    count++;
  }
  return count;
}

export function validateLayout(raw, { allowOverflow = false } = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail("invalid-layout");
  if (raw.version !== 1 && raw.version !== VERSION) return fail(Number(raw.version) > VERSION ? "future-version" : "unsupported-version");
  if (!Array.isArray(raw.bar) || !raw.groups || typeof raw.groups !== "object" || Array.isArray(raw.groups)) return fail("invalid-shape");
  if (!menuBarConfig.orientations.includes(raw.orientation)) return fail("invalid-orientation");
  const slotCapacity = raw.version === 1 && raw.slotCapacity === undefined ? SLOT_CAPACITY.default : raw.slotCapacity;
  if (!Number.isInteger(slotCapacity) || slotCapacity < SLOT_CAPACITY.min || slotCapacity > SLOT_CAPACITY.max) return fail("invalid-slot-capacity");
  const position = positionValue(raw.position);
  if (!position.ok) return fail(position.error);

  const unknownGroup = Object.keys(raw.groups).find(id => !groupIds.has(id));
  if (unknownGroup) return fail("unknown-container");
  const rawLists = [raw.bar, ...groupContainers.map(id => raw.groups[id] ?? [])];
  if (rawLists.some(list => !Array.isArray(list))) return fail("invalid-shape");
  if (rawLists.reduce((sum, list) => sum + list.length, 0) > MENU_CATALOG.length * 4) return fail("oversize-layout");

  const normalized = { version:VERSION, bar:[], groups:Object.fromEntries(groupContainers.map(id => [id, []])), orientation:raw.orientation, slotCapacity, position:position.value };
  const seen = new Set();

  // Keep the explicit order exactly as supplied; validation never silently drops IDs.
  for (const id of raw.bar) {
    if (typeof id !== "string" || !id) return fail("invalid-id");
    if (RETIRED_OPTIONAL_IDS.has(id)) continue;
    const item = byId.get(id);
    if (!item) return fail("unknown-id");
    if (seen.has(id)) return fail("duplicate-id");
    if (!item.allowedContainers.includes(BAR)) return fail("invalid-placement");
    seen.add(id); normalized.bar.push(id);
  }
  for (const container of groupContainers) {
    const list = raw.groups[container] ?? [];
    if (!Array.isArray(list)) return fail("invalid-shape");
    for (const id of list) {
      if (typeof id !== "string" || !id) return fail("invalid-id");
      if (RETIRED_OPTIONAL_IDS.has(id)) continue;
      const item = byId.get(id);
      if (!item) return fail("unknown-id");
      if (seen.has(id)) return fail("duplicate-id");
      if (!item.allowedContainers.includes(container)) return fail("invalid-placement");
      seen.add(id); normalized.groups[container].push(id);
    }
  }

  // Known catalog additions are forward-compatible: append only missing known IDs to their defaults.
  for (const item of MENU_CATALOG) {
    if (seen.has(item.id) || item.optional) continue;
    if (item.defaultContainer === BAR) {
      if (item.kind === "system") {
        const order = systemOrder.indexOf(item.id);
        const nextSystem = systemOrder.slice(order + 1).map(id => normalized.bar.indexOf(id)).find(index => index >= 0);
        normalized.bar.splice(nextSystem === undefined ? normalized.bar.length : nextSystem, 0, item.id);
      }
      else {
        const firstSystem = normalized.bar.findIndex(id => systemOrder.includes(id));
        normalized.bar.splice(firstSystem < 0 ? normalized.bar.length : firstSystem, 0, item.id);
      }
    }
    else normalized.groups[item.defaultContainer].push(item.id);
    seen.add(item.id);
  }

  for (const id of groupContainers) if (!normalized.bar.includes(id)) return fail("group-anchor-missing");
  if (!allowOverflow && slotCount(normalized) > slotCapacity) return fail("slot-limit");
  return { ok:true, layout:cloneLayout(normalized), error:null };
}

export function getPlacement(layout, id) {
  if (!layout || typeof id !== "string") return null;
  const barIndex = Array.isArray(layout.bar) ? layout.bar.indexOf(id) : -1;
  if (barIndex >= 0) return { container:BAR, index:barIndex };
  for (const container of groupContainers) {
    const index = Array.isArray(layout.groups?.[container]) ? layout.groups[container].indexOf(id) : -1;
    if (index >= 0) return { container, index };
  }
  return null;
}

export function moveLayoutItem(layout, id, container, index, options) {
  const checked = validateLayout(layout, options);
  if (!checked.ok) return checked;
  const item = byId.get(id);
  if (!item) return fail("unknown-id");
  if (container !== BAR && !groupIds.has(container)) return fail("unknown-container");
  if (!item.allowedContainers.includes(container)) return fail("invalid-placement");
  if (!Number.isInteger(index) || index < 0) return fail("invalid-index");
  const current = getPlacement(checked.layout, id);
  if (!current) return fail("missing-id");
  const next = cloneLayout(checked.layout);
  const from = current.container === BAR ? next.bar : next.groups[current.container];
  from.splice(current.index, 1);
  const target = container === BAR ? next.bar : next.groups[container];
  if (index > target.length) return fail("invalid-index");
  target.splice(index, 0, id);
  const result = validateLayout(next, options);
  return result.ok ? { ok:true, layout:result.layout, error:null } : result;
}
