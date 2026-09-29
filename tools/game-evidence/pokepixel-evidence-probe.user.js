// ==UserScript==
// @name         PokePixel Evidence Probe (opt-in)
// @namespace    pokepixel-better-ui/evidence
// @version      0.1.0
// @description  Local, opt-in research recording; no gameplay automation or external upload.
// @match        https://pokepixel.nietore.com/*
// @sandbox      raw
// @grant        none
// @run-at       document-start
// ==/UserScript==

(() => {
  "use strict";
  if (window.top !== window || location.origin !== "https://pokepixel.nietore.com") return;
  if (window.__PPBUI_EVIDENCE__) return;

  const DB_NAME = "ppbui-evidence-v1";
  const ACTIVE = "ppbui:evidence:active-tab:v1";
  const PANEL_POS = "ppbui:evidence:panel-pos:v1";
  const MAX_BODY = 48 * 1024;
  const MAX_EVENT = 64 * 1024;
  const MAX_EVENTS = 50000;
  const MAX_TOTAL = 80 * 1024 * 1024;
  const BATCH = 80;
  const secret = /(?:authorization|auth|bearer|token|csrf|xsrf|cookie|password|passwd|secret|private.?key|session|credential|api.?key|signature|jwt|otp|pin|email|phone|address)/i;
  const redacted = "[REDACTED]";
  const encoder = new TextEncoder();
  const byteLength = value => encoder.encode(String(value)).byteLength;
  const frameId = makeId();
  const native = {
    fetch: window.fetch, WebSocket: window.WebSocket,
    EventSource: window.EventSource,
    sendBeacon: navigator.sendBeacon,
    xhrOpen: window.XMLHttpRequest && XMLHttpRequest.prototype.open,
    xhrSend: window.XMLHttpRequest && XMLHttpRequest.prototype.send,
    xhrSetHeader: window.XMLHttpRequest && XMLHttpRequest.prototype.setRequestHeader,
    pushState: history.pushState, replaceState: history.replaceState,
    storageSetItem: window.Storage && Storage.prototype.setItem,
    storageRemoveItem: window.Storage && Storage.prototype.removeItem,
    storageClear: window.Storage && Storage.prototype.clear,
    console: Object.fromEntries(["log", "info", "warn", "error", "debug", "trace"].map(k => [k, console[k]])),
  };
  const hooks = { console: {} };
  let dbPromise;
  let sessionId = null;
  let started = false;
  let draining = false;
  let starting = false;
  let stopping = false;
  let exporting = false;
  let readyForWrites = false;
  let installing = false;
  let queue = [];
  let queueBytes = 0;
  const inFlightHttp = new Map();
  const pendingBody = new Map();
  let events = 0;
  let bytes = 0;
  let lost = 0;
  let serial = 0;
  let failure = "";
  let flushTimer;
  let observer;
  let resourceObserver;
  let lastScrollAt = 0;
  let mutationTotals = { added: 0, removed: 0, attrs: {}, samples: [] };
  let mutationTimer;
  let panel;
  let status;
  let actionButton;
  let exportButton;
  let sessionPicker;
  let errorStatus;
  const corners = ["bottom-right", "top-right", "top-left", "bottom-left"];
  let corner = 0;

  function makeId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const data = new Uint8Array(16);
    crypto.getRandomValues(data);
    return Array.from(data, b => b.toString(16).padStart(2, "0")).join("");
  }

  function cleanString(value, limit = MAX_BODY) {
    let s = String(value);
    s = s.replace(/((?:https?|wss?):\/\/[^\s"'<>]+)/gi, raw => {
      try {
        const parsed = new URL(raw);
        for (const key of parsed.searchParams.keys()) parsed.searchParams.set(key, redacted);
        parsed.hash = "";
        return parsed.href;
      } catch { return raw; }
    });
    s = s.replace(/\bBearer\s+\S+/gi, "Bearer " + redacted);
    s = s.replace(/\b(Basic)\s+\S+/gi, "Basic " + redacted);
    s = s.replace(/((?:token|cookie|password|secret|csrf|session|api.?key|authorization)\s*[:=]\s*)[^\s&,;}"']+/gi, "$1" + redacted);
    s = s.replace(/\b[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{12,}\b/g, redacted);
    return s.length > limit ? s.slice(0, limit) + "[TRUNCATED]" : s;
  }

  function safeUrl(value) {
    try {
      const url = new URL(String(value), location.href);
      for (const key of Array.from(url.searchParams.keys())) url.searchParams.set(key, redacted);
      url.hash = "";
      return cleanString(url.href, 1000);
    } catch { return cleanString(value, 1000); }
  }

  function scrub(value, key = "", depth = 0, seen = new WeakSet()) {
    if (secret.test(key)) return redacted;
    if (value == null || typeof value === "boolean") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
    if (typeof value === "string") {
      if (value.length <= MAX_BODY && /^\s*[[{]/.test(value)) {
        try { return scrub(JSON.parse(value), key, depth + 1, seen); } catch { /* Not JSON. */ }
      }
      return cleanString(value);
    }
    if (typeof value === "bigint") return String(value);
    if (typeof value === "function" || typeof value === "symbol") return "[" + typeof value + "]";
    if (value instanceof Error) return { name: cleanString(value.name), message: cleanString(value.message), stack: cleanString(value.stack || "", 2000) };
    if (value instanceof Blob) return { type: cleanString(value.type), bytes: value.size };
    if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return { type: "binary", bytes: value.byteLength };
    if (depth >= 7) return "[MAX_DEPTH]";
    if (seen.has(value)) return "[CIRCULAR]";
    seen.add(value);
    if (Array.isArray(value)) return value.slice(0, 80).map(x => scrub(x, "", depth + 1, seen));
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return "[NON_PLAIN_OBJECT]";
    const result = {};
    try {
      const descriptors = Object.getOwnPropertyDescriptors(value);
      for (const name of Object.keys(descriptors).slice(0, 120)) {
        try {
          result[cleanString(name, 160)] = Object.prototype.hasOwnProperty.call(descriptors[name], "value")
            ? scrub(descriptors[name].value, name, depth + 1, seen) : "[ACCESSOR_OMITTED]";
        }
        catch { result[cleanString(name, 160)] = "[INACCESSIBLE]"; }
      }
      if (Object.keys(descriptors).length > 120) result._truncatedKeys = true;
    } catch { return "[UNREADABLE]"; }
    return result;
  }

  function body(value) {
    if (value == null) return null;
    if (typeof value === "string") {
      if (byteLength(value) > MAX_BODY) return { bytes: byteLength(value), skipped: "body_too_large" };
      try { return scrub(JSON.parse(value)); } catch { return cleanString(value); }
    }
    if (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams) {
      return scrub(Object.fromEntries(value.entries()));
    }
    if (typeof FormData !== "undefined" && value instanceof FormData) {
      return { fields: Array.from(value.keys()).slice(0, 50).map(k => secret.test(k) ? redacted : cleanString(k, 100)), values: "omitted" };
    }
    return scrub(value);
  }

  function headerNames(value) {
    try {
      if (!value) return [];
      const headers = new Headers(value);
      return Array.from(headers.keys()).slice(0, 80).map(key => cleanString(key.toLowerCase(), 80));
    } catch { return ["[HEADER_NAMES_UNAVAILABLE]"]; }
  }

  function storageArea(storage) {
    try {
      if (storage === window.localStorage) return "local";
      if (storage === window.sessionStorage) return "session";
    } catch { /* Storage getter may be unavailable. */ }
    return "unknown";
  }

  function isProbeStorageKey(key) {
    return String(key || "").startsWith("ppbui:evidence:");
  }

  function element(target) {
    if (!(target instanceof Element)) return null;
    const parts = [];
    let current = target;
    for (let i = 0; current && i < 5; i++, current = current.parentElement) {
      const id = current.id && !secret.test(current.id) ? "#" + cleanString(current.id, 70) : "";
      const cls = Array.from(current.classList || []).slice(0, 3)
        .filter(c => !secret.test(c)).map(c => "." + cleanString(c, 60)).join("");
      parts.unshift(current.tagName.toLowerCase() + id + cls);
    }
    const name = target.getAttribute("name") || "";
    const safeName = secret.test(name) ? redacted : cleanString(name, 100);
    const label = target.closest("button,[role=button],a,[role=tab]") || target;
    const labelValue = (label.getAttribute("aria-label") || label.getAttribute("title") ||
      (["BUTTON", "A"].includes(label.tagName) ? label.textContent : "") || "").trim();
    const type = target.getAttribute("type") || "";
    return {
      path: parts.join(" > "),
      tag: target.tagName.toLowerCase(),
      role: target.getAttribute("role") || "",
      name: safeName,
      type: cleanString(type, 60),
      label: secret.test(name) || ["password", "email", "tel"].includes(type) ? redacted : cleanString(labelValue, 100),
      menuId: cleanString(target.getAttribute("data-menu-id") || "", 80),
      module: cleanString(target.getAttribute("data-ppbui-module") || "", 80),
      disabled: target.matches(":disabled,[aria-disabled=true]"),
    };
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("sessions")) database.createObjectStore("sessions", { keyPath: "id" });
        if (!database.objectStoreNames.contains("records")) {
          const store = database.createObjectStore("records", { keyPath: "id", autoIncrement: true });
          store.createIndex("session", "sessionId", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("indexeddb_open_failed"));
    });
    return dbPromise;
  }

  function transactionDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("indexeddb_transaction_failed"));
      tx.onabort = () => reject(tx.error || new Error("indexeddb_transaction_aborted"));
    });
  }

  async function updateSession(changes) {
    const db = await openDb();
    const tx = db.transaction("sessions", "readwrite");
    const store = tx.objectStore("sessions");
    const req = store.get(sessionId);
    req.onsuccess = () => {
      if (req.result) store.put(Object.assign(req.result, changes));
    };
    await transactionDone(tx);
  }

  function updateUi() {
    const stateText = failure ? "ERRO" : starting ? "INICIANDO" : stopping ? "FINALIZANDO"
      : exporting ? "EXPORTANDO" : started ? "GRAVANDO" : "PARADO";
    if (status && status.textContent !== stateText) status.textContent = stateText;
    if (errorStatus && failure && errorStatus.dataset.failure !== failure) {
      errorStatus.dataset.failure = failure;
      errorStatus.textContent = failure;
    }
    if (actionButton) {
      actionButton.textContent = started ? "Parar" : "Iniciar";
      actionButton.setAttribute("aria-disabled", String(starting || stopping || exporting));
    }
    if (exportButton) exportButton.setAttribute("aria-disabled",
      String(!sessionId || started || exporting || starting || stopping));
    if (sessionPicker) sessionPicker.disabled = started || starting || stopping || exporting;
    if (panel) {
      const counter = panel.shadowRoot && panel.shadowRoot.getElementById("counter");
      if (counter) counter.textContent = events + " eventos / " + Math.round(bytes / 1024) + " KiB / perdas " + lost;
    }
  }

  function record(kind, data) {
    if (!started) return;
    if (draining && !["http.response", "http.error", "http.body", "http.body.skipped",
      "http.incomplete", "probe.stop"].includes(kind)) return;
    let value;
    try {
      value = { sessionId, documentId: frameId, seq: ++serial, at: new Date().toISOString(),
        ms: Math.round(performance.now()), kind, data: scrub(data) };
      const encoded = JSON.stringify(value);
      const encodedBytes = byteLength(encoded);
      if (encodedBytes > MAX_EVENT) {
        value.data = { skipped: "event_too_large", originalBytes: encodedBytes };
      }
      const size = byteLength(JSON.stringify(value));
      if (events + 1 > MAX_EVENTS || bytes + size > MAX_TOTAL || queue.length >= 1500) {
        lost += 1;
        failure = "LIMITE ATINGIDO: gravação interrompida; exporte os dados já salvos";
        void stop(failure, "capped");
        return;
      }
      queue.push(value);
      queueBytes += size;
      bytes += size;
      events += 1;
      if (queue.length >= BATCH) void flush();
    } catch { lost += 1; }
  }

  function announceBrowserRecording(recording) {
    try {
      const bridge = window.chrome && window.chrome.webview;
      if (bridge && typeof bridge.postMessage === "function") {
        bridge.postMessage({ type: "ppbui.evidence.recording", recording: Boolean(recording) });
      }
    } catch { /* Browser-only hint; recording does not depend on it. */ }
  }

  let flushing = false;
  async function flush() {
    if (flushing || !queue.length || !readyForWrites) return;
    flushing = true;
    const batch = queue.splice(0, BATCH);
    try {
      const db = await openDb();
      const tx = db.transaction(["records", "sessions"], "readwrite");
      for (const item of batch) tx.objectStore("records").add(item);
      const request = tx.objectStore("sessions").get(sessionId);
      request.onsuccess = () => {
        if (!request.result) return;
        const prior = request.result;
        prior.events = (prior.events || 0) + batch.length;
        prior.bytes = (prior.bytes || 0) + batch.reduce((n, row) => n + byteLength(JSON.stringify(row)), 0);
        tx.objectStore("sessions").put(prior);
      };
      await transactionDone(tx);
    } catch {
      lost += batch.length + queue.length;
      queue = [];
      failure = "Falha ao gravar no IndexedDB";
      void stop(failure, "failed");
    } finally {
      flushing = false;
      queueBytes = 0;
      if (queue.length && started) void flush();
      updateUi();
    }
  }

  function install() {
    if (installing) return;
    installing = true;
    try {
      if (typeof native.fetch === "function") {
        hooks.fetch = function (...args) {
          if (draining) return Reflect.apply(native.fetch, this, args);
          const reqId = makeId();
          const startedAt = performance.now();
          const candidate = args[0];
          const url = candidate instanceof Request ? candidate.url : candidate;
          const method = (args[1] && args[1].method) || (candidate instanceof Request && candidate.method) || "GET";
          record("http.request", { reqId, via: "fetch", method: String(method).toUpperCase(), url: safeUrl(url),
            headers: headerNames(args[1] && args[1].headers ||
              (candidate instanceof Request && candidate.headers)),
            requestBody: args[1] && Object.prototype.hasOwnProperty.call(args[1], "body") ? body(args[1].body) : "[Request body omitted]" });
          inFlightHttp.set(reqId, { via: "fetch", url: safeUrl(url) });
          let promise;
          try { promise = Reflect.apply(native.fetch, this, args); }
          catch (error) {
            record("http.error", { reqId, message: String(error) });
            inFlightHttp.delete(reqId);
            throw error;
          }
          Promise.resolve(promise).then(response => {
            try {
              record("http.response", { reqId, status: response.status, ok: response.ok,
                url: safeUrl(response.url), durationMs: Math.round(performance.now() - startedAt),
                contentType: response.headers.get("content-type") || "",
                contentLength: response.headers.get("content-length") || "",
                headers: headerNames(response.headers) });
              captureFetchBody(response, reqId);
            } catch { record("http.body.skipped", { reqId, reason: "response_metadata_failed" }); }
            finally { inFlightHttp.delete(reqId); }
          }, error => {
            record("http.error", { reqId, message: String(error),
              durationMs: Math.round(performance.now() - startedAt) });
            inFlightHttp.delete(reqId);
          });
          return promise;
        };
        window.fetch = hooks.fetch;
      }
      if (native.xhrOpen && native.xhrSend) {
        const meta = new WeakMap();
        hooks.xhrOpen = function (method, url, ...rest) {
          meta.set(this, { reqId: makeId(), method, url: safeUrl(url), start: 0, headers: [] });
          return Reflect.apply(native.xhrOpen, this, [method, url, ...rest]);
        };
        if (native.xhrSetHeader) {
          hooks.xhrSetHeader = function (name, value) {
            const req = meta.get(this);
            if (req && req.headers.length < 80) req.headers.push(cleanString(name, 80).toLowerCase());
            return Reflect.apply(native.xhrSetHeader, this, [name, value]);
          };
          XMLHttpRequest.prototype.setRequestHeader = hooks.xhrSetHeader;
        }
        hooks.xhrSend = function (...args) {
          if (draining) return Reflect.apply(native.xhrSend, this, args);
          const req = meta.get(this);
          if (req) {
            req.start = performance.now();
            record("http.request", { reqId: req.reqId, via: "xhr", method: req.method, url: req.url,
              headers: req.headers, requestBody: body(args[0]) });
            inFlightHttp.set(req.reqId, { via: "xhr", url: req.url });
            this.addEventListener("loadend", () => {
              record("http.response", { reqId: req.reqId, status: this.status, url: safeUrl(this.responseURL || req.url),
                durationMs: Math.round(performance.now() - req.start), contentType: this.getResponseHeader("content-type") || "" });
              try {
                if (this.responseType === "json") {
                  const value = scrub(this.response);
                  if (byteLength(JSON.stringify(value)) <= MAX_BODY) {
                    record("http.body", { reqId: req.reqId, body: value });
                  } else record("http.body.skipped", { reqId: req.reqId, reason: "json_exceeds_body_limit" });
                } else if (!this.responseType || this.responseType === "text") {
                  if (byteLength(this.responseText) <= MAX_BODY)
                    record("http.body", { reqId: req.reqId, body: body(this.responseText) });
                  else record("http.body.skipped", { reqId: req.reqId, reason: "xhr_text_exceeds_body_limit" });
                } else record("http.body.skipped", { reqId: req.reqId, reason: "binary_or_non_text_xhr" });
              } catch { record("http.body.skipped", { reqId: req.reqId, reason: "xhr_read_failed" }); }
              inFlightHttp.delete(req.reqId);
            }, { once: true });
          }
          try { return Reflect.apply(native.xhrSend, this, args); }
          catch (error) {
            if (req) {
              record("http.error", { reqId: req.reqId, message: String(error) });
              inFlightHttp.delete(req.reqId);
            }
            throw error;
          }
        };
        XMLHttpRequest.prototype.open = hooks.xhrOpen;
        XMLHttpRequest.prototype.send = hooks.xhrSend;
      }
      if (typeof native.WebSocket === "function") {
        hooks.WebSocket = new Proxy(native.WebSocket, {
          construct(target, args, newTarget) {
            const ws = Reflect.construct(target, args, newTarget);
            const wsId = makeId();
            record("ws.opening", { wsId, url: safeUrl(args[0]) });
            ws.addEventListener("open", () => record("ws.open", { wsId }));
            ws.addEventListener("message", e => recordFrame("ws.in", wsId, e.data));
            ws.addEventListener("close", e => record("ws.close", { wsId, code: e.code, wasClean: e.wasClean,
              reason: cleanString(e.reason, 500) }));
            ws.addEventListener("error", () => record("ws.error", { wsId }));
            const send = ws.send;
            ws.send = function (...items) {
              recordFrame("ws.out", wsId, items[0]);
              return Reflect.apply(send, this, items);
            };
            return ws;
          },
        });
        window.WebSocket = hooks.WebSocket;
      }
      if (typeof native.EventSource === "function") {
        hooks.EventSource = new Proxy(native.EventSource, {
          construct(target, args, newTarget) {
            const stream = Reflect.construct(target, args, newTarget);
            const streamId = makeId();
            record("sse.opening", { streamId, url: safeUrl(args[0]) });
            stream.addEventListener("open", () => record("sse.open", { streamId }));
            stream.addEventListener("message", event =>
              record("sse.in", { streamId, eventId: cleanString(event.lastEventId || "", 100),
                payload: body(event.data) }));
            stream.addEventListener("error", () => record("sse.error", { streamId,
              readyState: stream.readyState }));
            return stream;
          },
        });
        window.EventSource = hooks.EventSource;
      }
      if (typeof native.sendBeacon === "function") {
        hooks.sendBeacon = function (url, payload) {
          record("http.beacon", { method: "POST", url: safeUrl(url), requestBody: body(payload) });
          return Reflect.apply(native.sendBeacon, this, [url, payload]);
        };
        try { navigator.sendBeacon = hooks.sendBeacon; }
        catch { /* The navigator may expose a non-writable native property. */ }
      }
      for (const kind of Object.keys(native.console)) {
        if (typeof native.console[kind] !== "function") continue;
        hooks.console[kind] = function (...args) {
          record("console." + kind, { args: args.slice(0, 12).map(arg => scrub(arg)) });
          return Reflect.apply(native.console[kind], this, args);
        };
        console[kind] = hooks.console[kind];
      }
      hooks.pushState = function (...args) {
        const out = Reflect.apply(native.pushState, this, args);
        record("route.push", { url: safeUrl(location.href) });
        return out;
      };
      hooks.replaceState = function (...args) {
        const out = Reflect.apply(native.replaceState, this, args);
        record("route.replace", { url: safeUrl(location.href) });
        return out;
      };
      history.pushState = hooks.pushState;
      history.replaceState = hooks.replaceState;
      if (native.storageSetItem && native.storageRemoveItem && native.storageClear) {
        hooks.storageSetItem = function (key, value) {
          const out = Reflect.apply(native.storageSetItem, this, [key, value]);
          if (!isProbeStorageKey(key)) {
            record("storage.set", { area: storageArea(this), key: cleanString(key, 200),
              value: secret.test(String(key || "")) ? redacted : body(value) });
          }
          return out;
        };
        hooks.storageRemoveItem = function (key) {
          const out = Reflect.apply(native.storageRemoveItem, this, [key]);
          if (!isProbeStorageKey(key))
            record("storage.remove", { area: storageArea(this), key: cleanString(key, 200) });
          return out;
        };
        hooks.storageClear = function () {
          const area = storageArea(this);
          const out = Reflect.apply(native.storageClear, this, []);
          record("storage.clear", { area });
          return out;
        };
        Storage.prototype.setItem = hooks.storageSetItem;
        Storage.prototype.removeItem = hooks.storageRemoveItem;
        Storage.prototype.clear = hooks.storageClear;
      }
      for (const name of ["pointerdown", "pointerup", "click", "dblclick", "contextmenu",
        "change", "input", "submit", "focusin", "keydown", "scroll", "dragstart", "drop"]) {
        document.addEventListener(name, handleInteraction, { capture: true, passive: true });
      }
      for (const name of ["hashchange", "popstate", "online", "offline", "error", "unhandledrejection"]) {
        window.addEventListener(name, handleGlobalEvent, true);
      }
      window.addEventListener("storage", handleStorageEvent, true);
      window.addEventListener("pagehide", handlePagehide, true);
      document.addEventListener("visibilitychange", handleVisibility, true);
      if (typeof MutationObserver !== "undefined") {
        observer = new MutationObserver(mutations => {
          if (!started) return;
          for (const change of mutations) {
            if (change.target && change.target.getRootNode && change.target.getRootNode() !== document) continue;
            if (change.type === "childList") {
              mutationTotals.added += change.addedNodes.length;
              mutationTotals.removed += change.removedNodes.length;
              if (mutationTotals.samples.length < 5) {
                const sample = Array.from(change.addedNodes).find(n => n.nodeType === 1);
                if (sample) mutationTotals.samples.push(element(sample));
              }
            } else {
              mutationTotals.attrs[change.attributeName] = (mutationTotals.attrs[change.attributeName] || 0) + 1;
              if (mutationTotals.samples.length < 8) {
                mutationTotals.samples.push({
                  attribute: change.attributeName,
                  target: element(change.target),
                  value: ["hidden", "disabled", "aria-disabled", "aria-hidden", "role"].includes(change.attributeName)
                    ? cleanString(change.target.getAttribute(change.attributeName) || "", 50) : "[CLASS_CHANGE]",
                });
              }
            }
          }
          if (!mutationTimer) mutationTimer = setTimeout(flushMutations, 1000);
        });
        const root = document.documentElement;
        if (root) observer.observe(root, { childList: true, subtree: true, attributes: true,
          attributeFilter: ["hidden", "disabled", "aria-disabled", "aria-hidden", "role", "class"] });
        else document.addEventListener("DOMContentLoaded", attachObserver, { once: true });
      }
      if (typeof PerformanceObserver === "function") {
        try {
          resourceObserver = new PerformanceObserver(entries => {
            if (!started) return;
            for (const entry of entries.getEntries()) {
              record("network.resource", { url: safeUrl(entry.name), initiator: entry.initiatorType,
                durationMs: Math.round(entry.duration), transferBytes: entry.transferSize,
                encodedBytes: entry.encodedBodySize, decodedBytes: entry.decodedBodySize });
            }
          });
          resourceObserver.observe({ type: "resource", buffered: true });
        } catch {
          if (resourceObserver) resourceObserver.disconnect();
          resourceObserver = null;
        }
      }
      flushTimer = setInterval(() => { void flush(); updateUi(); }, 350);
    } catch (error) {
      failure = "Falha na instrumentação: " + cleanString(error && error.message || error, 120);
      void stop(failure, "failed");
    }
  }

  function attachObserver() {
    if (observer && document.documentElement && started)
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true,
        attributeFilter: ["hidden", "disabled", "aria-disabled", "aria-hidden", "role", "class"] });
  }

  function flushMutations() {
    mutationTimer = null;
    if (mutationTotals.added || mutationTotals.removed || Object.keys(mutationTotals.attrs).length) {
      record("dom.mutations", mutationTotals);
    }
    mutationTotals = { added: 0, removed: 0, attrs: {}, samples: [] };
  }

  function recordFrame(kind, wsId, data) {
    if (typeof data === "string") record(kind, { wsId, bytes: byteLength(data), payload: body(data) });
    else record(kind, { wsId, type: "binary", bytes: data && (data.byteLength || data.size) || 0,
      note: "Binary payload not copied" });
  }

  function captureFetchBody(response, reqId) {
    const finish = (kind, data = {}) => {
      if (!pendingBody.has(reqId)) return;
      const pending = pendingBody.get(reqId);
      pendingBody.delete(reqId);
      if (pending.timer) clearTimeout(pending.timer);
      if (kind === "http.body.skipped" && pending.reader) {
        void pending.reader.cancel().catch(() => {});
      }
      record(kind, { reqId, ...data });
    };
    try {
      const type = response.headers.get("content-type") || "";
      const knownLength = response.headers.has("content-length");
      const length = Number(response.headers.get("content-length"));
      if (!/json|text\/plain/i.test(type) || !response.body ||
        (knownLength && (!Number.isSafeInteger(length) || length > MAX_BODY || length < 0))) {
        record("http.body.skipped", { reqId, reason: "non_text_or_declared_too_large" });
        return;
      }
      const clone = response.clone();
      const pending = { reader: null, timer: null, finish };
      pendingBody.set(reqId, pending);
      pending.timer = setTimeout(() => finish("http.body.skipped", { reason: "body_read_timeout" }), 5000);
      if (!clone.body || typeof clone.body.getReader !== "function") {
        if (!knownLength) {
          finish("http.body.skipped", { reason: "stream_reader_unavailable" });
          return;
        }
        clone.text().then(text => {
          if (byteLength(text) <= MAX_BODY) finish("http.body", { body: body(text) });
          else finish("http.body.skipped", { reason: "decoded_body_too_large" });
        }, () => finish("http.body.skipped", { reason: "response_read_failed" }));
        return;
      }
      // A bounded tee branch observes chunked responses without draining the
      // game's stream. Cancellation is never awaited because the other tee
      // branch may still be consumed by the game.
      const reader = clone.body.getReader();
      pending.reader = reader;
      void (async () => {
        const chunks = [];
        let size = 0;
        while (pendingBody.has(reqId)) {
          const part = await reader.read();
          if (!pendingBody.has(reqId)) return;
          if (part.done) {
            const combined = new Uint8Array(size);
            let offset = 0;
            for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.byteLength; }
            finish("http.body", { body: body(new TextDecoder().decode(combined)) });
            return;
          }
          size += part.value.byteLength;
          if (size > MAX_BODY) {
            finish("http.body.skipped", { reason: "stream_exceeds_body_limit" });
            return;
          }
          chunks.push(part.value);
        }
      })().catch(() => finish("http.body.skipped", { reason: "response_read_failed" }));
    } catch {
      if (pendingBody.has(reqId)) {
        pendingBody.get(reqId).finish("http.body.skipped", { reason: "response_clone_failed" });
      } else record("http.body.skipped", { reqId, reason: "response_clone_failed" });
    }
  }

  function handleInteraction(e) {
    if (!started || (e.target && e.target.closest && e.target.closest("#ppbui-evidence-probe"))) return;
    if (e.type === "scroll") {
      if (performance.now() - lastScrollAt < 300) return;
      lastScrollAt = performance.now();
    }
    const target = e.target;
    const input = target instanceof Element && Boolean(target.closest("input,textarea,select,[contenteditable]"));
    const data = { target: element(target), trusted: e.isTrusted };
    if (e.type === "keydown") {
      const printable = e.key && e.key.length === 1;
      data.key = input && printable ? "[PRINTABLE_OMITTED]" : cleanString(e.key || "", 32);
      data.code = input && printable ? "[PRINTABLE_OMITTED]" : cleanString(e.code || "", 32);
      data.ctrl = e.ctrlKey; data.alt = e.altKey; data.shift = e.shiftKey; data.meta = e.metaKey;
    }
    if (e.type === "pointerdown" || e.type === "pointerup" || e.type === "click" || e.type === "contextmenu") {
      data.x = e.clientX; data.y = e.clientY; data.button = e.button;
    }
    if ((e.type === "change" || e.type === "input") && input) {
      data.valueLength = String(target.value || "").length;
      if (target.type === "checkbox" || target.type === "radio") data.checked = Boolean(target.checked);
      if (target.tagName === "SELECT" && !secret.test(target.name || ""))
        data.selectedIndex = target.selectedIndex;
    }
    if (e.type === "submit") {
      data.method = target && target.method || "";
      data.action = target && target.action ? safeUrl(target.action) : "";
    }
    record("ui." + e.type, data);
  }

  function handleGlobalEvent(e) {
    if (e.type === "error") {
      record("runtime.error", { message: e.message || "resource_error",
        filename: e.filename ? safeUrl(e.filename) : "", line: e.lineno, column: e.colno,
        stack: e.error && e.error.stack || "" });
    } else if (e.type === "unhandledrejection") {
      record("runtime.unhandledrejection", { reason: scrub(e.reason) });
    } else record("runtime." + e.type, { url: safeUrl(location.href) });
  }

  function handleStorageEvent(e) {
    if (!started || isProbeStorageKey(e.key)) return;
    record("storage.external", {
      area: storageArea(e.storageArea),
      key: cleanString(e.key || "", 200),
      oldValue: secret.test(String(e.key || "")) ? redacted : body(e.oldValue),
      newValue: secret.test(String(e.key || "")) ? redacted : body(e.newValue),
      url: safeUrl(e.url || location.href),
    });
  }

  function handlePagehide() {
    record("probe.pagehide", { url: safeUrl(location.href) });
    void flush();
  }

  function handleVisibility() {
    if (document.visibilityState === "hidden") void flush();
  }

  function uninstall() {
    if (!installing) return;
    installing = false;
    if (window.fetch === hooks.fetch) window.fetch = native.fetch;
    if (native.xhrOpen && XMLHttpRequest.prototype.open === hooks.xhrOpen)
      XMLHttpRequest.prototype.open = native.xhrOpen;
    if (native.xhrSend && XMLHttpRequest.prototype.send === hooks.xhrSend)
      XMLHttpRequest.prototype.send = native.xhrSend;
    if (native.xhrSetHeader && XMLHttpRequest.prototype.setRequestHeader === hooks.xhrSetHeader)
      XMLHttpRequest.prototype.setRequestHeader = native.xhrSetHeader;
    if (native.WebSocket && window.WebSocket === hooks.WebSocket) window.WebSocket = native.WebSocket;
    if (native.EventSource && window.EventSource === hooks.EventSource) window.EventSource = native.EventSource;
    if (native.sendBeacon && navigator.sendBeacon === hooks.sendBeacon)
      try { navigator.sendBeacon = native.sendBeacon; } catch { /* Readonly. */ }
    for (const [kind, fn] of Object.entries(native.console)) {
      if (console[kind] === hooks.console[kind]) console[kind] = fn;
    }
    if (history.pushState === hooks.pushState) history.pushState = native.pushState;
    if (history.replaceState === hooks.replaceState) history.replaceState = native.replaceState;
    if (native.storageSetItem && Storage.prototype.setItem === hooks.storageSetItem)
      Storage.prototype.setItem = native.storageSetItem;
    if (native.storageRemoveItem && Storage.prototype.removeItem === hooks.storageRemoveItem)
      Storage.prototype.removeItem = native.storageRemoveItem;
    if (native.storageClear && Storage.prototype.clear === hooks.storageClear)
      Storage.prototype.clear = native.storageClear;
    for (const name of ["pointerdown", "pointerup", "click", "dblclick", "contextmenu",
      "change", "input", "submit", "focusin", "keydown", "scroll", "dragstart", "drop"]) {
      document.removeEventListener(name, handleInteraction, true);
    }
    for (const name of ["hashchange", "popstate", "online", "offline", "error", "unhandledrejection"]) {
      window.removeEventListener(name, handleGlobalEvent, true);
    }
    window.removeEventListener("storage", handleStorageEvent, true);
    window.removeEventListener("pagehide", handlePagehide, true);
    document.removeEventListener("visibilitychange", handleVisibility, true);
    if (observer) observer.disconnect();
    if (resourceObserver) resourceObserver.disconnect();
    if (mutationTimer) clearTimeout(mutationTimer);
    if (flushTimer) clearInterval(flushTimer);
    mutationTimer = null;
    flushTimer = null;
  }

  async function start() {
    if (started) return sessionId;
    if (starting || stopping || exporting) throw new Error("Aguarde a transição da sessão");
    starting = true;
    draining = false;
    failure = "";
    if (errorStatus) {
      errorStatus.textContent = "";
      delete errorStatus.dataset.failure;
    }
    updateUi();
    try {
      await openDb();
      sessionId = makeId();
      events = 0; bytes = 0; lost = 0; serial = 0;
      const tx = (await openDb()).transaction("sessions", "readwrite");
      tx.objectStore("sessions").add({ id: sessionId, createdAt: new Date().toISOString(),
        status: "recording", origin: location.origin, startUrl: safeUrl(location.href),
        version: "0.1.0", limits: { maxEvents: MAX_EVENTS, maxBytes: MAX_TOTAL, maxBody: MAX_BODY } });
      await transactionDone(tx);
      sessionStorage.setItem(ACTIVE, sessionId);
      readyForWrites = true;
      started = true;
      announceBrowserRecording(true);
      install();
      record("probe.start", { url: safeUrl(location.href), userAgent: navigator.userAgent,
        viewport: { width: innerWidth, height: innerHeight }, language: navigator.language });
      updateUi();
      return sessionId;
    } catch (error) {
      started = false;
      sessionId = null;
      failure = "IndexedDB indisponível: " + cleanString(error && error.message || error, 100);
      updateUi();
      throw error;
    } finally {
      starting = false;
      updateUi();
    }
  }

  async function stop(reason = "parado pelo usuário", state = "stopped") {
    if (!started || stopping) return;
    stopping = true;
    draining = true;
    if (errorStatus && !failure) errorStatus.textContent = "";
    updateUi();
    if (state === "stopped") {
      const deadline = Date.now() + 1200;
      while ((inFlightHttp.size || pendingBody.size) && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 25));
      }
    }
    for (const [reqId, pending] of pendingBody) {
      pending.finish("http.body.skipped", { reason: "stop_before_body_completed" });
    }
    for (const [reqId, info] of inFlightHttp) {
      record("http.incomplete", { reqId, via: info.via, url: info.url, reason: "stop_before_response" });
      inFlightHttp.delete(reqId);
    }
    if (events < MAX_EVENTS && bytes < MAX_TOTAL && queue.length < 1500) {
      record("probe.stop", { reason, lost });
    }
    started = false;
    announceBrowserRecording(false);
    try { sessionStorage.removeItem(ACTIVE); } catch { /* Storage may have become unavailable. */ }
    uninstall();
    if (!readyForWrites) queue = [];
    while (flushing) await new Promise(resolve => setTimeout(resolve, 15));
    while (queue.length) await flush();
    try { await updateSession({ status: state, stoppedAt: new Date().toISOString(),
      events, bytes, lost, reason }); } catch { failure = "Falha ao finalizar sessão"; }
    readyForWrites = false;
    draining = false;
    stopping = false;
    updateUi();
  }

  async function resume() {
    let activeId;
    try { activeId = sessionStorage.getItem(ACTIVE); } catch { return; }
    if (!activeId) return;
    sessionId = activeId;
    draining = false;
    readyForWrites = false;
    started = true;
    install();
    record("probe.document", { url: safeUrl(location.href), userAgent: navigator.userAgent });
    try {
      const db = await openDb();
      const tx = db.transaction("sessions", "readonly");
      const request = tx.objectStore("sessions").get(activeId);
      const stored = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      if (!stored || stored.status !== "recording") {
        started = false;
        queue = [];
        uninstall();
        sessionStorage.removeItem(ACTIVE);
        sessionId = null;
        return;
      }
      events = (stored.events || 0) + queue.length;
      bytes = (stored.bytes || 0) + queue.reduce((n, row) => n + byteLength(JSON.stringify(row)), 0);
      lost = stored.lost || 0;
      readyForWrites = true;
      announceBrowserRecording(true);
      record("probe.resumed", { url: safeUrl(location.href) });
      void flush();
    } catch {
      failure = "Falha ao retomar sessão, gravação interrompida";
      started = false;
      announceBrowserRecording(false);
      queue = [];
      uninstall();
      try { sessionStorage.removeItem(ACTIVE); } catch { /* no-op */ }
    }
    updateUi();
  }

  async function sessions() {
    const db = await openDb();
    const tx = db.transaction("sessions", "readonly");
    const req = tx.objectStore("sessions").getAll();
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function refreshSessions() {
    if (!sessionPicker) return;
    const known = (await sessions()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const options = known;
    sessionPicker.replaceChildren();
    const stateLabel = { recording: "Em gravação", stopped: "Concluída", capped: "Limite atingido",
      failed: "Falha na gravação" };
    for (const item of options) {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = (item.createdAt || "?").slice(0, 19).replace("T", " ") + " UTC"
        + " · " + (stateLabel[item.status] || "Desconhecido") + " · " + item.id.slice(0, 8);
      sessionPicker.append(option);
    }
    if (!started && !starting && !stopping && !options.some(item => item.id === sessionId))
      sessionId = options[0]?.id || null;
    if (sessionId) sessionPicker.value = sessionId;
    if (!started && !starting && !stopping) {
      const chosen = known.find(item => item.id === sessionId);
      events = chosen?.events || 0;
      bytes = chosen?.bytes || 0;
      lost = chosen?.lost || 0;
    }
    updateUi();
  }

  async function exportSession(id = sessionId) {
    if (!id) throw new Error("Nenhuma sessão selecionada");
    if (started || starting || stopping) throw new Error("Pare a gravação antes de exportar");
    await flush();
    const db = await openDb();
    const tx = db.transaction(["records", "sessions"], "readonly");
    const manifest = tx.objectStore("sessions").get(id);
    const index = tx.objectStore("records").index("session");
    const rows = [JSON.stringify({ kind: "evidence.format", schema: 1, exporter: "ppbui-probe", exportedAt: new Date().toISOString() }) + "\n"];
    const found = await new Promise((resolve, reject) => {
      manifest.onsuccess = () => resolve(manifest.result);
      manifest.onerror = () => reject(manifest.error);
    });
    if (!found) throw new Error("Sessão inexistente");
    rows.push(JSON.stringify({ kind: "evidence.session", data: found }) + "\n");
    await new Promise((resolve, reject) => {
      const cursor = index.openCursor(IDBKeyRange.only(id));
      cursor.onerror = () => reject(cursor.error);
      cursor.onsuccess = () => {
        if (!cursor.result) { resolve(); return; }
        const { id: storedId, ...item } = cursor.result.value;
        rows.push(JSON.stringify(item) + "\n");
        cursor.result.continue();
      };
    });
    const blob = new Blob(rows, { type: "application/x-ndjson" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ppbui-evidence-" + id + ".jsonl";
    (document.body || document.documentElement).append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return { sessionId: id, bytes: blob.size, rows: rows.length - 2 };
  }

  function ingestBrowserEvent(kind, data) {
    if (typeof kind !== "string" || !kind.startsWith("browser.")) return false;
    if (!started || draining) return false;
    if ((kind === "browser.ws.in" || kind === "browser.ws.out") && data && typeof data === "object") {
      const frame = data.response || data.frame;
      if (frame && Number(frame.opcode) === 2 && typeof frame.payloadData === "string") {
        const length = frame.payloadData.length;
        const padding = frame.payloadData.endsWith("==") ? 2 : frame.payloadData.endsWith("=") ? 1 : 0;
        frame.payloadBytes = Math.max(0, Math.floor(length * 3 / 4) - padding);
        frame.payloadData = "[BINARY_OMITTED]";
      }
    }
    record(kind, data);
    return true;
  }

  async function discard(id = sessionId) {
    if (!id || started) throw new Error("Pare a gravação antes de excluir");
    const db = await openDb();
    const tx = db.transaction(["sessions", "records"], "readwrite");
    tx.objectStore("sessions").delete(id);
    const index = tx.objectStore("records").index("session");
    const cursor = index.openCursor(IDBKeyRange.only(id));
    cursor.onsuccess = () => {
      if (cursor.result) { cursor.result.delete(); cursor.result.continue(); }
    };
    await transactionDone(tx);
    if (id === sessionId) sessionId = null;
    await refreshSessions();
    updateUi();
  }

  function positionPanel() {
    if (!panel) return;
    const place = corners[corner];
    panel.style.left = place.endsWith("left") ? "12px" : "auto";
    panel.style.right = place.endsWith("right") ? "12px" : "auto";
    panel.style.top = place.startsWith("top") ? "12px" : "auto";
    panel.style.bottom = place.startsWith("bottom") ? "12px" : "auto";
  }

  function mountPanel() {
    if (panel || !document.body) return;
    panel = document.createElement("aside");
    panel.id = "ppbui-evidence-probe";
    panel.setAttribute("data-ppbui-module", "evidence-probe");
    panel.setAttribute("aria-label", "Gravador de evidências do jogo");
    panel.style.cssText = "all:initial;position:fixed;z-index:2147483646;right:12px;bottom:12px;"
      + "font:12px/1.5 system-ui,sans-serif;color:#eee;max-width:calc(100vw - 24px);width:280px;"
      + "max-height:calc(100vh - 24px);overflow:auto";
    try {
      const previousCorner = sessionStorage.getItem(PANEL_POS);
      if (corners.includes(previousCorner)) corner = corners.indexOf(previousCorner);
    } catch { /* Session storage may be unavailable. */ }
    positionPanel();
    const root = panel.attachShadow({ mode: "open" });
    root.innerHTML = '<style>:host{all:initial} .box{background:#172328;color:#fff;border:1px solid #699;'
      + 'border-radius:7px;padding:9px;box-shadow:0 4px 18px #0008;font:12px/1.5 system-ui,sans-serif}'
      + 'button{font:inherit;margin:2px;padding:5px 9px;border:1px solid #899;background:#243e48;color:#fff;'
      + 'border-radius:4px;cursor:pointer}button:focus-visible{outline:2px solid #fff;outline-offset:2px}'
      + 'select{font:inherit;color:#fff;background:#243e48;border:1px solid #899;border-radius:4px;padding:4px}'
      + 'select:focus-visible{outline:2px solid #fff;outline-offset:2px}'
      + 'button[aria-disabled=true]{opacity:.5;cursor:wait}small{display:block;color:#c7d6db}'
      + 'summary{cursor:pointer;font-weight:bold}'
      + '</style><div class="box"><details><summary>Evidence Probe <span id="state"'
      + ' role="status" aria-live="polite" aria-atomic="true"></span></summary>'
      + '<small>Captura local. Recarregue após Iniciar para registrar desde o boot.</small>'
      + '<button id="toggle" type="button">Iniciar</button><button id="export" type="button">Exportar JSONL</button>'
      + '<button id="position" type="button">Mover painel</button>'
      + '<label for="sessions">Sessão armazenada</label><select id="sessions" aria-label="Sessão para exportar"'
      + ' style="display:block;max-width:100%;margin:4px 0"></select>'
      + '<small id="counter"></small><small id="error" role="status" aria-live="polite"></small>'
      + '</details></div>';
    status = root.getElementById("state");
    actionButton = root.getElementById("toggle");
    exportButton = root.getElementById("export");
    sessionPicker = root.getElementById("sessions");
    const error = root.getElementById("error");
    errorStatus = error;
    root.getElementById("position").addEventListener("click", () => {
      corner = (corner + 1) % corners.length;
      positionPanel();
      try { sessionStorage.setItem(PANEL_POS, corners[corner]); } catch { /* No-op. */ }
      error.textContent = "Posição: " + {
        "bottom-right": "inferior direita", "top-right": "superior direita",
        "top-left": "superior esquerda", "bottom-left": "inferior esquerda",
      }[corners[corner]];
    });
    sessionPicker.addEventListener("change", () => {
      if (started) return;
      sessionId = sessionPicker.value || null;
      void refreshSessions().catch(e => {
        error.textContent = "Erro ao selecionar sessão: " + cleanString(e.message, 100);
      });
    });
    actionButton.addEventListener("click", async () => {
      if (starting || stopping || exporting) return;
      try { if (started) await stop(); else await start(); } catch { /* status already contains error */ }
      await refreshSessions().catch(e => { error.textContent = "Erro ao listar sessões: " + cleanString(e.message, 100); });
      updateUi();
    });
    exportButton.addEventListener("click", async () => {
      if (exporting || started || starting || stopping || !sessionId) return;
      exporting = true;
      error.textContent = "Preparando exportação local...";
      updateUi();
      try {
        const result = await exportSession();
        error.textContent = "Exportados " + result.rows + " registros";
      } catch (e) { error.textContent = cleanString(e.message, 120); }
      finally { exporting = false; updateUi(); }
    });
    document.body.append(panel);
    updateUi();
    void refreshSessions().catch(e => {
      error.textContent = "Erro ao listar sessões: " + cleanString(e.message, 100);
    });
  }

  const api = Object.freeze({
    start, stop, export: exportSession, sessions, discard,
    ingestBrowserEvent,
    stats: () => ({ sessionId, recording: started, events, bytes, lost, failure,
      queued: queue.length, pendingHttp: inFlightHttp.size, pendingBodies: pendingBody.size,
      documentId: frameId }),
  });
  Object.defineProperty(window, "__PPBUI_EVIDENCE__", { value: api, configurable: false });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountPanel, { once: true });
  else mountPanel();
  void resume();
})();
