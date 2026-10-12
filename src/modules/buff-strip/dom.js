import { buffStripConfig as config } from "./config.js";

export function findBuffStripTarget(doc = document) {
  const strip = doc.querySelector(config.selectors.strip);
  const toolbar = doc.querySelector(config.selectors.toolbar);
  const list = strip?.querySelector(config.selectors.list);
  const ticker = strip?.querySelector(config.selectors.ticker);
  return strip && toolbar && list && ticker ? { strip, toolbar, list, ticker } : null;
}

export function buffStripText(doc = document) {
  const lang = (doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en").split(/[-_]/)[0];
  const copy = {
    pt: { name: "Buff Tracker", description: "Mostra buffs em um painel colapsável e arrastável, com apresentação distinta para buffs e eventos do servidor." },
    en: { name: "Buff Tracker", description: "Shows buffs in a collapsible draggable tracker with distinct buff and server-event presentation." },
    es: { name: "Buff Tracker", description: "Muestra las mejoras en un panel plegable y arrastrable, con presentación distinta para mejoras y eventos del servidor." },
    zh: { name: "增益追踪器", description: "将当前增益整理到可折叠、可拖动的面板中，并区分玩家与服务器效果。" },
  };
  return copy[lang] || copy.en;
}

export function buffStripPanelText(doc = document) {
  const lang = (doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en").split(/[-_]/)[0];
  const copy = {
    pt: { title:"Buffs", drag:"Mover painel de buffs", move:"Use as setas para mover; Shift + setas move mais rápido", collapse:"Recolher buffs", expand:"Expandir buffs", active:n=>`${n} buff${n===1?"":"s"} ativo${n===1?"":"s"}` },
    en: { title:"Buffs", drag:"Move buff tracker", move:"Use arrow keys to move; Shift + arrows moves faster", collapse:"Collapse buffs", expand:"Expand buffs", active:n=>`${n} active buff${n===1?"":"s"}` },
    es: { title:"Mejoras", drag:"Mover panel de mejoras", move:"Usa las flechas para mover; Shift + flechas mueve más rápido", collapse:"Plegar mejoras", expand:"Expandir mejoras", active:n=>`${n} mejora${n===1?"":"s"} activa${n===1?"":"s"}` },
    zh: { title:"增益", drag:"移动增益追踪器", move:"使用方向键移动；Shift + 方向键可加速移动", collapse:"折叠增益", expand:"展开增益", active:n=>`${n} 个生效增益` },
  };
  return copy[lang] || copy.en;
}
