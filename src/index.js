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

import { createMarksShopModule } from "./modules/marks-shop/index.js";
import { shopText } from "./modules/marks-shop/dom.js";

const preferences = createModulePreferences({ defaults: { "menu-bar": true, inventory: true, chat: true, hunts: true, team: true, "team-hud": true, "marks-shop": true } });
const moduleControls = createModuleControls({
  preferences,
  modules: [
    { id: "menu-bar", name: text => text.name, description: text => text.description },
    { id: "inventory", name: () => inventoryText().name, description: () => inventoryText().description },
    { id: "chat", name: () => chatText().name, description: () => chatText().description },
    { id: "hunts", name: () => huntsText().name, description: () => huntsText().description },
    { id: "team", name: () => teamText().name, description: () => teamText().description },
    { id: "marks-shop", name: () => shopText().name, description: () => shopText().description },
    { id: "team-hud", name: () => teamHudText().name, description: () => teamHudText().description },
  ],
});

const app = createBetterUI({
  debug: false,
  preferences,
  modules: [
    exampleModule,
    menuBarModule,
    createInventoryModule(),
    createChatModule(),
    createHuntsModule(),
    createTeamModule(),
    createTeamHudModule(),
    createMarksShopModule(),
    moduleControls,
  ],
});

app.start();
