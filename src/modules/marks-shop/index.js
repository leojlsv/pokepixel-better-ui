import { findShop } from "./dom.js";
import { mountShop } from "./controller.js";
import { nativeActionPanelAvailableInCardMode } from "../card-mode/native-menu-contracts.js";
export function createMarksShopModule() {
  let root, mounted;
  return {
    id: "marks-shop",
    runsInCardMode: true,
    shouldMount() {
      root=findShop();
      return Boolean(root && (document.documentElement.getAttribute("data-ppbui-card-mode")!=="cards" ||
        nativeActionPanelAvailableInCardMode(root,"npc-shop")));
    },
    getMountKey: () => root,
    mount() { mounted = mountShop(root); return () => { mounted.cleanup(); mounted = null; }; },
    reconcile: () => mounted?.sync(),
  };
}
