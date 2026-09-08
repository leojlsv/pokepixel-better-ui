import { inventoryConfig as config } from "./config.js";
import { locale, placeNodes, readCreatures, readInventoryScene, readItems, readSlot } from "./dom.js";

export const viewText = () => config.viewText[locale().split(/[-_]/)[0]] || config.viewText.en;
const content = (node, value) => { if (node.textContent !== value) node.textContent = value; };
const categoryOf = item => {
  const category = item?.category || item?.type;
  return category === "boost" || String(category).startsWith("boost_") ? "boost" : category;
};

export function createInventoryViews(root) {
  const owned = new Set(), containers = new Set(), rows = new Map(), groups = new Map();
  let currentGrid = null;
  const style = document.createElement("style");
  style.dataset.ppbuiInventoryViewsStyle = "";
  style.textContent = `
    [data-ppbui-inventory-view="list"] { grid-template-columns: minmax(0, 1fr); grid-auto-rows: auto; }
    [data-ppbui-inventory-view="grouped"] { display: block; padding: 0; border: 0; background: none; box-shadow: none; }
    [data-ppbui-inventory-view] > .is-empty { display: none; }
    [data-ppbui-inventory-row] { display: flex; align-items: center; gap: 9px; min-width: 0; }
    [data-ppbui-inventory-row] > .inventory-slot { flex: 0 0 56px; }
    [data-ppbui-inventory-info] { min-width: 0; overflow-wrap: anywhere; text-align: left; }
    [data-ppbui-inventory-info] p { margin: 0; text-align: left; }
  `;
  root.append(style);
  const make = (tag, container = false) => {
    const node = document.createElement(tag); owned.add(node);
    if (container) containers.add(node);
    return node;
  };
  const nativeNodes = grid => [...grid.childNodes].flatMap(node => containers.has(node) ? nativeNodes(node) : owned.has(node) ? [] : [node]);
  const discard = () => { for (const node of owned) node.remove(); owned.clear(); containers.clear(); rows.clear(); groups.clear(); };
  return {
    nativeNodes,
    render(grid, nodes, mode, parts) {
      if (currentGrid !== grid) { discard(); currentGrid = grid; }
      if (mode === "grid") {
        placeNodes(grid, nodes); discard();
        grid.removeAttribute("data-ppbui-inventory-view");
        return;
      }
      if (grid.dataset.ppbuiInventoryView !== mode) grid.dataset.ppbuiInventoryView = mode;
      const text = viewText(), creatures = readCreatures(parts.body), scene = readInventoryScene(parts.body);
      const items = Array.isArray(scene?._items) ? scene._items : [];
      const priceItems = mode === "list" ? readItems(parts.body) : new Map();
      const itemCategories = new Map();
      for (const item of items) {
        if (!itemCategories.has(item.name)) itemCategories.set(item.name, new Set());
        itemCategories.get(item.name).add(categoryOf(item) || "other");
      }
      const categories = new Map([...parts.category.options].filter(option => option.value !== "all").map(option => [option.value, option.textContent]));
      categories.set("pokemon", categories.get("pokemon") || "Pokémon");
      const slots = nodes.filter(node => node.nodeType === 1 && node.matches(config.selectors.slot));
      const data = slots.map(node => {
        const row = readSlot(node, creatures, priceItems);
        const known = itemCategories.get(row.name);
        const category = row.pokemon ? "pokemon" : known?.size === 1 ? [...known][0] : "other";
        return { ...row, category, categoryLabel: categories.get(category) || (category === "other" ? text.other : category) };
      });
      const used = new Set(), output = [];
      if (mode === "list") {
        for (const row of data) {
          let entry = rows.get(row.node);
          if (!entry) {
            const wrapper = make("div", true), info = make("div"), name = make("strong"), detail = make("p"), price = make("p");
            wrapper.dataset.ppbuiInventoryRow = ""; info.dataset.ppbuiInventoryInfo = "";
            info.className = "inventory-slots-hint"; detail.className = "inventory-slots-hint";
            price.className = "inventory-slots-hint"; price.dataset.ppbuiInventoryPrice = "";
            info.append(name, detail, price); wrapper.append(info);
            entry = { wrapper, info, name, detail, price, priceKey: null }; rows.set(row.node, entry);
          }
          const facts = [row.categoryLabel];
          if (row.pokemon) {
            if (row.level !== null) facts.push(`${text.level}: ${row.level}`);
            if (row.iv !== null) facts.push(`IV: ${row.iv}/186`);
            if (row.quality !== null) facts.push(`${text.quality}: ×${row.quality}`);
            if (row.node.classList.contains("is-equipped")) facts.push(text.equipped);
            if (row.node.classList.contains("inventory-slot--shiny")) facts.push("Shiny");
          } else if (row.quantity !== null) facts.push(`${text.quantity}: ${row.quantity.toLocaleString(locale())}`);
          if (row.node.querySelector(config.selectors.locked)) facts.push(text.locked);
          content(entry.name, row.name); content(entry.detail, facts.join(" · "));
          const priceKey = JSON.stringify([row.pokemon, row.price, locale()]);
          if (entry.priceKey !== priceKey) {
            entry.priceKey = priceKey;
            entry.price.replaceChildren();
            entry.price.append(`${text.price}: `);
            const currency = document.defaultView?.PokeIdle?.Currency;
            entry.price.append(row.price === null ? "—" : typeof currency?.element === "function" ? currency.element(row.price, { showName: true }) : row.price.toLocaleString(locale()));
          }
          placeNodes(entry.wrapper, [row.node, entry.info]);
          output.push(entry.wrapper); used.add(entry.wrapper);
        }
      } else {
        const buckets = new Map();
        for (const row of data) { if (!buckets.has(row.category)) buckets.set(row.category, []); buckets.get(row.category).push(row); }
        const keys = [...categories.keys(), ...buckets.keys()].filter((key, index, all) => all.indexOf(key) === index && buckets.has(key));
        for (const key of keys) {
          let group = groups.get(key);
          if (!group) {
            const section = make("section", true), heading = make("h3"), body = make("div", true);
            section.dataset.ppbuiInventoryCategory = key;
            heading.className = "inventory-slots-hint"; body.className = "inventory-slot-grid";
            section.append(heading, body); group = { section, heading, body }; groups.set(key, group);
          }
          const bucket = buckets.get(key);
          content(group.heading, `${bucket[0].categoryLabel} (${bucket.length})`);
          placeNodes(group.body, bucket.map(row => row.node));
          output.push(group.section); used.add(group.section);
        }
      }
      // Keep native padding cells available for an exact return to the original grid.
      output.push(...nodes.filter(node => !slots.includes(node)));
      placeNodes(grid, output);
      for (const entry of rows.values()) if (!used.has(entry.wrapper)) entry.wrapper.remove();
      for (const group of groups.values()) if (!used.has(group.section)) group.section.remove();
    },
    cleanup(grid, nodes) {
      if (grid) { placeNodes(grid, nodes); grid.removeAttribute("data-ppbui-inventory-view"); }
      discard(); style.remove();
    },
  };
}
