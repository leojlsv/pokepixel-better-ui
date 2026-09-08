import { menuBarConfig as config } from "./config.js";
import { groupLabel, isAvailable, isVisible } from "./dom.js";

export function mountMenuBar({ toolbar, actions, structure }) {
  const { classes, selectors } = config;
  const undo = [];
  const positions = new Map();
  const created = [];
  const masks = new Map();
  const groups = [];
  const placements = new Map();
  const byId = new Map(actions.map(button => [button.dataset.menuId, button]));
  const remember = node => {
    if (positions.has(node)) return;
    const anchor = document.createComment("ppbui-menu-bar-position");
    node.before(anchor);
    positions.set(node, anchor);
  };
  const attribute = (node, name, value) => {
    const before = node.getAttribute(name);
    node.setAttribute(name, value);
    undo.push(() => before === null ? node.removeAttribute(name) : node.setAttribute(name, before));
  };
  const token = (node, name, enabled) => {
    if (!node) return;
    const before = node.classList.contains(name);
    node.classList.toggle(name, enabled);
    const action = node.closest(selectors.action);
    undo.push(() => {
      const replacement = action && [...toolbar.querySelectorAll(selectors.action)].find(button => button.dataset.menuId === action.dataset.menuId);
      const current = replacement && action !== replacement ?
        (node === action ? replacement : replacement.querySelector(selectors.label)) : node;
      current?.classList.toggle(name, before);
    });
  };
  const listen = (node, event, fn, capture = false) => {
    node.addEventListener(event, fn, capture);
    undo.push(() => node.removeEventListener(event, fn, capture));
  };
  const mask = (node, hide) => {
    if (hide && !masks.has(node)) {
      masks.set(node, [node.style.display, node.style.getPropertyPriority("display"), node.hasAttribute("style")]);
      node.style.setProperty("display", "none", "important");
    } else if (!hide && masks.has(node)) {
      const [value, priority, hadStyle] = masks.get(node);
      if (node.style.display === "none" && node.style.getPropertyPriority("display") === "important") {
        if (value) node.style.setProperty("display", value, priority);
        else node.style.removeProperty("display");
        if (!hadStyle && !node.style.cssText) node.removeAttribute("style");
      }
      masks.delete(node);
    }
  };
  const nativeVisible = node => {
    const masked = masks.get(node);
    return !node.hidden && node.getAttribute("aria-hidden") !== "true" &&
      (masked ? masked[0] !== "none" : node.style.display !== "none");
  };
  const sources = new Map(actions.map(button => {
    const parents = [];
    for (let parent = button.parentElement; parent && parent !== toolbar; parent = parent.parentElement) parents.push(parent);
    return [button, parents];
  }));
  for (const node of [...toolbar.childNodes]) remember(node);
  for (const button of actions) remember(button);

  config.groups.forEach((definition, index) => {
    const items = definition.items.map(id => byId.get(id)).filter(Boolean);
    let group = structure.find(node => node?.dataset.menuGroup === definition.id);
    if (!group && !items.length) return;
    let trigger = group?.querySelector(selectors.trigger);
    let dropdown = group?.querySelector(selectors.dropdown);
    if (group && (!trigger || !dropdown)) return;
    if (!group) {
      group = document.createElement("div");
      group.className = classes.group;
      // Only the passive presentation is copied; the trigger gets its own handler.
      trigger = items[0].cloneNode(true);
      for (const name of trigger.getAttributeNames()) if (!["class", "style"].includes(name)) trigger.removeAttribute(name);
      for (const badge of trigger.querySelectorAll(selectors.badge)) badge.remove();
      trigger.type = "button";
      trigger.className = classes.button;
      trigger.hidden = false;
      trigger.style.removeProperty("display");
      trigger.setAttribute("aria-haspopup", "menu");
      trigger.setAttribute("aria-expanded", "false");
      dropdown = document.createElement("div");
      dropdown.className = classes.dropdown;
      dropdown.id = `ppbui-menu-${definition.id}`;
      dropdown.setAttribute("role", "menu");
      trigger.setAttribute("aria-controls", dropdown.id);
      group.append(trigger, dropdown);
      toolbar.append(group);
      created.push(group);
    }
    attribute(group, "data-ppbui-module", config.id);
    attribute(group, "data-ppbui-group", definition.id);
    // Native group-trigger wraps longer names into adjacent toolbar columns.
    token(trigger, "pokeidle-top-toolbar__group-trigger", false);
    const label = trigger.querySelector(selectors.label);
    token(label, classes.label, true);
    let originalLabel = label?.textContent;
    let originalAria = trigger.getAttribute("aria-label");
    let appliedLabel;
    const rename = () => {
      const name = groupLabel(index);
      if (appliedLabel !== undefined) {
        if (label && label.textContent !== appliedLabel) originalLabel = label.textContent;
        if (trigger.getAttribute("aria-label") !== appliedLabel) originalAria = trigger.getAttribute("aria-label");
      }
      if (label && label.textContent !== name) label.textContent = name;
      if (trigger.getAttribute("aria-label") !== name) trigger.setAttribute("aria-label", name);
      appliedLabel = name;
    };
    undo.push(() => {
      if (label?.textContent === appliedLabel) label.textContent = originalLabel;
      if (trigger.getAttribute("aria-label") === appliedLabel) {
        if (originalAria === null) trigger.removeAttribute("aria-label");
        else trigger.setAttribute("aria-label", originalAria);
      }
    });
    for (const button of items) {
      token(button, classes.button, false);
      token(button, classes.item, true);
      token(button.querySelector(selectors.label), classes.label, false);
      dropdown.append(button);
      placements.set(button, dropdown);
    }
    groups.push({ id: definition.id, group, trigger, dropdown, rename });
  });
  const slots = new Map(groups.map(entry => [entry.id, entry.group]));
  for (const id of config.order) {
    const button = byId.get(id);
    if (!button || slots.has(id)) continue;
    token(button, classes.item, false);
    token(button, classes.button, true);
    token(button.querySelector(selectors.label), classes.label, true);
    placements.set(button, toolbar);
    slots.set(id, button);
  }
  const ordered = config.order.map(id => slots.get(id)).filter(Boolean);
  for (const node of ordered) toolbar.append(node);
  const itemOrder = groups.map(({ dropdown }) => ({
    dropdown,
    items: [...dropdown.querySelectorAll(selectors.action)].filter(button => placements.has(button)),
  }));
  const setOpen = (entry, open) => {
    entry.group.classList.toggle(classes.open, open);
    entry.trigger.setAttribute("aria-expanded", String(open));
  };
  const close = entry => {
    setOpen(entry, false);
    if (entry.group.contains(document.activeElement)) document.activeElement.blur();
  };
  const closeOthers = own => {
    for (const entry of groups) if (entry !== own) close(entry);
  };
  for (const entry of groups) {
    let nextOpen;
    listen(entry.trigger, "click", () => { nextOpen = !entry.group.classList.contains(classes.open); }, true);
    listen(entry.trigger, "click", event => {
      event.stopPropagation();
      closeOthers(entry);
      setOpen(entry, nextOpen);
      if (!nextOpen) entry.trigger.blur();
    });
    listen(entry.dropdown, "click", () => close(entry));
    // Native action handlers may stop bubbling before the dropdown is reached.
    for (const button of entry.dropdown.querySelectorAll(selectors.action)) listen(button, "click", () => close(entry));
    listen(entry.group, "focusout", event => {
      if (!entry.group.contains(event.relatedTarget)) setOpen(entry, false);
    });
    listen(entry.group, "keydown", event => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close(entry);
        return;
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      const items = [...entry.dropdown.querySelectorAll(selectors.action)].filter(isAvailable);
      if (!items.length) return;
      event.preventDefault();
      event.stopPropagation();
      closeOthers(entry);
      setOpen(entry, true);
      const current = items.indexOf(document.activeElement);
      const index = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : current < 0 ?
        (event.key === "ArrowDown" ? 0 : items.length - 1) : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[index].focus();
    });
  }
  const outside = event => {
    for (const entry of groups) if (!entry.group.contains(event.target)) close(entry);
  };
  listen(document, "pointerdown", outside, true);
  listen(toolbar, "click", outside, true);
  const sync = () => {
    for (const [button, parents] of sources) mask(button, !nativeVisible(button) || parents.some(parent => !nativeVisible(parent)));
    for (const entry of groups) {
      entry.rename();
      const empty = ![...entry.dropdown.querySelectorAll(selectors.action)].some(isVisible);
      mask(entry.group, empty);
      if (empty) close(entry);
    }
  };
  sync();
  return {
    sync,
    isIntact: () => groups.every(({ group, trigger, dropdown }) => group.parentNode === toolbar && trigger.parentNode === group && dropdown.parentNode === group) &&
      [...placements].every(([button, parent]) => button.parentNode === parent) &&
      itemOrder.every(({ dropdown, items }) => {
        const current = [...dropdown.querySelectorAll(selectors.action)].filter(button => items.includes(button));
        return items.every((button, index) => current[index] === button);
      }) &&
      ordered.every((node, index) => [...toolbar.children].filter(child => ordered.includes(child))[index] === node),
    cleanup() {
      for (const node of [...masks.keys()]) mask(node, false);
      // A native group rebuild can replace its source while moved actions survive elsewhere.
      for (const button of actions) {
        const replacement = [...toolbar.querySelectorAll(selectors.action)].find(node =>
          node !== button && node.dataset.menuId === button.dataset.menuId);
        if (replacement) button.remove();
      }
      for (const restore of undo.reverse()) restore();
      for (const [node, anchor] of [...positions].reverse()) {
        const current = node.nodeType === 1 && node.matches(selectors.action) ?
          [...toolbar.querySelectorAll(selectors.action)].find(button => button.dataset.menuId === node.dataset.menuId) : node;
        if (current && toolbar.contains(current) && toolbar.contains(anchor)) anchor.replaceWith(current);
        else anchor.remove();
      }
      for (const group of created) {
        for (const button of group.querySelectorAll(selectors.action)) toolbar.append(button);
        group.remove();
      }
    },
  };
}
