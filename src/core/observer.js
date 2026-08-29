export function createDomObserver(onChange) {
  let scheduled = false;

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
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
      });
    },

    stop() {
      observer.disconnect();
      scheduled = false;
    },
  };
}
