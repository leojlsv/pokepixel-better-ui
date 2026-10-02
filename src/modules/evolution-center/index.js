import { mountEvolutionCenter } from "./controller.js";
import { findEvolutionCenter } from "./dom.js";

export function createEvolutionCenterModule() {
  let root, mounted;
  return {
    id: "evolution-center",
    shouldMount() { root = findEvolutionCenter(); return Boolean(root); },
    getMountKey: () => root,
    mount() { mounted = mountEvolutionCenter(root); return () => { mounted?.cleanup(); mounted = null; }; },
    reconcile: () => mounted?.sync(),
  };
}
