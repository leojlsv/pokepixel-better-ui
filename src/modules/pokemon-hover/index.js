export function hoverText(doc=document) {
  const pt=(doc.defaultView.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en").startsWith("pt");
  return pt ? {name:"Desativar hover dos Pokémon",description:"Oculta os detalhes ao passar o mouse. Clique direito continua disponível."} : {name:"Disable Pokémon hover",description:"Hide details on hover. Right-click remains available."};
}
export function createPokemonHoverModule(doc=globalThis.document) {
  return {id:"disable-pokemon-hover",shouldMount:()=>!!doc.body,mount(){
    const style=doc.createElement("style");style.dataset.ppbuiStyle="pokemon-hover";
    doc.body.setAttribute("data-ppbui-pokemon-hover-disabled", "");
    // The native pinned card is a separate surface and must remain visible.
    style.textContent=".pokemon-card--hover { display:none !important; }";doc.head.append(style);
    doc.defaultView.PokeIdle?.PokemonCard?.hideHover?.();
    const suppress=event=>{
      for(let node=event.target;node && node!==doc;node=node.parentNode){
        if(node.__pokeIdleCardBound){event.stopImmediatePropagation();return;}
      }
    };
    // Stop bound hover work before rendering; CSS also covers imperative hover callers.
    const events=["pointerenter","pointermove","focus"];
    events.forEach(type=>doc.addEventListener(type,suppress,true));
    return ()=>{events.forEach(type=>doc.removeEventListener(type,suppress,true));style.remove();doc.body.removeAttribute("data-ppbui-pokemon-hover-disabled");doc.defaultView.PokeIdle?.PokemonCard?.hideHover?.();};
  }};
}
