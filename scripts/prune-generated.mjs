import { lstat, realpath, readdir, rm } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const physicalRoot = await realpath(root);
const apply = process.argv.includes("--apply");
const profiles = process.argv.includes("--profiles");
const unknown = process.argv.slice(2).filter(arg => !["--apply", "--profiles"].includes(arg));
if (unknown.length) throw new Error(`Unknown option(s): ${unknown.join(", ")}`);

// Only disposable, locally recreated build/test byproducts belong here. Never
// include dist/, SDK inputs, sprite caches, visual evidence or candidate EXEs.
const paths = [
  "tools/nayakoko-sprite-extractor/__pycache__",
  "tools/overworld-sprite-pipeline/__pycache__",
  "tools/pokemondb-sprite-fetcher/__pycache__",
];

if (profiles) paths.push(
  "tools/coupled-workspace-webview2/bin/smoke-user-data",
  "tools/coupled-workspace-webview2/bin/smoke/visual/ppbui-local-chrome-profile",
  "tools/coupled-workspace-webview2/bin/pptools-neutral-exp-candidate/edge-synthetic-profile",
  "tools/coupled-workspace-webview2/bin/pptools-oneclick-candidate-preview/.synthetic-render-profile",
  "tools/coupled-workspace-webview2/bin/pptools-search-candidate/edge-synthetic-profile",
  "tools/coupled-workspace-webview2/bin/pptools-tampermonkey-candidate/edge-synthetic-profile",
);

function withinRoot(name) {
  const absolute = resolve(root, name);
  const rel = relative(root, absolute);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || rel.startsWith(sep)) {
    throw new Error(`Unsafe cleanup target: ${name}`);
  }
  return absolute;
}

async function existing(path) {
  try { return await lstat(path); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

async function safeAbsolute(name) {
  const absolute = withinRoot(name);
  let segment = root;
  for (const part of relative(root, absolute).split(sep)) {
    segment = resolve(segment, part);
    const item = await existing(segment);
    if (item?.isSymbolicLink()) {
      throw new Error(`Refusing cleanup through symbolic link: ${name}`);
    }
    if (item) {
      const physical = relative(physicalRoot, await realpath(segment));
      if (physical === ".." || physical.startsWith(`..${sep}`) || physical.startsWith(sep)) {
        throw new Error(`Refusing cleanup outside repository: ${name}`);
      }
    }
  }
  return absolute;
}

const bin = await safeAbsolute("tools/coupled-workspace-webview2/bin");
if ((await existing(bin))?.isDirectory()) {
  for (const entry of await readdir(bin, { withFileTypes: true })) {
    if (entry.isFile() && /\.(?:stdout|stderr)\.tmp$/.test(entry.name)) {
      paths.push(`tools/coupled-workspace-webview2/bin/${entry.name}`);
    }
  }
}

let selected = 0;
for (const name of paths) {
  const absolute = await safeAbsolute(name);
  const item = await existing(absolute);
  if (!item) continue;
  if (item.isSymbolicLink() || (!item.isDirectory() && !item.isFile())) {
    throw new Error(`Refusing unexpected cleanup target: ${name}`);
  }
  if (apply) await rm(absolute, { recursive: item.isDirectory() });
  console.log(`${apply ? "removed" : "candidate"}: ${name}`);
  selected += 1;
}
console.log(`${selected} target(s) ${apply ? "removed" : "found (dry run)"}.`);
if (!apply) console.log("Use --apply to remove the listed byproducts; --profiles also includes synthetic browser profiles.");
