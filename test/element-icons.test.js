import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createElementIcon, decorateElementIconList, releaseElementIconLists } from "../src/core/element-icons.js";

test("native Element lists adopt shared square ownership and restore exactly", t => {
  const dom = new JSDOM('<div id="scope"><span id="list" class="pokeidle-element-icons"><span class="native-element-circle"><img src="fire.png" alt="Fire"></span></span></div>');
  t.after(() => dom.window.close());
  const doc = dom.window.document, scope = doc.querySelector("#scope"), list = doc.querySelector("#list"), icon = list.firstElementChild, before = scope.outerHTML;
  decorateElementIconList(list, ["fire"], { definition: () => ({ label: "Fire", color: "#f08030" }) });
  assert.ok(list.classList.contains("ppbui-element-icons")); assert.ok(icon.classList.contains("ppbui-element-icon"));
  assert.equal(icon.style.getPropertyValue("--ppbui-element-color"), "#f08030"); assert.ok(icon.querySelector("img").classList.contains("ppbui-element-icon__image"));
  releaseElementIconLists(scope); assert.equal(scope.outerHTML, before);
});

test("raw native images are extracted from circular host chrome for Better UI-owned Element icons", t => {
  const dom = new JSDOM("<body></body>"); t.after(() => dom.window.close()); const doc = dom.window.document;
  const icons = {
    definition: () => ({ label: "Water", color: "#4389e6" }),
    create: () => { const circle = doc.createElement("span"); circle.className = "native-element-circle"; circle.style.cssText = "border-radius:50%;background:red"; const image = doc.createElement("img"); image.src = "water.png"; circle.append(image); return circle; },
  };
  const node = createElementIcon(doc, icons, "water");
  assert.ok(node.classList.contains("ppbui-element-icon")); assert.equal(node.querySelector(".native-element-circle"), null); assert.ok(node.querySelector("img.ppbui-element-icon__image"));
  assert.equal(node.style.getPropertyValue("--ppbui-element-color"), "#4389e6");
});

test("Better UI-owned decorative Element images cannot inherit a host tab stop", t => {
  const dom = new JSDOM("<body></body>"); t.after(() => dom.window.close()); const doc = dom.window.document;
  const icons = {
    definition: () => ({ label: "Fire", color: "#f08030" }),
    create: () => { const circle = doc.createElement("span"); const image = doc.createElement("img"); image.src = "fire.png"; image.alt = "Fire native"; image.tabIndex = 0; image.title = "native title"; circle.append(image); return circle; },
  };
  const node = createElementIcon(doc, icons, "fire"), image = node.querySelector("img");
  assert.equal(node.getAttribute("aria-hidden"), "true");
  assert.equal(image.getAttribute("aria-hidden"), "true");
  assert.equal(image.alt, "");
  assert.equal(image.hasAttribute("tabindex"), false);
  assert.equal(image.tabIndex, -1);
});

test("scoped ownership restores native Element nodes even after the host detaches them", t => {
  const dom = new JSDOM('<div id="scope"><span id="list" class="pokeidle-element-icons"><span class="native-element-circle"><img src="fire.png" alt="Fire"></span></span></div>');
  t.after(() => dom.window.close());
  const doc = dom.window.document, scope = doc.querySelector("#scope"), list = doc.querySelector("#list"), icon = list.firstElementChild, image = icon.firstElementChild;
  const beforeIcon = icon.outerHTML;
  decorateElementIconList(list, ["fire"], { definition: () => ({ label: "Fire", color: "#f08030" }) }, { scope });
  icon.remove();
  releaseElementIconLists(scope);
  assert.equal(icon.outerHTML, beforeIcon);
  assert.equal(image.classList.contains("ppbui-element-icon__image"), false);
});

test("redecorating an owned native icon clears stale canonical color when the next type is unknown", t => {
  const dom = new JSDOM('<div id="scope"><span id="list" class="pokeidle-element-icons"><span class="native-element-circle"><img src="fire.png" alt="Fire"></span></span></div>');
  t.after(() => dom.window.close());
  const doc = dom.window.document, scope = doc.querySelector("#scope"), list = doc.querySelector("#list"), icon = list.firstElementChild;
  const icons = { definition: type => type === "fire" ? ({ label: "Fire", color: "#f08030" }) : null };
  decorateElementIconList(list, ["fire"], icons, { scope });
  assert.equal(icon.style.getPropertyValue("--ppbui-element-color"), "#f08030");
  decorateElementIconList(list, ["unknown"], icons, { scope });
  assert.equal(icon.style.getPropertyValue("--ppbui-element-color"), "");
  releaseElementIconLists(scope);
});

test("moving a decorated native Element list between scopes transfers ownership without stale cleanup", t => {
  const dom = new JSDOM('<div id="a"><span id="list" class="pokeidle-element-icons"><span class="native-element-circle"><img src="fire.png" alt="Fire"></span></span></div><div id="b"></div>');
  t.after(() => dom.window.close());
  const doc = dom.window.document, a = doc.querySelector("#a"), b = doc.querySelector("#b"), list = doc.querySelector("#list"), icon = list.firstElementChild;
  const before = list.outerHTML;
  const icons = { definition: type => ({ label: type, color: type === "fire" ? "#f08030" : "#4389e6" }) };
  decorateElementIconList(list, ["fire"], icons, { scope: a });
  b.append(list);
  decorateElementIconList(list, ["water"], icons, { scope: b });
  releaseElementIconLists(a);
  assert.ok(list.classList.contains("ppbui-element-icons"));
  assert.ok(icon.classList.contains("ppbui-element-icon"));
  assert.equal(icon.style.getPropertyValue("--ppbui-element-color"), "#4389e6");
  releaseElementIconLists(b);
  assert.equal(list.outerHTML, before);
});

test("releasing an outer scoped consumer does not restore a node transferred to a nested consumer", t => {
  const dom = new JSDOM('<div id="outer"><div id="inner"><span id="list" class="pokeidle-element-icons"><span class="native-element-circle"><img src="fire.png" alt="Fire"></span></span></div></div>');
  t.after(() => dom.window.close());
  const doc = dom.window.document, outer = doc.querySelector("#outer"), inner = doc.querySelector("#inner"), list = doc.querySelector("#list"), icon = list.firstElementChild;
  const before = list.outerHTML, icons = { definition: () => ({ label: "Fire", color: "#f08030" }) };
  decorateElementIconList(list, ["fire"], icons, { scope: outer });
  decorateElementIconList(list, ["fire"], icons, { scope: inner });
  releaseElementIconLists(outer);
  assert.ok(icon.classList.contains("ppbui-element-icon"));
  releaseElementIconLists(inner);
  assert.equal(list.outerHTML, before);
});

test("legacy outer release does not restore nodes owned only by a nested scoped consumer", t => {
  const dom = new JSDOM('<div id="outer"><div id="inner"><span id="list" class="pokeidle-element-icons"><span class="native-element-circle"><img src="fire.png" alt="Fire"></span></span></div></div>');
  t.after(() => dom.window.close());
  const doc = dom.window.document, outer = doc.querySelector("#outer"), inner = doc.querySelector("#inner"), list = doc.querySelector("#list"), icon = list.firstElementChild;
  const before = list.outerHTML, icons = { definition: () => ({ label: "Fire", color: "#f08030" }) };
  decorateElementIconList(list, ["fire"], icons, { scope: inner });
  releaseElementIconLists(outer);
  assert.ok(list.classList.contains("ppbui-element-icons"));
  assert.ok(icon.classList.contains("ppbui-element-icon"));
  assert.equal(icon.style.getPropertyValue("--ppbui-element-color"), "#f08030");
  releaseElementIconLists(inner);
  assert.equal(list.outerHTML, before);
});

test("scoped release also restores legacy descendants while preserving nested foreign ownership", t => {
  const dom = new JSDOM('<div id="outer"><span id="scoped" class="pokeidle-element-icons"><span class="native-element-circle"><img src="fire.png" alt="Fire"></span></span><span id="legacy" class="pokeidle-element-icons"><span class="native-element-circle"><img src="water.png" alt="Water"></span></span><div id="inner"><span id="foreign" class="pokeidle-element-icons"><span class="native-element-circle"><img src="grass.png" alt="Grass"></span></span></div></div>');
  t.after(() => dom.window.close());
  const doc = dom.window.document, outer = doc.querySelector("#outer"), inner = doc.querySelector("#inner");
  const scoped = doc.querySelector("#scoped"), legacy = doc.querySelector("#legacy"), foreign = doc.querySelector("#foreign");
  const beforeScoped = scoped.outerHTML, beforeLegacy = legacy.outerHTML, beforeForeign = foreign.outerHTML;
  const icons = { definition: type => ({ label: type, color: type === "fire" ? "#f08030" : type === "water" ? "#4389e6" : "#7ac74c" }) };
  decorateElementIconList(scoped, ["fire"], icons, { scope: outer });
  decorateElementIconList(legacy, ["water"], icons);
  decorateElementIconList(foreign, ["grass"], icons, { scope: inner });
  releaseElementIconLists(outer);
  assert.equal(scoped.outerHTML, beforeScoped);
  assert.equal(legacy.outerHTML, beforeLegacy);
  assert.ok(foreign.classList.contains("ppbui-element-icons"));
  assert.ok(foreign.firstElementChild.classList.contains("ppbui-element-icon"));
  releaseElementIconLists(inner);
  assert.equal(foreign.outerHTML, beforeForeign);
});

test("redecorating scoped native Element nodes as legacy clears the former scope owner", t => {
  const dom = new JSDOM('<div id="a"><span id="list" class="pokeidle-element-icons"><span class="native-element-circle"><img src="fire.png" alt="Fire"></span></span></div><div id="b"></div>');
  t.after(() => dom.window.close());
  const doc = dom.window.document, a = doc.querySelector("#a"), b = doc.querySelector("#b"), list = doc.querySelector("#list"), icon = list.firstElementChild;
  const before = list.outerHTML, icons = { definition: type => ({ label: type, color: type === "fire" ? "#f08030" : "#4389e6" }) };
  decorateElementIconList(list, ["fire"], icons, { scope: a });
  b.append(list);
  decorateElementIconList(list, ["water"], icons);
  releaseElementIconLists(a);
  assert.ok(list.classList.contains("ppbui-element-icons"));
  assert.ok(icon.classList.contains("ppbui-element-icon"));
  assert.equal(icon.style.getPropertyValue("--ppbui-element-color"), "#4389e6");
  releaseElementIconLists(b);
  assert.equal(list.outerHTML, before);
});
