export const coupledWorkspaceConfig = Object.freeze({
  id: "coupled-workspace",
  protocol: 1,
  hostMarker: "__PPBUI_COUPLED_WORKSPACE__",
  analyzerGlobal: "__POKEPIXEL_HUNT_ANALYZER_PUBLIC__",
  analyzerPollMs: 1000,
  analyzerSourceMaxAgeMs: 3000,
  rootAttribute: "data-ppbui-coupled-workspace",
  selectors: {
    toolbar: ".pokeidle-top-toolbar",
    action: 'button[data-menu-id]:not([aria-haspopup="menu"])',
    label: ".pokeidle-top-toolbar__label:not(.pokeidle-menu-vector-icon)",
  },
});
