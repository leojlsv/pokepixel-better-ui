import {test} from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";
import {createTagStore,fixedTags,freshFilters,matchesPokemon,tagService} from "../src/modules/pokemon-tools/model.js";
import {createPokemonTools} from "../src/modules/pokemon-tools/ui.js";
import {createTradePokemonModule,mountInventoryPokemon,mountTradePokemon} from "../src/modules/pokemon-tools/adapters.js";
const memory=()=>{const m=new Map();return {getItem:key=>m.get(key)||null,setItem:(key,value)=>m.set(key,value)};};
const relativeLuminance=hex=>{const rgb=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
const contrast=(a,b)=>{const [lighter,darker]=[relativeLuminance(a),relativeLuminance(b)].sort((x,y)=>y-x);return (lighter+.05)/(darker+.05);};
test('fixed tag colors remain readable across the Miyazaki 16 dark tag surfaces',()=>{
 const neutral=new Set(['#ebecdc','#c3d5c7','#b8b095']);
 for(const tag of fixedTags){assert.ok(neutral.has(tag.color),`${tag.id} must use a neutral organizational tag color`);for(const background of ['#232228','#284261'])assert.ok(contrast(tag.color,background)>=4.5,`${tag.id} ${tag.color} lacks contrast on ${background}`);}
});
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
test('generic Pokémon tools styling does not leak into an unowned Trade window',t=>{
 const s=setup(t),foreign=s.win.document.createElement('div');foreign.className='trade-session-window';foreign.innerHTML='<button class="trade-inventory-item is-pokemon"></button>';s.win.document.body.append(foreign);
 const card=foreign.firstChild,tools=createPokemonTools(s.root,{getCreatures:()=>[],refresh(){}});assert.equal(s.win.getComputedStyle(card).position,'static');tools.cleanup();
});
test('inventory filters only Pokémon context and restores native methods',t=>{
 const s=setup(t),body=s.root.firstChild,c={id:'1',quality:'rare'},items=[{_isPokemon:true,creature:c},{_isPokemon:false}];
 const scene={_panel:{body},_creatures:[c],_category:'pokemon',filteredItems(){return items;},createSlot(){return s.win.document.createElement('button');},refresh(){body.innerHTML='<div class="inventory-slots-toolbar"></div>';}};s.win.SceneManager={_scene:scene};const original=scene.filteredItems;
 const mounted=mountInventoryPokemon(s.root);const rarity=s.root.querySelector('[data-ppbui-pokemon-filter=rarity]');rarity.value='epic';rarity.dispatchEvent(new s.win.Event('change'));assert.equal(scene.filteredItems().length,1);scene._category='all';assert.equal(scene.filteredItems().length,2);mounted.cleanup();assert.equal(scene.filteredItems,original);
});
test('trade filtering does not modify offers, source creatures or native add handlers',t=>{
 const s=setup(t),body=s.root.firstChild,creatures=[{id:'1',species_name:'Eevee',quality:'rare',elements:['normal']},{id:'2',species_name:'Pikachu',quality:'epic',elements:['electric']}];let added='';const offer={creatures:[{creature_id:'offered'}]};
 const scene={_panel:{body},_creatures:creatures,_query:'',_inventoryTab:'pokemon',ownOffer:()=>offer,offerEntries:()=>[],renderSlots:()=>s.win.document.createElement('div'),pokemonTabPanel(list){for(const c of this._creatures){const card=s.win.document.createElement('button');card.className='trade-inventory-item is-pokemon';card.dataset.creatureId=c.id;card.onclick=()=>added=c.id;list.append(card);}},inventoryPanel(){const panel=s.win.document.createElement('aside'),list=s.win.document.createElement('div');list.className='trade-inventory-list';this.pokemonTabPanel(list);panel.append(list);return panel;},render(){body.replaceChildren(this.inventoryPanel());}};
 const mounted=mountTradePokemon(s.root,scene);s.root.querySelector("[data-ppbui-trade-filters]").click();assert.equal(s.win.document.querySelector('[data-ppbui-pokemon-filter=rarity]'),null,'Trade leaves rarity ownership to the native Rarities control');const element=s.win.document.querySelector('[data-ppbui-pokemon-filter=element]');element.value='electric';element.dispatchEvent(new s.win.Event('change'));const cards=s.root.querySelectorAll('.trade-inventory-item');assert.equal(cards.length,1);cards[0].click();assert.equal(added,'2');assert.equal(scene._creatures,creatures);assert.deepEqual(offer,{creatures:[{creature_id:'offered'}]});mounted.cleanup();
});
test('Trade Pokémon association is fail-closed when native cards do not prove identity',t=>{
 const s=setup(t),body=s.root.firstChild,creatures=[{id:'1',species_name:'Eevee',quality:'epic',level:10,elements:['normal']},{id:'2',species_name:'Eevee',quality:'epic',level:20,elements:['electric']}];let added='';
 const scene={_panel:{body},_creatures:creatures,_query:'',_inventoryTab:'pokemon',ownOffer:()=>({creatures:[]}),offerEntries:()=>[],renderSlots:()=>s.win.document.createElement('div'),pokemonTabPanel(list){for(const c of [...this._creatures].reverse()){const card=s.win.document.createElement('button');card.className='trade-inventory-item is-pokemon';card.setAttribute('aria-label','Eevee');card.onclick=()=>added=c.id;list.append(card);}},inventoryPanel(){const panel=s.win.document.createElement('aside'),select=s.win.document.createElement('select'),list=s.win.document.createElement('div');panel.className='trade-inventory';select.setAttribute('aria-label','Rarities');const option=s.win.document.createElement('option');option.value='epic';option.textContent='Epic';option.selected=true;select.append(option);list.className='trade-inventory-list';this.pokemonTabPanel(list);panel.append(select,list);return panel;},render(){body.replaceChildren(this.inventoryPanel());}};
 const mounted=mountTradePokemon(s.root,scene);s.root.querySelector('[data-ppbui-trade-filters]').click();const element=s.win.document.querySelector('[data-ppbui-pokemon-filter=element]');element.value='electric';element.dispatchEvent(new s.win.Event('change'));
 const cards=[...body.querySelectorAll('.trade-inventory-item.is-pokemon')];assert.equal(cards.length,2,'ambiguous same-species cards stay native instead of being positionally misidentified');for(const card of cards)assert.ok(card.classList.contains('ppbui-trade-pokemon-slot'),'identity-independent Backpack presentation still applies');
 cards[0].click();assert.equal(added,'2','native reverse-order add handler remains untouched');scene._finished=true;mounted.cleanup();
});
test('Trade More Filters removes an unresolved card when every compatible Pokémon fails the predicates',t=>{
 const s=setup(t),body=s.root.firstChild,creatures=[{id:'1',species_name:'Donphan',quality:'rare',level:1,elements:['ground']},{id:'2',species_name:'Donphan',quality:'rare',level:1,elements:['ground']},{id:'3',species_name:'Blastoise',quality:'epic',level:160,elements:['water']}];let added='';
 const scene={_panel:{body},_creatures:creatures,_query:'',_inventoryTab:'pokemon',ownOffer:()=>({creatures:[]}),offerEntries:()=>[],renderSlots:()=>s.win.document.createElement('div'),pokemonTabPanel(list){for(const c of this._creatures){const card=s.win.document.createElement('button');card.className='trade-inventory-item is-pokemon';const name=s.win.document.createElement('b'),level=s.win.document.createElement('small');name.textContent=c.species_name;level.textContent=`Nv.${c.level}`;card.append(name,level);card.onclick=()=>added=c.id;list.append(card);}},inventoryPanel(){const panel=s.win.document.createElement('aside'),select=s.win.document.createElement('select'),list=s.win.document.createElement('div');panel.className='trade-inventory';select.setAttribute('aria-label','Rarities');const all=s.win.document.createElement('option');all.value='';all.textContent='All rarities';all.selected=true;select.append(all);list.className='trade-inventory-list';panel.append(select,list);this.pokemonTabPanel(list);return panel;},updateInventoryList(){const list=body.querySelector('.trade-inventory-list');list.replaceChildren();this.pokemonTabPanel(list);},render(){body.replaceChildren(this.inventoryPanel());}};
 const mounted=mountTradePokemon(s.root,scene);body.querySelector('[data-ppbui-trade-filters]').click();const element=s.win.document.querySelector('[data-ppbui-pokemon-filter=element]'),min=s.win.document.querySelector('[data-ppbui-pokemon-filter=minLevel]');element.value='water';element.dispatchEvent(new s.win.Event('change'));min.value='150';min.dispatchEvent(new s.win.Event('change'));const cards=[...body.querySelectorAll('.trade-inventory-item.is-pokemon')];assert.equal(cards.length,1,'Donphan Nv.1 cards disappear even though two instances make identity ambiguous');assert.match(cards[0].textContent,/Blastoise/);cards[0].click();assert.equal(added,'3','the surviving native card keeps its original handler');scene._finished=true;mounted.cleanup();
});
test('Trade More Filters refreshes only the native inventory list and preserves DOM-owned Rarities selection',t=>{
 const s=setup(t),body=s.root.firstChild,creatures=[{id:'1',species_name:'Eevee',quality:'rare',level:10,elements:['normal']},{id:'2',species_name:'Pikachu',quality:'epic',level:60,elements:['electric']},{id:'3',species_name:'Raichu',quality:'epic',level:20,elements:['electric']}];let renders=0,updates=0;
 const scene={_panel:{body},_creatures:creatures,_query:'',_inventoryTab:'pokemon',ownOffer:()=>({creatures:[]}),offerEntries:()=>[],renderSlots:()=>s.win.document.createElement('div'),pokemonTabPanel(list){const rarity=body.querySelector('[aria-label=Rarities]')?.value||'';for(const c of this._creatures.filter(c=>!rarity||c.quality===rarity)){const card=s.win.document.createElement('button');card.className=`trade-inventory-item is-pokemon rarity-${c.quality}`;card.dataset.creatureId=c.id;card.setAttribute('aria-label',`${c.species_name} Lv ${c.level}`);list.append(card);}},inventoryPanel(){const panel=s.win.document.createElement('aside'),select=s.win.document.createElement('select'),list=s.win.document.createElement('div');panel.className='trade-inventory';select.setAttribute('aria-label','Rarities');for(const value of ['','rare','epic']){const option=s.win.document.createElement('option');option.value=value;option.textContent=value||'Rarities';select.append(option);}select.onchange=()=>this.updateInventoryList();list.className='trade-inventory-list';panel.append(select,list);return panel;},updateInventoryList(){updates++;const list=body.querySelector('.trade-inventory-list');list.replaceChildren();this.pokemonTabPanel(list);},render(){renders++;body.replaceChildren(this.inventoryPanel());this.updateInventoryList();}};
 const mounted=mountTradePokemon(s.root,scene),native=body.querySelector('[aria-label=Rarities]');native.value='epic';native.dispatchEvent(new s.win.Event('change'));assert.deepEqual([...body.querySelectorAll('.trade-inventory-item')].map(card=>card.dataset.creatureId),['2','3']);const renderBaseline=renders;
 body.querySelector('[data-ppbui-trade-filters]').click();const min=s.win.document.querySelector('[data-ppbui-pokemon-filter=minLevel]');min.value='50';min.dispatchEvent(new s.win.Event('change'));assert.equal(renders,renderBaseline,'Better UI filter changes do not rebuild the native Trade panel');assert.equal(body.querySelector('[aria-label=Rarities]'),native,'the original native Rarities control survives');assert.equal(native.value,'epic');assert.deepEqual([...body.querySelectorAll('.trade-inventory-item')].map(card=>card.dataset.creatureId),['2']);assert.match(body.querySelector('[data-ppbui-trade-filters]').textContent,/1/);assert.ok(updates>=3);scene._finished=true;mounted.cleanup();
});
test('Trade native Rarities narrows safe filtering candidates for duplicate species without card ids',t=>{
 const s=setup(t),body=s.root.firstChild,creatures=[{id:'1',species_name:'Eevee',quality:'rare',level:10,elements:['normal']},{id:'2',species_name:'Eevee',quality:'epic',level:60,elements:['electric']}];let added='';
 const scene={_panel:{body},_creatures:creatures,_query:'',_inventoryTab:'pokemon',ownOffer:()=>({creatures:[]}),offerEntries:()=>[],renderSlots:()=>s.win.document.createElement('div'),pokemonTabPanel(list){const rarity=body.querySelector('[aria-label=Rarities]')?.value||'';for(const c of this._creatures.filter(c=>!rarity||c.quality===rarity)){const card=s.win.document.createElement('button');card.className='trade-inventory-item is-pokemon';const name=s.win.document.createElement('b');name.textContent='Eevee';card.append(name);card.onclick=()=>added=c.id;list.append(card);}},inventoryPanel(){const panel=s.win.document.createElement('aside'),select=s.win.document.createElement('select'),list=s.win.document.createElement('div');panel.className='trade-inventory';select.setAttribute('aria-label','Rarities');for(const value of ['','rare','epic']){const option=s.win.document.createElement('option');option.value=value;option.textContent=value||'Rarities';select.append(option);}select.onchange=()=>this.updateInventoryList();list.className='trade-inventory-list';panel.append(select,list);return panel;},updateInventoryList(){const list=body.querySelector('.trade-inventory-list');list.replaceChildren();this.pokemonTabPanel(list);},render(){body.replaceChildren(this.inventoryPanel());this.updateInventoryList();}};
 const mounted=mountTradePokemon(s.root,scene),native=body.querySelector('[aria-label=Rarities]');native.value='epic';native.dispatchEvent(new s.win.Event('change'));assert.equal(body.querySelectorAll('.trade-inventory-item').length,1);body.querySelector('[data-ppbui-trade-filters]').click();const element=s.win.document.querySelector('[data-ppbui-pokemon-filter=element]');element.value='normal';element.dispatchEvent(new s.win.Event('change'));assert.equal(body.querySelectorAll('.trade-inventory-item').length,0,'selected native rarity disambiguates same-name cards so additive filters can exclude them');element.value='electric';element.dispatchEvent(new s.win.Event('change'));const card=body.querySelector('.trade-inventory-item');assert.ok(card);card.click();assert.equal(added,'2');assert.equal(native.value,'epic');scene._finished=true;mounted.cleanup();
});
test('Trade native Rarities never overrides an explicit conflicting creature id by name fallback',t=>{
 const s=setup(t),body=s.root.firstChild,creatures=[{id:'1',species_name:'Eevee',quality:'rare',elements:['normal']},{id:'2',species_name:'Eevee',quality:'epic',elements:['electric']}];
 const scene={_panel:{body},_creatures:creatures,_query:'',_inventoryTab:'pokemon',ownOffer:()=>({creatures:[]}),offerEntries:()=>[],renderSlots:()=>s.win.document.createElement('div'),pokemonTabPanel(list){const card=s.win.document.createElement('button');card.className='trade-inventory-item is-pokemon';card.dataset.creatureId='1';const name=s.win.document.createElement('b');name.textContent='Eevee';card.append(name);list.append(card);},inventoryPanel(){const panel=s.win.document.createElement('aside'),select=s.win.document.createElement('select'),list=s.win.document.createElement('div');panel.className='trade-inventory';select.setAttribute('aria-label','Rarities');for(const value of ['','epic']){const option=s.win.document.createElement('option');option.value=value;option.textContent=value||'Rarities';select.append(option);}select.value='epic';list.className='trade-inventory-list';panel.append(select,list);this.pokemonTabPanel(list);return panel;},updateInventoryList(){const list=body.querySelector('.trade-inventory-list');list.replaceChildren();this.pokemonTabPanel(list);},render(){body.replaceChildren(this.inventoryPanel());}};
 const mounted=mountTradePokemon(s.root,scene);body.querySelector('[data-ppbui-trade-filters]').click();const element=s.win.document.querySelector('[data-ppbui-pokemon-filter=element]');element.value='normal';element.dispatchEvent(new s.win.Event('change'));assert.equal(body.querySelectorAll('.trade-inventory-item').length,1,'conflicting explicit native id stays fail-closed instead of being remapped to the selected-rarity namesake');scene._finished=true;mounted.cleanup();
});
test('Trade native Rarities refuses an ambiguous selected option set for identity narrowing',t=>{
 const s=setup(t),body=s.root.firstChild,creatures=[{id:'1',species_name:'Eevee',quality:'rare',elements:['normal']},{id:'2',species_name:'Eevee',quality:'epic',elements:['electric']}];
 const scene={_panel:{body},_creatures:creatures,_query:'',_inventoryTab:'pokemon',ownOffer:()=>({creatures:[]}),offerEntries:()=>[],renderSlots:()=>s.win.document.createElement('div'),pokemonTabPanel(list){const card=s.win.document.createElement('button');card.className='trade-inventory-item is-pokemon';const name=s.win.document.createElement('b');name.textContent='Eevee';card.append(name);list.append(card);},inventoryPanel(){const panel=s.win.document.createElement('aside'),select=s.win.document.createElement('select'),list=s.win.document.createElement('div');panel.className='trade-inventory';select.multiple=true;select.setAttribute('aria-label','Rarities');for(const [value,label] of [['epic','Epic'],['future','Future']]){const option=s.win.document.createElement('option');option.value=value;option.textContent=label;option.selected=true;select.append(option);}list.className='trade-inventory-list';panel.append(select,list);this.pokemonTabPanel(list);return panel;},updateInventoryList(){const list=body.querySelector('.trade-inventory-list');list.replaceChildren();this.pokemonTabPanel(list);},render(){body.replaceChildren(this.inventoryPanel());}};
 const mounted=mountTradePokemon(s.root,scene);body.querySelector('[data-ppbui-trade-filters]').click();const element=s.win.document.querySelector('[data-ppbui-pokemon-filter=element]');element.value='normal';element.dispatchEvent(new s.win.Event('change'));assert.equal(body.querySelectorAll('.trade-inventory-item').length,1,'unknown selected rarity makes identity narrowing fail closed instead of silently dropping the unknown option');scene._finished=true;mounted.cleanup();
});
test('Trade native Rarities remains authoritative while Mais filtros keeps working and Pokémon reuse Backpack slot semantics',t=>{
 const s=setup(t),body=s.root.firstChild,creatures=[{id:'1',species_name:'Eevee',quality:'rare',level:12,elements:['normal']},{id:'2',species_name:'Pikachu',quality:'epic',level:10,elements:['electric'],is_shiny:true}];let added='',nativeRarity='';
 const scene={_panel:{body},_creatures:creatures,_query:'',_inventoryTab:'pokemon',ownOffer:()=>({creatures:[]}),offerEntries:()=>[],renderSlots:()=>s.win.document.createElement('div'),pokemonTabPanel(list){for(const c of this._creatures.filter(c=>!nativeRarity||c.quality===nativeRarity)){const card=s.win.document.createElement('button');card.className=`trade-inventory-item is-pokemon rarity-${c.quality}`;card.dataset.creatureId=c.id;card.setAttribute('aria-label',`${c.species_name} Lv ${c.level}`);const sprite=s.win.document.createElement('img');sprite.className='native-pokemon-sprite';const level=s.win.document.createElement('small');level.textContent=`Nv ${c.level}`;card.append(sprite,level);card.onclick=()=>added=c.id;list.append(card);}},inventoryPanel(){const panel=s.win.document.createElement('aside'),select=s.win.document.createElement('select'),list=s.win.document.createElement('div');panel.className='trade-inventory';select.setAttribute('aria-label','Rarities');for(const [value,label] of [['','Rarities'],['rare','Rare'],['epic','Epic']]){const option=s.win.document.createElement('option');option.value=value;option.textContent=label;select.append(option);}select.value=nativeRarity;select.onchange=()=>{nativeRarity=select.value;this.render();};list.className='trade-inventory-list';this.pokemonTabPanel(list);panel.append(select,list);return panel;},render(){body.replaceChildren(this.inventoryPanel());}};
 const mounted=mountTradePokemon(s.root,scene);let native=body.querySelector('select[aria-label=Rarities]');assert.ok(native.classList.contains('ppbui-trade-native-rarity'));assert.equal(body.querySelector('[data-ppbui-trade-filters]').textContent,'Mais filtros');const staleNative=native,staleCard=body.querySelector('.trade-inventory-item.is-pokemon');
 native.value='epic';native.dispatchEvent(new s.win.Event('change'));native=body.querySelector('select[aria-label=Rarities]');assert.equal(staleNative.isConnected,false);assert.equal(staleNative.classList.contains('ppbui-trade-native-rarity'),false,'detached native Rarities nodes release Better UI ownership during rerender');assert.equal(staleCard.isConnected,false);assert.equal(staleCard.classList.contains('ppbui-trade-pokemon-slot'),false,'detached Trade cards release Backpack presentation ownership during rerender');assert.equal(native.value,'epic');assert.ok(native.classList.contains('ppbui-trade-native-rarity'));let cards=[...body.querySelectorAll('.trade-inventory-item.is-pokemon')];assert.equal(cards.length,1);assert.equal(cards[0].dataset.creatureId,'2');for(const cls of ['inventory-slot','inventory-slot--pokemon','inventory-slot--shiny','ppbui-trade-pokemon-slot'])assert.ok(cards[0].classList.contains(cls));assert.ok(cards[0].querySelector('.ppbui-trade-pokemon-visual'));assert.ok(cards[0].querySelector('small').classList.contains('inventory-slot__pokemon-level'),'native level label adopts Backpack level positioning');
 body.querySelector('[data-ppbui-trade-filters]').click();assert.equal(s.win.document.querySelector('[data-ppbui-pokemon-filter=rarity]'),null);const min=s.win.document.querySelector('[data-ppbui-pokemon-filter=minLevel]');min.value='50';min.dispatchEvent(new s.win.Event('change'));assert.equal(body.querySelectorAll('.trade-inventory-item.is-pokemon').length,0,'Mais filtros remains effective after native Rarities narrows the candidate set');
 native=body.querySelector('select[aria-label=Rarities]');native.value='';native.dispatchEvent(new s.win.Event('change'));body.querySelector('[data-ppbui-trade-filters]').click();const level=s.win.document.querySelector('[data-ppbui-pokemon-filter=minLevel]');level.value='';level.dispatchEvent(new s.win.Event('change'));cards=[...body.querySelectorAll('.trade-inventory-item.is-pokemon')];cards[1].click();assert.equal(added,'2','native Trade add handler survives Backpack presentation classes');const kept=cards[1];scene._finished=true;mounted.cleanup();for(const cls of ['inventory-slot','inventory-slot--pokemon','ppbui-trade-pokemon-slot'])assert.equal(kept.classList.contains(cls),false,'cleanup removes only Better UI Backpack presentation ownership');
});
function pagedInventory(t,{size=205,pageSize=100,category='pokemon',pauseFirst=false,pauseFirstRead=false,failCursor='',gridFocus=true}={}){
 const s=setup(t),body=s.root.firstChild,all=Array.from({length:size},(_,index)=>({id:String(index+1),species_name:`P${index+1}`,location:index%9===0?'team':'inventory',quality:index<100?'rare':'epic'}));
 const calls=[],clicked=[],requests=[];let nativeClicks=0,releasePage,releaseRead,failureCursor=failCursor,rejectFirst=false,failFirstPage=false;
 const pause=pauseFirst?new Promise(resolve=>releasePage=resolve):null;
 const pauseRead=pauseFirstRead?new Promise(resolve=>releaseRead=resolve):null;
 const selected=()=>all.filter(c=>!s.scene._query||c.species_name.toLowerCase().includes(s.scene._query));
 const scene={_panel:{body},_creatures:[],_category:category,_query:'',_creatureCursor:'',_creaturePaged:true,
  filteredItems(){return this._creatures.filter(c=>['inventory','team'].includes(c.location)).map(creature=>({_isPokemon:true,creature,name:creature.species_name,quantity:1}));},
  createSlot(item){const slot=s.win.document.createElement('button');slot.className='inventory-slot inventory-slot--pokemon';slot.dataset.creatureId=item.creature.id;slot.addEventListener('click',()=>clicked.push(item.creature.id));return slot;},
  refresh(){const doc=s.win.document,toolbar=doc.createElement('div'),search=doc.createElement('input'),grid=doc.createElement('div');toolbar.className='inventory-slots-toolbar';search.type='search';search.className='game-window__search';search.value=this._query;toolbar.append(search);grid.className='inventory-slot-grid';if(gridFocus)grid.tabIndex=0;for(const item of this.filteredItems())grid.append(this.createSlot(item));body.replaceChildren(toolbar,grid);if(this._creatureCursor && ['all','pokemon'].includes(this._category)){const more=doc.createElement('button');more.className='pokeidle-ui-button';more.dataset.nativeLoadMore='';more.textContent='Load More Pokémons';more.addEventListener('click',()=>{nativeClicks++;void this.loadMoreCreatures();});body.append(more);}},
  async load(_showLoading=true,scope=null){if(scope && !scope.creatures)return;const query=this._query;requests.push(query);if(pauseRead)await pauseRead;else await Promise.resolve();if(query!==this._query)return;if(!failFirstPage){this._creatures=selected().slice(0,pageSize);this._creatureCursor=selected().length>pageSize?String(pageSize):'';}this.refresh();},
  async loadMoreCreatures(){if(!this._creatureCursor||this._creaturePageLoading)return;const cursor=this._creatureCursor,query=this._query;this._creaturePageLoading=true;calls.push({cursor,query});try{if(pause && calls.length===1)await pause;else await Promise.resolve();if(rejectFirst && calls.length===1)throw new Error('stale request rejected');if(cursor===failureCursor || query!==this._query || cursor!==this._creatureCursor)return;const matched=selected(),end=Math.min(matched.length,Number(cursor)+pageSize);this._creatures=[...this._creatures,...matched.slice(Number(cursor),end)];this._creatureCursor=end<matched.length?String(end):'';}finally{this._creaturePageLoading=false;this.refresh();}},
 };
 s.scene=scene;s.win.SceneManager={_scene:scene};scene._creatures=all.slice(0,pageSize);scene._creatureCursor=size>pageSize?String(pageSize):'';
 const original={filteredItems:scene.filteredItems,load:scene.load,loadMoreCreatures:scene.loadMoreCreatures,createSlot:scene.createSlot,refresh:scene.refresh};const mounted=mountInventoryPokemon(s.root);
 return {s,scene,body,all,calls,clicked,requests,mounted,original,releasePage:()=>releasePage?.(),releaseRead:()=>releaseRead?.(),setFailureCursor:value=>failureCursor=value,failNextFirstPage:()=>failFirstPage=true,recoverFirstPage:()=>failFirstPage=false,rejectPendingPage:()=>rejectFirst=true,nativeClicks:()=>nativeClicks};
}
const settleInventory=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
test('Inventory consumes all native server pages without clicking Load More or fabricating Pokémon slots',async t=>{
 const f=pagedInventory(t);await settleInventory();
 const nodes=[...f.body.querySelectorAll('button.inventory-slot--pokemon')];
 assert.equal(nodes.length,205);assert.equal(new Set(nodes.map(n=>n.dataset.creatureId)).size,205);
 assert.deepEqual(f.calls.map(c=>c.cursor),['100','200']);assert.equal(f.nativeClicks(),0);assert.equal(f.body.querySelector('[data-native-load-more]'),null);
 nodes[0].click();assert.equal(f.clicked[0],'1','slot preserves the native click handler');f.mounted.cleanup();
 assert.equal(f.scene.loadMoreCreatures,f.original.loadMoreCreatures,'Better UI never patches the native page loader');
 assert.equal(f.scene.filteredItems,f.original.filteredItems);
});
test('Inventory auto-pagination can continue when advanced filters hide all Pokémon on the first page',async t=>{
 const f=pagedInventory(t);const rarity=f.body.querySelector('[data-ppbui-pokemon-filter="rarity"]');rarity.value='epic';rarity.dispatchEvent(new f.s.win.Event('change'));await settleInventory();
 assert.equal(f.calls.length,2);assert.equal(f.body.querySelectorAll('button.inventory-slot--pokemon').length,105);
 assert.equal(f.body.querySelector('[data-native-load-more]'),null);f.mounted.cleanup();
});
test('Inventory leaves native Load More available and stops on a server page with no cursor progress',async t=>{
 const f=pagedInventory(t,{failCursor:'100'});await settleInventory();
 assert.equal(f.calls.length,1);assert.equal(f.body.querySelectorAll('button.inventory-slot--pokemon').length,100);
 assert.ok(f.body.querySelector('[data-native-load-more]'));assert.equal(f.nativeClicks(),0);
 f.setFailureCursor('');f.body.querySelector('[data-native-load-more]').click();await settleInventory();
 assert.equal(f.nativeClicks(),1);assert.equal(f.body.querySelectorAll('button.inventory-slot--pokemon').length,205);
 assert.equal(f.body.querySelector('[data-native-load-more]'),null);f.mounted.cleanup();
});
test('Inventory marks native manual retry as completed when it exhausts the final cursor',async t=>{
 const f=pagedInventory(t,{size:150,failCursor:'100',gridFocus:false});await settleInventory();
 assert.equal(f.s.root.dataset.ppbuiInventoryPagingState,'stopped');
 const before=f.body.querySelector('[data-native-load-more]');before.focus();
 f.setFailureCursor('');before.click();await settleInventory();
 assert.equal(f.calls.length,2);assert.equal(f.body.querySelectorAll('button.inventory-slot--pokemon').length,150);
 assert.equal(f.s.root.dataset.ppbuiInventoryPagingState,'complete');
 assert.equal(f.s.win.document.activeElement,f.body.querySelector('input.game-window__search'),'unfocusable grid falls back to native Search when the last Load More button disappears');
 f.mounted.cleanup();
});
test('Inventory settles failed first-page Search without retaining a false loading state or stale cursor requests',async t=>{
 const f=pagedInventory(t,{size:5,pageSize:5}),doc=f.s.win.document;
 f.scene._query='missing';f.scene.refresh();assert.equal(f.s.root.hasAttribute('data-ppbui-inventory-pokemon-pending'),true);
 f.failNextFirstPage();const search=f.body.querySelector('input.game-window__search');search.focus();
 await f.scene.load(false,{creatures:true});await settleInventory();
 assert.equal(f.s.root.hasAttribute('data-ppbui-inventory-pokemon-pending'),false);
 assert.equal(f.s.root.dataset.ppbuiInventoryPagingState,'error');
 assert.equal(f.calls.length,0);assert.equal(doc.activeElement,f.body.querySelector('input.game-window__search'),'failed first-page notification preserves Search focus');
 f.mounted.cleanup();
});
test('Inventory blocks native Load More while a new Search has an old cursor and after its first page fails',async t=>{
 const f=pagedInventory(t,{size:205,category:'healing'});
 f.scene._query='p20';f.scene._category='pokemon';f.scene.refresh();
 let button=f.body.querySelector('[data-native-load-more]');
 assert.ok(button);assert.equal(button.hidden,true);assert.equal(button.disabled,true,'old cursor cannot be clicked during a new Search');
 button.click();assert.equal(f.nativeClicks(),0);
 f.failNextFirstPage();await f.scene.load(false,{creatures:true});await settleInventory();
 button=f.body.querySelector('[data-native-load-more]');
 assert.equal(f.s.root.dataset.ppbuiInventoryPagingState,'error');
 assert.ok(button);assert.equal(button.hidden,true);assert.equal(button.disabled,true,'failed first page must not offer the old cursor');
 button.click();assert.equal(f.nativeClicks(),0);assert.equal(f.calls.length,0);
 f.scene._category='healing';f.scene.refresh();
 f.scene._category='pokemon';f.scene.refresh();
 button=f.body.querySelector('[data-native-load-more]');
 assert.ok(button?.hidden && button.disabled,'switching categories must not restore a cursor from a failed first-page Search');
 assert.equal(f.s.root.dataset.ppbuiInventoryPagingState,'error','returning to Pokémon must retain retry guidance for the failed first page');
 f.recoverFirstPage();await f.scene.load(false,{creatures:true});await settleInventory();
 assert.notEqual(f.s.root.dataset.ppbuiInventoryPagingState,'error');
 assert.equal(f.s.root.hasAttribute('data-ppbui-inventory-pokemon-pending'),false);
 assert.equal(f.body.querySelector('[data-native-load-more]'),null);
 assert.deepEqual(f.scene._creatures.map(c=>c.id),['20','200','201','202','203','204','205']);
 f.mounted.cleanup();
});
test('Inventory ignores completion of an old first-page request after cleanup and remount',async t=>{
 const f=pagedInventory(t,{size:5,category:'healing',pauseFirstRead:true});
 f.scene._query='p20';f.scene.refresh();f.failNextFirstPage();
 const previousLoad=f.scene.load(false,{creatures:true});
 f.mounted.cleanup();
 f.scene._query='';const nextMount=mountInventoryPokemon(f.s.root);
 f.scene._query='p20';f.scene.refresh();
 assert.equal(f.s.root.hasAttribute('data-ppbui-inventory-pokemon-pending'),true);
 f.releaseRead();await previousLoad;await settleInventory();
 assert.equal(f.s.root.hasAttribute('data-ppbui-inventory-pokemon-pending'),true,'old wrapper cannot clear pending state owned by a newer mount');
 assert.notEqual(f.s.root.dataset.ppbuiInventoryPagingState,'error','old wrapper cannot mark newer mount as failed');
 nextMount.cleanup();
});
test('Inventory native manual retry retains button focus if the page still fails',async t=>{
 const f=pagedInventory(t,{failCursor:'100'});await settleInventory();
 const button=f.body.querySelector('[data-native-load-more]');button.focus();button.click();await settleInventory();
 assert.equal(f.s.win.document.activeElement,f.body.querySelector('[data-native-load-more]'));
 assert.equal(f.body.querySelector('[data-native-load-more]').disabled,false);f.mounted.cleanup();
});
test('Inventory suspends paging when switching tabs and resumes on Pokémon',async t=>{
 const f=pagedInventory(t,{category:'healing'});await settleInventory();assert.equal(f.calls.length,0);
 f.scene._category='pokemon';f.scene.refresh();await settleInventory();assert.equal(f.calls.length,2);f.mounted.cleanup();
});
test('Inventory waits for a new search page and ignores the preceding cursor',async t=>{
 const f=pagedInventory(t,{pauseFirst:true});assert.equal(f.calls.length,1);
 f.scene._query='p20';f.scene.refresh();await settleInventory();assert.equal(f.calls.length,1,'search debounce must not consume cursor from the previous query');
 await f.scene.load(false,{creatures:true});f.releasePage();await settleInventory();
 assert.equal(f.calls.length,1,'new query fits one page, so no follow-up is required');
 assert.deepEqual(f.scene._creatures.map(c=>c.id),['20','200','201','202','203','204','205']);f.mounted.cleanup();
});
test('Inventory ignores a stale rejected page after search changes A-B-A and a new first page loads',async t=>{
 const f=pagedInventory(t,{pauseFirst:true});assert.equal(f.calls.length,1);
 f.scene._query='p20';f.scene.refresh();f.scene._query='';f.scene.refresh();
 await f.scene.load(false,{creatures:true});f.rejectPendingPage();f.releasePage();await settleInventory();
 assert.deepEqual(f.calls.map(call=>call.cursor),['100','100','200']);
 assert.equal(f.body.querySelectorAll('button.inventory-slot--pokemon').length,205);
 assert.equal(f.body.querySelector('[data-native-load-more]'),null);f.mounted.cleanup();
});
test('Inventory preserves keyboard focus and caret through automatic native page redraws',async t=>{
 const f=pagedInventory(t,{pauseFirst:true}),doc=f.s.win.document;
 const search=f.body.querySelector('input.game-window__search');search.focus();search.setSelectionRange(0,0);
 assert.equal(doc.activeElement,search);f.releasePage();await settleInventory();
 assert.equal(doc.activeElement,f.body.querySelector('input.game-window__search'));
 assert.equal(doc.activeElement.selectionStart,0);f.mounted.cleanup();
});
test('Inventory preserves focused Pokémon filter through consecutive page refreshes',async t=>{
 const f=pagedInventory(t,{pauseFirst:true}),doc=f.s.win.document;
 const filter=f.body.querySelector('[data-ppbui-pokemon-filter="rarity"]');filter.focus();f.releasePage();await settleInventory();
 assert.equal(doc.activeElement,f.body.querySelector('[data-ppbui-pokemon-filter="rarity"]'));
 f.mounted.cleanup();
});
test('Inventory flags pending native pages as busy without overriding external focus',async t=>{
 const f=pagedInventory(t,{pauseFirst:true}),doc=f.s.win.document;
 assert.equal(f.s.root.dataset.ppbuiInventoryPagingState,'loading');
 assert.equal(f.body.querySelector('.inventory-slot-grid').getAttribute('aria-busy'),'true');
 assert.equal(f.body.querySelector('[data-native-load-more]').disabled,true);
 const outside=doc.createElement('button');doc.body.append(outside);outside.focus();f.releasePage();await settleInventory();
 assert.equal(doc.activeElement,outside);assert.equal(f.body.querySelector('[data-native-load-more]'),null);
 assert.equal(f.s.root.dataset.ppbuiInventoryPagingState,'complete');
 f.mounted.cleanup();
});
test('Inventory limits automatic page requests and retains the native button when the budget ends',async t=>{
 const f=pagedInventory(t,{size:1,pageSize:1});let count=0;
 f.scene.loadMoreCreatures=async function(){count++;this._creatureCursor=String(Number(this._creatureCursor)+1);this.refresh();};
 f.scene._creatureCursor='1';f.scene.refresh();await settleInventory();
 assert.equal(count,100);assert.ok(f.body.querySelector('[data-native-load-more]'));
 assert.equal(f.s.root.dataset.ppbuiInventoryPagingState,'stopped');
 f.mounted.cleanup();
});
test('Inventory cleanup stops future automatic pages but lets a pending native page settle',async t=>{
 const f=pagedInventory(t,{pauseFirst:true});assert.equal(f.calls.length,1);f.mounted.cleanup();
 f.releasePage();await settleInventory();assert.equal(f.calls.length,1);
 assert.equal(f.scene.refresh,f.original.refresh);assert.equal(f.scene.load,f.original.load);
});
test('Backpack More Filters stays beside Search and switches to Pokémon before opening',t=>{
 const s=setup(t),body=s.root.firstChild,c={id:'1',species_name:'Eevee',location:'inventory'};let category='all';
 const tabs=()=>`<div class="inventory-category-tabs"><button class="inventory-category-tab is-active" data-category="${category}" aria-selected="true">${category}</button><button class="inventory-category-tab" data-category="pokemon" aria-selected="false">Pokémon</button></div>`;
 const scene={_panel:{body},_creatures:[c],_category:category,_query:'',filteredItems(){return this._category==='pokemon'?[{_isPokemon:true,creature:c}]:[];},createSlot(){const slot=s.win.document.createElement('button');slot.className='inventory-slot';return slot;},refresh(){this._category=category;body.innerHTML=`${tabs()}<div class="inventory-slots-toolbar"><input class="game-window__search"></div><div class="inventory-slot-grid"></div>`;for(const tab of body.querySelectorAll('.inventory-category-tab'))tab.onclick=()=>{category=tab.dataset.category;this.refresh();};}};
 s.win.SceneManager={_scene:scene};const mounted=mountInventoryPokemon(s.root);let more=body.querySelector('[data-ppbui-inventory-more-filters]'),search=body.querySelector('.game-window__search');assert.equal(search.nextElementSibling,more);assert.equal(more.textContent,'Poké Filters');assert.equal(more.getAttribute('aria-expanded'),'false');
 more.focus();more.click();more=body.querySelector('[data-ppbui-inventory-more-filters]');assert.equal(category,'pokemon');assert.equal(more.getAttribute('aria-expanded'),'true');assert.equal(s.win.document.activeElement,more);assert.ok(body.querySelector('[data-ppbui-inventory-pokemon-filters][open]'));assert.equal(body.querySelector('[data-ppbui-inventory-pokemon-filters] > summary').hidden,true);mounted.cleanup();
});
test('Backpack More Filters drives the Better UI category dropdown when it is present',t=>{
 const s=setup(t),body=s.root.firstChild,c={id:'1',species_name:'Eevee',location:'inventory'};let category='all';
 const tabs=()=>`<div class="inventory-category-tabs"><button class="inventory-category-tab${category==='all'?' is-active':''}" data-category="all" aria-selected="${category==='all'}">All</button><button class="inventory-category-tab${category==='pokemon'?' is-active':''}" data-category="pokemon" aria-selected="${category==='pokemon'}">Pokémon</button></div>`;
 const scene={_panel:{body},_creatures:[c],_category:category,_query:'',filteredItems(){return this._category==='pokemon'?[{_isPokemon:true,creature:c}]:[];},createSlot(){return s.win.document.createElement('button');},refresh(){this._category=category;body.innerHTML=`${tabs()}<div class="inventory-slots-toolbar"><select data-ppbui-inventory-category-proxy><option value="all">All</option><option value="pokemon">Pokémon</option></select><input class="game-window__search"></div><div class="inventory-slot-grid"></div>`;const proxy=body.querySelector('[data-ppbui-inventory-category-proxy]');proxy.value=category;proxy.onchange=()=>{category=proxy.value;this.refresh();};}};
 s.win.SceneManager={_scene:scene};const mounted=mountInventoryPokemon(s.root);body.querySelector('[data-ppbui-inventory-more-filters]').click();assert.equal(category,'pokemon');assert.equal(body.querySelector('[data-ppbui-inventory-category-proxy]').value,'pokemon');assert.equal(body.querySelector('[data-ppbui-inventory-more-filters]').getAttribute('aria-expanded'),'true');mounted.cleanup();
});
test('Trade module mount identity changes when the native window is replaced with the same scene',t=>{
 const s=setup(t),previous=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:s.win.document});t.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;});
 s.root.className='trade-session-window';const scene={_panel:{body:s.root.firstChild},pokemonTabPanel(){},inventoryPanel(){},renderSlots(){},render(){}};s.win.SceneManager={_scene:scene};
 const module=createTradePokemonModule();assert.equal(module.shouldMount(),true);const first=module.getMountKey();
 s.root.outerHTML='<div class="trade-session-window"><div class="pokeidle-panel__body"></div></div>';const replacement=s.win.document.querySelector('.trade-session-window');scene._panel.body=replacement.firstChild;
 assert.equal(module.shouldMount(),true);assert.notEqual(module.getMountKey(),first);
});

test('catalog symbols and single More Filters disclosure match the fixed design',t=>{
 const s=setup(t),tools=createPokemonTools(s.root,{getCreatures:()=>[],refresh(){}});s.root.append(tools.render());
 assert.deepEqual(fixedTags.map(t=>t.icon),['^','!','+','#','>','=','$','~','@','%']);
 const panel=s.root.querySelector('details');assert.equal(s.root.querySelectorAll('details').length,1);assert.ok(panel.classList.contains('ppbui-root'));
 for(const select of panel.querySelectorAll('select'))assert.ok(select.classList.contains('ppbui-select'));
 for(const input of panel.querySelectorAll('input'))assert.ok(input.classList.contains('ppbui-input'));
 const gender=s.root.querySelector('[data-ppbui-pokemon-filter=gender]');assert.equal(gender.parentElement.nextElementSibling.querySelector('select').dataset.ppbuiPokemonFilter,'tags');tools.cleanup();
});
test('More Filters uses Min Quality copy and module-scoped appearance-aware field chrome',t=>{
 const s=setup(t),hostile=s.win.document.createElement('style');s.root.id='hostile-pokemon-tools';hostile.textContent='#hostile-pokemon-tools input.game-window__search,#hostile-pokemon-tools select.game-window__select{border-radius:12px!important;background-image:linear-gradient(#fff,#ddd)!important;box-shadow:inset 0 0 0 3px red!important}';s.win.document.head.append(hostile);
 const tools=createPokemonTools(s.root,{getCreatures:()=>[],refresh(){}});s.root.append(tools.render());
 const quality=s.root.querySelector('[data-ppbui-pokemon-filter=quality]'),label=quality.parentElement.querySelector('span'),style=s.win.document.querySelector('style[data-ppbui-style=pokemon-tools]').textContent;
 assert.equal(label.textContent,'Min Quality');assert.equal(quality.type,'number');assert.equal(quality.step,'0.01');
 assert.match(style,/\.ppbui-pokemon-field \{[^}]*border-radius:var\(--ppbui-radius\)/);
 assert.match(style,/\.ppbui-pokemon-tools input\.game-window__search\.ppbui-input,[\s\S]*border-radius:var\(--ppbui-radius\)!important/);
 assert.equal(quality.style.getPropertyPriority('border-radius'),'important');assert.equal(quality.style.borderRadius,'inherit');
 assert.equal(s.win.getComputedStyle(quality).borderRadius,'var(--ppbui-radius)');assert.equal(s.win.getComputedStyle(quality).backgroundImage,'none');assert.equal(s.win.getComputedStyle(quality).boxShadow,'none');tools.cleanup();hostile.remove();
});
test('Alt-left-click opens attribution without native mouse actions; normal click survives',t=>{
 const s=setup(t);let clicked=0,doubled=0,down=0;const tools=createPokemonTools(s.root,{getCreatures:()=>[{id:'1',species_name:'Eevee'}],refresh(){}});
 const slot=s.win.document.createElement('button');slot.addEventListener('click',()=>clicked++);slot.addEventListener('dblclick',()=>doubled++);slot.addEventListener('mousedown',()=>down++);s.root.append(slot);tools.decorate(slot,{id:'1',species_name:'Eevee'});
 slot.dispatchEvent(new s.win.MouseEvent('mousedown',{bubbles:true,altKey:true,button:0}));slot.dispatchEvent(new s.win.MouseEvent('click',{bubbles:true,altKey:true,button:0,detail:1}));
 assert.equal(clicked,0);assert.equal(down,0);assert.equal(s.win.document.querySelectorAll('[data-ppbui-tag-choice]').length,11);
 const dialog=s.win.document.querySelector('dialog');for(const cls of ['ppbui-dialog','ppbui-root','ppbui-scroll'])assert.ok(dialog.classList.contains(cls));
 for(const action of dialog.querySelectorAll('button'))assert.ok(action.classList.contains('ppbui-button'));
 s.win.document.querySelector('[data-ppbui-tag-choice=pvp]').click();assert.deepEqual(tagService(s.win).get().get().assigned['1'],['pvp']);
 slot.dispatchEvent(new s.win.MouseEvent('dblclick',{bubbles:true,button:0,detail:2}));assert.equal(doubled,0);
 slot.click();assert.equal(clicked,1);tools.cleanup();slot.click();assert.equal(clicked,2);
});
test('tag dialog returns focus to the current creature slot after a native Inventory redraw',t=>{
 const s=setup(t),doc=s.win.document,c={id:'1',species_name:'Eevee',location:'inventory'};
 const tools=createPokemonTools(s.root,{getCreatures:()=>[c],refresh(){}});
 const createSlot=()=>{const n=doc.createElement('button');n.className='inventory-slot inventory-slot--pokemon';n.dataset.creatureId=c.id;tools.decorate(n,c);return n;};
 let slot=createSlot();s.root.append(slot);
 const open=()=>{slot.dispatchEvent(new s.win.MouseEvent('click',{bubbles:true,altKey:true,button:0,detail:1}));return doc.querySelector('dialog.ppbui-tag-dialog');};
 const replace=()=>{const old=slot;slot=createSlot();old.replaceWith(slot);};
 let dialog=open();assert.ok(dialog);replace();dialog.querySelector('button[aria-label="Close"]').click();assert.equal(doc.activeElement,slot,'Close reacquires current creature ID');
 dialog=open();replace();dialog.querySelector('[data-ppbui-tag-choice="sell"]').click();assert.equal(doc.activeElement,slot,'Save reacquires current creature ID');
 assert.deepEqual(tagService(s.win).get().get().assigned[c.id],['sell']);
 dialog=open();replace();dialog.dispatchEvent(new s.win.Event('cancel',{bubbles:true,cancelable:true}));assert.equal(doc.activeElement,slot,'Escape reacquires current creature ID');
 dialog=open();replace();s.owner('other');dialog.querySelector('button[aria-label="Close"]').click();assert.notEqual(doc.activeElement,slot,'owner switch cannot focus a foreign session slot');
 tools.cleanup();
});
test('tag assignment restores focus after its own microtask refresh rebuilds the native slot',async t=>{
 const s=setup(t),c={id:'42',species_name:'Ditto',location:'inventory'};let slot,tools;
 const refresh=()=>{const next=s.win.document.createElement('button');next.className='inventory-slot inventory-slot--pokemon';next.dataset.creatureId=c.id;s.root.replaceChildren(next);tools.decorate(next,c);slot=next;};
 tools=createPokemonTools(s.root,{getCreatures:()=>[c],refresh});refresh();
 slot.dispatchEvent(new s.win.MouseEvent('click',{bubbles:true,altKey:true,button:0,detail:1}));
 const dialog=s.win.document.querySelector('dialog.ppbui-tag-dialog');assert.ok(dialog);
 dialog.querySelector('[data-ppbui-tag-choice="keep"]').click();
 await Promise.resolve();await Promise.resolve();
 assert.equal(s.win.document.activeElement,slot);assert.deepEqual(tagService(s.win).get().get().assigned[c.id],['keep']);tools.cleanup();
});
test('tag edit returns focus to Search when the new tag removes its Pokémon from a filtered grid',async t=>{
 const s=setup(t),body=s.root.firstChild,c={id:'77',species_name:'Eevee',location:'inventory'};
 body.innerHTML='<div class="inventory-slots-toolbar"><input type="search" class="game-window__search"></div><div class="inventory-slot-grid"></div>';
 let tools;
 const refresh=()=>{
   const grid=body.querySelector('.inventory-slot-grid');grid.replaceChildren();
   if(tools.matches(c)){
     const slot=s.win.document.createElement('button');slot.className='inventory-slot inventory-slot--pokemon';
     slot.dataset.creatureId=c.id;grid.append(slot);tools.decorate(slot,c);
   }
 };
 tools=createPokemonTools(s.root,{getCreatures:()=>[c],refresh});s.root.append(tools.render());
 const tags=s.root.querySelector('[data-ppbui-pokemon-filter="tags"]');tags.value='untagged';tags.dispatchEvent(new s.win.Event('change'));
 const slot=body.querySelector('button.inventory-slot');assert.ok(slot);
 slot.dispatchEvent(new s.win.MouseEvent('click',{bubbles:true,altKey:true,button:0,detail:1}));
 s.win.document.querySelector('dialog.ppbui-tag-dialog [data-ppbui-tag-choice="keep"]').click();
 await Promise.resolve();await Promise.resolve();
 assert.equal(body.querySelector('button.inventory-slot'),null,'tag filter removes the modified Pokémon');
 assert.equal(s.win.document.activeElement,body.querySelector('input.game-window__search'),'Search remains focusable when the selected Pokémon is no longer present');
 tools.cleanup();
});
test('tag dialog removal, cancellation and owner changes do not assign to another account',t=>{
 const s=setup(t),tools=createPokemonTools(s.root,{getCreatures:()=>[],refresh(){}}),slot=s.win.document.createElement('button');s.root.append(slot);tools.decorate(slot,{id:'1'});
 const open=()=>slot.dispatchEvent(new s.win.MouseEvent('click',{bubbles:true,altKey:true,button:0}));
 tagService(s.win).get().assign('1','keep');open();s.win.document.querySelector('[data-ppbui-tag-choice=remove]').click();assert.equal(tagService(s.win).get().get().assigned['1'],undefined);
 open();s.owner('b');s.win.document.querySelector('[data-ppbui-tag-choice=boss]').click();assert.deepEqual(tagService(s.win).get().get().assigned,{});
 open();s.win.document.querySelector('dialog').dispatchEvent(new s.win.Event('cancel',{cancelable:true}));assert.equal(s.win.document.querySelector('dialog'),null);tools.cleanup();
});
