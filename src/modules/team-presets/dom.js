import { teamPresetsConfig as config } from "./config.js";

const copies = {
  pt: {
    name: "Times preset",
    description: "Salva e aplica composições do Team pelo HUD usando os controles nativos.",
    toggle: "Times",
    presetName: "Nome do time",
    save: "Salvar atual",
    apply: "Aplicar",
    remove: "Excluir",
    empty: "Nenhum time salvo.",
    nameRequired: "Informe um nome para o time.",
    teamUnavailable: "O Team atual não está disponível.",
    saved: "Time salvo.",
    updated: "Time atualizado.",
    applying: "Aplicando time...",
    applied: "Time aplicado.",
    deleteConfirm: "Excluir este time salvo?",
    sessionOnly: "O navegador bloqueou o armazenamento. Os times valem apenas nesta sessão.",
    errors: {
      "team-panel-unavailable": "Não foi possível abrir a janela Team.",
      "preset-invalid": "O preset salvo é inválido.",
      "member-unavailable": "Um Pokémon deste time não está mais disponível.",
      "leader-fainted": "O Pokémon ativo deste preset está derrotado.",
      "leader-transition-unavailable": "Não há um Pokémon vivo disponível para concluir a troca do líder.",
      "team-slot-unavailable": "Um slot do Team ficou indisponível durante a aplicação.",
      "remove-action-unavailable": "A remoção foi bloqueada pelo jogo.",
      "equip-picker-unavailable": "Não foi possível abrir Adicionar Pokémon.",
      "picker-member-unavailable": "O Pokémon não está disponível no seletor de adição.",
      "leader-action-unavailable": "A troca do Pokémon ativo foi bloqueada pelo jogo.",
      "action-timeout": "O jogo não confirmou uma das alterações a tempo.",
      "final-state-mismatch": "O Team final não corresponde ao preset salvo.",
    },
  },
  en: {
    name: "Team presets",
    description: "Saves and applies Team compositions from the HUD using native controls.",
    toggle: "Teams",
    presetName: "Team name",
    save: "Save current",
    apply: "Apply",
    remove: "Delete",
    empty: "No saved teams.",
    nameRequired: "Enter a team name.",
    teamUnavailable: "The current Team is unavailable.",
    saved: "Team saved.",
    updated: "Team updated.",
    applying: "Applying team...",
    applied: "Team applied.",
    deleteConfirm: "Delete this saved team?",
    sessionOnly: "Browser storage is unavailable. Teams will last only for this session.",
    errors: {
      "team-panel-unavailable": "Could not open the Team window.",
      "preset-invalid": "The saved preset is invalid.",
      "member-unavailable": "A Pokémon from this team is no longer available.",
      "leader-fainted": "The active Pokémon in this preset is fainted.",
      "leader-transition-unavailable": "No living Pokémon is available to complete the leader change.",
      "team-slot-unavailable": "A Team slot became unavailable while applying the preset.",
      "remove-action-unavailable": "Removal was blocked by the game.",
      "equip-picker-unavailable": "Could not open Add Pokémon.",
      "picker-member-unavailable": "The Pokémon is unavailable in the add picker.",
      "leader-action-unavailable": "Changing the active Pokémon was blocked by the game.",
      "action-timeout": "The game did not confirm one of the changes in time.",
      "final-state-mismatch": "The final Team does not match the saved preset.",
    },
  },
  es: {
    name: "Equipos predefinidos",
    description: "Guarda y aplica composiciones del Team desde el HUD usando controles nativos.",
    toggle: "Equipos",
    presetName: "Nombre del equipo",
    save: "Guardar actual",
    apply: "Aplicar",
    remove: "Eliminar",
    empty: "No hay equipos guardados.",
    nameRequired: "Indica un nombre para el equipo.",
    teamUnavailable: "El Team actual no está disponible.",
    saved: "Equipo guardado.",
    updated: "Equipo actualizado.",
    applying: "Aplicando equipo...",
    applied: "Equipo aplicado.",
    deleteConfirm: "¿Eliminar este equipo guardado?",
    sessionOnly: "El almacenamiento del navegador no está disponible. Los equipos durarán solo esta sesión.",
    errors: {},
  },
  zh: {
    name: "队伍预设",
    description: "从 HUD 保存并通过原生控件应用队伍组合。",
    toggle: "队伍",
    presetName: "队伍名称",
    save: "保存当前",
    apply: "应用",
    remove: "删除",
    empty: "没有已保存的队伍。",
    nameRequired: "请输入队伍名称。",
    teamUnavailable: "当前队伍不可用。",
    saved: "队伍已保存。",
    updated: "队伍已更新。",
    applying: "正在应用队伍...",
    applied: "队伍已应用。",
    deleteConfirm: "删除这个已保存的队伍？",
    sessionOnly: "浏览器存储不可用。队伍仅在本次会话中保留。",
    errors: {},
  },
};

export function teamPresetsText(doc = document) {
  const locale = String(doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en").toLowerCase();
  const base = locale.startsWith("pt") ? copies.pt : locale.startsWith("es") ? copies.es : locale.startsWith("zh") ? copies.zh : copies.en;
  return { ...base, errors: { ...copies.en.errors, ...base.errors } };
}

export const findTeamHud = (doc = document) => doc.querySelector(config.selectors.hud);

export function currentTeamSnapshot(root) {
  const runtime = root?.ownerDocument?.defaultView?.PokeIdle?.PersistentHud?._teamHud;
  if (!runtime || runtime.el !== root || !Array.isArray(runtime._creatures) || !runtime._creatures.length) return null;
  const cards = [...root.querySelectorAll(config.selectors.hudCard)];
  const members = runtime._creatures.map(creature => {
    const id = String(creature?.id ?? "");
    const card = cards.find(node => node.dataset.creatureId === id);
    const name = String(creature?.name || creature?.species?.name || card?.querySelector(".pokeidle-team-card__name")?.textContent || id).trim();
    return { id, name };
  }).filter(member => member.id);
  if (!members.length) return null;
  const leader = runtime._creatures.find(creature => creature?.is_leader);
  const leaderId = String(leader?.id ?? members[0].id);
  return { members, leaderId: members.some(member => member.id === leaderId) ? leaderId : members[0].id };
}
