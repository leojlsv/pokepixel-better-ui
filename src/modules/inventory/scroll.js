import { inventoryConfig as config } from "./config.js";
import { findParts, readSlot } from "./dom.js";

export function createInventoryScroll(root) {
  let current = null, scope = null, layout = null;
  let top = 0, anchor = null;
  let discardAnchor = false;
  const slots = grid => [...grid.querySelectorAll(config.selectors.slot)];
  const capture = () => {
    if (!current?.body || !current.grid.isConnected || findParts(root).grid !== current.grid) return;
    top = current.body.scrollTop;
    anchor = null;
    if (!top) return;
    const viewport = current.body.getBoundingClientRect();
    if (!viewport.height) return;
    const nodes = slots(current.grid);
    const first = nodes.find(node => {
      const box = node.getBoundingClientRect();
      return box.bottom > viewport.top && box.top < viewport.bottom;
    });
    if (!first) return;
    const key = readSlot(first).key;
    // Item names are not IDs: ambiguous matches must fall back to the pixel offset.
    if (nodes.filter(node => readSlot(node).key === key).length === 1) {
      anchor = { key, offset: first.getBoundingClientRect().top - viewport.top };
    }
  };
  const onScroll = event => {
    // A native body rebuild can emit scroll before the central RAF reconciles it.
    if (event.target === current?.body) capture();
  };
  root.addEventListener("scroll", onScroll, true);
  return {
    begin(next, nextScope, nextLayout) {
      capture();
      if (scope !== nextScope) { top = 0; anchor = null; }
      else if (layout !== nextLayout || discardAnchor) anchor = null;
      discardAnchor = false;
      scope = nextScope; layout = nextLayout;
      current = next;
    },
    restore() {
      if (!current?.body) return;
      let target = top;
      if (anchor) {
        const matches = slots(current.grid).filter(node => readSlot(node).key === anchor.key);
        if (matches.length === 1) target = current.body.scrollTop + matches[0].getBoundingClientRect().top - current.body.getBoundingClientRect().top - anchor.offset;
      }
      if (current.body.scrollTop !== target) current.body.scrollTop = target;
      capture();
    },
    forgetAnchor() { discardAnchor = true; },
    cleanup() { root.removeEventListener("scroll", onScroll, true); },
  };
}
