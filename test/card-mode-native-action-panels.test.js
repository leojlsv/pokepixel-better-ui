import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createCardModeModule } from "../src/modules/card-mode/index.js";
import { cardModeConfig as config } from "../src/modules/card-mode/config.js";

const marker=config.windows.marker;
const deferred=win=>new Promise(resolve=>win.setTimeout(resolve,14));

function fixture(t){
  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <main id="native-game-renderer"><canvas></canvas></main>
    <nav class="pokeidle-top-toolbar"><button data-menu-id="active-events">Active Events</button></nav>
  </body></html>`,{url:"https://pokepixel.nietore.com/play/",pretendToBeVisual:true});
  const win=dom.window,doc=win.document,globals=new Map();
  for(const name of ["window","document","MutationObserver","requestAnimationFrame","cancelAnimationFrame"]){
    globals.set(name,Object.getOwnPropertyDescriptor(globalThis,name));
    Object.defineProperty(globalThis,name,{configurable:true,
      value:typeof win[name]==="function"&&name!=="MutationObserver"?win[name].bind(win):win[name]});
  }
  class SceneMap {}
  win.Scene_Map=SceneMap;
  win.SceneManager={_scene:new SceneMap(),_nextScene:null,push(){}};
  const events=[],created=[];
  let pvpActive=false;
  const ticker={_panel:null,open(){
    if(this._panel){this._panel.overlay.hidden=false;return;}
    const overlay=doc.createElement("div");overlay.className="pokeidle-panel-overlay";
    const panel=doc.createElement("section");panel.className="pokeidle-panel game-window active-events-window is-opening";
    const body=doc.createElement("div");body.className="pokeidle-panel__body";
    panel.append(body);overlay.append(panel);doc.body.append(overlay);
    created.push({overlay,panel,body,constructionDisplay:win.getComputedStyle(overlay).display,beforeMarker:overlay.getAttribute(marker)});
    panel.classList.remove("is-opening");
    this._panel={overlay,el:panel,body,isVisible:()=>!overlay.hidden};
  }};
  win.PokeIdle={
    EventTicker:ticker,
    PvP:{isBattleActive:()=>pvpActive},
    ReactiveWindows:{active:()=>null,cached:()=>[]},
  };
  const button=doc.querySelector('[data-menu-id="active-events"]');
  button.addEventListener("click",()=>{
    events.push({mode:doc.documentElement.dataset.ppbuiCardMode});
    if(!pvpActive)win.PokeIdle.EventTicker?.open?.();
  });
  const app=createBetterUI({modules:[createCardModeModule()]});
  app.start();
  const toggle=doc.querySelector("[data-ppbui-card-mode-toggle]");toggle.click();
  t.after(()=>{
    app.stop();win.close();
    for(const [name,descriptor] of globals){
      if(descriptor)Object.defineProperty(globalThis,name,descriptor);
      else delete globalThis[name];
    }
  });
  return {win,doc,app,button,ticker,events,created,toggle,setPvp:value=>{pvpActive=value;}};
}

test("native EventTicker and City/NPC action controllers are not Scene_MenuBase adapters",()=>{
  assert.deepEqual(Object.keys(config.windows.nativeActionPanels),[
    "active-events","npc-shop","city-geneticist","city-nature","city-evolution-center",
    "expedition","auto-helper","offline-farm"]);
  const contract=config.windows.nativeActionPanels["active-events"];
  assert.deepEqual(contract,{controller:"EventTicker",handle:"_panel",panel:".pokeidle-panel.game-window.active-events-window"});
  for(const registry of [config.windows.nativeMenus,config.windows.nativeMenusWaveB,config.windows.nativeMenusWaveB2])
    assert.equal(Object.hasOwn(registry,"active-events"),false);
});

test("native Active Events opens in Cards through original handler, without graphics renderer",async t=>{
  const s=fixture(t),renderer=s.doc.querySelector("#native-game-renderer");
  s.button.click();await deferred(s.win);
  assert.equal(s.events.length,1);
  assert.equal(s.events[0].mode,"cards");
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.created.length,1);
  const record=s.created[0];
  assert.notEqual(record.constructionDisplay,"none","UIPanel constructor freezes nonzero geometry before marker");
  assert.equal(record.beforeMarker,null);
  assert.equal(record.overlay.getAttribute(marker),"native-action-active-events");
  assert.notEqual(s.win.getComputedStyle(record.overlay).display,"none");
  assert.equal(s.win.getComputedStyle(renderer).display,"none");
  assert.equal(s.toggle.getAttribute("aria-pressed"),"true");
  record.overlay.hidden=true;s.app.reconcile();
  assert.equal(record.overlay.hasAttribute(marker),false);
  s.button.click();await deferred(s.win);
  assert.equal(s.created.length,1,"reopen retains the original native UIPanel handle");
  assert.equal(record.overlay.getAttribute(marker),"native-action-active-events");
});

test("keyboard/native direct EventTicker open is admitted only by the original controller handle",t=>{
  const s=fixture(t);
  s.ticker.open();s.app.reconcile();
  const node=s.ticker._panel.overlay;
  assert.equal(node.getAttribute(marker),"native-action-active-events");
  const fake=node.cloneNode(true);fake.removeAttribute(marker);s.doc.body.append(fake);
  s.app.reconcile();
  assert.equal(fake.hasAttribute(marker),false);
  assert.equal(s.win.getComputedStyle(fake).display,"none");
  s.ticker._panel.el.classList.remove("active-events-window");s.app.reconcile();
  assert.equal(node.hasAttribute(marker),false,"wrong native panel selector must fail closed");
});

test("missing EventTicker controller, PvP refusal and disabled native action preserve Cards",t=>{
  const s=fixture(t);
  delete s.win.PokeIdle.EventTicker;s.button.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  s.win.PokeIdle.EventTicker=s.ticker;
  s.setPvp(true);s.button.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  s.setPvp(false);s.button.disabled=true;s.button.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  s.button.disabled=false;s.button.setAttribute("aria-disabled","true");s.button.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
});

test("minimized Active Events is restorable from the exact native UIPanel dock while Cards stays active",t=>{
  const s=fixture(t);s.ticker.open();s.app.reconcile();
  const panel=s.ticker._panel;panel.overlay.hidden=true;
  const dock=s.doc.createElement("nav");dock.className="pokeidle-minimized-windows";
  const restore=s.doc.createElement("button");restore.textContent="Restore";
  dock.append(restore);s.doc.body.append(dock);
  panel._minimizedButton=restore;
  restore.addEventListener("click",()=>{
    panel._minimizedButton=null;
    panel.overlay.hidden=false;
    dock.remove();
  });
  s.app.reconcile();
  assert.equal(dock.getAttribute(marker),"native-minimized");
  assert.notEqual(s.win.getComputedStyle(dock).display,"none");
  const foreign=s.doc.createElement("button");dock.append(foreign);s.app.reconcile();
  assert.equal(dock.hasAttribute(marker),false,"mixed foreign dock never inherits native authority");
  foreign.remove();s.app.reconcile();
  assert.equal(dock.getAttribute(marker),"native-minimized");
  restore.click();s.app.reconcile();
  assert.equal(panel.overlay.getAttribute(marker),"native-action-active-events");
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
});
