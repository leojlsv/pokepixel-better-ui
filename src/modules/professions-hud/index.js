import { mountProfessionsHud } from "./controller.js";
import { findProfessionsWorkforce } from "./dom.js";
import { activeNativeMenu, nativeMenuAvailableInCardMode } from "../card-mode/native-menu-contracts.js";

export function createProfessionsHudModule() {
  let root = null;
  let mounted = null;
  return {
    id: "professions-hud",
    runsInCardMode: true,
    shouldMount() {
      if (document.documentElement?.getAttribute("data-ppbui-card-mode") === "cards") {
        // Use the active native scene's exact UIPanel, never a retained or hidden cache.
        const native = activeNativeMenu(document.defaultView, "professions");
        root = native && nativeMenuAvailableInCardMode(native.panel.el, "professions")
          ? native.panel.body.querySelector(".profession-workforce")
          : null;
      } else {
        root = findProfessionsWorkforce();
      }
      return Boolean(root);
    },
    getMountKey: () => root,
    mount() {
      mounted = mountProfessionsHud(root);
      return () => {
        mounted?.cleanup();
        mounted = null;
      };
    },
    reconcile: () => mounted?.sync(),
  };
}
