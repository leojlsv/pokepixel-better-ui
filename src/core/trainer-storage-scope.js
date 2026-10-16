import { readMenuLayoutOwner } from "../modules/menu-bar/layout-owner.js";

// An Auth summary and WorldPresence disagreement means the trainer is still
// rehydrating, not permission to reuse a previous trainer's local data.
export const currentStorageOwner = (win = globalThis.window) => readMenuLayoutOwner(win).owner;

export function normalizeStorageOwner(value) {
  const owner = typeof value === "number" && Number.isFinite(value) ? String(value)
    : typeof value === "string" ? value.trim() : "";
  return owner && owner.length <= 160 ? owner : "";
}

export const trainerStorageKey = (prefix, owner) => prefix + encodeURIComponent(owner);

const entryPrefix = ownerKey => `${ownerKey}:entry:`;
const orderKey = ownerKey => `${ownerKey}:order`;
export const legacyImportKey = ownerKey => `${ownerKey}:import`;
const scopedEntryKey = (ownerKey, id) => entryPrefix(ownerKey) + encodeURIComponent(id);

const storageKeys = target => {
  if (typeof target?.key === "function" && Number.isSafeInteger(target.length)) {
    return Array.from({ length: target.length }, (_, index) => target.key(index)).filter(Boolean);
  }
  // A few isolated test adapters expose their backing Map rather than key().
  return target?.values instanceof Map ? [...target.values.keys()] : [];
};

export function readScopedRecords(target, ownerKey, normalizeRecords) {
  const raw = target.getItem(legacyImportKey(ownerKey)) ?? target.getItem(ownerKey);
  const parsed = raw === null ? [] : JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Invalid owner-scoped record");
  const base = normalizeRecords(parsed);
  const byId = new Map(base.map(record => [record.id, record]));
  const encountered = [...byId.keys()];
  for (const key of storageKeys(target)) {
    if (!key.startsWith(entryPrefix(ownerKey))) continue;
    const encodedId = key.slice(entryPrefix(ownerKey).length);
    let id;
    try { id = decodeURIComponent(encodedId); } catch { throw new Error("Invalid entry id"); }
    if (!id) throw new Error("Invalid entry id");
    const payload = JSON.parse(target.getItem(key));
    if (payload?.version !== 1) throw new Error("Unsupported entry version");
    if (payload.deleted === true) byId.delete(id);
    else {
      const record = normalizeRecords([payload.record])[0];
      if (!record || record.id !== id) throw new Error("Invalid entry payload");
      byId.set(id, record);
      if (!encountered.includes(id)) encountered.push(id);
    }
  }
  let order = encountered;
  const savedOrder = target.getItem(orderKey(ownerKey));
  if (savedOrder !== null) {
    const requested = JSON.parse(savedOrder);
    if (!Array.isArray(requested) || requested.some(id => typeof id !== "string")) throw new Error("Invalid order record");
    order = [...new Set([...requested, ...encountered])];
  }
  // Repair cross-tab marker/ID collisions using the complete visible set,
  // rather than normalizing each stored entry in isolation.
  return normalizeRecords(order.filter(id => byId.has(id)).map(id => byId.get(id)));
}

export function writeScopedChanges(target, ownerKey, before, after) {
  const oldRecords = new Map(before.map(entry => [entry.id, entry]));
  const nextRecords = new Map(after.map(entry => [entry.id, entry]));
  for (const [id, oldValue] of oldRecords) {
    if (!nextRecords.has(id)) target.setItem(scopedEntryKey(ownerKey, id), JSON.stringify({ version: 1, deleted: true }));
    else if (JSON.stringify(oldValue) !== JSON.stringify(nextRecords.get(id))) {
      target.setItem(scopedEntryKey(ownerKey, id), JSON.stringify({ version: 1, record: nextRecords.get(id) }));
    }
  }
  for (const [id, value] of nextRecords) {
    if (!oldRecords.has(id)) target.setItem(scopedEntryKey(ownerKey, id), JSON.stringify({ version: 1, record: value }));
  }
  const beforeOrder = before.map(entry => entry.id), afterOrder = after.map(entry => entry.id);
  if (JSON.stringify(beforeOrder) !== JSON.stringify(afterOrder)) target.setItem(orderKey(ownerKey), JSON.stringify(afterOrder));
}

// Web Locks serialize legacy adoption across tabs. Without origin-wide locking
// a localStorage check-then-set can grant the same ownerless data to A and B.
export async function withOwnerImportLock(locks, lockName, work) {
  if (typeof locks?.request !== "function") return false;
  try { return await locks.request(lockName, { mode: "exclusive" }, work); }
  catch { return false; }
}

// Native Web Locks serialize every same-trainer read-check-write transaction
// across tabs, not only the explicit legacy import. The storage mutation itself
// is synchronous within the lock callback; an identity transition while queued
// is rejected by the caller's captured-owner check.
export function withOwnerMutationLock(locks, lockName, work, failed) {
  try {
    return Promise.resolve(locks.request(lockName, { mode: "exclusive" }, work)).catch(() => failed);
  } catch {
    return Promise.resolve(failed);
  }
}

// Reconcile session-only edits when browser storage recovers. A local pending
// change must not overwrite an intervening write made in another tab.
export function mergeRecoveredSession(base, local, remote) {
  const asMap = records => new Map(records.map(record => [record.id, record]));
  const baseline = asMap(base), drafted = asMap(local), latest = asMap(remote);
  const originalOrder = base.map(record => record.id);
  const localOrder = local.map(record => record.id);
  const remoteOrder = remote.map(record => record.id);
  const differs = (left, right) => JSON.stringify(left ?? null) !== JSON.stringify(right ?? null);
  // Membership additions/deletions are not a reorder. Compare only IDs that
  // survive in both local and remote views of the original baseline.
  const sharedIds = new Set(originalOrder.filter(id => drafted.has(id) && latest.has(id)));
  const sharedOrder = values => values.filter(id => sharedIds.has(id));
  const originalShared = sharedOrder(originalOrder);
  const localReordered = differs(originalShared, sharedOrder(localOrder));
  const remoteReordered = differs(originalShared, sharedOrder(remoteOrder));
  if (localReordered && remoteReordered && differs(sharedOrder(localOrder), sharedOrder(remoteOrder))) return null;
  for (const id of new Set([...baseline.keys(), ...drafted.keys(), ...latest.keys()])) {
    const original = baseline.get(id), pending = drafted.get(id), changed = latest.get(id);
    if (differs(pending, original) && differs(changed, original) && differs(pending, changed)) return null;
  }
  const merged = new Map(latest);
  for (const id of new Set([...baseline.keys(), ...drafted.keys()])) {
    if (!differs(drafted.get(id), baseline.get(id))) continue;
    if (drafted.has(id)) merged.set(id, drafted.get(id));
    else merged.delete(id);
  }
  const preferred = localReordered ? localOrder : remoteOrder;
  const order = [...new Set([...preferred, ...remoteOrder, ...localOrder])];
  return order.filter(id => merged.has(id)).map(id => merged.get(id));
}

// Keep every usable legacy record while making deletions and updates target
// exactly one record, even when a stored id is blank or duplicated.
export function uniqueStoredIds(records, { maxLength = 160 } = {}) {
  const reserved = new Set(records.map(record => String(record.id || "").trim().slice(0, maxLength)).filter(Boolean));
  const used = new Set();
  return records.map((record, index) => {
    let id = String(record.id || "").trim().slice(0, maxLength);
    if (!id || used.has(id)) {
      const base = `recovered-${index + 1}`;
      id = base;
      for (let suffix = 1; reserved.has(id) || used.has(id); suffix++) id = `${base}-${suffix}`;
    }
    used.add(id);
    return { ...record, id };
  });
}

export function nextUniqueId(existing, makeId) {
  const used = new Set(existing.map(record => record.id));
  for (let attempt = 0; attempt < 3; attempt++) {
    const candidate = String(makeId() || "").trim().slice(0, 160);
    if (candidate && !used.has(candidate)) return candidate;
  }
  const base = `preset-${Date.now().toString(36)}`;
  let candidate = base;
  for (let suffix = 1; used.has(candidate); suffix++) candidate = `${base}-${suffix}`;
  return candidate;
}
