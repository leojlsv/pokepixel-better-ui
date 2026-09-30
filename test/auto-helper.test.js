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
function setup(t, settingsOverride={}, apiOverride={}, fixture={}) {
  const check = label => `<label class="auto-helper-row"><input type="checkbox"><b>${label}</b></label>`;
  const picker = '<div class="auto-capsule-grid"><button>Original picker</button></div>';
  const qualities = '<div class="auto-sell-qualities"><label><input type="checkbox" value="common">Common</label><label><input type="checkbox" value="rare">Rare</label></div>';
  const rarity = '<div class="auto-helper-rarity-grid"><article><strong>Poké Ball</strong><label><input type="checkbox" value="weak">Weak</label><label><input type="checkbox" value="common">Common</label><label><input type="checkbox" value="uncommon">Uncommon</label><label><input type="checkbox" value="rare">Rare</label><label><input type="checkbox" value="epic">Epic</label><label><input type="checkbox" value="legendary">Legendary</label><label><input type="checkbox" value="mythical">Mythical</label></article></div>';
  const extract = fixture.extract === false ? '' : `<section class="auto-helper-section"><h3>Extract</h3>${check('Extract')}${qualities}</section>`;
  const dom=new JSDOM(`<div class="auto-helper-panel"><div class="pokeidle-panel__body"><div class="auto-helper-grid">
  <section class="auto-helper-section"><h3>Support</h3>${check('Potion')}<select><option value="40">40%</option></select>${picker}${check('Revive')}${picker}</section>
  <section class="auto-helper-section"><h3>Normal</h3>${check('Capture')}${picker}</section>
  <section class="auto-helper-section"><h3>Shiny</h3>${check('Shiny')}${picker}</section>
  <section class="auto-helper-section is-wide"><h3>Rarity</h3>${rarity}</section>
  <section class="auto-helper-section"><h3>Sell</h3>${check('Sell')}<time class="auto-sell-time">100</time>${qualities}</section>
  ${extract}
  <section class="auto-helper-section is-wide"><h3>Species</h3><input type="text"></section>
  </div><div class="auto-helper-save-state">Native autosave</div></div></div>`,{url:'https://test.local',pretendToBeVisual:true});
  const doc=dom.window.document,root=doc.body.firstChild;
  let nativeChanges=0;root.querySelectorAll('input,select,button').forEach(el=>el.addEventListener(el.tagName==='BUTTON'?'click':'change',()=>nativeChanges++));
  const settings={auto_potion:{hp_threshold:40},auto_capture:{capsule_by_quality:{common:'great-ball',rare:'ultra-ball'}},auto_sell:{qualities:[]},...(fixture.extract === false ? {} : {auto_extract:{qualities:[]}}),...settingsOverride};
  let inventory=[{item_id:'p',type:'potion',name:'Potion long name',qty:2},{item_id:'b',type:'capsule',name:'Poké Ball',qty:3,icon_index:164},{item_id:'great-ball',type:'capsule',name:'Great Ball',qty:2,icon_index:165},{item_id:'ultra-ball',type:'capsule',name:'Ultra Ball',qty:1,icon_index:166}];
  const handlers=new Map(), calls=[];
  doc.defaultView.PokeIdle={ t:key=>key, Localization:{get:()=> 'en'}, Bus:{on:(key,fn)=>handlers.set(key,fn),off:key=>handlers.delete(key)}, Api:{getHuntSettings:apiOverride.getHuntSettings || (async()=>settings),getInventory:apiOverride.getInventory || (async()=>inventory)} };
  const saver=createSettingsSaver(async payload=>{calls.push(payload);});
  const session={groups:{},saver};const original=root.innerHTML;
  const mounted=mountAutoHelper(root,session);
  t.after(()=>{mounted.cleanup();dom.window.close();});
  return {dom,doc,root,mounted,session,calls,original,handlers,nativeChanges:()=>nativeChanges,setInventory:value=>inventory=value};
}
test("Auto Helper rebinds its native inventory event to the replacement Bus", t => {
  const s=setup(t);
  assert.equal(s.handlers.has("inventory.updated"),true);
  const active = new Map();
  s.doc.defaultView.PokeIdle.Bus={
    on:(name,handler)=>active.set(name,handler),
    off:(name,handler)=>{if(active.get(name)===handler)active.delete(name);},
  };
  s.mounted.sync();
  assert.equal(s.handlers.has("inventory.updated"),false);
  assert.equal(active.has("inventory.updated"),true);
  s.mounted.cleanup();
  assert.equal(active.size,0);
});
test("failed initial Bus subscription restores native DOM and inert before a successful mount retry", async t => {
  const s=setup(t);await tick();s.mounted.cleanup();s.root.innerHTML=s.original;
  const previous=Object.getOwnPropertyDescriptor(globalThis,"document");
  Object.defineProperty(globalThis,"document",{value:s.doc,configurable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,"document",previous);else delete globalThis.document;});
  const handlers=new Map();let first=true;
  s.dom.window.PokeIdle.Bus={
    on(name,handler){if(first){first=false;throw new Error("transient native Bus");}handlers.set(name,handler);},
    off(name,handler){if(handlers.get(name)===handler)handlers.delete(name);},
  };
  const module=createAutoHelperModule(),grid=s.root.querySelector(".auto-helper-grid"),body=s.root.querySelector(".pokeidle-panel__body");
  const nativeSections=[...grid.children],originalInert=body.inert;
  assert.equal(module.shouldMount(),true);
  assert.throws(()=>module.mount(),/transient native Bus/);
  assert.equal(body.inert,originalInert,"failed mount must restore native input availability");
  assert.deepEqual([...grid.children],nativeSections,"native sections must return in their original order");
  assert.equal(s.root.querySelector(".ppbui-auto-group"),null);
  assert.equal(s.root.hasAttribute("data-ppbui-auto-helper"),false);
  assert.equal(handlers.size,0);
  assert.equal(module.shouldMount(),true,"a new attempt must discover the original native layout");
  const cleanup=module.mount();await tick();
  assert.equal(s.root.querySelectorAll(".ppbui-auto-group").length,3);
  s.root.remove();
  cleanup();
  assert.equal(body.inert,originalInert);
  assert.deepEqual([...grid.children],nativeSections);
  assert.equal(handlers.size,0);
});
test("a persistent Auto Helper saver writes through the currently hydrated native API", async t => {
  const s=setup(t);await tick();s.mounted.cleanup();s.root.innerHTML=s.original;
  const previous=Object.getOwnPropertyDescriptor(globalThis,"document");
  Object.defineProperty(globalThis,"document",{value:s.doc,configurable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,"document",previous);else delete globalThis.document;});
  const settings={auto_capture:{},auto_potion:{},auto_sell:{qualities:[]},auto_extract:{qualities:[]}};
  const writes=[];
  const originalPokeIdle=s.dom.window.PokeIdle;
  const withApi=name=>({
    ...originalPokeIdle,
    Api:{getHuntSettings:async()=>settings,getInventory:async()=>[],updateHuntSettings:async(...data)=>writes.push({name,data})},
  });
  s.dom.window.PokeIdle=withApi("old");
  const module=createAutoHelperModule();assert.equal(module.shouldMount(),true);
  const firstCleanup=module.mount();await tick();
  s.root.remove();firstCleanup();
  s.root.innerHTML=s.original;s.doc.body.append(s.root);
  s.dom.window.PokeIdle=withApi("new");
  assert.equal(module.shouldMount(),true);
  const nextCleanup=module.mount();await tick();
  s.root.querySelector(".ppbui-auto-group input[type=checkbox]").click();
  await tick();await tick();
  assert.deepEqual(writes.map(write=>write.name),["new"]);
  s.root.remove();nextCleanup();
});
test("a native API swap during settings read prevents stale writes and keeps Retry available", async t => {
  const s=setup(t);await tick();s.mounted.cleanup();s.root.innerHTML=s.original;
  const previous=Object.getOwnPropertyDescriptor(globalThis,"document");
  Object.defineProperty(globalThis,"document",{value:s.doc,configurable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,"document",previous);else delete globalThis.document;});
  const settings={auto_capture:{},auto_potion:{},auto_sell:{qualities:[]}};
  const writes=[];
  const initialApi={getHuntSettings:async()=>settings,getInventory:async()=>[],updateHuntSettings:async()=>writes.push("old")};
  const previousPokeIdle=s.dom.window.PokeIdle;
  s.dom.window.PokeIdle={...previousPokeIdle,Api:initialApi};
  const module=createAutoHelperModule();assert.equal(module.shouldMount(),true);
  const cleanup=module.mount();await tick();
  const pendingRead=deferred();initialApi.getHuntSettings=()=>pendingRead.promise;
  s.root.querySelector(".ppbui-auto-group input[type=checkbox]").click();
  s.dom.window.PokeIdle={...previousPokeIdle,Api:{getHuntSettings:async()=>settings,getInventory:async()=>[],updateHuntSettings:async()=>writes.push("new")}};
  pendingRead.resolve(settings);await tick();
  assert.deepEqual(writes,[],"settings read from a retired API cannot be committed");
  assert.equal(s.root.querySelector(".ppbui-auto-save").dataset.state,"error");
  s.root.querySelector(".ppbui-auto-save button").click();await tick();
  assert.deepEqual(writes,["new"],"Retry must send the preserved draft through the current API");
  s.root.remove();cleanup();
});
test("slow initialization never exposes native pickers or destination grids", async t => {
  const settingsPending=deferred(), inventoryPending=deferred();
  const s=setup(t,{}, {getHuntSettings:()=>settingsPending.promise,getInventory:()=>inventoryPending.promise});
  assert.equal(s.root.querySelector('.ppbui-auto-save')?.textContent.includes('Loading interface'),true);
  assert.ok([...s.root.querySelectorAll('.auto-capsule-grid,.auto-sell-qualities')].every(node=>node.hidden));
  settingsPending.resolve({auto_potion:{hp_threshold:40},auto_capture:{},auto_sell:{qualities:[]},auto_extract:{qualities:[]}});
  inventoryPending.resolve([]);await tick();
  assert.equal(s.root.querySelectorAll('.ppbui-auto-picker').length,4);
  assert.equal(s.root.querySelector('.ppbui-auto-destinations')!==null,true);
  assert.equal(s.root.querySelector('.ppbui-auto-ball-matrix')!==null,true);
});
test("native controls remain intact while destination choices serialize exclusive native values",async t=>{
  const s=setup(t);await tick();
  assert.equal(s.root.querySelectorAll('.ppbui-auto-group').length,3);
  const captureGroup=s.root.querySelector('[data-ppbui-auto-group="capture"]');
  assert.equal(captureGroup.querySelector('.auto-helper-rarity-grid')!==null,true);
  assert.equal(captureGroup.querySelector('.auto-helper-rarity-grid').hidden,true);
  assert.equal(captureGroup.querySelector('.ppbui-auto-ball-matrix')!==null,true);
  const input=s.root.querySelector('input[type=checkbox]');input.click();await s.session.saver.flush();
  assert.equal(s.nativeChanges(),0);assert.equal(s.calls.at(-1)[1].enabled,true);
  assert.equal(s.calls.at(-1)[0].capsule_by_quality,undefined);
  const destination=s.root.querySelector('.ppbui-auto-destinations tbody tr');
  destination.querySelector('[value=sell]').click();await s.session.saver.flush();
  assert.deepEqual(s.calls.at(-1)[3].qualities,['common']);assert.deepEqual(s.calls.at(-1)[4].qualities,[]);
  destination.querySelector('[value=extract]').click();await s.session.saver.flush();
  assert.deepEqual(s.calls.at(-1)[3].qualities,[]);assert.deepEqual(s.calls.at(-1)[4].qualities,['common']);
});
test("current native layout without Auto Extract keeps rarity and Sell sections distinct",async t=>{
  const s=setup(t,{}, {}, {extract:false});await tick();
  const capture=s.root.querySelector('[data-ppbui-auto-group="capture"]');
  const destination=s.root.querySelector('[data-ppbui-auto-group="destination"]');
  assert.equal(capture.querySelector('.auto-helper-rarity-grid')!==null,true);
  assert.equal(capture.querySelector('.auto-helper-rarity-grid').hidden,true);
  assert.equal(capture.querySelector('.ppbui-auto-ball-matrix')!==null,true);
  assert.equal(destination.querySelector('.auto-sell-time')!==null,true);
  assert.equal(destination.querySelector('.auto-helper-rarity-grid'),null);
  assert.equal(destination.querySelectorAll('.ppbui-auto-destination-controls input[type=checkbox]').length,1);
  assert.equal(s.root.querySelector('.ppbui-auto-destinations [value=extract]'),null);
  const potion=s.root.querySelector('input[type=checkbox]');potion.click();await s.session.saver.flush();
  assert.equal(s.calls.at(-1)[0].capsule_by_quality,undefined);
  assert.equal(s.calls.at(-1)[4],undefined);
});

test("production module merges the latest native capture settings before every Better UI save",async t=>{
  const s=setup(t);await tick();s.mounted.cleanup();s.root.innerHTML=s.original;
  const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
  Object.defineProperty(globalThis,'document',{value:s.doc,configurable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;});
  let latest={
    auto_capture:{capsule_by_quality:{common:'great-ball'},future_native_flag:'keep-me'},
    auto_potion:{future_potion_flag:'keep-potion'},
    auto_sell:{future_sell_flag:'keep-sell',qualities:[]},
    auto_extract:{future_extract_flag:'keep-extract',qualities:[]},
  };
  const writes=[];
  s.doc.defaultView.PokeIdle.Api.getHuntSettings=async()=>structuredClone(latest);
  s.doc.defaultView.PokeIdle.Api.updateHuntSettings=async(...payload)=>{writes.push(structuredClone(payload));};
  const module=createAutoHelperModule();assert.equal(module.shouldMount(),true);const cleanup=module.mount();await tick();
  latest.auto_capture.capsule_by_quality={epic:'ultra-ball'};
  latest.auto_capture.future_native_flag='changed-after-mount';
  const potion=s.root.querySelector('input[type=checkbox]');potion.click();
  await new Promise(resolve=>setTimeout(resolve,0));
  while(!writes.length) await new Promise(resolve=>setTimeout(resolve,5));
  assert.deepEqual(writes.at(-1)[0].capsule_by_quality,{epic:'ultra-ball'});
  assert.equal(writes.at(-1)[0].future_native_flag,'changed-after-mount');
  assert.equal(writes.at(-1)[1].future_potion_flag,'keep-potion');
  assert.equal(writes.at(-1)[3].future_sell_flag,'keep-sell');
  assert.equal(writes.at(-1)[4].future_extract_flag,'keep-extract');
  s.root.remove();
  cleanup();
});
test("item selection preserves focus and resource refresh reports missing stock without changing settings",async t=>{
  const s=setup(t);await tick();
  const select=s.root.querySelector('[data-ppbui-picker="2"]');assert.ok(select.classList.contains("ppbui-select"));select.focus();select.value="b";select.dispatchEvent(new s.dom.window.Event("change",{bubbles:true}));await s.session.saver.flush();
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
  assert.equal(s.root.querySelectorAll('.auto-helper-grid > section').length,7);
  assert.equal(s.root.querySelector('.ppbui-auto-group'),null);
});

test("locked destinations and expiry stay disabled without mutations or settings writes", async t => {
  const s=setup(t);await tick();
  const css=s.root.querySelector('[data-ppbui-module="auto-helper"]').textContent;assert.match(css,/\.ppbui-auto-destination-choice:has\(input:disabled\) \{ cursor:default; color:var\(--ppbui-text-subtle\); opacity:1; \}/);
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

test("stale module cleanup cannot reopen Auto Helper over a newer mount on the same native panel", async t => {
  const s=setup(t);await tick();s.mounted.cleanup();
  const previous=Object.getOwnPropertyDescriptor(globalThis,'document'), pending=deferred();let opens=0;
  Object.defineProperty(globalThis,'document',{value:s.doc,configurable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;});
  s.dom.window.PokeIdle.Api.updateHuntSettings=()=>pending.promise;
  s.dom.window.PokeIdle.AutoHelper={open(){opens++;}};
  const module=createAutoHelperModule();assert.equal(module.shouldMount(),true);
  const cleanupFirst=module.mount();await tick();
  const names=s.root.querySelector('input[type=text]');names.value='eevee';names.dispatchEvent(new s.dom.window.Event('input',{bubbles:true}));
  cleanupFirst();
  assert.equal(module.shouldMount(),true,"the same native panel remains eligible for a fresh mount");
  const cleanupSecond=module.mount();await tick();
  pending.resolve();await tick();await tick();
  assert.equal(opens,0,"the first cleanup must not reopen the native editor after a newer mount owns the panel");
  s.root.remove();cleanupSecond();
});

test("module cleanup tolerates a replaced PokeIdle without the native AutoHelper opener", async t => {
  const s=setup(t);await tick();s.mounted.cleanup();s.root.innerHTML=s.original;
  const previous=Object.getOwnPropertyDescriptor(globalThis,"document");
  Object.defineProperty(globalThis,"document",{value:s.doc,configurable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,"document",previous);else delete globalThis.document;});
  const module=createAutoHelperModule();assert.equal(module.shouldMount(),true);
  const cleanup=module.mount();await tick();
  cleanup();
  s.doc.defaultView.PokeIdle={...s.doc.defaultView.PokeIdle,AutoHelper:undefined};
  await tick();
  assert.equal(s.root.querySelector(".ppbui-auto-group"),null,"native controls remain restored after the detached flush resolves");
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

test("Poké Ball by rarity uses a Destination-like exclusive matrix and preserves normal fallback",async t=>{
  const s=setup(t,{auto_capture:{capsule_by_quality:{common:'great-ball',rare:'ultra-ball',future:'keep-me'}}});await tick();
  const matrix=s.root.querySelector('.ppbui-auto-ball-matrix');assert.ok(matrix);
  const rows=[...matrix.querySelectorAll('tbody tr')];assert.equal(rows.length,7);
  const common=matrix.querySelector('[data-ppbui-ball-quality="common"]');
  const rare=matrix.querySelector('[data-ppbui-ball-quality="rare"]');
  assert.equal(common.querySelectorAll('input:checked').length,1);
  assert.equal(common.querySelector('[value="great-ball"]').checked,true);
  assert.equal(rare.querySelector('[value="ultra-ball"]').checked,true);
  assert.equal(matrix.querySelectorAll('thead [data-ppbui-ball-id]').length,4,"future/missing assignments stay represented instead of being dropped");
  common.querySelector('[value="ultra-ball"]').click();await s.session.saver.flush();
  assert.equal(s.nativeChanges(),0,"Better UI matrix must not click hidden native rarity controls");
  assert.equal(s.calls.at(-1)[0].capsule_by_quality.common,'ultra-ball');
  assert.equal(s.calls.at(-1)[0].capsule_by_quality.future,'keep-me',"unknown future rarity assignments are preserved");
  common.querySelector('[value=""]').click();await s.session.saver.flush();
  assert.equal('common' in s.calls.at(-1)[0].capsule_by_quality,false,"Normal fallback clears only that rarity assignment");
  assert.equal(s.calls.at(-1)[0].capsule_by_quality.rare,'ultra-ball');
});

test("Poké Ball matrix keeps a depleted selected ball visible without mutating settings during inventory refresh",async t=>{
  const s=setup(t);await tick();const writes=s.calls.length;
  s.setInventory([{item_id:'p',type:'potion',name:'Potion long name',qty:2},{item_id:'b',type:'capsule',name:'Poké Ball',qty:3,icon_index:164}]);
  s.handlers.get('inventory.updated')();await tick();
  const common=s.root.querySelector('[data-ppbui-ball-quality="common"]');
  const missing=common.querySelector('[value="great-ball"]');assert.ok(missing);assert.equal(missing.checked,true);assert.equal(missing.disabled,true);
  assert.equal(s.calls.length,writes);
});

test("Miyazaki migration owns only Auto Helper shell/body primitives and releases them on cleanup",async t=>{
  const s=setup(t);await tick();
  const body=s.root.querySelector('.pokeidle-panel__body');
  assert.equal(s.root.classList.contains('ppbui-window'),true);
  assert.equal(body.classList.contains('ppbui-root'),true);
  assert.equal(body.classList.contains('ppbui-scroll'),true);
  assert.equal(body.classList.contains('ppbui-scroll-scope'),true);
  const buttons=[...s.root.querySelectorAll('.ppbui-auto-save button')];
  assert.equal(buttons.length,2);
  assert.ok(buttons.every(button=>button.classList.contains('ppbui-button')));
  assert.equal(buttons[0].classList.contains('ppbui-button--primary'),true);
  assert.equal(buttons[0].hidden,true);
  const css=s.root.querySelector('[data-ppbui-module="auto-helper"]').textContent;
  assert.match(css,/\.ppbui-auto-save button\[hidden\] \{ display:none!important; \}/);
  assert.match(css,/\.auto-helper-panel\[data-ppbui-auto-helper\]\.ppbui-window > \.pokeidle-panel__titlebar/);
  assert.match(css,/\.auto-helper-panel\[data-ppbui-auto-helper\] \.auto-helper-row input\[type="text"\]/);
  assert.match(css,/@container \(max-width:760px\)/);
  assert.match(css,/@container \(max-width:560px\)/);
  const capture=s.root.querySelector('[data-ppbui-auto-group="capture"]');
  assert.ok(capture);
  assert.equal(capture.querySelectorAll(':scope > .ppbui-auto-group-body > .auto-helper-section').length,4);
  assert.equal(capture.querySelector('.ppbui-auto-capture-shiny')!==null,true);
  const nativeRarity=capture.querySelector('.auto-helper-rarity-grid');
  assert.ok(nativeRarity);assert.equal(nativeRarity.hidden,true);
  assert.equal(capture.querySelector('.ppbui-auto-ball-matrix')!==null,true);
  assert.match(css,/\.ppbui-auto-capture-shiny > h3 \{[^}]*font-variant-caps:small-caps;[^}]*letter-spacing:\.12em;[^}]*text-transform:uppercase;/);
  assert.match(css,/\.ppbui-auto-ball-matrix \{[^}]*min-width:680px;[^}]*table-layout:fixed;/);
  assert.match(css,/\.ppbui-auto-ball-choice:has\(input:checked\) \{[^}]*border-color:var\(--ppbui-selected\);/);
  assert.match(css,/\.ppbui-auto-destinations th,\.ppbui-auto-destinations td \{[^}]*border:0;/);
  assert.match(css,/\.ppbui-auto-destinations thead th \{[^}]*border-bottom:var\(--ppbui-separator-width\) solid var\(--ppbui-border-strong\);/);
  assert.doesNotMatch(css,/\.ppbui-auto-destinations th,\.ppbui-auto-destinations td \{[^}]*border-right:/);
  s.mounted.cleanup();
  assert.equal(s.root.classList.contains('ppbui-window'),false);
  assert.equal(body.classList.contains('ppbui-root'),false);
  assert.equal(body.classList.contains('ppbui-scroll'),false);
  assert.equal(body.classList.contains('ppbui-scroll-scope'),false);
  assert.equal(s.root.hasAttribute('data-ppbui-auto-helper'),false);
  assert.equal(nativeRarity.hidden,false,"cleanup restores the original native rarity grid exactly");
  assert.equal(s.root.querySelector('.ppbui-auto-ball-matrix'),null);
});

test("Miyazaki cleanup preserves PPBUI classes that pre-existed this mount",async t=>{
  const s=setup(t);await tick();
  s.mounted.cleanup();
  const body=s.root.querySelector('.pokeidle-panel__body');
  s.root.classList.add('ppbui-window');
  body.classList.add('ppbui-root','ppbui-scroll','ppbui-scroll-scope');
  const remount=mountAutoHelper(s.root,s.session);await tick();
  remount.cleanup();
  assert.equal(s.root.classList.contains('ppbui-window'),true);
  assert.equal(body.classList.contains('ppbui-root'),true);
  assert.equal(body.classList.contains('ppbui-scroll'),true);
  assert.equal(body.classList.contains('ppbui-scroll-scope'),true);
});
