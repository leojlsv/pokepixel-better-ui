import assert from 'node:assert/strict';
import {test} from 'node:test';
import {JSDOM} from 'jsdom';
import {mountHunts} from '../src/modules/hunts/controller.js';
import {locateHunt} from '../src/modules/hunts/navigation.js';
import {defensiveMultipliers} from '../src/modules/hunts/type-chart.js';

const markup=()=>`
  <div class="hunt-world-header">
    <nav class="hunt-category-tabs hunt-world-tabs"><button>Johto</button></nav>
    <div class="hunt-world-header-actions">
      <div class="hunt-world-zoom"><button>−</button><button>100%</button><button>+</button></div>
      <div class="hunt-presentation-toggle" role="group" aria-label="Apresentação da caçada">
        <button type="button" class="hunt-presentation-toggle__button">Modo clássico</button>
        <button type="button" class="hunt-presentation-toggle__button is-active">Modo plataforma</button>
      </div>
    </div>
  </div>
  <div class="hunt-world-notice"></div>
  <div class="hunt-world-toolbar"><input type="search"><span class="hunt-world-level-label">Lv.</span><input type="number" min="1" max="100" value="1"><span class="hunt-world-level-label">to</span><input type="number" min="1" max="100" value="100"><button>Clear</button><strong class="hunt-world-count">2 areas</strong></div>
  <div class="hunt-element-filters hunt-world-elements"><button class="hunt-element-filter">All</button><button class="hunt-element-filter">Fire</button></div>
  <div class="hunt-world-viewport"><div class="hunt-world-stage">
    <button class="hunt-map-marker" data-zone-index="0" style="left:80%;top:70%"><strong class="hunt-map-marker__name">Pikachu Lv. 20–30</strong></button>
    <button class="hunt-map-marker" data-zone-index="1" style="left:10%;top:20%"><strong class="hunt-map-marker__name">Abra Lv. 10–15</strong></button>
  </div></div>`;

function setup(t){
  const dom=new JSDOM(`<div class="hunt-window"><div class="pokeidle-panel__body">${markup()}</div></div>`,{url:'https://test.local',pretendToBeVisual:true});
  const doc=dom.window.document,root=doc.body.firstChild,body=root.firstChild;
  let nativeClicks=0,starts=0,hovers=0,focusInfos=0,saves=0,cleanups=0,setups=0,modeClicks=0;
  const zones=[
    {id:'pika',world:'kanto',name:'Pikachu',elements:['electric'],min:20,max:30,drops:[{name:'Static Fur',sell_price:50,icon_index:1}]},
    {id:'abra',world:'kanto',name:'Abra',elements:['psychic','fairy'],min:10,max:15,drops:[{name:'Bent Spoon',sell_price:1250,icon_index:2}]},
  ];
  const scene={
    _panel:{body},_tab:'kanto',_zones:zones,_worldLayouts:{kanto:{width:1000,height:800}},_worldMapState:{scale:1,x:0,y:0},_worldMapStates:{},
    zoneWorld:z=>z.world,zoneName:z=>z.name,zoneElements:z=>z.elements,zoneDrops:z=>z.drops,zoneMinMaxLevel:z=>({min:z.min,max:z.max}),
    canEnterWorld:()=>true,
    itemIcon(item){const i=doc.createElement('i');i.className='hunt-drop-tooltip__icon';i.dataset.icon=String(item.icon_index);return i;},
    startHunt(){starts++;return Promise.resolve();},
    hideDropTooltip(){if(this._dropTooltip)this._dropTooltip.hidden=true;},
    saveWorldMapState(){saves++;this._worldMapStates[this._tab]={...this._worldMapState};},
    _navigationCleanup(){cleanups++;},
    setupWorldMapNavigation(v,stage){setups++;this._worldMapState={...this._worldMapStates[this._tab]};stage.style.transform=`translate3d(${this._worldMapState.x}px,${this._worldMapState.y}px,0) scale(${this._worldMapState.scale})`;},
  };
  dom.window.SceneManager={_scene:scene};
  dom.window.PokeIdle={
    Localization:{get:()=>"pt-BR"},
    t:(key,args)=>key==='hunt_selection.element_singular'?'Elemento':key==='hunt_selection.element_plural'?'Elementos':key==='hunt_selection.level_abbr'?`Lv. ${args.level}`:key==='hunt_selection.level_range'?`Lv. ${args.min}–${args.max}`:key,
    ElementIcons:{definition:type=>({label:type,color:'#777'}),create:type=>{const i=doc.createElement('i');i.dataset.type=type;return i;}},
    Currency:{element:(value,options)=>{const span=doc.createElement('span');span.textContent=`¤${value}${options.showName?' Gold':''}`;return span;}},
  };

  function bind(){
    const viewport=body.querySelector('.hunt-world-viewport');
    Object.defineProperties(viewport,{
      clientWidth:{configurable:true,get:()=>viewport.parentElement?.classList.contains('is-inspector-open')?300:400},
      clientHeight:{configurable:true,value:300},
    });
    body.querySelectorAll('.hunt-map-marker').forEach((marker,index)=>{
      marker.addEventListener('click',()=>{nativeClicks++;scene._selectedIndex=index;scene.startHunt();});
      marker.addEventListener('pointerenter',()=>{hovers++;});
      marker.addEventListener('focus',()=>{focusInfos++;});
    });
    const search=body.querySelector('input[type=search]');
    search.addEventListener('input',()=>{scene._filter=search.value.toLowerCase().trim();body.querySelectorAll('.hunt-map-marker').forEach(node=>node.hidden=!node.textContent.toLowerCase().includes(scene._filter));});
    body.querySelectorAll('.hunt-presentation-toggle__button').forEach(button=>button.addEventListener('click',()=>modeClicks++));
  }

  bind();
  const before=root.outerHTML,c=mountHunts(root);
  t.after(()=>{c.cleanup();dom.window.close();});
  const select=()=>root.querySelector('.ppbui-hunts-results select');
  const locate=()=>root.querySelectorAll('.ppbui-hunts-results button')[0];
  const reset=()=>root.querySelectorAll('.ppbui-hunts-results button')[1];
  const dossier=()=>root.querySelector('.ppbui-hunts-inspector');
  const choose=(i='0')=>{select().value=i;select().dispatchEvent(new dom.window.Event('change'));};
  return {dom,doc,root,body,scene,c,before,bind,select,locate,reset,dossier,choose,stats:()=>({nativeClicks,starts,hovers,focusInfos,saves,cleanups,setups,modeClicks})};
}

test('marker click selects and opens inspector without starting a hunt; explicit Hunt starts native flow',async t=>{
  const s=setup(t),marker=s.root.querySelector('.hunt-map-marker');
  marker.dispatchEvent(new s.dom.window.PointerEvent('pointerenter',{bubbles:false}));
  marker.focus();
  marker.click();
  assert.equal(s.stats().hovers,0);
  assert.equal(s.stats().focusInfos,0);
  assert.equal(s.stats().nativeClicks,0);
  assert.equal(s.stats().starts,0);
  assert.equal(s.dossier().hidden,false);
  assert.equal(s.doc.activeElement,s.dossier());
  assert.match(s.dossier().textContent,/Pikachu/);
  assert.match(s.dossier().querySelector('.ppbui-hunts-inspector__hunt').textContent,/Entrar na Hunt/);
  assert.ok(marker.classList.contains('ppbui-hunts-selected-marker'));
  s.dossier().querySelector('.ppbui-hunts-inspector__hunt').click();
  await Promise.resolve();
  assert.equal(s.stats().nativeClicks,0);
  assert.equal(s.stats().starts,1);
  assert.equal(s.scene._selectedIndex,0);
});

test('pointer selection keeps marker focus while keyboard activation enters the inspector tab sequence',t=>{
  const pointer=setup(t),pointerMarker=pointer.root.querySelector('.hunt-map-marker');
  pointerMarker.dispatchEvent(new pointer.dom.window.MouseEvent('click',{bubbles:true,button:0,detail:1}));
  assert.equal(pointer.doc.activeElement,pointerMarker);

  const keyboard=setup(t),keyboardMarker=keyboard.root.querySelector('.hunt-map-marker');
  keyboardMarker.click();
  assert.equal(keyboard.doc.activeElement,keyboard.dossier());
  assert.equal(keyboard.dossier().tabIndex,-1);
});

test('cleanup restores native marker click, hover and focus behavior',async t=>{
  const s=setup(t),marker=s.root.querySelector('.hunt-map-marker');
  s.c.cleanup();
  marker.dispatchEvent(new s.dom.window.PointerEvent('pointerenter',{bubbles:false}));
  marker.focus();
  marker.click();
  await Promise.resolve();
  assert.equal(s.stats().hovers,1);
  assert.equal(s.stats().focusInfos,1);
  assert.equal(s.stats().nativeClicks,1);
  assert.equal(s.stats().starts,1);
});

test('delegated capture protects freshly replaced markers before reconciliation',t=>{
  const s=setup(t);s.body.innerHTML=markup();s.bind();
  const marker=s.body.querySelector('.hunt-map-marker');
  marker.dispatchEvent(new s.dom.window.PointerEvent('pointerenter',{bubbles:false}));
  marker.focus();marker.click();
  assert.equal(s.stats().hovers,0);
  assert.equal(s.stats().focusInfos,0);
  assert.equal(s.stats().nativeClicks,0);
  assert.equal(s.stats().starts,0);
});

test('native presentation toggle is moved intact into inspector and restored exactly on cleanup',t=>{
  const s=setup(t),toggle=s.root.querySelector('.hunt-presentation-toggle'),header=s.root.querySelector('.hunt-world-header-actions');
  assert.equal(header.contains(toggle),false);
  assert.equal(s.dossier().contains(toggle),true);
  toggle.querySelector('button').click();
  assert.equal(s.stats().modeClicks,1);
  s.c.cleanup();
  assert.equal(header.contains(toggle),true);
  assert.equal(s.root.outerHTML,s.before);
});

test('Hunt Atlas Finder rail keeps native query, element and count nodes intact without old card groups',t=>{
  const s=setup(t),toolbar=s.root.querySelector('.hunt-world-toolbar'),elements=s.root.querySelector('.hunt-world-elements'),count=s.root.querySelector('.hunt-world-count'),finder=s.root.querySelector('.ppbui-hunts-finder');
  assert.ok(finder);
  assert.deepEqual([...finder.children],[toolbar,elements,s.root.querySelector('.ppbui-hunts-results')]);
  assert.equal(s.root.querySelector('.ppbui-hunts-controls'),null);
  assert.equal(s.root.querySelector('.ppbui-hunts-control-group'),null);
  assert.equal(count.parentElement,s.root.querySelector('.ppbui-hunts-results'));
  assert.equal(toolbar.querySelector('.hunt-world-count'),null);
  s.c.cleanup();
  assert.equal(s.root.querySelector('.ppbui-hunts-finder'),null);
  assert.equal(s.root.querySelector('.hunt-world-toolbar .hunt-world-count'),count);
  assert.equal(s.root.outerHTML,s.before);
});

test('Hunt Atlas structure and complete state language consume scoped Better UI primitives',t=>{
  const s=setup(t),css=s.root.querySelector('style[data-ppbui-module="hunts"]').textContent;
  assert.match(css,/--ppbui-bg-1/);assert.match(css,/--ppbui-accent/);assert.match(css,/--ppbui-focus/);
  assert.ok(s.root.querySelector('.hunt-world-header').classList.contains('ppbui-hunts-atlas-rail'));
  assert.ok(s.root.querySelector('.ppbui-hunts-finder'));
  assert.ok(s.root.querySelector('.ppbui-hunts-atlas-workspace'));
  assert.match(css,/\.ppbui-hunts-atlas-workspace\.is-inspector-open/);
  assert.match(css,/@container \(max-width:780px\)/);
  assert.match(css,/@media \(pointer:coarse\)/);
  assert.match(css,/button:disabled[^}]+color:var\(--ppbui-text-subtle\)/s);
  assert.match(css,/\.hunt-category-tab\.is-active[^{]*\{[^}]+color:var\(--ppbui-text\)/s);
  assert.match(css,/\.hunt-category-tab:hover:not\(:disabled\):not\(\.is-active\):not\(\[aria-selected="true"\]\)/);
  assert.match(css,/\.hunt-world-elements button:hover:not\(:disabled\):not\(\.is-active\):not\(\[aria-pressed="true"\]\)/);
  assert.match(css,/hunt-presentation-toggle button:hover:not\(:disabled\):not\(\.is-active\):not\(\[aria-pressed="true"\]\)/);
  assert.match(css,/\.hunt-map-marker__name\s*\{[^}]+--ppbui-hunt-location-rail:transparent/s);
  assert.match(css,/\.hunt-map-marker:hover \.hunt-map-marker__name:not\(\.ppbui-hunts-selected\)/);
  assert.doesNotMatch(css,/\.hunt-map-marker:hover \.hunt-map-marker__name\s*\{/);
  assert.match(css,/\.hunt-map-marker:active \.hunt-map-marker__name/);
  assert.match(css,/\.hunt-map-marker__name\.ppbui-hunts-located\s*\{[^}]+--ppbui-hunt-location-rail:var\(--ppbui-info\)/s);
  assert.match(css,/\.hunt-map-marker__name\.ppbui-hunts-selected\.ppbui-hunts-located/);
  assert.match(css,/\.hunt-map-marker:focus-visible \.hunt-map-marker__name\s*\{[^}]+outline:var\(--ppbui-border-width\) solid var\(--ppbui-focus\)/s);
  assert.match(css,/\.hunt-map-marker__name\.ppbui-hunts-dimmed\s*\{\s*opacity:\.55/);
  assert.match(css,/input\[type="search"\][^}]*\{[^}]+appearance:none/s);
  assert.match(css,/input\[type="number"\][^}]*\{[^}]+appearance:textfield/s);
  assert.match(css,/\.ppbui-hunts-select-wrap::after/);
  assert.match(css,/\.hunt-world-notice:empty\s*\{\s*display:none/);
  assert.match(css,/\.hunt-world-notice:not\(:empty\)[^{]*\{[^}]+border-left:[^}]+var\(--ppbui-info\)[^}]+box-shadow:none/s);
  assert.match(css,/\.ppbui-hunts-inspector\s*\{[^}]+border-left:[^}]+box-shadow:none/s);
  assert.match(css,/\.ppbui-hunts-inspector__mode \.hunt-presentation-toggle\s*\{[^}]+gap:0/s);
  assert.match(css,/@media \(pointer:coarse\)[\s\S]*\.ppbui-hunts-inspector__hunt\s*\{\s*min-height:40px;\s*\}/);
  assert.match(css,/@media \(pointer:coarse\)[\s\S]*\.ppbui-hunts-inspector__close\s*\{[^}]+min-width:40px;[^}]+min-height:40px;/);
  assert.ok(css.lastIndexOf('.hunt-category-tab:disabled')>css.lastIndexOf('.hunt-category-tab.is-active'));
  assert.ok(css.lastIndexOf('.hunt-world-elements button:disabled')>css.lastIndexOf('.hunt-world-elements button.is-active'));
  assert.match(css,/button:disabled[^}]+cursor:default/s);
  assert.doesNotMatch(css,/(^|\})\s*(button|input|select)\s*\{/m);
  assert.equal(s.root.querySelector('.ppbui-hunts-results select').classList.contains('ppbui-select'),true);
  assert.equal(s.dossier().classList.contains('ppbui-dialog'),false);
  assert.equal(s.dossier().querySelector('.ppbui-hunts-inspector__hunt').classList.contains('ppbui-button--primary'),true);
});

test('Locate opens the same inspector, pans without starting Hunt, preserves zoom and dims other labels',t=>{
  const s=setup(t);s.choose();s.locate().click();
  const marker=s.root.querySelector('.hunt-map-marker');
  assert.equal(s.dossier().hidden,false);
  assert.ok(marker.classList.contains('ppbui-hunts-selected-marker'));
  assert.ok(marker.classList.contains('ppbui-hunts-located-marker'));
  assert.ok(s.root.querySelectorAll('.hunt-map-marker__name')[1].classList.contains('ppbui-hunts-dimmed'));
  assert.deepEqual(s.stats(),{nativeClicks:0,starts:0,hovers:0,focusInfos:0,saves:2,cleanups:2,setups:2,modeClicks:0});
  assert.deepEqual(s.scene._worldMapState,{scale:.9375,x:-600,y:-375});
});

test('Reset clears located focus and inspector without moving the map or changing filters',t=>{
  const s=setup(t);s.choose();s.locate().click();const state={...s.scene._worldMapState};
  const openRatio=state.scale/(Math.max(300/1000,300/800)*1.002),openCenterX=(300/2-state.x)/state.scale,openCenterY=(300/2-state.y)/state.scale;
  assert.equal(s.reset().disabled,false);s.reset().click();
  assert.equal(s.root.querySelector('.ppbui-hunts-locate-flash'),null);
  assert.equal(s.root.querySelector('.ppbui-hunts-selected'),null);
  assert.equal(s.root.querySelector('.ppbui-hunts-located'),null);
  assert.equal(s.root.querySelector('.ppbui-hunts-dimmed'),null);
  assert.equal(s.dossier().hidden,true);
  assert.equal(s.reset().disabled,true);
  assert.equal(s.select().value,'');
  const closed=s.scene._worldMapState,closedRatio=closed.scale/(Math.max(400/1000,300/800)*1.002),closedCenterX=(400/2-closed.x)/closed.scale,closedCenterY=(300/2-closed.y)/closed.scale;
  assert.ok(Math.abs(closedRatio-openRatio)<1e-9);assert.ok(Math.abs(closedCenterX-openCenterX)<1e-9);assert.ok(Math.abs(closedCenterY-openCenterY)<1e-9);
});

test('Reset is available for click-only selection and clears the inspector without navigation',t=>{
  const s=setup(t),marker=s.root.querySelector('.hunt-map-marker'),state={...s.scene._worldMapState};marker.click();
  assert.equal(s.reset().disabled,false);s.reset().click();
  assert.equal(s.dossier().hidden,true);
  assert.equal(s.root.querySelector('.ppbui-hunts-selected'),null);
  assert.equal(s.reset().disabled,true);
  assert.equal(s.select().value,'');
  assert.deepEqual(s.scene._worldMapState,state);
  assert.deepEqual(s.stats(),{nativeClicks:0,starts:0,hovers:0,focusInfos:0,saves:2,cleanups:2,setups:2,modeClicks:0});
});

test('opening and closing inspector preserves relative zoom and restores untouched map state',t=>{
  const s=setup(t),marker=s.root.querySelector('.hunt-map-marker'),initial={...s.scene._worldMapState};
  const closedCover=Math.max(400/1000,300/800)*1.002,initialRatio=initial.scale/closedCover;
  marker.click();
  const openCover=Math.max(300/1000,300/800)*1.002;
  assert.ok(Math.abs(s.scene._worldMapState.scale/openCover-initialRatio)<1e-9);
  const openCenterX=(300/2-s.scene._worldMapState.x)/s.scene._worldMapState.scale;
  assert.ok(Math.abs(openCenterX-200)<1e-9);assert.equal(s.scene._worldMapState.y,0);
  s.reset().click();
  assert.ok(Math.abs(s.scene._worldMapState.scale-initial.scale)<1e-9);
  assert.ok(Math.abs(s.scene._worldMapState.x-initial.x)<1e-9);assert.ok(Math.abs(s.scene._worldMapState.y-initial.y)<1e-9);
  assert.equal(s.stats().saves,2);assert.equal(s.stats().cleanups,2);assert.equal(s.stats().setups,2);
});

test('selecting another marker after Locate keeps location state separate without dimming the selection',t=>{
  const s=setup(t);s.choose();s.locate().click();
  const [locatedMarker,selectedMarker]=s.root.querySelectorAll('.hunt-map-marker');selectedMarker.click();
  assert.ok(locatedMarker.classList.contains('ppbui-hunts-located-marker'));
  assert.ok(selectedMarker.classList.contains('ppbui-hunts-selected-marker'));
  assert.equal(selectedMarker.querySelector('.hunt-map-marker__name').classList.contains('ppbui-hunts-dimmed'),false);
  assert.match(s.dossier().textContent,/Abra/);
  assert.deepEqual(s.stats(),{nativeClicks:0,starts:0,hovers:0,focusInfos:0,saves:2,cleanups:2,setups:2,modeClicks:0});
});

test('inspector contains elements, exact defensive relations and valued drops instead of hover tooltip',t=>{
  const s=setup(t),marker=s.root.querySelectorAll('.hunt-map-marker')[1];
  marker.click();const panel=s.dossier();
  assert.match(panel.textContent,/Abra/);
  assert.match(panel.textContent,/psychic/);
  assert.match(panel.textContent,/fairy/);
  assert.match(panel.textContent,/Fraq\./);
  assert.match(panel.textContent,/Res\./);
  assert.match(panel.textContent,/Imu\./);
  assert.match(panel.textContent,/×0,25/);
  assert.match(panel.textContent,/×0/);
  assert.match(panel.textContent,/Bent Spoon/);
  assert.match(panel.textContent,/¤1250/);
  assert.equal(panel.getAttribute('aria-labelledby'),panel.querySelector('.ppbui-hunts-inspector__title').id);
  assert.match(panel.querySelector('.ppbui-hunts-drop-name').title,/Bent Spoon/);
  assert.match(panel.querySelector('.ppbui-hunts-inspector__close').getAttribute('aria-label'),/Fechar/);
  assert.equal(s.doc.querySelector('.hunt-world-drop-tooltip'),null);
  for(const className of ['hunt-drop-tooltip__title','hunt-drop-tooltip__elements','hunt-drop-tooltip__elements-label','hunt-drop-tooltip__element-badges','hunt-drop-tooltip__element','hunt-drop-tooltip__empty','hunt-drop-tooltip__list','hunt-drop-tooltip__item']){
    assert.equal(panel.querySelector(`.${className}`),null);
  }
  assert.ok(panel.querySelector('.hunt-drop-tooltip__icon'));
});

test('search hiding the selected marker closes inspector, restores focus and does not fabricate zones',t=>{
  const s=setup(t),marker=s.root.querySelector('.hunt-map-marker');marker.click();
  const input=s.body.querySelector('input[type=search]');input.value='missing';input.dispatchEvent(new s.dom.window.Event('input',{bubbles:true}));
  assert.equal(s.select().disabled,true);
  assert.equal(s.locate().disabled,true);
  assert.equal(s.dossier().hidden,true);
  assert.equal(s.doc.activeElement,input);
  assert.match(s.root.querySelector('[role=status]').textContent,/Nenhuma/);
});

test('native refresh preserves selected zone, inspector and new presentation toggle without stale nodes',t=>{
  const s=setup(t);s.root.querySelectorAll('.hunt-map-marker')[1].click();const oldToggle=s.root.querySelector('.hunt-presentation-toggle');
  const before={...s.scene._worldMapState},beforeViewport=s.root.querySelector('.hunt-world-viewport'),layout=s.scene._worldLayouts.kanto;
  const beforeRatio=before.scale/(Math.max(beforeViewport.clientWidth/layout.width,beforeViewport.clientHeight/layout.height)*1.002);
  const beforeCenterX=(beforeViewport.clientWidth/2-before.x)/before.scale,beforeCenterY=(beforeViewport.clientHeight/2-before.y)/before.scale;
  s.body.innerHTML=markup();s.bind();s.c.sync();
  const nextToggle=s.root.querySelector('.hunt-presentation-toggle');
  const nextViewport=s.root.querySelector('.hunt-world-viewport'),after=s.scene._worldMapState;
  const afterRatio=after.scale/(Math.max(nextViewport.clientWidth/layout.width,nextViewport.clientHeight/layout.height)*1.002);
  const afterCenterX=(nextViewport.clientWidth/2-after.x)/after.scale,afterCenterY=(nextViewport.clientHeight/2-after.y)/after.scale;
  assert.notEqual(nextToggle,oldToggle);
  assert.equal(s.dossier().contains(nextToggle),true);
  assert.equal(s.dossier().hidden,false);
  assert.match(s.dossier().textContent,/Abra/);
  assert.ok(s.root.querySelectorAll('.hunt-map-marker')[1].classList.contains('ppbui-hunts-selected-marker'));
  assert.ok(Math.abs(afterRatio-beforeRatio)<1e-9);
  assert.ok(Math.abs(afterCenterX-beforeCenterX)<1e-9);
  assert.ok(Math.abs(afterCenterY-beforeCenterY)<1e-9);
});

test('native refresh after native rAF clamp preserves open zoom and focal point',async t=>{
  const s=setup(t);s.root.querySelectorAll('.hunt-map-marker')[1].click();
  const layout=s.scene._worldLayouts.kanto,openViewport=s.root.querySelector('.hunt-world-viewport'),liveState=s.scene._worldMapState;
  const openCover=Math.max(openViewport.clientWidth/layout.width,openViewport.clientHeight/layout.height)*1.002;
  liveState.scale=openCover;
  liveState.x=openViewport.clientWidth-layout.width*liveState.scale;
  liveState.y=openViewport.clientHeight-layout.height*liveState.scale;
  const beforeRatio=liveState.scale/openCover;
  const beforeCenterX=(openViewport.clientWidth/2-liveState.x)/liveState.scale,beforeCenterY=(openViewport.clientHeight/2-liveState.y)/liveState.scale;

  s.body.innerHTML=markup();s.bind();
  const replacementViewport=s.root.querySelector('.hunt-world-viewport');
  const replacementCover=Math.max(replacementViewport.clientWidth/layout.width,replacementViewport.clientHeight/layout.height)*1.002;
  s.scene._worldMapState={scale:replacementCover,x:0,y:0};
  await new Promise(resolve=>s.dom.window.requestAnimationFrame(()=>s.dom.window.requestAnimationFrame(()=>{s.c.sync();resolve();})));

  const nextViewport=s.root.querySelector('.hunt-world-viewport'),after=s.scene._worldMapState;
  const afterCover=Math.max(nextViewport.clientWidth/layout.width,nextViewport.clientHeight/layout.height)*1.002;
  const afterRatio=after.scale/afterCover;
  const afterCenterX=(nextViewport.clientWidth/2-after.x)/after.scale,afterCenterY=(nextViewport.clientHeight/2-after.y)/after.scale;
  assert.ok(Math.abs(afterRatio-beforeRatio)<1e-9);
  assert.ok(Math.abs(afterCenterX-beforeCenterX)<1e-9);
  assert.ok(Math.abs(afterCenterY-beforeCenterY)<1e-9);
});

test('zone identity survives native reorder and explicit Hunt uses the reacquired index',async t=>{
  const s=setup(t);s.root.querySelectorAll('.hunt-map-marker')[1].click();const [pika,abra]=s.scene._zones;
  s.scene._zones=[abra,pika];s.body.innerHTML=markup();s.bind();
  const [pikaMarker,abraMarker]=s.body.querySelectorAll('.hunt-map-marker');pikaMarker.dataset.zoneIndex='1';abraMarker.dataset.zoneIndex='0';s.c.sync();
  assert.match(s.dossier().textContent,/Abra/);
  assert.ok(abraMarker.classList.contains('ppbui-hunts-selected-marker'));
  s.dossier().querySelector('.ppbui-hunts-inspector__hunt').click();await Promise.resolve();
  assert.equal(s.scene._selectedIndex,0);assert.equal(s.stats().starts,1);
});

test('selected zone disappearing during refresh clears inspector, focuses result select and never reuses its old index',t=>{
  const s=setup(t);s.root.querySelectorAll('.hunt-map-marker')[1].click();
  s.scene._zones[1]={id:'different-zone',world:'kanto',name:'Different Zone',elements:['fire'],min:1,max:2,drops:[]};s.body.innerHTML=markup();s.bind();s.c.sync();
  assert.equal(s.dossier().hidden,true);assert.equal(s.root.querySelector('.ppbui-hunts-selected-marker'),null);assert.equal(s.reset().disabled,true);assert.equal(s.doc.activeElement,s.select());
});

test('inspector rerenders when data changes for the same stable zone identity',t=>{
  const s=setup(t);s.root.querySelector('.hunt-map-marker').click();
  s.scene._zones[0]={...s.scene._zones[0],name:'Pikachu Updated',drops:[{name:'Updated Fur',sell_price:999,icon_index:4}]};s.c.sync();
  assert.match(s.dossier().textContent,/Pikachu Updated/);assert.match(s.dossier().textContent,/Updated Fur/);assert.match(s.dossier().textContent,/¤999/);
});

test('search casing and caret survive native body reconstruction',t=>{
  const s=setup(t),input=s.body.querySelector('input[type=search]');input.focus();input.value='Pika';input.setSelectionRange(2,2);input.dispatchEvent(new s.dom.window.Event('input',{bubbles:true}));
  s.body.innerHTML=markup();s.bind();const next=s.body.querySelector('input[type=search]');next.value='pika';next.dispatchEvent(new s.dom.window.Event('input'));s.c.sync();
  assert.equal(next.value,'Pika');assert.equal(s.doc.activeElement,next);assert.equal(next.selectionStart,2);assert.equal(s.root.querySelectorAll('.ppbui-hunts-results').length,1);
});

test('stable reconciliation makes no DOM mutations and cleanup restores exact native structure',async t=>{
  const s=setup(t);let mutations=0;const observer=new s.dom.window.MutationObserver(records=>mutations+=records.length);observer.observe(s.root,{subtree:true,childList:true,attributes:true});
  for(let i=0;i<5;i++)s.c.sync();await Promise.resolve();observer.disconnect();assert.equal(mutations,0);
  s.c.cleanup();assert.equal(s.root.outerHTML,s.before);
});

test('cleanup with inspector open restores native-width map state and native structure',t=>{
  const s=setup(t),initial={...s.scene._worldMapState},viewport=s.root.querySelector('.hunt-world-viewport'),layout=s.scene._worldLayouts.kanto;
  const initialRatio=initial.scale/(Math.max(viewport.clientWidth/layout.width,viewport.clientHeight/layout.height)*1.002);
  const initialCenterX=(viewport.clientWidth/2-initial.x)/initial.scale,initialCenterY=(viewport.clientHeight/2-initial.y)/initial.scale;
  s.root.querySelector('.hunt-map-marker').click();
  assert.equal(s.root.querySelector('.ppbui-hunts-atlas-workspace').classList.contains('is-inspector-open'),true);
  s.c.cleanup();
  const restoredViewport=s.root.querySelector('.hunt-world-viewport'),restored=s.scene._worldMapState;
  const restoredRatio=restored.scale/(Math.max(restoredViewport.clientWidth/layout.width,restoredViewport.clientHeight/layout.height)*1.002);
  const restoredCenterX=(restoredViewport.clientWidth/2-restored.x)/restored.scale,restoredCenterY=(restoredViewport.clientHeight/2-restored.y)/restored.scale;
  assert.ok(Math.abs(restoredRatio-initialRatio)<1e-9);assert.ok(Math.abs(restoredCenterX-initialCenterX)<1e-9);assert.ok(Math.abs(restoredCenterY-initialCenterY)<1e-9);
  assert.deepEqual(restored,initial);
  assert.equal(s.root.querySelector('.hunt-world-stage').style.transform,`translate3d(${restored.x}px,${restored.y}px,0) scale(${restored.scale})`);
  assert.equal(s.root.querySelector('[data-ppbui-module]'),null);assert.equal(s.root.classList.contains('ppbui-hunts-enhanced'),false);
  assert.equal(restoredViewport.parentElement,s.body);assert.equal(s.root.querySelector('.hunt-world-header-actions').contains(s.root.querySelector('.hunt-presentation-toggle')),true);
});

test('blocked, hidden, detached and unsupported navigation cannot start actions or mutate state',t=>{
  const s=setup(t),marker=s.root.querySelector('.hunt-map-marker'),before={...s.scene._worldMapState};
  s.scene.canEnterWorld=()=>false;assert.equal(locateHunt(s.root,marker),false);s.scene.canEnterWorld=()=>true;marker.hidden=true;assert.equal(locateHunt(s.root,marker),false);marker.hidden=false;marker.remove();assert.equal(locateHunt(s.root,marker),false);s.body.querySelector('.hunt-world-stage').append(marker);delete s.scene.setupWorldMapNavigation;assert.equal(locateHunt(s.root,marker),false);
  assert.deepEqual(s.scene._worldMapState,before);assert.equal(s.stats().starts,0);
});

test('world change clears selection, closes inspector and focuses the result select',t=>{
  const s=setup(t);s.root.querySelector('.hunt-map-marker').click();s.scene._tab='johto';s.scene._zones.forEach(zone=>zone.world='johto');s.body.innerHTML=markup();s.bind();s.c.sync();
  assert.equal(s.select().value,'');assert.equal(s.dossier().hidden,true);assert.equal(s.doc.activeElement,s.select());
});

test('automatic inspector close falls back to Hunts body when marker, result select and search are unavailable',t=>{
  const s=setup(t),marker=s.root.querySelector('.hunt-map-marker');marker.click();
  s.body.querySelector('input[type=search]').disabled=true;s.root.querySelectorAll('.hunt-map-marker').forEach(node=>node.hidden=true);s.c.sync();
  assert.equal(s.select().disabled,true);assert.equal(s.dossier().hidden,true);assert.equal(s.doc.activeElement,s.body);assert.equal(s.body.getAttribute('tabindex'),'-1');
});

test('Johto exposes level 1 and corrects only its initial level 100 filter',t=>{
  const s=setup(t),input=s.body.querySelector('input[type=number]');s.scene._tab='world-2';s.scene._worlds=[{id:'world-2',label:'Johto'}];s.scene.tabConfig=id=>s.scene._worlds.find(world=>world.id===id);s.scene._levelRanges={'world-2':{min:100,max:200}};input.min='100';input.value='100';let inputs=0;input.addEventListener('input',()=>{inputs++;s.scene._levelRanges['world-2'].min=Number(input.value);});s.c.sync();assert.equal(input.min,'1');assert.equal(input.value,'1');assert.equal(s.scene._levelRanges['world-2'].min,1);assert.equal(inputs,1);
  input.value='125';input.dispatchEvent(new s.dom.window.Event('input',{bubbles:true}));s.c.sync();assert.equal(input.value,'125');
});

test('storage failure still reinitializes native navigation and reports failure without hunt starts',t=>{
  const s=setup(t);s.scene.saveWorldMapState=()=>{throw Error('denied');};s.scene._worldMapStates.kanto={scale:1,x:0,y:0};s.choose();s.locate().click();assert.equal(s.stats().setups,2);assert.equal(s.stats().starts,0);assert.match(s.root.querySelector('[role=status]').textContent,/Não foi possível/);
});

test('native window replacement remounts cleanly without duplicate Better UI surfaces',async t=>{
  const {createBetterUI}=await import('../src/core/bootstrap.js');const {createHuntsModule}=await import('../src/modules/hunts/index.js');const s=setup(t);s.c.cleanup();const previous=new Map();
  for(const key of ['document','MutationObserver','requestAnimationFrame','cancelAnimationFrame']){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value:typeof s.dom.window[key]==='function'&&key!=='MutationObserver'?s.dom.window[key].bind(s.dom.window):s.dom.window[key]});}
  let enabled=true;const app=createBetterUI({modules:[createHuntsModule()],preferences:{isEnabled:()=>enabled,subscribe:()=>()=>{}}});t.after(()=>{app.stop();for(const [key,d]of previous)if(d)Object.defineProperty(globalThis,key,d);else delete globalThis[key];});app.start();
  const replacement=s.doc.createElement('div');replacement.className='hunt-window';replacement.innerHTML=`<div class="pokeidle-panel__body">${markup()}</div>`;s.root.replaceWith(replacement);s.scene._panel.body=replacement.firstChild;
  await new Promise(resolve=>s.dom.window.setTimeout(resolve,50));assert.equal(replacement.querySelectorAll('.ppbui-hunts-results').length,1);assert.equal(replacement.querySelectorAll('.ppbui-hunts-atlas-workspace').length,1);
  enabled=false;app.reconcile();assert.equal(replacement.querySelector('[data-ppbui-module]'),null);enabled=true;app.reconcile();assert.equal(replacement.querySelectorAll('.ppbui-hunts-results').length,1);
});

test('dual-type relations expose exact weaknesses, resistances and immunities',()=>{
  const entries=defensiveMultipliers(['psychic','fairy']),values=Object.fromEntries(entries.map(entry=>[entry.type,entry.multiplier]));
  assert.equal(values.ghost,2);assert.equal(values.poison,2);assert.equal(values.steel,2);assert.equal(values.fighting,.25);assert.equal(values.psychic,.5);assert.equal(values.dragon,0);assert.equal(values.bug,1);assert.equal(values.dark,1);
});
