import {test} from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";
import {createTagStore,freshFilters,matchesPokemon,tagService} from "../src/modules/pokemon-tools/model.js";
import {createPokemonTools} from "../src/modules/pokemon-tools/ui.js";
import {mountInventoryPokemon,mountTradePokemon} from "../src/modules/pokemon-tools/adapters.js";
const memory=()=>{const m=new Map();return {getItem:key=>m.get(key)||null,setItem:(key,value)=>m.set(key,value)};};
test('tags persist by individual creature and owner, rename and delete clean assignments',()=>{
 const storage=memory(),a=createTagStore({storage,owner:'a'}),id=a.put('Collection','★');a.assign('pokemon-1',[id]);a.put('Keep','◆',id);
 const restored=createTagStore({storage,owner:'a'});assert.equal(restored.get().tags[0].name,'Keep');assert.deepEqual(restored.get().assigned['pokemon-1'],[id]);assert.equal(createTagStore({storage,owner:'b'}).get().tags.length,0);
 restored.remove(id);assert.deepEqual(restored.get().assigned['pokemon-1'],[]);
});
test('corrupt storage and denied writes stay usable and never report persistence',()=>{
 const store=createTagStore({owner:'a',storage:{getItem(){return '{bad';},setItem(){throw Error();}}});assert.equal(store.persistent(),false);store.put('Trade','↔');assert.equal(store.get().tags.length,1);assert.equal(store.persistent(),false);
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
test('service changes owner without leaking tags',t=>{const s=setup(t),service=tagService(s.win);service.get().put('Collection','★');s.owner('b');assert.equal(service.get().get().tags.length,0);s.owner('a');assert.equal(service.get().get().tags.length,1);});
test('UI tag edits are local and markers keep native clicks intact',async t=>{
 const s=setup(t),store=tagService(s.win).get(),id=store.put('Trade','↔');store.assign('1',[id]);let refreshes=0;
 const tools=createPokemonTools(s.root,{getCreatures:()=>[{id:'1',species_name:'Eevee',level:1}],refresh:()=>refreshes++});s.root.append(tools.render());
 const slot=s.win.document.createElement('button');let clicked=0;slot.onclick=()=>clicked++;s.root.append(slot);tools.decorate(slot,{id:'1'});slot.click();assert.equal(clicked,1);assert.match(slot.title,/Trade/);assert.equal(slot.querySelectorAll('.ppbui-pokemon-marker').length,1);
 store.assign('1',[]);await Promise.resolve();assert.equal(refreshes,1);tools.cleanup();assert.equal(slot.title,'');assert.equal(slot.querySelector('.ppbui-pokemon-marker'),null);
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
