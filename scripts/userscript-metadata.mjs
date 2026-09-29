export function withUserscriptVersion(template, version) {
  const pattern = /^\/\/ @version[ \t]+\S+[^\r\n]*$/gm;
  const directives = [...template.matchAll(/^\/\/[ \t]*@version\b[^\r\n]*$/gm)];
  if (directives.length !== 1 || !pattern.test(directives[0]?.[0] || "") ||
      !/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error("Userscript metadata must have exactly one @version and a valid package version");
  }
  return template.replace(pattern, `// @version      ${version}`);
}
