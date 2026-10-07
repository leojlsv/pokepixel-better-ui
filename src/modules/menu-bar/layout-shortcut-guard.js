// PersistentHUD registers its window-capture listener before Better UI. Its
// listener delegates through this exposed instance method, so a scoped adapter
// can suspend only toolbar shortcuts without replacing browser event APIs.
export function createMenuLayoutShortcutGuard({ win, getRoot }) {
  let owner = null, original = null, wrapper = null, descriptor = null;
  function cleanup() {
    if (owner?.handleShortcut === wrapper) {
      if (descriptor) Object.defineProperty(owner,"handleShortcut",descriptor);
      else delete owner.handleShortcut;
    }
    owner = original = wrapper = descriptor = null;
  }
  function sync() {
    const root = getRoot(), next = win?.PokeIdle?.PersistentHud?._toolbar;
    if (!root?.isConnected || root.hidden || typeof next?.handleShortcut !== "function") { cleanup(); return; }
    if (owner === next && owner.handleShortcut === wrapper) return;
    cleanup();
    owner = next;
    descriptor = Object.getOwnPropertyDescriptor(owner,"handleShortcut");
    original = owner.handleShortcut;
    const invoke = original, capturedOwner = owner;
    const adapter = function(...args) {
      const current = getRoot();
      if (owner === capturedOwner && owner.handleShortcut === adapter && current?.isConnected && !current.hidden) return;
      return invoke.apply(this,args);
    };
    wrapper = adapter;
    try { owner.handleShortcut = wrapper; } catch { cleanup(); }
  }
  return { sync, cleanup };
}
