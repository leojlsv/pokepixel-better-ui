import { cardModeConfig as config } from "./config.js";
import { createCardModeCards } from "./cards.js";
import { readAnalyzerLootSession, readAnalyzerSummary } from "./analyzer-summary.js";
import { createCardModeWindows } from "./windows.js";

const moduleId = config.id;
const modeAttribute = "data-ppbui-card-mode";
const surfaceAttribute = "data-ppbui-card-mode-surface";
const toolbarAttribute = "data-ppbui-card-mode-toolbar";
const toolbarPathAttribute = "data-ppbui-card-mode-toolbar-path";
const bottomInsetProperty = "--ppbui-card-mode-bottom-inset";
const windowInsetProperty = "--ppbui-card-mode-window-bottom-inset";
const windowTopInsetProperty = "--ppbui-card-mode-window-top-inset";
const toolbarGap = 8;
const menuGeometryEvents = ["ppbui:menu-collapse-change", "ppbui:menu-orientation-change", "ppbui:menu-layout-change"];
const nativeMenuConstructorSelectors = [...Object.values(config.windows.nativeMenus), ...Object.values(config.windows.nativeMenusWaveB), ...Object.values(config.windows.nativeMenusWaveB2), ...Object.values(config.windows.nativeMenusWaveB3), ...Object.values(config.windows.nativeActionPanels)].map(({ panel }) =>
  `html[${modeAttribute}="cards"] body>.pokeidle-panel-overlay:not([hidden]):not([inert]):not([aria-hidden="true"]):has(>${panel}.is-opening:not([hidden]):not([inert]):not([aria-hidden="true"]))`
).join(",\n");
  const teamChildConstructorSelectors = [config.windows.nativeChildren.teamPicker, config.windows.nativeChildren.teamMoveset].map(panel =>
  `html[${modeAttribute}="cards"]:has(body>[data-ppbui-card-mode-window="native-team"]) body>.pokeidle-panel-overlay:not([hidden]):not([inert]):not([aria-hidden="true"]):has(>${panel}.is-opening:not([hidden]):not([inert]):not([aria-hidden="true"]))`
).join(",\n");

export function resolveCardModeRuntimeWindow(fallback = globalThis.window) {
  const candidate = typeof unsafeWindow !== "undefined" ? unsafeWindow : globalThis?.unsafeWindow;
  if (candidate?.document && (!fallback?.document || candidate.document === fallback.document)) return candidate;
  return fallback;
}

function switchStyles() {
  return `
    html[${modeAttribute}="cards"]{height:100vh!important;height:100dvh!important;overflow:hidden!important}
    html[${modeAttribute}="cards"] body{height:100vh!important;height:100dvh!important;margin:0!important;overflow:hidden!important;background:var(--ppbui-bg-1,#161d20)!important}
    html[${modeAttribute}="cards"] body>:not([${surfaceAttribute}]):not([${toolbarPathAttribute}]):not([data-ppbui-menu-layout-editor]):not([data-ppbui-menu-controls-portal]):not([data-ppbui-card-mode-window]){display:none!important}
    /* Team Details synchronously creates the native PokemonCardHost shell.
       Admit constructor geometry only during its verified native click; a
       permanent Cards marker still requires exact Team provenance. */
    html[${modeAttribute}="cards"][data-ppbui-card-mode-team-details-opening] body>.pokemon-card-shell:not([hidden]):not([inert]):not([aria-hidden="true"]):not([data-ppbui-card-mode-window]):not([style*="z-index"]):has(>.pokemon-card:is(.pokemon-card--pinned,.pokemon-card--sheet)){display:block!important}
    /* PI.Dialog constructs its complete body portal BEFORE appending it, then
       attaches native Escape/Enter listeners synchronously. A delayed native
       API can finish after a user re-enters Cards, before the central observer
       reveals Game. Keep ONLY the fully formed native modal visible at that
       instant; it receives no ownership marker and reconciliation forces Game.
       Foreign partial portals, hidden/inert roots and native inline-hidden
       dialogs must never be revealed by this synchronous safety CSS. */
    html[${modeAttribute}="cards"] body>.pokeidle-dialog-overlay:not([hidden]):not([inert]):not([aria-hidden="true"]):not([style]):has(>section.pokeidle-dialog:only-child:not([hidden]):not([inert]):not([aria-hidden="true"]) > header.pokeidle-dialog__header > strong.pokeidle-dialog__title):has(>section.pokeidle-dialog:only-child > header.pokeidle-dialog__header > button.pokeidle-dialog__close):has(>section.pokeidle-dialog:only-child > div.pokeidle-dialog__body):has(>section.pokeidle-dialog:only-child > footer.pokeidle-dialog__actions > button.rubinot-btn){display:grid!important;z-index:2147483500!important}
    /* Native UIPanel measures and freezes geometry synchronously while is-opening.
       Permit ONLY the Inventory constructor shell during that short interval;
       afterward require verified ownership via the regular Card Mode marker. */
    html[${modeAttribute}="cards"] body>.pokeidle-panel-overlay:not([hidden]):not([inert]):not([aria-hidden="true"]):has(>.pokeidle-panel.inventory-window.inventory-window--slots.is-opening){display:block!important}
    ${nativeMenuConstructorSelectors}{display:block!important}
    ${teamChildConstructorSelectors}{display:block!important}
    /* Event Calendar can open Halloween through its own native button, outside
       the HUD. Its closure-private UIPanel needs constructor geometry before
       reconciliation reveals Game; this CSS NEVER grants a Cards owner. */
    html[${modeAttribute}="cards"] body>.pokeidle-panel-overlay:not([hidden]):not([inert]):not([aria-hidden="true"]):has(>${config.windows.halloweenPanel}.is-opening:not([hidden]):not([inert]):not([aria-hidden="true"])){display:block!important}
    /* UIFormHelper positions unsolicited native forms against GameCanvas.
       If the renderer was hidden when it opened, the host may freeze its
       overlay at 0x0. Only in Game, restore a usable viewport-sized shell;
       the native resize listener retains final geometric authority. */
    html[${modeAttribute}="game"] body>.pokeidle-overlay[style*="width: 0px"][style*="height: 0px"]:has(>.pokeidle-form-box>.pokeidle-form-title){position:fixed!important;left:0!important;top:0!important;width:100vw!important;height:100vh!important}
    /* An async Ditto request can finish AFTER a manual Game→Cards toggle and
       even after Team loses active ownership. This exact native constructor
       needs nonzero synchronous UIPanel geometry; it NEVER receives overlay
       ownership from the CSS. Reconciliation returns unowned Ditto to Game. */
    html[${modeAttribute}="cards"] body>.pokeidle-panel-overlay:not([hidden]):not([inert]):not([aria-hidden="true"]):has(>${config.windows.nativeChildren.dittoPicker}.is-opening:not([hidden]):not([inert]):not([aria-hidden="true"])){display:block!important}
    /* Native Hunt and PokemonCard hover positioning measures the portal
       synchronously. Admit only these structural shells while their exact
       verified native parent window is active; sync then checks object identity. */
    html[${modeAttribute}="cards"]:has(body>[data-ppbui-card-mode-window="native-hunts"]) body>aside.hunt-drop-tooltip.hunt-world-drop-tooltip:not([hidden]):not([inert]):not([aria-hidden="true"]),
    html[${modeAttribute}="cards"]:has(body>[data-ppbui-card-mode-window="native-team"],body>[data-ppbui-card-mode-window="native-storage"],body>[data-ppbui-card-mode-window="native-professions"]) body:not([data-ppbui-pokemon-hover-disabled])>.pokemon-card--hover:not([hidden]):not([inert]):not([aria-hidden="true"]){display:block!important}
    html[${modeAttribute}="cards"] [${toolbarPathAttribute}]:not([${toolbarAttribute}])>:not([${toolbarPathAttribute}]):not([${toolbarAttribute}]){display:none!important}
    html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window]:not(.pokemon-card-shell){z-index:2147482500!important}
    /* Geneticist/Awakening is a native dialog-like panel: its verified NPC
       overlay must cover Cards, toolbar and native pinned PokemonCard shells;
       blocking native dialogs retain their higher tier. */
    html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window="native-action-city-geneticist"]{z-index:2147483400!important}
    /* ConnectionOverlay's original native busy/disconnected overlays are
       blocking top-layer surfaces. The native inline display value decides
       whether they are shown; Card Mode only admits proven singleton roots. */
    html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window^="native-system-"]:not(.pokemon-card-shell){z-index:2147483647!important}
    html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window="inventory-dialog"]{z-index:2147483500!important}
    html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window="inventory-tooltip"]:not(.pokemon-card-shell){z-index:2147482800!important}
    html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window="profile-editor"]{z-index:2147482800!important}
    html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window^="native-child-"],
    html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window^="native-dialog-"]{z-index:2147483500!important}
    html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window^="native-tooltip-"]:not(.pokemon-card-shell){z-index:2147482800!important}
    /* The central observer does not watch inert-only changes. Hide inaccessible
       native owners synchronously via CSS; windows.sync revokes markers later. */
    html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window]:is([hidden],[inert],[aria-hidden="true"]),
    html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window]:has(>.pokeidle-panel:is([hidden],[inert],[aria-hidden="true"])){display:none!important}
    html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window]:has(>.pokeidle-mobile-sheet:is([hidden],[inert],[aria-hidden="true"])),
    html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window]:has(>.pokeidle-dialog:is([hidden],[inert],[aria-hidden="true"])){display:none!important}
    html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window="inventory"] .pokeidle-panel__body,
    html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window="profile"] [data-ppbui-profile-body]{
      padding-bottom:var(${windowInsetProperty},0px)!important;
      scroll-padding-bottom:var(${windowInsetProperty},0px);
    }
    html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window="profile"]{
      max-height:calc(100dvh - var(${windowInsetProperty},0px) - 16px)!important;
    }
    html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window="profile"]:not([style*="transform: none"]){
      top:calc((100dvh - var(${windowInsetProperty},0px)) / 2)!important;
    }
    @media(max-width:640px){
      html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window="inventory"] > .pokeidle-panel.inventory-window--slots{
        max-height:calc(100dvh - var(${windowInsetProperty},0px) - 16px)!important;
      }
      html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window="inventory"] > .pokeidle-panel.inventory-window--slots[style*="top: 50%"]{
        top:calc((100dvh - var(${windowInsetProperty},0px)) / 2)!important;
      }
      html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window^="native-"] > .pokeidle-panel{
        max-height:calc(100dvh - var(${windowTopInsetProperty},0px) - var(${windowInsetProperty},0px) - 16px)!important;
      }
      html[${modeAttribute}="cards"] body>[data-ppbui-card-mode-window^="native-"] > .pokeidle-panel[style*="top: 50%"]{
        top:calc((100dvh - var(${windowInsetProperty},0px)) / 2)!important;
      }
    }
    [data-ppbui-card-mode-toggle]{position:relative!important}
    [data-ppbui-card-mode-toggle] .ppbui-card-mode-toggle-icon{display:grid!important;width:31px!important;height:31px!important;flex:0 0 31px!important;place-items:center!important;margin:0!important}
    [data-ppbui-card-mode-toggle] .ppbui-card-mode-toggle-track{position:relative;display:block;width:24px;height:12px;border:1px solid var(--ppbui-line,#6b6543);border-radius:6px;background:var(--ppbui-surface-values,rgba(22,29,32,.85));box-sizing:border-box}
    [data-ppbui-card-mode-toggle] .ppbui-card-mode-toggle-knob{position:absolute;left:1px;top:1px;display:block;width:8px;height:8px;border-radius:50%;background:var(--ppbui-text-muted,#a6aa9f);box-shadow:none;transform:none;transition:none}
    [data-ppbui-card-mode-toggle][aria-pressed="true"] .ppbui-card-mode-toggle-track{border-color:var(--ppbui-selected,#d2b45d);background:var(--ppbui-surface-interactive,rgba(35,44,46,.96))}
    [data-ppbui-card-mode-toggle][aria-pressed="true"] .ppbui-card-mode-toggle-knob{left:13px;background:var(--ppbui-selected,#d2b45d)}
    [data-ppbui-card-mode-toggle][data-ppbui-card-mode-blocked="native-team-details"] .pokeidle-top-toolbar__label{color:var(--ppbui-warning,#e3c054)!important}
    [data-ppbui-card-mode-toggle]:focus-visible{outline:2px solid var(--ppbui-focus,#37b4d1)!important;outline-offset:1px!important}
  `;
}

function isCardModeHost(win = globalThis.window) {
  const runtime = resolveCardModeRuntimeWindow(win);
  return Boolean(runtime?.document?.querySelector?.(config.selectors.toolbar));
}

function mountCardMode(win = globalThis.window, menuBar) {
  win = resolveCardModeRuntimeWindow(win);
  if (!isCardModeHost(win)) throw new Error("Card Mode requires the native top toolbar.");
  const doc = win.document;
  const root = doc.documentElement;
  const previousMode = root.getAttribute(modeAttribute);
  const windowInsetBefore = {
    hadStyle:root.hasAttribute("style"),
    value:root.style.getPropertyValue(windowInsetProperty),
    priority:root.style.getPropertyPriority(windowInsetProperty),
  };
  const windowTopInsetBefore = {
    value:root.style.getPropertyValue(windowTopInsetProperty),
    priority:root.style.getPropertyPriority(windowTopInsetProperty),
  };
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
  const toggleCaption = toggle.querySelector(".pokeidle-top-toolbar__label");
  toggleCaption?.setAttribute("aria-live","polite");
  const unregisterParticipant = menuBar?.registerParticipant?.("system:card-mode", toggle);
  const windows = createCardModeWindows(win);
  const cards = createCardModeCards({
    win, textOnly: true, combatArt: true,
    openTeamDetails: id => windows.openCardTeamDetails(id),
  });
  cards.root.dataset.ppbuiModule = moduleId;
  cards.root.setAttribute(surfaceAttribute, "");
  let mode = "game";
  let analyzerTimer = null;
  let observedToolbar = null;
  let toolbarHadMarker = false;
  let toolbarPath = new Map();
  let toggleOwnedFocus = false;
  let toolbarMovePending = false;
  let toolbarMovePointerId = null;
  let disposed = false;
  let modeEpoch = 0;
  let appliedWindowInset = null;
  let appliedWindowTopInset = null;
  let toolbarResizeObserver = null;
  const releaseWindowInset = () => {
    if(appliedWindowInset !== null &&
       root.style.getPropertyValue(windowInsetProperty) === appliedWindowInset &&
        root.style.getPropertyPriority(windowInsetProperty) === ""){
      if(windowInsetBefore.value)root.style.setProperty(windowInsetProperty,windowInsetBefore.value,windowInsetBefore.priority);
      else root.style.removeProperty(windowInsetProperty);
    }
    if(appliedWindowTopInset !== null &&
       root.style.getPropertyValue(windowTopInsetProperty) === appliedWindowTopInset &&
       root.style.getPropertyPriority(windowTopInsetProperty) === ""){
      if(windowTopInsetBefore.value)root.style.setProperty(windowTopInsetProperty,windowTopInsetBefore.value,windowTopInsetBefore.priority);
      else root.style.removeProperty(windowTopInsetProperty);
    }
    if(!windowInsetBefore.hadStyle&&!root.style.cssText)root.removeAttribute("style");
    appliedWindowInset = null;
    appliedWindowTopInset = null;
  };

  const syncAnalyzer = () => {
    if (mode === "cards") {
      cards.syncResources?.();
      cards.render(readAnalyzerSummary(win));
    }
    else cards.ingest(readAnalyzerLootSession(win));
  };
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
  const syncViewportInset = toolbar => {
    const viewportHeight = Math.max(Number(doc.documentElement?.clientHeight) || 0, Number(win.innerHeight) || 0);
    const rect = toolbar?.getBoundingClientRect?.();
    const width = Number(rect?.width) || Math.max(0, Number(rect?.right) - Number(rect?.left)) || 0;
    const height = Number(rect?.height) || Math.max(0, Number(rect?.bottom) - Number(rect?.top)) || 0;
    const top = Number(rect?.top);
    const bottom = Number(rect?.bottom);
    const bottomGap = viewportHeight - bottom;
    const orientation = toolbar?.getAttribute?.("data-ppbui-menu-orientation");
    const horizontal = orientation ? orientation === "horizontal" : width >= Math.max(1, height * 2);
    const bottomDocked = horizontal && !toolbar?.classList?.contains("is-collapsed")
      && viewportHeight > 0 && width > 0 && height > 0 && Number.isFinite(top) && Number.isFinite(bottom)
      && top >= viewportHeight / 2 && top < viewportHeight
      && bottomGap >= -height && bottomGap <= Math.max(height, toolbarGap * 2);
    const topDocked = horizontal && !toolbar?.classList?.contains("is-collapsed") &&
      viewportHeight > 0 && width > 0 && height > 0 &&
      Number.isFinite(top) && Number.isFinite(bottom) &&
      top >= -height && top <= Math.max(height, toolbarGap * 2) &&
      bottom > 0 && bottom < viewportHeight / 2;
    const inset = bottomDocked
      ? Math.min(viewportHeight - 1, Math.max(0, Math.ceil(viewportHeight - top + toolbarGap)))
      : 0;
    const value = `${inset}px`;
    const topValue = `${topDocked ? Math.min(viewportHeight - 1,Math.max(0,Math.ceil(bottom + toolbarGap))) : 0}px`;
    if (cards.root.style.getPropertyValue(bottomInsetProperty) !== value) {
      cards.root.style.setProperty(bottomInsetProperty, value);
    }
    if(mode==="cards"){
      const bottomChanged = root.style.getPropertyValue(windowInsetProperty) !== value;
      const topChanged = root.style.getPropertyValue(windowTopInsetProperty) !== topValue;
      if(bottomChanged ||
          root.style.getPropertyPriority(windowInsetProperty) !== ""){
        root.style.setProperty(windowInsetProperty,value);
      }
      appliedWindowInset=value;
      if(topChanged || root.style.getPropertyPriority(windowTopInsetProperty) !== "")
        root.style.setProperty(windowTopInsetProperty,topValue);
      appliedWindowTopInset=topValue;
      if(bottomChanged || topChanged){
        win.dispatchEvent(new win.Event("ppbui:card-mode-window-inset-change"));
        windows.sync(true);
      }
    }else releaseWindowInset();
  };
  const syncToolbar = () => {
    const toolbar = doc.querySelector(config.selectors.toolbar);
    const previousToolbar = observedToolbar;
    const nextPath = toolbarPathNodes(toolbar);
    const currentPath = [...toolbarPath.keys()];
    const pathChanged = nextPath.length !== currentPath.length || nextPath.some((node, index) => currentPath[index] !== node);
    const restoreToggleFocus = toggleOwnedFocus && !toggle.isConnected
      && (!doc.activeElement || doc.activeElement === doc.body || doc.activeElement === doc.documentElement);
    if (toolbar !== observedToolbar || pathChanged) {
      if (previousToolbar && previousToolbar !== toolbar) toolbarResizeObserver?.unobserve(previousToolbar);
      clearToolbarOwnership();
      observedToolbar = toolbar || null;
      if (observedToolbar) {
        toolbarHadMarker = observedToolbar.hasAttribute(toolbarAttribute);
        observedToolbar.setAttribute(toolbarAttribute, "");
        for (const node of nextPath) {
          toolbarPath.set(node, node.hasAttribute(toolbarPathAttribute));
          node.setAttribute(toolbarPathAttribute, "");
        }
        if (previousToolbar !== observedToolbar) toolbarResizeObserver?.observe(observedToolbar);
      }
    }
    if (observedToolbar) {
      if (!menuBar?.placeParticipant?.("system:card-mode", toggle, observedToolbar) && toggle.parentElement !== observedToolbar) observedToolbar.append(toggle);
      if (restoreToggleFocus) toggle.focus({ preventScroll: true });
    }
    syncViewportInset(observedToolbar);
  };
  // Native Poké Hub still works with the optional Menu Bar module disabled.
  // Observe its layout size (not DOM mutations) so class-only collapse/expand
  // recalculates the window safe area without polling or extra MutationObservers.
  if (typeof win.ResizeObserver === "function") {
    toolbarResizeObserver = new win.ResizeObserver(entries => {
      if (!disposed && entries.some(entry => entry.target === observedToolbar)) syncToolbar();
    });
  }
  // The central observer intentionally ignores toolbar class/geometry changes.
  // Menu Bar publishes explicit state changes after it updates the native dock.
  const onMenuGeometryChange = event => {
    if (disposed || (event.detail?.toolbar &&
      event.detail.toolbar !== doc.querySelector(config.selectors.toolbar))) return;
    syncToolbar();
  };
  const syncToggle = () => {
    const cardsActive = mode === "cards";
    const blocked = !cardsActive && windows.hasUnsafeNativeTeamDetails();
    const language = String(win.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "pt")
      .split(/[-_]/)[0].toLowerCase();
    const explanation = ({
      pt:["Ficha pendente","Cards indisponível: aguarde a ficha nativa, feche-a para voltar a Cards. Se não abrir, recarregue a página."],
      en:["Details pending","Cards unavailable: wait for native Details and close it before returning to Cards. If nothing opens, reload the page."],
      es:["Ficha pendiente","Cards no disponible: espere la ficha nativa y ciérrela antes de volver a Cards. Si no se abre, recargue la página."],
      zh:["详情待关闭","Cards 暂不可用：请等待并关闭原生宝可梦详情；若未打开，请重新加载页面。"],
    })[language] || ["Details pending","Cards unavailable while native Pokémon Details is pending. Close it or reload the page."];
    toggle.setAttribute("aria-pressed", String(cardsActive));
    toggle.dataset.ppbuiCardModeState = mode;
    const label = cardsActive ? "Cards" : "Game";
    if (blocked) toggle.dataset.ppbuiCardModeBlocked="native-team-details";
    else delete toggle.dataset.ppbuiCardModeBlocked;
    const caption = blocked ? explanation[0] : "Cards/Game";
    if (toggleCaption && toggleCaption.textContent !== caption) toggleCaption.textContent = caption;
    toggle.setAttribute("aria-label", blocked ? `Cards/Game: ${label}. ${explanation[1]}` : `Cards/Game: ${label}`);
    toggle.title = blocked ? explanation[1] : `Cards/Game: ${label}`;
  };
  const onNativeTeamDetailsFenceSettled = () => {
    if (!disposed && mode === "game") syncToggle();
  };
  const setMode = next => {
    if (disposed) return;
    if (next !== "game" && windows.hasUnsafeNativeTeamDetails()) return;
    modeEpoch++;
    mode = next === "game" ? "game" : "cards";
    if (mode === "cards") {
      root.setAttribute(modeAttribute, "cards");
      cards.setMode("cards");
    } else {
      root.setAttribute(modeAttribute, "game");
      cards.setMode("game");
    }
    windows.sync(mode === "cards");
    if (mode === "cards" && (windows.hasOrphanedNativeChild() ||
        windows.hasUnadmittedNativeDialog())) {
      setMode("game");
      return;
    }
    syncToolbar();
    syncToggle();
    syncAnalyzer();
    win.queueMicrotask?.(() => win.dispatchEvent(new win.Event("ppbui:card-mode-change")));
  };
  const visibleNativeDialog = () => [...doc.body.children].some(node =>
    node.matches(".pokeidle-dialog-overlay") && !node.hidden && !node.inert &&
    !node.hasAttribute("inert") && node.getAttribute("aria-hidden") !== "true" &&
    node.firstElementChild?.matches(config.windows.nativeChildren.dialog) &&
    !node.firstElementChild.hidden && !node.firstElementChild.inert &&
    !node.firstElementChild.hasAttribute("inert") &&
    node.firstElementChild.getAttribute("aria-hidden") !== "true" &&
    win.getComputedStyle(node).display !== "none");
  const availableNative = node => Boolean(node && !node.hidden && !node.inert &&
    !node.hasAttribute("inert") && node.getAttribute("aria-hidden") !== "true");
  const visibleHalloweenPanel = () => [...doc.body.children].some(node =>
    node.matches(".pokeidle-panel-overlay") && availableNative(node) &&
    node.firstElementChild?.matches(config.windows.halloweenPanel) &&
    availableNative(node.firstElementChild));
  // Native WorldBoss Map and live Raid are GAMEPLAY modes, not overlays. The
  // raid can start automatically from an async initial load or WebSocket queue
  // callback without any click on its entry window. Both retain Scene_Map,
  // so SceneManager-based incompatibility alone would conceal the actual
  // battle canvas. Their own active state clears on native cleanup/return.
  const nativeWorldBossCombatActive = () =>
    win.PokeIdle?.WorldBossLiveRaid?.active === true ||
    win.PokeIdle?.WorldBossMap?.state != null;
  // Founder checkout may attach its closure-private PIX/hosted-payment portal
  // directly to document.body AFTER an async response. This complete native
  // structure is a signal to show Game, never a grant of overlay ownership.
  const visibleFounderCheckout = () => typeof win.Scene_BetaGoals === "function" &&
    [...doc.body.children].some(node => node.matches("aside.founder-pix") &&
      availableNative(node) &&
      node.firstElementChild?.matches("section.founder-pix__card") &&
      availableNative(node.firstElementChild) &&
      node.firstElementChild.querySelector(".founder-pix__actions"));
  const gameOnlyNativeSceneActive = () => {
    let active;
    try { active = win.PokeIdle?.ReactiveWindows?.active?.(); } catch { return false; }
    if (!active) return false;
    const scenes = [...Object.values(config.windows.gameOnlyHud),
      ...Object.values(config.windows.gameOnlyCity)];
    return scenes.some(({scene}) => {
      const Scene = scene && win[scene];
      if (typeof Scene !== "function" || active.constructor !== Scene) return false;
      const panel = active._panel;
      return !panel || (panel.overlay?.parentElement === doc.body &&
        availableNative(panel.overlay) && availableNative(panel.el) &&
        (typeof panel.isVisible !== "function" || panel.isVisible()));
    });
  };
  const visibleActiveNativeTrade = () => {
    const Trade=win.Scene_Trade;
    if (typeof Trade!=="function") return false;
    let active;
    try { active=win.PokeIdle?.ReactiveWindows?.active?.(); } catch { return true; }
    if (!(active instanceof Trade)) return false;
    const panel=active._panel;
    // An active Trade without a visible window is not evidence of a focus /
    // Escape consumer; native launch refusals can legitimately retain Cards.
    if (!panel) return false;
    return panel.overlay?.parentElement===doc.body &&
      panel.el?.parentElement===panel.overlay &&
      availableNative(panel.overlay) && availableNative(panel.el) &&
      (typeof panel.isVisible!=="function" || panel.isVisible());
  };
  const visibleUnadmittedNativeScene = () => {
    // Block manual Game→Cards before hiding unsupported native windows. Do not
    // retroactively force Game during Cards reconciliation while the native
    // source is temporarily replacing a recognized scene's panel generation.
    if (mode!=="game") return false;
    let active;
    try { active=win.PokeIdle?.ReactiveWindows?.active?.(); } catch { return false; }
    const panel=active?._panel,overlay=panel?.overlay,el=panel?.el;
    if (!overlay?.isConnected || !el?.isConnected ||
        !availableNative(overlay) || !availableNative(el)) return false;
    try { if (typeof panel.isVisible==="function" && !panel.isVisible()) return false; }
    catch { return true; }
    // In Cards even a VISIBLE native unadmitted root computes display:none
    // because Better UI hides it. Only use computed visibility before entering
    // Cards, when the host's own CSS can distinguish a hidden cached window.
    if (win.getComputedStyle(overlay).display==="none" ||
        win.getComputedStyle(el).display==="none") return false;
    if (windows.activeInventory()?.scene===active) return false;
    for(const id of [
      ...Object.keys(config.windows.nativeMenus),
      ...Object.keys(config.windows.nativeMenusWaveB),
      ...Object.keys(config.windows.nativeMenusWaveB2),
      ...Object.keys(config.windows.nativeMenusWaveB3),
    ]) if (windows.activeNativeMenu(id)?.scene===active) return false;
    // Market/Guild/Shared Stones, Trade and future unsupported native scenes
    // can otherwise conceal focus/Escape while SceneManager remains Scene_Map.
    return true;
  };
  const nativeGameOnlyActionAllowed = (route, isCity) => {
    if (win.PokeIdle?.PvP?.isBattleActive?.()) return false;
    let active;
    try { active = win.PokeIdle?.ReactiveWindows?.active?.(); } catch { return false; }
    const Trade = win.Scene_Trade;
    const Scene = route.scene && win[route.scene];
    if (typeof Trade === "function" && active instanceof Trade && active.constructor !== Scene)
      return false;
    if (isCity) return typeof Scene === "function" &&
      typeof win.SceneManager?.push === "function" && win.SceneManager._nextScene == null;
    if (route.action === "halloween") return typeof win.PokeIdle?.Halloween?.open === "function";
    return typeof Scene === "function" && typeof win.SceneManager?.push === "function";
  };
  const onSwitch = event => {
    if (!toggle.contains(event.target)) return;
    if (mode === "game" && windows.hasUnsafeNativeTeamDetails()) {
      syncToggle();
      return;
    }
    // A Game-owned PI.Dialog has no public origin handle. Never hide an active
    // native confirmation/prompt by re-entering Cards before it is dismissed.
    // SceneManager can already be showing/scheduling Login while a retained
    // Poké Hub toolbar and stale ReactiveWindows stack still exist. Reject the
    // toggle synchronously, before Cards conceals that real native scene.
    if (mode === "game" && (incompatibleNativeScene() ||
        visibleNativeDialog() || windows.hasVisibleNativeDitto() ||
        windows.hasVisibleNativeUIForm() ||
        windows.nativePendingDialogTransaction() ||
        windows.hasUnsafeNativeTeamDetails())) return;
    setMode(mode === "cards" ? "game" : "cards");
  };
  // Generic PI.Dialog and async Team Ditto forms expose no scene-owned handle.
  // A temporal guess can mis-own a portal or expire before a slow native API.
  // Preserve their full native flow in Game BEFORE the original handler.
  const onNativePortalAction = event => {
    if (disposed || mode !== "cards") return;
    if (event.type === "keydown" &&
        !["Enter"," ","Spacebar"].includes(event.key)) return;
    if (windows.nativePortalRequiresGame(event)) setMode("game");
  };
  // PokemonCardHost has no public read-only pinned shell handle. If an exact
  // Team Details native action creates ambiguous shells, preserve its original
  // card and Escape handlers in Game instead of granting false Cards ownership.
  const onUnownedTeamDetails = () => {
    if (!disposed && mode === "cards") setMode("game");
  };
  // PersistentHUD handles keyboard shortcuts in a WINDOW capture listener,
  // calls toggleItem directly, then stopPropagation() (not stopImmediatePropagation).
  // A document listener never sees this path. Installed after the native HUD,
  // this same-window listener inspects its completed action before first paint:
  // Game-only scenes reveal the renderer, supported UIPanels gain exact owners.
  const onNativeWindowShortcut = event => {
    if (disposed || mode !== "cards" || !event.defaultPrevented || !event.cancelBubble) return;
    if (event.repeat || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.target?.closest?.('input,textarea,select,[contenteditable="true"]')) return;
    windows.sync(true);
    if (incompatibleNativeScene() || windows.hasOrphanedNativeChild()) setMode("game");
  };
  const incompatibleNativeScene = () => {
    const manager = win.SceneManager, Map = win.Scene_Map;
    if (nativeWorldBossCombatActive() || visibleFounderCheckout() ||
        visibleHalloweenPanel() || gameOnlyNativeSceneActive() ||
        visibleActiveNativeTrade() || visibleUnadmittedNativeScene()) return true;
    if (typeof Map !== "function" || !manager) return false;
    // A real SceneManager.goto(Login/Gym/other non-map scene) is navigation,
    // not a window. Cards must not conceal that native scene after a modal
    // (e.g. Settings logout) causes a transition outside the map.
    if (manager._nextScene && !(manager._nextScene instanceof Map)) return true;
    // A truthy ReactiveWindows.active() is not proof of an actual visible scene:
    // native callbacks can leave a stale, hidden cached overlay in the stack
    // while SceneManager is already showing Login. Non-Map always needs Game.
    return Boolean(manager._scene && !(manager._scene instanceof Map));
  };
  const onNativeAction = event => {
    // PersistentHUD's Poké Hub toggle changes is-collapsed synchronously in its
    // native click handler. Recompute once after that handler without relying
    // on the optional Better UI Menu Bar or on a second DOM observer.
    const nativeHubToggle = event.target?.closest?.(".pokeidle-pokehub__toggle");
    if (nativeHubToggle && nativeHubToggle.closest(config.selectors.toolbar) === observedToolbar) {
      win.queueMicrotask?.(() => { if (!disposed) syncToolbar(); });
      return;
    }
    const button = event.target?.closest?.(config.selectors.action);
    const toolbar = button?.closest?.(config.selectors.toolbar);
    if (!button || !toolbar) return;
    if (mode === "cards" && (button.disabled || button.hidden || button.inert ||
        button.getAttribute("aria-disabled") === "true" ||
        button.closest('[hidden],[inert],[aria-hidden="true"]'))) return;
    // A detached native child panel can remain visible in UIPanel's own
    // Escape stack after its parent scene changes. Preserve native access in
    // Game rather than hiding a still-live modal behind Cards.
    if (mode === "cards" && windows.hasVisibleNativeChild()) {
      setMode("game");
      return;
    }
    if (mode === "cards" && button.dataset.menuId === "pokemon-profile" &&
        doc.querySelector(config.windows.profile)) return;
    // Six explicit exceptions remain native Game even if a future scene starts
    // inheriting Scene_MenuBase. Never change the disabled/blocked native action
    // into a successful action or replay its event.
    const hudGameOnly = Object.hasOwn(config.windows.gameOnlyHud, button.dataset.menuId)
      ? config.windows.gameOnlyHud[button.dataset.menuId] : null;
    const cityGameOnly = Object.hasOwn(config.windows.gameOnlyCity, button.dataset.ppbuiCityAction)
      ? config.windows.gameOnlyCity[button.dataset.ppbuiCityAction] : null;
    if (mode === "cards" && (hudGameOnly || cityGameOnly)) {
      if (nativeGameOnlyActionAllowed(hudGameOnly || cityGameOnly, Boolean(cityGameOnly)))
        setMode("game");
      return;
    }
    if (mode === "cards" && config.windows.nativeActionsStayCards.includes(button.dataset.menuId))
      return;
    const nativeActionPanelId = button.dataset.ppbuiCityAction
      ? `city-${button.dataset.ppbuiCityAction}` : button.dataset.menuId;
    if (mode === "cards" && Object.hasOwn(config.windows.nativeActionPanels,nativeActionPanelId)) {
      const contract=config.windows.nativeActionPanels[nativeActionPanelId];
      if (typeof win.PokeIdle?.[contract.controller]?.[contract.method || "open"] !== "function" ||
          win.PokeIdle?.PvP?.isBattleActive?.()) return;
      const wasOpen=Boolean(windows.activeNativeActionPanel(nativeActionPanelId));
      const actionEpoch=++modeEpoch;
      win.setTimeout(()=>{
        if (disposed || modeEpoch!==actionEpoch || mode!=="cards") return;
        windows.sync(true);
        // Native handlers can refuse an action (Trade/PvP, unavailable shop,
        // login, controller busy). Absence of a NEW panel is not permission
        // to switch out of Cards. If the game instead navigated to a genuine
        // incompatible scene, normal SceneManager guard reveals Game.
        if (!wasOpen && incompatibleNativeScene()) setMode("game");
      },0);
      return;
    }
    // PersistentHUD refuses navigation away from an active Trade scene. Its native
    // click handler owns that refusal; a blocked action must leave Cards untouched.
    if (mode === "cards" && button.dataset.menuId === "inventory" && windows.inventoryBlocked()) return;
    if (mode === "cards" && button.dataset.menuId === "inventory" && windows.canOpenInventory()) {
      const wasOpen = Boolean(windows.activeInventory());
      const actionEpoch = ++modeEpoch;
      // On real pointer clicks the browser may run microtasks between capture
      // and the native target listener. Defer until the next task so the native
      // SceneManager.push has finished before checking the window once.
      win.setTimeout(() => {
        if (disposed || modeEpoch !== actionEpoch || mode !== "cards") return;
        windows.sync(true);
        if (windows.hasOrphanedNativeChild()) { setMode("game"); return; }
        if (!wasOpen && !windows.activeInventory()) setMode("game");
      }, 0);
      return;
    }
    const nativeMenuId = button.dataset.menuId;
    // Public PersistentHUD.lazy-loads GameAdminScene.js on its first click:
    // there is no Scene_GameAdmin until script.onload calls toggleItem() again.
    // An absent constructor here is *not* evidence that the native action
    // navigates to Game. Let the original loader run once; the later true
    // Scene_MenuBase+UIPanel generation receives ordinary strict ownership on
    // body mutation. A missing/failed script does not force a phantom mode
    // transition. No script loading, clicking or callback is recreated here.
    if (mode === "cards" && nativeMenuId === "game-admin" &&
        typeof win.Scene_GameAdmin !== "function" &&
        typeof win.Scene_MenuBase === "function" &&
        typeof win.SceneManager?.push === "function" &&
        !win.PokeIdle?.PvP?.isBattleActive?.()) return;
    if (mode === "cards" && windows.nativeMenuBlocked(nativeMenuId)) return;
    if (mode === "cards" && windows.canOpenNativeMenu(nativeMenuId)) {
      const wasOpen = Boolean(windows.activeNativeMenu(nativeMenuId));
      const actionEpoch = ++modeEpoch;
      // Native target handlers run after document capture microtasks on real
      // pointer input. Never preempt the original handler or replay its click.
      win.setTimeout(() => {
        if (disposed || modeEpoch !== actionEpoch || mode !== "cards") return;
        windows.sync(true);
        if (windows.hasOrphanedNativeChild()) { setMode("game"); return; }
        if (!wasOpen && !windows.activeNativeMenu(nativeMenuId)) setMode("game");
      }, 0);
      return;
    }
    setMode("game");
  };
  const onDocumentFocusIn = event => {
    toggleOwnedFocus = event.target === toggle;
  };
  const onDocumentPointerDown = event => {
    if (!toggle.contains(event.target)) toggleOwnedFocus = false;
    const handle = event.target?.closest?.(".pokeidle-pokehub__handle");
    if (handle && handle.closest(config.selectors.toolbar) === observedToolbar) {
      toolbarMovePending = true;
      toolbarMovePointerId = typeof event.pointerId === "number" ? event.pointerId : null;
    }
  };
  const syncAfterToolbarMove = event => {
    if (!toolbarMovePending) return;
    if ((event.type === "pointerup" || event.type === "pointercancel") &&
        toolbarMovePointerId !== null && event.pointerId !== toolbarMovePointerId) return;
    toolbarMovePending = false;
    toolbarMovePointerId = null;
    win.queueMicrotask?.(() => { if (!disposed) syncToolbar(); });
  };
  const onToolbarHandleKeyUp = event => {
    if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) return;
    const handle = event.target?.closest?.(".pokeidle-pokehub__handle");
    if (!handle || handle.closest(config.selectors.toolbar) !== observedToolbar) return;
    win.queueMicrotask?.(() => { if (!disposed) syncToolbar(); });
  };
  const onToggleKeyDown = event => {
    if (event.key === "Tab") toggleOwnedFocus = false;
  };

  toggle.addEventListener("click", onSwitch);
  toggle.addEventListener("keydown", onToggleKeyDown);
  doc.addEventListener("click", onNativeAction, true);
  win.addEventListener("keydown", onNativeWindowShortcut, true);
  for (const type of ["click","keydown","change","submit"])
    doc.addEventListener(type, onNativePortalAction, true);
  doc.addEventListener("focusin", onDocumentFocusIn, true);
  win.addEventListener("ppbui:card-mode-unsafe-native-team-details", onUnownedTeamDetails);
  win.addEventListener("ppbui:card-mode-native-team-details-fence-settled",onNativeTeamDetailsFenceSettled);
  doc.addEventListener("pointerdown", onDocumentPointerDown, true);
  doc.addEventListener("keyup", onToolbarHandleKeyUp, true);
  win.addEventListener("pointerup", syncAfterToolbarMove, true);
  win.addEventListener("pointercancel", syncAfterToolbarMove, true);
  win.addEventListener("blur", syncAfterToolbarMove);
  win.addEventListener("resize", syncToolbar);
  for (const event of menuGeometryEvents) win.addEventListener(event, onMenuGeometryChange);
  syncToolbar();
  setMode("game");
  analyzerTimer = win.setInterval(() => {
    if (mode === "cards" && incompatibleNativeScene()) setMode("game");
    else syncAnalyzer();
  }, config.analyzerPollMs);

  return {
    sync() {
      if (mode === "cards" && incompatibleNativeScene()) {
        setMode("game");
        return;
      }
      syncToolbar();
      windows.sync(mode === "cards");
      if (mode === "cards" && (windows.hasOrphanedNativeChild() ||
          windows.hasUnadmittedNativeDialog())) {
        setMode("game");
        return;
      }
      syncToggle();
      if (mode === "cards") syncAnalyzer();
    },
    cleanup() {
      disposed = true;
      toolbarMovePending = false;
      toolbarMovePointerId = null;
      modeEpoch++;
      unregisterParticipant?.();
      if (analyzerTimer !== null) win.clearInterval(analyzerTimer);
      toggle.removeEventListener("click", onSwitch);
      toggle.removeEventListener("keydown", onToggleKeyDown);
      doc.removeEventListener("click", onNativeAction, true);
      win.removeEventListener("keydown", onNativeWindowShortcut, true);
      for (const type of ["click","keydown","change","submit"])
        doc.removeEventListener(type, onNativePortalAction, true);
      doc.removeEventListener("focusin", onDocumentFocusIn, true);
      win.removeEventListener("ppbui:card-mode-unsafe-native-team-details", onUnownedTeamDetails);
      win.removeEventListener("ppbui:card-mode-native-team-details-fence-settled",onNativeTeamDetailsFenceSettled);
      doc.removeEventListener("pointerdown", onDocumentPointerDown, true);
      doc.removeEventListener("keyup", onToolbarHandleKeyUp, true);
      win.removeEventListener("pointerup", syncAfterToolbarMove, true);
      win.removeEventListener("pointercancel", syncAfterToolbarMove, true);
      win.removeEventListener("blur", syncAfterToolbarMove);
      win.removeEventListener("resize", syncToolbar);
      toolbarResizeObserver?.disconnect();
      for (const event of menuGeometryEvents) win.removeEventListener(event, onMenuGeometryChange);
      windows.cleanup();
      root.removeAttribute("data-ppbui-card-mode-team-details-opening");
      cards.cleanup();
      toggle.remove();
      clearToolbarOwnership();
      releaseWindowInset();
      style.remove();
      if (previousMode === null) root.removeAttribute(modeAttribute);
      else root.setAttribute(modeAttribute, previousMode);
    },
  };
}

export function createCardModeModule({ menuBar } = {}) {
  let mounted = null;
  return {
    id: moduleId,
    runsInCardMode: true,
    shouldMount: () => isCardModeHost(resolveCardModeRuntimeWindow(document.defaultView)),
    reconcile: () => mounted?.sync(),
    mount() {
      mounted = mountCardMode(resolveCardModeRuntimeWindow(document.defaultView), menuBar);
      return () => {
        mounted?.cleanup();
        mounted = null;
      };
    },
  };
}
