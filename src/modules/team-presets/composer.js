import { teamPresetMemberSnapshot, teamPresetsText } from "./dom.js";
import { loadTeamPresetBackpack } from "./runtime.js";

const elementKeys = creature => (creature?.elements || creature?.species?.elements || [])
  .map(value => typeof value === "object" ? (value?.key || value?.id || value?.name || "") : value)
  .map(value => String(value || "").toLowerCase()).filter(Boolean);

const qualityKey = creature => String(creature?.quality || "common").toLowerCase();

const button = (doc, label, className = "") => {
  const node = doc.createElement("button");
  node.type = "button"; node.className = `pokeidle-btn ppbui-button ${className}`.trim(); node.textContent = label;
  return node;
};

const spriteImage = (doc, src, alt, fallbackTag = "small") => {
  const image = doc.createElement("img"); image.src = src; image.alt = alt;
  image.addEventListener("error", () => {
    if (!image.isConnected) return;
    const fallback = doc.createElement(fallbackTag); fallback.dataset.ppbuiTeamPresetSpriteFallback = ""; fallback.textContent = alt || "?"; image.replaceWith(fallback);
  }, { once:true });
  return image;
};

export function mountTeamPresetComposer(root, { store, onChange, setManagerStatus } = {}) {
  const doc = root.ownerDocument, win = doc.defaultView;
  const style = doc.createElement("style"); style.dataset.ppbuiModule = "team-presets-composer";
  style.textContent = `
    [data-ppbui-team-preset-composer] { container-type:inline-size; border-top:var(--ppbui-separator-width) solid var(--ppbui-border); background:var(--ppbui-bg-0); }
    [data-ppbui-team-preset-composer-launch] { display:flex; justify-content:flex-end; padding:var(--ppbui-space-2) var(--ppbui-space-3); }
    [data-ppbui-team-preset-composer-panel] { display:grid; gap:var(--ppbui-space-3); padding:var(--ppbui-space-3); border-top:var(--ppbui-separator-width) solid var(--ppbui-border); background:var(--ppbui-bg-1); }
    [data-ppbui-team-preset-composer-panel][hidden] { display:none!important; }
    [data-ppbui-team-preset-composer-head], [data-ppbui-team-preset-composer-actions], [data-ppbui-team-preset-composer-member-controls] { display:flex; align-items:center; gap:var(--ppbui-space-2); min-width:0; }
    [data-ppbui-team-preset-composer-head] > strong { flex:1 1 auto; color:var(--ppbui-text); font:700 var(--ppbui-font-size-section)/var(--ppbui-line-height-body) var(--ppbui-font-body); }
    [data-ppbui-team-preset-composer-hint] { margin:0; color:var(--ppbui-text-muted); font:400 var(--ppbui-font-size-meta)/var(--ppbui-line-height-body) var(--ppbui-font-body); }
    [data-ppbui-team-preset-composer-name] { display:grid; gap:var(--ppbui-space-1); min-width:0; }
    [data-ppbui-team-preset-composer-name] > span { color:var(--ppbui-text-subtle); font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-data); }
    [data-ppbui-team-preset-composer-name] > input { border-color:var(--ppbui-accent)!important; }
    [data-ppbui-team-preset-composer-formation] { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:0; min-width:0; }
    [data-ppbui-team-preset-composer-slot] { position:relative; box-sizing:border-box; width:100%; min-width:0; height:52px; padding:2px; border:var(--ppbui-separator-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-0)!important; color:var(--ppbui-text); box-shadow:none!important; }
    [data-ppbui-team-preset-composer-slot] + [data-ppbui-team-preset-composer-slot] { border-left:0!important; }
    [data-ppbui-team-preset-composer-slot][data-filled="true"] { cursor:pointer; }
    [data-ppbui-team-preset-composer-slot][aria-pressed="true"] { box-shadow:none!important; }
    [data-ppbui-team-preset-composer-slot][data-active="true"]::after { position:absolute; right:2px; bottom:2px; width:6px; height:6px; background:var(--ppbui-success); content:""; }
    [data-ppbui-team-preset-composer-slot] img { display:block; width:38px; height:38px; margin:auto; object-fit:contain; image-rendering:pixelated; }
    [data-ppbui-team-preset-composer-slot] small { display:block; overflow:hidden; color:var(--ppbui-text-muted); font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data); text-align:center; text-overflow:ellipsis; white-space:nowrap; }
    [data-ppbui-team-preset-composer-member-controls] { justify-content:flex-start; }
    [data-ppbui-team-preset-composer-member-controls] .ppbui-team-preset-direction { position:relative; }
    [data-ppbui-team-preset-composer-member-controls] .ppbui-team-preset-direction::before { box-sizing:border-box; width:8px; height:8px; border-right:2px solid currentColor; border-bottom:2px solid currentColor; content:""; }
    [data-ppbui-team-preset-composer-member-controls] .ppbui-team-preset-direction[data-direction="left"]::before { transform:rotate(135deg) translate(-1px,-1px); }
    [data-ppbui-team-preset-composer-member-controls] .ppbui-team-preset-direction[data-direction="right"]::before { transform:rotate(-45deg) translate(-1px,-1px); }
    [data-ppbui-team-preset-composer-toolbar] { display:grid; grid-template-columns:minmax(140px,1fr) minmax(104px,132px) minmax(104px,132px) auto; gap:var(--ppbui-space-2); min-width:0; }
    [data-ppbui-team-preset-composer-candidates] { display:grid; grid-template-columns:repeat(auto-fill,minmax(128px,1fr)); gap:var(--ppbui-space-2); max-height:260px; overflow:auto; padding:var(--ppbui-space-2); border:var(--ppbui-separator-width) solid var(--ppbui-border); border-radius:var(--ppbui-radius); background:var(--ppbui-bg-0); }
    [data-ppbui-team-preset-composer-candidates][data-empty="true"] { display:none; }
    [data-ppbui-team-preset-candidate] { display:grid; grid-template-columns:38px minmax(0,1fr); gap:var(--ppbui-space-2); align-items:center; box-sizing:border-box; width:100%; min-width:0; height:auto!important; min-height:48px!important; padding:var(--ppbui-space-2); border:var(--ppbui-separator-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-1)!important; color:var(--ppbui-text)!important; box-shadow:none!important; text-align:left; }
    [data-ppbui-team-preset-candidate][aria-pressed="true"] { border-color:var(--ppbui-selected)!important; box-shadow:none!important; }
    [data-ppbui-team-preset-candidate][data-limit="true"] { background:var(--ppbui-bg-0)!important; color:var(--ppbui-text-subtle)!important; opacity:1; }
    [data-ppbui-team-preset-candidate] img { width:38px; height:38px; object-fit:contain; image-rendering:pixelated; }
    [data-ppbui-team-preset-candidate] > [data-ppbui-team-preset-sprite-fallback] { display:grid; width:38px; height:38px; place-items:center; overflow:hidden; color:var(--ppbui-text-subtle); font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data); text-align:center; }
    [data-ppbui-team-preset-candidate-copy] { min-width:0; }
    [data-ppbui-team-preset-candidate-copy] > strong, [data-ppbui-team-preset-candidate-copy] > small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    [data-ppbui-team-preset-candidate-copy] > small { color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-meta); }
    [data-ppbui-team-preset-composer-empty], [data-ppbui-team-preset-composer-status] { margin:0; color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-meta); }
    [data-ppbui-team-preset-composer-empty][hidden] { display:none!important; }
    [data-ppbui-team-preset-composer-status][data-error="true"] { color:var(--ppbui-danger-text); font-weight:700; }
    [data-ppbui-team-preset-composer-actions] { justify-content:flex-end; }
    @container (max-width:419px) {
      [data-ppbui-team-preset-composer-toolbar] { grid-template-columns:minmax(0,1fr) minmax(0,1fr); }
      [data-ppbui-team-preset-composer-toolbar] > input { grid-column:1/-1; }
      [data-ppbui-team-preset-composer-toolbar] > button { grid-column:1/-1; }
      [data-ppbui-team-preset-composer-candidates] { grid-template-columns:1fr; }
    }
  `;

  const host = doc.createElement("div"); host.dataset.ppbuiTeamPresetComposer = "";
  const launch = doc.createElement("div"); launch.dataset.ppbuiTeamPresetComposerLaunch = "";
  const create = button(doc, ""); launch.append(create);
  const panel = doc.createElement("section"); panel.dataset.ppbuiTeamPresetComposerPanel = ""; panel.hidden = true;
  const head = doc.createElement("div"); head.dataset.ppbuiTeamPresetComposerHead = "";
  const title = doc.createElement("strong"), refresh = button(doc, ""); head.append(title, refresh);
  const hint = doc.createElement("p"); hint.dataset.ppbuiTeamPresetComposerHint = "";
  const nameLabel = doc.createElement("label"); nameLabel.dataset.ppbuiTeamPresetComposerName = "";
  const nameCopy = doc.createElement("span"), name = doc.createElement("input"); name.type = "text"; name.name = "ppbui-team-preset-composer-name"; name.maxLength = 40; name.className = "game-window__search ppbui-input"; nameLabel.append(nameCopy, name);
  const formation = doc.createElement("div"); formation.dataset.ppbuiTeamPresetComposerFormation = "";
  const controls = doc.createElement("div"); controls.dataset.ppbuiTeamPresetComposerMemberControls = "";
  const left = button(doc, "", "ppbui-icon-button ppbui-team-preset-direction"), setActive = button(doc, ""), right = button(doc, "", "ppbui-icon-button ppbui-team-preset-direction"), remove = button(doc, "", "ppbui-button--danger"); left.dataset.direction = "left"; right.dataset.direction = "right"; controls.append(left, setActive, right, remove);
  const toolbar = doc.createElement("div"); toolbar.dataset.ppbuiTeamPresetComposerToolbar = "";
  const search = doc.createElement("input"); search.type = "search"; search.name = "ppbui-team-preset-composer-search"; search.className = "game-window__search ppbui-input";
  const element = doc.createElement("select"); element.name = "ppbui-team-preset-composer-element"; element.className = "game-window__select ppbui-select";
  const rarity = doc.createElement("select"); rarity.name = "ppbui-team-preset-composer-rarity"; rarity.className = "game-window__select ppbui-select";
  const clear = button(doc, ""); toolbar.append(search, element, rarity, clear);
  const candidatesHost = doc.createElement("div"); candidatesHost.dataset.ppbuiTeamPresetComposerCandidates = ""; candidatesHost.className = "ppbui-scroll";
  const empty = doc.createElement("p"); empty.dataset.ppbuiTeamPresetComposerEmpty = ""; empty.hidden = true; empty.setAttribute("role", "status");
  const actions = doc.createElement("div"); actions.dataset.ppbuiTeamPresetComposerActions = "";
  const cancel = button(doc, ""), save = button(doc, "", "ppbui-button--primary"); actions.append(cancel, save);
  const status = doc.createElement("p"); status.dataset.ppbuiTeamPresetComposerStatus = ""; status.setAttribute("aria-live", "polite");
  panel.append(head, hint, nameLabel, formation, controls, toolbar, candidatesHost, empty, actions, status); host.append(launch, panel);
  const grid = root.querySelector("[data-ppbui-team-preset-manager-grid]");
  if (grid) grid.before(style, host); else root.append(style, host);

  let candidates = [], selected = [], selectedId = "", activeId = "", loading = false, loaded = false, disposed = false, editingId = "", returnFocus = null;
  let editBaselineIds = new Set();
  const text = () => teamPresetsText(doc);
  const setStatus = (message = "", error = false) => { status.textContent = message; status.dataset.error = String(Boolean(error)); };
  const setText = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  const setAttr = (node, key, value) => { if (node.getAttribute(key) !== value) node.setAttribute(key, value); };

  function syncCopy() {
    const copy = text(), panelTitle = editingId ? copy.editManualTitle : copy.manualTitle;
    setText(create, copy.createManual); setText(title, panelTitle); setText(refresh, copy.refreshBackpack); setText(hint, copy.manualHint); setAttr(panel, "aria-label", panelTitle);
    setText(nameCopy, copy.presetName); if (name.placeholder !== copy.presetName) name.placeholder = copy.presetName; setAttr(name, "aria-label", copy.presetName);
    if (search.placeholder !== copy.search) search.placeholder = copy.search; setAttr(search, "aria-label", copy.search); setAttr(element, "aria-label", copy.element); setAttr(rarity, "aria-label", copy.rarity);
    setText(clear, copy.clear); setText(cancel, copy.cancel); setText(save, editingId ? copy.saveChanges : copy.saveManual);
    const current = selectedId && selectedId === activeId; setText(setActive, current ? copy.active : copy.setActive); setText(remove, copy.removeMember);
  }

  function candidateMember(creature) { return teamPresetMemberSnapshot(doc, creature); }
  function rebuildFilters() {
    const copy = text(), Option = win.Option;
    const elements = [...new Set(candidates.flatMap(elementKeys))].sort();
    const qualities = [...new Set(candidates.map(qualityKey))].sort();
    element.replaceChildren(new Option(`${copy.element}: ${copy.all}`, ""), ...elements.map(value => new Option(win?.PokeIdle?.ElementIcons?.definition?.(value)?.label || value, value)));
    rarity.replaceChildren(new Option(`${copy.rarity}: ${copy.all}`, ""), ...qualities.map(value => new Option(win?.PokeIdle?.t?.(`common.quality_m.${value}`) || value.replace(/^./, letter => letter.toUpperCase()), value)));
  }

  function renderFormation(focusId = "") {
    const copy = text(); formation.replaceChildren();
    for (let index = 0; index < 6; index += 1) {
      const member = selected[index], slot = doc.createElement("button"); slot.type = "button"; slot.dataset.ppbuiTeamPresetComposerSlot = ""; slot.dataset.filled = String(Boolean(member)); slot.disabled = !member;
      if (member) {
        slot.dataset.memberId = member.id; slot.dataset.active = String(member.id === activeId); slot.setAttribute("aria-pressed", String(member.id === selectedId));
        slot.title = `${index + 1}. ${member.name}${member.id === activeId ? ` · ${copy.active}` : ""}`; slot.setAttribute("aria-label", slot.title);
        if (member.sprite) slot.append(spriteImage(doc, member.sprite, member.name));
        else { const fallback = doc.createElement("small"); fallback.textContent = member.name; slot.append(fallback); }
        slot.addEventListener("click", () => { selectedId = member.id; renderFormation(member.id); });
      } else { slot.setAttribute("aria-label", `${index + 1}. —`); slot.setAttribute("aria-pressed", "false"); }
      formation.append(slot);
    }
    syncControls();
    if (focusId) [...formation.querySelectorAll('[data-ppbui-team-preset-composer-slot][data-filled="true"]')].find(node => node.dataset.memberId === focusId)?.focus({ preventScroll:true });
  }

  function syncControls() {
    const copy = text(), index = selected.findIndex(member => member.id === selectedId), member = selected[index], current = member?.id === activeId;
    left.disabled = index <= 0; right.disabled = index < 0 || index >= selected.length - 1; setActive.disabled = !member || current; remove.disabled = !member;
    left.title = copy.moveLeft; left.setAttribute("aria-label", copy.moveLeft); right.title = copy.moveRight; right.setAttribute("aria-label", copy.moveRight); setActive.textContent = current ? copy.active : copy.setActive; setActive.classList.toggle("ppbui-button--primary", Boolean(member && !current)); remove.textContent = copy.removeMember;
  }

  function renderCandidates(focusId = "") {
    const query = search.value.trim().toLocaleLowerCase(), chosenElement = element.value, chosenRarity = rarity.value, selectedIds = new Set(selected.map(member => member.id));
    candidatesHost.replaceChildren(); let visible = 0, focusTarget = null;
    for (const creature of candidates) {
      const member = candidateMember(creature); if (!member) continue;
      const match = (!query || member.name.toLocaleLowerCase().includes(query)) && (!chosenElement || elementKeys(creature).includes(chosenElement)) && (!chosenRarity || qualityKey(creature) === chosenRarity);
      if (!match) continue; visible++;
      const candidate = doc.createElement("button"); candidate.type = "button"; candidate.dataset.ppbuiTeamPresetCandidate = ""; candidate.dataset.memberId = member.id;
      const chosen = selectedIds.has(member.id), limit = !chosen && selected.length >= 6; candidate.setAttribute("aria-pressed", String(chosen)); candidate.dataset.limit = String(limit); candidate.setAttribute("aria-disabled", String(limit));
      if (member.sprite) candidate.append(spriteImage(doc, member.sprite, member.name, "span"));
      else { const fallback = doc.createElement("span"); fallback.dataset.ppbuiTeamPresetSpriteFallback = ""; fallback.textContent = member.name; candidate.append(fallback); }
      const copy = doc.createElement("span"); copy.dataset.ppbuiTeamPresetCandidateCopy = ""; const strong = doc.createElement("strong"); strong.textContent = member.name; const meta = doc.createElement("small");
      const quality = qualityKey(creature), qualityLabel = win?.PokeIdle?.t?.(`common.quality_m.${quality}`) || quality.replace(/^./, letter => letter.toUpperCase());
      meta.textContent = `${Number.isFinite(Number(member.level)) ? `Lv.${member.level} · ` : ""}${qualityLabel}`; copy.append(strong, meta); candidate.append(copy);
      candidate.addEventListener("click", () => {
        if (disposed) return;
        if (chosen) {
          selected = selected.filter(entry => entry.id !== member.id); if (activeId === member.id) activeId = selected[0]?.id || ""; if (selectedId === member.id) selectedId = selected[0]?.id || "";
        } else if (selected.length < 6) {
          selected.push(member); selectedId = member.id; if (!activeId) activeId = member.id;
        } else return setStatus(text().teamFull, true);
        setStatus(); renderFormation(); renderCandidates(member.id); syncSave();
      });
      candidatesHost.append(candidate);
      if (member.id === focusId) focusTarget = candidate;
    }
    candidatesHost.dataset.empty = String(visible === 0);
    setText(empty, candidates.length ? text().noBackpackResults : text().noBackpackPokemon);
    empty.hidden = visible > 0 || loading; clear.disabled = !query && !chosenElement && !chosenRarity;
    focusTarget?.focus({ preventScroll:true });
  }

  function syncSave() { save.disabled = !name.value.trim() || !selected.length || loading; }
  async function load({ force = false } = {}) {
    if (loading || disposed || (loaded && !force)) return;
    loading = true; refresh.disabled = true; empty.hidden = true; setStatus(text().loadingBackpack); syncSave();
    let succeeded = false;
    try {
      const result = await loadTeamPresetBackpack(doc); if (disposed) return;
      if (!result) throw new Error("backpack-unavailable");
      const seen = new Set();
      candidates = result.filter(creature => { const id = String(creature?.id ?? "").trim(); if (!id || seen.has(id)) return false; seen.add(id); return true; });
      const available = new Map(candidates.map(creature => { const member = candidateMember(creature); return member ? [member.id, member] : null; }).filter(Boolean));
      const previousCount = selected.length;
      selected = selected.map(member => available.get(member.id) || (editingId && editBaselineIds.has(member.id) ? member : null)).filter(Boolean);
      if (!selected.some(member => member.id === activeId)) activeId = selected[0]?.id || "";
      if (!selected.some(member => member.id === selectedId)) selectedId = selected[0]?.id || "";
      loaded = true; rebuildFilters(); setStatus(previousCount > selected.length ? text().backpackSelectionUpdated : ""); renderFormation(); renderCandidates();
      succeeded = true;
    } catch { if (!disposed) setStatus(text().backpackLoadFailed, true); }
    finally {
      loading = false;
      if (!disposed) {
        refresh.disabled = false;
        empty.hidden = !succeeded || candidatesHost.dataset.empty !== "true";
        syncSave();
      }
    }
  }
  function reset({ preserveMode = false } = {}) {
    selected = []; selectedId = activeId = ""; name.value = ""; search.value = ""; element.value = ""; rarity.value = ""; setStatus();
    if (!preserveMode) { editingId = ""; editBaselineIds = new Set(); }
    syncCopy(); renderFormation(); renderCandidates(); syncSave();
  }
  function openCreate() {
    if (disposed) return;
    returnFocus = create; editingId = ""; editBaselineIds = new Set(); panel.hidden = false; create.hidden = true; reset({ preserveMode:true });
    if (!loaded) load(); name.focus({ preventScroll: true });
  }
  function openEdit(preset, trigger = null) {
    if (disposed) return false;
    if (!preset?.id || !Array.isArray(preset.members) || !preset.members.length) return false;
    returnFocus = trigger; editingId = String(preset.id); editBaselineIds = new Set(preset.members.map(member => String(member.id)));
    panel.hidden = false; create.hidden = true; search.value = ""; element.value = ""; rarity.value = ""; setStatus();
    selected = preset.members.slice(0, 6).map(member => ({ ...member })); activeId = selected.some(member => member.id === preset.activeId) ? preset.activeId : selected[0]?.id || ""; selectedId = selected[0]?.id || ""; name.value = preset.name || "";
    syncCopy(); renderFormation(); renderCandidates(); syncSave(); if (!loaded) load(); name.focus({ preventScroll:true }); return true;
  }
  function close() {
    if (disposed) return;
    const previousEditingId = editingId, preferred = returnFocus; panel.hidden = true; create.hidden = false; returnFocus = null; reset();
    const replacement = previousEditingId ? [...root.querySelectorAll("[data-ppbui-team-preset-card]")].find(node => node.dataset.presetId === previousEditingId)?.querySelector("[data-ppbui-team-preset-edit]") : null;
    (replacement || (preferred?.isConnected ? preferred : null) || create).focus?.({ preventScroll:true });
  }

  create.addEventListener("click", openCreate); cancel.addEventListener("click", close); refresh.addEventListener("click", () => load({ force:true }));
  search.addEventListener("input", renderCandidates); element.addEventListener("change", renderCandidates); rarity.addEventListener("change", renderCandidates);
  clear.addEventListener("click", () => { if (disposed) return; search.value = ""; element.value = ""; rarity.value = ""; renderCandidates(); search.focus({ preventScroll: true }); });
  name.addEventListener("input", syncSave);
  left.addEventListener("click", () => { if (disposed) return; const index = selected.findIndex(member => member.id === selectedId); if (index > 0) { [selected[index - 1], selected[index]] = [selected[index], selected[index - 1]]; renderFormation(); } });
  right.addEventListener("click", () => { if (disposed) return; const index = selected.findIndex(member => member.id === selectedId); if (index >= 0 && index < selected.length - 1) { [selected[index + 1], selected[index]] = [selected[index], selected[index + 1]]; renderFormation(); } });
  setActive.addEventListener("click", () => { if (disposed) return; if (selected.some(member => member.id === selectedId)) { activeId = selectedId; renderFormation(); } });
  remove.addEventListener("click", () => { if (disposed) return; const id = selectedId; if (!id) return; selected = selected.filter(member => member.id !== id); if (activeId === id) activeId = selected[0]?.id || ""; selectedId = selected[0]?.id || ""; renderFormation(); renderCandidates(); syncSave(); });
  save.addEventListener("click", () => {
    if (disposed) return;
    const copy = text(), presetName = name.value.trim();
    if (!presetName) return setStatus(copy.nameRequired, true);
    if (!selected.length) return setStatus(copy.chooseMembers, true);
    const snapshot = { members:selected, activeId: activeId || selected[0].id, orderVerified:true };
    const result = editingId ? store?.updatePreset?.(editingId, presetName, snapshot) : store?.upsert?.(presetName, snapshot);
    if (!result) return setStatus(copy.updateFailed, true);
    setManagerStatus?.(editingId ? copy.manualUpdated : (result.created ? copy.manualSaved : copy.updated), false); onChange?.(); close();
  });

  syncCopy(); rebuildFilters(); renderFormation(); renderCandidates(); syncSave();
  return { sync: syncCopy, edit: openEdit, cleanup() { disposed = true; style.remove(); host.remove(); } };
}
