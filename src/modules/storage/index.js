import { findStorage } from "./dom.js";
import { mountStorage } from "./controller.js";
export { storageText } from "./config.js";
export function createStorageModule() {
  let target;
  return {id:"storage", shouldMount() { const next=findStorage(); if (!next || !target || next.root!==target.root || next.scene!==target.scene) target=next; return !!target; }, getMountKey:()=>target, mount:()=>mountStorage(target).cleanup};
}
