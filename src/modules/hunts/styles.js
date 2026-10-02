export const huntsStyles = `
  .ppbui-hunts-enhanced {
    border:var(--ppbui-border-width) solid var(--ppbui-border-strong) !important;
    border-radius:var(--ppbui-window-radius) !important;
    background:var(--ppbui-bg-1) !important;
    color:var(--ppbui-text);
    font:var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body);
    box-shadow:var(--ppbui-shadow-raised) !important;
  }
  .ppbui-hunts-enhanced .pokeidle-panel__titlebar {
    min-height:var(--ppbui-control-height);
    border:0 !important;
    border-bottom:var(--ppbui-border-width) solid var(--ppbui-border-strong) !important;
    border-radius:var(--ppbui-radius) !important;
    background:var(--ppbui-bg-2) !important;
    color:var(--ppbui-text) !important;
    box-shadow:none !important;
  }
  .ppbui-hunts-enhanced .ppbui-hunts-title {
    font-family:var(--ppbui-font-display) !important;
    font-size:15px !important;
    font-weight:500 !important;
    line-height:1.2 !important;
    letter-spacing:normal !important;
    text-shadow:none !important;
  }
  .ppbui-hunts-enhanced .pokeidle-panel__titlebar button {
    -webkit-appearance:none;
    appearance:none;
    min-width:var(--ppbui-icon-button-size);
    min-height:var(--ppbui-icon-button-size);
    border:0 !important;
    border-left:var(--ppbui-separator-width) solid var(--ppbui-border) !important;
    border-radius:var(--ppbui-radius) !important;
    background:var(--ppbui-bg-2) !important;
    color:var(--ppbui-text-muted) !important;
    font-family:var(--ppbui-font-body) !important;
    letter-spacing:normal;
    text-shadow:none;
    box-shadow:none !important;
  }
  .ppbui-hunts-enhanced .pokeidle-panel__titlebar button:hover:not(:disabled) {
    background:var(--ppbui-bg-3) !important;
    color:var(--ppbui-text) !important;
  }
  .ppbui-hunts-enhanced .pokeidle-panel__titlebar button:active:not(:disabled) {
    background:var(--ppbui-bg-0) !important;
    box-shadow:none!important;
  }
  .ppbui-hunts-enhanced .pokeidle-panel__titlebar button:focus-visible {
    outline:var(--ppbui-focus-width) solid var(--ppbui-focus);
    outline-offset:calc(-1 * var(--ppbui-border-width));
  }
  .ppbui-hunts-enhanced .pokeidle-panel__titlebar button:disabled {
    cursor:default;
    background:var(--ppbui-bg-1) !important;
    color:var(--ppbui-text-subtle) !important;
  }
  .ppbui-hunts-enhanced > .pokeidle-panel__body {
    container-type:inline-size;
    gap:var(--ppbui-space-2);
    background:var(--ppbui-bg-1);
    color:var(--ppbui-text);
  }

  /* Atlas rail */
  .ppbui-hunts-enhanced .hunt-world-header.ppbui-hunts-atlas-rail {
    display:flex !important;
    align-items:stretch;
    box-sizing:border-box;
    min-width:0;
    min-height:calc(var(--ppbui-control-height) + 2 * var(--ppbui-border-width));
    margin:0 !important;
    padding:0 !important;
    gap:0 !important;
    border:var(--ppbui-border-width) solid var(--ppbui-border);
    background:var(--ppbui-bg-2);
    box-shadow:none;
  }
  .ppbui-hunts-enhanced .hunt-world-tabs {
    display:flex !important;
    align-items:stretch;
    flex:1 1 auto;
    box-sizing:border-box;
    height:auto !important;
    min-width:0;
    min-height:var(--ppbui-control-height);
    margin:0 !important;
    padding:0 !important;
    gap:0 !important;
    border:0 !important;
    background:transparent !important;
  }
  .ppbui-hunts-enhanced .hunt-world-tabs > button,
  .ppbui-hunts-enhanced .hunt-world-tabs .hunt-category-tab,
  .ppbui-hunts-enhanced .hunt-world-zoom > button {
    -webkit-appearance:none;
    appearance:none;
    box-sizing:border-box;
    height:var(--ppbui-control-height) !important;
    min-height:var(--ppbui-control-height);
    margin:0 !important;
    border:0 !important;
    border-right:var(--ppbui-separator-width) solid var(--ppbui-border) !important;
    border-radius:var(--ppbui-radius) !important;
    background:var(--ppbui-bg-1) !important;
    color:var(--ppbui-text-muted) !important;
    font:600 var(--ppbui-font-size-secondary)/var(--ppbui-line-height-tight) var(--ppbui-font-body);
    box-shadow:none !important;
  }
  .ppbui-hunts-enhanced .hunt-world-tabs > button,
  .ppbui-hunts-enhanced .hunt-world-tabs .hunt-category-tab {
    display:flex !important;
    align-items:center;
    justify-content:center;
    flex:1 1 0 !important;
    width:auto !important;
    max-width:none !important;
    min-width:0;
    align-self:stretch !important;
    padding:0 var(--ppbui-control-padding-x) !important;
  }
  .ppbui-hunts-enhanced .hunt-world-tabs > button:hover:not(:disabled):not(.is-active):not([aria-selected="true"]),
  .ppbui-hunts-enhanced .hunt-world-tabs .hunt-category-tab:hover:not(:disabled):not(.is-active):not([aria-selected="true"]),
  .ppbui-hunts-enhanced .hunt-world-zoom > button:hover:not(:disabled) {
    background:var(--ppbui-bg-3) !important;
    color:var(--ppbui-text) !important;
  }
  .ppbui-hunts-enhanced .hunt-world-tabs > button:active:not(:disabled),
  .ppbui-hunts-enhanced .hunt-world-tabs .hunt-category-tab:active:not(:disabled),
  .ppbui-hunts-enhanced .hunt-world-zoom > button:active:not(:disabled) {
    background:var(--ppbui-bg-0) !important;
    box-shadow:none!important;
  }
  .ppbui-hunts-enhanced .hunt-world-tabs > button.is-active,
  .ppbui-hunts-enhanced .hunt-world-tabs .hunt-category-tab.is-active,
  .ppbui-hunts-enhanced .hunt-world-tabs > button[aria-selected="true"],
  .ppbui-hunts-enhanced .hunt-world-tabs .hunt-category-tab[aria-selected="true"] {
    background:var(--ppbui-bg-3) !important;
    color:var(--ppbui-selected) !important;
    box-shadow:none!important;
  }
  .ppbui-hunts-enhanced .hunt-world-tabs > button:disabled,
  .ppbui-hunts-enhanced .hunt-world-tabs .hunt-category-tab:disabled,
  .ppbui-hunts-enhanced .hunt-world-zoom > button:disabled {
    cursor:default;
    background:var(--ppbui-bg-1) !important;
    color:var(--ppbui-text-subtle) !important;
    box-shadow:none !important;
  }
  .ppbui-hunts-enhanced .hunt-world-header-actions {
    display:flex !important;
    flex:0 0 auto;
    align-items:stretch;
    box-sizing:border-box;
    height:auto !important;
    min-height:var(--ppbui-control-height);
    margin:0 !important;
    padding:0 !important;
    gap:0 !important;
    border-left:var(--ppbui-separator-width) solid var(--ppbui-border);
  }
  .ppbui-hunts-enhanced .hunt-world-tabs > :last-child { border-right:0 !important; }
  .ppbui-hunts-enhanced .hunt-world-zoom {
    display:flex !important;
    align-items:stretch;
    box-sizing:border-box;
    height:auto !important;
    min-height:var(--ppbui-control-height);
    margin:0 !important;
    padding:0 !important;
    gap:0 !important;
    border:0 !important;
    background:var(--ppbui-bg-2);
  }
  .ppbui-hunts-enhanced .hunt-world-zoom > button {
    align-self:stretch;
    padding:0 var(--ppbui-control-padding-x) !important;
    background:var(--ppbui-bg-2) !important;
  }
  .ppbui-hunts-enhanced .hunt-world-zoom > button:last-child { border-right:0 !important; }

  .ppbui-hunts-enhanced .ppbui-hunts-gym {
    -webkit-appearance:none;
    appearance:none;
    box-sizing:border-box;
    flex:0 0 auto;
    min-height:var(--ppbui-control-height);
    padding:0 var(--ppbui-control-padding-x);
    border:var(--ppbui-border-width) solid var(--ppbui-border-strong);
    border-radius:var(--ppbui-radius);
    background:var(--ppbui-bg-2);
    color:var(--ppbui-text);
    box-shadow:none;
    font:600 var(--ppbui-font-size-secondary)/var(--ppbui-line-height-tight) var(--ppbui-font-body);
    white-space:nowrap;
  }
  .ppbui-hunts-enhanced .ppbui-hunts-gym:hover:not(:disabled) {
    border-color:var(--ppbui-border-strong);
    background:var(--ppbui-bg-3);
  }
  .ppbui-hunts-enhanced .ppbui-hunts-gym:active:not(:disabled) { background:var(--ppbui-bg-0); }
  .ppbui-hunts-enhanced .ppbui-hunts-gym:focus-visible {
    outline:var(--ppbui-focus-width) solid var(--ppbui-focus);
    outline-offset:var(--ppbui-pixel-unit);
  }
  .ppbui-hunts-enhanced .ppbui-hunts-gym:disabled {
    cursor:default;
    border-color:var(--ppbui-border);
    background:var(--ppbui-bg-1);
    color:var(--ppbui-text-subtle);
  }

  /* Native notice participates in Atlas/Finder status language. */
  .ppbui-hunts-enhanced .hunt-world-notice:empty { display:none; }
  .ppbui-hunts-enhanced .hunt-world-notice:not(:empty) {
    margin:0;
    padding:var(--ppbui-space-3) var(--ppbui-space-4);
    border:0;
    border-left:var(--ppbui-border-width) solid var(--ppbui-info);
    background:var(--ppbui-bg-2);
    color:var(--ppbui-text-muted);
    box-shadow:none;
    font-size:var(--ppbui-font-size-secondary);
  }

  /* Finder rail: one supporting surface, three semantic lines. */
  .ppbui-hunts-finder {
    display:grid;
    grid-template-columns:minmax(0,1fr);
    min-width:0;
    border:var(--ppbui-border-width) solid var(--ppbui-border);
    background:var(--ppbui-bg-2);
    box-shadow:none;
  }
  .ppbui-hunts-finder > .hunt-world-toolbar {
    display:grid;
    grid-template-columns:minmax(160px,1fr) auto 64px auto 64px auto;
    align-items:center;
    gap:var(--ppbui-space-2);
    min-width:0;
    margin:0;
    padding:var(--ppbui-space-3);
  }
  .ppbui-hunts-finder > .hunt-world-elements {
    display:flex;
    flex-wrap:wrap;
    gap:var(--ppbui-space-2);
    margin:0 !important;
    padding:var(--ppbui-space-3);
    border-top:var(--ppbui-separator-width) solid var(--ppbui-border);
  }
  .ppbui-hunts-finder > .ppbui-hunts-results {
    border-top:var(--ppbui-separator-width) solid var(--ppbui-border);
  }
  .ppbui-hunts-enhanced .hunt-world-toolbar input,
  .ppbui-hunts-enhanced .hunt-world-toolbar button,
  .ppbui-hunts-results select {
    box-sizing:border-box;
    min-height:var(--ppbui-control-height);
    border:var(--ppbui-border-width) solid var(--ppbui-border-strong) !important;
    border-radius:var(--ppbui-radius) !important;
    color:var(--ppbui-text) !important;
    box-shadow:none !important;
    font:400 var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body);
  }
  .ppbui-hunts-enhanced .hunt-world-toolbar input,
  .ppbui-hunts-results select {
    min-width:0;
    padding:0 var(--ppbui-control-padding-x);
    background:var(--ppbui-bg-0) !important;
  }
  .ppbui-hunts-enhanced .hunt-world-toolbar input[type="search"] {
    -webkit-appearance:none;
    appearance:none !important;
    -webkit-border-radius:var(--ppbui-radius) !important;
    border-radius:var(--ppbui-radius) !important;
    clip-path:none !important;
    background-clip:border-box !important;
  }
  .ppbui-hunts-enhanced .hunt-world-toolbar input[type="search"]::-webkit-search-cancel-button,
  .ppbui-hunts-enhanced .hunt-world-toolbar input[type="search"]::-webkit-search-decoration {
    -webkit-appearance:none;
    appearance:none;
    display:none;
  }
  .ppbui-hunts-enhanced .hunt-world-toolbar input[type="number"] {
    -moz-appearance:textfield;
    -webkit-appearance:none !important;
    appearance:none !important;
    -webkit-border-radius:var(--ppbui-radius) !important;
    border-radius:var(--ppbui-radius) !important;
    clip-path:none !important;
    background-clip:border-box !important;
  }
  .ppbui-hunts-enhanced .hunt-world-toolbar input[type="number"]::-webkit-inner-spin-button,
  .ppbui-hunts-enhanced .hunt-world-toolbar input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance:none;
    appearance:none;
    margin:0;
  }
  .ppbui-hunts-enhanced .hunt-world-toolbar button {
    -webkit-appearance:none;
    appearance:none !important;
    padding:0 var(--ppbui-control-padding-x);
    background:var(--ppbui-bg-2) !important;
    border-color:var(--ppbui-border-strong) !important;
    font-weight:600;
    cursor:pointer;
  }
  .ppbui-hunts-enhanced .hunt-world-toolbar input:hover:not(:disabled),
  .ppbui-hunts-results select:hover:not(:disabled) { border-color:var(--ppbui-border-strong) !important; }
  .ppbui-hunts-enhanced .hunt-world-toolbar button:hover:not(:disabled) { background:var(--ppbui-bg-3) !important; }
  .ppbui-hunts-enhanced .hunt-world-toolbar button:active:not(:disabled) {
    background:var(--ppbui-bg-0) !important;
    box-shadow:none!important;
  }
  .ppbui-hunts-enhanced .hunt-world-toolbar input:disabled,
  .ppbui-hunts-enhanced .hunt-world-toolbar button:disabled,
  .ppbui-hunts-results select:disabled {
    cursor:default;
    border-color:var(--ppbui-border) !important;
    background:var(--ppbui-bg-1) !important;
    color:var(--ppbui-text-subtle) !important;
    box-shadow:none !important;
  }
  .ppbui-hunts-enhanced .hunt-world-level-label {
    color:var(--ppbui-text-subtle);
    font:600 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-data);
    white-space:nowrap;
  }
  .ppbui-hunts-enhanced .hunt-world-elements button {
    min-height:var(--ppbui-control-height);
    padding:0 var(--ppbui-space-3);
    border:var(--ppbui-border-width) solid var(--ppbui-border-strong);
    border-radius:var(--ppbui-radius-badge);
    background:var(--ppbui-bg-1);
    color:var(--ppbui-text-muted);
    font:600 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body);
  }
  .ppbui-hunts-enhanced .hunt-world-elements button:hover:not(:disabled):not(.is-active):not([aria-pressed="true"]) {
    border-color:var(--ppbui-border-strong);
    background:var(--ppbui-bg-3);
    color:var(--ppbui-text);
  }
  .ppbui-hunts-enhanced .hunt-world-elements button:active:not(:disabled) {
    background:var(--ppbui-bg-0);
    box-shadow:none!important;
  }
  .ppbui-hunts-enhanced .hunt-world-elements button.is-active,
  .ppbui-hunts-enhanced .hunt-world-elements button[aria-pressed="true"] {
    border-color:var(--ppbui-selected);
    background:var(--ppbui-bg-3);
    color:var(--ppbui-text);
  }
  .ppbui-hunts-enhanced .hunt-world-elements button:disabled {
    cursor:default;
    border-color:var(--ppbui-border);
    background:var(--ppbui-bg-1);
    color:var(--ppbui-text-subtle);
    box-shadow:none;
  }

  .ppbui-hunts-results {
    display:grid;
    grid-template-columns:minmax(0,1fr) auto auto auto;
    grid-template-areas:"select count locate reset" "status status status status";
    align-items:center;
    gap:var(--ppbui-space-2);
    min-width:0;
    padding:var(--ppbui-space-3);
  }
  .ppbui-hunts-select-wrap { position:relative; grid-area:select; min-width:0; }
  .ppbui-hunts-select-wrap::after {
    content:"";
    position:absolute;
    top:50%;
    right:10px;
    width:6px;
    height:6px;
    border-right:var(--ppbui-border-width) solid var(--ppbui-text-muted);
    border-bottom:var(--ppbui-border-width) solid var(--ppbui-text-muted);
    pointer-events:none;
    transform:translateY(-65%) rotate(45deg);
  }
  .ppbui-hunts-results select {
    width:100%;
    padding-right:28px;
    -webkit-appearance:none;
    appearance:none !important;
    background-image:none !important;
  }
  .ppbui-hunts-results > button:first-of-type { grid-area:locate; }
  .ppbui-hunts-results > button:last-of-type { grid-area:reset; }
  .ppbui-hunts-results > [role="status"] {
    grid-area:status;
    min-width:0;
    min-height:16px;
    overflow:hidden;
    color:var(--ppbui-text-subtle);
    font:600 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body);
    text-overflow:ellipsis;
    white-space:nowrap;
  }
  .ppbui-hunts-results > .hunt-world-count {
    grid-area:count;
    margin:0;
    padding:2px var(--ppbui-space-2);
    border:var(--ppbui-separator-width) solid var(--ppbui-border-strong);
    border-radius:var(--ppbui-radius-badge);
    background:var(--ppbui-bg-3);
    color:var(--ppbui-text-muted);
    font:600 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-data);
    font-variant-numeric:tabular-nums;
    white-space:nowrap;
  }

  /* Dominant map workspace + attached inspector. */
  .ppbui-hunts-atlas-workspace {
    display:grid;
    grid-template-columns:minmax(0,1fr);
    flex:1 1 auto;
    min-width:0;
    min-height:0;
    overflow:hidden;
    border:var(--ppbui-border-width) solid var(--ppbui-border);
    background:var(--ppbui-bg-0);
    box-shadow:var(--ppbui-shadow);
  }
  .ppbui-hunts-atlas-workspace.is-inspector-open {
    grid-template-columns:minmax(300px,1fr) clamp(280px,32%,320px);
  }
  .ppbui-hunts-atlas-workspace > .hunt-world-viewport {
    min-width:0;
    min-height:0;
    border:0;
    background:var(--ppbui-bg-0);
  }
  .ppbui-hunts-inspector {
    position:relative !important;
    inset:auto !important;
    z-index:auto !important;
    display:grid;
    grid-template-rows:auto minmax(0,1fr) auto;
    width:100%;
    min-width:0;
    max-width:none;
    max-height:none;
    height:100%;
    box-sizing:border-box;
    overflow:hidden;
    pointer-events:auto;
    padding:0;
    border:0;
    border-left:var(--ppbui-border-width) solid var(--ppbui-border-strong);
    border-radius:var(--ppbui-radius);
    background:var(--ppbui-bg-1);
    color:var(--ppbui-text);
    box-shadow:none;
    font:var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body);
  }
  .ppbui-hunts-inspector[hidden] { display:none !important; }
  .ppbui-hunts-inspector:focus-visible {
    outline:var(--ppbui-focus-width) solid var(--ppbui-focus);
    outline-offset:calc(-1 * var(--ppbui-border-width));
  }
  .ppbui-hunts-inspector__header {
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:var(--ppbui-space-4);
    padding:var(--ppbui-space-4);
    border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border);
    background:var(--ppbui-bg-2);
  }
  .ppbui-hunts-inspector__header > div { min-width:0; }
  .ppbui-hunts-inspector__title {
    display:block;
    min-width:0;
    margin:0 0 var(--ppbui-space-1);
    overflow:hidden;
    color:var(--ppbui-accent-hi);
    font:700 var(--ppbui-font-size-title)/var(--ppbui-line-height-tight) var(--ppbui-font-body);
    text-overflow:ellipsis;
    white-space:nowrap;
  }
  .ppbui-hunts-inspector__header small {
    display:block;
    color:var(--ppbui-text-subtle);
    font:600 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-data);
  }
  .ppbui-hunts-inspector__body {
    min-height:0;
    overflow-x:hidden;
    overflow-y:auto;
    padding:var(--ppbui-space-4);
    scrollbar-gutter:stable;
  }
  .ppbui-hunts-inspector__footer {
    padding:var(--ppbui-space-4);
    border-top:var(--ppbui-separator-width) solid var(--ppbui-border);
    background:var(--ppbui-bg-2);
  }
  .ppbui-hunts-inspector__mode { min-width:0; }
  .ppbui-hunts-inspector__mode .hunt-presentation-toggle {
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:0;
    width:100%;
    padding:0;
    border:var(--ppbui-border-width) solid var(--ppbui-border);
    background:var(--ppbui-bg-1);
  }
  .ppbui-hunts-inspector__mode .hunt-presentation-toggle button {
    min-height:var(--ppbui-control-height);
    border:0;
    border-right:var(--ppbui-separator-width) solid var(--ppbui-border);
    border-radius:var(--ppbui-radius);
    background:transparent;
    color:var(--ppbui-text-muted);
    font:600 var(--ppbui-font-size-meta)/var(--ppbui-line-height-tight) var(--ppbui-font-body);
  }
  .ppbui-hunts-inspector__mode .hunt-presentation-toggle button:last-child { border-right:0; }
  .ppbui-hunts-inspector__mode .hunt-presentation-toggle button.is-active,
  .ppbui-hunts-inspector__mode .hunt-presentation-toggle button[aria-pressed="true"] {
    background:var(--ppbui-bg-3);
    color:var(--ppbui-selected);
    box-shadow:none!important;
  }
  .ppbui-hunts-inspector__mode .hunt-presentation-toggle button:hover:not(:disabled):not(.is-active):not([aria-pressed="true"]) {
    background:var(--ppbui-bg-3);
    color:var(--ppbui-text);
  }
  .ppbui-hunts-inspector__mode .hunt-presentation-toggle button:active:not(:disabled) {
    background:var(--ppbui-bg-0);
    box-shadow:none!important;
  }
  .ppbui-hunts-inspector__mode .hunt-presentation-toggle button:disabled {
    cursor:default;
    background:var(--ppbui-bg-1);
    color:var(--ppbui-text-subtle);
    box-shadow:none;
  }
  .ppbui-hunts-inspector__hunt {
    width:100%;
    min-height:var(--ppbui-control-height);
    margin-top:var(--ppbui-space-5);
    padding:0 var(--ppbui-control-padding-x);
    border:var(--ppbui-border-width) solid var(--ppbui-accent) !important;
    border-radius:var(--ppbui-window-radius) !important;
    background:var(--ppbui-bg-0) !important;
    color:var(--ppbui-accent-hi) !important;
    font:700 var(--ppbui-font-size-body)/var(--ppbui-line-height-tight) var(--ppbui-font-body) !important;
    box-shadow:none !important;
  }
  .ppbui-hunts-inspector__hunt:hover:not(:disabled) {
    border-color:var(--ppbui-accent-hi) !important;
    color:var(--ppbui-accent-hi) !important;
  }
  .ppbui-hunts-inspector__hunt:active:not(:disabled) {
    transform:none;
    border-color:var(--ppbui-accent-hi) !important;
    background:var(--ppbui-action-bg) !important;
    box-shadow:none !important;
  }
  .ppbui-hunts-inspector__hunt:focus-visible {
    outline:var(--ppbui-focus-width) solid var(--ppbui-focus);
    outline-offset:var(--ppbui-pixel-unit);
  }
  .ppbui-hunts-inspector__hunt:disabled {
    cursor:default;
    border-color:var(--ppbui-border-strong) !important;
    background:var(--ppbui-bg-2) !important;
    color:var(--ppbui-text-subtle) !important;
    box-shadow:none !important;
  }
  .ppbui-hunts-inspector__hunt[aria-busy="true"] { cursor:progress; }

  /* Map markers stay sprite-first. PPBUI owns a compact caption only, never a tile behind the sprite. */
  .ppbui-hunts-enhanced .hunt-map-marker,
  .ppbui-hunts-enhanced .hunt-map-marker:hover,
  .ppbui-hunts-enhanced .hunt-map-marker:active {
    border:0 !important;
    border-radius:var(--ppbui-radius) !important;
    background:transparent !important;
    background-image:none !important;
    box-shadow:none !important;
  }
  .ppbui-hunts-enhanced .hunt-map-marker::before,
  .ppbui-hunts-enhanced .hunt-map-marker::after {
    display:none !important;
    content:none !important;
  }
  .ppbui-hunts-enhanced .hunt-map-marker:hover > .hunt-map-marker__sprite {
    filter:drop-shadow(0 0 2px var(--ppbui-accent-hi)) !important;
  }
  .ppbui-hunts-enhanced .hunt-map-marker__name {
    --ppbui-hunt-location-rail:transparent;
    padding:1px var(--ppbui-space-2) !important;
    border:var(--ppbui-separator-width) solid var(--ppbui-border-strong) !important;
    border-radius:var(--ppbui-radius) !important;
    background:var(--ppbui-bg-0) !important;
    color:var(--ppbui-text) !important;
    box-shadow:none!important;
    opacity:1;
  }
  .ppbui-hunts-enhanced .hunt-map-marker:hover .hunt-map-marker__name:not(.ppbui-hunts-selected) {
    border-color:var(--ppbui-accent-hi) !important;
    background:var(--ppbui-bg-0) !important;
  }
  .ppbui-hunts-enhanced .hunt-map-marker:active .hunt-map-marker__name {
    transform:none;
    box-shadow:none!important;
  }
  .ppbui-hunts-enhanced .hunt-map-marker.ppbui-hunts-selected-marker,
  .ppbui-hunts-enhanced .hunt-map-marker.ppbui-hunts-located-marker { z-index:20; }
  .ppbui-hunts-enhanced .hunt-map-marker.ppbui-hunts-dimmed-marker > .hunt-map-marker__sprite { opacity:.10 !important; }
  .ppbui-hunts-enhanced .hunt-map-marker.ppbui-hunts-located-marker > .hunt-map-marker__sprite { opacity:1 !important; }
  .ppbui-hunts-enhanced .hunt-map-marker__name.ppbui-hunts-selected {
    border-color:var(--ppbui-selected) !important;
    background:var(--ppbui-bg-0) !important;
  }
  .ppbui-hunts-enhanced .hunt-map-marker__name.ppbui-hunts-located {
    --ppbui-hunt-location-rail:var(--ppbui-info);
    border-color:var(--ppbui-border-strong) !important;
    border-bottom-color:var(--ppbui-info) !important;
  }
  .ppbui-hunts-enhanced .hunt-map-marker__name.ppbui-hunts-selected.ppbui-hunts-located {
    --ppbui-hunt-location-rail:var(--ppbui-info);
    border-color:var(--ppbui-selected) !important;
    border-bottom-color:var(--ppbui-info) !important;
    background:var(--ppbui-bg-0) !important;
  }
  .ppbui-hunts-enhanced .hunt-map-marker:focus-visible .hunt-map-marker__name {
    outline:var(--ppbui-focus-width) solid var(--ppbui-focus);
    outline-offset:var(--ppbui-pixel-unit);
  }
  .ppbui-hunts-enhanced .hunt-map-marker__name.ppbui-hunts-dimmed { opacity:.10; }
  .ppbui-hunts-enhanced .hunt-map-marker:focus-visible .hunt-map-marker__name.ppbui-hunts-dimmed { opacity:1; }
  .ppbui-hunts-enhanced .hunt-map-marker.ppbui-hunts-locate-flash > .hunt-map-marker__sprite {
    animation:ppbui-hunts-locate-flash .8s steps(4,end) 1 !important;
  }
  @keyframes ppbui-hunts-locate-flash {
    0%,100% { filter:drop-shadow(0 2px 1px #000) drop-shadow(0 0 5px var(--marker-color)); }
    45% { filter:brightness(1.35) saturate(1.15) drop-shadow(0 2px 1px #000) drop-shadow(0 0 10px var(--ppbui-info)); }
  }

  /* Inspector information rhythm stays flat. */
  .ppbui-hunts-elements,
  .ppbui-hunts-relation {
    display:grid;
    align-items:start;
    grid-template-columns:76px minmax(0,1fr);
    column-gap:var(--ppbui-space-3);
  }
  .ppbui-hunts-elements {
    padding-bottom:var(--ppbui-space-4);
    border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border);
  }
  .ppbui-hunts-relation { padding:var(--ppbui-space-2) 0; }
  .ppbui-hunts-relation + .ppbui-hunts-relation { border-top:var(--ppbui-separator-width) solid var(--ppbui-border); }
  .ppbui-hunts-field-label {
    display:flex;
    align-items:center;
    min-height:24px;
    color:var(--ppbui-text-subtle);
    font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body);
    text-transform:uppercase;
  }
  .ppbui-hunts-badge-list { display:flex; flex-wrap:wrap; align-items:center; gap:var(--ppbui-space-2) var(--ppbui-space-4); }
  .ppbui-hunts-empty { color:var(--ppbui-text-subtle); font:600 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body); }
  .ppbui-hunts-element-badge,
  .ppbui-hunts-relation-badge {
    display:inline-grid;
    grid-template-columns:auto auto;
    align-items:center;
    gap:var(--ppbui-space-2);
    min-height:22px;
    padding:1px 0;
    border:0;
    border-radius:var(--ppbui-radius);
    background:transparent;
    color:var(--ppbui-text);
  }
  .ppbui-hunts-relation-badge > b { color:var(--ppbui-accent-hi); font-family:var(--ppbui-font-data); font-variant-numeric:tabular-nums; }
  .ppbui-hunts-section-title {
    margin:var(--ppbui-space-5) 0 var(--ppbui-space-2);
    padding-top:var(--ppbui-space-3);
    border-top:var(--ppbui-separator-width) solid var(--ppbui-border);
    color:var(--ppbui-text-subtle);
    font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body);
    letter-spacing:.06em;
    text-transform:uppercase;
  }
  .ppbui-hunts-drop-list { display:grid !important; grid-template-columns:minmax(0,1fr) !important; gap:0 !important; }
  .ppbui-hunts-drop-item {
    display:grid !important;
    grid-template-columns:auto minmax(0,1fr) auto !important;
    align-items:center;
    min-height:34px;
    gap:var(--ppbui-space-3);
    padding:var(--ppbui-space-2) 0;
    border:0;
    border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border);
    background:transparent;
  }
  .ppbui-hunts-drop-name { min-width:0; overflow:hidden; color:var(--ppbui-text); text-overflow:ellipsis; white-space:nowrap; }
  .ppbui-hunts-drop-value {
    display:inline-flex;
    align-items:center;
    justify-content:flex-end;
    gap:var(--ppbui-space-1);
    color:var(--ppbui-accent-hi);
    font-family:var(--ppbui-font-data);
    font-variant-numeric:tabular-nums;
    white-space:nowrap;
  }
  .ppbui-hunts-drop-value * { overflow:visible; text-overflow:clip; }

  /* Current upstream Hunt selector: MAP and LIST share one navigation/composition shell. */
  .ppbui-hunts-current .hunt-selection-shell {
    display:grid !important;
    grid-template-columns:minmax(220px,280px) minmax(0,1fr);
    align-items:stretch;
    gap:var(--ppbui-space-3) !important;
    min-width:0;
    min-height:0;
  }
  .ppbui-hunts-current .hunt-selection-sidebar {
    display:grid !important;
    grid-template-columns:minmax(0,1fr);
    align-content:start;
    gap:var(--ppbui-space-3) !important;
    box-sizing:border-box;
    min-width:0;
    padding:var(--ppbui-space-3) !important;
    border:var(--ppbui-border-width) solid var(--ppbui-border) !important;
    border-radius:var(--ppbui-radius) !important;
    background:var(--ppbui-bg-1) !important;
    box-shadow:none !important;
  }
  .ppbui-hunts-current .hunt-selection-content {
    display:flex !important;
    min-width:0;
    min-height:0;
    flex-direction:column;
    align-items:stretch;
  }
  .ppbui-hunts-current .hunt-list-header,
  .ppbui-hunts-current .hunt-list-toolbar,
  .ppbui-hunts-current-list .hunt-list-table-shell { min-width:0; }
  .ppbui-hunts-current .hunt-list-header {
    display:grid !important;
    grid-template-columns:minmax(0,1fr);
    align-items:stretch;
    gap:var(--ppbui-space-2) !important;
    min-width:0;
  }
  .ppbui-hunts-current .hunt-list-header > .ppbui-hunts-gym {
    align-self:stretch;
    justify-self:stretch;
    width:100%;
    min-width:0;
    min-height:calc(var(--ppbui-control-height) + 4px);
    font-weight:700;
  }
  .ppbui-hunts-current .hunt-list-world-tabs {
    display:grid !important;
    grid-template-columns:repeat(auto-fit,minmax(120px,1fr));
    gap:var(--ppbui-space-2) !important;
    min-width:0;
    width:100%;
  }
  .ppbui-hunts-current .hunt-list-world-tab {
    box-sizing:border-box;
    min-width:0;
    width:100%;
    min-height:calc(var(--ppbui-control-height) + 6px);
    font-family:var(--ppbui-font-body) !important;
    font-weight:600 !important;
  }
  .ppbui-hunts-current .hunt-list-world-tab:not(:disabled):not(.is-active):not([aria-current="page"]):hover {
    border-color:var(--ppbui-border-strong) !important;
    background:var(--ppbui-bg-2) !important;
    color:var(--ppbui-text) !important;
  }
  .ppbui-hunts-current .hunt-list-world-tab.is-active,
  .ppbui-hunts-current .hunt-list-world-tab[aria-current="page"] {
    border-color:var(--ppbui-selected) !important;
    background:var(--ppbui-bg-3) !important;
    color:var(--ppbui-selected) !important;
    box-shadow:inset 0 calc(-1 * var(--ppbui-border-width)) 0 var(--ppbui-selected) !important;
  }
  .ppbui-hunts-current .hunt-list-world-tab:disabled {
    border-color:var(--ppbui-border) !important;
    background:var(--ppbui-bg-0) !important;
    color:var(--ppbui-text-subtle) !important;
    opacity:.72;
  }
  .ppbui-hunts-current .ppbui-hunts-view-toggle,
  .ppbui-hunts-current .ppbui-hunts-presentation-toggle {
    display:grid !important;
    grid-template-columns:repeat(2,minmax(0,1fr));
    box-sizing:border-box;
    width:100%;
    min-width:0;
    gap:0 !important;
    margin:0 !important;
  }
  .ppbui-hunts-current .ppbui-hunts-view-toggle {
    padding:2px !important;
    border:var(--ppbui-border-width) solid var(--ppbui-border-strong) !important;
    border-radius:var(--ppbui-radius) !important;
    background:var(--ppbui-bg-0) !important;
    box-shadow:none !important;
  }
  .ppbui-hunts-current .ppbui-hunts-view-toggle .hunt-presentation-toggle__button {
    box-sizing:border-box;
    width:100%;
    min-width:0;
    min-height:calc(var(--ppbui-control-height) + 8px);
    border:0 !important;
    border-radius:0 !important;
    background:transparent !important;
    color:var(--ppbui-text-muted) !important;
    box-shadow:none !important;
    font:700 var(--ppbui-font-size-body)/var(--ppbui-line-height-tight) var(--ppbui-font-body) !important;
  }
  .ppbui-hunts-current .ppbui-hunts-view-toggle .hunt-presentation-toggle__button + .hunt-presentation-toggle__button {
    border-left:var(--ppbui-separator-width) solid var(--ppbui-border-strong) !important;
  }
  .ppbui-hunts-current .ppbui-hunts-view-toggle .hunt-presentation-toggle__button.is-active,
  .ppbui-hunts-current .ppbui-hunts-view-toggle .hunt-presentation-toggle__button[aria-pressed="true"] {
    background:var(--ppbui-bg-3) !important;
    color:var(--ppbui-selected) !important;
    box-shadow:inset 0 calc(-1 * var(--ppbui-border-width)) 0 var(--ppbui-selected) !important;
  }
  .ppbui-hunts-current .ppbui-hunts-view-toggle .hunt-presentation-toggle__button:hover:not(:disabled):not(.is-active):not([aria-pressed="true"]) {
    background:var(--ppbui-bg-2) !important;
    color:var(--ppbui-text) !important;
  }
  .ppbui-hunts-current .ppbui-hunts-presentation-toggle {
    padding:1px !important;
    border:var(--ppbui-separator-width) solid var(--ppbui-border) !important;
    border-radius:var(--ppbui-radius) !important;
    background:transparent !important;
    box-shadow:none !important;
  }
  .ppbui-hunts-current .ppbui-hunts-presentation-toggle .hunt-presentation-toggle__button {
    box-sizing:border-box;
    width:100%;
    min-width:0;
    min-height:calc(var(--ppbui-control-height) + 2px);
    border:0 !important;
    border-radius:0 !important;
    background:transparent !important;
    color:var(--ppbui-text-muted) !important;
    font-family:var(--ppbui-font-body) !important;
    font-weight:500 !important;
  }
  .ppbui-hunts-current .ppbui-hunts-presentation-toggle .hunt-presentation-toggle__button + .hunt-presentation-toggle__button {
    border-left:var(--ppbui-separator-width) solid var(--ppbui-border) !important;
  }
  .ppbui-hunts-current .ppbui-hunts-presentation-toggle .hunt-presentation-toggle__button.is-active,
  .ppbui-hunts-current .ppbui-hunts-presentation-toggle .hunt-presentation-toggle__button[aria-pressed="true"] {
    background:var(--ppbui-bg-2) !important;
    color:var(--ppbui-text) !important;
    font-weight:600 !important;
  }
  .ppbui-hunts-current .hunt-list-field {
    min-width:0;
    color:var(--ppbui-text-muted) !important;
    font:600 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body) !important;
  }
  .ppbui-hunts-current .hunt-list-field input,
  .ppbui-hunts-current .hunt-list-field select {
    box-sizing:border-box;
    min-width:0;
    min-height:var(--ppbui-control-height);
    border-color:var(--ppbui-border-strong) !important;
    border-radius:var(--ppbui-radius) !important;
    background-color:var(--ppbui-bg-0) !important;
    color:var(--ppbui-text) !important;
    font:400 var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body) !important;
  }
  .ppbui-hunts-current .hunt-list-toolbar.ppbui-hunts-list-refined {
    display:grid !important;
    grid-template-columns:minmax(0,1fr);
    gap:var(--ppbui-space-2) !important;
    margin:0 !important;
    padding:0 !important;
    border:0 !important;
    background:transparent !important;
    box-shadow:none !important;
  }
  .ppbui-hunts-current .hunt-list-toolbar.ppbui-hunts-list-refined > .hunt-list-search-field,
  .ppbui-hunts-current .hunt-list-toolbar.ppbui-hunts-list-refined > .hunt-list-search-field input { width:100%; }
  .ppbui-hunts-list-utility {
    display:grid;
    grid-template-columns:auto minmax(0,1fr) auto;
    align-items:end;
    gap:var(--ppbui-space-2);
    min-width:0;
  }
  .ppbui-hunts-list-utility .hunt-list-sort-field,
  .ppbui-hunts-list-utility .hunt-list-sort-field select { min-width:0; width:100%; }
  .ppbui-hunts-filter-toggle {
    -webkit-appearance:none;
    appearance:none;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    gap:var(--ppbui-space-1);
    box-sizing:border-box;
    min-height:var(--ppbui-control-height);
    padding:0 var(--ppbui-control-padding-x);
    border:var(--ppbui-border-width) solid var(--ppbui-border);
    border-radius:var(--ppbui-radius);
    background:transparent;
    color:var(--ppbui-text-muted);
    box-shadow:none;
    font:600 var(--ppbui-font-size-secondary)/var(--ppbui-line-height-tight) var(--ppbui-font-body);
    white-space:nowrap;
  }
  .ppbui-hunts-filter-toggle:hover:not(:disabled) { border-color:var(--ppbui-border-strong); color:var(--ppbui-text); }
  .ppbui-hunts-filter-toggle[aria-expanded="true"] { border-color:var(--ppbui-border-strong); color:var(--ppbui-text); }
  .ppbui-hunts-filter-toggle[data-active="true"]::after {
    content:"";
    width:6px;
    height:6px;
    flex:0 0 6px;
    border-radius:50%;
    background:var(--ppbui-selected);
  }
  .ppbui-hunts-list-advanced {
    display:grid;
    grid-template-columns:minmax(0,1fr) minmax(0,1fr);
    align-items:end;
    gap:var(--ppbui-space-2);
    min-width:0;
    padding-top:var(--ppbui-space-1);
    border-top:var(--ppbui-separator-width) solid var(--ppbui-border);
  }
  .ppbui-hunts-list-advanced[hidden] { display:none !important; }
  .ppbui-hunts-list-advanced .hunt-list-element-filter,
  .ppbui-hunts-list-advanced .hunt-list-element-filter select,
  .ppbui-hunts-list-advanced .hunt-list-range-field { min-width:0; width:100%; }
  .ppbui-hunts-current .hunt-list-clear {
    min-height:var(--ppbui-control-height);
    width:auto !important;
    align-self:end;
    padding-inline:var(--ppbui-control-padding-x) !important;
    border-color:var(--ppbui-border) !important;
    background:transparent !important;
    color:var(--ppbui-text-muted) !important;
    box-shadow:none !important;
    font:600 var(--ppbui-font-size-secondary)/var(--ppbui-line-height-tight) var(--ppbui-font-body) !important;
  }
  .ppbui-hunts-current .hunt-list-clear:hover:not(:disabled) {
    border-color:var(--ppbui-border-strong) !important;
    color:var(--ppbui-text) !important;
  }
  .ppbui-hunts-current .hunt-list-summary {
    display:flex !important;
    flex:0 0 auto;
    flex-wrap:wrap;
    align-items:center;
    gap:var(--ppbui-space-2);
    margin-block:0 !important;
    padding:var(--ppbui-space-2) var(--ppbui-space-3) !important;
    border:var(--ppbui-border-width) solid var(--ppbui-border-strong) !important;
    border-bottom:0 !important;
    border-radius:var(--ppbui-radius) var(--ppbui-radius) 0 0 !important;
    background:var(--ppbui-bg-2) !important;
    color:var(--ppbui-text-muted) !important;
  }
  .ppbui-hunts-current .hunt-list-summary > .hunt-list-world-note { margin:0 !important; }
  .ppbui-hunts-current-map .hunt-world-viewport,
  .ppbui-hunts-current-list .hunt-list-table-shell {
    box-sizing:border-box;
    width:100%;
    min-width:0;
    flex:1 1 auto;
    border:var(--ppbui-border-width) solid var(--ppbui-border-strong) !important;
    border-radius:0 0 var(--ppbui-radius) var(--ppbui-radius) !important;
    background-color:var(--ppbui-bg-0) !important;
    box-shadow:none !important;
  }
  .ppbui-hunts-current-map .hunt-region-controls {
    position:absolute;
    z-index:30;
    right:var(--ppbui-space-3);
    bottom:var(--ppbui-space-3);
    display:flex !important;
    align-items:stretch;
    gap:0 !important;
    box-sizing:border-box;
    padding:2px !important;
    border:var(--ppbui-border-width) solid var(--ppbui-border-strong) !important;
    border-radius:var(--ppbui-radius) !important;
    background:var(--ppbui-bg-0) !important;
    box-shadow:none !important;
  }
  .ppbui-hunts-current-map .hunt-region-controls > button {
    -webkit-appearance:none;
    appearance:none;
    box-sizing:border-box;
    min-width:34px;
    min-height:34px;
    padding:0 var(--ppbui-space-2) !important;
    border:0 !important;
    border-radius:0 !important;
    background:var(--ppbui-bg-2) !important;
    color:var(--ppbui-text) !important;
    box-shadow:none !important;
    font:700 var(--ppbui-font-size-body)/1 var(--ppbui-font-body) !important;
  }
  .ppbui-hunts-current-map .hunt-region-controls > button + button {
    border-left:var(--ppbui-separator-width) solid var(--ppbui-border-strong) !important;
  }
  .ppbui-hunts-current-map .hunt-region-controls > button:hover:not(:disabled) { background:var(--ppbui-bg-3) !important; }
  .ppbui-hunts-current-map .hunt-region-controls > button:active:not(:disabled) { background:var(--ppbui-bg-1) !important; }
  .ppbui-hunts-current-map .hunt-region-controls > button:focus-visible {
    outline:var(--ppbui-focus-width) solid var(--ppbui-focus);
    outline-offset:calc(-1 * var(--ppbui-border-width));
  }
  .ppbui-hunts-current-list .hunt-list-row.is-current > td {
    background:color-mix(in srgb,var(--ppbui-selected) 8%,var(--ppbui-bg-0)) !important;
  }
  .ppbui-hunts-current-list .hunt-list-table {
    border-collapse:collapse;
    background:var(--ppbui-bg-0) !important;
    color:var(--ppbui-text) !important;
  }
  .ppbui-hunts-current-list .hunt-list-table th {
    padding:var(--ppbui-space-2) var(--ppbui-space-3) !important;
    border-bottom:var(--ppbui-border-width) solid var(--ppbui-border-strong) !important;
    background:var(--ppbui-bg-2) !important;
    color:var(--ppbui-text-muted) !important;
    font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body) !important;
    text-align:left;
  }
  .ppbui-hunts-current-list .hunt-list-table td {
    padding:var(--ppbui-space-2) var(--ppbui-space-3) !important;
    border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border) !important;
    background:transparent;
    color:var(--ppbui-text) !important;
  }
  .ppbui-hunts-current-list .hunt-list-row:not(.is-current):hover > td {
    background:var(--ppbui-bg-1) !important;
  }
  .ppbui-hunts-current-list .hunt-list-hunt-button,
  .ppbui-hunts-current-list .hunt-list-details-button {
    -webkit-appearance:none;
    appearance:none;
    min-height:var(--ppbui-control-height);
    border-radius:var(--ppbui-radius) !important;
    box-shadow:none !important;
    font:700 var(--ppbui-font-size-secondary)/var(--ppbui-line-height-tight) var(--ppbui-font-body) !important;
  }
  .ppbui-hunts-current-list .hunt-list-hunt-button {
    border:var(--ppbui-border-width) solid var(--ppbui-accent) !important;
    background:var(--ppbui-bg-2) !important;
    color:var(--ppbui-accent-hi) !important;
  }
  .ppbui-hunts-current-list .hunt-list-hunt-button:hover:not(:disabled) {
    border-color:var(--ppbui-accent-hi) !important;
    background:var(--ppbui-bg-3) !important;
  }
  .ppbui-hunts-current-list .hunt-list-details-button {
    border:var(--ppbui-border-width) solid var(--ppbui-border) !important;
    background:transparent !important;
    color:var(--ppbui-text-muted) !important;
  }
  .ppbui-hunts-current-list .hunt-list-details-button:hover:not(:disabled) {
    border-color:var(--ppbui-border-strong) !important;
    color:var(--ppbui-text) !important;
  }
  .ppbui-hunts-current .hunt-list-clear:disabled,
  .ppbui-hunts-current-list .hunt-list-hunt-button:disabled,
  .ppbui-hunts-current-list .hunt-list-details-button:disabled {
    border-color:var(--ppbui-border) !important;
    background:var(--ppbui-bg-1) !important;
    color:var(--ppbui-text-subtle) !important;
  }
  .ppbui-hunts-current-list .hunt-list-sprite { image-rendering:pixelated; }
  .ppbui-hunts-current-list .hunt-list-empty,
  .ppbui-hunts-current-list .hunt-list-footnote,
  .ppbui-hunts-current-list .hunt-list-world-note { color:var(--ppbui-text-muted) !important; }

  .ppbui-hunts-enhanced .hunt-world-tabs > button:focus-visible,
  .ppbui-hunts-enhanced .hunt-world-tabs .hunt-category-tab:focus-visible,
  .ppbui-hunts-enhanced .hunt-world-zoom > button:focus-visible,
  .ppbui-hunts-enhanced .hunt-world-toolbar input:focus-visible,
  .ppbui-hunts-enhanced .hunt-world-toolbar button:focus-visible,
  .ppbui-hunts-enhanced .hunt-world-elements button:focus-visible,
  .ppbui-hunts-results select:focus-visible,
  .ppbui-hunts-inspector__mode .hunt-presentation-toggle button:focus-visible,
  .ppbui-hunts-current .hunt-list-world-tab:focus-visible,
  .ppbui-hunts-current .hunt-presentation-toggle__button:focus-visible,
  .ppbui-hunts-current .hunt-list-field input:focus-visible,
  .ppbui-hunts-current .hunt-list-field select:focus-visible,
  .ppbui-hunts-current .hunt-list-clear:focus-visible,
  .ppbui-hunts-current .ppbui-hunts-filter-toggle:focus-visible,
  .ppbui-hunts-current-list .hunt-list-hunt-button:focus-visible,
  .ppbui-hunts-current-list .hunt-list-details-button:focus-visible {
    outline:var(--ppbui-focus-width) solid var(--ppbui-focus);
    outline-offset:var(--ppbui-pixel-unit);
  }

  @container (max-width:780px) {
    .ppbui-hunts-finder > .hunt-world-toolbar { grid-template-columns:minmax(150px,1fr) auto 56px auto 56px; }
    .ppbui-hunts-finder > .hunt-world-toolbar button { grid-column:1 / -1; }
    .ppbui-hunts-atlas-workspace.is-inspector-open { grid-template-columns:minmax(260px,1fr) minmax(260px,300px); }
    .ppbui-hunts-current-list .hunt-list-table-shell { overflow-x:auto; overscroll-behavior-x:contain; }
    .ppbui-hunts-current-list .hunt-list-table { width:max-content; min-width:100%; }
    .ppbui-hunts-current-list .hunt-list-action-cell,
    .ppbui-hunts-current-list .hunt-list-identity { white-space:nowrap; }
  }
  @container (max-width:620px) {
    .ppbui-hunts-enhanced .hunt-world-header.ppbui-hunts-atlas-rail { flex-wrap:wrap; }
    .ppbui-hunts-enhanced .hunt-world-tabs { flex-basis:100%; }
    .ppbui-hunts-enhanced .hunt-world-header-actions { margin-left:auto; border-left:0; border-top:var(--ppbui-separator-width) solid var(--ppbui-border); }
    .ppbui-hunts-results { grid-template-columns:minmax(0,1fr) auto; grid-template-areas:"select count" "locate reset" "status status"; }
    .ppbui-hunts-results > button { width:100%; }
    .ppbui-hunts-atlas-workspace.is-inspector-open { grid-template-columns:minmax(0,1fr); }
    .ppbui-hunts-inspector { min-height:300px; height:auto; border-left:0; border-top:var(--ppbui-border-width) solid var(--ppbui-border-strong); }
    .ppbui-hunts-current .hunt-selection-shell {
      display:grid !important;
      grid-template-columns:minmax(0,1fr) !important;
      gap:var(--ppbui-space-3) !important;
    }
    .ppbui-hunts-current .hunt-selection-sidebar,
    .ppbui-hunts-current .hunt-selection-content { min-width:0; width:100%; }
    .ppbui-hunts-current .hunt-selection-sidebar { padding:var(--ppbui-space-2) !important; }
    .ppbui-hunts-current .hunt-list-world-tabs { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .ppbui-hunts-current-map .hunt-world-viewport { min-height:300px; }
  }
  @container (max-width:360px) {
    .ppbui-hunts-current .hunt-list-header { gap:var(--ppbui-space-2) !important; }
    .ppbui-hunts-current .ppbui-hunts-list-utility { grid-template-columns:auto minmax(0,1fr) auto; }
    .ppbui-hunts-current .ppbui-hunts-list-advanced { grid-template-columns:minmax(0,1fr); }
    .ppbui-hunts-current .hunt-list-world-note { margin-block:0 !important; }
  }
  @container (max-width:330px) {
    .ppbui-hunts-finder > .hunt-world-toolbar {
      grid-template-columns:auto minmax(0,1fr) auto minmax(0,1fr);
    }
    .ppbui-hunts-finder > .hunt-world-toolbar input[type="search"] { grid-column:1/-1; }
    .ppbui-hunts-finder > .hunt-world-toolbar input[type="number"] {
      width:100%;
      min-width:0;
    }
    .ppbui-hunts-finder > .hunt-world-toolbar button { grid-column:1/-1; }
  }
  @media (pointer:coarse) {
    .ppbui-hunts-enhanced .hunt-world-tabs > button,
    .ppbui-hunts-enhanced .hunt-world-zoom > button,
    .ppbui-hunts-enhanced .hunt-world-toolbar input,
    .ppbui-hunts-enhanced .hunt-world-toolbar button,
    .ppbui-hunts-enhanced .hunt-world-elements button,
    .ppbui-hunts-results select,
    .ppbui-hunts-results > button,
    .ppbui-hunts-inspector__mode .hunt-presentation-toggle button,
    .ppbui-hunts-current .hunt-list-field input,
    .ppbui-hunts-current .hunt-list-field select,
    .ppbui-hunts-current .hunt-list-world-tab,
    .ppbui-hunts-current .hunt-presentation-toggle__button,
    .ppbui-hunts-current .hunt-list-clear,
    .ppbui-hunts-current .ppbui-hunts-filter-toggle,
    .ppbui-hunts-current .ppbui-hunts-gym,
    .ppbui-hunts-current-map .hunt-region-controls > button,
    .ppbui-hunts-current-list .hunt-list-hunt-button,
    .ppbui-hunts-current-list .hunt-list-details-button { min-height:40px; }
    .ppbui-hunts-inspector__hunt { min-height:40px; }
    .ppbui-hunts-inspector__close { min-width:40px; min-height:40px; }
  }
  @media (prefers-reduced-motion:reduce) {
    .ppbui-hunts-enhanced .hunt-map-marker.ppbui-hunts-locate-flash > .hunt-map-marker__sprite { animation:none !important; }
  }
`;
