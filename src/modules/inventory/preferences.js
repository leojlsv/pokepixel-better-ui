import { inventoryConfig as config } from "./config.js";
export function createInventoryOrder(storage = () => window.localStorage) {
  let mode = "original";
  let saved = true;
  try {
    const stored = storage().getItem(config.key);
    if (config.modes.includes(stored)) mode = stored;
  } catch { saved = false; }
  return {
    get: () => mode,
    saved: () => saved,
    set(value) {
      if (!config.modes.includes(value)) return;
      mode = value;
      try { storage().setItem(config.key, mode); saved = true; } catch { saved = false; }
    },
  };
}
