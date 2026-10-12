export const buffStripConfig = Object.freeze({
  id: "buff-strip",
  events: {
    geometryChange: "ppbui:buff-strip-geometry-change",
  },
  viewportMargin: 8,
  preferredWidth: 300,
  minimumWidth: 220,
  fallbackHeight: 32,
  storageKey: "ppbui:buff-panel:v1",
  selectors: {
    strip: ".pokeidle-buff-strip",
    list: ":scope > .pokeidle-buff-list",
    ticker: ":scope > .pokeidle-event-ticker",
    toolbar: ".pokeidle-top-toolbar",
    teamHud: ".pokeidle-team-hud[data-ppbui-team-hud-enhanced],.pokeidle-team-hud",
  },
});
