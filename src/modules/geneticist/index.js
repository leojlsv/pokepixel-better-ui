import { mountGeneticist } from "./controller.js";
import { findGeneticist } from "./dom.js";
import { nativeActionPanelAvailableInCardMode } from "../card-mode/native-menu-contracts.js";

export function createGeneticistModule() {
  let root, mounted;
  return {
    id: "geneticist",
    runsInCardMode: true,
    shouldMount() {
      root=findGeneticist();
      return Boolean(root && (document.documentElement.getAttribute("data-ppbui-card-mode")!=="cards" ||
        nativeActionPanelAvailableInCardMode(root,"city-geneticist")));
    },
    getMountKey: () => root,
    mount() { mounted = mountGeneticist(root); return () => { mounted?.cleanup(); mounted = null; }; },
    reconcile: () => mounted?.sync(),
  };
}
