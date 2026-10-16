export function createSettingsSaver(save, delay = 450, readContext = () => undefined) {
  let revision = 0, confirmed = 0, running = null, timer, draft = null, context, phase = "saved", error = "";
  let retired = false;
  const listeners = new Set();
  const notify = () => { for (const listener of listeners) listener(); };
  const state = () => ({ draft, phase, error, revision, pending: revision > confirmed });
  async function drain() {
    while (!retired && confirmed < revision) {
      const version = revision, payload = structuredClone(draft), owner = context;
      phase = "saving"; error = ""; notify();
      try {
        await save(payload, owner);
        if (retired) return;
        confirmed = version;
      } catch (failure) {
        if (retired) return;
        phase = "error"; error = failure?.message || String(failure); notify(); return;
      }
    }
    if (retired) return;
    phase = "saved"; notify();
  }
  const flush = () => {
    clearTimeout(timer);
    if (retired) return running || Promise.resolve();
    if (!running && confirmed < revision) running = drain().finally(() => {
      running = null;
      if (confirmed < revision && phase !== "error") void flush();
    });
    return running || Promise.resolve();
  };
  return {
    state,
    change(payload, immediate = false) {
      if (retired) return;
      draft = structuredClone(payload); context = readContext(); revision++; phase = running ? "saving" : "pending"; error = "";
      clearTimeout(timer); notify();
      if (immediate) void flush(); else timer = setTimeout(flush, delay);
    },
    flush,
    retire() {
      retired = true;
      clearTimeout(timer);
      draft = null;
      context = undefined;
      confirmed = revision;
      phase = "saved";
      error = "";
      listeners.clear();
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}
