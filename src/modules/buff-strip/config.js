export const buffStripConfig = Object.freeze({
  id: "buff-strip",
  events: {
    geometryChange: "ppbui:buff-strip-geometry-change",
  },
  aboveOverlap: 1,
  belowOverlap: 1,
  viewportMargin: 8,
  sideGap: 4,
  verticalMinimumWidth: 180,
  verticalPreferredWidth: 220,
  fallbackHorizontalWidth: 360,
  fallbackRailHeight: 30,
  selectors: {
    strip: ".pokeidle-buff-strip",
    list: ":scope > .pokeidle-buff-list",
    ticker: ":scope > .pokeidle-event-ticker",
    toolbar: ".pokeidle-top-toolbar",
  },
});
