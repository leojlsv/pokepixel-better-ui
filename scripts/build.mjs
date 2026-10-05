import { build, context } from "esbuild";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { watch as watchFiles } from "node:fs";
import { basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { userscriptMetadataBlock, withUserscriptVersion } from "./userscript-metadata.mjs";

const watch = process.argv.includes("--watch");

const metadataUrl = new URL("../userscript/metadata.txt", import.meta.url);
const packageUrl = new URL("../package.json", import.meta.url);
const outputDirUrl = new URL("../dist/", import.meta.url);
const entryUrl = new URL("../src/index.js", import.meta.url);
const logoUrl = new URL("../assets/runtime-icons/betterui.png", import.meta.url);
const pokemonProfileIconUrl = new URL("../assets/menu-poke-profile-icon.png", import.meta.url);
const menuIconUrls = Object.freeze({
  genetics: new URL("../assets/runtime-icons/genetics.png", import.meta.url),
  nature: new URL("../assets/runtime-icons/nature.png", import.meta.url),
  trainer: new URL("../assets/runtime-icons/trainer.png", import.meta.url),
  evolution: new URL("../assets/runtime-icons/evolution.png", import.meta.url),
  gym: new URL("../assets/runtime-icons/gym.png", import.meta.url),
});
const outputUrl = new URL(
  "../dist/pokepixel-better-ui.user.js",
  import.meta.url,
);
const metadataOutputUrl = new URL(
  "../dist/pokepixel-better-ui.meta.js",
  import.meta.url,
);
const packageSource = await readFile(packageUrl);
const metadataSource = await readFile(metadataUrl);
const logoSource = await readFile(logoUrl);
const profileIconSource = await readFile(pokemonProfileIconUrl);
const menuIconSources = Object.fromEntries(await Promise.all(Object.entries(menuIconUrls).map(async ([name, url]) => [name, await readFile(url)])));
const packageJson = JSON.parse(packageSource.toString("utf8"));
const metadataTemplate = metadataSource.toString("utf8");
const metadata = withUserscriptVersion(metadataTemplate, packageJson.version);
const logo = `data:image/png;base64,${logoSource.toString("base64")}`;
const pokemonProfileIcon = `data:image/png;base64,${profileIconSource.toString("base64")}`;
const menuIcons = Object.fromEntries(Object.entries(menuIconSources).map(([name, source]) => [name, `data:image/png;base64,${source.toString("base64")}`]));
await mkdir(outputDirUrl, { recursive: true });
await writeFile(metadataOutputUrl, userscriptMetadataBlock(metadata), "utf8");
const options = {
  entryPoints: [fileURLToPath(entryUrl)],
  outfile: fileURLToPath(outputUrl),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  loader: { ".css": "text" },
  banner: {
    js: metadata.trim(),
  },
  define: {
    __PPBUI_LOGO__: JSON.stringify(logo),
    __PPBUI_VERSION__: JSON.stringify(packageJson.version),
    __PPBUI_POKE_PROFILE_ICON__: JSON.stringify(pokemonProfileIcon),
    __PPBUI_MENU_ICONS__: JSON.stringify(menuIcons),
  },
  sourcemap: false,
  minify: false,
  logLevel: "info",
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log("[PPBUI] watching...");
  // esbuild watches the import graph, not this build's package/header/image
  // side inputs. Never continue serving a stale header or inline icon silently.
  const initialInputs = new Map([
    [fileURLToPath(packageUrl), packageSource],
    [fileURLToPath(metadataUrl), metadataSource],
    [fileURLToPath(logoUrl), logoSource],
    [fileURLToPath(pokemonProfileIconUrl), profileIconSource],
    ...Object.entries(menuIconUrls).map(([name, url]) => [fileURLToPath(url), menuIconSources[name]]),
  ]);
  const byFolder = new Map();
  for (const path of initialInputs.keys()) {
    const folder = dirname(path);
    if (!byFolder.has(folder)) byFolder.set(folder, new Set());
    byFolder.get(folder).add(basename(path));
  }
  const watchers = [];
  for (const [folder, names] of byFolder) {
    watchers.push(watchFiles(folder, (_event, filename) => {
      if (filename && !names.has(filename.toString())) return;
      console.error("[PPBUI] package, metadata or icon input changed. Restart npm run watch to rebuild all embedded inputs.");
      process.exit(1);
    }));
  }
  // Close the initial read -> watch-install race: a side input changed during
  // esbuild startup might otherwise leave a stale bundle with no next event.
  for (const [path, before] of initialInputs) {
    const now = await readFile(path);
    if (!before.equals(now)) {
      watchers.forEach(watcher => watcher.close());
      await ctx.dispose();
      throw new Error(`Build input changed before watch initialization: ${path}. Restart npm run watch.`);
    }
  }
} else {
  await build(options);
}
