import { mountPokemonProfile } from "../../src/modules/pokemon-profile/controller.js";

const params = new URLSearchParams(location.search), hoverMode = params.has("hover"), scrollMode = params.has("scroll"), errorMode = params.has("error"), emptyMode = params.has("empty"), filterMode = params.has("filters"), configureMode = params.has("configure"), collapseMode = params.get("collapse") || "", previewId = params.get("id") || "bag-1", cornerMode = params.get("corners") === "rounded" ? "rounded" : "square";
document.documentElement.dataset.ppbuiCorners = cornerMode;
const svg = (label,bg,fg="#ebecdc") => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" shape-rendering="crispEdges"><rect width="96" height="96" fill="#161d20"/><rect x="8" y="8" width="80" height="80" fill="${bg}"/><rect x="20" y="20" width="56" height="56" fill="#232c2e"/><text x="48" y="55" text-anchor="middle" fill="${fg}" font-family="Segoe UI,Arial,sans-serif" font-size="16" font-weight="700">${label}</text></svg>`)}`;
const sprites = { rhydon:svg("RHY","#b8b095"), gengar:svg("GEN","#735797"), gyarados:svg("GYA","#2485a6"), dragonite:svg("DRA","#e3c054"), snorlax:svg("SNO","#284261"), donphan:svg("DON","#878573") };
const elementColors={ground:"#e2bf65",rock:"#b6a136",bug:"#a6b91a",fighting:"#c22e28",ghost:"#735797",poison:"#a33ea1",psychic:"#f95587",normal:"#a8a77a",water:"#6390f0",flying:"#a98ff3",dragon:"#6f35fc",ice:"#96d9d6"};
const elementIcon=element=>svg(String(element||"?").slice(0,2).toUpperCase(),elementColors[element]||"#585761","#16161a");
const moveIcon=(label,element)=>svg(label,elementColors[element]||"#585761","#16161a");
document.querySelectorAll("[data-demo]").forEach(img=>img.src=sprites[img.dataset.demo]);

const team = [
  { id:"team-1",name:"Gengar",species_id:"gengar",level:85,power:518,hp:212,max_hp:212,quality:"legendary",quality_multiplier:2.15,iv_total:174,gender:"male",nature:"timid",elements:["ghost","poison"],sprite:sprites.gengar },
  { id:"team-2",name:"Gyarados",species_id:"gyarados",level:128,power:604,hp:276,max_hp:301,quality:"rare",quality_multiplier:1.42,iv_total:168,gender:"male",nature:"adamant",elements:["water","flying"],sprite:sprites.gyarados },
  { id:"team-3",name:"Dragonite",species_id:"dragonite",level:155,power:641,hp:244,max_hp:267,quality:"epic",quality_multiplier:1.82,iv_total:176,gender:"female",nature:"jolly",elements:["dragon","flying"],sprite:sprites.dragonite },
];
const inventory = [
  { id:"bag-1",name:"Rhydon",species_id:"rhydon",level:197,power:582,hp:318,max_hp:352,quality:"epic",quality_multiplier:1.73,iv_total:171,gender:"male",nature:"adamant",elements:["ground","rock"],sprite:sprites.rhydon },
  { id:"bag-2",name:"Snorlax",species_id:"snorlax",level:166,power:557,hp:402,max_hp:402,quality:"rare",quality_multiplier:1.38,iv_total:163,gender:"male",nature:"careful",elements:["normal"],sprite:sprites.snorlax },
  { id:"bag-3",name:"Donphan",species_id:"donphan",level:142,power:533,hp:231,max_hp:250,quality:"rare",quality_multiplier:1.31,iv_total:159,gender:"female",nature:"impish",elements:["ground"],sprite:sprites.donphan },
];
const moveSets = {
  "bag-1":[{id:"earthquake",name:"Earthquake",element:"ground",power:100,category:"physical",cooldown_ms:5000},{id:"stone-edge",name:"Stone Edge",element:"rock",power:100,category:"physical",cooldown_ms:4000},{id:"megahorn",name:"Megahorn",element:"bug",power:120,category:"physical",cooldown_ms:6000},{id:"recover",name:"Recover",element:"normal",power:1,category:"status",cooldown_ms:8000,effect_kind:"heal",heal_percent:50}],
  "team-1":[{id:"shadow-ball",name:"Shadow Ball",element:"ghost",power:80,category:"special",cooldown_ms:4000},{id:"sludge-wave",name:"Sludge Wave",element:"poison",power:95,category:"special",cooldown_ms:5000},{id:"hypnosis",name:"Hypnosis",element:"psychic",power:0,category:"status",cooldown_ms:7000},{id:"focus-blast",name:"Focus Blast",element:"fighting",power:120,category:"special",cooldown_ms:6000}],
};
const fallback=[{id:"body-slam",name:"Body Slam",element:"normal",power:85,category:"physical",cooldown_ms:4000},{id:"protect",name:"Protect",element:"normal",power:0,category:"status",cooldown_ms:8000},{id:"rest",name:"Rest",element:"psychic",power:0,category:"status",cooldown_ms:10000},{id:"facade",name:"Facade",element:"normal",power:70,category:"physical",cooldown_ms:4000}];
const savedOnly=[{id:"rock-slide",name:"Rock Slide",element:"rock",power:75,category:"physical",cooldown_ms:3000},{id:"drill-run",name:"Drill Run",element:"ground",power:80,category:"physical",cooldown_ms:4000},{id:"ice-fang",name:"Ice Fang",element:"ice",power:65,category:"physical",cooldown_ms:5000}];
const listeners=new Map();
window.PokeIdle={
  Localization:{get:()=>"pt-BR"}, DittoDisplayName:{get:c=>c.name}, Auth:{getTrainerSummary:()=>({id:"preview-trainer"})},
  ElementIcons:{definition:element=>({label:String(element||""),color:elementColors[element]||"#878573"}),create(element){const image=document.createElement("img");image.src=elementIcon(element);return image;}},
  t:key=>{const quality=key.match(/^common\.quality_m\.(.+)$/)?.[1],element=key.match(/^common\.element\.(.+)$/)?.[1];if(key==="pokemon_card.sale")return"SALE";if(key==="creature_details.total_power")return"TOTAL POWER";if(key==="pokemon_card.iv_total")return"TOTAL IV";if(key==="pokemon_card.rarity")return"RARITY";if(key==="creature_details.battle_stats")return"BATTLE STATS";if(key==="moveset.priority")return"Use as priority";if(key==="moveset.heal_threshold")return"Use when remaining HP ≤";return quality?(quality.charAt(0).toUpperCase()+quality.slice(1)):element?(element.charAt(0).toUpperCase()+element.slice(1)):key;},
  Bus:{on(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},off(name,fn){listeners.get(name)?.delete(fn);},emit(name,data){for(const fn of listeners.get(name)||[])fn(data);}},
  PokemonCard:{render(container,creature,options={}){container.replaceChildren();const header=document.createElement("header");header.className="pokemon-tooltip__header";const portrait=document.createElement("div");portrait.className="pokemon-tooltip__portrait";const image=document.createElement("img");image.src=creature.sprite||sprites[creature.species_id]||"";portrait.append(image);const identity=document.createElement("div");identity.className="pokemon-tooltip__identity";const name=document.createElement("strong");name.className="pokemon-tooltip__name";name.textContent=creature.name;const species=document.createElement("small");species.textContent=creature.species_id;identity.append(name,species);header.append(portrait,identity);const badges=document.createElement("div");badges.className="pokemon-tooltip__badges";const badge=(text,cls="")=>{const node=document.createElement("span");node.className=("pokemon-tooltip__badge "+cls).trim();node.textContent=text;return node;};badges.append(badge("LEVEL "+creature.level,"is-level"),badge("EPIC ×"+Number(creature.quality_multiplier||1).toFixed(2),"is-quality"),badge("ACTIVE","is-active"),badge("PROTECTED","is-locked"));const meters=document.createElement("div");meters.className="pokemon-card__meters";const meter=(label,value,pct)=>{const node=document.createElement("div");node.className="pokemon-card__meter";const head=document.createElement("div");head.className="pokemon-card__meter-head";head.innerHTML="<span>"+label+"</span><b>"+value+"</b>";const track=document.createElement("div");track.className="pokemon-card__track";const fill=document.createElement("i");fill.style.width=pct+"%";track.append(fill);node.append(head,track);return node;};meters.append(meter("HP",creature.hp+"/"+creature.max_hp,creature.hp/creature.max_hp*100),meter("EXPERIENCE","42% to next level",42));const cells=document.createElement("div");cells.className="pokemon-card__cells";const cell=(label,value,cls="")=>{const node=document.createElement("div");node.className=("pokemon-card__cell "+cls).trim();const caption=document.createElement("span");caption.className="pokemon-card__cell-label";caption.textContent=label;const strong=document.createElement("b");strong.className="pokemon-card__cell-value";strong.textContent=value;node.append(caption,strong);return node;};cells.append(cell("TOTAL POWER",String(creature.power),"is-power"),cell("TOTAL IV",(creature.iv_total||0)+"/186"),cell("SALE","2.970 dólares"),cell("RARITY","×1.49 / ×1.54","is-rarity"));const mastery=document.createElement("small");mastery.className="pokemon-card__note is-mastery";mastery.textContent="⚔ ELEMENT MASTERY +0.42% ATK";cells.append(mastery);const stats=document.createElement("section");stats.className="pokemon-card__section";const statTitle=document.createElement("h4");statTitle.className="pokemon-card__title";statTitle.textContent="BATTLE STATS";const rows=document.createElement("div");rows.className="pokemon-card__rows";for(const values of [[["HP","76"],["ATK","15"],["SP.ATK","15"]],[["DEF","14"],["SP.DEF","14"],["SPD","16"]]]){const col=document.createElement("div");col.className="pokemon-card__rows-col";for(const [label,value]of values){const row=document.createElement("div");row.className="pokemon-card__row";row.innerHTML="<span>"+label+"</span><b>"+value+"</b>";col.append(row);}rows.append(col);}stats.append(statTitle,rows);container.append(header,badges,meters,cells,stats);if(options.actions?.length){const actions=document.createElement("div");actions.className="pokemon-card__actions";const labels=options.actions.length>=5?["EQUIP","LOCK","CHAT","AWK","TM"]:["EQUIP","LOCK","CHAT"];for(const label of labels){const action=document.createElement("button");action.type="button";action.className="pokemon-card__action";action.textContent=label;actions.append(action);}container.append(actions);}return creature;}},
  PokemonCardData:{async loadDetail(id){const creature=[...team,...inventory].find(entry=>entry.id===id);return{creature:creature?{...creature}:null,moves:[...(moveSets[id]||moveSets["bag-1"]),...fallback,...savedOnly].map(entry=>({id:entry.id,move:{...entry}}))};}},
  Api:{
    async getTeam(){return{team:{member_ids:team.map(x=>x.id),leader_id:"team-1"}};},
    async getCreatures(location){return{data:(location==="team"?team:inventory).map(x=>({...x}))};},
    async getSpecies(id){return{id,name:id,normal_sprite_url:sprites[id]||""};},
    async getMoveset(id){if(errorMode&&id==="bag-1")throw new Error("preview moves error");const selected=emptyMode&&id==="bag-1"?[]:(moveSets[id]||fallback);return{creature_id:id,revision:4,mode:"manual",selected,available:[...selected,...fallback],slot_settings:id==="bag-1"?[{use_as_priority:true,heal_threshold_pct:75},{use_as_priority:false,heal_threshold_pct:75},{use_as_priority:false,heal_threshold_pct:75},{use_as_priority:false,heal_threshold_pct:75}]:[]};},
    async saveMoveset(id,payload){const all=[...(moveSets[id]||fallback),...fallback];return{creature_id:id,revision:5,mode:"manual",selected:payload.move_ids.map(moveId=>all.find(move=>move.id===moveId)).filter(Boolean),available:all,slot_settings:payload.slot_settings||[]};},
  },
};
window.POKEIDLE_MOVE_ICON_MAP={
  earthquake:moveIcon("EQ","ground"),"stone-edge":moveIcon("SE","rock"),megahorn:moveIcon("MH","bug"),recover:moveIcon("RE","normal"),
  "shadow-ball":moveIcon("SB","ghost"),"sludge-wave":moveIcon("SW","poison"),hypnosis:moveIcon("HY","psychic"),"focus-blast":moveIcon("FB","fighting"),
  "body-slam":moveIcon("BS","normal"),protect:moveIcon("PR","normal"),rest:moveIcon("RE","psychic"),facade:moveIcon("FA","normal"),
  "rock-slide":moveIcon("RS","rock"),"drill-run":moveIcon("DR","ground"),"ice-fang":moveIcon("IF","ice"),
};
window.confirm=()=>true;
localStorage.removeItem("ppbui:team-movesets:v1");localStorage.removeItem("ppbui:team-presets:v2");
localStorage.setItem("ppbui:pokemon-tags:v2:preview-trainer",JSON.stringify({assigned:{"bag-1":["boss"],"team-1":["pve"],"bag-2":["farm"]}}));
if(!emptyMode)localStorage.setItem("ppbui:team-movesets:v1",JSON.stringify([
  {id:"m1",creatureId:"bag-1",name:"Hunt",marker:1,moves:moveSets["bag-1"],createdAt:1,updatedAt:1},
  {id:"m2",creatureId:"bag-1",name:"Boss",marker:2,moves:[{id:"rock-slide",name:"Rock Slide",element:"rock"},{id:"drill-run",name:"Drill Run",element:"ground"},{id:"ice-fang",name:"Ice Fang",element:"ice"},{id:"protect",name:"Protect",element:"normal"}],createdAt:2,updatedAt:2},
]));
if(!emptyMode)localStorage.setItem("ppbui:team-presets:v2",JSON.stringify([
  {id:"t1",name:"Main Hunt",activeId:"bag-1",orderVerified:true,updatedAt:2,members:[{id:"bag-1",name:"Rhydon",sprite:sprites.rhydon},{id:"team-2",name:"Gyarados",sprite:sprites.gyarados},{id:"team-1",name:"Gengar",sprite:sprites.gengar},{id:"team-3",name:"Dragonite",sprite:sprites.dragonite},{id:"bag-2",name:"Snorlax",sprite:sprites.snorlax},{id:"bag-3",name:"Donphan",sprite:sprites.donphan}]},
  {id:"t2",name:"Boss Route",activeId:"team-1",orderVerified:true,updatedAt:1,members:[{id:"team-1",name:"Gengar",sprite:sprites.gengar},{id:"bag-1",name:"Rhydon",sprite:sprites.rhydon},{id:"team-3",name:"Dragonite",sprite:sprites.dragonite}]},
]));
const mounted=mountPokemonProfile(document);
(async()=>{
  if(hoverMode){
    for(const selector of [".pokeidle-top-toolbar",".preview-note",".demo-grid"]){
      const node=document.querySelector(selector);
      if(node)node.style.display="none";
    }
    const card=document.createElement("aside");
    card.className="pokemon-card pokemon-card--pinned";
    document.body.append(card);
    window.PokeIdle.PokemonCard.render(card,inventory[0],{actions:[1,2,3,4,5]});
    if(scrollMode){
      card.style.maxHeight="470px";
      card.style.overflowY="auto";
    }
    const genetics=document.createElement("section");
    genetics.className="pokemon-card__section";
    const geneticsTitle=document.createElement("h4");
    geneticsTitle.className="pokemon-card__title";
    geneticsTitle.textContent="GENETICS";
    const geneticsRows=document.createElement("div");
    geneticsRows.className="pokemon-card__rows";
    const geneticColumn=document.createElement("div");
    geneticColumn.className="pokemon-card__rows-col";
    for(const [label,value] of [["Nature","Adamant"],["Gain/loss","▲ Attack · ▼ Sp. Atk"],["Gender","Male ♂"],["Gain/loss","▲ Attack +10% · ▼ Sp. Atk +10%"]]){
      const row=document.createElement("div");
      row.className="pokemon-card__row";
      const key=document.createElement("span");
      key.textContent=label;
      const val=document.createElement("b");
      val.textContent=value;
      row.append(key,val);
      geneticColumn.append(row);
    }
    geneticsRows.append(geneticColumn);
    genetics.append(geneticsTitle,geneticsRows);
    card.append(genetics);
  }else {await window.__PPBUI_POKEMON_PROFILE__.open(previewId);if(filterMode){const set=(key,value,event="change")=>{const input=document.querySelector(`[data-ppbui-profile-filter="${key}"]`);input.value=value;input.dispatchEvent(new Event(event,{bubbles:true}));};set("rarity","epic");set("minLevel","150","input");set("tags","boss");}if(configureMode)document.querySelector("[data-ppbui-profile-configure-moves]")?.click();if(collapseMode){for(const key of collapseMode.split(","))document.querySelector(`[data-ppbui-profile-collapse="${key}"]`)?.click();}}
  setTimeout(()=>{
    const root=document.querySelector("[data-ppbui-pokemon-profile-window]"),body=root?.querySelector("[data-ppbui-profile-body]"),hover=document.querySelector(".pokemon-card--pinned");
    const moves=[...document.querySelectorAll("[data-ppbui-profile-current] [data-ppbui-profile-move-position]")].map(node=>node.textContent);
    document.title=`PokÃ©mon Profile ${hoverMode?"native-card":errorMode?"error":emptyMode?"empty":filterMode?"filters":configureMode?"configure":collapseMode?"collapsed":"profile"} Â· ${root?.clientWidth||0}/${root?.scrollWidth||0} Â· ${body?.clientWidth||0}/${body?.scrollWidth||0} Â· moves:${moves.join(",")} Â· native-card:${hover?"shown":"none"}`;
    window.__PROFILE_PREVIEW_MOUNTED__=mounted;
  },80);
})();
