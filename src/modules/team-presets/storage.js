import { teamPresetsConfig as config } from "./config.js";

const normalizeName = value => String(value || "").trim().slice(0, 40);
const cloneMember = member => ({ ...member });
const clone = preset => ({ ...preset, members: preset.members.map(cloneMember) });

function normalizeMember(entry) {
  const id = String(entry?.id ?? "").trim();
  if (!id) return null;
  const member = { id, name: String(entry?.name || id).trim().slice(0, 80) };
  const sprite = String(entry?.sprite || "").trim();
  if (sprite) member.sprite = sprite;
  const level = Number(entry?.level);
  if (Number.isFinite(level)) member.level = level;
  return member;
}

function normalizeSnapshot(snapshot, legacy = false) {
  const seen = new Set(), members = [];
  for (const entry of Array.isArray(snapshot?.members) ? snapshot.members : []) {
    const member = normalizeMember(entry);
    if (!member || seen.has(member.id)) continue;
    seen.add(member.id); members.push(member);
  }
  if (!members.length || members.length > 6) return null;
  const requestedActive = String(snapshot?.activeId ?? snapshot?.leaderId ?? "");
  const activeId = members.some(member => member.id === requestedActive) ? requestedActive : members[0].id;
  return { members, activeId, orderVerified: legacy ? false : snapshot?.orderVerified !== false };
}

function normalizePreset(value, legacy = false) {
  const name = normalizeName(value?.name), snapshot = normalizeSnapshot(value, legacy);
  if (!name || !snapshot) return null;
  return {
    id: String(value?.id || ""), name, ...snapshot,
    createdAt: Number(value?.createdAt) || Date.now(),
    updatedAt: Number(value?.updatedAt) || Number(value?.createdAt) || Date.now(),
  };
}

const defaultId = () => globalThis.crypto?.randomUUID?.() || `team-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function createTeamPresetStorage({ storage = () => window.localStorage, now = () => Date.now(), makeId = defaultId } = {}) {
  let presets = [], persistent = true;

  function persist() {
    try { storage().setItem(config.storageKey, JSON.stringify(presets)); persistent = true; }
    catch { persistent = false; }
  }

  function reload() {
    try {
      persistent = true;
      const target = storage(), current = JSON.parse(target.getItem(config.storageKey) || "null");
      if (Array.isArray(current)) presets = current.map(value => normalizePreset(value, false)).filter(Boolean);
      else {
        const legacy = JSON.parse(target.getItem(config.legacyStorageKey) || "[]");
        presets = (Array.isArray(legacy) ? legacy : []).map(value => normalizePreset(value, true)).filter(Boolean);
        if (presets.length) persist();
      }
    } catch { persistent = false; }
    return list();
  }

  function list() { return presets.map(clone); }

  function upsert(name, snapshot) {
    const cleanName = normalizeName(name), cleanSnapshot = normalizeSnapshot(snapshot);
    if (!cleanName || !cleanSnapshot) return null;
    const index = presets.findIndex(preset => preset.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase()), timestamp = now();
    if (index >= 0) {
      presets[index] = { ...presets[index], name: cleanName, ...cleanSnapshot, updatedAt: timestamp };
      persist(); return { preset: clone(presets[index]), created: false };
    }
    const preset = { id: makeId(), name: cleanName, ...cleanSnapshot, createdAt: timestamp, updatedAt: timestamp };
    presets.push(preset); persist(); return { preset: clone(preset), created: true };
  }

  function replaceSnapshot(id, snapshot) {
    const preset = presets.find(entry => entry.id === id), cleanSnapshot = normalizeSnapshot(snapshot);
    if (!preset || !cleanSnapshot) return false;
    Object.assign(preset, cleanSnapshot, { updatedAt: now() }); persist(); return true;
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

  function movePreset(id, delta) {
    const index = presets.findIndex(preset => preset.id === id), target = index + Math.sign(Number(delta) || 0);
    if (index < 0 || target < 0 || target >= presets.length) return false;
    [presets[index], presets[target]] = [presets[target], presets[index]];
    presets[target].updatedAt = now(); persist(); return true;
  }

  function moveMember(id, memberId, delta) {
    const preset = presets.find(entry => entry.id === id);
    if (!preset) return false;
    const index = preset.members.findIndex(member => member.id === memberId), target = index + Math.sign(Number(delta) || 0);
    if (index < 0 || target < 0 || target >= preset.members.length) return false;
    [preset.members[index], preset.members[target]] = [preset.members[target], preset.members[index]];
    preset.updatedAt = now(); persist(); return true;
  }

  function setActive(id, memberId) {
    const preset = presets.find(entry => entry.id === id);
    if (!preset || !preset.members.some(member => member.id === memberId)) return false;
    preset.activeId = memberId; preset.updatedAt = now(); persist(); return true;
  }

  function confirmOrder(id) {
    const preset = presets.find(entry => entry.id === id);
    if (!preset) return false;
    preset.orderVerified = true; preset.updatedAt = now(); persist(); return true;
  }

  reload();
  return { list, reload, upsert, replaceSnapshot, rename, remove, movePreset, moveMember, setActive, confirmOrder, isPersistent: () => persistent };
}
