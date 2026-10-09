import assert from 'node:assert/strict';
import {test} from 'node:test';
import {JSDOM} from 'jsdom';
import {mountHunts} from '../src/modules/hunts/controller.js';
import {activeHuntZone,forgetActiveHuntZone,parts,rememberActiveHuntZone,zoneNode} from '../src/modules/hunts/dom.js';
import {createHuntsModule} from '../src/modules/hunts/index.js';
import {createHuntFavoritesStore,HUNT_FAVORITES_STORAGE_KEY} from '../src/modules/hunts/favorites.js';
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
    <button class="hunt-map-marker" data-zone-index="0" style="left:80%;top:70%"><span class="hunt-map-marker__sprite" style="background-image:url('/native-hunt/pikachu.png')"></span><strong class="hunt-map-marker__name">Pikachu Lv. 20–30</strong></button>
    <button class="hunt-map-marker" data-zone-index="1" style="left:10%;top:20%"><span class="hunt-map-marker__sprite"></span><strong class="hunt-map-marker__name">Abra Lv. 10–15</strong></button>
  </div></div>`;

function setup(t){
  const dom=new JSDOM(`<div class="hunt-window"><div class="pokeidle-panel__titlebar"><span class="pokeidle-panel__title" style="font:600 14px/1.2 Arial,sans-serif !important">Hunt Map</span><button type="button" aria-label="Close">×</button></div><div class="pokeidle-panel__body">${markup()}</div></div>`,{url:'https://test.local',pretendToBeVisual:true});
  const doc=dom.window.document,root=doc.body.firstChild,body=root.querySelector('.pokeidle-panel__body');
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
  dom.window.SceneManager={_scene:scene,_nextScene:null};
  dom.window.PokeIdle={
    Localization:{get:()=>"pt-BR"},
    t:(key,args)=>key==='hunt_selection.element_singular'?'Elemento':key==='hunt_selection.element_plural'?'Elementos':key==='hunt_selection.level_abbr'?`Lv. ${args.level}`:key==='hunt_selection.level_range'?`Lv. ${args.min}–${args.max}`:key,
    ElementIcons:{definition:type=>({label:type,color:'#777'}),create:type=>{const wrapper=doc.createElement('span'),image=doc.createElement('img');wrapper.className='native-element-circle';image.src=`/${type}.png`;image.dataset.type=type;wrapper.append(image);return wrapper;}},
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

const currentListMarkup=()=>[
  '<div class="hunt-selection-shell"><aside class="hunt-selection-sidebar">',
  '<div class="hunt-list-header">',
  '<nav class="hunt-list-world-tabs"><button class="pokeidle-ui-button hunt-list-world-tab is-active" aria-current="page">Kanto</button><button class="pokeidle-ui-button hunt-list-world-tab">Johto</button><button class="pokeidle-ui-button hunt-list-world-tab" disabled>Ilhas Lendárias</button><button class="pokeidle-ui-button hunt-list-world-tab">Hoenn</button></nav>',
  '<div class="hunt-presentation-toggle" role="group" aria-label="View"><button class="hunt-presentation-toggle__button" aria-pressed="false">MAP</button><button class="hunt-presentation-toggle__button is-active" aria-pressed="true">LIST</button></div>',
  '<div class="hunt-presentation-toggle" role="group" aria-label="Apresentação da caçada"><button class="hunt-presentation-toggle__button is-active" aria-pressed="true">Modo clássico</button><button class="hunt-presentation-toggle__button" aria-pressed="false">Modo plataforma</button></div>',
  '</div>',
  '<div class="hunt-list-world-note">Kanto · hunts dos níveis 1 a 100</div>',
  '<div class="hunt-list-toolbar">',
  '<label class="hunt-list-field hunt-list-search-field"><span>Search</span><input type="search"></label>',
  '<label class="hunt-list-field hunt-list-element-filter"><span>Element</span><select><option value="all">All</option><option value="fire">Fire</option></select></label>',
  '<label class="hunt-list-field hunt-list-sort-field"><span>Sort</span><select><option>Level</option></select></label>',
  '<div class="hunt-list-field hunt-list-range-field"><span>Level</span><div class="hunt-list-range-inputs"><input type="number" min="1" max="100" value="1"><span>–</span><input type="number" min="1" max="100" value="100"></div></div>',
  '<button class="pokeidle-ui-button hunt-list-clear">Clear</button>',
  '</div>',
  '</aside><div class="hunt-selection-content">',
  '<div class="hunt-list-summary"><strong>2 areas</strong><span>EXP note</span></div>',
  '<div class="hunt-list-table-shell"><table class="hunt-list-table"><tbody>',
  '<tr class="hunt-list-row"><td class="hunt-list-action-cell"><button class="pokeidle-ui-button hunt-list-hunt-button">Hunt</button><button class="pokeidle-ui-button hunt-list-details-button" aria-controls="hunt-list-details-0">Details</button></td><td class="hunt-list-name-cell"><div class="hunt-list-identity"><img class="hunt-list-sprite" src="/native-hunt/pikachu.png"><strong>Pikachu Forest</strong></div></td></tr>',
  '<tr id="hunt-list-details-0" class="hunt-list-detail-row" hidden><td>Details</td></tr>',
  '<tr class="hunt-list-row"><td class="hunt-list-action-cell"><button class="pokeidle-ui-button hunt-list-hunt-button">Hunt</button><button class="pokeidle-ui-button hunt-list-details-button" aria-controls="hunt-list-details-1">Details</button></td><td class="hunt-list-name-cell"><div class="hunt-list-identity"><canvas class="hunt-list-sprite" width="2" height="2"></canvas><strong>Abra Cave</strong></div></td></tr>',
  '<tr id="hunt-list-details-1" class="hunt-list-detail-row" hidden><td>Details</td></tr>',
  '</tbody></table></div>',
  '</div></div>',
].join('');

const currentMapMarkup=()=>[
  '<div class="hunt-selection-shell"><aside class="hunt-selection-sidebar">',
  '<div class="hunt-list-header">',
  '<nav class="hunt-list-world-tabs"><button class="pokeidle-ui-button hunt-list-world-tab is-active" aria-current="page">Kanto</button><button class="pokeidle-ui-button hunt-list-world-tab">Johto</button><button class="pokeidle-ui-button hunt-list-world-tab" disabled>Ilhas Lendárias</button><button class="pokeidle-ui-button hunt-list-world-tab">Hoenn</button></nav>',
  '<div class="hunt-presentation-toggle" role="group" aria-label="View"><button class="hunt-presentation-toggle__button is-active" aria-pressed="true">MAP</button><button class="hunt-presentation-toggle__button" aria-pressed="false">LIST</button></div>',
  '<div class="hunt-presentation-toggle" role="group" aria-label="Apresentação da caçada"><button class="hunt-presentation-toggle__button is-active" aria-pressed="true">Modo clássico</button><button class="hunt-presentation-toggle__button" aria-pressed="false">Modo plataforma</button></div>',
  '</div>',
  '<div class="hunt-list-world-note">Kanto · hunts dos níveis 1 a 100</div>',
  '<div class="hunt-list-toolbar">',
  '<label class="hunt-list-field hunt-list-search-field"><span>Search</span><input type="search"></label>',
  '<label class="hunt-list-field hunt-list-element-filter"><span>Element</span><select><option value="all">All</option><option value="fire">Fire</option></select></label>',
  '<label class="hunt-list-field hunt-list-sort-field"><span>Sort</span><select><option>Level</option></select></label>',
  '<div class="hunt-list-field hunt-list-range-field"><span>Level</span><div class="hunt-list-range-inputs"><input type="number" min="1" max="100" value="1"><span>–</span><input type="number" min="1" max="100" value="100"></div></div>',
  '<button class="pokeidle-ui-button hunt-list-clear">Clear</button>',
  '</div>',
  '</aside><div class="hunt-selection-content">',
  '<div class="hunt-list-summary"><strong>2 areas</strong><span>EXP note</span></div>',
  '<div class="hunt-world-viewport"><div class="hunt-world-stage">',
  '<button class="hunt-map-marker" data-zone-index="0"><span class="hunt-map-marker__name">Pikachu Lv. 20–30</span></button>',
  '<button class="hunt-map-marker" data-zone-index="1"><span class="hunt-map-marker__name">Abra Lv. 10–15</span></button>',
  '</div><div class="hunt-region-controls"><button class="pokeidle-ui-button">+</button><button class="pokeidle-ui-button">−</button><button class="pokeidle-ui-button">↺</button></div></div>',
  '</div></div>',
].join('');

function setupCurrentList(t,{startHunt,inheritedStartHunt=false,mode='list',legendaryEnabled=false,focusLegendaryBeforeMount=false,favorites=[]}={}){
  const nativeMarkup=mode==='map'?currentMapMarkup():currentListMarkup();
  const markup=legendaryEnabled?nativeMarkup.replace('disabled>Ilhas Lendárias','>Ilhas Lendárias'):nativeMarkup;
  const dom=new JSDOM('<div class="hunt-window"><div class="pokeidle-panel__titlebar"><span class="pokeidle-panel__title" style="font:600 14px/1.2 Arial,sans-serif !important">Hunts</span><button type="button">×</button></div><div class="pokeidle-panel__body">'+markup+'</div></div>',{url:'https://test.local',pretendToBeVisual:true});
  const doc=dom.window.document,root=doc.body.firstChild,body=root.querySelector('.pokeidle-panel__body');
  const zones=[
    {id:'pika',name:'Pikachu Forest',elements:['electric'],min:20,max:30},
    {id:'abra',name:'Abra Cave',elements:['psychic'],min:10,max:15},
  ];
  let starts=0;
  const nativeStartHunt=function(...args){starts++;return startHunt?startHunt.apply(this,args):Promise.resolve('native');};
  const scene={
    _panel:{body},_zones:zones,_selectedIndex:-1,_selectionView:mode,_tab:'kanto',_worlds:[{id:'kanto',label:'Kanto'},{id:'johto',label:'Johto'},{id:'hoenn',label:'Hoenn'}],
    zoneName:zone=>zone.name,zoneElements:zone=>zone.elements,zoneMinMaxLevel:zone=>({min:zone.min,max:zone.max}),
  };
  if(inheritedStartHunt)Object.setPrototypeOf(scene,{startHunt:nativeStartHunt});
  else Object.defineProperty(scene,'startHunt',{configurable:true,enumerable:false,writable:true,value:nativeStartHunt});
  const nativeStartHuntDescriptor=Object.getOwnPropertyDescriptor(scene,'startHunt');
  dom.window.SceneManager={_scene:scene,_nextScene:null};
  dom.window.PokeIdle={Localization:{get:()=> 'pt-BR'}};
  const favoritesStore=createHuntFavoritesStore({storage:()=>dom.window.localStorage});
  favorites.forEach(favorite=>favoritesStore.add(favorite));
  root.querySelectorAll('.hunt-list-hunt-button').forEach((button,index)=>button.addEventListener('click',()=>{scene._selectedIndex=index;void scene.startHunt();}));
  root.querySelectorAll('.hunt-map-marker').forEach((button,index)=>button.addEventListener('click',()=>{scene._selectedIndex=index;void scene.startHunt();}));
  const before=root.outerHTML;
  if(focusLegendaryBeforeMount)root.querySelectorAll('.hunt-list-world-tab')[2]?.focus();
  const c=mountHunts(root,{favoritesStore});
  t.after(()=>{c.cleanup();dom.window.close();});
  return {dom,doc,root,body,scene,c,before,favoritesStore,nativeStartHunt,nativeStartHuntDescriptor,stats:()=>({starts})};
}

test('current Hunt list keeps native controls while Better UI compacts discovery hierarchy',async t=>{
  const s=setupCurrentList(t),current=parts(s.root);
  const css=s.root.querySelector('style[data-ppbui-module="hunts"]').textContent;
  assert.equal(current.mode,'current-list');
  assert.equal(current.toolbar.classList.contains('hunt-list-toolbar'),true);
  assert.equal(current.viewport.classList.contains('hunt-list-table-shell'),true);
  assert.equal(s.root.classList.contains('ppbui-hunts-current-list'),true);
  assert.equal(s.root.querySelector('.pokeidle-panel__title').textContent,'Hunts','current native title remains authoritative');
  assert.equal(s.root.querySelector('.hunt-list-header').classList.contains('ppbui-hunts-atlas-rail'),false);
  assert.equal(s.root.querySelector('[data-ppbui-hunts-list-toolbar]'),null);
  assert.equal(s.root.querySelector('[data-ppbui-hunts-list-surface]'),null);
  assert.deepEqual([...s.root.querySelector('.hunt-list-header').children].map(node=>node.className),[
    'hunt-list-world-tabs','hunt-presentation-toggle ppbui-hunts-view-toggle','hunt-presentation-toggle ppbui-hunts-presentation-toggle'
  ],'native region context flows directly into view and presentation navigation');
  assert.deepEqual([...s.root.querySelector('.hunt-list-toolbar').children].filter(node=>node.nodeType===1).map(node=>node.className),[
    'hunt-list-field hunt-list-search-field','ppbui-hunts-list-utility','ppbui-hunts-list-advanced','ppbui-hunts-favorites'
  ],'Search remains persistent while utility, advanced filters and Favorites get scoped layout owners');
  assert.deepEqual([...s.root.querySelector('.ppbui-hunts-list-utility').children].map(node=>node.className),[
    'ppbui-hunts-filter-toggle','hunt-list-field hunt-list-sort-field','pokeidle-ui-button hunt-list-clear'
  ],'Filters, Sort and Clear form the compact result utility row');
  assert.deepEqual([...s.root.querySelector('.ppbui-hunts-list-advanced').children].map(node=>node.className),[
    'hunt-list-field hunt-list-element-filter','hunt-list-field hunt-list-range-field'
  ],'Element and Level remain the original native controls inside advanced refinement');
  assert.equal(s.root.querySelector('.ppbui-hunts-list-advanced').hidden,true,'advanced filters start collapsed');
  assert.equal(s.root.querySelector('.ppbui-hunts-favorites__heading strong').textContent,'Favoritos');
  assert.equal(s.root.querySelector('.ppbui-hunts-favorites__empty').textContent,'Nenhum favorito ainda.');
  assert.equal(s.root.querySelectorAll('[data-ppbui-hunt-favorite-toggle]').length,2,'LIST exposes one favorite toggle per authoritative Hunt row');
  assert.equal(s.root.querySelector('.hunt-list-summary').contains(s.root.querySelector('.hunt-list-world-note')),true,'native region context is folded into result summary instead of occupying a standalone pre-filter row');
  const regionTabs=[...s.root.querySelectorAll('.hunt-list-world-tab')],legendary=s.root.querySelector('.ppbui-hunts-region-legendary');
  assert.deepEqual(regionTabs.map(tab=>tab.textContent),['Kanto','Johto','Hoenn','Ilhas Lendárias'],'mounted keyboard/visual order groups common Hunt regions before the special destination');
  assert.deepEqual(regionTabs.filter(tab=>tab.classList.contains('ppbui-hunts-region-common')).map(tab=>tab.textContent),['Kanto','Johto','Hoenn'],'ordinary Hunt regions share one visual role');
  assert.equal(legendary.textContent,'Ilhas Lendárias');
  assert.equal(legendary.classList.contains('ppbui-hunts-region-legendary'),true,'legendary islands have a dedicated special-destination role');
  assert.equal(legendary.dataset.ppbuiRegionNote,'FIM DE SEMANA','special destination exposes its temporal availability context');
  assert.equal(legendary.getAttribute('aria-description'),'Disponível nos fins de semana','weekend availability is exposed beyond generated visual content');
  assert.equal(legendary.disabled,true,'native unavailable-region state is preserved');
  assert.equal(s.root.querySelector('.ppbui-hunts-gym'),null,'Hunts no longer injects a Gym destination');
  assert.match(css,/\.ppbui-hunts-current \.hunt-selection-shell \{[^}]*grid-template-columns:minmax\(220px,280px\) minmax\(0,1fr\)/s,'current MAP/LIST share one explicit sidebar/workspace composition');
  assert.match(css,/\.ppbui-hunts-current \.hunt-selection-sidebar \{[^}]*border:var\(--ppbui-border-width\) solid var\(--ppbui-border\) !important;[^}]*background:var\(--ppbui-bg-1\) !important;/s,'discovery controls read as one bounded current-selector surface');
  assert.match(css,/\.ppbui-hunts-current \.hunt-list-header \{[\s\S]*display:grid !important;/,'current MAP/LIST share one explicit navigation stack');
  assert.match(css,/\.ppbui-hunts-current \.hunt-list-world-tabs \{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/s,'ordinary Hunt regions use one equal three-column rail');
  assert.match(css,/\.ppbui-hunts-current \.hunt-list-world-tab\.ppbui-hunts-region-legendary \{[^}]*grid-column:1 \/ -1;[^}]*min-height:calc\(var\(--ppbui-control-height\) \+ 8px\);[^}]*box-shadow:inset 2px 0 0 var\(--ppbui-accent\)/s,'legendary islands span the region rail with stronger special-destination weight');
  assert.match(css,/\.ppbui-hunts-current \.hunt-list-world-tab\.ppbui-hunts-region-legendary \{[^}]*grid-template-columns:minmax\(0,1fr\) auto;[^}]*text-align:center;/s,'legendary islands name is centered in its primary label area while the weekend note keeps a dedicated trailing column');
  assert.match(css,/\.ppbui-hunts-current \.hunt-list-world-tab\.ppbui-hunts-region-legendary::after \{[^}]*content:attr\(data-ppbui-region-note\)/s,'legendary islands render the localized weekend note without changing native button text');
  assert.match(css,/\.ppbui-hunts-current \.hunt-list-world-tab\.ppbui-hunts-region-legendary:disabled \{[^}]*opacity:1;/s,'closed legendary islands retain their special visual hierarchy');
  assert.match(css,/\.ppbui-hunts-current \.ppbui-hunts-view-toggle \{[\s\S]*width:100%;/,'MAP/LIST owns the available header width');
  assert.match(css,/\.ppbui-hunts-current \.ppbui-hunts-view-toggle \.hunt-presentation-toggle__button \{[\s\S]*min-height:calc\(var\(--ppbui-control-height\) \+ 8px\)/,'MAP/LIST receives the strongest segmented-control geometry');
  assert.match(css,/\.hunt-list-toolbar\.ppbui-hunts-list-refined \{[\s\S]*display:grid !important;/,'approved compact current-list toolbar owns the refined composition');
  assert.match(css,/@container \(max-width:620px\)[\s\S]*\.ppbui-hunts-current \.hunt-list-world-tabs \{ grid-template-columns:repeat\(3,minmax\(0,1fr\)\); \}/,'narrow current region navigation preserves the three common-region peers in one row');
  assert.match(css,/\.ppbui-hunts-current \.hunt-list-world-tab\.is-active,[\s\S]*color:var\(--ppbui-selected\)/,'world navigation retains selected/current emphasis');
  assert.match(css,/\.ppbui-hunts-current \.ppbui-hunts-presentation-toggle \.hunt-presentation-toggle__button\.is-active,[\s\S]*color:var\(--ppbui-text\)/,'presentation mode stays subordinate to MAP/LIST');
  assert.match(css,/\.ppbui-hunts-current \.hunt-list-summary \{[^}]*border:var\(--ppbui-border-width\) solid var\(--ppbui-border-strong\) !important;[^}]*border-bottom:0 !important;/s,'summary is an attached workspace rail instead of detached copy');
  assert.match(css,/\.ppbui-hunts-current-map \.hunt-world-viewport,[\s\S]*\.ppbui-hunts-current-list \.hunt-list-table-shell \{[^}]*border:var\(--ppbui-border-width\) solid var\(--ppbui-border-strong\) !important;[^}]*border-radius:0 0 var\(--ppbui-radius\) var\(--ppbui-radius\) !important;/s,'MAP and LIST content surfaces share the same attached workspace frame');
  assert.match(css,/\.ppbui-hunts-current-list \.hunt-list-table th \{[^}]*background:var\(--ppbui-bg-2\) !important;[^}]*color:var\(--ppbui-text-muted\) !important;/s,'LIST table header adopts the same current-selector hierarchy');
  assert.match(css,/\.ppbui-hunts-current-list \.hunt-list-hunt-button \{[^}]*border:var\(--ppbui-border-width\) solid var\(--ppbui-accent\)[^}]*color:var\(--ppbui-accent-hi\)/s,'Hunt is the primary row action');
  assert.match(css,/\.ppbui-hunts-current-list \.hunt-list-details-button \{[^}]*border:var\(--ppbui-border-width\) solid var\(--ppbui-border\)[^}]*background:transparent/s,'Details is visually secondary');
  assert.match(css,/\.ppbui-hunts-current \.hunt-list-clear \{[^}]*background:transparent[^}]*color:var\(--ppbui-text-muted\)/s,'Clear is a tertiary utility');
  assert.match(css,/\.ppbui-hunts-favorites \{[^}]*border-top:var\(--ppbui-separator-width\) solid var\(--ppbui-border\)/s,'Favorites is attached below refinement with one separator instead of another heavy card');
  assert.match(css,/\.ppbui-hunts-favorites__list \{[^}]*max-height:132px;[^}]*overflow-y:auto/s,'Favorites owns a bounded local scroll instead of pushing Hunt results indefinitely');
  assert.match(css,/\.ppbui-hunts-favorite-toggle\[aria-pressed="true"\] \{[^}]*border-color:var\(--ppbui-selected\);[^}]*color:var\(--ppbui-selected\)/s,'favorited row star exposes persistent selected state structurally');
  assert.match(css,/@container \(max-width:360px\)[\s\S]*\.ppbui-hunts-favorites__list \{ max-height:104px; \}/,'narrow selector keeps Favorites shorter so the result workflow remains reachable');
  assert.match(css,/@container \(max-width:780px\)[\s\S]*\.ppbui-hunts-current-list \.hunt-list-table-shell \{ overflow-x:auto; overscroll-behavior-x:contain; \}/,'split Hunt list gets an explicit horizontal scroll owner instead of crushing table columns');
  assert.match(css,/@container \(max-width:780px\)[\s\S]*\.hunt-list-table \{ width:max-content; min-width:100%; \}/,'split Hunt table preserves intrinsic row geometry while still filling wider panes');
  assert.match(css,/@container \(max-width:780px\)[\s\S]*\.hunt-list-action-cell,[\s\S]*\.hunt-list-identity \{ white-space:nowrap; \}/,'Hunt actions and Pokémon identity do not wrap into unusable stacked fragments');
  const button=s.root.querySelector('.hunt-list-hunt-button');
  button.click();
  await Promise.resolve();
  assert.equal(s.stats().starts,1,'native Hunt start is delegated exactly once');
  assert.equal(s.scene._selectedIndex,0);
  const snapshot=activeHuntZone(s.dom.window);
  assert.equal(snapshot.zoneId,'pika');
  assert.equal(snapshot.sprite,'/native-hunt/pikachu.png');
  assert.equal(snapshot.marker,zoneNode(s.root,0));
});

test('current MAP uses the same Better UI region hierarchy and filters as LIST',t=>{
  const s=setupCurrentList(t,{mode:'map'}),current=parts(s.root);
  const css=s.root.querySelector('style[data-ppbui-module="hunts"]').textContent;
  assert.equal(current.mode,'current-map');
  assert.equal(current.viewport.classList.contains('hunt-world-viewport'),true);
  assert.equal(s.root.classList.contains('ppbui-hunts-current'),true);
  assert.equal(s.root.classList.contains('ppbui-hunts-current-map'),true);
  assert.equal(s.root.classList.contains('ppbui-hunts-current-list'),false);
  assert.equal(s.root.querySelector('.ppbui-hunts-gym'),null,'GYMS is absent from MAP');
  assert.equal(s.root.querySelectorAll('.ppbui-hunts-region-common').length,3);
  assert.equal(s.root.querySelector('.ppbui-hunts-region-legendary')?.dataset.ppbuiRegionNote,'FIM DE SEMANA');
  assert.equal(s.root.querySelector('.ppbui-hunts-view-toggle').textContent,'MAPLIST');
  assert.equal(s.root.querySelector('.ppbui-hunts-presentation-toggle').textContent,'Modo clássicoModo plataforma');
  assert.ok(s.root.querySelector('.ppbui-hunts-filter-toggle'));
  assert.equal(s.root.querySelector('.ppbui-hunts-list-advanced').hidden,true);
  assert.ok(s.root.querySelector('[data-ppbui-hunt-favorites]'),'Favorites stays available in MAP');
  assert.equal(s.root.querySelector('[data-ppbui-hunt-favorite-toggle]'),null,'MAP does not fabricate row-star controls without LIST rows');
  assert.equal(s.root.querySelector('.hunt-list-summary').contains(s.root.querySelector('.hunt-list-world-note')),true);
  assert.match(css,/\.ppbui-hunts-current-map \.hunt-region-controls \{[\s\S]*position:absolute;[\s\S]*background:var\(--ppbui-bg-0\) !important;/,'MAP-only navigation receives scoped Better UI overlay chrome');
  assert.match(css,/\.ppbui-hunts-current-map \.hunt-region-controls > button \{[\s\S]*min-width:34px;[\s\S]*min-height:34px;/,'MAP zoom/reset actions have deliberate current-selector geometry');
  assert.match(css,/\.ppbui-hunts-current-map \.hunt-region-controls > button \+ button \{[^}]*border-left:var\(--ppbui-separator-width\) solid var\(--ppbui-border-strong\) !important;/s,'MAP zoom/reset actions read as one compact segmented overlay');
  assert.match(css,/@container \(max-width:620px\)[\s\S]*\.ppbui-hunts-current \.hunt-selection-shell \{[\s\S]*grid-template-columns:minmax\(0,1fr\) !important;/,'narrow current MAP and LIST collapse to the same one-column shell');
  assert.match(css,/@container \(max-width:620px\)[\s\S]*\.ppbui-hunts-current-map \.hunt-world-viewport \{ min-height:300px; \}/,'narrow current MAP releases the desktop atlas minimum so the workspace remains reachable at the 249×712 target');
  s.c.cleanup();assert.equal(s.root.outerHTML,s.before,'MAP cleanup restores the exact native current-selector DOM');
});

test('current MAP to LIST reconstruction reapplies region hierarchy without adding navigation controls',t=>{
  const s=setupCurrentList(t,{mode:'map'}),filter=s.root.querySelector('.ppbui-hunts-filter-toggle');
  filter.click();assert.equal(filter.getAttribute('aria-expanded'),'true');
  s.scene._selectionView='list';s.body.innerHTML=currentListMarkup();s.c.sync();
  assert.equal(parts(s.root).mode,'current-list');
  assert.equal(s.root.classList.contains('ppbui-hunts-current-map'),false);
  assert.equal(s.root.classList.contains('ppbui-hunts-current-list'),true);
  assert.equal(s.root.querySelector('.ppbui-hunts-gym'),null);
  assert.equal(s.root.querySelectorAll('.ppbui-hunts-region-common').length,3);
  assert.equal(s.root.querySelectorAll('.ppbui-hunts-region-legendary').length,1);
  assert.equal(s.root.querySelector('.ppbui-hunts-region-legendary')?.dataset.ppbuiRegionNote,'FIM DE SEMANA');
  assert.equal(s.root.querySelector('.ppbui-hunts-filter-toggle'),filter,'the same disclosure survives MAP→LIST');
  assert.equal(filter.getAttribute('aria-expanded'),'true');
  assert.equal(s.root.querySelector('.ppbui-hunts-list-advanced').hidden,false);
  assert.equal(s.root.querySelectorAll('.ppbui-hunts-view-toggle').length,1);
  assert.equal(s.root.querySelectorAll('.ppbui-hunts-presentation-toggle').length,1);
  assert.notEqual(s.root.querySelector('.ppbui-hunts-view-toggle'),s.root.querySelector('.ppbui-hunts-presentation-toggle'));
});

test('current MAP to LIST reconstruction restores equivalent region focus after native body replacement',t=>{
  const s=setupCurrentList(t,{mode:'map'}),before=s.root.querySelector('.ppbui-hunts-region-legendary');
  before.disabled=false;before.focus();assert.equal(s.doc.activeElement,before);
  s.scene._selectionView='list';s.body.innerHTML=currentListMarkup().replace('disabled>Ilhas Lendárias','>Ilhas Lendárias');s.c.sync();
  const after=s.root.querySelector('.ppbui-hunts-region-legendary');
  assert.notEqual(after,before,'native reconstruction provides a fresh region button');
  assert.equal(s.doc.activeElement,after,'logical Legendary focus follows the reacquired native button');
});

test('current mount preserves focus when the enabled native Legendary button is moved into its special row',t=>{
  const s=setupCurrentList(t,{legendaryEnabled:true,focusLegendaryBeforeMount:true}),legendary=s.root.querySelector('.ppbui-hunts-region-legendary');
  assert.equal(s.doc.activeElement,legendary,'initial hierarchy decoration keeps focus on the exact native Legendary button');
  assert.equal(legendary.parentElement?.lastElementChild,legendary,'the focused native button still moves after the common regions');
});

test('current cleanup preserves focus on the same surviving native region button while restoring native order',t=>{
  const s=setupCurrentList(t),legendary=s.root.querySelector('.ppbui-hunts-region-legendary');
  legendary.disabled=false;legendary.focus();assert.equal(s.doc.activeElement,legendary);
  s.c.cleanup();
  assert.equal(s.doc.activeElement,legendary,'cleanup refocuses the same native node after restoring its position');
  assert.deepEqual([...s.root.querySelectorAll('.hunt-list-world-tab')].map(tab=>tab.textContent),['Kanto','Johto','Ilhas Lendárias','Hoenn']);
});

test('current reconstruction never steals an intentional focus move outside Hunts',t=>{
  const s=setupCurrentList(t,{mode:'map'}),johto=[...s.root.querySelectorAll('.hunt-list-world-tab')].find(tab=>tab.textContent==='Johto');
  const external=s.doc.createElement('button');external.textContent='External';s.doc.body.append(external);
  johto.focus();assert.equal(s.doc.activeElement,johto);
  s.body.innerHTML=currentListMarkup();external.focus();assert.equal(s.doc.activeElement,external);
  s.scene._selectionView='list';s.c.sync();
  assert.equal(s.doc.activeElement,external,'reconciliation respects a newer explicit focus target');
});

test('current Hunt list advanced filters preserve native controls, active state and focus',t=>{
  const s=setupCurrentList(t),toggle=s.root.querySelector('.ppbui-hunts-filter-toggle'),advanced=s.root.querySelector('.ppbui-hunts-list-advanced');
  const element=s.root.querySelector('.hunt-list-element-filter select'),levels=[...s.root.querySelectorAll('.hunt-list-range-inputs input')],clear=s.root.querySelector('.hunt-list-clear');
  assert.ok(toggle);assert.equal(toggle.textContent,'Filtros');assert.equal(toggle.getAttribute('aria-expanded'),'false');
  assert.equal(toggle.getAttribute('aria-controls'),advanced.id);assert.equal(toggle.dataset.active,'false');
  assert.equal(levels[0].getAttribute('aria-label'),'Nível mínimo');assert.equal(levels[1].getAttribute('aria-label'),'Nível máximo');
  assert.equal(clear.parentElement.classList.contains('ppbui-hunts-list-utility'),true,'Clear stays reachable while advanced filters are collapsed');

  element.selectedIndex=1;element.dispatchEvent(new s.dom.window.Event('change',{bubbles:true}));
  assert.equal(toggle.dataset.active,'true');assert.equal(toggle.getAttribute('aria-label'),'Filtros ativos');
  toggle.click();assert.equal(toggle.getAttribute('aria-expanded'),'true');assert.equal(advanced.hidden,false);
  levels[0].focus();toggle.click();
  assert.equal(toggle.getAttribute('aria-expanded'),'false');assert.equal(advanced.hidden,true);assert.equal(s.doc.activeElement,toggle,'collapsing focused advanced controls returns focus to the disclosure trigger');

  element.selectedIndex=0;element.dispatchEvent(new s.dom.window.Event('change',{bubbles:true}));
  assert.equal(toggle.dataset.active,'false');assert.equal(toggle.getAttribute('aria-label'),'Filtros');
});

test('current Hunt favorites add and remove exact native Hunts without touching Hunt or Details actions',t=>{
  const s=setupCurrentList(t),first=s.root.querySelector('.hunt-list-row'),hunt=first.querySelector('.hunt-list-hunt-button'),details=first.querySelector('.hunt-list-details-button'),favorite=first.querySelector('[data-ppbui-hunt-favorite-toggle]');
  assert.equal(favorite.textContent,'☆');assert.equal(favorite.getAttribute('aria-pressed'),'false');
  assert.match(favorite.getAttribute('aria-label'),/^Adicionar aos favoritos:/);
  favorite.click();
  assert.equal(s.stats().starts,0,'favoriting is selection-only and never starts gameplay');
  assert.equal(first.querySelector('.hunt-list-hunt-button'),hunt);assert.equal(first.querySelector('.hunt-list-details-button'),details);
  assert.equal(favorite.textContent,'★');assert.equal(favorite.getAttribute('aria-pressed'),'true');
  const stored=JSON.parse(s.dom.window.localStorage.getItem(HUNT_FAVORITES_STORAGE_KEY));
  assert.deepEqual(stored.items.map(item=>[item.worldId,item.zoneId,item.label]),[['kanto','pika','Pikachu Forest']]);
  const go=s.root.querySelector('[data-ppbui-hunt-favorite-go]');
  assert.match(go.textContent,/Pikachu Forest/);assert.match(go.textContent,/Kanto/);
  const remove=s.root.querySelector('[data-ppbui-hunt-favorite-remove]');remove.click();
  assert.equal(s.favoritesStore.list().length,0);assert.equal(favorite.textContent,'☆');assert.equal(favorite.getAttribute('aria-pressed'),'false');
  assert.equal(s.root.querySelector('.ppbui-hunts-favorites__empty').textContent,'Nenhum favorito ainda.');
});

test('removing a favorite from its list restores focus to the matching LIST star when available',async t=>{
  const s=setupCurrentList(t),star=s.root.querySelector('[data-ppbui-hunt-favorite-toggle]');star.click();
  const remove=s.root.querySelector('[data-ppbui-hunt-favorite-remove]');remove.focus();assert.equal(s.doc.activeElement,remove);remove.click();await Promise.resolve();
  assert.equal(s.doc.activeElement,star,'destructive local removal returns keyboard focus to the same Hunt toggle');
  assert.equal(star.getAttribute('aria-pressed'),'false');
});

test('current Hunt favorite starts the exact native zone once even when current filters hide its row',async t=>{
  const s=setupCurrentList(t),favorite=s.root.querySelector('[data-ppbui-hunt-favorite-toggle]');favorite.click();
  const row=favorite.closest('.hunt-list-row');row.hidden=true;
  const go=s.root.querySelector('[data-ppbui-hunt-favorite-go]');go.focus();assert.equal(s.doc.activeElement,go);go.click();
  await Promise.resolve();await Promise.resolve();
  assert.equal(s.stats().starts,1,'explicit favorite shortcut delegates the existing native start exactly once');
  assert.equal(s.scene._selectedIndex,0,'favorite reacquires the authoritative zone index instead of a filtered DOM index');
  assert.equal(activeHuntZone(s.dom.window)?.zoneId,'pika','existing startHunt wrapper preserves Cards Hunt provenance');
  assert.equal(s.doc.activeElement,favorite,'starting a focused favorite never drops keyboard focus to the document body');
});

test('cross-region favorite clicks the native region tab first and starts only after the saved zone is authoritative',async t=>{
  const saved={worldId:'johto',regionKey:'johto',worldLabel:'Johto',zoneId:'chiko',label:'Chikorita'};
  const s=setupCurrentList(t,{favorites:[saved]}),johto=[...s.root.querySelectorAll('.hunt-list-world-tab')].find(tab=>tab.textContent==='Johto');
  let regionClicks=0;
  johto.addEventListener('click',()=>{
    regionClicks++;
    s.scene._tab='johto';s.scene._zones=[{id:'chiko',name:'Chikorita',elements:['grass'],min:101,max:101}];
    for(const tab of s.root.querySelectorAll('.hunt-list-world-tab'))tab.classList.toggle('is-active',tab===johto);
  });
  s.root.querySelector('[data-ppbui-hunt-favorite-go]').click();
  assert.match(s.root.querySelector('.ppbui-hunts-favorites__status').textContent,/abrindo/i,'cross-region navigation announces progress immediately');
  assert.equal(s.root.querySelector('[data-ppbui-hunt-favorites]').getAttribute('aria-busy'),'true');
  await Promise.resolve();await Promise.resolve();
  assert.equal(regionClicks,1,'cross-region navigation delegates to the exact native world control once');
  assert.equal(s.scene._tab,'johto');assert.equal(s.scene._selectedIndex,0);assert.equal(s.stats().starts,1,'Hunt starts only after the Johto zone exists in native state');
});

test('cross-region favorite never trusts selected-tab chrome ahead of authoritative scene world',async t=>{
  const saved={worldId:'johto',regionKey:'johto',worldLabel:'Johto',zoneId:'shared-zone',label:'Target Johto'};
  const s=setupCurrentList(t,{favorites:[saved]}),johto=[...s.root.querySelectorAll('.hunt-list-world-tab')].find(tab=>tab.textContent==='Johto');
  s.scene._zones=[{id:'shared-zone',name:'Wrong Kanto Twin',elements:[],min:1,max:1}];
  johto.addEventListener('click',()=>{
    for(const tab of s.root.querySelectorAll('.hunt-list-world-tab'))tab.classList.toggle('is-active',tab===johto);
    // Simulate host chrome moving first while the authoritative scene is still Kanto.
  });
  s.root.querySelector('[data-ppbui-hunt-favorite-go]').click();
  await Promise.resolve();await Promise.resolve();
  assert.equal(s.scene._tab,'kanto');assert.equal(s.stats().starts,0,'matching zoneId in the old world cannot be started while scene._tab disagrees');
  assert.equal(s.scene._selectedIndex,-1);
});

test('favorite shortcut fails closed when its region is disabled or the saved zone disappeared',async t=>{
  const legendary={worldId:'legendary',regionKey:'legendary',worldLabel:'Ilhas Lendárias',zoneId:'mew',label:'Mew'};
  const s=setupCurrentList(t,{favorites:[legendary]});
  s.root.querySelector('[data-ppbui-hunt-favorite-go]').click();await Promise.resolve();
  assert.equal(s.stats().starts,0);assert.match(s.root.querySelector('.ppbui-hunts-favorites__status').textContent,/indisponível/i);
  s.favoritesStore.remove(legendary);s.favoritesStore.add({worldId:'kanto',regionKey:'kanto',worldLabel:'Kanto',zoneId:'missing',label:'MissingNo'});
  s.root.querySelector('[data-ppbui-hunt-favorite-go]').click();await Promise.resolve();
  assert.equal(s.stats().starts,0,'missing zone IDs can never fall back to another native index');
  assert.equal(s.scene._selectedIndex,-1);
});

test('Favorites surface survives MAP/LIST reconstruction and reacquires LIST stars without duplication',t=>{
  const s=setupCurrentList(t),star=s.root.querySelector('[data-ppbui-hunt-favorite-toggle]');star.click();
  const surface=s.root.querySelector('[data-ppbui-hunt-favorites]');
  s.scene._selectionView='map';s.body.innerHTML=currentMapMarkup();s.c.sync();
  assert.equal(s.root.querySelector('[data-ppbui-hunt-favorites]'),surface,'same Better UI favorites surface is rehomed over native MAP reconstruction');
  assert.equal(surface.querySelectorAll('[data-ppbui-hunt-favorite-go]').length,1);assert.equal(s.root.querySelector('[data-ppbui-hunt-favorite-toggle]'),null);
  s.scene._selectionView='list';s.body.innerHTML=currentListMarkup();s.c.sync();
  assert.equal(s.root.querySelector('[data-ppbui-hunt-favorites]'),surface);
  assert.equal(s.root.querySelectorAll('[data-ppbui-hunt-favorite-toggle]').length,2);
  assert.equal(s.root.querySelector('[data-ppbui-hunt-favorite-toggle]').getAttribute('aria-pressed'),'true','reacquired exact Hunt restores its favorite state');
});

test('Hunt Favorites survive a fresh module mount from the versioned persistent store',t=>{
  const s=setupCurrentList(t),star=s.root.querySelector('[data-ppbui-hunt-favorite-toggle]');star.click();
  assert.equal(s.favoritesStore.list().length,1);s.c.cleanup();assert.equal(s.root.outerHTML,s.before);
  const freshStore=createHuntFavoritesStore({storage:()=>s.dom.window.localStorage}),next=mountHunts(s.root,{favoritesStore:freshStore});
  t.after(()=>next.cleanup());
  assert.equal(freshStore.list().length,1);assert.equal(s.root.querySelectorAll('[data-ppbui-hunt-favorites]').length,1);
  assert.equal(s.root.querySelector('[data-ppbui-hunt-favorite-toggle]').getAttribute('aria-pressed'),'true');
  assert.match(s.root.querySelector('[data-ppbui-hunt-favorite-go]').textContent,/Pikachu Forest/);
});

test('current Hunt list stable reconciliation is mutation-free and cleanup restores exact native structure',async t=>{
  const s=setupCurrentList(t);let mutations=0;const observer=new s.dom.window.MutationObserver(records=>mutations+=records.length);
  observer.observe(s.root,{subtree:true,childList:true,attributes:true});
  for(let i=0;i<5;i++)s.c.sync();await Promise.resolve();observer.disconnect();
  assert.equal(mutations,0);
  s.c.cleanup();assert.equal(s.root.outerHTML,s.before);
});

test('current Hunt list reacquires native controls after body reconstruction without duplicate refinement surfaces',t=>{
  const s=setupCurrentList(t),oldToggle=s.root.querySelector('.ppbui-hunts-filter-toggle');
  oldToggle.click();assert.equal(s.root.querySelector('.ppbui-hunts-list-advanced').hidden,false);
  s.body.innerHTML=currentListMarkup();s.c.sync();
  const toggle=s.root.querySelector('.ppbui-hunts-filter-toggle'),advanced=s.root.querySelector('.ppbui-hunts-list-advanced');
  assert.equal(toggle,oldToggle,'the same Better UI disclosure is rehomed over reconstructed native controls');
  assert.equal(s.root.querySelectorAll('.ppbui-hunts-filter-toggle').length,1);
  assert.equal(s.root.querySelectorAll('.ppbui-hunts-list-utility').length,1);
  assert.equal(s.root.querySelectorAll('.ppbui-hunts-list-advanced').length,1);
  assert.equal(toggle.getAttribute('aria-expanded'),'true');assert.equal(advanced.hidden,false,'user disclosure state survives native reconstruction');
  assert.equal(s.root.querySelector('.hunt-list-summary').contains(s.root.querySelector('.hunt-list-world-note')),true);
  s.c.cleanup();assert.equal(s.root.outerHTML,s.before);
});

test('current Hunt list satisfies the module mount gate after upstream selector drift',t=>{
  const s=setupCurrentList(t),previous=Object.getOwnPropertyDescriptor(globalThis,'document');
  Object.defineProperty(globalThis,'document',{configurable:true,value:s.doc});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;});
  assert.equal(createHuntsModule().shouldMount(),true);
});

test('current Hunt MAP satisfies the same module mount gate as LIST',t=>{
  const s=setupCurrentList(t,{mode:'map'}),previous=Object.getOwnPropertyDescriptor(globalThis,'document');
  Object.defineProperty(globalThis,'document',{configurable:true,value:s.doc});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;});
  assert.equal(parts(s.root).mode,'current-map');
  assert.equal(createHuntsModule().shouldMount(),true,'current MAP is not mistaken for the removed legacy map structure');
});

test('current Hunt list captures a rendered native canvas without synthesizing a URL',t=>{
  const s=setupCurrentList(t),canvas=s.root.querySelectorAll('.hunt-list-sprite')[1];
  const pixels=new Uint8ClampedArray(16);pixels[3]=255;
  canvas.getContext=()=>({getImageData:()=>({data:pixels})});
  canvas.toDataURL=()=> 'data:image/png;base64,native-canvas';
  const snapshot=rememberActiveHuntZone(s.root,1);
  assert.equal(snapshot.sprite,'data:image/png;base64,native-canvas');
});

test('current Hunt list target art capture is fail-closed for a blank native canvas',t=>{
  const s=setupCurrentList(t),canvas=s.root.querySelectorAll('.hunt-list-sprite')[1];
  canvas.getContext=()=>({getImageData:()=>({data:new Uint8ClampedArray(16)})});
  canvas.toDataURL=()=> 'data:image/png;base64,transparent-but-nonempty-string';
  const snapshot=rememberActiveHuntZone(s.root,1);
  assert.equal(snapshot.zoneId,'abra');
  assert.equal(snapshot.sprite,'','blank native canvas must not become remembered target art');
});

test('current Hunt list rejected native start clears its remembered snapshot',async t=>{
  const s=setupCurrentList(t,{startHunt:()=>Promise.reject(new Error('blocked'))});
  s.scene._selectedIndex=0;
  await assert.rejects(()=>s.scene.startHunt(),/blocked/);
  assert.equal(s.stats().starts,1);
  assert.equal(activeHuntZone(s.dom.window),null);
});

test('current Hunt list cleanup restores native DOM and original startHunt',t=>{
  const s=setupCurrentList(t),wrapped=s.scene.startHunt;
  assert.notEqual(s.root.outerHTML,s.before);
  s.c.cleanup();
  assert.notEqual(s.scene.startHunt,wrapped);
  assert.equal(s.scene.startHunt,s.nativeStartHunt);
  assert.deepEqual(Object.getOwnPropertyDescriptor(s.scene,'startHunt'),s.nativeStartHuntDescriptor,'cleanup restores the exact native own-property descriptor');
  assert.equal(s.root.outerHTML,s.before);
});

test('current Hunt list cleanup deletes the wrapper when native startHunt was inherited',async t=>{
  const s=setupCurrentList(t,{inheritedStartHunt:true}),wrapped=s.scene.startHunt;
  assert.equal(Object.prototype.hasOwnProperty.call(s.scene,'startHunt'),true,'mount creates only the temporary instance wrapper');
  s.c.cleanup();
  assert.equal(Object.prototype.hasOwnProperty.call(s.scene,'startHunt'),false,'cleanup restores prototype ownership instead of leaving an own property');
  assert.equal(s.scene.startHunt,s.nativeStartHunt);
  s.scene._selectedIndex=0;
  await wrapped.call(s.scene);
  assert.equal(s.stats().starts,1,'a stale captured wrapper still delegates the native action exactly once');
  assert.equal(activeHuntZone(s.dom.window),null,'a stale captured wrapper is inert after cleanup and cannot remember Hunt art');
});

test('current Hunt list cleanup preserves a later foreign wrapper and makes its captured PPBUI wrapper inert',async t=>{
  const s=setupCurrentList(t),captured=s.scene.startHunt;
  const foreign=function(...args){return captured.apply(this,args);};
  s.scene.startHunt=foreign;
  s.c.cleanup();
  assert.equal(s.scene.startHunt,foreign,'cleanup must not clobber a wrapper installed after PPBUI');
  s.scene._selectedIndex=1;
  await s.scene.startHunt('foreign');
  assert.equal(s.stats().starts,1,'foreign composition still reaches the native action exactly once');
  assert.equal(activeHuntZone(s.dom.window),null,'captured PPBUI wrapper has no post-cleanup state side effects');
});

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
  const activeZone=activeHuntZone(s.dom.window);
  assert.equal(activeZone.zoneId,'pika');
  assert.equal(activeZone.name,'Pikachu');
  assert.equal(activeZone.sprite,'/native-hunt/pikachu.png');
  assert.equal(activeZone.marker,marker);
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

test('legacy Hunt map does not add a Gym destination',t=>{
  const s=setup(t),header=s.root.querySelector('.hunt-world-header-actions');
  assert.equal(s.root.querySelector('.ppbui-hunts-gym'),null);
  assert.equal(header.firstElementChild?.classList.contains('hunt-world-zoom'),true,'native map utilities keep their original leading position');
  assert.equal(s.stats().starts,0);
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
  const title=s.root.querySelector('.pokeidle-panel__title');
  assert.equal(title.textContent,'HUNT ATLAS');
  assert.equal(title.classList.contains('ppbui-hunts-title'),true);
  assert.equal(title.style.getPropertyValue('font-family'),'var(--ppbui-font-display)');
  assert.equal(title.style.getPropertyValue('font-size'),'15px');
  assert.match(css,/--ppbui-bg-1/);assert.match(css,/--ppbui-accent/);assert.match(css,/--ppbui-focus/);
  assert.ok(s.root.querySelector('.hunt-world-header').classList.contains('ppbui-hunts-atlas-rail'));
  assert.match(css,/\.ppbui-hunts-enhanced\s*\{[^}]+border:var\(--ppbui-border-width\) solid var\(--ppbui-border-strong\)[^}]+box-shadow:var\(--ppbui-shadow-raised\)/s);
  assert.match(css,/\.ppbui-hunts-enhanced \.pokeidle-panel__titlebar\s*\{[^}]+border-radius:var\(--ppbui-radius\) !important;[^}]+background:var\(--ppbui-bg-2\) !important;/s);
  assert.match(css,/\.ppbui-hunts-enhanced \.ppbui-hunts-title\s*\{[^}]+font-family:var\(--ppbui-font-display\) !important;[^}]+font-size:15px !important;[^}]+font-weight:500 !important;[^}]+line-height:1\.2 !important;[^}]+letter-spacing:normal !important;[^}]+text-shadow:none !important/s);
  assert.match(css,/\.ppbui-hunts-enhanced \.pokeidle-panel__titlebar button\s*\{/);
  assert.match(css,/\.ppbui-hunts-enhanced \.pokeidle-panel__titlebar button\s*\{[^}]+appearance:none/s);
  assert.match(css,/\.ppbui-hunts-enhanced \.pokeidle-panel__titlebar button\s*\{[^}]+font-family:var\(--ppbui-font-body\) !important;[^}]+letter-spacing:normal;[^}]+text-shadow:none;/s);
  assert.ok(s.root.querySelector('.ppbui-hunts-finder'));
  assert.ok(s.root.querySelector('.ppbui-hunts-atlas-workspace'));
  assert.match(css,/\.ppbui-hunts-atlas-workspace\.is-inspector-open/);
  assert.match(css,/@container \(max-width:780px\)/);
  assert.match(css,/@media \(pointer:coarse\)/);
  assert.match(css,/button:disabled[^}]+color:var\(--ppbui-text-subtle\)/s);
  assert.match(css,/\.hunt-category-tab\.is-active[^{]*\{[^}]+color:var\(--ppbui-selected\)/s);
  assert.match(css,/\.hunt-category-tab:hover:not\(:disabled\):not\(\.is-active\):not\(\[aria-selected="true"\]\)/);
  assert.match(css,/\.hunt-world-elements button:hover:not\(:disabled\):not\(\.is-active\):not\(\[aria-pressed="true"\]\)/);
  assert.match(css,/hunt-presentation-toggle button:hover:not\(:disabled\):not\(\.is-active\):not\(\[aria-pressed="true"\]\)/);
  assert.match(css,/\.hunt-map-marker__name\s*\{[^}]+--ppbui-hunt-location-rail:transparent/s);
  assert.match(css,/\.hunt-map-marker,[\s\S]*\.hunt-map-marker:active\s*\{[^}]+border:0 !important;[^}]+background:transparent !important;[^}]+background-image:none !important;[^}]+box-shadow:none !important;/s,"Pokémon map sprites stay free of opaque card plates");
  assert.doesNotMatch(css,/\.hunt-map-marker,[\s\S]*\.hunt-map-marker:active\s*\{[^}]*(?:margin|padding|transform|filter):/s,"sprite-first marker styling must not overwrite native map geometry/zoom compensation");
  assert.match(css,/\.hunt-map-marker::before,[\s\S]*\.hunt-map-marker::after\s*\{[^}]*display:none !important;[^}]*content:none !important;/s,"native/decorative hover plates cannot reappear behind the Pokémon sprite");
  assert.match(css,/\.hunt-map-marker:hover > \.hunt-map-marker__sprite\s*\{[^}]*drop-shadow\(0 0 2px var\(--ppbui-accent-hi\)\)/s,"hover emphasis belongs to the sprite rather than an opaque backing tile");
  assert.match(css,/\.hunt-map-marker__name\s*\{[^}]+padding:1px var\(--ppbui-space-2\) !important;[^}]+background:var\(--ppbui-bg-0\) !important;[^}]+box-shadow:none!important/s,"marker state belongs to a flat compact caption rather than pixel-depth chrome");
  assert.match(css,/\.hunt-map-marker:hover \.hunt-map-marker__name:not\(\.ppbui-hunts-selected\)/);
  assert.doesNotMatch(css,/\.hunt-map-marker:hover \.hunt-map-marker__name\s*\{/);
  assert.match(css,/\.hunt-map-marker:active \.hunt-map-marker__name/);
  assert.match(css,/\.hunt-map-marker__name\.ppbui-hunts-located\s*\{[^}]+--ppbui-hunt-location-rail:var\(--ppbui-info\)[^}]+border-bottom-color:var\(--ppbui-info\) !important/s);
  assert.match(css,/\.hunt-map-marker__name\.ppbui-hunts-selected\.ppbui-hunts-located/);
  assert.match(css,/\.hunt-map-marker:focus-visible \.hunt-map-marker__name\s*\{[^}]+outline:var\(--ppbui-focus-width\) solid var\(--ppbui-focus\)/s);
  assert.match(css,/\.hunt-map-marker\.ppbui-hunts-dimmed-marker > \.hunt-map-marker__sprite\s*\{\s*opacity:\.10 !important;/);
  assert.match(css,/\.hunt-map-marker\.ppbui-hunts-located-marker > \.hunt-map-marker__sprite\s*\{\s*opacity:1 !important;/);
  assert.match(css,/\.hunt-map-marker__name\.ppbui-hunts-dimmed\s*\{\s*opacity:\.10/);
  assert.match(css,/\.hunt-map-marker:focus-visible \.hunt-map-marker__name\.ppbui-hunts-dimmed\s*\{\s*opacity:1/);
  assert.match(css,/input\[type="search"\][^}]*\{[^}]+appearance:none/s);
  assert.match(css,/input\[type="number"\][^}]*\{[^}]+appearance:none !important;[^}]+border-radius:var\(--ppbui-radius\) !important;[^}]+clip-path:none !important/s);
  assert.match(css,/input\[type="search"\][^}]*\{[^}]+appearance:none !important;[^}]+border-radius:var\(--ppbui-radius\) !important;[^}]+clip-path:none !important/s);
  assert.match(css,/\.hunt-world-tabs > button,[\s\S]*\.hunt-world-zoom > button\s*\{[^}]+appearance:none/s);
  assert.match(css,/\.hunt-world-toolbar button\s*\{[^}]+appearance:none/s);
  assert.match(css,/\.hunt-world-tabs > button,[\s\S]*\.hunt-world-zoom > button\s*\{[^}]+border-radius:var\(--ppbui-radius\) !important;[^}]+background:var\(--ppbui-bg-1\) !important;[^}]+box-shadow:none !important;/s);
  assert.match(css,/\.hunt-world-header\.ppbui-hunts-atlas-rail\s*\{[^}]+box-sizing:border-box;[^}]+min-height:calc\(var\(--ppbui-control-height\) \+ 2 \* var\(--ppbui-border-width\)\);[^}]+margin:0 !important;[^}]+padding:0 !important;[^}]+gap:0 !important;[^}]+box-shadow:none;/s);
  assert.match(css,/\.hunt-world-tabs\s*\{[^}]+align-items:stretch;[^}]+height:auto !important;[^}]+min-height:var\(--ppbui-control-height\);[^}]+margin:0 !important;[^}]+padding:0 !important;[^}]+gap:0 !important;/s);
  assert.match(css,/\.hunt-world-tabs > button,[\s\S]*\.hunt-category-tab\s*\{[^}]+flex:1 1 0 !important;[^}]+width:auto !important;[^}]+align-self:stretch !important;[^}]+padding:0 var\(--ppbui-control-padding-x\) !important;/s);
  assert.match(css,/\.hunt-world-header-actions\s*\{[^}]+margin:0 !important;[^}]+padding:0 !important;[^}]+gap:0 !important;[^}]+border-left:var\(--ppbui-separator-width\) solid var\(--ppbui-border\)/s);
  assert.match(css,/\.hunt-world-tabs > :last-child \{ border-right:0 !important; \}/);
  assert.match(css,/\.hunt-world-zoom > button:last-child \{ border-right:0 !important; \}/);
  assert.match(css,/@container \(max-width:620px\)[\s\S]*\.hunt-world-header-actions \{[^}]*border-left:0;[^}]*border-top:var\(--ppbui-separator-width\) solid var\(--ppbui-border\)/s);
  assert.match(css,/\.hunt-world-zoom\s*\{[^}]+margin:0 !important;[^}]+padding:0 !important;[^}]+gap:0 !important;[^}]+border:0 !important;/s);
  assert.match(css,/\.hunt-world-toolbar input,[\s\S]*\.ppbui-hunts-results select\s*\{[^}]+border:[^}]+!important;[^}]+border-radius:var\(--ppbui-radius\) !important;[^}]+color:var\(--ppbui-text\) !important;[^}]+box-shadow:none !important;/s);
  assert.match(css,/\.hunt-world-toolbar button\s*\{[^}]+appearance:none !important;[^}]+background:var\(--ppbui-bg-2\) !important;[^}]+border-color:var\(--ppbui-border-strong\) !important;/s);
  assert.match(css,/\.ppbui-hunts-results select\s*\{[^}]+appearance:none !important;[^}]+background-image:none !important;/s);
  assert.match(css,/\.ppbui-hunts-select-wrap::after/);
  assert.match(css,/\.hunt-world-notice:empty\s*\{\s*display:none/);
  assert.match(css,/\.hunt-world-notice:not\(:empty\)[^{]*\{[^}]+border-left:[^}]+var\(--ppbui-info\)[^}]+box-shadow:none/s);
  assert.match(css,/\.ppbui-hunts-inspector\s*\{[^}]+border-left:[^}]+box-shadow:none/s);
  assert.match(css,/\.ppbui-hunts-inspector__mode \.hunt-presentation-toggle\s*\{[^}]+gap:0/s);
  assert.match(css,/\.ppbui-hunts-inspector__hunt\s*\{[^}]+min-height:var\(--ppbui-control-height\);[^}]+margin-top:var\(--ppbui-space-5\);[^}]+border:var\(--ppbui-border-width\) solid var\(--ppbui-accent\)[^}]+background:var\(--ppbui-bg-0\) !important;[^}]+color:var\(--ppbui-accent-hi\) !important;[^}]+font:700 var\(--ppbui-font-size-body\)[^}]+box-shadow:none !important/s);
  assert.match(css,/\.ppbui-hunts-inspector__hunt:active:not\(:disabled\)\s*\{[^}]+border-color:var\(--ppbui-accent-hi\) !important;[^}]+background:var\(--ppbui-action-bg\) !important/s);
  assert.match(css,/@media \(pointer:coarse\)[\s\S]*\.ppbui-hunts-inspector__hunt\s*\{\s*min-height:40px;\s*\}/);
  assert.match(css,/@media \(pointer:coarse\)[\s\S]*\.ppbui-hunts-inspector__close\s*\{[^}]+min-width:40px;[^}]+min-height:40px;/);
  assert.doesNotMatch(css,/::-webkit-scrollbar/, 'Hunts consumes the shared ppbui-scroll primitive instead of duplicating scrollbar chrome');
  assert.ok(css.lastIndexOf('.hunt-category-tab:disabled')>css.lastIndexOf('.hunt-category-tab.is-active'));
  assert.ok(css.lastIndexOf('.hunt-world-elements button:disabled')>css.lastIndexOf('.hunt-world-elements button.is-active'));
  assert.match(css,/button:disabled[^}]+cursor:default/s);
  assert.doesNotMatch(css,/(^|\})\s*(button|input|select)\s*\{/m);
  assert.equal(s.root.classList.contains('ppbui-root'),false,"Hunt window must not opt native map marker buttons into the generic ppbui-root control reset");
  assert.equal(s.root.querySelector('.hunt-map-marker').matches('.ppbui-root button'),false,"native map markers remain outside full-control ownership so hover cannot inherit an opaque PPBUI button background");
  assert.equal(s.body.classList.contains('ppbui-scroll'),true);
  assert.equal(s.dossier().querySelector('.ppbui-hunts-inspector__body').classList.contains('ppbui-scroll'),true);
  assert.equal(s.root.querySelector('.ppbui-hunts-results select').classList.contains('ppbui-select'),true);
  assert.equal(s.dossier().classList.contains('ppbui-dialog'),false);
  assert.equal(s.dossier().querySelector('.ppbui-hunts-inspector__hunt').classList.contains('ppbui-button--primary'),true);
});

test('cleanup restores the native Hunt Map title exactly',t=>{
  const s=setup(t),title=s.root.querySelector('.pokeidle-panel__title'),nativeStyle='font:600 14px/1.2 Arial,sans-serif !important';
  assert.equal(title.textContent,'HUNT ATLAS');
  assert.equal(title.classList.contains('ppbui-hunts-title'),true);
  assert.notEqual(title.getAttribute('style'),nativeStyle);
  s.c.cleanup();
  assert.equal(title.textContent,'Hunt Map');
  assert.equal(title.getAttribute('style'),nativeStyle);
  assert.equal(title.classList.contains('ppbui-hunts-title'),false);
  assert.equal(s.root.outerHTML,s.before);
});

test('Locate opens the same inspector, pans without starting Hunt, preserves zoom and dims other labels',t=>{
  const s=setup(t);s.choose();s.locate().click();
  const [marker,other]=s.root.querySelectorAll('.hunt-map-marker');
  assert.equal(s.dossier().hidden,false);
  assert.ok(marker.classList.contains('ppbui-hunts-selected-marker'));
  assert.ok(marker.classList.contains('ppbui-hunts-located-marker'));
  assert.equal(marker.classList.contains('ppbui-hunts-dimmed-marker'),false);
  assert.ok(other.classList.contains('ppbui-hunts-dimmed-marker'));
  assert.ok(other.querySelector('.hunt-map-marker__name').classList.contains('ppbui-hunts-dimmed'));
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
  assert.equal(s.root.querySelector('.ppbui-hunts-dimmed-marker'),null);
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
  assert.ok(selectedMarker.classList.contains('ppbui-hunts-dimmed-marker'));
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
  assert.equal(panel.querySelector('.ppbui-hunts-inspector__presentation-label'),null);
  assert.doesNotMatch(panel.textContent,/Apresentação/i);
  assert.match(panel.querySelector('.ppbui-hunts-drop-name').title,/Bent Spoon/);
  assert.match(panel.querySelector('.ppbui-hunts-inspector__close').getAttribute('aria-label'),/Fechar/);
  assert.equal(s.doc.querySelector('.hunt-world-drop-tooltip'),null);
  for(const className of ['hunt-drop-tooltip__title','hunt-drop-tooltip__elements','hunt-drop-tooltip__elements-label','hunt-drop-tooltip__element-badges','hunt-drop-tooltip__element','hunt-drop-tooltip__empty','hunt-drop-tooltip__list','hunt-drop-tooltip__item']){
    assert.equal(panel.querySelector(`.${className}`),null);
  }
  assert.ok(panel.querySelector('.hunt-drop-tooltip__icon'));
  const elementItems=[...panel.querySelectorAll('.ppbui-hunts-element-badge')];
  assert.ok(elementItems.length>0);
  for(const item of elementItems){
    const icon=item.querySelector(':scope > .ppbui-element-icon');
    assert.ok(icon,"shared square Element primitive is a direct child of its semantic row");
    assert.equal(icon.tagName,'SPAN');
    assert.ok(icon.querySelector(':scope > img.ppbui-element-icon__image'),"native/domain PNG is retained inside the shared square well");
    assert.equal(item.querySelector('.native-element-circle'),null,"native circular ornament is deliberately removed instead of being nested in another badge");
  }
  const css=s.root.querySelector('style[data-ppbui-module="hunts"]').textContent;
  assert.doesNotMatch(css,/\.ppbui-hunts-element-icon\s*\{/,"Hunts no longer invents a module-specific Element icon primitive");
  assert.match(css,/\.ppbui-hunts-element-badge,[\s\S]*\.ppbui-hunts-relation-badge\s*\{[^}]+border:0;[^}]+border-radius:var\(--ppbui-radius\);[^}]+background:transparent/s);
});

test('failed native Hunt start clears the remembered zone instead of leaking stale Cards art',async t=>{
  const s=setup(t),marker=s.root.querySelector('.hunt-map-marker');
  s.scene.startHunt=()=>Promise.reject(new Error('blocked'));
  marker.click();
  s.dossier().querySelector('.ppbui-hunts-inspector__hunt').click();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(activeHuntZone(s.dom.window),null);
});

test('deferred failed Hunt start cannot forget a newer remembered zone',async t=>{
  const s=setup(t),marker=s.root.querySelector('.hunt-map-marker');
  let rejectStart;
  s.scene.startHunt=()=>new Promise((resolve,reject)=>{rejectStart=reject;});
  marker.click();
  s.dossier().querySelector('.ppbui-hunts-inspector__hunt').click();
  const original=activeHuntZone(s.dom.window);
  assert.ok(original);
  const newer=rememberActiveHuntZone(s.root,1);
  assert.notEqual(newer,original);
  rejectStart(new Error('late failure'));
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(activeHuntZone(s.dom.window),newer,'old request failure cannot erase a newer zone');
});

test('remembered Hunt cleanup matches the exact start snapshot and ignores newer zones',t=>{
  const s=setup(t);
  const original=rememberActiveHuntZone(s.root,0);
  forgetActiveHuntZone(s.dom.window,original);
  assert.equal(activeHuntZone(s.dom.window),null,'the matching snapshot is forgotten');

  const old=rememberActiveHuntZone(s.root,0);
  const newer=rememberActiveHuntZone(s.root,1);
  forgetActiveHuntZone(s.dom.window,old);
  assert.equal(activeHuntZone(s.dom.window),newer,'cleanup for an older Hunt cannot delete a newer remembered zone');
  forgetActiveHuntZone(s.dom.window,newer);
  assert.equal(activeHuntZone(s.dom.window),null);
});

test('element rendering never reuses host ornament when no raw PNG is available',t=>{
  const s=setup(t);
  s.dom.window.PokeIdle.ElementIcons.create=()=>{
    const native=s.doc.createElement('span');
    native.className='native-element-circle';
    native.style.cssText='border-radius:50%;background:white;padding:8px';
    return native;
  };
  s.root.querySelectorAll('.hunt-map-marker')[1].click();
  const icons=[...s.dossier().querySelectorAll('.ppbui-element-icon')];
  assert.ok(icons.length>0);
  for(const icon of icons){
    assert.equal(icon.tagName,'SPAN');
    assert.ok(icon.classList.contains('ppbui-element-icon--fallback'));
    assert.equal(icon.classList.contains('native-element-circle'),false);
    assert.doesNotMatch(icon.getAttribute('style')||'',/border-radius|background/i,"host inline circle/card ornament is not propagated into the controlled fallback");
  }
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

test('cleanup surfaces native navigation restoration failure after removing Better UI ownership',t=>{
  const s=setup(t),staleLocate=s.locate();s.choose();s.root.querySelector('.hunt-map-marker').click();
  const failure=Error('native navigation cleanup failed');s.scene._navigationCleanup=()=>{throw failure;};
  assert.throws(()=>s.c.cleanup(),error=>error===failure);
  assert.equal(s.root.querySelector('[data-ppbui-module]'),null);
  assert.equal(s.root.classList.contains('ppbui-hunts-enhanced'),false);
  assert.equal(s.root.querySelector('.hunt-world-viewport').parentElement,s.body);
  assert.equal(s.root.querySelector('.hunt-world-header-actions').contains(s.root.querySelector('.hunt-presentation-toggle')),true);
  assert.doesNotThrow(()=>s.c.sync());
  assert.equal(s.root.querySelector('[data-ppbui-module]'),null,'failed cleanup leaves the disposed controller inert on later reconcile');
  const setupsAfterCleanup=s.stats().setups;s.scene._navigationCleanup=()=>{};staleLocate.click();assert.equal(s.stats().setups,setupsAfterCleanup,'detached Locate control cannot call native navigation after cleanup');
  assert.doesNotThrow(()=>s.c.cleanup(),'a retained lifecycle owner can retry cleanup without repeating the native restoration failure');
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
  const replacement=s.doc.createElement('div');replacement.className='hunt-window';replacement.innerHTML=`<div class="pokeidle-panel__titlebar"><span class="pokeidle-panel__title" style="font:600 14px/1.2 Arial,sans-serif !important">Hunt Map</span><button type="button" aria-label="Close">×</button></div><div class="pokeidle-panel__body">${markup()}</div>`;s.root.replaceWith(replacement);s.scene._panel.body=replacement.querySelector('.pokeidle-panel__body');
  await new Promise(resolve=>s.dom.window.setTimeout(resolve,50));assert.equal(replacement.querySelectorAll('.ppbui-hunts-results').length,1);assert.equal(replacement.querySelectorAll('.ppbui-hunts-atlas-workspace').length,1);
  enabled=false;app.reconcile();assert.equal(replacement.querySelector('[data-ppbui-module]'),null);enabled=true;app.reconcile();assert.equal(replacement.querySelectorAll('.ppbui-hunts-results').length,1);
});

test('dual-type relations expose exact weaknesses, resistances and immunities',()=>{
  const entries=defensiveMultipliers(['psychic','fairy']),values=Object.fromEntries(entries.map(entry=>[entry.type,entry.multiplier]));
  assert.equal(values.ghost,2);assert.equal(values.poison,2);assert.equal(values.steel,2);assert.equal(values.fighting,.25);assert.equal(values.psychic,.5);assert.equal(values.dragon,0);assert.equal(values.bug,1);assert.equal(values.dark,1);
});
