import {findHunts, parts} from './dom.js';
import {mountHunts} from './controller.js';
import {createHuntFavoritesStore} from './favorites.js';
import {nativeMenuAvailableInCardMode} from '../card-mode/native-menu-contracts.js';
export function createHuntsModule() {
  let root, mounted;
  const favoritesStore=createHuntFavoritesStore({storage:()=>root?.ownerDocument?.defaultView?.localStorage});
  return {
    id:'hunts',
    runsInCardMode:true,
    shouldMount() {
      const inCards=document.documentElement?.getAttribute('data-ppbui-card-mode')==='cards';
      root=inCards
        ?[...document.querySelectorAll('.hunt-window')].find(node=>nativeMenuAvailableInCardMode(node,'hunts'))||null
        :findHunts();
      return Boolean(root && parts(root).toolbar && parts(root).viewport);
    },
    getMountKey:()=>root,
    mount() { mounted=mountHunts(root,{favoritesStore}); return ()=>{mounted.cleanup();mounted=null;}; },
    reconcile:()=>mounted?.sync(),
  };
}
