import assert from "node:assert/strict";
import { test } from "node:test";

import { canNavigateAnalyzerUi, navigateAnalyzerUi } from "../src/modules/card-mode/analyzer-ui.js";

test("Analyzer UI adapter is optional, versioned and destination-allowlisted", async () => {
  const win = {};
  assert.equal(canNavigateAnalyzerUi(win), false);
  assert.deepEqual(await navigateAnalyzerUi(win, "current"), { ok: false, reason: "analyzer-ui-unavailable" });

  win.__POKEPIXEL_HUNT_ANALYZER_UI__ = { protocol: 2, navigate: async () => ({ ok: true }) };
  assert.equal(canNavigateAnalyzerUi(win), false);

  const destinations = [];
  win.__POKEPIXEL_HUNT_ANALYZER_UI__ = {
    protocol: 1,
    async navigate(destination) {
      destinations.push(destination);
      return { ok: true };
    },
  };
  assert.equal(canNavigateAnalyzerUi(win), true);
  assert.deepEqual(await navigateAnalyzerUi(win, "history-attempts"), { ok: true });
  assert.deepEqual(await navigateAnalyzerUi(win, "#view-history"), { ok: false, reason: "unsupported-destination" });
  assert.deepEqual(destinations, ["history-attempts"]);
});

test("Analyzer UI adapter contains consumer failures", async () => {
  const win = {
    __POKEPIXEL_HUNT_ANALYZER_UI__: {
      protocol: 1,
      async navigate() { throw new Error("synthetic navigation failure"); },
    },
  };
  const result = await navigateAnalyzerUi(win, "current-rarity");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "analyzer-ui-unavailable");
  assert.equal("detail" in result, false);
});
