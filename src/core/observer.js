const OBSERVER_IGNORED_HUNT_SELECTOR = [
  ".pokeidle-nameplate-pokemon",
  ".pokeidle-nameplate-enemy",
  ".pokeidle-nameplate-trainer",
  ".pokeidle-battle-popup-burst",
  ".pokeidle-capture-sequence",
  ".pokeidle-capture-prompt",
  ".pokeidle-character-speech--remote",
  ".pokeidle-move-speech",
  ".platform-hunt__move",
  ".platform-hunt__effects",
  ".platform-hunt__notices",
  ".platform-hunt__capture-lane",
].join(",");

const TEAM_HUD_ENHANCED_SELECTOR = ".pokeidle-team-hud[data-ppbui-team-hud-enhanced]";
const TEAM_HUD_MOUNT_SENTINEL = ".pokeidle-team-hud__list";
const TEAM_HUD_AUXILIARY_SELECTOR = ".pokeidle-team-hud__wallet,.pokeidle-mobile-party-button";
const CHAT_ROOT_SELECTOR = ".pokeidle-persistent-chat";
const CHAT_MOUNT_SENTINEL = ".pokeidle-persistent-chat__tabs";
const PLATFORM_HUNT_ROOT_SELECTOR = ".platform-hunt";
const PLATFORM_SHARED_SELECTOR = ".pokeidle-buff-strip";

function isPresentationOnlyNode(node) {
  const element = node?.nodeType === 1 ? node : node?.parentElement;
  if (!element?.matches || !element?.closest) return false;
  return element.matches(OBSERVER_IGNORED_HUNT_SELECTOR) || Boolean(element.closest(OBSERVER_IGNORED_HUNT_SELECTOR));
}

function elementFor(node) {
  return node?.nodeType === 1 ? node : node?.parentElement;
}

function isPlatformHuntInternalTarget(node) {
  const element = elementFor(node);
  return Boolean(element?.closest?.(PLATFORM_HUNT_ROOT_SELECTOR));
}

function isTeamHudAuxiliaryInternalTarget(node) {
  const element = elementFor(node);
  return Boolean(element?.closest?.(TEAM_HUD_AUXILIARY_SELECTOR));
}

function touchesPlatformSharedSurface(record) {
  const target = elementFor(record?.target);
  if (target?.closest?.(PLATFORM_SHARED_SELECTOR)) return true;
  if (record?.type !== "childList") return false;
  const changed = [...(record.addedNodes || []), ...(record.removedNodes || [])];
  return changed.some(node => {
    const element = elementFor(node);
    return Boolean(element?.matches?.(PLATFORM_SHARED_SELECTOR) || element?.querySelector?.(PLATFORM_SHARED_SELECTOR));
  });
}

function changesTeamHudMountSentinel(record) {
  if (record?.type !== "childList") return false;
  const changed = [...(record.addedNodes || []), ...(record.removedNodes || [])];
  return changed.some(node => {
    const element = elementFor(node);
    return Boolean(element?.matches?.(TEAM_HUD_MOUNT_SENTINEL) || element?.querySelector?.(TEAM_HUD_MOUNT_SENTINEL));
  });
}

function changesChatMountSentinel(record) {
  if (record?.type !== "childList") return false;
  const changed = [...(record.addedNodes || []), ...(record.removedNodes || [])];
  return changed.some(node => {
    const element = elementFor(node);
    return Boolean(element?.matches?.(CHAT_MOUNT_SENTINEL) || element?.querySelector?.(CHAT_MOUNT_SENTINEL));
  });
}

function localMutationScope(record) {
  const target = elementFor(record?.target);
  if (target?.closest?.(TEAM_HUD_ENHANCED_SELECTOR)) {
    // Replacing/removing the native list changes the module's mount contract and
    // must still pass through the full lifecycle. Mutations inside an already
    // enhanced HUD can be reconciled by the HUD-local modules only.
    if (changesTeamHudMountSentinel(record)) return null;
    return "team-hud";
  }
  if (target?.closest?.(CHAT_ROOT_SELECTOR)) {
    // Chat messages and unread counters are frequent. Keep their reconciliation
    // local, while replacing the tab bar still re-runs the mount-key lifecycle.
    if (changesChatMountSentinel(record)) return null;
    return "chat";
  }
  return null;
}

function mutationScope(record) {
  if (!record?.type) return "global";
  if (record.type === "attributes") {
    if (isTeamHudAuxiliaryInternalTarget(record.target)) return null;
    // Better UI owns no descendants inside the Platform Hunt renderer. That
    // renderer rewrites team buttons, HP/name text and visibility on every
    // authoritative entity/vitals update, so observing its internal churn only
    // fans out into unrelated module discovery. Root attach/detach is still
    // global because those records target body, not the Platform Hunt root.
    // Buff Strip is deliberately excluded: it is a shared native surface that
    // Better UI moves/enhances, even while Platform Hunt temporarily hosts it.
    if (isPlatformHuntInternalTarget(record.target) && !touchesPlatformSharedSurface(record)) return null;
    if (isPresentationOnlyNode(record.target)) return null;
    return localMutationScope(record) || "global";
  }
  if (record.type !== "childList") return "global";
  if (isTeamHudAuxiliaryInternalTarget(record.target)) return null;
  if (isPlatformHuntInternalTarget(record.target) && !touchesPlatformSharedSurface(record)) return null;
  if (isPresentationOnlyNode(record.target)) return null;

  const changed = [...(record.addedNodes || []), ...(record.removedNodes || [])];
  if (changed.length && changed.every(isPresentationOnlyNode)) return null;
  return localMutationScope(record) || "global";
}

export function createDomObserver(onChange) {
  let frameId = null;
  let pendingScope = null;

  const schedule = (records) => {
    let nextScope = "global";
    if (records?.length) {
      const scopes = Array.from(records, mutationScope).filter(Boolean);
      if (!scopes.length) return;
      const local = scopes[0];
      nextScope = local && scopes.every(scope => scope === local && scope !== "global") ? local : "global";
    }
    if (frameId !== null) {
      if (nextScope === "global" || (pendingScope && pendingScope !== nextScope)) pendingScope = "global";
      return;
    }

    pendingScope = nextScope;
    frameId = requestAnimationFrame(() => {
      frameId = null;
      const scope = pendingScope || "global";
      pendingScope = null;
      onChange(scope);
    });
  };

  const observer = new MutationObserver(schedule);

  return {
    start(root = document.body) {
      if (!root) return;
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["hidden", "disabled", "aria-hidden", "aria-disabled", "lang"],
      });
      if (document.documentElement) observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    },

    stop() {
      observer.disconnect();
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
      pendingScope = null;
    },
  };
}
