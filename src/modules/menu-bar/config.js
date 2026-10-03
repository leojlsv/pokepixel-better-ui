export const menuBarConfig = Object.freeze({
  id: "menu-bar",
  orientationStorageKey: "ppbui:menu-bar-orientation:v1",
  orientations: ["horizontal", "vertical"],
  events: {
    orientationChange: "ppbui:menu-orientation-change",
    collapseChange: "ppbui:menu-collapse-change",
  },
  selectors: {
    toolbar: ".pokeidle-top-toolbar",
    action: 'button[data-menu-id]:not([aria-haspopup="menu"])',
    group: ".pokeidle-top-toolbar__group",
    nativeGroup: ".pokeidle-top-toolbar__group[data-menu-group]",
    trigger: ':scope > button[aria-haspopup="menu"]',
    dropdown: ":scope > .pokeidle-top-toolbar__dropdown",
    label: ":scope > .pokeidle-top-toolbar__label:not(.pokeidle-menu-vector-icon), :scope > span:not(.pokeidle-top-toolbar__badge):not(.pokeidle-menu-vector-icon)",
    icon: ".pokeidle-top-toolbar__icon, .pokeidle-menu-vector-icon",
    badge: ".pokeidle-top-toolbar__badge",
    handle: ".pokeidle-pokehub__handle",
    toggle: ".pokeidle-pokehub__toggle",
    cityAction: "button[data-ppbui-city-action]",
    owned: '[data-ppbui-module="menu-bar"]',
  },
  classes: {
    group: "pokeidle-top-toolbar__group",
    button: "pokeidle-top-toolbar__btn",
    dropdown: "pokeidle-top-toolbar__dropdown",
    item: "pokeidle-top-toolbar__dropdown-btn",
    label: "pokeidle-top-toolbar__label",
    open: "is-open",
  },
  groups: [
    { id: "player", items: ["team", "pokemon-profile", "profile", "encyclopedia", "species-goals", "promotion"] },
    { id: "city", items: ["npc-shop", "market", "storage", "professions"] },
    { id: "activities", items: ["quests", "battle-pass", "daily-gift"] },
    { id: "events", items: ["event-calendar", "arena-pvp", "world-boss"] },
    { id: "social", items: ["friends", "guild", "ranking", "shiny-captures", "streamer-referral"] },
    { id: "automation", items: ["hunt-analyzer", "capture-records", "auto-helper", "offline-farm", "mini-view", "game-admin"] },
    { id: "shop", items: ["premium", "beta-goals", "gacha"] },
  ],
  cityActions: [
    {
      id: "geneticist", label: "Geneticista", kind: "iv", icon: "genetics",
    },
    {
      id: "nature", label: "Nature", kind: "nature", icon: "nature",
    },
    {
      id: "evolution-center", label: "Evolution Center", kind: "evolution", icon: "evolution",
    },
    {
      id: "gyms", label: "Gyms", scene: "gym", icon: "gym",
    },
  ],
  order: ["inventory", "hunts", "player", "city", "activities", "events", "social", "private-message", "automation", "shop", "settings"],
  labels: {
    pt: ["Treinador", "Cidade", "Objetivos", "Eventos", "Social", "Ferramentas", "Loja"],
    en: ["Trainer", "City", "Goals", "Events", "Social", "Tools", "Shop"],
    es: ["Entrenador", "Ciudad", "Objetivos", "Eventos", "Social", "Herramientas", "Tienda"],
    zh: ["训练家", "城市", "目标", "活动", "社交", "工具", "商店"],
  },
});
