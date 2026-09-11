import {test} from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";
import {createTradeUI} from "../src/modules/pokemon-tools/trade-ui.js";
import {createPokemonTools} from "../src/modules/pokemon-tools/ui.js";
test('Trade dialog keeps filters outside inventory, retains focus and cleans up',()=>{
 const dom=new JSDOM('<div class="trade-session-window"><aside><div class="trade-inventory-list"></div></aside><section class="trade-side"><div class="trade-gold-balance">100</div><button>Confirm</button></section></div>',{url:'https://example.test'}),doc=dom.window.document,root=doc.body.firstChild,panel=root.querySelector('aside');
 const tools=createPokemonTools(root,{getCreatures:()=>[],refresh:()=>ui.inventory(panel,3)}),ui=createTradeUI(root,tools);
 ui.inventory(panel,8);ui.sync();assert.equal(root.querySelector('.trade-side').lastChild.className,'trade-gold-balance');
 const trigger=root.querySelector('[data-ppbui-trade-filters]');trigger.click();assert.ok(doc.querySelector('dialog'));assert.equal(root.querySelector('[data-ppbui-pokemon-filter]'),null);
 const rarity=doc.querySelector('[data-ppbui-pokemon-filter=rarity]');rarity.focus();rarity.value='rare';rarity.dispatchEvent(new dom.window.Event('change'));
 assert.equal(doc.activeElement.dataset.ppbuiPokemonFilter,'rarity');assert.equal(doc.activeElement.value,'rare');
 doc.querySelector('dialog').dispatchEvent(new dom.window.Event('cancel',{cancelable:true}));assert.equal(doc.querySelector('dialog'),null);
 assert.match(root.querySelector('[data-ppbui-trade-filters]').textContent,/1/);
 ui.cleanup();tools.cleanup();assert.equal(doc.querySelector('[data-ppbui-style=trade-layout]'),null);dom.window.close();
});
