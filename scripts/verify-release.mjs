import { readFile } from "node:fs/promises";
import {
  PROD_DOWNLOAD_URL,
  PROD_UPDATE_URL,
  userscriptMetadataBlock,
} from "./userscript-metadata.mjs";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const packageLock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
const metadata = await readFile(new URL("../userscript/metadata.txt", import.meta.url), "utf8");
const updateMetadata = await readFile(new URL("../dist/pokepixel-better-ui.meta.js", import.meta.url), "utf8");
const bundle = await readFile(new URL("../dist/pokepixel-better-ui.user.js", import.meta.url), "utf8");

const expectedTag = `v${packageJson.version}`;
const requestedTag =
  process.argv[2] ||
  (process.env.GITHUB_REF_TYPE === "tag" ? process.env.GITHUB_REF_NAME : "");

if (requestedTag && requestedTag !== expectedTag) {
  throw new Error(`Release tag ${requestedTag} does not match package version ${expectedTag}`);
}

if (packageLock.version !== packageJson.version || packageLock.packages?.[""]?.version !== packageJson.version) {
  throw new Error(
    `package-lock version mismatch: package=${packageJson.version}, lock=${packageLock.version}, root=${packageLock.packages?.[""]?.version}`,
  );
}

function requireSingleVersion(source, label) {
  const matches = [...source.matchAll(/^\/\/ @version\s+(\S+)\s*$/gm)];
  if (matches.length !== 1 || matches[0][1] !== packageJson.version) {
    throw new Error(`${label} must contain exactly one @version ${packageJson.version}`);
  }
}

requireSingleVersion(metadata, "userscript metadata template");
requireSingleVersion(updateMetadata, "Tampermonkey update metadata");
requireSingleVersion(bundle, "built userscript");

for (const [label, value] of [
  ["update URL", `// @updateURL    ${PROD_UPDATE_URL}`],
  ["download URL", `// @downloadURL  ${PROD_DOWNLOAD_URL}`],
]) {
  if (!metadata.includes(value) || !updateMetadata.includes(value) || !bundle.includes(value)) {
    throw new Error(`${label} must match the canonical Tampermonkey update channel`);
  }
}

if (userscriptMetadataBlock(updateMetadata) !== userscriptMetadataBlock(bundle)) {
  throw new Error("Tampermonkey .meta.js and built .user.js metadata blocks differ");
}

for (const [label, pattern] of [
  ["MIT userscript metadata", /^\/\/ @license\s+MIT\s*$/m],
  ["Rhyxus author metadata", /^\/\/ @author\s+Rhyxus\s*$/m],
  ["repository homepage", /^\/\/ @homepageURL\s+https:\/\/github\.com\/leojlsv\/pokepixel-better-ui\s*$/m],
  ["support URL", /^\/\/ @supportURL\s+https:\/\/github\.com\/leojlsv\/pokepixel-better-ui\/issues\s*$/m],
  ["MIT license notice", /^\/\/ MIT License\s*$/m],
  ["copyright notice", /^\/\/ Copyright \(c\) 2026 Leandro Vasconcelos\s*$/m],
]) {
  if (!pattern.test(bundle)) throw new Error(`Built userscript is missing ${label}`);
}

console.log(`[PPBUI] release contract OK: ${expectedTag}`);
