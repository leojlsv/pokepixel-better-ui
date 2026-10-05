import { teamPresetsConfig as config } from "./config.js";

const sharedErrors = {
  "confirmation-unavailable": "The game confirmation dialog is unavailable. Please try again.",
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
    toggle: "Formações de time", savedCount: count => `${count} ${count === 1 ? "salva" : "salvas"}`, manage: "Gerenciar", savedTeams: "Times salvos", profileTeamsEmpty: "Este Pokémon não participa de nenhum time salvo.", presetName: "Nome do time", save: "Salvar atual", apply: "Aplicar", update: "Atualizar time salvo", remove: "Excluir", confirmOrder: "Confirmar ordem",
    empty: "Nenhum time salvo.", nameRequired: "Informe um nome para o time.", renameFailed: "Não foi possível renomear o time salvo.", updateFailed: "Não foi possível atualizar o time salvo.", teamUnavailable: "O Team atual não está disponível.", saved: "Time salvo.", updated: "Time salvo atualizado.", updating: "Atualizando...", applying: "Aplicando time...", applyingAction: "Aplicando...", applied: "Time aplicado.", deleteConfirm: "Excluir este time salvo?", selected: "Selecionado",
    sessionOnly: "O navegador bloqueou o armazenamento. Os times valem apenas nesta sessão.", orderReview: "Ordem antiga: revise ou atualize antes de aplicar.", active: "Ativo", setActive: "Definir como ativo", moveLeft: "Mover para a esquerda", moveRight: "Mover para a direita", moveUp: "Mover time para cima", moveDown: "Mover time para baixo",
    createManual: "Criar time", editManual: "Editar", manualTitle: "Montar time da Backpack + Team", editManualTitle: "Editar time salvo", manualHint: "Montar e salvar aqui não altera o Team atual. O Team só muda ao usar Aplicar em um time salvo.", backpack: "Backpack + Team", search: "Buscar", element: "Elemento", rarity: "Raridade", all: "Todos", clear: "Limpar", saveManual: "Salvar time", saveChanges: "Salvar alterações", cancel: "Cancelar", removeMember: "Remover", refreshBackpack: "Atualizar Pokémon", loadingBackpack: "Carregando Pokémon...", backpackLoadFailed: "Não foi possível carregar os Pokémon da Backpack e do Team.", backpackSelectionUpdated: "Disponibilidade atualizada. Pokémon indisponíveis foram removidos da montagem.", noBackpackPokemon: "Nenhum Pokémon disponível na Backpack ou no Team.", noBackpackResults: "Nenhum Pokémon disponível corresponde aos filtros.", chooseMembers: "Selecione de 1 a 6 Pokémon.", manualSaved: "Time criado.", manualUpdated: "Time salvo editado.", collapseTeam: "Recolher time", expandTeam: "Expandir time", teamFull: "O time já tem 6 Pokémon.",
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
    toggle: "Team formations", savedCount: count => `${count} saved`, manage: "Manage", savedTeams: "Saved teams", profileTeamsEmpty: "This Pokémon is not part of any saved team.", presetName: "Team name", save: "Save current", apply: "Apply", update: "Update saved team", remove: "Delete", confirmOrder: "Confirm order",
    empty: "No saved teams.", nameRequired: "Enter a team name.", renameFailed: "Could not rename the saved team.", updateFailed: "Could not update the saved team.", teamUnavailable: "The current Team is unavailable.", saved: "Team saved.", updated: "Saved team updated.", updating: "Updating...", applying: "Applying team...", applyingAction: "Applying...", applied: "Team applied.", deleteConfirm: "Delete this saved team?", selected: "Selected",
    sessionOnly: "Browser storage is unavailable. Teams will last only for this session.", orderReview: "Legacy order: review or update before applying.", active: "Active", setActive: "Set active", moveLeft: "Move left", moveRight: "Move right", moveUp: "Move team up", moveDown: "Move team down", createManual: "Create team", editManual: "Edit", manualTitle: "Build team from Backpack + Team", editManualTitle: "Edit saved team", manualHint: "Building and saving here does not change the current Team. The Team changes only when you Apply a saved team.", backpack: "Backpack + Team", search: "Search", element: "Element", rarity: "Rarity", all: "All", clear: "Clear", saveManual: "Save team", saveChanges: "Save changes", cancel: "Cancel", removeMember: "Remove", refreshBackpack: "Refresh Pokémon", loadingBackpack: "Loading Pokémon...", backpackLoadFailed: "Could not load Backpack and Team Pokémon.", backpackSelectionUpdated: "Availability refreshed. Unavailable Pokémon were removed from the draft.", noBackpackPokemon: "No Pokémon are available in Backpack or Team.", noBackpackResults: "No available Pokémon match the filters.", chooseMembers: "Select 1 to 6 Pokémon.", manualSaved: "Team created.", manualUpdated: "Saved team edited.", collapseTeam: "Collapse team", expandTeam: "Expand team", teamFull: "The team already has 6 Pokémon.", errors: sharedErrors,
  },
  es: {
    name: "Equipos predefinidos", description: "Guarda composición, Pokémon activo y orden oficial usando controles nativos.", toggle: "Formaciones", savedCount: count => `${count} ${count === 1 ? "guardada" : "guardadas"}`, manage: "Gestionar", savedTeams: "Equipos guardados", profileTeamsEmpty: "Este Pokémon no participa en ningún equipo guardado.", presetName: "Nombre del equipo", save: "Guardar actual", apply: "Aplicar", update: "Actualizar equipo guardado", remove: "Eliminar", confirmOrder: "Confirmar orden", empty: "No hay equipos guardados.", nameRequired: "Indica un nombre para el equipo.", renameFailed: "No se pudo renombrar el equipo guardado.", updateFailed: "No se pudo actualizar el equipo guardado.", teamUnavailable: "El Team actual no está disponible.", saved: "Equipo guardado.", updated: "Equipo guardado actualizado.", updating: "Actualizando...", applying: "Aplicando equipo...", applyingAction: "Aplicando...", applied: "Equipo aplicado.", deleteConfirm: "¿Eliminar este equipo guardado?", sessionOnly: "El almacenamiento del navegador no está disponible. Los equipos durarán solo en esta sesión.", orderReview: "Orden antiguo: revísalo o actualízalo antes de aplicar.", active: "Activo", selected: "Seleccionado", setActive: "Definir activo", moveLeft: "Mover a la izquierda", moveRight: "Mover a la derecha", moveUp: "Mover equipo arriba", moveDown: "Mover equipo abajo", createManual: "Crear equipo", editManual: "Editar", manualTitle: "Montar equipo desde Backpack + Team", editManualTitle: "Editar equipo guardado", manualHint: "Montar y guardar aquí no cambia el Team actual. El Team solo cambia al usar Aplicar en un equipo guardado.", backpack: "Backpack + Team", search: "Buscar", element: "Elemento", rarity: "Rareza", all: "Todos", clear: "Limpiar", saveManual: "Guardar equipo", saveChanges: "Guardar cambios", cancel: "Cancelar", removeMember: "Quitar", refreshBackpack: "Actualizar Pokémon", loadingBackpack: "Cargando Pokémon...", backpackLoadFailed: "No se pudieron cargar los Pokémon de Backpack y Team.", backpackSelectionUpdated: "Disponibilidad actualizada. Los Pokémon no disponibles se quitaron del borrador.", noBackpackPokemon: "No hay Pokémon disponibles en Backpack ni Team.", noBackpackResults: "Ningún Pokémon disponible coincide con los filtros.", chooseMembers: "Selecciona de 1 a 6 Pokémon.", manualSaved: "Equipo creado.", manualUpdated: "Equipo guardado editado.", collapseTeam: "Contraer equipo", expandTeam: "Expandir equipo", teamFull: "El equipo ya tiene 6 Pokémon.", errors: sharedErrors,
  },
  zh: {
    name: "队伍预设", description: "使用原生控件保存阵容、当前出战宝可梦和官方队伍顺序。", toggle: "队伍阵容", savedCount: count => `已保存 ${count}`, manage: "管理", savedTeams: "已保存队伍", profileTeamsEmpty: "这只宝可梦不属于任何已保存队伍。", presetName: "队伍名称", save: "保存当前", apply: "应用", update: "更新已保存队伍", remove: "删除", confirmOrder: "确认顺序", empty: "没有已保存的队伍。", nameRequired: "请输入队伍名称。", renameFailed: "无法重命名已保存队伍。", updateFailed: "无法更新已保存队伍。", teamUnavailable: "当前队伍不可用。", saved: "队伍已保存。", updated: "已保存队伍已更新。", updating: "正在更新...", applying: "正在应用队伍...", applyingAction: "正在应用...", applied: "队伍已应用。", deleteConfirm: "删除这个已保存的队伍？", sessionOnly: "浏览器存储不可用。队伍仅在本次会话中保留。", orderReview: "旧顺序：应用前请检查或更新。", active: "出战", selected: "已选择", setActive: "设为出战", moveLeft: "向左移动", moveRight: "向右移动", moveUp: "队伍上移", moveDown: "队伍下移", createManual: "创建队伍", editManual: "编辑", manualTitle: "从 Backpack + Team 组建队伍", editManualTitle: "编辑已保存队伍", manualHint: "在这里组建并保存不会改变当前 Team；只有对已保存队伍使用“应用”时才会更改 Team。", backpack: "Backpack + Team", search: "搜索", element: "属性", rarity: "稀有度", all: "全部", clear: "清除", saveManual: "保存队伍", saveChanges: "保存更改", cancel: "取消", removeMember: "移除", refreshBackpack: "刷新宝可梦", loadingBackpack: "正在加载宝可梦...", backpackLoadFailed: "无法加载 Backpack 和 Team 宝可梦。", backpackSelectionUpdated: "可用状态已刷新。不可用的宝可梦已从草稿中移除。", noBackpackPokemon: "Backpack 或 Team 中没有可用的宝可梦。", noBackpackResults: "没有符合筛选条件的可用宝可梦。", chooseMembers: "请选择 1 到 6 只宝可梦。", manualSaved: "队伍已创建。", manualUpdated: "已保存队伍已编辑。", collapseTeam: "收起队伍", expandTeam: "展开队伍", teamFull: "队伍已有 6 只宝可梦。", errors: sharedErrors,
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

function canonicalTeamState(doc, memberIds) {
  const wanted = memberIds.map(String);
  for (const source of teamStateSources(doc)) {
    const order = Array.isArray(source?._team?.member_ids) ? source._team.member_ids.map(String).filter(Boolean) : [];
    if (!order.length || !idsEqual(order, wanted)) continue;
    const activeId = String(source?._team?.leader_id ?? "");
    return { order, activeId: order.includes(activeId) ? activeId : "" };
  }
  return null;
}

function cssUrl(value) {
  const match = String(value || "").match(/url\(["']?([^"')]+)["']?\)/i);
  return match?.[1]?.trim() || "";
}

function assetString(value) {
  if (typeof value !== "string") return "";
  const clean = value.trim();
  if (!clean) return "";
  if (/^(?:https?:|data:|blob:|\/|\.\.?\/)/i.test(clean) || /\.(?:png|gif|webp|jpe?g|svg)(?:[?#].*)?$/i.test(clean) || clean.includes("/")) return clean;
  return "";
}

function isSharedStoneAsset(value) {
  const clean = String(value || "").trim();
  if (!clean || /^(?:data:|blob:)/i.test(clean)) return false;
  let path = clean.split(/[?#]/, 1)[0];
  try { path = new URL(clean, "https://ppbui.invalid/").pathname; } catch { /* keep stripped relative path */ }
  const basename = String(path || "").split("/").pop() || "";
  return /^shared[-_ ]?stone(?:[-_ ][a-z0-9]+)*\.(?:png|gif|webp|jpe?g|svg)$/i.test(basename);
}

function normalizedAsset(value, doc) {
  const clean = assetString(value);
  if (!clean || /^(?:data:|blob:)/i.test(clean)) return clean;
  try { return new URL(clean, doc?.baseURI || undefined).href; }
  catch { return clean; }
}

function savedSpriteIsAuxiliary(card, sprite) {
  if (!sprite) return false;
  if (isSharedStoneAsset(sprite)) return true;
  if (!card) return false;
  const wanted = normalizedAsset(sprite, card.ownerDocument);
  if (!wanted) return false;
  for (const image of card.querySelectorAll(".pokeidle-team-card__xp-share img")) {
    const source = image.currentSrc || image.getAttribute("src") || image.getAttribute("data-src") || "";
    if (normalizedAsset(source, card.ownerDocument) === wanted) return true;
  }
  return false;
}

function canvasHasVisiblePixels(canvas) {
  const width = Number(canvas?.width || 0);
  const height = Number(canvas?.height || 0);
  if (!(width > 0 && height > 0)) return false;
  if (width * height > 65_536) return true;
  try {
    const context = canvas.getContext?.("2d", { willReadFrequently: true });
    if (!context?.getImageData) return true;
    const pixels = context.getImageData(0, 0, width, height)?.data;
    if (!pixels) return true;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] !== 0) return true;
    }
    return false;
  } catch {
    // Native/cross-origin canvas inspection can be unavailable or tainted.
    return true;
  }
}

function spriteFromObject(source, depth = 0) {
  if (!source || typeof source !== "object" || depth > 2) return "";
  for (const key of ["shiny_sprite_url", "normal_sprite_url", "shiny_sprite", "normal_sprite", "sprite_url", "spriteUrl", "image_url", "imageUrl", "icon_url", "iconUrl", "portrait_url", "portraitUrl", "front_default", "frontDefault", "sprite", "image", "icon", "portrait"]) {
    const value = source[key], direct = assetString(value);
    if (direct) return direct;
    if (value && typeof value === "object") { const nested = spriteFromObject(value, depth + 1); if (nested) return nested; }
  }
  for (const key of ["species", "pokemon", "sprites", "appearance", "art"]) {
    const nested = spriteFromObject(source[key], depth + 1); if (nested) return nested;
  }
  return "";
}

function spriteFromCard(card) {
  if (!card) return "";
  const auxiliary = node => Boolean(node?.closest?.(".pokeidle-team-card__xp-share, .pokeidle-team-card__xp-share-gain, .pokeidle-element-icons"));
  const imageAsset = image => {
    const src = assetString(image.currentSrc) || assetString(image.getAttribute("src")) || assetString(image.getAttribute("data-src")) || assetString(image.getAttribute("data-sprite"));
    if (src) return src;
    const content = cssUrl(card.ownerDocument.defaultView?.getComputedStyle?.(image)?.content);
    return content || "";
  };
  const canvasAsset = canvas => {
    if (!canvasHasVisiblePixels(canvas)) return "";
    try { const data = canvas.toDataURL?.("image/png"); if (data?.startsWith("data:image/")) return data; } catch { /* tainted/native canvas: continue */ }
    return "";
  };
  const nodeAsset = node => {
    if (!node || auxiliary(node)) return "";
    if (node.matches?.("img")) return imageAsset(node);
    if (node.matches?.("canvas")) return canvasAsset(node);
    for (const image of node.querySelectorAll?.("img") || []) { if (!auxiliary(image)) { const asset = imageAsset(image); if (asset) return asset; } }
    for (const canvas of node.querySelectorAll?.("canvas") || []) { if (!auxiliary(canvas)) { const asset = canvasAsset(canvas); if (asset) return asset; } }
    const inline = cssUrl(node.style?.backgroundImage) || cssUrl(node.style?.content);
    if (inline) return inline;
    try {
      const computed = card.ownerDocument.defaultView?.getComputedStyle?.(node);
      return cssUrl(computed?.backgroundImage) || cssUrl(computed?.content);
    } catch { return ""; }
  };
  const visualHosts = [card.querySelector(".pokeidle-team-card__icon"), card.querySelector(".pokeidle-team-card__charset")].filter(Boolean);
  for (const node of new Set(visualHosts)) { const asset = nodeAsset(node); if (asset) return asset; }
  for (const image of card.querySelectorAll("img")) { if (!auxiliary(image)) { const asset = imageAsset(image); if (asset) return asset; } }
  for (const canvas of card.querySelectorAll("canvas")) { if (!auxiliary(canvas)) { const asset = canvasAsset(canvas); if (asset) return asset; } }
  const descendants = [...card.querySelectorAll("*")].filter(node => !auxiliary(node)), preferred = descendants.filter(node => /sprite|pokemon|creature|portrait|icon/i.test(String(node.className || "")));
  for (const node of new Set([...preferred, ...descendants])) {
    const asset = nodeAsset(node); if (asset) return asset;
  }
  return "";
}

export function teamPresetMemberSnapshot(doc, creature) {
  const id = String(creature?.id ?? "").trim();
  if (!id) return null;
  const species = creature?.species || {};
  const name = String(doc?.defaultView?.PokeIdle?.DittoDisplayName?.get?.(creature)
    || creature?.name || species?.name || creature?.species_name || creature?.species_id || id).trim();
  const member = { id, name: name || id };
  const sprite = (creature?.is_shiny && (assetString(creature?.shiny_sprite_url) || assetString(species?.shiny_sprite_url) || assetString(species?.shiny_sprite)))
    || assetString(creature?.normal_sprite_url)
    || assetString(species?.normal_sprite_url)
    || assetString(species?.normal_sprite)
    || assetString(creature?.sprite_url)
    || spriteFromObject(creature);
  if (sprite) member.sprite = sprite;
  const element = creature?.elements?.[0] || species?.elements?.[0];
  const elementColor = element && doc?.defaultView?.PokeIdle?.ElementIcons?.definition?.(element)?.color;
  if (elementColor) member.elementColor = elementColor;
  const level = Number(creature?.level); if (Number.isFinite(level)) member.level = level;
  return member;
}

// Cache misses too: animated canvases and unavailable assets must not be polled.
const spriteCaches = new WeakMap();
const elementColorCaches = new WeakMap();

export function teamPresetVisualReader(root, { resolveSprites = false, retryMissing = false } = {}) {
  const runtime = root?.ownerDocument?.defaultView?.PokeIdle?.PersistentHud?._teamHud;
  const creatures = new Map((Array.isArray(runtime?._creatures) ? runtime._creatures : []).map(creature => [String(creature?.id ?? ""), creature]));
  const cards = new Map(Array.from(root?.querySelectorAll(config.selectors.hudCard) || [], card => [card.dataset.creatureId, card]));
  let colors = root && elementColorCaches.get(root);
  if (root && !colors) { colors = new Map(); elementColorCaches.set(root, colors); }
  for (const [id, creature] of creatures) {
    const element = creature?.elements?.[0] || creature?.species?.elements?.[0];
    const color = cards.get(id)?.style.getPropertyValue("--element-color") || (element && root?.ownerDocument?.defaultView?.PokeIdle?.ElementIcons?.definition?.(element)?.color);
    if (color) colors?.set(id, color);
  }
  let cache = root && spriteCaches.get(root);
  if (root && !cache) { cache = new WeakMap(); spriteCaches.set(root, cache); }
  const attempted = new WeakSet();
  return member => {
    const id = String(member?.id ?? ""), card = cards.get(id), creature = creatures.get(id), source = card || creature;
    let sprite = member?.sprite || "";
    // Older Saved Teams may already contain the native Shared Stone image as the
    // persisted member sprite. Never treat that auxiliary HUD status art as
    // Pokémon identity; explicit render/capture passes may recover the live art.
    if (savedSpriteIsAuxiliary(resolveSprites ? card : null, sprite)) sprite = "";
    if (!sprite && source) {
      let cached = cache.get(source);
      if (resolveSprites && (cached?.id !== id || (retryMissing && !cached.sprite && !attempted.has(source)))) {
        cached = { id, sprite: spriteFromCard(card) || spriteFromObject(creature) };
        cache.set(source, cached); attempted.add(source);
      }
      sprite = cached?.id === id ? cached.sprite : "";
    }
    const level = Number(creature?.level ?? member?.level), hp = Number(creature?.hp), maximum = Number(creature?.max_hp);
    const hpPercent = Number.isFinite(hp) && Number.isFinite(maximum) && maximum > 0 ? Math.max(0, Math.min(100, Math.round(hp / maximum * 100))) : null;
    const fainted = card?.classList.contains("is-fainted") || (Number.isFinite(hp) && hp <= 0);
    return { card, creature, sprite, elementColor: colors?.get(id) || member?.elementColor || "", level: Number.isFinite(level) ? level : null, hpPercent, fainted: Boolean(fainted) };
  };
}

export function teamPresetHudMemberVisual(root, member) {
  return teamPresetVisualReader(root, { resolveSprites: true })(member);
}

export function canCaptureTeamPreset(root) {
  const runtime = root?.ownerDocument?.defaultView?.PokeIdle?.PersistentHud?._teamHud;
  return Boolean(runtime && runtime.el === root && Array.isArray(runtime._creatures) && runtime._creatures.some(creature => String(creature?.id ?? "")));
}

function spriteFor(card, creature) {
  return spriteFromCard(card) || spriteFromObject(creature);
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
    const element = creature?.elements?.[0] || creature?.species?.elements?.[0];
    const elementColor = card?.style.getPropertyValue("--element-color") || (element && doc.defaultView?.PokeIdle?.ElementIcons?.definition?.(element)?.color);
    if (elementColor) member.elementColor = elementColor;
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
