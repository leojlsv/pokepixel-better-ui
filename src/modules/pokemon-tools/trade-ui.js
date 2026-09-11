const selectors={list:".trade-inventory-list",balance:".trade-gold-balance",side:".trade-side",filter:"[data-ppbui-pokemon-filter]",summary:"summary",bar:".ppbui-trade-filter-bar",gold:".trade-gold-row",category:"[data-ppbui-trade-category]"};
export function createTradeUI(root,tools){
  // The native Trade screen currently uses Portuguese labels regardless of the global locale.
  const doc=root.ownerDocument;
  const copy={filters:"Filtros",close:"Fechar",results:"resultados"};
  const style=doc.createElement("style");style.dataset.ppbuiStyle="trade-layout";
  style.textContent=`
    .trade-session-window { min-width:1000px !important; }
    .trade-session-window .trade-shell { grid-template-columns:minmax(318px,1fr) minmax(318px,1fr) minmax(280px,.9fr); }
    .trade-session-window .trade-inventory { grid-column:auto; }
    .trade-session-window .trade-inventory-list { grid-template-columns:repeat(4,56px); }
    .trade-session-window .trade-gold-row { min-height:72px; box-sizing:border-box; flex-wrap:wrap; align-content:center; }
    .trade-session-window .trade-gold-balance { margin:0; padding:0; flex-basis:100%; font-size:11px; }
    .trade-session-window .trade-confirm,.trade-session-window .trade-cancel { min-height:36px; box-sizing:border-box; font:700 11px var(--ui-font-body); }
    .trade-session-window .trade-status { font-size:11px; line-height:1.4; }
    .trade-session-window .trade-cancel { background:transparent !important; border:1px solid var(--ui-gold-dark) !important; color:var(--ui-muted) !important; }
    .trade-session-window .trade-cancel:hover:not(:disabled) { color:var(--ui-ink) !important; }
    .ppbui-trade-filter-bar select { min-width:0; flex:1; height:30px; color:var(--ui-ink); background:var(--ui-navy-deep,#111); border:1px solid var(--ui-gold-dark); font:11px var(--ui-font-body); }
    .trade-session-window .trade-inventory-tab { color:var(--ui-ink) !important; }
    .trade-session-window .trade-inventory-tab.is-active { color:var(--ui-gold-light) !important; border-color:var(--ui-gold) !important; }
    .ppbui-trade-filter-bar { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; flex-shrink:0; }
    .ppbui-trade-filter-bar small { color:var(--ui-muted); font:10px var(--ui-font-body); }
    .ppbui-trade-filter-bar button { min-height:28px; font:11px var(--ui-font-body); }
    .ppbui-trade-filters { width:560px; max-width:calc(100vw - 24px); max-height:calc(100dvh - 24px); box-sizing:border-box; overflow:auto; padding:12px; margin:auto; border:1px solid var(--ui-gold-dark); border-radius:var(--ui-window-radius,8px); background:var(--ui-panel,#1c1c1e); color:var(--ui-ink); font:12px var(--ui-font-body); }
    .ppbui-trade-filters::backdrop { background:rgba(0,0,0,.45); }
    .ppbui-trade-filter-heading { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px; }
    .ppbui-trade-filters .ppbui-pokemon-fields { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); }
    .ppbui-trade-filters input,.ppbui-trade-filters select { height:32px; padding:4px 6px; color:var(--ui-ink); background:var(--ui-navy-deep,#111); border:1px solid var(--ui-gold-dark); border-radius:var(--ui-card-radius,3px); }
    .ppbui-trade-filters .ppbui-pokemon-field > span { overflow-wrap:anywhere; }
  `;doc.head.append(style);
  let dialog=null,trigger=null;
  const close=()=>{if(dialog){dialog.remove();dialog=null;}if(trigger?.isConnected)trigger.focus();};
  const paint=()=>{
    if(!dialog)return;
    const key=doc.activeElement?.dataset.ppbuiPokemonFilter;
    const heading=doc.createElement("div"),title=doc.createElement("strong"),button=doc.createElement("button");heading.className="ppbui-trade-filter-heading";
    title.id="ppbui-trade-filter-title";title.textContent=copy.filters;button.className="pokeidle-btn";button.type="button";button.textContent=copy.close;button.onclick=close;heading.append(title,button);
    const panel=tools.render();panel.open=true;panel.querySelector(selectors.summary).hidden=true;
    dialog.replaceChildren(heading,panel);
    if(key)[...dialog.querySelectorAll(selectors.filter)].find(input=>input.dataset.ppbuiPokemonFilter===key)?.focus();
  };
  return {inventory(panel,count){
    panel.querySelector(selectors.bar)?.remove();
    const bar=doc.createElement("div"),button=doc.createElement("button"),results=doc.createElement("small");bar.className="ppbui-trade-filter-bar";button.className="pokeidle-btn";button.type="button";button.dataset.ppbuiTradeFilters="";
    // Render the shared controls without placing them in the narrow inventory column.
    const controls=tools.render(),summary=controls.querySelector(selectors.summary).textContent;button.textContent=`${copy.filters} · ${summary.split("·").pop().trim()}`;
    button.setAttribute("aria-haspopup","dialog");results.textContent=`${count} ${copy.results}`;
    button.onclick=()=>{trigger=button;if(dialog)return;dialog=doc.createElement("dialog");dialog.className="ppbui-trade-filters";dialog.setAttribute("aria-labelledby","ppbui-trade-filter-title");dialog.addEventListener("cancel",event=>{event.preventDefault();close();});doc.body.append(dialog);paint();if(dialog.showModal)dialog.showModal();else dialog.setAttribute("open","");};
    bar.append(button,results);panel.querySelector(selectors.list)?.before(bar);trigger=button;paint();
  },items(panel,values,value,count,onchange){
    close();panel.querySelector(selectors.bar)?.remove();
    const bar=doc.createElement("div"),select=doc.createElement("select"),results=doc.createElement("small");bar.className="ppbui-trade-filter-bar";select.dataset.ppbuiTradeCategory="";select.setAttribute("aria-label","Categoria dos itens");
    for(const [id,label] of [["","Todas as categorias"],...values]){const option=doc.createElement("option");option.value=id;option.textContent=label;select.append(option);}select.value=value;select.onchange=()=>onchange(select.value);
    results.textContent=`${count} ${copy.results}`;bar.append(select,results);panel.querySelector(selectors.list)?.before(bar);
  },count(count){const node=root.querySelector(`${selectors.bar} small`);if(node)node.textContent=`${count} ${copy.results}`;
  },sync(){root.querySelectorAll(selectors.side).forEach(side=>{const balance=side.querySelector(selectors.balance);if(balance)side.querySelector(selectors.gold)?.append(balance);});},close,cleanup(){close();style.remove();}};
}
