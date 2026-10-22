import { cardModeConfig as config } from "./config.js";

const contracts = Object.freeze({
  ...config.windows.nativeMenus,
  ...config.windows.nativeMenusWaveB,
  ...config.windows.nativeMenusWaveB2,
  ...config.windows.nativeMenusWaveB3,
});

const available = node => Boolean(node && !node.hidden && !node.inert &&
  !node.hasAttribute("inert") && node.getAttribute("aria-hidden") !== "true");

function runtimeContract(win, id) {
  const descriptor = Object.hasOwn(contracts, id) ? contracts[id] : null;
  const Scene = descriptor && win?.[descriptor.scene];
  const MenuBase = win?.Scene_MenuBase;
  if (!descriptor || typeof Scene !== "function" || typeof MenuBase !== "function") return null;
  try {
    return Scene.prototype instanceof MenuBase ? { ...descriptor, Scene } : null;
  } catch {
    return null;
  }
}

function activeScene(win) {
  try { return win?.PokeIdle?.ReactiveWindows?.active?.() || null; }
  catch { return null; }
}

// A native scene identity and exact UIPanel hierarchy are required independently
// of the temporary CSS constructor exception. Cached/hidden panels never pass.
export function activeNativeMenu(win, id) {
  const contract = runtimeContract(win, id);
  if (!contract) return null;
  const scene = activeScene(win);
  if (!scene || scene.constructor !== contract.Scene) return null;
  const panel = scene._panel, overlay = panel?.overlay;
  if (!overlay || overlay.parentElement !== win.document.body ||
      !available(overlay) || !available(panel.el) ||
      panel.el?.parentElement !== overlay ||
      panel.el?.matches?.(contract.panel) !== true ||
      panel.body?.parentElement !== panel.el ||
      (typeof panel.isVisible === "function" && !panel.isVisible())) return null;
  return { id, scene, panel, overlay };
}

export function activeNativeMenuForCurrent(win) {
  const scene = activeScene(win);
  if (!scene) return null;
  for (const [id, descriptor] of Object.entries(contracts)) {
    if (win?.[descriptor.scene] === scene.constructor) return activeNativeMenu(win, id);
  }
  return null;
}

// PersistentHUD explicitly refuses switching away from a native Trade overlay;
// it must receive the original click without forcing Game first.
export function nativeMenuBlocked(win, id) {
  const contract = runtimeContract(win, id), Trade = win?.Scene_Trade;
  if (!contract || typeof Trade !== "function") return false;
  const active = activeScene(win);
  return Boolean(active instanceof Trade && active.constructor !== contract.Scene);
}

export function canOpenNativeMenu(win, id) {
  const contract = runtimeContract(win, id);
  const reactive = win?.PokeIdle?.ReactiveWindows;
  const manager = win?.SceneManager, Map = win?.Scene_Map;
  if (!contract || typeof reactive?.active !== "function" ||
      typeof reactive?.cached !== "function" || typeof manager?.push !== "function" ||
      manager._nextScene != null) return false;
  let current;
  try { current = reactive.active(); } catch { return false; }
  return Boolean(current || (typeof Map === "function" && manager._scene instanceof Map));
}

// Better UI module enhancements must not mount against retained native scene
// bodies while Cards hides those panels. No observer or host state is changed.
export function nativeMenuAvailableInCardMode(root, id) {
  const win = root?.ownerDocument?.defaultView;
  const active = win && activeNativeMenu(win, id);
  return Boolean(active && root === active.panel.el &&
    active.overlay.getAttribute(config.windows.marker) === `native-${id}`);
}

// Read-only presentation gate for controller-owned native panels (including
// City NPC routes). The window reconciler alone decides ownership; an arbitrary
// matching class cannot activate a Better UI feature in Cards.
export function nativeActionPanelAvailableInCardMode(root, id) {
  const contract=config.windows.nativeActionPanels[id];
  if (!root || !contract) return false;
  const panel=root.closest(".pokeidle-panel"),overlay=panel?.parentElement;
  if (!panel?.matches(contract.panel) || overlay?.parentElement!==root.ownerDocument.body ||
      overlay.getAttribute(config.windows.marker)!==`native-action-${id}` ||
      !available(overlay) || !available(panel)) return false;
  const doc=root.ownerDocument,controller=doc.defaultView?.PokeIdle?.[contract.controller];
  if (!controller) return false;
  if (contract.openState) {
    try { if(controller[contract.openState]?.()!==true)return false; } catch { return false; }
    // Closure-private UIPanel handles cannot prove their generation directly.
    // Reject duplicate structural roots instead of granting a copied marker.
    return [...doc.body.children].filter(node=>node.matches(".pokeidle-panel-overlay") &&
      available(node) && node.firstElementChild?.matches(contract.panel) &&
      available(node.firstElementChild)).length===1;
  }
  let source=controller;
  try { if(contract.getter)source=controller[contract.getter]?.(); }
  catch { return false; }
  const handle=source?.[contract.handle];
  return handle?.el===panel && handle?.overlay===overlay &&
    handle.body?.parentElement===panel &&
    (typeof handle.isVisible!=="function" || handle.isVisible());
}

// Native PI.Dialog does not expose an owner handle. Only specifically audited
// user actions may create a short-lived one-shot presentation intent. A generic
// click in an admitted scene is NOT sufficient to authorize another body portal.
export function nativeDialogAction(nativeId, action, eventType) {
  if (!action?.matches) return null;
  const q = config.windows.nativeDialogActions;
  const ordinary = { maxAgeMs: 1500, maxClaims: 1 };
  if (eventType === "change") {
    if (nativeId === "settings" && action.matches(q.settingsTwoFactor) &&
        action.closest(".settings-section")?.querySelector(".settings-account-status"))
      return { ...ordinary, kind: "settings-two-factor", maxAgeMs: 30000 };
    return null;
  }
  if (!["click","keydown"].includes(eventType)) return null;
  if (nativeId === "private-message" && action.matches(q["private-message"]) &&
      action.closest(".mailbox-entry")?.querySelector(".mailbox-entry__rewards"))
    return { ...ordinary, kind: "mailbox-unclaimed-delete" };
  if (nativeId === "storage" && action.matches(q.storage))
    return { ...ordinary, kind: "storage-bulk-confirm" };
  if (nativeId === "capture-records" && action.matches(q["capture-records"]))
    return { ...ordinary, kind: "capture-log-reset" };
  if (nativeId !== "settings") return null;
  if (action.matches(q.settingsLogout)) return { ...ordinary, kind: "settings-logout" };
  if (action.matches(q.settingsDiscordUnlink)) return { ...ordinary, kind: "settings-discord-unlink" };
  if (action.matches(q.settingsEmail) &&
      action.nextElementSibling?.matches("small.settings-account-status"))
    return { kind: "settings-email-change", maxAgeMs: 30000, maxClaims: 2 };
  return null;
}
