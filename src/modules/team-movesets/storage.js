import { teamMovesetsConfig as config } from "./config.js";

const cleanText = (value, limit) => String(value ?? "").trim().slice(0, limit);
const cleanCreatureId = value => cleanText(value, 160);
const cleanName = value => cleanText(value, 40);

function normalizeMove(value) {
  const id = cleanText(value?.id ?? value, 160);
  if (!id) return null;
  const move = { id, name: cleanText(value?.name || id, 100) || id };
  const element = cleanText(value?.element, 40);
  if (element) move.element = element;
  return move;
}

export function normalizeMovesetSnapshot(snapshot) {
  const source = Array.isArray(snapshot?.moves) ? snapshot.moves
    : Array.isArray(snapshot?.selected) ? snapshot.selected
      : Array.isArray(snapshot?.moveIds) ? snapshot.moveIds
        : [];
  const seen = new Set(), moves = [];
  for (const value of source) {
    const move = normalizeMove(value);
    if (!move || seen.has(move.id)) continue;
    seen.add(move.id); moves.push(move);
    if (moves.length === 4) break;
  }
  return moves.length ? { moves } : null;
}

export const movesetSignature = value => {
  const normalized = normalizeMovesetSnapshot(value);
  return normalized ? normalized.moves.map(move => move.id).join("\u001f") : "";
};

const clone = preset => ({ ...preset, moves: preset.moves.map(move => ({ ...move })) });

function normalizePreset(value) {
  const creatureId = cleanCreatureId(value?.creatureId), name = cleanName(value?.name);
  const snapshot = normalizeMovesetSnapshot(value);
  if (!creatureId || !name || !snapshot) return null;
  return {
    id: cleanText(value?.id, 160),
    creatureId,
    name,
    ...snapshot,
    marker: Number.isInteger(Number(value?.marker)) && Number(value.marker) > 0 ? Number(value.marker) : 0,
    createdAt: Number(value?.createdAt) || Date.now(),
    updatedAt: Number(value?.updatedAt) || Number(value?.createdAt) || Date.now(),
  };
}

function normalizeMarkers(list) {
  const used = new Map();
  for (const preset of list) {
    if (!used.has(preset.creatureId)) used.set(preset.creatureId, new Set());
    const creatureMarkers = used.get(preset.creatureId);
    let marker = preset.marker;
    if (!Number.isInteger(marker) || marker < 1 || creatureMarkers.has(marker)) {
      marker = 1;
      while (creatureMarkers.has(marker)) marker++;
      preset.marker = marker;
    }
    creatureMarkers.add(marker);
  }
  return list;
}

const defaultId = () => globalThis.crypto?.randomUUID?.()
  || `moveset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function createTeamMovesetStorage({
  storage = () => window.localStorage,
  now = () => Date.now(),
  makeId = defaultId,
} = {}) {
  let presets = [], persistent = true;

  function persist() {
    try {
      storage().setItem(config.storageKey, JSON.stringify(presets));
      persistent = true;
    } catch {
      persistent = false;
    }
  }

  function reload() {
    try {
      const raw = JSON.parse(storage().getItem(config.storageKey) || "[]");
      presets = normalizeMarkers((Array.isArray(raw) ? raw : []).map(normalizePreset).filter(Boolean));
      persistent = true;
    } catch {
      persistent = false;
    }
    return list();
  }

  function list(creatureId) {
    const wanted = cleanCreatureId(creatureId);
    return presets.filter(preset => !wanted || preset.creatureId === wanted).map(clone);
  }

  function upsert(creatureId, name, snapshot) {
    const cleanId = cleanCreatureId(creatureId), cleanPresetName = cleanName(name);
    const normalized = normalizeMovesetSnapshot(snapshot);
    if (!cleanId || !cleanPresetName || !normalized) return null;
    const signature = movesetSignature(normalized), timestamp = now();
    const sameName = presets.findIndex(preset => preset.creatureId === cleanId
      && preset.name.toLocaleLowerCase() === cleanPresetName.toLocaleLowerCase());
    const duplicate = presets.find((preset, index) => preset.creatureId === cleanId
      && index !== sameName && movesetSignature(preset) === signature);
    if (duplicate) return { preset: clone(duplicate), created: false, duplicateLoadout: true };
    if (sameName >= 0) {
      presets[sameName] = { ...presets[sameName], name: cleanPresetName, ...normalized, updatedAt: timestamp };
      persist();
      return { preset: clone(presets[sameName]), created: false };
    }
    const preset = {
      id: makeId(), creatureId: cleanId, name: cleanPresetName, ...normalized,
      marker: (() => {
        const used = new Set(presets.filter(entry => entry.creatureId === cleanId).map(entry => entry.marker));
        let marker = 1; while (used.has(marker)) marker++; return marker;
      })(),
      createdAt: timestamp, updatedAt: timestamp,
    };
    presets.push(preset); persist();
    return { preset: clone(preset), created: true };
  }

  function replaceSnapshot(id, creatureId, snapshot) {
    const index = presets.findIndex(preset => preset.id === id && preset.creatureId === cleanCreatureId(creatureId));
    const normalized = normalizeMovesetSnapshot(snapshot);
    if (index < 0 || !normalized) return { ok: false };
    const signature = movesetSignature(normalized);
    const duplicate = presets.find((preset, otherIndex) => otherIndex !== index
      && preset.creatureId === presets[index].creatureId && movesetSignature(preset) === signature);
    if (duplicate) return { ok: false, duplicatePreset: clone(duplicate) };
    presets[index] = { ...presets[index], ...normalized, updatedAt: now() };
    persist();
    return { ok: true, preset: clone(presets[index]) };
  }

  function remove(id, creatureId) {
    const cleanId = cleanCreatureId(creatureId), next = presets.filter(preset => !(preset.id === id && preset.creatureId === cleanId));
    if (next.length === presets.length) return false;
    presets = next; persist(); return true;
  }

  reload();
  return { list, reload, upsert, replaceSnapshot, remove, isPersistent: () => persistent };
}
