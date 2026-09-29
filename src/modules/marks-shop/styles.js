export default `
.npc-shop-window.ppbui-marks-shop.ppbui-window {
  border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important;
  border-radius:var(--ppbui-radius)!important;
  background:var(--ppbui-bg-1)!important;
  background-image:none!important;
  color:var(--ppbui-text)!important;
  box-shadow:var(--ppbui-shadow-raised)!important;
  font-family:var(--ppbui-font-body)!important;
}
.npc-shop-window.ppbui-marks-shop > .pokeidle-panel__titlebar {
  min-height:var(--ppbui-control-height)!important;
  padding:var(--ppbui-space-2) var(--ppbui-space-3)!important;
  border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border)!important;
  border-radius:var(--ppbui-radius)!important;
  background:var(--ppbui-bg-1)!important;
  background-image:none!important;
  box-shadow:none!important;
}
.npc-shop-window.ppbui-marks-shop > .pokeidle-panel__titlebar .pokeidle-panel__title {
  color:var(--ppbui-text)!important;
  font:500 var(--ppbui-font-size-title)/var(--ppbui-line-height-tight) var(--ppbui-font-display)!important;
  letter-spacing:normal;
  text-shadow:none!important;
}
.npc-shop-window.ppbui-marks-shop > .pokeidle-panel__body.ppbui-shop-body {
  container-name:ppbui-marks-shop;
  container-type:inline-size;
  display:flex!important;
  min-height:0;
  flex-direction:column;
  gap:var(--ppbui-space-3);
  padding:var(--ppbui-space-4)!important;
  overflow:hidden!important;
  background:var(--ppbui-bg-1)!important;
  background-image:none!important;
  color:var(--ppbui-text)!important;
  font-family:var(--ppbui-font-body)!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__search.ppbui-input {
  box-sizing:border-box!important;
  width:100%!important;
  height:var(--ppbui-control-height)!important;
  min-height:var(--ppbui-control-height)!important;
  margin:0!important;
  padding:0 var(--ppbui-control-padding-x)!important;
  border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important;
  border-radius:var(--ppbui-radius)!important;
  background:var(--ppbui-bg-0)!important;
  background-image:none!important;
  color:var(--ppbui-text)!important;
  box-shadow:none!important;
  font:400 var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__search::placeholder { color:var(--ppbui-text-subtle)!important; opacity:1; }
.npc-shop-window.ppbui-marks-shop .npc-shop__search:focus-visible { outline:var(--ppbui-border-width) solid var(--ppbui-focus)!important; outline-offset:var(--ppbui-pixel-unit); }
.npc-shop-window.ppbui-marks-shop .ppbui-shop-search-label {
  display:grid;
  flex:0 0 auto;
  gap:var(--ppbui-space-1);
  min-width:0;
  color:var(--ppbui-text-muted);
}
.npc-shop-window.ppbui-marks-shop .ppbui-shop-search-copy {
  color:var(--ppbui-text-subtle);
  font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-data);
  letter-spacing:.04em;
  text-transform:uppercase;
}

.npc-shop-window.ppbui-marks-shop .npc-shop__shell {
  display:grid!important;
  min-height:0;
  flex:1 1 auto;
  grid-template-columns:minmax(0,1fr)!important;
  grid-template-rows:auto minmax(0,1fr);
  gap:var(--ppbui-space-3)!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__sidebar { min-width:0; padding:0!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__tabs {
  display:grid!important;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:var(--ppbui-space-2)!important;
  padding:0!important;
  border:0!important;
  background:transparent!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__tab.ppbui-button {
  width:100%;
  min-width:0!important;
  min-height:var(--ppbui-control-height)!important;
  justify-content:flex-start!important;
  overflow:hidden;
  padding-inline:var(--ppbui-space-3)!important;
  border-color:var(--ppbui-border)!important;
  background:var(--ppbui-bg-2)!important;
  color:var(--ppbui-text-muted)!important;
  font-size:var(--ppbui-font-size-secondary)!important;
  text-align:left!important;
  white-space:nowrap;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__tab > .pokeidle-item-icon {
  display:inline-block!important;
  flex:0 0 32px!important;
  margin:-6px!important;
  transform:scale(.625)!important;
  transform-origin:center;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__tab:hover:not(:disabled) { border-color:var(--ppbui-accent)!important; background:var(--ppbui-bg-3)!important; color:var(--ppbui-text)!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__tab.is-active {
  border-color:var(--ppbui-selected)!important;
  background:var(--ppbui-bg-2)!important;
  color:var(--ppbui-selected)!important;
  box-shadow:none!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__tab:focus-visible { outline:var(--ppbui-border-width) solid var(--ppbui-focus)!important; outline-offset:var(--ppbui-pixel-unit); }

.npc-shop-window.ppbui-marks-shop .npc-shop__content.ppbui-shop-content {
  display:flex!important;
  min-width:0;
  min-height:0;
  flex:1 1 auto;
  flex-direction:column;
  overflow:hidden!important;
  border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important;
  border-radius:var(--ppbui-radius)!important;
  background:var(--ppbui-bg-0)!important;
  background-image:none!important;
  color:var(--ppbui-text)!important;
  box-shadow:none!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__content-heading {
  display:flex;
  min-height:32px;
  flex:0 0 auto;
  align-items:center;
  justify-content:space-between;
  gap:var(--ppbui-space-3);
  box-sizing:border-box;
  padding:var(--ppbui-space-2) var(--ppbui-space-4)!important;
  border:0!important;
  border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border)!important;
  background:var(--ppbui-bg-1)!important;
  color:var(--ppbui-text)!important;
  font:700 var(--ppbui-font-size-section)/var(--ppbui-line-height-tight) var(--ppbui-font-body)!important;
  letter-spacing:.04em!important;
  text-transform:uppercase;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__content-heading > span {
  color:var(--ppbui-text-muted)!important;
  font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-data)!important;
  letter-spacing:0!important;
  text-transform:none;
}
.npc-shop-window.ppbui-marks-shop .element-mastery-note {
  box-sizing:border-box;
  margin:0!important;
  padding:var(--ppbui-space-2) var(--ppbui-space-4)!important;
  border:0!important;
  border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border)!important;
  border-left:var(--ppbui-border-width) solid var(--ppbui-info)!important;
  border-radius:var(--ppbui-radius)!important;
  background:var(--ppbui-bg-0)!important;
  color:var(--ppbui-text-muted)!important;
  font:400 var(--ppbui-font-size-meta)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important;
}

.npc-shop-window.ppbui-marks-shop .npc-shop__categories {
  display:flex!important;
  flex:0 0 auto;
  flex-wrap:wrap;
  gap:var(--ppbui-space-2)!important;
  padding:var(--ppbui-space-2) var(--ppbui-space-3)!important;
  overflow:visible!important;
  border:0!important;
  border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border)!important;
  background:var(--ppbui-bg-1)!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__category.ppbui-button {
  min-width:0;
  border-color:var(--ppbui-border)!important;
  color:var(--ppbui-text-muted)!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__category > small {
  display:grid;
  min-width:16px;
  height:16px;
  place-items:center;
  box-sizing:border-box;
  padding:0 var(--ppbui-space-1);
  border:var(--ppbui-separator-width) solid var(--ppbui-border)!important;
  border-radius:var(--ppbui-radius)!important;
  background:var(--ppbui-bg-0)!important;
  color:var(--ppbui-text-muted)!important;
  font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data)!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__category.is-active {
  border-color:var(--ppbui-selected)!important;
  background:var(--ppbui-bg-2)!important;
  color:var(--ppbui-selected)!important;
  box-shadow:none!important;
}
.npc-shop-window.ppbui-marks-shop .ppbui-shop-modes { justify-content:flex-end; }
.npc-shop-window.ppbui-marks-shop .ppbui-shop-modes > button { min-width:72px; }
.npc-shop-window.ppbui-marks-shop .ppbui-shop-modes > button.is-active {
  border-color:var(--ppbui-selected)!important;
  color:var(--ppbui-selected)!important;
  box-shadow:none!important;
}

.npc-shop-window.ppbui-marks-shop .npc-shop__list.ppbui-scroll {
  min-height:0;
  flex:1 1 auto;
  overflow:auto!important;
  padding:var(--ppbui-space-3)!important;
  background:var(--ppbui-bg-0)!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__buy-grid {
  display:grid!important;
  grid-template-columns:repeat(auto-fill,minmax(240px,1fr))!important;
  grid-auto-rows:auto!important;
  align-content:start;
  align-items:stretch;
  gap:var(--ppbui-space-3)!important;
}
.npc-shop-window.ppbui-marks-shop[data-ppbui-shop-buy-view="list"] .npc-shop__buy-grid {
  grid-template-columns:minmax(0,1fr)!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__buy-card.ppbui-card {
  box-sizing:border-box;
  display:grid!important;
  width:100%;
  min-width:0!important;
  height:auto!important;
  min-height:auto!important;
  grid-template-columns:44px minmax(0,1fr)!important;
  grid-template-rows:auto auto;
  align-items:start;
  gap:var(--ppbui-space-3)!important;
  margin:0!important;
  padding:var(--ppbui-space-3)!important;
  overflow:visible!important;
  border:var(--ppbui-separator-width) solid var(--ppbui-border)!important;
  border-radius:var(--ppbui-radius)!important;
  background:var(--ppbui-bg-2)!important;
  color:var(--ppbui-text)!important;
  box-shadow:none!important;
  transform:none!important;
}
.npc-shop-window.ppbui-marks-shop[data-ppbui-shop-buy-view="list"] .npc-shop__buy-card.ppbui-card {
  grid-template-columns:44px minmax(160px,1fr) minmax(300px,38%)!important;
  grid-template-rows:auto!important;
  align-items:center;
  min-height:66px!important;
  padding-block:var(--ppbui-space-2)!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__buy-card:hover { border-color:var(--ppbui-accent)!important; background:color-mix(in srgb,var(--ppbui-border) 12%,var(--ppbui-bg-2))!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__buy-card .npc-shop__item-icon {
  display:grid!important;
  width:42px!important;
  height:42px!important;
  grid-column:1;
  grid-row:1;
  place-items:center;
  overflow:hidden;
  border:var(--ppbui-separator-width) solid var(--ppbui-border)!important;
  border-radius:var(--ppbui-radius)!important;
  background:var(--ppbui-bg-0)!important;
  box-shadow:none!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__buy-card .npc-shop__item-info {
  display:flex;
  min-width:0;
  grid-column:2;
  grid-row:1;
  flex-direction:column;
  gap:var(--ppbui-space-1)!important;
  align-self:stretch;
  overflow:visible!important;
}
.npc-shop-window.ppbui-marks-shop[data-ppbui-shop-buy-view="list"] .npc-shop__buy-card .npc-shop__item-info {
  grid-column:2;
  grid-row:1;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__item-info > b {
  overflow:hidden;
  color:var(--ppbui-text)!important;
  font:700 var(--ppbui-font-size-body)/var(--ppbui-line-height-tight) var(--ppbui-font-body)!important;
  text-overflow:ellipsis;
  text-shadow:none!important;
  white-space:nowrap;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__item-info > small {
  color:var(--ppbui-text-muted)!important;
  font:400 var(--ppbui-font-size-meta)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important;
  white-space:normal!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__buy-card .npc-shop__item-info > small { display:block!important; overflow:visible!important; -webkit-line-clamp:unset!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__item-category.ppbui-badge {
  width:max-content;
  margin-top:var(--ppbui-space-1);
  color:var(--ppbui-text-muted)!important;
  text-transform:uppercase!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__purchase-options {
  display:grid!important;
  min-width:0;
  width:100%;
  grid-column:1/-1!important;
  grid-row:2!important;
  grid-template-columns:repeat(4,minmax(0,1fr))!important;
  align-self:end;
  gap:var(--ppbui-space-2)!important;
}
.npc-shop-window.ppbui-marks-shop[data-ppbui-shop-buy-view="list"] .npc-shop__purchase-options {
  grid-column:3!important;
  grid-row:1!important;
  align-self:center;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__purchase-button.ppbui-button {
  display:none!important;
  min-width:0!important;
  justify-content:center;
  gap:var(--ppbui-space-1)!important;
  padding-inline:var(--ppbui-space-2)!important;
  border-color:var(--ppbui-border)!important;
  color:var(--ppbui-text)!important;
  font-variant-numeric:tabular-nums;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__purchase-button:hover:not(:disabled) { border-color:var(--ppbui-accent)!important; color:var(--ppbui-accent-hi)!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__purchase-button > strong { color:inherit!important; font:700 var(--ppbui-font-size-secondary)/1 var(--ppbui-font-data)!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__purchase-button > span:not(.pokeidle-currency) { display:none!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__purchase-button .pokeidle-currency { min-width:0; color:var(--ppbui-text-muted)!important; font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data)!important; white-space:nowrap; }
.npc-shop-window.ppbui-marks-shop .npc-shop__purchase-button .pokeidle-currency__icon { display:none!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__purchase-button.is-success { border-color:var(--ppbui-success-text)!important; color:var(--ppbui-success-text)!important; background:var(--ppbui-bg-2)!important; box-shadow:none!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__custom-purchase {
  display:grid!important;
  grid-column:1/-1!important;
  grid-template-columns:auto minmax(86px,108px) minmax(96px,1fr) auto!important;
  align-items:center;
  gap:var(--ppbui-space-2)!important;
  padding:var(--ppbui-space-2)!important;
  border:var(--ppbui-separator-width) solid var(--ppbui-border)!important;
  color:var(--ppbui-text-muted)!important;
  font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body)!important;
}
.npc-shop-window.ppbui-marks-shop[data-ppbui-shop-buy-view="list"] .npc-shop__custom-purchase {
  grid-column:1!important;
  padding:0!important;
  border:0!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__custom-purchase input.ppbui-input,
.npc-shop-window.ppbui-marks-shop .npc-shop__sell-quantity input.ppbui-input {
  width:100%!important;
  min-width:0!important;
  height:var(--ppbui-control-height)!important;
  min-height:var(--ppbui-control-height)!important;
  text-align:center;
  font-variant-numeric:tabular-nums!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__custom-purchase input.ppbui-input {
  border-color:var(--ppbui-border-strong)!important;
  background:var(--ppbui-bg-0)!important;
  color:var(--ppbui-text)!important;
  font:700 var(--ppbui-font-size-secondary)/1 var(--ppbui-font-data)!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__custom-purchase input.ppbui-input:focus-visible {
  outline:var(--ppbui-border-width) solid var(--ppbui-focus)!important;
  outline-offset:var(--ppbui-pixel-unit);
}
.npc-shop-window.ppbui-marks-shop .ppbui-shop-quantity-steps {
  display:grid;
  grid-column:2/4;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:var(--ppbui-space-1);
  min-width:0;
}
.npc-shop-window.ppbui-marks-shop .ppbui-shop-quantity-step.ppbui-button {
  width:100%;
  min-width:0;
  padding-inline:var(--ppbui-space-2)!important;
  font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data)!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__custom-total { min-width:0; justify-self:end; color:var(--ppbui-text)!important; font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data)!important; font-variant-numeric:tabular-nums; white-space:nowrap; }
.npc-shop-window.ppbui-marks-shop .npc-shop__custom-button.ppbui-button { min-width:76px; }
.npc-shop-window.ppbui-marks-shop .npc-shop__list--sell,
.npc-shop-window.ppbui-marks-shop .npc-shop__list--pokemon,
.npc-shop-window.ppbui-marks-shop .npc-shop__list--buyback { display:grid!important; align-content:start; gap:var(--ppbui-space-2)!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__list--pokemon { grid-auto-rows:max-content!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__sell-row.ppbui-card,
.npc-shop-window.ppbui-marks-shop .npc-shop__pokemon-row.ppbui-card,
.npc-shop-window.ppbui-marks-shop .npc-shop__buyback-row.ppbui-card {
  box-sizing:border-box;
  width:100%;
  min-width:0;
  margin:0!important;
  padding:var(--ppbui-space-3)!important;
  border:var(--ppbui-separator-width) solid var(--ppbui-border)!important;
  border-radius:var(--ppbui-radius)!important;
  background:var(--ppbui-bg-2)!important;
  color:var(--ppbui-text)!important;
  box-shadow:none!important;
  transform:none!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__sell-row:hover,
.npc-shop-window.ppbui-marks-shop .npc-shop__pokemon-row:hover,
.npc-shop-window.ppbui-marks-shop .npc-shop__buyback-row:hover { border-color:var(--ppbui-accent)!important; background:color-mix(in srgb,var(--ppbui-border) 12%,var(--ppbui-bg-2))!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__sell-row:has(> input:checked),
.npc-shop-window.ppbui-marks-shop .npc-shop__pokemon-row:has(> input:checked) { border-color:var(--ppbui-selected)!important; box-shadow:none!important; }
.npc-shop-window.ppbui-marks-shop input[type="checkbox"] {
  -webkit-appearance:none!important;
  appearance:none!important;
  box-sizing:border-box;
  width:14px!important;
  min-width:14px!important;
  height:14px!important;
  min-height:14px!important;
  margin:0!important;
  border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important;
  border-radius:var(--ppbui-radius)!important;
  background:var(--ppbui-bg-0)!important;
  box-shadow:none!important;
  cursor:pointer;
}
.npc-shop-window.ppbui-marks-shop input[type="checkbox"]:checked { border-color:var(--ppbui-selected)!important; background:var(--ppbui-selected)!important; box-shadow:none!important; }
.npc-shop-window.ppbui-marks-shop input[type="checkbox"]:indeterminate { border-color:var(--ppbui-selected)!important; background:linear-gradient(var(--ppbui-selected),var(--ppbui-selected)) center/8px 2px no-repeat,var(--ppbui-bg-0)!important; box-shadow:none!important; }
.npc-shop-window.ppbui-marks-shop input[type="checkbox"]:focus-visible { outline:var(--ppbui-border-width) solid var(--ppbui-focus)!important; outline-offset:var(--ppbui-pixel-unit); }
.npc-shop-window.ppbui-marks-shop input[type="checkbox"]:disabled { border-color:var(--ppbui-border)!important; background:var(--ppbui-bg-1)!important; cursor:default; opacity:1!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__sell-row { display:grid!important; min-height:54px!important; grid-template-columns:18px 32px minmax(0,1fr) 66px auto!important; align-items:center; gap:var(--ppbui-space-3)!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__sell-quantity { display:grid; gap:var(--ppbui-space-1); color:var(--ppbui-text-muted)!important; font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-body)!important; text-align:center; }
.npc-shop-window.ppbui-marks-shop .npc-shop__pokemon-row { display:grid!important; min-height:62px!important; grid-template-columns:18px 48px minmax(0,1fr) auto!important; align-items:center; gap:var(--ppbui-space-3)!important; cursor:pointer; }
.npc-shop-window.ppbui-marks-shop .npc-shop__pokemon-row img { width:46px!important; height:46px!important; object-fit:contain; }
.npc-shop-window.ppbui-marks-shop .npc-shop__pokemon-details { display:flex; align-items:center; flex-wrap:wrap; gap:var(--ppbui-space-1); }
.npc-shop-window.ppbui-marks-shop .npc-shop__rarity.ppbui-quality-badge { display:inline-flex!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__price { color:var(--ppbui-success-text)!important; font:700 var(--ppbui-font-size-secondary)/1 var(--ppbui-font-data)!important; font-variant-numeric:tabular-nums; white-space:nowrap; }

.npc-shop-window.ppbui-marks-shop .npc-shop__quality-filters {
  display:flex;
  flex:0 0 auto;
  flex-wrap:wrap;
  align-items:center;
  gap:var(--ppbui-space-2)!important;
  padding:var(--ppbui-space-2) var(--ppbui-space-3)!important;
  border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border);
  background:var(--ppbui-bg-1)!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__quality-label { margin-right:var(--ppbui-space-2); color:var(--ppbui-text-muted)!important; font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-body)!important; text-transform:uppercase; }
.npc-shop-window.ppbui-marks-shop .npc-shop__quality.ppbui-button { min-width:0; border-color:var(--ppbui-border)!important; background:var(--ppbui-bg-2)!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__quality.quality-all { color:var(--ppbui-text-muted)!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__quality.quality-weak { color:var(--quality-weak)!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__quality.quality-common { color:var(--quality-common)!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__quality.quality-uncommon { color:var(--quality-uncommon)!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__quality.quality-rare { color:var(--quality-rare)!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__quality.quality-epic { color:var(--quality-epic)!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__quality.quality-legendary { color:var(--quality-legendary)!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__quality.quality-mythical { color:var(--quality-mythical)!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__quality.is-active { border-color:var(--ppbui-selected)!important; box-shadow:none!important; }

.npc-shop-window.ppbui-marks-shop .ppbui-shop-group { min-width:0; overflow:hidden; border:var(--ppbui-separator-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-2)!important; }
.npc-shop-window.ppbui-marks-shop .ppbui-shop-group-header { display:grid; min-height:32px; grid-template-columns:18px minmax(0,1fr) var(--ppbui-control-height); align-items:center; gap:var(--ppbui-space-3); padding:var(--ppbui-space-2) var(--ppbui-space-3); background:var(--ppbui-bg-1); }
.npc-shop-window.ppbui-marks-shop .ppbui-shop-group-facts { display:grid; min-width:0; grid-template-columns:minmax(0,1fr) auto auto; align-items:center; gap:var(--ppbui-space-3); }
.npc-shop-window.ppbui-marks-shop .ppbui-shop-group-toggle {
  display:grid!important;
  width:var(--ppbui-control-height)!important;
  min-width:var(--ppbui-control-height)!important;
  height:var(--ppbui-control-height)!important;
  min-height:var(--ppbui-control-height)!important;
  place-items:center;
  justify-self:end;
  padding:0!important;
  border-color:var(--ppbui-border)!important;
  background:var(--ppbui-bg-2)!important;
}
.npc-shop-window.ppbui-marks-shop .ppbui-shop-group-toggle::before { width:6px; height:6px; border-right:2px solid currentColor; border-bottom:2px solid currentColor; content:""; transform:rotate(-45deg); }
.npc-shop-window.ppbui-marks-shop .ppbui-shop-group-toggle[data-open="true"]::before { transform:rotate(45deg) translate(-1px,-1px); }
.npc-shop-window.ppbui-marks-shop .ppbui-shop-group-toggle:hover { border-color:var(--ppbui-accent)!important; background:var(--ppbui-bg-3)!important; }
.npc-shop-window.ppbui-marks-shop .ppbui-shop-group-name { overflow:hidden; color:var(--ppbui-text); font:700 var(--ppbui-font-size-body)/1 var(--ppbui-font-body); text-overflow:ellipsis; white-space:nowrap; }
.npc-shop-window.ppbui-marks-shop .ppbui-shop-group-meta { color:var(--ppbui-text-muted); font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data); white-space:nowrap; }
.npc-shop-window.ppbui-marks-shop .ppbui-shop-group-total { color:var(--ppbui-success-text); font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data); font-variant-numeric:tabular-nums; white-space:nowrap; }
.npc-shop-window.ppbui-marks-shop .ppbui-shop-group-body { display:grid; max-height:min(360px,50vh); align-content:start; gap:var(--ppbui-space-2); padding:var(--ppbui-space-2); overflow-x:hidden; overflow-y:auto; overscroll-behavior:contain; border-top:var(--ppbui-separator-width) solid var(--ppbui-border); background:var(--ppbui-bg-0); }
.npc-shop-window.ppbui-marks-shop .ppbui-shop-group-body[hidden] { display:none!important; }
.npc-shop-window.ppbui-marks-shop .ppbui-shop-group-body > .npc-shop__pokemon-row { margin:0!important; }
.npc-shop-window.ppbui-marks-shop .ppbui-shop-selection {
  display:block;
  min-width:0;
  min-height:0;
  margin:0!important;
  padding:0!important;
  border:0!important;
  background:transparent!important;
  color:var(--ppbui-text-muted)!important;
  font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-data)!important;
  letter-spacing:0!important;
  justify-self:end;
  text-transform:none!important;
  white-space:normal;
  overflow-wrap:anywhere;
}

.npc-shop-window.ppbui-marks-shop .npc-shop__sell-footer {
  display:grid!important;
  min-height:42px;
  flex:0 0 auto;
  grid-template-columns:minmax(0,1fr) auto!important;
  align-items:center;
  gap:var(--ppbui-space-4)!important;
  margin:0!important;
  padding:var(--ppbui-space-3)!important;
  border:0!important;
  border-top:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important;
  background:var(--ppbui-bg-1)!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__sell-footer:has(.ppbui-shop-selection) {
  grid-template-columns:auto minmax(0,1fr) auto!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__select-all {
  display:flex!important;
  min-width:0;
  min-height:0!important;
  align-items:center;
  justify-content:flex-start!important;
  gap:var(--ppbui-space-3);
  box-sizing:border-box;
  margin:0!important;
  padding:0!important;
  border:0!important;
  border-radius:var(--ppbui-radius)!important;
  background:transparent!important;
  color:var(--ppbui-text-muted)!important;
  box-shadow:none!important;
  font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__sell-button.ppbui-button--danger { min-width:160px; }

.npc-shop-window.ppbui-marks-shop .npc-shop__buyback-row { display:grid!important; min-height:72px!important; grid-template-columns:52px minmax(0,1fr) 150px!important; align-items:center; gap:var(--ppbui-space-3)!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__buyback-row:focus-visible { outline:var(--ppbui-border-width) solid var(--ppbui-focus)!important; outline-offset:var(--ppbui-pixel-unit); }
.npc-shop-window.ppbui-marks-shop .npc-shop__buyback-sprite { width:48px!important; height:48px!important; object-fit:contain; filter:none!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__buyback-controls { display:grid; grid-template-columns:1fr; align-items:center; gap:var(--ppbui-space-2); }
.npc-shop-window.ppbui-marks-shop .npc-shop__buyback-total { justify-self:end; }
.npc-shop-window.ppbui-marks-shop .npc-shop__buyback-date { color:var(--ppbui-text-subtle)!important; font-size:var(--ppbui-font-size-meta)!important; }
.npc-shop-window.ppbui-marks-shop .npc-shop__buyback-error { display:grid; place-items:center; gap:var(--ppbui-space-4); margin:auto; padding:var(--ppbui-space-6); color:var(--ppbui-text-muted); text-align:center; }

.npc-shop-window.ppbui-marks-shop .npc-shop__footer {
  display:flex!important;
  min-height:38px;
  flex:0 0 auto;
  align-items:center;
  justify-content:space-between;
  gap:var(--ppbui-space-4)!important;
  margin:0!important;
  padding:var(--ppbui-space-2) 0 0!important;
  border:0!important;
  border-top:var(--ppbui-separator-width) solid var(--ppbui-border)!important;
  background:var(--ppbui-bg-1)!important;
}
.npc-shop-window.ppbui-marks-shop .npc-shop__footer-wallet { display:flex; align-items:center; gap:var(--ppbui-space-3); min-width:0; }
.npc-shop-window.ppbui-marks-shop .npc-shop__footer-wallet > span { color:var(--ppbui-text-muted)!important; font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-body)!important; letter-spacing:.04em!important; text-transform:uppercase; }
.npc-shop-window.ppbui-marks-shop .npc-shop__gold { display:flex; min-height:28px; align-items:center; padding:0 var(--ppbui-space-3); border:var(--ppbui-separator-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-0)!important; color:var(--ppbui-text)!important; box-shadow:none!important; font:700 var(--ppbui-font-size-secondary)/1 var(--ppbui-font-data)!important; font-variant-numeric:tabular-nums; }
.npc-shop-window.ppbui-marks-shop .npc-shop__close.ppbui-button { min-width:72px; }

@container ppbui-marks-shop (max-width:620px) {
  .npc-shop-window.ppbui-marks-shop[data-ppbui-shop-buy-view="list"] .npc-shop__buy-card.ppbui-card {
    grid-template-columns:44px minmax(0,1fr)!important;
    grid-template-rows:auto auto!important;
  }
  .npc-shop-window.ppbui-marks-shop[data-ppbui-shop-buy-view="list"] .npc-shop__purchase-options {
    grid-column:1/-1!important;
    grid-row:2!important;
  }
  .npc-shop-window.ppbui-marks-shop .npc-shop__sell-row { grid-template-columns:18px 32px minmax(0,1fr)!important; }
  .npc-shop-window.ppbui-marks-shop .npc-shop__sell-row .npc-shop__sell-quantity { grid-column:2; grid-row:2; }
  .npc-shop-window.ppbui-marks-shop .npc-shop__sell-row > .npc-shop__price { grid-column:3; grid-row:2; justify-self:end; }
  .npc-shop-window.ppbui-marks-shop .npc-shop__pokemon-row { grid-template-columns:18px 44px minmax(0,1fr)!important; }
  .npc-shop-window.ppbui-marks-shop .npc-shop__pokemon-row > .npc-shop__price { grid-column:3; grid-row:2; justify-self:end; }
  .npc-shop-window.ppbui-marks-shop .npc-shop__pokemon-row img { width:42px!important; height:42px!important; }
  .npc-shop-window.ppbui-marks-shop .ppbui-shop-group-facts { grid-template-columns:minmax(0,1fr) auto; row-gap:var(--ppbui-space-1); }
  .npc-shop-window.ppbui-marks-shop .ppbui-shop-group-name { grid-column:1/-1; }
  .npc-shop-window.ppbui-marks-shop .ppbui-shop-group-meta { grid-column:1; }
  .npc-shop-window.ppbui-marks-shop .ppbui-shop-group-total { grid-column:2; }
  .npc-shop-window.ppbui-marks-shop .npc-shop__buyback-row { grid-template-columns:46px minmax(0,1fr)!important; }
  .npc-shop-window.ppbui-marks-shop .npc-shop__buyback-sprite { width:44px!important; height:44px!important; }
  .npc-shop-window.ppbui-marks-shop .npc-shop__buyback-controls { grid-column:1/-1; grid-template-columns:1fr auto; }
  .npc-shop-window.ppbui-marks-shop .npc-shop__sell-footer { grid-template-columns:1fr!important; }
  .npc-shop-window.ppbui-marks-shop .ppbui-shop-selection { justify-self:start; }
  .npc-shop-window.ppbui-marks-shop .npc-shop__sell-button.ppbui-button--danger { width:100%; min-width:0; }
}

@container ppbui-marks-shop (max-width:520px) {
  .npc-shop-window.ppbui-marks-shop .npc-shop__tabs { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .npc-shop-window.ppbui-marks-shop .npc-shop__buy-grid { grid-template-columns:minmax(0,1fr)!important; }
  .npc-shop-window.ppbui-marks-shop .npc-shop__content-heading { align-items:flex-start; flex-direction:column; gap:var(--ppbui-space-1); }
}

@container ppbui-marks-shop (max-width:420px) {
  .npc-shop-window.ppbui-marks-shop .npc-shop__purchase-options { grid-template-columns:minmax(0,1fr)!important; }
  .npc-shop-window.ppbui-marks-shop .npc-shop__custom-purchase { grid-column:1/-1!important; grid-template-columns:auto minmax(0,1fr) auto!important; }
  .npc-shop-window.ppbui-marks-shop .ppbui-shop-quantity-steps { grid-column:1/-1; }
  .npc-shop-window.ppbui-marks-shop .npc-shop__custom-total { justify-self:end; }
  .npc-shop-window.ppbui-marks-shop .npc-shop__custom-button.ppbui-button { grid-column:1/-1; width:100%; }
  .npc-shop-window.ppbui-marks-shop .npc-shop__footer { align-items:stretch; flex-direction:column; }
  .npc-shop-window.ppbui-marks-shop .npc-shop__close.ppbui-button { width:100%; }
}

@media(pointer:coarse) {
  .npc-shop-window.ppbui-marks-shop .npc-shop__tab,
  .npc-shop-window.ppbui-marks-shop .npc-shop__custom-button,
  .npc-shop-window.ppbui-marks-shop .npc-shop__sell-button,
  .npc-shop-window.ppbui-marks-shop .npc-shop__buyback-button { min-height:40px!important; }
  .npc-shop-window.ppbui-marks-shop input[type="checkbox"] { width:20px!important; min-width:20px!important; height:20px!important; min-height:20px!important; }
}
`;
