import { customPokeballConfig as config } from "./config.js";
import { createCustomPokeballStore } from "./store.js";
import { customPokeballText, mountCustomPokeball } from "./controller.js";

export { customPokeballText } from "./controller.js";

export function createCustomPokeballModule(doc = globalThis.document) {
  let target = null;
  let mounted = null;
  const store = createCustomPokeballStore({ win: doc.defaultView, storage: () => doc.defaultView.localStorage });
  return {
    id: config.id,
    shouldMount() {
      const toolbar = doc.querySelector(config.selectors.toolbar);
      const next = toolbar ? { toolbar } : null;
      if (!next || !target || next.toolbar !== target.toolbar || (mounted && !mounted.isIntact())) target = next;
      return Boolean(target);
    },
    getMountKey: () => target,
    reconcile: () => mounted?.sync(),
    mount() {
      mounted = mountCustomPokeball(target, store, doc);
      return () => { mounted?.cleanup(); mounted = null; };
    },
  };
}
