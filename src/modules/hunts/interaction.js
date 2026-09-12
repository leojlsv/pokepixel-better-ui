export function createHuntMarkerInteractions(root,onSelect,selector='.hunt-map-marker[data-zone-index]') {
  const markerFrom=event=>{
    const marker=event.target?.closest?.(selector);
    return marker&&root.contains(marker)?marker:null;
  };
  const suppressInfo=event=>{if(markerFrom(event))event.stopImmediatePropagation();};
  const select=event=>{
    const marker=markerFrom(event);if(!marker)return;
    if(event.button!==undefined&&event.button!==0)return;
    event.preventDefault();event.stopImmediatePropagation();onSelect(marker,{keyboard:event.detail===0});
  };

  root.addEventListener('pointerenter',suppressInfo,true);
  root.addEventListener('focus',suppressInfo,true);
  root.addEventListener('click',select,true);

  return {
    sync() {},
    cleanup() {
      root.removeEventListener('pointerenter',suppressInfo,true);
      root.removeEventListener('focus',suppressInfo,true);
      root.removeEventListener('click',select,true);
    },
  };
}
