import { equipPicker, memberName } from "./dom.js";
import { decorateElementIconList, releaseElementIconLists } from "../../core/element-icons.js";

const elements = member => (member?.elements || member?.species?.elements || []).map(item => String(item).toLowerCase());

export function createTeamPicker(doc, sceneSource) {
  let picker = null, toolbar = null, search = null, type = null, rarity = null, clear = null, empty = null;
  const scrollOwnership = new Map();

  const claimScroll = node => {
    if (!node || scrollOwnership.has(node)) return;
    scrollOwnership.set(node, { scroll: node.classList.contains("ppbui-scroll"), scope: node.classList.contains("ppbui-scroll-scope") });
    node.classList.add("ppbui-scroll");
  };
  const releaseScroll = () => {
    for (const [node, original] of scrollOwnership) {
      if (!original.scroll) node.classList.remove("ppbui-scroll");
      if (!original.scope) node.classList.remove("ppbui-scroll-scope");
    }
    scrollOwnership.clear();
  };

  function cleanupPicker() {
    picker?.cards.forEach(card => { card.hidden = false; card.removeAttribute("data-ppbui-team-filtered"); });
    releaseElementIconLists(picker?.root);
    picker?.root?.removeAttribute("data-ppbui-team-picker");
    releaseScroll();
    toolbar?.remove(); empty?.remove(); picker = toolbar = search = type = rarity = clear = empty = null;
  }

  function apply() {
    if (!picker) return;
    const available = sceneSource()?._available || [], query = search.value.trim().toLocaleLowerCase(), selectedType = type.value, selectedRarity = rarity.value;
    if (clear) clear.disabled = !query && !selectedType && !selectedRarity;
    let visible = 0;
    picker.cards.forEach((card, index) => {
      const member = available[index], name = memberName(doc, member).toLocaleLowerCase();
      const match = (!query || name.includes(query)) && (!selectedType || elements(member).includes(selectedType)) && (!selectedRarity || String(member?.quality || "common").toLowerCase() === selectedRarity);
      if (card.hidden === match) card.hidden = !match;
      if (!match && !card.hasAttribute("data-ppbui-team-filtered")) card.dataset.ppbuiTeamFiltered = "";
      if (match && card.hasAttribute("data-ppbui-team-filtered")) card.removeAttribute("data-ppbui-team-filtered");
      if (match) visible++;
    });
    empty.hidden = visible > 0;
  }

  function mount(next, text) {
    cleanupPicker(); picker = next;
    next.root.dataset.ppbuiTeamPicker = "";
    claimScroll(next.root); claimScroll(next.body); claimScroll(next.grid); next.root.classList.add("ppbui-scroll-scope");
    toolbar = doc.createElement("div"); toolbar.className = "inventory-slots-toolbar ppbui-team-picker-toolbar ppbui-toolbar"; toolbar.dataset.ppbuiModule = "team";
    search = doc.createElement("input"); search.type = "search"; search.className = "game-window__search ppbui-input"; search.placeholder = text.search; search.setAttribute("aria-label", text.search);
    type = doc.createElement("select"); type.className = "game-window__select ppbui-select"; type.setAttribute("aria-label", text.element);
    const allTypes = [...new Set((sceneSource()?._available || []).flatMap(elements))].sort();
    const Option = doc.defaultView.Option;
    type.append(new Option(`${text.element}: ${text.all}`, ""), ...allTypes.map(element => new Option(doc.defaultView?.PokeIdle?.ElementIcons?.definition?.(element)?.label || element, element)));
    rarity = doc.createElement("select"); rarity.className = "game-window__select ppbui-select"; rarity.setAttribute("aria-label", text.rarity);
    const qualities = [...new Set((sceneSource()?._available || []).map(member => String(member?.quality || "common").toLowerCase()))];
    rarity.append(new Option(`${text.rarity}: ${text.all}`, ""), ...qualities.map(quality => new Option(doc.defaultView?.PokeIdle?.t?.(`common.quality_m.${quality}`) || quality.replace(/^./, letter => letter.toUpperCase()), quality)));
    clear = doc.createElement("button"); clear.type = "button"; clear.className = "pokeidle-btn ppbui-button"; clear.textContent = text.clear;
    empty = doc.createElement("p"); empty.className = "inventory-slots-hint ppbui-team-picker-empty"; empty.dataset.ppbuiModule = "team"; empty.textContent = text.noResults; empty.hidden = true;
    empty.setAttribute("role", "status"); empty.setAttribute("aria-live", "polite");
    toolbar.append(search, type, rarity, clear); next.intro ? next.intro.after(toolbar) : next.grid.before(toolbar); next.grid.after(empty);
    search.addEventListener("input", apply); type.addEventListener("change", apply); rarity.addEventListener("change", apply);
    clear.addEventListener("click", () => { search.value = ""; type.value = ""; rarity.value = ""; apply(); search.focus({ preventScroll: true }); });
    const icons = doc.defaultView?.PokeIdle?.ElementIcons;
    next.cards.forEach((card, index) => decorateElementIconList(card.querySelector(".team-equip-card__info .pokeidle-element-icons"), elements((sceneSource()?._available || [])[index]), icons, { small: true, scope: next.root }));
    apply();
  }

  return { sync(text) { const next = equipPicker(doc); if (!next) { if (picker) cleanupPicker(); return; } if (next.root !== picker?.root || next.grid !== picker?.grid || next.cards.some((card, index) => card !== picker.cards[index])) mount(next, text); else { const icons = doc.defaultView?.PokeIdle?.ElementIcons, available = sceneSource()?._available || []; next.cards.forEach((card, index) => decorateElementIconList(card.querySelector(".team-equip-card__info .pokeidle-element-icons"), elements(available[index]), icons, { small: true, scope: next.root })); } }, cleanup: cleanupPicker };
}
