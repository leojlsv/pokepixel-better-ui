import { hpPercent, memberName, teamParts, teamScene, teamText } from "./dom.js";
import { createTeamPicker } from "./picker.js";
import { decorateElementIconList, releaseElementIconLists } from "../../core/element-icons.js";

const value = number => Number.isFinite(Number(number)) ? Number(number).toLocaleString() : "—";
let statsDisclosureSequence = 0;
function styleNode(doc) {
  const style = doc.createElement("style");
  style.dataset.ppbuiModule = "team";
  style.textContent = `
    .pokeidle-team-panel[data-ppbui-team-enhanced] { container-type:inline-size; min-width:min(340px,calc(100vw - 16px))!important; border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-window-radius)!important; background:var(--ppbui-bg-1)!important; color:var(--ppbui-text); box-shadow:var(--ppbui-shadow-raised)!important; font:var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced]:not([data-ppbui-team-manual-height]) { width:min(480px,calc(100vw - 16px))!important; min-height:0!important; height:auto!important; max-height:calc(100vh - 16px)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] > .pokeidle-panel__body { display:grid!important; grid-template-columns:minmax(0,1fr) max-content; grid-auto-rows:max-content; align-content:start; align-items:stretch; column-gap:var(--ppbui-space-2); row-gap:0; min-height:0!important; overflow-y:auto!important; padding:var(--ppbui-space-2) var(--ppbui-space-4) var(--ppbui-space-4)!important; background:var(--ppbui-bg-0)!important; color:var(--ppbui-text)!important; font-family:var(--ppbui-font-body)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] > .pokeidle-panel__body > * { grid-column:1/-1; min-width:0; order:9; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] > .pokeidle-panel__body > .team-section--roster { order:0; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] > .pokeidle-panel__body > .team-section--profile { order:1; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] > .pokeidle-panel__body > .team-section--vitals { order:4; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] > .pokeidle-panel__body > .team-section--attributes { order:5; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] > .pokeidle-panel__body > [data-ppbui-team-preset-manager] { order:6; }
    .pokeidle-team-panel[data-ppbui-team-enhanced]:not([data-ppbui-team-manual-height]) > .pokeidle-panel__body { flex:0 1 auto!important; max-height:calc(100vh - 56px); }
    .pokeidle-team-panel[data-ppbui-team-enhanced][data-ppbui-team-manual-height] > .pokeidle-panel__body { flex:1 1 auto!important; max-height:none; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .pokeidle-panel__titlebar { min-height:var(--ppbui-control-height); border:0!important; border-bottom:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-2)!important; color:var(--ppbui-text)!important; box-shadow:none!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .pokeidle-panel__title { color:var(--ppbui-text)!important; font:500 var(--ppbui-font-size-title)/var(--ppbui-line-height-tight) var(--ppbui-font-display)!important; letter-spacing:normal!important; text-shadow:none!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .pokeidle-panel__titlebar button { min-width:var(--ppbui-icon-button-size); min-height:var(--ppbui-icon-button-size); border:0!important; border-left:var(--ppbui-separator-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-2)!important; color:var(--ppbui-text-muted)!important; box-shadow:none!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .pokeidle-panel__titlebar button:hover:not(:disabled) { background:var(--ppbui-bg-3)!important; color:var(--ppbui-text)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .pokeidle-panel__titlebar button:active:not(:disabled) { background:var(--ppbui-bg-0)!important; box-shadow:none!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .pokeidle-panel__titlebar button:focus-visible { outline:var(--ppbui-focus-width) solid var(--ppbui-focus); outline-offset:calc(-1 * var(--ppbui-border-width)); }
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
    .pokeidle-team-panel[data-ppbui-team-enhanced] > .pokeidle-panel__body > [data-ppbui-team-stats-toggle] { grid-column:1; order:2; display:flex; align-items:center; gap:var(--ppbui-space-1); box-sizing:border-box; width:100%; min-width:0; min-height:var(--ppbui-control-height); margin:var(--ppbui-space-2) 0 0; padding:var(--ppbui-space-2) var(--ppbui-space-2); border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius); background:var(--ppbui-bg-2)!important; color:var(--ppbui-text)!important; font:700 var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body); cursor:pointer; text-align:left; white-space:normal; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] [data-ppbui-team-stats-toggle]::before { display:grid; place-items:center; flex:0 0 20px; box-sizing:border-box; width:20px; height:20px; border:var(--ppbui-border-width) solid var(--ppbui-border-strong); border-radius:var(--ppbui-radius); background:var(--ppbui-bg-0); color:var(--ppbui-text); font:700 18px/1 var(--ppbui-font-body); content:"+"; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] [data-ppbui-team-stats-toggle][aria-expanded="true"]::before { content:"−"; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] [data-ppbui-team-stats-toggle]:hover:not(:disabled) { background:color-mix(in srgb,var(--ppbui-bg-2) 75%,var(--ppbui-info) 25%)!important; border-color:var(--ppbui-info)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] [data-ppbui-team-stats-toggle]:active:not(:disabled) { background:var(--ppbui-bg-0)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] [data-ppbui-team-stats-toggle]:focus-visible { outline:var(--ppbui-focus-width) solid var(--ppbui-focus); outline-offset:var(--ppbui-pixel-unit); }
    .pokeidle-team-panel[data-ppbui-team-enhanced] > .pokeidle-panel__body > .team-actions { grid-column:2; order:3; display:flex!important; align-items:stretch; justify-content:flex-end; flex-wrap:nowrap; gap:var(--ppbui-space-2)!important; box-sizing:border-box; width:auto!important; max-width:100%; min-width:0; margin:var(--ppbui-space-2) 0 0!important; padding:0!important; border:0!important; background:transparent!important; box-shadow:none!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] > .pokeidle-panel__body > .team-actions > button { box-sizing:border-box; flex:0 1 auto; min-width:0!important; min-height:var(--ppbui-control-height)!important; margin:0!important; padding:var(--ppbui-space-2) var(--ppbui-space-3)!important; border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-2)!important; color:var(--ppbui-text)!important; font:700 var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important; white-space:normal; box-shadow:none!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] > .pokeidle-panel__body > .team-actions > button.pokeidle-btn--danger:not(:disabled) { color:var(--ppbui-danger-text)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] > .pokeidle-panel__body > .team-actions > button:hover:not(:disabled) { background:color-mix(in srgb,var(--ppbui-bg-2) 75%,var(--ppbui-info) 25%)!important; border-color:var(--ppbui-info)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] > .pokeidle-panel__body > .team-actions > button:active:not(:disabled) { background:var(--ppbui-bg-0)!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] > .pokeidle-panel__body > .team-actions > button:focus-visible { outline:var(--ppbui-focus-width) solid var(--ppbui-focus); outline-offset:var(--ppbui-pixel-unit); }
    .pokeidle-team-panel[data-ppbui-team-enhanced] > .pokeidle-panel__body:not(:has(> .team-actions)) > [data-ppbui-team-stats-toggle] { grid-column:1/-1; }
    .pokeidle-team-panel[data-ppbui-team-enhanced][data-ppbui-team-stats-collapsed="true"] > .pokeidle-panel__body > :is(.team-section--vitals,.team-section--attributes) { display:none!important; }
    html[data-ppbui-card-mode="cards"] body>[data-ppbui-card-mode-window="native-team"]>.pokeidle-team-panel[data-ppbui-team-enhanced]:has([data-ppbui-team-preset-manager][open]):not([data-ppbui-team-user-dragging="true"]) { top:calc(var(--ppbui-card-mode-window-top-inset,0px) + 8px)!important; max-height:calc(100dvh - var(--ppbui-card-mode-window-top-inset,0px) - var(--ppbui-card-mode-window-bottom-inset,0px) - 16px)!important; }
    html[data-ppbui-card-mode="cards"] body>[data-ppbui-card-mode-window="native-team"]>.pokeidle-team-panel[data-ppbui-team-enhanced]:has([data-ppbui-team-preset-manager][open]) > .pokeidle-panel__body { min-height:0; max-height:none; overflow-y:auto!important; }
    html[data-ppbui-card-mode="cards"] body>[data-ppbui-card-mode-window="native-team"]>.pokeidle-team-panel[data-ppbui-team-enhanced][data-ppbui-team-horizontal-safe="true"]:has([data-ppbui-team-preset-manager][open]):not([data-ppbui-team-user-dragging="true"]) { left:var(--ppbui-team-safe-left)!important; width:var(--ppbui-team-safe-width)!important; top:var(--ppbui-team-safe-top)!important; max-height:var(--ppbui-team-safe-height)!important; }
    html[data-ppbui-card-mode="cards"] body>[data-ppbui-card-mode-window="native-team"]>.pokeidle-team-panel[data-ppbui-team-enhanced][data-ppbui-team-vertical-safe="true"]:has([data-ppbui-team-preset-manager][open]):not([data-ppbui-team-user-dragging="true"]) { left:var(--ppbui-team-safe-left)!important; top:var(--ppbui-team-safe-top)!important; width:var(--ppbui-team-safe-width)!important; min-width:min(220px,var(--ppbui-team-safe-width))!important; max-height:var(--ppbui-team-safe-height)!important; }
    html[data-ppbui-card-mode="cards"] body>[data-ppbui-card-mode-window="native-team"]>.pokeidle-team-panel[data-ppbui-team-enhanced][data-ppbui-team-user-dragging="true"]:not([data-ppbui-team-user-resizing="true"]):has([data-ppbui-team-preset-manager][open]) { width:var(--ppbui-team-drag-width)!important; height:var(--ppbui-team-drag-height)!important; max-height:none!important; }
    html[data-ppbui-card-mode="cards"] body>[data-ppbui-card-mode-window="native-team"]>.pokeidle-team-panel[data-ppbui-team-enhanced][data-ppbui-team-user-dragging="true"][data-ppbui-team-vertical-safe="true"]:has([data-ppbui-team-preset-manager][open]) { min-width:min(220px,var(--ppbui-team-drag-width))!important; }
    html[data-ppbui-card-mode="cards"] body>[data-ppbui-card-mode-window="native-team"]:has(>.pokeidle-team-panel[data-ppbui-team-enhanced]:is([data-ppbui-team-vertical-overlap="true"],[data-ppbui-team-horizontal-overlap="true"],[data-ppbui-team-user-dragging="true"]):has([data-ppbui-team-preset-manager][open])) { z-index:2147483001!important; }
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
    [data-ppbui-team-picker] .team-equip-card:focus-visible { outline:var(--ppbui-focus-width) solid var(--ppbui-focus)!important; outline-offset:var(--ppbui-pixel-unit); }
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
    @container (max-width:359px) {
      .pokeidle-team-panel[data-ppbui-team-enhanced] > .pokeidle-panel__body { grid-template-columns:minmax(0,1fr); }
      .pokeidle-team-panel[data-ppbui-team-enhanced] > .pokeidle-panel__body > [data-ppbui-team-stats-toggle] { grid-column:1/-1; }
      .pokeidle-team-panel[data-ppbui-team-enhanced] > .pokeidle-panel__body > .team-actions { grid-column:1/-1; justify-content:stretch; margin-top:var(--ppbui-space-1)!important; }
      .pokeidle-team-panel[data-ppbui-team-enhanced] > .pokeidle-panel__body > .team-actions > button { flex:1 1 0; }
    }
    @media (pointer:coarse) {
      .pokeidle-team-panel[data-ppbui-team-enhanced] .pokeidle-panel__titlebar button { min-width:40px; min-height:40px; }
    }
  `;
  return style;
}

export function mountTeam(root) {
  const doc = root.ownerDocument, win = doc.defaultView, style = styleNode(doc);
  const hadRootClass = root.classList.contains("ppbui-root"), body = root.querySelector(".pokeidle-panel__body"), hadBodyScroll = body?.classList.contains("ppbui-scroll") || false;
  root.classList.add("ppbui-root"); body?.classList.add("ppbui-scroll"); root.append(style); root.dataset.ppbuiTeamEnhanced = "";
  let active = true, scene = null;
  const buttonLabels = new Map(), slotDescriptions = new Map(), ownedClasses = new Map();
  const picker = createTeamPicker(doc, () => scene);
  let statsExpanded = false, statsToggle = null, statsFocusOwned = false;
  const statsDisclosureId = ++statsDisclosureSequence;
  const ownedStatsIds = new Map();
  const safeProperties = ["--ppbui-team-safe-left","--ppbui-team-safe-width",
    "--ppbui-team-safe-top","--ppbui-team-safe-height"];
  const originalSafeStyle = new Map(safeProperties.map(name => [
    name,{value:root.style.getPropertyValue(name),priority:root.style.getPropertyPriority(name)},
  ]));
  let pendingToolbarGeometryTask = null;
  let pendingNativeTeamDragEnd = null, draggingNativeTeam = false,
    preferredTeamPlacement = null, nativeTeamPointerId = null;
  let nativeTeamDragSnapshot = null, nativeTeamPreResize = null;
  const restorePreResize = () => {
    if(!nativeTeamPreResize)return;
    for(const [property,original] of nativeTeamPreResize.inline){
      if(original.value)root.style.setProperty(property,original.value,original.priority);
      else root.style.removeProperty(property);
    }
    if(nativeTeamPreResize.hadManual)
      root.setAttribute("data-ppbui-team-manual-height",nativeTeamPreResize.manualValue);
    else root.removeAttribute("data-ppbui-team-manual-height");
    nativeTeamPreResize=null;
  };
  const originalDragWidth = {
    value:root.style.getPropertyValue("--ppbui-team-drag-width"),
    priority:root.style.getPropertyPriority("--ppbui-team-drag-width"),
  };
  const originalDragHeight = {
    value:root.style.getPropertyValue("--ppbui-team-drag-height"),
    priority:root.style.getPropertyPriority("--ppbui-team-drag-height"),
  };
  const restoreNativeDragSnapshot = () => {
    if(!nativeTeamDragSnapshot)return;
    for(const [property,previous] of nativeTeamDragSnapshot.before){
      if(previous.value) root.style.setProperty(property,previous.value,previous.priority);
      else root.style.removeProperty(property);
    }
  };
  const releaseNativeDragWidth = () => {
    if(originalDragWidth.value)
      root.style.setProperty("--ppbui-team-drag-width",originalDragWidth.value,originalDragWidth.priority);
    else if(root.style.getPropertyValue("--ppbui-team-drag-width"))
      root.style.removeProperty("--ppbui-team-drag-width");
    if(originalDragHeight.value)
      root.style.setProperty("--ppbui-team-drag-height",originalDragHeight.value,originalDragHeight.priority);
    else if(root.style.getPropertyValue("--ppbui-team-drag-height"))
      root.style.removeProperty("--ppbui-team-drag-height");
  };
  const setSafeProperty = (name,value) => {
    if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name,value);
  };
  const setSafeFlag = (name,enabled) => {
    const next = enabled ? "true" : null;
    if (next && root.getAttribute(name) !== next) root.setAttribute(name,next);
    else if (!next && root.hasAttribute(name)) root.removeAttribute(name);
  };
  const setSafeAreaState = (state,values = {}) => {
    for(const name of ["vertical-safe","vertical-overlap","horizontal-safe","horizontal-overlap"])
      setSafeFlag(`data-ppbui-team-${name}`,state===name);
    for (const name of safeProperties) {
      if (Object.hasOwn(values,name)) {
        setSafeProperty(name,values[name]);
        continue;
      }
      const original = originalSafeStyle.get(name);
      if (original.value) {
        if (root.style.getPropertyValue(name) !== original.value ||
            root.style.getPropertyPriority(name) !== original.priority)
          root.style.setProperty(name,original.value,original.priority);
      } else if (root.style.getPropertyValue(name)) root.style.removeProperty(name);
    }
  };
  const resetSafeArea = () => setSafeAreaState(null);
  const requestedTeamWidth = () => {
    const dragged=Number(preferredTeamPlacement?.width);
    if(Number.isFinite(dragged) && dragged>0)return dragged;
    // A Team window can have been resized before Saved Teams was opened.
    // Native manual-height is the ownership signal for its current inline
    // dimensions; keep user width rather than restoring the default 480px.
    if(!root.hasAttribute("data-ppbui-team-manual-height"))return null;
    const native=Number.parseFloat(root.style.width);
    return Number.isFinite(native) && native>0?native:null;
  };
  function syncSavedTeamsSafeArea() {
    if (draggingNativeTeam) return;
    const expanded = root.querySelector("[data-ppbui-team-preset-manager][open]");
    if (!active || !expanded ||
        doc.documentElement.getAttribute("data-ppbui-card-mode") !== "cards")
      return resetSafeArea();
    const toolbar = doc.querySelector(".pokeidle-top-toolbar");
    if (!toolbar || toolbar.classList.contains("is-collapsed")) return resetSafeArea();
    const vpWidth = Math.max(Number(doc.documentElement.clientWidth)||0,Number(win?.innerWidth)||0);
    const vpHeight = Math.max(Number(doc.documentElement.clientHeight)||0,Number(win?.innerHeight)||0);
    const rect = toolbar.getBoundingClientRect();
    const vertical = toolbar.getAttribute("data-ppbui-menu-orientation")==="vertical" ||
      (!toolbar.hasAttribute("data-ppbui-menu-orientation") &&
        rect.height>rect.width*1.5);
    if (!Number.isFinite(rect.left) || !Number.isFinite(rect.right) ||
        !Number.isFinite(rect.top) || !Number.isFinite(rect.bottom) ||
        rect.width<=0 || rect.height<=0) return resetSafeArea();
    if (!vertical) {
      const topSpace=Math.max(0,Math.floor(rect.top-16));
      const bottomSpace=Math.max(0,Math.floor(vpHeight-rect.bottom-16));
      const preferredTop=Number(preferredTeamPlacement?.top);
      const chooseBottom=preferredTeamPlacement && topSpace>=160 &&
        preferredTop>=8 && preferredTop<=rect.top-168 ? false :
        preferredTeamPlacement && bottomSpace>=160 &&
          preferredTop>=rect.bottom+8 && preferredTop<=vpHeight-168 ? true :
          bottomSpace>=topSpace;
      const best=Math.max(topSpace,bottomSpace);
      if(best<160){
        // A freely positioned horizontal Menu Bar can divide the viewport
        // into two unusable fragments. Prioritize Team above it rather than
        // silently covering native Apply/Delete below the Menu Bar.
        return setSafeAreaState("horizontal-overlap");
      }
      const segmentStart=chooseBottom?Math.ceil(rect.bottom+8):8;
      const segmentEnd=chooseBottom?vpHeight-8:Math.floor(rect.top-8);
      const desiredTop=preferredTeamPlacement && Number.isFinite(preferredTop)
        ? Math.min(Math.max(segmentStart,preferredTop),Math.max(segmentStart,segmentEnd-160))
        : segmentStart;
      const panelRect=root.getBoundingClientRect();
      const candidateWidth=requestedTeamWidth() || Math.min(480,vpWidth-16);
      const safeWidth=Math.max(220,Math.min(candidateWidth,vpWidth-16));
      const candidateLeft=Number(preferredTeamPlacement?.left);
      const nativeLeft=Number.isFinite(candidateLeft) && preferredTeamPlacement
        ? candidateLeft : panelRect.left;
      const safeLeft=Math.max(8,Math.min(nativeLeft,vpWidth-safeWidth-8));
      return setSafeAreaState("horizontal-safe",{
        "--ppbui-team-safe-top":`${Math.ceil(desiredTop)}px`,
        "--ppbui-team-safe-height":`${Math.max(160,Math.floor(segmentEnd-desiredTop))}px`,
        "--ppbui-team-safe-left":`${Math.ceil(safeLeft)}px`,
        "--ppbui-team-safe-width":`${Math.floor(safeWidth)}px`,
      });
    }
    const leftWidth = Math.max(0,Math.floor(rect.left-16));
    const rightWidth = Math.max(0,Math.floor(vpWidth-rect.right-16));
    const preferredLeft=Number(preferredTeamPlacement?.left);
    const preferredRight=preferredTeamPlacement &&
      rightWidth>=220 && preferredLeft>=rect.right+8;
    const preferredLeftSide=preferredTeamPlacement &&
      leftWidth>=220 && preferredLeft<rect.left-8;
    const onRight = preferredRight ? true : preferredLeftSide ? false : rightWidth>=leftWidth;
    const width = onRight ? rightWidth : leftWidth;
    if (width<220) {
      // No non-overlapping 220px management surface fits beside this tall
      // toolbar. Keep Team ABOVE the menu instead of silently burying controls.
      return setSafeAreaState("vertical-overlap");
    }
    const sideStart=onRight?Math.ceil(rect.right+8):8;
    const sideEnd=onRight?vpWidth-8:Math.floor(rect.left-8);
    const nativeWidth=requestedTeamWidth();
    const safeWidth=Number.isFinite(nativeWidth) && nativeWidth>0
      ? Math.max(220,Math.min(nativeWidth,width)) : Math.min(480,width);
    const safeLeft=preferredTeamPlacement && Number.isFinite(preferredLeft)
      ? Math.max(sideStart,Math.min(preferredLeft,sideEnd-safeWidth)) : sideStart;
    const preferredTop=Number(preferredTeamPlacement?.top);
    const safeTop=preferredTeamPlacement && Number.isFinite(preferredTop)
      ? Math.max(8,Math.min(preferredTop,vpHeight-168)) : 8;
    setSafeAreaState("vertical-safe",{
      "--ppbui-team-safe-left":`${Math.ceil(safeLeft)}px`,
      "--ppbui-team-safe-width":`${Math.floor(safeWidth)}px`,
      "--ppbui-team-safe-top":`${Math.ceil(safeTop)}px`,
      "--ppbui-team-safe-height":`${Math.max(160,Math.floor(vpHeight-safeTop-8))}px`,
    });
  }
  const beginNativeTeamGeometry = (event,includeHeight = false) => {
    if (draggingNativeTeam) return;
    const rect=root.getBoundingClientRect();
    if(!(rect.width>0 && rect.height>0))return;
    // Without expanded Saved Teams there is no toolbar safe-area positioning
    // to release. Still track the native resize so a no-op/cancel can restore
    // the pre-pointer manual flag and its exact inline dimensions.
    const expandedCards=Boolean(root.querySelector("[data-ppbui-team-preset-manager][open]")) &&
      doc.documentElement.getAttribute("data-ppbui-card-mode")==="cards";
    const properties=includeHeight
      ? expandedCards?["top","left","width","height"]:["width","height"]
      : ["top","left","width"];
    const before=new Map(properties.map(property=>[
      property,{value:root.style.getPropertyValue(property),
        priority:root.style.getPropertyPriority(property)},
    ]));
    // Freeze only properties included in the reversible snapshot. When Saved
    // Teams is closed a native resize owns width/height, not titlebar position.
    nativeTeamDragSnapshot={before,frozen:new Map(properties.map(property=>[
      property,`${rect[property]}px`,
    ]))};
    // Freeze the current on-screen rectangle before disabling the safe-area
    // geometry. The native drag/resize handler then starts from the same place.
    for(const [property,value] of nativeTeamDragSnapshot.frozen)
      root.style.setProperty(property,value);
    root.style.setProperty("--ppbui-team-drag-width",`${rect.width}px`);
    root.style.setProperty("--ppbui-team-drag-height",`${rect.height}px`);
    draggingNativeTeam=true;
    nativeTeamPointerId=typeof event?.pointerId==="number"?event.pointerId:null;
    root.dataset.ppbuiTeamUserDragging="true";
    if(includeHeight)root.dataset.ppbuiTeamUserResizing="true";
  };
  const onNativeTeamDragStart = event => {
    if (!active || !root.querySelector("[data-ppbui-team-preset-manager][open]") ||
        doc.documentElement.getAttribute("data-ppbui-card-mode")!=="cards" ||
        draggingNativeTeam) return;
    const header=event.target?.closest?.(".pokeidle-panel__titlebar");
    if (!header || !root.contains(header) ||
        event.target?.closest?.("button,input,select,textarea,[role=button]")) return;
    nativeTeamPreResize=null;
    beginNativeTeamGeometry(event);
  };
  const onNativeTeamResizePreCapture = event => {
    if (!active) return;
    const handle=event.target?.closest?.(".pokeidle-resize-handle");
    if (!handle || !root.contains(handle) || draggingNativeTeam) return;
    nativeTeamPreResize={
      hadManual:root.hasAttribute("data-ppbui-team-manual-height"),
      manualValue:root.getAttribute("data-ppbui-team-manual-height") || "",
      inline:new Map(["width","height"].map(property=>[
        property,{value:root.style.getPropertyValue(property),
          priority:root.style.getPropertyPriority(property)},
      ])),
    };
  };
  const onNativeTeamResizeStart = event => {
    if (!active) return;
    const handle=event.target?.closest?.(".pokeidle-resize-handle");
    if (handle && root.contains(handle)) beginNativeTeamGeometry(event,true);
  };
  const abortNativeTeamGeometry = () => {
    if(!draggingNativeTeam)return;
    if(pendingNativeTeamDragEnd!==null)win.clearTimeout(pendingNativeTeamDragEnd);
    pendingNativeTeamDragEnd=null;
    restoreNativeDragSnapshot();nativeTeamDragSnapshot=null;
    restorePreResize();
    draggingNativeTeam=false;nativeTeamPointerId=null;
    root.removeAttribute("data-ppbui-team-user-dragging");
    root.removeAttribute("data-ppbui-team-user-resizing");
    releaseNativeDragWidth();
    if(active)syncSavedTeamsSafeArea();
  };
  const onNativeTeamDragEnd = event => {
    if (!draggingNativeTeam) return;
    if (nativeTeamPointerId!==null && event?.pointerId!==nativeTeamPointerId) return;
    if(event?.type==="pointercancel")return abortNativeTeamGeometry();
    if (pendingNativeTeamDragEnd !== null) win.clearTimeout(pendingNativeTeamDragEnd);
    pendingNativeTeamDragEnd=win.setTimeout(()=>{
      pendingNativeTeamDragEnd=null;
      if (!active) return;
      const changed=Boolean(nativeTeamDragSnapshot &&
        [...nativeTeamDragSnapshot.frozen].some(([property,value])=>
          root.style.getPropertyValue(property)!==value));
      if (!changed){
        restoreNativeDragSnapshot();
        restorePreResize();
      }else nativeTeamPreResize=null;
      const rect=root.getBoundingClientRect();
      if (changed && rect.width>0 && rect.height>0 &&
          Number.isFinite(rect.top) && Number.isFinite(rect.left))
        preferredTeamPlacement={top:rect.top,left:rect.left,width:rect.width,height:rect.height};
      draggingNativeTeam=false;
      nativeTeamPointerId=null;
      root.removeAttribute("data-ppbui-team-user-dragging");
      root.removeAttribute("data-ppbui-team-user-resizing");
      releaseNativeDragWidth();
      nativeTeamDragSnapshot=null;
      syncSavedTeamsSafeArea();
    },0);
  };
  const onSavedTeamsDisclosure = event => {
    if (event?.target?.matches?.("[data-ppbui-team-preset-manager]") &&
        root.contains(event.target)) syncSavedTeamsSafeArea();
  };
  const onSafeToolbarChange = event => {
    if (event?.detail?.toolbar && event.detail.toolbar !== doc.querySelector(".pokeidle-top-toolbar")) return;
    syncSavedTeamsSafeArea();
  };
  const onSafeToolbarInteractionEnd = event => {
    if(draggingNativeTeam)return;
    if (!active || !root.querySelector("[data-ppbui-team-preset-manager][open]") ||
        doc.documentElement.getAttribute("data-ppbui-card-mode") !== "cards") return;
    const toolbar = doc.querySelector(".pokeidle-top-toolbar");
    if (!toolbar || toolbar.classList.contains("is-collapsed")) return;
    if (event.type === "keyup" && !["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Enter","Escape"].includes(event.key)) return;
    if (pendingToolbarGeometryTask !== null) win.clearTimeout(pendingToolbarGeometryTask);
    // Native Menu Bar may commit its last dragged position on pointerup/keyup.
    // Chrome runs capture microtasks before the original target handler, so
    // reconcile in the next task, without another DOM MutationObserver.
    pendingToolbarGeometryTask = win.setTimeout(() => {
      pendingToolbarGeometryTask = null;
      if (active) syncSavedTeamsSafeArea();
    },0);
  };
  for(const type of ["ppbui:menu-collapse-change","ppbui:menu-orientation-change",
    "ppbui:menu-layout-change","ppbui:team-presets-open-change","resize"])
    win?.addEventListener(type,onSafeToolbarChange);
  for(const type of ["pointerup","pointercancel","keyup"])
    win?.addEventListener(type,onSafeToolbarInteractionEnd);
  root.addEventListener("pointerdown",onNativeTeamResizePreCapture,true);
  root.addEventListener("pointerdown",useManualPanelHeight,true);
  root.addEventListener("pointerdown",onNativeTeamDragStart,true);
  root.addEventListener("pointerdown",onNativeTeamResizeStart,true);
  win?.addEventListener("pointerup",onNativeTeamDragEnd);
  win?.addEventListener("pointercancel",onNativeTeamDragEnd);
  win?.addEventListener("blur",abortNativeTeamGeometry);
  doc.addEventListener("toggle",onSavedTeamsDisclosure,true);

  const updateStatsToggle = text => {
    if(!statsToggle)return;
    const label=statsExpanded?text.statsHide:text.statsShow;
    if(statsToggle.textContent!==label)statsToggle.textContent=label;
    const collapsed = String(!statsExpanded);
    if (root.dataset.ppbuiTeamStatsCollapsed !== collapsed)
      root.dataset.ppbuiTeamStatsCollapsed = collapsed;
    if(statsToggle.getAttribute("aria-expanded")!==String(statsExpanded))
      statsToggle.setAttribute("aria-expanded",String(statsExpanded));
  };
  const onStatsToggle = () => {
    statsExpanded = !statsExpanded;
    updateStatsToggle(teamText(doc));
  };
  const onStatsFocus = () => { statsFocusOwned=true; };
  const onExternalStatsFocus = event => {
    if(event.target!==statsToggle && event.target!==doc.body)statsFocusOwned=false;
  };
  const onExternalStatsPointer = event => {
    if(event.target!==statsToggle)statsFocusOwned=false;
  };
  doc.addEventListener("focusin",onExternalStatsFocus,true);
  doc.addEventListener("pointerdown",onExternalStatsPointer,true);
  function syncStatsDisclosure(parts, text) {
    const vitals = parts.body.querySelector(":scope > .team-section--vitals");
    const attributes = parts.body.querySelector(":scope > .team-section--attributes");
    // Native Team refresh replaces both sections. Release owned IDs on detached
    // generations instead of retaining their entire DOM trees until unmount.
    for(const [section,id] of ownedStatsIds){
      if(parts.body.contains(section))continue;
      if(section.id===id)section.removeAttribute("id");
      ownedStatsIds.delete(section);
    }
    if (!vitals && !attributes) {
      statsToggle?.removeEventListener("click", onStatsToggle);
      statsToggle?.removeEventListener("focusin",onStatsFocus);
      statsToggle?.remove(); statsToggle = null;
      statsFocusOwned=false;
      root.removeAttribute("data-ppbui-team-stats-collapsed");
      return;
    }
    let restoreFocus=false;
    if (!statsToggle || !statsToggle.isConnected || !parts.body.contains(statsToggle)) {
      restoreFocus=statsFocusOwned &&
        (doc.activeElement===doc.body || doc.activeElement===doc.documentElement);
      statsToggle?.removeEventListener("click", onStatsToggle);
      statsToggle?.removeEventListener("focusin",onStatsFocus);
      statsToggle = doc.createElement("button");
      statsToggle.type = "button";
      statsToggle.className = "ppbui-button";
      statsToggle.dataset.ppbuiTeamStatsToggle = "";
      statsToggle.addEventListener("click", onStatsToggle);
      statsToggle.addEventListener("focusin",onStatsFocus);
    }
    const first = vitals || attributes;
    if (statsToggle.nextElementSibling !== first) first.before(statsToggle);
    if(restoreFocus)statsToggle.focus({preventScroll:true});
    const sections = [vitals,attributes].filter(Boolean);
    for (const [index,section] of sections.entries()) {
      if (section.id) continue;
      const id = `ppbui-team-stats-${statsDisclosureId}-${index}`;
      if (doc.getElementById(id) && doc.getElementById(id) !== section) continue;
      section.id = id;
      ownedStatsIds.set(section,id);
    }
    const controls = sections.map(section=>section.id).filter(Boolean).join(" ");
    if (statsToggle.getAttribute("aria-controls") !== controls)
      statsToggle.setAttribute("aria-controls",controls);
    updateStatsToggle(text);
  }

  function useManualPanelHeight(event) {
    const handle = event.target?.closest?.(".pokeidle-resize-handle");
    if (!handle || !root.contains(handle) || draggingNativeTeam ||
        root.hasAttribute("data-ppbui-team-manual-height")) return;
    const rect = root.getBoundingClientRect(), width = rect.width, height = rect.height;
    if (Number.isFinite(width) && width > 0) root.style.width = `${width}px`;
    if (Number.isFinite(height) && height > 0) root.style.height = `${height}px`;
    root.dataset.ppbuiTeamManualHeight = "";
  }

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
    syncStatsDisclosure(parts, text);
    syncSavedTeamsSafeArea();
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
    root.removeEventListener("pointerdown",onNativeTeamResizePreCapture,true);
    for(const type of ["ppbui:menu-collapse-change","ppbui:menu-orientation-change",
      "ppbui:menu-layout-change","ppbui:team-presets-open-change","resize"])
      win?.removeEventListener(type,onSafeToolbarChange);
    for(const type of ["pointerup","pointercancel","keyup"])
      win?.removeEventListener(type,onSafeToolbarInteractionEnd);
    root.removeEventListener("pointerdown",onNativeTeamDragStart,true);
    root.removeEventListener("pointerdown",onNativeTeamResizeStart,true);
    win?.removeEventListener("pointerup",onNativeTeamDragEnd);
    win?.removeEventListener("pointercancel",onNativeTeamDragEnd);
    win?.removeEventListener("blur",abortNativeTeamGeometry);
    if (pendingToolbarGeometryTask !== null) win.clearTimeout(pendingToolbarGeometryTask);
    pendingToolbarGeometryTask = null;
    if (pendingNativeTeamDragEnd !== null) win.clearTimeout(pendingNativeTeamDragEnd);
    pendingNativeTeamDragEnd = null;
    if (draggingNativeTeam) {
      const changed=Boolean(nativeTeamDragSnapshot &&
        [...nativeTeamDragSnapshot.frozen].some(([property,frozen])=>
          root.style.getPropertyValue(property)!==frozen));
      if (!changed) restoreNativeDragSnapshot();
      else nativeTeamPreResize=null; // The native host already owns a real resize.
    }
    nativeTeamDragSnapshot=null;
    restorePreResize();
    releaseNativeDragWidth();
    draggingNativeTeam=false;preferredTeamPlacement=null;
    nativeTeamPointerId=null;
    root.removeAttribute("data-ppbui-team-user-dragging");
    root.removeAttribute("data-ppbui-team-user-resizing");
    doc.removeEventListener("toggle",onSavedTeamsDisclosure,true);
    resetSafeArea();
    statsToggle?.removeEventListener("click", onStatsToggle);
    statsToggle?.removeEventListener("focusin",onStatsFocus);
    statsToggle?.remove(); statsToggle = null;
    statsFocusOwned=false;
    doc.removeEventListener("focusin",onExternalStatsFocus,true);
    doc.removeEventListener("pointerdown",onExternalStatsPointer,true);
    for (const [section,id] of ownedStatsIds) if (section.id === id) section.removeAttribute("id");
    ownedStatsIds.clear();
    root.removeAttribute("data-ppbui-team-stats-collapsed");
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
