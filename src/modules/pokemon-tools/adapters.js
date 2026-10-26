import {createTradeUI} from "./trade-ui.js";
import {createPokemonTools,pokemonToolsText} from "./ui.js";
import {categoryValue,findParts,inventoryAvailableInCardMode,isCategorySelect} from "../inventory/dom.js";
const toolsSelectors={body:".pokeidle-panel__body",inventory:".inventory-window--slots",toolbar:".inventory-slots-toolbar",clear:"[data-ppbui-inventory-clear]",trade:".trade-session-window",tradeList:".trade-inventory-list",tradeCard:".trade-inventory-item.is-pokemon",itemCard:".trade-inventory-item",category:"[data-ppbui-trade-category]"};
const normalized=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLocaleLowerCase();
const identityText=value=>normalized(value).replace(/[^\p{L}\p{N}]+/gu," ").trim();
const cardCreatureId=card=>card?.dataset?.creatureId||card?.querySelector?.("[data-creature-id]")?.dataset?.creatureId||"";
const creatureNames=creature=>[creature?.nickname,creature?.species_name,creature?.species?.name,creature?.species_id].map(identityText).filter(name=>name && /\p{L}/u.test(name));
const tradeRarities=["weak","common","uncommon","rare","epic","legendary","mythical","god"];
const tradeRarityAliases=new Map(Object.entries({weak:"weak",fraca:"weak",fraco:"weak",common:"common",comum:"common",uncommon:"uncommon",incomum:"uncommon",rare:"rare",rara:"rare",raro:"rare",epic:"epic",epica:"epic",epico:"epic",legendary:"legendary",lendaria:"legendary",lendario:"legendary",mythical:"mythical",mitica:"mythical",mitico:"mythical",god:"god"}));
const boundedIdentity=(haystack,name)=>Boolean(haystack&&name&&(` ${haystack} `).includes(` ${name} `));
const rarityToken=value=>tradeRarityAliases.get(identityText(value))||"";
const cardSpeciesId=card=>card?.dataset?.speciesId||card?.querySelector?.("[data-species-id]")?.dataset?.speciesId||"";
function nativeTradeRaritySet(panel){
  if(!panel)return null;
  const controls=[...panel.querySelectorAll("select")].filter(control=>!control.closest(".ppbui-root,.trade-inventory-list,.trade-inventory-item")).filter(control=>{
    const label=[...(control.labels||[])].map(node=>node.textContent).join(" "),labelledBy=String(control.getAttribute("aria-labelledby")||"").split(/\s+/).map(id=>panel.ownerDocument.getElementById(id)?.textContent||"").join(" "),description=identityText([control.getAttribute("aria-label"),control.getAttribute("title"),control.getAttribute("name"),label,labelledBy,control.options?.[0]?.textContent].filter(Boolean).join(" "));
    return /(rarit|raridad|rareza)/.test(description);
  });
  if(controls.length!==1)return null;
  const selected=[...(controls[0].selectedOptions||[])];if(!selected.length)return null;
  const tokens=[];for(const option of selected){const fromValue=rarityToken(option.value),fromText=rarityToken(option.textContent);if(fromValue&&fromText&&fromValue!==fromText)return null;const token=fromValue||fromText;if(!token)return null;tokens.push(token);}
  return tokens.length?new Set(tokens):null;
}
function tradePokemonCandidates(card,creatures,ownership){
  const id=String(cardCreatureId(card)||"");
  if(id){const creature=creatures.find(c=>String(c?.id)===id);return creature?[creature]:null;}
  const exactName=identityText(card.querySelector(".trade-inventory-item__name,b")?.textContent),species=identityText(cardSpeciesId(card)),semantic=[card.getAttribute("aria-label"),card.getAttribute("title"),card.querySelector("img[alt]")?.getAttribute("alt"),card.querySelector("img[title]")?.getAttribute("title"),card.textContent].map(identityText).filter(Boolean);
  const owned=ownership?.get(card),rarity=tradeRarities.find(value=>card.classList.contains(`rarity-${value}`)&&!owned?.has(`rarity-${value}`))||"",levelMatch=normalized(semantic.join(" ")).match(/(?:^|\s)(?:lv|nv|nivel|level)\.?\s*(\d+)(?:\s|$)/i),level=levelMatch?Number(levelMatch[1]):null;
  const hasNameEvidence=Boolean(exactName||species||creatures.some(c=>creatureNames(c).some(name=>semantic.some(text=>boundedIdentity(text,name)))));
  if(!hasNameEvidence&&level===null&&!rarity)return [];
  return creatures.filter(c=>{
    if(rarity && normalized(c.quality)!==rarity)return false;
    if(level!==null && Number(c.level)!==level)return false;
    const names=creatureNames(c);
    if(species && !names.includes(species))return false;
    if(exactName && !names.includes(exactName))return false;
    if(!exactName&&!species&&hasNameEvidence&&!names.some(name=>semantic.some(text=>boundedIdentity(text,name))))return false;
    return true;
  });
}
function resolveTradePokemonCards(cards,candidates){
  const used=new Set(),resolved=new Map();
  for(const card of cards){const matches=candidates.get(card);if(!Array.isArray(matches)||matches.length!==1)continue;const creature=matches[0],id=String(creature?.id??"");if(!id||used.has(id)){resolved.set(card,null);continue;}resolved.set(card,creature);used.add(id);}
  return resolved;
}
function decorateTradePokemonPresentation(card,ownership){
  const ownClass=(node,name)=>{if(!node?.classList?.contains(name)){node.classList.add(name);if(!ownership.has(node))ownership.set(node,new Set());ownership.get(node).add(name);}};
  for(const name of ["inventory-slot","inventory-slot--pokemon","ppbui-trade-pokemon-slot"])ownClass(card,name);
  const visual=card.querySelector(":scope > img,:scope > canvas,:scope > [class*='sprite']");if(visual)ownClass(visual,"ppbui-trade-pokemon-visual");
  const level=[...card.querySelectorAll(":scope > small,:scope > span")].find(node=>/^(?:lv|nv|nivel|level)\.?\s*\d+/i.test(normalized(node.textContent)));if(level)ownClass(level,"inventory-slot__pokemon-level");
  return ownClass;
}
function decorateTradePokemonCard(card,creature,tools,ownership){
  const ownClass=decorateTradePokemonPresentation(card,ownership);
  if(creature?.is_shiny)ownClass(card,"inventory-slot--shiny");
  const quality=normalized(creature?.quality);if(quality)ownClass(card,`rarity-${quality}`);
  tools.decorate(card,creature);
}
export function sceneFor(root){const win=root.ownerDocument.defaultView,cached=win.PokeIdle?.ReactiveWindows?.cached?.();return [...(Array.isArray(cached)?cached:[]),win.SceneManager?._scene].find(scene=>scene?._panel?.body===root.querySelector(toolsSelectors.body));}
function adapt(scene){const saved=[];return {wrap(key,make){const descriptor=Object.getOwnPropertyDescriptor(scene,key),original=scene[key],wrapped=make(original);scene[key]=wrapped;saved.push({key,descriptor,wrapped});},restore(){for(const {key,descriptor,wrapped}of saved.reverse())if(scene[key]===wrapped){if(descriptor)Object.defineProperty(scene,key,descriptor);else delete scene[key];}}};}
export function mountInventoryPokemon(root){
  const scene=sceneFor(root);if(!scene || !["filteredItems","createSlot","refresh"].every(key=>typeof scene[key]==="function"))return null;
  const adapter=adapt(scene),tools=createPokemonTools(root,{clearControl:false,getCreatures:()=>scene._creatures||[],refresh:()=>scene.refresh()});
  // A new injection may inherit panels left by an older instance. Scan once;
  // subsequent native redraws release only the exact panel owned by this mount.
  for(const stale of root.querySelectorAll(".ppbui-pokemon-tools[data-ppbui-inventory-pokemon-filters]"))stale.remove();
  let alive=true,paging=false,reschedule=false,creatureReads=0,awaitingQueryLoad=false,invalidFirstPageCursor=false,observedQuery=String(scene._query||""),observedCategory=scene._category,failedPage="",pagesLoaded=0,epoch=0,readToken=0,focusFrame=0,blockedNativeMore=null;
  const PAGE_LIMIT=100;
  const setPagingPhase=phase=>{
    if(phase){if(root.dataset.ppbuiInventoryPagingState!==phase)root.dataset.ppbuiInventoryPagingState=phase;}
    else root.removeAttribute("data-ppbui-inventory-paging-state");
  };
  const releaseBlockedMore=()=>{
    if(!blockedNativeMore)return;
    const {node,hidden,disabled}=blockedNativeMore;blockedNativeMore=null;
    if(node.isConnected){node.hidden=hidden;node.disabled=disabled;}
  };
  const syncBlockedMore=()=>{
    const node=scene._panel?.body===root.querySelector(toolsSelectors.body)?scene._panel.body.querySelector(":scope > button.pokeidle-ui-button"):null;
    const blocked=alive && (awaitingQueryLoad || creatureReads>0 || invalidFirstPageCursor);
    if(blockedNativeMore && (blockedNativeMore.node!==node || !blocked))releaseBlockedMore();
    if(!blocked || !node)return;
    if(!blockedNativeMore)blockedNativeMore={node,hidden:node.hidden,disabled:node.disabled};
    if(!node.hidden)node.hidden=true;
    if(!node.disabled)node.disabled=true;
  };
  const pageKey=()=>`${scene._query||""}\u0000${scene._creatureCursor||""}`;
  const canExpand=()=>alive && root.isConnected && (root.ownerDocument.documentElement?.getAttribute("data-ppbui-card-mode")!=="cards" || inventoryAvailableInCardMode(root))
    && scene._panel?.body===root.querySelector(toolsSelectors.body)
    && ["all","pokemon"].includes(scene._category) && typeof scene.loadMoreCreatures==="function"
    && !!scene._creatureCursor && !scene._creaturePageLoading && !scene._itemSheet
    && !creatureReads && !awaitingQueryLoad && !invalidFirstPageCursor && failedPage!==pageKey() && pagesLoaded<PAGE_LIMIT;
  const expandPages=()=>{
    if(paging){reschedule=true;return;}
    if(!canExpand())return;
    paging=true;
    setPagingPhase("loading");
    void (async()=>{
      try {
        while(canExpand()){
          const key=pageKey(),query=String(scene._query||""),cursor=scene._creatureCursor,requestEpoch=epoch;
          const grid=root.querySelector(".inventory-slot-grid"),busy=grid?.getAttribute("aria-busy");
          const button=scene._panel?.body?.querySelector(":scope > button.pokeidle-ui-button"),buttonBusy=button?.getAttribute("aria-busy");
          const disabledButton=Boolean(button && button!==root.ownerDocument.activeElement && !button.disabled);
          if(grid)grid.setAttribute("aria-busy","true");
          if(button){button.setAttribute("aria-busy","true");if(disabledButton)button.disabled=true;}
          try { await scene.loadMoreCreatures(); }
          catch { if(alive && requestEpoch===epoch)failedPage=key;break; }
          finally {
            if(grid?.isConnected){if(busy===null)grid.removeAttribute("aria-busy");else grid.setAttribute("aria-busy",busy);}
            if(button?.isConnected){if(disabledButton)button.disabled=false;if(buttonBusy===null)button.removeAttribute("aria-busy");else button.setAttribute("aria-busy",buttonBusy);}
          }
          if(!alive || requestEpoch!==epoch || query!==String(scene._query||""))break;
          if(cursor===scene._creatureCursor){failedPage=key;break;}
          pagesLoaded++;
        }
      } finally {
        paging=false;
        if(alive){
          if(!["all","pokemon"].includes(scene._category))setPagingPhase(null);
          else if(creatureReads || awaitingQueryLoad)setPagingPhase(null);
          else if(!scene._creatureCursor)setPagingPhase("complete");
          else if(failedPage===pageKey() || pagesLoaded>=PAGE_LIMIT)setPagingPhase("stopped");
        }
        if(reschedule){reschedule=false;expandPages();}
      }
    })();
  };
  if(typeof scene.load==="function")adapter.wrap("load",original=>async function(...args){
    const creatures=!args[1] || Boolean(args[1]?.creatures),query=String(this._query||""),before=this._creatures;
    const token=creatures?++readToken:0;
    if(creatures){creatureReads++;epoch++;failedPage="";pagesLoaded=0;setPagingPhase(null);syncBlockedMore();}
    try {return await original.apply(this,args);}
    finally {
      if(creatures){
        creatureReads--;
        if(alive && this===scene && this._panel?.body===root.querySelector(toolsSelectors.body)
          && token===readToken && query===String(this._query||"")){
          awaitingQueryLoad=false;root.removeAttribute("data-ppbui-inventory-pokemon-pending");epoch++;
          if(before===this._creatures){
            invalidFirstPageCursor=true;failedPage=pageKey();setPagingPhase("error");
            if(alive && root.isConnected && this._panel?.body===root.querySelector(toolsSelectors.body))this.refresh();
          } else invalidFirstPageCursor=false;
        }
        syncBlockedMore();expandPages();
      }
    }
  });
  adapter.wrap("filteredItems",original=>function(){
    const list=original.call(this);if(this._category!=="pokemon")return list;
    return list.filter(item=>!item?._isPokemon || tools.matches(item.creature));
  });
  adapter.wrap("createSlot",original=>function(item){const slot=original.call(this,item);if(item._isPokemon)tools.decorate(slot,item.creature);return slot;});
  const more=root.ownerDocument.createElement("button");more.type="button";more.className="pokeidle-btn ppbui-button";more.dataset.ppbuiInventoryMoreFilters="";
  let currentFilterPanel=null;
  const releaseOldFilterPanels=keep=>{
    if(currentFilterPanel && currentFilterPanel!==keep)currentFilterPanel.remove();
    currentFilterPanel=keep||null;
  };
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
  const doc=root.ownerDocument,win=doc.defaultView;
  const captureFocus=()=>{
    const node=doc.activeElement;
    if(!node || !root.contains(node))return null;
    if(node.matches?.("[data-ppbui-pokemon-filter]"))return {kind:"field",key:node.dataset.ppbuiPokemonFilter};
    const nativeMore=node.matches?.("button.pokeidle-ui-button") && node.parentElement===scene._panel?.body;
    if(!paging && !awaitingQueryLoad && !creatureReads && root.dataset.ppbuiInventoryPagingState!=="error" && !nativeMore)return null;
    if(node===more)return {kind:"filters"};
    if(node.matches?.("[data-ppbui-inventory-category-proxy]"))return {kind:"category"};
    if(node.matches?.("[data-ppbui-inventory-clear]"))return {kind:"clear"};
    if(node.matches?.(".inventory-slots-toolbar input.game-window__search"))return {kind:"search",start:node.selectionStart,end:node.selectionEnd};
    if(node.matches?.(".inventory-category-tab[data-category]"))return {kind:"tab",key:node.dataset.category};
    if(node.matches?.("button.inventory-slot[data-creature-id]"))return {kind:"slot",key:node.dataset.creatureId};
    if(node.matches?.(".inventory-slot-grid"))return {kind:"grid"};
    if(nativeMore)return {kind:"loadMore"};
    return null;
  };
  const restoreFocus=focus=>{
    if(!focus)return;
    const attempt=(fallback=false)=>{
      if(!alive || !root.isConnected || (doc.activeElement!==doc.body && doc.activeElement?.isConnected))return true;
      const body=root.querySelector(toolsSelectors.body);
      let target=null;
      if(focus.kind==="filters")target=more;
      else if(focus.kind==="field")target=[...root.querySelectorAll("[data-ppbui-pokemon-filter]")].find(node=>node.dataset.ppbuiPokemonFilter===focus.key);
      else if(focus.kind==="category")target=root.querySelector("[data-ppbui-inventory-category-proxy]");
      else if(focus.kind==="clear")target=root.querySelector("[data-ppbui-inventory-clear]");
      else if(focus.kind==="search")target=body?.querySelector(".inventory-slots-toolbar input.game-window__search");
      else if(focus.kind==="tab")target=[...body?.querySelectorAll(".inventory-category-tab[data-category]")||[]].find(node=>node.dataset.category===focus.key);
      else if(focus.kind==="slot")target=[...body?.querySelectorAll("button.inventory-slot[data-creature-id]")||[]].find(node=>node.dataset.creatureId===focus.key);
      else if(focus.kind==="loadMore")target=body?.querySelector(":scope > button.pokeidle-ui-button");
      else if(focus.kind==="grid")target=body?.querySelector(".inventory-slot-grid");
      const grid=body?.querySelector(".inventory-slot-grid");
      const search=body?.querySelector(".inventory-slots-toolbar input.game-window__search");
      const fallbacks=fallback || focus.kind==="loadMore" ? [grid?.tabIndex>=0?grid:null,search] : [];
      for(const candidate of [target,...fallbacks]){
        if(!candidate?.isConnected || candidate.disabled)continue;
        candidate.focus({preventScroll:true});
        if(doc.activeElement!==candidate)continue;
        if(focus.kind==="search" && candidate===target && Number.isInteger(focus.start) && Number.isInteger(focus.end))candidate.setSelectionRange(focus.start,focus.end);
        return true;
      }
      return false;
    };
    if(!attempt()){
      if(focusFrame)win.cancelAnimationFrame?.(focusFrame);
      focusFrame=win.requestAnimationFrame?.(()=>{
        focusFrame=win.requestAnimationFrame?.(()=>{focusFrame=0;attempt(true);})||0;
      })||0;
    }
  };
  adapter.wrap("refresh",original=>function(...args){
    const query=String(this._query||"");
    if(query!==observedQuery){observedQuery=query;awaitingQueryLoad=true;root.dataset.ppbuiInventoryPokemonPending="";failedPage="";pagesLoaded=0;epoch++;setPagingPhase(null);}
    if(this._category!==observedCategory){
      observedCategory=this._category;epoch++;
      if(!["all","pokemon"].includes(this._category))setPagingPhase(null);
      else if(invalidFirstPageCursor && !awaitingQueryLoad && !creatureReads)setPagingPhase("error");
    }
    const focus=captureFocus();
    const body=this._panel?.body,scroll=body?.scrollTop,result=original.apply(this,args);
    if(this._category==="pokemon"){
      const panel=tools.render({summary:false});panel.dataset.ppbuiInventoryPokemonFilters="";
      releaseOldFilterPanels(panel);root.querySelector(toolsSelectors.toolbar)?.after(panel);
      if(!this.filteredItems().length && !this._creatureCursor && !this._creaturePageLoading && !creatureReads && !awaitingQueryLoad && root.dataset.ppbuiInventoryPagingState!=="error"){
        const empty=root.ownerDocument.createElement("small");empty.className="ppbui-pokemon-empty";empty.textContent=pokemonToolsText(root.ownerDocument).none;panel.append(empty);
      }
    }else {releaseOldFilterPanels();tools.setOpen(false);}
    placeMore();syncMore();syncBlockedMore();if(body)body.scrollTop=scroll;
    if(this._creatureCursor==="" && this._creaturePageLoading===false && !creatureReads && !awaitingQueryLoad
      && root.dataset.ppbuiInventoryPagingState==="stopped")setPagingPhase("complete");
    restoreFocus(focus);expandPages();return result;
  });
  const clear=event=>{if(event.target.closest?.(toolsSelectors.clear))tools.reset();};root.addEventListener("click",clear,true);
  scene.refresh();return {cleanup(){alive=false;root.removeAttribute("data-ppbui-inventory-pokemon-pending");setPagingPhase(null);releaseBlockedMore();if(focusFrame)win.cancelAnimationFrame?.(focusFrame);root.removeEventListener("click",clear,true);more.removeEventListener("click",toggleMore);more.remove();adapter.restore();releaseOldFilterPanels();tools.cleanup();if(root.isConnected && (root.ownerDocument.documentElement?.getAttribute("data-ppbui-card-mode")!=="cards" || inventoryAvailableInCardMode(root)))scene.refresh();}};
}
export function mountTradePokemon(root,scene){
  // Native Trade already owns its Rarities selector. Do not render a second
  // Better UI rarity selector inside Mais filtros; all other filters stay additive.
  const adapter=adapt(scene),refreshInventory=()=>typeof scene.updateInventoryList==="function"?scene.updateInventoryList():scene.render(),tools=createPokemonTools(root,{language:"pt",basicKeys:["element"],getCreatures:()=>scene._creatures||[],refresh:refreshInventory}),ownedPresentation=new Map();
  const releasePresentation=node=>{const classes=ownedPresentation.get(node);if(!classes)return;for(const name of classes)node.classList.remove(name);ownedPresentation.delete(node);};
  const prunePresentation=()=>{for(const node of ownedPresentation.keys())if(!node.isConnected)releasePresentation(node);};
  const ui=createTradeUI(root,tools);
  let category="";
  const categoryOf=item=>{const value=item.category||item.type||"misc";return value==="genetic_material"?"material":String(value).startsWith("boost")?"boost":value;};
  const names={capsule:"Poké Bolas",potion:"Poções",revive:"Revives",egg:"Ovos",evolution:"Evolução",material:"Materiais",collectible:"Colecionáveis",boost:"Boosts",misc:"Outros",item:"Itens",guild_service:"Serviços de guilda",trainer_service:"Serviços de treinador"};
  if(typeof scene.itemsTabPanel==="function")adapter.wrap("itemsTabPanel",original=>function(list){
    original.call(this,list);
    const query=this._query.trim().toLocaleLowerCase("pt-BR"),items=this._inventory.filter(item=>Number(item.qty)>0 && (!query || String(item.name||item.item_id).toLocaleLowerCase("pt-BR").includes(query))),cards=[...list.querySelectorAll(toolsSelectors.itemCard)];
    if(cards.length===items.length)cards.forEach((card,index)=>{if(category && categoryOf(items[index])!==category)card.remove();});
  });
  if(typeof scene.updateInventoryList==="function")adapter.wrap("updateInventoryList",original=>function(...args){const result=original.apply(this,args);prunePresentation();ui.count(root.querySelectorAll(`${toolsSelectors.tradeList} ${toolsSelectors.itemCard}`).length);return result;});
  adapter.wrap("render",original=>function(...args){
    const doc=root.ownerDocument,active=doc.activeElement,focusedAction=active?.matches?.(".trade-confirm,.trade-cancel")?active.classList.contains("trade-confirm")?"confirm":"cancel":null;
    const result=original.apply(this,args);prunePresentation();ui.sync();
    // A full native scene render may replace the focused action. Reacquire only
    // its matching native node, and never override deliberate new focus.
    if(focusedAction && !active?.isConnected && (doc.activeElement===doc.body || !doc.activeElement?.isConnected)){
      root.querySelector(`.trade-${focusedAction}`)?.focus({preventScroll:true});
    }
    return result;
  });
  adapter.wrap("pokemonTabPanel",original=>function(list){
    original.call(this,list);
    const offered=new Set((this.ownOffer().creatures||[]).map(c=>String(c.creature_id))),query=this._query.trim().toLocaleLowerCase("pt-BR");
    const nativeRarities=nativeTradeRaritySet(list.closest(".trade-inventory"));
    const identityCreatures=this._creatures.filter(c=>!offered.has(String(c.id)) && (!query || String(c.nickname||c.species_name||c.species_id).toLocaleLowerCase("pt-BR").includes(query))),filterCreatures=nativeRarities?identityCreatures.filter(c=>nativeRarities.has(normalized(c.quality))):identityCreatures;
    const cards=[...list.querySelectorAll(toolsSelectors.tradeCard)];
    // Backpack presentation itself is identity-independent. Creature-specific
    // filtering/tagging is fail-closed unless the native card proves its identity.
    for(const card of cards)decorateTradePokemonPresentation(card,ownedPresentation);
    const filterCandidates=new Map(cards.map(card=>[card,tradePokemonCandidates(card,filterCreatures,ownedPresentation)])),identityCandidates=new Map(cards.map(card=>[card,tradePokemonCandidates(card,identityCreatures,ownedPresentation)])),resolved=resolveTradePokemonCards(cards,identityCandidates);
    for(const card of cards){const possible=filterCandidates.get(card);if(Array.isArray(possible)&&possible.length&&possible.every(c=>!tools.matches(c))){card.remove();continue;}const c=resolved.get(card);if(c&&tools.matches(c))decorateTradePokemonCard(card,c,tools,ownedPresentation);}
    if(!list.querySelector(toolsSelectors.tradeCard)){const empty=root.ownerDocument.createElement("p");empty.className="ppbui-pokemon-empty";empty.textContent=pokemonToolsText(root.ownerDocument).none;list.append(empty);}
  });
  adapter.wrap("inventoryPanel",original=>function(){const panel=original.call(this);if(this._inventoryTab==="pokemon")ui.inventory(panel,panel.querySelectorAll(toolsSelectors.tradeCard).length);else {const values=[...new Set((this._inventory||[]).filter(item=>Number(item.qty)>0).map(categoryOf))].sort().map(id=>[id,names[id]||id]);ui.items(panel,values,category,panel.querySelectorAll(toolsSelectors.itemCard).length,value=>{category=value;scene.render();root.querySelector(toolsSelectors.category)?.focus();});}return panel;});
  adapter.wrap("renderSlots",original=>function(offer,own){const grid=original.call(this,offer,own);if(own){const entries=this.offerEntries(offer);[...grid.children].forEach((slot,index)=>{const entry=entries[index];if(entry?.offer_kind==="creature")tools.decorate(slot,{...entry,id:entry.creature_id||entry.id});});}return grid;});
  scene.render();return {cleanup(){ui.cleanup();adapter.restore();tools.cleanup();for(const node of [...ownedPresentation.keys()])releasePresentation(node);if(root.isConnected && !scene._finished)scene.render();}};
}
export function createTradePokemonModule(){let root,scene,mounted,mountKey;return {id:"trade",shouldMount(){const next=document.querySelector(toolsSelectors.trade),candidate=next&&sceneFor(next);if(next!==root || candidate!==scene){root=next;scene=candidate;mountKey=root&&scene?{root,scene}:undefined;}return !!root && !!scene && ["pokemonTabPanel","inventoryPanel","renderSlots","render"].every(key=>typeof scene[key]==="function");},getMountKey:()=>mountKey,mount(){mounted=mountTradePokemon(root,scene);return()=>mounted.cleanup();}};}
