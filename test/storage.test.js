import {test} from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";
import {mountStorage} from "../src/modules/storage/controller.js";
import {findStorage} from "../src/modules/storage/dom.js";
function setup(t,count=44) {
  const dom=new JSDOM('<div class="storage-window"><div class="pokeidle-panel__body"></div></div>',{pretendToBeVisual:true});
  const doc=dom.window.document,root=doc.body.firstChild,body=root.firstChild;
  const el=(tag,cls,text)=>{const n=doc.createElement(tag);n.className=cls||"";n.textContent=text||"";return n;};
  const calls=[];
  const scene={_creatures:Array.from({length:count},(_,i)=>({id:String(i),species:{name:i===43?"Flabébé":"Eevee",normal_sprite_url:"https://example.test/sprite.png"},location:"storage"})),_storagePage:0,_inventoryPage:0,_storageLimit:2000,_panel:{body},
    pokeCentroFiltersActive(){return false;}, filterAndSortPokeCentro(list){return list.filter(c=>!this._qualityFilter || c.quality===this._qualityFilter);},
    renderPokeCentroFilters(){const bar=el('div'),controls=el('div','pokecentro-filter-bar__controls'),clear=el('button','pokecentro-filter-clear');clear.disabled=!this.pokeCentroFiltersActive();clear.addEventListener('click',()=>this.refresh());for(const [key,values] of [['_qualityFilter',['','rare']],['_elementFilter',['','fire']],['_sortBy',['name','power']]]){const select=el('select');for(const value of values){const option=el('option','',value);option.value=value;select.append(option);}select.value=this[key] || values[0];controls.append(select);}controls.append(clear);bar.append(controls);return bar;},
    renderPokeCentroVault(title,subtitle,list,side,total){
      const capacity=this.pokeCentroFiltersActive()?Math.max(42,list.length):Math.max(this._storageLimit,total),pages=Math.ceil(capacity/42);
      const vault=el('section'),header=el('header'),count=el('span','pokecentro-vault__count'),bulk=el('button','pokecentro-vault__bulk'),grid=el('div','pokecentro-slot-grid');
      bulk.addEventListener('click',()=>{const dialog=el('div','pokeidle-dialog-overlay');dialog.append(el('div','pokeidle-dialog__body'));doc.body.append(dialog);});header.append(count,bulk);vault.append(header,grid);
      for(const c of list.slice(this._storagePage*42,this._storagePage*42+42)){const slot=el('button','pokecentro-transfer-slot',c.species.name);slot.append(el('i','inventory-slot__icon'));slot.addEventListener('click',()=>calls.push(['select',c.id]));slot.addEventListener('dblclick',()=>calls.push(['transfer',c.id]));grid.append(slot);}
      const pager=el('footer','pokecentro-pager'),prev=el('button'),next=el('button');prev.addEventListener('click',()=>{this._storagePage--;this.refresh();});next.disabled=this._storagePage>=pages-1;next.addEventListener('click',()=>{this._storagePage++;this.refresh();});pager.append(prev,el('span','',String(pages)),next);vault.append(pager);return vault;
    },refresh(){body.replaceChildren(this.renderPokeCentroFilters(),this.renderPokeCentroVault('','',this.filterAndSortPokeCentro(this._creatures),'storage',this._creatures.length));}
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
  const s=setup(t);s.scene._selectedId='0';s.body.scrollTop=123;
  const next=s.root.querySelector('.pokecentro-pager button:last-child');next.focus();next.click();
  assert.equal(s.scene._selectedId,'');assert.equal(s.body.scrollTop,123);assert.equal(s.doc.activeElement,s.root.querySelector('input'));
  s.scene._creatures.push({id:'other',location:'inventory',species:{name:'Other'}});s.scene._selectedId='other';
  s.root.querySelector('.pokecentro-pager button').click();assert.equal(s.scene._selectedId,'other');
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

test('Storage keeps four filter columns and rarity tokens even for selected slots',t=>{
  const s=setup(t);const css=s.doc.querySelector('[data-ppbui-style="storage"]').textContent;
  assert.match(css,/min-width:980px/);assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/\.pokecentro-transfer-slot\.rarity-rare \{ --surface-border:var\(--quality-rare\)/);
});


test('rarity border overrides the native selected important border, not only its variable',t=>{
  const s=setup(t),css=s.doc.querySelector('[data-ppbui-style="storage"]').textContent;
  for(const quality of ['weak','common','uncommon','rare','epic','legendary','mythical']){
    assert.ok(css.includes(`.storage-window .pokecentro-transfer-slot.rarity-${quality} { --surface-border:var(--quality-${quality}); border-color:var(--quality-${quality}) !important; }`));
  }
});
