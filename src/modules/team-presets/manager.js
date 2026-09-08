import { teamPresetsConfig as config } from "./config.js";
import { teamPresetsText } from "./dom.js";

function errorMessage(copy, result, preset) {
  if (result?.reason === "member-unavailable" && result.missingIds?.length) {
    const missing = result.missingIds.map(id => preset.members.find(member => member.id === id)?.name || id).join(", ");
    return `${copy.errors[result.reason]} ${missing}`;
  }
  return copy.errors[result?.reason] || result?.reason || copy.errors["final-state-mismatch"];
}

export function mountTeamPresetManager(root, { store, hudRoot, apply, capture, runExclusive, onChange } = {}) {
  const doc = root.ownerDocument, win = doc.defaultView;
  const style = doc.createElement("style"); style.dataset.ppbuiModule = `${config.id}-manager`;
  style.textContent = `
    [data-ppbui-team-preset-manager] { margin-top:10px; }
    [data-ppbui-team-preset-manager] > summary { cursor:pointer; color:var(--ui-gold-light,#f1d681); font-weight:700; }
    [data-ppbui-team-preset-manager-grid] { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:8px; margin-top:8px; }
    [data-ppbui-team-preset-card] { box-sizing:border-box; min-width:260px; min-height:124px; display:grid; grid-template-rows:auto 1fr auto; gap:6px; padding:8px; }
    [data-ppbui-team-preset-card-head], [data-ppbui-team-preset-card-foot] { display:flex; align-items:center; gap:4px; min-width:0; }
    [data-ppbui-team-preset-card-head] > input { flex:1 1 auto; min-width:0; }
    [data-ppbui-team-preset-card-head] > button, [data-ppbui-team-preset-card-foot] > button { flex:0 0 auto; min-height:0; padding:4px 6px; }
    [data-ppbui-team-preset-members] { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:3px; align-items:center; min-width:0; }
    [data-ppbui-team-preset-member] { position:relative; display:grid; grid-template-rows:34px 14px; place-items:center; min-width:0; min-height:54px; padding:2px 1px; border:1px solid rgba(255,255,255,.12); }
    [data-ppbui-team-preset-member][data-active="true"] { border-color:var(--ui-gold-light,#f1d681); }
    [data-ppbui-team-preset-member] img { display:block; max-width:34px; max-height:34px; image-rendering:pixelated; }
    [data-ppbui-team-preset-member-fallback] { overflow:hidden; max-width:34px; font-size:9px; text-overflow:ellipsis; white-space:nowrap; }
    [data-ppbui-team-preset-member-position] { position:absolute; top:1px; left:2px; font-size:8px; opacity:.75; }
    [data-ppbui-team-preset-member-controls] { display:flex; gap:1px; }
    [data-ppbui-team-preset-member-controls] > button { min-width:0; min-height:0; padding:0 3px; font-size:9px; line-height:13px; }
    [data-ppbui-team-preset-review] { margin:0; font-size:9px; font-weight:700; }
    [data-ppbui-team-preset-manager-status] { margin:6px 0 0; font-size:9px; }
  `;

  const details = doc.createElement("details"); details.className = "team-section"; details.dataset.ppbuiModule = config.id; details.dataset.ppbuiTeamPresetManager = "";
  const summary = doc.createElement("summary"), grid = doc.createElement("div"), status = doc.createElement("p");
  grid.dataset.ppbuiTeamPresetManagerGrid = ""; status.dataset.ppbuiTeamPresetManagerStatus = ""; status.setAttribute("aria-live", "polite");
  details.append(summary, grid, status); root.append(style);
  let signature = "";

  function ensureMounted() {
    if (details.isConnected && root.contains(details)) return;
    const roster = root.querySelector(config.selectors.teamRoster), body = root.querySelector(config.selectors.teamBody);
    if (roster) roster.after(details); else body?.prepend(details);
  }

  const text = () => teamPresetsText(doc);
  function setStatus(message = "", error = false) {
    if (status.textContent !== message) status.textContent = message;
    const value = error ? "true" : "false"; if (status.dataset.error !== value) status.dataset.error = value;
  }
  function changed() { signature = ""; onChange?.(); render(); }

  async function execute(preset, task) {
    const copy = text(); setStatus(copy.applying);
    const result = await runExclusive(task);
    setStatus(result?.ok ? copy.applied : errorMessage(copy, result, preset), !result?.ok);
    sync(); return result;
  }

  function memberCell(preset, member, index, copy) {
    const cell = doc.createElement("div"); cell.dataset.ppbuiTeamPresetMember = ""; cell.dataset.active = String(preset.activeId === member.id); cell.title = `${index + 1}. ${member.name}${preset.activeId === member.id ? ` · ${copy.active}` : ""}`;
    const position = doc.createElement("span"); position.dataset.ppbuiTeamPresetMemberPosition = ""; position.textContent = String(index + 1);
    if (member.sprite) { const img = doc.createElement("img"); img.src = member.sprite; img.alt = member.name; cell.append(position, img); }
    else { const fallback = doc.createElement("span"); fallback.dataset.ppbuiTeamPresetMemberFallback = ""; fallback.textContent = member.name; cell.append(position, fallback); }
    const controls = doc.createElement("div"); controls.dataset.ppbuiTeamPresetMemberControls = "";
    const left = doc.createElement("button"); left.type = "button"; left.className = "pokeidle-btn"; left.textContent = "←"; left.title = copy.moveLeft; left.disabled = index === 0;
    const active = doc.createElement("button"); active.type = "button"; active.className = "pokeidle-btn"; active.textContent = "A"; active.title = copy.setActive; active.disabled = preset.activeId === member.id;
    const right = doc.createElement("button"); right.type = "button"; right.className = "pokeidle-btn"; right.textContent = "→"; right.title = copy.moveRight; right.disabled = index === preset.members.length - 1;
    left.addEventListener("click", () => { if (store.moveMember(preset.id, member.id, -1)) changed(); });
    right.addEventListener("click", () => { if (store.moveMember(preset.id, member.id, 1)) changed(); });
    active.addEventListener("click", () => { if (store.setActive(preset.id, member.id)) changed(); });
    controls.append(left, active, right); cell.append(controls); return cell;
  }

  function render() {
    const presets = store.list(), nextSignature = JSON.stringify(presets);
    if (signature === nextSignature) return; signature = nextSignature;
    const copy = text(); grid.replaceChildren();
    if (!presets.length) { const empty = doc.createElement("p"); empty.textContent = copy.empty; grid.append(empty); return; }
    presets.forEach((preset, presetIndex) => {
      const card = doc.createElement("section"); card.className = "team-section"; card.dataset.ppbuiTeamPresetCard = "";
      const head = doc.createElement("div"); head.dataset.ppbuiTeamPresetCardHead = "";
      const rename = doc.createElement("input"); rename.type = "text"; rename.maxLength = 40; rename.className = "game-window__search"; rename.value = preset.name; rename.setAttribute("aria-label", copy.presetName);
      const up = doc.createElement("button"); up.type = "button"; up.className = "pokeidle-btn"; up.textContent = "↑"; up.title = copy.moveUp; up.disabled = presetIndex === 0;
      const down = doc.createElement("button"); down.type = "button"; down.className = "pokeidle-btn"; down.textContent = "↓"; down.title = copy.moveDown; down.disabled = presetIndex === presets.length - 1;
      const remove = doc.createElement("button"); remove.type = "button"; remove.className = "pokeidle-btn"; remove.textContent = "×"; remove.title = copy.remove;
      rename.addEventListener("change", () => { if (!store.rename(preset.id, rename.value)) rename.value = preset.name; else changed(); });
      up.addEventListener("click", () => { if (store.movePreset(preset.id, -1)) changed(); }); down.addEventListener("click", () => { if (store.movePreset(preset.id, 1)) changed(); });
      remove.addEventListener("click", () => { if (win?.confirm && !win.confirm(copy.deleteConfirm)) return; if (store.remove(preset.id)) changed(); });
      head.append(rename, up, down, remove);

      const members = doc.createElement("div"); members.dataset.ppbuiTeamPresetMembers = ""; preset.members.forEach((member, index) => members.append(memberCell(preset, member, index, copy)));
      const foot = doc.createElement("div"); foot.dataset.ppbuiTeamPresetCardFoot = "";
      const applyButton = doc.createElement("button"); applyButton.type = "button"; applyButton.className = "pokeidle-btn"; applyButton.textContent = copy.apply; applyButton.disabled = preset.orderVerified === false;
      const update = doc.createElement("button"); update.type = "button"; update.className = "pokeidle-btn"; update.textContent = copy.update;
      applyButton.addEventListener("click", () => execute(preset, () => apply(doc, preset)));
      update.addEventListener("click", async () => {
        const result = await runExclusive(() => capture(doc, hudRoot));
        if (!result?.ok) return setStatus(errorMessage(copy, result, preset), true);
        if (store.replaceSnapshot(preset.id, result.snapshot)) { setStatus(copy.updated); changed(); }
      });
      foot.append(applyButton, update);
      card.append(head, members);
      if (preset.orderVerified === false) {
        const review = doc.createElement("p"); review.dataset.ppbuiTeamPresetReview = ""; review.textContent = copy.orderReview;
        const confirm = doc.createElement("button"); confirm.type = "button"; confirm.className = "pokeidle-btn"; confirm.textContent = copy.confirmOrder;
        confirm.addEventListener("click", () => { if (store.confirmOrder(preset.id)) { setStatus(copy.updated); changed(); } });
        card.append(review); foot.prepend(confirm);
      }
      card.append(foot); grid.append(card);
    });
  }

  function sync() {
    ensureMounted();
    const copy = text(); if (summary.textContent !== copy.savedTeams) summary.textContent = copy.savedTeams; render();
  }

  sync();
  return {
    sync,
    open() { ensureMounted(); details.open = true; details.scrollIntoView?.({ block: "nearest" }); },
    cleanup() { details.remove(); style.remove(); },
  };
}
