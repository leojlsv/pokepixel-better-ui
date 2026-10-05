export const huntControlsConfig = Object.freeze({
  id: "hunt-controls",
  selectors: {
    actionBar: ".pokeidle-map-action-bar",
    actionButton: ":scope > button.pokeidle-map-action-bar__button",
    returnOwned: "button[data-ppbui-hunt-return]",
  },
  translationKeys: {
    returnCity: "hud.return_to_city_caps",
    capture: "hud.capture_caps",
    revive: "hud.revive_caps",
  },
  badgeText: {
    pt: "Voltar",
    en: "Return",
    es: "Volver",
    zh: "返回",
  },
});
