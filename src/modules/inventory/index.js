import { findInventory } from "./dom.js";
import { mountInventory } from "./controller.js";
import { createInventoryOrder } from "./preferences.js";
export function createInventoryModule(preference = createInventoryOrder()) {
  let root = null;
  let mounted = null;
  return {
    id: "inventory",
    shouldMount() { root = findInventory(); return Boolean(root); },
    getMountKey: () => root,
    mount() { mounted = mountInventory(root, preference); return () => { mounted.cleanup(); mounted = null; }; },
    reconcile: () => mounted?.sync(),
  };
}
