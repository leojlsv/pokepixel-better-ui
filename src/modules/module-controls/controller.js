import { moduleControlsConfig as config } from "./config.js";
import { closeNativeGroups, controlsText } from "./dom.js";

export function mountControls({ toolbar, icon }, preferences, modules) {
  const { classes } = config;
  const create = (tag, className) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  };
  const group = create("div", classes.group);
  group.dataset.ppbuiModule = config.id;
  const trigger = create("button", classes.button);
  trigger.type = "button";
  trigger.setAttribute("aria-label", "Better UI");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", "ppbui-module-panel");
  // Only the native icon is copied; no game control or action listener is cloned.
  const image = icon.cloneNode(true);
  image.removeAttribute("id");
  if (image.tagName === "IMG" && typeof __PPBUI_LOGO__ === "string") image.src = __PPBUI_LOGO__;
  image.setAttribute("alt", "Better UI");
  image.setAttribute("aria-hidden", "true");
  const label = create("span", classes.label);
  label.textContent = "Better UI";
  trigger.append(image, label);
  const panel = create("div", classes.panel);
  panel.classList.add("ppbui-module-panel");
  panel.id = "ppbui-module-panel";
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-labelledby", "ppbui-module-title");
  const title = create("div", `${classes.label} ppbui-module-copy`);
  title.id = "ppbui-module-title";
  const status = create("div", `${classes.label} ppbui-module-copy`);
  status.setAttribute("role", "status");
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
  const groups = config.groups.map(({ id, modules: ids }) => {
    const fieldset = create("fieldset", "ppbui-module-section"), legend = create("legend");
    const members = rows.filter(row => ids.includes(row.module.id) || (id === "interface" && !config.groups.some(group => group.modules.includes(row.module.id))));
    fieldset.append(legend, ...members.map(row => row.row));
    fieldset.hidden = !members.length;
    return { id, fieldset, legend };
  });
  const close = create("button", "pokeidle-btn ppbui-module-close"); close.type = "button";
  panel.append(title, ...groups.map(group => group.fieldset), status, close);
  const style = create("style");
  style.dataset.ppbuiStyle = config.id;
  style.textContent = `
    [data-ppbui-module="module-controls"] > .ppbui-module-panel { grid-template-columns:minmax(0,1fr); font:11px var(--ui-font-body,Arial,sans-serif); color:var(--ui-ink,#e2e0dc); }
    .ppbui-module-panel > .ppbui-module-copy { max-width:none; white-space:normal; }
    .ppbui-module-panel .ppbui-module-section { min-width:0; margin:4px 0; padding:0; border:0; text-align:left; }
    .ppbui-module-section > legend { padding:4px 0; color:var(--ui-gold-light,#f1d681); font:inherit; font-weight:700; }
    .ppbui-module-panel .ppbui-module-row { display:flex; align-items:flex-start; gap:8px; padding:6px 4px; cursor:pointer; text-align:left; }
    .ppbui-module-row:hover { background:rgba(255,255,255,.04); }
    .ppbui-module-row:focus-within { outline:1px solid var(--ui-gold-light,#f1d681); outline-offset:-1px; }
    .ppbui-module-row > input { flex:0 0 auto; width:14px; height:14px; margin:0; accent-color:var(--ui-gold-light,#f1d681); cursor:pointer; }
    .ppbui-module-row-copy { display:grid; gap:2px; min-width:0; font:inherit; }
    .ppbui-module-description { color:var(--ui-muted,#9b9994); font-size:10px; font-weight:400; line-height:1.35; }
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
      (rows[0]?.button || close).focus();
    } else if (restoreFocus) trigger.focus();
  };
  const sync = () => {
    const text = controlsText();
    const content = (node, value) => { if (node.textContent !== value) node.textContent = value; };
    content(title, text.title);
    content(close, text.close);
    content(status, preferences.isPersistent() ? text.saved : text.unsaved);
    for (const group of groups) content(group.legend, text.groups[group.id]);
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
