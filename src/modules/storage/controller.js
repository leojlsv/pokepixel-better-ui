import { storageConfig as config, storageText } from "./config.js";
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function mountStorage({root,scene}) {
  const doc=root.ownerDocument, q=config.selectors, pi=doc.defaultView.PokeIdle;
  const state = Object.fromEntries(["inventory","storage"].map(side=>[side,{query:"",quality:scene._qualityFilter || "",element:scene._elementFilter || "",sort:scene._sortBy || "name"}]));
  let activeSide = "inventory";
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
    .storage-window .ppbui-storage-search { min-width:100px; width:180px; flex:1 1 140px; }
    .storage-window .pokecentro-transfer-slot > .ppbui-storage-sprite { width:40px; height:40px; object-fit:contain; image-rendering:pixelated; pointer-events:none; }
    .storage-window .ppbui-storage-filters { padding:8px 10px; display:grid; gap:6px; }
    .storage-window .ppbui-storage-filters .ppbui-storage-search { width:100%; box-sizing:border-box; }
    .storage-window .ppbui-storage-filter-row { display:flex; gap:5px; }
    .storage-window .ppbui-storage-filter-row select { min-width:0; width:0; flex:1; }
    .storage-window .ppbui-storage-filter-row button { padding:4px 6px; }
    .storage-window .ppbui-storage-transfer { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 10px; border-top:1px solid var(--ui-gold-dark); }
    .storage-window .ppbui-storage-transfer span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .storage-window .pokecentro-selection[hidden] { display:none; }
  `;
  doc.head.append(style);
  wrap("filterAndSortPokeCentro",original=>function(list) {
    const side=list[0]?.location === "storage" ? "storage" : "inventory";
    const result=inSide(side,()=>original.call(this,list)), needle=normalize(state[side].query.trim());
    return needle ? result.filter(c=>normalize([c.nickname,c.name,c.species_name,c.species?.name,pi.DittoDisplayName?.get?.(c)].filter(Boolean).join(" ")).includes(needle)) : result;
  });
  wrap("pokeCentroFiltersActive",original=>function() { return !!state[activeSide].query.trim() || original.call(this); });
  const nativeFilters=scene.renderPokeCentroFilters;
  wrap("renderPokeCentroFilters",()=>function() { const placeholder=doc.createElement("span");placeholder.hidden=true;return placeholder; });
  function filters(side,count,total) {
    const bar=inSide(side,()=>nativeFilters.call(scene,count,total)), controls=bar.querySelector(q.filters);
    const container=doc.createElement("div");container.className="ppbui-storage-filters";
    if(!controls) return container;
    const input=doc.createElement("input");input.type="search";input.className="pokecentro-filter-select ppbui-storage-search";input.dataset.ppbuiStorageSearch=side;
    input.placeholder=storageText(doc).search;input.setAttribute("aria-label",input.placeholder);input.value=state[side].query;
    const selects=[...controls.querySelectorAll(q.select)], clear=controls.querySelector(q.clear);
    const refresh=()=>{scene[side==="storage"?"_storagePage":"_inventoryPage"]=0;scene.refresh();};
    input.addEventListener("input",()=>{
      state[side].query=input.value;const start=input.selectionStart,end=input.selectionEnd;refresh();
      const next=[...root.querySelectorAll(q.search)].find(el=>el.dataset.ppbuiStorageSearch===side);next?.focus({preventScroll:true});if(next && start!==null)next.setSelectionRange(start,end);
    });
    for(const select of selects) select.addEventListener("change",event=>{
      event.stopImmediatePropagation();[state[side].quality,state[side].element,state[side].sort]=selects.map(el=>el.value);refresh();
    },true);
    clear?.addEventListener("click",event=>{event.stopImmediatePropagation();state[side]={query:"",quality:"",element:"",sort:"name"};refresh();},true);
    controls.className="ppbui-storage-filter-row";container.append(input,controls);return container;
  }
  wrap("renderPokeCentroVault",original=>function(title,subtitle,list,side,totalCount) {
    const pageKey=side==="storage" ? "_storagePage" : "_inventoryPage";
    const pages=Math.max(1,Math.ceil(list.length/config.pageSize));
    this[pageKey]=Math.max(0,Math.min(Number(this[pageKey]) || 0,pages-1));
    const page=this[pageKey], vault=inSide(side,()=>original.call(this,title,subtitle,list,side,totalCount));
    vault.dataset.ppbuiStorageSide=side;
    const header=vault.firstElementChild;header?.after(filters(side,list.length,totalCount));
    const label=vault.querySelector(q.pagerLabel), next=vault.querySelector(q.next);
    if(label) label.textContent=pi.t("creature_storage.page_of",{page:page+1,total:pages});
    if(next) next.disabled=page>=pages-1;
    const visible=list.slice(page*config.pageSize,(page+1)*config.pageSize);
    vault.querySelectorAll(q.slots).forEach((slot,index)=>{
      const c=visible[index], species=c?.species, icon=slot.querySelector(q.icon);
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
    root.querySelectorAll(q.transfer).forEach(el=>el.remove());
    const creature=this._creatures.find(c=>c.id===this._selectedId), actions=section.querySelector(q.actions), button=actions?.lastElementChild;
    const side=creature?.location;
    const vault=[...root.querySelectorAll(q.vault)].find(el=>el.dataset.ppbuiStorageSide===side);
    if(vault && button) {
      const strip=doc.createElement("div"),name=doc.createElement("span");strip.className="ppbui-storage-transfer";
      name.textContent=section.querySelector(q.name)?.textContent || "";
      strip.append(name,button);vault.append(strip);
    }
    section.hidden=true;return section;
  });
  scene.refresh();
  return {cleanup() {
    for(const [key,{descriptor}] of originals) if(scene[key]===wrappers.get(key)) { if(descriptor) Object.defineProperty(scene,key,descriptor); else delete scene[key]; }
    style.remove();
    if(root.isConnected && scene._panel?.body===root.querySelector(q.body)) scene.refresh();
  }};
}
