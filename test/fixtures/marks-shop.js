// Synthetic shop contract; handlers never perform purchases or sales.
export function setupShop(doc) {
  const win = doc.defaultView;
  const root = doc.createElement("div"); root.className = "pokeidle-panel game-window npc-shop-window";
  const title = doc.createElement("div"); title.className = "pokeidle-panel__titlebar"; title.textContent = "MARK’S SHOP";
  const body = doc.createElement("div"); body.className = "pokeidle-panel__body"; root.append(title, body); doc.body.append(root);
  const creature = (id, species_id, name, quality, level, sell_value) => ({ id, species_id, species: { name }, species_name: name, quality, level, sell_value, location: "storage", locked: false, is_shiny: false });
  const npc = { panel: { body }, shopTab: "buy", shopPokemonQuery: "", selectedCreatures: new Set(), pokemonQualityFilters: new Set(["common", "rare"]), shopSpecies: {},
    shopCreatures: [creature("a", "pikachu", "Pikachu", "common", 12, 250), creature("b", "pikachu", "Pikachu", "rare", 30, 780), creature("c", "gastly", "Gastly", "common", 8, 125)], changes: [], purchases: [], sales: 0 };
  win.PokeIdle = { NPC: npc, Localization: { get: () => doc.documentElement.lang || "en" }, DittoDisplayName: { get: c => c.nickname || c.species.name } };
  const el = (tag, className = "", text = "") => { const n = doc.createElement(tag); n.className = className; n.textContent = text; return n; };
  const button = (text, className, action) => { const n = el("button", className, text); n.type = "button"; n.addEventListener("click", action); return n; };
  function render() {
    body.replaceChildren();
    const search = el("input", "npc-shop__search"); search.type = "search"; search.placeholder = "Search"; search.value = npc.shopPokemonQuery;
    const shell = el("div", "npc-shop__shell"), sidebar = el("aside", "npc-shop__sidebar"), tabs = el("nav", "npc-shop__tabs"), content = el("section", "npc-shop__content");
    ["buy", "sell", "pokemon", "buyback"].forEach((key, i) => tabs.append(button(["Buy items", "Sell items", "Sell Pokémon", "Buyback"][i], `npc-shop__tab${npc.shopTab === key ? " is-active" : ""}`, () => { npc.shopTab = key; render(); })));
    sidebar.append(tabs); shell.append(sidebar, content); body.append(search, shell);
    function renderContent() {
      content.replaceChildren(); const heading = el("header", "npc-shop__content-heading"); heading.append(el("div", "", npc.shopTab === "buy" ? "CATALOG" : "POKÉMON FOR SALE"), el("span", "", "3 available")); content.append(heading);
      if (npc.shopTab === "buy") {
        const list = el("div", "npc-shop__list npc-shop__buy-grid");
        ["Poké Ball", "Super Potion", "Revive", "Ultra Ball", "Mining Pick", "Antidote"].forEach((name, i) => {
          const row = el("article", "npc-shop__row npc-shop__buy-card"), icon = el("div", "npc-shop__item-icon", "◆"), info = el("div", "npc-shop__item-info");
          info.append(el("b", "", name), el("small", "", "Native item description for checking the purchase list layout."), el("em", "npc-shop__item-category", "Supplies"));
          const options = el("div", "npc-shop__purchase-options");
          [1, 10, 100, "Max"].forEach(qty => { const b = button("", "pokeidle-btn npc-shop__purchase-button", () => npc.purchases.push([name, qty])); b.append(el("strong", "", String(qty)), el("span", "pokeidle-currency", String((i + 1) * 100))); options.append(b); });
          const custom = el("div", "npc-shop__custom-purchase"), quantity = el("input"); quantity.type = "number"; quantity.min = "1"; quantity.max = "1000000"; quantity.value = "1";
          const total = el("span", "npc-shop__custom-total", String((i + 1) * 100));
          quantity.addEventListener("input", () => { total.textContent = String(Number(quantity.value) * (i + 1) * 100); });
          custom.append(el("span", "", "Qty"), quantity, total, button("Buy", "pokeidle-btn npc-shop__custom-button", () => npc.purchases.push([name, Number(quantity.value)])));
          options.append(custom); row.append(icon, info, options); list.append(row);
        }); content.append(list);
      } else if (npc.shopTab === "pokemon") {
        const all = npc.shopCreatures.filter(c => !c.locked && !c.is_shiny && !c.mega_active && c.species_id !== "ditto");
        const filtered = all.filter(c => npc.pokemonQualityFilters.has(c.quality) && `${c.nickname || ""} ${c.species.name} ${c.species_id}`.toLowerCase().includes(npc.shopPokemonQuery.trim().toLowerCase()));
        const list = el("div", "npc-shop__list npc-shop__list--pokemon"), footer = el("div", "npc-shop__sell-footer");
        const sell = button("Sell selected", "pokeidle-btn npc-shop__sell-button", () => npc.sales++);
        const update = () => { sell.disabled = npc.selectedCreatures.size === 0; sell.textContent = `Sell ${npc.selectedCreatures.size} Pokémon`; };
        filtered.forEach(c => {
          const row = el("label", "npc-shop__row npc-shop__pokemon-row"), checkbox = el("input"); checkbox.type = "checkbox"; checkbox.checked = npc.selectedCreatures.has(c.id);
          checkbox.addEventListener("change", () => { if (checkbox.checked) npc.selectedCreatures.add(c.id); else npc.selectedCreatures.delete(c.id); npc.changes.push(c.id); update(); });
          const info = el("div", "npc-shop__item-info"); info.append(el("b", "", `${c.nickname || c.species.name} · Lv.${c.level}`), el("small", "", c.quality));
          row.append(checkbox, el("span", "", "◆"), info, el("span", "npc-shop__price", String(c.sell_value))); list.append(row);
        });
        if (filtered.length) content.append(list);
        footer.append(el("span", "", "Select all (500 per batch)"), sell); content.append(footer); update();
      }
    }
    search.addEventListener("input", () => { npc.shopPokemonQuery = search.value; renderContent(); });
    renderContent();
  }
  render(); return { root, npc, render };
}
