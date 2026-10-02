import { parts, huntScene, results } from './dom.js';

const GYM_REGIONS = new Set(['kanto','johto']);

function normalizeRegionContext(value) {
  return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
}

function normalizeRegion(value) {
  const text=normalizeRegionContext(value);
  for(const region of GYM_REGIONS)if(text===region||text.includes(region))return region;
  return '';
}

export function huntRegion(root) {
  if(!root)return '';
  const scene=huntScene(root),view=parts(root),world=scene?._tab;
  let config=null;
  try {config=scene?.tabConfig?.(world)||scene?._worlds?.find?.(entry=>entry?.id===world)||null;} catch {}
  for(const value of [world,config?.id,config?.label,config?.name]){
    const region=normalizeRegion(value);if(region)return region;
  }
  const hasAuthoritativeWorld=world!==undefined&&world!==null&&String(world).trim()!=='';
  if(hasAuthoritativeWorld||config){
    return [config?.label,config?.name,config?.id,world].map(normalizeRegionContext).find(Boolean)||'';
  }
  const active=view.tabs?.querySelector?.('.is-active,[aria-current="page"],[aria-selected="true"]')||
    (view.tabs?.children?.length===1?view.tabs.firstElementChild:null);
  const activeValues=[active?.dataset?.region,active?.dataset?.world,active?.textContent];
  for(const value of activeValues){
    const region=normalizeRegion(value);if(region)return region;
  }
  return activeValues.map(normalizeRegionContext).find(Boolean)||'';
}

export function canOpenGymRegion(root,region=huntRegion(root)) {
  const win=root?.ownerDocument?.defaultView;
  const manager=win?.SceneManager;
  return GYM_REGIONS.has(region)&&typeof win?.Scene_Gym==='function'&&
    typeof manager?.push==='function'&&manager._nextScene==null;
}

export function openGymRegion(root,region=huntRegion(root)) {
  if(!canOpenGymRegion(root,region))return false;
  const win=root.ownerDocument.defaultView,manager=win.SceneManager,Gym=win.Scene_Gym;
  const current=manager._scene,previousNext=manager._nextScene;
  const stack=Array.isArray(manager._stack)?manager._stack:null,stackLength=stack?.length;
  try {
    manager.push(Gym);
    const next=manager._nextScene;
    // RPG Maker creates _nextScene synchronously in SceneManager.push(); the
    // native Gym scene reads _region during create/load before it becomes current.
    if(!next||next.constructor!==Gym)return false;
    next._region=region;
    return next._region===region;
  } catch {
    // Native SceneManager.push() appends the current constructor before goto(); if
    // Scene_Gym construction throws, goto() has not stopped the current scene yet.
    if(manager._nextScene===previousNext&&stack&&stack.length===stackLength+1&&stack[stackLength]===current?.constructor){
      stack.length=stackLength;
    }
    return false;
  }
}

function locateContext(root, marker) {
  const scene = huntScene(root), {viewport, stage} = parts(root);
  const state = scene?._worldMapState, layout = scene?._worldLayouts?.[scene?._tab];
  const zone = scene?._zones?.[Number(marker?.dataset.zoneIndex)];
  if (!viewport || !stage || !results(root).includes(marker) || !stage.contains(marker) || !state || !layout || !zone ||
      typeof scene.zoneWorld !== 'function' || scene.zoneWorld(zone) !== scene._tab ||
      typeof scene.canEnterWorld !== 'function' || !scene.canEnterWorld(scene._tab) ||
      !['saveWorldMapState','setupWorldMapNavigation','_navigationCleanup'].every(key => typeof scene[key] === 'function')) return null;
  const x = parseFloat(marker.style.left), y = parseFloat(marker.style.top);
  if (!marker.style.left.endsWith('%') || !marker.style.top.endsWith('%') ||
      ![state.scale, layout.width, layout.height, viewport.clientWidth, viewport.clientHeight].every(n => Number.isFinite(n) && n > 0) ||
      ![x,y].every(n => Number.isFinite(n) && n >= 0 && n <= 100)) return null;
  return {scene,viewport,stage,state,layout,x,y};
}
export function canLocateHunt(root, marker) {
  return Boolean(locateContext(root,marker));
}
export function locateHunt(root, marker) {
  const context=locateContext(root,marker);
  if(!context)return false;
  const {scene,viewport,stage,state,layout,x,y}=context;
  const center = (point, size, space) => size <= space ? (space-size)/2 : Math.max(space-size, Math.min(0, space/2-point*size/100));
  // Native pan keeps a separate animation target. Rebind native navigation from its saved UI state
  // so later wheel/drag events cannot snap back. No marker click or hunt action is invoked.
  scene._navigationCleanup();
  state.x = center(x, layout.width*state.scale, viewport.clientWidth);
  state.y = center(y, layout.height*state.scale, viewport.clientHeight);
  try { scene.saveWorldMapState(); }
  finally { scene.setupWorldMapNavigation(viewport, stage, layout); }
  return true;
}
