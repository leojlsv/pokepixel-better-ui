const copies = {
  pt: {
    name: "Pokémon Profile", description: "Dossiê de qualquer Pokémon da Team ou Backpack.", title: "Pokémon Profile",
    all: "Todos", team: "Team", backpack: "Backpack", search: "Buscar Pokémon", refresh: "Atualizar", rarity: "Raridade", element: "Elemento", minLevel: "Nível mín.", maxLevel: "Nível máx.", tags: "Tags", untagged: "Sem tag", clearFilters: "Limpar filtros", filters: "Filtros", pokemonList: "Pokémon disponíveis", levelInvalid: "Use um nível inteiro a partir de 1.",
    loading: "Carregando Pokémon...", loadError: "Não foi possível carregar seus Pokémon.", none: "Nenhum Pokémon corresponde aos filtros.",
    currentMoves: "Moves atuais", savedMoves: "Movesets salvos", savedTeams: "Times que usam este Pokémon",
    movesLoading: "Carregando moves...", movesError: "Não foi possível carregar os moves atuais.", noMoves: "Nenhum move configurado.", retry: "Tentar novamente",
    power: "Power", movePower: "PW", moveCooldown: "Cooldown", movePhysical: "Phys", moveSpecial: "Spec", moveStatus: "Status", hp: "HP", level: "Lv.", iv: "IV", rarityFact: "Rarity", gender: "Gender", nature: "Nature", source: "Origem", activeTeam: "No Team", inBackpack: "Backpack",
    configureMoves: "Configurar moves",
    collapseSavedMoves: "Recolher movesets salvos", expandSavedMoves: "Expandir movesets salvos", collapseSavedTeams: "Recolher times", expandSavedTeams: "Expandir times",
    saveCurrent: "Salvar atual", presetName: "Nome do moveset", apply: "Aplicar", update: "Atualizar", remove: "Excluir", active: "Ativo",
    noSavedMoves: "Nenhum moveset salvo para este Pokémon.", noSavedTeams: "Este Pokémon não participa de nenhum time salvo.",
    saving: "Salvando...", saved: "Moveset salvo.", updated: "Moveset atualizado.", removed: "Moveset excluído.", applying: "Aplicando...", applied: "Moveset aplicado.",
    openDossier: "Abrir Pokémon Profile", profileAction: "Profile", hoverMoves: "Moves atuais", close: "Fechar Pokémon Profile",
    duplicate: name => `Este conjunto já está salvo como “${name}”.`,
    errors: {
      "name-required": "Informe um nome para o moveset.", "moveset-api-unavailable": "A configuração nativa de moves não está disponível.",
      "moveset-empty": "O Pokémon ainda não possui moves configurados.", "moveset-read-failed": "Não foi possível ler o moveset atual.",
      "preset-invalid": "O moveset salvo é inválido.", "preset-incompatible": "Um ou mais moves deste preset não estão disponíveis para este Pokémon.",
      "final-state-mismatch": "O jogo não confirmou o moveset solicitado.", "moveset-apply-failed": "Não foi possível aplicar o moveset.",
    },
  },
  en: {
    name: "Pokémon Profile", description: "Dossier for any Pokémon in Team or Backpack.", title: "Pokémon Profile",
    all: "All", team: "Team", backpack: "Backpack", search: "Search Pokémon", refresh: "Refresh", rarity: "Rarity", element: "Element", minLevel: "Min level", maxLevel: "Max level", tags: "Tags", untagged: "Untagged", clearFilters: "Clear filters", filters: "Filters", pokemonList: "Available Pokémon", levelInvalid: "Use a whole level of 1 or higher.",
    loading: "Loading Pokémon...", loadError: "Could not load your Pokémon.", none: "No Pokémon match the filters.",
    currentMoves: "Current moves", savedMoves: "Saved movesets", savedTeams: "Teams using this Pokémon",
    movesLoading: "Loading moves...", movesError: "Could not load current moves.", noMoves: "No moves configured.", retry: "Retry",
    power: "Power", movePower: "PW", moveCooldown: "Cooldown", movePhysical: "Phys", moveSpecial: "Spec", moveStatus: "Status", hp: "HP", level: "Lv.", iv: "IV", rarityFact: "Rarity", gender: "Gender", nature: "Nature", source: "Source", activeTeam: "In Team", inBackpack: "Backpack",
    configureMoves: "Configure moves",
    collapseSavedMoves: "Collapse saved movesets", expandSavedMoves: "Expand saved movesets", collapseSavedTeams: "Collapse teams", expandSavedTeams: "Expand teams",
    saveCurrent: "Save current", presetName: "Moveset name", apply: "Apply", update: "Update", remove: "Delete", active: "Active",
    noSavedMoves: "No saved movesets for this Pokémon.", noSavedTeams: "This Pokémon is not part of any saved team.",
    saving: "Saving...", saved: "Moveset saved.", updated: "Moveset updated.", removed: "Moveset deleted.", applying: "Applying...", applied: "Moveset applied.",
    openDossier: "Open Pokémon Profile", profileAction: "Profile", hoverMoves: "Current moves", close: "Close Pokémon Profile",
    duplicate: name => `This loadout is already saved as “${name}”.`,
    errors: {
      "name-required": "Enter a moveset name.", "moveset-api-unavailable": "Native move configuration is unavailable.",
      "moveset-empty": "This Pokémon does not have configured moves yet.", "moveset-read-failed": "Could not read the current moveset.",
      "preset-invalid": "The saved moveset is invalid.", "preset-incompatible": "One or more moves in this preset are unavailable for this Pokémon.",
      "final-state-mismatch": "The game did not confirm the requested moveset.", "moveset-apply-failed": "Could not apply the moveset.",
    },
  },
  es: {
    name: "Pokémon Profile", description: "Ficha de cualquier Pokémon del Team o Backpack.", title: "Pokémon Profile",
    all: "Todos", team: "Team", backpack: "Backpack", search: "Buscar Pokémon", refresh: "Actualizar", rarity: "Rareza", element: "Elemento", minLevel: "Nivel mín.", maxLevel: "Nivel máx.", tags: "Tags", untagged: "Sin tag", clearFilters: "Limpiar filtros", filters: "Filtros", pokemonList: "Pokémon disponibles", levelInvalid: "Usa un nivel entero a partir de 1.",
    loading: "Cargando Pokémon...", loadError: "No se pudieron cargar tus Pokémon.", none: "Ningún Pokémon coincide con los filtros.",
    currentMoves: "Movimientos actuales", savedMoves: "Movesets guardados", savedTeams: "Equipos que usan este Pokémon",
    movesLoading: "Cargando movimientos...", movesError: "No se pudieron cargar los movimientos actuales.", noMoves: "No hay movimientos configurados.", retry: "Reintentar",
    power: "Power", movePower: "PW", moveCooldown: "Enfriamiento", movePhysical: "Phys", moveSpecial: "Spec", moveStatus: "Status", hp: "PS", level: "Nv.", iv: "IV", rarityFact: "Rareza", gender: "Género", nature: "Naturaleza", source: "Origen", activeTeam: "En Team", inBackpack: "Backpack",
    configureMoves: "Configurar movimientos",
    collapseSavedMoves: "Contraer movesets guardados", expandSavedMoves: "Expandir movesets guardados", collapseSavedTeams: "Contraer equipos", expandSavedTeams: "Expandir equipos",
    saveCurrent: "Guardar actual", presetName: "Nombre del moveset", apply: "Aplicar", update: "Actualizar", remove: "Eliminar", active: "Activo",
    noSavedMoves: "No hay movesets guardados para este Pokémon.", noSavedTeams: "Este Pokémon no participa en ningún equipo guardado.",
    saving: "Guardando...", saved: "Moveset guardado.", updated: "Moveset actualizado.", removed: "Moveset eliminado.", applying: "Aplicando...", applied: "Moveset aplicado.",
    openDossier: "Abrir Pokémon Profile", profileAction: "Perfil", hoverMoves: "Movimientos actuales", close: "Cerrar Pokémon Profile", duplicate: name => `Este conjunto ya está guardado como “${name}”.`,
    errors: { "name-required":"Indica un nombre para el moveset.", "moveset-api-unavailable":"La configuración nativa no está disponible.", "moveset-empty":"Este Pokémon no tiene movimientos configurados.", "moveset-read-failed":"No se pudo leer el moveset actual.", "preset-invalid":"El moveset guardado no es válido.", "preset-incompatible":"Uno o más movimientos ya no están disponibles.", "final-state-mismatch":"El juego no confirmó el moveset solicitado.", "moveset-apply-failed":"No se pudo aplicar el moveset." },
  },
  zh: {
    name: "Pokémon Profile", description: "查看 Team 或 Backpack 中任意宝可梦的资料。", title: "Pokémon Profile",
    all: "全部", team: "Team", backpack: "Backpack", search: "搜索宝可梦", refresh: "刷新", rarity: "稀有度", element: "属性", minLevel: "最低等级", maxLevel: "最高等级", tags: "标签", untagged: "无标签", clearFilters: "清除筛选", filters: "筛选", pokemonList: "可用宝可梦", levelInvalid: "请输入不小于 1 的整数等级。",
    loading: "正在加载宝可梦...", loadError: "无法加载宝可梦。", none: "没有符合筛选条件的宝可梦。",
    currentMoves: "当前招式", savedMoves: "已保存招式组", savedTeams: "使用这只宝可梦的队伍",
    movesLoading: "正在加载招式...", movesError: "无法加载当前招式。", noMoves: "尚未配置招式。", retry: "重试",
    power: "Power", movePower: "PW", moveCooldown: "冷却", movePhysical: "Phys", moveSpecial: "Spec", moveStatus: "Status", hp: "HP", level: "Lv.", iv: "IV", rarityFact: "稀有度", gender: "性别", nature: "性格", source: "来源", activeTeam: "Team 中", inBackpack: "Backpack",
    configureMoves: "配置招式",
    collapseSavedMoves: "收起已保存招式组", expandSavedMoves: "展开已保存招式组", collapseSavedTeams: "收起队伍", expandSavedTeams: "展开队伍",
    saveCurrent: "保存当前", presetName: "招式组名称", apply: "应用", update: "更新", remove: "删除", active: "当前",
    noSavedMoves: "这只宝可梦没有已保存招式组。", noSavedTeams: "这只宝可梦不在任何已保存队伍中。",
    saving: "正在保存...", saved: "已保存。", updated: "已更新。", removed: "已删除。", applying: "正在应用...", applied: "已应用。",
    openDossier: "打开 Pokémon Profile", profileAction: "资料", hoverMoves: "当前招式", close: "关闭 Pokémon Profile", duplicate: name => `该组合已保存为“${name}”。`,
    errors: { "name-required":"请输入招式组名称。", "moveset-api-unavailable":"原生招式配置不可用。", "moveset-empty":"这只宝可梦尚未配置招式。", "moveset-read-failed":"无法读取当前招式组。", "preset-invalid":"保存的招式组无效。", "preset-incompatible":"一个或多个招式已不可用。", "final-state-mismatch":"游戏未确认请求的招式组。", "moveset-apply-failed":"无法应用招式组。" },
  },
};

export function pokemonProfileText(doc = document) {
  const lang = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "pt";
  return copies[lang.split(/[-_]/)[0]] || copies.en;
}

export const pokemonName = (doc, creature) => doc.defaultView?.PokeIdle?.DittoDisplayName?.get?.(creature)
  || creature?.name || creature?.species?.name || creature?.species_name || creature?.species_id || "Pokémon";

export const finite = value => (typeof value === "number" || (typeof value === "string" && value.trim())) && Number.isFinite(Number(value)) ? Number(value) : null;
