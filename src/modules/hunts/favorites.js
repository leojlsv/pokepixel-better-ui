export const HUNT_FAVORITES_STORAGE_KEY = 'ppbui:hunts-favorites:v1';

const cleanText=(value,max=96)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const cleanId=(value,max=96)=>String(value??'').trim().slice(0,max);

export function huntFavoriteKey(favorite) {
  const world=cleanId(favorite?.worldId||favorite?.regionKey,48),zone=cleanId(favorite?.zoneId,96);
  return world&&zone?JSON.stringify([world,zone]):'';
}

export function normalizeHuntFavorite(value) {
  if(!value||typeof value!=='object')return null;
  const favorite={
    worldId:cleanId(value.worldId,48),
    regionKey:cleanId(value.regionKey,48),
    worldLabel:cleanText(value.worldLabel,48),
    zoneId:cleanId(value.zoneId,96),
    label:cleanText(value.label,96),
  };
  if(!favorite.zoneId||(!favorite.worldId&&!favorite.regionKey)||!favorite.label)return null;
  return Object.freeze(favorite);
}

export function createHuntFavoritesStore({storage=()=>globalThis.localStorage}={}) {
  let loaded=false,persistent=true,protectedPersistent=false,items=[],revision=0;
  const listeners=new Set();
  const notify=()=>{revision++;for(const listener of listeners)listener();};
  const load=()=>{
    if(loaded)return;
    loaded=true;
    try {
      const target=storage();if(!target||typeof target.getItem!=='function')throw new Error('storage unavailable');
      const raw=target.getItem(HUNT_FAVORITES_STORAGE_KEY);
      if(!raw)return;
      const parsed=JSON.parse(raw);
      if(parsed?.version!==undefined&&parsed.version!==1){persistent=false;protectedPersistent=true;items=[];return;}
      const source=parsed?.version===1&&Array.isArray(parsed.items)?parsed.items:[];
      const seen=new Set();
      items=source.map(normalizeHuntFavorite).filter(Boolean).filter(favorite=>{
        const key=huntFavoriteKey(favorite);if(!key||seen.has(key))return false;seen.add(key);return true;
      });
    } catch {persistent=false;items=[];}
  };
  const persist=()=>{
    if(protectedPersistent){persistent=false;return;}
    try {const target=storage();if(!target||typeof target.setItem!=='function')throw new Error('storage unavailable');target.setItem(HUNT_FAVORITES_STORAGE_KEY,JSON.stringify({version:1,items}));persistent=true;}
    catch {persistent=false;}
  };
  const replace=next=>{
    items=next;persist();notify();
  };
  return {
    key:HUNT_FAVORITES_STORAGE_KEY,
    revision:()=>{load();return revision;},
    persistent:()=>{load();return persistent;},
    list(){load();return items.slice();},
    get(key){load();return items.find(item=>huntFavoriteKey(item)===key)||null;},
    has(favorite){load();const key=typeof favorite==='string'?favorite:huntFavoriteKey(favorite);return Boolean(key&&items.some(item=>huntFavoriteKey(item)===key));},
    add(value){
      load();const favorite=normalizeHuntFavorite(value),key=huntFavoriteKey(favorite);if(!favorite||!key)return false;
      const existing=items.findIndex(item=>huntFavoriteKey(item)===key);
      if(existing>=0){
        const current=items[existing];
        if(JSON.stringify(current)===JSON.stringify(favorite))return false;
        const next=items.slice();next[existing]=favorite;replace(next);return true;
      }
      replace([...items,favorite]);return true;
    },
    remove(value){
      load();const key=typeof value==='string'?value:huntFavoriteKey(value);if(!key)return false;
      const next=items.filter(item=>huntFavoriteKey(item)!==key);if(next.length===items.length)return false;replace(next);return true;
    },
    toggle(value){
      const favorite=normalizeHuntFavorite(value),key=huntFavoriteKey(favorite);if(!favorite||!key)return false;
      if(this.has(key)){this.remove(key);return false;}
      this.add(favorite);return true;
    },
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  };
}
