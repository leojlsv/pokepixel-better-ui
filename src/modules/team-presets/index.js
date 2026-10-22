import { mountTeamPresets } from "./controller.js";
import { findTeamHud, teamPresetsText } from "./dom.js";
import { nativeMenuAvailableInCardMode } from "../card-mode/native-menu-contracts.js";
import { createTeamPresetStorage } from "./storage.js";
import { currentStorageOwner } from "../../core/trainer-storage-scope.js";

export function createTeamPresetsModule({ store } = {}) {
  let root, mounted, sessionStore = store;
  return {
    id: "team-presets",
    runsInCardMode: true,
    observerScopes: ["team-hud"],
    shouldMount() {
      root=findTeamHud();
      if (!root) return false;
      if (root.ownerDocument.documentElement.getAttribute("data-ppbui-card-mode")!=="cards") return true;
      return [...root.ownerDocument.querySelectorAll(".pokeidle-team-panel")]
        .some(panel=>nativeMenuAvailableInCardMode(panel,"team"));
    },
    getMountKey: () => root,
    mount() {
      // One module lifecycle can mount Team repeatedly as Card Mode changes or
      // the native UIPanel is minimized. Recreating storage on every mount
      // silently loses session-only drafts when Web Locks are unavailable.
      if (!sessionStore) {
        const win = root.ownerDocument.defaultView;
        sessionStore = createTeamPresetStorage({
          storage: () => win.localStorage,
          owner: () => currentStorageOwner(win),
          locks: () => win.navigator?.locks,
          mutationLocks: () => win.navigator?.locks,
        });
      }
      mounted = mountTeamPresets(root, { store: sessionStore });
      return () => { mounted.cleanup(); mounted = null; };
    },
    reconcile: trigger => mounted?.sync({ hudScoped: trigger === "observer:team-hud" }),
  };
}

export { teamPresetsText };
