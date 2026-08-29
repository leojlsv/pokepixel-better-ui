import { findExampleRoot, findOwnedExampleNode } from "./dom.js";

export function mountExample() {
  const root = findExampleRoot();
  if (!root || findOwnedExampleNode()) return;

  const marker = document.createElement("div");
  marker.dataset.ppbuiModule = "example";
  marker.hidden = true;
  root.append(marker);

  return () => marker.remove();
}
