import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBuffStripModule } from "../src/modules/buff-strip/index.js";
import { mountBuffStrip } from "../src/modules/buff-strip/controller.js";
import { menuBarConfig } from "../src/modules/menu-bar/config.js";

function setup({ nativeBottomRule = false, separateLayers = false } = {}) {
  const nativeStyle = nativeBottomRule ? `<style>
    body.pokeidle-toolbar-bottom:not(.pokeidle-mobile) .pokeidle-buff-strip {
      top:auto !important;
      bottom:52px !important;
    }
  </style>` : "";
  const bodyClass = nativeBottomRule ? ' class="pokeidle-toolbar-bottom"' : "";
  const toolbarMarkup = `<div class="pokeidle-top-toolbar"><button class="pokeidle-pokehub__handle">⠿</button><button>Inventory</button></div>`;
  const stripMarkup = `<div class="pokeidle-buff-strip" style="left:468px;top:938px;width:592.24px">
      <div class="pokeidle-buff-list">
        <div class="pokeidle-buff-pill"><span>Normal Capture</span><b>×2</b><time>05:31</time></div>
        <div class="pokeidle-buff-pill"><span>XP</span><b>×2</b><time>1D 0H</time></div>
      </div>
      <div class="pokeidle-event-ticker">
        <div class="pokeidle-event-ticker__pill"><span class="pokeidle-event-ticker__name">Rampage</span><b class="pokeidle-event-ticker__effect">×2</b><time class="pokeidle-event-ticker__time">19:48:35</time></div>
      </div>
    </div>`;
  const layerMarkup = separateLayers ?
    `<div class="native-menu-layer">${toolbarMarkup}</div><div class="native-buff-layer">${stripMarkup}<span data-native-after-buff></span></div>` :
    `${toolbarMarkup}${stripMarkup}`;
  const dom = new JSDOM(`<!doctype html><html><head>${nativeStyle}</head><body${bodyClass}>
    ${layerMarkup}
  </body></html>`, { pretendToBeVisual: true, url: "https://local.test" });
  const doc = dom.window.document;
  const toolbar = doc.querySelector(".pokeidle-top-toolbar");
  let rect = { left: 70, top: 54, width: 688, height: 72, right: 758, bottom: 126 };
  let stripRect = { left: 214, top: 24, width: 400, height: 30, right: 614, bottom: 54 };
  toolbar.getBoundingClientRect = () => ({ ...rect, x: rect.left, y: rect.top, toJSON() {} });
  const strip = doc.querySelector(".pokeidle-buff-strip");
  strip.getBoundingClientRect = () => ({ ...stripRect, x: stripRect.left, y: stripRect.top, toJSON() {} });
  Object.defineProperty(doc.documentElement, "clientWidth", { configurable: true, value: 812 });
  Object.defineProperty(doc.documentElement, "clientHeight", { configurable: true, value: 900 });
  return {
    dom,
    doc,
    toolbar,
    strip,
    setRect(value) { rect = value; },
    setStripRect(value) { stripRect = value; },
  };
}

test("buff strip becomes a compact native status rail above toolbar without replacing nodes", () => {
  const s = setup();
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  const parent = s.strip.parentNode;
  const mounted = mountBuffStrip({ strip: s.strip, toolbar: s.toolbar, list, ticker });
  assert.equal(s.strip.parentNode, parent);
  assert.equal(s.strip.querySelector(".pokeidle-buff-list"), list);
  assert.equal(s.strip.querySelector(".pokeidle-event-ticker"), ticker);
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-left"), "414px");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-top"), "55px");
  assert.equal(s.strip.dataset.ppbuiBuffStripDock, "above");
  assert.equal(s.strip.dataset.ppbuiBuffStripLayout, "horizontal");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-max-width"), "796px");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-max-height"), "884px");
  const css = s.doc.querySelector('[data-ppbui-style="buff-strip"]').textContent;
  assert.doesNotMatch(css, /z-index:2147483645/);
  assert.match(css, /width:fit-content/);
  assert.match(css, /min-height:26px/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) auto auto/);
  assert.match(css, /grid-column:auto/);
  assert.match(css, /data-ppbui-buff-strip-layout="vertical"[^}]+display:grid !important/s);
  assert.match(css, /pokeidle-event-ticker__pill[^}]+border-left:2px solid var\(--ppbui-selected\) !important/s);
  assert.match(css, /background:var\(--ppbui-bg-2\) !important/);
  assert.match(css, /background:transparent !important/);
  assert.match(css, /background-image:none !important/);
  assert.match(css, /border:0 !important/);
  assert.match(css, /padding:0 !important/);
  assert.match(css, /\.pokeidle-buff-strip\[data-ppbui-buff-strip\] \*,[\s\S]*margin:0 !important;[^}]*padding:0 !important;[^}]*border:0 !important;[^}]*background:transparent !important;/s);
  assert.match(css, /\.pokeidle-buff-strip\[data-ppbui-buff-strip\]::before,[\s\S]*\.pokeidle-buff-strip\[data-ppbui-buff-strip\] \*::after,[\s\S]*content:none !important;[^}]*display:none !important;/s);
  assert.match(css, /pokeidle-buff-pill,[\s\S]*pokeidle-event-ticker__pill \{[^}]*padding:3px 7px !important;[^}]*border:var\(--ppbui-separator-width\) solid var\(--ppbui-border\) !important;[^}]*background:var\(--ppbui-bg-2\) !important;/s);
  assert.match(css, /data-ppbui-buff-strip-layout="horizontal"[^}]*height:auto !important;[^}]*min-height:0 !important;[^}]*overflow:visible !important;/s);
  assert.match(css, /pokeidle-event-ticker__time[^}]+font-size:var\(--ppbui-font-size-meta\) !important/s);
  assert.match(css, /box-shadow:none/);
  assert.match(css, /pokeidle-event-ticker__time/);
  s.strip.hidden = true;
  assert.equal(s.doc.defaultView.getComputedStyle(s.strip).display, "none", "native hidden state remains authoritative");
  s.strip.hidden = false;
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
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-top"), "81px");
  assert.equal(s.strip.dataset.ppbuiBuffStripDock, "above");
  s.setRect({ left: 100, top: 20, width: 600, height: 70, right: 700, bottom: 90 });
  s.dom.window.dispatchEvent(new s.dom.window.Event("resize"));
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-top"), "89px");
  assert.equal(s.strip.dataset.ppbuiBuffStripDock, "below");
  s.strip.style.left = "512px";
  s.strip.style.top = "901px";
  s.strip.style.width = "610px";
  mounted.cleanup();
  assert.equal(s.strip.style.left, "512px");
  assert.equal(s.strip.style.top, "901px");
  assert.equal(s.strip.style.width, "610px");
  assert.equal(s.strip.hasAttribute("data-ppbui-buff-strip"), false);
  assert.equal(s.strip.hasAttribute("data-ppbui-buff-strip-dock"), false);
  assert.equal(s.strip.hasAttribute("data-ppbui-buff-strip-layout"), false);
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-left"), "");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-max-height"), "");
  assert.equal(s.doc.querySelector('[data-ppbui-style="buff-strip"]'), null);
  s.dom.window.close();
});

test("bottom toolbar native important positioning cannot override Better UI docking", () => {
  const s = setup({ nativeBottomRule: true });
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  const mounted = mountBuffStrip({ strip: s.strip, toolbar: s.toolbar, list, ticker });
  const css = s.doc.querySelector('[data-ppbui-style="buff-strip"]').textContent;
  assert.match(css, /body\.pokeidle-toolbar-bottom:not\(\.pokeidle-mobile\) \.pokeidle-buff-strip\[data-ppbui-buff-strip\]/);
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-top"), "55px");
  assert.equal(s.strip.dataset.ppbuiBuffStripDock, "above");
  mounted.cleanup();
  s.dom.window.close();
});

test("buff strip moves into the toolbar structural layer and cleanup restores its native position", () => {
  const s = setup({ separateLayers:true });
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  const nativeParent = s.strip.parentNode;
  const nativeAfter = nativeParent.querySelector("[data-native-after-buff]");
  const toolbarParent = s.toolbar.parentNode;
  const mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });

  assert.equal(s.strip.parentNode, toolbarParent, "buff strip shares the toolbar DOM layer");
  assert.equal(s.toolbar.nextSibling, s.strip, "buff strip is an adjacent sibling of the toolbar");
  assert.equal(s.strip.querySelector(".pokeidle-buff-list"), list);
  assert.equal(s.strip.querySelector(".pokeidle-event-ticker"), ticker);

  mounted.cleanup();
  assert.equal(s.strip.parentNode, nativeParent, "cleanup returns the native strip to its original layer");
  assert.equal(s.strip.nextSibling, nativeAfter, "cleanup restores the exact native sibling position");
  s.dom.window.close();
});

test("cleanup restores a native strip replacement through the original layer anchor", () => {
  const s = setup({ separateLayers:true });
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  const nativeParent = s.strip.parentNode;
  const nativeAfter = nativeParent.querySelector("[data-native-after-buff]");
  const mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });
  const replacement = s.strip.cloneNode(true);
  s.strip.replaceWith(replacement);

  mounted.cleanup();
  assert.equal(replacement.parentNode, nativeParent);
  assert.equal(replacement.nextSibling, nativeAfter);
  assert.equal(replacement.hasAttribute("data-ppbui-buff-strip"), false);
  assert.equal(replacement.hasAttribute("data-ppbui-buff-strip-dock"), false);
  assert.equal(replacement.hasAttribute("data-ppbui-buff-strip-layout"), false);
  assert.equal(replacement.style.getPropertyValue("--ppbui-buff-strip-left"), "");
  assert.equal(replacement.style.getPropertyValue("--ppbui-buff-strip-top"), "");
  assert.notEqual(replacement.style.getPropertyPriority("padding"), "important");
  assert.notEqual(replacement.querySelector(".pokeidle-buff-list").style.getPropertyPriority("padding"), "important");
  s.dom.window.close();
});

test("native inline important surface paint cannot remain outside buff pills", () => {
  const s = setup();
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  const surfaces = [s.strip, list, ticker];
  for (const surface of surfaces) {
    surface.style.setProperty("padding", "8px", "important");
    surface.style.setProperty("border", "1px solid rgb(52, 62, 63)", "important");
    surface.style.setProperty("background", "rgb(31, 42, 44)", "important");
    surface.style.setProperty("box-shadow", "0 0 0 4px rgb(31, 42, 44)", "important");
  }

  const mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });
  for (const surface of surfaces) {
    assert.equal(surface.style.getPropertyValue("padding"), "0px");
    assert.equal(surface.style.getPropertyPriority("padding"), "important");
    assert.equal(surface.style.getPropertyValue("border"), "0px");
    assert.equal(surface.style.getPropertyPriority("border"), "important");
    assert.equal(surface.style.getPropertyValue("background"), "transparent");
    assert.equal(surface.style.getPropertyPriority("background"), "important");
    assert.equal(surface.style.getPropertyValue("box-shadow"), "none");
    assert.equal(surface.style.getPropertyPriority("box-shadow"), "important");
  }

  list.style.setProperty("padding-inline", "9px", "important");
  mounted.sync();
  assert.equal(list.style.getPropertyValue("padding-inline"), "", "sync removes later hostile owned-family longhands");

  mounted.cleanup();
  for (const surface of surfaces) {
    assert.equal(surface.style.getPropertyValue("padding-top"), "8px");
    assert.equal(surface.style.getPropertyPriority("padding-top"), "important");
    assert.equal(surface.style.getPropertyValue("border-top-width"), "1px");
    assert.equal(surface.style.getPropertyValue("border-top-style"), "solid");
    assert.equal(surface.style.getPropertyValue("border-top-color"), "rgb(52, 62, 63)");
    assert.equal(surface.style.getPropertyPriority("border-top-width"), "important");
    assert.equal(surface.style.getPropertyValue("background-color"), "rgb(31, 42, 44)");
    assert.equal(surface.style.getPropertyPriority("background-color"), "important");
    assert.equal(surface.style.getPropertyValue("box-shadow"), "0 0 0 4px rgb(31, 42, 44)");
    assert.equal(surface.style.getPropertyPriority("box-shadow"), "important");
  }
  s.dom.window.close();
});

test("vertical menu bar turns buffs into a clamped side stack and flips sides near the viewport edge", () => {
  const s = setup();
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  s.toolbar.setAttribute("data-ppbui-menu-orientation", "vertical");
  s.setRect({ left:20, top:100, width:80, height:600, right:100, bottom:700 });
  s.setStripRect({ left:104, top:100, width:220, height:110, right:324, bottom:210 });
  const mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });
  assert.equal(s.strip.dataset.ppbuiBuffStripLayout, "vertical");
  assert.equal(s.strip.dataset.ppbuiBuffStripDock, "right");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-left"), "104px");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-top"), "100px");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-max-width"), "220px");

  s.setRect({ left:700, top:100, width:80, height:600, right:780, bottom:700 });
  s.dom.window.dispatchEvent(new s.dom.window.CustomEvent(menuBarConfig.events.orientationChange, {
    detail: { toolbar:s.toolbar, orientation:"vertical" },
  }));
  assert.equal(s.strip.dataset.ppbuiBuffStripDock, "left");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-left"), "476px");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-top"), "100px");
  mounted.cleanup();
  s.dom.window.close();
});

test("collapsed menu bar preserves the last expanded buff dock and restores live geometry after expand", () => {
  const s = setup();
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  const mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });
  const initialLeft = s.strip.style.getPropertyValue("--ppbui-buff-strip-left");
  const initialTop = s.strip.style.getPropertyValue("--ppbui-buff-strip-top");
  s.toolbar.classList.add("is-collapsed");
  s.setRect({ left:10, top:10, width:32, height:32, right:42, bottom:42 });
  s.dom.window.dispatchEvent(new s.dom.window.CustomEvent(menuBarConfig.events.collapseChange, {
    detail: { toolbar:s.toolbar, collapsed:true, orientation:"horizontal" },
  }));
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-left"), initialLeft);
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-top"), initialTop);

  s.toolbar.classList.remove("is-collapsed");
  s.setRect({ left:200, top:120, width:400, height:72, right:600, bottom:192 });
  s.dom.window.dispatchEvent(new s.dom.window.CustomEvent(menuBarConfig.events.collapseChange, {
    detail: { toolbar:s.toolbar, collapsed:false, orientation:"horizontal" },
  }));
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-left"), "400px");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-top"), "121px");
  mounted.cleanup();
  s.dom.window.close();
});

test("buff dock follows native menu drag only while the handle is active", () => {
  const s = setup();
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  let frame = null;
  let cancelled = 0;
  s.dom.window.requestAnimationFrame = callback => { frame = callback; return 7; };
  s.dom.window.cancelAnimationFrame = () => { cancelled += 1; frame = null; };
  const mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });
  assert.equal(frame, null, "no permanent animation loop runs while idle");
  s.setRect({ left:150, top:100, width:500, height:72, right:650, bottom:172 });
  s.toolbar.querySelector(".pokeidle-pokehub__handle")
    .dispatchEvent(new s.dom.window.Event("pointerdown", { bubbles:true }));
  assert.equal(typeof frame, "function");
  const tick = frame;
  tick();
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-left"), "400px");
  s.dom.window.dispatchEvent(new s.dom.window.Event("pointerup"));
  assert.ok(cancelled >= 1);
  mounted.cleanup();
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
