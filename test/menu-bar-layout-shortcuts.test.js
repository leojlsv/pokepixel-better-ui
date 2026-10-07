import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createMenuLayoutShortcutGuard } from "../src/modules/menu-bar/layout-shortcut-guard.js";

test("editor suspends the pre-existing native window-capture shortcut and restores its exact method", t => {
  const dom = new JSDOM('<body><div id="editor" hidden><button id="close">Close</button></div><button id="outside">Outside</button></body>',{pretendToBeVisual:true});
  t.after(()=>dom.window.close());
  const win=dom.window,doc=win.document,root=doc.getElementById("editor");
  let actions=0;
  const prototype={handleShortcut(event){if(!event.defaultPrevented && event.key==="O"){actions++;event.preventDefault();event.stopPropagation();}}};
  const toolbar=Object.create(prototype);
  win.PokeIdle={PersistentHud:{_toolbar:toolbar}};
  const nativeListener=event=>toolbar.handleShortcut(event);
  win.addEventListener("keydown",nativeListener,true);
  const guard=createMenuLayoutShortcutGuard({win,getRoot:()=>root});
  const press=node=>{node.focus();node.dispatchEvent(new win.KeyboardEvent("keydown",{key:"O",bubbles:true,cancelable:true}));};
  press(doc.getElementById("outside"));assert.equal(actions,1);
  root.hidden=false;guard.sync();
  const captured=toolbar.handleShortcut;
  press(doc.getElementById("close"));assert.equal(actions,1,"the capture listener must not dispatch before root bubble interception");
  guard.sync();assert.equal(toolbar.handleShortcut,captured,"stable sync does not stack adapters");
  root.hidden=true;
  press(doc.getElementById("outside"));assert.equal(actions,2,"closed editor delegates immediately even before cleanup reconciliation");
  guard.cleanup();
  assert.equal(Object.hasOwn(toolbar,"handleShortcut"),false);
  assert.equal(toolbar.handleShortcut,prototype.handleShortcut);
  root.hidden=false;
  captured.call(toolbar,new win.KeyboardEvent("keydown",{key:"O",cancelable:true}));
  assert.equal(actions,3,"a retained stale adapter is inert after cleanup");
  win.removeEventListener("keydown",nativeListener,true);
});

test("a native toolbar replacement and a foreign wrapper are not clobbered on editor teardown", t => {
  const dom=new JSDOM('<body><div id="editor"></div></body>');t.after(()=>dom.window.close());
  const win=dom.window,root=win.document.getElementById("editor"), first=()=>1,second=()=>2;
  const a={handleShortcut:first},b={handleShortcut:second};win.PokeIdle={PersistentHud:{_toolbar:a}};
  const guard=createMenuLayoutShortcutGuard({win,getRoot:()=>root});guard.sync();
  win.PokeIdle.PersistentHud._toolbar=b;guard.sync();
  assert.equal(a.handleShortcut,first);
  const external=()=>3;b.handleShortcut=external;
  guard.cleanup();assert.equal(b.handleShortcut,external);
});
