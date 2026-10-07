import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createMenuLayoutEditor } from "../src/modules/menu-bar/layout-editor.js";
import { defaultLayout, getPlacement, MENU_CATALOG, moveLayoutItem, SLOT_CAPACITY, slotCount } from "../src/modules/menu-bar/layout-model.js";

const cloneLayout = layout => ({
  ...layout,
  bar:[...layout.bar],
  groups:Object.fromEntries(Object.entries(layout.groups).map(([id,list]) => [id,[...list]])),
  position:layout.position ? { ...layout.position } : null,
});

function makeCatalog(doc, { unavailable = [] } = {}) {
  const blocked = new Set(unavailable);
  return MENU_CATALOG.map(entry => {
    const icon = doc.createElement("span");
    icon.id = `icon-${entry.id.replace(/[^a-z0-9]+/gi,"-")}`;
    icon.dataset.menuId = "must-not-leak";
    icon.setAttribute("onclick","window.__previewAction = true");
    icon.textContent = "◆";
    return {
      id:entry.id,
      label:blocked.has(entry.id) ? `SECRET ${entry.id}` : entry.id.replace(/^(native:|group:|city-shortcut:|betterui:|system:)/,""),
      icon,
      available:!blocked.has(entry.id),
      kind:entry.kind,
      allowedContainers:[...entry.allowedContainers],
      ...(entry.lockedReason ? { lockedReason:entry.lockedReason } : {}),
    };
  });
}

function setup(t, { language = "en-US", unavailable = [], onSave:saveOverride } = {}) {
  const dom = new JSDOM("<!doctype html><html><head></head><body><button id='origin'>Open</button></body></html>",{
    url:"https://example.test/",
    pretendToBeVisual:true,
  });
  const { document:doc } = dom.window;
  dom.window.PokeIdle = { Localization:{ get:()=>language } };
  let state = {
    owner:"trainer-a",
    ownerLabel:"Trainer A",
    layout:defaultLayout(),
    token:"token-1",
    persistent:true,
    issue:null,
    enabled:true,
    catalog:makeCatalog(doc,{ unavailable }),
  };
  const saves = [];
  const onSave = saveOverride || (async (layout,options) => {
    saves.push({ layout:cloneLayout(layout), options:{ ...options } });
    state = { ...state,layout:cloneLayout(layout),token:`token-${saves.length + 1}`,persistent:true,issue:null };
    return { ok:true,persistent:true,layout:cloneLayout(layout),token:state.token };
  });
  const editor = createMenuLayoutEditor({ doc,getSnapshot:()=>state,onSave });
  doc.body.append(editor.root);
  t.after(()=>{ editor.dispose(); dom.window.close(); });
  return {
    dom,doc,editor,saves,
    origin:doc.querySelector("#origin"),
    get state(){ return state; },
    setState(next){ state = { ...state,...next }; },
  };
}

const click = node => node.dispatchEvent(new node.ownerDocument.defaultView.MouseEvent("click",{ bubbles:true,cancelable:true }));
const change = (node,value) => {
  node.value = value;
  node.dispatchEvent(new node.ownerDocument.defaultView.Event("change",{ bubbles:true }));
};
const tick = () => new Promise(resolve => setTimeout(resolve,0));
const item = (root,id) => [...root.querySelectorAll("[data-ppbui-menu-layout-item]")].find(node => node.dataset.ppbuiMenuLayoutItem === id);
const dragEvent = (win,type,dataTransfer = { setData(){},effectAllowed:"" }) => {
  const event = new win.Event(type,{ bubbles:true,cancelable:true });
  Object.defineProperty(event,"dataTransfer",{ value:dataTransfer });
  return event;
};

test("editor opens as a modal for the active profile and preview icons stay passive/sanitized", t => {
  const s = setup(t,{ language:"pt-BR" });
  s.origin.focus();
  assert.equal(s.editor.open(s.origin),true);
  const root = s.editor.root;
  assert.equal(root.hidden,false);
  assert.equal(root.getAttribute("role"),"dialog");
  assert.equal(root.getAttribute("aria-modal"),"true");
  assert.match(root.querySelector("h2").textContent,/Personalizar menu bar/);
  assert.match(root.textContent,/Perfil: Trainer A/);
  assert.equal(root.querySelector("[data-menu-id]"),null,"editor must not expose game action selectors");
  assert.equal(root.querySelector("[onclick]"),null,"inline action attributes are removed from icon clones");
  assert.equal(root.querySelector("[id^='icon-']"),null,"icon ids are removed to avoid duplicate references");
  assert.match(root.querySelector("[data-ppbui-menu-layout-counter]").textContent,/13\/13/);
  const capacity = root.querySelector("[data-ppbui-menu-layout-capacity]");
  assert.equal(capacity.value,"13");
  assert.deepEqual([...capacity.options].map(option=>Number(option.value)),[10,11,12,13,14,15]);
  const inventory = item(root,"native:inventory");
  assert.ok(inventory);
  click(inventory.querySelector(".ppbui-menu-layout-editor__icon"));
  assert.equal(domAction(s.dom.window),false,"clicking a preview icon selects only the editor item");
  assert.match(root.querySelector("[data-ppbui-menu-layout-details]").textContent,/inventory/i);
});

function domAction(win) { return Boolean(win.__previewAction); }

test("drag/drop and explicit move controls reorder visible items with human 1-based positions", async t => {
  const s = setup(t);
  s.editor.open(s.origin);
  const root = s.editor.root;

  const hunts = item(root,"native:hunts");
  const inventory = item(root,"native:inventory");
  const dataTransfer = { setData(){},effectAllowed:"" };
  hunts.dispatchEvent(dragEvent(s.dom.window,"dragstart",dataTransfer));
  inventory.dispatchEvent(dragEvent(s.dom.window,"dragover",dataTransfer));
  assert.equal(inventory.dataset.dropPosition,"before","drag shows the insertion edge");
  inventory.dispatchEvent(dragEvent(s.dom.window,"drop",dataTransfer));
  assert.equal(root.querySelector("[data-ppbui-menu-layout-preview-list] [data-ppbui-menu-layout-item]").dataset.ppbuiMenuLayoutItem,"native:hunts");

  click(item(root,"betterui:pokemon-profile"));
  const fullBar = root.querySelector("[data-ppbui-menu-layout-move-to] option[value='bar']");
  assert.equal(fullBar.disabled,false,"draft may temporarily exceed the selected slot capacity");

  click(item(root,"native:settings"));
  change(root.querySelector("[data-ppbui-menu-layout-move-to]"),"group:automation");
  change(root.querySelector("[data-ppbui-menu-layout-position]"),"1");
  click(root.querySelector("[data-ppbui-menu-layout-apply]"));
  assert.match(root.querySelector("[data-ppbui-menu-layout-counter]").textContent,/12\/13/);
  assert.equal(root.querySelector("[data-ppbui-menu-layout-group-list='group:automation'] [data-ppbui-menu-layout-item]").dataset.ppbuiMenuLayoutItem,"native:settings");

  click(item(root,"betterui:pokemon-profile"));
  change(root.querySelector("[data-ppbui-menu-layout-move-to]"),"bar");
  change(root.querySelector("[data-ppbui-menu-layout-position]"),"1");
  click(root.querySelector("[data-ppbui-menu-layout-apply]"));
  assert.match(root.querySelector("[data-ppbui-menu-layout-counter]").textContent,/13\/13/);
  assert.equal(root.querySelector("[data-ppbui-menu-layout-preview-list] [data-ppbui-menu-layout-item]").dataset.ppbuiMenuLayoutItem,"betterui:pokemon-profile");

  click(root.querySelector("[data-ppbui-menu-layout-save]"));
  await tick();
  assert.equal(s.saves.length,1);
  assert.deepEqual(getPlacement(s.saves[0].layout,"betterui:pokemon-profile"),{ container:"bar",index:0 },"human position 1 maps to model index 0");
  assert.deepEqual(getPlacement(s.saves[0].layout,"native:settings"),{ container:"group:automation",index:0 });
  assert.equal(slotCount(s.saves[0].layout),13);
});

test("invalid dragover clears a prior insertion target and cannot reuse it on drop", t => {
  const s = setup(t);
  s.editor.open(s.origin);
  const root = s.editor.root;
  const cityGroup = item(root,"group:city");
  const team = item(root,"native:team");
  const inventory = item(root,"native:inventory");
  const dataTransfer = { setData(){},effectAllowed:"" };
  cityGroup.dispatchEvent(dragEvent(s.dom.window,"dragstart",dataTransfer));
  inventory.dispatchEvent(dragEvent(s.dom.window,"dragover",dataTransfer));
  assert.ok(root.querySelector("[data-drop-position]"),"first valid dragover exposes an insertion indicator");
  team.dispatchEvent(dragEvent(s.dom.window,"dragover",dataTransfer));
  assert.equal(root.querySelector("[data-drop-position]"),null,"invalid nested-group target clears the old indicator");
  team.dispatchEvent(dragEvent(s.dom.window,"drop",dataTransfer));
  assert.equal(item(root,"group:city").dataset.ppbuiMenuLayoutContainer,"bar","invalid drop cannot reuse the previous bar target");
});

test("system controls and former Goals-bound destinations can move like other non-group items", t => {
  const s = setup(t);
  s.editor.open(s.origin);
  const root = s.editor.root;
  click(item(root,"system:card-mode"));
  const details = root.querySelector("[data-ppbui-menu-layout-details]");
  const systemDestinations = [...details.querySelector("[data-ppbui-menu-layout-move-to]").options].map(option=>option.value);
  assert.ok(systemDestinations.includes("group:city"));
  change(details.querySelector("[data-ppbui-menu-layout-move-to]"),"group:city");
  change(details.querySelector("[data-ppbui-menu-layout-position]"),"1");
  click(details.querySelector("[data-ppbui-menu-layout-apply]"));
  assert.equal(item(root,"system:card-mode").dataset.ppbuiMenuLayoutContainer,"group:city");

  click(item(root,"native:quests"));
  const destinations = [...details.querySelector("[data-ppbui-menu-layout-move-to]").options].map(option=>option.value);
  assert.ok(destinations.includes("bar"));
  assert.ok(destinations.includes("group:social"));

  click(item(root,"group:city"));
  const groupDestinations = [...details.querySelector("[data-ppbui-menu-layout-move-to]").options].map(option=>option.value);
  assert.deepEqual(groupDestinations,["bar"],"group anchors remain structural and cannot be nested");
});

test("slot capacity 10-15 supports over-capacity drafts without automatic relocation and blocks save until fit", async t => {
  const s = setup(t);
  s.editor.open(s.origin);
  const root = s.editor.root;
  const capacity = root.querySelector("[data-ppbui-menu-layout-capacity]");
  assert.deepEqual(SLOT_CAPACITY,{ min:10,max:15,default:13 });

  change(capacity,"10");
  assert.match(root.querySelector("[data-ppbui-menu-layout-counter]").textContent,/13\/10/);
  assert.match(root.querySelector("[data-ppbui-menu-layout-counter]").textContent,/3/);
  assert.equal(root.querySelector("[data-ppbui-menu-layout-counter]").dataset.overCapacity,"true");
  assert.equal(root.querySelector("[data-ppbui-menu-layout-save]").disabled,true);
  assert.equal(root.querySelectorAll("[data-ppbui-menu-layout-preview-list] [data-ppbui-menu-layout-item]").length,13,"capacity change never hides or relocates items");

  const moveOut = (id,container) => {
    click(item(root,id));
    change(root.querySelector("[data-ppbui-menu-layout-move-to]"),container);
    change(root.querySelector("[data-ppbui-menu-layout-position]"),"1");
    click(root.querySelector("[data-ppbui-menu-layout-apply]"));
  };
  moveOut("native:inventory","group:player");
  assert.match(root.querySelector("[data-ppbui-menu-layout-counter]").textContent,/12\/10/);
  moveOut("native:hunts","group:city");
  assert.match(root.querySelector("[data-ppbui-menu-layout-counter]").textContent,/11\/10/);
  moveOut("native:private-message","group:social");
  assert.match(root.querySelector("[data-ppbui-menu-layout-counter]").textContent,/10\/10/);
  assert.equal(root.querySelector("[data-ppbui-menu-layout-counter]").dataset.overCapacity,"false");
  assert.equal(root.querySelector("[data-ppbui-menu-layout-save]").disabled,false);

  click(root.querySelector("[data-ppbui-menu-layout-save]"));
  await tick();
  assert.equal(s.saves.length,1);
  assert.equal(s.saves[0].layout.slotCapacity,10);
  assert.equal(slotCount(s.saves[0].layout),10);

  s.editor.open(s.origin);
  change(root.querySelector("[data-ppbui-menu-layout-capacity]"),"15");
  assert.match(root.querySelector("[data-ppbui-menu-layout-counter]").textContent,/10\/15/);
  assert.equal(root.querySelector("[data-ppbui-menu-layout-save]").disabled,false,"capacity can also be increased without moving items");
});

test("Cancel and Escape discard drafts, restore focus, and the dialog traps Tab", t => {
  const s = setup(t);
  s.origin.focus();
  s.editor.open(s.origin);
  const root = s.editor.root;
  const close = root.querySelector("[data-ppbui-menu-layout-close]");
  assert.equal(s.doc.activeElement,close);
  close.dispatchEvent(new s.dom.window.KeyboardEvent("keydown",{ key:"Tab",shiftKey:true,bubbles:true,cancelable:true }));
  assert.notEqual(s.doc.activeElement,s.doc.body,"Shift+Tab remains inside the modal");
  change(root.querySelector("[data-ppbui-menu-layout-orientation]"),"vertical");
  assert.equal(root.querySelector("[data-ppbui-menu-layout-save]").disabled,false);
  root.dispatchEvent(new s.dom.window.KeyboardEvent("keydown",{ key:"Escape",bubbles:true,cancelable:true }));
  assert.equal(root.hidden,true);
  assert.equal(s.doc.activeElement,s.origin);
  assert.equal(s.saves.length,0);

  s.editor.open(s.origin);
  assert.equal(root.querySelector("[data-ppbui-menu-layout-orientation]").value,"horizontal","Escape discarded the unsaved draft");
  change(root.querySelector("[data-ppbui-menu-layout-orientation]"),"vertical");
  click(root.querySelector("[data-ppbui-menu-layout-reset]"));
  assert.equal(root.querySelector("[data-ppbui-menu-layout-orientation]").value,"horizontal");
  assert.equal(root.querySelector("[data-ppbui-menu-layout-save]").disabled,true,"restoring the default only updates the draft");
  click(root.querySelector("[data-ppbui-menu-layout-cancel]"));
  assert.equal(s.doc.activeElement,s.origin);
});

test("moving to an endpoint restores focus to the selected tile when the requested step becomes disabled", t => {
  const s = setup(t);
  s.editor.open(s.origin);
  const root = s.editor.root;
  click(item(root,"native:hunts"));
  const previous = root.querySelector("[data-ppbui-menu-layout-focus='previous']");
  assert.equal(previous.disabled,false);
  click(previous);
  const selected = item(root,"native:hunts");
  assert.equal(root.querySelector("[data-ppbui-menu-layout-focus='previous']").disabled,true);
  assert.equal(s.doc.activeElement,selected,"focus falls back to the moved item instead of BODY");
});

test("stable sync is mutation-free, preserves focus, and modal keydown does not reach game shortcuts", async t => {
  const s = setup(t);
  s.editor.open(s.origin);
  const root = s.editor.root;
  const orientation = root.querySelector("[data-ppbui-menu-layout-orientation]");
  orientation.focus();
  let mutations = 0;
  const observer = new s.dom.window.MutationObserver(records => { mutations += records.length; });
  observer.observe(root,{ childList:true,subtree:true,attributes:true,characterData:true });
  for (let index = 0; index < 20; index++) s.editor.sync();
  await tick();
  observer.disconnect();
  assert.equal(mutations,0,"unchanged open sync must not replace editor DOM");
  assert.equal(s.doc.activeElement,orientation);

  let bubbled = 0;
  s.doc.addEventListener("keydown",()=>bubbled++);
  orientation.dispatchEvent(new s.dom.window.KeyboardEvent("keydown",{ key:"ArrowDown",bubbles:true,cancelable:true }));
  assert.equal(bubbled,0,"modal keydown is contained before game shortcut listeners");
  const style = s.doc.querySelector('style[data-ppbui-module="menu-bar-layout-editor"]');
  assert.match(style.textContent,/z-index:2147483647/,"editor is above the native toolbar layer");
});

test("editor CSS keeps move fields shrinkable and gives horizontal preview compact icon-over-label tiles", t => {
  const s = setup(t);
  s.editor.open(s.origin);
  const css = s.doc.querySelector('style[data-ppbui-module="menu-bar-layout-editor"]').textContent;
  assert.ok(css.includes('[data-ppbui-menu-layout-preview-list][data-orientation="horizontal"] .ppbui-menu-layout-editor__item {'));
  assert.ok(css.includes("flex:1 1 62px;"));
  assert.ok(css.includes("min-width:58px!important;"));
  assert.ok(css.includes("max-width:72px;"));
  assert.ok(css.includes("grid-template-columns:minmax(0,1fr);"));
  assert.ok(css.includes("grid-template-rows:12px 26px auto;"));
  assert.ok(css.includes('[data-ppbui-menu-layout-preview-list][data-orientation="horizontal"] .ppbui-menu-layout-editor__item-label {'));
  assert.ok(css.includes("font-size:var(--ppbui-font-size-meta);"));
  assert.ok(css.includes("line-height:1.2;"));
  assert.ok(css.includes("white-space:normal;"));
  assert.ok(css.includes("overflow-wrap:anywhere;"));
  assert.ok(css.includes(".ppbui-menu-layout-editor__move-grid > .ppbui-menu-layout-editor__field {"));
  assert.ok(css.includes("min-width:0;"));
  assert.ok(css.includes("scrollbar-color:var(--ppbui-scrollbar-thumb) var(--ppbui-scrollbar-track);"));
  assert.ok(css.includes("background:var(--ppbui-scrollbar-thumb);"));
  assert.equal(s.editor.root.querySelector("[data-ppbui-menu-layout-edit-selected]").hidden,true,"desktop footer does not expose the narrow shortcut");
});

test("narrow Edit selected shortcut scrolls Details into view and focuses Move to", t => {
  const s = setup(t);
  Object.defineProperty(s.dom.window,"innerWidth",{ configurable:true,value:390 });
  s.editor.open(s.origin);
  const root = s.editor.root;
  const editSelected = root.querySelector("[data-ppbui-menu-layout-edit-selected]");
  assert.equal(editSelected.hidden,false);
  assert.equal(editSelected.disabled,true,"shortcut stays disabled until an item is selected");
  click(item(root,"city-shortcut:nature"));
  assert.equal(editSelected.disabled,false);
  const details = root.querySelector("[data-ppbui-menu-layout-details]");
  const scrolls = [];
  details.scrollIntoView = options => scrolls.push(options);
  click(editSelected);
  assert.deepEqual(scrolls,[{ block:"start" }]);
  assert.equal(s.doc.activeElement,details.querySelector("[data-ppbui-menu-layout-move-to]"));
  assert.equal(domAction(s.dom.window),false,"shortcut never invokes a game action");
});

test("dirty external changes show conflict and require explicit Reload or Overwrite", async t => {
  const s = setup(t);
  s.editor.open(s.origin);
  const root = s.editor.root;
  change(root.querySelector("[data-ppbui-menu-layout-orientation]"),"vertical");
  const externalLayout = moveLayoutItem(defaultLayout(),"native:settings","group:automation",0);
  assert.equal(externalLayout.ok,true);
  s.setState({ layout:externalLayout.layout,token:"token-external-1" });
  s.editor.sync();
  assert.equal(root.querySelector("[data-ppbui-menu-layout-conflict]").hidden,false);
  assert.equal(root.querySelector("[data-ppbui-menu-layout-orientation]").value,"vertical","dirty draft is not silently replaced");
  click(root.querySelector("[data-ppbui-menu-layout-reload]"));
  assert.equal(root.querySelector("[data-ppbui-menu-layout-conflict]").hidden,true);
  assert.equal(root.querySelector("[data-ppbui-menu-layout-orientation]").value,"horizontal");
  assert.equal(root.querySelector("[data-ppbui-menu-layout-save]").disabled,true);

  change(root.querySelector("[data-ppbui-menu-layout-orientation]"),"vertical");
  const changedAgain = cloneLayout(s.state.layout);
  changedAgain.position = { left:20,top:30 };
  s.setState({ layout:changedAgain,token:"token-external-2" });
  s.editor.sync();
  assert.equal(root.querySelector("[data-ppbui-menu-layout-conflict]").hidden,false);
  click(root.querySelector("[data-ppbui-menu-layout-overwrite]"));
  await tick();
  assert.equal(s.saves.length,1);
  assert.equal(s.saves[0].options.overwrite,true);
  assert.equal(s.saves[0].options.owner,"trainer-a");
  assert.equal(s.saves[0].options.token,"token-external-2");
  assert.equal(s.saves[0].layout.orientation,"vertical");
});

test("save locks dirty controls and rejects stale owner/session completion", async t => {
  let resolveSave;
  const calls = [];
  const s = setup(t,{ onSave:(layout,options) => {
    calls.push({ layout:cloneLayout(layout),options:{ ...options } });
    return new Promise(resolve => { resolveSave = resolve; });
  }});
  s.origin.focus();
  s.editor.open(s.origin);
  const root = s.editor.root;
  change(root.querySelector("[data-ppbui-menu-layout-orientation]"),"vertical");
  click(root.querySelector("[data-ppbui-menu-layout-save]"));
  assert.equal(calls.length,1);
  assert.equal(root.querySelector("[data-ppbui-menu-layout-orientation]").disabled,true);
  assert.equal(root.querySelector("[data-ppbui-menu-layout-capacity]").disabled,true);
  assert.equal(root.querySelector("[data-ppbui-menu-layout-reset]").disabled,true);
  assert.equal(root.querySelector("[data-ppbui-menu-layout-cancel]").disabled,true);
  assert.equal(root.querySelector("[data-ppbui-menu-layout-save]").getAttribute("aria-busy"),"true");
  s.setState({ owner:"trainer-b",ownerLabel:"Trainer B",token:"b-1",layout:defaultLayout() });
  resolveSave({ ok:true,persistent:true,layout:calls[0].layout,token:"a-saved" });
  await tick();
  assert.equal(root.hidden,true,"owner change after async save closes the stale editor");
  assert.equal(s.doc.activeElement,s.origin);
});

test("unavailable catalog entries remain undisclosed while reserved capacity is still explained", t => {
  const s = setup(t,{ unavailable:["native:inventory"] });
  s.editor.open(s.origin);
  const root = s.editor.root;
  assert.equal(item(root,"native:inventory"),undefined);
  assert.doesNotMatch(root.textContent,/SECRET native:inventory/);
  assert.match(root.querySelector("[data-ppbui-menu-layout-counter]").textContent,/13\/13/);
  assert.equal(root.querySelector(".ppbui-menu-layout-editor__reserved").hidden,false);
});

test("editor owns PT/EN/ES/ZH copy through the current game locale", t => {
  const cases = [
    ["pt-BR","Personalizar menu bar","Editar selecionado","Slots"],
    ["en-US","Customize menu bar","Edit selected","Slots"],
    ["es-419","Personalizar barra de menú","Editar seleccionado","Slots"],
    ["zh-CN","自定义菜单栏","编辑所选项","栏位"],
  ];
  for (const [language,expected,editSelected,slotLabel] of cases) {
    const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>",{ url:"https://example.test/",pretendToBeVisual:true });
    const doc = dom.window.document;
    dom.window.PokeIdle = { Localization:{ get:()=>language } };
    const snapshot = { owner:"a",ownerLabel:"A",layout:defaultLayout(),token:null,persistent:true,issue:null,enabled:true,catalog:makeCatalog(doc) };
    const editor = createMenuLayoutEditor({ doc,getSnapshot:()=>snapshot,onSave:async()=>({ ok:false }) });
    doc.body.append(editor.root);
    assert.equal(editor.open(null),true);
    assert.equal(editor.root.querySelector("h2").textContent,expected);
    assert.equal(editor.root.querySelector("[data-ppbui-menu-layout-edit-selected]").textContent,editSelected);
    assert.equal(editor.root.querySelector("[data-ppbui-menu-layout-capacity]").previousElementSibling.textContent,slotLabel);
    editor.dispose();
    dom.window.close();
  }
});
