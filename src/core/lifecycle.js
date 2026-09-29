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

      cleanup();
      cleanups.delete(id);
    },

    destroy() {
      const errors = [];
      for (const id of [...cleanups.keys()]) {
        try {
          this.unmount(id);
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length) throw errors[0];
    },
  };
}
