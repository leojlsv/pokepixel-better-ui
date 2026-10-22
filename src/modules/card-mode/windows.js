import { cardModeConfig as config } from "./config.js";
import { activeNativeMenu, activeNativeMenuForCurrent, canOpenNativeMenu, nativeMenuBlocked, nativeDialogAction } from "./native-menu-contracts.js";

// The native NonBlockingWindows plugin retains its own scenes and UIPanel nodes.
// Card Mode admits only exact active native windows; cached hidden panels stay hidden.
export function createCardModeWindows(win) {
  const doc = win.document;
  const marker = config.windows.marker;
  const owned = new Map();
  const reactive = () => win.PokeIdle?.ReactiveWindows;
  let inventoryIntent = null;
  let inventoryHover = null;
  let activeForm = null;
  const dialogBindings = new Map();
  const nativeTopClamps = new Map();
  const userPositionedNativePanels = new WeakSet();
  const nativeTopInsetProperty = "--ppbui-card-mode-window-top-inset";
  const FORM_INTENT_MS = 30000;
  const nativePortalBindings = new Map();
  // PokemonCardHost's pinned Map is private; its read-only isPinned(id) must
  // corroborate a unique shell changed by a verified user-initiated native open.
  const teamDetailsCards = new Map();
  let teamDetailsIntent = null;
  // An incompatible async native open cannot be given a Cards shell owner.
  // Retain a Game reentry fence until its genuine pin/portal has closed.
  let unsafeTeamDetailsFence = null;
  const nativeChildOwners = new Map();
  let nativeMenuIntent = null;
  let nativeHoverIntent = null;
  let pendingNativePrompt = null;
  let orphanedNativeChild = false;
  let disposed = false;
  const privateMinimizedButtons = new Map();
  const NATIVE_CHILD_INTENT_MS = 10000;
  const available = node => Boolean(node && !node.hidden && !node.inert &&
    !node.hasAttribute("inert") && node.getAttribute("aria-hidden") !== "true");
  // FriendsScene may display an unsolicited UIForm on the global Bus outside
  // any scene-owned handler. UIFormHelper exposes only isOpen(), not a handle
  // for the active global root, so we can safely fall back to Game, NEVER
  // grant this unowned modal a Cards marker.
  const nativeUIForms = () => {
    try { if (win.PokeIdle?.UIForm?.isOpen?.() !== true) return []; } catch { return []; }
    return [...doc.body.children].filter(node =>
      node.matches(".pokeidle-overlay") && available(node) &&
      node.firstElementChild?.matches(".pokeidle-form-box") &&
      available(node.firstElementChild) &&
      node.firstElementChild.querySelector(":scope > .pokeidle-form-title") &&
      node.firstElementChild.querySelector(":scope > .pokeidle-form-error"));
  };
  // PI.Dialog has no public isOpen()/owner handle, and Guild invites may open
  // one from a global Bus callback without ANY user gesture. Do not guess its
  // owner or admit it to Cards. The exact UIPanel.js openDialog() DOM grammar
  // provides a conservative *safety signal to reveal Game only*, not identity
  // or authority: foreign partial lookalikes remain hidden, even if adjacent
  // to a legitimate window. Check native Dialog API existence as well.
  const unadmittedNativeDialogs = () => {
    const api=win.PokeIdle?.Dialog;
    if (typeof api?.confirm !== "function" ||
        typeof api?.prompt !== "function" ||
        typeof api?.select !== "function") return [];
    return [...doc.body.children].filter(node => {
      if (!node.matches(".pokeidle-dialog-overlay") || !available(node) ||
          owned.get(node) === "inventory-dialog") return false;
      const box=node.firstElementChild;
      if (!box?.matches("section.pokeidle-dialog") || !available(box)) return false;
      const header=box.querySelector(":scope > header.pokeidle-dialog__header");
      const body=box.querySelector(":scope > div.pokeidle-dialog__body");
      const footer=box.querySelector(":scope > footer.pokeidle-dialog__actions");
      return Boolean(header?.querySelector(":scope > strong.pokeidle-dialog__title") &&
        header.querySelector(":scope > button.pokeidle-dialog__close") &&
        body && footer?.querySelector(":scope > button.rubinot-btn"));
    });
  };
  const hasAmbiguousPrivateNativePanel = () => Object.values(config.windows.nativeActionPanels).some(contract=>{
    if (!contract.openState) return false;
    const controller=win.PokeIdle?.[contract.controller];
    try { if(controller?.[contract.openState]?.()!==true)return false; }
    catch { return false; }
    return [...doc.body.children].filter(node=>node.matches(".pokeidle-panel-overlay") &&
      available(node) && node.firstElementChild?.matches(contract.panel) &&
      available(node.firstElementChild)).length>1;
  });
  // The host's ConnectionOverlay plugin constructs two singleton body roots
  // before PersistentHUD exists. Capture their exact generations ONCE on
  // module mount; a later lookalike/replacement never inherits visibility.
  const nativeSystemOwners = Object.entries(config.windows.nativeSystemPortals)
    .map(([name,selector]) => {
      const node = doc.querySelector(`body > ${selector}`);
      if (!node) return null;
      const spinner = node.querySelector(":scope > .pokeidle-spinner");
      const label = node.querySelector(":scope > .pokeidle-conn-text");
      return spinner && label ? {node,selector,spinner,label,kind:`native-system-${name}`} : null;
    }).filter(Boolean);
  const trustedSystemMarkers = new Map(nativeSystemOwners.map(({node,kind})=>[node,kind]));
  const restoreNativeTop = node => {
    const record=nativeTopClamps.get(node);
    if (!record) return;
    nativeTopClamps.delete(node);
    if (node.style.getPropertyValue("top") !== record.applied ||
        node.style.getPropertyPriority("top") !== "") {
      // A native pointer drag/resize overwrote the Better UI clamp. It is now
      // user-owned geometry; never reinstate the old startup coordinates.
      userPositionedNativePanels.add(node);
      return;
    }
    if (record.value) node.style.setProperty("top",record.value,record.priority);
    else node.style.removeProperty("top");
  };
  const syncNativeTop = native => {
    const node=native?.panel?.el;
    if (!node || userPositionedNativePanels.has(node)) return;
    const width=Number(win.innerWidth);
    const inset=Number.parseFloat(doc.documentElement.style.getPropertyValue(nativeTopInsetProperty)) || 0;
    if (!(width <= 640) || inset <= 0) {
      if (nativeTopClamps.has(node)) restoreNativeTop(node);
      return;
    }
    const prior=nativeTopClamps.get(node);
    if (prior && (node.style.getPropertyValue("top") !== prior.applied ||
        node.style.getPropertyPriority("top") !== "")) {
      restoreNativeTop(node);
      return;
    }
    // Native UIPanel.normalizeWhenStyled() must have completed its synchronous
    // geometry snapshot. Do not interfere with a still-transformed constructor.
    if (!prior && node.style.transform !== "none") return;
    const rect=node.getBoundingClientRect();
    if (!prior && (!Number.isFinite(rect.top) || rect.width <= 0 || rect.height <= 0)) return;
    const initialTop=prior ? prior.initialTop : rect.top;
    if (initialTop >= inset-1) {
      if (prior) restoreNativeTop(node);
      return;
    }
    const desired=`${Math.ceil(inset)}px`;
    if (!prior) nativeTopClamps.set(node,{
      value:node.style.getPropertyValue("top"),
      priority:node.style.getPropertyPriority("top"),
      initialTop,applied:desired,
    });
    else prior.applied=desired;
    if (node.style.getPropertyValue("top") !== desired) node.style.setProperty("top",desired);
  };

  const activeInventory = () => {
    const Inventory = win.Scene_Inventory;
    if (typeof Inventory !== "function") return null;
    let scene;
    try { scene = reactive()?.active?.(); } catch { return null; }
    if (!scene || scene.constructor !== Inventory) return null;
    const panel = scene._panel, overlay = panel?.overlay;
    if (!overlay || overlay.parentElement !== doc.body || !available(overlay) || !available(panel.el) ||
        panel.el?.parentElement !== overlay || panel.el?.matches?.(config.windows.inventoryPanel) !== true ||
        panel.body?.parentElement !== panel.el ||
        (typeof panel.isVisible === "function" && !panel.isVisible())) return null;
    return { scene, panel, overlay };
  };

  const inventoryBlocked = () => {
    const Trade = win.Scene_Trade, Inventory = win.Scene_Inventory;
    if (typeof Trade !== "function" || typeof Inventory !== "function") return false;
    try {
      const active = reactive()?.active?.();
      return Boolean(active instanceof Trade && active.constructor !== Inventory);
    } catch { return false; }
  };

  const activeNativeActionPanel = id => {
    const contract=config.windows.nativeActionPanels[id];
    if (!contract) return null;
    const controller=win.PokeIdle?.[contract.controller];
    let panel=null;
    if (contract.openState) {
      // AutoHelper and OfflineFarm expose isOpen() but retain their UIPanel
      // handle in a closure. Require controller state AND a single exact native
      // generation; selector similarity alone is never sufficient.
      try { if (controller?.[contract.openState]?.() !== true) return null; }
      catch { return null; }
      const matches=[...doc.body.children].filter(node=>
        node.matches(".pokeidle-panel-overlay") && available(node) &&
        node.firstElementChild?.matches(contract.panel) && available(node.firstElementChild) &&
        node.firstElementChild.querySelector(":scope > .pokeidle-panel__body"));
      if (matches.length!==1) return null;
      const overlay=matches[0],el=overlay.firstElementChild;
      panel={overlay,el,body:el.querySelector(":scope > .pokeidle-panel__body")};
    } else {
      let holder=controller;
      if (contract.getter) {
        try { holder=controller?.[contract.getter]?.(); } catch { return null; }
      }
      panel=holder?.[contract.handle];
    }
    const overlay=panel?.overlay;
    if (!controller || !panel || overlay?.parentElement !== doc.body ||
        panel.el?.parentElement !== overlay ||
        panel.body?.parentElement !== panel.el ||
        !panel.el.matches(contract.panel) || !available(overlay) || !available(panel.el) ||
        (typeof panel.isVisible === "function" && !panel.isVisible())) return null;
    return {id,panel,overlay};
  };
  // UIPanel.minimize() stores its Restore button in a closure-private handle
  // for AutoHelper and OfflineFarm. Bind only a unique button added to the
  // native dock by the exact owner's original Minimize control. The host may
  // try to focus it while Cards still hides the unmarked dock; browsers cannot
  // focus a display:none descendant, so activeElement is NOT owner evidence.
  const onPrivateNativeMinimize = event => {
    if (disposed || event.type!=="click" ||
        doc.documentElement.getAttribute("data-ppbui-card-mode")!=="cards") return;
    const control=event.target?.closest?.("button.pokeidle-panel__minimize");
    if (!control || !available(control) || control.disabled ||
        control.closest('[hidden],[inert],[aria-hidden="true"]')) return;
    const source=["auto-helper","offline-farm"].map(id=>activeNativeActionPanel(id))
      .find(candidate=>candidate?.panel.el.contains(control));
    if (!source) return;
    const focusWasInOwner=source.panel.el.contains(doc.activeElement);
    const dock=doc.body.querySelector(config.windows.minimizedDock);
    const before=new Set(dock?.children || []);
    win.setTimeout(()=>{
      if (disposed || !source.overlay.isConnected || !source.overlay.hidden ||
          !source.panel.el.contains(control)) return;
      const nextDock=doc.body.querySelector(config.windows.minimizedDock);
      const candidates=nextDock?.parentElement===doc.body
        ? [...nextDock.children].filter(button=>!before.has(button) &&
          button.matches("button.pokeidle-ui-button") && available(button) &&
          button.getAttribute("aria-label")) : [];
      if (candidates?.length!==1) return;
      privateMinimizedButtons.set(candidates[0],{
        id:source.id,overlay:source.overlay,el:source.panel.el,dock:nextDock,
      });
      if (doc.documentElement.getAttribute("data-ppbui-card-mode")==="cards") {
        sync(true);
        // UIPanel's focus() runs before Cards reveals its native restore dock.
        // Retarget focus only when the old Minimize owner had keyboard focus
        // and it is still stranded there/body; never steal focus moved by the
        // user to another visible native control during the deferred task.
        const current=doc.activeElement;
        if (focusWasInOwner && (current===doc.body || current===doc.documentElement ||
            source.panel.el.contains(current)) &&
            nextDock.getAttribute(marker)==="native-minimized")
          candidates[0].focus({preventScroll:true});
      }
    },0);
  };
  doc.addEventListener("click",onPrivateNativeMinimize,true);

  const canOpenInventory = () => {
    const Map = win.Scene_Map, Inventory = win.Scene_Inventory;
    if (typeof Inventory !== "function" || typeof reactive()?.active !== "function" ||
        typeof reactive()?.cached !== "function") return false;
    let active;
    try { active = reactive().active(); } catch { return false; }
    return Boolean(active || (typeof Map === "function" && win.SceneManager?._scene instanceof Map));
  };

  const nativeDialogs = () => [...doc.body.children].filter(node =>
    node.matches(config.windows.inventoryDialogs) ||
    (node.matches(".pokeidle-panel-overlay") && node.querySelector(config.windows.inventoryDittoPanel)));
  const nativePokemonCards = () => [...doc.body.children].filter(node =>
    node.matches(".pokemon-card--hover") ||
    (node.matches(".pokemon-card-shell") && node.querySelector(config.windows.inventoryPinnedCard)));
  const pinnedShells = () => [...doc.body.children].filter(node =>
    node.matches(".pokemon-card-shell") &&
    node.firstElementChild?.matches(".pokemon-card.pokemon-card--pinned,.pokemon-card.pokemon-card--sheet"));
  const pinnedHost = () => win.PokeIdle?.PokemonCardHost;
  const nativePinned = id => {
    try { return pinnedHost()?.isPinned?.(id) === true; } catch { return false; }
  };
  const fenceUnsafeTeamDetails = (intent, pending = null) => {
    const fence = {
      id:intent.id, before:intent.before,
      pending:Boolean(pending), refused:false, witness:null,
      wasPinned:intent.wasPinned, sawUnpinned:!intent.wasPinned,
      // Only previously proven ID-to-shell bindings may corroborate a raise.
      // A pinned member or similar-looking DOM shell alone is not a witness.
      provenPrior:new Map([...intent.before].filter(([shell]) =>
        teamDetailsCards.get(shell)?.id === intent.id &&
        teamDetailsCards.get(shell)?.child === shell.firstElementChild)
        .map(([shell]) => [shell,shell.firstElementChild])),
    };
    unsafeTeamDetailsFence = fence;
    if (pending) {
      // Resolve/reject is an ACK about the call, not DOM shell ownership.
      // Never admit its late shell to Cards without the synchronous proof.
      Promise.resolve(pending).then(
        value => {
          if (unsafeTeamDetailsFence !== fence || disposed) return;
          unsafeTeamDetailsBlocksCards();
          fence.pending=false;
          fence.refused=value === false;
          // Promise settlement does not mutate native DOM. Reconcile the
          // Game/Cards toggle's accessible status without polling or replay.
          win.dispatchEvent(new win.Event("ppbui:card-mode-native-team-details-fence-settled"));
        },
        () => {
          if (unsafeTeamDetailsFence !== fence || disposed) return;
          unsafeTeamDetailsBlocksCards();
          fence.pending=false;
          fence.refused=true;
          win.dispatchEvent(new win.Event("ppbui:card-mode-native-team-details-fence-settled"));
        },
      );
    }
  };
  const unsafeTeamDetailsBlocksCards = () => {
    const fence = unsafeTeamDetailsFence;
    if (!fence || disposed) return false;
    const pinned = nativePinned(fence.id);
    if (!pinned) fence.sawUnpinned=true;
    const shells = pinnedShells().filter(node => node.parentElement === doc.body &&
      available(node) && available(node.firstElementChild) &&
      node.firstElementChild.querySelector("button.pokemon-card__control.is-close"));
    const changed = shells.filter(node => !fence.before.has(node) ||
      node.style.zIndex !== fence.before.get(node));
    // A pre-existing pin and concurrent unrelated shells cannot prove a new
    // operation completed. Witness only the exact target ID together with a
    // single changed native generation. A prior pin needs an exact known raise
    // or an observed unpin followed by a fresh shell.
    if (!fence.witness && pinned && changed.length === 1) {
      const shell=changed[0], created=!fence.before.has(shell);
      const provenRaise=fence.provenPrior.get(shell) === shell.firstElementChild;
      if ((!fence.wasPinned && created) ||
          (fence.wasPinned && (provenRaise || (fence.sawUnpinned && created))))
        fence.witness={shell,child:shell.firstElementChild};
    }
    if (fence.pending) return true;
    if (fence.witness) {
      const {shell,child}=fence.witness;
      if (pinned || (shell.isConnected && shell.firstElementChild === child &&
          available(shell) && available(child))) return true;
      unsafeTeamDetailsFence=null;
      return false;
    }
    if (fence.refused && !pinned) { unsafeTeamDetailsFence=null; return false; }
    // A void/unknown host gave no synchronous proof nor completion signal.
    // No timeout or unrelated shell can prove it will not paint a card later.
    return true;
  };
  // Native close buttons can detach their shell before the central observer's
  // coalesced frame. Observe this exact click before the host's own Close handler
  // removes the node; no second MutationObserver and no native event replay.
  const onUnsafeTeamDetailsClose = event => {
    if (!unsafeTeamDetailsFence) return;
    const close = event.target?.closest?.("button.pokemon-card__control.is-close");
    if (close?.closest?.(".pokemon-card-shell")?.parentElement === doc.body)
      unsafeTeamDetailsBlocksCards();
  };
  doc.addEventListener("click",onUnsafeTeamDetailsClose,true);
  const onUnsafeTeamDetailsEscape = event => {
    if (unsafeTeamDetailsFence && event.key === "Escape")
      unsafeTeamDetailsBlocksCards();
  };
  doc.addEventListener("keydown",onUnsafeTeamDetailsEscape,true);
  const completeTeamDetails = intent => {
    if (!intent || teamDetailsIntent !== intent || disposed) return "no-op";
    teamDetailsIntent = null;
    doc.documentElement.removeAttribute("data-ppbui-card-mode-team-details-opening");
    const shells = pinnedShells().filter(node => node.parentElement === doc.body &&
      available(node) && available(node.firstElementChild) &&
      node.firstElementChild.querySelector("button.pokemon-card__control.is-close"));
    const created = shells.filter(node => !intent.before.has(node));
    const raised = shells.filter(node => intent.before.has(node) &&
      node.style.zIndex !== intent.before.get(node));
    const hostPinned = nativePinned(intent.id);
    const failClosed = () => {
      fenceUnsafeTeamDetails(intent);
      win.dispatchEvent(new win.Event("ppbui:card-mode-unsafe-native-team-details"));
    };
    const active = activeNativeMenuForCurrent(win);
    const runtime = win.PokeIdle?.PersistentHud?._teamHud;
    const cardsRosterOwner = intent.source === "card-team-roster" &&
      doc.documentElement.getAttribute("data-ppbui-card-mode") === "cards" &&
      Array.isArray(runtime?._creatures) &&
      runtime._creatures.some(creature => creature === intent.creature &&
        String(creature?.id ?? "") === intent.id);
    const teamSceneOwner = intent.source !== "card-team-roster" &&
      active?.id === "team" && active.scene === intent.scene &&
      String(active.scene._selectedId ?? "") === intent.id;
    if ((!cardsRosterOwner && !teamSceneOwner) || !hostPinned) {
      // A native action may synchronously open a card and then refresh/close
      // Team or move its selected member. That card still owns Escape. Never
      // leave it invisible in Cards merely because the source scene changed.
      if (hostPinned || created.length || raised.length) {
        failClosed();
        return "unsafe";
      }
      return "no-op";
    }
    // Opening a new card adds one shell. Reopening a pinned card raises one
    // existing shell. Neither proximity nor an arbitrary matching class is an
    // ownership signal: ambiguity stays unadmitted.
    const candidates = intent.wasPinned ? (created.length ? [] : raised) :
      (raised.length ? [] : created);
    if (candidates.length !== 1) {
      failClosed();
      return "unsafe";
    }
    const shell = candidates[0], old = teamDetailsCards.get(shell);
    if (shell.hasAttribute(marker) && owned.get(shell) !== "native-team-details") {
      failClosed();
      return "unsafe";
    }
    if (old && old.id !== intent.id) {
      failClosed();
      return "unsafe";
    }
    nativePortalBindings.delete(shell);
    teamDetailsCards.set(shell,{id:intent.id,child:shell.firstElementChild});
    sync(true);
    if(shell.getAttribute(marker)!=="native-team-details"){
      failClosed();
      return "unsafe";
    }
    return "admitted";
  };
  const onTeamDetailsBubble = event => {
    const intent = teamDetailsIntent;
    if (intent && event.target?.closest?.("button") === intent.button)
      completeTeamDetails(intent);
  };
  doc.addEventListener("click",onTeamDetailsBubble);
  const openCardTeamDetails = id => {
    if (disposed || teamDetailsIntent ||
        doc.documentElement.getAttribute("data-ppbui-card-mode") !== "cards") return false;
    const pi = win.PokeIdle, runtime = pi?.PersistentHud?._teamHud;
    const member = runtime?._creatures?.find?.(creature => String(creature?.id ?? "") === String(id));
    if (!member || typeof pi?.PokemonCard?.open !== "function" ||
        typeof pinnedHost()?.isPinned !== "function") return false;
    const intent = {
      source:"card-team-roster", id:String(id), creature:member,
      before:new Map(pinnedShells().map(node=>[node,node.style.zIndex])),
      wasPinned:nativePinned(String(id)),
    };
    teamDetailsIntent = intent;
    doc.documentElement.setAttribute("data-ppbui-card-mode-team-details-opening","");
    let opened;
    try {
      // A deliberate context-menu action calls the SAME native API used by
      // Team's Details button, once. It does not replay or synthesize clicks.
      opened = pi.PokemonCard.open(member);
    } catch {
      if (completeTeamDetails(intent) !== "no-op") return true;
      // A native throw may still have queued an asynchronous DOM side effect.
      fenceUnsafeTeamDetails(intent);
      win.dispatchEvent(new win.Event("ppbui:card-mode-unsafe-native-team-details"));
      return true;
    }
    if(opened && typeof opened.then === "function"){
      // A future/async host can paint its native card AFTER this gesture.
      // We cannot attribute that late portal to a shell synchronously, so
      // reveal Game immediately rather than hiding its Escape/Close controls.
      fenceUnsafeTeamDetails(intent,opened);
      teamDetailsIntent = null;
      doc.documentElement.removeAttribute("data-ppbui-card-mode-team-details-opening");
      win.dispatchEvent(new win.Event("ppbui:card-mode-unsafe-native-team-details"));
      return true;
    }
    const result = completeTeamDetails(intent);
    if (result !== "no-op") return true;
    if(opened !== false){
      // No synchronous proof, and the host did not explicitly refuse. Fail
      // closed for void-returning hosts that may open asynchronously.
      fenceUnsafeTeamDetails(intent);
      win.dispatchEvent(new win.Event("ppbui:card-mode-unsafe-native-team-details"));
      return true;
    }
    return false;
  };
  const nativeDittoPortals = () => [...doc.body.children].filter(node =>
    node.matches(".pokeidle-panel-overlay") && available(node) &&
    node.firstElementChild?.matches(config.windows.nativeChildren.dittoPicker) &&
    available(node.firstElementChild));
  const onInventoryAction = event => {
    if (doc.documentElement.getAttribute("data-ppbui-card-mode") !== "cards") return;
    const inventory = activeInventory();
    const fromInventory = inventory?.overlay.contains(event.target);
    const ownedDialog = [...owned].some(([node,kind]) => kind === "inventory-dialog" &&
      node.isConnected && node.contains(event.target));
    if (!inventory || (!fromInventory && !ownedDialog)) {
      if (event.type === "click" || event.type === "keydown") inventoryIntent = null;
      return;
    }
    if (["pointerover", "contextmenu", "pointerdown", "touchstart"].includes(event.type)) {
      if (!fromInventory) return;
      inventoryHover = {
        overlay: inventory.overlay, time: Date.now(), existing: new Set(nativePokemonCards()),
      };
      return;
    }
    if (event.type === "focusin") {
      if (event.target.closest?.(".inventory-slot--pokemon")) {
        // Native PokemonCardHost paints the shared hover card during focus,
        // before focusin reaches this capture listener.
        inventoryHover = {overlay:inventory.overlay,time:Date.now(),
          existing:new Set(nativePokemonCards().filter(node=>node.hidden || !node.matches(".pokemon-card--hover")))};
      }
      return;
    }
    if (event.type === "keydown" &&
        !["Enter", " ", "Spacebar", "Delete", "Backspace"].includes(event.key)) return;
    if (event.type === "click" && (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)) return;
    const fromSlot = event.target.closest?.(".inventory-slot");
    if (!fromSlot && !ownedDialog) return;
    inventoryIntent = {
      overlay: inventory.overlay, time: Date.now(), existing: new Set(nativeDialogs()),
      formHandle: inventory.scene._formHandle,
      scene: inventory.scene,
    };
  };
  doc.addEventListener("click", onInventoryAction, true);
  doc.addEventListener("keydown", onInventoryAction, true);
  doc.addEventListener("pointerover", onInventoryAction, true);
  doc.addEventListener("contextmenu", onInventoryAction, true);
  doc.addEventListener("pointerdown", onInventoryAction, true);
  doc.addEventListener("touchstart", onInventoryAction, true);
  doc.addEventListener("focusin", onInventoryAction, true);

  const onNativeMenuAction = event => {
    if (doc.documentElement.getAttribute("data-ppbui-card-mode") !== "cards") return;
    const native = activeNativeMenuForCurrent(win);
    if (!native) {
      if (event.type === "click" || event.type === "keydown") nativeMenuIntent = null;
      return;
    }
    const fromNative = native.overlay.contains(event.target);
    const fromChild = [...nativePortalBindings].some(([node,binding]) =>
      binding.scene === native.scene && node.contains(event.target));
    const picker = native.id === "team" ? native.scene._equipPicker : null;
    const fromPicker = picker?.overlay?.contains?.(event.target);
    if (!fromNative && !fromChild && !fromPicker) {
      if (event.type === "click" || event.type === "keydown") nativeMenuIntent = null;
      return;
    }
    if (event.type === "pointerover" || event.type === "pointerdown" || event.type === "focusin") {
      const hoverTarget = event.target.closest?.(
        `.team-slot,.team-equip-card,.pokecentro-transfer-slot,${config.windows.nativeChildren.professionsHoverTarget},.shared-stones__pokemon,.shared-stones__ritual-slot,[data-listing-id],[data-creature-id]`);
      if (["team","storage","professions","shared-stones","market"].includes(native.id) && hoverTarget && (fromNative || fromPicker) &&
          (native.id !== "professions" || hoverTarget.matches(config.windows.nativeChildren.professionsHoverTarget))) {
        nativeHoverIntent = {
          scene:native.scene,time:Date.now(),
          // PokemonCardHost may paint its shared hover on focus BEFORE the
          // document's focusin capture listener. Do not classify that freshly
          // visible hover as an old portal (same ordering as native Inventory).
          existing:new Set(nativePokemonCards().filter(node =>
            event.type === "focusin"
              ? node.hidden || !node.matches(".pokemon-card--hover")
              : !node.hidden)),
        };
      }
      if (event.type !== "pointerdown") return;
    }
    if (event.type === "keydown" && !["Enter"," ","Spacebar"].includes(event.key)) return;
    if (event.type === "click" && (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)) return;
    if (event.type !== "click" && event.type !== "keydown") return;
    const actionable = event.target.closest?.('button,[role="button"],input[type="submit"],input[type="button"]');
    if (!actionable || actionable.disabled || actionable.getAttribute("aria-disabled") === "true") return;
    if (event.type === "click" && native.id === "team" && fromNative &&
        actionable.matches(".team-actions > button.pokeidle-btn:nth-last-child(2)") &&
        actionable.parentElement?.parentElement === native.panel.body &&
        typeof pinnedHost()?.isPinned === "function") {
      const id = String(native.scene._selectedId ?? "");
      const selected = native.scene._creatures?.find(item => String(item?.id ?? "") === id);
      if (id && selected) {
        const intent = {scene:native.scene,id,button:actionable,
          before:new Map(pinnedShells().map(node=>[node,node.style.zIndex])),
          wasPinned:nativePinned(id)};
        teamDetailsIntent = intent;
        doc.documentElement.setAttribute("data-ppbui-card-mode-team-details-opening","");
        // The original native listener runs on the target, before document
        // bubble; one next-task fallback also clears hints on stopped bubbles.
        win.setTimeout(()=>completeTeamDetails(intent),0);
      }
    }
    nativeMenuIntent = {
      scene:native.scene, time:Date.now(),
      panels:new Set([...doc.body.children].filter(node => node.matches(".pokeidle-panel-overlay"))),
      source:actionable,
      childClaimed:false,
    };
  };
  for (const type of ["click","keydown","pointerover","pointerdown","focusin"])
    doc.addEventListener(type, onNativeMenuAction, true);

  const sync = (cardsActive) => {
    if (unsafeTeamDetailsFence) unsafeTeamDetailsBlocksCards();
    // cloneNode(true) copies presentation markers too. A later identical DOM
    // shell still lacks the exact native singleton identity: scrub only this
    // new, Better UI-owned marker family before considering authorization.
    for(const node of doc.body.querySelectorAll(`:scope > [${marker}^="native-system-"]`)){
      if(trustedSystemMarkers.get(node) !== node.getAttribute(marker)) node.removeAttribute(marker);
    }
    const allowed = new Map();
    // Multiple independent native UIPanels can be visible simultaneously:
    // EventTicker may open while Team/another Scene_MenuBase remains active.
    // Each verified owner needs its own mobile top-safe-area reconciliation.
    const nativePanelsForClamp = [];
    orphanedNativeChild = false;
    if (cardsActive) {
      // Loading.show() and live connection status are globally owned by the
      // game rather than any one UIPanel. Their existing native handlers,
      // display:none/flex and reconnect controls remain authoritative.
      for (const {node,selector,spinner,label,kind} of nativeSystemOwners) {
        if (node.parentElement === doc.body && node.matches(selector) &&
            available(node) && spinner.parentElement === node && label.parentElement === node)
          allowed.set(node,kind);
      }
      // CaptureAnalyticsScene exposes this exact native controller/root. It is
      // independent of the analyzer window and remains available on Scene_Map.
      const mini = win.PokeIdle?.HuntAnalyzerMini;
      const miniRoot = mini?.root;
      if (mini?.enabled === true && miniRoot?.parentElement === doc.body &&
          miniRoot.matches(config.windows.nativeChildren.huntAnalyzerMini) && available(miniRoot) &&
          miniRoot.querySelector(":scope > .hunt-analyzer-mini__handle") === miniRoot.firstElementChild &&
          miniRoot.querySelector(":scope > .hunt-analyzer-mini__content") &&
          miniRoot.querySelector(":scope > .hunt-analyzer-mini__drawer-toggle") &&
          miniRoot.querySelector(":scope > .hunt-analyzer-mini__drawer"))
        allowed.set(miniRoot,"native-hunt-analyzer-mini");
      for(const id of Object.keys(config.windows.nativeActionPanels)){
        const action=activeNativeActionPanel(id);
        if (!action) continue;
        allowed.set(action.overlay,`native-action-${id}`);
        nativePanelsForClamp.push(action);
      }
      const inventory = activeInventory();
      if (activeForm && (!inventory || activeForm.scene !== inventory.scene ||
          inventory.scene._formHandle !== activeForm.handle ||
          activeForm.node.parentElement !== doc.body ||
          activeForm.node.querySelector(":scope > .pokeidle-form-box") !== activeForm.box)) {
        activeForm = null;
      }
      const profile = doc.body.querySelector(config.windows.profile);
      if (profile?.parentElement === doc.body && available(profile)) {
        for (const node of doc.body.children) {
          if (node.matches(".pokeidle-panel-overlay") && available(node) &&
              available(node.querySelector(config.windows.profileEditorPanel))) allowed.set(node, "profile-editor");
        }
      }
      for (const [node, kind] of owned) {
        if (kind === "profile-editor" && node.parentElement === doc.body && available(node) &&
            available(node.querySelector(config.windows.profileEditorPanel))) allowed.set(node, kind);
      }
      if (inventory) {
        allowed.set(inventory.overlay, "inventory");
        const newlyOpened = (intent, ageMs = 500) => intent?.overlay === inventory.overlay && Date.now() - intent.time <= ageMs;
        const nativeCards = new Set(nativePokemonCards());
        // UIForm.show() returns an opaque handle after appending its body portal. Bind the
        // unique newly created overlay to that exact handle once, then revoke on owner loss.
        const handle = inventory.scene._formHandle;
        if (!activeForm && handle && typeof handle.destroy === "function" &&
            inventoryIntent?.scene === inventory.scene &&
            inventoryIntent.overlay === inventory.overlay &&
            inventoryIntent.formHandle !== handle &&
            Date.now() - inventoryIntent.time <= FORM_INTENT_MS) {
          const candidates = [...doc.body.children].filter(node => node.matches(".pokeidle-overlay") &&
            available(node) && !inventoryIntent.existing.has(node) &&
            node.querySelector(":scope > .pokeidle-form-box"));
          if (candidates.length === 1) {
            const node = candidates[0];
            activeForm = {scene: inventory.scene, handle, node,
              box: node.querySelector(":scope > .pokeidle-form-box")};
            inventoryIntent = null;
          }
        }
        for (const node of doc.body.children) {
          if (!available(node)) continue;
          const inventoryDialog = node.matches(config.windows.inventoryDialogs) ||
            (node.matches(".pokeidle-panel-overlay") && node.querySelector(config.windows.inventoryDittoPanel));
          const exactForm = activeForm?.node === node && activeForm.scene === inventory.scene &&
            activeForm.handle === inventory.scene._formHandle && activeForm.box === node.querySelector(":scope > .pokeidle-form-box");
          const exactSheet = inventory.scene._itemSheet?.el === node;
          // Native PI.Dialog creates a fresh portal per action. Retain the original
          // generation so unrelated DOM repurposing cannot inherit visibility.
          const isNativeDialog = node.matches(".pokeidle-dialog-overlay");
          const boundDialog = dialogBindings.get(node);
          const sameDialog = isNativeDialog && boundDialog &&
            boundDialog.child === node.firstElementChild && boundDialog.html === node.innerHTML;
          const freshDialog = isNativeDialog && !boundDialog && !node.hasAttribute(marker) &&
            !inventoryIntent?.dialogClaimed && newlyOpened(inventoryIntent) &&
            !inventoryIntent.existing.has(node);
          if (freshDialog) {
            dialogBindings.set(node, {child:node.firstElementChild, html:node.innerHTML});
            inventoryIntent.dialogClaimed = true;
          }
          if (inventoryDialog && (
            (node.matches(".pokeidle-overlay") ? exactForm :
              isNativeDialog ? (sameDialog && owned.get(node) === "inventory-dialog") :
              owned.get(node) === "inventory-dialog") ||
            exactForm || exactSheet || freshDialog
          )) {
            allowed.set(node, "inventory-dialog");
          } else if (node === inventory.scene._tooltip && node.matches(config.windows.inventoryTooltip)) {
            allowed.set(node, "inventory-tooltip");
          } else if (nativeCards.has(node) && (
            owned.get(node) === "inventory-tooltip" ||
            (newlyOpened(inventoryHover) && !inventoryHover.existing.has(node))
          )) {
            allowed.set(node, "inventory-tooltip");
          }
        }
      } else {
        inventoryIntent = null;
        inventoryHover = null;
        activeForm = null;
      }
      const nativeMenu = activeNativeMenuForCurrent(win);
      // The native hover portal is shared globally across all Pokémon windows.
      // An unbound visible hover from a preceding scene must not be released by
      // our Team/Storage synchronous pre-measurement CSS on the next scene.
      if (nativeMenu && nativeHoverIntent?.scene !== nativeMenu.scene) {
        const stale = nativePokemonCards().filter(node =>
          node.matches(".pokemon-card--hover") && !node.hidden && node.parentElement === doc.body);
        if (stale.length) {
          try { win.PokeIdle?.PokemonCard?.hideHover?.(); } catch {}
          for (const node of stale) if (!node.hidden) node.hidden = true;
        }
      }
      // The shared native PokemonCard hover can outlive its originating scene.
      // Do not let the next admitted Team/Storage window's synchronous
      // measurement exemption accidentally reveal that stale hover.
      for (const [node,binding] of nativePortalBindings) {
        if (binding.scene === nativeMenu?.scene ||
            binding.root !== ".pokemon-card--hover" || node.hidden || !node.isConnected) continue;
        try { win.PokeIdle?.PokemonCard?.hideHover?.(); } catch {}
        if (!node.hidden) node.hidden = true;
      }
      if (nativeMenu) {
        allowed.set(nativeMenu.overlay, `native-${nativeMenu.id}`);
        nativePanelsForClamp.push(nativeMenu);
        // FriendsScene stores its detached popover in a native scene-owned
        // handle. It is neither a guessed PI.Dialog nor a recreated button.
        const actionMenu = nativeMenu.id === "friends" ? nativeMenu.scene._actionMenu : null;
        if (actionMenu?.parentElement === doc.body &&
            actionMenu.matches(config.windows.nativeChildren.friendsActionMenu) &&
            available(actionMenu) && actionMenu.querySelectorAll(":scope > button").length === 2)
          allowed.set(actionMenu,"native-child-friends-actions");
        // Native Team's picker is a separately constructed UIPanel, but its
        // exact handle remains on the active Scene_Team instance.
        const picker = nativeMenu.id === "team" ? nativeMenu.scene._equipPicker : null;
        if (picker?.overlay?.parentElement === doc.body &&
            picker.el?.parentElement === picker.overlay &&
            picker.el.matches(config.windows.nativeChildren.teamPicker) &&
            picker.body?.parentElement === picker.el &&
            available(picker.overlay) && available(picker.el) &&
            (typeof picker.isVisible !== "function" || picker.isVisible())) {
          allowed.set(picker.overlay, "native-child-team-picker");
        }
        // UIPanel.openSheet() owns a separate mobile root and native Escape /
        // focus trap. Keep it tied to the exact active Hunt scene controller.
        const sheet = nativeMenu.id === "hunts" ? nativeMenu.scene._zoneSheet : null;
        if (sheet?.el?.parentElement === doc.body &&
            sheet.sheet?.parentElement === sheet.el &&
            sheet.sheet.matches(config.windows.nativeChildren.huntZoneSheet) &&
            available(sheet.el) && available(sheet.sheet)) {
          allowed.set(sheet.el, "native-child-hunt-zone");
        }
        const huntTooltip = nativeMenu.id === "hunts" ? nativeMenu.scene._dropTooltip : null;
        if (huntTooltip?.parentElement === doc.body &&
            huntTooltip.matches(config.windows.nativeChildren.huntDropTooltip) &&
            available(huntTooltip)) allowed.set(huntTooltip, "native-tooltip-hunts");
        const sharedTooltip = nativeMenu.id === "shared-stones" ? nativeMenu.scene._tooltip : null;
        if (sharedTooltip?.parentElement === doc.body &&
            sharedTooltip.matches(config.windows.nativeChildren.sharedStoneTooltip) &&
            available(sharedTooltip)) allowed.set(sharedTooltip,"native-tooltip-shared-stones");
        const stoneSheet = nativeMenu.id === "shared-stones" ? nativeMenu.scene._itemSheet : null;
        if (stoneSheet?.el?.parentElement===doc.body &&
            stoneSheet.sheet?.parentElement===stoneSheet.el &&
            stoneSheet.sheet.matches(config.windows.nativeChildren.sharedStoneSheet) &&
            available(stoneSheet.el) && available(stoneSheet.sheet))
          allowed.set(stoneSheet.el,"native-child-shared-stones-sheet");
        const marketTooltip = nativeMenu.id === "market" ? nativeMenu.scene._assetTooltip : null;
        if (marketTooltip?.parentElement === doc.body &&
            marketTooltip.matches(config.windows.nativeChildren.marketAssetTooltip) &&
            available(marketTooltip)) allowed.set(marketTooltip,"native-tooltip-market");
        const marketSheet = nativeMenu.id === "market" ? nativeMenu.scene._listingSheet : null;
        if (marketSheet?.el?.parentElement === doc.body &&
            marketSheet.sheet?.parentElement === marketSheet.el &&
            marketSheet.sheet.matches(config.windows.nativeChildren.marketSheet) &&
            available(marketSheet.el) && available(marketSheet.sheet))
          allowed.set(marketSheet.el,"native-child-market-sheet");
        // Team's synchronously constructed private MovesetConfig panel uses a
        // bounded fresh portal intent. Ditto awaits a native API before its
        // panel exists and cannot prove ownership past that timeout, so its
        // exact native action goes to Game BEFORE native handler dispatch.
        const intent = nativeMenuIntent?.scene === nativeMenu.scene ? nativeMenuIntent : null;
        const age = intent ? Date.now()-intent.time : Infinity;
        if (nativeMenu.id === "team" && intent && !intent.childClaimed && age <= NATIVE_CHILD_INTENT_MS) {
          const candidates = [...doc.body.children].filter(node =>
            node.matches(".pokeidle-panel-overlay") && available(node) &&
            !intent.panels.has(node) && !nativePortalBindings.has(node) && !node.hasAttribute(marker) &&
            available(node.firstElementChild) &&
            node.firstElementChild.matches(config.windows.nativeChildren.teamMoveset));
          if (candidates.length === 1) {
            const node=candidates[0], panel=node.firstElementChild;
            nativePortalBindings.set(node,{scene:nativeMenu.scene,
              kind:"native-child-team-moveset",
              child:panel,root:".pokeidle-panel-overlay"});
            intent.childClaimed=true;
          }
        }
        if (nativeHoverIntent?.scene === nativeMenu.scene &&
            Date.now()-nativeHoverIntent.time <= 600) {
          for (const node of nativePokemonCards()) {
            if (!available(node) || nativeHoverIntent.existing.has(node) ||
                node.hasAttribute(marker) || nativePortalBindings.has(node) ||
                teamDetailsCards.has(node)) continue;
            nativePortalBindings.set(node,{scene:nativeMenu.scene,
              kind:"native-tooltip-"+nativeMenu.id,child:null,
              root:node.matches(".pokemon-card-shell") ? ".pokemon-card-shell" : ".pokemon-card--hover"});
          }
        }
        for (const [node,binding] of nativePortalBindings) {
          if (binding.scene !== nativeMenu.scene || node.parentElement !== doc.body ||
              !available(node) || !node.matches(binding.root) ||
              (binding.child && (node.firstElementChild !== binding.child || !available(binding.child)))) continue;
          allowed.set(node,binding.kind);
        }
      } else {
        nativeMenuIntent = nativeHoverIntent = null;
      }
      // The genuine pinned PokemonCard survives native Team scene changes.
      // Once bound by the original Team Details operation, retain only the
      // exact DOM generation while the host still reports that id as pinned.
      for (const [node,binding] of teamDetailsCards) {
        if (node.parentElement !== doc.body ||
            node.firstElementChild !== binding.child ||
            !node.matches(".pokemon-card-shell") ||
            !binding.child.matches(".pokemon-card.pokemon-card--pinned,.pokemon-card.pokemon-card--sheet") ||
            !available(node) || !available(binding.child) || !nativePinned(binding.id)) {
          teamDetailsCards.delete(node);
          continue;
        }
        allowed.set(node,"native-team-details");
      }
      // UIPanel.minimize() creates a shared dock while retaining a hidden scene.
      // Every restore button must resolve to an exact cached native Panel,
      // including Inventory: a stale lookalike is not an authorized owner.
      let cached;
      try { cached = reactive()?.cached?.(); } catch { cached = null; }
      const Inventory = win.Scene_Inventory;
      const dock = doc.body.querySelector(config.windows.minimizedDock);
      if (dock?.parentElement === doc.body && available(dock) &&
          dock.childElementCount > 0) {
        const supportedButtons = new Map();
        for (const scene of Array.isArray(cached) ? cached : []) {
          const panel = scene?._panel, button = panel?._minimizedButton;
          if (!button || button.parentElement !== dock || !available(button) ||
              panel.overlay?.parentElement !== doc.body ||
              panel.el?.parentElement !== panel.overlay ||
              panel.body?.parentElement !== panel.el ||
              !panel.overlay.hidden ||
              (typeof panel.isVisible === "function" && panel.isVisible())) continue;
          const isInventory = typeof Inventory === "function" &&
            scene.constructor === Inventory &&
            panel.el.matches(config.windows.inventoryPanel);
          const isNativeMenu = [...Object.values(config.windows.nativeMenus), ...Object.values(config.windows.nativeMenusWaveB), ...Object.values(config.windows.nativeMenusWaveB2), ...Object.values(config.windows.nativeMenusWaveB3)].some(contract =>
            scene.constructor === win[contract.scene] && panel.el.matches(contract.panel));
          if (isInventory || isNativeMenu)
            supportedButtons.set(button,isInventory ? "inventory" : "native");
        }
        for(const contract of Object.values(config.windows.nativeActionPanels)){
          const panel=win.PokeIdle?.[contract.controller]?.[contract.handle];
          const button=panel?._minimizedButton;
          if (!button || button.parentElement !== dock || !available(button) ||
              panel.overlay?.parentElement !== doc.body ||
              panel.el?.parentElement !== panel.overlay ||
              panel.body?.parentElement !== panel.el ||
              !panel.el.matches(contract.panel) || !panel.overlay.hidden ||
              (typeof panel.isVisible === "function" && panel.isVisible())) continue;
          supportedButtons.set(button,"native");
        }
        for(const [button,binding] of privateMinimizedButtons){
          const contract=config.windows.nativeActionPanels[binding.id];
          if (!contract?.openState || button.parentElement!==dock ||
              binding.dock!==dock || !available(button) ||
              binding.overlay?.parentElement!==doc.body || !binding.overlay.hidden ||
              binding.el?.parentElement!==binding.overlay || !binding.el.matches(contract.panel)) continue;
          try { if(win.PokeIdle?.[contract.controller]?.[contract.openState]?.()!==true)continue; }
          catch { continue; }
          supportedButtons.set(button,"native");
        }
        // Native UIPanel shares a single dock among all minimized windows.
        // Its exact button identities must all belong to verified cached scenes;
        // one unrelated owner prevents opening a mixed, unverified dock.
        if (supportedButtons.size === dock.childElementCount &&
            [...dock.children].every(button => supportedButtons.has(button))) {
          const inventoryOnly = dock.childElementCount === 1 &&
            supportedButtons.get(dock.firstElementChild) === "inventory";
          allowed.set(dock, inventoryOnly ? "inventory-minimized" : "native-minimized");
        }
      }
    }
    if (!cardsActive) {
      for (const node of nativeTopClamps.keys()) restoreNativeTop(node);
      inventoryIntent = null;
      inventoryHover = null;
      activeForm = null;
      nativeMenuIntent = nativeHoverIntent = null;
    }
    if (cardsActive) {
      // UIPanel tracks Escape by native isVisible(), not by computed CSS.
      // A separately owned child whose parent scene just disappeared would
      // otherwise consume Escape while its root is hidden by Cards. Fail back
      // to Game instead of leaving an inaccessible native modal alive.
      // Losing a portal's exact child generation while the SAME scene remains
      // active is different: fail closed without exposing a reused foreign node.
      const ownerScene = activeNativeMenuForCurrent(win)?.scene;
      for (const [node, kind] of owned) {
        if (allowed.get(node) === kind || !node.isConnected) continue;
        const oldScene = nativeChildOwners.get(node);
        if (!oldScene || oldScene === ownerScene) continue;
        // Independently owned native children have explicit closing APIs.
        // Close via those APIs when their scene leaves the stack; this preserves
        // Cards and prevents native key/focus handlers from surviving invisibly.
        try {
          if (kind === "native-child-team-picker" &&
              oldScene._equipPicker?.overlay === node &&
              typeof oldScene.closeEquipPicker === "function")
            oldScene.closeEquipPicker();
          else if (kind === "native-child-hunt-zone" &&
                   oldScene._zoneSheet?.el === node &&
                   typeof oldScene.closeZoneSheet === "function")
            oldScene.closeZoneSheet("parent-close");
          else if (kind === "native-child-friends-actions" &&
                   oldScene._actionMenu === node &&
                   typeof oldScene.closeActionMenu === "function")
            oldScene.closeActionMenu();
          else if (kind === "native-child-market-sheet" &&
                   oldScene._listingSheet?.el === node &&
                   typeof oldScene.closeListingSheet === "function")
            oldScene.closeListingSheet("parent-close");
          else if (kind === "native-child-shared-stones-sheet" &&
                   oldScene._itemSheet?.el === node &&
                   typeof oldScene._itemSheet.close === "function")
            oldScene._itemSheet.close("parent-close");
        } catch {}
      }
      // An async Ditto form has no public owner handle. Its exact native
      // constructor receives only a transient CSS geometry exemption; a form
      // arriving after manual Cards re-entry (possibly in a different scene)
      // must reveal Game, not remain an invisible focus/Escape consumer.
      // Inventory's previously approved exact-owned Ditto dialog is exempt.
      orphanedNativeChild = nativeDittoPortals().some(node => !allowed.has(node)) ||
        nativeUIForms().some(node => !allowed.has(node)) ||
        hasAmbiguousPrivateNativePanel() ||
        [...owned].some(([node,kind]) =>
        (kind.startsWith("native-child-") || kind.startsWith("native-dialog-")) &&
        allowed.get(node) !== kind && node.isConnected && available(node) &&
        nativeChildOwners.get(node) !== ownerScene);
    }
    // A copied marker is not a capability. cloneNode(true) reproduces dataset
    // but not the original native scene/controller/handle. Revoke all unowned
    // members of our reserved native-* marker family on the central sync.
    // Keep the exact originals present in allowed; the ordinary owned loop
    // below still releases previous generations deterministically.
    for (const node of doc.body.children) {
      const kind=node.getAttribute?.(marker);
      if (kind?.startsWith("native-") && allowed.get(node)!==kind)
        node.removeAttribute(marker);
    }
    const ownerScene = activeNativeMenuForCurrent(win)?.scene;
    for (const [node, kind] of allowed) {
      if ((kind.startsWith("native-child-") || kind.startsWith("native-dialog-")) && ownerScene)
        nativeChildOwners.set(node, ownerScene);
      if (owned.get(node) === kind) continue;
      if (owned.has(node)) {
        if (node.getAttribute(marker) === owned.get(node)) {
          node.setAttribute(marker, kind);
          owned.set(node, kind);
        }
        continue;
      }
      if (node.hasAttribute(marker)) continue;
      node.setAttribute(marker, kind);
      owned.set(node, kind);
    }
    // On scene re-admission, Card Mode's fail-closed CSS still hides the panel
    // until its exact marker is restored. Measure/clamp AFTER that assignment;
    // otherwise getBoundingClientRect() is 0x0 and the titlebar stays under
    // a top-docked toolbar until an unrelated second reconciliation.
    for (const native of nativePanelsForClamp) syncNativeTop(native);
    for (const node of nativeTopClamps.keys())
      if (!nativePanelsForClamp.some(native => native.panel.el === node)) restoreNativeTop(node);
    for (const [node, kind] of owned) {
      if (allowed.get(node) === kind) continue;
      if (node.getAttribute(marker) === kind) node.removeAttribute(marker);
      owned.delete(node);
      nativeChildOwners.delete(node);
    }
    for (const node of dialogBindings.keys()) if (allowed.get(node) !== "inventory-dialog" || !owned.has(node)) dialogBindings.delete(node);
    for (const [node,binding] of nativePortalBindings)
      if (allowed.get(node) !== binding.kind || !owned.has(node)) nativePortalBindings.delete(node);
    for(const [button,binding] of privateMinimizedButtons)
      if (!button.isConnected || !binding.overlay.isConnected || !binding.overlay.hidden)
        privateMinimizedButtons.delete(button);
    return Boolean(allowed.size);
  };

  return {
    activeInventory,
    canOpenInventory,
    inventoryBlocked,
    activeNativeMenu: id => activeNativeMenu(win, id),
    canOpenNativeMenu: id => canOpenNativeMenu(win, id),
    nativeMenuBlocked: id => nativeMenuBlocked(win, id),
    nativePortalRequiresGame(event) {
      const native = activeNativeMenuForCurrent(win);
      const offlineFarm=activeNativeActionPanel("offline-farm");
      const fromOfflineFarm=offlineFarm?.overlay.contains(event.target);
      const actionOwners=Object.keys(config.windows.nativeDialogTriggers).filter(id =>
        Object.hasOwn(config.windows.nativeActionPanels,id));
      const actionOwner=actionOwners.map(id => activeNativeActionPanel(id)).find(owner =>
        owner?.overlay.contains(event.target));
      if (!native && !fromOfflineFarm && !actionOwner) return false;
      const friendMenu = native?.id === "friends" ? native.scene._actionMenu : null;
      const fromFriendMenu = friendMenu?.parentElement === doc.body &&
        friendMenu.matches(config.windows.nativeChildren.friendsActionMenu) &&
        available(friendMenu) && friendMenu.contains(event.target);
      // Market's mobile sheet is a distinct body portal with the SAME native
      // renderDetails() action handlers as the desktop panel. Its scene-owned
      // UIPanel.openSheet handle is authoritative; an arbitrary matching sheet
      // or a stale sheet from another scene cannot trigger this Game fallback.
      const marketSheet=native?.id === "market" ? native.scene._listingSheet : null;
      const fromMarketSheet=marketSheet?.el?.parentElement===doc.body &&
        marketSheet.sheet?.parentElement===marketSheet.el &&
        marketSheet.sheet.matches(config.windows.nativeChildren.marketSheet) &&
        available(marketSheet.el) && available(marketSheet.sheet) &&
        marketSheet.el.contains(event.target);
      if (!native?.overlay.contains(event.target) && !fromFriendMenu &&
          !fromMarketSheet && !fromOfflineFarm && !actionOwner) return false;
      // HTML form implicit submission (Enter on a text input) dispatches
      // 'submit' directly to the form; no button click is guaranteed. Premium
      // transfer is a panel-owned form whose ORIGINAL submit listener opens
      // PI.Dialog.confirm(). Check its native enabled submit control first.
      if (event.type === "submit") {
        const form=event.target;
        const submit=form?.querySelector?.(":scope > button.premium-modal__submit[type=submit]");
        const premium=Boolean((actionOwner?.id === "premium" || native?.id === "premium") &&
          form?.matches?.(".premium-modal__body > form") && available(form) &&
          submit && available(submit) && !submit.disabled &&
          submit.getAttribute("aria-disabled") !== "true");
        const migrationSubmit=form?.querySelector?.(
          ":scope > .player-migration-actions > button.pokeidle-btn--primary[type=submit]");
        const migration=Boolean(native?.id === "player-migration" &&
          form?.matches?.("form.player-migration-section.player-migration-form") &&
          available(form) && migrationSubmit && available(migrationSubmit) &&
          !migrationSubmit.disabled && migrationSubmit.getAttribute("aria-disabled")!=="true");
        return premium || migration;
      }
      const target = event.target?.closest?.(
        event.type === "change"
          ? 'input[type="checkbox"]'
          : 'button,[role="button"],input[type="submit"],input[type="button"]');
      if (!target || !available(target) || target.disabled ||
          target.getAttribute("aria-disabled") === "true" ||
          target.closest('[hidden],[inert],[aria-hidden="true"]')) return false;
      if (fromOfflineFarm) return ["click","keydown"].includes(event.type) &&
        target.matches(config.windows.nativeChildren.offlineFarmConfirm);
      // Premium renders an owned cosmetic/skin as an exact native product card
      // with "is-owned". Its button opens Trainer Profile rather than PI.Dialog.
      // Read native semantic state, NOT locale-dependent Portuguese button copy.
      // This only avoids an unnecessary Game fallback; it is NOT a permission
      // grant and no item entitlement is mutated or trusted by Better UI.
      if (native?.id === "premium" && target.matches(".premium-product__buy") &&
          target.closest("article.premium-product.is-owned:is(.is-cosmetic,.is-skin)"))
        return false;
      if (["click","keydown"].includes(event.type) && actionOwner &&
          target.matches(config.windows.nativeDialogTriggers[actionOwner.id])) return true;
      if (!native) return false;
      // Team's exact Ditto action may await Api.getDittoForms for arbitrarily
      // long before creating its closure-private UIPanel. Never keep Cards on
      // an ownership timer: the late native form would become invisible.
      if (native.id === "team" &&
          target.matches(config.windows.nativeChildren.teamDittoAction) &&
          ["click","keydown"].includes(event.type)) return true;
      // B2 native controls without an independently attributable dialog or
      // those navigating away from the current map must run in Game before the
      // original handler. Friends' detached menu retains its original buttons.
      if (["click","keydown"].includes(event.type)) {
        const q = config.windows.nativeChildren;
        const sensitive=config.windows.nativeDialogTriggers[native.id];
        if (sensitive && target.matches(sensitive)) return true;
        // Public MarketScene renders Buy and the benign Details button with
        // identical CSS classes. In browse tabs the primary card action buys;
        // in the native 'mine' tab that same-looking action only opens details.
        // Use the verified native scene state rather than button labels/position.
        if (native.id === "market" && native.scene._tab !== "mine" &&
            target.matches(".market-listing__actions > button.pokeidle-btn--primary")) return true;
        if (native.id === "professions" &&
            (target.matches(q.professionsRemove) || target.matches(q.professionsNavigate))) return true;
        if (native.id === "friends" &&
            (target.matches(q.friendsJoin) || (fromFriendMenu && target.matches("button")))) return true;
        if (native.id === "hunt-analyzer" && target.matches(q.huntAnalyzerReset)) return true;
        if (native.id === "shared-stones" && target.matches(q.sharedStoneConfirm)) return true;
        if (native.id === "team" && target.matches(q.teamSavedDelete)) return true;
      }
      const action = nativeDialogAction(native.id,target,event.type);
      if (action?.kind === "settings-email-change" || action?.kind === "settings-two-factor") {
        // Native Settings disables the original control throughout its async
        // verification (including gaps BETWEEN prompts). No Dialog portal
        // handle is exposed; the exact control/scene tracks that interval.
        pendingNativePrompt = {scene:native.scene,control:target};
      }
      return Boolean(action);
    },
    nativePendingDialogTransaction() {
      if (!pendingNativePrompt) return false;
      // Native Settings awaits its async prompt/API cycle with the ORIGINAL
      // control disabled until finally. Minimizing the scene or switching a
      // cached menu can make ReactiveWindows.active() null/different while
      // that same native closure will still paint the second dialog. Neither
      // scene visibility nor DOM attachment proves the async request settled.
      // Hold Game until native finally re-enables the exact control; on real
      // module teardown cleanup() invalidates this hold deterministically.
      if (pendingNativePrompt.control.disabled) return true;
      pendingNativePrompt = null;
      return false;
    },
    hasVisibleNativeDitto: () => nativeDittoPortals().some(node =>
      win.getComputedStyle(node).display !== "none"),
    hasVisibleNativeUIForm: () => nativeUIForms().length > 0,
    hasUnadmittedNativeDialog: () => unadmittedNativeDialogs().length > 0,
    activeNativeActionPanel,
    hasVisibleNativeChild: () => [...owned].some(([node,kind]) =>
      (kind.startsWith("native-child-") || kind.startsWith("native-dialog-")) &&
      node.isConnected && available(node)),
    hasOrphanedNativeChild: () => orphanedNativeChild,
    hasUnsafeNativeTeamDetails: unsafeTeamDetailsBlocksCards,
    openCardTeamDetails,
    sync,
    cleanup() {
      disposed = true;
      teamDetailsIntent = null;
      unsafeTeamDetailsFence = null;
      doc.documentElement.removeAttribute("data-ppbui-card-mode-team-details-opening");
      doc.removeEventListener("click",onUnsafeTeamDetailsClose,true);
      doc.removeEventListener("keydown",onUnsafeTeamDetailsEscape,true);
      doc.removeEventListener("click",onTeamDetailsBubble);
      teamDetailsCards.clear();
      doc.removeEventListener("click",onPrivateNativeMinimize,true);
      doc.removeEventListener("click", onInventoryAction, true);
      doc.removeEventListener("keydown", onInventoryAction, true);
      doc.removeEventListener("pointerover", onInventoryAction, true);
      doc.removeEventListener("contextmenu", onInventoryAction, true);
      doc.removeEventListener("pointerdown", onInventoryAction, true);
      doc.removeEventListener("touchstart", onInventoryAction, true);
      doc.removeEventListener("focusin", onInventoryAction, true);
      for (const type of ["click","keydown","pointerover","pointerdown","focusin"])
        doc.removeEventListener(type, onNativeMenuAction, true);
      for (const [node, kind] of owned) if (node.getAttribute(marker) === kind) node.removeAttribute(marker);
      owned.clear();
      dialogBindings.clear();
      nativePortalBindings.clear();
      privateMinimizedButtons.clear();
      for (const node of nativeTopClamps.keys()) restoreNativeTop(node);
      nativeTopClamps.clear();
      nativeChildOwners.clear();
      inventoryIntent = inventoryHover = activeForm = null;
      nativeMenuIntent = nativeHoverIntent = null;
      pendingNativePrompt = null;
      orphanedNativeChild = false;
    },
  };
}
