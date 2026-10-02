import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createDesignSystemRuntime } from "../src/core/design-system.js";
import { huntsStyles } from "../src/modules/hunts/styles.js";

const styleFiles = ["tokens.css", "base.css", "components.css", "states.css"];
const css = styleFiles.map(name => readFileSync(new URL(`../src/styles/${name}`, import.meta.url), "utf8")).join("\n");
const nativeOverridesCss = readFileSync(new URL("../src/styles/native-overrides.css", import.meta.url), "utf8");
const relativeLuminance = hex => {
  const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
};
const contrast = (a, b) => {
  const values = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
};

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

test("design tokens expose the approved Game Palette, native typography and fixed native geometry", () => {
  for (const token of [
    "--ppbui-space-1: 2px", "--ppbui-space-7: 24px", "--ppbui-m16-charcoal: #232228",
    "--ppbui-m16-navy: #284261", "--ppbui-m16-stone: #5f5854", "--ppbui-m16-gold: #e3c054", "--ppbui-m16-cyan: #54bad2",
    "--ppbui-surface-window: rgba(22, 29, 32, .92)", "--ppbui-surface-interactive: rgba(35, 44, 46, .96)",
    "--ppbui-surface-values: rgba(22, 29, 32, .85)", "--ppbui-line: #6b6543", "--ppbui-line-width: 1px",
    "--ppbui-bg-0: var(--ppbui-surface-values)", "--ppbui-bg-1: var(--ppbui-surface-window)", "--ppbui-bg-2: var(--ppbui-surface-interactive)",
    "--ppbui-bg-3: var(--ppbui-surface-interactive)", "--ppbui-action-bg: var(--ppbui-surface-interactive)",
    "--ppbui-border: var(--ppbui-line)", "--ppbui-border-strong: var(--ppbui-line)", "--ppbui-text: var(--ppbui-m16-ivory)",
    "--ppbui-accent: var(--ppbui-m16-blue)", "--ppbui-selected: var(--ppbui-m16-gold)", "--ppbui-success: var(--ppbui-m16-green)",
    "--ppbui-danger: var(--ppbui-m16-red)", "--ppbui-danger-hi: var(--ppbui-m16-salmon)", "--ppbui-focus: var(--ppbui-m16-cyan)",
    '--ppbui-font-body: "Inter", "Segoe UI", Arial, sans-serif', '--ppbui-font-data: "Inter", "Segoe UI", Arial, sans-serif',
    '--ppbui-font-display: "Cinzel", Georgia, serif',
    "--ppbui-font-size-body: 12px", "--ppbui-font-size-meta: 10px",
    "--ppbui-control-height: 28px", "--ppbui-action-height: 28px", "--ppbui-button-1x1-size: 28px",
    "--ppbui-button-2x1-width: 56px", "--ppbui-button-2x1-height: 28px", "--ppbui-border-width: var(--ppbui-line-width)", "--ppbui-focus-width: 2px",
    "--ppbui-window-radius: 8px", "--ppbui-radius: 5px", "--ppbui-control-radius: 5px", "--ppbui-radius-badge: 4px",
    "--ppbui-scrollbar-size: 10px", "--ppbui-shadow-raised: var(--ppbui-shadow)",
  ]) assert.ok(css.includes(token), `missing ${token}`);
  assert.doesNotMatch(css, /data-ppbui-corners|--ppbui-window-radius:\s*0px|--ppbui-control-radius:\s*0px|--ppbui-radius-badge:\s*0px/);
  assert.match(css, /\.ppbui-button:focus-visible,[\s\S]*?outline: var\(--ppbui-focus-width\) solid var\(--ppbui-focus\);/);
  assert.doesNotMatch(css, /--(?:ui|quality)-[\w-]+\s*:/i);
});

test("representative outer module shells use the native window radius role", () => {
  const cases = [
    ["inventory/controller.js", /\.inventory-window--slots\.ppbui-window \{[^}]*border-radius:var\(--ppbui-window-radius\)/s],
    ["storage/controller.js", /\.storage-window\.ppbui-window \{[^}]*border-radius:var\(--ppbui-window-radius\)/s],
    ["team/controller.js", /\.pokeidle-team-panel\[data-ppbui-team-enhanced\] \{[^}]*border-radius:var\(--ppbui-window-radius\)/s],
    ["team-hud/controller.js", /\.pokeidle-team-hud\[data-ppbui-team-hud-enhanced\] \{[^}]*border-radius:var\(--ppbui-window-radius\)/s],
    ["hunts/styles.js", /\.ppbui-hunts-enhanced \{[^}]*border-radius:var\(--ppbui-window-radius\)/s],
    ["marks-shop/styles.js", /\.npc-shop-window\.ppbui-marks-shop\.ppbui-window \{[^}]*border-radius:var\(--ppbui-window-radius\)/s],
    ["auto-helper/controller.js", /\.auto-helper-panel\[data-ppbui-auto-helper\]\.ppbui-window \{[^}]*border-radius:var\(--ppbui-window-radius\)/s],
    ["pokemon-tools/trade-ui.js", /\.trade-session-window\.ppbui-window \{[^}]*border-radius:var\(--ppbui-window-radius\)/s],
    ["pokemon-profile/controller.js", /\[data-ppbui-pokemon-profile-window\] \{[^}]*border-radius:var\(--ppbui-window-radius\)!important;/s],
  ];
  for (const [name, pattern] of cases) {
    const moduleCss = readFileSync(new URL(`../src/modules/${name}`, import.meta.url), "utf8");
    assert.match(moduleCss, pattern, `${name} must use the window radius token for its outer shell`);
  }
});

test("public opt-in component classes stay stable for module interoperability", () => {
  for (const primitive of [
    "ppbui-root", "ppbui-surface", "ppbui-window", "ppbui-panel", "ppbui-section", "ppbui-titlebar", "ppbui-card",
    "ppbui-button", "ppbui-button--1x1", "ppbui-button--2x1", "ppbui-button--action", "ppbui-button--primary", "ppbui-button--danger",
    "ppbui-button--ghost", "ppbui-button--compact", "ppbui-icon-button", "ppbui-icon-button--compact", "ppbui-action-row",
    "ppbui-meter-row", "ppbui-meter-row__label",
    "ppbui-pokemon-card", "ppbui-pokemon-card--hud", "ppbui-pokemon-card--roster", "ppbui-pokemon-card--preset", "ppbui-pokemon-card__position", "ppbui-pokemon-card__meta", "ppbui-pokemon-card__meter",
    "ppbui-field", "ppbui-input", "ppbui-textarea", "ppbui-select", "ppbui-dialog", "ppbui-toolbar",
    "ppbui-list", "ppbui-list-row", "ppbui-status", "ppbui-badge", "ppbui-element-icons", "ppbui-element-icon", "ppbui-element-icon--small", "ppbui-quality-badge",
    "ppbui-scroll", "ppbui-scroll-scope", "ppbui-scroll-x", "ppbui-scroll-y", "ppbui-separator", "ppbui-progress",
  ]) assert.ok(css.includes(`.${primitive}`), `missing .${primitive}`);
  for (const state of [
    "ppbui-is-selected", "ppbui-is-pending", "ppbui-is-error", "ppbui-is-success", "ppbui-is-warning", "ppbui-focusable",
  ]) assert.ok(css.includes(`.${state}`), `missing .${state}`);
});

test("shared CSS is opt-in and cannot broadly restyle host game controls", () => {
  assert.doesNotMatch(css, /(?:^|})\s*\*\s*\{/m);
  assert.doesNotMatch(css, /(?:^|})\s*(?:button|input|select)\s*(?:,|\{)/m);
  assert.doesNotMatch(css, /\[data-ppbui-module\][^{]*(?:button|input|textarea|select)/m, "module ownership markers must not restyle mixed native descendants");
  assert.match(css, /\.ppbui-root :where\(button:not\(\.ppbui-button\)\)/, "full-surface native control ownership requires an explicit ppbui-root class without resetting PPBUI primitives");
  assert.match(css, /\.ppbui-root :where\(input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\):not\(\.ppbui-input\), select:not\(\.ppbui-select\), textarea:not\(\.ppbui-textarea\)\)/, "master field chrome is scoped to the explicit root, excludes binary inputs and leaves PPBUI primitives authoritative");
  assert.doesNotMatch(css, /\.(?:hunt|inventory|storage|trade|team|auto-helper)-/i);
  assert.doesNotMatch(css, /\.pokeidle-(?!btn\.ppbui-button)/i, "host bridge must require both native and PPBUI opt-in classes");
});

test("global native override removes only the host animated button border effect", () => {
  const normalized = nativeOverridesCss.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ");
  const glintOnly = nativeOverridesCss.split("Product-wide square geometry.")[0]
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ");
  assert.match(normalized, /\.pokeidle-panel,[^}]+\.pokeidle-mini-view \.mini[^}]+button:where\([^}]+:not\(\[class\*="slot"\]\):not\(\[class\*="sprite"\]\):not\(\[class\*="close"\]\)[^}]+--ui-border-start: transparent !important;[^}]+--ui-border-end: transparent !important;/);
  assert.match(normalized, /:where\(\.pokeidle-btn, \.rubinot-btn, \.pokeidle-ui-button\) \{[^}]+--ui-border-start: transparent !important;[^}]+--ui-border-end: transparent !important;/);
  assert.doesNotMatch(glintOnly, /::(?:before|after)/, "glint removal itself must not destroy semantic pseudo-elements");
  assert.doesNotMatch(glintOnly, /\b(?:background|border|box-shadow|color|filter|opacity|transform)\s*:/, "glint removal must not redesign native button states");
  assert.doesNotMatch(glintOnly, /(?:^|})\s*button\s*\{/m, "glint removal has no unscoped button reset");
});

test("global native override no longer rewrites host geometry", () => {
  const normalized = nativeOverridesCss.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ");
  assert.doesNotMatch(normalized, /ppbui-square-cascade-root/);
  assert.doesNotMatch(normalized, /border-radius\s*:/, "host corner geometry stays native");
  assert.doesNotMatch(normalized, /::-webkit-|::-moz-|::file-selector-button/, "browser-owned controls stay native");
});

test("shared status surfaces use the Values role", () => {
  const normalized = css.replace(/\s+/g, " ");
  assert.match(normalized, /\.ppbui-status \{[^}]*background: var\(--ppbui-bg-0\);[^}]*color: var\(--ppbui-text\);/);
  assert.doesNotMatch(normalized, /\.ppbui-status \{[^}]*rgba\(/, "status chrome resolves through the shared Values token");
});

test("shared button and field states preserve semantic edges and approved disabled treatment", () => {
  const normalized = css.replace(/\s+/g, " ");
  assert.match(normalized, /\.ppbui-button:hover:where\([^}]+background: var\(--ppbui-bg-3\)/);
  assert.match(normalized, /\.ppbui-button--primary:hover:where\([^}]+border-color: var\(--ppbui-accent-hi\);[^}]+background: var\(--ppbui-action-bg\);[^}]+color: var\(--ppbui-accent-hi\)/);
  assert.match(normalized, /\.ppbui-button--danger:hover:where\([^}]+border-color: var\(--ppbui-danger-hi\)/);
  assert.match(normalized, /\.ppbui-input:hover[^}]+border-color: var\(--ppbui-border-strong\)/);
  assert.match(normalized, /\.ppbui-button:active:where\([^}]+background: var\(--ppbui-bg-3\)/);
  assert.match(normalized, /\.ppbui-button--primary:active:where\([^}]+border-color: var\(--ppbui-accent-hi\);[^}]+background: var\(--ppbui-action-bg\);[^}]+color: var\(--ppbui-accent-hi\)/);
  assert.match(normalized, /\.ppbui-button--danger:active:where\([^}]+border-color: var\(--ppbui-danger\)/);
  assert.match(normalized, /\.ppbui-button \{[^}]*display: inline-flex;[^}]*align-items: center;[^}]*justify-content: center;/);
  assert.match(normalized, /\.ppbui-button--compact \{[^}]*min-height: var\(--ppbui-compact-control-height\)/);
  assert.match(normalized, /\.ppbui-button--action \{[^}]*min-height: var\(--ppbui-action-height\)/);
  assert.doesNotMatch(normalized, /\.ppbui-button--(?:primary|danger) \{[^}]*min-height:/, "semantic variants must not silently change button geometry");
  assert.match(normalized, /\.ppbui-icon-button--compact \{[^}]*width: var\(--ppbui-compact-icon-button-size\)/);
  assert.match(normalized, /\.ppbui-meter-row \{[^}]*grid-template-columns: var\(--ppbui-meter-label-width, 32px\) minmax\(0, 1fr\)/);
  assert.match(normalized, /\.ppbui-pokemon-card \{[^}]*--ppbui-pokemon-card-border: var\(--ppbui-border-strong\);[^}]*--ppbui-pokemon-card-bottom-border:[^}]*border: var\(--ppbui-border-width\) solid var\(--ppbui-pokemon-card-border\) !important;[^}]*border-bottom: var\(--ppbui-border-width\) solid var\(--ppbui-pokemon-card-bottom-border\) !important;[^}]*background: var\(--ppbui-bg-2\) !important/);
  assert.match(normalized, /\.ppbui-pokemon-card\.ppbui-pokemon-card--active \{[^}]*--ppbui-pokemon-card-right-border: var\(--ppbui-success\)/);
  assert.match(normalized, /\.ppbui-pokemon-card\.ppbui-pokemon-card--selected,[^}]*--ppbui-pokemon-card-top-border: var\(--ppbui-selected\)/, "selected Pokémon edge uses a flat gold border independently from blue action/focus semantics");
  assert.match(normalized, /\.ppbui-pokemon-card \{[^}]*border-top-color: var\(--ppbui-pokemon-card-top-border\) !important;[^}]*border-right-color: var\(--ppbui-pokemon-card-right-border\) !important;[^}]*box-shadow: none !important;/, "shared Pokémon state grammar uses flat semantic edges without inset depth");
  assert.match(normalized, /\.ppbui-button\[aria-pressed="true"\],[^}]*border-color: var\(--ppbui-selected\) !important;/, "persistent selection uses Miyazaki gold instead of the action-blue role");
  assert.match(normalized, /\.ppbui-pokemon-card\.ppbui-pokemon-card--fainted \{[^}]*--ppbui-pokemon-card-border: var\(--ppbui-danger\);[^}]*--ppbui-pokemon-card-bottom-border: var\(--ppbui-danger\);[^}]*--ppbui-pokemon-card-top-border: var\(--ppbui-danger\);[^}]*--ppbui-pokemon-card-right-border: var\(--ppbui-danger\);[^}]*border-color: var\(--ppbui-pokemon-card-border\) !important/);
  assert.doesNotMatch(normalized, /\.ppbui-pokemon-card \{[^}]*--ppbui-pokemon-card-height:/, "shared state shell must not force one geometry across Team surfaces");
  assert.match(normalized, /\.ppbui-pokemon-card--hud \{[^}]*height: 52px;/);
  assert.match(normalized, /\.ppbui-pokemon-card--roster \{[^}]*height: 72px;/);
  assert.match(normalized, /\.ppbui-pokemon-card--preset \{[^}]*height: 44px;/);
  assert.match(normalized, /\.ppbui-pokemon-card:is\(button, \[role="button"\]\):hover[^}]*:not\(\.ppbui-pokemon-card--fainted\)/, "fainted danger edge must not be replaced by neutral hover chrome");
  assert.match(normalized, /\.ppbui-button:disabled,[^}]+border-color: var\(--ppbui-border\); background: var\(--ppbui-bg-1\); color: var\(--ppbui-text-subtle\); box-shadow: none; filter: none; opacity: 1/);
  assert.match(normalized, /\.ppbui-button \{[^}]*appearance: none;[^}]*min-width: var\(--ppbui-button-2x1-width\);[^}]*border: var\(--ppbui-border-width\) solid var\(--ppbui-border-strong\);[^}]*border-radius: var\(--ppbui-control-radius\);[^}]*background: var\(--ppbui-bg-2\);[^}]*box-shadow: none;/);
  assert.match(normalized, /\.pokeidle-btn\.ppbui-button \{[^}]*border: var\(--ppbui-border-width\) solid var\(--ppbui-border-strong\) !important;[^}]*border-radius: var\(--ppbui-control-radius\) !important;[^}]*background: var\(--ppbui-bg-2\) !important;[^}]*box-shadow: none !important;/);
  assert.match(normalized, /\.game-window__search\.ppbui-input, \.game-window__select\.ppbui-select \{[^}]*height: var\(--ppbui-control-height\) !important;[^}]*border: var\(--ppbui-border-width\) solid var\(--ppbui-border-strong\) !important;[^}]*border-radius: var\(--ppbui-radius-badge\) !important;[^}]*background: var\(--ppbui-bg-0\) !important;[^}]*box-shadow: none !important;/, "opted-in native Team fields own corner geometry through the shared appearance tokens");
  assert.match(normalized, /\.game-window__search\.ppbui-input, \.game-window__select\.ppbui-select \{[^}]*-webkit-appearance: none !important;[^}]*appearance: none !important;[^}]*background-image: none !important;[^}]*clip-path: none !important;/, "opted-in native fields release hostile native/UA search chrome");
  assert.match(normalized, /\.game-window__search\.ppbui-input:hover:not\(:disabled\), \.game-window__select\.ppbui-select:hover:not\(:disabled\) \{[^}]*border-color: var\(--ppbui-border-strong\) !important;/, "host-backed PPBUI fields retain visible hover affordance");
  assert.match(normalized, /\.game-window__search\.ppbui-input:disabled, \.game-window__select\.ppbui-select:disabled \{[^}]*background: var\(--ppbui-bg-1\) !important;[^}]*color: var\(--ppbui-text-subtle\) !important;[^}]*opacity: 1 !important;/, "host-backed PPBUI fields retain explicit disabled chrome");
  assert.match(normalized, /\.ppbui-button--primary \{[^}]*border-color: var\(--ppbui-accent\);[^}]*background: var\(--ppbui-bg-2\);[^}]*color: var\(--ppbui-accent-hi\);/);
  assert.match(normalized, /\.ppbui-button--primary \{[^}]*box-shadow: none;/, "master primary buttons stay flat and reserve elevation for actual surfaces");
  assert.match(normalized, /\.pokeidle-btn\.ppbui-button\.ppbui-button--primary \{[^}]*border-color: var\(--ppbui-accent\) !important;[^}]*background: var\(--ppbui-bg-2\) !important;[^}]*color: var\(--ppbui-accent-hi\) !important;/);
  assert.match(normalized, /\.ppbui-button--danger \{[^}]*border-color: var\(--ppbui-danger\);[^}]*background: var\(--ppbui-danger-bg\);[^}]*color: var\(--ppbui-text\);/);
  assert.match(normalized, /\.pokeidle-btn\.ppbui-button\.ppbui-button--danger \{[^}]*border-color: var\(--ppbui-danger\) !important;[^}]*background: var\(--ppbui-danger-bg\) !important;[^}]*color: var\(--ppbui-text\) !important;/);
});

test("primary action text keeps WCAG contrast in resting and interactive Miyazaki states", () => {
  assert.ok(contrast("#54bad2", "#232228") >= 4.5, "cyan action text must be readable on the resting charcoal surface");
  assert.ok(contrast("#54bad2", "#284261") >= 4.5, "cyan action text must be readable on the navy hover/pressed surface");
});

test("master controls expose exact 1:1 and 2:1 pixel ratios", () => {
  const normalized = css.replace(/\s+/g, " ");
  assert.match(normalized, /\.ppbui-button--1x1 \{[^}]*width: var\(--ppbui-button-1x1-size\);[^}]*height: var\(--ppbui-button-1x1-size\);/);
  assert.match(normalized, /\.ppbui-button--2x1 \{[^}]*width: var\(--ppbui-button-2x1-width\);[^}]*height: var\(--ppbui-button-2x1-height\);/);
});

test("master fields, boxes and scrollbars use the Game Palette and appearance radii", () => {
  const normalized = css.replace(/\s+/g, " ");
  assert.match(normalized, /\.ppbui-window,[^}]+border: var\(--ppbui-border-width\) solid var\(--ppbui-border-strong\);[^}]*border-radius: var\(--ppbui-window-radius\);[^}]*background: var\(--ppbui-bg-1\);/);
  assert.match(normalized, /\.ppbui-input,[^}]+\.ppbui-select \{[^}]*border: var\(--ppbui-border-width\) solid var\(--ppbui-border-strong\);[^}]*background: var\(--ppbui-bg-0\);[^}]*font: 400 var\(--ppbui-font-size-body\)/);
  assert.match(normalized, /\.ppbui-scroll::-webkit-scrollbar \{ width: var\(--ppbui-scrollbar-size\); height: var\(--ppbui-scrollbar-size\); \}/);
  assert.match(normalized, /\.ppbui-scroll::-webkit-scrollbar-thumb \{[^}]*border: var\(--ppbui-border-width\) solid var\(--ppbui-border-strong\);[^}]*border-radius: var\(--ppbui-radius-badge\);[^}]*background: var\(--ppbui-scrollbar-thumb\);/);
  assert.match(normalized, /\.ppbui-scroll::-webkit-scrollbar-button \{[^}]*display: none;[^}]*width: 0;[^}]*height: 0;/);
  assert.match(normalized, /\.ppbui-scroll-scope,[^}]*\.ppbui-scroll-scope \* \{[^}]*scrollbar-color: var\(--ppbui-scrollbar-thumb\) var\(--ppbui-scrollbar-track\) !important;/);
  assert.match(normalized, /@supports selector\(::-webkit-scrollbar\) \{[^}]*\.ppbui-scroll,[^}]*\.ppbui-scroll-scope,[^}]*\.ppbui-scroll-scope \* \{ scrollbar-color: auto !important; \}/);
  assert.match(normalized, /\.ppbui-scroll-x \{ overflow-x: auto; \}/);
  assert.match(normalized, /\.ppbui-scroll-y \{ overflow-y: auto; \}/);
});

test("Element and quality domain primitives preserve semantic colors with fixed native-aligned geometry", () => {
  const normalized = css.replace(/\s+/g, " ");
  assert.match(normalized, /\.ppbui-element-icon \{[^}]*--ppbui-element-swatch: var\(--ppbui-element-color, var\(--element-color, var\(--ppbui-border-strong\)\)\);[^}]*width: 24px !important;[^}]*height: 24px !important;[^}]*border: var\(--ppbui-separator-width\) solid var\(--ppbui-element-swatch\) !important;[^}]*border-radius: var\(--ppbui-radius-badge\) !important;[^}]*background: color-mix\(in srgb, var\(--ppbui-element-swatch\) 28%, var\(--ppbui-bg-0\)\) !important;/);
  assert.doesNotMatch(normalized, /\.ppbui-element-icon \{[^}]*background: var\(--ppbui-element-color/, "canonical Element color must not fill the entire tile behind a same-color symbol");
  assert.match(normalized, /\.ppbui-element-icon--fallback \{[^}]*color: var\(--ppbui-text\) !important;/, "fallback glyph remains readable against the tinted dark well");
  assert.match(normalized, /\.ppbui-element-icon--small \{[^}]*width: 20px !important;[^}]*height: 20px !important;/);
  assert.match(normalized, /\.ppbui-quality-badge \{[^}]*border: var\(--ppbui-separator-width\) solid var\(--ppbui-quality-color\) !important;[^}]*border-left-width: var\(--ppbui-border-width\) !important;[^}]*border-radius: var\(--ppbui-radius-badge\) !important;[^}]*background: var\(--ppbui-bg-2\) !important;/);
  for (const quality of ["weak", "common", "uncommon", "rare", "epic", "legendary", "mythical"]) {
    assert.ok(normalized.includes(`.ppbui-quality-badge.quality-${quality} { --ppbui-quality-color: var(--quality-${quality}); }`));
  }
});

test("opt-in PPBUI buttons override hostile native important chrome without a host reset", t => {
  const nativeCss = `.pokeidle-btn{min-height:34px!important;padding:8px 14px!important;border:1px solid red!important;border-radius:9px!important;background:red!important;background-image:linear-gradient(red,black)!important;color:black!important;box-shadow:4px 4px black!important;filter:brightness(2)!important;font:600 11px/1 Arial!important;transform:scale(.98)!important}.pokeidle-btn:hover{background:purple!important;filter:brightness(3)!important;transform:scale(1.04)!important}.pokeidle-btn:active{background:orange!important;transform:scale(.94)!important}.pokeidle-btn:disabled{opacity:.42!important;filter:saturate(.4)!important;transform:scale(.9)!important}`;
  const markup = "<!doctype html><html><head></head><body><button id='enabled' class='pokeidle-btn ppbui-button ppbui-button--compact ppbui-button--primary'>Manage</button><button id='disabled' class='pokeidle-btn ppbui-button ppbui-button--compact' disabled>Manage</button></body></html>";
  const computedCss = css
    .replaceAll("var(--ppbui-bg-2)", "#232228")
    .replaceAll("var(--ppbui-accent)", "#2485a6")
    .replaceAll("var(--ppbui-accent-hi)", "#54bad2")
    .replaceAll("var(--ppbui-action-bg)", "#284261");
  for (const order of ["native-first", "native-last"]) {
    const dom = new JSDOM(markup, { pretendToBeVisual: true });
    t.after(() => dom.window.close());
    const native = dom.window.document.createElement("style"); native.textContent = nativeCss;
    const better = dom.window.document.createElement("style"); better.textContent = computedCss;
    dom.window.document.head.append(...(order === "native-first" ? [native, better] : [better, native]));
    if (order === "native-last") {
      assert.equal(dom.window.document.styleSheets[0].ownerNode, better);
      assert.equal(dom.window.document.styleSheets[1].ownerNode, native);
      continue;
    }
    const enabled = dom.window.getComputedStyle(dom.window.document.getElementById("enabled"));
    assert.equal(enabled.backgroundImage, "none", order);
    assert.equal(enabled.color, "rgb(84, 186, 210)", order);
    assert.equal(enabled.filter, "none", order);
    assert.equal(enabled.transform, "none", order);
    const disabled = dom.window.getComputedStyle(dom.window.document.getElementById("disabled"));
    assert.equal(disabled.opacity, "1", order);
    assert.equal(disabled.filter, "none", order);
    assert.equal(disabled.transform, "none", order);
  }
  const normalized = css.replace(/\s+/g, " ");
  assert.match(normalized, /\.pokeidle-btn\.ppbui-button \{[^}]*border-radius: var\(--ppbui-control-radius\) !important;[^}]*background-image: none !important;[^}]*transform: none !important;/, "the dual-class host bridge owns native radius via the shared appearance token and removes gradient/transform");
  assert.match(normalized, /\.pokeidle-btn\.ppbui-button:hover:where\([^}]*background: var\(--ppbui-bg-3\) !important;[^}]*filter: none !important;[^}]*transform: none !important;/, "hybrid hover chrome must outrank host hover regardless of stylesheet order");
  assert.match(normalized, /\.pokeidle-btn\.ppbui-button:active:where\([^}]*background: var\(--ppbui-bg-3\) !important;[^}]*filter: none !important;[^}]*transform: none !important;/, "hybrid pressed chrome must outrank host active regardless of stylesheet order");
  assert.match(normalized, /\.pokeidle-btn\.ppbui-button:disabled, \.pokeidle-btn\.ppbui-button\[aria-disabled="true"\] \{[^}]*opacity: 1 !important;[^}]*transform: none !important;/, "hybrid disabled chrome must outrank host disabled regardless of stylesheet order");
  assert.doesNotMatch(normalized, /\.ppbui-button\[class\]/, "pure PPBUI controls must not gain artificial specificity");
});

test("Hunt Atlas primary action keeps scoped module hierarchy without being reset by ppbui-root", t => {
  const markup = "<!doctype html><html><head></head><body><div class='ppbui-root'><button id='hunt' class='ppbui-button ppbui-button--action ppbui-button--primary ppbui-hunts-inspector__hunt'>Entrar na Hunt</button></div></body></html>";
  const dom = new JSDOM(markup, { pretendToBeVisual: true });
  t.after(() => dom.window.close());
  const shared = dom.window.document.createElement("style"); shared.textContent = css;
  const hunts = dom.window.document.createElement("style"); hunts.textContent = huntsStyles;
  dom.window.document.head.append(shared, hunts);
  const hunt = dom.window.document.getElementById("hunt");
  const resting = dom.window.getComputedStyle(hunt);
  assert.equal(resting.background, "var(--ppbui-bg-0)");
  assert.equal(resting.color, "var(--ppbui-accent-hi)");
  assert.equal(resting.boxShadow, "none");
  assert.equal(resting.minHeight, "var(--ppbui-control-height)");
  assert.match(huntsStyles, /\.ppbui-hunts-inspector__hunt\s*\{[^}]*padding:0 var\(--ppbui-control-padding-x\)/s);

  const forceActive = source => source
    .replaceAll(':active:where(:not(:disabled):not([aria-disabled="true"]))', '.ppbui-test-active:where(:not(:disabled):not([aria-disabled="true"]))')
    .replaceAll(':active:not(:disabled):not([aria-disabled="true"])', '.ppbui-test-active:not(:disabled):not([aria-disabled="true"])')
    .replaceAll(':active:not(:disabled)', '.ppbui-test-active:not(:disabled)');
  shared.textContent = forceActive(css);
  hunts.textContent = forceActive(huntsStyles);
  hunt.classList.add("ppbui-test-active");
  const pressed = dom.window.getComputedStyle(hunt);
  assert.equal(pressed.transform, "none");
  assert.equal(pressed.background, "var(--ppbui-action-bg)");
  assert.equal(pressed.boxShadow, "none");
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
  assert.equal(first.dataset.ppbuiDesignSystemOwner, "runtime");
  assert.ok(first.dataset.ppbuiDesignSystemRevision);
  assert.equal(first.dataset.ppbuiDesignSystemGeneration, "1");
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

test("runtime refreshes a managed singleton in place when the CSS revision changes", t => {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>");
  t.after(() => dom.window.close());
  const first = createDesignSystemRuntime({ cssText: ".first{display:block}", document: dom.window.document });
  const second = createDesignSystemRuntime({ cssText: ".second{display:grid}", document: dom.window.document });
  const style = first.mount();
  const revision = style.dataset.ppbuiDesignSystemRevision;
  assert.equal(second.mount(), style);
  assert.equal(style.textContent, ".second{display:grid}");
  assert.notEqual(style.dataset.ppbuiDesignSystemRevision, revision);
  assert.equal(style.dataset.ppbuiDesignSystemGeneration, "2");
  assert.equal(dom.window.document.querySelectorAll('style[data-ppbui-design-system="1"]').length, 1);
  first.unmount();
  assert.equal(style.isConnected, true, "the shared singleton survives while another runtime still references it");
  second.unmount();
  assert.equal(style.isConnected, false);
});

test("an older runtime remount cannot downgrade the managed design-system generation", t => {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>");
  t.after(() => dom.window.close());
  const oldRuntime = createDesignSystemRuntime({ cssText: ".old{display:block}", document: dom.window.document });
  const freshRuntime = createDesignSystemRuntime({ cssText: ".fresh{display:grid}", document: dom.window.document });
  const style = oldRuntime.mount();
  freshRuntime.mount();
  assert.equal(style.textContent, ".fresh{display:grid}");
  assert.equal(style.dataset.ppbuiDesignSystemGeneration, "2");
  oldRuntime.unmount();
  assert.equal(oldRuntime.mount(), style);
  assert.equal(style.textContent, ".fresh{display:grid}");
  assert.equal(style.dataset.ppbuiDesignSystemGeneration, "2");
  oldRuntime.unmount();
  freshRuntime.unmount();
});

test("bootstrap retires legacy corner state, mounts design system before modules and cleans it across restart", t => {
  const dom = new JSDOM("<!doctype html><html data-ppbui-corners='square'><head></head><body></body></html>", { pretendToBeVisual: true });
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
  assert.equal(dom.window.document.documentElement.hasAttribute("data-ppbui-corners"), false);
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
