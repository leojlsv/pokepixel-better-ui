import { createDomObserver } from "./observer.js";
import { createLifecycle } from "./lifecycle.js";
import { createLogger } from "./logger.js";

export function createBetterUI({ modules = [], debug = false, preferences } = {}) {
  const lifecycle = createLifecycle();
  const logger = createLogger("core", debug);
  const mountKeys = new Map();
  let unsubscribe = null;

  const reconcile = () => {
    for (const module of modules) {
      try {
        const shouldMount = (preferences?.isEnabled(module.id) ?? true) && Boolean(module.shouldMount());
        const mountKey = shouldMount ? module.getMountKey?.() : undefined;

        if (lifecycle.isMounted(module.id) &&
            (!shouldMount || mountKeys.get(module.id) !== mountKey)) {
          mountKeys.delete(module.id);
          lifecycle.unmount(module.id);
          logger.debug("unmounted", module.id);
        }

        if (shouldMount && !lifecycle.isMounted(module.id)) {
          const cleanup = module.mount({ debug });
          lifecycle.mount(module.id, cleanup);
          mountKeys.set(module.id, mountKey);
          logger.debug("mounted", module.id);
        }
        if (shouldMount) module.reconcile?.();
      } catch (error) {
        logger.error(`module "${module.id}" failed during reconcile`, error);
      }
    }
  };

  const observer = createDomObserver(reconcile);

  return {
    start() {
      if (!document.body) {
        throw new Error("document.body is not available");
      }

      reconcile();
      if (!unsubscribe && preferences) unsubscribe = preferences.subscribe(reconcile);
      observer.start(document.body);
      logger.debug("started");
    },

    stop() {
      observer.stop();
      unsubscribe?.();
      unsubscribe = null;
      mountKeys.clear();
      lifecycle.destroy();
      logger.debug("stopped");
    },

    reconcile,
  };
}
