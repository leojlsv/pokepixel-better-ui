import css from "./styles.js";
import { findEvolutionModeSelect } from "./dom.js";

const MODE_VALUES = ["", "normal", "mega"];
const MODE_LABELS = new Map([
  ["", "All"],
  ["normal", "Normal"],
  ["mega", "Mega"],
]);

export function mountEvolutionCenter(root) {
  const doc = root.ownerDocument;
  const style = doc.createElement("style");
  style.dataset.ppbuiModule = "evolution-center";
  style.textContent = css;
  root.append(style);

  let active = true;
  let defaultApplied = false;
  let select = null;
  let group = null;
  let selectHadHidden = false;
  let selectMarker = null;

  const content = (node, value) => {
    const next = String(value ?? "");
    if (node.textContent !== next) node.textContent = next;
  };

  const releaseCurrent = () => {
    group?.remove();
    group = null;
    if (select?.isConnected) {
      if (selectHadHidden) select.setAttribute("hidden", "");
      else select.removeAttribute("hidden");
      if (selectMarker === null) select.removeAttribute("data-ppbui-evolution-mode-source");
      else select.setAttribute("data-ppbui-evolution-mode-source", selectMarker);
    }
    select = null;
    selectHadHidden = false;
    selectMarker = null;
  };

  const syncPressed = () => {
    if (!group || !select) return;
    for (const button of group.querySelectorAll("button[data-evolution-mode]")) {
      const pressed = button.dataset.evolutionMode === select.value;
      if (button.getAttribute("aria-pressed") !== String(pressed)) button.setAttribute("aria-pressed", String(pressed));
    }
  };

  const buildGroup = () => {
    const options = new Map([...select.options].map(option => [String(option.value || ""), option]));
    if (MODE_VALUES.some(value => !options.has(value))) return;
    group = doc.createElement("div");
    group.className = "ppbui-evolution-mode";
    group.dataset.ppbuiEvolutionMode = "";
    group.setAttribute("role", "group");
    const label = select.getAttribute("aria-label") || options.get("")?.textContent || "Evolution mode";
    group.setAttribute("aria-label", label);

    for (const value of MODE_VALUES) {
      const button = doc.createElement("button");
      button.type = "button";
      button.className = "pokeidle-btn ppbui-button ppbui-evolution-mode__button";
      button.dataset.evolutionMode = value;
      content(button, MODE_LABELS.get(value) || options.get(value)?.textContent || value);
      button.addEventListener("click", () => {
        if (!active || !select?.isConnected || select.value === value) return;
        select.value = value;
        select.dispatchEvent(new doc.defaultView.Event("change", { bubbles: true }));
        syncPressed();
      });
      group.append(button);
    }
    select.after(group);
    syncPressed();
  };

  const adopt = next => {
    releaseCurrent();
    select = next;
    selectHadHidden = select.hasAttribute("hidden");
    selectMarker = select.getAttribute("data-ppbui-evolution-mode-source");

    if (!defaultApplied) {
      defaultApplied = true;
      if (select.value !== "normal" && [...select.options].some(option => option.value === "normal")) {
        select.value = "normal";
        select.dispatchEvent(new doc.defaultView.Event("change", { bubbles: true }));
      }
    }

    select.dataset.ppbuiEvolutionModeSource = "";
    select.hidden = true;
    buildGroup();
  };

  const sync = () => {
    if (!active) return;
    const next = findEvolutionModeSelect(root);
    if (!next) {
      if (select && !select.isConnected) releaseCurrent();
      return;
    }
    if (next !== select || !group?.isConnected) adopt(next);
    else syncPressed();
  };

  const onChange = event => {
    if (event.target === select) syncPressed();
  };

  root.addEventListener("change", onChange);
  sync();

  return {
    sync,
    cleanup() {
      active = false;
      root.removeEventListener("change", onChange);
      releaseCurrent();
      style.remove();
    },
  };
}
