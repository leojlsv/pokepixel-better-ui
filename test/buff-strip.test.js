import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBuffStripModule } from "../src/modules/buff-strip/index.js";
import { mountBuffStrip } from "../src/modules/buff-strip/controller.js";

function setup() {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>
    <div class="pokeidle-top-toolbar"><button>Inventory</button></div>
    <div class="pokeidle-buff-strip" style="left:468px;top:938px;width:592.24px">
      <div class="pokeidle-buff-list"><span>XP ×2</span><span>Loot ×2</span></div>
      <div class="pokeidle-event-ticker is-empty"></div>
    </div>
  </body></html>`, { pretendToBeVisual: true, url: "https://local.test" });
  const doc = dom.window.document;
  const toolbar = doc.querySelector(".pokeidle-top-toolbar");
  let rect = { left: 70, top: 54, width: 688, height: 72, right: 758, bottom: 126 };
  toolbar.getBoundingClientRect = () => ({ ...rect, x: rect.left, y: rect.top, toJSON() {} });
  Object.defineProperty(doc.documentElement, "clientWidth", { configurable: true, value: 812 });
  return { dom, doc, toolbar, strip: doc.querySelector(".pokeidle-buff-strip"), setRect(value) { rect = value; } };
}

test("buff strip docks above toolbar without replacing native nodes", () => {
  const s = setup();
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  const parent = s.strip.parentNode;
  const mounted = mountBuffStrip({ strip: s.strip, toolbar: s.toolbar, list, ticker });
  assert.equal(s.strip.parentNode, parent);
  assert.equal(s.strip.querySelector(".pokeidle-buff-list"), list);
  assert.equal(s.strip.querySelector(".pokeidle-event-ticker"), ticker);
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-left"), "414px");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-top"), "49px");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-max-width"), "688px");
  const css = s.doc.querySelector('[data-ppbui-style="buff-strip"]').textContent;
  assert.match(css, /width:max-content/);
  assert.doesNotMatch(css, /pokeidle-buff-pill/);
  assert.doesNotMatch(css, /background\s*:/);
  assert.doesNotMatch(css, /border-radius\s*:/);
  mounted.cleanup();
  s.dom.window.close();
});

test("resize updates docking and cleanup preserves current native geometry", () => {
  const s = setup();
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  const mounted = mountBuffStrip({ strip: s.strip, toolbar: s.toolbar, list, ticker });
  s.setRect({ left: 100, top: 80, width: 600, height: 70, right: 700, bottom: 150 });
  s.dom.window.dispatchEvent(new s.dom.window.Event("resize"));
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-left"), "400px");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-top"), "75px");
  s.strip.style.left = "512px";
  s.strip.style.top = "901px";
  s.strip.style.width = "610px";
  mounted.cleanup();
  assert.equal(s.strip.style.left, "512px");
  assert.equal(s.strip.style.top, "901px");
  assert.equal(s.strip.style.width, "610px");
  assert.equal(s.strip.hasAttribute("data-ppbui-buff-strip"), false);
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-left"), "");
  assert.equal(s.doc.querySelector('[data-ppbui-style="buff-strip"]'), null);
  s.dom.window.close();
});

test("module mount key changes when native toolbar or buff strip is replaced", () => {
  const s = setup();
  const module = createBuffStripModule(s.doc);
  assert.equal(module.shouldMount(), true);
  const first = module.getMountKey();
  s.toolbar.replaceWith(s.toolbar.cloneNode(true));
  assert.equal(module.shouldMount(), true);
  const second = module.getMountKey();
  assert.notEqual(second, first);
  const replacement = s.strip.cloneNode(true);
  s.strip.replaceWith(replacement);
  assert.equal(module.shouldMount(), true);
  assert.notEqual(module.getMountKey(), second);
  s.dom.window.close();
});
