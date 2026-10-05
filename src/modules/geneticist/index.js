import { mountGeneticist } from "./controller.js";
import { findGeneticist } from "./dom.js";

export function createGeneticistModule() {
  let root, mounted;
  return {
    id: "geneticist",
    shouldMount() { root = findGeneticist(); return Boolean(root); },
    getMountKey: () => root,
    mount() { mounted = mountGeneticist(root); return () => { mounted?.cleanup(); mounted = null; }; },
    reconcile: () => mounted?.sync(),
  };
}
