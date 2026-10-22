import assert from "node:assert/strict";
import {test} from "node:test";
import {JSDOM} from "jsdom";
import {createBetterUI} from "../src/core/bootstrap.js";
import {createCardModeModule} from "../src/modules/card-mode/index.js";
import {createTeamPresetsModule} from "../src/modules/team-presets/index.js";
import {cardModeConfig as config} from "../src/modules/card-mode/config.js";
import {nativeActionPanelAvailableInCardMode} from "../src/modules/card-mode/native-menu-contracts.js";

const marker=config.windows.marker;
const delay=win=>new Promise(resolve=>win.setTimeout(resolve,12));

function setup(t,{teamPresets=false,keyboard=false}={}){
  const routes=Object.keys(config.windows.nativeActionPanels).filter(id=>id!=="active-events");
  const hud=routes.filter(id=>!id.startsWith("city-"));
  const city=routes.filter(id=>id.startsWith("city-"));
  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <main id="graphics"><canvas></canvas></main>
    <aside class="pokeidle-team-hud"><div class="pokeidle-team-hud__list"></div></aside>
    <nav class="pokeidle-top-toolbar">
      ${hud.map(id=>`<button data-menu-id="${id}">${id}</button>`).join("")}
      ${city.map(id=>`<button data-ppbui-city-action="${id.slice(5)}">${id}</button>`).join("")}
      <button data-menu-id="team">Team</button><button data-menu-id="market">Market</button>
    </nav>
  </body></html>`,{url:"https://pokepixel.nietore.com/play/",pretendToBeVisual:true});
  const win=dom.window,doc=win.document,globals=new Map();
  for(const name of ["window","document","MutationObserver","requestAnimationFrame","cancelAnimationFrame"]){
    globals.set(name,Object.getOwnPropertyDescriptor(globalThis,name));
    Object.defineProperty(globalThis,name,{configurable:true,
      value:typeof win[name]==="function"&&name!=="MutationObserver"?win[name].bind(win):win[name]});
  }
  class SceneMap{}class SceneMenuBase{}class SceneTrade extends SceneMenuBase{}
  class SceneTeam extends SceneMenuBase{}class SceneMarket extends SceneMenuBase{}class ScenePvP{}
  win.Scene_Map=SceneMap;win.Scene_MenuBase=SceneMenuBase;win.Scene_Trade=SceneTrade;
  win.Scene_Team=SceneTeam;win.Scene_Market=SceneMarket;win.Scene_PvP=ScenePvP;
  let active=null,pvpActive=false;
  const created=[],events=[],controllers={},states=new Map(),cache=new Map();
  const makePanel=(id,contract)=>{
    const overlay=doc.createElement("div");overlay.className="pokeidle-panel-overlay";
    const panel=doc.createElement("section");
    // CSS constructor exemptions require exactly the native classes.
    panel.className=contract.panel.replace(/:not\([^)]*\)/g,"").split(".").filter(Boolean).join(" ")+" is-opening";
    const body=doc.createElement("main");body.className="pokeidle-panel__body";
    if(id==="team")body.innerHTML='<section class="team-section--roster"></section><section class="team-section--profile"></section>';
    else if(id==="auto-helper")body.innerHTML='<div class="auto-helper-grid"></div>';
    else body.innerHTML='<button class="native-action">Native action</button>';
    panel.append(body);overlay.append(panel);doc.body.append(overlay);
    created.push({id,constructorDisplay:win.getComputedStyle(overlay).display,preMarker:overlay.getAttribute(marker)});
    panel.classList.remove("is-opening");
    return {overlay,el:panel,body,isVisible:()=>!overlay.hidden,
      clearBody(){body.replaceChildren();},close(){overlay.hidden=true;}};
  };
  const scenePanel=(id,Scene)=>{
    const contract=id==="team"?config.windows.nativeMenus.team:config.windows.nativeMenusWaveB2.market;
    const scene=cache.get(Scene)||new Scene();
    if(!scene._panel)scene._panel=makePanel(id,contract);
    else scene._panel.overlay.hidden=false;
    cache.set(Scene,scene);active=scene;return scene;
  };
  win.SceneManager={_scene:new SceneMap(),_nextScene:null,push(Scene){
    if(active?._panel?.overlay)active._panel.overlay.hidden=true;
    if(Scene===SceneTeam)return scenePanel("team",Scene);
    if(Scene===SceneMarket)return scenePanel("market",Scene);
    this._nextScene=new Scene();
  }};
  const controller=(name)=>controllers[name]||(controllers[name]={});
  for(const [id,contract] of Object.entries(config.windows.nativeActionPanels)){
    if(id==="active-events")continue;
    const c=controller(contract.controller);
    const button=doc.querySelector(id.startsWith("city-")
      ? `[data-ppbui-city-action="${id.slice(5)}"]`:`[data-menu-id="${id}"]`);
    const trigger=()=>{
      events.push({id,mode:doc.documentElement.dataset.ppbuiCardMode});
      const previous=states.get(id);
      if(previous){previous.overlay.hidden=true;states.delete(id);if(contract.handle)c[contract.handle]=null;return;}
      for(const [other,panel] of states){panel.overlay.hidden=true;states.delete(other);}
      const panel=makePanel(id,contract);
      states.set(id,panel);
      if(contract.openState)c.isOpen=()=>states.has(id);
      else if(contract.getter)c[contract.getter]=()=>states.has(id)?{panel}:null;
      else c[contract.handle]=panel;
    };
    const method=contract.method||"open";
    c[method]=trigger;
    button.addEventListener("click",()=>{
      if(!pvpActive && !button.disabled)trigger();
    });
  }
  win.PokeIdle={
    ...controllers,
    PvP:{isBattleActive:()=>pvpActive},
    ReactiveWindows:{active:()=>active,cached:()=>[...cache.values()]},
  };
  doc.querySelector('[data-menu-id="team"]').addEventListener("click",()=>win.SceneManager.push(SceneTeam));
  doc.querySelector('[data-menu-id="market"]').addEventListener("click",()=>win.SceneManager.push(SceneMarket));
  if(keyboard){
    // PersistentHUD binds in WINDOW capture BEFORE the Better UI module.
    win.addEventListener("keydown",event=>{
      if(event.key.toUpperCase()==="V"){
        win.SceneManager.push(ScenePvP);event.preventDefault();event.stopPropagation();
      }else if(event.key.toUpperCase()==="T"){
        win.SceneManager.push(SceneMarket);event.preventDefault();event.stopPropagation();
      }
    },true);
  }
  const store={owner:()=>"owner-1",list:()=>[],legacyCount:()=>0,isPersistent:()=>true};
  const app=createBetterUI({modules:[createCardModeModule(),...(teamPresets?[createTeamPresetsModule({store})]:[])]});
  app.start();
  const toggle=doc.querySelector("[data-ppbui-card-mode-toggle]");toggle.click();
  t.after(()=>{app.stop();win.close();for(const [name,descriptor] of globals){
    if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];
  }});
  return {win,doc,app,toggle,events,created,states,controllers,store,
    button:id=>doc.querySelector(id.startsWith("city-")
      ? `[data-ppbui-city-action="${id.slice(5)}"]`:`[data-menu-id="${id}"]`),
    setPvp:value=>{pvpActive=value;},get active(){return active;},get cache(){return cache;}};
}

test("Mark Shop, three City NPC services, Expeditions and two automation panels stay over Cards",async t=>{
  const s=setup(t),ids=Object.keys(config.windows.nativeActionPanels).filter(id=>id!=="active-events");
  for(const id of ids){
    const button=s.button(id);button.click();await delay(s.win);
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards",`${id} must preserve Cards`);
    assert.equal(s.toggle.getAttribute("aria-pressed"),"true");
    const panel=s.states.get(id);
    assert.ok(panel,`${id} original controller opened a native UIPanel`);
    assert.equal(panel.overlay.getAttribute(marker),`native-action-${id}`);
    assert.notEqual(s.win.getComputedStyle(panel.overlay).display,"none",`${id} must not be below Cards`);
    assert.equal(s.win.getComputedStyle(s.doc.querySelector("#graphics")).display,"none");
    assert.equal(nativeActionPanelAvailableInCardMode(panel.el,id),true);
    const made=s.created.find(candidate=>candidate.id===id);
    assert.notEqual(made?.constructorDisplay,"none",`${id} native constructor has measurable geometry`);
    assert.equal(made.preMarker,null,`${id} presentation marker requires a verified controller`);
    assert.equal(s.events.filter(event=>event.id===id).length,1,`${id} handler invoked once`);
  }
});

test("unavailable action controllers and disabled actions never force Game or authorize foreign roots",async t=>{
  const s=setup(t);
  s.setPvp(true);
  for(const id of ["auto-helper","offline-farm","npc-shop","city-nature"]){
    s.button(id).click();await delay(s.win);
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
    assert.equal(s.states.has(id),false);
  }
  s.setPvp(false);
  const button=s.button("npc-shop");button.disabled=true;button.click();await delay(s.win);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  const fake=s.doc.createElement("div");fake.className="pokeidle-panel-overlay";
  fake.innerHTML='<div class="pokeidle-panel auto-helper-panel"><main class="pokeidle-panel__body"></main></div>';
  s.doc.body.append(fake);s.app.reconcile();
  assert.equal(fake.hasAttribute(marker),false);
  assert.equal(s.win.getComputedStyle(fake).display,"none");
});

test("native popup closure revokes its Cards marker without reloading the canvas",async t=>{
  const s=setup(t),button=s.button("auto-helper");
  button.click();await delay(s.win);
  const original=s.states.get("auto-helper").overlay;
  button.click();await delay(s.win);
  assert.equal(original.hidden,true);
  assert.equal(original.hasAttribute(marker),false);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
});

test("cloned marked native NPC/auto-helper windows cannot gain controller identity or survive reconciliation",async t=>{
  for(const id of ["npc-shop","auto-helper"]){
    await t.test(id,async t=>{
    const s=setup(t),button=s.button(id);
    button.click();await delay(s.win);
    const original=s.states.get(id).overlay;
    const clone=original.cloneNode(true);
    s.doc.body.append(clone);
    assert.equal(clone.getAttribute(marker),`native-action-${id}`,
      "an adversarial DOM clone copies the presentation attribute");
    assert.equal(nativeActionPanelAvailableInCardMode(clone.firstElementChild,id),false,
      "matching CSS and copied marker do not constitute current native controller identity");
    s.app.reconcile();
    assert.equal(clone.hasAttribute(marker),false,
      "central reconciliation strips unowned native action marker");
    if(id==="auto-helper"){
      assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
        "two visually identical closure-private native roots must fail back to Game, never guess owner");
      assert.equal(original.hasAttribute(marker),false);
    }else{
      assert.equal(s.win.getComputedStyle(clone).display,"none");
      assert.equal(original.getAttribute(marker),`native-action-${id}`,
        "the authoritative NPC.panel identity keeps its original owner admitted");
    }
    });
  }
});

test("Offline Farm confirmations reveal Game before the native action, with benign/disabled controls retaining Cards",async t=>{
  const s=setup(t);
  s.button("offline-farm").click();await delay(s.win);
  const panel=s.states.get("offline-farm");
  const benign=s.doc.createElement("button");benign.className="offline-farm-choice";
  panel.body.append(benign);
  let benignCalls=0;benign.addEventListener("click",()=>benignCalls++);benign.click();
  assert.equal(benignCalls,1);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  for(const classname of ["offline-farm-start","offline-farm-choice is-boost"]){
    const button=s.doc.createElement("button");button.className=classname;
    panel.body.append(button);
    const original=s.doc.createElement("div");original.className="pokeidle-dialog-overlay";
    original.append(Object.assign(s.doc.createElement("section"),{className:"pokeidle-dialog"}));
    let executed=0,mode;
    button.addEventListener("click",()=>{
      executed++;mode=s.doc.documentElement.dataset.ppbuiCardMode;
      s.doc.body.append(original);
    });
    button.disabled=true;button.click();
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
    button.disabled=false;
    button.click();
    assert.equal(mode,"game",`${classname} native confirmation must see Game`);
    assert.equal(executed,1,"native handler runs exactly once");
    assert.notEqual(s.win.getComputedStyle(original).display,"none",
      "a closure-private PI.Dialog remains visible after its original handler");
    s.toggle.click();assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
      "an active native confirmation prevents Cards reentry");
    original.remove();
    s.toggle.click();assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  }
});

test("Auto Helper and Farm Off retain exact original minimized Restore buttons in Cards",async t=>{
  for(const id of ["auto-helper","offline-farm"]){
    await t.test(id,async t=>{
    const s=setup(t);
    s.button(id).click();await delay(s.win);
    const panel=s.states.get(id),nativeMinimize=s.doc.createElement("button");
    nativeMinimize.className="pokeidle-panel__minimize";
    panel.el.append(nativeMinimize);
    let restoreCalls=0;
    nativeMinimize.addEventListener("click",()=>{
      panel.overlay.hidden=true;
      let dock=s.doc.body.querySelector(".pokeidle-minimized-windows");
      if(!dock){dock=s.doc.createElement("nav");dock.className="pokeidle-minimized-windows";s.doc.body.append(dock);}
      const restore=s.doc.createElement("button");restore.className="pokeidle-ui-button";
      restore.setAttribute("aria-label",`Restaurar: ${id}`);
      restore.addEventListener("click",()=>{
        restoreCalls++;panel.overlay.hidden=false;restore.remove();if(!dock.children.length)dock.remove();
      });
      dock.append(restore);
      // The real browser refuses focus on a display:none native dock.
      // Ownership must not require activeElement to become the Restore button.
    });
    nativeMinimize.focus();nativeMinimize.click();await delay(s.win);
    const dock=s.doc.body.querySelector(".pokeidle-minimized-windows");
    assert.equal(dock?.getAttribute(marker),"native-minimized",
      `${id} original UIPanel Restore must remain visible in Cards`);
    const restore=dock.firstElementChild;
    assert.notEqual(s.win.getComputedStyle(dock).display,"none");
    assert.equal(s.doc.activeElement,restore,
      "keyboard focus follows the original Restore only after Cards admits the native dock");
    restore.click();s.app.reconcile();
    assert.equal(restoreCalls,1);
    assert.equal(panel.overlay.getAttribute(marker),`native-action-${id}`);
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
    });
  }
});

test("deferred native Restore recovery never steals focus moved to a different control",async t=>{
  const s=setup(t);s.button("auto-helper").click();await delay(s.win);
  const panel=s.states.get("auto-helper"),minimize=s.doc.createElement("button");
  minimize.className="pokeidle-panel__minimize";panel.el.append(minimize);
  const unrelated=s.doc.createElement("button");unrelated.textContent="Independent visible control";
  s.doc.querySelector(".pokeidle-top-toolbar").append(unrelated);
  let dock,restore;
  minimize.addEventListener("click",()=>{
    panel.overlay.hidden=true;
    dock=s.doc.createElement("nav");dock.className="pokeidle-minimized-windows";
    restore=s.doc.createElement("button");restore.className="pokeidle-ui-button";
    restore.setAttribute("aria-label","Restaurar: auto-helper");
    dock.append(restore);s.doc.body.append(dock);
    unrelated.focus();
  });
  minimize.focus();minimize.click();await delay(s.win);
  assert.equal(dock.getAttribute(marker),"native-minimized");
  assert.equal(s.doc.activeElement,unrelated,
    "the user-selected toolbar control retains focus after the native dock appears");
});

test("audited NPC, City service and Expedition confirmations use Game before one native handler",async t=>{
  const samples=[
    ["npc-shop","npc-shop__purchase-button"],
    ["npc-shop","npc-shop__custom-button"],
    ["npc-shop","npc-shop__sell-button"],
    ["npc-shop","npc-shop__buyback-button"],
    ["city-nature","npc-nature__action"],
    ["city-geneticist","npc-iv__action"],
    ["city-geneticist","npc-iv__restore"],
    ["city-geneticist","npc-genetic__extract-action"],
    ["city-geneticist","npc-genetic__creature is-protected"],
    ["city-evolution-center","pokeidle-btn--primary","npc-evolution-option"],
    ["city-evolution-center","pokeidle-btn--primary","npc-craft-card__footer"],
    ["expedition","expedition-mini-btn pokeidle-btn--primary","expedition-item-note"],
    ["expedition","pokeidle-btn--danger","expedition-group-actions expedition-actions"],
    ["expedition","expedition-mini-btn","expedition-slot__actions"],
    ["expedition","pokeidle-btn--danger","expedition-quest-row__actions"],
  ];
  for(const [id,classes,parentClass] of samples){
    await t.test(`${id}/${classes}`,async t=>{
      const s=setup(t);s.button(id).click();await delay(s.win);
      const panel=s.states.get(id);
      const wrapper=s.doc.createElement("div");wrapper.className=parentClass||"native-controls";
      const native=s.doc.createElement("button");native.className=classes;
      wrapper.append(native);panel.body.append(wrapper);
      const benign=s.doc.createElement("button");benign.className="npc-shop__tab";
      panel.body.append(benign);
      benign.click();assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
      native.disabled=true;native.click();
      assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
      native.disabled=false;native.setAttribute("aria-disabled","true");native.click();
      assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
      native.removeAttribute("aria-disabled");
      let nativeMode=null,calls=0;
      native.addEventListener("click",()=>{
        calls++;nativeMode=s.doc.documentElement.dataset.ppbuiCardMode;
      });
      native.click();
      assert.equal(calls,1,"original native handler runs exactly once");
      assert.equal(nativeMode,"game","Game is visible before original confirmation");
      assert.equal(panel.overlay.hasAttribute(marker),false);
    });
  }
});

test("keyboard Enter/Space on action-owner dialog controls uses native handler once",async t=>{
  for(const key of ["Enter"," "]){
    await t.test(key===" "?"Space":key,async t=>{
      const s=setup(t);s.button("city-nature").click();await delay(s.win);
      const native=s.doc.createElement("button");native.className="npc-nature__action";
      s.states.get("city-nature").body.append(native);
      let calls=0,mode;
      native.addEventListener("keydown",event=>{
        if(event.key===key){calls++;mode=s.doc.documentElement.dataset.ppbuiCardMode;}
      });
      native.dispatchEvent(new s.win.KeyboardEvent("keydown",{key,bubbles:true}));
      assert.equal(calls,1);assert.equal(mode,"game");
    });
  }
});

test("a real WINDOW-capture shortcut for Market stays in Cards and excluded Ranked PvP reveals Game immediately",t=>{
  const s=setup(t,{keyboard:true});
  s.doc.body.dispatchEvent(new s.win.KeyboardEvent("keydown",{key:"t",bubbles:true,cancelable:true}));
  s.app.reconcile();
  assert.equal(s.active?.constructor,s.win.Scene_Market);
  assert.equal(s.active?._panel?.overlay.getAttribute(marker),"native-market");
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  s.doc.body.dispatchEvent(new s.win.KeyboardEvent("keydown",{key:"v",bubbles:true,cancelable:true}));
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
    "native V shortcut must not leave incompatible PvP hidden behind Cards until a later observer");
  assert.notEqual(s.win.getComputedStyle(s.doc.querySelector("#graphics")).display,"none");
});

test("Saved Teams manager remains attached to the native Team panel after switching to Cards",t=>{
  const s=setup(t,{teamPresets:true});
  s.button("team").click();s.app.reconcile();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  const panel=s.active?._panel;
  assert.equal(panel?.overlay.getAttribute(marker),"native-team");
  const details=panel.el.querySelector("[data-ppbui-team-preset-manager]");
  assert.ok(details,"Team Presets mounts Saved Teams inside the native Team panel while Cards is active");
  assert.equal(details.isConnected,true);
  s.app.reconcile();
  assert.equal(panel.el.querySelector("[data-ppbui-team-preset-manager]"),details,
    "reconciliation preserves the original manager element and its controls");
});
