import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createCardModeModule } from "../src/modules/card-mode/index.js";
import { cardModeConfig } from "../src/modules/card-mode/config.js";

const {gameOnlyHud,gameOnlyCity,halloweenPanel,nativeMenus,nativeMenusWaveB}=cardModeConfig.windows;
const sceneRoutes=Object.entries(gameOnlyHud).filter(([,route])=>route.scene);

function setup(t) {
  const ids=[...Object.keys(gameOnlyHud),...cardModeConfig.windows.nativeActionsStayCards,"mini-view","npc-shop","ranking"];
  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <main id="renderer"><canvas></canvas></main><nav class="pokeidle-top-toolbar">
      ${ids.map(id=>`<button data-menu-id="${id}">${id}</button>`).join("")}
      <button data-ppbui-city-action="gyms">Gyms</button>
    </nav></body></html>`,{url:"https://pokepixel.nietore.com/play/",pretendToBeVisual:true});
  const win=dom.window,doc=win.document,globals=new Map();
  for(const name of ["window","document","MutationObserver","requestAnimationFrame","cancelAnimationFrame"]){
    globals.set(name,Object.getOwnPropertyDescriptor(globalThis,name));
    Object.defineProperty(globalThis,name,{configurable:true,
      value:typeof win[name]==="function" && name!=="MutationObserver"?win[name].bind(win):win[name]});
  }
  class SceneMap {}
  class SceneMenuBase {}
  class SceneTrade extends SceneMenuBase {}
  win.Scene_Map=SceneMap;
  win.Scene_MenuBase=SceneMenuBase;
  win.Scene_Trade=SceneTrade;
  const events=[],scenes=new Map();
  let active=null,pvpActive=false,halloweenAvailable=true,gymAvailable=true;
  const manager={_scene:new SceneMap(),_nextScene:null,push(Scene){
    this._nextScene=new Scene();
  }};
  win.SceneManager=manager;
  win.PokeIdle={
    PvP:{isBattleActive:()=>pvpActive},
    ReactiveWindows:{active:()=>active,cached:()=>[]},
    Halloween:{open:()=>events.push({id:"halloween",phase:"open",mode:doc.documentElement.dataset.ppbuiCardMode})},
  };
  for(const [id,{scene}] of [...sceneRoutes,...Object.entries(gameOnlyCity)]){
    const Scene=class extends SceneMenuBase {};
    scenes.set(id,Scene);
    win[scene]=Scene;
    const button=id==="gyms"?doc.querySelector('[data-ppbui-city-action="gyms"]'):doc.querySelector(`[data-menu-id="${id}"]`);
    button.addEventListener("click",()=>{
      events.push({id,phase:"native",mode:doc.documentElement.dataset.ppbuiCardMode});
      if((id!=="gyms" || (gymAvailable && manager._nextScene == null)) &&
          !pvpActive && !(active instanceof SceneTrade && active.constructor !== Scene))
        manager.push(Scene);
    });
  }
  doc.querySelector('[data-menu-id="halloween"]').addEventListener("click",()=>{
    events.push({id:"halloween",phase:"native",mode:doc.documentElement.dataset.ppbuiCardMode});
    if(!pvpActive && !(active instanceof SceneTrade) && halloweenAvailable)win.PokeIdle.Halloween?.open();
  });
  const app=createBetterUI({modules:[createCardModeModule()]});
  app.start();
  const toggle=doc.querySelector("[data-ppbui-card-mode-toggle]");
  toggle.click();
  assert.equal(doc.documentElement.dataset.ppbuiCardMode,"cards");
  t.after(()=>{
    app.stop();win.close();
    for(const [name,descriptor] of globals){
      if(descriptor)Object.defineProperty(globalThis,name,descriptor);
      else delete globalThis[name];
    }
  });
  return {
    win,doc,app,manager,events,scenes,toggle,
    button:id=>doc.querySelector(id==="gyms"?'[data-ppbui-city-action="gyms"]':`[data-menu-id="${id}"]`),
    setActive:value=>{active=value;},
    setPvp:value=>{pvpActive=value;},
    setHalloweenAvailable:value=>{
      halloweenAvailable=value;
      if(!value)delete win.PokeIdle.Halloween;
      else win.PokeIdle.Halloween={open:()=>events.push({id:"halloween",phase:"open",mode:doc.documentElement.dataset.ppbuiCardMode})};
    },
    setGymAvailable:value=>{gymAvailable=value;},
  };
}

test("six PO Game-only destinations are exact route exceptions, not Cards owners",()=>{
  assert.deepEqual(Object.keys(gameOnlyHud).sort(),["arena-defense","arena-pvp","halloween","tactics","tournaments"]);
  assert.deepEqual(gameOnlyCity,{gyms:{scene:"Scene_Gym"}});
  assert.equal(halloweenPanel,".pokeidle-panel.game-window.seasonal-window");
  for(const id of [...Object.keys(gameOnlyHud),...Object.keys(gameOnlyCity)]){
    assert.equal(Object.hasOwn(nativeMenus,id),false);
    assert.equal(Object.hasOwn(nativeMenusWaveB,id),false);
  }
});

test("external HUD actions and MiniView stay on Cards without creating an in-page proxy",t=>{
  const s=setup(t),renderer=s.doc.querySelector("#renderer");
  for(const id of cardModeConfig.windows.nativeActionsStayCards){
    const button=s.button(id);
    let calls=0,mode;
    button.addEventListener("click",()=>{calls++;mode=s.doc.documentElement.dataset.ppbuiCardMode;});
    button.click();
    assert.equal(calls,1,`${id} uses the original handler only`);
    assert.equal(mode,"cards",`${id} does not open an in-page window`);
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
    assert.equal(s.win.getComputedStyle(renderer).display,"none");
  }
  for(const id of ["mini-view","npc-shop"]){
    let mode;
    s.button(id).addEventListener("click",()=>{mode=s.doc.documentElement.dataset.ppbuiCardMode;});
    s.button(id).click();
    assert.equal(mode,"cards",`${id} must not force Game after PO live correction`);
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  }
});

test("four game-only HUD scenes and City Gyms reveal Game before one native handler",t=>{
  const s=setup(t),renderer=s.doc.querySelector("#renderer");
  for(const id of [...sceneRoutes.map(([id])=>id),"gyms"]){
    s.manager._nextScene=null;
    if(s.doc.documentElement.dataset.ppbuiCardMode==="game")s.toggle.click();
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
    assert.equal(s.win.getComputedStyle(renderer).display,"none");
    s.button(id).click();
    assert.equal(s.events.at(-1)?.mode,"game",`${id} native click sees Game before its handler`);
    assert.equal(s.events.filter(event=>event.id===id && event.phase==="native").length,1,
      "the same native handler is invoked only once");
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
    assert.notEqual(s.win.getComputedStyle(renderer).display,"none");
    assert.equal(s.manager._nextScene?.constructor,s.scenes.get(id));
  }
});

test("missing scene, disabled/inert button, PvP and Trade refusal never force Game",t=>{
  const s=setup(t),button=s.button("arena-pvp");
  button.disabled=true;
  button.dispatchEvent(new s.win.MouseEvent("click",{bubbles:true}));
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  button.disabled=false;
  button.setAttribute("aria-disabled","true");
  button.dispatchEvent(new s.win.MouseEvent("click",{bubbles:true}));
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  button.removeAttribute("aria-disabled");
  button.hidden=true;button.dispatchEvent(new s.win.MouseEvent("click",{bubbles:true}));
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  button.hidden=false;
  delete s.win.Scene_PvP;button.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  s.win.Scene_PvP=s.scenes.get("arena-pvp");
  s.setPvp(true);button.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  s.setPvp(false);
  s.setActive(new s.win.Scene_Trade());button.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  s.button("halloween").click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards","Trade also blocks the native HUD action");
  s.setActive(null);
  s.setHalloweenAvailable(false);s.button("halloween").click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
});

test("City Gyms fail closed if its original shortcut is unavailable or a scene is pending",t=>{
  const s=setup(t),button=s.button("gyms");
  delete s.win.Scene_Gym;button.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  s.win.Scene_Gym=s.scenes.get("gyms");
  s.manager._nextScene={constructor:class OtherScene{}};button.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  s.manager._nextScene=null;
  button.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  assert.equal(s.events.filter(event=>event.id==="gyms" && event.phase==="native").length,3);
});

test("visible active Trade blocks manual Cards reentry; stale hidden Trade does not",t=>{
  const s=setup(t),trade=new s.win.Scene_Trade();
  const overlay=s.doc.createElement("div");overlay.className="pokeidle-panel-overlay";
  const panel=s.doc.createElement("section");panel.className="pokeidle-panel game-window trade-window";
  overlay.append(panel);s.doc.body.append(overlay);
  trade._panel={overlay,el:panel,isVisible:()=>!overlay.hidden};
  s.toggle.click();assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  s.setActive(trade);
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
    "Trade remains a visible focus/Escape consumer and cannot be hidden by Cards");
  assert.notEqual(s.win.getComputedStyle(overlay).display,"none");
  overlay.hidden=true;s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards",
    "a hidden cached Trade must not block a legitimate Cards reentry");
});

test("unsupported Market, Guild and Shared Stones native windows cannot become hidden via manual Cards reentry",t=>{
  const s=setup(t);
  const unsupported=["Scene_Market","Scene_GuildSystem","Scene_SharedStones"];
  for(const className of unsupported){
    const Scene=class extends s.win.Scene_MenuBase {};
    s.win[className]=Scene;
    const scene=new Scene();
    const overlay=s.doc.createElement("div");overlay.className="pokeidle-panel-overlay";
    const el=s.doc.createElement("section");el.className="pokeidle-panel game-window";
    const body=s.doc.createElement("main");body.className="pokeidle-panel__body";
    el.append(body);overlay.append(el);s.doc.body.append(overlay);
    scene._panel={overlay,el,body,isVisible:()=>!overlay.hidden};
    s.setActive(scene);
    if(s.doc.documentElement.dataset.ppbuiCardMode==="cards")s.toggle.click();
    s.toggle.click();
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
      `${className} is not an overlay adapter and cannot lose native focus/Escape`);
    assert.notEqual(s.win.getComputedStyle(overlay).display,"none");
    overlay.hidden=true;s.toggle.click();
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards",
      `${className} hidden native cache is not a fake blocking owner`);
    overlay.remove();s.setActive(null);
  }
});

test("Gyms shortcut obeys original Trade and PvP restrictions before any Game reveal",t=>{
  const s=setup(t),gym=s.button("gyms");
  s.setActive(new s.win.Scene_Trade());
  gym.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards",
    "a native Trade refusal cannot be turned into a visible Game transition");
  s.setActive(null);s.setPvp(true);gym.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards",
    "active PvP restriction leaves the decision with the native handler");
  s.setPvp(false);gym.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
});

test("manual Game-to-Cards reentry cannot conceal exact active excluded scene, but ignores hidden cache",t=>{
  const s=setup(t);
  for(const id of [...sceneRoutes.map(([id])=>id),"gyms"]){
    const Scene=s.scenes.get(id),scene=new Scene();
    const overlay=s.doc.createElement("div"),panel=s.doc.createElement("section");
    overlay.className="pokeidle-panel-overlay";
    panel.className="pokeidle-panel game-window";
    overlay.append(panel);s.doc.body.append(overlay);
    scene._panel={overlay,el:panel,isVisible:()=>!overlay.hidden};
    s.setActive(scene);
    if(s.doc.documentElement.dataset.ppbuiCardMode==="cards")s.toggle.click();
    s.manager._nextScene=null;
    s.toggle.click();
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",`${id} may never reenter Cards with an active window`);
    overlay.hidden=true;
    s.toggle.click();
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards","hidden cache alone cannot block Cards");
    s.toggle.click();
    s.setActive(null);overlay.remove();
  }
});

test("Halloween HUD action uses native Game, with unavailable controller preserving Cards",t=>{
  const s=setup(t),button=s.button("halloween");
  s.setHalloweenAvailable(false);button.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  s.setHalloweenAvailable(true);button.click();
  assert.deepEqual(s.events.slice(-2).map(event=>event.mode),["game","game"]);
  assert.equal(s.events.filter(event=>event.id==="halloween" && event.phase==="open").length,1);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
});

test("Calendar native Halloween button can construct an exact panel in Cards and then reveals Game",t=>{
  const s=setup(t),button=s.doc.createElement("button");
  button.className="pokeidle-ui-button";
  button.textContent="Halloween via Calendar";
  s.doc.body.append(button);
  const overlay=s.doc.createElement("div"),panel=s.doc.createElement("section");
  overlay.className="pokeidle-panel-overlay";
  panel.className="pokeidle-panel game-window seasonal-window is-opening";
  overlay.append(panel);
  button.addEventListener("click",()=>s.doc.body.append(overlay));
  button.click();
  assert.notEqual(s.win.getComputedStyle(overlay).display,"none",
    "Halloween's private UIPanel can measure its native shell synchronously");
  assert.equal(overlay.hasAttribute(cardModeConfig.windows.marker),false,
    "constructing the window never grants Cards ownership");
  panel.classList.remove("is-opening");
  s.app.reconcile();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
    "manual Cards reentry cannot hide an active private seasonal window");
  overlay.hidden=true;
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards",
    "after native window closes, Cards can be selected again");
  assert.equal(overlay.hasAttribute(cardModeConfig.windows.marker),false);
});
