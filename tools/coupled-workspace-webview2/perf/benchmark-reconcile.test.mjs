import assert from "node:assert/strict";
import { test } from "node:test";
import { parseReconcileOptions, runReconcileBenchmark } from "./benchmark-reconcile.mjs";
import { createPane, fixtureSummary } from "./benchmark-cards.mjs";
import { readAnalyzerSummary } from "../../../src/modules/coupled-workspace/controller.js";

test("mock public snapshot predates the controller clock anchor across an adjacent Date.now tick", () => {
  const previousNow = Date.now;
  const timeAnchor = 1740000000000;
  const pane = createPane(fixtureSummary(32));
  try {
    // Production syncAnalyzer() captures the reference instant before asking
    // the Analyzer for its existing public snapshot. The mock must not stamp
    // getSummary() with a timestamp later than that reference instant.
    Date.now = () => timeAnchor + 1;
    const summary = readAnalyzerSummary(pane.win, timeAnchor);
    assert.equal(summary?.specialHistory.length, 32);
    assert.equal(pane.metrics.getSummaryCalls, 1);
  } finally {
    Date.now = previousNow;
    pane.close();
  }
});

test("real freshness guard still rejects an explicitly future timestamp and accepts a restored published snapshot", () => {
  const previousNow = Date.now;
  const reference = 1740000000000;
  const pane = createPane(fixtureSummary(32));
  const publicApi = pane.win.__POKEPIXEL_HUNT_ANALYZER_PUBLIC__;
  const originalGetSummary = publicApi.getSummary;
  try {
    Date.now = () => reference + 1;
    publicApi.getSummary = () => ({ ...originalGetSummary(), capturedAtMs: reference + 1 });
    assert.equal(readAnalyzerSummary(pane.win, reference), null,
      "future data is correctly fail-closed in the production reader");
    publicApi.getSummary = originalGetSummary;
    assert.equal(readAnalyzerSummary(pane.win, reference)?.specialHistory.length, 32,
      "restoring valid mock timestamp recovers without relaxing production freshness");
  } finally {
    publicApi.getSummary = originalGetSummary;
    Date.now = previousNow;
    pane.close();
  }
});

test("separate opt-in CLI validates explicit scope without modifying baseline defaults", () => {
  const opts = parseReconcileOptions([
    "--quick", "--scenario=observer,history", "--histories=32,0", "--panes=2,1",
    "--filters=captured", "--flips=7",
  ]);
  assert.deepEqual(opts.scenarios, ["observer", "history"]);
  assert.deepEqual(opts.histories, [32, 0]);
  assert.deepEqual(opts.panes, [2, 1]);
  assert.deepEqual(opts.filters, ["captured"]);
  assert.equal(opts.iterations, 3);
  assert.equal(opts.flips, 7);
  assert.equal(parseReconcileOptions(["--help"]).help, true);
  for (const option of ["--scenario=visual", "--histories=999", "--panes=3",
    "--filters=shiny", "--iterations=0", "--flips=8", "--unknown=true"]) {
    assert.throws(() => parseReconcileOptions([option]), undefined, option);
  }
});

test("real Cards mutate H→H+1, edit middle, reset; selected result filter and DOM identities survive", async () => {
  const output = await runReconcileBenchmark(parseReconcileOptions([
    "--scenario=history", "--histories=0,32", "--panes=1,2",
    "--filters=all,captured", "--iterations=2",
  ]));
  assert.equal(output.schema, "ppbui.cw-perf-001.synthetic.reconcile.v1");
  assert.equal(output.cases.length, 8);
  for (const item of output.cases) {
    assert.equal(item.type, "history-mutations-direct-measured");
    assert.deepEqual(item.phases, ["append", "middleEdit", "reset"]);
    assert.equal(item.counts.providerGetSummaryMeasured, item.paneCount * 3 * item.iterations);
    assert.equal(item.counts.cardsRenderMeasuredThroughDirectWrapper, item.counts.providerGetSummaryMeasured);
    assert.equal(item.counts.readAnalyzerSummaryMeasured, item.counts.providerGetSummaryMeasured);
    const expected = item.filter === "captured" ? Math.ceil(item.historyCount / 3) : item.historyCount;
    assert.deepEqual(item.counts.actualDomRowsFinalPerPane, Array(item.paneCount).fill(expected));
    assert.deepEqual(item.counts.filterStillPressedPerPane,
      Array(item.paneCount).fill(item.filter === "captured"));
    for (const phase of item.phases) {
      assert.equal(item.measured[phase].eventTotal.n, 2);
      assert.equal(item.measured[phase].realCardsRender.n, 2);
      assert.equal(item.measured[phase].preservedRowIdentityPerEvent.n, 2);
      assert.ok(item.measured[phase].mutationRecordsPerEvent.p95 >= 1);
    }
    const identity = item.measured.append.preservedRowIdentityPerEvent.p95;
    assert.equal(identity, expected * item.paneCount, "append retained every previously mounted filtered row");
    if (expected > 1) {
      assert.equal(item.measured.middleEdit.preservedRowIdentityPerEvent.p95,
        expected * item.paneCount, "all rows other than middle edit retained identity");
      assert.ok(item.measured.reset.preservedRowIdentityPerEvent.p95 > 0,
        "reset preserves a suffix even when it reconstructs an unaffected prefix");
    }
  }
});

test("H=1200 full-history real DOM is exercised and records known reset-prefix replacement honestly", async () => {
  const output = await runReconcileBenchmark(parseReconcileOptions([
    "--scenario=history", "--histories=1200", "--panes=1",
    "--filters=all,captured", "--iterations=2",
  ]));
  assert.equal(output.cases.length, 2);
  const unfiltered = output.cases.find(item => item.filter === "all");
  const filtered = output.cases.find(item => item.filter === "captured");
  assert.equal(unfiltered.counts.actualDomRowsFinalPerPane[0], 1200);
  assert.equal(filtered.counts.actualDomRowsFinalPerPane[0], 400);
  assert.equal(unfiltered.measured.append.preservedRowIdentityPerEvent.p95, 1200);
  assert.equal(filtered.measured.append.preservedRowIdentityPerEvent.p95, 400);
  assert.ok(unfiltered.measured.reset.preservedRowIdentityPerEvent.p95 < 1200,
    "reset re-creates part of an unaffected prefix; do not overclaim all-row preservation");
  assert.ok(unfiltered.measured.reset.preservedRowIdentityPerEvent.p95 > 0);
});

test("real core MutationObserver+rAF dispatch coalesces storms and sends one capability rehydration per event", async () => {
  const output = await runReconcileBenchmark(parseReconcileOptions([
    "--scenario=observer", "--histories=32", "--panes=1", "--iterations=100", "--flips=101",
  ]));
  assert.equal(output.cases.length, 1);
  const result = output.cases[0];
  assert.equal(result.type, "real-core-observer-and-capability-rehydration");
  assert.equal(result.counts.nativeDisabledAttributeFlips, 10100);
  assert.equal(result.counts.nativeToolbarReplacements, 10);
  assert.equal(result.counts.realBridgeCapabilityPacketsMeasured, 100);
  assert.equal(result.counts.getSummaryMeasured, result.counts.coreReconcileMeasured);
  assert.equal(result.counts.coreRafExecutedMeasured, result.counts.coreReconcileMeasured);
  assert.ok(result.counts.coreReconcileMeasured >= 100);
  assert.ok(result.counts.coreRafScheduledMeasured >= 100);
  assert.equal(result.counts.bridgeOutboundAfterCleanup, 0);
  assert.equal(result.counts.providerReadsAfterCleanup, 0);
  for (const name of ["eventInclusive", "realCoreReconcilesPerEvent", "realRafExecutedPerEvent",
    "realBridgeMessagesPerEvent", "realProviderReadsPerEvent"]) {
    assert.equal(result.measured[name].n, 100);
    assert.equal(result.measured[name].p95Caution, null);
  }
  assert.equal(result.measured.realCoreReconcilesPerEvent.p95, 1);
  assert.equal(result.measured.realBridgeMessagesPerEvent.p95, 1);
});

test("100 actual core observer bursts in Game keep native capability sync without reading Analyzer", async () => {
  const output = await runReconcileBenchmark(parseReconcileOptions([
    "--scenario=observer", "--histories=32", "--panes=1", "--views=game",
    "--iterations=100", "--flips=101",
  ]));
  assert.equal(output.cases.length, 1);
  const result = output.cases[0];
  assert.equal(result.viewMode, "game");
  assert.equal(result.counts.coreReconcileMeasured, 100);
  assert.equal(result.counts.coreRafExecutedMeasured, 100);
  assert.equal(result.counts.nativeDisabledAttributeFlips, 10100);
  assert.equal(result.counts.nativeToolbarReplacements, 10);
  assert.equal(result.counts.realBridgeCapabilityPacketsMeasured, 100);
  assert.equal(result.counts.getSummaryMeasured, 0);
  assert.equal(result.counts.providerReadsAfterCleanup, 0);
  assert.equal(result.counts.bridgeOutboundAfterCleanup, 0);
  assert.equal(result.measured.realProviderReadsPerEvent.n, 100);
  assert.equal(result.measured.realProviderReadsPerEvent.p95, 0);
  assert.equal(result.measured.realCoreReconcilesPerEvent.p95, 1);
});

test("unsupported two-pane global observer and H10000 DOM are explicit skips, not fabricated measurements", async () => {
  const output = await runReconcileBenchmark(parseReconcileOptions([
    "--scenario=history,observer", "--histories=10000", "--panes=1,2",
    "--filters=captured", "--quick",
  ]));
  assert.equal(output.cases.length, 4);
  for (const item of output.cases) {
    assert.match(item.type, /skipped/);
    assert.equal(typeof item.reason, "string");
    assert.ok(!item.measured, "skipped scenario cannot report invented timing");
  }
});
