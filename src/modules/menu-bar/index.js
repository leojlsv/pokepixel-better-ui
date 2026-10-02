import { menuBarConfig } from "./config.js";
import { findMenuTarget, sameTarget } from "./dom.js";
import { mountMenuBar } from "./controller.js";

export function createMenuBarModule() {
  let target = null;
  let mounted = null;
  return {
    id: menuBarConfig.id,
    runsInCardMode: true,
    shouldMount() {
      const next = findMenuTarget();
      if (!sameTarget(next, target) || (mounted && !mounted.isIntact())) target = next;
      return Boolean(target);
    },
    getMountKey: () => target,
    reconcile: () => mounted?.sync(),
    mount() {
      mounted = mountMenuBar(findMenuTarget());
      return () => {
        mounted?.cleanup();
        mounted = null;
      };
    },
  };
}

export const menuBarModule = createMenuBarModule();
