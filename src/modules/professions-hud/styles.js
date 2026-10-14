export default `
[data-ppbui-professions-hud-enhanced] .profession-workforce__slots {
  align-items: start;
}

[data-ppbui-professions-hud-enhanced] .profession-worker {
  min-height: 0 !important;
  border-color: var(--ppbui-border-strong) !important;
  border-radius: var(--ppbui-radius) !important;
  background: var(--ppbui-bg-1) !important;
  box-shadow: none !important;
  transition: none !important;
  transform: none !important;
}

[data-ppbui-professions-hud-enhanced] .profession-worker:hover {
  border-color: var(--ppbui-border-strong) !important;
  background: var(--ppbui-bg-1) !important;
  transform: none !important;
}

[data-ppbui-professions-state="empty"],
[data-ppbui-professions-state="locked"] {
  min-height: 190px !important;
}

[data-ppbui-professions-state="empty"] .profession-worker__empty,
[data-ppbui-professions-state="locked"] .profession-worker__empty {
  flex: 0 1 auto;
  justify-content: flex-start !important;
  gap: var(--ppbui-space-2) !important;
  min-height: 0;
  padding-top: var(--ppbui-space-5);
  text-align: left !important;
}

[data-ppbui-professions-state="empty"] .profession-worker__empty > strong,
[data-ppbui-professions-state="locked"] .profession-worker__empty > strong {
  color: var(--ppbui-text) !important;
  font: 700 var(--ppbui-font-size-body)/var(--ppbui-line-height-tight) var(--ppbui-font-body);
}

[data-ppbui-professions-top3-hint] {
  display: block;
  margin-top: var(--ppbui-space-1);
  color: var(--ppbui-accent-hi);
  font: 700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body);
  letter-spacing: .02em;
}

[data-ppbui-professions-hud-enhanced] .profession-worker__actions {
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  align-items: stretch;
  gap: var(--ppbui-space-1) !important;
}

[data-ppbui-professions-hud-enhanced] .profession-worker__actions > button {
  min-width: 0 !important;
  min-height: 38px !important;
  padding: 4px 5px !important;
  line-height: 1.1 !important;
  font: inherit !important;
}

[data-ppbui-professions-hud-enhanced] .ppbui-professions-swap-button {
  grid-column: auto;
  width: auto;
}

.ppbui-professions-animation-toggle {
  display: inline-flex;
  min-height: 28px !important;
  padding: 3px 8px !important;
  font: inherit !important;
}

.prof-work-stage[data-ppbui-professions-animation="hidden"] {
  display: none !important;
}

.ppbui-professions-collect-all {
  margin-bottom: var(--ppbui-space-2);
  min-height: 38px !important;
  padding: 4px 12px !important;
  font: inherit !important;
}

.prof-work-stage[data-ppbui-professions-animation="hidden"] .prof-stage-worker {
  display: none !important;
}

[data-ppbui-legacy-hidden=""],
.prof-work-license[hidden] {
  display: none !important;
}

[data-ppbui-professions-swap-panel] {
  display: grid;
  grid-column: 1 / -1;
  gap: var(--ppbui-space-3);
  min-width: 0;
  margin-top: var(--ppbui-space-2);
  padding: var(--ppbui-space-3);
  border: var(--ppbui-separator-width) solid var(--ppbui-border);
  border-left: var(--ppbui-border-width) solid var(--ppbui-accent);
  border-radius: var(--ppbui-radius);
  background: var(--ppbui-bg-0);
}

.ppbui-professions-swap-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ppbui-space-2);
  min-width: 0;
}

.ppbui-professions-swap-head strong {
  min-width: 0;
  overflow: hidden;
  color: var(--ppbui-text);
  font: 700 var(--ppbui-font-size-body)/var(--ppbui-line-height-tight) var(--ppbui-font-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ppbui-professions-swap-head span {
  flex: 0 0 auto;
  color: var(--ppbui-text-muted);
  font: 700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data);
}

.ppbui-professions-swap-field {
  display: grid;
  gap: var(--ppbui-space-1);
  min-width: 0;
  color: var(--ppbui-text-muted);
  font: 600 var(--ppbui-font-size-secondary)/var(--ppbui-line-height-body) var(--ppbui-font-body);
}

.ppbui-professions-swap-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--ppbui-space-2);
}

.ppbui-professions-swap-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--ppbui-space-1);
  min-width: 0;
}

.ppbui-professions-swap-fact {
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: var(--ppbui-space-2);
  border: var(--ppbui-separator-width) solid var(--ppbui-border);
  border-radius: var(--ppbui-radius);
  background: var(--ppbui-bg-1);
}

.ppbui-professions-swap-fact > span {
  color: var(--ppbui-text-subtle);
  font: 700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-body);
  text-transform: uppercase;
}

.ppbui-professions-swap-fact > b {
  overflow: hidden;
  color: var(--ppbui-text);
  font: 700 var(--ppbui-font-size-secondary)/var(--ppbui-line-height-tight) var(--ppbui-font-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ppbui-professions-swap-fact.is-delta {
  grid-column: 1 / -1;
  grid-template-columns: auto 1fr;
  align-items: center;
}

.ppbui-professions-swap-fact.is-delta > b {
  justify-self: end;
  color: var(--ppbui-text-muted);
}

.ppbui-professions-swap-fact.is-delta[data-direction="up"] > b {
  color: var(--ppbui-success-text);
}

.ppbui-professions-swap-fact.is-delta[data-direction="down"] > b {
  color: var(--ppbui-danger);
}

@media (pointer: coarse) {
  [data-ppbui-professions-swap-panel] .ppbui-button,
  [data-ppbui-professions-swap-panel] .ppbui-select,
  [data-ppbui-professions-hud-enhanced] .ppbui-professions-swap-button {
    min-height: 40px !important;
  }
}

@media (max-width: 430px) {
  [data-ppbui-professions-hud-enhanced] .profession-worker__actions {
    grid-template-columns: 1fr !important;
  }
  [data-ppbui-professions-hud-enhanced] .profession-worker__actions > button,
  [data-ppbui-professions-swap-panel] {
    grid-column: 1 !important;
  }
  .ppbui-professions-swap-actions {
    grid-template-columns: 1fr;
  }
}
`;
