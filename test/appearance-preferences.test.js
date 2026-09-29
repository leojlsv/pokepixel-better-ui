import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createAppearancePreferences } from "../src/core/appearance-preferences.js";

test("appearance preference defaults to 0px, persists Rounded and restores the host root on cleanup", t => {
  const dom = new JSDOM("<!doctype html><html data-ppbui-corners='host'><body></body></html>", { url: "https://local.test" });
  t.after(() => dom.window.close());
  const appearance = createAppearancePreferences({ storage: () => dom.window.localStorage, events: dom.window, document: dom.window.document });
  assert.equal(appearance.getCornerMode(), "square");
  appearance.mount();
  assert.equal(dom.window.document.documentElement.dataset.ppbuiCorners, "square");
  appearance.setCornerMode("rounded");
  assert.equal(dom.window.document.documentElement.dataset.ppbuiCorners, "rounded");
  assert.deepEqual(JSON.parse(dom.window.localStorage.getItem("ppbui:appearance:v1")), { corners: "rounded" });
  appearance.unmount();
  assert.equal(dom.window.document.documentElement.dataset.ppbuiCorners, "host");

  const restored = createAppearancePreferences({ storage: () => dom.window.localStorage, events: dom.window, document: dom.window.document });
  assert.equal(restored.getCornerMode(), "rounded");
});

test("appearance preference keeps session switching usable when storage is denied", t => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  t.after(() => dom.window.close());
  const appearance = createAppearancePreferences({ storage: () => { throw new Error("denied"); }, events: dom.window, document: dom.window.document });
  appearance.mount();
  assert.equal(appearance.getCornerMode(), "square");
  appearance.setCornerMode("rounded");
  assert.equal(appearance.getCornerMode(), "rounded");
  assert.equal(dom.window.document.documentElement.dataset.ppbuiCorners, "rounded");
  assert.equal(appearance.isPersistent(), false);
});
