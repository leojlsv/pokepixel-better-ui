import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {JSDOM} from 'jsdom';
import {mountHunts} from '../src/modules/hunts/controller.js';

const runner=readFileSync(new URL('../tools/coupled-workspace-webview2/pptools-runner.js',import.meta.url),'utf8');
const bundle='https://www.pptools.com.br/_next/static/chunks/app/hunt-analyzer/page-9d9eef42c7a86dae.js';
const headings=['Pos.','Pokemon / hunt','Nível','Move principal','Média de hits',
  'Resultados ruins','KOH simulado','XP/h','Gold/h'];
const publicRows=[
  ['Pikachu','Forest',20,'120 mil/h','3 mil/h'],
  ['Gengar','Tower',85,'105 mil/h','7 mil/h'],
  ['Geodude','Tunnel',40,'93 mil/h','8 mil/h'],
];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function waitFor(predicate,label='condition') {
  const deadline=Date.now()+2500;
  for(;;) {
    const result=predicate();
    if(result)return result;
    if(Date.now()>deadline)throw Error('Timed out waiting for '+label);
    await new Promise(resolve=>setTimeout(resolve,5));
  }
}
function table(rows,{sort='xp'}={}) {
  const head=headings.map((label,i)=>'<th><button type="button" aria-label="Ordenar por '+label+'">'+
    label+'<span aria-hidden="true">'+((sort==='xp'&&i===7)||(sort==='gold'&&i===8)?'↓':'↕')+'</span>'+
    '</button></th>').join('');
  const body=rows.map((row,i)=>'<tr><td>'+(i+1)+'</td><td><div>'+
    '<p class="mantine-Text-root">'+row[0]+'</p><div><p class="mantine-Text-root">'+row[1]+
    '</p></div></div></td><td>'+row[2]+'</td><td>Thunderbolt</td><td>3</td><td>0%</td>'+
    '<td>180/h</td><td><p class="mantine-Text-root">'+row[3]+'</p></td>'+
    '<td><p class="mantine-Text-root">'+row[4]+'</p></td></tr>').join('');
  return '<section aria-labelledby="hunt-results-title"><h2 id="hunt-results-title">Resultados por hunt</h2>'+
    '<input aria-label="Buscar Pokemon por nome" value="">'+rows.length+
    ' Pokemon simulados · 1.000 abates cada<table><thead><tr>'+head+
    '</tr></thead><tbody>'+body+'</tbody></table></section>';
}

/** An offline DOM with the public PPTools action/renderer contract; not the actual web site. */
function fakePptools(t,{delay=5,sort='xp',rejectImport=false,holdSimulation=false}={},onComplete) {
  const dom=new JSDOM('<html><head><script src="'+bundle+'"></script></head><body><main>'+
    '<button type="button">Preencher com JSON</button>'+
    '<label for="attacker-level">Nível do Pokemon</label><input id="attacker-level" value="100">'+
    '<label for="trainer-level">Nível do treinador</label><input id="trainer-level" value="100">'+
    '<button type="button" disabled>Simular 1.000 abates por hunt</button>'+
    '</main></body></html>',
    {url:'https://www.pptools.com.br/hunt-analyzer',runScripts:'outside-only',pretendToBeVisual:true});
  const win=dom.window,doc=win.document,main=doc.querySelector('main');
  win.TextEncoder=TextEncoder;
  const imports=[],calls={open:0,fill:0,simulate:0},messages=[];
  let finishSimulation=null;
  const buttons=[...main.querySelectorAll('button')],open=buttons[0],sim=buttons[1];
  win.chrome={webview:{postMessage(payload){messages.push(payload);onComplete(payload);}}};
  open.addEventListener('click',()=>{
    calls.open++;
    const modal=doc.createElement('div');
    modal.setAttribute('role','dialog');
    modal.innerHTML='<h2>Preencher com JSON</h2><label for="json-input">JSON do atacante</label>'+
      '<textarea id="json-input"></textarea><button type="button">Preencher campos</button>';
    main.append(modal);
    const textarea=modal.querySelector('textarea');
    let controlled='';
    textarea.addEventListener('input',()=>{controlled=textarea.value;});
    modal.querySelector('button').addEventListener('click',()=>{
      calls.fill++;
      const json=JSON.parse(controlled);
      if(rejectImport){
        const error=doc.createElement('div');error.setAttribute('role','alert');
        error.textContent='JSON do atacante rejeitado';modal.append(error);return;
      }
      if(json.pokemon!=='charizard'||json.level!==120||json.trainerLevel!==75||
        json.qualityTier!=='legendary'||json.exactMultiplier!==1.62||
        json.ivs.spAtk!==30||json.ivs.spDef!==26||json.ivs.speed!==27||
        json.isStarter!==true||json.expBuff!==1)throw Error('Noncanonical attacker input in fake PPTools modal');
      imports.push(json);
      doc.querySelector('#attacker-level').value=String(json.level);
      doc.querySelector('#trainer-level').value=String(json.trainerLevel);
      modal.remove();sim.disabled=false;
    });
  });
  sim.addEventListener('click',()=>{
    calls.simulate++;sim.disabled=true;sim.dataset.loading='true';
    const complete=()=>{
      main.insertAdjacentHTML('beforeend',table(publicRows,{sort}));
      sim.disabled=false;delete sim.dataset.loading;
    };
    if(holdSimulation)finishSimulation=complete;
    else win.setTimeout(complete,delay);
  });
  win.eval(runner);
  t.after(()=>win.close());
  return {dom,win,doc,calls,imports,messages,
    finish:()=>{if(!finishSimulation)throw Error('No suspended simulation');finishSimulation();finishSimulation=null;},
    start:(requestId,inputJson)=>win.__PPBUI_PPTOOLS_RUNNER__.start(requestId,inputJson)};
}

function syntheticGame(t,{mode='list',profileId='profile-a',siteOptions={}}={}) {
  const list='<div class="hunt-list-header"></div><div class="hunt-list-toolbar"><input type="search"></div>'+
    '<div class="hunt-list-table-shell"><table class="hunt-list-table"><tbody>'+
    publicRows.map((row,i)=>'<tr class="hunt-list-row"><td>'+
      '<button class="hunt-list-hunt-button">Hunt</button>'+
      '<button class="hunt-list-details-button" aria-controls="hunt-list-details-'+i+'">Details</button>'+
      '</td><td><div class="hunt-list-identity"><strong>'+row[1]+'</strong></div></td></tr>').join('')+
    '</tbody></table></div>';
  const map='<div class="hunt-world-header"><div class="hunt-world-tabs"></div></div>'+
    '<div class="hunt-world-toolbar"><input type="search"><input type="number" value="1"><input type="number" value="100"></div>'+
    '<div class="hunt-world-elements"></div><div class="hunt-world-viewport"><div class="hunt-world-stage">'+
    publicRows.map((row,i)=>'<button class="hunt-map-marker" data-zone-index="'+i+
      '" style="left:'+(60-15*i)+'%;top:'+(35-4*i)+'%"><strong class="hunt-map-marker__name">'+
      row[1]+'</strong></button>').join('')+'</div></div>';
  const dom=new JSDOM('<div class="hunt-window"><div class="pokeidle-panel__titlebar">'+
    '<span class="pokeidle-panel__title">Hunts</span></div><div class="pokeidle-panel__body">'+
    (mode==='list'?list:map)+'</div></div><div class="pokeidle-team-hud"></div>',
    {url:'https://synthetic-game.local/play/',pretendToBeVisual:true});
  const win=dom.window,doc=win.document,root=doc.querySelector('.hunt-window'),hud=doc.querySelector('.pokeidle-team-hud');
  const member={id:'leader-a',species_id:'charizard',name:'Charizard',level:120,is_leader:true,
    ivs:{hp:31,atk:29,def:28,spa:30,spd:26,spe:27},iv_total:171,quality:'legendary',
    quality_multiplier:1.62,nature:'adamant',gender:'male',is_shiny:false,is_starter:true};
  const trainer={level:75,exp_buff:1.5,buffs:{stone:0.02}};
  let profile=profileId;
  const listeners=new Map(),bridgeListeners=new Set(),sent=[],pages=[],acks=[],canceled=new Set();
  const bus={
    on(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},
    off(name,fn){listeners.get(name)?.delete(fn);},
    emit(name,value){for(const fn of listeners.get(name)||[])fn(value);},
  };
  const emit=payload=>{for(const listener of bridgeListeners)listener({data:payload});};
  const host={
    postMessage(request){
      sent.push(request);
      if(request.type==='ppbui.pptools.cancel'){canceled.add(request.requestId);return;}
      if(request.type!=='ppbui.pptools.run')return;
      const page=fakePptools(t,siteOptions,result=>{
        if(!canceled.has(result.requestId))emit({
          type:'ppbui.pptools.result',requestId:result.requestId,ok:result.ok,
          resultJson:result.resultJson,error:result.error,
        });
      });
      pages.push(page);
      void Promise.resolve(page.start(request.requestId,request.inputJson)).then(ack=>acks.push(ack));
    },
    addEventListener(name,fn){if(name==='message')bridgeListeners.add(fn);},
    removeEventListener(name,fn){if(name==='message')bridgeListeners.delete(fn);},
    emit,
  };
  win.__PPBUI_COUPLED_WORKSPACE__={pptoolsBackground:true};
  Object.defineProperty(win,'chrome',{configurable:true,value:{webview:host}});
  const clipboard=[];
  Object.defineProperty(win.navigator,'clipboard',{configurable:true,value:{
    readText:async()=>{clipboard.push('read');throw Error('not allowed');},
    writeText:async()=>{clipboard.push('write');throw Error('not allowed');},
  }});
  win.PokeIdle={Localization:{get:()=> 'pt-BR'},Bus:bus,
    Auth:{getTrainerSummary:()=>({id:profile,level:trainer.level})},
    WorldPresence:{getSelfTrainerId:()=>profile},
    PersistentHud:{_teamHud:{el:hud,_trainer:trainer,_creatures:[member]}}};
  const body=root.querySelector('.pokeidle-panel__body');
  const scene={_panel:{body},_tab:'kanto',_zones:publicRows.map((row,i)=>({
    id:'zone-'+i,name:row[1],world:'kanto',min:row[2],max:row[2],
    elements:['normal'],drops:[],
  })),_selectedIndex:-1,_worldMapState:{scale:1,x:0,y:0},_worldMapStates:{},
    _worldLayouts:{kanto:{width:1000,height:800}},
    zoneWorld:z=>z.world,zoneName:z=>z.name,
    zoneMinMaxLevel:z=>({min:z.min,max:z.max}),zoneElements:z=>z.elements,zoneDrops:z=>z.drops,
    hideDropTooltip(){},canEnterWorld:()=>true,_navigationCleanup(){},
    saveWorldMapState(){this._worldMapStates[this._tab]={...this._worldMapState};},
    setupWorldMapNavigation(view,stage){this._worldMapState={...this._worldMapStates[this._tab]};stage.style.transform='scale(1)';},
    starts:0,startHunt(){this.starts++;throw Error('Unexpected gameplay');},
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
  const before=root.outerHTML,controller=mountHunts(root);
  t.after(()=>{controller.cleanup();win.close();});
  return {win,doc,root,scene,member,bus,host,controller,pages,acks,sent,canceled,clipboard,
    setProfile:id=>{profile=id;},before,
    get run(){return root.querySelector('[data-ppbui-pptools-run]');},
    get rows(){return [...root.querySelectorAll('.ppbui-hunts-pptools-oneclick__result')];},
    get status(){return root.querySelector('.ppbui-hunts-pptools-oneclick__status')?.textContent;},
  };
}

test('synthetic list end-to-end: native leader → host → PPTools form/1000-kill DOM → Top3 → Search',async t=>{
  const g=syntheticGame(t);
  assert.equal(g.root.querySelector('.ppbui-hunts-pptools'),null);
  assert.equal(g.root.querySelector('textarea'),null);
  g.run.click();
  await waitFor(()=>g.rows.length===3,'the three public PPTools recommendations');
  assert.equal(g.pages.length,1);
  assert.equal(g.acks.length,1);
  assert.equal(g.acks[0].accepted,true);
  assert.equal(g.acks[0].requestId,g.sent[0].requestId);
  assert.deepEqual(g.pages[0].calls,{open:1,fill:1,simulate:1});
  assert.equal(g.pages[0].imports.length,1);
  assert.equal(g.pages[0].imports[0].pokemon,'charizard');
  assert.equal(g.pages[0].messages[0].type,'ppbui.pptools.complete');
  assert.equal(g.pages[0].messages[0].ok,true);
  assert.equal(g.rows[0].querySelector('strong').textContent,'1. Pikachu');
  assert.equal(g.rows[1].querySelector('strong').textContent,'2. Gengar');
  assert.equal(g.rows[2].querySelector('strong').textContent,'3. Geodude');
  assert.deepEqual(g.clipboard,[]);
  const search=g.root.querySelector('.hunt-list-toolbar input[type=search]');
  assert.equal(g.rows[0].querySelector('button').textContent,'Search');
  g.rows[0].querySelector('button').click();await tick();await tick();
  assert.equal(search.value,publicRows[0][1]);
  assert.equal(g.doc.activeElement,search);
  assert.equal(g.scene.starts,0);
});

test('synthetic map pipeline locates/pans a real marker after full background runner result',async t=>{
  const g=syntheticGame(t,{mode:'map'});
  g.run.click();
  await waitFor(()=>g.rows.length===3,'three mapped recommendations');
  const marker=g.root.querySelector('.hunt-map-marker[data-zone-index="0"]');
  assert.equal(g.rows[0].querySelector('button').disabled,false);
  g.rows[0].querySelector('button').click();await tick();await tick();
  assert.equal(marker.classList.contains('ppbui-hunts-selected-marker'),true);
  assert.equal(marker.classList.contains('ppbui-hunts-located-marker'),true);
  assert.equal(g.doc.activeElement,marker);
  assert.equal(g.scene.starts,0);
});

test('A→B→A in-flight cancels original executor reply and cannot leak stale results',async t=>{
  const g=syntheticGame(t,{siteOptions:{delay:50}});
  g.run.click();
  const first=await waitFor(()=>g.sent.find(m=>m.type==='ppbui.pptools.run'),'first run');
  g.bus.emit('team.updated',{leader_id:'leader-b'});
  assert.equal(g.canceled.has(first.requestId),true);
  g.bus.emit('team.updated',{leader_id:'leader-a'});
  await new Promise(resolve=>setTimeout(resolve,90));
  assert.equal(g.rows.length,0);
  g.run.click();
  await waitFor(()=>g.rows.length===3,'fresh Top3 after leader restoration');
  const next=g.sent.filter(m=>m.type==='ppbui.pptools.run')[1];
  assert.notEqual(next.requestId,first.requestId);
  assert.equal(g.scene.starts,0);
});

test('the synthetic runner failure is returned as a correlated error, never a misleading Top3',async t=>{
  for(const siteOptions of [{rejectImport:true},{sort:'gold'}]){
    const g=syntheticGame(t,{siteOptions});
    g.run.click();
    await waitFor(()=>g.status?.includes('indisponível'),'fail-closed UI error');
    assert.equal(g.pages.length,1);
    assert.equal(g.pages[0].messages[0].ok,false);
    assert.equal(g.rows.length,0);
    assert.equal(g.scene.starts,0);
    assert.deepEqual(g.clipboard,[]);
  }
});

test('separate account panes cannot consume another pane’s correlated PPTools response',async t=>{
  const a=syntheticGame(t,{profileId:'account-a',siteOptions:{delay:20}});
  const b=syntheticGame(t,{profileId:'account-b',siteOptions:{holdSimulation:true}});
  a.run.click();b.run.click();
  await waitFor(()=>a.rows.length===3,'account-a results');
  await waitFor(()=>b.pages[0]?.calls.simulate===1,'account-b suspended simulation');
  const aReply=a.pages[0].messages[0];
  b.host.emit({type:'ppbui.pptools.result',requestId:aReply.requestId,
    ok:true,resultJson:aReply.resultJson});
  assert.equal(b.rows.length,0);
  b.pages[0].finish();
  await waitFor(()=>b.rows.length===3,'account-b results');
  assert.notEqual(a.sent[0].requestId,b.sent[0].requestId);
  a.setProfile('account-c');a.controller.sync();
  assert.equal(a.rows.length,0);
  assert.equal(b.rows.length,3);
  assert.equal(a.scene.starts,0);assert.equal(b.scene.starts,0);
});

test('cleanup drops delayed results, removes native bridge listeners, and remount starts empty',async t=>{
  const g=syntheticGame(t,{siteOptions:{delay:50}});
  g.run.click();
  const job=await waitFor(()=>g.sent.find(m=>m.type==='ppbui.pptools.run'),'pending request');
  g.controller.cleanup();
  assert.equal(g.canceled.has(job.requestId),true);
  assert.equal(g.root.outerHTML,g.before);
  await new Promise(resolve=>setTimeout(resolve,80));
  assert.equal(g.rows.length,0);
  const again=mountHunts(g.root);
  t.after(()=>again.cleanup());
  assert.equal(g.rows.length,0);
  again.cleanup();
  assert.equal(g.root.outerHTML,g.before);
  assert.equal(g.scene.starts,0);
});
