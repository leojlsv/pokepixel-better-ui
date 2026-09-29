import { menuBarConfig as config } from "./config.js";
import { groupLabel, isAvailable, isVisible } from "./dom.js";
import styles from "./styles.js";

export function mountMenuBar({ toolbar, actions, structure }) {
  const { classes, selectors } = config;
  const doc = toolbar.ownerDocument;
  const undo = [];
  const positions = new Map();
  const created = [];
  const masks = new Map();
  const groups = [];
  const placements = new Map();
  const byId = new Map(actions.map(button => [button.dataset.menuId, button]));
  const iconSignature = node => node?.outerHTML || "";
  const cloneIcon = node => {
    if (!node) return null;
    const clone = node.cloneNode(true);
    clone.removeAttribute?.("id");
    clone.querySelectorAll?.("[id]").forEach(child => child.removeAttribute("id"));
    return clone;
  };
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
  const styleProperty = (node, property, value, priority = "important") => {
    if (!node) return;
    const before = node.style.getPropertyValue(property);
    const beforePriority = node.style.getPropertyPriority(property);
    const hadStyle = node.hasAttribute("style");
    node.style.setProperty(property, value, priority);
    const applied = node.style.getPropertyValue(property);
    const appliedPriority = node.style.getPropertyPriority(property);
    undo.push(() => {
      if (node.style.getPropertyValue(property) !== applied || node.style.getPropertyPriority(property) !== appliedPriority) return;
      if (before) node.style.setProperty(property, before, beforePriority);
      else node.style.removeProperty(property);
      if (!hadStyle && !node.style.cssText) node.removeAttribute("style");
    });
  };
  const style = doc.createElement("style");
  style.dataset.ppbuiStyle = config.id;
  style.textContent = styles;
  doc.head.append(style);
  attribute(toolbar, "data-ppbui-menu-bar", "");
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
    const source = items[0] || null;
    let group = structure.find(node => node?.dataset.menuGroup === definition.id);
    let ownedTrigger = false;
    if (!group && !items.length) return;
    let trigger = group?.querySelector(selectors.trigger);
    let dropdown = group?.querySelector(selectors.dropdown);
    if (group && (!trigger || !dropdown)) return;
    if (!group) {
      group = doc.createElement("div");
      group.className = classes.group;
      // Only the passive presentation is copied; the trigger gets its own handler.
      trigger = items[0].cloneNode(true);
      ownedTrigger = true;
      for (const name of trigger.getAttributeNames()) if (!["class", "style"].includes(name)) trigger.removeAttribute(name);
      for (const badge of trigger.querySelectorAll(selectors.badge)) badge.remove();
      trigger.type = "button";
      trigger.className = classes.button;
      trigger.hidden = false;
      trigger.style.removeProperty("display");
      trigger.setAttribute("aria-haspopup", "menu");
      trigger.setAttribute("aria-expanded", "false");
      dropdown = doc.createElement("div");
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
    token(dropdown, "ppbui-menu-popup", true);
    token(dropdown, "ppbui-scroll", true);
    // Every grouped menu owns its physical anchor. The live Poké Hub can inject
    // later positioning rules, so stylesheet specificity alone is insufficient.
    // Keep the dropdown contiguous with the trigger to preserve pointer hover,
    // and bound tall single-column host layouts to the visible viewport.
    styleProperty(group, "position", "relative");
    styleProperty(dropdown, "position", "absolute");
    styleProperty(dropdown, "left", "50%");
    styleProperty(dropdown, "right", "auto");
    styleProperty(dropdown, "top", "auto");
    styleProperty(dropdown, "bottom", "100%");
    styleProperty(dropdown, "transform", "translateX(-50%)");
    styleProperty(dropdown, "z-index", "2147483646");
    styleProperty(dropdown, "display", "grid");
    styleProperty(dropdown, "box-sizing", "border-box");
    styleProperty(dropdown, "width", "min(282px, calc(100vw - 16px))");
    styleProperty(dropdown, "min-width", "0px");
    styleProperty(dropdown, "grid-template-columns", "repeat(3, minmax(0, 1fr))");
    styleProperty(dropdown, "gap", "6px");
    styleProperty(dropdown, "max-width", "calc(100vw - 16px)");
    styleProperty(dropdown, "max-height", "calc(100dvh - 96px)");
    styleProperty(dropdown, "overflow-x", "hidden");
    styleProperty(dropdown, "overflow-y", "auto");
    styleProperty(dropdown, "overscroll-behavior", "contain");
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
      token(button, "ppbui-menu-popup-item", true);
      token(button.querySelector(selectors.label), classes.label, false);
      styleProperty(button, "position", "relative");
      styleProperty(button, "box-sizing", "border-box");
      styleProperty(button, "width", "100%");
      styleProperty(button, "min-width", "0px");
      styleProperty(button, "min-height", "64px");
      styleProperty(button, "flex-direction", "column");
      styleProperty(button, "align-items", "center");
      styleProperty(button, "justify-content", "center");
      styleProperty(button, "gap", "3px");
      styleProperty(button, "transform", "none");
      dropdown.append(button);
      placements.set(button, dropdown);
    }
    groups.push({ id: definition.id, group, trigger, dropdown, rename, source, ownedTrigger, sourceIconSignature: iconSignature(source?.querySelector(selectors.icon)) });
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
  const close = (entry, restoreFocus = false) => {
    setOpen(entry, false);
    if (restoreFocus) entry.trigger.focus();
    else if (entry.group.contains(document.activeElement)) document.activeElement.blur();
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
        close(entry, true);
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
      if (entry.ownedTrigger) {
        const sourceIcon = entry.source?.querySelector(selectors.icon) || null;
        const nextSignature = iconSignature(sourceIcon);
        if (nextSignature !== entry.sourceIconSignature) {
          const currentIcon = entry.trigger.querySelector(selectors.icon);
          const replacement = cloneIcon(sourceIcon);
          if (currentIcon && replacement) currentIcon.replaceWith(replacement);
          else if (currentIcon) currentIcon.remove();
          else if (replacement) entry.trigger.insertBefore(replacement, entry.trigger.querySelector(selectors.label) || entry.trigger.firstChild);
          entry.sourceIconSignature = nextSignature;
        }
      }
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
      style.remove();
    },
  };
}
