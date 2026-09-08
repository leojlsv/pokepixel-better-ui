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
    const button = create("button", classes.item);
    button.type = "button";
    const description = create("div", `${classes.label} ppbui-module-copy`);
    description.id = `ppbui-description-${module.id}`;
    button.setAttribute("aria-describedby", description.id);
    return { module, button, description };
  });
  const close = create("button", classes.item);
  close.type = "button";
  panel.append(title, ...rows.flatMap(row => [row.button, row.description]), status, close);
  const style = create("style");
  style.dataset.ppbuiStyle = config.id;
  style.textContent = `
    [data-ppbui-module="module-controls"] > .ppbui-module-panel { grid-template-columns: minmax(0, 1fr); }
    .ppbui-module-panel > .ppbui-module-copy { max-width: none; white-space: normal; }
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
    for (const { module, button, description } of rows) {
      const enabled = preferences.isEnabled(module.id);
      const name = module.name(text);
      content(button, `${name}: ${enabled ? text.on : text.off}`);
      if (button.getAttribute("aria-pressed") !== String(enabled)) button.setAttribute("aria-pressed", String(enabled));
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
  for (const { module, button } of rows) listen(button, "click", event => {
    event.stopPropagation();
    preferences.setEnabled(module.id, !preferences.isEnabled(module.id));
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
    isIntact: () => group.parentNode === toolbar && trigger.parentNode === group && panel.parentNode === group && rows.every(row => row.button.parentNode === panel),
    cleanup() {
      for (const remove of unlisten) remove();
      group.remove();
    },
  };
}
