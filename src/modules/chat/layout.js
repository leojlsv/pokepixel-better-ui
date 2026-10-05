import { findCollapse, isHorizontalScrollbarPointer } from "./dom.js";

export function createChatLayout(root, bar, add) {
  const doc = root.ownerDocument;
  const header = doc.createElement("div");
  header.className = "ppbui-chat-header";
  const actions = doc.createElement("div");
  actions.className = "pokeidle-persistent-chat__tabs ppbui-chat-actions";
  let collapse, anchor;
  bar.before(header);
  header.append(bar, actions);
  bar.classList.add("ppbui-chat-tabs");
  actions.append(add);
  function guardScrollbar(event) {
    // UIPanel listens on this same node and rewrites window bounds as soon as drag starts.
    if (isHorizontalScrollbarPointer(bar, event)) event.stopImmediatePropagation();
  }
  bar.addEventListener("pointerdown", guardScrollbar, true);
  function sync() {
    const candidate = findCollapse(bar);
    if (candidate && candidate !== collapse) {
      if (collapse?.parentNode === actions && anchor?.parentNode) anchor.replaceWith(collapse);
      else anchor?.remove();
      collapse = candidate;
      anchor = doc.createComment("ppbui-chat-collapse");
      collapse.before(anchor);
      actions.append(collapse);
    }
  }
  sync();
  return {
    sync,
    cleanup() {
      bar.removeEventListener("pointerdown", guardScrollbar, true);
      if (collapse?.parentNode === actions && anchor?.parentNode) anchor.replaceWith(collapse);
      else anchor?.remove();
      bar.classList.remove("ppbui-chat-tabs");
      actions.remove();
      // Unwrap current children too: the game may have replaced the original tab bar.
      header.replaceWith(...header.childNodes);
    },
  };
}
