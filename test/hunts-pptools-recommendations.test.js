import assert from 'node:assert/strict';
import {test} from 'node:test';
import {JSDOM} from 'jsdom';
import {mountHunts} from '../src/modules/hunts/controller.js';
import {parsePptoolsRecommendations,resolvePptoolsHunt} from '../src/modules/hunts/pptools-recommendations.js';

const ROWS=[
  ['Pikachu','Forest',20,'120 mil/h','3 mil/h'],
  ['Gengar','Tower',85,'105 mil/h','7 mil/h'],
  ['Geodude','Tunnel',40,'93 mil/h','8 mil/h'],
];

const sample=(items=ROWS,other={})=>JSON.stringify({
  schema:'ppbui.pptools.hunt-recommendations',version:1,
  source:{url:'https://www.pptools.com.br/hunt-analyzer',
    capturedAt:new Date().toISOString(),sort:{key:'xp',direction:'desc'},
    filter:'',scope:{kind:'all-results',page:null},...other.source},
  attacker:{speciesId:null,speciesNameText:null,level:null,...other.attacker},
  recommendations:items.map(([pokemon,hunt,level,xp,gold],i)=>({
    rank:i+1,wildSpeciesName:pokemon,huntName:hunt,
    wildLevelText:String(level),wildLevel:typeof level==='number'?level:null,
    xpPerHourText:xp,goldPerHourText:gold,
  })),
});

const settle=()=>new Promise(resolve=>setImmediate(resolve));
const runs=s=>s.messages.filter(m=>m.type==='ppbui.pptools.run');
const cancels=s=>s.messages.filter(m=>m.type==='ppbui.pptools.cancel');

function fixture(t,{mode='list',duplicates=false,enabled=true,profileId='account-a'}={}) {
  const nativeList='<div class="hunt-list-header"></div><div class="hunt-list-toolbar"><input type="search"></div>'+
    '<div class="hunt-list-table-shell"><table class="hunt-list-table"><tbody>'+
    ROWS.map((row,i)=>'<tr class="hunt-list-row"><td><button class="hunt-list-hunt-button">Hunt</button>'+
      '<button class="hunt-list-details-button" aria-controls="hunt-list-details-'+i+'">Details</button></td>'+
      '<td><div class="hunt-list-identity"><strong>'+row[1]+'</strong></div></td></tr>').join('')+
    '</tbody></table></div>';
  const nativeMap='<div class="hunt-world-header"><div class="hunt-world-tabs"></div></div>'+
    '<div class="hunt-world-toolbar"><input type="search"><input type="number" value="1"><input type="number" value="100"></div>'+
    '<div class="hunt-world-elements"></div><div class="hunt-world-viewport"><div class="hunt-world-stage">'+
    ROWS.map((row,i)=>'<button class="hunt-map-marker" data-zone-index="'+i+'" style="left:'+(60-i*20)+'%;top:'+(35-i*5)+'%">'+
      '<strong class="hunt-map-marker__name">'+row[1]+'</strong></button>').join('')+
    (duplicates?'<button class="hunt-map-marker" data-zone-index="3" style="left:10%;top:10%">'+
      '<strong class="hunt-map-marker__name">Forest</strong></button>':'')+'</div></div>';
  const dom=new JSDOM('<div class="hunt-window"><div class="pokeidle-panel__titlebar">'+
    '<span class="pokeidle-panel__title">Hunts</span></div><div class="pokeidle-panel__body">'+
    (mode==='list'?nativeList:nativeMap)+'</div></div><div class="pokeidle-team-hud"></div>',
    {url:'https://synthetic-game.local/play/',pretendToBeVisual:true});
  const win=dom.window,doc=win.document,root=doc.querySelector('.hunt-window');
  const hud=doc.querySelector('.pokeidle-team-hud');
  const creature=(id,isLeader)=>({
    id,name:'Charizard',species_id:'charizard',level:120,is_leader:isLeader,
    ivs:{hp:31,atk:29,def:28,spa:30,spd:26,spe:27},iv_total:171,
    quality:'legendary',quality_multiplier:1.62,nature:'adamant',
    gender:'male',is_shiny:false,is_starter:true,
  });
  const members=[creature('leader-a',true),creature('leader-b',false)];
  const trainer={level:75,exp_buff:1.5,buffs:{stone:0.02,activity:true}};
  const listeners=new Map(),hostListeners=new Map(),messages=[],clipboard=[];
  const bus={
    on(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},
    off(name,fn){listeners.get(name)?.delete(fn);},
    emit(name,value){for(const fn of listeners.get(name)||[])fn(value);},
  };
  const host={
    postMessage(message){messages.push(message);},
    addEventListener(name,fn){if(!hostListeners.has(name))hostListeners.set(name,new Set());hostListeners.get(name).add(fn);},
    removeEventListener(name,fn){hostListeners.get(name)?.delete(fn);},
    emit(data){for(const fn of hostListeners.get('message')||[])fn({data});},
  };
  Object.defineProperty(win,'chrome',{configurable:true,value:{webview:host}});
  Object.defineProperty(win.navigator,'clipboard',{configurable:true,value:{
    readText:async()=>{clipboard.push('read');throw Error('clipboard forbidden');},
    writeText:async()=>{clipboard.push('write');throw Error('clipboard forbidden');},
  }});
  if(enabled)win.__PPBUI_COUPLED_WORKSPACE__={pptoolsBackground:true};
  const profile={id:profileId};
  win.PokeIdle={
    Localization:{get:()=> 'pt-BR'},Bus:bus,
    PersistentHud:{_teamHud:{el:hud,_trainer:trainer,_creatures:members}},
    Auth:{getTrainerSummary:()=>({id:profile.id,level:trainer.level})},
    WorldPresence:{getSelfTrainerId:()=>profile.id},
  };
  const zones=ROWS.map((row,i)=>({
    id:'zone-'+i,name:row[1],world:'kanto',min:row[2],max:row[2],
    elements:['normal'],drops:[],
  }));
  if(duplicates)zones.push({...zones[0],id:'zone-duplicate'});
  const body=root.querySelector('.pokeidle-panel__body');
  const scene={
    _panel:{body},_tab:'kanto',_zones:zones,_selectedIndex:-1,
    _worldMapState:{scale:1,x:0,y:0},_worldMapStates:{},
    _worldLayouts:{kanto:{width:1000,height:800}},
    zoneWorld:z=>z.world,zoneName:z=>z.name,
    zoneMinMaxLevel:z=>({min:z.min,max:z.max}),
    zoneElements:z=>z.elements,zoneDrops:z=>z.drops,
    hideDropTooltip(){},canEnterWorld:()=>true,
    _navigationCleanup(){},saveWorldMapState(){this._worldMapStates[this._tab]={...this._worldMapState};},
    setupWorldMapNavigation(view,stage){this._worldMapState={...this._worldMapStates[this._tab]};stage.style.transform='scale(1)';},
    starts:0,startHunt(){this.starts++;throw Error('A recommendation must not initiate native Hunt.');},
  };
  win.SceneManager={_scene:scene};
  if(mode==='map'){
    const viewport=root.querySelector('.hunt-world-viewport');
    Object.defineProperties(viewport,{
      clientWidth:{configurable:true,get:()=>viewport.parentElement?.classList.contains('is-inspector-open')?300:400},
      clientHeight:{configurable:true,value:300},
    });
  }else{
    root.querySelectorAll('.hunt-list-hunt-button').forEach(button=>
      button.addEventListener('click',()=>scene.startHunt()));
  }
  const before=root.outerHTML,nativeStart=scene.startHunt,controller=mountHunts(root);
  t.after(()=>{controller.cleanup();win.close();});
  const ui=()=>root.querySelector('[data-ppbui-pptools-oneclick]');
  return {
    dom,win,doc,root,hud,members,trainer,scene,controller,profile,bus,host,
    hostListeners,listeners,messages,clipboard,before,nativeStart,ui,
    get run(){return ui()?.querySelector('[data-ppbui-pptools-run]');},
    get rows(){return [...(ui()?.querySelectorAll('.ppbui-hunts-pptools-oneclick__result')||[])];},
    get status(){return ui()?.querySelector('[role=status]')?.textContent;},
  };
}

async function request(s) {
  s.run.click();await settle();await settle();
  return runs(s).at(-1);
}
async function reply(s,id,json=sample()) {
  s.host.emit({type:'ppbui.pptools.result',requestId:id,ok:true,resultJson:json});
  await settle();await settle();
}

test('retains strict version/source/rank/size and original text-level parser contract',()=>{
  const parsed=parsePptoolsRecommendations(sample([['Abra','Tower','10–15','11k','8k']]));
  assert.equal(parsed.recommendations[0].wildLevelText,'10–15');
  assert.equal(parsed.recommendations[0].wildLevel,null);
  assert.equal(parsed.attacker.speciesId,null);
  for(const broken of [
    value=>{value.schema='wrong';},
    value=>{value.source.url='https://www.pptools.com.br.evil.test/hunt-analyzer';},
    value=>{value.source.scope.kind='unknown';},
    value=>{value.source.sort.key='speed';},
    value=>{value.source.sort.direction='up';},
    value=>{value.recommendations[0].rank=3;},
    value=>{value.recommendations[0].xpPerHourText='';},
    value=>{value.recommendations=[];},
  ]){
    const value=JSON.parse(sample());broken(value);
    assert.throws(()=>parsePptoolsRecommendations(JSON.stringify(value)));
  }
  assert.throws(()=>parsePptoolsRecommendations('{'.repeat(16001)));
  assert.throws(()=>parsePptoolsRecommendations(sample([['Pikachu','á'.repeat(150),'20','120k','3k']])));
});

test('list controller: one click sends complete native attacker and Top3 searches the native list, never Hunt',async t=>{
  const s=fixture(t);
  assert.equal(s.root.querySelector('.ppbui-hunts-pptools'),null);
  assert.equal(s.root.querySelector('textarea'),null);
  assert.equal(s.root.querySelector('input[type=checkbox]'),null);
  assert.equal(s.run.disabled,false);
  const sent=await request(s);
  assert.equal(sent.type,'ppbui.pptools.run');
  assert.equal(sent.protocol,1);
  assert.match(sent.requestId,/^pptools-[0-9a-f]{32}$/);
  assert.equal(sent.leaderId,'leader-a');
  const attacker=JSON.parse(sent.inputJson);
  assert.equal(attacker.pokemon,'charizard');
  assert.equal(attacker.level,120);
  assert.equal(attacker.trainerLevel,75);
  assert.equal(attacker.exactMultiplier,1.62);
  assert.deepEqual(Object.keys(attacker.ivs),['hp','atk','def','spAtk','spDef','speed']);
  assert.equal(attacker.isStarter,true);
  assert.equal(attacker.expBuff,1);
  assert.deepEqual(s.clipboard,[]);
  await reply(s,sent.requestId);
  assert.equal(s.rows.length,3);
  assert.equal(s.rows[0].querySelector('strong').textContent,'1. Pikachu');
  assert.match(s.rows[0].textContent,/Forest/);
  assert.match(s.rows[0].textContent,/120 mil\/h/);
  assert.match(s.ui().querySelector('.ppbui-hunts-pptools-oneclick__notice').textContent,/equivalência/i);
  const search=s.rows[0].querySelector('button');
  assert.equal(search.textContent,'Search');
  assert.equal(search.disabled,false);
  const input=s.root.querySelector('.hunt-list-toolbar input[type=search]');
  const nativeFocus=input.focus.bind(input);let focusOptions='not-focused';
  input.focus=options=>{focusOptions=options;nativeFocus(options);};
  const inputs=[];input.addEventListener('input',()=>inputs.push(input.value));
  search.click();await settle();await settle();
  assert.deepEqual(inputs,['Forest']);
  assert.equal(input.value,'Forest');
  assert.equal(s.doc.activeElement,input);
  assert.equal(focusOptions,undefined,'Search focus must allow scrolling the field into view');
  assert.match(s.status,/Busca na lista: Forest/i);
  assert.match(s.status,/mundo e filtros/i);
  assert.equal(s.scene._selectedIndex,-1);
  assert.equal(s.scene.starts,0);
});

test('map controller: Locate selects native marker, opens inspector, pans and never starts Hunt',async t=>{
  const s=fixture(t,{mode:'map'});
  const sent=await request(s);
  await reply(s,sent.requestId);
  assert.equal(s.rows.length,3);
  const target=s.root.querySelector('.hunt-map-marker[data-zone-index="0"]');
  const locate=s.rows[0].querySelector('button');
  assert.equal(locate.disabled,false);
  locate.click();await settle();await settle();
  assert.equal(s.scene.starts,0);
  assert.equal(s.doc.activeElement,target);
  assert.equal(target.classList.contains('ppbui-hunts-selected-marker'),true);
  assert.equal(target.classList.contains('ppbui-hunts-located-marker'),true);
  assert.equal(s.root.querySelector('.ppbui-hunts-inspector').hidden,false);
  assert.match(s.status,/Hunt localizada/);
  s.controller.cleanup();
  assert.equal(s.ui(),null);
  assert.equal(s.root.querySelector('[data-ppbui-module="hunts-pptools-oneclick"]'),null);
  assert.equal(s.root.querySelector('.hunt-world-viewport').parentElement.className,'pokeidle-panel__body');
  assert.equal(s.scene.starts,0);
});

test('map native eligibility is reevaluated; list Search relies on search availability, not on visible rows or Details',async t=>{
  const map=fixture(t,{mode:'map',duplicates:true});
  await reply(map,(await request(map)).requestId);
  const first=map.rows[0].querySelector('button');
  assert.equal(first.disabled,true);
  assert.match(map.rows[0].textContent,/Mais de uma hunt/);
  const second=map.rows[1].querySelector('button');
  assert.equal(second.disabled,false);
  map.root.querySelector('[data-zone-index="1"]').hidden=true;
  map.controller.sync();assert.equal(second.disabled,true);
  map.root.querySelector('[data-zone-index="1"]').hidden=false;
  map.scene._zones[3].name='Different';map.controller.sync();
  assert.equal(first.disabled,false);
  const marker=map.root.querySelector('[data-zone-index="0"]');
  marker.style.left='auto';map.controller.sync();assert.equal(first.disabled,true);
  marker.style.left='60%';marker.setAttribute('inert','');map.controller.sync();
  assert.equal(first.disabled,true);
  marker.removeAttribute('inert');map.controller.sync();
  assert.equal(first.disabled,false);
  assert.equal(map.scene.starts,0);
  const list=fixture(t);
  await reply(list,(await request(list)).requestId);
  const button=list.rows[0].querySelector('button'),detail=list.root.querySelector('.hunt-list-details-button');
  detail.disabled=true;list.controller.sync();assert.equal(button.disabled,false);
  detail.style.display='none';list.controller.sync();assert.equal(button.disabled,false);
  list.root.querySelector('.hunt-list-row').hidden=true;list.controller.sync();assert.equal(button.disabled,false);
  const nativeSearch=list.root.querySelector('.hunt-list-toolbar input[type=search]');
  nativeSearch.disabled=true;list.controller.sync();assert.equal(button.disabled,true);
  nativeSearch.disabled=false;nativeSearch.readOnly=true;list.controller.sync();assert.equal(button.disabled,true);
  nativeSearch.readOnly=false;nativeSearch.setAttribute('inert','');list.controller.sync();assert.equal(button.disabled,true);
  nativeSearch.removeAttribute('inert');list.controller.sync();assert.equal(button.disabled,false);
  assert.equal(list.scene.starts,0);
});

test('Search replaces an unrelated native filter for a hidden recommendation without changing world or Hunt state',async t=>{
  const s=fixture(t);
  await reply(s,(await request(s)).requestId);
  const search=s.root.querySelector('.hunt-list-toolbar input[type=search]');
  const rows=[...s.root.querySelectorAll('.hunt-list-row')];
  const typed=[];
  search.addEventListener('input',()=>{
    typed.push(search.value);
    for(const row of rows)row.hidden=!row.querySelector('.hunt-list-identity strong').textContent.toLowerCase().includes(search.value.toLowerCase());
  });
  search.value='Tower';search.dispatchEvent(new s.win.Event('input',{bubbles:true}));
  s.controller.sync();
  assert.equal(rows[0].hidden,true);
  const action=s.rows[0].querySelector('button');
  assert.equal(action.disabled,false,'Search must remain enabled even when the matching row is filtered out');
  action.click();await settle();await settle();
  assert.deepEqual(typed,['Tower','Forest']);
  assert.equal(rows[0].hidden,false);
  assert.equal(rows[1].hidden,true);
  assert.equal(search.value,'Forest');
  assert.equal(s.doc.activeElement,search);
  assert.equal(s.scene._tab,'kanto');
  assert.equal(s.scene._selectedIndex,-1);
  assert.equal(s.scene.starts,0);
});

test('Search reacquires a replaced native input after async leader validation and never writes the detached input',async t=>{
  const s=fixture(t);
  await reply(s,(await request(s)).requestId);
  let finishTeam;
  s.win.PokeIdle.Api={
    getTeam:()=>new Promise(resolve=>{finishTeam=resolve;}),
    getCreatures:async()=>({data:[s.members[0]]}),
  };
  const original=s.root.querySelector('.hunt-list-toolbar input[type=search]');
  const button=s.rows[1].querySelector('button');
  button.click();await settle();
  assert.equal(original.value,'');
  const replacement=s.doc.createElement('input');replacement.type='search';
  const values=[];replacement.addEventListener('input',()=>values.push(replacement.value));
  original.replaceWith(replacement);
  finishTeam({team:{leader_id:'leader-a',member_ids:['leader-a','leader-b']}});
  await settle();await settle();
  assert.equal(original.value,'');
  assert.deepEqual(values,['Tower']);
  assert.equal(replacement.value,'Tower');
  assert.equal(s.doc.activeElement,replacement);
  assert.equal(s.scene.starts,0);
});

test('world changes during async Search validation leave the native list search untouched',async t=>{
  const s=fixture(t);
  await reply(s,(await request(s)).requestId);
  let finishTeam;
  s.win.PokeIdle.Api={
    getTeam:()=>new Promise(resolve=>{finishTeam=resolve;}),
    getCreatures:async()=>({data:[s.members[0]]}),
  };
  const input=s.root.querySelector('.hunt-list-toolbar input[type=search]');
  let events=0;input.addEventListener('input',()=>events++);
  s.rows[0].querySelector('button').click();await settle();
  s.scene._tab='johto';
  finishTeam({team:{leader_id:'leader-a',member_ids:['leader-a','leader-b']}});
  await settle();await settle();
  assert.equal(events,0);
  assert.equal(input.value,'');
  assert.match(s.status,/mundo mudou/i);
  assert.equal(s.scene.starts,0);
});

test('native input side effects changing world cannot report a successful Search',async t=>{
  const s=fixture(t);
  await reply(s,(await request(s)).requestId);
  const input=s.root.querySelector('.hunt-list-toolbar input[type=search]');
  input.addEventListener('input',()=>{s.scene._tab='johto';});
  s.rows[0].querySelector('button').click();await settle();await settle();
  assert.equal(input.value,'Forest');
  assert.match(s.status,/mundo mudou/i);
  assert.doesNotMatch(s.status,/Busca na lista:/);
  assert.equal(s.scene.starts,0);
});

test('A→B→A cancels pending query and rejects stale reply even when the HUD never switched',async t=>{
  const s=fixture(t),a=await request(s);
  s.bus.emit('team.updated',{leader_id:'leader-b'});
  assert.equal(cancels(s).some(value=>value.requestId===a.requestId),true);
  assert.equal(s.run.disabled,true);
  s.bus.emit('team.updated',{leader_id:'leader-a'});
  s.controller.sync();assert.equal(s.run.disabled,false);
  await reply(s,a.requestId);
  assert.equal(s.rows.length,0);
  const fresh=await request(s);
  assert.notEqual(fresh.requestId,a.requestId);
  await reply(s,fresh.requestId);
  assert.equal(s.rows.length,3);
  s.members[0].level=121;s.controller.sync();
  assert.equal(s.rows.length,0);
  assert.match(s.status,/alterado/i);
  assert.equal(s.scene.starts,0);
});

test('controller cleanup/remount cancels pending work and restores native list structure',async t=>{
  const s=fixture(t),first=await request(s);
  s.controller.cleanup();
  assert.equal(cancels(s).some(value=>value.requestId===first.requestId),true);
  assert.equal(s.root.outerHTML,s.before);
  assert.equal(s.scene.startHunt,s.nativeStart);
  assert.equal([...s.hostListeners.values()].every(set=>set.size===0),true);
  assert.equal([...s.listeners.values()].every(set=>set.size===0),true);
  await reply(s,first.requestId);
  assert.equal(s.ui(),null);
  const next=mountHunts(s.root);
  t.after(()=>next.cleanup());
  assert.equal(s.root.querySelectorAll('[data-ppbui-pptools-oneclick]').length,1);
  assert.equal(s.root.querySelectorAll('.ppbui-hunts-pptools-oneclick__result').length,0);
  next.cleanup();
  assert.equal(s.root.outerHTML,s.before);
});

test('resolving oneclick Top3 keeps duplicate species and requires matching world and native zone range',()=>{
  const dom=new JSDOM('<div id="root"><button class="hunt-map-marker" data-zone-index="0"></button><button class="hunt-map-marker" data-zone-index="1"></button></div>');
  const root=dom.window.document.querySelector('#root');
  const scene={_tab:'kanto',_zones:[{name:'Forest',world:'kanto',min:20,max:30},{name:'Forest',world:'johto',min:20,max:30}],
    zoneName:zone=>zone.name,zoneWorld:zone=>zone.world,
    zoneMinMaxLevel:zone=>({min:zone.min,max:zone.max})};
  assert.equal(resolvePptoolsHunt(root,scene,{huntName:'forest',wildLevel:20},'map').state,'matched');
  assert.equal(resolvePptoolsHunt(root,scene,{huntName:'Forest',wildLevel:45},'map').state,'unavailable');
  scene._zones[1].world='kanto';
  assert.equal(resolvePptoolsHunt(root,scene,{huntName:'Forest',wildLevel:20},'map').state,'ambiguous');
  dom.window.close();
});
