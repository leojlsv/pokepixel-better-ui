export const moduleControlsConfig = {
  id: "module-controls",
  disclosureStorageKey: "ppbui:module-groups:v1",
  groups: [
    { id: "interface", modules: ["menu-bar", "buff-strip", "chat", "disable-pokemon-hover"] },
    { id: "team", modules: ["team", "team-hud", "team-presets"] },
    { id: "activities", modules: ["inventory", "hunts", "geneticist", "marks-shop", "auto-helper", "storage", "trade"] },
  ],
  selectors: {
    toolbar: ".pokeidle-top-toolbar",
    settings: 'button[data-menu-id="settings"]:not([aria-haspopup])',
    icon: ".pokeidle-top-toolbar__icon, .pokeidle-menu-vector-icon",
    nativeGroup: ".pokeidle-top-toolbar__group",
    trigger: ':scope > button[aria-haspopup="menu"]',
  },
  classes: {
    group: "pokeidle-top-toolbar__group",
    button: "pokeidle-top-toolbar__btn",
    label: "pokeidle-top-toolbar__label",
    panel: "ppbui-module-panel",
    item: "pokeidle-top-toolbar__dropdown-btn",
  },
  text: {
    pt: { activeCount: "ativos", groups: {"interface": "Interface", "team": "Equipe", "activities": "Atividades e itens"}, on: "Ativado", off: "Desativado", close: "Fechar", saved: "Preferências salvas neste navegador.", unsaved: "Não foi possível salvar. As escolhas valem apenas nesta sessão.", name: "Menu bar", description: "Reorganiza os menus. Desativar restaura a barra original." },
    en: { activeCount: "enabled", groups: {"interface": "Interface", "team": "Team", "activities": "Activities & items"}, on: "Enabled", off: "Disabled", close: "Close", saved: "Preferences saved in this browser.", unsaved: "Could not save. Choices apply only to this session.", name: "Menu bar", description: "Organizes menus. Disabling restores the original toolbar." },
    es: { activeCount: "activos", groups: {"interface": "Interfaz", "team": "Equipo", "activities": "Actividades y objetos"}, on: "Activado", off: "Desactivado", close: "Cerrar", saved: "Preferencias guardadas en este navegador.", unsaved: "No se pudo guardar. Los cambios solo se aplican a esta sesión.", name: "Menu bar", description: "Organiza los menús. Desactivar restaura la barra original." },
    zh: { activeCount: "已启用", groups: {"interface": "界面", "team": "队伍", "activities": "活动与物品"}, on: "已启用", off: "已禁用", close: "关闭", saved: "偏好设置已保存在此浏览器中。", unsaved: "无法保存。选择仅在本次会话中生效。", name: "菜单栏", description: "整理菜单。禁用后恢复原始菜单栏。" },
  },
};
