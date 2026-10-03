function creatureId(value) {
  return String(value?.id ?? "").trim();
}

function creatureName(win, creature) {
  return String(
    win?.PokeIdle?.DittoDisplayName?.get?.(creature)
    || creature?.nickname
    || creature?.name
    || creature?.species_name
    || creature?.species?.name
    || creature?.species_id
    || creatureId(creature)
    || "Pokémon"
  ).trim();
}

function teamRuntime(win) {
  const runtime = win?.PokeIdle?.PersistentHud?._teamHud;
  const creatures = Array.isArray(runtime?._creatures) ? runtime._creatures : [];
  return { runtime, creatures };
}

export function analyzerSessionControlAvailable(win) {
  const api = win?.[config.analyzerControlGlobal];
  return Boolean(api?.protocol === config.analyzerProtocol && typeof api.act === "function");
}

export function explicitNativeLeaderId(win) {
  const leaders = teamRuntime(win).creatures.filter(creature => creature?.is_leader === true);
  return leaders.length === 1 ? creatureId(leaders[0]) : "";
}

export function teamControlSnapshot(win) {
  const { runtime, creatures } = teamRuntime(win);
  const active = creatures.find(creature => creature?.is_leader) || creatures[0] || null;
  return {
    available: Boolean(
      runtime
      && creatures.length
      && typeof win?.PokeIdle?.Api?.setTeamLeader === "function"
    ),
    activeId: creatureId(active),
    members: creatures.map(creature => ({
      id: creatureId(creature),
      name: creatureName(win, creature),
      level: Number.isFinite(creature?.level) ? Math.max(0, Math.floor(creature.level)) : null,
      fainted: creature?.fainted === true
        || creature?.is_fainted === true
        || (Number.isFinite(creature?.hp) && creature.hp <= 0),
    })).filter(member => member.id),
  };
}

export async function runAnalyzerSessionAction(win, action) {
  const api = win?.[config.analyzerControlGlobal];
  const normalized = String(action || "").trim().toLowerCase();
  if (!api || api.protocol !== config.analyzerProtocol || typeof api.act !== "function" || !["pause", "resume", "reset"].includes(normalized)) {
    return { ok: false, reason: "analyzer-control-unavailable" };
  }
  try {
    const result = await api.act(normalized);
    return result?.ok === true
      ? { ok: true }
      : { ok: false, reason: result?.reason || "analyzer-action-failed" };
  } catch (error) {
    return { ok: false, reason: "analyzer-action-failed", detail: error?.message };
  }
}

export async function setActiveTeamMember(win, id, { expectedLeaderId = "", isCurrentIntent = null } = {}) {
  const targetId = String(id || "").trim();
  const pi = win?.PokeIdle;
  const api = pi?.Api;
  const { creatures } = teamRuntime(win);
  const member = creatures.find(creature => creatureId(creature) === targetId);
  if (!targetId || !member || typeof api?.setTeamLeader !== "function") {
    return { ok: false, reason: "leader-action-unavailable" };
  }
  if (member?.fainted === true || member?.is_fainted === true || (Number.isFinite(member?.hp) && member.hp <= 0)) {
    return { ok: false, reason: "leader-fainted" };
  }
  const previousLeaderId = expectedLeaderId || explicitNativeLeaderId(win);
  try {
    const response = await api.setTeamLeader(member.id);
    const ackAt = Date.now();
    // Another native action or server combat event may supersede this request
    // while it is in flight. Do not replay its old result over a newer leader.
    let intentCurrent = true;
    try { if (typeof isCurrentIntent === "function") intentCurrent = isCurrentIntent() === true; }
    catch { intentCurrent = false; }
    const leaderAtAck = explicitNativeLeaderId(win);
    if (!intentCurrent || (previousLeaderId && leaderAtAck && leaderAtAck !== previousLeaderId && leaderAtAck !== targetId)) {
      return { ok: true, confirmation: "post-accepted", ackAt, superseded: true };
    }
    // Match the native Team HUD: a successful mutation response is the POST
    // acknowledgment. The extra GET previously delayed the UI by another RTT
    // (and possibly GET back-pressure/retries). Native HUD synchronization is
    // observed independently before the Cards action becomes usable again.
    const share = response?.xp_share;
    let xpShare = share;
    try {
      xpShare = pi?.XPSharing ? pi.XPSharing.setProjection(share) : share;
    } catch {}
    let eventDelivered = false;
    try {
      if (typeof pi?.Bus?.emit === "function") {
        pi.Bus.emit("team.updated", { leader_id: member.id, creature: member, xp_share: xpShare });
        eventDelivered = true;
      }
    } catch {}
    return { ok: true, confirmation: "post-accepted", ackAt, eventDelivered };
  } catch (error) {
    return { ok: false, reason: "leader-action-unavailable", detail: error?.message };
  }
}
import { coupledWorkspaceConfig as config } from "./config.js";
