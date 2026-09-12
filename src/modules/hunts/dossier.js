import {defensiveMultipliers} from './type-chart.js';

const copyByLanguage={
  pt:{weakness:'Fraq.',resistance:'Res.',immunity:'Imu.',drops:'Drops',none:'Nenhuma',value:'Valor de venda',close:'Fechar dossiê',hunt:'Entrar na Hunt'},
  en:{weakness:'Weak',resistance:'Res',immunity:'Immu.',drops:'Drops',none:'None',value:'Sell value',close:'Close dossier',hunt:'Enter Hunt'},
  es:{weakness:'Débil',resistance:'Res.',immunity:'Inmu.',drops:'Drops',none:'Ninguna',value:'Valor de venta',close:'Cerrar dossier',hunt:'Entrar a la Hunt'},
  zh:{weakness:'弱点',resistance:'抗性',immunity:'免疫',drops:'掉落',none:'无',value:'售价',close:'关闭详情',hunt:'进入狩猎'},
};

const languageCopy=doc=>{
  const lang=doc.defaultView?.PokeIdle?.Localization?.get?.()||doc.documentElement.lang||'pt';
  return copyByLanguage[lang.split(/[-_]/)[0]]||copyByLanguage.en;
};

function badge(doc,icons,{type,multiplier}) {
  const definition=icons?.definition?.(type), node=doc.createElement('span');
  node.className='ppbui-hunts-element-badge ppbui-hunts-relation-badge';
  node.style.setProperty('--hunt-element-color',definition?.color||'#777');
  const icon=icons?.create?.(type,{size:18});
  if(icon)node.append(icon);
  const locale=doc.defaultView?.PokeIdle?.Localization?.get?.()||doc.documentElement.lang||undefined;
  const formatted=`×${new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(multiplier)}`, name=definition?.label||type;
  const value=doc.createElement('b');value.textContent=formatted;
  node.title=`${name} ${formatted}`;node.setAttribute('aria-label',`${name} ${formatted}`);
  node.append(value);return node;
}

function relationRow(doc,icons,label,items,none) {
  const node=doc.createElement('div');node.className='ppbui-hunts-relation';
  const title=doc.createElement('span');title.className='ppbui-hunts-field-label';title.textContent=label;
  const values=doc.createElement('div');values.className='ppbui-hunts-badge-list';
  if(items.length)items.forEach(item=>values.append(badge(doc,icons,item)));
  else {const empty=doc.createElement('span');empty.className='ppbui-hunts-empty';empty.textContent=none;values.append(empty);}
  node.append(title,values);return node;
}

function sectionTitle(doc,text) {
  const node=doc.createElement('h3');node.className='ppbui-hunts-section-title';node.textContent=text;return node;
}

function levelText(doc,scene,zone) {
  const levels=typeof scene.zoneMinMaxLevel==='function'?scene.zoneMinMaxLevel(zone):null;
  if(!levels)return '';
  const t=doc.defaultView?.PokeIdle?.t;
  if(typeof t==='function')return levels.min===levels.max?t('hunt_selection.level_abbr',{level:levels.min}):t('hunt_selection.level_range',{min:levels.min,max:levels.max});
  return levels.min===levels.max?`Lv. ${levels.min}`:`Lv. ${levels.min}–${levels.max}`;
}

function renderElements(doc,scene,zone) {
  const icons=doc.defaultView?.PokeIdle?.ElementIcons, types=scene.zoneElements?.(zone)||[];
  const row=doc.createElement('div');row.className='ppbui-hunts-elements';
  const t=doc.defaultView?.PokeIdle?.t;
  const nativeLabel=typeof t==='function'?t(types.length===1?'hunt_selection.element_singular':'hunt_selection.element_plural'):'';
  const label=doc.createElement('span');label.className='ppbui-hunts-field-label';label.textContent=nativeLabel&&!nativeLabel.startsWith('hunt_selection.')?nativeLabel:(types.length===1?'Element':'Elements');
  const values=doc.createElement('div');values.className='ppbui-hunts-badge-list';
  types.forEach(type=>{
    const definition=icons?.definition?.(type), item=doc.createElement('span');item.className='ppbui-hunts-element-badge';
    item.style.setProperty('--hunt-element-color',definition?.color||'#777');
    const icon=icons?.create?.(type,{size:21});if(icon)item.append(icon);
    item.append(doc.createTextNode(definition?.label||type));values.append(item);
  });
  if(!types.length){const empty=doc.createElement('span');empty.className='ppbui-hunts-empty';empty.textContent='—';values.append(empty);}
  row.append(label,values);return {row,types};
}

function renderDrops(doc,scene,zone,copy) {
  const list=doc.createElement('div');list.className='ppbui-hunts-drop-list';
  const drops=typeof scene.zoneDrops==='function'?scene.zoneDrops(zone):[];
  if(!drops.length){const empty=doc.createElement('span');empty.className='ppbui-hunts-empty';empty.textContent=copy.none;list.append(empty);return list;}
  drops.forEach(item=>{
    const row=doc.createElement('div');row.className='ppbui-hunts-drop-item';
    const icon=typeof scene.itemIcon==='function'?scene.itemIcon(item):null;if(icon)row.append(icon);
    const name=doc.createElement('span');name.className='ppbui-hunts-drop-name';name.textContent=item?.name||item?.id||'—';name.title=name.textContent;row.append(name);
    const value=Number(item?.sell_price??item?.sell_value), output=doc.createElement('span');
    output.className='ppbui-hunts-drop-value';output.title=copy.value;
    const currency=doc.defaultView?.PokeIdle?.Currency;
    output.append('(');
    if(Number.isFinite(value)&&value>=0&&typeof currency?.element==='function')output.append(currency.element(value,{showName:false}));
    else output.append(Number.isFinite(value)&&value>=0?value.toLocaleString(doc.defaultView?.PokeIdle?.Localization?.get?.()):'—');
    output.append(')');row.append(output);list.append(row);
  });
  return list;
}

export function createHuntInspector(doc,{onClose,onHunt}) {
  const aside=doc.createElement('aside');aside.className='ppbui-focusable ppbui-hunts-inspector';aside.hidden=true;aside.dataset.ppbuiModule='hunts';
  aside.tabIndex=-1;
  const header=doc.createElement('div');header.className='ppbui-hunts-inspector__header';
  const heading=doc.createElement('div'), title=doc.createElement('strong'), level=doc.createElement('small');
  title.className='ppbui-hunts-inspector__title';title.id=`ppbui-hunts-inspector-title-${Math.random().toString(36).slice(2)}`;aside.setAttribute('aria-labelledby',title.id);heading.append(title,level);
  const close=doc.createElement('button');close.type='button';close.className='ppbui-button ppbui-button--ghost ppbui-icon-button ppbui-hunts-inspector__close';close.textContent='×';
  header.append(heading,close);
  const body=doc.createElement('div');body.className='ppbui-scroll ppbui-hunts-inspector__body';
  const footer=doc.createElement('div');footer.className='ppbui-hunts-inspector__footer';
  const modeSlot=doc.createElement('div');modeSlot.className='ppbui-hunts-inspector__mode';
  const hunt=doc.createElement('button');hunt.type='button';hunt.className='ppbui-button ppbui-button--primary ppbui-hunts-inspector__hunt';
  footer.append(modeSlot,hunt);aside.append(header,body,footer);
  close.addEventListener('click',()=>onClose?.());hunt.addEventListener('click',()=>onHunt?.());
  let key='';

  return {
    element:aside,modeSlot,huntButton:hunt,closeButton:close,
    render(scene,zone,identity) {
      const copy=languageCopy(doc),locale=doc.defaultView?.PokeIdle?.Localization?.get?.()||doc.documentElement.lang||'';
      const name=scene.zoneName?.(zone)||zone?.name||'',levels=scene.zoneMinMaxLevel?.(zone)||null,types=scene.zoneElements?.(zone)||[],drops=scene.zoneDrops?.(zone)||[];
      const nextKey=JSON.stringify([scene?._tab||'',identity,locale,name,levels?.min??null,levels?.max??null,types,drops.map(item=>[item?.id??null,item?.name??null,item?.sell_price??null,item?.sell_value??null,item?.icon_index??null])]);
      close.setAttribute('aria-label',copy.close);close.title=copy.close;
      hunt.textContent=copy.hunt;
      if(key===nextKey)return;
      key=nextKey;title.textContent=name;title.title=name;level.textContent=levelText(doc,scene,zone);
      const {row:elements,types:renderedTypes}=renderElements(doc,scene,zone), relations=defensiveMultipliers(renderedTypes), icons=doc.defaultView?.PokeIdle?.ElementIcons;
      body.replaceChildren(
        elements,
        relationRow(doc,icons,copy.weakness,relations.filter(item=>item.multiplier>1),copy.none),
        relationRow(doc,icons,copy.resistance,relations.filter(item=>item.multiplier>0&&item.multiplier<1),copy.none),
        relationRow(doc,icons,copy.immunity,relations.filter(item=>item.multiplier===0),copy.none),
        sectionTitle(doc,copy.drops),
        renderDrops(doc,scene,zone,copy),
      );
    },
    setOpen(open) { if(aside.hidden===open)aside.hidden=!open; },
    reset() {key='';body.replaceChildren();aside.hidden=true;},
  };
}
