import { moduleControlsConfig as config } from "./config.js";
import { closeNativeGroups, controlsText } from "./dom.js";

export function mountControls({ toolbar, icon }, preferences, modules, appearance) {
  const { classes } = config;
  const create = (tag, className) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  };
  const group = create("div", `${classes.group} ppbui-root`);
  group.dataset.ppbuiModule = config.id;
  const trigger = create("button", `${classes.button} ppbui-button ppbui-button--compact`);
  trigger.type = "button";
  trigger.setAttribute("aria-label", "Better UI");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", "ppbui-module-panel");
  // Better UI owns its icon presentation. The host may expose Settings either
  // as a bitmap <img> or as a vector/font-backed node, so cloning that node can
  // accidentally duplicate the Settings glyph when the host representation
  // changes between profiles. Always render the bundled logo as an <img>.
  const image = create("img", "pokeidle-top-toolbar__icon");
  if (typeof __PPBUI_LOGO__ === "string") image.src = __PPBUI_LOGO__;
  else if (icon.tagName === "IMG") image.src = icon.getAttribute("src") || "";
  image.draggable = false;
  image.setAttribute("alt", "Better UI");
  image.setAttribute("aria-hidden", "true");
  const label = create("span", classes.label);
  label.textContent = "Better UI";
  trigger.append(image, label);
  const panel = create("div", `${classes.panel} ppbui-panel`);
  panel.id = "ppbui-module-panel";
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-labelledby", "ppbui-module-title");
  // The preferences panel is Better UI-owned UI, not a native game dropdown.
  // Own the physical anchor inline as well as in CSS so late host styles cannot
  // turn it back into a downward menu via top/inset/transform !important rules.
  group.style.setProperty("position", "relative", "important");
  panel.style.setProperty("position", "absolute", "important");
  panel.style.setProperty("inset", "auto", "important");
  panel.style.setProperty("left", "auto", "important");
  panel.style.setProperty("right", "0", "important");
  panel.style.setProperty("top", "auto", "important");
  panel.style.setProperty("bottom", "calc(100% + 4px)", "important");
  panel.style.setProperty("transform", "none", "important");
  const title = create("div", `${classes.label} ppbui-module-copy`);
  title.id = "ppbui-module-title";
  const status = create("div", `${classes.label} ppbui-module-copy`);
  status.setAttribute("role", "status");
  const appearanceSection = create("div", "ppbui-module-appearance");
  const appearanceTitle = create("strong", "ppbui-module-appearance-title");
  const cornerLabel = create("label", "ppbui-module-appearance-field");
  const cornerCopy = create("span");
  const cornerSelect = create("select", "ppbui-select");
  for (const value of ["square", "rounded"]) {
    const option = create("option");
    option.value = value;
    cornerSelect.append(option);
  }
  cornerLabel.append(cornerCopy, cornerSelect);
  appearanceSection.append(appearanceTitle, cornerLabel);
  const rows = modules.map(module => {
    const row = create("label", "ppbui-module-row");
    const button = create("input"); button.type = "checkbox";
    const copy = create("span", "ppbui-module-row-copy");
    const name = create("strong");
    const description = create("span", "ppbui-module-description");
    description.id = `ppbui-description-${module.id}`;
    button.setAttribute("aria-describedby", description.id);
    copy.append(name, description); row.append(button, copy);
    return { module, row, button, name, description };
  });
  let disclosureState = {}, disclosurePersistent = true;
  try {
    const saved = JSON.parse(document.defaultView.localStorage.getItem(config.disclosureStorageKey) || "{}");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) disclosureState = saved;
  } catch { disclosurePersistent = false; }
  const groups = config.groups.map(({ id, modules: ids }) => {
    const fieldset = create("details", "ppbui-module-section"), legend = create("summary");
    const heading = create("span"), count = create("span", "ppbui-module-group-count");
    legend.append(heading, document.createTextNode(" · "), count);
    fieldset.open = typeof disclosureState[id] === "boolean" ? disclosureState[id] : true;
    fieldset.dataset.ppbuiTheme = id;
    const members = rows.filter(row => ids.includes(row.module.id) || (id === "interface" && !config.groups.some(group => group.modules.includes(row.module.id))));
    fieldset.append(legend, ...members.map(row => row.row));
    fieldset.hidden = !members.length;
    return { id, fieldset, legend, heading, count, members };
  });
  const close = create("button", "pokeidle-btn ppbui-button ppbui-button--compact ppbui-module-close"); close.type = "button";
  const list = create("div", "ppbui-module-list ppbui-scroll");
  list.append(...groups.map(group => group.fieldset));
  panel.append(title, appearanceSection, list, status, close);
  const style = create("style");
  style.dataset.ppbuiStyle = config.id;
  style.textContent = `
    .pokeidle-top-toolbar:has(> [data-ppbui-module="module-controls"].is-open) { z-index:2147483647 !important; }
    [data-ppbui-module="module-controls"] { position:relative !important; }
    [data-ppbui-module="module-controls"].is-open { z-index:2147483647; }
    [data-ppbui-module="module-controls"] > .ppbui-module-panel { position:absolute !important; inset:auto 0 calc(100% + 4px) auto !important; display:grid; min-width:220px; grid-template-columns:minmax(0,1fr); grid-template-rows:auto auto minmax(0,1fr) auto auto; gap:var(--ppbui-space-2); padding:var(--ppbui-space-3); max-width:min(360px,calc(100vw - 16px)); max-height:min(480px,calc(100dvh - 96px)); overflow:hidden; transform:none !important; z-index:2147483647; font:var(--ppbui-font-size-secondary)/var(--ppbui-line-height-body) var(--ppbui-font-body); color:var(--ppbui-text); }
    .ppbui-module-panel > #ppbui-module-title { font:500 var(--ppbui-font-size-title)/var(--ppbui-line-height-tight) var(--ppbui-font-display); letter-spacing:normal; }
    .ppbui-module-appearance { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:end; gap:var(--ppbui-space-3); padding:var(--ppbui-space-3); border:var(--ppbui-separator-width) solid var(--ppbui-border); border-radius:var(--ppbui-radius); background:var(--ppbui-bg-0); }
    .ppbui-module-appearance-title { align-self:center; color:var(--ppbui-text); font-weight:700; }
    .ppbui-module-appearance-field { display:grid; gap:2px; min-width:92px; color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-meta); }
    .ppbui-module-appearance-field > .ppbui-select { min-height:var(--ppbui-compact-control-height); }
    .ppbui-module-list { min-height:0; overflow-y:auto; overflow-x:hidden; overscroll-behavior:contain; }
    .ppbui-module-panel > .ppbui-module-copy { max-width:none; white-space:normal; }
    .ppbui-module-panel .ppbui-module-section { min-width:0; margin:4px 0; padding:0; border:0; text-align:left; }
    .ppbui-module-section > summary { cursor:pointer; padding:6px 0; color:var(--ppbui-text); font:inherit; font-weight:700; }
    .ppbui-module-group-count { color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-meta); font-weight:400; white-space:nowrap; }
    .ppbui-module-section > summary:focus-visible { outline:var(--ppbui-border-width) solid var(--ppbui-focus); outline-offset:2px; }
    .ppbui-module-panel .ppbui-module-row { display:flex; align-items:flex-start; gap:8px; padding:6px 4px; cursor:pointer; text-align:left; }
    .ppbui-module-row:hover { background:var(--ppbui-bg-3); }
    .ppbui-module-row:focus-within { outline:var(--ppbui-separator-width) solid var(--ppbui-focus); outline-offset:-1px; }
    .ppbui-module-row > input { flex:0 0 auto; width:14px; height:14px; margin:0; accent-color:var(--ppbui-selected); cursor:pointer; }
    .ppbui-module-row-copy { display:grid; gap:2px; min-width:0; font:inherit; }
    .ppbui-module-description { color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-meta); font-weight:400; line-height:1.35; }
    .ppbui-module-panel > .ppbui-module-close { min-height:28px; padding:4px 8px; font:inherit; }

  `;
  group.append(trigger, panel, style);
  toolbar.append(group);
  let open = false;
  const setOpen = (value, restoreFocus = false) => {
    open = value;
    // Explicit visibility prevents the native hover rule from opening preferences.
    panel.style.display = open ? "" : "none";
    group.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", String(open));
    if (open) {
      closeNativeGroups(toolbar, group);
      const first = groups.find(group => !group.fieldset.hidden);
      (first ? (first.fieldset.open ? first.members[0].button : first.legend) : close).focus();
    } else if (restoreFocus) trigger.focus();
  };
  const sync = () => {
    const text = controlsText();
    const content = (node, value) => { if (node.textContent !== value) node.textContent = value; };
    content(title, text.title);
    content(appearanceTitle, text.appearance);
    content(cornerCopy, text.corners);
    content(cornerSelect.options[0], text.square);
    content(cornerSelect.options[1], text.rounded);
    cornerSelect.setAttribute("aria-label", text.corners);
    if (appearance && cornerSelect.value !== appearance.getCornerMode()) cornerSelect.value = appearance.getCornerMode();
    content(close, text.close);
    content(status, preferences.isPersistent() && disclosurePersistent && (appearance?.isPersistent?.() ?? true) ? text.saved : text.unsaved);
    for (const group of groups) {
      content(group.heading, text.groups[group.id]);
      content(group.count, `${group.members.filter(row => preferences.isEnabled(row.module.id)).length}/${group.members.length} ${text.activeCount}`);
    }
    for (const { module, button, name: nameNode, description } of rows) {
      const enabled = preferences.isEnabled(module.id);
      const name = module.name(text);
      content(nameNode, name);
      if (button.checked !== enabled) button.checked = enabled;
      content(description, module.description(text));
    }
    if (toolbar.lastElementChild !== group) toolbar.append(group);
  };
  const unlisten = [];
  const listen = (node, type, handler, capture = false) => {
    node.addEventListener(type, handler, capture);
    unlisten.push(() => node.removeEventListener(type, handler, capture));
  };
  listen(trigger, "click", event => { event.stopPropagation(); setOpen(!open); });
  listen(close, "click", () => setOpen(false, true));
  listen(cornerSelect, "change", event => {
    event.stopPropagation();
    appearance?.setCornerMode?.(cornerSelect.value);
    sync();
    cornerSelect.focus();
  });
  for (const { id, fieldset } of groups) listen(fieldset, "toggle", () => {
    if (!fieldset.isConnected || disclosureState[id] === fieldset.open) return;
    disclosureState[id] = fieldset.open;
    try {
      document.defaultView.localStorage.setItem(config.disclosureStorageKey, JSON.stringify(disclosureState));
      disclosurePersistent = true;
    } catch { disclosurePersistent = false; }
    sync();
  });
  for (const { module, button } of rows) listen(button, "change", event => {
    event.stopPropagation();
    preferences.setEnabled(module.id, button.checked);
    sync();
    button.focus();
  });
  listen(group, "keydown", event => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false, true);
    }
  });
  listen(group, "focusout", event => {
    if (open && event.relatedTarget && !group.contains(event.relatedTarget)) setOpen(false);
  });
  const outside = event => { if (open && !group.contains(event.target)) setOpen(false); };
  listen(document, "pointerdown", outside, true);
  listen(toolbar, "click", outside, true);
  const unsubscribeAppearance = appearance?.subscribe?.(sync);
  if (unsubscribeAppearance) unlisten.push(unsubscribeAppearance);
  setOpen(false);
  sync();
  return {
    sync,
    isIntact: () => group.parentNode === toolbar && trigger.parentNode === group && panel.parentNode === group && rows.every(row => row.button.parentNode === row.row && panel.contains(row.row)),
    cleanup() {
      for (const remove of unlisten) remove();
      group.remove();
    },
  };
}
