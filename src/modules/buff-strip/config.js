export const buffStripConfig = Object.freeze({
  id: "buff-strip",
  aboveOverlap: 1,
  belowOverlap: 1,
  viewportMargin: 8,
  fallbackRailHeight: 30,
  selectors: {
    strip: ".pokeidle-buff-strip",
    list: ":scope > .pokeidle-buff-list",
    ticker: ":scope > .pokeidle-event-ticker",
    toolbar: ".pokeidle-top-toolbar",
  },
});
