import { defaultLayout, validateLayout } from "./layout-model.js";

const PREFIX = "ppbui:menu-layout:v1:";
const LEGACY_POSITION_KEY = "ppbui:menu-bar-position:v1";
const LEGACY_CLAIM_KEY = "ppbui:menu-layout-meta:v1:legacy-position-owner";
const RECORD_VERSION = 1;
const MAX_RECORD_BYTES = 65536;
const MAX_OWNER_LENGTH = 256;

const ownerId = value => {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value !== "string") return "";
  const clean = value.trim();
  return clean && clean.length <= MAX_OWNER_LENGTH ? clean : "";
};
const keyFor = owner => `${PREFIX}${encodeURIComponent(owner)}`;
const clone = layout => ({ ...layout, bar:[...layout.bar], groups:Object.fromEntries(Object.entries(layout.groups).map(([key, list]) => [key, [...list]])), position:layout.position ? { ...layout.position } : null });
const tokenForSession = revision => `session:${revision}`;
const finiteCoordinate = value => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
};

export function createMenuLayoutStorage({ storage = () => globalThis.localStorage, events = globalThis.window } = {}) {
  const session = new Map();
  const subscribers = new Set();
  let listenerAttached = false;

  const notify = detail => { for (const fn of subscribers) fn(detail); };
  const target = () => storage();

  function readPersistent(owner, { migrate = true } = {}) {
    let store;
    try { store = target(); }
    catch { return { available:false }; }
    if (!store || typeof store.getItem !== "function" || typeof store.setItem !== "function") return { available:false };
    const key = keyFor(owner);
    let raw;
    try { raw = store.getItem(key); }
    catch { return { available:false }; }
    if (raw === null && migrate) {
      const migrated = migrateLegacyPosition(store, owner, key);
      if (migrated) return migrated;
    }
    if (raw === null) return { available:true, key, raw:null, record:null };
    if (raw.length > MAX_RECORD_BYTES) return { available:true, key, raw, issue:"oversize-record", layout:defaultLayout() };
    let record;
    try { record = JSON.parse(raw); }
    catch { return { available:true, key, raw, issue:"corrupt", layout:defaultLayout() }; }
    if (!record || typeof record !== "object" || Array.isArray(record)) return { available:true, key, raw, issue:"corrupt", layout:defaultLayout() };
    if (record.version !== RECORD_VERSION) return { available:true, key, raw, issue:Number(record.version) > RECORD_VERSION ? "future-version" : "unsupported-version", layout:defaultLayout() };
    const checked = validateLayout(record.layout);
    if (!checked.ok) return { available:true, key, raw, issue:`invalid-layout:${checked.error}`, layout:defaultLayout() };
    const revision = Number(record.revision);
    if (!Number.isSafeInteger(revision) || revision < 1) return { available:true, key, raw, issue:"corrupt", layout:defaultLayout() };
    return { available:true, key, raw, record, revision, layout:checked.layout };
  }

  function migrateLegacyPosition(store, owner, key) {
    let claim, legacy;
    try { claim = store.getItem(LEGACY_CLAIM_KEY); legacy = store.getItem(LEGACY_POSITION_KEY); }
    catch { return null; }
    if (claim !== null || legacy === null) return null;
    let parsed;
    try { parsed = JSON.parse(legacy); } catch { return null; }
    const left = finiteCoordinate(parsed?.left), top = finiteCoordinate(parsed?.top);
    if (left === null || top === null) return null;
    try {
      store.setItem(LEGACY_CLAIM_KEY, owner);
      if (store.getItem(LEGACY_CLAIM_KEY) !== owner) return null;
      const layout = defaultLayout();
      layout.position = { left, top };
      const record = { version:RECORD_VERSION, revision:1, layout };
      const raw = JSON.stringify(record);
      store.setItem(key, raw);
      return { available:true, key, raw, record, revision:1, layout };
    } catch {
      try { if (store.getItem(LEGACY_CLAIM_KEY) === owner) store.removeItem?.(LEGACY_CLAIM_KEY); } catch {}
      return { available:false };
    }
  }

  function read(ownerValue) {
    const owner = ownerId(ownerValue);
    if (!owner) return { owner:"", layout:defaultLayout(), token:null, persistent:false, issue:"anonymous" };
    const persistent = readPersistent(owner);
    if (!persistent.available) {
      const fallback = session.get(owner);
      return { owner, layout:clone(fallback?.layout || defaultLayout()), token:fallback ? tokenForSession(fallback.revision) : null, persistent:false, issue:"storage-unavailable" };
    }
    const fallback = session.get(owner);
    if (fallback) {
      if (fallback.baseToken === undefined && persistent.issue) return { owner, layout:clone(persistent.layout), token:persistent.raw, persistent:true, issue:persistent.issue };
      if (fallback.baseToken === undefined) fallback.baseToken = persistent.raw;
      if (fallback.baseToken === persistent.raw) return { owner, layout:clone(fallback.layout), token:tokenForSession(fallback.revision), persistent:false, issue:"session-only" };
      session.delete(owner);
    }
    if (persistent.issue) return { owner, layout:clone(persistent.layout), token:persistent.raw, persistent:true, issue:persistent.issue };
    if (persistent.raw !== null) return { owner, layout:clone(persistent.layout), token:persistent.raw, persistent:true, issue:null };
    return { owner, layout:defaultLayout(), token:null, persistent:true, issue:null };
  }

  function write(ownerValue, layout, { expectedToken, overwrite = false } = {}) {
    const owner = ownerId(ownerValue);
    if (!owner) return { ok:false, layout:defaultLayout(), token:null, persistent:false, error:"anonymous" };
    const checked = validateLayout(layout);
    if (!checked.ok) return { ok:false, layout:defaultLayout(), token:null, persistent:false, error:checked.error };
    const current = read(owner);
    if (current.issue && ![null, "session-only", "storage-unavailable"].includes(current.issue) && !overwrite) {
      return { ok:false, layout:current.layout, token:current.token, persistent:current.persistent, error:"protected-record" };
    }
    if (!overwrite && expectedToken === undefined) {
      return { ok:false, layout:current.layout, token:current.token, persistent:current.persistent, error:"expected-token-required" };
    }
    if (!overwrite && expectedToken !== undefined && expectedToken !== current.token) {
      return { ok:false, layout:current.layout, token:current.token, persistent:current.persistent, error:"conflict" };
    }

    const persistent = readPersistent(owner, { migrate:false });
    if (persistent.available) {
      const acceptedSessionBase = session.get(owner)?.baseToken === persistent.raw;
      if (persistent.issue && !overwrite && !acceptedSessionBase) return { ok:false, layout:current.layout, token:persistent.raw, persistent:true, error:"protected-record" };
      if (!overwrite && current.persistent && persistent.raw !== current.token) return { ok:false, layout:persistent.layout || defaultLayout(), token:persistent.raw, persistent:true, error:"conflict" };
      const revision = persistent.revision ? persistent.revision + 1 : 1;
      const record = { version:RECORD_VERSION, revision, layout:checked.layout };
      const raw = JSON.stringify(record);
      try {
        const destination = target(), latest = destination.getItem(keyFor(owner));
        // This closes observed interleavings; localStorage still has no atomic CAS.
        if (!overwrite && latest !== persistent.raw) return { ok:false, layout:current.layout, token:latest, persistent:true, error:"conflict" };
        destination.setItem(keyFor(owner), raw);
        session.delete(owner);
        return { ok:true, layout:clone(checked.layout), token:raw, persistent:true, error:null };
      } catch {}
    }

    const prior = session.get(owner);
    const revision = (prior?.revision || 0) + 1;
    session.set(owner, { revision, layout:clone(checked.layout), baseToken:persistent.available ? persistent.raw : prior?.baseToken });
    return { ok:true, layout:clone(checked.layout), token:tokenForSession(revision), persistent:false, error:"storage-unavailable" };
  }

  function savePosition(ownerValue, position, options = {}) {
    const current = read(ownerValue);
    if (!current.owner) return { ok:false, layout:current.layout, token:current.token, persistent:false, error:"anonymous" };
    if (current.issue && ![null, "session-only", "storage-unavailable"].includes(current.issue)) {
      return { ok:false, layout:current.layout, token:current.token, persistent:current.persistent, error:"protected-record" };
    }
    const next = clone(current.layout);
    if (position === null) next.position = null;
    else {
      const left = finiteCoordinate(position?.left), top = finiteCoordinate(position?.top);
      if (left === null || top === null) return { ok:false, layout:current.layout, token:current.token, persistent:current.persistent, error:"invalid-position" };
      next.position = { left, top };
    }
    const samePosition = current.layout.position === null ? next.position === null
      : next.position !== null && current.layout.position.left === next.position.left && current.layout.position.top === next.position.top;
    if (samePosition) {
      return {
        ok:true, layout:clone(current.layout), token:current.token, persistent:current.persistent,
        error:current.issue === "storage-unavailable" || current.issue === "session-only" ? "storage-unavailable" : null,
      };
    }
    return write(current.owner, next, { expectedToken:options.expectedToken === undefined ? current.token : options.expectedToken, overwrite:false });
  }

  const onStorage = event => {
    const key = event?.key;
    if (key === null) return notify({ owner:null, key:null, external:true });
    if (key === LEGACY_CLAIM_KEY) return;
    if (typeof key !== "string" || !key.startsWith(PREFIX)) return;
    const encoded = key.slice(PREFIX.length);
    let owner = encoded;
    try { owner = decodeURIComponent(encoded); } catch {}
    notify({ owner, key, external:true });
  };
  const connect = () => {
    if (listenerAttached || typeof events?.addEventListener !== "function") return;
    events.addEventListener("storage", onStorage);
    listenerAttached = true;
  };
  const disconnect = () => {
    if (!listenerAttached) return;
    events?.removeEventListener?.("storage", onStorage);
    listenerAttached = false;
  };
  connect();

  return {
    read, write, savePosition,
    subscribe(fn) {
      if (typeof fn !== "function") return () => {};
      connect();
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    dispose() { disconnect(); subscribers.clear(); },
  };
}
