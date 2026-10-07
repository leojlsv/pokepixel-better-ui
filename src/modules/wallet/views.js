const LOCATIONS = Object.freeze(["backpack","trainer"]);

const COPY = Object.freeze({
  pt:Object.freeze({
    wallet:"Wallet",
    helper:"Os dois locais podem coexistir.",
    backpack:"Backpack",
    trainer:"Cabeçalho Trainer",
    close:"Fechar",
    session:"Alteração aplicada somente nesta sessão; armazenamento indisponível.",
    ownerChanged:"O perfil ativo mudou. Tente novamente.",
    protectedRecord:"As preferências salvas estão protegidas e não foram alteradas.",
    failed:"Não foi possível atualizar Wallet.",
    ownerMissing:"Entre em um perfil para alterar a Wallet.",
    values:"Valores da Wallet",
  }),
  en:Object.freeze({
    wallet:"Wallet",
    helper:"Both locations can be enabled together.",
    backpack:"Backpack",
    trainer:"Trainer header",
    close:"Close",
    session:"Change applied for this session only; storage is unavailable.",
    ownerChanged:"The active profile changed. Try again.",
    protectedRecord:"Saved preferences are protected and were not changed.",
    failed:"Could not update Wallet.",
    ownerMissing:"Sign in to a profile to change Wallet.",
    values:"Wallet values",
  }),
  es:Object.freeze({
    wallet:"Wallet",
    helper:"Ambos lugares pueden estar activos al mismo tiempo.",
    backpack:"Backpack",
    trainer:"Cabecera Trainer",
    close:"Cerrar",
    session:"Cambio aplicado solo en esta sesión; el almacenamiento no está disponible.",
    ownerChanged:"El perfil activo cambió. Inténtalo de nuevo.",
    protectedRecord:"Las preferencias guardadas están protegidas y no se modificaron.",
    failed:"No se pudo actualizar Wallet.",
    ownerMissing:"Inicia sesión en un perfil para cambiar Wallet.",
    values:"Valores de Wallet",
  }),
  zh:Object.freeze({
    wallet:"Wallet",
    helper:"两个位置可以同时启用。",
    backpack:"背包",
    trainer:"训练家标题",
    close:"关闭",
    session:"更改仅在本次会话中生效；存储不可用。",
    ownerChanged:"当前档案已更改，请重试。",
    protectedRecord:"已保存的偏好受保护，未进行更改。",
    failed:"无法更新 Wallet。",
    ownerMissing:"请先登录档案再更改 Wallet。",
    values:"Wallet 数值",
  }),
});

let settingsSequence = 0;

function textFor(doc) {
  const locale = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en";
  return COPY[String(locale).split(/[-_]/)[0]] || COPY.en;
}

function setText(node,value) {
  const next = String(value ?? "");
  if (node.textContent !== next) node.textContent = next;
}

function setBoolean(node,key,value) {
  if (node[key] !== Boolean(value)) node[key] = Boolean(value);
}

function normalizeSnapshot(raw) {
  const locations = {};
  for (const key of LOCATIONS) locations[key] = Boolean(raw?.locations?.[key]);
  return {
    owner:String(raw?.owner ?? "").trim(),
    ownerLabel:String(raw?.ownerLabel ?? raw?.owner ?? "").trim(),
    locations,
    persistent:Boolean(raw?.persistent),
    issue:raw?.issue ?? null,
  };
}

function snapshotKey(doc,snapshot) {
  const locale = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en";
  return JSON.stringify({
    locale,
    owner:snapshot.owner,
    ownerLabel:snapshot.ownerLabel,
    locations:snapshot.locations,
    persistent:snapshot.persistent,
    issue:snapshot.issue,
  });
}

function issueMessage(copy,issue,{ success = false,persistent = true } = {}) {
  if (success && (!persistent || issue === "storage-unavailable" || issue === "session-only")) return { text:copy.session,error:false };
  if (issue === "owner-changed") return { text:copy.ownerChanged,error:true };
  if (issue === "protected-record" || issue === "future-version" || issue === "corrupt" || issue === "oversize-record" || String(issue || "").startsWith("invalid-layout:")) {
    return { text:copy.protectedRecord,error:true };
  }
  if (issue === "storage-unavailable" || issue === "session-only" || !persistent) return { text:copy.session,error:false };
  return issue ? { text:copy.failed,error:true } : { text:"",error:false };
}

export function createWalletSettings({ doc = document,getSnapshot,onToggle } = {}) {
  if (!doc?.createElement) throw new TypeError("doc is required");
  if (typeof getSnapshot !== "function") throw new TypeError("getSnapshot is required");
  if (typeof onToggle !== "function") throw new TypeError("onToggle is required");

  const id = ++settingsSequence;
  const helperId = `ppbui-wallet-settings-help-${id}`;
  const root = doc.createElement("details");
  root.className = "ppbui-wallet-settings ppbui-module-section";
  root.dataset.ppbuiWalletSettings = "";
  root.open = true;
  const legend = doc.createElement("summary");
  const body = doc.createElement("div");
  body.className = "ppbui-wallet-settings__body";
  const helper = doc.createElement("p");
  helper.className = "ppbui-wallet-settings__helper";
  helper.id = helperId;
  const rows = new Map();

  for (const key of LOCATIONS) {
    const label = doc.createElement("label");
    label.className = "ppbui-wallet-settings__row";
    label.dataset.ppbuiWalletLocation = key;
    const input = doc.createElement("input");
    input.type = "checkbox";
    input.dataset.ppbuiWalletToggle = key;
    input.setAttribute("aria-describedby",helperId);
    const name = doc.createElement("span");
    name.className = "ppbui-wallet-settings__label";
    label.append(input,name);
    body.append(label);
    rows.set(key,{ label,input,name });
  }

  const status = doc.createElement("p");
  status.className = "ppbui-wallet-settings__status";
  status.dataset.ppbuiWalletStatus = "";
  status.setAttribute("role","status");
  status.setAttribute("aria-live","polite");
  status.setAttribute("aria-atomic","true");
  status.hidden = true;
  body.prepend(helper);
  body.append(status);
  root.append(legend,body);

  let disposed = false;
  let snapshot = normalizeSnapshot({});
  let lastKey = "";
  let actionStatus = null;

  const read = () => {
    try { return normalizeSnapshot(getSnapshot()); }
    catch { return normalizeSnapshot({}); }
  };

  function setStatus(message) {
    actionStatus = message;
    const value = message || { text:"",error:false };
    setText(status,value.text);
    status.dataset.error = String(Boolean(value.error));
    status.hidden = !value.text;
  }

  function baseStatus(next,copy) {
    if (!next.owner) return { text:copy.ownerMissing,error:false };
    return issueMessage(copy,next.issue,{ persistent:next.persistent });
  }

  function apply(next,{ preserveStatus = false } = {}) {
    const copy = textFor(doc);
    snapshot = next;
    setText(legend,copy.wallet);
    setText(helper,copy.helper);
    for (const key of LOCATIONS) {
      const row = rows.get(key);
      setText(row.name,copy[key]);
      setBoolean(row.input,"checked",next.locations[key]);
      const unavailable = !next.owner;
      setBoolean(row.input,"disabled",unavailable);
      row.label.classList.toggle("is-disabled",unavailable);
    }
    if (!preserveStatus) setStatus(baseStatus(next,copy));
    else if (actionStatus) setStatus(actionStatus);
    lastKey = snapshotKey(doc,next);
  }

  function sync() {
    if (disposed) return;
    const next = read();
    const key = snapshotKey(doc,next);
    if (key === lastKey) return;
    actionStatus = null;
    apply(next);
  }

  for (const [key,row] of rows) {
    row.input.addEventListener("change",() => {
      if (disposed) return;
      const scrollOwner = root.closest(".ppbui-module-list");
      const scrollTop = scrollOwner?.scrollTop;
      const restoreViewport = () => {
        if (scrollOwner && scrollTop !== undefined) scrollOwner.scrollTop = scrollTop;
        if (row.input.isConnected) row.input.focus({ preventScroll:true });
      };
      const queue = doc.defaultView?.queueMicrotask || globalThis.queueMicrotask;
      if (typeof queue === "function") queue(restoreViewport); else Promise.resolve().then(restoreViewport);
      const previous = snapshot.locations[key];
      const enabled = row.input.checked;
      const current = read();
      if (!current.owner || current.owner !== snapshot.owner) {
        setBoolean(row.input,"checked",previous);
        apply(current);
        setStatus({ text:textFor(doc).ownerChanged,error:true });
        return;
      }
      let result;
      try { result = onToggle(key,enabled,{ owner:snapshot.owner }); }
      catch { result = { ok:false,error:"toggle-failed" }; }
      if (!result || typeof result.then === "function") result = { ok:false,error:"toggle-failed" };
      const copy = textFor(doc);
      if (!result?.ok) {
        setBoolean(row.input,"checked",previous);
        setStatus(issueMessage(copy,result?.error || "toggle-failed"));
        return;
      }
      const next = read();
      if (next.owner && next.owner !== snapshot.owner) {
        setBoolean(row.input,"checked",previous);
        apply(next);
        setStatus({ text:copy.ownerChanged,error:true });
        return;
      }
      const optimistic = next.owner ? next : {
        ...snapshot,
        locations:{ ...snapshot.locations,[key]:enabled },
        persistent:result.persistent ?? snapshot.persistent,
        issue:result.error ?? snapshot.issue,
      };
      if (optimistic.locations[key] !== enabled) optimistic.locations = { ...optimistic.locations,[key]:enabled };
      const message = issueMessage(copy,result.error,{ success:true,persistent:result.persistent ?? optimistic.persistent });
      actionStatus = message.text ? message : null;
      apply(optimistic,{ preserveStatus:true });
      if (!actionStatus) setStatus({ text:"",error:false });
    });
  }

  apply(read());

  function dispose() {
    if (disposed) return;
    disposed = true;
    root.remove();
  }

  return { root,sync,dispose };
}

export function createWalletPanel({ doc = document,onClose } = {}) {
  if (!doc?.createElement) throw new TypeError("doc is required");
  if (onClose != null && typeof onClose !== "function") throw new TypeError("onClose must be a function");

  const root = doc.createElement("section");
  root.className = "ppbui-panel ppbui-root ppbui-wallet-panel";
  root.dataset.ppbuiWalletPanel = "";
  root.setAttribute("role","dialog");
  root.setAttribute("aria-modal","false");
  root.hidden = true;

  const header = doc.createElement("header");
  header.className = "ppbui-wallet-panel__header";
  const title = doc.createElement("strong");
  const closeButton = doc.createElement("button");
  closeButton.type = "button";
  closeButton.className = "ppbui-button ppbui-button--compact";
  closeButton.dataset.ppbuiWalletClose = "";
  header.append(title,closeButton);
  const values = doc.createElement("div");
  values.className = "ppbui-wallet-values";
  values.dataset.ppbuiWalletValues = "";
  root.append(header,values);
  doc.body.append(root);

  let disposed = false;
  let anchor = null;
  let locale = "";
  const margin = 8;

  function sync() {
    if (disposed) return;
    const nextLocale = String(doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en");
    if (nextLocale !== locale) {
      locale = nextLocale;
      const copy = textFor(doc);
      root.setAttribute("aria-label",copy.wallet);
      values.setAttribute("aria-label",copy.values);
      setText(title,copy.wallet);
      setText(closeButton,copy.close);
    }
    if (!root.hidden) position();
  }

  function position() {
    if (disposed || root.hidden) return;
    const win = doc.defaultView;
    const viewportWidth = Math.max(0,Number(win?.innerWidth) || 0);
    const viewportHeight = Math.max(0,Number(win?.innerHeight) || 0);
    const panelRect = root.getBoundingClientRect();
    const width = panelRect.width || root.offsetWidth || 220;
    const height = panelRect.height || root.offsetHeight || 88;
    const anchorRect = anchor?.isConnected && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left:margin,top:margin,bottom:margin };
    let left = Number(anchorRect.left) || margin;
    let top = (Number(anchorRect.bottom) || margin) + 4;
    if (viewportHeight && top + height > viewportHeight - margin) top = (Number(anchorRect.top) || margin) - height - 4;
    const maxLeft = viewportWidth ? Math.max(margin,viewportWidth - width - margin) : left;
    const maxTop = viewportHeight ? Math.max(margin,viewportHeight - height - margin) : top;
    left = Math.min(Math.max(left,margin),maxLeft);
    top = Math.min(Math.max(top,margin),maxTop);
    const nextLeft = `${Math.round(left)}px`;
    const nextTop = `${Math.round(top)}px`;
    if (root.style.left !== nextLeft) root.style.left = nextLeft;
    if (root.style.top !== nextTop) root.style.top = nextTop;
  }

  function closeInternal({ restoreFocus = true,notify = true } = {}) {
    if (disposed || root.hidden) return;
    root.hidden = true;
    const target = anchor;
    anchor = null;
    if (restoreFocus && target?.isConnected && typeof target.focus === "function") target.focus();
    if (notify) onClose?.({ restoreFocus:Boolean(restoreFocus) });
  }

  function open(nextAnchor) {
    if (disposed) return false;
    anchor = nextAnchor?.isConnected ? nextAnchor : null;
    sync();
    root.hidden = false;
    position();
    closeButton.focus();
    return true;
  }

  function close(options = {}) {
    const restoreFocus = typeof options === "boolean" ? options : options?.restoreFocus ?? true;
    closeInternal({ restoreFocus:Boolean(restoreFocus) });
  }

  closeButton.addEventListener("click",event => {
    event.preventDefault();
    event.stopPropagation();
    closeInternal();
  });
  root.addEventListener("click",event => event.stopPropagation());

  const onDocumentClick = event => {
    if (disposed || root.hidden || root.contains(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    closeInternal();
  };
  const onDocumentKeydown = event => {
    if (disposed || root.hidden || event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    closeInternal();
  };
  const onResize = () => position();
  doc.addEventListener("click",onDocumentClick,true);
  doc.addEventListener("keydown",onDocumentKeydown,true);
  doc.defaultView?.addEventListener?.("resize",onResize);
  sync();

  function dispose() {
    if (disposed) return;
    closeInternal({ restoreFocus:false,notify:false });
    disposed = true;
    doc.removeEventListener("click",onDocumentClick,true);
    doc.removeEventListener("keydown",onDocumentKeydown,true);
    doc.defaultView?.removeEventListener?.("resize",onResize);
    root.remove();
  }

  return { root,values,open,close,sync,dispose };
}
