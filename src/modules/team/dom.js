import { teamConfig as config } from "./config.js";

const copy = {
  pt: ["Equipe", "Acompanhar e montar a equipe", "Ativo", "Ações da equipe", "Derrotado", "Buscar", "Elemento", "Todos", "Raridade", "Limpar", "Nenhum Pokémon corresponde aos filtros."],
  en: ["Team", "Track and manage the team", "Active", "Team actions", "Fainted", "Search", "Element", "All", "Rarity", "Clear", "No Pokémon match the filters."],
  es: ["Equipo", "Seguir y gestionar el equipo", "Activo", "Acciones del equipo", "Derrotado", "Buscar", "Elemento", "Todos", "Rareza", "Limpiar", "Ningún Pokémon coincide con los filtros."],
  zh: ["队伍", "查看和管理队伍", "出战", "队伍操作", "已倒下", "搜索", "属性", "全部", "稀有度", "清除", "没有符合筛选条件的宝可梦。"],
};

export function teamText(doc = document) {
  const lang = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "pt";
  const [name, description, active, actions, fainted, search, element, all, rarity, clear, noResults] = copy[lang.split(/[-_]/)[0]] || copy.en;
  const remove = ({ pt: "Remover da equipe", en: "Remove from team", es: "Quitar del equipo", zh: "移出队伍" })[lang.split(/[-_]/)[0]] || "Remove from team";
  const position = ({ pt: "Posição", en: "Position", es: "Posición", zh: "位置" })[lang.split(/[-_]/)[0]] || "Position";
  return { position, remove, name, description, active, actions, fainted, search, element, all, rarity, clear, noResults };
}

export const findTeam = () => document.querySelector(config.selectors.root);

export function teamParts(root) {
  const q = config.selectors;
  return {
    body: root.querySelector(q.body),
    roster: root.querySelector(q.roster),
    slots: root.querySelector(q.slots),
    slotNodes: [...root.querySelectorAll(q.slot)],
    profile: root.querySelector(q.profile),
    active: root.querySelector(q.active),
    remove: root.querySelector(q.remove),
    profileInfo: root.querySelector(q.profileInfo),
    orderControls: root.querySelector(q.orderControls),
    orderLabel: root.querySelector(q.orderLabel),
    actions: root.querySelector(`${q.actions}:not([data-ppbui-module])`),
  };
}

export function equipPicker(doc = document) {
  const q = config.selectors, root = doc.querySelector(q.picker);
  return root && { root, body: root.querySelector(q.pickerBody), intro: root.querySelector(q.pickerIntro), grid: root.querySelector(q.pickerGrid), cards: [...root.querySelectorAll(q.pickerCard)] };
}

export function teamScene(root) {
  const view = root.ownerDocument.defaultView, body = teamParts(root).body;
  const cached = view?.PokeIdle?.ReactiveWindows?.cached?.();
  return [...(Array.isArray(cached) ? cached : []), view?.SceneManager?._scene]
    .find(scene => body && scene?._panel?.body === body && Array.isArray(scene?._creatures));
}

export function memberName(doc, member) {
  return doc.defaultView?.PokeIdle?.DittoDisplayName?.get?.(member)
    || member?.name || member?.species?.name || member?.species_id || "Pokémon";
}

export const hpPercent = member => Math.max(0, Math.min(100, Number(member?.max_hp) > 0 ? Math.round(Number(member.hp || 0) / Number(member.max_hp) * 100) : 0));
