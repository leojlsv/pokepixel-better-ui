import { huntControlsConfig as config } from "./config.js";
import { findNativeHuntButton, findReviveButton, returnBadgeText } from "./dom.js";
import styles from "./styles.js";
import { menuBarConfig } from "../menu-bar/config.js";

function restoreAttribute(node, name, previous) {
  if (!node) return;
  if (previous === null) node.removeAttribute(name);
  else node.setAttribute(name, previous);
}

export function mountHuntControls(target) {
  const { actionBar, returnButton, captureButton, cityGroup, cityTrigger, cityDropdown } = target;
  const doc = actionBar.ownerDocument;
  const win = doc.defaultView;
  const menuToolbar = cityGroup.parentElement;
  const origin = doc.createComment("ppbui-hunt-return-origin");
  const returnWasInBar = returnButton.parentNode === actionBar;
  const prior = {
    barMarker:actionBar.getAttribute("data-ppbui-hunt-controls"),
    captureMarker:captureButton.getAttribute("data-ppbui-hunt-capture"),
    returnMarker:returnButton.getAttribute("data-ppbui-hunt-return"),
    contextMarker:returnButton.getAttribute("data-ppbui-menu-context-action"),
    contextVisible:returnButton.getAttribute("data-ppbui-menu-context-visible"),
    triggerMarker:cityTrigger.getAttribute("data-ppbui-hunt-return-trigger"),
    contextAria:cityTrigger.getAttribute("data-ppbui-menu-context-aria"),
    classes:new Map(["ppbui-button", "ppbui-button--action"].map(name => [name, returnButton.classList.contains(name)])),
  };
  if (returnWasInBar) returnButton.before(origin);

  const style = doc.createElement("style");
  style.dataset.ppbuiStyle = config.id;
  style.textContent = styles;
  doc.head.append(style);

  actionBar.dataset.ppbuiHuntControls = "";
  captureButton.dataset.ppbuiHuntCapture = "";
  returnButton.dataset.ppbuiHuntReturn = "";
  returnButton.dataset.ppbuiMenuContextAction = "hunt-return";
  returnButton.classList.add("ppbui-button", "ppbui-button--action");
  cityTrigger.dataset.ppbuiHuntReturnTrigger = "";

  const badge = doc.createElement("span");
  badge.className = "ppbui-hunt-return-badge";
  badge.setAttribute("aria-hidden", "true");
  cityTrigger.append(badge);

  let reviveButton = null;
  let appliedAria = null;
  let released = false;

  const unclaimRevive = () => {
    if (!reviveButton) return;
    reviveButton.removeAttribute("data-ppbui-hunt-revive");
    reviveButton = null;
  };
  const syncRevive = () => {
    const next = findReviveButton(actionBar);
    if (next === reviveButton) return;
    unclaimRevive();
    reviveButton = next;
    reviveButton?.setAttribute("data-ppbui-hunt-revive", "");
  };
  const currentBaseAria = () => cityTrigger.querySelector(".pokeidle-top-toolbar__label")?.textContent?.trim()
    || cityTrigger.getAttribute("aria-label") || "City";
  const restoreTriggerAria = () => {
    restoreAttribute(cityTrigger, "data-ppbui-menu-context-aria", prior.contextAria);
    restoreAttribute(cityTrigger, "data-ppbui-hunt-return-trigger", prior.triggerMarker);
    if (appliedAria !== null && cityTrigger.getAttribute("aria-label") === appliedAria) {
      const base = currentBaseAria();
      cityTrigger.setAttribute("aria-label", prior.contextAria || base);
    }
    appliedAria = null;
  };
  const sync = () => {
    if (released || !actionBar.isConnected || !returnButton.isConnected || !cityDropdown.isConnected) return;
    syncRevive();
    const active = !actionBar.hidden && actionBar.getAttribute("aria-hidden") !== "true";
    const visible = String(active);
    if (returnButton.dataset.ppbuiMenuContextVisible !== visible) returnButton.dataset.ppbuiMenuContextVisible = visible;
    if (badge.hidden !== !active) badge.hidden = !active;
    const badgeCopy = returnBadgeText(doc);
    if (badge.textContent !== badgeCopy) badge.textContent = badgeCopy;
    if (active) {
      const base = currentBaseAria();
      const nextAria = `${base}. ${String(returnButton.textContent || "").trim()}`;
      if (cityTrigger.getAttribute("data-ppbui-menu-context-aria") !== nextAria) {
        cityTrigger.setAttribute("data-ppbui-menu-context-aria", nextAria);
      }
      if (cityTrigger.getAttribute("aria-label") !== nextAria) cityTrigger.setAttribute("aria-label", nextAria);
      appliedAria = nextAria;
    } else {
      restoreTriggerAria();
    }
  };
  const restoreReturnDecoration = () => {
    restoreAttribute(returnButton, "data-ppbui-hunt-return", prior.returnMarker);
    restoreAttribute(returnButton, "data-ppbui-menu-context-action", prior.contextMarker);
    restoreAttribute(returnButton, "data-ppbui-menu-context-visible", prior.contextVisible);
    for (const [name, had] of prior.classes) returnButton.classList.toggle(name, had);
  };
  const releaseToNative = () => {
    if (released) return;
    released = true;
    restoreTriggerAria();
    badge.remove();
    const replacement = actionBar.isConnected
      ? findNativeHuntButton(actionBar, config.translationKeys.returnCity)
      : null;
    if (returnButton.parentNode !== actionBar) {
      if (origin.isConnected && origin.parentNode === actionBar && actionBar.isConnected && (!replacement || replacement === returnButton)) {
        origin.replaceWith(returnButton);
      } else {
        returnButton.remove();
        origin.remove();
      }
    } else {
      origin.remove();
    }
    restoreReturnDecoration();
  };
  const onMenuBeforeTeardown = event => {
    if (event?.detail?.toolbar && event.detail.toolbar !== menuToolbar) return;
    releaseToNative();
  };
  win?.addEventListener?.(menuBarConfig.events.beforeTeardown, onMenuBeforeTeardown);

  const preserveFocus = doc.activeElement === returnButton;
  if (returnButton.parentNode !== cityDropdown) cityDropdown.prepend(returnButton);
  if (preserveFocus && doc.activeElement !== returnButton) returnButton.focus();
  sync();

  return {
    sync,
    isIntact: () => !released && actionBar.isConnected && captureButton.parentNode === actionBar &&
      returnButton.parentNode === cityDropdown && cityGroup.isConnected && cityTrigger.isConnected && cityDropdown.isConnected && style.isConnected,
    cleanup() {
      win?.removeEventListener?.(menuBarConfig.events.beforeTeardown, onMenuBeforeTeardown);
      releaseToNative();
      unclaimRevive();
      restoreAttribute(actionBar, "data-ppbui-hunt-controls", prior.barMarker);
      restoreAttribute(captureButton, "data-ppbui-hunt-capture", prior.captureMarker);
      style.remove();
    },
  };
}
