import { mountTeam } from "./controller.js";
import { findTeam, teamParts } from "./dom.js";

export function createTeamModule() {
  let root, mounted;
  return {
    id: "team",
    shouldMount() { root = findTeam(); return Boolean(root && teamParts(root).body); },
    getMountKey: () => root,
    mount() { mounted = mountTeam(root); return () => { mounted.cleanup(); mounted = null; }; },
    reconcile: () => mounted?.sync(),
  };
}
