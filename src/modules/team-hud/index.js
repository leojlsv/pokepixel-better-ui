import { mountTeamHud } from "./controller.js";
import { findTeamHud, hudParts } from "./dom.js";

export function createTeamHudModule() {
  let root, mounted;
  return {
    id: "team-hud",
    shouldMount() { root = findTeamHud(); return Boolean(root && hudParts(root).list); },
    getMountKey: () => root,
    mount() { mounted = mountTeamHud(root); return () => { mounted.cleanup(); mounted = null; }; },
    reconcile: () => mounted?.sync(),
  };
}
