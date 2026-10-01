#!/usr/bin/env node
// Create-only synthetic host + current Better UI bundle. No shared dist/build output is written.
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, copyFile, stat, lstat } from "node:fs/promises";
import { resolve, join, dirname, sep, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { withUserscriptVersion } from "../../../scripts/userscript-metadata.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const tupleDir = join(repo, ".local-evidence", "coupled-webview2-perf", "tuples");
const hostSources = {
  "--host-001": {
    id: "cwperf001-focus-race-full-20261001",
    manifestSha256: "0D4A25B6ACEB844ACC01EE05091819B3E674C2DDA202BD830EED860C6D2DAC19",
    hostSha256: "8B40B6B69E486B8E835E6CC0F09BDFDC05F77E92ECCBA60636EE4D7B117DD035",
  },
  "--host-005": {
    id: "cwperf005-shutdown-fi-v2",
    manifestSha256: "968F7E1244BA518004AAE9361C895DA5374977A51A17139A597DBE8F089574BB",
    hostSha256: "DD654B6AA659DD68805DD8BCB1B1C2153857F8268560A42A362C3C3ECE53F092",
  },
  "--host-005-v3": {
    id: "cwperf005-shutdown-positive-v3",
    manifestSha256: "39884E1F932CAC38509BFC36FA169BCA923373828CED55202B1203DDB77CE240",
    hostSha256: "1AD3B049B612B9011D22F0D62AAC8A83C92966F5C20CE8D78DBFF1ABA7B6F36C",
  },
  "--host-005-v5": {
    id: "cwperf005-shutdown-positive-v5",
    manifestSha256: "F978CC1809C8B5E53DFFFDBC015807208C2314E15FF0181B4DAA6946E54FF692",
    hostSha256: "1CDAB6A5FA8594E4BE4F08B180B6D8C6688882E6D9311C314116A84844CF7F18",
  },
  "--host-view-epoch-v6": {
    id: "cwperf002-view-epoch-proto-v6",
    manifestSha256: "9E0952F39AF3415ADC093B91AEDC48CAA482E566C44AAE1CFD2763F24BEBE659",
    hostSha256: "10CE74C18C453AB8D82EB4A71B7BEDCCF2E445741683C0ACB80B93EFFFA43584",
  },
  "--host-view-epoch-v7": {
    id: "cwperf002-view-epoch-proto-v7",
    manifestSha256: "0CE6D3528E1AE42291FEBE202DDBF0AC8DAC0959E89A6E0D3143F9FD056168A0",
    hostSha256: "A4E1918E002797D7EAAE839831984F9C7C412ED149445B05AC0470F0D1751CD8",
  },
  "--host-view-epoch-v9": {
    id: "cwperf002-view-epoch-proto-v9",
    manifestSha256: "891AADC0478075905D70FCDCCBB971B2FE9B462A61B7FBA850947C4691D1A95E",
    hostSha256: "3D11282B9E16B32F1AD30AD04EEBCE952738749B81078AEC0D5AED859E6BA19D",
  },
  "--host-view-epoch-v14": {
    id: "cwperf002-view-epoch-resume-v14",
    manifestSha256: "80ED35A2693E55A705B74B90863FCBFCD25BC14855F49F6A189303F1B7111495",
    hostSha256: "CB94BE88C3687DAAFF7BD6AEEEE5D57DBD101CC562A55387A736B912315EADA9",
  },
  "--host-view-overflow-v17": {
    id: "cwperf002-view-epoch-overflow-v17",
    manifestSha256: "D129A93658C9C6F1E194B3386024B30340D2728A859CB40243F7EF1A3C879D09",
    hostSha256: "709F0010C80E0243D118FC1AF54BC4238F010827F1F75681ED16DFA125B6D0C8",
  },
  "--host-settings-v09": {
    id: "cwperf-settings-current-po-20261001-v09",
    manifestSha256: "8E697F02FCCEA3712CC83BDED326A6EC3E6573AA60B835F597A42017826F4660",
    hostSha256: "2B634150104E47B0C115ACFD45655507187C323A2B80428B69ED714FF3B82B5B",
  },
};
const hostFile = "tools/coupled-workspace-webview2/bin/PokePixelCoupledWorkspace.candidate.exe";
const betterUiFile = "dist/pokepixel-better-ui.user.js";
const analyzerFile = "dist/pokepixel-hunt-analyzer.embed.js";
const campaignId = process.argv[2];
const hostOption = process.argv[3] ?? "--host-001";
const analyzerOption = process.argv[4] ?? "";
if (!campaignId || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$/.test(campaignId) ||
    process.argv.length > 5 || !Object.hasOwn(hostSources, hostOption) ||
    (analyzerOption !== "" && analyzerOption !== "--analyzer-current-source")) {
  throw new Error("Usage: node freeze-better-ui-candidate.mjs <new-create-only-campaign-id> [pinned --host-*] [--analyzer-current-source]");
}
const buildAnalyzerFromCurrentSource = analyzerOption === "--analyzer-current-source";
const { id: baselineId, manifestSha256: baselineManifestSha256, hostSha256: originalHostSha256 } = hostSources[hostOption];

const sha = bytes => createHash("sha256").update(bytes).digest("hex").toUpperCase();
const hash = async path => sha(await readFile(path));
async function verifyNoLinks(path) {
  let current = resolve(path);
  while (current !== dirname(current)) {
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error(`Symlink is not allowed: ${current}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    current = dirname(current);
  }
}

const source = join(tupleDir, baselineId);
const target = join(tupleDir, campaignId);
await verifyNoLinks(source);
await verifyNoLinks(target);
if ((await hash(join(source, "tuple-manifest.json"))) !== baselineManifestSha256) {
  throw new Error("Original frozen host manifest changed; refusing the feature build.");
}
const original = JSON.parse(await readFile(join(source, "tuple-manifest.json"), "utf8"));
if (original.schemaVersion !== 1 || original.campaignId !== baselineId ||
    original.artifacts.find(entry => entry.path === hostFile)?.sha256 !== originalHostSha256) {
  throw new Error("Pinned original host identity does not match.");
}
for (const item of original.artifacts) {
  if (await hash(join(source, item.path)) !== item.sha256) {
    throw new Error(`Original frozen input changed: ${item.path}`);
  }
}

await mkdir(target); // Existing campaigns cannot be overwritten, even with the same content.
const artifacts = [];
for (const item of original.artifacts) {
  if (item.path === betterUiFile || (buildAnalyzerFromCurrentSource && item.path === analyzerFile)) continue;
  const dest = join(target, item.path);
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(join(source, item.path), dest);
  if (await hash(dest) !== item.sha256) throw new Error(`Frozen copy verification failed: ${item.path}`);
  artifacts.push({ path: item.path, sha256: item.sha256, bytes: (await stat(dest)).size });
}

let analyzerSourceProvenance = null;
if (buildAnalyzerFromCurrentSource) {
  const analyzerRoot = resolve(repo, "../pokepixel-hunt-analyzer");
  await verifyNoLinks(analyzerRoot);
  const analyzerPackage = JSON.parse(await readFile(join(analyzerRoot, "package.json"), "utf8"));
  const metadataSource = join(analyzerRoot, "scripts/userscript-metadata.mjs");
  const { createUserscriptMetadata } = await import(pathToFileURL(metadataSource).href);
  const analyzerBundlePath = join(target, analyzerFile);
  await mkdir(dirname(analyzerBundlePath), { recursive: true });
  const built = await build({
    absWorkingDir: repo,
    entryPoints: [join(analyzerRoot, "userscript/main.js")],
    outfile: analyzerBundlePath,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["chrome114", "firefox128"],
    legalComments: "none",
    minify: false,
    sourcemap: false,
    loader: { ".png": "dataurl" },
    banner: { js: createUserscriptMetadata({ appVersion: analyzerPackage.version }) },
    define: {
      __APP_VERSION__: JSON.stringify(analyzerPackage.version),
      "process.env.NODE_ENV": '"production"',
    },
    metafile: true,
    logLevel: "silent",
  });
  const sourceFiles = [...new Set([
    ...Object.keys(built.metafile.inputs).map(input => resolve(repo, input)),
    join(analyzerRoot, "package.json"),
    metadataSource,
  ])].sort();
  const inputs = [];
  for (const sourceFile of sourceFiles) {
    if (!sourceFile.startsWith(`${analyzerRoot}${sep}`)) {
      throw new Error(`Analyzer build input escaped its source repository: ${sourceFile}`);
    }
    await verifyNoLinks(sourceFile);
    inputs.push({ path: relative(analyzerRoot, sourceFile).replaceAll("\\", "/"), sha256: await hash(sourceFile) });
  }
  analyzerSourceProvenance = { repository: "../pokepixel-hunt-analyzer", appVersion: analyzerPackage.version, inputs };
  artifacts.push({ path: analyzerFile, sha256: await hash(analyzerBundlePath), bytes: (await stat(analyzerBundlePath)).size });
}

const packageJson = JSON.parse(await readFile(join(repo, "package.json"), "utf8"));
const metadata = withUserscriptVersion(await readFile(join(repo, "userscript/metadata.txt"), "utf8"), packageJson.version);
const logo = `data:image/png;base64,${(await readFile(join(repo, "assets/better-ui-logo.png"))).toString("base64")}`;
const profileIcon = `data:image/png;base64,${(await readFile(join(repo, "assets/menu-poke-profile-icon.png"))).toString("base64")}`;
const bundlePath = join(target, betterUiFile);
await mkdir(dirname(bundlePath), { recursive: true });
await build({
  entryPoints: [join(repo, "src/index.js")],
  outfile: bundlePath,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  loader: { ".css": "text" },
  banner: { js: metadata.trim() },
  define: {
    __PPBUI_LOGO__: JSON.stringify(logo),
    __PPBUI_POKE_PROFILE_ICON__: JSON.stringify(profileIcon),
  },
  sourcemap: false,
  minify: false,
  logLevel: "silent",
});
const bundleSha = await hash(bundlePath);
artifacts.push({ path: betterUiFile, sha256: bundleSha, bytes: (await stat(bundlePath)).size });

const provenancePaths = [
  "src/core/bootstrap.js",
  "src/modules/coupled-workspace/index.js",
  "src/modules/coupled-workspace/controller.js",
  "src/modules/coupled-workspace/cards.js",
  "scripts/build.mjs",
  "package.json",
  "userscript/metadata.txt",
];
const provenance = [];
for (const path of provenancePaths) provenance.push({ path, sha256: await hash(join(repo, path)) });
const manifest = {
  schemaVersion: 1,
  campaignId,
  hostExecutable: "PokePixelCoupledWorkspace.candidate.exe",
  sourceCommit: original.sourceCommit,
  createdAtUtc: new Date().toISOString(),
  artifactRootLayout: "repo-compatible; synthetic-only, host and Analyzer from pinned source tuple",
  syntheticCandidate: true,
  userValidation: "pending for this exact candidate",
  frozenHostSource: { campaignId: baselineId, manifestSha256: baselineManifestSha256, hostSha256: originalHostSha256 },
  hostBuildProvenance: original.hostBuildProvenance ?? null,
  analyzerSourceProvenance,
  featureSourceProvenance: provenance,
  artifacts,
};
const manifestPath = join(target, "tuple-manifest.json");
await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
console.log(`FROZEN FEATURE CANDIDATE: ${campaignId}`);
console.log(`HOST_SHA256: ${originalHostSha256}`);
console.log(`BETTER_UI_SHA256: ${bundleSha}`);
console.log(`ANALYZER_SHA256: ${artifacts.find(item => item.path === "dist/pokepixel-hunt-analyzer.embed.js").sha256}`);
console.log(`MANIFEST_SHA256: ${await hash(manifestPath)}`);
console.log(`MANIFEST: ${manifestPath}`);
