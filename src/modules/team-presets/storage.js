import { teamPresetsConfig as config } from "./config.js";
import {
  currentStorageOwner, legacyImportKey, mergeRecoveredSession, nextUniqueId, normalizeStorageOwner,
  readScopedRecords, trainerStorageKey, uniqueStoredIds, withOwnerImportLock,
  withOwnerMutationLock, writeScopedChanges,
} from "../../core/trainer-storage-scope.js";

const normalizeName = value => String(value || "").trim().slice(0, 40);
const cloneMember = member => ({ ...member });
const clone = preset => ({ ...preset, members: preset.members.map(cloneMember) });

function normalizeMember(entry) {
  const id = String(entry?.id ?? "").trim();
  if (!id) return null;
  const member = { id, name: String(entry?.name || id).trim().slice(0, 80) };
  const sprite = String(entry?.sprite || "").trim();
  if (sprite) member.sprite = sprite;
  const elementColor = String(entry?.elementColor || "").trim();
  if (/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(elementColor)) member.elementColor = elementColor;
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
    // Missing legacy timestamps must be stable across reads or optimistic
    // per-record conflict checks would reject an unchanged record.
    createdAt: Number(value?.createdAt) || 1,
    updatedAt: Number(value?.updatedAt) || Number(value?.createdAt) || 1,
  };
}

const defaultId = () => globalThis.crypto?.randomUUID?.() || `team-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function createTeamPresetStorage({
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
  const normalizeRecords = (raw, legacy = false) => uniqueStoredIds(
    (Array.isArray(raw) ? raw : []).map(value => normalizePreset(value, legacy)).filter(Boolean),
  );
  const sameRecord = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
  const sameName = (entry, name) => entry.name.toLocaleLowerCase() === name.toLocaleLowerCase();
  const mutationLockKey = active => `ppbui:team-presets:owner:${encodeURIComponent(active)}`;
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
      // A browser without Web Locks must not risk corrupting a second tab's
      // record. Keep edits usable as an explicitly session-only overlay.
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
      // A concurrent tab may have written another entry during our own
      // synchronous setItem sequence. Reconcile the final complete collection.
      presets = readScopedRecords(target, ownerKey(boundOwner), normalizeRecords);
      lastCommitted = presets.map(clone);
      sessionByOwner.delete(boundOwner);
    } catch {
      persistent = false;
      sessionByOwner.set(boundOwner, { records: presets.map(clone), baseline: lastCommitted.map(clone), protectedRecord });
    }
  }

  function prepareMutation({ id, name, expectedPreset, checkOrder = false } = {}) {
    if (!ensureOwner()) return false;
    const active = loadedOwner;
    const cached = id ? presets.find(entry => entry.id === id) : name ? presets.find(entry => sameName(entry, name)) : null;
    const expected = expectedPreset === undefined ? cached : expectedPreset;
    if (expectedPreset !== undefined && !sameRecord(cached, expected)) return false;
    if (protectedRecord) { diskReadable = false; return true; }
    try {
      const latest = readScopedRecords(storage(), ownerKey(active), normalizeRecords);
      diskReadable = true;
      if (readOwner() !== active) return false;
      const recovered = sessionByOwner.has(active) || !persistent
        ? mergeRecoveredSession(lastCommitted, presets, latest)
        : latest;
      if (!recovered) return false;
      const candidate = id ? recovered.find(entry => entry.id === id) : name ? recovered.find(entry => sameName(entry, name)) : null;
      const changed = !sameRecord(candidate, expected)
        || (checkOrder && !sameRecord(recovered.map(entry => entry.id), presets.map(entry => entry.id)));
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
        // Storage still denied: continue modifying the protected local draft,
        // but never attempt a disk write until the authoritative read recovers.
        return expectedPreset === undefined || sameRecord(cached, expected);
      }
      persistent = false; protectedRecord = true;
      return false;
    }
  }

  // The previous v1/v2 keys had no trainer identity. Never expose them
  // automatically: the user must explicitly claim data saved in this browser.
  function readLegacy(target) {
    const current = target.getItem(config.storageKey);
    if (current !== null) {
      try {
        const parsed = JSON.parse(current);
        if (Array.isArray(parsed)) {
          const records = normalizeRecords(parsed);
          if (records.length) return records;
        }
      } catch {
        // Preserve the corrupt v2 bytes; an older valid v1 backup can still
        // be explicitly recovered by its authenticated owner.
      }
    }
    const older = target.getItem(config.legacyStorageKey);
    return older === null ? [] : normalizeRecords(JSON.parse(older), true);
  }

  function legacyCount() {
    const active = ensureOwner();
    if (!active) return 0;
    try {
      const target = storage();
      const claim = target.getItem(config.legacyClaimKey);
      if (claim !== null && !(claim === active && target.getItem(legacyImportKey(ownerKey(active))) === null)) return 0;
      return readLegacy(target).length;
    } catch { return 0; }
  }

  async function claimLegacy(isCurrent = () => true) {
    const active = ensureOwner();
    if (!active || protectedRecord || sessionByOwner.has(active) || !isCurrent()) return false;
    // The lock is origin-wide and prevents the same ownerless collection
    // being assigned to different authenticated trainers in separate tabs.
    const importWork = () => {
      let target, claimed = false, importWritten = false;
      try {
        if (!isCurrent() || readOwner() !== active) return false;
        target = storage();
        const claim = target.getItem(config.legacyClaimKey);
        if (claim !== null && claim !== active) return false;
        if (target.getItem(legacyImportKey(ownerKey(active))) !== null) return false;
        const records = readLegacy(target);
        if (!records.length) return false;
        const existing = readScopedRecords(target, ownerKey(active), normalizeRecords);
        const names = new Set(existing.map(entry => entry.name.toLocaleLowerCase()));
        const issued = [...existing, ...records];
        const imports = records.map(entry => {
          let name = entry.name, number = 2;
          while (names.has(name.toLocaleLowerCase())) {
            const suffix = ` (${number++})`;
            name = entry.name.slice(0, 40 - suffix.length) + suffix;
          }
          names.add(name.toLocaleLowerCase());
          const id = nextUniqueId(issued, defaultId);
          issued.push({ id });
          return { ...entry, id, name };
        });
        const merged = uniqueStoredIds([...existing, ...imports]);
        if (claim === null) { target.setItem(config.legacyClaimKey, active); claimed = true; }
        if (target.getItem(config.legacyClaimKey) !== active || readOwner() !== active || !isCurrent()) throw new Error("owner-changed");
        target.setItem(legacyImportKey(ownerKey(active)), JSON.stringify(merged));
        // The import write is the commit point. Do not perform another fallible
        // storage read before returning: a post-write failure must never release
        // the global claim while the imported payload still exists.
        importWritten = true;
        presets = merged;
        lastCommitted = presets.map(clone);
        sessionByOwner.delete(active);
        persistent = true;
        return readOwner() === active;
      } catch {
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

  function reload() { loadedOwner = null; ensureOwner(); return presets.map(clone); }

  function list() { ensureOwner(); return presets.map(clone); }

  function upsert(name, snapshot, expectedPreset) {
    const cleanName = normalizeName(name), cleanSnapshot = normalizeSnapshot(snapshot);
    if (!cleanName || !cleanSnapshot) return null;
    if (!prepareMutation({ name: cleanName, expectedPreset })) return null;
    const index = presets.findIndex(preset => preset.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase()), timestamp = now();
    if (index >= 0) {
      presets[index] = { ...presets[index], name: cleanName, ...cleanSnapshot, updatedAt: timestamp };
      persist(); return { preset: clone(presets[index]), created: false };
    }
    const preset = { id: nextUniqueId(presets, makeId), name: cleanName, ...cleanSnapshot, createdAt: timestamp, updatedAt: timestamp };
    presets.push(preset); persist(); return { preset: clone(preset), created: true };
  }

  function replaceSnapshot(id, snapshot, expectedPreset) {
    if (!prepareMutation({ id, expectedPreset })) return false;
    const preset = presets.find(entry => entry.id === id), cleanSnapshot = normalizeSnapshot(snapshot);
    if (!preset || !cleanSnapshot) return false;
    Object.assign(preset, cleanSnapshot, { updatedAt: now() }); persist(); return true;
  }

  function updatePreset(id, name, snapshot, expectedPreset) {
    if (!prepareMutation({ id, expectedPreset })) return null;
    const cleanName = normalizeName(name), cleanSnapshot = normalizeSnapshot(snapshot), index = presets.findIndex(entry => entry.id === id);
    if (index < 0 || !cleanName || !cleanSnapshot) return null;
    if (presets.some((entry, entryIndex) => entryIndex !== index && entry.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase())) return null;
    presets[index] = { ...presets[index], name: cleanName, ...cleanSnapshot, updatedAt: now() };
    persist(); return clone(presets[index]);
  }

  function rename(id, name, expectedPreset) {
    if (!prepareMutation({ id, expectedPreset })) return false;
    const cleanName = normalizeName(name), preset = presets.find(entry => entry.id === id);
    if (!preset || !cleanName) return false;
    if (presets.some(entry => entry.id !== id && entry.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase())) return false;
    preset.name = cleanName; preset.updatedAt = now(); persist(); return true;
  }

  function remove(id, expectedPreset) {
    if (!prepareMutation({ id, expectedPreset })) return false;
    const index = presets.findIndex(preset => preset.id === id);
    if (index < 0) return false;
    presets.splice(index, 1); persist(); return true;
  }

  function movePreset(id, delta, expectedPreset) {
    if (!prepareMutation({ id, expectedPreset, checkOrder: true })) return false;
    const index = presets.findIndex(preset => preset.id === id), target = index + Math.sign(Number(delta) || 0);
    if (index < 0 || target < 0 || target >= presets.length) return false;
    [presets[index], presets[target]] = [presets[target], presets[index]];
    presets[target].updatedAt = now(); persist(); return true;
  }

  function moveMember(id, memberId, delta, expectedPreset) {
    if (!prepareMutation({ id, expectedPreset })) return false;
    const preset = presets.find(entry => entry.id === id);
    if (!preset) return false;
    const index = preset.members.findIndex(member => member.id === memberId), target = index + Math.sign(Number(delta) || 0);
    if (index < 0 || target < 0 || target >= preset.members.length) return false;
    [preset.members[index], preset.members[target]] = [preset.members[target], preset.members[index]];
    preset.updatedAt = now(); persist(); return true;
  }

  function setActive(id, memberId, expectedPreset) {
    if (!prepareMutation({ id, expectedPreset })) return false;
    const preset = presets.find(entry => entry.id === id);
    if (!preset || !preset.members.some(member => member.id === memberId)) return false;
    preset.activeId = memberId; preset.updatedAt = now(); persist(); return true;
  }

  function confirmOrder(id, expectedPreset) {
    if (!prepareMutation({ id, expectedPreset })) return false;
    const preset = presets.find(entry => entry.id === id);
    if (!preset) return false;
    preset.orderVerified = true; preset.updatedAt = now(); persist(); return true;
  }

  reload();
  return {
    list, reload,
    upsert: (...args) => invokeMutation(null, upsert, args),
    replaceSnapshot: (...args) => invokeMutation(false, replaceSnapshot, args),
    updatePreset: (...args) => invokeMutation(null, updatePreset, args),
    rename: (...args) => invokeMutation(false, rename, args),
    remove: (...args) => invokeMutation(false, remove, args),
    movePreset: (...args) => invokeMutation(false, movePreset, args),
    moveMember: (...args) => invokeMutation(false, moveMember, args),
    setActive: (...args) => invokeMutation(false, setActive, args),
    confirmOrder: (...args) => invokeMutation(false, confirmOrder, args),
    legacyCount, claimLegacy,
    owner: ensureOwner,
    storageKey: () => { const active = ensureOwner(); return active ? ownerKey(active) : ""; },
    isPersistent: () => { ensureOwner(); return persistent; },
  };
}
