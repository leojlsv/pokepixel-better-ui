import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { mountChat } from '../src/modules/chat/controller.js';
import { createChatPreferences } from '../src/modules/chat/preferences.js';
const keys = ['local','world','trade','questions','system','guild'];
function setup(t) {
  const dom = new JSDOM(`<div class="pokeidle-persistent-chat"><div class="pokeidle-persistent-chat__tabs">${keys.map((key,i)=>`<div role="tab" tabindex="0" class="pokeidle-persistent-chat__tab ${i ? '' : 'is-active'}" data-channel="${key}"><span class="pokeidle-persistent-chat__tab-label">${key}</span><span class="pokeidle-persistent-chat__unread" hidden>0</span></div>`).join('')}<div class="pokeidle-persistent-chat__tab is-private" data-channel="private:synthetic"><button>×</button></div><button class="pokeidle-persistent-chat__collapse">collapse<span class="pokeidle-persistent-chat__collapse-unread" hidden></span></button></div><div class="pokeidle-persistent-chat__log">Synthetic message</div><form><input value="Synthetic draft"><button>Send</button></form></div>`, {url:'https://test.local'});
  const doc=dom.window.document, root=doc.body.firstChild, bar=root.firstChild;
  const tabs=[...bar.children].slice(0,6);
  tabs.forEach(tab=>tab.addEventListener('click',()=>{tabs.forEach(n=>n.classList.remove('is-active'));tab.classList.add('is-active');}));
  let submits=0;root.querySelector('form').addEventListener('submit',event=>{event.preventDefault();submits++;});
  const preference=createChatPreferences(()=>dom.window.localStorage);
  const before=root.outerHTML;
  const controller=mountChat(root,bar,preference);
  t.after(()=>{controller.cleanup();dom.window.close();});
  const hide=i=>tabs[i].querySelector('[data-ppbui-module]').click();
  return {doc,root,bar,tabs,preference,controller,hide,before,window:dom.window,submits:()=>submits};
}
function attachNativeChat(s) {
  let speeches=0;
  const native={
    el:s.root,
    _unread:{local:0,world:0,trade:0,questions:0,system:0,guild:0,'private:synthetic':0},
    updateCollapsedUnreadBadge() {
      const count=Object.values(this._unread).reduce((total,value)=>total+Math.max(0,Number(value)||0),0);
      const badge=s.root.querySelector('.pokeidle-persistent-chat__collapse-unread');
      badge.hidden=count===0;badge.textContent=count>99?'99+':String(count);
      s.root.querySelector('.pokeidle-persistent-chat__collapse').classList.toggle('has-unread',count>0);
    },
    updateUnreadBadge(key) {
      const badge=s.root.querySelector(`.pokeidle-persistent-chat__tab[data-channel="${key}"] .pokeidle-persistent-chat__unread`);
      const count=Math.max(0,Number(this._unread[key])||0);
      if(badge){badge.hidden=count===0;badge.textContent=count>99?'99+':String(count);}
      this.updateCollapsedUnreadBadge();
    },
    showSpeech() {speeches++;},
  };
  s.window.PokeIdle={PersistentHud:{_chat:native}};
  return {native,speeches:()=>speeches};
}
test('hide/restore preserves original log, composer, badges and private close',t=>{
  const s=setup(t), {root,tabs,hide,doc}=s;
  const log=root.querySelector('.pokeidle-persistent-chat__log'), input=root.querySelector('input'), privateClose=root.querySelector('.is-private button');
  const badge=tabs[1].lastElementChild.previousElementSibling;
  hide(1);assert.ok(tabs[1].hasAttribute('data-ppbui-chat-hidden'));
  badge.textContent='3';badge.hidden=false;s.controller.sync();
  root.querySelector('.ppbui-chat-add').click();
  doc.querySelector('[role=menuitem]').click();
  assert.equal(tabs[1].hasAttribute('data-ppbui-chat-hidden'),false);
  assert.equal(badge.textContent,'0');assert.equal(badge.hidden,true);assert.equal(root.querySelector('input'),input);assert.equal(input.value,'Synthetic draft');assert.equal(root.querySelector('.pokeidle-persistent-chat__log'),log);assert.equal(root.querySelector('.is-private button'),privateClose);assert.equal(s.submits(),0);
});
test('closed fixed channels discard native unread notifications until restored',t=>{
  const s=setup(t), badge=s.tabs[1].querySelector('.pokeidle-persistent-chat__unread');
  s.hide(1);
  for(const count of ['1','4','27']) {
    badge.textContent=count;badge.hidden=false;s.controller.sync();
    assert.equal(badge.textContent,'0');assert.equal(badge.hidden,true);
  }
  s.root.querySelector('.ppbui-chat-add').click();s.doc.querySelector('[role=menuitem]').click();
  assert.equal(s.tabs[1].hasAttribute('data-ppbui-chat-hidden'),false);
  assert.equal(badge.textContent,'0');assert.equal(badge.hidden,true);
});
test('central observer automatically drains unread from a closed fixed channel',async t=>{
  const {createBetterUI}=await import('../src/core/bootstrap.js');
  const {createChatModule}=await import('../src/modules/chat/index.js');
  const s=setup(t);s.controller.cleanup();
  const previous=new Map();
  for(const key of ['document','MutationObserver','requestAnimationFrame','cancelAnimationFrame']) {
    previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
    const value=key==='requestAnimationFrame' ? fn=>s.window.setTimeout(fn,0) : key==='cancelAnimationFrame' ? id=>s.window.clearTimeout(id) : s.window[key];
    Object.defineProperty(globalThis,key,{configurable:true,value});
  }
  const app=createBetterUI({modules:[createChatModule(s.preference)]});
  t.after(()=>{app.stop();for(const [key,value] of previous)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];});
  app.start();
  s.tabs[1].querySelector('[data-ppbui-module]').click();
  const badge=s.tabs[1].querySelector('.pokeidle-persistent-chat__unread');
  badge.textContent='9';badge.hidden=false;
  await new Promise(resolve=>s.window.setTimeout(resolve,40));
  assert.equal(badge.textContent,'0');assert.equal(badge.hidden,true);
});
test('native notification gate synchronously removes closed unread from per-tab and collapsed badges',t=>{
  const s=setup(t);s.controller.cleanup();
  const runtime=attachNativeChat(s), native=runtime.native;
  const originalUnread=native.updateUnreadBadge,originalCollapsed=native.updateCollapsedUnreadBadge;
  const controller=mountChat(s.root,s.bar,s.preference);t.after(()=>controller.cleanup());
  s.tabs[1].querySelector('[data-ppbui-module]').click();
  native._unread.local=2;native._unread['private:synthetic']=3;native._unread.world=9;
  native.updateUnreadBadge('world');
  assert.equal(native._unread.world,0);
  assert.equal(s.tabs[1].querySelector('.pokeidle-persistent-chat__unread').hidden,true);
  const collapsed=s.root.querySelector('.pokeidle-persistent-chat__collapse-unread');
  assert.equal(collapsed.textContent,'5');assert.equal(collapsed.hidden,false);
  controller.cleanup();
  assert.equal(native.updateUnreadBadge,originalUnread);assert.equal(native.updateCollapsedUnreadBadge,originalCollapsed);
});
test('native notification gate suppresses speech only for closed fixed channels and preserves private chat',t=>{
  const s=setup(t);s.controller.cleanup();
  const runtime=attachNativeChat(s), native=runtime.native, original=native.showSpeech;
  const controller=mountChat(s.root,s.bar,s.preference);t.after(()=>controller.cleanup());
  s.tabs[1].querySelector('[data-ppbui-module]').click();
  native.showSpeech({channel:'world',trainer_id:'other',text:'hidden'});
  native.showSpeech({channel:'local',trainer_id:'other',text:'visible'});
  native.showSpeech({channel:'private',trainer_id:'other',recipient_id:'self',text:'private'});
  assert.equal(runtime.speeches(),2);
  controller.cleanup();assert.equal(native.showSpeech,original);
});
test('native notification gate rebinds a replacement native chat and restores both owners exactly',t=>{
  const s=setup(t);s.controller.cleanup();
  const first=attachNativeChat(s).native,firstSpeech=first.showSpeech;
  const controller=mountChat(s.root,s.bar,s.preference);t.after(()=>controller.cleanup());
  assert.notEqual(first.showSpeech,firstSpeech);
  const second=attachNativeChat(s).native,secondSpeech=second.showSpeech;
  controller.sync();
  assert.equal(first.showSpeech,firstSpeech);assert.notEqual(second.showSpeech,secondSpeech);
  controller.cleanup();assert.equal(second.showSpeech,secondSpeech);
});
test('hiding active tab selects native fallback and protects final fixed tab',t=>{
  const s=setup(t);s.hide(0);assert.ok(s.tabs[1].classList.contains('is-active'));
  for(let i=1;i<5;i++)s.hide(i);
  assert.equal(s.tabs.filter(n=>!n.hasAttribute('data-ppbui-chat-hidden')).length,1);
  assert.equal(s.tabs[5].lastElementChild.disabled,true);s.hide(5);assert.equal(s.preference.get().length,5);
});
test('external native selection reveals a saved hidden tab without switching channels',t=>{
  const s=setup(t);s.hide(1);s.tabs[1].click();s.controller.sync();
  assert.equal(s.tabs[1].hasAttribute('data-ppbui-chat-hidden'),false);assert.ok(s.tabs[1].classList.contains('is-active'));assert.deepEqual(s.preference.get(),['world']);
});
test('reconcile is mutation-free when stable; cleanup restores exact native DOM',async t=>{
  const s=setup(t);let mutations=0;
  const probe=new s.window.MutationObserver(records=>mutations+=records.length);probe.observe(s.root,{subtree:true,attributes:true,childList:true});
  for(let i=0;i<5;i++)s.controller.sync();await Promise.resolve();probe.disconnect();assert.equal(mutations,0);
  s.controller.cleanup();assert.equal(s.root.outerHTML,s.before);
});
test('replaced tabs get one close control and detached nodes are cleaned',t=>{
  const s=setup(t),old=s.tabs[1],replacement=old.cloneNode(true);replacement.querySelector('[data-ppbui-module]').remove();old.replaceWith(replacement);
  s.controller.sync();s.controller.sync();assert.equal(replacement.querySelectorAll('[data-ppbui-module]').length,1);assert.equal(old.querySelector('[data-ppbui-module]'),null);
});
test('menu keyboard, outside click and collapse do not submit messages',t=>{
  const s=setup(t);s.hide(1);s.hide(2);const add=s.root.querySelector('.ppbui-chat-add'),menu=s.root.querySelector('[role=menu]');add.click();
  assert.equal(s.doc.activeElement,menu.firstElementChild);
  s.doc.activeElement.dispatchEvent(new s.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.equal(s.doc.activeElement,menu.lastElementChild);
  s.doc.activeElement.dispatchEvent(new s.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(menu.hidden,true);assert.equal(s.doc.activeElement,add);
  add.click();s.doc.body.dispatchEvent(new s.window.Event('pointerdown',{bubbles:true}));assert.equal(menu.hidden,true);
  add.click();s.root.classList.add('is-collapsed');s.controller.sync();assert.equal(menu.hidden,true);assert.equal(s.submits(),0);
});
test('storage whitelist rejects private keys, invalid payloads and denied storage',()=>{
  let value=JSON.stringify(['world','private:synthetic','bad','world']);const store={getItem:()=>value,setItem:(_,v)=>value=v};
  const p=createChatPreferences(()=>store);assert.deepEqual(p.get(),['world']);p.set(['guild','private:synthetic']);assert.equal(value,'["guild"]');
  value='{}';assert.deepEqual(createChatPreferences(()=>store).get(),[]);
  value='{';assert.deepEqual(createChatPreferences(()=>store).get(),[]);
  const denied=createChatPreferences(()=>{throw Error('denied');});denied.set(['world']);assert.deepEqual(denied.get(),['world']);assert.equal(denied.saved(),false);
});

test('invalid all-hidden preferences and unavailable channels retain a fixed fallback',t=>{
  const s=setup(t);s.tabs.forEach(tab=>tab.classList.remove('is-active'));s.tabs[0].hidden=true;s.preference.set(keys);s.controller.sync();
  assert.equal(s.tabs[0].hidden,true);assert.equal(s.tabs[1].hasAttribute('data-ppbui-chat-hidden'),false);
  assert.equal(s.root.querySelectorAll('[role=menuitem]').length,4);
});
test('failed native channel switch never hides the active tab',t=>{
  const s=setup(t);s.tabs[1].addEventListener('click',()=>{s.tabs[1].classList.remove('is-active');s.tabs[0].classList.add('is-active');});
  s.hide(0);assert.equal(s.tabs[0].hasAttribute('data-ppbui-chat-hidden'),false);assert.deepEqual(s.preference.get(),[]);
});
test('core remounts a replaced tab bar and restores native tabs when disabled',async t=>{
  const {createBetterUI}=await import('../src/core/bootstrap.js');
  const {createChatModule}=await import('../src/modules/chat/index.js');
  const s=setup(t);s.controller.cleanup();
  const previous=new Map();
  for(const key of ['document','MutationObserver','requestAnimationFrame','cancelAnimationFrame']) {
    previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
    const value=key==='requestAnimationFrame' ? fn=>s.window.setTimeout(fn,0) : key==='cancelAnimationFrame' ? id=>s.window.clearTimeout(id) : s.window[key];
    Object.defineProperty(globalThis,key,{configurable:true,value});
  }
  let enabled=true;const app=createBetterUI({modules:[createChatModule(s.preference)],preferences:{isEnabled:()=>enabled,subscribe:()=>()=>{}}});
  t.after(()=>{app.stop();for(const [key,value] of previous)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];});
  app.start();s.hide(1);const replacement=s.doc.createElement('div');replacement.className='pokeidle-persistent-chat__tabs';replacement.innerHTML=s.before.match(/<div class="pokeidle-persistent-chat__tabs">([\s\S]*?)<\/div><div class="pokeidle-persistent-chat__log">/)[1];s.bar.replaceWith(replacement);
  await new Promise(resolve=>s.window.setTimeout(resolve,40));
  assert.equal(s.root.querySelectorAll('.ppbui-chat-add').length,1);assert.equal(s.root.querySelectorAll('[role=menu]').length,1);assert.equal(s.bar.querySelector('[data-ppbui-module]'),null);
  enabled=false;app.reconcile();assert.equal(s.root.querySelector('[data-ppbui-module]'),null);assert.equal(s.root.querySelector('[data-ppbui-chat-hidden]'),null);
  enabled=true;app.reconcile();assert.equal(s.root.querySelectorAll('.ppbui-chat-add').length,1);
});

test('restore menu follows native channel order regardless of hiding sequence',t=>{
  const s=setup(t);s.hide(5);s.hide(1);s.hide(3);
  assert.deepEqual([...s.root.querySelector('[role=menu]').children].map(n=>n.textContent),['world','questions','guild']);
  assert.ok([...s.root.querySelector('[role=menu]').children].every(n=>n.tabIndex===-1));
});
test('hiding an inactive channel returns focus to the selected native channel',t=>{
  const s=setup(t);s.tabs[3].click();s.hide(1);assert.equal(s.doc.activeElement,s.tabs[3]);
});
test('Tab and Shift+Tab resume navigation from the restore trigger',t=>{
  const s=setup(t);s.hide(1);const add=s.root.querySelector('.ppbui-chat-add'),menu=s.root.querySelector('[role=menu]');
  for(const shiftKey of [false,true]) {add.click();const event=new s.window.KeyboardEvent('keydown',{key:'Tab',shiftKey,bubbles:true,cancelable:true});s.doc.activeElement.dispatchEvent(event);assert.equal(menu.hidden,true);assert.equal(s.doc.activeElement,add);assert.equal(event.defaultPrevented,false);}
});
test('fixed actions preserve native collapse listener and restore latest replacement on cleanup',t=>{
  const s=setup(t);const collapse=s.root.querySelector('.ppbui-chat-actions button:not(.ppbui-chat-add)');let calls=0;collapse.addEventListener('click',()=>calls++);collapse.click();assert.equal(calls,1);
  collapse.remove();const replacement=s.doc.createElement('button');replacement.className='pokeidle-persistent-chat__collapse';s.bar.append(replacement);s.controller.sync();assert.equal(replacement.parentNode.classList.contains('ppbui-chat-actions'),true);
  s.controller.cleanup();assert.equal(replacement.parentNode,s.bar);assert.equal(s.root.contains(collapse),false);assert.equal(s.root.querySelector('.ppbui-chat-header'),null);
});

test('horizontal scrollbar presses never start native drag or grow bounds; normal drag and cleanup remain native',t=>{
  const s=setup(t);s.controller.cleanup();let starts=0;
  s.bar.addEventListener('pointerdown',event=>{
    if(event.target.closest('button,[role=tab]'))return;
    starts++;s.root.style.width=(parseFloat(s.root.style.width)||380)+2+'px';s.root.style.height=(parseFloat(s.root.style.height)||238)+2+'px';event.preventDefault();
  });
  Object.defineProperties(s.bar,{scrollWidth:{configurable:true,value:600},clientWidth:{configurable:true,value:300},offsetHeight:{configurable:true,value:40},clientHeight:{configurable:true,value:24},clientTop:{configurable:true,value:1}});
  s.bar.getBoundingClientRect=()=>({left:0,right:300,top:0,bottom:40});
  s.bar.style.borderTop = '1px solid';s.bar.style.borderBottom = '1px solid';
  const controller=mountChat(s.root,s.bar,s.preference);t.after(()=>controller.cleanup());
  const press=(target,y)=>{const event=new s.window.MouseEvent('pointerdown',{bubbles:true,cancelable:true,clientX:100,clientY:y});target.dispatchEvent(event);return event;};
  const before=s.root.style.cssText;
  for(let i=0;i<20;i++)assert.equal(press(s.bar,30).defaultPrevented,false);
  assert.equal(starts,0);assert.equal(s.root.style.cssText,before);
  press(s.bar,3);assert.equal(starts,1);
  press(s.tabs[1],10);assert.equal(starts,1);
  Object.defineProperty(s.bar,'clientHeight',{configurable:true,value:38});
  assert.equal(press(s.bar,34).defaultPrevented,false);assert.equal(starts,1);
  Object.defineProperty(s.bar,'scrollWidth',{configurable:true,value:300});press(s.bar,34);assert.equal(starts,2);
  Object.defineProperty(s.bar,'scrollWidth',{configurable:true,value:600});controller.cleanup();press(s.bar,30);assert.equal(starts,3);
});
