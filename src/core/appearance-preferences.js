const STORAGE_KEY = "ppbui:appearance:v1";
const CORNER_MODES = new Set(["square", "rounded"]);

export function createAppearancePreferences({
  storage = () => window.localStorage,
  events = globalThis.window,
  document: targetDocument,
  defaultCornerMode = "square",
} = {}) {
  const listeners = new Set();
  const fallback = CORNER_MODES.has(defaultCornerMode) ? defaultCornerMode : "square";
  let cornerMode = fallback;
  let persistent = true;
  let mounted = false;
  let previousCorners = null;

  const doc = () => targetDocument || globalThis.document;
  const apply = () => {
    const root = doc()?.documentElement;
    if (root) root.dataset.ppbuiCorners = cornerMode;
  };
  const read = () => {
    try {
      const parsed = JSON.parse(storage().getItem(STORAGE_KEY) || "{}");
      cornerMode = CORNER_MODES.has(parsed?.corners) ? parsed.corners : fallback;
      persistent = true;
    } catch {
      cornerMode = fallback;
      persistent = false;
    }
    if (mounted) apply();
  };
  const notify = () => { for (const listener of listeners) listener(); };
  const onStorage = event => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    read();
    notify();
  };

  read();
  return {
    mount() {
      if (mounted) return;
      const root = doc()?.documentElement;
      previousCorners = root?.getAttribute("data-ppbui-corners") ?? null;
      mounted = true;
      apply();
    },
    unmount() {
      if (!mounted) return;
      const root = doc()?.documentElement;
      if (root) {
        if (previousCorners === null) root.removeAttribute("data-ppbui-corners");
        else root.setAttribute("data-ppbui-corners", previousCorners);
      }
      mounted = false;
      previousCorners = null;
    },
    getCornerMode: () => cornerMode,
    isPersistent: () => persistent,
    setCornerMode(value) {
      if (!CORNER_MODES.has(value) || value === cornerMode) return;
      cornerMode = value;
      apply();
      try {
        storage().setItem(STORAGE_KEY, JSON.stringify({ corners: cornerMode }));
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
