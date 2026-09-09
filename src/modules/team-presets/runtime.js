// Same Api methods and team.updated payloads used by PokemonCardHost.toggleTeam.
export function createPresetRuntime(doc) {
  const pi = doc.defaultView?.PokeIdle, api = pi?.Api;
  if (!api || !["getTeam", "getCreatures", "addTeamMember", "removeTeamMember", "setTeamLeader", "setTeamOrder"].every(key => typeof api[key] === "function") || typeof pi?.Bus?.emit !== "function") return null;
  const emit = (response, data) => {
    const share = response?.xp_share;
    const xpShare = pi.XPSharing ? pi.XPSharing.setProjection(share) : share;
    pi.Bus.emit("team.updated", { ...data, xp_share: xpShare });
  };
  const state = {
    async load() {
      const response = await api.getTeam();
      const [team, inventory] = await Promise.all([api.getCreatures("team"), api.getCreatures("inventory")]);
      state._team = response.team || response;
      state._creatures = team.data || team;
      state._available = inventory.data || inventory;
    },
    async setLeader(member) {
      const response = await api.setTeamLeader(member.id);
      emit(response, { leader_id: member.id, creature: member });
      await state.load();
    },
    async removeMember(member) {
      const response = await api.removeTeamMember(member.id);
      const creature = { ...member, location: "inventory", equipped: false };
      emit(response, { removed_id: member.id, removed_creature: creature });
      await state.load();
    },
    async equipFromInventory(member) {
      const response = await api.addTeamMember(member.id);
      const creature = { ...member, location: "team", equipped: true };
      emit(response, { added_id: member.id, added_creature: creature });
      await state.load();
    },
    async persistOrder(ids) {
      const response = await api.setTeamOrder(ids);
      await state.load();
      emit(response, { member_ids: [...state._team.member_ids] });
    },
  };
  return state;
}
