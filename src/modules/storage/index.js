import { findStorage } from "./dom.js";
import { mountStorage } from "./controller.js";
import { nativeMenuAvailableInCardMode } from "../card-mode/native-menu-contracts.js";
export { storageText } from "./config.js";
export function createStorageModule() {
  let target;
  return {id:"storage", runsInCardMode:true, shouldMount() {
    const inCards=document.documentElement?.getAttribute("data-ppbui-card-mode")==="cards";
    const next=findStorage(document,inCards);
    if (!next || !target || next.root!==target.root || next.scene!==target.scene) target=next;
    return !!target && (!inCards || nativeMenuAvailableInCardMode(target.root,"storage"));
  }, getMountKey:()=>target, mount:()=>mountStorage(target).cleanup};
}
