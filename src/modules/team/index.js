import { mountTeam } from "./controller.js";
import { findTeam, teamParts } from "./dom.js";
import { nativeMenuAvailableInCardMode } from "../card-mode/native-menu-contracts.js";

export function createTeamModule() {
  let root, mounted;
  return {
    id: "team",
    runsInCardMode: true,
    shouldMount() {
      const inCards = document.documentElement?.getAttribute("data-ppbui-card-mode") === "cards";
      root = inCards
        ? [...document.querySelectorAll(".pokeidle-team-panel")].find(node => nativeMenuAvailableInCardMode(node, "team")) || null
        : findTeam();
      return Boolean(root && teamParts(root).body);
    },
    getMountKey: () => root,
    mount() { mounted = mountTeam(root); return () => { mounted.cleanup(); mounted = null; }; },
    reconcile: () => mounted?.sync(),
  };
}
