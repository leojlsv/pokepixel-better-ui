import assert from 'node:assert/strict';import {test} from 'node:test';import {JSDOM} from 'jsdom';
import {mountHunts} from '../src/modules/hunts/controller.js';import {locateHunt} from '../src/modules/hunts/navigation.js';import {defensiveMultipliers} from '../src/modules/hunts/type-chart.js';import {enhanceHuntTooltip,cleanupHuntTooltip} from '../src/modules/hunts/tooltip.js';
const markup=()=>`<div class="hunt-world-toolbar"><input type="search"><input type="number" min="1" max="100" value="1"><button>Clear</button></div><div class="hunt-world-viewport"><div class="hunt-world-stage"><button class="hunt-map-marker" data-zone-index="0" style="left:80%;top:70%"><strong class="hunt-map-marker__name">Pikachu Lv. 20–30</strong></button><button class="hunt-map-marker" data-zone-index="1" style="left:10%;top:20%"><strong class="hunt-map-marker__name">Abra Lv. 10–15</strong></button></div></div>`;
function setup(t){
 const dom=new JSDOM(`<div class="hunt-window"><div class="pokeidle-panel__body">${markup()}</div></div>`,{url:'https://test.local',pretendToBeVisual:true});const doc=dom.window.document,root=doc.body.firstChild,body=root.firstChild;
 let clicks=0,saves=0,cleanups=0,setups=0;
 const scene={_panel:{body},_tab:'kanto',_zones:[{world:'kanto'},{world:'kanto'}],_worldLayouts:{kanto:{width:1000,height:800}},_worldMapState:{scale:1,x:0,y:0},_worldMapStates:{},zoneWorld:z=>z.world,canEnterWorld:()=>true,saveWorldMapState(){saves++;this._worldMapStates[this._tab]={...this._worldMapState};},_navigationCleanup(){cleanups++;},setupWorldMapNavigation(v,stage){setups++;this._worldMapState={...this._worldMapStates[this._tab]};stage.style.transform=`translate3d(${this._worldMapState.x}px,${this._worldMapState.y}px,0) scale(${this._worldMapState.scale})`;}};
 dom.window.SceneManager={_scene:scene};dom.window.PokeIdle={Localization:{get:()=>"pt-BR"},ElementIcons:{definition:type=>({label:type,color:'#777'}),create:type=>{const i=doc.createElement('i');i.dataset.type=type;return i;}},Currency:{element:(value,options)=>{const span=doc.createElement('span');span.textContent=`¤${value}${options.showName?' Gold':''}`;return span;}}};
 function bind(){const viewport=body.querySelector('.hunt-world-viewport');Object.defineProperties(viewport,{clientWidth:{value:400},clientHeight:{value:300}});body.querySelectorAll('.hunt-map-marker').forEach(n=>n.addEventListener('click',()=>clicks++));const search=body.querySelector('input');search.addEventListener('input',()=>{scene._filter=search.value.toLowerCase().trim();body.querySelectorAll('.hunt-map-marker').forEach(n=>n.hidden=!n.textContent.toLowerCase().includes(scene._filter));});}
 bind();const before=root.outerHTML,c=mountHunts(root);t.after(()=>{c.cleanup();dom.window.close();});
 const select=()=>root.querySelector('select'),button=()=>root.querySelectorAll('.ppbui-hunts-results button')[0],reset=()=>root.querySelectorAll('.ppbui-hunts-results button')[1];
 const choose=(i='0')=>{select().value=i;select().dispatchEvent(new dom.window.Event('change'));};
 return {dom,doc,root,body,scene,c,before,bind,select,button,reset,choose,stats:()=>({clicks,saves,cleanups,setups})};
}
test('results reuse native filtering and locating pans without starting a hunt or changing zoom',t=>{
 const s=setup(t);s.choose();s.button().click();assert.ok(s.root.querySelector('.hunt-map-marker').classList.contains('ppbui-hunts-located-marker'));assert.ok(s.root.querySelector('.hunt-map-marker__name').classList.contains('ppbui-hunts-located'));assert.ok(s.root.querySelectorAll('.hunt-map-marker__name')[1].classList.contains('ppbui-hunts-dimmed'));assert.deepEqual(s.stats(),{clicks:0,saves:1,cleanups:1,setups:1});assert.deepEqual(s.scene._worldMapState,{scale:1,x:-600,y:-410});
 const input=s.body.querySelector('input');input.value='Abra';input.dispatchEvent(new s.dom.window.Event('input',{bubbles:true}));assert.equal(s.select().options.length,2);assert.match(s.select().options[1].textContent,/Abra/);assert.equal(s.button().disabled,true);
 s.body.querySelectorAll('.hunt-map-marker')[1].click();assert.equal(s.stats().clicks,1);
});
test('empty results show feedback without fabricating zones',t=>{
 const s=setup(t);const input=s.body.querySelector('input');input.value='missing';input.dispatchEvent(new s.dom.window.Event('input',{bubbles:true}));assert.equal(s.select().disabled,true);assert.equal(s.button().disabled,true);assert.match(s.root.querySelector('[role=status]').textContent,/Nenhuma/);
});
test('Reset clears located focus without moving the map or changing filters',t=>{
 const s=setup(t);s.choose();s.button().click();const state={...s.scene._worldMapState};assert.ok(s.root.querySelector('.ppbui-hunts-locate-flash'));assert.equal(s.reset().disabled,false);s.reset().click();assert.equal(s.root.querySelector('.ppbui-hunts-locate-flash'),null);assert.equal(s.root.querySelector('.ppbui-hunts-located'),null);assert.equal(s.root.querySelector('.ppbui-hunts-dimmed'),null);assert.equal(s.reset().disabled,true);assert.equal(s.select().value,'');assert.equal(s.select().selectedOptions[0].textContent,'Todos (2)');assert.equal(s.button().disabled,true);assert.deepEqual(s.scene._worldMapState,state);assert.deepEqual(s.stats(),{clicks:0,saves:1,cleanups:1,setups:1});
});
test('native refresh preserves search casing/caret, and result identity is reacquired',t=>{
 const s=setup(t),input=s.body.querySelector('input');input.focus();input.value='Pika';input.setSelectionRange(2,2);input.dispatchEvent(new s.dom.window.Event('input',{bubbles:true}));s.choose();
 s.body.innerHTML=markup();s.bind();const next=s.body.querySelector('input');next.value='pika';next.dispatchEvent(new s.dom.window.Event('input'));s.c.sync();assert.equal(next.value,'Pika');assert.equal(s.doc.activeElement,next);assert.equal(next.selectionStart,2);assert.equal(s.root.querySelectorAll('.ppbui-hunts-results').length,1);s.button().click();assert.equal(s.stats().clicks,0);assert.equal(s.stats().setups,1);
});
test('stable reconciliation makes no DOM mutations and cleanup restores native structure',async t=>{
 const s=setup(t);let mutations=0;const observer=new s.dom.window.MutationObserver(r=>mutations+=r.length);observer.observe(s.root,{subtree:true,childList:true,attributes:true});for(let i=0;i<5;i++)s.c.sync();await Promise.resolve();observer.disconnect();assert.equal(mutations,0);s.c.cleanup();assert.equal(s.root.outerHTML,s.before);
});
test('blocked, hidden, detached and unsupported navigation cannot start actions or mutate state',t=>{
 const s=setup(t),marker=s.root.querySelector('.hunt-map-marker'),before={...s.scene._worldMapState};s.scene.canEnterWorld=()=>false;assert.equal(locateHunt(s.root,marker),false);s.scene.canEnterWorld=()=>true;marker.hidden=true;assert.equal(locateHunt(s.root,marker),false);marker.hidden=false;marker.remove();assert.equal(locateHunt(s.root,marker),false);s.body.querySelector('.hunt-world-stage').append(marker);delete s.scene.setupWorldMapNavigation;assert.equal(locateHunt(s.root,marker),false);assert.deepEqual(s.scene._worldMapState,before);assert.deepEqual(s.stats(),{clicks:0,saves:0,cleanups:0,setups:0});
});
test('world change clears selected result and does not carry search into another world',t=>{
 const s=setup(t);s.choose();s.scene._tab='johto';s.body.innerHTML=markup();s.bind();s.c.sync();assert.equal(s.select().value,'');assert.equal(s.button().disabled,true);
});
test('Johto exposes level 1 and corrects only its initial level 100 filter',t=>{
 const s=setup(t),input=s.body.querySelector('input[type=number]');s.scene._tab='world-2';s.scene._worlds=[{id:'world-2',label:'Johto'}];s.scene.tabConfig=id=>s.scene._worlds.find(world=>world.id===id);s.scene._levelRanges={'world-2':{min:100,max:200}};input.min='100';input.value='100';let inputs=0;input.addEventListener('input',()=>{inputs++;s.scene._levelRanges['world-2'].min=Number(input.value);});s.c.sync();assert.equal(input.min,'1');assert.equal(input.value,'1');assert.equal(s.scene._levelRanges['world-2'].min,1);assert.equal(inputs,1);
 input.value='125';input.dispatchEvent(new s.dom.window.Event('input',{bubbles:true}));s.c.sync();assert.equal(input.value,'125');
});
test('storage failure still reinitializes native navigation and reports failure without hunt clicks',t=>{
 const s=setup(t);s.scene.saveWorldMapState=()=>{throw Error('denied');};s.scene._worldMapStates.kanto={scale:1,x:0,y:0};s.choose();s.button().click();assert.equal(s.stats().setups,1);assert.equal(s.stats().clicks,0);assert.match(s.root.querySelector('[role=status]').textContent,/Não foi possível/);
});

test('native reset is not undone and core remounts a replaced window without duplicates',async t=>{
 const {createBetterUI}=await import('../src/core/bootstrap.js');const {createHuntsModule}=await import('../src/modules/hunts/index.js');const s=setup(t);s.c.cleanup();const previous=new Map();
 for(const key of ['document','MutationObserver','requestAnimationFrame','cancelAnimationFrame']){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value:typeof s.dom.window[key]==='function'&&key!=='MutationObserver'?s.dom.window[key].bind(s.dom.window):s.dom.window[key]});}
 let enabled=true;const app=createBetterUI({modules:[createHuntsModule()],preferences:{isEnabled:()=>enabled,subscribe:()=>()=>{}}});t.after(()=>{app.stop();for(const [key,d]of previous)if(d)Object.defineProperty(globalThis,key,d);else delete globalThis[key];});app.start();
 const input=s.body.querySelector('input');input.value='Pika';input.dispatchEvent(new s.dom.window.Event('input',{bubbles:true}));s.body.innerHTML=markup();s.bind();app.reconcile();assert.equal(s.body.querySelector('input').value,'');
 const replacement=s.doc.createElement('div');replacement.className='hunt-window';replacement.innerHTML=`<div class="pokeidle-panel__body">${markup()}</div>`;s.root.replaceWith(replacement);s.scene._panel.body=replacement.firstChild;
 await new Promise(r=>s.dom.window.setTimeout(r,50));assert.equal(replacement.querySelectorAll('.ppbui-hunts-results').length,1);assert.equal(s.root.querySelector('.ppbui-hunts-results'),null);
 enabled=false;app.reconcile();assert.equal(replacement.querySelector('[data-ppbui-module]'),null);enabled=true;app.reconcile();assert.equal(replacement.querySelectorAll('.ppbui-hunts-results').length,1);
});

test('dual-type relations expose exact weaknesses, resistances and immunities',()=>{
 const entries=defensiveMultipliers(['psychic','fairy']), values=Object.fromEntries(entries.map(entry=>[entry.type,entry.multiplier]));
 assert.equal(values.ghost,2);assert.equal(values.poison,2);assert.equal(values.steel,2);assert.equal(values.fighting,.25);assert.equal(values.psychic,.5);assert.equal(values.dragon,0);assert.equal(values.bug,1);assert.equal(values.dark,1);
});
test('native hover card is enhanced once, preserves valued drops, repositions, and cleans exactly',t=>{
 const s=setup(t), marker=s.root.querySelector('.hunt-map-marker');s.scene.zoneElements=()=>['psychic','fairy'];s.scene.zoneName=()=> 'Mr. Mime';s.scene.zoneDrops=()=>[{name:'Rubber Ball',sell_price:1250}];
 const tooltip=s.doc.createElement('aside');tooltip.className='hunt-drop-tooltip hunt-world-drop-tooltip';tooltip.style.left='12px';tooltip.style.top='24px';tooltip.innerHTML='<strong class="hunt-drop-tooltip__title">Drops · Mr. Mime</strong><div class="hunt-drop-tooltip__elements"><span>Elements</span></div><div class="hunt-drop-tooltip__list"><div class="hunt-drop-tooltip__item">Rubber Ball</div></div>';s.doc.body.append(tooltip);s.scene._dropTooltip=tooltip;
 marker.getBoundingClientRect=()=>({left:100,right:150,top:100,bottom:150,width:50,height:50});tooltip.getBoundingClientRect=()=>({width:260,height:360});
 assert.equal(enhanceHuntTooltip(s.root,marker),true);assert.equal(enhanceHuntTooltip(s.root,marker),false);assert.equal(tooltip.querySelector('.hunt-drop-tooltip__title').textContent,'Mr. Mime');assert.equal(tooltip.querySelectorAll('.ppbui-hunts-relation').length,3);assert.match(tooltip.textContent,/Fraq\./);assert.match(tooltip.textContent,/Res\./);assert.match(tooltip.textContent,/Imu\./);assert.match(tooltip.textContent,/×0,25/);assert.match(tooltip.textContent,/×0/);assert.doesNotMatch(tooltip.querySelector('.ppbui-hunts-relation').textContent,/water|grass|poison/i);assert.match(tooltip.querySelector('.ppbui-hunts-relation-badge').getAttribute('aria-label'),/×2/);assert.match(tooltip.textContent,/Rubber Ball\(¤1250\)/);assert.doesNotMatch(tooltip.textContent,/Gold/);assert.equal(tooltip.querySelectorAll('[data-ppbui-hunts-tooltip]').length,5);
 cleanupHuntTooltip(s.doc);assert.equal(tooltip.querySelector('[data-ppbui-hunts-tooltip]'),null);assert.equal(tooltip.querySelector('.hunt-drop-tooltip__title').textContent,'Drops · Mr. Mime');assert.equal(tooltip.style.left,'12px');assert.equal(tooltip.style.top,'24px');tooltip.remove();
});
