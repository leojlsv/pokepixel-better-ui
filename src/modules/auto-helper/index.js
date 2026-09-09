import { autoHelperConfig as config } from "./config.js";
import { helperParts } from "./dom.js";
import { mountAutoHelper } from "./controller.js";
import { createSettingsSaver } from "./saver.js";
export { autoHelperText } from "./config.js";
export function createAutoHelperModule() {
  let root, mounted, key;
  const session = { groups: {} };
  return {
    id: config.id,
    shouldMount() {
      root = document.querySelector(config.selectors.root);
      key = root?.querySelector(config.selectors.grid);
      return Boolean(root && key && (root.hasAttribute("data-ppbui-auto-helper") || helperParts(root)));
    },
    getMountKey: () => key,
    mount() {
      const currentRoot = root, currentKey = key, pi = root.ownerDocument.defaultView.PokeIdle;
      if (!session.saver) {
        session.saver = createSettingsSaver(payload => pi.Api.updateHuntSettings(...payload));
        session.saver.subscribe(() => {
          const state = session.saver.state();
          if (state.phase === "error" && !root?.isConnected) pi.Toast?.error?.(state.error);
        });
      }
      mounted = mountAutoHelper(root, session);
      return () => {
        mounted.cleanup(); mounted = null;
        // Native item pickers keep private selected IDs; disabling restores a fresh native editor.
        if (currentRoot.isConnected && currentRoot.querySelector(config.selectors.grid) === currentKey) {
          const body = currentRoot.querySelector(config.selectors.body);
          if (body) body.inert = true;
          void session.saver.flush().then(() => {
            if (!currentRoot.isConnected) return;
            if (session.saver.state().phase === "error") pi.Toast?.error?.(session.saver.state().error);
            pi.AutoHelper.open();
          });
        }
      };
    },
    reconcile: () => mounted?.sync(),
  };
}
