import { currentStorageOwner } from "../../core/trainer-storage-scope.js";

// Same Api methods and team.updated payloads used by PokemonCardHost.toggleTeam.
export function createPresetRuntime(doc, { isCurrent = () => true } = {}) {
  const pi = doc.defaultView?.PokeIdle, api = pi?.Api;
  if (!api || !["getTeam", "getCreatures", "addTeamMember", "removeTeamMember", "setTeamLeader", "setTeamOrder"].every(key => typeof api[key] === "function") || typeof pi?.Bus?.emit !== "function") return null;
  const boundOwner = currentStorageOwner(doc.defaultView);
  const isBound = () => doc.defaultView?.PokeIdle?.Api === api
    && Boolean(boundOwner) && currentStorageOwner(doc.defaultView) === boundOwner && isCurrent();
  const requireBound = () => { if (!isBound()) throw new Error("owner-changed"); };
  if (!isBound()) return null;
  const emit = (response, data) => {
    requireBound();
    const currentPi = doc.defaultView?.PokeIdle;
    const share = response?.xp_share;
    const xpShare = currentPi.XPSharing ? currentPi.XPSharing.setProjection(share) : share;
    requireBound();
    const bus = doc.defaultView?.PokeIdle?.Bus;
    if (typeof bus?.emit !== "function") throw new Error("team-event-bus-unavailable");
    bus.emit("team.updated", { ...data, xp_share: xpShare });
  };
  const state = {
    isBound,
    async load() {
      requireBound();
      const response = await api.getTeam();
      requireBound();
      const [team, inventory] = await Promise.all([api.getCreatures("team"), api.getCreatures("inventory")]);
      requireBound();
      state._team = response.team || response;
      state._creatures = team.data || team;
      state._available = inventory.data || inventory;
    },
    async setLeader(member) {
      requireBound();
      const response = await api.setTeamLeader(member.id);
      requireBound();
      emit(response, { leader_id: member.id, creature: member });
      await state.load();
    },
    async removeMember(member) {
      requireBound();
      const response = await api.removeTeamMember(member.id);
      requireBound();
      const creature = { ...member, location: "inventory", equipped: false };
      emit(response, { removed_id: member.id, removed_creature: creature });
      await state.load();
    },
    async equipFromInventory(member) {
      requireBound();
      const response = await api.addTeamMember(member.id);
      requireBound();
      const creature = { ...member, location: "team", equipped: true };
      emit(response, { added_id: member.id, added_creature: creature });
      await state.load();
    },
    async persistOrder(ids) {
      requireBound();
      const response = await api.setTeamOrder(ids);
      requireBound();
      await state.load();
      requireBound();
      emit(response, { member_ids: [...state._team.member_ids] });
    },
  };
  return state;
}

async function enrichCreaturesWithSpecies(doc, list) {
  const api = doc?.defaultView?.PokeIdle?.Api;
  if (!Array.isArray(list)) return [];
  if (typeof api.getSpecies !== "function") return list;

  // The native Team scene enriches both Team and Backpack creatures through
  // getSpecies() before rendering them. Raw getCreatures("inventory") payloads
  // may therefore lack the sprite metadata that the native cards later expose.
  // Mirror that read-only enrichment here so Saved Team authoring can render the
  // same identity art without opening/clicking the native Add Pokémon picker.
  const speciesReads = new Map();
  return Promise.all(list.map(async creature => {
    const speciesId = String(creature?.species_id ?? creature?.species?.id ?? creature?.species?.species_id ?? "").trim();
    if (!speciesId) return creature;
    if (!speciesReads.has(speciesId)) speciesReads.set(speciesId, Promise.resolve().then(() => api.getSpecies(speciesId)).catch(() => null));
    const species = await speciesReads.get(speciesId);
    if (!species || typeof species !== "object") return creature;
    return { ...creature, species: { ...(creature?.species || {}), ...species } };
  }));
}

export async function loadTeamPresetBackpack(doc) {
  const api = doc?.defaultView?.PokeIdle?.Api;
  if (typeof api?.getCreatures !== "function") return null;

  // Manual Saved Team authoring is allowed to select every Pokémon currently
  // owned by the player, whether it is equipped or sitting in Backpack. Read
  // both native locations without mutating Team state. Team comes first so a
  // transient duplicate id prefers the currently equipped/native Team record;
  // the composer performs the final id de-duplication.
  const [teamResponse, inventoryResponse] = await Promise.all([
    api.getCreatures("team"),
    api.getCreatures("inventory"),
  ]);
  const team = teamResponse?.data || teamResponse;
  const inventory = inventoryResponse?.data || inventoryResponse;
  if (!Array.isArray(team) || !Array.isArray(inventory)) return [];
  return enrichCreaturesWithSpecies(doc, [...team, ...inventory]);
}
