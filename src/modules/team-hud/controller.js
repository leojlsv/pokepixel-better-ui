import { teamHudConfig as config } from "./config.js";
import { cardFacts, hudParts, levelExperience, teamHudRuntime, teamHudText } from "./dom.js";

const grouped = number => Number(number).toLocaleString("en-US");

export function mountTeamHud(root) {
  const doc = root.ownerDocument, originals = new Map(), barTitles = new Map(), trainerRows = new Map(), trainerClasses = new Map();
  const style = doc.createElement("style"); style.dataset.ppbuiModule = config.id;
  style.textContent = `
    .pokeidle-team-card > [data-ppbui-team-hud-hp] { position:absolute; right:3px; bottom:3px; left:3px; height:3px; overflow:hidden; background:#111; border:1px solid rgba(0,0,0,.75); pointer-events:none; }
    .pokeidle-team-card > [data-ppbui-team-hud-hp] > i { display:block; width:var(--hp-percent,0%); height:100%; background:var(--element-color,#68c64a); }
    .pokeidle-team-card.is-fainted > [data-ppbui-team-hud-hp] > i { width:0; }
    .pokeidle-team-card > [data-ppbui-team-hud-fainted] { position:absolute; right:2px; bottom:7px; left:2px; overflow:hidden; color:#d4aaa5; font-size:8px; font-weight:700; line-height:1; text-align:center; text-shadow:0 1px 1px #000; white-space:nowrap; pointer-events:none; }
    [data-ppbui-team-hud-exp-host] { position:relative; }
    [data-ppbui-team-hud-exp-host] > .pokeidle-team-hud__active-bar-text:not([data-ppbui-team-hud-exp]),
    [data-ppbui-team-hud-exp-host] > .pokeidle-team-card__bar-text--xp:not([data-ppbui-team-hud-exp]),
    [data-ppbui-team-hud-exp-host] > .pokeidle-trainer-hud__xp-text:not([data-ppbui-team-hud-exp]) { visibility:hidden; }
    [data-ppbui-team-hud-exp] { position:absolute; z-index:2; inset:0; overflow:hidden; padding:0 2px; text-overflow:ellipsis; white-space:nowrap; pointer-events:none; }
    [data-ppbui-team-hud-hp-host] { position:relative; }
    [data-ppbui-team-hud-hp-host] > .pokeidle-team-hud__active-bar-text:not([data-ppbui-team-hud-hp-value]),
    [data-ppbui-team-hud-hp-host] > .pokeidle-team-card__bar-text:not([data-ppbui-team-hud-hp-value]) { visibility:hidden; }
    [data-ppbui-team-hud-hp-value] { position:absolute; z-index:2; inset:0; overflow:hidden; padding:0 2px; text-overflow:ellipsis; white-space:nowrap; pointer-events:none; }
    .pokeidle-team-hud__active-stat[data-ppbui-team-hud-trainer-row] { display:flex !important; flex-direction:row !important; grid-column:1/-1; align-items:center; gap:4px; width:100%; }
    [data-ppbui-team-hud-trainer-row] > .pokeidle-team-hud__active-stat-label { flex:0 0 28px; width:28px; margin:0; }
    [data-ppbui-team-hud-trainer-row] > .pokeidle-team-hud__active-bar { flex:1 1 auto; width:auto; min-width:0; margin:0; }
    [data-ppbui-team-hud-sta-host] { position:relative; }
    [data-ppbui-team-hud-sta-host] > .pokeidle-trainer-hud__stamina-text:not([data-ppbui-team-hud-sta]) { visibility:hidden; }
    [data-ppbui-team-hud-sta] { position:absolute; z-index:2; inset:0; overflow:hidden; padding:0 2px; text-overflow:ellipsis; white-space:nowrap; pointer-events:none; }
  `;
  root.append(style);

  function enhance(card, text) {
    if (!originals.has(card)) originals.set(card, { role: card.getAttribute("role"), tabindex: card.getAttribute("tabindex"), aria: card.getAttribute("aria-label") });
    if (card.getAttribute("role") !== "button") card.setAttribute("role", "button");
    if (card.getAttribute("tabindex") !== "0") card.setAttribute("tabindex", "0");
    const facts = cardFacts(card), fainted = card.classList.contains("is-fainted");
    const label = [facts.name, facts.level, facts.hp, fainted ? text.fainted : ""].filter(Boolean).join(" · ");
    if (card.getAttribute("aria-label") !== label) card.setAttribute("aria-label", label);
    let hp = card.querySelector("[data-ppbui-team-hud-hp]");
    if (!hp) { hp = doc.createElement("span"); hp.dataset.ppbuiTeamHudHp = ""; hp.setAttribute("aria-hidden", "true"); hp.append(doc.createElement("i")); card.append(hp); }
    let state = card.querySelector("[data-ppbui-team-hud-fainted]");
    if (fainted && !state) { state = doc.createElement("span"); state.dataset.ppbuiTeamHudFainted = ""; state.textContent = text.fainted; state.setAttribute("aria-hidden", "true"); card.append(state); }
    if (!fainted) state?.remove(); else if (state.textContent !== text.fainted) state.textContent = text.fainted;
  }

  function sync() {
    const text = teamHudText(doc), { cards } = hudParts(root);
    cards.forEach(card => enhance(card, text));
    const runtime = teamHudRuntime(root), creatures = runtime?._creatures || [];
    cards.forEach(card => renderExperience(card.querySelector(config.selectors.cardXpBar), creatures.find(creature => String(creature.id) === card.dataset.creatureId)));
    cards.forEach(card => renderHp(card.querySelector(config.selectors.cardHpBar), creatures.find(creature => String(creature.id) === card.dataset.creatureId)));
    const leader = creatures.find(creature => creature.is_leader) || creatures[0];
    renderExperience(root.querySelector(config.selectors.activeXpBar), leader);
    renderHp(root.querySelector(config.selectors.activeHpBar), leader);
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
    const label = `${grouped(experience.current)} / ${grouped(experience.required)} · ${experience.percent}%`;
    if (output.textContent !== label) output.textContent = label;
    if (output.title !== label) output.title = label;
    if (output.getAttribute("aria-label") !== label) output.setAttribute("aria-label", label);
  }

  function wrapTrainerBar(bar, label) {
    if (!bar || trainerRows.has(bar) || bar.closest("[data-ppbui-team-hud-trainer-row]")) return;
    const anchor = doc.createComment(`ppbui-team-hud-${label.toLowerCase()}`), row = doc.createElement("div"), caption = doc.createElement("span");
    row.className = "pokeidle-team-hud__active-stat"; row.dataset.ppbuiTeamHudTrainerRow = ""; caption.className = "pokeidle-team-hud__active-stat-label"; caption.textContent = label;
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
  }

  function setBarTitles() {
    root.querySelectorAll(`${config.selectors.activeHpBar}, ${config.selectors.activeXpBar}, ${config.selectors.cardHpBar}, ${config.selectors.cardXpBar}, ${config.selectors.trainerXpBar}, ${config.selectors.trainerStaminaBar}`).forEach(bar => {
      if (!barTitles.has(bar)) barTitles.set(bar, bar.getAttribute("title"));
      const value = bar.querySelector("[data-ppbui-team-hud-hp-value], [data-ppbui-team-hud-exp], [data-ppbui-team-hud-sta]")?.textContent.trim() || bar.textContent.trim();
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
    const label = `${grouped(Math.max(0, hp))} / ${grouped(maximum)}`;
    if (output.textContent !== label) output.textContent = label;
    if (output.title !== label) output.title = label;
    if (output.getAttribute("aria-label") !== label) output.setAttribute("aria-label", label);
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
    root.querySelectorAll("[data-ppbui-team-hud-hp], [data-ppbui-team-hud-fainted], [data-ppbui-team-hud-exp], [data-ppbui-team-hud-hp-value], [data-ppbui-team-hud-sta]").forEach(node => node.remove());
    root.querySelectorAll("[data-ppbui-team-hud-exp-host]").forEach(node => node.removeAttribute("data-ppbui-team-hud-exp-host"));
    root.querySelectorAll("[data-ppbui-team-hud-hp-host]").forEach(node => node.removeAttribute("data-ppbui-team-hud-hp-host"));
    root.querySelectorAll("[data-ppbui-team-hud-sta-host]").forEach(node => node.removeAttribute("data-ppbui-team-hud-sta-host"));
    for (const [bar, { anchor, row }] of trainerRows) if (bar.isConnected && anchor.isConnected) { anchor.replaceWith(bar); row.remove(); }
    trainerRows.clear();
    for (const [bar, classes] of trainerClasses) if (bar.isConnected) { bar.className = classes.bar; if (bar.firstElementChild && classes.fill !== null) bar.firstElementChild.className = classes.fill; }
    trainerClasses.clear();
    for (const [bar, title] of barTitles) if (bar.isConnected) title === null ? bar.removeAttribute("title") : bar.setAttribute("title", title);
    barTitles.clear();
    for (const [card, old] of originals) if (card.isConnected && root.contains(card)) {
      for (const [attribute, value] of [["role", old.role], ["tabindex", old.tabindex], ["aria-label", old.aria]]) value === null ? card.removeAttribute(attribute) : card.setAttribute(attribute, value);
    }
    originals.clear(); style.remove();
  } };
}
