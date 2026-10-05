import assert from "node:assert/strict";
import { test } from "node:test";
import { createNativeBusBindings } from "../src/core/native-event-bus.js";

function makeBus() {
  const events = new Map();
  return {
    events,
    on(name, handler) { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(handler); },
    off(name, handler) { events.get(name)?.delete(handler); },
    emit(name, data) { for (const fn of events.get(name) || []) fn(data); },
  };
}

test("native Bus binding survives late hydration, replaces owner and detaches at cleanup", () => {
  let current = null;
  const old = makeBus(), newer = makeBus(), events = [];
  const binding = createNativeBusBindings(() => current);
  binding.bind("team.updated", data => events.push(data));
  binding.reconcile();
  current = old;
  binding.reconcile();
  binding.reconcile();
  assert.equal(old.events.get("team.updated").size, 1);
  old.emit("team.updated", 1);
  current = newer;
  binding.reconcile();
  old.emit("team.updated", 2);
  newer.emit("team.updated", 3);
  assert.deepEqual(events, [1, 3]);
  assert.equal(old.events.get("team.updated").size, 0);
  current = null;
  binding.reconcile();
  assert.equal(newer.events.get("team.updated").size, 0);
  binding.cleanup();
  current = old;
  binding.reconcile();
  old.emit("team.updated", 4);
  assert.deepEqual(events, [1, 3]);
});

test("a transient native off failure leaves cleanup retryable", () => {
  const old = makeBus();
  let fail = true;
  const off = old.off;
  old.off = (event, handler) => {
    if (fail) { fail = false; throw new Error("native off failed"); }
    return off(event, handler);
  };
  const binding = createNativeBusBindings(() => old);
  binding.bind("one", () => {});
  binding.bind("two", () => {});
  binding.reconcile();
  assert.throws(() => binding.cleanup(), /native off failed/);
  binding.cleanup();
  assert.equal(old.events.get("one").size, 0);
  assert.equal(old.events.get("two").size, 0);
});

test("a native on failure cannot record a partly attached Bus as healthy", () => {
  const current = makeBus();
  let fail = true;
  const on = current.on;
  current.on = (event, handler) => {
    if (event === "two" && fail) { fail = false; throw new Error("native on failed"); }
    return on(event, handler);
  };
  const binding = createNativeBusBindings(() => current);
  binding.bind("one", () => {});
  binding.bind("two", () => {});
  assert.throws(() => binding.reconcile(), /native on failed/);
  assert.equal(current.events.get("one").size, 0, "partially subscribed Bus must be rolled back");
  binding.reconcile();
  assert.equal(current.events.get("one").size, 1);
  assert.equal(current.events.get("two").size, 1);
  binding.cleanup();
});

test("a failed rollback detaches on the next reconcile before rebinding", () => {
  const current = makeBus();
  const on = current.on, off = current.off;
  let failOn = true, failOff = true;
  current.on = (event, handler) => {
    on(event, handler);
    if (event === "two" && failOn) { failOn = false; throw new Error("native on failed after attach"); }
  };
  current.off = (event, handler) => {
    if (event === "two" && failOff) { failOff = false; throw new Error("rollback off failed"); }
    off(event, handler);
  };
  const binding = createNativeBusBindings(() => current);
  binding.bind("one", () => {});
  binding.bind("two", () => {});
  assert.throws(() => binding.reconcile(), /native on failed/);
  assert.equal(current.events.get("two").size, 1, "failed rollback deliberately left one handler");
  binding.reconcile();
  assert.equal(current.events.get("one").size, 1);
  assert.equal(current.events.get("two").size, 1, "reconcile must not duplicate a stale handler");
  binding.cleanup();
  assert.equal(current.events.get("one").size, 0);
  assert.equal(current.events.get("two").size, 0);
});
