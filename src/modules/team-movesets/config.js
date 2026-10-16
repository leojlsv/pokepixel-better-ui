export const teamMovesetsConfig = Object.freeze({
  id: "team-movesets",
  storageKey: "ppbui:team-movesets:v1",
  scopedStoragePrefix: "ppbui:team-movesets:v2:",
  legacyClaimKey: "ppbui:team-movesets:v2:legacy-claim",
  selectors: {
    root: ".pokeidle-team-panel",
    body: ".pokeidle-panel__body",
    profile: ".team-section--profile",
    hero: ".team-detail__hero",
    slot: ".team-slot",
    nativeMovesetButton: ":scope > button.pokeidle-ui-button",
  },
});
