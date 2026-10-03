import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LAYOUT,
  cloneLayout,
  layoutToCss,
  layoutToJson,
  parseLayoutJson,
  tryPlace,
  validateLayout,
} from "../tools/card-mode-layout-playground/layout-model.js";

test("Card Mode layout playground default is the user-selected valid 4x6 arrangement", () => {
  const layout = cloneLayout(DEFAULT_LAYOUT);
  assert.deepEqual(validateLayout(layout), { ok: true });
  assert.deepEqual(layout, {
    battle: { x: 1, y: 1, w: 2, h: 1 },
    "hunt-summary": { x: 1, y: 2, w: 2, h: 1 },
    capture: { x: 1, y: 3, w: 2, h: 1 },
    "captured-seen": { x: 3, y: 1, w: 2, h: 1 },
    "economy-xp": { x: 1, y: 4, w: 2, h: 1 },
    history: { x: 3, y: 2, w: 2, h: 3 },
  });
});

test("valid placement can use independent width and height spans", () => {
  const layout = cloneLayout(DEFAULT_LAYOUT);
  const result = tryPlace(layout, "economy-xp", { x: 1, y: 5, w: 2, h: 2 });
  assert.equal(result.ok, true);
  assert.deepEqual(result.layout["economy-xp"], { x: 1, y: 5, w: 2, h: 2 });
  assert.deepEqual(validateLayout(result.layout), { ok: true });
});

test("overlap and out-of-bounds changes are transactional", () => {
  const layout = cloneLayout(DEFAULT_LAYOUT);
  const before = cloneLayout(layout);
  const overlap = tryPlace(layout, "hunt-summary", { x: 3, y: 2, w: 2, h: 1 });
  const bounds = tryPlace(layout, "history", { x: 1, y: 6, w: 4, h: 2 });
  assert.equal(overlap.ok, false);
  assert.equal(overlap.reason, "overlap");
  assert.equal(bounds.ok, false);
  assert.equal(bounds.reason, "bounds");
  assert.deepEqual(layout, before);
});

test("canonical JSON round-trips valid geometry", () => {
  const layout = cloneLayout(DEFAULT_LAYOUT);
  const parsed = parseLayoutJson(layoutToJson(layout));
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.layout, layout);
});

test("default CSS export matches the user-selected layout handoff", () => {
  const layout = cloneLayout(DEFAULT_LAYOUT);
  assert.equal(
    layoutToCss(layout),
    [
      '[data-card-layout="battle"] { grid-column: 1 / span 2; grid-row: 1 / span 1; }',
      '[data-card-layout="hunt-summary"] { grid-column: 1 / span 2; grid-row: 2 / span 1; }',
      '[data-card-layout="capture"] { grid-column: 1 / span 2; grid-row: 3 / span 1; }',
      '[data-card-layout="captured-seen"] { grid-column: 3 / span 2; grid-row: 1 / span 1; }',
      '[data-card-layout="economy-xp"] { grid-column: 1 / span 2; grid-row: 4 / span 1; }',
      '[data-card-layout="history"] { grid-column: 3 / span 2; grid-row: 2 / span 3; }',
    ].join("\n"),
  );
});

test("layout geometry rejects coercible non-number values", () => {
  const layout = cloneLayout(DEFAULT_LAYOUT);
  const result = tryPlace(layout, "history", { x: true, y: 3, w: true, h: true });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "bounds");
  assert.equal(
    parseLayoutJson(JSON.stringify({
      ...layout,
      history: { x: true, y: 3, w: 1, h: 1 },
    })).ok,
    false,
  );
});

test("every 4x6 candidate is accepted only when its footprint is in bounds and free", () => {
  const layout = cloneLayout(DEFAULT_LAYOUT);
  const movingId = "history";
  const occupied = new Set();
  for (const [id, placement] of Object.entries(layout)) {
    if (id === movingId) continue;
    for (let y = placement.y; y < placement.y + placement.h; y += 1)
      for (let x = placement.x; x < placement.x + placement.w; x += 1)
        occupied.add(x + "," + y);
  }

  for (let y = 1; y <= 6; y += 1) {
    for (let x = 1; x <= 4; x += 1) {
      for (let h = 1; h <= 6; h += 1) {
        for (let w = 1; w <= 4; w += 1) {
          const inBounds = x + w - 1 <= 4 && y + h - 1 <= 6;
          let free = inBounds;
          for (let row = y; free && row < y + h; row += 1)
            for (let column = x; column < x + w; column += 1)
              if (occupied.has(column + "," + row)) free = false;
          assert.equal(
            tryPlace(layout, movingId, { x, y, w, h }).ok,
            free,
            "candidate " + JSON.stringify({ x, y, w, h }),
          );
        }
      }
    }
  }
});
