// A unique native leader is required: the first HUD member is only a visual
// fallback in the game, never proof of the leader's identity.
export function currentPptoolsLeader(view) {
  const runtime=view?.PokeIdle?.PersistentHud?._teamHud;
  const creatures=runtime?._creatures;
  const nativeHud=runtime?.el,doc=view?.document;
  if(!nativeHud?.isConnected||nativeHud.ownerDocument!==doc||
    doc.querySelector('.pokeidle-team-hud')!==nativeHud||
    !Array.isArray(creatures)||!creatures.length)return null;
  const leaders=creatures.filter(creature=>creature?.is_leader===true);
  if(leaders.length!==1)return null;
  const member=leaders[0],id=String(member?.id??'').trim();
  if(!id||creatures.filter(creature=>String(creature?.id??'').trim()===id).length!==1)return null;
  const level=Number.isSafeInteger(member.level)&&member.level>=0?member.level:null;
  if(level===null)return null;
  const bodies=new Set([...view.document?.querySelectorAll?.('.pokeidle-team-panel > .pokeidle-panel__body, .pokeidle-team-panel .pokeidle-panel__body')||[]]);
  const cached=view.PokeIdle?.ReactiveWindows?.cached?.();
  const scenes=[...(Array.isArray(cached)?cached:[]),view.SceneManager?._scene];
  const memberIds=creatures.map(creature=>String(creature?.id??'').trim());
  for(const scene of scenes){
    if(!bodies.has(scene?._panel?.body)||!Array.isArray(scene?._team?.member_ids))continue;
    const roster=scene._team.member_ids.map(value=>String(value??'').trim());
    if(roster.length!==memberIds.length||roster.some(value=>!memberIds.includes(value)))continue;
    if(String(scene._team.leader_id??'').trim()!==id)return null;
  }
  const speciesId=String(member.species_id??member.species?.id??'').trim();
  const name=String(member.nickname||member.name||member.species_name||member.species?.name||speciesId||id).trim();
  if(!name)return null;
  return {id,name,level,speciesId};
}

export function samePptoolsLeader(reference,current) {
  return Boolean(reference&&current&&reference.id===current.id&&
    reference.level===current.level&&reference.speciesId===current.speciesId);
}
