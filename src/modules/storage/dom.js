import { storageConfig as config } from "./config.js";
import { nativeMenuAvailableInCardMode } from "../card-mode/native-menu-contracts.js";
export function findStorage(doc = document, inCards = false) {
  const view = doc.defaultView, cached = view?.PokeIdle?.ReactiveWindows?.cached?.();
  const active = view?.SceneManager?._scene;
  const scenes = [active, ...(Array.isArray(cached) ? cached : [])].filter((scene, index, list) => scene && list.indexOf(scene) === index);
  for (const root of doc.querySelectorAll(config.selectors.root)) {
    if (inCards && !nativeMenuAvailableInCardMode(root, "storage")) continue;
    const body = root.querySelector(config.selectors.body);
    const scene = scenes.find(candidate => candidate._panel?.body === body && Array.isArray(candidate._creatures) && config.methods.every(key => typeof candidate[key] === "function"));
    if (body && scene) return {root,scene};
  }
  return null;
}
