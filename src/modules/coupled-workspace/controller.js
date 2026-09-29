import { coupledWorkspaceConfig as config } from "./config.js";
import { createCoupledCards } from "./cards.js";

const messageType = Object.freeze({
  capabilities: "ppbui.coupled.capabilities",
  capabilitiesAccepted: "ppbui.coupled.capabilities-accepted",
  openSurface: "ppbui.coupled.open-surface",
  openSurfaceResult: "ppbui.coupled.open-surface-result",
  setView: "ppbui.coupled.set-view",
});

const ANALYZER_NUMBER_LIMIT = 1e15;

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
    currentTarget: sanitizeCurrentTarget(raw.currentTarget),
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
  if (!button
    || button.disabled
    || button.hidden
    || button.getAttribute("aria-hidden") === "true"
    || button.getAttribute("aria-disabled") === "true") return false;
  const toolbar = button.closest(config.selectors.toolbar);
  for (let node = button; node && node !== toolbar; node = node.parentElement) {
    if (node.hidden || node.getAttribute?.("aria-hidden") === "true") return false;
    if (node.style?.display === "none" || node.style?.visibility === "hidden") return false;
  }
  return true;
}

function actionSnapshot(doc) {
  const surfaces = [];
  const seen = new Set();
  for (const button of doc.querySelectorAll(config.selectors.action)) {
    const id = String(button.dataset.menuId || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    surfaces.push({ id, label: actionLabel(button), available: actionAvailable(button) });
  }
  surfaces.sort((a, b) => a.id.localeCompare(b.id));
  return surfaces;
}

function findAction(doc, surfaceId) {
  for (const button of doc.querySelectorAll(config.selectors.action)) {
    if (button.dataset.menuId === surfaceId) return button;
  }
  return null;
}

export function mountCoupledWorkspaceAdapter(win = globalThis.window) {
  if (!isCoupledWorkspaceHost(win)) throw new Error("Coupled Workspace host bridge is unavailable.");
  const doc = win.document;
  const bridge = hostBridge(win);
  const root = doc.documentElement;
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
  let acknowledgementTimer = null;
  let capabilityRetryTimer = null;
  let analyzerTimer = null;
  let currentAnalyzer = null;
  let hostAccepted = false;
  const cards = createCoupledCards({ win });
  const restoreStandaloneToolbar = () => {
    hostAccepted = false;
    cards.setMode("game");
    if (beforeRootAttribute === null) root.removeAttribute(config.rootAttribute);
    else root.setAttribute(config.rootAttribute, beforeRootAttribute);
  };
  const post = payload => {
    try { bridge.postMessage(payload); return true; } catch { return false; }
  };
  const scheduleCapabilityRetry = () => {
    if (capabilityRetryTimer !== null) return;
    capabilityRetryTimer = win.setTimeout(() => {
      capabilityRetryTimer = null;
      syncCapabilities();
    }, 750);
  };
  const syncCapabilities = () => {
    const surfaces = actionSnapshot(doc);
    const signature = JSON.stringify(surfaces);
    if (pendingCapabilityRequestId && signature === pendingCapabilitySignature) return;
    if (!pendingCapabilityRequestId && hostAccepted && signature === lastSignature) return;
    const requestId = `caps-${++capabilitySequence}`;
    pendingCapabilityRequestId = requestId;
    pendingCapabilitySignature = signature;
    if (acknowledgementTimer !== null) win.clearTimeout(acknowledgementTimer);
    if (capabilityRetryTimer !== null) win.clearTimeout(capabilityRetryTimer);
    capabilityRetryTimer = null;
    const sent = post({ type: messageType.capabilities, protocol: config.protocol, requestId, surfaces });
    if (!sent) {
      pendingCapabilityRequestId = "";
      pendingCapabilitySignature = "";
      restoreStandaloneToolbar();
      scheduleCapabilityRetry();
      return;
    }
    acknowledgementTimer = win.setTimeout(() => {
      if (pendingCapabilityRequestId !== requestId) return;
      pendingCapabilityRequestId = "";
      pendingCapabilitySignature = "";
      acknowledgementTimer = null;
      restoreStandaloneToolbar();
      scheduleCapabilityRetry();
    }, 750);
  };
  const syncAnalyzer = () => {
    currentAnalyzer = readAnalyzerSummary(win, Date.now());
    cards.render(currentAnalyzer);
  };
  const sync = () => {
    syncCapabilities();
    syncAnalyzer();
  };
  const onMessage = event => {
    let data = event?.data;
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch { return; }
    }
    if (!data || data.protocol !== config.protocol) return;
    if (data.type === messageType.capabilitiesAccepted) {
      if (!pendingCapabilityRequestId || data.requestId !== pendingCapabilityRequestId) return;
      const acceptedSignature = pendingCapabilitySignature;
      pendingCapabilityRequestId = "";
      pendingCapabilitySignature = "";
      if (acknowledgementTimer !== null) win.clearTimeout(acknowledgementTimer);
      acknowledgementTimer = null;
      if (data.ok === true) {
        if (capabilityRetryTimer !== null) win.clearTimeout(capabilityRetryTimer);
        capabilityRetryTimer = null;
        lastSignature = acceptedSignature;
        hostAccepted = true;
        root.setAttribute(config.rootAttribute, "true");
      } else {
        restoreStandaloneToolbar();
        scheduleCapabilityRetry();
      }
      return;
    }
    if (data.type === messageType.setView) {
      const requested = data.viewMode === "game" ? "game" : "cards";
      cards.setMode(requested === "cards" && hostAccepted ? "cards" : "game");
      if (requested === "cards" && hostAccepted) cards.render(currentAnalyzer);
      return;
    }
    if (data.type !== messageType.openSurface) return;
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
    });
    syncCapabilities();
  };

  bridge.addEventListener?.("message", onMessage);
  sync();
  analyzerTimer = win.setInterval(syncAnalyzer, config.analyzerPollMs);
  return {
    sync,
    cleanup() {
      bridge.removeEventListener?.("message", onMessage);
      if (acknowledgementTimer !== null) win.clearTimeout(acknowledgementTimer);
      if (capabilityRetryTimer !== null) win.clearTimeout(capabilityRetryTimer);
      if (analyzerTimer !== null) win.clearInterval(analyzerTimer);
      cards.cleanup();
      style.remove();
      restoreStandaloneToolbar();
    },
  };
}
