import { menuBarConfig } from "./config.js";
import { findMenuTarget, sameTarget, menuVisibilitySignature } from "./dom.js";
import { mountMenuBar } from "./controller.js";
import { defaultLayout, validateLayout, SYSTEM_IDS } from "./layout-model.js";
import { createMenuLayoutStorage } from "./layout-storage.js";
import { createMenuLayoutEditor } from "./layout-editor.js";
import { readMenuLayoutOwner } from "./layout-owner.js";
import { createNativeBusBindings } from "../../core/native-event-bus.js";
import { createMenuLayoutShortcutGuard } from "./layout-shortcut-guard.js";

export function createMenuBarModule({ doc:providedDocument, storage } = {}) {
  let target = null, mounted = null, store = null, storeWindow = null, editor = null, nativeBus = null;
  let record = null, ownerLabel = "", unsubscribe = null, active = false, changing = false;
  let compatibilityIssue = null, blockedOwner = null, compatibilitySignature = "", pendingRebuild = false, shortcutGuard = null;
  let hadProfile = false;
  const participants = new Map();
  const documentOf = () => providedDocument || globalThis.document;
  const arrangement = layout => JSON.stringify({ bar:layout.bar, groups:layout.groups, orientation:layout.orientation, slotCapacity:layout.slotCapacity });
  const emptyRecord = () => ({ owner:"", layout:defaultLayout(), token:null, persistent:false, issue:"identity-pending" });
  const identity = () => {
    const info = readMenuLayoutOwner(documentOf()?.defaultView);
    return blockedOwner !== null && (!info.owner || info.owner === blockedOwner) ? { owner:"", ownerLabel:"" } : info;
  };
  const notifyGeometry = () => {
    const win = documentOf()?.defaultView;
    win?.dispatchEvent(new win.CustomEvent("ppbui:menu-layout-change"));
  };
  function loadProfile() {
    const info = identity();
    ownerLabel = info.ownerLabel;
    if (record?.owner === info.owner) return false;
    if (info.owner) hadProfile = true;
    record = info.owner ? store.read(info.owner) : emptyRecord();
    return true;
  }
  function mountView(layout) {
    const next = findMenuTarget(documentOf());
    if (!next) return null;
    const owner = record?.owner || "";
    return mountMenuBar(next, {
      layout,
      participants: () => [...participants].map(([id, node]) => ({ id, node })),
      readPosition: () => layout.position || (owner || hadProfile ? { left:8, top:8 } : null),
      onPositionChange: position => {
        if (!active || changing || !owner || identity().owner !== owner || record?.owner !== owner) return;
        const before = arrangement(record.layout);
        const result = store.savePosition(owner, position);
        if (result.ok) {
          record = store.read(owner);
          if (arrangement(record.layout) !== before) rebuild();
        }
        editor?.sync();
      },
    });
  }
  function rebuild(layout = record?.layout || defaultLayout()) {
    pendingRebuild = false;
    mounted?.cleanup();
    mounted = null;
    compatibilityIssue = null;
    const candidate = mountView(layout);
    if (candidate && !candidate.hasCapacity()) {
      candidate.cleanup();
      compatibilityIssue = "incompatible-menu";
    } else mounted = candidate;
    const next = findMenuTarget(documentOf());
    if (!sameTarget(next, target)) target = next;
    compatibilitySignature = compatibilityIssue ? menuVisibilitySignature(next) : "";
    notifyGeometry();
  }
  function refreshProfile() {
    if (!store || changing) return;
    if (loadProfile() && active) {
      editor?.close({ restoreFocus:false });
      rebuild();
    }
    editor?.sync();
  }
  function ensureServices() {
    if (nativeBus) return;
    const doc = documentOf(), win = doc.defaultView;
    if (!store || storeWindow !== win) {
      store?.dispose();
      store = createMenuLayoutStorage({ storage:storage || (() => win.localStorage), events:win });
      storeWindow = win;
    }
    nativeBus = createNativeBusBindings(() => win.PokeIdle?.Bus);
    shortcutGuard = createMenuLayoutShortcutGuard({ win, getRoot:() => editor?.root });
    for (const event of ["auth.loggedOut", "auth.sessionExpired", "auth.characterMissing", "auth.accountChangedInAnotherWindow"]) {
      nativeBus.bind(event, () => {
        blockedOwner = record?.owner || readMenuLayoutOwner(win).owner;
        refreshProfile();
      });
    }
    for (const event of ["auth.loggedIn", "auth.trainerUpdated", "state.resynced"]) {
      nativeBus.bind(event, () => {
        if (event === "auth.loggedIn") blockedOwner = null;
        refreshProfile();
      });
    }
    unsubscribe = store.subscribe(() => {
      if (!active || changing) return;
      if (loadProfile()) {
        editor?.close({ restoreFocus:false });
        rebuild();
      } else if (record.owner) {
        const next = store.read(record.owner);
        if (next.token !== record.token || next.issue !== record.issue) {
          record = next;
          rebuild();
        }
      }
      editor?.sync();
    });
    nativeBus.reconcile();
    loadProfile();
  }
  function getSnapshot({includeCatalog=true}={}) {
    const info = identity();
    let current = record || emptyRecord();
    if (!active && info.owner) {
      const doc=documentOf(), win=doc.defaultView;
      if (!store || storeWindow !== win) {
        store?.dispose();
        store=createMenuLayoutStorage({storage:storage || (()=>win.localStorage),events:win});
        storeWindow=win;
      }
      current=store.read(info.owner);
    }
    return {
      ...current, layout:JSON.parse(JSON.stringify(current.layout)), ownerLabel:info.ownerLabel || ownerLabel,
      owner:info.owner === current.owner ? current.owner : "",
      enabled:Boolean(active && mounted && !compatibilityIssue),
      issue:compatibilityIssue || current.issue,
      catalog:includeCatalog ? mounted?.getCatalog() || [] : [],
    };
  }
  function saveLayout(layout, { owner, token, overwrite = false } = {}) {
    if (!active || !store || !mounted || !owner || identity().owner !== owner || record?.owner !== owner) return { ok:false, error:"owner-changed" };
    const checked = validateLayout(layout);
    if (!checked.ok) return checked;
    const current = store.read(owner);
    if (!overwrite && current.token !== token) return { ok:false, error:"conflict" };
    if (!overwrite && current.issue && !["session-only", "storage-unavailable"].includes(current.issue)) return { ok:false, error:"protected-record" };
    const previous = record;
    changing = true;
    try {
      rebuild(checked.layout);
      if (!mounted || !mounted.isIntact()) throw new Error("incompatible-menu");
      if (identity().owner !== owner) throw new Error("owner-changed");
      const result = store.write(owner, checked.layout, { expectedToken:token, overwrite });
      if (!result.ok) {
        record = previous;
        rebuild();
        return result;
      }
      record = store.read(owner);
      return { ...result, layout:record.layout, token:record.token };
    } catch (error) {
      record = previous;
      rebuild();
      return { ok:false, error:error.message || "apply-failed" };
    } finally { changing = false; }
  }
  const module = {
    id: menuBarConfig.id,
    runsInCardMode: true,
    shouldMount() {
      const next = findMenuTarget(documentOf());
      if (next) { ensureServices(); refreshProfile(); }
      if (!sameTarget(next, target) || (mounted && !mounted.isIntact())) {
        target = next;
        if (active && next) pendingRebuild = true;
      }
      return Boolean(next);
    },
    getMountKey: () => documentOf()?.body,
    reconcile() {
      nativeBus?.reconcile();
      refreshProfile();
      if (pendingRebuild) rebuild();
      if (compatibilityIssue && menuVisibilitySignature(findMenuTarget(documentOf())) !== compatibilitySignature) rebuild();
      mounted?.sync();
      if (mounted && !mounted.hasCapacity()) rebuild();
      editor?.sync();
      shortcutGuard?.sync();
    },
    getGroupTarget: id => mounted?.getGroupTarget?.(id) || null,
    getOrientation: () => mounted?.getOrientation?.() || record?.layout.orientation || "horizontal",
    setOrientation(value) {
      const orientation = menuBarConfig.orientations.includes(value) ? value : "horizontal";
      if (!record) record = emptyRecord();
      if (record.owner) return saveLayout({ ...record.layout, orientation }, { owner:record.owner, token:record.token });
      record.layout.orientation = orientation;
      mounted?.setOrientation(orientation);
      return { ok:true, persistent:false };
    },
    getLayoutSnapshot: getSnapshot,
    saveLayout,
    openEditor(origin) {
      refreshProfile();
      if (!active || !mounted || !identity().owner) return false;
      mounted.closePopups();
      editor ||= createMenuLayoutEditor({ doc:documentOf(), getSnapshot, onSave:saveLayout });
      if (!editor.root.isConnected) documentOf().body.append(editor.root);
      const focusTarget = () => origin?.isConnected ? origin : participants.get(SYSTEM_IDS.moduleControls)?.querySelector("button");
      editor.open({ get isConnected(){ return Boolean(focusTarget()?.isConnected); }, focus(){ if (!mounted?.focusParticipant(SYSTEM_IDS.moduleControls)) focusTarget()?.focus(); } });
      shortcutGuard?.sync();
      return true;
    },
    registerParticipant(id, node) {
      if (!Object.values(SYSTEM_IDS).includes(id) || !node) return () => {};
      participants.set(id, node);
      mounted?.syncParticipants();
      return () => { if (participants.get(id) === node) participants.delete(id); };
    },
    focusParticipant: id => mounted?.focusParticipant(id) || false,
    placeParticipant(id, node, toolbar) {
      if (!mounted || target?.toolbar !== toolbar || participants.get(id) !== node) return false;
      mounted.syncParticipants();
      return true;
    },
    mount() {
      ensureServices();
      active = true;
      loadProfile();
      rebuild();
      return () => {
        active = false;
        editor?.dispose();
        editor = null;
        shortcutGuard?.cleanup();
        shortcutGuard = null;
        mounted?.cleanup();
        mounted = null;
        unsubscribe?.();
        unsubscribe = null;
        nativeBus?.cleanup();
        nativeBus = null;
        store?.dispose();
        record = null;
        compatibilityIssue = null;
        blockedOwner = null;
        pendingRebuild = false;
      };
    },
  };
  return module;
}

export const menuBarModule = createMenuBarModule();
