// The game may replace PokeIdle.Bus during a native rehydration. Every module
// must detach from the exact Bus it subscribed to before attaching to the new
// object; reading PokeIdle.Bus only at cleanup leaks the old handlers.
export function createNativeBusBindings(readBus) {
  const bindings = [];
  let bus = null;
  let disposed = false;
  let needsRebind = false;

  const usable = value => typeof value?.on === "function" && typeof value?.off === "function";
  const detach = () => {
    if (!bus) return;
    let firstError = null;
    for (const [event, handler] of bindings) {
      try { bus.off(event, handler); }
      catch (error) { firstError ??= error; }
    }
    if (firstError) throw firstError;
    bus = null;
    needsRebind = false;
  };

  return {
    bind(event, handler) {
      if (disposed) return;
      bindings.push([event, handler]);
      if (bus) {
        try { bus.on(event, handler); }
        catch (error) { needsRebind = true; throw error; }
      }
    },
    reconcile() {
      if (disposed) return;
      const candidate = readBus();
      const next = usable(candidate) ? candidate : null;
      if (bus === next && !needsRebind) return;
      detach();
      bus = next;
      if (bus) {
        needsRebind = true;
        try {
          for (const [event, handler] of bindings) {
            bus.on(event, handler);
          }
          needsRebind = false;
        } catch (error) {
          // Even a Bus.on() that throws after attaching must be detached. If
          // a rollback off() also throws, preserve this owner and retry next
          // reconcile instead of marking partial subscriptions as healthy.
          try { detach(); } catch { needsRebind = true; }
          throw error;
        }
      }
    },
    cleanup() {
      if (disposed) return;
      detach();
      disposed = true;
      bindings.length = 0;
    },
  };
}
