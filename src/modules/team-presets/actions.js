import { teamPresetsConfig as config } from "./config.js";

const sleep = (doc, ms) => new Promise(resolve => (doc.defaultView?.setTimeout || setTimeout)(resolve, ms));

async function waitFor(doc, check, timeout = config.actionTimeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = check();
    if (value) return value;
    await sleep(doc, 40);
  }
  return null;
}

function visibleTeamRoot(doc) {
  return [...doc.querySelectorAll(config.selectors.teamPanel)].find(root => !root.closest("[hidden]")) || null;
}

function sceneForRoot(root) {
  if (!root) return null;
  const view = root.ownerDocument.defaultView, body = root.querySelector(config.selectors.teamBody);
  const cached = view?.PokeIdle?.ReactiveWindows?.cached?.();
  return [...(Array.isArray(cached) ? cached : []), view?.SceneManager?._scene]
    .find(scene => body && scene?._panel?.body === body && Array.isArray(scene?._creatures)) || null;
}

const ids = scene => (Array.isArray(scene?._creatures) ? scene._creatures : []).map(member => String(member?.id ?? "")).filter(Boolean);
const available = scene => Array.isArray(scene?._available) ? scene._available : [];
const leaderId = scene => String(scene?._team?.leader_id ?? "");
const memberById = (scene, id) => [...(scene?._creatures || []), ...available(scene)].find(member => String(member?.id ?? "") === id);
const canLead = member => !Number.isFinite(Number(member?.hp)) || Number(member.hp) > 0;

async function openTeamPanel(doc) {
  let root = visibleTeamRoot(doc), scene = sceneForRoot(root);
  if (root && scene) return { root, scene };
  const action = doc.querySelector(config.selectors.teamMenuAction);
  if (!action || action.disabled) return null;
  action.click();
  return waitFor(doc, () => {
    root = visibleTeamRoot(doc); scene = sceneForRoot(root);
    return root && scene ? { root, scene } : null;
  });
}

function refresh(root) {
  const scene = sceneForRoot(root);
  return scene ? { root, scene } : null;
}

async function selectMember(doc, root, id) {
  const context = refresh(root), index = ids(context?.scene).indexOf(id);
  if (!context || index < 0) return { ok: false, reason: "team-slot-unavailable" };
  const slot = root.querySelectorAll(config.selectors.teamSlot)[index];
  if (!slot || slot.disabled) return { ok: false, reason: "team-slot-unavailable" };
  slot.click();
  await sleep(doc, 0);
  return { ok: true };
}

async function setLeader(doc, root, id) {
  const selected = await selectMember(doc, root, id);
  if (!selected.ok) return selected;
  const button = await waitFor(doc, () => {
    const next = root.querySelector(config.selectors.teamActiveAction);
    return next && !next.disabled ? next : null;
  });
  if (!button) return { ok: false, reason: "leader-action-unavailable" };
  button.click();
  const confirmed = await waitFor(doc, () => leaderId(sceneForRoot(root)) === id);
  return confirmed ? { ok: true } : { ok: false, reason: "action-timeout" };
}

async function removeMember(doc, root, id) {
  const selected = await selectMember(doc, root, id);
  if (!selected.ok) return selected;
  const button = await waitFor(doc, () => {
    const next = root.querySelector(config.selectors.teamRemoveAction);
    return next && !next.disabled ? next : null;
  });
  if (!button) return { ok: false, reason: "remove-action-unavailable" };
  button.click();
  const confirmed = await waitFor(doc, () => {
    const scene = sceneForRoot(root);
    return scene && !ids(scene).includes(id);
  });
  return confirmed ? { ok: true } : { ok: false, reason: "action-timeout" };
}

async function openPicker(doc, root) {
  const scene = sceneForRoot(root);
  if (!scene) return null;
  if (typeof scene.requestEquipPicker === "function") scene.requestEquipPicker.call(scene);
  else {
    const empty = [...root.querySelectorAll(config.selectors.teamSlot)].find(slot => !slot.disabled && slot.querySelector(".team-slot__empty"));
    if (!empty) return null;
    empty.click();
  }
  return waitFor(doc, () => {
    const picker = [...doc.querySelectorAll(config.selectors.picker)].find(node => !node.closest("[hidden]"));
    return picker || null;
  });
}

async function addMember(doc, root, id) {
  const picker = await openPicker(doc, root);
  if (!picker) return { ok: false, reason: "equip-picker-unavailable" };
  const scene = sceneForRoot(root), index = available(scene).findIndex(member => String(member?.id ?? "") === id);
  const card = index >= 0 ? picker.querySelectorAll(config.selectors.pickerCard)[index] : null;
  if (!card || card.disabled) return { ok: false, reason: "picker-member-unavailable" };
  card.click();
  const confirmed = await waitFor(doc, () => {
    const next = sceneForRoot(root);
    return next && ids(next).includes(id);
  });
  return confirmed ? { ok: true } : { ok: false, reason: "action-timeout" };
}

function sameMembers(actual, target) {
  if (actual.length !== target.length) return false;
  const expected = new Set(target);
  return actual.every(id => expected.has(id));
}

export async function applyTeamPreset(doc, preset) {
  const targetIds = [...new Set((preset?.members || []).map(member => String(member?.id ?? "")).filter(Boolean))];
  const targetLeader = String(preset?.leaderId ?? targetIds[0] ?? "");
  if (!targetIds.length || targetIds.length > 6 || !targetIds.includes(targetLeader)) return { ok: false, reason: "preset-invalid" };

  const opened = await openTeamPanel(doc);
  if (!opened) return { ok: false, reason: "team-panel-unavailable" };
  const root = opened.root;
  let scene = sceneForRoot(root), current = ids(scene);
  const maxMembers = root.querySelectorAll(config.selectors.teamSlot).length || 6;
  if (targetIds.length > maxMembers) return { ok: false, reason: "preset-invalid" };

  const known = new Set([...current, ...available(scene).map(member => String(member?.id ?? ""))]);
  const missingIds = targetIds.filter(id => !known.has(id));
  if (missingIds.length) return { ok: false, reason: "member-unavailable", missingIds };

  const targetLeaderMember = memberById(scene, targetLeader);
  if (leaderId(scene) !== targetLeader && targetLeaderMember && !canLead(targetLeaderMember)) return { ok: false, reason: "leader-fainted", memberId: targetLeader };

  if (current.length >= maxMembers && !current.includes(targetLeader)) {
    const currentLeader = leaderId(scene), targetSet = new Set(targetIds);
    const removable = current.find(id => id !== currentLeader && !targetSet.has(id));
    if (removable) {
      const result = await removeMember(doc, root, removable);
      if (!result.ok) return result;
    } else {
      const temporary = current.find(id => id !== currentLeader && targetSet.has(id) && canLead(memberById(scene, id)));
      if (!temporary) return { ok: false, reason: "leader-transition-unavailable" };
      let result = await setLeader(doc, root, temporary);
      if (!result.ok) return result;
      result = await removeMember(doc, root, currentLeader);
      if (!result.ok) return result;
    }
  }

  scene = sceneForRoot(root); current = ids(scene);
  if (!current.includes(targetLeader)) {
    const result = await addMember(doc, root, targetLeader);
    if (!result.ok) return result;
  }

  scene = sceneForRoot(root);
  if (leaderId(scene) !== targetLeader) {
    const result = await setLeader(doc, root, targetLeader);
    if (!result.ok) return result;
  }

  scene = sceneForRoot(root); current = ids(scene);
  for (const id of current.filter(id => !targetIds.includes(id))) {
    const result = await removeMember(doc, root, id);
    if (!result.ok) return result;
  }

  scene = sceneForRoot(root); current = ids(scene);
  for (const id of targetIds.filter(id => !current.includes(id))) {
    const result = await addMember(doc, root, id);
    if (!result.ok) return result;
    scene = sceneForRoot(root); current = ids(scene);
  }

  scene = sceneForRoot(root); current = ids(scene);
  if (!sameMembers(current, targetIds) || leaderId(scene) !== targetLeader) return { ok: false, reason: "final-state-mismatch" };
  return { ok: true, memberIds: current, leaderId: targetLeader };
}
