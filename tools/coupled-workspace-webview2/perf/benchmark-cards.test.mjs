import assert from "node:assert/strict";
import { test } from "node:test";
import { parseOptions, runBenchmark } from "./benchmark-cards.mjs";

test("CLI parses deterministic synthetic matrix and rejects unsupported settings", () => {
  const options = parseOptions(["--quick", "--histories=32,0,32", "--panes=2", "--modes=game"]);
  assert.deepEqual(options.histories, [32, 0]);
  assert.deepEqual(options.panes, [2]);
  assert.deepEqual(options.modes, ["game"]);
  assert.equal(options.iterations, 5);
  assert.equal(options.warmup, 1);
  assert.equal(parseOptions(["--help"]).help, true);
  assert.throws(() => parseOptions(["--histories=999"]), /histories/);
  assert.throws(() => parseOptions(["--panes=4"]), /panes/);
  assert.throws(() => parseOptions(["--modes=unknown"]), /modes/);
  assert.throws(() => parseOptions(["--iterations=0"]), /iterations/);
  assert.throws(() => parseOptions(["--large-dom=oops"]), /Invalid|Unknown/);
});

test("real reader, Cards and coupled adapter preserve full synthetic history and report measured vs inferred counts", () => {
  const result = runBenchmark(parseOptions([
    "--histories=0,32", "--panes=1,2", "--modes=cards,game",
    "--iterations=3", "--warmup=1",
  ]));
  assert.equal(result.schema, "ppbui.cw-perf-001.synthetic.v1");
  assert.equal(result.cases.length, 16);
  for (const row of result.cases) {
    assert.equal(row.historyMaterialized, row.type === "isolated-reader-and-render" || row.mode === "cards");
    assert.ok(row.measured.completeIteration?.n === 3 || row.measured.adapterTickInclusive?.n === 3);
    const reads = row.mode === "game" && row.type === "actual-coupled-adapter-poll" ? 0 : 3 * row.paneCount;
    assert.equal(row.counts.providerGetSummary, reads);
    assert.ok(row.counts.readAnalyzerSummaryCalls === reads
      || row.counts.readAnalyzerSummaryCallsFromVerifiedSourcePath === reads);
    assert.ok(row.counts.acceptedSanitizations === reads
      || row.counts.acceptedSanitizationsFromVerifiedSourcePath === reads);
    assert.equal(row.counts.bridgeOutbound, 0);
    assert.equal(row.counts.bridgeOutboundJsonBytes, 0);
    assert.ok(row.counts.centralEligibleRecords <= row.counts.mutationRecords + 200,
      "filtered observer should be no noisier than the broad DOM watch, beyond toolbar-only events");
    assert.equal(row.counts.domElementsPerPane.length, row.paneCount);
    assert.ok(row.counts.domElementsPerPane.every(n => n > 0));
    assert.deepEqual(row.counts.attemptRowsPerPane,
      Array(row.paneCount).fill(row.historyMaterialized ? row.historyCount : 0));
    if (row.type === "isolated-reader-and-render") {
      assert.equal(row.counts.cardsRender, 3 * row.paneCount);
      assert.equal(row.measured.cardsRender.n, 3);
      assert.equal(row.measured.readAnalyzerSummaryInclusive.n, 3);
      assert.equal(row.measured.sanitizeAndReadOverheadResidual.n, 3);
    } else {
      assert.equal(row.type, "actual-coupled-adapter-poll");
      assert.equal(row.counts.cardsRenderFromVerifiedSourcePath, reads);
      assert.match(row.counts.cardsRenderCountInstrumentation, /NOT directly intercepted/);
      assert.equal(row.measured.adapterTickInclusive.n, 3);
      assert.equal(row.counts.initialHandshakeBridgeOutbound, row.paneCount);
      assert.equal(row.counts.initialHandshakeBridgeInbound, row.paneCount * 2);
      assert.ok(row.counts.initialHandshakeBridgeOutboundJsonBytes > 0);
    }
  }
  const directGame = result.cases.find(row => row.type === "isolated-reader-and-render"
    && row.mode === "game" && row.historyCount === 32);
  assert.ok(directGame, "direct hidden-render counterfactual cost remains separately measurable");
});

test("H=10000 is reader-only by default and never secretly measures or creates a 10k DOM", () => {
  const result = runBenchmark(parseOptions([
    "--histories=10000", "--panes=1", "--modes=cards,game",
    "--iterations=2", "--warmup=0",
  ]));
  assert.equal(result.cases.length, 3);
  const [reader, ...skips] = result.cases;
  assert.equal(reader.type, "reader-only");
  assert.equal(reader.counts.providerGetSummary, 2);
  assert.equal(reader.counts.cardsRender, 0);
  assert.equal(reader.counts.domElementsPerPane, null);
  assert.equal(reader.measured.readAnalyzerSummaryInclusive.n, 2);
  assert.ok(skips.every(item => item.type === "dom-case-skipped"
    && item.historyMaterialized === false && /--large-dom/.test(item.reason)));
});

test("H=1200 incremental fixture remains bounded by requested iteration count", () => {
  const result = runBenchmark(parseOptions([
    "--histories=1200", "--panes=1", "--modes=game",
    "--iterations=2", "--warmup=0",
  ]));
  const [direct, adapter] = result.cases;
  assert.equal(direct.counts.cardsRender, 2);
  assert.equal(adapter.counts.cardsRenderFromVerifiedSourcePath, 0);
  assert.ok(direct.counts.domElementsPerPane[0] > 1200,
    "all 1200 records have real DOM nodes in the existing Cards implementation");
  assert.ok(adapter.counts.domElementsPerPane[0] > 0,
    "the coupled host retains the hidden Cards shell without materializing history");
  assert.deepEqual(direct.counts.attemptRowsPerPane, [1200]);
  assert.deepEqual(adapter.counts.attemptRowsPerPane, [0]);
});

test("a zero-warmup Cards timer reads immediately after entry while Game does no provider work", () => {
  const result = runBenchmark(parseOptions([
    "--histories=32", "--panes=1", "--modes=cards,game", "--iterations=2", "--warmup=0",
  ]));
  const cases = result.cases.filter(row => row.type === "actual-coupled-adapter-poll");
  assert.equal(cases.length, 2);
  const cards = cases.find(row => row.mode === "cards");
  const game = cases.find(row => row.mode === "game");
  assert.equal(cards.counts.providerGetSummary, 2);
  assert.equal(cards.counts.cardsRenderFromVerifiedSourcePath, 2);
  assert.equal(game.counts.providerGetSummary, 0);
  assert.equal(game.counts.cardsRenderFromVerifiedSourcePath, 0);
});
