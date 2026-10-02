import { moduleControlsConfig as config } from "./config.js";
import { findControlsTarget } from "./dom.js";

import { mountControls } from "./controller.js";

export function createModuleControls({ preferences, modules, menuBar }) {
  let target = null;
  let mounted = null;
  return {
    id: config.id,
    runsInCardMode: true,
    shouldMount() {
      const next = findControlsTarget();
      if (!next || !target || next.toolbar !== target.toolbar || next.icon !== target.icon || (mounted && !mounted.isIntact())) target = next;
      return Boolean(target);
    },
    getMountKey: () => target,
    reconcile: () => mounted?.sync(),
    mount() {
      mounted = mountControls(target, preferences, modules, menuBar);
      return () => { mounted.cleanup(); mounted = null; };
    },
  };
}
