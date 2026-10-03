import { findChat, findTabBar } from "./dom.js";
import { mountChat } from "./controller.js";
import { createChatPreferences } from "./preferences.js";
export function createChatModule(preference = createChatPreferences()) {
  let root, bar, mounted;
  return {
    id: "chat",
    observerScopes: ["chat"],
    shouldMount() { root = findChat(); bar = root && findTabBar(root); return Boolean(bar); },
    getMountKey: () => bar,
    mount() { mounted = mountChat(root, bar, preference); return () => { mounted.cleanup(); mounted = null; }; },
    reconcile: () => mounted?.sync(),
  };
}
