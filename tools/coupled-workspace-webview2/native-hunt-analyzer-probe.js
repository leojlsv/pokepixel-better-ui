(() => {
  const normalize = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const targetTerms = [
    "analisador de cacada",
    "hunt analyzer",
    "expandir",
    "expand",
  ];
  const containsTargetTerm = value => {
    const text = normalize(value);
    return targetTerms.some(term => text.includes(term));
  };
  const compactText = value => String(value || "").replace(/\s+/g, " ").trim().slice(0, 180);
  const attributeSnapshot = element => {
    const result = {};
    for (const attribute of element.attributes || []) {
      if (attribute.name === "id"
        || attribute.name === "class"
        || attribute.name === "role"
        || attribute.name.startsWith("aria-")
        || attribute.name.startsWith("data-")) {
        result[attribute.name] = compactText(attribute.value);
      }
    }
    return result;
  };
  const fingerprint = element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      tag: element.tagName.toLowerCase(),
      text: compactText(element.textContent),
      attributes: attributeSnapshot(element),
      display: style.display,
      visibility: style.visibility,
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      childCount: element.children.length,
    };
  };
  const nearestMatches = [...document.querySelectorAll("body *")].filter(element => {
    if (!containsTargetTerm(element.textContent)) return false;
    return ![...element.children].some(child => containsTargetTerm(child.textContent));
  });
  const report = nearestMatches.slice(0, 24).map(element => {
    const ancestors = [];
    let current = element.parentElement;
    for (let depth = 0; current && current !== document.body && depth < 5; depth += 1) {
      ancestors.push(fingerprint(current));
      current = current.parentElement;
    }
    return {
      match: fingerprint(element),
      ancestors,
    };
  });

  console.table(report.map((entry, index) => ({
    index,
    tag: entry.match.tag,
    text: entry.match.text,
    id: entry.match.attributes.id || "",
    class: entry.match.attributes.class || "",
    role: entry.match.attributes.role || "",
    dataMenuId: entry.match.attributes["data-menu-id"] || "",
    ariaLabel: entry.match.attributes["aria-label"] || "",
    width: entry.match.rect.width,
    height: entry.match.rect.height,
  })));
  console.log("PPBUI native Hunt Analyzer read-only probe", report);
  return report;
})();
