import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createCardModeModule } from "../src/modules/card-mode/index.js";
import { createPokemonHoverModule } from "../src/modules/pokemon-hover/index.js";
import { cardModeConfig as config } from "../src/modules/card-mode/config.js";
import { nativeMenuAvailableInCardMode } from "../src/modules/card-mode/native-menu-contracts.js";

const menus=config.windows.nativeMenusWaveB2;
const marker=config.windows.marker;
const tick=win=>new Promise(resolve=>win.setTimeout(resolve,15));

function fixture(t,{disableHover=false}={}){
  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <main id="game-renderer"><canvas></canvas></main>
    <nav class="pokeidle-top-toolbar">${Object.keys(menus).map(id=>`<button data-menu-id="${id}">${id}</button>`).join("")}</nav>
  </body></html>`,{url:"https://pokepixel.nietore.com/play/",pretendToBeVisual:true});
  const win=dom.window,doc=win.document,globals=new Map();
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
  const cache=new Map(),scenes=new Map(),creates=[],events=[],counts=new Map();
  const createScene=Scene=>{
    const [id,descriptor]=Object.entries(menus).find(([,contract])=>win[contract.scene]===Scene);
    const overlay=doc.createElement("div");overlay.className="pokeidle-panel-overlay";
    const panel=doc.createElement("section");
    panel.className=`${descriptor.panel.split(".").filter(Boolean).join(" ")} is-opening`;
    const body=doc.createElement("div");body.className="pokeidle-panel__body";
    panel.append(body);overlay.append(panel);doc.body.append(overlay);
    const constructionDisplay=win.getComputedStyle(overlay).display;
    const beforeMarker=overlay.getAttribute(marker);
    panel.classList.remove("is-opening");
    const scene=new Scene();scene._panel={overlay,el:panel,body,isVisible:()=>!overlay.hidden};
    cache.set(Scene,scene);creates.push({id,scene,overlay,panel,constructionDisplay,beforeMarker});
    return scene;
  };
  for(const [id,descriptor] of Object.entries(menus)){
    const Scene=class extends SceneMenuBase {};
    win[descriptor.scene]=Scene;scenes.set(id,Scene);
    doc.querySelector(`[data-menu-id="${id}"]`).addEventListener("click",()=>{
      events.push({id,phase:"native",mode:doc.documentElement.dataset.ppbuiCardMode});
      counts.set(id,(counts.get(id)||0)+1);
      if(active instanceof SceneTrade)return;
      win.SceneManager.push(Scene);
    });
  }
  win.SceneManager={_scene:new SceneMap(),_nextScene:null,push(Scene){
    if(active?._panel?.overlay)active._panel.overlay.hidden=true;
    const scene=cache.get(Scene)||createScene(Scene);
    scene._panel.overlay.hidden=false;
    active=scene;
    return scene;
  }};
  win.PokeIdle={
    ReactiveWindows:{active:()=>active,cached:()=>[...cache.values()]},
    PokemonCard:{hideHover:()=>{
      for(const node of doc.body.querySelectorAll(":scope > .pokemon-card--hover"))node.hidden=true;
    }},
    HuntAnalyzerMini:{enabled:false,root:null},
  };
  const app=createBetterUI({modules:[createCardModeModule(),...(disableHover?[createPokemonHoverModule(doc)]:[])]});
  app.start();
  const toggle=doc.querySelector("[data-ppbui-card-mode-toggle]");toggle.click();
  assert.equal(doc.documentElement.dataset.ppbuiCardMode,"cards");
  t.after(()=>{
    app.stop();dom.window.close();
    for(const [name,descriptor] of globals){
      if(descriptor)Object.defineProperty(globalThis,name,descriptor);
      else delete globalThis[name];
    }
  });
  return {
    win,doc,app,toggle,cache,scenes,events,creates,counts,
    button:id=>doc.querySelector(`[data-menu-id="${id}"]`),
    open:id=>win.SceneManager.push(scenes.get(id)),
    setActive:scene=>{active=scene;},
    get active(){return active;},
  };
}

test("eight compatible B2 scene contracts are exact and preserve the six PO Game exceptions",()=>{
  assert.deepEqual(Object.keys(menus).sort(),[
    "friends","guild","hunt-analyzer","market","premium","professions","promotion","shared-stones"]);
  for(const id of [...Object.keys(config.windows.gameOnlyHud),"gyms"])
    assert.equal(Object.hasOwn(menus,id),false,`${id} is never an overlay contract`);
});

test("all eight B2 native scenes show original UIPanels over Cards with exact ownership",async t=>{
  const s=fixture(t),renderer=s.doc.querySelector("#game-renderer");
  for(const id of Object.keys(menus)){
    s.button(id).click();await tick(s.win);
    assert.equal(s.events.at(-1)?.mode,"cards",`${id} original native handler sees Cards`);
    assert.equal(s.counts.get(id),1,"native click executes once");
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
    const record=s.creates.at(-1);
    assert.equal(record.id,id);
    assert.notEqual(record.constructionDisplay,"none","exact native panel measures while is-opening");
    assert.equal(record.beforeMarker,null,"construction is not an owner grant");
    assert.equal(record.overlay.getAttribute(marker),`native-${id}`);
    assert.equal(nativeMenuAvailableInCardMode(record.panel,id),true);
    assert.notEqual(s.win.getComputedStyle(record.overlay).display,"none");
    assert.equal(s.win.getComputedStyle(renderer).display,"none","renderer remains suppressed");
    assert.equal(s.toggle.getAttribute("aria-pressed"),"true");
  }
  assert.equal(s.creates.length,Object.keys(menus).length);
  for(const record of s.creates.slice(0,-1)){
    assert.equal(record.overlay.hidden,true);
    assert.equal(record.overlay.hasAttribute(marker),false,"hidden cache cannot remain a Cards owner");
  }
  s.button("friends").click();await tick(s.win);
  assert.equal(s.creates.length,Object.keys(menus).length,"native cache retains original scene instead of cloning panel");
  assert.equal(s.active,s.cache.get(s.scenes.get("friends")));
  assert.equal(s.active._panel.overlay.getAttribute(marker),"native-friends");
});

test("Market, Guild, Promotion and Premium keep roots on Cards but sensitive native controls reveal Game before dispatch",async t=>{
  const samples=[
    ["market","market-global__buy"],
    ["market","pokeidle-btn pokeidle-btn--primary","market-listing__actions"],
    ["market","market-offer-block"],
    ["market","pokeidle-btn","market-sent-offer-row__actions"],
    ["market","pokeidle-btn pokeidle-btn--primary","market-order-card"],
    ["market","pokeidle-btn pokeidle-btn--primary","market-create-form"],
    ["guild","pokeidle-btn","guild-mmo-hero__actions"],
    ["guild","pokeidle-btn","guild-mmo-actions","third-from-last"],
    ["promotion","pokeidle-btn pokeidle-btn--primary","merit-card"],
    ["premium","premium-product__buy"],
  ];
  for(const [id,classes,parentClass,placement] of samples){
    await t.test(`${id}/${classes}/${parentClass||"direct"}`,async t=>{
      const s=fixture(t);s.button(id).click();await tick(s.win);
      const pane=s.active._panel.body;
      const holder=s.doc.createElement("div");holder.className=parentClass||"native-actions";
      const native=s.doc.createElement("button");native.className=classes;
      if(placement==="third-from-last"){
        holder.append(native,s.doc.createElement("button"),s.doc.createElement("button"));
      }else holder.append(native);
      pane.append(holder);
      if(id==="market")s.active._tab="browse";
      let modeAtHandler="",calls=0;
      native.addEventListener("click",()=>{
        calls++;modeAtHandler=s.doc.documentElement.dataset.ppbuiCardMode;
      });
      native.click();
      assert.equal(calls,1,"original native handler executes once");
      assert.equal(modeAtHandler,"game");
      assert.equal(holder.hasAttribute(marker),false,"native control does not grant modal ownership");
    });
  }
});

test("benign Market Details, Guild dismissal and Premium owned navigation stay in Cards",async t=>{
  for(const {id,parent,buttonClass,label,tab,extra} of [
    {id:"market",parent:"market-listing__actions",buttonClass:"pokeidle-btn pokeidle-btn--primary",tab:"mine"},
    {id:"guild",parent:"guild-mmo-actions",buttonClass:"pokeidle-btn"},
    {id:"premium",parent:"premium-product is-owned is-skin",buttonClass:"premium-product__buy",label:"Abrir perfil"},
    {id:"premium",parent:"premium-product is-owned is-cosmetic",buttonClass:"premium-product__buy",label:"Open profile"},
  ]){
    await t.test(`${id}/${label||parent}`,async t=>{
      const s=fixture(t);s.button(id).click();await tick(s.win);
      const holder=s.doc.createElement(id==="premium"?"article":"div");holder.className=parent;
      const native=s.doc.createElement("button");native.className=buttonClass;
      if(label)native.textContent=label;
      holder.append(native);s.active._panel.body.append(holder);
      if(tab)s.active._tab=tab;
      let count=0,mode;
      native.addEventListener("click",()=>{count++;mode=s.doc.documentElement.dataset.ppbuiCardMode;});
      native.click();assert.equal(count,1);assert.equal(mode,"cards");
      assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
    });
  }
});

test("Premium transfer Enter-submit reveals Game before native form handler, disabled form remains Cards",async t=>{
  const s=fixture(t);s.button("premium").click();await tick(s.win);
  const body=s.doc.createElement("div");body.className="premium-modal__body";
  const form=s.doc.createElement("form");
  const input=s.doc.createElement("input");input.className="premium-form-input";
  const submit=s.doc.createElement("button");submit.className="premium-modal__submit";submit.type="submit";
  form.append(input,submit);body.append(form);s.active._panel.body.append(body);
  let calls=0,mode;
  form.addEventListener("submit",event=>{
    event.preventDefault();calls++;mode=s.doc.documentElement.dataset.ppbuiCardMode;
  });
  submit.disabled=true;
  form.dispatchEvent(new s.win.Event("submit",{bubbles:true,cancelable:true}));
  assert.equal(mode,"cards");
  submit.disabled=false;
  form.dispatchEvent(new s.win.Event("submit",{bubbles:true,cancelable:true}));
  assert.equal(mode,"game");assert.equal(calls,2);
});

test("Market's exact native mobile listing sheet routes purchase through Game but rejects foreign sheets",async t=>{
  const s=fixture(t),scene=s.open("market");scene._tab="buy";s.app.reconcile();
  const makeSheet=()=>{
    const el=s.doc.createElement("div");el.className="pokeidle-mobile-sheet-overlay";
    const sheet=s.doc.createElement("section");sheet.className="pokeidle-mobile-sheet market-listing-sheet";
    const body=s.doc.createElement("main");body.className="pokeidle-mobile-sheet__body";
    sheet.append(body);el.append(sheet);s.doc.body.append(el);
    return {el,sheet,body};
  };
  const falseSheet=makeSheet(),foreign=s.doc.createElement("button");
  foreign.className="market-global__buy";falseSheet.body.append(foreign);
  let nativeMode=null,calls=0;
  foreign.addEventListener("click",()=>{nativeMode=s.doc.documentElement.dataset.ppbuiCardMode;calls++;});
  foreign.click();assert.equal(calls,1);assert.equal(nativeMode,"cards");
  assert.equal(falseSheet.el.hasAttribute(marker),false);
  falseSheet.el.remove();
  const owner=makeSheet();scene._listingSheet=owner;s.app.reconcile();
  assert.equal(owner.el.getAttribute(marker),"native-child-market-sheet");
  const benign=s.doc.createElement("button");benign.className="market-global__tab";
  owner.body.append(benign);benign.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  const buy=s.doc.createElement("button");buy.className="market-global__buy";
  owner.body.append(buy);
  buy.disabled=true;buy.click();assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  buy.disabled=false;
  let actionMode,buyCalls=0;
  buy.addEventListener("click",()=>{buyCalls++;actionMode=s.doc.documentElement.dataset.ppbuiCardMode;});
  buy.click();
  assert.equal(actionMode,"game");assert.equal(buyCalls,1);
  assert.equal(owner.el.hasAttribute(marker),false);
});

test("unsolicited native guild Dialog from the global Bus reveals Game, never a guessed Cards owner",async t=>{
  const s=fixture(t);s.button("guild").click();await tick(s.win);
  // Real UIPanel.js openDialog() has this direct-body identity and structural
  // grammar; the guild.invited Bus callback has NO originating user click.
  s.win.PokeIdle.Dialog={confirm:()=>{},prompt:()=>{},select:()=>{}};
  const foreign=s.doc.createElement("div");foreign.className="pokeidle-dialog-overlay";
  foreign.innerHTML='<section class="pokeidle-dialog">Partial foreign popup</section>';
  s.doc.body.append(foreign);s.app.reconcile();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards",
    "unrelated partial lookalikes must not trigger a native-dialog safety fallback");
  assert.equal(foreign.hasAttribute(marker),false);
  const native=s.doc.createElement("div");native.className="pokeidle-dialog-overlay";
  native.innerHTML=`<section class="pokeidle-dialog">
    <header class="pokeidle-dialog__header"><strong class="pokeidle-dialog__title">Convite</strong><button class="pokeidle-dialog__close"></button></header>
    <div class="pokeidle-dialog__body"><p class="pokeidle-dialog__message">Convidar</p></div>
    <footer class="pokeidle-dialog__actions"><button class="rubinot-btn">Recusar</button></footer>
  </section>`;
  s.doc.body.append(native);s.app.reconcile();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  assert.equal(native.hasAttribute(marker),false,"no orphan PI.Dialog is ever granted Cards ownership");
  assert.notEqual(s.win.getComputedStyle(native).display,"none");
  s.toggle.click();assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
    "manual reentry cannot conceal an active native global confirmation");
  native.remove();foreign.remove();s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
});

test("B2 excludes false scenes, hidden/inert/aria-hidden panels and unowned lookalike portals",t=>{
  const s=fixture(t),scene=s.open("professions");s.app.reconcile();
  const overlay=scene._panel.overlay;
  assert.equal(overlay.getAttribute(marker),"native-professions");
  for(const attr of ["hidden","inert","aria-hidden"]){
    if(attr==="hidden")overlay.hidden=true;
    else if(attr==="inert")overlay.inert=true;
    else overlay.setAttribute(attr,"true");
    s.app.reconcile();
    assert.equal(overlay.hasAttribute(marker),false);
    if(attr==="hidden")overlay.hidden=false;
    else if(attr==="inert")overlay.inert=false;
    else overlay.removeAttribute(attr);
    s.app.reconcile();
    assert.equal(overlay.getAttribute(marker),"native-professions");
  }
  const fake=overlay.cloneNode(true);fake.removeAttribute(marker);
  s.doc.body.append(fake);s.app.reconcile();
  assert.equal(fake.hasAttribute(marker),false);
  assert.equal(s.win.getComputedStyle(fake).display,"none");
  scene._panel.body.remove();s.app.reconcile();
  assert.equal(overlay.hasAttribute(marker),false,"invalid native hierarchy loses authority");
});

test("Professions hover and pinned Pokémon card retain native presentation only after a verified gesture",t=>{
  const s=fixture(t),scene=s.open("professions");s.app.reconcile();
  const unrelated=s.doc.createElement("div");unrelated.className="pokemon-card--hover";
  s.doc.body.append(unrelated);s.app.reconcile();
  assert.equal(unrelated.hasAttribute(marker),false,"unowned global hover cannot inherit a menu marker");
  assert.equal(s.win.getComputedStyle(unrelated).display,"none");
  unrelated.hidden=true;
  const target=s.doc.createElement("button");target.className="prof-stage-worker";
  scene._panel.body.append(target);
  let hover;
  target.addEventListener("pointerover",()=>{
    hover=s.doc.createElement("div");hover.className="pokemon-card--hover";
    s.doc.body.append(hover);
  });
  target.dispatchEvent(new s.win.MouseEvent("pointerover",{bubbles:true}));
  assert.notEqual(s.win.getComputedStyle(hover).display,"none","verified native root permits hover positioning");
  s.app.reconcile();
  assert.equal(hover.getAttribute(marker),"native-tooltip-professions");
  let pin;
  target.addEventListener("pointerdown",()=>{
    pin=s.doc.createElement("div");pin.className="pokemon-card-shell";
    const pinned=s.doc.createElement("aside");pinned.className="pokemon-card--pinned";
    pin.append(pinned);s.doc.body.append(pin);
  });
  target.dispatchEvent(new s.win.MouseEvent("pointerdown",{bubbles:true}));
  s.app.reconcile();
  assert.equal(pin.getAttribute(marker),"native-tooltip-professions");
  assert.equal(pin.firstElementChild.className,"pokemon-card--pinned");
  scene._panel.overlay.hidden=true;s.setActive(null);s.app.reconcile();
  assert.equal(hover.hasAttribute(marker),false);
  assert.equal(pin.hasAttribute(marker),false);
});

test("Disable Pokémon hover still hides B2 native hover while keeping pinned cards possible",t=>{
  const s=fixture(t,{disableHover:true}),scene=s.open("professions");s.app.reconcile();
  const target=s.doc.createElement("button");target.className="profession-worker__identity";
  scene._panel.body.append(target);
  let hover;
  target.addEventListener("pointerover",()=>{
    hover=s.doc.createElement("div");hover.className="pokemon-card--hover";
    s.doc.body.append(hover);
  });
  target.dispatchEvent(new s.win.MouseEvent("pointerover",{bubbles:true}));
  s.app.reconcile();
  assert.equal(s.win.getComputedStyle(hover).display,"none","disabled native hover must not be visible");
  assert.ok(s.doc.body.hasAttribute("data-ppbui-pokemon-hover-disabled"));
});

test("Professions native Remove and navigation, Friends Join, and Hunt Analyzer Reset use Game pre-handler",t=>{
  const s=fixture(t);
  const samples=[
    ["professions",'<div class="profession-worker__actions"><button class="pokeidle-btn pokeidle-btn--danger">Remove</button><button class="pokeidle-btn pokeidle-btn--primary">Collect</button></div>'],
    ["professions",'<section class="prof-stage"><button class="prof-work-btn primary">Enter mine</button></section>'],
    ["friends",'<div class="friends-row__actions"><button class="pokeidle-btn pokeidle-btn--primary">Join friend server</button></div>'],
    ["hunt-analyzer",'<div class="analyzer-controls__actions"><button class="pokeidle-btn">Reset</button></div>'],
  ];
  for(const [id,html] of samples){
    if(s.doc.documentElement.dataset.ppbuiCardMode==="game")s.toggle.click();
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
    const scene=s.open(id);scene._panel.body.innerHTML=html;s.app.reconcile();
    let count=0,mode;
    const action=scene._panel.body.querySelector("button");
    action.addEventListener("click",()=>{count++;mode=s.doc.documentElement.dataset.ppbuiCardMode;});
    action.click();
    assert.equal(mode,"game",`${id} native handler must see Game for sensitive operation`);
    assert.equal(count,1,"original native action runs once");
    assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  }
});

test("B2 benign buttons, Tab, disabled and aria-hidden controls never force Game",t=>{
  const s=fixture(t),scene=s.open("professions");s.app.reconcile();
  scene._panel.body.innerHTML='<div class="profession-worker__actions"><button class="pokeidle-btn pokeidle-btn--primary">Collect</button><button class="pokeidle-btn pokeidle-btn--danger">Remove</button></div>';
  const [collect,remove]=scene._panel.body.querySelectorAll("button");
  let calls=0;collect.addEventListener("click",()=>calls++);
  collect.click();assert.equal(calls,1);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  remove.dispatchEvent(new s.win.KeyboardEvent("keydown",{key:"Tab",bubbles:true}));
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  remove.disabled=true;remove.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  remove.disabled=false;remove.setAttribute("aria-disabled","true");remove.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  remove.removeAttribute("aria-disabled");remove.inert=true;remove.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
});

test("Friends' exact native scene-owned popover stays over Cards and routes both confirmations to Game",t=>{
  const s=fixture(t),scene=s.open("friends");s.app.reconcile();
  const other=s.doc.createElement("div");other.className="friends-action-popover";
  other.append(s.doc.createElement("button"),s.doc.createElement("button"));s.doc.body.append(other);
  s.app.reconcile();assert.equal(other.hasAttribute(marker),false);
  assert.equal(s.win.getComputedStyle(other).display,"none");
  for(const action of ["Remove","Block"]){
    const menu=s.doc.createElement("div");menu.className="friends-action-popover";
    for(const label of ["Remove","Block"]){const button=s.doc.createElement("button");button.textContent=label;menu.append(button);}
    scene._actionMenu=menu;s.doc.body.append(menu);s.app.reconcile();
    assert.equal(menu.getAttribute(marker),"native-child-friends-actions");
    assert.notEqual(s.win.getComputedStyle(menu).display,"none");
    let nativeMode,calls=0;
    const button=[...menu.children].find(node=>node.textContent===action);
    button.addEventListener("click",()=>{calls++;nativeMode=s.doc.documentElement.dataset.ppbuiCardMode;});
    button.click();
    assert.equal(calls,1);assert.equal(nativeMode,"game",`${action} executes with native Game confirmation`);
    menu.remove();scene._actionMenu=null;
    s.toggle.click();assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
    s.app.reconcile();
  }
});

test("Friends detached action menu invokes exact original close when scene ownership is lost",t=>{
  const s=fixture(t),friend=s.open("friends");s.app.reconcile();
  const menu=s.doc.createElement("div");menu.className="friends-action-popover";
  menu.append(s.doc.createElement("button"),s.doc.createElement("button"));
  s.doc.body.append(menu);friend._actionMenu=menu;
  let closes=0;
  friend.closeActionMenu=()=>{closes++;menu.remove();friend._actionMenu=null;};
  s.app.reconcile();assert.equal(menu.getAttribute(marker),"native-child-friends-actions");
  s.open("professions");s.app.reconcile();
  assert.equal(closes,1,"the original native close API clears the orphaned portal once");
  assert.equal(menu.isConnected,false);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.active._panel.overlay.getAttribute(marker),"native-professions");
});

test("Hunt Analyzer Mini keeps its exact independent native handle in Cards, not lookalikes",t=>{
  const s=fixture(t),mini=s.win.PokeIdle.HuntAnalyzerMini;
  const root=s.doc.createElement("aside");root.className="hunt-analyzer-mini";
  for(const [tag,classname] of [["button","hunt-analyzer-mini__handle"],["div","hunt-analyzer-mini__content"],["button","hunt-analyzer-mini__drawer-toggle"],["section","hunt-analyzer-mini__drawer"]]){
    const child=s.doc.createElement(tag);child.className=classname;root.append(child);
  }
  const clone=root.cloneNode(true);s.doc.body.append(clone,root);
  mini.enabled=true;mini.root=root;s.app.reconcile();
  assert.equal(root.getAttribute(marker),"native-hunt-analyzer-mini");
  assert.notEqual(s.win.getComputedStyle(root).display,"none");
  assert.equal(clone.hasAttribute(marker),false);
  assert.equal(s.win.getComputedStyle(clone).display,"none");
  s.toggle.click();assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game");
  s.toggle.click();assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(root.getAttribute(marker),"native-hunt-analyzer-mini");
  mini.enabled=false;s.app.reconcile();
  assert.equal(root.hasAttribute(marker),false);
  assert.equal(s.win.getComputedStyle(root).display,"none");
  mini.enabled=true;mini.root=clone;root.remove();s.app.reconcile();
  assert.equal(clone.getAttribute(marker),"native-hunt-analyzer-mini",
    "only a new exact controller-owned generation can become visible");
  clone.querySelector(".hunt-analyzer-mini__handle").remove();s.app.reconcile();
  assert.equal(clone.hasAttribute(marker),false,"wrong native child hierarchy revokes owner");
});

test("unsolicited native Friends UIForm falls back to Game without a guessed Cards owner",t=>{
  const s=fixture(t);
  let opened=true;
  s.win.PokeIdle.UIForm={isOpen:()=>opened,show(){}};
  const form=s.doc.createElement("div");form.className="pokeidle-overlay";
  form.style.width="0px";form.style.height="0px";
  const box=s.doc.createElement("section");box.className="pokeidle-form-box";
  box.append(Object.assign(s.doc.createElement("div"),{className:"pokeidle-form-title"}),
    Object.assign(s.doc.createElement("div"),{className:"pokeidle-form-error"}));
  form.append(box);s.doc.body.append(form);
  s.app.reconcile();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
    "unowned native global UIForm cannot consume Escape/focus invisibly behind Cards");
  assert.equal(form.hasAttribute(marker),false,"a global native form never inherits scene ownership");
  assert.ok(Number.parseFloat(s.win.getComputedStyle(form).width)>=s.win.innerWidth-1,
    "source-proven 0x0 native geometry is rescued only after Game becomes active");
  assert.ok(Number.parseFloat(s.win.getComputedStyle(form).height)>=s.win.innerHeight-1);
  s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"game",
    "cannot conceal an active native invitation by reselecting Cards");
  opened=false;form.remove();s.toggle.click();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
});

test("foreign lookalike UIForm without native controller provenance stays hidden in Cards",t=>{
  const s=fixture(t);
  const fake=s.doc.createElement("div");fake.className="pokeidle-overlay";
  const box=s.doc.createElement("div");box.className="pokeidle-form-box";
  box.append(Object.assign(s.doc.createElement("div"),{className:"pokeidle-form-title"}),
    Object.assign(s.doc.createElement("div"),{className:"pokeidle-form-error"}));
  fake.append(box);s.doc.body.append(fake);s.app.reconcile();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(fake.hasAttribute(marker),false);
  assert.equal(s.win.getComputedStyle(fake).display,"none");
});
