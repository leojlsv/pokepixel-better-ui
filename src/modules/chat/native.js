import { chatConfig as config } from "./config.js";

const fixedChannels = new Set(config.channels);

function messageChannel(message) {
  if (!message) return null;
  const raw = String(message.channel || "world").trim().toLowerCase();
  const channel = raw === "global" ? "world" : raw === "guilda" ? "guild" : raw;
  if (message.system_kind || (!message.trainer_id && channel === "world")) return "system";
  if (channel === "private") return null;
  return fixedChannels.has(channel) ? channel : "world";
}

export function createNativeChatNotificationGate(root, preference) {
  let binding = null;
  const closed = key => fixedChannels.has(String(key || "")) && preference.get().includes(String(key));

  function zeroClosedUnread(chat) {
    if (!chat?._unread) return false;
    let changed = false;
    for (const key of preference.get()) {
      if (!fixedChannels.has(key) || !Object.prototype.hasOwnProperty.call(chat._unread, key)) continue;
      if (Number(chat._unread[key]) !== 0) {
        chat._unread[key] = 0;
        changed = true;
      }
    }
    return changed;
  }

  function restore() {
    if (!binding) return;
    for (const entry of binding.methods) {
      if (binding.chat[entry.name] !== entry.wrapper) continue;
      if (entry.own) Object.defineProperty(binding.chat, entry.name, entry.own);
      else delete binding.chat[entry.name];
    }
    binding = null;
  }

  function install(chat) {
    const methods = [];
    const patch = (name, wrap) => {
      const original = chat?.[name];
      if (typeof original !== "function") return;
      const own = Object.getOwnPropertyDescriptor(chat, name);
      const wrapper = wrap(original);
      try { chat[name] = wrapper; } catch { return; }
      if (chat[name] === wrapper) methods.push({ name, own, wrapper });
    };
    patch("updateUnreadBadge", original => function (key, ...args) {
      if (closed(key) && this?._unread) this._unread[key] = 0;
      return original.call(this, key, ...args);
    });
    patch("updateCollapsedUnreadBadge", original => function (...args) {
      zeroClosedUnread(this);
      return original.apply(this, args);
    });
    patch("showSpeech", original => function (message, ...args) {
      const key = messageChannel(message);
      if (key && closed(key)) return;
      return original.call(this, message, ...args);
    });
    binding = { chat, methods };
  }

  function resolve() {
    const chat = root.ownerDocument.defaultView?.PokeIdle?.PersistentHud?._chat;
    return chat?.el === root ? chat : null;
  }

  function sync() {
    const chat = resolve();
    const available = ["updateUnreadBadge", "updateCollapsedUnreadBadge", "showSpeech"]
      .filter(name => typeof chat?.[name] === "function");
    const intact = binding?.chat === chat && binding.methods.length === available.length &&
      binding.methods.every(entry => chat?.[entry.name] === entry.wrapper);
    if (!intact) {
      restore();
      if (chat) install(chat);
    }
    if (!chat) return;
    if (zeroClosedUnread(chat) && typeof chat.updateCollapsedUnreadBadge === "function") chat.updateCollapsedUnreadBadge();
  }

  sync();
  return { sync, cleanup: restore };
}
