const SCHEMA='ppbui.pptools.hunt-recommendations';
const ALLOWED_SORT=new Set(['rank','pokemon','level','move','hits','bad','koh','xp','gold']);
export const PPTOOLS_IMPORT_MAX_BYTES=16_000;
function invalid(message,code='format') {
  const failure=new Error(message);
  failure.code=code;
  return failure;
}

function object(value) {
  return value!==null&&typeof value==='object'&&!Array.isArray(value);
}
function string(value,max,{nullable=false,required=false}={}) {
  if(nullable&&value===null)return null;
  if(typeof value!=='string'||value.length>max||/[\u0000-\u001f\u007f]/.test(value))throw invalid('Formato de texto inválido no JSON do PPTools.');
  const output=value.trim();
  if(required&&!output)throw invalid('Há campos obrigatórios vazios no JSON do PPTools.');
  return output;
}
function integer(value,{nullable=false,min=0,max=10000}={}) {
  if(nullable&&value===null)return null;
  if(!Number.isSafeInteger(value)||value<min||value>max)throw invalid('Número inválido no JSON do PPTools.');
  return value;
}
function nullableText(value,max=120) {
  return string(value,max,{nullable:true});
}
function parseSource(raw) {
  if(!object(raw)||!object(raw.sort)||!object(raw.scope))throw invalid('A origem da consulta está incompleta.','source');
  let url;
  try { url=new URL(raw.url); } catch { throw invalid('Origem PPTools inválida.','source'); }
  if(url.protocol!=='https:'||url.hostname!=='www.pptools.com.br'||url.port||
    url.pathname!=='/hunt-analyzer'||url.username||url.password||url.search||url.hash)throw invalid('A origem não é a página esperada do PPTools.','source');
  const capturedAt=string(raw.capturedAt,32,{required:true});
  if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(capturedAt)||
    !Number.isFinite(Date.parse(capturedAt))||new Date(capturedAt).toISOString()!==capturedAt)throw invalid('Data de captura inválida.','date');
  const key=raw.sort.key===null?null:string(raw.sort.key,16,{required:true});
  const direction=raw.sort.direction===null?null:string(raw.sort.direction,4,{required:true});
  if((key===null)!==(direction===null)||
    key!==null&&!ALLOWED_SORT.has(key)||
    direction!==null&&!['asc','desc'].includes(direction))throw invalid('Ordenação inválida no JSON do PPTools.','sort');
  const kind=string(raw.scope.kind,16,{required:true}),page=raw.scope.page;
  if(!['all-results','page'].includes(kind)||
    (kind==='page'&&!Number.isSafeInteger(page))||
    (kind==='page'&&(page<1||page>100000))||
    (kind==='all-results'&&page!==null))throw invalid('O recorte da tabela não foi comprovado.','scope');
  return {
    url:url.origin+url.pathname,capturedAt,
    sort:{key,direction},
    filter:nullableText(raw.filter,200),
    scope:{kind,page},
  };
}
function parseAttacker(raw) {
  if(!object(raw))throw invalid('Os dados do atacante estão incompletos.');
  return {
    speciesId:nullableText(raw.speciesId,80),
    speciesNameText:nullableText(raw.speciesNameText,100),
    level:integer(raw.level,{nullable:true}),
  };
}
function parseRecommendation(raw,index) {
  if(!object(raw)||raw.rank!==index+1)throw invalid('A posição das recomendações é inválida.');
  return {
    rank:raw.rank,
    wildSpeciesName:string(raw.wildSpeciesName,100,{required:true}),
    huntName:string(raw.huntName,140,{required:true}),
    wildLevelText:string(raw.wildLevelText,48,{required:true}),
    wildLevel:integer(raw.wildLevel,{nullable:true}),
    xpPerHourText:string(raw.xpPerHourText,100,{required:true}),
    goldPerHourText:string(raw.goldPerHourText,100,{required:true}),
  };
}
export function parsePptoolsRecommendations(input) {
  if(typeof input!=='string'||input.length>PPTOOLS_IMPORT_MAX_BYTES||
    new TextEncoder().encode(input).byteLength>PPTOOLS_IMPORT_MAX_BYTES||!input.trim())throw invalid('Cole o JSON do PPTools (máximo de 16 KB).','size');
  let raw;
  try {raw=JSON.parse(input);}catch{throw invalid('O JSON do PPTools não pôde ser lido.','syntax');}
  if(!object(raw)||raw.schema!==SCHEMA||raw.version!==1)throw invalid('Versão ou formato desconhecido do PPTools.','version');
  if(!Array.isArray(raw.recommendations)||raw.recommendations.length<1||raw.recommendations.length>3)throw invalid('O JSON deve conter de uma a três recomendações.','count');
  return {
    schema:SCHEMA,version:1,
    source:parseSource(raw.source),
    attacker:parseAttacker(raw.attacker),
    recommendations:raw.recommendations.map(parseRecommendation),
  };
}

export function normalizePptoolsHuntName(value) {
  return String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ').trim().toLocaleLowerCase('en-US');
}

function zoneName(scene,zone) {
  try {return scene.zoneName?.(zone)||zone.name||'';} catch{return '';}
}
function zoneLevelMatches(scene,zone,level) {
  if(level===null)return true;
  let range;
  try {range=scene.zoneMinMaxLevel?.(zone)||null;}catch{return false;}
  if(!range)return true;
  const min=Number(range.min),max=Number(range.max);
  return Number.isFinite(min)&&Number.isFinite(max)&&level>=min&&level<=max;
}
function zoneInWorld(scene,zone) {
  if(typeof scene.zoneWorld!=='function'||scene._tab===undefined)return true;
  try {return scene.zoneWorld(zone)===scene._tab;} catch{return false;}
}
function eligible(node) {
  if(!node||!node.isConnected||node.hidden||node.disabled||node.getAttribute('aria-hidden')==='true')return false;
  const getComputed=node.ownerDocument?.defaultView?.getComputedStyle;
  for(let current=node;current;current=current.parentElement){
    if(current.hidden||current.inert||current.hasAttribute?.('inert')||
      current.getAttribute?.('aria-hidden')==='true')return false;
    if(current.style?.display==='none'||current.style?.visibility==='hidden')return false;
    if(typeof getComputed==='function'){
      const style=getComputed.call(node.ownerDocument.defaultView,current);
      if(style?.display==='none'||style?.visibility==='hidden'||style?.visibility==='collapse')return false;
    }
  }
  return true;
}
function listIndex(row) {
  const control=row.querySelector('.hunt-list-details-button[aria-controls]');
  const matched=control?.getAttribute('aria-controls')?.match(/^hunt-list-details-(\d+)$/);
  return matched?Number(matched[1]):null;
}
export function resolvePptoolsHunt(root,scene,entry,mode) {
  if(!root?.isConnected||!Array.isArray(scene?._zones)||!entry)return {state:'unavailable'};
  const expected=normalizePptoolsHuntName(entry.huntName);
  if(!expected)return {state:'unavailable'};
  const candidates=[];
  if(mode==='map'){
    const nodes=root.querySelectorAll('.hunt-map-marker[data-zone-index]');
    for(const node of nodes){
      const index=Number(node.dataset.zoneIndex),zone=scene._zones[index];
      if(!Number.isSafeInteger(index)||!zone||!zoneInWorld(scene,zone)||
        normalizePptoolsHuntName(zoneName(scene,zone))!==expected||
        !zoneLevelMatches(scene,zone,entry.wildLevel))continue;
      if(!eligible(node))continue;
      candidates.push({index,zone,node});
    }
  }else if(mode==='list'){
    for(const node of root.querySelectorAll('.hunt-list-row')){
      const index=listIndex(node),zone=scene._zones[index];
      if(!Number.isSafeInteger(index)||!zone||!zoneInWorld(scene,zone)||
        normalizePptoolsHuntName(zoneName(scene,zone))!==expected||
        !zoneLevelMatches(scene,zone,entry.wildLevel))continue;
      if(!eligible(node))continue;
      const label=node.querySelector('.hunt-list-identity strong')?.textContent;
      if(normalizePptoolsHuntName(label)!==expected)continue;
      candidates.push({index,zone,node});
    }
  }
  return candidates.length===1?{state:'matched',...candidates[0]}:
    {state:candidates.length>1?'ambiguous':'unavailable'};
}
