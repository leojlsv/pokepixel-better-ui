export const teamPresetsConfig = Object.freeze({
  id: "team-presets",
  storageKey: "ppbui:team-presets:v1",
  actionTimeoutMs: 1800,
  selectors: {
    hud: ".pokeidle-team-hud",
    hudList: ".pokeidle-team-hud__list",
    hudCard: ".pokeidle-team-card:not(.pokeidle-team-card--empty)",
    teamPanel: ".pokeidle-team-panel",
    teamBody: ".pokeidle-panel__body",
    teamSlot: ".team-slot",
    teamActiveAction: ".team-active-state",
    teamRemoveAction: ".team-actions .pokeidle-btn--danger",
    picker: ".team-equip-picker",
    pickerCard: ".team-equip-card",
    teamMenuAction: 'button[data-menu-id="team"]',
  },
});
