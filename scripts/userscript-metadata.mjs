export const PROD_UPDATE_URL =
  "https://github.com/leojlsv/pokepixel-better-ui/releases/latest/download/pokepixel-better-ui.meta.js";
export const PROD_DOWNLOAD_URL =
  "https://github.com/leojlsv/pokepixel-better-ui/releases/latest/download/pokepixel-better-ui.user.js";

export function withUserscriptVersion(template, version) {
  const pattern = /^\/\/ @version[ \t]+\S+[^\r\n]*$/gm;
  const directives = [...template.matchAll(/^\/\/[ \t]*@version\b[^\r\n]*$/gm)];
  if (directives.length !== 1 || !pattern.test(directives[0]?.[0] || "") ||
      !/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error("Userscript metadata must have exactly one @version and a valid package version");
  }
  return template.replace(pattern, `// @version      ${version}`);
}

export function userscriptMetadataBlock(source) {
  const startMarker = "// ==UserScript==";
  const endMarker = "// ==/UserScript==";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  if (start !== 0 || end < 0) {
    throw new Error("Userscript metadata block is missing or malformed");
  }
  return `${source.slice(0, end + endMarker.length).trimEnd()}\n`;
}
