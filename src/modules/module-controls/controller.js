import { moduleControlsConfig as config } from "./config.js";
import { closeNativeGroups, controlsText, findAnimatedBorderSettings } from "./dom.js";

export function mountControls({ toolbar, icon }, preferences, modules, menuBar, wallet) {
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
  const panel = create("div", `${classes.panel} ppbui-panel ppbui-root`);
  panel.id = "ppbui-module-panel";
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-labelledby", "ppbui-module-title");
  // The preferences panel is Better UI-owned UI, not a native game dropdown.
  // Own viewport positioning inline as well as in CSS so late host styles cannot
  // turn it back into a native anchored menu.
  group.style.setProperty("position", "relative", "important");
  panel.style.setProperty("position", "fixed", "important");
  panel.style.setProperty("inset", "auto", "important");
  panel.style.setProperty("left", "8px", "important");
  panel.style.setProperty("right", "auto", "important");
  panel.style.setProperty("top", "8px", "important");
  panel.style.setProperty("bottom", "auto", "important");
  panel.style.setProperty("transform", "none", "important");
  const heading = create("header", "ppbui-module-heading");
  const brandLogo = create("img", "ppbui-module-brand-logo");
  if (typeof __PPBUI_LOGO__ === "string") brandLogo.src = __PPBUI_LOGO__;
  else if (image.src) brandLogo.src = image.src;
  brandLogo.draggable = false;
  brandLogo.alt = "";
  brandLogo.setAttribute("aria-hidden", "true");
  const brandCopy = create("div", "ppbui-module-brand-copy");
  const identity = create("div", "ppbui-module-identity");
  const title = create("strong", "ppbui-module-product");
  title.id = "ppbui-module-title";
  title.textContent = "Better UI";
  const version = create("span", "ppbui-module-version");
  const buildVersion = typeof __PPBUI_VERSION__ === "string" ? __PPBUI_VERSION__ : "dev";
  version.textContent = `v${buildVersion}`;
  identity.append(title, version);
  const author = create("span", "ppbui-module-author");
  author.textContent = "by Rhyxus";
  brandCopy.append(identity, author);
  heading.append(brandLogo, brandCopy);
  const status = create("div", `${classes.label} ppbui-module-copy`);
  status.setAttribute("role", "status");
  const animatedBorderMarker = "data-ppbui-animated-border-setting";
  const suppressAnimatedBorderSetting = () => {
    const current = new Set(findAnimatedBorderSettings(document));
    for (const row of document.querySelectorAll(`[${animatedBorderMarker}]`)) if (!current.has(row)) row.removeAttribute(animatedBorderMarker);
    for (const row of current) row.setAttribute(animatedBorderMarker, "");
  };
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
  let customize = null;
  if (typeof menuBar?.openEditor === "function") {
    const menuRow = rows.find(row => row.module.id === "menu-bar");
    if (menuRow) {
      const wrapper = create("div", "ppbui-menu-customization-setting");
      customize = create("button", "ppbui-button ppbui-button--compact");
      customize.type = "button";
      customize.dataset.ppbuiMenuCustomize = "";
      wrapper.append(menuRow.row, customize);
      menuRow.row = wrapper;
    }
  }
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
  const walletSettings=wallet?.createSettings?.({doc:document});
  if(walletSettings){
    walletSettings.root.open = typeof disclosureState.wallet === "boolean" ? disclosureState.wallet : true;
    list.append(walletSettings.root);
  }
  panel.append(heading, list, status, close);
  const style = create("style");
  style.dataset.ppbuiStyle = config.id;
  style.textContent = `
    .pokeidle-top-toolbar:has(> [data-ppbui-module="module-controls"].is-open) { z-index:2147483647 !important; }
    [data-ppbui-module="module-controls"] { position:relative !important; }
    [data-ppbui-module="module-controls"].is-open { z-index:2147483647; }
    [data-ppbui-module="module-controls"] > .ppbui-module-panel,
    .ppbui-module-panel[data-ppbui-menu-controls-portal] { position:fixed !important; inset:auto !important; left:8px !important; right:auto !important; top:8px !important; bottom:auto !important; display:grid; min-width:min(220px,calc(100vw - 16px)); grid-template-columns:minmax(0,1fr); grid-template-rows:auto minmax(0,1fr) auto auto; gap:var(--ppbui-space-2); padding:var(--ppbui-space-3); max-width:min(360px,calc(100vw - 16px)); max-height:min(480px,calc(100dvh - 16px)); overflow:hidden; transform:none !important; z-index:2147483647; font:var(--ppbui-font-size-secondary)/var(--ppbui-line-height-body) var(--ppbui-font-body); color:var(--ppbui-text); }
    .ppbui-module-heading { display:grid; grid-template-columns:28px minmax(0,1fr); align-items:center; gap:var(--ppbui-space-3); min-width:0; padding:0 0 var(--ppbui-space-3); border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border); }
    .ppbui-module-brand-logo { display:block; width:26px; height:26px; object-fit:contain; image-rendering:pixelated; }
    .ppbui-module-brand-copy { display:grid; min-width:0; gap:1px; }
    .ppbui-module-identity { display:flex; align-items:center; gap:var(--ppbui-space-2); min-width:0; }
    .ppbui-module-product { color:var(--ppbui-text); font:700 var(--ppbui-font-size-title)/var(--ppbui-line-height-tight) var(--ppbui-font-display); letter-spacing:normal; white-space:nowrap; }
    .ppbui-module-version { display:inline-flex; align-items:center; min-height:16px; padding:0 var(--ppbui-space-2); border:var(--ppbui-separator-width) solid var(--ppbui-border); border-radius:var(--ppbui-radius-badge); background:var(--ppbui-bg-2); color:var(--ppbui-text-muted); font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data); white-space:nowrap; }
    .ppbui-module-author { color:var(--ppbui-text-muted); font:500 var(--ppbui-font-size-meta)/1.2 var(--ppbui-font-body); white-space:nowrap; }
    .ppbui-module-list { min-height:0; overflow-y:auto; overflow-x:hidden; overscroll-behavior:contain; }
    .ppbui-module-panel > .ppbui-module-copy { max-width:none; white-space:normal; }
    .ppbui-module-panel .ppbui-module-section { min-width:0; margin:4px 0; padding:0; border:0; text-align:left; }
    .ppbui-module-section > summary { cursor:pointer; padding:6px 0; color:var(--ppbui-text); font:inherit; font-weight:700; }
    .ppbui-module-group-count { color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-meta); font-weight:400; white-space:nowrap; }
    .ppbui-module-section > summary:focus-visible { outline:var(--ppbui-focus-width) solid var(--ppbui-focus); outline-offset:2px; }
    .ppbui-module-panel .ppbui-module-row { display:flex; align-items:flex-start; gap:8px; padding:6px 4px; cursor:pointer; text-align:left; }
    .ppbui-module-row:hover { background:var(--ppbui-bg-3); }
    .ppbui-module-row:focus-within { outline:var(--ppbui-separator-width) solid var(--ppbui-focus); outline-offset:-1px; }
    .ppbui-module-row > input { flex:0 0 auto; width:14px; height:14px; margin:0; accent-color:var(--ppbui-selected); cursor:pointer; }
    .ppbui-module-row-copy { display:grid; gap:2px; min-width:0; font:inherit; }
    .ppbui-module-description { color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-meta); font-weight:400; line-height:1.35; }
    .ppbui-module-panel > .ppbui-module-close { min-height:28px; padding:4px 8px; font:inherit; }
    .ppbui-menu-customization-setting > button { display:block; width:calc(100% - 30px); min-height:28px; margin:0 4px 6px 26px; padding:4px 8px; font:inherit; text-align:left; }
    [data-ppbui-animated-border-setting] { display:none !important; }

  `;
  group.append(trigger, panel, style);
  toolbar.append(group);
  const unregisterParticipant = menuBar?.registerParticipant?.("system:module-controls", group);
  let open = false, panelAnchor = null;
  const ownsTarget = node => group.contains(node) || panel.contains(node);
  const releasePortal = () => {
    if (!panel.hasAttribute("data-ppbui-menu-controls-portal")) return;
    panel.removeAttribute("data-ppbui-menu-controls-portal");
    group.insertBefore(panel, style);
  };
  const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
  const setPanelCoordinate = (property, value) => panel.style.setProperty(property, `${Math.round(value)}px`, "important");
  const positionPanel = () => {
    if (!open) return;
    const win = document.defaultView;
    const viewportWidth = document.documentElement?.clientWidth || win?.innerWidth || 0;
    const viewportHeight = document.documentElement?.clientHeight || win?.innerHeight || 0;
    if (!viewportWidth || !viewportHeight) return;
    const margin = 8;
    const gap = 4;
    panel.style.setProperty("max-height", `${Math.max(0, Math.min(480, viewportHeight - margin * 2))}px`, "important");
    setPanelCoordinate("left", margin);
    setPanelCoordinate("top", margin);
    const currentRect = trigger.getBoundingClientRect();
    const triggerRect = currentRect.width > 0 && currentRect.height > 0 ? currentRect : panelAnchor || currentRect;
    let panelRect = panel.getBoundingClientRect();
    let panelWidth = panelRect.width || Math.min(360, Math.max(0, viewportWidth - margin * 2));
    let panelHeight = panelRect.height || Math.min(480, Math.max(0, viewportHeight - margin * 2));
    let left;
    let top;
    const vertical = toolbar.getAttribute("data-ppbui-menu-orientation") === "vertical";

    if (vertical) {
      const rightSpace = viewportWidth - margin - triggerRect.right - gap;
      const leftSpace = triggerRect.left - gap - margin;
      if (rightSpace >= panelWidth || rightSpace >= leftSpace) left = triggerRect.right + gap;
      else left = triggerRect.left - gap - panelWidth;
      top = triggerRect.top + (triggerRect.height - panelHeight) / 2;
    } else {
      const aboveSpace = triggerRect.top - gap - margin;
      const belowSpace = viewportHeight - margin - triggerRect.bottom - gap;
      const openAbove = aboveSpace >= panelHeight || aboveSpace >= belowSpace;
      const available = Math.max(0, openAbove ? aboveSpace : belowSpace);
      if (available < panelHeight) {
        panel.style.setProperty("max-height", `${Math.floor(available)}px`, "important");
        panelRect = panel.getBoundingClientRect();
        panelHeight = panelRect.height || available;
      }
      left = triggerRect.right - panelWidth;
      top = openAbove ? triggerRect.top - gap - panelHeight : triggerRect.bottom + gap;
    }

    left = clamp(left, margin, viewportWidth - panelWidth - margin);
    top = clamp(top, margin, viewportHeight - panelHeight - margin);
    setPanelCoordinate("left", left);
    setPanelCoordinate("top", top);

    // Fixed descendants can still resolve against a transformed/contained toolbar.
    // Correct the actual rendered rectangle so the viewport edges stay authoritative.
    const rendered = panel.getBoundingClientRect();
    if (rendered.width > 0 && rendered.height > 0) {
      const boundedLeft = clamp(rendered.left, margin, viewportWidth - rendered.width - margin);
      const boundedTop = clamp(rendered.top, margin, viewportHeight - rendered.height - margin);
      const deltaX = boundedLeft - rendered.left;
      const deltaY = boundedTop - rendered.top;
      if (deltaX || deltaY) {
        const scaleX = panel.offsetWidth > 0 ? rendered.width / panel.offsetWidth : 1;
        const scaleY = panel.offsetHeight > 0 ? rendered.height / panel.offsetHeight : 1;
        setPanelCoordinate("left", left + deltaX / (scaleX || 1));
        setPanelCoordinate("top", top + deltaY / (scaleY || 1));
      }
    }
  };
  const setOpen = (value, restoreFocus = false) => {
    if (value) {
      panelAnchor = trigger.getBoundingClientRect();
      if (group.parentNode !== toolbar) {
        panel.dataset.ppbuiMenuControlsPortal = "";
        document.body.append(panel);
      }
    }
    open = value;
    // Explicit visibility prevents the native hover rule from opening preferences.
    panel.style.display = open ? "" : "none";
    group.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", String(open));
    if (open) {
      closeNativeGroups(toolbar, group);
      positionPanel();
      const first = groups.find(group => !group.fieldset.hidden);
      (first ? (first.fieldset.open ? first.members[0].button : first.legend) : close).focus();
    } else {
      releasePortal();
      if (restoreFocus && !menuBar?.focusParticipant?.("system:module-controls")) trigger.focus();
    }
  };
  const sync = () => {
    const listScrollTop = list.scrollTop;
    walletSettings?.sync();
    if (list.scrollTop !== listScrollTop) list.scrollTop = listScrollTop;
    suppressAnimatedBorderSetting();
    const text = controlsText();
    const content = (node, value) => { if (node.textContent !== value) node.textContent = value; };
    content(close, text.close);
    content(status, preferences.isPersistent() && disclosurePersistent ? text.saved : text.unsaved);
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
    if (customize) {
      const language = (document.defaultView?.PokeIdle?.Localization?.get?.() || document.documentElement.lang || "pt").split(/[-_]/)[0];
      const labels = {
        pt:["Personalizar menu bar", "Entre com seu treinador e ative Menu bar para personalizar.", "A estrutura do menu mudou. A organização nativa foi preservada."],
        en:["Customize menu bar", "Sign in with your trainer and enable Menu bar to customize.", "The menu structure changed. Native navigation was preserved."],
        es:["Personalizar menú", "Inicia sesión y activa Menu bar para personalizar.", "El menú cambió. Se conservó la navegación nativa."],
        zh:["自定义菜单栏", "登录训练家并启用菜单栏以自定义。", "菜单结构已更改。已保留原生导航。"],
      };
      const copy = labels[language] || labels.en, snapshot = menuBar.getLayoutSnapshot?.();
      content(customize, copy[0]);
      const disabled = !snapshot?.owner || !snapshot.enabled || !preferences.isEnabled("menu-bar");
      if (customize.disabled !== disabled) customize.disabled = disabled;
      const hint = snapshot?.issue === "incompatible-menu" ? copy[2] : disabled ? copy[1] : copy[0];
      if (customize.title !== hint) customize.title = hint;
    }
    if (!menuBar?.placeParticipant?.("system:module-controls", group, toolbar) && toolbar.lastElementChild !== group) toolbar.append(group);
    if (open) positionPanel();
  };
  const unlisten = [];
  const listen = (node, type, handler, capture = false) => {
    node.addEventListener(type, handler, capture);
    unlisten.push(() => node.removeEventListener(type, handler, capture));
  };
  listen(trigger, "click", event => { event.stopPropagation(); setOpen(!open); });
  listen(close, "click", () => setOpen(false, true));
  if (customize) listen(customize, "click", event => {
    event.stopPropagation();
    setOpen(false);
    menuBar.openEditor(trigger);
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
  if(walletSettings) listen(walletSettings.root,"toggle",()=>{
    if(!walletSettings.root.isConnected || disclosureState.wallet===walletSettings.root.open)return;
    disclosureState.wallet=walletSettings.root.open;
    try{
      document.defaultView.localStorage.setItem(config.disclosureStorageKey,JSON.stringify(disclosureState));
      disclosurePersistent=true;
    }catch{disclosurePersistent=false;}
    sync();
  });
  for (const { module, button } of rows) listen(button, "change", event => {
    event.stopPropagation();
    preferences.setEnabled(module.id, button.checked);
    sync();
    button.focus();
  });
  const onKeyDown = event => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false, true);
    }
  };
  listen(group, "keydown", onKeyDown);
  listen(panel, "keydown", onKeyDown);
  listen(group, "focusout", event => {
    if (open && event.relatedTarget && !ownsTarget(event.relatedTarget)) setOpen(false);
  });
  listen(panel, "focusout", event => {
    if (open && event.relatedTarget && !ownsTarget(event.relatedTarget)) setOpen(false);
  });
  const outside = event => { if (open && !ownsTarget(event.target)) setOpen(false); };
  listen(document, "pointerdown", outside, true);
  listen(toolbar, "click", outside, true);
  listen(document.defaultView, "resize", positionPanel);
  setOpen(false);
  sync();
  return {
    sync,
    isIntact: () => toolbar.contains(group) && trigger.parentNode === group &&
      (panel.parentNode === group || (panel.hasAttribute("data-ppbui-menu-controls-portal") && panel.parentNode === document.body)) &&
      rows.every(row => row.row.contains(row.button) && panel.contains(row.row)),
    cleanup() {
      walletSettings?.dispose();
      unregisterParticipant?.();
      for (const remove of unlisten) remove();
      for (const row of document.querySelectorAll(`[${animatedBorderMarker}]`)) row.removeAttribute(animatedBorderMarker);
      panel.remove();
      group.remove();
    },
  };
}
