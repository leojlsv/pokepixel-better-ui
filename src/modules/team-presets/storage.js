import { teamPresetsConfig as config } from "./config.js";

const normalizeName = value => String(value || "").trim().slice(0, 40);
const clone = preset => ({ ...preset, members: preset.members.map(member => ({ ...member })) });

function normalizeSnapshot(snapshot) {
  const seen = new Set(), members = [];
  for (const entry of Array.isArray(snapshot?.members) ? snapshot.members : []) {
    const id = String(entry?.id ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    members.push({ id, name: String(entry?.name || id).trim().slice(0, 80) });
  }
  if (!members.length || members.length > 6) return null;
  const requestedLeader = String(snapshot?.leaderId ?? "");
  return { members, leaderId: members.some(member => member.id === requestedLeader) ? requestedLeader : members[0].id };
}

function normalizePreset(value) {
  const name = normalizeName(value?.name), snapshot = normalizeSnapshot(value);
  if (!name || !snapshot) return null;
  return {
    id: String(value?.id || ""),
    name,
    ...snapshot,
    createdAt: Number(value?.createdAt) || Date.now(),
    updatedAt: Number(value?.updatedAt) || Number(value?.createdAt) || Date.now(),
  };
}

const defaultId = () => globalThis.crypto?.randomUUID?.() || `team-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function createTeamPresetStorage({ storage = () => window.localStorage, now = () => Date.now(), makeId = defaultId } = {}) {
  let presets = [], persistent = true;

  function reload() {
    try {
      const parsed = JSON.parse(storage().getItem(config.storageKey) || "[]");
      presets = (Array.isArray(parsed) ? parsed : []).map(normalizePreset).filter(Boolean);
      persistent = true;
    } catch {
      persistent = false;
    }
    return list();
  }

  function persist() {
    try {
      storage().setItem(config.storageKey, JSON.stringify(presets));
      persistent = true;
    } catch {
      persistent = false;
    }
  }

  function list() { return presets.map(clone); }

  function upsert(name, snapshot) {
    const cleanName = normalizeName(name), cleanSnapshot = normalizeSnapshot(snapshot);
    if (!cleanName || !cleanSnapshot) return null;
    const index = presets.findIndex(preset => preset.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase());
    const timestamp = now();
    if (index >= 0) {
      presets[index] = { ...presets[index], name: cleanName, ...cleanSnapshot, updatedAt: timestamp };
      persist();
      return { preset: clone(presets[index]), created: false };
    }
    const preset = { id: makeId(), name: cleanName, ...cleanSnapshot, createdAt: timestamp, updatedAt: timestamp };
    presets.push(preset); persist();
    return { preset: clone(preset), created: true };
  }

  function rename(id, name) {
    const cleanName = normalizeName(name), preset = presets.find(entry => entry.id === id);
    if (!preset || !cleanName) return false;
    if (presets.some(entry => entry.id !== id && entry.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase())) return false;
    preset.name = cleanName; preset.updatedAt = now(); persist(); return true;
  }

  function remove(id) {
    const next = presets.filter(preset => preset.id !== id);
    if (next.length === presets.length) return false;
    presets = next; persist(); return true;
  }

  reload();
  return { list, reload, upsert, rename, remove, isPersistent: () => persistent };
}
