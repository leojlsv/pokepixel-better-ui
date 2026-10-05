export const cardModeConfig = Object.freeze({
  id: "card-mode",
  analyzerGlobal: "__POKEPIXEL_HUNT_ANALYZER_PUBLIC__",
  analyzerProtocol: 1,
  analyzerControlGlobal: "__POKEPIXEL_HUNT_ANALYZER_CONTROL__",
  analyzerUiGlobal: "__POKEPIXEL_HUNT_ANALYZER_UI__",
  analyzerUiProtocol: 1,
  analyzerPollMs: 1000,
  analyzerSourceMaxAgeMs: 3000,
  selectors: {
    toolbar: ".pokeidle-top-toolbar",
    action: 'button[data-menu-id]:not([aria-haspopup="menu"])',
    label: ".pokeidle-top-toolbar__label:not(.pokeidle-menu-vector-icon)",
  },
});
