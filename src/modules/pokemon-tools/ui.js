import {freshFilters,matchesPokemon,fixedTags,tagService,pokemonRarities,pokemonElements} from "./model.js";
const labels={
 en:{filters:"Pokémon filters",tags:"Tags",more:"Poké Filters",clear:"Clear Pokémon filters",all:"All",untagged:"Untagged",any:"Match any selected tag",rarity:"Rarity",element:"Element",minLevel:"Min level",maxLevel:"Max level",iv:"Min total IV",quality:"Min Quality",shiny:"Shiny",locked:"Locked",team:"In team",nature:"Nature",gender:"Gender",yes:"Yes",no:"No",edit:"Edit tags",choose:"Choose Pokémon",newTag:"New tag",name:"Tag name",icon:"Symbol",save:"Save tag",remove:"Delete tag",confirm:"Delete this tag and its assignments?",local:"Personal tags · saved in this browser · do not protect against sale or trade",unavailable:"Tags unavailable until the character is identified.",unsaved:"Could not save tags. Changes apply only to this session.",limit:"Enter a name; up to 40 tags are supported.",none:"No Pokémon match these filters."},
 pt:{filters:"Filtros de Pokémon",tags:"Tags",more:"Mais filtros",clear:"Limpar filtros de Pokémon",all:"Todos",untagged:"Sem tag",any:"Qualquer uma das tags selecionadas",rarity:"Raridade",element:"Elemento",minLevel:"Nível mínimo",maxLevel:"Nível máximo",iv:"IV total mínimo",quality:"Qualidade mínima",shiny:"Shiny",locked:"Bloqueado",team:"Na equipe",nature:"Natureza",gender:"Gênero",yes:"Sim",no:"Não",edit:"Editar tags",choose:"Escolher Pokémon",newTag:"Nova tag",name:"Nome da tag",icon:"Símbolo",save:"Salvar tag",remove:"Excluir tag",confirm:"Excluir esta tag e suas associações?",local:"Tags pessoais · salvas neste navegador · não impedem venda ou troca",unavailable:"Tags indisponíveis até identificar o personagem.",unsaved:"Não foi possível salvar. Alterações válidas apenas nesta sessão.",limit:"Informe um nome; são permitidas até 40 tags.",none:"Nenhum Pokémon corresponde aos filtros."}
};
export function pokemonToolsText(doc=document){const lang=doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang;return labels[lang?.split(/[-_]/)[0]] || labels.en;}
export function createPokemonTools(root,{getCreatures,refresh:refreshScene,basics=true,clearControl=true,language}) {
  const doc=root.ownerDocument,win=doc.defaultView,service=tagService(win),text=labels[language] || pokemonToolsText(doc);
  const pt=(language||win.PokeIdle?.Localization?.get?.()||doc.documentElement.lang||"").startsWith("pt");
  const copy={title:pt?"Tag do Pokémon":"Pokémon tag",remove:pt?"Remover tag":"Remove tag",close:pt?"Fechar":"Close",hint:pt?"Alt + clique esquerdo para atribuir uma tag":"Alt + left click to assign a tag",current:pt?"Atual":"Current"};
  let filter=freshFilters(),alive=true,pending=false,currentPanel=null,open=false,dialog=null,lastAlt=null;
  const panels=new Set(),badges=new Set(),titles=new Map(),slots=new WeakMap();
  const node=(tag,cls,value)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(value)n.textContent=value;return n;};
  const button=label=>{const n=node("button","pokeidle-btn ppbui-button",label);n.type="button";return n;};
  const ownedField=control=>{for(const [property,value] of [["-webkit-appearance","none"],["appearance","none"],["border-radius","inherit"],["background-image","none"],["clip-path","none"],["box-shadow","none"]])control.style.setProperty(property,value,"important");return control;};
  const refresh=()=>{
    if(currentPanel)open=currentPanel.open;
    const key=doc.activeElement?.dataset.ppbuiPokemonFilter;
    refreshScene();
    if(key)[...currentPanel?.querySelectorAll("[data-ppbui-pokemon-filter]")||[]].find(n=>n.dataset.ppbuiPokemonFilter===key)?.focus({preventScroll:true});
  };
  const style=node("style");style.dataset.ppbuiStyle="pokemon-tools";style.textContent=`
    .ppbui-pokemon-tools { padding:var(--ppbui-space-3) 0; min-width:0; color:var(--ppbui-text); font:var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body); }
    .ppbui-pokemon-tools summary { cursor:pointer; min-height:var(--ppbui-control-height); padding:var(--ppbui-space-2) 0; color:var(--ppbui-text); font-weight:700; }
    .ppbui-pokemon-fields { display:flex; flex-wrap:wrap; gap:var(--ppbui-space-3); min-width:0; align-items:end; }
    .ppbui-pokemon-field { display:grid; gap:var(--ppbui-space-1); min-width:0; flex:1 1 110px; border-radius:var(--ppbui-radius); }
    .ppbui-pokemon-field > span,.ppbui-pokemon-tools small { color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-meta); }
    .ppbui-pokemon-tools select,.ppbui-pokemon-tools input { box-sizing:border-box; width:100%; min-width:0; max-width:100%; font:inherit; }
    .ppbui-pokemon-tools input.game-window__search.ppbui-input,
    .ppbui-pokemon-tools select.game-window__select.ppbui-select,
    .ppbui-pokemon-tools input.game-window__search.ppbui-input:is(:hover,:focus,:focus-visible),
    .ppbui-pokemon-tools select.game-window__select.ppbui-select:is(:hover,:focus,:focus-visible) { -webkit-appearance:none!important; appearance:none!important; border-radius:var(--ppbui-radius)!important; background-image:none!important; clip-path:none!important; box-shadow:none!important; }
    .ppbui-pokemon-tools > .ppbui-button { margin-top:var(--ppbui-space-3) !important; }
    .ppbui-pokemon-marker { position:absolute; left:2px; bottom:2px; min-width:14px; pointer-events:none; border:var(--ppbui-separator-width) solid currentColor; border-radius:var(--ppbui-radius); background:var(--ppbui-bg-0); font:700 var(--ppbui-font-size-secondary)/14px var(--ppbui-font-data); text-align:center; }
    .trade-session-window.ppbui-window .trade-inventory-item.is-pokemon { position:relative; }
    .ppbui-pokemon-empty { color:var(--ppbui-text-muted); font:var(--ppbui-font-size-secondary)/var(--ppbui-line-height-body) var(--ppbui-font-body); }
    .ppbui-tag-dialog { box-sizing:border-box; width:min(380px,calc(100vw - 24px)); max-width:calc(100vw - 24px); max-height:calc(100dvh - 24px); overflow:auto; margin:auto; padding:var(--ppbui-space-5); }
    .ppbui-tag-dialog::backdrop { background:rgba(0,0,0,.45); }
    .ppbui-tag-heading { display:flex; align-items:center; justify-content:space-between; gap:var(--ppbui-space-4); }
    .ppbui-tag-heading strong { overflow-wrap:anywhere; }
    .ppbui-tag-options { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:var(--ppbui-space-3); margin:var(--ppbui-space-4) 0; }
    .ppbui-tag-options .ppbui-button { justify-content:flex-start; min-width:0; }
    .ppbui-tag-options button > span:last-child { min-width:0; overflow-wrap:anywhere; }
    .ppbui-tag-symbol { flex:0 0 14px; font:700 14px/1 var(--ppbui-font-data); text-align:center; }
    .ppbui-tag-current { margin:var(--ppbui-space-3) 0; color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-secondary); }
  `;doc.head.append(style);
  const closeDialog=()=>{if(!dialog)return;const previous=dialog;dialog=null;if(previous.open && previous.close)previous.close();previous.remove();};
  const changed=()=>{if(!alive || pending)return;pending=true;win.queueMicrotask(()=>{pending=false;if(alive)refresh();});};
  const unsubscribe=service.subscribe(changed);
  const matches=c=>matchesPokemon(c,filter,service.get()?.get().assigned[String(c.id)] || []);
  const showTagDialog=(slot,c)=>{
    closeDialog();const store=service.get(),ownerStore=store;
    const box=node("dialog","ppbui-tag-dialog ppbui-dialog ppbui-root ppbui-scroll"),heading=node("div","ppbui-tag-heading"),title=node("strong","",copy.title),close=button("×");close.classList.add("ppbui-icon-button","ppbui-button--1x1");close.setAttribute("aria-label",copy.close);heading.append(title,close);box.append(heading);
    const creature=getCreatures().find(p=>String(p.id)===String(c.id))||c;
    const current=store?.get().assigned[String(c.id)]?.[0],name=creature.nickname||creature.species_name||creature.species?.name||creature.species_id||String(c.id);
    const currentTag=fixedTags.find(t=>t.id===current);
    box.append(node("p","ppbui-tag-current",`${name} · ${copy.current}: ${currentTag?.name||text.untagged}`));
    if(!store)box.append(node("p","ppbui-tag-current",text.unavailable));
    const options=node("div","ppbui-tag-options");box.append(options);
    const choose=tag=>{if(!alive || !ownerStore || service.get()!==ownerStore){closeDialog();return;}ownerStore.assign(String(c.id),tag);if(!ownerStore.persistent()){if(currentPanel)currentPanel.open=true;win.PokeIdle?.Toast?.error?.(text.unsaved);}closeDialog();if(slot.isConnected)slot.focus({preventScroll:true});};
    for(const tag of fixedTags){const action=button("");action.dataset.ppbuiTagChoice=tag.id;action.disabled=!store;action.setAttribute("aria-pressed",String(tag.id===current));if(tag.id===current)action.classList.add("pokeidle-btn--primary");const symbol=node("span","ppbui-tag-symbol",tag.icon);symbol.style.color=tag.color;symbol.setAttribute("aria-hidden","true");action.append(symbol,node("span","",tag.name));action.onclick=()=>choose(tag.id);options.append(action);}
    const remove=button(copy.remove);remove.classList.add("ppbui-button--danger");remove.dataset.ppbuiTagChoice="remove";remove.disabled=!store || !current;remove.onclick=()=>choose(null);box.append(remove);
    close.onclick=()=>{closeDialog();if(slot.isConnected)slot.focus({preventScroll:true});};box.addEventListener("cancel",event=>{event.preventDefault();close.click();});
    box.setAttribute("aria-label",`${copy.title}: ${name}`);doc.body.append(box);dialog=box;
    if(typeof box.showModal==="function")box.showModal();else box.setAttribute("open","");
    (options.querySelector('[aria-pressed="true"]')||options.firstElementChild||close).focus();
  };
  const intercept=event=>{
    let slot=event.target;while(slot && slot!==root && !slots.has(slot))slot=slot.parentElement;
    if(!slot || !slots.has(slot))return;
    const alt=event.altKey && event.button===0;
    const chained=lastAlt?.slot===slot && Date.now()-lastAlt.time<700 && (event.type==="dblclick" || (event.type==="click" && event.detail>1));
    if(!alt && !chained)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(alt && event.type==="click"){lastAlt={slot,time:Date.now()};showTagDialog(slot,slots.get(slot));}
  };
  const events=["pointerdown","mousedown","pointerup","mouseup","click","dblclick"];
  events.forEach(type=>root.addEventListener(type,intercept,true));
  function decorate(slot,c) {
    if(!c?.id)return;slots.set(slot,c);
    const tag=fixedTags.find(t=>t.id===service.get()?.get().assigned[String(c.id)]?.[0]);
    titles.set(slot,slot.getAttribute("title"));slot.title=[slot.title,tag?`${text.tags}: ${tag.name}`:"",copy.hint].filter(Boolean).join(" · ");
    if(tag){slot.dataset.ppbuiPokemonTags=`${tag.icon} ${tag.name}`;const mark=node("span","ppbui-pokemon-marker",tag.icon);mark.style.color=tag.color;mark.setAttribute("aria-label",tag.name);slot.append(mark);badges.add(mark);}
  }
  const activeCount=()=>Object.values(filter).filter(v=>Array.isArray(v)?v.length:v!=="").length;
  const label=()=>{const active=activeCount();return active?`${text.more} · ${active}`:text.more;};
  function render({summary=true}={}) {
    if(currentPanel)open=currentPanel.open;
    for(const panel of panels)if(!panel.isConnected)panels.delete(panel);
    for(const badge of badges)if(!badge.isConnected)badges.delete(badge);
    for(const slot of titles.keys())if(!slot.isConnected)titles.delete(slot);
    const panel=node("details","ppbui-pokemon-tools ppbui-root");panel.open=open;panels.add(panel);currentPanel=panel;
    const summaryNode=node("summary","",label());summaryNode.hidden=!summary;panel.append(summaryNode);
    const fields=node("div","ppbui-pokemon-fields");panel.append(fields);
    const field=(label,control,key)=>{const wrap=node("label","ppbui-pokemon-field");control.dataset.ppbuiPokemonFilter=key;wrap.append(node("span","",label),control);fields.append(wrap);return control;};
    const select=(key,label,values,value)=>{const input=ownedField(node("select","game-window__select ppbui-select"));for(const [id,name]of [["",text.all],...values]){const option=node("option","",name);option.value=id;input.append(option);}input.value=value;field(label,input,key);input.onchange=()=>{if(key==="tags")filter.tags=input.value?[input.value]:[];else filter[key]=input.value;refresh();};return input;};
    if(basics)for(const key of ["rarity","element"]){const values=key==="rarity"?pokemonRarities:pokemonElements;select(key,text[key],values.map(value=>[value,win.PokeIdle?.t?.(`common.${key==="rarity"?"quality_m":"element"}.${value}`)||value]),filter[key]);}
    for(const key of ["minLevel","maxLevel","iv","quality"]){const input=ownedField(node("input","game-window__search ppbui-input"));input.type="number";input.min="0";input.step=key==="quality"?"0.01":"1";if(key==="iv")input.max="186";input.value=filter[key];field(text[key],input,key);input.onchange=()=>{if(input.checkValidity()){filter[key]=input.value;refresh();}};}
    const creatures=getCreatures();
    for(const key of ["shiny","locked","team","nature","gender"]){const values=["nature","gender"].includes(key)?[...new Set(creatures.map(c=>c[key]).filter(v=>typeof v==="string" && v))].sort().map(v=>[v,v]):[["yes",text.yes],["no",text.no]];if(key==="nature" && !values.length)continue;select(key,text[key],values,filter[key]);}
    select("tags",text.tags,[["untagged",text.untagged],...fixedTags.map(t=>[t.id,`${t.icon} ${t.name}`])],filter.tags[0]||"");
    if(clearControl){const clear=button(text.clear);clear.onclick=()=>{filter=freshFilters();refresh();};panel.append(clear);}
    const store=service.get();if(store && !store.persistent()){const warning=node("small","",text.unsaved);warning.setAttribute("role","status");panel.append(warning);}
    return panel;
  }
  return {render,matches,decorate,label,isOpen:()=>open,setOpen(value){open=Boolean(value);if(currentPanel)currentPanel.open=open;},active:()=>Object.values(filter).some(value=>Array.isArray(value)?value.length:value!==""),reset(){filter=freshFilters();},cleanup(){alive=false;closeDialog();unsubscribe();events.forEach(type=>root.removeEventListener(type,intercept,true));style.remove();titles.forEach((title,slot)=>{delete slot.dataset.ppbuiPokemonTags;if(title===null)slot.removeAttribute("title");else slot.title=title;});panels.forEach(p=>p.remove());badges.forEach(b=>b.remove());}};
}
