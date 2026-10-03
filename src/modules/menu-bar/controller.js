import { menuBarConfig as config } from "./config.js";
import { groupLabel, isAvailable, isVisible } from "./dom.js";
import styles from "./styles.js";
import { buffStripConfig } from "../buff-strip/config.js";

const menuIcons = Object.freeze(typeof __PPBUI_MENU_ICONS__ === "object" && __PPBUI_MENU_ICONS__ ? __PPBUI_MENU_ICONS__ : {});

export function mountMenuBar({ toolbar, actions, structure }) {
  const { classes, selectors } = config;
  const doc = toolbar.ownerDocument;
  const win = doc.defaultView;
  const undo = [];
  const positions = new Map();
  const created = [];
  const masks = new Map();
  const popupPlacement = new Map();
  const collapsedStyles = new Map();
  const groups = [];
  const ownedCityActions = [];
  let hoveredEntry = null;
  const placements = new Map();
  let orientation = "horizontal";
  let orientationPersistent = true;
  let collapsedState = null;
  let nativeGeometryTouched = false;
  let geometryFrame = null;
  let geometryClaimed = false;
  const geometryHadStyleBefore = toolbar.hasAttribute("style");
  const geometryBefore = new Map();
  const geometryApplied = new Map();
  const orientationBefore = toolbar.getAttribute("data-ppbui-menu-orientation");
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
  const claimInitialGeometry = (property, value) => {
    if (!geometryBefore.has(property)) {
      geometryBefore.set(property, [
        toolbar.style.getPropertyValue(property),
        toolbar.style.getPropertyPriority(property),
      ]);
    }
    toolbar.style.setProperty(property, value, "important");
    geometryApplied.set(property, [
      toolbar.style.getPropertyValue(property),
      toolbar.style.getPropertyPriority(property),
    ]);
  };
  const restoreInitialGeometry = () => {
    const hostChangedGeometry = nativeGeometryTouched || [...geometryApplied].some(([property, [value, priority]]) =>
      toolbar.style.getPropertyValue(property) !== value || toolbar.style.getPropertyPriority(property) !== priority);
    if (hostChangedGeometry) return;
    for (const [property, [value, priority]] of geometryBefore) {
      if (value) toolbar.style.setProperty(property, value, priority);
      else toolbar.style.removeProperty(property);
    }
    if (!geometryHadStyleBefore && !toolbar.style.cssText) toolbar.removeAttribute("style");
  };
  const emitToolbarState = (eventName, detail) => {
    if (!win?.dispatchEvent || !win.CustomEvent) return;
    win.dispatchEvent(new win.CustomEvent(eventName, {
      detail: { toolbar, ...detail },
    }));
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
  const popupProperty = (node, property, value, priority = "important") => {
    let properties = popupPlacement.get(node);
    if (!properties) {
      properties = new Map();
      popupPlacement.set(node, properties);
    }
    if (!properties.has(property)) {
      properties.set(property, [
        node.style.getPropertyValue(property),
        node.style.getPropertyPriority(property),
        node.hasAttribute("style"),
      ]);
    }
    if (node.style.getPropertyValue(property) !== value || node.style.getPropertyPriority(property) !== priority) {
      node.style.setProperty(property, value, priority);
    }
  };
  const collapsedProperty = (node, property, value) => {
    let state = collapsedStyles.get(node);
    if (!state) {
      state = { hadStyle: node.hasAttribute("style"), properties: new Map() };
      collapsedStyles.set(node, state);
    }
    if (!state.properties.has(property)) {
      state.properties.set(property, [
        node.style.getPropertyValue(property),
        node.style.getPropertyPriority(property),
      ]);
    }
    node.style.setProperty(property, value, "important");
  };
  const clearCollapsedStyles = () => {
    for (const [node, state] of collapsedStyles) {
      for (const [property, [value, priority]] of state.properties) {
        if (value) node.style.setProperty(property, value, priority);
        else node.style.removeProperty(property);
      }
      if (!state.hadStyle && !node.style.cssText) node.removeAttribute("style");
    }
    collapsedStyles.clear();
  };
  const syncCollapsed = () => {
    const collapsed = toolbar.classList.contains("is-collapsed");
    if (!collapsed) {
      clearCollapsedStyles();
    } else {
      for (const [property, value] of [
        ["display", "block"],
        ["box-sizing", "border-box"],
        ["width", "32px"],
        ["min-width", "32px"],
        ["max-width", "32px"],
        ["height", "32px"],
        ["min-height", "32px"],
        ["max-height", "32px"],
      ]) collapsedProperty(toolbar, property, value);
      for (const child of toolbar.children) {
        if (child.matches(selectors.toggle)) {
          for (const [property, value] of [
            ["display", "grid"],
            ["position", "absolute"],
            ["top", "0px"],
            ["bottom", "auto"],
            ["left", "0px"],
            ["right", "auto"],
            ["width", "32px"],
            ["min-width", "32px"],
            ["height", "32px"],
            ["min-height", "32px"],
          ]) collapsedProperty(child, property, value);
        } else {
          collapsedProperty(child, "display", "none");
        }
      }
    }
    if (collapsedState !== collapsed) {
      collapsedState = collapsed;
      emitToolbarState(config.events.collapseChange, { collapsed, orientation });
    }
  };
  const style = doc.createElement("style");
  style.dataset.ppbuiStyle = config.id;
  style.textContent = styles;
  doc.head.append(style);
  attribute(toolbar, "data-ppbui-menu-bar", "");
  try {
    const saved = doc.defaultView?.localStorage?.getItem(config.orientationStorageKey);
    if (config.orientations.includes(saved)) orientation = saved;
  } catch {
    orientationPersistent = false;
  }
  const applyOrientation = value => {
    const before = toolbar.getAttribute("data-ppbui-menu-orientation");
    orientation = config.orientations.includes(value) ? value : "horizontal";
    toolbar.setAttribute("data-ppbui-menu-orientation", orientation);
    if (before !== orientation) {
      emitToolbarState(config.events.orientationChange, { orientation });
    }
  };
  undo.push(() => {
    if (orientationBefore === null) toolbar.removeAttribute("data-ppbui-menu-orientation");
    else toolbar.setAttribute("data-ppbui-menu-orientation", orientationBefore);
  });
  const setOrientation = value => {
    applyOrientation(value);
    try {
      doc.defaultView?.localStorage?.setItem(config.orientationStorageKey, orientation);
      orientationPersistent = true;
    } catch {
      orientationPersistent = false;
    }
  };
  applyOrientation(orientation);
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
    const collapsedDisplay = collapsedStyles.get(node)?.properties?.get("display")?.[0];
    const display = collapsedDisplay !== undefined ? collapsedDisplay : node.style.display;
    return !node.hidden && node.getAttribute("aria-hidden") !== "true" &&
      (masked ? masked[0] !== "none" : display !== "none");
  };
  const menuItems = dropdown => [...dropdown.querySelectorAll(`${selectors.action}, ${selectors.cityAction}`)];
  const createMenuIcon = (name, className = "") => {
    const image = doc.createElement("img");
    image.className = `pokeidle-top-toolbar__icon ppbui-menu-owned-icon${className ? ` ${className}` : ""}`;
    image.dataset.ppbuiMenuIcon = name;
    image.alt = "";
    image.draggable = false;
    image.setAttribute("aria-hidden", "true");
    if (typeof menuIcons[name] === "string" && menuIcons[name]) image.src = menuIcons[name];
    return image;
  };
  const canOpenGym = () => typeof win?.Scene_Gym === "function" &&
    typeof win?.SceneManager?.push === "function" && win.SceneManager._nextScene == null;
  const openGym = () => {
    if (!canOpenGym()) return false;
    const manager = win.SceneManager;
    const Gym = win.Scene_Gym;
    const current = manager._scene;
    const previousNext = manager._nextScene;
    const stack = Array.isArray(manager._stack) ? manager._stack : null;
    const stackLength = stack?.length;
    try {
      manager.push(Gym);
      return manager._nextScene?.constructor === Gym;
    } catch {
      if (manager._nextScene === previousNext && stack && stack.length === stackLength + 1 && stack[stackLength] === current?.constructor) {
        stack.length = stackLength;
      }
      return false;
    }
  };
  const syncOwnedCityActions = () => {
    for (const { button, shortcut } of ownedCityActions) {
      const available = shortcut.scene === "gym" ? canOpenGym() : typeof win?.PokeIdle?.NPC?.open === "function";
      if (button.disabled === available) button.disabled = !available;
    }
  };
  const stylePopupItem = button => {
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
    styleProperty(dropdown, "position", "fixed");
    popupProperty(dropdown, "left", "8px");
    styleProperty(dropdown, "right", "auto");
    popupProperty(dropdown, "top", "8px");
    styleProperty(dropdown, "bottom", "auto");
    styleProperty(dropdown, "transform", "none");
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
    if (definition.id === "player") {
      const originalIcon = trigger.querySelector(selectors.icon);
      const trainerIcon = createMenuIcon("trainer", "ppbui-menu-trigger-icon");
      if (originalIcon) originalIcon.replaceWith(trainerIcon);
      else trigger.insertBefore(trainerIcon, label || trigger.firstChild);
      undo.push(() => {
        if (!trainerIcon.isConnected) return;
        if (originalIcon) trainerIcon.replaceWith(originalIcon);
        else trainerIcon.remove();
      });
    }
    for (const button of items) {
      token(button, classes.button, false);
      token(button, classes.item, true);
      token(button, "ppbui-menu-popup-item", true);
      token(button.querySelector(selectors.label), classes.label, false);
      stylePopupItem(button);
      dropdown.append(button);
      placements.set(button, dropdown);
    }
    if (definition.id === "city") {
      for (const shortcut of config.cityActions) {
        const button = doc.createElement("button");
        button.type = "button";
        button.className = `${classes.item} ppbui-menu-popup-item`;
        button.dataset.ppbuiCityAction = shortcut.id;
        button.setAttribute("aria-label", shortcut.label);
        const label = doc.createElement("span");
        label.textContent = shortcut.label;
        button.append(createMenuIcon(shortcut.icon, "ppbui-menu-city-icon"), label);
        stylePopupItem(button);
        listen(button, "click", () => {
          if (shortcut.scene === "gym") {
            openGym();
            return;
          }
          const npc = win?.PokeIdle?.NPC;
          if (typeof npc?.open === "function") npc.open({ kind: shortcut.kind, name: shortcut.label });
        });
        dropdown.append(button);
        ownedCityActions.push({ button, shortcut, dropdown });
      }
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
  const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
  const normalizeHubGeometry = () => {
    if (geometryClaimed || !toolbar.classList.contains("pokeidle-pokehub") || !toolbar.classList.contains("pokeidle-island")) return geometryClaimed;
    const rect = toolbar.getBoundingClientRect();
    const viewportWidth = doc.documentElement?.clientWidth || win?.innerWidth || 0;
    const viewportHeight = doc.documentElement?.clientHeight || win?.innerHeight || 0;
    if (!(rect.width > 0 && rect.height > 0 && viewportWidth > 0 && viewportHeight > 0)) return false;
    const margin = 8;
    const left = clamp(rect.left, margin, viewportWidth - rect.width - margin);
    const top = clamp(rect.top, margin, viewportHeight - rect.height - margin);
    claimInitialGeometry("left", `${Math.round(left)}px`);
    claimInitialGeometry("top", `${Math.round(top)}px`);
    claimInitialGeometry("bottom", "auto");
    claimInitialGeometry("transform", "none");
    geometryClaimed = true;
    return true;
  };
  const queueGeometryNormalization = attempts => {
    if (normalizeHubGeometry() || attempts <= 0 || typeof win?.requestAnimationFrame !== "function") return;
    geometryFrame = win.requestAnimationFrame(() => {
      geometryFrame = null;
      queueGeometryNormalization(attempts - 1);
    });
  };
  queueGeometryNormalization(2);
  const handle = toolbar.querySelector(selectors.handle);
  if (handle) {
    listen(handle, "pointerdown", () => { nativeGeometryTouched = true; }, true);
    listen(handle, "keydown", event => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) nativeGeometryTouched = true;
    }, true);
  }
  const itemOrder = groups.map(({ dropdown }) => ({
    dropdown,
    items: [...dropdown.querySelectorAll(selectors.action)].filter(button => placements.has(button)),
  }));
  const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const positionDropdown = entry => {
    if (!geometryClaimed) normalizeHubGeometry();
    if (entry.id === "city") syncOwnedCityActions();
    const win = doc.defaultView;
    const viewportWidth = doc.documentElement?.clientWidth || win?.innerWidth || 0;
    const viewportHeight = doc.documentElement?.clientHeight || win?.innerHeight || 0;
    if (!viewportWidth || !viewportHeight) return;
    const triggerRect = entry.trigger.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    popupProperty(entry.dropdown, "max-height", "calc(100dvh - 96px)");
    const popupRect = entry.dropdown.getBoundingClientRect();
    const popupWidth = popupRect.width || Math.min(282, Math.max(0, viewportWidth - 16));
    const popupHeight = popupRect.height || Math.min(240, Math.max(0, viewportHeight - 16));
    const margin = 8;
    const gap = 0;
    const obstacleGap = 4;
    let left;
    let top;
    if (orientation === "vertical") {
      const right = toolbarRect.right + gap;
      const leftSide = toolbarRect.left - gap - popupWidth;
      if (right + popupWidth <= viewportWidth - margin) left = right;
      else if (leftSide >= margin) left = leftSide;
      else {
        const rightSpace = viewportWidth - toolbarRect.right;
        const leftSpace = toolbarRect.left;
        left = rightSpace >= leftSpace ? right : leftSide;
      }
      top = triggerRect.top + (triggerRect.height - popupHeight) / 2;
    } else {
      left = triggerRect.left + (triggerRect.width - popupWidth) / 2;
      const above = toolbarRect.top - gap - popupHeight;
      top = above >= margin ? above : toolbarRect.bottom + gap;
    }
    left = clamp(left, margin, viewportWidth - popupWidth - margin);
    top = clamp(top, margin, viewportHeight - popupHeight - margin);

    const buffStrip = doc.querySelector('.pokeidle-buff-strip[data-ppbui-buff-strip]:not([hidden])');
    const buffRect = buffStrip?.getBoundingClientRect?.();
    if (buffRect?.width > 0 && buffRect?.height > 0) {
      const candidate = { left, right:left + popupWidth, top, bottom:top + popupHeight };
      if (overlaps(candidate, buffRect)) {
        const minTop = margin;
        const maxTop = Math.max(minTop, viewportHeight - popupHeight - margin);
        const above = buffRect.top - obstacleGap - popupHeight;
        const below = buffRect.bottom + obstacleGap;
        const canAbove = above >= minTop;
        const canBelow = below <= maxTop;
        if (canAbove || canBelow) {
          if (canAbove && canBelow) top = Math.abs(above - top) <= Math.abs(below - top) ? above : below;
          else top = canAbove ? above : below;
        } else {
          const aboveFree = Math.max(0, buffRect.top - obstacleGap - margin);
          const belowTop = buffRect.bottom + obstacleGap;
          const belowFree = Math.max(0, viewportHeight - margin - belowTop);
          if (belowFree >= aboveFree) {
            top = belowTop;
            popupProperty(entry.dropdown, "max-height", `${Math.floor(belowFree)}px`);
          } else {
            top = margin;
            popupProperty(entry.dropdown, "max-height", `${Math.floor(aboveFree)}px`);
          }
        }
      }
    }

    popupProperty(entry.dropdown, "left", `${Math.round(left)}px`);
    popupProperty(entry.dropdown, "top", `${Math.round(top)}px`);
  };
  const setOpen = (entry, open) => {
    if (open) positionDropdown(entry);
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
    listen(entry.group, "pointerenter", () => {
      hoveredEntry = entry;
      positionDropdown(entry);
    });
    listen(entry.group, "pointerleave", () => {
      if (hoveredEntry === entry) hoveredEntry = null;
    });
    listen(entry.group, "focusin", () => positionDropdown(entry));
    // Native action handlers may stop bubbling before the dropdown is reached.
    for (const button of menuItems(entry.dropdown)) listen(button, "click", () => close(entry));
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
      if (entry.id === "city") syncOwnedCityActions();
      const items = menuItems(entry.dropdown).filter(isAvailable);
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
  listen(doc.defaultView, "resize", () => {
    nativeGeometryTouched = true;
    for (const entry of groups) positionDropdown(entry);
  });
  listen(doc.defaultView, buffStripConfig.events.geometryChange, event => {
    if (event.detail?.toolbar && event.detail.toolbar !== toolbar) return;
    const active = new Set();
    if (hoveredEntry) active.add(hoveredEntry);
    for (const entry of groups) {
      if (entry.group.classList.contains(classes.open) || entry.group.contains(document.activeElement)) active.add(entry);
    }
    for (const entry of active) positionDropdown(entry);
  });
  const outside = event => {
    for (const entry of groups) if (!entry.group.contains(event.target)) close(entry);
  };
  listen(document, "pointerdown", outside, true);
  listen(toolbar, "click", outside, true);
  const sync = () => {
    if (!geometryClaimed) normalizeHubGeometry();
    syncCollapsed();
    syncOwnedCityActions();
    for (const [button, parents] of sources) mask(button, !nativeVisible(button) || parents.some(parent => !nativeVisible(parent)));
    for (const entry of groups) {
      if (entry.ownedTrigger && entry.id !== "player") {
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
      const empty = !menuItems(entry.dropdown).some(isVisible);
      mask(entry.group, empty);
      if (empty) close(entry);
    }
  };
  const ToolbarMutationObserver = win?.MutationObserver || globalThis.MutationObserver;
  const toolbarStateObserver = ToolbarMutationObserver ? new ToolbarMutationObserver(() => sync()) : null;
  toolbarStateObserver?.observe(toolbar, { attributes:true, attributeFilter:["class"] });
  sync();
  return {
    sync,
    getOrientation: () => orientation,
    setOrientation,
    isOrientationPersistent: () => orientationPersistent,
    isIntact: () => groups.every(({ group, trigger, dropdown }) => group.parentNode === toolbar && trigger.parentNode === group && dropdown.parentNode === group) &&
      ownedCityActions.every(({ button, dropdown }) => button.parentNode === dropdown) &&
      [...placements].every(([button, parent]) => button.parentNode === parent) &&
      itemOrder.every(({ dropdown, items }) => {
        const current = [...dropdown.querySelectorAll(selectors.action)].filter(button => items.includes(button));
        return items.every((button, index) => current[index] === button);
      }) &&
      ordered.every((node, index) => [...toolbar.children].filter(child => ordered.includes(child))[index] === node),
    cleanup() {
      toolbarStateObserver?.disconnect();
      if (geometryFrame !== null) win?.cancelAnimationFrame?.(geometryFrame);
      clearCollapsedStyles();
      for (const node of [...masks.keys()]) mask(node, false);
      for (const [node, properties] of popupPlacement) {
        for (const [property, [value, priority, hadStyle]] of properties) {
          if (value) node.style.setProperty(property, value, priority);
          else node.style.removeProperty(property);
          if (!hadStyle && !node.style.cssText) node.removeAttribute("style");
        }
      }
      // A native group rebuild can replace its source while moved actions survive elsewhere.
      for (const button of actions) {
        const replacement = [...toolbar.querySelectorAll(selectors.action)].find(node =>
          node !== button && node.dataset.menuId === button.dataset.menuId);
        if (replacement) button.remove();
      }
      for (const { button } of ownedCityActions) button.remove();
      for (const restore of undo.reverse()) restore();
      restoreInitialGeometry();
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
