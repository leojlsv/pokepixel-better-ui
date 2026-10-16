import { teamPresetsConfig as config } from "./config.js";
import { currentTeamSnapshot } from "./dom.js";
import { createPresetRuntime } from "./runtime.js";
import { currentStorageOwner } from "../../core/trainer-storage-scope.js";

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

const actionState = root => root?.presetRuntime || sceneForRoot(root);

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
  let root = visibleTeamRoot(doc), scene = actionState(root);
  if (root && scene) return { root, scene };
  const action = doc.querySelector(config.selectors.teamMenuAction);
  if (!action || action.disabled) return null;
  action.click();
  return waitFor(doc, () => {
    root = visibleTeamRoot(doc); scene = actionState(root);
    return root && scene ? { root, scene } : null;
  });
}

async function nativeAction(root, method, args, check, reason) {
  const scene = actionState(root);
  if (scene?.isBound && !scene.isBound()) return { ok: false, reason: "owner-changed" };
  if (typeof scene?.[method] !== "function") return { ok: false, reason };
  try {
    await scene[method](...args);
    // Native handlers can catch server errors themselves; verify the resulting state.
    if (scene?.isBound && !scene.isBound()) return { ok: false, reason: "owner-changed" };
    return check(actionState(root)) ? { ok: true } : { ok: false, reason };
  } catch (error) {
    return { ok: false, reason: error?.message === "owner-changed" ? "owner-changed" : reason, detail: error?.message };
  }
}

async function setActive(doc, root, id) {
  const scene = actionState(root), member = memberById(scene, id);
  if (!member || !memberIds(scene).includes(id) || !canLead(member)) return { ok: false, reason: "leader-action-unavailable" };
  return nativeAction(root, "setLeader", [member], next => activeId(next) === id, "leader-action-unavailable");
}

async function removeMember(doc, root, id) {
  const scene = actionState(root), member = memberById(scene, id);
  if (!member || activeId(scene) === id || memberIds(scene).length <= 1) return { ok: false, reason: "remove-action-unavailable" };
  return nativeAction(root, "removeMember", [member], next => next && !memberIds(next).includes(id)
    && !officialIds(next).includes(id), "remove-action-unavailable");
}

async function addMember(doc, root, id) {
  const scene = actionState(root), member = available(scene).find(entry => String(entry.id) === id);
  if (!member || memberIds(scene).length >= 6) return { ok: false, reason: "picker-member-unavailable" };
  return nativeAction(root, "equipFromInventory", [member], next => next && memberIds(next).includes(id)
    && officialIds(next).includes(id) && !available(next).some(entry => String(entry.id) === id), "picker-member-unavailable");
}

async function syncBattleOrder(doc, root, targetIds) {
  const scene = actionState(root);
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

export async function applyTeamPreset(doc, preset, { isCurrent = () => true } = {}) {
  const targetIds = [...new Set((preset?.members || []).map(member => String(member?.id ?? "")).filter(Boolean))];
  const targetActive = String(preset?.activeId ?? preset?.leaderId ?? targetIds[0] ?? "");
  if (!targetIds.length || targetIds.length > 6 || !targetIds.includes(targetActive)) return { ok: false, reason: "preset-invalid" };
  if (preset?.orderVerified === false) return { ok: false, reason: "order-unverified" };
  if (!isCurrent() || !currentStorageOwner(doc?.defaultView)) return { ok: false, reason: "owner-changed" };

  const runtime = createPresetRuntime(doc, { isCurrent });
  if (!runtime) return { ok: false, reason: "team-panel-unavailable" };
  const stillBound = () => runtime.isBound();
  const aborted = () => !stillBound() ? { ok: false, reason: "owner-changed" } : null;
  const root = { presetRuntime: runtime };
  try { await runtime.load(); }
  catch (error) { return { ok: false, reason: error?.message === "owner-changed" ? "owner-changed" : "team-panel-unavailable", detail: error?.message }; }
  if (aborted()) return aborted();
  const ready = await waitFor(doc, () => {
    if (!stillBound()) return { ownerChanged: true };
    const next = actionState(root);
    return next && !next._orderBusy && sameMembers(memberIds(next), officialIds(next)) ? next : null;
  });
  if (aborted() || ready?.ownerChanged) return { ok: false, reason: "owner-changed" };
  if (!ready) return { ok: false, reason: "action-timeout" };
  let scene = actionState(root), current = memberIds(scene);
  const maxMembers = 6;
  if (targetIds.length > maxMembers) return { ok: false, reason: "preset-invalid" };

  const known = new Set([...current, ...available(scene).map(member => String(member?.id ?? ""))]);
  const missingIds = targetIds.filter(id => !known.has(id));
  if (missingIds.length) return { ok: false, reason: "member-unavailable", missingIds };
  const activeMember = memberById(scene, targetActive);
  if (activeId(scene) !== targetActive && activeMember && !canLead(activeMember)) return { ok: false, reason: "leader-fainted", memberId: targetActive };

  if (current.length >= maxMembers && !current.includes(targetActive)) {
    if (aborted()) return aborted();
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

  scene = actionState(root); current = memberIds(scene);
  if (aborted()) return aborted();
  if (!current.includes(targetActive)) { const result = await addMember(doc, root, targetActive); if (!result.ok) return result; }
  scene = actionState(root);
  if (aborted()) return aborted();
  if (activeId(scene) !== targetActive) { const result = await setActive(doc, root, targetActive); if (!result.ok) return result; }

  scene = actionState(root); current = memberIds(scene);
  if (aborted()) return aborted();
  for (const id of current.filter(id => !targetIds.includes(id))) { const result = await removeMember(doc, root, id); if (!result.ok) return result; }
  scene = actionState(root); current = memberIds(scene);
  if (aborted()) return aborted();
  for (const id of targetIds.filter(id => !current.includes(id))) {
    if (aborted()) return aborted();
    const result = await addMember(doc, root, id); if (!result.ok) return result;
    scene = actionState(root); current = memberIds(scene);
  }

  scene = actionState(root); current = memberIds(scene);
  if (aborted()) return aborted();
  if (!sameMembers(current, targetIds)) return { ok: false, reason: "final-state-mismatch" };
  const ordered = await syncBattleOrder(doc, root, targetIds); if (!ordered.ok) return ordered;
  scene = actionState(root);
  if (aborted()) return aborted();
  if (activeId(scene) !== targetActive) { const result = await setActive(doc, root, targetActive); if (!result.ok) return result; }

  scene = actionState(root);
  if (aborted()) return aborted();
  if (!sameOrder(officialIds(scene), targetIds) || activeId(scene) !== targetActive) return { ok: false, reason: "final-state-mismatch" };
  return { ok: true, memberIds: officialIds(scene), activeId: targetActive };
}
