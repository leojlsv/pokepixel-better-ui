import { autoHelperText } from "./config.js";
import { helperParts } from "./dom.js";

export function mountAutoHelper(root, session) {
  const doc = root.ownerDocument, pi = doc.defaultView.PokeIdle, parts = helperParts(root);
  let alive = true, ready = false, refreshing = false, inventory = [], choices = [], pickers = [], destinations = [], stockMessage = "", loadError = "", stock = new Map();
  const moves = [], replacements = [], owned = [], listeners = [], badges = [], hiddenNodes = [];
  const hide = el => { if (el) { hiddenNodes.push({el,hidden:el.hidden}); el.hidden=true; el.classList.add("ppbui-auto-original"); } };
  const node = (tag, cls, text) => { const el = doc.createElement(tag); if (cls) el.className = cls; if (text) el.textContent = text; return el; };
  const flag = (el, key, value) => { if (el[key] !== value) el[key] = value; };
  const content = (el, text) => { if (el.textContent !== text) el.textContent = text; };
  const listen = (el, type, fn, capture = false) => { el.addEventListener(type, fn, capture); listeners.push(() => el.removeEventListener(type, fn, capture)); };
  const move = (el, parent) => { const anchor = doc.createComment("ppbui-auto-helper"); el.before(anchor); moves.push({ el, anchor }); parent.append(el); };
  const replace = (el, next) => { el.replaceWith(next); replacements.push({ el, next }); };
  const saveState = node("div", "ppbui-auto-save"); saveState.setAttribute("role", "status"); saveState.setAttribute("aria-live", "polite");
  const saveMessage = node("span"), retry = node("button", "pokeidle-btn"), refresh = node("button", "pokeidle-btn");
  retry.type = refresh.type = "button"; const stockStatus = node("small", "ppbui-auto-stock"); stockStatus.setAttribute("role", "status");
  saveState.append(saveMessage, retry, refresh, stockStatus);
  const style = node("style"); style.dataset.ppbuiModule = "auto-helper";
  style.textContent = `
    .auto-helper-panel[data-ppbui-auto-helper] .pokeidle-panel__body { background:var(--ui-panel,#1c1c1e)!important; color:var(--ui-ink,#e2e0dc); }
    .ppbui-auto-save { position:sticky; top:0; z-index:3; display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:6px 8px; border-bottom:1px solid var(--ui-gold-dark); background:var(--ui-panel-raised,#242426); font:inherit; }
    .ppbui-auto-save > span { flex:1; min-width:120px; }
    .ppbui-auto-stock { flex-basis:100%; color:var(--ui-muted); }
    .ppbui-auto-stock:empty { display:none; }
    .ppbui-auto-save button { padding:4px 8px; font:inherit; }
    .ppbui-auto-save[data-state="error"] > span { color:var(--ui-red,#c96b6b); }
    .ppbui-auto-group { margin:8px 0; }
    .ppbui-auto-group > summary { padding:8px 0; color:var(--ui-gold-light,#eccf94); font-weight:700; cursor:pointer; }
    .ppbui-auto-group-body { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
    .ppbui-auto-group-body > .auto-helper-section { margin:0; background:var(--ui-panel-soft,#1f1f21); border-color:var(--ui-gold-dark); }
    .ppbui-auto-group-body > .auto-helper-section.is-wide { grid-column:1/-1; }
    .ppbui-auto-support { grid-column:1/-1; }
    .ppbui-auto-support > h3 { grid-column:1/-1; }
    .ppbui-auto-support-part,.ppbui-auto-support-head { display:grid; grid-template-columns:minmax(120px,1fr) minmax(0,2fr) minmax(140px,1fr); align-items:center; gap:6px 12px; min-width:0; }
    .ppbui-auto-support-head { color:var(--ui-muted); font-size:10px; padding:4px 0; }
    .ppbui-auto-support-part { padding:8px 0; }
    .ppbui-auto-support-part + .ppbui-auto-support-part { border-top:1px solid var(--ui-gold-dark); }
    .ppbui-auto-support-part > .auto-helper-row { margin:0; }
    .ppbui-auto-support-part > .auto-helper-row:first-of-type { grid-column:1; grid-row:1; }
    .ppbui-auto-support-resource { grid-column:2; grid-row:1; min-width:0; }
    .ppbui-auto-support-resource > .ppbui-auto-picker { margin:0; }
    .ppbui-auto-support-condition { grid-column:3; grid-row:1; min-width:0; }
    .ppbui-auto-support-part .ppbui-auto-support-condition > span { min-width:0; white-space:nowrap; }
    .ppbui-auto-support-part > .auto-helper-note { grid-column:2/-1; }
    .ppbui-auto-destination-controls { display:flex; flex-wrap:wrap; align-items:center; gap:8px 20px; }
    .ppbui-auto-destination-controls > .auto-helper-section { display:contents; }
    .ppbui-auto-destination-controls .auto-helper-row { margin:0; }
    .ppbui-auto-destination-controls > .auto-sell-time { margin-left:auto; font-size:11px; }
    .ppbui-auto-destination-help { margin:8px 0; color:var(--ui-muted); }
    .ppbui-auto-destination-help > summary { cursor:pointer; }
    .ppbui-auto-destination-help .auto-helper-note { margin:6px 0; }
    .auto-helper-panel[data-ppbui-auto-helper] .auto-capture-lock { position:static; display:inline-block; margin-bottom:6px; }
    .ppbui-auto-status[hidden] { display:none !important; }
    .ppbui-auto-status { display:block; margin:6px 0; color:var(--ui-muted,#9b9994); }
    .ppbui-auto-picker { display:flex; align-items:center; gap:8px; margin:6px 0; }
    .ppbui-auto-item-icon { display:grid; place-items:center; flex:0 0 32px; height:32px; color:var(--ui-gold-light); font-size:24px; }
    .ppbui-auto-picker > select { box-sizing:border-box; flex:1; width:100%; min-width:0; height:32px; padding:4px 8px; border:1px solid var(--ui-gold-dark); border-radius:4px; background:var(--ui-navy-deep,#151517); color:var(--ui-ink,#e2e0dc); font:inherit; }
    .ppbui-auto-picker > select:focus-visible { outline:1px solid var(--ui-gold-light); outline-offset:1px; }
    .auto-helper-panel[data-ppbui-auto-helper] .auto-helper-row > .ppbui-auto-status { margin:0 0 0 auto; max-width:50%; text-align:right; font-size:9px; font-weight:400; }
    .auto-helper-panel[data-ppbui-auto-helper] .auto-helper-note { line-height:1.4; }
    .ppbui-auto-destinations { width:100%; border-collapse:collapse; color:var(--ui-ink); }
    .ppbui-auto-destinations th,.ppbui-auto-destinations td { padding:6px 4px; text-align:left; border-bottom:1px solid var(--ui-gold-dark); }
    .ppbui-auto-destinations select { width:100%; padding:5px; background:var(--ui-navy-deep,#151517); color:var(--ui-ink); border:1px solid var(--ui-gold-dark); }
    .ppbui-auto-original[hidden] { display:none!important; }
    @media(max-width:760px) { .ppbui-auto-group-body { grid-template-columns:1fr; } .ppbui-auto-support-head { display:none; } .ppbui-auto-support-part { grid-template-columns:minmax(100px,1fr) minmax(0,2fr); } .ppbui-auto-support-condition { grid-column:2; grid-row:2; } }
  `;
  root.append(style); owned.push(style); root.dataset.ppbuiAutoHelper = "";
  const wasInert = parts.body.inert; parts.body.inert = true;
  const groups = [
    ["support", [parts.support]], ["capture", [parts.normal, parts.shiny, parts.filter]],
    ["destination", [parts.sell, ...(parts.extract ? [parts.extract] : [])]],
  ].map(([key, sections]) => {
    const details = node("details", "ppbui-auto-group"), summary = node("summary"), body = node("div", "ppbui-auto-group-body");
    details.open = session.groups[key] ?? true; details.append(summary, body);
    parts.grid.before(details); owned.push(details);
    sections.forEach(section => move(section, body));
    listen(details, "toggle", () => { if (alive) session.groups[key] = details.open; });
    return { key, details, summary, body };
  });
  const supportChildren = [...parts.support.children].slice(1);
  const potionPart = node("div", "ppbui-auto-support-part"), revivePart = node("div", "ppbui-auto-support-part");
  parts.support.classList.add("ppbui-auto-support"); parts.support.append(potionPart, revivePart); owned.push(potionPart,revivePart);
  let reviveSide = false;
  for (const el of supportChildren) { if (el === parts.revive.parentElement) reviveSide = true; move(el, reviveSide ? revivePart : potionPart); }
  const supportHead = node("div", "ppbui-auto-support-head");
  const labels = autoHelperText(doc); supportHead.append(...[labels.function,labels.resource,labels.condition].map(text=>node("span","",text)));
  potionPart.before(supportHead); owned.push(supportHead);
  for (const [index, part] of [potionPart,revivePart].entries()) {
    const resource = node("div", "ppbui-auto-support-resource"); part.append(resource); owned.push(resource); move(parts.pickers[index],resource);
  }
  const hpRow = parts.hp.parentElement === potionPart ? parts.hp : parts.hp.parentElement;
  hpRow.classList.add("ppbui-auto-support-condition");
  const noCondition = node("span", "ppbui-auto-support-condition", "—"); revivePart.append(noCondition); owned.push(noCondition);
  parts.body.prepend(saveState); owned.push(saveState);
  const nativeStatus = parts.status;
  const hiddenWarnings = parts.warnings.map(el => ({el, hidden:el.hidden}));
  hiddenWarnings.forEach(({el}) => {el.hidden = true; el.classList.add("ppbui-auto-original");});
  if (nativeStatus) { nativeStatus.hidden = true; nativeStatus.classList.add("ppbui-auto-original"); }
  const ids = item => String(item.item_id || item.id || item.item?.id || "");
  const qty = item => Number(item.qty ?? item.quantity ?? 0);
  const items = type => stock.get(type) || [];
  const indexStock = () => {
    stock = new Map(["potion", "revive", "capsule"].map(type => [type, inventory.filter(item => (item.type || item.item?.type) === type && qty(item) > 0)]));
    stock.get("capsule").sort((a,b) => Number(b.catch_multiplier || b.item?.catch_multiplier || 0) - Number(a.catch_multiplier || a.item?.catch_multiplier || 0));
  };
  const choiceName = (index, text) => {
    const selected = inventory.find(item => ids(item) === choices[index]);
    return !choices[index] ? pi.t("auto_helper.any_available") : selected ? (selected.name || selected.item?.name || ids(selected)) : `${text.missing} (${choices[index]})`;
  };
  const controls = [parts.potion, parts.revive, parts.common, parts.shinyCheck];
  const types = ["potion", "revive", "capsule", "capsule"];
  function drawPickers() {
    pickers.forEach((picker, index) => {
      if (!picker.select) {
        picker.icon = node("span", "ppbui-auto-item-icon"); picker.icon.setAttribute("aria-hidden", "true");
        picker.select = node("select"); picker.select.dataset.ppbuiPicker = String(index);
        picker.select.setAttribute("aria-label", controls[index].parentElement.querySelector("b")?.textContent || types[index]);
        picker.grid.append(picker.icon, picker.select);
        picker.select.addEventListener("change", () => { choices[index] = picker.select.value; updatePickers(); queue(true); });
      }
      const options = [node("option", "", pi.t("auto_helper.any_available"))]; options[0].value = "";
      for (const item of items(types[index])) {
        const option = node("option", "", `${item.name || item.item?.name || ids(item)} · ×${qty(item)}`); option.value = ids(item); options.push(option);
      }
      if (choices[index] && !options.some(option => option.value === choices[index])) {
        const option = node("option", "", choiceName(index, autoHelperText(doc))); option.value = choices[index]; options.push(option);
      }
      picker.select.replaceChildren(...options);
    });
    updatePickers();
  }
  function updatePickers() {
    pickers.forEach(({select,icon}, index) => {
      if (!select) return;
      const item = inventory.find(item => ids(item) === choices[index]);
      const iconKey = item ? String(item.icon_index || item.item?.icon_index || 0) : "any";
      if (icon.dataset.ppbuiIcon !== iconKey) {
        icon.dataset.ppbuiIcon = iconKey; content(icon, item ? "" : "◎");
        icon.style.backgroundImage = item ? 'url("img/system/IconSet.png?v=20260717-reference-iconset-1")' : "none";
        if (item) { const value = Number(iconKey); icon.style.backgroundPosition = `-${(value % 16) * 32}px -${Math.floor(value / 16) * 32}px`; }
      }
      if (select.value !== choices[index]) select.value = choices[index];
      flag(select, "disabled", controls[index].disabled);
      const title = select.selectedOptions[0]?.textContent || "";
      if (select.title !== title) select.title = title;
    });
  }
  function payload() {
    return [
      { enabled: parts.common.checked || parts.shinyCheck.checked, common_enabled: parts.common.checked, common_capsule_item_id: choices[2], shiny_enabled: parts.shinyCheck.checked, shiny_capsule_item_id: choices[3], species_filter: parts.names.value.split(",").map(value => value.trim().toLowerCase()).filter(Boolean), min_quality:"common", mode:"split" },
      { enabled:parts.potion.checked, hp_threshold:Number(parts.hp.value), potion_item_id:choices[0], auto_revive:parts.revive.checked, revive_item_id:choices[1] }, null,
      { enabled:!parts.sellCheck.disabled && parts.sellCheck.checked, qualities:parts.sellQualities.filter(input => input.checked).map(input => input.value) },
      parts.extract ? { enabled:!parts.extractCheck.disabled && parts.extractCheck.checked, qualities:parts.extractQualities.filter(input => input.checked).map(input => input.value) } : undefined,
    ];
  }
  function applyDraft(draft) {
    const [capture, potion, , sell, extract] = draft;
    parts.potion.checked = potion.enabled; parts.revive.checked = potion.auto_revive; parts.hp.value = potion.hp_threshold;
    parts.common.checked = capture.common_enabled; parts.shinyCheck.checked = !parts.shinyCheck.disabled && capture.shiny_enabled;
    parts.names.value = capture.species_filter.join(", ");
    parts.sellCheck.checked = !parts.sellCheck.disabled && sell.enabled;
    if (parts.extractCheck) parts.extractCheck.checked = !parts.extractCheck.disabled && !!extract?.enabled;
    parts.sellQualities.forEach(input => { input.checked = sell.qualities.includes(input.value); });
    parts.extractQualities.forEach(input => { input.checked = !!extract?.qualities.includes(input.value); });
    choices = [potion.potion_item_id, potion.revive_item_id, capture.common_capsule_item_id, capture.shiny_capsule_item_id];
  }
  function queue(immediate) { session.saver.change(payload(), immediate); sync(); }
  function sync() {
    if (!alive) return;
    const text = autoHelperText(doc), state = session.saver.state();
    content(saveMessage, loadError ? `${text.error}: ${loadError}` : state.phase === "error" ? `${text.error}: ${state.error}` : text[state.phase]);
    const phase = loadError ? "error" : state.phase;
    if (saveState.dataset.state !== phase) saveState.dataset.state = phase;
    content(retry, text.retry); flag(retry, "hidden", !loadError && state.phase !== "error");
    content(refresh, text.refresh); flag(refresh, "disabled", refreshing || !ready);
    if (refresh.title !== stockMessage) refresh.title = stockMessage;
    content(stockStatus, stockMessage);
    groups.forEach(group => {
      const checks = group.key === "support" ? [parts.potion,parts.revive] : group.key === "capture" ? [parts.common,parts.shinyCheck] : [parts.sellCheck,parts.extractCheck].filter(Boolean);
      content(group.summary, `${text[group.key]} · ${checks.filter(input => input.checked && !input.disabled).length}/${checks.length} ${text.enabled.toLowerCase()}`);
    });
    if (!ready) return;
    updatePickers();
    badges.forEach(({ el, input, index }) => {
      let stateText = input.disabled ? text.unavailable : !input.checked ? text.disabled : text.enabled;
      if (!input.disabled && input.checked && index !== undefined && (!items(types[index]).length || (choices[index] && !items(types[index]).some(item => ids(item) === choices[index])))) stateText = text.empty;
      if (input.disabled) stateText += ` · ${pi.t(input === parts.shinyCheck ? "auto_helper.premium_badge" : "auto_helper.auto_sell_license_required")}`;
      content(el, stateText);
      flag(el,"hidden", input === parts.potion || input === parts.revive ? stateText === text.enabled || stateText === text.disabled : false);
    });
    destinations.forEach(({select, quality, sell, extract}) => {
      const sellLocked = sell.disabled || parts.sellCheck.disabled, extractLocked = !extract || extract.disabled || parts.extractCheck.disabled;
      flag(select, "disabled", sellLocked && extractLocked);
      flag(select.options[1], "disabled", sellLocked);
      if (extract) flag(select.options[2], "disabled", extractLocked);
      content(select.options[1], `${text.sell}${!parts.sellCheck.checked || sellLocked ? ` — ${text.paused}` : ""}`);
      if (extract) content(select.options[2], `${text.extract}${!parts.extractCheck.checked || extractLocked ? ` — ${text.paused}` : ""}`);
      const value = sell.checked ? "sell" : extract?.checked ? "extract" : "keep";
      if (select.value !== value) select.value = value;
      const label = `${text.destination}: ${quality}`;
      if (select.getAttribute("aria-label") !== label) select.setAttribute("aria-label", label);
    });
  }
  async function refreshInventory() {
    if (refreshing || !ready || !alive) return;
    refreshing = true; sync();
    try {
      const response = await pi.Api.getInventory();
      if (!alive) return;
      inventory = response.inventory || response.data || response || []; stockMessage = autoHelperText(doc).refreshed; indexStock(); drawPickers();
    } catch { stockMessage = autoHelperText(doc).refreshError; }
    finally { refreshing = false; sync(); }
  }
  const unsubscribe = session.saver.subscribe(sync);
  listen(retry, "click", () => { if (loadError) void initialize(); else void session.saver.flush(); });
  listen(refresh, "click", refreshInventory);
  const onInventory = () => { void refreshInventory(); };
  pi.Bus?.on?.("inventory.updated", onInventory);
  async function initialize() {
    loadError = ""; parts.body.inert = true;
    const beforeLoad = session.saver.state();
    try {
      const [settingsResponse, inventoryResponse] = await Promise.all([pi.Api.getHuntSettings(), pi.Api.getInventory()]);
      if (!alive) return;
      const settings = settingsResponse.data || settingsResponse || {}, potion = settings.auto_potion || {}, capture = settings.auto_capture || {};
      inventory = inventoryResponse.inventory || inventoryResponse.data || inventoryResponse || []; indexStock();
      choices = [potion.potion_item_id || ids(items("potion")[0] || {}) || "", potion.revive_item_id || ids(items("revive")[0] || {}) || "", capture.common_capsule_item_id || capture.capsule_item_id || "", capture.shiny_capsule_item_id || capture.capsule_item_id || ""];
      const latest = session.saver.state();
      if (latest.draft && (latest.pending || beforeLoad.pending || latest.revision !== beforeLoad.revision)) applyDraft(latest.draft);
      pickers = parts.pickers.map(original => { const grid = node("div", "ppbui-auto-picker"); replace(original, grid); return {grid}; });
      for (const [index, input] of controls.entries()) { const el = node("small", "ppbui-auto-status"); input.parentElement.append(el); owned.push(el); badges.push({el,input,index}); }
      for (const input of [parts.sellCheck, parts.extractCheck].filter(Boolean)) { const el = node("small", "ppbui-auto-status"); input.parentElement.append(el); owned.push(el); badges.push({el,input}); }
      const text = autoHelperText(doc), destinationGroup = groups.find(group => group.key === "destination");
      const tableSection = node("section", "auto-helper-section is-wide"), table = node("table", "ppbui-auto-destinations"), head = node("tr"), tbody = node("tbody");
      head.append(node("th", "", text.quality), node("th", "", text.destination)); const thead = node("thead"); thead.append(head); table.append(thead,tbody);
      const destinationControls = node("div", "ppbui-auto-destination-controls"), help = node("details", "ppbui-auto-destination-help");
      help.append(node("summary","",text.details));
      tableSection.append(destinationControls,help,node("p", "auto-helper-note", text.destinationNote), table); destinationGroup.body.append(tableSection); owned.push(tableSection);
      move(parts.sell,destinationControls); if(parts.extract) move(parts.extract,destinationControls);
      if(parts.licenseTime) move(parts.licenseTime,destinationControls);
      hide(parts.sellHeading); hide(parts.extractHeading);
      for(const note of [...parts.sellNotes,...parts.extractNotes]) move(note,help);
      parts.sellQualities.forEach(sell => {
        const extract = parts.extractQualities.find(input => input.value === sell.value), quality = sell.parentElement.textContent;
        const tr = node("tr"), label = node("th", "", quality), td = node("td"), select = node("select"); label.scope = "row";
        for (const value of ["keep", "sell", ...(extract ? ["extract"] : [])]) { const option = node("option", "", text[value]); option.value = value; select.append(option); }
        td.append(select); tr.append(label,td); tbody.append(tr); destinations.push({select,quality,sell,extract});
        listen(select, "change", () => { sell.checked = select.value === "sell"; if (extract) extract.checked = select.value === "extract"; queue(true); });
      });
      for (const original of [parts.sellGrid, parts.extractGrid].filter(Boolean)) { const placeholder = node("span"); placeholder.hidden = true; replace(original, placeholder); }
      const nativeInputs = [parts.potion,parts.revive,parts.hp,parts.common,parts.shinyCheck,parts.sellCheck,parts.extractCheck,parts.names].filter(Boolean);
      for (const type of ["change", "input"]) listen(root, type, event => {
        if (!nativeInputs.includes(event.target)) return;
        event.stopImmediatePropagation();
        if (event.target === parts.names ? type === "input" : type === "change") queue(event.target !== parts.names);
      }, true);
      parts.body.inert = wasInert; ready = true; drawPickers(); sync();
      parts.body.scrollTop = session.scroll || 0;
      const target = session.focus?.kind === "input" ? nativeInputs[session.focus.index]
        : session.focus?.kind === "picker" ? pickers[session.focus.index]?.select
        : session.focus?.kind === "destination" ? destinations[session.focus.index]?.select : null;
      target?.focus({preventScroll:true});
      if (target === parts.names && session.selection) target.setSelectionRange(...session.selection);
      listen(root, "focusin", () => {
        const active = doc.activeElement, inputIndex = nativeInputs.indexOf(active), pickerIndex = pickers.findIndex(picker => picker.grid.contains(active)), destinationIndex = destinations.findIndex(item => item.select === active);
        session.focus = inputIndex >= 0 ? {kind:"input",index:inputIndex} : pickerIndex >= 0 ? {kind:"picker",index:pickerIndex,id:active.dataset.ppbuiItem} : destinationIndex >= 0 ? {kind:"destination",index:destinationIndex} : null;
      });
      listen(parts.names, "keyup", () => { session.selection = [parts.names.selectionStart,parts.names.selectionEnd]; });
    } catch (error) { if (alive) { parts.body.inert = wasInert; loadError = error.message; sync(); } }
  }
  void initialize();
  return { sync, cleanup() {
    alive = false; session.scroll = parts.body.scrollTop;
    if (session.saver.state().phase !== "error") void session.saver.flush(); unsubscribe(); listeners.forEach(remove => remove()); pi.Bus?.off?.("inventory.updated", onInventory);
    for (const {el,next} of replacements.reverse()) if (next.parentNode) next.replaceWith(el);
    for (const {el,anchor} of moves.reverse()) if (anchor.parentNode) anchor.replaceWith(el);
    owned.forEach(el => el.remove());
    hiddenWarnings.forEach(({el,hidden}) => {el.hidden=hidden;el.classList.remove("ppbui-auto-original");});
    if (nativeStatus) { nativeStatus.hidden = false; nativeStatus.classList.remove("ppbui-auto-original"); }
    hiddenNodes.forEach(({el,hidden})=>{el.hidden=hidden;el.classList.remove("ppbui-auto-original");});
    hpRow.classList.remove("ppbui-auto-support-condition");
    parts.support.classList.remove("ppbui-auto-support"); parts.body.inert = wasInert; root.removeAttribute("data-ppbui-auto-helper");
  } };
}
