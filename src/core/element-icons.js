const iconClass = "ppbui-element-icon";
const smallClass = "ppbui-element-icon--small";
const imageClass = "ppbui-element-icon__image";
const listClass = "ppbui-element-icons";
const listOwnership = new WeakMap();
const iconOwnership = new WeakMap();
const imageOwnership = new WeakMap();
const scopeOwnership = new WeakMap();
const listScopes = new WeakMap();
const iconScopes = new WeakMap();
const imageScopes = new WeakMap();

const colorFor = (icons, type) => icons?.definition?.(type)?.color || "";

function ledgerFor(scope) {
  if (!scope) return null;
  let ledger = scopeOwnership.get(scope);
  if (!ledger) {
    ledger = { lists: new Set(), icons: new Set(), images: new Set() };
    scopeOwnership.set(scope, ledger);
  }
  return ledger;
}

function transferScope(node, scope, ledger, key, owners) {
  const previousScope = owners.get(node);
  if (previousScope && previousScope !== scope) scopeOwnership.get(previousScope)?.[key]?.delete(node);
  if (!scope || !ledger) {
    if (previousScope) owners.delete(node);
    return;
  }
  owners.set(node, scope);
  ledger[key].add(node);
}

function releaseScopeOwner(node, scope, owners) {
  if (owners.get(node) === scope) owners.delete(node);
}

function restoreList(list) {
  const original = listOwnership.get(list); if (!original) return;
  if (!original.hadClass) list.classList.remove(listClass);
  if (!original.hadClassAttribute && !list.getAttribute("class")) list.removeAttribute("class");
  listOwnership.delete(list);
}

function restoreIcon(node) {
  const original = iconOwnership.get(node); if (!original) return;
  if (!original.hadClass) node.classList.remove(iconClass);
  node.classList.toggle(smallClass, original.hadSmall);
  if (!original.hadClassAttribute && !node.getAttribute("class")) node.removeAttribute("class");
  if (original.color) node.style.setProperty("--ppbui-element-color", original.color, original.priority);
  else node.style.removeProperty("--ppbui-element-color");
  if (!original.hadStyle && !node.getAttribute("style")) node.removeAttribute("style");
  iconOwnership.delete(node);
}

function restoreImage(image) {
  const original = imageOwnership.get(image); if (!original) return;
  if (!original.hadClass) image.classList.remove(imageClass);
  if (!original.hadClassAttribute && !image.getAttribute("class")) image.removeAttribute("class");
  imageOwnership.delete(image);
}

function pruneDetached(scope, ledger) {
  if (!scope?.contains || !ledger) return;
  for (const image of [...ledger.images]) {
    if (imageScopes.get(image) !== scope) { ledger.images.delete(image); continue; }
    if (!scope.contains(image)) { restoreImage(image); releaseScopeOwner(image, scope, imageScopes); ledger.images.delete(image); }
  }
  for (const icon of [...ledger.icons]) {
    if (iconScopes.get(icon) !== scope) { ledger.icons.delete(icon); continue; }
    if (!scope.contains(icon)) { restoreIcon(icon); releaseScopeOwner(icon, scope, iconScopes); ledger.icons.delete(icon); }
  }
  for (const list of [...ledger.lists]) {
    if (listScopes.get(list) !== scope) { ledger.lists.delete(list); continue; }
    if (!scope.contains(list)) { restoreList(list); releaseScopeOwner(list, scope, listScopes); ledger.lists.delete(list); }
  }
}

export function decorateElementIconList(list, types = [], icons, { small = false, scope = null } = {}) {
  if (!list) return null;
  const ledger = ledgerFor(scope);
  pruneDetached(scope, ledger);
  if (!listOwnership.has(list)) listOwnership.set(list, { hadClass: list.classList.contains(listClass), hadClassAttribute: list.hasAttribute("class") });
  transferScope(list, scope, ledger, "lists", listScopes);
  if (!list.classList.contains(listClass)) list.classList.add(listClass);
  [...list.children].forEach((node, index) => {
    if (!iconOwnership.has(node)) iconOwnership.set(node, {
      hadClass: node.classList.contains(iconClass),
      hadSmall: node.classList.contains(smallClass),
      hadClassAttribute: node.hasAttribute("class"),
      hadStyle: node.hasAttribute("style"),
      color: node.style.getPropertyValue("--ppbui-element-color"),
      priority: node.style.getPropertyPriority("--ppbui-element-color"),
    });
    const original = iconOwnership.get(node);
    transferScope(node, scope, ledger, "icons", iconScopes);
    if (!node.classList.contains(iconClass)) node.classList.add(iconClass);
    node.classList.toggle(smallClass, original.hadSmall || small);
    const color = colorFor(icons, types[index]);
    if (color && node.style.getPropertyValue("--ppbui-element-color") !== color) node.style.setProperty("--ppbui-element-color", color);
    else if (!color && original.color) node.style.setProperty("--ppbui-element-color", original.color, original.priority);
    else if (!color) node.style.removeProperty("--ppbui-element-color");
    const image = node.matches?.("img") ? node : node.querySelector?.("img");
    if (image && image !== node) {
      if (!imageOwnership.has(image)) imageOwnership.set(image, { hadClass: image.classList.contains(imageClass), hadClassAttribute: image.hasAttribute("class") });
      transferScope(image, scope, ledger, "images", imageScopes);
      if (!image.classList.contains(imageClass)) image.classList.add(imageClass);
    }
  });
  return list;
}

export function createElementIcon(doc, icons, type, { small = false } = {}) {
  const definition = icons?.definition?.(type), created = icons?.create?.(type, { size: small ? 20 : 24 });
  const image = created?.matches?.("img") ? created : created?.querySelector?.("img");
  const node = doc.createElement("span");
  node.className = `${iconClass}${small ? ` ${smallClass}` : ""}`;
  const color = definition?.color || ""; if (color) node.style.setProperty("--ppbui-element-color", color);
  node.setAttribute("aria-hidden", "true");
  if (image) {
    image.remove(); image.classList.add(imageClass); image.alt = ""; image.setAttribute("aria-hidden", "true"); image.removeAttribute("tabindex"); node.append(image);
  } else {
    node.classList.add("ppbui-element-icon--fallback"); node.textContent = (definition?.label || type || "?").slice(0, 1).toUpperCase();
  }
  return node;
}

export function releaseElementIconLists(scope) {
  if (!scope?.querySelectorAll) return;
  const ledger = scopeOwnership.get(scope);
  if (ledger) {
    ledger.images.forEach(image => { if (imageScopes.get(image) === scope) { restoreImage(image); imageScopes.delete(image); } });
    ledger.icons.forEach(node => { if (iconScopes.get(node) === scope) { restoreIcon(node); iconScopes.delete(node); } });
    ledger.lists.forEach(list => { if (listScopes.get(list) === scope) { restoreList(list); listScopes.delete(list); } });
    scopeOwnership.delete(scope);
  }
  // Legacy/unscoped callers are restored by reachability. Scoped consumers never
  // restore foreign scoped ownership because each fallback restore is owner-guarded.
  scope.querySelectorAll(`.${imageClass}`).forEach(image => { if (!imageScopes.has(image)) restoreImage(image); });
  scope.querySelectorAll(`.${iconClass}`).forEach(node => { if (!iconScopes.has(node)) restoreIcon(node); });
  scope.querySelectorAll(`.${listClass}`).forEach(list => { if (!listScopes.has(list)) restoreList(list); });
}
