import assert from 'node:assert/strict';
import {test} from 'node:test';
import {JSDOM} from 'jsdom';
import {readPptoolsNativeInput,currentPptoolsProfileId,toPptoolsAttackerInput,PptoolsNativeInputError} from '../src/modules/hunts/pptools-native-input.js';

const baseCreature = (id='a') => ({
  id,species_id:'charizard',name:'Charizard',level:120,is_leader:true,
  ivs:{hp:31,atk:29,def:28,spa:30,spd:26,spe:27},iv_total:171,
  quality:'legendary',quality_multiplier:1.62,nature:'adamant',gender:'male',
  is_shiny:false,is_starter:true,
});

function fixture(t) {
  const dom = new JSDOM('<div class="pokeidle-team-hud"></div>',{url:'https://synthetic-game.local/'});
  const win=dom.window,hud=win.document.querySelector('.pokeidle-team-hud');
  const member=baseCreature(),trainer={level:75,exp_buff:0.15,buffs:{stone:0.02,activity:true}};
  win.PokeIdle={
    Auth:{getTrainerSummary:()=>({id:'account-a',level:trainer.level})},
    WorldPresence:{getSelfTrainerId:()=> 'account-a'},
    PersistentHud:{_teamHud:{el:hud,_trainer:trainer,_creatures:[member]}},
  };
  t.after(()=>dom.window.close());
  return {dom,win,hud,member,trainer};
}

test('valid native projection preserves six individual IVs and explicit trainer/creature fields',async t=>{
  const s=fixture(t),out=await readPptoolsNativeInput(s.win);
  assert.deepEqual(out.leader,{id:'a',name:'Charizard',level:120,speciesId:'charizard'});
  assert.equal(out.profileId,'account-a');
  assert.deepEqual({...out.payload},{
    speciesId:'charizard',lvl:120,ivs:{hp:31,atk:29,def:28,spa:30,spd:26,spe:27},
    qualityTier:'legendary',multiplier:1.62,nature:'adamant',gender:'male',
    trainerLevel:75,expBuff:null,starter:true,shiny:false,
  });
  assert.equal(out.payload.nickname,undefined);
  assert.equal(out.payload.id,undefined,'instance id is correlated locally, not disclosed to external simulator');
});

test('PPTools import contract uses site fixture names and maps special IV aliases without guessing values',async t=>{
  const s=fixture(t);
  const native=(await readPptoolsNativeInput(s.win)).payload;
  const input=toPptoolsAttackerInput(native);
  assert.deepEqual(input,{
    pokemon:'charizard',level:120,trainerLevel:75,
    qualityTier:'legendary',quality:'legendary',exactMultiplier:1.62,
    nature:'adamant',gender:'male',isShiny:false,isStarter:true,expBuff:1,
    ivs:{hp:31,atk:29,def:28,spAtk:30,spDef:26,speed:27},
  });
  assert.equal(input.lvl,undefined);assert.equal(input.speciesId,undefined);
  assert.equal(input.ivs.spa,undefined);
  assert.throws(()=>toPptoolsAttackerInput({...native,trainerLevel:undefined}),error=>error.code==='missing-field');
});

test('async native Team and card detail enrich the exact same instance without using another leader',async t=>{
  const s=fixture(t),authoritative={...s.member},partial={id:'a',species_id:'charizard',name:'Charizard',level:120,is_leader:true};
  s.win.PokeIdle.PersistentHud._teamHud._creatures=[partial];
  const calls=[];
  s.win.PokeIdle.Api={
    getTeam:async()=>{calls.push('team');return {team:{leader_id:'a',member_ids:['a','b']}};},
    getCreatures:async location=>{calls.push(location);return {data:[{...partial,ivs:authoritative.ivs,iv_total:171}]};},
  };
  s.win.PokeIdle.PokemonCardData={loadDetail:async(id,speciesId,creature)=>{
    calls.push(`${id}/${speciesId}`);
    assert.equal(creature.iv_total,171);
    return {creature:{...authoritative}};
  }};
  const out=await readPptoolsNativeInput(s.win);
  assert.deepEqual(calls,['team','team','a/charizard']);
  assert.equal(out.payload.multiplier,1.62);
  assert.equal(out.payload.nature,'adamant');
});

test('reads Team confirmation before the creature list when its native refresh settles asynchronously',async t=>{
  const s=fixture(t),calls=[];
  let teamReady=false;
  s.win.PokeIdle.Api={
    getTeam:async()=>{calls.push('getTeam');await Promise.resolve();teamReady=true;return {team:{leader_id:'a',member_ids:['a']}};},
    getCreatures:async()=>{calls.push('getCreatures');return {data:[{...s.member,level:teamReady?120:119}]};},
  };
  const out=await readPptoolsNativeInput(s.win);
  assert.equal(out.leader.level,120);
  assert.deepEqual(calls,['getTeam','getCreatures']);
});

test('one transient outdated native detail level is reread for the same unchanged leader',async t=>{
  const s=fixture(t);
  let calls=0;
  s.win.PokeIdle.PokemonCardData={loadDetail:async()=>{
    calls++;
    return {creature:{...s.member,level:calls===1?119:120}};
  }};
  const out=await readPptoolsNativeInput(s.win);
  assert.equal(out.leader.level,120);
  assert.equal(out.payload.lvl,120);
  assert.equal(calls,2);
});

test('persistently different native detail level remains blocked after the bounded reread',async t=>{
  const s=fixture(t);
  let calls=0;
  s.win.PokeIdle.PokemonCardData={loadDetail:async()=>{
    calls++;
    return {creature:{...s.member,level:119}};
  }};
  await assert.rejects(readPptoolsNativeInput(s.win),error=>error.code==='stale');
  assert.equal(calls,2);
});

test('a real leader level-up during the bounded reread aborts without adopting the newer level',async t=>{
  const s=fixture(t);
  let calls=0;
  s.win.PokeIdle.PokemonCardData={loadDetail:async()=>{
    calls++;
    return {creature:{...s.member,level:119}};
  }};
  const pending=readPptoolsNativeInput(s.win);
  s.win.setTimeout(()=>{s.member.level=121;},0);
  await assert.rejects(pending,error=>error.code==='stale');
  assert.equal(calls,1);
});

test('same-id native enrichments may omit identity fields and cannot erase complete HUD facts',async t=>{
  const s=fixture(t);
  s.win.PokeIdle.Api={
    getTeam:async()=>({team:{leader_id:'a',member_ids:['a']}}),
    getCreatures:async()=>({data:[{id:'a',ivs:{hp:31,atk:29},quality:null,nature:undefined}]}),
  };
  s.win.PokeIdle.PokemonCardData={loadDetail:async()=>({
    creature:{id:'a',species:{species_id:'charizard'},ivs:{spa:30,spd:26,spe:27}},
  })};
  const out=await readPptoolsNativeInput(s.win);
  assert.equal(out.payload.speciesId,'charizard');
  assert.deepEqual(out.payload.ivs,s.member.ivs);
  assert.equal(out.payload.qualityTier,'legendary');
  assert.equal(out.payload.nature,'adamant');
});

test('partial species metadata cannot erase the nested native species identity',async t=>{
  const s=fixture(t);
  delete s.member.species_id;
  s.member.species={id:'charizard',name:'Charizard'};
  s.win.PokeIdle.Api={
    getTeam:async()=>({team:{leader_id:'a',member_ids:['a']}}),
    getCreatures:async()=>({data:[{id:'a',species:{name:'Charizard updated'}}]}),
  };
  const out=await readPptoolsNativeInput(s.win);
  assert.equal(out.leader.speciesId,'charizard');
  assert.equal(out.payload.speciesId,'charizard');
});

test('partial enrichment may provide a missing native field only through the same ID',async t=>{
  const s=fixture(t);
  delete s.member.nature;
  s.win.PokeIdle.Api={
    getTeam:async()=>({team:{leader_id:'a',member_ids:['a']}}),
    getCreatures:async()=>({data:[{id:'a',nature:'adamant'}]}),
  };
  const out=await readPptoolsNativeInput(s.win);
  assert.equal(out.payload.nature,'adamant');
});

test('partial enrichment still rejects a different instance, species, or known IV',async t=>{
  const s=fixture(t);
  s.win.PokeIdle.Api={
    getTeam:async()=>({team:{leader_id:'a',member_ids:['a']}}),
    getCreatures:async()=>({data:[{id:'a',species:{species_id:'blastoise'}}]}),
  };
  await assert.rejects(readPptoolsNativeInput(s.win),error=>error.code==='stale');
  s.win.PokeIdle.Api.getCreatures=async()=>({data:[{id:'a',ivs:{hp:1}}]});
  await assert.rejects(readPptoolsNativeInput(s.win),error=>error.code==='stale');
  s.win.PokeIdle.PokemonCardData={loadDetail:async()=>({creature:{id:'b',nature:'adamant'}})};
  s.win.PokeIdle.Api.getCreatures=async()=>({data:[{id:'a'}]});
  await assert.rejects(readPptoolsNativeInput(s.win),error=>error.code==='stale');
  s.win.PokeIdle.PokemonCardData.loadDetail=async()=>({creature:{nature:'adamant'}});
  await assert.rejects(readPptoolsNativeInput(s.win),error=>error.code==='stale');
  s.win.PokeIdle.PokemonCardData.loadDetail=async()=>({creature:{
    id:'a',species_id:'charizard',species:{id:'blastoise'},level:120,
  }});
  await assert.rejects(readPptoolsNativeInput(s.win),error=>error.code==='stale');
});

test('equivalent IV values from Team and detail may arrive in different object key orders',async t=>{
  const s=fixture(t);
  const reversedIvs=Object.fromEntries(Object.entries(s.member.ivs).reverse());
  s.win.PokeIdle.Api={
    getTeam:async()=>({team:{leader_id:'a',member_ids:['a']}}),
    getCreatures:async()=>({data:[{...s.member,ivs:reversedIvs}]}),
  };
  s.win.PokeIdle.PokemonCardData={loadDetail:async()=>({creature:{...s.member,ivs:reversedIvs}})};
  const result=await readPptoolsNativeInput(s.win);
  assert.deepEqual(result.payload.ivs,{hp:31,atk:29,def:28,spa:30,spd:26,spe:27});
  s.win.PokeIdle.Api.getCreatures=async()=>({data:[{...s.member,ivs:{...reversedIvs,hp:12}}]});
  await assert.rejects(readPptoolsNativeInput(s.win),error=>error.code==='stale');
});

test('native read aborts when leader switches while an async API call is unresolved',async t=>{
  const s=fixture(t);
  let finish;
  s.win.PokeIdle.Api={getTeam:()=>new Promise(resolve=>{finish=resolve;}),getCreatures:async()=>({data:[s.member]})};
  const pending=readPptoolsNativeInput(s.win);
  s.member.is_leader=false;
  s.win.PokeIdle.PersistentHud._teamHud._creatures.push({...baseCreature('b'),is_leader:true});
  finish({team:{leader_id:'a',member_ids:['a']}});
  await assert.rejects(pending,error=>error instanceof PptoolsNativeInputError&&error.code==='stale');
});

test('native Copy JSON fields stay strict; PPTools-only parameters use documented neutral simulation defaults',async t=>{
  const s=fixture(t);
  for(const field of ['ivs','quality','quality_multiplier','nature','gender','is_shiny']){
    const saved=s.member[field];delete s.member[field];
    await assert.rejects(readPptoolsNativeInput(s.win),error=>error.code==='missing-field',field);
    s.member[field]=saved;
  }
  for(const field of ['level']){
    const saved=s.trainer[field];delete s.trainer[field];
    await assert.rejects(readPptoolsNativeInput(s.win),error=>error.code==='missing-field',field);
    s.trainer[field]=saved;
  }
  s.member.ivs.hp=32;
  await assert.rejects(readPptoolsNativeInput(s.win),error=>error.code==='missing-field');
  s.member.ivs.hp=31;s.member.iv_total=170;
  await assert.rejects(readPptoolsNativeInput(s.win),error=>error.code==='stale');
  s.member.iv_total=171;s.trainer.exp_buff=0;
  delete s.trainer.buffs;
  const withoutIrrelevantBuffs=await readPptoolsNativeInput(s.win);
  assert.equal(withoutIrrelevantBuffs.payload.expBuff,null);
  assert.equal(toPptoolsAttackerInput(withoutIrrelevantBuffs.payload).expBuff,1);
  assert.equal(Object.hasOwn(withoutIrrelevantBuffs.payload,'buffs'),false);
  s.member.is_starter='false';
  await assert.rejects(readPptoolsNativeInput(s.win),error=>error.code==='missing-field');
});

test('native COPIAR JSON Entei shape projects without trainer.exp_buff or is_starter',async t=>{
  const s=fixture(t);
  Object.assign(s.member,{
    species_id:'entei',name:'Entei',level:32,
    ivs:{hp:18,atk:17,def:13,spa:31,spd:28,spe:31},
    quality:'legendary',quality_multiplier:1.62,
    nature:'hardy',gender:'male',is_shiny:false,
  });
  delete s.member.iv_total;
  delete s.member.is_starter;
  delete s.trainer.exp_buff;
  const native=await readPptoolsNativeInput(s.win);
  assert.equal(native.payload.starter,null);
  assert.equal(native.payload.expBuff,null);
  assert.deepEqual(toPptoolsAttackerInput(native.payload),{
    pokemon:'entei',level:32,trainerLevel:75,
    qualityTier:'legendary',quality:'legendary',exactMultiplier:1.62,
    nature:'hardy',gender:'male',isShiny:false,isStarter:false,expBuff:1,
    ivs:{hp:18,atk:17,def:13,spAtk:31,spDef:28,speed:31},
  });
});

test('rejects disagreement between native HUD, Team, detail and profile sources',async t=>{
  const s=fixture(t);
  s.win.PokeIdle.Auth.getTrainerSummary=()=>({id:'other',level:75});
  assert.throws(()=>currentPptoolsProfileId(s.win),error=>error.code==='profile');
  s.win.PokeIdle.Auth.getTrainerSummary=()=>({id:'account-a',level:76});
  await assert.rejects(readPptoolsNativeInput(s.win),error=>error.code==='stale');
  s.win.PokeIdle.Auth.getTrainerSummary=()=>({id:'account-a',level:75});
  s.win.PokeIdle.Api={getTeam:async()=>({team:{leader_id:'b',member_ids:['a','b']}}),getCreatures:async()=>({data:[s.member]})};
  await assert.rejects(readPptoolsNativeInput(s.win),error=>error.code==='native-read');
  s.win.PokeIdle.Api.getTeam=async()=>({team:{leader_id:'a',member_ids:['a']}});
  s.win.PokeIdle.PokemonCardData={loadDetail:async()=>({creature:{...s.member,level:121}})};
  await assert.rejects(readPptoolsNativeInput(s.win),error=>error.code==='stale');
});

test('two documents have independent native owners and no implicit active global pane',async t=>{
  const a=fixture(t),b=fixture(t);
  b.member.id='b';b.member.level=66;b.member.is_shiny=true;
  b.win.PokeIdle.Auth.getTrainerSummary=()=>({id:'account-b',level:75});
  b.win.PokeIdle.WorldPresence.getSelfTrainerId=()=> 'account-b';
  const [left,right]=await Promise.all([readPptoolsNativeInput(a.win),readPptoolsNativeInput(b.win)]);
  assert.equal(left.leader.id,'a');assert.equal(right.leader.id,'b');
  assert.equal(left.payload.lvl,120);assert.equal(right.payload.lvl,66);
  assert.equal(left.payload.shiny,false);assert.equal(right.payload.shiny,true);
  assert.equal(left.profileId,'account-a');assert.equal(right.profileId,'account-b');
});
