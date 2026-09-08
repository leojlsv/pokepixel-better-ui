import { teamPresetsConfig as config } from "./config.js";
import { applyTeamPreset, captureTeamPresetSnapshot, openTeamPresetManagement } from "./actions.js";
import { canCaptureTeamPreset, teamPresetVisualReader, teamPresetsText } from "./dom.js";
import { mountTeamPresetManager } from "./manager.js";
import { createTeamPresetStorage } from "./storage.js";

export function mountTeamPresets(root, { store = createTeamPresetStorage(), apply = applyTeamPreset, capture = captureTeamPresetSnapshot } = {}) {
  const doc = root.ownerDocument, win = doc.defaultView;
  let busy = false, manager = null, managerRoot = null, readVisual;

  const style = doc.createElement("style"); style.dataset.ppbuiModule = config.id;
  style.textContent = `
    [data-ppbui-team-presets] { display:grid; gap:4px; margin-top:6px; padding-top:5px; border-top:1px solid rgba(241,214,129,.18); color:#d8d3ca; font:inherit; }
    [data-ppbui-team-presets] button { box-sizing:border-box; display:inline-flex!important; align-items:center!important; justify-content:center; line-height:1!important; text-align:center; text-indent:0; letter-spacing:normal; }
    [data-ppbui-team-presets-toolbar] { display:flex; align-items:center; gap:4px; min-width:0; }
    [data-ppbui-team-presets-toolbar] > .ppbui-team-presets-toggle { flex:1 1 auto; min-width:0; min-height:24px; justify-content:flex-start!important; padding:3px 7px; color:var(--ui-gold-light,#f1d681)!important; font:inherit; font-weight:700; text-align:left; }
    .ppbui-team-presets-toggle { gap:8px; white-space:nowrap; }
    .ppbui-team-presets-toggle-label { min-width:0; overflow:hidden; text-overflow:ellipsis; }
    .ppbui-team-presets-toggle-count { flex:0 0 auto; margin-left:auto; color:#aaa7a1; font-weight:400; }
    [data-ppbui-team-presets-toolbar] > .ppbui-team-presets-icon { flex:0 0 26px; width:26px; min-width:26px; min-height:24px; padding:3px 5px; color:#d8d3ca!important; font:inherit; }
    [data-ppbui-team-presets-panel] { display:grid; gap:5px; }
    [data-ppbui-team-presets-panel][hidden] { display:none!important; }
    [data-ppbui-team-presets-save] { display:grid; grid-template-columns:minmax(0,1fr) 28px; gap:4px; }
    [data-ppbui-team-presets-save] > button { min-width:28px; min-height:24px; padding:3px 5px; color:#d8d3ca!important; }
    [data-ppbui-team-presets-list] { display:grid; gap:5px; max-height:205px; overflow:auto; scrollbar-width:thin; scrollbar-color:var(--ui-gold-dark,#74613f) var(--ui-navy-deep,#171719); scrollbar-gutter:stable; }
    [data-ppbui-team-presets-list]::-webkit-scrollbar { width:9px; height:9px; }
    [data-ppbui-team-presets-list]::-webkit-scrollbar-track { background:var(--ui-navy-deep,#171719); }
    [data-ppbui-team-presets-list]::-webkit-scrollbar-thumb { border:2px solid var(--ui-navy-deep,#171719); background:var(--ui-gold-dark,#74613f); }
    [data-ppbui-team-presets-row] { display:grid; grid-template-rows:auto auto; gap:4px; min-width:0; padding:5px; border:1px solid rgba(241,214,129,.12); background:rgba(20,20,22,.72); }
    [data-ppbui-team-presets-row] { border-radius:4px; }
    [data-ppbui-team-presets-member] { border-radius:3px; }
    [data-ppbui-team-presets-row-head] { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:6px; min-width:0; }
    [data-ppbui-team-presets-title] { display:flex; align-items:baseline; gap:5px; min-width:0; }
    [data-ppbui-team-presets-name] { min-width:0; overflow:hidden; color:var(--ui-gold-light,#f1d681); font-weight:700; text-overflow:ellipsis; white-space:nowrap; }
    [data-ppbui-team-presets-count] { flex:0 0 auto; color:#77746f; font-size:8px; }
    [data-ppbui-team-presets-row-actions] { display:flex; align-items:center; gap:2px; }
    [data-ppbui-team-presets-row-actions] > button { width:22px!important; min-width:22px!important; height:22px!important; min-height:22px!important; padding:0!important; color:#aaa7a1!important; font:inherit; opacity:.58; transition:opacity .12s linear,color .12s linear; }
    [data-ppbui-team-presets-row-actions] > button:hover,
    [data-ppbui-team-presets-row-actions] > button:focus-visible { color:#d8d3ca!important; opacity:1; }
    [data-ppbui-team-presets-row-actions] > button[data-primary="true"] { color:var(--ui-gold-light,#f1d681)!important; opacity:.78; }
    [data-ppbui-team-presets-row-actions] > button[data-primary="true"]:hover,
    [data-ppbui-team-presets-row-actions] > button[data-primary="true"]:focus-visible { opacity:1; }
    [data-ppbui-team-presets-members] { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:3px; width:100%; min-width:0; }
    [data-ppbui-team-presets-member] { position:relative; display:grid; place-items:center; box-sizing:border-box; min-width:0; height:50px; overflow:hidden; padding:2px 1px 7px; border:1px solid #33343a; background:#1d1d20; color:#d8d3ca; }
    [data-ppbui-team-presets-member][data-active="true"] { border-color:#72cf64; box-shadow:inset 0 0 0 1px rgba(114,207,100,.24),0 0 3px rgba(114,207,100,.22); }
    [data-ppbui-team-presets-member][data-fainted="true"] { opacity:.55; }
    [data-ppbui-team-presets-member] img { display:block; max-width:36px; max-height:36px; image-rendering:pixelated; }
    [data-ppbui-team-presets-member-fallback] { max-width:36px; overflow:hidden; color:#d8d3ca; font-size:8px; text-overflow:clip; white-space:nowrap; }
    [data-ppbui-team-presets-member-position] { position:absolute; z-index:2; top:1px; left:2px; color:#aaa7a1; font-size:7px; line-height:1; text-shadow:0 1px 1px #000; }
    [data-ppbui-team-presets-member-level] { position:absolute; z-index:2; right:1px; bottom:6px; padding:0 2px; border:1px solid rgba(255,255,255,.16); background:rgba(5,5,6,.88); color:#f0eee9; font-size:7px; font-weight:700; line-height:9px; white-space:nowrap; text-shadow:0 1px 1px #000; }
    [data-ppbui-team-presets-member-element] { position:absolute; right:2px; bottom:1px; left:2px; height:3px; background:var(--ppbui-element-color,#33343a); pointer-events:none; }
    [data-ppbui-team-presets-status] { margin:0; color:#aaa7a1; font-size:9px; }
    [data-ppbui-team-presets-status]:empty { display:none; }
    [data-ppbui-team-presets-status][data-error="true"] { color:#d18b82; font-weight:700; }
  `;

  const host = doc.createElement("div"); host.dataset.ppbuiTeamPresets = ""; host.dataset.ppbuiModule = config.id;
  const toolbar = doc.createElement("div"); toolbar.dataset.ppbuiTeamPresetsToolbar = "";
  const toggle = doc.createElement("button"); toggle.type = "button"; toggle.className = "pokeidle-btn ppbui-team-presets-toggle";
  const toggleLabelNode = doc.createElement("span"); toggleLabelNode.className = "ppbui-team-presets-toggle-label";
  const toggleCount = doc.createElement("span"); toggleCount.className = "ppbui-team-presets-toggle-count";
  toggle.append(toggleLabelNode, doc.createTextNode(" "), toggleCount);
  const manage = doc.createElement("button"); manage.type = "button"; manage.className = "pokeidle-btn ppbui-team-presets-icon"; manage.textContent = "⚙";
  const panel = doc.createElement("div"); panel.dataset.ppbuiTeamPresetsPanel = ""; panel.hidden = true; panel.style.display = "none";
  const saveRow = doc.createElement("div"); saveRow.dataset.ppbuiTeamPresetsSave = "";
  const name = doc.createElement("input"); name.type = "text"; name.maxLength = 40; name.className = "game-window__search";
  const save = doc.createElement("button"); save.type = "button"; save.className = "pokeidle-btn"; save.textContent = "+";
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

  function notifyChanged() { renderList(); manager?.sync(); syncLabels(); }

  async function runExclusive(task) {
    if (busy) return { ok: false, reason: "busy" };
    busy = true; host.querySelectorAll("button,input").forEach(node => setDisabled(node, true));
    try { return await task(); }
    catch (error) { return { ok: false, reason: error?.message || "unexpected-error" }; }
    finally { busy = false; sync(); }
  }

  function liveHudVisual(member) {
    const visual = readVisual(member), creature = visual.creature, card = visual.card;
    if (!creature && !card && !visual.sprite && !visual.elementColor) return null;
    const levelText = String(card?.querySelector(".pokeidle-team-card__compact-level, .pokeidle-team-card__level")?.textContent || (visual.level !== null ? `Lv.${visual.level}` : "")).trim();
    const hp = Number(creature?.hp);
    const fainted = card?.classList.contains("is-fainted") || (Number.isFinite(hp) && hp <= 0);
    return { sprite: visual.sprite, elementColor: visual.elementColor, levelText, fainted: Boolean(fainted) };
  }

  function paintHudVisual(item, member) {
    const live = liveHudVisual(member), level = item.querySelector("[data-ppbui-team-presets-member-level]"), element = item.querySelector("[data-ppbui-team-presets-member-element]");
    let image = item.querySelector("img"); const nextLevel = live?.levelText || (Number.isFinite(Number(member.level)) ? `Lv.${member.level}` : "");
    if (level && level.textContent !== nextLevel) level.textContent = nextLevel;
    if (live?.sprite) {
      if (!image) {
        image = doc.createElement("img"); image.alt = member.name;
        const fallback = item.querySelector("[data-ppbui-team-presets-member-fallback]");
        fallback ? fallback.replaceWith(image) : item.prepend(image);
      }
      if (image.getAttribute("src") !== live.sprite) image.src = live.sprite;
    }
    const fainted = live?.fainted ? "true" : "false"; if (item.dataset.fainted !== fainted) item.dataset.fainted = fainted;
    const color = live?.elementColor || "";
    if (element && element.style.getPropertyValue("--ppbui-element-color") !== color) element.style.setProperty("--ppbui-element-color", color);
  }

  function presetPreview(preset, copy) {
    const preview = doc.createElement("div"); preview.dataset.ppbuiTeamPresetsMembers = ""; preview.setAttribute("role", "list");
    const description = preset.members.map((member, index) => `${index + 1}. ${member.name}${member.id === preset.activeId ? ` · ${copy.active}` : ""}`).join("; ");
    preview.title = description; preview.setAttribute("aria-label", description);
    preset.members.forEach((member, index) => {
      const live = liveHudVisual(member), item = doc.createElement("span");
      item.dataset.ppbuiTeamPresetsMember = ""; item.dataset.memberId = member.id; item.dataset.active = String(member.id === preset.activeId); item.setAttribute("role", "listitem");
      item.title = `${index + 1}. ${member.name}${member.level ? ` · Lv.${member.level}` : ""}${member.id === preset.activeId ? ` · ${copy.active}` : ""}`;
      const position = doc.createElement("span"); position.dataset.ppbuiTeamPresetsMemberPosition = ""; position.textContent = String(index + 1);
      const sprite = live?.sprite || member.sprite;
      if (sprite) {
        const image = doc.createElement("img"); image.src = sprite; image.alt = member.name; item.append(image);
      } else {
        const fallback = doc.createElement("span"); fallback.dataset.ppbuiTeamPresetsMemberFallback = ""; fallback.textContent = member.name.slice(0, 3).toUpperCase(); item.append(fallback);
      }
      const level = doc.createElement("span"); level.dataset.ppbuiTeamPresetsMemberLevel = ""; level.textContent = live?.levelText || (Number.isFinite(Number(member.level)) ? `Lv.${member.level}` : "");
      const element = doc.createElement("span"); element.dataset.ppbuiTeamPresetsMemberElement = ""; element.setAttribute("aria-hidden", "true");
      item.append(position, level, element); paintHudVisual(item, member); preview.append(item);
    });
    return preview;
  }

  function renderList() {
    readVisual = teamPresetVisualReader(root, { resolveSprites: true });
    const copy = text(), presets = store.list(); list.replaceChildren();
    if (!presets.length) { const empty = doc.createElement("p"); empty.dataset.ppbuiTeamPresetsStatus = ""; empty.textContent = copy.empty; list.append(empty); return; }
    for (const [presetIndex, preset] of presets.entries()) {
      const row = doc.createElement("div"); row.dataset.ppbuiTeamPresetsRow = "";
      const head = doc.createElement("div"); head.dataset.ppbuiTeamPresetsRowHead = "";
      const title = doc.createElement("div"); title.dataset.ppbuiTeamPresetsTitle = "";
      const label = doc.createElement("span"); label.dataset.ppbuiTeamPresetsName = ""; label.textContent = preset.name; label.title = preset.name;
      const count = doc.createElement("span"); count.dataset.ppbuiTeamPresetsCount = ""; count.textContent = `${preset.members.length}/6`;
      title.append(label, count);

      const actions = doc.createElement("div"); actions.dataset.ppbuiTeamPresetsRowActions = "";
      const editButton = doc.createElement("button"); editButton.type = "button"; editButton.className = "pokeidle-btn"; editButton.textContent = "⚙";
      editButton.title = `${copy.manage}: ${preset.name}`; editButton.setAttribute("aria-label", editButton.title);
      const applyButton = doc.createElement("button"); applyButton.type = "button"; applyButton.className = "pokeidle-btn"; applyButton.textContent = "▶"; applyButton.dataset.primary = "true"; applyButton.disabled = preset.orderVerified === false;
      applyButton.title = `${copy.apply}: ${preset.name}`; applyButton.setAttribute("aria-label", applyButton.title);
      editButton.addEventListener("click", onManage);
      applyButton.addEventListener("click", async () => {
        setStatus(copy.applying); const result = await runExclusive(() => apply(doc, preset));
        setStatus(result?.ok ? copy.applied : errorMessage(result, preset), !result?.ok);
      });
      const orderButtons = [-1, 1].map(delta => {
        const button = doc.createElement("button"); button.type = "button"; button.className = "pokeidle-btn"; button.textContent = delta < 0 ? "↑" : "↓";
        button.dataset.movePreset = String(delta); button.title = `${delta < 0 ? copy.moveUp : copy.moveDown}: ${preset.name}`; button.setAttribute("aria-label", button.title);
        button.disabled = delta < 0 ? presetIndex === 0 : presetIndex === presets.length - 1;
        button.addEventListener("click", () => {
          if (busy || !store.movePreset(preset.id, delta)) return;
          const scroll = list.scrollTop; notifyChanged(); list.scrollTop = scroll; sync();
        });
        return button;
      });
      actions.append(...orderButtons, editButton, applyButton); head.append(title, actions);

      const preview = presetPreview(preset, copy);
      row.append(head, preview); list.append(row);
    }
  }

  function syncPreviewVisuals(options) {
    if (panel.hidden) return;
    readVisual = teamPresetVisualReader(root, options);
    const presets = store.list(), rows = [...list.querySelectorAll("[data-ppbui-team-presets-row]")];
    rows.forEach((row, presetIndex) => {
      const preset = presets[presetIndex]; if (!preset) return;
      const items = [...row.querySelectorAll("[data-ppbui-team-presets-member]")];
      items.forEach((item, memberIndex) => { const member = preset.members[memberIndex]; if (member) paintHudVisual(item, member); });
    });
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

  function setExpanded(expanded) {
    panel.hidden = !expanded;
    panel.style.display = expanded ? "" : "none";
    toggle.setAttribute("aria-expanded", String(expanded));
  }

  function syncLabels() {
    const copy = text(), expanded = !panel.hidden, count = store.list().length;
    const toggleLabel = `${expanded ? "▾" : "▸"} ${copy.toggle}`;
    if (toggleLabelNode.textContent !== toggleLabel) toggleLabelNode.textContent = toggleLabel;
    const countLabel = copy.savedCount(count);
    if (toggleCount.textContent !== countLabel) toggleCount.textContent = countLabel;
    if (toggle.getAttribute("aria-expanded") !== String(expanded)) toggle.setAttribute("aria-expanded", String(expanded));
    const manageTitle = copy.manage;
    if (manage.title !== manageTitle) { manage.title = manageTitle; manage.setAttribute("aria-label", manageTitle); }
    if (name.placeholder !== copy.presetName) name.placeholder = copy.presetName;
    if (name.getAttribute("aria-label") !== copy.presetName) name.setAttribute("aria-label", copy.presetName);
    const saveTitle = copy.save;
    if (save.title !== saveTitle) { save.title = saveTitle; save.setAttribute("aria-label", saveTitle); }
  }

  function sync() {
    syncLabels(); syncManager(); syncPreviewVisuals();
    if (busy) return;
    setDisabled(toggle, false); setDisabled(manage, false); setDisabled(name, false); setDisabled(save, !canCaptureTeamPreset(root));
    const presets = store.list(), rows = [...list.querySelectorAll("[data-ppbui-team-presets-row]")];
    rows.forEach((row, index) => {
      const buttons = [...row.querySelectorAll("[data-ppbui-team-presets-row-actions] button")];
      setDisabled(buttons[0], index === 0); setDisabled(buttons[1], index === presets.length - 1);
      setDisabled(buttons[2], false); setDisabled(buttons[3], presets[index]?.orderVerified === false);
    });
  }

  function onToggle() {
    setExpanded(panel.hidden); syncLabels();
    if (!panel.hidden) {
      syncPreviewVisuals({ resolveSprites: true, retryMissing: true });
      name.focus({ preventScroll: true });
    }
  }
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
  syncLabels(); renderList(); setExpanded(false); sync(); if (!store.isPersistent()) setStatus(text().sessionOnly, true);

  return { sync, cleanup() {
    toggle.removeEventListener("click", onToggle); manage.removeEventListener("click", onManage); save.removeEventListener("click", onSave); win?.removeEventListener("storage", onStorage);
    manager?.cleanup(); manager = null; managerRoot = null; host.remove(); style.remove();
  } };
}
