#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

function argumentsFrom(argv) {
  const options = { file: null, mode: "timeline", kinds: [], match: "", url: "", req: "", limit: 80 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--") && !options.file) { options.file = arg; continue; }
    if (arg === "--summary") options.mode = "summary";
    else if (arg === "--contracts") options.mode = "contracts";
    else if (arg === "--kind") options.kinds.push(argv[++i]);
    else if (arg === "--grep") options.match = argv[++i];
    else if (arg === "--url") options.url = argv[++i];
    else if (arg === "--req") options.req = argv[++i];
    else if (arg === "--limit") options.limit = Number(argv[++i]);
    else throw new Error("Opção desconhecida: " + arg);
  }
  if (!options.file || !Number.isSafeInteger(options.limit) || options.limit < 1 || options.limit > 10000) {
    throw new Error("Uso: node tools/game-evidence/query.mjs <sessao.jsonl> [--summary | --contracts | --kind ui.click | --url /professions | --req <reqId> | --grep termo | --limit 80]");
  }
  return options;
}

function shape(value, prefix = "", depth = 0, paths = []) {
  if (depth > 5 || paths.length >= 120) return paths;
  if (Array.isArray(value)) {
    paths.push(prefix + "[]");
    if (value.length) shape(value[0], prefix + "[]", depth + 1, paths);
    return paths;
  }
  if (value && typeof value === "object") {
    for (const [name, inner] of Object.entries(value).slice(0, 70)) {
      const path = prefix ? prefix + "." + name : name;
      paths.push(path);
      shape(inner, path, depth + 1, paths);
    }
  }
  return paths;
}

function endpoint(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname + (parsed.search ? "?" + [...parsed.searchParams.keys()].join("&") : "");
  } catch { return url || "<unknown>"; }
}

function httpParts(kind, data) {
  if (kind === "http.request") {
    return { phase: "request", reqId: data.reqId, method: data.method, url: data.url,
      requestBody: data.requestBody, source: data.via || "page" };
  }
  if (kind === "browser.http.request") {
    return { phase: "request", reqId: data.requestId, method: data.request?.method,
      url: data.request?.url, requestBody: data.request?.postData, source: "cdp" };
  }
  if (kind === "http.response") {
    return { phase: "response", reqId: data.reqId, status: data.status, source: "page" };
  }
  if (kind === "browser.http.response") {
    return { phase: "response", reqId: data.requestId, status: data.response?.status, source: "cdp" };
  }
  if (kind === "http.body") return { phase: "body", reqId: data.reqId, body: data.body, source: "page" };
  if (kind === "browser.http.body") {
    return { phase: "body", reqId: data.requestId, body: data.result?.body, source: "cdp" };
  }
  if (kind === "http.body.skipped" || kind === "browser.http.body.skipped") {
    return { phase: "bodySkipped", reqId: data.reqId || data.requestId, source: kind.startsWith("browser.") ? "cdp" : "page" };
  }
  if (kind === "http.error" || kind === "browser.http.error") {
    return { phase: "error", reqId: data.reqId || data.requestId, source: kind.startsWith("browser.") ? "cdp" : "page" };
  }
  if (kind === "http.incomplete") return { phase: "incomplete", reqId: data.reqId, source: "page" };
  return null;
}

export async function query(file, opts = {}) {
  const options = { mode: "timeline", kinds: [], match: "", url: "", req: "", limit: 80, ...opts };
  const counts = {};
  const endpoints = new Map();
  const ids = new Map();
  const timeline = [];
  let total = 0;
  let invalid = 0;
  let session;
  for await (const line of createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity })) {
    if (!line.trim()) continue;
    let record;
    try { record = JSON.parse(line); } catch { invalid++; continue; }
    if (record.kind === "evidence.session") { session = record.data; continue; }
    if (record.kind === "evidence.format") continue;
    const kind = record.kind || "<unknown>";
    counts[kind] = (counts[kind] || 0) + 1;
    total++;
    const data = record.data || {};
    const http = httpParts(kind, data);
    if (http?.phase === "request") {
      const normalizedEndpoint = String(http.method || "GET") + " " + endpoint(http.url);
      const key = http.source + "\u0000" + normalizedEndpoint;
      const item = endpoints.get(key) || { endpoint: normalizedEndpoint, source: http.source, calls: 0,
        statuses: {}, requestFields: new Set(), responseFields: new Set(), bodySkipped: 0, errors: 0 };
      item.calls++;
      shape(http.requestBody).forEach(path => item.requestFields.add(path));
      endpoints.set(key, item);
      ids.set(http.reqId, key);
      if (ids.size > 100000) ids.clear();
    } else if (http) {
      const item = endpoints.get(ids.get(http.reqId));
      if (item) {
        if (http.phase === "response") item.statuses[http.status] = (item.statuses[http.status] || 0) + 1;
        if (http.phase === "body") shape(http.body).forEach(path => item.responseFields.add(path));
        if (http.phase === "bodySkipped") item.bodySkipped++;
        if (http.phase === "error") item.errors++;
        if (http.phase === "incomplete") item.incomplete = (item.incomplete || 0) + 1;
      }
    }
    if (options.kinds.length && !options.kinds.some(pattern => kind.startsWith(pattern))) continue;
    const correlationId = http?.reqId || data.reqId || data.requestId;
    const correlatedEndpoint = correlationId ? ids.get(correlationId) || "" : "";
    if (options.url && !String(data.url || correlatedEndpoint).includes(options.url)) continue;
    if (options.req && correlationId !== options.req) continue;
    if (options.match && !JSON.stringify(record).toLowerCase().includes(options.match.toLowerCase()) &&
      !correlatedEndpoint.toLowerCase().includes(options.match.toLowerCase())) continue;
    if (timeline.length < options.limit) timeline.push(record);
  }
  return {
    session, total, invalid, counts,
    contracts: [...endpoints.values()].map(({ requestFields, responseFields, ...item }) => ({
      ...item,
      requestFields: [...requestFields].sort(),
      responseFields: [...responseFields].sort(),
    })).sort((a, b) => a.endpoint.localeCompare(b.endpoint) || a.source.localeCompare(b.source)),
    timeline,
  };
}

if (process.argv[1] && import.meta.url === new URL("file://" + process.argv[1].replaceAll("\\", "/")).href) {
  try {
    const args = argumentsFrom(process.argv.slice(2));
    const result = await query(args.file, args);
    if (args.mode === "summary") {
      process.stdout.write(JSON.stringify({ session: result.session, total: result.total,
        invalid: result.invalid, counts: result.counts }, null, 2) + "\n");
    } else if (args.mode === "contracts") {
      process.stdout.write(JSON.stringify({ sessionId: result.session?.id, contracts: result.contracts }, null, 2) + "\n");
    } else {
      for (const record of result.timeline) process.stdout.write(JSON.stringify(record) + "\n");
      process.stderr.write("Mostrados " + result.timeline.length + " de " + result.total + " eventos.\n");
    }
  } catch (error) {
    process.stderr.write(String(error.message || error) + "\n");
    process.exitCode = 1;
  }
}
