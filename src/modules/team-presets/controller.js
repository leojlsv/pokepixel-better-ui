import { teamPresetsConfig as config } from "./config.js";
import { applyTeamPreset, captureTeamPresetSnapshot, openTeamPresetManagement } from "./actions.js";
import { currentTeamSnapshot, teamPresetsText } from "./dom.js";
import { mountTeamPresetManager } from "./manager.js";
import { createTeamPresetStorage } from "./storage.js";

export function mountTeamPresets(root, { store = createTeamPresetStorage(), apply = applyTeamPreset, capture = captureTeamPresetSnapshot } = {}) {
  const doc = root.ownerDocument, win = doc.defaultView;
  let busy = false, manager = null, managerRoot = null;

  const style = doc.createElement("style"); style.dataset.ppbuiModule = config.id;
  style.textContent = `
    [data-ppbui-team-presets] { display:grid; gap:4px; margin-top:4px; }
    [data-ppbui-team-presets-toolbar] { display:flex; justify-content:flex-end; gap:4px; }
    [data-ppbui-team-presets-panel] { display:grid; gap:5px; }
    [data-ppbui-team-presets-save] { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:4px; }
    [data-ppbui-team-presets-list] { display:grid; gap:4px; max-height:160px; overflow:auto; }
    [data-ppbui-team-presets-row] { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:3px 4px; align-items:center; }
    [data-ppbui-team-presets-name] { min-width:0; overflow:hidden; font-weight:700; text-overflow:ellipsis; white-space:nowrap; }
    [data-ppbui-team-presets-members] { grid-column:1/-1; overflow:hidden; opacity:.75; font-size:9px; text-overflow:ellipsis; white-space:nowrap; }
    [data-ppbui-team-presets-status] { margin:0; font-size:9px; }
    [data-ppbui-team-presets-status][data-error="true"] { font-weight:700; }
  `;

  const host = doc.createElement("div"); host.dataset.ppbuiTeamPresets = ""; host.dataset.ppbuiModule = config.id;
  const toolbar = doc.createElement("div"); toolbar.dataset.ppbuiTeamPresetsToolbar = "";
  const toggle = doc.createElement("button"); toggle.type = "button"; toggle.className = "pokeidle-btn";
  const manage = doc.createElement("button"); manage.type = "button"; manage.className = "pokeidle-btn";
  const panel = doc.createElement("div"); panel.dataset.ppbuiTeamPresetsPanel = ""; panel.hidden = true;
  const saveRow = doc.createElement("div"); saveRow.dataset.ppbuiTeamPresetsSave = "";
  const name = doc.createElement("input"); name.type = "text"; name.maxLength = 40; name.className = "game-window__search";
  const save = doc.createElement("button"); save.type = "button"; save.className = "pokeidle-btn";
  const list = doc.createElement("div"); list.dataset.ppbuiTeamPresetsList = "";
  const status = doc.createElement("p"); status.dataset.ppbuiTeamPresetsStatus = ""; status.setAttribute("aria-live", "polite");
  saveRow.append(name, save); panel.append(saveRow, list, status); toolbar.append(toggle, manage); host.append(toolbar, panel); root.append(style, host);

  const text = () => teamPresetsText(doc);
  const setDisabled = (node, value) => { if (node && node.disabled !== value) node.disabled = value; };
  function setStatus(message = "", error = false) {
    if (status.textContent !== message) status.textContent = message;
    const nextError = error ? "true" : "false"; if (status.dataset.error !== nextError) status.dataset.error = nextError;
  }
  function errorMessage(result, preset) {
    const copy = text();
    if (result?.reason === "member-unavailable" && result.missingIds?.length) {
      const missing = result.missingIds.map(id => preset.members.find(member => member.id === id)?.name || id).join(", ");
      return `${copy.errors[result.reason]} ${missing}`;
    }
    return copy.errors[result?.reason] || result?.reason || copy.errors["final-state-mismatch"];
  }

  function notifyChanged() { renderList(); manager?.sync(); }

  async function runExclusive(task) {
    if (busy) return { ok: false, reason: "busy" };
    busy = true; host.querySelectorAll("button,input").forEach(node => setDisabled(node, true));
    try { return await task(); }
    catch (error) { return { ok: false, reason: error?.message || "unexpected-error" }; }
    finally { busy = false; sync(); }
  }

  function renderList() {
    const copy = text(), presets = store.list(); list.replaceChildren();
    if (!presets.length) { const empty = doc.createElement("p"); empty.dataset.ppbuiTeamPresetsMembers = ""; empty.textContent = copy.empty; list.append(empty); return; }
    for (const preset of presets) {
      const row = doc.createElement("div"); row.dataset.ppbuiTeamPresetsRow = "";
      const label = doc.createElement("span"); label.dataset.ppbuiTeamPresetsName = ""; label.textContent = preset.name; label.title = preset.name;
      const applyButton = doc.createElement("button"); applyButton.type = "button"; applyButton.className = "pokeidle-btn"; applyButton.textContent = copy.apply; applyButton.disabled = preset.orderVerified === false;
      const members = doc.createElement("span"); members.dataset.ppbuiTeamPresetsMembers = "";
      members.textContent = preset.members.map((member, index) => `${index + 1}.${member.name}${member.id === preset.activeId ? "*" : ""}`).join(" · "); members.title = members.textContent;
      applyButton.addEventListener("click", async () => {
        setStatus(copy.applying); const result = await runExclusive(() => apply(doc, preset));
        setStatus(result?.ok ? copy.applied : errorMessage(result, preset), !result?.ok);
      });
      row.append(label, applyButton, members); list.append(row);
    }
  }

  function mountManager(nextRoot) {
    if (managerRoot === nextRoot && manager) return;
    manager?.cleanup(); manager = null; managerRoot = nextRoot || null;
    if (!nextRoot) return;
    manager = mountTeamPresetManager(nextRoot, { store, hudRoot: root, apply, capture, runExclusive, onChange: notifyChanged });
  }

  function syncManager() {
    const nextRoot = doc.querySelector(config.selectors.teamPanel);
    if (!nextRoot?.isConnected) return mountManager(null);
    mountManager(nextRoot); manager?.sync();
  }

  function syncLabels() {
    const copy = text(), expanded = !panel.hidden;
    const toggleLabel = `${expanded ? "▾" : "▸"} ${copy.toggle}`;
    if (toggle.textContent !== toggleLabel) toggle.textContent = toggleLabel;
    if (toggle.getAttribute("aria-expanded") !== String(expanded)) toggle.setAttribute("aria-expanded", String(expanded));
    if (manage.textContent !== copy.manage) manage.textContent = copy.manage;
    if (name.placeholder !== copy.presetName) name.placeholder = copy.presetName;
    if (name.getAttribute("aria-label") !== copy.presetName) name.setAttribute("aria-label", copy.presetName);
    if (save.textContent !== copy.save) save.textContent = copy.save;
  }

  function sync() {
    syncLabels(); syncManager();
    if (busy) return;
    setDisabled(toggle, false); setDisabled(manage, false); setDisabled(name, false); setDisabled(save, !currentTeamSnapshot(root));
    const presets = store.list(), rows = [...list.querySelectorAll("[data-ppbui-team-presets-row]")];
    rows.forEach((row, index) => setDisabled(row.querySelector("button"), presets[index]?.orderVerified === false));
  }

  function onToggle() { panel.hidden = !panel.hidden; syncLabels(); if (!panel.hidden) name.focus({ preventScroll: true }); }
  async function onManage() {
    const teamRoot = await openTeamPresetManagement(doc);
    if (!teamRoot) return setStatus(text().errors["team-panel-unavailable"], true);
    mountManager(teamRoot); manager?.open();
  }
  async function onSave() {
    const copy = text(), presetName = name.value.trim();
    if (!presetName) return setStatus(copy.nameRequired, true);
    const captured = await runExclusive(() => capture(doc, root));
    if (!captured?.ok) return setStatus(errorMessage(captured, { members: [] }), true);
    const result = store.upsert(presetName, captured.snapshot);
    if (!result) return setStatus(copy.teamUnavailable, true);
    name.value = ""; setStatus(result.created ? copy.saved : copy.updated); notifyChanged();
  }
  function onStorage(event) {
    if (![config.storageKey, config.legacyStorageKey, null].includes(event.key)) return;
    store.reload(); notifyChanged(); if (!store.isPersistent()) setStatus(text().sessionOnly, true);
  }

  toggle.addEventListener("click", onToggle); manage.addEventListener("click", onManage); save.addEventListener("click", onSave); win?.addEventListener("storage", onStorage);
  syncLabels(); renderList(); sync(); if (!store.isPersistent()) setStatus(text().sessionOnly, true);

  return { sync, cleanup() {
    toggle.removeEventListener("click", onToggle); manage.removeEventListener("click", onManage); save.removeEventListener("click", onSave); win?.removeEventListener("storage", onStorage);
    manager?.cleanup(); manager = null; managerRoot = null; host.remove(); style.remove();
  } };
}
