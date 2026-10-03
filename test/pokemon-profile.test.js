import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { loadOwnedPokemon, mountPokemonProfile } from "../src/modules/pokemon-profile/controller.js";

const move = (id, name, element = "normal", power = null, category = "physical", cooldownMs = 0, extra = {}) => ({ id, name, element, category, cooldown_ms:cooldownMs, ...(power === null ? {} : { power }), ...extra });
const currentMoves = [
  move("earthquake", "Earthquake", "ground", 100, "physical", 5000),
  move("stone-edge", "Stone Edge", "rock", 100, "physical", 4000),
  move("megahorn", "Megahorn", "bug", 120, "physical", 6000),
  move("recover", "Recover", "normal", 1, "status", 8000, { effect_kind:"heal", heal_percent:50 }),
];

function setup(t, { movesDelay, movesFailOnce = false } = {}) {
  const dom = new JSDOM(`<div class="pokeidle-top-toolbar"><button data-menu-id="team" class="pokeidle-top-toolbar__btn"><span class="pokeidle-top-toolbar__label">Team</span></button></div><button id="external" data-ppbui-pokemon-profile-source data-creature-id="bag-1">Rhydon</button>`, { url:"https://pokepixel.nietore.com/play/", pretendToBeVisual:true });
  const { document:doc } = dom.window;
  const team = [
    { id:"team-1", name:"Gengar", species_id:"gengar", level:85, power:518, hp:212, max_hp:212, quality:"epic", quality_multiplier:1.7, iv_total:172, gender:"male", nature:"timid", elements:["ghost","poison"] },
    { id:"dup", name:"Pikachu", species_id:"pikachu", level:50, power:300, hp:100, max_hp:100, quality:"common", quality_multiplier:1.1, iv_total:144, gender:"female", nature:"jolly", elements:["electric"] },
  ];
  const inventory = [
    { id:"dup", name:"Pikachu stale", species_id:"pikachu", level:49, power:290, hp:90, max_hp:100, elements:["electric"] },
    { id:"bag-1", name:"Rhydon", species_id:"rhydon", level:42, power:411, hp:155, max_hp:155, quality:"rare", quality_multiplier:1.5, iv_total:170, gender:"male", nature:"adamant", elements:["ground","rock"] },
  ];
  const bus = new Map(), saveCalls=[], configureCalls=[];
  let moveFailureConsumed = false;
  const getMoveset = async id => {
    if (movesDelay) await movesDelay(id);
    if (movesFailOnce && id === "bag-1" && !moveFailureConsumed) { moveFailureConsumed = true; throw new Error("moves-read-failed"); }
    const selected = id === "bag-1" ? currentMoves : [move("shadow-ball","Shadow Ball","ghost",80,"special",4000),move("sludge-wave","Sludge Wave","poison",95,"special",5000)];
    return { creature_id:id, revision:3, mode:"manual", selected, available:[...selected,...currentMoves], slot_settings:id==="bag-1"?[{use_as_priority:true,heal_threshold_pct:75},{use_as_priority:false,heal_threshold_pct:75},{use_as_priority:false,heal_threshold_pct:75},{use_as_priority:false,heal_threshold_pct:75}]:[] };
  };
  dom.window.PokeIdle = {
    Localization:{ get:()=>"pt-BR" }, DittoDisplayName:{ get:c=>c.name }, Auth:{ getTrainerSummary:()=>({id:"trainer-1"}) },
    ElementIcons:{ definition:element=>({label:element,color:{ground:"#e2bf65",rock:"#b6a136",bug:"#a6b91a",normal:"#a8a77a",ghost:"#735797",poison:"#a33ea1",electric:"#f7d02c"}[element]||"#888"}), create(element){const img=doc.createElement("img");img.src=`/elements/${element}.png`;return img;} },
    t:key=>key,
    PokemonCardData:{ async loadDetail(id){ const creature=[...team,...inventory].find(entry=>entry.id===id); return { creature:creature?{...creature}:null, moves:[...currentMoves,move("rock-slide","Rock Slide","rock",75,"physical",3000),move("drill-run","Drill Run","ground",80,"physical",4000),move("ice-fang","Ice Fang","ice",65,"physical",5000)].map(entry=>({id:entry.id,move:{...entry}})) }; } },
    Bus:{ on(name,fn){ if(!bus.has(name))bus.set(name,new Set());bus.get(name).add(fn); }, off(name,fn){ bus.get(name)?.delete(fn); }, emit(name,data){ for(const fn of bus.get(name)||[])fn(data); } },
    MovesetConfig:{ open(id){ configureCalls.push(String(id)); } },
    Api:{
      async getCreatures(location){ return { data: location === "team" ? team.map(x=>({...x})) : inventory.map(x=>({...x})) }; },
      async getSpecies(id){ return { id, name:id, normal_sprite_url:`/img/${id}.png` }; },
      getMoveset,
      async saveMoveset(id,payload){ saveCalls.push({id,payload:{...payload,move_ids:[...payload.move_ids]}}); return { creature_id:id, revision:4, mode:"manual", selected:payload.move_ids.map(moveId => [...currentMoves,move("shadow-ball","Shadow Ball","ghost",80),move("sludge-wave","Sludge Wave","poison",95)].find(entry=>entry.id===moveId)).filter(Boolean), available:[...currentMoves] }; },
    },
  };
  dom.window.confirm = () => true;
  dom.window.localStorage.setItem("ppbui:team-movesets:v1", JSON.stringify([
    { id:"m1", creatureId:"bag-1", name:"Hunt", marker:1, moves:currentMoves, createdAt:1, updatedAt:1 },
    { id:"m3", creatureId:"bag-1", name:"Boss", marker:2, moves:[move("rock-slide","Rock Slide","rock"),move("drill-run","Drill Run","ground"),move("ice-fang","Ice Fang","ice"),move("protect","Protect","normal")], createdAt:2, updatedAt:2 },
    { id:"m2", creatureId:"dup", name:"Other Pikachu", marker:1, moves:[move("thunderbolt","Thunderbolt","electric")], createdAt:1, updatedAt:1 },
  ]));
  dom.window.localStorage.setItem("ppbui:team-presets:v2", JSON.stringify([
    { id:"t1", name:"Ground Crew", activeId:"bag-1", orderVerified:true, members:[{id:"bag-1",name:"Rhydon",sprite:"/img/rhydon.png"},{id:"team-1",name:"Gengar"}], createdAt:1, updatedAt:1 },
    { id:"t2", name:"Other Pikachu", activeId:"dup", orderVerified:true, members:[{id:"dup",name:"Pikachu"}], createdAt:1, updatedAt:1 },
  ]));
  dom.window.localStorage.setItem("ppbui:pokemon-tags:v2:trainer-1", JSON.stringify({ assigned:{ "bag-1":["boss"], "team-1":["pve"] } }));
  const mounted = mountPokemonProfile(doc);
  t.after(() => { mounted.cleanup(); dom.window.close(); });
  return { dom, doc, mounted, team, inventory, saveCalls, configureCalls };
}

test("Profile detaches events from the original native Bus and rebinds after rehydration", t => {
  const s = setup(t);
  const oldBus = s.dom.window.PokeIdle.Bus;
  const removed = [];
  const oldOff = oldBus.off;
  oldBus.off = (event, handler) => { removed.push(event); oldOff(event, handler); };
  const attached = new Map();
  const nextBus = {
    on(event, handler) { attached.set(event, handler); },
    off(event, handler) { if (attached.get(event) === handler) attached.delete(event); },
  };
  s.dom.window.PokeIdle.Bus = nextBus;
  s.mounted.sync();
  assert.deepEqual(removed.sort(), ["moveset.saved", "state.resynced", "team.updated"]);
  assert.deepEqual([...attached.keys()].sort(), removed);
  s.mounted.cleanup();
  assert.equal(attached.size, 0, "teardown must detach from the exact registered Bus");
});

test("stable Profile sync is mutation-free and cannot feed the central observer", t => {
  const s = setup(t);
  const observer = new s.dom.window.MutationObserver(() => {});
  observer.observe(s.doc.body, { childList:true, subtree:true, attributes:true });

  s.mounted.sync();
  assert.equal(observer.takeRecords().length, 0, "first stable sync must not rewrite copy or reflected attributes");
  s.mounted.sync();
  assert.equal(observer.takeRecords().length, 0, "a second stable sync must remain mutation-free instead of sustaining a reconcile loop");
  observer.disconnect();
});

test("Profile dialog and dossier expose stable accessible names and value semantics", async t => {
  const s=setup(t);await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1");
  const root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]"),title=s.doc.querySelector("[data-ppbui-profile-title]");
  assert.equal(root.getAttribute("aria-labelledby"),title.id);assert.equal(title.textContent,"Pokémon Profile");
  assert.match(root.querySelector("[data-ppbui-profile-sources]").getAttribute("aria-label"),/Origem/i);
  assert.match(root.querySelector("[data-ppbui-profile-filters]").getAttribute("aria-label"),/Filtros/i);
  assert.match(root.querySelector("[data-ppbui-profile-list]").getAttribute("aria-label"),/Pokémon disponíveis/i);
  const hp=root.querySelector("[data-ppbui-profile-hp-track]");assert.equal(hp.getAttribute("role"),"progressbar");assert.equal(hp.getAttribute("aria-valuemin"),"0");assert.equal(hp.getAttribute("aria-valuemax"),"155");assert.equal(hp.getAttribute("aria-valuenow"),"155");assert.equal(hp.getAttribute("aria-valuetext"),"155 / 155");
  const teamMembers=root.querySelector("[data-ppbui-profile-team-members]");assert.equal(teamMembers.getAttribute("role"),"list");const rhydon=teamMembers.querySelector('[data-ppbui-profile-team-member][aria-current="true"]');assert.equal(rhydon.getAttribute("role"),"listitem");assert.match(rhydon.getAttribute("aria-label"),/Rhydon.*Ativo/i);assert.ok(rhydon.querySelector('img[alt=""]'),"sprite remains decorative because the member cell owns the accessible name");
});

test("Profile picker reuses keyed cards and selection keeps keyboard focus without list churn", async t => {
  const s=setup(t);await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1");const root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]"),list=root.querySelector("[data-ppbui-profile-list]");
  const original=new Map([...list.querySelectorAll("[data-ppbui-profile-choice]")].map(node=>[node.dataset.creatureId,node]));
  const gengar=original.get("team-1");gengar.focus();const observer=new s.dom.window.MutationObserver(()=>{});observer.observe(list,{childList:true});
  gengar.click();await new Promise(resolve=>s.dom.window.setTimeout(resolve,30));
  assert.equal(root.querySelector('[data-ppbui-profile-choice][data-creature-id="team-1"]'),gengar,"selection reuses the exact chooser button");
  assert.equal(s.doc.activeElement,gengar,"activating a chooser does not strand focus on BODY or a detached node");
  assert.equal(observer.takeRecords().length,0,"selection does not rebuild or reorder the picker list when its filtered membership is unchanged");
  const search=root.querySelector("[data-ppbui-profile-search]");search.value="gen";search.dispatchEvent(new s.dom.window.Event("input"));assert.equal(list.querySelector("[data-ppbui-profile-choice]"),gengar);
  search.value="";search.dispatchEvent(new s.dom.window.Event("input"));for(const [id,node] of original)assert.equal(root.querySelector(`[data-ppbui-profile-choice][data-creature-id="${id}"]`),node,`filter clear must reattach the same keyed ${id} card`);
  observer.disconnect();
});

test("Profile Refresh and state.resynced re-read authoritative current moves instead of a prior cache", async t => {
  const s=setup(t),nativeRead=s.dom.window.PokeIdle.Api.getMoveset;
  let reads=0;
  s.dom.window.PokeIdle.Api.getMoveset=async id=>{
    const response=await nativeRead(id);
    if(id!=="bag-1")return response;
    reads++;
    return {...response,selected:response.selected.map((move,index)=>index===0?{...move,name:`Earthquake v${reads}`}:move)};
  };
  await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1");
  const current=()=>s.doc.querySelector("[data-ppbui-profile-current] [data-ppbui-profile-move-name]")?.textContent;
  assert.equal(current(),"Earthquake v1");
  await s.dom.window.__PPBUI_POKEMON_PROFILE__.refresh();
  assert.equal(current(),"Earthquake v2","manual Refresh must invalidate successful move reads");
  s.dom.window.PokeIdle.Bus.emit("state.resynced");
  for(let attempt=0;attempt<20&&current()!=="Earthquake v3";attempt++)
    await new Promise(resolve=>s.dom.window.setTimeout(resolve,5));
  assert.equal(current(),"Earthquake v3","native resync must invalidate successful move reads");
  assert.equal(reads,3);
});

test("transient Species failures are evicted so a later Profile Refresh can recover artwork", async t => {
  const s=setup(t),nativeSpecies=s.dom.window.PokeIdle.Api.getSpecies;let rhydonCalls=0;
  s.dom.window.PokeIdle.Api.getSpecies=async id=>{if(id==="rhydon"&&++rhydonCalls<=2)throw new Error("temporary species outage");return nativeSpecies(id);};
  await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1");
  const root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]"),visual=()=>root.querySelector('[data-ppbui-profile-choice][data-creature-id="bag-1"] [data-ppbui-profile-choice-visual]');
  assert.equal(visual().querySelector("img"),null,"failed Species reads degrade to existing textual identity without poisoning UI");
  await s.dom.window.__PPBUI_POKEMON_PROFILE__.refresh();
  assert.ok(rhydonCalls>=3,"manual Refresh retries a Species promise that previously rejected");
  assert.match(visual().querySelector("img").src,/\/img\/rhydon\.png$/);
});

function installNativeCardRenderer(s, { labels = {}, nativeNote = false } = {}) {
  const { doc } = s, pokemonCard = s.dom.window.PokeIdle.PokemonCard || {};
  let calls = 0;
  const actionClicks = new Map();
  const renderSnapshots = [];
  const copy = {
    sale:"SALE",
    power:"TOTAL POWER",
    iv:"TOTAL IV",
    rarity:"RARITY",
    battle:"BATTLE STATS",
    ...labels,
  };
  const originalRender = (container, creature, options = {}) => {
    calls += 1;
    const priorActions=container.querySelector(".pokemon-card__actions");
    renderSnapshots.push({
      decorated:container.hasAttribute("data-ppbui-profile-native-card"),
      actionsCanonical:!priorActions||priorActions===container.lastElementChild,
      hiddenOwned:container.querySelectorAll("[data-ppbui-profile-native-hidden]").length,
      compactStatuses:container.querySelectorAll("[data-ppbui-profile-native-status]").length,
    });
    container.replaceChildren();
    const header = doc.createElement("header"); header.className = "pokemon-tooltip__header";
    const identity = doc.createElement("div"); identity.className = "pokemon-tooltip__identity";
    const name = doc.createElement("strong"); name.className = "pokemon-tooltip__name"; name.textContent = creature.name;
    identity.append(name); header.append(identity);
    const badges = doc.createElement("div"); badges.className = "pokemon-tooltip__badges";
    for (const [label,className] of [["LEVEL " + creature.level,"is-level"],["EPIC ×1.49","is-quality"],["ACTIVE","is-active"],["PROTECTED","is-locked"]]) { const badge=doc.createElement("span");badge.className=("pokemon-tooltip__badge " + className).trim();badge.textContent=label;badges.append(badge); }
    const cells = doc.createElement("div"); cells.className = "pokemon-card__cells";
    const cell = (label, value, className = "") => { const node=doc.createElement("div");node.className=("pokemon-card__cell " + className).trim();const caption=doc.createElement("span");caption.className="pokemon-card__cell-label";caption.textContent=label;const strong=doc.createElement("b");strong.className="pokemon-card__cell-value";strong.textContent=value;node.append(caption,strong);return node; };
    cells.append(
      cell(copy.power, String(creature.power), "is-power"),
      cell(copy.iv, String(creature.iv_total || 0) + "/186"),
      cell(copy.sale, "2.970 dólares"),
      cell(copy.rarity, "×1.49 / ×1.54", "is-rarity"),
    );
    if(nativeNote){const note=doc.createElement("small");note.className="pokemon-card__note is-mastery";note.textContent="MASTERY +10%";cells.append(note);}
    const battle = doc.createElement("section"); battle.className = "pokemon-card__section"; const battleTitle=doc.createElement("h4");battleTitle.className="pokemon-card__title";battleTitle.textContent=copy.battle;battle.append(battleTitle);
    container.append(header,badges,cells,battle);
    if (options.actions?.length) {
      const actions=doc.createElement("div");actions.className="pokemon-card__actions";
      for(const label of ["EQUIP","LOCK","CHAT"]){const action=doc.createElement("button");action.type="button";action.className="pokemon-card__action";action.textContent=label;action.addEventListener("click",()=>actionClicks.set(label,(actionClicks.get(label)||0)+1));actions.append(action);}
      container.append(actions);
    }
    return creature;
  };
  s.dom.window.PokeIdle.PokemonCard = { ...pokemonCard, render: originalRender };
  const previousT = s.dom.window.PokeIdle.t;
  s.dom.window.PokeIdle.t = key => key === "pokemon_card.sale" ? copy.sale
    : key === "creature_details.total_power" ? copy.power
    : key === "pokemon_card.iv_total" ? copy.iv
    : key === "pokemon_card.rarity" ? copy.rarity
    : key === "creature_details.battle_stats" ? copy.battle
    : previousT(key);
  s.mounted.sync();
  return { originalRender, calls: () => calls, actionClicks, renderSnapshots };
}

test("Profile titlebar follows the native game window hierarchy", t => {
  const s = setup(t);
  const css = s.doc.querySelector('style[data-ppbui-module="pokemon-profile"]').textContent.replace(/\s+/g, " ");
  const root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]"),titlebar=root.querySelector("[data-ppbui-profile-titlebar]"),icon=titlebar.querySelector("[data-ppbui-profile-title-icon]"),title=titlebar.querySelector("[data-ppbui-profile-title]");
  assert.match(icon.src,/\/assets\/menu-poke-profile-icon\.png$/);assert.equal(icon.draggable,false);assert.equal(icon.getAttribute("aria-hidden"),"true");
  assert.equal(root.getAttribute("aria-labelledby"),title.id);
  assert.match(css,/\[data-ppbui-pokemon-profile-window\] \{[^}]*overflow:hidden;[^}]*border-radius:var\(--ppbui-window-radius\);/s,"Profile window clips its internal surfaces to the native rounded shell");
  assert.match(css, /\[data-ppbui-profile-titlebar\] \{[^}]*min-height:48px;[^}]*background:var\(--ppbui-bg-2\);[^}]*cursor:move;/);
  assert.match(css, /\[data-ppbui-profile-title\] \{[^}]*color:var\(--ppbui-text\);[^}]*font:700 15px\/1 var\(--ppbui-font-body\);[^}]*text-transform:uppercase;/);
  assert.match(css, /\[data-ppbui-profile-close\] \{[^}]*border:0!important;[^}]*background:transparent!important;/);
  for (const selector of ["profile-hero", "profile-facts", "profile-current", "profile-move", "profile-team-member"])
    assert.match(css, new RegExp(`\\[data-ppbui-${selector}\\] \\{[^}]*border-radius:var\\(--ppbui-radius\\)!important;`));
  assert.match(css, /\[data-ppbui-profile-move-position\] \{[^}]*border-radius:var\(--ppbui-radius-badge\)!important;/);
});

test("Profile window drags from the titlebar and clamps inside the viewport", async t => {
  const s=setup(t);await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1");
  const root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]"),titlebar=root.querySelector("[data-ppbui-profile-titlebar]");
  Object.defineProperty(s.dom.window,"innerWidth",{configurable:true,value:800});
  Object.defineProperty(s.dom.window,"innerHeight",{configurable:true,value:600});
  root.getBoundingClientRect=()=>({left:90,top:70,right:710,bottom:570,width:620,height:500,x:90,y:70,toJSON(){}});
  const captured=new Set(),released=[];
  titlebar.setPointerCapture=id=>captured.add(id);titlebar.hasPointerCapture=id=>captured.has(id);titlebar.releasePointerCapture=id=>{released.push(id);captured.delete(id);};
  const pointer=(type,{pointerId=7,button=0,buttons=type==="pointerup"?0:1,clientX=100,clientY=80}={})=>{
    const event=new s.dom.window.MouseEvent(type,{bubbles:true,button,buttons,clientX,clientY});Object.defineProperty(event,"pointerId",{value:pointerId});return event;
  };
  titlebar.dispatchEvent(pointer("pointerdown"));
  assert.deepEqual([...captured],[7],"drag captures the active pointer when the platform supports capture");
  assert.equal(root.dataset.ppbuiProfileDragging,"");assert.equal(root.style.transform,"none");assert.equal(root.style.left,"90px");assert.equal(root.style.top,"70px");
  s.doc.dispatchEvent(pointer("pointermove",{clientX:400,clientY:300}));
  assert.equal(root.style.left,"172px","drag clamps the right edge to an 8px viewport inset");
  assert.equal(root.style.top,"92px","drag clamps the bottom edge to an 8px viewport inset");
  s.doc.dispatchEvent(pointer("pointerup",{clientX:400,clientY:300}));
  assert.equal(root.hasAttribute("data-ppbui-profile-dragging"),false);
  assert.deepEqual(released,[7],"ending a drag releases pointer capture");
  const left=root.style.left,top=root.style.top;
  root.querySelector("[data-ppbui-profile-close]").dispatchEvent(new s.dom.window.MouseEvent("pointerdown",{bubbles:true,button:0,clientX:460,clientY:20}));
  assert.equal(root.style.left,left);assert.equal(root.style.top,top);assert.equal(root.hasAttribute("data-ppbui-profile-dragging"),false,"close control never starts window dragging");

  titlebar.dispatchEvent(pointer("pointerdown",{pointerId:8,clientX:120,clientY:90}));
  const beforeReleasedMove={left:root.style.left,top:root.style.top};
  s.doc.dispatchEvent(pointer("pointermove",{pointerId:8,buttons:0,clientX:350,clientY:250}));
  assert.equal(root.hasAttribute("data-ppbui-profile-dragging"),false,"re-entry with no primary button ends a drag whose release happened outside the document");
  assert.deepEqual({left:root.style.left,top:root.style.top},beforeReleasedMove,"a buttons=0 re-entry cannot move the window");

  titlebar.dispatchEvent(pointer("pointerdown",{pointerId:9,clientX:130,clientY:100}));
  const beforeBlur={left:root.style.left,top:root.style.top};
  s.dom.window.dispatchEvent(new s.dom.window.Event("blur"));
  assert.equal(root.hasAttribute("data-ppbui-profile-dragging"),false,"window blur ends an active drag");
  s.doc.dispatchEvent(pointer("pointermove",{pointerId:9,buttons:1,clientX:300,clientY:220}));
  assert.deepEqual({left:root.style.left,top:root.style.top},beforeBlur,"pointer movement after blur stays inert until a new drag starts");

  titlebar.dispatchEvent(pointer("pointerdown",{pointerId:10,clientX:140,clientY:110}));
  titlebar.dispatchEvent(pointer("lostpointercapture",{pointerId:10,buttons:0,clientX:140,clientY:110}));
  assert.equal(root.hasAttribute("data-ppbui-profile-dragging"),false,"lost pointer capture always clears drag state");
});

test("Profile move typography is explicit and browser-stable", t => {
  const s = setup(t);
  const css = s.doc.querySelector('style[data-ppbui-module="pokemon-profile"]').textContent.replace(/\s+/g, " ");
  assert.match(css, /\[data-ppbui-pokemon-profile-window\] \{[^}]*font:var\(--ppbui-font-size-body\)\/var\(--ppbui-line-height-body\) var\(--ppbui-font-body\);[^}]*-webkit-text-size-adjust:100%;[^}]*text-size-adjust:100%;/);
  assert.match(css, /\[data-ppbui-profile-move-name\] \{[^}]*font-family:var\(--ppbui-font-body\);[^}]*font-size:var\(--ppbui-font-size-body\);[^}]*font-weight:700;[^}]*line-height:16px;/);
  assert.match(css, /\.pokemon-card\[data-ppbui-profile-native-card\] \[data-ppbui-profile-native-move\] \{[^}]*font-family:var\(--ppbui-font-body\);[^}]*font-size:var\(--ppbui-font-size-body\);[^}]*line-height:var\(--ppbui-line-height-body\);/);
  assert.match(css, /\[data-ppbui-profile-native-move-copy\] > strong \{[^}]*font:700 var\(--ppbui-font-size-body\)\/var\(--ppbui-line-height-tight\) var\(--ppbui-font-body\);/);
  assert.match(css, /\[data-ppbui-profile-native-move-copy\] > small \{[^}]*font:400 var\(--ppbui-font-size-meta\)\/var\(--ppbui-line-height-meta\) var\(--ppbui-font-body\);/);
  assert.match(css, /\.pokemon-card\[data-ppbui-profile-native-card\] \{[^}]*-webkit-text-size-adjust:100%;[^}]*text-size-adjust:100%;/);
});

test("owned Pokémon source is exact Team + Backpack union with Team-first id de-duplication", async t => {
  const s=setup(t), owned=await loadOwnedPokemon(s.doc);
  assert.deepEqual(owned.map(entry=>entry.id),["team-1","dup","bag-1"]);
  assert.equal(owned.find(entry=>entry.id==="dup").name,"Pikachu","Team record wins only for the same exact creature id");
  assert.equal(owned.find(entry=>entry.id==="bag-1").__ppbuiSource,"backpack");
});

test("owned Pokémon refresh repairs Team state before reading Team and Backpack collections", async t => {
  const s=setup(t), calls=[];
  s.dom.window.PokeIdle.Api.getTeam=async()=>{calls.push("getTeam");return{};};
  s.dom.window.PokeIdle.Api.getCreatures=async location=>{calls.push(`getCreatures:${location}`);return{data:[]};};
  await loadOwnedPokemon(s.doc);
  assert.equal(calls[0],"getTeam");
  assert.deepEqual(new Set(calls.slice(1)),new Set(["getCreatures:team","getCreatures:inventory"]));
});

test("Profile never fabricates Common rarity when an owned creature has no authoritative quality", async t => {
  const s=setup(t); delete s.team[0].quality; delete s.team[0].quality_multiplier;
  await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("team-1");
  const root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]"),choice=root.querySelector('[data-ppbui-profile-choice][data-creature-id="team-1"]'),rarity=choice.querySelector("[data-ppbui-profile-choice-rarity] .ppbui-quality-badge");
  assert.equal(rarity.textContent,"—","Search/List leaves unknown rarity unavailable");
  assert.ok(![...rarity.classList].some(name=>name.startsWith("quality-")),"unknown rarity has no fabricated canonical quality class");
  assert.equal(root.querySelector('[data-ppbui-profile-fact="rarity"] strong').textContent,"—","selected dossier uses the same fail-closed rarity semantics");
});

test("dedicated Pokémon Profile selects Backpack creatures and renders explicit ordered 1-4 Current and Saved moves", async t => {
  const s=setup(t); await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1");
  const root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]");
  assert.equal(root.hidden,false); assert.equal(root.querySelector("[data-ppbui-profile-name]").textContent,"Rhydon");
  assert.match(root.querySelector("[data-ppbui-profile-power]").textContent,/Power\s+411/); assert.equal(root.querySelector("[data-ppbui-profile-power]").closest("[data-ppbui-card]"),null,"Power is inline metadata, not another card");
  const current=[...root.querySelectorAll("[data-ppbui-profile-current] [data-ppbui-profile-move]")];
  assert.equal(current.length,4); assert.deepEqual(current.map(node=>node.querySelector("[data-ppbui-profile-move-position]").textContent),["1","2","3","4"]); assert.deepEqual(current.map(node=>node.querySelector("[data-ppbui-profile-move-name]").textContent),currentMoves.map(entry=>entry.name));
  const currentRail=root.querySelector("[data-ppbui-profile-current] [data-ppbui-profile-move-list]");assert.equal(currentRail.tabIndex,0);assert.ok(currentRail.classList.contains("ppbui-scroll"));assert.ok(currentRail.classList.contains("ppbui-focusable"));assert.match(currentRail.getAttribute("aria-label"),/Moves atuais/i);
  const saved=root.querySelector("[data-ppbui-profile-saved]"); assert.ok(saved); assert.deepEqual([...saved.querySelectorAll("[data-ppbui-profile-move-position]")].map(node=>node.textContent),["1","2","3","4"]);
  const savedRail=saved.querySelector("[data-ppbui-profile-move-list]");assert.equal(savedRail.tabIndex,0);assert.match(savedRail.getAttribute("aria-label"),/Movesets salvos.*Hunt/i);
  assert.equal(root.querySelectorAll("[data-ppbui-profile-team-row]").length,1,"Saved Team membership is exact creature-id context"); assert.match(root.querySelector("[data-ppbui-profile-team-row]").textContent,/Ground Crew/); assert.doesNotMatch(root.querySelector("[data-ppbui-profile-team-list]").textContent,/Other Pikachu/);
  const css=s.doc.querySelector('style[data-ppbui-module="pokemon-profile"]').textContent;
  assert.match(css,/\[data-ppbui-profile-move-list\] \{[^}]*grid-template-columns:repeat\(4,minmax\(136px,1fr\)\)[^}]*overflow-x:auto/s,"Current and Saved moves use the requested 136px minimum card width with local narrow scrolling");
  assert.doesNotMatch(css,/@container[^}]*\[data-ppbui-profile-move-list\][^{]*\{[^}]*grid-template-columns/s,"narrow layout must not reflow the move rail back to vertical or 2x2");
});

test("captured Pokemon Profile moveset writers are inert after cleanup", async t => {
  const s=setup(t);await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1");
  const root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]");
  const boss=[...root.querySelectorAll("[data-ppbui-profile-saved]")].find(node=>/Boss/.test(node.textContent));
  const [apply,,remove]=boss.querySelectorAll("[data-ppbui-profile-saved-actions] button");
  const configure=root.querySelector("[data-ppbui-profile-configure-moves]");
  const stored=s.dom.window.localStorage.getItem("ppbui:team-movesets:v1");let confirms=0;s.dom.window.confirm=()=>{confirms+=1;return true;};
  assert.equal(apply.disabled,false);assert.equal(configure.disabled,false);assert.equal(s.saveCalls.length,0);
  s.mounted.cleanup();
  apply.click();configure.click();remove.click();await new Promise(resolve=>s.dom.window.setTimeout(resolve,0));
  assert.equal(s.saveCalls.length,0,"detached Profile controls cannot call the authoritative moveset writer after cleanup");
  assert.equal(s.configureCalls.length,0,"detached Profile controls cannot open the native moveset editor after cleanup");
  assert.equal(confirms,0,"detached local-store removal fails before opening confirmation");
  assert.equal(s.dom.window.localStorage.getItem("ppbui:team-movesets:v1"),stored,"detached removal cannot mutate Saved Movesets");
});

test("Profile reuses Pokémon element, sprite, rarity and move visual identity with real move power", async t => {
  const s=setup(t); await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1"); const root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]");
  const hero=root.querySelector("[data-ppbui-profile-hero]"),portrait=hero.querySelector("[data-ppbui-profile-portrait] img"),types=[...hero.querySelectorAll("[data-ppbui-profile-type]")];
  assert.equal(hero.style.getPropertyValue("--ppbui-profile-element-color"),"#e2bf65"); assert.match(portrait.src,/\/img\/rhydon\.png$/);
  assert.equal(types.length,2); assert.ok(types.every(node=>node.querySelector("[data-ppbui-profile-type-icon] .ppbui-element-icon")),"selected Element keeps only the icon boxed while the adjacent name remains plain");
  assert.ok(hero.querySelector('[data-ppbui-profile-fact="rarity"] .ppbui-quality-badge.quality-rare'),"selected Rarity keeps canonical rarity color without repeating it in the upper meta row");
  assert.equal(hero.querySelector('[data-ppbui-profile-fact="rarity"] small').textContent,"Rarity");
  assert.equal(hero.querySelector('[data-ppbui-profile-fact="rarity"] strong').textContent,"Rare");
  assert.equal(hero.querySelectorAll("[data-ppbui-profile-meta] .ppbui-quality-badge").length,0,"selected upper metadata does not duplicate Rarity");
  assert.equal(hero.querySelector('[data-ppbui-profile-fact="gender"] strong').textContent,"Male");
  assert.equal(hero.querySelector('[data-ppbui-profile-fact="gender"] strong').dataset.genderTone,"male");
  assert.equal(hero.querySelector('[data-ppbui-profile-fact="nature"] strong').textContent,"Adamant");
  assert.equal(hero.querySelector('[data-ppbui-profile-fact="iv"] strong').textContent,"170/186");
  const choices=[...root.querySelectorAll("[data-ppbui-profile-choice]")];assert.equal(choices.length,3);assert.ok(choices.every(node=>node.querySelector("[data-ppbui-profile-choice-visual] img")),"every owned picker card is species-enriched so raw Backpack payloads do not degrade to text-only identity");
  const selectedChoice=root.querySelector('[data-ppbui-profile-choice][data-creature-id="bag-1"]'); assert.match(selectedChoice.querySelector("[data-ppbui-profile-choice-visual] img").src,/\/img\/rhydon\.png$/); assert.equal(selectedChoice.style.getPropertyValue("--ppbui-profile-element-color"),"#e2bf65");
  assert.deepEqual([...selectedChoice.children].map(node=>Object.keys(node.dataset)[0]),["ppbuiProfileChoiceVisual","ppbuiProfileChoiceName","ppbuiProfileChoiceElements","ppbuiProfileChoiceRarity","ppbuiProfileChoiceStats"],"Search/List card keeps Element and Rarity as independent layout objects");
  assert.equal(selectedChoice.querySelectorAll("[data-ppbui-profile-choice-element]").length,2,"list card keeps the two bordered Element icons before Rarity");
  assert.ok(selectedChoice.querySelector("[data-ppbui-profile-choice-rarity] .ppbui-quality-badge.quality-rare"),"Rarity remains canonical while detached from Element for independent placement");
  assert.equal(selectedChoice.querySelector("[data-ppbui-profile-choice-stats]").textContent,"Lv.42","Search/List keeps only Level and leaves IV to the selected dossier");
  assert.equal(selectedChoice.querySelector("[data-ppbui-profile-choice-quality]"),null,"Search/List omits Quality Number entirely");
  assert.doesNotMatch(selectedChoice.textContent,/Backpack|No Team/i,"source is intentionally absent from the normalized Search/List card");
  const css=s.doc.querySelector('style[data-ppbui-module="pokemon-profile"]').textContent;
  assert.match(css,/\[data-ppbui-profile-list\] \{[^}]*grid-auto-columns:108px/s,"approved Obsidian Search/List cards use the compact 108px width");
  assert.match(css,/\[data-ppbui-profile-choice\] \{[^}]*grid-template-columns:minmax\(0,1fr\)[^}]*grid-template-rows:repeat\(5,minmax\(20px,auto\)\)/s,"Search card gives its full 108px width to the single content track instead of truncating names in an unused second column");
  assert.match(css,/\[data-ppbui-profile-choice\] \{[^}]*justify-items:center;[^}]*text-align:center;/s,"every Search card object is centered inside the Pokémon card");
  assert.match(css,/\[data-ppbui-profile-choice-visual\] \{[^}]*grid-column:1;[^}]*grid-row:2;/s,"Search sprite occupies column 1 row 2");
  assert.match(css,/\[data-ppbui-profile-choice-name\] \{[^}]*grid-column:1;[^}]*grid-row:1;[^}]*text-align:center;/s,"Search name occupies row 1 and is centered");
  assert.match(css,/\[data-ppbui-profile-choice-elements\] \{[^}]*grid-column:1;[^}]*grid-row:3;[^}]*justify-content:center;/s,"Search Element occupies row 3 and is centered");
  assert.match(css,/\[data-ppbui-profile-choice-rarity\] \{[^}]*grid-column:1;[^}]*grid-row:4;[^}]*justify-content:center;/s,"Search Rarity occupies row 4 and is centered");
  assert.match(css,/\[data-ppbui-profile-choice-stats\] \{[^}]*grid-column:1;[^}]*grid-row:5;[^}]*text-align:center;/s,"Search level occupies row 5 and is centered");
  assert.match(css,/\[data-ppbui-profile-type\] \{[^}]*border:0!important;[^}]*background:transparent!important/s,"selected Element wrapper explicitly removes badge chrome");
  assert.match(css,/\[data-ppbui-profile-choice-element\], \[data-ppbui-profile-type-icon\], \[data-ppbui-profile-move-element\] \{[^}]*border:0!important;[^}]*background:transparent!important;/s,"Profile Element wrappers are layout-only and cannot draw a second semantic border");
  assert.match(css,/\[data-ppbui-profile-choice-element\] \.ppbui-element-icon,\s*\[data-ppbui-profile-type-icon\] \.ppbui-element-icon \{[^}]*width:20px!important;[^}]*min-width:20px!important;[^}]*height:20px!important;[^}]*min-height:20px!important;[^}]*flex-basis:20px!important;/s,"shared Element icon owns the exact 20px visual box instead of overflowing a smaller wrapper");
  assert.ok(types.every(node=>node.querySelector("[data-ppbui-profile-type-name]")),"selected Element name is a separate plain-text node outside the bordered icon");
  assert.match(css,/\[data-ppbui-profile-fact="gender"\] strong\[data-gender-tone="male"\][^{]*\{[^}]*--ppbui-accent-hi/s,"Male gender uses the non-Element cyan semantic");
  assert.match(css,/\[data-ppbui-profile-fact="gender"\] strong\[data-gender-tone="female"\][^{]*\{[^}]*--ppbui-danger-hi/s,"Female gender uses the existing salmon/pink semantic");
  const moves=[...root.querySelectorAll("[data-ppbui-profile-current] [data-ppbui-profile-move]")];assert.equal(moves.length,4);
  assert.deepEqual([...moves[0].children].map(node=>Object.keys(node.dataset)[0]),["ppbuiProfileMovePosition","ppbuiProfileMoveName","ppbuiProfileMoveMeta"],"move card keeps [Position] [Name] above its compact metadata row");
  assert.deepEqual([...moves[0].querySelector("[data-ppbui-profile-move-meta]").children].map(node=>Object.keys(node.dataset)[0]),["ppbuiProfileMoveElement","ppbuiProfileMoveCategory","ppbuiProfileMoveSeparator","ppbuiProfileMoveCooldown","ppbuiProfileMoveSeparator","ppbuiProfileMovePower"],"move metadata is one concatenated [Element] Type · Ns · PW row");
  assert.ok(moves.every(node=>node.querySelector("[data-ppbui-profile-move-element] .ppbui-element-icon")),"every configured move exposes its bordered Element icon");
  assert.deepEqual(moves.map(node=>node.querySelector("[data-ppbui-profile-move-category]").textContent),["Phys","Phys","Phys","Status"],"TYPE stays explicit and distinguishes Phys/Spec/status semantics");
  assert.deepEqual(moves.map(node=>node.querySelector("[data-ppbui-profile-move-power]").textContent),["100","100","120","1"],"Power is shown as the bare numeric value while retaining its accessible label");
  assert.deepEqual(moves.map(node=>node.querySelector("[data-ppbui-profile-move-cooldown]").textContent),["5s","4s","6s","8s"],"Cooldown stays concise as a numeric duration with unit only");
  assert.ok([...moves[0].querySelectorAll("[data-ppbui-profile-move-separator]")].every(node=>node.textContent==="·"&&node.getAttribute("aria-hidden")==="true"));
  assert.equal(moves[0].querySelector("[data-ppbui-profile-move-power]").getAttribute("aria-label"),"Power 100");
  assert.equal(moves[0].querySelector("[data-ppbui-profile-move-cooldown]").getAttribute("aria-label"),"Cooldown 5s");
  assert.equal(moves[0].querySelector("[data-ppbui-profile-move-position]").dataset.ppbuiProfileMovePriority,"true");
  assert.match(moves[0].querySelector("[data-ppbui-profile-move-position]").getAttribute("aria-label"),/^1\. Use as priority$/);
  assert.equal(moves[1].querySelector("[data-ppbui-profile-move-position]").dataset.ppbuiProfileMovePriority,"false");
  assert.equal(moves[3].querySelector("[data-ppbui-profile-move-threshold]").textContent,"75%","heal slot exposes its authoritative configured HP threshold");
  assert.equal(moves[3].querySelector("[data-ppbui-profile-move-threshold]").getAttribute("aria-label"),"Use when remaining HP ≤ 75%");
  assert.equal(moves[0].querySelector("[data-ppbui-profile-move-threshold]"),null,"non-heal moves do not invent a threshold cue");
  assert.match(css,/\[data-ppbui-profile-move-category\], \[data-ppbui-profile-move-cooldown\], \[data-ppbui-profile-move-separator\], \[data-ppbui-profile-move-power\], \[data-ppbui-profile-move-threshold\] \{[^}]*font:700 var\(--ppbui-font-size-meta\)\/1 var\(--ppbui-font-data\);/s,"all Move metadata text shares one line box so Power and heal threshold stay baseline-aligned");
  assert.match(css,/\[data-ppbui-profile-move-power\] \{[^}]*border:0;[^}]*background:transparent;[^}]*#ddc36f/s,"Power remains an inline gold numeric value without an extra chip");
  assert.doesNotMatch(css,/\[data-ppbui-profile-move-power\] \{[^}]*(?:min-height|padding):/s,"Power does not add its own vertical box geometry on top of the shared metadata line");
  assert.match(css,/\[data-ppbui-profile-move-threshold\] \{[^}]*#8fd29a/s,"heal threshold uses the requested light-green semantic");
  assert.match(css,/\[data-ppbui-profile-move-position\]\[data-ppbui-profile-move-priority="true"\] \{[^}]*border-color:#d2b45d!important;[^}]*background:#d2b45d!important;/s,"priority slots turn the number box gold");
  assert.match(css,/\[data-ppbui-profile-move-meta\] \{[^}]*display:flex;[^}]*white-space:nowrap;/s,"move metadata is a single compact inline row");
  assert.match(css,/\[data-ppbui-profile-move-category\], \[data-ppbui-profile-move-cooldown\], \[data-ppbui-profile-move-separator\] \{[^}]*--ppbui-text-muted/s,"Type, cooldown and separators retain neutral metadata treatment");
  assert.match(css,/\[data-ppbui-profile-move-list\] \{[^}]*minmax\(136px,1fr\)/s,"move rails keep the requested 136px card minimum");
  assert.match(css,/\[data-ppbui-profile-move-list\] \{[^}]*width:100%;[^}]*scrollbar-gutter:auto;/s,"move rails consume the full box width without reserving an idle scrollbar gutter");
  assert.match(css,/\[data-ppbui-pokemon-profile-window\] \{\s*--ppbui-bg-0:[^}]*--ppbui-scrollbar-size:8px;[^}]*overflow:hidden!important;/s,"Profile uses an 8px scrollbar and clips children to the rounded shell");
  assert.match(css,/\[data-ppbui-profile-main\] \{[^}]*padding:10px 2px 10px 10px!important;/s,"desktop content compensates the right scrollbar gutter instead of doubling the visible inset");
  assert.match(css,/@container \(max-width:519px\)[\s\S]*?\[data-ppbui-profile-main\] \{[^}]*padding:8px 0 8px 8px!important;/s,"narrow content keeps the same effective left/right visual inset after scrollbar compensation");
  assert.match(css,/\[data-ppbui-profile-section\] \{[^}]*gap:0!important;[^}]*border:1px solid #6b6543!important;[^}]*background:rgba\(35,44,46,.96\)!important;/s,"Profile sections use one readable outer card instead of stacked nested outlines");
  assert.match(css,/\[data-ppbui-profile-choice\] \{[^}]*border:0!important;[^}]*background:rgba\(35,44,46,.96\)!important;[^}]*\}\s*\[data-ppbui-profile-choice\]\[aria-pressed="true"\] \{[^}]*outline:1px solid #d2b45d/s,"picker cards rely on surface separation and reserve the semantic outline for the selected Pokémon");
  assert.match(css,/\[data-ppbui-profile-move\] \{[^}]*padding:5px!important;[^}]*border:0!important;[^}]*background:rgba\(22,29,32,.85\)!important;/s,"move rows use surface contrast rather than another full outline");
  assert.match(css,/\[data-ppbui-profile-saved\], \[data-ppbui-profile-team-row\] \{[^}]*padding:8px!important;[^}]*border:0!important;[^}]*background:rgba\(22,29,32,.85\)!important;/s,"Saved Movesets and Teams use contained value surfaces without border cages");
  assert.match(css,/\[data-ppbui-pokemon-profile-window\] \{\s*--ppbui-bg-0:rgba\(22,29,32,.85\);[^}]*--ppbui-bg-1:rgba\(22,29,32,.92\);[^}]*--ppbui-bg-2:rgba\(35,44,46,.96\);[^}]*--ppbui-border:#6b6543;[^}]*--ppbui-selected:#d2b45d;[^}]*border:1px solid #6b6543!important;[^}]*background:rgba\(22,29,32,.92\)!important;/s,"Profile applies the approved Game Palette with Values 85%, Window 92%, Interactive 96% and opaque 1px lines");
  assert.match(css,/\[data-ppbui-profile-hero\] \{[^}]*background:rgba\(35,44,46,.96\)!important;/s,"Hero uses the exported Interactive surface with alpha");
  assert.match(css,/\[data-ppbui-profile-current\] \{[^}]*background:rgba\(35,44,46,.96\)!important;/s,"Current Moves uses the exported Interactive surface with alpha");
  assert.match(css,/\.pokemon-card\[data-ppbui-profile-native-card\] \{[^}]*max-width:100%!important;[^}]*border:1px solid #6b6543!important;[^}]*border-radius:var\(--ppbui-radius\)!important;[^}]*background:rgba\(22,29,32,.92\)!important;/s,"native PokémonCard uses the approved Window alpha/1px line system, fixed native-aligned radius and cannot overflow its narrow parent");
  const saved=root.querySelector("[data-ppbui-profile-saved]"); assert.equal(saved.querySelector("[data-ppbui-profile-move-power]").textContent,"100","saved moves reuse current authoritative metadata without the removed PW prefix");
  assert.equal(saved.querySelector("[data-ppbui-profile-move-category]").textContent,"Phys");
  assert.equal(saved.querySelector("[data-ppbui-profile-move-cooldown]").textContent,"5s");
  await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("dup");
  assert.equal(root.querySelector('[data-ppbui-profile-fact="gender"] strong').dataset.genderTone,"female","female owned Pokémon receive the pink/salmon gender semantic");
  await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("team-1");
  assert.deepEqual([...root.querySelectorAll("[data-ppbui-profile-current] [data-ppbui-profile-move-category]")].slice(0,2).map(node=>node.textContent),["Spec","Spec"],"special attacks render the explicit Spec TYPE instead of being collapsed into a generic label");
});

test("Profile falls back to native PokémonCard detail metadata when moveset payload omits Power, Type or cooldown", async t => {
  const s=setup(t),strip=entry=>{const { power, category, cooldown_ms, ...rest }=entry;return rest;};
  s.dom.window.PokeIdle.Api.getMoveset=async id=>({creature_id:id,revision:3,mode:"manual",selected:currentMoves.map(strip),available:currentMoves.map(strip)});
  const savedOnly=[move("rock-slide","Rock Slide","rock",75,"physical",3000),move("drill-run","Drill Run","ground",80,"physical",4000),move("ice-fang","Ice Fang","ice",65,"physical",5000),move("protect","Protect","normal",0,"status",8000)];
  let detailCalls=0;s.dom.window.PokeIdle.PokemonCardData={async loadDetail(id){detailCalls++;assert.equal(id,"bag-1");return{moves:[...currentMoves,...savedOnly].map(entry=>({id:entry.id,move:{...entry}}))};}};
  await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1");const root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]");
  assert.equal(detailCalls,1);assert.deepEqual([...root.querySelectorAll("[data-ppbui-profile-current] [data-ppbui-profile-move-power]")].map(node=>node.textContent),["100","100","120","1"]);
  assert.deepEqual([...root.querySelectorAll("[data-ppbui-profile-current] [data-ppbui-profile-move-category]")].map(node=>node.textContent),["Phys","Phys","Phys","Status"]);
  assert.deepEqual([...root.querySelectorAll("[data-ppbui-profile-current] [data-ppbui-profile-move-cooldown]")].map(node=>node.textContent),["5s","4s","6s","8s"]);
  const boss=[...root.querySelectorAll("[data-ppbui-profile-saved]")].find(node=>/Boss/.test(node.textContent));assert.ok(boss);assert.deepEqual([...boss.querySelectorAll("[data-ppbui-profile-move-power]")].map(node=>node.textContent),["75","80","65","0"],"saved-only moves consume native detail power without the removed PW prefix");
  assert.deepEqual([...boss.querySelectorAll("[data-ppbui-profile-move-category]")].map(node=>node.textContent),["Phys","Phys","Phys","Status"]);
  assert.deepEqual([...boss.querySelectorAll("[data-ppbui-profile-move-cooldown]")].map(node=>node.textContent),["3s","4s","5s","8s"]);
});

test("Saved Movesets and Teams collapse independently and preserve state across Profile rerenders", async t => {
  const s=setup(t);await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1");let root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]");
  let savedToggle=root.querySelector('[data-ppbui-profile-collapse="savedMoves"]'),teamToggle=root.querySelector('[data-ppbui-profile-collapse="savedTeams"]');
  let savedBody=root.querySelector('[data-ppbui-profile-section-body="savedMoves"]'),teamBody=root.querySelector('[data-ppbui-profile-section-body="savedTeams"]');
  assert.equal(savedToggle.getAttribute("aria-expanded"),"true");assert.equal(teamToggle.getAttribute("aria-expanded"),"true");
  savedToggle.click();assert.equal(savedToggle.getAttribute("aria-expanded"),"false");assert.equal(savedBody.hidden,true);assert.equal(teamBody.hidden,false,"Saved Teams remains independent");
  teamToggle.click();assert.equal(teamToggle.getAttribute("aria-expanded"),"false");assert.equal(teamBody.hidden,true);
  await s.dom.window.__PPBUI_POKEMON_PROFILE__.refresh();root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]");savedToggle=root.querySelector('[data-ppbui-profile-collapse="savedMoves"]');teamToggle=root.querySelector('[data-ppbui-profile-collapse="savedTeams"]');savedBody=root.querySelector('[data-ppbui-profile-section-body="savedMoves"]');teamBody=root.querySelector('[data-ppbui-profile-section-body="savedTeams"]');
  assert.equal(savedToggle.getAttribute("aria-expanded"),"false");assert.equal(teamToggle.getAttribute("aria-expanded"),"false");assert.equal(savedBody.hidden,true);assert.equal(teamBody.hidden,true);
});

test("Configure Moves delegates the exact Profile creature to the native PokéPixel editor", async t => {
  const s=setup(t);await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1");const root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]"),configure=root.querySelector("[data-ppbui-profile-configure-moves]");
  assert.ok(configure);assert.equal(configure.disabled,false);assert.equal(configure.hasAttribute("aria-expanded"),false);assert.equal(configure.hasAttribute("aria-controls"),false);
  configure.click();
  assert.deepEqual(s.configureCalls,["bag-1"],"Configure Moves opens MovesetConfig for the exact Backpack creature");
  assert.equal(s.saveCalls.length,0,"Profile does not duplicate the game's move writer");
  assert.equal(root.querySelector("[data-ppbui-profile-move-editor]"),null,"Profile does not create a parallel move editor");
});

test("Configure Moves follows a rehydrated native MovesetConfig without retaining a stale owner", async t => {
  const s=setup(t);await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1");const configure=s.doc.querySelector("[data-ppbui-profile-configure-moves]");
  delete s.dom.window.PokeIdle.MovesetConfig;s.mounted.sync();assert.equal(configure.disabled,true);
  s.dom.window.PokeIdle.MovesetConfig={open(id){s.configureCalls.push(`rehydrated:${id}`);}};s.mounted.sync();assert.equal(configure.disabled,false);
  configure.click();assert.deepEqual(s.configureCalls,["rehydrated:bag-1"]);
});

test("Profile source filters keep same-species different creatures distinct and menu is a dedicated destination", async t => {
  const s=setup(t),menu=s.doc.querySelector('button[data-menu-id="pokemon-profile"]'); assert.ok(menu); assert.notEqual(menu.dataset.menuId,"profile","Trainer Profile native destination remains separate");
  const menuIcon=menu.querySelector(":scope > img.pokeidle-top-toolbar__icon");assert.ok(menuIcon,"Pokémon Profile menu uses its owned bitmap icon");assert.match(menuIcon.src,/\/assets\/menu-poke-profile-icon\.png$/);assert.equal(menuIcon.draggable,false);assert.equal(menuIcon.getAttribute("aria-hidden"),"true");
  await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("dup"); const root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]");
  assert.equal(root.querySelectorAll("[data-ppbui-profile-choice]").length,3);
  const choices=[...root.querySelectorAll("[data-ppbui-profile-choice]")];
  assert.ok(choices.every(node=>node.tagName==="BUTTON"&&node.getAttribute("role")===null),"selector choices keep native button semantics");
  assert.equal(choices.find(node=>node.dataset.creatureId==="dup").getAttribute("aria-pressed"),"true");
  assert.ok(choices.filter(node=>node.dataset.creatureId!=="dup").every(node=>node.getAttribute("aria-pressed")==="false"));
  root.querySelector('[data-ppbui-profile-sources] [data-source="backpack"]').click(); assert.equal(root.querySelectorAll("[data-ppbui-profile-choice]").length,1); assert.equal(root.querySelector("[data-ppbui-profile-choice]").dataset.creatureId,"bag-1");
  root.querySelector('[data-ppbui-profile-sources] [data-source="team"]').click(); assert.deepEqual([...root.querySelectorAll("[data-ppbui-profile-choice]")].map(node=>node.dataset.creatureId),["team-1","dup"]);
});

test("Profile discovery combines search with rarity, element, level range and canonical personal tags", async t => {
  const s=setup(t); await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1"); const root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]");
  const field=key=>root.querySelector(`[data-ppbui-profile-filter="${key}"]`), choices=()=>[...root.querySelectorAll("[data-ppbui-profile-choice]")].map(node=>node.dataset.creatureId);
  assert.deepEqual([...root.querySelectorAll("[data-ppbui-profile-filter]")].map(node=>node.dataset.ppbuiProfileFilter),["rarity","element","minLevel","maxLevel","tags"]);
  field("rarity").value="rare";field("rarity").dispatchEvent(new s.dom.window.Event("change"));
  field("element").value="ground";field("element").dispatchEvent(new s.dom.window.Event("change"));
  field("minLevel").value="40";field("minLevel").dispatchEvent(new s.dom.window.Event("input"));
  field("maxLevel").value="45";field("maxLevel").dispatchEvent(new s.dom.window.Event("input"));
  field("tags").value="boss";field("tags").dispatchEvent(new s.dom.window.Event("change"));
  assert.deepEqual(choices(),["bag-1"],"combined advanced filters keep the exact tagged Rhydon instance");
  const search=root.querySelector("[data-ppbui-profile-search]");search.value="gen";search.dispatchEvent(new s.dom.window.Event("input"));assert.deepEqual(choices(),[],"name search composes with advanced filters instead of replacing them");
  search.value="";search.dispatchEvent(new s.dom.window.Event("input"));root.querySelector("[data-ppbui-profile-filter-clear]").click();assert.deepEqual(choices(),["team-1","dup","bag-1"]);
  field("minLevel").value="80";field("minLevel").dispatchEvent(new s.dom.window.Event("input"));assert.deepEqual(choices(),["team-1"]);
  field("minLevel").value="0";field("minLevel").dispatchEvent(new s.dom.window.Event("input"));const minError=root.querySelector('[data-ppbui-profile-filter-error="minLevel"]');assert.equal(field("minLevel").getAttribute("aria-invalid"),"true");assert.equal(field("minLevel").getAttribute("aria-describedby"),minError.id);assert.equal(minError.hidden,false);assert.match(minError.textContent,/inteiro/i);assert.equal(root.querySelector("[data-ppbui-profile-filter-clear]").disabled,false);assert.deepEqual(choices(),["team-1","dup","bag-1"],"invalid visible level input must not leave the previous hidden range active");
  field("minLevel").value="1.5";field("minLevel").dispatchEvent(new s.dom.window.Event("input"));assert.equal(field("minLevel").getAttribute("aria-invalid"),"true");assert.equal(minError.hidden,false);assert.deepEqual(choices(),["team-1","dup","bag-1"]);
  root.querySelector("[data-ppbui-profile-filter-clear]").click();assert.equal(field("minLevel").value,"");assert.equal(field("minLevel").getAttribute("aria-invalid"),"false");assert.equal(minError.hidden,true);
  field("tags").value="untagged";field("tags").dispatchEvent(new s.dom.window.Event("change"));assert.deepEqual(choices(),["dup"],"untagged uses the shared canonical tag assignment store");
});

test("native PokémonCard compacts top status/actions, removes duplicate highlights, adds four move icons and opens exact Profile", async t => {
  const s=setup(t),native=installNativeCardRenderer(s),card=s.doc.createElement("aside");
  card.className="pokemon-card pokemon-card--pinned";s.doc.body.append(card);
  const creature=s.inventory.find(entry=>entry.id==="bag-1");
  s.dom.window.PokeIdle.PokemonCard.render(card,creature,{actions:[1,2,3]});
  await new Promise(resolve=>s.dom.window.setTimeout(resolve,30));
  assert.equal(native.calls(),1,"Better UI delegates to the native renderer exactly once");
  assert.equal(s.doc.querySelector("[data-ppbui-profile-hover]"),null,"Profile no longer creates a replacement hover surface");
  assert.ok(card.querySelector(".pokemon-tooltip__header"),"native card header remains the authoritative surface");
  const sale=[...card.querySelectorAll(".pokemon-card__cell")].find(node=>node.querySelector(".pokemon-card__cell-label")?.textContent==="SALE");
  const totalIv=[...card.querySelectorAll(".pokemon-card__cell")].find(node=>node.querySelector(".pokemon-card__cell-label")?.textContent==="TOTAL IV");
  const rarity=card.querySelector(".pokemon-card__cell.is-rarity");
  const powerCell=card.querySelector(".pokemon-card__cell.is-power");
  assert.equal(sale.hidden,true,"SALE is hidden rather than recreated");
  assert.equal(totalIv.hidden,true,"TOTAL IV highlight is hidden after its value moves beside Battle Stats");
  assert.equal(rarity.hidden,true,"RARITY highlight is removed from presentation because rarity already lives in the top badge row");
  assert.equal(powerCell.hidden,true,"the original Total Power cell is hidden after its value is promoted");
  assert.equal(card.querySelector(".pokemon-card__cells").hidden,true,"the now-empty native highlight grid leaves no residual gap");
  assert.match(s.doc.querySelector('style[data-ppbui-module="pokemon-profile"]').textContent,/\[data-ppbui-profile-native-hidden\] \{ display:none!important; \}/,"owned hidden cells must defeat the native card display rule");
  const promotedPower=card.querySelector("[data-ppbui-profile-native-power]");assert.equal(promotedPower.querySelector("[data-ppbui-profile-native-power-value]").textContent,"411");assert.equal(promotedPower.querySelector("[aria-hidden=true]").textContent,"⚡");assert.equal(promotedPower.querySelector("[data-ppbui-profile-native-sr]").textContent,"TOTAL POWER: ");assert.equal(promotedPower.hasAttribute("aria-label"),false,"Power accessibility comes from real DOM text instead of naming a generic span");
  assert.equal(card.querySelector('[data-ppbui-profile-native-status="active"]').textContent,"ACTIVE");
  assert.equal(card.querySelector('[data-ppbui-profile-native-status="active"]').title,"ACTIVE");
  assert.equal(card.querySelector('[data-ppbui-profile-native-status="locked"]').textContent,"PROTECTED");
  assert.equal(card.querySelector('[data-ppbui-profile-native-status="locked"]').getAttribute("aria-label"),"PROTECTED");
  const profileCss=s.doc.querySelector('style[data-ppbui-module="pokemon-profile"]').textContent;assert.doesNotMatch(profileCss,/⚔|🔒/,"compact status chrome uses CSS primitives rather than emoji interface icons");assert.match(profileCss,/data-ppbui-profile-native-status="locked"\]\:\:after/);
  assert.equal(card.querySelector("[data-ppbui-profile-native-iv]").textContent,"· IV 170/186");
  const moves=[...card.querySelectorAll("[data-ppbui-profile-native-move]")];
  assert.equal(moves.length,4);assert.deepEqual(moves.map(node=>node.querySelector("strong")?.textContent),currentMoves.map(entry=>entry.name));
  assert.ok(moves.every(node=>node.querySelector("img")?.getAttribute("src")?.includes("img/moves/")),"all four moves use the existing native move-icon path");
  const actions=card.querySelector(".pokemon-card__actions");
  assert.equal(actions.previousElementSibling,card.querySelector(".pokemon-tooltip__badges"),"native action row is moved directly below the top badges");
  assert.deepEqual([...actions.children].slice(0,3).map(node=>node.textContent),["EQUIP","LOCK","CHAT"],"native card actions stay intact");
  actions.children[0].click();assert.equal(native.actionClicks.get("EQUIP"),1,"moving the native action row preserves its original handlers");
  const profile=actions.querySelector("[data-ppbui-profile-native-profile]");assert.ok(profile);assert.equal(profile.textContent,"◆Profile");
  profile.click();await new Promise(resolve=>s.dom.window.setTimeout(resolve,30));
  const root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]");assert.equal(root.hidden,false);assert.equal(root.querySelector("[data-ppbui-profile-name]").textContent,"Rhydon");
});

test("native PokémonCard restores canonical DOM before delegating every rerender", async t => {
  const s=setup(t),native=installNativeCardRenderer(s),card=s.doc.createElement("aside");
  card.className="pokemon-card pokemon-card--pinned";s.doc.body.append(card);
  const creature=s.inventory.find(entry=>entry.id==="bag-1");
  s.dom.window.PokeIdle.PokemonCard.render(card,creature,{actions:[1,2,3]});
  await new Promise(resolve=>s.dom.window.setTimeout(resolve,20));
  assert.ok(card.hasAttribute("data-ppbui-profile-native-card"));
  s.dom.window.PokeIdle.PokemonCard.render(card,creature,{actions:[1,2,3]});
  await new Promise(resolve=>s.dom.window.setTimeout(resolve,20));
  assert.equal(native.calls(),2);
  assert.deepEqual(native.renderSnapshots[1],{decorated:false,actionsCanonical:true,hiddenOwned:0,compactStatuses:0},"native rerender must receive its original DOM/state before Better UI decorates the fresh result");
  assert.equal(card.querySelector(".pokemon-card__actions").previousElementSibling,card.querySelector(".pokemon-tooltip__badges"),"fresh rerender is decorated once after native ownership finishes");
});

test("native PokémonCard keeps native highlight notes when duplicate cells are removed", async t => {
  const s=setup(t);installNativeCardRenderer(s,{nativeNote:true});const card=s.doc.createElement("aside");
  card.className="pokemon-card pokemon-card--pinned";s.doc.body.append(card);
  s.dom.window.PokeIdle.PokemonCard.render(card,s.inventory.find(entry=>entry.id==="bag-1"),{actions:[1,2,3]});
  const highlights=card.querySelector(".pokemon-card__cells");
  assert.equal(highlights.hidden,false,"native Mastery/Starter notes keep their host section visible");
  assert.equal(highlights.querySelector(".pokemon-card__note").textContent,"MASTERY +10%");
  assert.ok([...highlights.querySelectorAll(".pokemon-card__cell")].every(node=>node.hidden),"only the duplicate highlight cells are removed");
});

test("native PokémonCard duplicate-highlight and Battle IV discovery follows localized native labels", t => {
  const s=setup(t);installNativeCardRenderer(s,{labels:{sale:"VENDA",power:"PODER TOTAL",iv:"IV TOTAL",rarity:"RARIDADE",battle:"ATRIBUTOS DE BATALHA"}});const card=s.doc.createElement("aside");
  card.className="pokemon-card pokemon-card--pinned";s.doc.body.append(card);
  s.dom.window.PokeIdle.PokemonCard.render(card,s.inventory.find(entry=>entry.id==="bag-1"),{actions:[1,2,3]});
  const byLabel=label=>[...card.querySelectorAll(".pokemon-card__cell")].find(node=>node.querySelector(".pokemon-card__cell-label")?.textContent===label);
  assert.equal(byLabel("VENDA").hidden,true);assert.equal(byLabel("IV TOTAL").hidden,true);assert.equal(byLabel("RARIDADE").hidden,true);
  assert.equal(card.querySelector("[data-ppbui-profile-native-iv]").textContent,"· IV 170/186");
  assert.equal(card.querySelector("[data-ppbui-profile-native-sr]").textContent,"PODER TOTAL: ");
});

test("Profile reconciles a replaced native PokemonCard owner without clobbering the previous owner", t => {
  const s=setup(t),native=installNativeCardRenderer(s),oldOwner=s.dom.window.PokeIdle.PokemonCard,oldCard=s.doc.createElement("aside");
  oldCard.className="pokemon-card pokemon-card--pinned";s.doc.body.append(oldCard);
  const capturedOldWrapper=oldOwner.render;
  oldOwner.render(oldCard,s.inventory.find(entry=>entry.id==="bag-1"),{actions:[1,2,3]});
  assert.ok(oldCard.hasAttribute("data-ppbui-profile-native-card"));
  let replacementCalls=0;
  const replacementRender=(container,creature)=>{
    replacementCalls++;
    container.replaceChildren();
    const header=s.doc.createElement("header");header.className="pokemon-tooltip__header";
    const badges=s.doc.createElement("div");badges.className="pokemon-tooltip__badges";
    container.append(header,badges);
    return creature;
  };
  const replacement={render:replacementRender};
  s.dom.window.PokeIdle.PokemonCard=replacement;
  s.mounted.sync();
  assert.equal(oldOwner.render,native.originalRender,"reconcile restores the old owner only while Better UI still owns its renderer");
  assert.equal(oldCard.hasAttribute("data-ppbui-profile-native-card"),false,"owner replacement releases existing decorated cards");
  assert.notEqual(replacement.render,replacementRender,"the current native owner is adopted");
  const next=s.doc.createElement("aside");next.className="pokemon-card pokemon-card--hover";s.doc.body.append(next);
  replacement.render(next,s.inventory.find(entry=>entry.id==="bag-1"),{});
  assert.equal(replacementCalls,1);assert.ok(next.hasAttribute("data-ppbui-profile-native-card"));
  const stale=s.doc.createElement("aside");stale.className="pokemon-card pokemon-card--pinned";s.doc.body.append(stale);
  capturedOldWrapper(stale,s.inventory.find(entry=>entry.id==="bag-1"),{actions:[1,2,3]});
  assert.equal(stale.hasAttribute("data-ppbui-profile-native-card"),false,"a wrapper captured from the replaced owner delegates native render but stays behaviorally inert");
});

test("Current Moves Retry preserves keyboard focus through rerender and lands on the refreshed region", async t => {
  const s=setup(t,{movesFailOnce:true}); await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1");
  const root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]"), current=root.querySelector("[data-ppbui-profile-current]"), retry=current.querySelector(":scope > button");
  assert.ok(retry,"failed Current Moves read exposes Retry"); retry.focus(); assert.equal(s.doc.activeElement,retry);
  retry.click();
  assert.equal(s.doc.activeElement,root.querySelector("[data-ppbui-profile-main]"),"focus is parked on the persistent main region before Retry replaces its button");
  await new Promise(resolve=>s.dom.window.setTimeout(resolve,30));
  const refreshed=root.querySelector("[data-ppbui-profile-current]");
  assert.equal(s.doc.activeElement,refreshed,"successful Retry restores focus to Current Moves instead of BODY");
  assert.equal(refreshed.querySelectorAll("[data-ppbui-profile-move]").length,4);
});

test("Saved Moveset mutations restore a logical keyboard target after rerender", async t => {
  const s=setup(t);await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1");const root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]");
  let input=root.querySelector("[data-ppbui-profile-preset-name]");input.value="Keyboard Save";input.focus();input.dispatchEvent(new s.dom.window.KeyboardEvent("keydown",{key:"Enter",bubbles:true}));await new Promise(resolve=>s.dom.window.setTimeout(resolve,40));
  input=root.querySelector("[data-ppbui-profile-preset-name]");assert.equal(s.doc.activeElement,input,"Enter-save restores focus to the replacement name input");

  let boss=root.querySelector('[data-ppbui-profile-saved][data-preset-id="m3"]'),apply=boss.querySelector('[data-ppbui-profile-saved-action="apply"]');apply.focus();apply.click();await new Promise(resolve=>s.dom.window.setTimeout(resolve,40));
  let focused=s.doc.activeElement;assert.ok(focused.matches("[data-ppbui-profile-saved-action]"));assert.equal(focused.closest("[data-ppbui-profile-saved]").dataset.presetId,"m3","Apply restores focus within the same preset, falling back when Apply becomes disabled");

  boss=root.querySelector('[data-ppbui-profile-saved][data-preset-id="m3"]');const update=boss.querySelector('[data-ppbui-profile-saved-action="update"]');update.focus();update.click();await new Promise(resolve=>s.dom.window.setTimeout(resolve,40));
  focused=s.doc.activeElement;assert.equal(focused.dataset.ppbuiProfileSavedAction,"update");assert.equal(focused.closest("[data-ppbui-profile-saved]").dataset.presetId,"m3");

  boss=root.querySelector('[data-ppbui-profile-saved][data-preset-id="m3"]');const remove=boss.querySelector('[data-ppbui-profile-saved-action="remove"]');remove.focus();remove.click();await new Promise(resolve=>s.dom.window.setTimeout(resolve,40));
  assert.equal(root.querySelector('[data-ppbui-profile-saved][data-preset-id="m3"]'),null);focused=s.doc.activeElement;assert.ok(focused.matches("[data-ppbui-profile-saved-action]"),"Delete moves focus to a surviving preset action");assert.equal(focused.closest("[data-ppbui-profile-saved]").dataset.presetId,"m1");
});

test("closing Profile during async open invalidates pending render and cannot steal restored focus", async t => {
  const s=setup(t),pending=new Map();let moveReads=0;const nativeMoves=s.dom.window.PokeIdle.Api.getMoveset;
  s.dom.window.PokeIdle.Api.getCreatures=location=>new Promise(resolve=>pending.set(location,resolve));s.dom.window.PokeIdle.Api.getMoveset=async id=>{moveReads++;return nativeMoves(id);};
  const origin=s.doc.querySelector("#external");origin.focus();const opening=s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1",origin);
  for(let attempt=0;attempt<20&&pending.size<2;attempt++)await Promise.resolve();
  s.dom.window.__PPBUI_POKEMON_PROFILE__.close();assert.equal(s.doc.activeElement,origin);
  pending.get("team")?.({data:s.team.map(entry=>({...entry}))});pending.get("inventory")?.({data:s.inventory.map(entry=>({...entry}))});await opening;
  const root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]");assert.equal(root.hidden,true);assert.equal(root.querySelector("[data-ppbui-profile-name]"),null,"stale open completion does not render a hidden dossier");assert.equal(s.doc.activeElement,origin,"stale open completion cannot focus hidden content");assert.equal(moveReads,0,"cancelled open stops before Current Moves work");
});

test("native transient hover is augmented in place without inventing an interactive replacement card", async t => {
  const s=setup(t);installNativeCardRenderer(s);const hover=s.doc.createElement("aside");hover.className="pokemon-card pokemon-card--hover";s.doc.body.append(hover);
  s.dom.window.PokeIdle.PokemonCard.render(hover,s.inventory.find(entry=>entry.id==="bag-1"),{});
  await new Promise(resolve=>s.dom.window.setTimeout(resolve,30));
  assert.ok(hover.hasAttribute("data-ppbui-profile-native-card"));
  assert.equal(hover.querySelectorAll("[data-ppbui-profile-native-move]").length,4);
  assert.equal(hover.querySelector("[data-ppbui-profile-native-profile]"),null,"transient native hover stays read-only because the game hides it on pointerleave");
  assert.equal(s.doc.querySelector("[data-ppbui-profile-hover]"),null);
});

test("Profile close and Escape restore contextual focus, with the dedicated launcher as disconnected-origin fallback", async t => {
  const s=setup(t);installNativeCardRenderer(s);const card=s.doc.createElement("aside");card.className="pokemon-card pokemon-card--pinned";s.doc.body.append(card);
  s.dom.window.PokeIdle.PokemonCard.render(card,s.inventory.find(entry=>entry.id==="bag-1"),{actions:[1,2,3]});
  await new Promise(resolve=>s.dom.window.setTimeout(resolve,30));
  const cta=card.querySelector("[data-ppbui-profile-native-profile]");cta.focus();cta.click();await new Promise(resolve=>s.dom.window.setTimeout(resolve,30));
  const root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]"); assert.equal(root.hidden,false);
  root.querySelector("[data-ppbui-profile-close]").click(); assert.equal(root.hidden,true); assert.equal(s.doc.activeElement,cta,"X returns focus to the native PokémonCard Profile action");

  const target=s.doc.querySelector("#external");
  await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1",target); target.remove();
  s.doc.dispatchEvent(new s.dom.window.KeyboardEvent("keydown",{key:"Escape",bubbles:true}));
  assert.equal(root.hidden,true); assert.equal(s.doc.activeElement,s.doc.querySelector('button[data-menu-id="pokemon-profile"]'),"Escape falls back to the dedicated Profile launcher when the origin is gone");
});

test("Profile leaves native PokémonCard slot hover listeners untouched instead of suppressing them", t => {
  const s=setup(t),target=s.doc.querySelector("#external");target.__pokeIdleCardBound=true;let enters=0;
  target.addEventListener("pointerenter",()=>enters++);
  target.dispatchEvent(new s.dom.window.Event("pointerenter",{bubbles:false}));
  assert.equal(enters,1);assert.equal(s.doc.querySelector("[data-ppbui-profile-hover]"),null);
});

test("legacy disable-hover marker does not create a second hover and dedicated Profile remains usable", async t => {
  const s=setup(t);s.doc.body.setAttribute("data-ppbui-pokemon-hover-disabled","");
  assert.equal(s.doc.querySelector("[data-ppbui-profile-hover]"),null);
  await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1"); assert.equal(s.doc.querySelector("[data-ppbui-pokemon-profile-window]").hidden,false);
});

test("explicit invalid contextual open fails closed instead of showing a different owned Pokémon", async t => {
  const s=setup(t); await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("missing-creature");
  const root=s.doc.querySelector("[data-ppbui-pokemon-profile-window]"); assert.equal(root.querySelector("[data-ppbui-profile-name]"),null); assert.match(root.querySelector("[data-ppbui-profile-status]").textContent,/Nenhum Pokémon/);
});

test("Profile uses the injected canonical Saved Team store without reloading away session-only state", async t => {
  const s=setup(t); s.mounted.cleanup();
  let reloads=0; const canonical={
    list:()=>[{id:"session",name:"Session Team",activeId:"bag-1",orderVerified:true,updatedAt:9,members:[{id:"bag-1",name:"Rhydon"}]}],
    reload(){reloads++;throw new Error("must not reload canonical shared store");},
  };
  const mounted=mountPokemonProfile(s.doc,{teamPresetStore:canonical}); t.after(()=>mounted.cleanup());
  await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1");
  assert.equal(reloads,0); assert.match(s.doc.querySelector("[data-ppbui-profile-team-list]").textContent,/Session Team/);
});

test("moveset.saved shares one fresh native read between Profile and native PokémonCard", async t => {
  const s=setup(t),nativeRead=s.dom.window.PokeIdle.Api.getMoveset;let reads=0;
  s.dom.window.PokeIdle.Api.getMoveset=async id=>{reads++;const response=await nativeRead(id);return id==="bag-1"?{...response,selected:response.selected.map((entry,index)=>index===0?{...entry,name:`Earthquake v${reads}`}:entry)}:response;};
  await s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1");assert.equal(reads,1);
  installNativeCardRenderer(s);const card=s.doc.createElement("aside");card.className="pokemon-card pokemon-card--pinned";s.doc.body.append(card);s.dom.window.PokeIdle.PokemonCard.render(card,s.inventory.find(entry=>entry.id==="bag-1"),{actions:[1]});await new Promise(resolve=>s.dom.window.setTimeout(resolve,20));assert.equal(reads,1,"native card reuses the current Profile moves snapshot");
  s.dom.window.PokeIdle.Bus.emit("moveset.saved",{creature_id:"bag-1"});await new Promise(resolve=>s.dom.window.setTimeout(resolve,50));
  assert.equal(reads,2,"one invalidation creates exactly one fresh authoritative moves read for both consumers");
  assert.equal(s.doc.querySelector("[data-ppbui-profile-current] [data-ppbui-profile-move-name]").textContent,"Earthquake v2");
  assert.equal(card.querySelector("[data-ppbui-profile-native-move] strong").textContent,"Earthquake v2");
});

test("newer native-card move hydration wins when requests resolve out of order", async t => {
  const s=setup(t),pending=[];s.dom.window.PokeIdle.Api.getMoveset=id=>new Promise(resolve=>pending.push({id,resolve}));
  installNativeCardRenderer(s);const card=s.doc.createElement("aside");card.className="pokemon-card pokemon-card--pinned";s.doc.body.append(card);s.dom.window.PokeIdle.PokemonCard.render(card,s.inventory.find(entry=>entry.id==="bag-1"),{actions:[1]});
  await Promise.resolve();s.dom.window.PokeIdle.Bus.emit("moveset.saved",{creature_id:"bag-1"});for(let attempt=0;attempt<20&&pending.length<2;attempt++)await Promise.resolve();assert.equal(pending.length,2);
  const snapshot=name=>({creature_id:"bag-1",revision:3,mode:"manual",selected:currentMoves.map((entry,index)=>index===0?{...entry,name}:entry),available:[...currentMoves]});
  pending[1].resolve(snapshot("NEW"));await new Promise(resolve=>s.dom.window.setTimeout(resolve,25));assert.equal(card.querySelector("[data-ppbui-profile-native-move] strong").textContent,"NEW");
  pending[0].resolve(snapshot("OLD"));await new Promise(resolve=>s.dom.window.setTimeout(resolve,25));assert.equal(card.querySelector("[data-ppbui-profile-native-move] strong").textContent,"NEW","stale hydration cannot overwrite a newer same-card generation");
});

test("native card async move hydration cannot invalidate newer Profile selection and cleanup restores renderer/card DOM", async t => {
  let resolveTeam; const delay=id=>id==="team-1"?new Promise(resolve=>{resolveTeam=resolve;}):Promise.resolve(); const s=setup(t,{movesDelay:delay}),native=installNativeCardRenderer(s),card=s.doc.createElement("aside");card.className="pokemon-card pokemon-card--pinned";s.doc.body.append(card);
  s.dom.window.PokeIdle.PokemonCard.render(card,s.team.find(entry=>entry.id==="team-1"),{actions:[1,2,3]});await Promise.resolve();
  const opening=s.dom.window.__PPBUI_POKEMON_PROFILE__.open("bag-1"); await new Promise(resolve=>s.dom.window.setTimeout(resolve,10)); resolveTeam?.(); await opening;
  assert.equal(s.doc.querySelector("[data-ppbui-profile-name]").textContent,"Rhydon","native card hydration for another creature cannot supersede Profile selection");
  s.mounted.cleanup();
  assert.equal(s.dom.window.PokeIdle.PokemonCard.render,native.originalRender,"cleanup restores the renderer it wrapped");
  assert.equal(s.dom.window.__PPBUI_POKEMON_PROFILE__,undefined);assert.equal(s.doc.querySelector('[data-menu-id="pokemon-profile"]'),null);assert.equal(s.doc.querySelector("[data-ppbui-pokemon-profile-window]"),null);
  assert.equal(card.hasAttribute("data-ppbui-profile-native-card"),false);assert.equal(card.querySelector("[data-ppbui-profile-native-owned]"),null);
  assert.equal(card.querySelector(".pokemon-card__cell.is-power")?.hidden,false);assert.equal([...card.querySelectorAll(".pokemon-card__cell")].find(node=>node.querySelector(".pokemon-card__cell-label")?.textContent==="SALE")?.hidden,false);
  assert.equal([...card.querySelectorAll(".pokemon-card__cell")].find(node=>node.querySelector(".pokemon-card__cell-label")?.textContent==="TOTAL IV")?.hidden,false);
  assert.equal(card.querySelector(".pokemon-card__cell.is-rarity")?.hidden,false);
  assert.equal(card.querySelector(".pokemon-card__cells")?.hidden,false,"cleanup restores the native highlight grid");
  assert.equal(card.querySelector("[data-ppbui-profile-native-status]"),null,"cleanup removes compact-status ownership from native badges");
  assert.equal(card.lastElementChild?.classList.contains("pokemon-card__actions"),true,"cleanup returns the native action row to its original bottom position");
});

test("PokemonCard renderer wrapper is composable and a captured stale wrapper is inert after cleanup", async t => {
  const s=setup(t),native=installNativeCardRenderer(s),ownedWrapper=s.dom.window.PokeIdle.PokemonCard.render;
  const foreign=function(...args){return ownedWrapper.apply(this,args);};
  s.dom.window.PokeIdle.PokemonCard.render=foreign;
  s.mounted.cleanup();
  assert.equal(s.dom.window.PokeIdle.PokemonCard.render,foreign,"cleanup must not overwrite a renderer installed later by another owner");
  const card=s.doc.createElement("aside");card.className="pokemon-card pokemon-card--pinned";s.doc.body.append(card);
  foreign(card,s.inventory.find(entry=>entry.id==="bag-1"),{actions:[1,2,3]});
  await new Promise(resolve=>s.dom.window.setTimeout(resolve,20));
  assert.equal(native.calls(),1,"captured wrapper still delegates to the native renderer once");
  assert.equal(card.hasAttribute("data-ppbui-profile-native-card"),false,"captured PPBUI wrapper performs no decoration after cleanup");
  assert.equal(card.querySelector("[data-ppbui-profile-native-owned]"),null);
});
