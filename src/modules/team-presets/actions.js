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

function refresh(root) {
  const scene = sceneForRoot(root);
  return scene ? { root, scene } : null;
}

async function selectMember(doc, root, id) {
  const context = refresh(root), index = officialIds(context?.scene).indexOf(id);
  if (!context || index < 0) return { ok: false, reason: "team-slot-unavailable" };
  const slot = root.querySelectorAll(config.selectors.teamSlot)[index];
  if (!slot || slot.disabled) return { ok: false, reason: "team-slot-unavailable" };
  slot.click(); await sleep(doc, 0); return { ok: true };
}

async function setActive(doc, root, id) {
  const selected = await selectMember(doc, root, id);
  if (!selected.ok) return selected;
  const button = await waitFor(doc, () => {
    const next = root.querySelector(config.selectors.teamActiveAction);
    return next && !next.disabled ? next : null;
  });
  if (!button) return { ok: false, reason: "leader-action-unavailable" };
  button.click();
  const confirmed = await waitFor(doc, () => activeId(sceneForRoot(root)) === id);
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
    return scene && !memberIds(scene).includes(id);
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
  return waitFor(doc, () => [...doc.querySelectorAll(config.selectors.picker)].find(node => !node.closest("[hidden]")) || null);
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
    return next && memberIds(next).includes(id);
  });
  return confirmed ? { ok: true } : { ok: false, reason: "action-timeout" };
}

function orderDirection(button) {
  const label = [button.textContent, button.getAttribute("aria-label"), button.title].filter(Boolean).join(" ").trim().toLowerCase();
  if (/[←⟵‹]/.test(label) || /\b(left|esquerda|izquierda)\b/.test(label)) return -1;
  if (/[→⟶›]/.test(label) || /\b(right|direita|derecha)\b/.test(label)) return 1;
  return 0;
}

async function moveOrder(doc, root, id, direction) {
  const scene = sceneForRoot(root), before = officialIds(scene), index = before.indexOf(id), target = index + direction;
  if (index < 0 || target < 0 || target >= before.length) return { ok: false, reason: "order-action-unavailable" };
  const selected = await selectMember(doc, root, id); if (!selected.ok) return selected;
  const button = await waitFor(doc, () => {
    const profile = root.querySelector(config.selectors.teamProfile);
    return profile ? [...profile.querySelectorAll(config.selectors.teamOrderButton)].find(node => !node.disabled && orderDirection(node) === direction) || null : null;
  });
  if (!button) return { ok: false, reason: "order-action-unavailable" };
  const expected = [...before]; [expected[index], expected[target]] = [expected[target], expected[index]];
  button.click();
  const confirmed = await waitFor(doc, () => sameOrder(officialIds(sceneForRoot(root)), expected));
  return confirmed ? { ok: true } : { ok: false, reason: "action-timeout" };
}

async function syncBattleOrder(doc, root, targetIds) {
  for (let targetIndex = 0; targetIndex < targetIds.length; targetIndex++) {
    const id = targetIds[targetIndex];
    while (true) {
      const order = officialIds(sceneForRoot(root)), currentIndex = order.indexOf(id);
      if (currentIndex === targetIndex) break;
      if (currentIndex < targetIndex || currentIndex < 0) return { ok: false, reason: "order-final-state-mismatch" };
      const result = await moveOrder(doc, root, id, -1);
      if (!result.ok) return result;
    }
  }
  return sameOrder(officialIds(sceneForRoot(root)), targetIds) ? { ok: true } : { ok: false, reason: "order-final-state-mismatch" };
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
