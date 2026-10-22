export const cardModeConfig = Object.freeze({
  id: "card-mode",
  analyzerGlobal: "__POKEPIXEL_HUNT_ANALYZER_PUBLIC__",
  analyzerProtocol: 1,
  analyzerControlGlobal: "__POKEPIXEL_HUNT_ANALYZER_CONTROL__",
  analyzerUiGlobal: "__POKEPIXEL_HUNT_ANALYZER_UI__",
  analyzerUiProtocol: 1,
  analyzerPollMs: 1000,
  analyzerSourceMaxAgeMs: 3000,
  selectors: {
    toolbar: ".pokeidle-top-toolbar",
    action: 'button[data-menu-id]:not([aria-haspopup="menu"]), button[data-ppbui-city-action], button[data-ppbui-menu-context-action="hunt-return"]',
    label: ".pokeidle-top-toolbar__label:not(.pokeidle-menu-vector-icon)",
  },
  windows: {
    marker: "data-ppbui-card-mode-window",
    inventoryPanel: ".pokeidle-panel.inventory-window--slots",
    // Verified in public Scene_MenuBase + UIPanel sources. These native menu IDs
    // are not interchangeable with arbitrary scenes or toolbar action IDs.
    nativeMenus: Object.freeze({
      hunts: Object.freeze({ scene: "Scene_HuntSelection", panel: ".pokeidle-panel.game-window.hunt-window.hunt-world-window" }),
      team: Object.freeze({ scene: "Scene_Team", panel: ".pokeidle-panel.pokeidle-team-panel" }),
      storage: Object.freeze({ scene: "Scene_CreatureStorage", panel: ".pokeidle-panel.game-window.storage-window" }),
      settings: Object.freeze({ scene: "Scene_OnlineSettings", panel: ".pokeidle-panel.game-window.settings-window" }),
      "private-message": Object.freeze({ scene: "Scene_Mailbox", panel: ".pokeidle-panel.game-window.mailbox-window" }),
      profile: Object.freeze({ scene: "Scene_TrainerProfile", panel: ".pokeidle-panel.game-window.trainer-profile-window" }),
      encyclopedia: Object.freeze({ scene: "Scene_Encyclopedia", panel: ".pokeidle-panel.pokeidle-pokedex" }),
      "capture-records": Object.freeze({ scene: "Scene_CaptureRecords", panel: ".pokeidle-panel.capture-records-panel" }),
    }),
    // Wave B1: exact public Scene_MenuBase + UIPanel roots.
    nativeMenusWaveB: Object.freeze({
      ranking: Object.freeze({ scene: "Scene_Ranking", panel: ".pokeidle-panel.game-window.ranking-window" }),
      quests: Object.freeze({ scene: "Scene_Quest", panel: ".pokeidle-panel.game-window.quest-window" }),
      "battle-pass": Object.freeze({ scene: "Scene_BattlePass", panel: ".pokeidle-panel.game-window.battlepass-window.battlepass-window--compact" }),
      "daily-gift": Object.freeze({ scene: "Scene_DailyLogin", panel: ".pokeidle-panel.game-window.daily-login-window" }),
      "species-goals": Object.freeze({ scene: "Scene_SpeciesGoals", panel: ".pokeidle-panel.game-window.species-goals-window.species-goals-window--compact" }),
      "event-calendar": Object.freeze({ scene: "Scene_EventCalendar", panel: ".pokeidle-panel.game-window.npc-shop-window.event-calendar-window" }),
      "shiny-captures": Object.freeze({ scene: "Scene_ShinyCaptureFeed", panel: ".pokeidle-panel.shiny-capture-feed-panel" }),
      "genetic-vault": Object.freeze({ scene: "Scene_GeneticVault", panel: ".pokeidle-panel.game-window.genetic-vault-window" }),
      mentorship: Object.freeze({ scene: "Scene_Mentorship", panel: ".pokeidle-panel.game-window.mentorship-window" }),
      "streamers-active": Object.freeze({ scene: "Scene_PartnerStreams", panel: ".pokeidle-panel.game-window.partner-streams-window" }),
    }),
    // Wave B2: exact native scene roots; source-owned detached children are
    // handled separately and unowned dialogs retain conservative fallback.
    nativeMenusWaveB2: Object.freeze({
      professions: Object.freeze({ scene: "Scene_Professions", panel: ".pokeidle-panel.game-window.prof-workforce" }),
      friends: Object.freeze({ scene: "Scene_Friends", panel: ".pokeidle-panel.game-window.friends-window" }),
      "hunt-analyzer": Object.freeze({ scene: "Scene_HuntAnalyzer", panel: ".pokeidle-panel.hunt-analyzer-panel" }),
      market: Object.freeze({ scene: "Scene_Market", panel: ".pokeidle-panel.game-window.market-window.market-global-window" }),
      guild: Object.freeze({ scene: "Scene_Guild", panel: ".pokeidle-panel.game-window.guild-scene" }),
      promotion: Object.freeze({ scene: "Scene_Merit", panel: ".pokeidle-panel.game-window.npc-shop-window.guild-scene.merit-scene" }),
      "shared-stones": Object.freeze({ scene: "Scene_SharedStones", panel: ".pokeidle-panel.game-window.npc-shop-window.shared-stones-window" }),
      premium: Object.freeze({ scene: "Scene_PremiumShop", panel: ".pokeidle-panel.game-window.npc-shop-window.premium-shop-window" }),
    }),
    // Final six scene destinations from the public 37-scene PersistentHUD
    // catalog. All inherit Scene_MenuBase and construct an actual UIPanel;
    // only entering combat maps / submitting sensitive flows reveals Game.
    nativeMenusWaveB3: Object.freeze({
      gacha: Object.freeze({ scene: "Scene_Gacha", panel: ".pokeidle-panel.game-window.npc-shop-window.gacha-window" }),
      "beta-goals": Object.freeze({ scene: "Scene_BetaGoals", panel: ".pokeidle-panel.game-window.npc-shop-window.beta-goals-window" }),
      rampage: Object.freeze({ scene: "Scene_Rampage", panel: ".pokeidle-panel.game-window.worldboss-scene.worldboss-mmo-window" }),
      "world-boss-live-raid": Object.freeze({ scene: "Scene_WorldBossLiveRaid", panel: ".pokeidle-panel.game-window.npc-shop-window.worldboss-live-entry" }),
      "player-migration": Object.freeze({ scene: "Scene_PlayerMigration", panel: ".pokeidle-panel.game-window.player-migration-window" }),
      "game-admin": Object.freeze({ scene: "Scene_GameAdmin", panel: ".pokeidle-panel.game-window.npc-shop-window.game-admin-window" }),
    }),
    // Native DOM controllers without Scene_MenuBase: the controller itself
    // exposes its authoritative UIPanel handle (never infer it from a click).
    nativeActionPanels: Object.freeze({
      "active-events": Object.freeze({ controller: "EventTicker", handle: "_panel", panel: ".pokeidle-panel.game-window.active-events-window" }),
      "npc-shop": Object.freeze({ controller: "NPC", handle: "panel", method: "openShop", panel: ".pokeidle-panel.game-window.npc-shop-window:not(.npc-iv-window):not(.npc-nature-window):not(.shared-stones-window):not(.premium-shop-window)" }),
      "city-geneticist": Object.freeze({ controller: "NPC", handle: "panel", method: "open", panel: ".pokeidle-panel.game-window.npc-shop-window.npc-iv-window" }),
      "city-nature": Object.freeze({ controller: "NPC", handle: "panel", method: "open", panel: ".pokeidle-panel.game-window.npc-shop-window.npc-nature-window" }),
      "city-evolution-center": Object.freeze({ controller: "NPC", handle: "panel", method: "open", panel: ".pokeidle-panel.game-window.npc-evolution-window" }),
      expedition: Object.freeze({ controller: "ExpeditionWindow", getter: "current", handle: "panel", method: "open", panel: ".pokeidle-panel.game-window.npc-shop-window.expedition-window" }),
      "auto-helper": Object.freeze({ controller: "AutoHelper", openState: "isOpen", method: "toggle", panel: ".pokeidle-panel.auto-helper-panel" }),
      "offline-farm": Object.freeze({ controller: "OfflineFarm", openState: "isOpen", method: "toggle", panel: ".pokeidle-panel.game-window.npc-shop-window.offline-farm-panel" }),
    }),
    // Explicit PO exceptions: incompatible gameplay scenes and Halloween 2026
    // must use the native Game presentation, never a Cards UIPanel adapter.
    gameOnlyHud: Object.freeze({
      "arena-pvp": Object.freeze({ scene: "Scene_PvP" }),
      "arena-defense": Object.freeze({ scene: "Scene_PvPDefense" }),
      tactics: Object.freeze({ scene: "Scene_AutoBattler" }),
      tournaments: Object.freeze({ scene: "Scene_Tournaments" }),
      halloween: Object.freeze({ action: "halloween" }),
    }),
    gameOnlyCity: Object.freeze({ gyms: Object.freeze({ scene: "Scene_Gym" }) }),
    // PersistentHUD toggleItem actions with no in-page native window: keep
    // Cards and let the original controller decide permissions/availability.
    // MiniView is a separate browser window, not an in-page native modal.
    // Its actual captured frames still depend on the native renderer state.
    nativeActionsStayCards: Object.freeze(["mini-view", "discord", "streamer-referral"]),
    // HalloweenEvent.js exposes PI.Halloween.open() but keeps its UIPanel
    // handle private. This is an incompatible surface, NOT an overlay owner.
    halloweenPanel: ".pokeidle-panel.game-window.seasonal-window",
    // ConnectionOverlay.js creates these singleton native roots before the
    // menu HUD. They report authoritative async/loading and connection state;
    // DOM identity and original children, not selector similarity, grant Cards.
    nativeSystemPortals: Object.freeze({
      loading: "#pokeidle-loading-overlay.pokeidle-conn-overlay",
      connection: "#pokeidle-connection-overlay.pokeidle-conn-overlay",
    }),
    nativeChildren: Object.freeze({
      teamPicker: ".pokeidle-panel.team-equip-picker.game-window",
      teamDittoAction: "button.team-ditto-transform",
      dittoPicker: ".pokeidle-panel.game-window.ditto-form-window",
      teamMoveset: ".pokeidle-panel.moveset-window",
      huntZoneSheet: ".pokeidle-mobile-sheet.hunt-zone-sheet",
      huntDropTooltip: "aside.hunt-drop-tooltip.hunt-world-drop-tooltip",
      professionsHoverTarget: ".prof-stage-worker,.profession-worker__identity",
      professionsRemove: ".profession-worker__actions > button.pokeidle-btn--danger",
      professionsNavigate: ".prof-stage > button.prof-work-btn.primary",
      friendsActionMenu: "div.friends-action-popover",
      friendsJoin: ".friends-row__actions > button.pokeidle-btn--primary",
      huntAnalyzerMini: "aside.hunt-analyzer-mini",
      huntAnalyzerReset: ".analyzer-controls__actions > button.pokeidle-btn",
      marketSheet: ".pokeidle-mobile-sheet.market-listing-sheet",
      marketAssetTooltip: ".market-asset-tooltip.inventory-tooltip",
      sharedStoneTooltip: "aside.inventory-tooltip.shared-stones-item-tooltip",
      sharedStoneSheet: ".pokeidle-mobile-sheet.shared-stones-item-sheet",
      sharedStoneConfirm: "button.shared-stones__confirm",
      teamSavedDelete: ".ppbui-team-preset-delete",
      offlineFarmConfirm: "button.offline-farm-start,button.offline-farm-choice.is-boost",
      pokemonHover: ".pokemon-card--hover",
      dialog: ".pokeidle-dialog",
    }),
    nativeDialogActions: Object.freeze({
      "private-message": ".mailbox-entry:not(.is-claimed) > .mailbox-entry__actions > button.is-secondary",
      storage: ".pokecentro-vault__bulk",
      "capture-records": ".capture-log-reset",
      settingsLogout: ".settings-logout",
      settingsDiscordUnlink: ".settings-discord-actions > button.pokeidle-btn--danger",
      settingsEmail: ".settings-section > button.pokeidle-btn:not(.pokeidle-btn--primary)",
      settingsTwoFactor: ".settings-section input[type=checkbox]",
    }),
    // Public native actions which start PI.Dialog without a scene-owned dialog
    // handle (verified against the 2026-10-21 public plugin sources). The
    // window itself stays in Cards; only the exact triggering action uses Game.
    // Deliberately exclude category tabs, filters, previews and navigation.
    nativeDialogTriggers: Object.freeze({
      "beta-goals": ".founder-pack__purchase",
      rampage: ".worldboss-mmo__enter",
      "world-boss-live-raid": ".wb-live-scene__enter",
      "player-migration": ".player-migration-actions > button.pokeidle-btn--primary",
      "game-admin": ".game-admin-moderation__actions > button.game-admin-moderation__kick,.game-admin-moderation__actions > button.game-admin-moderation__ban",
      market: [
        ".market-listing__actions > button:not(.pokeidle-btn--primary)",
        ".market-global__buy,.market-global__offer,.market-global__withdraw-offer",
        ".market-global__edit,.market-global__cancel",
        ".market-received-offer > button,.market-received-offer-row__actions > button",
        ".market-sent-offer-row__actions > button",
        ".market-order-card > button.pokeidle-btn--primary",
        ".market-offer-block,.market-order-create-submit",
        ".market-create-form button.pokeidle-btn--primary",
      ].join(","),
      guild: [
        ".guild-mmo-hero__edit,.guild-mmo-hero__actions > button",
        ".guild-mmo-actions:has(> button:nth-last-of-type(3)) > button:nth-last-of-type(3)",
        ".guild-mmo-actions:has(> button:nth-last-of-type(3)) > button:nth-last-of-type(2)",
      ].join(","),
      promotion: ".merit-card > button.pokeidle-btn--primary",
      premium: ".premium-product__buy,.premium-modal__submit",
      "npc-shop": [
        ".npc-shop__purchase-button,.npc-shop__custom-button",
        ".npc-shop__sell-button,.npc-shop__buyback-button",
        ".npc-casino-buy",
      ].join(","),
      "city-geneticist": [
        ".npc-iv__restore,.npc-iv__action",
        ".npc-genetic__extract-action,.npc-genetic__creature.is-protected",
      ].join(","),
      "city-nature": ".npc-nature__action",
      "city-evolution-center": [
        ".npc-evolution-option > button.pokeidle-btn--primary",
        ".npc-craft-card__footer > button.pokeidle-btn--primary",
      ].join(","),
      expedition: [
        ".expedition-actions:not(.expedition-group-actions) > button:nth-child(3)",
        ".expedition-item-note > button.expedition-mini-btn.pokeidle-btn--primary",
        ".expedition-group-actions > button.pokeidle-btn--danger",
        ".expedition-slot__actions > button.expedition-mini-btn",
        ".expedition-quest-row__actions > button.pokeidle-btn--danger",
      ].join(","),
    }),
    inventoryDialogs: ".pokeidle-dialog-overlay,.pokeidle-overlay,.pokeidle-form-overlay,.pokeidle-mobile-sheet-overlay,dialog.ppbui-tag-dialog",
    inventoryTooltip: ".inventory-tooltip",
    inventoryPokemonCards: ".pokemon-card--hover,.pokemon-card-shell",
    inventoryPinnedCard: ":scope > .pokemon-card--pinned,:scope > .pokemon-card--sheet",
    inventoryDittoPanel: ":scope > .pokeidle-panel.ditto-form-window",
    profileEditorPanel: ":scope > .pokeidle-panel.moveset-window",
    minimizedDock: ":scope > .pokeidle-minimized-windows",
    profile: "[data-ppbui-pokemon-profile-window]",
  },
});
