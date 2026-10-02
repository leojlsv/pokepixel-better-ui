import { buffStripConfig as config } from "./config.js";
import { menuBarConfig } from "../menu-bar/config.js";

const CUSTOM_PROPERTIES = [
  "--ppbui-buff-strip-left",
  "--ppbui-buff-strip-top",
  "--ppbui-buff-strip-max-width",
  "--ppbui-buff-strip-max-height",
];

const SURFACE_INLINE_OVERRIDES = Object.freeze({
  margin: "0px",
  padding: "0px",
  border: "0px",
  background: "transparent",
  "box-shadow": "none",
  outline: "0px",
  "filter": "none",
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

export function mountBuffStrip(target) {
  const { strip, toolbar, list, ticker } = target;
  const doc = strip.ownerDocument;
  const win = doc.defaultView;
  const surfaceNodes = [strip, list, ticker];
  const originAnchor = doc.createComment("ppbui-buff-strip-origin");
  strip.before(originAnchor);
  let layerHost = null;
  const moveToToolbarLayer = () => {
    const host = toolbar.parentNode;
    if (!host || host === strip) return false;
    if (strip.parentNode !== host) host.insertBefore(strip, toolbar.nextSibling);
    layerHost = host;
    return true;
  };
  const previousMarker = strip.getAttribute("data-ppbui-buff-strip");
  const previousDock = strip.getAttribute("data-ppbui-buff-strip-dock");
  const previousLayout = strip.getAttribute("data-ppbui-buff-strip-layout");
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
  const restoreStripState = (targetStrip, targetList, targetTicker) => {
    if (!targetStrip) return;
    if (previousMarker === null) targetStrip.removeAttribute("data-ppbui-buff-strip");
    else targetStrip.setAttribute("data-ppbui-buff-strip", previousMarker);
    if (previousDock === null) targetStrip.removeAttribute("data-ppbui-buff-strip-dock");
    else targetStrip.setAttribute("data-ppbui-buff-strip-dock", previousDock);
    if (previousLayout === null) targetStrip.removeAttribute("data-ppbui-buff-strip-layout");
    else targetStrip.setAttribute("data-ppbui-buff-strip-layout", previousLayout);
    for (const [name, [value, priority]] of previousCustomProperties) {
      if (value) targetStrip.style.setProperty(name, value, priority);
      else targetStrip.style.removeProperty(name);
    }
    restoreSurfacePaint(targetStrip, previousSurfaceProperties.get(strip));
    restoreSurfacePaint(targetList, previousSurfaceProperties.get(list));
    restoreSurfacePaint(targetTicker, previousSurfaceProperties.get(ticker));
  };
  const claimSurfacePaint = () => {
    for (const node of surfaceNodes) {
      const ownedNames = Array.from(node.style).filter(isOwnedSurfaceProperty);
      const expectedNames = Object.keys(SURFACE_INLINE_OVERRIDES);
      const alreadyClaimed = Object.entries(SURFACE_INLINE_OVERRIDES).every(([name, value]) => (
        node.style.getPropertyValue(name) === value && node.style.getPropertyPriority(name) === "important"
      )) && ownedNames.length === expectedNames.length && expectedNames.every(name => ownedNames.includes(name));
      if (alreadyClaimed) continue;
      for (const name of Array.from(node.style).filter(isOwnedSurfaceProperty)) node.style.removeProperty(name);
      for (const [name, value] of Object.entries(SURFACE_INLINE_OVERRIDES)) {
        node.style.setProperty(name, value, "important");
      }
    }
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
      min-width:0 !important;
      max-width:var(--ppbui-buff-strip-max-width) !important;
      max-height:var(--ppbui-buff-strip-max-height) !important;
      box-sizing:border-box;
      margin:0 !important;
      align-items:center !important;
      padding:0 !important;
      border:0 !important;
      background:transparent !important;
      background-image:none !important;
      box-shadow:none !important;
      outline:0 !important;
      filter:none !important;
      backdrop-filter:none !important;
      border-radius:0 !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] *,
    .pokeidle-buff-strip[data-ppbui-buff-strip] > :is(.pokeidle-buff-list,.pokeidle-event-ticker) {
      box-sizing:border-box !important;
      margin:0 !important;
      padding:0 !important;
      border:0 !important;
      background:transparent !important;
      background-image:none !important;
      box-shadow:none !important;
      outline:0 !important;
      filter:none !important;
      backdrop-filter:none !important;
      border-radius:0 !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip]::before,
    .pokeidle-buff-strip[data-ppbui-buff-strip]::after,
    .pokeidle-buff-strip[data-ppbui-buff-strip] *::before,
    .pokeidle-buff-strip[data-ppbui-buff-strip] *::after,
    .pokeidle-buff-strip[data-ppbui-buff-strip] > .pokeidle-buff-list::before,
    .pokeidle-buff-strip[data-ppbui-buff-strip] > .pokeidle-buff-list::after,
    .pokeidle-buff-strip[data-ppbui-buff-strip] > .pokeidle-event-ticker::before,
    .pokeidle-buff-strip[data-ppbui-buff-strip] > .pokeidle-event-ticker::after {
      content:none !important;
      display:none !important;
      margin:0 !important;
      padding:0 !important;
      border:0 !important;
      background:none !important;
      box-shadow:none !important;
    }
    body.pokeidle-toolbar-bottom:not(.pokeidle-mobile) .pokeidle-buff-strip[data-ppbui-buff-strip] {
      top:var(--ppbui-buff-strip-top) !important;
      bottom:auto !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip][data-ppbui-buff-strip-layout="horizontal"] {
      display:flex !important;
      width:fit-content !important;
      height:auto !important;
      min-height:0 !important;
      gap:4px !important;
      overflow:visible !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip][data-ppbui-buff-strip-layout="horizontal"] > :is(.pokeidle-buff-list,.pokeidle-event-ticker) {
      display:flex !important;
      width:auto !important;
      height:auto !important;
      min-width:0 !important;
      min-height:0 !important;
      align-items:center !important;
      gap:4px !important;
      overflow:visible !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip][data-ppbui-buff-strip-layout="horizontal"][data-ppbui-buff-strip-dock="above"] {
      transform:translate(-50%,-100%) !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip][data-ppbui-buff-strip-layout="horizontal"][data-ppbui-buff-strip-dock="below"] {
      transform:translate(-50%,0) !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip][data-ppbui-buff-strip-layout="vertical"] {
      display:grid !important;
      width:var(--ppbui-buff-strip-max-width) !important;
      grid-template-columns:minmax(0,1fr) !important;
      align-content:start !important;
      align-items:stretch !important;
      gap:3px !important;
      overflow-x:hidden !important;
      overflow-y:auto !important;
      overscroll-behavior:contain !important;
      transform:none !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip][data-ppbui-buff-strip-layout="vertical"] > :is(.pokeidle-buff-list,.pokeidle-event-ticker) {
      display:grid !important;
      min-width:0 !important;
      grid-template-columns:minmax(0,1fr) !important;
      gap:3px !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip][hidden],
    .pokeidle-buff-strip[data-ppbui-buff-strip] > :is(.pokeidle-buff-list,.pokeidle-event-ticker)[hidden] {
      display:none !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-buff-pill,
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-event-ticker__pill {
      display:grid !important;
      grid-template-columns:minmax(0,1fr) auto auto !important;
      align-items:center !important;
      column-gap:5px !important;
      row-gap:0 !important;
      flex:0 1 auto !important;
      box-sizing:border-box !important;
      min-width:0 !important;
      max-width:180px !important;
      min-height:26px !important;
      padding:3px 7px !important;
      border:var(--ppbui-separator-width) solid var(--ppbui-border) !important;
      border-radius:var(--ppbui-control-radius) !important;
      background:var(--ppbui-bg-2) !important;
      background-image:none !important;
      box-shadow:none !important;
      outline:0 !important;
      filter:none !important;
      backdrop-filter:none !important;
      color:var(--ppbui-text) !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip][data-ppbui-buff-strip-layout="vertical"] :is(.pokeidle-buff-pill,.pokeidle-event-ticker__pill) {
      width:100% !important;
      max-width:none !important;
      min-height:30px !important;
      padding:4px 8px !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-event-ticker__pill {
      border-left:2px solid var(--ppbui-selected) !important;
      background:var(--ppbui-bg-3) !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-buff-pill span,
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-buff-pill b,
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-buff-pill time,
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-event-ticker__name,
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-event-ticker__effect,
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-event-ticker__time {
      min-width:0 !important;
      margin:0 !important;
      width:auto !important;
      text-align:left !important;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-buff-pill b,
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-event-ticker__effect {
      color:var(--ppbui-selected) !important;
      font-weight:700 !important;
      font-variant-numeric:tabular-nums;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-buff-pill time,
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-event-ticker__time {
      grid-column:auto !important;
      justify-self:end !important;
      color:var(--ppbui-text-muted) !important;
      font-size:var(--ppbui-font-size-meta) !important;
      font-variant-numeric:tabular-nums;
    }
  `;
  doc.head.append(style);
  strip.dataset.ppbuiBuffStrip = "";

  let lastExpandedLayout = null;
  let lastGeometrySignature = null;
  let dragFrame = null;
  let dragging = false;
  const setVariable = (name, value) => {
    if (strip.style.getPropertyValue(name) !== value) strip.style.setProperty(name, value);
  };
  const emitGeometryChange = () => {
    if (!win?.dispatchEvent || !win.CustomEvent) return;
    const rect = strip.getBoundingClientRect();
    const signature = [
      strip.dataset.ppbuiBuffStripLayout || "",
      strip.dataset.ppbuiBuffStripDock || "",
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
  const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
  const copyRect = rect => ({
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  });
  const toolbarLayout = () => {
    const currentOrientation = toolbar.getAttribute("data-ppbui-menu-orientation") === "vertical" ? "vertical" : "horizontal";
    const currentRect = toolbar.getBoundingClientRect();
    const valid = currentRect.width > 0 && currentRect.height > 0;
    const collapsed = toolbar.classList.contains("is-collapsed");
    if (!collapsed && valid) {
      lastExpandedLayout = { orientation: currentOrientation, rect: copyRect(currentRect) };
      return lastExpandedLayout;
    }
    if (collapsed && lastExpandedLayout) return lastExpandedLayout;
    return valid ? { orientation: currentOrientation, rect: copyRect(currentRect) } : null;
  };
  const measureRailHeight = (maxHeight, orientation) => {
    const measured = strip.getBoundingClientRect().height;
    if (measured > 0) return Math.min(measured, maxHeight);
    if (orientation === "horizontal") return Math.min(maxHeight, config.fallbackRailHeight);
    const pills = strip.querySelectorAll(".pokeidle-buff-pill,.pokeidle-event-ticker__pill").length;
    return Math.min(maxHeight, Math.max(config.fallbackRailHeight, pills * 33 + 8));
  };
  const sync = () => {
    if (!strip.isConnected || !toolbar.isConnected) return;
    if (!moveToToolbarLayer()) return;
    claimSurfacePaint();
    const layout = toolbarLayout();
    if (!layout) return;
    const { orientation, rect } = layout;
    const viewportWidth = doc.documentElement.clientWidth || win.innerWidth || rect.right;
    const viewportHeight = doc.documentElement.clientHeight || win.innerHeight || rect.bottom;
    const maxHeight = Math.max(0, viewportHeight - config.viewportMargin * 2);
    if (!(viewportWidth > 0 && viewportHeight > 0 && maxHeight > 0)) return;
    if (strip.dataset.ppbuiBuffStripLayout !== orientation) strip.dataset.ppbuiBuffStripLayout = orientation;
    setVariable("--ppbui-buff-strip-max-height", `${maxHeight}px`);

    if (orientation === "vertical") {
      const rightSpace = Math.max(0, viewportWidth - rect.right - config.sideGap - config.viewportMargin);
      const leftSpace = Math.max(0, rect.left - config.sideGap - config.viewportMargin);
      const dock = rightSpace >= config.verticalPreferredWidth || rightSpace >= leftSpace ? "right" : "left";
      const available = dock === "right" ? rightSpace : leftSpace;
      const viewportWidthLimit = Math.max(0, viewportWidth - config.viewportMargin * 2);
      const minimumWidth = Math.min(config.verticalMinimumWidth, viewportWidthLimit);
      const width = Math.min(config.verticalPreferredWidth, viewportWidthLimit, Math.max(minimumWidth, available));
      setVariable("--ppbui-buff-strip-max-width", `${width}px`);
      const height = measureRailHeight(maxHeight, orientation);
      const top = clamp(rect.top, config.viewportMargin, viewportHeight - config.viewportMargin - height);
      const rawLeft = dock === "right" ? rect.right + config.sideGap : rect.left - config.sideGap - width;
      const left = clamp(rawLeft, config.viewportMargin, viewportWidth - config.viewportMargin - width);
      if (strip.dataset.ppbuiBuffStripDock !== dock) strip.dataset.ppbuiBuffStripDock = dock;
      setVariable("--ppbui-buff-strip-left", `${Math.round(left)}px`);
      setVariable("--ppbui-buff-strip-top", `${Math.round(top)}px`);
      emitGeometryChange();
      return;
    }

    const maxWidth = Math.max(0, viewportWidth - config.viewportMargin * 2);
    setVariable("--ppbui-buff-strip-max-width", `${maxWidth}px`);
    const measuredWidth = strip.getBoundingClientRect().width;
    const width = Math.min(maxWidth, measuredWidth > 0 ? measuredWidth : config.fallbackHorizontalWidth);
    const height = measureRailHeight(maxHeight, orientation);
    const center = clamp(
      rect.left + rect.width / 2,
      config.viewportMargin + width / 2,
      viewportWidth - config.viewportMargin - width / 2,
    );
    const aboveSpace = rect.top - config.viewportMargin;
    const belowSpace = viewportHeight - rect.bottom - config.viewportMargin;
    const dock = aboveSpace >= height || aboveSpace >= belowSpace ? "above" : "below";
    let top;
    if (dock === "above") {
      top = Math.max(rect.top + config.aboveOverlap, config.viewportMargin + height);
    } else {
      top = Math.min(rect.bottom - config.belowOverlap, viewportHeight - config.viewportMargin - height);
      top = Math.max(config.viewportMargin, top);
    }
    if (strip.dataset.ppbuiBuffStripDock !== dock) strip.dataset.ppbuiBuffStripDock = dock;
    setVariable("--ppbui-buff-strip-left", `${Math.round(center)}px`);
    setVariable("--ppbui-buff-strip-top", `${Math.round(top)}px`);
    emitGeometryChange();
  };

  const onResize = () => sync();
  const onMenuState = event => {
    if (event.detail?.toolbar && event.detail.toolbar !== toolbar) return;
    sync();
  };
  const stopDrag = () => {
    if (!dragging) return;
    dragging = false;
    if (dragFrame !== null) win.cancelAnimationFrame?.(dragFrame);
    dragFrame = null;
    sync();
  };
  const dragTick = () => {
    if (!dragging) return;
    sync();
    dragFrame = win.requestAnimationFrame?.(dragTick) ?? null;
  };
  const onPointerDown = event => {
    if (!event.target?.closest?.(".pokeidle-pokehub__handle") || dragging) return;
    dragging = true;
    dragFrame = win.requestAnimationFrame?.(dragTick) ?? null;
  };
  win.addEventListener("resize", onResize);
  win.visualViewport?.addEventListener?.("resize", onResize);
  win.addEventListener(menuBarConfig.events.orientationChange, onMenuState);
  win.addEventListener(menuBarConfig.events.collapseChange, onMenuState);
  toolbar.addEventListener("pointerdown", onPointerDown, true);
  win.addEventListener("pointerup", stopDrag, true);
  win.addEventListener("pointercancel", stopDrag, true);
  win.addEventListener("blur", stopDrag);
  moveToToolbarLayer();
  sync();

  return {
    sync,
    isIntact: () => strip.isConnected && toolbar.isConnected && list.parentElement === strip && ticker.parentElement === strip &&
      style.isConnected && strip.parentNode === toolbar.parentNode,
    cleanup() {
      stopDrag();
      win.removeEventListener("resize", onResize);
      win.visualViewport?.removeEventListener?.("resize", onResize);
      win.removeEventListener(menuBarConfig.events.orientationChange, onMenuState);
      win.removeEventListener(menuBarConfig.events.collapseChange, onMenuState);
      toolbar.removeEventListener("pointerdown", onPointerDown, true);
      win.removeEventListener("pointerup", stopDrag, true);
      win.removeEventListener("pointercancel", stopDrag, true);
      win.removeEventListener("blur", stopDrag);
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
    },
  };
}
