import { build, context } from "esbuild";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const watch = process.argv.includes("--watch");

const metadataUrl = new URL("../userscript/metadata.txt", import.meta.url);
const outputDirUrl = new URL("../dist/", import.meta.url);
const entryUrl = new URL("../src/index.js", import.meta.url);
const logoUrl = new URL("../assets/better-ui-logo.png", import.meta.url);
const outputUrl = new URL(
  "../dist/pokepixel-better-ui.user.js",
  import.meta.url,
);

const metadata = await readFile(metadataUrl, "utf8");
const logo = `data:image/png;base64,${(await readFile(logoUrl)).toString("base64")}`;
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
  define: { __PPBUI_LOGO__: JSON.stringify(logo) },
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
