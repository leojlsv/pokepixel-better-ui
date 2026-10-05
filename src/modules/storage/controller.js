import { createPokemonTools } from "../pokemon-tools/ui.js";
import { storageConfig as config, storageText } from "./config.js";
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function mountStorage({root,scene}) {
  const doc=root.ownerDocument, q=config.selectors, pi=doc.defaultView.PokeIdle;
  const hadWindowClass=root.classList.contains("ppbui-window");
  let ownedBody=null, ownsBodyScroll=false;
  const claimBody=next=>{
    if(ownedBody===next)return;
    if(ownedBody && ownsBodyScroll)ownedBody.classList.remove("ppbui-scroll");
    ownedBody=next || null;ownsBodyScroll=Boolean(ownedBody && !ownedBody.classList.contains("ppbui-scroll"));
    ownedBody?.classList.add("ppbui-scroll");
  };
  root.classList.add("ppbui-window");claimBody(root.querySelector(q.body));
  const state = Object.fromEntries(["inventory","storage"].map(side=>[side,{query:"",quality:scene._qualityFilter || "",element:scene._elementFilter || "",sort:scene._sortBy || "name"}]));
  let activeSide = "inventory", alive=true, transferring=false;
  const resetGridScrollSides=new Set();
  const withGridScrollReset=(sides,fn)=>{
    const list=Array.isArray(sides)?sides:[sides], added=list.filter(side=>!resetGridScrollSides.has(side));
    list.forEach(side=>resetGridScrollSides.add(side));
    try{return fn();}finally{added.forEach(side=>resetGridScrollSides.delete(side));}
  };
  const markNativeGridScrollReset=sides=>{
    const list=Array.isArray(sides)?sides:[sides];list.forEach(side=>resetGridScrollSides.add(side));
    doc.defaultView.setTimeout(()=>list.forEach(side=>resetGridScrollSides.delete(side)),0);
  };
  const dialogNotes=new Set();
  const pokemonTools=Object.fromEntries(["inventory","storage"].map(side=>[side,createPokemonTools(root,{basics:false,clearControl:false,getCreatures:()=>scene._creatures.filter(c=>c.location===side),refresh:()=>{scene[side==="storage"?"_storagePage":"_inventoryPage"]=0;withGridScrollReset(side,()=>scene.refresh());}})]));
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
    const enhanced=make(original);
    // A later foreign wrapper may capture this Storage adapter and outlive our cleanup.
    // Keep stale captured adapters behaviorally inert after cleanup instead of letting
    // them resurrect PPBUI ownership/state when the foreign wrapper delegates to them.
    const wrapped=function(...args){return alive ? enhanced.apply(this,args) : original.apply(this,args);};
    originals.set(key,{descriptor,original}); wrappers.set(key,wrapped); scene[key]=wrapped;
  };
  const style=doc.createElement("style");style.dataset.ppbuiStyle="storage";
  style.textContent=`
    .storage-window.ppbui-window { container-type:inline-size; min-width:min(980px,calc(100vw - 16px)) !important; max-width:calc(100vw - 16px); border:var(--ppbui-border-width) solid var(--ppbui-border-strong) !important; border-radius:var(--ppbui-window-radius) !important; background:var(--ppbui-bg-1) !important; color:var(--ppbui-text) !important; box-shadow:var(--ppbui-shadow-raised) !important; font-family:var(--ppbui-font-body) !important; }
    .storage-window.ppbui-window > .pokeidle-panel__titlebar { border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border) !important; border-radius:var(--ppbui-radius) !important; background:var(--ppbui-bg-1) !important; background-image:none !important; }
    .storage-window.ppbui-window > .pokeidle-panel__titlebar .pokeidle-panel__title { color:var(--ppbui-text) !important; font:500 var(--ppbui-font-size-title)/var(--ppbui-line-height-tight) var(--ppbui-font-display) !important; letter-spacing:normal; }
    .storage-window.ppbui-window > .pokeidle-panel__body { display:flex; min-height:0; flex-direction:column; background:var(--ppbui-bg-1) !important; background-image:none !important; color:var(--ppbui-text) !important; font-family:var(--ppbui-font-body) !important; }
    .storage-window.ppbui-window .pokecentro-transfer-layout { display:grid; min-height:0; flex:1 1 auto; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:var(--ppbui-space-4); }
    .storage-window.ppbui-window .ppbui-pokemon-fields { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); }
    ${["weak","common","uncommon","rare","epic","legendary","mythical"].map(quality=>`.storage-window.ppbui-window .pokecentro-transfer-slot.rarity-${quality} { --ppbui-storage-quality:var(--quality-${quality}); }`).join("\n")}
    .storage-window.ppbui-window [data-ppbui-storage-side] { display:flex; min-width:0; min-height:0; flex-direction:column; overflow:hidden; border:var(--ppbui-border-width) solid var(--ppbui-border-strong); border-radius:var(--ppbui-radius); background:var(--ppbui-bg-2); color:var(--ppbui-text); box-shadow:none; font-family:var(--ppbui-font-body); }
    .storage-window.ppbui-window [data-ppbui-storage-side] > .pokecentro-vault__head { display:flex; min-height:48px; align-items:center; justify-content:space-between; gap:var(--ppbui-space-4); box-sizing:border-box; padding:var(--ppbui-space-4) var(--ppbui-space-5); border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border); background:var(--ppbui-bg-1) !important; background-image:none !important; color:var(--ppbui-text); }
    .storage-window.ppbui-window .pokecentro-vault__copy { display:flex; min-width:0; flex-direction:column; gap:var(--ppbui-space-1); }
    .storage-window.ppbui-window .pokecentro-vault__copy strong { color:var(--ppbui-text) !important; font:700 var(--ppbui-font-size-section)/var(--ppbui-line-height-tight) var(--ppbui-font-body); letter-spacing:.02em; }
    .storage-window.ppbui-window .pokecentro-vault__copy small { overflow:hidden; color:var(--ppbui-text-muted) !important; font:400 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body); text-overflow:ellipsis; white-space:nowrap; }
    .storage-window.ppbui-window .pokecentro-vault__controls { display:flex; flex:none; align-items:center; gap:var(--ppbui-space-2); }
    .storage-window.ppbui-window .pokecentro-vault__count { flex:none; padding:var(--ppbui-space-2) var(--ppbui-space-3); border:var(--ppbui-separator-width) solid var(--ppbui-border); border-radius:var(--ppbui-radius); background:var(--ppbui-bg-0) !important; color:var(--ppbui-text-muted) !important; font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-data) !important; }
    .storage-window.ppbui-window .pokecentro-vault__bulk { min-height:var(--ppbui-control-height) !important; }
    .storage-window.ppbui-window [data-ppbui-storage-side] > .pokecentro-slot-grid { display:grid; box-sizing:border-box; min-height:0; flex:1 1 auto; grid-template-columns:repeat(7,56px); grid-template-rows:repeat(6,56px); align-content:start; justify-content:space-evenly; gap:var(--ppbui-space-3) 0; padding:var(--ppbui-space-5) var(--ppbui-space-4); overflow-x:hidden; overflow-y:auto; overscroll-behavior:contain; scrollbar-gutter:stable; border:0; border-radius:var(--ppbui-radius); background:var(--ppbui-bg-0) !important; background-image:none !important; box-shadow:none !important; }
    .storage-window.ppbui-window .pokecentro-transfer-slot { --ppbui-storage-quality:var(--ppbui-border-strong); box-sizing:border-box; width:56px; height:56px; margin:0; border:var(--ppbui-separator-width) solid var(--ppbui-border) !important; border-bottom:var(--ppbui-border-width) solid var(--ppbui-storage-quality) !important; border-radius:var(--ppbui-radius) !important; background:var(--ppbui-bg-1) !important; background-image:none !important; box-shadow:none !important; filter:none !important; transition:none !important; transform:none !important; }
    .storage-window.ppbui-window .pokecentro-transfer-slot:hover:not(:disabled) { border-color:var(--ppbui-accent) !important; border-bottom-color:var(--ppbui-storage-quality) !important; background:var(--ppbui-bg-3) !important; filter:none !important; transform:none !important; }
    .storage-window.ppbui-window .pokecentro-transfer-slot:active:not(:disabled) { background:var(--ppbui-bg-0) !important; box-shadow:none !important; }
    .storage-window.ppbui-window .pokecentro-transfer-slot.is-selected,.storage-window.ppbui-window .pokecentro-transfer-slot.is-selected:hover { z-index:2; border-color:var(--ppbui-selected) !important; border-bottom-color:var(--ppbui-storage-quality) !important; background:var(--ppbui-bg-3) !important; box-shadow:none!important; }
    .storage-window.ppbui-window .pokecentro-transfer-slot:focus-visible { z-index:3; outline:var(--ppbui-focus-width) solid var(--ppbui-focus) !important; outline-offset:var(--ppbui-pixel-unit); }
    .storage-window.ppbui-window .pokecentro-transfer-slot.is-fainted { filter:grayscale(1) brightness(.62) !important; }
    .storage-window.ppbui-window .pokecentro-transfer-slot.is-fainted:hover { filter:grayscale(1) brightness(.72) !important; }
    .storage-window.ppbui-window .pokecentro-slot-empty { box-sizing:border-box; width:56px; height:56px; border:var(--ppbui-separator-width) solid var(--ppbui-border) !important; border-radius:var(--ppbui-radius) !important; background:var(--ppbui-bg-0) !important; color:var(--ppbui-text-subtle)!important; box-shadow:none !important; opacity:1; }
    .storage-window.ppbui-window .pokecentro-transfer-slot > .ppbui-storage-sprite { display:block; width:40px; height:40px; object-fit:contain; image-rendering:pixelated; pointer-events:none; }
    .storage-window.ppbui-window .pokecentro-transfer-slot > .inventory-slot__pokemon-level { right:2px; bottom:2px; padding:1px 2px; background:var(--ppbui-bg-0); color:var(--ppbui-text); font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data); text-shadow:none; }
    .storage-window.ppbui-window .pokecentro-transfer-slot > .inventory-slot__locked-mark,.storage-window.ppbui-window .pokecentro-transfer-slot > .inventory-slot__equipped-mark { top:2px; z-index:4; padding:1px; background:var(--ppbui-bg-0); filter:none; font-family:var(--ppbui-font-data); }
    .storage-window.ppbui-window .ppbui-storage-search { min-width:100px; width:180px; flex:1 1 140px; }
    .storage-window.ppbui-window .ppbui-storage-filters { display:grid; min-height:0; flex:0 1 auto; gap:var(--ppbui-space-3); padding:var(--ppbui-space-4) var(--ppbui-space-5); overflow-x:hidden; overflow-y:auto; overscroll-behavior:contain; background:var(--ppbui-bg-2); color:var(--ppbui-text); font:var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body); }
    .storage-window.ppbui-window .ppbui-storage-filters .ppbui-storage-search { width:100%; box-sizing:border-box; }
    .storage-window.ppbui-window input.ppbui-storage-search.ppbui-input,
    .storage-window.ppbui-window .ppbui-storage-filter-row > select.ppbui-select { box-sizing:border-box!important; height:var(--ppbui-control-height)!important; min-height:var(--ppbui-control-height)!important; margin:0!important; padding:0 var(--ppbui-control-padding-x)!important; border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-0)!important; background-image:none!important; clip-path:none!important; color:var(--ppbui-text)!important; box-shadow:none!important; filter:none!important; font:400 var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important; text-shadow:none!important; transition:none!important; transform:none!important; }
    .storage-window.ppbui-window input.ppbui-storage-search.ppbui-input::placeholder { color:var(--ppbui-text-subtle)!important; opacity:1; }
    .storage-window.ppbui-window input.ppbui-storage-search.ppbui-input:focus,
    .storage-window.ppbui-window .ppbui-storage-filter-row > select.ppbui-select:focus { border-color:var(--ppbui-border-strong)!important; outline:none!important; }
    .storage-window.ppbui-window input.ppbui-storage-search.ppbui-input:focus-visible,
    .storage-window.ppbui-window .ppbui-storage-filter-row > select.ppbui-select:focus-visible { outline:var(--ppbui-focus-width) solid var(--ppbui-focus)!important; outline-offset:var(--ppbui-pixel-unit); }
    .storage-window.ppbui-window .ppbui-pokemon-tools input.game-window__search.ppbui-input,
    .storage-window.ppbui-window .ppbui-pokemon-tools select.game-window__select.ppbui-select { box-sizing:border-box!important; height:var(--ppbui-control-height)!important; min-height:var(--ppbui-control-height)!important; margin:0!important; padding:0 var(--ppbui-control-padding-x)!important; border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-0)!important; background-image:none!important; clip-path:none!important; color:var(--ppbui-text)!important; box-shadow:none!important; filter:none!important; font:400 var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important; text-shadow:none!important; transition:none!important; transform:none!important; }
    .storage-window.ppbui-window .ppbui-pokemon-tools input.game-window__search.ppbui-input:focus,
    .storage-window.ppbui-window .ppbui-pokemon-tools select.game-window__select.ppbui-select:focus { border-color:var(--ppbui-border-strong)!important; outline:none!important; }
    .storage-window.ppbui-window .ppbui-pokemon-tools input.game-window__search.ppbui-input:focus-visible,
    .storage-window.ppbui-window .ppbui-pokemon-tools select.game-window__select.ppbui-select:focus-visible { outline:var(--ppbui-focus-width) solid var(--ppbui-focus)!important; outline-offset:var(--ppbui-pixel-unit); }
    .storage-window.ppbui-window .ppbui-storage-search-row { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:var(--ppbui-space-4); }
    .storage-window.ppbui-window .ppbui-storage-results { min-width:64px; flex-shrink:0; color:var(--ppbui-text-muted); font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-data); text-align:right; }
    .storage-window.ppbui-window .ppbui-storage-filter-row { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)) auto; gap:var(--ppbui-space-2); }
    .storage-window.ppbui-window .ppbui-storage-filter-row select { min-width:0; width:100%; }
    .storage-window.ppbui-window .ppbui-storage-transfer { display:flex; align-items:center; justify-content:space-between; gap:var(--ppbui-space-4); min-height:48px; box-sizing:border-box; flex-shrink:0; padding:var(--ppbui-space-4) var(--ppbui-space-5); border-top:var(--ppbui-border-width) solid var(--ppbui-border-strong); background:var(--ppbui-bg-2); color:var(--ppbui-text); font-family:var(--ppbui-font-body); }
    .storage-window.ppbui-window .ppbui-storage-transfer span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .storage-window.ppbui-window .ppbui-storage-transfer > span { min-width:0; font-size:var(--ppbui-font-size-secondary); }
    .storage-window.ppbui-window .ppbui-storage-transfer > button { flex-shrink:0; }
    .storage-window.ppbui-window .ppbui-storage-transfer > small { color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-meta); }
    .storage-window.ppbui-window [data-ppbui-storage-side] > .pokecentro-pager { display:flex; min-height:38px; align-items:center; justify-content:center; gap:var(--ppbui-space-5); border-top:var(--ppbui-separator-width) solid var(--ppbui-border); background:var(--ppbui-bg-1) !important; background-image:none !important; color:var(--ppbui-text); }
    .storage-window.ppbui-window .pokecentro-pager > span { min-width:88px; color:var(--ppbui-text-muted) !important; font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-data) !important; text-align:center; text-transform:uppercase; }
    .storage-window.ppbui-window .pokecentro-pager > .pokeidle-btn.ppbui-button.ppbui-button--1x1 { width:var(--ppbui-button-1x1-size) !important; min-width:var(--ppbui-button-1x1-size) !important; height:var(--ppbui-button-1x1-size) !important; min-height:var(--ppbui-button-1x1-size) !important; padding:0 !important; }
    .storage-window.ppbui-window .ppbui-storage-empty { grid-column:1/-1; grid-row:1/-1; align-self:center; justify-self:center; display:grid; justify-items:center; gap:var(--ppbui-space-4); color:var(--ppbui-text-muted); font:var(--ppbui-font-size-secondary)/var(--ppbui-line-height-body) var(--ppbui-font-body); }
    .storage-window.ppbui-window .pokecentro-overview { display:none; }
    .storage-window.ppbui-window .pokecentro-selection[hidden] { display:none; }
    @container (max-width:879px) {
      .storage-window.ppbui-window .pokecentro-transfer-layout { grid-template-columns:minmax(0,1fr); grid-template-rows:auto auto; align-content:start; overflow-y:auto; overscroll-behavior:contain; }
      .storage-window.ppbui-window [data-ppbui-storage-side] { min-height:0; overflow:visible; }
      .storage-window.ppbui-window [data-ppbui-storage-side] > .pokecentro-slot-grid { min-height:auto; flex:0 0 auto; overflow:visible; overscroll-behavior:auto; scrollbar-gutter:auto; }
      .storage-window.ppbui-window .ppbui-storage-filters { min-height:auto; flex:0 0 auto; overflow:visible; overscroll-behavior:auto; }
    }
    @container (max-width:620px) {
      .storage-window.ppbui-window [data-ppbui-storage-side] > .pokecentro-vault__head { flex-wrap:wrap; }
      .storage-window.ppbui-window .ppbui-storage-filter-row { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .storage-window.ppbui-window .ppbui-storage-filter-row > button { width:100%; }
      .storage-window.ppbui-window .ppbui-pokemon-fields { grid-template-columns:repeat(2,minmax(0,1fr)); }
    }
    @container (max-width:459px) {
      .storage-window.ppbui-window [data-ppbui-storage-side] > .pokecentro-slot-grid { grid-template-columns:repeat(4,56px); grid-template-rows:none; grid-auto-rows:56px; }
    }
    @media (pointer:coarse) { .storage-window.ppbui-window .pokecentro-vault__bulk,.storage-window.ppbui-window .ppbui-storage-filter-row > button,.storage-window.ppbui-window .ppbui-storage-transfer > button { min-height:40px !important; } }
  `;
  doc.head.append(style);
  const footer=()=>{const strip=doc.createElement("div");strip.className="ppbui-storage-transfer ppbui-root";resetFooter(strip);return strip;};
  const resetFooter=strip=>{const hint=doc.createElement("small");hint.textContent=storageText(doc).idle;strip.replaceChildren(hint);};
  const vaultFor=side=>[...root.querySelectorAll(q.vault)].find(el=>el.dataset.ppbuiStorageSide===side);
  const focusKey=(node,key)=>{if(node)node.dataset.ppbuiStorageFocus=key;};
  wrap("refresh",original=>function(...args) {
    const body=this._panel?.body;claimBody(body);
    const scroll=body?.scrollTop, layoutScroll=root.querySelector(".pokecentro-transfer-layout")?.scrollTop, active=doc.activeElement, key=active?.dataset.ppbuiStorageFocus;
    const gridScrolls=Object.fromEntries(["inventory","storage"].filter(side=>!resetGridScrollSides.has(side)).map(side=>[side,vaultFor(side)?.querySelector(q.grid)?.scrollTop ?? 0]));
    const selection=active?.tagName==="INPUT" ? [active.selectionStart,active.selectionEnd] : null;
    const result=original.apply(this,args);
    const currentBody=this._panel?.body;claimBody(currentBody);
    if(key) {
      const target=[...root.querySelectorAll(q.focus)].find(el=>el.dataset.ppbuiStorageFocus===key);
      const fallback=target?.closest(q.vault)?.querySelector(q.search);
      const next=target?.disabled ? fallback : target;next?.focus({preventScroll:true});
      if(next===target && selection?.[0]!=null)next.setSelectionRange(...selection);
    }
    if(currentBody)currentBody.scrollTop=scroll;
    const currentLayout=root.querySelector(".pokecentro-transfer-layout");if(currentLayout && layoutScroll!=null)currentLayout.scrollTop=layoutScroll;
    if(gridScrolls) for(const [side,gridScroll] of Object.entries(gridScrolls)) {
      const grid=vaultFor(side)?.querySelector(q.grid);if(grid)grid.scrollTop=gridScroll;
    }
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
    const container=doc.createElement("div");container.className="ppbui-storage-filters ppbui-root";
    if(!controls) return container;
    const input=doc.createElement("input");input.type="search";input.className="pokecentro-filter-select ppbui-storage-search ppbui-input";input.dataset.ppbuiStorageSearch=side;
    input.placeholder=storageText(doc).search;input.setAttribute("aria-label",input.placeholder);input.value=state[side].query;focusKey(input,`${side}-search`);
    const selects=[...controls.querySelectorAll(q.select)], clear=controls.querySelector(q.clear);
    selects.forEach(select=>select.classList.add("ppbui-select"));clear?.classList.add("ppbui-button");
    const refresh=()=>{scene[side==="storage"?"_storagePage":"_inventoryPage"]=0;withGridScrollReset(side,()=>scene.refresh());};
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
    searchRow.append(input,resultCount);controls.classList.add("ppbui-storage-filter-row");container.append(searchRow,controls,pokemonTools[side].render());return container;
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
    bulk?.classList.add("ppbui-button");
    const filtered=!!(state[side].query.trim() || state[side].quality || state[side].element || pokemonTools[side].active());
    const portuguese=(pi.Localization?.get?.() || doc.documentElement.lang).startsWith("pt");
    const filteredLabel=side==="storage" ? (portuguese?"Retirar filtrados":"Withdraw filtered") : (portuguese?"Depositar filtrados":"Deposit filtered");
    if(bulk && filtered) { bulk.textContent=filteredLabel;bulk.title=`${list.length} Pokémon`;bulk.disabled=!list.length || typeof scene.transferPokeCentroCreature!=="function" || !pi.Dialog?.confirm; }
    if(bulk && transferring)bulk.disabled=true;
    bulk?.addEventListener("click",async event=>{
      markNativeGridScrollReset(["inventory","storage"]);
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
        finally {transferring=false;if(alive)withGridScrollReset(["inventory","storage"],()=>scene.refresh());}
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
      button.classList.add("ppbui-button","ppbui-button--1x1");
      focusKey(button,`${side}-page-${index}`);
      button.addEventListener("click",()=>{markNativeGridScrollReset(side);if(this._creatures.some(c=>c.id===this._selectedId && c.location===side))this._selectedId="";},true);
    });
    if(!list.length) {
      const grid=vault.querySelector(q.grid);
      if(grid) {
        const message=doc.createElement("div"),label=doc.createElement("span");message.className="ppbui-storage-empty ppbui-root";
        label.textContent=totalCount ? text.noResults : side==="storage" ? text.emptyStorage : text.emptyInventory;message.append(label);
        if(totalCount) {const clear=doc.createElement("button");clear.type="button";clear.className="pokeidle-btn ppbui-button";clear.textContent=text.clear;clear.addEventListener("click",()=>vault.querySelector(q.clear)?.click());message.append(clear);}
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
      slot.classList.add("ppbui-storage-slot");
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
      button.addEventListener("click",()=>markNativeGridScrollReset(["inventory","storage"]),{capture:true,once:true});
      name.textContent=section.querySelector(q.name)?.textContent || "";
      strip.replaceChildren(name,button);
    }
    section.hidden=true;return section;
  });
  scene.refresh();
  return {cleanup() {
    alive=false;Object.values(pokemonTools).forEach(tools=>tools.cleanup());dialogNotes.forEach(note=>note.remove());
    for(const [key,{descriptor}] of originals) if(scene[key]===wrappers.get(key)) { if(descriptor) Object.defineProperty(scene,key,descriptor); else delete scene[key]; }
    style.remove();if(!hadWindowClass)root.classList.remove("ppbui-window");if(ownedBody && ownsBodyScroll)ownedBody.classList.remove("ppbui-scroll");ownedBody=null;ownsBodyScroll=false;
    if(root.isConnected && scene._panel?.body===root.querySelector(q.body)) scene.refresh();
  }};
}
