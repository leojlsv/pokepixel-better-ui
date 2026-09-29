import { coupledWorkspaceConfig as config } from "./config.js";
import { createCoupledCards } from "./cards.js";
import { isCoupledWorkspaceHost, readAnalyzerSummary } from "./controller.js";

const moduleId = "standalone-card-mode";
const modeAttribute = "data-ppbui-card-mode";
const surfaceAttribute = "data-ppbui-card-mode-surface";
const dockGap = 6;
const viewportMargin = 8;

export function resolveStandaloneRuntimeWindow(fallback = globalThis.window) {
  const candidate = typeof unsafeWindow !== "undefined" ? unsafeWindow : globalThis?.unsafeWindow;
  if (candidate?.document && (!fallback?.document || candidate.document === fallback.document)) return candidate;
  return fallback;
}

function switchStyles() {
  return `
    html[${modeAttribute}="cards"] body{margin:0!important;overflow:auto!important;background:var(--ppbui-bg-1,#161d20)!important}
    html[${modeAttribute}="cards"] body>:not([${surfaceAttribute}]){display:none!important}
    .ppbui-card-mode-dock{position:fixed;z-index:2147481000;display:block;width:max-content;max-width:calc(100vw - 16px);pointer-events:auto}
    .ppbui-card-mode-dock[hidden]{display:none!important}
    .ppbui-card-mode-switch{display:flex;width:max-content;max-width:100%;gap:2px;padding:2px;border:1px solid var(--ppbui-border-strong,#6b6543);border-radius:var(--ppbui-radius,0px);background:var(--ppbui-bg-2,#232c2e);box-shadow:none;font:700 11px/1 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif)}
    .ppbui-coupled-cards>.ppbui-card-mode-switch{position:sticky;top:0;z-index:2;margin:0 0 8px auto}
    .ppbui-card-mode-dock>.ppbui-card-mode-switch{position:relative;inset:auto;margin:0;padding:2px}
    .ppbui-card-mode-switch button{min-width:54px;min-height:28px;margin:0;padding:5px 8px;border:1px solid transparent;background:transparent;color:var(--ppbui-text-muted,#a6aa9f);font:inherit;cursor:pointer}
    .ppbui-card-mode-switch button[aria-pressed="true"]{border-color:var(--ppbui-selected,#d2b45d);background:var(--ppbui-bg-1,#161d20);color:var(--ppbui-title,#e0c46d)}
    .ppbui-card-mode-switch button:focus-visible{outline:2px solid var(--ppbui-focus,#37b4d1);outline-offset:1px}
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

  const switcher = doc.createElement("div");
  switcher.className = "ppbui-card-mode-switch";
  switcher.dataset.ppbuiModule = moduleId;
  switcher.dataset.ppbuiCardModeSwitch = "";
  switcher.setAttribute("role", "group");
  switcher.setAttribute("aria-label", "Hunt view");
  switcher.innerHTML = `
    <button type="button" data-ppbui-card-mode="cards" aria-pressed="false">Cards</button>
    <button type="button" data-ppbui-card-mode="game" aria-pressed="false">Game</button>
  `;
  const dock = doc.createElement("div");
  dock.className = "ppbui-card-mode-dock";
  dock.dataset.ppbuiModule = moduleId;
  dock.dataset.ppbuiCardModeDock = "";
  dock.setAttribute(surfaceAttribute, "");
  dock.hidden = true;
  (doc.body || doc.documentElement).append(dock);
  const cards = createCoupledCards({ win, textOnly: true });
  cards.root.dataset.ppbuiModule = moduleId;
  cards.root.setAttribute(surfaceAttribute, "");
  const buttons = [...switcher.querySelectorAll("[data-ppbui-card-mode]")];
  let mode = "cards";
  let analyzerTimer = null;
  let resizeObserver = null;
  let observedToolbar = null;

  const syncAnalyzer = () => cards.render(readAnalyzerSummary(win));
  const positionGameDock = () => {
    if (mode !== "game" || dock.hidden || !switcher.isConnected) return;
    const toolbar = doc.querySelector(config.selectors.toolbar);
    const viewportWidth = Math.max(0, Number(win.innerWidth) || doc.documentElement?.clientWidth || 0);
    const viewportHeight = Math.max(0, Number(win.innerHeight) || doc.documentElement?.clientHeight || 0);
    const switchRect = switcher.getBoundingClientRect?.() || {};
    const width = Number(switchRect.width) || 118;
    const height = Number(switchRect.height) || 34;
    let left = viewportWidth > 0 ? (viewportWidth - width) / 2 : viewportMargin;
    let top = viewportMargin;
    const toolbarRect = toolbar?.getBoundingClientRect?.();
    if (toolbarRect && Number(toolbarRect.width) > 0 && Number(toolbarRect.height) > 0) {
      left = Number(toolbarRect.left) + (Number(toolbarRect.width) - width) / 2;
      const toolbarMid = Number(toolbarRect.top) + Number(toolbarRect.height) / 2;
      top = viewportHeight > 0 && toolbarMid > viewportHeight / 2
        ? Number(toolbarRect.top) - height - dockGap
        : Number(toolbarRect.bottom) + dockGap;
    }
    const maxLeft = viewportWidth > 0 ? Math.max(viewportMargin, viewportWidth - width - viewportMargin) : left;
    const maxTop = viewportHeight > 0 ? Math.max(viewportMargin, viewportHeight - height - viewportMargin) : top;
    dock.style.left = `${Math.round(Math.max(viewportMargin, Math.min(left, maxLeft)))}px`;
    dock.style.top = `${Math.round(Math.max(viewportMargin, Math.min(top, maxTop)))}px`;
  };
  const placeSwitcher = () => {
    const focusedControl = switcher.contains(doc.activeElement) ? doc.activeElement : null;
    const host = mode === "cards"
      ? cards.root
      : dock;
    if (dock.hidden !== (mode !== "game")) dock.hidden = mode !== "game";
    if (switcher.parentElement === host) return;
    if (host === cards.root) host.prepend(switcher);
    else host.append(switcher);
    if (host === dock) positionGameDock();
    focusedControl?.focus?.({ preventScroll: true });
  };
  const syncToolbarObserver = () => {
    if (!resizeObserver) return;
    const toolbar = doc.querySelector(config.selectors.toolbar);
    if (toolbar === observedToolbar) return;
    resizeObserver.disconnect();
    observedToolbar = toolbar || null;
    if (observedToolbar) resizeObserver.observe(observedToolbar);
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
    placeSwitcher();
    buttons.forEach(button => button.setAttribute("aria-pressed", button.dataset.ppbuiCardMode === mode ? "true" : "false"));
    if (mode === "cards") syncAnalyzer();
    win.queueMicrotask?.(() => win.dispatchEvent(new win.Event("ppbui:card-mode-change")));
  };
  const onSwitch = event => {
    const button = event.target?.closest?.("[data-ppbui-card-mode]");
    if (!button || !switcher.contains(button)) return;
    setMode(button.dataset.ppbuiCardMode);
  };
  const onNativeAction = event => {
    const button = event.target?.closest?.(config.selectors.action);
    const toolbar = button?.closest?.(config.selectors.toolbar);
    if (!button || !toolbar) return;
    setMode("game");
  };

  switcher.addEventListener("click", onSwitch);
  doc.addEventListener("click", onNativeAction, true);
  win.addEventListener?.("resize", positionGameDock);
  if (typeof win.ResizeObserver === "function") {
    resizeObserver = new win.ResizeObserver(positionGameDock);
    syncToolbarObserver();
  }
  setMode("cards");
  analyzerTimer = win.setInterval(() => {
    if (mode === "cards") syncAnalyzer();
  }, config.analyzerPollMs);

  return {
    sync() {
      syncToolbarObserver();
      placeSwitcher();
      if (mode === "game") positionGameDock();
      if (mode === "cards") syncAnalyzer();
    },
    cleanup() {
      if (analyzerTimer !== null) win.clearInterval(analyzerTimer);
      switcher.removeEventListener("click", onSwitch);
      doc.removeEventListener("click", onNativeAction, true);
      win.removeEventListener?.("resize", positionGameDock);
      resizeObserver?.disconnect?.();
      cards.cleanup();
      switcher.remove();
      dock.remove();
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
