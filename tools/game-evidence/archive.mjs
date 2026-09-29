#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile, rename, copyFile, stat, open, unlink } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { query } from "./query.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", ".local-evidence");

async function hashFile(file) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest("hex");
}

async function verify(file) {
  let lineNumber = 0;
  let expectedId;
  let manifest;
  let recordCount = 0;
  const lastSeqByDocument = new Map();
  for await (const line of createInterface({ input: createReadStream(file, { encoding: "utf8" }),
    crlfDelay: Infinity })) {
    if (!line.trim()) continue;
    let entry;
    try { entry = JSON.parse(line); }
    catch { throw new Error("Arquivo inválido: JSON na linha " + (lineNumber + 1)); }
    lineNumber++;
    if (lineNumber === 1 && (entry.kind !== "evidence.format" || entry.schema !== 1 ||
      entry.exporter !== "ppbui-probe")) throw new Error("Cabeçalho de exportação inválido");
    if (lineNumber === 2) {
      if (entry.kind !== "evidence.session" || !entry.data || !entry.data.id)
        throw new Error("Manifesto de sessão inválido");
      expectedId = entry.data.id;
      manifest = entry.data;
      if (manifest.status === "recording") throw new Error("Sessão ainda está em gravação; pare antes de arquivar");
    }
    if (lineNumber > 2 && (entry.sessionId !== expectedId || !entry.kind ||
      !Number.isSafeInteger(entry.seq) || entry.seq < 1 || !entry.documentId ||
      !Number.isFinite(Date.parse(entry.at)))) {
      throw new Error("Registro inválido na linha " + lineNumber);
    }
    if (lineNumber > 2) {
      const previous = lastSeqByDocument.get(entry.documentId) || 0;
      if (entry.seq <= previous) throw new Error("Sequência duplicada ou fora de ordem na linha " + lineNumber);
      lastSeqByDocument.set(entry.documentId, entry.seq);
      recordCount++;
    }
  }
  if (lineNumber < 3) throw new Error("Sessão sem registros");
  if (Number.isSafeInteger(manifest?.events) && manifest.events !== recordCount)
    throw new Error("Contagem de eventos diverge do manifesto");
}

async function withCatalogLock(destination, callback) {
  const lockFile = join(destination, ".catalog.lock");
  let lock;
  for (let i = 0; i < 100; i++) {
    try { lock = await open(lockFile, "wx"); break; }
    catch (error) {
      if (error.code !== "EEXIST") throw error;
      // A stale lock is recoverable after an interrupted importer.
      try {
        if (Date.now() - (await stat(lockFile)).mtimeMs > 60000) await unlink(lockFile);
      } catch (race) { if (race.code !== "ENOENT") throw race; }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  if (!lock) throw new Error("Catálogo ocupado: nenhuma evidência foi registrada no índice");
  try { return await callback(); }
  finally {
    await lock.close();
    await unlink(lockFile).catch(error => { if (error.code !== "ENOENT") throw error; });
  }
}

export async function archive(file, label = "", destination = root) {
  const absolute = resolve(file);
  await verify(absolute);
  const sha256 = await hashFile(absolute);
  const filename = "sha256-" + sha256 + ".jsonl";
  const target = join(destination, filename);
  const meta = await query(absolute, { mode: "summary", limit: 1 });
  if (!meta.session || !meta.total || meta.invalid) {
    throw new Error("Arquivo inválido: formato JSONL, sessão e registros íntegros são obrigatórios.");
  }
  const sessionId = String(meta.session.id || "");
  if (!/^[a-zA-Z0-9-]{4,100}$/.test(sessionId)) {
    throw new Error("ID de sessão inválido.");
  }
  await mkdir(destination, { recursive: true });
  try { await copyFile(absolute, target, 1); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
  const currentSize = (await stat(target)).size;
  if (currentSize !== (await stat(absolute)).size) throw new Error("Colisão ou arquivo existente divergente");
  if (await hashFile(target) !== sha256) throw new Error("SHA-256 diverge após importar");
  const catalogPath = join(destination, "catalog.json");
  await withCatalogLock(destination, async () => {
    let catalog = [];
    try { catalog = JSON.parse(await readFile(catalogPath, "utf8")); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    if (!catalog.some(item => item.sha256 === sha256)) {
      catalog.push({
        sessionId, sha256, file: filename, label: String(label).slice(0, 120),
        importedAt: new Date().toISOString(), createdAt: meta.session.createdAt,
        sourceStatus: meta.session.status, events: meta.total, bytes: currentSize,
        kinds: meta.counts,
      });
      const staging = join(destination, "catalog.json.tmp-" + process.pid);
      await writeFile(staging, JSON.stringify(catalog, null, 2) + "\n", { flag: "wx" });
      await rename(staging, catalogPath);
    }
  });
  return { target, sha256, events: meta.total, sessionId, catalog: catalogPath };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const file = process.argv[2];
    if (!file) throw new Error("Uso: node tools/game-evidence/archive.mjs <download.jsonl> [rótulo]");
    const result = await archive(file, process.argv.slice(3).join(" "));
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } catch (error) {
    process.stderr.write(String(error.message || error) + "\n");
    process.exitCode = 1;
  }
}
