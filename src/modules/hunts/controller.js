import {parts,results,markers,markerLabel,huntsText,huntScene,rememberActiveHuntZone,forgetActiveHuntZone,selectors,listRowZoneIndex} from './dom.js';
import {canLocateHunt,locateHunt} from './navigation.js';
import {createHuntInspector} from './dossier.js';
import {createHuntMarkerInteractions} from './interaction.js';
import {huntsStyles} from './styles.js';
import {createHuntFavoritesStore,huntFavoriteKey} from './favorites.js';

function findTitleText(node,NodeCtor) {
  for(const child of node?.childNodes||[]){
    if(child.nodeType===NodeCtor.TEXT_NODE&&child.textContent.trim())return child;
    if(child.nodeType===NodeCtor.ELEMENT_NODE&&child.tagName!=='BUTTON'){
      const nested=findTitleText(child,NodeCtor);if(nested)return nested;
    }
  }
  return null;
}

function regionTabIdentity(button) {
  return [button?.dataset?.region,button?.dataset?.world,button?.getAttribute?.('aria-label'),button?.textContent]
    .filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}

function isLegendaryRegionTab(button) {
  return /legend|lendari|传说|傳說|传奇|傳奇/.test(regionTabIdentity(button));
}

function isCommonRegionTab(button) {
  return /\b(?:kanto|johto|hoenn)\b|关都|關都|城都|丰缘|豐緣/.test(regionTabIdentity(button));
}

function regionTabKey(button) {
  const value=regionTabIdentity(button);
  if(/legend|lendari|传说|傳說|传奇|傳奇/.test(value))return 'legendary';
  if(/\bkanto\b|关都|關都/.test(value))return 'kanto';
  if(/\bjohto\b|城都/.test(value))return 'johto';
  if(/\bhoenn\b|丰缘|豐緣/.test(value))return 'hoenn';
  return value?`native:${value}`:'';
}

function focusNode(node) {
  if(!node?.isConnected||typeof node.focus!=='function')return false;
  try {node.focus({preventScroll:true});} catch {node.focus();}
  return node.ownerDocument?.activeElement===node;
}

let currentListFilterId=0;

function createCurrentListRefinement(root) {
  const doc=root.ownerDocument,toggle=doc.createElement('button'),utility=doc.createElement('div'),advanced=doc.createElement('div');
  toggle.type='button';toggle.className='ppbui-hunts-filter-toggle';toggle.dataset.ppbuiHuntsFilters='';
  utility.className='ppbui-hunts-list-utility';utility.dataset.ppbuiModule='hunts';
  advanced.className='ppbui-hunts-list-advanced';advanced.dataset.ppbuiModule='hunts';
  advanced.id=`ppbui-hunts-advanced-filters-${++currentListFilterId}`;
  toggle.setAttribute('aria-controls',advanced.id);
  let active=true,expanded=false,layout=null;

  const attrSnapshot=(node,name)=>({node,name,had:node.hasAttribute(name),value:node.getAttribute(name)});
  const restoreAttr=state=>{
    if(!state?.node)return;
    if(state.had)state.node.setAttribute(state.name,state.value??'');
    else state.node.removeAttribute(state.name);
  };
  const baseline=(input,edge)=>{
    const bound=input?.getAttribute?.(edge);
    return bound!==null&&String(bound).trim()!==''?String(bound):String(input?.defaultValue??'');
  };
  const hasAdvancedFilters=next=>{
    const element=next.elements?.querySelector?.('select');
    if(element&&element.selectedIndex>0)return true;
    if(next.minLevel&&String(next.minLevel.value)!==baseline(next.minLevel,'min'))return true;
    if(next.maxLevel&&String(next.maxLevel.value)!==baseline(next.maxLevel,'max'))return true;
    return false;
  };
  const restorePlacement=(placement,restore)=>{
    if(!placement)return;
    const {node,anchor,owner}=placement,owned=owner?owner.contains(node):(utility.contains(node)||advanced.contains(node));
    if(restore&&anchor.isConnected&&node.isConnected&&owned)anchor.replaceWith(node);
    else {
      if(owned)node.remove();
      anchor.remove();
    }
  };
  const teardown=(restore=true)=>{
    if(!layout)return;
    const {toolbar,hadToolbarClass,placements,contextPlacement,aria}=layout;
    placements.forEach(placement=>restorePlacement(placement,restore));
    restorePlacement(contextPlacement,restore);
    aria.forEach(restoreAttr);
    if(toolbar?.isConnected&&!hadToolbarClass)toolbar.classList.remove('ppbui-hunts-list-refined');
    utility.remove();advanced.remove();layout=null;
  };
  const setup=next=>{
    const required=[next.toolbar,next.searchField,next.elements,next.sortField,next.rangeField,next.clear,next.minLevel,next.maxLevel];
    if(required.some(node=>!node)){teardown(true);return false;}
    if(layout&&layout.toolbar===next.toolbar&&layout.searchField===next.searchField&&layout.element===next.elements&&
      layout.sort===next.sortField&&layout.range===next.rangeField&&layout.clear===next.clear&&
      layout.minLevel===next.minLevel&&layout.maxLevel===next.maxLevel&&layout.summary===next.summary&&layout.worldNote===next.worldNote&&
      utility.parentElement===next.toolbar&&advanced.parentElement===next.toolbar)return true;
    teardown(true);
    const nodes=[next.elements,next.sortField,next.rangeField,next.clear];
    const placements=nodes.map(node=>{const anchor=doc.createComment('ppbui-hunts-list-control');node.before(anchor);return {node,anchor};});
    const aria=[
      attrSnapshot(next.minLevel,'aria-label'),attrSnapshot(next.minLevel,'aria-labelledby'),
      attrSnapshot(next.maxLevel,'aria-label'),attrSnapshot(next.maxLevel,'aria-labelledby'),
    ];
    next.searchField.after(utility,advanced);
    utility.append(toggle,next.sortField,next.clear);
    advanced.append(next.elements,next.rangeField);
    let contextPlacement=null;
    if(next.summary&&next.worldNote&&!next.summary.contains(next.worldNote)){
      const anchor=doc.createComment('ppbui-hunts-list-context');next.worldNote.before(anchor);next.summary.append(next.worldNote);contextPlacement={node:next.worldNote,anchor,owner:next.summary};
    }
    const hadToolbarClass=next.toolbar.classList.contains('ppbui-hunts-list-refined');
    next.toolbar.classList.add('ppbui-hunts-list-refined');
    layout={toolbar:next.toolbar,searchField:next.searchField,element:next.elements,sort:next.sortField,range:next.rangeField,clear:next.clear,minLevel:next.minLevel,maxLevel:next.maxLevel,summary:next.summary,worldNote:next.worldNote,hadToolbarClass,placements,contextPlacement,aria};
    return true;
  };
  const sync=()=>{
    if(!active)return;
    const next=parts(root);if(!next.current||!setup(next))return;
    const text=huntsText(doc),filterActive=hasAdvancedFilters(next),expandedValue=String(expanded);
    if(toggle.textContent!==text.filters)toggle.textContent=text.filters;
    if(toggle.getAttribute('aria-expanded')!==expandedValue)toggle.setAttribute('aria-expanded',expandedValue);
    const filterLabel=filterActive?text.filtersActive:text.filters;
    if(toggle.getAttribute('aria-label')!==filterLabel)toggle.setAttribute('aria-label',filterLabel);
    if(toggle.dataset.active!==String(filterActive))toggle.dataset.active=String(filterActive);
    if(advanced.hidden===expanded)advanced.hidden=!expanded;
    for(const [input,label] of [[next.minLevel,text.minLevel],[next.maxLevel,text.maxLevel]]){
      if(input.hasAttribute('aria-labelledby'))input.removeAttribute('aria-labelledby');
      if(input.getAttribute('aria-label')!==label)input.setAttribute('aria-label',label);
    }
  };
  const onToggle=()=>{
    if(!active)return;
    if(expanded&&advanced.contains(doc.activeElement))toggle.focus({preventScroll:true});
    expanded=!expanded;sync();
  };
  const onInput=event=>{if(active&&layout?.toolbar?.contains(event.target)&&event.target!==toggle)sync();};
  const onClick=event=>{if(active&&event.target===layout?.clear)sync();};
  toggle.addEventListener('click',onToggle);
  root.addEventListener('input',onInput);root.addEventListener('change',onInput);root.addEventListener('click',onClick);
  sync();
  return {element:toggle,afterElement:()=>advanced,sync,cleanup(){
    if(!active)return;active=false;
    toggle.removeEventListener('click',onToggle);
    root.removeEventListener('input',onInput);root.removeEventListener('change',onInput);root.removeEventListener('click',onClick);
    teardown(true);toggle.remove();utility.remove();advanced.remove();
  }};
}

function createCurrentHuntFavorites(root,refinement,store) {
  const doc=root.ownerDocument,view=doc.defaultView;
  const section=doc.createElement('section'),heading=doc.createElement('header'),title=doc.createElement('strong'),count=doc.createElement('span'),list=doc.createElement('div'),statusNode=doc.createElement('p');
  section.className='ppbui-hunts-favorites';section.dataset.ppbuiHuntFavorites='';
  heading.className='ppbui-hunts-favorites__heading';count.className='ppbui-hunts-favorites__count';
  list.className='ppbui-hunts-favorites__list';statusNode.className='ppbui-hunts-favorites__status';statusNode.setAttribute('role','status');
  heading.append(title,count);section.append(heading,list,statusNode);
  let active=true,signature='',status='',pending=null,pendingTimer=0,startingKey='',delegatingRegion=false;

  const selectedRegionButton=current=>[...(current.tabs?.querySelectorAll?.('button')||[])].find(button=>
    button.classList.contains('is-active')||button.getAttribute('aria-current')==='page'||button.getAttribute('aria-selected')==='true')||null;
  const currentRegionKey=current=>regionTabKey(selectedRegionButton(current));
  const worldMatches=(favorite,current,scene)=>{
    const world=String(scene?._tab??'').trim();
    if(favorite.worldId&&world)return world===favorite.worldId;
    return Boolean(favorite.regionKey&&currentRegionKey(current)===favorite.regionKey);
  };
  const favoriteForRow=(row,current)=>{
    const scene=huntScene(root),index=listRowZoneIndex(row),zone=scene?._zones?.[index];
    if(!scene||index<0||!zone)return null;
    const activeTab=selectedRegionButton(current),worldId=String(scene._tab??'').trim(),regionKey=regionTabKey(activeTab)||worldId;
    const zoneId=zone?.id===undefined||zone?.id===null?'':String(zone.id).trim();
    let label=row.querySelector(selectors.listIdentityName)?.textContent?.trim()||'';
    if(!label)try{label=String(scene.zoneName?.(zone)??zone?.name??zoneId).trim();}catch{}
    if(!zoneId||(!worldId&&!regionKey)||!label)return null;
    return {worldId,regionKey,worldLabel:activeTab?.textContent?.trim()||worldId||regionKey,zoneId,label};
  };
  const place=current=>{
    const anchor=refinement.afterElement?.();
    if(!current.toolbar||!anchor?.isConnected)return false;
    if(section.parentElement!==current.toolbar||section.previousElementSibling!==anchor)anchor.after(section);
    return true;
  };
  const updateToggle=(button,favorite,text)=>{
    const key=huntFavoriteKey(favorite),pressed=store.has(key),label=pressed?`${text.favoriteRemove}: ${favorite.label}`:`${text.favoriteAdd}: ${favorite.label}`;
    if(button.dataset.ppbuiHuntFavoriteKey!==key)button.dataset.ppbuiHuntFavoriteKey=key;
    if(button.dataset.ppbuiHuntFavoriteZoneId!==favorite.zoneId)button.dataset.ppbuiHuntFavoriteZoneId=favorite.zoneId;
    if(button.getAttribute('aria-pressed')!==String(pressed))button.setAttribute('aria-pressed',String(pressed));
    if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label);
    if(button.title!==label)button.title=label;
    const glyph=pressed?'★':'☆';if(button.textContent!==glyph)button.textContent=glyph;
  };
  const decorateRows=(current,text)=>{
    const seen=new Set();
    if(current.mode==='current-list')for(const row of root.querySelectorAll(selectors.listRow)){
      const favorite=favoriteForRow(row,current),cell=row.querySelector(selectors.listActionCell),existing=row.querySelector(selectors.favoriteToggle);
      if(!favorite||!cell){existing?.remove();continue;}
      const button=existing||doc.createElement('button');
      if(!existing){button.type='button';button.className='pokeidle-ui-button ppbui-hunts-favorite-toggle';button.dataset.ppbuiHuntFavoriteToggle='';cell.append(button);}
      updateToggle(button,favorite,text);seen.add(button);
    }
    for(const button of root.querySelectorAll(selectors.favoriteToggle))if(!seen.has(button))button.remove();
  };
  const render=()=>{
    const focusedGo=doc.activeElement?.matches?.(selectors.favoriteGo)&&section.contains(doc.activeElement)?doc.activeElement.dataset.ppbuiHuntFavoriteGo:'';
    const text=huntsText(doc),favorites=store.list(),nextSignature=JSON.stringify([text.favorites,text.favoriteEmpty,text.favoriteGo,text.favoriteRemove,favorites,status,startingKey,store.persistent()]);
    if(signature===nextSignature)return;
    signature=nextSignature;title.textContent=text.favorites;section.setAttribute('aria-label',text.favorites);count.textContent=String(favorites.length);list.replaceChildren();
    if(!favorites.length){const empty=doc.createElement('p');empty.className='ppbui-hunts-favorites__empty';empty.textContent=text.favoriteEmpty;list.append(empty);}
    else for(const favorite of favorites){
      const key=huntFavoriteKey(favorite),row=doc.createElement('div'),go=doc.createElement('button'),remove=doc.createElement('button'),name=doc.createElement('span'),world=doc.createElement('small');
      row.className='ppbui-hunts-favorite';go.type='button';go.className='ppbui-hunts-favorite__go';go.dataset.ppbuiHuntFavoriteGo=key;go.disabled=Boolean(startingKey);
      name.textContent=favorite.label;world.textContent=favorite.worldLabel||favorite.regionKey||favorite.worldId;go.append(name,world);
      go.setAttribute('aria-label',`${text.favoriteGo}: ${favorite.label} · ${world.textContent}`);go.title=`${favorite.label} · ${world.textContent}`;
      remove.type='button';remove.className='ppbui-hunts-favorite__remove';remove.dataset.ppbuiHuntFavoriteRemove=key;remove.textContent='×';remove.disabled=Boolean(startingKey);
      remove.setAttribute('aria-label',`${text.favoriteRemove}: ${favorite.label} · ${world.textContent}`);row.append(go,remove);list.append(row);
    }
    statusNode.textContent=status;statusNode.hidden=!status;section.setAttribute('aria-busy',String(Boolean(startingKey||pending)));
    if(focusedGo)view.queueMicrotask?.(()=>{
      if(!active||!focusedGo||(doc.activeElement&&doc.activeElement!==doc.body&&doc.activeElement!==doc.documentElement))return;
      const same=[...section.querySelectorAll(selectors.favoriteGo)].find(button=>button.dataset.ppbuiHuntFavoriteGo===focusedGo&&!button.disabled);
      const rowToggle=[...root.querySelectorAll(selectors.favoriteToggle)].find(button=>button.dataset.ppbuiHuntFavoriteKey===focusedGo);
      const fallback=same||rowToggle||section.querySelector(`${selectors.favoriteGo}:not(:disabled)`)||(refinement.element?.isConnected?refinement.element:null);
      fallback?.focus?.({preventScroll:true});
    });
  };
  const clearPendingTimer=()=>{view.clearTimeout?.(pendingTimer);pendingTimer=0;};
  const fail=()=>{clearPendingTimer();pending=null;startingKey='';status=huntsText(doc).favoriteUnavailable;};
  const zoneIndex=(scene,favorite)=>Array.isArray(scene?._zones)?scene._zones.findIndex(zone=>String(zone?.id??'')===favorite.zoneId):-1;
  const startFavorite=(favorite,current,{waitForZone=false}={})=>{
    const scene=huntScene(root),index=zoneIndex(scene,favorite),key=huntFavoriteKey(favorite);
    if(!scene||typeof scene.startHunt!=='function'||!worldMatches(favorite,current,scene)||index<0){if(!waitForZone)fail();return false;}
    clearPendingTimer();pending=null;startingKey=key;status=huntsText(doc).favoriteOpening;scene._selectedIndex=index;render();
    let result;
    try{result=scene.startHunt();}
    catch{fail();render();return false;}
    Promise.resolve(result).then(()=>{
      if(!active||startingKey!==key)return;startingKey='';status='';sync();
    },()=>{if(!active||startingKey!==key)return;fail();sync();});
    return true;
  };
  const regionButtonFor=(favorite,current)=>[...(current.tabs?.querySelectorAll?.('button')||[])].find(button=>{
    const nativeWorld=String(button.dataset?.world||button.dataset?.region||'').trim();
    return (favorite.regionKey&&regionTabKey(button)===favorite.regionKey)||(favorite.worldId&&nativeWorld===favorite.worldId);
  })||null;
  const activate=favorite=>{
    if(!favorite||startingKey)return;
    const current=parts(root),scene=huntScene(root);status='';
    if(current.current&&worldMatches(favorite,current,scene)){startFavorite(favorite,current);render();return;}
    const tab=current.current?regionButtonFor(favorite,current):null;
    if(!tab||tab.disabled||tab.getAttribute('aria-disabled')==='true'){fail();render();return;}
    pending={favorite,expiresAt:Date.now()+2500};status=huntsText(doc).favoriteOpening;clearPendingTimer();
    pendingTimer=view.setTimeout?.(()=>{if(active&&pending?.favorite&&huntFavoriteKey(pending.favorite)===huntFavoriteKey(favorite)){fail();sync();}},2500)||0;
    delegatingRegion=true;
    try{tab.click();}finally{delegatingRegion=false;}
    view.queueMicrotask?.(()=>{if(active)sync();});render();
  };
  const resolvePending=current=>{
    if(!pending)return;
    if(Date.now()>pending.expiresAt){fail();return;}
    const scene=huntScene(root);
    if(worldMatches(pending.favorite,current,scene))startFavorite(pending.favorite,current,{waitForZone:true});
  };
  const onClick=event=>{
    if(!active||delegatingRegion)return;
    const toggle=event.target?.closest?.(selectors.favoriteToggle),go=event.target?.closest?.(selectors.favoriteGo),remove=event.target?.closest?.(selectors.favoriteRemove);
    if(!toggle&&!go&&!remove&&pending){clearPendingTimer();pending=null;status='';sync();return;}
    if(toggle&&root.contains(toggle)){
      event.preventDefault();event.stopPropagation();
      const row=toggle.closest(selectors.listRow),current=parts(root),favorite=favoriteForRow(row,current);if(!favorite)return;
      const key=huntFavoriteKey(favorite),wasFavorite=store.has(key);store.toggle(favorite);if(wasFavorite&&pending?.favorite&&huntFavoriteKey(pending.favorite)===key){clearPendingTimer();pending=null;}return;
    }
    if(remove&&section.contains(remove)){
      event.preventDefault();event.stopPropagation();const key=remove.dataset.ppbuiHuntFavoriteRemove,restoreFocus=doc.activeElement===remove;if(pending?.favorite&&huntFavoriteKey(pending.favorite)===key){clearPendingTimer();pending=null;}store.remove(key);
      if(restoreFocus)view.queueMicrotask?.(()=>{
        if(!active)return;
        const rowToggle=[...root.querySelectorAll(selectors.favoriteToggle)].find(button=>button.dataset.ppbuiHuntFavoriteKey===key),fallback=rowToggle||section.querySelector(selectors.favoriteGo)||(refinement.element?.isConnected?refinement.element:null);
        fallback?.focus?.({preventScroll:true});
      });
      return;
    }
    if(go&&section.contains(go)){
      event.preventDefault();event.stopPropagation();activate(store.get(go.dataset.ppbuiHuntFavoriteGo));
    }
  };
  const unsubscribe=store.subscribe(()=>{if(active)sync();});
  root.addEventListener('click',onClick);
  function sync(){
    if(!active)return;
    const current=parts(root);if(!current.current)return;
    const text=huntsText(doc);place(current);decorateRows(current,text);resolvePending(current);render();
  }
  return {element:section,sync,cleanup(){
    if(!active)return;active=false;clearPendingTimer();pending=null;startingKey='';unsubscribe();root.removeEventListener('click',onClick);
    root.querySelectorAll(selectors.favoriteToggle).forEach(button=>button.remove());section.remove();
  }};
}

function mountCurrentHunts(root,favoritesStore) {
  const doc=root.ownerDocument,view=doc.defaultView;
  root.classList.add('ppbui-hunts-enhanced','ppbui-hunts-current');
  const style=doc.createElement('style');style.dataset.ppbuiModule='hunts';style.textContent=huntsStyles;root.append(style);
  const refinement=createCurrentListRefinement(root),favorites=createCurrentHuntFavorites(root,refinement,favoritesStore);
  const ownedClasses=new Map();
  const ownedAttributes=new Map();
  const regionPlacements=new Map();
  let lastFocused=null;
  const ownClass=(node,className)=>{
    if(!node)return;
    const key=`${className}`;
    let state=ownedClasses.get(node);if(!state){state=new Map();ownedClasses.set(node,state);}
    if(!state.has(key))state.set(key,node.classList.contains(className));
    if(!node.classList.contains(className))node.classList.add(className);
  };
  const ownAttribute=(node,name,value)=>{
    if(!node)return;
    let state=ownedAttributes.get(node);if(!state){state=new Map();ownedAttributes.set(node,state);}
    if(!state.has(name))state.set(name,{had:node.hasAttribute(name),value:node.getAttribute(name)});
    if(node.getAttribute(name)!==value)node.setAttribute(name,value);
  };
  const restoreOwnedClasses=()=>{
    for(const [node,state] of ownedClasses){
      if(!node?.isConnected)continue;
      for(const [className,had] of state)if(!had)node.classList.remove(className);
    }
    ownedClasses.clear();
  };
  const restoreOwnedAttributes=()=>{
    for(const [node,state] of ownedAttributes){
      if(!node?.isConnected)continue;
      for(const [name,original] of state){
        if(original.had)node.setAttribute(name,original.value??'');
        else node.removeAttribute(name);
      }
    }
    ownedAttributes.clear();
  };
  const restoreRegionPlacements=()=>{
    for(const [node,placement] of regionPlacements){
      if(!node?.isConnected||!placement.parent?.isConnected)continue;
      placement.parent.insertBefore(node,placement.next?.isConnected?placement.next:null);
    }
    regionPlacements.clear();
  };
  const decorateRegionTabs=(tabs,text)=>{
    const buttons=[...(tabs?.children||[])].filter(tab=>tab.matches?.('button'));
    const legendary=buttons.find(isLegendaryRegionTab)||null;
    for(const tab of buttons){
      if(!tab.matches?.('button'))continue;
      if(tab===legendary){
        ownClass(tab,'ppbui-hunts-region-legendary');
        ownAttribute(tab,'data-ppbui-region-note',text.weekend);
        ownAttribute(tab,'aria-description',text.weekendDescription);
      } else if(isCommonRegionTab(tab))ownClass(tab,'ppbui-hunts-region-common');
    }
    if(legendary&&legendary!==buttons.at(-1)){
      const preserveFocus=doc.activeElement===legendary;
      if(!regionPlacements.has(legendary))regionPlacements.set(legendary,{parent:tabs,next:legendary.nextSibling});
      tabs.append(legendary);
      if(preserveFocus&&doc.activeElement!==legendary)focusNode(legendary);
    }
  };
  const focusDescriptor=node=>{
    if(!node||!root.contains(node))return null;
    const current=parts(root);
    if(!current.current)return null;
    if(node.matches?.('.hunt-list-world-tab'))return {kind:'region',key:regionTabKey(node)};
    if(node===refinement.element)return {kind:'filters'};
    if(node.matches?.(selectors.favoriteToggle))return {kind:'favorite-toggle',key:node.dataset.ppbuiHuntFavoriteKey||''};
    if(node===current.search)return {kind:'search'};
    if(node===current.elements?.querySelector?.('select'))return {kind:'element'};
    if(node===current.sortField?.querySelector?.('select'))return {kind:'sort'};
    if(node===current.minLevel)return {kind:'level',index:0};
    if(node===current.maxLevel)return {kind:'level',index:1};
    if(node===current.clear)return {kind:'clear'};
    for(const [kind,group] of [['view',current.viewToggle],['presentation',current.presentation]]){
      const buttons=[...(group?.querySelectorAll?.('button')||[])],index=buttons.indexOf(node);
      if(index>=0)return {kind,index};
    }
    const mapButtons=[...(root.querySelectorAll?.('.hunt-region-controls > button')||[])],mapIndex=mapButtons.indexOf(node);
    if(mapIndex>=0)return {kind:'map-control',index:mapIndex};
    const row=node.closest?.('.hunt-list-row');
    if(row){
      const rows=[...root.querySelectorAll('.hunt-list-row')],rowIndex=rows.indexOf(row);
      if(rowIndex>=0&&node.matches?.('.hunt-list-hunt-button,.hunt-list-details-button')){
        return {kind:node.matches('.hunt-list-hunt-button')?'hunt':'details',index:rowIndex};
      }
    }
    return null;
  };
  const resolveFocus=descriptor=>{
    if(!descriptor)return null;
    const current=parts(root);
    if(!current.current)return null;
    if(descriptor.kind==='region')return [...(current.tabs?.querySelectorAll?.('button')||[])].find(button=>regionTabKey(button)===descriptor.key)||null;
    if(descriptor.kind==='filters')return refinement.element?.isConnected?refinement.element:null;
    if(descriptor.kind==='search')return current.search;
    if(descriptor.kind==='favorite-toggle')return [...root.querySelectorAll(selectors.favoriteToggle)].find(button=>button.dataset.ppbuiHuntFavoriteKey===descriptor.key)||null;
    if(descriptor.kind==='element')return current.elements?.querySelector?.('select')||null;
    if(descriptor.kind==='sort')return current.sortField?.querySelector?.('select')||null;
    if(descriptor.kind==='level')return descriptor.index===0?current.minLevel:current.maxLevel;
    if(descriptor.kind==='clear')return current.clear;
    if(descriptor.kind==='view'||descriptor.kind==='presentation'){
      const group=descriptor.kind==='view'?current.viewToggle:current.presentation;
      return group?.querySelectorAll?.('button')?.[descriptor.index]||null;
    }
    if(descriptor.kind==='map-control')return root.querySelectorAll?.('.hunt-region-controls > button')?.[descriptor.index]||null;
    if(descriptor.kind==='hunt'||descriptor.kind==='details'){
      const row=root.querySelectorAll?.('.hunt-list-row')?.[descriptor.index];
      return row?.querySelector?.(descriptor.kind==='hunt'?'.hunt-list-hunt-button':'.hunt-list-details-button')||null;
    }
    return null;
  };
  const onFocusIn=event=>{
    const descriptor=focusDescriptor(event.target);
    if(descriptor)lastFocused={node:event.target,descriptor};
  };
  root.addEventListener('focusin',onFocusIn);
  const scene=huntScene(root),startHuntDescriptor=scene?Object.getOwnPropertyDescriptor(scene,'startHunt'):undefined,originalStart=scene?.startHunt;
  let wrappedStart=null,active=true;
  if(scene&&typeof originalStart==='function'){
    wrappedStart=function(...args){
      const owner=this&&typeof this==='object'?this:scene,index=Number(owner?._selectedIndex);
      if(!active)return originalStart.apply(owner,args);
      const snapshot=Number.isInteger(index)&&index>=0?rememberActiveHuntZone(root,index):null;
      let result;
      try {result=originalStart.apply(owner,args);}
      catch(error){if(snapshot)forgetActiveHuntZone(view,snapshot);throw error;}
      if(result&&typeof result.then==='function'){
        return Promise.resolve(result).catch(error=>{if(snapshot)forgetActiveHuntZone(view,snapshot);throw error;});
      }
      return result;
    };
    scene.startHunt=wrappedStart;
  }
  const sync=()=>{
    if(!active)return;
    const restoreFocus=lastFocused&&!lastFocused.node?.isConnected&&
      (doc.activeElement===doc.body||doc.activeElement===root||!doc.activeElement)?lastFocused.descriptor:null;
    const next=parts(root);if(!next.current)return;
    for(const node of ownedClasses.keys())if(!node.isConnected)ownedClasses.delete(node);
    for(const node of ownedAttributes.keys())if(!node.isConnected)ownedAttributes.delete(node);
    for(const node of regionPlacements.keys())if(!node.isConnected)regionPlacements.delete(node);
    root.classList.toggle('ppbui-hunts-current-list',next.mode==='current-list');
    root.classList.toggle('ppbui-hunts-current-map',next.mode==='current-map');
    ownClass(next.viewToggle,'ppbui-hunts-view-toggle');
    ownClass(next.presentation,'ppbui-hunts-presentation-toggle');
    decorateRegionTabs(next.tabs,huntsText(doc));
    refinement.sync();favorites.sync();
    if(restoreFocus){
      const target=resolveFocus(restoreFocus);
      if(focusNode(target))lastFocused={node:target,descriptor:restoreFocus};
    }
  };
  sync();
  return {sync,cleanup(){
    if(!active)return;active=false;
    root.removeEventListener('focusin',onFocusIn);
    const focused=doc.activeElement,restoreFocusedNode=focused&&focused!==doc.body&&root.contains(focused)?focused:null;
    if(scene&&wrappedStart&&scene.startHunt===wrappedStart){
      if(startHuntDescriptor)Object.defineProperty(scene,'startHunt',startHuntDescriptor);
      else delete scene.startHunt;
    }
    favorites.cleanup();refinement.cleanup();restoreRegionPlacements();restoreOwnedAttributes();restoreOwnedClasses();
    style.remove();
    root.classList.remove('ppbui-hunts-current-list','ppbui-hunts-current-map','ppbui-hunts-current','ppbui-hunts-enhanced');
    if(restoreFocusedNode?.isConnected&&doc.activeElement!==restoreFocusedNode)focusNode(restoreFocusedNode);
  }};
}

function mountLegacyHunts(root) {
  const doc=root.ownerDocument;
  const titlebar=root.querySelector('.pokeidle-panel__titlebar');
  const titleNode=findTitleText(titlebar,doc.defaultView.Node);
  const nativeTitle=titleNode?.textContent??null,titleOwner=titleNode?.parentElement||null;
  const nativeTitleStyle=titleOwner?.getAttribute('style')??null,hadTitleClass=titleOwner?.classList.contains('ppbui-hunts-title')||false;
  if(titleNode)titleNode.textContent='HUNT ATLAS';
  if(titleOwner){
    titleOwner.classList.add('ppbui-hunts-title');
    titleOwner.style.removeProperty('font');
    titleOwner.style.setProperty('font-family','var(--ppbui-font-display)','important');
    titleOwner.style.setProperty('font-size','15px','important');
    titleOwner.style.setProperty('font-weight','500','important');
    titleOwner.style.setProperty('line-height','1.2','important');
    titleOwner.style.setProperty('letter-spacing','normal','important');
    titleOwner.style.setProperty('text-shadow','none','important');
  }
  // Hunts contains native map markers whose margin/padding/transform are part of map geometry.
  // Do not put the whole native window behind the generic ppbui-root native-control reset.
  root.classList.add('ppbui-hunts-enhanced');
  const focusTarget=parts(root).body;
  const hadBodyScroll=focusTarget?.classList.contains('ppbui-scroll')||false;
  focusTarget?.classList.add('ppbui-scroll');
  const focusTargetTabIndex=focusTarget?.getAttribute('tabindex');
  if(focusTarget&&!focusTarget.hasAttribute('tabindex'))focusTarget.setAttribute('tabindex','-1');
  const row=doc.createElement('div'),selectWrap=doc.createElement('span'),select=doc.createElement('select'),button=doc.createElement('button'),reset=doc.createElement('button'),status=doc.createElement('span');
  row.className='ppbui-hunts-results';row.dataset.ppbuiModule='hunts';
  selectWrap.className='ppbui-hunts-select-wrap';
  select.className='ppbui-select';button.className='ppbui-button';button.type='button';reset.className='ppbui-button ppbui-button--ghost';reset.type='button';
  selectWrap.append(select);status.setAttribute('role','status');row.append(selectWrap,button,reset,status);

  const style=doc.createElement('style');style.dataset.ppbuiModule='hunts';style.textContent=huntsStyles;
  root.append(style);

  let options=[],currentWorld,search=null,raw='',focused=false,selection=null,message='',focusFrame=0,flashTimer=0,located=null,selected=null,selectedNode=null,active=true,layout=null,controls=null,layoutBaseline=null,presentationPlacement=null,countPlacement=null;
  const adjustedLevelWorlds=new Set();
  let dossier;

  const clearFlash=()=>{doc.defaultView.clearTimeout(flashTimer);flashTimer=0;root.querySelectorAll('.ppbui-hunts-locate-flash').forEach(node=>node.classList.remove('ppbui-hunts-locate-flash'));};
  const flash=marker=>{clearFlash();marker.classList.add('ppbui-hunts-locate-flash');flashTimer=doc.defaultView.setTimeout(()=>{flashTimer=0;marker.classList.remove('ppbui-hunts-locate-flash');},800);};
  const zoneId=zone=>zone?.id===undefined||zone?.id===null?null:String(zone.id);
  function stateForMarker(scene,marker) {
    const index=Number(marker?.dataset.zoneIndex),zone=scene?._zones?.[index];
    if(!Number.isInteger(index)||!zone)return null;
    return {world:scene._tab,index:String(index),id:zoneId(zone),ref:zone};
  }
  function resolveState(state,scene,visibleNodes=null) {
    if(!state||!scene||state.world!==scene._tab||!Array.isArray(scene._zones))return null;
    let index=-1;
    if(state.id!==null)index=scene._zones.findIndex(zone=>zoneId(zone)===state.id);
    else index=scene._zones.indexOf(state.ref);
    if(index<0)return null;
    const marker=markers(root).find(node=>node.dataset.zoneIndex===String(index));
    if(!marker||visibleNodes&&!visibleNodes.includes(marker))return null;
    state.index=String(index);state.ref=scene._zones[index];
    return {marker,index,zone:scene._zones[index]};
  }
  const selectedMarker=()=>resolveState(selected,huntScene(root))?.marker||null;

  function navigationSnapshotForState(state,width,height,worldLayout) {
    if(!state||![state.scale,state.x,state.y,width,height,worldLayout?.width,worldLayout?.height].every(Number.isFinite)||
      state.scale<=0||width<=0||height<=0||worldLayout.width<=0||worldLayout.height<=0)return null;
    const coverScale=Math.max(width/worldLayout.width,height/worldLayout.height)*1.002;
    return {
      zoomRatio:state.scale/coverScale,
      centerX:(width/2-state.x)/state.scale,
      centerY:(height/2-state.y)/state.scale,
    };
  }

  function navigationSnapshot(scene,viewport,worldLayout) {
    return navigationSnapshotForState(scene?._worldMapState,viewport?.clientWidth,viewport?.clientHeight,worldLayout);
  }

  function stateForSnapshot(snapshot,viewport,worldLayout) {
    const width=viewport.clientWidth,height=viewport.clientHeight;
    if(!snapshot||width<=0||height<=0)return null;
    const coverScale=Math.max(width/worldLayout.width,height/worldLayout.height)*1.002;
    const scale=coverScale*Math.max(1,Math.min(4,snapshot.zoomRatio));
    const mapWidth=worldLayout.width*scale,mapHeight=worldLayout.height*scale;
    let x=width/2-snapshot.centerX*scale,y=height/2-snapshot.centerY*scale;
    x=mapWidth<=width?(width-mapWidth)/2:Math.max(width-mapWidth,Math.min(0,x));
    y=mapHeight<=height?(height-mapHeight)/2:Math.max(height-mapHeight,Math.min(0,y));
    return {scale,x,y};
  }

  function setInspectorLayout(open,scene=huntScene(root)) {
    const workspace=layout?.workspace;if(!workspace)return;
    const wasOpen=workspace.classList.contains('is-inspector-open');if(wasOpen===open){if(!open)layoutBaseline=null;return;}
    const before=parts(root),worldLayout=scene?._worldLayouts?.[scene?._tab],currentState=scene?._worldMapState;
    const continuingOpen=open&&!wasOpen&&layoutBaseline?.scene===scene&&layoutBaseline.world===scene?._tab&&layoutBaseline.openGeometry&&layoutBaseline.stateRef;
    let snapshot=continuingOpen
      ? navigationSnapshotForState(layoutBaseline.stateRef,layoutBaseline.openGeometry.width,layoutBaseline.openGeometry.height,layoutBaseline.openGeometry.worldLayout)
      : navigationSnapshot(scene,before.viewport,worldLayout);
    const unchangedFromOpen=!open&&layoutBaseline?.scene===scene&&layoutBaseline.world===scene?._tab&&layoutBaseline.expected&&currentState&&
      ['scale','x','y'].every(key=>Math.abs(currentState[key]-layoutBaseline.expected[key])<1e-7);
    if(unchangedFromOpen)snapshot=layoutBaseline.snapshot;
    workspace.classList.toggle('is-inspector-open',open);
    if(!snapshot){if(!open)layoutBaseline=null;return;}
    const current=parts(root),currentLayout=scene?._worldLayouts?.[scene?._tab],desired=stateForSnapshot(snapshot,current.viewport,currentLayout);
    if(!current.viewport||!current.stage||!currentLayout||!currentState||!desired||
      !['saveWorldMapState','setupWorldMapNavigation','_navigationCleanup'].every(key=>typeof scene[key]==='function')){
      if(!open)layoutBaseline=null;return;
    }
    if(currentState.scale!==desired.scale||currentState.x!==desired.x||currentState.y!==desired.y){
      scene._navigationCleanup();currentState.scale=desired.scale;currentState.x=desired.x;currentState.y=desired.y;
      try {scene.saveWorldMapState();}
      catch {
        // Layout preservation is UI-only and must not block selection when persistent storage is unavailable.
        if(scene._worldMapStates&&scene._tab)scene._worldMapStates[scene._tab]={...currentState};
      } finally {scene.setupWorldMapNavigation(current.viewport,current.stage,currentLayout);}
    }
    if(open)layoutBaseline={scene,world:scene._tab,snapshot,expected:{...scene._worldMapState},stateRef:scene._worldMapState,openGeometry:{width:current.viewport.clientWidth,height:current.viewport.clientHeight,worldLayout:{width:currentLayout.width,height:currentLayout.height}}};
    else layoutBaseline=null;
  }

  function clearSelectionState() {
    selected=null;selectedNode=null;dossier?.reset();
    setInspectorLayout(false);
  }
  function closeDossier(returnFocus=true) {
    if(!active)return;
    const marker=selectedMarker();clearSelectionState();select.value='';message='';sync();
    if(returnFocus&&marker?.isConnected)marker.focus({preventScroll:true});
  }
  function startSelectedHunt() {
    const scene=huntScene(root),resolved=resolveState(selected,scene,results(root));
    if(!active||!scene||!resolved||typeof scene.startHunt!=='function')return;
    const {index}=resolved;
    const activeZone=rememberActiveHuntZone(root,index);
    scene.hideDropTooltip?.();scene._selectedIndex=index;dossier.huntButton.disabled=true;dossier.huntButton.setAttribute('aria-busy','true');
    const done=()=>{if(!active)return;dossier.huntButton.disabled=false;dossier.huntButton.removeAttribute('aria-busy');};
    const failed=()=>{if(activeZone)forgetActiveHuntZone(doc.defaultView,activeZone);done();};
    try {Promise.resolve(scene.startHunt()).then(done,failed);} catch {failed();}
  }
  dossier=createHuntInspector(doc,{onClose:()=>closeDossier(true),onHunt:startSelectedHunt});

  function restoreCount() {
    if(!countPlacement)return;
    const {node,anchor}=countPlacement;
    if(anchor.isConnected&&node.isConnected&&row.contains(node))anchor.replaceWith(node);
    else {
      if(row.contains(node))node.remove();
      anchor.remove();
    }
    countPlacement=null;
  }
  function placeCount(node) {
    if(!node){restoreCount();return;}
    if(countPlacement?.node===node&&row.contains(node))return;
    restoreCount();
    const anchor=doc.createComment('ppbui-hunts-count');node.before(anchor);row.append(node);countPlacement={node,anchor};
  }
  function teardownControls(restore=true) {
    if(!controls)return;
    const {wrapper,toolbar,elements,toolbarAnchor,elementsAnchor}=controls;
    restoreCount();row.remove();
    if(restore&&toolbarAnchor.isConnected&&toolbar.isConnected&&wrapper.contains(toolbar))toolbarAnchor.replaceWith(toolbar);
    else toolbarAnchor.remove();
    if(elementsAnchor){
      if(restore&&elementsAnchor.isConnected&&elements?.isConnected&&wrapper.contains(elements))elementsAnchor.replaceWith(elements);
      else elementsAnchor.remove();
    }
    wrapper.remove();controls=null;
  }
  function ensureControls(toolbar,elements) {
    if(controls?.toolbar===toolbar&&controls?.elements===elements&&controls.wrapper.isConnected)return;
    teardownControls(true);
    const toolbarAnchor=doc.createComment('ppbui-hunts-toolbar'),elementsAnchor=elements?doc.createComment('ppbui-hunts-elements'):null,wrapper=doc.createElement('div');
    wrapper.className='ppbui-hunts-finder';wrapper.dataset.ppbuiModule='hunts';
    toolbar.before(toolbarAnchor);if(elements)elements.before(elementsAnchor);toolbarAnchor.after(wrapper);
    wrapper.append(toolbar);if(elements)wrapper.append(elements);wrapper.append(row);
    controls={wrapper,toolbar,elements,toolbarAnchor,elementsAnchor};
  }

  function teardownWorkspace(restore=true) {
    if(!layout)return;
    const {workspace,viewport,anchor}=layout;
    if(restore&&anchor.isConnected&&viewport.isConnected&&workspace.contains(viewport))anchor.after(viewport);
    workspace.remove();anchor.remove();layout=null;
  }
  function ensureWorkspace(viewport) {
    if(layout?.viewport===viewport&&layout.workspace.isConnected)return;
    teardownWorkspace(true);
    const anchor=doc.createComment('ppbui-hunts-viewport'),workspace=doc.createElement('div');
    workspace.className='ppbui-hunts-atlas-workspace';workspace.dataset.ppbuiModule='hunts';
    viewport.before(anchor);anchor.after(workspace);workspace.append(viewport,dossier.element);layout={workspace,viewport,anchor};
  }
  function restorePresentation() {
    if(!presentationPlacement)return;
    const {node,anchor}=presentationPlacement;
    if(anchor.isConnected&&node.isConnected&&dossier.modeSlot.contains(node))anchor.replaceWith(node);
    else {
      if(dossier.modeSlot.contains(node))node.remove();
      anchor.remove();
    }
    presentationPlacement=null;
  }
  function placePresentation(node) {
    if(!node)return;
    if(presentationPlacement?.node===node&&dossier.modeSlot.contains(node))return;
    restorePresentation();
    const anchor=doc.createComment('ppbui-hunts-presentation');node.before(anchor);dossier.modeSlot.append(node);presentationPlacement={node,anchor};
  }

  function isJohto(scene,world) {
    const config=scene?.tabConfig?.(world)||scene?._worlds?.find?.(entry=>entry?.id===world);
    return [world,config?.id,config?.label,config?.name].some(value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes('johto'));
  }
  function remember(event) {
    if(event.target===search){raw=event.target.value;focused=doc.activeElement===event.target;selection=[event.target.selectionStart,event.target.selectionEnd];}
  }
  function focus(event){focused=event.target===parts(root).search;if(focused)remember(event);}

  function selectMarker(marker,{keyboard=false}={}) {
    const scene=huntScene(root),nextState=stateForMarker(scene,marker);
    if(!scene||!nextState||!results(root).includes(marker))return false;
    selected=nextState;selectedNode=marker;message='';scene.hideDropTooltip?.();
    const entry=options.find(item=>item.node===marker);if(entry)select.value=entry.option.value;
    sync();
    if(keyboard&&!dossier.element.hidden)dossier.element.focus({preventScroll:true});
    else marker.focus({preventScroll:true});
    return true;
  }
  const interactions=createHuntMarkerInteractions(root,selectMarker,selectors.marker);

  function focusAfterAutoClose(previousState,previousMarker,scene,nodes) {
    const validMarker=previousMarker?.isConnected&&resolveState(previousState,scene,nodes)?.marker===previousMarker?previousMarker:null;
    const target=validMarker||select.isConnected&&!select.disabled&&select||search?.isConnected&&!search.disabled&&search||focusTarget?.isConnected&&focusTarget;
    target?.focus?.({preventScroll:true});
  }

  function sync() {
    if(!active)return;
    const next=parts(root),text=huntsText(doc),scene=huntScene(root),world=scene?._tab;
    if(!next.toolbar||!next.viewport){row.remove();interactions.sync([]);return;}
    if(next.header&&!next.header.classList.contains('ppbui-hunts-atlas-rail'))next.header.classList.add('ppbui-hunts-atlas-rail');
    ensureControls(next.toolbar,next.elements);placeCount(next.count);ensureWorkspace(next.viewport);placePresentation(next.presentation);scene?.hideDropTooltip?.();
    if(search&&next.search!==search&&currentWorld===world&&next.search){
      if(next.search.value.trim().toLowerCase()===raw.trim().toLowerCase())next.search.value=raw;
      if(focused&&doc.activeElement===doc.body){next.search.focus({preventScroll:true});if(selection)next.search.setSelectionRange(...selection);}
    }
    let autoCloseFocus=null;
    if(world!==currentWorld){
      if(selected)autoCloseFocus={state:selected,node:selectedNode};
      clearFlash();select.value='';message='';located=null;clearSelectionState();
    }
    currentWorld=world;search=next.search;
    if(isJohto(scene,world)&&next.minLevel){
      if(next.minLevel.min!=='1')next.minLevel.min='1';
      if(!adjustedLevelWorlds.has(world)){
        adjustedLevelWorlds.add(world);const saved=Number(scene?._levelRanges?.[world]?.min);
        if(Number(next.minLevel.value)>=100&&(!Number.isFinite(saved)||saved>=100)){next.minLevel.value='1';next.minLevel.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));}
      }
    }
    if(search)raw=search.value;

    const nodes=results(root),allMarkers=markers(root),previous=options.find(entry=>entry.option.value===select.value)?.node,labels=nodes.map(markerLabel);
    if(options.length!==nodes.length||options.some((entry,i)=>entry.node!==nodes[i]||entry.label!==labels[i])){
      const oldIndex=previous?.dataset.zoneIndex;
      select.replaceChildren();const placeholder=doc.createElement('option');placeholder.value='';select.append(placeholder);
      options=nodes.map((node,index)=>{const option=doc.createElement('option');option.value=String(index);option.textContent=labels[index];select.append(option);return {node,option,label:labels[index]};});
      const match=oldIndex!==undefined?options.find(entry=>entry.node.dataset.zoneIndex===oldIndex):null;select.value=match?.option.value||'';message='';
    }
    if(!select.firstChild){const option=doc.createElement('option');option.value='';select.append(option);}
    const caption=`${text.results} (${nodes.length})`;if(select.firstChild.textContent!==caption)select.firstChild.textContent=caption;
    if(select.getAttribute('aria-label')!==text.results)select.setAttribute('aria-label',text.results);
    if(button.textContent!==text.locate)button.textContent=text.locate;if(reset.textContent!==text.reset)reset.textContent=text.reset;

    interactions.sync(allMarkers);
    const selectedResolution=resolveState(selected,scene,nodes),activeSelected=selectedResolution?.marker||null;
    if(selected&&!activeSelected){autoCloseFocus={state:selected,node:selectedNode};clearSelectionState();select.value='';}
    else if(activeSelected){selectedNode=activeSelected;const entry=options.find(item=>item.node===activeSelected);if(entry&&select.value!==entry.option.value)select.value=entry.option.value;}
    const locatedResolution=resolveState(located,scene,nodes);let activeLocated=locatedResolution?.marker||null;
    if(located&&!activeLocated){located=null;clearFlash();}
    allMarkers.forEach(marker=>{
      const isSelected=marker===activeSelected,isLocated=marker===activeLocated,label=marker.querySelector(selectors.label);
      marker.classList.toggle('ppbui-hunts-selected-marker',isSelected);marker.classList.toggle('ppbui-hunts-located-marker',isLocated);marker.classList.toggle('ppbui-hunts-dimmed-marker',Boolean(activeLocated&&!isLocated));
      label?.classList.toggle('ppbui-hunts-selected',isSelected);label?.classList.toggle('ppbui-hunts-located',isLocated);label?.classList.toggle('ppbui-hunts-dimmed',Boolean(activeLocated&&!isLocated&&!isSelected));
    });
    if(activeSelected){
      const {index,zone}=selectedResolution;
      if(zone){dossier.render(scene,zone,selected.id??`index:${index}`);dossier.setOpen(true);setInspectorLayout(true,scene);}
    } else {dossier.setOpen(false);setInspectorLayout(false,scene);}

    const disabled=select.value===''||!nodes.length;if(button.disabled!==disabled)button.disabled=disabled;
    const canReset=Boolean(activeLocated||activeSelected);if(reset.disabled!==!canReset)reset.disabled=!canReset;
    if(select.disabled!==!nodes.length)select.disabled=!nodes.length;
    const feedback=!nodes.length?text.empty:(message?text[message]:disabled?text.choose:'');if(status.textContent!==feedback)status.textContent=feedback;
    if(autoCloseFocus)focusAfterAutoClose(autoCloseFocus.state,autoCloseFocus.node,scene,nodes);
  }

  function update(){if(!active)return;message='';sync();}
  const onLocate=()=>{
    if(!active)return;
    const entry=options.find(item=>item.option.value===select.value);if(!entry)return;
    selectMarker(entry.node);
    let success=false;try{success=Boolean(locateHunt(root,entry.node));}catch{success=false;}
    message=success?'located':'unavailable';located=success?stateForMarker(huntScene(root),entry.node):null;sync();
    if(success)flash(entry.node);else clearFlash();doc.defaultView.cancelAnimationFrame(focusFrame);
    if(success)focusFrame=doc.defaultView.requestAnimationFrame(()=>{focusFrame=0;if(active&&results(root).includes(entry.node))entry.node.focus({preventScroll:true});});
  };
  const onReset=()=>{if(!active)return;clearFlash();located=null;message='';select.value='';clearSelectionState();sync();select.focus({preventScroll:true});};
  select.addEventListener('change',update);
  button.addEventListener('click',onLocate);
  reset.addEventListener('click',onReset);
  const onKeydown=event=>{if(event.key==='Escape'&&selected){event.stopPropagation();closeDossier(true);}};
  root.addEventListener('input',remember,true);root.addEventListener('select',remember,true);root.addEventListener('focusin',focus);root.addEventListener('input',update);root.addEventListener('click',sync);root.addEventListener('keydown',onKeydown);
  sync();

  return {sync,cleanup(){
    if(!active)return;active=false;clearFlash();let restoreError=null;try{setInspectorLayout(false);}catch(error){restoreError=error;}layoutBaseline=null;doc.defaultView.cancelAnimationFrame(focusFrame);interactions.cleanup();
    select.removeEventListener('change',update);button.removeEventListener('click',onLocate);reset.removeEventListener('click',onReset);
    root.removeEventListener('input',remember,true);root.removeEventListener('select',remember,true);root.removeEventListener('focusin',focus);root.removeEventListener('input',update);root.removeEventListener('click',sync);root.removeEventListener('keydown',onKeydown);
    root.querySelectorAll('.ppbui-hunts-atlas-rail').forEach(node=>node.classList.remove('ppbui-hunts-atlas-rail'));
    root.querySelectorAll('.ppbui-hunts-selected-marker').forEach(node=>node.classList.remove('ppbui-hunts-selected-marker'));root.querySelectorAll('.ppbui-hunts-located-marker').forEach(node=>node.classList.remove('ppbui-hunts-located-marker'));root.querySelectorAll('.ppbui-hunts-dimmed-marker').forEach(node=>node.classList.remove('ppbui-hunts-dimmed-marker'));
    root.querySelectorAll('.ppbui-hunts-selected').forEach(node=>node.classList.remove('ppbui-hunts-selected'));root.querySelectorAll('.ppbui-hunts-located').forEach(node=>node.classList.remove('ppbui-hunts-located'));root.querySelectorAll('.ppbui-hunts-dimmed').forEach(node=>node.classList.remove('ppbui-hunts-dimmed'));
    restorePresentation();teardownWorkspace(true);teardownControls(true);dossier.element.remove();row.remove();style.remove();root.classList.remove('ppbui-hunts-enhanced');if(focusTarget&&!hadBodyScroll)focusTarget.classList.remove('ppbui-scroll');
    if(titleNode?.isConnected&&nativeTitle!==null)titleNode.textContent=nativeTitle;
    if(titleOwner){
      if(nativeTitleStyle===null)titleOwner.removeAttribute('style');else titleOwner.setAttribute('style',nativeTitleStyle);
      if(!hadTitleClass)titleOwner.classList.remove('ppbui-hunts-title');
    }
    if(focusTarget){if(focusTargetTabIndex===null)focusTarget.removeAttribute('tabindex');else focusTarget.setAttribute('tabindex',focusTargetTabIndex);}
    if(restoreError)throw restoreError;
  }};
}

export function mountHunts(root,{favoritesStore}={}) {
  const store=favoritesStore||createHuntFavoritesStore({storage:()=>root.ownerDocument.defaultView?.localStorage});
  return parts(root).current?mountCurrentHunts(root,store):mountLegacyHunts(root);
}
