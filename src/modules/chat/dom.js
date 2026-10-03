import { chatConfig as config } from "./config.js";
const locales = {
  pt: ["Chat", "Fechar e restaurar abas do chat", "Fechar e silenciar", "Restaurar canais", "Manter um canal visível", "Preferência válida apenas nesta sessão"],
  en: ["Chat", "Close and restore chat tabs", "Close and mute", "Restore channels", "Keep one channel visible", "Preference applies only to this session"],
  es: ["Chat", "Cerrar y restaurar pestañas del chat", "Cerrar y silenciar", "Restaurar canales", "Mantener un canal visible", "Preferencia válida solo en esta sesión"],
  zh: ["聊天", "关闭和恢复聊天标签", "关闭并静音", "恢复频道", "保留一个可见频道", "偏好仅在本次会话有效"],
};
export function chatText(doc = document) {
  const [name, description, hide, restore, last, session] = locales[doc.documentElement.lang.split("-")[0]] || locales.pt;
  return { name, description, hide, restore, last, session };
}
export const findChat = () => document.querySelector(config.root);
export const findTabBar = root => [...root.querySelectorAll(config.tabs)].find(node => !node.classList.contains("ppbui-chat-actions"));
export const findCollapse = bar => [...bar.querySelectorAll(config.collapse)].find(node => !node.classList.contains("ppbui-chat-add"));
export const selectedTab = bar => [...bar.querySelectorAll(config.tab)].find(tab => active(tab) && available(tab));
export const fixedTabs = bar => [...bar.querySelectorAll(config.tab)].filter(tab =>
  tab.tagName === "DIV" && !tab.classList.contains("is-private") && config.channels.includes(tab.dataset.channel));
export const available = tab => !tab.hidden && tab.getAttribute("aria-hidden") !== "true" && tab.getAttribute("aria-disabled") !== "true";
export const label = tab => tab.querySelector(config.label)?.textContent.trim() || tab.dataset.channel;
export const active = tab => tab.classList.contains("is-active");
export function isHorizontalScrollbarPointer(bar, event) {
  if (event.target !== bar || bar.scrollWidth <= bar.clientWidth) return false;
  const rect = bar.getBoundingClientRect();
  const style = bar.ownerDocument.defaultView.getComputedStyle(bar);
  const borders = (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
  const gutter = bar.offsetHeight - bar.clientHeight - borders;
  // Overlay scrollbars occupy the bottom of the client area instead of reserving a gutter.
  const top = gutter > 0 ? rect.top + bar.clientTop + bar.clientHeight : rect.bottom - bar.clientTop - 12;
  return event.clientY >= top && event.clientY < rect.bottom && event.clientX >= rect.left && event.clientX < rect.right;
}
