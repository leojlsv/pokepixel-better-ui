import { teamHudConfig as config } from "./config.js";

const copy = {
  pt: ["Team HUD", "HP e acesso por teclado nos slots compactos", "Derrotado", "Ativo"],
  en: ["Team HUD", "HP and keyboard access in compact team slots", "Fainted", "Active"],
  es: ["HUD del equipo", "PS y teclado en los espacios compactos", "Derrotado", "Activo"],
  zh: ["队伍 HUD", "紧凑队伍栏的生命值与键盘操作", "已倒下", "出战"],
};

export function teamHudText(doc = document) {
  const lang = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "pt";
  const [name, description, fainted, active] = copy[lang.split(/[-_]/)[0]] || copy.en;
  return { name, description, fainted, active };
}

export const findTeamHud = () => document.querySelector(config.selectors.root);
export const hudParts = root => ({ list: root.querySelector(config.selectors.list), cards: [...root.querySelectorAll(config.selectors.card)] });

export function teamHudRuntime(root) {
  const runtime = root.ownerDocument.defaultView?.PokeIdle?.PersistentHud?._teamHud;
  return runtime?.el === root && Array.isArray(runtime?._creatures) ? runtime : null;
}

export function teamHudOfficialOrder(root) {
  const runtime = teamHudRuntime(root), ids = (runtime?._creatures || []).map(creature => String(creature?.id ?? "")).filter(Boolean);
  if (!ids.length) return [];
  const doc = root.ownerDocument, wanted = new Set(ids), view = doc.defaultView, cached = view?.PokeIdle?.ReactiveWindows?.cached?.();
  const scenes = [...(Array.isArray(cached) ? cached : []), view?.SceneManager?._scene].filter(Boolean), bodies = new Set();
  doc.querySelectorAll(config.selectors.teamPanel).forEach(panel => { const body = panel.querySelector(config.selectors.teamBody); if (body) bodies.add(body); });
  const linked = scenes.filter(scene => bodies.has(scene?._panel?.body)), rest = scenes.filter(scene => !bodies.has(scene?._panel?.body));
  const sources = [...new Set([...linked, runtime, ...rest].filter(Boolean))];
  for (const source of sources) {
    const order = Array.isArray(source?._team?.member_ids) ? source._team.member_ids.map(String).filter(Boolean) : [];
    if (order.length !== ids.length || order.some(id => !wanted.has(id))) continue;
    return order;
  }
  return ids;
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
