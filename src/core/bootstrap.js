import { createDomObserver } from "./observer.js";
import { createLifecycle } from "./lifecycle.js";
import { createLogger } from "./logger.js";

export function createBetterUI({ modules = [], debug = false } = {}) {
  const lifecycle = createLifecycle();
  const logger = createLogger("core", debug);

  const reconcile = () => {
    for (const module of modules) {
      try {
        const shouldMount = Boolean(module.shouldMount());

        if (shouldMount && !lifecycle.isMounted(module.id)) {
          const cleanup = module.mount({ debug });
          lifecycle.mount(module.id, cleanup);
          logger.debug("mounted", module.id);
          continue;
        }

        if (!shouldMount && lifecycle.isMounted(module.id)) {
          lifecycle.unmount(module.id);
          logger.debug("unmounted", module.id);
        }
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
      observer.start(document.body);
      logger.debug("started");
    },

    stop() {
      observer.stop();
      lifecycle.destroy();
      logger.debug("stopped");
    },

    reconcile,
  };
}
