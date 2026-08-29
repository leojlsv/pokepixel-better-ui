import { exampleConfig } from "./config.js";
import { mountExample } from "./controller.js";

export const exampleModule = Object.freeze({
  id: "example",

  shouldMount() {
    return exampleConfig.enabled;
  },

  mount() {
    return mountExample();
  },
});
