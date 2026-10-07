const WALLET_SELECTOR = ".pokeidle-team-hud__wallet";
const TEAM_SELECTOR = ".pokeidle-team-hud";

function runtimeWallet(root) {
  const wallet = root.ownerDocument.defaultView?.PokeIdle?.PersistentHud?._teamHud?._walletEl;
  return wallet?.matches?.(WALLET_SELECTOR) && wallet.isConnected ? wallet : null;
}

function siblingWallet(root) {
  const doc = root.ownerDocument;
  const runtimeTeam = doc.defaultView?.PokeIdle?.PersistentHud?._teamHud?.el;
  const teams = runtimeTeam?.matches?.(TEAM_SELECTOR) && runtimeTeam.isConnected
    ? [runtimeTeam]
    : [...doc.querySelectorAll(TEAM_SELECTOR)].filter(node => node.isConnected);
  if (teams.length !== 1) return null;
  const candidate = teams[0].nextElementSibling;
  return candidate?.matches?.(WALLET_SELECTOR) ? candidate : null;
}

export function createInventoryWallet(root, service = null) {
  const doc = root.ownerDocument;
  let wallet = null;
  let anchor = null;
  let originalParent = null;
  let originalNext = null;
  let marker = null;
  let lastTarget = null, lastBefore = null;

  const findWallet = () => runtimeWallet(root)
    || (wallet?.isConnected ? wallet : null)
    || siblingWallet(root);

  const remember = node => {
    wallet = node;
    originalParent = node.parentNode;
    originalNext = node.nextSibling;
    marker = node.getAttribute("data-ppbui-inventory-wallet");
    anchor = doc.createComment("ppbui-inventory-wallet");
    node.before(anchor);
  };

  const release = ({ restore = true, retire = false } = {}) => {
    if (!wallet) return;
    marker === null ? wallet.removeAttribute("data-ppbui-inventory-wallet") : wallet.setAttribute("data-ppbui-inventory-wallet", marker);
    if (retire) wallet.remove();
    // A detached Inventory ancestor may still own the live native node. An
    // explicitly removed Wallet has no such parent and must not be resurrected.
    else if (restore && (wallet.isConnected || root.contains(wallet))) {
      if (anchor?.isConnected) anchor.replaceWith(wallet);
      else {
        if (originalParent?.isConnected) originalParent.insertBefore(wallet, originalNext?.parentNode === originalParent ? originalNext : null);
        else {
          const teams = [...doc.querySelectorAll(TEAM_SELECTOR)].filter(node => node.isConnected);
          if (teams.length === 1) teams[0].after(wallet);
        }
      }
    }
    anchor?.remove();
    wallet = null;
    anchor = null;
    originalParent = null;
    originalNext = null;
    marker = null;
  };

  const sync = (target, before = null) => {
    lastTarget=target;lastBefore=before;
    if (service && !service.isBackpackEnabled()) { release();return; }
    const next = findWallet();
    if (!next) {
      if (wallet && !wallet.isConnected) release({ restore: false });
      return;
    }
    if (wallet && next !== wallet) release({ restore: false, retire: Boolean(runtimeWallet(root) === next) });
    if (!wallet) remember(next);
    if (!wallet.hasAttribute("data-ppbui-inventory-wallet")) wallet.dataset.ppbuiInventoryWallet = "";
    if (!target?.isConnected) return;
    const reference = before?.parentNode === target ? before : null;
    const placed = wallet.parentNode === target && (reference ? wallet.nextSibling === reference : wallet === target.lastElementChild);
    if (!placed) {
      const focused = wallet.contains(doc.activeElement) ? doc.activeElement : null;
      target.insertBefore(wallet, reference);
      if (focused?.isConnected && doc.activeElement !== focused) focused.focus({ preventScroll: true });
    }
  };

  const unsubscribe=service?.subscribe(()=>{if(lastTarget?.isConnected)sync(lastTarget,lastBefore);});
  return { sync, cleanup: () => {unsubscribe?.();release();} };
}
