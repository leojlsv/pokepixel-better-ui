import { coupledWorkspaceConfig } from "./config.js";
import { isCoupledWorkspaceHost, mountCoupledWorkspaceAdapter } from "./controller.js";

export function createCoupledWorkspaceModule() {
  let mounted = null;
  return {
    id: coupledWorkspaceConfig.id,
    shouldMount: () => isCoupledWorkspaceHost(document.defaultView),
    reconcile: trigger => mounted?.sync(trigger === "observer"),
    mount() {
      mounted = mountCoupledWorkspaceAdapter(document.defaultView);
      return () => {
        mounted?.cleanup();
        mounted = null;
      };
    },
  };
}
