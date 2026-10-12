const selectors={list:".trade-inventory-list",balance:".trade-gold-balance",side:".trade-side",filter:"[data-ppbui-pokemon-filter]",summary:"summary",bar:".ppbui-trade-filter-bar",gold:".trade-gold-row",category:"[data-ppbui-trade-category]"};
export function createTradeUI(root,tools){
  // The native Trade screen currently uses Portuguese labels regardless of the global locale.
  const doc=root.ownerDocument;
  const hadWindowClass=root.classList.contains("ppbui-window"),ownedScrolls=new Set(),ownedNativeRarity=new Map();let disposed=false;root.classList.add("ppbui-window");
  const releaseScroll=node=>{if(!ownedScrolls.has(node))return;node.classList.remove("ppbui-scroll");ownedScrolls.delete(node);};
  const claimScroll=node=>{for(const owned of [...ownedScrolls])if(!owned.isConnected)releaseScroll(owned);if(node && !node.classList.contains("ppbui-scroll")){node.classList.add("ppbui-scroll");ownedScrolls.add(node);}return node;};
  const labelCells=(scope,selector)=>{
    for(const cell of scope?.querySelectorAll(selector)||[]){
      const name=cell.querySelector(".trade-slot__name,.trade-inventory-item__name,b")?.textContent?.trim();
      const previous=cell.dataset.ppbuiTradeFallbackTitle;
      if(previous!==undefined){
        if(cell.title!==previous){delete cell.dataset.ppbuiTradeFallbackTitle;continue;}
        if(name){cell.title=name;cell.dataset.ppbuiTradeFallbackTitle=name;}
        else {cell.removeAttribute("title");delete cell.dataset.ppbuiTradeFallbackTitle;}
      }else if(!cell.hasAttribute("title") && name){cell.title=name;cell.dataset.ppbuiTradeFallbackTitle=name;}
    }
  };
  const copy={filters:"Filtros",close:"Fechar",results:"resultados"};
  const style=doc.createElement("style");style.dataset.ppbuiStyle="trade-layout";
  style.textContent=`
    .trade-session-window.ppbui-window { container-type:inline-size; display:flex !important; flex-direction:column !important; box-sizing:border-box; width:min(1160px,calc(100vw - 16px)) !important; height:min(620px,calc(100dvh - 16px)) !important; min-width:0 !important; min-height:0 !important; max-width:calc(100vw - 16px) !important; max-height:calc(100dvh - 16px) !important; overflow:hidden !important; resize:none !important; border:var(--ppbui-border-width) solid var(--ppbui-border-strong) !important; border-radius:var(--ppbui-window-radius) !important; background:var(--ppbui-bg-1) !important; color:var(--ppbui-text) !important; box-shadow:var(--ppbui-shadow-raised) !important; font-family:var(--ppbui-font-body) !important; }
    /* Trade has no manual size handle. Responsive layout and an independent action dock own the geometry. */
    .trade-session-window.ppbui-window .pokeidle-resize-handle { display:none !important; visibility:hidden !important; pointer-events:none !important; }
    .trade-session-window.ppbui-window > .pokeidle-panel__titlebar { flex:0 0 auto; }
    .trade-session-window.ppbui-window > .pokeidle-panel__body { box-sizing:border-box; flex:1 1 auto !important; min-width:0 !important; min-height:0 !important; padding:var(--ppbui-space-3) !important; overflow:hidden !important; overscroll-behavior:none; scrollbar-gutter:auto !important; }
    .trade-session-window.ppbui-window :where(input:not([type="checkbox"]):not([type="radio"]),select) { box-sizing:border-box; min-height:var(--ppbui-control-height); border:var(--ppbui-border-width) solid var(--ppbui-border-strong) !important; border-radius:var(--ppbui-radius) !important; background:var(--ppbui-bg-0) !important; color:var(--ppbui-text) !important; box-shadow:none !important; font-family:var(--ppbui-font-body) !important; text-shadow:none !important; }
    .trade-session-window.ppbui-window :where(input:not([type="checkbox"]):not([type="radio"]),select):focus-visible { outline:var(--ppbui-focus-width) solid var(--ppbui-focus) !important; outline-offset:var(--ppbui-pixel-unit); }
    .trade-session-window.ppbui-window :where(input:not([type="checkbox"]):not([type="radio"]),select):disabled { border-color:var(--ppbui-border) !important; background:var(--ppbui-bg-1) !important; color:var(--ppbui-text-subtle) !important; opacity:1 !important; }
    .trade-session-window.ppbui-window .trade-shell { display:grid !important; box-sizing:border-box; width:100%; max-width:100%; min-width:0; height:100% !important; min-height:0 !important; grid-template-columns:minmax(318px,1fr) minmax(318px,1fr) minmax(0,1.22fr) !important; gap:var(--ppbui-space-3) !important; align-items:stretch; overflow:hidden !important; }
    .trade-session-window.ppbui-window :is(.trade-side,.trade-inventory) { box-sizing:border-box; min-width:0; max-width:100%; }
    .trade-session-window.ppbui-window .trade-side { align-self:stretch; min-height:0 !important; height:100% !important; display:flex; flex-direction:column; gap:var(--ppbui-space-3); overflow-x:hidden !important; overflow-y:auto !important; overscroll-behavior:contain; scrollbar-gutter:auto !important; }
    .trade-session-window.ppbui-window .trade-side .trade-status { margin-top:auto; flex:0 0 auto; }
    .trade-session-window.ppbui-window .trade-inventory { grid-column:auto; min-height:0 !important; height:100% !important; display:flex; flex-direction:column; overflow:hidden !important; }
    .trade-session-window.ppbui-window .trade-inventory-list { flex:1 1 auto; min-width:0; min-height:0; max-height:none !important; overflow-x:hidden !important; overflow-y:auto !important; overscroll-behavior:contain; grid-template-columns:repeat(auto-fill,56px) !important; grid-auto-rows:56px !important; gap:var(--ppbui-space-2) !important; justify-content:start; align-content:start; }
    .trade-session-window.ppbui-window .trade-side .trade-slots { display:grid !important; flex:0 0 auto !important; width:max-content; min-width:0; max-width:100%; height:auto !important; min-height:0 !important; max-height:none !important; padding:0 !important; overflow:visible !important; grid-template-columns:repeat(5,56px) !important; grid-template-rows:none !important; grid-auto-rows:56px !important; gap:var(--ppbui-space-2) !important; justify-content:start; align-content:start; }
    .trade-session-window.ppbui-window :is(.trade-slot,.trade-inventory-item) { position:relative; box-sizing:border-box; display:grid; place-items:center; flex:none; width:56px !important; height:56px !important; min-width:0 !important; min-height:56px !important; max-height:56px !important; padding:0 !important; overflow:hidden !important; }
    .trade-session-window.ppbui-window .trade-inventory-item.is-pokemon.ppbui-trade-pokemon-slot { border-radius:var(--ppbui-radius) !important; background:var(--ppbui-bg-2) !important; box-shadow:none !important; }
    .trade-session-window.ppbui-window .trade-inventory-item.is-pokemon.ppbui-trade-pokemon-slot:hover { background:var(--ppbui-bg-3) !important; }
    .trade-session-window.ppbui-window .trade-inventory-item.is-pokemon.ppbui-trade-pokemon-slot:focus-visible { z-index:1; outline:var(--ppbui-focus-width) solid var(--ppbui-focus) !important; outline-offset:var(--ppbui-pixel-unit); }
    .trade-session-window.ppbui-window .trade-inventory-item.is-pokemon .ppbui-trade-pokemon-visual { width:32px !important; height:32px !important; max-width:32px !important; max-height:32px !important; object-fit:contain; image-rendering:pixelated; }
    /* The native full name and metadata remain accessible without stretching square slots. */
    .trade-session-window.ppbui-window :is(.trade-slot__name,.trade-slot__meta,.trade-inventory-item__meta) { position:absolute !important; width:1px !important; height:1px !important; padding:0 !important; margin:-1px !important; overflow:hidden !important; white-space:nowrap !important; clip-path:inset(50%) !important; }
    .trade-session-window.ppbui-window .trade-inventory-item b { position:absolute !important; width:1px !important; height:1px !important; padding:0 !important; margin:-1px !important; overflow:hidden !important; white-space:nowrap !important; clip-path:inset(50%) !important; }
    .trade-session-window.ppbui-window .trade-gold-row { min-height:60px; box-sizing:border-box; flex:0 0 auto; flex-wrap:wrap; align-content:center; gap:var(--ppbui-space-2); }
    .trade-session-window.ppbui-window .trade-gold-balance { margin:0; padding:0; flex-basis:100%; color:var(--ppbui-text-muted); font:var(--ppbui-font-size-secondary)/var(--ppbui-line-height-body) var(--ppbui-font-body); }
    .trade-session-window.ppbui-window :is(.trade-side,.trade-shell) > .trade-gold-balance { display:none !important; }
    .trade-session-window.ppbui-window .trade-gold-row > .trade-gold-balance { display:block !important; }
    .trade-session-window.ppbui-window .trade-confirm,.trade-session-window.ppbui-window .trade-cancel { box-sizing:border-box; min-height:var(--ppbui-control-height) !important; flex:0 0 auto; white-space:normal; overflow-wrap:anywhere; border:var(--ppbui-border-width) solid var(--ppbui-border-strong) !important; border-radius:var(--ppbui-radius) !important; background:var(--ppbui-bg-2) !important; color:var(--ppbui-text) !important; box-shadow:none !important; font:700 var(--ppbui-font-size-body)/var(--ppbui-line-height-tight) var(--ppbui-font-body) !important; text-shadow:none !important; transform:none !important; }
    .trade-session-window.ppbui-window .trade-status { flex:0 1 auto; min-width:0; max-width:100%; overflow-wrap:anywhere; }
    /* Preserve the native action ancestors (and delegated game events), yet
       position the existing buttons against the root's permanent bottom shelf. */
    .trade-session-window.ppbui-window > .pokeidle-panel__body,
    .trade-session-window.ppbui-window .trade-shell,
    .trade-session-window.ppbui-window .trade-shell .trade-side { position:static !important; }
    .trade-session-window.ppbui-window .trade-shell .trade-confirm,
    .trade-session-window.ppbui-window .trade-shell .trade-cancel { position:absolute !important; bottom:9px !important; z-index:30 !important; box-sizing:border-box; width:min(220px,calc((100% - 40px) / 2)) !important; max-height:44px; }
    .trade-session-window.ppbui-window .trade-shell .trade-confirm { right:calc(20px + min(220px,calc((100% - 40px) / 2))) !important; }
    .trade-session-window.ppbui-window .trade-shell .trade-cancel { right:12px !important; }
    .trade-session-window.ppbui-window .trade-confirm { border-color:var(--ppbui-accent) !important; color:var(--ppbui-accent-hi) !important; }
    .trade-session-window.ppbui-window .trade-confirm:hover:not(:disabled) { border-color:var(--ppbui-accent-hi) !important; background:var(--ppbui-action-bg) !important; color:var(--ppbui-accent-hi) !important; }
    .trade-session-window.ppbui-window .trade-cancel:hover:not(:disabled) { background:var(--ppbui-bg-3) !important; }
    .trade-session-window.ppbui-window .trade-confirm:active:not(:disabled) { border-color:var(--ppbui-accent-hi) !important; background:var(--ppbui-action-bg) !important; color:var(--ppbui-accent-hi) !important; box-shadow:none !important; }
    .trade-session-window.ppbui-window .trade-cancel:active:not(:disabled) { background:var(--ppbui-bg-3) !important; box-shadow:none !important; }
    .trade-session-window.ppbui-window .trade-confirm:disabled,.trade-session-window.ppbui-window .trade-cancel:disabled,.trade-session-window.ppbui-window .trade-inventory-tab:disabled,.trade-session-window.ppbui-window .trade-inventory-tab[aria-disabled="true"] { cursor:default; border-color:var(--ppbui-border) !important; background:var(--ppbui-bg-1) !important; color:var(--ppbui-text-subtle) !important; box-shadow:none !important; filter:none !important; opacity:1 !important; transform:none !important; }
    .trade-session-window.ppbui-window .trade-confirm:focus-visible,.trade-session-window.ppbui-window .trade-cancel:focus-visible,.trade-session-window.ppbui-window .trade-inventory-tab:focus-visible { outline:var(--ppbui-focus-width) solid var(--ppbui-focus) !important; outline-offset:var(--ppbui-pixel-unit); }
    .trade-session-window.ppbui-window .trade-status { color:var(--ppbui-text-muted); font:var(--ppbui-font-size-secondary)/var(--ppbui-line-height-body) var(--ppbui-font-body); }
    .trade-session-window.ppbui-window > .ppbui-trade-action-dock { box-sizing:border-box; flex:0 0 51px; height:51px; min-width:0; pointer-events:none; border-top:var(--ppbui-separator-width) solid var(--ppbui-border); background:var(--ppbui-bg-1); }
    :is(.pokeidle-dialog-overlay,.pokeidle-overlay,.pokeidle-form-overlay).ppbui-trade-quantity-dialog { box-sizing:border-box; padding:12px !important; overflow:hidden !important; }
    .pokeidle-dialog-overlay.ppbui-trade-quantity-dialog > .pokeidle-dialog { box-sizing:border-box; display:flex; flex-direction:column; width:min(380px,calc(100vw - 24px)) !important; max-width:100% !important; max-height:calc(100dvh - 24px) !important; min-width:0; overflow:hidden !important; }
    .pokeidle-dialog-overlay.ppbui-trade-quantity-dialog .pokeidle-dialog__header,.pokeidle-dialog-overlay.ppbui-trade-quantity-dialog .pokeidle-dialog__actions { flex:0 0 auto; min-width:0; }
    .pokeidle-dialog-overlay.ppbui-trade-quantity-dialog .pokeidle-dialog__body { box-sizing:border-box; flex:1 1 auto; min-width:0; min-height:0; overflow-x:hidden !important; overflow-y:auto !important; overflow-wrap:anywhere; }
    .pokeidle-dialog-overlay.ppbui-trade-quantity-dialog .pokeidle-dialog__body :is(input,select,textarea,label) { box-sizing:border-box; min-width:0; max-width:100%; }
    .pokeidle-dialog-overlay.ppbui-trade-quantity-dialog .pokeidle-dialog__actions { display:flex; flex-wrap:wrap; justify-content:flex-end; }
    :is(.pokeidle-overlay,.pokeidle-form-overlay).ppbui-trade-quantity-dialog > .pokeidle-form-box { box-sizing:border-box; width:min(360px,calc(100vw - 24px)) !important; min-width:0 !important; max-width:100% !important; height:max-content !important; min-height:0 !important; max-height:calc(100dvh - 24px) !important; margin:0 !important; padding:16px 18px !important; overflow-x:hidden !important; overflow-y:auto !important; overscroll-behavior:contain; }
    :is(.pokeidle-overlay,.pokeidle-form-overlay).ppbui-trade-quantity-dialog .pokeidle-form-title { margin:0 0 var(--ppbui-space-4) !important; padding:0 0 var(--ppbui-space-3) !important; }
    :is(.pokeidle-overlay,.pokeidle-form-overlay).ppbui-trade-quantity-dialog .pokeidle-form-field { min-width:0; margin:0 0 var(--ppbui-space-3) !important; }
    :is(.pokeidle-overlay,.pokeidle-form-overlay).ppbui-trade-quantity-dialog .pokeidle-form-field :is(input,select,textarea,label) { box-sizing:border-box; min-width:0 !important; max-width:100% !important; width:100%; }
    :is(.pokeidle-overlay,.pokeidle-form-overlay).ppbui-trade-quantity-dialog .pokeidle-form-buttons { flex-wrap:wrap; margin-top:var(--ppbui-space-3) !important; }
    :is(.pokeidle-dialog-overlay,.pokeidle-overlay,.pokeidle-form-overlay).ppbui-trade-quantity-dialog .pokeidle-form-error:empty { display:none !important; min-height:0 !important; margin:0 !important; }
    :is(.pokeidle-dialog-overlay,.pokeidle-overlay,.pokeidle-form-overlay).ppbui-trade-quantity-dialog .ppbui-trade-quantity-max { flex:0 0 auto; min-width:64px; margin-inline-end:auto; }
    .ppbui-trade-filter-bar .ppbui-select { min-width:0; flex:1; }
    .trade-session-window.ppbui-window .trade-inventory-tab { min-height:var(--ppbui-control-height); border:var(--ppbui-border-width) solid var(--ppbui-border-strong) !important; border-radius:var(--ppbui-radius) !important; background:var(--ppbui-bg-2) !important; color:var(--ppbui-text) !important; box-shadow:none !important; font-family:var(--ppbui-font-body) !important; text-shadow:none !important; }
    .trade-session-window.ppbui-window .trade-inventory-tab:hover:not(.is-active):not(:disabled):not([aria-disabled="true"]) { border-color:var(--ppbui-border-strong) !important; background:var(--ppbui-bg-3) !important; color:var(--ppbui-text) !important; }
    .trade-session-window.ppbui-window .trade-inventory-tab:active:not(.is-active):not(:disabled):not([aria-disabled="true"]) { border-color:var(--ppbui-border-strong) !important; background:var(--ppbui-bg-3) !important; color:var(--ppbui-text) !important; box-shadow:none !important; }
    .trade-session-window.ppbui-window .trade-inventory-tab.is-active { border-color:var(--ppbui-selected) !important; background:var(--ppbui-bg-3) !important; color:var(--ppbui-text) !important; }
    .trade-session-window.ppbui-window .trade-inventory-tab.is-active:hover:not(:disabled):not([aria-disabled="true"]) { border-color:var(--ppbui-selected) !important; }
    .trade-session-window.ppbui-window .trade-inventory-tab.is-active:active:not(:disabled):not([aria-disabled="true"]) { border-color:var(--ppbui-selected) !important; box-shadow:none !important; }
    .ppbui-trade-filter-bar { display:flex; align-items:center; justify-content:space-between; gap:var(--ppbui-space-4); margin-bottom:var(--ppbui-space-4); flex-shrink:0; color:var(--ppbui-text); font-family:var(--ppbui-font-body); }
    .ppbui-trade-filter-bar small { color:var(--ppbui-text-muted); font:var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body); }
    .trade-session-window.ppbui-window .ppbui-trade-native-rarity-host { box-sizing:border-box; min-width:0; max-width:100%; }
    .trade-session-window.ppbui-window .ppbui-trade-native-rarity { box-sizing:border-box; min-width:0; max-width:100%; min-height:var(--ppbui-control-height) !important; padding:0 var(--ppbui-control-padding-x) !important; border:var(--ppbui-border-width) solid var(--ppbui-border-strong) !important; border-radius:var(--ppbui-radius) !important; background:var(--ppbui-bg-0) !important; color:var(--ppbui-text) !important; box-shadow:none !important; font:400 var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body) !important; }
    .ppbui-trade-filters { width:560px; max-width:calc(100vw - 24px); max-height:calc(100dvh - 24px); box-sizing:border-box; overflow:auto; padding:var(--ppbui-space-5); margin:auto; }
    .ppbui-trade-filters::backdrop { background:rgba(0,0,0,.45); }
    .ppbui-trade-filter-heading { display:flex; justify-content:space-between; align-items:center; gap:var(--ppbui-space-4); margin-bottom:var(--ppbui-space-4); }
    .ppbui-trade-filters .ppbui-pokemon-fields { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); }
    .ppbui-trade-filters .ppbui-pokemon-field > span { overflow-wrap:anywhere; }
    @container (max-width:1139px) {
      .trade-session-window.ppbui-window .trade-shell { grid-template-columns:repeat(2,minmax(0,1fr)) !important; grid-template-rows:minmax(0,.8fr) minmax(0,1.2fr); }
      .trade-session-window.ppbui-window .trade-side { grid-column:auto; }
      .trade-session-window.ppbui-window .trade-inventory { grid-column:1/-1; }
    }
    @container (max-width:759px) {
      .trade-session-window.ppbui-window .trade-shell { grid-template-columns:minmax(0,1fr) !important; grid-template-rows:minmax(0,.7fr) minmax(0,.7fr) minmax(0,1.6fr); }
      .trade-session-window.ppbui-window .trade-side { grid-column:auto; }
      .trade-session-window.ppbui-window .trade-inventory { grid-column:auto; }
    }
    @container (max-width:390px) {
      .trade-session-window.ppbui-window .trade-side .trade-slots { grid-template-columns:repeat(4,56px) !important; }
    }
    @container (max-width:290px) {
      .trade-session-window.ppbui-window .trade-side .trade-slots { grid-template-columns:repeat(3,56px) !important; }
    }
    @media (max-width:560px) {
      .trade-session-window.ppbui-window .trade-side .trade-slots { grid-template-columns:repeat(5,50px) !important; grid-auto-rows:50px !important; }
      .trade-session-window.ppbui-window .trade-inventory-list { grid-template-columns:repeat(auto-fill,50px) !important; grid-auto-rows:50px !important; }
      .trade-session-window.ppbui-window :is(.trade-slot,.trade-inventory-item) { width:50px !important; height:50px !important; min-height:50px !important; max-height:50px !important; }
      .trade-session-window.ppbui-window .trade-side .trade-slot:not(.is-filled):nth-child(n+5) { display:grid !important; }
    }
    @media (max-width:560px) {
      @container (max-width:349px) {
        .trade-session-window.ppbui-window .trade-side .trade-slots { grid-template-columns:repeat(4,50px) !important; }
      }
      @container (max-width:289px) {
        .trade-session-window.ppbui-window .trade-side .trade-slots { grid-template-columns:repeat(3,50px) !important; }
      }
    }
    @media (max-width:520px) {
      .ppbui-trade-filters .ppbui-pokemon-fields { grid-template-columns:repeat(2,minmax(0,1fr)); }
    }
    @media (max-height:420px) {
      .trade-session-window.ppbui-window .trade-inventory { overflow-x:hidden !important; overflow-y:auto !important; overscroll-behavior:contain; }
      .trade-session-window.ppbui-window .trade-inventory-list { flex:0 0 auto; min-height:auto; height:auto; max-height:none !important; overflow:visible !important; }
    }
  `;doc.head.append(style);
  const dock=doc.createElement("div");dock.className="ppbui-trade-action-dock ppbui-root";dock.dataset.ppbuiTradeActions="";
  const ownNativeRarityClass=(node,name)=>{
    if(!node?.classList?.contains(name)){node.classList.add(name);if(!ownedNativeRarity.has(node))ownedNativeRarity.set(node,new Set());ownedNativeRarity.get(node).add(name);}
  };
  const releaseNativeRarity=node=>{const classes=ownedNativeRarity.get(node);if(!classes)return;for(const name of classes)node.classList.remove(name);ownedNativeRarity.delete(node);};
  const markNativeRarity=panel=>{
    const clean=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase();
    const seen=new Set();for(const node of [...ownedNativeRarity.keys()])if(!node.isConnected)releaseNativeRarity(node);
    for(const control of panel?.querySelectorAll("select,button,[role='combobox']")||[]){
      if(control.closest(".ppbui-root,.trade-inventory-list,.trade-inventory-item"))continue;
      const label=control.closest("label"),description=clean([control.getAttribute("aria-label"),control.getAttribute("title"),label?.textContent,control.textContent].filter(Boolean).join(" "));
      if(!/(rarit|raridad|rareza)/.test(description))continue;
      ownNativeRarityClass(control,"ppbui-trade-native-rarity");seen.add(control);
      if(label){ownNativeRarityClass(label,"ppbui-trade-native-rarity-host");seen.add(label);}
    }
    for(const node of [...ownedNativeRarity.keys()])if(node.isConnected&&panel?.contains(node)&&!seen.has(node))releaseNativeRarity(node);
  };
  const placeActions=()=>{
    const shell=root.querySelector(".trade-shell");
    // Only reserve footer space when the live native Trade shell owns both actions.
    // Never reparent the buttons: original native delegated listeners and selectors
    // must continue to see .trade-confirm/.trade-cancel inside .trade-side.
    if(shell?.querySelector(".trade-confirm") && shell?.querySelector(".trade-cancel")){
      if(dock.parentElement!==root)root.append(dock);
    }else dock.remove();
  };
  let layoutEpoch=0,layoutRaf=0;const layoutTimers=new Set();
  const reconcileLayout=()=>{
    if(disposed || !root.isConnected)return;
    const balance=root.querySelector(selectors.balance),gold=[...root.querySelectorAll(selectors.gold)].find(row=>row.querySelector("input"));
    if(balance&&gold&&balance.parentElement!==gold)gold.append(balance);
    markNativeRarity(root.querySelector(".trade-inventory"));labelCells(root,".trade-shell .trade-slot");placeActions();
  };
  const scheduleLayout=()=>{
    for(const id of layoutTimers)doc.defaultView?.clearTimeout?.(id);layoutTimers.clear();if(layoutRaf)doc.defaultView?.cancelAnimationFrame?.(layoutRaf);layoutRaf=0;
    const epoch=++layoutEpoch,run=()=>{if(epoch===layoutEpoch)reconcileLayout();};run();Promise.resolve().then(run);
    if(doc.defaultView?.requestAnimationFrame)layoutRaf=doc.defaultView.requestAnimationFrame(()=>{layoutRaf=0;run();});
    for(const delay of [50,150,300,750,1500,3000]){const id=doc.defaultView?.setTimeout?.(()=>{layoutTimers.delete(id);run();},delay);if(id!==undefined)layoutTimers.add(id);}
  };
  // Native quantity prompt is a document-level portal: mark only the exact
  // Trade item prompt, not arbitrary dialogs opened while Trade is active.
  const markedDialogs=new Set(),quantityTimers=new Set(),quantityMaxButtons=new Map(),quantityOwnedItems=new Map();let quantityIntent=null,quantityEpoch=0;
  const cleanQuantityText=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").replace(/\s+/g," ").trim();
  const dialogHosts=()=>doc.querySelectorAll(".pokeidle-dialog-overlay,.pokeidle-overlay,.pokeidle-form-overlay");
  const quantityTitle=overlay=>overlay.querySelector(".pokeidle-dialog__title,.pokeidle-form-title")?.textContent?.trim().toLocaleLowerCase("pt-BR");
  const isQuantityDialog=overlay=>quantityTitle(overlay)==="adicionar item à troca";
  const quantityItemName=item=>cleanQuantityText(item?.querySelector(".trade-inventory-item__name,b")?.textContent||item?.getAttribute("aria-label")||item?.getAttribute("title")||"");
  const quantityInputs=overlay=>[...overlay.querySelectorAll('input[type="number"],input[inputmode="numeric"],.pokeidle-form-field input,.pokeidle-dialog__body input')].filter((input,index,all)=>all.indexOf(input)===index);
  const quantityLabelData=overlay=>{
    const label=overlay.querySelector(".pokeidle-form-field label,.pokeidle-dialog__body label"),text=String(label?.textContent||"").trim(),match=text.match(/^(.+?)\s*[·•-]\s*(?:máximo|max(?:imum)?)\s*:?[ \t]*([0-9][0-9., \t]*)\s*$/iu);
    return match?{name:cleanQuantityText(match[1]),maximumText:match[2]}:null;
  };
  const quantityFingerprint=overlay=>{const label=quantityLabelData(overlay),input=quantityInputs(overlay)[0];return [quantityTitle(overlay)||"",label?.name||"",label?.maximumText||"",input?.getAttribute("max")||""].join("|");};
  const quantityMatchesIntent=overlay=>{
    if(markedDialogs.has(overlay)||!quantityIntent)return false;
    const data=quantityLabelData(overlay),inputs=quantityInputs(overlay),actions=[...overlay.querySelectorAll(".pokeidle-dialog__actions button,.pokeidle-form-buttons button")].filter(button=>!button.hasAttribute("data-ppbui-trade-quantity-max"));
    if(!quantityIntent.name||!data||data.name!==quantityIntent.name||inputs.length!==1||actions.length!==2)return false;
    const before=quantityIntent.before.get(overlay);return before===undefined||before.fingerprint!==quantityFingerprint(overlay)||before.input!==inputs[0];
  };
  const quantityInput=overlay=>quantityInputs(overlay)[0]||null;
  const strictQuantityInteger=value=>{const raw=String(value??"").trim();if(!/^\d+$/.test(raw))return null;const number=Number(raw);return Number.isSafeInteger(number)&&number>0?number:null;};
  const groupedQuantityInteger=value=>{const raw=String(value??"").trim();if(/^\d+$/.test(raw))return strictQuantityInteger(raw);if(!/^\d{1,3}(?:[., ]\d{3})+$/.test(raw))return null;return strictQuantityInteger(raw.replace(/[., ]/g,""));};
  const quantityMaximum=(overlay,input)=>{
    const attribute=input?.getAttribute("max");if(attribute!==null&&attribute!=="")return strictQuantityInteger(attribute);
    const data=quantityLabelData(overlay);return groupedQuantityInteger(data?.maximumText);
  };
  const releaseQuantityDialog=overlay=>{
    quantityMaxButtons.get(overlay)?.remove();quantityMaxButtons.delete(overlay);
    quantityOwnedItems.delete(overlay);overlay.classList.remove("ppbui-trade-quantity-dialog");markedDialogs.delete(overlay);
  };
  const enhanceQuantityDialog=(overlay,item=quantityOwnedItems.get(overlay)||quantityLabelData(overlay)?.name||"item")=>{
    const input=quantityInput(overlay),maximum=quantityMaximum(overlay,input),minimum=input?.getAttribute("min"),min=minimum?strictQuantityInteger(minimum):null,actions=overlay.querySelector(".pokeidle-dialog__actions,.pokeidle-form-buttons"),form=overlay.querySelector(".pokeidle-form-box,.pokeidle-dialog");
    let max=quantityMaxButtons.get(overlay);
    if(!input||!maximum||!actions||(min&&maximum<min)){max?.remove();quantityMaxButtons.delete(overlay);return;}
    if(!max){max=doc.createElement("button");max.type="button";max.className="pokeidle-btn ppbui-button ppbui-trade-quantity-max";max.dataset.ppbuiTradeQuantityMax="";max.textContent="Max";quantityMaxButtons.set(overlay,max);}
    max.disabled=input.disabled||input.readOnly||form?.getAttribute("aria-busy")==="true";max.setAttribute("aria-label","Preencher quantidade máxima de "+item+": "+maximum);max.title="Máximo: "+maximum;
    max.onclick=()=>{const currentInput=quantityInput(overlay),current=quantityMaximum(overlay,currentInput),currentMin=currentInput?.getAttribute("min"),minimumNow=currentMin?strictQuantityInteger(currentMin):null,data=quantityLabelData(overlay),busy=overlay.querySelector(".pokeidle-form-box,.pokeidle-dialog")?.getAttribute("aria-busy")==="true";if(max.disabled||busy||currentInput!==input||input.disabled||input.readOnly||!isQuantityDialog(overlay)||!input.isConnected||!current||(minimumNow&&current<minimumNow)||data?.name!==item)return;input.value=String(current);for(const type of ["input","change"])input.dispatchEvent(new doc.defaultView.Event(type,{bubbles:true}));};
    if(max.parentElement!==actions)actions.insertBefore(max,actions.firstElementChild);
  };
  const markQuantityDialog=()=>{
    if(disposed || !root.isConnected)return;
    for(const overlay of [...markedDialogs]){
      const owner=quantityOwnedItems.get(overlay),data=quantityLabelData(overlay);
      if(!overlay.isConnected || !isQuantityDialog(overlay) || !owner || data?.name!==owner)releaseQuantityDialog(overlay);
      else enhanceQuantityDialog(overlay,owner);
    }
    if(!quantityIntent)return;
    for(const overlay of dialogHosts()){
      if(!isQuantityDialog(overlay)||!quantityMatchesIntent(overlay))continue;
      const owner=quantityLabelData(overlay)?.name;if(!owner)continue;
      overlay.classList.add("ppbui-trade-quantity-dialog");markedDialogs.add(overlay);quantityOwnedItems.set(overlay,owner);enhanceQuantityDialog(overlay,owner);quantityIntent=null;break;
    }
  };
  const queueQuantityScan=(delay,epoch)=>{
    const set=doc.defaultView?.setTimeout;if(!set)return;
    const id=set(()=>{quantityTimers.delete(id);if(epoch===quantityEpoch)markQuantityDialog();},delay);quantityTimers.add(id);
  };
  const onInventoryClick=event=>{
    const item=event.target?.closest?.(".trade-inventory-item"),list=item?.closest?.(selectors.list);if(!item || !list || !root.contains(list) || item.classList.contains("is-pokemon") || item.disabled || item.getAttribute("aria-disabled")==="true" || !root.contains(item))return;
    const name=quantityItemName(item);if(!name)return;
    for(const id of quantityTimers)doc.defaultView?.clearTimeout?.(id);quantityTimers.clear();const epoch=++quantityEpoch,before=new Map();for(const overlay of dialogHosts())before.set(overlay,{fingerprint:quantityFingerprint(overlay),input:quantityInput(overlay)});quantityIntent={name,before,epoch};
    Promise.resolve().then(markQuantityDialog);
    doc.defaultView?.requestAnimationFrame?.(markQuantityDialog);
    for(const delay of [0,50,150,300,750,1500])queueQuantityScan(delay,epoch);
    const expire=doc.defaultView?.setTimeout?.(()=>{quantityTimers.delete(expire);if(epoch===quantityEpoch)quantityIntent=null;},1800);if(expire!==undefined)quantityTimers.add(expire);
  };
  const onDialogFocus=event=>{if(event.target?.closest?.(".pokeidle-dialog-overlay,.pokeidle-overlay,.pokeidle-form-overlay"))markQuantityDialog();};
  root.addEventListener("click",onInventoryClick,true);
  doc.addEventListener("focusin",onDialogFocus,true);
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
    markNativeRarity(panel);labelCells(panel,selectors.list+" .trade-inventory-item");
    const controls=tools.render(),summary=controls.querySelector(selectors.summary).textContent;button.textContent=summary;
    button.setAttribute("aria-haspopup","dialog");results.textContent=`${count} ${copy.results}`;
    button.onclick=()=>{trigger=button;if(dialog)return;dialog=doc.createElement("dialog");dialog.className="ppbui-trade-filters ppbui-dialog ppbui-root ppbui-scroll";dialog.setAttribute("aria-labelledby","ppbui-trade-filter-title");dialog.addEventListener("cancel",event=>{event.preventDefault();close();});doc.body.append(dialog);paint();if(dialog.showModal)dialog.showModal();else dialog.setAttribute("open","");};
    bar.append(button,results);const list=claimScroll(panel.querySelector(selectors.list));list?.before(bar);trigger=button;paint();
  },items(panel,values,value,count,onchange){
    close();panel.querySelector(selectors.bar)?.remove();
    const bar=doc.createElement("div"),select=doc.createElement("select"),results=doc.createElement("small");bar.className="ppbui-trade-filter-bar ppbui-root";select.className="ppbui-select";select.dataset.ppbuiTradeCategory="";select.setAttribute("aria-label","Categoria dos itens");
    for(const [id,label] of [["","Todas as categorias"],...values]){const option=doc.createElement("option");option.value=id;option.textContent=label;select.append(option);}select.value=value;select.onchange=()=>onchange(select.value);
    results.textContent=`${count} ${copy.results}`;bar.append(select,results);const list=claimScroll(panel.querySelector(selectors.list));labelCells(panel,selectors.list+" .trade-inventory-item");list?.before(bar);
  },count(count){const bar=root.querySelector(selectors.bar),node=bar?.querySelector("small"),button=bar?.querySelector("[data-ppbui-trade-filters]");if(node)node.textContent=`${count} ${copy.results}`;if(button)button.textContent=tools.label();labelCells(root,selectors.list+" .trade-inventory-item");
  },sync(){scheduleLayout();},close,cleanup(){disposed=true;layoutEpoch++;if(layoutRaf)doc.defaultView?.cancelAnimationFrame?.(layoutRaf);for(const id of layoutTimers)doc.defaultView?.clearTimeout?.(id);layoutTimers.clear();close();root.removeEventListener("click",onInventoryClick,true);doc.removeEventListener("focusin",onDialogFocus,true);quantityEpoch++;for(const id of quantityTimers)doc.defaultView?.clearTimeout?.(id);quantityTimers.clear();quantityIntent=null;for(const overlay of [...markedDialogs])releaseQuantityDialog(overlay);for(const node of [...ownedNativeRarity.keys()])releaseNativeRarity(node);dock.remove();for(const cell of root.querySelectorAll("[data-ppbui-trade-fallback-title]")){if(cell.title===cell.dataset.ppbuiTradeFallbackTitle)cell.removeAttribute("title");delete cell.dataset.ppbuiTradeFallbackTitle;}style.remove();for(const node of [...ownedScrolls])releaseScroll(node);if(!hadWindowClass)root.classList.remove("ppbui-window");}};
}
