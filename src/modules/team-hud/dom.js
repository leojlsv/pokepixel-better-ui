import { teamHudConfig as config } from "./config.js";

const copy = {
  pt: ["Team HUD", "HP e acesso por teclado nos slots compactos", "Derrotado"],
  en: ["Team HUD", "HP and keyboard access in compact team slots", "Fainted"],
  es: ["HUD del equipo", "PS y teclado en los espacios compactos", "Derrotado"],
  zh: ["队伍 HUD", "紧凑队伍栏的生命值与键盘操作", "已倒下"],
};

export function teamHudText(doc = document) {
  const lang = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "pt";
  const [name, description, fainted] = copy[lang.split(/[-_]/)[0]] || copy.en;
  return { name, description, fainted };
}

export const findTeamHud = () => document.querySelector(config.selectors.root);
export const hudParts = root => ({ list: root.querySelector(config.selectors.list), cards: [...root.querySelectorAll(config.selectors.card)] });

export function teamHudRuntime(root) {
  const runtime = root.ownerDocument.defaultView?.PokeIdle?.PersistentHud?._teamHud;
  return runtime?.el === root && Array.isArray(runtime?._creatures) ? runtime : null;
}

export function levelExperience(creature) {
  const total = Number(creature?.exp), start = Number(creature?.exp_current_level), end = Number(creature?.exp_next_level);
  if (![total, start, end].every(Number.isFinite) || end <= start) return null;
  const current = Math.max(0, Math.min(end - start, total - start)), required = end - start;
  return { current, required, percent: Math.max(0, Math.min(100, Math.floor(current / required * 100))) };
}

export function cardFacts(card) {
  const q = config.selectors;
  return {
    name: card.querySelector(q.name)?.textContent.trim() || card.title || "Pokémon",
    level: card.querySelector(q.level)?.textContent.trim() || "",
    hp: card.querySelector(q.hp)?.textContent.trim() || "",
  };
}
