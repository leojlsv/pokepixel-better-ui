import {test} from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";
import {createTradeUI} from "../src/modules/pokemon-tools/trade-ui.js";
import {createPokemonTools} from "../src/modules/pokemon-tools/ui.js";
test('Trade dialog keeps filters outside inventory, retains focus and cleans up',()=>{
 const dom=new JSDOM('<div class="trade-session-window"><div class="trade-gold-balance">100</div><aside><div class="trade-inventory-list"></div></aside><section class="trade-side"><div class="trade-gold-row" data-kind="received"></div><div class="trade-gold-row" data-kind="own"><input></div><button>Confirm</button></section></div>',{url:'https://example.test'}),doc=dom.window.document,root=doc.body.firstChild,panel=root.querySelector('aside');
 const tools=createPokemonTools(root,{getCreatures:()=>[],refresh:()=>ui.inventory(panel,3)}),ui=createTradeUI(root,tools);
 ui.inventory(panel,8);ui.sync();assert.equal(root.querySelector('[data-kind=own]').lastChild.className,'trade-gold-balance');assert.equal(root.querySelector('[data-kind=received] .trade-gold-balance'),null);assert.ok(root.classList.contains('ppbui-window'));const claimedList=panel.querySelector('.trade-inventory-list');assert.ok(claimedList.classList.contains('ppbui-scroll'));
 const trigger=root.querySelector('[data-ppbui-trade-filters]');assert.ok(trigger.classList.contains('ppbui-button'));assert.ok(trigger.closest('.ppbui-trade-filter-bar').classList.contains('ppbui-root'));
 trigger.click();assert.ok(doc.querySelector('dialog'));assert.equal(root.querySelector('[data-ppbui-pokemon-filter]'),null);
 for(const cls of ['ppbui-dialog','ppbui-root','ppbui-scroll'])assert.ok(doc.querySelector('dialog').classList.contains(cls));
 const css=doc.querySelector('[data-ppbui-style=trade-layout]').textContent;assert.doesNotMatch(css,/--ui-/);
 assert.doesNotMatch(css,/\.trade-session-window(?!\.ppbui-window)\s/);
 assert.match(css,/\.trade-session-window\.ppbui-window \{[^}]*width:min\(1160px,calc\(100vw - 16px\)\) !important[^}]*height:min\(620px,calc\(100dvh - 16px\)\) !important[^}]*overflow:hidden !important; resize:none !important;/s,'Trade uses a compact responsive viewport-bound box, not manual resize');
 assert.match(css,/\.trade-session-window\.ppbui-window \.pokeidle-resize-handle \{ display:none !important; visibility:hidden !important; pointer-events:none !important; \}/,'every resize handle inside Trade is unavailable');
 assert.doesNotMatch(css,/data-ppbui-trade-manual-width/,'manual drag no longer owns Trade geometry');
 assert.match(css,/\.trade-shell \{[^}]*display:grid !important[^}]*height:100% !important[^}]*grid-template-columns:minmax\(318px,1fr\) minmax\(318px,1fr\) minmax\(0,1\.22fr\) !important[^}]*align-items:stretch[^}]*overflow:hidden !important/,'desktop is a single bounded three-column workstation, not a vertically scrolling page');
 assert.match(css,/\.trade-side \{[^}]*align-self:stretch[^}]*min-height:0 !important[^}]*height:100% !important[^}]*overflow-x:hidden !important; overflow-y:auto !important[^}]*scrollbar-gutter:auto !important/,'offers stay aligned without a reserved gutter and scroll internally only when their natural content actually exceeds the panel');
 assert.match(css,/\.trade-inventory-list \{[^}]*grid-template-columns:repeat\(auto-fill,56px\) !important[^}]*justify-content:start[^}]*align-content:start/,'inventory fills the available panel width with fixed native-size cards');
 assert.match(css,/\.trade-inventory \{[^}]*min-height:0[^}]*display:flex[^}]*flex-direction:column/,'inventory can shrink with the trade shell instead of pushing actions away');
 assert.match(css,/\.trade-inventory-list \{[^}]*flex:1 1 auto[^}]*max-height:none !important[^}]*overflow-x:hidden !important; overflow-y:auto !important[^}]*grid-auto-rows:56px !important/,'inventory alone fills the remaining column height and owns its normal vertical scrolling');
 assert.match(css,/> \.pokeidle-panel__body \{[^}]*overflow:hidden !important[^}]*scrollbar-gutter:auto !important/,'outer native Trade body must expose neither a scrollbar nor a reserved scrollbar gutter');
 assert.match(css,/\.trade-side \.trade-status \{ margin-top:auto; flex:0 0 auto; \}/,'both offer status rows align to the bottom of their panels');
 assert.match(css,/\.trade-side \.trade-slots \{[^}]*flex:0 0 auto !important[^}]*width:max-content[^}]*overflow:visible !important[^}]*grid-template-columns:repeat\(5,56px\) !important[^}]*grid-auto-rows:56px !important/,'20 native offer slots remain Backpack-sized while the containing offer panel owns any exceptional overflow');
 assert.match(css,/\.trade-slot,\.trade-inventory-item\) \{[^}]*width:56px !important; height:56px !important[^}]*min-height:56px !important; max-height:56px !important/,'Trade cards exactly match Backpack desktop tile geometry');
 assert.match(css,/@media \(max-width:560px\) \{[\s\S]*grid-auto-rows:50px !important[\s\S]*min-height:50px !important; max-height:50px !important/,'mobile tiles match Backpack 50px footprint even over native 112/116px min-height');
 assert.match(css,/@container \(max-width:1139px\)[\s\S]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\) !important; grid-template-rows:minmax\(0,\.8fr\) minmax\(0,1\.2fr\)/,'intermediate Trade reserves more bounded height for the browsing inventory row');
 assert.match(css,/@container \(max-width:759px\)[\s\S]*grid-template-columns:minmax\(0,1fr\) !important; grid-template-rows:minmax\(0,\.7fr\) minmax\(0,\.7fr\) minmax\(0,1\.6fr\)/,'small Trade prioritizes inventory usability while keeping all three regions inside the fixed window');
 assert.match(css,/\.ppbui-trade-action-dock \{[^}]*flex:0 0 51px; height:51px/,'native actions have a reserved visible bottom shelf outside scrolling body');
 assert.match(css,/\.trade-shell \.trade-confirm,[^}]*\.trade-shell \.trade-cancel \{ position:absolute !important; bottom:9px !important/,'original buttons remain native descendants but visually dock to the panel');
 assert.match(css,/@media \(max-width:520px\)[\s\S]*\.ppbui-trade-filters \.ppbui-pokemon-fields \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\); \}/,'the viewport-owned modal also reflows its four filter fields');
 assert.match(css,/@media \(max-height:420px\)[\s\S]*\.trade-inventory \{[^}]*overflow-y:auto !important[\s\S]*\.trade-inventory-list \{[^}]*overflow:visible !important/,'very short windows transfer inventory scrolling to its panel rather than collapsing the list or reviving outer body scroll');
 assert.match(css,/\.trade-confirm:hover:not\(:disabled\)[^{]*\{[^}]*border-color:var\(--ppbui-accent-hi\) !important[^}]*background:var\(--ppbui-action-bg\) !important[^}]*color:var\(--ppbui-accent-hi\) !important/);
 assert.match(css,/\.trade-confirm:active:not\(:disabled\)[^{]*\{[^}]*border-color:var\(--ppbui-accent-hi\) !important[^}]*background:var\(--ppbui-action-bg\) !important[^}]*color:var\(--ppbui-accent-hi\) !important/);
 assert.match(css,/\.trade-confirm:disabled,[^{]+\.trade-inventory-tab\[aria-disabled="true"\][^{]*\{[^}]*color:var\(--ppbui-text-subtle\) !important/);
 assert.match(css,/\.trade-confirm:focus-visible,[^{]+\.trade-inventory-tab:focus-visible\s*\{[^}]*outline:var\(--ppbui-focus-width\) solid var\(--ppbui-focus\) !important/);
	 assert.match(css,/\.trade-status \{[^}]*max-width:100%[^}]*overflow-wrap:anywhere/,'long status text cannot expand the action area');
	 assert.match(css,/\.trade-confirm,.trade-session-window\.ppbui-window \.trade-cancel \{[^}]*white-space:normal[^}]*overflow-wrap:anywhere/,'long localized action labels remain readable');
 assert.match(css,/\.trade-inventory-tab:hover:not\(\.is-active\):not\(:disabled\):not\(\[aria-disabled="true"\]\) \{[^}]*background:var\(--ppbui-bg-3\) !important/);
 assert.match(css,/\.trade-inventory-tab:active:not\(\.is-active\):not\(:disabled\):not\(\[aria-disabled="true"\]\) \{[^}]*box-shadow:none !important/);
 assert.match(css,/\.trade-inventory-tab\.is-active:hover:not\(:disabled\):not\(\[aria-disabled="true"\]\) \{[^}]*border-color:var\(--ppbui-selected\) !important/);
 assert.match(css,/\.trade-inventory-tab\.is-active:active:not\(:disabled\):not\(\[aria-disabled="true"\]\) \{[^}]*border-color:var\(--ppbui-selected\) !important[^}]*box-shadow:none !important/);
 const rarity=doc.querySelector('[data-ppbui-pokemon-filter=rarity]');rarity.focus();rarity.value='rare';rarity.dispatchEvent(new dom.window.Event('change'));
 assert.equal(doc.activeElement.dataset.ppbuiPokemonFilter,'rarity');assert.equal(doc.activeElement.value,'rare');
 doc.querySelector('dialog').dispatchEvent(new dom.window.Event('cancel',{cancelable:true}));assert.equal(doc.querySelector('dialog'),null);
 assert.match(root.querySelector('[data-ppbui-trade-filters]').textContent,/1/);
 claimedList.remove();ui.cleanup();tools.cleanup();assert.equal(claimedList.classList.contains('ppbui-scroll'),false);assert.equal(doc.querySelector('[data-ppbui-style=trade-layout]'),null);assert.equal(root.classList.contains('ppbui-window'),false);dom.window.close();
});

test('Trade first-open reconciliation moves a late native balance into the own-offer money row before the next frame',async()=>{
 const dom=new JSDOM('<section class="pokeidle-panel trade-session-window"><div class="pokeidle-panel__body"><div class="trade-shell"><section class="trade-side"></section><section class="trade-side" id="own"><h3>Minha oferta</h3><div class="trade-gold-row"><input value="0"></div><div class="trade-slots"></div></section><aside class="trade-inventory"><div class="trade-inventory-list"></div></aside></div></div></section>',{url:'https://example.test',pretendToBeVisual:true});
 const doc=dom.window.document,root=doc.querySelector('.trade-session-window'),own=doc.getElementById('own'),gold=own.querySelector('.trade-gold-row'),ui=createTradeUI(root,{render(){}});
 ui.sync();const balance=doc.createElement('div');balance.className='trade-gold-balance';balance.textContent='Seu saldo: 33.152.045';own.prepend(balance);assert.equal(balance.parentElement,own,'native late insertion initially reproduces the first-open column shift');
 const css=doc.querySelector('[data-ppbui-style=trade-layout]').textContent;assert.match(css,/:is\(\.trade-side,\.trade-shell\) > \.trade-gold-balance \{ display:none !important; \}/,'a late balance cannot visibly push the first-open offer column before reconciliation');
 await Promise.resolve();assert.equal(balance.parentElement,gold,'Better UI reconciles the late balance without waiting for a user-triggered rerender');assert.equal(gold.lastElementChild,balance);
 ui.cleanup();dom.window.close();
});
test('Trade first-open reconciliation keeps a bounded long-tail retry for a slower native balance',()=>{
 const dom=new JSDOM('<section class="pokeidle-panel trade-session-window"><div class="pokeidle-panel__body"><div class="trade-shell"><section class="trade-side"></section><section class="trade-side" id="own"><div class="trade-gold-row"><input value="0"></div></section><aside class="trade-inventory"><div class="trade-inventory-list"></div></aside></div></div></section>',{url:'https://example.test'}),doc=dom.window.document,win=dom.window,root=doc.querySelector('.trade-session-window'),own=doc.getElementById('own'),gold=own.querySelector('.trade-gold-row'),ui=createTradeUI(root,{render(){}}),scheduled=[],nativeSetTimeout=win.setTimeout,nativeClearTimeout=win.clearTimeout;
 win.setTimeout=(fn,delay)=>{scheduled.push({fn,delay});return 1000+scheduled.length;};win.clearTimeout=()=>{};ui.sync();
 const balance=doc.createElement('div');balance.className='trade-gold-balance';balance.textContent='Seu saldo: 33.152.045';own.prepend(balance);
 assert.ok(scheduled.some(entry=>entry.delay===750)&&scheduled.some(entry=>entry.delay===3000),'layout reconciliation keeps bounded retries beyond the original 300ms horizon');
 scheduled.find(entry=>entry.delay===750).fn();assert.equal(balance.parentElement,gold,'a slower native balance is still reconciled without an observer');
 ui.cleanup();win.setTimeout=nativeSetTimeout;win.clearTimeout=nativeClearTimeout;dom.window.close();
});

test('Trade suppresses native resize and displays its original actions without reparenting or changing delegated handlers',()=>{
 const dom=new JSDOM(`<div class="pokeidle-panel trade-session-window" style="width:360px;height:300px"><header class="pokeidle-panel__titlebar">Trade</header><div class="pokeidle-panel__body"><div class="trade-shell"><section class="trade-side"><div class="trade-slots">${'<button class="trade-slot">Pokémon com nome localizado muito comprido</button>'.repeat(20)}</div><div class="trade-status">${'Estado da troca aguardando confirmação '.repeat(20)}</div></section><section class="trade-side" id="own"><div class="trade-gold-row"><input></div><div class="trade-slots">${'<button class="trade-slot">Pokémon</button>'.repeat(20)}</div><button class="trade-confirm">Confirmar negociação</button><button class="trade-cancel">Cancelar negociação</button></section><aside class="trade-inventory"><div class="trade-inventory-list">${'<button class="trade-inventory-item">Item</button>'.repeat(200)}</div></aside></div></div><span class="pokeidle-resize-handle"></span></div>`,{url:'https://example.test'});
 const doc=dom.window.document,root=doc.querySelector('.trade-session-window'),body=root.querySelector('.pokeidle-panel__body'),handle=root.querySelector('.pokeidle-resize-handle');
 let confirms=0,cancels=0;const confirm=root.querySelector('.trade-confirm'),cancel=root.querySelector('.trade-cancel');
 const own=root.querySelector('#own');let delegated=0;
 own.addEventListener('click',event=>{if(event.target.matches('.trade-confirm,.trade-cancel'))delegated++;});
 confirm.addEventListener('click',()=>confirms++);cancel.addEventListener('click',()=>cancels++);
 const ui=createTradeUI(root,{render(){throw new Error('Unrelated filters must not be rendered');}}),css=doc.querySelector('[data-ppbui-style=trade-layout]').textContent;
 assert.match(css,/> \.pokeidle-panel__body \{[^}]*min-height:0 !important[^}]*overflow:hidden !important/,'the outer Trade body is a bounded viewport, never a scroll surface');
 assert.match(css,/\.pokeidle-resize-handle \{[^}]*display:none !important[^}]*pointer-events:none !important/,'Trade disables its resize affordance');
 assert.doesNotMatch(css,/pointerdown|data-ppbui-trade-manual-width/,'Better UI never handles native resizing anymore');
 assert.equal(body.classList.contains('ppbui-scroll'),false,'the outer Trade body must not advertise scroll ownership');
 assert.equal(root.querySelectorAll('.trade-slot').length,40);assert.equal(root.querySelectorAll('.trade-inventory-item').length,200);
 ui.sync();
 const dock=root.querySelector(':scope > [data-ppbui-trade-actions]');assert.ok(dock);
 assert.equal(dock.children.length,0,'the action shelf contains no cloned or moved buttons');
 assert.equal(dock.parentNode,root);assert.equal(body.contains(confirm),true);assert.equal(body.contains(cancel),true);
 assert.equal(own.querySelector('.trade-confirm'),confirm);assert.equal(own.querySelector('.trade-cancel'),cancel,'native .trade-side still owns both buttons');
 confirm.disabled=true;ui.sync();assert.equal(own.querySelector('.trade-confirm').disabled,true,'native disabled state remains on the same original button');confirm.disabled=false;
 assert.equal(handle.parentNode,root,'the exact native handle remains owned by the host, but hidden by scoped CSS');
 confirm.focus();assert.equal(doc.activeElement,confirm);confirm.click();cancel.focus();assert.equal(doc.activeElement,cancel);cancel.click();
 assert.equal(confirms,1);assert.equal(cancels,1);assert.equal(delegated,2,'delegated listeners on native ancestors receive the unmodified bubble path');ui.sync();assert.equal(root.querySelectorAll('.trade-confirm').length,1);assert.equal(root.querySelectorAll('.trade-cancel').length,1);
 ui.cleanup();assert.equal(dock.isConnected,false);assert.equal(confirm.parentElement.id,'own');assert.equal(cancel.parentElement.id,'own');assert.equal(body.classList.contains('ppbui-scroll'),false);
 assert.equal(root.style.width,'360px','Better UI does not write native inline width');assert.equal(root.style.height,'300px');
 assert.equal(root.contains(handle),true);assert.equal(doc.querySelector('[data-ppbui-style=trade-layout]'),null);
 dom.window.close();
});


test('Trade item category combines with search and preserves quantity handlers and inventory',async()=>{
 const {mountTradePokemon}=await import('../src/modules/pokemon-tools/adapters.js');
 const dom=new JSDOM('<div class="trade-session-window"><div></div></div>',{url:'https://example.test'}),doc=dom.window.document,root=doc.body.firstChild,body=root.firstChild;
 const items=[{item_id:'a',name:'Potion',type:'potion',qty:3},{item_id:'b',name:'Material',type:'genetic_material',qty:4},{item_id:'c',name:'Boost',type:'boost_exp',qty:2}];let chosen='';
 const scene={_inventory:items,_creatures:[],_query:'',_inventoryTab:'items',_panel:{body},ownOffer:()=>({}),offerEntries:()=>[],renderSlots:()=>doc.createElement('div'),pokemonTabPanel(){},itemsTabPanel(list){this._inventory.filter(i=>i.name.toLowerCase().includes(this._query)).forEach(item=>{const button=doc.createElement('button');button.className='trade-inventory-item';button.onclick=()=>chosen=item.item_id;list.append(button);});},inventoryPanel(){const panel=doc.createElement('aside'),list=doc.createElement('div');list.className='trade-inventory-list';this.itemsTabPanel(list);panel.append(list);return panel;},render(){body.replaceChildren(this.inventoryPanel());},updateInventoryList(){const list=root.querySelector('.trade-inventory-list');list.replaceChildren();this.itemsTabPanel(list);}};
 const mounted=mountTradePokemon(root,scene);let select=root.querySelector('select');assert.equal(select.options.length,4);select.value='material';select.dispatchEvent(new dom.window.Event('change'));
 assert.equal(root.querySelectorAll('.trade-inventory-item').length,1);root.querySelector('.trade-inventory-item').click();assert.equal(chosen,'b');assert.equal(scene._inventory,items);
 scene._query='potion';scene.updateInventoryList();assert.equal(root.querySelectorAll('.trade-inventory-item').length,0);assert.match(root.querySelector('.ppbui-trade-filter-bar').textContent,/0 resultados/);
 select=root.querySelector('select');select.value='';select.dispatchEvent(new dom.window.Event('change'));assert.equal(root.querySelectorAll('.trade-inventory-item').length,1);mounted.cleanup();dom.window.close();
});

test('Trade item quantity dialog is styled only for the exact native Trade prompt and keeps its handlers',async()=>{
 const dom=new JSDOM('<div class="pokeidle-panel trade-session-window"><div class="pokeidle-panel__body"><div class="trade-shell"><aside class="trade-inventory"><div class="trade-inventory-list"><button class="trade-inventory-item" id="add-item"><b>Material Genético de Abra (Incomum)</b></button></div></aside></div></div></div>',{url:'https://example.test'});
 const doc=dom.window.document,root=doc.querySelector('.trade-session-window'),item=doc.getElementById('add-item');let added=0,cancelled=0;
 const ui=createTradeUI(root,{render(){throw new Error('quantity dialog is native');}});
 const unrelated=doc.createElement('div');unrelated.className='pokeidle-dialog-overlay';unrelated.innerHTML='<section class="pokeidle-dialog"><header class="pokeidle-dialog__title">Excluir personagem</header></section>';doc.body.append(unrelated);
 item.addEventListener('click',()=>{
  const overlay=doc.createElement('div');overlay.className='pokeidle-dialog-overlay';overlay.innerHTML='<section class="pokeidle-dialog"><header class="pokeidle-dialog__header"><strong class="pokeidle-dialog__title">Adicionar item à troca</strong></header><div class="pokeidle-dialog__body"><label>Material Genético de Abra (Incomum) · máximo 5<input type="number" value="1"></label></div><footer class="pokeidle-dialog__actions"><button id="native-add">Adicionar</button><button id="native-cancel">Cancelar</button></footer></section>';
  overlay.querySelector('#native-add').addEventListener('click',()=>added++);
  overlay.querySelector('#native-cancel').addEventListener('click',()=>cancelled++);
  doc.body.append(overlay);
 });
 item.click();await Promise.resolve();
 const quantity=doc.querySelector('.pokeidle-dialog-overlay:not(:first-child):has(#native-add)');
 assert.ok(quantity?.classList.contains('ppbui-trade-quantity-dialog'),'only the actual Trade amount prompt gets scoped presentation');
 assert.equal(unrelated.classList.contains('ppbui-trade-quantity-dialog'),false,'other native prompts must remain untouched');
 const css=doc.querySelector('[data-ppbui-style=trade-layout]').textContent;
 assert.match(css,/\.pokeidle-dialog-overlay\.ppbui-trade-quantity-dialog > \.pokeidle-dialog \{[^}]*overflow:hidden !important/,'the quantity dialog has one internal scroll region');
 assert.match(css,/\.ppbui-trade-quantity-dialog \.pokeidle-dialog__body \{[^}]*overflow-x:hidden !important; overflow-y:auto !important/,'the quantity body never creates a horizontal scrollbar');
 assert.match(css,/\.pokeidle-form-overlay\)\.ppbui-trade-quantity-dialog > \.pokeidle-form-box \{[^}]*height:max-content !important[^}]*min-height:0 !important[^}]*max-height:calc\(100dvh - 24px\) !important[^}]*overflow-x:hidden !important; overflow-y:auto !important/,'the native UIFormHelper quantity box shrink-wraps normal content and scrolls only when content really exceeds the viewport cap');
 const max=quantity.querySelector('[data-ppbui-trade-quantity-max]');assert.ok(max,'quantity prompt exposes one Better UI Max helper without replacing native actions');assert.equal(max.previousElementSibling,null);max.click();assert.equal(quantity.querySelector('input').value,'5','Max falls back to the native maximum written in the prompt label');assert.equal(added,0,'Max never submits the native Trade action');
 quantity.querySelector('input').value='3';quantity.querySelector('#native-add').click();quantity.querySelector('#native-cancel').click();
 assert.equal(added,1);assert.equal(cancelled,1);assert.equal(quantity.querySelector('input').value,'3');
 quantity.querySelector('.pokeidle-dialog__title').textContent='Outra operação';
 quantity.querySelector('input').dispatchEvent(new dom.window.Event('focusin',{bubbles:true}));
 assert.equal(quantity.classList.contains('ppbui-trade-quantity-dialog'),false,'reused native overlay loses Trade-only styles when its title changes');assert.equal(quantity.querySelector('[data-ppbui-trade-quantity-max]'),null,'Max is removed with Trade-only ownership');
 quantity.querySelector('.pokeidle-dialog__title').textContent='Adicionar item à troca';
 quantity.querySelector('input').dispatchEvent(new dom.window.Event('focusin',{bubbles:true}));
 assert.equal(quantity.classList.contains('ppbui-trade-quantity-dialog'),false,'an exact-title portal is not reclaimed without a fresh inventory-item intent');
 ui.cleanup();
 assert.equal(quantity.classList.contains('ppbui-trade-quantity-dialog'),false);
 assert.equal(unrelated.isConnected,true);dom.window.close();
});

test('Trade recognizes the native UIFormHelper quantity prompt, validates the clicked item and exposes Max',async()=>{
 const dom=new JSDOM('<div class="pokeidle-panel trade-session-window"><div class="pokeidle-panel__body"><div class="trade-shell"><aside class="trade-inventory"><div class="trade-inventory-list"><button class="trade-inventory-item" id="add-item"><b>Super Ball</b></button></div></aside></div></div></div>',{url:'https://example.test'});
 const doc=dom.window.document,root=doc.querySelector('.trade-session-window'),item=doc.getElementById('add-item');let added=0;
 const ui=createTradeUI(root,{render(){}});
 item.addEventListener('click',()=>{
  const overlay=doc.createElement('div');overlay.className='pokeidle-overlay';overlay.innerHTML='<section class="pokeidle-form-box"><h2 class="pokeidle-form-title">Adicionar item à troca</h2><div class="pokeidle-form-field"><label>Super Ball · máximo 36836</label><input type="number" max="36836" value="1"></div><div class="pokeidle-form-error"></div><div class="pokeidle-form-buttons"><button class="pokeidle-btn-primary">Adicionar</button><button class="pokeidle-btn-secondary">Cancelar</button></div></section>';
  overlay.querySelector('.pokeidle-btn-primary').addEventListener('click',()=>added++);doc.body.append(overlay);
 });
 item.click();await new Promise(resolve=>dom.window.setTimeout(resolve,0));
 const overlay=doc.querySelector('.pokeidle-overlay');assert.ok(overlay.classList.contains('ppbui-trade-quantity-dialog'));
 const input=overlay.querySelector('input');let inputs=0,changes=0;input.addEventListener('input',()=>inputs++);input.addEventListener('change',()=>changes++);const max=overlay.querySelector('[data-ppbui-trade-quantity-max]');assert.ok(max);input.disabled=true;input.value='2';max.click();assert.equal(input.value,'2','Max rechecks native disabled state at activation time');input.disabled=false;input.readOnly=true;max.click();assert.equal(input.value,'2','Max rechecks native readOnly state at activation time');input.readOnly=false;max.click();assert.equal(input.value,'36836');assert.equal(inputs,1);assert.equal(changes,1);assert.equal(added,0,'Max only updates the native field');input.value='2';overlay.querySelector('.pokeidle-btn-primary').click();assert.equal(added,1);assert.equal(input.value,'2');
 const css=doc.querySelector('[data-ppbui-style=trade-layout]').textContent;
 assert.match(css,/:is\(\.pokeidle-dialog-overlay,\.pokeidle-overlay,\.pokeidle-form-overlay\)\.ppbui-trade-quantity-dialog \{[^}]*overflow:hidden !important/);
 assert.match(css,/\.pokeidle-form-error:empty \{ display:none !important; min-height:0 !important; margin:0 !important; \}/,'empty native validation space cannot force a pointless quantity scrollbar');
 ui.cleanup();assert.equal(overlay.classList.contains('ppbui-trade-quantity-dialog'),false);dom.window.close();
});
test('Trade quantity styling rejects an exact-title prompt for a different clicked item',async()=>{
 const dom=new JSDOM('<div class="pokeidle-panel trade-session-window"><div class="pokeidle-panel__body"><div class="trade-shell"><aside class="trade-inventory"><div class="trade-inventory-list"><button class="trade-inventory-item"><b>Baga Nutritiva</b></button></div></aside></div></div></div>',{url:'https://example.test'}),doc=dom.window.document,root=doc.querySelector('.trade-session-window'),item=root.querySelector('.trade-inventory-item'),ui=createTradeUI(root,{render(){}});
 item.addEventListener('click',()=>{const overlay=doc.createElement('div');overlay.className='pokeidle-overlay';overlay.innerHTML='<section class="pokeidle-form-box"><h2 class="pokeidle-form-title">Adicionar item à troca</h2><div class="pokeidle-form-field"><label>Super Ball · máximo 99</label><input type="number" max="99" value="1"></div><div class="pokeidle-form-buttons"><button>Adicionar</button><button>Cancelar</button></div></section>';doc.body.append(overlay);});
 item.click();await Promise.resolve();const overlay=doc.querySelector('.pokeidle-overlay');assert.equal(overlay.classList.contains('ppbui-trade-quantity-dialog'),false,'same title is insufficient when the prompt does not describe the clicked item');assert.equal(overlay.querySelector('[data-ppbui-trade-quantity-max]'),null);ui.cleanup();dom.window.close();
});
test('Trade quantity Max prefers a valid native input max and rejects a stale pre-existing portal',async()=>{
 const dom=new JSDOM('<div class="pokeidle-panel trade-session-window"><div class="pokeidle-panel__body"><div class="trade-shell"><aside class="trade-inventory"><div class="trade-inventory-list"><button class="trade-inventory-item"><b>Baga Nutritiva</b></button></div></aside></div></div></div><div class="pokeidle-overlay"><section class="pokeidle-form-box"><h2 class="pokeidle-form-title">Adicionar item à troca</h2><div class="pokeidle-form-field"><label>Baga Nutritiva · máximo 3111</label><input type="number" max="7" value="1"></div><div class="pokeidle-form-buttons"><button>Adicionar</button><button>Cancelar</button></div></section></div>',{url:'https://example.test'}),doc=dom.window.document,root=doc.querySelector('.trade-session-window'),item=root.querySelector('.trade-inventory-item'),overlay=doc.querySelector('.pokeidle-overlay'),ui=createTradeUI(root,{render(){}});
 item.click();await Promise.resolve();assert.equal(overlay.classList.contains('ppbui-trade-quantity-dialog'),false,'an unchanged same-title portal that existed before the item click is not adopted');const input=overlay.querySelector('input');input.value='2';input.dispatchEvent(new dom.window.Event('focusin',{bubbles:true}));assert.equal(overlay.classList.contains('ppbui-trade-quantity-dialog'),false,'editing only the stale input value is not treated as a new portal transition');overlay.querySelector('label').textContent='Baga Nutritiva · máximo 3112';input.dispatchEvent(new dom.window.Event('focusin',{bubbles:true}));const max=overlay.querySelector('[data-ppbui-trade-quantity-max]');assert.ok(max,'a causally changed reused portal may be adopted');max.click();assert.equal(input.value,'7','valid input.max remains authoritative over label copy');ui.cleanup();dom.window.close();
});
test('Trade quantity validation lets a second item reclaim a reused native portal without stale Max ownership',async()=>{
 const dom=new JSDOM('<div class="pokeidle-panel trade-session-window"><div class="pokeidle-panel__body"><div class="trade-shell"><aside class="trade-inventory"><div class="trade-inventory-list"><button class="trade-inventory-item" id="a"><b>Baga Nutritiva</b></button><button class="trade-inventory-item" id="b"><b>Super Ball</b></button></div></aside></div></div></div>',{url:'https://example.test'}),doc=dom.window.document,root=doc.querySelector('.trade-session-window'),a=doc.getElementById('a'),b=doc.getElementById('b'),ui=createTradeUI(root,{render(){}});let overlay;
 a.addEventListener('click',()=>{overlay=doc.createElement('div');overlay.className='pokeidle-overlay';overlay.innerHTML='<section class="pokeidle-form-box"><h2 class="pokeidle-form-title">Adicionar item à troca</h2><div class="pokeidle-form-field"><label>Baga Nutritiva · máximo 11</label><input type="number" max="11" value="1"></div><div class="pokeidle-form-buttons"><button>Adicionar</button><button>Cancelar</button></div></section>';doc.body.append(overlay);});
 b.addEventListener('click',()=>{overlay.querySelector('label').textContent='Super Ball · máximo 22';const input=overlay.querySelector('input');input.max='22';input.value='1';input.dispatchEvent(new dom.window.Event('focusin',{bubbles:true}));});
 a.click();await Promise.resolve();let max=overlay.querySelector('[data-ppbui-trade-quantity-max]');assert.ok(max);max.click();assert.equal(overlay.querySelector('input').value,'11');b.click();await Promise.resolve();max=overlay.querySelector('[data-ppbui-trade-quantity-max]');assert.ok(max,'the reused portal is released from item A and causally re-adopted for item B');assert.match(max.getAttribute('aria-label'),/super ball/i);max.click();assert.equal(overlay.querySelector('input').value,'22');ui.cleanup();dom.window.close();
});

test('Trade keeps accessible native card names current when the same item nodes are reused',()=>{
 const dom=new JSDOM('<div class="trade-session-window"><div class="pokeidle-panel__body"><div class="trade-shell"><section class="trade-side"><div class="trade-slots"><button class="trade-slot"><span class="trade-slot__name">Abra</span></button></div></section><aside class="trade-inventory"><div class="trade-inventory-list"><button class="trade-inventory-item"><b>Poção</b></button></div></aside></div></div></div>',{url:'https://example.test'});
 const doc=dom.window.document,root=doc.querySelector('.trade-session-window'),ui=createTradeUI(root,{render(){}}),offered=root.querySelector('.trade-slot'),item=root.querySelector('.trade-inventory-item');
 ui.sync();ui.count(1);assert.equal(offered.title,'Abra');assert.equal(item.title,'Poção');
 offered.querySelector('.trade-slot__name').textContent='Mewtwo';item.querySelector('b').textContent='Ultra Ball';
 ui.sync();ui.count(1);assert.equal(offered.title,'Mewtwo');assert.equal(item.title,'Ultra Ball','recycled card never retains the previous item tooltip');
 item.title='Descrição nativa mais recente';ui.count(1);assert.equal(item.title,'Descrição nativa mais recente','native tooltip supersedes Better UI ownership');
 ui.cleanup();assert.equal(offered.hasAttribute('title'),false);assert.equal(item.title,'Descrição nativa mais recente');assert.equal(item.hasAttribute('data-ppbui-trade-fallback-title'),false);
 dom.window.close();
});

test('Trade native confirm/cancel handlers survive short-window render cycles with a large inventory',async()=>{
 const {mountTradePokemon}=await import('../src/modules/pokemon-tools/adapters.js');
 const dom=new JSDOM('<div class="pokeidle-panel trade-session-window" style="width:720px;height:480px"><header class="pokeidle-panel__titlebar">Trade</header><div class="pokeidle-panel__body"></div></div>',{url:'https://example.test'});
 const doc=dom.window.document,root=doc.querySelector('.trade-session-window'),body=root.querySelector('.pokeidle-panel__body');
 let confirmed=0,cancelled=0;
 const scene={
  _panel:{body},_inventoryTab:'items',_query:'',_inventory:Array.from({length:250},(_,i)=>({item_id:`item-${i}`,name:`Item ${i}`,type:'potion',qty:1})),_creatures:[],
  ownOffer:()=>({}),offerEntries:()=>[],renderSlots(){const slots=doc.createElement('div');slots.className='trade-slots';for(let i=0;i<20;i++){const slot=doc.createElement('button');slot.className='trade-slot';slot.textContent='Long localized Pokémon name';slots.append(slot);}return slots;},pokemonTabPanel(){},
  itemsTabPanel(list){for(const item of this._inventory){const card=doc.createElement('button');card.className='trade-inventory-item';card.textContent=item.name;list.append(card);}},
  inventoryPanel(){const panel=doc.createElement('aside'),list=doc.createElement('div');panel.className='trade-inventory';list.className='trade-inventory-list';this.itemsTabPanel(list);panel.append(list);return panel;},
  render(){if(this._closed){body.replaceChildren(doc.createElement('p'));return;}const shell=doc.createElement('div'),received=doc.createElement('section'),own=doc.createElement('section'),confirm=doc.createElement('button'),cancel=doc.createElement('button');shell.className='trade-shell';received.className=own.className='trade-side';own.append(this.renderSlots({},true));confirm.className='trade-confirm';confirm.textContent='Confirmar';confirm.onclick=()=>confirmed++;cancel.className='trade-cancel';cancel.textContent='Cancelar';cancel.onclick=()=>cancelled++;own.append(confirm,cancel);shell.append(received,own,this.inventoryPanel());body.replaceChildren(shell);}
 };
 const mounted=mountTradePokemon(root,scene);
 assert.equal(root.querySelectorAll('.trade-inventory-item').length,250);
 let previousCancel=null;
 for(const height of ['480px','310px','230px']){
  if(previousCancel)previousCancel.focus();
  root.style.height=height;scene.render();
  const confirm=root.querySelector('.trade-confirm'),cancel=root.querySelector('.trade-cancel');
  if(previousCancel)assert.equal(doc.activeElement,cancel,'focus on the latest native Cancel button is restored after whole-scene rerender');
  assert.ok(root.contains(confirm) && root.contains(cancel));
  assert.equal(confirm.parentNode,cancel.parentNode,'native actions remain together in their original side');
  assert.ok(confirm.parentNode.matches('.trade-side'),'actions stay under the native delegated event/selector boundary');
  assert.ok(root.querySelector(':scope > .ppbui-trade-action-dock'),'an independent empty dock reserves visual space without moving actions');
  confirm.focus();assert.equal(doc.activeElement,confirm);confirm.click();cancel.focus();assert.equal(doc.activeElement,cancel);cancel.click();
  assert.equal(root.querySelectorAll('.trade-confirm').length,1);assert.equal(root.querySelectorAll('.trade-cancel').length,1);
  assert.equal(body.classList.contains('ppbui-scroll'),false,'outer Trade body is never a scroll owner');
  for(const side of root.querySelectorAll('.trade-side'))assert.equal(side.classList.contains('ppbui-scroll'),false,'Trade does not reserve scrollbar gutters on offer panels at normal height');
  previousCancel=cancel;
 }
 assert.equal(confirmed,3);assert.equal(cancelled,3);assert.equal(root.style.height,'230px');
 scene._closed=true;scene.render();
 assert.equal(root.querySelector('[data-ppbui-trade-actions]'),null,'closing/replacing the native trade shell must not leave stale clickable actions');
 assert.equal(root.querySelector('.trade-confirm'),null);
 mounted.cleanup();assert.equal(body.classList.contains('ppbui-scroll'),false);
 assert.equal(root.querySelector('[data-ppbui-trade-actions]'),null,'cleanup restores native structure');
 dom.window.close();
});
