import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { createBetterUI } from '../src/core/bootstrap.js';
import { createInventoryModule } from '../src/modules/inventory/index.js';
import { createInventoryOrder } from '../src/modules/inventory/preferences.js';
const nativeOverridesCss = readFileSync(new URL('../src/styles/native-overrides.css', import.meta.url), 'utf8');
const slot = (name, quantity, pokemon = false) => `<button class="inventory-slot${pokemon ? ' inventory-slot--pokemon' : ''}" aria-label="${name}, ${pokemon ? 1 : quantity} units"><span class="${pokemon ? 'inventory-slot__pokemon-level' : 'inventory-slot__quantity'}">${pokemon ? 'Lv.' : ''}${quantity}</span></button>`;
const tabs = (category = 'all', extra = '') => `<div class="inventory-category-tabs" role="tablist" aria-label="Categories"><button type="button" class="inventory-category-tab${category === 'all' ? ' is-active' : ''}" data-category="all" role="tab" aria-selected="${category === 'all'}" tabindex="${category === 'all' ? 0 : -1}">All</button><button type="button" class="inventory-category-tab${category === 'pokemon' ? ' is-active' : ''}" data-category="pokemon" role="tab" aria-selected="${category === 'pokemon'}" tabindex="${category === 'pokemon' ? 0 : -1}">Pokémon</button>${extra}</div>`;
const body = (query = '', category = 'all', extraTabs = '') => `${tabs(category, extraTabs)}<div class="inventory-slots-toolbar"><input type="search" class="game-window__search" value="${query}"></div><div class="inventory-slot-grid">${slot('Zubat',10,true)}${slot('Abra',25,true)}${slot('Potion',7)}${slot('Ball',15)}<div class="inventory-slot is-empty"></div></div>`;
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
  app.start();assert.deepEqual(names(),['Zubat','Abra','Potion','Ball']);assert.ok(root.classList.contains('ppbui-window'));assert.equal(root.querySelector('.pokeidle-panel__body').classList.contains('ppbui-scroll'),false);assert.ok(doc.querySelector('[data-ppbui-inventory-shell-style]'));
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
  const render=()=>{container.innerHTML=body(query,category);const search=container.querySelector('input');search.addEventListener('input',()=>{searchEvents++;query=search.value;render();});for(const tab of container.querySelectorAll('.inventory-category-tab'))tab.addEventListener('click',()=>{categoryEvents++;category=tab.dataset.category;render();});};
  render();app.start();doc.querySelector('[data-ppbui-inventory-clear]').click();
  assert.equal(query,'');assert.equal(category,'all');assert.equal(searchEvents,1);assert.equal(categoryEvents,1);
  assert.equal(doc.activeElement,container.querySelector('input'));app.reconcile();assert.equal(doc.querySelectorAll('[data-ppbui-order]').length,1);
});
test('category dropdown delegates to the original native category tab handler', t=>{
  const {app,doc,window}=setup(t);let clicks=0;
  const pokemon=doc.querySelector('.inventory-category-tab[data-category="pokemon"]');
  pokemon.addEventListener('click',()=>{clicks++;for(const tab of doc.querySelectorAll('.inventory-category-tab')){const active=tab===pokemon;tab.classList.toggle('is-active',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}});
  app.start();
  const proxy=doc.querySelector('[data-ppbui-inventory-category-proxy]');
  proxy.value='pokemon';proxy.dispatchEvent(new window.Event('change',{bubbles:true}));app.reconcile();
  assert.equal(clicks,1);
  assert.equal(proxy.value,'pokemon');
  assert.equal(pokemon.getAttribute('aria-selected'),'true');
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
test('Backpack moves the exact native Wallet onto the Sort rail and restores it with handlers intact', t=>{
  const {app,doc}=setup(t);const root=doc.querySelector('.inventory-window--slots');
  const team=doc.createElement('div');team.className='pokeidle-team-hud';
  const wallet=doc.createElement('div');wallet.className='pokeidle-team-hud__wallet is-hidden';wallet.innerHTML='<button type="button">Coins: 123</button>';
  const resize=doc.createElement('div');resize.className='pokeidle-resize-handle';root.append(resize);
  root.before(team,wallet);let clicks=0;wallet.firstElementChild.addEventListener('click',()=>clicks++);
  wallet.firstElementChild.focus();
  app.start();
  const sortRail=root.querySelector('[data-ppbui-inventory-tools] > .inventory-slots-toolbar');
  assert.equal(wallet.parentNode,sortRail,'the native Wallet joins the Sort rail instead of becoming a footer or clone');
  assert.equal(wallet.nextElementSibling,root.querySelector('[data-ppbui-inventory-views]'),'Wallet precedes Views in DOM so keyboard order matches the responsive visual order');
  const focusables=[...sortRail.querySelectorAll('button:not([disabled]),select:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])')];
  assert.ok(focusables.indexOf(wallet.firstElementChild)<focusables.indexOf(root.querySelector('[data-ppbui-view-mode]')),'focus order reaches Wallet before Views when Views wrap below');
  assert.equal(resize.parentNode,root,'native window resize affordances remain in the outer window');
  assert.equal(doc.querySelectorAll('.pokeidle-team-hud__wallet').length,1);
  assert.equal(wallet.hasAttribute('data-ppbui-inventory-wallet'),true);
  assert.equal(doc.activeElement,wallet.firstElementChild,'reparenting preserves focus when a native Wallet control owns it');
  assert.equal(doc.defaultView.getComputedStyle(wallet).display,'flex','Team collapse state must not hide the Wallet while it lives in Backpack');
  wallet.firstElementChild.click();assert.equal(clicks,1,'native Wallet listeners remain attached');
  doc.querySelector('.pokeidle-panel__body').innerHTML=body();app.reconcile();
  assert.equal(wallet.parentNode,sortRail,'native Backpack body rebuilds cannot remove the Wallet from the Sort rail');
  app.stop();
  assert.equal(team.nextElementSibling,wallet,'cleanup restores the original Team -> Wallet adjacency');
  assert.equal(wallet.hasAttribute('data-ppbui-inventory-wallet'),false);
  assert.equal(wallet.classList.contains('is-hidden'),true,'native collapse state remains owned by the host');
  assert.notEqual(doc.activeElement,wallet.firstElementChild,'cleanup must not force focus back into the HUD Wallet that Better UI hides');
  wallet.firstElementChild.click();assert.equal(clicks,2,'native Wallet listeners survive the round trip');
});
test('Wallet is visible only in Backpack and stays globally removed from HUD even with Team HUD module absent', t=>{
  const {app,doc,window}=setup(t);const root=doc.querySelector('.inventory-window--slots');
  const team=doc.createElement('div');team.className='pokeidle-team-hud';team.innerHTML='<div class="pokeidle-team-hud__list"></div>';
  const wallet=doc.createElement('div');wallet.className='pokeidle-team-hud__wallet';wallet.textContent='Coins';root.before(team,wallet);
  window.PokeIdle={PersistentHud:{_teamHud:{el:team,_walletEl:wallet,_creatures:[]}}};
  const globalStyle=doc.createElement('style');globalStyle.textContent=nativeOverridesCss;doc.head.append(globalStyle);
  assert.equal(window.getComputedStyle(wallet).display,'none','Better UI design-system override removes HUD Wallet without mounting Team HUD module');
  app.start();
  assert.equal(wallet.parentNode,root.querySelector('[data-ppbui-inventory-tools] > .inventory-slots-toolbar'));
  assert.equal(window.getComputedStyle(wallet).display,'flex','moving the same native node into Backpack makes it visible there');
  app.stop();
  assert.equal(team.nextElementSibling,wallet);
  assert.equal(window.getComputedStyle(wallet).display,'none','closing Backpack never brings Wallet back visually on HUD even when Team HUD enhancement is disabled');
});
test('Backpack removes Wallet value backplate and matches standard control height without erasing native icon backgrounds', t=>{
  const {app,doc,window}=setup(t);const root=doc.querySelector('.inventory-window--slots');
  const team=doc.createElement('div');team.className='pokeidle-team-hud';
  const wallet=doc.createElement('div');wallet.className='pokeidle-team-hud__wallet';
  wallet.innerHTML='<span class="wallet-value"><i class="wallet-icon"></i><b>123</b></span>';
  const host=doc.createElement('style');host.textContent='.wallet-value{padding:0!important;border:0!important;background-color:#000!important;background-image:url("currency-backplate.png")!important;box-shadow:0 0 4px #000!important}.wallet-icon{background-image:url("currency-icon.png")!important}';doc.head.append(host);
  root.before(team,wallet);app.start();
  const value=wallet.firstElementChild,icon=value.firstElementChild,computed=window.getComputedStyle(value);
  assert.equal(computed.backgroundColor,'rgba(0, 0, 0, 0)','Backpack neutralizes the dark Wallet value fill');
  assert.equal(computed.backgroundImage,'none','Backpack removes the native Wallet backplate image behind each value');
  assert.notEqual(computed.borderTopWidth,'0px','Wallet value box gains a visible boundary instead of floating text');
  assert.equal(computed.height,'var(--ppbui-control-height)','Wallet value box uses the standard Better UI control-height token');
  assert.equal(computed.minHeight,'var(--ppbui-control-height)','Wallet value box keeps the standard Better UI control-height token as its minimum');
  assert.match(window.getComputedStyle(icon).backgroundImage,/currency-icon\.png/,'nested native currency/icon artwork remains untouched');
});
test('Wallet survives native Backpack window replacement and returns to Team on final cleanup', async t=>{
  const {app,doc,window}=setup(t);const root=doc.querySelector('.inventory-window--slots');
  const team=doc.createElement('div');team.className='pokeidle-team-hud';
  const wallet=doc.createElement('div');wallet.className='pokeidle-team-hud__wallet';wallet.textContent='Coins';root.before(team,wallet);
  app.start();assert.equal(wallet.parentNode,root.querySelector('[data-ppbui-inventory-tools] > .inventory-slots-toolbar'));
  root.outerHTML=`<div class="inventory-window--slots"><div class="pokeidle-panel__body">${body()}</div></div>`;
  await new Promise(resolve=>window.setTimeout(resolve,60));
  const replacement=doc.querySelector('.inventory-window--slots');
  assert.equal(wallet.parentNode,replacement.querySelector('[data-ppbui-inventory-tools] > .inventory-slots-toolbar'),'central lifecycle remount moves the same Wallet into the replacement Backpack Sort rail');
  assert.equal(doc.querySelectorAll('.pokeidle-team-hud__wallet').length,1);
  app.stop();assert.equal(team.nextElementSibling,wallet);assert.equal(wallet.hasAttribute('data-ppbui-inventory-wallet'),false);
});
test('Backpack follows an authoritative native Wallet replacement without keeping a stale duplicate', t=>{
  const {app,doc,window}=setup(t);const root=doc.querySelector('.inventory-window--slots');
  const team=doc.createElement('div');team.className='pokeidle-team-hud';
  const walletA=doc.createElement('div');walletA.className='pokeidle-team-hud__wallet';walletA.textContent='Coins A';root.before(team,walletA);
  window.PokeIdle={PersistentHud:{_teamHud:{el:team,_walletEl:walletA}}};
  app.start();assert.equal(walletA.parentNode,root.querySelector('[data-ppbui-inventory-tools] > .inventory-slots-toolbar'));
  const walletB=doc.createElement('div');walletB.className='pokeidle-team-hud__wallet';walletB.textContent='Coins B';team.after(walletB);
  window.PokeIdle.PersistentHud._teamHud._walletEl=walletB;app.reconcile();
  assert.equal(walletA.isConnected,false,'the stale Wallet survives only because Better UI moved it, so a native replacement retires it');
  assert.equal(walletB.parentNode,root.querySelector('[data-ppbui-inventory-tools] > .inventory-slots-toolbar'),'current native _walletEl becomes the sole Backpack Sort-rail Wallet');
  assert.equal(doc.querySelectorAll('.pokeidle-team-hud__wallet').length,1);
  delete window.PokeIdle.PersistentHud._teamHud._walletEl;app.reconcile();
  assert.equal(walletB.parentNode,root.querySelector('[data-ppbui-inventory-tools] > .inventory-slots-toolbar'),'temporary runtime gaps keep the already-established current Wallet');
  app.stop();assert.equal(team.nextElementSibling,walletB,'cleanup restores the latest native Wallet beside Team');
});
test('Wallet fallback fails closed when more than one Team HUD ownership candidate exists', t=>{
  const {app,doc}=setup(t);const root=doc.querySelector('.inventory-window--slots');
  const teamA=doc.createElement('div'),walletA=doc.createElement('div'),teamB=doc.createElement('div'),walletB=doc.createElement('div');
  teamA.className=teamB.className='pokeidle-team-hud';walletA.className=walletB.className='pokeidle-team-hud__wallet';
  root.before(teamA,walletA,teamB,walletB);app.start();
  assert.equal(root.querySelector('[data-ppbui-inventory-wallet]'),null,'ambiguous document-level Wallets are not claimed without runtime authority');
  assert.equal(teamA.nextElementSibling,walletA);assert.equal(teamB.nextElementSibling,walletB);
});
test('Wallet reconciliation is mutation-free after ownership is established', async t=>{
  const {app,doc,window}=setup(t);const root=doc.querySelector('.inventory-window--slots');
  const team=doc.createElement('div');team.className='pokeidle-team-hud';
  const wallet=doc.createElement('div');wallet.className='pokeidle-team-hud__wallet';wallet.innerHTML='<span>123</span>';root.before(team,wallet);
  window.PokeIdle={PersistentHud:{_teamHud:{el:team,_walletEl:wallet}}};app.start();await Promise.resolve();
  let mutations=0;const observer=new window.MutationObserver(records=>mutations+=records.length);observer.observe(doc.body,{subtree:true,childList:true,attributes:true});
  for(let i=0;i<8;i++)app.reconcile();await Promise.resolve();observer.disconnect();
  assert.equal(mutations,0);assert.equal(wallet.parentNode,root.querySelector('[data-ppbui-inventory-tools] > .inventory-slots-toolbar'));
  wallet.firstElementChild.textContent='456';assert.equal(root.querySelector('[data-ppbui-inventory-wallet] span').textContent,'456','native content updates continue on the same moved node');
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

test('keyboard tab order follows current tab/search contract, persistent sort and visible enabled actions', t => {
  const { app, doc, window, order } = setup(t);
  const root=doc.querySelector('.inventory-window--slots'),team=doc.createElement('div'),wallet=doc.createElement('div');
  team.className='pokeidle-team-hud';wallet.className='pokeidle-team-hud__wallet';wallet.innerHTML='<button type="button">Wallet</button>';root.before(team,wallet);
  app.start();
  const search = doc.querySelector('.inventory-slots-toolbar input');
  const category = doc.querySelector('.inventory-category-tab[aria-selected="true"]');
  const select = doc.querySelector('[data-ppbui-order]');
  const firstView = doc.querySelector('[data-ppbui-view-mode=grid]');
  const walletButton = wallet.firstElementChild;
  const tab = (node, shiftKey = false) => node.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true }));
  assert.equal(category.dataset.category, 'all');
  search.focus(); tab(search); assert.equal(doc.activeElement, select);
  tab(select); assert.equal(doc.activeElement, walletButton,'disabled Re-Sort makes Wallet the next visual and keyboard stop after Sort');
  tab(walletButton, true); assert.equal(doc.activeElement, select,'Shift+Tab from the first Wallet control returns to Sort');
  assert.equal(wallet.nextElementSibling,firstView.closest('[data-ppbui-inventory-views]'),'Wallet remains before Views in DOM');
  tab(select, true); assert.equal(doc.activeElement, search);
  const more = doc.createElement('button');more.type='button';more.dataset.ppbuiInventoryMoreFilters='';search.after(more);app.reconcile();
  more.focus();tab(more);assert.equal(doc.activeElement,select);
  tab(select,true);assert.equal(doc.activeElement,more);
  more.remove();app.reconcile();
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
  const category = bodyNode.querySelector('.inventory-category-tabs');
  category.insertAdjacentHTML('beforeend', '<button type="button" class="inventory-category-tab" data-category="potion" role="tab" aria-selected="false" tabindex="-1">Healing</button><button type="button" class="inventory-category-tab" data-category="boost" role="tab" aria-selected="false" tabindex="-1">Boosters</button>');
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
  const category = doc.querySelector('.inventory-category-tabs');
  const categoryProxy = doc.querySelector('[data-ppbui-inventory-category-proxy]');
  const search = doc.querySelector('.inventory-slots-toolbar input');
  assert.ok(categoryProxy,'native category tabs are represented by one compact dropdown');
  assert.equal(category.hidden,true,'native category tab strip is removed from the visible layout while Better UI is active');
  assert.equal(categoryProxy.nextElementSibling,search,'category dropdown sits directly to the left of Search');
  assert.deepEqual([...categoryProxy.options].map(option=>[option.value,option.textContent]),[['all','All'],['pokemon','Pokémon']]);
  for (const tabNode of category.querySelectorAll('.inventory-category-tab')) {
    const active = tabNode.dataset.category === 'pokemon';
    tabNode.classList.toggle('is-active', active);
    tabNode.setAttribute('aria-selected', String(active));
    tabNode.tabIndex = active ? 0 : -1;
  }
  app.reconcile();
  const clear = doc.querySelector('[data-ppbui-inventory-clear]');
  const order = doc.querySelector('[data-ppbui-order]');
  assert.equal(categoryProxy.value,'pokemon','category dropdown mirrors the authoritative native selection');
  assert.equal(search.nextElementSibling, clear);
  const bar = doc.querySelector('[data-ppbui-module=inventory]');
  assert.equal(bar.firstElementChild.dataset.ppbuiOrderAnchor, '');
  assert.ok(bar.contains(doc.querySelector('[data-ppbui-inventory-views]')));
  const tab = (node, shiftKey = false) => node.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true }));
  clear.focus(); tab(clear); assert.equal(doc.activeElement, order);
  tab(order, true); assert.equal(doc.activeElement, clear);
  assert.equal(order.tabIndex, -1);
  assert.ok(doc.querySelector('[data-ppbui-inventory-tools]').classList.contains('ppbui-root'));
  assert.ok(search.closest('.inventory-slots-toolbar').classList.contains('ppbui-root'));
  assert.ok(doc.querySelector('.game-window__search').classList.contains('ppbui-input'));
  assert.equal(category.classList.contains('ppbui-select'), false); assert.ok(categoryProxy.classList.contains('ppbui-select')); assert.ok(order.classList.contains('ppbui-select'));
  for (const button of doc.querySelectorAll('[data-ppbui-inventory-tools] button')) assert.ok(button.classList.contains('ppbui-button'));
  const shellCss=doc.querySelector('[data-ppbui-inventory-shell-style]').textContent;
  const toolsCss=doc.querySelector('style[data-ppbui-inventory-style]')?.textContent||'';
  const viewsCss=doc.querySelector('style[data-ppbui-inventory-views-style]')?.textContent||'';
  assert.match(shellCss,/> \.pokeidle-panel__body \{[^}]*padding:0!important[^}]*background:var\(--ppbui-bg-0\)/s,"Backpack body is a content bay rather than a padded outer card");
  assert.match(shellCss,/\[data-ppbui-inventory-toolbar\] \{[^}]*border:0!important[^}]*border-bottom:var\(--ppbui-separator-width\) solid var\(--ppbui-border\)!important[^}]*background:var\(--ppbui-bg-1\)!important/s,"native filters form the first continuous utility rail");
  assert.match(shellCss,/\[data-ppbui-inventory-tools\] \{[^}]*border:0[^}]*border-bottom:var\(--ppbui-border-width\) solid var\(--ppbui-border-strong\)[^}]*background:var\(--ppbui-bg-2\)/s,"sort and view controls form a second organization rail");
  assert.match(shellCss,/\[data-ppbui-inventory-tools\] > \.inventory-slots-toolbar \{[^}]*grid-template-columns:minmax\(160px,235px\) auto minmax\(0,1fr\) max-content[^}]*justify-content:start/s,"Sort rail reserves the flexible middle track for Wallet between Re-Sort and Views");
  assert.match(shellCss,/> select\[data-ppbui-order\] \{[^}]*width:235px!important[^}]*min-width:160px!important[^}]*max-width:235px!important/s,"Sort has the same +15px hard scoped fallback even if proxy measurement is delayed in the live host");
  assert.match(shellCss,/\.inventory-window--slots\.ppbui-window \{[^}]*container-type:inline-size[^}]*max-width:calc\(100vw - 16px\)/s,"Backpack establishes module-local responsive ownership instead of depending on whole-window media queries");
  assert.match(shellCss,/\.inventory-category-tabs\[data-ppbui-inventory-native-categories\]\[hidden\] \{[^}]*display:none!important/s,"native category tabs leave the visual layout while their handlers remain authoritative");
  assert.match(shellCss,/\[data-ppbui-inventory-category-proxy\] \{[^}]*min-width:140px[^}]*max-width:190px[^}]*flex:0 1 190px/s,"category dropdown stays compact to the left of the flexible Search field");
  assert.match(shellCss,/@container \(max-width:680px\)[\s\S]*\.inventory-slots-toolbar \{ grid-template-columns:minmax\(0,1fr\) auto max-content; \}[\s\S]*\[data-ppbui-inventory-views\] \{ grid-column:1\/-1; width:100%; \}/,"Views move below early enough to keep Sort plus Wallet on one overflow-safe top row");
  assert.match(toolsCss,/@container \(max-width:519px\)[\s\S]*\[data-ppbui-inventory-toolbar\] \{ flex-wrap:wrap!important; \}/,"native Search/Category/Clear controls wrap only when the pane is narrower than the validated desktop minimum");
  const responsiveMinimum=doc.querySelector('.inventory-window--slots').style.getPropertyValue('min-width');
  assert.ok(responsiveMinimum.startsWith('min(520px,')&&responsiveMinimum.includes('100vw')&&responsiveMinimum.includes('16px'),'the browser may canonicalize calc() ordering, but the runtime minimum must remain viewport bounded');
  assert.match(shellCss,/\[data-ppbui-inventory-toolbar\] > input\.game-window__search\.ppbui-input \{[^}]*appearance:none!important[^}]*border-radius:var\(--ppbui-radius\)!important[^}]*background-image:none!important[^}]*box-shadow:none!important/s,"native search chrome cannot restore rounded input treatment inside Backpack");
  assert.doesNotMatch(shellCss,/::-webkit-scrollbar|scrollbar-color|scrollbar-width|scrollbar-gutter/,"host-owned Backpack scrollers keep the current native game scrollbar");
  assert.match(shellCss,/\.inventory-slot:focus-visible \{[^}]*outline:var\(--ppbui-focus-width\) solid var\(--ppbui-focus\)!important[^}]*outline-offset:var\(--ppbui-pixel-unit\)/s,"native slot actions receive the shared visible focus treatment without replacing their handlers");
  assert.match(shellCss,/\.inventory-slots-toolbar > \.pokeidle-team-hud__wallet\[data-ppbui-inventory-wallet\] \{[^}]*position:static!important[^}]*display:flex!important[^}]*flex-wrap:nowrap!important[^}]*justify-content:center!important[^}]*justify-self:center[^}]*width:auto!important[^}]*background:transparent!important[^}]*box-shadow:none!important/s,"native Wallet is centered in the flexible space between Re-Sort and Views without retaining HUD positioning");
  assert.match(shellCss,/\.pokeidle-team-hud__wallet\[data-ppbui-inventory-wallet\] > \* \{[^}]*height:var\(--ppbui-control-height\)!important[^}]*min-height:var\(--ppbui-control-height\)[^}]*padding:0 var\(--ppbui-space-3\)!important[^}]*border:var\(--ppbui-separator-width\) solid var\(--ppbui-border\)!important[^}]*background-color:transparent!important[^}]*background-image:none!important[^}]*box-shadow:none!important/s,"Wallet value wrappers match standard control height and remove the native backplate while keeping transparent fill");
  assert.doesNotMatch(shellCss,/\.pokeidle-team-hud__wallet\[data-ppbui-inventory-wallet\][^}]*> \*[^}]*background:transparent!important/s,"Wallet value cleanup must not use background shorthand that can erase native icon imagery");
  assert.match(shellCss,/@container \(max-width:680px\)[\s\S]*\.pokeidle-team-hud__wallet\[data-ppbui-inventory-wallet\] \{ grid-column:3; grid-row:1; \}/,"narrow/intermediate Backpack keeps Wallet on the same first row as Sort while Views move below");
  assert.match(shellCss,/\.ppbui-pokemon-tools \{[^}]*width:calc\(100% - \(var\(--ppbui-space-4\) \+ var\(--ppbui-space-4\)\)\)!important[^}]*margin:0 var\(--ppbui-space-4\)!important[^}]*padding:var\(--ppbui-space-3\) 0!important/s,"More filters uses physical horizontal inset instead of relying only on internal padding");
  assert.match(shellCss,/\.inventory-slot-grid \{[^}]*border:0!important[^}]*background:var\(--ppbui-bg-0\)!important[^}]*box-shadow:none!important/s,"slot content no longer sits inside an extra generic framed box");
  assert.match(toolsCss,/\[data-ppbui-inventory-views\] \{[^}]*gap:0/s,"view switching reads as one compact segmented control");
  assert.match(toolsCss,/@container \(max-width:440px\)[\s\S]*\[data-ppbui-inventory-toolbar\] > select\.game-window__select \{ flex-basis:100%; \}[\s\S]*\[data-ppbui-inventory-toolbar\] > input\.game-window__search \{ min-width:0; flex:1 1 140px; \}/,"narrow Backpack gives category its own row so Search keeps More Filters immediately beside it");
  assert.match(viewsCss,/\[data-ppbui-inventory-view="grouped"\] \{[^}]*padding:0!important[^}]*border:0!important[^}]*background:var\(--ppbui-bg-0\)!important/s,"grouped inventory uses sections, not cards inside a card");
});

test('Sort proxy width beats shared native-select width ownership and stays bounded to its measured anchor', t=>{
  const {app,doc}=setup(t);app.start();
  const root=doc.querySelector('.inventory-window--slots'),body=doc.querySelector('.pokeidle-panel__body');
  const anchor=doc.querySelector('[data-ppbui-order-anchor]'),order=doc.querySelector('[data-ppbui-order]');
  root.getBoundingClientRect=()=>({left:0,top:0,right:760,bottom:600,width:760,height:600,x:0,y:0,toJSON(){}});
  body.getBoundingClientRect=()=>({left:0,top:0,right:760,bottom:600,width:760,height:600,x:0,y:0,toJSON(){}});
  anchor.getBoundingClientRect=()=>({left:8,top:36,right:243,bottom:64,width:235,height:28,x:8,y:36,toJSON(){}});
  app.reconcile();
  assert.equal(order.style.getPropertyValue('width'),'235px');
  assert.equal(order.style.getPropertyPriority('width'),'important');
  assert.equal(order.style.getPropertyValue('max-width'),'235px');
  assert.equal(order.style.getPropertyPriority('max-width'),'important');
  const toolsCss=doc.querySelector('[data-ppbui-inventory-style]').textContent;
  assert.match(toolsCss,/\[data-ppbui-order\] \{[^}]*position:absolute!important;[^}]*z-index:5/s,'Sort proxy paints above both sticky Inventory rails instead of being covered by the organization rail');
});

test('Backpack preserves native scroll surfaces without claiming visual ownership',t=>{
  const {app,doc}=setup(t);const root=doc.querySelector('.inventory-window--slots'),body=doc.querySelector('.pokeidle-panel__body'),grid=doc.querySelector('.inventory-slot-grid');
  app.start();
  for(const node of [root,body,grid]){assert.equal(node.classList.contains('ppbui-scroll'),false);assert.equal(node.hasAttribute('data-ppbui-inventory-scroll'),false);}
  app.stop();
  for(const node of [root,body,grid]){assert.equal(node.classList.contains('ppbui-scroll'),false);assert.equal(node.hasAttribute('data-ppbui-inventory-scroll'),false);}
});

test('Backpack keeps filter and organization rails sticky while the native body remains the scroll owner',t=>{
  const {app,doc}=setup(t);const root=doc.querySelector('.inventory-window--slots'),bodyNode=doc.querySelector('.pokeidle-panel__body');
  const firstToolbar=bodyNode.querySelector('.inventory-slots-toolbar');
  firstToolbar.getBoundingClientRect=()=>({left:0,top:0,right:520,bottom:40,width:520,height:40,x:0,y:0,toJSON(){}});
  app.start();
  const shellCss=doc.querySelector('[data-ppbui-inventory-shell-style]').textContent,tools=doc.querySelector('[data-ppbui-inventory-tools]');
  assert.match(shellCss,/\[data-ppbui-inventory-toolbar\] \{[^}]*position:sticky!important;[^}]*top:0!important;[^}]*z-index:4/s,'filter rail sticks to the top of the native scrolling body');
  assert.match(shellCss,/\[data-ppbui-inventory-tools\] \{[^}]*position:sticky;[^}]*top:var\(--ppbui-inventory-sticky-top,[^)]+\)[^}]*z-index:3/s,'organization rail sticks directly below the measured filter rail');
  assert.equal(tools.style.getPropertyValue('--ppbui-inventory-sticky-top'),'40px');
  assert.equal(bodyNode.classList.contains('ppbui-scroll'),false,'sticky controls do not replace the native body scroll owner');
  bodyNode.innerHTML=body();
  const replacement=bodyNode.querySelector('.inventory-slots-toolbar');
  replacement.getBoundingClientRect=()=>({left:0,top:0,right:390,bottom:72,width:390,height:72,x:0,y:0,toJSON(){}});
  app.reconcile();
  assert.equal(tools.style.getPropertyValue('--ppbui-inventory-sticky-top'),'72px','toolbar rebuilds and responsive wraps refresh the second rail offset');
});

test('same-toolbar child replacement reacquires master field primitives without leaking old ownership', t=>{
  const {app,doc}=setup(t);app.start();
  const toolbar=doc.querySelector('.inventory-slots-toolbar');
  const previousSearch=toolbar.querySelector('input'),previousCategory=doc.querySelector('.inventory-category-tabs');
  const search=doc.createElement('input');search.className='game-window__search';
  const category=doc.createElement('select');category.className='game-window__select';category.innerHTML='<option value="all">All</option><option value="pokemon">Pokémon</option>';
  toolbar.replaceChildren(search,category,doc.querySelector('[data-ppbui-inventory-clear]'));
  app.reconcile();
  assert.equal(toolbar.classList.contains('ppbui-root'),true);
  assert.equal(search.classList.contains('ppbui-input'),true);assert.equal(category.classList.contains('ppbui-select'),true);
  assert.equal(previousSearch.classList.contains('ppbui-input'),false);assert.equal(previousCategory.classList.contains('ppbui-select'),false);
});

test('Backpack search bridge owns field chrome while corner geometry follows the global preference', t => {
  const {app,doc}=setup(t);
  const hostile=doc.createElement('style');hostile.textContent='.inventory-window--slots input.game-window__search{appearance:auto!important;-webkit-appearance:auto!important;border:5px solid red!important;border-radius:18px!important;background:red!important;background-image:linear-gradient(red,red)!important;color:red!important;box-shadow:0 0 4px red!important}';doc.head.append(hostile);
  app.start();
  const search=doc.querySelector('input.game-window__search'),computed=doc.defaultView.getComputedStyle(search);
  assert.equal(search.type,'search');
  assert.equal(search.getAttribute('aria-label'),'Busca');
  assert.equal(computed.backgroundImage,'none');
  assert.equal(computed.boxShadow,'none');
  const shellCss=doc.querySelector('[data-ppbui-inventory-shell-style]').textContent;
  assert.match(shellCss,/input\.game-window__search\.ppbui-input \{[^}]*border:var\(--ppbui-border-width\) solid var\(--ppbui-border-strong\)!important[^}]*border-radius:var\(--ppbui-radius\)!important[^}]*background:var\(--ppbui-bg-0\)!important[^}]*color:var\(--ppbui-text\)!important/s,"hostile important fill/border/text cannot bypass the scoped Search bridge and radius remains preference-driven");
});

test('Backpack preserves a native search accessible name when the host already provides one', t => {
  const {app,doc}=setup(t);
  const search=doc.querySelector('input.game-window__search');
  search.setAttribute('aria-label','Native backpack search');
  app.start();
  assert.equal(search.getAttribute('aria-label'),'Native backpack search');
  app.stop();
  assert.equal(search.getAttribute('aria-label'),'Native backpack search');
});

test('Backpack reacquires search naming when the host changes aria-label on the same node', t => {
  const {app,doc}=setup(t);
  const search=doc.querySelector('input.game-window__search');
  search.setAttribute('aria-label','Native backpack search');
  app.start();
  search.removeAttribute('aria-label');
  app.reconcile();
  assert.equal(search.getAttribute('aria-label'),'Busca');
  search.setAttribute('aria-label','Updated native search');
  app.reconcile();
  assert.equal(search.getAttribute('aria-label'),'Updated native search');
  app.stop();
  assert.equal(search.getAttribute('aria-label'),'Updated native search');
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
