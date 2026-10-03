export const GRID_COLUMNS = 4;
export const GRID_ROWS = 6;

export const BOXES = Object.freeze([
  Object.freeze({ id: "battle", label: "Battle", description: "Team + ativo + alvo" }),
  Object.freeze({ id: "hunt-summary", label: "Hunt Summary", description: "Status e resumo da sessão" }),
  Object.freeze({ id: "capture", label: "Capture", description: "Taxa, chance e falhas" }),
  Object.freeze({ id: "captured-seen", label: "Captured / Seen", description: "Capturados por raridade" }),
  Object.freeze({ id: "economy-xp", label: "Economy / XP", description: "Receita, resultado e experiência" }),
  Object.freeze({ id: "history", label: "History", description: "Hunt Story + Loot Story" }),
]);

export const DEFAULT_LAYOUT = Object.freeze({
  battle: Object.freeze({ x: 1, y: 1, w: 2, h: 1 }),
  "hunt-summary": Object.freeze({ x: 1, y: 2, w: 2, h: 1 }),
  capture: Object.freeze({ x: 1, y: 3, w: 2, h: 1 }),
  "captured-seen": Object.freeze({ x: 3, y: 1, w: 2, h: 1 }),
  "economy-xp": Object.freeze({ x: 1, y: 4, w: 2, h: 1 }),
  history: Object.freeze({ x: 3, y: 2, w: 2, h: 3 }),
});

const BOX_IDS = new Set(BOXES.map(box => box.id));

export function cloneLayout(layout = DEFAULT_LAYOUT) {
  return Object.fromEntries(BOXES.map(box => [box.id, { ...layout[box.id] }]));
}

function integer(value) {
  return typeof value === "number" && Number.isInteger(value) ? value : NaN;
}

export function normalizePlacement(placement) {
  return {
    x: integer(placement?.x),
    y: integer(placement?.y),
    w: integer(placement?.w),
    h: integer(placement?.h),
  };
}

export function placementWithinGrid(placement) {
  const p = normalizePlacement(placement);
  return [p.x, p.y, p.w, p.h].every(Number.isFinite)
    && p.x >= 1 && p.y >= 1 && p.w >= 1 && p.h >= 1
    && p.w <= GRID_COLUMNS && p.h <= GRID_ROWS
    && p.x + p.w - 1 <= GRID_COLUMNS
    && p.y + p.h - 1 <= GRID_ROWS;
}

export function placementsOverlap(a, b) {
  return a.x < b.x + b.w
    && a.x + a.w > b.x
    && a.y < b.y + b.h
    && a.y + a.h > b.y;
}

export function validateLayout(layout) {
  if (!layout || typeof layout !== "object") return { ok: false, reason: "missing-layout" };
  const ids = Object.keys(layout);
  if (ids.length !== BOXES.length || ids.some(id => !BOX_IDS.has(id)))
    return { ok: false, reason: "box-set" };

  for (const box of BOXES) {
    if (!placementWithinGrid(layout[box.id]))
      return { ok: false, reason: "bounds", boxId: box.id };
  }

  for (let first = 0; first < BOXES.length; first += 1) {
    for (let second = first + 1; second < BOXES.length; second += 1) {
      const a = BOXES[first].id;
      const b = BOXES[second].id;
      if (placementsOverlap(layout[a], layout[b]))
        return { ok: false, reason: "overlap", boxId: a, conflictId: b };
    }
  }
  return { ok: true };
}

export function tryPlace(layout, boxId, candidate) {
  if (!BOX_IDS.has(boxId)) return { ok: false, reason: "unknown-box", layout };
  const normalized = normalizePlacement(candidate);
  if (!placementWithinGrid(normalized)) return { ok: false, reason: "bounds", layout };

  const conflictId = BOXES
    .map(box => box.id)
    .find(id => id !== boxId && placementsOverlap(normalized, layout[id]));
  if (conflictId) return { ok: false, reason: "overlap", conflictId, layout };

  const next = cloneLayout(layout);
  next[boxId] = normalized;
  return { ok: true, layout: next };
}

export function layoutToJson(layout) {
  const ordered = Object.fromEntries(
    BOXES.map(box => [box.id, normalizePlacement(layout[box.id])]),
  );
  return JSON.stringify(ordered, null, 2);
}

export function layoutToCss(layout) {
  return BOXES.map(box => {
    const p = layout[box.id];
    return '[data-card-layout="' + box.id + '"] { grid-column: ' + p.x + ' / span ' + p.w
      + '; grid-row: ' + p.y + ' / span ' + p.h + '; }';
  }).join("\n");
}

export function parseLayoutJson(text) {
  try {
    const parsed = JSON.parse(text);
    const normalized = Object.fromEntries(
      BOXES.map(box => [box.id, normalizePlacement(parsed?.[box.id])]),
    );
    const validation = validateLayout(normalized);
    return validation.ok
      ? { ok: true, layout: normalized }
      : { ok: false, reason: validation.reason };
  } catch {
    return { ok: false, reason: "json" };
  }
}
