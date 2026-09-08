import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createBetterUI } from '../src/core/bootstrap.js';
import { createInventoryModule } from '../src/modules/inventory/index.js';
import { createInventoryOrder } from '../src/modules/inventory/preferences.js';
const slot = (name, quantity, pokemon = false) => `<button class="inventory-slot${pokemon ? ' inventory-slot--pokemon' : ''}" aria-label="${name}, ${pokemon ? 1 : quantity} units"><span class="${pokemon ? 'inventory-slot__pokemon-level' : 'inventory-slot__quantity'}">${pokemon ? 'Lv.' : ''}${quantity}</span></button>`;
const body = (query = '', category = 'all') => `<div class="inventory-slots-toolbar"><input class="game-window__search" value="${query}"><select class="game-window__select"><option value="all" ${category === 'all' ? 'selected' : ''}>All</option><option value="pokemon" ${category === 'pokemon' ? 'selected' : ''}>Pokémon</option></select></div><div class="inventory-slot-grid">${slot('Zubat',10,true)}${slot('Abra',25,true)}${slot('Potion',7)}${slot('Ball',15)}<div class="inventory-slot is-empty"></div></div>`;
function setup(t, saved = 'original', denied = false) {
  const dom = new JSDOM(`<div class="inventory-window--slots"><div class="pokeidle-panel__body">${body()}</div></div>`, {pretendToBeVisual:true,url:'https://local.test'});
  const { window } = dom;
  const previous = new Map();
  for(const key of ['document','MutationObserver','requestAnimationFrame','cancelAnimationFrame']) {
    previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
    Object.defineProperty(globalThis,key,{configurable:true,value:typeof window[key] === 'function' && key !== 'MutationObserver' ? window[key].bind(window) : window[key]});
  }
  window.localStorage.setItem('ppbui:inventory-order:v1',saved);
  const preference = createInventoryOrder(() => {if(denied)throw Error('denied'); return window.localStorage;});
  const app = createBetterUI({modules:[createInventoryModule(preference)]});
  const doc = window.document;
  const names = () => [...doc.querySelectorAll('button.inventory-slot')].map(n=>n.getAttribute('aria-label').split(',')[0]);
  const order = value => {const select=doc.querySelector('[data-ppbui-order]');select.value=value;select.dispatchEvent(new window.Event('change'));};
  t.after(()=>{app.stop();window.close();for(const [key,d] of previous)if(d)Object.defineProperty(globalThis,key,d);else delete globalThis[key];});
  return {app,doc,window,names,order,preference};
}
test('sort moves original slots, preserves empty cells and actions, and restores exact DOM', t=>{
  const {app,doc,names,order,window}=setup(t);
  const root=doc.querySelector('.inventory-window--slots'); const before=root.outerHTML;
  const originals=[...doc.querySelectorAll('button.inventory-slot')];let actions=0;
  originals.forEach(n=>n.addEventListener('click',()=>actions++));
  app.start();assert.deepEqual(names(),['Zubat','Abra','Potion','Ball']);
  order('quantity');assert.deepEqual(names(),['Zubat','Abra','Ball','Potion']);
  order('level');assert.deepEqual(names(),['Abra','Zubat','Potion','Ball']);
  order('name');assert.deepEqual(names(),['Abra','Ball','Potion','Zubat']);
  assert.equal(actions,0); originals[0].dispatchEvent(new window.MouseEvent('click',{ctrlKey:true}));assert.equal(actions,1);
  assert.equal(doc.querySelector('.inventory-slot-grid').lastElementChild.className,'inventory-slot is-empty');
  order('original');app.stop();assert.equal(root.outerHTML,before);
});
test('quantity updates and full native body rerenders retain order until explicitly reapplied', t=>{
  const {app,doc,names,order}=setup(t); app.start();order('quantity');
  const container=doc.querySelector('.pokeidle-panel__body');
  container.innerHTML=body().replace('Potion, 7 units','Potion, 90 units').replace('>7</span>','>90</span>');
  app.reconcile();assert.deepEqual(names(),['Zubat','Abra','Ball','Potion']);
  [...doc.querySelectorAll('[data-ppbui-module=inventory] button')].find(n=>n.textContent==='Aplicar').click();
  assert.deepEqual(names(),['Zubat','Abra','Potion','Ball']);
  assert.equal(doc.querySelectorAll('[data-ppbui-order]').length,1);
  app.stop();assert.deepEqual(names(),['Zubat','Abra','Potion','Ball']);
});
test('clear filters reacquires controls after synchronous native rebuild without invoking slots', t=>{
  const {app,doc,window}=setup(t);const container=doc.querySelector('.pokeidle-panel__body');
  let query='potion',category='pokemon',searchEvents=0,categoryEvents=0;
  const render=()=>{container.innerHTML=body(query,category);const search=container.querySelector('input');search.addEventListener('input',()=>{searchEvents++;query=search.value;render();});const select=container.querySelector('select');select.addEventListener('change',()=>{categoryEvents++;category=select.value;render();});};
  render();app.start();doc.querySelector('[data-ppbui-inventory-clear]').click();
  assert.equal(query,'');assert.equal(category,'all');assert.equal(searchEvents,1);assert.equal(categoryEvents,1);
  assert.equal(doc.activeElement,container.querySelector('input'));app.reconcile();assert.equal(doc.querySelectorAll('[data-ppbui-order]').length,1);
});
test('saved criterion loads and invalid or denied preferences fail safely',t=>{
  const {app,names,preference}=setup(t,'level');app.start();assert.deepEqual(names(),['Abra','Zubat','Potion','Ball']);
  preference.set('bogus');assert.equal(preference.get(),'level');
  const denied=createInventoryOrder(()=>{throw Error('denied');});denied.set('quantity');assert.equal(denied.get(),'quantity');assert.equal(denied.saved(),false);
});
test('stable reconciliation produces no DOM mutations or additional listeners', async t=>{
  const {app,doc,window,order}=setup(t);app.start();order('name');
  await new Promise(r=>window.setTimeout(r,60));let mutations=0;const probe=new window.MutationObserver(r=>mutations+=r.length);probe.observe(doc.body,{childList:true,subtree:true,attributes:true});
  for(let i=0;i<8;i++)app.reconcile();await new Promise(r=>window.setTimeout(r,60));probe.disconnect();assert.equal(mutations,0);
});
test('central observer handles replacement window and preserves latest native slots on cleanup',async t=>{
  const {app,doc,window,order}=setup(t);app.start();order('name');
  doc.querySelector('.inventory-window--slots').outerHTML=`<div class="inventory-window--slots"><div class="pokeidle-panel__body">${body()}</div></div>`;
  await new Promise(r=>window.setTimeout(r,60));assert.equal(doc.querySelectorAll('[data-ppbui-order]').length,1);
  const removed=doc.querySelector('button.inventory-slot');removed.remove();app.reconcile();app.stop();assert.equal(removed.isConnected,false);assert.equal(doc.querySelectorAll('button.inventory-slot').length,3);
});

test('translated slot labels and numeric thousands are read without comparing quantity as name', async t=>{
  const {doc,window}=setup(t);
  const {readSlot}=await import('../src/modules/inventory/dom.js');
  window.PokeIdle={t:(_key,{name,count})=>`${name} — ${count} unidades`};
  const node=doc.querySelectorAll('button.inventory-slot')[2];
  node.setAttribute('aria-label','Ração — 1025 unidades');node.querySelector('span').textContent='1.025';
  const result=readSlot(node);assert.equal(result.name,'Ração');assert.equal(result.quantity,1025);
});

test('new loot stays behind already sorted items and does not reuse a removed node',t=>{
  const {app,doc,names,order}=setup(t);app.start();order('quantity');
  const grid=doc.querySelector('.inventory-slot-grid');
  const container=doc.createElement('div');container.innerHTML=slot('New loot',100);
  grid.insertBefore(container.firstElementChild,grid.lastElementChild);
  app.reconcile();assert.deepEqual(names(),['Zubat','Abra','Ball','Potion','New loot']);
  assert.ok(grid.lastElementChild.classList.contains('is-empty'));
  app.stop();assert.deepEqual(names(),['Zubat','Abra','Potion','Ball','New loot']);
});

test('focused sort stays connected and keeps a pending selection through native body refreshes', t => {
  const { app, doc, window, preference } = setup(t);
  app.start();
  const select = doc.querySelector('[data-ppbui-order]');
  const parent = select.parentNode;
  select.focus(); select.value = 'quality';
  const observer = new window.MutationObserver(() => {});
  observer.observe(parent, { childList: true, subtree: true });
  for (let i = 0; i < 5; i++) {
    doc.querySelector('.pokeidle-panel__body').innerHTML = body(); app.reconcile();
    assert.equal(doc.activeElement, select);
    assert.equal(select.parentNode, parent);
    assert.equal(select.value, 'quality');
  }
  assert.ok(observer.takeRecords().every(record => [...record.removedNodes].every(node => node !== select && !node.contains(select))));
  observer.disconnect();
  assert.equal(preference.get(), 'original');
  select.dispatchEvent(new window.Event('change')); assert.equal(preference.get(), 'quality');
});

test('advanced sorting uses native creature IDs and numeric metrics without changing game data', t => {
  const { app, doc, window, order, names } = setup(t);
  const pokemon = [...doc.querySelectorAll('.inventory-slot--pokemon')];
  pokemon.forEach((node, i) => node.dataset.creatureId = String(i + 1));
  const creatures = Object.freeze([
    Object.freeze({ id: 1, iv_total: 0, quality_multiplier: '2.4' }),
    Object.freeze({ id: 2, ivs: Object.freeze({ hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }), quality_multiplier: 1.2 }),
  ]);
  window.SceneManager = { _scene: { _panel: { body: doc.querySelector('.pokeidle-panel__body') }, _creatures: creatures } };
  app.start(); order('iv'); assert.deepEqual(names(), ['Abra', 'Zubat', 'Potion', 'Ball']);
  order('quality'); assert.deepEqual(names(), ['Zubat', 'Abra', 'Potion', 'Ball']);
  assert.equal(creatures[0].iv_total, 0);
  window.SceneManager._scene._panel.body = doc.createElement('div');
  order('iv'); assert.deepEqual(names(), ['Zubat', 'Abra', 'Potion', 'Ball']);
  assert.match(doc.querySelector('[data-ppbui-inventory-status]').textContent, /2 Pokémon sem/);
  window.PokeIdle = { ReactiveWindows: { cached: () => [{ _panel: { body: doc.querySelector('.pokeidle-panel__body') }, _creatures: creatures }] } };
  order('iv'); assert.deepEqual(names(), ['Abra', 'Zubat', 'Potion', 'Ball']);
});

test('unknown advanced values remain unavailable, including partial IVs and missing multipliers', async t => {
  const { doc } = setup(t);
  const { readSlot } = await import('../src/modules/inventory/dom.js');
  const node = doc.querySelector('.inventory-slot--pokemon'); node.dataset.creatureId = '1';
  for (const creature of [{}, { iv_total: '', quality_multiplier: null }, { ivs: { hp: 31 }, quality_multiplier: 'unknown' }]) {
    const row = readSlot(node, new Map([['1', creature]]));
    assert.equal(row.iv, null); assert.equal(row.quality, null);
  }
});

test('keyboard tab order follows category, persistent sort and visible enabled actions', t => {
  const { app, doc, window, order } = setup(t); app.start();
  const category = doc.querySelector('.inventory-slots-toolbar select');
  const select = doc.querySelector('[data-ppbui-order]');
  const firstView = doc.querySelector('[data-ppbui-view-mode=grid]');
  const tab = (node, shiftKey = false) => node.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true }));
  category.focus(); tab(category); assert.equal(doc.activeElement, select);
  tab(select); assert.equal(doc.activeElement, firstView);
  tab(firstView, true); assert.equal(doc.activeElement, select);
  tab(select, true); assert.equal(doc.activeElement, category);
  order('name');
  const apply = [...doc.querySelectorAll('[data-ppbui-module=inventory] button')].find(node => node.textContent === 'Aplicar');
  assert.equal(apply.closest('details'), null);
  select.focus(); tab(select); assert.equal(doc.activeElement, apply);
  tab(apply, true); assert.equal(doc.activeElement, select);
});

test('list adds read-only facts beside original slots and removes the old summary', t => {
  const { app, doc, window } = setup(t);
  const root = doc.querySelector('.inventory-window--slots');
  doc.querySelector('input').placeholder = 'Search backpack...';
  const before = root.outerHTML;
  const original = doc.querySelector('button.inventory-slot'); original.dataset.creatureId = '1';
  let clicks = 0; original.addEventListener('click', () => clicks++);
  window.SceneManager = { _scene: { _panel: { body: doc.querySelector('.pokeidle-panel__body') }, _creatures: [{ id: 1, iv_total: 140, quality_multiplier: 1.8 }], _items: [{ name: 'Potion', category: 'potion' }] } };
  app.start(); doc.querySelector('[data-ppbui-view-mode=list]').click();
  assert.equal(doc.querySelector('input').placeholder, 'Search');
  assert.equal(doc.querySelector('[data-ppbui-inventory-tools] summary'), null);
  assert.equal(doc.querySelector('[data-ppbui-inventory-status]').hidden, true);
  assert.equal(doc.querySelectorAll('[data-ppbui-inventory-row]').length, 4);
  assert.match(original.parentNode.textContent, /Zubat.*Nível: 10.*IV: 140\/186.*×1.8/);
  original.dispatchEvent(new window.MouseEvent('click', { ctrlKey: true })); assert.equal(clicks, 1);
  app.stop(); delete original.dataset.creatureId;
  assert.equal(root.outerHTML, before);
});

test('category blocks use unambiguous native categories and preserve item actions and sort order', t => {
  const { app, doc, window, order } = setup(t);
  const bodyNode = doc.querySelector('.pokeidle-panel__body');
  const category = bodyNode.querySelector('select');
  category.insertAdjacentHTML('beforeend', '<option value="potion">Healing</option><option value="boost">Boosters</option>');
  window.PokeIdle = { ReactiveWindows: { cached: () => [{ _panel: { body: bodyNode }, _items: [{ name: 'Potion', category: 'potion' }, { name: 'Ball', type: 'boost_xp' }] }] } };
  app.start(); order('level'); doc.querySelector('[data-ppbui-view-mode=grouped]').click();
  assert.deepEqual([...doc.querySelectorAll('[data-ppbui-inventory-category] h3')].map(n => n.textContent), ['Pokémon (2)', 'Healing (1)', 'Boosters (1)']);
  assert.equal(doc.querySelector('[data-ppbui-inventory-category=pokemon] button').getAttribute('aria-label'), 'Abra, 1 units');
  window.PokeIdle.ReactiveWindows.cached = () => [{ _panel: { body: bodyNode }, _items: [{ name: 'Potion', category: 'potion' }, { name: 'Potion', category: 'boost' }] }];
  app.reconcile(); assert.equal(doc.querySelector('[data-ppbui-inventory-category=other] h3').textContent, 'Outros (2)');
  assert.equal(doc.querySelectorAll('button.inventory-slot').length, 4);
  doc.querySelector('[data-ppbui-view-mode=grid]').click();
  assert.equal(doc.querySelector('[data-ppbui-inventory-category]'), null);
  assert.equal(doc.querySelector('.inventory-slot-grid').children.length, 5);
});

test('extra views are stable across reconciliation and native body refreshes', async t => {
  const { app, doc, window, names, order } = setup(t); app.start(); order('name');
  for (const mode of ['list', 'grouped']) {
    doc.querySelector(`[data-ppbui-view-mode=${mode}]`).click();
    await new Promise(resolve => window.setTimeout(resolve, 60));
    const probe = new window.MutationObserver(() => {}); probe.observe(doc.body, { childList: true, subtree: true, attributes: true });
    for (let i = 0; i < 4; i++) app.reconcile();
    assert.equal(probe.takeRecords().length, 0); probe.disconnect();
    doc.querySelector('.pokeidle-panel__body').innerHTML = body(); app.reconcile();
    assert.equal(doc.querySelector('.inventory-slot-grid').dataset.ppbuiInventoryView, mode);
    assert.equal(doc.querySelectorAll('button.inventory-slot').length, 4);
    assert.equal(doc.querySelectorAll('[data-ppbui-order]').length, 1);
  }
  doc.querySelector('[data-ppbui-view-mode=grid]').click();
  assert.deepEqual(names(), ['Abra', 'Ball', 'Potion', 'Zubat']);
  app.stop(); assert.deepEqual(names(), ['Zubat', 'Abra', 'Potion', 'Ball']);
});

test('native removal and insertion inside an enhanced view survive cleanup without resurrection', t => {
  const { app, doc, names } = setup(t); app.start(); doc.querySelector('[data-ppbui-view-mode=list]').click();
  const removed = doc.querySelector('button.inventory-slot'); removed.remove();
  doc.querySelector('.inventory-slot-grid').insertAdjacentHTML('beforeend', slot('New loot', 12));
  app.reconcile(); assert.equal(doc.querySelectorAll('[data-ppbui-inventory-row]').length, 4);
  app.stop(); assert.equal(removed.isConnected, false);
  assert.deepEqual(names(), ['Abra', 'Potion', 'Ball', 'New loot']);
});

test('scroll emitted by a native rebuild cannot overwrite the saved position in any view', t => {
  const { app, doc, window } = setup(t); app.start();
  const container = doc.querySelector('.pokeidle-panel__body');
  for (const mode of ['grid', 'list', 'grouped']) {
    doc.querySelector(`[data-ppbui-view-mode=${mode}]`).click();
    container.scrollTop = 800; container.dispatchEvent(new window.Event('scroll'));
    for (let i = 0; i < 3; i++) {
      container.innerHTML = body(); container.scrollTop = 0;
      container.dispatchEvent(new window.Event('scroll')); app.reconcile();
      assert.equal(container.scrollTop, 800);
    }
    container.scrollTop = 0; container.dispatchEvent(new window.Event('scroll'));
    container.innerHTML = body(); app.reconcile(); assert.equal(container.scrollTop, 0);
  }
  container.scrollTop = 800; container.dispatchEvent(new window.Event('scroll'));
  container.innerHTML = body('potion'); app.reconcile(); assert.equal(container.scrollTop, 0);
});

test('refresh preserves the unique visible slot offset when its position moves', t => {
  const { app, doc, window } = setup(t);
  const container = doc.querySelector('.pokeidle-panel__body');
  container.getBoundingClientRect = () => ({ top: 0, bottom: 500, height: 500 });
  const geometry = shift => [...container.querySelectorAll('button.inventory-slot')].forEach((node, index) => {
    const y = [0, 700, 900, 1000][index] + shift;
    node.getBoundingClientRect = () => ({ top: y - container.scrollTop, bottom: y + 56 - container.scrollTop });
  });
  geometry(0); app.start(); container.scrollTop = 800; container.dispatchEvent(new window.Event('scroll'));
  container.innerHTML = body(); geometry(80); container.scrollTop = 0;
  container.dispatchEvent(new window.Event('scroll')); app.reconcile();
  assert.equal(container.scrollTop, 880);
  const potion = [...container.querySelectorAll('button.inventory-slot')].find(node => node.getAttribute('aria-label').startsWith('Potion,'));
  assert.equal(potion.getBoundingClientRect().top, 100);
  potion.remove(); app.reconcile(); assert.equal(container.scrollTop, 880);
});

test('two rows keep Clear with filters and keyboard navigation follows the visible order', t => {
  const { app, doc, window } = setup(t); app.start();
  const category = doc.querySelector('.inventory-slots-toolbar select');
  category.value = 'pokemon'; app.reconcile();
  const clear = doc.querySelector('[data-ppbui-inventory-clear]');
  const order = doc.querySelector('[data-ppbui-order]');
  assert.equal(category.nextElementSibling, clear);
  const bar = doc.querySelector('[data-ppbui-module=inventory]');
  assert.equal(bar.firstElementChild.dataset.ppbuiOrderAnchor, '');
  assert.ok(bar.contains(doc.querySelector('[data-ppbui-inventory-views]')));
  const tab = (node, shiftKey = false) => node.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true }));
  clear.focus(); tab(clear); assert.equal(doc.activeElement, order);
  tab(order, true); assert.equal(doc.activeElement, clear);
  assert.equal(order.tabIndex, -1);
});

test('price sorting uses unit NPC prices, preserves Pokémon and updates on explicit re-sort', t => {
  const { app, doc, window, order, names } = setup(t);
  const items = [{ name: 'Potion', sell_price: '1250' }, { name: 'Ball', sell_price: 5 }];
  window.SceneManager = { _scene: { _panel: { body: doc.querySelector('.pokeidle-panel__body') }, _items: items } };
  app.start(); order('price');
  assert.deepEqual(names(), ['Zubat', 'Abra', 'Potion', 'Ball']);
  doc.querySelector('[data-ppbui-view-mode=list]').click();
  const prices = [...doc.querySelectorAll('[data-ppbui-inventory-price]')];
  assert.match(prices[0].textContent, /: —$/); assert.match(prices[2].textContent, /Venda NPC \(Unidade\): 1.250/);
  items[1].sell_price = 2000; app.reconcile();
  assert.deepEqual(names(), ['Zubat', 'Abra', 'Potion', 'Ball']);
  [...doc.querySelectorAll('[data-ppbui-module=inventory] button')].find(n => n.textContent === 'Aplicar').click();
  assert.deepEqual(names(), ['Zubat', 'Abra', 'Ball', 'Potion']);
});

test('missing and ambiguous prices are not zero, and native rarity tiers sort independently of quality', async t => {
  const { app, doc, order, names } = setup(t);
  const { readSlot } = await import('../src/modules/inventory/dom.js');
  const nodes = [...doc.querySelectorAll('button.inventory-slot')];
  for (const [i, rarity] of ['common', 'mythical', 'rare', 'legendary'].entries()) nodes[i].classList.add(`rarity-${rarity}`);
  assert.equal(readSlot(nodes[2], new Map(), new Map([['Potion', [{ sell_price: 0 }]]])).price, 0);
  for (const entries of [[{}], [{ sell_price: null }], [{ sell_price: -1 }], [{ sell_price: 10 }, { sell_price: 20 }]]) {
    assert.equal(readSlot(nodes[2], new Map(), new Map([['Potion', entries]])).price, null);
  }
  app.start(); order('rarity'); assert.deepEqual(names(), ['Abra', 'Ball', 'Potion', 'Zubat']);
  order('original'); assert.deepEqual(names(), ['Zubat', 'Abra', 'Potion', 'Ball']);
  nodes[1].classList.remove('rarity-mythical');
  order('rarity'); assert.deepEqual(names(), ['Ball', 'Abra', 'Potion', 'Zubat']);
});

test('all localized sort options use consistent capitalization and price rendering is stable', async t => {
  const { app, doc, window } = setup(t);
  const { inventoryConfig } = await import('../src/modules/inventory/config.js');
  for (const language of ['pt', 'en', 'es']) {
    for (const label of inventoryConfig.text[language].modes) assert.doesNotMatch(label, /(^|[\s:–])\p{Ll}/u);
    assert.equal(inventoryConfig.text[language].modes.length, inventoryConfig.modes.length);
  }
  let renders = 0;
  window.PokeIdle = { Currency: { element(value) { renders++; const span = doc.createElement('span'); span.textContent = `${value} Coins`; return span; } } };
  window.SceneManager = { _scene: { _panel: { body: doc.querySelector('.pokeidle-panel__body') }, _items: [{ name: 'Potion', sell_price: 10 }] } };
  app.start(); doc.querySelector('[data-ppbui-view-mode=list]').click();
  for (let i = 0; i < 5; i++) app.reconcile();
  assert.equal(renders, 1);
  assert.match(doc.querySelector('[data-ppbui-inventory-view]').textContent, /10 Coins/);
});

test('Pokémon native sell values participate in the shared price sort and list by creature ID', async t => {
  const { app, doc, window, order, names } = setup(t);
  const nodes = [...doc.querySelectorAll('.inventory-slot--pokemon')];
  nodes.forEach((node, index) => node.dataset.creatureId = String(index + 1));
  const creatures = [{ id: 1, sell_value: 5000, sell_price: 1 }, { id: 2, sell_price: 1000 }];
  window.SceneManager = { _scene: { _panel: { body: doc.querySelector('.pokeidle-panel__body') }, _creatures: creatures, _items: [{ name: 'Potion', sell_price: 1250 }, { name: 'Ball', sell_price: 5 }] } };
  app.start(); order('price'); doc.querySelector('[data-ppbui-view-mode=list]').click();
  assert.deepEqual(names(), ['Zubat', 'Potion', 'Abra', 'Ball']);
  assert.match(nodes[0].parentNode.querySelector('[data-ppbui-inventory-price]').textContent, /5.000/);
  assert.match(nodes[1].parentNode.querySelector('[data-ppbui-inventory-price]').textContent, /1.000/);
  const { readSlot } = await import('../src/modules/inventory/dom.js');
  for (const [value, expected] of [[{sell_value:0},0], [{sell_value:0,sell_price:12},12], [{sell_value:null},null], [{sell_value:'900'},900]]) {
    assert.equal(readSlot(nodes[0], new Map([['1', value]])).price, expected);
  }
});
