const ROOT_SELECTOR = ".npc-evolution-window";
const FILTERS_SELECTOR = ".npc-evolution-filters";

export function findEvolutionCenter(doc = document) {
  return doc.querySelector(ROOT_SELECTOR);
}

export function findEvolutionModeSelect(root) {
  if (!root) return null;
  return [...root.querySelectorAll(`${FILTERS_SELECTOR} select`)].find(select => {
    const values = [...select.options].map(option => String(option.value || ""));
    return values.includes("") && values.includes("normal") && values.includes("mega") && !values.includes("shiny");
  }) || null;
}
