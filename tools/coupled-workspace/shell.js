const splitRange = document.querySelector("#split-range");
const splitReset = document.querySelector("#split-reset");
const divider = document.querySelector("#divider");
const leftStatus = document.querySelector("#left-status");
const rightStatus = document.querySelector("#right-status");
const splitStorageKey = "ppbui:coupled-workspace:split:v1";

let currentSplit = 0.5;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateSplitUi(value) {
  currentSplit = clamp(Number(value) || 0.5, 0.2, 0.8);
  splitRange.value = String(Math.round(currentSplit * 100));
}

function commitSplit(value) {
  updateSplitUi(value);
  localStorage.setItem(splitStorageKey, String(currentSplit));
  window.workspaceApi.setSplit(currentSplit);
}

function setStatus(side, text, kind) {
  const node = side === "left" ? leftStatus : rightStatus;
  node.textContent = text;
  node.title = "";
  node.classList.remove("status-ok", "status-error");
  if (kind) node.classList.add(kind);
}

function applyPaneState(side, paneState) {
  if (!paneState) return;

  if (paneState.status === "loading") {
    setStatus(side, "Loading", null);
    return;
  }

  if (paneState.status === "loaded") {
    setStatus(side, "Loaded", "status-ok");
    return;
  }

  if (paneState.status === "error") {
    const node = side === "left" ? leftStatus : rightStatus;
    const code = Number.isFinite(Number(paneState.errorCode))
      ? ` ${paneState.errorCode}`
      : "";
    setStatus(side, `Load error${code}`, "status-error");
    node.title = [
      paneState.errorCode ?? "",
      paneState.errorDescription ?? "",
      paneState.url ?? "",
    ]
      .filter(Boolean)
      .join(" — ");
  }
}

function applyState(state) {
  if (!state) return;
  if (typeof state.splitRatio === "number") updateSplitUi(state.splitRatio);
  if (typeof state.dividerX === "number" && typeof state.dividerWidth === "number") {
    divider.style.left = `${state.dividerX}px`;
    divider.style.width = `${state.dividerWidth}px`;
  }

  if (state.extensionLoaded === true) {
    setStatus("left", "Loader ready", "status-ok");
    setStatus("right", "Loader ready", "status-ok");
  }

  applyPaneState("left", state.paneStates?.left);
  applyPaneState("right", state.paneStates?.right);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-side][data-action]");
  if (button) {
    window.workspaceApi.command(button.dataset.side, button.dataset.action);
    return;
  }

  const splitButton = event.target.closest("button[data-split]");
  if (splitButton) {
    commitSplit(Number(splitButton.dataset.split));
  }
});

splitRange.addEventListener("input", () => {
  commitSplit(Number(splitRange.value) / 100);
});

splitReset.addEventListener("click", () => {
  commitSplit(0.5);
});

window.workspaceApi.onState(applyState);
window.workspaceApi.getState().then((state) => {
  applyState(state);
  const savedSplit = Number(localStorage.getItem(splitStorageKey));
  if (Number.isFinite(savedSplit) && savedSplit >= 0.2 && savedSplit <= 0.8) {
    commitSplit(savedSplit);
  }
});
