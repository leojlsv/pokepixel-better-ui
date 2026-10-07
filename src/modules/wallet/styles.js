export const walletStyles = `
.ppbui-wallet-settings {
  min-width:0;
  margin:var(--ppbui-space-2) 0;
  padding:0;
  border:0;
  color:var(--ppbui-text);
  font:var(--ppbui-font-size-secondary)/var(--ppbui-line-height-body) var(--ppbui-font-body);
}

.ppbui-wallet-settings__body {
  min-width:0;
  padding:0 0 var(--ppbui-space-2);
}

.ppbui-wallet-settings__helper {
  margin:0;
  padding:0 var(--ppbui-space-2) var(--ppbui-space-2);
  color:var(--ppbui-text-muted);
  font:400 var(--ppbui-font-size-meta)/1.35 var(--ppbui-font-body);
}

.ppbui-wallet-settings__row {
  display:grid;
  grid-template-columns:14px minmax(0,1fr);
  align-items:center;
  gap:var(--ppbui-space-3);
  min-width:0;
  min-height:28px;
  padding:var(--ppbui-space-2);
  border-radius:var(--ppbui-radius);
  cursor:pointer;
}

.ppbui-wallet-settings__row:hover:not(.is-disabled) {
  background:var(--ppbui-bg-3);
}

.ppbui-wallet-settings__row:focus-within {
  outline:var(--ppbui-focus-width) solid var(--ppbui-focus);
  outline-offset:var(--ppbui-pixel-unit);
}

.ppbui-wallet-settings__row.is-disabled {
  color:var(--ppbui-text-subtle);
  cursor:default;
}

.ppbui-wallet-settings__row > input[type="checkbox"] {
  width:14px;
  height:14px;
  margin:0;
  accent-color:var(--ppbui-selected);
  cursor:pointer;
}

.ppbui-wallet-settings__row > input[type="checkbox"]:disabled {
  cursor:default;
}

.ppbui-wallet-settings__label {
  min-width:0;
  overflow-wrap:anywhere;
}

.ppbui-wallet-settings__status {
  margin:var(--ppbui-space-1) var(--ppbui-space-2) 0;
  padding:var(--ppbui-space-2);
  border-radius:var(--ppbui-radius);
  background:var(--ppbui-bg-0);
  color:var(--ppbui-text-muted);
  font:600 var(--ppbui-font-size-meta)/1.35 var(--ppbui-font-body);
}

.ppbui-wallet-settings__status[hidden] {
  display:none!important;
}

.ppbui-wallet-settings__status[data-error="true"] {
  color:var(--ppbui-danger-text);
}

.ppbui-wallet-panel[data-ppbui-wallet-panel] {
  position:fixed;
  z-index:2147483647;
  display:grid;
  grid-template-rows:auto auto;
  gap:var(--ppbui-space-2);
  box-sizing:border-box;
  width:max-content;
  min-width:190px;
  max-width:min(260px,calc(100vw - 16px));
  padding:var(--ppbui-space-3);
  border:var(--ppbui-border-width) solid var(--ppbui-border-strong);
  border-radius:var(--ppbui-window-radius);
  background:var(--ppbui-bg-1);
  color:var(--ppbui-text);
  box-shadow:var(--ppbui-shadow-raised);
  font:var(--ppbui-font-size-secondary)/var(--ppbui-line-height-body) var(--ppbui-font-body);
}

.ppbui-wallet-panel[data-ppbui-wallet-panel][hidden] {
  display:none!important;
}

.ppbui-wallet-panel__header {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:var(--ppbui-space-3);
  min-width:0;
  padding-bottom:var(--ppbui-space-2);
  border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border);
}

.ppbui-wallet-panel__header > strong {
  min-width:0;
  overflow:hidden;
  color:var(--ppbui-text);
  font:700 var(--ppbui-font-size-section)/var(--ppbui-line-height-tight) var(--ppbui-font-body);
  text-overflow:ellipsis;
  white-space:nowrap;
}

.ppbui-wallet-panel__header > button {
  min-width:56px;
}

.ppbui-wallet-values {
  display:grid;
  grid-template-columns:minmax(0,1fr);
  gap:var(--ppbui-space-2);
  width:100%;
  max-width:100%;
  min-width:0;
}

.ppbui-wallet-values > * {
  display:grid;
  grid-template-columns:max-content minmax(0,1fr);
  align-items:baseline;
  gap:var(--ppbui-space-4);
  box-sizing:border-box;
  width:100%;
  max-width:100%;
  min-width:0;
  padding:var(--ppbui-space-2) var(--ppbui-space-3);
  border:var(--ppbui-separator-width) solid var(--ppbui-border);
  border-radius:var(--ppbui-radius);
  background:var(--ppbui-bg-0);
  color:var(--ppbui-text);
  font-size:var(--ppbui-font-size-secondary);
}

.ppbui-wallet-values > * > :last-child {
  display:inline-flex;
  align-items:center;
  justify-content:flex-end;
  gap:3px;
  min-width:0;
  max-width:100%;
  overflow-wrap:anywhere;
  text-align:right;
  font:700 var(--ppbui-font-size-body)/var(--ppbui-line-height-tight) var(--ppbui-font-data);
  font-variant-numeric:tabular-nums;
}

[data-ppbui-wallet-trainer] {
  grid-column:1/-1;
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  align-items:center;
  gap:0;
  box-sizing:border-box!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0;
  min-height:24px!important;
  height:auto!important;
  margin:0!important;
  padding:0!important;
  border:var(--ppbui-separator-width) solid var(--ppbui-border)!important;
  border-radius:var(--ppbui-control-radius)!important;
  background:var(--ppbui-bg-0)!important;
  background-image:none!important;
  box-shadow:none!important;
  filter:none!important;
  color:var(--ppbui-text-muted)!important;
  font:600 var(--ppbui-font-size-meta)/1.15 var(--ppbui-font-data)!important;
  font-variant-numeric:tabular-nums;
  text-align:left!important;
  white-space:normal!important;
  overflow-wrap:anywhere;
}

[data-ppbui-wallet-trainer] > span {
  display:inline-flex;
  flex-wrap:wrap;
  align-items:center;
  justify-content:center;
  gap:3px;
  box-sizing:border-box;
  width:100%;
  min-height:22px;
  min-width:0;
  padding:1px var(--ppbui-space-2);
  overflow-wrap:anywhere;
  text-align:center;
}

[data-ppbui-wallet-trainer] > span + span {
  border-left:var(--ppbui-separator-width) solid var(--ppbui-border);
}

[data-ppbui-wallet-trainer] .pokeidle-currency__icon,
.ppbui-wallet-diamond-icon.pokeidle-currency__icon {
  flex:0 0 22px!important;
  width:22px!important;
  height:22px!important;
  object-fit:contain;
  image-rendering:pixelated;
}

[data-ppbui-wallet-trainer] .rmmz-icon,
.ppbui-wallet-diamond-icon.rmmz-icon {
  flex:0 0 22px!important;
  width:22px!important;
  height:22px!important;
  margin:-3px!important;
  transform:scale(.8)!important;
}

.ppbui-wallet-diamond-fallback {
  flex:0 0 auto!important;
  width:auto!important;
  height:auto!important;
  margin:0!important;
  transform:none!important;
  font-size:var(--ppbui-font-size-meta);
  line-height:1;
}

[data-ppbui-wallet-trainer]:hover,
[data-ppbui-wallet-trainer]:active {
  background:var(--ppbui-bg-2)!important;
  box-shadow:none!important;
}
`;
