import { storageConfig as config, storageText } from "./config.js";
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function mountStorage({root,scene}) {
  const doc=root.ownerDocument, q=config.selectors, pi=doc.defaultView.PokeIdle;
  let query="";
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
    .storage-window .pokecentro-selection:has(> .pokecentro-selection__empty) { min-height:0; padding:12px; }
  `;
  doc.head.append(style);
  wrap("filterAndSortPokeCentro",original=>function(list) {
    const result=original.call(this,list), needle=normalize(query.trim());
    return needle ? result.filter(c=>normalize([c.nickname,c.name,c.species_name,c.species?.name,pi.DittoDisplayName?.get?.(c)].filter(Boolean).join(" ")).includes(needle)) : result;
  });
  wrap("pokeCentroFiltersActive",original=>function() { return !!query.trim() || original.call(this); });
  wrap("renderPokeCentroFilters",original=>function(...args) {
    const bar=original.apply(this,args), controls=bar.querySelector(q.filters), clear=bar.querySelector(q.clear);
    if (!controls) return bar;
    const input=doc.createElement("input");input.type="search";input.className="pokecentro-filter-select ppbui-storage-search";input.dataset.ppbuiStorageSearch="";
    input.placeholder=storageText(doc).search;input.setAttribute("aria-label",input.placeholder);input.value=query;
    input.addEventListener("input",()=>{
      query=input.value;this._inventoryPage=0;this._storagePage=0;
      const start=input.selectionStart,end=input.selectionEnd;this.refresh();
      const next=root.querySelector(q.search);next?.focus({preventScroll:true});if(next && start!==null) next.setSelectionRange(start,end);
    });
    clear?.addEventListener("click",()=>{query="";},true);
    controls.prepend(input);return bar;
  });
  wrap("renderPokeCentroVault",original=>function(title,subtitle,list,side,totalCount) {
    const pageKey=side==="storage" ? "_storagePage" : "_inventoryPage";
    const pages=Math.max(1,Math.ceil(list.length/config.pageSize));
    this[pageKey]=Math.max(0,Math.min(Number(this[pageKey]) || 0,pages-1));
    const page=this[pageKey], vault=original.call(this,title,subtitle,list,side,totalCount);
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
  scene.refresh();
  return {cleanup() {
    for(const [key,{descriptor}] of originals) if(scene[key]===wrappers.get(key)) { if(descriptor) Object.defineProperty(scene,key,descriptor); else delete scene[key]; }
    style.remove();
    if(root.isConnected && scene._panel?.body===root.querySelector(q.body)) scene.refresh();
  }};
}
