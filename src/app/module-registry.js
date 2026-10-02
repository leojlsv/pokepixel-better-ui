import { createPokemonHoverModule, hoverText } from "../modules/pokemon-hover/index.js";
import { createBuffStripModule, buffStripText } from "../modules/buff-strip/index.js";
import { createTradePokemonModule } from "../modules/pokemon-tools/adapters.js";
import { createStorageModule, storageText } from "../modules/storage/index.js";
import { createAutoHelperModule, autoHelperText } from "../modules/auto-helper/index.js";
import { menuBarModule } from "../modules/menu-bar/index.js";
import { createInventoryModule } from "../modules/inventory/index.js";
import { inventoryText } from "../modules/inventory/dom.js";
import { createChatModule } from "../modules/chat/index.js";
import { chatText } from "../modules/chat/dom.js";
import { createHuntsModule } from "../modules/hunts/index.js";
import { huntsText } from "../modules/hunts/dom.js";
import { createTeamModule } from "../modules/team/index.js";
import { teamText } from "../modules/team/dom.js";
import { createTeamHudModule } from "../modules/team-hud/index.js";
import { teamHudText } from "../modules/team-hud/dom.js";
import { createTeamPresetsModule, teamPresetsText } from "../modules/team-presets/index.js";
import { createPokemonProfileModule, pokemonProfileText } from "../modules/pokemon-profile/index.js";
import { createCoupledWorkspaceModule } from "../modules/coupled-workspace/index.js";
import { createStandaloneCardModeModule } from "../modules/coupled-workspace/standalone.js";
import { createMarksShopModule } from "../modules/marks-shop/index.js";
import { shopText } from "../modules/marks-shop/dom.js";
import { createEvolutionCenterModule } from "../modules/evolution-center/index.js";

// A toggle descriptor is the sole authority for a module's persisted default
// and preferences-panel entry. Module IDs always come from the module itself.
const toggle = (module, text, defaultEnabled = true) => ({
  module,
  preference: {
    id: module.id,
    defaultEnabled,
    name: () => text().name,
    description: () => text().description,
  },
});

export function createAppModuleRegistry({ teamPresetStore, teamMovesetStore } = {}) {
  // This order is intentional: native toolbar before its dependents, card-mode
  // infrastructure before its host, and the preferences panel last in index.js.
  const entries = [
    toggle(createPokemonHoverModule(), hoverText, false),
    toggle(createPokemonProfileModule({ teamPresetStore, movesetStore: teamMovesetStore }), pokemonProfileText),
    { module: menuBarModule, preference: {
      id: menuBarModule.id,
      defaultEnabled: true,
      name: text => text.name,
      description: text => text.description,
    } },
    { module: createStandaloneCardModeModule() },
    { module: createCoupledWorkspaceModule() },
    toggle(createBuffStripModule(), buffStripText),
    toggle(createInventoryModule(), inventoryText),
    toggle(createStorageModule(), storageText),
    toggle(createTradePokemonModule(), () => ({
      name: "Trade",
      description: "Personal Pokémon tags and filters in trade.",
    })),
    toggle(createChatModule(), chatText),
    toggle(createHuntsModule(), huntsText),
    toggle(createTeamModule(), teamText),
    toggle(createTeamHudModule(), teamHudText),
    toggle(createTeamPresetsModule({ store: teamPresetStore }), teamPresetsText),
    { module: createEvolutionCenterModule() },
    toggle(createMarksShopModule(), shopText),
    toggle(createAutoHelperModule(), autoHelperText),
  ];
  const controls = entries.flatMap(entry => entry.preference ? [entry.preference] : []);
  const defaults = Object.fromEntries(controls.map(({ id, defaultEnabled }) => [id, defaultEnabled]));

  if (new Set(entries.map(entry => entry.module.id)).size !== entries.length ||
      controls.some(({ id }) => !entries.some(entry => entry.module.id === id)) ||
      controls.some(({ id }) => entries.find(entry => entry.module.id === id).preference.id !== id)) {
    throw new Error("Duplicate or inconsistent Better UI module registration");
  }

  return { modules: entries.map(entry => entry.module), controls, defaults };
}
