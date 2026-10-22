import { mountEvolutionCenter } from "./controller.js";
import { findEvolutionCenter } from "./dom.js";
import { nativeActionPanelAvailableInCardMode } from "../card-mode/native-menu-contracts.js";

export function createEvolutionCenterModule() {
  let root, mounted;
  return {
    id: "evolution-center",
    runsInCardMode: true,
    shouldMount() {
      root=findEvolutionCenter();
      return Boolean(root && (document.documentElement.getAttribute("data-ppbui-card-mode")!=="cards" ||
        nativeActionPanelAvailableInCardMode(root,"city-evolution-center")));
    },
    getMountKey: () => root,
    mount() { mounted = mountEvolutionCenter(root); return () => { mounted?.cleanup(); mounted = null; }; },
    reconcile: () => mounted?.sync(),
  };
}
