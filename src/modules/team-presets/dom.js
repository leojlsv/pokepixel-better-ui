import { teamPresetsConfig as config } from "./config.js";

const sharedErrors = {
  "team-panel-unavailable": "Could not open the Team window.",
  "preset-invalid": "The saved preset is invalid.",
  "order-unverified": "Review the saved battle order before applying this legacy preset.",
  "member-unavailable": "A Pokémon from this team is no longer available.",
  "leader-fainted": "The active Pokémon in this preset is fainted.",
  "leader-transition-unavailable": "No living Pokémon is available to complete the active Pokémon change.",
  "team-slot-unavailable": "A Team slot became unavailable while applying the preset.",
  "remove-action-unavailable": "Removal was blocked by the game.",
  "equip-picker-unavailable": "Could not open Add Pokémon.",
  "picker-member-unavailable": "The Pokémon is unavailable in the add picker.",
  "leader-action-unavailable": "Changing the active Pokémon was blocked by the game.",
  "order-action-unavailable": "The native Battle order control is unavailable.",
  "action-timeout": "The game did not confirm one of the changes in time.",
  "final-state-mismatch": "The final Team does not match the saved preset.",
  "order-final-state-mismatch": "The final Battle order does not match the saved preset.",
  busy: "Another Team operation is already in progress.",
};

const copies = {
  pt: {
    name: "Times preset", description: "Salva composição, ativo e ordem oficial do Team usando os controles nativos.",
    toggle: "Times", manage: "Gerenciar", savedTeams: "Times salvos", presetName: "Nome do time", save: "Salvar atual", apply: "Aplicar", update: "Atualizar atual", remove: "Excluir", confirmOrder: "Confirmar ordem",
    empty: "Nenhum time salvo.", nameRequired: "Informe um nome para o time.", teamUnavailable: "O Team atual não está disponível.", saved: "Time salvo.", updated: "Time atualizado.", applying: "Aplicando time...", applied: "Time aplicado.", deleteConfirm: "Excluir este time salvo?",
    sessionOnly: "O navegador bloqueou o armazenamento. Os times valem apenas nesta sessão.", orderReview: "Ordem antiga: revise ou atualize antes de aplicar.", active: "Ativo", setActive: "Definir como ativo", moveLeft: "Mover para a esquerda", moveRight: "Mover para a direita", moveUp: "Mover time para cima", moveDown: "Mover time para baixo",
    errors: {
      ...sharedErrors,
      "team-panel-unavailable": "Não foi possível abrir a janela Team.", "preset-invalid": "O preset salvo é inválido.", "order-unverified": "Revise a ordem de batalha deste preset antigo antes de aplicar.",
      "member-unavailable": "Um Pokémon deste time não está mais disponível.", "leader-fainted": "O Pokémon ativo deste preset está derrotado.", "leader-transition-unavailable": "Não há um Pokémon vivo disponível para concluir a troca do ativo.",
      "team-slot-unavailable": "Um slot do Team ficou indisponível durante a aplicação.", "remove-action-unavailable": "A remoção foi bloqueada pelo jogo.", "equip-picker-unavailable": "Não foi possível abrir Adicionar Pokémon.",
      "picker-member-unavailable": "O Pokémon não está disponível no seletor de adição.", "leader-action-unavailable": "A troca do Pokémon ativo foi bloqueada pelo jogo.", "order-action-unavailable": "O controle nativo de Battle order não está disponível.",
      "action-timeout": "O jogo não confirmou uma das alterações a tempo.", "final-state-mismatch": "O Team final não corresponde ao preset salvo.", "order-final-state-mismatch": "A Battle order final não corresponde ao preset salvo.", busy: "Outra operação de Team já está em andamento.",
    },
  },
  en: {
    name: "Team presets", description: "Saves composition, active Pokémon and official Team order using native controls.",
    toggle: "Teams", manage: "Manage", savedTeams: "Saved teams", presetName: "Team name", save: "Save current", apply: "Apply", update: "Update current", remove: "Delete", confirmOrder: "Confirm order",
    empty: "No saved teams.", nameRequired: "Enter a team name.", teamUnavailable: "The current Team is unavailable.", saved: "Team saved.", updated: "Team updated.", applying: "Applying team...", applied: "Team applied.", deleteConfirm: "Delete this saved team?",
    sessionOnly: "Browser storage is unavailable. Teams will last only for this session.", orderReview: "Legacy order: review or update before applying.", active: "Active", setActive: "Set active", moveLeft: "Move left", moveRight: "Move right", moveUp: "Move team up", moveDown: "Move team down", errors: sharedErrors,
  },
  es: {
    name: "Equipos predefinidos", description: "Guarda composición, Pokémon activo y orden oficial usando controles nativos.", toggle: "Equipos", manage: "Gestionar", savedTeams: "Equipos guardados", presetName: "Nombre del equipo", save: "Guardar actual", apply: "Aplicar", update: "Actualizar actual", remove: "Eliminar", confirmOrder: "Confirmar orden", empty: "No hay equipos guardados.", nameRequired: "Indica un nombre para el equipo.", teamUnavailable: "El Team actual no está disponible.", saved: "Equipo guardado.", updated: "Equipo actualizado.", applying: "Aplicando equipo...", applied: "Equipo aplicado.", deleteConfirm: "¿Eliminar este equipo guardado?", sessionOnly: "El almacenamiento del navegador no está disponible. Los equipos durarán solo esta sesión.", orderReview: "Orden antiguo: revísalo o actualízalo antes de aplicar.", active: "Activo", setActive: "Definir activo", moveLeft: "Mover a la izquierda", moveRight: "Mover a la derecha", moveUp: "Mover equipo arriba", moveDown: "Mover equipo abajo", errors: sharedErrors,
  },
  zh: {
    name: "队伍预设", description: "使用原生控件保存阵容、当前出战宝可梦和官方队伍顺序。", toggle: "队伍", manage: "管理", savedTeams: "已保存队伍", presetName: "队伍名称", save: "保存当前", apply: "应用", update: "更新当前", remove: "删除", confirmOrder: "确认顺序", empty: "没有已保存的队伍。", nameRequired: "请输入队伍名称。", teamUnavailable: "当前队伍不可用。", saved: "队伍已保存。", updated: "队伍已更新。", applying: "正在应用队伍...", applied: "队伍已应用。", deleteConfirm: "删除这个已保存的队伍？", sessionOnly: "浏览器存储不可用。队伍仅在本次会话中保留。", orderReview: "旧顺序：应用前请检查或更新。", active: "出战", setActive: "设为出战", moveLeft: "向左移动", moveRight: "向右移动", moveUp: "队伍上移", moveDown: "队伍下移", errors: sharedErrors,
  },
};

export function teamPresetsText(doc = document) {
  const locale = String(doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en").toLowerCase();
  const base = locale.startsWith("pt") ? copies.pt : locale.startsWith("es") ? copies.es : locale.startsWith("zh") ? copies.zh : copies.en;
  return { ...base, errors: { ...sharedErrors, ...base.errors } };
}

export const findTeamHud = (doc = document) => doc.querySelector(config.selectors.hud);
const idsEqual = (left, right) => left.length === right.length && left.every(id => right.includes(id));

function teamStateSources(doc) {
  const view = doc?.defaultView, cached = view?.PokeIdle?.ReactiveWindows?.cached?.(), runtime = view?.PokeIdle?.PersistentHud?._teamHud;
  const scenes = [...(Array.isArray(cached) ? cached : []), view?.SceneManager?._scene].filter(Boolean), bodies = new Set();
  doc?.querySelectorAll(config.selectors.teamPanel).forEach(panel => { const body = panel.querySelector(config.selectors.teamBody); if (body) bodies.add(body); });
  const linked = scenes.filter(scene => bodies.has(scene?._panel?.body)), rest = scenes.filter(scene => !bodies.has(scene?._panel?.body));
  return [...new Set([...linked, runtime, ...rest].filter(Boolean))];
}

export function canonicalTeamState(doc, memberIds) {
  const wanted = memberIds.map(String);
  for (const source of teamStateSources(doc)) {
    const order = Array.isArray(source?._team?.member_ids) ? source._team.member_ids.map(String).filter(Boolean) : [];
    if (!order.length || !idsEqual(order, wanted)) continue;
    const activeId = String(source?._team?.leader_id ?? "");
    return { order, activeId: order.includes(activeId) ? activeId : "" };
  }
  return null;
}

function spriteFor(card, creature) {
  return String(card?.querySelector("img[src]")?.src || creature?.sprite_url || creature?.sprite || creature?.species?.sprite_url || creature?.species?.sprite || "").trim();
}

export function currentTeamSnapshot(root) {
  const doc = root?.ownerDocument, runtime = doc?.defaultView?.PokeIdle?.PersistentHud?._teamHud;
  if (!runtime || runtime.el !== root || !Array.isArray(runtime._creatures) || !runtime._creatures.length) return null;
  const cards = [...root.querySelectorAll(config.selectors.hudCard)], meta = new Map();
  for (const creature of runtime._creatures) {
    const id = String(creature?.id ?? ""); if (!id) continue;
    const card = cards.find(node => node.dataset.creatureId === id);
    const member = { id, name: String(creature?.name || creature?.species?.name || card?.querySelector(config.selectors.hudCardName)?.textContent || id).trim() };
    const sprite = spriteFor(card, creature); if (sprite) member.sprite = sprite;
    const level = Number(creature?.level); if (Number.isFinite(level)) member.level = level;
    meta.set(id, member);
  }
  const hudOrder = runtime._creatures.map(creature => String(creature?.id ?? "")).filter(id => meta.has(id));
  if (!hudOrder.length) return null;
  const canonical = canonicalTeamState(doc, hudOrder), order = canonical?.order || hudOrder;
  const runtimeActive = String(runtime._creatures.find(creature => creature?.is_leader)?.id ?? "");
  const activeId = canonical?.activeId || (order.includes(runtimeActive) ? runtimeActive : order[0]);
  return { members: order.map(id => meta.get(id)).filter(Boolean), activeId, orderVerified: Boolean(canonical) };
}
