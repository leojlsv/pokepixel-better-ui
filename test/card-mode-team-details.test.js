import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createCardModeModule } from "../src/modules/card-mode/index.js";

function fixture(t,{sheet=false,foreign=false,changeSelection=false,stopBubble=false}={}) {
  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <main id="game-renderer"><canvas></canvas></main>
    <nav class="pokeidle-top-toolbar"><button data-menu-id="team">Team</button></nav>
  </body></html>`,{url:"https://pokepixel.nietore.com/play/",pretendToBeVisual:true});
  const win=dom.window,doc=win.document,previous=new Map();
  for(const name of ["window","document","MutationObserver","requestAnimationFrame","cancelAnimationFrame"]){
    previous.set(name,Object.getOwnPropertyDescriptor(globalThis,name));
    Object.defineProperty(globalThis,name,{configurable:true,
      value:typeof win[name]==="function"&&name!=="MutationObserver"?win[name].bind(win):win[name]});
  }
  class SceneMap{}
  class SceneMenuBase{}
  class SceneTeam extends SceneMenuBase{}
  win.Scene_Map=SceneMap;win.Scene_MenuBase=SceneMenuBase;win.Scene_Team=SceneTeam;
  let active=null,createdCount=0,z=0,originalCalls=0;
  const pins=new Map(),creatures=[{id:"one",name:"Starmie"},{id:"two",name:"Charizard"}];
  const makeShell=id=>{
    const shell=doc.createElement("div");
    shell.className=sheet?"pokemon-card-shell is-sheet":"pokemon-card-shell";
    const card=doc.createElement("aside");
    card.className=sheet?"pokemon-card pokemon-card--sheet":"pokemon-card pokemon-card--pinned";
    const close=doc.createElement("button");
    close.className="pokemon-card__control is-close";close.textContent="×";
    close.addEventListener("click",()=>{shell.remove();pins.delete(id);});
    card.append(close);shell.append(card);doc.body.append(shell);
    shell.dataset.constructorDisplay=win.getComputedStyle(shell).display;
    createdCount++;
    return shell;
  };
  const host={
    isPinned:id=>pins.has(String(id)),
    open(creature){
      originalCalls++;
      const id=String(creature.id);
      let shell=pins.get(id);
      if(!shell){shell=makeShell(id);pins.set(id,shell);}
      shell.style.zIndex=String(++z+2147483200);
      if(foreign){
        const fake=doc.createElement("div");
        fake.className="pokemon-card-shell";
        fake.innerHTML='<aside class="pokemon-card pokemon-card--pinned"><button class="pokemon-card__control is-close">×</button></aside>';
        doc.body.append(fake);
      }
      return true;
    },
    closeCard(id){const shell=pins.get(id);if(!shell)return false;shell.remove();pins.delete(id);return true;},
  };
  win.PokeIdle={
    PokemonCardHost:host,PokemonCard:{open:c=>host.open(c)},
    ReactiveWindows:{active:()=>active,cached:()=>active?[active]:[]},
  };
  win.SceneManager={_scene:new SceneMap(),_nextScene:null,push(Scene){
    if(Scene!==SceneTeam)return;
    if(active){active._panel.overlay.hidden=true;active=null;return;}
    const overlay=doc.createElement("div");overlay.className="pokeidle-panel-overlay";
    const panel=doc.createElement("section");
    panel.className="pokeidle-panel pokeidle-team-panel is-opening";
    const body=doc.createElement("div");body.className="pokeidle-panel__body";
    panel.append(body);overlay.append(panel);doc.body.append(overlay);
    panel.classList.remove("is-opening");
    const scene=new SceneTeam();
    scene._panel={overlay,el:panel,body,isVisible:()=>!overlay.hidden};
    scene._creatures=creatures;scene._selectedId="one";
    const actions=doc.createElement("div");actions.className="team-actions";
    const details=doc.createElement("button");details.className="pokeidle-btn";details.textContent="Details";
    details.addEventListener("click",event=>{
      const creature=scene._creatures.find(item=>item.id===scene._selectedId);
      host.open(creature);
      if(changeSelection)scene._selectedId="two";
      if(stopBubble)event.stopPropagation();
    });
    const remove=doc.createElement("button");remove.className="pokeidle-btn pokeidle-btn--danger";
    remove.textContent="Remove";remove.addEventListener("click",()=>{});
    actions.append(details,remove);body.append(actions);active=scene;
  }};
  doc.querySelector('[data-menu-id="team"]').addEventListener("click",()=>win.SceneManager.push(SceneTeam));
  const app=createBetterUI({modules:[createCardModeModule()]});
  app.start();const toggle=doc.querySelector("[data-ppbui-card-mode-toggle]");
  toggle.click();doc.querySelector('[data-menu-id="team"]').click();app.reconcile();
  const current=()=>active,details=()=>current()?._panel.body.querySelector(".team-actions > button:nth-last-child(2)");
  t.after(()=>{app.stop();dom.window.close();
    for(const [name,d] of previous)if(d)Object.defineProperty(globalThis,name,d);else delete globalThis[name];
  });
  return {win,doc,app,host,toggle,current,details,pins,
    get createdCount(){return createdCount;},
    get originalCalls(){return originalCalls;}};
}

for(const sheet of [false,true]){
  test(`original native Team Details creates exact visible pinned ${sheet?"sheet":"desktop"} above Cards and survives scene change`,async t=>{
    const s=fixture(t,{sheet});
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
    s.details().click();
    const shell=s.pins.get("one");
    assert.ok(shell);assert.equal(s.originalCalls,1);
    assert.equal(s.createdCount,1);
    assert.equal(shell.dataset.constructorDisplay,"block","native initial geometry is never measured under display:none");
    assert.equal(shell.getAttribute("data-ppbui-card-mode-window"),"native-team-details");
    assert.notEqual(s.win.getComputedStyle(shell).display,"none");
    assert.equal(s.doc.documentElement.hasAttribute("data-ppbui-card-mode-team-details-opening"),false);
    s.app.reconcile();
    assert.equal(shell.getAttribute("data-ppbui-card-mode-window"),"native-team-details");
    s.win.SceneManager.push(s.win.Scene_Team);
    s.app.reconcile();
    assert.equal(shell.getAttribute("data-ppbui-card-mode-window"),"native-team-details",
      "host pinned cards live across scene switches");
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
    shell.querySelector(".is-close").click();
    s.app.reconcile();
    assert.equal(s.doc.querySelector(".pokemon-card-shell"),null);
  });
}

test("reopening same pinned id raises existing exact shell without a second native handler or duplicate marker",t=>{
  const s=fixture(t);
  s.details().click();
  const shell=s.pins.get("one"),z=shell.style.zIndex;
  s.details().click();
  assert.equal(s.originalCalls,2,"one host call for each real button gesture");
  assert.equal(s.createdCount,1);
  assert.ok(Number(shell.style.zIndex)>Number(z));
  assert.equal(shell.getAttribute("data-ppbui-card-mode-window"),"native-team-details");
  assert.equal(s.doc.querySelectorAll('[data-ppbui-card-mode-window="native-team-details"]').length,1);
});

test("ambiguous simultaneously created matching shells cannot gain Team Details ownership",t=>{
  const s=fixture(t,{foreign:true});
  s.details().click();
  assert.equal(s.originalCalls,1);
  assert.equal(s.doc.querySelectorAll('[data-ppbui-card-mode-window="native-team-details"]').length,0);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
    "if native source cannot prove one exact pinned shell, retain the native card visibly in Game");
});

test("unrelated Team Remove and lookalike body card never promote any pinned marker",t=>{
  const s=fixture(t);
  const fake=s.doc.createElement("div");fake.className="pokemon-card-shell";
  fake.innerHTML='<aside class="pokemon-card pokemon-card--pinned"><button class="pokemon-card__control is-close">×</button></aside>';
  s.doc.body.append(fake);
  s.current()._panel.body.querySelector(".team-actions > button:last-child").click();
  s.app.reconcile();
  assert.equal(s.originalCalls,0);
  assert.equal(fake.hasAttribute("data-ppbui-card-mode-window"),false);
});

test("two different genuine pinned card ids retain independent provenance and revoke only after native Close",t=>{
  const s=fixture(t);
  s.details().click();
  const first=s.pins.get("one");
  s.current()._selectedId="two";
  s.details().click();
  const second=s.pins.get("two");
  assert.equal(s.originalCalls,2);
  assert.notEqual(first,second);
  assert.equal(first.getAttribute("data-ppbui-card-mode-window"),"native-team-details");
  assert.equal(second.getAttribute("data-ppbui-card-mode-window"),"native-team-details");
  s.host.closeCard("one");s.app.reconcile();
  assert.equal(first.isConnected,false);
  assert.equal(second.getAttribute("data-ppbui-card-mode-window"),"native-team-details");
  s.host.closeCard("two");s.app.reconcile();
  assert.equal(second.isConnected,false);
});

test("native Team switching selected member inside Details handler fails to Game rather than hiding live pin",t=>{
  const s=fixture(t,{changeSelection:true});
  s.details().click();
  assert.equal(s.originalCalls,1);
  assert.ok(s.pins.get("one")?.isConnected);
  assert.equal(s.pins.get("one")?.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
});

test("native Details stopPropagation still completes exact pin on next task without replay",async t=>{
  const s=fixture(t,{stopBubble:true});
  s.details().click();
  assert.equal(s.originalCalls,1);
  await new Promise(resolve=>s.win.setTimeout(resolve,12));
  const pinned=s.pins.get("one");
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(pinned?.getAttribute("data-ppbui-card-mode-window"),"native-team-details");
  assert.equal(s.doc.documentElement.hasAttribute("data-ppbui-card-mode-team-details-opening"),false);
});
