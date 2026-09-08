export function mountSortControl(root, order, bar, clear, nextControl) {
  let parts = {};
  let searchOriginal = null;
  const restoreSearch = () => {
    if (searchOriginal?.node.placeholder === "Search") {
      if (searchOriginal.placeholder === null) searchOriginal.node.removeAttribute("placeholder");
      else searchOriginal.node.setAttribute("placeholder", searchOriginal.placeholder);
    }
  };
  const anchor = document.createElement("span");
  anchor.className = "game-window__select";
  anchor.dataset.ppbuiOrderAnchor = "";
  anchor.setAttribute("aria-hidden", "true");
  bar.prepend(anchor);
  order.tabIndex = -1;
  const style = document.createElement("style");
  style.dataset.ppbuiInventoryStyle = "";
  style.textContent = `
    [data-ppbui-inventory-toolbar] > input.game-window__search { min-width: 0; width: 105.6px; flex: 0 0 105.6px; }
    [data-ppbui-inventory-toolbar] > select.game-window__select { min-width: 0; width: 0; flex: 1; max-width: 240px; }
    [data-ppbui-order-anchor] { visibility: hidden; min-width: 140px; width: 0; flex: 1; }
    [data-ppbui-inventory-views] { margin: 0 0 0 auto; flex-shrink: 0; }
    [data-ppbui-inventory-clear] { flex-shrink: 0; }
    [data-ppbui-order] { position: absolute; min-width: 0; margin: 0; }
  `;
  // The native refresh clears the body. Keep the actual select on the stable panel.
  root.append(style, order);
  const set = (key, value) => { if (order.style[key] !== value) order.style[key] = value; };
  const position = () => {
    if (!anchor.isConnected || !parts.body) { if (!order.hidden) order.hidden = true; return; }
    const box = anchor.getBoundingClientRect(), panel = root.getBoundingClientRect(), body = parts.body.getBoundingClientRect();
    const outside = box.top < body.top || box.bottom > body.bottom || box.left < body.left || box.right > body.right;
    const hidden = Boolean(body.height && outside);
    if (order.hidden !== hidden) order.hidden = hidden;
    const scaleX = panel.width && root.offsetWidth ? panel.width / root.offsetWidth : 1;
    const scaleY = panel.height && root.offsetHeight ? panel.height / root.offsetHeight : 1;
    set("left", `${(box.left - panel.left) / scaleX - root.clientLeft + root.scrollLeft}px`);
    set("top", `${(box.top - panel.top) / scaleY - root.clientTop + root.scrollTop}px`);
    set("width", `${box.width / scaleX}px`);
    set("height", `${box.height / scaleY}px`);
  };
  const tab = event => {
    if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) return;
    let target;
    const previous = clear.disabled ? parts.category : clear;
    if (event.target === previous && !event.shiftKey) target = order;
    if (event.target === order) target = event.shiftKey ? previous : nextControl();
    if (event.target === nextControl() && event.shiftKey) target = order;
    if (target && !target.hidden) { event.preventDefault(); target.focus(); }
  };
  const drag = event => { if (event.buttons) position(); };
  root.addEventListener("keydown", tab);
  root.addEventListener("scroll", position, true);
  root.ownerDocument.addEventListener("pointermove", drag);
  root.ownerDocument.defaultView.addEventListener("resize", position);
  order.addEventListener("blur", position);
  return {
    position,
    sync(next) {
      if (searchOriginal?.node !== next.search) {
        restoreSearch();
        searchOriginal = next.search ? { node: next.search, placeholder: next.search.getAttribute("placeholder") } : null;
      }
      if (next.search && next.search.placeholder !== "Search") next.search.placeholder = "Search";
      if (parts.toolbar !== next.toolbar) parts.toolbar?.removeAttribute("data-ppbui-inventory-toolbar");
      parts = next;
      if (next.toolbar && next.category) {
        if (!next.toolbar.hasAttribute("data-ppbui-inventory-toolbar")) next.toolbar.dataset.ppbuiInventoryToolbar = "";
        if (clear.previousElementSibling !== next.category) next.category.after(clear);
      } else clear.remove();
      if (!anchor.isConnected || document.activeElement !== order) position();
    },
    cleanup() {
      restoreSearch();
      root.removeEventListener("keydown", tab);
      root.removeEventListener("scroll", position, true);
      root.ownerDocument.removeEventListener("pointermove", drag);
      root.ownerDocument.defaultView.removeEventListener("resize", position);
      order.removeEventListener("blur", position);
      parts.toolbar?.removeAttribute("data-ppbui-inventory-toolbar");
      anchor.remove(); clear.remove(); order.remove(); style.remove();
    },
  };
}
