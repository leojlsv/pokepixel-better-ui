import {createTradeUI} from "./trade-ui.js";
import {createPokemonTools,pokemonToolsText} from "./ui.js";
import {categoryValue,findParts,isCategorySelect} from "../inventory/dom.js";
const toolsSelectors={body:".pokeidle-panel__body",inventory:".inventory-window--slots",toolbar:".inventory-slots-toolbar",clear:"[data-ppbui-inventory-clear]",trade:".trade-session-window",tradeList:".trade-inventory-list",tradeCard:".trade-inventory-item.is-pokemon",itemCard:".trade-inventory-item",category:"[data-ppbui-trade-category]"};
export function sceneFor(root){const win=root.ownerDocument.defaultView,cached=win.PokeIdle?.ReactiveWindows?.cached?.();return [...(Array.isArray(cached)?cached:[]),win.SceneManager?._scene].find(scene=>scene?._panel?.body===root.querySelector(toolsSelectors.body));}
function adapt(scene){const saved=[];return {wrap(key,make){const descriptor=Object.getOwnPropertyDescriptor(scene,key),original=scene[key],wrapped=make(original);scene[key]=wrapped;saved.push({key,descriptor,wrapped});},restore(){for(const {key,descriptor,wrapped}of saved.reverse())if(scene[key]===wrapped){if(descriptor)Object.defineProperty(scene,key,descriptor);else delete scene[key];}}};}
export function mountInventoryPokemon(root){
  const scene=sceneFor(root);if(!scene || !["filteredItems","createSlot","refresh"].every(key=>typeof scene[key]==="function"))return null;
  const adapter=adapt(scene),tools=createPokemonTools(root,{clearControl:false,getCreatures:()=>scene._creatures||[],refresh:()=>scene.refresh()});
  const matchesQuery=(creature,query)=>!query || [creature?.nickname,creature?.species_name,creature?.species?.name,creature?.species_id].some(value=>String(value||"").toLocaleLowerCase().includes(query));
  const inBackpack=creature=>["inventory","backpack","team"].includes(String(creature?.location||"").toLowerCase());
  const isLoadMorePokemon=node=>{const value=String(node?.textContent||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();return /(?:load|show|carregar|mostrar)\s+(?:more|mais).*pokemon/.test(value);};
  adapter.wrap("filteredItems",original=>function(){
    const list=original.call(this);if(this._category!=="pokemon")return list;
    const query=String(this._query||"").trim().toLocaleLowerCase(),seen=new Set(list.filter(item=>item?._isPokemon && item.creature?.id!=null).map(item=>String(item.creature.id)));
    const extras=(Array.isArray(this._creatures)?this._creatures:[]).filter(creature=>creature?.id!=null && !seen.has(String(creature.id)) && inBackpack(creature) && matchesQuery(creature,query)).map(creature=>({_isPokemon:true,creature}));
    return [...list,...extras].filter(item=>!item?._isPokemon || tools.matches(item.creature));
  });
  adapter.wrap("createSlot",original=>function(item){const slot=original.call(this,item);if(item._isPokemon)tools.decorate(slot,item.creature);return slot;});
  const completePokemonGrid=owner=>{
    const grid=root.querySelector(".inventory-slot-grid"),items=owner.filteredItems();if(!grid || !items.length)return;
    let rendered=grid.querySelectorAll("button.inventory-slot:not(.is-empty)").length;
    if(rendered<items.length){const firstEmpty=grid.querySelector(".inventory-slot.is-empty");for(const item of items.slice(rendered)){const slot=owner.createSlot(item);if(slot)grid.insertBefore(slot,firstEmpty);}}
    rendered=grid.querySelectorAll("button.inventory-slot:not(.is-empty)").length;
    if(rendered>=items.length)for(const action of root.querySelectorAll("button"))if(!grid.contains(action) && isLoadMorePokemon(action))action.remove();
  };
  const more=root.ownerDocument.createElement("button");more.type="button";more.className="pokeidle-btn ppbui-button";more.dataset.ppbuiInventoryMoreFilters="";
  const activeCategory=()=>categoryValue(findParts(root).category);
  const syncMore=()=>{more.textContent=tools.label();more.setAttribute("aria-expanded",String(activeCategory()==="pokemon" && tools.isOpen()));};
  const placeMore=()=>{const search=findParts(root).search;if(search && search.nextElementSibling!==more)search.after(more);};
  const selectPokemon=()=>{
    const proxy=root.querySelector("[data-ppbui-inventory-category-proxy]");
    if(proxy){if(proxy.value!=="pokemon"){proxy.value="pokemon";proxy.dispatchEvent(new root.ownerDocument.defaultView.Event("change",{bubbles:true}));}return;}
    const category=findParts(root).category;if(!category)return;
    if(isCategorySelect(category)){if(category.value!=="pokemon"){category.value="pokemon";category.dispatchEvent(new root.ownerDocument.defaultView.Event("change",{bubbles:true}));}return;}
    [...category.querySelectorAll(".inventory-category-tab[data-category]")].find(tab=>tab.dataset.category==="pokemon")?.click();
  };
  const toggleMore=()=>{const pokemon=activeCategory()==="pokemon",focused=root.ownerDocument.activeElement===more;tools.setOpen(pokemon?!tools.isOpen():true);syncMore();if(!pokemon)selectPokemon();if(focused && more.isConnected)more.focus({preventScroll:true});};
  more.addEventListener("click",toggleMore);
  adapter.wrap("refresh",original=>function(...args){const body=this._panel?.body,scroll=body?.scrollTop,result=original.apply(this,args);if(this._category==="pokemon"){completePokemonGrid(this);const panel=tools.render({summary:false});panel.dataset.ppbuiInventoryPokemonFilters="";root.querySelector(toolsSelectors.toolbar)?.after(panel);if(!this.filteredItems().length){const empty=root.ownerDocument.createElement("small");empty.className="ppbui-pokemon-empty";empty.textContent=pokemonToolsText(root.ownerDocument).none;panel.append(empty);}}else tools.setOpen(false);placeMore();syncMore();if(body)body.scrollTop=scroll;return result;});
  const clear=event=>{if(event.target.closest?.(toolsSelectors.clear))tools.reset();};root.addEventListener("click",clear,true);
  scene.refresh();return {cleanup(){root.removeEventListener("click",clear,true);more.removeEventListener("click",toggleMore);more.remove();adapter.restore();tools.cleanup();if(root.isConnected)scene.refresh();}};
}
export function mountTradePokemon(root,scene){
  const adapter=adapt(scene),tools=createPokemonTools(root,{language:"pt",getCreatures:()=>scene._creatures||[],refresh:()=>scene.render()});
  const ui=createTradeUI(root,tools);
  let category="";
  const categoryOf=item=>{const value=item.category||item.type||"misc";return value==="genetic_material"?"material":String(value).startsWith("boost")?"boost":value;};
  const names={capsule:"Poké Bolas",potion:"Poções",revive:"Revives",egg:"Ovos",evolution:"Evolução",material:"Materiais",collectible:"Colecionáveis",boost:"Boosts",misc:"Outros",item:"Itens",guild_service:"Serviços de guilda",trainer_service:"Serviços de treinador"};
  if(typeof scene.itemsTabPanel==="function")adapter.wrap("itemsTabPanel",original=>function(list){
    original.call(this,list);
    const query=this._query.trim().toLocaleLowerCase("pt-BR"),items=this._inventory.filter(item=>Number(item.qty)>0 && (!query || String(item.name||item.item_id).toLocaleLowerCase("pt-BR").includes(query))),cards=[...list.querySelectorAll(toolsSelectors.itemCard)];
    if(cards.length===items.length)cards.forEach((card,index)=>{if(category && categoryOf(items[index])!==category)card.remove();});
  });
  if(typeof scene.updateInventoryList==="function")adapter.wrap("updateInventoryList",original=>function(...args){const result=original.apply(this,args);ui.count(root.querySelectorAll(`${toolsSelectors.tradeList} ${toolsSelectors.itemCard}`).length);return result;});
  adapter.wrap("render",original=>function(...args){const result=original.apply(this,args);ui.sync();return result;});
  adapter.wrap("pokemonTabPanel",original=>function(list){
    original.call(this,list);
    const offered=new Set((this.ownOffer().creatures||[]).map(c=>String(c.creature_id))),query=this._query.trim().toLocaleLowerCase("pt-BR");
    const creatures=this._creatures.filter(c=>!offered.has(String(c.id)) && (!query || String(c.nickname||c.species_name||c.species_id).toLocaleLowerCase("pt-BR").includes(query)));
    const cards=[...list.querySelectorAll(toolsSelectors.tradeCard)];
    // Only associate the original render when the native candidate order matches.
    if(cards.length===creatures.length)cards.forEach((card,index)=>{const c=creatures[index];if(tools.matches(c))tools.decorate(card,c);else card.remove();});
    if(!list.querySelector(toolsSelectors.tradeCard)){const empty=root.ownerDocument.createElement("p");empty.className="ppbui-pokemon-empty";empty.textContent=pokemonToolsText(root.ownerDocument).none;list.append(empty);}
  });
  adapter.wrap("inventoryPanel",original=>function(){const panel=original.call(this);if(this._inventoryTab==="pokemon")ui.inventory(panel,panel.querySelectorAll(toolsSelectors.tradeCard).length);else {const values=[...new Set((this._inventory||[]).filter(item=>Number(item.qty)>0).map(categoryOf))].sort().map(id=>[id,names[id]||id]);ui.items(panel,values,category,panel.querySelectorAll(toolsSelectors.itemCard).length,value=>{category=value;scene.render();root.querySelector(toolsSelectors.category)?.focus();});}return panel;});
  adapter.wrap("renderSlots",original=>function(offer,own){const grid=original.call(this,offer,own);if(own){const entries=this.offerEntries(offer);[...grid.children].forEach((slot,index)=>{const entry=entries[index];if(entry?.offer_kind==="creature")tools.decorate(slot,{...entry,id:entry.creature_id||entry.id});});}return grid;});
  scene.render();return {cleanup(){ui.cleanup();adapter.restore();tools.cleanup();if(root.isConnected && !scene._finished)scene.render();}};
}
export function createTradePokemonModule(){let root,scene,mounted,mountKey;return {id:"trade",shouldMount(){const next=document.querySelector(toolsSelectors.trade),candidate=next&&sceneFor(next);if(next!==root || candidate!==scene){root=next;scene=candidate;mountKey=root&&scene?{root,scene}:undefined;}return !!root && !!scene && ["pokemonTabPanel","inventoryPanel","renderSlots","render"].every(key=>typeof scene[key]==="function");},getMountKey:()=>mountKey,mount(){mounted=mountTradePokemon(root,scene);return()=>mounted.cleanup();}};}
