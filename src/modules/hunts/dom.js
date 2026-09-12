export const selectors = {
  root: '.hunt-window', body: '.pokeidle-panel__body', toolbar: '.hunt-world-toolbar',
  header: '.hunt-world-header', headerActions: '.hunt-world-header-actions', presentation: '.hunt-presentation-toggle',
  tabs: '.hunt-world-tabs', zoom: '.hunt-world-zoom', notice: '.hunt-world-notice',
  elements: '.hunt-world-elements', count: '.hunt-world-count',
  search: 'input[type="search"]', viewport: '.hunt-world-viewport', stage: '.hunt-world-stage',
  marker: '.hunt-map-marker[data-zone-index]', label: '.hunt-map-marker__name',
};
const texts = {
  pt: ['Hunts (Map)', 'Encontrar hunts nos resultados dos filtros', 'Todos', 'Localizar no mapa', 'Reset', 'Nenhuma hunt corresponde aos filtros neste mundo.', 'Selecione uma hunt nos resultados.', 'Hunt localizada.', 'Não foi possível localizar esta hunt. Use o mapa nativo.'],
  en: ['Hunts (Map)', 'Find hunts in filtered results', 'All', 'Locate on map', 'Reset', 'No hunts match the filters in this world.', 'Select a hunt from the results.', 'Hunt located.', 'Unable to locate this hunt. Use the native map.'],
  es: ['Hunts (Map)', 'Encontrar hunts en los resultados filtrados', 'Todos', 'Localizar en el mapa', 'Reset', 'Ninguna hunt coincide con los filtros en este mundo.', 'Selecciona una hunt en los resultados.', 'Hunt localizada.', 'No se pudo localizar esta hunt. Usa el mapa original.'],
  zh: ['Hunts (Map)', '在筛选结果中查找狩猎地点', '全部', '在地图上定位', '重置', '当前世界没有符合筛选条件的狩猎地点。', '请从结果中选择狩猎地点。', '已定位。', '无法定位，请使用原生地图。'],
};
export function huntsText(doc = document) {
  const lang = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || 'pt';
  const [name, description, results, locate, reset, empty, choose, located, unavailable] = texts[lang.split(/[-_]/)[0]] || texts.en;
  return {name, description, results, locate, reset, empty, choose, located, unavailable};
}
export const findHunts = () => document.querySelector(selectors.root);
export function parts(root) {
  const toolbar = root.querySelector(`${selectors.toolbar}:not([data-ppbui-module])`);
  const levels=toolbar?.querySelectorAll('input[type="number"]')||[];
  return {
    body:root.querySelector(selectors.body),
    header:root.querySelector(selectors.header),
    headerActions:root.querySelector(selectors.headerActions),
    presentation:root.querySelector(selectors.presentation),
    tabs:root.querySelector(selectors.tabs),
    zoom:root.querySelector(selectors.zoom),
    notice:root.querySelector(selectors.notice),
    elements:root.querySelector(selectors.elements),
    count:root.querySelector(selectors.count),
    toolbar,
    search:toolbar?.querySelector(selectors.search),
    minLevel:levels[0]||null,
    maxLevel:levels[1]||null,
    viewport:root.querySelector(selectors.viewport),
    stage:root.querySelector(selectors.stage),
  };
}
export function huntScene(root) {
  const view = root.ownerDocument.defaultView, body = parts(root).body;
  const cached = view?.PokeIdle?.ReactiveWindows?.cached?.();
  return [...(Array.isArray(cached) ? cached : []), view?.SceneManager?._scene].find(scene => body && scene?._panel?.body === body);
}
export const results = root => [...root.querySelectorAll(selectors.marker)].filter(node => !node.hidden && !node.disabled && node.getAttribute('aria-hidden') !== 'true');
export const markers = root => [...root.querySelectorAll(selectors.marker)];
export const markerLabel = node => node.querySelector(selectors.label)?.textContent.trim() || node.getAttribute('aria-label') || '';
