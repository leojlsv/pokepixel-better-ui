import { storageConfig as config } from "./config.js";
export function findStorage(doc = document) {
  const view = doc.defaultView, cached = view?.PokeIdle?.ReactiveWindows?.cached?.();
  const scenes = [...(Array.isArray(cached) ? cached : []), view?.SceneManager?._scene].filter(Boolean);
  for (const root of doc.querySelectorAll(config.selectors.root)) {
    const body = root.querySelector(config.selectors.body);
    const scene = scenes.find(candidate => candidate._panel?.body === body && Array.isArray(candidate._creatures) && config.methods.every(key => typeof candidate[key] === "function"));
    if (body && scene) return {root,scene};
  }
  return null;
}
