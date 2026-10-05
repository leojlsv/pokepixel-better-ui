import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  PROD_DOWNLOAD_URL,
  PROD_UPDATE_URL,
  userscriptMetadataBlock,
  withUserscriptVersion,
} from "../scripts/userscript-metadata.mjs";

test("userscript header version is derived exactly once from package.json", () => {
  const source = readFileSync(new URL("../userscript/metadata.txt", import.meta.url), "utf8");
  const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const stamped = withUserscriptVersion(source, version);
  assert.match(stamped, new RegExp(`^// @version\\s+${version.replaceAll(".", "\\.")}$`, "m"));
  assert.equal([...stamped.matchAll(/^\/\/ @version\s+/gm)].length, 1);
  assert.throws(() => withUserscriptVersion("// @name fixture", version), /exactly one/);
  assert.throws(() => withUserscriptVersion(`${source}\n// @version 0.0.0`, version), /exactly one/);
  assert.throws(() => withUserscriptVersion(`${source}\n// @version`, version), /exactly one/);
  assert.throws(() => withUserscriptVersion(source, "arbitrary text"), /valid package version/);
});

test("build injects the same package version into the Better UI product header", () => {
  const build = readFileSync(new URL("../scripts/build.mjs", import.meta.url), "utf8");
  assert.match(build, /__PPBUI_VERSION__:\s*JSON\.stringify\(packageJson\.version\)/);
});

test("production metadata exposes the native Tampermonkey update channel", () => {
  const source = readFileSync(new URL("../userscript/metadata.txt", import.meta.url), "utf8");
  assert.ok(source.includes(`// @updateURL    ${PROD_UPDATE_URL}`));
  assert.ok(source.includes(`// @downloadURL  ${PROD_DOWNLOAD_URL}`));
  const block = userscriptMetadataBlock(source);
  assert.match(block, /^\/\/ ==UserScript==/);
  assert.match(block, /\/\/ ==\/UserScript==\n$/);
  assert.equal(block.includes("MIT License"), false);
});
