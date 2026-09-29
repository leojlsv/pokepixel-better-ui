export const fixedTags = Object.freeze([
  ["leveling","Leveling","^","#c3d5c7"], ["pvp","PvP","!","#b8b095"],
  ["pve","PvE","+","#ebecdc"], ["boss","Boss","#","#b8b095"],
  ["dungeons","Dungeons",">","#c3d5c7"], ["gyms","Gyms","=","#ebecdc"],
  ["farm","Farm","$","#b8b095"], ["build","Build","~","#c3d5c7"],
  ["keep","Keep","@","#ebecdc"], ["sell","Sell","%","#b8b095"]
].map(([id,name,icon,color])=>Object.freeze({id,name,icon,color})));
export const pokemonRarities = Object.freeze(["weak","common","uncommon","rare","epic","legendary","mythical"]);
export const pokemonElements = Object.freeze(["normal","fire","water","electric","grass","ice","fighting","poison","ground","flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy"]);
export const freshFilters = () => ({tags:[], rarity:"", element:"", minLevel:"", maxLevel:"", iv:"", quality:"", shiny:"", locked:"", team:"", nature:"", gender:""});
const number=value=>value!==null && value!==undefined && String(value).trim()!=="" && Number.isFinite(Number(value)) ? Number(value) : null;
export function matchesPokemon(c,f,assigned=[]) {
  if(f.tags.length && !f.tags.some(id=>id==="untagged" ? !assigned.length : assigned.includes(id)))return false;
  if(f.rarity && String(c.quality).toLowerCase()!==f.rarity)return false;
  const rawElements=c.elements || c.species?.elements, elements=Array.isArray(rawElements)?rawElements:[];
  if(f.element && !elements.some(el=>String(el).toLowerCase()===f.element))return false;
  const ivs=Object.values(c.ivs || {}), iv=number(c.iv_total) ?? (ivs.length===6 && ivs.every(v=>number(v)!==null) ? ivs.reduce((n,v)=>n+Number(v),0) : null);
  for(const [value,min,max] of [[number(c.level),f.minLevel,f.maxLevel],[iv,f.iv,""],[number(c.quality_multiplier),f.quality,""]]) {
    if(min!=="" && (value===null || value<Number(min)))return false;
    if(max!=="" && (value===null || value>Number(max)))return false;
  }
  for(const [key,value] of [["shiny",c.is_shiny],["locked",c.locked],["team",c.location==="team" || c.equipped===true]])if(f[key]!=="" && (value==null || Boolean(value)!==(f[key]==="yes")))return false;
  if(f.nature && String(c.nature || "").toLowerCase()!==f.nature.toLowerCase())return false;
  if(f.gender && String(c.gender || "").toLowerCase()!==f.gender.toLowerCase())return false;
  return true;
}
export function createTagStore({storage,owner,notify=()=>{}}) {
  const key=`ppbui:pokemon-tags:v2:${encodeURIComponent(owner)}`,legacyKey=`ppbui:pokemon-tags:v1:${encodeURIComponent(owner)}`;
  let data={tags:fixedTags,assigned:{}},persistent=true;
  const valid=new Set(fixedTags.map(t=>t.id));
  const clean=value=>{
    const assigned={};
    for(const [id,list] of Object.entries(value?.assigned || {})) if(id && !["__proto__","constructor","prototype"].includes(id) && Array.isArray(list)) {
      const matches=[...new Set(list.filter(tag=>valid.has(tag)))];if(matches.length===1)assigned[id]=matches;
    }
    return {tags:fixedTags,assigned};
  };
  const read=()=>{try{
    const saved=storage.getItem(key);
    if(saved!==null)data=clean(JSON.parse(saved));
    else {
      const legacy=JSON.parse(storage.getItem(legacyKey)||"{}"),map=new Map();
      for(const tag of Array.isArray(legacy.tags)?legacy.tags:[]) {
        const match=fixedTags.find(t=>t.name.toLowerCase()===String(tag?.name||"").trim().toLowerCase());if(match)map.set(tag.id,match.id);
      }
      const assigned={};for(const [id,list]of Object.entries(legacy.assigned||{}))if(Array.isArray(list))assigned[id]=list.map(tag=>map.get(tag)).filter(Boolean);
      data=clean({assigned});
      if(storage.getItem(legacyKey)!==null)storage.setItem(key,JSON.stringify({assigned:data.assigned}));
    }
    persistent=true;
  }catch{persistent=false;}};read();
  return {key,get:()=>data,persistent:()=>persistent,reload(){read();notify();},
    assign(id,tag){if(!id || ["__proto__","constructor","prototype"].includes(id) || (tag!==null && !valid.has(tag)))return;
      if(tag===null)delete data.assigned[id];else data.assigned[id]=[tag];
      try{storage.setItem(key,JSON.stringify({assigned:data.assigned}));persistent=true;}catch{persistent=false;}notify();
    }
  };
}
const services=new WeakMap();
export function tagService(win) {
  if(services.has(win))return services.get(win);
  let owner="",store=null;const listeners=new Set();
  const notify=()=>{for(const fn of listeners)fn();};
  const service={get(){
    const pi=win.PokeIdle, id=String(pi?.WorldPresence?.getSelfTrainerId?.() || pi?.Auth?.getTrainerSummary?.()?.id || "");
    if(id!==owner){owner=id;let storage;try{storage=win.localStorage;}catch{storage={getItem(){throw Error();},setItem(){throw Error();}};}store=id?createTagStore({storage,owner:id,notify}):null;}
    return store;
  },subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}};
  win.addEventListener("storage",event=>{const current=service.get();if(current && (event.key===current.key || event.key===null))current.reload();});
  services.set(win,service);return service;
}
