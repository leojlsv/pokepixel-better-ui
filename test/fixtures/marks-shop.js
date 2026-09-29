// Synthetic shop contract. Native-looking handlers only update local counters;
// tests never perform purchases or sales against the live game.
export function setupShop(doc) {
  const win = doc.defaultView;
  const root = doc.createElement("div"); root.className = "pokeidle-panel game-window npc-shop-window";
  const title = doc.createElement("div"); title.className = "pokeidle-panel__titlebar"; title.textContent = "MARK’S SHOP";
  const body = doc.createElement("div"); body.className = "pokeidle-panel__body"; root.append(title, body); doc.body.append(root);
  const creature = (id, species_id, name, quality, level, sell_value) => ({
    id, species_id, species:{ name }, species_name:name, quality, level, sell_value,
    location:"storage", locked:false, is_shiny:false,
  });
  const npc = {
    panel:{ body }, shopTab:"buy", shopQuery:"", shopPokemonQuery:"", shopGold:4321,
    selectedItems:new Set(), sellQuantities:new Map(), selectedCreatures:new Set(),
    pokemonQualityFilters:new Set(["common", "rare"]), shopSpecies:{},
    shopCreatures:[
      creature("a", "pikachu", "Pikachu", "common", 12, 250),
      creature("b", "pikachu", "Pikachu", "rare", 30, 780),
      creature("c", "gastly", "Gastly", "common", 8, 125),
    ],
    changes:[], purchases:[], itemSales:0, sales:0, buybacks:0, closes:0,
  };
  win.PokeIdle = {
    NPC:npc,
    Localization:{ get:()=>doc.documentElement.lang || "en" },
    DittoDisplayName:{ get:c=>c.nickname || c.species.name },
  };
  const el = (tag, className = "", text = "") => { const n = doc.createElement(tag); n.className = className; n.textContent = text; return n; };
  const button = (text, className, action) => { const n = el("button", className, text); n.type = "button"; n.addEventListener("click", action); return n; };
  const qualityLabel = quality => quality.replace(/^./, letter => letter.toUpperCase());

  function render() {
    body.replaceChildren();
    const search = el("input", "npc-shop__search"); search.type = "search";
    search.placeholder = ({ buy:"Search items to buy", sell:"Search items to sell", pokemon:"Search Pokémon", buyback:"Search buyback" })[npc.shopTab];
    search.setAttribute("aria-label", search.placeholder);
    search.value = npc.shopTab === "pokemon" ? npc.shopPokemonQuery : npc.shopQuery;
    const shell = el("div", "npc-shop__shell"), sidebar = el("aside", "npc-shop__sidebar"), tabs = el("nav", "npc-shop__tabs"), content = el("section", "npc-shop__content");
    ["buy", "sell", "pokemon", "buyback"].forEach((key, i) => tabs.append(button(
      ["Buy items", "Sell items", "Sell Pokémon", "Buyback"][i],
      `npc-shop__tab${npc.shopTab === key ? " is-active" : ""}`,
      () => { npc.shopTab = key; npc.selectedItems.clear(); render(); },
    )));
    sidebar.append(tabs); shell.append(sidebar, content); body.append(search, shell);

    function heading(label, count = 3) {
      const node = el("header", "npc-shop__content-heading");
      node.append(el("div", "", label), el("span", "", `${count} available`));
      content.append(node); return node;
    }

    function renderBuy() {
      heading("CATALOG", 6);
      const categories = el("nav", "npc-shop__categories");
      categories.append(button("All", "pokeidle-btn npc-shop__category is-active", () => {}), button("Supplies", "pokeidle-btn npc-shop__category", () => {}));
      content.append(categories);
      const list = el("div", "npc-shop__list npc-shop__buy-grid");
      ["Poké Ball", "Super Potion", "Revive", "Ultra Ball", "Mining Pick", "Antidote"].forEach((name, i) => {
        const row = el("article", "npc-shop__row npc-shop__buy-card"), icon = el("div", "npc-shop__item-icon", "◆"), info = el("div", "npc-shop__item-info");
        info.append(el("b", "", name), el("small", "", "Native item description for checking the purchase layout."), el("em", "npc-shop__item-category", "Supplies"));
        const options = el("div", "npc-shop__purchase-options");
        [1, 10, 100, "Max"].forEach(qty => {
          const b = button("", `pokeidle-btn npc-shop__purchase-button${qty === "Max" ? " npc-shop__purchase-button--max" : ""}`, () => npc.purchases.push([name, qty]));
          b.append(el("strong", "", String(qty)), el("span", "", "·"), el("span", "pokeidle-currency", String((i + 1) * 100)));
          options.append(b);
        });
        const custom = el("div", "npc-shop__custom-purchase"), quantity = el("input"); quantity.type = "number"; quantity.min = "1"; quantity.max = "1000000"; quantity.value = "1";
        const total = el("span", "npc-shop__custom-total", String((i + 1) * 100));
        quantity.addEventListener("input", () => { total.textContent = String(Number(quantity.value) * (i + 1) * 100); });
        custom.append(el("span", "", "Qty"), quantity, total, button("Buy", "pokeidle-btn npc-shop__custom-button", () => npc.purchases.push([name, Number(quantity.value)])));
        options.append(custom); row.append(icon, info, options); list.append(row);
      });
      content.append(list);
    }

    function renderSellItems() {
      const items = [
        { id:"potion", name:"Potion", qty:8, price:75 },
        { id:"ether", name:"Ether", qty:3, price:160 },
      ];
      heading("ITEMS TO SELL", items.length);
      const list = el("div", "npc-shop__list npc-shop__list--sell"), footer = el("div", "npc-shop__sell-footer");
      const sell = button("Sell selected", "pokeidle-btn npc-shop__sell-button", () => npc.itemSales++);
      const update = () => {
        sell.disabled = npc.selectedItems.size === 0;
        sell.textContent = npc.selectedItems.size ? `Sell ${npc.selectedItems.size} item types` : "Sell selected";
      };
      items.forEach(item => {
        const row = el("article", "npc-shop__row npc-shop__sell-row"), check = el("input"); check.type = "checkbox"; check.checked = npc.selectedItems.has(item.id);
        check.addEventListener("change", () => { if (check.checked) npc.selectedItems.add(item.id); else npc.selectedItems.delete(item.id); update(); });
        const info = el("div", "npc-shop__item-info"); info.append(el("b", "", item.name), el("small", "", `${item.qty} sellable · 0 locked`), el("small", "", `Final ${item.price}`));
        const quantityBox = el("label", "npc-shop__sell-quantity"), quantity = el("input"); quantity.type = "number"; quantity.min = "1"; quantity.max = String(item.qty); quantity.value = String(npc.sellQuantities.get(item.id) || item.qty);
        quantity.addEventListener("input", () => { npc.sellQuantities.set(item.id, Number(quantity.value)); if (!npc.selectedItems.has(item.id)) { npc.selectedItems.add(item.id); check.checked = true; } price.textContent = String(Number(quantity.value) * item.price); update(); });
        quantityBox.append(el("span", "", "Qty"), quantity);
        const price = el("span", "npc-shop__price", String(item.qty * item.price));
        row.append(check, el("span", "", "◆"), info, quantityBox, price); list.append(row);
      });
      content.append(list);
      const selectAll = el("label", "npc-shop__select-all"), all = el("input"); all.type = "checkbox";
      selectAll.append(all, doc.createTextNode("Select all")); footer.append(selectAll, sell); content.append(footer); update();
    }

    function renderPokemon() {
      const all = npc.shopCreatures.filter(c => !c.locked && !c.is_shiny && !c.mega_active && c.species_id !== "ditto");
      const filtered = all.filter(c => npc.pokemonQualityFilters.has(c.quality) && `${c.nickname || ""} ${c.species.name} ${c.species_id}`.toLowerCase().includes(npc.shopPokemonQuery.trim().toLowerCase()));
      heading("POKÉMON FOR SALE", all.length);
      const filters = el("div", "npc-shop__quality-filters"); filters.append(el("span", "npc-shop__quality-label", "Rarity"));
      for (const quality of ["common", "rare"]) {
        const active = npc.pokemonQualityFilters.has(quality), q = button(qualityLabel(quality), `npc-shop__quality quality-${quality}${active ? " is-active" : ""}`, () => {
          if (npc.pokemonQualityFilters.has(quality)) npc.pokemonQualityFilters.delete(quality); else npc.pokemonQualityFilters.add(quality); renderContent();
        });
        q.setAttribute("aria-pressed", String(active)); filters.append(q);
      }
      content.append(filters);
      const list = el("div", "npc-shop__list npc-shop__list--pokemon"), footer = el("div", "npc-shop__sell-footer");
      const sell = button("Sell selected", "pokeidle-btn npc-shop__sell-button", () => npc.sales++);
      const update = () => { sell.disabled = npc.selectedCreatures.size === 0; sell.textContent = `Sell ${npc.selectedCreatures.size} Pokémon`; };
      filtered.forEach(c => {
        const row = el("label", "npc-shop__row npc-shop__pokemon-row"), checkbox = el("input"); checkbox.type = "checkbox"; checkbox.checked = npc.selectedCreatures.has(c.id);
        checkbox.addEventListener("change", () => { if (checkbox.checked) npc.selectedCreatures.add(c.id); else npc.selectedCreatures.delete(c.id); npc.changes.push(c.id); update(); });
        const sprite = el("img"); sprite.alt = c.species.name; sprite.src = "/assets/better-ui-icon.png";
        const info = el("div", "npc-shop__item-info"), details = el("small", "npc-shop__pokemon-details");
        details.append(el("span", `npc-shop__rarity quality-${c.quality}`, qualityLabel(c.quality)), doc.createTextNode(" · Power 100"));
        info.append(el("b", "", `${c.nickname || c.species.name} · Lv.${c.level}`), details, el("small", "", `Final ${c.sell_value}`));
        row.append(checkbox, sprite, info, el("span", "npc-shop__price", String(c.sell_value))); list.append(row);
      });
      if (filtered.length) content.append(list); else content.append(el("div", "pokeidle-empty-state", "No Pokémon match"));
      const selectAll = el("label", "npc-shop__select-all"), allCheck = el("input"); allCheck.type = "checkbox";
      selectAll.append(allCheck, doc.createTextNode("Select all (500 per batch)")); footer.append(selectAll, sell); content.append(footer); update();
    }

    function renderBuyback() {
      heading("BUYBACK", 2);
      const list = el("div", "npc-shop__list npc-shop__list--buyback");
      [
        { id:"bb-1", name:"Dragonite", quality:"epic", level:62, price:950 },
        { id:"bb-2", name:"Gengar", quality:"legendary", level:70, price:1450 },
      ].forEach(entry => {
        const row = el("article", "npc-shop__row npc-shop__buyback-row is-creature"), sprite = el("img", "npc-shop__buyback-sprite"); sprite.src = "/assets/better-ui-icon.png"; sprite.alt = entry.name;
        const info = el("div", "npc-shop__item-info npc-shop__buyback-info"), details = el("small", "npc-shop__pokemon-details");
        details.append(doc.createTextNode(`Lv.${entry.level} · `), el("span", `npc-shop__rarity quality-${entry.quality}`, qualityLabel(entry.quality)), doc.createTextNode(" · Power 100"));
        info.append(el("b", "", entry.name), details, el("small", "npc-shop__buyback-date", "Sold yesterday · expires tomorrow"));
        const controls = el("div", "npc-shop__buyback-controls"); controls.append(el("span", "npc-shop__price npc-shop__buyback-total", String(entry.price)), button("Buyback", "pokeidle-btn npc-shop__buyback-button", () => npc.buybacks++));
        row.append(sprite, info, controls); list.append(row);
      });
      content.append(list);
    }

    function renderContent() {
      content.replaceChildren();
      if (npc.shopTab === "buy") renderBuy();
      else if (npc.shopTab === "sell") renderSellItems();
      else if (npc.shopTab === "pokemon") renderPokemon();
      else renderBuyback();
    }
    search.addEventListener("input", () => {
      if (npc.shopTab === "pokemon") npc.shopPokemonQuery = search.value;
      else npc.shopQuery = search.value;
      renderContent();
    });
    renderContent();

    const footer = el("footer", "npc-shop__footer"), wallet = el("div", "npc-shop__footer-wallet");
    wallet.append(el("span", "", "Your balance"), el("span", "npc-shop__gold", String(npc.shopGold)));
    footer.append(wallet, button("Close", "pokeidle-btn npc-shop__close", () => npc.closes++)); body.append(footer);
  }
  render(); return { root, npc, render };
}
