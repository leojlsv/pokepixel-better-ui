import { teamPresetsConfig as config } from "./config.js";
import { teamPresetsText } from "./dom.js";

function errorMessage(copy, result, preset) {
  if (result?.reason === "member-unavailable" && result.missingIds?.length) {
    const missing = result.missingIds.map(id => preset.members.find(member => member.id === id)?.name || id).join(", ");
    return `${copy.errors[result.reason]} ${missing}`;
  }
  return copy.errors[result?.reason] || result?.reason || copy.errors["final-state-mismatch"];
}

const iconButton = (doc, icon, title) => {
  const button = doc.createElement("button"); button.type = "button"; button.className = "pokeidle-btn ppbui-team-preset-icon"; button.textContent = icon;
  if (title) { button.title = title; button.setAttribute("aria-label", title); }
  return button;
};

export function mountTeamPresetManager(root, { store, hudRoot, apply, capture, runExclusive, onChange } = {}) {
  const doc = root.ownerDocument, win = doc.defaultView;
  const style = doc.createElement("style"); style.dataset.ppbuiModule = `${config.id}-manager`;
  style.textContent = `
    [data-ppbui-team-preset-manager] { margin-top:10px; color:#d8d3ca; font:inherit; }
    [data-ppbui-team-preset-manager] > summary { cursor:pointer; color:var(--ui-gold-light,#f1d681); font:inherit; font-weight:700; }
    [data-ppbui-team-preset-manager-grid] { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:8px; margin-top:8px; }
    [data-ppbui-team-preset-card] { box-sizing:border-box; min-width:260px; min-height:124px; display:grid; grid-template-rows:auto auto 1fr auto; gap:5px; padding:7px; color:#d8d3ca; }
    [data-ppbui-team-preset-card-head], [data-ppbui-team-preset-card-foot], [data-ppbui-team-preset-card-meta] { display:flex; align-items:center; gap:4px; min-width:0; }
    [data-ppbui-team-preset-card-head] > input { flex:1 1 auto; min-width:0; min-height:24px; padding:3px 6px; color:var(--ui-gold-light,#f1d681); font:inherit; font-weight:700; }
    [data-ppbui-team-preset-card-actions] { display:flex; flex:0 0 auto; gap:2px; }
    .ppbui-team-preset-icon { flex:0 0 24px; width:24px; min-width:24px; min-height:22px; padding:2px 4px; color:#d8d3ca!important; font:inherit; }
    [data-ppbui-team-preset-card-actions] > .ppbui-team-preset-icon { opacity:.58; transition:opacity .12s linear,color .12s linear; }
    [data-ppbui-team-preset-card-actions] > .ppbui-team-preset-icon:hover,
    [data-ppbui-team-preset-card-actions] > .ppbui-team-preset-icon:focus-visible { opacity:1; }
    [data-ppbui-team-preset-card-meta] { justify-content:space-between; color:#aaa7a1; font-size:9px; }
    [data-ppbui-team-preset-active-name] { min-width:0; overflow:hidden; color:var(--ui-gold-light,#f1d681); text-overflow:ellipsis; white-space:nowrap; }
    [data-ppbui-team-preset-members] { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:3px; align-items:center; min-width:0; }
    [data-ppbui-team-preset-member] { position:relative; display:grid; place-items:center; min-width:0; height:58px; overflow:hidden; padding:2px 1px 1px; border:1px solid #33343a; background:#1d1d20; color:#d8d3ca; }
    [data-ppbui-team-preset-member][data-active="true"] { border-color:#72cf64; box-shadow:inset 0 0 0 1px rgba(114,207,100,.24),0 0 3px rgba(114,207,100,.22); }
    [data-ppbui-team-preset-member][data-active="true"]::after { content:"★"; position:absolute; top:1px; right:2px; color:#8fca7a; font-size:8px; line-height:1; text-shadow:0 1px 1px #000; }
    [data-ppbui-team-preset-member] img { display:block; max-width:40px; max-height:40px; image-rendering:pixelated; }
    [data-ppbui-team-preset-member-fallback] { overflow:hidden; max-width:42px; color:#aaa7a1; font-size:8px; text-align:center; text-overflow:ellipsis; white-space:nowrap; }
    [data-ppbui-team-preset-member-position] { position:absolute; top:1px; left:2px; color:#aaa7a1; font-size:8px; line-height:1; text-shadow:0 1px 1px #000; }
    [data-ppbui-team-preset-member-level] { position:absolute; z-index:2; right:1px; bottom:2px; padding:0 2px; border:1px solid rgba(255,255,255,.16); background:#050506; color:#f0eee9; font-size:7px; font-weight:700; line-height:9px; white-space:nowrap; text-shadow:0 1px 1px #000; transition:opacity .12s linear; }
    [data-ppbui-team-preset-member-controls] { position:absolute; z-index:3; right:1px; bottom:1px; left:1px; display:flex; gap:1px; opacity:0; pointer-events:none; transition:opacity .12s linear; }
    [data-ppbui-team-preset-member]:hover [data-ppbui-team-preset-member-controls], [data-ppbui-team-preset-member]:focus-within [data-ppbui-team-preset-member-controls] { opacity:1; pointer-events:auto; }
    [data-ppbui-team-preset-member]:hover [data-ppbui-team-preset-member-level], [data-ppbui-team-preset-member]:focus-within [data-ppbui-team-preset-member-level] { opacity:0; }
    [data-ppbui-team-preset-member-controls] > button { flex:1 1 0; min-width:0; min-height:0; padding:0 1px; border-width:1px; color:#d8d3ca!important; font-size:8px; line-height:12px; }
    [data-ppbui-team-preset-member-controls] > button[data-active-control="true"] { color:var(--ui-gold-light,#f1d681)!important; }
    [data-ppbui-team-preset-card-foot] { justify-content:flex-end; padding-top:4px; border-top:1px solid rgba(241,214,129,.12); }
    [data-ppbui-team-preset-card-foot] > .ppbui-team-preset-icon { opacity:.68; transition:opacity .12s linear; }
    [data-ppbui-team-preset-card-foot] > .ppbui-team-preset-icon:hover,
    [data-ppbui-team-preset-card-foot] > .ppbui-team-preset-icon:focus-visible { opacity:1; }
    [data-ppbui-team-preset-card-foot] > .ppbui-team-preset-icon:last-child { color:var(--ui-gold-light,#f1d681)!important; opacity:.9; }
    [data-ppbui-team-preset-review] { margin:0; color:#d18b82; font-size:9px; font-weight:700; }
    [data-ppbui-team-preset-manager-status] { margin:6px 0 0; color:#aaa7a1; font-size:9px; }
    [data-ppbui-team-preset-manager-status]:empty { display:none; }
    [data-ppbui-team-preset-manager-status][data-error="true"] { color:#d18b82; font-weight:700; }
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
  function changed() { signature = ""; onChange?.(); render(); syncSummary(); }

  async function execute(preset, task) {
    const copy = text(); setStatus(copy.applying);
    const result = await runExclusive(task);
    setStatus(result?.ok ? copy.applied : errorMessage(copy, result, preset), !result?.ok);
    sync(); return result;
  }

  function liveMemberVisual(member) {
    const runtime = win?.PokeIdle?.PersistentHud?._teamHud;
    const creature = Array.isArray(runtime?._creatures) ? runtime._creatures.find(entry => String(entry?.id ?? "") === member.id) : null;
    const card = hudRoot ? [...hudRoot.querySelectorAll(config.selectors.hudCard)].find(node => node.dataset.creatureId === member.id) : null;
    const source = creature || member;
    const sprite = String(card?.querySelector("img[src]")?.src || member.sprite || source?.sprite_url || source?.sprite || source?.species?.sprite_url || source?.species?.sprite || "").trim();
    const level = Number(creature?.level ?? member.level);
    return { sprite, level: Number.isFinite(level) ? level : null };
  }

  function liveVisualSignature() {
    const runtime = win?.PokeIdle?.PersistentHud?._teamHud;
    if (!Array.isArray(runtime?._creatures)) return "";
    return runtime._creatures.map(creature => {
      const id = String(creature?.id ?? ""), card = hudRoot ? [...hudRoot.querySelectorAll(config.selectors.hudCard)].find(node => node.dataset.creatureId === id) : null;
      return [id, creature?.level, card?.querySelector("img[src]")?.src || ""];
    });
  }

  function memberCell(preset, member, index, copy) {
    const visual = liveMemberVisual(member), levelText = visual.level !== null ? `Lv.${visual.level}` : "";
    const label = `${index + 1}. ${member.name}${levelText ? ` · ${levelText}` : ""}${preset.activeId === member.id ? ` · ${copy.active}` : ""}`;
    const cell = doc.createElement("div"); cell.dataset.ppbuiTeamPresetMember = ""; cell.dataset.active = String(preset.activeId === member.id); cell.title = label; cell.setAttribute("aria-label", label);
    const position = doc.createElement("span"); position.dataset.ppbuiTeamPresetMemberPosition = ""; position.textContent = String(index + 1);
    if (visual.sprite) { const img = doc.createElement("img"); img.src = visual.sprite; img.alt = member.name; cell.append(position, img); }
    else { const fallback = doc.createElement("span"); fallback.dataset.ppbuiTeamPresetMemberFallback = ""; fallback.textContent = member.name; cell.append(position, fallback); }
    const level = doc.createElement("span"); level.dataset.ppbuiTeamPresetMemberLevel = ""; level.textContent = levelText; cell.append(level);
    const controls = doc.createElement("div"); controls.dataset.ppbuiTeamPresetMemberControls = "";
    const left = iconButton(doc, "←", copy.moveLeft); left.disabled = index === 0;
    const active = iconButton(doc, "★", copy.setActive); active.dataset.activeControl = "true"; active.disabled = preset.activeId === member.id;
    const right = iconButton(doc, "→", copy.moveRight); right.disabled = index === preset.members.length - 1;
    left.addEventListener("click", () => { if (store.moveMember(preset.id, member.id, -1)) changed(); });
    right.addEventListener("click", () => { if (store.moveMember(preset.id, member.id, 1)) changed(); });
    active.addEventListener("click", () => { if (store.setActive(preset.id, member.id)) changed(); });
    controls.append(left, active, right); cell.append(controls); return cell;
  }

  function render() {
    const presets = store.list(), nextSignature = JSON.stringify([presets, liveVisualSignature()]);
    if (signature === nextSignature) return; signature = nextSignature;
    const copy = text(); grid.replaceChildren();
    if (!presets.length) { const empty = doc.createElement("p"); empty.textContent = copy.empty; empty.style.color = "#aaa7a1"; grid.append(empty); return; }
    presets.forEach((preset, presetIndex) => {
      const card = doc.createElement("section"); card.className = "team-section"; card.dataset.ppbuiTeamPresetCard = "";
      const head = doc.createElement("div"); head.dataset.ppbuiTeamPresetCardHead = "";
      const rename = doc.createElement("input"); rename.type = "text"; rename.maxLength = 40; rename.className = "game-window__search"; rename.value = preset.name; rename.setAttribute("aria-label", copy.presetName);
      const headActions = doc.createElement("div"); headActions.dataset.ppbuiTeamPresetCardActions = "";
      const up = iconButton(doc, "↑", copy.moveUp); up.disabled = presetIndex === 0;
      const down = iconButton(doc, "↓", copy.moveDown); down.disabled = presetIndex === presets.length - 1;
      const remove = iconButton(doc, "×", copy.remove); remove.setAttribute("aria-label", `${copy.remove}: ${preset.name}`);
      rename.addEventListener("change", () => { if (!store.rename(preset.id, rename.value)) rename.value = preset.name; else changed(); });
      up.addEventListener("click", () => { if (store.movePreset(preset.id, -1)) changed(); }); down.addEventListener("click", () => { if (store.movePreset(preset.id, 1)) changed(); });
      remove.addEventListener("click", () => { if (win?.confirm && !win.confirm(copy.deleteConfirm)) return; if (store.remove(preset.id)) changed(); });
      headActions.append(up, down, remove); head.append(rename, headActions);

      const activeMember = preset.members.find(member => member.id === preset.activeId);
      const meta = doc.createElement("div"); meta.dataset.ppbuiTeamPresetCardMeta = "";
      const count = doc.createElement("span"); count.textContent = `${preset.members.length}/6`;
      const activeName = doc.createElement("span"); activeName.dataset.ppbuiTeamPresetActiveName = ""; activeName.textContent = `★ ${activeMember?.name || copy.active}`; activeName.title = `${copy.active}: ${activeMember?.name || "—"}`;
      meta.append(count, activeName);

      const members = doc.createElement("div"); members.dataset.ppbuiTeamPresetMembers = ""; preset.members.forEach((member, index) => members.append(memberCell(preset, member, index, copy)));
      const foot = doc.createElement("div"); foot.dataset.ppbuiTeamPresetCardFoot = "";
      const applyButton = iconButton(doc, "▶", `${copy.apply}: ${preset.name}`); applyButton.disabled = preset.orderVerified === false;
      const update = iconButton(doc, "↻", `${copy.update}: ${preset.name}`);
      applyButton.addEventListener("click", () => execute(preset, () => apply(doc, preset)));
      update.addEventListener("click", async () => {
        const result = await runExclusive(() => capture(doc, hudRoot));
        if (!result?.ok) return setStatus(errorMessage(copy, result, preset), true);
        if (store.replaceSnapshot(preset.id, result.snapshot)) { setStatus(copy.updated); changed(); }
      });
      foot.append(update, applyButton);
      card.append(head, meta, members);
      if (preset.orderVerified === false) {
        const review = doc.createElement("p"); review.dataset.ppbuiTeamPresetReview = ""; review.textContent = copy.orderReview;
        const confirm = iconButton(doc, "✓", copy.confirmOrder);
        confirm.addEventListener("click", () => { if (store.confirmOrder(preset.id)) { setStatus(copy.updated); changed(); } });
        card.append(review); foot.prepend(confirm);
      }
      card.append(foot); grid.append(card);
    });
  }

  function syncSummary() {
    const copy = text(), count = store.list().length, label = `${copy.savedTeams}${count ? ` · ${count}` : ""}`;
    if (summary.textContent !== label) summary.textContent = label;
  }

  function sync() { ensureMounted(); syncSummary(); render(); }

  sync();
  return {
    sync,
    open() { ensureMounted(); details.open = true; details.scrollIntoView?.({ block: "nearest" }); },
    cleanup() { details.remove(); style.remove(); },
  };
}
