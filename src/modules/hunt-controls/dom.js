import { huntControlsConfig as config } from "./config.js";

const text = node => String(node?.textContent || "").trim();

function translated(win, key) {
  try {
    const value = win?.PokeIdle?.t?.(key);
    return typeof value === "string" ? value.trim() : "";
  } catch {
    return "";
  }
}

export function findNativeHuntButton(actionBar, key) {
  if (!actionBar) return null;
  const expected = translated(actionBar.ownerDocument?.defaultView, key);
  if (!expected) return null;
  return [...actionBar.querySelectorAll(config.selectors.actionButton)].find(button => text(button) === expected) || null;
}

export function findHuntControlsTarget(doc = document, city = null) {
  if (!city?.group?.isConnected || !city?.trigger?.isConnected || !city?.dropdown?.isConnected) return null;
  const actionBar = doc.querySelector(config.selectors.actionBar);
  if (!actionBar) return null;
  const nativeReturn = findNativeHuntButton(actionBar, config.translationKeys.returnCity);
  const movedReturn = city.dropdown.querySelector(config.selectors.returnOwned);
  const returnButton = nativeReturn || movedReturn;
  const captureButton = findNativeHuntButton(actionBar, config.translationKeys.capture);
  if (!returnButton || !captureButton) return null;
  return {
    actionBar,
    returnButton,
    captureButton,
    cityGroup:city.group,
    cityTrigger:city.trigger,
    cityDropdown:city.dropdown,
  };
}

export function sameHuntControlsTarget(a, b) {
  if (!a || !b) return false;
  return ["actionBar", "returnButton", "captureButton", "cityGroup", "cityTrigger", "cityDropdown"]
    .every(key => a[key] === b[key]);
}

export function findReviveButton(actionBar) {
  return findNativeHuntButton(actionBar, config.translationKeys.revive);
}

export function returnBadgeText(doc = document) {
  const language = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement?.lang || "pt";
  const base = String(language).split(/[-_]/)[0].toLowerCase();
  return config.badgeText[base] || config.badgeText.en;
}
