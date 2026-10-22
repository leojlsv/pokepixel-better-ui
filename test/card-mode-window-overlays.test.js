import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createCardModeModule } from "../src/modules/card-mode/index.js";
import { createInventoryModule } from "../src/modules/inventory/index.js";
import { createMenuBarModule } from "../src/modules/menu-bar/index.js";

function setup(t, { enhanceInventory = false, withMenuBar = false, withNativeHandle = false, withNativeToggle = false, withResizeObserver = false } = {}) {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>
    <section id="native-scene"><canvas></canvas></section>
    <nav class="pokeidle-top-toolbar${withNativeHandle ? " pokeidle-pokehub pokeidle-island" : ""}">
      ${withNativeHandle ? '<button class="pokeidle-pokehub__handle" type="button">Drag</button>' : ""}
      ${withNativeToggle ? '<button class="pokeidle-pokehub__toggle" type="button">Expand/collapse</button>' : ""}
      <button data-menu-id="inventory">Inventory</button>
      <button data-menu-id="pokemon-profile">Pokémon Profile</button>
      <button data-menu-id="settings">Settings</button>
    </nav></body></html>`, { url:"https://pokepixel.nietore.com/play/", pretendToBeVisual:true });
  const { window:win } = dom, doc = win.document;
  if (withNativeToggle) {
    const nativeToggle=doc.querySelector(".pokeidle-pokehub__toggle");
    nativeToggle.addEventListener("click",()=>doc.querySelector(".pokeidle-top-toolbar").classList.toggle("is-collapsed"));
  }
  const resizeObservers = [];
  if (withResizeObserver) win.ResizeObserver = class {
    constructor(callback) { this.callback=callback;this.targets=new Set();resizeObservers.push(this); }
    observe(node){this.targets.add(node);}
    unobserve(node){this.targets.delete(node);}
    disconnect(){this.targets.clear();}
    trigger(node){if(this.targets.has(node))this.callback([{target:node}],this);}
  };
  const previous = new Map();
  for (const name of ["window","document","MutationObserver","requestAnimationFrame","cancelAnimationFrame"]) {
    previous.set(name,Object.getOwnPropertyDescriptor(globalThis,name));
    Object.defineProperty(globalThis,name,{configurable:true,value:typeof win[name]==="function" && name!=="MutationObserver"?win[name].bind(win):win[name]});
  }
  class SceneMap {}
  class SceneInventory {}
  win.Scene_Map = SceneMap; win.Scene_Inventory = SceneInventory;
  win.SceneManager = { _scene:new SceneMap() };
  let active = null, invocations = 0, cached = [], overlay = null;
  win.PokeIdle = { ReactiveWindows:{
    active:()=>active,
    cached:()=>cached,
  } };
  const createInventory = () => {
    const nativeOverlay = doc.createElement("div");
    nativeOverlay.className = "pokeidle-panel-overlay";
    const panel = doc.createElement("div");
    panel.className = "pokeidle-panel inventory-window inventory-window--slots";
    const body = doc.createElement("div");
    body.className = "pokeidle-panel__body";
    body.innerHTML = `<div class="inventory-category-tabs"><button class="inventory-category-tab is-active" data-category="all" aria-selected="true">All</button></div>
      <div class="inventory-slots-toolbar"><input type="search" class="game-window__search"></div>
      <div class="inventory-slot-grid"><button class="inventory-slot" aria-label="Potion, 4 units"><span class="inventory-slot__quantity">4</span></button></div>`;
    panel.append(body); nativeOverlay.append(panel); doc.body.append(nativeOverlay);
    const scene = new SceneInventory();
    scene._panel = {overlay:nativeOverlay,el:panel,body,isVisible:()=>!nativeOverlay.hidden};
    active = scene; cached = [scene]; overlay = nativeOverlay;
    return scene;
  };
  const clickInventory = () => {
    invocations++;
    if (win.Scene_Trade && active instanceof win.Scene_Trade) return;
    if (active) { active._panel.overlay.hidden = true; active = null; }
    else createInventory();
  };
  doc.querySelector('[data-menu-id="inventory"]').addEventListener("click",clickInventory);
  const menuBar = withMenuBar ? createMenuBarModule() : null;
  const app = createBetterUI({ modules:[...(menuBar?[menuBar]:[]),createCardModeModule({ menuBar }),...(enhanceInventory?[createInventoryModule()]:[])] });
  app.start();
  const toggle = doc.querySelector("[data-ppbui-card-mode-toggle]");
  toggle.click();
  t.after(()=>{app.stop();dom.window.close();for(const [name,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}});
  return {app,win,doc,toggle,createInventory,clickInventory,SceneMap,SceneInventory,resizeObservers,
    get active(){return active;},get overlay(){return overlay;},get invocations(){return invocations;},
    setActive(scene){active=scene;},setCached(scenes){cached=scenes;}};
}

test("native Inventory stays over Cards with one original handler and returns to Cards on close", async t => {
  const s=setup(t),inventory=s.doc.querySelector('[data-menu-id="inventory"]'),background=s.doc.querySelector("#native-scene");
  assert.equal(s.win.getComputedStyle(background).display,"none");
  inventory.click();
  await Promise.resolve();
  assert.equal(s.invocations,1);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.toggle.getAttribute("aria-pressed"),"true");
  assert.equal(s.overlay.dataset.ppbuiCardModeWindow,"inventory");
  assert.notEqual(s.win.getComputedStyle(s.overlay).display,"none");
  assert.equal(s.win.getComputedStyle(background).display,"none","map is still removed from layout/paint");
  const nativePanel=s.active._panel.el;
  inventory.click();
  await Promise.resolve();
  assert.equal(s.invocations,2);
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards","native close never toggles Game");
  assert.equal(s.overlay.hidden,true,"native closure hides the cached panel immediately");
  await new Promise(resolve=>s.win.setTimeout(resolve,10));
  assert.equal(s.overlay.hasAttribute("data-ppbui-card-mode-window"),false,"cached hidden window loses its exemption");
  assert.equal(nativePanel.parentElement,s.overlay,"no native nodes were cloned or moved");
});

test("Inventory capture waits for the native handler even if microtasks run before the target listener", async t => {
  const s=setup(t),inventory=s.doc.querySelector('[data-menu-id="inventory"]');
  const background=s.doc.querySelector("#native-scene");
  const originalQueueMicrotask=s.win.queueMicrotask;
  let modeSeenByNative;
  // Chromium pointer clicks can checkpoint microtasks between document capture
  // and the native target listener; .click() in JSDOM cannot reproduce that.
  // Drain callbacks adversarially here so a capture microtask fallback goes RED.
  s.win.queueMicrotask=callback=>callback();
  t.after(()=>{s.win.queueMicrotask=originalQueueMicrotask;});
  inventory.addEventListener("click",()=>{modeSeenByNative=s.doc.documentElement.dataset.ppbuiCardMode;});
  inventory.click();
  assert.equal(modeSeenByNative,"cards","the original handler must see Cards before opening Inventory");
  assert.equal(s.invocations,1,"no replay or duplicate native dispatch");
  await new Promise(resolve=>s.win.setTimeout(resolve,10));
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.toggle.getAttribute("aria-pressed"),"true");
  assert.equal(s.overlay.dataset.ppbuiCardModeWindow,"inventory");
  assert.equal(s.win.getComputedStyle(background).display,"none");
});

test("Inventory close before pending verification does not switch to Game or re-admit its hidden cache", async t => {
  const s=setup(t),inventory=s.doc.querySelector('[data-menu-id="inventory"]');
  inventory.click();
  const overlay=s.overlay;
  inventory.click();
  assert.equal(s.invocations,2,"native action is neither replayed nor intercepted");
  assert.equal(overlay.hidden,true);
  await new Promise(resolve=>s.win.setTimeout(resolve,10));
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.equal(s.win.getComputedStyle(overlay).display,"none");
});

test("only an actively opening native Inventory UIPanel can be measured before its scene is registered", t => {
  const s=setup(t),doc=s.doc,win=s.win;
  const overlay=doc.createElement("div");
  overlay.className="pokeidle-panel-overlay";
  const panel=doc.createElement("div");
  panel.className="pokeidle-panel is-opening game-window inventory-window inventory-window--slots";
  overlay.append(panel);doc.body.append(overlay);
  assert.notEqual(win.getComputedStyle(overlay).display,"none",
    "native UIPanel measures itself before ReactiveWindows.active() can expose the new scene");
  assert.equal(overlay.hasAttribute("data-ppbui-card-mode-window"),false,
    "temporary geometry admission must never forge verified scene ownership");
  panel.classList.remove("is-opening");
  assert.equal(win.getComputedStyle(overlay).display,"none",
    "an unverified native panel must be hidden after its constructor phase");
  panel.classList.add("is-opening");
  overlay.hidden=true;
  assert.equal(win.getComputedStyle(overlay).display,"none","cached native window cannot be shown");
  overlay.hidden=false;
  overlay.setAttribute("aria-hidden","true");
  assert.equal(win.getComputedStyle(overlay).display,"none","an inaccessible native overlay is rejected");
  overlay.removeAttribute("aria-hidden");
  panel.classList.replace("inventory-window--slots","trade-window");
  assert.equal(win.getComputedStyle(overlay).display,"none",
    "unrelated native windows cannot inherit the Inventory construction exception");
});

test("Inventory opened through the native window capture shortcut becomes visible on observer reconciliation", async t => {
  const s=setup(t);
  s.win.addEventListener("keydown",event=>{if(event.key==="i")s.createInventory();},true);
  s.win.dispatchEvent(new s.win.KeyboardEvent("keydown",{key:"i"}));
  await new Promise(resolve=>s.win.setTimeout(resolve,30));
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.overlay.dataset.ppbuiCardModeWindow,"inventory");
  assert.notEqual(s.win.getComputedStyle(s.overlay).display,"none");
});

test("Inventory accepts only its verified active native UIPanel and hides all other scene roots", t => {
  const s=setup(t);
  const active=s.createInventory(), native=s.doc.querySelector("#native-scene");
  s.app.reconcile();
  assert.equal(s.overlay.dataset.ppbuiCardModeWindow,"inventory");
  const foreign=s.doc.createElement("div"); foreign.className="pokeidle-panel-overlay";foreign.textContent="unknown";
  s.doc.body.append(foreign);s.app.reconcile();
  assert.equal(foreign.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.equal(s.win.getComputedStyle(foreign).display,"none");
  active._panel.body.remove();
  s.app.reconcile();
  assert.equal(s.overlay.hasAttribute("data-ppbui-card-mode-window"),false,"orphaned native panel cannot stay admitted");
  assert.equal(s.win.getComputedStyle(native).display,"none");
});

test("Inventory-owned dialogs and pinned cards appear while unrelated portals stay hidden", t => {
  const s=setup(t);
  const scene=s.createInventory();s.app.reconcile();
  scene._tooltip=s.doc.createElement("aside");scene._tooltip.className="inventory-tooltip";scene._tooltip.hidden=false;
  s.doc.body.append(scene._tooltip);
  const unrelated=s.doc.createElement("div");unrelated.className="pokeidle-dialog-overlay";
  s.doc.body.append(unrelated);s.app.reconcile();
  assert.equal(unrelated.hasAttribute("data-ppbui-card-mode-window"),false,"unattributed native dialog must stay hidden");
  const sort=scene._panel.body.querySelector(".inventory-slots-toolbar input");
  sort.dispatchEvent(new s.win.MouseEvent("click",{bubbles:true}));
  const afterSort=s.doc.createElement("div");afterSort.className="pokeidle-dialog-overlay";
  s.doc.body.append(afterSort);s.app.reconcile();
  assert.equal(afterSort.hasAttribute("data-ppbui-card-mode-window"),false,
    "benign Inventory toolbar interactions cannot authorize unrelated native dialogs");
  const origin=scene._panel.body.querySelector(".inventory-slot");
  origin.dispatchEvent(new s.win.MouseEvent("click",{bubbles:true}));
  origin.dispatchEvent(new s.win.MouseEvent("pointerover",{bubbles:true}));
  const dialog=s.doc.createElement("div");dialog.className="pokeidle-dialog-overlay";
  const tags=s.doc.createElement("dialog");tags.className="ppbui-tag-dialog";tags.setAttribute("open","");tags.dataset.ppbuiCardModeWindow="inventory-dialog";
  const hover=s.doc.createElement("div");hover.className="pokemon-card--hover";
  const shell=s.doc.createElement("div");shell.className="pokemon-card-shell";const pinned=s.doc.createElement("aside");pinned.className="pokemon-card--pinned";shell.append(pinned);
  shell.style.zIndex="2147483205";
  s.doc.body.append(dialog,tags,hover,shell);s.app.reconcile();
  for(const node of [dialog,tags,hover,shell,scene._tooltip]){
    assert.equal(node.dataset.ppbuiCardModeWindow,[hover,shell,scene._tooltip].includes(node)?"inventory-tooltip":"inventory-dialog");
    assert.notEqual(s.win.getComputedStyle(node).display,"none");
  }
  assert.equal(s.win.getComputedStyle(shell).zIndex,"2147483205",
    "native pinned-card front ordering survives admission into Cards");
  dialog.hidden=true;s.app.reconcile();
  assert.equal(dialog.hasAttribute("data-ppbui-card-mode-window"),false);
  scene._panel.overlay.hidden=true;
  const dock=s.doc.createElement("nav");dock.className="pokeidle-minimized-windows";
  const restore=s.doc.createElement("button");dock.append(restore);s.doc.body.append(dock);
  scene._panel._minimizedButton=restore;s.setActive(null);s.app.reconcile();
  assert.equal(dock.dataset.ppbuiCardModeWindow,"inventory-minimized");
  assert.notEqual(s.win.getComputedStyle(dock).display,"none");
  for(const node of [hover,shell,scene._tooltip]) assert.equal(node.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.equal(tags.dataset.ppbuiCardModeWindow,"inventory-dialog","tag modal is independently owned and removed by its module");
  dock.append(s.doc.createElement("button"));
  s.app.reconcile();
  assert.equal(dock.hasAttribute("data-ppbui-card-mode-window"),false,"mixed minimized docks never expose unrelated windows");
  restore.remove();s.app.reconcile();
  assert.equal(dock.hasAttribute("data-ppbui-card-mode-window"),false);
});

test("keyboard focus reveals native Inventory Pokémon hover without a pointer gesture", t => {
  const s=setup(t),scene=s.createInventory();
  const slot=scene._panel.body.querySelector(".inventory-slot");
  slot.classList.add("inventory-slot--pokemon");
  const hover=s.doc.createElement("aside");hover.className="pokemon-card pokemon-card--hover";hover.hidden=true;
  s.doc.body.append(hover);
  slot.addEventListener("focus",()=>{hover.hidden=false;});
  s.app.reconcile();
  slot.focus();s.app.reconcile();
  assert.equal(hover.dataset.ppbuiCardModeWindow,"inventory-tooltip");
  assert.notEqual(s.win.getComputedStyle(hover).display,"none");
});

test("a singleton Inventory dock cannot be authorized by a cached scene without an exact hidden UIPanel", t => {
  const s=setup(t),dock=s.doc.createElement("nav");
  dock.className="pokeidle-minimized-windows";
  const restore=s.doc.createElement("button");
  dock.append(restore);s.doc.body.append(dock);
  const malformed=new s.SceneInventory();
  malformed._panel={_minimizedButton:restore,overlay:null,el:null,body:null};
  s.setCached([malformed]);s.setActive(null);
  s.app.reconcile();
  assert.equal(dock.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.equal(s.win.getComputedStyle(dock).display,"none");
  const valid=s.createInventory();
  valid._panel.overlay.hidden=true;
  valid._panel._minimizedButton=restore;
  s.setActive(null);s.setCached([valid]);s.app.reconcile();
  assert.equal(dock.dataset.ppbuiCardModeWindow,"inventory-minimized");
});

test("Inventory prompt can open an owned async target UIForm after its native confirmation", t => {
  const s=setup(t),scene=s.createInventory();s.app.reconcile();
  scene._panel.body.querySelector(".inventory-slot").click();
  const prompt=s.doc.createElement("div");prompt.className="pokeidle-dialog-overlay";
  const accept=s.doc.createElement("button");prompt.append(accept);s.doc.body.append(prompt);s.app.reconcile();
  assert.equal(prompt.dataset.ppbuiCardModeWindow,"inventory-dialog");
  const unrelated=s.doc.createElement("div");unrelated.className="pokeidle-overlay";s.doc.body.append(unrelated);
  s.app.reconcile();assert.equal(unrelated.hasAttribute("data-ppbui-card-mode-window"),false);
  accept.click();
  const targetForm=s.doc.createElement("div");targetForm.className="pokeidle-overlay";
  targetForm.append(Object.assign(s.doc.createElement("section"),{className:"pokeidle-form-box"}));
  s.doc.body.append(targetForm);scene._formHandle={destroy(){}};
  s.app.reconcile();
  assert.equal(targetForm.dataset.ppbuiCardModeWindow,"inventory-dialog");
  assert.equal(unrelated.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.notEqual(s.win.getComputedStyle(targetForm).display,"none");
});

test("Inventory-origin dialog authorization never transfers to a reused native portal", t => {
  const s=setup(t),scene=s.createInventory();s.app.reconcile();
  const slot=scene._panel.body.querySelector(".inventory-slot");
  slot.click();
  const portal=s.doc.createElement("div");portal.className="pokeidle-dialog-overlay";
  const prompt=s.doc.createElement("section");prompt.textContent="Use this inventory item?";
  portal.append(prompt);s.doc.body.append(portal);s.app.reconcile();
  assert.equal(portal.dataset.ppbuiCardModeWindow,"inventory-dialog");
  const unrelated=s.doc.createElement("section");unrelated.textContent="Unrelated Trade dialog";
  portal.replaceChildren(unrelated);s.app.reconcile();
  assert.equal(portal.hasAttribute("data-ppbui-card-mode-window"),false,
    "replacing native content in the same portal must revoke its Cards admission");
  assert.equal(s.win.getComputedStyle(portal).display,"none");
  prompt.textContent="Use this inventory item?";portal.replaceChildren(prompt);s.app.reconcile();
  assert.equal(portal.hasAttribute("data-ppbui-card-mode-window"),false,
    "the original intent must not reauthorize a used portal after a foreign replacement");
  slot.click();
  const legitimate=s.doc.createElement("div");legitimate.className="pokeidle-dialog-overlay";
  legitimate.append(Object.assign(s.doc.createElement("section"),{textContent:"Next inventory item?"}));
  s.doc.body.append(legitimate);s.app.reconcile();
  assert.equal(legitimate.dataset.ppbuiCardModeWindow,"inventory-dialog",
    "a new Inventory interaction can authorize a new native dialog");
  legitimate.firstElementChild.textContent="Trade completed";s.app.reconcile();
  assert.equal(legitimate.hasAttribute("data-ppbui-card-mode-window"),false,
    "same-shell content replacement must also revoke stale dialog authorization");
});

test("Inventory UIForm admission is one-shot and revoked on owner loss, replacement, and portal reuse", async t => {
  const s=setup(t),scene=s.createInventory();s.app.reconcile();
  scene._panel.body.querySelector(".inventory-slot").click();
  const form=s.doc.createElement("div");form.className="pokeidle-overlay";
  const content=s.doc.createElement("section");content.className="pokeidle-form-box";
  form.append(content);s.doc.body.append(form);
  const originalHandle={destroy(){}};
  scene._formHandle=originalHandle;s.app.reconcile();
  assert.equal(form.dataset.ppbuiCardModeWindow,"inventory-dialog");

  const replacement=s.doc.createElement("section");replacement.className="pokeidle-form-box";
  content.replaceWith(replacement);s.app.reconcile();
  assert.equal(form.hasAttribute("data-ppbui-card-mode-window"),false,
    "a reused native form root with different content cannot inherit authorization");

  scene._formHandle=null;s.app.reconcile();
  assert.equal(form.hasAttribute("data-ppbui-card-mode-window"),false);
  form.remove();
  await new Promise(resolve=>s.win.setTimeout(resolve,550));
  const unrelated=s.doc.createElement("div");unrelated.className="pokeidle-overlay";
  unrelated.append(Object.assign(s.doc.createElement("section"),{className:"pokeidle-form-box"}));
  s.doc.body.append(unrelated);scene._formHandle={destroy(){}};
  s.app.reconcile();
  assert.equal(unrelated.hasAttribute("data-ppbui-card-mode-window"),false,
    "a later unrelated UIForm cannot reuse the already consumed Inventory intent");

  scene._formHandle=originalHandle;s.app.reconcile();
  assert.equal(unrelated.hasAttribute("data-ppbui-card-mode-window"),false,
    "a stale handle cannot reauthorize an unowned portal");
});

test("Cards computes a mobile safe inset for native windows and restores its style ownership", t => {
  const s=setup(t),html=s.doc.documentElement,toolbar=s.doc.querySelector(".pokeidle-top-toolbar");
  s.win.innerWidth=320;s.win.innerHeight=568;
  toolbar.getBoundingClientRect=()=>({left:8,right:312,top:493,bottom:560,width:304,height:67});
  s.app.reconcile();
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"83px");
  const css=s.doc.querySelector("style[data-ppbui-card-mode-style]").textContent;
  assert.match(css,/max-height:calc\(100dvh - var\(--ppbui-card-mode-window-bottom-inset,0px\) - 16px\)!important/);
  assert.match(css,/scroll-padding-bottom:var\(--ppbui-card-mode-window-bottom-inset,0px\)/);
  s.app.stop();
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"");
});

test("Cards reports dock inset changes only when geometry changes and not on every reconcile", t => {
  const s=setup(t),html=s.doc.documentElement,toolbar=s.doc.querySelector(".pokeidle-top-toolbar");
  s.win.innerWidth=320;s.win.innerHeight=568;
  let top=493,bottom=560,notifications=0;
  toolbar.getBoundingClientRect=()=>({left:8,right:312,top,bottom,width:304,height:67});
  s.win.addEventListener("ppbui:card-mode-window-inset-change",()=>notifications++);
  s.app.reconcile();
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"83px");
  assert.equal(notifications,1);
  for(let n=0;n<6;n++)s.app.reconcile();
  assert.equal(notifications,1,"a stable window inset emits no recurrent notification");
  top=200;bottom=267;s.app.reconcile();
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"0px");
  assert.equal(notifications,2);
  top=493;bottom=560;s.app.reconcile();
  assert.equal(notifications,3,"the reopened dock must notify dragged windows for re-clamping");
});

test("Card Mode reacts to class-only Menu Bar collapse and orientation events without manual reconciliation", t => {
  const s=setup(t),toolbar=s.doc.querySelector(".pokeidle-top-toolbar"),html=s.doc.documentElement;
  s.win.innerWidth=320;s.win.innerHeight=568;
  toolbar.setAttribute("data-ppbui-menu-orientation","horizontal");
  toolbar.getBoundingClientRect=()=>({left:8,right:312,top:493,bottom:560,width:304,height:67});
  toolbar.classList.add("is-collapsed");s.app.reconcile();
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"0px");
  let notifications=0;
  s.win.addEventListener("ppbui:card-mode-window-inset-change",()=>notifications++);
  toolbar.classList.remove("is-collapsed");
  s.win.dispatchEvent(new s.win.CustomEvent("ppbui:menu-collapse-change",{detail:{toolbar,collapsed:false,orientation:"horizontal"}}));
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"83px",
    "a class-only dock expansion must recompute its safe inset without app.reconcile()");
  assert.equal(notifications,1);
  toolbar.setAttribute("data-ppbui-menu-orientation","vertical");
  s.win.dispatchEvent(new s.win.CustomEvent("ppbui:menu-orientation-change",{detail:{toolbar,orientation:"vertical"}}));
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"0px");
  toolbar.setAttribute("data-ppbui-menu-orientation","horizontal");
  s.win.dispatchEvent(new s.win.CustomEvent("ppbui:menu-orientation-change",{detail:{toolbar,orientation:"horizontal"}}));
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"83px");
  const before=notifications;
  s.win.dispatchEvent(new s.win.CustomEvent("ppbui:menu-collapse-change",{detail:{toolbar:s.doc.createElement("nav"),collapsed:true}}));
  assert.equal(notifications,before,"a stale unrelated toolbar event cannot re-clamp this window");
  s.win.dispatchEvent(new s.win.CustomEvent("ppbui:menu-layout-change"));
  assert.equal(notifications,before,"a stable layout event does not create a new notification cycle");
});

test("a native Menu Bar class-only collapse reflows Cards windows without a manual reconcile", async t => {
  const s=setup(t,{withMenuBar:true}),html=s.doc.documentElement,win=s.win,toolbar=s.doc.querySelector(".pokeidle-top-toolbar");
  win.innerWidth=320;win.innerHeight=568;
  toolbar.getBoundingClientRect=()=>toolbar.classList.contains("is-collapsed")
    ?{left:8,right:40,top:528,bottom:560,width:32,height:32}
    :{left:8,right:312,top:493,bottom:560,width:304,height:67};
  win.dispatchEvent(new win.Event("resize"));
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"83px");
  const events=[];win.addEventListener("ppbui:menu-collapse-change",event=>events.push(event.detail?.collapsed));
  toolbar.classList.add("is-collapsed");
  await new Promise(resolve=>win.setTimeout(resolve,45));
  assert.equal(events.at(-1),true,"the real Menu Bar reports a class-only native collapse");
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"0px",
    "Card Mode must react to the Menu Bar event without app.reconcile or a window resize");
  toolbar.classList.remove("is-collapsed");
  await new Promise(resolve=>win.setTimeout(resolve,45));
  assert.equal(events.at(-1),false,"the real Menu Bar reports native expansion");
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"83px",
    "Profile and Inventory must regain mobile safe clearance from the native toolbar event");
});

test("a native Poké Hub handle move to the bottom updates window clearance without a manual reconcile", async t => {
  const s=setup(t,{withMenuBar:true,withNativeHandle:true}),win=s.win,html=s.doc.documentElement;
  const toolbar=s.doc.querySelector(".pokeidle-top-toolbar"),handle=toolbar.querySelector(".pokeidle-pokehub__handle");
  win.innerWidth=320;win.innerHeight=568;
  let position="top";
  toolbar.getBoundingClientRect=()=>position==="bottom"
    ?{left:8,right:312,top:493,bottom:560,width:304,height:67}
    :{left:8,right:312,top:8,bottom:75,width:304,height:67};
  win.dispatchEvent(new win.Event("resize"));
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"0px");
  handle.dispatchEvent(new win.MouseEvent("pointerdown",{bubbles:true,button:0}));
  position="bottom";
  win.dispatchEvent(new win.Event("pointerup",{bubbles:true}));
  await new Promise(resolve=>win.setTimeout(resolve,35));
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"83px",
    "the saved handle drag must update the Cards overlay safe area even when no menu layout event fires");
  handle.dispatchEvent(new win.KeyboardEvent("keydown",{bubbles:true,key:"ArrowUp"}));
  position="top";
  handle.dispatchEvent(new win.KeyboardEvent("keyup",{bubbles:true,key:"ArrowUp"}));
  await new Promise(resolve=>win.setTimeout(resolve,35));
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"0px",
    "native keyboard movement of the toolbar handle must restore full window space");
});

test("native toolbar drag retains its pointer ownership through unrelated multitouch", async t => {
  const s=setup(t,{withNativeHandle:true}),win=s.win,html=s.doc.documentElement,toolbar=s.doc.querySelector(".pokeidle-top-toolbar");
  const handle=toolbar.querySelector(".pokeidle-pokehub__handle");
  win.innerWidth=320;win.innerHeight=568;
  let bottom=false;
  toolbar.getBoundingClientRect=()=>bottom
    ?{left:8,right:312,top:493,bottom:560,width:304,height:67}
    :{left:8,right:312,top:8,bottom:75,width:304,height:67};
  win.dispatchEvent(new win.Event("resize"));
  await new Promise(resolve=>win.setTimeout(resolve,50)); // drain mount-time observer/RAF work
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"0px");
  const pointer=(type,id,target)=>{const event=new win.Event(type,{bubbles:true});Object.defineProperty(event,"pointerId",{value:id});target.dispatchEvent(event);};
  pointer("pointerdown",7,handle);
  pointer("pointerdown",8,s.doc.body);
  bottom=true;
  pointer("pointerup",8,win);
  await Promise.resolve();
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"0px",
    "another pointer ending cannot consume the native handle's geometry update");
  pointer("pointerup",7,win);
  await Promise.resolve();
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"83px",
    "the actual handle pointer updates the overlay when its gesture finishes");
});

for(const viewport of [{w:320,h:568},{w:390,h:844}]) {
  test(`Card Mode with Menu Bar disabled follows native Poké Hub collapse clicks at ${viewport.w}x${viewport.h}`, async t => {
    const s=setup(t,{withNativeToggle:true}),win=s.win,doc=s.doc,toolbar=doc.querySelector(".pokeidle-top-toolbar"),html=doc.documentElement;
    const nativeToggle=doc.querySelector(".pokeidle-pokehub__toggle");
    win.innerWidth=viewport.w;win.innerHeight=viewport.h;
    toolbar.getBoundingClientRect=()=>toolbar.classList.contains("is-collapsed")
      ?{left:8,right:40,top:viewport.h-40,bottom:viewport.h-8,width:32,height:32}
      :{left:8,right:viewport.w-8,top:viewport.h-75,bottom:viewport.h-8,width:viewport.w-16,height:67};
    win.dispatchEvent(new win.Event("resize"));
    assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"83px");
    const notifications=[];
    win.addEventListener("ppbui:card-mode-window-inset-change",()=>notifications.push(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset")));
    nativeToggle.click();
    await Promise.resolve();
    assert.equal(toolbar.classList.contains("is-collapsed"),true,"real native callback toggles class");
    assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"0px",
      "Card Mode must react to native toggle without Menu Bar, ResizeObserver or manual reconcile");
    nativeToggle.click();
    await Promise.resolve();
    assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"83px",
      "native menu expansion restores safe space for Inventory/Profile");
    assert.deepEqual(notifications,["0px","83px"]);
    assert.equal(html.dataset.ppbuiCardMode,"cards");
    assert.equal(win.getComputedStyle(doc.querySelector("#native-scene")).display,"none");
    s.app.stop();
    nativeToggle.click();
    await Promise.resolve();
    assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"",
      "stale native toggles do not reactivate Cards after unmount");
  });
}

test("scoped toolbar ResizeObserver rebinds after toolbar replacement without retaining detached nodes", async t => {
  const s=setup(t,{withResizeObserver:true}),win=s.win,doc=s.doc,html=doc.documentElement;
  win.innerWidth=320;win.innerHeight=568;
  const original=doc.querySelector(".pokeidle-top-toolbar");
  original.getBoundingClientRect=()=>({left:8,right:312,top:493,bottom:560,width:304,height:67});
  win.dispatchEvent(new win.Event("resize"));
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"83px");
  const replacement=original.cloneNode(true);
  replacement.querySelector("[data-ppbui-card-mode-toggle]")?.remove();
  replacement.getBoundingClientRect=()=>replacement.classList.contains("is-collapsed")
    ?{left:8,right:40,top:528,bottom:560,width:32,height:32}
    :{left:8,right:312,top:493,bottom:560,width:304,height:67};
  original.replaceWith(replacement);
  await new Promise(resolve=>win.setTimeout(resolve,75));
  assert.equal(doc.querySelector("[data-ppbui-card-mode-toggle]")?.closest(".pokeidle-top-toolbar"),replacement);
  const observer=s.resizeObservers[0];
  assert.equal(observer.targets.has(original),false,"retired native toolbar must be unobserved");
  assert.equal(observer.targets.has(replacement),true,"new native toolbar must receive resize monitoring");
  replacement.classList.add("is-collapsed");
  observer.trigger(replacement);
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"0px");
  original.classList.add("is-collapsed");original.classList.remove("is-collapsed");
  observer.trigger(original);
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"0px",
    "a detached toolbar must not reawaken Card Mode or change its window inset");
  replacement.classList.remove("is-collapsed");
  observer.trigger(replacement);
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"83px");
});

test("the unchanged central DOM observer delivers UI roots added during a toolbar replacement reconcile", async t => {
  const dom=new JSDOM('<!doctype html><html><body><nav class="pokeidle-top-toolbar"></nav></body></html>', {
    url:"https://pokepixel.nietore.com/play/",pretendToBeVisual:true,
  });
  const {window:win}=dom,doc=win.document,previous=new Map();
  for(const name of ["window","document","MutationObserver","requestAnimationFrame","cancelAnimationFrame"]){
    previous.set(name,Object.getOwnPropertyDescriptor(globalThis,name));
    Object.defineProperty(globalThis,name,{configurable:true,value:
      typeof win[name]==="function"&&name!=="MutationObserver"?win[name].bind(win):win[name]});
  }
  let checks=0,mounts=0,replaced=false;
  const app=createBetterUI({modules:[
    {id:"consumer",shouldMount(){checks++;return Boolean(doc.querySelector("#late-native-root"));},
      mount(){mounts++;return ()=>{};}},
    {id:"native-toolbar-replacer",shouldMount:()=>Boolean(doc.querySelector("#trigger-replace")),
      mount(){if(!replaced){replaced=true;doc.querySelector(".pokeidle-top-toolbar").replaceWith(
        Object.assign(doc.createElement("nav"),{className:"pokeidle-top-toolbar"}));
        doc.body.append(Object.assign(doc.createElement("section"),{id:"late-native-root"}));}
        return ()=>{};}},
  ]});
  t.after(()=>{app.stop();dom.window.close();for(const [name,descriptor] of previous){
    if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}});
  app.start();assert.equal(mounts,0);
  doc.body.append(Object.assign(doc.createElement("div"),{id:"trigger-replace"}));
  // Full-suite parallel JSDOM workers can delay the central observer's RAF
  // scheduling. Wait for the native mutation chain, not a fixed wall-clock.
  for(let attempt=0;attempt<24 && (checks<3 || mounts<1);attempt++)
    await new Promise(resolve=>win.setTimeout(resolve,25));
  assert.equal(replaced,true);
  assert.ok(checks>=3,"the toolbar replacement and subsequent new native root both trigger reconciliation");
  assert.equal(mounts,1,"a previously visited module discovers the new root without manual reconciliation");
});

test("Card Mode alone tracks native toolbar collapse via scoped resize observation without a second DOM observer", t => {
  const s=setup(t,{withResizeObserver:true}),win=s.win,html=s.doc.documentElement,toolbar=s.doc.querySelector(".pokeidle-top-toolbar");
  win.innerWidth=320;win.innerHeight=568;
  toolbar.classList.add("is-collapsed");
  toolbar.getBoundingClientRect=()=>toolbar.classList.contains("is-collapsed")
    ?{left:8,right:40,top:528,bottom:560,width:32,height:32}
    :{left:8,right:312,top:493,bottom:560,width:304,height:67};
  win.dispatchEvent(new win.Event("resize"));
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"0px");
  assert.equal(s.resizeObservers.length,1,"one ResizeObserver scoped to the toolbar, not a MutationObserver");
  const observer=s.resizeObservers[0];
  assert.equal(observer.targets.has(toolbar),true);
  toolbar.classList.remove("is-collapsed");
  observer.trigger(toolbar);
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"83px",
    "the native toolbar expansion must update Cards without Menu Bar events or app.reconcile");
  toolbar.classList.add("is-collapsed");
  observer.trigger(toolbar);
  assert.equal(html.style.getPropertyValue("--ppbui-card-mode-window-bottom-inset"),"0px");
  s.app.stop();
  assert.equal(observer.targets.size,0,"unmount must stop observing the native toolbar");
});

test("active Inventory fails closed when its native UIPanel becomes inert or aria-hidden", t => {
  const s=setup(t),scene=s.createInventory();s.app.reconcile();
  assert.equal(s.overlay.dataset.ppbuiCardModeWindow,"inventory");
  s.overlay.setAttribute("aria-hidden","true");s.app.reconcile();
  assert.equal(s.overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  s.overlay.removeAttribute("aria-hidden");s.overlay.inert=true;s.app.reconcile();
  assert.equal(s.overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  s.overlay.inert=false;scene._panel.el.setAttribute("inert","");s.app.reconcile();
  assert.equal(s.overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  scene._panel.el.removeAttribute("inert");s.app.reconcile();
  assert.equal(s.overlay.dataset.ppbuiCardModeWindow,"inventory");
});

test("Profile launcher and bridge remain in Cards; other native actions transition to Game first", async t => {
  const s=setup(t),doc=s.doc;
  const root=doc.createElement("section");
  root.dataset.ppbuiCardModeWindow="profile";root.dataset.ppbuiPokemonProfileWindow="";root.hidden=true;
  doc.body.append(root);
  let opened=0;
  doc.querySelector('[data-menu-id="pokemon-profile"]').addEventListener("click",()=>{opened++;root.hidden=false;});
  doc.querySelector('[data-menu-id="pokemon-profile"]').click();
  assert.equal(opened,1);assert.equal(doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.notEqual(s.win.getComputedStyle(root).display,"none");
  root.hidden=true;
  let visibleToNative;
  doc.querySelector('[data-menu-id="settings"]').addEventListener("click",()=>visibleToNative=doc.documentElement.dataset.ppbuiCardMode);
  doc.querySelector('[data-menu-id="settings"]').click();
  assert.equal(visibleToNative,"game");assert.equal(s.toggle.getAttribute("aria-pressed"),"false");
});

test("Profile Configure Moves reveals only the exact native moveset panel and leaves it operable until native close", t => {
  const s=setup(t),doc=s.doc,profile=doc.createElement("section");
  profile.dataset.ppbuiCardModeWindow="profile";profile.dataset.ppbuiPokemonProfileWindow="";doc.body.append(profile);
  const editor=doc.createElement("div");editor.className="pokeidle-panel-overlay";
  const panel=doc.createElement("div");panel.className="pokeidle-panel moveset-window";editor.append(panel);doc.body.append(editor);
  const foreign=doc.createElement("div");foreign.className="pokeidle-panel-overlay";foreign.append(doc.createElement("div"));doc.body.append(foreign);
  s.app.reconcile();
  assert.equal(editor.dataset.ppbuiCardModeWindow,"profile-editor");
  assert.notEqual(s.win.getComputedStyle(editor).display,"none");
  assert.equal(s.win.getComputedStyle(foreign).display,"none");
  profile.hidden=true;s.app.reconcile();
  assert.equal(editor.dataset.ppbuiCardModeWindow,"profile-editor","closing Profile cannot strand an already opened native editor");
  editor.remove();s.app.reconcile();
  assert.equal(editor.hasAttribute("data-ppbui-card-mode-window"),false,"native teardown releases marker");
});

test("Profile editor admission rejects inaccessible native overlays and panels, including retained owners", t => {
  const s=setup(t),doc=s.doc,profile=doc.createElement("section");
  profile.dataset.ppbuiPokemonProfileWindow="";doc.body.append(profile);
  const overlay=doc.createElement("div");overlay.className="pokeidle-panel-overlay";
  const panel=doc.createElement("div");panel.className="pokeidle-panel moveset-window";
  overlay.append(panel);doc.body.append(overlay);
  const marker=()=>overlay.getAttribute("data-ppbui-card-mode-window");
  const allowed=()=>{s.app.reconcile();assert.equal(marker(),"profile-editor");};
  const denied=()=>{
    s.app.reconcile();
    assert.equal(marker(),null,"an inaccessible native editor cannot retain Cards ownership");
    assert.equal(s.win.getComputedStyle(overlay).display,"none");
  };
  allowed();
  overlay.setAttribute("aria-hidden","true");denied();
  overlay.removeAttribute("aria-hidden");allowed();
  overlay.setAttribute("inert","");denied();
  overlay.removeAttribute("inert");allowed();
  panel.setAttribute("aria-hidden","true");denied();
  panel.removeAttribute("aria-hidden");allowed();
  panel.setAttribute("inert","");denied();
  panel.removeAttribute("inert");allowed();
  profile.setAttribute("aria-hidden","true");
  s.app.reconcile();
  assert.equal(marker(),"profile-editor","an already owned accessible editor may outlive its Profile origin");
  overlay.hidden=true;denied();
});

test("inert-only native changes hide owned windows immediately without an extra DOM observer", t => {
  const s=setup(t),doc=s.doc;
  const scene=s.createInventory();
  const profile=doc.createElement("section");profile.dataset.ppbuiPokemonProfileWindow="";doc.body.append(profile);
  const editor=doc.createElement("div");editor.className="pokeidle-panel-overlay";
  const editorPanel=doc.createElement("div");editorPanel.className="pokeidle-panel moveset-window";
  editor.append(editorPanel);doc.body.append(editor);
  s.app.reconcile();
  assert.equal(s.overlay.dataset.ppbuiCardModeWindow,"inventory");
  assert.equal(editor.dataset.ppbuiCardModeWindow,"profile-editor");
  assert.notEqual(s.win.getComputedStyle(editor).display,"none");
  s.overlay.setAttribute("inert","");
  editor.setAttribute("inert","");
  // inert is intentionally outside the existing central observer attributeFilter.
  // Native accessibility must hold at CSS time, without polling or reconciling.
  assert.equal(s.win.getComputedStyle(s.overlay).display,"none");
  assert.equal(s.win.getComputedStyle(editor).display,"none");
  s.overlay.removeAttribute("inert");
  editor.removeAttribute("inert");
  scene._panel.el.setAttribute("inert","");
  editorPanel.setAttribute("inert","");
  assert.equal(s.win.getComputedStyle(s.overlay).display,"none");
  assert.equal(s.win.getComputedStyle(editor).display,"none");
  s.app.reconcile();
  assert.equal(s.overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.equal(editor.hasAttribute("data-ppbui-card-mode-window"),false);
});

test("unsupported native Inventory route returns to Game before the original handler", t => {
  const s=setup(t);
  s.win.SceneManager._scene={notAMap:true};
  let observedMode;
  s.doc.querySelector('[data-menu-id="inventory"]').addEventListener("click",()=>observedMode=s.doc.documentElement.dataset.ppbuiCardMode);
  s.doc.querySelector('[data-menu-id="inventory"]').click();
  assert.equal(observedMode,"game");
  assert.equal(s.invocations,1);
});

test("native Trade refuses Inventory without forcing a Cards-to-Game transition", async t => {
  const s=setup(t);
  class SceneTrade {}
  s.win.Scene_Trade=SceneTrade;
  s.setActive(new SceneTrade());
  s.doc.querySelector('[data-menu-id="inventory"]').click();
  await Promise.resolve();
  assert.equal(s.invocations,1,"native handler still receives the single attempted action");
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(s.toggle.getAttribute("aria-pressed"),"true");
});

test("a native Inventory handler that tears down Card Mode cannot re-admit a leaked overlay from its pending task", async t => {
  const s=setup(t);
  s.doc.querySelector('[data-menu-id="inventory"]').addEventListener("click",()=>s.app.stop());
  s.doc.querySelector('[data-menu-id="inventory"]').click();
  await new Promise(resolve=>s.win.setTimeout(resolve,10));
  assert.equal(s.overlay.hasAttribute("data-ppbui-card-mode-window"),false);
  assert.equal(s.doc.documentElement.hasAttribute("data-ppbui-card-mode"),false);
});

test("Inventory enhancement can mount in Cards only inside an admitted visible native overlay", t => {
  const s=setup(t),module=createInventoryModule(),orphan=s.doc.createElement("div");
  orphan.className="inventory-window--slots";s.doc.body.append(orphan);
  assert.equal(module.shouldMount(),false);
  orphan.remove();s.createInventory();s.app.reconcile();
  assert.equal(module.shouldMount(),true);
  s.overlay.hidden=true;
  assert.equal(module.shouldMount(),false,"cached but hidden panel must not mount or fetch pages");
  s.toggle.click();
  assert.equal(module.shouldMount(),true,"normal Game behavior is unchanged");
});

test("Inventory Better UI enhancement mounts only during a visible Cards window and cleans up after close", async t => {
  const s=setup(t,{enhanceInventory:true}),launch=s.doc.querySelector('[data-menu-id="inventory"]');
  launch.click();await Promise.resolve();
  s.app.reconcile();
  const panel=s.active._panel.el;
  assert.equal(panel.classList.contains("ppbui-window"),true,"the native window receives its existing Better UI controls");
  assert.ok(panel.querySelector("[data-ppbui-inventory-tools]"));
  launch.click();await Promise.resolve();
  s.app.reconcile();
  assert.equal(s.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(panel.classList.contains("ppbui-window"),false,"cached closed panel loses enhancement");
  assert.equal(panel.querySelector("[data-ppbui-inventory-tools]"),null,"no closed native panel keeps active Better UI controls");
});
