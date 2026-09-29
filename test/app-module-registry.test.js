import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createAppModuleRegistry } from "../src/app/module-registry.js";
import { moduleControlsConfig } from "../src/modules/module-controls/config.js";

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
    "disable-pokemon-hover", "custom-pokeball", "pokemon-profile", "menu-bar",
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
  assert.ok(controls.every(({ name, description }) => typeof name === "function" && typeof description === "function"));
  assert.ok(modules.every(module => typeof module.shouldMount === "function" && typeof module.mount === "function"));
});
