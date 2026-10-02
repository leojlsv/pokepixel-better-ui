export const selectors = {
  root: '.hunt-window', body: '.pokeidle-panel__body',
  legacyToolbar: '.hunt-world-toolbar', listToolbar: '.hunt-list-toolbar',
  legacyHeader: '.hunt-world-header', listHeader: '.hunt-list-header',
  headerActions: '.hunt-world-header-actions', presentation: '.hunt-presentation-toggle',
  legacyTabs: '.hunt-world-tabs', listTabs: '.hunt-list-world-tabs',
  listSearchField: '.hunt-list-search-field', listSortField: '.hunt-list-sort-field',
  listRangeField: '.hunt-list-range-field', listClear: '.hunt-list-clear', listSummary: '.hunt-list-summary',
  listWorldNote: '.hunt-list-world-note',
  zoom: '.hunt-world-zoom', notice: '.hunt-world-notice',
  legacyElements: '.hunt-world-elements', listElements: '.hunt-list-element-filter',
  legacyCount: '.hunt-world-count', listCount: '.hunt-list-summary > strong',
  search: 'input[type="search"]',
  legacyViewport: '.hunt-world-viewport', legacyStage: '.hunt-world-stage',
  listViewport: '.hunt-list-table-shell', listStage: '.hunt-list-table',
  marker: '.hunt-map-marker[data-zone-index]', label: '.hunt-map-marker__name',
  listRow: '.hunt-list-row', listHunt: '.hunt-list-hunt-button', listDetails: '.hunt-list-details-button',
};

const activeHuntZoneByWindow = new WeakMap();

function cssImageUrl(value) {
  const match=String(value||'').match(/^url\((['"]?)(.*?)\1\)$/i);
  return match?.[2]||'';
}

function nativeMarkerSprite(marker,view) {
  const node=marker?.querySelector?.('.hunt-map-marker__sprite')||marker;
  if(!node)return '';
  const image=node.matches?.('img')?node:node.querySelector?.('img');
  if(image){
    const source=image.currentSrc||image.getAttribute('src')||image.getAttribute('data-src')||'';
    if(source)return source;
  }
  const canvas=node.matches?.('canvas')?node:node.querySelector?.('canvas');
  if(canvas){
    try {
      const context=canvas.getContext?.('2d',{willReadFrequently:true});
      if(!context)return '';
      const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
      let visible=false;
      for(let index=3;index<pixels.length;index+=4){if(pixels[index]!==0){visible=true;break;}}
      if(!visible)return '';
      const data=canvas.toDataURL?.('image/png');
      if(data?.startsWith('data:image/png;base64,'))return data;
    } catch {}
  }
  for(const candidate of [node,...(node.querySelectorAll?.('.pokemon-sprite')||[])]){
    const inline=cssImageUrl(candidate.style?.backgroundImage)||cssImageUrl(candidate.style?.content);
    if(inline)return inline;
    try {
      const computed=view?.getComputedStyle?.(candidate);
      const source=cssImageUrl(computed?.backgroundImage)||cssImageUrl(computed?.content);
      if(source)return source;
    } catch {}
  }
  return '';
}
const texts = {
  pt: ['Hunts (Map)', 'Encontrar hunts nos resultados dos filtros', 'Todos', 'Localizar no mapa', 'Reset', 'Nenhuma hunt corresponde aos filtros neste mundo.', 'Selecione uma hunt nos resultados.', 'Hunt localizada.', 'Não foi possível localizar esta hunt. Use o mapa nativo.', 'Filtros', 'Alvo', 'GYMS', 'Abrir Gyms de', 'Gyms indisponíveis', 'Filtros ativos', 'Nível mínimo', 'Nível máximo'],
  en: ['Hunts (Map)', 'Find hunts in filtered results', 'All', 'Locate on map', 'Reset', 'No hunts match the filters in this world.', 'Select a hunt from the results.', 'Hunt located.', 'Unable to locate this hunt. Use the native map.', 'Filters', 'Target', 'GYMS', 'Open Gyms for', 'Gyms unavailable', 'Filters active', 'Minimum level', 'Maximum level'],
  es: ['Hunts (Map)', 'Encontrar hunts en los resultados filtrados', 'Todos', 'Localizar en el mapa', 'Reset', 'Ninguna hunt coincide con los filtros en este mundo.', 'Selecciona una hunt en los resultados.', 'Hunt localizada.', 'No se pudo localizar esta hunt. Usa el mapa original.', 'Filtros', 'Objetivo', 'GYMS', 'Abrir Gyms de', 'Gyms no disponibles', 'Filtros activos', 'Nivel mínimo', 'Nivel máximo'],
  zh: ['Hunts (Map)', '在筛选结果中查找狩猎地点', '全部', '在地图上定位', '重置', '当前世界没有符合筛选条件的狩猎地点。', '请从结果中选择狩猎地点。', '已定位。', '无法定位，请使用原生地图。', '筛选', '目标', 'GYMS', '打开地区道馆', '道馆不可用', '筛选已启用', '最低等级', '最高等级'],
};
export function huntsText(doc = document) {
  const lang = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || 'pt';
  const [name, description, results, locate, reset, empty, choose, located, unavailable, filters, target, gyms, openGyms, gymsUnavailable, filtersActive, minLevel, maxLevel] = texts[lang.split(/[-_]/)[0]] || texts.en;
  return {name, description, results, locate, reset, empty, choose, located, unavailable, filters, target, gyms, openGyms, gymsUnavailable, filtersActive, minLevel, maxLevel};
}
export const findHunts = () => document.querySelector(selectors.root);
export function parts(root) {
  const legacyToolbar = root.querySelector(`${selectors.legacyToolbar}:not([data-ppbui-module])`);
  const currentToolbar = root.querySelector(`${selectors.listToolbar}:not([data-ppbui-module])`);
  const listViewport=root.querySelector(selectors.listViewport),mapViewport=root.querySelector(selectors.legacyViewport);
  const mode = legacyToolbar ? 'legacy-map' : currentToolbar ? (listViewport?'current-list':mapViewport?'current-map':'current') : null;
  const current=mode?.startsWith('current');
  const toolbar = legacyToolbar || currentToolbar;
  const levels=toolbar?.querySelectorAll('input[type="number"]')||[];
  const header=root.querySelector(current?selectors.listHeader:selectors.legacyHeader);
  const currentToggles=current&&header?[...header.children].filter(node=>node.matches?.(selectors.presentation)):[];
  const viewToggle=currentToggles.length>1?currentToggles[0]:null;
  const presentation=current?currentToggles[currentToggles.length>1?1:0]||null:root.querySelector(selectors.presentation);
  return {
    mode,
    current,
    body:root.querySelector(selectors.body),
    header,
    headerActions:root.querySelector(selectors.headerActions),
    viewToggle,
    presentation,
    tabs:root.querySelector(current?selectors.listTabs:selectors.legacyTabs),
    zoom:root.querySelector(selectors.zoom),
    notice:root.querySelector(selectors.notice),
    elements:root.querySelector(current?selectors.listElements:selectors.legacyElements),
    count:root.querySelector(current?selectors.listCount:selectors.legacyCount),
    toolbar,
    searchField:current?toolbar?.querySelector(selectors.listSearchField):null,
    sortField:current?toolbar?.querySelector(selectors.listSortField):null,
    rangeField:current?toolbar?.querySelector(selectors.listRangeField):null,
    clear:current?toolbar?.querySelector(selectors.listClear):null,
    summary:current?root.querySelector(selectors.listSummary):null,
    worldNote:current?root.querySelector(selectors.listWorldNote):null,
    search:toolbar?.querySelector(selectors.search),
    minLevel:levels[0]||null,
    maxLevel:levels[1]||null,
    viewport:mode==='current-list'?listViewport:mapViewport,
    stage:mode==='current-list'?root.querySelector(selectors.listStage):root.querySelector(selectors.legacyStage),
  };
}
export function huntScene(root) {
  const view = root.ownerDocument.defaultView, body = parts(root).body;
  const cached = view?.PokeIdle?.ReactiveWindows?.cached?.();
  return [...(Array.isArray(cached) ? cached : []), view?.SceneManager?._scene].find(scene => body && scene?._panel?.body === body);
}
export function rememberActiveHuntZone(root,index) {
  const view=root?.ownerDocument?.defaultView,scene=root?huntScene(root):null,zone=scene?._zones?.[index];
  if(!view||!zone)return null;
  const marker=zoneNode(root,index);
  let name='';
  try {name=String(scene?.zoneName?.(zone)??zone?.name??zone?.species_name??zone?.species?.name??'').trim();} catch {}
  const zoneId=zone?.id===undefined||zone?.id===null?'':String(zone.id).trim();
  let elements=[],levels=null;
  try {
    const source=scene?.zoneElements?.(zone)??zone?.elements;
    if(Array.isArray(source))elements=Object.freeze([...new Set(source.map(value=>String(value||'').trim().toLowerCase()).filter(Boolean))].slice(0,2));
  } catch {}
  try {levels=scene?.zoneMinMaxLevel?.(zone)||null;} catch {}
  const minLevel=Number.isFinite(levels?.min)?Math.max(0,Math.floor(levels.min)):null;
  const maxLevel=Number.isFinite(levels?.max)?Math.max(0,Math.floor(levels.max)):null;
  const snapshot=Object.freeze({
    zoneId,
    name,
    elements,
    minLevel,
    maxLevel,
    sprite:nativeMarkerSprite(marker,view),
    marker,
  });
  activeHuntZoneByWindow.set(view,snapshot);
  return snapshot;
}
export function activeHuntZone(view) {
  return view&&activeHuntZoneByWindow.get(view)||null;
}
export function forgetActiveHuntZone(view,expected=null) {
  if(!view)return;
  const current=activeHuntZoneByWindow.get(view);
  if(expected&&current!==expected)return;
  activeHuntZoneByWindow.delete(view);
}
export const results = root => [...root.querySelectorAll(selectors.marker)].filter(node => !node.hidden && !node.disabled && node.getAttribute('aria-hidden') !== 'true');
export const markers = root => [...root.querySelectorAll(selectors.marker)];
export const markerLabel = node => node.querySelector(selectors.label)?.textContent.trim() || node.getAttribute('aria-label') || '';
export function zoneNode(root,index) {
  const legacy=markers(root).find(node=>node.dataset.zoneIndex===String(index));
  if(legacy)return legacy;
  const details=[...root.querySelectorAll(selectors.listDetails)]
    .find(node=>node.getAttribute('aria-controls')===`hunt-list-details-${index}`);
  return details?.closest(selectors.listRow)||null;
}
