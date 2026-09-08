import { hpPercent, ivTotal, memberName, teamParts, teamScene, teamText } from "./dom.js";
import { createTeamPicker } from "./picker.js";

const stats = [["atk", "ATK"], ["def", "DEF"], ["spa", "SpA"], ["spd", "SpD"], ["spe", "SPE"]];
const value = number => Number.isFinite(Number(number)) ? Number(number).toLocaleString() : "—";
const display = content => typeof content === "number" ? value(content) : String(content ?? "—");
const delta = (selected, active) => {
  const amount = Number(selected) - Number(active);
  return Number.isFinite(amount) && amount ? `${amount > 0 ? "+" : ""}${amount.toLocaleString()}` : "—";
};

function styleNode(doc) {
  const style = doc.createElement("style");
  style.dataset.ppbuiModule = "team";
  style.textContent = `
    .pokeidle-team-panel[data-ppbui-team-enhanced] { min-width:340px!important; }
    .team-slot > [data-ppbui-team-slot] { position:absolute; right:3px; bottom:2px; left:3px; overflow:hidden; color:inherit; font-size:9px; line-height:1.2; text-align:center; text-overflow:ellipsis; white-space:nowrap; text-shadow:0 1px 1px #000; pointer-events:none; }
    .team-slot.ppbui-team-fainted > [data-ppbui-team-slot] { color:#c9a6a3; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-active-state { display:block; width:auto; min-height:0; margin:6px 0 0 auto; padding:5px 8px; font:inherit; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .team-detail__info { min-width:0; flex:1; }
    .ppbui-team-profile-controls { display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; margin-top:8px; min-width:0; }
    .pokeidle-team-panel .ppbui-team-profile-controls > .team-order-controls { display:flex; align-items:center; gap:4px; flex:0 1 auto; min-width:0; width:auto; margin:0; padding:0; border:0; background:none; box-shadow:none; }
    .pokeidle-team-panel .ppbui-team-profile-controls .team-order-label { min-width:0; margin:0; font:inherit; font-size:10px; font-weight:400; letter-spacing:normal; color:inherit; }
    .pokeidle-team-panel .ppbui-team-profile-controls .team-order-button { box-sizing:border-box; display:inline-flex; align-items:center; justify-content:center; flex:0 0 26px; width:26px!important; min-width:26px!important; height:26px!important; min-height:26px!important; padding:0!important; font:inherit; line-height:1; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .ppbui-team-profile-controls > .team-active-state { max-width:100%; margin:0; white-space:normal; }
    [data-ppbui-team-compare], [data-ppbui-team-compare] > summary, .ppbui-team-compare-grid { font:inherit; }
    [data-ppbui-team-compare] > summary { cursor:pointer; color:var(--ui-gold-light,#f1d681); font-weight:700; }
    .ppbui-team-compare-grid { display:grid; grid-template-columns:minmax(64px,1fr) repeat(3,minmax(54px,auto)); gap:4px 8px; margin-top:8px; align-items:center; }
    .ppbui-team-compare-grid > span { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .ppbui-team-compare-grid > span:nth-child(4n+2), .ppbui-team-compare-grid > span:nth-child(4n+3), .ppbui-team-compare-grid > output { text-align:right; font-variant-numeric:tabular-nums; }
    .ppbui-team-compare-head { color:#aaa7a1; font-size:inherit; font-weight:700; }
    .ppbui-team-positive { color:#8fca7a; } .ppbui-team-negative { color:#d18b82; }
    .team-actions[data-ppbui-team-actions] { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:6px; margin-top:6px; }
    .team-actions[data-ppbui-team-actions] > .pokeidle-btn { flex:0 0 auto; width:auto; min-height:0; margin:0; padding:5px 8px; font:inherit; }
    .pokeidle-team-panel .ppbui-team-profile-controls > .team-actions[data-ppbui-team-actions] { flex:0 1 auto; min-width:0; justify-content:flex-start; margin:0; padding:0; border:0; background:none; box-shadow:none; }
    .pokeidle-team-panel .ppbui-team-profile-controls > .team-actions[data-ppbui-team-actions] > button { max-width:100%; white-space:normal; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .ppbui-team-profile-controls button { box-sizing:border-box; display:inline-flex; align-items:center; justify-content:center; height:26px!important; min-height:26px!important; padding:0 8px!important; font:inherit!important; font-size:10px!important; line-height:1!important; white-space:nowrap!important; }
    .pokeidle-team-panel[data-ppbui-team-enhanced] .ppbui-team-profile-controls .team-order-button { padding:0!important; }
    .ppbui-team-picker-toolbar { display:flex; gap:6px; margin:0 0 8px; }
    .ppbui-team-picker-toolbar > input { min-width:0; flex:1 1 120px; }
    .ppbui-team-picker-toolbar > select { min-width:0; flex:1 1 100px; }
    .ppbui-team-picker-toolbar > button { flex:0 0 auto; }
    .ppbui-team-picker-empty { margin:8px 0; text-align:center; }
    .team-equip-card[data-ppbui-team-filtered] { display:none!important; }
  `;
  return style;
}

export function mountTeam(root) {
  const doc = root.ownerDocument, style = styleNode(doc);
  root.append(style); root.dataset.ppbuiTeamEnhanced = "";
  let actionAnchor = null, currentActions = null, comparison = null, signature = "", active = true, scene = null;
  let profileControls = null, profileMoves = [];
  const buttonLabels = new Map();
  const picker = createTeamPicker(doc, () => scene);

  function restoreActions() {
    if (currentActions?.isConnected && actionAnchor?.isConnected) actionAnchor.replaceWith(currentActions);
    currentActions?.removeAttribute("data-ppbui-team-actions");
    currentActions?.removeAttribute("aria-label");
    actionAnchor?.remove(); actionAnchor = null; currentActions = null;
  }

  function moveActions(parts, text) {
    if (!parts.actions || parts.actions === currentActions) return;
    restoreActions();
    currentActions = parts.actions;
    actionAnchor = doc.createComment("ppbui-team-actions-position");
    currentActions.before(actionAnchor);
    currentActions.dataset.ppbuiTeamActions = "";
    currentActions.setAttribute("aria-label", text.actions);
    parts.profile.after(currentActions);
  }

  function restoreProfileControls() {
    for (const { node, anchor } of profileMoves) {
      if (node.isConnected && anchor.isConnected && root.contains(anchor)) anchor.replaceWith(node);
      anchor.remove();
    }
    profileMoves = []; profileControls?.remove(); profileControls = null;
  }

  function compactProfileControls(parts) {
    const nodes = [parts.orderControls, parts.active, parts.actions].filter(Boolean);
    if (!parts.profileInfo) { restoreProfileControls(); return; }
    if (profileControls?.parentElement === parts.profileInfo && nodes.length === profileMoves.length && nodes.every(node => node.parentElement === profileControls)) return;
    restoreProfileControls();
    profileControls = doc.createElement("div"); profileControls.className = "ppbui-team-profile-controls";
    for (const node of nodes) {
      const anchor = doc.createComment("ppbui-team-profile-action"); node.before(anchor);
      profileMoves.push({ node, anchor }); profileControls.append(node);
    }
    parts.profileInfo.append(profileControls);
  }

  function restoreButtonLabel(button, record) {
    if (button.textContent === record.label) button.textContent = record.text;
    for (const [attribute, original] of [["title", record.title], ["aria-description", record.description]]) {
      if (button.getAttribute(attribute) === record.text) {
        if (original === null) button.removeAttribute(attribute); else button.setAttribute(attribute, original);
      }
    }
    buttonLabels.delete(button);
  }

  function compactButtonLabels(parts, text) {
    const labels = new Map([[parts.active, parts.active?.classList.contains("is-active") ? `⚔ ${text.active}` : null], [parts.remove, text.remove]]);
    for (const [button, record] of buttonLabels) {
      if (!button.isConnected) buttonLabels.delete(button);
      else if (!labels.get(button)) restoreButtonLabel(button, record);
    }
    for (const [button, label] of labels) {
      if (!button || !label) continue;
      let record = buttonLabels.get(button);
      if (!record) {
        record = { text: button.textContent, title: button.getAttribute("title"), description: button.getAttribute("aria-description") };
        buttonLabels.set(button, record);
      } else if (button.textContent !== record.label || button.disabled !== record.disabled) record.text = button.textContent;
      record.disabled = button.disabled; record.label = label;
      if (button.textContent !== label) button.textContent = label;
      if (button.title !== record.text) button.title = record.text;
      if (button.getAttribute("aria-description") !== record.text) button.setAttribute("aria-description", record.text);
    }
  }

  function decorateSlots(parts, scene, text) {
    parts.slotNodes.forEach((slot, index) => {
      const member = scene._creatures[index], old = slot.querySelector("[data-ppbui-team-slot]");
      if (!member) { old?.remove(); if (slot.classList.contains("ppbui-team-fainted")) slot.classList.remove("ppbui-team-fainted"); return; }
      const hp = hpPercent(member), label = `${memberName(doc, member)} · Lv. ${value(member.level)} · ${hp}% HP`;
      const meta = old || doc.createElement("span");
      if (!old) meta.dataset.ppbuiTeamSlot = "";
      const short = Number(member.hp || 0) <= 0 ? text.fainted : `Lv. ${value(member.level)} · ${hp}% HP`;
      if (meta.textContent !== short) meta.textContent = short;
      if (!old) slot.append(meta);
      if (slot.getAttribute("aria-description") !== label) slot.setAttribute("aria-description", label);
      const fainted = Number(member.hp || 0) <= 0;
      if (slot.classList.contains("ppbui-team-fainted") !== fainted) slot.classList.toggle("ppbui-team-fainted", fainted);
    });
  }

  function comparisonSignature(scene, selected, activeMember, text) {
    return JSON.stringify([scene._selectedId, scene._team?.leader_id, text.compare,
      ...[selected, activeMember].flatMap(member => [member?.id, member?.power, member?.level, member?.quality, member?.quality_multiplier, member?.hp, member?.max_hp, ivTotal(member), ...stats.map(([key]) => member?.[key])])]);
  }

  function renderComparison(parts, scene, text) {
    const selected = scene._creatures.find(member => String(member.id) === String(scene._selectedId));
    const activeMember = scene._creatures.find(member => String(member.id) === String(scene._team?.leader_id));
    if (!selected || !activeMember || selected === activeMember || String(selected.id) === String(activeMember.id)) {
      comparison?.remove(); comparison = null; signature = ""; return;
    }
    const nextSignature = comparisonSignature(scene, selected, activeMember, text);
    if (comparison?.isConnected && signature === nextSignature) return;
    const wasOpen = comparison?.open ?? false;
    comparison?.remove();
    comparison = doc.createElement("details"); comparison.open = wasOpen;
    comparison.className = "team-section"; comparison.dataset.ppbuiModule = "team"; comparison.dataset.ppbuiTeamCompare = "";
    const summary = doc.createElement("summary"); summary.textContent = text.compare;
    const grid = doc.createElement("div"); grid.className = "ppbui-team-compare-grid";
    const cells = [["", text.active, text.selected, "Δ"],
      [text.power, activeMember.power, selected.power], [text.iv, `${ivTotal(activeMember)}/186`, `${ivTotal(selected)}/186`, ivTotal(selected) - ivTotal(activeMember)],
      [text.quality, activeMember.quality || "—", selected.quality || "—"], [text.hp, `${hpPercent(activeMember)}%`, `${hpPercent(selected)}%`, hpPercent(selected) - hpPercent(activeMember)],
      ...stats.map(([key, label]) => [label, activeMember[key], selected[key]])];
    cells.forEach((row, rowIndex) => {
      const selectedNumber = row[2], activeNumber = row[1], diff = row.length > 3 && row[3] !== undefined ? row[3] : delta(selectedNumber, activeNumber);
      [row[0], row[1], row[2], rowIndex ? (typeof diff === "number" ? (diff ? `${diff > 0 ? "+" : ""}${diff}` : "—") : diff) : row[3]].forEach((content, col) => {
        const node = col === 3 && rowIndex ? doc.createElement("output") : doc.createElement("span");
        node.textContent = display(content);
        if (!rowIndex) node.className = "ppbui-team-compare-head";
        if (col === 3 && rowIndex && Number(diff)) node.className = Number(diff) > 0 ? "ppbui-team-positive" : "ppbui-team-negative";
        grid.append(node);
      });
    });
    comparison.append(summary, grid);
    (parts.vitals || parts.profile).before(comparison);
    signature = nextSignature;
  }

  function sync() {
    if (!active) return;
    const parts = teamParts(root), text = teamText(doc); scene = teamScene(root);
    if (!parts.body || !parts.profile || !scene) { comparison?.remove(); comparison = null; return; }
    moveActions(parts, text); compactProfileControls(parts); compactButtonLabels(parts, text);
    decorateSlots(parts, scene, text);
    renderComparison(parts, scene, text);
    picker.sync(text);
  }

  sync();
  return { sync, cleanup() {
    active = false; comparison?.remove(); comparison = null;
    root.querySelectorAll("[data-ppbui-team-slot]").forEach(node => node.remove());
    root.querySelectorAll(".ppbui-team-fainted").forEach(node => node.classList.remove("ppbui-team-fainted"));
    root.querySelectorAll(".team-slot[aria-description]").forEach(node => node.removeAttribute("aria-description"));
    for (const [button, record] of buttonLabels) restoreButtonLabel(button, record);
    picker.cleanup(); restoreProfileControls(); restoreActions(); root.removeAttribute("data-ppbui-team-enhanced"); style.remove();
  } };
}
