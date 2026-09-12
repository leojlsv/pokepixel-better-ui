import { buffStripConfig as config } from "./config.js";

const CUSTOM_PROPERTIES = [
  "--ppbui-buff-strip-left",
  "--ppbui-buff-strip-top",
  "--ppbui-buff-strip-max-width",
];

export function mountBuffStrip(target) {
  const { strip, toolbar, list } = target;
  const doc = strip.ownerDocument;
  const win = doc.defaultView;
  const previousMarker = strip.getAttribute("data-ppbui-buff-strip");
  const previousCustomProperties = new Map(CUSTOM_PROPERTIES.map(name => [
    name,
    [strip.style.getPropertyValue(name), strip.style.getPropertyPriority(name)],
  ]));
  const style = doc.createElement("style");
  style.dataset.ppbuiStyle = config.id;
  style.textContent = `
    .pokeidle-buff-strip[data-ppbui-buff-strip] {
      position:fixed !important;
      left:var(--ppbui-buff-strip-left) !important;
      top:var(--ppbui-buff-strip-top) !important;
      right:auto !important;
      bottom:auto !important;
      width:fit-content !important;
      min-width:0 !important;
      max-width:var(--ppbui-buff-strip-max-width) !important;
      box-sizing:border-box;
      margin:0 !important;
      transform:translate(-50%,-100%) !important;
      align-items:center !important;
      gap:0 !important;
      padding:4px 7px 3px !important;
      border-bottom:0 !important;
      border-radius:4px 4px 0 0 !important;
      box-shadow:none !important;
      backdrop-filter:none !important;
      overflow:hidden;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-buff-pill,
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-event-ticker__pill {
      display:grid !important;
      grid-template-columns:minmax(0,auto) auto auto !important;
      place-content:center !important;
      align-items:center !important;
      column-gap:4px !important;
      row-gap:0 !important;
      flex:1 1 0 !important;
      min-width:0 !important;
      max-width:160px !important;
      min-height:22px !important;
      padding:2px 8px !important;
      border-left:1px solid rgba(217,184,114,.18) !important;
    }
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-buff-list > .pokeidle-buff-pill:first-child {
      border-left:0 !important;
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
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-buff-pill time,
    .pokeidle-buff-strip[data-ppbui-buff-strip] .pokeidle-event-ticker__time {
      grid-column:auto !important;
      font-size:8px !important;
    }
  `;
  doc.head.append(style);
  strip.dataset.ppbuiBuffStrip = "";

  const setVariable = (name, value) => {
    if (strip.style.getPropertyValue(name) !== value) strip.style.setProperty(name, value);
  };
  const sync = () => {
    if (!strip.isConnected || !toolbar.isConnected) return;
    const rect = toolbar.getBoundingClientRect();
    if (!(rect.width > 0)) return;
    const viewportWidth = doc.documentElement.clientWidth || win.innerWidth || rect.width;
    const maxWidth = Math.max(0, Math.min(rect.width, viewportWidth - config.viewportMargin * 2));
    setVariable("--ppbui-buff-strip-left", `${rect.left + rect.width / 2}px`);
    setVariable("--ppbui-buff-strip-top", `${Math.max(config.viewportMargin, rect.top + config.overlap)}px`);
    setVariable("--ppbui-buff-strip-max-width", `${maxWidth}px`);
  };

  const onResize = () => sync();
  win.addEventListener("resize", onResize);
  win.visualViewport?.addEventListener?.("resize", onResize);
  sync();

  return {
    sync,
    isIntact: () => strip.isConnected && toolbar.isConnected && list.parentElement === strip && style.isConnected,
    cleanup() {
      win.removeEventListener("resize", onResize);
      win.visualViewport?.removeEventListener?.("resize", onResize);
      style.remove();
      if (previousMarker === null) strip.removeAttribute("data-ppbui-buff-strip");
      else strip.setAttribute("data-ppbui-buff-strip", previousMarker);
      for (const [name, [value, priority]] of previousCustomProperties) {
        if (value) strip.style.setProperty(name, value, priority);
        else strip.style.removeProperty(name);
      }
    },
  };
}
