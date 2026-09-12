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
      width:max-content !important;
      min-width:0 !important;
      max-width:var(--ppbui-buff-strip-max-width) !important;
      box-sizing:border-box;
      margin:0 !important;
      transform:translate(-50%,-100%) !important;
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
    setVariable("--ppbui-buff-strip-top", `${Math.max(config.viewportMargin, rect.top - config.gap)}px`);
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
