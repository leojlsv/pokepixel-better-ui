import { autoHelperText } from "./config.js";
import { helperParts } from "./dom.js";
import { createNativeBusBindings } from "../../core/native-event-bus.js";

export function mountAutoHelper(root, session) {
  const doc = root.ownerDocument, pi = doc.defaultView.PokeIdle, parts = helperParts(root);
  let alive = true, ready = false, refreshing = false, rarityDirty = false, inventory = [], choices = [], pickers = [], destinations = [], ballChoices = [], ballMatrixHost = null, rarityAssignments = null, stockMessage = "", loadError = "", stock = new Map();
  const nativeBus = createNativeBusBindings(() => doc.defaultView?.PokeIdle?.Bus);
  const moves = [], replacements = [], owned = [], listeners = [], badges = [], destinationHeaders = [], hiddenNodes = [], ownedClasses = [];
  const ownClass = (el, name) => {
    if (el && !el.classList.contains(name)) { el.classList.add(name); ownedClasses.push({el,name}); }
  };
  ownClass(root, "ppbui-window");
  ownClass(parts.body, "ppbui-root");
  ownClass(parts.body, "ppbui-scroll");
  ownClass(parts.body, "ppbui-scroll-scope");
  const hide = el => { if (el) { hiddenNodes.push({el,hidden:el.hidden}); el.hidden=true; el.classList.add("ppbui-auto-original"); } };
  const node = (tag, cls, text) => { const el = doc.createElement(tag); if (cls) el.className = cls; if (text) el.textContent = text; return el; };
  const flag = (el, key, value) => { if (el[key] !== value) el[key] = value; };
  const content = (el, text) => { if (el.textContent !== text) el.textContent = text; };
  const listen = (el, type, fn, capture = false) => { el.addEventListener(type, fn, capture); listeners.push(() => el.removeEventListener(type, fn, capture)); };
  const move = (el, parent) => { const anchor = doc.createComment("ppbui-auto-helper"); el.before(anchor); moves.push({ el, anchor }); parent.append(el); };
  const replace = (el, next) => { el.replaceWith(next); replacements.push({ el, next }); };
  const saveState = node("div", "ppbui-auto-save"); saveState.setAttribute("role", "status"); saveState.setAttribute("aria-live", "polite");
  const saveMessage = node("span"), retry = node("button", "pokeidle-btn ppbui-button ppbui-button--primary"), refresh = node("button", "pokeidle-btn ppbui-button");
  retry.type = refresh.type = "button"; const stockStatus = node("small", "ppbui-auto-stock"); stockStatus.setAttribute("role", "status");
  saveState.append(saveMessage, retry, refresh, stockStatus);
  const style = node("style"); style.dataset.ppbuiModule = "auto-helper";
  style.textContent = `
    .auto-helper-panel[data-ppbui-auto-helper].ppbui-window { container-type:inline-size; border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-1)!important; background-image:none!important; color:var(--ppbui-text)!important; box-shadow:var(--ppbui-shadow-raised)!important; font:var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important; }
    .auto-helper-panel[data-ppbui-auto-helper].ppbui-window > .pokeidle-panel__titlebar { min-height:var(--ppbui-control-height); border:0!important; border-bottom:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-1)!important; background-image:none!important; color:var(--ppbui-text)!important; box-shadow:none!important; font-family:var(--ppbui-font-body)!important; }
    .auto-helper-panel[data-ppbui-auto-helper].ppbui-window > .pokeidle-panel__titlebar .pokeidle-panel__title { color:var(--ppbui-text)!important; font:500 var(--ppbui-font-size-title)/var(--ppbui-line-height-tight) var(--ppbui-font-display)!important; letter-spacing:normal; text-shadow:none!important; }
    .auto-helper-panel[data-ppbui-auto-helper].ppbui-window > .pokeidle-panel__titlebar button { min-width:var(--ppbui-icon-button-size); min-height:var(--ppbui-icon-button-size); border:0!important; border-left:var(--ppbui-separator-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-2)!important; background-image:none!important; color:var(--ppbui-text-muted)!important; box-shadow:none!important; filter:none!important; text-shadow:none!important; transform:none!important; }
    .auto-helper-panel[data-ppbui-auto-helper].ppbui-window > .pokeidle-panel__titlebar button:hover:not(:disabled) { background:var(--ppbui-bg-3)!important; color:var(--ppbui-text)!important; }
    .auto-helper-panel[data-ppbui-auto-helper].ppbui-window > .pokeidle-panel__titlebar button:focus-visible { outline:var(--ppbui-border-width) solid var(--ppbui-focus)!important; outline-offset:calc(-1 * var(--ppbui-border-width)); }
    .auto-helper-panel[data-ppbui-auto-helper].ppbui-window > .pokeidle-panel__body.ppbui-root { box-sizing:border-box; padding:var(--ppbui-space-4)!important; background:var(--ppbui-bg-0)!important; background-image:none!important; color:var(--ppbui-text)!important; font:var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important; }
    .ppbui-auto-save { position:sticky; top:0; z-index:3; display:flex; min-height:var(--ppbui-control-height); flex-wrap:wrap; align-items:center; gap:var(--ppbui-space-2); box-sizing:border-box; margin:0 0 var(--ppbui-space-4); padding:var(--ppbui-space-2) var(--ppbui-space-3); border:var(--ppbui-separator-width) solid var(--ppbui-border-strong); border-left:var(--ppbui-border-width) solid var(--ppbui-border-strong); border-radius:var(--ppbui-radius); background:var(--ppbui-bg-1); color:var(--ppbui-text); box-shadow:none; font:inherit; }
    .ppbui-auto-save > span { flex:1; min-width:120px; }
    .ppbui-auto-stock { flex-basis:100%; padding-top:var(--ppbui-space-1); border-top:var(--ppbui-separator-width) solid var(--ppbui-border); color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-meta); }
    .ppbui-auto-stock:empty { display:none; }
    .ppbui-auto-save button[hidden] { display:none!important; }
    .ppbui-auto-save[data-state="loading"] { border-left-color:var(--ppbui-info); }
    .ppbui-auto-save[data-state="pending"],.ppbui-auto-save[data-state="saving"] { border-left-color:var(--ppbui-warning); }
    .ppbui-auto-save[data-state="saved"] { border-left-color:var(--ppbui-success-text); }
    .ppbui-auto-save[data-state="error"] { border-left-color:var(--ppbui-danger-text); }
    .ppbui-auto-save[data-state="error"] > span { color:var(--ppbui-danger-hi); }
    .ppbui-auto-group { margin:0 0 var(--ppbui-space-4); overflow:visible; border:var(--ppbui-border-width) solid var(--ppbui-border-strong); border-radius:var(--ppbui-radius); background:var(--ppbui-bg-1); color:var(--ppbui-text); box-shadow:none; }
    .ppbui-auto-group:last-of-type { margin-bottom:0; }
    .ppbui-auto-group > summary { display:flex; min-height:var(--ppbui-control-height); align-items:center; box-sizing:border-box; padding:var(--ppbui-space-2) var(--ppbui-space-3); list-style:none; background:var(--ppbui-bg-1); color:var(--ppbui-text); font:700 var(--ppbui-font-size-section)/var(--ppbui-line-height-tight) var(--ppbui-font-body); cursor:pointer; }
    .ppbui-auto-group > summary::-webkit-details-marker { display:none; }
    .ppbui-auto-group > summary::after { content:"+"; margin-left:auto; color:var(--ppbui-text-muted); font:700 var(--ppbui-font-size-body)/1 var(--ppbui-font-data); }
    .ppbui-auto-group[open] > summary { border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border); }
    .ppbui-auto-group[open] > summary::after { content:"−"; }
    .ppbui-auto-group > summary:hover { background:var(--ppbui-bg-3); }
    .ppbui-auto-group > summary:focus-visible { outline:var(--ppbui-border-width) solid var(--ppbui-focus)!important; outline-offset:calc(-1 * var(--ppbui-border-width)); }
    .ppbui-auto-group-body { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:var(--ppbui-space-3); padding:var(--ppbui-space-3); background:var(--ppbui-bg-0); }
    .ppbui-auto-group[data-ppbui-auto-group="capture"] > .ppbui-auto-group-body { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .ppbui-auto-group[data-ppbui-auto-group="capture"] > .ppbui-auto-group-body > .auto-helper-section.is-wide { grid-column:1/-1; }
    .ppbui-auto-group-body > .auto-helper-section { box-sizing:border-box; min-width:0; margin:0!important; padding:var(--ppbui-space-3)!important; border:var(--ppbui-separator-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-2)!important; background-image:none!important; color:var(--ppbui-text)!important; box-shadow:none!important; opacity:1!important; font-family:var(--ppbui-font-body)!important; }
    .ppbui-auto-group-body > .auto-helper-section.is-wide { grid-column:1/-1; }
    .auto-helper-panel[data-ppbui-auto-helper] .auto-helper-section > h3 { margin:0 0 var(--ppbui-space-3)!important; color:var(--ppbui-text)!important; font:700 var(--ppbui-font-size-section)/var(--ppbui-line-height-tight) var(--ppbui-font-body)!important; text-shadow:none!important; }
    .auto-helper-panel[data-ppbui-auto-helper] .auto-helper-row { gap:var(--ppbui-space-3); margin:var(--ppbui-space-3) 0; color:var(--ppbui-text); font:inherit; }
    .auto-helper-panel[data-ppbui-auto-helper] .auto-helper-row > span { color:var(--ppbui-text-muted)!important; }
    .auto-helper-panel[data-ppbui-auto-helper] .auto-helper-row > b { color:var(--ppbui-text)!important; font:700 var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important; }
    .auto-helper-panel[data-ppbui-auto-helper] .auto-helper-note { color:var(--ppbui-text-muted)!important; font:400 var(--ppbui-font-size-meta)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important; }
    .auto-helper-panel[data-ppbui-auto-helper] .ppbui-auto-capture-shiny > h3 { color:var(--ppbui-accent-hi)!important; font-size:calc(var(--ppbui-font-size-section) + 1px)!important; font-weight:900!important; font-variant-caps:small-caps; letter-spacing:.12em; text-transform:uppercase; }
    .ppbui-auto-support { grid-column:1/-1; }
    .ppbui-auto-support > h3 { grid-column:1/-1; }
    .ppbui-auto-support-part,.ppbui-auto-support-head { display:grid; grid-template-columns:minmax(120px,1fr) minmax(0,2fr) minmax(140px,1fr); align-items:center; gap:6px 12px; min-width:0; }
    .ppbui-auto-support-head { padding:var(--ppbui-space-2) 0; border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border); color:var(--ppbui-text-muted); font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body); text-transform:uppercase; }
    .ppbui-auto-support-part { padding:var(--ppbui-space-3) 0; }
    .ppbui-auto-support-part + .ppbui-auto-support-part { border-top:var(--ppbui-separator-width) solid var(--ppbui-border); }
    .ppbui-auto-support-part > .auto-helper-row { margin:0; }
    .ppbui-auto-support-part > .auto-helper-row:first-of-type { grid-column:1; grid-row:1; }
    .ppbui-auto-support-resource { grid-column:2; grid-row:1; min-width:0; }
    .ppbui-auto-support-resource > .ppbui-auto-picker { margin:0; }
    .ppbui-auto-support-condition { grid-column:3; grid-row:1; min-width:0; }
    .ppbui-auto-support-part .ppbui-auto-support-condition > span { min-width:0; white-space:nowrap; }
    .ppbui-auto-support-part > .auto-helper-note { grid-column:2/-1; }
    .ppbui-auto-destination-controls { display:flex; flex-wrap:wrap; align-items:center; gap:var(--ppbui-space-3) var(--ppbui-space-6); padding-bottom:var(--ppbui-space-3); border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border); }
    .ppbui-auto-destination-controls > .auto-helper-section { display:contents; }
    .ppbui-auto-destination-controls .auto-helper-row { margin:0; }
    .ppbui-auto-destination-controls > .auto-sell-time { margin-left:auto; color:var(--ppbui-text-muted)!important; font:700 var(--ppbui-font-size-secondary)/var(--ppbui-line-height-tight) var(--ppbui-font-data)!important; font-variant-numeric:tabular-nums; }
    .ppbui-auto-destination-help { margin:var(--ppbui-space-3) 0; color:var(--ppbui-text-muted); }
    .ppbui-auto-destination-help > summary { color:var(--ppbui-text-muted); font-weight:700; cursor:pointer; }
    .ppbui-auto-destination-help > summary:focus-visible { outline:var(--ppbui-border-width) solid var(--ppbui-focus); outline-offset:var(--ppbui-pixel-unit); }
    .ppbui-auto-destination-help .auto-helper-note { margin:var(--ppbui-space-2) 0; }
    .auto-helper-panel[data-ppbui-auto-helper] .auto-capture-lock { position:static!important; display:inline-block; margin:0 0 var(--ppbui-space-3); padding:var(--ppbui-space-1) var(--ppbui-space-2)!important; border:var(--ppbui-separator-width) solid var(--ppbui-warning); border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-0)!important; color:var(--ppbui-warning)!important; font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body)!important; }
    .ppbui-auto-status[hidden] { display:none !important; }
    .ppbui-auto-status { display:block; margin:6px 0; color:var(--ppbui-text-muted); }
    .ppbui-auto-picker { display:flex; align-items:center; gap:var(--ppbui-space-3); margin:var(--ppbui-space-3) 0; }
    .ppbui-auto-item-icon { display:grid; place-items:center; flex:0 0 32px; width:32px; height:32px; overflow:hidden; border:var(--ppbui-separator-width) solid var(--ppbui-border); border-radius:var(--ppbui-radius); background-color:var(--ppbui-bg-0); background-repeat:no-repeat; color:var(--ppbui-accent-hi); font:700 20px/1 var(--ppbui-font-data); image-rendering:pixelated; }
    .ppbui-auto-picker > .ppbui-select { flex:1; }
    .auto-helper-panel[data-ppbui-auto-helper] .auto-helper-row > .ppbui-auto-status { margin:0 0 0 auto; max-width:50%; text-align:right; font-size:var(--ppbui-font-size-meta); font-weight:400; }
    .auto-helper-panel[data-ppbui-auto-helper] .auto-helper-note { line-height:1.4; }
    .auto-helper-panel[data-ppbui-auto-helper] .auto-helper-row select,
    .auto-helper-panel[data-ppbui-auto-helper] .auto-helper-row input[type="text"],
    .auto-helper-panel[data-ppbui-auto-helper] .ppbui-auto-picker > select.ppbui-select { -webkit-appearance:none!important; appearance:none!important; box-sizing:border-box!important; width:100%!important; min-width:0!important; height:var(--ppbui-control-height)!important; min-height:var(--ppbui-control-height)!important; margin:0!important; padding:0 var(--ppbui-control-padding-x)!important; border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-0)!important; background-image:none!important; clip-path:none!important; color:var(--ppbui-text)!important; box-shadow:none!important; filter:none!important; font:400 var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important; text-shadow:none!important; transition:none!important; transform:none!important; }
    .auto-helper-panel[data-ppbui-auto-helper] .auto-helper-row input[type="text"]::placeholder { color:var(--ppbui-text-subtle)!important; opacity:1; }
    .auto-helper-panel[data-ppbui-auto-helper] .auto-helper-row select:focus,
    .auto-helper-panel[data-ppbui-auto-helper] .auto-helper-row input[type="text"]:focus,
    .auto-helper-panel[data-ppbui-auto-helper] .ppbui-auto-picker > select.ppbui-select:focus { border-color:var(--ppbui-border-strong)!important; outline:none!important; }
    .auto-helper-panel[data-ppbui-auto-helper] .auto-helper-row select:focus-visible,
    .auto-helper-panel[data-ppbui-auto-helper] .auto-helper-row input[type="text"]:focus-visible,
    .auto-helper-panel[data-ppbui-auto-helper] .ppbui-auto-picker > select.ppbui-select:focus-visible { outline:var(--ppbui-border-width) solid var(--ppbui-focus)!important; outline-offset:var(--ppbui-pixel-unit); }
    .auto-helper-panel[data-ppbui-auto-helper] input[type="checkbox"],.auto-helper-panel[data-ppbui-auto-helper] input[type="radio"] { accent-color:var(--ppbui-selected)!important; }
    .ppbui-auto-destinations { width:100%; table-layout:fixed; border-collapse:separate; border-spacing:0; overflow:hidden; border:var(--ppbui-separator-width) solid var(--ppbui-border); border-radius:var(--ppbui-radius); background:var(--ppbui-bg-0); color:var(--ppbui-text); }
    .ppbui-auto-destinations th,.ppbui-auto-destinations td { padding:var(--ppbui-space-3) var(--ppbui-space-2); text-align:left; border:0; }
    .ppbui-auto-destinations thead th { border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border-strong); background:var(--ppbui-bg-1); color:var(--ppbui-text-muted); font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body); text-transform:uppercase; }
    .ppbui-auto-destinations thead th + th { border-left:var(--ppbui-separator-width) solid var(--ppbui-border); }
    .ppbui-auto-destinations thead th:first-child { width:34%; }
    .ppbui-auto-destinations tbody th { background:transparent; font:700 var(--ppbui-font-size-secondary)/var(--ppbui-line-height-body) var(--ppbui-font-body); }
    .ppbui-auto-destinations tbody tr:nth-child(even) > * { background:color-mix(in srgb,var(--ppbui-border) 7%,var(--ppbui-bg-0)); }
    .ppbui-auto-destinations tbody tr:hover > * { background:color-mix(in srgb,var(--ppbui-border) 12%,var(--ppbui-bg-0)); }
    .ppbui-auto-destinations td,.ppbui-auto-destinations thead th:not(:first-child) { text-align:center; }
    .ppbui-auto-destination-choice { display:grid; place-items:center; min-height:28px; cursor:pointer; }
    .ppbui-auto-destination-choice input { margin:0; accent-color:var(--ppbui-selected); }
    .ppbui-auto-destination-choice input:focus-visible { outline:var(--ppbui-border-width) solid var(--ppbui-focus); outline-offset:var(--ppbui-pixel-unit); }
    .ppbui-auto-destination-choice:has(input:disabled) { cursor:default; color:var(--ppbui-text-subtle); opacity:1; }
    .ppbui-auto-destinations small { display:block; font-weight:400; color:var(--ppbui-text-muted); }
    .ppbui-auto-ball-matrix-scroll { width:100%; overflow-x:auto; overscroll-behavior-inline:contain; }
    .ppbui-auto-ball-matrix { width:100%; min-width:680px; table-layout:fixed; border-collapse:separate; border-spacing:0; overflow:hidden; border:var(--ppbui-separator-width) solid var(--ppbui-border); border-radius:var(--ppbui-radius); background:var(--ppbui-bg-0); color:var(--ppbui-text); }
    .ppbui-auto-ball-matrix th,.ppbui-auto-ball-matrix td { padding:var(--ppbui-space-2); border:0; text-align:center; }
    .ppbui-auto-ball-matrix thead th { height:54px; border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border-strong); background:var(--ppbui-bg-1); color:var(--ppbui-text-muted); vertical-align:middle; }
    .ppbui-auto-ball-matrix thead th + th { border-left:var(--ppbui-separator-width) solid var(--ppbui-border); }
    .ppbui-auto-ball-matrix thead th:first-child { width:112px; text-align:left; font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body); text-transform:uppercase; }
    .ppbui-auto-ball-matrix tbody th { width:112px; text-align:left; background:transparent; font:700 var(--ppbui-font-size-secondary)/var(--ppbui-line-height-body) var(--ppbui-font-body); }
    .ppbui-auto-ball-matrix tbody tr:nth-child(even) > * { background:color-mix(in srgb,var(--ppbui-border) 7%,var(--ppbui-bg-0)); }
    .ppbui-auto-ball-matrix tbody tr:hover > * { background:color-mix(in srgb,var(--ppbui-border) 12%,var(--ppbui-bg-0)); }
    .ppbui-auto-ball-head { display:grid; grid-template-columns:32px minmax(0,1fr); grid-template-rows:auto auto; align-items:center; gap:1px 6px; min-width:0; text-align:left; }
    .ppbui-auto-ball-head--fallback { grid-template-columns:32px minmax(0,1fr); }
    .ppbui-auto-ball-icon { grid-row:1 / span 2; display:grid; width:32px; height:32px; place-items:center; overflow:hidden; background-repeat:no-repeat; background-size:auto; color:var(--ppbui-selected); font:800 18px/1 var(--ppbui-font-data); image-rendering:pixelated; }
    .ppbui-auto-ball-head strong { min-width:0; overflow:hidden; color:var(--ppbui-text); font:700 var(--ppbui-font-size-secondary)/1.1 var(--ppbui-font-body); text-overflow:ellipsis; white-space:nowrap; }
    .ppbui-auto-ball-head small { min-width:0; overflow:hidden; color:var(--ppbui-text-muted); font:600 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data); text-overflow:ellipsis; white-space:nowrap; }
    .ppbui-auto-ball-choice { display:grid; min-height:32px; place-items:center; box-sizing:border-box; border:var(--ppbui-separator-width) solid transparent; border-radius:var(--ppbui-radius-badge); background:var(--ppbui-bg-0); cursor:pointer; }
    .ppbui-auto-ball-choice:hover:not(:has(input:disabled)) { border-color:var(--ppbui-border-strong); background:var(--ppbui-bg-2); }
    .ppbui-auto-ball-choice:has(input:checked) { border-color:var(--ppbui-selected); background:color-mix(in srgb,var(--ppbui-selected) 12%,var(--ppbui-bg-2)); }
    .ppbui-auto-ball-choice:has(input:disabled) { cursor:default; color:var(--ppbui-text-subtle); opacity:.6; }
    .ppbui-auto-ball-choice input { margin:0; accent-color:var(--ppbui-selected)!important; }
    .ppbui-auto-ball-choice input:focus-visible { outline:var(--ppbui-border-width) solid var(--ppbui-focus); outline-offset:2px; }
    .ppbui-auto-original[hidden] { display:none!important; }
    @container (max-width:760px) { .ppbui-auto-group-body { grid-template-columns:1fr; } .ppbui-auto-group-body > .auto-helper-section.is-wide { grid-column:auto; } .ppbui-auto-group[data-ppbui-auto-group="capture"] > .ppbui-auto-group-body { grid-template-columns:repeat(2,minmax(0,1fr)); } .ppbui-auto-group[data-ppbui-auto-group="capture"] > .ppbui-auto-group-body > .auto-helper-section.is-wide { grid-column:1/-1; } .ppbui-auto-support-head { display:none; } .ppbui-auto-support-part { grid-template-columns:minmax(110px,1fr) minmax(0,2fr); gap:var(--ppbui-space-2) var(--ppbui-space-3); } .ppbui-auto-support-condition { grid-column:2; grid-row:2; } .ppbui-auto-destination-controls > .auto-sell-time { margin-left:0; } }
    @container (max-width:560px) { .ppbui-auto-group[data-ppbui-auto-group="capture"] > .ppbui-auto-group-body { grid-template-columns:1fr; } .ppbui-auto-group[data-ppbui-auto-group="capture"] > .ppbui-auto-group-body > .auto-helper-section.is-wide { grid-column:auto; } }
    @media(pointer:coarse) { .auto-helper-panel[data-ppbui-auto-helper].ppbui-window > .pokeidle-panel__titlebar button { min-width:40px; min-height:40px; } }
  `;
  root.append(style); owned.push(style); root.dataset.ppbuiAutoHelper = "";
  for (const original of [...parts.pickers, parts.sellGrid, parts.extractGrid, parts.rarityGrid].filter(Boolean)) hide(original);
  const wasInert = parts.body.inert; parts.body.inert = true;
  const groups = [
    ["support", [parts.support]], ["capture", [parts.normal, parts.shiny, ...(parts.rarity ? [parts.rarity] : []), parts.filter]],
    ["destination", [parts.sell, ...(parts.extract ? [parts.extract] : [])]],
  ].map(([key, sections]) => {
    const details = node("details", "ppbui-auto-group"), summary = node("summary"), body = node("div", "ppbui-auto-group-body");
    details.dataset.ppbuiAutoGroup = key;
    details.open = session.groups[key] ?? true; details.append(summary, body);
    parts.grid.before(details); owned.push(details);
    sections.forEach(section => move(section, body));
    listen(details, "toggle", () => { if (alive) session.groups[key] = details.open; });
    return { key, details, summary, body };
  });
  ownClass(parts.shiny, "ppbui-auto-capture-shiny");
  const supportChildren = [...parts.support.children].slice(1);
  const potionPart = node("div", "ppbui-auto-support-part"), revivePart = node("div", "ppbui-auto-support-part");
  parts.support.classList.add("ppbui-auto-support"); parts.support.append(potionPart, revivePart); owned.push(potionPart,revivePart);
  let reviveSide = false;
  for (const el of supportChildren) { if (el === parts.revive.parentElement) reviveSide = true; move(el, reviveSide ? revivePart : potionPart); }
  const supportHead = node("div", "ppbui-auto-support-head");
  const labels = autoHelperText(doc); supportHead.append(...[labels.function,labels.resource,labels.condition].map(text=>node("span","",text)));
  potionPart.before(supportHead); owned.push(supportHead);
  for (const [index, part] of [potionPart,revivePart].entries()) {
    const resource = node("div", "ppbui-auto-support-resource"); part.append(resource); owned.push(resource); move(parts.pickers[index],resource);
  }
  const hpRow = parts.hp.parentElement === potionPart ? parts.hp : parts.hp.parentElement;
  hpRow.classList.add("ppbui-auto-support-condition");
  const noCondition = node("span", "ppbui-auto-support-condition", "—"); revivePart.append(noCondition); owned.push(noCondition);
  parts.body.prepend(saveState); owned.push(saveState);
  const nativeStatus = parts.status;
  const hiddenWarnings = parts.warnings.map(el => ({el, hidden:el.hidden}));
  hiddenWarnings.forEach(({el}) => {el.hidden = true; el.classList.add("ppbui-auto-original");});
  if (nativeStatus) { nativeStatus.hidden = true; nativeStatus.classList.add("ppbui-auto-original"); }
  const ids = item => String(item.item_id || item.id || item.item?.id || "");
  const qty = item => Number(item.qty ?? item.quantity ?? 0);
  const items = type => stock.get(type) || [];
  const qualityKeys = ["weak", "common", "uncommon", "rare", "epic", "legendary", "mythical"];
  const indexStock = () => {
    stock = new Map(["potion", "revive", "capsule"].map(type => [type, inventory.filter(item => (item.type || item.item?.type) === type && qty(item) > 0)]));
    stock.get("capsule").sort((a,b) => Number(b.catch_multiplier || b.item?.catch_multiplier || 0) - Number(a.catch_multiplier || a.item?.catch_multiplier || 0));
  };
  const choiceName = (index, text) => {
    const selected = inventory.find(item => ids(item) === choices[index]);
    return !choices[index] ? pi.t("auto_helper.any_available") : selected ? (selected.name || selected.item?.name || ids(selected)) : `${text.missing} (${choices[index]})`;
  };
  const controls = [parts.potion, parts.revive, parts.common, parts.shinyCheck];
  const types = ["potion", "revive", "capsule", "capsule"];
  function drawPickers() {
    pickers.forEach((picker, index) => {
      if (!picker.select) {
        picker.icon = node("span", "ppbui-auto-item-icon"); picker.icon.setAttribute("aria-hidden", "true");
        picker.select = node("select", "ppbui-select"); picker.select.dataset.ppbuiPicker = String(index);
        picker.select.setAttribute("aria-label", controls[index].parentElement.querySelector("b")?.textContent || types[index]);
        picker.grid.append(picker.icon, picker.select);
        picker.select.addEventListener("change", () => { choices[index] = picker.select.value; updatePickers(); queue(true); });
      }
      const options = [node("option", "", pi.t("auto_helper.any_available"))]; options[0].value = "";
      for (const item of items(types[index])) {
        const option = node("option", "", `${item.name || item.item?.name || ids(item)} · ×${qty(item)}`); option.value = ids(item); options.push(option);
      }
      if (choices[index] && !options.some(option => option.value === choices[index])) {
        const option = node("option", "", choiceName(index, autoHelperText(doc))); option.value = choices[index]; options.push(option);
      }
      picker.select.replaceChildren(...options);
    });
    updatePickers();
  }
  function updatePickers() {
    pickers.forEach(({select,icon}, index) => {
      if (!select) return;
      const item = inventory.find(item => ids(item) === choices[index]);
      const iconKey = item ? String(item.icon_index || item.item?.icon_index || 0) : "any";
      if (icon.dataset.ppbuiIcon !== iconKey) {
        icon.dataset.ppbuiIcon = iconKey; content(icon, item ? "" : "◎");
        icon.style.backgroundImage = item ? 'url("img/system/IconSet.png?v=20260717-reference-iconset-1")' : "none";
        if (item) { const value = Number(iconKey); icon.style.backgroundPosition = `-${(value % 16) * 32}px -${Math.floor(value / 16) * 32}px`; }
      }
      if (select.value !== choices[index]) select.value = choices[index];
      flag(select, "disabled", controls[index].disabled);
      const title = select.selectedOptions[0]?.textContent || "";
      if (select.title !== title) select.title = title;
    });
  }
  function qualityLabels() {
    const labels = new Map();
    for (const input of parts.rarityGrid?.querySelectorAll?.('input[type="checkbox"]') || []) {
      const key = String(input.value || "").toLowerCase();
      if (!qualityKeys.includes(key) || labels.has(key)) continue;
      const holder = input.closest("label");
      const raw = holder?.textContent?.trim();
      if (raw) labels.set(key, raw);
    }
    return labels;
  }
  function matrixCapsules() {
    const byId = new Map();
    for (const item of inventory) {
      if ((item.type || item.item?.type) !== "capsule") continue;
      const id = ids(item); if (id && !byId.has(id)) byId.set(id, item);
    }
    for (const id of Object.values(rarityAssignments || {})) {
      const clean = String(id || "");
      if (clean && !byId.has(clean)) byId.set(clean, { item_id:clean, name:clean, qty:0, __ppbuiMissing:true });
    }
    return [...byId.values()];
  }
  function ballHeader(item, text) {
    const head = node("span", "ppbui-auto-ball-head"), icon = node("span", "ppbui-auto-ball-icon"), name = node("strong"), count = node("small");
    const iconKey = Number(item.icon_index || item.item?.icon_index || 0);
    icon.setAttribute("aria-hidden", "true");
    if (Number.isFinite(iconKey) && iconKey > 0) {
      icon.style.backgroundImage = 'url("img/system/IconSet.png?v=20260717-reference-iconset-1")';
      icon.style.backgroundPosition = `-${(iconKey % 16) * 32}px -${Math.floor(iconKey / 16) * 32}px`;
    } else content(icon, "◉");
    content(name, item.name || item.item?.name || ids(item));
    content(count, item.__ppbuiMissing || qty(item) <= 0 ? text.ballMissing : `×${qty(item)}`);
    head.append(icon,name,count); return head;
  }
  function drawBallMatrix() {
    if (!ballMatrixHost || rarityAssignments === null) return;
    const active = doc.activeElement, focusQuality = active?.dataset?.ppbuiBallQuality || "", focusValue = active?.value ?? "";
    const text = autoHelperText(doc), labels = qualityLabels(), capsules = matrixCapsules(), table = node("table", "ppbui-auto-ball-matrix"), thead = node("thead"), headRow = node("tr"), tbody = node("tbody");
    const qualityHead = node("th", "", text.quality); qualityHead.scope = "col"; headRow.append(qualityHead);
    const fallbackHead = node("th"), fallback = node("span", "ppbui-auto-ball-head ppbui-auto-ball-head--fallback"), fallbackIcon = node("span", "ppbui-auto-ball-icon", "◎"), fallbackName = node("strong", "", text.ballFallback), fallbackHint = node("small", "", text.ballFallbackHint);
    fallbackIcon.setAttribute("aria-hidden", "true"); fallback.append(fallbackIcon,fallbackName,fallbackHint); fallbackHead.append(fallback); headRow.append(fallbackHead);
    capsules.forEach(item => { const th = node("th"); th.scope = "col"; th.dataset.ppbuiBallId = ids(item); th.append(ballHeader(item,text)); headRow.append(th); });
    thead.append(headRow); ballChoices = [];
    qualityKeys.forEach(quality => {
      const tr = node("tr"), rowLabel = node("th", "", labels.get(quality) || quality[0].toUpperCase() + quality.slice(1)); tr.dataset.ppbuiBallQuality = quality; rowLabel.scope = "row"; rowLabel.style.color = `var(--quality-${quality})`; tr.append(rowLabel);
      const options = [{ value:"", label:text.ballFallback, available:true }, ...capsules.map(item => ({ value:ids(item), label:item.name || item.item?.name || ids(item), available:!item.__ppbuiMissing && qty(item) > 0 }))];
      options.forEach(option => {
        const td = node("td"), choice = node("label", "ppbui-auto-ball-choice"), radio = node("input"); radio.type = "radio"; radio.name = `ppbui-auto-ball-${quality}`; radio.value = option.value; radio.dataset.ppbuiBallQuality = quality; radio.disabled = !option.available && option.value !== ""; radio.checked = String(rarityAssignments?.[quality] || "") === option.value; radio.setAttribute("aria-label", `${rowLabel.textContent}: ${option.label}`);
        radio.addEventListener("change", () => { if (!radio.checked) return; if (radio.value) rarityAssignments[quality] = radio.value; else delete rarityAssignments[quality]; rarityDirty = true; queue(true); });
        choice.append(radio); td.append(choice); tr.append(td); ballChoices.push({ quality, value:option.value, input:radio });
      });
      tbody.append(tr);
    });
    table.append(thead,tbody); ballMatrixHost.replaceChildren(table);
    if (focusQuality) ballChoices.find(entry => entry.quality === focusQuality && entry.value === focusValue)?.input.focus({preventScroll:true});
  }
  function payload() {
    const capture = { enabled: parts.common.checked || parts.shinyCheck.checked, common_enabled: parts.common.checked, common_capsule_item_id: choices[2], shiny_enabled: parts.shinyCheck.checked, shiny_capsule_item_id: choices[3], species_filter: parts.names.value.split(",").map(value => value.trim().toLowerCase()).filter(Boolean), min_quality:"common", mode:"split" };
    if (rarityAssignments !== null && rarityDirty) capture.capsule_by_quality = {...rarityAssignments};
    return [
      capture,
      { enabled:parts.potion.checked, hp_threshold:Number(parts.hp.value), potion_item_id:choices[0], auto_revive:parts.revive.checked, revive_item_id:choices[1] }, null,
      { enabled:!parts.sellCheck.disabled && parts.sellCheck.checked, qualities:parts.sellQualities.filter(input => input.checked).map(input => input.value) },
      parts.extract ? { enabled:!parts.extractCheck.disabled && parts.extractCheck.checked, qualities:parts.extractQualities.filter(input => input.checked).map(input => input.value) } : undefined,
    ];
  }
  function applyDraft(draft) {
    const [capture, potion, , sell, extract] = draft;
    parts.potion.checked = potion.enabled; parts.revive.checked = potion.auto_revive; parts.hp.value = potion.hp_threshold;
    parts.common.checked = capture.common_enabled; parts.shinyCheck.checked = !parts.shinyCheck.disabled && capture.shiny_enabled;
    parts.names.value = capture.species_filter.join(", ");
    parts.sellCheck.checked = !parts.sellCheck.disabled && sell.enabled;
    if (parts.extractCheck) parts.extractCheck.checked = !parts.extractCheck.disabled && !!extract?.enabled;
    parts.sellQualities.forEach(input => { input.checked = sell.qualities.includes(input.value); });
    parts.extractQualities.forEach(input => { input.checked = !!extract?.qualities.includes(input.value); });
    choices = [potion.potion_item_id, potion.revive_item_id, capture.common_capsule_item_id, capture.shiny_capsule_item_id];
    if (rarityAssignments !== null && capture.capsule_by_quality && typeof capture.capsule_by_quality === "object") { rarityAssignments = {...capture.capsule_by_quality}; rarityDirty = true; }
  }
  function queue(immediate) { session.saver.change(payload(), immediate); sync(); }
  function sync() {
    if (!alive) return;
    nativeBus.reconcile();
    const text = autoHelperText(doc), state = session.saver.state();
    if (rarityDirty && state.phase === "saved" && !state.pending) rarityDirty = false;
    content(saveMessage, loadError ? `${text.error}: ${loadError}` : state.phase === "error" ? `${text.error}: ${state.error}` : text[state.phase]);
    const phase = loadError ? "error" : state.phase;
    if (saveState.dataset.state !== phase) saveState.dataset.state = phase;
    const busy = phase === "loading" || phase === "pending" || phase === "saving";
    if (saveState.getAttribute("aria-busy") !== String(busy)) saveState.setAttribute("aria-busy", String(busy));
    content(retry, text.retry); flag(retry, "hidden", !loadError && state.phase !== "error");
    content(refresh, text.refresh); flag(refresh, "disabled", refreshing || !ready);
    if (refresh.title !== stockMessage) refresh.title = stockMessage;
    content(stockStatus, stockMessage);
    groups.forEach(group => {
      const checks = group.key === "support" ? [parts.potion,parts.revive] : group.key === "capture" ? [parts.common,parts.shinyCheck] : [parts.sellCheck,parts.extractCheck].filter(Boolean);
      content(group.summary, `${text[group.key]} · ${checks.filter(input => input.checked && !input.disabled).length}/${checks.length} ${text.enabled.toLowerCase()}`);
    });
    if (!ready) return;
    updatePickers();
    badges.forEach(({ el, input, index }) => {
      let stateText = input.disabled ? text.unavailable : !input.checked ? text.disabled : text.enabled;
      if (!input.disabled && input.checked && index !== undefined && (!items(types[index]).length || (choices[index] && !items(types[index]).some(item => ids(item) === choices[index])))) stateText = text.empty;
      if (input.disabled) stateText += ` · ${pi.t(input === parts.shinyCheck ? "auto_helper.premium_badge" : "auto_helper.auto_sell_license_required")}`;
      content(el, stateText);
      flag(el,"hidden", input === parts.potion || input === parts.revive ? stateText === text.enabled || stateText === text.disabled : false);
    });
    destinationHeaders.forEach(({value, status}) => {
      const master = value === "sell" ? parts.sellCheck : parts.extractCheck;
      content(status, !master.checked || master.disabled ? text.paused : "");
    });
    destinations.forEach(({radios, quality, sell, extract}) => {
      const sellLocked = sell.disabled || parts.sellCheck.disabled, extractLocked = !extract || extract.disabled || parts.extractCheck.disabled;
      const selected = sell.checked ? "sell" : extract?.checked ? "extract" : "keep";
      radios.forEach(radio => {
        flag(radio, "disabled", radio.value === "keep" ? sellLocked && extractLocked : radio.value === "sell" ? sellLocked : extractLocked);
        flag(radio, "checked", radio.value === selected);
        const master = radio.value === "sell" ? parts.sellCheck : radio.value === "extract" ? parts.extractCheck : null;
        const label = `${quality}: ${text[radio.value]}${master && (!master.checked || master.disabled) ? ` — ${text.paused}` : ""}`;
        if (radio.getAttribute("aria-label") !== label) radio.setAttribute("aria-label", label);
      });
    });
    ballChoices.forEach(({quality,value,input}) => {
      const selected = String(rarityAssignments?.[quality] || "") === value;
      const available = !value || inventory.some(item => (item.type || item.item?.type) === "capsule" && ids(item) === value && qty(item) > 0);
      flag(input,"checked",selected); flag(input,"disabled",!available && Boolean(value));
    });
  }
  async function refreshInventory() {
    if (refreshing || !ready || !alive) return;
    refreshing = true; sync();
    try {
      const response = await pi.Api.getInventory();
      if (!alive) return;
      inventory = response.inventory || response.data || response || []; stockMessage = autoHelperText(doc).refreshed; indexStock(); drawPickers(); drawBallMatrix();
    } catch { stockMessage = autoHelperText(doc).refreshError; }
    finally { refreshing = false; sync(); }
  }
  const unsubscribe = session.saver.subscribe(sync);
  listen(retry, "click", () => { if (loadError) void initialize(); else void session.saver.flush(); });
  listen(refresh, "click", refreshInventory);
  const onInventory = () => { void refreshInventory(); };
  nativeBus.bind("inventory.updated", onInventory);
  nativeBus.reconcile();
  async function initialize() {
    loadError = ""; parts.body.inert = true;
    content(saveMessage, autoHelperText(doc).loading); saveState.dataset.state = "loading";
    const beforeLoad = session.saver.state();
    try {
      const [settingsResponse, inventoryResponse] = await Promise.all([pi.Api.getHuntSettings(), pi.Api.getInventory()]);
      if (!alive) return;
      const settings = settingsResponse.data || settingsResponse || {}, potion = settings.auto_potion || {}, capture = settings.auto_capture || {};
      inventory = inventoryResponse.inventory || inventoryResponse.data || inventoryResponse || []; indexStock();
      choices = [potion.potion_item_id || ids(items("potion")[0] || {}) || "", potion.revive_item_id || ids(items("revive")[0] || {}) || "", capture.common_capsule_item_id || capture.capsule_item_id || "", capture.shiny_capsule_item_id || capture.capsule_item_id || ""];
      rarityAssignments = parts.rarityGrid ? {...(capture.capsule_by_quality && typeof capture.capsule_by_quality === "object" ? capture.capsule_by_quality : {})} : null;
      const latest = session.saver.state();
      if (latest.draft && (latest.pending || beforeLoad.pending || latest.revision !== beforeLoad.revision)) applyDraft(latest.draft);
      pickers = parts.pickers.map(original => { const grid = node("div", "ppbui-auto-picker"); replace(original, grid); return {grid}; });
      if (parts.rarityGrid) { ballMatrixHost = node("div", "ppbui-auto-ball-matrix-scroll"); parts.rarity.append(ballMatrixHost); owned.push(ballMatrixHost); drawBallMatrix(); }
      for (const [index, input] of controls.entries()) { const el = node("small", "ppbui-auto-status"); input.parentElement.append(el); owned.push(el); badges.push({el,input,index}); }
      for (const input of [parts.sellCheck, parts.extractCheck].filter(Boolean)) { const el = node("small", "ppbui-auto-status"); input.parentElement.append(el); owned.push(el); badges.push({el,input}); }
      const text = autoHelperText(doc), destinationGroup = groups.find(group => group.key === "destination");
      const tableSection = node("section", "auto-helper-section is-wide"), table = node("table", "ppbui-auto-destinations"), head = node("tr"), tbody = node("tbody");
      head.append(node("th", "", text.quality));
      for (const value of ["keep","sell",...(parts.extract ? ["extract"] : [])]) {
        const heading = node("th", "", text[value]); heading.scope = "col";
        if (value !== "keep") { const status = node("small"); heading.append(status); destinationHeaders.push({value,status}); }
        head.append(heading);
      } const thead = node("thead"); thead.append(head); table.append(thead,tbody);
      const destinationControls = node("div", "ppbui-auto-destination-controls"), help = node("details", "ppbui-auto-destination-help");
      help.append(node("summary","",text.details));
      help.append(node("p", "auto-helper-note", text.destinationNote));
      tableSection.append(destinationControls,help,table); destinationGroup.body.append(tableSection); owned.push(tableSection);
      move(parts.sell,destinationControls); if(parts.extract) move(parts.extract,destinationControls);
      if(parts.licenseTime) move(parts.licenseTime,destinationControls);
      hide(parts.sellHeading); hide(parts.extractHeading);
      for(const note of [...parts.sellNotes,...parts.extractNotes]) move(note,help);
      parts.sellQualities.forEach(sell => {
        const extract = parts.extractQualities.find(input => input.value === sell.value), quality = sell.parentElement.textContent;
        const tr = node("tr"), label = node("th", "", quality), radios = []; label.scope = "row";
        if (["weak","common","uncommon","rare","epic","legendary","mythical"].includes(sell.value)) label.style.color = `var(--quality-${sell.value})`;
        tr.append(label);
        for (const value of ["keep", "sell", ...(extract ? ["extract"] : [])]) {
          const td = node("td"), choice = node("label", "ppbui-auto-destination-choice"), radio = node("input");
          radio.type = "radio"; radio.name = `ppbui-auto-destination-${sell.value}`; radio.value = value;
          choice.append(radio); td.append(choice); tr.append(td); radios.push(radio);
          listen(radio, "change", () => { if (!radio.checked) return; sell.checked = value === "sell"; if (extract) extract.checked = value === "extract"; queue(true); });
        }
        tbody.append(tr); destinations.push({radios,quality,sell,extract});
      });
      for (const original of [parts.sellGrid, parts.extractGrid].filter(Boolean)) { const placeholder = node("span"); placeholder.hidden = true; replace(original, placeholder); }
      const nativeInputs = [parts.potion,parts.revive,parts.hp,parts.common,parts.shinyCheck,parts.sellCheck,parts.extractCheck,parts.names].filter(Boolean);
      for (const type of ["change", "input"]) listen(root, type, event => {
        if (!nativeInputs.includes(event.target)) return;
        event.stopImmediatePropagation();
        if (event.target === parts.names ? type === "input" : type === "change") queue(event.target !== parts.names);
      }, true);
      parts.body.inert = wasInert; ready = true; drawPickers(); sync();
      parts.body.scrollTop = session.scroll || 0;
      const target = session.focus?.kind === "input" ? nativeInputs[session.focus.index]
        : session.focus?.kind === "picker" ? pickers[session.focus.index]?.select
        : session.focus?.kind === "destination" ? destinations[session.focus.index]?.radios.find(radio => radio.value === session.focus.value)
        : session.focus?.kind === "ball" ? ballChoices.find(entry => entry.quality === session.focus.quality && entry.value === session.focus.value)?.input : null;
      target?.focus({preventScroll:true});
      if (target === parts.names && session.selection) target.setSelectionRange(...session.selection);
      listen(root, "focusin", () => {
        const active = doc.activeElement, inputIndex = nativeInputs.indexOf(active), pickerIndex = pickers.findIndex(picker => picker.grid.contains(active)), destinationIndex = destinations.findIndex(item => item.radios.includes(active)), ballEntry = ballChoices.find(entry => entry.input === active);
        session.focus = inputIndex >= 0 ? {kind:"input",index:inputIndex} : pickerIndex >= 0 ? {kind:"picker",index:pickerIndex,id:active.dataset.ppbuiItem} : destinationIndex >= 0 ? {kind:"destination",index:destinationIndex,value:active.value} : ballEntry ? {kind:"ball",quality:ballEntry.quality,value:ballEntry.value} : null;
      });
      listen(parts.names, "keyup", () => { session.selection = [parts.names.selectionStart,parts.names.selectionEnd]; });
    } catch (error) { if (alive) { parts.body.inert = wasInert; loadError = error.message; sync(); } }
  }
  void initialize();
  return { sync, cleanup() {
    alive = false; session.scroll = parts.body.scrollTop;
    if (session.saver.state().phase !== "error") void session.saver.flush(); unsubscribe(); listeners.forEach(remove => remove()); nativeBus.cleanup();
    for (const {el,next} of replacements.reverse()) if (next.parentNode) next.replaceWith(el);
    for (const {el,anchor} of moves.reverse()) if (anchor.parentNode) anchor.replaceWith(el);
    owned.forEach(el => el.remove());
    hiddenWarnings.forEach(({el,hidden}) => {el.hidden=hidden;el.classList.remove("ppbui-auto-original");});
    if (nativeStatus) { nativeStatus.hidden = false; nativeStatus.classList.remove("ppbui-auto-original"); }
    hiddenNodes.forEach(({el,hidden})=>{el.hidden=hidden;el.classList.remove("ppbui-auto-original");});
    hpRow.classList.remove("ppbui-auto-support-condition");
    parts.support.classList.remove("ppbui-auto-support"); parts.body.inert = wasInert;
    for (const {el,name} of ownedClasses.reverse()) el.classList.remove(name);
    root.removeAttribute("data-ppbui-auto-helper");
  } };
}
