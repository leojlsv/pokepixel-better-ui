export function createModulePreferences({ defaults, storage = () => window.localStorage, events = globalThis.window } = {}) {
  const key = "ppbui:modules:v1";
  const retiredKeys = ["ppbui:appearance:v1"];
  const listeners = new Set();
  let values = { ...defaults };
  let persistent = true;
  const read = () => {
    let store;
    try {
      store = storage();
    } catch {
      persistent = false;
      return;
    }
    for (const retiredKey of retiredKeys) {
      try { store.removeItem(retiredKey); } catch { /* Legacy cleanup is best-effort. */ }
    }
    try {
      const parsed = JSON.parse(store.getItem(key) || "{}");
      values = { ...defaults };
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const id of Object.keys(defaults)) if (typeof parsed[id] === "boolean") values[id] = parsed[id];
      }
      persistent = true;
    } catch {
      persistent = false;
    }
  };
  const notify = () => { for (const listener of listeners) listener(); };
  const onStorage = event => {
    if (event.key !== key && event.key !== null) return;
    read();
    notify();
  };
  read();
  return {
    isEnabled: id => values[id] ?? true,
    isPersistent: () => persistent,
    setEnabled(id, enabled) {
      if (!Object.hasOwn(defaults, id) || typeof enabled !== "boolean") return;
      values[id] = enabled;
      try {
        storage().setItem(key, JSON.stringify(values));
        persistent = true;
      } catch {
        persistent = false;
      }
      notify();
    },
    subscribe(listener) {
      if (!listeners.size) events?.addEventListener("storage", onStorage);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (!listeners.size) events?.removeEventListener("storage", onStorage);
      };
    },
  };
}
