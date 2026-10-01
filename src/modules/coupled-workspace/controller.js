import { coupledWorkspaceConfig as config } from "./config.js";
import { createCoupledCards } from "./cards.js";

const messageType = Object.freeze({
  capabilities: "ppbui.coupled.capabilities",
  capabilitiesAccepted: "ppbui.coupled.capabilities-accepted",
  resyncCapabilities: "ppbui.coupled.resync-capabilities",
  sessionHello: "ppbui.coupled.session-hello",
  sessionReady: "ppbui.coupled.session-ready",
  openSurface: "ppbui.coupled.open-surface",
  openSurfaceResult: "ppbui.coupled.open-surface-result",
  setView: "ppbui.coupled.set-view",
});

const ANALYZER_NUMBER_LIMIT = 1e15;
// The per-document ordinal survives a new injected bundle/module instance in
// the same page; a module-scoped WeakMap would restart at 1 on hot re-injection.
const documentMountOrdinalKey = Symbol.for("ppbui.coupled.mount-ordinal");
const documentSessionProbeKey = Symbol.for("ppbui.coupled.document-session-probe");
const documentAdapterKey = Symbol.for("ppbui.coupled.active-adapter");

function newViewSessionId(win) {
  if (typeof win?.crypto?.getRandomValues !== "function") return "";
  try {
    return [...win.crypto.getRandomValues(new Uint8Array(16))]
      .map(value => value.toString(16).padStart(2, "0")).join("");
  } catch { return ""; }
}

function boundedNumber(value, { min = -ANALYZER_NUMBER_LIMIT, max = ANALYZER_NUMBER_LIMIT } = {}) {
  if (!Number.isFinite(value)) return null;
  return Math.max(min, Math.min(max, value));
}

function boundedText(value, maxLength = 32) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function boundedCount(value) {
  if (!Number.isFinite(value)) return null;
  return Math.floor(Math.max(0, Math.min(ANALYZER_NUMBER_LIMIT, value)));
}

function boundedRateOrNull(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}

function boundedSessionTimestamp(value) {
  return Number.isFinite(value) && value >= 0 && value <= ANALYZER_NUMBER_LIMIT ? value : null;
}

function boundedIvTotal(value) {
  return Number.isFinite(value) && value >= 0 && value <= 186 ? Math.floor(value) : null;
}

const ELEMENTS = new Set(["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"]);
const IV_STATS = ["hp", "atk", "def", "spa", "spd", "spe"];

function sanitizeElements(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map(value => boundedText(value, 16).toLowerCase()).filter(value => ELEMENTS.has(value)))].slice(0, 2);
}

function sanitizeCaptureDetails(raw, result) {
  if (result !== "captured" || !raw || typeof raw !== "object") return null;
  const ivs = {};
  for (const stat of IV_STATS) {
    const value = raw?.ivs?.[stat];
    ivs[stat] = Number.isFinite(value) && value >= 0 && value <= 31 ? Math.floor(value) : null;
  }
  const total = raw.ivTotal;
  return {
    gender: boundedText(raw.gender, 16),
    nature: boundedText(raw.nature, 32),
    ivTotal: Number.isFinite(total) && total >= 0 && total <= 186 ? Math.floor(total) : null,
    ivs,
  };
}

function sanitizeCurrentTarget(raw) {
  if (!raw || typeof raw !== "object") return null;
  const species = boundedText(raw.species, 64);
  if (!species) return null;
  const rarity = ["weak", "common", "uncommon", "rare", "epic", "legendary", "mythical"].includes(raw.rarity) ? raw.rarity : "";
  return {
    speciesId: boundedText(raw.speciesId, 64),
    zoneId: boundedText(raw.zoneId, 64),
    species,
    level: boundedCount(raw.level),
    rarity,
    shiny: typeof raw.shiny === "boolean" ? raw.shiny : null,
    elements: sanitizeElements(raw.elements),
    pokemonExp: boundedNumber(raw.pokemonExp, { min: 0 }),
  };
}

function sanitizeCurrentSessionSpecies(raw) {
  if (!raw || typeof raw !== "object") return null;
  const species = boundedText(raw.species, 64);
  if (!species) return null;
  return { speciesId: boundedText(raw.speciesId, 64), species };
}

const ATTEMPT_RARITIES = new Set(["unknown", "weak", "common", "uncommon", "rare", "epic", "legendary", "mythical"]);

function sanitizeAttemptHistory(raw, limit = 32) {
  if (!Array.isArray(raw)) return [];
  const attempts = [];
  for (const item of raw.slice(0, limit)) {
    if (!item || typeof item !== "object") continue;
    const atMs = Number.isFinite(item.atMs) && item.atMs >= 0 ? item.atMs : null;
    const species = boundedText(item.species, 64);
    const result = item.result === "captured" || item.result === "fled" ? item.result : "";
    if (atMs == null || !species || !result) continue;
    attempts.push({
      atMs,
      speciesId: boundedText(item.speciesId, 64),
      species,
      rarity: ATTEMPT_RARITIES.has(item.rarity) ? item.rarity : "unknown",
      shiny: typeof item.shiny === "boolean" ? item.shiny : null,
      qualityMultiplier: boundedNumber(item.qualityMultiplier, { min: 0 }),
      chance: boundedRateOrNull(item.chance),
      result,
      ball: boundedText(item.ball, 32),
      ivTotal: boundedIvTotal(item.ivTotal),
      captureDetails: sanitizeCaptureDetails(item.captureDetails, result),
    });
  }
  return attempts;
}

function sanitizeSpecialHistory(raw) {
  return sanitizeAttemptHistory(raw, Number.POSITIVE_INFINITY)
    .filter(item => ["epic", "legendary", "mythical"].includes(item.rarity) || item.shiny === true);
}

function sanitizeLootHistory(raw, limit = 32) {
  if (!Array.isArray(raw)) return [];
  const rows = [];
  for (const item of raw.slice(0, limit)) {
    if (!item || typeof item !== "object") continue;
    const atMs = Number.isFinite(item.atMs) && item.atMs >= 0 ? item.atMs : null;
    const species = boundedText(item.species, 64);
    if (atMs == null || !species) continue;
    const directGold = boundedNumber(item.directGold, { min: 0 });
    const lootSellValue = boundedNumber(item.lootSellValue, { min: 0 });
    const autoSold = item.autoSold === true;
    const autoSellValue = autoSold ? boundedNumber(item.autoSellValue, { min: 0 }) : 0;
    const items = Array.isArray(item.items) ? item.items.slice(0, 24).map(entry => ({
      itemId: boundedText(entry?.itemId, 96),
      qty: boundedCount(entry?.qty),
    })).filter(entry => entry.itemId && Number.isFinite(entry.qty) && entry.qty > 0) : [];
    const totalValue = directGold != null && lootSellValue != null && autoSellValue != null
      ? Math.min(ANALYZER_NUMBER_LIMIT, directGold + lootSellValue + autoSellValue)
      : null;
    rows.push({
      atMs,
      species,
      directGold,
      lootSellValue,
      autoSold,
      autoSellValue,
      totalValue,
      items,
    });
  }
  return rows;
}

function sanitizeRarityCounts(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const copy = {};
  for (const key of ATTEMPT_RARITIES) {
    const bucket = source[key] && typeof source[key] === "object" ? source[key] : {};
    copy[key] = {
      captured: boundedCount(bucket.captured),
      seen: boundedCount(bucket.seen),
      shinyCaptured: boundedCount(bucket.shinyCaptured),
      shinySeen: boundedCount(bucket.shinySeen),
    };
  }
  return copy;
}

function sanitizeAnalyzerSummary(raw, now = Date.now()) {
  if (!raw || typeof raw !== "object" || raw.protocol !== config.protocol || raw.available !== true) return null;
  const capturedAtMs = Number(raw.capturedAtMs);
  const ageMs = Number(now) - capturedAtMs;
  if (!Number.isFinite(capturedAtMs)
    || !Number.isFinite(ageMs)
    || ageMs < 0
    || ageMs > config.analyzerSourceMaxAgeMs) return null;
  const status = ["running", "paused", "waiting"].includes(raw.status) ? raw.status : "waiting";
  const count = value => boundedNumber(value, { min: 0 });
  return {
    appVersion: boundedText(raw.appVersion),
    leadershipActive: raw.leadershipActive === true,
    status,
    sessionGeneration: Number.isSafeInteger(raw.sessionGeneration)
      && raw.sessionGeneration >= 0 && raw.sessionGeneration <= ANALYZER_NUMBER_LIMIT
      ? raw.sessionGeneration : null,
    activityKind: raw.activityKind === "expedition" ? "expedition" : "hunt",
    startedAtMs: boundedSessionTimestamp(raw.startedAtMs),
    endedAtMs: boundedSessionTimestamp(raw.endedAtMs),
    activeMs: count(raw.activeMs),
    seen: count(raw.seen),
    seenPerHour: count(raw.seenPerHour),
    captured: count(raw.captured),
    failed: count(raw.failed),
    captureRate: boundedNumber(raw.captureRate, { min: 0, max: 1 }),
    trainerExp: count(raw.trainerExp),
    trainerExpPerHour: count(raw.trainerExpPerHour),
    pokemonExp: count(raw.pokemonExp),
    pokemonExpPerHour: count(raw.pokemonExpPerHour),
    directGold: count(raw.directGold),
    lootSellValue: count(raw.lootSellValue),
    autoSellValue: count(raw.autoSellValue),
    revenue: count(raw.revenue ?? raw.dollar),
    revenuePerHour: count(raw.revenuePerHour ?? raw.dollarPerHour),
    dollar: count(raw.dollar),
    dollarPerHour: count(raw.dollarPerHour),
    expenses: count(raw.expenses),
    expensesPerHour: count(raw.expensesPerHour),
    profit: boundedNumber(raw.profit),
    profitPerHour: boundedNumber(raw.profitPerHour),
    rarePlusFailed: count(raw.rarePlusFailed),
    epicPlusFailed: count(raw.epicPlusFailed),
    shinySeen: count(raw.shinySeen),
    shinyCaptured: count(raw.shinyCaptured),
    seenUnknown: boundedCount(raw.seenUnknown),
    seenWeak: boundedCount(raw.seenWeak),
    seenCommon: boundedCount(raw.seenCommon),
    seenUncommon: boundedCount(raw.seenUncommon),
    seenRare: boundedCount(raw.seenRare),
    seenEpic: boundedCount(raw.seenEpic),
    seenLegendary: boundedCount(raw.seenLegendary),
    seenMythical: boundedCount(raw.seenMythical),
    rarityCounts: sanitizeRarityCounts(raw.rarityCounts),
    latestCaptureChance: boundedRateOrNull(raw.latestCaptureChance),
    currentTarget: status === "running" && raw.activityKind !== "expedition"
      ? sanitizeCurrentTarget(raw.currentTarget) : null,
    currentSessionSpecies: status === "running" && raw.activityKind === "expedition"
      ? null : sanitizeCurrentSessionSpecies(raw.currentSessionSpecies),
    attemptHistory: sanitizeAttemptHistory(raw.attemptHistory),
    specialHistory: sanitizeSpecialHistory(raw.specialHistory),
    lootHistory: sanitizeLootHistory(raw.lootHistory),
  };
}

export function readAnalyzerSummary(win = globalThis.window, now = undefined) {
  const api = win?.[config.analyzerGlobal];
  if (api?.protocol !== config.protocol || typeof api.getSummary !== "function") return null;
  try {
    const raw = api.getSummary();
    return sanitizeAnalyzerSummary(raw, Number.isFinite(now) ? now : Date.now());
  } catch { return null; }
}

function hostBridge(win) {
  return win?.chrome?.webview || null;
}

export function isCoupledWorkspaceHost(win = globalThis.window) {
  const marker = win?.[config.hostMarker];
  return Boolean(
    marker
    && marker.protocol === config.protocol
    && typeof hostBridge(win)?.postMessage === "function"
  );
}

function actionLabel(button) {
  return (
    button.getAttribute("aria-label")
    || button.querySelector(config.selectors.label)?.textContent
    || button.textContent
    || button.dataset.menuId
    || ""
  ).trim();
}

function actionAvailable(button) {
  const toolbar = button?.ownerDocument?.querySelector(config.selectors.toolbar);
  if (!button
    || !toolbar?.contains(button)
    || button.disabled
    || button.hidden
    || button.getAttribute("aria-hidden") === "true"
    || button.getAttribute("aria-disabled") === "true") return false;
  for (let node = button; node && node !== toolbar; node = node.parentElement) {
    if (node.hidden || node.getAttribute?.("aria-hidden") === "true") return false;
    if (node.style?.display === "none" || node.style?.visibility === "hidden") return false;
  }
  return true;
}

function actionSnapshot(doc) {
  const surfaces = [];
  const seen = new Set();
  const toolbar = doc.querySelector(config.selectors.toolbar);
  for (const button of toolbar?.querySelectorAll(config.selectors.action) || []) {
    const id = String(button.dataset.menuId || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    surfaces.push({ id, label: actionLabel(button), available: actionAvailable(button) });
  }
  surfaces.sort((a, b) => a.id.localeCompare(b.id));
  return surfaces;
}

function findAction(doc, surfaceId) {
  const toolbar = doc.querySelector(config.selectors.toolbar);
  for (const button of toolbar?.querySelectorAll(config.selectors.action) || []) {
    if (button.dataset.menuId === surfaceId) return button;
  }
  return null;
}

export function mountCoupledWorkspaceAdapter(win = globalThis.window) {
  if (!isCoupledWorkspaceHost(win)) throw new Error("Coupled Workspace host bridge is unavailable.");
  const doc = win.document;
  // Hot re-injection may load a second copy of this module into one document.
  // Retire the previous adapter before it can own the same toolbar and probe.
  doc[documentAdapterKey]?.cleanup?.();
  const bridge = hostBridge(win);
  const root = doc.documentElement;
  const strictViewCorrelation = win[config.hostMarker].viewCorrelation === 2;
  const viewSessionId = strictViewCorrelation ? newViewSessionId(win) : "";
  const previousMount = doc[documentMountOrdinalKey];
  const mountOrdinal = strictViewCorrelation
    ? Number.isSafeInteger(previousMount) && previousMount >= 0
      && previousMount < Number.MAX_SAFE_INTEGER ? previousMount + 1 : 1 : 0;
  if (strictViewCorrelation) {
    Object.defineProperty(doc, documentMountOrdinalKey, {
      configurable: true, value: mountOrdinal,
    });
  }
  const beforeRootAttribute = root.getAttribute(config.rootAttribute);
  const style = doc.createElement("style");
  style.dataset.ppbuiStyle = config.id;
  style.textContent = `
    html[${config.rootAttribute}="true"] ${config.selectors.toolbar} {
      display: none !important;
    }
  `;
  (doc.head || root).append(style);

  let lastSignature = "";
  let capabilitySequence = 0;
  let pendingCapabilityRequestId = "";
  let pendingCapabilitySignature = "";
  let pendingCapabilitySeq = 0;
  let acceptedCapabilitySeq = 0;
  let acknowledgementTimer = null;
  let capabilityRetryTimer = null;
  let sessionRequestTimer = null;
  let pendingSessionRequestId = "";
  let sessionRequestSequence = 0;
  let documentEpoch = "";
  let latestViewRevision = 0;
  let latestOpenSurfaceSequence = 0;
  let analyzerTimer = null;
  let hostAccepted = false;
  let currentView = "game";
  let entryReconcilePending = false;
  let lastAnalyzerReadAt = 0;
  let viewSequence = 0;
  let disposed = false;
  const cards = createCoupledCards({ win });
  // Read-only identity probe for an interrupted top-level WebView2 navigation.
  // The host may restore this SAME document only after checking its live tuple;
  // a newly loaded error/document page cannot inherit this closure.
  const documentSessionProbe = () => ({
    type: "ppbui.coupled.document-probe", protocol: config.protocol,
    sessionId: viewSessionId, mountOrdinal, documentEpoch,
    documentUrl: doc.location.href,
  });
  if (strictViewCorrelation && viewSessionId) {
    Object.defineProperty(doc, documentSessionProbeKey, {
      configurable: true, value: documentSessionProbe,
    });
  }
  const isCurrentDocument = () => !disposed && win.document === doc
    && doc.documentElement === root && root.isConnected && isCoupledWorkspaceHost(win);
  const restoreStandaloneToolbar = () => {
    const focusedInsideCards = cards.root.contains(doc.activeElement);
    hostAccepted = false;
    acceptedCapabilitySeq = 0;
    viewSequence += 1;
    currentView = "game";
    entryReconcilePending = false;
    cards.setMode("game");
    if (beforeRootAttribute === null) root.removeAttribute(config.rootAttribute);
    else root.setAttribute(config.rootAttribute, beforeRootAttribute);
    // If a Cards button had keyboard focus when ACK expired, the native game
    // toolbar is now visible and needs a reachable focus target.
    if (focusedInsideCards) {
      const toolbar = doc.querySelector(config.selectors.toolbar);
      const focusTarget = [...(toolbar?.querySelectorAll("button") || [])]
        .find(button => actionAvailable(button));
      if (focusTarget) focusTarget.focus({ preventScroll: true });
      else {
        const landmark = toolbar || doc.body;
        const previous = landmark.getAttribute("tabindex");
        if (previous === null) landmark.setAttribute("tabindex", "-1");
        landmark.focus({ preventScroll: true });
        if (previous === null) landmark.removeAttribute("tabindex");
      }
    }
  };
  const post = payload => {
    try { bridge.postMessage(payload); return true; } catch { return false; }
  };
  const scheduleCapabilityRetry = () => {
    if (!isCurrentDocument() || capabilityRetryTimer !== null) return;
    capabilityRetryTimer = win.setTimeout(() => {
      capabilityRetryTimer = null;
      syncCapabilities();
    }, 750);
  };
  const requestSession = () => {
    if (!strictViewCorrelation || !viewSessionId || documentEpoch || pendingSessionRequestId || !isCurrentDocument()) return;
    const requestId = `view-session-${++sessionRequestSequence}`;
    pendingSessionRequestId = requestId;
    if (!post({ type: messageType.sessionHello, protocol: config.protocol,
      requestId, sessionId: viewSessionId, mountOrdinal })) {
      pendingSessionRequestId = "";
      restoreStandaloneToolbar();
      scheduleCapabilityRetry();
      return;
    }
    sessionRequestTimer = win.setTimeout(() => {
      if (pendingSessionRequestId !== requestId) return;
      pendingSessionRequestId = "";
      sessionRequestTimer = null;
      restoreStandaloneToolbar();
      scheduleCapabilityRetry();
    }, 750);
  };
  const matchesSession = data => !strictViewCorrelation || (
    data.sessionId === viewSessionId && data.mountOrdinal === mountOrdinal
      && data.documentEpoch === documentEpoch && Boolean(documentEpoch)
  );
  const syncCapabilities = () => {
    if (!isCurrentDocument()) return;
    if (strictViewCorrelation && !documentEpoch) {
      requestSession();
      return;
    }
    const surfaces = actionSnapshot(doc);
    const signature = JSON.stringify(surfaces);
    if (pendingCapabilityRequestId && signature === pendingCapabilitySignature) return;
    if (!pendingCapabilityRequestId && hostAccepted && signature === lastSignature) return;
    const requestId = `caps-${++capabilitySequence}`;
    pendingCapabilityRequestId = requestId;
    pendingCapabilitySignature = signature;
    pendingCapabilitySeq = capabilitySequence;
    if (acknowledgementTimer !== null) win.clearTimeout(acknowledgementTimer);
    if (capabilityRetryTimer !== null) win.clearTimeout(capabilityRetryTimer);
    capabilityRetryTimer = null;
    const sent = post({ type: messageType.capabilities, protocol: config.protocol, requestId, surfaces,
      ...(strictViewCorrelation ? {
        sessionId: viewSessionId, mountOrdinal, documentEpoch, capabilitySeq: capabilitySequence,
      } : {}) });
    if (!sent) {
      pendingCapabilityRequestId = "";
      pendingCapabilitySignature = "";
      pendingCapabilitySeq = 0;
      restoreStandaloneToolbar();
      scheduleCapabilityRetry();
      return;
    }
    acknowledgementTimer = win.setTimeout(() => {
      if (pendingCapabilityRequestId !== requestId) return;
      pendingCapabilityRequestId = "";
      pendingCapabilitySignature = "";
      pendingCapabilitySeq = 0;
      acknowledgementTimer = null;
      restoreStandaloneToolbar();
      scheduleCapabilityRetry();
    }, 750);
  };
  const syncAnalyzer = (fromReconcile = false) => {
    if (!isCurrentDocument() || !hostAccepted || currentView !== "cards") return;
    // The first observer pass caused by a finished Game→Cards reveal already
    // has a complete rendered frame. Skip only that redundant reconcile;
    // a real timer tick must always fetch a fresh public summary.
    if (fromReconcile && entryReconcilePending) {
      entryReconcilePending = false;
      if (Date.now() - lastAnalyzerReadAt < config.analyzerPollMs) return;
    }
    const requestedSequence = viewSequence;
    const readAt = Date.now();
    const summary = readAnalyzerSummary(win, readAt);
    if (!isCurrentDocument() || !hostAccepted || currentView !== "cards" || viewSequence !== requestedSequence) return;
    lastAnalyzerReadAt = readAt;
    try {
      cards.render(summary);
    } catch {
      restoreStandaloneToolbar();
      scheduleCapabilityRetry();
    }
  };
  const focusNativeGameAfterCards = () => {
    const candidates = doc.querySelectorAll("button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])");
    for (const candidate of candidates) {
      if (cards.root.contains(candidate) || candidate.closest(config.selectors.toolbar)
        || candidate.closest('[hidden],[aria-hidden="true"]')) continue;
      let visible = true;
      for (let ancestor = candidate; ancestor && ancestor !== doc; ancestor = ancestor.parentElement) {
        const style = win.getComputedStyle?.(ancestor);
        if (style?.display === "none" || style?.visibility === "hidden") {
          visible = false;
          break;
        }
      }
      if (!visible) continue;
      candidate.focus({ preventScroll: true });
      if (doc.activeElement === candidate) return;
    }
    // Some host screens are temporarily empty while switching; transfer
    // focus to a visible document landmark instead of leaving it in hidden Cards.
    const landmark = [...doc.querySelectorAll("main")]
      .find(main => !cards.root.contains(main)) || doc.body;
    const previous = landmark.getAttribute("tabindex");
    if (previous === null) landmark.setAttribute("tabindex", "-1");
    landmark.focus({ preventScroll: true });
    if (previous === null) landmark.removeAttribute("tabindex");
  };
  const sync = (fromObserver = false) => {
    syncCapabilities();
    syncAnalyzer(fromObserver);
  };
  const onMessage = event => {
    if (!isCurrentDocument()) return;
    let data = event?.data;
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch { return; }
    }
    if (!data || data.protocol !== config.protocol) return;
    if (strictViewCorrelation && data.type === messageType.sessionReady) {
      if (!pendingSessionRequestId || data.requestId !== pendingSessionRequestId
        || data.sessionId !== viewSessionId || data.mountOrdinal !== mountOrdinal
        || typeof data.documentEpoch !== "string"
        || !/^[a-f0-9]{32}$/.test(data.documentEpoch)) return;
      pendingSessionRequestId = "";
      if (sessionRequestTimer !== null) win.clearTimeout(sessionRequestTimer);
      sessionRequestTimer = null;
      documentEpoch = data.documentEpoch;
      syncCapabilities();
      return;
    }
    if (data.type === messageType.capabilitiesAccepted) {
      if (!pendingCapabilityRequestId || data.requestId !== pendingCapabilityRequestId) return;
      if (!matchesSession(data)) return;
      if (strictViewCorrelation && data.capabilitySeq !== pendingCapabilitySeq) return;
      const acceptedSignature = pendingCapabilitySignature;
      const acceptedSequence = pendingCapabilitySeq;
      pendingCapabilityRequestId = "";
      pendingCapabilitySignature = "";
      pendingCapabilitySeq = 0;
      if (acknowledgementTimer !== null) win.clearTimeout(acknowledgementTimer);
      acknowledgementTimer = null;
      if (data.ok === true) {
        if (capabilityRetryTimer !== null) win.clearTimeout(capabilityRetryTimer);
        capabilityRetryTimer = null;
        lastSignature = acceptedSignature;
        acceptedCapabilitySeq = acceptedSequence;
        hostAccepted = true;
        root.setAttribute(config.rootAttribute, "true");
      } else {
        restoreStandaloneToolbar();
        scheduleCapabilityRetry();
      }
      return;
    }
    if (data.type === messageType.setView) {
      if (data.viewMode !== "cards" && data.viewMode !== "game") return;
      if (strictViewCorrelation) {
        if (!hostAccepted || !matchesSession(data)
          || data.capabilitySeq !== acceptedCapabilitySeq
          || !Number.isSafeInteger(data.viewRevision) || data.viewRevision <= latestViewRevision) return;
        latestViewRevision = data.viewRevision;
      }
      const requestedSequence = ++viewSequence;
      const requested = data.viewMode === "game" ? "game" : "cards";
      const nextView = requested === "cards" && hostAccepted ? "cards" : "game";
      if (currentView === nextView) return;
      if (nextView === "game") {
        const hadCardsFocus = cards.root.contains(doc.activeElement);
        currentView = "game";
        entryReconcilePending = false;
        cards.setMode("game");
        if (hadCardsFocus) focusNativeGameAfterCards();
        return;
      }
      // Render a fresh public summary while the old dashboard is still hidden.
      // The provider can synchronously trigger host callbacks or cleanup, so
      // reject a superseded transition before exposing the completed frame.
      const entryTime = Date.now();
      const summary = readAnalyzerSummary(win, entryTime);
      if (viewSequence !== requestedSequence || !isCurrentDocument() || !hostAccepted || currentView !== "game") return;
      try {
        cards.render(summary);
      } catch {
        restoreStandaloneToolbar();
        scheduleCapabilityRetry();
        return;
      }
      if (viewSequence !== requestedSequence || !isCurrentDocument() || !hostAccepted || currentView !== "game") return;
      lastAnalyzerReadAt = entryTime;
      entryReconcilePending = true;
      currentView = "cards";
      cards.setMode("cards");
      return;
    }
    if (strictViewCorrelation && data.type === messageType.resyncCapabilities) {
      if (!matchesSession(data) || data.capabilitySeq !== acceptedCapabilitySeq) return;
      // A failed native post can leave the host offline with an unchanged DOM
      // signature. Force a new advertisement from the currently bound adapter.
      lastSignature = "";
      if (!pendingCapabilityRequestId) syncCapabilities();
      return;
    }
    if (data.type !== messageType.openSurface) return;
    if ((strictViewCorrelation && (!hostAccepted || data.capabilitySeq !== acceptedCapabilitySeq))
      || !matchesSession(data)) return;
    if (strictViewCorrelation) {
      // The native host uses <profile>-<monotone integer>. A second delivery
      // must never click the native game control twice, even after a retry.
      const request = typeof data.requestId === "string"
        ? /^([a-z][a-z0-9_-]{0,63})-([1-9]\d*)$/.exec(data.requestId) : null;
      const sequence = request ? Number(request[2]) : NaN;
      if (!Number.isSafeInteger(sequence) || sequence <= latestOpenSurfaceSequence) return;
      latestOpenSurfaceSequence = sequence;
    }
    const surfaceId = typeof data.surfaceId === "string" ? data.surfaceId.trim() : "";
    const button = surfaceId ? findAction(doc, surfaceId) : null;
    const available = actionAvailable(button);
    if (available) button.click();
    post({
      type: messageType.openSurfaceResult,
      protocol: config.protocol,
      requestId: typeof data.requestId === "string" ? data.requestId : "",
      surfaceId,
      ok: available,
      error: available ? "" : "surface-unavailable",
      ...(strictViewCorrelation ? { sessionId: viewSessionId, mountOrdinal, documentEpoch } : {}),
    });
    syncCapabilities();
  };

  bridge.addEventListener?.("message", onMessage);
  sync();
  analyzerTimer = win.setInterval(syncAnalyzer, config.analyzerPollMs);
  const adapter = {
    sync,
    cleanup() {
      if (disposed) return;
      disposed = true;
      bridge.removeEventListener?.("message", onMessage);
      if (acknowledgementTimer !== null) win.clearTimeout(acknowledgementTimer);
      if (sessionRequestTimer !== null) win.clearTimeout(sessionRequestTimer);
      if (capabilityRetryTimer !== null) win.clearTimeout(capabilityRetryTimer);
      if (analyzerTimer !== null) win.clearInterval(analyzerTimer);
      if (strictViewCorrelation && doc[documentSessionProbeKey] === documentSessionProbe)
        delete doc[documentSessionProbeKey];
      // Move focus while Cards still owns the active element; removing its
      // subtree first would strand keyboard users on the document body.
      restoreStandaloneToolbar();
      cards.cleanup();
      style.remove();
      if (doc[documentAdapterKey] === adapter) delete doc[documentAdapterKey];
    },
  };
  Object.defineProperty(doc, documentAdapterKey, {
    configurable: true, value: adapter,
  });
  return adapter;
}
