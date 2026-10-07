export const menuLayoutEditorStyles = `
[data-ppbui-menu-layout-editor][hidden] {
  display:none!important;
}

[data-ppbui-menu-layout-editor] {
  position:fixed;
  z-index:2147483647;
  inset:0;
  display:grid;
  place-items:center;
  box-sizing:border-box;
  padding:var(--ppbui-space-4);
  background:rgba(5,9,9,.62);
  color:var(--ppbui-text);
  font-family:var(--ppbui-font-body);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__dialog {
  display:grid;
  grid-template-rows:auto minmax(0,1fr) auto;
  width:min(920px,calc(100vw - 16px));
  max-height:calc(100vh - 16px);
  overflow:hidden;
  background:var(--ppbui-bg-1);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__title-copy {
  display:grid;
  min-width:0;
  gap:var(--ppbui-space-1);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__title-copy > h2 {
  margin:0;
  overflow:hidden;
  font:500 var(--ppbui-font-size-title)/var(--ppbui-line-height-tight) var(--ppbui-font-display);
  text-overflow:ellipsis;
  white-space:nowrap;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__profile {
  overflow:hidden;
  color:var(--ppbui-text-muted);
  font:600 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body);
  text-overflow:ellipsis;
  white-space:nowrap;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__body {
  display:grid;
  gap:var(--ppbui-space-4);
  min-height:0;
  padding:var(--ppbui-space-4);
  overflow:auto;
  overscroll-behavior:contain;
  scrollbar-color:var(--ppbui-scrollbar-thumb) var(--ppbui-scrollbar-track);
  scrollbar-width:thin;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__intro {
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  align-items:end;
  gap:var(--ppbui-space-4);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__hint,
[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__meta,
[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__restriction,
[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__reserved {
  margin:0;
  color:var(--ppbui-text-muted);
  font:400 var(--ppbui-font-size-secondary)/var(--ppbui-line-height-body) var(--ppbui-font-body);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__controls {
  display:flex;
  flex-wrap:wrap;
  align-items:end;
  justify-content:flex-end;
  gap:var(--ppbui-space-3);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__field {
  display:grid;
  gap:var(--ppbui-space-1);
  min-width:132px;
  color:var(--ppbui-text-muted);
  font:600 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__counter {
  min-width:78px;
  padding:var(--ppbui-space-2) var(--ppbui-space-3);
  border:var(--ppbui-separator-width) solid var(--ppbui-border);
  border-radius:var(--ppbui-radius);
  background:var(--ppbui-bg-0);
  color:var(--ppbui-text);
  font:700 var(--ppbui-font-size-secondary)/var(--ppbui-line-height-tight) var(--ppbui-font-data);
  text-align:center;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__counter[data-over-capacity="true"] {
  border-color:var(--ppbui-warning);
  color:var(--ppbui-warning);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__section {
  display:grid;
  gap:var(--ppbui-space-3);
  min-width:0;
  padding:var(--ppbui-space-3);
  border:var(--ppbui-separator-width) solid var(--ppbui-border);
  border-radius:var(--ppbui-radius);
  background:var(--ppbui-bg-2);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__section-head {
  display:flex;
  align-items:baseline;
  justify-content:space-between;
  gap:var(--ppbui-space-3);
  min-width:0;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__section-head > h3 {
  margin:0;
  color:var(--ppbui-text);
  font:700 var(--ppbui-font-size-section)/var(--ppbui-line-height-tight) var(--ppbui-font-body);
}

[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-preview-list] {
  display:flex;
  align-items:stretch;
  gap:var(--ppbui-space-2);
  min-width:0;
  min-height:76px;
  padding:var(--ppbui-space-2);
  overflow:auto hidden;
  border:var(--ppbui-separator-width) solid var(--ppbui-border);
  border-radius:var(--ppbui-radius);
  background:var(--ppbui-bg-0);
  scrollbar-gutter:stable;
  scrollbar-color:var(--ppbui-scrollbar-thumb) var(--ppbui-scrollbar-track);
  scrollbar-width:thin;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__body::-webkit-scrollbar,
[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-preview-list]::-webkit-scrollbar {
  width:var(--ppbui-scrollbar-size);
  height:var(--ppbui-scrollbar-size);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__body::-webkit-scrollbar-track,
[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-preview-list]::-webkit-scrollbar-track {
  background:var(--ppbui-scrollbar-track);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__body::-webkit-scrollbar-thumb,
[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-preview-list]::-webkit-scrollbar-thumb {
  border:2px solid var(--ppbui-scrollbar-track);
  border-radius:var(--ppbui-radius);
  background:var(--ppbui-scrollbar-thumb);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__body::-webkit-scrollbar-thumb:hover,
[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-preview-list]::-webkit-scrollbar-thumb:hover {
  background:var(--ppbui-scrollbar-thumb-hover);
}

[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-preview-list][data-orientation="vertical"] {
  display:grid;
  grid-template-columns:minmax(0,220px);
  align-content:start;
  max-height:236px;
  overflow:hidden auto;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__workspace {
  display:grid;
  grid-template-columns:minmax(0,1.5fr) minmax(260px,.8fr);
  align-items:start;
  gap:var(--ppbui-space-4);
  min-width:0;
}

[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-groups] {
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:var(--ppbui-space-3);
  min-width:0;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__group {
  display:grid;
  align-content:start;
  gap:var(--ppbui-space-2);
  min-width:0;
  padding:var(--ppbui-space-3);
  border:var(--ppbui-separator-width) solid var(--ppbui-border);
  border-radius:var(--ppbui-radius);
  background:var(--ppbui-bg-0);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__group > h4 {
  margin:0;
  overflow:hidden;
  color:var(--ppbui-text);
  font:700 var(--ppbui-font-size-secondary)/var(--ppbui-line-height-tight) var(--ppbui-font-body);
  text-overflow:ellipsis;
  white-space:nowrap;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__group-list {
  display:grid;
  gap:var(--ppbui-space-2);
  min-height:36px;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__item {
  position:relative;
  display:grid!important;
  grid-template-columns:18px 24px minmax(0,1fr);
  gap:var(--ppbui-space-2)!important;
  align-items:center;
  min-width:0!important;
  min-height:36px!important;
  padding:var(--ppbui-space-2) var(--ppbui-space-3)!important;
  text-align:left!important;
  cursor:pointer;
}

[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-preview-list][data-orientation="horizontal"] .ppbui-menu-layout-editor__item {
  flex:1 1 62px;
  min-width:58px!important;
  max-width:72px;
}

[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-preview-list][data-orientation="horizontal"] .ppbui-menu-layout-editor__item {
  grid-template-columns:minmax(0,1fr);
  grid-template-rows:12px 26px auto;
  justify-items:center;
  align-content:center;
  gap:2px!important;
  padding:4px 3px!important;
  text-align:center!important;
}

[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-preview-list][data-orientation="horizontal"] .ppbui-menu-layout-editor__drag {
  grid-row:1;
}

[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-preview-list][data-orientation="horizontal"] .ppbui-menu-layout-editor__icon {
  grid-row:2;
}

[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-preview-list][data-orientation="horizontal"] .ppbui-menu-layout-editor__item-label {
  grid-row:3;
  overflow:visible;
  text-overflow:clip;
  font-size:var(--ppbui-font-size-meta);
  line-height:1.2;
  white-space:normal;
  overflow-wrap:anywhere;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__item[aria-pressed="true"] {
  border-color:var(--ppbui-selected)!important;
  background:var(--ppbui-bg-3)!important;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__item[draggable="true"] {
  cursor:grab;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__item[draggable="true"]:active {
  cursor:grabbing;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__item[data-drop-position="before"]::before,
[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__item[data-drop-position="after"]::after {
  content:"";
  position:absolute;
  z-index:2;
  background:var(--ppbui-focus);
}

[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-preview-list][data-orientation="horizontal"] .ppbui-menu-layout-editor__item[data-drop-position="before"]::before,
[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-preview-list][data-orientation="horizontal"] .ppbui-menu-layout-editor__item[data-drop-position="after"]::after {
  inset-block:3px;
  width:2px;
}

[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-preview-list][data-orientation="horizontal"] .ppbui-menu-layout-editor__item[data-drop-position="before"]::before {
  left:-5px;
}

[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-preview-list][data-orientation="horizontal"] .ppbui-menu-layout-editor__item[data-drop-position="after"]::after {
  right:-5px;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__group-list .ppbui-menu-layout-editor__item[data-drop-position="before"]::before,
[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__group-list .ppbui-menu-layout-editor__item[data-drop-position="after"]::after,
[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-preview-list][data-orientation="vertical"] .ppbui-menu-layout-editor__item[data-drop-position="before"]::before,
[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-preview-list][data-orientation="vertical"] .ppbui-menu-layout-editor__item[data-drop-position="after"]::after {
  inset-inline:3px;
  height:2px;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__group-list .ppbui-menu-layout-editor__item[data-drop-position="before"]::before,
[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-preview-list][data-orientation="vertical"] .ppbui-menu-layout-editor__item[data-drop-position="before"]::before {
  top:-5px;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__group-list .ppbui-menu-layout-editor__item[data-drop-position="after"]::after,
[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-preview-list][data-orientation="vertical"] .ppbui-menu-layout-editor__item[data-drop-position="after"]::after {
  bottom:-5px;
}

[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-dropzone="true"] {
  outline:var(--ppbui-focus-width) solid var(--ppbui-focus);
  outline-offset:var(--ppbui-pixel-unit);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__drag {
  color:var(--ppbui-text-muted);
  font-size:13px;
  line-height:1;
  text-align:center;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__icon {
  display:grid;
  width:24px;
  height:24px;
  place-items:center;
  overflow:hidden;
  pointer-events:none;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__icon > * {
  max-width:24px;
  max-height:24px;
  pointer-events:none!important;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__item-label {
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__details {
  position:sticky;
  top:0;
  display:grid;
  gap:var(--ppbui-space-3);
  min-width:0;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__details-name {
  margin:0;
  overflow-wrap:anywhere;
  color:var(--ppbui-text);
  font:700 var(--ppbui-font-size-section)/var(--ppbui-line-height-tight) var(--ppbui-font-body);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__move-row,
[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__step-row {
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:var(--ppbui-space-2);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__move-grid {
  display:grid;
  grid-template-columns:minmax(0,1fr) minmax(88px,.55fr);
  gap:var(--ppbui-space-2);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__move-grid > .ppbui-menu-layout-editor__field {
  min-width:0;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__conflict {
  display:grid;
  grid-template-columns:minmax(0,1fr) auto auto;
  align-items:center;
  gap:var(--ppbui-space-2);
  padding:var(--ppbui-space-3);
  border:var(--ppbui-separator-width) solid var(--ppbui-warning,var(--ppbui-border-strong));
  border-radius:var(--ppbui-radius);
  background:var(--ppbui-bg-2);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__conflict[hidden] {
  display:none!important;
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__status {
  min-height:1.4em;
  margin:0;
  color:var(--ppbui-text-muted);
  font:600 var(--ppbui-font-size-secondary)/var(--ppbui-line-height-body) var(--ppbui-font-body);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__status[data-error="true"] {
  color:var(--ppbui-danger);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__footer {
  display:flex;
  align-items:center;
  gap:var(--ppbui-space-2);
  padding:var(--ppbui-space-3) var(--ppbui-space-4);
  border-top:var(--ppbui-separator-width) solid var(--ppbui-border);
  background:var(--ppbui-bg-1);
}

[data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__footer-spacer {
  flex:1 1 auto;
}

[data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-edit-selected] {
  display:none!important;
}

@media (max-width:760px) {
  [data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__intro,
  [data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__workspace {
    grid-template-columns:minmax(0,1fr);
  }
  [data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__controls {
    justify-content:flex-start;
  }
  [data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__details {
    position:static;
  }
}

@media (max-width:560px) {
  [data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-groups],
  [data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__move-row,
  [data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__step-row,
  [data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__move-grid {
    grid-template-columns:minmax(0,1fr);
  }
  [data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__conflict {
    grid-template-columns:minmax(0,1fr);
  }
  [data-ppbui-menu-layout-editor] [data-ppbui-menu-layout-edit-selected]:not([hidden]) {
    display:inline-flex!important;
  }
}

@media (pointer:coarse) {
  [data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__item,
  [data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__footer button,
  [data-ppbui-menu-layout-editor] .ppbui-menu-layout-editor__conflict button {
    min-height:40px!important;
  }
}
`;
