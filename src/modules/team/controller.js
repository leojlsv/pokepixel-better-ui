import { hpPercent, memberName, teamParts, teamScene, teamText } from "./dom.js";
import { createTeamPicker } from "./picker.js";
import { decorateElementIconList, releaseElementIconLists } from "../../core/element-icons.js";

const value = number => Number.isFinite(Number(number)) ? Number(number).toLocaleString() : "—";
function styleNode(doc) {
  const style = doc.createElement("style");
  style.dataset.ppbuiModule = "team";
  style.textContent = `
    .pokeidle-team-panel[data-ppbui-team-enhanced] { container-type:inline-size; min-width:min(340px,calc(100vw - 16px))!important; border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-1)!important; color:var(--ppbui-text); box-shadow:var(--ppbui-shadow-raised)!important; font:var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced]:not([data-ppbui-team-manual-height]) { width:min(480px,calc(100vw - 16px))!important; min-height:0!important; height:auto!important; max-height:calc(100vh - 16px)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] > .pokeidle-panel__body { display:block!important; overflow-y:auto!important; padding:var(--ppbui-space-2) var(--ppbui-space-4) var(--ppbui-space-4)!important; background:var(--ppbui-bg-0)!important; color:var(--ppbui-text)!important; font-family:var(--ppbui-font-body)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced]:not([data-ppbui-team-manual-height]) > .pokeidle-panel__body { flex:0 1 auto!important; max-height:calc(100vh - 56px); }
    .pokeidle-team-panel[data-ppbui-team-enhanced][data-ppbui-team-manual-height] > .pokeidle-panel__body { flex:1 1 auto!important; max-height:none; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .pokeidle-panel__titlebar { min-height:var(--ppbui-control-height); border:0!important; border-bottom:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-2)!important; color:var(--ppbui-text)!important; box-shadow:none!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .pokeidle-panel__title { color:var(--ppbui-text)!important; font:500 var(--ppbui-font-size-title)/var(--ppbui-line-height-tight) var(--ppbui-font-display)!important; letter-spacing:normal!important; text-shadow:none!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .pokeidle-panel__titlebar button { min-width:var(--ppbui-icon-button-size); min-height:var(--ppbui-icon-button-size); border:0!important; border-left:var(--ppbui-separator-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-2)!important; color:var(--ppbui-text-muted)!important; box-shadow:none!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .pokeidle-panel__titlebar button:hover:not(:disabled) { background:var(--ppbui-bg-3)!important; color:var(--ppbui-text)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .pokeidle-panel__titlebar button:active:not(:disabled) { background:var(--ppbui-bg-0)!important; box-shadow:none!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .pokeidle-panel__titlebar button:focus-visible { outline:var(--ppbui-border-width) solid var(--ppbui-focus); outline-offset:calc(-1 * var(--ppbui-border-width)); }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-section,
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-section :where(button,input,select,textarea) { border-radius:var(--ppbui-radius)!important; box-shadow:none!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-section--roster { margin:0; padding:0; overflow:hidden; border:0; border-bottom:var(--ppbui-border-width) solid var(--ppbui-border-strong); background:var(--ppbui-bg-1); }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-slots { display:grid!important; grid-template-columns:repeat(6,minmax(0,1fr)); align-items:stretch!important; gap:0!important; margin:0!important; padding:0!important; overflow:hidden!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-slot.ppbui-pokemon-card--roster { display:grid!important; width:100%!important; max-width:none!important; min-height:62px!important; height:62px!important; max-height:62px!important; place-items:center!important; overflow:visible!important; border:var(--ppbui-border-width) solid var(--ppbui-pokemon-card-border)!important; border-top-color:var(--ppbui-pokemon-card-top-border)!important; border-right-color:var(--ppbui-pokemon-card-right-border)!important; border-bottom:var(--ppbui-border-width) solid var(--ppbui-pokemon-card-bottom-border)!important; background:var(--ppbui-bg-2)!important; box-shadow:none!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-slot.ppbui-pokemon-card--roster + .team-slot.ppbui-pokemon-card--roster { border-left:0!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-slot::before,
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-slot::after { display:none!important; content:none!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-slot__sprite { position:static!important; filter:none!important; transform:none!important; transition:none!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-slot__xp-share { box-sizing:border-box; top:3px!important; right:3px!important; left:auto!important; display:grid!important; grid-template-columns:18px auto; column-gap:1px; width:auto!important; min-width:22px!important; height:22px!important; padding:1px!important; place-items:center!important; overflow:visible!important; border:var(--ppbui-separator-width) solid var(--ppbui-warning)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-0)!important; box-shadow:none!important; filter:none!important; opacity:1!important; visibility:visible!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-slot__xp-share.is-recipient { border-color:var(--ppbui-info)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-slot__xp-share img { display:block!important; width:18px!important; height:18px!important; max-width:18px!important; max-height:18px!important; object-fit:contain; image-rendering:pixelated; opacity:1!important; visibility:visible!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-slot__xp-share b { right:-2px!important; bottom:-2px!important; color:var(--ppbui-text)!important; font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data)!important; text-shadow:1px 1px 0 var(--ppbui-bg-0)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-slot__xp-share small { position:static!important; grid-column:2; box-sizing:border-box; width:auto!important; min-width:2.5ch!important; padding:0 1px!important; overflow:visible!important; border-radius:var(--ppbui-radius)!important; background:transparent!important; color:var(--ppbui-warning)!important; font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data)!important; font-variant-numeric:tabular-nums; text-align:right; white-space:nowrap; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-slot__empty { position:static!important; z-index:auto!important; margin:0!important; color:var(--ppbui-text-muted)!important; font:700 20px/1 var(--ppbui-font-body)!important; text-shadow:none!important; }
    .team-slot > [data-ppbui-team-slot] { display:none!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-section--profile { display:grid!important; grid-template-columns:minmax(0,1fr) max-content max-content; grid-template-rows:auto var(--ppbui-icon-button-size); align-items:center; gap:var(--ppbui-space-3) var(--ppbui-space-2); margin:0; padding:var(--ppbui-space-4); border:0; background:var(--ppbui-bg-1); }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-detail__hero { grid-column:1/-1; grid-row:1; display:grid!important; grid-template-columns:96px minmax(0,1fr); align-items:start!important; gap:var(--ppbui-space-3)!important; padding:0!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-section--profile > button.pokeidle-ui-button:not(.team-active-state) { grid-column:1; grid-row:2; justify-self:start; align-self:stretch; min-width:0; min-height:var(--ppbui-icon-button-size)!important; margin:0!important; white-space:nowrap; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-active-state { grid-column:2; grid-row:2; justify-self:end; align-self:stretch; min-width:0!important; min-height:var(--ppbui-icon-button-size)!important; margin:0!important; white-space:nowrap; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-order-controls { grid-column:3; grid-row:2; display:grid!important; grid-template-columns:minmax(32px,auto) var(--ppbui-icon-button-size) var(--ppbui-icon-button-size); align-items:stretch!important; justify-self:end; gap:var(--ppbui-space-1)!important; min-width:0; min-height:var(--ppbui-icon-button-size); margin:0!important; padding:0!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-order-label { display:grid; min-width:32px; min-height:var(--ppbui-icon-button-size); box-sizing:border-box; place-items:center; padding:0 var(--ppbui-space-1); border:var(--ppbui-separator-width) solid var(--ppbui-border); border-radius:var(--ppbui-radius); background:var(--ppbui-bg-2); color:var(--ppbui-text-muted); font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data); white-space:nowrap; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-order-button { width:var(--ppbui-icon-button-size)!important; min-width:var(--ppbui-icon-button-size)!important; margin:0!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-detail__portrait { display:grid!important; width:96px!important; height:96px!important; place-items:center; box-sizing:border-box; border:var(--ppbui-border-width) solid var(--element-color,var(--ppbui-border-strong))!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-0)!important; box-shadow:none!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-detail__portrait img,
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-detail__portrait canvas.team-pokemon-charset { width:88px!important; height:88px!important; max-width:100%; max-height:100%; object-fit:contain; image-rendering:pixelated; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-detail__info { display:grid!important; align-content:start; gap:var(--ppbui-space-2); min-width:0; flex:1; color:var(--ppbui-text); font:var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-detail__info h2 { margin:0!important; color:var(--ppbui-text)!important; font:700 var(--ppbui-font-size-title)/var(--ppbui-line-height-tight) var(--ppbui-font-body)!important; font-variant:normal!important; letter-spacing:.04em!important; text-shadow:none!important; text-transform:uppercase; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-detail__level { color:var(--ppbui-text-muted)!important; font:700 var(--ppbui-font-size-secondary)/var(--ppbui-line-height-tight) var(--ppbui-font-body)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-detail__tags { display:flex; flex-wrap:wrap; gap:var(--ppbui-space-2)!important; margin-top:0!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-tag { min-height:20px; padding:2px var(--ppbui-space-2)!important; border-radius:var(--ppbui-radius)!important; box-shadow:none!important; font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body)!important; text-shadow:none!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-meter { margin:0 0 var(--ppbui-space-2)!important; color:var(--ppbui-text-muted)!important; font:var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-meter:last-child { margin-bottom:0!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-meter__head { margin-bottom:var(--ppbui-space-1)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-meter__label { color:var(--ppbui-text-muted)!important; font:600 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-meter__value { color:var(--ppbui-text)!important; font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-data)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-meter__track { height:6px!important; overflow:hidden; border:var(--ppbui-separator-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-0)!important; box-shadow:none!important; }
    .team-equip-picker[data-ppbui-team-picker] { container-type:inline-size; box-sizing:border-box; border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-1)!important; color:var(--ppbui-text)!important; box-shadow:var(--ppbui-shadow-raised)!important; font:var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important; }
    .team-equip-picker[data-ppbui-team-picker] > .pokeidle-panel__titlebar { min-height:var(--ppbui-control-height); border:0!important; border-bottom:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-1)!important; color:var(--ppbui-text)!important; box-shadow:none!important; }
    .team-equip-picker[data-ppbui-team-picker] > .pokeidle-panel__titlebar .pokeidle-panel__title { font:500 var(--ppbui-font-size-title)/var(--ppbui-line-height-tight) var(--ppbui-font-display)!important; letter-spacing:normal!important; }
    .team-equip-picker[data-ppbui-team-picker] > .pokeidle-panel__titlebar button { min-width:var(--ppbui-icon-button-size); min-height:var(--ppbui-icon-button-size); border:0!important; border-left:var(--ppbui-separator-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-2)!important; color:var(--ppbui-text)!important; box-shadow:none!important; }
    .team-equip-picker[data-ppbui-team-picker] > .pokeidle-panel__body { box-sizing:border-box; padding:0!important; background:var(--ppbui-bg-0)!important; color:var(--ppbui-text)!important; font-family:var(--ppbui-font-body)!important; }
    .team-equip-picker[data-ppbui-team-picker] .team-equip-picker__intro { margin:0!important; padding:var(--ppbui-space-3) var(--ppbui-space-4)!important; border:0!important; background:var(--ppbui-bg-1)!important; color:var(--ppbui-text-muted)!important; font:var(--ppbui-font-size-secondary)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important; }
    .ppbui-team-picker-toolbar { display:grid; grid-template-columns:minmax(140px,1fr) minmax(104px,132px) minmax(104px,132px) auto; align-items:center; gap:var(--ppbui-space-2); margin:0; padding:var(--ppbui-space-3) var(--ppbui-space-4); border:0; border-top:var(--ppbui-separator-width) solid var(--ppbui-border); border-bottom:var(--ppbui-border-width) solid var(--ppbui-border-strong); background:var(--ppbui-bg-1); }
    .ppbui-team-picker-toolbar > input,
    .ppbui-team-picker-toolbar > select { min-width:0; width:100%!important; }
    .team-equip-picker[data-ppbui-team-picker] .ppbui-team-picker-toolbar > input.game-window__search.ppbui-input { -webkit-appearance:none!important; appearance:none!important; border-radius:var(--ppbui-radius)!important; background-image:none!important; clip-path:none!important; box-shadow:none!important; }
    .ppbui-team-picker-toolbar > button { min-width:max-content; width:auto; white-space:nowrap; }
    .team-equip-picker[data-ppbui-team-picker] .team-equip-picker__grid { gap:var(--ppbui-space-2)!important; box-sizing:border-box; margin:0!important; padding:var(--ppbui-space-4)!important; border:0!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-0)!important; box-shadow:none!important; }
    [data-ppbui-team-picker] .team-equip-card { -webkit-appearance:none!important; appearance:none!important; box-sizing:border-box; width:100%!important; min-width:0; margin:0!important; border:var(--ppbui-border-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-2)!important; background-image:none!important; color:var(--ppbui-text)!important; box-shadow:none!important; filter:none!important; font-family:var(--ppbui-font-body)!important; text-shadow:none!important; transform:none!important; transition:none!important; }
    [data-ppbui-team-picker] .team-equip-card:hover:not(:disabled) { border-color:var(--ppbui-border-strong)!important; background:var(--ppbui-bg-3)!important; }
    [data-ppbui-team-picker] .team-equip-card:active:not(:disabled) { background:var(--ppbui-bg-0)!important; }
    [data-ppbui-team-picker] .team-equip-card:focus-visible { outline:var(--ppbui-border-width) solid var(--ppbui-focus)!important; outline-offset:var(--ppbui-pixel-unit); }
    .team-equip-picker[data-ppbui-team-picker]::-webkit-scrollbar,
    .team-equip-picker[data-ppbui-team-picker] *::-webkit-scrollbar { width:var(--ppbui-scrollbar-size)!important; height:var(--ppbui-scrollbar-size)!important; }
    .team-equip-picker[data-ppbui-team-picker]::-webkit-scrollbar-track,
    .team-equip-picker[data-ppbui-team-picker] *::-webkit-scrollbar-track { border:var(--ppbui-separator-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-scrollbar-track)!important; box-shadow:none!important; }
    .team-equip-picker[data-ppbui-team-picker]::-webkit-scrollbar-thumb,
    .team-equip-picker[data-ppbui-team-picker] *::-webkit-scrollbar-thumb { border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-scrollbar-thumb)!important; background-clip:border-box!important; box-shadow:none!important; }
    .team-equip-picker[data-ppbui-team-picker]::-webkit-scrollbar-thumb:hover,
    .team-equip-picker[data-ppbui-team-picker] *::-webkit-scrollbar-thumb:hover { background:var(--ppbui-scrollbar-thumb-hover)!important; }
    .team-equip-picker[data-ppbui-team-picker]::-webkit-scrollbar-corner,
    .team-equip-picker[data-ppbui-team-picker] *::-webkit-scrollbar-corner { border-radius:var(--ppbui-radius)!important; background:var(--ppbui-scrollbar-track)!important; }
    .team-equip-picker[data-ppbui-team-picker]::-webkit-scrollbar-button,
    .team-equip-picker[data-ppbui-team-picker] *::-webkit-scrollbar-button { display:none!important; width:0!important; height:0!important; }
    .ppbui-team-picker-empty { margin:0; padding:var(--ppbui-space-4); color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-secondary); text-align:center; }
    .team-equip-card[data-ppbui-team-filtered] { display:none!important; }
    @container (max-width:519px) {
      .pokeidle-team-panel[data-ppbui-team-enhanced] .team-detail__hero { grid-template-columns:82px minmax(0,1fr); gap:var(--ppbui-space-3)!important; }
      .pokeidle-team-panel[data-ppbui-team-enhanced] .team-detail__portrait { width:82px!important; height:82px!important; }
      .pokeidle-team-panel[data-ppbui-team-enhanced] .team-detail__portrait img,
      .pokeidle-team-panel[data-ppbui-team-enhanced] .team-detail__portrait canvas.team-pokemon-charset { width:76px!important; height:76px!important; }
    }
    @container (max-width:439px) {
      .pokeidle-team-panel[data-ppbui-team-enhanced] .team-slots { grid-template-columns:repeat(3,minmax(0,1fr)); }
      .pokeidle-team-panel[data-ppbui-team-enhanced] .team-slot.ppbui-pokemon-card--roster { min-height:58px!important; height:58px!important; max-height:58px!important; }
      .pokeidle-team-panel[data-ppbui-team-enhanced] .team-slot.ppbui-pokemon-card--roster:nth-child(3n+1) { border-left:var(--ppbui-border-width) solid var(--ppbui-pokemon-card-border)!important; }
      .pokeidle-team-panel[data-ppbui-team-enhanced] .team-slot.ppbui-pokemon-card--roster:nth-child(n+4) { border-top:0!important; }
    }
    @container (max-width:419px) {
      .team-equip-picker[data-ppbui-team-picker] .ppbui-team-picker-toolbar { grid-template-columns:minmax(0,1fr) minmax(0,1fr); }
      .team-equip-picker[data-ppbui-team-picker] .ppbui-team-picker-toolbar > button { min-width:0; width:100%; justify-self:stretch; }
    }
    @media (pointer:coarse) {
      .pokeidle-team-panel[data-ppbui-team-enhanced] .pokeidle-panel__titlebar button { min-width:40px; min-height:40px; }
    }
  `;
  return style;
}

export function mountTeam(root) {
  const doc = root.ownerDocument, style = styleNode(doc);
  const hadRootClass = root.classList.contains("ppbui-root"), body = root.querySelector(".pokeidle-panel__body"), hadBodyScroll = body?.classList.contains("ppbui-scroll") || false;
  root.classList.add("ppbui-root"); body?.classList.add("ppbui-scroll"); root.append(style); root.dataset.ppbuiTeamEnhanced = "";
  let active = true, scene = null;
  const buttonLabels = new Map(), slotDescriptions = new Map(), ownedClasses = new Map();
  const picker = createTeamPicker(doc, () => scene);

  function useManualPanelHeight(event) {
    const handle = event.target?.closest?.(".pokeidle-resize-handle");
    if (!handle || !root.contains(handle) || root.hasAttribute("data-ppbui-team-manual-height")) return;
    const rect = root.getBoundingClientRect(), width = rect.width, height = rect.height;
    if (Number.isFinite(width) && width > 0) root.style.width = `${width}px`;
    if (Number.isFinite(height) && height > 0) root.style.height = `${height}px`;
    root.dataset.ppbuiTeamManualHeight = "";
  }
  root.addEventListener("pointerdown", useManualPanelHeight, true);

  function addOwnedClasses(node, ...classes) {
    if (!node) return;
    let owned = ownedClasses.get(node);
    if (!owned) { owned = new Set(); ownedClasses.set(node, owned); }
    for (const name of classes) if (!node.classList.contains(name)) { node.classList.add(name); owned.add(name); }
  }

  function decorateControls(parts) {
    addOwnedClasses(parts.orderControls, "ppbui-action-row");
    for (const button of parts.orderControls?.querySelectorAll("button") || []) addOwnedClasses(button, "ppbui-button", "ppbui-icon-button");
    addOwnedClasses(parts.active, "pokeidle-btn", "ppbui-button");
    if (parts.active) {
      const isCurrent = parts.active.classList.contains("is-active"), owned = ownedClasses.get(parts.active);
      if (!isCurrent) addOwnedClasses(parts.active, "ppbui-button--primary");
      else if (owned?.has("ppbui-button--primary") && parts.active.classList.contains("ppbui-button--primary")) parts.active.classList.remove("ppbui-button--primary");
    }
    addOwnedClasses(parts.actions, "ppbui-action-row");
    for (const button of parts.actions?.querySelectorAll("button") || []) {
      addOwnedClasses(button, "ppbui-button");
      if (button.classList.contains("pokeidle-btn--danger")) addOwnedClasses(button, "ppbui-button--danger");
    }
  }

  function restoreButtonLabel(button, record) {
    if (button.textContent === record.label) button.textContent = record.text;
    for (const [attribute, original] of [["title", record.title], ["aria-description", record.description]]) {
      if (button.getAttribute(attribute) === record.text) {
        if (original === null) button.removeAttribute(attribute); else button.setAttribute(attribute, original);
      }
    }
    buttonLabels.delete(button);
  }

  function compactButtonLabels(parts, text) {
    const position = scene._team?.member_ids?.findIndex(id => String(id) === String(scene._selectedId)) ?? -1;
    const labels = new Map([
      [parts.orderLabel, position >= 0 ? `#${position + 1}` : null],
      [parts.active, parts.active?.classList.contains("is-active") ? text.active : text.activate],
      [parts.remove, text.removeCompact],
    ]);
    for (const [button, record] of buttonLabels) {
      if (!button.isConnected) buttonLabels.delete(button);
      else if (!labels.get(button)) restoreButtonLabel(button, record);
    }
    for (const [button, label] of labels) {
      if (!button || !label) continue;
      let record = buttonLabels.get(button);
      if (!record) {
        record = { text: button.textContent, title: button.getAttribute("title"), description: button.getAttribute("aria-description") };
        buttonLabels.set(button, record);
      } else if (button.textContent !== record.label || button.disabled !== record.disabled) record.text = button.textContent;
      record.disabled = button.disabled; record.label = label;
      if (button.textContent !== label) button.textContent = label;
      if (button.title !== record.text) button.title = record.text;
      if (button.getAttribute("aria-description") !== record.text) button.setAttribute("aria-description", record.text);
    }
  }

  function decorateSlots(parts, scene, text) {
    const order = Array.isArray(scene._team?.member_ids) ? scene._team.member_ids.map(String) : [];
    const activeId = String(scene._team?.leader_id ?? ""), selectedId = String(scene._selectedId ?? "");
    parts.slotNodes.forEach((slot, index) => {
      if (!slot.classList.contains("ppbui-pokemon-card")) slot.classList.add("ppbui-pokemon-card");
      if (!slot.classList.contains("ppbui-pokemon-card--roster")) slot.classList.add("ppbui-pokemon-card--roster");
      addOwnedClasses(slot.querySelector(".team-slot__sprite"), "ppbui-pokemon-card__visual");
      const member = scene._creatures[index], old = slot.querySelector("[data-ppbui-team-slot]");
      let sharedStone = slot.querySelector(".team-slot__xp-share");
      if (!sharedStone && member && typeof scene.xpShareBadge === "function") {
        const nativeBadge = scene.xpShareBadge(member);
        if (nativeBadge?.nodeType === 1 && nativeBadge.classList?.contains("team-slot__xp-share")) {
          nativeBadge.dataset.ppbuiTeamSharedStoneFallback = "";
          slot.append(nativeBadge);
          sharedStone = nativeBadge;
        }
      }
      let position = slot.querySelector("[data-ppbui-team-position]");
      if (!position) { position = doc.createElement("span"); position.dataset.ppbuiTeamPosition = ""; slot.append(position); }
      if (!position.classList.contains("ppbui-pokemon-card__position")) position.classList.add("ppbui-pokemon-card__position");
      const memberId = String(member?.id ?? ""), officialIndex = memberId ? order.indexOf(memberId) : -1;
      const positionText = String((officialIndex >= 0 ? officialIndex : index) + 1);
      if (position.textContent !== positionText) position.textContent = positionText;
      const isSelected = Boolean(memberId && memberId === selectedId), isActive = Boolean(memberId && memberId === activeId);
      if (slot.classList.contains("ppbui-team-selected") !== isSelected) slot.classList.toggle("ppbui-team-selected", isSelected);
      if (slot.classList.contains("ppbui-team-active") !== isActive) slot.classList.toggle("ppbui-team-active", isActive);
      if (slot.classList.contains("ppbui-pokemon-card--selected") !== isSelected) slot.classList.toggle("ppbui-pokemon-card--selected", isSelected);
      if (slot.classList.contains("ppbui-pokemon-card--active") !== isActive) slot.classList.toggle("ppbui-pokemon-card--active", isActive);
      slot.querySelector("[data-ppbui-team-selected-marker]")?.remove();
      slot.querySelector("[data-ppbui-team-active]")?.remove();
      if (!member) {
        old?.remove(); slot.querySelector("[data-ppbui-team-meter]")?.remove();
        const record = slotDescriptions.get(slot);
        if (record) {
          if (slot.getAttribute("aria-description") === record.owned) record.native === null ? slot.removeAttribute("aria-description") : slot.setAttribute("aria-description", record.native);
          slotDescriptions.delete(slot);
        }
        if (slot.classList.contains("ppbui-team-fainted")) slot.classList.remove("ppbui-team-fainted");
        if (slot.classList.contains("ppbui-pokemon-card--fainted")) slot.classList.remove("ppbui-pokemon-card--fainted");
        return;
      }
      const hp = hpPercent(member), label = `${memberName(doc, member)} · Lv. ${value(member.level)} · ${hp}% HP`;
      const meta = old || doc.createElement("span");
      if (!old) meta.dataset.ppbuiTeamSlot = "";
      if (!meta.classList.contains("ppbui-pokemon-card__meta")) meta.classList.add("ppbui-pokemon-card__meta");
      let level = meta.querySelector("[data-ppbui-team-level]"), hpLabel = meta.querySelector("[data-ppbui-team-hp]");
      if (!level || !hpLabel) {
        level = doc.createElement("span"); level.dataset.ppbuiTeamLevel = "";
        hpLabel = doc.createElement("span"); hpLabel.dataset.ppbuiTeamHp = "";
        meta.replaceChildren(level, hpLabel);
      }
      const levelText = `Lv.${value(member.level)}`, hpText = `${hp}%`, fainted = Number(member.hp || 0) <= 0;
      if (level.textContent !== levelText) level.textContent = levelText;
      if (hpLabel.textContent !== hpText) hpLabel.textContent = hpText;
      if (!old) slot.append(meta);
      slot.querySelector("[data-ppbui-team-meter]")?.remove();
      let record = slotDescriptions.get(slot);
      const currentDescription = slot.getAttribute("aria-description");
      if (!record) { record = { native: currentDescription, owned: null }; slotDescriptions.set(slot, record); }
      else if (currentDescription !== record.owned) record.native = currentDescription;
      const description = [label, isActive ? text.active : "", fainted ? text.fainted : ""].filter(Boolean).join(" · ");
      if (currentDescription !== description) slot.setAttribute("aria-description", description);
      record.owned = description;
      if (slot.classList.contains("ppbui-team-fainted") !== fainted) slot.classList.toggle("ppbui-team-fainted", fainted);
      if (slot.classList.contains("ppbui-pokemon-card--fainted") !== fainted) slot.classList.toggle("ppbui-pokemon-card--fainted", fainted);
    });
  }

  function sync() {
    if (!active) return;
    const parts = teamParts(root), text = teamText(doc); scene = teamScene(root);
    if (!parts.body || !parts.profile || !scene) return;
    decorateControls(parts); compactButtonLabels(parts, text);
    decorateSlots(parts, scene, text);
    const selected = scene._creatures?.find(member => String(member?.id ?? "") === String(scene._selectedId ?? ""));
    const selectedElements = (selected?.elements || selected?.species?.elements || []).map(element => String(element).toLowerCase());
    decorateElementIconList(parts.profile.querySelector(".team-detail__tags .pokeidle-element-icons"), selectedElements, doc.defaultView?.PokeIdle?.ElementIcons, { scope: root });
    addOwnedClasses(parts.profile.querySelector(".team-quality"), "ppbui-quality-badge");
    picker.sync(text);
  }

  sync();
  return { sync, cleanup() {
    active = false;
    root.removeEventListener("pointerdown", useManualPanelHeight, true);
    root.removeAttribute("data-ppbui-team-manual-height");
    root.querySelectorAll("[data-ppbui-team-slot], [data-ppbui-team-meter], [data-ppbui-team-position], [data-ppbui-team-active], [data-ppbui-team-selected-marker], [data-ppbui-team-shared-stone-fallback], [data-ppbui-team-profile-facts]").forEach(node => node.remove());
    root.querySelectorAll(".team-slot").forEach(node => node.classList.remove("ppbui-team-fainted", "ppbui-team-selected", "ppbui-team-active", "ppbui-pokemon-card", "ppbui-pokemon-card--roster", "ppbui-pokemon-card--selected", "ppbui-pokemon-card--active", "ppbui-pokemon-card--fainted"));
    for (const [slot, record] of slotDescriptions) if (slot.isConnected && root.contains(slot) && slot.getAttribute("aria-description") === record.owned) record.native === null ? slot.removeAttribute("aria-description") : slot.setAttribute("aria-description", record.native);
    slotDescriptions.clear();
    for (const [button, record] of buttonLabels) restoreButtonLabel(button, record);
    for (const [node, classes] of ownedClasses) for (const name of classes) node.classList.remove(name);
    ownedClasses.clear();
    picker.cleanup(); releaseElementIconLists(root); root.removeAttribute("data-ppbui-team-enhanced"); if(!hadRootClass)root.classList.remove("ppbui-root"); if(body&&!hadBodyScroll)body.classList.remove("ppbui-scroll"); style.remove();
  } };
}
