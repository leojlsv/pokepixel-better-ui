import { autoHelperConfig as config } from "./config.js";
import { helperParts } from "./dom.js";
import { mountAutoHelper } from "./controller.js";
import { createSettingsSaver } from "./saver.js";
export { autoHelperText } from "./config.js";
export function createAutoHelperModule() {
  let root, mounted, key, mountGeneration = 0;
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
      const currentRoot = root, currentKey = key, win = currentRoot.ownerDocument.defaultView;
      const generation = ++mountGeneration;
      if (!session.saver) {
        session.saver = createSettingsSaver(async payload => {
          const api = win.PokeIdle?.Api;
          if (typeof api?.getHuntSettings !== "function" || typeof api?.updateHuntSettings !== "function")
            throw new Error("Native Auto Helper settings API unavailable");
          const latestResponse = await api.getHuntSettings();
          if (win.PokeIdle?.Api !== api) throw new Error("Native Auto Helper settings API changed during save");
          const latest = latestResponse?.data || latestResponse || {};
          const [capture, potion, combat, sell, extract] = payload;
          const merge = (base, patch) => ({ ...(base && typeof base === "object" ? base : {}), ...patch });
          await api.updateHuntSettings(
            merge(latest.auto_capture, capture),
            merge(latest.auto_potion, potion),
            combat,
            merge(latest.auto_sell, sell),
            extract === undefined ? undefined : merge(latest.auto_extract, extract),
          );
        });
        session.saver.subscribe(() => {
          const state = session.saver.state();
          if (state.phase === "error" && !root?.isConnected) win.PokeIdle?.Toast?.error?.(state.error);
        });
      }
      const currentMount = mountAutoHelper(root, session);
      mounted = currentMount;
      return () => {
        currentMount.cleanup();
        if (mounted === currentMount) mounted = null;
        // Native item pickers keep private selected IDs; disabling restores a fresh native editor.
        if (currentRoot.isConnected && currentRoot.querySelector(config.selectors.grid) === currentKey) {
          const body = currentRoot.querySelector(config.selectors.body);
          if (body) body.inert = true;
          void session.saver.flush().then(() => {
            if (mountGeneration !== generation) return;
            if (!currentRoot.isConnected) return;
            if (session.saver.state().phase === "error") win.PokeIdle?.Toast?.error?.(session.saver.state().error);
            win.PokeIdle?.AutoHelper?.open?.();
          });
        }
      };
    },
    reconcile: () => mounted?.sync(),
  };
}
