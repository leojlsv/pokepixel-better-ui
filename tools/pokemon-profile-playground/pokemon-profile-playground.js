const STORAGE_KEY = "ppbui:pokemon-profile-playground:v5";
const LEGACY_STORAGE_KEYS = Object.freeze([
  "ppbui:pokemon-profile-playground:v4",
  "ppbui:pokemon-profile-playground:v3",
  "ppbui:pokemon-profile-playground:v2",
  "ppbui:pokemon-profile-playground:v1",
]);

const DEFAULT_ALPHA = Object.freeze({
  window: 92,
  interactive: 96,
  value: 85,
});

const DEFAULT_PALETTE = Object.freeze({
  windowBg: "#161d20",
  interactiveBg: "#232c2e",
  valueBg: "#161d20",
  line: "#6b6543",
  text: "#eef1df",
  textMuted: "#a6aa9f",
  textSubtle: "#777b73",
  accent: "#d2b45d",
  titleText: "#e0c46d",
  powerText: "#ffe27a",
  focus: "#37b4d1",
  success: "#6fb658",
  warning: "#d2b45d",
  danger: "#e17a72",
  titlebarBg: "#232c2e",
  pickerBg: "#232c2e",
  mainBg: "#161d20",
  heroBg: "#232c2e",
  portraitBg: "#161d20",
  searchCardBg: "#232c2e",
  selectedCardBg: "#232c2e",
  factsBg: "#161d20",
  currentMovesBg: "#232c2e",
  moveCardBg: "#161d20",
  movePositionBg: "#161d20",
  moveEditorBg: "#232c2e",
  teamMemberBg: "#161d20",
  fieldBg: "#161d20",
  buttonBg: "#232c2e",
  nativeCardBg: "#161d20",
  nativePortraitBg: "#232c2e",
  nativeBadgeBg: "#232c2e",
  nativeMeterBg: "#161d20",
  nativeTrackBg: "#161d20",
  nativeStatBg: "#161d20",
  nativeActionBg: "#232c2e",
});

const COLOR_GROUPS = Object.freeze([
  {
    label: "Base",
    items: [
      ["windowBg", "Window background"],
      ["interactiveBg", "Interactive menu"],
      ["valueBg", "Box text / values"],
      ["line", "Line 1px"],
      ["text", "Texto principal"],
      ["textMuted", "Texto secundário"],
      ["textSubtle", "Texto sutil"],
    ],
  },
  {
    label: "Estados / destaque",
    items: [
      ["accent", "Selecionado / accent"],
      ["titleText", "Títulos"],
      ["powerText", "Power / valor forte"],
      ["focus", "Focus"],
      ["success", "Success / HP"],
      ["warning", "Warning"],
      ["danger", "Danger / erro"],
    ],
  },
  {
    label: "Pokémon Profile",
    items: [
      ["titlebarBg", "Titlebar"],
      ["pickerBg", "Search / picker"],
      ["mainBg", "Área principal"],
      ["heroBg", "Hero Pokémon"],
      ["portraitBg", "Portrait box"],
      ["searchCardBg", "Search card"],
      ["selectedCardBg", "Search card selecionado"],
      ["factsBg", "Facts / values"],
      ["currentMovesBg", "Current Moves box"],
      ["moveCardBg", "Move card"],
      ["movePositionBg", "Move posição"],
      ["moveEditorBg", "Moves editor"],
      ["teamMemberBg", "Saved Team member"],
      ["fieldBg", "Input / select"],
      ["buttonBg", "Buttons"],
    ],
  },
  {
    label: "PokémonCard nativo",
    items: [
      ["nativeCardBg", "Card background"],
      ["nativePortraitBg", "Portrait"],
      ["nativeBadgeBg", "Badges genéricos"],
      ["nativeMeterBg", "Meters box"],
      ["nativeTrackBg", "Meter track"],
      ["nativeStatBg", "Battle stats"],
      ["nativeActionBg", "Actions"],
    ],
  },
]);

const DEFAULTS = Object.freeze({
  searchCardWidth: 108,
  moveCardMinWidth: 136,
  powerWidth: 44,
  moveMetaGap: 4,
  hoverWidth: 580,
  viewport: "760",
  mode: "profile",
  skin: "custom",
  corners: "square",
  palette: DEFAULT_PALETTE,
  alpha: DEFAULT_ALPHA,
  layoutSurface: "search",
  gridItem: "visual",
  searchOrder: ["visual", "name", "elements", "rarity", "stats"],
  moveHeaderOrder: ["position", "name"],
  moveMetaOrder: ["element", "category", "cooldown", "power"],
  selectedHeaderOrder: ["name", "power"],
  selectedFactsOrder: ["rarity", "gender", "nature", "iv"],
  hoverHeaderOrder: ["name", "level", "power"],
});

const MODES = Object.freeze([
  ["profile", "Profile", ""],
  ["hover", "Native Card", "hover"],
  ["spec", "Gengar / Spec", "id=team-1"],
  ["female", "Female", "id=team-3"],
  ["configure", "Configure", "configure"],
  ["filters", "Filters", "filters"],
]);

const VIEWPORTS = Object.freeze([
  ["760", "760"],
  ["420", "420"],
  ["340", "340"],
  ["fill", "Fill"],
]);

const SKINS = Object.freeze([
  ["current", "Current"],
  ["obsidian", "Obsidian"],
  ["custom", "Game Palette"],
]);

const CORNER_MODES = Object.freeze([
  ["square", "Squared"],
  ["rounded", "Rounded"],
]);

const LAYOUT_SURFACES = Object.freeze({
  search: {
    label: "Search card",
    stateKey: "searchOrder",
    container: "[data-ppbui-profile-choice]",
    rowSize: "20px",
    gridDefault: { cols: 2, rows: 5, enabled: true },
    gridPlacements: {
      visual: { x: 1, y: 1, w: 1, h: 1 },
      name: { x: 1, y: 2, w: 2, h: 1 },
      elements: { x: 1, y: 3, w: 1, h: 1 },
      rarity: { x: 1, y: 4, w: 2, h: 1 },
      stats: { x: 1, y: 5, w: 1, h: 1 },
    },
    selectors: {
      visual: "[data-ppbui-profile-choice-visual]",
      name: "[data-ppbui-profile-choice-name]",
      elements: "[data-ppbui-profile-choice-elements]",
      rarity: "[data-ppbui-playground-choice-rarity]",
      stats: "[data-ppbui-profile-choice-stats]",
    },
    items: [
      ["visual", "Sprite"],
      ["name", "Nome"],
      ["elements", "Elementos"],
      ["rarity", "Rarity"],
      ["stats", "Level"],
    ],
  },
  moveHeader: {
    label: "Move topo",
    stateKey: "moveHeaderOrder",
    container: "[data-ppbui-profile-move]",
    rowSize: "28px",
    appendMetaRow: true,
    gridDefault: { cols: 1, rows: 4 },
    selectors: {
      position: "[data-ppbui-profile-move-position]",
      name: "[data-ppbui-profile-move-name]",
    },
    items: [
      ["position", "Posição"],
      ["name", "Nome"],
    ],
  },
  moveMeta: {
    label: "Move detalhes",
    stateKey: "moveMetaOrder",
    container: "[data-ppbui-profile-move-meta]",
    rowSize: "22px",
    gridDefault: { cols: 4, rows: 1 },
    selectors: {
      element: "[data-ppbui-profile-move-element]",
      category: "[data-ppbui-profile-move-category]",
      power: "[data-ppbui-profile-move-power]",
      cooldown: "[data-ppbui-profile-move-cooldown]",
    },
    items: [
      ["element", "Elemento"],
      ["category", "Phys / Spec"],
      ["power", "PW"],
      ["cooldown", "Cooldown"],
    ],
  },
  selectedHeader: {
    label: "Selecionado topo",
    stateKey: "selectedHeaderOrder",
    container: "[data-ppbui-profile-identity-head]",
    rowSize: "28px",
    gridDefault: { cols: 2, rows: 1 },
    selectors: {
      name: "[data-ppbui-profile-identity-head] [data-ppbui-profile-name]",
      power: "[data-ppbui-profile-identity-head] [data-ppbui-profile-power]",
    },
    items: [
      ["name", "Nome"],
      ["power", "Power"],
    ],
  },
  selectedFacts: {
    label: "Selecionado facts",
    stateKey: "selectedFactsOrder",
    container: "[data-ppbui-profile-facts]",
    rowSize: "42px",
    gridDefault: { cols: 4, rows: 1 },
    selectors: {
      rarity: '[data-ppbui-profile-fact="rarity"]',
      gender: '[data-ppbui-profile-fact="gender"]',
      nature: '[data-ppbui-profile-fact="nature"]',
      iv: '[data-ppbui-profile-fact="iv"]',
    },
    items: [
      ["rarity", "Rarity"],
      ["gender", "Gender"],
      ["nature", "Nature"],
      ["iv", "IV"],
    ],
  },
  hoverHeader: {
    label: "Hover topo",
    stateKey: "hoverHeaderOrder",
    container: "[data-ppbui-profile-hover-title]",
    rowSize: "26px",
    gridDefault: { cols: 3, rows: 1 },
    selectors: {
      name: "[data-ppbui-profile-hover-title] > strong",
      level: "[data-ppbui-profile-hover-title] > span:not([data-ppbui-profile-hover-power])",
      power: "[data-ppbui-profile-hover-power]",
    },
    items: [
      ["name", "Nome"],
      ["level", "Level"],
      ["power", "Power"],
    ],
  },
});

const iframe = document.querySelector("[data-preview]");
const stage = document.querySelector("[data-stage]");
const status = document.querySelector("[data-status]");
const summary = document.querySelector("[data-summary]");
const stageLabel = document.querySelector("[data-stage-label]");
const modeHost = document.querySelector("[data-playground-modes]");
const skinHost = document.querySelector("[data-playground-skins]");
const cornerHost = document.querySelector("[data-playground-corners]");
const viewportHost = document.querySelector("[data-playground-viewports]");
const colorHost = document.querySelector("[data-color-groups]");
const layoutTargetHost = document.querySelector("[data-layout-targets]");
const layoutList = document.querySelector("[data-layout-list]");
const gridToggle = document.querySelector("[data-grid-toggle]");
const gridItem = document.querySelector("[data-grid-item]");
const gridEditor = document.querySelector("[data-grid-editor]");
const gridStatus = document.querySelector("[data-grid-status]");

let state = loadState();
document.documentElement.dataset.playgroundCorners = state.corners;
let injectTimer = 0;
let draggedLayoutKey = "";
let draggedGridKey = "";
let previewObserver = null;
let previewTransformQueued = false;

function clampNumber(value, fallback, min, max) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : fallback;
}

function clampInteger(value, fallback, min, max) {
  return Math.round(clampNumber(value, fallback, min, max));
}

function normalizeColor(value, fallback) {
  const raw = String(value || "").trim();
  const short = /^#([0-9a-f]{3})$/i.exec(raw);
  if (short) return "#" + [...short[1]].map(char => char + char).join("").toLowerCase();
  const full = /^#([0-9a-f]{6})$/i.exec(raw);
  return full ? "#" + full[1].toLowerCase() : fallback;
}

function normalizePalette(raw = {}) {
  return Object.fromEntries(
    Object.entries(DEFAULT_PALETTE).map(([key, fallback]) => [key, normalizeColor(raw?.[key], fallback)]),
  );
}

function normalizeAlpha(raw = {}) {
  return Object.fromEntries(
    Object.entries(DEFAULT_ALPHA).map(([key, fallback]) => [key, clampInteger(raw?.[key], fallback, 0, 100)]),
  );
}

function alphaColor(hex, percent) {
  const normalized = normalizeColor(hex, "#000000");
  const value = Number.parseInt(normalized.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const alpha = Math.round(clampNumber(percent, 100, 0, 100)) / 100;
  return `rgba(${r},${g},${b},${alpha})`;
}

function packedGrid(surfaceKey, cols, rows) {
  const def = LAYOUT_SURFACES[surfaceKey];
  const safeCols = clampInteger(cols, def.gridDefault.cols, 1, 8);
  const safeRows = clampInteger(rows, def.gridDefault.rows, 1, 8);
  const keys = def.items.map(([key]) => key);
  if (safeCols * safeRows < keys.length) return null;
  const items = {};
  keys.forEach((key, index) => {
    items[key] = {
      x: (index % safeCols) + 1,
      y: Math.floor(index / safeCols) + 1,
      w: 1,
      h: 1,
    };
  });
  return { enabled: false, cols: safeCols, rows: safeRows, items };
}

function defaultGrid(surfaceKey) {
  const def = LAYOUT_SURFACES[surfaceKey];
  if (def.gridPlacements) {
    const layout = {
      enabled: Boolean(def.gridDefault.enabled),
      cols: def.gridDefault.cols,
      rows: def.gridDefault.rows,
      items: Object.fromEntries(
        def.items.map(([key]) => [key, { ...def.gridPlacements[key] }]),
      ),
    };
    if (validGridLayout(surfaceKey, layout)) return layout;
  }
  const grid = packedGrid(surfaceKey, def.gridDefault.cols, def.gridDefault.rows);
  return grid ? { ...grid, enabled: Boolean(def.gridDefault.enabled) } : { enabled: false, cols: 1, rows: def.items.length, items: {} };
}

function cloneGridLayouts() {
  return Object.fromEntries(Object.keys(LAYOUT_SURFACES).map(key => [key, defaultGrid(key)]));
}

function placementsOverlap(a, b) {
  return a.x < b.x + b.w
    && a.x + a.w > b.x
    && a.y < b.y + b.h
    && a.y + a.h > b.y;
}

function gridConflict(layout, key, placement) {
  return Object.entries(layout.items).find(([otherKey, other]) => (
    otherKey !== key && placementsOverlap(placement, other)
  ))?.[0] || "";
}

function validGridLayout(surfaceKey, layout) {
  const def = LAYOUT_SURFACES[surfaceKey];
  const keys = def.items.map(([key]) => key);
  if (!layout || !Number.isInteger(layout.cols) || !Number.isInteger(layout.rows)) return false;
  if (layout.cols < 1 || layout.cols > 8 || layout.rows < 1 || layout.rows > 8) return false;
  for (const key of keys) {
    const placement = layout.items?.[key];
    if (!placement) return false;
    if (![placement.x, placement.y, placement.w, placement.h].every(Number.isInteger)) return false;
    if (placement.x < 1 || placement.y < 1 || placement.w < 1 || placement.h < 1) return false;
    if (placement.x + placement.w - 1 > layout.cols || placement.y + placement.h - 1 > layout.rows) return false;
    if (gridConflict(layout, key, placement)) return false;
  }
  return true;
}

function normalizeGridLayout(surfaceKey, raw) {
  const fallback = defaultGrid(surfaceKey);
  const cols = clampInteger(raw?.cols, fallback.cols, 1, 8);
  const rows = clampInteger(raw?.rows, fallback.rows, 1, 8);
  const draft = {
    enabled: raw?.enabled === undefined ? fallback.enabled : Boolean(raw.enabled),
    cols,
    rows,
    items: {},
  };
  for (const [key] of LAYOUT_SURFACES[surfaceKey].items) {
    const source = raw?.items?.[key] || fallback.items[key];
    const x = clampInteger(source?.x, 1, 1, cols);
    const y = clampInteger(source?.y, 1, 1, rows);
    const w = clampInteger(source?.w, 1, 1, cols - x + 1);
    const h = clampInteger(source?.h, 1, 1, rows - y + 1);
    draft.items[key] = { x, y, w, h };
  }
  if (validGridLayout(surfaceKey, draft)) return draft;
  const packed = packedGrid(surfaceKey, cols, rows);
  return packed ? { ...packed, enabled: raw?.enabled === undefined ? fallback.enabled : Boolean(raw.enabled) } : fallback;
}

function cloneDefaults() {
  return {
    ...DEFAULTS,
    palette: { ...DEFAULT_PALETTE },
    alpha: { ...DEFAULT_ALPHA },
    searchOrder: [...DEFAULTS.searchOrder],
    moveHeaderOrder: [...DEFAULTS.moveHeaderOrder],
    moveMetaOrder: [...DEFAULTS.moveMetaOrder],
    selectedHeaderOrder: [...DEFAULTS.selectedHeaderOrder],
    selectedFactsOrder: [...DEFAULTS.selectedFactsOrder],
    hoverHeaderOrder: [...DEFAULTS.hoverHeaderOrder],
    gridLayouts: cloneGridLayouts(),
  };
}

function normalizeOrder(value, allowed, fallback) {
  if (!Array.isArray(value)) return [...fallback];
  const unique = value.filter((key, index) => allowed.includes(key) && value.indexOf(key) === index);
  if (unique.length !== allowed.length) return [...fallback];
  return unique;
}

function migrateSearchGrid(rawGridLayouts) {
  if (!rawGridLayouts || typeof rawGridLayouts !== "object") return rawGridLayouts;
  const search = rawGridLayouts.search;
  const old = search && search.cols === 2 && search.rows === 5 && search.enabled === true
    && search.items?.visual?.x === 1 && search.items.visual.y === 2 && search.items.visual.w === 1 && search.items.visual.h === 1
    && search.items?.name?.x === 1 && search.items.name.y === 1 && search.items.name.w === 1 && search.items.name.h === 1
    && search.items?.elements?.x === 1 && search.items.elements.y === 3 && search.items.elements.w === 1 && search.items.elements.h === 1
    && search.items?.rarity?.x === 1 && search.items.rarity.y === 4 && search.items.rarity.w === 1 && search.items.rarity.h === 1
    && search.items?.stats?.x === 1 && search.items.stats.y === 5 && search.items.stats.w === 1 && search.items.stats.h === 1;
  if (!old) return rawGridLayouts;
  return {
    ...rawGridLayouts,
    search: {
      ...search,
      items: {
        ...search.items,
        visual: { x: 1, y: 1, w: 1, h: 1 },
        name: { x: 1, y: 2, w: 2, h: 1 },
        elements: { x: 1, y: 3, w: 1, h: 1 },
        rarity: { x: 1, y: 4, w: 2, h: 1 },
        stats: { x: 1, y: 5, w: 1, h: 1 },
      },
    },
  };
}

function normalize(raw = {}) {
  const mode = MODES.some(([key]) => key === raw.mode) ? raw.mode : DEFAULTS.mode;
  const viewport = VIEWPORTS.some(([key]) => key === String(raw.viewport)) ? String(raw.viewport) : DEFAULTS.viewport;
  const skin = SKINS.some(([key]) => key === raw.skin) ? raw.skin : DEFAULTS.skin;
  const corners = CORNER_MODES.some(([key]) => key === raw.corners) ? raw.corners : DEFAULTS.corners;
  const layoutSurface = Object.prototype.hasOwnProperty.call(LAYOUT_SURFACES, raw.layoutSurface) ? raw.layoutSurface : DEFAULTS.layoutSurface;
  const def = LAYOUT_SURFACES[layoutSurface];
  const allowedGridItems = def.items.map(([key]) => key);
  const gridItem = allowedGridItems.includes(raw.gridItem) ? raw.gridItem : allowedGridItems[0];
  const migratedGridLayouts = migrateSearchGrid(raw.gridLayouts);
  const gridLayouts = Object.fromEntries(
    Object.keys(LAYOUT_SURFACES).map(key => [key, normalizeGridLayout(key, migratedGridLayouts?.[key])]),
  );
  return {
    searchCardWidth: clampNumber(raw.searchCardWidth, DEFAULTS.searchCardWidth, 90, 180),
    moveCardMinWidth: clampNumber(raw.moveCardMinWidth, DEFAULTS.moveCardMinWidth, 110, 220),
    powerWidth: clampNumber(raw.powerWidth, DEFAULTS.powerWidth, 36, 80),
    moveMetaGap: clampNumber(raw.moveMetaGap, DEFAULTS.moveMetaGap, 0, 12),
    hoverWidth: clampNumber(raw.hoverWidth, DEFAULTS.hoverWidth, 320, 720),
    viewport,
    mode,
    skin,
    corners,
    palette: normalizePalette(raw.palette),
    alpha: normalizeAlpha(raw.alpha),
    layoutSurface,
    gridItem,
    searchOrder: normalizeOrder(raw.searchOrder, DEFAULTS.searchOrder, DEFAULTS.searchOrder),
    moveHeaderOrder: normalizeOrder(raw.moveHeaderOrder, DEFAULTS.moveHeaderOrder, DEFAULTS.moveHeaderOrder),
    moveMetaOrder: normalizeOrder(raw.moveMetaOrder, DEFAULTS.moveMetaOrder, DEFAULTS.moveMetaOrder),
    selectedHeaderOrder: normalizeOrder(raw.selectedHeaderOrder, DEFAULTS.selectedHeaderOrder, DEFAULTS.selectedHeaderOrder),
    selectedFactsOrder: normalizeOrder(raw.selectedFactsOrder, DEFAULTS.selectedFactsOrder, DEFAULTS.selectedFactsOrder),
    hoverHeaderOrder: normalizeOrder(raw.hoverHeaderOrder, DEFAULTS.hoverHeaderOrder, DEFAULTS.hoverHeaderOrder),
    gridLayouts,
  };
}

function loadState() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return normalize(JSON.parse(current));
    for (const key of LEGACY_STORAGE_KEYS) {
      const legacy = localStorage.getItem(key);
      if (!legacy) continue;
      return normalize({ ...JSON.parse(legacy), skin: "custom", palette: DEFAULT_PALETTE, alpha: DEFAULT_ALPHA });
    }
    return cloneDefaults();
  } catch {
    return cloneDefaults();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function gridCssForSurface(surfaceKey) {
  const layout = state.gridLayouts[surfaceKey];
  if (!layout?.enabled) return "";
  const def = LAYOUT_SURFACES[surfaceKey];
  const rowTracks = def.appendMetaRow
    ? "repeat(" + layout.rows + ",minmax(" + def.rowSize + ",auto)) 22px"
    : "repeat(" + layout.rows + ",minmax(" + def.rowSize + ",auto))";
  const placementRules = Object.entries(layout.items).map(([key, placement]) => {
    const selector = def.selectors[key];
    return [
      selector + " {",
      "  grid-column:" + placement.x + " / span " + placement.w + " !important;",
      "  grid-row:" + placement.y + " / span " + placement.h + " !important;",
      "  order:0 !important;",
      "  min-width:0;",
      "}",
    ].join("\n");
  }).join("\n");
  const fixes = [];
  if (surfaceKey === "moveHeader") {
    fixes.push("[data-ppbui-profile-move-meta] { grid-column:1 / -1 !important; grid-row:" + (layout.rows + 1) + " !important; }");
  }
  if (surfaceKey === "selectedHeader") {
    fixes.push("[data-ppbui-profile-identity-head] [data-ppbui-profile-name], [data-ppbui-profile-identity-head] [data-ppbui-profile-power] { margin-left:0 !important; }");
  }
  if (surfaceKey === "hoverHeader") {
    fixes.push("[data-ppbui-profile-hover-title] > strong, [data-ppbui-profile-hover-title] [data-ppbui-profile-hover-power] { margin-left:0 !important; }");
  }
  if (surfaceKey === "selectedFacts") {
    fixes.push("[data-ppbui-profile-facts] { gap:4px !important; border:0 !important; background:transparent !important; }");
    fixes.push("[data-ppbui-profile-fact] { border:0 !important; }");
  }
  return [
    def.container + " {",
    "  display:grid !important;",
    "  grid-template-columns:repeat(" + layout.cols + ",minmax(0,1fr)) !important;",
    "  grid-template-rows:" + rowTracks + " !important;",
    "  grid-auto-flow:row !important;",
    "}",
    placementRules,
    fixes.join("\n"),
  ].join("\n");
}

function gridCssOverrides() {
  return Object.keys(LAYOUT_SURFACES).map(gridCssForSurface).filter(Boolean).join("\n");
}

function obsidianCss() {
  if (state.skin !== "obsidian") return "";
  return [
    "[data-ppbui-pokemon-profile-window], [data-ppbui-profile-hover] {",
    "  --ppbui-bg-0:#0b100f;",
    "  --ppbui-bg-1:#111715;",
    "  --ppbui-bg-2:#171d1a;",
    "  --ppbui-border:#37413c;",
    "  --ppbui-border-strong:#4a554d;",
    "  --ppbui-text:#e5e3d6;",
    "  --ppbui-text-muted:#96998e;",
    "  --ppbui-text-subtle:#70756d;",
    "  --ppbui-selected:#d2b45d;",
    "  --ppbui-warning:#d2b45d;",
    "  --ppbui-success:#69a66f;",
    "  background:linear-gradient(180deg,#101614 0%,#0a0f0e 100%) !important;",
    "  border-color:#4a554d !important;",
    "  box-shadow:0 12px 28px rgba(0,0,0,.46) !important;",
    "}",
    "[data-ppbui-profile-titlebar] {",
    "  min-height:34px !important;",
    "  border-bottom:1px solid #4d5548 !important;",
    "  background:linear-gradient(180deg,#1b211d,#141a18) !important;",
    "  box-shadow:inset 3px 0 0 #c3a653;",
    "}",
    "[data-ppbui-profile-title] { color:#e0c46d !important; letter-spacing:.08em !important; }",
    "[data-ppbui-profile-close] { border-left:1px solid #4a4e42 !important; background:#141a18 !important; }",
    "[data-ppbui-profile-picker], [data-ppbui-profile-current], [data-ppbui-profile-move-editor] {",
    "  border-color:#3d4842 !important;",
    "  background:#141b18 !important;",
    "  box-shadow:none !important;",
    "}",
    "[data-ppbui-profile-main] { background:linear-gradient(180deg,rgba(18,24,22,.92),rgba(10,15,14,.96)); }",
    "[data-ppbui-profile-hero] { padding:10px; border:1px solid #3b4640; background:#121815; }",
    "[data-ppbui-profile-portrait], [data-ppbui-profile-hover-portrait] { background:#0a0f0e !important; }",
    "[data-ppbui-profile-section] { border-top-color:#354039 !important; }",
    "[data-ppbui-profile-section] h3, [data-ppbui-profile-hover-moves] > strong { color:#d9bd68 !important; letter-spacing:.07em !important; }",
    "[data-ppbui-profile-facts] { border-color:#3a453f !important; background:#151c19 !important; }",
    "[data-ppbui-profile-fact] small { color:#8b9086 !important; letter-spacing:.04em; text-transform:uppercase; }",
    "[data-ppbui-profile-choice], [data-ppbui-profile-move], [data-ppbui-profile-team-member] { border-color:#344039 !important; background:#101613 !important; box-shadow:none !important; }",
    "[data-ppbui-profile-choice][aria-pressed=\"true\"] { background:#181d18 !important; box-shadow:inset 0 0 0 1px rgba(210,180,93,.22) !important; }",
    "[data-ppbui-profile-move-name], [data-ppbui-profile-move-power] { border-color:transparent !important; background:transparent !important; }",
    "[data-ppbui-profile-move-position] { border-color:#3a453f !important; background:#141b18 !important; }",
    "[data-ppbui-profile-power], [data-ppbui-profile-hover-power], [data-ppbui-profile-move-power] { color:#ddc36f !important; }",
    "[data-ppbui-profile-saved], [data-ppbui-profile-team-row] { border-color:#354039 !important; }",
    "[data-ppbui-pokemon-profile-window] button, [data-ppbui-pokemon-profile-window] input, [data-ppbui-pokemon-profile-window] select, [data-ppbui-profile-hover] button { border-radius:0 !important; box-shadow:none !important; }",
    "[data-ppbui-pokemon-profile-window] input, [data-ppbui-pokemon-profile-window] select { background:#0d1210 !important; border-color:#3a453f !important; color:#deddd1 !important; }",
    "[data-ppbui-profile-sources] button[aria-pressed=\"true\"] { border-color:#d2b45d !important; color:#e1c86f !important; background:#1a1d16 !important; }",
    "[data-ppbui-profile-hover] { background:linear-gradient(180deg,#111714,#090e0d) !important; }",
    "[data-ppbui-profile-hover-head] { border-bottom-color:#39443e !important; }",
  ].join("\n");
}

function customPaletteCss() {
  if (state.skin !== "custom") return "";
  const p = state.palette;
  const a = state.alpha;
  const windowBg = alphaColor(p.windowBg, a.window);
  const interactiveBg = color => alphaColor(color, a.interactive);
  const valueBg = color => alphaColor(color, a.value);
  return [
    "[data-ppbui-pokemon-profile-window] {",
    "  --ppbui-bg-0:" + valueBg(p.valueBg) + ";",
    "  --ppbui-bg-1:" + windowBg + ";",
    "  --ppbui-bg-2:" + interactiveBg(p.interactiveBg) + ";",
    "  --ppbui-border:" + p.line + ";",
    "  --ppbui-border-strong:" + p.line + ";",
    "  --ppbui-text:" + p.text + ";",
    "  --ppbui-text-muted:" + p.textMuted + ";",
    "  --ppbui-text-subtle:" + p.textSubtle + ";",
    "  --ppbui-selected:" + p.accent + ";",
    "  --ppbui-focus:" + p.focus + ";",
    "  --ppbui-success:" + p.success + ";",
    "  --ppbui-warning:" + p.warning + ";",
    "  --ppbui-danger:" + p.danger + ";",
    "  --ppbui-border-width:1px;",
    "  --ppbui-separator-width:1px;",
    "  border:1px solid " + p.line + " !important;",
    "  background:" + windowBg + " !important;",
    "  color:" + p.text + " !important;",
    "  box-shadow:none !important;",
    "}",
    "[data-ppbui-pokemon-profile-window] :focus-visible { outline-width:1px !important; }",
    "[data-ppbui-profile-titlebar] { border-bottom:1px solid " + p.line + " !important; background:" + interactiveBg(p.titlebarBg) + " !important; box-shadow:none !important; }",
    "[data-ppbui-profile-title], [data-ppbui-profile-section] h3 { color:" + p.titleText + " !important; }",
    "[data-ppbui-profile-close] { border-left:1px solid " + p.line + " !important; background:" + interactiveBg(p.interactiveBg) + " !important; color:" + p.text + " !important; }",
    "[data-ppbui-profile-body] { background:" + valueBg(p.valueBg) + " !important; }",
    "[data-ppbui-profile-picker] { border-bottom:1px solid " + p.line + " !important; background:" + interactiveBg(p.pickerBg) + " !important; }",
    "[data-ppbui-profile-main] { background:" + alphaColor(p.mainBg, a.window) + " !important; }",
    "[data-ppbui-profile-hero] { border:1px solid " + p.line + " !important; background:" + interactiveBg(p.heroBg) + " !important; }",
    "[data-ppbui-profile-portrait] { border-width:1px !important; background:" + valueBg(p.portraitBg) + " !important; box-shadow:none !important; }",
    "[data-ppbui-profile-choice] { border:0 !important; background:" + interactiveBg(p.searchCardBg) + " !important; box-shadow:none !important; color:" + p.text + " !important; }",
    "[data-ppbui-profile-choice][aria-pressed=\"true\"] { border:0 !important; outline:1px solid " + p.accent + " !important; outline-offset:-1px; background:" + interactiveBg(p.selectedCardBg) + " !important; box-shadow:none !important; }",
    "[data-ppbui-profile-choice-stats], [data-ppbui-profile-picker-state], [data-ppbui-profile-filter-field], [data-ppbui-profile-meta], [data-ppbui-profile-fact] small, [data-ppbui-profile-move-category], [data-ppbui-profile-move-cooldown], [data-ppbui-profile-status], [data-ppbui-profile-move-editor-slot] { color:" + p.textMuted + " !important; }",
    "[data-ppbui-profile-power], [data-ppbui-profile-move-power] { color:" + p.powerText + " !important; }",
    "[data-ppbui-profile-hp], [data-ppbui-profile-section], [data-ppbui-profile-saved], [data-ppbui-profile-team-row] { border-color:" + p.line + " !important; }",
    "[data-ppbui-profile-hp-track] { border:1px solid " + p.line + " !important; background:" + valueBg(p.valueBg) + " !important; }",
    "[data-ppbui-profile-hp-fill] { background:" + p.success + " !important; }",
    "[data-ppbui-profile-facts] { border:0 !important; background:transparent !important; }",
    "[data-ppbui-profile-fact] { border:0 !important; background:" + valueBg(p.factsBg) + " !important; }",
    "[data-ppbui-profile-current] { border:1px solid " + p.line + " !important; background:" + interactiveBg(p.currentMovesBg) + " !important; box-shadow:none !important; }",
    "[data-ppbui-profile-move] { border:0 !important; background:" + valueBg(p.moveCardBg) + " !important; color:" + p.text + " !important; }",
    "[data-ppbui-profile-move-position] { border:1px solid " + p.line + " !important; background:" + valueBg(p.movePositionBg) + " !important; color:" + p.text + " !important; }",
    "[data-ppbui-profile-move-name], [data-ppbui-profile-move-power] { border-width:1px !important; }",
    "[data-ppbui-profile-move-editor] { border:1px solid " + p.line + " !important; background:" + interactiveBg(p.moveEditorBg) + " !important; box-shadow:none !important; }",
    "[data-ppbui-profile-team-member] { border:0 !important; background:" + valueBg(p.teamMemberBg) + " !important; }",
    "[data-ppbui-pokemon-profile-window] input, [data-ppbui-pokemon-profile-window] select { border:1px solid " + p.line + " !important; background:" + valueBg(p.fieldBg) + " !important; color:" + p.text + " !important; box-shadow:none !important; }",
    "[data-ppbui-pokemon-profile-window] button { border-width:1px !important; border-color:" + p.line + " !important; background:" + interactiveBg(p.buttonBg) + " !important; color:" + p.text + " !important; box-shadow:none !important; }",
    "[data-ppbui-profile-sources] button[aria-pressed=\"true\"] { border-color:" + p.accent + " !important; background:" + interactiveBg(p.selectedCardBg) + " !important; color:" + p.accent + " !important; }",
    "[data-ppbui-profile-saved][data-active=\"true\"], [data-ppbui-profile-team-member][data-selected=\"true\"] { box-shadow:none !important; outline-color:" + p.accent + " !important; }",
    "",
    ".pokemon-card[data-ppbui-profile-native-card] {",
    "  --ppbui-border-width:1px;",
    "  --ppbui-separator-width:1px;",
    "  box-sizing:border-box;",
    "  max-width:100% !important;",
    "  border:1px solid " + p.line + " !important;",
    "  background:" + alphaColor(p.nativeCardBg, a.window) + " !important;",
    "  color:" + p.text + " !important;",
    "  box-shadow:none !important;",
    "}",
    ".pokemon-card[data-ppbui-profile-native-card] :focus-visible { outline-width:1px !important; }",
    ".pokemon-card[data-ppbui-profile-native-card] .pokemon-tooltip__header { border-bottom:1px solid " + p.line + " !important; }",
    ".pokemon-card[data-ppbui-profile-native-card] .pokemon-tooltip__portrait { border:1px solid " + p.line + " !important; background:" + interactiveBg(p.nativePortraitBg) + " !important; }",
    ".pokemon-card[data-ppbui-profile-native-card] .pokemon-tooltip__identity strong, .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__title { color:" + p.titleText + " !important; }",
    ".pokemon-card[data-ppbui-profile-native-card] .pokemon-tooltip__badge:not(.is-level):not(.is-quality):not(.is-shiny):not(.is-mega) { border:1px solid " + p.line + " !important; background:" + interactiveBg(p.nativeBadgeBg) + " !important; color:" + p.text + " !important; }",
    ".pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-power] { color:" + p.powerText + " !important; }",
    ".pokemon-card[data-ppbui-profile-native-card] .pokemon-card__meters { border:1px solid " + p.line + " !important; background:" + valueBg(p.nativeMeterBg) + " !important; }",
    ".pokemon-card[data-ppbui-profile-native-card] .pokemon-card__track { border:1px solid " + p.line + " !important; background:" + valueBg(p.nativeTrackBg) + " !important; }",
    ".pokemon-card[data-ppbui-profile-native-card] .pokemon-card__track i { background:" + p.success + " !important; }",
    ".pokemon-card[data-ppbui-profile-native-card] .pokemon-card__section { border-top:1px solid " + p.line + " !important; background:" + valueBg(p.nativeStatBg) + " !important; }",
    ".pokemon-card[data-ppbui-profile-native-card] .pokemon-card__row { border-bottom:1px solid " + p.line + " !important; }",
    ".pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-move] { border:1px solid " + p.line + " !important; background:" + valueBg(p.moveCardBg) + " !important; color:" + p.text + " !important; }",
    ".pokemon-card[data-ppbui-profile-native-card] .pokemon-card__action { border:1px solid " + p.line + " !important; background:" + interactiveBg(p.nativeActionBg) + " !important; color:" + p.text + " !important; box-shadow:none !important; }",
    ".pokemon-card[data-ppbui-profile-native-card] .pokemon-card__action.is-profile { border-color:" + p.accent + " !important; color:" + p.powerText + " !important; }",
  ].join("\n");
}

function cssOverrides() {
  const s = state;
  const searchRows = {
    visual: "48px",
    name: "16px",
    elements: "22px",
    rarity: "22px",
    stats: "16px",
  };
  const searchDefaultOrder = state.searchOrder.join("|") === DEFAULTS.searchOrder.join("|");
  const searchLayoutCss = searchDefaultOrder
    ? [
      "[data-ppbui-profile-choice] {",
      "  grid-template-columns:repeat(2,minmax(0,1fr)) !important;",
      "  grid-template-rows:48px 16px 22px 22px 16px !important;",
      "}",
      "[data-ppbui-profile-choice-visual] { grid-column:1 !important; grid-row:1 !important; }",
      "[data-ppbui-profile-choice-name] { grid-column:1 / span 2 !important; grid-row:2 !important; }",
      "[data-ppbui-profile-choice-elements] { grid-column:1 !important; grid-row:3 !important; }",
      "[data-ppbui-playground-choice-rarity] { grid-column:1 / span 2 !important; grid-row:4 !important; }",
      "[data-ppbui-profile-choice-stats] { grid-column:1 !important; grid-row:5 !important; }",
    ].join("\n")
    : [
      "[data-ppbui-profile-choice] {",
      "  grid-template-columns:minmax(0,1fr) !important;",
      "  grid-template-rows:" + s.searchOrder.map(key => searchRows[key]).join(" ") + " !important;",
      "}",
      ...s.searchOrder.map((key, index) => {
        const selector = LAYOUT_SURFACES.search.selectors[key];
        return selector + " { grid-column:1 !important; grid-row:" + (index + 1) + " !important; }";
      }),
    ].join("\n");
  const moveHeaderTracks = {
    position: "28px",
    name: "minmax(0,1fr)",
  };
  const moveMetaTracks = {
    element: "22px",
    category: "minmax(30px,1fr)",
    power: `${s.powerWidth}px`,
    cooldown: "minmax(22px,auto)",
  };
  const orderRules = (selectorByKey, order) => order
    .map((key, index) => `${selectorByKey[key]} { order:${index} !important; }`)
    .join("\n");
  const factSelector = key => `[data-ppbui-profile-fact="${key}"]`;
  const selectedFactDesktopBorders = s.selectedFactsOrder
    .map(key => `${factSelector(key)} { border:0 !important; }`)
    .join("\n");
  const selectedFactNarrowBorders = s.selectedFactsOrder
    .map(key => `${factSelector(key)} { border:0 !important; }`)
    .join("\n");
  const selectedHeaderMargins = s.selectedHeaderOrder[0] === "power"
    ? `[data-ppbui-profile-identity-head] [data-ppbui-profile-power] { margin-left:0 !important; }
       [data-ppbui-profile-identity-head] [data-ppbui-profile-name] { margin-left:auto !important; }`
    : `[data-ppbui-profile-identity-head] [data-ppbui-profile-power] { margin-left:auto !important; }
       [data-ppbui-profile-identity-head] [data-ppbui-profile-name] { margin-left:0 !important; }`;
  const hoverHeaderMargins = s.hoverHeaderOrder[0] === "power"
    ? `[data-ppbui-profile-hover-title] [data-ppbui-profile-hover-power] { margin-left:0 !important; }
       [data-ppbui-profile-hover-title] > strong { margin-left:auto !important; }`
    : `[data-ppbui-profile-hover-title] [data-ppbui-profile-hover-power] { margin-left:auto !important; }
       [data-ppbui-profile-hover-title] > strong { margin-left:0 !important; }`;
  return `
    [data-ppbui-profile-list] {
      grid-auto-columns: ${s.searchCardWidth}px !important;
    }
    ${searchLayoutCss}
    [data-ppbui-playground-choice-rarity] {
      display:flex;
      align-items:center;
      min-width:0;
    }
    [data-ppbui-playground-choice-rarity] .ppbui-quality-badge {
      min-width:0 !important;
      min-height:20px !important;
      padding:1px 3px !important;
      overflow:hidden;
      font-size:9px !important;
      text-overflow:ellipsis;
    }
    ${orderRules({
      visual: "[data-ppbui-profile-choice-visual]",
      name: "[data-ppbui-profile-choice-name]",
      elements: "[data-ppbui-profile-choice-elements]",
      rarity: "[data-ppbui-playground-choice-rarity]",
      stats: "[data-ppbui-profile-choice-stats]",
    }, s.searchOrder)}
    [data-ppbui-profile-move-list] {
      grid-template-columns: repeat(4,minmax(${s.moveCardMinWidth}px,1fr)) !important;
      width:100% !important;
      min-width:0 !important;
      box-sizing:border-box !important;
      justify-self:stretch !important;
      scrollbar-gutter:auto !important;
    }
    [data-ppbui-profile-move] {
      grid-template-columns: ${s.moveHeaderOrder.map(key => moveHeaderTracks[key]).join(" ")} !important;
    }
    ${orderRules({
      position: "[data-ppbui-profile-move-position]",
      name: "[data-ppbui-profile-move-name]",
    }, s.moveHeaderOrder)}
    [data-ppbui-profile-move-meta] { order:99 !important; }
    [data-ppbui-profile-move-meta] {
      grid-template-columns: ${s.moveMetaOrder.map(key => moveMetaTracks[key]).join(" ")} !important;
      gap: ${s.moveMetaGap}px !important;
    }
    ${orderRules({
      element: "[data-ppbui-profile-move-element]",
      category: "[data-ppbui-profile-move-category]",
      power: "[data-ppbui-profile-move-power]",
      cooldown: "[data-ppbui-profile-move-cooldown]",
    }, s.moveMetaOrder)}
    [data-ppbui-profile-move-power] {
      width: ${s.powerWidth}px !important;
      min-width: ${s.powerWidth}px !important;
      max-width: ${s.powerWidth}px !important;
    }
    ${orderRules({
      name: "[data-ppbui-profile-identity-head] [data-ppbui-profile-name]",
      power: "[data-ppbui-profile-identity-head] [data-ppbui-profile-power]",
    }, s.selectedHeaderOrder)}
    ${selectedHeaderMargins}
    ${orderRules({
      rarity: '[data-ppbui-profile-fact="rarity"]',
      gender: '[data-ppbui-profile-fact="gender"]',
      nature: '[data-ppbui-profile-fact="nature"]',
      iv: '[data-ppbui-profile-fact="iv"]',
    }, s.selectedFactsOrder)}
    ${selectedFactDesktopBorders}
    @container (max-width:519px) {
      ${selectedFactNarrowBorders}
    }
    [data-ppbui-profile-hover] {
      width: min(${s.hoverWidth}px,calc(100vw - 16px)) !important;
    }
    ${orderRules({
      name: "[data-ppbui-profile-hover-title] > strong",
      level: "[data-ppbui-profile-hover-title] > span:not([data-ppbui-profile-hover-power])",
      power: "[data-ppbui-profile-hover-power]",
    }, s.hoverHeaderOrder)}
    ${hoverHeaderMargins}
    ${gridCssOverrides()}
    ${obsidianCss()}
    ${customPaletteCss()}
  `;
}

function applyViewport() {
  const fill = state.viewport === "fill";
  stage.dataset.fill = String(fill);
  stage.style.width = fill ? "" : `${state.viewport}px`;
  updateButtons();
  updateSummary();
}

function modeQuery() {
  return MODES.find(([key]) => key === state.mode)?.[2] || "";
}

function previewUrl() {
  const params = new URLSearchParams(modeQuery());
  params.set("corners", state.corners);
  return `pokemon-profile-preview.html?${params.toString()}`;
}

function reloadPreview() {
  iframe.src = previewUrl();
}

function previewDocument() {
  try {
    return iframe.contentDocument;
  } catch {
    return null;
  }
}

function applyCornerMode(doc = previewDocument()) {
  document.documentElement.dataset.playgroundCorners = state.corners;
  if (doc?.documentElement) doc.documentElement.dataset.ppbuiCorners = state.corners;
}

function ensureSearchChoiceDetachment(doc = previewDocument()) {
  if (!doc?.body) return;
  doc.querySelectorAll("[data-ppbui-profile-choice]").forEach(choice => {
    const elements = choice.querySelector(":scope > [data-ppbui-profile-choice-elements]");
    if (!elements) return;
    let rarity = choice.querySelector(":scope > [data-ppbui-playground-choice-rarity], :scope > [data-ppbui-profile-choice-rarity]");
    if (rarity?.hasAttribute("data-ppbui-profile-choice-rarity")) {
      rarity.dataset.ppbuiPlaygroundChoiceRarity = "";
      return;
    }
    if (!rarity) {
      rarity = doc.createElement("div");
      rarity.dataset.ppbuiPlaygroundChoiceRarity = "";
      rarity.setAttribute("role", "presentation");
      const stats = choice.querySelector(":scope > [data-ppbui-profile-choice-stats]");
      if (stats) choice.insertBefore(rarity, stats);
      else choice.append(rarity);
    }
    const badge = elements.querySelector(":scope > .ppbui-quality-badge");
    if (!badge) return;
    rarity.querySelectorAll(":scope > .ppbui-quality-badge").forEach(old => {
      if (old !== badge) old.remove();
    });
    if (badge.parentNode !== rarity) rarity.append(badge);
  });
}

function installPreviewTransformObserver() {
  previewObserver?.disconnect();
  previewObserver = null;
  const doc = previewDocument();
  if (!doc?.body) return;
  previewObserver = new MutationObserver(() => {
    if (previewTransformQueued) return;
    previewTransformQueued = true;
    queueMicrotask(() => {
      previewTransformQueued = false;
      ensureSearchChoiceDetachment(doc);
    });
  });
  previewObserver.observe(doc.body, { childList: true, subtree: true });
  ensureSearchChoiceDetachment(doc);
}

function injectOverrides() {
  window.clearTimeout(injectTimer);
  const doc = previewDocument();
  if (!doc?.head) {
    injectTimer = window.setTimeout(injectOverrides, 50);
    return;
  }
  applyCornerMode(doc);
  ensureSearchChoiceDetachment(doc);
  let style = doc.querySelector("style[data-profile-playground-overrides]");
  if (!style) {
    style = doc.createElement("style");
    style.dataset.profilePlaygroundOverrides = "";
    doc.head.append(style);
  }
  style.textContent = cssOverrides();
  updateMetrics();
}

function updateMetrics() {
  const doc = previewDocument();
  if (!doc) return;
  const copyFallback = document.querySelector("[data-copy-fallback]");
  if (copyFallback && !copyFallback.hidden) return;
  const root = doc.querySelector("[data-ppbui-pokemon-profile-window]");
  const hover = doc.querySelector("[data-ppbui-profile-hover]");
  const rail = doc.querySelector("[data-ppbui-profile-move-list]");
  const visible = hover && !hover.hidden ? hover : root && !root.hidden ? root : null;
  const modeLabel = MODES.find(([key]) => key === state.mode)?.[1] || state.mode;
  const skinLabel = SKINS.find(([key]) => key === state.skin)?.[1] || state.skin;
  const cornerLabel = CORNER_MODES.find(([key]) => key === state.corners)?.[1] || state.corners;
  const viewportLabel = state.viewport === "fill" ? "Fill" : `${state.viewport}px`;
  stageLabel.textContent = `${viewportLabel} · ${modeLabel} · ${skinLabel} · ${cornerLabel}`;
  if (!visible) {
    status.textContent = "Preview carregado; aguardando surface visível.";
    return;
  }
  const railText = rail ? ` · rail ${rail.clientWidth}/${rail.scrollWidth}` : "";
  status.textContent = `${visible.clientWidth}/${visible.scrollWidth}px${railText}`;
}

function updateSummary() {
  const modeLabel = MODES.find(([key]) => key === state.mode)?.[1] || state.mode;
  const viewportLabel = state.viewport === "fill" ? "Fill" : `${state.viewport}px`;
  const skinLabel = SKINS.find(([key]) => key === state.skin)?.[1] || state.skin;
  const cornerLabel = CORNER_MODES.find(([key]) => key === state.corners)?.[1] || state.corners;
  const gridLines = Object.entries(LAYOUT_SURFACES).map(([surfaceKey, def]) => {
    const layout = state.gridLayouts[surfaceKey];
    const items = def.items.map(([key]) => {
      const p = layout.items[key];
      return key + "@" + [p.x, p.y, p.w, p.h].join(",");
    }).join(";");
    return "grid." + surfaceKey + "=" + (layout.enabled ? "on" : "off") + ":" + layout.cols + "x" + layout.rows + ";" + items;
  });
  summary.value = [
    "Profile UI Playground",
    `mode=${modeLabel}`,
    `viewport=${viewportLabel}`,
    "skin=" + skinLabel,
    "corners=" + cornerLabel,
    "lineWidth=1px",
    ...Object.entries(state.alpha).map(([key, value]) => "alpha." + key + "=" + value + "%"),
    ...Object.entries(state.palette).map(([key, value]) => "palette." + key + "=" + value),
    `searchCardWidth=${state.searchCardWidth}px`,
    `moveCardMinWidth=${state.moveCardMinWidth}px`,
    `powerWidth=${state.powerWidth}px`,
    `moveMetaGap=${state.moveMetaGap}px`,
    `hoverWidth=${state.hoverWidth}px`,
    `searchOrder=${state.searchOrder.join(">")}`,
    `moveHeaderOrder=${state.moveHeaderOrder.join(">")}`,
    `moveMetaOrder=${state.moveMetaOrder.join(">")}`,
    `selectedHeaderOrder=${state.selectedHeaderOrder.join(">")}`,
    `selectedFactsOrder=${state.selectedFactsOrder.join(">")}`,
    `hoverHeaderOrder=${state.hoverHeaderOrder.join(">")}`,
    ...gridLines,
  ].join("\n");
}

function updateInputs() {
  document.querySelectorAll("[data-setting]").forEach(input => {
    input.value = state[input.dataset.setting];
  });
  document.querySelectorAll("[data-alpha-setting]").forEach(input => {
    input.value = state.alpha[input.dataset.alphaSetting];
  });
}

function paletteExport() {
  return [
    "Pokémon Profile Color Lab",
    "lineWidth=1px",
    ...Object.entries(state.alpha).map(([key, value]) => "Alpha | " + key + "=" + value + "%"),
    ...COLOR_GROUPS.flatMap(group => group.items.map(([key, label]) => label + " | " + key + "=" + state.palette[key])),
  ].join("\n");
}

function applyPaletteColor(key, value, row) {
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_PALETTE, key)) return;
  const color = normalizeColor(value, state.palette[key]);
  state.palette = { ...state.palette, [key]: color };
  state.skin = "custom";
  saveState();
  row?.querySelectorAll("[data-color-key=\"" + key + "\"]").forEach(input => {
    if (input.value.toLowerCase() !== color) input.value = color;
  });
  updateButtons();
  updateSummary();
  injectOverrides();
}

function renderColorControls() {
  colorHost.replaceChildren();
  for (const group of COLOR_GROUPS) {
    const section = document.createElement("div");
    section.className = "color-group";
    const heading = document.createElement("strong");
    heading.textContent = group.label;
    section.append(heading);
    for (const [key, label] of group.items) {
      const row = document.createElement("div");
      row.className = "color-field";
      const id = "palette-" + key;
      const caption = document.createElement("label");
      caption.htmlFor = id;
      caption.textContent = label;
      caption.title = label;
      const picker = document.createElement("input");
      picker.id = id;
      picker.type = "color";
      picker.dataset.colorKey = key;
      picker.value = state.palette[key];
      picker.setAttribute("aria-label", label + " color");
      const hex = document.createElement("input");
      hex.type = "text";
      hex.dataset.colorKey = key;
      hex.value = state.palette[key];
      hex.maxLength = 7;
      hex.spellcheck = false;
      hex.setAttribute("aria-label", label + " hex");
      picker.addEventListener("input", () => applyPaletteColor(key, picker.value, row));
      hex.addEventListener("change", () => applyPaletteColor(key, hex.value, row));
      row.append(caption, picker, hex);
      section.append(row);
    }
    colorHost.append(section);
  }
}

function updateButtons() {
  modeHost.querySelectorAll("button").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.mode === state.mode));
  });
  skinHost.querySelectorAll("button").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.skin === state.skin));
  });
  cornerHost.querySelectorAll("button").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.corners === state.corners));
  });
  viewportHost.querySelectorAll("button").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.viewport === state.viewport));
  });
  layoutTargetHost.querySelectorAll("button").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.layoutSurface === state.layoutSurface));
  });
  const layout = state.gridLayouts[state.layoutSurface];
  gridToggle.setAttribute("aria-pressed", String(Boolean(layout?.enabled)));
  gridToggle.textContent = layout?.enabled ? "Grid ligado" : "Grid desligado";
}

function currentLayoutDefinition() {
  return LAYOUT_SURFACES[state.layoutSurface] || LAYOUT_SURFACES.search;
}

function currentOrder() {
  const def = currentLayoutDefinition();
  return state[def.stateKey];
}

function setCurrentOrder(next) {
  const def = currentLayoutDefinition();
  state[def.stateKey] = [...next];
  commit();
  renderLayoutList();
}

function moveLayoutItem(key, delta) {
  const order = [...currentOrder()];
  const index = order.indexOf(key);
  if (index < 0) return;
  const nextIndex = Math.min(order.length - 1, Math.max(0, index + delta));
  if (nextIndex === index) return;
  order.splice(index, 1);
  order.splice(nextIndex, 0, key);
  setCurrentOrder(order);
}

function clearDropIndicators() {
  layoutList.querySelectorAll("[data-drop-before],[data-drop-after]").forEach(node => {
    delete node.dataset.dropBefore;
    delete node.dataset.dropAfter;
  });
}

function renderLayoutList() {
  const def = currentLayoutDefinition();
  const labels = new Map(def.items);
  const order = currentOrder();
  layoutList.replaceChildren();
  order.forEach((key, index) => {
    const item = document.createElement("li");
    item.className = "layout-item";
    item.draggable = true;
    item.dataset.layoutKey = key;
    item.setAttribute("aria-label", labels.get(key) || key);

    const grip = document.createElement("span");
    grip.className = "layout-grip";
    grip.textContent = "≡";
    grip.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.className = "layout-label";
    label.textContent = labels.get(key) || key;

    const up = document.createElement("button");
    up.type = "button";
    up.textContent = "↑";
    up.title = `Mover ${label.textContent} para cima`;
    up.setAttribute("aria-label", up.title);
    up.disabled = index === 0;
    up.addEventListener("click", () => moveLayoutItem(key, -1));

    const down = document.createElement("button");
    down.type = "button";
    down.textContent = "↓";
    down.title = `Mover ${label.textContent} para baixo`;
    down.setAttribute("aria-label", down.title);
    down.disabled = index === order.length - 1;
    down.addEventListener("click", () => moveLayoutItem(key, 1));

    item.addEventListener("dragstart", event => {
      draggedLayoutKey = key;
      item.dataset.dragging = "true";
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", key);
    });
    item.addEventListener("dragend", () => {
      draggedLayoutKey = "";
      delete item.dataset.dragging;
      clearDropIndicators();
    });
    item.addEventListener("dragover", event => {
      if (!draggedLayoutKey || draggedLayoutKey === key) return;
      event.preventDefault();
      clearDropIndicators();
      const rect = item.getBoundingClientRect();
      const before = event.clientY < rect.top + rect.height / 2;
      if (before) item.dataset.dropBefore = "true";
      else item.dataset.dropAfter = "true";
      event.dataTransfer.dropEffect = "move";
    });
    item.addEventListener("drop", event => {
      event.preventDefault();
      const source = draggedLayoutKey || event.dataTransfer.getData("text/plain");
      if (!source || source === key) return;
      const next = [...order];
      const sourceIndex = next.indexOf(source);
      if (sourceIndex < 0) return;
      next.splice(sourceIndex, 1);
      let targetIndex = next.indexOf(key);
      const rect = item.getBoundingClientRect();
      const before = event.clientY < rect.top + rect.height / 2;
      if (!before) targetIndex += 1;
      next.splice(targetIndex, 0, source);
      setCurrentOrder(next);
      draggedLayoutKey = "";
      clearDropIndicators();
    });

    item.append(grip, label, up, down);
    layoutList.append(item);
  });
}

function currentGridLayout() {
  return state.gridLayouts[state.layoutSurface];
}

function currentGridItemKey() {
  const def = currentLayoutDefinition();
  const keys = def.items.map(([key]) => key);
  return keys.includes(state.gridItem) ? state.gridItem : keys[0];
}

function updateGridStatus(message, error = false) {
  gridStatus.textContent = message;
  if (error) gridStatus.dataset.error = "true";
  else delete gridStatus.dataset.error;
}

function renderGridControls() {
  const def = currentLayoutDefinition();
  const layout = currentGridLayout();
  const labels = new Map(def.items);
  const keys = def.items.map(([key]) => key);
  if (!keys.includes(state.gridItem)) state.gridItem = keys[0];

  const selected = currentGridItemKey();
  gridItem.replaceChildren(...def.items.map(([key, label]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = label;
    return option;
  }));
  gridItem.value = selected;

  document.querySelectorAll("[data-grid-setting]").forEach(input => {
    input.value = layout[input.dataset.gridSetting];
  });
  const placement = layout.items[selected];
  document.querySelectorAll("[data-grid-placement]").forEach(input => {
    const field = input.dataset.gridPlacement;
    input.value = placement[field];
    if (field === "x" || field === "w") input.max = String(layout.cols);
    if (field === "y" || field === "h") input.max = String(layout.rows);
  });
  updateButtons();
  updateGridStatus(
    (layout.enabled ? "Grid ativo" : "Grid desligado")
      + " · " + layout.cols + "×" + layout.rows
      + " · " + (labels.get(selected) || selected)
      + " [" + [placement.x, placement.y, placement.w, placement.h].join(",") + "]",
  );
}

function updateGridPlacement(key, changes) {
  const surfaceKey = state.layoutSurface;
  const def = currentLayoutDefinition();
  const layout = currentGridLayout();
  const current = layout.items[key];
  if (!current) return false;

  const requestedX = changes.x ?? current.x;
  const requestedY = changes.y ?? current.y;
  const x = clampInteger(requestedX, current.x, 1, layout.cols);
  const y = clampInteger(requestedY, current.y, 1, layout.rows);
  const requestedW = changes.w ?? current.w;
  const requestedH = changes.h ?? current.h;
  const w = clampInteger(requestedW, current.w, 1, layout.cols - x + 1);
  const h = clampInteger(requestedH, current.h, 1, layout.rows - y + 1);
  const nextPlacement = { x, y, w, h };
  const conflict = gridConflict(layout, key, nextPlacement);
  if (conflict) {
    const labels = new Map(def.items);
    renderGridControls();
    renderGridEditor();
    updateGridStatus(
      "Conflito: " + (labels.get(key) || key) + " sobrepõe " + (labels.get(conflict) || conflict) + ". Alteração rejeitada.",
      true,
    );
    return false;
  }

  const nextLayout = {
    ...layout,
    items: { ...layout.items, [key]: nextPlacement },
  };
  if (!validGridLayout(surfaceKey, nextLayout)) {
    renderGridControls();
    renderGridEditor();
    updateGridStatus("Posição/span inválido para os limites atuais. Alteração rejeitada.", true);
    return false;
  }

  state.gridLayouts[surfaceKey] = nextLayout;
  state.gridItem = key;
  const clamped = Number(requestedX) !== x || Number(requestedY) !== y || Number(requestedW) !== w || Number(requestedH) !== h;
  commit();
  updateGridStatus(clamped ? "Aplicado com clamp aos limites do grid." : "Posição aplicada sem sobreposição.");
  return true;
}

function setGridDimensions(cols, rows, forcePack = false) {
  const surfaceKey = state.layoutSurface;
  const def = currentLayoutDefinition();
  const layout = currentGridLayout();
  const nextCols = clampInteger(cols, layout.cols, 1, 8);
  const nextRows = clampInteger(rows, layout.rows, 1, 8);
  if (nextCols * nextRows < def.items.length) {
    renderGridControls();
    updateGridStatus("Grid pequeno demais: " + def.items.length + " objetos precisam de ao menos " + def.items.length + " células.", true);
    return false;
  }

  const resized = {
    ...layout,
    cols: nextCols,
    rows: nextRows,
    items: Object.fromEntries(Object.entries(layout.items).map(([key, value]) => [key, { ...value }])),
  };
  let next = resized;
  let repacked = forcePack || !validGridLayout(surfaceKey, resized);
  if (repacked) {
    const packed = packedGrid(surfaceKey, nextCols, nextRows);
    if (!packed) {
      renderGridControls();
      updateGridStatus("Não foi possível encaixar todos os objetos nesta grade.", true);
      return false;
    }
    next = { ...packed, enabled: layout.enabled };
  }
  state.gridLayouts[surfaceKey] = next;
  commit();
  updateGridStatus(repacked ? "Dimensão aplicada; objetos foram redistribuídos sem colisão." : "Dimensão aplicada preservando as posições.");
  return true;
}

function applyGridPreset(value) {
  const match = /^(\d+)x(\d+)$/.exec(String(value || ""));
  if (!match) return;
  const cols = Number(match[1]);
  const rows = Number(match[2]);
  if (!setGridDimensions(cols, rows, true)) return;
  state.gridLayouts[state.layoutSurface].enabled = true;
  commit();
  updateGridStatus("Preset " + cols + "×" + rows + " aplicado e grid ativado.");
}

function clearGridDropState() {
  gridEditor.querySelectorAll("[data-drop]").forEach(node => delete node.dataset.drop);
}

function renderGridEditor() {
  const def = currentLayoutDefinition();
  const labels = new Map(def.items);
  const layout = currentGridLayout();
  const selected = currentGridItemKey();
  gridEditor.style.setProperty("--grid-cols", layout.cols);
  gridEditor.style.setProperty("--grid-rows", layout.rows);
  gridEditor.replaceChildren();

  for (let y = 1; y <= layout.rows; y += 1) {
    for (let x = 1; x <= layout.cols; x += 1) {
      const cell = document.createElement("div");
      cell.className = "grid-cell";
      cell.dataset.gridX = String(x);
      cell.dataset.gridY = String(y);
      cell.style.gridColumn = String(x);
      cell.style.gridRow = String(y);
      cell.textContent = x + "," + y;
      cell.title = "Coluna " + x + ", linha " + y;
      cell.addEventListener("click", () => updateGridPlacement(selected, { x, y }));
      cell.addEventListener("dragover", event => {
        if (!draggedGridKey) return;
        event.preventDefault();
        clearGridDropState();
        cell.dataset.drop = "true";
        event.dataTransfer.dropEffect = "move";
      });
      cell.addEventListener("drop", event => {
        event.preventDefault();
        const source = draggedGridKey || event.dataTransfer.getData("text/plain");
        clearGridDropState();
        if (source) updateGridPlacement(source, { x, y });
      });
      gridEditor.append(cell);
    }
  }

  for (const [key] of def.items) {
    const placement = layout.items[key];
    const object = document.createElement("button");
    object.type = "button";
    object.className = "grid-object";
    object.draggable = true;
    object.dataset.gridObject = key;
    object.setAttribute("aria-pressed", String(key === selected));
    object.textContent = labels.get(key) || key;
    object.title = (labels.get(key) || key) + " · " + [placement.x, placement.y, placement.w, placement.h].join(",");
    object.setAttribute(
      "aria-label",
      (labels.get(key) || key)
        + ", coluna " + placement.x
        + ", linha " + placement.y
        + ", largura " + placement.w
        + ", altura " + placement.h,
    );
    object.style.gridColumn = placement.x + " / span " + placement.w;
    object.style.gridRow = placement.y + " / span " + placement.h;
    object.addEventListener("click", () => {
      state.gridItem = key;
      saveState();
      renderGridControls();
      renderGridEditor();
    });
    object.addEventListener("dragstart", event => {
      draggedGridKey = key;
      object.dataset.dragging = "true";
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", key);
    });
    object.addEventListener("dragend", () => {
      draggedGridKey = "";
      delete object.dataset.dragging;
      clearGridDropState();
    });
    gridEditor.append(object);
  }
}

function commit({ reload = false } = {}) {
  state = normalize(state);
  document.documentElement.dataset.playgroundCorners = state.corners;
  saveState();
  updateInputs();
  renderColorControls();
  applyViewport();
  updateButtons();
  renderLayoutList();
  renderGridControls();
  renderGridEditor();
  updateSummary();
  if (reload) reloadPreview();
  else injectOverrides();
}

function makeButtons() {
  for (const [key, label] of MODES) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.mode = key;
    button.textContent = label;
    button.addEventListener("click", () => {
      if (state.mode === key) return;
      state.mode = key;
      commit({ reload: true });
    });
    modeHost.append(button);
  }
  for (const [key, label] of SKINS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.skin = key;
    button.textContent = label;
    button.addEventListener("click", () => {
      if (state.skin === key) return;
      state.skin = key;
      commit();
    });
    skinHost.append(button);
  }
  for (const [key, label] of CORNER_MODES) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.corners = key;
    button.textContent = label;
    button.addEventListener("click", () => {
      if (state.corners === key) return;
      state.corners = key;
      commit();
    });
    cornerHost.append(button);
  }
  for (const [key, label] of VIEWPORTS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.viewport = key;
    button.textContent = label;
    button.addEventListener("click", () => {
      state.viewport = key;
      commit();
    });
    viewportHost.append(button);
  }
  for (const [key, def] of Object.entries(LAYOUT_SURFACES)) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.layoutSurface = key;
    button.textContent = def.label;
    button.addEventListener("click", () => {
      state.layoutSurface = key;
      if (!def.items.some(([itemKey]) => itemKey === state.gridItem)) state.gridItem = def.items[0][0];
      saveState();
      updateButtons();
      renderLayoutList();
      renderGridControls();
      renderGridEditor();
    });
    layoutTargetHost.append(button);
  }
}

async function copyText(text, success) {
  const fallback = document.querySelector("[data-copy-fallback]");
  try {
    await navigator.clipboard.writeText(text);
    if (fallback) {
      fallback.hidden = true;
      fallback.value = "";
    }
    status.textContent = success;
  } catch {
    if (!fallback) {
      status.textContent = "Clipboard bloqueado; export indisponível para cópia automática.";
      return;
    }
    fallback.hidden = false;
    fallback.value = text;
    fallback.focus();
    fallback.select();
    fallback.scrollIntoView({ block: "nearest" });
    fallback.addEventListener("blur", () => {
      fallback.hidden = true;
      fallback.value = "";
    }, { once: true });
    status.textContent = "Clipboard bloqueado; conteúdo exato do export selecionado para Ctrl+C.";
  }
}

makeButtons();
updateInputs();
renderColorControls();
applyViewport();
updateButtons();
renderLayoutList();
renderGridControls();
renderGridEditor();
updateSummary();
iframe.src = previewUrl();

iframe.addEventListener("load", () => {
  installPreviewTransformObserver();
  injectOverrides();
  window.setTimeout(updateMetrics, 120);
});

document.querySelectorAll("[data-setting]").forEach(input => {
  input.addEventListener("input", () => {
    state[input.dataset.setting] = input.value;
    commit();
  });
});

document.querySelectorAll("[data-alpha-setting]").forEach(input => {
  input.addEventListener("input", () => {
    const key = input.dataset.alphaSetting;
    state.alpha = { ...state.alpha, [key]: clampInteger(input.value, DEFAULT_ALPHA[key], 0, 100) };
    state.skin = "custom";
    commit();
  });
});

gridToggle.addEventListener("click", () => {
  const layout = currentGridLayout();
  state.gridLayouts[state.layoutSurface] = { ...layout, enabled: !layout.enabled };
  commit();
});

document.querySelector("[data-grid-reset]").addEventListener("click", () => {
  state.gridLayouts[state.layoutSurface] = defaultGrid(state.layoutSurface);
  state.gridItem = currentLayoutDefinition().items[0][0];
  commit();
  updateGridStatus("Grid desta área restaurado para o layout base.");
});

document.querySelectorAll("[data-grid-preset]").forEach(button => {
  button.addEventListener("click", () => applyGridPreset(button.dataset.gridPreset));
});

document.querySelectorAll("[data-grid-setting]").forEach(input => {
  input.addEventListener("change", () => {
    const layout = currentGridLayout();
    const cols = input.dataset.gridSetting === "cols" ? input.value : layout.cols;
    const rows = input.dataset.gridSetting === "rows" ? input.value : layout.rows;
    setGridDimensions(cols, rows);
  });
});

gridItem.addEventListener("change", () => {
  state.gridItem = gridItem.value;
  saveState();
  renderGridControls();
  renderGridEditor();
});

document.querySelectorAll("[data-grid-placement]").forEach(input => {
  input.addEventListener("change", () => {
    const key = currentGridItemKey();
    updateGridPlacement(key, { [input.dataset.gridPlacement]: input.value });
  });
});

document.querySelector("[data-reset]").addEventListener("click", () => {
  const fresh = cloneDefaults();
  fresh.mode = state.mode;
  fresh.viewport = state.viewport;
  fresh.layoutSurface = state.layoutSurface;
  fresh.corners = state.corners;
  state = fresh;
  commit();
});

document.querySelector("[data-palette-reset]").addEventListener("click", () => {
  state.palette = { ...DEFAULT_PALETTE };
  state.alpha = { ...DEFAULT_ALPHA };
  state.skin = "custom";
  commit();
  status.textContent = "Paleta restaurada ao padrão Game Palette; todas as linhas permanecem em 1px.";
});

document.querySelector("[data-palette-copy]").addEventListener("click", () => {
  copyText(paletteExport(), "Paleta copiada. Pode colar direto no chat.");
});

document.querySelector("[data-layout-reset]").addEventListener("click", () => {
  const def = currentLayoutDefinition();
  state[def.stateKey] = [...DEFAULTS[def.stateKey]];
  commit();
});

document.querySelector("[data-reload]").addEventListener("click", reloadPreview);

document.querySelector("[data-copy]").addEventListener("click", () => {
  copyText(summary.value, "Resumo copiado. Pode colar direto no chat.");
});

document.querySelector("[data-copy-css]").addEventListener("click", () => {
  copyText(cssOverrides().trim(), "CSS temporário copiado.");
});

window.addEventListener("resize", updateMetrics);
