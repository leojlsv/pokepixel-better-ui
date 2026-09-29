import { createBetterUI } from "./core/bootstrap.js";
import { createDesignSystemRuntime } from "./core/design-system.js";
import { createModulePreferences } from "./core/preferences.js";
import { createAppearancePreferences } from "./core/appearance-preferences.js";
import { createModuleControls } from "./modules/module-controls/index.js";
import { createTeamPresetStorage } from "./modules/team-presets/storage.js";
import { createTeamMovesetStorage } from "./modules/team-movesets/storage.js";
import { createAppModuleRegistry } from "./app/module-registry.js";
import tokensCss from "./styles/tokens.css";
import baseCss from "./styles/base.css";
import componentsCss from "./styles/components.css";
import statesCss from "./styles/states.css";
import nativeOverridesCss from "./styles/native-overrides.css";

const teamPresetStore = createTeamPresetStorage();
const teamMovesetStore = createTeamMovesetStorage();
const registry = createAppModuleRegistry({ teamPresetStore, teamMovesetStore });
const preferences = createModulePreferences({ defaults: registry.defaults });
const appearance = createAppearancePreferences({ defaultCornerMode: "square" });
const designSystem = createDesignSystemRuntime({
  cssText: [tokensCss, baseCss, componentsCss, statesCss, nativeOverridesCss].join("\n"),
});

const moduleControls = createModuleControls({
  preferences,
  appearance,
  modules: registry.controls,
});

createBetterUI({
  debug: false,
  preferences,
  appearance,
  designSystem,
  modules: [...registry.modules, moduleControls],
}).start();
