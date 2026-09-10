import { mountInventoryPokemon } from "../pokemon-tools/adapters.js";
import { findInventory } from "./dom.js";
import { mountInventory } from "./controller.js";
import { createInventoryOrder } from "./preferences.js";
export function createInventoryModule(preference = createInventoryOrder()) {
  let root = null;
  let mounted = null, pokemon = null;
  return {
    id: "inventory",
    shouldMount() { root = findInventory(); return Boolean(root); },
    getMountKey: () => root,
    mount() { mounted = mountInventory(root, preference); pokemon=mountInventoryPokemon(root); return () => { pokemon?.cleanup();pokemon=null;mounted.cleanup(); mounted = null; }; },
    reconcile: () => { if(!pokemon)pokemon=mountInventoryPokemon(root);mounted?.sync(); },
  };
}
