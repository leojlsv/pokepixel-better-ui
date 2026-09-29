import { createServer } from "node:http";
import { mkdir, readFile, stat } from "node:fs/promises";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { context } from "esbuild";

const host = "127.0.0.1";
const port = Number(process.env.PPBUI_PLAYGROUND_PORT || 4177);
const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const previewEntry = join(root, "tools", "pokemon-profile-playground", "pokemon-profile-preview.js");
const previewBundle = join(root, "work", "pokemon-profile-preview-bundle.js");
const servedFiles = new Set([
  "tools/pokemon-profile-playground/pokemon-profile-playground.html",
  "tools/pokemon-profile-playground/pokemon-profile-playground.js",
  "tools/pokemon-profile-playground/pokemon-profile-preview.html",
  "work/pokemon-profile-preview-bundle.js",
  "src/styles/tokens.css",
  "src/styles/base.css",
  "src/styles/components.css",
  "src/styles/states.css",
]);

await mkdir(join(root, "work"), { recursive: true });
const buildContext = await context({
  entryPoints: [previewEntry],
  bundle: true,
  format: "iife",
  platform: "browser",
  outfile: previewBundle,
  logLevel: "info",
});
await buildContext.watch();

const mime = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
]);

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] || "/");
  const relative = normalize(decoded).replace(/^([/\\])+/, "");
  const absolute = resolve(root, relative || "tools/pokemon-profile-playground/pokemon-profile-playground.html");
  if (absolute !== root && !absolute.startsWith(root + sep)) return null;
  if (!servedFiles.has(relativePath(absolute))) return null;
  return absolute;
}

function relativePath(absolute) {
  return relative(root, absolute).split(sep).join("/");
}

const server = createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405).end("Method Not Allowed");
    return;
  }
  let path;
  try { path = safePath(req.url || "/"); }
  catch { res.writeHead(400).end("Bad Request"); return; }
  if (!path) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const info = await stat(path);
    const file = info.isDirectory() ? join(path, "index.html") : path;
    const body = await readFile(file);
    res.writeHead(200, {
      "content-type": mime.get(extname(file).toLowerCase()) || "application/octet-stream",
      "cache-control": "no-store",
    });
    if (req.method === "HEAD") res.end();
    else res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not Found");
  }
});

server.listen(port, host, () => {
  console.log("");
  console.log("PokePixel Better UI — Profile UI Playground");
  console.log(`http://${host}:${port}/tools/pokemon-profile-playground/pokemon-profile-playground.html`);
  console.log("");
  console.log("Source/preview bundle está em watch. Ctrl+C encerra.");
});

async function shutdown() {
  await buildContext.dispose().catch(() => {});
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
