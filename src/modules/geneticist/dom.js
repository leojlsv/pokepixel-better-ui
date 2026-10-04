const ROOT_SELECTOR = ".npc-iv-window";

const copy = {
  pt: ["Geneticista", "Seleção compacta para extração e fluxo sem animação."],
  en: ["Geneticist", "Compact extraction selection with a motion-free result flow."],
  es: ["Genetista", "Selección compacta para extracción y flujo sin animación."],
  zh: ["遗传专家", "紧凑的提取选择与无动画结果流程。"],
};

export function geneticistText(doc = document) {
  const lang = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en";
  const [name, description] = copy[lang.split(/[-_]/)[0]] || copy.en;
  return { name, description };
}

export function findGeneticist(doc = document) {
  const body = doc.defaultView?.PokeIdle?.NPC?.panel?.body;
  const root = body?.closest?.(ROOT_SELECTOR);
  return root?.ownerDocument === doc ? root : null;
}

export function nativeText(root, key, fallback) {
  const value = root?.ownerDocument?.defaultView?.PokeIdle?.t?.(key);
  return String(value && value !== key ? value : fallback || "").trim();
}

export function primaryTabs(root) {
  return root ? [...root.querySelectorAll(".npc-iv__primary-tabs > .npc-shop__tab")] : [];
}

export function tabByLabel(root, label) {
  return primaryTabs(root).find(button => button.textContent.trim() === label) || null;
}
