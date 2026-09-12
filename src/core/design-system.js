const STYLE_SELECTOR = 'style[data-ppbui-design-system="1"]';

export function createDesignSystemRuntime({ cssText = "", document: targetDocument } = {}) {
  let style = null;
  let ownsStyle = false;

  return {
    mount() {
      const doc = targetDocument || globalThis.document;
      if (!doc?.head) throw new Error("document.head is not available");
      if (style?.isConnected) return style;

      const existing = doc.head.querySelector(STYLE_SELECTOR);
      if (existing) {
        style = existing;
        ownsStyle = false;
        return style;
      }

      style = doc.createElement("style");
      style.dataset.ppbuiDesignSystem = "1";
      style.textContent = String(cssText);
      doc.head.append(style);
      ownsStyle = true;
      return style;
    },

    unmount() {
      if (ownsStyle && style?.isConnected) style.remove();
      style = null;
      ownsStyle = false;
    },

    isMounted() {
      return Boolean(style?.isConnected);
    },
  };
}
