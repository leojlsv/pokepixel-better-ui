export const huntsStyles = `
  .ppbui-hunts-enhanced {
    color:var(--ppbui-text);
    font:var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body);
  }
  .ppbui-hunts-enhanced > .pokeidle-panel__body {
    container-type:inline-size;
    gap:var(--ppbui-space-3);
    background:var(--ppbui-bg-1);
    color:var(--ppbui-text);
  }
  .ppbui-hunts-enhanced .hunt-world-header {
    display:flex;
    align-items:stretch;
    gap:var(--ppbui-space-4);
    min-width:0;
    padding:var(--ppbui-space-2);
    border:var(--ppbui-border-width) solid var(--ppbui-border);
    background:var(--ppbui-bg-2);
    box-shadow:var(--ppbui-shadow);
  }
  .ppbui-hunts-enhanced .hunt-world-tabs {
    display:flex;
    flex:1 1 auto;
    min-width:0;
    gap:var(--ppbui-space-1);
  }
  .ppbui-hunts-enhanced .hunt-world-tabs > button,
  .ppbui-hunts-enhanced .hunt-world-tabs .hunt-category-tab,
  .ppbui-hunts-enhanced .hunt-world-zoom > button {
    min-height:var(--ppbui-control-height);
    border:var(--ppbui-border-width) solid var(--ppbui-border);
    border-radius:0;
    background:var(--ppbui-bg-1);
    color:var(--ppbui-text-muted);
    font:600 var(--ppbui-font-size-secondary)/var(--ppbui-line-height-tight) var(--ppbui-font-body);
    box-shadow:none;
  }
  .ppbui-hunts-enhanced .hunt-world-tabs > button:hover:not(:disabled):not(.is-active):not([aria-selected="true"]),
  .ppbui-hunts-enhanced .hunt-world-tabs .hunt-category-tab:hover:not(:disabled):not(.is-active):not([aria-selected="true"]),
  .ppbui-hunts-enhanced .hunt-world-zoom > button:hover:not(:disabled) {
    border-color:var(--ppbui-border-strong);
    background:var(--ppbui-bg-3);
    color:var(--ppbui-text);
  }
  .ppbui-hunts-enhanced .hunt-world-tabs > button:active:not(:disabled),
  .ppbui-hunts-enhanced .hunt-world-tabs .hunt-category-tab:active:not(:disabled),
  .ppbui-hunts-enhanced .hunt-world-zoom > button:active:not(:disabled) {
    background:var(--ppbui-bg-0);
    box-shadow:inset var(--ppbui-pixel-unit) var(--ppbui-pixel-unit) 0 var(--ppbui-bg-0);
  }
  .ppbui-hunts-enhanced .hunt-world-tabs > button.is-active,
  .ppbui-hunts-enhanced .hunt-world-tabs .hunt-category-tab.is-active,
  .ppbui-hunts-enhanced .hunt-world-tabs > button[aria-selected="true"],
  .ppbui-hunts-enhanced .hunt-world-tabs .hunt-category-tab[aria-selected="true"] {
    border-color:var(--ppbui-accent);
    background:var(--ppbui-bg-3);
    color:var(--ppbui-text);
  }
  .ppbui-hunts-enhanced .hunt-world-tabs > button:disabled,
  .ppbui-hunts-enhanced .hunt-world-tabs .hunt-category-tab:disabled,
  .ppbui-hunts-enhanced .hunt-world-zoom > button:disabled {
    cursor:default;
    border-color:var(--ppbui-border);
    background:var(--ppbui-bg-1);
    color:var(--ppbui-text-subtle);
    box-shadow:none;
  }
  .ppbui-hunts-enhanced .hunt-world-tabs > button:focus-visible,
  .ppbui-hunts-enhanced .hunt-world-tabs .hunt-category-tab:focus-visible,
  .ppbui-hunts-enhanced .hunt-world-zoom > button:focus-visible,
  .ppbui-hunts-enhanced .hunt-world-toolbar input:focus-visible,
  .ppbui-hunts-enhanced .hunt-world-toolbar button:focus-visible,
  .ppbui-hunts-enhanced .hunt-world-elements button:focus-visible,
  .ppbui-hunts-enhanced .hunt-presentation-toggle button:focus-visible {
    outline:var(--ppbui-border-width) solid var(--ppbui-focus);
    outline-offset:var(--ppbui-pixel-unit);
  }
  .ppbui-hunts-enhanced .hunt-world-header-actions {
    flex:0 0 auto;
    align-self:center;
  }
  .ppbui-hunts-enhanced .hunt-world-zoom {
    display:flex;
    gap:var(--ppbui-space-1);
  }
  .ppbui-hunts-enhanced .hunt-world-notice:empty { display:none; }
  .ppbui-hunts-enhanced .hunt-world-notice:not(:empty) {
    margin:0;
    padding:var(--ppbui-space-3) var(--ppbui-space-4);
    border-left:var(--ppbui-border-width) solid var(--ppbui-info);
    background:var(--ppbui-bg-2);
    color:var(--ppbui-text-muted);
    font-size:var(--ppbui-font-size-secondary);
  }

  .ppbui-hunts-controls {
    display:grid;
    grid-template-columns:minmax(0,1fr) minmax(280px,340px);
    gap:var(--ppbui-space-4);
    flex:0 0 auto;
    min-width:0;
    margin:0;
  }
  .ppbui-hunts-control-group {
    min-width:0;
    padding:var(--ppbui-space-4);
    border:var(--ppbui-border-width) solid var(--ppbui-border);
    background:var(--ppbui-bg-2);
    box-shadow:var(--ppbui-shadow);
  }
  .ppbui-hunts-control-group__heading {
    display:flex;
    align-items:center;
    min-height:18px;
    margin:0 0 var(--ppbui-space-3);
    color:var(--ppbui-text-subtle);
    font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body);
    letter-spacing:.06em;
    text-transform:uppercase;
  }
  .ppbui-hunts-filters > .hunt-world-toolbar {
    display:grid;
    grid-template-columns:minmax(150px,1fr) auto 64px auto 64px auto;
    align-items:center;
    gap:var(--ppbui-space-2);
    min-width:0;
    margin:0;
  }
  .ppbui-hunts-filters > .hunt-world-toolbar input,
  .ppbui-hunts-filters > .hunt-world-toolbar button {
    box-sizing:border-box;
    min-height:var(--ppbui-control-height);
    border:var(--ppbui-border-width) solid var(--ppbui-border);
    border-radius:0;
    background:var(--ppbui-bg-0);
    color:var(--ppbui-text);
    font:500 var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body);
  }
  .ppbui-hunts-filters > .hunt-world-toolbar input { min-width:0; padding:0 var(--ppbui-control-padding-x); }
  .ppbui-hunts-filters > .hunt-world-toolbar button {
    padding:0 var(--ppbui-control-padding-x);
    background:var(--ppbui-bg-2);
    border-color:var(--ppbui-border-strong);
    font-weight:600;
    cursor:pointer;
  }
  .ppbui-hunts-filters > .hunt-world-toolbar input:hover:not(:disabled) {
    border-color:var(--ppbui-border-strong);
  }
  .ppbui-hunts-filters > .hunt-world-toolbar button:hover:not(:disabled) {
    border-color:var(--ppbui-border-strong);
    background:var(--ppbui-bg-3);
  }
  .ppbui-hunts-filters > .hunt-world-toolbar button:active:not(:disabled) {
    background:var(--ppbui-bg-0);
    box-shadow:inset var(--ppbui-pixel-unit) var(--ppbui-pixel-unit) 0 var(--ppbui-bg-0);
  }
  .ppbui-hunts-filters > .hunt-world-toolbar input:disabled,
  .ppbui-hunts-filters > .hunt-world-toolbar button:disabled {
    cursor:default;
    border-color:var(--ppbui-border);
    background:var(--ppbui-bg-1);
    color:var(--ppbui-text-subtle);
    box-shadow:none;
  }
  .ppbui-hunts-filters > .hunt-world-toolbar .hunt-world-level-label {
    color:var(--ppbui-text-subtle);
    font:600 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-data);
    white-space:nowrap;
  }
  .ppbui-hunts-filters > .hunt-world-elements {
    display:flex;
    flex-wrap:wrap;
    gap:var(--ppbui-space-2);
    margin:var(--ppbui-space-3) 0 0 !important;
    padding:var(--ppbui-space-3) 0 0;
    border-top:var(--ppbui-separator-width) solid var(--ppbui-border);
  }
  .ppbui-hunts-filters > .hunt-world-elements button {
    min-height:26px;
    padding:0 var(--ppbui-space-3);
    border:var(--ppbui-separator-width) solid var(--ppbui-border);
    border-radius:var(--ppbui-radius-badge);
    background:var(--ppbui-bg-1);
    color:var(--ppbui-text-muted);
    font:600 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body);
  }
  .ppbui-hunts-filters > .hunt-world-elements button:hover:not(:disabled):not(.is-active):not([aria-pressed="true"]) {
    border-color:var(--ppbui-border-strong);
    background:var(--ppbui-bg-3);
    color:var(--ppbui-text);
  }
  .ppbui-hunts-filters > .hunt-world-elements button:active:not(:disabled) {
    background:var(--ppbui-bg-0);
    box-shadow:inset var(--ppbui-pixel-unit) var(--ppbui-pixel-unit) 0 var(--ppbui-bg-0);
  }
  .ppbui-hunts-filters > .hunt-world-elements button.is-active,
  .ppbui-hunts-filters > .hunt-world-elements button[aria-pressed="true"] {
    border-color:var(--ppbui-accent);
    background:var(--ppbui-bg-3);
    color:var(--ppbui-text);
  }
  .ppbui-hunts-filters > .hunt-world-elements button:disabled {
    cursor:default;
    border-color:var(--ppbui-border);
    background:var(--ppbui-bg-1);
    color:var(--ppbui-text-subtle);
    box-shadow:none;
  }

  .ppbui-hunts-results {
    display:grid;
    grid-template-columns:minmax(0,1fr) auto;
    grid-template-areas:
      "select count"
      "locate reset"
      "status status";
    align-items:center;
    gap:var(--ppbui-space-2);
    min-width:0;
  }
  .ppbui-hunts-results > select { grid-area:select; }
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
    justify-self:end;
    margin:0;
    padding:2px var(--ppbui-space-2);
    border:var(--ppbui-separator-width) solid var(--ppbui-border-strong);
    border-radius:var(--ppbui-radius-badge);
    background:var(--ppbui-bg-3);
    color:var(--ppbui-text-muted);
    font:600 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-data);
    white-space:nowrap;
  }
  .ppbui-hunts-results > button {
    width:100%;
  }

  .ppbui-hunts-workspace {
    display:grid;
    grid-template-columns:minmax(0,1fr);
    gap:0;
    flex:1 1 auto;
    min-width:0;
    min-height:0;
    padding:var(--ppbui-space-2);
    border:var(--ppbui-border-width) solid var(--ppbui-border);
    background:var(--ppbui-bg-0);
    box-shadow:var(--ppbui-shadow);
  }
  .ppbui-hunts-workspace.is-dossier-open {
    grid-template-columns:minmax(280px,1fr) clamp(250px,34%,330px);
    gap:var(--ppbui-space-4);
  }
  .ppbui-hunts-workspace > .hunt-world-viewport {
    min-width:0;
    min-height:0;
    border:var(--ppbui-separator-width) solid var(--ppbui-border);
    background:var(--ppbui-bg-0);
  }

  .ppbui-hunts-dossier {
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
    border:var(--ppbui-border-width) solid var(--ppbui-border-strong);
    border-radius:0;
    background:var(--ppbui-bg-1);
    color:var(--ppbui-text);
    box-shadow:var(--ppbui-shadow-raised);
    font:var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body);
  }
  .ppbui-hunts-dossier[hidden] { display:none !important; }
  .ppbui-hunts-dossier:focus-visible {
    outline:var(--ppbui-border-width) solid var(--ppbui-focus);
    outline-offset:var(--ppbui-pixel-unit);
  }
  .ppbui-hunts-dossier__header {
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:var(--ppbui-space-4);
    padding:var(--ppbui-space-4);
    border-bottom:var(--ppbui-border-width) solid var(--ppbui-border);
    background:var(--ppbui-bg-2);
  }
  .ppbui-hunts-dossier__header > div { min-width:0; }
  .ppbui-hunts-dossier__title {
    display:block;
    min-width:0;
    margin:0 0 var(--ppbui-space-1);
    overflow:hidden;
    color:var(--ppbui-accent-hi);
    font:700 var(--ppbui-font-size-title)/var(--ppbui-line-height-tight) var(--ppbui-font-body);
    text-overflow:ellipsis;
    white-space:nowrap;
  }
  .ppbui-hunts-dossier__header small {
    display:block;
    color:var(--ppbui-text-subtle);
    font:600 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-data);
  }
  .ppbui-hunts-dossier__body {
    min-height:0;
    overflow-x:hidden;
    overflow-y:auto;
    padding:var(--ppbui-space-4);
    scrollbar-gutter:stable;
  }
  .ppbui-hunts-dossier__footer {
    padding:var(--ppbui-space-4);
    border-top:var(--ppbui-border-width) solid var(--ppbui-border);
    background:var(--ppbui-bg-2);
  }
  .ppbui-hunts-dossier__presentation-label {
    margin:0 0 var(--ppbui-space-2);
    padding:0;
    border:0;
  }
  .ppbui-hunts-dossier__mode { min-width:0; }
  .ppbui-hunts-dossier__mode .hunt-presentation-toggle {
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:var(--ppbui-space-1);
    width:100%;
    padding:0;
    border:0;
    background:transparent;
  }
  .ppbui-hunts-dossier__mode .hunt-presentation-toggle button {
    min-height:var(--ppbui-control-height);
    border:var(--ppbui-border-width) solid var(--ppbui-border);
    border-radius:0;
    background:var(--ppbui-bg-1);
    color:var(--ppbui-text-muted);
    font:600 var(--ppbui-font-size-meta)/var(--ppbui-line-height-tight) var(--ppbui-font-body);
  }
  .ppbui-hunts-dossier__mode .hunt-presentation-toggle button.is-active,
  .ppbui-hunts-dossier__mode .hunt-presentation-toggle button[aria-pressed="true"] {
    border-color:var(--ppbui-accent);
    background:var(--ppbui-bg-3);
    color:var(--ppbui-text);
  }
  .ppbui-hunts-dossier__mode .hunt-presentation-toggle button:hover:not(:disabled):not(.is-active):not([aria-pressed="true"]) {
    border-color:var(--ppbui-border-strong);
    background:var(--ppbui-bg-3);
    color:var(--ppbui-text);
  }
  .ppbui-hunts-dossier__mode .hunt-presentation-toggle button:active:not(:disabled) {
    background:var(--ppbui-bg-0);
    box-shadow:inset var(--ppbui-pixel-unit) var(--ppbui-pixel-unit) 0 var(--ppbui-bg-0);
  }
  .ppbui-hunts-dossier__mode .hunt-presentation-toggle button:disabled {
    cursor:default;
    border-color:var(--ppbui-border);
    background:var(--ppbui-bg-1);
    color:var(--ppbui-text-subtle);
    box-shadow:none;
  }
  .ppbui-hunts-dossier__hunt { width:100%; margin-top:var(--ppbui-space-3); }

  .ppbui-hunts-enhanced .hunt-map-marker:focus-visible .hunt-map-marker__name {
    outline:var(--ppbui-border-width) solid var(--ppbui-focus);
    outline-offset:var(--ppbui-pixel-unit);
  }
  .hunt-map-marker.ppbui-hunts-selected-marker,
  .hunt-map-marker.ppbui-hunts-located-marker { z-index:20; }
  .hunt-map-marker__name.ppbui-hunts-selected,
  .hunt-map-marker__name.ppbui-hunts-located {
    border:var(--ppbui-border-width) solid var(--ppbui-accent) !important;
    border-radius:0 !important;
    background:var(--ppbui-bg-1) !important;
    color:var(--ppbui-text) !important;
    box-shadow:var(--ppbui-shadow);
    opacity:1;
  }
  .hunt-map-marker__name.ppbui-hunts-dimmed { opacity:.35; }
  .hunt-map-marker.ppbui-hunts-locate-flash > .hunt-map-marker__sprite {
    animation:ppbui-hunts-locate-flash .8s steps(4,end) 1 !important;
  }
  @keyframes ppbui-hunts-locate-flash {
    0%,100% { filter:drop-shadow(0 2px 1px #000) drop-shadow(0 0 5px var(--marker-color)); }
    45% { filter:brightness(1.35) saturate(1.15) drop-shadow(0 2px 1px #000) drop-shadow(0 0 10px var(--ppbui-accent)); }
  }
  @media (prefers-reduced-motion:reduce) {
    .hunt-map-marker.ppbui-hunts-locate-flash > .hunt-map-marker__sprite { animation:none !important; }
  }

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
  .ppbui-hunts-relation {
    display:grid;
    align-items:start;
    margin:0 0 var(--ppbui-space-3);
  }
  .ppbui-hunts-field-label {
    display:flex;
    align-items:center;
    min-height:24px;
    color:var(--ppbui-text-subtle);
    font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body);
    text-transform:uppercase;
  }
  .ppbui-hunts-badge-list {
    display:flex;
    flex-wrap:wrap;
    gap:var(--ppbui-space-2);
  }
  .ppbui-hunts-empty {
    color:var(--ppbui-text-subtle);
    font:600 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body);
  }
  .ppbui-hunts-element-badge,
  .ppbui-hunts-relation-badge {
    min-height:24px;
    padding:2px var(--ppbui-space-2);
    border:var(--ppbui-separator-width) solid color-mix(in srgb,var(--hunt-element-color,#777) 72%,var(--ppbui-border));
    border-radius:var(--ppbui-radius-badge);
    background:var(--ppbui-bg-2);
    color:var(--ppbui-text);
  }
  .ppbui-hunts-relation-badge > b {
    color:var(--ppbui-accent-hi);
    font-family:var(--ppbui-font-data);
    font-variant-numeric:tabular-nums;
  }
  .ppbui-hunts-section-title {
    margin:var(--ppbui-space-5) 0 var(--ppbui-space-3);
    padding-top:var(--ppbui-space-4);
    border-top:var(--ppbui-separator-width) solid var(--ppbui-border);
    color:var(--ppbui-text-subtle);
    font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body);
    letter-spacing:.06em;
    text-transform:uppercase;
  }
  .ppbui-hunts-drop-list {
    display:grid !important;
    grid-template-columns:minmax(0,1fr) !important;
    gap:var(--ppbui-space-2) !important;
  }
  .ppbui-hunts-drop-item {
    display:grid !important;
    grid-template-columns:auto minmax(0,1fr) auto !important;
    align-items:center;
    min-height:34px;
    gap:var(--ppbui-space-3);
    padding:var(--ppbui-space-2);
    border:var(--ppbui-separator-width) solid var(--ppbui-border);
    background:var(--ppbui-bg-2);
  }
  .ppbui-hunts-drop-name {
    min-width:0;
    overflow:hidden;
    color:var(--ppbui-text);
    text-overflow:ellipsis;
    white-space:nowrap;
  }
  .ppbui-hunts-drop-item > .ppbui-hunts-drop-value {
    display:inline-flex;
    flex:0 0 auto;
    align-items:center;
    justify-content:flex-end;
    gap:var(--ppbui-space-1);
    min-width:0;
    margin:0;
    color:var(--ppbui-accent-hi);
    font-family:var(--ppbui-font-data);
    font-variant-numeric:tabular-nums;
    overflow:visible;
    white-space:nowrap;
  }
  .ppbui-hunts-drop-item > .ppbui-hunts-drop-value * {
    overflow:visible;
    text-overflow:clip;
  }

  @container (max-width:760px) {
    .ppbui-hunts-controls { grid-template-columns:minmax(0,1fr); }
    .ppbui-hunts-filters > .hunt-world-toolbar {
      grid-template-columns:minmax(150px,1fr) auto 56px auto 56px auto;
    }
    .ppbui-hunts-workspace.is-dossier-open {
      grid-template-columns:minmax(0,1fr) minmax(240px,300px);
    }
  }
  @container (max-width:620px) {
    .ppbui-hunts-filters > .hunt-world-toolbar {
      grid-template-columns:minmax(0,1fr) auto 56px auto 56px;
    }
    .ppbui-hunts-filters > .hunt-world-toolbar button { grid-column:1 / -1; }
    .ppbui-hunts-workspace.is-dossier-open {
      grid-template-columns:minmax(0,1fr);
    }
    .ppbui-hunts-dossier { min-height:300px; height:auto; }
  }
`;
