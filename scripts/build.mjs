import { build, context } from "esbuild";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const watch = process.argv.includes("--watch");

const metadataUrl = new URL("../userscript/metadata.txt", import.meta.url);
const outputDirUrl = new URL("../dist/", import.meta.url);
const entryUrl = new URL("../src/index.js", import.meta.url);
const outputUrl = new URL(
  "../dist/pokepixel-better-ui.user.js",
  import.meta.url,
);

const metadata = await readFile(metadataUrl, "utf8");
await mkdir(outputDirUrl, { recursive: true });

const options = {
  entryPoints: [fileURLToPath(entryUrl)],
  outfile: fileURLToPath(outputUrl),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  banner: {
    js: metadata.trim(),
  },
  sourcemap: false,
  minify: false,
  logLevel: "info",
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log("[PPBUI] watching...");
} else {
  await build(options);
}
