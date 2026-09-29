import {test} from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";
import {createTradeUI} from "../src/modules/pokemon-tools/trade-ui.js";
import {createPokemonTools} from "../src/modules/pokemon-tools/ui.js";
test('Trade dialog keeps filters outside inventory, retains focus and cleans up',()=>{
 const dom=new JSDOM('<div class="trade-session-window"><aside><div class="trade-inventory-list"></div></aside><section class="trade-side"><div class="trade-gold-balance">100</div><div class="trade-gold-row"><input></div><button>Confirm</button></section></div>',{url:'https://example.test'}),doc=dom.window.document,root=doc.body.firstChild,panel=root.querySelector('aside');
 const tools=createPokemonTools(root,{getCreatures:()=>[],refresh:()=>ui.inventory(panel,3)}),ui=createTradeUI(root,tools);
 ui.inventory(panel,8);ui.sync();assert.equal(root.querySelector('.trade-gold-row').lastChild.className,'trade-gold-balance');assert.ok(root.classList.contains('ppbui-window'));const claimedList=panel.querySelector('.trade-inventory-list');assert.ok(claimedList.classList.contains('ppbui-scroll'));
 const trigger=root.querySelector('[data-ppbui-trade-filters]');assert.ok(trigger.classList.contains('ppbui-button'));assert.ok(trigger.closest('.ppbui-trade-filter-bar').classList.contains('ppbui-root'));
 trigger.click();assert.ok(doc.querySelector('dialog'));assert.equal(root.querySelector('[data-ppbui-pokemon-filter]'),null);
 for(const cls of ['ppbui-dialog','ppbui-root','ppbui-scroll'])assert.ok(doc.querySelector('dialog').classList.contains(cls));
 const css=doc.querySelector('[data-ppbui-style=trade-layout]').textContent;assert.doesNotMatch(css,/--ui-/);
 assert.doesNotMatch(css,/\.trade-session-window(?!\.ppbui-window)\s/);
 assert.match(css,/\.trade-session-window\.ppbui-window \{[^}]*container-type:inline-size[^}]*box-sizing:border-box[^}]*width:100% !important[^}]*min-width:0 !important[^}]*max-width:100% !important/s,'Trade window sizes against its pane instead of the global viewport and includes its native padding/border in that width');
 assert.match(css,/@container \(max-width:959px\)[\s\S]*\.trade-shell \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\); \}[\s\S]*\.trade-inventory \{ grid-column:1\/-1; \}[\s\S]*\.trade-slots \{ grid-template-columns:repeat\(4,56px\); justify-content:center; \}/,'split 1:1 keeps both offers side by side, moves inventory below them and compacts fixed native slots to four columns');
 assert.match(css,/@container \(max-width:519px\)[\s\S]*\.trade-shell \{ grid-template-columns:minmax\(0,1fr\); \}[\s\S]*\.trade-inventory \{ grid-column:auto; \}[\s\S]*\.trade-slots \{ grid-template-columns:repeat\(5,56px\); \}/,'only genuinely narrow panes fall back to one semantic column');
 assert.match(css,/@container \(max-width:339px\)[\s\S]*\.trade-slots \{ grid-template-columns:repeat\(4,56px\); \}/,'very narrow panes compact the fixed native offer slots again instead of clipping them');
 assert.match(css,/@media \(max-width:520px\)[\s\S]*\.ppbui-trade-filters \.ppbui-pokemon-fields \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\); \}/,'the viewport-owned modal also reflows its four filter fields');
 assert.match(css,/\.trade-confirm:hover:not\(:disabled\)[^{]*\{[^}]*border-color:var\(--ppbui-accent-hi\) !important[^}]*background:var\(--ppbui-action-bg\) !important[^}]*color:var\(--ppbui-accent-hi\) !important/);
 assert.match(css,/\.trade-confirm:active:not\(:disabled\)[^{]*\{[^}]*border-color:var\(--ppbui-accent-hi\) !important[^}]*background:var\(--ppbui-action-bg\) !important[^}]*color:var\(--ppbui-accent-hi\) !important/);
 assert.match(css,/\.trade-confirm:disabled,[^{]+\.trade-inventory-tab\[aria-disabled="true"\][^{]*\{[^}]*color:var\(--ppbui-text-subtle\) !important/);
 assert.match(css,/\.trade-confirm:focus-visible,[^{]+\.trade-inventory-tab:focus-visible\s*\{[^}]*outline:var\(--ppbui-border-width\) solid var\(--ppbui-focus\) !important/);
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
