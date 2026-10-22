import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createCardModeModule } from "../src/modules/card-mode/index.js";
import { cardModeConfig } from "../src/modules/card-mode/config.js";
import { nativeMenuAvailableInCardMode } from "../src/modules/card-mode/native-menu-contracts.js";
import { createTeamModule } from "../src/modules/team/index.js";
import { createHuntsModule } from "../src/modules/hunts/index.js";
import { createStorageModule } from "../src/modules/storage/index.js";
import { createPokemonHoverModule } from "../src/modules/pokemon-hover/index.js";

const contracts = cardModeConfig.windows.nativeMenus;
const pause = win => new Promise(resolve => win.setTimeout(resolve, 16));

function fixture(t,{disableHover=false}={}) {
  const actions = Object.keys(contracts).map(id => `<button data-menu-id="${id}"><span>${id}</span></button>`).join("");
  const dom = new JSDOM(`<!doctype html><html><head></head><body>
    <section id="native-renderer"><canvas></canvas></section>
    <nav class="pokeidle-top-toolbar">${actions}
    <button data-menu-id="unsupported">Other scene</button></nav></body></html>`, {
    url:"https://pokepixel.nietore.com/play/",pretendToBeVisual:true,
  });
  const win=dom.window,doc=win.document;
  const previous=new Map();
  for(const name of ["window","document","MutationObserver","requestAnimationFrame","cancelAnimationFrame"]){
    previous.set(name,Object.getOwnPropertyDescriptor(globalThis,name));
    Object.defineProperty(globalThis,name,{configurable:true,
      value:typeof win[name]==="function" && name!=="MutationObserver"?win[name].bind(win):win[name]});
  }
  class SceneMap {}
  class SceneMenuBase {}
  class SceneTrade extends SceneMenuBase {}
  win.Scene_Map=SceneMap;
  win.Scene_MenuBase=SceneMenuBase;
  win.Scene_Trade=SceneTrade;
  let active=null;
  const cache=new Map(),created=[],observed=[],trace=[];
  const classes=new Map();
  for(const [id,{scene,panel}] of Object.entries(contracts)){
    const Scene=class extends SceneMenuBase{};
    win[scene]=Scene;
    classes.set(id,Scene);
    doc.querySelector(`[data-menu-id="${id}"]`).addEventListener("click",()=>{
      observed.push({id,mode:doc.documentElement.dataset.ppbuiCardMode});
      trace.push("native:"+id);
      const button=doc.querySelector(`[data-menu-id="${id}"]`);
      if(button.disabled || button.hidden || button.hasAttribute("inert") ||
          button.getAttribute("aria-disabled")==="true") return;
      if(win[scene]!==Scene)return;
      if(active instanceof Scene){
        active._panel.overlay.hidden=true;
        active=null;
        return;
      }
      if(active instanceof SceneTrade)return;
      win.SceneManager.push(Scene);
    });
    // 'panel' is an exact public native selector, not a made-up marker.
    assert.ok(panel.startsWith(".pokeidle-panel."));
  }
  const stack=[];
  const nativeCreate = Scene => {
    const contract=Object.values(contracts).find(candidate => win[candidate.scene]===Scene);
    assert.ok(contract);
    const overlay=doc.createElement("div");overlay.className="pokeidle-panel-overlay";
    const panel=doc.createElement("section");
    panel.className=contract.panel.slice(1).split(".").join(" ")+" is-opening";
    const body=doc.createElement("div");body.className="pokeidle-panel__body";
    panel.append(body);overlay.append(panel);doc.body.append(overlay);
    const creationDisplay=win.getComputedStyle(overlay).display;
    panel.classList.remove("is-opening");
    const scene=new Scene();
    scene._panel={overlay,el:panel,body,isVisible:()=>!overlay.hidden};
    scene._creatures=[];
    for(const method of ["filterAndSortPokeCentro","pokeCentroFiltersActive","renderPokeCentroFilters","renderPokeCentroVault","refresh"])scene[method]=()=>{};
    created.push({scene,overlay,panel,creationDisplay});
    cache.set(Scene,scene);
    return scene;
  };
  win.SceneManager={_scene:new SceneMap(),push(Scene){
    if(active)active._panel.overlay.hidden=true;
    const scene=cache.get(Scene)||nativeCreate(Scene);
    scene._panel.overlay.hidden=false;
    active=scene;
    stack.push(scene);
  }};
  win.PokeIdle={ReactiveWindows:{
    active:()=>active,cached:()=>[...cache.values()],
    close(){if(active)active._panel.overlay.hidden=true;active=null;},
  }};
  const app=createBetterUI({modules:[
    ...(disableHover?[createPokemonHoverModule(doc)]:[]),
    createCardModeModule(),
  ]});
  app.start();
  const toggle=doc.querySelector("[data-ppbui-card-mode-toggle]");
  toggle.click();
  t.after(()=>{
    app.stop();dom.window.close();
    for(const [name,descriptor] of previous){
      if(descriptor)Object.defineProperty(globalThis,name,descriptor);
      else delete globalThis[name];
    }
  });
  return {
    win,doc,app,toggle,cache,created,observed,trace,classes,stack,
    get active(){return active;},
    setActive(value){active=value;},
    button:id=>doc.querySelector(`[data-menu-id="${id}"]`),
    open:id=>win.SceneManager.push(classes.get(id)),
  };
}

test("all eight exact public native MenuBase roots construct and open over Cards without cloning the native handlers",async t=>{
  const s=fixture(t);
  for(const id of Object.keys(contracts)){
    const button=s.button(id);
    const previous=s.observed.length;
    button.click();
    await pause(s.win);
    const {scene,overlay,panel,creationDisplay}=s.created.at(-1);
    assert.equal(s.observed.length,previous+1,"one original native toolbar click");
    assert.equal(s.observed.at(-1).mode,"cards","native target handler sees Cards");
    assert.equal(creationDisplay,"block",`${id} must be measurable before native stack registration`);
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
    assert.equal(s.toggle.getAttribute("aria-pressed"),"true");
    assert.equal(overlay.getAttribute("data-ppbui-card-mode-window"),`native-${id}`);
    assert.notEqual(s.win.getComputedStyle(overlay).display,"none");
    assert.equal(s.win.getComputedStyle(s.doc.querySelector("#native-renderer")).display,"none");
    assert.equal(scene._panel.el,panel);
    assert.equal(nativeMenuAvailableInCardMode(panel,id),true);
  }
});

test("native MenuBase handles close, cached reopen, switching and stale markers without changing Cards",async t=>{
  const s=fixture(t),team=s.button("team"),storage=s.button("storage");
  team.click();await pause(s.win);
  const teamScene=s.active;
  assert.equal(s.cache.get(s.classes.get("team")),teamScene);
  storage.click();await pause(s.win);
  const storageScene=s.active;
  assert.notEqual(storageScene,teamScene);
  assert.equal(teamScene._panel.overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.equal(s.win.getComputedStyle(teamScene._panel.overlay).display,"none");
  storage.click();await pause(s.win);
  assert.equal(s.active,null);
  assert.equal(storageScene._panel.overlay.hidden,true);
  assert.equal(storageScene._panel.overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  team.click();await pause(s.win);
  assert.equal(s.active,teamScene,"native cached scene is not cloned");
  assert.equal(s.created.filter(({scene})=>scene===teamScene).length,1);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.win.getComputedStyle(s.doc.querySelector("#native-renderer")).display,"none");
});

test("native menu ownership rejects wrong panel, foreign marker, inaccessible child and cached window",async t=>{
  const s=fixture(t),button=s.button("profile");
  button.click();await pause(s.win);
  const scene=s.active,overlay=scene._panel.overlay,panel=scene._panel.el;
  assert.equal(overlay.dataset.ppbuiCardModeWindow,"native-profile",
    "Trainer Profile must never borrow the Better UI pokemon-profile marker");
  panel.setAttribute("inert","");
  assert.equal(s.win.getComputedStyle(overlay).display,"none","CSS hides before observer reconciliation");
  s.app.reconcile();
  assert.equal(overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  panel.removeAttribute("inert");s.app.reconcile();
  assert.equal(overlay.dataset.ppbuiCardModeWindow,"native-profile");
  panel.classList.remove("trainer-profile-window");
  s.app.reconcile();
  assert.equal(overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  panel.classList.add("trainer-profile-window");s.app.reconcile();
  assert.equal(overlay.dataset.ppbuiCardModeWindow,"native-profile");
  overlay.hidden=true;s.app.reconcile();
  assert.equal(overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.equal(nativeMenuAvailableInCardMode(panel,"profile"),false);
  const orphan=s.doc.createElement("div");orphan.className="pokeidle-panel-overlay";
  orphan.innerHTML='<div class="pokeidle-panel game-window trainer-profile-window"></div>';
  s.doc.body.append(orphan);s.app.reconcile();
  assert.equal(orphan.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.equal(s.win.getComputedStyle(orphan).display,"none");
});

test("Trade denial preserves Cards; unsupported, absent and wrong-inheritance scenes still use Game",async t=>{
  const s=fixture(t),button=s.button("team");
  s.setActive(new s.win.Scene_Trade());
  button.click();await pause(s.win);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.observed.at(-1).mode,"cards");
  s.setActive(null);
  let unverified;
  s.button("unsupported").addEventListener("click",()=>unverified=s.doc.documentElement.dataset.ppbuiCardMode);
  s.button("unsupported").click();
  assert.equal(unverified,"game");
  s.toggle.click();
  const original=s.win.Scene_OnlineSettings;
  s.win.Scene_OnlineSettings=class NotAMenu{};
  let fallback;
  s.button("settings").addEventListener("click",()=>fallback=s.doc.documentElement.dataset.ppbuiCardMode);
  s.button("settings").click();
  assert.equal(fallback,"game");
  s.win.Scene_OnlineSettings=original;
});

test("pending target verification is canceled by mode change or teardown without leaking native markers",async t=>{
  const s=fixture(t),team=s.button("team");
  team.click();
  s.toggle.click();
  await pause(s.win);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  assert.equal(s.active._panel.overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  s.app.stop();
  await pause(s.win);
  assert.equal(s.active._panel.overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.equal(s.doc.documentElement.hasAttribute("data-ppbui-card-mode"),false);
});

test("Team, Hunts and Storage enhancements reject hidden cached roots and accept only admitted active panes",async t=>{
  const s=fixture(t);
  const modules={team:createTeamModule(),hunts:createHuntsModule(),storage:createStorageModule()};
  for(const id of ["team","hunts","storage"]){
    s.open(id);s.app.reconcile();
    const pane=s.active._panel.el,body=s.active._panel.body;
    if(id==="hunts") body.innerHTML='<div class="hunt-world-toolbar"></div><div class="hunt-world-viewport"></div>';
    assert.equal(modules[id].runsInCardMode,true);
    assert.equal(modules[id].shouldMount(),true,`${id} must mount only while visible and admitted`);
    s.active._panel.overlay.hidden=true;
    assert.equal(modules[id].shouldMount(),false,`${id} must not retain cached hidden content in Cards`);
    s.active._panel.overlay.hidden=false;
    pane.setAttribute("aria-hidden","true");s.app.reconcile();
    assert.equal(modules[id].shouldMount(),false,`${id} must fail closed for inaccessible pane`);
    pane.removeAttribute("aria-hidden");s.app.reconcile();
    assert.equal(modules[id].shouldMount(),true);
  }
});

test("native Mailbox unclaimed-delete reveals Game before its dialog and never claims foreign portals",async t=>{
  const s=fixture(t);
  s.button("private-message").click();await pause(s.win);
  const scene=s.active;
  const entry=s.doc.createElement("article");entry.className="mailbox-entry is-unread";
  const rewards=s.doc.createElement("div");rewards.className="mailbox-entry__rewards";
  const actions=s.doc.createElement("div");actions.className="mailbox-entry__actions";
  const action=s.doc.createElement("button");action.className="is-secondary";
  action.textContent="Delete unclaimed message";
  actions.append(action);entry.append(rewards,actions);scene._panel.body.append(entry);
  let portal,box,seenByNative;
  action.addEventListener("click",()=>{
    seenByNative=s.doc.documentElement.dataset.ppbuiCardMode;
    portal=s.doc.createElement("div");portal.className="pokeidle-dialog-overlay";
    box=s.doc.createElement("section");box.className="pokeidle-dialog";
    box.innerHTML='<input aria-label="confirmation"><button>Confirm</button>';
    portal.append(box);s.doc.body.append(portal);
  });
  action.click();s.app.reconcile();
  assert.equal(seenByNative,"game","do not conceal the native confirmation behind Cards");
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  assert.equal(portal.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.notEqual(s.win.getComputedStyle(portal).display,"none");
  box.querySelector("input").value="read";
  box.querySelector("input").focus();
  s.app.reconcile();
  assert.equal(portal.hasAttribute("data-ppbui-card-mode-window"),false,
    "native dialog values and focus remain under native ownership");
  box.querySelector("button").textContent="Foreign replacement";
  s.app.reconcile();
  assert.equal(portal.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.notEqual(s.win.getComputedStyle(portal).display,"none",
    "the native game, not a Better UI marker, owns dialog lifecycle in Game");
});

test("audited native dialog actions switch to Game before their original handler without dialog ownership",async t=>{
  const s=fixture(t);
  for(const {id,cls} of [
    {id:"capture-records",cls:"capture-log-reset"},
    {id:"storage",cls:"pokecentro-vault__bulk"},
    {id:"settings",cls:"settings-logout"},
  ]){
    s.button(id).click();await pause(s.win);
    const source=s.doc.createElement("button");source.className=cls;
    s.active._panel.body.append(source);
    let portal,nativeMode,calls=0;
    source.addEventListener("click",()=>{
      calls++;
      nativeMode=s.doc.documentElement.dataset.ppbuiCardMode;
      portal=s.doc.createElement("div");portal.className="pokeidle-dialog-overlay";
      const box=s.doc.createElement("section");box.className="pokeidle-dialog";
      portal.append(box);
      s.doc.body.append(portal);
    });
    source.click();s.app.reconcile();
    assert.equal(calls,1);
    assert.equal(nativeMode,"game");
    assert.equal(portal.hasAttribute("data-ppbui-card-mode-window"),false);
    assert.notEqual(s.win.getComputedStyle(portal).display,"none");
    portal.remove();s.app.reconcile();
    s.toggle.click();
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  }
  s.button("team").click();await pause(s.win);
  const unrelated=s.doc.createElement("button");
  s.active._panel.body.append(unrelated);
  const fake=s.doc.createElement("div");fake.className="pokeidle-dialog-overlay";
  fake.innerHTML='<section class="pokeidle-dialog">Foreign</section>';
  unrelated.addEventListener("click",()=>s.doc.body.append(fake));
  unrelated.click();s.app.reconcile();
  assert.equal(fake.hasAttribute("data-ppbui-card-mode-window"),false,
    "a single unrelated native-looking Dialog after an arbitrary Team button is not ownership");
  assert.equal(s.win.getComputedStyle(fake).display,"none");
});

test("Settings native email change routes its entire async two-dialog transaction through Game",async t=>{
  const s=fixture(t);s.button("settings").click();await pause(s.win);
  const section=s.doc.createElement("section");section.className="settings-section";
  const email=s.doc.createElement("button");email.className="pokeidle-btn";
  const status=s.doc.createElement("small");status.className="settings-account-status";
  section.append(email,status);s.active._panel.body.append(section);
  const createDialog=()=>{
    const portal=s.doc.createElement("div");portal.className="pokeidle-dialog-overlay";
    const box=s.doc.createElement("section");box.className="pokeidle-dialog";
    portal.append(box);s.doc.body.append(portal);
    return portal;
  };
  let first,whenOpened;
  email.addEventListener("click",()=>{
    whenOpened=s.doc.documentElement.dataset.ppbuiCardMode;
    first=createDialog();
  });
  email.click();s.app.reconcile();
  assert.equal(whenOpened,"game");
  assert.equal(first.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.notEqual(s.win.getComputedStyle(first).display,"none");
  first.remove();s.app.reconcile();
  email.disabled=true; // native first prompt settled, awaiting server verification code
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
    "async native email validation between two prompts cannot hide the following prompt");
  const second=createDialog();s.app.reconcile();
  assert.equal(second.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.notEqual(s.win.getComputedStyle(second).display,"none");
  second.remove();s.app.reconcile();
  const third=createDialog();s.app.reconcile();
  assert.equal(third.hasAttribute("data-ppbui-card-mode-window"),false,
    "Better UI never claims any generic dialog from the email transaction");
  third.remove();email.disabled=false;s.app.reconcile();
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards",
    "native transaction ended and its original control is enabled again");
});

test("Settings native two-factor change reveals Game before its delayed confirmation, unrelated toggle stays Cards",async t=>{
  const s=fixture(t);s.button("settings").click();await pause(s.win);
  const section=s.doc.createElement("section");section.className="settings-section";
  const input=s.doc.createElement("input");input.type="checkbox";
  const status=s.doc.createElement("small");status.className="settings-account-status";
  section.append(input,status);s.active._panel.body.append(section);
  const makeDialog=()=>{
    const node=s.doc.createElement("div");node.className="pokeidle-dialog-overlay";
    const box=s.doc.createElement("section");box.className="pokeidle-dialog";
    node.append(box);s.doc.body.append(node);return node;
  };
  input.dispatchEvent(new s.win.Event("change",{bubbles:true}));
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  input.disabled=true; // native request is pending before challenge prompt
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
    "two-factor async interval must not hide the next native challenge");
  const challenge=makeDialog();s.app.reconcile();
  assert.equal(challenge.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.notEqual(s.win.getComputedStyle(challenge).display,"none");
  challenge.remove();input.disabled=false;s.app.reconcile();
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  const unrelated=s.doc.createElement("section");unrelated.className="settings-section";
  const preference=s.doc.createElement("input");preference.type="checkbox";
  unrelated.append(preference);s.active._panel.body.append(unrelated);
  preference.dispatchEvent(new s.win.Event("change",{bubbles:true}));
  const rogue=makeDialog();s.app.reconcile();
  assert.equal(rogue.hasAttribute("data-ppbui-card-mode-window"),false,
    "unrelated Settings toggle cannot transfer two-factor modal provenance");
});

test("Settings async prompt hold survives native minimize, scene switch and removed controls",async t=>{
  const s=fixture(t);s.button("settings").click();await pause(s.win);
  const settings=s.active;
  const section=s.doc.createElement("section");section.className="settings-section";
  const email=s.doc.createElement("button");email.className="pokeidle-btn";
  const status=s.doc.createElement("small");status.className="settings-account-status";
  section.append(email,status);settings._panel.body.append(section);
  let originalHandlerMode;
  email.addEventListener("click",()=>{
    originalHandlerMode=s.doc.documentElement.dataset.ppbuiCardMode;
    email.disabled=true; // native awaits startEmailChange/verifyEmailChange
  });
  email.click();
  assert.equal(originalHandlerMode,"game");
  // NonBlockingWindows can keep Settings cached even though its active()
  // identity becomes null; the original async callback is still pending.
  settings._panel.overlay.hidden=true;s.setActive(null);
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
    "a minimized native Settings scene cannot release an outstanding prompt");
  const delayed=s.doc.createElement("div");delayed.className="pokeidle-dialog-overlay";
  delayed.innerHTML='<section class="pokeidle-dialog"><input aria-label="Code"><button>OK</button></section>';
  s.doc.body.append(delayed);s.app.reconcile();
  assert.notEqual(s.win.getComputedStyle(delayed).display,"none");
  delayed.remove();
  s.open("team");s.app.reconcile();
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
    "switching cached native menu owners does not cancel Settings pending promises");
  email.remove(); // a native rerender does not prove the async call settled
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  email.disabled=false; // finally completes, even if its original DOM was replaced
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards",
    "native transaction completion permits manual Cards selection again");
  assert.equal(s.active._panel.overlay.dataset.ppbuiCardModeWindow,"native-team");
});

test("foreign-first portal cannot steal the real Storage confirmation after an exact native bulk action",async t=>{
  const s=fixture(t);s.button("storage").click();await pause(s.win);
  const source=s.doc.createElement("button");source.className="pokecentro-vault__bulk";
  s.active._panel.body.append(source);
  let nativeMode,invocations=0,foreign,legitimate;
  const popup=label=>{
    const overlay=s.doc.createElement("div");overlay.className="pokeidle-dialog-overlay";
    const box=s.doc.createElement("section");box.className="pokeidle-dialog";
    box.textContent=label;overlay.append(box);s.doc.body.append(overlay);
    return overlay;
  };
  source.addEventListener("click",()=>{
    invocations++;
    nativeMode=s.doc.documentElement.dataset.ppbuiCardMode;
    foreign=popup("Unrelated plugin confirmation");
    legitimate=popup("Storage withdraw all confirmation");
  });
  source.click();s.app.reconcile();
  assert.equal(invocations,1);
  assert.equal(nativeMode,"game","Cards leaves before native handler so no competing ownership race exists");
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  for(const node of [foreign,legitimate]){
    assert.equal(node.hasAttribute("data-ppbui-card-mode-window"),false);
    assert.notEqual(s.win.getComputedStyle(node).display,"none",
      "native Game owns both unmodified dialogs; Better UI cannot pick the wrong generation");
  }
});

test("Cards toggle never hides a visible unowned native confirmation after dialog fallback",async t=>{
  const s=fixture(t);s.button("storage").click();await pause(s.win);
  const source=s.doc.createElement("button");source.className="pokecentro-vault__bulk";
  s.active._panel.body.append(source);
  const portal=s.doc.createElement("div");portal.className="pokeidle-dialog-overlay";
  portal.innerHTML='<section class="pokeidle-dialog"><button>Confirm</button></section>';
  source.addEventListener("click",()=>s.doc.body.append(portal));
  source.click();s.app.reconcile();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  assert.notEqual(s.win.getComputedStyle(portal).display,"none");
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
    "a visible native dialog cannot be concealed by premature Cards reentry");
  assert.notEqual(s.win.getComputedStyle(portal).display,"none");
  portal.remove();
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.active._panel.overlay.dataset.ppbuiCardModeWindow,"native-storage");
});

test("Settings Tab and unrelated native keyboard navigation never trigger a dialog fallback",async t=>{
  const s=fixture(t);s.button("settings").click();await pause(s.win);
  const source=s.doc.createElement("button");source.className="settings-logout";
  s.active._panel.body.append(source);
  source.dispatchEvent(new s.win.KeyboardEvent("keydown",{key:"Tab",bubbles:true}));
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  source.dispatchEvent(new s.win.KeyboardEvent("keydown",{key:"ArrowDown",bubbles:true}));
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  let nativeMode;
  source.addEventListener("keydown",e=>{if(e.key==="Enter")nativeMode=s.doc.documentElement.dataset.ppbuiCardMode;});
  source.dispatchEvent(new s.win.KeyboardEvent("keydown",{key:"Enter",bubbles:true}));
  assert.equal(nativeMode,"game");
});

test("ambiguous new dialogs and unrelated body portals never inherit a native click intent",async t=>{
  const s=fixture(t);s.button("settings").click();await pause(s.win);
  const action=s.doc.createElement("button");action.textContent="Sensitive";
  s.active._panel.body.append(action);
  const portals=[];
  action.addEventListener("click",()=>{
    for(let i=0;i<2;i++){
      const overlay=s.doc.createElement("div");overlay.className="pokeidle-dialog-overlay";
      const box=s.doc.createElement("section");box.className="pokeidle-dialog";
      overlay.append(box);s.doc.body.append(overlay);portals.push(overlay);
    }
  });
  action.click();s.app.reconcile();
  assert.equal(portals.length,2);
  for(const portal of portals){
    assert.equal(portal.hasAttribute("data-ppbui-card-mode-window"),false);
    assert.equal(s.win.getComputedStyle(portal).display,"none");
  }
  const foreign=s.doc.createElement("div");foreign.className="pokeidle-dialog-overlay";
  foreign.innerHTML='<section class="pokeidle-dialog">Foreign</section>';
  s.doc.body.append(foreign);s.app.reconcile();
  assert.equal(foreign.hasAttribute("data-ppbui-card-mode-window"),false);
});

test("Team's independently owned equip picker is measurable and its scene handle controls admission",async t=>{
  const s=fixture(t);s.button("team").click();await pause(s.win);
  const teamScene=s.active,click=s.doc.createElement("button");
  teamScene._panel.body.append(click);
  let popup;
  click.addEventListener("click",()=>{
    const overlay=s.doc.createElement("div");overlay.className="pokeidle-panel-overlay";
    const panel=s.doc.createElement("div");
    panel.className="pokeidle-panel is-opening team-equip-picker game-window";
    const body=s.doc.createElement("div");body.className="pokeidle-panel__body";
    panel.append(body);overlay.append(panel);s.doc.body.append(overlay);
    assert.equal(s.win.getComputedStyle(overlay).display,"block",
      "native picker geometry is read before its handle is assigned");
    popup={overlay,el:panel,body,isVisible:()=>!overlay.hidden};
    teamScene._equipPicker=popup;
    panel.classList.remove("is-opening");
  });
  click.click();s.app.reconcile();
  assert.equal(popup.overlay.dataset.ppbuiCardModeWindow,"native-child-team-picker");
  assert.notEqual(s.win.getComputedStyle(popup.overlay).display,"none");
  popup.overlay.setAttribute("inert","");
  assert.equal(s.win.getComputedStyle(popup.overlay).display,"none",
    "inert-only change must hide immediately without observer");
  s.app.reconcile();assert.equal(popup.overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  popup.overlay.removeAttribute("inert");
  teamScene._equipPicker=null;s.app.reconcile();
  assert.equal(popup.overlay.hasAttribute("data-ppbui-card-mode-window"),false);
});

test("Team's synchronous Moveset panel needs fresh provenance; unowned Ditto fails back to native Game",async t=>{
  const s=fixture(t);s.button("team").click();await pause(s.win);
  const trigger=s.doc.createElement("button");s.active._panel.body.append(trigger);
  const shells=[
    {cls:"pokeidle-panel moveset-window",kind:"native-child-team-moveset"},
  ];
  for(const {cls,kind} of shells){
    let overlay;
    trigger.addEventListener("click",function onClick(){
      trigger.removeEventListener("click",onClick);
      overlay=s.doc.createElement("div");overlay.className="pokeidle-panel-overlay";
      const panel=s.doc.createElement("div");panel.className=cls+" is-opening";
      panel.append(s.doc.createElement("div"));overlay.append(panel);s.doc.body.append(overlay);
      assert.equal(s.win.getComputedStyle(overlay).display,"block");
      panel.classList.remove("is-opening");
    });
    trigger.click();s.app.reconcile();
    assert.equal(overlay.dataset.ppbuiCardModeWindow,kind);
    overlay.remove();s.app.reconcile();
    assert.equal(overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  }
  const rogue=s.doc.createElement("div");rogue.className="pokeidle-panel-overlay";
  rogue.innerHTML='<div class="pokeidle-panel moveset-window"></div>';
  s.doc.body.append(rogue);s.app.reconcile();
  assert.equal(rogue.hasAttribute("data-ppbui-card-mode-window"),false);
  const ditto=s.doc.createElement("div");ditto.className="pokeidle-panel-overlay";
  ditto.innerHTML='<div class="pokeidle-panel game-window ditto-form-window"></div>';
  trigger.click();ditto.firstElementChild.classList.add("is-opening");
  s.doc.body.append(ditto);s.app.reconcile();
  assert.equal(ditto.hasAttribute("data-ppbui-card-mode-window"),false,
    "a generic Team action must never grant ownership to an opaque async Ditto child");
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
    "an ownerless Ditto panel cannot be left hidden as an active native modal");
  assert.notEqual(s.win.getComputedStyle(ditto).display,"none");
});

test("Team Ditto async native API keeps its form visible after arbitrary latency using Game pre-handler",async t=>{
  const s=fixture(t);s.button("team").click();await pause(s.win);
  const trigger=s.doc.createElement("button");trigger.className="pokeidle-btn team-ditto-transform";
  s.active._panel.body.append(trigger);
  let nativeHandlerMode, nativeCalls=0;
  trigger.addEventListener("click",()=>{
    nativeCalls++;
    nativeHandlerMode=s.doc.documentElement.dataset.ppbuiCardMode;
    // The real PI.DittoForms.open() awaits Api.getDittoForms BEFORE UIPanel.open().
  });
  trigger.click();
  assert.equal(nativeCalls,1,"original Team handler must run exactly once");
  assert.equal(nativeHandlerMode,"game",
    "an ownerless async Ditto form must switch Game BEFORE the native API request");
  assert.equal(s.toggle.getAttribute("aria-pressed"),"false");
  const overlay=s.doc.createElement("div");overlay.className="pokeidle-panel-overlay";
  const child=s.doc.createElement("section");child.className="pokeidle-panel game-window ditto-form-window";
  overlay.append(child);s.doc.body.append(overlay);
  s.app.reconcile();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  assert.equal(overlay.hasAttribute("data-ppbui-card-mode-window"),false,
    "Ditto has no public scene-owned handle and must not be fabricated as an owner");
  assert.notEqual(s.win.getComputedStyle(overlay).display,"none",
    "the native form must stay visible regardless of response latency");
  overlay.remove();
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  const foreign=s.doc.createElement("button");foreign.className="team-ditto-transform";
  s.doc.body.append(foreign);
  let foreignMode;
  foreign.addEventListener("click",()=>foreignMode=s.doc.documentElement.dataset.ppbuiCardMode);
  foreign.click();
  assert.equal(foreignMode,"cards","outside-Scene_Team lookalikes must not switch modes");
  trigger.dispatchEvent(new s.win.KeyboardEvent("keydown",{key:"Enter",bubbles:true}));
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
    "keyboard activation also reveals Game before the native Team handler");
});

test("late Ditto constructor is measurable and fails back to Game after premature Cards reentry or scene switch",async t=>{
  const s=fixture(t);s.button("team").click();await pause(s.win);
  const trigger=s.doc.createElement("button");trigger.className="pokeidle-btn team-ditto-transform";
  s.active._panel.body.append(trigger);
  trigger.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards",
    "without a native settle handle the user may toggle prematurely");
  // The independent async native callback can run after Team left the active
  // NonBlockingWindows stack. Do not depend on the original scene still owning
  // Card Mode's Team constructor CSS.
  s.open("storage");s.app.reconcile();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  const stale=s.doc.createElement("div");stale.className="pokeidle-panel-overlay";
  stale.hidden=true;
  stale.innerHTML='<section class="pokeidle-panel game-window ditto-form-window"></section>';
  s.doc.body.append(stale);s.app.reconcile();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards",
    "closed cached Ditto nodes must not trigger a false Game fallback");
  const portal=s.doc.createElement("div");portal.className="pokeidle-panel-overlay";
  const child=s.doc.createElement("section");
  child.className="pokeidle-panel game-window ditto-form-window is-opening";
  portal.append(child);s.doc.body.append(portal);
  assert.equal(s.win.getComputedStyle(portal).display,"block",
    "the native constructor must be measurable before its async popup gets any owner marker");
  child.classList.remove("is-opening");s.app.reconcile();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
    "new, unowned Ditto portal must not remain CSS-hidden or consume focus/Escape in Cards");
  assert.notEqual(s.win.getComputedStyle(portal).display,"none");
  assert.equal(portal.hasAttribute("data-ppbui-card-mode-window"),false,
    "fallback does not forge native portal ownership");
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
    "an open native Ditto modal blocks manual Cards reentry");
  portal.hidden=true;
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards",
    "after native modal dismissal, manual Cards is available again");
});

test("Hunts retains its exact mobile sheet and synchronously measured drop tooltip",async t=>{
  const s=fixture(t);s.button("hunts").click();await pause(s.win);
  const scene=s.active;
  const overlay=s.doc.createElement("div");overlay.className="pokeidle-mobile-sheet-overlay";
  const sheet=s.doc.createElement("section");sheet.className="pokeidle-mobile-sheet hunt-zone-sheet";
  overlay.append(sheet);s.doc.body.append(overlay);
  scene._zoneSheet={el:overlay,sheet,close(){overlay.remove();}};
  s.app.reconcile();
  assert.equal(overlay.dataset.ppbuiCardModeWindow,"native-child-hunt-zone");
  assert.notEqual(s.win.getComputedStyle(overlay).display,"none");
  const tooltip=s.doc.createElement("aside");tooltip.className="hunt-drop-tooltip hunt-world-drop-tooltip";
  s.doc.body.append(tooltip);scene._dropTooltip=tooltip;
  assert.equal(s.win.getComputedStyle(tooltip).display,"block",
    "native tooltip must not be measured at zero width while Cards is active");
  s.app.reconcile();
  assert.equal(tooltip.dataset.ppbuiCardModeWindow,"native-tooltip-hunts");
  tooltip.hidden=true;
  assert.equal(s.win.getComputedStyle(tooltip).display,"none");
  scene._zoneSheet.close();scene._zoneSheet=null;s.app.reconcile();
  assert.equal(overlay.hasAttribute("data-ppbui-card-mode-window"),false);
});

test("visible Team Pokémon hover can be positioned before reconciliation and is revoked on owner loss",async t=>{
  const s=fixture(t);s.button("team").click();await pause(s.win);
  const slot=s.doc.createElement("button");slot.className="team-slot";s.active._panel.body.append(slot);
  let hover;
  slot.addEventListener("pointerover",()=>{
    hover=s.doc.createElement("aside");hover.className="pokemon-card--hover";
    s.doc.body.append(hover);
    assert.equal(s.win.getComputedStyle(hover).display,"block");
  });
  slot.dispatchEvent(new s.win.Event("pointerover",{bubbles:true}));
  s.app.reconcile();
  assert.equal(hover.dataset.ppbuiCardModeWindow,"native-tooltip-team");
  const other=s.button("storage");other.click();await pause(s.win);
  assert.equal(hover.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.equal(s.win.getComputedStyle(hover).display,"none");
});

test("native keyboard focus hover appears before document focusin and never leaks into Storage",async t=>{
  const s=fixture(t);s.button("team").click();await pause(s.win);
  const slot=s.doc.createElement("button");slot.className="team-slot";
  s.active._panel.body.append(slot);
  const sharedHover=s.doc.createElement("aside");
  sharedHover.className="pokemon-card pokemon-card--hover";
  sharedHover.hidden=true;
  s.doc.body.append(sharedHover);
  let hostHides=0;
  s.win.PokeIdle.PokemonCard={hideHover(){hostHides++;sharedHover.hidden=true;}};
  slot.addEventListener("focus",()=>{
    // Native focus triggers PokemonCardHost.showHover() before focusin reaches
    // document capture and before Card Mode can observe the new portal state.
    sharedHover.hidden=false;
  });
  slot.focus();
  s.app.reconcile();
  assert.equal(sharedHover.dataset.ppbuiCardModeWindow,"native-tooltip-team");
  assert.equal(s.win.getComputedStyle(sharedHover).display,"block");
  s.button("storage").click();await pause(s.win);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(sharedHover.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.equal(sharedHover.hidden,true,"native shared hover is hidden on scene owner loss");
  assert.equal(s.win.getComputedStyle(sharedHover).display,"none");
  assert.ok(hostHides>=1);
});

test("unrelated focus or pointer inside Team never authorizes an unowned Pokémon hover",async t=>{
  const s=fixture(t);s.button("team").click();await pause(s.win);
  const unrelated=s.doc.createElement("button");unrelated.className="team-actions";
  s.active._panel.body.append(unrelated);
  const hover=s.doc.createElement("aside");hover.className="pokemon-card--hover";
  hover.hidden=true;s.doc.body.append(hover);
  unrelated.addEventListener("focus",()=>{hover.hidden=false;});
  unrelated.focus();s.app.reconcile();
  assert.equal(hover.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.equal(hover.hidden,true,"foreign hover cannot remain exposed as a native Team portal");
});

test("user-disabled native Pokémon hover remains suppressed across Game, Cards, Team and Storage",async t=>{
  const s=fixture(t,{disableHover:true});
  assert.equal(s.doc.body.hasAttribute("data-ppbui-pokemon-hover-disabled"),true,
    "optional hover preference is still mounted while Cards is active");
  assert.equal(s.doc.querySelector('style[data-ppbui-style="pokemon-hover"]')!==null,true);
  for(const id of ["team","storage"]){
    s.button(id).click();await pause(s.win);
    const slot=s.doc.createElement("button");
    slot.className=id==="team"?"team-slot":"pokecentro-transfer-slot";
    s.active._panel.body.append(slot);
    const hover=s.doc.createElement("aside");
    hover.className="pokemon-card pokemon-card--hover";
    s.doc.body.append(hover);
    slot.dispatchEvent(new s.win.Event("pointerover",{bubbles:true}));
    s.app.reconcile();
    assert.equal(s.win.getComputedStyle(hover).display,"none",
      `Disable Pokémon hover must override Cards premeasurement for ${id}`);
    hover.remove();
  }
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  assert.equal(s.doc.body.hasAttribute("data-ppbui-pokemon-hover-disabled"),true);
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.doc.body.hasAttribute("data-ppbui-pokemon-hover-disabled"),true);
});

test("changing toolbar destination with a live detached native child falls back before native handler",async t=>{
  const s=fixture(t);s.button("team").click();await pause(s.win);
  const team=s.active;
  const overlay=s.doc.createElement("div");overlay.className="pokeidle-panel-overlay";
  const panel=s.doc.createElement("div");panel.className="pokeidle-panel team-equip-picker game-window";
  const body=s.doc.createElement("div");body.className="pokeidle-panel__body";
  panel.append(body);overlay.append(panel);s.doc.body.append(overlay);
  team._equipPicker={overlay,el:panel,body,isVisible:()=>true};
  s.app.reconcile();
  assert.equal(overlay.dataset.ppbuiCardModeWindow,"native-child-team-picker");
  s.button("storage").click();await pause(s.win);
  assert.equal(s.observed.at(-1).mode,"game",
    "native toolbar must never open its next scene while a detached child is hidden behind Cards");
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  assert.notEqual(s.win.getComputedStyle(overlay).display,"none",
    "native UI owns the still-visible child and its Escape stack in Game mode");
});

test("closing a native scene behind its still-live detached child fails back to Game on reconciliation",async t=>{
  const s=fixture(t);s.button("team").click();await pause(s.win);
  const team=s.active;
  const overlay=s.doc.createElement("div");overlay.className="pokeidle-panel-overlay";
  const panel=s.doc.createElement("div");panel.className="pokeidle-panel team-equip-picker game-window";
  const body=s.doc.createElement("div");body.className="pokeidle-panel__body";
  panel.append(body);overlay.append(panel);s.doc.body.append(overlay);
  team._equipPicker={overlay,el:panel,body,isVisible:()=>true};
  s.app.reconcile();
  s.win.PokeIdle.ReactiveWindows.close();
  s.app.reconcile();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
    "do not retain Cards when native UIPanel.isVisible still reports a live child after parent closed");
  assert.notEqual(s.win.getComputedStyle(overlay).display,"none");
  assert.equal(overlay.hasAttribute("data-ppbui-card-mode-window"),false);
});

test("native Team picker closing API is invoked once on parent exit and keeps Cards usable",async t=>{
  const s=fixture(t);s.button("team").click();await pause(s.win);
  const scene=s.active;
  const overlay=s.doc.createElement("div");overlay.className="pokeidle-panel-overlay";
  const panel=s.doc.createElement("div");panel.className="pokeidle-panel team-equip-picker game-window";
  const body=s.doc.createElement("div");body.className="pokeidle-panel__body";
  panel.append(body);overlay.append(panel);s.doc.body.append(overlay);
  scene._equipPicker={overlay,el:panel,body,isVisible:()=>true};
  let closes=0;
  scene.closeEquipPicker=()=>{
    closes++;
    scene._equipPicker=null;
    overlay.remove();
  };
  s.app.reconcile();
  assert.equal(overlay.dataset.ppbuiCardModeWindow,"native-child-team-picker");
  s.win.PokeIdle.ReactiveWindows.close();
  s.app.reconcile();
  s.app.reconcile();
  assert.equal(closes,1,"native close is idempotent across repeated Cards reconciliation");
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(overlay.isConnected,false);
  assert.equal(s.win.getComputedStyle(s.doc.querySelector("#native-renderer")).display,"none");
});

test("native Hunts mobile sheet uses scene closeZoneSheet on parent exit before switching Game",async t=>{
  const s=fixture(t);s.button("hunts").click();await pause(s.win);
  const scene=s.active,overlay=s.doc.createElement("div");
  overlay.className="pokeidle-mobile-sheet-overlay";
  const sheet=s.doc.createElement("section");sheet.className="pokeidle-mobile-sheet hunt-zone-sheet";
  overlay.append(sheet);s.doc.body.append(overlay);
  scene._zoneSheet={el:overlay,sheet,close(){overlay.remove();}};
  let closed=0;
  scene.closeZoneSheet=reason=>{
    assert.equal(reason,"parent-close");
    closed++;
    scene._zoneSheet?.close();
    scene._zoneSheet=null;
  };
  s.app.reconcile();
  assert.equal(overlay.dataset.ppbuiCardModeWindow,"native-child-hunt-zone");
  s.win.PokeIdle.ReactiveWindows.close();s.app.reconcile();
  assert.equal(closed,1);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(overlay.isConnected,false);
});

test("native minimized dock admits only exact verified cached buttons and restores Cards without duplicate windows",async t=>{
  const s=fixture(t);
  const dock=s.doc.createElement("nav");dock.className="pokeidle-minimized-windows";
  s.doc.body.append(dock);
  const entries=[];
  for(const id of ["team","storage"]){
    s.button(id).click();await pause(s.win);
    const scene=s.active,button=s.doc.createElement("button");
    button.textContent="Restore "+id;
    button.addEventListener("click",()=>{
      s.setActive(scene);
      scene._panel.overlay.hidden=false;
      button.remove();
      scene._panel._minimizedButton=null;
    });
    dock.append(button);
    scene._panel._minimizedButton=button;
    scene._panel.overlay.hidden=true;
    s.setActive(null);
    entries.push({id,scene,button});
  }
  s.app.reconcile();
  assert.equal(dock.dataset.ppbuiCardModeWindow,"native-minimized");
  assert.notEqual(s.win.getComputedStyle(dock).display,"none");
  const foreign=s.doc.createElement("button");foreign.textContent="Unrelated";
  dock.append(foreign);s.app.reconcile();
  assert.equal(dock.hasAttribute("data-ppbui-card-mode-window"),false,
    "mixed native dock must fail closed rather than reveal an unverified restore");
  assert.equal(s.win.getComputedStyle(dock).display,"none");
  foreign.remove();s.app.reconcile();
  assert.equal(dock.dataset.ppbuiCardModeWindow,"native-minimized");
  entries[0].button.click();s.app.reconcile();
  assert.equal(s.active,entries[0].scene);
  assert.equal(s.active._panel.overlay.dataset.ppbuiCardModeWindow,"native-team");
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.cache.get(s.classes.get("team")),entries[0].scene);
  assert.equal(dock.dataset.ppbuiCardModeWindow,"native-minimized",
    "remaining verified native minimized button stays reachable");
  entries[1].button.click();s.app.reconcile();
  assert.equal(s.active,entries[1].scene);
  assert.equal(dock.hasAttribute("data-ppbui-card-mode-window"),false);
});

test("keyboard native scene shortcut opens without a toolbar click, then closes on native owner release",async t=>{
  const s=fixture(t),Scene=s.classes.get("encyclopedia");
  let launches=0;
  s.win.addEventListener("keydown",event=>{
    if(event.key!=="k")return;
    launches++;
    s.win.SceneManager.push(Scene);
  },true);
  s.win.dispatchEvent(new s.win.KeyboardEvent("keydown",{key:"k"}));
  await pause(s.win);
  assert.equal(launches,1);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.active._panel.overlay.dataset.ppbuiCardModeWindow,"native-encyclopedia");
  assert.equal(s.win.getComputedStyle(s.doc.querySelector("#native-renderer")).display,"none");
  s.win.PokeIdle.ReactiveWindows.close();
  s.app.reconcile();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.active,null);
});

test("unavailable, hidden and inaccessible native actions never force Game or bypass their original handler",async t=>{
  const s=fixture(t),button=s.button("settings");
  let clicks=0;
  button.addEventListener("click",()=>clicks++);
  button.setAttribute("aria-disabled","true");
  button.click();await pause(s.win);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(clicks,1,"native handler still decides how to reject an aria-disabled action");
  assert.equal(s.active,null);
  button.removeAttribute("aria-disabled");
  button.hidden=true;
  button.click();await pause(s.win);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  button.hidden=false;
  button.setAttribute("inert","");
  button.click();await pause(s.win);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  button.removeAttribute("inert");
  button.disabled=true;
  button.click();await pause(s.win);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.active,null);
  button.disabled=false;
  button.click();await pause(s.win);
  assert.equal(s.active?.constructor,s.classes.get("settings"));
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
});

test("Settings logout navigation to a non-Map scene reveals the native renderer without replaying a click",async t=>{
  const s=fixture(t);s.button("settings").click();await pause(s.win);
  const before=s.observed.length;
  class SceneLogin {}
  s.win.SceneManager._nextScene=new SceneLogin();
  s.app.reconcile();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
    "native SceneManager.goto(Scene_Login) must not leave Login hidden behind Cards");
  assert.equal(s.toggle.getAttribute("aria-pressed"),"false");
  assert.equal(s.observed.length,before,"navigation guard never clicks native Settings or logout again");
  assert.notEqual(s.win.getComputedStyle(s.doc.querySelector("#native-renderer")).display,"none");
});

test("native Map-to-Map transition does not mistake a compatible Hunt return for Login",async t=>{
  const s=fixture(t);s.button("hunts").click();await pause(s.win);
  s.win.SceneManager._nextScene=new s.win.Scene_Map();
  s.app.reconcile();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.active._panel.overlay.dataset.ppbuiCardModeWindow,"native-hunts");
});

test("native Login scene always exits Cards even if ReactiveWindows.active is stale and hidden",async t=>{
  const s=fixture(t);s.button("team").click();await pause(s.win);
  assert.equal(s.active._panel.overlay.dataset.ppbuiCardModeWindow,"native-team");
  s.active._panel.overlay.hidden=true;
  class SceneLogin {}
  s.win.SceneManager._scene=new SceneLogin();
  s.win.SceneManager._nextScene=null;
  // Native NonBlockingWindows may retain a stale truthy active stack pointer.
  assert.ok(s.win.PokeIdle.ReactiveWindows.active());
  s.app.reconcile();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  assert.equal(s.toggle.getAttribute("aria-pressed"),"false");
  assert.notEqual(s.win.getComputedStyle(s.doc.querySelector("#native-renderer")).display,"none");
});

test("Game to Cards toggle refuses Login and pending non-Map navigation synchronously",async t=>{
  const s=fixture(t),renderer=s.doc.querySelector("#native-renderer");
  s.button("settings").click();await pause(s.win);
  const stale=s.active;
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  // Login transition can leave the original toolbar and stale native stack
  // briefly mounted. The toggle must never conceal authentication even for a
  // single paint while waiting for observer or analyzer polling.
  class SceneLogin {}
  s.win.SceneManager._scene=new SceneLogin();
  s.win.SceneManager._nextScene=null;
  assert.equal(s.active,stale);
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  assert.equal(s.toggle.getAttribute("aria-pressed"),"false");
  assert.notEqual(s.win.getComputedStyle(renderer).display,"none");
  s.win.SceneManager._scene=new s.win.Scene_Map();
  s.win.SceneManager._nextScene=new SceneLogin();
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
    "a scheduled native Login transition must be guarded before the new scene is painted");
  assert.notEqual(s.win.getComputedStyle(renderer).display,"none");
  s.win.SceneManager._nextScene=null;
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards",
    "returning to a valid Map scene restores deliberate Cards toggle");
});

test("Phase-A top toolbar inset clamps only a normalized native panel and restores its exact original geometry",async t=>{
  const s=fixture(t);s.button("encyclopedia").click();await pause(s.win);
  const panel=s.active._panel.el;
  Object.defineProperty(s.win,"innerWidth",{configurable:true,value:320});
  s.doc.querySelector(".pokeidle-top-toolbar").getBoundingClientRect=()=>
    ({top:8,bottom:114,left:8,right:312,width:304,height:106});
  panel.style.transform="none";panel.style.top="15px";
  panel.getBoundingClientRect=()=>({top:Number.parseFloat(panel.style.top),left:8,width:298,height:430,bottom:430});
  s.app.reconcile();
  assert.equal(s.doc.documentElement.style.getPropertyValue("--ppbui-card-mode-window-top-inset"),"122px");
  assert.equal(panel.style.top,"122px","native titlebar must begin below an admitted top-docked toolbar");
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  s.toggle.click();
  assert.equal(panel.style.top,"15px","returning Game restores original UIPanel inline top");
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
});

test("Phase-A mobile top clamp is restored in the SAME reconciliation that re-admits an obscured native owner",async t=>{
  const s=fixture(t);s.button("encyclopedia").click();await pause(s.win);
  const scene=s.active,overlay=scene._panel.overlay,panel=scene._panel.el;
  Object.defineProperty(s.win,"innerWidth",{configurable:true,value:320});
  s.doc.querySelector(".pokeidle-top-toolbar").getBoundingClientRect=()=>
    ({top:8,bottom:114,left:8,right:312,width:304,height:106});
  panel.style.transform="none";panel.style.top="14px";
  panel.getBoundingClientRect=()=>{
    // Real browser CSS hides the unmarked native root until windows.sync grants
    // its verified scene marker. Geometry is 0x0 before that authorization.
    const hidden=s.win.getComputedStyle(overlay).display==="none";
    const top=hidden?0:Number.parseFloat(panel.style.top);
    return {top,left:12,bottom:top+(hidden?0:430),right:308,width:hidden?0:296,height:hidden?0:430};
  };
  s.app.reconcile();
  assert.equal(panel.style.top,"122px");
  s.setActive(new s.win.Scene_MenuBase());s.app.reconcile();
  assert.equal(overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.equal(panel.style.top,"14px","revoke restores original native geometry");
  s.setActive(scene);s.app.reconcile();
  assert.equal(overlay.dataset.ppbuiCardModeWindow,"native-encyclopedia");
  assert.equal(panel.style.top,"122px","first restored paint cannot hide Close below the top toolbar");
});

test("Phase-A clamp gives way to a later user-owned native drag and never overrides it on cleanup",async t=>{
  const s=fixture(t);s.button("team").click();await pause(s.win);
  const panel=s.active._panel.el;
  Object.defineProperty(s.win,"innerWidth",{configurable:true,value:320});
  s.doc.querySelector(".pokeidle-top-toolbar").getBoundingClientRect=()=>
    ({top:8,bottom:114,left:8,right:312,width:304,height:106});
  panel.style.transform="none";panel.style.top="15px";
  panel.getBoundingClientRect=()=>({top:Number.parseFloat(panel.style.top),left:8,width:298,height:430,bottom:430});
  s.app.reconcile();assert.equal(panel.style.top,"122px");
  panel.style.top="139px";
  s.app.reconcile();
  assert.equal(panel.style.top,"139px","native drag takes precedence over our initial safe-area clamp");
  s.toggle.click();
  assert.equal(panel.style.top,"139px","cleanup must not move a user-positioned native panel");
});
