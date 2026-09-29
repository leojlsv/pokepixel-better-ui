import { customPokeballConfig as config } from "./config.js";

const HEX = /^#[0-9a-f]{6}$/i;
const color = (value, fallback) => typeof value === "string" && HEX.test(value) ? value.toLowerCase() : fallback;

export function defaultCustomPokeballSettings() {
  return Object.fromEntries(config.balls.map(ball => [ball.id, { ...ball.defaults }]));
}

export function normalizeCustomPokeballSettings(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const balls = source.balls && typeof source.balls === "object" && !Array.isArray(source.balls) ? source.balls : source;
  return Object.fromEntries(config.balls.map(ball => {
    const candidate = balls[ball.id] && typeof balls[ball.id] === "object" && !Array.isArray(balls[ball.id]) ? balls[ball.id] : {};
    return [ball.id, {
      enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : ball.defaults.enabled,
      primary: color(candidate.primary, ball.defaults.primary),
      secondary: color(candidate.secondary, ball.defaults.secondary),
      center: color(candidate.center, ball.defaults.center),
    }];
  }));
}

function migrateLegacy(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
  if (!source || (!Object.hasOwn(source, "primary") && !Object.hasOwn(source, "secondary") && !Object.hasOwn(source, "center"))) return null;
  const next = defaultCustomPokeballSettings();
  next.basic = {
    enabled: typeof source.enabled === "boolean" ? source.enabled : false,
    primary: color(source.primary, next.basic.primary),
    secondary: color(source.secondary, next.basic.secondary),
    center: color(source.center, next.basic.center),
  };
  return next;
}

export function createCustomPokeballStore({ win = globalThis.window, storage = () => win.localStorage } = {}) {
  const listeners = new Set();
  let state = defaultCustomPokeballSettings();
  let persistent = true;

  const parse = raw => {
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  };
  const read = () => {
    try {
      const current = parse(storage().getItem(config.storageKey));
      if (current) state = normalizeCustomPokeballSettings(current);
      else {
        const legacy = migrateLegacy(parse(storage().getItem(config.legacyStorageKey)));
        state = legacy || defaultCustomPokeballSettings();
      }
      persistent = true;
    } catch {
      state = normalizeCustomPokeballSettings(state);
      persistent = false;
    }
  };
  const notify = () => { for (const listener of listeners) listener(structuredClone(state)); };
  const persist = () => {
    try {
      storage().setItem(config.storageKey, JSON.stringify({ balls: state }));
      persistent = true;
    } catch {
      persistent = false;
    }
  };
  const onStorage = event => {
    if (![config.storageKey, config.legacyStorageKey, null].includes(event.key)) return;
    read();
    notify();
  };

  read();
  return {
    get: () => structuredClone(state),
    isPersistent: () => persistent,
    setBall(id, patch) {
      const ball = config.balls.find(entry => entry.id === id);
      if (!ball) return structuredClone(state);
      state = normalizeCustomPokeballSettings({ balls: { ...state, [id]: { ...state[id], ...(patch || {}) } } });
      persist();
      notify();
      return structuredClone(state);
    },
    resetBall(id) {
      const ball = config.balls.find(entry => entry.id === id);
      if (!ball) return structuredClone(state);
      state = normalizeCustomPokeballSettings({ balls: { ...state, [id]: { ...ball.defaults } } });
      persist();
      notify();
      return structuredClone(state);
    },
    resetAll() {
      state = defaultCustomPokeballSettings();
      persist();
      notify();
      return structuredClone(state);
    },
    subscribe(listener) {
      if (!listeners.size) win?.addEventListener?.("storage", onStorage);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (!listeners.size) win?.removeEventListener?.("storage", onStorage);
      };
    },
  };
}
