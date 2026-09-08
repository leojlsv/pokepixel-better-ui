import { parts, huntScene, results } from './dom.js';

export function locateHunt(root, marker) {
  const scene = huntScene(root), {viewport, stage} = parts(root);
  const state = scene?._worldMapState, layout = scene?._worldLayouts?.[scene?._tab];
  const zone = scene?._zones?.[Number(marker?.dataset.zoneIndex)];
  if (!viewport || !stage || !results(root).includes(marker) || !stage.contains(marker) || !state || !layout || !zone ||
      typeof scene.zoneWorld !== 'function' || scene.zoneWorld(zone) !== scene._tab ||
      typeof scene.canEnterWorld !== 'function' || !scene.canEnterWorld(scene._tab) ||
      !['saveWorldMapState','setupWorldMapNavigation','_navigationCleanup'].every(key => typeof scene[key] === 'function')) return false;
  const x = parseFloat(marker.style.left), y = parseFloat(marker.style.top);
  if (!marker.style.left.endsWith('%') || !marker.style.top.endsWith('%') ||
      ![state.scale, layout.width, layout.height, viewport.clientWidth, viewport.clientHeight].every(n => Number.isFinite(n) && n > 0) ||
      ![x,y].every(n => Number.isFinite(n) && n >= 0 && n <= 100)) return false;
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
