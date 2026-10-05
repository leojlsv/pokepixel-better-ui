import {test} from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";
import {mountStorage} from "../src/modules/storage/controller.js";
import {findStorage} from "../src/modules/storage/dom.js";
import {createStorageModule} from "../src/modules/storage/index.js";
function setup(t,count=44,bothSides=false) {
  const dom=new JSDOM('<div class="storage-window"><div class="pokeidle-panel__body"></div></div>',{pretendToBeVisual:true});
  const doc=dom.window.document,root=doc.body.firstChild,body=root.firstChild;
  const el=(tag,cls,text)=>{const n=doc.createElement(tag);n.className=cls||"";n.textContent=text||"";return n;};
  const calls=[];
  const scene={_creatures:Array.from({length:count},(_,i)=>({id:String(i),species:{name:i===43?"Flabébé":"Eevee",normal_sprite_url:"https://example.test/sprite.png"},location:"storage"})),_storagePage:0,_inventoryPage:0,_storageLimit:2000,_panel:{body},
    pokeCentroFiltersActive(){return false;}, filterAndSortPokeCentro(list){return list.filter(c=>!this._qualityFilter || c.quality===this._qualityFilter);},
    renderPokeCentroFilters(){const bar=el('div'),controls=el('div','pokecentro-filter-bar__controls'),clear=el('button','pokecentro-filter-clear');clear.disabled=!this.pokeCentroFiltersActive();clear.addEventListener('click',()=>this.refresh());for(const [key,values] of [['_qualityFilter',['','rare']],['_elementFilter',['','fire']],['_sortBy',['name','power']]]){const select=el('select');for(const value of values){const option=el('option','',value);option.value=value;select.append(option);}select.value=this[key] || values[0];controls.append(select);}controls.append(clear);bar.append(controls);return bar;},
    renderPokeCentroVault(title,subtitle,list,side,total){
      const pageKey=side==='storage'?'_storagePage':'_inventoryPage',capacity=this.pokeCentroFiltersActive()?Math.max(42,list.length):Math.max(side==='storage'?this._storageLimit:total,total),pages=Math.max(1,Math.ceil(capacity/42));
      const vault=el('section'),header=el('header'),count=el('span','pokecentro-vault__count'),bulk=el('button','pokecentro-vault__bulk'),grid=el('div','pokecentro-slot-grid');
      bulk.addEventListener('click',()=>{const dialog=el('div','pokeidle-dialog-overlay');dialog.append(el('div','pokeidle-dialog__body'));doc.body.append(dialog);});header.append(count,bulk);vault.append(header,grid);
      for(const c of list.slice(this[pageKey]*42,this[pageKey]*42+42)){const slot=el('button','pokecentro-transfer-slot',c.species.name);slot.append(el('i','inventory-slot__icon'));slot.addEventListener('click',()=>calls.push(['select',c.id]));slot.addEventListener('dblclick',()=>calls.push(['transfer',c.id]));grid.append(slot);}
      const pager=el('footer','pokecentro-pager'),prev=el('button'),next=el('button');prev.addEventListener('click',()=>{this[pageKey]--;this.refresh();});next.disabled=this[pageKey]>=pages-1;next.addEventListener('click',()=>{this[pageKey]++;this.refresh();});pager.append(prev,el('span','',String(pages)),next);vault.append(pager);return vault;
    },refresh(){
      if(bothSides){
        const inventory=this._creatures.map(c=>({...c,location:'inventory'}));
        body.replaceChildren(this.renderPokeCentroVault('','',this.filterAndSortPokeCentro(inventory),'inventory',inventory.length),this.renderPokeCentroVault('','',this.filterAndSortPokeCentro(this._creatures),'storage',this._creatures.length));
      } else body.replaceChildren(this.renderPokeCentroFilters(),this.renderPokeCentroVault('','',this.filterAndSortPokeCentro(this._creatures),'storage',this._creatures.length));
    }
  };
  dom.window.PokeIdle={t:(key,args={})=>`${args.page}/${args.total}`,Localization:{get:()=>"en"}};dom.window.SceneManager={_scene:scene};
  const original=scene.renderPokeCentroVault;const mounted=mountStorage({root,scene});t.after(()=>{mounted.cleanup();dom.window.close();});
  return {doc,root,body,scene,mounted,original,calls,window:dom.window};
}
test('storage pages contain occupied results and preserve full capacity',t=>{
  const s=setup(t);assert.equal(s.root.querySelector('.pokecentro-pager span').textContent,'1/2');
  s.root.querySelector('.pokecentro-pager button:last-child').click();
  assert.equal(s.root.querySelectorAll('.pokecentro-transfer-slot').length,2);assert.equal(s.root.querySelector('.pokecentro-pager span').textContent,'2/2');
  assert.ok(s.root.querySelector('.pokecentro-pager button:last-child').disabled);assert.equal(s.scene._storageLimit,2000);
});
test('search includes off-page species, normalizes accents and clear restores all results',t=>{
  const s=setup(t),search=s.root.querySelector('input');search.value='flabebe';search.dispatchEvent(new s.window.Event('input'));
  assert.equal(s.root.querySelectorAll('.pokecentro-transfer-slot').length,1);assert.equal(s.root.querySelector('input'),s.doc.activeElement);
  assert.equal(s.scene._creatures.length,44);assert.equal(s.scene._storagePage,0);
  s.root.querySelector('.pokecentro-filter-clear').click();assert.equal(s.root.querySelector('input').value,'');assert.equal(s.root.querySelectorAll('.pokecentro-transfer-slot').length,42);
});
test('native slot actions survive sprite replacement and image errors restore icon',t=>{
  const s=setup(t),slot=s.root.querySelector('.pokecentro-transfer-slot');slot.click();slot.dispatchEvent(new s.window.Event('dblclick'));
  assert.deepEqual(s.calls,[['select','0'],['transfer','0']]);const image=slot.querySelector('img');image.dispatchEvent(new s.window.Event('error'));assert.ok(slot.querySelector('.inventory-slot__icon'));
});
test('empty and overflow storage clamp to occupied pages; cleanup restores native methods',t=>{
  const s=setup(t,2001);s.scene._storagePage=100;s.scene.refresh();assert.equal(s.scene._storagePage,47);
  s.scene._creatures=[];s.scene.refresh();assert.equal(s.scene._storagePage,0);assert.ok(s.root.querySelector('.pokecentro-pager button:last-child').disabled);
  s.mounted.cleanup();assert.equal(s.scene.renderPokeCentroVault,s.original);assert.equal(s.root.querySelector('input'),null);
  assert.equal(s.root.classList.contains('ppbui-window'),false);assert.equal(s.body.classList.contains('ppbui-scroll'),false);
});
test('scene discovery rejects unrelated windows without the native contract',t=>{
  const s=setup(t);assert.equal(findStorage(s.doc).scene,s.scene);s.window.SceneManager._scene={};assert.equal(findStorage(s.doc),null);
});

test('Storage mounts from ReactiveWindows while the map remains the active scene',t=>{
  const s=setup(t);
  s.window.SceneManager._scene={map:true};
  s.window.PokeIdle.ReactiveWindows={cached:()=>[{_panel:{body:s.doc.createElement('div')}},s.scene]};
  assert.equal(findStorage(s.doc).scene,s.scene);
  s.root.remove();assert.equal(findStorage(s.doc),null);
});
test('Storage discovery prefers the current active scene over a stale cached scene sharing the same body',t=>{
  const s=setup(t),stale={...s.scene,_panel:{body:s.scene._panel.body}};
  s.window.PokeIdle.ReactiveWindows={cached:()=>[stale,s.scene]};s.window.SceneManager._scene=s.scene;
  assert.equal(findStorage(s.doc).scene,s.scene);
});
test('Storage module mount identity changes when the native root or scene changes',t=>{
  const s=setup(t),previous=Object.getOwnPropertyDescriptor(globalThis,'document');
  Object.defineProperty(globalThis,'document',{configurable:true,value:s.doc});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;});
  const module=createStorageModule();assert.equal(module.shouldMount(),true);const first=module.getMountKey();
  const replacement=s.doc.createElement('div');replacement.className='storage-window';const body=s.doc.createElement('div');body.className='pokeidle-panel__body';replacement.append(body);s.root.replaceWith(replacement);s.scene._panel.body=body;
  assert.equal(module.shouldMount(),true);const second=module.getMountKey();assert.notEqual(second,first);assert.equal(second.root,replacement);assert.equal(second.scene,s.scene);
  const nextScene={...s.scene,_panel:{body}};s.window.SceneManager._scene=nextScene;s.window.PokeIdle.ReactiveWindows={cached:()=>[s.scene,nextScene]};
  assert.equal(module.shouldMount(),true);assert.notEqual(module.getMountKey(),second);assert.equal(module.getMountKey().scene,nextScene);
});

test('independent searches and Clear affect only their own column',t=>{
  const s=setup(t);
  const inventory=s.scene._creatures.map(c=>({...c,location:'inventory'}));
  const render=()=>s.body.replaceChildren(s.scene.renderPokeCentroVault('','',s.scene.filterAndSortPokeCentro(inventory),'inventory',44),s.scene.renderPokeCentroVault('','',s.scene.filterAndSortPokeCentro(s.scene._creatures),'storage',44));
  s.scene.refresh=render;render();
  let input=s.root.querySelector('[data-ppbui-storage-search=inventory]');input.value='eevee';input.dispatchEvent(new s.window.Event('input'));
  input=s.root.querySelector('[data-ppbui-storage-search=storage]');input.value='flabebe';input.dispatchEvent(new s.window.Event('input'));
  assert.equal(s.scene.filterAndSortPokeCentro(inventory).length,43);assert.equal(s.scene.filterAndSortPokeCentro(s.scene._creatures).length,1);
  s.root.querySelector('[data-ppbui-storage-side=storage] .pokecentro-filter-clear').click();
  assert.equal(s.scene.filterAndSortPokeCentro(inventory).length,43);assert.equal(s.scene.filterAndSortPokeCentro(s.scene._creatures).length,44);
});
test('selected native transfer button moves to its column and preserves its listener',t=>{
  const s=setup(t);s.mounted.cleanup();
  let clicks=0;
  s.scene.renderPokeCentroSelection=function(){
    const section=s.doc.createElement('section');section.className='pokecentro-selection';
    section.innerHTML='<div class="pokecentro-selection__identity"><h3>Eevee</h3></div><div class="pokecentro-selection__actions"><button>Details</button><button>Withdraw</button></div>';
    section.lastChild.lastChild.addEventListener('click',()=>clicks++);return section;
  };
  const mounted=mountStorage({root:s.root,scene:s.scene});s.scene._selectedId='0';
  const selection=s.scene.renderPokeCentroSelection();assert.equal(selection.hidden,true);
  s.root.querySelector('[data-ppbui-storage-side=storage] .ppbui-storage-transfer button').click();assert.equal(clicks,1);
  s.scene.renderPokeCentroSelection();assert.equal(s.root.querySelectorAll('.ppbui-storage-transfer').length,1);mounted.cleanup();
});

test('rarity selection is scoped and does not replace shared native filter state',t=>{
  const s=setup(t);s.scene._creatures[0].quality='rare';
  const select=s.root.querySelector('select');select.value='rare';select.dispatchEvent(new s.window.Event('change'));
  assert.equal(s.scene.filterAndSortPokeCentro(s.scene._creatures).length,1);
  assert.equal(s.scene.filterAndSortPokeCentro(s.scene._creatures.map(c=>({...c,location:'inventory'}))).length,44);
  assert.equal(s.scene._qualityFilter,undefined);
});

test('empty-state copy distinguishes filters from empty inventory and counts retain capacity',t=>{
  const s=setup(t);const search=s.root.querySelector('input');search.value='missing';search.dispatchEvent(new s.window.Event('input'));
  assert.match(s.root.querySelector('.ppbui-storage-empty').textContent,/No Pokémon found/);
  assert.equal(s.root.querySelector('.pokecentro-vault__count').textContent,'44/2000');
  assert.equal(s.root.querySelector('.ppbui-storage-results').textContent,'0 results');
  s.root.querySelector('.ppbui-storage-empty button').click();assert.equal(s.root.querySelector('input').value,'');
  s.scene._creatures=[];s.scene.refresh();assert.match(s.root.querySelector('.ppbui-storage-empty').textContent,/Storage empty/);
  assert.equal(s.root.querySelector('.ppbui-storage-empty button'),null);
});
test('pagination clears only its selected side and preserves scroll and usable focus',t=>{
  const s=setup(t,44,true);s.scene._selectedId='0';s.body.scrollTop=123;const [inventoryGrid,storageGrid]=s.root.querySelectorAll('.pokecentro-slot-grid');inventoryGrid.scrollTop=137;storageGrid.scrollTop=83;
  const next=s.root.querySelector('[data-ppbui-storage-side=storage] .pokecentro-pager button:last-child');next.focus();next.click();
  const [nextInventoryGrid,nextStorageGrid]=s.root.querySelectorAll('.pokecentro-slot-grid');
  assert.equal(s.scene._selectedId,'');assert.equal(s.body.scrollTop,123);assert.equal(s.doc.activeElement,s.root.querySelector('[data-ppbui-storage-side=storage] input'));assert.equal(nextInventoryGrid.scrollTop,137,'the peer vault keeps its independent scroll position');assert.equal(nextStorageGrid.scrollTop,0,'page changes intentionally reset only their own inner slot viewport');
  s.scene._creatures.push({id:'other',location:'inventory',species:{name:'Other'}});s.scene._selectedId='other';
  s.root.querySelector('[data-ppbui-storage-side=storage] .pokecentro-pager button').click();assert.equal(s.scene._selectedId,'other');
  const select=s.root.querySelector('select');select.focus();select.value='rare';select.dispatchEvent(new s.window.Event('change'));
  assert.equal(s.doc.activeElement,s.root.querySelector('select'));assert.equal(s.body.scrollTop,123);
});
test('bulk summary enriches only the new native dialog without changing transfer scope',async t=>{
  const s=setup(t);const old=s.doc.createElement('div');old.className='pokeidle-dialog-overlay';old.innerHTML='<div class="pokeidle-dialog__body">Other dialog</div>';s.doc.body.append(old);
  s.root.querySelector('.pokecentro-vault__bulk').click();await Promise.resolve();
  assert.equal(old.querySelector('[data-ppbui-storage-bulk]'),null);
  const note=s.doc.querySelector('[data-ppbui-storage-bulk]');assert.match(note.textContent,/44 Pokémon → Backpack/);assert.match(note.textContent,/hidden by filters/);
  s.mounted.cleanup();assert.equal(s.doc.querySelector('[data-ppbui-storage-bulk]'),null);
});


test('filtered transfer includes off-page matches only and keeps native all untouched',async t=>{
  const s=setup(t,90);let confirmed='',all=0;const moved=[];
  s.window.PokeIdle.Dialog={confirm:async message=>{confirmed=message;return true;}};
  s.scene.transferPokeCentroCreature=async (c,target)=>{moved.push(c.id);c.location=target;};
  s.scene._creatures.forEach((c,i)=>c.quality=i%2?'rare':'common');
  const select=s.root.querySelector('select');select.value='rare';select.dispatchEvent(new s.window.Event('change'));
  const button=s.root.querySelector('.pokecentro-vault__bulk');button.addEventListener('click',()=>all++);
  assert.equal(button.textContent,'Withdraw filtered');button.click();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(all,0);assert.equal(moved.length,45);assert.ok(moved.includes('89'));
  assert.ok(moved.every(id=>Number(id)%2===1));assert.match(confirmed,/45 filtered Pokémon/);
});

test('filtered transfer cancellation and failed native move stop the batch',async t=>{
  const s=setup(t,4);let accepted=false,calls=0;
  s.window.PokeIdle.Dialog={confirm:async()=>accepted};
  s.scene.transferPokeCentroCreature=async()=>{calls++;};
  const search=s.root.querySelector('input');search.value='eevee';search.dispatchEvent(new s.window.Event('input'));
  s.root.querySelector('.pokecentro-vault__bulk').click();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(calls,0);
  accepted=true;s.root.querySelector('.pokecentro-vault__bulk').click();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(calls,1);
  assert.equal(s.root.querySelector('.pokecentro-vault__bulk').disabled,false);
});

test('Storage preserves desktop density and reflows without horizontal root overflow in narrow panes',t=>{
  const s=setup(t);const css=s.doc.querySelector('[data-ppbui-style="storage"]').textContent;
  assert.match(css,/container-type:inline-size; min-width:min\(980px,calc\(100vw - 16px\)\) !important; max-width:calc\(100vw - 16px\)/,'Storage keeps its desktop target while yielding to the current pane width');
  assert.match(css,/\.ppbui-pokemon-fields \{[^}]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/s,'advanced Storage filters retain desktop density before the narrow container breakpoints');
  assert.match(css,/@container \(max-width:879px\)[\s\S]*\.pokecentro-transfer-layout \{[^}]*grid-template-columns:minmax\(0,1fr\)[^}]*grid-template-rows:auto auto[^}]*overflow-y:auto[^}]*overscroll-behavior:contain/s,'the stacked transfer layout becomes the single vertical scroll owner in a 1:1 pane');
  assert.match(css,/@container \(max-width:879px\)[\s\S]*\[data-ppbui-storage-side\] > \.pokecentro-slot-grid \{[^}]*flex:0 0 auto[^}]*overflow:visible[^}]*overscroll-behavior:auto[^}]*scrollbar-gutter:auto/s,'stacked vault slot grids expand naturally so wheel and trackpad input cannot be trapped in a nested scroller');
  assert.match(css,/@container \(max-width:879px\)[\s\S]*\.ppbui-storage-filters \{[^}]*flex:0 0 auto[^}]*overflow:visible[^}]*overscroll-behavior:auto/s,'stacked filters share the outer scroll owner instead of nesting another contained vertical scroller');
  assert.match(css,/@container \(max-width:620px\)[\s\S]*\.ppbui-storage-filter-row \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\); \}/,'filter controls reflow before intrinsic select widths can own horizontal overflow');
  assert.match(css,/@container \(max-width:459px\)[\s\S]*\.pokecentro-slot-grid \{[^}]*grid-template-columns:repeat\(4,56px\)[^}]*grid-auto-rows:56px/s,'very narrow panes preserve 56px slot semantics by changing column count rather than shrinking slots');
  assert.match(css,/\.pokecentro-transfer-slot\.rarity-rare \{ --ppbui-storage-quality:var\(--quality-rare\)/);
  assert.doesNotMatch(css,/\.pokecentro-transfer-slot\.rarity-rare \{[^}]*border-color/s);
  assert.match(css,/\.pokecentro-transfer-slot\.is-selected[^}]*border-color:var\(--ppbui-selected\) !important[^}]*border-bottom-color:var\(--ppbui-storage-quality\) !important/s);
  assert.match(css,/\.pokecentro-transfer-slot:focus-visible[^}]*outline:var\(--ppbui-focus-width\) solid var\(--ppbui-focus\) !important/s);
  assert.ok(s.root.classList.contains('ppbui-window'));assert.ok(s.body.classList.contains('ppbui-scroll'));
  assert.match(css,/\.storage-window\.ppbui-window[^}]+border:var\(--ppbui-border-width\) solid var\(--ppbui-border-strong\) !important[^}]+background:var\(--ppbui-bg-1\) !important/s);
  assert.ok(s.root.querySelector('.pokecentro-vault__bulk').classList.contains('ppbui-button'));
  for(const button of s.root.querySelectorAll('.pokecentro-pager > button'))for(const cls of ['ppbui-button','ppbui-button--1x1'])assert.ok(button.classList.contains(cls));
  assert.doesNotMatch(css,/--ui-/);assert.doesNotMatch(css,/\.storage-window(?!\.ppbui-window)\s/);assert.ok(s.root.querySelector('.ppbui-storage-filters').classList.contains('ppbui-root'));
  assert.ok(s.root.querySelector('.ppbui-storage-search').classList.contains('ppbui-input'));
  assert.ok(s.root.querySelector('.ppbui-storage-filter-row select').classList.contains('ppbui-select'));
  assert.match(css,/input\.ppbui-storage-search\.ppbui-input,[\s\S]*\.ppbui-storage-filter-row > select\.ppbui-select \{[^}]*height:var\(--ppbui-control-height\)!important[^}]*border:var\(--ppbui-border-width\) solid var\(--ppbui-border-strong\)!important[^}]*border-radius:var\(--ppbui-radius\)!important[^}]*background:var\(--ppbui-bg-0\)!important[^}]*background-image:none!important[^}]*box-shadow:none!important/s,'Search and the initial Storage selects explicitly defeat the live host important rounded/dark field chrome');
  assert.match(css,/input\.ppbui-storage-search\.ppbui-input:focus-visible,[\s\S]*select\.ppbui-select:focus-visible \{[^}]*outline:var\(--ppbui-focus-width\) solid var\(--ppbui-focus\)!important/s,'Storage field focus stays cyan instead of falling back to the host gold focus treatment');
  assert.match(css,/\.ppbui-pokemon-tools input\.game-window__search\.ppbui-input,[\s\S]*\.ppbui-pokemon-tools select\.game-window__select\.ppbui-select \{[^}]*border:var\(--ppbui-border-width\) solid var\(--ppbui-border-strong\)!important[^}]*background:var\(--ppbui-bg-0\)!important[^}]*color:var\(--ppbui-text\)!important/s,'Storage More Filters fields receive the same hostile-host visual bridge without changing their field DOM');
  assert.ok(s.root.querySelector('.ppbui-storage-filter-row button').classList.contains('ppbui-button'));
  assert.ok(s.root.querySelector('.ppbui-storage-filter-row').classList.contains('pokecentro-filter-bar__controls'),'native filter-control identity is retained');
  assert.ok(s.root.querySelector('.pokecentro-transfer-slot').classList.contains('ppbui-storage-slot'));
  assert.match(css,/\.pokecentro-slot-grid[^}]*justify-content:space-evenly/s);
  assert.match(css,/\[data-ppbui-storage-side\] \{[^}]*min-height:0[^}]*overflow:hidden/s,'each vault is allowed to shrink with the window instead of clipping its footer');
  assert.match(css,/\[data-ppbui-storage-side\] > \.pokecentro-slot-grid \{[^}]*min-height:0[^}]*grid-template-rows:repeat\(6,56px\)[^}]*overflow-x:hidden[^}]*overflow-y:auto[^}]*overscroll-behavior:contain[^}]*scrollbar-gutter:stable/s,'the 42-slot matrix keeps native rows but becomes the constrained-height scroll region');
  assert.doesNotMatch(css,/\.pokecentro-slot-grid \{[^}]*min-height:361px/s,'the slot matrix no longer forces the complete window to retain desktop height');
  assert.match(css,/\.ppbui-storage-filters \{[^}]*min-height:0[^}]*flex:0 1 auto[^}]*overflow-x:hidden[^}]*overflow-y:auto[^}]*overscroll-behavior:contain/s,'filters can yield height only after the slot viewport contracts, keeping pager and transfer controls reachable with More Filters open');
  assert.match(css,/\.pokecentro-transfer-slot[^}]*border-radius:var\(--ppbui-radius\) !important[^}]*background:var\(--ppbui-bg-1\) !important[^}]*background-image:none !important/s);
});
test('passive Storage refresh preserves the constrained-height slot viewport',t=>{
  const s=setup(t),grid=s.root.querySelector('.pokecentro-slot-grid');grid.scrollTop=137;s.body.focus();s.scene.refresh();
  assert.equal(s.root.querySelector('.pokecentro-slot-grid').scrollTop,137);
});
test('passive Storage refresh preserves the stacked split scroll owner when native refresh replaces it',t=>{
  const s=setup(t);s.mounted.cleanup();let latest;
  s.scene.refresh=function(){const next=s.doc.createElement('div');next.className='pokecentro-transfer-layout';this._panel.body.replaceChildren(next);latest=next;};
  const mounted=mountStorage({root:s.root,scene:s.scene}),before=latest;before.scrollTop=173;s.scene.refresh();const after=latest;
  assert.notEqual(after,before);assert.equal(after.scrollTop,173,'the <=879 single scroll owner must not jump to the top across a native refresh');
  mounted.cleanup();
});
test('passive Storage refresh preserves slot scroll even while a filter control retains focus',t=>{
  const s=setup(t),grid=s.root.querySelector('.pokecentro-slot-grid'),filter=s.root.querySelector('.ppbui-storage-filter-row select');grid.scrollTop=137;filter.focus();s.scene.refresh();
  assert.equal(s.root.querySelector('.pokecentro-slot-grid').scrollTop,137,'focus location alone must not classify a refresh as user-requested navigation');
});
test('an intentional Storage filter refresh resets only its own vault scroll',t=>{
  const s=setup(t,44,true),[inventoryGrid,storageGrid]=s.root.querySelectorAll('.pokecentro-slot-grid');inventoryGrid.scrollTop=137;storageGrid.scrollTop=83;
  const filter=s.root.querySelector('[data-ppbui-storage-side=storage] .ppbui-storage-filter-row select');filter.value='rare';filter.dispatchEvent(new s.window.Event('change'));
  const [nextInventoryGrid,nextStorageGrid]=s.root.querySelectorAll('.pokecentro-slot-grid');assert.equal(nextInventoryGrid.scrollTop,137);assert.equal(nextStorageGrid.scrollTop,0);
});
test('Storage Search and initial selects resist hostile live panel field chrome without changing their native semantics',t=>{
  const s=setup(t),host=s.doc.createElement('style');
  s.root.classList.add('pokeidle-panel');
  host.textContent='.pokeidle-panel input:not([type="checkbox"]):not([type="radio"]),.pokeidle-panel select{height:34px!important;padding:8px 11px!important;border:5px solid red!important;border-radius:7px!important;background:#111113!important;background-image:linear-gradient(red,red)!important;color:red!important;box-shadow:0 0 5px red!important;font:500 12px Arial!important;outline:0!important}.pokeidle-panel input:focus,.pokeidle-panel select:focus{border-color:gold!important}';
  s.doc.head.append(host);
  const search=s.root.querySelector('.ppbui-storage-search'),select=s.root.querySelector('.ppbui-storage-filter-row select');
  const css=s.doc.querySelector('[data-ppbui-style="storage"]').textContent;
  assert.equal(search.type,'search');assert.ok(search.hasAttribute('aria-label'));assert.ok(search.classList.contains('ppbui-input'));
  assert.equal(select.tagName,'SELECT');assert.ok(select.classList.contains('ppbui-select'));
  assert.match(css,/\.storage-window\.ppbui-window input\.ppbui-storage-search\.ppbui-input,[\s\S]*\.storage-window\.ppbui-window \.ppbui-storage-filter-row > select\.ppbui-select \{[^}]*border-radius:var\(--ppbui-radius\)!important[^}]*background:var\(--ppbui-bg-0\)!important[^}]*background-image:none!important[^}]*box-shadow:none!important/s,'Storage owns a higher-specificity important bridge than the live pokeidle-panel field reset');
  const before=select.value;select.focus();assert.equal(s.doc.activeElement,select);assert.equal(select.value,before);
});
test('Storage reacquires pixel-scroll ownership when the native body is replaced in place',t=>{
  const s=setup(t),old=s.body,next=s.doc.createElement('div');next.className='pokeidle-panel__body';s.root.replaceChildren(next);s.scene._panel.body=next;s.scene.refresh();
  assert.equal(old.classList.contains('ppbui-scroll'),false);assert.equal(next.classList.contains('ppbui-scroll'),true);
  s.mounted.cleanup();assert.equal(next.classList.contains('ppbui-scroll'),false);
});
test('Storage restores scroll onto the current body when native refresh replaces the body during refresh',t=>{
  const s=setup(t);s.mounted.cleanup();let latest=s.scene._panel.body;
  s.scene.refresh=function(){const next=s.doc.createElement('div');next.className='pokeidle-panel__body';this._panel.body=next;s.root.replaceChildren(next);latest=next;};
  const mounted=mountStorage({root:s.root,scene:s.scene});const before=latest;before.scrollTop=91;s.scene.refresh();const after=latest;
  assert.notEqual(after,before);assert.equal(after.scrollTop,91);assert.equal(before.classList.contains('ppbui-scroll'),false);assert.equal(after.classList.contains('ppbui-scroll'),true);
  mounted.cleanup();assert.equal(after.classList.contains('ppbui-scroll'),false);
});

test('Storage stale adapters stay inert when a later foreign wrapper survives cleanup',t=>{
  const s=setup(t);s.mounted.cleanup();const mounted=mountStorage({root:s.root,scene:s.scene});
  const storageRefresh=s.scene.refresh;let foreignCalls=0;
  const foreign=function(...args){foreignCalls++;return storageRefresh.apply(this,args);};
  s.scene.refresh=foreign;
  mounted.cleanup();
  assert.equal(s.scene.refresh,foreign,'cleanup must not clobber a later foreign wrapper');
  assert.equal(s.body.classList.contains('ppbui-scroll'),false,'cleanup must release Storage scroll ownership even when a foreign wrapper delegates to the stale adapter');
  s.scene.refresh();
  assert.ok(foreignCalls>=2,'foreign wrapper remains functional during and after cleanup');
  assert.equal(s.body.classList.contains('ppbui-scroll'),false,'calling a captured stale Storage adapter after cleanup must not resurrect PPBUI ownership');
});


test('rarity stays a secondary edge instead of overriding selected gold',t=>{
  const s=setup(t),css=s.doc.querySelector('[data-ppbui-style="storage"]').textContent;
  for(const quality of ['weak','common','uncommon','rare','epic','legendary','mythical']){
    assert.ok(css.includes(`.storage-window.ppbui-window .pokecentro-transfer-slot.rarity-${quality} { --ppbui-storage-quality:var(--quality-${quality}); }`));
  }
  assert.match(css,/border-bottom:var\(--ppbui-border-width\) solid var\(--ppbui-storage-quality\) !important/);
  assert.match(css,/\.pokecentro-transfer-slot\.is-selected[^}]*border-color:var\(--ppbui-selected\) !important/s);
});
