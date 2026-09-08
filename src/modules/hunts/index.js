import {findHunts, parts} from './dom.js';
import {mountHunts} from './controller.js';
export function createHuntsModule() {
  let root, mounted;
  return {
    id:'hunts',
    shouldMount() { root=findHunts(); return Boolean(root && parts(root).toolbar && parts(root).viewport); },
    getMountKey:()=>root,
    mount() { mounted=mountHunts(root); return ()=>{mounted.cleanup();mounted=null;}; },
    reconcile:()=>mounted?.sync(),
  };
}
