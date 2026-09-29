import { teamPresetsConfig as config } from "./config.js";
import { applyTeamPreset, captureTeamPresetSnapshot, openTeamPresetManagement } from "./actions.js";
import { canCaptureTeamPreset, teamPresetVisualReader, teamPresetsText } from "./dom.js";
import { mountTeamPresetManager } from "./manager.js";
import { createTeamPresetStorage } from "./storage.js";

export function mountTeamPresets(root, { store = createTeamPresetStorage(), apply = applyTeamPreset, capture = captureTeamPresetSnapshot } = {}) {
  const doc = root.ownerDocument, win = doc.defaultView;
  let busy = false, disposed = false, manager = null, managerRoot = null, readVisual;

  const style = doc.createElement("style"); style.dataset.ppbuiModule = config.id;
  style.textContent = `
    [data-ppbui-team-presets] { display:grid; box-sizing:border-box; width:100%; min-width:0; gap:0; margin-top:0; padding-top:var(--ppbui-space-2); border-top:var(--ppbui-separator-width) solid var(--ppbui-border); color:var(--ppbui-text); font:var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body); }
    body:not(.pokeidle-mobile-portrait) .pokeidle-team-hud.is-collapsed > [data-ppbui-team-presets] { display:none!important; }
    [data-ppbui-team-presets-toolbar] { display:grid; box-sizing:border-box; width:100%; grid-template-columns:minmax(0,1fr) auto; align-items:stretch; gap:0; min-width:0; border:var(--ppbui-separator-width) solid var(--ppbui-border); border-radius:var(--ppbui-radius); background:var(--ppbui-bg-1); }
    [data-ppbui-team-presets-toolbar] > .ppbui-team-presets-toggle { min-width:0; justify-content:flex-start!important; border:0!important; background:transparent!important; color:var(--ppbui-text)!important; text-align:left; }
    [data-ppbui-team-presets-toolbar] > .ppbui-team-presets-toggle:disabled { background:var(--ppbui-bg-1)!important; color:var(--ppbui-text-subtle)!important; }
    .ppbui-team-presets-toggle { gap:var(--ppbui-space-3); white-space:nowrap; }
    .ppbui-team-presets-toggle::before { box-sizing:border-box; width:8px; height:8px; flex:0 0 8px; border-right:2px solid var(--ppbui-text-muted); border-bottom:2px solid var(--ppbui-text-muted); content:""; transform:rotate(-45deg); }
    .ppbui-team-presets-toggle[aria-expanded="true"]::before { transform:rotate(45deg) translate(-1px,-1px); }
    .ppbui-team-presets-toggle-label { min-width:0; overflow:hidden; text-overflow:ellipsis; }
    .ppbui-team-presets-toggle-count { flex:0 0 auto; margin-left:auto; color:var(--ppbui-text-subtle); font-weight:400; }
    [data-ppbui-team-presets-toolbar] > .ppbui-team-presets-manage { border:0!important; border-left:var(--ppbui-separator-width) solid var(--ppbui-border)!important; background:transparent!important; color:var(--ppbui-text-muted)!important; white-space:nowrap; }
    [data-ppbui-team-presets-toolbar] > .ppbui-team-presets-manage:hover:not(:disabled) { background:var(--ppbui-bg-2)!important; color:var(--ppbui-text)!important; }
    [data-ppbui-team-presets-toolbar] > .ppbui-team-presets-manage:disabled { background:var(--ppbui-bg-1)!important; color:var(--ppbui-text-subtle)!important; }
    [data-ppbui-team-presets-panel] { display:grid; box-sizing:border-box; width:100%; gap:0; padding:0; border:var(--ppbui-separator-width) solid var(--ppbui-border); border-top:0; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-0); }
    [data-ppbui-team-presets] :where(button,input,select,textarea) { border-radius:var(--ppbui-radius)!important; }
    [data-ppbui-team-presets-panel][hidden] { display:none!important; }
    [data-ppbui-team-presets-save] { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:var(--ppbui-space-2); padding:var(--ppbui-space-3); border-top:var(--ppbui-separator-width) solid var(--ppbui-border); background:var(--ppbui-bg-1); }
    .pokeidle-team-hud [data-ppbui-team-presets] [data-ppbui-team-presets-save] > input.game-window__search.ppbui-input { -webkit-appearance:none!important; appearance:none!important; box-sizing:border-box!important; width:100%!important; height:var(--ppbui-control-height)!important; min-height:var(--ppbui-control-height)!important; margin:0!important; padding:0 var(--ppbui-control-padding-x)!important; border:var(--ppbui-border-width) solid var(--ppbui-accent)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-0)!important; background-image:none!important; clip-path:none!important; color:var(--ppbui-text)!important; box-shadow:none!important; filter:none!important; font:400 var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important; text-shadow:none!important; transition:none!important; transform:none!important; }
    .pokeidle-team-hud [data-ppbui-team-presets] [data-ppbui-team-presets-save] > input.game-window__search.ppbui-input::placeholder { color:var(--ppbui-text-subtle)!important; opacity:1; }
    .pokeidle-team-hud [data-ppbui-team-presets] [data-ppbui-team-presets-save] > input.game-window__search.ppbui-input:focus { border-color:var(--ppbui-accent)!important; outline:none!important; }
    .pokeidle-team-hud [data-ppbui-team-presets] [data-ppbui-team-presets-save] > input.game-window__search.ppbui-input:focus-visible { outline:var(--ppbui-border-width) solid var(--ppbui-focus)!important; outline-offset:var(--ppbui-pixel-unit); }
    [data-ppbui-team-presets-list] { display:grid; box-sizing:border-box; width:100%; min-width:0; gap:0; max-height:220px; overflow:auto; scrollbar-gutter:auto; }
    .pokeidle-team-hud [data-ppbui-team-presets] [data-ppbui-team-presets-list] { scrollbar-width:auto!important; scrollbar-color:var(--ppbui-scrollbar-thumb) var(--ppbui-scrollbar-track)!important; }
    .pokeidle-team-hud [data-ppbui-team-presets] [data-ppbui-team-presets-list]::-webkit-scrollbar { width:var(--ppbui-scrollbar-size)!important; height:var(--ppbui-scrollbar-size)!important; }
    .pokeidle-team-hud [data-ppbui-team-presets] [data-ppbui-team-presets-list]::-webkit-scrollbar-track { border:var(--ppbui-separator-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-scrollbar-track)!important; box-shadow:none!important; }
    .pokeidle-team-hud [data-ppbui-team-presets] [data-ppbui-team-presets-list]::-webkit-scrollbar-thumb { border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-scrollbar-thumb)!important; background-clip:border-box!important; box-shadow:none!important; }
    .pokeidle-team-hud [data-ppbui-team-presets] [data-ppbui-team-presets-list]::-webkit-scrollbar-thumb:hover { background:var(--ppbui-scrollbar-thumb-hover)!important; }
    .pokeidle-team-hud [data-ppbui-team-presets] [data-ppbui-team-presets-list]::-webkit-scrollbar-corner { border-radius:var(--ppbui-radius)!important; background:var(--ppbui-scrollbar-track)!important; }
    .pokeidle-team-hud [data-ppbui-team-presets] [data-ppbui-team-presets-list]::-webkit-scrollbar-button { display:none!important; width:0!important; height:0!important; }
    @supports selector(::-webkit-scrollbar) {
      .pokeidle-team-hud [data-ppbui-team-presets] [data-ppbui-team-presets-list] { scrollbar-color:auto!important; }
    }
    [data-ppbui-team-presets-row] { display:grid; grid-template-rows:auto auto; gap:0; min-width:0; padding:0; border:0; border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border); border-radius:var(--ppbui-radius); background:var(--ppbui-bg-1); }
    [data-ppbui-team-presets-row:last-child] { border-bottom:0; }
    [data-ppbui-team-presets-row-head] { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:var(--ppbui-space-2); min-width:0; padding:var(--ppbui-space-2) var(--ppbui-space-3); }
    [data-ppbui-team-presets-title] { display:flex; align-items:baseline; gap:var(--ppbui-space-2); min-width:0; }
    [data-ppbui-team-presets-name] { min-width:0; overflow:hidden; color:var(--ppbui-text); font-weight:700; text-overflow:ellipsis; white-space:nowrap; }
    [data-ppbui-team-presets-count] { flex:0 0 auto; color:var(--ppbui-text-subtle); font:600 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-data); }
    [data-ppbui-team-presets-row-actions] { justify-content:flex-end; flex-wrap:nowrap; }
    [data-ppbui-team-presets-row-actions] > [data-ppbui-team-preset-action="apply"]::before,
    [data-ppbui-team-presets-row-actions] > [data-ppbui-team-preset-action="apply"]::after,
    [data-ppbui-team-presets-save] > button::before,
    [data-ppbui-team-presets-save] > button::after { display:none!important; content:none!important; }
    [data-ppbui-team-presets-members] { display:grid; box-sizing:border-box; grid-template-columns:repeat(6,minmax(0,1fr)); gap:0; width:100%; min-width:0; overflow:hidden; justify-self:stretch; }
    [data-ppbui-team-presets-member].ppbui-pokemon-card--preset { min-width:0; min-height:44px; height:44px; border-width:var(--ppbui-separator-width)!important; }
    [data-ppbui-team-presets-member].ppbui-pokemon-card--preset + [data-ppbui-team-presets-member].ppbui-pokemon-card--preset { border-left:0!important; }
    [data-ppbui-team-presets-member] .ppbui-pokemon-card__visual img { display:block; image-rendering:pixelated; }
    [data-ppbui-team-presets-member-fallback] { max-width:36px; overflow:hidden; color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-meta); text-overflow:clip; white-space:nowrap; }
    [data-ppbui-team-presets-member][data-empty="true"] { background:var(--ppbui-bg-0)!important; }
    [data-ppbui-team-presets-status] { margin:0; color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-meta); }
    [data-ppbui-team-presets-status]:empty { display:none; }
    [data-ppbui-team-presets-status][data-error="true"] { color:var(--ppbui-danger-text); font-weight:700; }
    @media (pointer:coarse) {
      [data-ppbui-team-presets-toolbar] > button,
      [data-ppbui-team-presets-save] > button,
      [data-ppbui-team-presets-row-actions] > button { min-height:40px!important; }
    }
  `;

  const host = doc.createElement("div"); host.className = "ppbui-root"; host.dataset.ppbuiTeamPresets = ""; host.dataset.ppbuiModule = config.id;
  const toolbar = doc.createElement("div"); toolbar.dataset.ppbuiTeamPresetsToolbar = "";
  const toggle = doc.createElement("button"); toggle.type = "button"; toggle.className = "pokeidle-btn ppbui-button ppbui-button--ghost ppbui-team-presets-toggle";
  const toggleLabelNode = doc.createElement("span"); toggleLabelNode.className = "ppbui-team-presets-toggle-label";
  const toggleCount = doc.createElement("span"); toggleCount.className = "ppbui-team-presets-toggle-count";
  toggle.append(toggleLabelNode, doc.createTextNode(" "), toggleCount);
  const manage = doc.createElement("button"); manage.type = "button"; manage.className = "pokeidle-btn ppbui-button ppbui-team-presets-manage";
  const panel = doc.createElement("div"); panel.dataset.ppbuiTeamPresetsPanel = ""; panel.hidden = true; panel.style.display = "none";
  const saveRow = doc.createElement("div"); saveRow.dataset.ppbuiTeamPresetsSave = "";
  const name = doc.createElement("input"); name.type = "text"; name.name = "ppbui-team-presets-save-name"; name.maxLength = 40; name.className = "game-window__search ppbui-input";
  const save = doc.createElement("button"); save.type = "button"; save.className = "pokeidle-btn ppbui-button";
  const list = doc.createElement("div"); list.dataset.ppbuiTeamPresetsList = ""; list.className = "ppbui-scroll";
  const status = doc.createElement("p"); status.dataset.ppbuiTeamPresetsStatus = ""; status.setAttribute("aria-live", "polite");
  saveRow.append(name, save); panel.append(list, saveRow, status); toolbar.append(toggle, manage); host.append(toolbar, panel); root.append(style, host);

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

  function notifyChanged() { if (disposed) return; renderList(); manager?.sync(); syncLabels(); }

  async function runExclusive(task) {
    if (busy || disposed) return { ok: false, reason: busy ? "busy" : "disposed" };
    busy = true; host.setAttribute("aria-busy", "true"); host.querySelectorAll("button,input").forEach(node => setDisabled(node, true));
    try { return await task(); }
    catch (error) { return { ok: false, reason: error?.message || "unexpected-error" }; }
    finally { busy = false; if (!disposed) { host.removeAttribute("aria-busy"); sync(); } }
  }

  function liveHudVisual(member) {
    const visual = readVisual(member), creature = visual.creature, card = visual.card;
    if (!creature && !card && !visual.sprite && !visual.elementColor) return null;
    return { sprite: visual.sprite, elementColor: visual.elementColor };
  }

  function paintHudVisual(item, member) {
    const live = liveHudVisual(member);
    let image = item.querySelector("img");
    if (live?.sprite) {
      if (!image) {
        image = doc.createElement("img"); image.alt = member.name;
        const fallback = item.querySelector("[data-ppbui-team-presets-member-fallback]");
        fallback ? fallback.replaceWith(image) : item.prepend(image);
      }
      if (image.getAttribute("src") !== live.sprite) image.src = live.sprite;
    }
    const color = live?.elementColor || "";
    if (item.style.getPropertyValue("--ppbui-pokemon-card-accent") !== color) color ? item.style.setProperty("--ppbui-pokemon-card-accent", color) : item.style.removeProperty("--ppbui-pokemon-card-accent");
  }

  function presetPreview(preset, copy) {
    const preview = doc.createElement("div"); preview.dataset.ppbuiTeamPresetsMembers = ""; preview.setAttribute("role", "list");
    const description = preset.members.map((member, index) => `${index + 1}. ${member.name}${member.id === preset.activeId ? ` · ${copy.active}` : ""}`).join("; ");
    preview.title = description; preview.setAttribute("aria-label", description);
    for (let index = 0; index < 6; index += 1) {
      const member = preset.members[index], item = doc.createElement("span");
      item.className = "ppbui-pokemon-card ppbui-pokemon-card--preset"; item.dataset.ppbuiTeamPresetsMember = ""; item.setAttribute("role", "listitem");
      const position = doc.createElement("span"); position.className = "ppbui-pokemon-card__position"; position.dataset.ppbuiTeamPresetsMemberPosition = ""; position.textContent = String(index + 1);
      const visual = doc.createElement("span"); visual.className = "ppbui-pokemon-card__visual";
      if (!member) {
        item.dataset.empty = "true"; item.setAttribute("aria-label", `${index + 1}. —`); item.append(position, visual); preview.append(item); continue;
      }
      const live = liveHudVisual(member), sprite = live?.sprite || member.sprite;
      item.dataset.memberId = member.id; item.dataset.active = String(member.id === preset.activeId); item.classList.toggle("ppbui-pokemon-card--active", member.id === preset.activeId);
      item.title = `${index + 1}. ${member.name}${member.level ? ` · Lv.${member.level}` : ""}${member.id === preset.activeId ? ` · ${copy.active}` : ""}`; item.setAttribute("aria-label", item.title);
      if (sprite) {
        const image = doc.createElement("img"); image.src = sprite; image.alt = member.name;
        image.addEventListener("error", () => {
          if (!image.isConnected) return;
          const fallback = doc.createElement("span"); fallback.dataset.ppbuiTeamPresetsMemberFallback = ""; fallback.textContent = member.name.slice(0, 3).toUpperCase(); image.replaceWith(fallback);
        }, { once:true });
        visual.append(image);
      }
      else { const fallback = doc.createElement("span"); fallback.dataset.ppbuiTeamPresetsMemberFallback = ""; fallback.textContent = member.name.slice(0, 3).toUpperCase(); visual.append(fallback); }
      item.append(position, visual); paintHudVisual(item, member); preview.append(item);
    }
    return preview;
  }

  function renderList() {
    readVisual = teamPresetVisualReader(root, { resolveSprites: true });
    const copy = text(), presets = store.list(); list.replaceChildren();
    if (!presets.length) { const empty = doc.createElement("p"); empty.dataset.ppbuiTeamPresetsStatus = ""; empty.textContent = copy.empty; list.append(empty); return; }
    for (const preset of presets) {
      const row = doc.createElement("div"); row.dataset.ppbuiTeamPresetsRow = "";
      const head = doc.createElement("div"); head.dataset.ppbuiTeamPresetsRowHead = "";
      const title = doc.createElement("div"); title.dataset.ppbuiTeamPresetsTitle = "";
      const label = doc.createElement("span"); label.dataset.ppbuiTeamPresetsName = ""; label.textContent = preset.name; label.title = preset.name;
      const count = doc.createElement("span"); count.dataset.ppbuiTeamPresetsCount = ""; count.textContent = `${preset.members.length}/6`;
      title.append(label, count);

      const actions = doc.createElement("div"); actions.dataset.ppbuiTeamPresetsRowActions = ""; actions.className = "ppbui-action-row";
      const applyButton = doc.createElement("button"); applyButton.type = "button"; applyButton.className = "pokeidle-btn ppbui-button ppbui-button--primary"; applyButton.dataset.ppbuiTeamPresetAction = "apply"; applyButton.textContent = copy.apply; applyButton.dataset.primary = "true"; applyButton.disabled = preset.orderVerified === false;
      applyButton.title = `${copy.apply}: ${preset.name}`; applyButton.setAttribute("aria-label", applyButton.title);
      applyButton.addEventListener("click", async () => {
        if (disposed) return;
        setStatus(copy.applying); const result = await runExclusive(() => apply(doc, preset));
        if (disposed) return;
        setStatus(result?.ok ? copy.applied : errorMessage(result, preset), !result?.ok);
      });
      actions.append(applyButton); head.append(title, actions);

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
    if (disposed) return;
    if (managerRoot === nextRoot && manager) return;
    manager?.cleanup(); manager = null; managerRoot = nextRoot || null;
    if (!nextRoot) return;
    manager = mountTeamPresetManager(nextRoot, { store, hudRoot: root, apply, capture, runExclusive, onChange: notifyChanged });
  }

  function syncManager() {
    if (disposed) return;
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
    const toggleLabel = copy.toggle;
    if (toggleLabelNode.textContent !== toggleLabel) toggleLabelNode.textContent = toggleLabel;
    const countLabel = copy.savedCount(count);
    if (toggleCount.textContent !== countLabel) toggleCount.textContent = countLabel;
    if (toggle.getAttribute("aria-expanded") !== String(expanded)) toggle.setAttribute("aria-expanded", String(expanded));
    const manageTitle = copy.manage;
    if (manage.textContent !== manageTitle) manage.textContent = manageTitle;
    if (manage.title !== manageTitle) { manage.title = manageTitle; manage.setAttribute("aria-label", manageTitle); }
    if (name.placeholder !== copy.presetName) name.placeholder = copy.presetName;
    if (name.getAttribute("aria-label") !== copy.presetName) name.setAttribute("aria-label", copy.presetName);
    const saveTitle = copy.save;
    if (save.textContent !== saveTitle) save.textContent = saveTitle;
    if (save.title !== saveTitle) { save.title = saveTitle; save.setAttribute("aria-label", saveTitle); }
    list.querySelectorAll('[data-ppbui-team-preset-action="apply"]').forEach(button => { if (button.textContent !== copy.apply) button.textContent = copy.apply; });
  }

  function sync() {
    if (disposed) return;
    syncLabels(); syncManager(); syncPreviewVisuals();
    if (busy) return;
    setDisabled(toggle, false); setDisabled(manage, false); setDisabled(name, false); setDisabled(save, !canCaptureTeamPreset(root));
    const presets = store.list(), rows = [...list.querySelectorAll("[data-ppbui-team-presets-row]")];
    rows.forEach((row, index) => {
      const applyButton = row.querySelector('[data-ppbui-team-preset-action="apply"]');
      setDisabled(applyButton, presets[index]?.orderVerified === false);
    });
  }

  function onToggle() {
    setExpanded(panel.hidden); syncLabels();
    if (!panel.hidden) {
      syncPreviewVisuals({ resolveSprites: true, retryMissing: true });
      (list.querySelector('[data-ppbui-team-preset-action="apply"]') || name).focus({ preventScroll: true });
    }
  }
  async function onManage() {
    const teamRoot = await openTeamPresetManagement(doc);
    if (disposed) return;
    if (!teamRoot) return setStatus(text().errors["team-panel-unavailable"], true);
    mountManager(teamRoot); manager?.open();
  }
  async function onSave() {
    const copy = text(), presetName = name.value.trim();
    if (!presetName) return setStatus(copy.nameRequired, true);
    const captured = await runExclusive(() => capture(doc, root));
    if (disposed) return;
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
    disposed = true;
    toggle.removeEventListener("click", onToggle); manage.removeEventListener("click", onManage); save.removeEventListener("click", onSave); win?.removeEventListener("storage", onStorage);
    manager?.cleanup(); manager = null; managerRoot = null; host.remove(); style.remove();
  } };
}
