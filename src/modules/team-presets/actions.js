import { teamPresetsConfig as config } from "./config.js";
import { currentTeamSnapshot } from "./dom.js";

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

const memberIds = scene => (Array.isArray(scene?._creatures) ? scene._creatures : []).map(member => String(member?.id ?? "")).filter(Boolean);
const officialIds = scene => {
  const order = Array.isArray(scene?._team?.member_ids) ? scene._team.member_ids.map(String).filter(Boolean) : [];
  return order.length ? order : memberIds(scene);
};
const available = scene => Array.isArray(scene?._available) ? scene._available : [];
const activeId = scene => String(scene?._team?.leader_id ?? "");
const memberById = (scene, id) => [...(scene?._creatures || []), ...available(scene)].find(member => String(member?.id ?? "") === id);
const canLead = member => !Number.isFinite(Number(member?.hp)) || Number(member.hp) > 0;
const sameMembers = (actual, target) => actual.length === target.length && actual.every(id => target.includes(id));
const sameOrder = (actual, target) => actual.length === target.length && actual.every((id, index) => id === target[index]);

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

async function nativeAction(root, method, args, check, reason) {
  const scene = sceneForRoot(root);
  if (typeof scene?.[method] !== "function") return { ok: false, reason };
  try {
    await scene[method](...args);
    // Native handlers can catch server errors themselves; verify the resulting state.
    return check(sceneForRoot(root)) ? { ok: true } : { ok: false, reason };
  } catch (error) {
    return { ok: false, reason, detail: error?.message };
  }
}

async function setActive(doc, root, id) {
  const scene = sceneForRoot(root), member = memberById(scene, id);
  if (!member || !memberIds(scene).includes(id) || !canLead(member)) return { ok: false, reason: "leader-action-unavailable" };
  return nativeAction(root, "setLeader", [member], next => activeId(next) === id, "leader-action-unavailable");
}

async function removeMember(doc, root, id) {
  const scene = sceneForRoot(root), member = memberById(scene, id);
  if (!member || activeId(scene) === id || memberIds(scene).length <= 1) return { ok: false, reason: "remove-action-unavailable" };
  return nativeAction(root, "removeMember", [member], next => next && !memberIds(next).includes(id)
    && !officialIds(next).includes(id), "remove-action-unavailable");
}

async function addMember(doc, root, id) {
  const scene = sceneForRoot(root), member = available(scene).find(entry => String(entry.id) === id);
  if (!member || memberIds(scene).length >= 6) return { ok: false, reason: "picker-member-unavailable" };
  // The native handler expects a button only to guard/restore its disabled state.
  const guard = doc.createElement("button");
  return nativeAction(root, "equipFromInventory", [member, guard], next => next && memberIds(next).includes(id)
    && officialIds(next).includes(id) && !available(next).some(entry => String(entry.id) === id), "picker-member-unavailable");
}

async function syncBattleOrder(doc, root, targetIds) {
  const scene = sceneForRoot(root);
  if (!sameMembers(memberIds(scene), targetIds) || scene?._orderBusy) return { ok: false, reason: "order-action-unavailable" };
  if (sameOrder(officialIds(scene), targetIds)) return { ok: true };
  return nativeAction(root, "persistOrder", [[...targetIds]], next => next && !next._orderBusy
    && sameOrder(officialIds(next), targetIds), "order-final-state-mismatch");
}

export async function captureTeamPresetSnapshot(doc, hudRoot) {
  let snapshot = currentTeamSnapshot(hudRoot);
  if (!snapshot) return { ok: false, reason: "team-panel-unavailable" };
  if (snapshot.orderVerified) return { ok: true, snapshot };
  const opened = await openTeamPanel(doc);
  if (!opened) return { ok: false, reason: "team-panel-unavailable" };
  snapshot = await waitFor(doc, () => {
    const next = currentTeamSnapshot(hudRoot);
    return next?.orderVerified ? next : null;
  });
  return snapshot ? { ok: true, snapshot } : { ok: false, reason: "order-final-state-mismatch" };
}

export async function openTeamPresetManagement(doc) {
  const opened = await openTeamPanel(doc);
  return opened?.root || null;
}

export async function applyTeamPreset(doc, preset) {
  const targetIds = [...new Set((preset?.members || []).map(member => String(member?.id ?? "")).filter(Boolean))];
  const targetActive = String(preset?.activeId ?? preset?.leaderId ?? targetIds[0] ?? "");
  if (!targetIds.length || targetIds.length > 6 || !targetIds.includes(targetActive)) return { ok: false, reason: "preset-invalid" };
  if (preset?.orderVerified === false) return { ok: false, reason: "order-unverified" };

  const opened = await openTeamPanel(doc);
  if (!opened) return { ok: false, reason: "team-panel-unavailable" };
  const root = opened.root;
  if (!["load", "setLeader", "removeMember", "equipFromInventory", "persistOrder"].every(method => typeof opened.scene[method] === "function")) {
    return { ok: false, reason: "team-panel-unavailable" };
  }
  // A cached Team window can still contain inventory from before the last equip/remove.
  if (typeof opened.scene.load === "function") await opened.scene.load(false);
  const ready = await waitFor(doc, () => {
    const next = sceneForRoot(root);
    return next && !next._orderBusy && sameMembers(memberIds(next), officialIds(next)) ? next : null;
  });
  if (!ready) return { ok: false, reason: "action-timeout" };
  let scene = sceneForRoot(root), current = memberIds(scene);
  const maxMembers = root.querySelectorAll(config.selectors.teamSlot).length || 6;
  if (targetIds.length > maxMembers) return { ok: false, reason: "preset-invalid" };

  const known = new Set([...current, ...available(scene).map(member => String(member?.id ?? ""))]);
  const missingIds = targetIds.filter(id => !known.has(id));
  if (missingIds.length) return { ok: false, reason: "member-unavailable", missingIds };
  const activeMember = memberById(scene, targetActive);
  if (activeId(scene) !== targetActive && activeMember && !canLead(activeMember)) return { ok: false, reason: "leader-fainted", memberId: targetActive };

  if (current.length >= maxMembers && !current.includes(targetActive)) {
    const currentActive = activeId(scene), targetSet = new Set(targetIds);
    const removable = current.find(id => id !== currentActive && !targetSet.has(id));
    if (removable) {
      const result = await removeMember(doc, root, removable); if (!result.ok) return result;
    } else {
      const temporary = current.find(id => id !== currentActive && targetSet.has(id) && canLead(memberById(scene, id)));
      if (!temporary) return { ok: false, reason: "leader-transition-unavailable" };
      let result = await setActive(doc, root, temporary); if (!result.ok) return result;
      result = await removeMember(doc, root, currentActive); if (!result.ok) return result;
    }
  }

  scene = sceneForRoot(root); current = memberIds(scene);
  if (!current.includes(targetActive)) { const result = await addMember(doc, root, targetActive); if (!result.ok) return result; }
  scene = sceneForRoot(root);
  if (activeId(scene) !== targetActive) { const result = await setActive(doc, root, targetActive); if (!result.ok) return result; }

  scene = sceneForRoot(root); current = memberIds(scene);
  for (const id of current.filter(id => !targetIds.includes(id))) { const result = await removeMember(doc, root, id); if (!result.ok) return result; }
  scene = sceneForRoot(root); current = memberIds(scene);
  for (const id of targetIds.filter(id => !current.includes(id))) {
    const result = await addMember(doc, root, id); if (!result.ok) return result;
    scene = sceneForRoot(root); current = memberIds(scene);
  }

  scene = sceneForRoot(root); current = memberIds(scene);
  if (!sameMembers(current, targetIds)) return { ok: false, reason: "final-state-mismatch" };
  const ordered = await syncBattleOrder(doc, root, targetIds); if (!ordered.ok) return ordered;
  scene = sceneForRoot(root);
  if (activeId(scene) !== targetActive) { const result = await setActive(doc, root, targetActive); if (!result.ok) return result; }

  scene = sceneForRoot(root);
  if (!sameOrder(officialIds(scene), targetIds) || activeId(scene) !== targetActive) return { ok: false, reason: "final-state-mismatch" };
  return { ok: true, memberIds: officialIds(scene), activeId: targetActive };
}
