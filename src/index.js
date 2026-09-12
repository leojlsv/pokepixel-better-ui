import { createPokemonHoverModule, hoverText } from "./modules/pokemon-hover/index.js";
import { createBuffStripModule, buffStripText } from "./modules/buff-strip/index.js";
import { createTradePokemonModule } from "./modules/pokemon-tools/adapters.js";
import { createStorageModule, storageText } from "./modules/storage/index.js";
import { createAutoHelperModule, autoHelperText } from "./modules/auto-helper/index.js";
import { createBetterUI } from "./core/bootstrap.js";
import { exampleModule } from "./modules/example/index.js";
import { menuBarModule } from "./modules/menu-bar/index.js";
import { createModulePreferences } from "./core/preferences.js";
import { createModuleControls } from "./modules/module-controls/index.js";
import { createInventoryModule } from "./modules/inventory/index.js";
import { inventoryText } from "./modules/inventory/dom.js";
import { createChatModule } from "./modules/chat/index.js";
import { chatText } from "./modules/chat/dom.js";
import { createHuntsModule } from "./modules/hunts/index.js";
import { huntsText } from "./modules/hunts/dom.js";
import { createTeamModule } from "./modules/team/index.js";
import { teamText } from "./modules/team/dom.js";
import { createTeamHudModule } from "./modules/team-hud/index.js";
import { teamHudText } from "./modules/team-hud/dom.js";
import { createTeamPresetsModule, teamPresetsText } from "./modules/team-presets/index.js";

import { createMarksShopModule } from "./modules/marks-shop/index.js";
import { shopText } from "./modules/marks-shop/dom.js";

const preferences = createModulePreferences({ defaults: { "disable-pokemon-hover": false, "buff-strip": true, "menu-bar": true, inventory: true, chat: true, hunts: true, team: true, "team-hud": true, "team-presets": true, "marks-shop": true, "auto-helper": true, storage: true, trade: true } });
const moduleControls = createModuleControls({
  preferences,
  modules: [
    { id: "disable-pokemon-hover", name: () => hoverText().name, description: () => hoverText().description },
    { id: "buff-strip", name: () => buffStripText().name, description: () => buffStripText().description },
    { id: "menu-bar", name: text => text.name, description: text => text.description },
    { id: "trade", name: () => "Trade", description: () => "Personal Pokémon tags and filters in trade.", },
    { id: "storage", name: () => storageText().name, description: () => storageText().description },
    { id: "inventory", name: () => inventoryText().name, description: () => inventoryText().description },
    { id: "chat", name: () => chatText().name, description: () => chatText().description },
    { id: "hunts", name: () => huntsText().name, description: () => huntsText().description },
    { id: "team", name: () => teamText().name, description: () => teamText().description },
    { id: "marks-shop", name: () => shopText().name, description: () => shopText().description },
    { id: "team-hud", name: () => teamHudText().name, description: () => teamHudText().description },
    { id: "auto-helper", name: () => autoHelperText().name, description: () => autoHelperText().description },
    { id: "team-presets", name: () => teamPresetsText().name, description: () => teamPresetsText().description },
  ],
});

const app = createBetterUI({
  debug: false,
  preferences,
  modules: [
    exampleModule,
    createPokemonHoverModule(),
    menuBarModule,
    createBuffStripModule(),
    createInventoryModule(),
    createStorageModule(),
    createTradePokemonModule(),
    createChatModule(),
    createHuntsModule(),
    createTeamModule(),
    createTeamHudModule(),
    createTeamPresetsModule(),
    createMarksShopModule(),
    createAutoHelperModule(),
    moduleControls,
  ],
});

app.start();
