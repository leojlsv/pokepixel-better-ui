// Offline visual fixture for the approved single-click workflow. Never loads PokePixel.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {JSDOM} from 'jsdom';
import {createPptoolsOneclickWidget} from '../src/modules/hunts/pptools-oneclick-widget.js';

const output=resolve(process.argv[2]||'tools/coupled-workspace-webview2/bin/smoke/visual/pptools-oneclick.html');
const widths=[235,410,680],states=['idle','running','result','failed'];
const resultJson=JSON.stringify({
  schema:'ppbui.pptools.hunt-recommendations',version:1,
  source:{url:'https://www.pptools.com.br/hunt-analyzer',capturedAt:new Date().toISOString(),sort:{key:'xp',direction:'desc'},filter:'',scope:{kind:'all-results',page:null}},
  attacker:{speciesId:null,speciesNameText:null,level:null},
  recommendations:[
    {rank:1,wildSpeciesName:'Gengar',huntName:'Pokémon Tower',wildLevelText:'85',wildLevel:85,xpPerHourText:'120.000',goldPerHourText:'14.300'},
    {rank:2,wildSpeciesName:'Pikachu',huntName:'Viridian Forest',wildLevelText:'20',wildLevel:20,xpPerHourText:'103.500',goldPerHourText:'9.200'},
    {rank:3,wildSpeciesName:'Geodude',huntName:'Rock Tunnel',wildLevelText:'40',wildLevel:40,xpPerHourText:'97.300',goldPerHourText:'10.500'},
  ],
});

async function render(width,state){
  const dom=new JSDOM(`<!doctype html><html lang="pt-BR"><body>
    <section class="hunt-window ppbui-hunts-enhanced" style="width:${width}px">
      <div class="pokeidle-panel__titlebar">HUNT ATLAS</div>
      <div class="pokeidle-panel__body"><div class="hunt-list-toolbar"><input type="search" placeholder="Buscar hunt"/></div></div>
    </section><div class="pokeidle-team-hud" hidden></div></body></html>`,{url:'https://fixture.invalid/',pretendToBeVisual:true});
  const win=dom.window,doc=win.document,root=doc.querySelector('.hunt-window');
  const creatures=[{id:'leader-a',name:'Entei',species_id:'entei',level:32,is_leader:true,
    quality:'legendary',quality_multiplier:1.62,nature:'hardy',gender:'male',is_shiny:false,
    ivs:{hp:18,atk:17,def:13,spa:31,spd:28,spe:31}}];
  const listeners=new Map(),outgoing=[];
  const host={postMessage:message=>outgoing.push(message),
    addEventListener:(name,fn)=>listeners.set(fn,fn),removeEventListener:(name,fn)=>listeners.delete(fn),
    emit:data=>{for(const fn of listeners.values())fn({data});}};
  win.__PPBUI_COUPLED_WORKSPACE__={pptoolsBackground:true};
  Object.defineProperty(win,'chrome',{value:{webview:host},configurable:true});
  win.PokeIdle={Localization:{get:()=> 'pt-BR'},
    WorldPresence:{getSelfTrainerId:()=> 'account-a'},Auth:{getTrainerSummary:()=>({id:'account-a',level:75})},
    PersistentHud:{_teamHud:{el:doc.querySelector('.pokeidle-team-hud'),_creatures:creatures,_trainer:{level:75,buffs:{}}}}};
  win.SceneManager={_scene:{_panel:{body:root.querySelector('.pokeidle-panel__body')},
    _zones:[{name:'Pokémon Tower',min:85,max:85},{name:'Viridian Forest',min:20,max:20},{name:'Rock Tunnel',min:40,max:40}],
    zoneName:zone=>zone.name,zoneMinMaxLevel:zone=>({min:zone.min,max:zone.max}),startHunt(){throw Error('Offline fixture cannot start Hunt');}}};
  const search=()=>root.querySelector('.hunt-list-toolbar input[type="search"]');
  const widget=createPptoolsOneclickWidget(root,{mode:'list',canLocate:()=>Boolean(search()),locate(_match,entry){
    const input=search();if(!input)return false;
    input.value=entry.huntName;input.dispatchEvent(new win.Event('input',{bubbles:true}));
    input.focus({preventScroll:true});return doc.activeElement===input;
  }});
  root.querySelector('.pokeidle-panel__body').append(widget.element);
  widget.sync();
  if(state!=='idle'){
    widget.element.querySelector('[data-ppbui-pptools-run]').click();
    await new Promise(done=>setImmediate(done));
  }
  if(state==='result'){
    const request=outgoing.find(item=>item.type==='ppbui.pptools.run');
    if(!request)throw Error('Synthetic one-click request not emitted');
    host.emit({type:'ppbui.pptools.result',requestId:request.requestId,ok:true,resultJson});
    await new Promise(done=>setImmediate(done));
  }
  if(state==='failed'){
    const request=outgoing.find(item=>item.type==='ppbui.pptools.run');
    if(!request)throw Error('Synthetic one-click request not emitted');
    host.emit({type:'ppbui.pptools.result',requestId:request.requestId,ok:false,
      error:'Simulação PPTools indisponível.'});
    await new Promise(done=>setImmediate(done));
  }
  const html=root.outerHTML;
  widget.cleanup();dom.window.close();
  return `<article class="preview"><h2>${width} px · ${state}</h2>${html}</article>`;
}

const cards=[];
for(const state of states){for(const width of widths)cards.push(await render(width,state));}
const css=readFileSync(resolve('src/styles/tokens.css'),'utf8');
const page=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css}\n
*{box-sizing:border-box}body{margin:0;background:#10161b;color:#ebecdc;font:12px/1.35 Inter,Segoe UI,Arial,sans-serif;padding:14px}
.frames{display:grid;grid-template-columns:repeat(3,max-content);gap:16px;align-items:start}
.preview{min-width:0}.preview h2{font:600 13px/1.4 Inter,Segoe UI,Arial,sans-serif;color:#d0c9a2;margin:0 0 6px}
.hunt-window{background:rgba(22,29,32,.92);border:1px solid #6b6543;min-width:0;padding:5px;display:grid;gap:7px}
.pokeidle-panel__titlebar{padding:5px 8px;background:rgba(35,44,46,.96);font:15px Cinzel,Georgia,serif}
.pokeidle-panel__body{display:grid;gap:7px;min-width:0;container-type:inline-size}
.hunt-list-toolbar input{width:100%;background:#161d20;color:#ebecdc;border:1px solid #6b6543;padding:5px}
</style></head><body><div class="frames">${cards.join('')}</div></body></html>`;
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,page);
console.log('Synthetic one-click PPTools preview generated:',output);
