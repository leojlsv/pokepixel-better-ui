import assert from "node:assert/strict";
import {test} from "node:test";
import {JSDOM} from "jsdom";
import {createBetterUI} from "../src/core/bootstrap.js";
import {createCardModeModule} from "../src/modules/card-mode/index.js";
import {createCardModeCards} from "../src/modules/card-mode/cards.js";

function fixture(t,{nativeHost=true,ambiguous=false,sheet=false}={}){
  const dom=new JSDOM('<!doctype html><html lang="pt-BR"><head></head><body><main id="game-renderer"><canvas></canvas></main><nav class="pokeidle-top-toolbar"></nav></body></html>',{
    url:"https://pokepixel.nietore.com/play/",pretendToBeVisual:true,
  });
  const win=dom.window,doc=win.document,previous=new Map(),pins=new Map(),calls=[];
  for(const key of ["window","document","MutationObserver","requestAnimationFrame","cancelAnimationFrame"]){
    previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
    Object.defineProperty(globalThis,key,{configurable:true,
      value:typeof win[key]==="function"&&key!=="MutationObserver"?win[key].bind(win):win[key]});
  }
  class SceneMap{}
  win.Scene_Map=SceneMap;
  win.SceneManager={_scene:new SceneMap(),_nextScene:null};
  const creatures=[
    {id:"a",name:"Tyranitar",level:259,hp:100,max_hp:100,is_leader:true},
    {id:"b",name:"Houndoom",level:176,hp:100,max_hp:100,is_leader:false},
    {id:"c",name:"Scizor",level:171,hp:0,max_hp:100,is_leader:false},
    {id:"d",name:"Granbull",level:171,hp:100,max_hp:100,is_leader:false},
    {id:"e",name:"Donphan",level:116,hp:100,max_hp:100,is_leader:false},
    {id:"f",name:"Heracross",level:168,hp:100,max_hp:100,is_leader:false},
  ];
  const listeners=new Map();
  const bus={
    on(type,callback){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(callback);},
    off(type,callback){listeners.get(type)?.delete(callback);},
    emit(type,data){for(const callback of listeners.get(type)||[])callback(data);},
  };
  let hostCalls=0,rendered=0,raised=0,foreign=ambiguous;
  const pokemonHost={
    isPinned:id=>pins.has(String(id)),
    open(creature){
      hostCalls++;
      const id=String(creature.id);
      let shell=pins.get(id);
      if(!shell){
        shell=doc.createElement("div");
        shell.className=sheet?"pokemon-card-shell is-sheet":"pokemon-card-shell";
        const card=doc.createElement("aside");
        card.className=sheet?"pokemon-card pokemon-card--sheet":"pokemon-card pokemon-card--pinned";
        const close=doc.createElement("button");
        close.className="pokemon-card__control is-close";
        close.textContent="×";
        close.addEventListener("click",()=>{shell.remove();pins.delete(id);});
        card.append(close);shell.append(card);doc.body.append(shell);
        shell.dataset.constructorDisplay=win.getComputedStyle(shell).display;
        pins.set(id,shell);rendered++;
      }
      shell.style.zIndex=String(2147483200+(++raised));
      if(foreign){
        const fake=doc.createElement("div");
        fake.className="pokemon-card-shell";
        fake.innerHTML='<aside class="pokemon-card pokemon-card--pinned"><button class="pokemon-card__control is-close">×</button></aside>';
        doc.body.append(fake);
      }
      return true;
    },
  };
  const hud={_creatures:creatures,_xpShare:null};
  const spriteCalls=[];
  win.PokeIdle={
    PersistentHud:{_teamHud:hud},
    PokemonCardHost:nativeHost?pokemonHost:undefined,
    PokemonCard:nativeHost?{open:creature=>pokemonHost.open(creature)}:undefined,
    XPSharing:{spriteFor:region=>{spriteCalls.push(region);return "img/items/shared-stone-"+region+".png";}},
    Bus:bus,
    Api:{
      async setTeamLeader(id){calls.push(String(id));creatures.forEach(c=>c.is_leader===false);
        for(const c of creatures)c.is_leader=c.id===id;
        return {xp_share:null};},
    },
  };
  const app=createBetterUI({modules:[createCardModeModule()]});
  app.start();doc.querySelector("[data-ppbui-card-mode-toggle]").click();app.reconcile();
  const button=id=>doc.querySelector('[data-card-team-member="'+id+'"]');
  const context=(id,options={})=>{
    const event=new win.MouseEvent("contextmenu",{button:2,bubbles:true,cancelable:true,...options});
    const accepted=button(id).dispatchEvent(event);
    return {event,accepted};
  };
  t.after(()=>{app.stop();dom.window.close();
    for(const [key,value] of previous)if(value)Object.defineProperty(globalThis,key,value);
      else delete globalThis[key];
  });
  return {win,doc,app,creatures,hud,bus,button,context,calls,pins,spriteCalls,listeners,
    get opened(){return hostCalls;},get created(){return rendered;},
    setAmbiguous(value){foreign=value;},
  };
}

test("Cards Team right-click opens one original pinned Details on exact member without a leader POST",t=>{
  const f=fixture(t);
  const before=f.button("b");
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"cards");
  const result=f.context("b");
  assert.equal(result.accepted,false,"only successfully handled native Details consumes the context menu");
  assert.deepEqual(f.calls,[],"context action cannot switch leader or perform gameplay");
  assert.equal(f.opened,1);
  assert.equal(f.created,1);
  assert.ok(f.pins.has("b"));
  assert.equal(f.pins.get("b").getAttribute("data-ppbui-card-mode-window"),"native-team-details");
  assert.equal(f.pins.get("b").dataset.constructorDisplay,"block");
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(f.button("b"),before,"right-click does not replace roster controls");
  f.pins.get("b").querySelector(".is-close").click();
  f.app.reconcile();
  assert.equal(f.pins.has("b"),false);
  assert.equal(f.doc.querySelector('[data-ppbui-card-mode-window="native-team-details"]'),null);
});

for(const sheet of [false,true]){
  test("Cards roster pinned "+(sheet?"mobile sheet":"desktop")+" keeps independent identities and raises existing pin",t=>{
    const f=fixture(t,{sheet});
    f.context("a");
    const first=f.pins.get("a"),z=Number(first.style.zIndex);
    f.context("b");
    assert.notEqual(f.pins.get("b"),first);
    assert.equal(f.doc.querySelectorAll('[data-ppbui-card-mode-window="native-team-details"]').length,2);
    f.context("a");
    assert.equal(f.created,2,"reopen existing pinned card does not create a cloned card");
    assert.ok(Number(first.style.zIndex)>z);
    assert.equal(f.opened,3,"each user contextmenu opens the native API precisely once");
    assert.deepEqual(f.calls,[]);
    f.app.reconcile();
    assert.equal(first.dataset.ppbuiCardModeWindow,"native-team-details");
  });
}

test("Cards Team Details includes disabled/fainted member, keyboard context menu and preserves left-click leader switch",async t=>{
  const f=fixture(t);
  assert.equal(f.button("c").disabled,false,"fainted member stays keyboard-focusable for native Details");
  assert.equal(f.button("c").getAttribute("aria-disabled"),"true","leader switch remains logically disabled");
  f.button("c").focus();
  assert.equal(f.doc.activeElement,f.button("c"));
  f.button("c").click();
  assert.deepEqual(f.calls,[],"left-click on fainted member is still blocked");
  const faintedKey=new f.win.KeyboardEvent("keydown",{key:"F10",shiftKey:true,bubbles:true,cancelable:true});
  assert.equal(f.button("c").dispatchEvent(faintedKey),false,"keyboard context works on fainted member");
  assert.equal(f.pins.has("c"),true);
  assert.equal(f.context("c").accepted,false,"a fainted member still has native Details");
  assert.equal(f.pins.has("c"),true);
  const key=new f.win.KeyboardEvent("keydown",{key:"ContextMenu",bubbles:true,cancelable:true});
  assert.equal(f.button("a").dispatchEvent(key),false,"keyboard context action opens Details");
  assert.equal(f.opened,3);
  const shift=new f.win.KeyboardEvent("keydown",{key:"F10",shiftKey:true,bubbles:true,cancelable:true});
  assert.equal(f.button("b").dispatchEvent(shift),false);
  assert.equal(f.opened,4);
  const repeated=new f.win.KeyboardEvent("keydown",{key:"F10",shiftKey:true,repeat:true,bubbles:true,cancelable:true});
  assert.equal(f.button("b").dispatchEvent(repeated),true);
  assert.equal(f.opened,4,"holding the shortcut must not repeatedly elevate the same card");
  assert.deepEqual(f.calls,[]);
  f.button("b").click();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.deepEqual(f.calls,["b"],"left-click continues executing exactly one native leader POST");
});

test("unavailable native card handler does not eat browser context menu or touch gameplay",t=>{
  const f=fixture(t,{nativeHost:false});
  assert.equal(f.context("b").accepted,true);
  assert.equal(f.doc.querySelector(".pokemon-card-shell"),null);
  assert.deepEqual(f.calls,[]);
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"cards");
});

test("native PokemonCard.open refusal does not consume browser context nor conceal Cards",t=>{
  const f=fixture(t);
  f.win.PokeIdle.PokemonCard.open=()=>false;
  assert.equal(f.context("b").accepted,true);
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(f.doc.querySelector(".pokemon-card-shell"),null);
  assert.deepEqual(f.calls,[]);
});

test("void-returning native wrapper that synchronously opens a card retains Cards with exact pin",t=>{
  const f=fixture(t);
  const genuine=f.win.PokeIdle.PokemonCardHost.open;
  f.win.PokeIdle.PokemonCard.open=member=>{genuine(member);};
  assert.equal(f.context("b").accepted,false);
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.equal(f.pins.get("b").getAttribute("data-ppbui-card-mode-window"),"native-team-details");
  assert.deepEqual(f.calls,[]);
});

test("promise-returning native Details conservatively switches to visible Game before delayed card paints",async t=>{
  const f=fixture(t);
  const realOpen=f.win.PokeIdle.PokemonCardHost.open;
  f.win.PokeIdle.PokemonCard.open=async creature=>{
    await new Promise(resolve=>setTimeout(resolve,0));
    realOpen(creature);
    return true;
  };
  assert.equal(f.context("b").accepted,false);
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  await new Promise(resolve=>setTimeout(resolve,15));
  assert.ok(f.pins.has("b"),"late native card still opens once");
  assert.notEqual(f.win.getComputedStyle(f.pins.get("b")).display,"none");
  assert.equal(f.pins.get("b").getAttribute("data-ppbui-card-mode-window"),null,
    "late shell must never receive false Cards ownership");
  assert.deepEqual(f.calls,[]);
});

test("pending async native Details prevents Game-to-Cards reentry until the genuine pin closes",async t=>{
  const f=fixture(t),toggle=f.doc.querySelector("[data-ppbui-card-mode-toggle]");
  const nativeOpen=f.win.PokeIdle.PokemonCardHost.open;
  let resolveNative;
  f.win.PokeIdle.PokemonCard.open=creature=>new Promise(resolve=>{
    resolveNative=()=>{nativeOpen(creature);resolve(true);};
  });
  assert.equal(f.context("b").accepted,false);
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game",
    "pending Promise must fence manual Cards reentry before native card exists");
  resolveNative();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.ok(f.pins.has("b"));
  assert.notEqual(f.win.getComputedStyle(f.pins.get("b")).display,"none");
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game",
    "a settled Promise does not authorize hiding its still-pinned native card");
  f.pins.get("b").querySelector(".is-close").click();
  f.app.reconcile();
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"cards",
    "closing the exact host pin releases the safety fence without replay");
  assert.deepEqual(f.calls,[]);
});

test("native async pinned Details closed before any Cards retry releases its Game safety fence",async t=>{
  const f=fixture(t),toggle=f.doc.querySelector("[data-ppbui-card-mode-toggle]");
  const nativeOpen=f.win.PokeIdle.PokemonCardHost.open;
  let resolveNative;
  f.win.PokeIdle.PokemonCard.open=creature=>new Promise(resolve=>{
    resolveNative=()=>{nativeOpen(creature);resolve(true);};
  });
  f.context("b");
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  resolveNative();
  await Promise.resolve();
  assert.ok(f.pins.has("b"));
  f.pins.get("b").querySelector(".is-close").click();
  assert.equal(f.pins.has("b"),false);
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"cards",
    "native Close before the first Cards retry must still be observed");
  assert.deepEqual(f.calls,[]);
});

test("pre-existing pin without native open proof cannot prematurely release an async Game fence",async t=>{
  const f=fixture(t),toggle=f.doc.querySelector("[data-ppbui-card-mode-toggle]");
  f.context("b");
  assert.ok(f.pins.has("b"));
  let resolveNative;
  f.win.PokeIdle.PokemonCard.open=()=>new Promise(resolve=>{resolveNative=resolve;});
  f.context("b");
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  resolveNative(true);
  await Promise.resolve();
  f.pins.get("b").querySelector(".is-close").click();
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game",
    "a pin that pre-dated the failed call is not evidence its async action finished");
  assert.deepEqual(f.calls,[]);
});

test("unrelated native pin cannot prove an unsafe async Team Details operation completed",async t=>{
  const f=fixture(t),toggle=f.doc.querySelector("[data-ppbui-card-mode-toggle]");
  f.context("b");
  const nativeOpen=f.win.PokeIdle.PokemonCardHost.open;
  let resolveNative;
  f.win.PokeIdle.PokemonCard.open=()=>new Promise(resolve=>{resolveNative=resolve;});
  f.context("b");
  nativeOpen(f.creatures.find(c=>c.id==="c"));
  resolveNative(true);
  await Promise.resolve();
  f.pins.get("b").querySelector(".is-close").click();
  f.pins.get("c").querySelector(".is-close").click();
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game",
    "a different Pokémon card created concurrently cannot release the missing b operation");
  assert.deepEqual(f.calls,[]);
});

test("blocked Cards toggle provides localized visible and accessible recovery feedback",t=>{
  const f=fixture(t),toggle=f.doc.querySelector("[data-ppbui-card-mode-toggle]");
  f.win.PokeIdle.PokemonCard.open=()=>new Promise(()=>{});
  f.context("b");
  toggle.focus();
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  assert.equal(f.doc.activeElement,toggle,"blocked toggle remains keyboard-focusable");
  assert.equal(toggle.dataset.ppbuiCardModeBlocked,"native-team-details");
  assert.match(toggle.querySelector(".pokeidle-top-toolbar__label")?.textContent||"",/ficha/i);
  assert.match(toggle.getAttribute("aria-label")||"",/ficha/i);
  assert.match(toggle.title,/ficha/i);
  assert.equal(toggle.querySelector(".pokeidle-top-toolbar__label")?.getAttribute("aria-live"),"polite");
  assert.deepEqual(f.calls,[]);
});

test("native async Details closed before first Cards retry releases its fence",async t=>{
  const f=fixture(t),toggle=f.doc.querySelector("[data-ppbui-card-mode-toggle]");
  const nativeOpen=f.win.PokeIdle.PokemonCardHost.open;
  f.win.PokeIdle.PokemonCard.open=creature=>new Promise(resolve=>{
    f.win.setTimeout(()=>{
      nativeOpen(creature);
      // The original host may close on user X before the central observer
      // reconciles the add/remove mutation pair. There is no Cards click yet.
      f.pins.get(String(creature.id)).querySelector(".is-close").click();
      resolve(true);
    },0);
  });
  f.context("b");
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(f.pins.has("b"),false);
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"cards",
    "observed native pin lifetime must release even without an earlier Cards retry");
  assert.deepEqual(f.calls,[]);
});

test("unrelated native pin open/close cannot release an unconfirmed delayed Details fence",async t=>{
  const f=fixture(t),toggle=f.doc.querySelector("[data-ppbui-card-mode-toggle]");
  const nativeOpen=f.win.PokeIdle.PokemonCardHost.open;
  f.win.PokeIdle.PokemonCard.open=()=>undefined;
  f.context("b");
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  nativeOpen({id:"foreign",name:"Unrelated"});
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  f.pins.get("foreign").querySelector(".is-close").click();
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game",
    "a changed shell is not proof that the requested native Pokémon ever pinned");
  assert.deepEqual(f.calls,[]);
});

test("closing a pre-existing pin never proves an async reopen that made no native shell change",async t=>{
  const f=fixture(t),toggle=f.doc.querySelector("[data-ppbui-card-mode-toggle]");
  f.context("b");
  assert.ok(f.pins.has("b"),"initial pin exists before incompatible reopen");
  let resolveNative;
  f.win.PokeIdle.PokemonCard.open=()=>new Promise(resolve=>{resolveNative=resolve;});
  f.context("b");
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  f.pins.get("b").querySelector(".is-close").click();
  resolveNative(true);
  await new Promise(resolve=>setTimeout(resolve,0));
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game",
    "a pin inherited before the asynchronous gesture is not proof it completed");
  assert.deepEqual(f.calls,[]);
});

test("unrelated changed pin cannot release a pending promise without exact requested action evidence",async t=>{
  const f=fixture(t),toggle=f.doc.querySelector("[data-ppbui-card-mode-toggle]");
  const nativeOpen=f.win.PokeIdle.PokemonCardHost.open;
  let resolveNative;
  f.win.PokeIdle.PokemonCard.open=()=>new Promise(resolve=>{resolveNative=resolve;});
  f.context("b");
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  nativeOpen({id:"c",name:"Scizor"});
  f.app.reconcile();
  f.pins.get("c").querySelector(".is-close").click();
  resolveNative(true);
  await new Promise(resolve=>setTimeout(resolve,0));
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game",
    "an unrelated changed shell cannot complete the requested Pokémon's native open");
  assert.deepEqual(f.calls,[]);
});

test("a proven exact pre-existing pin raised by an async reopen releases only after native Close",async t=>{
  const f=fixture(t),toggle=f.doc.querySelector("[data-ppbui-card-mode-toggle]");
  f.context("b");
  const original=f.pins.get("b"),hostOpen=f.win.PokeIdle.PokemonCardHost.open;
  let finishNative;
  f.win.PokeIdle.PokemonCard.open=creature=>new Promise(resolve=>{
    finishNative=()=>{hostOpen(creature);resolve(true);};
  });
  f.context("b");
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  finishNative();
  await Promise.resolve();
  assert.equal(f.pins.get("b"),original,"native reopen reuses its exact generation");
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  original.querySelector(".is-close").click();
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.deepEqual(f.calls,[]);
});

test("native Escape close before the first Cards retry preserves an async pin witness",async t=>{
  const f=fixture(t),toggle=f.doc.querySelector("[data-ppbui-card-mode-toggle]");
  const hostOpen=f.win.PokeIdle.PokemonCardHost.open;
  let complete;
  f.win.PokeIdle.PokemonCard.open=creature=>new Promise(resolve=>{
    complete=()=>{hostOpen(creature);resolve(true);};
  });
  f.context("b");
  complete();
  await Promise.resolve();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  f.doc.dispatchEvent(new f.win.KeyboardEvent("keydown",{key:"Escape",bubbles:true}));
  // The genuine game handler owns Escape; emulate its effect without a fake
  // Cards handler, after its capture event samples the public pinned state.
  f.pins.get("b").querySelector(".is-close").remove();
  f.pins.get("b").remove();
  f.pins.delete("b");
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.deepEqual(f.calls,[]);
});

test("async native refusal releases Game-to-Cards fence without inventing a pin",async t=>{
  const f=fixture(t),toggle=f.doc.querySelector("[data-ppbui-card-mode-toggle]");
  let rejectNative;
  f.win.PokeIdle.PokemonCard.open=()=>new Promise((_,reject)=>{rejectNative=reject;});
  f.context("b");
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  rejectNative(new Error("native card refused"));
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(toggle.dataset.ppbuiCardModeBlocked,undefined,
    "rejected native Promise clears obsolete blocked status without requiring a user click");
  assert.equal(toggle.querySelector(".pokeidle-top-toolbar__label")?.textContent,"Cards/Game");
  assert.equal(toggle.getAttribute("aria-label"),"Cards/Game: Game");
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"cards",
    "rejected Promise with no new host pin must not strand Cards indefinitely");
  assert.equal(f.doc.querySelector('.pokemon-card-shell'),null);
  assert.deepEqual(f.calls,[]);
});

test("native Promise resolving false clears pending-details UX status without a toolbar click",async t=>{
  const f=fixture(t),toggle=f.doc.querySelector("[data-ppbui-card-mode-toggle]");
  let refuse;
  f.win.PokeIdle.PokemonCard.open=()=>new Promise(resolve=>{refuse=resolve;});
  f.context("b");
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  assert.equal(toggle.dataset.ppbuiCardModeBlocked,"native-team-details");
  refuse(false);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(toggle.dataset.ppbuiCardModeBlocked,undefined);
  assert.equal(toggle.querySelector(".pokeidle-top-toolbar__label")?.textContent,"Cards/Game");
  assert.equal(toggle.title,"Cards/Game: Game");
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game",
    "the host still leaves the user in Game until they explicitly select Cards");
  assert.deepEqual(f.calls,[]);
});

test("void-returning delayed native Details remains in Game until the delayed pin is closed",async t=>{
  const f=fixture(t),toggle=f.doc.querySelector("[data-ppbui-card-mode-toggle]");
  const nativeOpen=f.win.PokeIdle.PokemonCardHost.open;
  f.win.PokeIdle.PokemonCard.open=creature=>{f.win.setTimeout(()=>nativeOpen(creature),0);};
  f.context("b");
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  await new Promise(resolve=>setTimeout(resolve,15));
  assert.ok(f.pins.has("b"));
  assert.notEqual(f.win.getComputedStyle(f.pins.get("b")).display,"none");
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  f.pins.get("b").querySelector(".is-close").click();
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.deepEqual(f.calls,[]);
});

test("native Details throw with a queued late pin cannot bypass the Game safety fence",async t=>{
  const f=fixture(t),toggle=f.doc.querySelector("[data-ppbui-card-mode-toggle]");
  const nativeOpen=f.win.PokeIdle.PokemonCardHost.open;
  f.win.PokeIdle.PokemonCard.open=creature=>{
    f.win.setTimeout(()=>nativeOpen(creature),0);
    throw new Error("host failed after scheduling card");
  };
  assert.equal(f.context("b").accepted,false);
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  await new Promise(resolve=>setTimeout(resolve,15));
  assert.ok(f.pins.has("b"));
  assert.notEqual(f.win.getComputedStyle(f.pins.get("b")).display,"none");
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  f.pins.get("b").querySelector(".is-close").click();
  toggle.click();
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"cards");
  assert.deepEqual(f.calls,[]);
});

test("void-returning no-proof native Details fails visibly to Game instead of hiding a late card",t=>{
  const f=fixture(t);
  f.win.PokeIdle.PokemonCard.open=()=>undefined;
  assert.equal(f.context("b").accepted,false);
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  assert.equal(f.doc.querySelector('[data-ppbui-card-mode-team-details-opening]'),null);
  assert.deepEqual(f.calls,[]);
});

test("ambiguous duplicate native pinned shell fails closed to Game without granting ownership",t=>{
  const f=fixture(t,{ambiguous:true});
  assert.equal(f.context("b").accepted,false);
  assert.equal(f.opened,1);
  assert.equal(f.doc.documentElement.dataset.ppbuiCardMode,"game");
  assert.equal(f.doc.querySelectorAll('[data-ppbui-card-mode-window="native-team-details"]').length,0);
  assert.deepEqual(f.calls,[]);
});

test("Cards XP recipient stones follow native exact ids/region, never carrier, with no empty placeholders",t=>{
  const f=fixture(t);
  f.hud._xpShare={region:"kanto",carrier_id:"a",recipient_ids:["b","c"],share_bps:1800,stone_count:12};
  f.bus.emit("xp_share.state",f.hud._xpShare);
  assert.equal(f.button("a").querySelector("[data-card-team-xp-share]"),null,"carrier != recipient");
  for(const id of ["b","c"]){
    const icon=f.button(id).querySelector("[data-card-team-xp-share] img");
    assert.ok(icon,"native recipient gets region icon even if fainted");
    assert.equal(icon.getAttribute("src"),"img/items/shared-stone-kanto.png");
    assert.equal(icon.getAttribute("alt"),"");
    assert.equal(icon.closest("span").getAttribute("aria-hidden"),"true");
    assert.match(f.button(id).getAttribute("aria-label"),/KANTO/);
    assert.match(f.button(id).title,/EXP compartilhada/);
    assert.equal(f.button(id).querySelectorAll("[data-card-team-xp-share]").length,1);
  }
  assert.ok(f.spriteCalls.includes("kanto"));
  for(const id of ["d","e","f"])assert.equal(f.button(id).querySelector("[data-card-team-xp-share]"),null);
});

test("XP region/recipient/stone removal updates exactly with bus events, preserving button focus",t=>{
  const f=fixture(t);
  f.hud._xpShare={region:"kanto",carrier_id:"a",recipient_ids:["b"]};
  f.bus.emit("xp_share.state");
  const b=f.button("b");b.focus();
  f.hud._xpShare={region:"johto",carrier_id:"b",recipient_ids:["e"]};
  f.bus.emit("shared_stone.engraved");
  assert.equal(f.button("b").querySelector("[data-card-team-xp-share]"),null);
  assert.equal(f.button("e").querySelector("[data-card-team-xp-share] img").getAttribute("src"),"img/items/shared-stone-johto.png");
  assert.equal(f.doc.activeElement?.dataset.cardTeamMember,"b","focus follows same member id across status rerender");
  f.hud._xpShare=null;
  f.bus.emit("shared_stone.removed");
  assert.equal(f.doc.querySelectorAll("[data-card-team-xp-share]").length,0);
  f.bus.emit("shared_stone.removed");
  assert.equal(f.doc.querySelectorAll("[data-card-team-xp-share]").length,0);
  assert.equal(f.button("b").querySelector("[data-card-team-xp-share]"),null);
});

test("invalid or missing native regional sprite fails closed without an invented stone URL",t=>{
  const f=fixture(t);
  f.win.PokeIdle.XPSharing.spriteFor=()=>null;
  f.hud._xpShare={region:"nowhere",carrier_id:"a",recipient_ids:["b"]};
  f.bus.emit("xp_share.state");
  assert.equal(f.button("b").querySelector("[data-card-team-xp-share]"),null);
  f.hud._xpShare={region:"../invalid",carrier_id:"a",recipient_ids:["b"]};
  f.bus.emit("xp_share.state");
  assert.equal(f.button("b").querySelector("[data-card-team-xp-share]"),null);
});

test("native HUD exact recipient badge is the only fallback when sprite API is unavailable",t=>{
  const f=fixture(t);
  f.win.PokeIdle.XPSharing.spriteFor=()=>undefined;
  const hud=f.doc.createElement("aside");hud.className="pokeidle-team-hud";
  const list=f.doc.createElement("div");list.className="pokeidle-team-hud__list";
  hud.append(list);f.doc.body.append(hud);f.hud.el=hud;
  const recipient=f.doc.createElement("div");
  recipient.className="pokeidle-team-card is-xp-share-recipient";
  recipient.dataset.creatureId="b";
  const badge=f.doc.createElement("span");
  badge.className="pokeidle-team-card__xp-share is-recipient";
  badge.title="Elegível para receber EXP compartilhada (KANTO)";
  const image=f.doc.createElement("img");image.src="img/items/stone-native-kanto.png";
  badge.append(image);recipient.append(badge);list.append(recipient);
  f.hud._xpShare={region:"kanto",carrier_id:"a",recipient_ids:["b"]};
  f.bus.emit("xp_share.state");
  assert.equal(f.button("b").querySelector("[data-card-team-xp-share] img")?.getAttribute("src"),
    "img/items/stone-native-kanto.png");
  badge.hidden=true;
  f.bus.emit("xp_share.state");
  assert.equal(f.button("b").querySelector("[data-card-team-xp-share]"),null,
    "native hidden placeholder is never promoted to the Cards roster");
  badge.hidden=false;badge.title="Elegível para receber EXP compartilhada (JOHTO)";
  f.bus.emit("xp_share.state");
  assert.equal(f.button("b").querySelector("[data-card-team-xp-share]"),null,
    "stale native region art cannot masquerade as the current stone");
});

test("shared XP accessible label follows game locale without changing region sprite",t=>{
  const f=fixture(t);
  f.win.PokeIdle.Localization={get:()=> "en-US"};
  f.hud._xpShare={region:"johto",carrier_id:"a",recipient_ids:["b"]};
  f.bus.emit("xp_share.state");
  const b=f.button("b");
  assert.match(b.getAttribute("aria-label"),/Eligible for shared EXP \(JOHTO\)/);
  assert.equal(b.querySelector("[data-card-team-xp-share] img")?.getAttribute("src"),
    "img/items/shared-stone-johto.png");
});

test("status refresh with same native projection keeps identical roster DOM and listeners are removed at cleanup",t=>{
  const f=fixture(t);
  f.hud._xpShare={region:"kanto",carrier_id:"a",recipient_ids:["b"]};
  f.bus.emit("xp_share.state");
  const b=f.button("b"),icon=b.querySelector("[data-card-team-xp-share] img");
  f.app.reconcile();f.app.reconcile();
  assert.equal(f.button("b"),b);
  assert.equal(f.button("b").querySelector("[data-card-team-xp-share] img"),icon);
  assert.ok(f.listeners.get("xp_share.state")?.size);
  f.app.stop();
  assert.equal(f.listeners.get("xp_share.state")?.size,0);
});
