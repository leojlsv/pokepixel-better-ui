import { cardModeConfig as config } from "./config.js";

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

function analyzerSourceIsFresh(raw, now = Date.now()) {
  if (!raw || typeof raw !== "object" || raw.protocol !== config.analyzerProtocol || raw.available !== true) return false;
  const capturedAtMs = Number(raw.capturedAtMs);
  const ageMs = Number(now) - capturedAtMs;
  return Number.isFinite(capturedAtMs)
    && Number.isFinite(ageMs)
    && ageMs >= 0
    && ageMs <= config.analyzerSourceMaxAgeMs;
}

function sanitizeSessionGeneration(value) {
  return Number.isSafeInteger(value)
    && value >= 0
    && value <= ANALYZER_NUMBER_LIMIT
    ? value : null;
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
  if (!analyzerSourceIsFresh(raw, now)) return null;
  const status = ["running", "paused", "waiting"].includes(raw.status) ? raw.status : "waiting";
  const count = value => boundedNumber(value, { min: 0 });
  const attemptHistory = sanitizeAttemptHistory(raw.attemptHistory);
  const specialHistory = sanitizeSpecialHistory(raw.specialHistory);
  const lootHistory = sanitizeLootHistory(raw.lootHistory);
  const summary = {
    appVersion: boundedText(raw.appVersion),
    leadershipActive: raw.leadershipActive === true,
    status,
    sessionGeneration: sanitizeSessionGeneration(raw.sessionGeneration),
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
    attemptHistory,
    specialHistory,
    lootHistory,
  };
  Object.defineProperty(summary, "__ppbuiStorySignature", {
    value: JSON.stringify([attemptHistory, specialHistory]),
  });
  return summary;
}

function sanitizeAnalyzerLootSession(raw, now = Date.now()) {
  if (!analyzerSourceIsFresh(raw, now)) return null;
  return {
    status: ["running", "paused", "waiting"].includes(raw.status) ? raw.status : "waiting",
    sessionGeneration: sanitizeSessionGeneration(raw.sessionGeneration),
    activityKind: raw.activityKind === "expedition" ? "expedition" : "hunt",
    startedAtMs: boundedSessionTimestamp(raw.startedAtMs),
    lootHistory: sanitizeLootHistory(raw.lootHistory),
  };
}

export function readAnalyzerSummary(win = globalThis.window, now = undefined) {
  const api = win?.[config.analyzerGlobal];
  if (api?.protocol !== config.analyzerProtocol || typeof api.getSummary !== "function") return null;
  try {
    const raw = api.getSummary();
    return sanitizeAnalyzerSummary(raw, Number.isFinite(now) ? now : Date.now());
  } catch { return null; }
}

export function readAnalyzerLootSession(win = globalThis.window, now = undefined) {
  const api = win?.[config.analyzerGlobal];
  if (api?.protocol !== config.analyzerProtocol) return null;
  try {
    const hasDedicatedReader = "getLootSession" in Object(api);
    const reader = hasDedicatedReader ? api.getLootSession : api.getSummary;
    if (typeof reader !== "function") return null;
    const raw = reader.call(api);
    return sanitizeAnalyzerLootSession(raw, Number.isFinite(now) ? now : Date.now());
  } catch { return null; }
}
