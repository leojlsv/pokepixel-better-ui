#!/usr/bin/env node
// Separate, OPT-IN benchmark for changing history and the REAL Better UI core observer.
// JSDOM synthetic fixtures only; no live game, browser, host, profile, or network access.
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createBetterUI } from "../../../src/core/bootstrap.js";
import { createCoupledWorkspaceModule } from "../../../src/modules/coupled-workspace/index.js";
import { readAnalyzerSummary } from "../../../src/modules/coupled-workspace/controller.js";
import { createCoupledCards } from "../../../src/modules/coupled-workspace/cards.js";
import { createPane, fixtureSummary, observe, summarize } from "./benchmark-cards.mjs";

const now = () => performance.now();
const round = n => Math.round(n * 10000) / 10000;
const PERMITTED_HISTORIES = [0, 32, 1200, 10000];

// summarize() names its units "Ms". These are actual integer counts, not time.
function summarizeCount(values) {
  const summary = summarize(values);
  if (!summary) return null;
  return {
    n: summary.n,
    min: summary.minMs,
    p50: summary.p50Ms,
    p95: summary.p95Ms,
    max: summary.maxMs,
    p95Caution: summary.p95Caution,
  };
}

function attemptRows(body) {
  return [...body.children].filter(row => row.classList.contains("ppbui-cards-attempt"));
}

function collectDelta(before, after) {
  return Object.fromEntries(Object.keys(after).map(key => [key, after[key] - before[key]]));
}

function historyCase({ historyCount, paneCount, filter, iterations, largeDom }) {
  if (historyCount === 10000 && !largeDom) return {
    type: "history-mutations-skipped", historyCount, paneCount, filter,
    reason: "H=10000 DOM materialization requires explicit --large-dom; see legacy reader-only benchmark",
  };
  const resources = [];
  const entries = [];
  const ops = ["append", "middleEdit", "reset"];
  const samples = Object.fromEntries(ops.map(op => [op, { elapsed: [], reader: [], render: [], mutations: [], added: [], removed: [] }]));
  const preserved = Object.fromEntries(ops.map(op => [op, []]));
  let verifiedRenderedCalls = 0;
  let verifiedReads = 0;
  try {
    for (let paneNumber = 0; paneNumber < paneCount; paneNumber++) {
      const fixture = fixtureSummary(historyCount);
      const base = fixture.specialHistory;
      const pane = createPane(fixture);
      resources.push(() => pane.close());
      const cards = createCoupledCards({ win: pane.win, textOnly: true });
      resources.push(() => cards.cleanup());
      cards.setMode("cards");
      const body = cards.root.querySelector("[data-card-attempt-body]");
      assert.ok(body);
      // Each counted render invokes the actual production method. No runtime monkey-patching.
      const render = summary => { verifiedRenderedCalls++; return cards.render(summary); };
      const read = () => {
        const summary = readAnalyzerSummary(pane.win);
        verifiedReads++;
        assert.ok(summary);
        return summary;
      };
      render(read());
      if (filter === "captured") cards.root.querySelector('[data-card-attempt-result="captured"]').click();
      const watcher = observe(body, pane.win);
      resources.push(() => watcher.close());
      entries.push({ fixture, base, pane, cards, body, read, render, watcher });
    }
    const baseProviderCalls = entries.reduce((n, p) => n + p.pane.metrics.getSummaryCalls, 0);
    const baseRenderCalls = verifiedRenderedCalls;
    const baseReaderCalls = verifiedReads;
    const emit = (op, work, check) => {
      const t0 = now();
      let readerMs = 0, renderMs = 0, mutationTotal = 0, addedTotal = 0, removedTotal = 0;
      let preservedTotal = 0;
      for (const entry of entries) {
        const { pane, fixture, watcher, read, render } = entry;
        const beforeMutation = watcher.report();
        work(entry);
        const tRead = now();
        const summary = read();
        readerMs += now() - tRead;
        assert.equal(summary.specialHistory.length, fixture.specialHistory.length);
        const tRender = now();
        render(summary);
        renderMs += now() - tRender;
        watcher.sample();
        const delta = collectDelta(beforeMutation, watcher.report());
        mutationTotal += delta.mutationRecords;
        addedTotal += delta.nodesAdded;
        removedTotal += delta.nodesRemoved;
        assert.equal(pane.metrics.getSummaryCalls >= 1, true);
        preservedTotal += check(entry);
      }
      const elapsed = now() - t0;
      samples[op].elapsed.push(elapsed);
      samples[op].reader.push(readerMs);
      samples[op].render.push(renderMs);
      samples[op].mutations.push(mutationTotal);
      samples[op].added.push(addedTotal);
      samples[op].removed.push(removedTotal);
      preserved[op].push(preservedTotal);
    };

    for (let cycle = 0; cycle < iterations; cycle++) {
      emit("append", entry => {
        entry.initialRows = attemptRows(entry.body);
        entry.initialLast = entry.initialRows.at(-1) ?? null;
        entry.appended = {
          atMs: 1700000100000 + cycle * 1000 + entries.indexOf(entry),
          speciesId: "synthetic-added", species: `Synthetic Added ${cycle}`,
          rarity: "legendary", shiny: false, qualityMultiplier: 1.25,
          chance: 0.33, result: "captured", ball: "Synthetic Ball",
        };
        entry.fixture.specialHistory = [entry.appended, ...entry.base];
      }, entry => {
        const rows = attemptRows(entry.body);
        assert.equal(rows.length, entry.initialRows.length + 1);
        assert.match(rows[0].textContent, new RegExp(`Synthetic Added ${cycle}`));
        entry.initialRows.forEach((row, index) => assert.equal(rows[index + 1], row));
        entry.afterAppendFirst = rows[0];
        return entry.initialRows.length;
      });

      emit("middleEdit", entry => {
        const { base, fixture, body } = entry;
        const rawMiddle = historyCount ? Math.floor(historyCount / 2) : -1;
        const originalIndex = filter === "captured" && rawMiddle >= 0
          ? rawMiddle - rawMiddle % 3 : rawMiddle;
        entry.editIndex = originalIndex;
        const changed = [...fixture.specialHistory];
        const index = originalIndex < 0 ? 0 : originalIndex + 1;
        changed[index] = { ...changed[index], ball: `Edited ${cycle}` };
        fixture.specialHistory = changed;
        entry.beforeEditRows = attemptRows(body);
        entry.visibleEditIndex = originalIndex < 0 ? 0 : filter === "captured"
          ? 1 + Math.floor(originalIndex / 3) : originalIndex + 1;
        entry.beforeEditedRow = entry.beforeEditRows[entry.visibleEditIndex];
      }, entry => {
        const rows = attemptRows(entry.body);
        assert.equal(rows.length, entry.beforeEditRows.length);
        assert.notEqual(rows[entry.visibleEditIndex], entry.beforeEditedRow,
          "middle edit must replace exactly the edited row");
        assert.match(rows[entry.visibleEditIndex].textContent, new RegExp(`Edited ${cycle}`));
        let unchanged = 0;
        rows.forEach((row, index) => {
          if (index === entry.visibleEditIndex) return;
          assert.equal(row, entry.beforeEditRows[index]);
          unchanged++;
        });
        return unchanged;
      });

      emit("reset", entry => {
        entry.beforeResetRows = attemptRows(entry.body);
        entry.fixture.specialHistory = entry.base;
      }, entry => {
        const rows = attemptRows(entry.body);
        assert.equal(rows.length, entry.initialRows.length);
        const expectedTail = entry.initialLast;
        if (expectedTail && entry.editIndex !== historyCount - 1)
          assert.equal(rows.at(-1), expectedTail, "reset preserves unaffected tail DOM");
        // The current prefix/suffix algorithm can rebuild an unaffected prefix
        // when an appended head and a middle edit are reset together. Record
        // actual identities below rather than inventing full preservation.
        assert.equal(entry.cards.root.querySelector('[data-card-attempt-result="captured"]')
          .getAttribute("aria-pressed"), String(filter === "captured"),
        "user-visible result filter must remain unchanged through append/edit/reset");
        if (historyCount === 0) assert.equal(entry.body.querySelectorAll(".ppbui-cards-attempt").length, 0);
        return rows.filter(row => entry.initialRows.includes(row)).length;
      });
    }
    const readerCalls = verifiedReads - baseReaderCalls;
    const renderCalls = verifiedRenderedCalls - baseRenderCalls;
    const providerCalls = entries.reduce((n, p) => n + p.pane.metrics.getSummaryCalls, 0) - baseProviderCalls;
    assert.equal(readerCalls, 3 * iterations * paneCount);
    assert.equal(renderCalls, readerCalls);
    assert.equal(providerCalls, readerCalls);
    assert.equal(entries.reduce((n, e) => n + e.fixture.specialHistory.length, 0), paneCount * historyCount);
    return {
      type: "history-mutations-direct-measured", historyCount, paneCount, filter, iterations,
      phases: ops,
      measured: Object.fromEntries(ops.map(op => [op, {
        eventTotal: summarize(samples[op].elapsed),
        realReadAnalyzerSummary: summarize(samples[op].reader),
        realCardsRender: summarize(samples[op].render),
        mutationRecordsPerEvent: summarizeCount(samples[op].mutations),
        nodesAddedPerEvent: summarizeCount(samples[op].added),
        nodesRemovedPerEvent: summarizeCount(samples[op].removed),
        preservedRowIdentityPerEvent: summarizeCount(preserved[op]),
      }])),
      counts: {
        providerGetSummaryMeasured: providerCalls,
        readAnalyzerSummaryMeasured: readerCalls,
        cardsRenderMeasuredThroughDirectWrapper: renderCalls,
        actualDomRowsFinalPerPane: entries.map(e => attemptRows(e.body).length),
        filterStillPressedPerPane: entries.map(e =>
          e.cards.root.querySelector('[data-card-attempt-result="captured"]').getAttribute("aria-pressed") === "true"),
      },
      limits: [
        "Actual production readAnalyzerSummary/cards.render, instrumented at explicit call site; NOT the host adapter's private cards.render.",
        "Every cycle appends H→H+1, modifies a rendered middle row (or the new row when H=0), then resets to H.",
        "Identity assertions verify append and edit preservation plus the reset tail; reset prefix may currently rebuild.",
        "p50/p95 are per operation across sequential panes, inclusive of fixture invocation overhead; JSDOM only.",
      ],
    };
  } finally {
    for (const cleanup of resources.reverse()) cleanup();
  }
}

function scopedGlobalWindow(win, rafClock) {
  const previous = new Map();
  const patch = {
    window: win,
    document: win.document,
    MutationObserver: win.MutationObserver,
    requestAnimationFrame: callback => rafClock.schedule(callback),
    cancelAnimationFrame: id => rafClock.cancel(id),
  };
  for (const [key, value] of Object.entries(patch)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  return () => {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  };
}

function rafQueue() {
  let next = 0;
  const queued = new Map();
  const stats = { scheduled: 0, executed: 0, cancelled: 0 };
  return {
    schedule(callback) { stats.scheduled++; queued.set(++next, callback); return next; },
    cancel(id) { if (queued.delete(id)) stats.cancelled++; },
    async drain(maxFrames = 12) {
      let passes = 0;
      while (true) {
        // Deliver JSDOM MutationObserver microtasks, then flush ONE browser-style frame.
        await Promise.resolve();
        await Promise.resolve();
        if (!queued.size) return passes;
        if (++passes > maxFrames) throw new Error("Synthetic observer failed to quiesce within 12 rAF frames");
        const callbacks = [...queued.values()];
        queued.clear();
        for (const callback of callbacks) { stats.executed++; callback(now()); }
      }
    },
    stats,
    pending() { return queued.size; },
  };
}

async function observerCase({ historyCount, paneCount, iterations, flips, viewMode = "cards", traceObserver = false }) {
  if (paneCount !== 1) return {
    type: "core-observer-skipped", historyCount, paneCount,
    reason: "createBetterUI uses one global document; two independent simultaneous JSDOM globals would misattribute callbacks",
  };
  if (historyCount === 10000) return {
    type: "core-observer-skipped", historyCount, paneCount,
    reason: "H=10000 DOM and the global observer scenario deliberately skipped; use --large-dom with history only",
  };
  const fixture = fixtureSummary(historyCount);
  const pane = createPane(fixture, { adapter: true });
  // Core observer has a single global document; patched only while this synthetic case runs.
  const frame = rafQueue();
  const win = pane.win;
  const doc = win.document;
  const realSetTimeout = win.setTimeout;
  const realClearTimeout = win.clearTimeout;
  const deadlines = new Map();
  let timeoutId = 0;
  let restoreGlobals = null;
  let app = null;
  let diagnosticObserver = null;
  let diagnosticEvent = -1;
  const diagnosticMutations = [];
  let actualReconciles = 0;
  let appStarted = false;
  try {
    restoreGlobals = scopedGlobalWindow(win, frame);
    win.setTimeout = callback => { deadlines.set(++timeoutId, callback); return timeoutId; };
    win.clearTimeout = id => { deadlines.delete(id); };
    const module = createCoupledWorkspaceModule();
    const originalReconcile = module.reconcile;
    module.reconcile = (...args) => { actualReconciles++; return originalReconcile(...args); };
    app = createBetterUI({ modules: [module] });
    app.start();
    appStarted = true;
    if (traceObserver) {
      // Diagnostic-only passive observer. It never changes the application DOM,
      // and is entirely absent from the measured default benchmark.
      diagnosticObserver = new win.MutationObserver(records => {
        for (const record of records) {
          const target = record.target;
          diagnosticMutations.push({
            event: diagnosticEvent,
            type: record.type,
            attr: record.attributeName || null,
            tag: target?.nodeName || null,
            className: typeof target?.className === "string" ? target.className.slice(0, 100) : "",
            childrenAdded: record.addedNodes?.length || 0,
            childrenRemoved: record.removedNodes?.length || 0,
          });
          if (diagnosticMutations.length > 80) diagnosticMutations.shift();
        }
      });
      diagnosticObserver.observe(doc.body, {
        attributes: true, childList: true, subtree: true,
        attributeFilter: ["hidden", "disabled", "aria-hidden", "aria-disabled", "lang"],
      });
      diagnosticObserver.observe(doc.documentElement, { attributes: true, attributeFilter: ["lang"] });
    }
    const initialCapability = pane.metrics.bridgeOut.find(message => message.type === "ppbui.coupled.capabilities");
    assert.ok(initialCapability?.requestId);
    pane.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1,
      requestId: initialCapability.requestId, ok: true });
    pane.send({ type: "ppbui.coupled.set-view", protocol: 1, viewMode });
    await frame.drain();
    const root = doc.querySelector("[data-ppbui-coupled-cards]");
    assert.ok(root);
    assert.equal(root.hidden, viewMode === "game");
    const metricsBase = { ...frame.stats, reconciles: actualReconciles };
    pane.resetCounters();
    const samples = { event: [], reconcile: [], raf: [], posts: [], reads: [], rehydrations: [] };
    let replaced = 0;
    let expectedCapabilityPackets = 0;
    let totalMutationFlips = 0;
    for (let i = 0; i < iterations; i++) {
      diagnosticEvent = i;
      const pre = {
        reconciles: actualReconciles, scheduled: frame.stats.scheduled,
        executed: frame.stats.executed, provider: pane.metrics.getSummaryCalls,
        outbound: pane.metrics.bridgeOut.length,
      };
      const start = now();
      const toolbar = doc.querySelector(".pokeidle-top-toolbar");
      assert.ok(toolbar);
      if (i % 10 === 0) {
        toolbar.replaceWith(toolbar.cloneNode(true));
        replaced++;
      }
      // A whole burst in the same task should coalesce into rAF, never a loop per mutation.
      const button = doc.querySelector('button[data-menu-id="storage"]');
      assert.ok(button);
      for (let n = 0; n < flips; n++) {
        button.disabled = !button.disabled;
        totalMutationFlips++;
      }
      await frame.drain();
      const deltaReconcile = actualReconciles - pre.reconciles;
      const deltaRaf = frame.stats.executed - pre.executed;
      const deltaPosts = pane.metrics.bridgeOut.length - pre.outbound;
      const deltaReads = pane.metrics.getSummaryCalls - pre.provider;
      assert.ok(deltaReconcile > 0, "real core observer must invoke real adapter reconcile");
      assert.equal(deltaRaf, deltaReconcile, "each core reconcile in this fixture is a real rAF dispatch");
      assert.ok(deltaPosts <= 1, "one burst cannot send duplicate capability snapshots");
      assert.equal(deltaReads, viewMode === "cards" ? deltaReconcile : 0,
        "only visible Cards may read the public Analyzer during real core observer reconciliation");
      if (i > 0) assert.ok(deltaRaf <= 2,
        `one mutation burst should coalesce under idempotent render; event=${i}, `
        + `rAFExecuted=${deltaRaf}, rAFScheduled=${frame.stats.scheduled - pre.scheduled}, `
        + `reconciles=${deltaReconcile}, providerReads=${deltaReads}, `
        + `bridgeCapabilities=${deltaPosts}, pendingFrames=${frame.pending()}`
        + (traceObserver ? `, recentEligibleMutations=${JSON.stringify(diagnosticMutations.slice(-50))}` : ""));
      const fresh = pane.metrics.bridgeOut.at(-1);
      if (deltaPosts) {
        assert.equal(fresh.type, "ppbui.coupled.capabilities");
        const reported = fresh.surfaces.find(surface => surface.id === "storage");
        assert.equal(reported?.available, !button.disabled, "current native availability wins");
        pane.send({ type: "ppbui.coupled.capabilities-accepted", protocol: 1,
          requestId: fresh.requestId, ok: true });
        expectedCapabilityPackets++;
      }
      samples.event.push(now() - start);
      samples.reconcile.push(deltaReconcile);
      samples.raf.push(deltaRaf);
      samples.posts.push(deltaPosts);
      samples.reads.push(deltaReads);
      samples.rehydrations.push(i % 10 === 0 ? 1 : 0);
    }
    assert.equal(frame.pending(), 0);
    assert.equal(expectedCapabilityPackets, pane.metrics.bridgeOut.length);
    assert.equal(doc.documentElement.getAttribute("data-ppbui-coupled-workspace"), "true");
    assert.equal(root.hidden, viewMode === "game");
    const totals = {
      coreReconcileMeasured: actualReconciles - metricsBase.reconciles,
      coreRafScheduledMeasured: frame.stats.scheduled - metricsBase.scheduled,
      coreRafExecutedMeasured: frame.stats.executed - metricsBase.executed,
      getSummaryMeasured: pane.metrics.getSummaryCalls,
      realBridgeCapabilityPacketsMeasured: pane.metrics.bridgeOut.length,
      realBridgeOutboundJsonBytesMeasured: pane.metrics.bridgeOutBytes,
      nativeDisabledAttributeFlips: totalMutationFlips,
      nativeToolbarReplacements: replaced,
    };
    const beforeStop = { reads: pane.metrics.getSummaryCalls, posts: pane.metrics.bridgeOut.length, reconciles: actualReconciles };
    app.stop();
    appStarted = false;
    const toolbar = doc.querySelector(".pokeidle-top-toolbar");
    toolbar.querySelector('[data-menu-id="storage"]').disabled = true;
    toolbar.replaceWith(toolbar.cloneNode(true));
    await frame.drain();
    assert.deepEqual({ reads: pane.metrics.getSummaryCalls, posts: pane.metrics.bridgeOut.length, reconciles: actualReconciles },
      beforeStop, "core observer and bridge must be silent after cleanup");
    assert.equal(pane.timers.size, 0, "coupled analyzer interval removed");
    assert.equal(deadlines.size, 0, "capability ACK and retry timeout removed");
    return {
      type: "real-core-observer-and-capability-rehydration",
      historyCount, paneCount, viewMode, iterations, flipsPerEvent: flips,
      measured: {
        eventInclusive: summarize(samples.event),
        realCoreReconcilesPerEvent: summarizeCount(samples.reconcile),
        realRafExecutedPerEvent: summarizeCount(samples.raf),
        realBridgeMessagesPerEvent: summarizeCount(samples.posts),
        realProviderReadsPerEvent: summarizeCount(samples.reads),
      },
      counts: { ...totals, bridgeOutboundAfterCleanup: pane.metrics.bridgeOut.length - beforeStop.posts,
        providerReadsAfterCleanup: pane.metrics.getSummaryCalls - beforeStop.reads },
      limits: [
        "Real createBetterUI, createDomObserver, coupled module and WebView2 adapter in isolated JSDOM.",
        "Core reconcile and synthetic rAF dispatch measured by wrapper; private adapter cards.render remains INFERRED, never claimed measured.",
        "Each event triggers native disabled-attribute burst; every tenth event replaces the native toolbar.",
        "Fake rAF is drained deterministically and capability ACK is synthetic; actual Chromium scheduling/paint is not measured.",
        "No live game/host/browser, no actual user events, no public API mutation, no real timer throttling.",
      ],
    };
  } finally {
    // Keep cleanup fail-closed even when app.stop() or synthetic setup throws.
    try {
      diagnosticObserver?.disconnect();
      if (appStarted) app?.stop();
    } finally {
      try {
        win.setTimeout = realSetTimeout;
        win.clearTimeout = realClearTimeout;
        restoreGlobals?.();
      } finally {
        pane.close();
      }
    }
  }
}

export function parseReconcileOptions(args = []) {
  const result = {
    scenarios: ["history", "observer"], histories: [32], panes: [1],
    filters: ["all", "captured"], views: ["cards"], iterations: 100, flips: 101,
    largeDom: false, quick: false, traceObserver: false,
  };
  for (const arg of args) {
    if (arg === "--help") return { help: true };
    if (arg === "--quick") { result.iterations = 3; result.flips = 5; result.quick = true; continue; }
    if (arg === "--large-dom") { result.largeDom = true; continue; }
    if (arg === "--trace-observer") { result.traceObserver = true; continue; }
    const [flag, raw, ...extra] = arg.split("=");
    if (!raw || extra.length) throw new Error(`Invalid argument: ${arg}`);
    if (flag === "--scenario" || flag === "--histories" || flag === "--panes" || flag === "--filters" || flag === "--views") {
      const values = raw.split(",");
      const choices = { "--scenario": ["history", "observer"], "--histories": PERMITTED_HISTORIES.map(String),
        "--panes": ["1", "2"], "--filters": ["all", "captured"], "--views": ["cards", "game"] }[flag];
      if (!values.length || values.some(item => !choices.includes(item))) throw new Error(`Unsupported ${flag} option`);
      const field = { "--scenario": "scenarios", "--histories": "histories", "--panes": "panes", "--filters": "filters", "--views": "views" }[flag];
      result[field] = [...new Set(values)].map(item => flag === "--histories" || flag === "--panes" ? Number(item) : item);
    } else if (flag === "--iterations" || flag === "--flips") {
      const value = Number(raw);
      if (!Number.isSafeInteger(value) || value < 1 || value > 10000)
        throw new Error(`Invalid positive integer for ${flag}`);
      result[flag === "--iterations" ? "iterations" : "flips"] = value;
    } else throw new Error(`Unknown argument: ${flag}`);
  }
  if (result.scenarios.includes("observer") && result.flips % 2 !== 1)
    throw new Error("--flips must be odd so native availability changes per event");
  return result;
}

export async function runReconcileBenchmark(config = parseReconcileOptions([])) {
  if (config.help) throw new Error("help has no execution");
  const started = now();
  const cases = [];
  if (config.scenarios.includes("history")) {
    for (const h of config.histories) for (const panes of config.panes) for (const filter of config.filters)
      cases.push(historyCase({ historyCount: h, paneCount: panes,
        filter, iterations: config.iterations, largeDom: config.largeDom }));
  }
  if (config.scenarios.includes("observer")) {
    for (const h of config.histories) for (const panes of config.panes) for (const viewMode of config.views)
      cases.push(await observerCase({ historyCount: h, paneCount: panes,
        iterations: config.iterations, flips: config.flips, viewMode, traceObserver: config.traceObserver }));
  }
  return {
    schema: "ppbui.cw-perf-001.synthetic.reconcile.v1",
    supplements: "ppbui.cw-perf-001.synthetic.v1 (unchanged default benchmark-cards output)",
    runtime: { node: process.version, platform: process.platform, arch: process.arch },
    experiment: config,
    timing: { totalHarnessMs: round(now() - started), clock: "node:perf_hooks performance.now" },
    limits: [
      "Synthetic Node/JSDOM only; not Chromium, WebView2, GPU, game or live profiles.",
      "Core observer rAF execution is manually drained, not native browser timer or scheduler.",
      "Per-event quantiles are empirical nearest rank, not confidence intervals; sequential JIT/GC may skew data.",
      "Adapter cards.render cannot be counted without production seam; we do not label source-path inference as measurement.",
      "H=10000 DOM and two-pane global observer excluded unless explicitly supported; skips are explicit.",
    ],
    cases,
  };
}

const help = `Usage: node tools/coupled-workspace-webview2/perf/benchmark-reconcile.mjs [options]
--quick                         3 cycles/events, 5 native attribute flips; not a reliable p95
--scenario=history,observer     Real history append/edit/reset and real core observer/rAF
--views=cards,game             Observer-mode presentation; default cards (history cases unchanged)
--histories=0,32,1200,10000    Default 32; H10000 history DOM requires --large-dom
--panes=1,2                    Observer with two globals is deliberately skipped, never misreported
--filters=all,captured         History result filters, both measured independently
--iterations=100               100 cycles per history case (300 history operations), 100 observer events
--flips=101                    Odd number of native toolbar disabled-attribute mutations/event
--trace-observer               Debug-only: show last 50 eligible DOM mutations on assertion failure
--large-dom                    Explicit opt-in to 10k history DOM; high memory/CPU
--help                         Print usage
JSON output only to stdout; no live game, browser, WebView2 or host.`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseReconcileOptions(process.argv.slice(2));
    if (options.help) process.stdout.write(help);
    else process.stdout.write(JSON.stringify(await runReconcileBenchmark(options), null, 2) + "\n");
  } catch (error) {
    process.stderr.write(`Synthetic reconcile benchmark error: ${error.stack || error.message}\n`);
    process.exitCode = 1;
  }
}
