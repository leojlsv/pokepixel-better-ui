import { walletConfig as config, walletText } from "./config.js";
import { readWalletAuthority } from "./dom.js";
import { createWalletPreferences } from "./preferences.js";
import { createWalletSettings, createWalletPanel } from "./views.js";
import { walletStyles } from "./styles.js";
import { readMenuLayoutOwner } from "../menu-bar/layout-owner.js";
import { createNativeBusBindings } from "../../core/native-event-bus.js";

const setText = (node,value) => { if(node.textContent !== value)node.textContent=value; };
const setAttr = (node,key,value) => { if(node.getAttribute(key) !== value)node.setAttribute(key,value); };

export function createWalletModule({doc:providedDocument,storage} = {}) {
  const documentOf=()=>providedDocument || globalThis.document;
  const subscribers=new Set(), settingsViews=new Set();
  let active=false, store=null, storeWindow=null, bus=null, panel=null, style=null, summary=null;
  let owner="",blockedOwner=null,lastHud=null,rejectedHud=null,admission=null,backpackEnabled=false;
  let panelAnchor=null,originOwner="",renderKey="",syncing=false;
  let unsubscribe=null;
  const readOwner=()=>{
    const info=readMenuLayoutOwner(documentOf()?.defaultView);
    return blockedOwner !== null && (!info.owner || info.owner === blockedOwner) ? {owner:"",ownerLabel:""} : info;
  };
  function ensureStore() {
    const win=documentOf().defaultView;
    if (!store || storeWindow !== win) {
      store?.dispose();
      store=createWalletPreferences({storage:storage || (()=>win.localStorage),events:win});
      storeWindow=win;
    }
    return store;
  }
  function settingsSnapshot() {
    const info=readOwner(), saved=ensureStore().read(info.owner);
    return {owner:info.owner,ownerLabel:info.ownerLabel,locations:{...saved.preferences},
      persistent:saved.persistent,issue:saved.issue || null};
  }
  function source() {
    const doc=documentOf(), hud=doc.defaultView?.PokeIdle?.PersistentHud?._teamHud;
    const data=readWalletAuthority(doc,owner);
    if (hud === rejectedHud) {
      // A full event may arrive before the native HUD consumes it. Compare the
      // actual authority, never render the event or release an old merged balance.
      if (!data || admission?.owner !== owner || admission.hud !== hud ||
          data.gold !== admission.gold || data.diamonds !== admission.diamonds) return null;
      rejectedHud=null;admission=null;
    }
    return data;
  }
  function closePanel(restoreFocus=false) {
    if (!restoreFocus) panelAnchor=null;
    panel?.close({restoreFocus});
  }
  function openPanel(anchor) {
    if (!active || readOwner().owner !== owner || !owner) return false;
    if (panel && !panel.root.hidden && panelAnchor === anchor) { closePanel(true);return true; }
    panelAnchor=anchor;originOwner=owner;
    updateValues(source());
    panel.open(anchor);
    setAttr(anchor,"aria-expanded","true");
    return true;
  }
  function updateValues(data) {
    if (!panel || !summary) return;
    const doc=documentOf(),text=walletText(doc);
    const key=JSON.stringify([owner,text.locale,data?.gold ?? null,data?.diamonds ?? null,Boolean(data?.diamondIcon)]);
    if (key === renderKey) return;
    renderKey=key;
    panel.values.replaceChildren();
    const compact=[];
    const currencyNode = value => {
      if (value === null) return doc.createTextNode("—");
      let node=null;
      try { node=doc.defaultView?.PokeIdle?.Currency?.element?.(value,{className:"ppbui-wallet-native-currency"}); } catch {}
      return node?.nodeType && node.ownerDocument === doc ? node : doc.createTextNode(`$ ${value.toLocaleString(text.locale)}`);
    };
    const diamondIcon = () => {
      const icon=data?.diamondIcon?.cloneNode?.(true);
      if (icon) {
        icon.removeAttribute?.("id");
        icon.querySelectorAll?.("[id]").forEach(node=>node.removeAttribute("id"));
        icon.classList?.add("ppbui-wallet-diamond-icon");
        icon.setAttribute?.("aria-hidden","true");
        return icon;
      }
      const fallback=doc.createElement("span");
      fallback.className="ppbui-wallet-diamond-icon ppbui-wallet-diamond-fallback";
      fallback.setAttribute("aria-hidden","true");
      fallback.textContent="◆";
      return fallback;
    };
    for (const [field,label] of [["gold",text.gold],["diamonds",text.diamonds]]) {
      const row=doc.createElement("div"),caption=doc.createElement("span"),amount=doc.createElement("strong");
      const value=data?.[field] ?? null;
      const formatted=value === null ? "—" : value.toLocaleString(text.locale);
      row.dataset.ppbuiWalletBalance=field;
      caption.textContent=label;
      if (field === "gold") amount.append(currencyNode(value));
      else amount.append(diamondIcon(),doc.createTextNode(formatted));
      row.append(caption,amount);
      panel.values.append(row);
      const segment=doc.createElement("span");
      if(field === "gold")segment.append(currencyNode(value));
      else segment.append(diamondIcon(),doc.createTextNode(formatted));
      compact.push(segment);
    }
    summary.replaceChildren(...compact);
    const aria=`${text.wallet}. ${text.gold}: ${data?.gold == null ? text.unavailable : data.gold.toLocaleString(text.locale)}. ${text.diamonds}: ${data?.diamonds == null ? text.unavailable : data.diamonds.toLocaleString(text.locale)}`;
    setAttr(summary,"aria-label",aria);setAttr(summary,"title",aria);
  }
  function sync() {
    if (!active || syncing) return;
    syncing=true;
    try {
      bus?.reconcile();
      const doc=documentOf(),info=readOwner(),hud=doc.defaultView?.PokeIdle?.PersistentHud?._teamHud;
      if (owner !== info.owner) {
        if (owner) rejectedHud=lastHud;
        owner=info.owner;
        if (admission?.owner !== owner) admission=null;
        closePanel(false);renderKey="";
      }
      lastHud=hud;
      const snapshot=settingsSnapshot(),data=source(),text=walletText(doc);
      if (snapshot.locations.trainer && data?.info?.isConnected) {
        if (summary.parentNode !== data.info) data.info.append(summary);
      } else summary.remove();
      const nextBackpack=Boolean(owner && snapshot.locations.backpack && data && data.gold !== null && data.diamonds !== null);
      if (nextBackpack !== backpackEnabled) {
        backpackEnabled=nextBackpack;
        for (const listener of subscribers) listener();
      }
      if (panel && !panel.root.hidden && (!owner || originOwner !== owner || doc.documentElement?.getAttribute("data-ppbui-card-mode") === "cards")) closePanel(false);
      if (!panel.root.hidden || summary.isConnected || !data) updateValues(data);
      panel?.sync();
      for (const view of settingsViews) view.sync();
    } finally { syncing=false; }
  }
  function toggleLocation(location,enabled,{owner:requestedOwner}={}) {
    const current=readOwner();
    if (!active || !requestedOwner || current.owner !== requestedOwner || owner !== current.owner) return {ok:false,error:"owner-changed"};
    if (typeof enabled !== "boolean") return {ok:false,error:"invalid-preferences"};
    let result;
    if (["backpack","trainer"].includes(location)) {
      const saved=ensureStore().read(requestedOwner);
      result=store.write(requestedOwner,{...saved.preferences,[location]:enabled},{expectedToken:saved.token});
    } else return {ok:false,error:"invalid-preferences"};
    if (result.ok) { closePanel(false);sync(); }
    return result;
  }
  const module={
    id:config.id,runsInCardMode:true,observerScopes:["team-hud"],
    shouldMount:()=>Boolean(documentOf()?.querySelector(`${config.selectors.toolbar},${config.selectors.team}`)),
    getMountKey:()=>documentOf()?.body,
    reconcile:sync,
    getSnapshot:settingsSnapshot,
    toggleLocation,
    isBackpackEnabled:()=>active ? backpackEnabled : false,
    subscribe(fn){subscribers.add(fn);return()=>subscribers.delete(fn);},
    createSettings({doc=documentOf()}={}) {
      const view=createWalletSettings({doc,getSnapshot:settingsSnapshot,onToggle:toggleLocation});
      settingsViews.add(view);
      return {...view,dispose(){settingsViews.delete(view);view.dispose();}};
    },
    mount() {
      const doc=documentOf(),win=doc.defaultView;
      active=true;owner="";lastHud=null;rejectedHud=null;admission=null;renderKey="";blockedOwner=null;
      style=doc.createElement("style");style.dataset.ppbuiStyle="wallet";style.textContent=walletStyles;doc.head.append(style);
      summary=doc.createElement("button");summary.type="button";summary.dataset.ppbuiWalletTrainer="";
      summary.setAttribute("aria-haspopup","dialog");
      summary.addEventListener("click",event=>{event.stopPropagation();openPanel(summary);});
      panel=createWalletPanel({doc,onClose:()=>{
        if(summary)setAttr(summary,"aria-expanded","false");
        panelAnchor=null;
      }});
      panel.root.id="ppbui-wallet-panel";
      summary.setAttribute("aria-controls",panel.root.id);
      summary.setAttribute("aria-expanded","false");
      bus=createNativeBusBindings(()=>win.PokeIdle?.Bus);
      for (const event of ["auth.loggedOut","auth.sessionExpired","auth.characterMissing","auth.accountChangedInAnotherWindow"]) bus.bind(event,()=>{blockedOwner=owner || readOwner().owner;sync();});
      for (const event of ["auth.loggedIn","auth.trainerUpdated","state.resynced"]) bus.bind(event,payload=>{
        if (event === "auth.loggedIn") blockedOwner=null;
        const trainer=payload?.trainer || payload;
        const valid=value=>(typeof value === "number" || (typeof value === "string" && value.trim())) && Number.isFinite(Number(value)) && Number(value)>=0;
        if (trainer && String(trainer.id || "") === readOwner().owner && valid(trainer.gold) && valid(trainer.diamonds)) {
          admission={owner:readOwner().owner,hud:win.PokeIdle?.PersistentHud?._teamHud,gold:Number(trainer.gold),diamonds:Number(trainer.diamonds)};
        }
        sync();
      });
      ensureStore();unsubscribe=store.subscribe(sync);bus.reconcile();sync();
      return ()=>{
        active=false;closePanel(false);panel?.dispose();panel=null;summary?.remove();summary=null;
        unsubscribe?.();unsubscribe=null;store?.dispose();bus?.cleanup();bus=null;style?.remove();style=null;
        backpackEnabled=false;for(const listener of subscribers)listener();
      };
    },
  };
  return module;
}
