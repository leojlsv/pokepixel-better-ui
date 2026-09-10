import {test} from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";
import {createTagStore,fixedTags,freshFilters,matchesPokemon,tagService} from "../src/modules/pokemon-tools/model.js";
import {createPokemonTools} from "../src/modules/pokemon-tools/ui.js";
import {mountInventoryPokemon,mountTradePokemon} from "../src/modules/pokemon-tools/adapters.js";
const memory=()=>{const m=new Map();return {getItem:key=>m.get(key)||null,setItem:(key,value)=>m.set(key,value)};};
test('fixed tags persist by creature and owner; assigning replaces and removing clears',()=>{
 const storage=memory(),a=createTagStore({storage,owner:'a'});a.assign('pokemon-1','keep');a.assign('pokemon-1','sell');
 const restored=createTagStore({storage,owner:'a'});assert.deepEqual(restored.get().assigned['pokemon-1'],['sell']);assert.deepEqual(createTagStore({storage,owner:'b'}).get().assigned,{});
 restored.assign('pokemon-1',null);assert.equal(restored.get().assigned['pokemon-1'],undefined);assert.equal(restored.get().tags.length,10);
 restored.assign('pokemon-1','custom');assert.equal(restored.get().assigned['pokemon-1'],undefined);
});
test('legacy exact-name migration preserves v1 and leaves ambiguous assignments unassigned',()=>{
 const storage=memory(),legacy=JSON.stringify({tags:[{id:'a',name:' Keep '},{id:'b',name:'Farm'},{id:'c',name:'Collection'}],assigned:{one:['a'],ambiguous:['a','b'],unmatched:['c']}});
 storage.setItem('ppbui:pokemon-tags:v1:a',legacy);const store=createTagStore({storage,owner:'a'});
 assert.deepEqual(store.get().assigned,{one:['keep']});assert.equal(storage.getItem('ppbui:pokemon-tags:v1:a'),legacy);
 store.assign('one',null);assert.deepEqual(createTagStore({storage,owner:'a'}).get().assigned,{});
});
test('corrupt storage and denied writes stay usable and never report persistence',()=>{
 const store=createTagStore({owner:'a',storage:{getItem(){return '{bad';},setItem(){throw Error();}}});assert.equal(store.persistent(),false);store.assign('1','farm');assert.deepEqual(store.get().assigned['1'],['farm']);assert.equal(store.persistent(),false);
});
test('tags use OR while distinct Pokémon filters use AND; missing stats are excluded',()=>{
 const f=freshFilters();f.tags=['a','b'];f.iv='100';f.element='water';f.shiny='yes';
 const c={elements:['water'],iv_total:150,is_shiny:true};assert.ok(matchesPokemon(c,f,['b']));assert.equal(matchesPokemon(c,f,['c']),false);assert.equal(matchesPokemon({...c,iv_total:null},f,['a']),false);
 f.tags=['untagged'];assert.ok(matchesPokemon(c,f,[]));assert.equal(matchesPokemon(c,f,['b']),false);
});
test('IV fallback requires six complete values and ranges are inclusive',()=>{
 const f={...freshFilters(),iv:'186',minLevel:'5',maxLevel:'5',quality:'1.4'};
 const c={level:5,quality_multiplier:1.4,ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31}};assert.ok(matchesPokemon(c,f));assert.equal(matchesPokemon({...c,ivs:{hp:31}},f),false);
});
function setup(t){const dom=new JSDOM('<div><div class="pokeidle-panel__body"></div></div>',{url:'https://test.local',pretendToBeVisual:true});const win=dom.window;let owner='a';win.PokeIdle={Auth:{getTrainerSummary:()=>({id:owner})},Localization:{get:()=> 'en'},t:key=>key,Dialog:{confirm:async()=>true}};t.after(()=>win.close());return {win,root:win.document.body.firstChild,owner:value=>owner=value};}
test('service changes owner without leaking tags',t=>{const s=setup(t),service=tagService(s.win);service.get().assign('1','keep');s.owner('b');assert.deepEqual(service.get().get().assigned,{});s.owner('a');assert.deepEqual(service.get().get().assigned['1'],['keep']);});
test('UI tag edits are local and markers keep native clicks intact',async t=>{
 const s=setup(t),store=tagService(s.win).get(),id='sell';store.assign('1',id);let refreshes=0;
 const tools=createPokemonTools(s.root,{getCreatures:()=>[{id:'1',species_name:'Eevee',level:1}],refresh:()=>refreshes++});s.root.append(tools.render());
 const slot=s.win.document.createElement('button');let clicked=0;slot.onclick=()=>clicked++;s.root.append(slot);tools.decorate(slot,{id:'1'});slot.click();assert.equal(clicked,1);assert.match(slot.title,/Sell/);assert.equal(slot.querySelectorAll('.ppbui-pokemon-marker').length,1);
 store.assign('1',null);await Promise.resolve();assert.equal(refreshes,1);tools.cleanup();assert.equal(slot.title,'');assert.equal(slot.querySelector('.ppbui-pokemon-marker'),null);
});
test('inventory filters only Pokémon context and restores native methods',t=>{
 const s=setup(t),body=s.root.firstChild,c={id:'1',quality:'rare'},items=[{_isPokemon:true,creature:c},{_isPokemon:false}];
 const scene={_panel:{body},_creatures:[c],_category:'pokemon',filteredItems(){return items;},createSlot(){return s.win.document.createElement('button');},refresh(){body.innerHTML='<div class="inventory-slots-toolbar"></div>';}};s.win.SceneManager={_scene:scene};const original=scene.filteredItems;
 const mounted=mountInventoryPokemon(s.root);const rarity=s.root.querySelector('[data-ppbui-pokemon-filter=rarity]');rarity.value='epic';rarity.dispatchEvent(new s.win.Event('change'));assert.equal(scene.filteredItems().length,1);scene._category='all';assert.equal(scene.filteredItems().length,2);mounted.cleanup();assert.equal(scene.filteredItems,original);
});
test('trade filtering does not modify offers, source creatures or native add handlers',t=>{
 const s=setup(t),body=s.root.firstChild,creatures=[{id:'1',species_name:'Eevee',quality:'rare'},{id:'2',species_name:'Pikachu',quality:'epic'}];let added='';const offer={creatures:[{creature_id:'offered'}]};
 const scene={_panel:{body},_creatures:creatures,_query:'',_inventoryTab:'pokemon',ownOffer:()=>offer,offerEntries:()=>[],renderSlots:()=>s.win.document.createElement('div'),pokemonTabPanel(list){for(const c of this._creatures){const card=s.win.document.createElement('button');card.className='trade-inventory-item is-pokemon';card.onclick=()=>added=c.id;list.append(card);}},inventoryPanel(){const panel=s.win.document.createElement('aside'),list=s.win.document.createElement('div');list.className='trade-inventory-list';this.pokemonTabPanel(list);panel.append(list);return panel;},render(){body.replaceChildren(this.inventoryPanel());}};
 const mounted=mountTradePokemon(s.root,scene);const rarity=s.root.querySelector('[data-ppbui-pokemon-filter=rarity]');rarity.value='epic';rarity.dispatchEvent(new s.win.Event('change'));const cards=s.root.querySelectorAll('.trade-inventory-item');assert.equal(cards.length,1);cards[0].click();assert.equal(added,'2');assert.equal(scene._creatures,creatures);assert.deepEqual(offer,{creatures:[{creature_id:'offered'}]});mounted.cleanup();
});

test('catalog symbols and single More Filters disclosure match the fixed design',t=>{
 const s=setup(t),tools=createPokemonTools(s.root,{getCreatures:()=>[],refresh(){}});s.root.append(tools.render());
 assert.deepEqual(fixedTags.map(t=>t.icon),['^','!','+','#','>','=','$','~','@','%']);
 assert.equal(s.root.querySelectorAll('details').length,1);const gender=s.root.querySelector('[data-ppbui-pokemon-filter=gender]');assert.equal(gender.parentElement.nextElementSibling.querySelector('select').dataset.ppbuiPokemonFilter,'tags');tools.cleanup();
});
test('Alt-left-click opens attribution without native mouse actions; normal click survives',t=>{
 const s=setup(t);let clicked=0,doubled=0,down=0;const tools=createPokemonTools(s.root,{getCreatures:()=>[{id:'1',species_name:'Eevee'}],refresh(){}});
 const slot=s.win.document.createElement('button');slot.addEventListener('click',()=>clicked++);slot.addEventListener('dblclick',()=>doubled++);slot.addEventListener('mousedown',()=>down++);s.root.append(slot);tools.decorate(slot,{id:'1',species_name:'Eevee'});
 slot.dispatchEvent(new s.win.MouseEvent('mousedown',{bubbles:true,altKey:true,button:0}));slot.dispatchEvent(new s.win.MouseEvent('click',{bubbles:true,altKey:true,button:0,detail:1}));
 assert.equal(clicked,0);assert.equal(down,0);assert.equal(s.win.document.querySelectorAll('[data-ppbui-tag-choice]').length,11);
 s.win.document.querySelector('[data-ppbui-tag-choice=pvp]').click();assert.deepEqual(tagService(s.win).get().get().assigned['1'],['pvp']);
 slot.dispatchEvent(new s.win.MouseEvent('dblclick',{bubbles:true,button:0,detail:2}));assert.equal(doubled,0);
 slot.click();assert.equal(clicked,1);tools.cleanup();slot.click();assert.equal(clicked,2);
});
test('tag dialog removal, cancellation and owner changes do not assign to another account',t=>{
 const s=setup(t),tools=createPokemonTools(s.root,{getCreatures:()=>[],refresh(){}}),slot=s.win.document.createElement('button');s.root.append(slot);tools.decorate(slot,{id:'1'});
 const open=()=>slot.dispatchEvent(new s.win.MouseEvent('click',{bubbles:true,altKey:true,button:0}));
 tagService(s.win).get().assign('1','keep');open();s.win.document.querySelector('[data-ppbui-tag-choice=remove]').click();assert.equal(tagService(s.win).get().get().assigned['1'],undefined);
 open();s.owner('b');s.win.document.querySelector('[data-ppbui-tag-choice=boss]').click();assert.deepEqual(tagService(s.win).get().get().assigned,{});
 open();s.win.document.querySelector('dialog').dispatchEvent(new s.win.Event('cancel',{cancelable:true}));assert.equal(s.win.document.querySelector('dialog'),null);tools.cleanup();
});
