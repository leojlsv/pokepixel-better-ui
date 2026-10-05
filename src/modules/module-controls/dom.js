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

const normalized = value => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
export function findAnimatedBorderSettings(doc = document) {
  return [...doc.querySelectorAll("label.settings-control")].filter(row => {
    const title = row.querySelector("strong,b,[class*='title'],[class*='label']");
    const visible = normalized(title?.textContent || row.textContent);
    if (visible === "animated borders" || visible.startsWith("animated borders ")) return true;
    const controls = [...row.querySelectorAll("input,select,button")];
    const contract = normalized([
      row.getAttribute("for"), row.id,
      ...controls.flatMap(control => [control.id, control.name, control.dataset?.setting, control.dataset?.preference]),
    ].filter(Boolean).join(" "));
    return contract.includes("animated") && contract.includes("border");
  });
}

export function closeNativeGroups(toolbar, ownGroup) {
  for (const group of toolbar.querySelectorAll(config.selectors.nativeGroup)) {
    if (group === ownGroup) continue;
    group.classList.remove("is-open");
    group.querySelector(config.selectors.trigger)?.setAttribute("aria-expanded", "false");
    if (group.contains(document.activeElement)) document.activeElement.blur();
  }
}
