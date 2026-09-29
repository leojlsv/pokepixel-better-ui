import { teamHudConfig as config } from "./config.js";
import { cardFacts, hudParts, levelExperience, teamHudOfficialOrder, teamHudRuntime, teamHudText } from "./dom.js";
import { decorateElementIconList, releaseElementIconLists } from "../../core/element-icons.js";

const grouped = number => Number(number).toLocaleString("en-US");
const compactMagnitude = number => {
  const value = Number(number);
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const [divisor, suffix] = abs >= 1e12 ? [1e12, "T"] : abs >= 1e9 ? [1e9, "B"] : abs >= 1e6 ? [1e6, "M"] : [1e3, "K"];
  const compact = value / divisor;
  const digits = Math.abs(compact) < 10 ? 2 : Math.abs(compact) < 100 ? 1 : 0;
  return `${compact.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1")}${suffix}`;
};
const meterNumber = (number, compact) => compact ? compactMagnitude(number) : grouped(number);

export function mountTeamHud(root) {
  const doc = root.ownerDocument, originals = new Map(), barTitles = new Map(), trainerRows = new Map(), trainerClasses = new Map();
  const hadRootClass = root.classList.contains("ppbui-root"); root.classList.add("ppbui-root");
  const style = doc.createElement("style"); style.dataset.ppbuiModule = config.id;
  style.textContent = `
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] { container-type:inline-size; gap:var(--ppbui-space-2)!important; box-sizing:border-box; padding:var(--ppbui-space-3)!important; border:var(--ppbui-border-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-1)!important; color:var(--ppbui-text); box-shadow:var(--ppbui-shadow)!important; font:var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body)!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] + .pokeidle-team-hud__wallet { box-sizing:border-box; border:var(--ppbui-border-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-1)!important; box-shadow:var(--ppbui-shadow)!important; font-family:var(--ppbui-font-body)!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__controls { min-height:28px; margin:0!important; padding:0 0 var(--ppbui-space-2)!important; border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border)!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__drag-handle { gap:var(--ppbui-space-2)!important; color:var(--ppbui-text-muted)!important; font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-body)!important; letter-spacing:.1em; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__drag-icon { color:var(--ppbui-accent)!important; font-size:13px!important; text-shadow:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__collapse { display:grid; width:var(--ppbui-icon-button-size)!important; min-width:var(--ppbui-icon-button-size); height:var(--ppbui-icon-button-size)!important; min-height:var(--ppbui-icon-button-size); place-items:center; padding:0!important; border:var(--ppbui-border-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-2)!important; color:var(--ppbui-text)!important; box-shadow:none!important; font:700 var(--ppbui-font-size-body)/1 var(--ppbui-font-body)!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__collapse:hover { border-color:var(--ppbui-accent)!important; background:var(--ppbui-bg-3)!important; color:var(--ppbui-accent-hi)!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__collapse:active { background:var(--ppbui-bg-0)!important; box-shadow:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__collapse:focus-visible { outline:var(--ppbui-border-width) solid var(--ppbui-focus)!important; outline-offset:var(--ppbui-pixel-unit); }
    body:not(.pokeidle-mobile-portrait) .pokeidle-team-hud[data-ppbui-team-hud-enhanced].is-collapsed { gap:0!important; padding:var(--ppbui-space-2)!important; }
    body:not(.pokeidle-mobile-portrait) .pokeidle-team-hud[data-ppbui-team-hud-enhanced].is-collapsed > .pokeidle-trainer-hud__header,
    body:not(.pokeidle-mobile-portrait) .pokeidle-team-hud[data-ppbui-team-hud-enhanced].is-collapsed > .pokeidle-team-hud__active,
    body:not(.pokeidle-mobile-portrait) .pokeidle-team-hud[data-ppbui-team-hud-enhanced].is-collapsed > .pokeidle-team-hud__list,
    body:not(.pokeidle-mobile-portrait) .pokeidle-team-hud[data-ppbui-team-hud-enhanced].is-collapsed > [data-ppbui-team-presets] { display:none!important; }
    body:not(.pokeidle-mobile-portrait) .pokeidle-team-hud[data-ppbui-team-hud-enhanced].is-collapsed > .pokeidle-team-hud__controls { margin:0!important; border-bottom:0!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-trainer-hud__header { display:grid!important; grid-template-columns:48px minmax(0,1fr); align-items:center; gap:var(--ppbui-space-3)!important; min-height:0!important; padding:var(--ppbui-space-3)!important; border:var(--ppbui-separator-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-1)!important; box-shadow:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-trainer-hud__crest-wrap { width:48px!important; height:48px!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-trainer-hud__sprite { filter:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-trainer-hud__info { gap:var(--ppbui-space-1) var(--ppbui-space-3)!important; font-family:var(--ppbui-font-body)!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-trainer-hud__name { color:var(--ppbui-text)!important; font:700 var(--ppbui-font-size-section)/var(--ppbui-line-height-tight) var(--ppbui-font-body)!important; letter-spacing:.04em!important; text-shadow:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-trainer-hud__map { color:var(--ppbui-text-muted)!important; font:var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body)!important; text-shadow:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-trainer-hud__level { color:var(--ppbui-text)!important; font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-data)!important; text-shadow:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-trainer-hud__stamina-note { display:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__active { position:relative; display:grid!important; grid-template-columns:76px minmax(0,1fr)!important; align-items:center; gap:var(--ppbui-space-3)!important; min-height:88px!important; padding:var(--ppbui-space-3)!important; border:var(--ppbui-border-width) solid var(--ppbui-border)!important; border-left:var(--ppbui-border-width) solid var(--element-color,var(--ppbui-border-strong))!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-2)!important; box-shadow:none!important; filter:none!important; color:var(--ppbui-text); }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__active-portrait { display:grid!important; width:76px!important; height:76px!important; place-items:center; overflow:hidden; box-sizing:border-box; border:var(--ppbui-separator-width) solid var(--ppbui-border-strong)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-0)!important; box-shadow:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__active-portrait .pokeidle-team-card__charset { width:70px!important; height:70px!important; max-width:70px!important; max-height:70px!important; filter:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__active-info { gap:var(--ppbui-space-2)!important; font-family:var(--ppbui-font-body)!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__active-header { grid-template-columns:auto minmax(0,1fr) auto!important; gap:var(--ppbui-space-2)!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__active-name { color:var(--ppbui-text)!important; font:700 var(--ppbui-font-size-section)/var(--ppbui-line-height-tight) var(--ppbui-font-body)!important; letter-spacing:.03em!important; text-shadow:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__active-level { color:var(--ppbui-text)!important; font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-data)!important; text-shadow:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__active-stat:not([data-ppbui-team-hud-trainer-row]) { display:grid!important; grid-template-columns:28px minmax(0,1fr)!important; align-items:center; gap:var(--ppbui-space-2)!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__active-stat:not([data-ppbui-team-hud-trainer-row]) > .pokeidle-team-hud__active-stat-label { color:var(--ppbui-text-muted)!important; font:700 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-data)!important; text-shadow:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__active-bar,
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-trainer-hud__xp-bar,
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-trainer-hud__stamina-bar { height:14px!important; overflow:hidden; border:var(--ppbui-separator-width) solid var(--ppbui-border)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-0)!important; box-shadow:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__active-fill,
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-trainer-hud__xp-fill,
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-trainer-hud__stamina-fill { box-shadow:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__active-bar-text,
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-trainer-hud__xp-text,
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-trainer-hud__stamina-text { color:var(--ppbui-text)!important; font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data)!important; text-shadow:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__list { display:grid!important; grid-template-columns:repeat(6,minmax(0,1fr)); gap:0!important; margin:0!important; padding:0!important; overflow:visible; border:0!important; border-radius:var(--ppbui-radius)!important; background:transparent!important; box-shadow:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card.ppbui-pokemon-card--hud { width:100%!important; max-width:none!important; min-height:52px!important; height:52px!important; max-height:52px!important; overflow:hidden!important; border:var(--ppbui-border-width) solid var(--ppbui-pokemon-card-border)!important; border-top-color:var(--ppbui-pokemon-card-top-border)!important; border-right-color:var(--ppbui-pokemon-card-right-border)!important; border-bottom:var(--ppbui-border-width) solid var(--ppbui-pokemon-card-bottom-border)!important; background:var(--ppbui-bg-2)!important; box-shadow:none!important; --ppbui-pokemon-card-accent:var(--element-color,var(--ppbui-border)); font-family:var(--ppbui-font-body)!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card.ppbui-pokemon-card--hud + .pokeidle-team-card.ppbui-pokemon-card--hud { border-left:0!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card.ppbui-pokemon-card--hud:is(.is-xp-share-carrier,.is-xp-share-recipient) { overflow:visible!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card__xp-share { box-sizing:border-box; top:2px!important; right:2px!important; left:auto!important; display:grid!important; grid-template-columns:16px auto; column-gap:1px; width:auto!important; min-width:20px!important; height:20px!important; padding:1px!important; place-items:center!important; border:var(--ppbui-separator-width) solid var(--ppbui-warning)!important; border-radius:var(--ppbui-radius)!important; background:var(--ppbui-bg-0)!important; box-shadow:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card__xp-share[hidden] { display:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card__xp-share.is-recipient { border-color:var(--ppbui-info)!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card__xp-share img { width:16px!important; height:16px!important; object-fit:contain; image-rendering:pixelated; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card__xp-share b { right:-2px!important; bottom:-2px!important; color:var(--ppbui-text)!important; font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data)!important; text-shadow:1px 1px 0 var(--ppbui-bg-0)!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card__xp-share small { position:static!important; grid-column:2; box-sizing:border-box; width:auto!important; min-width:2.5ch!important; padding:0 1px!important; overflow:visible!important; border-radius:var(--ppbui-radius)!important; background:transparent!important; color:var(--ppbui-warning)!important; font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data)!important; font-variant-numeric:tabular-nums; text-align:right; white-space:nowrap; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card::before { display:none!important; content:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card__icon,
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card__charset { filter:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card__name,
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card__compact-level,
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card__body,
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card__hp-bar,
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card__xp-bar { display:none!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card--empty.ppbui-pokemon-card--hud { min-height:52px!important; height:52px!important; max-height:52px!important; background:var(--ppbui-bg-1)!important; color:var(--ppbui-text-muted)!important; opacity:1!important; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card--empty.ppbui-pokemon-card--hud:hover { border-color:var(--ppbui-accent)!important; background:var(--ppbui-bg-2)!important; }
    .pokeidle-team-card.ppbui-pokemon-card--fainted > .ppbui-pokemon-card__meter > i { width:0; }
    [data-ppbui-team-hud-exp-host] { position:relative; }
    [data-ppbui-team-hud-exp-host] > .pokeidle-team-hud__active-bar-text:not([data-ppbui-team-hud-exp]),
    [data-ppbui-team-hud-exp-host] > .pokeidle-team-card__bar-text--xp:not([data-ppbui-team-hud-exp]),
    [data-ppbui-team-hud-exp-host] > .pokeidle-trainer-hud__xp-text:not([data-ppbui-team-hud-exp]) { visibility:hidden; }
    .pokeidle-team-card [data-ppbui-team-hud-exp-host] { min-height:14px; }
    [data-ppbui-team-hud-exp] { position:absolute; z-index:2; inset:0; display:flex; align-items:center; justify-content:center; overflow:hidden; padding:0 2px; color:inherit; font-family:var(--ppbui-font-data); font-size:var(--ppbui-font-size-meta); font-variant-numeric:tabular-nums; line-height:1; text-align:center; text-overflow:clip; white-space:nowrap; pointer-events:none; }
    [data-ppbui-team-hud-hp-host] { position:relative; }
    [data-ppbui-team-hud-hp-host] > .pokeidle-team-hud__active-bar-text:not([data-ppbui-team-hud-hp-value]),
    [data-ppbui-team-hud-hp-host] > .pokeidle-team-card__bar-text:not([data-ppbui-team-hud-hp-value]) { visibility:hidden; }
    .pokeidle-team-card [data-ppbui-team-hud-hp-host] { min-height:12px; }
    [data-ppbui-team-hud-hp-value] { position:absolute; z-index:2; inset:0; display:flex; align-items:center; justify-content:center; overflow:hidden; padding:0 2px; color:inherit; font-family:var(--ppbui-font-data); font-size:var(--ppbui-font-size-meta); font-variant-numeric:tabular-nums; line-height:1; text-align:center; text-overflow:clip; white-space:nowrap; pointer-events:none; }
    .pokeidle-team-hud[data-ppbui-team-hud-enhanced] [data-ppbui-team-hud-trainer-row] { --ppbui-meter-label-width:28px; grid-column:1/-1; width:100%; min-width:0; }
    [data-ppbui-team-hud-trainer-row] > .pokeidle-team-hud__active-stat-label { width:auto; min-width:0; margin:0; }
    [data-ppbui-team-hud-trainer-row] > .pokeidle-team-hud__active-bar { grid-column:auto!important; grid-row:auto!important; width:100%; min-width:0; margin:0!important; }
    [data-ppbui-team-hud-sta-host] { position:relative; }
    [data-ppbui-team-hud-sta-host] > .pokeidle-trainer-hud__stamina-text:not([data-ppbui-team-hud-sta]) { visibility:hidden; }
    [data-ppbui-team-hud-sta] { position:absolute; z-index:2; inset:0; display:flex; align-items:center; justify-content:center; overflow:hidden; padding:0 2px; font-family:var(--ppbui-font-data); font-size:var(--ppbui-font-size-meta); font-variant-numeric:tabular-nums; line-height:1; text-align:center; text-overflow:clip; white-space:nowrap; pointer-events:none; }
    @container (max-width:279px) {
      .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__list { grid-template-columns:repeat(3,minmax(0,1fr)); gap:0!important; }
      .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card.ppbui-pokemon-card--hud:nth-child(3n+1) { border-left:var(--ppbui-border-width) solid var(--ppbui-pokemon-card-border)!important; }
      .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card.ppbui-pokemon-card--hud:nth-child(n+4) { border-top:0!important; }
      .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card,
      .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-card--empty { min-height:52px!important; height:52px!important; max-height:52px!important; }
    }
    @media (pointer:coarse) {
      .pokeidle-team-hud[data-ppbui-team-hud-enhanced] .pokeidle-team-hud__collapse { width:40px!important; min-width:40px; height:40px!important; min-height:40px; }
    }
  `;
  root.append(style); root.dataset.ppbuiTeamHudEnhanced = "";

  function enhance(card, text, position, active, creature) {
    if (!originals.has(card)) originals.set(card, { role: card.getAttribute("role"), tabindex: card.getAttribute("tabindex"), aria: card.getAttribute("aria-label"), ariaDisabled: card.getAttribute("aria-disabled"), ownedAriaDisabled: null });
    const original = originals.get(card), currentDisabled = card.getAttribute("aria-disabled");
    if (original.ownedAriaDisabled === null) original.ariaDisabled = currentDisabled;
    else if (currentDisabled !== original.ownedAriaDisabled) original.ariaDisabled = currentDisabled;
    if (card.getAttribute("role") !== "button") card.setAttribute("role", "button");
    if (card.getAttribute("tabindex") !== "0") card.setAttribute("tabindex", "0");
    const facts = cardFacts(card), fainted = card.classList.contains("is-fainted");
    if (!card.classList.contains("ppbui-pokemon-card")) card.classList.add("ppbui-pokemon-card");
    if (!card.classList.contains("ppbui-pokemon-card--hud")) card.classList.add("ppbui-pokemon-card--hud");
    if (card.classList.contains("ppbui-pokemon-card--active") !== active) card.classList.toggle("ppbui-pokemon-card--active", active);
    if (card.classList.contains("ppbui-pokemon-card--fainted") !== fainted) card.classList.toggle("ppbui-pokemon-card--fainted", fainted);
    if (fainted) {
      if (card.getAttribute("aria-disabled") !== "true") card.setAttribute("aria-disabled", "true");
      original.ownedAriaDisabled = "true";
    } else if (original.ownedAriaDisabled !== null) {
      if (card.getAttribute("aria-disabled") === original.ownedAriaDisabled) original.ariaDisabled === null ? card.removeAttribute("aria-disabled") : card.setAttribute("aria-disabled", original.ariaDisabled);
      original.ownedAriaDisabled = null;
    }
    const label = [`${position}. ${facts.name}`, facts.level, facts.hp, active ? text.active : "", fainted ? text.fainted : ""].filter(Boolean).join(" · ");
    if (card.getAttribute("aria-label") !== label) card.setAttribute("aria-label", label);
    let positionNode = card.querySelector("[data-ppbui-team-hud-position]");
    if (!positionNode) { positionNode = doc.createElement("span"); positionNode.dataset.ppbuiTeamHudPosition = ""; positionNode.setAttribute("aria-hidden", "true"); card.append(positionNode); }
    if (!positionNode.classList.contains("ppbui-pokemon-card__position")) positionNode.classList.add("ppbui-pokemon-card__position");
    if (positionNode.textContent !== String(position)) positionNode.textContent = String(position);
    const visual = card.querySelector(".pokeidle-team-card__icon") || card.querySelector(".pokeidle-team-card__charset") || card.querySelector("img,canvas");
    if (visual && !visual.classList.contains("ppbui-pokemon-card__visual")) visual.classList.add("ppbui-pokemon-card__visual");
    card.querySelector("[data-ppbui-team-hud-active]")?.remove();
    let hp = card.querySelector("[data-ppbui-team-hud-hp]");
    if (!hp) { hp = doc.createElement("span"); hp.dataset.ppbuiTeamHudHp = ""; hp.setAttribute("aria-hidden", "true"); const fill = doc.createElement("i"); fill.className = "ppbui-pokemon-card__meter-fill"; hp.append(fill); card.append(hp); }
    if (!hp.classList.contains("ppbui-pokemon-card__meter")) hp.classList.add("ppbui-pokemon-card__meter");
    let meta = card.querySelector("[data-ppbui-team-hud-meta]");
    if (!meta) { meta = doc.createElement("span"); meta.dataset.ppbuiTeamHudMeta = ""; meta.className = "ppbui-pokemon-card__meta"; meta.setAttribute("aria-hidden", "true"); card.append(meta); }
    const currentHp = Number(creature?.hp), maxHp = Number(creature?.max_hp);
    const hpPercent = Number.isFinite(currentHp) && Number.isFinite(maxHp) && maxHp > 0 ? Math.max(0, Math.min(100, Math.round(currentHp / maxHp * 100))) : null;
    const metaText = facts.level ? facts.level.replace(/\s+/g, "") : "";
    if (meta.textContent !== metaText) meta.textContent = metaText;
    const fill = hp.firstElementChild, width = hpPercent !== null ? `${hpPercent}%` : "0%";
    if (fill?.style.width !== width) fill.style.width = width;
    card.querySelector("[data-ppbui-team-hud-fainted]")?.remove();
  }

  function reorderCards(list, cards, ids) {
    if (!list || !ids.length || cards.length < 2) return;
    const byId = new Map(cards.map(card => [String(card.dataset.creatureId || ""), card]));
    const desired = ids.map(id => byId.get(String(id))).filter(Boolean);
    if (desired.length !== cards.length) return;
    const current = [...list.querySelectorAll(config.selectors.card)];
    if (current.length === desired.length && current.every((card, index) => card === desired[index])) return;
    const firstEmpty = list.querySelector(".pokeidle-team-card--empty");
    desired.forEach(card => list.insertBefore(card, firstEmpty));
  }

  function sync() {
    const text = teamHudText(doc), { list, cards } = hudParts(root), order = teamHudOfficialOrder(root);
    const runtime = teamHudRuntime(root), creatures = runtime?._creatures || [];
    const leader = creatures.find(creature => creature.is_leader) || creatures[0], activeId = String(leader?.id ?? "");
    root.querySelectorAll(".pokeidle-team-card--empty").forEach(card => {
      if (!card.classList.contains("ppbui-pokemon-card")) card.classList.add("ppbui-pokemon-card");
      if (!card.classList.contains("ppbui-pokemon-card--hud")) card.classList.add("ppbui-pokemon-card--hud");
    });
    const byId = new Map(creatures.map(creature => [String(creature?.id ?? ""), creature]));
    cards.forEach((card, index) => {
      const id = String(card.dataset.creatureId || ""), official = order.indexOf(id);
      enhance(card, text, (official >= 0 ? official : index) + 1, Boolean(id && id === activeId), byId.get(id));
    });
    reorderCards(list, cards, order);
    renderExperience(root.querySelector(config.selectors.activeXpBar), leader);
    renderHp(root.querySelector(config.selectors.activeHpBar), leader);
    const activeElements = root.querySelector(config.selectors.activeElements), elementList = activeElements?.firstElementChild;
    const elementTypes = (leader?.elements || leader?.species?.elements || []).map(element => String(element).toLowerCase());
    decorateElementIconList(elementList, elementTypes, doc.defaultView?.PokeIdle?.ElementIcons, { small: true, scope: root });
    const trainerXp = root.querySelector(config.selectors.trainerXpBar), stamina = root.querySelector(config.selectors.trainerStaminaBar);
    wrapTrainerBar(trainerXp, "EXP"); wrapTrainerBar(stamina, "STA");
    renderExperience(trainerXp, runtime?._trainer, "pokeidle-team-hud__active-bar-text");
    renderStamina(stamina);
    setBarTitles();
    for (const card of originals.keys()) if (!card.isConnected || !root.contains(card)) originals.delete(card);
  }

  function renderExperience(host, creature, nativeClass) {
    if (!host) return;
    const experience = levelExperience(creature), old = host.querySelector("[data-ppbui-team-hud-exp]");
    if (!experience) { old?.remove(); host.removeAttribute("data-ppbui-team-hud-exp-host"); return; }
    if (!host.hasAttribute("data-ppbui-team-hud-exp-host")) host.dataset.ppbuiTeamHudExpHost = "";
    const output = old || doc.createElement("span");
    if (!old) {
      output.dataset.ppbuiTeamHudExp = "";
      output.className = nativeClass || (host.matches(config.selectors.activeXpBar) ? "pokeidle-team-hud__active-bar-text" : "pokeidle-team-card__bar-text");
      host.append(output);
    }
    const exactLabel = `${grouped(experience.current)} / ${grouped(experience.required)} · ${experience.percent}%`;
    const compact = Math.max(Math.abs(Number(experience.current)), Math.abs(Number(experience.required))) >= 1e6;
    const label = `${meterNumber(experience.current, compact)} / ${meterNumber(experience.required, compact)} · ${experience.percent}%`;
    if (output.textContent !== label) output.textContent = label;
    if (output.title !== exactLabel) output.title = exactLabel;
    if (output.getAttribute("aria-label") !== exactLabel) output.setAttribute("aria-label", exactLabel);
    if (output.dataset.ppbuiExactValue !== exactLabel) output.dataset.ppbuiExactValue = exactLabel;
  }

  function wrapTrainerBar(bar, label) {
    if (!bar || trainerRows.has(bar) || bar.closest("[data-ppbui-team-hud-trainer-row]")) return;
    const anchor = doc.createComment(`ppbui-team-hud-${label.toLowerCase()}`), row = doc.createElement("div"), caption = doc.createElement("span");
    row.className = "pokeidle-team-hud__active-stat ppbui-meter-row"; row.dataset.ppbuiTeamHudTrainerRow = ""; caption.className = "pokeidle-team-hud__active-stat-label ppbui-meter-row__label"; caption.textContent = label;
    const fill = bar.firstElementChild;
    trainerClasses.set(bar, { bar: bar.className, fill: fill?.className || null });
    bar.classList.add("pokeidle-team-hud__active-bar", label === "EXP" ? "pokeidle-team-hud__active-bar--xp" : "pokeidle-team-hud__active-bar--hp");
    fill?.classList.add("pokeidle-team-hud__active-fill", label === "EXP" ? "pokeidle-team-hud__active-fill--xp" : "pokeidle-team-hud__active-fill--hp");
    bar.before(anchor); row.append(caption, bar); anchor.after(row); trainerRows.set(bar, { anchor, row });
  }

  function renderStamina(host) {
    if (!host) return;
    const native = host.querySelector(".pokeidle-trainer-hud__stamina-text:not([data-ppbui-team-hud-sta])"), old = host.querySelector("[data-ppbui-team-hud-sta]");
    if (!native) { old?.remove(); return; }
    if (!host.hasAttribute("data-ppbui-team-hud-sta-host")) host.dataset.ppbuiTeamHudStaHost = "";
    const output = old || doc.createElement("span");
    if (!old) { output.dataset.ppbuiTeamHudSta = ""; output.className = "pokeidle-team-hud__active-bar-text"; host.append(output); }
    const label = native.textContent.replace(/^\s*stamina\s*/i, "").trim();
    if (output.textContent !== label) output.textContent = label;
    if (output.dataset.ppbuiExactValue !== label) output.dataset.ppbuiExactValue = label;
  }

  function setBarTitles() {
    root.querySelectorAll(`${config.selectors.activeHpBar}, ${config.selectors.activeXpBar}, ${config.selectors.trainerXpBar}, ${config.selectors.trainerStaminaBar}`).forEach(bar => {
      if (!barTitles.has(bar)) barTitles.set(bar, bar.getAttribute("title"));
      const output = bar.querySelector("[data-ppbui-team-hud-hp-value], [data-ppbui-team-hud-exp], [data-ppbui-team-hud-sta]");
      const value = output?.dataset.ppbuiExactValue || output?.textContent.trim() || bar.textContent.trim();
      if (bar.title !== value) bar.title = value;
    });
  }

  function renderHp(host, creature) {
    if (!host) return;
    const hp = Number(creature?.hp), maximum = Number(creature?.max_hp), old = host.querySelector("[data-ppbui-team-hud-hp-value]");
    if (![hp, maximum].every(Number.isFinite) || maximum <= 0) { old?.remove(); host.removeAttribute("data-ppbui-team-hud-hp-host"); return; }
    if (!host.hasAttribute("data-ppbui-team-hud-hp-host")) host.dataset.ppbuiTeamHudHpHost = "";
    const output = old || doc.createElement("span");
    if (!old) {
      output.dataset.ppbuiTeamHudHpValue = "";
      output.className = host.matches(config.selectors.activeHpBar) ? "pokeidle-team-hud__active-bar-text" : "pokeidle-team-card__bar-text";
      host.append(output);
    }
    const exactLabel = `${grouped(Math.max(0, hp))} / ${grouped(maximum)}`;
    const compact = Math.max(Math.abs(hp), Math.abs(maximum)) >= 1e6;
    const label = `${meterNumber(Math.max(0, hp), compact)} / ${meterNumber(maximum, compact)}`;
    if (output.textContent !== label) output.textContent = label;
    if (output.title !== exactLabel) output.title = exactLabel;
    if (output.getAttribute("aria-label") !== exactLabel) output.setAttribute("aria-label", exactLabel);
    if (output.dataset.ppbuiExactValue !== exactLabel) output.dataset.ppbuiExactValue = exactLabel;
  }

  function keydown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest(config.selectors.interactive)) return;
    const card = event.target.closest(config.selectors.card);
    if (!card || !root.contains(card) || card.classList.contains("is-fainted") || card.getAttribute("aria-disabled") === "true") return;
    event.preventDefault(); card.click();
  }

  root.addEventListener("keydown", keydown); sync();
  return { sync, cleanup() {
    root.removeEventListener("keydown", keydown);
    root.querySelectorAll("[data-ppbui-team-hud-hp], [data-ppbui-team-hud-meta], [data-ppbui-team-hud-fainted], [data-ppbui-team-hud-position], [data-ppbui-team-hud-active], [data-ppbui-team-hud-exp], [data-ppbui-team-hud-hp-value], [data-ppbui-team-hud-sta]").forEach(node => node.remove());
    root.querySelectorAll("[data-ppbui-team-hud-exp-host]").forEach(node => node.removeAttribute("data-ppbui-team-hud-exp-host"));
    root.querySelectorAll("[data-ppbui-team-hud-hp-host]").forEach(node => node.removeAttribute("data-ppbui-team-hud-hp-host"));
    root.querySelectorAll("[data-ppbui-team-hud-sta-host]").forEach(node => node.removeAttribute("data-ppbui-team-hud-sta-host"));
    for (const [bar, { anchor, row }] of trainerRows) if (bar.isConnected && anchor.isConnected) { anchor.replaceWith(bar); row.remove(); }
    trainerRows.clear();
    for (const [bar, classes] of trainerClasses) if (bar.isConnected) { bar.className = classes.bar; if (bar.firstElementChild && classes.fill !== null) bar.firstElementChild.className = classes.fill; }
    trainerClasses.clear();
    for (const [bar, title] of barTitles) if (bar.isConnected) title === null ? bar.removeAttribute("title") : bar.setAttribute("title", title);
    barTitles.clear();
    const native = teamHudRuntime(root), nativeParts = hudParts(root);
    reorderCards(nativeParts.list, nativeParts.cards, (native?._creatures || []).map(creature => String(creature?.id ?? "")).filter(Boolean));
    for (const [card, old] of originals) if (card.isConnected && root.contains(card)) {
      for (const [attribute, value] of [["role", old.role], ["tabindex", old.tabindex], ["aria-label", old.aria]]) value === null ? card.removeAttribute(attribute) : card.setAttribute(attribute, value);
      if (old.ownedAriaDisabled !== null && card.getAttribute("aria-disabled") === old.ownedAriaDisabled) old.ariaDisabled === null ? card.removeAttribute("aria-disabled") : card.setAttribute("aria-disabled", old.ariaDisabled);
    }
    root.querySelectorAll(".pokeidle-team-card").forEach(card => {
      card.classList.remove("ppbui-pokemon-card", "ppbui-pokemon-card--hud", "ppbui-pokemon-card--active", "ppbui-pokemon-card--fainted");
      card.querySelectorAll(".ppbui-pokemon-card__visual").forEach(node => node.classList.remove("ppbui-pokemon-card__visual"));
    });
    releaseElementIconLists(root); originals.clear(); root.removeAttribute("data-ppbui-team-hud-enhanced"); if(!hadRootClass)root.classList.remove("ppbui-root"); style.remove();
  } };
}
