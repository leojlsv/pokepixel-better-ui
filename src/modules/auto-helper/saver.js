export function createSettingsSaver(save, delay = 450) {
  let revision = 0, confirmed = 0, running = null, timer, draft = null, phase = "saved", error = "";
  const listeners = new Set();
  const notify = () => { for (const listener of listeners) listener(); };
  const state = () => ({ draft, phase, error, revision, pending: revision > confirmed });
  async function drain() {
    while (confirmed < revision) {
      const version = revision, payload = structuredClone(draft);
      phase = "saving"; error = ""; notify();
      try { await save(payload); confirmed = version; }
      catch (failure) { phase = "error"; error = failure?.message || String(failure); notify(); return; }
    }
    phase = "saved"; notify();
  }
  const flush = () => {
    clearTimeout(timer);
    if (!running && confirmed < revision) running = drain().finally(() => {
      running = null;
      if (confirmed < revision && phase !== "error") void flush();
    });
    return running || Promise.resolve();
  };
  return {
    state,
    change(payload, immediate = false) {
      draft = structuredClone(payload); revision++; phase = running ? "saving" : "pending"; error = "";
      clearTimeout(timer); notify();
      if (immediate) void flush(); else timer = setTimeout(flush, delay);
    },
    flush,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}
