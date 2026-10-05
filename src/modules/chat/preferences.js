import { chatConfig as config } from "./config.js";
const clean = values => Array.isArray(values) ? [...new Set(values.filter(value => config.channels.includes(value)))] : [];
export function createChatPreferences(storage = () => window.localStorage) {
  let hidden = [], saved = true;
  try { hidden = clean(JSON.parse(storage().getItem(config.key))); } catch { saved = false; }
  return {
    get: () => [...hidden],
    saved: () => saved,
    set(values) {
      hidden = clean(values);
      try { storage().setItem(config.key, JSON.stringify(hidden)); saved = true; } catch { saved = false; }
    },
  };
}
