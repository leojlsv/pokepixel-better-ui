import { teamPresetsConfig as config } from "./config.js";
import { teamPresetVisualReader, teamPresetsText } from "./dom.js";
import { mountTeamPresetComposer } from "./composer.js";

function errorMessage(copy, result, preset) {
  if (result?.reason === "member-unavailable" && result.missingIds?.length) {
    const missing = result.missingIds.map(id => preset.members.find(member => member.id === id)?.name || id).join(", ");
    return `${copy.errors[result.reason]} ${missing}`;
  }
  return copy.errors[result?.reason] || result?.reason || copy.errors["final-state-mismatch"];
}

const actionButton = (doc, label, title = label, className = "") => {
  const button = doc.createElement("button"); button.type = "button"; button.className = `pokeidle-btn ppbui-button ${className}`.trim(); button.textContent = label;
  if (title) { button.title = title; button.setAttribute("aria-label", title); }
  return button;
};

const directionButton = (doc, direction, title) => {
  const button = actionButton(doc, "", title, "ppbui-icon-button ppbui-team-preset-direction");
  button.dataset.direction = direction;
  return button;
};

export function mountTeamPresetManager(root, { store, hudRoot, apply, capture, runExclusive, onChange } = {}) {
  const doc = root.ownerDocument, win = doc.defaultView;
  const style = doc.createElement("style"); style.dataset.ppbuiModule = `${config.id}-manager`;
  style.textContent = `
    .pokeidle-team-panel:has([data-ppbui-team-preset-manager]) { min-width:min(340px,calc(100vw - 16px))!important; }
    [data-ppbui-team-preset-manager] { grid-column:1/-1; align-self:stretch; box-sizing:border-box; width:100%!important; max-width:none!important; margin:var(--ppbui-space-2) 0 0!important; padding:0!important; overflow:hidden; border:var(--ppbui-separator-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-1)!important; color:var(--ppbui-text); font:var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body); box-shadow:none!important; }
    [data-ppbui-team-preset-manager][data-empty="true"] { padding:0; }
    [data-ppbui-team-preset-manager] > summary { min-height:var(--ppbui-control-height); padding:var(--ppbui-space-2) var(--ppbui-space-3); cursor:pointer; color:var(--ppbui-text); font-weight:700; }
    [data-ppbui-team-preset-manager] > summary:focus-visible { outline:var(--ppbui-border-width) solid var(--ppbui-focus); outline-offset:var(--ppbui-pixel-unit); }
    [data-ppbui-team-preset-manager-grid] { display:grid; box-sizing:border-box; width:100%; grid-template-columns:minmax(0,1fr); gap:0; margin-top:0; }
    [data-ppbui-team-preset-manager][data-empty="true"] [data-ppbui-team-preset-manager-grid] { margin-top:0; }
    [data-ppbui-team-preset-empty] { grid-column:1/-1; margin:0; padding:var(--ppbui-space-2) var(--ppbui-space-3); border-top:var(--ppbui-separator-width) solid var(--ppbui-border); color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-meta); line-height:var(--ppbui-line-height-meta); }
    [data-ppbui-team-preset-card] { container-type:inline-size; container-name:ppbui-team-preset-card; box-sizing:border-box; width:100%; min-width:0; max-width:none; display:grid; gap:0; padding:0; border:0; border-top:var(--ppbui-separator-width) solid var(--ppbui-border); border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-1); color:var(--ppbui-text); box-shadow:none!important; }
    [data-ppbui-team-preset-manager] :where(button,input,select,textarea) { border-radius:var(--ppbui-radius)!important; }
    [data-ppbui-team-preset-manager] > summary { border-radius:var(--ppbui-radius)!important; }
    [data-ppbui-team-preset-card-head], [data-ppbui-team-preset-card-foot], [data-ppbui-team-preset-card-meta] { display:flex; align-items:center; gap:var(--ppbui-space-2); min-width:0; }
    [data-ppbui-team-preset-card-head] { align-items:end; flex-wrap:nowrap; padding:var(--ppbui-space-3); }
    [data-ppbui-team-preset-card-body][hidden] { display:none!important; }
    [data-ppbui-team-preset-name-field] { flex:1 1 auto; min-width:110px; }
    [data-ppbui-team-preset-name-field] > span { color:var(--ppbui-text-subtle); font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-data); }
    .pokeidle-team-panel [data-ppbui-team-preset-manager] input.game-window__search.ppbui-input,
    .pokeidle-team-panel [data-ppbui-team-preset-manager] select.game-window__select.ppbui-select { -webkit-appearance:none!important; appearance:none!important; box-sizing:border-box!important; width:100%!important; height:var(--ppbui-control-height)!important; min-height:var(--ppbui-control-height)!important; margin:0!important; padding:0 var(--ppbui-control-padding-x)!important; border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-0)!important; background-image:none!important; clip-path:none!important; color:var(--ppbui-text)!important; box-shadow:none!important; filter:none!important; font:400 var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important; text-shadow:none!important; transition:none!important; transform:none!important; }
    .pokeidle-team-panel [data-ppbui-team-preset-manager] input.game-window__search.ppbui-input::placeholder { color:var(--ppbui-text-subtle)!important; opacity:1; }
    .pokeidle-team-panel [data-ppbui-team-preset-manager] input.game-window__search.ppbui-input::-webkit-search-decoration,
    .pokeidle-team-panel [data-ppbui-team-preset-manager] input.game-window__search.ppbui-input::-webkit-search-cancel-button { -webkit-appearance:none!important; appearance:none!important; }
    .pokeidle-team-panel [data-ppbui-team-preset-manager] input.game-window__search.ppbui-input:focus,
    .pokeidle-team-panel [data-ppbui-team-preset-manager] select.game-window__select.ppbui-select:focus { border-color:var(--ppbui-border-strong)!important; outline:none!important; }
    .pokeidle-team-panel [data-ppbui-team-preset-manager] input.game-window__search.ppbui-input:focus-visible,
    .pokeidle-team-panel [data-ppbui-team-preset-manager] select.game-window__select.ppbui-select:focus-visible { outline:var(--ppbui-border-width) solid var(--ppbui-focus)!important; outline-offset:var(--ppbui-pixel-unit); }
    .pokeidle-team-panel [data-ppbui-team-preset-manager] [data-ppbui-team-preset-name-field] > input.game-window__search.ppbui-input,
    .pokeidle-team-panel [data-ppbui-team-preset-manager] [data-ppbui-team-preset-composer-name] > input.game-window__search.ppbui-input { border-color:var(--ppbui-accent)!important; }
    [data-ppbui-team-preset-card-actions] { flex:0 0 auto; flex-wrap:nowrap; gap:var(--ppbui-space-2); }
    [data-ppbui-team-preset-card-foot] > [data-ppbui-team-preset-card-actions] > button::before,
    [data-ppbui-team-preset-card-foot] > [data-ppbui-team-preset-card-actions] > button::after { display:none!important; content:none!important; }
    [data-ppbui-team-preset-card] .ppbui-team-preset-direction { position:relative; }
    [data-ppbui-team-preset-card] .ppbui-team-preset-direction::before { box-sizing:border-box; width:8px; height:8px; border-right:2px solid currentColor; border-bottom:2px solid currentColor; content:""; }
    [data-ppbui-team-preset-card] .ppbui-team-preset-direction[data-direction="up"]::before { transform:rotate(225deg) translate(-1px,-1px); }
    [data-ppbui-team-preset-card] .ppbui-team-preset-direction[data-direction="down"]::before { transform:rotate(45deg) translate(-1px,-1px); }
    [data-ppbui-team-preset-card] .ppbui-team-preset-direction[data-direction="left"]::before { transform:rotate(135deg) translate(-1px,-1px); }
    [data-ppbui-team-preset-card] .ppbui-team-preset-direction[data-direction="right"]::before { transform:rotate(-45deg) translate(-1px,-1px); }
    [data-ppbui-team-preset-card] .ppbui-team-preset-collapse { position:relative; align-self:end; }
    [data-ppbui-team-preset-card] .ppbui-team-preset-collapse::before { box-sizing:border-box; width:8px; height:8px; border-right:2px solid currentColor; border-bottom:2px solid currentColor; content:""; transform:rotate(45deg) translate(-1px,-1px); }
    [data-ppbui-team-preset-card] .ppbui-team-preset-collapse[data-collapsed="true"]::before { transform:rotate(-45deg) translate(-1px,-1px); }
    [data-ppbui-team-preset-card] .ppbui-team-preset-delete { position:relative; margin-left:var(--ppbui-space-5); border-color:var(--ppbui-danger-text)!important; color:var(--ppbui-danger-text)!important; }
    [data-ppbui-team-preset-card] .ppbui-team-preset-delete::before,
    [data-ppbui-team-preset-card] .ppbui-team-preset-delete::after { position:absolute; width:12px; height:2px; background:currentColor; content:""; }
    [data-ppbui-team-preset-card] .ppbui-team-preset-delete::before { transform:rotate(45deg); }
    [data-ppbui-team-preset-card] .ppbui-team-preset-delete::after { transform:rotate(-45deg); }
    [data-ppbui-team-preset-card-meta] { justify-content:space-between; padding:0 var(--ppbui-space-3) var(--ppbui-space-2); color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-meta); }
    [data-ppbui-team-preset-active-name] { min-width:0; overflow:hidden; color:var(--ppbui-success-text); text-overflow:ellipsis; white-space:nowrap; }
    [data-ppbui-team-preset-members] { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:0; align-items:start; min-width:0; }
    [data-ppbui-team-preset-member] { display:grid; min-width:0; color:var(--ppbui-text); }
    [data-ppbui-team-preset-member-visual].ppbui-pokemon-card--preset { min-width:0; width:100%!important; min-height:44px!important; height:44px!important; margin:0; cursor:pointer; border-width:var(--ppbui-separator-width)!important; }
    [data-ppbui-team-preset-member] + [data-ppbui-team-preset-member] [data-ppbui-team-preset-member-visual].ppbui-pokemon-card--preset { border-left:0!important; }
    [data-ppbui-team-preset-member-visual] .ppbui-pokemon-card__visual img { display:block; object-fit:contain; image-rendering:pixelated; }
    [data-ppbui-team-preset-member-fallback] { overflow:hidden; max-width:100%; color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-meta); text-align:center; text-overflow:ellipsis; white-space:nowrap; }
    [data-ppbui-team-preset-member][data-empty="true"] [data-ppbui-team-preset-member-visual] { cursor:default; background:var(--ppbui-bg-0)!important; }
    [data-ppbui-team-preset-member-controls] { display:flex; flex:0 0 auto; align-items:center; gap:var(--ppbui-space-1); min-width:0; }
    [data-ppbui-team-preset-member-controls] > button[data-active-control="true"][data-current="true"]:disabled { border:var(--ppbui-separator-width) solid var(--ppbui-success)!important; background:var(--ppbui-bg-1)!important; color:var(--ppbui-success-text)!important; box-shadow:none!important; filter:none!important; opacity:1!important; }
    [data-ppbui-team-preset-card-foot] { display:flex; flex-wrap:wrap; align-items:center; gap:var(--ppbui-space-3); min-width:0; padding:var(--ppbui-space-3); border-top:var(--ppbui-separator-width) solid var(--ppbui-border); }
    [data-ppbui-team-preset-card-foot] > [data-ppbui-team-preset-card-actions] { display:flex; flex:0 0 auto; flex-wrap:nowrap; justify-content:flex-end; gap:var(--ppbui-space-2); margin-left:auto; }
    [data-ppbui-team-preset-review] { margin:0; color:var(--ppbui-warning); font-size:var(--ppbui-font-size-meta); font-weight:700; }
    [data-ppbui-team-preset-card-status] { margin:0; padding:0 var(--ppbui-space-3) var(--ppbui-space-2); color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-meta); }
    [data-ppbui-team-preset-card-status]:empty { display:none; }
    [data-ppbui-team-preset-card-status][data-error="true"] { color:var(--ppbui-danger-text); font-weight:700; }
    [data-ppbui-team-preset-manager-status] { margin:0; padding:var(--ppbui-space-2) var(--ppbui-space-3); border-top:var(--ppbui-separator-width) solid var(--ppbui-border); color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-meta); }
    [data-ppbui-team-preset-manager-status]:empty { display:none; }
    [data-ppbui-team-preset-manager-status][data-error="true"] { color:var(--ppbui-danger-text); font-weight:700; }
    .pokeidle-team-panel:has([data-ppbui-team-preset-manager]) > .pokeidle-panel__body,
    [data-ppbui-team-preset-manager], [data-ppbui-team-preset-manager] * { scrollbar-width:auto!important; scrollbar-color:var(--ppbui-scrollbar-thumb) var(--ppbui-scrollbar-track)!important; }
    .pokeidle-team-panel:has([data-ppbui-team-preset-manager]) > .pokeidle-panel__body::-webkit-scrollbar,
    [data-ppbui-team-preset-manager]::-webkit-scrollbar, [data-ppbui-team-preset-manager] *::-webkit-scrollbar { width:var(--ppbui-scrollbar-size)!important; height:var(--ppbui-scrollbar-size)!important; }
    .pokeidle-team-panel:has([data-ppbui-team-preset-manager]) > .pokeidle-panel__body::-webkit-scrollbar-track,
    [data-ppbui-team-preset-manager]::-webkit-scrollbar-track, [data-ppbui-team-preset-manager] *::-webkit-scrollbar-track { border:var(--ppbui-separator-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-scrollbar-track)!important; box-shadow:none!important; }
    .pokeidle-team-panel:has([data-ppbui-team-preset-manager]) > .pokeidle-panel__body::-webkit-scrollbar-thumb,
    [data-ppbui-team-preset-manager]::-webkit-scrollbar-thumb, [data-ppbui-team-preset-manager] *::-webkit-scrollbar-thumb { border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-scrollbar-thumb)!important; background-clip:border-box!important; box-shadow:none!important; }
    .pokeidle-team-panel:has([data-ppbui-team-preset-manager]) > .pokeidle-panel__body::-webkit-scrollbar-thumb:hover,
    [data-ppbui-team-preset-manager]::-webkit-scrollbar-thumb:hover, [data-ppbui-team-preset-manager] *::-webkit-scrollbar-thumb:hover { background:var(--ppbui-scrollbar-thumb-hover)!important; }
    .pokeidle-team-panel:has([data-ppbui-team-preset-manager]) > .pokeidle-panel__body::-webkit-scrollbar-corner,
    [data-ppbui-team-preset-manager]::-webkit-scrollbar-corner, [data-ppbui-team-preset-manager] *::-webkit-scrollbar-corner { border-radius:var(--ppbui-radius)!important; background:var(--ppbui-scrollbar-track)!important; }
    .pokeidle-team-panel:has([data-ppbui-team-preset-manager]) > .pokeidle-panel__body::-webkit-scrollbar-button,
    [data-ppbui-team-preset-manager]::-webkit-scrollbar-button, [data-ppbui-team-preset-manager] *::-webkit-scrollbar-button { display:none!important; width:0!important; height:0!important; }
    @supports selector(::-webkit-scrollbar) {
      .pokeidle-team-panel:has([data-ppbui-team-preset-manager]) > .pokeidle-panel__body,
      [data-ppbui-team-preset-manager], [data-ppbui-team-preset-manager] * { scrollbar-color:auto!important; }
    }
    @media (pointer:coarse) {
      [data-ppbui-team-preset-manager] > summary { min-height:40px; }
      [data-ppbui-team-preset-card] .ppbui-icon-button { width:40px; min-width:40px; height:40px; min-height:40px; }
    }
  `;

  const details = doc.createElement("details"); details.className = "ppbui-root"; details.dataset.ppbuiModule = config.id; details.dataset.ppbuiTeamPresetManager = "";
  const summary = doc.createElement("summary"), grid = doc.createElement("div"), status = doc.createElement("p");
  grid.dataset.ppbuiTeamPresetManagerGrid = ""; status.dataset.ppbuiTeamPresetManagerStatus = ""; status.setAttribute("aria-live", "polite");
  details.append(summary, grid, status); root.append(style);
  let renderedPresets = null, readVisual, confirmingDelete = false, managerBusy = false, disposed = false, composer = null;
  let guardedPanel = null, guardedBody = null, guardedClearBody = null, guardedAppendChild = null;
  let originalClearBody = null, originalAppendChild = null, panelHadOwnClearBody = false, bodyHadOwnAppendChild = false;
  const selections = new Map(), cardMessages = new Map(), collapsedPresets = new Set();

  function nativeTeamPanel() {
    const body = root.querySelector(config.selectors.teamBody), view = doc.defaultView;
    if (!body) return null;
    let cached = [];
    try { cached = view?.PokeIdle?.ReactiveWindows?.cached?.() || []; } catch { cached = []; }
    const scenes = [...(Array.isArray(cached) ? cached : []), view?.SceneManager?._scene].filter(Boolean);
    return scenes.map(scene => scene?._panel).find(panel => panel?.body === body && typeof panel?.clearBody === "function") || null;
  }

  function releaseNativeBodyGuard() {
    if (guardedPanel && guardedPanel.clearBody === guardedClearBody) {
      if (panelHadOwnClearBody) guardedPanel.clearBody = originalClearBody;
      else delete guardedPanel.clearBody;
    }
    if (guardedBody && guardedBody.appendChild === guardedAppendChild) {
      if (bodyHadOwnAppendChild) guardedBody.appendChild = originalAppendChild;
      else delete guardedBody.appendChild;
    }
    guardedPanel = guardedBody = guardedClearBody = guardedAppendChild = null;
    originalClearBody = originalAppendChild = null; panelHadOwnClearBody = bodyHadOwnAppendChild = false;
  }

  function syncNativeBodyGuard() {
    const panel = nativeTeamPanel(), body = panel?.body || null;
    if (!panel || !body) return releaseNativeBodyGuard();
    if (guardedPanel === panel && guardedBody === body && panel.clearBody === guardedClearBody && body.appendChild === guardedAppendChild) return;
    releaseNativeBodyGuard();
    guardedPanel = panel; guardedBody = body;
    panelHadOwnClearBody = Object.prototype.hasOwnProperty.call(panel, "clearBody");
    bodyHadOwnAppendChild = Object.prototype.hasOwnProperty.call(body, "appendChild");
    originalClearBody = panel.clearBody; originalAppendChild = body.appendChild;
    // Native Scene_Team.refresh() clears the whole panel body with innerHTML="".
    // Saved Teams is an owned interactive island inside that body, so letting the
    // native clear detach it destroys browser focus/caret before reconciliation can
    // reattach the same node. Keep the island connected and make native direct body
    // appends land before it, preserving the validated visual position and interaction.
    guardedClearBody = function ppbuiPreserveSavedTeams() {
      if (details.parentNode !== body) return originalClearBody.call(this);
      for (const node of [...body.childNodes]) if (node !== details) node.remove();
    };
    guardedAppendChild = function ppbuiAppendBeforeSavedTeams(node) {
      if (this === body && details.parentNode === body && node !== details) return body.insertBefore(node, details);
      return originalAppendChild.call(this, node);
    };
    panel.clearBody = guardedClearBody;
    body.appendChild = guardedAppendChild;
  }

  function ensureMounted() {
    if (details.isConnected && root.contains(details)) return;
    const profile = root.querySelector(config.selectors.teamProfile), roster = root.querySelector(config.selectors.teamRoster), body = root.querySelector(config.selectors.teamBody);
    if (profile) profile.after(details); else if (roster) roster.after(details); else body?.append(details);
  }

  const text = () => teamPresetsText(doc);
  function setStatus(message = "", error = false) {
    if (status.textContent !== message) status.textContent = message;
    const value = error ? "true" : "false"; if (status.dataset.error !== value) status.dataset.error = value;
  }
  function cardNode(id) { return [...grid.querySelectorAll("[data-ppbui-team-preset-card]")].find(node => node.dataset.presetId === String(id)); }
  function setCardMessage(id, message = "", error = false) {
    if (message) cardMessages.set(String(id), { message, error }); else cardMessages.delete(String(id));
    const node = cardNode(id)?.querySelector("[data-ppbui-team-preset-card-status]");
    if (!node) return;
    if (node.textContent !== message) node.textContent = message;
    const value = error ? "true" : "false"; if (node.dataset.error !== value) node.dataset.error = value;
  }
  async function runManagerOperation(preset, trigger, pendingLabel, task) {
    if (managerBusy || disposed) return { ok: false, reason: managerBusy ? "busy" : "disposed" };
    managerBusy = true; details.setAttribute("aria-busy", "true"); trigger.setAttribute("aria-busy", "true");
    const previousLabel = trigger.textContent, disabled = new Map();
    for (const node of details.querySelectorAll("button,input")) { disabled.set(node, node.disabled); node.disabled = true; }
    trigger.textContent = pendingLabel;
    try { return await (runExclusive ? runExclusive(task) : task()); }
    catch (error) { return { ok: false, reason: error?.message || "unexpected-error" }; }
    finally {
      managerBusy = false; details.removeAttribute("aria-busy");
      for (const [node, value] of disabled) if (node.isConnected) node.disabled = value;
      if (trigger.isConnected) { trigger.removeAttribute("aria-busy"); trigger.textContent = previousLabel; }
    }
  }
  function changed() { if (disposed) return; renderedPresets = null; onChange?.(); render(true); syncSummary(); composer?.sync(); }

  async function execute(preset, trigger, task) {
    const copy = text(); setCardMessage(preset.id, copy.applying);
    const result = await runManagerOperation(preset, trigger, copy.applyingAction, task);
    if (disposed) return result;
    setCardMessage(preset.id, result?.ok ? copy.applied : errorMessage(copy, result, preset), !result?.ok);
    sync(); return result;
  }

  async function confirmDelete(preset, trigger) {
    if (confirmingDelete || disposed) return;
    const copy = text(), dialog = win?.PokeIdle?.Dialog;
    if (!dialog?.confirm) return setStatus(copy.errors["confirmation-unavailable"], true);
    confirmingDelete = true;
    try {
      const confirmed = await dialog.confirm(copy.deleteConfirm, { title: copy.remove, hint: preset.name, acceptLabel: copy.remove, danger: true });
      if (confirmed === true && !disposed && root.isConnected && store.remove(preset.id)) changed();
    } catch {
      if (!disposed) setStatus(copy.errors["confirmation-unavailable"], true);
    } finally {
      confirmingDelete = false;
      if (!disposed && trigger.isConnected) trigger.focus({ preventScroll: true });
    }
  }

  function samePresets(next) {
    const equalFields = (left, right, fields) => fields.every(key => left[key] === right[key]);
    return renderedPresets?.length === next.length && next.every((preset, index) => {
      const previous = renderedPresets[index];
      return equalFields(preset, previous, ["id", "name", "activeId", "orderVerified", "updatedAt"])
        && preset.members.length === previous.members.length
        && preset.members.every((member, i) => equalFields(member, previous.members[i], ["id", "name", "level", "sprite"]));
    });
  }

  function memberCell(preset, member, index, copy, select) {
    const visual = readVisual(member), levelText = Number.isFinite(Number(member.level)) ? `Lv.${member.level}` : "";
    const label = `${index + 1}. ${member.name}${levelText ? ` · ${levelText}` : ""}${preset.activeId === member.id ? ` · ${copy.active}` : ""}`;
    const cell = doc.createElement("div"); cell.dataset.ppbuiTeamPresetMember = ""; cell.dataset.active = String(preset.activeId === member.id); cell.title = label; cell.setAttribute("aria-label", label);
    const visualBox = doc.createElement("button"); visualBox.type = "button"; visualBox.className = "ppbui-pokemon-card ppbui-pokemon-card--preset"; visualBox.classList.toggle("ppbui-pokemon-card--active", preset.activeId === member.id); visualBox.dataset.ppbuiTeamPresetMemberVisual = ""; visualBox.setAttribute("aria-label", label); visualBox.setAttribute("aria-pressed", "false"); visualBox.addEventListener("click", () => select(member.id));
    if (visual.elementColor) visualBox.style.setProperty("--ppbui-pokemon-card-accent", visual.elementColor);
    const position = doc.createElement("span"); position.className = "ppbui-pokemon-card__position"; position.dataset.ppbuiTeamPresetMemberPosition = ""; position.textContent = String(index + 1);
    const visualHost = doc.createElement("span"); visualHost.className = "ppbui-pokemon-card__visual";
    if (visual.sprite) {
      const img = doc.createElement("img"); img.src = visual.sprite; img.alt = member.name;
      img.addEventListener("error", () => { if (!img.isConnected) return; const fallback = doc.createElement("span"); fallback.dataset.ppbuiTeamPresetMemberFallback = ""; fallback.textContent = member.name; img.replaceWith(fallback); }, { once:true });
      visualHost.append(img);
    }
    else { const fallback = doc.createElement("span"); fallback.dataset.ppbuiTeamPresetMemberFallback = ""; fallback.textContent = member.name; visualHost.append(fallback); }
    visualBox.append(position, visualHost);
    cell.append(visualBox); return cell;
  }

  function emptyMemberCell(index) {
    const cell = doc.createElement("div"); cell.dataset.ppbuiTeamPresetMember = ""; cell.dataset.empty = "true";
    const visualBox = doc.createElement("span"); visualBox.className = "ppbui-pokemon-card ppbui-pokemon-card--preset"; visualBox.dataset.ppbuiTeamPresetMemberVisual = ""; visualBox.setAttribute("aria-label", `${index + 1}. —`);
    const position = doc.createElement("span"); position.className = "ppbui-pokemon-card__position"; position.dataset.ppbuiTeamPresetMemberPosition = ""; position.textContent = String(index + 1);
    const visualHost = doc.createElement("span"); visualHost.className = "ppbui-pokemon-card__visual"; visualBox.append(position, visualHost); cell.append(visualBox); return cell;
  }

  function render(resolveSprites = false, retryMissing = false) {
    const presets = store.list();
    if (!resolveSprites && samePresets(presets)) return;
    for (const id of selections.keys()) if (!presets.some(preset => preset.id === id)) selections.delete(id);
    for (const id of cardMessages.keys()) if (!presets.some(preset => String(preset.id) === id)) cardMessages.delete(id);
    for (const id of collapsedPresets) if (!presets.some(preset => String(preset.id) === id)) collapsedPresets.delete(id);
    renderedPresets = presets;
    readVisual = teamPresetVisualReader(hudRoot, { resolveSprites, retryMissing });
    const copy = text(); grid.replaceChildren(); details.dataset.empty = String(!presets.length);
    if (!presets.length) { const empty = doc.createElement("p"); empty.dataset.ppbuiTeamPresetEmpty = ""; empty.textContent = copy.empty; grid.append(empty); return; }
    presets.forEach((preset, presetIndex) => {
      const card = doc.createElement("section"); card.dataset.ppbuiTeamPresetCard = ""; card.dataset.presetId = String(preset.id);
      const head = doc.createElement("div"); head.dataset.ppbuiTeamPresetCardHead = "";
      const collapsed = collapsedPresets.has(String(preset.id));
      const collapse = actionButton(doc, "", collapsed ? `${copy.expandTeam}: ${preset.name}` : `${copy.collapseTeam}: ${preset.name}`, "ppbui-icon-button ppbui-team-preset-collapse");
      collapse.dataset.ppbuiTeamPresetCollapse = ""; collapse.dataset.collapsed = String(collapsed); collapse.setAttribute("aria-expanded", String(!collapsed));
      const nameField = doc.createElement("label"); nameField.className = "ppbui-field"; nameField.dataset.ppbuiTeamPresetNameField = "";
      const nameLabel = doc.createElement("span"); nameLabel.textContent = copy.presetName;
      const rename = doc.createElement("input"); rename.type = "text"; rename.name = `ppbui-team-preset-rename-${preset.id}`; rename.maxLength = 40; rename.className = "game-window__search ppbui-input"; rename.value = preset.name; rename.setAttribute("aria-label", copy.presetName);
      nameField.append(nameLabel, rename);
      const headActions = doc.createElement("div"); headActions.dataset.ppbuiTeamPresetCardActions = ""; headActions.className = "ppbui-action-row";
      const up = directionButton(doc, "up", copy.moveUp); up.disabled = presetIndex === 0;
      const down = directionButton(doc, "down", copy.moveDown); down.disabled = presetIndex === presets.length - 1;
      const edit = actionButton(doc, copy.editManual, `${copy.editManual}: ${preset.name}`, "ppbui-button--compact"); edit.dataset.ppbuiTeamPresetEdit = "";
      const remove = actionButton(doc, "", `${copy.remove}: ${preset.name}`, "ppbui-icon-button ppbui-team-preset-delete ppbui-button--danger");
      rename.addEventListener("change", () => {
        if (disposed) return;
        const attemptedName = rename.value;
        if (!store.rename(preset.id, attemptedName)) { rename.value = preset.name; setCardMessage(preset.id, attemptedName.trim() ? copy.renameFailed : copy.nameRequired, true); }
        else { setCardMessage(preset.id); changed(); }
      });
      up.addEventListener("click", () => { if (disposed) return; if (store.movePreset(preset.id, -1)) changed(); }); down.addEventListener("click", () => { if (disposed) return; if (store.movePreset(preset.id, 1)) changed(); });
      edit.addEventListener("click", () => { if (!disposed) composer?.edit?.(preset, edit); });
      remove.addEventListener("click", () => confirmDelete(preset, remove));
      if (presets.length > 1) headActions.append(up, down);
      headActions.append(edit, remove); head.append(collapse, nameField, headActions);

      const activeMember = preset.members.find(member => member.id === preset.activeId);
      const meta = doc.createElement("div"); meta.dataset.ppbuiTeamPresetCardMeta = "";
      const count = doc.createElement("span"); count.textContent = `${preset.members.length}/6`;
      const activeName = doc.createElement("span"); activeName.dataset.ppbuiTeamPresetActiveName = ""; activeName.textContent = `${copy.active}: ${activeMember?.name || "—"}`; activeName.title = activeName.textContent;
      meta.append(count, activeName);

      const body = doc.createElement("div"); body.dataset.ppbuiTeamPresetCardBody = ""; body.id = `ppbui-team-preset-body-${presetIndex}`; body.hidden = collapsed; collapse.setAttribute("aria-controls", body.id);
      collapse.addEventListener("click", () => {
        if (disposed) return;
        const next = !collapsedPresets.has(String(preset.id));
        next ? collapsedPresets.add(String(preset.id)) : collapsedPresets.delete(String(preset.id));
        body.hidden = next; collapse.dataset.collapsed = String(next); collapse.setAttribute("aria-expanded", String(!next));
        const label = next ? `${copy.expandTeam}: ${preset.name}` : `${copy.collapseTeam}: ${preset.name}`; collapse.title = label; collapse.setAttribute("aria-label", label);
      });

      const members = doc.createElement("div"); members.dataset.ppbuiTeamPresetMembers = "";
      const controls = doc.createElement("div"); controls.dataset.ppbuiTeamPresetMemberControls = "";
      const left = directionButton(doc, "left", copy.moveLeft), active = actionButton(doc, copy.setActive, copy.setActive), right = directionButton(doc, "right", copy.moveRight);
      active.dataset.activeControl = "true";
      function select(id) {
        if (disposed) return;
        selections.set(preset.id, id);
        const index = preset.members.findIndex(member => member.id === id), member = preset.members[index];
        const isCurrent = id === preset.activeId;
        left.disabled = index === 0; right.disabled = index === preset.members.length - 1; active.disabled = isCurrent;
        active.dataset.current = String(isCurrent);
        active.classList.toggle("ppbui-button--primary", !isCurrent);
        active.textContent = isCurrent ? copy.active : copy.setActive;
        active.title = isCurrent ? `${copy.active}: ${member.name}` : `${copy.setActive}: ${member.name}`;
        left.setAttribute("aria-label", `${left.title}: ${member.name}`); right.setAttribute("aria-label", `${right.title}: ${member.name}`); active.setAttribute("aria-label", active.title);
        [...members.children].forEach((cell, i) => cell.firstChild.setAttribute("aria-pressed", String(i === index)));
      }
      left.addEventListener("click", () => { if (disposed) return; if (store.moveMember(preset.id, selections.get(preset.id), -1)) changed(); });
      right.addEventListener("click", () => { if (disposed) return; if (store.moveMember(preset.id, selections.get(preset.id), 1)) changed(); });
      active.addEventListener("click", () => { if (disposed) return; if (store.setActive(preset.id, selections.get(preset.id))) changed(); });
      for (let index = 0; index < 6; index += 1) {
        const member = preset.members[index]; members.append(member ? memberCell(preset, member, index, copy, select) : emptyMemberCell(index));
      }
      select(preset.members.some(member => member.id === selections.get(preset.id)) ? selections.get(preset.id) : preset.members[0].id);
      controls.append(left, active, right);
      const foot = doc.createElement("div"); foot.dataset.ppbuiTeamPresetCardFoot = "";
      const footActions = doc.createElement("div"); footActions.dataset.ppbuiTeamPresetCardActions = ""; footActions.className = "ppbui-action-row";
      const applyButton = actionButton(doc, copy.apply, `${copy.apply}: ${preset.name}`, "ppbui-button--primary"); applyButton.disabled = preset.orderVerified === false;
      const update = actionButton(doc, copy.update, `${copy.update}: ${preset.name}`);
      applyButton.addEventListener("click", () => { if (!disposed) execute(preset, applyButton, () => apply(doc, preset)); });
      update.addEventListener("click", async () => {
        if (disposed) return;
        setCardMessage(preset.id, copy.updating);
        const result = await runManagerOperation(preset, update, copy.updating, () => capture(doc, hudRoot));
        if (disposed) return;
        if (!result?.ok) return setCardMessage(preset.id, errorMessage(copy, result, preset), true);
        if (!store.replaceSnapshot(preset.id, result.snapshot)) return setCardMessage(preset.id, copy.updateFailed, true);
        setCardMessage(preset.id, copy.updated); changed();
      });
      footActions.append(update, applyButton); foot.append(controls, footActions);
      const cardStatus = doc.createElement("p"); cardStatus.dataset.ppbuiTeamPresetCardStatus = ""; cardStatus.setAttribute("aria-live", "polite");
      const message = cardMessages.get(String(preset.id)); if (message) { cardStatus.textContent = message.message; cardStatus.dataset.error = String(Boolean(message.error)); }
      card.append(head, meta);
      if (preset.orderVerified === false) {
        const review = doc.createElement("p"); review.dataset.ppbuiTeamPresetReview = ""; review.textContent = copy.orderReview;
        const confirm = actionButton(doc, copy.confirmOrder, copy.confirmOrder, "ppbui-is-warning");
        confirm.addEventListener("click", () => { if (disposed) return; if (store.confirmOrder(preset.id)) { setStatus(copy.updated); changed(); } });
        body.append(review); footActions.prepend(confirm);
      }
      body.prepend(members); body.append(foot, cardStatus); card.append(body); grid.append(card);
    });
  }

  function syncSummary() {
    const copy = text(), count = store.list().length, label = `${copy.savedTeams}${count ? ` · ${count}` : ""}`;
    if (summary.textContent !== label) summary.textContent = label;
  }

  function sync() { if (disposed) return; ensureMounted(); syncNativeBodyGuard(); syncSummary(); render(); }

  function onToggle() { if (details.open) render(true, true); }
  details.addEventListener("toggle", onToggle);
  composer = mountTeamPresetComposer(details, { store, onChange: changed, setManagerStatus: setStatus });
  ensureMounted(); syncNativeBodyGuard(); syncSummary(); render(true);
  return {
    sync() { sync(); composer?.sync(); },
    open() { if (disposed) return; ensureMounted(); details.open = true; details.scrollIntoView?.({ block: "nearest" }); },
    cleanup() { disposed = true; details.removeEventListener("toggle", onToggle); releaseNativeBodyGuard(); composer?.cleanup(); composer = null; details.remove(); style.remove(); },
  };
}
