import { fixedTabs, available, active, label, chatText, selectedTab } from "./dom.js";
import { createChatLayout } from "./layout.js";

const hiddenAttribute = "data-ppbui-chat-hidden";
export function mountChat(root, bar, preference) {
  const doc = root.ownerDocument;
  const records = new Map();
  const style = doc.createElement("style");
  style.dataset.ppbuiModule = "chat";
  style.textContent = `
    .pokeidle-persistent-chat [data-ppbui-chat-hidden] { display:none!important; }
    .pokeidle-persistent-chat.is-collapsed [data-ppbui-module="chat"] { display:none!important; }
    .ppbui-chat-menu { bottom:auto; margin-bottom:0; box-sizing:border-box; }
    .ppbui-chat-add { margin-left:0; }
    .ppbui-chat-header { display:flex; flex:0 0 auto; min-width:0; }
    .ppbui-chat-header > .ppbui-chat-tabs { flex:1 1 auto; min-width:0; }
    .ppbui-chat-header > .ppbui-chat-actions { flex:0 0 auto; padding-left:0; overflow:visible; }
    .pokeidle-persistent-chat.is-collapsed .ppbui-chat-header { display:contents; }
    .pokeidle-persistent-chat.is-collapsed .ppbui-chat-tabs { display:none!important; }
  `;
  const add = doc.createElement("button");
  add.type = "button";
  add.className = "pokeidle-persistent-chat__collapse ppbui-chat-add";
  add.dataset.ppbuiModule = "chat";
  add.textContent = "+";
  add.setAttribute("aria-haspopup", "menu");
  add.setAttribute("aria-expanded", "false");
  const menu = doc.createElement("div");
  menu.className = "pokeidle-chat-canned-dropdown ppbui-chat-menu";
  menu.dataset.ppbuiModule = "chat";
  menu.setAttribute("role", "menu");
  menu.hidden = true;
  root.append(style, menu);
  const layout = createChatLayout(root, bar, add);

  function close(focus = false) {
    if (!menu.hidden) { menu.hidden = true; add.setAttribute("aria-expanded", "false"); }
    if (focus) add.focus();
  }
  function sync() {
    layout.sync();
    const text = chatText(doc);
    const tabs = fixedTabs(bar), usable = tabs.filter(available);
    const hidden = new Set(preference.get());
    // An externally selected channel stays visible; reconciliation never switches native channels.
    const visible = usable.filter(tab => !hidden.has(tab.dataset.channel) || active(tab));
    if (!visible.length && usable.length) visible.push(usable[0]);
    for (const [tab, record] of records) if (!tabs.includes(tab)) {
      tab.removeAttribute(hiddenAttribute); record.close.remove(); record.option.remove(); records.delete(tab);
    }
    for (const tab of tabs) {
      if (!records.has(tab)) {
        const button = doc.createElement("button");
        button.type = "button";
        button.className = "pokeidle-persistent-chat__tab-close";
        button.dataset.ppbuiModule = "chat";
        button.textContent = "×";
        button.addEventListener("pointerdown", event => event.stopPropagation());
        button.addEventListener("click", event => {
          event.preventDefault(); event.stopPropagation();
          const others = fixedTabs(bar).filter(other => other !== tab && available(other) && !other.hasAttribute(hiddenAttribute));
          if (!others.length) return;
          if (active(tab)) {
            others[0].click();
            if (active(tab) || !active(others[0])) return;
          }
          preference.set([...preference.get(), tab.dataset.channel]);
          sync(); (selectedTab(bar) || others[0]).focus();
        });
        const option = doc.createElement("button");
        option.type = "button";
        option.className = "pokeidle-chat-player-actions__button";
        option.setAttribute("role", "menuitem");
        option.tabIndex = -1;
        option.addEventListener("click", () => {
          preference.set(preference.get().filter(key => key !== tab.dataset.channel));
          close(); sync(); tab.focus();
        });
        records.set(tab, { close: button, option });
      }
      const record = records.get(tab);
      if (record.close.parentNode !== tab) tab.append(record.close);
      const hide = available(tab) && !visible.includes(tab);
      if (tab.hasAttribute(hiddenAttribute) !== hide) tab.toggleAttribute(hiddenAttribute, hide);
      const disabled = visible.length <= 1;
      if (record.close.disabled !== disabled) record.close.disabled = disabled;
      const title = disabled ? text.last : `${text.hide}: ${label(tab)}`;
      if (record.close.title !== title) { record.close.title = title; record.close.setAttribute("aria-label", title); }
      if (record.option.textContent !== label(tab)) record.option.textContent = label(tab);
      if (hide && record.option.parentNode !== menu) menu.append(record.option);
      else if (!hide && record.option.parentNode) record.option.remove();
    }
    const ordered = tabs.map(tab => records.get(tab).option).filter(option => option.parentNode === menu);
    ordered.forEach((option, index) => {
      if (menu.children[index] !== option) menu.insertBefore(option, menu.children[index] || null);
    });
    const title = text.restore + (preference.saved() ? "" : ` — ${text.session}`);
    if (add.title !== title) { add.title = title; add.setAttribute("aria-label", title); menu.setAttribute("aria-label", text.restore); }
    const disabled = !menu.childElementCount;
    if (add.disabled !== disabled) add.disabled = disabled;
    if (disabled || root.classList.contains("is-collapsed")) close();
  }
  function open() {
    sync();
    if (add.disabled) return;
    if (!menu.hidden) { close(); return; }
    const offset = Math.max(0, bar.getBoundingClientRect().bottom - root.getBoundingClientRect().top);
    menu.style.top = `${offset}px`;
    menu.style.maxHeight = `calc(100% - ${offset}px)`;
    menu.hidden = false; add.setAttribute("aria-expanded", "true");
    menu.firstElementChild?.focus();
  }
  function keydown(event) {
    if (menu.hidden) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); }
    else if (event.key === "Tab" && menu.contains(event.target)) {
      // Continue native tab navigation from the trigger, not the overlay at the end of the chat.
      close(true);
    }
    else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) && menu.contains(event.target)) {
      event.preventDefault(); event.stopPropagation();
      const options = [...menu.children], index = options.indexOf(doc.activeElement);
      options[event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length]?.focus();
    }
  }
  function outside(event) { if (!menu.contains(event.target) && !add.contains(event.target)) close(); }
  function stop(event) { event.stopPropagation(); }
  add.addEventListener("click", event => { event.stopPropagation(); open(); });
  add.addEventListener("pointerdown", stop);
  menu.addEventListener("pointerdown", stop);
  menu.addEventListener("click", stop);
  doc.addEventListener("pointerdown", outside, true);
  doc.addEventListener("keydown", keydown, true);
  root.addEventListener("click", sync);
  root.addEventListener("keydown", sync);
  sync();
  return {
    sync,
    cleanup() {
      doc.removeEventListener("pointerdown", outside, true);
      doc.removeEventListener("keydown", keydown, true);
      root.removeEventListener("click", sync);
      root.removeEventListener("keydown", sync);
      for (const [tab, record] of records) { tab.removeAttribute(hiddenAttribute); record.close.remove(); }
      records.clear(); add.remove(); menu.remove(); style.remove();
      layout.cleanup();
    },
  };
}
