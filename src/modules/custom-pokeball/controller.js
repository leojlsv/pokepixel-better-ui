import { customPokeballConfig as config } from "./config.js";

function language(doc) {
  return String(doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en").split(/[-_]/)[0];
}

export function customPokeballText(doc = globalThis.document) {
  const copy = {
    pt: {
      name: "Custom Pokéball",
      description: "Configura uma paleta local independente para cada tipo de Pokéball.",
      title: "Custom Pokéball",
      enabled: "Personalizar",
      primary: "Principal",
      secondary: "Secundária",
      center: "Centro",
      resetBall: "Resetar",
      resetAll: "Resetar todas",
      close: "Fechar",
      saved: "Paletas salvas neste navegador.",
      unsaved: "Não foi possível salvar. As paletas valem apenas nesta sessão.",
      invalid: "Use uma cor hexadecimal no formato #RRGGBB.",
      masterNote: "Master Ball usa o shell Basic no jogo; o Better UI diferencia apenas a apresentação.",
    },
    en: {
      name: "Custom Pokéball",
      description: "Sets an independent local palette for each Poké Ball type.",
      title: "Custom Pokéball",
      enabled: "Customize",
      primary: "Primary",
      secondary: "Secondary",
      center: "Center",
      resetBall: "Reset",
      resetAll: "Reset all",
      close: "Close",
      saved: "Palettes saved in this browser.",
      unsaved: "Could not save. Palettes apply only to this session.",
      invalid: "Use a hexadecimal color in #RRGGBB format.",
      masterNote: "Master Ball uses the Basic shell in the game; Better UI only distinguishes its presentation.",
    },
    es: {
      name: "Custom Pokéball",
      description: "Configura una paleta local independiente para cada tipo de Poké Ball.",
      title: "Custom Pokéball",
      enabled: "Personalizar",
      primary: "Principal",
      secondary: "Secundario",
      center: "Centro",
      resetBall: "Restablecer",
      resetAll: "Restablecer todas",
      close: "Cerrar",
      saved: "Paletas guardadas en este navegador.",
      unsaved: "No se pudo guardar. Las paletas solo valen en esta sesión.",
      invalid: "Usa un color hexadecimal con formato #RRGGBB.",
      masterNote: "Master Ball usa el shell Basic del juego; Better UI solo diferencia su presentación.",
    },
    zh: {
      name: "Custom Pokéball",
      description: "为每种精灵球设置独立的本地配色。",
      title: "Custom Pokéball",
      enabled: "自定义",
      primary: "主色",
      secondary: "副色",
      center: "中心",
      resetBall: "重置",
      resetAll: "全部重置",
      close: "关闭",
      saved: "配色已保存在此浏览器中。",
      unsaved: "无法保存。配色仅在本次会话中生效。",
      invalid: "请使用 #RRGGBB 格式的十六进制颜色。",
      masterNote: "游戏中的 Master Ball 使用 Basic 外壳；Better UI 仅区分其显示。",
    },
  };
  return copy[language(doc)] || copy.en;
}

function makeIcon(doc) {
  const image = doc.createElement("img");
  image.className = "pokeidle-top-toolbar__icon";
  image.src = typeof __PPBUI_CUSTOM_POKEBALL_ICON__ === "string"
    ? __PPBUI_CUSTOM_POKEBALL_ICON__
    : "/assets/menu-custom-pokeball-icon.png";
  image.alt = "";
  image.draggable = false;
  image.setAttribute("aria-hidden", "true");
  return image;
}

function capsuleLooksMaster(capsule) {
  const source = typeof capsule === "string" ? capsule : [
    capsule?.capsule_item_id, capsule?.item_id, capsule?.id, capsule?.capsule_name, capsule?.name,
  ].filter(Boolean).join(" ");
  const normalized = String(source || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ");
  return /\bmaster\b/.test(normalized);
}

function installMasterVariantMarker(win) {
  const prototype = win?.PokeIdle?.MapCharacterKit?.CaptureSequence?.prototype;
  if (!prototype || typeof prototype.setBallVariant !== "function") return null;
  const ownDescriptor = Object.getOwnPropertyDescriptor(prototype, "setBallVariant");
  const original = prototype.setBallVariant;
  let active = true;
  function wrappedSetBallVariant(capsule) {
    const result = original.apply(this, arguments);
    if (!active || !this?._el) return result;
    if (capsuleLooksMaster(capsule)) this._el.dataset.ppbuiCaptureBall = "master";
    else delete this._el.dataset.ppbuiCaptureBall;
    return result;
  }
  prototype.setBallVariant = wrappedSetBallVariant;
  return {
    prototype,
    wrapper: wrappedSetBallVariant,
    cleanup() {
      active = false;
      if (prototype.setBallVariant !== wrappedSetBallVariant) return;
      if (ownDescriptor) Object.defineProperty(prototype, "setBallVariant", ownDescriptor);
      else delete prototype.setBallVariant;
    },
  };
}

function ballVariables(id) {
  return {
    primary: `var(--ppbui-custom-${id}-primary)`,
    secondary: `var(--ppbui-custom-${id}-secondary)`,
    center: `var(--ppbui-custom-${id}-center)`,
  };
}

function thrownBallCss(ball) {
  const { id } = ball;
  const v = ballVariables(id);
  const enabled = `html[data-ppbui-custom-ball-${id}="1"]`;
  const sequence = id === "master"
    ? `.pokeidle-capture-sequence[data-ppbui-capture-ball="master"]:not(.has-cosmetic-ball)`
    : `.pokeidle-capture-sequence.${ball.nativeClass}:not(.has-cosmetic-ball)${id === "basic" ? ':not([data-ppbui-capture-ball="master"])' : ""}`;
  let top = `linear-gradient(${v.primary},${v.primary})`;
  let bottom = `linear-gradient(${v.secondary},${v.secondary})`;
  if (id === "great") top = `linear-gradient(138deg,transparent 0 28%,${v.center} 29% 42%,transparent 43%) left top/54% 100% no-repeat,linear-gradient(222deg,transparent 0 28%,${v.center} 29% 42%,transparent 43%) right top/54% 100% no-repeat,linear-gradient(${v.primary},${v.primary})`;
  if (id === "ultra") top = `linear-gradient(90deg,transparent 0 17%,${v.center} 18% 31%,transparent 32% 68%,${v.center} 69% 82%,transparent 83%),linear-gradient(${v.primary},${v.primary})`;
  if (id === "pixel") {
    top = `linear-gradient(90deg,${v.center} 0 11%,${v.primary} 12% 41%,${v.center} 42% 58%,${v.primary} 59% 88%,${v.center} 89%)`;
    bottom = `linear-gradient(90deg,${v.center} 0 10%,${v.primary} 11% 28%,${v.secondary} 29% 71%,${v.primary} 72% 89%,${v.center} 90%)`;
  }
  return `
    ${enabled} ${sequence} .pokeidle-capture-ball__top { background:${top} !important; }
    ${enabled} ${sequence} .pokeidle-capture-ball__bottom { background:${bottom} !important; }
    ${enabled} ${sequence} .pokeidle-capture-ball__button { background:${v.center} !important; box-shadow:none !important; }
  `;
}

function moduleCss() {
  const variants = config.balls.map(thrownBallCss).join("\n");
  return `
    [data-ppbui-custom-pokeball-dialog][hidden] { display:none !important; }
    [data-ppbui-custom-pokeball-dialog] { position:fixed; z-index:2147483646; inset:0; display:grid; place-items:center; padding:12px; background:rgba(10,10,12,.7); }
    .ppbui-custom-pokeball-panel { display:grid; grid-template-rows:auto minmax(0,1fr) auto auto; gap:10px; width:min(720px,calc(100vw - 24px)); max-height:calc(100dvh - 24px); padding:12px; overflow:hidden; }
    .ppbui-custom-pokeball-title { font:500 var(--ppbui-font-size-title)/var(--ppbui-line-height-tight) var(--ppbui-font-display); letter-spacing:normal; color:var(--ppbui-text); }
    .ppbui-custom-pokeball-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; min-height:0; overflow:auto; }
    .ppbui-custom-pokeball-card { display:grid; grid-template-columns:76px minmax(0,1fr); gap:8px; min-width:0; padding:8px; border:var(--ppbui-border-width) solid var(--ppbui-border-strong); border-radius:var(--ppbui-radius); background:var(--ppbui-bg-1); }
    .ppbui-custom-pokeball-card[data-enabled="1"] { border-color:var(--ppbui-selected); }
    .ppbui-custom-pokeball-card-head { grid-column:1/-1; display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .ppbui-custom-pokeball-card-head label { display:flex; align-items:center; gap:6px; min-width:0; font-weight:700; }
    .ppbui-custom-pokeball-preview { display:grid; place-items:center; min-height:76px; border:var(--ppbui-separator-width) solid var(--ppbui-border); border-radius:var(--ppbui-radius); background:var(--ppbui-bg-0); }
    .ppbui-custom-pokeball-preview-ball { position:relative; display:block; width:56px; height:56px; border:4px solid var(--ppbui-border-strong); border-radius:50%!important; background:linear-gradient(to bottom,var(--preview-primary) 0 47%,var(--ppbui-art-neutral) 47% 53%,var(--preview-secondary) 53% 100%); }
    .ppbui-custom-pokeball-preview-ball::after { content:""; position:absolute; left:50%; top:50%; width:14px; height:14px; border:3px solid var(--ppbui-border-strong); border-radius:50%!important; background:var(--preview-center); transform:translate(-50%,-50%); }
    .ppbui-custom-pokeball-card[data-ball="great"] .ppbui-custom-pokeball-preview-ball { background:linear-gradient(138deg,transparent 0 28%,var(--preview-center) 29% 42%,transparent 43%) left top/54% 47% no-repeat,linear-gradient(222deg,transparent 0 28%,var(--preview-center) 29% 42%,transparent 43%) right top/54% 47% no-repeat,linear-gradient(to bottom,var(--preview-primary) 0 47%,var(--ppbui-art-neutral) 47% 53%,var(--preview-secondary) 53% 100%); }
    .ppbui-custom-pokeball-card[data-ball="ultra"] .ppbui-custom-pokeball-preview-ball { background:linear-gradient(90deg,transparent 0 17%,var(--preview-center) 18% 31%,transparent 32% 68%,var(--preview-center) 69% 82%,transparent 83%) top/100% 47% no-repeat,linear-gradient(to bottom,var(--preview-primary) 0 47%,var(--ppbui-art-neutral) 47% 53%,var(--preview-secondary) 53% 100%); }
    .ppbui-custom-pokeball-card[data-ball="pixel"] .ppbui-custom-pokeball-preview-ball { background:linear-gradient(90deg,var(--preview-center) 0 11%,var(--preview-primary) 12% 41%,var(--preview-center) 42% 58%,var(--preview-primary) 59% 88%,var(--preview-center) 89%) top/100% 47% no-repeat,linear-gradient(90deg,var(--preview-center) 0 10%,var(--preview-primary) 11% 28%,var(--preview-secondary) 29% 71%,var(--preview-primary) 72% 89%,var(--preview-center) 90%) bottom/100% 47% no-repeat,var(--ppbui-art-neutral); }
    .ppbui-custom-pokeball-fields { display:grid; gap:5px; }
    .ppbui-custom-pokeball-field { display:grid; grid-template-columns:minmax(58px,1fr) 30px 78px; align-items:center; gap:5px; font-size:var(--ppbui-font-size-meta); }
    .ppbui-custom-pokeball-color { width:30px !important; height:24px !important; min-width:30px !important; padding:0 !important; border:var(--ppbui-separator-width) solid var(--ppbui-border-strong) !important; border-radius:var(--ppbui-control-radius) !important; background:var(--ppbui-bg-0) !important; cursor:pointer; }
    .ppbui-custom-pokeball-hex { width:100%; min-width:0; height:24px; padding:2px 4px; text-transform:uppercase; }
    .ppbui-custom-pokeball-note,.ppbui-custom-pokeball-status { color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-meta); }
    .ppbui-custom-pokeball-note { grid-column:1/-1; }
    .ppbui-custom-pokeball-actions { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
    @media (max-width:620px) { .ppbui-custom-pokeball-list { grid-template-columns:1fr; } }

    html[data-ppbui-custom-ball-basic="1"] .pokeidle-capture-prompt__ball,
    html[data-ppbui-custom-ball-basic="1"] .pokeidle-switch-ball,
    html[data-ppbui-custom-ball-basic="1"] .pokeidle-brand-ball,
    html[data-ppbui-custom-ball-basic="1"] .pokeidle-choice-ball {
      background:linear-gradient(to bottom,var(--ppbui-custom-basic-primary) 0 47%,var(--ppbui-art-neutral,#161d20) 47% 53%,var(--ppbui-custom-basic-secondary) 53% 100%) !important;
    }
    html[data-ppbui-custom-ball-basic="1"] .pokeidle-capture-prompt__ball::after,
    html[data-ppbui-custom-ball-basic="1"] .pokeidle-switch-ball::after,
    html[data-ppbui-custom-ball-basic="1"] .pokeidle-brand-ball::after,
    html[data-ppbui-custom-ball-basic="1"] .pokeidle-choice-ball::after { background:var(--ppbui-custom-basic-center) !important; }

    ${variants}
  `;
}

export function mountCustomPokeball({ toolbar }, store, doc = toolbar.ownerDocument) {
  const root = doc.documentElement;
  const oldAttributes = new Map(config.balls.map(ball => [`data-ppbui-custom-ball-${ball.id}`, root.getAttribute(`data-ppbui-custom-ball-${ball.id}`)]));
  const oldProperties = new Map(config.balls.flatMap(ball => ["primary", "secondary", "center"].map(channel => {
    const name = `--ppbui-custom-${ball.id}-${channel}`;
    return [name, [root.style.getPropertyValue(name), root.style.getPropertyPriority(name)]];
  })));
  const style = doc.createElement("style");
  style.dataset.ppbuiStyle = config.id;
  style.textContent = moduleCss();
  doc.head.append(style);

  const button = doc.createElement("button");
  button.type = "button";
  button.className = "pokeidle-top-toolbar__btn";
  button.dataset.menuId = config.id;
  button.dataset.ppbuiModule = config.id;
  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", "ppbui-custom-pokeball-dialog");
  const label = doc.createElement("span");
  label.className = "pokeidle-top-toolbar__label";
  button.append(makeIcon(doc), label);
  toolbar.append(button);

  const overlay = doc.createElement("div");
  overlay.className = "ppbui-root";
  overlay.dataset.ppbuiCustomPokeballDialog = "";
  overlay.id = "ppbui-custom-pokeball-dialog";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "ppbui-custom-pokeball-title");
  const panel = doc.createElement("section");
  panel.className = "ppbui-panel ppbui-custom-pokeball-panel";
  const title = doc.createElement("strong");
  title.className = "ppbui-custom-pokeball-title";
  title.id = "ppbui-custom-pokeball-title";
  const list = doc.createElement("div");
  list.className = "ppbui-custom-pokeball-list ppbui-scroll";
  const status = doc.createElement("div");
  status.className = "ppbui-custom-pokeball-status";
  status.setAttribute("role", "status");
  const actions = doc.createElement("div");
  actions.className = "ppbui-custom-pokeball-actions";
  const resetAll = doc.createElement("button");
  resetAll.type = "button";
  resetAll.className = "ppbui-button ppbui-button--compact ppbui-button--ghost";
  const close = doc.createElement("button");
  close.type = "button";
  close.className = "ppbui-button ppbui-button--compact ppbui-button--primary";
  actions.append(resetAll, close);
  panel.append(title, list, status, actions);
  overlay.append(panel);
  doc.body.append(overlay);

  const cards = new Map();
  for (const ball of config.balls) {
    const card = doc.createElement("article");
    card.className = "ppbui-custom-pokeball-card";
    card.dataset.ball = ball.id;
    const head = doc.createElement("div");
    head.className = "ppbui-custom-pokeball-card-head";
    const enabledLabel = doc.createElement("label");
    const enabled = doc.createElement("input");
    enabled.type = "checkbox";
    enabled.dataset.enabled = ball.id;
    const name = doc.createElement("span");
    name.textContent = ball.label;
    enabledLabel.append(enabled, name);
    const reset = doc.createElement("button");
    reset.type = "button";
    reset.className = "ppbui-button ppbui-button--compact ppbui-button--ghost";
    reset.dataset.reset = ball.id;
    head.append(enabledLabel, reset);
    const preview = doc.createElement("div");
    preview.className = "ppbui-custom-pokeball-preview";
    preview.setAttribute("aria-hidden", "true");
    const previewBall = doc.createElement("i");
    previewBall.className = "ppbui-custom-pokeball-preview-ball";
    preview.append(previewBall);
    const fields = doc.createElement("div");
    fields.className = "ppbui-custom-pokeball-fields";
    const controls = new Map();
    for (const channel of ["primary", "secondary", "center"]) {
      const row = doc.createElement("label");
      row.className = "ppbui-custom-pokeball-field";
      const copy = doc.createElement("span");
      const picker = doc.createElement("input");
      picker.type = "color";
      picker.className = "ppbui-custom-pokeball-color";
      picker.dataset.color = `${ball.id}:${channel}`;
      const hex = doc.createElement("input");
      hex.type = "text";
      hex.className = "ppbui-input ppbui-custom-pokeball-hex";
      hex.maxLength = 7;
      hex.spellcheck = false;
      hex.dataset.hex = `${ball.id}:${channel}`;
      row.append(copy, picker, hex);
      fields.append(row);
      controls.set(channel, { copy, picker, hex });
    }
    card.append(head, preview, fields);
    if (ball.id === "master") {
      const note = doc.createElement("small");
      note.className = "ppbui-custom-pokeball-note";
      note.dataset.masterNote = "";
      card.append(note);
    }
    list.append(card);
    cards.set(ball.id, { ball, card, enabled, reset, previewBall, controls });
  }

  let open = false;
  let invalidField = null;
  let masterPatch = null;
  const ensureMasterPatch = () => {
    if (masterPatch) return;
    masterPatch = installMasterVariantMarker(doc.defaultView);
  };
  const setOpen = (next, restoreFocus = false) => {
    open = Boolean(next);
    overlay.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if (open) cards.get("basic")?.enabled.focus();
    else if (restoreFocus && button.isConnected) button.focus();
  };
  const applyState = state => {
    for (const ball of config.balls) {
      const value = state[ball.id];
      root.setAttribute(`data-ppbui-custom-ball-${ball.id}`, value.enabled ? "1" : "0");
      for (const channel of ["primary", "secondary", "center"]) root.style.setProperty(`--ppbui-custom-${ball.id}-${channel}`, value[channel]);
    }
  };
  const sync = () => {
    ensureMasterPatch();
    const state = store.get();
    const text = customPokeballText(doc);
    label.textContent = text.name;
    button.setAttribute("aria-label", text.name);
    title.textContent = text.title;
    resetAll.textContent = text.resetAll;
    close.textContent = text.close;
    const labels = { primary: text.primary, secondary: text.secondary, center: text.center };
    for (const [id, entry] of cards) {
      const value = state[id];
      entry.enabled.checked = value.enabled;
      entry.card.dataset.enabled = value.enabled ? "1" : "0";
      entry.reset.textContent = text.resetBall;
      entry.reset.setAttribute("aria-label", `${text.resetBall} ${entry.ball.label}`);
      entry.previewBall.style.setProperty("--preview-primary", value.primary);
      entry.previewBall.style.setProperty("--preview-secondary", value.secondary);
      entry.previewBall.style.setProperty("--preview-center", value.center);
      for (const [channel, control] of entry.controls) {
        control.copy.textContent = labels[channel];
        control.picker.setAttribute("aria-label", `${entry.ball.label}: ${labels[channel]}`);
        control.hex.setAttribute("aria-label", `${entry.ball.label}: ${labels[channel]} #RRGGBB`);
        if (control.picker.value.toLowerCase() !== value[channel]) control.picker.value = value[channel];
        if (doc.activeElement !== control.hex && control.hex.value.toLowerCase() !== value[channel]) control.hex.value = value[channel].toUpperCase();
      }
      const note = entry.card.querySelector("[data-master-note]");
      if (note) note.textContent = text.masterNote;
    }
    applyState(state);
    status.textContent = invalidField ? text.invalid : store.isPersistent() ? text.saved : text.unsaved;
  };

  const listeners = [];
  const listen = (node, type, handler, capture = false) => {
    node.addEventListener(type, handler, capture);
    listeners.push(() => node.removeEventListener(type, handler, capture));
  };
  listen(button, "click", event => { event.stopPropagation(); setOpen(!open); });
  for (const [id, entry] of cards) {
    listen(entry.enabled, "change", () => { invalidField = null; store.setBall(id, { enabled: entry.enabled.checked }); });
    listen(entry.reset, "click", () => { invalidField = null; store.resetBall(id); });
    for (const [channel, control] of entry.controls) {
      listen(control.picker, "input", () => { invalidField = null; store.setBall(id, { [channel]: control.picker.value }); });
      const commit = () => {
        const value = control.hex.value.trim();
        if (!/^#[0-9a-f]{6}$/i.test(value)) { invalidField = `${id}:${channel}`; sync(); control.hex.select(); return; }
        invalidField = null;
        store.setBall(id, { [channel]: value });
      };
      listen(control.hex, "change", commit);
      listen(control.hex, "keydown", event => {
        if (event.key === "Enter") { event.preventDefault(); commit(); }
        if (event.key === "Escape") { event.preventDefault(); invalidField = null; sync(); control.hex.blur(); }
      });
    }
  }
  listen(resetAll, "click", () => { invalidField = null; store.resetAll(); });
  listen(close, "click", () => setOpen(false, true));
  listen(overlay, "pointerdown", event => { if (event.target === overlay) setOpen(false, true); });
  listen(overlay, "keydown", event => {
    if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false, true); }
  });
  const unsubscribe = store.subscribe(() => sync());
  sync();

  return {
    sync,
    isIntact: () => button.isConnected && overlay.isConnected && style.isConnected,
    cleanup() {
      unsubscribe();
      masterPatch?.cleanup();
      masterPatch = null;
      for (const remove of listeners) remove();
      button.remove();
      overlay.remove();
      style.remove();
      for (const [name, value] of oldAttributes) {
        if (value === null) root.removeAttribute(name);
        else root.setAttribute(name, value);
      }
      for (const [name, [value, priority]] of oldProperties) {
        if (value) root.style.setProperty(name, value, priority);
        else root.style.removeProperty(name);
      }
    },
  };
}
