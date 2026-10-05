import { cardModeConfig as config } from "./config.js";

const DESTINATIONS = new Set([
  "current",
  "current-rarity",
  "current-captured",
  "current-failed",
  "current-loot",
  "history-hunts",
  "history-pokemon",
  "history-attempts",
  "history-loot",
]);

function analyzerUi(win) {
  const api = win?.[config.analyzerUiGlobal];
  return api?.protocol === config.analyzerUiProtocol && typeof api.navigate === "function" ? api : null;
}

export function canNavigateAnalyzerUi(win = globalThis.window) {
  return Boolean(analyzerUi(win));
}

export async function navigateAnalyzerUi(win, destination) {
  const target = String(destination || "").trim().toLowerCase();
  if (!DESTINATIONS.has(target)) return { ok: false, reason: "unsupported-destination" };
  const api = analyzerUi(win);
  if (!api) return { ok: false, reason: "analyzer-ui-unavailable" };
  try {
    const result = await api.navigate(target);
    return result?.ok === true
      ? { ok: true }
      : { ok: false, reason: String(result?.reason || "analyzer-ui-unavailable").slice(0, 64) };
  } catch {
    return { ok: false, reason: "analyzer-ui-unavailable" };
  }
}
