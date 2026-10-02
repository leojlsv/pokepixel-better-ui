import { menuBarConfig } from "./config.js";
import { findMenuTarget, sameTarget } from "./dom.js";
import { mountMenuBar } from "./controller.js";

export function createMenuBarModule() {
  let target = null;
  let mounted = null;
  let pendingOrientation = null;
  let orientationPersistent = true;
  const normalizeOrientation = value =>
    menuBarConfig.orientations.includes(value) ? value : "horizontal";
  const readOrientation = () => {
    if (pendingOrientation) return pendingOrientation;
    try {
      const saved = globalThis.document?.defaultView?.localStorage?.getItem(menuBarConfig.orientationStorageKey);
      orientationPersistent = true;
      return menuBarConfig.orientations.includes(saved) ? saved : "horizontal";
    } catch {
      orientationPersistent = false;
      return "horizontal";
    }
  };
  const persistOrientation = value => {
    try {
      globalThis.document?.defaultView?.localStorage?.setItem(menuBarConfig.orientationStorageKey, value);
      orientationPersistent = true;
    } catch {
      orientationPersistent = false;
    }
  };
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
    getOrientation: () => mounted?.getOrientation?.() || readOrientation(),
    setOrientation: value => {
      pendingOrientation = normalizeOrientation(value);
      if (mounted) {
        mounted.setOrientation(pendingOrientation);
        orientationPersistent = mounted.isOrientationPersistent();
      } else {
        persistOrientation(pendingOrientation);
      }
    },
    isOrientationPersistent: () => mounted?.isOrientationPersistent?.() ?? orientationPersistent,
    mount() {
      mounted = mountMenuBar(findMenuTarget());
      if (pendingOrientation) mounted.setOrientation(pendingOrientation);
      return () => {
        pendingOrientation = mounted?.getOrientation?.() || pendingOrientation;
        orientationPersistent = mounted?.isOrientationPersistent?.() ?? orientationPersistent;
        mounted?.cleanup();
        mounted = null;
      };
    },
  };
}

export const menuBarModule = createMenuBarModule();
