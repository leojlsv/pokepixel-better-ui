export const storageConfig = {
  id: "storage", pageSize: 42,
  selectors: { select:"select", transfer:".ppbui-storage-transfer", vault:"[data-ppbui-storage-side]", actions:".pokecentro-selection__actions", name:".pokecentro-selection__identity h3", root: ".storage-window", body: ".pokeidle-panel__body", filters: ".pokecentro-filter-bar__controls", clear: ".pokecentro-filter-clear", slots: ".pokecentro-transfer-slot", icon: ".inventory-slot__icon", pager: ".pokecentro-pager", pagerLabel: ".pokecentro-pager > span", next: ".pokecentro-pager > button:last-child", search: "[data-ppbui-storage-search]" },
  methods: ["filterAndSortPokeCentro", "pokeCentroFiltersActive", "renderPokeCentroFilters", "renderPokeCentroVault", "refresh"],
};
export function storageText(doc = document) {
  const lang = (doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en").split(/[-_]/)[0];
  const [name, description, search] = ({pt:["Storage","Buscar e organizar Pokémon no depósito","Buscar por nome ou espécie…"], en:["Storage","Find and organize stored Pokémon","Search name or species…"],es:["Storage","Buscar y organizar Pokémon almacenados","Buscar nombre o especie…"],zh:["仓库","查找和整理存放的宝可梦","搜索名称或种类…"]})[lang] || ["Storage","Find and organize stored Pokémon","Search name or species…"];
  return {name,description,search};
}
