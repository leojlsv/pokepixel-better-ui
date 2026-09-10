import { storageConfig as config } from "./config.js";
export function findStorage(doc = document) {
  const root = doc.querySelector(config.selectors.root), scene = doc.defaultView?.SceneManager?._scene;
  if (!root || !scene || !Array.isArray(scene._creatures) || !config.methods.every(key => typeof scene[key] === "function") || scene._panel?.body !== root.querySelector(config.selectors.body)) return null;
  return {root,scene};
}
