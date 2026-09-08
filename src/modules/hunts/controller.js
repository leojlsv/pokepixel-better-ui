import {parts, results, markerLabel, huntsText, huntScene, selectors} from './dom.js';
import {locateHunt} from './navigation.js';
import {enhanceHuntTooltip,cleanupHuntTooltip} from './tooltip.js';

export function mountHunts(root) {
  const doc=root.ownerDocument, row=doc.createElement('div'), select=doc.createElement('select'), button=doc.createElement('button'), reset=doc.createElement('button'), status=doc.createElement('span');
  row.className='hunt-world-toolbar ppbui-hunts-results';row.dataset.ppbuiModule='hunts';
  select.className='game-window__select';button.className='pokeidle-btn';button.type='button';reset.className='pokeidle-btn';reset.type='button';
  status.setAttribute('role','status');
  row.append(select,button,reset,status);
  const style=doc.createElement('style');style.dataset.ppbuiModule='hunts';
  style.textContent=`
    .ppbui-hunts-results { flex:0 0 auto; min-width:0; }
    .ppbui-hunts-results > select { flex:1 1 0; min-width:0; }
    .ppbui-hunts-results > button { flex:0 0 auto; }
    .ppbui-hunts-results > [role="status"] { flex:1 1 0; min-width:0; font:inherit; }
    .hunt-map-marker.ppbui-hunts-located-marker { z-index:20; }
    .hunt-map-marker__name.ppbui-hunts-located { border-color:var(--ui-gold-light,#f1d681); background:#141416ed; color:var(--ui-gold-light,#f1d681); opacity:1; }
    .hunt-map-marker__name.ppbui-hunts-dimmed { opacity:.35; }
    .hunt-map-marker.ppbui-hunts-locate-flash > .hunt-map-marker__sprite { animation:ppbui-hunts-locate-flash .8s cubic-bezier(.23,1,.32,1) 1 !important; }
    @keyframes ppbui-hunts-locate-flash {
      0%,100% { filter:drop-shadow(0 2px 1px #000) drop-shadow(0 0 5px var(--marker-color)); }
      45% { filter:brightness(1.35) saturate(1.15) drop-shadow(0 2px 1px #000) drop-shadow(0 0 14px var(--ui-gold-light,#f1d681)); }
    }
    @media (prefers-reduced-motion:reduce) { .hunt-map-marker.ppbui-hunts-locate-flash > .hunt-map-marker__sprite { animation:none !important; } }
    .hunt-world-drop-tooltip { max-height:min(440px,calc(100vh - 16px)); }
    .hunt-world-drop-tooltip .hunt-drop-tooltip__elements,
    .ppbui-hunts-relation { grid-template-columns:52px minmax(0,1fr); column-gap:8px; }
    .ppbui-hunts-relation { display:grid; align-items:start; margin:0 0 6px; }
    .ppbui-hunts-relation > .hunt-drop-tooltip__elements-label { display:flex; align-items:center; min-height:25px; }
    .ppbui-hunts-relation-badge { padding:2px 6px 2px 3px; }
    .ppbui-hunts-relation-badge > b { color:#f1d681; font-variant-numeric:tabular-nums; }
    .ppbui-hunts-section-title { margin:8px 0; padding-top:8px; border-top:1px solid rgba(241,214,129,.18); color:#aaa7a1; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; }
    .hunt-world-drop-tooltip .hunt-drop-tooltip__list { grid-template-columns:repeat(2,minmax(0,1fr)); }
    .hunt-world-drop-tooltip .hunt-drop-tooltip__item { display:flex; min-height:34px; gap:5px; }
    .hunt-drop-tooltip__item > .ppbui-hunts-drop-value { display:inline-flex; flex:0 0 auto; align-items:center; gap:2px; min-width:0; margin:0; color:#f1d681; font-variant-numeric:tabular-nums; overflow:visible; white-space:nowrap; }
    .hunt-drop-tooltip__item > .ppbui-hunts-drop-value * { overflow:visible; text-overflow:clip; }
  `;
  root.append(style);
  let options=[], currentWorld, search=null, raw='', focused=false, selection=null, message='', focusFrame=0, flashTimer=0, located=null, tooltipMarker=null, active=true;
  const adjustedLevelWorlds=new Set();
  function isJohto(scene,world) {
    const config=scene?.tabConfig?.(world)||scene?._worlds?.find?.(entry=>entry?.id===world);
    return [world,config?.id,config?.label,config?.name].some(value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes('johto'));
  }
  function remember(event) {
    if(event.target===search) {
      raw=event.target.value;focused=doc.activeElement===event.target;
      selection=[event.target.selectionStart,event.target.selectionEnd];
    }
  }
  function focus(event) { focused=event.target===parts(root).search; if(focused)remember(event); }
  function clearFlash() {doc.defaultView.clearTimeout(flashTimer);flashTimer=0;root.querySelectorAll('.ppbui-hunts-locate-flash').forEach(node=>node.classList.remove('ppbui-hunts-locate-flash'));}
  function flash(marker) {clearFlash();marker.classList.add('ppbui-hunts-locate-flash');flashTimer=doc.defaultView.setTimeout(()=>{flashTimer=0;marker.classList.remove('ppbui-hunts-locate-flash');},800);}
  function sync() {
    const next=parts(root), text=huntsText(doc), scene=huntScene(root), world=scene?._tab;
    if(!next.toolbar || !next.viewport) {row.remove();return;}
    if(search && next.search!==search && currentWorld===world && next.search) {
      // Preserve the user's original casing/caret; the native handler already owns the normalized query.
      if(next.search.value.trim().toLowerCase()===raw.trim().toLowerCase()) next.search.value=raw;
      if(focused && doc.activeElement===doc.body) {
        next.search.focus({preventScroll:true});
        if(selection)next.search.setSelectionRange(...selection);
      }
    }
    if(world!==currentWorld) {clearFlash();select.value='';message='';located=null;}
    currentWorld=world;search=next.search;
    if(isJohto(scene,world)&&next.minLevel) {
      if(next.minLevel.min!=='1')next.minLevel.min='1';
      if(!adjustedLevelWorlds.has(world)) {
        adjustedLevelWorlds.add(world);
        const saved=Number(scene?._levelRanges?.[world]?.min);
        if(Number(next.minLevel.value)>=100&&(!Number.isFinite(saved)||saved>=100)) {
          next.minLevel.value='1';
          next.minLevel.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));
        }
      }
    }
    if(search)raw=search.value;
    if(row.previousElementSibling!==next.toolbar) next.toolbar.after(row);
    const nodes=results(root), selected=options.find(entry=>entry.option.value===select.value)?.node;
    const labels=nodes.map(markerLabel);
    if(options.length!==nodes.length || options.some((entry,i)=>entry.node!==nodes[i] || entry.label!==labels[i])) {
      const oldIndex=selected?.dataset.zoneIndex;
      select.replaceChildren();const placeholder=doc.createElement('option');placeholder.value='';select.append(placeholder);
      options=nodes.map((node,index)=>{const option=doc.createElement('option');option.value=String(index);option.textContent=labels[index];select.append(option);return {node,option,label:labels[index]};});
      const match=currentWorld===world && oldIndex!==undefined ? options.filter(entry=>entry.node.dataset.zoneIndex===oldIndex) : [];
      if(match.length===1)select.value=match[0].option.value;
      message='';
    }
    if(!select.firstChild) {const option=doc.createElement('option');option.value='';select.append(option);}
    const caption=`${text.results} (${nodes.length})`;
    if(select.firstChild.textContent!==caption)select.firstChild.textContent=caption;
    if(select.getAttribute('aria-label')!==text.results)select.setAttribute('aria-label',text.results);
    if(button.textContent!==text.locate)button.textContent=text.locate;
    if(reset.textContent!==text.reset)reset.textContent=text.reset;
    const disabled=select.value==='' || !nodes.length;
    if(button.disabled!==disabled)button.disabled=disabled;
    const hasLocated=located?.world===world;
    if(reset.disabled===hasLocated)reset.disabled=!hasLocated;
    if(select.disabled!==!nodes.length)select.disabled=!nodes.length;
    const feedback=!nodes.length?text.empty:(message ? text[message] : disabled?text.choose:'');
    if(status.textContent!==feedback)status.textContent=feedback;
    const markers=[...root.querySelectorAll(selectors.marker)], activeMarker=located?.world===world?markers.find(node=>node.dataset.zoneIndex===located.index):null;
    markers.forEach(marker=>{const match=marker===activeMarker,label=marker.querySelector(selectors.label);marker.classList.toggle('ppbui-hunts-located-marker',match);label?.classList.toggle('ppbui-hunts-located',match);label?.classList.toggle('ppbui-hunts-dimmed',Boolean(activeMarker&&!match));});
    if(tooltipMarker)enhanceHuntTooltip(root,tooltipMarker);
  }
  function update(){message='';sync();}
  select.addEventListener('change',update);
  button.addEventListener('click',()=>{
    const entry=options.find(entry=>entry.option.value===select.value);
    let success=false;
    try {success=Boolean(entry && locateHunt(root,entry.node));} catch {success=false;}
    message=success?'located':'unavailable';
    located=success?{world:currentWorld,index:entry.node.dataset.zoneIndex}:null;
    sync();
    if(success)flash(entry.node);else clearFlash();
    doc.defaultView.cancelAnimationFrame(focusFrame);
    if(success)focusFrame=doc.defaultView.requestAnimationFrame(()=>{
      focusFrame=0;
      if(results(root).includes(entry.node))entry.node.focus({preventScroll:true});
    });
  });
  reset.addEventListener('click',()=>{clearFlash();located=null;message='';select.value='';sync();select.focus({preventScroll:true});});
  root.addEventListener('input',remember,true);
  root.addEventListener('select',remember,true);
  root.addEventListener('focusin',focus);
  root.addEventListener('input',update);
  root.addEventListener('click',sync);
  function tooltipEnter(event){const marker=event.target.closest?.(selectors.marker);if(marker){tooltipMarker=marker;enhanceHuntTooltip(root,marker);doc.defaultView.queueMicrotask(()=>{if(active&&tooltipMarker===marker)enhanceHuntTooltip(root,marker);});}}
  function tooltipLeave(event){const marker=event.target.closest?.(selectors.marker);if(marker&&!marker.contains(event.relatedTarget))tooltipMarker=null;}
  root.addEventListener('pointerover',tooltipEnter);root.addEventListener('focusin',tooltipEnter);root.addEventListener('pointerout',tooltipLeave);root.addEventListener('focusout',tooltipLeave);
  sync();
  return {sync,cleanup(){active=false;clearFlash();doc.defaultView.cancelAnimationFrame(focusFrame);root.removeEventListener('input',remember,true);root.removeEventListener('select',remember,true);root.removeEventListener('focusin',focus);root.removeEventListener('input',update);root.removeEventListener('click',sync);root.removeEventListener('pointerover',tooltipEnter);root.removeEventListener('focusin',tooltipEnter);root.removeEventListener('pointerout',tooltipLeave);root.removeEventListener('focusout',tooltipLeave);cleanupHuntTooltip(doc);row.remove();style.remove();}};
}
