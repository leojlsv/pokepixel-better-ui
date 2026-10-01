import { createDomObserver } from "./observer.js";
import { createLifecycle } from "./lifecycle.js";
import { createLogger } from "./logger.js";

export function createBetterUI({ modules = [], debug = false, preferences, appearance, designSystem } = {}) {
  const lifecycle = createLifecycle();
  const logger = createLogger("core", debug);
  const mountKeys = new Map();
  let unsubscribe = null;
  let modeListenerInstalled = false;
  let modeWindow = null;

  const reconcile = (trigger = "explicit") => {
    const textualCardMode = document.documentElement?.getAttribute("data-ppbui-card-mode") === "cards";
    for (const module of modules) {
      try {
        const allowedByMode = !textualCardMode || module.runsInCardMode === true;
        const shouldMount = allowedByMode && (preferences?.isEnabled(module.id) ?? true) && Boolean(module.shouldMount());
        const mountKey = shouldMount ? module.getMountKey?.() : undefined;

        if (lifecycle.isMounted(module.id) &&
            (!shouldMount || mountKeys.get(module.id) !== mountKey)) {
          lifecycle.unmount(module.id);
          mountKeys.delete(module.id);
          logger.debug("unmounted", module.id);
        }

        if (shouldMount && !lifecycle.isMounted(module.id)) {
          const cleanup = module.mount({ debug });
          lifecycle.mount(module.id, cleanup);
          mountKeys.set(module.id, mountKey);
          logger.debug("mounted", module.id);
        }
        if (shouldMount) module.reconcile?.(trigger === "observer" ? "observer" : "explicit");
      } catch (error) {
        logger.error(`module "${module.id}" failed during reconcile`, error);
      }
    }
  };

  const observer = createDomObserver(() => reconcile("observer"));

  return {
    start() {
      if (!document.body) {
        throw new Error("document.body is not available");
      }

      appearance?.mount?.();
      designSystem?.mount?.();
      if (!modeListenerInstalled) {
        modeWindow = document.defaultView || globalThis.window || null;
        if (modeWindow?.addEventListener) {
          modeWindow.addEventListener("ppbui:card-mode-change", reconcile);
          modeListenerInstalled = true;
        }
      }
      reconcile();
      if (!unsubscribe && preferences) unsubscribe = preferences.subscribe(reconcile);
      observer.start(document.body);
      logger.debug("started");
    },

    stop() {
      observer.stop();
      if (modeListenerInstalled) {
        modeWindow?.removeEventListener?.("ppbui:card-mode-change", reconcile);
        modeListenerInstalled = false;
      }
      modeWindow = null;
      unsubscribe?.();
      unsubscribe = null;
      try {
        lifecycle.destroy();
        mountKeys.clear();
      } finally {
        try {
          designSystem?.unmount?.();
        } finally {
          appearance?.unmount?.();
        }
      }
      logger.debug("stopped");
    },

    reconcile,
  };
}
