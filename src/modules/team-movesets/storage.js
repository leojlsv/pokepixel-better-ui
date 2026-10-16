import { teamMovesetsConfig as config } from "./config.js";
import {
  currentStorageOwner, legacyImportKey, mergeRecoveredSession, nextUniqueId, normalizeStorageOwner,
  readScopedRecords, trainerStorageKey, uniqueStoredIds, withOwnerImportLock,
  withOwnerMutationLock, writeScopedChanges,
} from "../../core/trainer-storage-scope.js";

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
    createdAt: Number(value?.createdAt) || 1,
    updatedAt: Number(value?.updatedAt) || Number(value?.createdAt) || 1,
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
  owner = currentStorageOwner,
  locks = () => globalThis.navigator?.locks,
  mutationLocks,
  now = () => Date.now(),
  makeId = defaultId,
} = {}) {
  let presets = [], lastCommitted = [], persistent = false, loadedOwner = null, protectedRecord = false;
  let diskReadable = true, coordinatedWrite = true;
  const sessionByOwner = new Map();
  const readOwner = () => normalizeStorageOwner(owner());
  const ownerKey = value => trainerStorageKey(config.scopedStoragePrefix, value);
  const normalizeRecords = raw => uniqueStoredIds(normalizeMarkers(
    (Array.isArray(raw) ? raw : []).map(normalizePreset).filter(Boolean),
  ));
  const sameRecord = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
  const sameName = (entry, creatureId, name) => entry.creatureId === creatureId
    && entry.name.toLocaleLowerCase() === name.toLocaleLowerCase();
  const mutationLockKey = active => `ppbui:team-movesets:owner:${encodeURIComponent(active)}`;
  function mutate(failed, work, isCurrent = () => true) {
    const capturedOwner = readOwner();
    const stillCurrent = () => {
      try { return isCurrent() === true; }
      catch { return false; }
    };
    if (!capturedOwner || !stillCurrent()) return failed;
    const run = () => readOwner() === capturedOwner && stillCurrent() ? work() : failed;
    if (typeof mutationLocks !== "function") { coordinatedWrite = true; return run(); }
    let provider;
    try { provider = mutationLocks(); } catch { return failed; }
    if (typeof provider?.request !== "function") {
      coordinatedWrite = false;
      return run();
    }
    coordinatedWrite = true;
    return withOwnerMutationLock(provider, mutationLockKey(capturedOwner), run, failed);
  }
  function invokeMutation(failed, method, args) {
    const forwarded = [...args];
    const isCurrent = typeof forwarded[forwarded.length - 1] === "function"
      ? forwarded.pop() : () => true;
    return mutate(failed, () => method(...forwarded), isCurrent);
  }

  function ensureOwner() {
    const next = readOwner();
    if (next === loadedOwner) return next;
    if (next !== loadedOwner && loadedOwner && !persistent) {
      sessionByOwner.set(loadedOwner, {
        records: presets.map(clone), baseline: lastCommitted.map(clone), protectedRecord,
      });
    }
    loadedOwner = next;
    presets = [];
    lastCommitted = [];
    persistent = Boolean(next);
    protectedRecord = false;
    diskReadable = true;
    if (!next) return "";
    const session = sessionByOwner.get(next);
    if (session) {
      presets = session.records.map(clone);
      lastCommitted = session.baseline.map(clone);
      protectedRecord = session.protectedRecord;
      persistent = false;
      return next;
    }
    try {
      presets = readScopedRecords(storage(), ownerKey(next), normalizeRecords);
      lastCommitted = presets.map(clone);
    } catch { persistent = false; protectedRecord = true; }
    return next;
  }

  function persist() {
    const boundOwner = loadedOwner;
    if (!boundOwner || readOwner() !== boundOwner || protectedRecord || !diskReadable || !coordinatedWrite) {
      persistent = false;
      if (boundOwner) sessionByOwner.set(boundOwner, { records: presets.map(clone), baseline: lastCommitted.map(clone), protectedRecord });
      return;
    }
    try {
      const target = storage();
      writeScopedChanges(target, ownerKey(boundOwner), lastCommitted, presets);
      persistent = true;
      presets = readScopedRecords(target, ownerKey(boundOwner), normalizeRecords);
      lastCommitted = presets.map(clone);
      sessionByOwner.delete(boundOwner);
    } catch {
      persistent = false;
      sessionByOwner.set(boundOwner, { records: presets.map(clone), baseline: lastCommitted.map(clone), protectedRecord });
    }
  }

  function reload() {
    loadedOwner = null;
    ensureOwner();
    return presets.map(clone);
  }

  function prepareMutation({ id, creatureId, name, expectedPreset } = {}) {
    if (!ensureOwner()) return false;
    const active = loadedOwner;
    const wanted = cleanCreatureId(creatureId);
    const find = records => id
      ? records.find(entry => entry.id === id && (!wanted || entry.creatureId === wanted))
      : name ? records.find(entry => sameName(entry, wanted, name)) : null;
    const expected = expectedPreset === undefined ? find(presets) : expectedPreset;
    if (expectedPreset !== undefined && !sameRecord(find(presets), expected)) return false;
    if (protectedRecord) { diskReadable = false; return true; }
    try {
      const latest = readScopedRecords(storage(), ownerKey(active), normalizeRecords);
      diskReadable = true;
      if (readOwner() !== active) return false;
      const recovered = sessionByOwner.has(active) || !persistent
        ? mergeRecoveredSession(lastCommitted, presets, latest)
        : latest;
      if (!recovered) return false;
      const changed = !sameRecord(find(recovered), expected);
      if (changed) {
        if (!sessionByOwner.has(active)) presets = latest;
        return false;
      }
      presets = recovered;
      lastCommitted = latest.map(clone);
      persistent = true;
      sessionByOwner.delete(active);
      return true;
    } catch {
      diskReadable = false;
      if (sessionByOwner.has(active) || !persistent) {
        return expectedPreset === undefined || sameRecord(find(presets), expected);
      }
      persistent = false; protectedRecord = true;
      return false;
    }
  }

  function legacyCount() {
    if (!ensureOwner()) return 0;
    try {
      const target = storage();
      const claim = target.getItem(config.legacyClaimKey);
      if (claim !== null && !(claim === ensureOwner() && target.getItem(legacyImportKey(ownerKey(claim))) === null)) return 0;
      const raw = target.getItem(config.storageKey);
      return raw === null ? 0 : normalizeRecords(JSON.parse(raw)).length;
    } catch { return 0; }
  }

  async function claimLegacy(isCurrent = () => true) {
    const active = ensureOwner();
    if (!active || protectedRecord || sessionByOwner.has(active) || !isCurrent()) return false;
    const importWork = () => {
      let target, claimed = false, importWritten = false;
      try {
        if (!isCurrent() || readOwner() !== active) return false;
        target = storage();
        const claim = target.getItem(config.legacyClaimKey);
        if (claim !== null && claim !== active) return false;
        if (target.getItem(legacyImportKey(ownerKey(active))) !== null) return false;
        const raw = target.getItem(config.storageKey);
        const records = raw === null ? [] : normalizeRecords(JSON.parse(raw));
        if (!records.length) return false;
        const existing = readScopedRecords(target, ownerKey(active), normalizeRecords);
        const names = new Set(existing.map(entry => `${entry.creatureId}\u001f${entry.name.toLocaleLowerCase()}`));
        const issued = [...existing, ...records];
        const imports = records.map(entry => {
          let name = entry.name, number = 2;
          while (names.has(`${entry.creatureId}\u001f${name.toLocaleLowerCase()}`)) {
            const suffix = ` (${number++})`;
            name = entry.name.slice(0, 40 - suffix.length) + suffix;
          }
          names.add(`${entry.creatureId}\u001f${name.toLocaleLowerCase()}`);
          const id = nextUniqueId(issued, defaultId);
          issued.push({ id });
          return { ...entry, id, name };
        });
        const merged = normalizeRecords(uniqueStoredIds([...existing, ...imports]));
        if (claim === null) { target.setItem(config.legacyClaimKey, active); claimed = true; }
        if (target.getItem(config.legacyClaimKey) !== active || readOwner() !== active || !isCurrent()) throw new Error("owner-changed");
        target.setItem(legacyImportKey(ownerKey(active)), JSON.stringify(merged));
        // Once the import payload exists, do not roll back the global claim on
        // a later read error: another trainer must not claim the same legacy data.
        importWritten = true;
        presets = merged;
        lastCommitted = presets.map(clone);
        sessionByOwner.delete(active);
        persistent = true;
        return readOwner() === active;
      } catch {
        // Original legacy data is never deleted. Unlock failed imports.
        if (claimed && !importWritten && target?.getItem(config.legacyClaimKey) === active) {
          try { target.removeItem(config.legacyClaimKey); } catch {}
        }
        return false;
      }
    };
    return withOwnerImportLock(locks(), config.legacyClaimKey, () => {
      if (typeof mutationLocks !== "function") return importWork();
      return withOwnerImportLock(mutationLocks(), mutationLockKey(active), importWork);
    });
  }

  function list(creatureId) {
    ensureOwner();
    const wanted = cleanCreatureId(creatureId);
    return presets.filter(preset => !wanted || preset.creatureId === wanted).map(clone);
  }

  function upsert(creatureId, name, snapshot, expectedPreset) {
    const cleanId = cleanCreatureId(creatureId), cleanPresetName = cleanName(name);
    const normalized = normalizeMovesetSnapshot(snapshot);
    if (!cleanId || !cleanPresetName || !normalized) return null;
    if (!prepareMutation({ creatureId: cleanId, name: cleanPresetName, expectedPreset })) return null;
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
      id: nextUniqueId(presets, makeId), creatureId: cleanId, name: cleanPresetName, ...normalized,
      marker: (() => {
        const used = new Set(presets.filter(entry => entry.creatureId === cleanId).map(entry => entry.marker));
        let marker = 1; while (used.has(marker)) marker++; return marker;
      })(),
      createdAt: timestamp, updatedAt: timestamp,
    };
    presets.push(preset); persist();
    return { preset: clone(preset), created: true };
  }

  function replaceSnapshot(id, creatureId, snapshot, expectedPreset) {
    if (!prepareMutation({ id, creatureId, expectedPreset })) return { ok: false, reason: "conflict" };
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

  function remove(id, creatureId, expectedPreset) {
    if (!prepareMutation({ id, creatureId, expectedPreset })) return false;
    const cleanId = cleanCreatureId(creatureId), index = presets.findIndex(preset => preset.id === id && preset.creatureId === cleanId);
    if (index < 0) return false;
    presets.splice(index, 1); persist(); return true;
  }

  reload();
  return {
    list, reload,
    upsert: (...args) => invokeMutation(null, upsert, args),
    replaceSnapshot: (...args) => invokeMutation({ ok: false, reason: "owner-changed" }, replaceSnapshot, args),
    remove: (...args) => invokeMutation(false, remove, args),
    legacyCount, claimLegacy,
    owner: ensureOwner,
    storageKey: () => { const active = ensureOwner(); return active ? ownerKey(active) : ""; },
    isPersistent: () => { ensureOwner(); return persistent; },
  };
}
