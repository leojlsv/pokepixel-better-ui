export function createDomObserver(onChange) {
  let frameId = null;

  const schedule = () => {
    if (frameId !== null) return;

    frameId = requestAnimationFrame(() => {
      frameId = null;
      onChange();
    });
  };

  const observer = new MutationObserver(schedule);

  return {
    start(root = document.body) {
      if (!root) return;
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["hidden", "disabled", "aria-hidden", "aria-disabled", "lang"],
      });
      if (document.documentElement) observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    },

    stop() {
      observer.disconnect();
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
    },
  };
}
