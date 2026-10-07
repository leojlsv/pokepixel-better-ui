import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createWalletPanel,createWalletSettings } from "../src/modules/wallet/views.js";
import { walletStyles } from "../src/modules/wallet/styles.js";

const tick = () => new Promise(resolve => setTimeout(resolve,0));
const click = node => node.dispatchEvent(new node.ownerDocument.defaultView.MouseEvent("click",{ bubbles:true,cancelable:true }));
const change = (node,checked) => {
  node.checked = checked;
  node.dispatchEvent(new node.ownerDocument.defaultView.Event("change",{ bubbles:true }));
};

function setupSettings(t,{ language = "en-US",snapshot:initial,onToggle:customToggle } = {}) {
  const dom = new JSDOM("<!doctype html><html><head></head><body><button id='outside'>Outside</button></body></html>",{
    url:"https://example.test/",
    pretendToBeVisual:true,
  });
  const doc = dom.window.document;
  dom.window.PokeIdle = { Localization:{ get:()=>language } };
  let snapshot = initial || {
    owner:"trainer-a",
    ownerLabel:"Trainer A",
    locations:{ backpack:true,trainer:true },
    persistent:true,
    issue:null,
  };
  const calls = [];
  const onToggle = customToggle || ((key,enabled,options) => {
    calls.push({ key,enabled,options:{ ...options } });
    snapshot = {
      ...snapshot,
      locations:{ ...snapshot.locations,[key]:enabled },
      persistent:true,
      issue:null,
    };
    return { ok:true,persistent:true };
  });
  const view = createWalletSettings({ doc,getSnapshot:()=>snapshot,onToggle });
  doc.body.append(view.root);
  t.after(()=>{ view.dispose(); dom.window.close(); });
  return {
    dom,doc,view,calls,
    get snapshot(){ return snapshot; },
    setSnapshot(next){ snapshot = { ...snapshot,...next }; },
  };
}

const toggle = (root,key) => root.querySelector(`[data-ppbui-wallet-toggle="${key}"]`);

test("Wallet settings expose only Backpack and Trainer Header in a collapsible section", t => {
  const s = setupSettings(t,{ language:"pt-BR" });
  const root = s.view.root;
  assert.equal(root.tagName,"DETAILS");
  assert.equal(root.open,true);
  assert.equal(root.querySelector("summary").textContent,"Wallet");
  assert.match(root.querySelector(".ppbui-wallet-settings__helper").textContent,/coexistir/i);
  assert.deepEqual([...root.querySelectorAll("[data-ppbui-wallet-toggle]")].map(node=>node.dataset.ppbuiWalletToggle),["backpack","trainer"]);
  assert.equal(root.querySelector('[data-ppbui-wallet-location="backpack"] .ppbui-wallet-settings__label').textContent,"Backpack");
  assert.equal(root.querySelector('[data-ppbui-wallet-location="trainer"] .ppbui-wallet-settings__label').textContent,"Cabeçalho Trainer");

  const trainer = toggle(root,"trainer");
  change(trainer,false);
  assert.deepEqual(s.calls,[{ key:"trainer",enabled:false,options:{ owner:"trainer-a" } }]);
  assert.equal(trainer.checked,false);
  assert.equal(toggle(root,"backpack").checked,true,"locations coexist instead of behaving like radio buttons");
  assert.equal(root.querySelector("[data-ppbui-wallet-status]").hidden,true);
});

test("no owner disables both Wallet locations", t => {
  const s = setupSettings(t);
  s.setSnapshot({ owner:"",ownerLabel:"" });
  s.view.sync();
  for (const key of ["backpack","trainer"]) assert.equal(toggle(s.view.root,key).disabled,true);
  assert.match(s.view.root.querySelector("[data-ppbui-wallet-status]").textContent,/profile/i);
});

test("toggle failures revert state and expose owner/protected messages", t => {
  let error = "owner-changed";
  const s = setupSettings(t,{ language:"pt-BR",onToggle:()=>({ ok:false,error }) });
  const trainer = toggle(s.view.root,"trainer");
  change(trainer,false);
  assert.equal(trainer.checked,true);
  const status = s.view.root.querySelector("[data-ppbui-wallet-status]");
  assert.match(status.textContent,/perfil ativo mudou/i);
  assert.equal(status.dataset.error,"true");

  error = "protected-record";
  change(trainer,false);
  assert.equal(trainer.checked,true);
  assert.match(status.textContent,/protegidas/i);
});

test("storage-unavailable success stays enabled and clearly reports session-only persistence", t => {
  const s = setupSettings(t,{ onToggle:(key,enabled) => {
    s.setSnapshot({
      locations:{ ...s.snapshot.locations,[key]:enabled },
      persistent:false,
      issue:"storage-unavailable",
    });
    return { ok:true,persistent:false,error:"storage-unavailable" };
  }});
  const trainer = toggle(s.view.root,"trainer");
  change(trainer,false);
  assert.equal(trainer.checked,false);
  const status = s.view.root.querySelector("[data-ppbui-wallet-status]");
  assert.equal(status.hidden,false);
  assert.equal(status.dataset.error,"false");
  assert.match(status.textContent,/session only/i);
});

test("settings sync is mutation-free when stable and preserves focused checkbox on real updates", async t => {
  const s = setupSettings(t);
  const backpack = toggle(s.view.root,"backpack");
  backpack.focus();
  let mutations = 0;
  const observer = new s.dom.window.MutationObserver(records => { mutations += records.length; });
  observer.observe(s.view.root,{ childList:true,subtree:true,attributes:true,characterData:true });
  for (let index = 0; index < 20; index++) s.view.sync();
  await tick();
  assert.equal(mutations,0);
  assert.equal(s.doc.activeElement,backpack);

  s.setSnapshot({ locations:{ ...s.snapshot.locations,trainer:false } });
  s.view.sync();
  assert.equal(toggle(s.view.root,"trainer").checked,false);
  assert.equal(s.doc.activeElement,backpack,"sync updates properties without rebuilding rows");
  observer.disconnect();
});

test("Wallet toggle preserves Better UI list scroll and focused checkbox", async t => {
  const s = setupSettings(t);
  const list=s.doc.createElement("div");list.className="ppbui-module-list";s.view.root.before(list);list.append(s.view.root);
  Object.defineProperty(list,"scrollHeight",{configurable:true,value:1000});Object.defineProperty(list,"clientHeight",{configurable:true,value:200});
  list.scrollTop=420;
  const trainer=toggle(s.view.root,"trainer");trainer.focus();change(trainer,false);await tick();
  assert.equal(list.scrollTop,420);
  assert.equal(s.doc.activeElement,trainer);
});

test("settings own PT/EN/ES/ZH labels without changing the contract keys", t => {
  const cases = [
    ["pt-BR","Backpack","Cabeçalho Trainer"],
    ["en-US","Backpack","Trainer header"],
    ["es-419","Backpack","Cabecera Trainer"],
    ["zh-CN","背包","训练家标题"],
  ];
  for (const [language,backpackLabel,trainerLabel] of cases) {
    const dom = new JSDOM("<!doctype html><html><body></body></html>",{ url:"https://example.test/" });
    const doc = dom.window.document;
    dom.window.PokeIdle = { Localization:{ get:()=>language } };
    const snapshot = { owner:"A",locations:{},persistent:true,issue:null };
    const view = createWalletSettings({ doc,getSnapshot:()=>snapshot,onToggle:()=>({ ok:true,persistent:true }) });
    assert.equal(view.root.querySelector('[data-ppbui-wallet-location="backpack"] .ppbui-wallet-settings__label').textContent,backpackLabel);
    assert.equal(view.root.querySelector('[data-ppbui-wallet-location="trainer"] .ppbui-wallet-settings__label').textContent,trainerLabel);
    view.dispose(); dom.window.close();
  }
});

function setupPanel(t,{ language = "en-US" } = {}) {
  const dom = new JSDOM("<!doctype html><html><head></head><body><button id='anchor'>Wallet</button><button id='game'>Game action</button></body></html>",{
    url:"https://example.test/",
    pretendToBeVisual:true,
  });
  const doc = dom.window.document;
  dom.window.PokeIdle = { Localization:{ get:()=>language } };
  Object.defineProperty(dom.window,"innerWidth",{ configurable:true,value:320 });
  Object.defineProperty(dom.window,"innerHeight",{ configurable:true,value:240 });
  const anchor = doc.querySelector("#anchor");
  anchor.getBoundingClientRect = () => ({ left:280,right:311,top:210,bottom:235,width:31,height:25 });
  const closes = [];
  const panel = createWalletPanel({ doc,onClose:detail=>closes.push(detail) });
  panel.root.getBoundingClientRect = () => ({ left:0,right:220,top:0,bottom:90,width:220,height:90 });
  t.after(()=>{ panel.dispose(); dom.window.close(); });
  return { dom,doc,anchor,panel,closes,game:doc.querySelector("#game") };
}

test("Wallet panel is a body portal, non-modal dialog, clampable, and exposes values for prime rendering", t => {
  const s = setupPanel(t,{ language:"pt-BR" });
  s.anchor.focus();
  assert.equal(s.panel.open(s.anchor),true);
  assert.equal(s.panel.root.parentElement,s.doc.body);
  assert.equal(s.panel.root.hidden,false);
  assert.equal(s.panel.root.getAttribute("role"),"dialog");
  assert.equal(s.panel.root.getAttribute("aria-modal"),"false");
  assert.equal(s.panel.root.getAttribute("aria-label"),"Wallet");
  assert.equal(s.panel.values,s.panel.root.querySelector("[data-ppbui-wallet-values]"));
  assert.equal(s.panel.values.children.length,0,"view layer never fabricates wallet balances");
  assert.equal(s.panel.root.style.left,"92px","panel clamps inside the right viewport edge");
  assert.equal(s.panel.root.style.top,"116px","panel flips above and clamps inside the bottom edge");
  assert.equal(s.doc.activeElement,s.panel.root.querySelector("[data-ppbui-wallet-close]"),"open transfers keyboard focus into the panel");
});

test("panel Close and Escape restore anchor focus without invoking game actions", t => {
  const s = setupPanel(t);
  let gameActions = 0;
  s.game.addEventListener("click",()=>gameActions++);
  s.anchor.focus();
  s.panel.open(s.anchor);
  click(s.panel.root.querySelector("[data-ppbui-wallet-close]"));
  assert.equal(s.panel.root.hidden,true);
  assert.equal(s.doc.activeElement,s.anchor);
  assert.deepEqual(s.closes,[{ restoreFocus:true }]);
  assert.equal(gameActions,0);

  s.panel.open(s.anchor);
  s.doc.dispatchEvent(new s.dom.window.KeyboardEvent("keydown",{ key:"Escape",bubbles:true,cancelable:true }));
  assert.equal(s.panel.root.hidden,true);
  assert.equal(s.doc.activeElement,s.anchor);
  assert.deepEqual(s.closes,[{ restoreFocus:true },{ restoreFocus:true }]);
  assert.equal(gameActions,0);
});

test("outside click closes and is consumed before the underlying game action", t => {
  const s = setupPanel(t);
  let gameActions = 0;
  s.game.addEventListener("click",()=>gameActions++);
  s.panel.open(s.anchor);
  click(s.game);
  assert.equal(s.panel.root.hidden,true);
  assert.equal(gameActions,0);
  assert.deepEqual(s.closes,[{ restoreFocus:true }]);
});

test("programmatic close can suppress focus restoration for logout/account guards", t => {
  const s = setupPanel(t);
  s.anchor.focus();
  s.panel.open(s.anchor);
  const close = s.panel.root.querySelector("[data-ppbui-wallet-close]");
  assert.equal(s.doc.activeElement,close);
  s.panel.close({ restoreFocus:false });
  assert.equal(s.panel.root.hidden,true);
  assert.notEqual(s.doc.activeElement,s.anchor,"logout close must not touch the previous account trigger");
  assert.deepEqual(s.closes,[{ restoreFocus:false }]);

  s.panel.open(s.anchor);
  s.panel.close(false);
  assert.deepEqual(s.closes,[{ restoreFocus:false },{ restoreFocus:false }],"boolean false is accepted as a guard-compatible shorthand");
});

test("panel sync is quiescent when stable and reclamps after content geometry or viewport changes", async t => {
  const s = setupPanel(t);
  s.panel.open(s.anchor);
  let mutations = 0;
  const observer = new s.dom.window.MutationObserver(records => { mutations += records.length; });
  observer.observe(s.panel.root,{ childList:true,subtree:true,attributes:true,characterData:true });
  for (let index = 0; index < 10; index++) s.panel.sync();
  await tick();
  assert.equal(mutations,0);

  s.panel.root.getBoundingClientRect = () => ({ left:0,right:260,top:0,bottom:130,width:260,height:130 });
  s.panel.sync();
  assert.equal(s.panel.root.style.left,"52px","sync reclamps after values expand panel width");
  assert.equal(s.panel.root.style.top,"76px","sync reclamps after values expand panel height");
  await tick();
  const afterGeometry = mutations;
  s.panel.sync();
  await tick();
  assert.equal(mutations,afterGeometry,"stable re-clamp does not rewrite identical left/top");

  Object.defineProperty(s.dom.window,"innerWidth",{ configurable:true,value:500 });
  s.dom.window.dispatchEvent(new s.dom.window.Event("resize"));
  assert.equal(s.panel.root.isConnected,true);
  assert.equal(s.panel.root.hidden,false);
  observer.disconnect();
});

test("wallet styles cover long values, top-layer panel, and integrated Trainer resource strip", () => {
  assert.match(walletStyles,/\.ppbui-wallet-settings \{/);
  assert.match(walletStyles,/\.ppbui-wallet-values \{/);
  assert.match(walletStyles,/\.ppbui-wallet-panel\[data-ppbui-wallet-panel\] \{[^}]*z-index:2147483647;/s);
  assert.match(walletStyles,/\.ppbui-wallet-values > \* \{[^}]*grid-template-columns:max-content minmax\(0,1fr\);/s);
  assert.match(walletStyles,/\.ppbui-wallet-values > \* > :last-child \{[^}]*overflow-wrap:anywhere;[^}]*font:700 var\(--ppbui-font-size-body\)/s);
  assert.match(walletStyles,/\[data-ppbui-wallet-trainer\] \{[^}]*grid-column:1\/-1;[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\);[^}]*gap:0;[^}]*width:100%!important;[^}]*min-height:24px!important;[^}]*padding:0!important;[^}]*border:var\(--ppbui-separator-width\) solid var\(--ppbui-border\)!important;[^}]*border-radius:var\(--ppbui-control-radius\)!important;[^}]*background:var\(--ppbui-bg-0\)!important;[^}]*box-shadow:none!important;[^}]*font-variant-numeric:tabular-nums;[^}]*overflow-wrap:anywhere;/s);
  assert.match(walletStyles,/\[data-ppbui-wallet-trainer\] > span \{[^}]*flex-wrap:wrap;[^}]*justify-content:center;[^}]*width:100%;[^}]*min-height:22px;[^}]*padding:1px var\(--ppbui-space-2\);[^}]*overflow-wrap:anywhere;[^}]*text-align:center;/s);
  assert.match(walletStyles,/\[data-ppbui-wallet-trainer\] > span \+ span \{[^}]*border-left:var\(--ppbui-separator-width\) solid var\(--ppbui-border\);/s);
  assert.doesNotMatch(walletStyles,/\[data-ppbui-wallet-trainer\] \{[^}]*border-top:/s,"Trainer Wallet is a unified well, not the previous loose top-border row");
  assert.doesNotMatch(walletStyles,/\[data-ppbui-wallet-trainer\] \{[^}]*background:transparent!important;/s,"Trainer Wallet owns a Values surface");
  assert.match(walletStyles,/\[data-ppbui-wallet-trainer\] \.pokeidle-currency__icon,[\s\S]*\.ppbui-wallet-diamond-icon\.pokeidle-currency__icon \{[^}]*flex:0 0 22px!important;[^}]*width:22px!important;[^}]*height:22px!important;[^}]*object-fit:contain;[^}]*image-rendering:pixelated;/s);
  assert.match(walletStyles,/\[data-ppbui-wallet-trainer\] \.rmmz-icon,[\s\S]*\.ppbui-wallet-diamond-icon\.rmmz-icon \{[^}]*width:22px!important;[^}]*height:22px!important;[^}]*margin:-3px!important;[^}]*transform:scale\(\.8\)!important;/s);
  assert.match(walletStyles,/\.ppbui-wallet-diamond-fallback \{[^}]*width:auto!important;[^}]*height:auto!important;[^}]*margin:0!important;[^}]*transform:none!important;[^}]*font-size:var\(--ppbui-font-size-meta\);/s);
  assert.doesNotMatch(walletStyles,/\.ppbui-wallet-diamond-icon(?:\s|\{)[^}]*width:14px!important;/s,"native diamond sprites must not be cropped into a 14px box");
  assert.match(walletStyles,/\[data-ppbui-wallet-trainer\]:hover,[\s\S]*\[data-ppbui-wallet-trainer\]:active \{[^}]*background:var\(--ppbui-bg-2\)!important;[^}]*box-shadow:none!important;/s);
  assert.doesNotMatch(walletStyles,/\.ppbui-wallet-trigger/,"Prime renders the native-sized SVG icon; view CSS must not add a second wallet glyph");
  assert.match(walletStyles,/border-radius:var\(--ppbui-window-radius\)/);
  assert.match(walletStyles,/font:var\(--ppbui-font-size-secondary\)/);
});
