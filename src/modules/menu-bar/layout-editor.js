import { defaultLayout, getPlacement, moveLayoutItem, SLOT_CAPACITY, slotCount, validateLayout } from "./layout-model.js";
import { menuLayoutEditorStyles } from "./layout-editor-styles.js";

let editorSequence = 0;
const BAR = "bar";

const copyByLanguage = {
  pt: {
    title:"Personalizar menu bar", profile:value=>`Perfil: ${value}`,
    hint:"Organize a barra e os grupos. As miniaturas apenas selecionam itens e nunca executam ações do jogo.",
    orientation:"Orientação", horizontal:"Horizontal", vertical:"Vertical", slotCapacity:"Slots", bar:"Barra",
    slots:(count,capacity)=>`Barra: ${count}/${capacity}`, freeSlots:count=>`liberar ${count}`,
    preview:"Prévia da barra", groups:"Grupos", details:"Detalhes do item", noSelection:"Selecione um item para editar sua posição.",
    current:(container,position)=>`Local atual: ${container}, posição ${position}`, reserved:"Algumas posições reservadas não são exibidas na prévia.",
    previous:"Anterior", next:"Próximo", moveTo:"Mover para", position:"Posição", apply:"Aplicar",
    save:"Salvar", cancel:"Cancelar", reset:"Restaurar padrão", editSelected:"Editar selecionado", close:"Fechar editor",
    reload:"Recarregar", overwrite:"Sobrescrever", conflict:"O layout mudou em outra sessão. Recarregue a versão atual ou sobrescreva explicitamente com este rascunho.",
    saving:"Salvando…", saved:"Layout salvo.", sessionSaved:"Layout aplicado apenas nesta sessão.", dirty:"Alterações ainda não salvas.",
    storageUnavailable:"O armazenamento não está disponível; um salvamento válido ficará apenas nesta sessão.",
    protectedIssue:"O layout salvo precisa de confirmação antes de ser substituído.",
    moveFailed:"Este item não pode ser movido para essa posição.", invalidLayout:"O rascunho não é um layout válido.",
    ownerChanged:"O perfil ativo mudou; o rascunho anterior foi descartado.", saveFailed:"Não foi possível salvar o layout.",
    restricted:value=>`Este item permanece em ${value} para preservar o comportamento do jogo.`,
    unavailable:"Indisponível",
  },
  en: {
    title:"Customize menu bar", profile:value=>`Profile: ${value}`,
    hint:"Arrange the bar and groups. Preview tiles only select items and never run game actions.",
    orientation:"Orientation", horizontal:"Horizontal", vertical:"Vertical", slotCapacity:"Slots", bar:"Bar",
    slots:(count,capacity)=>`Bar: ${count}/${capacity}`, freeSlots:count=>`free ${count}`,
    preview:"Bar preview", groups:"Groups", details:"Item details", noSelection:"Select an item to edit its position.",
    current:(container,position)=>`Current location: ${container}, position ${position}`, reserved:"Some reserved positions are not shown in the preview.",
    previous:"Previous", next:"Next", moveTo:"Move to", position:"Position", apply:"Apply",
    save:"Save", cancel:"Cancel", reset:"Restore default", editSelected:"Edit selected", close:"Close editor",
    reload:"Reload", overwrite:"Overwrite", conflict:"The layout changed in another session. Reload the current version or explicitly overwrite it with this draft.",
    saving:"Saving…", saved:"Layout saved.", sessionSaved:"Layout applied for this session only.", dirty:"Changes are not saved yet.",
    storageUnavailable:"Storage is unavailable; a valid save will last for this session only.",
    protectedIssue:"The saved layout needs confirmation before it can be replaced.",
    moveFailed:"This item cannot be moved to that position.", invalidLayout:"The draft is not a valid layout.",
    ownerChanged:"The active profile changed; the previous draft was discarded.", saveFailed:"Could not save the layout.",
    restricted:value=>`This item stays in ${value} to preserve game behavior.`,
    unavailable:"Unavailable",
  },
  es: {
    title:"Personalizar barra de menú", profile:value=>`Perfil: ${value}`,
    hint:"Organiza la barra y los grupos. Las miniaturas solo seleccionan elementos y nunca ejecutan acciones del juego.",
    orientation:"Orientación", horizontal:"Horizontal", vertical:"Vertical", slotCapacity:"Slots", bar:"Barra",
    slots:(count,capacity)=>`Barra: ${count}/${capacity}`, freeSlots:count=>`liberar ${count}`,
    preview:"Vista previa de la barra", groups:"Grupos", details:"Detalles del elemento", noSelection:"Selecciona un elemento para editar su posición.",
    current:(container,position)=>`Ubicación actual: ${container}, posición ${position}`, reserved:"Algunas posiciones reservadas no se muestran en la vista previa.",
    previous:"Anterior", next:"Siguiente", moveTo:"Mover a", position:"Posición", apply:"Aplicar",
    save:"Guardar", cancel:"Cancelar", reset:"Restaurar predeterminado", editSelected:"Editar seleccionado", close:"Cerrar editor",
    reload:"Recargar", overwrite:"Sobrescribir", conflict:"El diseño cambió en otra sesión. Recarga la versión actual o sobrescríbela explícitamente con este borrador.",
    saving:"Guardando…", saved:"Diseño guardado.", sessionSaved:"Diseño aplicado solo para esta sesión.", dirty:"Hay cambios sin guardar.",
    storageUnavailable:"El almacenamiento no está disponible; un guardado válido durará solo esta sesión.",
    protectedIssue:"El diseño guardado requiere confirmación antes de ser reemplazado.",
    moveFailed:"Este elemento no se puede mover a esa posición.", invalidLayout:"El borrador no es un diseño válido.",
    ownerChanged:"El perfil activo cambió; se descartó el borrador anterior.", saveFailed:"No se pudo guardar el diseño.",
    restricted:value=>`Este elemento permanece en ${value} para conservar el comportamiento del juego.`,
    unavailable:"No disponible",
  },
  zh: {
    title:"自定义菜单栏", profile:value=>`档案：${value}`,
    hint:"调整主栏和分组。预览项只用于选择，不会执行游戏操作。",
    orientation:"方向", horizontal:"横向", vertical:"纵向", slotCapacity:"栏位", bar:"主栏",
    slots:(count,capacity)=>`主栏：${count}/${capacity}`, freeSlots:count=>`需释放 ${count}`,
    preview:"主栏预览", groups:"分组", details:"项目详情", noSelection:"请选择一个项目来调整位置。",
    current:(container,position)=>`当前位置：${container}，第 ${position} 位`, reserved:"部分保留位置不会显示在预览中。",
    previous:"前移", next:"后移", moveTo:"移动到", position:"位置", apply:"应用",
    save:"保存", cancel:"取消", reset:"恢复默认", editSelected:"编辑所选项", close:"关闭编辑器",
    reload:"重新载入", overwrite:"覆盖", conflict:"布局已在其他会话中更改。请重新载入当前版本，或明确用此草稿覆盖。",
    saving:"正在保存…", saved:"布局已保存。", sessionSaved:"布局仅在本次会话中生效。", dirty:"更改尚未保存。",
    storageUnavailable:"存储不可用；有效的保存只会保留在本次会话中。",
    protectedIssue:"替换已保存布局前需要明确确认。",
    moveFailed:"此项目不能移动到该位置。", invalidLayout:"草稿不是有效布局。",
    ownerChanged:"当前档案已切换；先前草稿已丢弃。", saveFailed:"无法保存布局。",
    restricted:value=>`此项目保留在${value}中，以维持游戏行为。`,
    unavailable:"不可用",
  },
};

const cloneLayout = layout => ({
  ...layout,
  bar:[...(layout?.bar || [])],
  groups:Object.fromEntries(Object.entries(layout?.groups || {}).map(([id,list]) => [id,[...(list || [])]])),
  position:layout?.position ? { ...layout.position } : null,
});
const signature = layout => JSON.stringify(layout);
const benignIssue = issue => !issue || issue === "session-only" || issue === "storage-unavailable";
const ownerId = value => String(value ?? "").trim();

function languageCopy(doc) {
  const language = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en";
  return copyByLanguage[String(language).split(/[-_]/)[0]] || copyByLanguage.en;
}

function button(doc, className = "") {
  const node = doc.createElement("button");
  node.type = "button";
  node.className = `ppbui-button ${className}`.trim();
  return node;
}

function safeIconClone(doc, icon) {
  const wrapper = doc.createElement("span");
  wrapper.className = "ppbui-menu-layout-editor__icon";
  wrapper.setAttribute("aria-hidden", "true");
  if (!icon?.cloneNode) return wrapper;
  let clone = icon.cloneNode(true);
  const neutralizeInteractive = node => {
    if (node.nodeType !== 1) return node;
    if (node.matches?.("button,a,input,select,textarea,summary")) {
      const replacement = doc.createElement("span");
      while (node.firstChild) replacement.append(node.firstChild);
      node.replaceWith(replacement);
      node = replacement;
    }
    for (const child of [...node.children]) neutralizeInteractive(child);
    return node;
  };
  if (clone.nodeType === 1 && clone.matches?.("button,a,input,select,textarea,summary")) {
    const replacement = doc.createElement("span");
    while (clone.firstChild) replacement.append(clone.firstChild);
    clone = replacement;
  } else if (clone.nodeType === 1) {
    for (const child of [...clone.children]) neutralizeInteractive(child);
  }
  for (const node of clone.nodeType === 1 ? [clone,...clone.querySelectorAll("*")] : []) {
    for (const attr of [...node.attributes]) {
      const name = attr.name.toLowerCase();
      if (name === "id" || name.startsWith("on") || [
        "data-menu-id","data-ppbui-menu-context-action","data-ppbui-city-action",
        "href","target","form","name","value","tabindex","contenteditable","draggable",
        "aria-controls","aria-owns","aria-activedescendant","aria-labelledby","aria-describedby",
        "aria-haspopup","aria-expanded",
      ].includes(name)) node.removeAttribute(attr.name);
    }
  }
  wrapper.append(clone);
  return wrapper;
}

function focusables(root) {
  return [...root.querySelectorAll("button:not(:disabled),select:not(:disabled),input:not(:disabled),[tabindex]:not([tabindex='-1'])")]
    .filter(node => !node.hidden && !node.closest("[hidden]") && !node.closest('[aria-hidden="true"]') && node.getAttribute("aria-hidden") !== "true");
}

export function createMenuLayoutEditor({ doc = document, getSnapshot, onSave } = {}) {
  if (!doc?.createElement) throw new TypeError("doc is required");
  if (typeof getSnapshot !== "function") throw new TypeError("getSnapshot is required");
  if (typeof onSave !== "function") throw new TypeError("onSave is required");

  const style = doc.createElement("style");
  style.dataset.ppbuiModule = "menu-bar-layout-editor";
  style.textContent = menuLayoutEditorStyles;
  (doc.head || doc.documentElement).append(style);

  const id = ++editorSequence;
  const titleId = `ppbui-menu-layout-editor-title-${id}`;
  const root = doc.createElement("div");
  root.className = "ppbui-root";
  root.dataset.ppbuiMenuLayoutEditor = "";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", titleId);
  root.hidden = true;

  const shell = doc.createElement("section");
  shell.className = "ppbui-dialog ppbui-menu-layout-editor__dialog";
  const titlebar = doc.createElement("header");
  titlebar.className = "ppbui-titlebar";
  const titleCopy = doc.createElement("div");
  titleCopy.className = "ppbui-menu-layout-editor__title-copy";
  const title = doc.createElement("h2");
  title.id = titleId;
  const profile = doc.createElement("span");
  profile.className = "ppbui-menu-layout-editor__profile";
  titleCopy.append(title,profile);
  const closeButton = button(doc,"ppbui-icon-button");
  closeButton.dataset.ppbuiMenuLayoutClose = "";
  closeButton.textContent = "×";
  titlebar.append(titleCopy,closeButton);

  const body = doc.createElement("div");
  body.className = "ppbui-menu-layout-editor__body";
  const intro = doc.createElement("div");
  intro.className = "ppbui-menu-layout-editor__intro";
  const introCopy = doc.createElement("div");
  const hint = doc.createElement("p");
  hint.className = "ppbui-menu-layout-editor__hint";
  const meta = doc.createElement("p");
  meta.className = "ppbui-menu-layout-editor__meta";
  introCopy.append(hint,meta);
  const controls = doc.createElement("div");
  controls.className = "ppbui-menu-layout-editor__controls";
  const orientationField = doc.createElement("label");
  orientationField.className = "ppbui-menu-layout-editor__field";
  const orientationCaption = doc.createElement("span");
  const orientation = doc.createElement("select");
  orientation.className = "ppbui-select";
  orientation.dataset.ppbuiMenuLayoutOrientation = "";
  for (const [label,value] of [["Horizontal","horizontal"],["Vertical","vertical"]]) {
    const option = doc.createElement("option");
    option.value = value;
    option.textContent = label;
    orientation.append(option);
  }
  orientationField.append(orientationCaption,orientation);
  const capacityField = doc.createElement("label");
  capacityField.className = "ppbui-menu-layout-editor__field";
  const capacityCaption = doc.createElement("span");
  const capacity = doc.createElement("select");
  capacity.className = "ppbui-select";
  capacity.dataset.ppbuiMenuLayoutCapacity = "";
  for (let value = SLOT_CAPACITY.min; value <= SLOT_CAPACITY.max; value++) {
    const option = doc.createElement("option");
    option.value = String(value);
    option.textContent = String(value);
    capacity.append(option);
  }
  capacityField.append(capacityCaption,capacity);
  const counter = doc.createElement("span");
  counter.className = "ppbui-menu-layout-editor__counter";
  counter.dataset.ppbuiMenuLayoutCounter = "";
  controls.append(orientationField,capacityField,counter);
  intro.append(introCopy,controls);

  const previewSection = doc.createElement("section");
  previewSection.className = "ppbui-menu-layout-editor__section";
  const previewHead = doc.createElement("div");
  previewHead.className = "ppbui-menu-layout-editor__section-head";
  const previewTitle = doc.createElement("h3");
  const reserved = doc.createElement("p");
  reserved.className = "ppbui-menu-layout-editor__reserved";
  previewHead.append(previewTitle,reserved);
  const previewList = doc.createElement("div");
  previewList.dataset.ppbuiMenuLayoutPreviewList = "";
  previewSection.append(previewHead,previewList);

  const workspace = doc.createElement("div");
  workspace.className = "ppbui-menu-layout-editor__workspace";
  const groupsSection = doc.createElement("section");
  groupsSection.className = "ppbui-menu-layout-editor__section";
  const groupsHead = doc.createElement("div");
  groupsHead.className = "ppbui-menu-layout-editor__section-head";
  const groupsTitle = doc.createElement("h3");
  groupsHead.append(groupsTitle);
  const groupsHost = doc.createElement("div");
  groupsHost.dataset.ppbuiMenuLayoutGroups = "";
  groupsSection.append(groupsHead,groupsHost);
  const detailsSection = doc.createElement("section");
  detailsSection.className = "ppbui-menu-layout-editor__section ppbui-menu-layout-editor__details";
  detailsSection.dataset.ppbuiMenuLayoutDetails = "";
  workspace.append(groupsSection,detailsSection);

  const conflictPanel = doc.createElement("div");
  conflictPanel.className = "ppbui-menu-layout-editor__conflict";
  conflictPanel.dataset.ppbuiMenuLayoutConflict = "";
  conflictPanel.hidden = true;
  const conflictText = doc.createElement("span");
  const reloadButton = button(doc);
  reloadButton.dataset.ppbuiMenuLayoutReload = "";
  const overwriteButton = button(doc,"ppbui-button--primary");
  overwriteButton.dataset.ppbuiMenuLayoutOverwrite = "";
  conflictPanel.append(conflictText,reloadButton,overwriteButton);
  const status = doc.createElement("p");
  status.className = "ppbui-menu-layout-editor__status";
  status.dataset.ppbuiMenuLayoutStatus = "";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.setAttribute("aria-atomic", "true");
  body.append(intro,previewSection,workspace,conflictPanel,status);

  const footer = doc.createElement("footer");
  footer.className = "ppbui-menu-layout-editor__footer";
  const resetButton = button(doc);
  resetButton.dataset.ppbuiMenuLayoutReset = "";
  const editSelectedButton = button(doc,"ppbui-button--compact");
  editSelectedButton.dataset.ppbuiMenuLayoutEditSelected = "";
  editSelectedButton.hidden = true;
  const spacer = doc.createElement("span");
  spacer.className = "ppbui-menu-layout-editor__footer-spacer";
  const cancelButton = button(doc);
  cancelButton.dataset.ppbuiMenuLayoutCancel = "";
  const saveButton = button(doc,"ppbui-button--primary");
  saveButton.dataset.ppbuiMenuLayoutSave = "";
  footer.append(resetButton,editSelectedButton,spacer,cancelButton,saveButton);
  shell.append(titlebar,body,footer);
  root.append(shell);

  let disposed = false;
  let origin = null;
  let liveSnapshot = null;
  let baseline = null;
  let draft = null;
  let selectedId = "";
  let moveDestination = BAR;
  let movePosition = 1;
  let dirty = false;
  let saving = false;
  let conflict = false;
  let externalSnapshot = null;
  let statusMessage = "";
  let statusError = false;
  let epoch = 0;
  let dragState = null;
  let lastRenderedSnapshotKey = "";

  const isOpen = () => !root.hidden;
  const isNarrow = () => Number(doc.defaultView?.innerWidth || 0) <= 560;
  const setStatus = (message = "", error = false) => { statusMessage = message; statusError = error; };
  const currentCopy = () => languageCopy(doc);
  const localeKey = () => String(doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en");
  const capacityOf = layout => Number.isInteger(layout?.slotCapacity) ? layout.slotCapacity : SLOT_CAPACITY.default;
  const overflowCount = layout => Math.max(0,slotCount(layout) - capacityOf(layout));

  function snapshotUiKey(snapshot) {
    return JSON.stringify({
      owner:snapshot?.owner || "",
      ownerLabel:snapshot?.ownerLabel || "",
      layout:snapshot?.layout || null,
      token:snapshot?.token ?? null,
      persistent:Boolean(snapshot?.persistent),
      issue:snapshot?.issue ?? null,
      enabled:Boolean(snapshot?.enabled),
      locale:localeKey(),
      catalog:(snapshot?.catalog || []).map(item => [
        item.id,item.label,item.kind,item.lockedReason || "",
        [...(item.allowedContainers || [])],
        item.icon?.outerHTML || item.icon?.textContent || "",
      ]),
    });
  }

  function normalizeSnapshot(raw) {
    const owner = ownerId(raw?.owner);
    const checked = validateLayout(raw?.layout);
    return {
      owner,
      ownerLabel:String(raw?.ownerLabel || owner),
      layout:checked.ok ? checked.layout : defaultLayout(),
      token:raw?.token ?? null,
      persistent:Boolean(raw?.persistent),
      issue:checked.ok ? (raw?.issue ?? null) : `invalid-layout:${checked.error}`,
      enabled:Boolean(raw?.enabled),
      catalog:Array.isArray(raw?.catalog) ? raw.catalog.filter(item => item && typeof item.id === "string" && item.available === true) : [],
    };
  }

  function readSnapshot() {
    try { return normalizeSnapshot(getSnapshot()); }
    catch { return normalizeSnapshot({ enabled:false, layout:defaultLayout(), catalog:[] }); }
  }

  function catalogMap() {
    return new Map((liveSnapshot?.catalog || []).map(item => [item.id,item]));
  }

  function entryFor(id) {
    return catalogMap().get(id) || null;
  }

  function containerLabel(container) {
    if (container === BAR) return currentCopy().bar;
    return entryFor(container)?.label || currentCopy().unavailable;
  }

  function listFor(layout, container) {
    return container === BAR ? layout.bar : (layout.groups?.[container] || []);
  }

  function visibleIds(layout, container, withoutId = "") {
    const available = catalogMap();
    return listFor(layout,container).filter(id => id !== withoutId && available.has(id));
  }

  function visiblePosition(layout, id) {
    const placement = getPlacement(layout,id);
    if (!placement) return null;
    const ids = visibleIds(layout,placement.container);
    const index = ids.indexOf(id);
    return index < 0 ? null : { container:placement.container, index, position:index + 1 };
  }

  function modelIndexForVisiblePosition(id, container, humanPosition) {
    const list = listFor(draft,container).filter(value => value !== id);
    const available = catalogMap();
    const visible = list.filter(value => available.has(value));
    const zero = humanPosition - 1;
    if (!Number.isInteger(zero) || zero < 0 || zero > visible.length) return null;
    if (zero < visible.length) return list.indexOf(visible[zero]);
    if (!visible.length) return list.length;
    return list.indexOf(visible[visible.length - 1]) + 1;
  }

  function validPositions(id, container) {
    const entry = entryFor(id);
    if (!entry || !entry.allowedContainers?.includes(container)) return [];
    if (container !== BAR && !entryFor(container)) return [];
    const count = visibleIds(draft,container,id).length + 1;
    const result = [];
    for (let human = 1; human <= count; human++) {
      const index = modelIndexForVisiblePosition(id,container,human);
      if (index === null) continue;
      const moved = moveLayoutItem(draft,id,container,index,{ allowOverflow:true });
      if (moved.ok) result.push({ human,index });
    }
    return result;
  }

  function syncDirty() {
    dirty = Boolean(draft && baseline && signature(draft) !== signature(baseline.layout));
  }

  function restrictionText(entry) {
    const text = currentCopy();
    if (!entry) return "";
    if (entry.kind === "group" && entry.allowedContainers?.length === 1) return text.restricted(containerLabel(entry.allowedContainers[0]));
    return "";
  }

  function clearDropIndicator() {
    root.querySelectorAll("[data-drop-position]").forEach(node => node.removeAttribute("data-drop-position"));
    root.querySelectorAll('[data-ppbui-menu-layout-dropzone="true"]').forEach(node => node.removeAttribute("data-ppbui-menu-layout-dropzone"));
  }

  function clearDragTarget() {
    const id = dragState?.id || "";
    clearDropIndicator();
    dragState = id ? { id } : null;
  }

  function focusAfterRender(key = "") {
    let target = key ? root.querySelector(`[data-ppbui-menu-layout-focus="${key}"]`) : null;
    if (!target || target.disabled || target.closest("[hidden]") || target.closest('[aria-hidden="true"]')) {
      target = [...root.querySelectorAll("[data-ppbui-menu-layout-item]")].find(node => node.dataset.ppbuiMenuLayoutItem === selectedId);
    }
    if (!target || target.disabled || target.closest("[hidden]")) target = orientation;
    if (!target || target.disabled || target.closest("[hidden]")) target = closeButton;
    target?.focus?.();
  }

  function focusDescriptor() {
    const node = doc.activeElement;
    if (!node || !root.contains(node)) return null;
    if (node.dataset.ppbuiMenuLayoutItem) return { kind:"item",value:node.dataset.ppbuiMenuLayoutItem };
    if (node.dataset.ppbuiMenuLayoutFocus) return { kind:"focus",value:node.dataset.ppbuiMenuLayoutFocus };
    const attrs = [
      ["data-ppbui-menu-layout-close","close"],["data-ppbui-menu-layout-orientation","orientation"],
      ["data-ppbui-menu-layout-capacity","capacity"],
      ["data-ppbui-menu-layout-move-to","moveTo"],["data-ppbui-menu-layout-position","position"],
      ["data-ppbui-menu-layout-reset","reset"],["data-ppbui-menu-layout-cancel","cancel"],
      ["data-ppbui-menu-layout-edit-selected","editSelected"],
      ["data-ppbui-menu-layout-save","save"],["data-ppbui-menu-layout-reload","reload"],
      ["data-ppbui-menu-layout-overwrite","overwrite"],
    ];
    const match = attrs.find(([attr]) => node.hasAttribute?.(attr));
    return match ? { kind:"control",value:match[1] } : null;
  }

  function restoreFocusDescriptor(descriptor) {
    if (!descriptor) return;
    let target = null;
    if (descriptor.kind === "item") target = [...root.querySelectorAll("[data-ppbui-menu-layout-item]")].find(node => node.dataset.ppbuiMenuLayoutItem === descriptor.value);
    else if (descriptor.kind === "focus") target = root.querySelector(`[data-ppbui-menu-layout-focus="${descriptor.value}"]`);
    else {
      const selectors = {
        close:"[data-ppbui-menu-layout-close]",orientation:"[data-ppbui-menu-layout-orientation]",
        capacity:"[data-ppbui-menu-layout-capacity]",
        moveTo:"[data-ppbui-menu-layout-move-to]",position:"[data-ppbui-menu-layout-position]",
        reset:"[data-ppbui-menu-layout-reset]",cancel:"[data-ppbui-menu-layout-cancel]",
        editSelected:"[data-ppbui-menu-layout-edit-selected]",
        save:"[data-ppbui-menu-layout-save]",reload:"[data-ppbui-menu-layout-reload]",
        overwrite:"[data-ppbui-menu-layout-overwrite]",
      };
      target = root.querySelector(selectors[descriptor.value] || "");
    }
    if (!target || target.disabled || target.closest("[hidden]") || target.closest('[aria-hidden="true"]')) return focusAfterRender();
    target.focus();
  }

  function selectItem(id, focusAfter = false) {
    if (!entryFor(id)) return;
    selectedId = id;
    const placement = visiblePosition(draft,id);
    moveDestination = placement?.container || BAR;
    movePosition = placement?.position || 1;
    render();
    if (focusAfter) {
      const item = [...root.querySelectorAll("[data-ppbui-menu-layout-item]")].find(node => node.dataset.ppbuiMenuLayoutItem === id);
      item?.focus();
    }
  }

  function applyMove(id, container, humanPosition, focusKey = "") {
    const option = validPositions(id,container).find(item => item.human === Number(humanPosition));
    if (!option) {
      setStatus(currentCopy().moveFailed,true);
      render();
      return false;
    }
    const moved = moveLayoutItem(draft,id,container,option.index,{ allowOverflow:true });
    if (!moved.ok) {
      setStatus(currentCopy().moveFailed,true);
      render();
      return false;
    }
    draft = moved.layout;
    selectedId = id;
    const placement = visiblePosition(draft,id);
    moveDestination = placement?.container || container;
    movePosition = placement?.position || humanPosition;
    syncDirty();
    setStatus(dirty ? currentCopy().dirty : "",false);
    render();
    if (focusKey) focusAfterRender(focusKey);
    return true;
  }

  function itemButton(id, container) {
    const entry = entryFor(id);
    if (!entry) return null;
    const item = button(doc,"ppbui-menu-layout-editor__item");
    item.dataset.ppbuiMenuLayoutItem = id;
    item.dataset.ppbuiMenuLayoutContainer = container;
    item.setAttribute("aria-pressed",String(selectedId === id));
    const movable = validPositions(id,container).length > 0;
    item.draggable = movable && !saving;
    const drag = doc.createElement("span");
    drag.className = "ppbui-menu-layout-editor__drag";
    drag.textContent = movable ? "⋮⋮" : "•";
    drag.setAttribute("aria-hidden","true");
    const label = doc.createElement("span");
    label.className = "ppbui-menu-layout-editor__item-label";
    label.textContent = entry.label;
    item.append(drag,safeIconClone(doc,entry.icon),label);
    item.addEventListener("click",()=>selectItem(id,true));
    item.addEventListener("dragstart",event => {
      if (!item.draggable) { event.preventDefault(); return; }
      dragState = { id };
      event.dataTransfer?.setData?.("text/plain",id);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    });
    item.addEventListener("dragover",event => {
      const movingId = dragState?.id;
      if (!movingId) return;
      event.stopPropagation();
      clearDragTarget();
      if (movingId === id) return;
      const moving = entryFor(movingId);
      if (!moving?.allowedContainers?.includes(container)) return;
      const visible = visibleIds(draft,container,movingId);
      const targetIndex = visible.indexOf(id);
      if (targetIndex < 0) return;
      const rect = item.getBoundingClientRect();
      const vertical = container !== BAR || draft.orientation === "vertical";
      const coordinate = vertical ? event.clientY : event.clientX;
      const midpoint = vertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
      const after = (vertical ? rect.height : rect.width) > 0 && coordinate > midpoint;
      const human = targetIndex + 1 + (after ? 1 : 0);
      if (!validPositions(movingId,container).some(option => option.human === human)) return;
      event.preventDefault();
      item.dataset.dropPosition = after ? "after" : "before";
      dragState = { id:movingId,container,human };
    });
    item.addEventListener("drop",event => {
      event.stopPropagation();
      if (!dragState?.container || dragState.container !== container) {
        dragState = null;
        clearDropIndicator();
        return;
      }
      event.preventDefault();
      const { id:movingId,human } = dragState;
      clearDropIndicator();
      dragState = null;
      applyMove(movingId,container,human);
    });
    item.addEventListener("dragend",()=>{ dragState = null; clearDropIndicator(); });
    return item;
  }

  function attachDropZone(node, container) {
    if (node.dataset.ppbuiMenuLayoutDropBound === container) return;
    node.dataset.ppbuiMenuLayoutDropBound = container;
    node.addEventListener("dragover",event => {
      const movingId = dragState?.id;
      if (!movingId) return;
      clearDragTarget();
      const entry = entryFor(movingId);
      if (!entry?.allowedContainers?.includes(container)) return;
      const human = visibleIds(draft,container,movingId).length + 1;
      if (!validPositions(movingId,container).some(option => option.human === human)) return;
      event.preventDefault();
      node.dataset.ppbuiMenuLayoutDropzone = "true";
      dragState = { id:movingId,container,human };
    });
    node.addEventListener("drop",event => {
      if (!dragState?.container || dragState.container !== container) {
        dragState = null;
        clearDropIndicator();
        return;
      }
      event.preventDefault();
      const { id,human } = dragState;
      clearDropIndicator();
      dragState = null;
      applyMove(id,container,human);
    });
  }

  function renderPreview() {
    previewList.replaceChildren();
    previewList.dataset.orientation = draft.orientation;
    for (const id of visibleIds(draft,BAR)) {
      const item = itemButton(id,BAR);
      if (item) previewList.append(item);
    }
    attachDropZone(previewList,BAR);
    const visibleTopLevel = visibleIds(draft,BAR).length;
    reserved.hidden = visibleTopLevel >= draft.bar.length;
    reserved.textContent = reserved.hidden ? "" : currentCopy().reserved;
  }

  function renderGroups() {
    groupsHost.replaceChildren();
    const groups = (liveSnapshot?.catalog || []).filter(entry => entry.kind === "group" && draft.groups?.[entry.id]);
    for (const group of groups) {
      const section = doc.createElement("section");
      section.className = "ppbui-menu-layout-editor__group";
      section.dataset.ppbuiMenuLayoutGroup = group.id;
      const heading = doc.createElement("h4");
      heading.textContent = group.label;
      const list = doc.createElement("div");
      list.className = "ppbui-menu-layout-editor__group-list";
      list.dataset.ppbuiMenuLayoutGroupList = group.id;
      for (const id of visibleIds(draft,group.id)) {
        const item = itemButton(id,group.id);
        if (item) list.append(item);
      }
      attachDropZone(list,group.id);
      section.append(heading,list);
      groupsHost.append(section);
    }
  }

  function renderDetails() {
    detailsSection.replaceChildren();
    const text = currentCopy();
    const header = doc.createElement("div");
    header.className = "ppbui-menu-layout-editor__section-head";
    const heading = doc.createElement("h3");
    heading.textContent = text.details;
    header.append(heading);
    detailsSection.append(header);
    const entry = entryFor(selectedId);
    const placement = entry ? visiblePosition(draft,selectedId) : null;
    if (!entry || !placement) {
      const empty = doc.createElement("p");
      empty.className = "ppbui-menu-layout-editor__meta";
      empty.textContent = text.noSelection;
      detailsSection.append(empty);
      return;
    }
    const name = doc.createElement("p");
    name.className = "ppbui-menu-layout-editor__details-name";
    name.textContent = entry.label;
    const current = doc.createElement("p");
    current.className = "ppbui-menu-layout-editor__meta";
    current.textContent = text.current(containerLabel(placement.container),placement.position);
    detailsSection.append(name,current);
    const restriction = restrictionText(entry);
    if (restriction) {
      const note = doc.createElement("p");
      note.className = "ppbui-menu-layout-editor__restriction";
      note.textContent = restriction;
      detailsSection.append(note);
    }

    const stepRow = doc.createElement("div");
    stepRow.className = "ppbui-menu-layout-editor__step-row";
    const previous = button(doc,"ppbui-button--compact");
    previous.dataset.ppbuiMenuLayoutFocus = "previous";
    previous.textContent = text.previous;
    const next = button(doc,"ppbui-button--compact");
    next.dataset.ppbuiMenuLayoutFocus = "next";
    next.textContent = text.next;
    const samePositions = validPositions(selectedId,placement.container);
    previous.disabled = saving || !samePositions.some(option => option.human === placement.position - 1);
    next.disabled = saving || !samePositions.some(option => option.human === placement.position + 1);
    previous.addEventListener("click",()=>applyMove(selectedId,placement.container,placement.position - 1,"previous"));
    next.addEventListener("click",()=>applyMove(selectedId,placement.container,placement.position + 1,"next"));
    stepRow.append(previous,next);
    detailsSection.append(stepRow);

    const destinationField = doc.createElement("label");
    destinationField.className = "ppbui-menu-layout-editor__field";
    const destinationCaption = doc.createElement("span");
    destinationCaption.textContent = text.moveTo;
    const destination = doc.createElement("select");
    destination.className = "ppbui-select";
    destination.dataset.ppbuiMenuLayoutMoveTo = "";
    const allowed = [...new Set(entry.allowedContainers || [])].filter(container => container === BAR || entryFor(container));
    for (const container of allowed) {
      const option = doc.createElement("option");
      option.value = container;
      option.textContent = containerLabel(container);
      option.disabled = !validPositions(selectedId,container).length;
      destination.append(option);
    }
    if (![...destination.options].some(option => option.value === moveDestination && !option.disabled)) moveDestination = placement.container;
    destination.value = moveDestination;
    destination.disabled = saving;
    destination.addEventListener("change",()=>{
      moveDestination = destination.value;
      const options = validPositions(selectedId,moveDestination);
      movePosition = options[0]?.human || 1;
      renderDetails();
      detailsSection.querySelector("[data-ppbui-menu-layout-move-to]")?.focus();
    });
    destinationField.append(destinationCaption,destination);

    const positionField = doc.createElement("label");
    positionField.className = "ppbui-menu-layout-editor__field";
    const positionCaption = doc.createElement("span");
    positionCaption.textContent = text.position;
    const position = doc.createElement("select");
    position.className = "ppbui-select";
    position.dataset.ppbuiMenuLayoutPosition = "";
    const positions = validPositions(selectedId,moveDestination);
    if (!positions.some(option => option.human === movePosition)) {
      movePosition = moveDestination === placement.container && positions.some(option => option.human === placement.position)
        ? placement.position : (positions[0]?.human || 1);
    }
    for (const candidate of positions) {
      const option = doc.createElement("option");
      option.value = String(candidate.human);
      option.textContent = String(candidate.human);
      position.append(option);
    }
    position.value = String(movePosition);
    position.disabled = saving || !positions.length;
    position.addEventListener("change",()=>{ movePosition = Number(position.value); });
    positionField.append(positionCaption,position);
    const moveGrid = doc.createElement("div");
    moveGrid.className = "ppbui-menu-layout-editor__move-grid";
    moveGrid.append(destinationField,positionField);
    detailsSection.append(moveGrid);

    const apply = button(doc,"ppbui-button--primary");
    apply.dataset.ppbuiMenuLayoutFocus = "apply";
    apply.dataset.ppbuiMenuLayoutApply = "";
    apply.textContent = text.apply;
    apply.disabled = saving || !positions.length;
    apply.addEventListener("click",()=>applyMove(selectedId,moveDestination,movePosition,"apply"));
    detailsSection.append(apply);
  }

  function render() {
    if (!draft || !liveSnapshot) return;
    const text = currentCopy();
    title.textContent = text.title;
    profile.textContent = text.profile(liveSnapshot.ownerLabel || liveSnapshot.owner);
    hint.textContent = text.hint;
    orientationCaption.textContent = text.orientation;
    capacityCaption.textContent = text.slotCapacity;
    orientation.options[0].textContent = text.horizontal;
    orientation.options[1].textContent = text.vertical;
    orientation.value = draft.orientation;
    orientation.disabled = saving;
    capacity.value = String(capacityOf(draft));
    capacity.disabled = saving;
    const occupied = slotCount(draft), overflow = overflowCount(draft);
    counter.textContent = overflow ? `${text.slots(occupied,capacityOf(draft))} · ${text.freeSlots(overflow)}` : text.slots(occupied,capacityOf(draft));
    counter.dataset.overCapacity = String(overflow > 0);
    previewTitle.textContent = text.preview;
    groupsTitle.textContent = text.groups;
    closeButton.setAttribute("aria-label",text.close);
    reloadButton.textContent = text.reload;
    overwriteButton.textContent = text.overwrite;
    resetButton.textContent = text.reset;
    editSelectedButton.textContent = text.editSelected;
    cancelButton.textContent = text.cancel;
    saveButton.textContent = saving ? text.saving : text.save;
    saveButton.setAttribute("aria-busy",String(saving));
    closeButton.disabled = saving;
    resetButton.disabled = saving;
    editSelectedButton.hidden = !isNarrow();
    editSelectedButton.disabled = saving || !selectedId;
    cancelButton.disabled = saving;
    saveButton.disabled = saving || !dirty || conflict || overflow > 0;
    reloadButton.disabled = saving;
    overwriteButton.disabled = saving || !dirty || overflow > 0;
    conflictPanel.hidden = !conflict;
    conflictText.textContent = text.conflict;
    if (!liveSnapshot.persistent || liveSnapshot.issue === "storage-unavailable" || liveSnapshot.issue === "session-only") meta.textContent = text.storageUnavailable;
    else if (!benignIssue(liveSnapshot.issue)) meta.textContent = text.protectedIssue;
    else meta.textContent = "";
    status.textContent = statusMessage || (dirty && !conflict ? text.dirty : "");
    status.dataset.error = String(statusError);
    renderPreview();
    renderGroups();
    renderDetails();
    lastRenderedSnapshotKey = snapshotUiKey(liveSnapshot);
  }

  function adopt(snapshot, { keepSelection = true } = {}) {
    liveSnapshot = snapshot;
    baseline = { owner:snapshot.owner,token:snapshot.token,layout:cloneLayout(snapshot.layout) };
    draft = cloneLayout(snapshot.layout);
    dirty = false;
    conflict = false;
    externalSnapshot = null;
    if (!keepSelection || !entryFor(selectedId)) selectedId = "";
    if (selectedId) {
      const placement = visiblePosition(draft,selectedId);
      moveDestination = placement?.container || BAR;
      movePosition = placement?.position || 1;
    }
  }

  function close({ restoreFocus = true } = {}) {
    if (disposed || root.hidden) return;
    epoch++;
    root.hidden = true;
    dragState = null;
    clearDropIndicator();
    draft = null;
    baseline = null;
    liveSnapshot = null;
    conflict = false;
    externalSnapshot = null;
    dirty = false;
    selectedId = "";
    saving = false;
    lastRenderedSnapshotKey = "";
    const target = origin;
    origin = null;
    if (restoreFocus && target?.isConnected && typeof target.focus === "function") target.focus();
  }

  function open(nextOrigin) {
    if (disposed) return false;
    const snapshot = readSnapshot();
    if (!snapshot.enabled || !snapshot.owner) return false;
    epoch++;
    origin = nextOrigin?.focus ? nextOrigin : doc.activeElement;
    adopt(snapshot,{ keepSelection:false });
    statusMessage = "";
    statusError = false;
    root.hidden = false;
    render();
    closeButton.focus();
    return true;
  }

  function sync() {
    if (disposed) return;
    const snapshot = readSnapshot();
    if (!isOpen()) {
      liveSnapshot = snapshot;
      return;
    }
    if (!snapshot.enabled || !snapshot.owner || snapshot.owner !== baseline?.owner) {
      const text = currentCopy();
      setStatus(text.ownerChanged,true);
      close({ restoreFocus:true });
      return;
    }
    const changed = snapshot.token !== baseline.token || signature(snapshot.layout) !== signature(baseline.layout);
    const nextSnapshotKey = snapshotUiKey(snapshot);
    if (nextSnapshotKey === lastRenderedSnapshotKey) return;
    const restoreFocus = focusDescriptor();
    liveSnapshot = snapshot;
    if (changed && dirty) {
      conflict = true;
      externalSnapshot = snapshot;
      setStatus(currentCopy().conflict,true);
      render();
      restoreFocusDescriptor(restoreFocus);
      return;
    }
    if (changed) {
      adopt(snapshot);
      setStatus("",false);
    }
    render();
    restoreFocusDescriptor(restoreFocus);
  }

  async function save({ overwrite = false } = {}) {
    if (disposed || saving || !dirty || !baseline) return false;
    const checked = validateLayout(draft);
    if (!checked.ok) {
      setStatus(currentCopy().invalidLayout,true);
      render();
      return false;
    }
    const before = readSnapshot();
    if (!before.enabled || before.owner !== baseline.owner) {
      close({ restoreFocus:true });
      return false;
    }
    const externalChanged = before.token !== baseline.token || signature(before.layout) !== signature(baseline.layout);
    if (!overwrite && (externalChanged || !benignIssue(before.issue))) {
      liveSnapshot = before;
      conflict = true;
      externalSnapshot = before;
      setStatus(currentCopy().conflict,true);
      render();
      return false;
    }
    const runEpoch = epoch;
    saving = true;
    conflict = false;
    setStatus(currentCopy().saving,false);
    render();
    let result;
    try {
      result = await Promise.resolve(onSave(cloneLayout(checked.layout),{
        owner:baseline.owner,
        token:overwrite ? before.token : baseline.token,
        overwrite:Boolean(overwrite),
      }));
    } catch {
      result = { ok:false,error:"save-failed" };
    }
    if (disposed || runEpoch !== epoch || !isOpen()) return Boolean(result?.ok);
    const after = readSnapshot();
    if (!after.enabled || after.owner !== baseline.owner) {
      saving = false;
      close({ restoreFocus:true });
      return false;
    }
    saving = false;
    if (!result?.ok) {
      liveSnapshot = after;
      if (result?.error === "conflict" || result?.error === "protected-record") {
        conflict = true;
        externalSnapshot = after;
        setStatus(currentCopy().conflict,true);
      } else {
        setStatus(currentCopy().saveFailed,true);
      }
      render();
      return false;
    }
    const savedLayout = validateLayout(result.layout || checked.layout);
    if (!savedLayout.ok) {
      setStatus(currentCopy().saveFailed,true);
      render();
      return false;
    }
    const saved = {
      ...after,
      owner:baseline.owner,
      ownerLabel:after.ownerLabel || liveSnapshot.ownerLabel,
      layout:savedLayout.layout,
      token:result.token ?? after.token,
      persistent:result.persistent ?? after.persistent,
      issue:result.persistent === false ? (result.error || "session-only") : null,
      enabled:true,
      catalog:after.catalog.length ? after.catalog : liveSnapshot.catalog,
    };
    adopt(saved);
    setStatus(saved.persistent ? currentCopy().saved : currentCopy().sessionSaved,false);
    render();
    return true;
  }

  orientation.addEventListener("change",()=>{
    if (saving || !draft) return;
    const next = cloneLayout(draft);
    next.orientation = orientation.value;
    const checked = validateLayout(next,{ allowOverflow:true });
    if (!checked.ok) {
      setStatus(currentCopy().invalidLayout,true);
      render();
      return;
    }
    draft = checked.layout;
    syncDirty();
    setStatus(dirty ? currentCopy().dirty : "",false);
    render();
    orientation.focus();
  });
  capacity.addEventListener("change",()=>{
    if (saving || !draft) return;
    const next = cloneLayout(draft);
    next.slotCapacity = Number(capacity.value);
    const checked = validateLayout(next,{ allowOverflow:true });
    if (!checked.ok) {
      setStatus(currentCopy().invalidLayout,true);
      render();
      return;
    }
    draft = checked.layout;
    syncDirty();
    setStatus(dirty ? currentCopy().dirty : "",false);
    render();
    capacity.focus();
  });
  closeButton.addEventListener("click",()=>{ if (!saving) close({ restoreFocus:true }); });
  cancelButton.addEventListener("click",()=>{ if (!saving) close({ restoreFocus:true }); });
  resetButton.addEventListener("click",()=>{
    if (saving || !draft) return;
    const next = defaultLayout();
    const checked = validateLayout(next);
    if (!checked.ok) return;
    draft = checked.layout;
    syncDirty();
    const entry = entryFor(selectedId);
    if (entry) {
      const placement = visiblePosition(draft,selectedId);
      moveDestination = placement?.container || BAR;
      movePosition = placement?.position || 1;
    }
    setStatus(dirty ? currentCopy().dirty : "",false);
    render();
    resetButton.focus();
  });
  saveButton.addEventListener("click",()=>save({ overwrite:false }));
  reloadButton.addEventListener("click",()=>{
    if (saving || !conflict) return;
    const current = externalSnapshot || readSnapshot();
    if (!current.enabled || current.owner !== baseline?.owner) return close({ restoreFocus:true });
    adopt(current);
    setStatus("",false);
    render();
    orientation.focus();
  });
  overwriteButton.addEventListener("click",()=>save({ overwrite:true }));
  editSelectedButton.addEventListener("click",()=>{
    if (saving || !selectedId || editSelectedButton.hidden) return;
    detailsSection.scrollIntoView?.({ block:"start" });
    const moveTo = detailsSection.querySelector("[data-ppbui-menu-layout-move-to]");
    if (moveTo && !moveTo.disabled) moveTo.focus();
    else {
      detailsSection.tabIndex = -1;
      detailsSection.focus({ preventScroll:true });
    }
  });
  const onResize = () => {
    if (!isOpen()) return;
    const hidden = !isNarrow();
    const disabled = saving || !selectedId;
    if (editSelectedButton.hidden !== hidden) editSelectedButton.hidden = hidden;
    if (editSelectedButton.disabled !== disabled) editSelectedButton.disabled = disabled;
  };
  doc.defaultView?.addEventListener?.("resize",onResize);
  root.addEventListener("keydown",event=>{
    if (!isOpen()) return;
    event.stopPropagation();
    if (event.key === "Escape") {
      if (!saving) { event.preventDefault(); close({ restoreFocus:true }); }
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusables(root);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && doc.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && doc.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });

  function dispose() {
    if (disposed) return;
    close({ restoreFocus:false });
    disposed = true;
    doc.defaultView?.removeEventListener?.("resize",onResize);
    root.remove();
    style.remove();
  }

  return { open,close,sync,dispose,root };
}
