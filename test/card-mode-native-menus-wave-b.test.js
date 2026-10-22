import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createCardModeModule } from "../src/modules/card-mode/index.js";
import { cardModeConfig } from "../src/modules/card-mode/config.js";
import { nativeMenuAvailableInCardMode } from "../src/modules/card-mode/native-menu-contracts.js";

const waveB = cardModeConfig.windows.nativeMenusWaveB;
const phaseA = cardModeConfig.windows.nativeMenus;
const deferred = win => new Promise(resolve => win.setTimeout(resolve, 14));

function fixture(t,{systemPortals=false}={}) {
  const b2 = ["rampage", "world-boss-live-raid", "player-migration"];
  const ids = [...Object.keys(waveB), ...b2];
  const dom = new JSDOM(`<!doctype html><html><head></head><body>
    <main id="native-game-renderer"><canvas></canvas></main>
    <nav class="pokeidle-top-toolbar">${ids.map(id => `<button data-menu-id="${id}">${id}</button>`).join("")}</nav>
    ${systemPortals ? `<div id="pokeidle-loading-overlay" class="pokeidle-conn-overlay" style="display:none"><div class="pokeidle-spinner"></div><div class="pokeidle-conn-text">Loading</div></div>
    <div id="pokeidle-connection-overlay" class="pokeidle-conn-overlay" style="display:none"><div class="pokeidle-spinner"></div><div class="pokeidle-conn-text">Disconnected</div><button id="reconnect-native">Retry native</button></div>` : ""}
  </body></html>`, { url:"https://pokepixel.nietore.com/play/", pretendToBeVisual:true });
  const win=dom.window, doc=win.document, globals=new Map();
  for(const name of ["window","document","MutationObserver","requestAnimationFrame","cancelAnimationFrame"]){
    globals.set(name,Object.getOwnPropertyDescriptor(globalThis,name));
    Object.defineProperty(globalThis,name,{configurable:true,
      value:typeof win[name]==="function"&&name!=="MutationObserver"?win[name].bind(win):win[name]});
  }
  class SceneMap {}
  class SceneMenuBase {}
  class SceneTrade extends SceneMenuBase {}
  win.Scene_Map=SceneMap;
  win.Scene_MenuBase=SceneMenuBase;
  win.Scene_Trade=SceneTrade;
  let active=null;
  const cache=new Map(),scenes=new Map(),openCount=new Map(),events=[],creates=[];
  for(const [id,contract] of Object.entries(waveB)){
    const Scene=class extends SceneMenuBase{};
    win[contract.scene]=Scene;
    scenes.set(id,Scene);
    const button=doc.querySelector(`[data-menu-id="${id}"]`);
    button.addEventListener("click",()=>{
      events.push({id,phase:"native",mode:doc.documentElement.dataset.ppbuiCardMode});
      if(button.disabled||button.hidden||button.inert||button.getAttribute("aria-disabled")==="true")return;
      if(win[contract.scene]!==Scene)return;
      if(active instanceof SceneTrade)return;
      if(active?.constructor===Scene){active._panel.overlay.hidden=true;active=null;return;}
      win.SceneManager.push(Scene);
    });
  }
  for(const id of b2){
    doc.querySelector(`[data-menu-id="${id}"]`).addEventListener("click",()=>
      events.push({id,phase:"native",mode:doc.documentElement.dataset.ppbuiCardMode}));
  }
  function create(Scene){
    const contract=Object.values(waveB).find(item=>win[item.scene]===Scene);
    assert.ok(contract,"must instantiate a known native Scene_MenuBase");
    const overlay=doc.createElement("div");overlay.className="pokeidle-panel-overlay";
    const panel=doc.createElement("section");
    panel.className=contract.panel.split(".").filter(Boolean).join(" ")+" is-opening";
    const body=doc.createElement("div");body.className="pokeidle-panel__body";
    panel.append(body);overlay.append(panel);doc.body.append(overlay);
    const constructionDisplay=win.getComputedStyle(overlay).display;
    const beforeMarker=overlay.getAttribute(cardModeConfig.windows.marker);
    panel.classList.remove("is-opening");
    const scene=new Scene();
    scene._panel={overlay,el:panel,body,
      isVisible:()=>!overlay.hidden};
    cache.set(Scene,scene);creates.push({scene,overlay,panel,constructionDisplay,beforeMarker});
    openCount.set(Scene,(openCount.get(Scene)||0)+1);
    return scene;
  }
  win.SceneManager={_scene:new SceneMap(),_nextScene:null,
    push(Scene){
      if(active?._panel?.overlay)active._panel.overlay.hidden=true;
      const scene=cache.get(Scene)||create(Scene);
      scene._panel.overlay.hidden=false;
      active=scene;
      return scene;
    },
  };
  win.PokeIdle={ReactiveWindows:{
    active:()=>active,cached:()=>[...cache.values()],
    close(){if(active)active._panel.overlay.hidden=true;active=null;},
  }};
  const app=createBetterUI({modules:[createCardModeModule()]});
  app.start();
  const toggle=doc.querySelector("[data-ppbui-card-mode-toggle]");
  assert.ok(toggle);
  toggle.click();
  t.after(()=>{
    app.stop();dom.window.close();
    for(const [name,descriptor] of globals){
      if(descriptor)Object.defineProperty(globalThis,name,descriptor);
      else delete globalThis[name];
    }
  });
  return {win,doc,app,toggle,cache,events,openCount,creates,scenes,
    get active(){return active;},setActive:value=>active=value,
    button:id=>doc.querySelector(`[data-menu-id="${id}"]`),
    open:id=>win.SceneManager.push(scenes.get(id)),
  };
}

test("wave B1 registry is ten distinct public MenuBase scenes without authorizing six complex B2 routes",t=>{
  assert.deepEqual(Object.keys(waveB),[
    "ranking","quests","battle-pass","daily-gift","species-goals",
    "event-calendar","shiny-captures","genetic-vault","mentorship","streamers-active",
  ]);
  const sceneNames=Object.values(waveB).map(item=>item.scene);
  assert.equal(new Set(sceneNames).size,10);
  for(const id of Object.keys(waveB)){
    assert.equal(id in phaseA,false,`no wave A descriptor may be overwritten by ${id}`);
    assert.ok(waveB[id].panel.startsWith(".pokeidle-panel."));
  }
});

test("all ten wave B1 native scenes construct measurable and open in Cards using original handlers exactly once",async t=>{
  const s=fixture(t);
  for(const [id,contract] of Object.entries(waveB)){
    const prev=s.events.length;
    s.button(id).click();await deferred(s.win);
    const scene=s.active;
    const creation=s.creates.at(-1);
    assert.equal(s.events.length,prev+1);
    assert.deepEqual(s.events.at(-1),{id,phase:"native",mode:"cards"});
    assert.equal(creation.beforeMarker,null,`${id} may not own shell before SceneManager registration`);
    assert.equal(creation.constructionDisplay,"block",`${id} UIPanel must not construct 0x0`);
    assert.equal(scene.constructor,s.scenes.get(id));
    assert.equal(scene._panel.el.matches(contract.panel),true);
    assert.equal(scene._panel.overlay.dataset.ppbuiCardModeWindow,`native-${id}`);
    assert.equal(nativeMenuAvailableInCardMode(scene._panel.el,id),true);
    assert.equal(s.win.getComputedStyle(scene._panel.overlay).display,"block");
    assert.equal(s.win.getComputedStyle(s.doc.querySelector("#native-game-renderer")).display,"none");
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
    assert.equal(s.toggle.getAttribute("aria-pressed"),"true");
  }
});

test("wave B1 scenes close, restore cached identity and hide inactive roots without switching Cards",async t=>{
  const s=fixture(t);s.button("ranking").click();await deferred(s.win);
  const ranking=s.active;
  s.button("quests").click();await deferred(s.win);
  const quests=s.active;
  assert.equal(ranking._panel.overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.equal(s.win.getComputedStyle(ranking._panel.overlay).display,"none");
  s.button("quests").click();await deferred(s.win);
  assert.equal(s.active,null);
  assert.equal(quests._panel.overlay.hidden,true);
  assert.equal(quests._panel.overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  s.button("ranking").click();await deferred(s.win);
  assert.equal(s.active,ranking);
  assert.equal(s.openCount.get(s.scenes.get("ranking")),1,"no cloned scene or duplicate original handler");
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.toggle.getAttribute("aria-pressed"),"true");
});

test("wave B1 rejects wrong classes, stale cached roots, inert/hidden/aria-hidden and unrelated body portals",async t=>{
  const s=fixture(t);s.button("event-calendar").click();await deferred(s.win);
  const scene=s.active,overlay=scene._panel.overlay,panel=scene._panel.el;
  for(const [node,name,value] of [
    [panel,"inert",""],[overlay,"aria-hidden","true"],[overlay,"inert",""]]){
    node.setAttribute(name,value);
    assert.equal(s.win.getComputedStyle(overlay).display,"none",`${name} must immediately hide owner`);
    s.app.reconcile();assert.equal(overlay.hasAttribute("data-ppbui-card-mode-window"),false);
    node.removeAttribute(name);s.app.reconcile();
    assert.equal(overlay.dataset.ppbuiCardModeWindow,"native-event-calendar");
  }
  panel.classList.remove("event-calendar-window");s.app.reconcile();
  assert.equal(overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  panel.classList.add("event-calendar-window");s.app.reconcile();
  assert.equal(overlay.dataset.ppbuiCardModeWindow,"native-event-calendar");
  overlay.hidden=true;s.app.reconcile();
  assert.equal(overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  const foreign=s.doc.createElement("div");foreign.className="pokeidle-panel-overlay";
  foreign.innerHTML='<section class="pokeidle-panel game-window npc-shop-window event-calendar-window"></section>';
  s.doc.body.append(foreign);s.app.reconcile();
  assert.equal(foreign.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.equal(s.win.getComputedStyle(foreign).display,"none");
  const dialog=s.doc.createElement("div");dialog.className="pokeidle-dialog-overlay";
  dialog.innerHTML='<section class="pokeidle-dialog">foreign</section>';
  s.doc.body.append(dialog);s.app.reconcile();
  assert.equal(s.win.getComputedStyle(dialog).display,"none");
  assert.equal(dialog.hasAttribute("data-ppbui-card-mode-window"),false);
});

test("wave B1 cache-minimized dock restores exact cached buttons, never foreign lookalikes",async t=>{
  const s=fixture(t), dock=s.doc.createElement("nav");
  dock.className="pokeidle-minimized-windows";s.doc.body.append(dock);
  const data=[];
  for(const id of ["ranking","mentorship"]){
    s.button(id).click();await deferred(s.win);
    const scene=s.active,button=s.doc.createElement("button");
    button.textContent="Restore "+id;
    button.addEventListener("click",()=>{
      s.setActive(scene);scene._panel.overlay.hidden=false;
      scene._panel._minimizedButton=null;button.remove();
    });
    dock.append(button);scene._panel._minimizedButton=button;
    scene._panel.overlay.hidden=true;s.setActive(null);
    data.push({id,scene,button});
  }
  s.app.reconcile();
  assert.equal(dock.dataset.ppbuiCardModeWindow,"native-minimized");
  const fake=s.doc.createElement("button");dock.append(fake);s.app.reconcile();
  assert.equal(dock.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.equal(s.win.getComputedStyle(dock).display,"none");
  fake.remove();s.app.reconcile();
  assert.equal(dock.dataset.ppbuiCardModeWindow,"native-minimized");
  data[0].button.click();s.app.reconcile();
  assert.equal(s.active,data[0].scene);
  assert.equal(data[0].scene._panel.overlay.dataset.ppbuiCardModeWindow,"native-ranking");
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
});

test("three incompatible scene routes continue using native Game without invented panels",async t=>{
  const s=fixture(t);
  for(const id of ["rampage","world-boss-live-raid","player-migration"]){
    if(s.doc.documentElement.dataset.ppbuiCardMode!=="cards")s.toggle.click();
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
    s.button(id).click();
    assert.equal(s.events.at(-1).id,id);
    assert.equal(s.events.at(-1).mode,"game",`${id} must not be admitted without child provenance`);
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
    assert.equal(s.active,null);
  }
});

test("wave B1 Trade refusal, unavailable buttons and absent scene cannot bypass native permission",async t=>{
  const s=fixture(t);
  s.setActive(new s.win.Scene_Trade());
  s.button("ranking").click();await deferred(s.win);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.active.constructor,s.win.Scene_Trade);
  s.setActive(null);
  for(const id of ["ranking","quests"]){
    const button=s.button(id);
    button.setAttribute("aria-disabled","true");button.click();await deferred(s.win);
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
    button.removeAttribute("aria-disabled");
    button.hidden=true;button.click();await deferred(s.win);
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
    button.hidden=false;
  }
  const oldScene=s.win.Scene_Ranking;
  s.win.Scene_Ranking=class NotAMenu{};
  s.button("ranking").click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  s.win.Scene_Ranking=oldScene;
});

test("wave B1 keyboard/native shortcut opens exact owner and does not require a toolbar click",async t=>{
  const s=fixture(t), Scene=s.scenes.get("shiny-captures");
  let shortcutCalls=0;
  s.win.addEventListener("keydown",event=>{
    if(event.key!=="s")return;
    shortcutCalls++;s.win.SceneManager.push(Scene);
  },true);
  s.win.dispatchEvent(new s.win.KeyboardEvent("keydown",{key:"s"}));
  s.app.reconcile();
  assert.equal(shortcutCalls,1);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.active._panel.overlay.dataset.ppbuiCardModeWindow,"native-shiny-captures");
  s.win.PokeIdle.ReactiveWindows.close();s.app.reconcile();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.active,null);
});

test("wave B1 pending native open callback canceled when user selects Game or module tears down",async t=>{
  const s=fixture(t);
  s.button("genetic-vault").click();
  s.toggle.click();await deferred(s.win);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  assert.equal(s.active._panel.overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  s.app.stop();await deferred(s.win);
  assert.equal(s.doc.documentElement.hasAttribute("data-ppbui-card-mode"),false);
  assert.equal(s.active._panel.overlay.hasAttribute("data-ppbui-card-mode-window"),false);
});

test("original native Loading/Connection overlays remain visible and interactive in Cards without admitting lookalikes",async t=>{
  const s=fixture(t,{systemPortals:true});
  s.button("quests").click();await deferred(s.win);
  const loading=s.doc.getElementById("pokeidle-loading-overlay");
  const connection=s.doc.getElementById("pokeidle-connection-overlay");
  for(const [node,kind] of [[loading,"native-system-loading"],[connection,"native-system-connection"]]){
    node.style.display="flex";
    s.app.reconcile();
    assert.equal(node.dataset.ppbuiCardModeWindow,kind,
      "only the original host-created system overlay may bypass body hiding");
    assert.equal(s.win.getComputedStyle(node).display,"flex",
      "a native asynchronous loading or disconnected overlay cannot be masked by Cards");
    assert.ok(Number(s.win.getComputedStyle(node).zIndex)>2147483000,
      "native blocking overlay must be above the Poké Hub toolbar");
  }
  let retries=0;
  s.doc.querySelector("#reconnect-native").addEventListener("click",()=>retries++);
  s.doc.querySelector("#reconnect-native").click();
  assert.equal(retries,1,"the original native reconnect handler must remain intact");
  const fake=s.doc.createElement("div");fake.id="pokeidle-loading-overlay";
  fake.className="pokeidle-conn-overlay";
  fake.innerHTML='<div class="pokeidle-spinner"></div><div class="pokeidle-conn-text">Foreign overlay</div>';
  s.doc.body.append(fake);s.app.reconcile();
  assert.equal(fake.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.equal(s.win.getComputedStyle(fake).display,"none");
  connection.setAttribute("inert","");
  assert.equal(s.win.getComputedStyle(connection).display,"none",
    "inaccessible native connection overlay must hide immediately before observer sync");
  s.app.reconcile();
  assert.equal(connection.hasAttribute("data-ppbui-card-mode-window"),false);
  connection.removeAttribute("inert");s.app.reconcile();
  assert.equal(connection.dataset.ppbuiCardModeWindow,"native-system-connection");
  loading.style.display=connection.style.display="none";
  assert.equal(s.win.getComputedStyle(loading).display,"none",
    "native hide() remains authority over Better UI visibility marker");
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  for(const node of [loading,connection]){
    assert.equal(node.hasAttribute("data-ppbui-card-mode-window"),false);
  }
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  loading.remove();s.app.reconcile();
  assert.equal(loading.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.equal(fake.hasAttribute("data-ppbui-card-mode-window"),false,
    "replacing the original system node with an identical shell cannot inherit ownership");
});
