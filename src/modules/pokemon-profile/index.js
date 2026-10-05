import { mountPokemonProfile } from "./controller.js";
import { pokemonProfileText } from "./dom.js";

export { pokemonProfileText } from "./dom.js";

export function createPokemonProfileModule({ teamPresetStore, movesetStore } = {}) {
  let mounted;
  return {
    id: "pokemon-profile",
    runsInCardMode: true,
    shouldMount: () => Boolean(document.body),
    getMountKey: () => document.body,
    mount() { mounted = mountPokemonProfile(document, { teamPresetStore, movesetStore }); return () => { mounted?.cleanup(); mounted = null; }; },
    reconcile: () => mounted?.sync(),
  };
}
