import { menuBarConfig as config } from "./config.js";

export function findMenuTarget() {
  const toolbar = document.querySelector(config.selectors.toolbar);
  if (!toolbar) return null;
  const actions = [...toolbar.querySelectorAll(config.selectors.action)].sort((a, b) => a.dataset.menuId.localeCompare(b.dataset.menuId));
  const groups = [...toolbar.querySelectorAll(config.selectors.nativeGroup)].sort((a, b) => a.dataset.menuGroup.localeCompare(b.dataset.menuGroup));
  return actions.length ? { toolbar, actions, structure: groups.flatMap(group => {
    const trigger = group.querySelector(config.selectors.trigger);
    return [group, trigger, group.querySelector(config.selectors.dropdown), trigger?.querySelector(config.selectors.label)];
  }) } : null;
}

export function sameTarget(a, b) {
  return a && b && a.toolbar === b.toolbar && ["actions", "structure"].every(key => a[key].length === b[key].length && a[key].every((node, i) => node === b[key][i]));
}

export function isVisible(node) {
  if (node?.getAttribute?.("data-ppbui-menu-context-visible") === "false") return false;
  return !node.hidden && node.getAttribute("aria-hidden") !== "true" && node.style.display !== "none";
}

export function isAvailable(button) {
  return isVisible(button) && !button.disabled && button.getAttribute("aria-disabled") !== "true";
}

export function groupLabel(index) {
  const language = document.defaultView?.PokeIdle?.Localization?.get?.() || document.documentElement.lang || "pt";
  return (config.labels[language.split(/[-_]/)[0]] || config.labels.en)[index];
}

export function findToolbarPositionControl(doc = document) {
  const current = doc.defaultView?.PokeIdle?.InterfacePreferences?.get?.()?.toolbarPosition;
  if (current !== "top" && current !== "bottom") return null;
  const matches = [...doc.querySelectorAll("label.settings-control")].flatMap(row => {
    const select = row.querySelector("select");
    if (!select) return [];
    const values = [...select.options].map(option => String(option.value));
    if (values.length !== 2 || !values.includes("top") || !values.includes("bottom")) return [];
    return [{ row, select }];
  });
  return matches.length === 1 ? matches[0] : null;
}
