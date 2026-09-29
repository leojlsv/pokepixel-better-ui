import assert from 'node:assert/strict';
import {test} from 'node:test';
import {JSDOM} from 'jsdom';
import {createPptoolsOneclickWidget} from '../src/modules/hunts/pptools-oneclick-widget.js';

function recommendations(rows=[['Pikachu','Forest',20,'120k','3k'],['Gengar','Tower',85,'105k','7k'],['Geodude','Tunnel',40,'93k','8k']]) {
  return JSON.stringify({
    schema:'ppbui.pptools.hunt-recommendations',version:1,
    source:{url:'https://www.pptools.com.br/hunt-analyzer',capturedAt:'2026-09-29T14:00:00.000Z',sort:{key:'xp',direction:'desc'},filter:'',scope:{kind:'all-results',page:null}},
    attacker:{speciesId:null,speciesNameText:null,level:null},
    recommendations:rows.map(([pokemon,hunt,level,xp,gold],index)=>({rank:index+1,wildSpeciesName:pokemon,huntName:hunt,wildLevelText:String(level),wildLevel:level,xpPerHourText:xp,goldPerHourText:gold})),
  });
}

function fixture(t,{capable=true,mode='list',profile='account-a'}={}) {
  const dom=new JSDOM(`<section class="hunt-window ppbui-hunts-enhanced"><div class="pokeidle-panel__body"><div class="hunt-list-toolbar"></div>
    <table><tbody><tr class="hunt-list-row"><td><button class="hunt-list-hunt-button">Hunt</button><button class="hunt-list-details-button" aria-controls="hunt-list-details-0">Details</button></td><td><div class="hunt-list-identity"><strong>Forest</strong></div></td></tr>
    <tr class="hunt-list-row"><td><button class="hunt-list-hunt-button">Hunt</button><button class="hunt-list-details-button" aria-controls="hunt-list-details-1">Details</button></td><td><div class="hunt-list-identity"><strong>Tower</strong></div></td></tr>
    <tr class="hunt-list-row"><td><button class="hunt-list-hunt-button">Hunt</button><button class="hunt-list-details-button" aria-controls="hunt-list-details-2">Details</button></td><td><div class="hunt-list-identity"><strong>Tunnel</strong></div></td></tr></tbody></table></div></section><div class="pokeidle-team-hud"></div>`,
    {url:'https://synthetic-game.local/',pretendToBeVisual:true});
  const win=dom.window,doc=win.document,root=doc.querySelector('.hunt-window'),hud=doc.querySelector('.pokeidle-team-hud');
  const leader={id:'a',species_id:'charizard',name:'Charizard',level:120,is_leader:true,
    ivs:{hp:31,atk:29,def:28,spa:30,spd:26,spe:27},iv_total:171,
    quality:'legendary',quality_multiplier:1.62,nature:'adamant',gender:'male',is_shiny:false,is_starter:true};
  const trainer={level:75,exp_buff:0.15,buffs:{stone:0.02,activity:true}};
  const handlers=new Map(),hostListeners=new Map(),outbound=[],writes=[];
  const bus={on(name,handler){if(!handlers.has(name))handlers.set(name,new Set());handlers.get(name).add(handler);},off(name,handler){handlers.get(name)?.delete(handler);},emit(name,data){for(const handler of handlers.get(name)||[])handler(data);}};
  const host={
    postMessage(message){outbound.push(message);},
    addEventListener(name,handler){if(!hostListeners.has(name))hostListeners.set(name,new Set());hostListeners.get(name).add(handler);},
    removeEventListener(name,handler){hostListeners.get(name)?.delete(handler);},
    emit(message){for(const handler of hostListeners.get('message')||[])handler({data:message});},
  };
  if(capable)win.__PPBUI_COUPLED_WORKSPACE__={pptoolsBackground:true};
  Object.defineProperty(win,'chrome',{configurable:true,value:{webview:host}});
  Object.defineProperty(win.navigator,'clipboard',{configurable:true,value:{readText:async()=>{writes.push('read');throw Error('clipboard forbidden');},writeText:async()=>{writes.push('write');throw Error('clipboard forbidden');}}});
  win.PokeIdle={Localization:{get:()=> 'pt-BR'},PersistentHud:{_teamHud:{el:hud,_trainer:trainer,_creatures:[leader]}},
    Auth:{getTrainerSummary:()=>({id:profile,level:75})},WorldPresence:{getSelfTrainerId:()=>profile},Bus:bus};
  const scene={_panel:{body:root.querySelector('.pokeidle-panel__body')},_zones:[{name:'Forest',min:20,max:20},{name:'Tower',min:85,max:85},{name:'Tunnel',min:40,max:40}],
    zoneName:zone=>zone.name,zoneMinMaxLevel:zone=>({min:zone.min,max:zone.max}),starts:0,startHunt(){this.starts++;throw Error('gameplay started');}};
  win.SceneManager={_scene:scene};
  const located=[];
  const widget=createPptoolsOneclickWidget(root,{mode,canLocate:()=>true,locate(match,entry){located.push({match,entry});return true;}});
  root.append(widget.element);widget.sync();
  t.after(()=>{widget.cleanup();win.close();});
  const run=widget.element.querySelector('[data-ppbui-pptools-run]');
  const status=()=>widget.element.querySelector('[role="status"]').textContent;
  const success=(requestId,resultJson=recommendations())=>host.emit({type:'ppbui.pptools.result',requestId,ok:true,resultJson});
  return {dom,win,doc,root,hud,leader,trainer,bus,host,busHandlers:handlers,hostListeners,outbound,writes,located,widget,run,status,scene,success,
    get results(){return [...widget.element.querySelectorAll('.ppbui-hunts-pptools-oneclick__result')];}};
}

const settle=()=>new Promise(resolve=>setImmediate(resolve));
const runs=s=>s.outbound.filter(message=>message.type==='ppbui.pptools.run');
const cancels=s=>s.outbound.filter(message=>message.type==='ppbui.pptools.cancel');

test('one click invokes host only when explicit per-window capability is present; no clipboard/input/confirmation',async t=>{
  const unavailable=fixture(t,{capable:false});
  assert.equal(unavailable.run.disabled,true);
  unavailable.run.click();await settle();assert.equal(unavailable.outbound.length,0);
  assert.match(unavailable.status(),/Coupled Workspace/);
  const s=fixture(t);
  assert.equal(s.run.disabled,false);
  s.run.click();await settle();
  const message=runs(s)[0];
  assert.equal(message.type,'ppbui.pptools.run');assert.equal(message.protocol,1);
  assert.match(message.requestId,/^pptools-[0-9a-f]{32}$/);assert.equal(message.leaderId,'a');
  assert.equal(message.leaderLevel,120);assert.equal(message.leaderSpeciesId,'charizard');
  assert.equal(JSON.parse(message.inputJson).trainerLevel,75);
  assert.equal(JSON.parse(message.inputJson).pokemon,'charizard');
  assert.equal(JSON.parse(message.inputJson).level,120);
  assert.equal(JSON.parse(message.inputJson).exactMultiplier,1.62);
  assert.deepEqual(Object.keys(JSON.parse(message.inputJson).ivs),['hp','atk','def','spAtk','spDef','speed']);
  assert.equal(s.widget.element.querySelector('textarea'),null);
  assert.equal(s.widget.element.querySelector('input[type="checkbox"]'),null);
  assert.deepEqual(s.writes,[]);assert.equal(s.scene.starts,0);
  assert.match(s.status(),/PPTools/);
});

test('missing native profile is explained and normal idle state returns when it becomes available',async t=>{
  const s=fixture(t,{profile:''});
  assert.equal(s.run.disabled,true);
  assert.match(s.status(),/Perfil nativo do treinador indisponível/);
  s.win.PokeIdle.Auth.getTrainerSummary=()=>({id:'restored',level:75});
  s.win.PokeIdle.WorldPresence.getSelfTrainerId=()=> 'restored';
  s.widget.sync();
  assert.equal(s.run.disabled,false);
  assert.match(s.status(),/Consulte hunts/);
});

test('host result parses 1-3 rows and navigation locates only a unique matching native hunt',async t=>{
  const s=fixture(t);
  s.run.click();await settle();const req=runs(s)[0].requestId;
  s.success(req);await settle();await settle();
  assert.equal(s.results.length,3);
  assert.match(s.status(),/recebidas/);
  assert.match(s.widget.element.querySelector('.ppbui-hunts-pptools-oneclick__notice').textContent,/equivalência/i);
  assert.equal(s.results[0].querySelector('strong').textContent,'1. Pikachu');
  assert.match(s.results[0].textContent,/Forest.*XP\/h 120k/s);
  const button=s.results[0].querySelector('button');assert.equal(button.disabled,false);
  assert.equal(button.textContent,'Search');
  button.click();await settle();await settle();
  assert.equal(s.located.length,1);assert.equal(s.located[0].entry.huntName,'Forest');
  assert.equal(s.scene.starts,0);assert.deepEqual(s.writes,[]);
});

test('unknown required source fields or missing native leader prevent posting, with explicit error',async t=>{
  const s=fixture(t);
  delete s.leader.ivs;
  s.run.click();await settle();
  assert.equal(runs(s).length,0);assert.match(s.status(),/seis IVs/);
  s.leader.ivs={hp:31,atk:29,def:28,spa:30,spd:26,spe:27};
  delete s.leader.gender;
  s.run.click();await settle();
  assert.equal(runs(s).length,0);assert.match(s.status(),/gender/);
  s.leader.gender='male';
  s.leader.is_leader=false;s.widget.sync();
  assert.equal(s.run.disabled,true);
});

test('native COPIAR JSON shape without EXP factor or starter flag runs with PPTools neutral settings',async t=>{
  const s=fixture(t);
  delete s.trainer.exp_buff;
  delete s.leader.is_starter;
  Object.assign(s.leader,{
    species_id:'entei',name:'Entei',level:32,
    quality_multiplier:1.62,nature:'hardy',
    ivs:{hp:18,atk:17,def:13,spa:31,spd:28,spe:31},
  });
  delete s.leader.iv_total;
  s.run.click();await settle();
  const message=runs(s)[0];
  assert.equal(message.leaderSpeciesId,'entei');
  assert.equal(message.leaderLevel,32);
  const input=JSON.parse(message.inputJson);
  assert.equal(input.expBuff,1);
  assert.equal(input.isStarter,false);
  assert.equal(input.exactMultiplier,1.62);
  assert.equal(input.ivs.spAtk,31);
  assert.equal(message.inputJson.includes('trainer_id'),false);
  assert.deepEqual(s.writes,[]);
  s.success(message.requestId);await settle();await settle();
  assert.equal(s.results.length,3);
  const notice=s.widget.element.querySelector('.ppbui-hunts-pptools-oneclick__notice');
  assert.match(notice.textContent,/EXP.*1/i);
  assert.match(notice.textContent,/inicial não identificado/i);
  assert.equal(notice.getAttribute('aria-live'),'polite');
});

test('stale request IDs, duplicate replies, corrupt output and attacker mismatch cannot display recommendations',async t=>{
  const s=fixture(t);
  s.run.click();await settle();const a=runs(s)[0].requestId;
  s.success('pptools-unknown');await settle();assert.equal(s.results.length,0);
  s.host.emit({type:'ppbui.pptools.result',requestId:a,ok:true,resultJson:'{"schema":"invalid"}'});
  await settle();assert.equal(s.results.length,0);assert.match(s.status(),/inválida/i);
  s.success(a);await settle();assert.equal(s.results.length,0);
  s.run.click();await settle();const b=runs(s)[1].requestId;
  s.host.emit({type:'ppbui.pptools.result',requestId:b,ok:true,resultJson:recommendations().replace('"speciesId":null','"speciesId":"gengar"')});
  await settle();await settle();assert.equal(s.results.length,0);assert.match(s.status(),/diverge/);
});

test('new one-click query cancels previous request; late reply cannot overwrite new result',async t=>{
  const s=fixture(t);
  s.run.click();await settle();const a=runs(s)[0].requestId;
  s.run.click();await settle();const b=runs(s)[1].requestId;
  assert.notEqual(a,b);assert.equal(cancels(s)[0].requestId,a);
  s.success(a);await settle();assert.equal(s.results.length,0);
  s.success(b,recommendations([['Gengar','Tower',85,'150k','8k']]));await settle();await settle();
  assert.equal(s.results.length,1);assert.match(s.results[0].textContent,/Tower/);
});

test('a changed native stat without a bus event invalidates the host reply before rendering',async t=>{
  const s=fixture(t);
  s.run.click();await settle();const request=runs(s)[0].requestId;
  s.leader.nature='bold';
  s.success(request);await settle();await settle();
  assert.equal(s.results.length,0);assert.match(s.status(),/alterado/i);
  assert.equal(cancels(s).some(entry=>entry.requestId===request),true);
});

test('replaced host bridge cancels on original bridge and discards its late response',async t=>{
  const s=fixture(t);
  s.run.click();await settle();const request=runs(s)[0].requestId;
  const other={postMessage(){},addEventListener(){},removeEventListener(){}};
  s.win.chrome.webview=other;
  s.widget.sync();
  assert.equal(cancels(s).some(entry=>entry.requestId===request),true);
  s.success(request);await settle();assert.equal(s.results.length,0);
  assert.match(s.status(),/Transporte PPTools alterado/);
});

test('bounded native-read and PPTools-result timeouts fail closed and cancel posted requests',async t=>{
  const s=fixture(t),timers=new Map();let next=0;
  s.win.setTimeout=(handler,delay)=>{const id=++next;timers.set(id,{handler,delay});return id;};
  s.win.clearTimeout=id=>timers.delete(id);
  let finish;
  s.win.PokeIdle.Api={getTeam:()=>new Promise(resolve=>{finish=resolve;}),getCreatures:async()=>({data:[s.leader]})};
  s.run.click();await settle();
  assert.equal([...timers.values()][0].delay,15_000);
  [...timers.values()][0].handler();
  assert.equal(runs(s).length,0);assert.match(s.status(),/Tempo limite/);
  finish({team:{leader_id:'a',member_ids:['a']}});await settle();
  delete s.win.PokeIdle.Api;
  s.run.click();await settle();
  const request=runs(s)[0].requestId;
  assert.equal([...timers.values()][0].delay,200_000);
  [...timers.values()][0].handler();
  assert.equal(cancels(s).some(entry=>entry.requestId===request),true);
  assert.match(s.status(),/Tempo limite/);assert.equal(s.results.length,0);
});

test('A→B→A leader events invalidate immediately even if stale HUD never updates',async t=>{
  const s=fixture(t);
  s.run.click();await settle();const a=runs(s)[0].requestId;
  s.bus.emit('team.updated',{leader_id:'b'});
  assert.equal(cancels(s).some(entry=>entry.requestId===a),true);
  assert.equal(s.run.disabled,true);
  s.bus.emit('team.updated',{leader_id:'a'});
  s.widget.sync();assert.equal(s.run.disabled,false);
  s.success(a);await settle();assert.equal(s.results.length,0);
  s.run.click();await settle();const fresh=runs(s)[1].requestId;
  s.success(fresh);await settle();await settle();assert.equal(s.results.length,3);
  s.leader.level=121;s.widget.sync();
  assert.equal(s.results.length,0);assert.match(s.status(),/alterado/i);
  assert.equal(s.scene.starts,0);
});

test('async enrichment finishing after leader change is discarded and never sent to the host',async t=>{
  const s=fixture(t);
  let finish;
  s.win.PokeIdle.Api={getTeam:()=>new Promise(resolve=>{finish=resolve;}),getCreatures:async()=>({data:[s.leader]})};
  s.run.click();await settle();assert.equal(runs(s).length,0);
  s.bus.emit('team.updated',{leader_id:'b'});
  finish({team:{leader_id:'a',member_ids:['a']}});await settle();await settle();
  assert.equal(runs(s).length,0);assert.equal(s.results.length,0);
  assert.match(s.status(),/alterado/i);
});

test('profile changes, outdated result button, disconnect and cleanup revoke requests and listeners',async t=>{
  const s=fixture(t);let profile='account-a';
  s.win.PokeIdle.Auth.getTrainerSummary=()=>({id:profile,level:75});
  s.win.PokeIdle.WorldPresence.getSelfTrainerId=()=>profile;
  s.run.click();await settle();const a=runs(s)[0].requestId;
  s.success(a);await settle();await settle();
  const oldButton=s.results[0].querySelector('button');
  profile='account-b';s.widget.sync();
  assert.equal(s.results.length,0);
  oldButton.click();await settle();assert.equal(s.located.length,0);
  s.run.click();await settle();const b=runs(s)[1].requestId;
  s.widget.cleanup();assert.equal(cancels(s).some(entry=>entry.requestId===b),true);
  s.success(b);await settle();assert.equal(s.doc.querySelector('[data-ppbui-pptools-oneclick]'),null);
  assert.ok([...s.busHandlers.values()].every(listeners=>listeners.size===0));
  assert.ok([...s.hostListeners.values()].every(listeners=>listeners.size===0));
  assert.deepEqual(s.writes,[]);
});
