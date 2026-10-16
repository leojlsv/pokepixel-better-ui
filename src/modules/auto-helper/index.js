import { autoHelperConfig as config } from "./config.js";
import { helperParts } from "./dom.js";
import { mountAutoHelper } from "./controller.js";
import { createSettingsSaver } from "./saver.js";
import { readMenuLayoutOwner } from "../menu-bar/layout-owner.js";
export { autoHelperText } from "./config.js";
export function createAutoHelperModule() {
  let root, mounted, key, mountGeneration = 0, mountKey = null, observedKey = null, observedOwner = "", sessionOwner = "";
  let session = { groups: {} };
  const readOwner = win => readMenuLayoutOwner(win).owner;
  return {
    id: config.id,
    shouldMount() {
      root = document.querySelector(config.selectors.root);
      key = root?.querySelector(config.selectors.grid);
      const owner = readOwner(root?.ownerDocument.defaultView);
      if (key !== observedKey || owner !== observedOwner) {
        observedKey = key; observedOwner = owner; mountKey = { grid:key, owner };
      }
      return Boolean(root && key && owner && (root.hasAttribute("data-ppbui-auto-helper") || helperParts(root)));
    },
    getMountKey: () => mountKey,
    mount() {
      const currentRoot = root, currentKey = key, win = currentRoot.ownerDocument.defaultView;
      const generation = ++mountGeneration;
      const owner = readOwner(win);
      if (!owner) throw new Error("Native Auto Helper trainer identity unavailable");
      if (sessionOwner !== owner) {
        // An A saver must never revive after an observed A→B→A switch. Owner
        // equality alone cannot distinguish the earlier A login/session.
        session.saver?.retire?.();
        session.retired = true;
        session = { groups:{}, resetNativeOnLoad:Boolean(sessionOwner) };
        sessionOwner = owner;
      }
      const currentSession = session;
      if (!currentSession.saver) {
        currentSession.saver = createSettingsSaver(async (payload, draftOwner) => {
          if (currentSession !== session || currentSession.retired
            || !draftOwner || draftOwner !== owner || readOwner(win) !== owner)
            throw new Error("Native Auto Helper trainer changed during save");
          const api = win.PokeIdle?.Api;
          if (typeof api?.getHuntSettings !== "function" || typeof api?.updateHuntSettings !== "function")
            throw new Error("Native Auto Helper settings API unavailable");
          const latestResponse = await api.getHuntSettings();
          if (currentSession !== session || currentSession.retired || readOwner(win) !== owner)
            throw new Error("Native Auto Helper trainer changed during save");
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
        }, 450, () => readOwner(win));
        currentSession.saver.subscribe(() => {
          const state = currentSession.saver.state();
          if (state.phase === "error" && !root?.isConnected) win.PokeIdle?.Toast?.error?.(state.error);
        });
      }
      currentSession.isCurrentOwner = () => readOwner(win) === owner;
      const currentMount = mountAutoHelper(root, currentSession);
      mounted = currentMount;
      return () => {
        currentMount.cleanup();
        if (mounted === currentMount) mounted = null;
        if (readOwner(win) !== owner) {
          currentSession.retired = true;
          currentSession.saver?.retire?.();
        }
        // Native item pickers keep private selected IDs; disabling restores a fresh native editor.
        if (readOwner(win) === owner && currentRoot.isConnected && currentRoot.querySelector(config.selectors.grid) === currentKey) {
          const body = currentRoot.querySelector(config.selectors.body);
          if (body) body.inert = true;
          void currentSession.saver.flush().then(() => {
            if (mountGeneration !== generation) return;
            if (!currentRoot.isConnected || readOwner(win) !== owner) return;
            if (currentSession.saver.state().phase === "error") win.PokeIdle?.Toast?.error?.(currentSession.saver.state().error);
            win.PokeIdle?.AutoHelper?.open?.();
          });
        }
      };
    },
    reconcile: () => mounted?.sync(),
  };
}
