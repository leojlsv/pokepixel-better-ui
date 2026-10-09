import { buffStripConfig as config } from "./config.js";
import { findBuffStripTarget, buffStripText } from "./dom.js";
import { mountBuffStrip } from "./controller.js";

export { buffStripText } from "./dom.js";

export function createBuffStripModule(doc = globalThis.document) {
  let target = null;
  let mounted = null;
  return {
    id: config.id,
    observerScopes: ["buff-strip"],
    shouldMount() {
      const next = findBuffStripTarget(doc);
      if (!next) {
        target = null;
        return false;
      }
      if (!target || next.strip !== target.strip || next.toolbar !== target.toolbar || (mounted && !mounted.isIntact())) target = next;
      return true;
    },
    getMountKey: () => target,
    mount() {
      mounted = mountBuffStrip(target);
      return () => {
        mounted?.cleanup();
        mounted = null;
      };
    },
    reconcile: () => mounted?.sync(),
  };
}
