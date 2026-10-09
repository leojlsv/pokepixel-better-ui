import {findHunts, parts} from './dom.js';
import {mountHunts} from './controller.js';
import {createHuntFavoritesStore} from './favorites.js';
export function createHuntsModule() {
  let root, mounted;
  const favoritesStore=createHuntFavoritesStore({storage:()=>root?.ownerDocument?.defaultView?.localStorage});
  return {
    id:'hunts',
    shouldMount() { root=findHunts(); return Boolean(root && parts(root).toolbar && parts(root).viewport); },
    getMountKey:()=>root,
    mount() { mounted=mountHunts(root,{favoritesStore}); return ()=>{mounted.cleanup();mounted=null;}; },
    reconcile:()=>mounted?.sync(),
  };
}
