export function createLifecycle() {
  const cleanups = new Map();

  return {
    isMounted(id) {
      return cleanups.has(id);
    },

    mount(id, cleanup) {
      cleanups.set(id, typeof cleanup === "function" ? cleanup : () => {});
    },

    unmount(id) {
      const cleanup = cleanups.get(id);
      if (!cleanup) return;

      cleanups.delete(id);
      cleanup();
    },

    destroy() {
      for (const id of [...cleanups.keys()]) {
        this.unmount(id);
      }
    },
  };
}
