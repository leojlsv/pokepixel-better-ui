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
    pokeCentroFiltersActive(){return false;}, filterAndSortPokeCentro(list){return list;},
    renderPokeCentroFilters(){const bar=el('div'),controls=el('div','pokecentro-filter-bar__controls'),clear=el('button','pokecentro-filter-clear');clear.disabled=!this.pokeCentroFiltersActive();clear.addEventListener('click',()=>this.refresh());controls.append(clear);bar.append(controls);return bar;},
    renderPokeCentroVault(title,subtitle,list,side,total){
      const capacity=this.pokeCentroFiltersActive()?Math.max(42,list.length):Math.max(this._storageLimit,total),pages=Math.ceil(capacity/42);
      const vault=el('section');
      for(const c of list.slice(this._storagePage*42,this._storagePage*42+42)){const slot=el('button','pokecentro-transfer-slot',c.species.name);slot.append(el('i','inventory-slot__icon'));slot.addEventListener('click',()=>calls.push(['select',c.id]));slot.addEventListener('dblclick',()=>calls.push(['transfer',c.id]));vault.append(slot);}
      const pager=el('footer','pokecentro-pager'),prev=el('button'),next=el('button');prev.addEventListener('click',()=>{this._storagePage--;this.refresh();});next.disabled=this._storagePage>=pages-1;next.addEventListener('click',()=>{this._storagePage++;this.refresh();});pager.append(prev,el('span','',String(pages)),next);vault.append(pager);return vault;
    },refresh(){body.replaceChildren(this.renderPokeCentroFilters(),this.renderPokeCentroVault('','',this.filterAndSortPokeCentro(this._creatures),'storage',this._creatures.length));}
  };
  dom.window.PokeIdle={t:(key,args)=>`${args.page}/${args.total}`,Localization:{get:()=>"en"}};dom.window.SceneManager={_scene:scene};
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
