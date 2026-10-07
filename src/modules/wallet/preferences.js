import { walletConfig } from "./config.js";

export const defaultWalletPreferences = () => ({backpack:true,trainer:false});
const normalize = value => value && typeof value === "object" && !Array.isArray(value) &&
  typeof value.backpack === "boolean" && typeof value.trainer === "boolean"
  ? {backpack:value.backpack,trainer:value.trainer} : null;
const ownerId = value => typeof value === "string" && value.trim().length <= 256 ? value.trim() : "";
function parsedRecord(raw) {
  if (raw === null) return defaultWalletPreferences();
  try {
    if (typeof raw !== "string" || raw.length > 2048) return null;
    const record=JSON.parse(raw);
    return record?.version === 1 ? normalize(record.locations) : null;
  } catch { return null; }
}

export function createWalletPreferences({storage,events} = {}) {
  const sessions = new Map(), listeners = new Set();
  let sequence = 0, listening = false;
  const keyFor = owner => walletConfig.storagePrefix + encodeURIComponent(owner);
  const rawRead = owner => {
    try { return {available:true,raw:storage().getItem(keyFor(owner))}; }
    catch { return {available:false,raw:undefined}; }
  };
  function read(value) {
    const owner = ownerId(value);
    if (!owner) return {owner:"",preferences:defaultWalletPreferences(),token:null,persistent:false,issue:"identity-pending"};
    const disk = rawRead(owner), overlay = sessions.get(owner);
    if (overlay && overlay.base === undefined && disk.available && disk.raw === null) overlay.base=null;
    if (overlay && (!disk.available || disk.raw === overlay.base)) return {owner,preferences:{...overlay.preferences},token:overlay.token,persistent:false,issue:"session-only"};
    if (overlay) sessions.delete(owner);
    if (!disk.available) return {owner,preferences:defaultWalletPreferences(),token:null,persistent:false,issue:"storage-unavailable"};
    if (disk.raw === null) return {owner,preferences:defaultWalletPreferences(),token:null,persistent:true,issue:null};
    const parsed=parsedRecord(disk.raw);
    return {owner,preferences:parsed || defaultWalletPreferences(),token:disk.raw,persistent:true,issue:parsed ? null : "protected-record"};
  }
  function write(value, preferences, {expectedToken} = {}) {
    const owner = ownerId(value), parsed = normalize(preferences);
    if (!owner || !parsed) return {ok:false,error:!owner ? "owner-changed" : "invalid-preferences"};
    const current = read(owner);
    if (expectedToken !== current.token) return {ok:false,error:"conflict"};
    const disk = rawRead(owner);
    const expectedRaw=current.persistent ? current.token : sessions.get(owner)?.base;
    if (disk.available && disk.raw !== expectedRaw && (expectedRaw !== undefined || disk.raw !== null)) return {ok:false,error:"conflict"};
    if (disk.available && parsedRecord(disk.raw)) {
      try {
        const destination=storage();
        if (destination.getItem(keyFor(owner)) !== disk.raw) return {ok:false,error:"conflict"};
        const raw=JSON.stringify({version:1,locations:parsed});
        destination.setItem(keyFor(owner),raw);
        sessions.delete(owner);
        return {ok:true,persistent:true,token:raw};
      } catch {}
    }
    const overlay={preferences:parsed,base:disk.available ? disk.raw : expectedRaw,token:`session:${++sequence}`};
    sessions.set(owner,overlay);
    return {ok:true,persistent:false,token:overlay.token,error:current.issue === "protected-record" ? "protected-record" : "storage-unavailable"};
  }
  const onStorage = event => {
    if (event.key === null || event.key?.startsWith(walletConfig.storagePrefix)) for (const listener of listeners) listener();
  };
  return {read,write,
    subscribe(fn){
      if(!listening){events?.addEventListener("storage",onStorage);listening=true;}
      listeners.add(fn);return()=>listeners.delete(fn);
    },
    dispose(){events?.removeEventListener("storage",onStorage);listening=false;listeners.clear();}};
}
