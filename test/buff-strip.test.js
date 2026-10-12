import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBuffStripModule } from "../src/modules/buff-strip/index.js";
import { mountBuffStrip } from "../src/modules/buff-strip/controller.js";
import { buffStripConfig } from "../src/modules/buff-strip/config.js";

function setup({ separateLayers = false, storedState = null, teamHudWidth = 0 } = {}) {
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
  const layerMarkup = separateLayers
    ? `<div class="native-menu-layer">${toolbarMarkup}</div><div class="native-buff-layer">${stripMarkup}<span data-native-after-buff></span></div>`
    : `${toolbarMarkup}${stripMarkup}`;
  const dom = new JSDOM(`<!doctype html><html lang="pt-BR"><head></head><body>${layerMarkup}</body></html>`, {
    pretendToBeVisual: true,
    url: "https://local.test",
  });
  const doc = dom.window.document;
  const toolbar = doc.querySelector(".pokeidle-top-toolbar");
  const strip = doc.querySelector(".pokeidle-buff-strip");
  let referenceWidth = teamHudWidth;
  let teamHud = null;
  if (teamHudWidth > 0) {
    teamHud = doc.createElement("div");
    teamHud.className = "pokeidle-team-hud";
    teamHud.dataset.ppbuiTeamHudEnhanced = "";
    teamHud.getBoundingClientRect = () => ({
      left:12, top:12, right:12 + referenceWidth, bottom:412,
      width:referenceWidth, height:400, x:12, y:12, toJSON() {},
    });
    doc.body.prepend(teamHud);
  }
  let viewportWidth = 812;
  let viewportHeight = 900;
  let toolbarRect = { left:70, top:54, width:688, height:72, right:758, bottom:126 };
  const nativeRect = { left:214, top:24, width:300, height:120, right:514, bottom:144 };
  Object.defineProperty(doc.documentElement, "clientWidth", { configurable:true, get:() => viewportWidth });
  Object.defineProperty(doc.documentElement, "clientHeight", { configurable:true, get:() => viewportHeight });
  toolbar.getBoundingClientRect = () => ({ ...toolbarRect, x:toolbarRect.left, y:toolbarRect.top, toJSON() {} });
  strip.getBoundingClientRect = () => {
    const left = Number.parseFloat(strip.style.getPropertyValue("--ppbui-buff-strip-left"));
    const top = Number.parseFloat(strip.style.getPropertyValue("--ppbui-buff-strip-top"));
    const width = Math.min(300, Math.max(0, viewportWidth - buffStripConfig.viewportMargin * 2));
    const height = strip.dataset.ppbuiBuffStripCollapsed === "true" ? 32 : 120;
    const resolvedLeft = Number.isFinite(left) ? left : nativeRect.left;
    const resolvedTop = Number.isFinite(top) ? top : nativeRect.top;
    return {
      left:resolvedLeft,
      top:resolvedTop,
      width,
      height,
      right:resolvedLeft + width,
      bottom:resolvedTop + height,
      x:resolvedLeft,
      y:resolvedTop,
      toJSON() {},
    };
  };
  if (storedState) dom.window.localStorage.setItem(buffStripConfig.storageKey, JSON.stringify(storedState));
  return {
    dom,
    doc,
    toolbar,
    strip,
    teamHud,
    setViewport(width, height) { viewportWidth = width; viewportHeight = height; },
    setToolbarRect(value) { toolbarRect = value; },
    setTeamHudWidth(value) { referenceWidth = value; },
  };
}

function pointer(win, type, { pointerId = 1, button = 0, clientX = 0, clientY = 0 } = {}) {
  const event = new win.Event(type, { bubbles:true, cancelable:true });
  Object.defineProperties(event, {
    pointerId:{ value:pointerId },
    button:{ value:button },
    clientX:{ value:clientX },
    clientY:{ value:clientY },
  });
  return event;
}

test("buff tracker keeps native nodes and renders a WoW-style title with active count", () => {
  const s = setup();
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  const playerPills = [...list.querySelectorAll(".pokeidle-buff-pill")];
  const serverPill = ticker.querySelector(".pokeidle-event-ticker__pill");
  const mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });

  assert.equal(s.strip.querySelector(".pokeidle-buff-list"), list);
  assert.equal(s.strip.querySelector(".pokeidle-event-ticker"), ticker);
  assert.deepEqual([...list.querySelectorAll(".pokeidle-buff-pill")], playerPills);
  assert.equal(ticker.querySelector(".pokeidle-event-ticker__pill"), serverPill);
  assert.equal(s.strip.querySelector("[data-ppbui-buff-title]").textContent, "Buffs");
  assert.equal(s.strip.querySelector("[data-ppbui-buff-count]").textContent, "3");
  assert.match(s.strip.querySelector("[data-ppbui-buff-drag]").getAttribute("aria-label"), /3 buffs ativos/);
  assert.match(s.strip.querySelector("[data-ppbui-buff-drag]").getAttribute("aria-label"), /setas/i);
  assert.equal(s.strip.dataset.ppbuiBuffCount, "3");
  assert.equal(s.strip.dataset.ppbuiBuffStripLayout, "panel");
  assert.equal(s.strip.dataset.ppbuiBuffStripDock, "free");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-left"), "214px");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-top"), "24px");

  const css = s.doc.querySelector('[data-ppbui-style="buff-strip"]').textContent;
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) auto auto/);
  assert.match(css, /data-ppbui-buff-title[^}]*font:700 var\(--ppbui-font-size-meta\)\/1 var\(--ppbui-font-body\)/s);
  assert.match(css, /data-ppbui-buff-title[^}]*letter-spacing:\.1em/s);
  assert.match(css, /data-ppbui-buff-drag-icon[^}]*color:var\(--ppbui-accent\)/s);
  assert.match(css, /\.pokeidle-buff-list \.pokeidle-buff-pill \{\s*--ppbui-buff-kind:var\(--ppbui-accent-hi\)/s);
  assert.match(css, /\.pokeidle-event-ticker \.pokeidle-event-ticker__pill \{\s*--ppbui-buff-kind:var\(--ppbui-selected\)/s);
  assert.match(css, /border-left:2px solid var\(--ppbui-buff-kind\)/);
  assert.match(css, /border-radius:var\(--ppbui-radius\) !important/);
  assert.equal(s.strip.style.getPropertyValue("padding"), "var(--ppbui-space-3)");
  mounted.cleanup();
  s.dom.window.close();
});

test("buff tracker follows the rendered Team HUD width instead of a fixed panel width", () => {
  const s = setup({ teamHudWidth:320 });
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  const mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });

  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-width"), "320px");
  s.setTeamHudWidth(286);
  mounted.sync();
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-width"), "286px");

  s.setViewport(270, 700);
  mounted.sync();
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-width"), "254px", "reference width is capped by the viewport");
  mounted.cleanup();
  s.dom.window.close();
});

test("free tracker beats native bottom/mobile placement and collapsed-hub rules", () => {
  const s = setup();
  const native = s.doc.createElement("style");
  native.textContent = `
    body.pokeidle-toolbar-bottom:not(.pokeidle-mobile) .pokeidle-buff-strip {
      top:auto !important;
      bottom:52px !important;
      z-index:380 !important;
    }
    body.pokeidle-mobile .pokeidle-buff-strip {
      top:8px !important;
      left:8px !important;
      right:auto !important;
      width:180px !important;
      max-width:46vw !important;
      pointer-events:none !important;
    }
    body:has(.pokeidle-pokehub.is-collapsed) > .pokeidle-buff-strip:not(.is-embedded) {
      display:none !important;
    }
  `;
  s.doc.head.append(native);
  s.doc.body.className = "pokeidle-toolbar-bottom";
  s.toolbar.classList.add("pokeidle-pokehub", "is-collapsed");
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  const mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });

  let computed = s.dom.window.getComputedStyle(s.strip);
  assert.equal(computed.bottom, "auto");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-top"), "24px");
  assert.notEqual(computed.display, "none", "collapsing Poké Hub must not hide the independent tracker");

  s.doc.body.className = "pokeidle-mobile";
  computed = s.dom.window.getComputedStyle(s.strip);
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-left"), "214px");
  assert.equal(computed.pointerEvents, "auto", "mobile native HUD must not disable tracker drag/collapse");
  mounted.cleanup();
  s.dom.window.close();
});

test("active counter reconciles native player/server churn without copying buff state", () => {
  const s = setup();
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  const mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });
  const count = s.strip.querySelector("[data-ppbui-buff-count]");
  assert.equal(count.textContent, "3");

  const added = s.doc.createElement("div");
  added.className = "pokeidle-buff-pill";
  added.innerHTML = "<span>Shiny Capture</span><b>×2</b><time>03:00</time>";
  list.append(added);
  const leaving = s.doc.createElement("div");
  leaving.className = "pokeidle-event-ticker__pill is-leaving";
  ticker.append(leaving);
  mounted.sync();
  assert.equal(count.textContent, "4", "leaving server event is not counted as active");

  added.hidden = true;
  mounted.sync();
  assert.equal(count.textContent, "3");
  added.hidden = false;
  ticker.hidden = true;
  mounted.sync();
  assert.equal(count.textContent, "3", "hidden native ticker is excluded while player buffs remain authoritative");
  ticker.hidden = false;
  ticker.classList.add("is-empty");
  mounted.sync();
  assert.equal(count.textContent, "3", "native empty ticker state excludes stale event pills");
  mounted.cleanup();
  s.dom.window.close();
});

test("server event ticker keeps its native click owner and visible keyboard focus", () => {
  const s = setup();
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  const serverPill = ticker.querySelector(".pokeidle-event-ticker__pill");
  let clicks = 0;
  serverPill.tabIndex = 0;
  serverPill.addEventListener("click", () => clicks++);
  const mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });

  assert.equal(ticker.querySelector(".pokeidle-event-ticker__pill"), serverPill);
  serverPill.click();
  assert.equal(clicks, 1, "Better UI must not replace or proxy the native server-event action");
  assert.equal(serverPill.tabIndex, 0);
  const css = s.doc.querySelector('[data-ppbui-style="buff-strip"]').textContent;
  assert.match(css, /\.pokeidle-event-ticker__pill:focus-visible\s*\{[^}]*outline:var\(--ppbui-focus-width\) solid var\(--ppbui-focus\) !important/s);
  mounted.cleanup();
  serverPill.click();
  assert.equal(clicks, 2, "native listener remains attached after Better UI cleanup");
  s.dom.window.close();
});

test("stable buff reconciliation is mutation-free", async () => {
  const s = setup();
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  const mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });
  const records = [];
  const observer = new s.dom.window.MutationObserver(batch => records.push(...batch));
  observer.observe(s.strip, { attributes:true, childList:true, subtree:true });
  mounted.sync();
  await Promise.resolve();
  observer.disconnect();
  assert.equal(records.length, 0, "observer-scoped reconcile must quiesce when native buffs are unchanged");
  mounted.cleanup();
  s.dom.window.close();
});

test("collapse keeps the header visible, persists state and restores native DOM on cleanup", () => {
  const s = setup();
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  let mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });
  const collapse = s.strip.querySelector("[data-ppbui-buff-collapse]");
  collapse.click();
  assert.equal(s.strip.dataset.ppbuiBuffStripCollapsed, "true");
  assert.equal(collapse.getAttribute("aria-expanded"), "false");
  assert.equal(collapse.textContent, "+");
  assert.deepEqual(JSON.parse(s.dom.window.localStorage.getItem(buffStripConfig.storageKey)), {
    version:1,
    collapsed:true,
  });
  assert.match(s.doc.querySelector('[data-ppbui-style="buff-strip"]').textContent, /data-ppbui-buff-strip-collapsed="true"[^}]*>[\s\S]*display:none !important/s);

  mounted.cleanup();
  assert.equal(s.strip.querySelector("[data-ppbui-buff-panel-header]"), null);
  assert.equal(s.strip.hasAttribute("data-ppbui-buff-strip-collapsed"), false);
  mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });
  assert.equal(s.strip.dataset.ppbuiBuffStripCollapsed, "true", "stored collapse state is restored");
  mounted.cleanup();
  s.dom.window.close();
});

test("drag handle moves the buff tracker freely, clamps it to viewport and persists position", () => {
  const s = setup();
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  let mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });
  const handle = s.strip.querySelector("[data-ppbui-buff-drag]");
  handle.dispatchEvent(pointer(s.dom.window, "pointerdown", { pointerId:7, clientX:220, clientY:30 }));
  s.dom.window.dispatchEvent(pointer(s.dom.window, "pointermove", { pointerId:7, clientX:900, clientY:900 }));
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-left"), "504px");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-top"), "772px");
  s.dom.window.dispatchEvent(pointer(s.dom.window, "pointerup", { pointerId:7, clientX:900, clientY:900 }));
  assert.deepEqual(JSON.parse(s.dom.window.localStorage.getItem(buffStripConfig.storageKey)), {
    version:1,
    left:504,
    top:772,
  });

  mounted.cleanup();
  mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-left"), "504px");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-top"), "772px");
  mounted.cleanup();
  s.dom.window.close();
});

test("free buff tracker ignores toolbar geometry and only clamps to viewport changes", () => {
  const s = setup({ storedState:{ version:1, left:400, top:300 } });
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  const mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-left"), "400px");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-top"), "300px");

  s.setToolbarRect({ left:5, top:700, width:100, height:80, right:105, bottom:780 });
  mounted.sync();
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-left"), "400px");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-top"), "300px");

  s.setViewport(500, 400);
  s.dom.window.dispatchEvent(new s.dom.window.Event("resize"));
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-left"), "192px");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-top"), "272px");
  mounted.cleanup();
  s.dom.window.close();
});

test("drag handle is keyboard movable and persists clamped arrow-key position", () => {
  const s = setup({ storedState:{ version:1, left:200, top:200 } });
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  const mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });
  const handle = s.strip.querySelector("[data-ppbui-buff-drag]");
  assert.equal(handle.tagName, "BUTTON");
  assert.ok(handle.getAttribute("aria-label"));
  handle.dispatchEvent(new s.dom.window.KeyboardEvent("keydown", { key:"ArrowRight", bubbles:true, cancelable:true }));
  handle.dispatchEvent(new s.dom.window.KeyboardEvent("keydown", { key:"ArrowDown", shiftKey:true, bubbles:true, cancelable:true }));
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-left"), "210px");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-top"), "240px");
  assert.deepEqual(JSON.parse(s.dom.window.localStorage.getItem(buffStripConfig.storageKey)), {
    version:1,
    left:210,
    top:240,
  });
  mounted.cleanup();
  s.dom.window.close();
});

test("invalid or future stored buff geometry fails closed without overwriting protected bytes", () => {
  const future = { version:99, left:700, top:700, collapsed:true, future:"keep" };
  const s = setup({ storedState:future });
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  const mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-left"), "214px");
  assert.equal(s.strip.style.getPropertyValue("--ppbui-buff-strip-top"), "24px");
  assert.equal(s.strip.dataset.ppbuiBuffStripCollapsed, "false");
  s.strip.querySelector("[data-ppbui-buff-collapse]").click();
  assert.deepEqual(JSON.parse(s.dom.window.localStorage.getItem(buffStripConfig.storageKey)), future);
  mounted.cleanup();
  s.dom.window.close();

  const corrupt = setup({ storedState:{ version:1, left:null, top:"oops", collapsed:"yes" } });
  const corruptList = corrupt.strip.querySelector(".pokeidle-buff-list");
  const corruptTicker = corrupt.strip.querySelector(".pokeidle-event-ticker");
  const mountedCorrupt = mountBuffStrip({ strip:corrupt.strip, toolbar:corrupt.toolbar, list:corruptList, ticker:corruptTicker });
  assert.equal(corrupt.strip.style.getPropertyValue("--ppbui-buff-strip-left"), "214px");
  assert.equal(corrupt.strip.style.getPropertyValue("--ppbui-buff-strip-top"), "24px");
  assert.equal(corrupt.strip.dataset.ppbuiBuffStripCollapsed, "false");
  mountedCorrupt.cleanup();
  corrupt.dom.window.close();
});

test("buff tracker still owns hostile native surface paint only while mounted", () => {
  const s = setup();
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  for (const surface of [s.strip, list, ticker]) {
    surface.style.setProperty("padding", "8px", "important");
    surface.style.setProperty("border", "1px solid rgb(52, 62, 63)", "important");
    surface.style.setProperty("background", "rgb(31, 42, 44)", "important");
    surface.style.setProperty("box-shadow", "0 0 0 4px rgb(31, 42, 44)", "important");
  }
  const mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });
  assert.equal(s.strip.style.getPropertyValue("background"), "var(--ppbui-bg-1)");
  assert.equal(list.style.getPropertyValue("background"), "transparent");
  assert.equal(ticker.style.getPropertyValue("background"), "transparent");

  mounted.cleanup();
  for (const surface of [s.strip, list, ticker]) {
    assert.equal(surface.style.getPropertyValue("padding-top"), "8px");
    assert.equal(surface.style.getPropertyPriority("padding-top"), "important");
    assert.equal(surface.style.getPropertyValue("background-color"), "rgb(31, 42, 44)");
    assert.equal(surface.style.getPropertyValue("box-shadow"), "0 0 0 4px rgb(31, 42, 44)");
  }
  s.dom.window.close();
});

test("buff tracker moves only the native strip into the toolbar layer and cleanup restores exact origin", () => {
  const s = setup({ separateLayers:true });
  const list = s.strip.querySelector(".pokeidle-buff-list");
  const ticker = s.strip.querySelector(".pokeidle-event-ticker");
  const nativeParent = s.strip.parentNode;
  const nativeAfter = nativeParent.querySelector("[data-native-after-buff]");
  const toolbarParent = s.toolbar.parentNode;
  const mounted = mountBuffStrip({ strip:s.strip, toolbar:s.toolbar, list, ticker });

  assert.equal(s.strip.parentNode, toolbarParent);
  assert.equal(s.toolbar.nextSibling, s.strip);
  assert.equal(list.parentElement, s.strip);
  assert.equal(ticker.parentElement, s.strip);

  mounted.cleanup();
  assert.equal(s.strip.parentNode, nativeParent);
  assert.equal(s.strip.nextSibling, nativeAfter);
  assert.equal(s.strip.querySelector("[data-ppbui-buff-panel-header]"), null);
  assert.equal(s.strip.style.left, "468px");
  assert.equal(s.strip.style.top, "938px");
  assert.equal(s.strip.style.width, "592.24px");
  assert.equal(s.doc.querySelector('[data-ppbui-style="buff-strip"]'), null);
  s.dom.window.close();
});

test("cleanup sanitizes an in-layer native strip replacement before restoring its origin", () => {
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
  assert.equal(replacement.querySelector("[data-ppbui-buff-panel-header]"), null);
  assert.equal(replacement.hasAttribute("data-ppbui-buff-strip"), false);
  assert.equal(replacement.hasAttribute("data-ppbui-buff-strip-collapsed"), false);
  assert.equal(replacement.style.getPropertyValue("--ppbui-buff-strip-left"), "");
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
