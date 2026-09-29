import assert from "node:assert/strict";
import { test } from "node:test";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createLifecycle } from "../src/core/lifecycle.js";

function mockBrowser(t) {
  const frames = new Map();
  const observers = [];
  let nextFrame = 0;
  t.mock.method(globalThis, "requestAnimationFrame", (callback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  t.mock.method(globalThis, "cancelAnimationFrame", (id) => frames.delete(id));
  t.mock.method(globalThis, "MutationObserver", class {
    constructor(callback) {
      this.callback = callback;
      this.observe = () => {};
      this.disconnect = () => {};
      observers.push(this);
    }
  });
  return {
    mutate() { observers[0].callback(); },
    flush() {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback());
    },
    frames,
    observers,
  };
}

// Node has no browser globals; each test restores its mocked implementations.
globalThis.document = { body: {} };
globalThis.requestAnimationFrame = () => {};
globalThis.cancelAnimationFrame = () => {};
globalThis.MutationObserver = class {};

test("stop cancels pending reconciliation and allows a clean restart", (t) => {
  const browser = mockBrowser(t);
  let mounts = 0;
  let cleanups = 0;
  const app = createBetterUI({ modules: [{
    id: "fixture",
    shouldMount: () => true,
    mount() {
      mounts++;
      return () => cleanups++;
    },
  }] });
  app.start();
  browser.mutate();
  app.stop();
  browser.flush();
  assert.equal(mounts, 1);
  assert.equal(cleanups, 1);
  app.start();
  assert.equal(mounts, 2);
  app.stop();
  assert.equal(cleanups, 2);
});

test("one observer coalesces bursts and reconciliation mounts/unmounts once", (t) => {
  const browser = mockBrowser(t);
  let present = true;
  let mounts = 0;
  let cleanups = 0;
  const app = createBetterUI({ modules: [{
    id: "fixture",
    shouldMount: () => present,
    mount() {
      mounts++;
      return () => cleanups++;
    },
  }] });
  app.start();
  app.start();
  browser.mutate();
  browser.mutate();
  assert.equal(browser.observers.length, 1);
  assert.equal(browser.frames.size, 1);
  browser.flush();
  assert.equal(mounts, 1);
  present = false;
  browser.mutate();
  browser.flush();
  assert.equal(cleanups, 1);
  present = true;
  browser.mutate();
  browser.flush();
  assert.equal(mounts, 2);
  app.stop();
  app.stop();
  assert.equal(cleanups, 2);
});

test("destroy cleans healthy modules and retains failed cleanup ownership for retry", () => {
  const lifecycle = createLifecycle();
  const failure = new Error("fixture cleanup failed");
  let cleaned = false, attempts = 0;
  lifecycle.mount("broken", () => { if (++attempts === 1) throw failure; });
  lifecycle.mount("healthy", () => { cleaned = true; });
  assert.throws(() => lifecycle.destroy(), (error) => error === failure);
  assert.equal(cleaned, true);
  assert.equal(lifecycle.isMounted("broken"), true, "failed cleanup keeps ownership so reconcile cannot mount over leaked state");
  assert.equal(lifecycle.isMounted("healthy"), false);
  assert.doesNotThrow(() => lifecycle.destroy());
  assert.equal(attempts, 2);
  assert.equal(lifecycle.isMounted("broken"), false);
});

test("failed module cleanup cannot trigger a duplicate mount on later reconcile", (t) => {
  mockBrowser(t);
  t.mock.method(console, "error", () => {});
  let enabled = true, mounts = 0, cleanupAttempts = 0;
  const app = createBetterUI({ modules: [{
    id: "fixture",
    shouldMount: () => enabled,
    getMountKey: () => "stable-root",
    mount() {
      mounts++;
      return () => { cleanupAttempts++; throw new Error("fixture cleanup failed"); };
    },
  }] });
  app.start();
  enabled = false;
  app.reconcile();
  assert.equal(cleanupAttempts, 1);
  enabled = true;
  app.reconcile();
  assert.equal(mounts, 1, "failed cleanup retains module ownership instead of mounting a second instance");
});
