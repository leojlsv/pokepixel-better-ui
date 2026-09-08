import { moduleControlsConfig as config } from "./config.js";

export function findControlsTarget() {
  const toolbar = document.querySelector(config.selectors.toolbar);
  const settings = toolbar?.querySelector(config.selectors.settings);
  const icon = settings?.querySelector(config.selectors.icon);
  return toolbar && icon ? { toolbar, icon } : null;
}

export function controlsText() {
  const language = document.defaultView?.PokeIdle?.Localization?.get?.() || document.documentElement.lang || "pt";
  return config.text[language.split(/[-_]/)[0]] || config.text.en;
}

export function closeNativeGroups(toolbar, ownGroup) {
  for (const group of toolbar.querySelectorAll(config.selectors.nativeGroup)) {
    if (group === ownGroup) continue;
    group.classList.remove("is-open");
    group.querySelector(config.selectors.trigger)?.setAttribute("aria-expanded", "false");
    if (group.contains(document.activeElement)) document.activeElement.blur();
  }
}
