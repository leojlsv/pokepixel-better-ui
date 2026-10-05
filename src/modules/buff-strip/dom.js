import { buffStripConfig as config } from "./config.js";

export function findBuffStripTarget(doc = document) {
  const strip = doc.querySelector(config.selectors.strip);
  const toolbar = doc.querySelector(config.selectors.toolbar);
  const list = strip?.querySelector(config.selectors.list);
  const ticker = strip?.querySelector(config.selectors.ticker);
  return strip && toolbar && list && ticker ? { strip, toolbar, list, ticker } : null;
}

export function buffStripText(doc = document) {
  const lang = (doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en").split(/[-_]/)[0];
  const copy = {
    pt: { name: "Barra de bônus", description: "Mantém bônus em um dock compacto que acompanha a orientação da menu bar." },
    en: { name: "Buff bar", description: "Keeps buffs in a compact dock that follows the menu bar orientation." },
    es: { name: "Barra de mejoras", description: "Mantiene las mejoras en un dock compacto que sigue la orientación del menú." },
    zh: { name: "增益栏", description: "将增益效果显示在随菜单栏方向调整的紧凑停靠栏中。" },
  };
  return copy[lang] || copy.en;
}
