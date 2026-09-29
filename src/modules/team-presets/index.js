import { mountTeamPresets } from "./controller.js";
import { findTeamHud, teamPresetsText } from "./dom.js";

export function createTeamPresetsModule({ store } = {}) {
  let root, mounted;
  return {
    id: "team-presets",
    shouldMount() { root = findTeamHud(); return Boolean(root); },
    getMountKey: () => root,
    mount() { mounted = mountTeamPresets(root, { store }); return () => { mounted.cleanup(); mounted = null; }; },
    reconcile: () => mounted?.sync(),
  };
}

export { teamPresetsText };
