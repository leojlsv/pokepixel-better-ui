export const storageConfig = {
  id: "storage", pageSize: 42,
  selectors: { overview:".pokecentro-overview", grid:".pokecentro-slot-grid", count:".pokecentro-vault__count", bulk:".pokecentro-vault__bulk", pagerButtons:".pokecentro-pager > button", dialog:".pokeidle-dialog-overlay", dialogBody:".pokeidle-dialog__body", focus:"[data-ppbui-storage-focus]", select:"select", transfer:".ppbui-storage-transfer", vault:"[data-ppbui-storage-side]", actions:".pokecentro-selection__actions", name:".pokecentro-selection__identity h3", root: ".storage-window", body: ".pokeidle-panel__body", filters: ".pokecentro-filter-bar__controls", clear: ".pokecentro-filter-clear", slots: ".pokecentro-transfer-slot", icon: ".inventory-slot__icon", pager: ".pokecentro-pager", pagerLabel: ".pokecentro-pager > span", next: ".pokecentro-pager > button:last-child", search: "[data-ppbui-storage-search]" },
  methods: ["filterAndSortPokeCentro", "pokeCentroFiltersActive", "renderPokeCentroFilters", "renderPokeCentroVault", "refresh"],
};
export function storageText(doc = document) {
  const lang = (doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en").split(/[-_]/)[0];
  const [name, description, search] = ({pt:["Storage","Buscar e organizar Pokémon no depósito","Buscar por nome ou espécie…"], en:["Storage","Find and organize stored Pokémon","Search name or species…"],es:["Storage","Buscar y organizar Pokémon almacenados","Buscar nombre o especie…"],zh:["仓库","查找和整理存放的宝可梦","搜索名称或种类…"]})[lang] || ["Storage","Find and organize stored Pokémon","Search name or species…"];
  const labels = ({
    pt:["resultados","Nenhum Pokémon encontrado","Mochila vazia","Depósito vazio","Limpar filtros","Selecione um Pokémon · Duplo clique para transferir","Mochila","Pokécenter","Inclui todos, mesmo os ocultos pelos filtros.","Até"],
    en:["results","No Pokémon found","Backpack empty","Storage empty","Clear filters","Select a Pokémon · Double-click to transfer","Backpack","Pokécenter","Includes all Pokémon, even those hidden by filters.","Up to"],
    es:["resultados","No se encontraron Pokémon","Mochila vacía","Depósito vacío","Limpiar filtros","Selecciona un Pokémon · Doble clic para transferir","Mochila","Pokécenter","Incluye todos, incluso los ocultos por filtros.","Hasta"],
    zh:["个结果","没有找到宝可梦","背包为空","仓库为空","清除筛选","选择宝可梦 · 双击转移","背包","宝可梦中心","包括所有宝可梦，即使被筛选隐藏。","最多"]
  })[lang] || ["results","No Pokémon found","Backpack empty","Storage empty","Clear filters","Select a Pokémon · Double-click to transfer","Backpack","Pokécenter","Includes all Pokémon, even those hidden by filters.","Up to"];
  const [results,noResults,emptyInventory,emptyStorage,clear,idle,inventory,storage,bulkScope,upTo]=labels;
  return {name,description,search,results,noResults,emptyInventory,emptyStorage,clear,idle,inventory,storage,bulkScope,upTo};
}
