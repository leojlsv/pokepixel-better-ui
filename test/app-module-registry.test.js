import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createAppModuleRegistry } from "../src/app/module-registry.js";
import { moduleControlsConfig } from "../src/modules/module-controls/config.js";
import { menuBarConfig } from "../src/modules/menu-bar/config.js";
import { createModulePreferences } from "../src/core/preferences.js";

test("the app registry owns defaults, preference controls and mount order together", t => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://fixture.invalid" });
  const previous = globalThis.document;
  globalThis.document = dom.window.document;
  t.after(() => { globalThis.document = previous; dom.window.close(); });
  const { modules, controls, defaults } = createAppModuleRegistry({
    teamPresetStore: {}, teamMovesetStore: {},
  });
  const mountIds = modules.map(module => module.id);
  const controlIds = controls.map(control => control.id);
  assert.deepEqual(mountIds, [
    "disable-pokemon-hover", "pokemon-profile", "menu-bar",
    "standalone-card-mode", "coupled-workspace", "buff-strip", "inventory",
    "storage", "trade", "chat", "hunts", "team", "team-hud",
    "team-presets", "marks-shop", "auto-helper",
  ]);
  assert.equal(new Set(mountIds).size, mountIds.length, "runtime IDs must be unique");
  assert.equal(new Set(controlIds).size, controlIds.length, "preference IDs must be unique");
  assert.deepEqual(Object.keys(defaults), controlIds, "settings cannot drift from persisted defaults");
  assert.equal(defaults["disable-pokemon-hover"], false);
  assert.ok(controlIds.every(id => defaults[id] === true || id === "disable-pokemon-hover"));
  assert.ok(controlIds.every(id => mountIds.includes(id)), "every setting mounts a real module");
  assert.ok(!controlIds.includes("standalone-card-mode"));
  assert.ok(!controlIds.includes("coupled-workspace"));
  assert.ok(!controlIds.includes(moduleControlsConfig.id));
  assert.ok(moduleControlsConfig.groups.flatMap(group => group.modules).every(id => controlIds.includes(id)));
  assert.ok(!menuBarConfig.groups.flatMap(group => group.items).includes("custom-pokeball"));
  assert.ok(!moduleControlsConfig.groups.flatMap(group => group.modules).includes("custom-pokeball"));
  assert.ok(!mountIds.includes("custom-pokeball"));
  assert.ok(!controlIds.includes("custom-pokeball"));
  assert.ok(controls.every(({ name, description }) => typeof name === "function" && typeof description === "function"));
  assert.ok(modules.every(module => typeof module.shouldMount === "function" && typeof module.mount === "function"));
});

test("obsolete Custom Pokéball preference does not re-enter active defaults", t => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://fixture.invalid" });
  t.after(() => dom.window.close());
  const storage = dom.window.localStorage;
  storage.setItem("ppbui:modules:v1", JSON.stringify({ "custom-pokeball": true, "menu-bar": false }));
  const registry = createAppModuleRegistry({ teamPresetStore: {}, teamMovesetStore: {} });
  const preferences = createModulePreferences({ defaults: registry.defaults, storage: () => storage, events: dom.window });
  assert.equal(preferences.isEnabled("menu-bar"), false);
  preferences.setEnabled("custom-pokeball", false);
  preferences.setEnabled("menu-bar", true);
  assert.ok(!Object.hasOwn(JSON.parse(storage.getItem("ppbui:modules:v1")), "custom-pokeball"));
});
