import { mountInventoryPokemon } from "../pokemon-tools/adapters.js";
import { findInventory, inventoryAvailableInCardMode } from "./dom.js";
import { mountInventory } from "./controller.js";
import { createInventoryOrder } from "./preferences.js";
export function createInventoryModule(preference = createInventoryOrder(), walletService = null) {
  let root = null;
  let mounted = null, pokemon = null;
  return {
    id: "inventory",
    runsInCardMode: true,
    shouldMount() { root = findInventory(); return Boolean(root && (
      document.documentElement?.getAttribute("data-ppbui-card-mode") !== "cards" ||
      inventoryAvailableInCardMode(root)
    )); },
    getMountKey: () => root,
    mount() { mounted = mountInventory(root, preference, walletService); pokemon=mountInventoryPokemon(root); return () => { pokemon?.cleanup();pokemon=null;mounted.cleanup(); mounted = null; }; },
    reconcile: () => { if(!pokemon)pokemon=mountInventoryPokemon(root);mounted?.sync(); },
  };
}
