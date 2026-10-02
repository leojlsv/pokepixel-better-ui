import { coupledWorkspaceConfig as config } from "./config.js";
import { createCoupledCards } from "./cards.js";
import { isCoupledWorkspaceHost, readAnalyzerSummary } from "./controller.js";

const moduleId = "standalone-card-mode";
const modeAttribute = "data-ppbui-card-mode";
const surfaceAttribute = "data-ppbui-card-mode-surface";
const toolbarAttribute = "data-ppbui-card-mode-toolbar";
const toolbarPathAttribute = "data-ppbui-card-mode-toolbar-path";

export function resolveStandaloneRuntimeWindow(fallback = globalThis.window) {
  const candidate = typeof unsafeWindow !== "undefined" ? unsafeWindow : globalThis?.unsafeWindow;
  if (candidate?.document && (!fallback?.document || candidate.document === fallback.document)) return candidate;
  return fallback;
}

function switchStyles() {
  return `
    html[${modeAttribute}="cards"] body{margin:0!important;overflow:auto!important;background:var(--ppbui-bg-1,#161d20)!important}
    html[${modeAttribute}="cards"] body>:not([${surfaceAttribute}]):not([${toolbarPathAttribute}]){display:none!important}
    html[${modeAttribute}="cards"] [${toolbarPathAttribute}]:not([${toolbarAttribute}])>:not([${toolbarPathAttribute}]):not([${toolbarAttribute}]){display:none!important}
    [data-ppbui-card-mode-toggle]{position:relative!important}
    [data-ppbui-card-mode-toggle] .ppbui-card-mode-toggle-icon{display:grid!important;width:31px!important;height:31px!important;flex:0 0 31px!important;place-items:center!important;margin:0!important}
    [data-ppbui-card-mode-toggle] .ppbui-card-mode-toggle-track{position:relative;display:block;width:24px;height:12px;border:1px solid var(--ppbui-line,#6b6543);border-radius:6px;background:var(--ppbui-surface-value,rgba(22,29,32,.85));box-sizing:border-box}
    [data-ppbui-card-mode-toggle] .ppbui-card-mode-toggle-knob{position:absolute;left:1px;top:1px;display:block;width:8px;height:8px;border-radius:50%;background:var(--ppbui-text-muted,#a6aa9f);box-shadow:none;transform:none;transition:none}
    [data-ppbui-card-mode-toggle][aria-pressed="true"] .ppbui-card-mode-toggle-track{border-color:var(--ppbui-selected,#d2b45d);background:var(--ppbui-surface-interactive,rgba(35,44,46,.96))}
    [data-ppbui-card-mode-toggle][aria-pressed="true"] .ppbui-card-mode-toggle-knob{left:13px;background:var(--ppbui-selected,#d2b45d)}
    [data-ppbui-card-mode-toggle]:focus-visible{outline:2px solid var(--ppbui-focus,#37b4d1)!important;outline-offset:1px!important}
  `;
}

function isStandaloneCardModeHost(win = globalThis.window) {
  const runtime = resolveStandaloneRuntimeWindow(win);
  return Boolean(runtime?.document?.querySelector?.(config.selectors.toolbar)) && !isCoupledWorkspaceHost(runtime);
}

function mountStandaloneCardMode(win = globalThis.window) {
  win = resolveStandaloneRuntimeWindow(win);
  if (!isStandaloneCardModeHost(win)) throw new Error("Standalone Card Mode is unavailable in the coupled host.");
  const doc = win.document;
  const root = doc.documentElement;
  const previousMode = root.getAttribute(modeAttribute);
  const style = doc.createElement("style");
  style.dataset.ppbuiCardModeStyle = "";
  style.textContent = switchStyles();
  (doc.head || doc.documentElement).append(style);

  const toggle = doc.createElement("button");
  toggle.type = "button";
  toggle.className = "pokeidle-top-toolbar__btn";
  toggle.dataset.ppbuiModule = moduleId;
  toggle.dataset.ppbuiCardModeToggle = "";
  toggle.setAttribute("aria-pressed", "false");
  toggle.innerHTML = `
    <span class="pokeidle-top-toolbar__icon ppbui-card-mode-toggle-icon" aria-hidden="true">
      <span class="ppbui-card-mode-toggle-track"><span class="ppbui-card-mode-toggle-knob"></span></span>
    </span>
    <span class="pokeidle-top-toolbar__label">Cards/Game</span>
  `;
  const cards = createCoupledCards({ win, textOnly: true });
  cards.root.dataset.ppbuiModule = moduleId;
  cards.root.setAttribute(surfaceAttribute, "");
  let mode = "cards";
  let analyzerTimer = null;
  let observedToolbar = null;
  let toolbarHadMarker = false;
  let toolbarPath = new Map();

  const syncAnalyzer = () => cards.render(readAnalyzerSummary(win));
  const clearToolbarOwnership = () => {
    if (observedToolbar && !toolbarHadMarker) observedToolbar.removeAttribute(toolbarAttribute);
    for (const [node, hadMarker] of toolbarPath) if (!hadMarker) node.removeAttribute(toolbarPathAttribute);
    toolbarPath = new Map();
    observedToolbar = null;
    toolbarHadMarker = false;
  };
  const toolbarPathNodes = toolbar => {
    const nodes = [];
    for (let node = toolbar; node && node !== doc.body; node = node.parentElement) nodes.push(node);
    return nodes;
  };
  const syncToolbar = () => {
    const toolbar = doc.querySelector(config.selectors.toolbar);
    const nextPath = toolbarPathNodes(toolbar);
    const currentPath = [...toolbarPath.keys()];
    const pathChanged = nextPath.length !== currentPath.length || nextPath.some((node, index) => currentPath[index] !== node);
    if (toolbar !== observedToolbar || pathChanged) {
      clearToolbarOwnership();
      observedToolbar = toolbar || null;
      if (observedToolbar) {
        toolbarHadMarker = observedToolbar.hasAttribute(toolbarAttribute);
        observedToolbar.setAttribute(toolbarAttribute, "");
        for (const node of nextPath) {
          toolbarPath.set(node, node.hasAttribute(toolbarPathAttribute));
          node.setAttribute(toolbarPathAttribute, "");
        }
      }
    }
    if (observedToolbar && toggle.parentElement !== observedToolbar) observedToolbar.append(toggle);
  };
  const syncToggle = () => {
    const cardsActive = mode === "cards";
    toggle.setAttribute("aria-pressed", String(cardsActive));
    toggle.dataset.ppbuiCardModeState = mode;
    const label = cardsActive ? "Cards" : "Game";
    toggle.setAttribute("aria-label", `Cards/Game: ${label}`);
    toggle.title = `Cards/Game: ${label}`;
  };
  const setMode = next => {
    mode = next === "game" ? "game" : "cards";
    if (mode === "cards") {
      root.setAttribute(modeAttribute, "cards");
      cards.setMode("cards");
    } else {
      root.setAttribute(modeAttribute, "game");
      cards.setMode("game");
    }
    syncToolbar();
    syncToggle();
    if (mode === "cards") syncAnalyzer();
    win.queueMicrotask?.(() => win.dispatchEvent(new win.Event("ppbui:card-mode-change")));
  };
  const onSwitch = event => {
    if (!toggle.contains(event.target)) return;
    setMode(mode === "cards" ? "game" : "cards");
  };
  const onNativeAction = event => {
    const button = event.target?.closest?.(config.selectors.action);
    const toolbar = button?.closest?.(config.selectors.toolbar);
    if (!button || !toolbar) return;
    setMode("game");
  };

  toggle.addEventListener("click", onSwitch);
  doc.addEventListener("click", onNativeAction, true);
  syncToolbar();
  setMode("cards");
  analyzerTimer = win.setInterval(() => {
    if (mode === "cards") syncAnalyzer();
  }, config.analyzerPollMs);

  return {
    sync() {
      syncToolbar();
      syncToggle();
      if (mode === "cards") syncAnalyzer();
    },
    cleanup() {
      if (analyzerTimer !== null) win.clearInterval(analyzerTimer);
      toggle.removeEventListener("click", onSwitch);
      doc.removeEventListener("click", onNativeAction, true);
      cards.cleanup();
      toggle.remove();
      clearToolbarOwnership();
      style.remove();
      if (previousMode === null) root.removeAttribute(modeAttribute);
      else root.setAttribute(modeAttribute, previousMode);
    },
  };
}

export function createStandaloneCardModeModule() {
  let mounted = null;
  return {
    id: moduleId,
    runsInCardMode: true,
    shouldMount: () => isStandaloneCardModeHost(resolveStandaloneRuntimeWindow(document.defaultView)),
    reconcile: () => mounted?.sync(),
    mount() {
      mounted = mountStandaloneCardMode(resolveStandaloneRuntimeWindow(document.defaultView));
      return () => {
        mounted?.cleanup();
        mounted = null;
      };
    },
  };
}
