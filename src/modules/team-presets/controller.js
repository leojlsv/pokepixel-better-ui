import { teamPresetsConfig as config } from "./config.js";
import { applyTeamPreset } from "./actions.js";
import { currentTeamSnapshot, teamPresetsText } from "./dom.js";
import { createTeamPresetStorage } from "./storage.js";

export function mountTeamPresets(root, { store = createTeamPresetStorage(), apply = applyTeamPreset } = {}) {
  const doc = root.ownerDocument, win = doc.defaultView;
  let busy = false;

  const style = doc.createElement("style");
  style.dataset.ppbuiModule = config.id;
  style.textContent = `
    [data-ppbui-team-presets] { display:grid; gap:4px; margin-top:4px; }
    [data-ppbui-team-presets-toolbar] { display:flex; justify-content:flex-end; }
    [data-ppbui-team-presets-panel] { display:grid; gap:5px; }
    [data-ppbui-team-presets-save] { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:4px; }
    [data-ppbui-team-presets-list] { display:grid; gap:4px; max-height:188px; overflow:auto; }
    [data-ppbui-team-presets-row] { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:4px; align-items:center; }
    [data-ppbui-team-presets-row] > input { min-width:0; }
    [data-ppbui-team-presets-members] { grid-column:1/-1; overflow:hidden; opacity:.75; font-size:9px; text-overflow:ellipsis; white-space:nowrap; }
    [data-ppbui-team-presets-status] { margin:0; font-size:9px; }
    [data-ppbui-team-presets-status][data-error="true"] { font-weight:700; }
  `;

  const host = doc.createElement("div"); host.dataset.ppbuiTeamPresets = ""; host.dataset.ppbuiModule = config.id;
  const toolbar = doc.createElement("div"); toolbar.dataset.ppbuiTeamPresetsToolbar = "";
  const toggle = doc.createElement("button"); toggle.type = "button"; toggle.className = "pokeidle-btn";
  const panel = doc.createElement("div"); panel.dataset.ppbuiTeamPresetsPanel = ""; panel.hidden = true;
  const saveRow = doc.createElement("div"); saveRow.dataset.ppbuiTeamPresetsSave = "";
  const name = doc.createElement("input"); name.type = "text"; name.maxLength = 40; name.className = "game-window__search";
  const save = doc.createElement("button"); save.type = "button"; save.className = "pokeidle-btn";
  const list = doc.createElement("div"); list.dataset.ppbuiTeamPresetsList = "";
  const status = doc.createElement("p"); status.dataset.ppbuiTeamPresetsStatus = ""; status.setAttribute("aria-live", "polite");
  saveRow.append(name, save); panel.append(saveRow, list, status); toolbar.append(toggle); host.append(toolbar, panel); root.append(style, host);

  function text() { return teamPresetsText(doc); }
  function setStatus(message = "", error = false) {
    if (status.textContent !== message) status.textContent = message;
    const nextError = error ? "true" : "false";
    if (status.dataset.error !== nextError) status.dataset.error = nextError;
  }
  function setBusy(value) {
    busy = value;
    host.querySelectorAll("button,input").forEach(node => { if (node.disabled !== value) node.disabled = value; });
  }

  function errorMessage(result, preset) {
    const copy = text();
    if (result?.reason === "member-unavailable" && result.missingIds?.length) {
      const missing = result.missingIds.map(id => preset.members.find(member => member.id === id)?.name || id).join(", ");
      return `${copy.errors[result.reason]} ${missing}`;
    }
    return copy.errors[result?.reason] || result?.reason || copy.errors["final-state-mismatch"];
  }

  function renderList() {
    const copy = text(), presets = store.list(); list.replaceChildren();
    if (!presets.length) {
      const empty = doc.createElement("p"); empty.dataset.ppbuiTeamPresetsMembers = ""; empty.textContent = copy.empty; list.append(empty); return;
    }
    for (const preset of presets) {
      const row = doc.createElement("div"); row.dataset.ppbuiTeamPresetsRow = "";
      const rename = doc.createElement("input"); rename.type = "text"; rename.maxLength = 40; rename.className = "game-window__search"; rename.value = preset.name; rename.setAttribute("aria-label", copy.presetName);
      const applyButton = doc.createElement("button"); applyButton.type = "button"; applyButton.className = "pokeidle-btn"; applyButton.textContent = copy.apply;
      const remove = doc.createElement("button"); remove.type = "button"; remove.className = "pokeidle-btn"; remove.textContent = "×"; remove.title = copy.remove; remove.setAttribute("aria-label", `${copy.remove}: ${preset.name}`);
      const members = doc.createElement("span"); members.dataset.ppbuiTeamPresetsMembers = ""; members.textContent = preset.members.map(member => member.name).join(" · "); members.title = members.textContent;
      rename.addEventListener("change", () => {
        if (!store.rename(preset.id, rename.value)) { rename.value = preset.name; setStatus(copy.nameRequired, true); return; }
        setStatus(""); renderList();
      });
      remove.addEventListener("click", () => {
        if (win?.confirm && !win.confirm(copy.deleteConfirm)) return;
        store.remove(preset.id); setStatus(""); renderList();
      });
      applyButton.addEventListener("click", async () => {
        if (busy) return;
        setBusy(true); setStatus(copy.applying);
        try {
          const result = await apply(doc, preset);
          setStatus(result?.ok ? copy.applied : errorMessage(result, preset), !result?.ok);
        } catch (error) {
          setStatus(error?.message || copy.errors["final-state-mismatch"], true);
        } finally {
          setBusy(false); sync();
        }
      });
      row.append(rename, applyButton, remove, members); list.append(row);
    }
  }

  function syncLabels() {
    const copy = text(), expanded = String(!panel.hidden);
    if (toggle.textContent !== copy.toggle) toggle.textContent = copy.toggle;
    if (toggle.getAttribute("aria-expanded") !== expanded) toggle.setAttribute("aria-expanded", expanded);
    if (name.placeholder !== copy.presetName) name.placeholder = copy.presetName;
    if (name.getAttribute("aria-label") !== copy.presetName) name.setAttribute("aria-label", copy.presetName);
    if (save.textContent !== copy.save) save.textContent = copy.save;
  }

  function sync() {
    syncLabels();
    const disabled = !currentTeamSnapshot(root);
    if (!busy && save.disabled !== disabled) save.disabled = disabled;
  }

  function onToggle() { panel.hidden = !panel.hidden; sync(); if (!panel.hidden) name.focus({ preventScroll: true }); }
  function onSave() {
    const copy = text(), snapshot = currentTeamSnapshot(root), presetName = name.value.trim();
    if (!snapshot) return setStatus(copy.teamUnavailable, true);
    if (!presetName) return setStatus(copy.nameRequired, true);
    const result = store.upsert(presetName, snapshot);
    if (!result) return setStatus(copy.teamUnavailable, true);
    name.value = ""; setStatus(result.created ? copy.saved : copy.updated); renderList();
  }
  function onStorage(event) {
    if (event.key !== config.storageKey && event.key !== null) return;
    store.reload(); renderList(); if (!store.isPersistent()) setStatus(text().sessionOnly, true);
  }

  toggle.addEventListener("click", onToggle); save.addEventListener("click", onSave); win?.addEventListener("storage", onStorage);
  syncLabels(); renderList(); sync();
  if (!store.isPersistent()) setStatus(text().sessionOnly, true);

  return { sync, cleanup() {
    toggle.removeEventListener("click", onToggle); save.removeEventListener("click", onSave); win?.removeEventListener("storage", onStorage);
    host.remove(); style.remove();
  } };
}
