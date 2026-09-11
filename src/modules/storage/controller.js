import { createPokemonTools } from "../pokemon-tools/ui.js";
import { storageConfig as config, storageText } from "./config.js";
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function mountStorage({root,scene}) {
  const doc=root.ownerDocument, q=config.selectors, pi=doc.defaultView.PokeIdle;
  const state = Object.fromEntries(["inventory","storage"].map(side=>[side,{query:"",quality:scene._qualityFilter || "",element:scene._elementFilter || "",sort:scene._sortBy || "name"}]));
  let activeSide = "inventory", alive=true, transferring=false;
  const dialogNotes=new Set();
  const pokemonTools=Object.fromEntries(["inventory","storage"].map(side=>[side,createPokemonTools(root,{basics:false,clearControl:false,getCreatures:()=>scene._creatures.filter(c=>c.location===side),refresh:()=>{scene[side==="storage"?"_storagePage":"_inventoryPage"]=0;scene.refresh();}})]));
  const inSide = (side, fn) => {
    const previous=activeSide, saved=[scene._qualityFilter,scene._elementFilter,scene._sortBy];
    activeSide=side; const filter=state[side];
    [scene._qualityFilter,scene._elementFilter,scene._sortBy]=[filter.quality,filter.element,filter.sort];
    try { return fn(); } finally { activeSide=previous;[scene._qualityFilter,scene._elementFilter,scene._sortBy]=saved; }
  };
  const originals=new Map(), wrappers=new Map();
  // Instance-only rendering adapters are needed because native pagination and filtering
  // happen before slots exist. Never patch the scene prototype or transfer methods.
  const wrap=(key, make) => {
    const descriptor=Object.getOwnPropertyDescriptor(scene,key), original=scene[key];
    const wrapped=make(original); originals.set(key,{descriptor,original}); wrappers.set(key,wrapped); scene[key]=wrapped;
  };
  const style=doc.createElement("style");style.dataset.ppbuiStyle="storage";
  style.textContent=`
    .storage-window { min-width:980px !important; }
    .storage-window .ppbui-pokemon-fields { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); }
    ${["weak","common","uncommon","rare","epic","legendary","mythical"].map(quality=>`.storage-window .pokecentro-transfer-slot.rarity-${quality} { --surface-border:var(--quality-${quality}); border-color:var(--quality-${quality}) !important; }`).join("\n")}
    .storage-window [data-ppbui-storage-side] { display:flex; flex-direction:column; }
    .storage-window [data-ppbui-storage-side] > .pokecentro-slot-grid { flex:1 0 auto; }
    .storage-window .ppbui-storage-search { min-width:100px; width:180px; flex:1 1 140px; }
    .storage-window .pokecentro-transfer-slot > .ppbui-storage-sprite { width:40px; height:40px; object-fit:contain; image-rendering:pixelated; pointer-events:none; }
    .storage-window .ppbui-storage-filters { padding:8px 10px; display:grid; gap:6px; }
    .storage-window .ppbui-storage-filters .ppbui-storage-search { width:100%; box-sizing:border-box; }
    .storage-window .ppbui-storage-filter-row { display:flex; gap:5px; }
    .storage-window .ppbui-storage-filter-row select { min-width:0; width:0; flex:1; }
    .storage-window .ppbui-storage-filter-row button { padding:4px 6px; }
    .storage-window .ppbui-storage-transfer { display:flex; align-items:center; justify-content:space-between; gap:8px; height:48px; box-sizing:border-box; flex-shrink:0; padding:8px 10px; border-top:1px solid var(--ui-gold-dark); }
    .storage-window .ppbui-storage-transfer span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .storage-window .ppbui-storage-transfer > span { min-width:0; font-size:11px; }
    .storage-window .ppbui-storage-transfer > button { flex-shrink:0; }
    .storage-window .ppbui-storage-transfer > small { color:var(--ui-muted); font-size:10px; }
    .storage-window .ppbui-storage-search-row { display:flex; align-items:center; gap:8px; }
    .storage-window .ppbui-storage-results { flex-shrink:0; color:var(--ui-muted); font-size:10px; }
    .storage-window .ppbui-storage-empty { grid-column:1/-1; grid-row:1/-1; align-self:center; justify-self:center; display:grid; justify-items:center; gap:8px; color:var(--ui-muted); font-size:11px; }
    .storage-window .pokecentro-overview { display:none; }
    .storage-window .pokecentro-selection[hidden] { display:none; }
  `;
  doc.head.append(style);
  const footer=()=>{const strip=doc.createElement("div");strip.className="ppbui-storage-transfer";resetFooter(strip);return strip;};
  const resetFooter=strip=>{const hint=doc.createElement("small");hint.textContent=storageText(doc).idle;strip.replaceChildren(hint);};
  const vaultFor=side=>[...root.querySelectorAll(q.vault)].find(el=>el.dataset.ppbuiStorageSide===side);
  const focusKey=(node,key)=>{if(node)node.dataset.ppbuiStorageFocus=key;};
  wrap("refresh",original=>function(...args) {
    const body=this._panel?.body, scroll=body?.scrollTop, active=doc.activeElement, key=active?.dataset.ppbuiStorageFocus;
    const selection=active?.tagName==="INPUT" ? [active.selectionStart,active.selectionEnd] : null;
    const result=original.apply(this,args);
    if(key) {
      const target=[...root.querySelectorAll(q.focus)].find(el=>el.dataset.ppbuiStorageFocus===key);
      const fallback=target?.closest(q.vault)?.querySelector(q.search);
      const next=target?.disabled ? fallback : target;next?.focus({preventScroll:true});
      if(next===target && selection?.[0]!=null)next.setSelectionRange(...selection);
    }
    if(body)body.scrollTop=scroll;
    return result;
  });
  wrap("filterAndSortPokeCentro",original=>function(list) {
    const side=list[0]?.location === "storage" ? "storage" : "inventory";
    const result=inSide(side,()=>original.call(this,list)), needle=normalize(state[side].query.trim());
    const tagged=result.filter(c=>pokemonTools[side].matches(c));
    return needle ? tagged.filter(c=>normalize([c.nickname,c.name,c.species_name,c.species?.name,pi.DittoDisplayName?.get?.(c)].filter(Boolean).join(" ")).includes(needle)) : tagged;
  });
  wrap("pokeCentroFiltersActive",original=>function() { return !!state[activeSide].query.trim() || pokemonTools[activeSide].active() || original.call(this); });
  const nativeFilters=scene.renderPokeCentroFilters;
  wrap("renderPokeCentroFilters",()=>function() { const placeholder=doc.createElement("span");placeholder.hidden=true;return placeholder; });
  function filters(side,count,total) {
    const bar=inSide(side,()=>nativeFilters.call(scene,count,total)), controls=bar.querySelector(q.filters);
    const container=doc.createElement("div");container.className="ppbui-storage-filters";
    if(!controls) return container;
    const input=doc.createElement("input");input.type="search";input.className="pokecentro-filter-select ppbui-storage-search";input.dataset.ppbuiStorageSearch=side;
    input.placeholder=storageText(doc).search;input.setAttribute("aria-label",input.placeholder);input.value=state[side].query;focusKey(input,`${side}-search`);
    const selects=[...controls.querySelectorAll(q.select)], clear=controls.querySelector(q.clear);
    const refresh=()=>{scene[side==="storage"?"_storagePage":"_inventoryPage"]=0;scene.refresh();};
    input.addEventListener("input",()=>{
      state[side].query=input.value;const start=input.selectionStart,end=input.selectionEnd;refresh();
      const next=[...root.querySelectorAll(q.search)].find(el=>el.dataset.ppbuiStorageSearch===side);next?.focus({preventScroll:true});if(next && start!==null)next.setSelectionRange(start,end);
    });
    selects.forEach((select,index)=>focusKey(select,`${side}-filter-${index}`));focusKey(clear,`${side}-clear`);
    for(const select of selects) select.addEventListener("change",event=>{
      event.stopImmediatePropagation();[state[side].quality,state[side].element,state[side].sort]=selects.map(el=>el.value);refresh();
    },true);
    clear?.addEventListener("click",event=>{event.stopImmediatePropagation();state[side]={query:"",quality:"",element:"",sort:"name"};pokemonTools[side].reset();refresh();},true);
    const searchRow=doc.createElement("div"),resultCount=doc.createElement("small");searchRow.className="ppbui-storage-search-row";resultCount.className="ppbui-storage-results";resultCount.textContent=`${count} ${storageText(doc).results}`;
    searchRow.append(input,resultCount);controls.className="ppbui-storage-filter-row";container.append(searchRow,controls,pokemonTools[side].render());return container;
  }
  wrap("renderPokeCentroVault",original=>function(title,subtitle,list,side,totalCount) {
    const pageKey=side==="storage" ? "_storagePage" : "_inventoryPage";
    const pages=Math.max(1,Math.ceil(list.length/config.pageSize));
    this[pageKey]=Math.max(0,Math.min(Number(this[pageKey]) || 0,pages-1));
    const page=this[pageKey], vault=inSide(side,()=>original.call(this,title,subtitle,list,side,totalCount));
    vault.dataset.ppbuiStorageSide=side;
    const header=vault.firstElementChild;header?.after(filters(side,list.length,totalCount));
    const text=storageText(doc), count=vault.querySelector(q.count);
    if(count)count.textContent=side==="storage" ? `${totalCount}/${this._storageLimit}` : `${totalCount} Pokémon`;
    const bulk=vault.querySelector(q.bulk);
    const filtered=!!(state[side].query.trim() || state[side].quality || state[side].element || pokemonTools[side].active());
    const portuguese=(pi.Localization?.get?.() || doc.documentElement.lang).startsWith("pt");
    const filteredLabel=side==="storage" ? (portuguese?"Retirar filtrados":"Withdraw filtered") : (portuguese?"Depositar filtrados":"Deposit filtered");
    if(bulk && filtered) { bulk.textContent=filteredLabel;bulk.title=`${list.length} Pokémon`;bulk.disabled=!list.length || typeof scene.transferPokeCentroCreature!=="function" || !pi.Dialog?.confirm; }
    if(bulk && transferring)bulk.disabled=true;
    bulk?.addEventListener("click",async event=>{
      if(transferring){event.stopImmediatePropagation();return;}
      if(filtered){
        event.stopImmediatePropagation();
        const ids=[...new Set(list.map(c=>String(c.id)))], target=side==="storage"?"inventory":"storage";
        transferring=true;
        root.querySelectorAll(q.bulk).forEach(button=>button.disabled=true);
        try {
          const message=portuguese ? `${ids.length} Pokémon filtrados → ${target==="storage"?text.storage:text.inventory}. Inclui todas as páginas dos resultados.` : `${ids.length} filtered Pokémon → ${target==="storage"?text.storage:text.inventory}. Includes all result pages.`;
          if(!await pi.Dialog.confirm(message,{title:filteredLabel,acceptLabel:pi.t("common.confirm")}))return;
          for(const id of ids){
            if(!alive)break;
            const creature=scene._creatures.find(c=>String(c.id)===id && c.location===side);
            if(!creature || scene._equippedIds?.has(id))continue;
            await scene.transferPokeCentroCreature(creature,target,bulk);
            // Native transfer catches errors; stop if its authoritative reload did not confirm the move.
            if(!scene._creatures.some(c=>String(c.id)===id && c.location===target)){
              pi.Bus?.emit?.("system.feedback",{kind:"error",message:portuguese?"Transferência interrompida: o jogo não confirmou a movimentação.":"Transfer stopped: the game did not confirm the move."});break;
            }
          }
        } catch(error){pi.Bus?.emit?.("system.feedback",{kind:"error",message:error.message});}
        finally {transferring=false;if(alive)scene.refresh();}
        return;
      }
      const existing=new Set(doc.querySelectorAll(q.dialog));
      // Native confirmation opens synchronously. Enrich that new dialog only,
      // without replacing confirmation, transfer handlers or the Dialog API.
      doc.defaultView.queueMicrotask(()=>{
        if(!alive)return;
        const dialog=[...doc.querySelectorAll(q.dialog)].find(el=>!existing.has(el)), body=dialog?.querySelector(q.dialogBody);
        if(!body)return;
        const note=doc.createElement("p");note.className="pokeidle-dialog__message";note.dataset.ppbuiStorageBulk="";
        note.textContent=`${text.upTo} ${totalCount} Pokémon → ${side==="storage" ? text.inventory : text.storage}. ${text.bulkScope}`;
        body.append(note);dialogNotes.add(note);
      });
    },true);
    vault.querySelectorAll(q.pagerButtons).forEach((button,index)=>{
      focusKey(button,`${side}-page-${index}`);
      button.addEventListener("click",()=>{if(this._creatures.some(c=>c.id===this._selectedId && c.location===side))this._selectedId="";},true);
    });
    if(!list.length) {
      const grid=vault.querySelector(q.grid);
      if(grid) {
        const message=doc.createElement("div"),label=doc.createElement("span");message.className="ppbui-storage-empty";
        label.textContent=totalCount ? text.noResults : side==="storage" ? text.emptyStorage : text.emptyInventory;message.append(label);
        if(totalCount) {const clear=doc.createElement("button");clear.type="button";clear.className="pokeidle-btn";clear.textContent=text.clear;clear.addEventListener("click",()=>vault.querySelector(q.clear)?.click());message.append(clear);}
        grid.replaceChildren(message);
      }
    }
    vault.append(footer());
    const label=vault.querySelector(q.pagerLabel), next=vault.querySelector(q.next);
    if(label) label.textContent=pi.t("creature_storage.page_of",{page:page+1,total:pages});
    if(next) next.disabled=page>=pages-1;
    const visible=list.slice(page*config.pageSize,(page+1)*config.pageSize);
    vault.querySelectorAll(q.slots).forEach((slot,index)=>{
      const c=visible[index], species=c?.species, icon=slot.querySelector(q.icon);
      pokemonTools[side].decorate(slot,c);
      const url=(c?.is_shiny && species?.shiny_sprite_url) || species?.normal_sprite_url;
      if(!icon || !url) return;
      const image=doc.createElement("img");image.className="ppbui-storage-sprite";image.alt="";image.loading="lazy";
      image.addEventListener("error",()=>{if(image.parentNode) image.replaceWith(icon);},{once:true});
      image.src=url;icon.replaceWith(image);
    });
    return vault;
  });
  if(typeof scene.renderPokeCentroSelection === "function") wrap("renderPokeCentroSelection",original=>function() {
    const section=original.call(this);
    root.querySelectorAll(q.transfer).forEach(resetFooter);
    const creature=this._creatures.find(c=>c.id===this._selectedId), actions=section.querySelector(q.actions), button=actions?.lastElementChild;
    const side=creature?.location;
    const vault=vaultFor(side);
    if(vault && button) {
      const strip=vault.querySelector(q.transfer),name=doc.createElement("span");
      name.textContent=section.querySelector(q.name)?.textContent || "";
      strip.replaceChildren(name,button);
    }
    section.hidden=true;return section;
  });
  scene.refresh();
  return {cleanup() {
    alive=false;Object.values(pokemonTools).forEach(tools=>tools.cleanup());dialogNotes.forEach(note=>note.remove());
    for(const [key,{descriptor}] of originals) if(scene[key]===wrappers.get(key)) { if(descriptor) Object.defineProperty(scene,key,descriptor); else delete scene[key]; }
    style.remove();
    if(root.isConnected && scene._panel?.body===root.querySelector(q.body)) scene.refresh();
  }};
}
