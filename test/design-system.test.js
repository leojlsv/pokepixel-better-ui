import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createDesignSystemRuntime } from "../src/core/design-system.js";

const styleFiles = ["tokens.css", "base.css", "components.css", "states.css"];
const css = styleFiles.map(name => readFileSync(new URL(`../src/styles/${name}`, import.meta.url), "utf8")).join("\n");

function globals(t, window) {
  const names = ["document", "requestAnimationFrame", "cancelAnimationFrame", "MutationObserver"];
  const previous = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  Object.defineProperty(globalThis, "document", { configurable: true, value: window.document });
  Object.defineProperty(globalThis, "requestAnimationFrame", { configurable: true, value: callback => window.setTimeout(callback, 0) });
  Object.defineProperty(globalThis, "cancelAnimationFrame", { configurable: true, value: id => window.clearTimeout(id) });
  Object.defineProperty(globalThis, "MutationObserver", { configurable: true, value: window.MutationObserver });
  t.after(() => {
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
}

test("design tokens match the approved pixel-art foundation and stay in the PPBUI namespace", () => {
  for (const token of [
    "--ppbui-space-1: 2px", "--ppbui-space-7: 24px", "--ppbui-bg-0: #0b0e14",
    "--ppbui-bg-3: #252e3d", "--ppbui-text-subtle: #8f9caf", "--ppbui-accent: #f3c969", "--ppbui-focus: #70d6ff",
    "--ppbui-control-height: 32px", "--ppbui-action-height: 36px", "--ppbui-border-width: 2px",
  ]) assert.ok(css.includes(token), `missing ${token}`);
  assert.doesNotMatch(css, /--(?:ui|quality)-[\w-]+\s*:/i);
});

test("public opt-in component classes stay stable for module interoperability", () => {
  for (const primitive of [
    "ppbui-surface", "ppbui-card", "ppbui-button", "ppbui-button--primary", "ppbui-button--danger",
    "ppbui-button--ghost", "ppbui-icon-button", "ppbui-field", "ppbui-input", "ppbui-select", "ppbui-dialog",
    "ppbui-toolbar", "ppbui-badge", "ppbui-progress",
  ]) assert.ok(css.includes(`.${primitive}`), `missing .${primitive}`);
  for (const state of [
    "ppbui-is-selected", "ppbui-is-pending", "ppbui-is-error", "ppbui-is-success", "ppbui-is-warning", "ppbui-focusable",
  ]) assert.ok(css.includes(`.${state}`), `missing .${state}`);
});

test("shared CSS is opt-in and cannot broadly restyle host game controls", () => {
  assert.doesNotMatch(css, /(?:^|})\s*\*\s*\{/m);
  assert.doesNotMatch(css, /(?:^|})\s*(?:button|input|select)\s*(?:,|\{)/m);
  assert.doesNotMatch(css, /\.(?:pokeidle|hunt|inventory|storage|trade|team|auto-helper)-/i);
});

test("shared button and field states preserve semantic edges and approved disabled treatment", () => {
  const normalized = css.replace(/\s+/g, " ");
  assert.match(normalized, /\.ppbui-button:hover[^}]+background: var\(--ppbui-bg-3\)/);
  assert.match(normalized, /\.ppbui-button--primary:hover[^}]+border-color: var\(--ppbui-accent-hi\)/);
  assert.match(normalized, /\.ppbui-button--danger:hover[^}]+border-color: var\(--ppbui-danger\)/);
  assert.match(normalized, /\.ppbui-input:hover[^}]+border-color: var\(--ppbui-border-strong\)/);
  assert.match(normalized, /\.ppbui-button:active[^}]+background: var\(--ppbui-bg-0\)/);
  assert.match(normalized, /\.ppbui-button--primary:active[^}]+border-color: var\(--ppbui-accent\)/);
  assert.match(normalized, /\.ppbui-button--danger:active[^}]+border-color: var\(--ppbui-danger\)/);
  assert.match(normalized, /\.ppbui-button:disabled,[^}]+border-color: var\(--ppbui-border\); background: var\(--ppbui-bg-1\); color: var\(--ppbui-text-subtle\); box-shadow: none/);
  assert.doesNotMatch(normalized, /\.ppbui-button:disabled,[^}]+opacity:/);
});

test("shared CSS parses as a stylesheet in the synthetic DOM", t => {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>");
  t.after(() => dom.window.close());
  const style = dom.window.document.createElement("style");
  style.textContent = css;
  dom.window.document.head.append(style);
  assert.ok(style.sheet);
  assert.ok(style.sheet.cssRules.length > 0);
});

test("runtime injects one singleton style node and removes only its owned node", t => {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>");
  t.after(() => dom.window.close());
  const runtime = createDesignSystemRuntime({ cssText: ".ppbui-fixture{display:block}", document: dom.window.document });
  const first = runtime.mount();
  assert.equal(runtime.mount(), first);
  assert.equal(dom.window.document.querySelectorAll('style[data-ppbui-design-system="1"]').length, 1);
  assert.equal(first.textContent, ".ppbui-fixture{display:block}");
  runtime.unmount();
  assert.equal(dom.window.document.querySelector('style[data-ppbui-design-system="1"]'), null);

  const external = dom.window.document.createElement("style");
  external.dataset.ppbuiDesignSystem = "1";
  external.textContent = ".external{display:block}";
  dom.window.document.head.append(external);
  const follower = createDesignSystemRuntime({ cssText: "replacement", document: dom.window.document });
  assert.equal(follower.mount(), external);
  follower.unmount();
  assert.equal(external.isConnected, true);
  assert.equal(external.textContent, ".external{display:block}");
});

test("bootstrap mounts design system before modules and cleans it across restart", t => {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", { pretendToBeVisual: true });
  globals(t, dom.window);
  t.after(() => dom.window.close());
  const runtime = createDesignSystemRuntime({ cssText: ".ppbui-fixture{display:block}" });
  let mounts = 0;
  const app = createBetterUI({ designSystem: runtime, modules: [{
    id: "fixture",
    shouldMount: () => true,
    mount() {
      mounts++;
      assert.equal(runtime.isMounted(), true);
      return () => {};
    },
  }] });

  app.start();
  app.start();
  assert.equal(mounts, 1);
  assert.equal(dom.window.document.querySelectorAll('style[data-ppbui-design-system="1"]').length, 1);
  app.stop();
  assert.equal(runtime.isMounted(), false);
  assert.equal(dom.window.document.querySelector('style[data-ppbui-design-system="1"]'), null);
  app.start();
  assert.equal(mounts, 2);
  assert.equal(dom.window.document.querySelectorAll('style[data-ppbui-design-system="1"]').length, 1);
  app.stop();
});
