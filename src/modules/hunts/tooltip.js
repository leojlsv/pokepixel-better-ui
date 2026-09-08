import {huntScene, huntsText, selectors} from './dom.js';
import {defensiveMultipliers} from './type-chart.js';

const labels={
  pt:{weakness:'Fraq.',resistance:'Res.',immunity:'Imu.',drops:'Drops',none:'Nenhuma',value:'Valor de venda'},
  en:{weakness:'Weak',resistance:'Res',immunity:'Immu.',drops:'Drops',none:'None',value:'Sell value'},
  es:{weakness:'Débil',resistance:'Res.',immunity:'Inmu.',drops:'Drops',none:'Ninguna',value:'Valor de venta'},
  zh:{weakness:'弱点',resistance:'抗性',immunity:'免疫',drops:'掉落',none:'无'},
};
const text=doc=>{const lang=doc.defaultView?.PokeIdle?.Localization?.get?.()||doc.documentElement.lang||'pt';return labels[lang.split(/[-_]/)[0]]||labels.en;};

function badge(doc,icons,{type,multiplier}) {
  const definition=icons?.definition?.(type), node=doc.createElement('span');
  node.className='hunt-drop-tooltip__element ppbui-hunts-relation-badge';
  node.style.setProperty('--hunt-element-color',definition?.color||'#777');
  const icon=icons?.create?.(type,{size:18});
  if(icon)node.append(icon);
  const locale=doc.defaultView?.PokeIdle?.Localization?.get?.()||doc.documentElement.lang||undefined;
  const formatted=`×${new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(multiplier)}`, name=definition?.label||type;
  const value=doc.createElement('b');value.textContent=formatted;
  node.title=`${name} ${formatted}`;node.setAttribute('aria-label',`${name} ${formatted}`);
  node.append(value);return node;
}
function row(doc,icons,label,items,none) {
  const node=doc.createElement('div');node.className='ppbui-hunts-relation';node.dataset.ppbuiHuntsTooltip='';
  const title=doc.createElement('span');title.className='hunt-drop-tooltip__elements-label';title.textContent=label;
  const values=doc.createElement('div');values.className='hunt-drop-tooltip__element-badges';
  if(items.length)items.forEach(item=>values.append(badge(doc,icons,item)));
  else {const empty=doc.createElement('span');empty.className='hunt-drop-tooltip__empty';empty.textContent=none;values.append(empty);}
  node.append(title,values);return node;
}
function addDropValues(doc,scene,zone,drops,copy) {
  const entries=typeof scene.zoneDrops==='function'?scene.zoneDrops(zone):[];
  drops.querySelectorAll('.hunt-drop-tooltip__item').forEach((node,index)=>{
    const raw=entries[index], value=Number(raw?.sell_price??raw?.sell_value), output=doc.createElement('span');
    output.className='ppbui-hunts-drop-value';output.dataset.ppbuiHuntsTooltip='';output.title=copy.value||'';
    const currency=doc.defaultView?.PokeIdle?.Currency;
    output.append('(');
    if(Number.isFinite(value)&&value>=0&&typeof currency?.element==='function')output.append(currency.element(value,{showName:false}));
    else output.append(Number.isFinite(value)&&value>=0?value.toLocaleString(doc.defaultView?.PokeIdle?.Localization?.get?.()):'—');
    output.append(')');
    node.append(output);
  });
}
export function enhanceHuntTooltip(root,marker) {
  const scene=huntScene(root), tooltip=scene?._dropTooltip, zone=scene?._zones?.[Number(marker?.dataset.zoneIndex)];
  if(!tooltip||tooltip.hidden||!zone||!root.contains(marker)||tooltip.querySelector('[data-ppbui-hunts-tooltip]'))return false;
  const doc=root.ownerDocument, types=scene.zoneElements?.(zone)||[], relations=defensiveMultipliers(types), copy=text(doc), icons=doc.defaultView?.PokeIdle?.ElementIcons;
  const title=tooltip.querySelector('.hunt-drop-tooltip__title'), drops=tooltip.querySelector('.hunt-drop-tooltip__list');
  if(!title||!drops)return false;
  title.dataset.ppbuiHuntsOriginal=title.textContent;title.textContent=scene.zoneName?.(zone)||title.textContent;
  const relationRows=[
    row(doc,icons,copy.weakness,relations.filter(item=>item.multiplier>1),copy.none),
    row(doc,icons,copy.resistance,relations.filter(item=>item.multiplier>0&&item.multiplier<1),copy.none),
    row(doc,icons,copy.immunity,relations.filter(item=>item.multiplier===0),copy.none),
  ];
  const dropsTitle=doc.createElement('div');dropsTitle.className='ppbui-hunts-section-title';dropsTitle.dataset.ppbuiHuntsTooltip='';dropsTitle.textContent=copy.drops;
  drops.before(...relationRows,dropsTitle);
  addDropValues(doc,scene,zone,drops,copy);
  tooltip.dataset.ppbuiHuntsOriginalLeft=tooltip.style.left;
  tooltip.dataset.ppbuiHuntsOriginalTop=tooltip.style.top;
  const target=marker.getBoundingClientRect(), box=tooltip.getBoundingClientRect();
  let left=target.left+target.width/2-box.width/2, top=target.top-box.height-10;
  left=Math.max(8,Math.min(doc.defaultView.innerWidth-box.width-8,left));if(top<8)top=target.bottom+10;
  tooltip.style.left=`${Math.round(left)}px`;tooltip.style.top=`${Math.round(Math.max(8,Math.min(doc.defaultView.innerHeight-box.height-8,top)))}px`;
  return true;
}
export function cleanupHuntTooltip(doc) {
  doc.querySelectorAll('[data-ppbui-hunts-tooltip]').forEach(node=>node.remove());
  doc.querySelectorAll('.hunt-drop-tooltip__title[data-ppbui-hunts-original]').forEach(node=>{node.textContent=node.dataset.ppbuiHuntsOriginal;delete node.dataset.ppbuiHuntsOriginal;});
  doc.querySelectorAll('.hunt-world-drop-tooltip[data-ppbui-hunts-original-left]').forEach(node=>{node.style.left=node.dataset.ppbuiHuntsOriginalLeft;node.style.top=node.dataset.ppbuiHuntsOriginalTop;delete node.dataset.ppbuiHuntsOriginalLeft;delete node.dataset.ppbuiHuntsOriginalTop;});
  doc.querySelectorAll(`${selectors.label}.ppbui-hunts-located`).forEach(node=>node.classList.remove('ppbui-hunts-located'));
  doc.querySelectorAll(`${selectors.label}.ppbui-hunts-dimmed`).forEach(node=>node.classList.remove('ppbui-hunts-dimmed'));
  doc.querySelectorAll(`${selectors.marker}.ppbui-hunts-located-marker`).forEach(node=>node.classList.remove('ppbui-hunts-located-marker'));
}
