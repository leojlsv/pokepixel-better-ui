import { buffStripConfig as config } from "./config.js";
import { buffStripPanelText } from "./dom.js";

const CUSTOM_PROPERTIES = [
  "--ppbui-buff-strip-left",
  "--ppbui-buff-strip-top",
  "--ppbui-buff-strip-width",
  "--ppbui-buff-strip-max-width",
  "--ppbui-buff-strip-max-height",
];

const ROOT_INLINE_OVERRIDES = Object.freeze({
  margin: "0px",
  padding: "var(--ppbui-space-3)",
  border: "var(--ppbui-separator-width) solid var(--ppbui-border)",
  background: "var(--ppbui-bg-1)",
  "box-shadow": "var(--ppbui-shadow)",
  outline: "0px",
  filter: "none",
  "backdrop-filter": "none",
  "border-radius": "var(--ppbui-window-radius)",
});

const CHILD_INLINE_OVERRIDES = Object.freeze({
  margin: "0px",
  padding: "0px",
  border: "0px",
  background: "transparent",
  "box-shadow": "none",
  outline: "0px",
  filter: "none",
  "backdrop-filter": "none",
  "border-radius": "0px",
});

const SURFACE_INLINE_FAMILIES = Object.freeze([
  "margin",
  "padding",
  "border",
  "background",
  "box-shadow",
  "outline",
  "filter",
  "backdrop-filter",
]);

const isOwnedSurfaceProperty = name => SURFACE_INLINE_FAMILIES.some(prefix => (
  name === prefix || name.startsWith(`${prefix}-`)
));

const SESSION_STATES = new WeakMap();
const finite = value => typeof value === "number" && Number.isFinite(value);
const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

function copyRect(rect) {
  return {
    left: Number(rect?.left) || 0,
    right: Number(rect?.right) || 0,
    top: Number(rect?.top) || 0,
    bottom: Number(rect?.bottom) || 0,
    width: Number(rect?.width) || 0,
    height: Number(rect?.height) || 0,
  };
}

export function mountBuffStrip(target) {
  const { strip, toolbar, list, ticker } = target;
  const doc = strip.ownerDocument;
  const win = doc.defaultView;
  const text = buffStripPanelText(doc);
  const surfaceNodes = [strip, list, ticker];
  const originAnchor = doc.createComment("ppbui-buff-strip-origin");
  const nativeRect = copyRect(strip.getBoundingClientRect());
  strip.before(originAnchor);

  let layerHost = null;
  const moveToToolbarLayer = () => {
    const host = toolbar.parentNode;
    if (!host || host === strip) return false;
    if (strip.parentNode !== host) host.insertBefore(strip, toolbar.nextSibling);
    layerHost = host;
    return true;
  };

  const previousAttributes = new Map([
    ["data-ppbui-buff-strip", strip.getAttribute("data-ppbui-buff-strip")],
    ["data-ppbui-buff-strip-dock", strip.getAttribute("data-ppbui-buff-strip-dock")],
    ["data-ppbui-buff-strip-layout", strip.getAttribute("data-ppbui-buff-strip-layout")],
    ["data-ppbui-buff-strip-collapsed", strip.getAttribute("data-ppbui-buff-strip-collapsed")],
    ["data-ppbui-buff-count", strip.getAttribute("data-ppbui-buff-count")],
  ]);
  const previousCustomProperties = new Map(CUSTOM_PROPERTIES.map(name => [
    name,
    [strip.style.getPropertyValue(name), strip.style.getPropertyPriority(name)],
  ]));
  const previousSurfaceProperties = new Map(surfaceNodes.map(node => [
    node,
    Array.from(node.style)
      .filter(isOwnedSurfaceProperty)
      .map(name => [name, node.style.getPropertyValue(name), node.style.getPropertyPriority(name)]),
  ]));

  const restoreSurfacePaint = (node, properties) => {
    if (!node) return;
    for (const name of Array.from(node.style).filter(isOwnedSurfaceProperty)) node.style.removeProperty(name);
    for (const [name, value, priority] of properties || []) {
      if (value) node.style.setProperty(name, value, priority);
    }
  };

  const restoreAttribute = (node, name) => {
    const value = previousAttributes.get(name);
    if (value === null) node.removeAttribute(name);
    else node.setAttribute(name, value);
  };

  const restoreStripState = (targetStrip, targetList, targetTicker) => {
    if (!targetStrip) return;
    targetStrip.querySelector("[data-ppbui-buff-panel-header]")?.remove();
    targetStrip.classList.remove("is-dragging");
    for (const name of previousAttributes.keys()) restoreAttribute(targetStrip, name);
    for (const [name, [value, priority]] of previousCustomProperties) {
      if (value) targetStrip.style.setProperty(name, value, priority);
      else targetStrip.style.removeProperty(name);
    }
    restoreSurfacePaint(targetStrip, previousSurfaceProperties.get(strip));
    restoreSurfacePaint(targetList, previousSurfaceProperties.get(list));
    restoreSurfacePaint(targetTicker, previousSurfaceProperties.get(ticker));
  };

  const claimedSurfaceSignatures = new WeakMap();
  const surfaceSignature = node => Array.from(node.style)
    .filter(isOwnedSurfaceProperty)
    .sort()
    .map(name => [name, node.style.getPropertyValue(name), node.style.getPropertyPriority(name)])
    .map(parts => parts.join(":"))
    .join("|");
  const claimNodeSurface = (node, overrides) => {
    if (!node) return;
    const currentSignature = surfaceSignature(node);
    if (claimedSurfaceSignatures.get(node) === currentSignature) return;
    const expected = new Set(Object.keys(overrides));
    for (const name of Array.from(node.style).filter(isOwnedSurfaceProperty)) {
      if (!expected.has(name)) node.style.removeProperty(name);
    }
    for (const [name, value] of Object.entries(overrides)) {
      if (node.style.getPropertyValue(name) !== value || node.style.getPropertyPriority(name) !== "important") {
        node.style.setProperty(name, value, "important");
      }
    }
    claimedSurfaceSignatures.set(node, surfaceSignature(node));
  };

  const claimSurfacePaint = () => {
    claimNodeSurface(strip, ROOT_INLINE_OVERRIDES);
    claimNodeSurface(list, CHILD_INLINE_OVERRIDES);
    claimNodeSurface(ticker, CHILD_INLINE_OVERRIDES);
  };

  const style = doc.createElement("style");
  style.dataset.ppbuiStyle = config.id;
  style.textContent = `
    .pokeidle-buff-strip[data-ppbui-buff-strip] {
      position:fixed !important;
      left:var(--ppbui-buff-strip-left) !important;
      top:var(--ppbui-buff-strip-top) !important;
      right:auto !important;
      bottom:auto !important;
      z-index:390 !important;
      display:grid !important;
      width:var(--ppbui-buff-strip-width,min(${config.preferredWidth}px,calc(100vw - ${config.viewportMargin * 2}px))) !important;
      min-width:min(${config.minimumWidth}px,calc(100vw - ${config.viewportMargin * 2}px)) !important;
      max-width:var(--ppbui-buff-strip-max-width) !important;
      max-height:var(--ppbui-buff-strip-max-height) !important;
      box-sizing:border-box !important;
      grid-template-columns:minmax(0,1fr) !important;
      align-content:start !important;
      overflow-x:hidden !important;
      overflow-y:auto !important;
      overscroll-behavior:contain !important;
      transform:none !important;
      pointer-events:auto !important;
      color:var(--ppbui-text) !important;
      font:var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body) !important;
      text-transform:none !important;
      white-space:normal !important;
    }
    body.pokeidle-toolbar-bottom:not(.pokeidle-mobile) .pokeidle-buff-strip[data-ppbui-buff-strip],
    body.pokeidle-mobile .pokeidle-buff-strip[data-ppbui-buff-strip] {
      position:fixed !important;
      left:var(--ppbui-buff-strip-left) !important;
      top:var(--ppbui-buff-strip-top) !important;
      right:auto !important;
      bottom:auto !important;
      z-index:390 !important;
      width:var(--ppbui-buff-strip-width,min(${config.preferredWidth}px,calc(100vw - ${config.viewportMargin * 2}px))) !important;
      max-width:var(--ppbui-buff-strip-max-width) !important;
      pointer-events:auto !important;
    }
    body:has(.pokeidle-pokehub.is-collapsed) > .pokeidle-buff-strip[data-ppbui-buff-strip]:not(.is-embedded) {
      display:grid !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip][hidden] {
      display:none !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] > [data-ppbui-buff-panel-header] {
      position:sticky !important;
      z-index:2 !important;
      top:0 !important;
      display:grid !important;
      grid-template-columns:minmax(0,1fr) auto !important;
      min-height:28px !important;
      align-items:center !important;
      gap:var(--ppbui-space-2) !important;
      padding:0 0 var(--ppbui-space-2) !important;
      border:0 !important;
      border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border) !important;
      border-radius:0 !important;
      background:transparent !important;
      box-shadow:none !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] [data-ppbui-buff-drag] {
      -webkit-appearance:none !important;
      appearance:none !important;
      display:flex !important;
      width:auto !important;
      min-width:0 !important;
      min-height:0 !important;
      align-items:center !important;
      gap:var(--ppbui-space-2) !important;
      align-self:stretch !important;
      margin:0 !important;
      padding:0 !important;
      border:0 !important;
      border-radius:0 !important;
      background:transparent !important;
      color:inherit !important;
      box-shadow:none !important;
      font:inherit !important;
      text-align:left !important;
      cursor:grab !important;
      user-select:none !important;
      touch-action:none !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] [data-ppbui-buff-drag]:focus-visible {
      outline:var(--ppbui-focus-width) solid var(--ppbui-focus) !important;
      outline-offset:-1px !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip].is-dragging [data-ppbui-buff-drag] {
      cursor:grabbing !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] [data-ppbui-buff-title] {
      min-width:0 !important;
      overflow:hidden !important;
      color:var(--ppbui-text-muted) !important;
      font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-body) !important;
      letter-spacing:.1em !important;
      text-overflow:ellipsis !important;
      text-transform:uppercase !important;
      white-space:nowrap !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] [data-ppbui-buff-drag-icon] {
      flex:0 0 auto !important;
      color:var(--ppbui-accent) !important;
      font:700 13px/1 var(--ppbui-font-body) !important;
      letter-spacing:0 !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] [data-ppbui-buff-count] {
      display:inline-grid !important;
      min-width:20px !important;
      min-height:18px !important;
      place-items:center !important;
      padding:0 var(--ppbui-space-2) !important;
      border:var(--ppbui-separator-width) solid var(--ppbui-border) !important;
      border-radius:var(--ppbui-radius-badge) !important;
      background:var(--ppbui-bg-0) !important;
      color:var(--ppbui-text-muted) !important;
      font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data) !important;
      font-variant-numeric:tabular-nums !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] [data-ppbui-buff-collapse] {
      -webkit-appearance:none !important;
      appearance:none !important;
      display:grid !important;
      width:var(--ppbui-icon-button-size) !important;
      min-width:var(--ppbui-icon-button-size) !important;
      height:var(--ppbui-icon-button-size) !important;
      min-height:var(--ppbui-icon-button-size) !important;
      place-items:center !important;
      margin:0 !important;
      padding:0 !important;
      border:var(--ppbui-separator-width) solid var(--ppbui-border) !important;
      border-radius:var(--ppbui-control-radius) !important;
      background:var(--ppbui-bg-2) !important;
      color:var(--ppbui-text) !important;
      box-shadow:none !important;
      font:700 var(--ppbui-font-size-body)/1 var(--ppbui-font-body) !important;
      cursor:pointer !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] [data-ppbui-buff-collapse]:hover {
      border-color:var(--ppbui-accent) !important;
      background:var(--ppbui-bg-3) !important;
      color:var(--ppbui-accent-hi) !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] [data-ppbui-buff-collapse]:active {
      background:var(--ppbui-bg-0) !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] [data-ppbui-buff-collapse]:focus-visible {
      outline:var(--ppbui-focus-width) solid var(--ppbui-focus) !important;
      outline-offset:1px !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] > :is(.pokeidle-buff-list,.pokeidle-event-ticker) {
      position:static !important;
      display:grid !important;
      width:100% !important;
      min-width:0 !important;
      grid-template-columns:minmax(0,1fr) !important;
      gap:var(--ppbui-space-1) !important;
      overflow:visible !important;
      transform:none !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] > :is(.pokeidle-buff-list,.pokeidle-event-ticker)[hidden],
    .pokeidle-buff-strip[data-ppbui-buff-strip] > .pokeidle-event-ticker.is-empty {
      display:none !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip][data-ppbui-buff-strip-collapsed="true"] {
      overflow:hidden !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip][data-ppbui-buff-strip-collapsed="true"] > :is(.pokeidle-buff-list,.pokeidle-event-ticker) {
      display:none !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] :is(.pokeidle-buff-pill,.pokeidle-event-ticker__pill) {
      --ppbui-buff-kind:var(--ppbui-accent-hi);
      display:grid !important;
      width:100% !important;
      min-width:0 !important;
      max-width:none !important;
      min-height:27px !important;
      box-sizing:border-box !important;
      grid-template-columns:minmax(0,1fr) auto auto !important;
      align-items:center !important;
      column-gap:var(--ppbui-space-2) !important;
      row-gap:0 !important;
      margin:0 !important;
      padding:4px var(--ppbui-space-3) !important;
      border:var(--ppbui-separator-width) solid var(--ppbui-border) !important;
      border-left:2px solid var(--ppbui-buff-kind) !important;
      border-radius:var(--ppbui-radius) !important;
      background:var(--ppbui-bg-2) !important;
      background-image:none !important;
      box-shadow:none !important;
      outline:0 !important;
      color:var(--ppbui-text) !important;
      font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body) !important;
      letter-spacing:0 !important;
      text-transform:none !important;
      white-space:nowrap !important;
      overflow:hidden !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-buff-list .pokeidle-buff-pill {
      --ppbui-buff-kind:var(--ppbui-accent-hi);
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-event-ticker .pokeidle-event-ticker__pill {
      --ppbui-buff-kind:var(--ppbui-selected);
      background:var(--ppbui-bg-3) !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] :is(.pokeidle-buff-pill,.pokeidle-event-ticker__pill).is-leaving {
      opacity:.45 !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-event-ticker__pill:focus-visible {
      outline:var(--ppbui-focus-width) solid var(--ppbui-focus) !important;
      outline-offset:1px !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-buff-pill.is-paused {
      opacity:.62 !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-buff-pill span,
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-event-ticker__name {
      min-width:0 !important;
      overflow:hidden !important;
      text-align:left !important;
      text-overflow:ellipsis !important;
      white-space:nowrap !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-buff-pill b,
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-event-ticker__effect {
      min-width:0 !important;
      color:var(--ppbui-buff-kind) !important;
      font-weight:800 !important;
      text-align:right !important;
      font-variant-numeric:tabular-nums !important;
      white-space:nowrap !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-buff-pill time,
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-event-ticker__time {
      grid-column:auto !important;
      width:auto !important;
      min-width:0 !important;
      justify-self:end !important;
      margin:0 !important;
      color:var(--ppbui-text-muted) !important;
      font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data) !important;
      text-align:right !important;
      font-variant-numeric:tabular-nums !important;
      white-space:nowrap !important;
    }
  `;
  doc.head.append(style);

  const header = doc.createElement("div");
  header.dataset.ppbuiBuffPanelHeader = "";
  const dragHandle = doc.createElement("button");
  dragHandle.type = "button";
  dragHandle.dataset.ppbuiBuffDrag = "";
  dragHandle.setAttribute("aria-label", text.drag);
  const dragIcon = doc.createElement("span");
  dragIcon.dataset.ppbuiBuffDragIcon = "";
  dragIcon.setAttribute("aria-hidden", "true");
  dragIcon.textContent = "⠿";
  const title = doc.createElement("strong");
  title.dataset.ppbuiBuffTitle = "";
  title.textContent = text.title;
  const count = doc.createElement("span");
  count.dataset.ppbuiBuffCount = "";
  dragHandle.append(dragIcon, title, count);
  const collapseButton = doc.createElement("button");
  collapseButton.type = "button";
  collapseButton.dataset.ppbuiBuffCollapse = "";
  header.append(dragHandle, collapseButton);
  strip.prepend(header);

  strip.dataset.ppbuiBuffStrip = "";
  strip.dataset.ppbuiBuffStripLayout = "panel";
  strip.dataset.ppbuiBuffStripDock = "free";

  let persistentStateProtected = false;
  const sessionState = () => SESSION_STATES.get(win) || { version:1 };
  const sanitizeState = value => {
    if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== 1) return null;
    const clean = { version:1 };
    if (finite(value.left)) clean.left = value.left;
    if (finite(value.top)) clean.top = value.top;
    if (typeof value.collapsed === "boolean") clean.collapsed = value.collapsed;
    return clean;
  };
  const readState = () => {
    try {
      const raw = win.localStorage?.getItem(config.storageKey);
      if (raw === null || raw === undefined) return sessionState();
      const value = JSON.parse(raw);
      const clean = sanitizeState(value);
      if (!clean) {
        persistentStateProtected = Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.hasOwn(value, "version"));
        return sessionState();
      }
      SESSION_STATES.set(win, clean);
      return clean;
    } catch {
      return sessionState();
    }
  };
  let state = readState();
  const persistState = patch => {
    state = sanitizeState({ ...state, ...patch, version:1 }) || { version:1 };
    SESSION_STATES.set(win, state);
    if (persistentStateProtected) return;
    try { win.localStorage?.setItem(config.storageKey, JSON.stringify(state)); } catch { /* session state remains authoritative */ }
  };

  const viewport = () => ({
    width: doc.documentElement.clientWidth || win.innerWidth || 0,
    height: doc.documentElement.clientHeight || win.innerHeight || 0,
  });
  const setVariable = (name, value) => {
    if (strip.style.getPropertyValue(name) !== value) strip.style.setProperty(name, value);
  };
  const syncReferenceWidth = () => {
    const reference = doc.querySelector(config.selectors.teamHud);
    const referenceWidth = reference?.getBoundingClientRect?.().width || 0;
    const maxWidth = Math.max(0, viewport().width - config.viewportMargin * 2);
    const width = referenceWidth > 0
      ? Math.min(referenceWidth, maxWidth)
      : Math.min(config.preferredWidth, maxWidth);
    setVariable("--ppbui-buff-strip-width", `${Math.round(width)}px`);
  };
  const positionValue = name => {
    const value = Number.parseFloat(strip.style.getPropertyValue(name));
    return Number.isFinite(value) ? value : null;
  };
  const panelSize = () => {
    const rect = strip.getBoundingClientRect();
    return {
      width: rect.width > 0 ? rect.width : Math.min(config.preferredWidth, Math.max(0, viewport().width - config.viewportMargin * 2)),
      height: rect.height > 0 ? rect.height : config.fallbackHeight,
    };
  };
  const setPosition = (left, top) => {
    const { width: viewportWidth, height: viewportHeight } = viewport();
    const size = panelSize();
    const maxLeft = Math.max(config.viewportMargin, viewportWidth - size.width - config.viewportMargin);
    const maxTop = Math.max(config.viewportMargin, viewportHeight - size.height - config.viewportMargin);
    const nextLeft = clamp(Number(left) || 0, config.viewportMargin, maxLeft);
    const nextTop = clamp(Number(top) || 0, config.viewportMargin, maxTop);
    setVariable("--ppbui-buff-strip-left", `${Math.round(nextLeft)}px`);
    setVariable("--ppbui-buff-strip-top", `${Math.round(nextTop)}px`);
    return { left: nextLeft, top: nextTop };
  };

  let lastGeometrySignature = null;
  const emitGeometryChange = () => {
    if (!win?.dispatchEvent || !win.CustomEvent) return;
    const rect = strip.getBoundingClientRect();
    const signature = [
      strip.dataset.ppbuiBuffStripCollapsed || "",
      strip.dataset.ppbuiBuffCount || "",
      ...CUSTOM_PROPERTIES.map(name => strip.style.getPropertyValue(name)),
      Math.round(rect.width || 0),
      Math.round(rect.height || 0),
    ].join("|");
    if (signature === lastGeometrySignature) return;
    lastGeometrySignature = signature;
    win.dispatchEvent(new win.CustomEvent(config.events.geometryChange, {
      detail: { toolbar, strip },
    }));
  };

  const activePills = () => [
    ...(!list.hidden ? list.querySelectorAll(":scope > .pokeidle-buff-pill") : []),
    ...(!ticker.hidden && !ticker.classList.contains("is-empty") ? ticker.querySelectorAll(":scope > .pokeidle-event-ticker__pill") : []),
  ].filter(node => !node.hidden && node.getAttribute("aria-hidden") !== "true" && !node.classList.contains("is-leaving"));

  const syncCount = () => {
    const total = activePills().length;
    const label = text.active(total);
    const dragLabel = `${text.drag} · ${label} · ${text.move}`;
    if (count.textContent !== String(total)) count.textContent = String(total);
    if (count.getAttribute("aria-label") !== label) count.setAttribute("aria-label", label);
    if (count.title !== label) count.title = label;
    if (dragHandle.getAttribute("aria-label") !== dragLabel) dragHandle.setAttribute("aria-label", dragLabel);
    if (strip.dataset.ppbuiBuffCount !== String(total)) strip.dataset.ppbuiBuffCount = String(total);
  };

  const fitInsideViewport = () => {
    const rect = strip.getBoundingClientRect();
    const left = positionValue("--ppbui-buff-strip-left") ?? rect.left;
    const top = positionValue("--ppbui-buff-strip-top") ?? rect.top;
    return setPosition(left, top);
  };

  const setCollapsed = (collapsed, persist = true) => {
    const value = Boolean(collapsed);
    strip.dataset.ppbuiBuffStripCollapsed = String(value);
    collapseButton.textContent = value ? "+" : "−";
    collapseButton.title = value ? text.expand : text.collapse;
    collapseButton.setAttribute("aria-label", collapseButton.title);
    collapseButton.setAttribute("aria-expanded", String(!value));
    if (persist) persistState({ collapsed:value });
    fitInsideViewport();
    emitGeometryChange();
  };

  const sync = () => {
    if (!strip.isConnected || !toolbar.isConnected) return;
    if (!moveToToolbarLayer()) return;
    claimSurfacePaint();
    const { width, height } = viewport();
    if (!(width > 0 && height > 0)) return;
    setVariable("--ppbui-buff-strip-max-width", `${Math.max(0, width - config.viewportMargin * 2)}px`);
    setVariable("--ppbui-buff-strip-max-height", `${Math.max(0, height - config.viewportMargin * 2)}px`);
    syncReferenceWidth();
    syncCount();
    fitInsideViewport();
    emitGeometryChange();
  };

  let dragState = null;
  const onPointerDown = event => {
    if (dragState || (event.button != null && event.button !== 0)) return;
    const rect = strip.getBoundingClientRect();
    dragState = {
      pointerId:event.pointerId,
      startX:event.clientX,
      startY:event.clientY,
      left:positionValue("--ppbui-buff-strip-left") ?? rect.left,
      top:positionValue("--ppbui-buff-strip-top") ?? rect.top,
    };
    strip.classList.add("is-dragging");
    try { dragHandle.setPointerCapture?.(event.pointerId); } catch { /* capture is an enhancement, not drag authority */ }
    event.preventDefault?.();
    event.stopPropagation?.();
  };
  const onPointerMove = event => {
    if (!dragState || (dragState.pointerId != null && event.pointerId !== dragState.pointerId)) return;
    setPosition(
      dragState.left + event.clientX - dragState.startX,
      dragState.top + event.clientY - dragState.startY,
    );
    emitGeometryChange();
  };
  const stopDrag = event => {
    if (!dragState || (event?.pointerId != null && dragState.pointerId != null && event.pointerId !== dragState.pointerId)) return;
    const pointerId = dragState.pointerId;
    dragState = null;
    strip.classList.remove("is-dragging");
    try { dragHandle.releasePointerCapture?.(pointerId); } catch { /* already released */ }
    const left = positionValue("--ppbui-buff-strip-left");
    const top = positionValue("--ppbui-buff-strip-top");
    if (left !== null && top !== null) persistState({ left:Math.round(left), top:Math.round(top) });
    emitGeometryChange();
  };
  const onDragKeyDown = event => {
    const movement = {
      ArrowLeft:[-1,0],
      ArrowRight:[1,0],
      ArrowUp:[0,-1],
      ArrowDown:[0,1],
    }[event.key];
    if (!movement) return;
    const rect = strip.getBoundingClientRect();
    const left = positionValue("--ppbui-buff-strip-left") ?? rect.left;
    const top = positionValue("--ppbui-buff-strip-top") ?? rect.top;
    const step = event.shiftKey ? 40 : 10;
    const next = setPosition(left + movement[0] * step, top + movement[1] * step);
    persistState({ left:Math.round(next.left), top:Math.round(next.top) });
    event.preventDefault();
    event.stopPropagation();
    emitGeometryChange();
  };
  const onResize = () => {
    sync();
  };
  const onCollapse = event => {
    event.stopPropagation();
    setCollapsed(strip.dataset.ppbuiBuffStripCollapsed !== "true");
  };

  collapseButton.addEventListener("click", onCollapse);
  dragHandle.addEventListener("pointerdown", onPointerDown);
  dragHandle.addEventListener("keydown", onDragKeyDown);
  dragHandle.addEventListener("lostpointercapture", stopDrag);
  win.addEventListener("pointermove", onPointerMove, true);
  win.addEventListener("pointerup", stopDrag, true);
  win.addEventListener("pointercancel", stopDrag, true);
  win.addEventListener("blur", stopDrag);
  win.addEventListener("resize", onResize);
  win.visualViewport?.addEventListener?.("resize", onResize);

  moveToToolbarLayer();
  claimSurfacePaint();
  const initialLeft = finite(state.left) ? state.left : nativeRect.width > 0 ? nativeRect.left : config.viewportMargin;
  const initialTop = finite(state.top) ? state.top : nativeRect.height > 0 ? nativeRect.top : config.viewportMargin;
  setVariable("--ppbui-buff-strip-max-width", `${Math.max(0, viewport().width - config.viewportMargin * 2)}px`);
  setVariable("--ppbui-buff-strip-max-height", `${Math.max(0, viewport().height - config.viewportMargin * 2)}px`);
  syncReferenceWidth();
  setPosition(initialLeft, initialTop);
  setCollapsed(Boolean(state.collapsed), false);
  sync();

  return {
    sync,
    isIntact: () => strip.isConnected && toolbar.isConnected && header.parentElement === strip &&
      list.parentElement === strip && ticker.parentElement === strip && style.isConnected &&
      strip.parentNode === toolbar.parentNode,
    cleanup() {
      stopDrag();
      collapseButton.removeEventListener("click", onCollapse);
      dragHandle.removeEventListener("pointerdown", onPointerDown);
      dragHandle.removeEventListener("keydown", onDragKeyDown);
      dragHandle.removeEventListener("lostpointercapture", stopDrag);
      win.removeEventListener("pointermove", onPointerMove, true);
      win.removeEventListener("pointerup", stopDrag, true);
      win.removeEventListener("pointercancel", stopDrag, true);
      win.removeEventListener("blur", stopDrag);
      win.removeEventListener("resize", onResize);
      win.visualViewport?.removeEventListener?.("resize", onResize);
      style.remove();
      restoreStripState(strip, list, ticker);
      if (originAnchor.isConnected) {
        if (strip.isConnected && strip.parentNode === layerHost) {
          originAnchor.replaceWith(strip);
        } else if (!strip.isConnected) {
          const replacement = doc.querySelector(config.selectors.strip);
          if (replacement?.parentNode === layerHost && toolbar.nextSibling === replacement) {
            if (replacement.hasAttribute("data-ppbui-buff-strip")) {
              restoreStripState(
                replacement,
                replacement.querySelector(config.selectors.list),
                replacement.querySelector(config.selectors.ticker),
              );
            }
            originAnchor.replaceWith(replacement);
          } else originAnchor.remove();
        } else {
          originAnchor.remove();
        }
      }
      lastGeometrySignature = null;
      emitGeometryChange();
    },
  };
}
