const customPokeballBalls = Object.freeze([
  Object.freeze({ id: "basic", label: "Poké Ball", nativeClass: "capture-ball--basic", defaults: Object.freeze({ enabled: false, primary: "#e0483a", secondary: "#f4f4f4", center: "#f4f4f4" }) }),
  Object.freeze({ id: "great", label: "Great Ball", nativeClass: "capture-ball--great", defaults: Object.freeze({ enabled: false, primary: "#4299ef", secondary: "#f4f4f4", center: "#ed4b4b" }) }),
  Object.freeze({ id: "super", label: "Super Ball", nativeClass: "capture-ball--super", defaults: Object.freeze({ enabled: false, primary: "#ffb340", secondary: "#f4f4f4", center: "#f08a27" }) }),
  Object.freeze({ id: "ultra", label: "Ultra Ball", nativeClass: "capture-ball--ultra", defaults: Object.freeze({ enabled: false, primary: "#20252b", secondary: "#f4f4f4", center: "#f0d13a" }) }),
  Object.freeze({ id: "pixel", label: "Pixel Ball", nativeClass: "capture-ball--pixel", defaults: Object.freeze({ enabled: false, primary: "#247be3", secondary: "#f3f6f8", center: "#f1d536" }) }),
  // The native renderer currently maps Master Ball to its `basic` shell. Better UI
  // adds a presentation-only marker so it can still receive its own local palette.
  Object.freeze({ id: "master", label: "Master Ball", nativeClass: null, defaults: Object.freeze({ enabled: false, primary: "#e0483a", secondary: "#f4f4f4", center: "#f4f4f4" }) }),
]);

export const customPokeballConfig = Object.freeze({
  id: "custom-pokeball",
  storageKey: "ppbui:custom-pokeball:v2",
  legacyStorageKey: "ppbui:custom-pokeball:v1",
  selectors: Object.freeze({ toolbar: ".pokeidle-top-toolbar" }),
  balls: customPokeballBalls,
});
