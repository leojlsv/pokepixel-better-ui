import { menuBarConfig } from "./config.js";
import { findMenuTarget, sameTarget } from "./dom.js";
import { mountMenuBar } from "./controller.js";

export function createMenuBarModule() {
  let target = null;
  let mounted = null;
  let pendingOrientation = null;
  const normalizeOrientation = value =>
    menuBarConfig.orientations.includes(value) ? value : "horizontal";
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
    getOrientation: () => mounted?.getOrientation?.() || pendingOrientation || "horizontal",
    setOrientation: value => {
      pendingOrientation = normalizeOrientation(value);
      mounted?.setOrientation?.(pendingOrientation);
    },
    mount() {
      mounted = mountMenuBar(findMenuTarget());
      if (pendingOrientation) mounted.setOrientation(pendingOrientation);
      return () => {
        pendingOrientation = mounted?.getOrientation?.() || pendingOrientation;
        mounted?.cleanup();
        mounted = null;
      };
    },
  };
}

export const menuBarModule = createMenuBarModule();
