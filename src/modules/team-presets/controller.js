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
    [data-ppbui-team-presets] { display:grid; gap:4px; margin-top:6px; padding-top:5px; border-top:1px solid rgba(241,214,129,.18); color:#d8d3ca; font:inherit; }
    [data-ppbui-team-presets-toolbar] { display:flex; align-items:center; gap:4px; min-width:0; }
    [data-ppbui-team-presets-toolbar] > .ppbui-team-presets-toggle { flex:1 1 auto; min-width:0; min-height:24px; justify-content:flex-start; padding:3px 7px; color:var(--ui-gold-light,#f1d681)!important; font:inherit; font-weight:700; text-align:left; }
    [data-ppbui-team-presets-toolbar] > .ppbui-team-presets-icon { flex:0 0 26px; width:26px; min-width:26px; min-height:24px; padding:3px 5px; color:#d8d3ca!important; font:inherit; }
    [data-ppbui-team-presets-panel] { display:grid; gap:5px; }
    [data-ppbui-team-presets-panel][hidden] { display:none!important; }
    [data-ppbui-team-presets-save] { display:grid; grid-template-columns:minmax(0,1fr) 28px; gap:4px; }
    [data-ppbui-team-presets-save] > button { min-width:28px; min-height:24px; padding:3px 5px; color:#d8d3ca!important; }
    [data-ppbui-team-presets-list] { display:grid; gap:5px; max-height:205px; overflow:auto; }
    [data-ppbui-team-presets-row] { display:grid; grid-template-rows:auto auto; gap:4px; min-width:0; padding:5px; border:1px solid rgba(241,214,129,.12); background:rgba(20,20,22,.72); }
    [data-ppbui-team-presets-row-head] { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:6px; min-width:0; }
    [data-ppbui-team-presets-title] { display:flex; align-items:baseline; gap:5px; min-width:0; }
    [data-ppbui-team-presets-name] { min-width:0; overflow:hidden; color:var(--ui-gold-light,#f1d681); font-weight:700; text-overflow:ellipsis; white-space:nowrap; }
    [data-ppbui-team-presets-count] { flex:0 0 auto; color:#77746f; font-size:8px; }
    [data-ppbui-team-presets-row-actions] { display:flex; align-items:center; gap:2px; }
    [data-ppbui-team-presets-row-actions] > button { width:22px; min-width:22px; min-height:20px; padding:1px 3px; color:#aaa7a1!important; font:inherit; opacity:.58; transition:opacity .12s linear,color .12s linear; }
    [data-ppbui-team-presets-row-actions] > button:hover,
    [data-ppbui-team-presets-row-actions] > button:focus-visible { color:#d8d3ca!important; opacity:1; }
    [data-ppbui-team-presets-row-actions] > button[data-primary="true"] { color:var(--ui-gold-light,#f1d681)!important; opacity:.78; }
    [data-ppbui-team-presets-row-actions] > button[data-primary="true"]:hover,
    [data-ppbui-team-presets-row-actions] > button[data-primary="true"]:focus-visible { opacity:1; }
    [data-ppbui-team-presets-members] { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:3px; width:100%; min-width:0; }
    [data-ppbui-team-presets-member] { position:relative; display:grid; place-items:center; box-sizing:border-box; min-width:0; height:50px; overflow:hidden; padding:2px 1px 7px; border:1px solid #33343a; border-radius:2px; background:linear-gradient(180deg,rgba(38,38,42,.95),rgba(19,19,21,.98)); color:#d8d3ca; }
    [data-ppbui-team-presets-member][data-active="true"] { border-color:#72cf64; box-shadow:inset 0 0 0 1px rgba(114,207,100,.24),0 0 3px rgba(114,207,100,.22); }
    [data-ppbui-team-presets-member][data-fainted="true"] { opacity:.55; }
    [data-ppbui-team-presets-member] img { display:block; max-width:36px; max-height:36px; image-rendering:pixelated; }
    [data-ppbui-team-presets-member-fallback] { max-width:36px; overflow:hidden; color:#d8d3ca; font-size:8px; text-overflow:clip; white-space:nowrap; }
    [data-ppbui-team-presets-member-position] { position:absolute; z-index:2; top:1px; left:2px; color:#aaa7a1; font-size:7px; line-height:1; text-shadow:0 1px 1px #000; }
    [data-ppbui-team-presets-member-level] { position:absolute; z-index:2; right:1px; bottom:6px; padding:0 2px; border:1px solid rgba(255,255,255,.16); border-radius:2px; background:rgba(5,5,6,.88); color:#f0eee9; font-size:7px; font-weight:700; line-height:9px; white-space:nowrap; text-shadow:0 1px 1px #000; }
    [data-ppbui-team-presets-member-bars] { position:absolute; right:2px; bottom:1px; left:2px; display:grid; gap:1px; pointer-events:none; }
    [data-ppbui-team-presets-member-bars][hidden] { display:none!important; }
    [data-ppbui-team-presets-member-hp], [data-ppbui-team-presets-member-xp] { display:block; height:2px; overflow:hidden; background:#08090a; }
    [data-ppbui-team-presets-member-hp] > i, [data-ppbui-team-presets-member-xp] > i { display:block; height:100%; width:0; }
    [data-ppbui-team-presets-member-hp] > i { background:#63c95a; }
    [data-ppbui-team-presets-member-xp] > i { background:#4e91df; }
    [data-ppbui-team-presets-status] { margin:0; color:#aaa7a1; font-size:9px; }
    [data-ppbui-team-presets-status]:empty { display:none; }
    [data-ppbui-team-presets-status][data-error="true"] { color:#d18b82; font-weight:700; }
  `;

  const host = doc.createElement("div"); host.dataset.ppbuiTeamPresets = ""; host.dataset.ppbuiModule = config.id;
  const toolbar = doc.createElement("div"); toolbar.dataset.ppbuiTeamPresetsToolbar = "";
  const toggle = doc.createElement("button"); toggle.type = "button"; toggle.className = "pokeidle-btn ppbui-team-presets-toggle";
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
  const clampPercent = value => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

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
    const runtime = win?.PokeIdle?.PersistentHud?._teamHud;
    const creature = Array.isArray(runtime?._creatures) ? runtime._creatures.find(entry => String(entry?.id ?? "") === member.id) : null;
    const card = [...root.querySelectorAll(config.selectors.hudCard)].find(node => node.dataset.creatureId === member.id);
    if (!creature && !card) return null;
    const sprite = String(card?.querySelector("img[src]")?.src || member.sprite || "").trim();
    const levelText = String(card?.querySelector(".pokeidle-team-card__compact-level, .pokeidle-team-card__level")?.textContent || (Number.isFinite(Number(creature?.level ?? member.level)) ? `Lv.${creature?.level ?? member.level}` : "")).trim();
    const hp = Number(creature?.hp), maximum = Number(creature?.max_hp);
    const hpPercent = Number.isFinite(hp) && Number.isFinite(maximum) && maximum > 0 ? clampPercent((hp / maximum) * 100) : null;
    const exp = Number(creature?.exp), from = Number(creature?.exp_current_level), to = Number(creature?.exp_next_level);
    const xpPercent = [exp, from, to].every(Number.isFinite) && to > from ? clampPercent(((exp - from) / (to - from)) * 100) : null;
    const fainted = card?.classList.contains("is-fainted") || (Number.isFinite(hp) && hp <= 0);
    return { sprite, levelText, hpPercent, xpPercent, fainted: Boolean(fainted) };
  }

  function paintHudVisual(item, member) {
    const live = liveHudVisual(member), level = item.querySelector("[data-ppbui-team-presets-member-level]"), bars = item.querySelector("[data-ppbui-team-presets-member-bars]");
    const image = item.querySelector("img"), nextLevel = live?.levelText || (Number.isFinite(Number(member.level)) ? `Lv.${member.level}` : "");
    if (level && level.textContent !== nextLevel) level.textContent = nextLevel;
    if (image && live?.sprite && image.src !== live.sprite) image.src = live.sprite;
    const fainted = live?.fainted ? "true" : "false"; if (item.dataset.fainted !== fainted) item.dataset.fainted = fainted;
    const hasBars = Boolean(live && (live.hpPercent !== null || live.xpPercent !== null));
    if (bars && bars.hidden === hasBars) bars.hidden = !hasBars;
    if (!bars || !hasBars) return;
    const hpFill = bars.querySelector("[data-ppbui-team-presets-member-hp] > i"), xpFill = bars.querySelector("[data-ppbui-team-presets-member-xp] > i");
    const hpWidth = `${live.hpPercent ?? 0}%`, xpWidth = `${live.xpPercent ?? 0}%`;
    if (hpFill.style.width !== hpWidth) hpFill.style.width = hpWidth;
    if (xpFill.style.width !== xpWidth) xpFill.style.width = xpWidth;
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
      const bars = doc.createElement("span"); bars.dataset.ppbuiTeamPresetsMemberBars = ""; bars.hidden = true; bars.setAttribute("aria-hidden", "true");
      const hp = doc.createElement("span"); hp.dataset.ppbuiTeamPresetsMemberHp = ""; hp.append(doc.createElement("i"));
      const xp = doc.createElement("span"); xp.dataset.ppbuiTeamPresetsMemberXp = ""; xp.append(doc.createElement("i"));
      bars.append(hp, xp); item.append(position, level, bars); paintHudVisual(item, member); preview.append(item);
    });
    return preview;
  }

  function renderList() {
    const copy = text(), presets = store.list(); list.replaceChildren();
    if (!presets.length) { const empty = doc.createElement("p"); empty.dataset.ppbuiTeamPresetsStatus = ""; empty.textContent = copy.empty; list.append(empty); return; }
    for (const preset of presets) {
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
      actions.append(editButton, applyButton); head.append(title, actions);

      const preview = presetPreview(preset, copy);
      row.append(head, preview); list.append(row);
    }
  }

  function syncPreviewVisuals() {
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
    const toggleLabel = `${expanded ? "▾" : "▸"} ${copy.toggle}${count ? ` · ${count}` : ""}`;
    if (toggle.textContent !== toggleLabel) toggle.textContent = toggleLabel;
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
    setDisabled(toggle, false); setDisabled(manage, false); setDisabled(name, false); setDisabled(save, !currentTeamSnapshot(root));
    const presets = store.list(), rows = [...list.querySelectorAll("[data-ppbui-team-presets-row]")];
    rows.forEach((row, index) => {
      const buttons = [...row.querySelectorAll("[data-ppbui-team-presets-row-actions] button")];
      setDisabled(buttons[0], false);
      setDisabled(buttons[1], presets[index]?.orderVerified === false);
    });
  }

  function onToggle() { setExpanded(panel.hidden); syncLabels(); if (!panel.hidden) name.focus({ preventScroll: true }); }
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
