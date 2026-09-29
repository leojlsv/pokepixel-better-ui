import { normalizeMovesetSnapshot, movesetSignature } from "./storage.js";

const cleanId = value => String(value ?? "").trim();

export function normalizeNativeMoveset(data) {
  const snapshot = normalizeMovesetSnapshot({ selected: data?.selected });
  return {
    creatureId: cleanId(data?.creature_id),
    revision: data?.revision,
    mode: String(data?.mode || ""),
    moves: snapshot?.moves || [],
    available: (Array.isArray(data?.available) ? data.available : [])
      .map(move => ({ id: cleanId(move?.id), name: String(move?.name || move?.id || ""), element: String(move?.element || "") }))
      .filter(move => move.id),
    raw: data,
  };
}

export async function readNativeMoveset(win, creatureId) {
  const id = cleanId(creatureId), api = win?.PokeIdle?.Api;
  if (!id || typeof api?.getMoveset !== "function") throw new Error("moveset-api-unavailable");
  return normalizeNativeMoveset(await api.getMoveset(id));
}

export async function captureTeamMoveset(win, creatureId) {
  try {
    const current = await readNativeMoveset(win, creatureId);
    if (!current.moves.length) return { ok: false, reason: "moveset-empty" };
    return { ok: true, snapshot: { moves: current.moves }, current };
  } catch (error) {
    return { ok: false, reason: error?.message === "moveset-api-unavailable" ? "moveset-api-unavailable" : "moveset-read-failed", detail: error?.message };
  }
}

export async function applyTeamMoveset(win, creatureId, preset) {
  const id = cleanId(creatureId), wanted = normalizeMovesetSnapshot(preset);
  const api = win?.PokeIdle?.Api;
  if (!id || !wanted) return { ok: false, reason: "preset-invalid" };
  if (typeof api?.getMoveset !== "function" || typeof api?.saveMoveset !== "function")
    return { ok: false, reason: "moveset-api-unavailable" };
  try {
    const before = await readNativeMoveset(win, id);
    const available = new Set(before.available.map(move => move.id));
    const required = Math.min(4, before.available.length);
    const moveIds = wanted.moves.map(move => move.id);
    if (!required || moveIds.length !== required || moveIds.some(moveId => !available.has(moveId)))
      return { ok: false, reason: "preset-incompatible" };
    await api.saveMoveset(id, { mode: "manual", move_ids: moveIds, revision: before.revision });
    const verified = await readNativeMoveset(win, id);
    if (verified.mode !== "manual" || movesetSignature(verified) !== movesetSignature(wanted))
      return { ok: false, reason: "final-state-mismatch" };
    win?.PokeIdle?.Bus?.emit?.("moveset.saved", verified.raw);
    return { ok: true, current: verified };
  } catch (error) {
    return { ok: false, reason: "moveset-apply-failed", detail: error?.message };
  }
}
