export const buffStripConfig = Object.freeze({
  id: "buff-strip",
  overlap: 1,
  viewportMargin: 8,
  selectors: {
    strip: ".pokeidle-buff-strip",
    list: ":scope > .pokeidle-buff-list",
    ticker: ":scope > .pokeidle-event-ticker",
    toolbar: ".pokeidle-top-toolbar",
  },
});
