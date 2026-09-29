const selectors={list:".trade-inventory-list",balance:".trade-gold-balance",side:".trade-side",filter:"[data-ppbui-pokemon-filter]",summary:"summary",bar:".ppbui-trade-filter-bar",gold:".trade-gold-row",category:"[data-ppbui-trade-category]"};
export function createTradeUI(root,tools){
  // The native Trade screen currently uses Portuguese labels regardless of the global locale.
  const doc=root.ownerDocument;
  const hadWindowClass=root.classList.contains("ppbui-window"),ownedScrolls=new Set();root.classList.add("ppbui-window");
  const claimScroll=node=>{if(node && !node.classList.contains("ppbui-scroll")){node.classList.add("ppbui-scroll");ownedScrolls.add(node);}return node;};
  const copy={filters:"Filtros",close:"Fechar",results:"resultados"};
  const style=doc.createElement("style");style.dataset.ppbuiStyle="trade-layout";
  style.textContent=`
    .trade-session-window.ppbui-window { container-type:inline-size; box-sizing:border-box; width:100% !important; min-width:0 !important; max-width:100% !important; border:var(--ppbui-border-width) solid var(--ppbui-border-strong) !important; border-radius:var(--ppbui-radius) !important; background:var(--ppbui-bg-1) !important; color:var(--ppbui-text) !important; box-shadow:var(--ppbui-shadow-raised) !important; font-family:var(--ppbui-font-body) !important; }
    .trade-session-window.ppbui-window :where(input:not([type="checkbox"]):not([type="radio"]),select) { box-sizing:border-box; min-height:var(--ppbui-control-height); border:var(--ppbui-border-width) solid var(--ppbui-border-strong) !important; border-radius:var(--ppbui-radius) !important; background:var(--ppbui-bg-0) !important; color:var(--ppbui-text) !important; box-shadow:none !important; font-family:var(--ppbui-font-body) !important; text-shadow:none !important; }
    .trade-session-window.ppbui-window :where(input:not([type="checkbox"]):not([type="radio"]),select):focus-visible { outline:var(--ppbui-border-width) solid var(--ppbui-focus) !important; outline-offset:var(--ppbui-pixel-unit); }
    .trade-session-window.ppbui-window :where(input:not([type="checkbox"]):not([type="radio"]),select):disabled { border-color:var(--ppbui-border) !important; background:var(--ppbui-bg-1) !important; color:var(--ppbui-text-subtle) !important; opacity:1 !important; }
    .trade-session-window.ppbui-window .trade-shell { box-sizing:border-box; width:100%; max-width:100%; min-width:0; grid-template-columns:minmax(318px,1fr) minmax(318px,1fr) minmax(280px,.9fr); }
    .trade-session-window.ppbui-window :is(.trade-side,.trade-inventory) { box-sizing:border-box; min-width:0; max-width:100%; }
    .trade-session-window.ppbui-window .trade-inventory { grid-column:auto; }
    .trade-session-window.ppbui-window .trade-inventory-list { grid-template-columns:repeat(4,56px); }
    .trade-session-window.ppbui-window .trade-slots { min-width:0; max-width:100%; }
    .trade-session-window.ppbui-window .trade-gold-row { min-height:72px; box-sizing:border-box; flex-wrap:wrap; align-content:center; }
    .trade-session-window.ppbui-window .trade-gold-balance { margin:0; padding:0; flex-basis:100%; color:var(--ppbui-text-muted); font:var(--ppbui-font-size-secondary)/var(--ppbui-line-height-body) var(--ppbui-font-body); }
    .trade-session-window.ppbui-window .trade-confirm,.trade-session-window.ppbui-window .trade-cancel { box-sizing:border-box; min-height:var(--ppbui-control-height) !important; border:var(--ppbui-border-width) solid var(--ppbui-border-strong) !important; border-radius:var(--ppbui-radius) !important; background:var(--ppbui-bg-2) !important; color:var(--ppbui-text) !important; box-shadow:none !important; font:700 var(--ppbui-font-size-body)/var(--ppbui-line-height-tight) var(--ppbui-font-body) !important; text-shadow:none !important; transform:none !important; }
    .trade-session-window.ppbui-window .trade-confirm { border-color:var(--ppbui-accent) !important; color:var(--ppbui-accent-hi) !important; }
    .trade-session-window.ppbui-window .trade-confirm:hover:not(:disabled) { border-color:var(--ppbui-accent-hi) !important; background:var(--ppbui-action-bg) !important; color:var(--ppbui-accent-hi) !important; }
    .trade-session-window.ppbui-window .trade-cancel:hover:not(:disabled) { background:var(--ppbui-bg-3) !important; }
    .trade-session-window.ppbui-window .trade-confirm:active:not(:disabled) { border-color:var(--ppbui-accent-hi) !important; background:var(--ppbui-action-bg) !important; color:var(--ppbui-accent-hi) !important; box-shadow:none !important; }
    .trade-session-window.ppbui-window .trade-cancel:active:not(:disabled) { background:var(--ppbui-bg-3) !important; box-shadow:none !important; }
    .trade-session-window.ppbui-window .trade-confirm:disabled,.trade-session-window.ppbui-window .trade-cancel:disabled,.trade-session-window.ppbui-window .trade-inventory-tab:disabled,.trade-session-window.ppbui-window .trade-inventory-tab[aria-disabled="true"] { cursor:default; border-color:var(--ppbui-border) !important; background:var(--ppbui-bg-1) !important; color:var(--ppbui-text-subtle) !important; box-shadow:none !important; filter:none !important; opacity:1 !important; transform:none !important; }
    .trade-session-window.ppbui-window .trade-confirm:focus-visible,.trade-session-window.ppbui-window .trade-cancel:focus-visible,.trade-session-window.ppbui-window .trade-inventory-tab:focus-visible { outline:var(--ppbui-border-width) solid var(--ppbui-focus) !important; outline-offset:var(--ppbui-pixel-unit); }
    .trade-session-window.ppbui-window .trade-status { color:var(--ppbui-text-muted); font:var(--ppbui-font-size-secondary)/var(--ppbui-line-height-body) var(--ppbui-font-body); }
    .ppbui-trade-filter-bar .ppbui-select { min-width:0; flex:1; }
    .trade-session-window.ppbui-window .trade-inventory-tab { min-height:var(--ppbui-control-height); border:var(--ppbui-border-width) solid var(--ppbui-border-strong) !important; border-radius:var(--ppbui-radius) !important; background:var(--ppbui-bg-2) !important; color:var(--ppbui-text) !important; box-shadow:none !important; font-family:var(--ppbui-font-body) !important; text-shadow:none !important; }
    .trade-session-window.ppbui-window .trade-inventory-tab:hover:not(.is-active):not(:disabled):not([aria-disabled="true"]) { border-color:var(--ppbui-border-strong) !important; background:var(--ppbui-bg-3) !important; color:var(--ppbui-text) !important; }
    .trade-session-window.ppbui-window .trade-inventory-tab:active:not(.is-active):not(:disabled):not([aria-disabled="true"]) { border-color:var(--ppbui-border-strong) !important; background:var(--ppbui-bg-3) !important; color:var(--ppbui-text) !important; box-shadow:none !important; }
    .trade-session-window.ppbui-window .trade-inventory-tab.is-active { border-color:var(--ppbui-selected) !important; background:var(--ppbui-bg-3) !important; color:var(--ppbui-text) !important; }
    .trade-session-window.ppbui-window .trade-inventory-tab.is-active:hover:not(:disabled):not([aria-disabled="true"]) { border-color:var(--ppbui-selected) !important; }
    .trade-session-window.ppbui-window .trade-inventory-tab.is-active:active:not(:disabled):not([aria-disabled="true"]) { border-color:var(--ppbui-selected) !important; box-shadow:none !important; }
    .ppbui-trade-filter-bar { display:flex; align-items:center; justify-content:space-between; gap:var(--ppbui-space-4); margin-bottom:var(--ppbui-space-4); flex-shrink:0; color:var(--ppbui-text); font-family:var(--ppbui-font-body); }
    .ppbui-trade-filter-bar small { color:var(--ppbui-text-muted); font:var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body); }
    .ppbui-trade-filters { width:560px; max-width:calc(100vw - 24px); max-height:calc(100dvh - 24px); box-sizing:border-box; overflow:auto; padding:var(--ppbui-space-5); margin:auto; }
    .ppbui-trade-filters::backdrop { background:rgba(0,0,0,.45); }
    .ppbui-trade-filter-heading { display:flex; justify-content:space-between; align-items:center; gap:var(--ppbui-space-4); margin-bottom:var(--ppbui-space-4); }
    .ppbui-trade-filters .ppbui-pokemon-fields { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); }
    .ppbui-trade-filters .ppbui-pokemon-field > span { overflow-wrap:anywhere; }
    @container (max-width:959px) {
      .trade-session-window.ppbui-window .trade-shell { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .trade-session-window.ppbui-window .trade-side { grid-column:auto; }
      .trade-session-window.ppbui-window .trade-inventory { grid-column:1/-1; }
      .trade-session-window.ppbui-window .trade-slots { grid-template-columns:repeat(4,56px); justify-content:center; }
    }
    @container (max-width:519px) {
      .trade-session-window.ppbui-window .trade-shell { grid-template-columns:minmax(0,1fr); }
      .trade-session-window.ppbui-window .trade-side { grid-column:auto; }
      .trade-session-window.ppbui-window .trade-inventory { grid-column:auto; }
      .trade-session-window.ppbui-window .trade-slots { grid-template-columns:repeat(5,56px); }
    }
    @container (max-width:339px) {
      .trade-session-window.ppbui-window .trade-slots { grid-template-columns:repeat(4,56px); }
    }
    @media (max-width:520px) {
      .ppbui-trade-filters .ppbui-pokemon-fields { grid-template-columns:repeat(2,minmax(0,1fr)); }
    }
  `;doc.head.append(style);
  let dialog=null,trigger=null;
  const close=()=>{if(dialog){dialog.remove();dialog=null;}if(trigger?.isConnected)trigger.focus();};
  const paint=()=>{
    if(!dialog)return;
    const key=doc.activeElement?.dataset.ppbuiPokemonFilter;
    const heading=doc.createElement("div"),title=doc.createElement("strong"),button=doc.createElement("button");heading.className="ppbui-trade-filter-heading";
    title.id="ppbui-trade-filter-title";title.textContent=copy.filters;button.className="pokeidle-btn ppbui-button";button.type="button";button.textContent=copy.close;button.onclick=close;heading.append(title,button);
    const panel=tools.render();panel.open=true;panel.querySelector(selectors.summary).hidden=true;
    dialog.replaceChildren(heading,panel);
    if(key)[...dialog.querySelectorAll(selectors.filter)].find(input=>input.dataset.ppbuiPokemonFilter===key)?.focus();
  };
  return {inventory(panel,count){
    panel.querySelector(selectors.bar)?.remove();
    const bar=doc.createElement("div"),button=doc.createElement("button"),results=doc.createElement("small");bar.className="ppbui-trade-filter-bar ppbui-root";button.className="pokeidle-btn ppbui-button";button.type="button";button.dataset.ppbuiTradeFilters="";
    // Render the shared controls without placing them in the narrow inventory column.
    const controls=tools.render(),summary=controls.querySelector(selectors.summary).textContent;button.textContent=`${copy.filters} · ${summary.split("·").pop().trim()}`;
    button.setAttribute("aria-haspopup","dialog");results.textContent=`${count} ${copy.results}`;
    button.onclick=()=>{trigger=button;if(dialog)return;dialog=doc.createElement("dialog");dialog.className="ppbui-trade-filters ppbui-dialog ppbui-root ppbui-scroll";dialog.setAttribute("aria-labelledby","ppbui-trade-filter-title");dialog.addEventListener("cancel",event=>{event.preventDefault();close();});doc.body.append(dialog);paint();if(dialog.showModal)dialog.showModal();else dialog.setAttribute("open","");};
    bar.append(button,results);const list=claimScroll(panel.querySelector(selectors.list));list?.before(bar);trigger=button;paint();
  },items(panel,values,value,count,onchange){
    close();panel.querySelector(selectors.bar)?.remove();
    const bar=doc.createElement("div"),select=doc.createElement("select"),results=doc.createElement("small");bar.className="ppbui-trade-filter-bar ppbui-root";select.className="ppbui-select";select.dataset.ppbuiTradeCategory="";select.setAttribute("aria-label","Categoria dos itens");
    for(const [id,label] of [["","Todas as categorias"],...values]){const option=doc.createElement("option");option.value=id;option.textContent=label;select.append(option);}select.value=value;select.onchange=()=>onchange(select.value);
    results.textContent=`${count} ${copy.results}`;bar.append(select,results);const list=claimScroll(panel.querySelector(selectors.list));list?.before(bar);
  },count(count){const node=root.querySelector(`${selectors.bar} small`);if(node)node.textContent=`${count} ${copy.results}`;
  },sync(){root.querySelectorAll(selectors.side).forEach(side=>{const balance=side.querySelector(selectors.balance);if(balance)side.querySelector(selectors.gold)?.append(balance);});},close,cleanup(){close();style.remove();for(const node of ownedScrolls)node.classList.remove("ppbui-scroll");ownedScrolls.clear();if(!hadWindowClass)root.classList.remove("ppbui-window");}};
}
