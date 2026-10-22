import assert from "node:assert/strict";
import {test} from "node:test";
import {JSDOM} from "jsdom";
import {createBetterUI} from "../src/core/bootstrap.js";
import {createCardModeModule} from "../src/modules/card-mode/index.js";
import {cardModeConfig as config} from "../src/modules/card-mode/config.js";
import {nativeMenuAvailableInCardMode} from "../src/modules/card-mode/native-menu-contracts.js";

const routes=config.windows.nativeMenusWaveB3;
const marker=config.windows.marker;
const delay=win=>new Promise(resolve=>win.setTimeout(resolve,14));

function fixture(t,{lazyAdmin=false}={}){
  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <main id="native-graphics"><canvas></canvas></main>
    <nav class="pokeidle-top-toolbar">${Object.keys(routes).map(id=>`<button data-menu-id="${id}">${id}</button>`).join("")}</nav>
    </body></html>`,{url:"https://pokepixel.nietore.com/play/",pretendToBeVisual:true});
  const win=dom.window,doc=win.document,globals=new Map();
  for(const name of ["window","document","MutationObserver","requestAnimationFrame","cancelAnimationFrame"]){
    globals.set(name,Object.getOwnPropertyDescriptor(globalThis,name));
    Object.defineProperty(globalThis,name,{configurable:true,
      value:typeof win[name]==="function"&&name!=="MutationObserver"?win[name].bind(win):win[name]});
  }
  class SceneMap{}class SceneMenuBase{}class SceneTrade extends SceneMenuBase{}
  win.Scene_Map=SceneMap;win.Scene_MenuBase=SceneMenuBase;win.Scene_Trade=SceneTrade;
  const classes=new Map(),cached=new Map(),events=[],built=[];
  let current=null;
  for(const [id,contract] of Object.entries(routes)){
    const Scene=class extends SceneMenuBase{};win[contract.scene]=Scene;classes.set(id,Scene);
    doc.querySelector(`[data-menu-id="${id}"]`).addEventListener("click",()=>{
      events.push({id,mode:doc.documentElement.dataset.ppbuiCardMode});
      if(id==="game-admin" && lazyAdmin && !win.Scene_GameAdmin){
        if(lazyAdmin==="success")win.setTimeout(()=>{
          win.Scene_GameAdmin=Scene;win.SceneManager.push(Scene);
        },8);
        return;
      }
      if(!(current instanceof SceneTrade))win.SceneManager.push(Scene);
    });
  }
  if(lazyAdmin)delete win.Scene_GameAdmin;
  win.SceneManager={_scene:new SceneMap(),_nextScene:null,push(Scene){
    if(current?._panel?.overlay)current._panel.overlay.hidden=true;
    let scene=cached.get(Scene);
    if(!scene){
      const [id,descriptor]=Object.entries(routes).find(([,contract])=>win[contract.scene]===Scene);
      const overlay=doc.createElement("div");overlay.className="pokeidle-panel-overlay";
      const el=doc.createElement("section");el.className=descriptor.panel.split(".").filter(Boolean).join(" ")+" is-opening";
      const body=doc.createElement("main");body.className="pokeidle-panel__body";
      el.append(body);overlay.append(el);doc.body.append(overlay);
      built.push({id,beforeMarker:overlay.getAttribute(marker),constructionDisplay:win.getComputedStyle(overlay).display});
      el.classList.remove("is-opening");
      scene=new Scene();scene._panel={overlay,el,body,isVisible:()=>!overlay.hidden};cached.set(Scene,scene);
    }
    scene._panel.overlay.hidden=false;current=scene;return scene;
  }};
  win.PokeIdle={PvP:{isBattleActive:()=>false},ReactiveWindows:{active:()=>current,cached:()=>[...cached.values()]}};
  const app=createBetterUI({modules:[createCardModeModule()]});app.start();
  const toggle=doc.querySelector("[data-ppbui-card-mode-toggle]");toggle.click();
  t.after(()=>{app.stop();win.close();for(const [name,desc] of globals){
    if(desc)Object.defineProperty(globalThis,name,desc);else delete globalThis[name];
  }});
  return {win,doc,app,toggle,built,events,classes,cached,
    button:id=>doc.querySelector(`[data-menu-id="${id}"]`),
    open:id=>win.SceneManager.push(classes.get(id)),
    get current(){return current;},setCurrent:value=>{current=value;}};
}

test("all 37 HUD scene routes are classified explicitly; five Game-only HUD/City actions cannot inherit a Cards menu",()=>{
  assert.deepEqual(Object.keys(routes),["gacha","beta-goals","rampage","world-boss-live-raid","player-migration","game-admin"]);
  const all=[...Object.keys(config.windows.nativeMenus),...Object.keys(config.windows.nativeMenusWaveB),
    ...Object.keys(config.windows.nativeMenusWaveB2),...Object.keys(routes),"inventory",
    ...Object.entries(config.windows.gameOnlyHud).filter(([,value])=>value.scene).map(([id])=>id)];
  assert.equal(all.length,37);assert.equal(new Set(all).size,37);
  for(const id of [...Object.keys(config.windows.gameOnlyHud),"gyms"]){
    assert.equal(Object.hasOwn(routes,id),false);
  }
});

test("six final native MenuBase destinations preserve Cards, renderer suppression and exact native UIPanels",async t=>{
  const s=fixture(t);
  for(const id of Object.keys(routes)){
    const prev=s.events.length;s.button(id).click();await delay(s.win);
    assert.equal(s.events.length,prev+1);
    assert.equal(s.events.at(-1).mode,"cards",`${id} original target executes once under Cards`);
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
    assert.equal(s.toggle.getAttribute("aria-pressed"),"true");
    assert.equal(s.win.getComputedStyle(s.doc.querySelector("#native-graphics")).display,"none");
    assert.equal(s.built.at(-1).id,id);
    assert.notEqual(s.built.at(-1).constructionDisplay,"none",`${id} constructor is measurable`);
    assert.equal(s.built.at(-1).beforeMarker,null);
    assert.equal(s.current?._panel.overlay.getAttribute(marker),`native-${id}`);
    assert.equal(nativeMenuAvailableInCardMode(s.current?._panel.el,id),true);
  }
  assert.equal(s.built.length,6);
  const last=s.current,first=s.cached.get(s.classes.get("gacha"));
  assert.equal(first._panel.overlay.hidden,true);
  assert.equal(first._panel.overlay.hasAttribute(marker),false);
  s.button("gacha").click();await delay(s.win);
  assert.equal(s.current,first,"reopen uses the native cached generation");
  assert.equal(s.built.length,6,"native panel is never reconstructed by Better UI");
  assert.equal(last._panel.overlay.hidden,true);
});

test("B3 sensitive combat entry, payment, account-claim and moderation handlers reveal Game only on native action",async t=>{
  for(const [id,classes] of [
    ["beta-goals","founder-pack__purchase"],
    ["rampage","worldboss-mmo__enter"],
    ["world-boss-live-raid","wb-live-scene__enter"],
    ["player-migration","pokeidle-btn--primary","player-migration-actions"],
    ["game-admin","game-admin-moderation__kick","game-admin-moderation__actions"],
  ]){
    await t.test(id,async t=>{
      const s=fixture(t);s.button(id).click();await delay(s.win);
      const holder=s.doc.createElement("section");
      holder.className=id==="player-migration"?"player-migration-actions":id==="game-admin"?"game-admin-moderation__actions":"native-sensitive";
      const action=s.doc.createElement("button");action.className=classes;
      holder.append(action);s.current._panel.body.append(holder);
      const seen=[];
      action.addEventListener("click",()=>{seen.push(s.doc.documentElement.dataset.ppbuiCardMode);});
      action.disabled=true;action.click();assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
      action.disabled=false;action.setAttribute("aria-disabled","true");action.click();
      assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
      // ARIA-only disables presentation but not the native JS click handler;
      // Better UI never replays or suppresses that original browser event.
      assert.deepEqual(seen,["cards"]);
      action.removeAttribute("aria-disabled");action.click();
      assert.deepEqual(seen,["cards","game"]);
    });
  }
});

test("B3 benign Gacha tabs and Player Migration form fields stay in Cards; implicit submit uses Game",async t=>{
  const s=fixture(t);s.button("gacha").click();await delay(s.win);
  const tab=s.doc.createElement("button");tab.className="gacha-tabs";s.current._panel.body.append(tab);tab.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  s.button("player-migration").click();await delay(s.win);
  const form=s.doc.createElement("form");form.className="player-migration-section player-migration-form";
  const controls=s.doc.createElement("div");controls.className="player-migration-actions";
  const submit=s.doc.createElement("button");submit.className="pokeidle-btn--primary";submit.type="submit";
  controls.append(submit);form.append(controls);s.current._panel.body.append(form);
  let calls=0,at=null;form.addEventListener("submit",event=>{
    event.preventDefault();calls++;at=s.doc.documentElement.dataset.ppbuiCardMode;
  });
  submit.disabled=true;form.dispatchEvent(new s.win.Event("submit",{bubbles:true,cancelable:true}));
  assert.equal(at,"cards");
  submit.disabled=false;form.dispatchEvent(new s.win.Event("submit",{bubbles:true,cancelable:true}));
  assert.equal(at,"game");assert.equal(calls,2);
});

test("first Game Admin click stays in Cards during native lazy script load and opens its genuine UIPanel",async t=>{
  const s=fixture(t,{lazyAdmin:"success"});
  assert.equal(typeof s.win.Scene_GameAdmin,"undefined");
  s.button("game-admin").click();
  assert.equal(s.events.length,1,"one native toolbar listener invocation");
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards",
    "missing first-click class must not cause premature Game fallback");
  await delay(s.win);s.app.reconcile();
  assert.equal(s.current?.constructor,s.classes.get("game-admin"));
  assert.equal(s.current?._panel.overlay.getAttribute(marker),"native-game-admin");
  assert.equal(nativeMenuAvailableInCardMode(s.current?._panel.el,"game-admin"),true);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.events.length,1,"Better UI never redispatches the native click");
});

test("failed or unavailable native lazy Game Admin loader never creates a fake window nor forces Game",async t=>{
  const s=fixture(t,{lazyAdmin:"failure"});
  s.button("game-admin").click();await delay(s.win);s.app.reconcile();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.current,null);
  assert.equal(s.doc.querySelector('[data-ppbui-card-mode-window="native-game-admin"]'),null);
  assert.equal(s.events.length,1);
});

test("native auto-admitted live raid and Rampage combat reveal Game and block manual Cards reentry",async t=>{
  for(const [owner,active] of [["WorldBossLiveRaid",{active:true,mapID:57}],
    ["WorldBossMap",{state:{phase:"transition",returnMap:1}}]]){
    await t.test(owner,async t=>{
      const s=fixture(t);s.win.PokeIdle[owner]=active;
      // An authoritative server event can activate combat without any click.
      // Opening Game is mandatory before the native fight canvas can hide.
      s.doc.body.append(s.doc.createElement("aside"));
      await new Promise(resolve=>s.win.setTimeout(resolve,40));
      assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
      assert.notEqual(s.win.getComputedStyle(s.doc.querySelector("#native-graphics")).display,"none");
      s.toggle.click();
      assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
        "Game→Cards is refused while the native map battle remains active");
      if(owner==="WorldBossLiveRaid")active.active=false;
      else active.state=null;
      s.toggle.click();
      assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards",
        "native cleanup re-enables user-owned Cards selection");
    });
  }
});

test("native Founder PIX portal opened after async callback reveals Game without a guessed Cards owner",async t=>{
  const s=fixture(t);s.button("beta-goals").click();await delay(s.win);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  const portal=s.doc.createElement("aside");portal.className="founder-pix";
  const card=s.doc.createElement("section");card.className="founder-pix__card";
  const controls=s.doc.createElement("div");controls.className="founder-pix__actions";
  const close=s.doc.createElement("button");close.textContent="Fechar";
  controls.append(close);card.append(controls);portal.append(card);
  // Wait for the actual delayed DOM insertion, not an arbitrary wall-clock
  // timeout competing with the full parallel Node/JSDOM suite. Reconciliation
  // is deterministic once the native async callback has attached the portal.
  await new Promise(resolve=>s.win.setTimeout(()=>{s.doc.body.append(portal);resolve();},0));
  s.app.reconcile();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  assert.equal(portal.hasAttribute(marker),false);
  assert.notEqual(s.win.getComputedStyle(portal).display,"none");
  s.toggle.click();assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  portal.remove();s.toggle.click();assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
});
