#!/usr/bin/env node
// Synthetic Node/JSDOM benchmark; never attaches to the game, WebView2, or user data.
// Run from the repository: node tools/coupled-workspace-webview2/perf/benchmark-cards.mjs
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { readAnalyzerSummary, mountCoupledWorkspaceAdapter } from "../../../src/modules/coupled-workspace/controller.js";
import { createCoupledCards } from "../../../src/modules/coupled-workspace/cards.js";
import { coupledWorkspaceConfig } from "../../../src/modules/coupled-workspace/config.js";

const HISTORIES = [0, 32, 1200, 10000];
const MODES = ["cards", "game"];
const PANE_COUNTS = [1, 2];
const SOURCE = "Better UI source modules via Node.js + JSDOM; synthetic data only";

const clock = () => performance.now();
const round = n => Math.round(n * 10000) / 10000;

export function summarize(samples) {
  if (!samples.length) return null;
  const ordered = [...samples].sort((a, b) => a - b);
  const percentile = fraction => ordered[Math.max(0, Math.ceil(ordered.length * fraction) - 1)];
  return {
    n: ordered.length,
    minMs: round(ordered[0]),
    p50Ms: round(percentile(0.5)),
    p95Ms: round(percentile(0.95)),
    maxMs: round(ordered.at(-1)),
    p95Caution: ordered.length < 100 ? "exploratory: <100 event samples" : null,
  };
}

export function fixtureSummary(historyCount) {
  // Fixed event content; only capturedAtMs is stamped at read time for the real age check.
  const at = 1700000000000;
  const specialHistory = Array.from({ length: historyCount }, (_, index) => ({
    atMs: at - index * 1000,
    speciesId: "synthetic-gengar",
    species: "Synthetic Gengar",
    rarity: index % 7 === 0 ? "legendary" : "epic",
    qualityMultiplier: 1.72,
    shiny: index % 101 === 0,
    chance: 0.25,
    result: index % 3 === 0 ? "captured" : "fled",
    ball: "Synthetic Ball",
    ivTotal: index % 3 === 0 ? 151 : null,
    captureDetails: index % 3 === 0 ? {
      gender: "male", nature: "bold", ivTotal: 151,
      ivs: { hp: 20, atk: 25, def: 26, spa: 24, spd: 28, spe: 28 },
    } : null,
  }));
  const lootHistory = Array.from({ length: 32 }, (_, index) => ({
    atMs: at - index * 1000,
    species: "Synthetic Gengar",
    directGold: 50, lootSellValue: 20, autoSold: true,
    autoSellValue: 10, items: [{ itemId: "synthetic-loot", qty: 2 }],
  }));
  return {
    protocol: 1, available: true, status: "running", leadershipActive: true,
    activeMs: 600000, seen: historyCount, captured: Math.floor(historyCount / 3),
    failed: historyCount - Math.floor(historyCount / 3),
    captureRate: 0.33, directGold: 100, revenue: 130, profit: 90,
    rarityCounts: { epic: { seen: historyCount, captured: Math.floor(historyCount / 3) } },
    currentTarget: { speciesId: "", species: "Synthetic Gengar", rarity: "epic", shiny: false, elements: ["ghost"] },
    specialHistory, attemptHistory: specialHistory.slice(0, 32), lootHistory,
  };
}

function clonePublicResponse(fixture) {
  // Models Analyzer public API returning a new projection per getSummary();
  // does not claim to benchmark the Analyzer's internal DB/pipeline. The
  // published snapshot must PRECEDE the caller's time anchor: the production
  // adapter passes Date.now() *before* getSummary(), and a timestamp created
  // inside this mock could otherwise be 1ms in its future across a clock tick.
  // Such a future value is correctly rejected by the production freshness
  // guard, but made the synthetic observer benchmark intermittently unmount
  // and remount the 32-row Cards DOM. Model a recent published snapshot.
  return {
    ...fixture,
    capturedAtMs: Date.now() - 1000,
    rarityCounts: { epic: { ...fixture.rarityCounts.epic } },
    currentTarget: { ...fixture.currentTarget, elements: [...fixture.currentTarget.elements] },
    attemptHistory: fixture.attemptHistory.map(row => ({
      ...row, captureDetails: row.captureDetails ? { ...row.captureDetails, ivs: { ...row.captureDetails.ivs } } : null,
    })),
    specialHistory: fixture.specialHistory.map(row => ({
      ...row, captureDetails: row.captureDetails ? { ...row.captureDetails, ivs: { ...row.captureDetails.ivs } } : null,
    })),
    lootHistory: fixture.lootHistory.map(row => ({
      ...row, items: row.items.map(item => ({ ...item })),
    })),
  };
}

export function createPane(fixture, { adapter = false } = {}) {
  const dom = new JSDOM(`<!doctype html><html lang="pt-BR"><head></head><body>
    <nav class="pokeidle-top-toolbar">
      <button data-menu-id="inventory"><span class="pokeidle-top-toolbar__label">Inventory</span></button>
      <button data-menu-id="hunts"><span class="pokeidle-top-toolbar__label">Hunts</span></button>
      <button data-menu-id="storage" disabled><span class="pokeidle-top-toolbar__label">Storage</span></button>
    </nav></body></html>`, { url: "https://fixture.invalid/", pretendToBeVisual: true });
  const win = dom.window;
  const metrics = { getSummaryCalls: 0, providerMs: 0, bridgeOut: [], bridgeOutBytes: 0, bridgeIn: 0 };
  const listeners = new Set();
  const timers = new Map();
  let timerId = 0;
  const nativeSetInterval = win.setInterval;
  const nativeClearInterval = win.clearInterval;
  // Intervals are advanced explicitly; no wall-time timer or game automation.
  win.setInterval = (callback, period) => {
    assert.equal(typeof callback, "function");
    timers.set(++timerId, { callback, period });
    return timerId;
  };
  win.clearInterval = id => { timers.delete(id); };
  win.__POKEPIXEL_HUNT_ANALYZER_PUBLIC__ = {
    protocol: 1,
    getSummary() {
      const before = clock();
      try {
        metrics.getSummaryCalls++;
        return clonePublicResponse(fixture);
      } finally {
        metrics.providerMs += clock() - before;
      }
    },
  };
  if (adapter) {
    win.__PPBUI_COUPLED_WORKSPACE__ = { protocol: 1 };
    win.chrome = { webview: {
      postMessage(message) {
        metrics.bridgeOut.push(message);
        metrics.bridgeOutBytes += Buffer.byteLength(JSON.stringify(message), "utf8");
      },
      addEventListener(type, listener) { if (type === "message") listeners.add(listener); },
      removeEventListener(type, listener) { if (type === "message") listeners.delete(listener); },
    } };
  }
  return {
    dom, win, metrics, timers,
    send(message) {
      metrics.bridgeIn++;
      for (const listener of listeners) listener({ data: message });
    },
    tick() {
      const intervals = [...timers.values()];
      assert.equal(intervals.length, 1, "one Analyzer polling interval per coupled pane");
      assert.equal(intervals[0].period, coupledWorkspaceConfig.analyzerPollMs);
      intervals[0].callback();
    },
    resetCounters() {
      metrics.getSummaryCalls = 0;
      metrics.providerMs = 0;
      metrics.bridgeOut.length = 0;
      metrics.bridgeOutBytes = 0;
      metrics.bridgeIn = 0;
    },
    close() {
      win.setInterval = nativeSetInterval;
      win.clearInterval = nativeClearInterval;
      dom.window.close();
    },
  };
}

export function observe(root, win) {
  const observer = new win.MutationObserver(() => {});
  observer.observe(root, { attributes: true, childList: true, characterData: true, subtree: true });
  const centralFilterObserver = new win.MutationObserver(() => {});
  centralFilterObserver.observe(root.ownerDocument.body, {
    attributes: true, childList: true, subtree: true,
    attributeFilter: ["hidden", "disabled", "aria-hidden", "aria-disabled", "lang"],
  });
  let records = 0;
  let childrenAdded = 0;
  let childrenRemoved = 0;
  let centralEligibleRecords = 0;
  return {
    clear: () => { observer.takeRecords(); centralFilterObserver.takeRecords(); },
    sample: () => {
      const batch = observer.takeRecords();
      records += batch.length;
      centralEligibleRecords += centralFilterObserver.takeRecords().length;
      for (const item of batch) {
        childrenAdded += item.addedNodes.length;
        childrenRemoved += item.removedNodes.length;
      }
    },
    report: () => ({ mutationRecords: records, centralEligibleRecords, nodesAdded: childrenAdded, nodesRemoved: childrenRemoved }),
    close: () => { observer.disconnect(); centralFilterObserver.disconnect(); },
  };
}

function closeAll(resources) {
  for (const resource of resources.reverse()) {
    try { resource(); } catch { /* cleanup best effort, the test assertions remain authoritative */ }
  }
}

function directCase({ historyCount, paneCount, mode, iterations, warmup }) {
  const fixture = fixtureSummary(historyCount);
  const resources = [];
  const panes = [];
  try {
    for (let n = 0; n < paneCount; n++) {
      const pane = createPane(fixture);
      resources.push(() => pane.close());
      const cards = createCoupledCards({ win: pane.win, textOnly: true });
      resources.push(() => cards.cleanup());
      cards.setMode(mode);
      const watcher = observe(cards.root, pane.win);
      resources.push(() => watcher.close());
      panes.push({ pane, cards, watcher });
    }
    const readMs = [], providerMs = [], sanitizeResidualMs = [], renderMs = [], totalMs = [];
    let rendered = 0;
    for (let event = -warmup; event < iterations; event++) {
      const isSample = event >= 0;
      const start = clock();
      let readThis = 0, providerThis = 0, renderThis = 0;
      for (const { pane, cards, watcher } of panes) {
        if (isSample) watcher.clear();
        const beforeCallsMs = pane.metrics.providerMs;
        const tRead = clock();
        const summary = readAnalyzerSummary(pane.win);
        const readDuration = clock() - tRead;
        assert.ok(summary, "real readAnalyzerSummary must accept the synthetic public summary");
        assert.equal(summary.specialHistory.length, historyCount, "full H must survive sanitization");
        const providerDuration = pane.metrics.providerMs - beforeCallsMs;
        assert.ok(readDuration >= providerDuration - 0.05, "read must encompass provider time");
        const tRender = clock();
        cards.render(summary);
        renderThis += clock() - tRender;
        rendered += isSample ? 1 : 0;
        readThis += readDuration;
        providerThis += providerDuration;
        if (isSample) watcher.sample();
      }
      if (isSample) {
        readMs.push(readThis);
        providerMs.push(providerThis);
        sanitizeResidualMs.push(Math.max(0, readThis - providerThis));
        renderMs.push(renderThis);
        totalMs.push(clock() - start);
      }
    }
    const nodes = panes.map(({ cards }) => cards.root.querySelectorAll("*").length);
    const attemptRows = panes.map(({ cards }) => cards.root.querySelectorAll(".ppbui-cards-attempt").length);
    assert.ok(attemptRows.every(count => count === historyCount),
      `full history DOM mismatch: expected ${historyCount} attempt rows per pane, got ${attemptRows.join(",")}`);
    const counts = panes.reduce((sum, entry) => {
      const value = entry.watcher.report();
      return {
        mutationRecords: sum.mutationRecords + value.mutationRecords,
        centralEligibleRecords: sum.centralEligibleRecords + value.centralEligibleRecords,
        nodesAdded: sum.nodesAdded + value.nodesAdded,
        nodesRemoved: sum.nodesRemoved + value.nodesRemoved,
      };
    }, { mutationRecords: 0, centralEligibleRecords: 0, nodesAdded: 0, nodesRemoved: 0 });
    return {
      type: "isolated-reader-and-render", historyCount, paneCount, mode,
      historyMaterialized: true, iterations, warmup,
      measured: {
        providerGetSummary: summarize(providerMs),
        readAnalyzerSummaryInclusive: summarize(readMs),
        sanitizeAndReadOverheadResidual: summarize(sanitizeResidualMs),
        cardsRender: summarize(renderMs),
        completeIteration: summarize(totalMs),
      },
      counts: {
        providerGetSummary: panes.reduce((n, p) => n + p.pane.metrics.getSummaryCalls, 0) - warmup * paneCount,
        readAnalyzerSummaryCalls: iterations * paneCount,
        acceptedSanitizations: iterations * paneCount,
        cardsRender: rendered,
        bridgeOutbound: 0,
        bridgeOutboundJsonBytes: 0,
        domElementsPerPane: nodes,
        attemptRowsPerPane: attemptRows,
        ...counts,
      },
      limits: ["Text-only Cards isolates rendering from image decoding and native game APIs.",
        "Sanitize residual = inclusive reader wall-time minus synthetic provider wall-time; includes JS call overhead.",
        "Manual sequential pane passes, not concurrent Chromium renderer execution."],
    };
  } finally { closeAll(resources); }
}

function readerOnlyCase({ historyCount, paneCount, iterations, warmup }) {
  const fixture = fixtureSummary(historyCount);
  const panes = [];
  try {
    for (let n = 0; n < paneCount; n++) panes.push(createPane(fixture));
    const readMs = [], providerMs = [], residualMs = [], totalMs = [];
    for (let event = -warmup; event < iterations; event++) {
      const start = clock();
      let read = 0, provider = 0;
      for (const pane of panes) {
        const oldProviderMs = pane.metrics.providerMs;
        const before = clock();
        const result = readAnalyzerSummary(pane.win);
        read += clock() - before;
        provider += pane.metrics.providerMs - oldProviderMs;
        assert.equal(result?.specialHistory.length, historyCount);
      }
      if (event >= 0) {
        readMs.push(read);
        providerMs.push(provider);
        residualMs.push(Math.max(0, read - provider));
        totalMs.push(clock() - start);
      }
    }
    return {
      type: "reader-only", historyCount, paneCount, iterations, warmup,
      historyMaterialized: false,
      measured: {
        providerGetSummary: summarize(providerMs),
        readAnalyzerSummaryInclusive: summarize(readMs),
        sanitizeAndReadOverheadResidual: summarize(residualMs),
        completeIteration: summarize(totalMs),
      },
      counts: { providerGetSummary: iterations * paneCount,
        readAnalyzerSummaryCalls: iterations * paneCount,
        acceptedSanitizations: iterations * paneCount,
        cardsRender: 0, bridgeOutbound: 0, bridgeOutboundJsonBytes: 0, domElementsPerPane: null },
      limits: ["H=10000 default is reader-only to avoid materializing ~100k+ JSDOM elements per pane.",
        "No Card render, DOM/layout, or Game-vs-Cards comparison can be inferred from this case."],
    };
  } finally { closeAll(panes.map(p => () => p.close())); }
}

function adapterCase({ historyCount, paneCount, mode, iterations, warmup }) {
  const fixture = fixtureSummary(historyCount);
  const resources = [];
  const panes = [];
  let setupBridgeOutbound = 0;
  let setupBridgeInbound = 0;
  let setupBridgeOutboundJsonBytes = 0;
  try {
    for (let n = 0; n < paneCount; n++) {
      const pane = createPane(fixture, { adapter: true });
      resources.push(() => pane.close());
      const adapter = mountCoupledWorkspaceAdapter(pane.win);
      resources.push(() => adapter.cleanup());
      const capabilities = pane.metrics.bridgeOut.find(msg => msg.type === "ppbui.coupled.capabilities");
      assert.ok(capabilities?.requestId, "adapter must send capabilities on mount");
      pane.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1,
        requestId: capabilities.requestId, ok: true });
      pane.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode: mode });
      setupBridgeOutbound += pane.metrics.bridgeOut.length;
      setupBridgeInbound += pane.metrics.bridgeIn;
      setupBridgeOutboundJsonBytes += pane.metrics.bridgeOutBytes;
      const root = pane.win.document.querySelector("[data-ppbui-coupled-cards]");
      assert.ok(root);
      assert.equal(root.hidden, mode === "game");
      const watcher = observe(root, pane.win);
      resources.push(() => watcher.close());
      panes.push({ pane, adapter, root, watcher });
    }
    for (let event = 0; event < warmup; event++) for (const { pane } of panes) pane.tick();
    panes.forEach(({ pane, watcher }) => { pane.resetCounters(); watcher.clear(); });
    const totalMs = [], providerMs = [];
    for (let event = 0; event < iterations; event++) {
      const start = clock();
      let provider = 0;
      for (const { pane, watcher } of panes) {
        const previous = pane.metrics.providerMs;
        pane.tick();
        provider += pane.metrics.providerMs - previous;
        watcher.sample();
      }
      providerMs.push(provider);
      totalMs.push(clock() - start);
    }
    const bridgeOutbound = panes.reduce((n, x) => n + x.pane.metrics.bridgeOut.length, 0);
    const bridgeOutboundJsonBytes = panes.reduce((n, x) => n + x.pane.metrics.bridgeOutBytes, 0);
    const getSummaryCalls = panes.reduce((n, x) => n + x.pane.metrics.getSummaryCalls, 0);
    const mutation = panes.reduce((sum, entry) => {
      const m = entry.watcher.report();
      return { mutationRecords: sum.mutationRecords + m.mutationRecords,
        centralEligibleRecords: sum.centralEligibleRecords + m.centralEligibleRecords,
        nodesAdded: sum.nodesAdded + m.nodesAdded, nodesRemoved: sum.nodesRemoved + m.nodesRemoved };
    }, { mutationRecords: 0, centralEligibleRecords: 0, nodesAdded: 0, nodesRemoved: 0 });
    const expectedReads = mode === "cards" ? iterations * paneCount : 0;
    assert.equal(getSummaryCalls, expectedReads,
      "only visible accepted Cards may read the public Analyzer on explicit 1Hz ticks");
    assert.equal(bridgeOutbound, 0, "stable polling must not post redundant capabilities/messages");
    const attemptRows = panes.map(({ root }) => root.querySelectorAll(".ppbui-cards-attempt").length);
    const expectedRows = mode === "cards" ? historyCount : 0;
    assert.ok(attemptRows.every(count => count === expectedRows),
      `adapter history materialization mismatch: expected ${expectedRows} rows per pane in ${mode}, got ${attemptRows.join(",")}`);
    return {
      type: "actual-coupled-adapter-poll", historyCount, paneCount, mode,
      historyMaterialized: mode === "cards", iterations, warmup,
      measured: { providerGetSummary: summarize(providerMs), adapterTickInclusive: summarize(totalMs) },
      counts: {
        providerGetSummary: getSummaryCalls,
        readAnalyzerSummaryCallsFromVerifiedSourcePath: expectedReads,
        acceptedSanitizationsFromVerifiedSourcePath: expectedReads,
        cardsRenderFromVerifiedSourcePath: expectedReads,
        cardsRenderCountInstrumentation: "inferred from guarded controller.js syncAnalyzer(); NOT directly intercepted",
        bridgeOutbound,
        bridgeOutboundJsonBytes,
        initialHandshakeBridgeOutbound: setupBridgeOutbound,
        initialHandshakeBridgeInbound: setupBridgeInbound,
        initialHandshakeBridgeOutboundJsonBytes: setupBridgeOutboundJsonBytes,
        bridgeInboundDuringTimedTicks: 0,
        domElementsPerPane: panes.map(({ root }) => root.querySelectorAll("*").length),
        attemptRowsPerPane: attemptRows,
        ...mutation,
      },
      limits: ["The adapter is real, but its interval is manually invoked; no browser timer throttling.",
        "Direct Game-mode reader/render cases are counterfactual costs, not adapter execution. The adapter keeps its history DOM empty until Cards is accepted.",
        "Adapter read/sanitize/render invocation counts are verified source-path inferences, not monkey-patch instrumentation.",
        "JSDOM does not implement Chromium layout, raster, GPU, renderer scheduling or real network."],
    };
  } finally { closeAll(resources); }
}

export function parseOptions(argv = []) {
  const config = {
    histories: HISTORIES, panes: PANE_COUNTS, modes: MODES,
    iterations: 100, warmup: 8, largeDom: false, quick: false,
  };
  for (const arg of argv) {
    if (arg === "--help") return { help: true };
    if (arg === "--quick") {
      config.iterations = 5;
      config.warmup = 1;
      config.quick = true;
      continue;
    }
    if (arg === "--large-dom") { config.largeDom = true; continue; }
    const [flag, value, ...rest] = arg.split("=");
    if (rest.length || !value) throw new Error(`Invalid option ${arg}`);
    if (flag === "--histories") {
      config.histories = value.split(",").map(Number);
      if (!config.histories.length || config.histories.some(n => !HISTORIES.includes(n)))
        throw new Error("histories must come from 0,32,1200,10000");
    } else if (flag === "--panes") {
      config.panes = value.split(",").map(Number);
      if (!config.panes.length || config.panes.some(n => !PANE_COUNTS.includes(n)))
        throw new Error("panes must come from 1,2");
    } else if (flag === "--modes") {
      config.modes = value.split(",");
      if (!config.modes.length || config.modes.some(n => !MODES.includes(n)))
        throw new Error("modes must come from cards,game");
    } else if (flag === "--iterations" || flag === "--warmup") {
      const parsed = Number(value);
      if (!Number.isSafeInteger(parsed) || parsed < (flag === "--iterations" ? 1 : 0) || parsed > 10000)
        throw new Error(`${flag} must be an integer within the supported range`);
      config[flag === "--iterations" ? "iterations" : "warmup"] = parsed;
    } else throw new Error(`Unknown option ${flag}`);
  }
  config.histories = [...new Set(config.histories)];
  config.panes = [...new Set(config.panes)];
  config.modes = [...new Set(config.modes)];
  return config;
}

export function runBenchmark(config = parseOptions([])) {
  if (config.help) throw new Error("Cannot run benchmark with --help");
  const started = clock();
  const cases = [];
  for (const historyCount of config.histories) {
    for (const paneCount of config.panes) {
      if (historyCount === 10000 && !config.largeDom) {
        cases.push(readerOnlyCase({ historyCount, paneCount, iterations: config.iterations, warmup: config.warmup }));
        for (const mode of config.modes) {
          cases.push({ type: "dom-case-skipped", historyCount, paneCount, mode, historyMaterialized: false,
            reason: "H=10000 DOM intentionally disabled; opt in with --large-dom (high memory/CPU in JSDOM)" });
        }
        continue;
      }
      for (const mode of config.modes) {
        cases.push(directCase({ historyCount, paneCount, mode,
          iterations: config.iterations, warmup: config.warmup }));
        cases.push(adapterCase({ historyCount, paneCount, mode,
          iterations: config.iterations, warmup: config.warmup }));
      }
    }
  }
  return {
    schema: "ppbui.cw-perf-001.synthetic.v1",
    source: SOURCE,
    runtime: { node: process.version, platform: process.platform, arch: process.arch },
    experiment: { histories: config.histories, panes: config.panes, modes: config.modes,
      iterations: config.iterations, warmup: config.warmup, largeDom: config.largeDom, quick: config.quick },
    timing: { clock: "node:perf_hooks performance.now; sequential manual ticks", totalHarnessMs: round(clock() - started) },
    limits: [
      "JSDOM/Node CPU microbenchmark, NOT live browser, Chromium GPU, WebView2 or game measurements.",
      "Synthetic public getSummary response clones rows; it does not exercise the real Analyzer's IndexedDB/pipeline.",
      "Per-event percentiles are empirical nearest-rank, not confidence intervals; events share process/JIT/GC state.",
      "1/2 panes are separate JSDOM instances advanced sequentially, not parallel WebView2 accounts.",
      "DOM mutation counts come from a harness-owned observer, not actual browser paint or core observer callbacks.",
      "centralEligibleRecords imitates the core observer attribute filter over synthetic body; it does NOT count rAF/reconcile callbacks.",
      "No user/game state, messages or cookies were accessed. Timed bridge counts exclude initial handshake and view change.",
      "Source stays unmodified; compare same commit, Node runtime, machine and conditions for before/after claims.",
    ],
    cases,
  };
}

const help = `Usage: node tools/coupled-workspace-webview2/perf/benchmark-cards.mjs [options]
--quick                 5 iterations / 1 warm-up; functional harness smoke, not stable p95
--iterations=100        Timed samples per scenario
--warmup=8              Untimed samples per scenario
--histories=0,32,1200,10000
--panes=1,2             Independent synthetic DOM contexts (sequential ticks)
--modes=cards,game
--large-dom             Materialize H=10000 in JSDOM (very high memory/CPU; opt-in)
--help                  Print usage
JSON goes to stdout only; no live game, browser or host access.`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseOptions(process.argv.slice(2));
    if (options.help) process.stdout.write(help);
    else process.stdout.write(JSON.stringify(runBenchmark(options), null, 2) + "\n");
  } catch (error) {
    process.stderr.write(`Synthetic benchmark error: ${error.message}\n`);
    process.exitCode = 1;
  }
}
