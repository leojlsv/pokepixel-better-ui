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
    pt: { name: "Barra de bônus", description: "Mantém os bônus visíveis em uma faixa compacta acima do menu." },
    en: { name: "Buff bar", description: "Keeps buffs visible in a compact strip above the toolbar." },
    es: { name: "Barra de mejoras", description: "Mantiene las mejoras visibles en una franja compacta sobre el menú." },
    zh: { name: "增益栏", description: "将增益效果以紧凑条形显示在菜单栏上方。" },
  };
  return copy[lang] || copy.en;
}
