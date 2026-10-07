import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createBetterUI } from "../src/core/bootstrap.js";
import { createMenuBarModule } from "../src/modules/menu-bar/index.js";
import { defaultLayout, moveLayoutItem, SYSTEM_IDS } from "../src/modules/menu-bar/layout-model.js";
import { createMenuLayoutStorage } from "../src/modules/menu-bar/layout-storage.js";
import { readMenuLayoutOwner } from "../src/modules/menu-bar/layout-owner.js";
import { createModulePreferences } from "../src/core/preferences.js";
import { createModuleControls } from "../src/modules/module-controls/index.js";
import { createCardModeModule } from "../src/modules/card-mode/index.js";
import { createHuntControlsModule } from "../src/modules/hunt-controls/index.js";

const fixture = readFileSync(new URL("./fixtures/menu-bar.html", import.meta.url), "utf8");
const key = owner => `ppbui:menu-layout:v1:${encodeURIComponent(owner)}`;

function setup(t, { systems = false, hunt = false, storage, owner = "A", beforeStart } = {}) {
  const dom = new JSDOM(fixture, { pretendToBeVisual:true, url:"https://fixture.invalid" });
  const win = dom.window, doc = win.document, globals = new Map();
  for (const name of ["document", "MutationObserver", "requestAnimationFrame", "cancelAnimationFrame"]) {
    globals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable:true, value:typeof win[name] === "function" && name !== "MutationObserver" ? win[name].bind(win) : win[name] });
  }
  let trainer = owner, presence = owner;
  const listeners = new Map();
  const bus = {
    on(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
    off(name, fn) { listeners.get(name)?.delete(fn); },
    emit(name, value = {}) { for (const fn of [...(listeners.get(name) || [])]) fn(value); },
  };
  win.PokeIdle = {
    Localization:{ get:() => "en" },
    Auth:{ isAuthenticated:() => Boolean(trainer), getTrainerSummary:() => trainer ? { id:trainer, name:`Trainer ${trainer}` } : null },
    WorldPresence:{ getSelfTrainerId:() => presence }, Bus:bus,
  };
  const menuBar = createMenuBarModule({ doc, storage });
  const preferences = createModulePreferences({ defaults:{ "menu-bar":true }, storage:() => win.localStorage, events:win });
  const modules = [menuBar];
  if (hunt) modules.push(createHuntControlsModule({ menuBar, doc }));
  if (systems) modules.push(createCardModeModule({ menuBar }), createModuleControls({ menuBar, preferences, modules:[{ id:"menu-bar", name:text => text.name, description:text => text.description }] }));
  const app = createBetterUI({ modules, preferences });
  beforeStart?.({ win, doc, menuBar });
  app.start();
  const setOwner = (next, nextPresence = next, event = "auth.loggedIn") => { trainer = next; presence = nextPresence; bus.emit(event); app.reconcile(); };
  t.after(() => {
    app.stop(); dom.window.close();
    for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  });
  return { dom, win, doc, app, menuBar, setOwner, bus, listeners, preferences };
}

function move(layout, id, container, index) {
  const result = moveLayoutItem(layout, id, container, index);
  assert.equal(result.ok, true, result.error);
  return result.layout;
}
const button = (doc, id) => doc.querySelector(`button[data-menu-id="${id}"]:not([aria-haspopup])`);
const save = (menuBar, layout) => { const snap = menuBar.getLayoutSnapshot(); return menuBar.saveLayout(layout, { owner:snap.owner, token:snap.token }); };

test("per-trainer menu layout survives A/B/A with original buttons, native dispatch and system tail", t => {
  const s = setup(t, { systems:true });
  const toolbar = s.doc.querySelector(".pokeidle-top-toolbar"), team = button(s.doc, "team"), hunts = button(s.doc, "hunts");
  const originalShortcut = team.getAttribute("aria-keyshortcuts");
  let clicks = 0; team.addEventListener("click", () => clicks++);
  let layout = move(s.menuBar.getLayoutSnapshot().layout, "native:settings", "group:automation", 0);
  layout = move(layout, "native:team", "bar", 0);
  layout.orientation = "vertical";
  assert.equal(save(s.menuBar, layout).ok, true);
  s.app.reconcile();
  assert.equal(team.parentElement, toolbar);
  assert.equal(button(s.doc, "settings").closest("[data-ppbui-group]").dataset.ppbuiGroup, "automation");
  assert.equal(team.getAttribute("aria-keyshortcuts"), originalShortcut);
  team.click(); assert.equal(clicks, 1);
  const systemTail = [...toolbar.children].filter(node => node.matches(".pokeidle-top-toolbar__btn,.pokeidle-top-toolbar__group")).slice(-2);
  assert.ok(systemTail[0].hasAttribute("data-ppbui-card-mode-toggle"));
  assert.equal(systemTail[1].dataset.ppbuiModule, "module-controls");
  assert.equal(s.menuBar.getOrientation(), "vertical");
  s.setOwner("B");
  assert.equal(team.closest("[data-ppbui-group]").dataset.ppbuiGroup, "player");
  assert.equal(s.menuBar.getOrientation(), "horizontal");
  const other = move(s.menuBar.getLayoutSnapshot().layout, "native:hunts", "bar", 0);
  assert.equal(save(s.menuBar, other).ok, true);
  assert.notEqual(s.win.localStorage.getItem(key("A")), s.win.localStorage.getItem(key("B")));
  s.setOwner("A");
  assert.equal(team.parentElement, toolbar);
  assert.equal(button(s.doc, "hunts"), hunts);
  assert.equal(s.menuBar.getOrientation(), "vertical");
  assert.equal(s.menuBar.getLayoutSnapshot().layout.bar[0], "native:team");
});

test("native full and partial rebuilds use saved IDs and preserve restrictions without duplicate actions", t => {
  const s = setup(t);
  const layout = move(s.menuBar.getLayoutSnapshot().layout, "native:hunts", "bar", 0);
  assert.equal(save(s.menuBar, layout).ok, true);
  const original = s.doc.querySelector(".pokeidle-top-toolbar");
  const fresh = new JSDOM(fixture).window.document.querySelector(".pokeidle-top-toolbar");
  const replacement = s.doc.importNode(fresh, true);
  original.replaceWith(replacement); s.app.reconcile();
  assert.equal([...replacement.children].find(node => node.dataset.menuId)?.dataset.menuId, "hunts");
  const team = button(s.doc, "team"), newTeam = team.cloneNode(true);
  let clicks = 0; newTeam.addEventListener("click", () => clicks++);
  team.replaceWith(newTeam); s.app.reconcile(); newTeam.click();
  assert.equal(clicks, 1);
  assert.equal(s.doc.querySelectorAll('button[data-menu-id="team"]:not([aria-haspopup])').length, 1);
  const admin = button(s.doc, "game-admin"); admin.hidden = true; s.app.reconcile();
  assert.equal(s.menuBar.getLayoutSnapshot().catalog.some(item => item.id === "native:game-admin"), false);
  const custom = move(s.menuBar.getLayoutSnapshot().layout, "native:game-admin", "group:social", 0);
  assert.equal(save(s.menuBar, custom).ok, true);
  assert.equal(admin.hidden, true);
  admin.hidden = false; s.app.reconcile();
  assert.equal(admin.closest("[data-ppbui-group]").dataset.ppbuiGroup, "social");
});

test("identity disagreement/logout closes the editor and rejects writes for the preceding account", t => {
  const s = setup(t);
  const snap = s.menuBar.getLayoutSnapshot();
  assert.equal(s.menuBar.openEditor(), true);
  s.setOwner("B", "A", "auth.trainerUpdated");
  assert.equal(s.menuBar.getLayoutSnapshot().owner, "");
  assert.equal(s.menuBar.saveLayout(snap.layout, { owner:"A", token:snap.token }).error, "owner-changed");
  const root = s.doc.querySelector("[data-ppbui-menu-layout-editor]");
  assert.ok(!root || root.hidden || root.getAttribute("aria-hidden") === "true");
  s.setOwner("B");
  assert.equal(s.menuBar.getLayoutSnapshot().owner, "B");
  s.setOwner(null, "B", "auth.loggedOut");
  assert.equal(s.menuBar.getLayoutSnapshot().owner, "");
  assert.equal(s.menuBar.openEditor(), false);
  assert.equal(s.win.localStorage.getItem(key("")), null);
});

test("external edits conflict with a stale draft and protected storage is never implicitly overwritten", t => {
  const s = setup(t);
  const old = s.menuBar.getLayoutSnapshot();
  const external = createMenuLayoutStorage({ storage:() => s.win.localStorage, events:s.win });
  t.after(() => external.dispose());
  const changed = move(old.layout, "native:hunts", "bar", 0);
  assert.equal(external.write("A", changed, { expectedToken:old.token }).ok, true);
  s.win.dispatchEvent(new s.win.StorageEvent("storage", { key:key("A") }));
  assert.equal(s.menuBar.getLayoutSnapshot().layout.bar[0], "native:hunts");
  assert.equal(s.menuBar.saveLayout(old.layout, { owner:"A", token:old.token }).error, "conflict");
  s.win.localStorage.setItem(key("A"), '{"version":999}');
  s.win.dispatchEvent(new s.win.StorageEvent("storage", { key:key("A") }));
  const protectedSnap = s.menuBar.getLayoutSnapshot();
  assert.equal(protectedSnap.issue, "future-version");
  assert.equal(save(s.menuBar, defaultLayout()).error, "protected-record");
  assert.equal(s.win.localStorage.getItem(key("A")), '{"version":999}');
  assert.equal(s.menuBar.saveLayout(defaultLayout(), { owner:"A", token:protectedSnap.token, overwrite:true }).ok, true);
});

test("session-only layouts survive disable/re-enable while native nodes restore", t => {
  const s = setup(t, { storage:() => { throw new Error("blocked"); } });
  const hunts = button(s.doc, "hunts");
  const result = save(s.menuBar, move(s.menuBar.getLayoutSnapshot().layout, "native:hunts", "bar", 0));
  assert.equal(result.ok, true); assert.equal(result.persistent, false);
  s.preferences.setEnabled("menu-bar", false);
  assert.equal(s.doc.querySelector("[data-ppbui-menu-bar]"), null);
  s.preferences.setEnabled("menu-bar", true);
  assert.equal(s.menuBar.getLayoutSnapshot().layout.bar[0], "native:hunts");
  assert.equal(button(s.doc, "hunts"), hunts);
});

test("stable custom layout reconciliation does not rewrite its DOM", t => {
  const s = setup(t);
  assert.equal(save(s.menuBar, move(s.menuBar.getLayoutSnapshot().layout, "native:hunts", "bar", 0)).ok, true);
  s.app.reconcile();
  const records = [], observer = new s.win.MutationObserver(list => records.push(...list));
  observer.observe(s.doc.body, { subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:["hidden", "disabled", "aria-hidden", "aria-disabled"] });
  s.app.reconcile(); s.app.reconcile();
  records.push(...observer.takeRecords()); observer.disconnect();
  assert.equal(records.length, 0);
});

test("owner reader never uses stale presence when an authenticated summary is missing", () => {
  const win = { PokeIdle:{ Auth:{ getTrainerSummary:() => null }, WorldPresence:{ getSelfTrainerId:() => "old" } } };
  assert.equal(readMenuLayoutOwner(win).owner, "");
  win.PokeIdle.Auth.getTrainerSummary = () => ({ id:"fresh" });
  assert.equal(readMenuLayoutOwner(win).owner, "");
  win.PokeIdle.WorldPresence.getSelfTrainerId = () => "fresh";
  assert.equal(readMenuLayoutOwner(win).owner, "fresh");
  win.PokeIdle.Auth.isAuthenticated = () => false;
  assert.equal(readMenuLayoutOwner(win).owner, "");
  win.PokeIdle.Auth.isAuthenticated = () => true;
  for (const id of [NaN,Infinity,-Infinity,true,{}]) {
    win.PokeIdle.Auth.getTrainerSummary = () => ({id});
    win.PokeIdle.WorldPresence.getSelfTrainerId = () => id;
    assert.equal(readMenuLayoutOwner(win).owner, "", "malformed numeric identities are not storage owners");
  }
});

test("compatibility fallback recovers on native visibility changes without retry churn", t => {
  let future;
  const s = setup(t, { beforeStart:({ doc }) => {
    future = doc.createElement("button");
    future.dataset.menuId = "future-feature";
    future.className = "pokeidle-top-toolbar__btn";
    future.textContent = "Future feature";
    doc.querySelector(".pokeidle-top-toolbar").append(future);
  } });
  assert.equal(s.menuBar.getLayoutSnapshot().issue, "incompatible-menu");
  assert.equal(s.doc.querySelector("[data-ppbui-menu-bar]"), null);
  const observer = new s.win.MutationObserver(() => {});
  observer.observe(s.doc.body, { childList:true, subtree:true });
  s.app.reconcile(); s.app.reconcile();
  assert.equal(observer.takeRecords().length, 0, "stable incompatibility does not mount and tear down continuously");
  observer.disconnect();
  future.hidden = true;
  s.app.reconcile();
  assert.equal(s.menuBar.getLayoutSnapshot().issue, null);
  assert.ok(s.doc.querySelector("[data-ppbui-menu-bar]"));
  assert.equal(future.hidden, true);
  assert.ok(future.isConnected);
  future.hidden = false;
  s.app.reconcile();
  assert.equal(s.menuBar.getLayoutSnapshot().issue, "incompatible-menu", "newly visible unclassified actions retain native access instead of overflowing the custom rail");
  assert.ok(future.isConnected);
});

test("Customize opens a passive connected editor in Game and Cards and Cancel preserves the live layout", t => {
  const s = setup(t, { systems:true });
  const trigger = s.doc.querySelector('[aria-controls="ppbui-module-panel"]');
  let dispatches = 0;
  for (const node of s.doc.querySelectorAll("button[data-menu-id]")) node.addEventListener("click", () => dispatches++);
  trigger.click();
  s.doc.querySelector("[data-ppbui-menu-customize]").click();
  const root = s.doc.querySelector("[data-ppbui-menu-layout-editor]");
  assert.ok(root.isConnected); assert.equal(root.hidden, false);
  const original = s.menuBar.getLayoutSnapshot().layout;
  const item = root.querySelector('[data-ppbui-menu-layout-item="native:hunts"]');
  item.click();
  root.querySelector('[data-ppbui-menu-layout-focus="previous"]').click();
  assert.deepEqual(s.menuBar.getLayoutSnapshot().layout, original, "editing a preview does not mutate the applied layout");
  assert.equal(root.querySelector("[data-menu-id]"), null);
  assert.equal(dispatches, 0);
  root.querySelector("[data-ppbui-menu-layout-cancel]").click();
  assert.equal(root.hidden, true); assert.equal(s.doc.activeElement, trigger);
  s.doc.querySelector("[data-ppbui-card-mode-toggle]").click();
  assert.equal(s.doc.documentElement.getAttribute("data-ppbui-card-mode"), "cards");
  trigger.click(); s.doc.querySelector("[data-ppbui-menu-customize]").click();
  assert.equal(root.hidden, false);
  assert.equal(s.doc.documentElement.getAttribute("data-ppbui-card-mode"), "cards", "opening the layout editor is not a native navigation action");
  const observer = new s.win.MutationObserver(() => {});
  observer.observe(root, { subtree:true, childList:true, attributes:true, characterData:true });
  s.app.reconcile(); s.app.reconcile();
  assert.equal(observer.takeRecords().length, 0, "an open editor remains quiescent under central reconciliation");
  observer.disconnect();
});

test("relocated City shortcuts keep native dispatch and contextual Return remains first after saving", t => {
  let nativeReturn, nativeBar, npcCalls = 0;
  const s = setup(t, { systems:true, hunt:true, beforeStart:({ win, doc }) => {
    win.PokeIdle.t = key => ({ "hud.return_to_city_caps":"RETURN TO CITY", "hud.capture_caps":"CAPTURE", "hud.revive_caps":"REVIVE" }[key] || key);
    win.PokeIdle.NPC = { open:() => npcCalls++ };
    nativeBar = doc.createElement("div"); nativeBar.className = "pokeidle-map-action-bar";
    for (const name of ["RETURN TO CITY", "CAPTURE", "REVIVE"]) {
      const node = doc.createElement("button"); node.type = "button"; node.className = "pokeidle-btn pokeidle-map-action-bar__button"; node.textContent = name;
      if (name === "RETURN TO CITY") nativeReturn = node;
      nativeBar.append(node);
    }
    doc.body.append(nativeBar);
  } });
  let layout = move(s.menuBar.getLayoutSnapshot().layout, "native:settings", "group:automation", 0);
  layout = move(layout, "city-shortcut:nature", "bar", 0);
  assert.equal(save(s.menuBar, layout).ok, true); s.app.reconcile();
  const city = s.menuBar.getGroupTarget("city");
  assert.equal(city.dropdown.firstElementChild, nativeReturn);
  assert.equal(city.trigger.querySelectorAll(".ppbui-hunt-return-badge").length, 1);
  assert.equal(s.menuBar.getLayoutSnapshot().layout.groups["group:city"].some(id => id.includes("hunt-return")), false);
  s.doc.querySelector("[data-ppbui-card-mode-toggle]").click();
  const nature = s.doc.querySelector('[data-ppbui-city-action="nature"]');
  assert.equal(nature.parentElement, s.doc.querySelector(".pokeidle-top-toolbar"));
  nature.click();
  assert.equal(s.doc.documentElement.getAttribute("data-ppbui-card-mode"), "game");
  assert.equal(npcCalls, 1);
  s.preferences.setEnabled("menu-bar", false);
  assert.equal(nativeReturn.parentElement, nativeBar);
  s.preferences.setEnabled("menu-bar", true);
  assert.equal(s.menuBar.getGroupTarget("city").dropdown.firstElementChild, nativeReturn);
});

test("a temporarily absent action returns to its saved group with its new native node", t => {
  const s = setup(t);
  assert.equal(save(s.menuBar, move(s.menuBar.getLayoutSnapshot().layout,"native:ranking","group:player",0)).ok, true);
  const old = button(s.doc,"ranking"), replacement = old.cloneNode(true);
  old.remove(); s.app.reconcile();
  assert.equal(s.menuBar.getLayoutSnapshot().catalog.some(entry => entry.id === "native:ranking"), false);
  assert.equal(s.menuBar.getLayoutSnapshot().layout.groups["group:player"][0], "native:ranking");
  s.doc.querySelector(".pokeidle-top-toolbar").append(replacement); s.app.reconcile();
  assert.equal(button(s.doc,"ranking"), replacement);
  assert.equal(replacement.closest("[data-ppbui-group]").dataset.ppbuiGroup, "player");
});

test("native drag positions are owner-scoped and clamp after switching trainers", t => {
  let rect, toolbar;
  const s = setup(t, { beforeStart:({ win,doc }) => {
    toolbar = doc.querySelector(".pokeidle-top-toolbar");
    toolbar.classList.add("pokeidle-pokehub", "pokeidle-island");
    const handle = doc.createElement("button"); handle.className = "pokeidle-pokehub__handle"; toolbar.prepend(handle);
    Object.defineProperty(win,"innerWidth",{configurable:true,value:1200});
    Object.defineProperty(win,"innerHeight",{configurable:true,value:900});
    rect = {left:8,top:8,right:808,bottom:72,width:800,height:64};
    toolbar.getBoundingClientRect = () => rect;
  } });
  const drag = (left,top) => {
    toolbar.querySelector(".pokeidle-pokehub__handle").dispatchEvent(new s.win.Event("pointerdown",{bubbles:true}));
    rect = {left,top,right:left+800,bottom:top+64,width:800,height:64};
    toolbar.style.setProperty("left",`${left}px`,"important"); toolbar.style.setProperty("top",`${top}px`,"important");
    s.win.dispatchEvent(new s.win.Event("pointerup"));
  };
  drag(80,120);
  assert.deepEqual(s.menuBar.getLayoutSnapshot().layout.position,{left:80,top:120});
  s.setOwner("B");
  assert.equal(toolbar.style.left,"8px");
  drag(2000,2000);
  assert.deepEqual(s.menuBar.getLayoutSnapshot().layout.position,{left:392,top:828});
  s.setOwner("A");
  assert.equal(toolbar.style.left,"80px"); assert.equal(toolbar.style.top,"120px");
  assert.equal(s.win.localStorage.getItem("ppbui:menu-bar-position:v1"),null);
});

test("native emoji icons are not mistaken for destination labels in the layout catalog", t => {
  let emoji;
  const s = setup(t,{beforeStart:({doc}) => {
    const pack = button(doc,"beta-goals");
    pack.querySelector("img").remove();
    emoji = doc.createElement("span"); emoji.className = "pokeidle-top-toolbar__icon pokeidle-top-toolbar__emoji"; emoji.textContent = "◈";
    pack.prepend(emoji);
  }});
  assert.equal(s.menuBar.getLayoutSnapshot().catalog.find(entry => entry.id === "native:beta-goals").label,"Pack");
  assert.equal(emoji.classList.contains("pokeidle-top-toolbar__label"),false);
});

test("same-owner native rebuilds preserve the unsaved editor draft and recover a current close target", t => {
  const s=setup(t,{systems:true});
  const origin=s.doc.querySelector('[aria-controls="ppbui-module-panel"]');
  s.menuBar.openEditor(origin);
  const root=s.doc.querySelector("[data-ppbui-menu-layout-editor]"),orientation=root.querySelector("[data-ppbui-menu-layout-orientation]");
  orientation.value="vertical";orientation.dispatchEvent(new s.win.Event("change",{bubbles:true}));
  const team=button(s.doc,"team");team.replaceWith(team.cloneNode(true));s.app.reconcile();
  assert.ok(root.isConnected);assert.equal(root.hidden,false);
  assert.equal(root.querySelector("[data-ppbui-menu-layout-orientation]").value,"vertical");
  assert.equal(s.menuBar.getLayoutSnapshot().layout.orientation,"horizontal","draft is still uncommitted");
  const parsed=new s.win.DOMParser().parseFromString(fixture,"text/html");
  s.doc.querySelector(".pokeidle-top-toolbar").replaceWith(parsed.querySelector(".pokeidle-top-toolbar"));s.app.reconcile();
  assert.ok(root.isConnected);assert.equal(root.hidden,false);
  assert.equal(root.querySelector("[data-ppbui-menu-layout-orientation]").value,"vertical");
  root.querySelector("[data-ppbui-menu-layout-cancel]").click();
  assert.equal(s.doc.activeElement,s.doc.querySelector('[aria-controls="ppbui-module-panel"]'));
});

test("position writes apply an external arrangement observed before its delayed storage event", t => {
  const s=setup(t,{beforeStart:({win,doc})=>{
    const toolbar=doc.querySelector(".pokeidle-top-toolbar");toolbar.classList.add("pokeidle-pokehub","pokeidle-island");
    const handle=doc.createElement("button");handle.className="pokeidle-pokehub__handle";toolbar.prepend(handle);
    toolbar.getBoundingClientRect=()=>({left:40,top:60,right:840,bottom:124,width:800,height:64});
    Object.defineProperty(win,"innerWidth",{value:1200,configurable:true});Object.defineProperty(win,"innerHeight",{value:900,configurable:true});
  }});
  const external=createMenuLayoutStorage({storage:()=>s.win.localStorage,events:s.win});t.after(()=>external.dispose());
  const snapshot=s.menuBar.getLayoutSnapshot();
  const layout=move(snapshot.layout,"native:hunts","bar",0);
  assert.equal(external.write("A",layout,{expectedToken:snapshot.token}).ok,true);
  s.doc.querySelector(".pokeidle-pokehub__handle").dispatchEvent(new s.win.Event("pointerdown",{bubbles:true}));
  s.win.dispatchEvent(new s.win.Event("pointerup"));
  s.win.dispatchEvent(new s.win.StorageEvent("storage",{key:key("A")}));s.app.reconcile();
  assert.equal(s.menuBar.getLayoutSnapshot().layout.bar[0],"native:hunts");
  const direct=[...s.doc.querySelector(".pokeidle-top-toolbar").children].filter(node=>node.matches('button[data-menu-id]:not([aria-haspopup="menu"])'));
  assert.equal(direct[0].dataset.menuId,"hunts");
  assert.equal(s.menuBar.getLayoutSnapshot().issue,null);
});

test("unrelated editor pointerup does not create a position revision or a false dirty-draft conflict", t => {
  const s=setup(t,{beforeStart:({doc})=>{
    const toolbar=doc.querySelector(".pokeidle-top-toolbar");toolbar.classList.add("pokeidle-pokehub","pokeidle-island");
    const handle=doc.createElement("button");handle.className="pokeidle-pokehub__handle";toolbar.prepend(handle);
    toolbar.getBoundingClientRect=()=>({left:8,top:8,right:788,bottom:72,width:780,height:64});
  }});
  s.menuBar.openEditor();
  const before=s.menuBar.getLayoutSnapshot(),root=s.doc.querySelector("[data-ppbui-menu-layout-editor]");
  const orientation=root.querySelector("[data-ppbui-menu-layout-orientation]");orientation.value="vertical";orientation.dispatchEvent(new s.win.Event("change",{bubbles:true}));
  s.win.dispatchEvent(new s.win.Event("pointerup"));s.app.reconcile();
  assert.equal(s.menuBar.getLayoutSnapshot().token,before.token);
  assert.equal(root.querySelector("[data-ppbui-menu-layout-orientation]").value,"vertical");
  assert.equal(root.querySelector("[data-ppbui-menu-layout-conflict]").hidden,true);
});

test("previously direct destinations move into groups while capacity survives A/B/A and restart", t => {
  const s=setup(t,{systems:true});
  const inventory=button(s.doc,"inventory"),hunts=button(s.doc,"hunts"),mail=button(s.doc,"private-message");
  let calls=0; for(const node of [inventory,hunts,mail])node.addEventListener("click",()=>calls++);
  let layout=s.menuBar.getLayoutSnapshot().layout;
  layout=move(layout,"native:inventory","group:player",0);
  layout=move(layout,"native:hunts","group:city",0);
  layout=move(layout,"native:private-message","group:social",0);
  layout.slotCapacity=10;
  assert.equal(save(s.menuBar,layout).ok,true);s.app.reconcile();
  assert.equal(inventory.parentElement,s.menuBar.getGroupTarget("player").dropdown);
  assert.equal(hunts.parentElement,s.menuBar.getGroupTarget("city").dropdown);
  assert.equal(mail.parentElement,s.menuBar.getGroupTarget("social").dropdown);
  const toolbar=s.doc.querySelector(".pokeidle-top-toolbar");
  assert.equal(toolbar.style.getPropertyValue("--ppbui-menu-slot-capacity"),"10");
  for(const node of [inventory,hunts,mail])node.click();assert.equal(calls,3);
  s.setOwner("B");assert.equal(s.menuBar.getLayoutSnapshot().layout.slotCapacity,13);
  assert.equal(save(s.menuBar,{...s.menuBar.getLayoutSnapshot().layout,slotCapacity:15}).ok,true);
  s.setOwner("A");assert.equal(s.menuBar.getLayoutSnapshot().layout.slotCapacity,10);
  assert.equal(inventory.parentElement,s.menuBar.getGroupTarget("player").dropdown);
  s.app.stop();s.app.start();s.app.reconcile();
  assert.equal(s.menuBar.getLayoutSnapshot().layout.slotCapacity,10);
  assert.equal(button(s.doc,"inventory"),inventory);
});

test("Cards/Game and Better UI work from groups without mandatory system tail or remount churn", t => {
  const s=setup(t,{systems:true});
  const card=s.doc.querySelector("[data-ppbui-card-mode-toggle]"),controls=s.doc.querySelector('[data-ppbui-module="module-controls"]');
  const trigger=controls.querySelector(":scope > button");
  let layout=move(s.menuBar.getLayoutSnapshot().layout,SYSTEM_IDS.cardMode,"group:automation",0);
  layout=move(layout,SYSTEM_IDS.moduleControls,"group:player",1);
  assert.equal(save(s.menuBar,layout).ok,true);s.app.reconcile();
  assert.equal(card.parentElement,s.menuBar.getGroupTarget("automation").dropdown);
  assert.equal(controls.parentElement,s.menuBar.getGroupTarget("player").dropdown);
  s.menuBar.getGroupTarget("automation").trigger.click();card.click();
  assert.equal(s.doc.documentElement.getAttribute("data-ppbui-card-mode"),"cards");
  s.app.reconcile();
  s.menuBar.getGroupTarget("player").trigger.click();trigger.click();
  const panel=s.doc.getElementById("ppbui-module-panel");
  assert.equal(panel.parentElement,s.doc.body,"preferences escape the collapsed parent dropdown");
  assert.equal(panel.hasAttribute("data-ppbui-menu-controls-portal"),true);
  assert.notEqual(panel.style.display,"none");
  s.app.reconcile();assert.equal(s.doc.getElementById("ppbui-module-panel"),panel);
  panel.querySelector("[data-ppbui-menu-customize]").click();
  const editor=s.doc.querySelector("[data-ppbui-menu-layout-editor]");
  assert.equal(editor.hidden,false);assert.equal(s.doc.documentElement.getAttribute("data-ppbui-card-mode"),"cards");
  editor.querySelector("[data-ppbui-menu-layout-cancel]").click();
  assert.equal(s.doc.activeElement,trigger);
  assert.equal(s.menuBar.getGroupTarget("player").trigger.getAttribute("aria-expanded"),"true");
  const observer=new s.win.MutationObserver(()=>{});observer.observe(s.doc.body,{subtree:true,childList:true});
  s.app.reconcile();s.app.reconcile();assert.equal(observer.takeRecords().length,0);observer.disconnect();
  layout=move(s.menuBar.getLayoutSnapshot().layout,SYSTEM_IDS.moduleControls,"bar",0);
  layout=move(layout,SYSTEM_IDS.cardMode,"bar",1);
  assert.equal(save(s.menuBar,layout).ok,true);s.app.reconcile();
  const items=[...s.doc.querySelector(".pokeidle-top-toolbar").children].filter(node=>node.matches("button,.pokeidle-top-toolbar__group"));
  assert.equal(items[0],controls);assert.equal(items[1],card);
});

test("system-only groups stay usable and full native replacement recovers their registered nodes", t => {
  const s=setup(t,{systems:true});
  const card=s.doc.querySelector("[data-ppbui-card-mode-toggle]");
  let layout=s.menuBar.getLayoutSnapshot().layout;
  for(const id of [...layout.groups["group:shop"]])layout=move(layout,id,"group:city",0);
  layout=move(layout,SYSTEM_IDS.cardMode,"group:shop",0);
  layout=move(layout,SYSTEM_IDS.moduleControls,"group:shop",1);
  assert.equal(save(s.menuBar,layout).ok,true);s.app.reconcile();
  assert.notEqual(s.menuBar.getGroupTarget("shop").group.style.display,"none");
  const parsed=new s.win.DOMParser().parseFromString(fixture,"text/html");
  s.doc.querySelector(".pokeidle-top-toolbar").replaceWith(parsed.querySelector(".pokeidle-top-toolbar"));s.app.reconcile();
  assert.equal(card.parentElement,s.menuBar.getGroupTarget("shop").dropdown);
  assert.equal(s.doc.querySelectorAll("[data-ppbui-card-mode-toggle]").length,1);
  const control=s.doc.querySelector('[data-ppbui-module="module-controls"]');
  assert.equal(control.parentElement,s.menuBar.getGroupTarget("shop").dropdown);
  s.preferences.setEnabled("menu-bar",false);
  assert.equal(card.parentElement,s.doc.querySelector(".pokeidle-top-toolbar"));
  assert.equal(control.parentElement,s.doc.querySelector(".pokeidle-top-toolbar"));
  s.preferences.setEnabled("menu-bar",true);s.app.reconcile();
  assert.equal(card.parentElement,s.menuBar.getGroupTarget("shop").dropdown);
});

test("empty group anchors stay available in the editor and can be repopulated without resetting", t => {
  const s=setup(t,{systems:true});let layout=s.menuBar.getLayoutSnapshot().layout;
  for(const id of [...layout.groups["group:shop"]])layout=move(layout,id,"group:city",0);
  assert.equal(save(s.menuBar,layout).ok,true);s.app.reconcile();
  assert.ok(s.menuBar.getLayoutSnapshot().catalog.some(entry=>entry.id==="group:shop"));
  assert.equal(s.menuBar.getGroupTarget("shop").group.style.display,"none");
  s.menuBar.openEditor();
  s.doc.querySelector('[data-ppbui-menu-layout-item="native:inventory"]').click();
  assert.ok([...s.doc.querySelector('[data-ppbui-menu-layout-move-to]').options].some(option=>option.value==="group:shop"&&!option.disabled));
  s.doc.querySelector('[data-ppbui-menu-layout-cancel]').click();
  assert.equal(save(s.menuBar,move(s.menuBar.getLayoutSnapshot().layout,"native:inventory","group:shop",0)).ok,true);s.app.reconcile();
  assert.equal(button(s.doc,"inventory").parentElement,s.menuBar.getGroupTarget("shop").dropdown);
  assert.notEqual(s.menuBar.getGroupTarget("shop").group.style.display,"none");
});

test("moved reward and mail badges remain native and announce only their current destination group", t => {
  const s=setup(t);
  const quest=button(s.doc,"quests"),questBadge=quest.querySelector(".pokeidle-top-toolbar__badge");
  const mail=button(s.doc,"private-message"),mailBadge=mail.querySelector(".pokeidle-top-toolbar__badge");
  const nativeAggregate=s.menuBar.getGroupTarget("activities").trigger.querySelector(".pokeidle-top-toolbar__reward-badge");
  let layout=move(s.menuBar.getLayoutSnapshot().layout,"native:quests","group:city",0);
  layout=move(layout,"native:private-message","group:social",0);
  assert.equal(save(s.menuBar,layout).ok,true);
  questBadge.textContent="3";questBadge.hidden=false;mailBadge.textContent="2";mailBadge.hidden=false;
  nativeAggregate.textContent="3";nativeAggregate.hidden=false;s.app.reconcile();
  assert.equal(quest.querySelector(".pokeidle-top-toolbar__badge"),questBadge);
  assert.equal(mail.querySelector(".pokeidle-top-toolbar__badge"),mailBadge);
  assert.equal(nativeAggregate.style.display,"none","former Goals total must not imply the moved quest is still inside Goals");
  assert.match(s.menuBar.getGroupTarget("city").trigger.getAttribute("aria-label"),/Quests: 3/);
  assert.match(s.menuBar.getGroupTarget("social").trigger.getAttribute("aria-label"),/Mailbox: 2/);
  assert.doesNotMatch(s.menuBar.getGroupTarget("activities").trigger.getAttribute("aria-label"),/Quests: 3/);
  questBadge.hidden=true;s.app.reconcile();
  assert.equal(s.menuBar.getGroupTarget("city").trigger.querySelector("[data-ppbui-menu-notification]").hidden,true);
  s.preferences.setEnabled("menu-bar",false);
  assert.equal(nativeAggregate.style.display,"");assert.equal(nativeAggregate.hidden,false);
  assert.equal(s.doc.querySelector("[data-ppbui-menu-notification]"),null);
});

test("City notifications compose with active Hunt context and clear without dropping either owner", t => {
  let huntBar;
  const s=setup(t,{hunt:true,beforeStart:({win,doc})=>{
    win.PokeIdle.t=key=>({"hud.return_to_city_caps":"RETURN TO CITY","hud.capture_caps":"CAPTURE","hud.revive_caps":"REVIVE"}[key]||key);
    huntBar=doc.createElement("div");huntBar.className="pokeidle-map-action-bar";
    for(const name of ["RETURN TO CITY","CAPTURE","REVIVE"]){const node=doc.createElement("button");node.className="pokeidle-btn pokeidle-map-action-bar__button";node.textContent=name;huntBar.append(node);}
    doc.body.append(huntBar);
  }});
  let layout=move(s.menuBar.getLayoutSnapshot().layout,"native:private-message","group:city",0);
  layout=move(layout,"native:quests","group:city",1);
  assert.equal(save(s.menuBar,layout).ok,true);s.app.reconcile();
  const mailBadge=button(s.doc,"private-message").querySelector(".pokeidle-top-toolbar__badge"),questBadge=button(s.doc,"quests").querySelector(".pokeidle-top-toolbar__badge");
  mailBadge.textContent="7";mailBadge.hidden=false;questBadge.textContent="99+";questBadge.hidden=false;
  s.app.reconcile();s.app.reconcile();
  const trigger=s.menuBar.getGroupTarget("city").trigger;
  assert.match(trigger.getAttribute("aria-label"),/RETURN TO CITY/);
  assert.match(trigger.getAttribute("aria-label"),/Mailbox: 7; Quests: 99\+/);
  huntBar.hidden=true;s.app.reconcile();
  assert.doesNotMatch(trigger.getAttribute("aria-label"),/RETURN TO CITY/);
  assert.match(trigger.getAttribute("aria-label"),/Mailbox: 7; Quests: 99\+/);
  huntBar.hidden=false;mailBadge.hidden=true;questBadge.hidden=true;s.app.reconcile();
  assert.equal(trigger.getAttribute("aria-label"),"City. RETURN TO CITY");
  const observer=new s.win.MutationObserver(()=>{});observer.observe(trigger,{attributes:true,childList:true,subtree:true});
  s.app.reconcile();s.app.reconcile();assert.equal(observer.takeRecords().length,0);observer.disconnect();
});
