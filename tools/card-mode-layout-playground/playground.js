import {
  BOXES,
  DEFAULT_LAYOUT,
  GRID_COLUMNS,
  GRID_ROWS,
  cloneLayout,
  layoutToCss,
  layoutToJson,
  parseLayoutJson,
  tryPlace,
  validateLayout,
} from "./layout-model.js";

const STORAGE_KEY = "ppbui:card-mode-layout-playground:v2";

const board = document.querySelector("[data-layout-board]");
const inspector = document.querySelector("[data-layout-inspector]");
const selectedName = document.querySelector("[data-selected-name]");
const status = document.querySelector("[data-layout-status]");
const jsonOutput = document.querySelector("[data-layout-json]");
const cssOutput = document.querySelector("[data-layout-css]");
const undoButton = document.querySelector("[data-layout-undo]");
const resetButton = document.querySelector("[data-layout-reset]");
const copyJsonButton = document.querySelector("[data-copy-json]");
const copyCssButton = document.querySelector("[data-copy-css]");

const preview = document.createElement("div");
preview.className = "placement-preview";
preview.hidden = true;

let layout = loadStoredLayout();
let selectedId = "hunt-summary";
let draggingId = null;
let dragOffset = { x: 0, y: 0 };
let undoStack = [];

function loadStoredLayout() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return cloneLayout(DEFAULT_LAYOUT);
    const parsed = parseLayoutJson(stored);
    return parsed.ok ? parsed.layout : cloneLayout(DEFAULT_LAYOUT);
  } catch {
    return cloneLayout(DEFAULT_LAYOUT);
  }
}

function persistLayout() {
  try {
    localStorage.setItem(STORAGE_KEY, layoutToJson(layout));
    return true;
  } catch {
    return false;
  }
}

function setStatus(message, error = false) {
  status.textContent = message;
  status.dataset.tone = error ? "error" : "ok";
}

function boxDefinition(id) {
  return BOXES.find(box => box.id === id);
}

function placementLabel(id) {
  const p = layout[id];
  return "Col " + p.x + " · Linha " + p.y + " · " + p.w + "×" + p.h;
}

function renderInspector() {
  const box = boxDefinition(selectedId);
  const p = layout[selectedId];
  selectedName.textContent = box.label;
  inspector.querySelector('[name="x"]').value = String(p.x);
  inspector.querySelector('[name="y"]').value = String(p.y);
  inspector.querySelector('[name="w"]').value = String(p.w);
  inspector.querySelector('[name="h"]').value = String(p.h);
}

function updateOutputs() {
  jsonOutput.value = layoutToJson(layout);
  cssOutput.value = layoutToCss(layout);
}

function updateSelectionStyles() {
  board.querySelectorAll("[data-box-id]").forEach(node => {
    const selected = node.dataset.boxId === selectedId;
    node.dataset.selected = String(selected);
    node.setAttribute("aria-pressed", String(selected));
  });
}

function selectBox(id) {
  if (!boxDefinition(id) || selectedId === id) return;
  selectedId = id;
  updateSelectionStyles();
  renderInspector();
}

function cellFromPointer(event) {
  const rect = board.getBoundingClientRect();
  if (!rect.width || !rect.height) return { x: 1, y: 1 };
  const relativeX = Math.max(0, Math.min(rect.width - 1, event.clientX - rect.left));
  const relativeY = Math.max(0, Math.min(rect.height - 1, event.clientY - rect.top));
  return {
    x: Math.floor(relativeX / (rect.width / GRID_COLUMNS)) + 1,
    y: Math.floor(relativeY / (rect.height / GRID_ROWS)) + 1,
  };
}

function dragCandidate(id, event) {
  const hovered = cellFromPointer(event);
  const current = layout[id];
  return {
    x: hovered.x - dragOffset.x,
    y: hovered.y - dragOffset.y,
    w: current.w,
    h: current.h,
  };
}

function showPreview(id, candidate) {
  const result = tryPlace(layout, id, candidate);
  preview.hidden = false;
  preview.dataset.valid = String(result.ok);
  preview.style.gridColumn = candidate.x + " / span " + candidate.w;
  preview.style.gridRow = candidate.y + " / span " + candidate.h;
  preview.setAttribute(
    "aria-label",
    result.ok ? "Destino válido" : "Destino inválido",
  );
  return result;
}

function hidePreview() {
  preview.hidden = true;
  delete preview.dataset.valid;
}

function pushUndo() {
  undoStack.push(cloneLayout(layout));
  if (undoStack.length > 50) undoStack.shift();
}

function commit(nextLayout) {
  const focusedBoxId = document.activeElement?.dataset?.boxId || null;
  pushUndo();
  layout = cloneLayout(nextLayout);
  const persisted = persistLayout();
  renderAll();
  if (focusedBoxId) {
    const focusedBox = [...board.querySelectorAll("[data-box-id]")]
      .find(node => node.dataset.boxId === focusedBoxId);
    focusedBox?.focus({ preventScroll: true });
  }
  return persisted;
}

function rejectMessage(result) {
  if (result.reason === "bounds")
    return "Alteração rejeitada: o box precisa ficar inteiro dentro da grade 4×6.";
  if (result.reason === "overlap") {
    const conflict = boxDefinition(result.conflictId);
    return "Alteração rejeitada: o destino sobrepõe " + (conflict?.label || "outro box") + ".";
  }
  return "Alteração rejeitada.";
}

function applyResult(result, successMessage) {
  if (!result.ok) {
    setStatus(rejectMessage(result), true);
    renderInspector();
    return false;
  }
  const persisted = commit(result.layout);
  setStatus(
    persisted ? successMessage : "Layout aplicado nesta sessão, mas não foi possível salvar localmente.",
    !persisted,
  );
  return true;
}

function renderBoard() {
  board.replaceChildren();

  for (let y = 1; y <= GRID_ROWS; y += 1) {
    for (let x = 1; x <= GRID_COLUMNS; x += 1) {
      const cell = document.createElement("div");
      cell.className = "grid-cell";
      cell.style.gridColumn = String(x);
      cell.style.gridRow = String(y);
      cell.setAttribute("aria-hidden", "true");
      const coordinate = document.createElement("span");
      coordinate.textContent = x + "," + y;
      cell.append(coordinate);
      board.append(cell);
    }
  }

  for (const box of BOXES) {
    const p = layout[box.id];
    const node = document.createElement("button");
    node.type = "button";
    node.className = "layout-box";
    node.draggable = true;
    node.dataset.boxId = box.id;
    node.dataset.selected = String(box.id === selectedId);
    node.style.gridColumn = p.x + " / span " + p.w;
    node.style.gridRow = p.y + " / span " + p.h;
    node.setAttribute("aria-pressed", String(box.id === selectedId));
    node.setAttribute(
      "aria-label",
      box.label + ". " + placementLabel(box.id) + ". Pressione Enter ou Espaço para selecionar.",
    );

    const title = document.createElement("strong");
    title.textContent = box.label;
    const description = document.createElement("span");
    description.textContent = box.description;
    const meta = document.createElement("small");
    meta.textContent = placementLabel(box.id);
    node.append(title, description, meta);

    node.addEventListener("click", () => selectBox(box.id));
    node.addEventListener("dragstart", event => {
      const origin = cellFromPointer(event);
      draggingId = box.id;
      dragOffset = {
        x: Math.max(0, Math.min(p.w - 1, origin.x - p.x)),
        y: Math.max(0, Math.min(p.h - 1, origin.y - p.y)),
      };
      selectedId = box.id;
      updateSelectionStyles();
      renderInspector();
      node.dataset.dragging = "true";
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", box.id);
    });
    node.addEventListener("dragend", () => {
      draggingId = null;
      dragOffset = { x: 0, y: 0 };
      hidePreview();
      delete node.dataset.dragging;
    });
    board.append(node);
  }

  board.append(preview);
}

board.addEventListener("dragover", event => {
  if (!draggingId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  showPreview(draggingId, dragCandidate(draggingId, event));
});

board.addEventListener("dragleave", event => {
  if (!board.contains(event.relatedTarget)) hidePreview();
});

board.addEventListener("drop", event => {
  if (!draggingId) return;
  event.preventDefault();
  const id = draggingId;
  const candidate = dragCandidate(id, event);
  const result = tryPlace(layout, id, candidate);
  draggingId = null;
  dragOffset = { x: 0, y: 0 };
  hidePreview();
  applyResult(result, "Box reposicionado.");
});

inspector.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(inspector);
  const result = tryPlace(layout, selectedId, {
    x: Number(data.get("x")),
    y: Number(data.get("y")),
    w: Number(data.get("w")),
    h: Number(data.get("h")),
  });
  applyResult(result, "Posição e span aplicados.");
});

undoButton.addEventListener("click", () => {
  const previous = undoStack.pop();
  if (!previous) return;
  layout = previous;
  const persisted = persistLayout();
  renderAll();
  setStatus(
    persisted ? "Última alteração desfeita." : "Alteração desfeita nesta sessão, mas não foi possível salvar localmente.",
    !persisted,
  );
});

resetButton.addEventListener("click", () => {
  const next = cloneLayout(DEFAULT_LAYOUT);
  if (JSON.stringify(next) === JSON.stringify(layout)) {
    setStatus("A grade já está no layout inicial.");
    return;
  }
  const persisted = commit(next);
  selectedId = "hunt-summary";
  renderAll();
  setStatus(
    persisted ? "Layout inicial restaurado." : "Layout inicial restaurado nesta sessão, mas não foi possível salvar localmente.",
    !persisted,
  );
});

async function copyText(value, label) {
  try {
    await navigator.clipboard.writeText(value);
    setStatus(label + " copiado.");
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = value;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    document.body.append(fallback);
    fallback.select();
    const copied = document.execCommand("copy");
    fallback.remove();
    setStatus(copied ? label + " copiado." : "Não foi possível copiar automaticamente.", !copied);
  }
}

copyJsonButton.addEventListener("click", () => copyText(jsonOutput.value, "JSON"));
copyCssButton.addEventListener("click", () => copyText(cssOutput.value, "CSS"));

function renderAll() {
  if (!validateLayout(layout).ok) layout = cloneLayout(DEFAULT_LAYOUT);
  renderBoard();
  renderInspector();
  updateOutputs();
  undoButton.disabled = undoStack.length === 0;
}

renderAll();
setStatus("Selecione um box, arraste para mover ou edite posição e span no painel.");
