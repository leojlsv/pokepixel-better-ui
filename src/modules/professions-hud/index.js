import { mountProfessionsHud } from "./controller.js";
import { findProfessionsWorkforce } from "./dom.js";

export function createProfessionsHudModule() {
  let root = null;
  let mounted = null;
  return {
    id: "professions-hud",
    shouldMount() {
      root = findProfessionsWorkforce();
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
