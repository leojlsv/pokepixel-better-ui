import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {JSDOM} from "jsdom";
import {createWalletModule} from "../src/modules/wallet/index.js";
import {createMenuBarModule} from "../src/modules/menu-bar/index.js";
import {defaultLayout,validateLayout} from "../src/modules/menu-bar/layout-model.js";
import {createCardModeModule} from "../src/modules/card-mode/index.js";
import {createModuleControls} from "../src/modules/module-controls/index.js";
import {createInventoryModule} from "../src/modules/inventory/index.js";
import {createBetterUI} from "../src/core/bootstrap.js";
import {createModulePreferences} from "../src/core/preferences.js";
import {createWalletPreferences} from "../src/modules/wallet/preferences.js";

const fixture=readFileSync(new URL("./fixtures/menu-bar.html",import.meta.url),"utf8");
const menuKey="ppbui:menu-layout:v1:A",walletKey="ppbui:wallet-locations:v1:A";
const backpack='<div class="inventory-window--slots"><div class="pokeidle-panel__body"><div class="inventory-category-tabs"><button data-category="all" class="inventory-category-tab is-active">All</button></div><div class="inventory-slots-toolbar"><input type="search" class="game-window__search"></div><div class="inventory-slot-grid"><div class="inventory-slot is-empty"></div></div></div></div>';
function setup(t,{storage}={}) {
  const dom=new JSDOM(fixture+backpack,{pretendToBeVisual:true,url:"https://fixture.invalid"});
  const win=dom.window,doc=win.document,previous=new Map();
  for(const name of ["document","MutationObserver","requestAnimationFrame","cancelAnimationFrame"]){previous.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,value:typeof win[name]==="function"&&name!=="MutationObserver"?win[name].bind(win):win[name]});}
  let owner="A",presence="A",otherReconciles=0;
  const handlers=new Map(),bus={on(name,fn){if(!handlers.has(name))handlers.set(name,new Set());handlers.get(name).add(fn);},off(name,fn){handlers.get(name)?.delete(fn);},emit(name,payload){for(const fn of [...(handlers.get(name)||[])])fn(payload);}};
  const team=doc.createElement("div");team.className="pokeidle-team-hud";team.dataset.ppbuiTeamHudEnhanced="";
  team.innerHTML='<div class="pokeidle-trainer-hud__header"><div class="pokeidle-trainer-hud__info">Trainer A</div></div><div class="pokeidle-team-hud__list"></div>';
  const nativeWallet=doc.createElement("div");nativeWallet.className="pokeidle-team-hud__wallet";nativeWallet.innerHTML='<span>$ 1,250</span><span class="pokeidle-currency"><i class="rmmz-icon pokeidle-currency__icon">◆</i><strong>50</strong></span>';doc.body.append(team,nativeWallet);
  const hud={el:team,_walletEl:nativeWallet,_walletDiamondItem:nativeWallet.lastElementChild,_trainer:{id:"A",gold:1250,diamonds:50}};
  win.PokeIdle={Auth:{isAuthenticated:()=>Boolean(owner),getTrainerSummary:()=>owner?{id:owner,name:`Trainer ${owner}`}:null},WorldPresence:{getSelfTrainerId:()=>presence},Localization:{get:()=>"en-US"},PersistentHud:{_teamHud:hud},Bus:bus,
    Currency:{element(value){const node=doc.createElement("span");node.className="pokeidle-currency";node.textContent=`$ ${Number(value).toLocaleString("en-US")}`;return node;}}};
  const menu=createMenuBarModule({doc}),wallet=createWalletModule({doc,storage}),prefs=createModulePreferences({defaults:{"menu-bar":true},storage:()=>win.localStorage,events:win});
  const controls=createModuleControls({menuBar:menu,wallet,preferences:prefs,modules:[{id:"menu-bar",name:()=>"Menu bar",description:()=>"Menu"}]});
  const app=createBetterUI({modules:[menu,createCardModeModule({menuBar:menu}),wallet,createInventoryModule(undefined,wallet),controls,{id:"unrelated",shouldMount:()=>true,mount:()=>()=>{},reconcile:()=>otherReconciles++}],preferences:prefs});
  app.start();
  t.after(()=>{app.stop();win.close();for(const[name,d]of previous)if(d)Object.defineProperty(globalThis,name,d);else delete globalThis[name];});
  const toggle=(place,enabled)=>wallet.toggleLocation(place,enabled,{owner:wallet.getSnapshot().owner});
  const save=layout=>{const snap=menu.getLayoutSnapshot();return menu.saveLayout(layout,{owner:snap.owner,token:snap.token});};
  const setOwner=(next,{newHud=true,payload}={})=>{
    owner=presence=next;
    if(newHud){const nextHud={...win.PokeIdle.PersistentHud._teamHud,_trainer:{id:next,gold:8,diamonds:2}};win.PokeIdle.PersistentHud._teamHud=nextHud;}
    bus.emit(next?"auth.loggedIn":"auth.loggedOut",payload);app.reconcile();
  };
  return {win,doc,app,menu,wallet,prefs,hud,nativeWallet,team,toggle,save,setOwner,bus,otherReconciles:()=>otherReconciles};
}
const values=s=>s.doc.querySelector("[data-ppbui-wallet-values]").textContent;
const wait=win=>new Promise(resolve=>win.setTimeout(resolve,60));

test("Wallet preserves Backpack-only default and retires 0.2.184 menu shortcuts without damaging saved layouts",t=>{
  const s=setup(t);
  assert.deepEqual(s.wallet.getSnapshot().locations,{backpack:true,trainer:false});
  assert.ok(s.nativeWallet.closest("[data-ppbui-inventory-tools]"));
  assert.equal(s.doc.querySelector("[data-ppbui-wallet-trainer]"),null);
  assert.equal(s.win.localStorage.getItem(menuKey),null);assert.equal(s.win.localStorage.getItem(walletKey),null);
  const layout=defaultLayout();assert.deepEqual(validateLayout(layout).layout,layout);
  const legacy=structuredClone(layout);legacy.bar.splice(1,0,"wallet:menu");legacy.groups["group:shop"].push("wallet:shop");
  const migrated=validateLayout(legacy);assert.equal(migrated.ok,true);assert.equal(JSON.stringify(migrated.layout).includes("wallet:"),false);
});

test("Backpack and Trainer coexist; Trainer stays inside info column and uses the native diamond icon",t=>{
  const s=setup(t);assert.equal(s.toggle("trainer",true).ok,true);s.app.reconcile();
  assert.equal(s.doc.querySelectorAll(".pokeidle-team-hud__wallet").length,1);
  assert.ok(s.nativeWallet.closest(".inventory-window--slots"));
  const trainer=s.doc.querySelector("[data-ppbui-wallet-trainer]");assert.ok(trainer);
  assert.equal(trainer.parentElement,s.team.querySelector(".pokeidle-trainer-hud__info"));
  assert.ok(trainer.querySelector(".ppbui-wallet-diamond-icon"));
  trainer.click();assert.equal(s.doc.querySelector("[data-ppbui-wallet-panel]").hidden,false);
  assert.match(values(s),/1,250/);assert.match(values(s),/50/);
  assert.ok(s.doc.querySelector('[data-ppbui-wallet-balance="diamonds"] .ppbui-wallet-diamond-icon'));
});

test("all-off remains recoverable and Backpack/Trainer choices persist across A/B/A and restart",t=>{
  const s=setup(t);s.toggle("trainer",true);s.toggle("backpack",false);
  const chosen=s.wallet.getSnapshot().locations;
  s.setOwner("B");assert.deepEqual(s.wallet.getSnapshot().locations,{backpack:true,trainer:false});
  s.setOwner("A");assert.deepEqual(s.wallet.getSnapshot().locations,chosen);
  s.app.stop();s.app.start();assert.deepEqual(s.wallet.getSnapshot().locations,chosen);
  for(const place of ["backpack","trainer"])assert.equal(s.toggle(place,false).ok,true);
  assert.equal(s.doc.querySelector("[data-ppbui-wallet-trainer]"),null);
  assert.ok(s.doc.querySelector(".ppbui-wallet-settings"));
  assert.equal(s.toggle("backpack",true).ok,true);assert.ok(s.nativeWallet.closest(".inventory-window--slots"));
});

test("native wallet-only updates refresh projections through the local HUD scope without global discovery",async t=>{
  const s=setup(t);s.toggle("trainer",true);s.doc.querySelector("[data-ppbui-wallet-trainer]").click();await wait(s.win);
  const before=s.otherReconciles();
  s.hud._trainer.gold=98765;s.hud._trainer.diamonds=0;s.nativeWallet.firstElementChild.textContent="$ 98,765";
  await wait(s.win);
  assert.match(values(s),/98,765/);assert.match(s.doc.querySelector("[data-ppbui-wallet-trainer]").textContent,/98,765/);
  assert.equal(s.otherReconciles(),before,"updating balances never wakes unrelated global modules");
  const probe=new s.win.MutationObserver(()=>{});probe.observe(s.doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden","disabled","aria-hidden","aria-disabled"]});
  for(let i=0;i<5;i++)s.app.reconcile();assert.equal(probe.takeRecords().length,0);probe.disconnect();
});

test("owner transition rejects old HUD balances, partial same-HUD owner merges, and stale setting writes",t=>{
  const s=setup(t);s.toggle("trainer",true);s.doc.querySelector("[data-ppbui-wallet-trainer]").click();
  s.setOwner("B",{newHud:false});
  assert.equal(s.doc.querySelector("[data-ppbui-wallet-panel]").hidden,true);assert.doesNotMatch(values(s),/1,250/);
  assert.equal(s.wallet.toggleLocation("trainer",true,{owner:"A"}).error,"owner-changed");
  s.hud._trainer={...s.hud._trainer,id:"B"};s.bus.emit("auth.trainerUpdated",{id:"B"});s.app.reconcile();
  assert.doesNotMatch(values(s),/1,250/);assert.equal(s.wallet.isBackpackEnabled(),false);
  s.bus.emit("auth.trainerUpdated",{id:"B",gold:30,diamonds:4});s.app.reconcile();
  assert.equal(s.wallet.isBackpackEnabled(),false,"an event ahead of the native authority cannot release stale merged balances");
  s.hud._trainer={id:"B",gold:30,diamonds:4};s.bus.emit("auth.trainerUpdated",s.hud._trainer);s.app.reconcile();
  assert.equal(s.wallet.isBackpackEnabled(),true);
  assert.equal(s.toggle("trainer",true).ok,true);
  s.doc.querySelector("[data-ppbui-wallet-trainer]").click();assert.match(values(s),/30/);
});

test("invalid balances are unavailable rather than zero and removed native roots release projections",async t=>{
  const s=setup(t);s.toggle("trainer",true);s.hud._trainer.gold=null;s.hud._trainer.diamonds="bad";s.app.reconcile();
  assert.match(values(s),/—/);assert.doesNotMatch(values(s),/1,250/);assert.equal(s.wallet.isBackpackEnabled(),false);
  s.hud._trainer.gold=100;s.hud._trainer.diamonds=20;s.app.reconcile();
  s.hud._walletEl.remove();s.app.reconcile();await wait(s.win);
  assert.equal(s.doc.querySelector("[data-ppbui-wallet-trainer]"),null);
  assert.equal(s.hud._walletEl.isConnected,false,"a Wallet removed by the game is never resurrected through its old Inventory anchor");
});

test("Trainer projections stay local even when the Team HUD enhancement is disabled",async t=>{
  const s=setup(t);s.team.removeAttribute("data-ppbui-team-hud-enhanced");s.toggle("trainer",true);await wait(s.win);
  const before=s.otherReconciles();s.hud._trainer.gold=555;s.nativeWallet.firstElementChild.textContent="$ 555";await wait(s.win);
  assert.match(s.doc.querySelector("[data-ppbui-wallet-trainer]").textContent,/555/);assert.equal(s.otherReconciles(),before);
});

test("Wallet preferences isolate owners, preserve protected bytes and handle blocked storage as session-only",()=>{
  const map=new Map(),backing={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};
  const store=createWalletPreferences({storage:()=>backing});
  let read=store.read("A");assert.equal(store.write("A",{backpack:false,trainer:true},{expectedToken:read.token}).ok,true);
  assert.deepEqual(store.read("B").preferences,{backpack:true,trainer:false});
  assert.equal(store.write("A",{backpack:true,trainer:false},{expectedToken:read.token}).error,"conflict");
  map.set(walletKey,'{"version":999}');read=store.read("A");
  const result=store.write("A",{backpack:false,trainer:true},{expectedToken:read.token});
  assert.equal(result.ok,true);assert.equal(result.persistent,false);assert.equal(map.get(walletKey),'{"version":999}');
  assert.equal(store.read("A").preferences.trainer,true);
  map.set(walletKey,JSON.stringify({version:1,locations:{backpack:true,trainer:false}}));assert.equal(store.read("A").preferences.trainer,false);
  const blocked=createWalletPreferences({storage:()=>{throw new Error("blocked");}});
  assert.equal(blocked.write("A",{backpack:false,trainer:true},{expectedToken:null}).persistent,false);
  assert.equal(blocked.read("A").preferences.trainer,true);assert.equal(blocked.read("B").preferences.trainer,false);
  for(const raw of map.values())assert.doesNotMatch(raw,/gold|diamonds|1250/);
  store.dispose();blocked.dispose();
});

test("session choices survive an empty recovered store and persist only on a later explicit edit",()=>{
  const map=new Map();let blocked=true;
  const backing={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
  const store=createWalletPreferences({storage:()=>{if(blocked)throw new Error("blocked");return backing;}});
  const first=store.write("A",{backpack:false,trainer:true},{expectedToken:null});assert.equal(first.persistent,false);
  blocked=false;
  const recovered=store.read("A");assert.equal(recovered.persistent,false);assert.deepEqual(recovered.preferences,{backpack:false,trainer:true});
  assert.equal(map.size,0,"recovery alone never writes preferences");
  assert.equal(store.write("A",{backpack:true,trainer:true},{expectedToken:recovered.token}).persistent,true);
  assert.deepEqual(store.read("A").preferences,{backpack:true,trainer:true});store.dispose();
});

test("intermittent storage failure preserves the known base of successive session edits",()=>{
  const raw=JSON.stringify({version:1,locations:{backpack:true,trainer:false}});
  let unavailable=false;
  const backing={getItem:()=>raw,setItem(){throw new Error("quota");}};
  const store=createWalletPreferences({storage:()=>{if(unavailable)throw new Error("unavailable");return backing;}});
  const first=store.write("A",{backpack:true,trainer:true},{expectedToken:raw});
  assert.equal(first.persistent,false);
  unavailable=true;
  const second=store.write("A",{backpack:false,trainer:true},{expectedToken:first.token});
  assert.equal(second.persistent,false);
  unavailable=false;
  assert.deepEqual(store.read("A").preferences,{backpack:false,trainer:true});
  assert.equal(store.read("A").token,second.token);store.dispose();
});
