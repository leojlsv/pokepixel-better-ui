export const symbols = ["★", "⚔", "↔", "◆", "●", "✦"];
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
  const key=`ppbui:pokemon-tags:v1:${encodeURIComponent(owner)}`;
  let data={tags:[],assigned:{}},persistent=true;
  const clean=value=>{
    const tags=Array.isArray(value?.tags)?value.tags.filter(t=>typeof t?.id==="string" && /^[a-z0-9-]{1,80}$/i.test(t.id) && typeof t.name==="string" && t.name.trim() && symbols.includes(t.icon)).slice(0,40).map(t=>({id:t.id,name:t.name.trim().slice(0,32),icon:t.icon})):[];
    const ids=new Set(tags.map(t=>t.id)),assigned={};
    for(const [id,list] of Object.entries(value?.assigned || {})) if(id && !["__proto__","constructor","prototype"].includes(id) && Array.isArray(list))assigned[id]=[...new Set(list.filter(tag=>ids.has(tag)))];
    return {tags:[...new Map(tags.map(t=>[t.id,t])).values()],assigned};
  };
  const read=()=>{try{data=clean(JSON.parse(storage.getItem(key)||"{}"));persistent=true;}catch{persistent=false;}};read();
  const save=()=>{try{storage.setItem(key,JSON.stringify(data));persistent=true;}catch{persistent=false;}notify();};
  return {key,get:()=>data,persistent:()=>persistent,reload(){read();notify();},
    put(name,icon,id=globalThis.crypto.randomUUID()) {name=String(name).trim().slice(0,32);if(!name || !symbols.includes(icon))return null;const old=data.tags.find(t=>t.id===id);if(old)Object.assign(old,{name,icon});else if(data.tags.length<40)data.tags.push({id,name,icon});else return null;save();return id;},
    remove(id){data.tags=data.tags.filter(t=>t.id!==id);for(const key in data.assigned)data.assigned[key]=data.assigned[key].filter(tag=>tag!==id);save();},
    assign(id,tags){if(!id || ["__proto__","constructor","prototype"].includes(id))return;const valid=new Set(data.tags.map(t=>t.id));const list=[...new Set(tags.filter(t=>valid.has(t)))];if(list.length)data.assigned[id]=list;else delete data.assigned[id];save();}
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
