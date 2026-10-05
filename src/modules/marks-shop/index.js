import { findShop } from "./dom.js";
import { mountShop } from "./controller.js";
export function createMarksShopModule() {
  let root, mounted;
  return {
    id: "marks-shop",
    shouldMount() { root = findShop(); return Boolean(root); },
    getMountKey: () => root,
    mount() { mounted = mountShop(root); return () => { mounted.cleanup(); mounted = null; }; },
    reconcile: () => mounted?.sync(),
  };
}
