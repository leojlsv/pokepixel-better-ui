import {parts,results,markers,markerLabel,huntsText,huntScene,selectors} from './dom.js';
import {locateHunt} from './navigation.js';
import {createHuntInspector} from './dossier.js';
import {createHuntMarkerInteractions} from './interaction.js';
import {huntsStyles} from './styles.js';

export function mountHunts(root) {
  const doc=root.ownerDocument;
  root.classList.add('ppbui-hunts-enhanced');
  const focusTarget=parts(root).body;
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
    const marker=selectedMarker();clearSelectionState();select.value='';message='';sync();
    if(returnFocus&&marker?.isConnected)marker.focus({preventScroll:true});
  }
  function startSelectedHunt() {
    const scene=huntScene(root),resolved=resolveState(selected,scene,results(root));
    if(!active||!scene||!resolved||typeof scene.startHunt!=='function')return;
    const {index}=resolved;
    scene.hideDropTooltip?.();scene._selectedIndex=index;dossier.huntButton.disabled=true;dossier.huntButton.setAttribute('aria-busy','true');
    const done=()=>{if(!active)return;dossier.huntButton.disabled=false;dossier.huntButton.removeAttribute('aria-busy');};
    try {Promise.resolve(scene.startHunt()).then(done,done);} catch {done();}
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
      marker.classList.toggle('ppbui-hunts-selected-marker',isSelected);marker.classList.toggle('ppbui-hunts-located-marker',isLocated);
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

  function update(){message='';sync();}
  select.addEventListener('change',update);
  button.addEventListener('click',()=>{
    const entry=options.find(item=>item.option.value===select.value);if(!entry)return;
    selectMarker(entry.node);
    let success=false;try{success=Boolean(locateHunt(root,entry.node));}catch{success=false;}
    message=success?'located':'unavailable';located=success?stateForMarker(huntScene(root),entry.node):null;sync();
    if(success)flash(entry.node);else clearFlash();doc.defaultView.cancelAnimationFrame(focusFrame);
    if(success)focusFrame=doc.defaultView.requestAnimationFrame(()=>{focusFrame=0;if(results(root).includes(entry.node))entry.node.focus({preventScroll:true});});
  });
  reset.addEventListener('click',()=>{clearFlash();located=null;message='';select.value='';clearSelectionState();sync();select.focus({preventScroll:true});});
  const onKeydown=event=>{if(event.key==='Escape'&&selected){event.stopPropagation();closeDossier(true);}};
  root.addEventListener('input',remember,true);root.addEventListener('select',remember,true);root.addEventListener('focusin',focus);root.addEventListener('input',update);root.addEventListener('click',sync);root.addEventListener('keydown',onKeydown);
  sync();

  return {sync,cleanup(){
    active=false;clearFlash();try{setInspectorLayout(false);}catch{}layoutBaseline=null;doc.defaultView.cancelAnimationFrame(focusFrame);interactions.cleanup();
    root.removeEventListener('input',remember,true);root.removeEventListener('select',remember,true);root.removeEventListener('focusin',focus);root.removeEventListener('input',update);root.removeEventListener('click',sync);root.removeEventListener('keydown',onKeydown);
    root.querySelectorAll('.ppbui-hunts-atlas-rail').forEach(node=>node.classList.remove('ppbui-hunts-atlas-rail'));
    root.querySelectorAll('.ppbui-hunts-selected-marker').forEach(node=>node.classList.remove('ppbui-hunts-selected-marker'));root.querySelectorAll('.ppbui-hunts-located-marker').forEach(node=>node.classList.remove('ppbui-hunts-located-marker'));
    root.querySelectorAll('.ppbui-hunts-selected').forEach(node=>node.classList.remove('ppbui-hunts-selected'));root.querySelectorAll('.ppbui-hunts-located').forEach(node=>node.classList.remove('ppbui-hunts-located'));root.querySelectorAll('.ppbui-hunts-dimmed').forEach(node=>node.classList.remove('ppbui-hunts-dimmed'));
    restorePresentation();teardownWorkspace(true);teardownControls(true);dossier.element.remove();row.remove();style.remove();root.classList.remove('ppbui-hunts-enhanced');
    if(focusTarget){if(focusTargetTabIndex===null)focusTarget.removeAttribute('tabindex');else focusTarget.setAttribute('tabindex',focusTargetTabIndex);}
  }};
}
