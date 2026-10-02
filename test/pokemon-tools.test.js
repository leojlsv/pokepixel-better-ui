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
 const s=setup(t),body=s.root.firstChild,creatures=[{id:'1',species_name:'Eevee',quality:'rare'},{id:'2',species_name:'Pikachu',quality:'epic'}];let added='';const offer={creatures:[{creature_id:'offered'}]};
 const scene={_panel:{body},_creatures:creatures,_query:'',_inventoryTab:'pokemon',ownOffer:()=>offer,offerEntries:()=>[],renderSlots:()=>s.win.document.createElement('div'),pokemonTabPanel(list){for(const c of this._creatures){const card=s.win.document.createElement('button');card.className='trade-inventory-item is-pokemon';card.onclick=()=>added=c.id;list.append(card);}},inventoryPanel(){const panel=s.win.document.createElement('aside'),list=s.win.document.createElement('div');list.className='trade-inventory-list';this.pokemonTabPanel(list);panel.append(list);return panel;},render(){body.replaceChildren(this.inventoryPanel());}};
 const mounted=mountTradePokemon(s.root,scene);s.root.querySelector("[data-ppbui-trade-filters]").click();const rarity=s.win.document.querySelector('[data-ppbui-pokemon-filter=rarity]');rarity.value='epic';rarity.dispatchEvent(new s.win.Event('change'));const cards=s.root.querySelectorAll('.trade-inventory-item');assert.equal(cards.length,1);cards[0].click();assert.equal(added,'2');assert.equal(scene._creatures,creatures);assert.deepEqual(offer,{creatures:[{creature_id:'offered'}]});mounted.cleanup();
});
test('inventory completes the native Pokémon batch from already-loaded Backpack creatures',t=>{
 const s=setup(t),body=s.root.firstChild,creatures=[{id:'1',species_name:'Eevee',location:'inventory'},{id:'2',species_name:'Pikachu',location:'team'},{id:'3',species_name:'Abra',location:'inventory'},{id:'4',species_name:'Boxed',location:'storage'},{id:'5',species_name:'Unknown'},{id:'6',species_name:'Contradiction',location:'storage',equipped:true}];
 const scene={_panel:{body},_creatures:creatures,_category:'pokemon',_query:'',filteredItems(){return this._creatures.slice(0,2).map(creature=>({_isPokemon:true,creature}));},createSlot(item){const slot=s.win.document.createElement('button');slot.className='inventory-slot';slot.dataset.id=item.creature.id;return slot;},refresh(){body.innerHTML='<div class="inventory-slots-toolbar"><input class="game-window__search"></div><div class="inventory-slot-grid"></div>';const items=this.filteredItems(),grid=body.querySelector('.inventory-slot-grid');for(const item of items)grid.append(this.createSlot(item));if(items.length<3){const load=s.win.document.createElement('button');load.dataset.nativeLoadMore='';load.textContent='Load More Pokémons';body.append(load);}}};
 s.win.SceneManager={_scene:scene};const mounted=mountInventoryPokemon(s.root);
 assert.deepEqual([...body.querySelectorAll('.inventory-slot')].map(node=>node.dataset.id),['1','2','3']);assert.equal(body.querySelector('[data-native-load-more]'),null);assert.equal(scene.filteredItems().some(item=>['4','5','6'].includes(item.creature?.id)),false);
  mounted.cleanup();
});
test('inventory completion follows native species.name search shape',t=>{
 const s=setup(t),body=s.root.firstChild,creature={id:'1',species:{name:'Mr. Mime'},location:'inventory'};
 const scene={_panel:{body},_creatures:[creature],_category:'pokemon',_query:'mime',filteredItems(){return [];},createSlot(item){const slot=s.win.document.createElement('button');slot.className='inventory-slot';slot.dataset.id=item.creature.id;return slot;},refresh(){body.innerHTML='<div class="inventory-slots-toolbar"><input class="game-window__search"></div><div class="inventory-slot-grid"></div>';}};
 s.win.SceneManager={_scene:scene};const mounted=mountInventoryPokemon(s.root);assert.equal(scene.filteredItems().length,1);mounted.cleanup();
});
test('inventory removes native Load More only after filling a post-filter render cap',t=>{
 const s=setup(t),body=s.root.firstChild,creatures=['1','2','3'].map(id=>({id,species_name:`P${id}`,location:'inventory'}));
 const scene={_panel:{body},_creatures:creatures,_category:'pokemon',_query:'',filteredItems(){return this._creatures.map(creature=>({_isPokemon:true,creature}));},createSlot(item){const slot=s.win.document.createElement('button');slot.className='inventory-slot';slot.dataset.id=item.creature.id;return slot;},refresh(){body.innerHTML='<div class="inventory-slots-toolbar"><input class="game-window__search"></div><div class="inventory-slot-grid"></div>';const grid=body.querySelector('.inventory-slot-grid'),items=this.filteredItems();for(const item of items.slice(0,2))grid.append(this.createSlot(item));const load=s.win.document.createElement('button');load.dataset.nativeLoadMore='';load.textContent='Load More Pokémons';body.append(load);}};
 s.win.SceneManager={_scene:scene};const mounted=mountInventoryPokemon(s.root);
 assert.deepEqual([...body.querySelectorAll('.inventory-slot')].map(node=>node.dataset.id),['1','2','3']);assert.equal(body.querySelector('[data-native-load-more]'),null);mounted.cleanup();
});
test('Backpack More Filters stays beside Search and switches to Pokémon before opening',t=>{
 const s=setup(t),body=s.root.firstChild,c={id:'1',species_name:'Eevee',location:'inventory'};let category='all';
 const tabs=()=>`<div class="inventory-category-tabs"><button class="inventory-category-tab is-active" data-category="${category}" aria-selected="true">${category}</button><button class="inventory-category-tab" data-category="pokemon" aria-selected="false">Pokémon</button></div>`;
 const scene={_panel:{body},_creatures:[c],_category:category,_query:'',filteredItems(){return this._category==='pokemon'?[{_isPokemon:true,creature:c}]:[];},createSlot(){const slot=s.win.document.createElement('button');slot.className='inventory-slot';return slot;},refresh(){this._category=category;body.innerHTML=`${tabs()}<div class="inventory-slots-toolbar"><input class="game-window__search"></div><div class="inventory-slot-grid"></div>`;for(const tab of body.querySelectorAll('.inventory-category-tab'))tab.onclick=()=>{category=tab.dataset.category;this.refresh();};}};
 s.win.SceneManager={_scene:scene};const mounted=mountInventoryPokemon(s.root);let more=body.querySelector('[data-ppbui-inventory-more-filters]'),search=body.querySelector('.game-window__search');assert.equal(search.nextElementSibling,more);assert.equal(more.getAttribute('aria-expanded'),'false');
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
test('tag dialog removal, cancellation and owner changes do not assign to another account',t=>{
 const s=setup(t),tools=createPokemonTools(s.root,{getCreatures:()=>[],refresh(){}}),slot=s.win.document.createElement('button');s.root.append(slot);tools.decorate(slot,{id:'1'});
 const open=()=>slot.dispatchEvent(new s.win.MouseEvent('click',{bubbles:true,altKey:true,button:0}));
 tagService(s.win).get().assign('1','keep');open();s.win.document.querySelector('[data-ppbui-tag-choice=remove]').click();assert.equal(tagService(s.win).get().get().assigned['1'],undefined);
 open();s.owner('b');s.win.document.querySelector('[data-ppbui-tag-choice=boss]').click();assert.deepEqual(tagService(s.win).get().get().assigned,{});
 open();s.win.document.querySelector('dialog').dispatchEvent(new s.win.Event('cancel',{cancelable:true}));assert.equal(s.win.document.querySelector('dialog'),null);tools.cleanup();
});
