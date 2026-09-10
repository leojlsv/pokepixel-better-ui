import {freshFilters,matchesPokemon,symbols,tagService} from "./model.js";
const labels={
 en:{filters:"Pokémon filters",tags:"Tags",more:"More filters",clear:"Clear Pokémon filters",all:"All",untagged:"Untagged",any:"Match any selected tag",rarity:"Rarity",element:"Element",minLevel:"Min level",maxLevel:"Max level",iv:"Min total IV",quality:"Min quality multiplier",shiny:"Shiny",locked:"Locked",team:"In team",nature:"Nature",gender:"Gender",yes:"Yes",no:"No",edit:"Edit tags",choose:"Choose Pokémon",newTag:"New tag",name:"Tag name",icon:"Symbol",save:"Save tag",remove:"Delete tag",confirm:"Delete this tag and its assignments?",local:"Personal tags · saved in this browser · do not protect against sale or trade",unavailable:"Tags unavailable until the character is identified.",unsaved:"Could not save tags. Changes apply only to this session.",limit:"Enter a name; up to 40 tags are supported.",none:"No Pokémon match these filters."},
 pt:{filters:"Filtros de Pokémon",tags:"Tags",more:"Mais filtros",clear:"Limpar filtros de Pokémon",all:"Todos",untagged:"Sem tag",any:"Qualquer uma das tags selecionadas",rarity:"Raridade",element:"Elemento",minLevel:"Nível mínimo",maxLevel:"Nível máximo",iv:"IV total mínimo",quality:"Multiplicador mínimo",shiny:"Shiny",locked:"Bloqueado",team:"Na equipe",nature:"Natureza",gender:"Gênero",yes:"Sim",no:"Não",edit:"Editar tags",choose:"Escolher Pokémon",newTag:"Nova tag",name:"Nome da tag",icon:"Símbolo",save:"Salvar tag",remove:"Excluir tag",confirm:"Excluir esta tag e suas associações?",local:"Tags pessoais · salvas neste navegador · não impedem venda ou troca",unavailable:"Tags indisponíveis até identificar o personagem.",unsaved:"Não foi possível salvar. Alterações válidas apenas nesta sessão.",limit:"Informe um nome; são permitidas até 40 tags.",none:"Nenhum Pokémon corresponde aos filtros."}
};
export function pokemonToolsText(doc=document){const lang=doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang;return labels[lang?.split(/[-_]/)[0]] || labels.en;}
export function createPokemonTools(root,{getCreatures,refresh:refreshScene,basics=true,clearControl=true}) {
  const doc=root.ownerDocument,win=doc.defaultView,service=tagService(win),text=pokemonToolsText(doc);
  let filter=freshFilters(),selected="",alive=true,pending=false;
  const panels=new Set(),badges=new Set(),titles=new Map();
  let currentPanel=null,open=[false,false,false];
  const refresh=()=>{
    if(currentPanel)open=[...currentPanel.children].filter(n=>n.tagName==="DETAILS").map(n=>n.open);
    const active=doc.activeElement,key=active?.dataset.ppbuiPokemonFilter;
    refreshScene();
    if(key){const next=[...currentPanel?.querySelectorAll("[data-ppbui-pokemon-filter]")||[]].find(n=>n.dataset.ppbuiPokemonFilter===key);next?.focus({preventScroll:true});}
  };
  const node=(tag,cls,value)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(value)n.textContent=value;return n;};
  const button=label=>{const n=node("button","pokeidle-btn",label);n.type="button";return n;};
  const style=node("style");style.dataset.ppbuiStyle="pokemon-tools";style.textContent=`
    .ppbui-pokemon-tools { display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; padding:6px 0; font:11px var(--ui-font-body); color:var(--ui-ink); min-width:0; }
    .ppbui-pokemon-tools > .ppbui-pokemon-fields,.ppbui-pokemon-tools > details[open] { flex-basis:100%; }
    .ppbui-pokemon-tools > .ppbui-pokemon-fields:empty { display:none; }
    .ppbui-pokemon-tools summary { cursor:pointer; color:var(--ui-gold-light); padding:4px 0; }
    .ppbui-pokemon-fields { display:flex; flex-wrap:wrap; gap:6px; min-width:0; align-items:end; }
    .ppbui-pokemon-field { display:grid; gap:3px; min-width:0; flex:1 1 110px; }
    .ppbui-pokemon-field > span,.ppbui-pokemon-tools small { color:var(--ui-muted); font-size:10px; }
    .ppbui-pokemon-tools select,.ppbui-pokemon-tools input:not([type=checkbox]) { box-sizing:border-box; width:100%; min-width:0; max-width:100%; font:inherit; }
    .ppbui-pokemon-checks { display:flex; flex-wrap:wrap; gap:6px 12px; padding:5px 0; }
    .ppbui-pokemon-checks label { display:flex; align-items:center; gap:4px; }
    .ppbui-pokemon-tools input[type=checkbox] { accent-color:var(--ui-gold-light); }
    .ppbui-pokemon-tools .pokeidle-btn { min-height:28px; font:inherit; padding:4px 8px; }
    .ppbui-pokemon-marker { position:absolute; left:2px; bottom:2px; color:var(--ui-gold-light); font:10px var(--ui-font-body); pointer-events:none; background:var(--ui-navy-deep); line-height:12px; }
    .trade-session-window .trade-inventory-item.is-pokemon { position:relative; }
    .ppbui-pokemon-empty { color:var(--ui-muted); font:11px var(--ui-font-body); }
  `;doc.head.append(style);
  const changed=()=>{if(!alive || pending)return;pending=true;win.queueMicrotask(()=>{pending=false;if(alive)refresh();});};
  const unsubscribe=service.subscribe(changed);
  const cleanTags=()=>{const store=service.get(),ids=new Set(store?.get().tags.map(t=>t.id)||[]);filter.tags=filter.tags.filter(id=>id==="untagged" || ids.has(id));return store;};
  const matches=c=>matchesPokemon(c,filter,cleanTags()?.get().assigned[String(c.id)] || []);
  function decorate(slot,c) {
    if(!c?.id)return;
    const tags=cleanTags()?.get(),assigned=tags?.assigned[String(c.id)] || [],names=tags?.tags.filter(t=>assigned.includes(t.id)) || [];
    if(names.length){slot.dataset.ppbuiPokemonTags=names.map(t=>`${t.icon} ${t.name}`).join(" · ");titles.set(slot,slot.getAttribute("title"));slot.title=[slot.title,`${text.tags}: ${names.map(t=>t.name).join(", ")}`].filter(Boolean).join(" · ");const mark=node("span","ppbui-pokemon-marker",names[0].icon+(names.length>1?"+":""));mark.setAttribute("aria-label",names.map(t=>t.name).join(", "));slot.append(mark);badges.add(mark);}
  }
  function render() {
    for(const panel of panels)if(!panel.isConnected)panels.delete(panel);
    for(const badge of badges)if(!badge.isConnected)badges.delete(badge);
    for(const slot of titles.keys())if(!slot.isConnected)titles.delete(slot);
    if(currentPanel)open=[...currentPanel.children].filter(n=>n.tagName==="DETAILS").map(n=>n.open);
    const store=cleanTags(),data=store?.get() || {tags:[],assigned:{}},panel=node("div","ppbui-pokemon-tools");panels.add(panel);currentPanel=panel;
    const field=(parent,label,control)=>{const wrap=node("label","ppbui-pokemon-field");wrap.append(node("span","",label),control);parent.append(wrap);return control;};
    const select=(values,value)=>{const n=node("select","game-window__select");for(const [key,label]of values){const option=node("option","",label);option.value=key;n.append(option);}n.value=value;return n;};
    const fields=node("div","ppbui-pokemon-fields");panel.append(fields);
    if(basics)for(const key of ["rarity","element"]){const values=key==="rarity"?["weak","common","uncommon","rare","epic","legendary","mythical"]:["normal","fire","water","electric","grass","ice","fighting","poison","ground","flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy"];
      const options=values.map(value=>{const label=win.PokeIdle?.t?.(`common.${key==="rarity"?"quality_m":"element"}.${value}`);return[value,label||value];});const input=field(fields,text[key],select([["",text.all],...options],filter[key]));input.dataset.ppbuiPokemonFilter=key;input.onchange=()=>{filter[key]=input.value;refresh();};}
    const tagFilters=node("details"),tagSummary=node("summary","",`${text.tags} · ${filter.tags.length}`);tagFilters.open=open[0];tagFilters.append(tagSummary,node("small","",text.any));const checks=node("div","ppbui-pokemon-checks");tagFilters.append(checks);panel.append(tagFilters);
    for(const tag of [{id:"untagged",name:text.untagged,icon:""},...data.tags]){const label=node("label"),input=node("input");input.type="checkbox";input.dataset.ppbuiPokemonFilter=`tag-${tag.id}`;input.checked=filter.tags.includes(tag.id);input.disabled=!store;label.append(input,node("span","",`${tag.icon} ${tag.name}`));checks.append(label);input.onchange=()=>{filter.tags=input.checked?[...filter.tags,tag.id]:filter.tags.filter(id=>id!==tag.id);refresh();};}
    const more=node("details"),advanced=Object.entries(filter).filter(([key,value])=>!["tags","rarity","element"].includes(key)&&value!=="").length;more.open=open[1];more.append(node("summary","",`${text.more} · ${advanced}`));const advancedFields=node("div","ppbui-pokemon-fields");more.append(advancedFields);panel.append(more);
    for(const key of ["minLevel","maxLevel","iv","quality"]){const input=node("input","game-window__search");input.type="number";input.min="0";input.step=key==="quality"?"0.01":"1";if(key==="iv")input.max="186";input.value=filter[key];input.dataset.ppbuiPokemonFilter=key;field(advancedFields,text[key],input);input.onchange=()=>{if(!input.checkValidity())return;filter[key]=input.value;refresh();};}
    const creatures=getCreatures();if(!creatures.some(c=>String(c.id)===selected))selected="";
    for(const key of ["shiny","locked","team","nature","gender"]){const options=["nature","gender"].includes(key)?[...new Set(creatures.map(c=>c[key]).filter(v=>typeof v==="string" && v))].sort().map(v=>[v,v]):[["yes",text.yes],["no",text.no]];if(!options.length)continue;
      const input=field(advancedFields,text[key],select([["",text.all],...options],filter[key]));input.dataset.ppbuiPokemonFilter=key;input.onchange=()=>{filter[key]=input.value;refresh();};}
    const clear=button(text.clear);clear.onclick=()=>{filter=freshFilters();refresh();};if(clearControl)panel.append(clear);
    const editor=node("details");editor.open=open[2];editor.append(node("summary","",text.edit));panel.append(editor);
    const warning=node("small","",!store?text.unavailable:!store.persistent()?text.unsaved:text.local);warning.setAttribute("role","status");editor.append(warning);
    if(!store)return panel;
    const form=node("div","ppbui-pokemon-fields");editor.append(form);
    const choice=field(form,text.choose,select([["",text.choose],...creatures.map(c=>[String(c.id),`${c.nickname||c.species_name||c.species?.name||c.species_id||c.id} · Lv.${c.level||1} · ${String(c.id).slice(-6)}`])],selected));
    const assign=node("div","ppbui-pokemon-checks");editor.append(assign);
    const drawAssignments=()=>{assign.replaceChildren();for(const tag of data.tags){const label=node("label"),input=node("input");input.type="checkbox";input.dataset.ppbuiPokemonFilter=`assign-${tag.id}`;input.disabled=!selected;input.checked=(store.get().assigned[selected]||[]).includes(tag.id);label.append(input,node("span","",`${tag.icon} ${tag.name}`));assign.append(label);input.onchange=()=>{const old=store.get().assigned[selected]||[];if(service.get()!==store)return;store.assign(selected,input.checked?[...old,tag.id]:old.filter(id=>id!==tag.id));};}};
    choice.onchange=()=>{selected=choice.value;drawAssignments();};drawAssignments();
    const manage=node("div","ppbui-pokemon-fields");editor.append(manage);
    const existing=field(manage,text.tags,select([["",text.newTag],...data.tags.map(t=>[t.id,t.name])],""));
    const name=field(manage,text.name,node("input","game-window__search"));name.maxLength=32;
    const icon=field(manage,text.icon,select(symbols.map(s=>[s,s]),symbols[0]));
    existing.onchange=()=>{const tag=data.tags.find(t=>t.id===existing.value);name.value=tag?.name||"";icon.value=tag?.icon||symbols[0];};
    const actions=node("div","ppbui-pokemon-fields"),save=button(text.save),remove=button(text.remove);actions.append(save,remove);editor.append(actions);
    save.dataset.ppbuiPokemonFilter="save-tag";
    save.onclick=()=>{if(service.get()!==store)return;if(!store.put(name.value,icon.value,existing.value||undefined))warning.textContent=text.limit;};
    remove.onclick=async()=>{const id=existing.value;if(!id || !win.PokeIdle?.Dialog?.confirm)return;const accepted=await win.PokeIdle.Dialog.confirm(text.confirm);if(alive && accepted && service.get()===store)store.remove(id);};
    return panel;
  }
  return {render,matches,decorate,active:()=>Object.values(filter).some(value=>Array.isArray(value)?value.length:value!==""),reset(){filter=freshFilters();},cleanup(){alive=false;unsubscribe();style.remove();titles.forEach((title,slot)=>{delete slot.dataset.ppbuiPokemonTags;if(title===null)slot.removeAttribute("title");else slot.title=title;});panels.forEach(p=>p.remove());badges.forEach(b=>b.remove());}};
}
