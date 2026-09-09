import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createAutoHelperModule } from "../src/modules/auto-helper/index.js";
import { createSettingsSaver } from "../src/modules/auto-helper/saver.js";
import { mountAutoHelper } from "../src/modules/auto-helper/controller.js";
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const deferred = () => { let resolve, reject; const promise = new Promise((yes,no)=>{resolve=yes;reject=no;}); return {promise,resolve,reject}; };

test("saver serializes requests, sends latest draft and never reports an older response as saved", async () => {
  const calls=[], pending=[];
  const saver=createSettingsSaver(payload=>{calls.push(payload);const d=deferred();pending.push(d);return d.promise;});
  saver.change([1],true); saver.change([2],true); saver.change([3],true);
  assert.deepEqual(calls,[[1]]); pending[0].resolve(); await tick();
  assert.deepEqual(calls,[[1],[3]]); assert.equal(saver.state().phase,"saving");
  pending[1].resolve(); await saver.flush(); assert.equal(saver.state().phase,"saved");
});
test("flush saves debounced edits and failure preserves draft for explicit retry", async () => {
  let fail=true,calls=0;
  const saver=createSettingsSaver(async()=>{calls++;if(fail)throw new Error("offline");});
  saver.change(["names"]); await saver.flush(); assert.equal(calls,1);
  assert.equal(saver.state().phase,"error");assert.deepEqual(saver.state().draft,["names"]);
  fail=false;await saver.flush();assert.equal(calls,2);assert.equal(saver.state().pending,false);
});
function setup(t, settingsOverride={}) {
  const check = label => `<label class="auto-helper-row"><input type="checkbox"><b>${label}</b></label>`;
  const picker = '<div class="auto-capsule-grid"><button>Original picker</button></div>';
  const qualities = '<div class="auto-sell-qualities"><label><input type="checkbox" value="common">Common</label><label><input type="checkbox" value="rare">Rare</label></div>';
  const dom=new JSDOM(`<div class="auto-helper-panel"><div class="pokeidle-panel__body"><div class="auto-helper-grid">
  <section class="auto-helper-section"><h3>Support</h3>${check('Potion')}<select><option value="40">40%</option></select>${picker}${check('Revive')}${picker}</section>
  <section class="auto-helper-section"><h3>Normal</h3>${check('Capture')}${picker}</section>
  <section class="auto-helper-section"><h3>Shiny</h3>${check('Shiny')}${picker}</section>
  <section class="auto-helper-section"><h3>Sell</h3>${check('Sell')}<time class="auto-sell-time">100</time>${qualities}</section>
  <section class="auto-helper-section"><h3>Extract</h3>${check('Extract')}${qualities}</section>
  <section class="auto-helper-section is-wide"><h3>Species</h3><input type="text"></section>
  </div><div class="auto-helper-save-state">Native autosave</div></div></div>`,{url:'https://test.local',pretendToBeVisual:true});
  const doc=dom.window.document,root=doc.body.firstChild;
  let nativeChanges=0;root.querySelectorAll('input,select,button').forEach(el=>el.addEventListener(el.tagName==='BUTTON'?'click':'change',()=>nativeChanges++));
  const settings={auto_potion:{hp_threshold:40},auto_capture:{},auto_sell:{qualities:[]},auto_extract:{qualities:[]},...settingsOverride};
  let inventory=[{item_id:'p',type:'potion',name:'Potion long name',qty:2},{item_id:'b',type:'capsule',name:'Ball',qty:3}];
  const handlers=new Map(), calls=[];
  doc.defaultView.PokeIdle={ t:key=>key, Localization:{get:()=> 'en'}, Bus:{on:(key,fn)=>handlers.set(key,fn),off:key=>handlers.delete(key)}, Api:{getHuntSettings:async()=>settings,getInventory:async()=>inventory} };
  const saver=createSettingsSaver(async payload=>{calls.push(payload);});
  const session={groups:{},saver};const original=root.innerHTML;
  const mounted=mountAutoHelper(root,session);
  t.after(()=>{mounted.cleanup();dom.window.close();});
  return {dom,doc,root,mounted,session,calls,original,handlers,nativeChanges:()=>nativeChanges,setInventory:value=>inventory=value};
}
test("native controls remain intact while destination choices serialize exclusive native values",async t=>{
  const s=setup(t);await tick();
  assert.equal(s.root.querySelectorAll('.ppbui-auto-group').length,3);
  const input=s.root.querySelector('input[type=checkbox]');input.click();await s.session.saver.flush();
  assert.equal(s.nativeChanges(),0);assert.equal(s.calls.at(-1)[1].enabled,true);
  const destination=s.root.querySelector('.ppbui-auto-destinations tbody tr');
  destination.querySelector('[value=sell]').click();await s.session.saver.flush();
  assert.deepEqual(s.calls.at(-1)[3].qualities,['common']);assert.deepEqual(s.calls.at(-1)[4].qualities,[]);
  destination.querySelector('[value=extract]').click();await s.session.saver.flush();
  assert.deepEqual(s.calls.at(-1)[3].qualities,[]);assert.deepEqual(s.calls.at(-1)[4].qualities,['common']);
});
test("item selection preserves focus and resource refresh reports missing stock without changing settings",async t=>{
  const s=setup(t);await tick();
  const select=s.root.querySelector('[data-ppbui-picker="2"]');select.focus();select.value="b";select.dispatchEvent(new s.dom.window.Event("change",{bubbles:true}));await s.session.saver.flush();
  assert.equal(s.doc.activeElement,select);assert.equal(select.value,"b");
  const capture=s.root.querySelectorAll('input[type=checkbox]')[2];capture.click();await s.session.saver.flush();const count=s.calls.length;
  s.setInventory([]);s.handlers.get('inventory.updated')();await tick();
  assert.equal(s.calls.length,count);assert.match(s.root.textContent,/No compatible resource/);
});
test("idle reconciliation is mutation-free and cleanup flushes text edits",async t=>{
  const s=setup(t);await tick();
  const observer=new s.dom.window.MutationObserver(()=>{});observer.observe(s.root,{subtree:true,attributes:true,childList:true,characterData:true});
  for(let i=0;i<10;i++)s.mounted.sync();assert.equal(observer.takeRecords().length,0);observer.disconnect();
  const names=s.root.querySelector('input[type=text]');names.value='Pikachu, Eevee';names.dispatchEvent(new s.dom.window.Event('input',{bubbles:true}));
  s.mounted.cleanup();await s.session.saver.flush();assert.deepEqual(s.calls.at(-1)[0].species_filter,['pikachu','eevee']);
  assert.equal(s.root.querySelectorAll('.auto-helper-grid > section').length,6);
  assert.equal(s.root.querySelector('.ppbui-auto-group'),null);
});

test("locked destinations and expiry stay disabled without mutations or settings writes", async t => {
  const s=setup(t);await tick();
  const sections=s.root.querySelectorAll('.ppbui-auto-group-body > section');
  const shiny=sections[2].querySelector('input');
  const [sell,extract]=s.root.querySelectorAll('.ppbui-auto-destination-controls input');
  shiny.disabled=true; sell.disabled=true;extract.disabled=true;
  s.mounted.sync();assert.match(s.root.textContent,/Unavailable/);assert.equal(s.calls.length,0);
  assert.ok([...s.root.querySelectorAll(".ppbui-auto-destinations input")].every(select=>select.disabled));
  const observer=new s.dom.window.MutationObserver(()=>{});observer.observe(s.root,{subtree:true,attributes:true,childList:true});
  for(let i=0;i<5;i++)s.mounted.sync();assert.equal(observer.takeRecords().length,0);observer.disconnect();
});

test("pending names survive a native panel reconstruction while the request finishes", async t => {
  const s=setup(t);await tick(); const pending=deferred();
  const session={groups:{},saver:createSettingsSaver(()=>pending.promise)};
  s.mounted.cleanup();s.root.innerHTML=s.original;
  const first=mountAutoHelper(s.root,session);await tick();
  const names=s.root.querySelector('input[type=text]');names.value='eevee';names.dispatchEvent(new s.dom.window.Event('input',{bubbles:true}));
  first.cleanup();s.root.innerHTML=s.original;
  const second=mountAutoHelper(s.root,session);await tick();
  assert.equal(s.root.querySelector('input[type=text]').value,'eevee');
  pending.resolve();await session.saver.flush();assert.equal(session.saver.state().phase,'saved');
  second.cleanup();
});

test("module reconciles its own rearranged DOM without remounting and unmounts on native close", async t => {
  const s=setup(t);await tick();s.mounted.cleanup();s.root.innerHTML=s.original;
  const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
  Object.defineProperty(globalThis,'document',{value:s.doc,configurable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;});
  const module=createAutoHelperModule();assert.equal(module.shouldMount(),true);const key=module.getMountKey();
  const cleanup=module.mount();await tick();
  for(let i=0;i<5;i++){assert.equal(module.shouldMount(),true);assert.equal(module.getMountKey(),key);module.reconcile();}
  assert.equal(s.root.querySelectorAll('.ppbui-auto-save').length,1);
  s.root.remove();assert.equal(module.shouldMount(),false);cleanup();
});

test("paused destinations explain disabled master toggles without changing assignments",async t=>{
  const s=setup(t);await tick();
  const select=s.root.querySelector('.ppbui-auto-destinations [value=extract]');
  select.click();await s.session.saver.flush();
  assert.equal(select.getAttribute('aria-label'),'Common: Extract — paused');
  assert.equal(s.calls.at(-1)[4].enabled,false);assert.deepEqual(s.calls.at(-1)[4].qualities,['common']);
  const extract=s.root.querySelectorAll('.ppbui-auto-destination-controls input')[1];extract.click();await s.session.saver.flush();
  assert.equal(select.getAttribute('aria-label'),'Common: Extract');assert.deepEqual(s.calls.at(-1)[4].qualities,['common']);
  assert.equal(s.root.querySelectorAll('.ppbui-auto-support-resource').length,2);
});

 test("destination matrix uses rarity tokens and one selected native radio per row",async t=>{
  const s=setup(t);await tick();
  const rows=[...s.root.querySelectorAll('.ppbui-auto-destinations tbody tr')];
  assert.equal(rows.length,2);
  for(const row of rows) {
    assert.equal(row.querySelectorAll('input:checked').length,1);
    const sell=row.querySelector('[value=sell]');sell.click();await s.session.saver.flush();
    assert.equal(row.querySelectorAll('input:checked').length,1);
    row.querySelector('[value=keep]').click();await s.session.saver.flush();
    assert.equal(row.querySelector('[value=keep]').checked,true);
  }
  assert.deepEqual(s.calls.at(-1)[3].qualities,[]);
  assert.equal(rows[0].querySelector('th').style.color,'var(--quality-common)');
  assert.equal(rows[1].querySelector('th').style.color,'var(--quality-rare)');
  assert.equal(s.root.querySelector('.ppbui-auto-destinations select'),null);
});
