export default `
.npc-iv-window.ppbui-geneticist.ppbui-window {
  min-width:0!important;
  max-width:calc(100vw - 24px)!important;
  overflow:hidden;
  border-radius:var(--ppbui-window-radius)!important;
  background:var(--ppbui-bg-1)!important;
  color:var(--ppbui-text)!important;
}

.npc-iv-window.ppbui-geneticist > .pokeidle-panel__titlebar.ppbui-titlebar {
  border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border)!important;
  background:var(--ppbui-bg-1)!important;
}

.npc-iv-window.ppbui-geneticist > .pokeidle-panel__body.ppbui-geneticist-body {
  min-width:0;
  min-height:0;
  background:var(--ppbui-bg-0)!important;
}

.npc-iv-window.ppbui-geneticist .npc-iv__primary-tabs {
  justify-content:center!important;
  align-items:stretch!important;
  gap:var(--ppbui-space-1)!important;
  margin:0!important;
  padding:var(--ppbui-space-2) var(--ppbui-space-3)!important;
  border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border)!important;
  background:var(--ppbui-bg-1)!important;
}

.npc-iv-window.ppbui-geneticist .npc-iv__primary-tabs > .ppbui-geneticist-tab {
  display:flex!important;
  flex:1 1 0!important;
  align-items:center!important;
  justify-content:center!important;
  max-width:190px;
  min-height:var(--ppbui-control-height)!important;
  padding:0 var(--ppbui-space-3)!important;
  border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important;
  border-radius:var(--ppbui-control-radius)!important;
  background:var(--ppbui-bg-0)!important;
  color:var(--ppbui-text-muted)!important;
  box-shadow:none!important;
  text-align:center!important;
  transform:none!important;
}

.npc-iv-window.ppbui-geneticist .npc-iv__primary-tabs > .ppbui-geneticist-tab[hidden] {
  display:none!important;
}

.npc-iv-window.ppbui-geneticist .npc-iv__primary-tabs > .ppbui-geneticist-tab.is-active {
  border-color:var(--ppbui-selected)!important;
  background:var(--ppbui-bg-3)!important;
  color:var(--ppbui-text)!important;
}

.npc-iv-window.ppbui-geneticist .npc-iv__primary-tabs > .ppbui-geneticist-tab:focus-visible,
.npc-iv-window.ppbui-geneticist .ppbui-geneticist-card:focus-visible {
  outline:var(--ppbui-focus-width) solid var(--ppbui-focus)!important;
  outline-offset:var(--ppbui-pixel-unit)!important;
}

.npc-iv-window.ppbui-geneticist .npc-genetic__content {
  gap:var(--ppbui-space-2);
  padding:var(--ppbui-space-3)!important;
  background:var(--ppbui-bg-0)!important;
}

.npc-iv-window.ppbui-geneticist .ppbui-geneticist-filter-head {
  display:flex;
  min-height:20px;
  align-items:center;
  justify-content:space-between;
  gap:var(--ppbui-space-2);
  margin:0;
  padding:0;
  border:0;
  background:transparent;
  color:var(--ppbui-text-muted);
  font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-body);
  letter-spacing:.05em;
  text-transform:uppercase;
}

.npc-iv-window.ppbui-geneticist .ppbui-geneticist-filter-grid {
  display:grid!important;
  grid-template-columns:repeat(4,minmax(0,1fr))!important;
  gap:var(--ppbui-space-2)!important;
  margin:0 0 var(--ppbui-space-3)!important;
  padding:var(--ppbui-space-2)!important;
  border:var(--ppbui-border-width) solid var(--ppbui-border);
  border-radius:var(--ppbui-radius);
  background:var(--ppbui-bg-1);
}

.npc-iv-window.ppbui-geneticist .ppbui-geneticist-filter-grid > .ppbui-input,
.npc-iv-window.ppbui-geneticist .ppbui-geneticist-filter-grid > .ppbui-select,
.npc-iv-window.ppbui-geneticist .ppbui-geneticist-filter-search {
  box-sizing:border-box!important;
  width:100%!important;
  min-width:0!important;
  min-height:var(--ppbui-control-height)!important;
  margin:0!important;
}

.npc-iv-window.ppbui-geneticist .ppbui-geneticist-filter-grid > input[type="search"] {
  grid-column:span 2;
}

.npc-iv-window.ppbui-geneticist .ppbui-geneticist-reroll-target {
  gap:0!important;
}

.npc-iv-window.ppbui-geneticist .ppbui-geneticist-reroll-target > * {
  order:4;
}

.npc-iv-window.ppbui-geneticist .ppbui-geneticist-reroll-target > .ppbui-geneticist-filter-head {
  order:0;
}

.npc-iv-window.ppbui-geneticist .ppbui-geneticist-reroll-target > .ppbui-geneticist-filter-search {
  order:1;
  width:calc(100% - (2 * var(--ppbui-space-3)))!important;
  margin:0 var(--ppbui-space-3) var(--ppbui-space-2)!important;
}

.npc-iv-window.ppbui-geneticist .ppbui-geneticist-reroll-target > .ppbui-geneticist-filter-grid {
  order:2;
  grid-template-columns:repeat(5,minmax(0,1fr))!important;
}

.npc-iv-window.ppbui-geneticist .ppbui-geneticist-reroll-target > .ppbui-geneticist-filter-results {
  order:3;
  margin-top:var(--ppbui-space-2);
}

.npc-iv-window.ppbui-geneticist .npc-genetic__quality-filters {
  gap:var(--ppbui-space-1)!important;
  grid-column:1/-1!important;
}

.npc-iv-window.ppbui-geneticist .npc-genetic__quality {
  min-height:32px;
  align-items:center;
  padding:var(--ppbui-space-1) var(--ppbui-space-2)!important;
  border:var(--ppbui-border-width) solid var(--ppbui-border)!important;
  border-radius:var(--ppbui-radius-badge)!important;
  background:var(--ppbui-bg-2)!important;
  color:var(--ppbui-text-muted)!important;
  font:600 var(--ppbui-font-size-meta)/1 var(--ppbui-font-body)!important;
}

.npc-iv-window.ppbui-geneticist .npc-genetic__quality:has(input:checked) {
  border-color:var(--ppbui-selected)!important;
  background:var(--ppbui-bg-3)!important;
  color:var(--ppbui-text)!important;
}

.npc-iv-window.ppbui-geneticist .npc-genetic__quality input[type="checkbox"] {
  box-sizing:border-box!important;
  width:16px!important;
  min-width:16px!important;
  height:16px!important;
  min-height:16px!important;
  margin:0!important;
  padding:0!important;
  border:0!important;
  border-radius:2px!important;
  accent-color:var(--ppbui-selected)!important;
}

.npc-iv-window.ppbui-geneticist .npc-genetic__quality:has(input:focus-visible),
.npc-iv-window.ppbui-geneticist .npc-iv__filter-option:has(input:focus-visible),
.npc-iv-window.ppbui-geneticist .ppbui-geneticist-filter-grid > .ppbui-input:focus-visible,
.npc-iv-window.ppbui-geneticist .ppbui-geneticist-filter-grid > .ppbui-select:focus-visible,
.npc-iv-window.ppbui-geneticist .ppbui-geneticist-filter-search:focus-visible {
  outline:var(--ppbui-focus-width) solid var(--ppbui-focus)!important;
  outline-offset:var(--ppbui-pixel-unit)!important;
}

.npc-iv-window.ppbui-geneticist .npc-genetic__quality:has(input:disabled) {
  cursor:default;
  color:var(--ppbui-text-subtle)!important;
}

.npc-iv-window.ppbui-geneticist .npc-iv__filter {
  gap:var(--ppbui-space-2)!important;
  margin-top:var(--ppbui-space-3)!important;
  padding:var(--ppbui-space-3)!important;
  border:var(--ppbui-border-width) solid var(--ppbui-border)!important;
  border-radius:var(--ppbui-radius)!important;
  background:var(--ppbui-bg-1)!important;
}

.npc-iv-window.ppbui-geneticist .npc-iv__filter-list {
  gap:var(--ppbui-space-1)!important;
}

.npc-iv-window.ppbui-geneticist .npc-iv__filter-option {
  min-height:32px;
  padding:var(--ppbui-space-1) var(--ppbui-space-2)!important;
  border:var(--ppbui-border-width) solid var(--ppbui-border)!important;
  border-radius:var(--ppbui-radius-badge)!important;
  background:var(--ppbui-bg-2)!important;
  color:var(--ppbui-text-muted)!important;
  text-decoration:none!important;
}

.npc-iv-window.ppbui-geneticist .npc-iv__filter-option.is-allowed {
  border-color:var(--ppbui-selected)!important;
  background:var(--ppbui-bg-3)!important;
  color:var(--ppbui-text)!important;
}

.npc-iv-window.ppbui-geneticist .npc-iv__filter-option.is-blocked {
  color:var(--ppbui-text-subtle)!important;
  text-decoration:line-through!important;
}

.npc-iv-window.ppbui-geneticist .genetic-awk__picker.ppbui-geneticist-filter-stack {
  gap:var(--ppbui-space-2)!important;
  padding:0!important;
  border:0;
  background:transparent;
}

.npc-iv-window.ppbui-geneticist .genetic-awk__picker.ppbui-geneticist-filter-stack > .ppbui-geneticist-filter-head {
  min-height:24px;
  padding:0;
  border:0;
  background:transparent;
}

.npc-iv-window.ppbui-geneticist .genetic-awk__picker.ppbui-geneticist-filter-stack > .genetic-awk__list {
  margin-top:var(--ppbui-space-1);
}

.npc-iv-window.ppbui-geneticist .genetic-exchange {
  grid-template-rows:auto minmax(0,1fr)!important;
}

.npc-iv-window.ppbui-geneticist .genetic-exchange > .ppbui-geneticist-filter-head[data-ppbui-geneticist-filter-head="materials"] {
  grid-column:1;
  grid-row:1;
}

.npc-iv-window.ppbui-geneticist .genetic-exchange > .genetic-exchange__sources.ppbui-geneticist-discovery-list {
  grid-column:1;
  grid-row:2;
  margin:0!important;
  padding:var(--ppbui-space-2)!important;
  border:var(--ppbui-border-width) solid var(--ppbui-border);
  border-top:0;
  border-radius:0 0 var(--ppbui-radius) var(--ppbui-radius);
  background:var(--ppbui-bg-1);
}

.npc-iv-window.ppbui-geneticist .genetic-exchange > .genetic-exchange__targets {
  grid-column:2;
  grid-row:1 / span 2;
}

.npc-iv-window.ppbui-geneticist .npc-genetic__species-list,
.npc-iv-window.ppbui-geneticist .npc-genetic__creature-list {
  grid-template-columns:repeat(2,minmax(0,1fr))!important;
  gap:var(--ppbui-space-2)!important;
  min-width:0;
  overflow-x:hidden;
}

.npc-iv-window.ppbui-geneticist .ppbui-geneticist-card {
  min-height:64px!important;
  gap:var(--ppbui-space-2)!important;
  padding:var(--ppbui-space-2)!important;
  border:var(--ppbui-border-width) solid var(--ppbui-border)!important;
  border-radius:var(--ppbui-radius)!important;
  background:var(--ppbui-bg-2)!important;
  color:var(--ppbui-text)!important;
  box-shadow:none!important;
  transform:none!important;
}

.npc-iv-window.ppbui-geneticist .ppbui-geneticist-card:hover:not(:disabled) {
  border-color:var(--ppbui-accent)!important;
  background:var(--ppbui-bg-3)!important;
}

.npc-iv-window.ppbui-geneticist .npc-genetic__creature.is-selected,
.npc-iv-window.ppbui-geneticist .npc-genetic__species.ppbui-geneticist-species--active {
  border-color:var(--ppbui-selected)!important;
  background:var(--ppbui-bg-3)!important;
}

.npc-iv-window.ppbui-geneticist .npc-genetic__creature.is-protected {
  border-color:var(--ppbui-warning)!important;
  background:var(--ppbui-bg-2)!important;
}

.npc-iv-window.ppbui-geneticist .npc-genetic__species-sprite,
.npc-iv-window.ppbui-geneticist .npc-nature__sprite {
  width:48px!important;
  height:48px!important;
  flex:0 0 48px!important;
  object-fit:contain;
  image-rendering:pixelated;
}

.npc-iv-window.ppbui-geneticist .npc-genetic__species-copy > b,
.npc-iv-window.ppbui-geneticist .npc-nature__pokemon-info > b {
  color:var(--ppbui-text)!important;
  font:700 var(--ppbui-font-size-body)/var(--ppbui-line-height-tight) var(--ppbui-font-body)!important;
}

.npc-iv-window.ppbui-geneticist .npc-genetic__species-copy > small,
.npc-iv-window.ppbui-geneticist .npc-nature__pokemon-info > small {
  color:var(--ppbui-text-muted)!important;
  font-size:var(--ppbui-font-size-meta)!important;
}

.npc-iv-window.ppbui-geneticist .npc-genetic__toolbar {
  min-height:var(--ppbui-control-height);
  margin:0!important;
  padding-bottom:var(--ppbui-space-2);
  border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border);
}

.npc-iv-window.ppbui-geneticist .npc-genetic__selection-count {
  margin:0!important;
  color:var(--ppbui-text-muted)!important;
  font:600 var(--ppbui-font-size-secondary)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important;
}

.npc-iv-window.ppbui-geneticist .npc-genetic__extract-action {
  min-width:220px!important;
  margin-top:var(--ppbui-space-2)!important;
}

.npc-iv-window.ppbui-geneticist[data-ppbui-geneticist-layout="split"] {
  display:grid!important;
  grid-template-columns:minmax(240px,34%) minmax(0,1fr);
  grid-template-rows:auto minmax(0,1fr);
}

.npc-iv-window.ppbui-geneticist[data-ppbui-geneticist-layout="split"] > .pokeidle-panel__titlebar {
  grid-column:1/-1;
  grid-row:1;
}

.npc-iv-window.ppbui-geneticist[data-ppbui-geneticist-layout="split"] > .ppbui-geneticist-species-pane {
  grid-column:1;
  grid-row:2;
}

.npc-iv-window.ppbui-geneticist[data-ppbui-geneticist-layout="split"] > .pokeidle-panel__body {
  grid-column:2;
  grid-row:2;
}

.npc-iv-window.ppbui-geneticist .ppbui-geneticist-species-pane {
  display:grid;
  min-width:0;
  min-height:0;
  grid-template-rows:auto minmax(0,1fr);
  gap:var(--ppbui-space-2);
  padding:var(--ppbui-space-3);
  overflow:hidden;
  border-right:var(--ppbui-separator-width) solid var(--ppbui-border);
  background:var(--ppbui-bg-1);
}

.npc-iv-window.ppbui-geneticist .ppbui-geneticist-species-pane[hidden] { display:none!important; }

.npc-iv-window.ppbui-geneticist .ppbui-geneticist-species-title {
  color:var(--ppbui-text-muted);
  font:700 var(--ppbui-font-size-secondary)/1 var(--ppbui-font-body);
  letter-spacing:.04em;
  text-transform:uppercase;
}

.npc-iv-window.ppbui-geneticist .ppbui-geneticist-species-pane .npc-genetic__species-list {
  display:grid!important;
  grid-template-columns:minmax(0,1fr)!important;
  align-content:start;
  overflow-y:auto;
  overscroll-behavior:contain;
}

.npc-iv-window.ppbui-geneticist .ppbui-geneticist-species-pane .npc-genetic__species {
  min-height:58px!important;
}

/* The native cinematic remains the completion authority and Better UI activates its
   own Skip path immediately. These guards prevent CSS motion during that transition. */
.npc-extraction,
.npc-extraction * {
  animation:none!important;
  transition:none!important;
}

@media (max-width:724px) {
  .npc-iv-window.ppbui-geneticist .ppbui-geneticist-filter-grid,
  .npc-iv-window.ppbui-geneticist .ppbui-geneticist-reroll-target > .ppbui-geneticist-filter-grid {
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
  }
  .npc-iv-window.ppbui-geneticist .genetic-exchange {
    grid-template-columns:minmax(0,1fr)!important;
    grid-template-rows:auto minmax(0,auto) auto!important;
  }
  .npc-iv-window.ppbui-geneticist .genetic-exchange > .ppbui-geneticist-filter-head[data-ppbui-geneticist-filter-head="materials"] {
    grid-column:1; grid-row:1;
  }
  .npc-iv-window.ppbui-geneticist .genetic-exchange > .genetic-exchange__sources.ppbui-geneticist-discovery-list {
    grid-column:1; grid-row:2;
  }
  .npc-iv-window.ppbui-geneticist .genetic-exchange > .genetic-exchange__targets {
    grid-column:1; grid-row:3;
  }
  .npc-iv-window.ppbui-geneticist[data-ppbui-geneticist-layout="split"] {
    grid-template-columns:minmax(0,1fr)!important;
    grid-template-rows:auto minmax(120px,190px) minmax(0,1fr)!important;
  }
  .npc-iv-window.ppbui-geneticist[data-ppbui-geneticist-layout="split"] > .pokeidle-panel__titlebar { grid-column:1; grid-row:1; }
  .npc-iv-window.ppbui-geneticist[data-ppbui-geneticist-layout="split"] > .ppbui-geneticist-species-pane {
    grid-column:1; grid-row:2; border-right:0; border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border);
  }
  .npc-iv-window.ppbui-geneticist[data-ppbui-geneticist-layout="split"] > .pokeidle-panel__body { grid-column:1; grid-row:3; }
  .npc-iv-window.ppbui-geneticist .ppbui-geneticist-species-pane .npc-genetic__species-list { grid-template-columns:repeat(2,minmax(0,1fr))!important; }
}

@media (max-width:544px) {
  .npc-iv-window.ppbui-geneticist .npc-iv__primary-tabs {
    flex-wrap:wrap!important;
    overflow-x:hidden!important;
  }
  .npc-iv-window.ppbui-geneticist .npc-iv__primary-tabs > .ppbui-geneticist-tab {
    flex:1 1 calc(50% - var(--ppbui-space-1))!important;
    max-width:none;
  }
  .npc-iv-window.ppbui-geneticist .ppbui-geneticist-filter-grid,
  .npc-iv-window.ppbui-geneticist .ppbui-geneticist-reroll-target > .ppbui-geneticist-filter-grid { grid-template-columns:minmax(0,1fr)!important; }
  .npc-iv-window.ppbui-geneticist .ppbui-geneticist-filter-grid > input[type="search"] { grid-column:1!important; }
  .npc-iv-window.ppbui-geneticist .npc-genetic__quality-filters { grid-column:1!important; }
  .npc-iv-window.ppbui-geneticist .npc-genetic__species-list,
  .npc-iv-window.ppbui-geneticist .npc-genetic__creature-list,
  .npc-iv-window.ppbui-geneticist .ppbui-geneticist-species-pane .npc-genetic__species-list { grid-template-columns:minmax(0,1fr)!important; }
  .npc-iv-window.ppbui-geneticist .npc-genetic__extract-action { width:100%!important; min-width:0!important; }
}
`;
