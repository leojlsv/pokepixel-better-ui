import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MENU_CATALOG, SYSTEM_IDS, SLOT_CAPACITY, defaultLayout, getPlacement, moveLayoutItem, slotCount, validateLayout,
} from "../src/modules/menu-bar/layout-model.js";

test("default menu layout preserves the original 13-slot starting arrangement", () => {
  const layout = defaultLayout();
  const checked = validateLayout(layout);
  assert.equal(checked.ok, true);
  assert.equal(slotCount(layout), 13);
  assert.equal(layout.slotCapacity, 13);
  assert.deepEqual(layout.bar.slice(-2), [SYSTEM_IDS.cardMode, SYSTEM_IDS.moduleControls]);
  assert.ok(layout.bar.includes("native:inventory"));
  assert.ok(layout.bar.includes("native:hunts"));
  assert.ok(layout.bar.includes("native:private-message"));
  assert.ok(layout.groups["group:player"].includes("betterui:pokemon-profile"));
  assert.deepEqual(layout.groups["group:activities"], ["native:quests", "native:battle-pass", "native:daily-gift"]);
  assert.deepEqual(layout.groups["group:city"].slice(-4), [
    "city-shortcut:geneticist", "city-shortcut:nature", "city-shortcut:evolution-center", "city-shortcut:gyms",
  ]);
  assert.equal(new Set(MENU_CATALOG.map(item => item.id)).size, MENU_CATALOG.length);
});

test("moves use the chosen capacity and no longer reserve direct or system destinations", () => {
  let layout = defaultLayout();
  const settings = moveLayoutItem(layout, "native:settings", "group:automation", layout.groups["group:automation"].length);
  assert.equal(settings.ok, true);
  layout = settings.layout;
  assert.equal(slotCount(layout), 12);
  assert.deepEqual(getPlacement(layout, "native:settings"), { container:"group:automation", index:layout.groups["group:automation"].length - 1 });

  const promoted = moveLayoutItem(layout, "betterui:pokemon-profile", "bar", 2);
  assert.equal(promoted.ok, true);
  layout = promoted.layout;
  assert.equal(slotCount(layout), 13);
  assert.deepEqual(getPlacement(layout, "betterui:pokemon-profile"), { container:"bar", index:2 });

  assert.equal(moveLayoutItem(defaultLayout(), "betterui:pokemon-profile", "bar", 2).error, "slot-limit");
  assert.equal(moveLayoutItem({ ...layout, slotCapacity:15 }, "native:quests", "bar", 0).ok, true);
  assert.equal(moveLayoutItem(layout, SYSTEM_IDS.cardMode, "bar", 0).ok, true);
  assert.equal(moveLayoutItem(layout, "native:inventory", "group:player", 0).ok, true);
});

test("validation is fail-closed for unsafe data but appends missing known catalog IDs", () => {
  const base = defaultLayout();
  const missingKnown = structuredClone(base);
  missingKnown.bar = missingKnown.bar.filter(id => id !== "native:settings");
  missingKnown.groups["group:social"] = missingKnown.groups["group:social"].filter(id => id !== "native:ranking");
  const normalized = validateLayout(missingKnown);
  assert.equal(normalized.ok, true);
  assert.deepEqual(normalized.layout.bar.slice(-3), ["native:settings", SYSTEM_IDS.cardMode, SYSTEM_IDS.moduleControls]);
  assert.equal(normalized.layout.groups["group:social"].at(-1), "native:ranking");

  const unknown = structuredClone(base); unknown.groups["group:city"].push("native:future-unsafe");
  assert.equal(validateLayout(unknown).error, "unknown-id");
  const duplicate = structuredClone(base); duplicate.groups["group:city"].push("native:inventory");
  assert.equal(validateLayout(duplicate).error, "duplicate-id");
  const cycle = structuredClone(base); cycle.groups["group:city"].push("group:player"); cycle.bar = cycle.bar.filter(id => id !== "group:player");
  assert.equal(validateLayout(cycle).error, "invalid-placement");
  const badGroup = structuredClone(base); badGroup.groups["group:unknown"] = [];
  assert.equal(validateLayout(badGroup).error, "unknown-container");
  const badPosition = structuredClone(base); badPosition.position = { left:0, top:Infinity };
  assert.equal(validateLayout(badPosition).error, "invalid-position");
  for (const value of [null, true, false, "", "   ", [], {}]) {
    const strict = structuredClone(base); strict.position = { left:value, top:1 };
    assert.equal(validateLayout(strict).error, "invalid-position");
  }
  const numericStrings = structuredClone(base); numericStrings.position = { left:" 12.5 ", top:"-3" };
  assert.deepEqual(validateLayout(numericStrings).layout.position, { left:12.5, top:-3 });
  const oversized = structuredClone(base); oversized.groups["group:city"] = Array(MENU_CATALOG.length * 4 + 1).fill("city-shortcut:geneticist");
  assert.equal(validateLayout(oversized).error, "oversize-layout");
});

test("system destinations may move freely while group anchors remain non-nested", () => {
  const reordered = structuredClone(defaultLayout());
  const [card] = reordered.bar.splice(reordered.bar.indexOf(SYSTEM_IDS.cardMode), 1);
  reordered.bar.unshift(card);
  assert.equal(validateLayout(reordered).ok, true);

  const groupMove = moveLayoutItem(defaultLayout(), "group:city", "bar", 0);
  assert.equal(groupMove.ok, true, "group anchors may reorder within the bar");
  assert.equal(moveLayoutItem(defaultLayout(), "group:city", "group:player", 0).error, "invalid-placement");

  const missingFirstSystem = structuredClone(defaultLayout());
  missingFirstSystem.bar = missingFirstSystem.bar.filter(id => id !== SYSTEM_IDS.cardMode);
  const restored = validateLayout(missingFirstSystem);
  assert.equal(restored.ok, true);
  assert.deepEqual(restored.layout.bar.slice(-2), [SYSTEM_IDS.cardMode, SYSTEM_IDS.moduleControls]);
});

test("all action types support every group and the main rail without arbitrary locks", () => {
  for (const item of MENU_CATALOG.filter(item => item.kind !== "group")) {
    for (const container of ["bar", ...Object.keys(defaultLayout().groups)]) {
      const layout = { ...defaultLayout(), slotCapacity:15 };
      if(item.optional)(item.defaultContainer === "bar" ? layout.bar : layout.groups[item.defaultContainer]).push(item.id);
      assert.equal(moveLayoutItem(layout, item.id, container, 0).ok, true, `${item.id} -> ${container}`);
    }
  }
});

test("capacity supports 10 through 15 and overfull drafts can be repaired before strict save", () => {
  assert.deepEqual(SLOT_CAPACITY, { min:10, max:15, default:13 });
  let layout = defaultLayout();
  for (const id of ["native:inventory", "native:hunts", "native:private-message"]) layout = moveLayoutItem(layout, id, "group:player", 0).layout;
  for (let capacity = 10; capacity <= 15; capacity++) assert.equal(validateLayout({ ...layout, slotCapacity:capacity }).ok, true);
  for (const capacity of [9,16,10.5,"10",null,undefined,true]) assert.equal(validateLayout({ ...layout, slotCapacity:capacity }).error, "invalid-slot-capacity");
  let draft = { ...defaultLayout(), slotCapacity:10 };
  assert.equal(validateLayout(draft).error, "slot-limit");
  assert.equal(validateLayout(draft, { allowOverflow:true }).ok, true);
  for (const id of [SYSTEM_IDS.cardMode, SYSTEM_IDS.moduleControls, "native:settings"]) {
    const result = moveLayoutItem(draft, id, "group:automation", 0, { allowOverflow:true });
    assert.equal(result.ok, true); draft = result.layout;
  }
  assert.equal(validateLayout(draft).ok, true); assert.equal(slotCount(draft), 10);
});

test("legacy layout 1 upgrades without resetting order, groups, geometry or orientation", () => {
  const current = moveLayoutItem(defaultLayout(), "native:hunts", "bar", 0).layout;
  const legacy = { ...current, version:1, orientation:"vertical", position:{left:12,top:34} }; delete legacy.slotCapacity;
  const checked = validateLayout(legacy);
  assert.equal(checked.ok, true); assert.equal(checked.layout.version, 2); assert.equal(checked.layout.slotCapacity, 13);
  assert.deepEqual(checked.layout.bar, legacy.bar); assert.deepEqual(checked.layout.groups, legacy.groups);
  assert.equal(checked.layout.orientation, "vertical"); assert.deepEqual(checked.layout.position, legacy.position);
  assert.equal(validateLayout({ ...legacy, version:3 }).error, "future-version");
});
