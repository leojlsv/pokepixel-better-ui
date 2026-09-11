import {createTradeUI} from "./trade-ui.js";
import {createPokemonTools,pokemonToolsText} from "./ui.js";
export const toolsSelectors={body:".pokeidle-panel__body",inventory:".inventory-window--slots",toolbar:".inventory-slots-toolbar",clear:"[data-ppbui-inventory-clear]",trade:".trade-session-window",tradeList:".trade-inventory-list",tradeCard:".trade-inventory-item.is-pokemon"};
export function sceneFor(root){const win=root.ownerDocument.defaultView,cached=win.PokeIdle?.ReactiveWindows?.cached?.();return [...(Array.isArray(cached)?cached:[]),win.SceneManager?._scene].find(scene=>scene?._panel?.body===root.querySelector(toolsSelectors.body));}
function adapt(scene){const saved=[];return {wrap(key,make){const descriptor=Object.getOwnPropertyDescriptor(scene,key),original=scene[key],wrapped=make(original);scene[key]=wrapped;saved.push({key,descriptor,wrapped});},restore(){for(const {key,descriptor,wrapped}of saved.reverse())if(scene[key]===wrapped){if(descriptor)Object.defineProperty(scene,key,descriptor);else delete scene[key];}}};}
export function mountInventoryPokemon(root){
  const scene=sceneFor(root);if(!scene || !["filteredItems","createSlot","refresh"].every(key=>typeof scene[key]==="function"))return null;
  const adapter=adapt(scene),tools=createPokemonTools(root,{clearControl:false,getCreatures:()=>scene._creatures||[],refresh:()=>scene.refresh()});
  adapter.wrap("filteredItems",original=>function(){const list=original.call(this);return this._category==="pokemon"?list.filter(item=>!item._isPokemon || tools.matches(item.creature)):list;});
  adapter.wrap("createSlot",original=>function(item){const slot=original.call(this,item);if(item._isPokemon)tools.decorate(slot,item.creature);return slot;});
  adapter.wrap("refresh",original=>function(...args){const body=this._panel?.body,scroll=body?.scrollTop,result=original.apply(this,args);if(this._category==="pokemon"){const panel=tools.render();root.querySelector(toolsSelectors.toolbar)?.after(panel);if(!this.filteredItems().length){const empty=root.ownerDocument.createElement("small");empty.className="ppbui-pokemon-empty";empty.textContent=pokemonToolsText(root.ownerDocument).none;panel.append(empty);}}if(body)body.scrollTop=scroll;return result;});
  const clear=event=>{if(event.target.closest?.(toolsSelectors.clear))tools.reset();};root.addEventListener("click",clear,true);
  scene.refresh();return {cleanup(){root.removeEventListener("click",clear,true);adapter.restore();tools.cleanup();if(root.isConnected)scene.refresh();}};
}
export function mountTradePokemon(root,scene){
  const adapter=adapt(scene),tools=createPokemonTools(root,{getCreatures:()=>scene._creatures||[],refresh:()=>scene.render()});
  const ui=createTradeUI(root,tools);
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
  adapter.wrap("inventoryPanel",original=>function(){const panel=original.call(this);if(this._inventoryTab==="pokemon")ui.inventory(panel,panel.querySelectorAll(toolsSelectors.tradeCard).length);else ui.close();return panel;});
  adapter.wrap("renderSlots",original=>function(offer,own){const grid=original.call(this,offer,own);if(own){const entries=this.offerEntries(offer);[...grid.children].forEach((slot,index)=>{const entry=entries[index];if(entry?.offer_kind==="creature")tools.decorate(slot,{...entry,id:entry.creature_id||entry.id});});}return grid;});
  scene.render();return {cleanup(){ui.cleanup();adapter.restore();tools.cleanup();if(root.isConnected && !scene._finished)scene.render();}};
}
export function createTradePokemonModule(){let root,scene,mounted;return {id:"trade",shouldMount(){const next=document.querySelector(toolsSelectors.trade),candidate=next&&sceneFor(next);root=next;scene=candidate;return !!root && !!scene && ["pokemonTabPanel","inventoryPanel","renderSlots","render"].every(key=>typeof scene[key]==="function");},getMountKey:()=>scene,mount(){mounted=mountTradePokemon(root,scene);return()=>mounted.cleanup();}};}
