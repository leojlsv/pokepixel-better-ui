#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { readdir, writeFile, rename, unlink } from "node:fs/promises";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { archive } from "./archive.mjs";
import { query } from "./query.mjs";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", ".local-evidence");

function redactDynamicSegment(value) {
  return /^(?:\d+|[a-f\d]{24,}|[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}|[A-Za-z0-9_-]{40,})$/i.test(value)
    ? ":id" : value;
}

function normalizedRoute(endpoint) {
  const match = /^(\S+)\s+(.+)$/.exec(endpoint);
  if (!match) return null;
  try {
    const url = new URL(match[2]);
    const path = url.pathname.split("/").map(redactDynamicSegment).join("/");
    const keys = [...url.searchParams.keys()].map(redactDynamicSegment).sort();
    return `${match[1]} ${path}${keys.length ? `?${keys.join("&")}` : ""}`;
  } catch {
    return null;
  }
}

function normalizedField(field) {
  return field.split(".").map(part => redactDynamicSegment(part.replace(/\[\]$/u, "")) +
    (part.endsWith("[]") ? "[]" : "")).join(".");
}

function privateContractSummary(contract) {
  const methodPath = normalizedRoute(contract.endpoint);
  if (!methodPath) return null;
  return {
    methodPath, source: contract.source, calls: contract.calls,
    statuses: contract.statuses,
    requestFields: (contract.requestFields || []).map(normalizedField),
    responseFields: (contract.responseFields || []).map(normalizedField),
    bodySkipped: contract.bodySkipped || 0, incomplete: contract.incomplete || 0, errors: contract.errors || 0,
  };
}

function aggregateContracts(files) {
  const groups = new Map();
  let requestsObserved = 0;
  for (const file of files.filter(item => item.ok)) {
    requestsObserved += (file.counts["http.request"] || 0) + (file.counts["browser.http.request"] || 0);
    for (const contract of file.contracts) {
      const methodPath = contract.methodPath || normalizedRoute(contract.endpoint);
      if (!methodPath) continue;
      let item = groups.get(methodPath);
      if (!item) {
        item = { methodPath, calls: 0, sessions: new Set(), statuses: {}, requestFields: new Set(),
          responseFields: new Set(), sources: new Set(), bodySkipped: 0, incomplete: 0, errors: 0 };
        groups.set(methodPath, item);
      }
      item.calls += contract.calls;
      item.sessions.add(file.sessionId);
      item.sources.add(contract.source);
      for (const [status, count] of Object.entries(contract.statuses || {})) {
        item.statuses[status] = (item.statuses[status] || 0) + count;
      }
      for (const field of contract.requestFields || []) item.requestFields.add(normalizedField(field));
      for (const field of contract.responseFields || []) item.responseFields.add(normalizedField(field));
      item.bodySkipped += contract.bodySkipped || 0;
      item.incomplete += contract.incomplete || 0;
      item.errors += contract.errors || 0;
    }
  }
  return {
    sessions: new Set(files.filter(item => item.ok).map(item => item.sessionId)).size,
    requestsObserved,
    note: "Observational HTTP events only. Page/CDP sources can duplicate requests; missing response is not a server outcome.",
    endpoints: [...groups.values()].map(({ sessions, sources, requestFields, responseFields, ...item }) => ({
      ...item, sessions: sessions.size, sources: [...sources].sort(),
      requestFields: [...requestFields].sort(), responseFields: [...responseFields].sort(),
    })).sort((a, b) => a.methodPath.localeCompare(b.methodPath)),
  };
}

async function writeIndex(file, data) {
  const temporary = `${file}.tmp-${process.pid}-${randomUUID()}`;
  await writeFile(temporary, JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
  try { await rename(temporary, file); }
  finally { await unlink(temporary).catch(error => { if (error.code !== "ENOENT") throw error; }); }
}

// All output remains under the private, Git-ignored evidence directory.
export async function importIncoming({ root = defaultRoot, incoming = join(root, "incoming") } = {}) {
  const names = (await readdir(incoming, { withFileTypes: true }))
    .filter(item => item.isFile() && /\.jsonl?$/i.test(item.name))
    .map(item => item.name).sort();
  const files = [];
  const seenHashes = new Set();
  for (const input of names) {
    try {
      const imported = await archive(join(incoming, input), "Evidence Probe incoming", root);
      const details = await query(imported.target, { mode: "contracts", limit: 1 });
      files.push({ input, ok: true, target: basename(imported.target), sha256: imported.sha256,
        duplicate: seenHashes.has(imported.sha256),
        events: imported.events, sessionId: imported.sessionId, status: details.session?.status,
        createdAt: details.session?.createdAt, counts: details.counts,
        contracts: details.contracts.map(privateContractSummary).filter(Boolean) });
      seenHashes.add(imported.sha256);
    } catch (error) {
      files.push({ input, ok: false, error: String(error?.message || error) });
    }
  }
  const unique = files.filter(item => item.ok && !item.duplicate);
  const sessionsById = new Map(), overlappingSessions = new Set();
  for (const file of unique) {
    const previousHash = sessionsById.get(file.sessionId);
    if (previousHash && previousHash !== file.sha256) overlappingSessions.add(file.sessionId);
    sessionsById.set(file.sessionId, file.sha256);
  }
  const generatedAt = new Date().toISOString();
  const index = { generatedAt, ...aggregateContracts(unique.filter(item => !overlappingSessions.has(item.sessionId))),
    complete: files.every(item => item.ok) && overlappingSessions.size === 0,
    failedFiles: files.filter(item => !item.ok).map(item => item.input),
    overlappingSessions: [...overlappingSessions].sort() };
  const report = { generatedAt, files };
  await writeIndex(join(root, "import-report.json"), report);
  await writeIndex(join(root, "contracts-index.json"), index);
  return { inputs: names.length, imported: unique.length,
    duplicates: files.filter(item => item.duplicate).length,
    failures: index.failedFiles, overlappingSessions: index.overlappingSessions,
    events: unique.reduce((sum, item) => sum + item.events, 0),
    sessions: index.sessions, endpoints: index.endpoints.length,
    farm: index.endpoints.filter(item => item.methodPath.startsWith("GET /api/v1/professions/farming/") ||
      item.methodPath.startsWith("POST /api/v1/professions/farming/"))
      .map(({ methodPath, calls, statuses, bodySkipped, incomplete }) => ({ methodPath, calls, statuses, bodySkipped, incomplete })) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(JSON.stringify(await importIncoming(), null, 2) + "\n"); }
  catch (error) { process.stderr.write(String(error?.message || error) + "\n"); process.exitCode = 1; }
}
