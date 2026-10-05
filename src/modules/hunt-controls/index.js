import { huntControlsConfig as config } from "./config.js";
import { findHuntControlsTarget, sameHuntControlsTarget } from "./dom.js";
import { mountHuntControls } from "./controller.js";
import { menuBarModule } from "../menu-bar/index.js";

export function createHuntControlsModule({ menuBar = menuBarModule, doc = globalThis.document } = {}) {
  let target = null;
  let mounted = null;
  return {
    id: config.id,
    shouldMount() {
      const city = menuBar?.getGroupTarget?.("city") || null;
      const next = findHuntControlsTarget(doc, city);
      if (!sameHuntControlsTarget(next, target) || (mounted && !mounted.isIntact())) target = next;
      return Boolean(target);
    },
    getMountKey: () => target,
    mount() {
      mounted = mountHuntControls(target);
      return () => {
        mounted?.cleanup();
        mounted = null;
      };
    },
    reconcile: () => mounted?.sync(),
  };
}

export const huntControlsModule = createHuntControlsModule();
