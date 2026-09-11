import {test} from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";
import {createTradeUI} from "../src/modules/pokemon-tools/trade-ui.js";
import {createPokemonTools} from "../src/modules/pokemon-tools/ui.js";
test('Trade dialog keeps filters outside inventory, retains focus and cleans up',()=>{
 const dom=new JSDOM('<div class="trade-session-window"><aside><div class="trade-inventory-list"></div></aside><section class="trade-side"><div class="trade-gold-balance">100</div><div class="trade-gold-row"><input></div><button>Confirm</button></section></div>',{url:'https://example.test'}),doc=dom.window.document,root=doc.body.firstChild,panel=root.querySelector('aside');
 const tools=createPokemonTools(root,{getCreatures:()=>[],refresh:()=>ui.inventory(panel,3)}),ui=createTradeUI(root,tools);
 ui.inventory(panel,8);ui.sync();assert.equal(root.querySelector('.trade-gold-row').lastChild.className,'trade-gold-balance');
 const trigger=root.querySelector('[data-ppbui-trade-filters]');trigger.click();assert.ok(doc.querySelector('dialog'));assert.equal(root.querySelector('[data-ppbui-pokemon-filter]'),null);
 const rarity=doc.querySelector('[data-ppbui-pokemon-filter=rarity]');rarity.focus();rarity.value='rare';rarity.dispatchEvent(new dom.window.Event('change'));
 assert.equal(doc.activeElement.dataset.ppbuiPokemonFilter,'rarity');assert.equal(doc.activeElement.value,'rare');
 doc.querySelector('dialog').dispatchEvent(new dom.window.Event('cancel',{cancelable:true}));assert.equal(doc.querySelector('dialog'),null);
 assert.match(root.querySelector('[data-ppbui-trade-filters]').textContent,/1/);
 ui.cleanup();tools.cleanup();assert.equal(doc.querySelector('[data-ppbui-style=trade-layout]'),null);dom.window.close();
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
