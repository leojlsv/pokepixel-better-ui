import {test} from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";
import {createPokemonHoverModule} from "../src/modules/pokemon-hover/index.js";
test('disable hover blocks bound rendering but preserves right-click, click and cleanup',()=>{
  const dom=new JSDOM('<button><span>Pokémon</span></button>'),doc=dom.window.document,slot=doc.querySelector('button');
  slot.__pokeIdleCardBound=true;let hover=0,right=0,click=0,hide=0;
  dom.window.PokeIdle={PokemonCard:{hideHover:()=>hide++}};
  slot.addEventListener('pointerenter',()=>hover++);slot.addEventListener('focus',()=>hover++);
  slot.addEventListener('contextmenu',()=>right++);slot.addEventListener('click',()=>click++);
  const cleanup=createPokemonHoverModule(doc).mount();
  slot.dispatchEvent(new dom.window.Event('pointerenter'));slot.dispatchEvent(new dom.window.Event('focus'));
  slot.firstChild.dispatchEvent(new dom.window.Event('contextmenu',{bubbles:true}));slot.click();
  assert.equal(hover,0);assert.equal(right,1);assert.equal(click,1);assert.equal(hide,1);
  assert.match(doc.querySelector('style').textContent,/\.pokemon-card--hover/);
  cleanup();slot.dispatchEvent(new dom.window.Event('pointerenter'));assert.equal(hover,1);assert.equal(doc.querySelector('style'),null);dom.window.close();
});
