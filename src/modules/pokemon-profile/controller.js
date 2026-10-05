import { applyTeamMoveset, captureTeamMoveset, readNativeMoveset } from "../team-movesets/actions.js";
import { createMoveIcon, movesetBadgeLabel } from "../team-movesets/dom.js";
import { createTeamMovesetStorage, movesetSignature } from "../team-movesets/storage.js";
import { createTeamPresetStorage } from "../team-presets/storage.js";
import { teamPresetHudMemberVisual, teamPresetMemberSnapshot } from "../team-presets/dom.js";
import { createElementIcon } from "../../core/element-icons.js";
import { createNativeBusBindings } from "../../core/native-event-bus.js";
import { fixedTags, freshFilters, matchesPokemon, pokemonElements, pokemonRarities, tagService } from "../pokemon-tools/model.js";
import { finite, pokemonName, pokemonProfileText } from "./dom.js";

const PROFILE_ID = "pokemon-profile";
const IV_MAX_TOTAL = 186;

export async function loadOwnedPokemon(doc) {
  const api = doc.defaultView?.PokeIdle?.Api;
  if (typeof api?.getCreatures !== "function") throw new Error("creatures-api-unavailable");
  if (typeof api.getTeam === "function") await api.getTeam();
  const [teamResponse, inventoryResponse] = await Promise.all([api.getCreatures("team"), api.getCreatures("inventory")]);
  const team = teamResponse?.data || teamResponse, inventory = inventoryResponse?.data || inventoryResponse;
  if (!Array.isArray(team) || !Array.isArray(inventory)) throw new Error("creatures-read-failed");
  const byId = new Map(), result = [];
  const add = (creature, source) => {
    const id = String(creature?.id ?? "").trim();
    if (!id || byId.has(id)) return;
    const record = { ...creature, __ppbuiSource: source };
    byId.set(id, record); result.push(record);
  };
  team.forEach(creature => add(creature, "team"));
  inventory.forEach(creature => add(creature, "backpack"));
  return result;
}

function styleText() {
  return `
    [data-ppbui-pokemon-profile-menu] { cursor:pointer; }
    [data-ppbui-pokemon-profile-window] { --ppbui-bg-0:#0b100f; --ppbui-bg-1:#111715; --ppbui-bg-2:#171d1a; --ppbui-border:#37413c; --ppbui-border-strong:#4a554d; --ppbui-text:#e5e3d6; --ppbui-text-muted:#96998e; --ppbui-text-subtle:#70756d; --ppbui-selected:#d2b45d; --ppbui-warning:#d2b45d; --ppbui-success:#69a66f; }
    [data-ppbui-pokemon-profile-window] { position:fixed; z-index:10030; inset:50% auto auto 50%; display:grid; grid-template-rows:auto minmax(0,1fr); container-type:inline-size; box-sizing:border-box; width:min(620px,calc(100vw - 16px)); min-width:min(340px,calc(100vw - 16px)); max-height:calc(100vh - 16px); overflow:hidden; transform:translate(-50%,-50%); border:var(--ppbui-border-width) solid #4a554d; border-radius:var(--ppbui-window-radius); background:linear-gradient(180deg,#101614 0%,#0a0f0e 100%); color:var(--ppbui-text); box-shadow:0 12px 28px rgba(0,0,0,.46); font:var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body); -webkit-text-size-adjust:100%; text-size-adjust:100%; }
    [data-ppbui-pokemon-profile-window][hidden] { display:none!important; }
    [data-ppbui-profile-titlebar] { display:flex; min-height:48px; align-items:center; gap:var(--ppbui-space-3); padding:0 var(--ppbui-space-3) 0 var(--ppbui-space-4); border-bottom:var(--ppbui-border-width) solid var(--ppbui-border-strong); background:var(--ppbui-bg-2); color:var(--ppbui-text); box-shadow:none!important; cursor:move; touch-action:none; user-select:none; }
    [data-ppbui-profile-title-identity] { display:flex; min-width:0; align-items:center; gap:10px; }
    [data-ppbui-profile-title-icon] { display:block; width:20px; height:20px; flex:0 0 20px; object-fit:contain; image-rendering:pixelated; }
    [data-ppbui-profile-title] { min-width:0; margin:0; padding:0; overflow:hidden; color:var(--ppbui-text); font:700 15px/1 var(--ppbui-font-body); letter-spacing:.04em; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
    [data-ppbui-profile-close] { width:40px; min-width:40px; height:40px; min-height:40px; margin-left:auto; border:0!important; border-radius:var(--ppbui-radius)!important; background:transparent!important; color:var(--ppbui-text-muted)!important; box-shadow:none!important; cursor:pointer; }
    [data-ppbui-profile-close]:hover { background:var(--ppbui-bg-3)!important; color:var(--ppbui-text)!important; }
    [data-ppbui-pokemon-profile-window][data-ppbui-profile-dragging] [data-ppbui-profile-titlebar] { cursor:grabbing; }
    [data-ppbui-profile-body] { display:grid; align-content:start; gap:0; box-sizing:border-box; max-height:calc(100vh - 66px); overflow-y:auto; background:var(--ppbui-bg-0); }
    [data-ppbui-profile-picker] { display:grid; gap:var(--ppbui-space-2); padding:var(--ppbui-space-3) 0 var(--ppbui-space-3) var(--ppbui-space-4); border-bottom:var(--ppbui-border-width) solid #3d4842; background:#141b18; box-shadow:none; }
    [data-ppbui-profile-picker-tools] { display:grid; grid-template-columns:auto minmax(150px,1fr) auto; gap:var(--ppbui-space-2); align-items:center; }
    [data-ppbui-profile-filters] { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr) 78px 78px minmax(112px,1.2fr) auto; gap:var(--ppbui-space-2); align-items:end; }
    [data-ppbui-profile-filter-field] { display:grid; gap:2px; min-width:0; color:var(--ppbui-text-muted); font:600 var(--ppbui-font-size-meta)/1 var(--ppbui-font-body); text-transform:uppercase; }
    [data-ppbui-profile-filter-field] select, [data-ppbui-profile-filter-field] input { box-sizing:border-box; width:100%; min-width:0; }
    [data-ppbui-profile-filter-error] { color:var(--ppbui-danger-text); font:600 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body); text-transform:none; }
    [data-ppbui-profile-filter-error][hidden] { display:none!important; }
    [data-ppbui-profile-filter-clear] { white-space:nowrap; }
    [data-ppbui-profile-sources] { display:flex; gap:0; }
    [data-ppbui-profile-sources] button + button { border-left:0!important; }
    [data-ppbui-profile-sources] button[aria-pressed="true"] { border-color:var(--ppbui-selected)!important; color:var(--ppbui-selected)!important; background:var(--ppbui-bg-2)!important; }
    [data-ppbui-profile-list] { display:grid; grid-auto-flow:column; grid-auto-columns:108px; gap:var(--ppbui-space-2); overflow-x:auto; overflow-y:hidden; padding-bottom:var(--ppbui-space-1); }
    [data-ppbui-profile-choice] { display:grid; grid-template-columns:minmax(0,1fr); grid-template-rows:repeat(5,minmax(20px,auto)); justify-items:center; gap:3px; min-width:0; padding:var(--ppbui-space-2); border:var(--ppbui-separator-width) solid #344039!important; border-radius:var(--ppbui-radius)!important; background:#101613!important; box-shadow:none!important; text-align:center; }
    [data-ppbui-profile-choice][aria-pressed="true"] { border-color:var(--ppbui-selected)!important; background:#181d18!important; box-shadow:none!important; }
    [data-ppbui-profile-choice-visual] { display:grid; width:48px; height:48px; place-items:center; justify-self:center; overflow:hidden; border:var(--ppbui-separator-width) solid var(--ppbui-profile-element-color,var(--ppbui-border-strong)); border-radius:var(--ppbui-radius); background:var(--ppbui-bg-0); }
    [data-ppbui-profile-choice-visual] img { display:block; width:46px; height:46px; object-fit:contain; image-rendering:pixelated; }
    [data-ppbui-profile-choice-name] { grid-column:1; grid-row:1; width:100%; overflow:hidden; text-align:center; text-overflow:ellipsis; white-space:nowrap; font-weight:700; }
    [data-ppbui-profile-choice-visual] { grid-column:1; grid-row:2; }
    [data-ppbui-profile-choice-elements] { grid-column:1; grid-row:3; display:flex; justify-content:center; gap:3px; align-items:center; min-width:0; }
    [data-ppbui-profile-choice-element] { display:grid; width:20px; height:20px; box-sizing:border-box; place-items:center; border:var(--ppbui-separator-width) solid var(--ppbui-element-color,var(--ppbui-border)); border-radius:var(--ppbui-radius-badge); background:var(--ppbui-bg-2); }
    [data-ppbui-profile-choice-element] .ppbui-element-icon { width:14px!important; height:14px!important; }
    [data-ppbui-profile-choice-rarity] { grid-column:1; grid-row:4; display:flex; justify-content:center; align-items:center; min-width:0; }
    [data-ppbui-profile-choice-rarity] .ppbui-quality-badge { min-width:0!important; min-height:20px!important; padding:1px 3px!important; overflow:hidden; font-size:9px!important; text-overflow:ellipsis; }
    [data-ppbui-profile-choice-stats] { grid-column:1; grid-row:5; width:100%; overflow:hidden; color:var(--ppbui-text-muted); font:600 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data); text-align:center; text-overflow:ellipsis; white-space:nowrap; }
    [data-ppbui-profile-picker-state] { margin:0; color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-secondary); }
    [data-ppbui-profile-main] { display:grid; gap:var(--ppbui-space-4); padding:var(--ppbui-space-4); background:linear-gradient(180deg,rgba(18,24,22,.92),rgba(10,15,14,.96)); }
    [data-ppbui-profile-hero] { display:grid; grid-template-columns:112px minmax(0,1fr); gap:var(--ppbui-space-4); align-items:start; padding:10px; border:1px solid #3b4640; background:#121815; }
    [data-ppbui-profile-portrait] { display:grid; width:112px; height:112px; place-items:center; border:var(--ppbui-border-width) solid var(--ppbui-profile-element-color,var(--ppbui-border-strong)); border-radius:var(--ppbui-radius); background:#0a0f0e; box-shadow:none!important; }
    [data-ppbui-profile-portrait] img { display:block; width:104px; height:104px; object-fit:contain; image-rendering:pixelated; }
    [data-ppbui-profile-identity] { display:grid; gap:var(--ppbui-space-2); min-width:0; }
    [data-ppbui-profile-identity-head] { display:flex; align-items:baseline; gap:var(--ppbui-space-3); min-width:0; }
    [data-ppbui-profile-name] { min-width:0; margin:0; overflow:hidden; font:700 18px/var(--ppbui-line-height-tight) var(--ppbui-font-body); text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
    [data-ppbui-profile-power] { margin-left:auto; color:var(--ppbui-warning); font:700 var(--ppbui-font-size-title)/1 var(--ppbui-font-data); white-space:nowrap; }
    [data-ppbui-profile-meta] { display:flex; flex-wrap:wrap; gap:var(--ppbui-space-2); align-items:center; color:var(--ppbui-text-muted); }
    [data-ppbui-profile-type] { display:inline-flex; gap:5px; align-items:center; padding:0!important; border:0!important; background:transparent!important; color:var(--ppbui-text); font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-body); text-transform:uppercase; }
    [data-ppbui-profile-type-icon] { display:grid; width:20px; height:20px; box-sizing:border-box; place-items:center; border:var(--ppbui-separator-width) solid var(--ppbui-element-color,var(--ppbui-border)); border-radius:var(--ppbui-radius-badge); background:var(--ppbui-bg-2); }
    [data-ppbui-profile-type-icon] .ppbui-element-icon { width:14px!important; height:14px!important; }
    [data-ppbui-profile-type-name] { padding:0; border:0; background:transparent; }
    [data-ppbui-profile-hp] { display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:var(--ppbui-space-2); align-items:center; padding-top:var(--ppbui-space-2); border-top:var(--ppbui-separator-width) solid var(--ppbui-border); }
    [data-ppbui-profile-hp-track] { height:8px; overflow:hidden; border:var(--ppbui-separator-width) solid var(--ppbui-border); border-radius:var(--ppbui-radius); background:var(--ppbui-bg-0); }
    [data-ppbui-profile-hp-fill] { display:block; height:100%; background:var(--ppbui-success); }
    [data-ppbui-profile-facts] { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:0; border:var(--ppbui-separator-width) solid #3a453f; background:#151c19; }
    [data-ppbui-profile-fact] { display:grid; gap:3px; min-width:0; padding:var(--ppbui-space-2); }
    [data-ppbui-profile-fact] + [data-ppbui-profile-fact] { border-left:var(--ppbui-separator-width) solid var(--ppbui-border); }
    [data-ppbui-profile-fact] small { overflow:hidden; color:var(--ppbui-text-muted); font:600 var(--ppbui-font-size-meta)/1 var(--ppbui-font-body); text-overflow:ellipsis; white-space:nowrap; }
    [data-ppbui-profile-fact] strong { overflow:hidden; font:700 var(--ppbui-font-size-body)/1 var(--ppbui-font-data); text-overflow:ellipsis; white-space:nowrap; }
    [data-ppbui-profile-fact="rarity"] strong.ppbui-quality-badge { justify-self:start; max-width:100%; }
    [data-ppbui-profile-fact="gender"] strong[data-gender-tone="male"] { color:var(--ppbui-accent-hi); }
    [data-ppbui-profile-fact="gender"] strong[data-gender-tone="female"] { color:var(--ppbui-danger-hi); }
    [data-ppbui-profile-fact="gender"] strong[data-gender-tone="neutral"] { color:var(--ppbui-text-muted); }
    [data-ppbui-profile-section] { display:grid; gap:var(--ppbui-space-2); min-width:0; padding-top:var(--ppbui-space-3); border-top:var(--ppbui-separator-width) solid #354039; }
    [data-ppbui-profile-section] > header { display:flex; align-items:center; gap:var(--ppbui-space-2); min-width:0; }
    [data-ppbui-profile-section] > header [data-ppbui-profile-section-actions] { display:flex; gap:var(--ppbui-space-1); align-items:center; margin-left:auto; }
    [data-ppbui-profile-section-body] { display:grid; gap:var(--ppbui-space-2); min-width:0; }
    [data-ppbui-profile-section-body][hidden] { display:none!important; }
    [data-ppbui-profile-section] h3 { margin:0; color:#d9bd68; font:700 12px/1 var(--ppbui-font-body); text-transform:uppercase; letter-spacing:.07em; }
    [data-ppbui-profile-current] { padding:var(--ppbui-space-3); border:var(--ppbui-border-width) solid #3d4842; background:#141b18; box-shadow:none; }
    [data-ppbui-profile-move-list] { display:grid; grid-template-columns:repeat(4,minmax(136px,1fr)); gap:var(--ppbui-space-1); width:100%; min-width:0; max-width:100%; box-sizing:border-box; justify-self:stretch; margin:0; padding:0 0 var(--ppbui-space-1); overflow-x:auto; overflow-y:hidden; scrollbar-gutter:auto; list-style:none; counter-reset:move; }
    [data-ppbui-profile-move] { display:grid; grid-template-columns:28px minmax(0,1fr); grid-template-rows:28px 22px; align-items:center; gap:var(--ppbui-space-1); min-width:0; min-height:58px; padding:var(--ppbui-space-1); border:var(--ppbui-separator-width) solid #344039; background:#101613; }
    [data-ppbui-profile-move-position] { display:grid; width:26px; height:26px; place-items:center; border:var(--ppbui-separator-width) solid #3a453f; background:#141b18; color:var(--ppbui-text); font:700 var(--ppbui-font-size-body)/1 var(--ppbui-font-data); }
    [data-ppbui-profile-move-name] { min-width:0; height:26px; box-sizing:border-box; padding:4px var(--ppbui-space-2); overflow:hidden; border:var(--ppbui-separator-width) solid transparent; background:transparent; font-family:var(--ppbui-font-body); font-size:var(--ppbui-font-size-body); font-weight:700; line-height:16px; text-overflow:ellipsis; white-space:nowrap; }
    [data-ppbui-profile-move-meta] { grid-column:1/-1; display:flex; align-items:center; gap:4px; min-width:0; overflow:hidden; white-space:nowrap; }
    [data-ppbui-profile-move-element] { display:grid; width:22px; height:22px; box-sizing:border-box; place-items:center; border:var(--ppbui-separator-width) solid var(--ppbui-element-color,var(--ppbui-border)); border-radius:var(--ppbui-radius-badge); background:var(--ppbui-bg-2); }
    [data-ppbui-profile-move-element] .ppbui-element-icon { width:14px!important; height:14px!important; }
    [data-ppbui-profile-move-category], [data-ppbui-profile-move-cooldown], [data-ppbui-profile-move-separator], [data-ppbui-profile-move-power], [data-ppbui-profile-move-threshold] { flex:0 0 auto; overflow:hidden; font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-data); text-overflow:ellipsis; white-space:nowrap; }
    [data-ppbui-profile-move-category], [data-ppbui-profile-move-cooldown], [data-ppbui-profile-move-separator] { color:var(--ppbui-text-muted); }
    [data-ppbui-profile-move-separator] { color:var(--ppbui-text-subtle); }
    [data-ppbui-profile-move-power] { border:0; background:transparent; color:#ddc36f; font-variant-numeric:tabular-nums; }
    [data-ppbui-profile-move-threshold] { color:#8fd29a; font-variant-numeric:tabular-nums; }
    [data-ppbui-profile-move][data-empty="true"] { color:var(--ppbui-text-subtle); }
    [data-ppbui-profile-status] { margin:0; color:var(--ppbui-text-muted); font-size:var(--ppbui-font-size-secondary); }
    [data-ppbui-profile-status][data-error="true"] { color:var(--ppbui-danger-text); font-weight:700; }
    [data-ppbui-profile-save] { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:var(--ppbui-space-2); }
    [data-ppbui-profile-save] > input { width:100%; min-width:0; }
    [data-ppbui-profile-saved-list], [data-ppbui-profile-team-list] { display:grid; gap:0; }
    [data-ppbui-profile-saved] { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:var(--ppbui-space-2) var(--ppbui-space-3); align-items:start; padding:var(--ppbui-space-3) 0; border-top:var(--ppbui-separator-width) solid #354039; }
    [data-ppbui-profile-saved] > [data-ppbui-profile-move-list] { grid-column:1/-1; width:100%; }
    [data-ppbui-profile-saved]:last-child, [data-ppbui-profile-team-row]:last-child { border-bottom:var(--ppbui-separator-width) solid var(--ppbui-border); }
    [data-ppbui-profile-saved-head] { display:flex; flex-wrap:wrap; gap:var(--ppbui-space-1) var(--ppbui-space-2); align-items:baseline; min-width:0; }
    [data-ppbui-profile-saved-head] strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    [data-ppbui-profile-saved][data-active="true"] { box-shadow:none!important; padding-left:var(--ppbui-space-2); }
    [data-ppbui-profile-saved-actions] { display:flex; grid-column:1/-1; flex-wrap:wrap; gap:var(--ppbui-space-1); justify-content:flex-end; }
    [data-ppbui-profile-team-row] { display:grid; grid-template-columns:minmax(140px,.7fr) minmax(0,1.3fr); gap:var(--ppbui-space-3); align-items:center; padding:var(--ppbui-space-3) 0; border-top:var(--ppbui-separator-width) solid #354039; }
    [data-ppbui-profile-team-meta] { display:flex; flex-wrap:wrap; gap:var(--ppbui-space-1) var(--ppbui-space-2); align-items:baseline; }
    [data-ppbui-profile-team-members] { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:0; min-width:0; overflow:hidden; }
    [data-ppbui-profile-team-member] { display:grid; min-height:36px; place-items:center; border:var(--ppbui-separator-width) solid #344039; background:#101613; font:700 var(--ppbui-font-size-meta)/1 var(--ppbui-font-body); overflow:hidden; }
    [data-ppbui-profile-team-member] + [data-ppbui-profile-team-member] { border-left:0; }
    [data-ppbui-profile-team-member][data-selected="true"] { border-color:var(--ppbui-selected); box-shadow:none!important; }
    [data-ppbui-profile-team-member] img { width:30px; height:30px; object-fit:contain; image-rendering:pixelated; }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-power] { margin-left:auto; white-space:nowrap; }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-hidden] { display:none!important; }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-actions] { margin-top:4px; }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-iv] { white-space:nowrap; }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-sr] { position:absolute!important; width:1px!important; height:1px!important; padding:0!important; margin:-1px!important; overflow:hidden!important; clip:rect(0,0,0,0)!important; white-space:nowrap!important; border:0!important; }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-moves] { display:grid; gap:6px; }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-move-grid] { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; min-width:0; }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-move] { display:grid; grid-template-columns:28px minmax(0,1fr); align-items:center; gap:6px; min-width:0; min-height:36px; padding:4px 6px; border:1px solid rgba(210,180,93,.34); border-radius:var(--ppbui-radius); background:rgba(10,15,14,.72); font-family:var(--ppbui-font-body); font-size:var(--ppbui-font-size-body); line-height:var(--ppbui-line-height-body); }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-move][data-empty="true"] { color:rgba(229,227,214,.55); }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-move] > img { display:block; width:24px; height:24px; object-fit:contain; image-rendering:pixelated; }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-move-copy] { display:grid; gap:2px; min-width:0; }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-move-copy] > strong { overflow:hidden; font:700 var(--ppbui-font-size-body)/var(--ppbui-line-height-tight) var(--ppbui-font-body); text-overflow:ellipsis; white-space:nowrap; }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-move-copy] > small { overflow:hidden; color:inherit; font:400 var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-body); opacity:.72; text-overflow:ellipsis; white-space:nowrap; }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-profile] { min-width:0; }

    /* Approved Game Palette: surface alpha only; text, semantic colors and 1px lines remain opaque. */
    [data-ppbui-pokemon-profile-window] {
      --ppbui-bg-0:rgba(22,29,32,.85);
      --ppbui-bg-1:rgba(22,29,32,.92);
      --ppbui-bg-2:rgba(35,44,46,.96);
      --ppbui-border:#6b6543;
      --ppbui-border-strong:#6b6543;
      --ppbui-text:#eef1df;
      --ppbui-text-muted:#a6aa9f;
      --ppbui-text-subtle:#777b73;
      --ppbui-selected:#d2b45d;
      --ppbui-focus:#37b4d1;
      --ppbui-success:#6fb658;
      --ppbui-warning:#d2b45d;
      --ppbui-danger:#e17a72;
      --ppbui-border-width:1px;
      --ppbui-separator-width:1px;
      --ppbui-scrollbar-size:8px;
      border:1px solid #6b6543!important;
      border-radius:var(--ppbui-window-radius)!important;
      overflow:hidden!important;
      background:rgba(22,29,32,.92)!important;
      color:#eef1df!important;
      box-shadow:none!important;
    }
    [data-ppbui-pokemon-profile-window] :focus-visible { outline-width:var(--ppbui-focus-width)!important; }
    [data-ppbui-profile-titlebar] { border-bottom:1px solid #6b6543!important; background:rgba(35,44,46,.96)!important; box-shadow:none!important; }
    [data-ppbui-profile-title] { color:#eef1df!important; }
    [data-ppbui-profile-section] h3 { color:#e0c46d!important; }
    [data-ppbui-profile-close] { border:0!important; background:transparent!important; color:#a6aa9f!important; }
    [data-ppbui-profile-close]:hover { background:rgba(22,29,32,.85)!important; color:#eef1df!important; }
    [data-ppbui-profile-body] { background:rgba(22,29,32,.85)!important; }
    [data-ppbui-profile-picker] { border-bottom:1px solid #6b6543!important; background:rgba(35,44,46,.96)!important; }
    [data-ppbui-profile-main] { background:rgba(22,29,32,.92)!important; }
    [data-ppbui-profile-hero] { border:1px solid #6b6543!important; border-radius:var(--ppbui-radius)!important; background:rgba(35,44,46,.96)!important; }
    [data-ppbui-profile-portrait] { border-width:1px!important; background:rgba(22,29,32,.85)!important; box-shadow:none!important; }
    [data-ppbui-profile-choice] { border:1px solid #6b6543!important; background:rgba(35,44,46,.96)!important; box-shadow:none!important; color:#eef1df!important; }
    [data-ppbui-profile-choice][aria-pressed="true"] { border:1px solid #d2b45d!important; background:rgba(35,44,46,.96)!important; box-shadow:none!important; }
    [data-ppbui-profile-choice-visual], [data-ppbui-profile-choice-element], [data-ppbui-profile-type-icon], [data-ppbui-profile-move-element] { border-width:1px!important; }
    [data-ppbui-profile-choice-stats], [data-ppbui-profile-picker-state], [data-ppbui-profile-filter-field], [data-ppbui-profile-meta], [data-ppbui-profile-fact] small, [data-ppbui-profile-move-category], [data-ppbui-profile-move-cooldown], [data-ppbui-profile-status] { color:#a6aa9f!important; }
    [data-ppbui-profile-power], [data-ppbui-profile-move-power] { color:#ffe27a!important; }
    [data-ppbui-profile-hp], [data-ppbui-profile-section], [data-ppbui-profile-saved], [data-ppbui-profile-team-row] { border-color:#6b6543!important; }
    [data-ppbui-profile-hp-track] { border:1px solid #6b6543!important; background:rgba(22,29,32,.85)!important; }
    [data-ppbui-profile-hp-fill] { background:#6fb658!important; }
    [data-ppbui-profile-facts] { border:1px solid #6b6543!important; border-radius:var(--ppbui-radius)!important; background:rgba(22,29,32,.85)!important; }
    [data-ppbui-profile-fact] { border-width:1px!important; border-color:#6b6543!important; }
    [data-ppbui-profile-current] { border:1px solid #6b6543!important; border-radius:var(--ppbui-radius)!important; background:rgba(35,44,46,.96)!important; box-shadow:none!important; }
    [data-ppbui-profile-move] { border:1px solid #6b6543!important; border-radius:var(--ppbui-radius)!important; background:rgba(22,29,32,.85)!important; color:#eef1df!important; }
    [data-ppbui-profile-move-position] { border:1px solid #6b6543!important; border-radius:var(--ppbui-radius-badge)!important; background:rgba(22,29,32,.85)!important; color:#eef1df!important; }
    [data-ppbui-profile-move-name], [data-ppbui-profile-move-power] { border-width:1px!important; }
    [data-ppbui-profile-team-member] { border:1px solid #6b6543!important; border-radius:var(--ppbui-radius)!important; background:rgba(22,29,32,.85)!important; }
    [data-ppbui-pokemon-profile-window] input, [data-ppbui-pokemon-profile-window] select { border:1px solid #6b6543!important; background:rgba(22,29,32,.85)!important; color:#eef1df!important; box-shadow:none!important; }
    [data-ppbui-pokemon-profile-window] button { border-width:1px!important; border-color:#6b6543!important; background:rgba(35,44,46,.96)!important; color:#eef1df!important; box-shadow:none!important; }
    [data-ppbui-profile-sources] button[aria-pressed="true"] { border-color:#d2b45d!important; background:rgba(35,44,46,.96)!important; color:#d2b45d!important; }
    [data-ppbui-profile-saved][data-active="true"] { border-top-color:#d2b45d!important; box-shadow:none!important; }
    [data-ppbui-profile-team-member][data-selected="true"] { box-shadow:none!important; }

    .pokemon-card[data-ppbui-profile-native-card] {
      --ppbui-border-width:1px;
      --ppbui-separator-width:1px;
      --ppbui-focus:#37b4d1;
      box-sizing:border-box;
      min-width:0!important;
      max-width:100%!important;
      container-type:inline-size;
      container-name:ppbui-native-pokemon-card;
      border:1px solid #6b6543!important;
      border-radius:var(--ppbui-radius)!important;
      background:rgba(22,29,32,.92)!important;
      color:#eef1df!important;
      box-shadow:none!important;
      -webkit-text-size-adjust:100%;
      text-size-adjust:100%;
    }
    .pokemon-card[data-ppbui-profile-native-card] :focus-visible {
      outline:var(--ppbui-focus-width,2px) solid var(--ppbui-focus)!important;
      outline-offset:2px!important;
    }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-tooltip__header { border-bottom:1px solid #6b6543!important; }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-tooltip__portrait { border:1px solid #6b6543!important; border-radius:var(--ppbui-radius)!important; background:rgba(35,44,46,.96)!important; }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-tooltip__identity strong, .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__title { color:#e0c46d!important; }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-tooltip__badge:not(.is-level):not(.is-quality):not(.is-shiny):not(.is-mega):not(.is-iv) { border:1px solid #6b6543!important; border-radius:var(--ppbui-radius-badge)!important; background:rgba(35,44,46,.96)!important; color:#eef1df!important; }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-power] { color:#ffe27a!important; }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__meters { border:1px solid #6b6543!important; border-radius:var(--ppbui-radius)!important; background:rgba(22,29,32,.85)!important; }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__track { border:1px solid #6b6543!important; border-radius:var(--ppbui-radius)!important; background:rgba(22,29,32,.85)!important; }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__track i { background:#6fb658!important; }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__section { border-top:1px solid #6b6543!important; background:rgba(22,29,32,.85)!important; }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__row { border-bottom:1px solid #6b6543!important; }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-move] { border:1px solid #6b6543!important; border-radius:var(--ppbui-radius)!important; background:rgba(22,29,32,.85)!important; color:#eef1df!important; }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__action { border:1px solid #6b6543!important; border-radius:var(--ppbui-control-radius)!important; background:rgba(35,44,46,.96)!important; color:#eef1df!important; box-shadow:none!important; }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__action.is-profile { border-color:#d2b45d!important; color:#ffe27a!important; }

    /* Native PokémonCard readability: strong identity, stable actions, quiet data sections. */
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-tooltip__header {
      padding-bottom:9px!important;
    }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-tooltip__identity {
      min-width:0;
      gap:2px!important;
    }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-tooltip__identity strong,
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-tooltip__name {
      overflow:hidden;
      font-size:16px!important;
      line-height:1.15!important;
      text-overflow:ellipsis;
      white-space:nowrap;
    }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-tooltip__identity small {
      overflow:hidden;
      color:#a6aa9f!important;
      font-size:10px!important;
      line-height:1.2!important;
      text-overflow:ellipsis;
      white-space:nowrap;
    }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-tooltip__badges {
      display:flex!important;
      flex-wrap:wrap!important;
      gap:4px!important;
      align-items:center!important;
      margin:7px 0 6px!important;
    }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-tooltip__badge {
      min-height:22px;
      box-sizing:border-box;
      font-size:10px!important;
      line-height:1!important;
    }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-power] {
      margin-left:auto!important;
      font-variant-numeric:tabular-nums;
    }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-actions] {
      display:grid!important;
      grid-template-columns:repeat(4,minmax(0,1fr))!important;
      gap:4px!important;
      width:100%;
      min-width:0;
      margin:0 0 8px!important;
    }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-actions]:has(> .pokemon-card__action:nth-child(5)) {
      grid-template-columns:repeat(3,minmax(0,1fr))!important;
    }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-actions] .pokemon-card__action {
      min-width:0!important;
      min-height:32px!important;
      padding:4px 6px!important;
      overflow-wrap:anywhere;
      font-size:10px!important;
      font-weight:700!important;
      line-height:1.05!important;
      white-space:normal!important;
    }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__meters {
      display:grid!important;
      gap:7px!important;
      margin:0 0 8px!important;
      padding:8px!important;
    }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__meter-head {
      display:flex;
      gap:8px;
      align-items:baseline;
      justify-content:space-between;
      min-width:0;
      font-size:10px!important;
      line-height:1.2!important;
    }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__meter-head > :first-child {
      color:#a6aa9f!important;
      font-weight:700!important;
      letter-spacing:.04em;
      text-transform:uppercase;
    }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__meter-head b {
      min-width:0;
      overflow:hidden;
      color:#eef1df!important;
      font:700 11px/1.2 var(--ppbui-font-data)!important;
      font-variant-numeric:tabular-nums;
      text-align:right;
      text-overflow:ellipsis;
      white-space:nowrap;
    }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__track {
      height:8px!important;
    }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__section {
      gap:7px!important;
      margin-top:8px!important;
      padding:8px 0 0!important;
      background:transparent!important;
    }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__title {
      display:flex;
      gap:6px;
      align-items:baseline;
      min-width:0;
      margin:0!important;
      font-size:11px!important;
      line-height:1.15!important;
      letter-spacing:.06em!important;
    }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-iv] {
      border-color:#9bd589!important;
      background:rgba(111,182,88,.24)!important;
      color:#d8f5ce!important;
      font:700 10px/1 var(--ppbui-font-data)!important;
      font-variant-numeric:tabular-nums;
    }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__rows {
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:0 10px!important;
      min-width:0;
    }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__rows-col {
      display:grid!important;
      gap:0!important;
      min-width:0;
    }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__rows-col:only-child {
      grid-column:1/-1;
    }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__row {
      display:flex!important;
      gap:8px;
      min-width:0;
      min-height:26px;
      box-sizing:border-box;
      align-items:center;
      justify-content:space-between;
      padding:4px 0!important;
      font-size:10px!important;
      line-height:1.15!important;
    }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__row > :first-child {
      min-width:0;
      color:#a6aa9f!important;
    }
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__row b,
    .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__row strong {
      margin-left:auto;
      color:#eef1df;
      font:700 11px/1.1 var(--ppbui-font-data);
      font-variant-numeric:tabular-nums;
      text-align:right;
    }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-moves] {
      gap:7px!important;
    }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-move-grid] {
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:6px!important;
    }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-move] {
      grid-template-columns:30px minmax(0,1fr)!important;
      min-height:46px!important;
      padding:6px!important;
    }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-move] > img {
      width:26px!important;
      height:26px!important;
    }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-move-copy] {
      gap:3px!important;
    }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-move-copy] > strong {
      display:-webkit-box;
      overflow:hidden;
      font-size:11px!important;
      line-height:1.15!important;
      text-overflow:clip!important;
      white-space:normal!important;
      overflow-wrap:anywhere;
      -webkit-box-orient:vertical;
      -webkit-line-clamp:2;
    }
    .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-move-copy] > small {
      font-size:9.5px!important;
      line-height:1.1!important;
      opacity:.82!important;
    }
    @container ppbui-native-pokemon-card (max-width:339px) {
      .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-actions] {
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
      }
      .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__rows {
        gap:0 7px!important;
      }
    }
    @container ppbui-native-pokemon-card (max-width:239px) {
      .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-actions] {
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
      }
      .pokemon-card[data-ppbui-profile-native-card] [data-ppbui-profile-native-move-grid],
      .pokemon-card[data-ppbui-profile-native-card] .pokemon-card__rows {
        grid-template-columns:minmax(0,1fr)!important;
      }
    }
    @container (max-width:519px) {
      [data-ppbui-profile-picker-tools] { grid-template-columns:minmax(0,1fr) auto; }
      [data-ppbui-profile-sources] { grid-column:1/-1; width:100%; }
      [data-ppbui-profile-sources] button { flex:1 1 0; }
      [data-ppbui-profile-filters] { grid-template-columns:repeat(2,minmax(0,1fr)); }
      [data-ppbui-profile-filter-clear] { align-self:stretch; }
      [data-ppbui-profile-hero] { grid-template-columns:88px minmax(0,1fr); gap:var(--ppbui-space-3); }
      [data-ppbui-profile-portrait] { width:88px; height:88px; }
      [data-ppbui-profile-portrait] img { width:82px; height:82px; }
      [data-ppbui-profile-facts] { grid-template-columns:repeat(2,minmax(0,1fr)); }
      [data-ppbui-profile-fact]:nth-child(3) { border-left:0; border-top:var(--ppbui-separator-width) solid var(--ppbui-border); }
      [data-ppbui-profile-fact]:nth-child(4) { border-top:var(--ppbui-separator-width) solid var(--ppbui-border); }
      [data-ppbui-profile-team-row] { grid-template-columns:minmax(0,1fr); gap:var(--ppbui-space-2); }
      [data-ppbui-profile-saved-actions] { justify-content:flex-start; }
    }
    /* Expedition-inspired readability pass: one clear outer card per section, quieter internals. */
    [data-ppbui-profile-main] { gap:10px!important; padding:10px 2px 10px 10px!important; }
    [data-ppbui-profile-choice] { border:0!important; background:rgba(35,44,46,.96)!important; }
    [data-ppbui-profile-choice][aria-pressed="true"] { border:0!important; outline:1px solid #d2b45d; outline-offset:-1px; }
    [data-ppbui-profile-hero] { gap:12px!important; padding:12px!important; }
    [data-ppbui-profile-identity] { gap:6px!important; }
    [data-ppbui-profile-name] { font-size:19px!important; letter-spacing:-.01em; }
    [data-ppbui-profile-power] { font-size:14px!important; }
    [data-ppbui-profile-meta] { gap:4px 8px!important; }
    [data-ppbui-profile-hp] { padding-top:6px!important; }
    [data-ppbui-profile-facts] { gap:4px!important; border:0!important; background:transparent!important; }
    [data-ppbui-profile-fact] { padding:6px 8px!important; border:0!important; border-radius:var(--ppbui-radius-badge)!important; background:rgba(22,29,32,.85)!important; }
    [data-ppbui-profile-fact] small { font-size:9px!important; letter-spacing:.02em; }
    [data-ppbui-profile-fact] strong { font-size:12px!important; }

    [data-ppbui-profile-section] {
      gap:0!important;
      padding:0!important;
      overflow:hidden;
      border:1px solid #6b6543!important;
      border-radius:var(--ppbui-radius)!important;
      background:rgba(35,44,46,.96)!important;
    }
    [data-ppbui-profile-section] > header {
      min-height:36px;
      padding:0 10px;
      border-bottom:1px solid #6b6543;
      background:rgba(35,44,46,.96);
    }
    [data-ppbui-profile-section] h3 { font-size:11px!important; letter-spacing:.04em!important; }
    [data-ppbui-profile-section-body] { gap:8px!important; padding:8px!important; background:rgba(22,29,32,.92); }
    [data-ppbui-profile-current] { padding:0!important; }
    [data-ppbui-profile-current] > [data-ppbui-profile-move-list] { padding:8px!important; background:rgba(22,29,32,.92); }
    [data-ppbui-profile-current] > [data-ppbui-profile-status] { margin:8px!important; }

    [data-ppbui-profile-move-list] { grid-template-columns:repeat(4,minmax(136px,1fr))!important; gap:6px!important; padding-bottom:0!important; }
    [data-ppbui-profile-move] { padding:5px!important; border:0!important; border-radius:var(--ppbui-radius)!important; background:rgba(22,29,32,.85)!important; }
    [data-ppbui-profile-move-position] { border-color:#6b6543!important; background:rgba(35,44,46,.96)!important; }
    [data-ppbui-profile-move-position][data-ppbui-profile-move-priority="true"] { border-color:#d2b45d!important; background:#d2b45d!important; color:#171d1a!important; }
    [data-ppbui-profile-move-name] { height:26px; padding:4px 6px!important; font-size:12px; }
    [data-ppbui-profile-move-meta] { gap:3px!important; }
    [data-ppbui-profile-move-category], [data-ppbui-profile-move-cooldown] { font-weight:600!important; }

    [data-ppbui-profile-saved-list], [data-ppbui-profile-team-list] { gap:6px!important; }
    [data-ppbui-profile-saved], [data-ppbui-profile-team-row] {
      padding:8px!important;
      border:0!important;
      border-radius:var(--ppbui-radius)!important;
      background:rgba(22,29,32,.85)!important;
    }
    [data-ppbui-profile-saved][data-active="true"] { padding-left:8px!important; outline:1px solid #d2b45d; outline-offset:-1px; }
    [data-ppbui-profile-saved-head] { min-height:24px; align-items:center!important; }
    [data-ppbui-profile-saved-head] strong, [data-ppbui-profile-team-meta] strong { font-size:12px; }
    [data-ppbui-profile-saved-actions] { padding-top:2px; }
    [data-ppbui-profile-team-members] { gap:4px!important; overflow:visible!important; }
    [data-ppbui-profile-team-member] { border:0!important; border-radius:var(--ppbui-radius-badge)!important; background:rgba(35,44,46,.96)!important; }
    [data-ppbui-profile-team-member] + [data-ppbui-profile-team-member] { border-left:0!important; }
    [data-ppbui-profile-team-member][data-selected="true"] { outline:1px solid #d2b45d; outline-offset:-1px; }

    /* Element ownership: the shared icon draws the only semantic edge; wrappers are layout-only. */
    [data-ppbui-profile-choice-element], [data-ppbui-profile-type-icon], [data-ppbui-profile-move-element] {
      border:0!important;
      background:transparent!important;
    }
    [data-ppbui-profile-choice-element] .ppbui-element-icon,
    [data-ppbui-profile-type-icon] .ppbui-element-icon {
      width:20px!important;
      min-width:20px!important;
      height:20px!important;
      min-height:20px!important;
      flex-basis:20px!important;
      padding:2px!important;
    }
    [data-ppbui-profile-move-element] .ppbui-element-icon {
      width:20px!important;
      min-width:20px!important;
      height:20px!important;
      min-height:20px!important;
      flex-basis:20px!important;
      padding:2px!important;
    }
    @container (max-width:519px) {
      [data-ppbui-profile-main] { gap:8px!important; padding:8px 0 8px 8px!important; }
      [data-ppbui-profile-hero] { gap:8px!important; padding:8px!important; }
      [data-ppbui-profile-fact]:nth-child(3), [data-ppbui-profile-fact]:nth-child(4) { border:0!important; }
      [data-ppbui-profile-section] > header { min-height:34px; padding:0 8px; }
      [data-ppbui-profile-section-body], [data-ppbui-profile-current] > [data-ppbui-profile-move-list] { padding:6px!important; }
    }
    @media (pointer:coarse) { [data-ppbui-pokemon-profile-window] button, [data-ppbui-pokemon-profile-window] input, [data-ppbui-pokemon-profile-window] select { min-height:40px; } }
  `;
}

function spriteOf(doc, creature) {
  const snapshot = teamPresetMemberSnapshot(doc, creature);
  if (snapshot?.sprite) return snapshot.sprite;
  const hud = doc.querySelector(".pokeidle-team-hud");
  if (!hud || !creature?.id) return "";
  return teamPresetHudMemberVisual(hud, snapshot || { id:String(creature.id), name:pokemonName(doc, creature) })?.sprite || "";
}

function elementNames(creature) {
  return (creature?.elements || creature?.species?.elements || []).map(value => String(value || "").trim()).filter(Boolean);
}

function primaryElementColor(doc, creature) {
  const primary = elementNames(creature)[0];
  return primary ? (doc.defaultView?.PokeIdle?.ElementIcons?.definition?.(primary)?.color || "") : "";
}

function elementBadge(doc, element) {
  const node = doc.createElement("span");
  node.dataset.ppbuiProfileType = "";
  const icon = elementIconBox(doc, element, "ppbuiProfileTypeIcon");
  icon.removeAttribute("aria-label");
  icon.removeAttribute("title");
  icon.setAttribute("aria-hidden", "true");
  const key = `common.element.${element}`, translated = doc.defaultView?.PokeIdle?.t?.(key);
  const name = doc.createElement("span");
  name.dataset.ppbuiProfileTypeName = "";
  name.textContent = translated && translated !== key ? translated : element;
  node.append(icon, name);
  return node;
}

function elementIconBox(doc, element, datasetKey) {
  const icons = doc.defaultView?.PokeIdle?.ElementIcons, node = doc.createElement("span");
  node.dataset[datasetKey] = "";
  const normalized = String(element || "").trim(), definition = icons?.definition?.(normalized), color = definition?.color || "";
  if (color) node.style.setProperty("--ppbui-element-color", color);
  const key = `common.element.${normalized}`, translated = doc.defaultView?.PokeIdle?.t?.(key), label = translated && translated !== key ? translated : (definition?.label || normalized || "—");
  node.title = label; node.setAttribute("aria-label", label);
  node.append(createElementIcon(doc, icons, normalized, { small:true }));
  return node;
}

function ivTotal(creature) {
  const direct = finite(creature?.iv_total);
  if (direct !== null) return direct;
  const values = Object.values(creature?.ivs || {}).map(finite);
  return values.length === 6 && values.every(value => value !== null) ? values.reduce((sum, value) => sum + value, 0) : null;
}

function qualityKey(value) {
  return String(value || "common").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
}

function qualityLabel(doc, value) {
  const key = qualityKey(value), translationKey = `common.quality_m.${key}`, translated = doc.defaultView?.PokeIdle?.t?.(translationKey);
  return translated && translated !== translationKey ? translated : key.replace(/^./, letter => letter.toUpperCase());
}

function displayEnum(value) {
  const text = String(value || "").trim();
  return text ? text.replace(/[-_]+/g, " ").replace(/(^|\s)\S/g, token => token.toUpperCase()) : "";
}

function genderTone(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "male" || normalized === "m" || normalized === "♂") return "male";
  if (normalized === "female" || normalized === "f" || normalized === "♀") return "female";
  return "neutral";
}

function nativeCreatureLabel(doc, kind, value) {
  const card = doc.defaultView?.PokeIdle?.PokemonCard, method = kind === "gender" ? card?.genderLabel : card?.natureLabel;
  try { return typeof method === "function" ? (method(value) || displayEnum(value)) : displayEnum(value); }
  catch { return displayEnum(value); }
}

function moveCategory(copy, move) {
  const value = String(move?.category || move?.source_category || "").toLowerCase();
  return value === "physical" ? copy.movePhysical : value === "special" ? copy.moveSpecial : value ? copy.moveStatus : "—";
}

function moveCooldownValue(doc, move) {
  const ms = finite(move?.cooldown_ms);
  if (ms === null) return { visual:"—", accessible:"—" };
  const locale = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || undefined;
  const seconds = ms / 1000;
  const visual = seconds.toLocaleString(locale, { maximumFractionDigits:1 });
  return { visual, accessible:`${visual}s` };
}

function sourceLabel(copy, creature) { return creature?.__ppbuiSource === "team" ? copy.activeTeam : copy.inBackpack; }

export function mountPokemonProfile(doc = document, { teamPresetStore, movesetStore } = {}) {
  const win = doc.defaultView, movesStore = movesetStore || createTeamMovesetStorage({ storage: () => win.localStorage }), teamsStore = teamPresetStore || createTeamPresetStorage({ storage: () => win.localStorage });
  const style = doc.createElement("style"); style.dataset.ppbuiModule = PROFILE_ID; style.textContent = styleText(); doc.head.append(style);
  let menu = null, menuLabel = null;

  const root = doc.createElement("section"); root.className = "ppbui-root ppbui-window"; root.dataset.ppbuiPokemonProfileWindow = ""; root.hidden = true; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "false");
  const titlebar = doc.createElement("header"); titlebar.dataset.ppbuiProfileTitlebar = "";
  const titleIdentity = doc.createElement("div"); titleIdentity.dataset.ppbuiProfileTitleIdentity = "";
  const titleIcon = profileIcon(); titleIcon.dataset.ppbuiProfileTitleIcon = "";
  const title = doc.createElement("h2"); title.dataset.ppbuiProfileTitle = ""; title.id = "ppbui-pokemon-profile-title"; root.setAttribute("aria-labelledby", title.id);
  const close = doc.createElement("button"); close.type = "button"; close.className = "ppbui-button ppbui-icon-button"; close.dataset.ppbuiProfileClose = ""; close.textContent = "×";
  titleIdentity.append(titleIcon, title); titlebar.append(titleIdentity, close);
  const body = doc.createElement("div"); body.dataset.ppbuiProfileBody = ""; body.className = "ppbui-scroll";
  const picker = doc.createElement("section"); picker.dataset.ppbuiProfilePicker = "";
  const pickerTools = doc.createElement("div"); pickerTools.dataset.ppbuiProfilePickerTools = "";
  const sources = doc.createElement("div"); sources.dataset.ppbuiProfileSources = ""; sources.setAttribute("role", "group");
  const sourceButtons = new Map(["all","team","backpack"].map(key => { const button=doc.createElement("button"); button.type="button"; button.className="ppbui-button"; button.dataset.source=key; sources.append(button); return [key,button]; }));
  const search = doc.createElement("input"); search.type = "search"; search.className = "ppbui-input"; search.dataset.ppbuiProfileSearch = "";
  const refresh = doc.createElement("button"); refresh.type = "button"; refresh.className = "ppbui-button"; refresh.dataset.ppbuiProfileRefresh = "";
  pickerTools.append(sources, search, refresh);
  const filterRail = doc.createElement("div"); filterRail.dataset.ppbuiProfileFilters = ""; filterRail.setAttribute("role","group");
  const filterControls = new Map(), filterLabels = new Map(), filterFields = new Map(), filterErrors = new Map();
  const filterField = (key, control) => { const label=doc.createElement("label");label.dataset.ppbuiProfileFilterField="";const caption=doc.createElement("span");filterLabels.set(key,caption);filterFields.set(key,label);control.dataset.ppbuiProfileFilter=key;label.append(caption,control);filterControls.set(key,control);filterRail.append(label);return control; };
  const filterSelect = key => { const select=doc.createElement("select");select.className="ppbui-select";return filterField(key,select); };
  const rarityFilter=filterSelect("rarity"),elementFilter=filterSelect("element"),minLevelFilter=doc.createElement("input"),maxLevelFilter=doc.createElement("input");
  for(const input of [minLevelFilter,maxLevelFilter]){input.type="number";input.min="1";input.step="1";input.className="ppbui-input";}
  filterField("minLevel",minLevelFilter);filterField("maxLevel",maxLevelFilter);
  for(const [key,input] of [["minLevel",minLevelFilter],["maxLevel",maxLevelFilter]]){const error=doc.createElement("span");error.id=`ppbui-profile-${key}-error`;error.dataset.ppbuiProfileFilterError=key;error.hidden=true;filterFields.get(key).append(error);filterErrors.set(key,error);input.setAttribute("aria-describedby",error.id);}
  const tagFilter=filterSelect("tags");
  const clearFilters=doc.createElement("button");clearFilters.type="button";clearFilters.className="ppbui-button";clearFilters.dataset.ppbuiProfileFilterClear="";filterRail.append(clearFilters);
  const list = doc.createElement("div"); list.dataset.ppbuiProfileList = ""; list.className = "ppbui-scroll"; list.setAttribute("role", "group");
  const pickerState = doc.createElement("p"); pickerState.dataset.ppbuiProfilePickerState = ""; pickerState.setAttribute("role","status"); pickerState.setAttribute("aria-live","polite");
  picker.append(pickerTools, filterRail, list, pickerState);
  const main = doc.createElement("div"); main.dataset.ppbuiProfileMain = "";
  body.append(picker, main); root.append(titlebar, body); doc.body.append(root);

  let alive = true, opened = false, owned = [], selectedId = "", source = "all", filters = freshFilters(), filterCopySignature = "", loadEpoch = 0, selectionEpoch = 0, openEpoch = 0, busy = false, profileOrigin = null, teamStoreSignature = "", configureMovesAvailable = null, dragState = null, dragPositioned = false;
  const speciesCache = new Map(), movesCache = new Map(), detailCache = new Map(), collapseState = new Map(), choiceNodes = new Map();
  const tags = tagService(win);
  const nativeCardCreatures = new WeakMap(), nativeCardHydrationEpoch = new WeakMap();
  const nativeCardSelector = ".pokemon-card--hover,.pokemon-card--pinned,.pokemon-card--sheet";
  let nativeCardOwner = null, nativeCardOriginalRender = null, nativeCardRenderWrapper = null, nativeCardToken = 0;

  const copy = () => pokemonProfileText(doc);
  const setText = (node, value) => {
    if (!node) return;
    const next = String(value ?? "");
    if (node.textContent !== next) node.textContent = next;
  };
  const setAttr = (node, name, value) => {
    if (!node) return;
    const next = String(value ?? "");
    if (node.getAttribute(name) !== next) node.setAttribute(name, next);
  };
  const setProp = (node, name, value) => {
    if (node && node[name] !== value) node[name] = value;
  };
  function profileIcon() {
    const image = doc.createElement("img");
    image.src = typeof __PPBUI_POKE_PROFILE_ICON__ === "string"
      ? __PPBUI_POKE_PROFILE_ICON__
      : "/assets/menu-poke-profile-icon.png";
    image.alt = "";
    image.draggable = false;
    image.setAttribute("aria-hidden", "true");
    return image;
  }
  function menuIcon() {
    const image = profileIcon();
    image.className = "pokeidle-top-toolbar__icon";
    return image;
  }
  function ensureMenu() {
    if (menu?.isConnected) return menu;
    menu?.remove(); menu = menuLabel = null;
    const toolbar = doc.querySelector(".pokeidle-top-toolbar");
    if (!toolbar) return null;
    const menuSource = toolbar.querySelector('button[data-menu-id="team"]') || toolbar.querySelector("button[data-menu-id]");
    menu = doc.createElement("button"); menu.className = menuSource?.className || "pokeidle-top-toolbar__btn";
    menu.type = "button"; menu.dataset.menuId = PROFILE_ID; menu.dataset.ppbuiPokemonProfileMenu = "";
    menuLabel = doc.createElement("span"); menuLabel.className = "pokeidle-top-toolbar__label"; menu.append(menuIcon(), menuLabel);
    menu.addEventListener("click",()=>open()); toolbar.append(menu); return menu;
  }
  function syncCopy() {
    const text = copy(); setText(title, text.title); setProp(close, "title", text.close); setAttr(close, "aria-label", text.close); ensureMenu(); setText(menuLabel, text.name); setAttr(menu, "aria-label", text.name);
    setProp(search, "placeholder", text.search); setAttr(search, "aria-label", text.search); setText(refresh, text.refresh); setAttr(sources,"aria-label",text.source); setAttr(filterRail,"aria-label",text.filters); setAttr(list,"aria-label",text.pokemonList);
    for (const [key, button] of sourceButtons) setText(button, text[key]);
    for(const key of ["rarity","element","minLevel","maxLevel","tags"])setText(filterLabels.get(key),text[key]);for(const error of filterErrors.values())setText(error,text.levelInvalid);setText(clearFilters,text.clearFilters);
    const rarityOptions=pokemonRarities.map(value=>[value,win?.PokeIdle?.t?.(`common.quality_m.${value}`)||value]),elementOptions=pokemonElements.map(value=>[value,win?.PokeIdle?.t?.(`common.element.${value}`)||value]),tagOptions=[["untagged",text.untagged],...fixedTags.map(tag=>[tag.id,`${tag.icon} ${tag.name}`])];
    const signature=JSON.stringify([text.all,text.untagged,rarityOptions,elementOptions,tagOptions]);
    if(signature!==filterCopySignature){const fill=(select,values,current)=>{select.replaceChildren();for(const [value,label] of [["",text.all],...values]){const option=doc.createElement("option");option.value=value;option.textContent=label;select.append(option);}select.value=current;};fill(rarityFilter,rarityOptions,filters.rarity);fill(elementFilter,elementOptions,filters.element);fill(tagFilter,tagOptions,filters.tags[0]||"");filterCopySignature=signature;for(const creature of owned){const node=choiceNodes.get(String(creature.id));if(node)syncChoiceNode(node,creature);}}
    const canConfigureMoves=typeof win?.PokeIdle?.MovesetConfig?.open==="function";
    if(canConfigureMoves!==configureMovesAvailable){root.querySelectorAll("[data-ppbui-profile-configure-moves]").forEach(button=>setProp(button,"disabled",!canConfigureMoves));configureMovesAvailable=canConfigureMoves;}
  }

  async function enrichCreature(creature) {
    const speciesId = String(creature?.species_id ?? creature?.species?.id ?? creature?.species?.species_id ?? "").trim();
    const api = win?.PokeIdle?.Api;
    if (!speciesId || typeof api?.getSpecies !== "function") return creature;
    if (!speciesCache.has(speciesId)) speciesCache.set(speciesId, Promise.resolve().then(() => api.getSpecies(speciesId)));
    const promise=speciesCache.get(speciesId);let response;
    try{response=await promise;}catch{if(speciesCache.get(speciesId)===promise)speciesCache.delete(speciesId);return creature;}
    const species = response?.data || response;
    return species && typeof species === "object" ? { ...creature, species:{ ...(creature?.species || {}), ...species } } : creature;
  }

  async function readMoves(id, force = false) {
    if (!force && movesCache.has(id)) return movesCache.get(id);
    const promise = Promise.resolve(readNativeMoveset(win, id)); movesCache.set(id, promise);
    try { return await promise; } catch (error) { if (movesCache.get(id) === promise) movesCache.delete(id); throw error; }
  }

  async function readCardDetail(creature) {
    const loader = win?.PokeIdle?.PokemonCardData?.loadDetail, id = String(creature?.id || ""), speciesId = String(creature?.species_id || creature?.species?.id || "");
    if (!id || typeof loader !== "function") return null;
    const cacheKey = `${id}\u001f${speciesId}`;
    if (!detailCache.has(cacheKey)) detailCache.set(cacheKey, Promise.resolve(loader(id, speciesId, creature)).catch(() => null));
    return detailCache.get(cacheKey);
  }

  function addMoveMetadata(map, entry) {
    const raw = entry?.move && typeof entry.move === "object" ? entry.move : entry;
    const id = String(raw?.id || entry?.id || "").trim(); if (!id) return;
    const previous = map.get(id) || { id }, next = { ...previous, id };
    const name = String(raw?.name || entry?.name || "").trim(), element = String(raw?.element || entry?.element || "").trim();
    if (name) next.name = name; if (element) next.element = element;
    const power = finite(raw?.power ?? entry?.power); if (power !== null) next.power = power;
    const category = String(raw?.category || raw?.source_category || entry?.category || entry?.source_category || "").trim(); if (category) next.category = category;
    const cooldownMs = finite(raw?.cooldown_ms ?? entry?.cooldown_ms); if (cooldownMs !== null) next.cooldown_ms = cooldownMs;
    const effectKind = String(raw?.effect_kind || entry?.effect_kind || "").trim(); if (effectKind) next.effect_kind = effectKind;
    map.set(id, next);
  }

  async function moveMetadata(creature, current, detail = null) {
    const map = new Map();
    for (const entry of [...(current?.raw?.selected || []), ...(current?.raw?.available || []), ...(current?.moves || []), ...(current?.available || [])]) addMoveMetadata(map, entry);
    const id = String(creature?.id || "");
    const relevantIds = new Set([
      ...(current?.moves || []).map(move => String(move?.id || "")).filter(Boolean),
      ...movesStore.list(id).flatMap(preset => (preset?.moves || []).map(move => String(move?.id || "")).filter(Boolean)),
    ]);
    const needsDetail = [...relevantIds].some(moveId => {
      const move = map.get(moveId);
      return finite(move?.power) === null || !String(move?.category || "").trim() || finite(move?.cooldown_ms) === null;
    });
    const resolvedDetail = detail || (needsDetail ? await readCardDetail(creature) : null);
    if (resolvedDetail) for (const entry of resolvedDetail?.moves || []) addMoveMetadata(map, entry);
    return map;
  }

  const enrichedMoves = (moves, metadata) => (moves || []).map(move => {
    const meta = metadata.get(String(move?.id || "")) || {};
    return {
      ...meta, ...move,
      power:meta.power ?? move?.power,
      category:meta.category || move?.category || move?.source_category || "",
      cooldown_ms:meta.cooldown_ms ?? move?.cooldown_ms,
      effect_kind:meta.effect_kind || move?.effect_kind || "",
    };
  });

  function filteredOwned() {
    const query = search.value.trim().toLocaleLowerCase();
    const store=tags.get(), assigned=store?.get()?.assigned||{};
    return owned.filter(creature => (source === "all" || creature.__ppbuiSource === source)
      && (!query || pokemonName(doc, creature).toLocaleLowerCase().includes(query))
      && matchesPokemon(creature,filters,assigned[String(creature.id)]||[]));
  }

  function syncChoiceNode(button,creature) {
    const text = copy(), id = String(creature.id);button.dataset.creatureId=id;setAttr(button,"aria-pressed",String(id===selectedId));
    const color=primaryElementColor(doc,creature);if(color)button.style.setProperty("--ppbui-profile-element-color",color);else button.style.removeProperty("--ppbui-profile-element-color");
    const visual=doc.createElement("span"); visual.dataset.ppbuiProfileChoiceVisual=""; const sprite=spriteOf(doc,creature);
    if(sprite){const image=doc.createElement("img");image.src=sprite;image.alt="";visual.append(image);} else visual.textContent=pokemonName(doc,creature).slice(0,3).toUpperCase();
    const name=doc.createElement("span");name.dataset.ppbuiProfileChoiceName="";name.textContent=pokemonName(doc,creature);name.title=name.textContent;
    const elements=doc.createElement("span");elements.dataset.ppbuiProfileChoiceElements="";for(const element of elementNames(creature).slice(0,2))elements.append(elementIconBox(doc,element,"ppbuiProfileChoiceElement"));const quality=String(creature.quality||"").trim(),rarityWrap=doc.createElement("span"),rarity=doc.createElement("span");rarityWrap.dataset.ppbuiProfileChoiceRarity="";rarity.className=`ppbui-quality-badge${quality?` quality-${qualityKey(quality)}`:""}`;rarity.textContent=quality?qualityLabel(doc,quality):"—";rarityWrap.append(rarity);
    const stats=doc.createElement("span");stats.dataset.ppbuiProfileChoiceStats="";const level=finite(creature.level);stats.textContent=level!==null?`${text.level}${level}`:"—";
    button.replaceChildren(visual,name,elements,rarityWrap,stats);return button;
  }

  function ensureChoiceNode(creature) {
    const id=String(creature.id);let node=choiceNodes.get(id);
    if(!node){node=doc.createElement("button");node.type="button";node.className="ppbui-button";node.dataset.ppbuiProfileChoice="";choiceNodes.set(id,node);}
    return syncChoiceNode(node,creature);
  }

  function reconcileChoiceNodes() {
    const ids=new Set(owned.map(creature=>String(creature.id)));
    for(const [id,node] of choiceNodes){if(ids.has(id))continue;node.remove();choiceNodes.delete(id);}
    for(const creature of owned)ensureChoiceNode(creature);
  }

  function syncPickerSelection(){for(const [id,node] of choiceNodes)setAttr(node,"aria-pressed",String(id===selectedId));}

  function renderPicker({ preserveFocus=false }={}) {
    const text=copy(),focused=preserveFocus&&doc.activeElement?.matches?.("[data-ppbui-profile-choice]")?doc.activeElement:null; sourceButtons.forEach((button,key)=>setAttr(button,"aria-pressed",String(key===source)));setProp(clearFilters,"disabled",!filters.rarity&&!filters.element&&!minLevelFilter.value&&!maxLevelFilter.value&&!filters.tags.length);const filtered=filteredOwned(),fragment=doc.createDocumentFragment();
    for(const creature of filtered)fragment.append(ensureChoiceNode(creature));list.replaceChildren(fragment);if(focused?.isConnected)focused.focus({preventScroll:true});setText(pickerState,filtered.length ? "" : (owned.length ? text.none : pickerState.textContent));
  }

  function moveItem(move, index, { hover = false, slotSetting = null } = {}) {
    const text=copy();
    const item=doc.createElement("li");item.dataset.ppbuiProfileMove="";if(hover)item.dataset.ppbuiProfileHoverMove="";item.dataset.empty=String(!move);
    const position=doc.createElement("span");position.dataset.ppbuiProfileMovePosition="";position.textContent=String(index+1);const priority=Boolean(slotSetting?.use_as_priority);position.dataset.ppbuiProfileMovePriority=String(priority);if(priority){const key="moveset.priority",translated=String(win?.PokeIdle?.t?.(key)||"").trim(),label=translated&&translated!==key?translated:"Use as priority";position.title=label;position.setAttribute("aria-label",`${index+1}. ${label}`);}
    const name=doc.createElement("span");name.dataset.ppbuiProfileMoveName="";name.textContent=move?.name||move?.id||"—";item.append(position,name);
    if(move){
      const meta=doc.createElement("span");meta.dataset.ppbuiProfileMoveMeta="";
      const element=elementIconBox(doc,String(move.element||""),"ppbuiProfileMoveElement");
      const category=doc.createElement("span");category.dataset.ppbuiProfileMoveCategory="";category.textContent=moveCategory(text,move);
      const separator=()=>{const node=doc.createElement("span");node.dataset.ppbuiProfileMoveSeparator="";node.textContent="·";node.setAttribute("aria-hidden","true");return node;};
      const cooldown=doc.createElement("span"),cooldownValue=moveCooldownValue(doc,move),cooldownLabel=`${text.moveCooldown} ${cooldownValue.accessible}`;cooldown.dataset.ppbuiProfileMoveCooldown="";cooldown.textContent=cooldownValue.accessible;cooldown.title=cooldownLabel;cooldown.setAttribute("aria-label",cooldownLabel);
      const power=doc.createElement("span"),powerValue=finite(move.power),powerText=powerValue!==null?powerValue.toLocaleString():"—",powerLabel=`${text.power} ${powerText}`;power.dataset.ppbuiProfileMovePower="";power.textContent=powerText;power.title=powerLabel;power.setAttribute("aria-label",powerLabel);
      meta.append(element,category,separator(),cooldown,separator(),power);
      const thresholdValue=finite(slotSetting?.heal_threshold_pct),isHeal=String(move.effect_kind||"").trim().toLowerCase()==="heal";
      if(isHeal&&thresholdValue!==null&&thresholdValue>=1&&thresholdValue<=100){const threshold=doc.createElement("span"),pct=Math.round(thresholdValue),key="moveset.heal_threshold",translated=String(win?.PokeIdle?.t?.(key)||"").trim(),label=translated&&translated!==key?translated:"Use when remaining HP ≤";threshold.dataset.ppbuiProfileMoveThreshold="";threshold.textContent=`${pct}%`;threshold.title=`${label} ${pct}%`;threshold.setAttribute("aria-label",`${label} ${pct}%`);meta.append(separator(),threshold);}
      item.append(meta);
    }
    return item;
  }

  function moveList(moves, { compact = false, label = "", hover = false, slotSettings = null } = {}) {
    const listNode=doc.createElement("ol"); listNode.dataset.ppbuiProfileMoveList="";listNode.className="ppbui-scroll ppbui-focusable";listNode.tabIndex=0;if(label)listNode.setAttribute("aria-label",label);
    for(let index=0;index<4;index+=1)listNode.append(moveItem(moves[index]||null,index,{hover,slotSetting:Array.isArray(slotSettings)?slotSettings[index]:null}));
    return listNode;
  }

  function button(label, classes="") { const node=doc.createElement("button");node.type="button";node.className=`ppbui-button ${classes}`.trim();node.textContent=label;return node; }
  function statusNode(message="",error=false){const node=doc.createElement("p");node.dataset.ppbuiProfileStatus="";node.dataset.error=String(error);node.setAttribute("role","status");node.setAttribute("aria-live","polite");node.textContent=message;return node;}
  function parkFocused(node){if(doc.activeElement!==node)return false;main.tabIndex=-1;main.focus({preventScroll:true});return true;}
  function savedRowById(presetId){return [...main.querySelectorAll("[data-ppbui-profile-saved]")].find(row=>row.dataset.presetId===String(presetId))||null;}
  function restoreSavedActionFocus(presetId,action,fallbackPresetId=""){const rows=[presetId,fallbackPresetId].filter(Boolean).map(savedRowById).filter(Boolean);let target=null;for(const row of rows){target=row.querySelector(`[data-ppbui-profile-saved-action="${action}"]:not(:disabled)`)||row.querySelector("[data-ppbui-profile-saved-action]:not(:disabled)");if(target)break;}target=target||main.querySelector("[data-ppbui-profile-save-current], [data-ppbui-profile-preset-name], [data-ppbui-profile-collapse='savedMoves']");target?.focus?.({preventScroll:true});}

  function collapsed(id,key){return Boolean(collapseState.get(id)?.[key]);}
  function bindCollapse(toggle,bodyNode,id,key,collapseLabel,expandLabel){
    const sync=()=>{const isCollapsed=collapsed(id,key),label=isCollapsed?expandLabel:collapseLabel;bodyNode.hidden=isCollapsed;toggle.setAttribute("aria-expanded",String(!isCollapsed));toggle.textContent=isCollapsed?"+":"−";toggle.title=label;toggle.setAttribute("aria-label",label);};
    toggle.addEventListener("click",()=>{const state={...(collapseState.get(id)||{})};state[key]=!collapsed(id,key);collapseState.set(id,state);sync();});sync();
  }

  function errorText(result){const text=copy();return text.errors[result?.reason]||result?.reason||text.movesError;}

  async function saveCurrent(id,input,status,trigger) {
    if(!alive||busy)return; const text=copy(),name=input.value.trim(); if(!name){status.textContent=text.errors["name-required"];status.dataset.error="true";return;}
    busy=true;status.textContent=text.saving;status.dataset.error="false";const result=await captureTeamMoveset(win,id);busy=false;if(!alive||selectedId!==id)return;
    if(!result?.ok){status.textContent=errorText(result);status.dataset.error="true";return;}
    const saved=movesStore.upsert(id,name,result.snapshot); if(!saved){status.textContent=text.errors["preset-invalid"];status.dataset.error="true";} else if(saved.duplicateLoadout){status.textContent=text.duplicate(saved.preset.name);status.dataset.error="true";} else {input.value="";status.textContent=saved.created?text.saved:text.updated;status.dataset.error="false";movesCache.set(id,Promise.resolve(result.current));}
    const restore=parkFocused(trigger),restoreInput=trigger===input;await renderSelected(id,true);if(restore)(restoreInput?main.querySelector("[data-ppbui-profile-preset-name]"):main.querySelector("[data-ppbui-profile-save-current]"))?.focus?.({preventScroll:true});
  }

  function renderSavedMoves(container,id,current,metadata=new Map()) {
    const text=copy(),presets=movesStore.list(id),currentSig=movesetSignature(current);
    if(!presets.length){container.append(statusNode(text.noSavedMoves));return;}
    for(const preset of presets){const active=Boolean(currentSig&&movesetSignature(preset)===currentSig),row=doc.createElement("article");row.dataset.ppbuiProfileSaved="";row.dataset.presetId=String(preset.id);row.dataset.active=String(active);
      const head=doc.createElement("div");head.dataset.ppbuiProfileSavedHead="";const token=doc.createElement("span");token.textContent=movesetBadgeLabel(preset.marker);const name=doc.createElement("strong");name.textContent=preset.name;head.append(token,name);if(active){const mark=doc.createElement("span");mark.textContent=text.active;mark.style.color="var(--ppbui-success-text)";head.append(mark);}
      const ordered=moveList(enrichedMoves(preset.moves,metadata),{compact:true,label:`${text.savedMoves}: ${preset.name}`}); const actions=doc.createElement("div");actions.dataset.ppbuiProfileSavedActions="";
      const apply=button(text.apply,"ppbui-button--primary"),update=button(text.update),remove=button(text.remove,"ppbui-button--danger");apply.dataset.ppbuiProfileSavedAction="apply";update.dataset.ppbuiProfileSavedAction="update";remove.dataset.ppbuiProfileSavedAction="remove";apply.disabled=busy||active;update.disabled=busy;remove.disabled=busy;
      apply.addEventListener("click",async()=>{if(!alive||busy||selectedId!==id)return;busy=true;const result=await applyTeamMoveset(win,id,preset);busy=false;if(!alive||selectedId!==id)return;if(result?.ok)movesCache.set(id,Promise.resolve(result.current));const restore=parkFocused(apply);await renderSelected(id,true,result?.ok?text.applied:errorText(result),!result?.ok);if(restore)restoreSavedActionFocus(preset.id,"apply");});
      update.addEventListener("click",async()=>{if(!alive||busy||selectedId!==id)return;busy=true;const result=await captureTeamMoveset(win,id);busy=false;if(!alive||selectedId!==id)return;if(result?.ok){movesStore.replaceSnapshot(preset.id,id,result.snapshot);movesCache.set(id,Promise.resolve(result.current));}const restore=parkFocused(update);await renderSelected(id,true,result?.ok?text.updated:errorText(result),!result?.ok);if(restore)restoreSavedActionFocus(preset.id,"update");});
      remove.addEventListener("click",async()=>{if(!alive||busy||selectedId!==id)return;if(typeof win?.confirm!=="function"||!win.confirm(`${text.remove}: ${preset.name}?`))return;const fallback=row.nextElementSibling?.dataset?.presetId||row.previousElementSibling?.dataset?.presetId||"";const restore=parkFocused(remove);movesStore.remove(preset.id,id);await renderSelected(id,true,text.removed,false);if(restore)restoreSavedActionFocus(preset.id,"remove",fallback);});
      actions.append(apply,update,remove);row.append(head,ordered,actions);container.append(row);
    }
  }

  function renderTeams(container,id) {
    const text=copy(),presets=teamsStore.list().filter(preset=>preset.members.some(member=>String(member.id)===id));
    if(!presets.length){container.append(statusNode(text.noSavedTeams));return;}
    for(const preset of presets){const selectedIndex=preset.members.findIndex(member=>String(member.id)===id),row=doc.createElement("article");row.dataset.ppbuiProfileTeamRow="";
      const meta=doc.createElement("div");meta.dataset.ppbuiProfileTeamMeta="";const name=doc.createElement("strong");name.textContent=preset.name;const pos=doc.createElement("span");pos.textContent=`#${selectedIndex+1}/${preset.members.length}`;meta.append(name,pos);if(String(preset.activeId)===id){const active=doc.createElement("span");active.textContent=text.active;active.style.color="var(--ppbui-success-text)";meta.append(active);}
      const members=doc.createElement("div");members.dataset.ppbuiProfileTeamMembers="";members.setAttribute("role","list");members.setAttribute("aria-label",preset.name);for(let index=0;index<6;index++){const member=preset.members[index],cell=doc.createElement("span");cell.dataset.ppbuiProfileTeamMember="";if(member){const memberName=String(member.name||"Pokémon"),selected=String(member.id)===id,active=String(member.id)===String(preset.activeId);cell.dataset.selected=String(selected);cell.setAttribute("role","listitem");cell.setAttribute("aria-label",active?`${memberName}, ${text.active}`:memberName);cell.title=memberName;if(selected)cell.setAttribute("aria-current","true");if(member.elementColor)cell.style.setProperty("--ppbui-member-element-color",member.elementColor);const sprite=member.sprite;if(sprite){const image=doc.createElement("img");image.src=sprite;image.alt="";cell.append(image);}else cell.textContent=memberName.slice(0,3).toUpperCase();}else cell.setAttribute("aria-hidden","true");members.append(cell);}row.append(meta,members);container.append(row);}
  }

  async function renderSelected(id, forceMoves=false, message="", messageError=false) {
    const epoch=++selectionEpoch,text=copy(),base=owned.find(creature=>String(creature.id)===id); if(!base){main.replaceChildren(statusNode(text.none,true));return;}
    main.replaceChildren(statusNode(text.movesLoading));
    let creature=base,current=null,moveError=false; try{[creature,current]=await Promise.all([enrichCreature(base),readMoves(id,forceMoves)]);}catch{moveError=true;creature=await enrichCreature(base);} if(!alive||selectedId!==id||epoch!==selectionEpoch)return;
    const detail=await readCardDetail(creature);if(!alive||selectedId!==id||epoch!==selectionEpoch)return;
    if(detail?.creature&&typeof detail.creature==="object"){const fresh=detail.creature;creature={...creature,...fresh,species:{...(creature?.species||{}),...(fresh?.species||{})},__ppbuiSource:base.__ppbuiSource};}
    const ownedIndex=owned.findIndex(entry=>String(entry.id)===id);if(ownedIndex>=0&&creature!==base){const visibleBefore=[...list.children].map(node=>node.dataset.creatureId).join("\u0000");owned[ownedIndex]={...creature,__ppbuiSource:base.__ppbuiSource};creature=owned[ownedIndex];ensureChoiceNode(creature);const visibleAfter=filteredOwned().map(entry=>String(entry.id)).join("\u0000");if(visibleAfter!==visibleBefore)renderPicker({preserveFocus:true});else syncPickerSelection();}
    const metadata=!moveError&&current?await moveMetadata(creature,current,detail):new Map();if(!alive||selectedId!==id||epoch!==selectionEpoch)return;
    const hero=doc.createElement("section");hero.dataset.ppbuiProfileHero="";const elementColor=primaryElementColor(doc,creature);if(elementColor)hero.style.setProperty("--ppbui-profile-element-color",elementColor);const portrait=doc.createElement("div");portrait.dataset.ppbuiProfilePortrait="";const sprite=spriteOf(doc,creature);if(sprite){const image=doc.createElement("img");image.src=sprite;image.alt="";portrait.append(image);}else portrait.textContent=pokemonName(doc,creature).slice(0,3).toUpperCase();
    const identity=doc.createElement("div");identity.dataset.ppbuiProfileIdentity="";const identityHead=doc.createElement("div");identityHead.dataset.ppbuiProfileIdentityHead="";const name=doc.createElement("h3");name.dataset.ppbuiProfileName="";name.textContent=pokemonName(doc,creature);const power=doc.createElement("span");power.dataset.ppbuiProfilePower="";const powerValue=finite(creature.power);power.textContent=powerValue!==null?`${text.power} ${powerValue.toLocaleString()}`:`${text.power} —`;identityHead.append(name,power);
    const meta=doc.createElement("div");meta.dataset.ppbuiProfileMeta="";const level=doc.createElement("span");const levelValue=finite(creature.level);level.textContent=levelValue!==null?`${text.level}${levelValue}`:"—";meta.append(level);for(const element of elementNames(creature))meta.append(elementBadge(doc,element));const origin=doc.createElement("span");origin.textContent=`${text.source}: ${sourceLabel(text,creature)}`;meta.append(origin);
    const hp=doc.createElement("div");hp.dataset.ppbuiProfileHp="";const hpLabel=doc.createElement("span");hpLabel.textContent=text.hp;const track=doc.createElement("span");track.dataset.ppbuiProfileHpTrack="";track.setAttribute("role","progressbar");track.setAttribute("aria-label",text.hp);const fill=doc.createElement("i");fill.dataset.ppbuiProfileHpFill="";const hpValue=finite(creature.hp),maxHp=finite(creature.max_hp),percent=hpValue!==null&&maxHp>0?Math.max(0,Math.min(100,Math.round(hpValue/maxHp*100))):0;fill.style.width=`${percent}%`;track.append(fill);const hpText=doc.createElement("span"),hpValueText=hpValue!==null&&maxHp!==null?`${hpValue.toLocaleString()} / ${maxHp.toLocaleString()}`:"—";hpText.textContent=hpValueText;track.setAttribute("aria-valuetext",hpValueText);if(hpValue!==null&&maxHp>0){track.setAttribute("aria-valuemin","0");track.setAttribute("aria-valuemax",String(maxHp));track.setAttribute("aria-valuenow",String(Math.max(0,Math.min(maxHp,hpValue))));}hp.append(hpLabel,track,hpText);identity.append(identityHead,meta,hp);hero.append(portrait,identity);
    const facts=doc.createElement("div");facts.dataset.ppbuiProfileFacts="";const fact=(label,value,key,decorate)=>{const node=doc.createElement("div");node.dataset.ppbuiProfileFact=key;const caption=doc.createElement("small");caption.textContent=label;const strong=doc.createElement("strong");strong.textContent=value||"—";decorate?.(strong);node.append(caption,strong);facts.append(node);};const quality=String(creature.quality||"").trim(),iv=ivTotal(creature);fact(text.rarityFact,quality?qualityLabel(doc,quality):"—","rarity",strong=>{if(quality)strong.className=`ppbui-quality-badge quality-${qualityKey(quality)}`;});fact(text.gender,nativeCreatureLabel(doc,"gender",creature.gender),"gender",strong=>{strong.dataset.genderTone=genderTone(creature.gender);});fact(text.nature,nativeCreatureLabel(doc,"nature",creature.nature),"nature");fact(text.iv,iv!==null?`${iv}/${IV_MAX_TOTAL}`:`—/${IV_MAX_TOTAL}`,"iv");identity.append(facts);
    const currentSection=doc.createElement("section");currentSection.dataset.ppbuiProfileSection="";currentSection.dataset.ppbuiProfileCurrent="";const currentHeader=doc.createElement("header");const currentTitle=doc.createElement("h3");currentTitle.textContent=text.currentMoves;const currentActions=doc.createElement("div");currentActions.dataset.ppbuiProfileSectionActions="";const configure=button(text.configureMoves,"ppbui-button--primary");configure.dataset.ppbuiProfileConfigureMoves="";configure.disabled=typeof win?.PokeIdle?.MovesetConfig?.open!=="function";currentActions.append(configure);currentHeader.append(currentTitle,currentActions);currentSection.append(currentHeader);
    currentSection.tabIndex=-1; currentSection.setAttribute("aria-label",text.currentMoves);
    if(moveError){const state=statusNode(text.movesError,true),retry=button(text.retry);retry.addEventListener("click",async()=>{const keepFocus=doc.activeElement===retry;main.tabIndex=-1;if(keepFocus)main.focus({preventScroll:true});await renderSelected(id,true);if(keepFocus){const next=main.querySelector("[data-ppbui-profile-current]");next?.focus({preventScroll:true});}});currentSection.append(state,retry);}else if(!current?.moves?.length)currentSection.append(statusNode(text.noMoves));else currentSection.append(moveList(enrichedMoves(current.moves,metadata),{label:text.currentMoves,slotSettings:current.raw?.slot_settings}));
    configure.addEventListener("click",()=>{if(!alive||selectedId!==id)return;const nativeMoveset=win?.PokeIdle?.MovesetConfig;if(typeof nativeMoveset?.open!=="function"){configure.disabled=true;return;}nativeMoveset.open.call(nativeMoveset,id);});
    const savedSection=doc.createElement("section");savedSection.dataset.ppbuiProfileSection="";const savedHeader=doc.createElement("header");const savedTitle=doc.createElement("h3");savedTitle.textContent=text.savedMoves;const savedHeadActions=doc.createElement("div");savedHeadActions.dataset.ppbuiProfileSectionActions="";const savedToggle=button("−","ppbui-icon-button");savedToggle.dataset.ppbuiProfileCollapse="savedMoves";savedHeadActions.append(savedToggle);savedHeader.append(savedTitle,savedHeadActions);const savedBody=doc.createElement("div");savedBody.dataset.ppbuiProfileSectionBody="savedMoves";const input=doc.createElement("input");input.type="text";input.maxLength=40;input.className="ppbui-input";input.dataset.ppbuiProfilePresetName="";input.placeholder=text.presetName;input.setAttribute("aria-label",text.presetName);const save=button(text.saveCurrent);save.dataset.ppbuiProfileSaveCurrent="";const saveRow=doc.createElement("div");saveRow.dataset.ppbuiProfileSave="";const opStatus=statusNode(message,messageError);save.addEventListener("click",()=>saveCurrent(id,input,opStatus,save));input.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();saveCurrent(id,input,opStatus,input);}});saveRow.append(input,save);const savedList=doc.createElement("div");savedList.dataset.ppbuiProfileSavedList="";renderSavedMoves(savedList,id,current,metadata);savedBody.append(saveRow,opStatus,savedList);savedSection.append(savedHeader,savedBody);bindCollapse(savedToggle,savedBody,id,"savedMoves",text.collapseSavedMoves,text.expandSavedMoves);
    const teamSection=doc.createElement("section");teamSection.dataset.ppbuiProfileSection="";const teamHeader=doc.createElement("header");const teamTitle=doc.createElement("h3");teamTitle.textContent=text.savedTeams;const teamHeadActions=doc.createElement("div");teamHeadActions.dataset.ppbuiProfileSectionActions="";const teamToggle=button("−","ppbui-icon-button");teamToggle.dataset.ppbuiProfileCollapse="savedTeams";teamHeadActions.append(teamToggle);teamHeader.append(teamTitle,teamHeadActions);const teamBody=doc.createElement("div");teamBody.dataset.ppbuiProfileSectionBody="savedTeams";const teamList=doc.createElement("div");teamList.dataset.ppbuiProfileTeamList="";renderTeams(teamList,id);teamBody.append(teamList);teamSection.append(teamHeader,teamBody);bindCollapse(teamToggle,teamBody,id,"savedTeams",text.collapseSavedTeams,text.expandSavedTeams);teamStoreSignature=JSON.stringify(teamsStore.list().map(team=>[team.id,team.updatedAt,team.name,team.activeId,team.orderVerified,team.members.map(member=>member.id)]));
    main.replaceChildren(hero,currentSection,savedSection,teamSection);
  }

  async function select(id, focusMain=false) { const clean=String(id||"").trim(); if(!clean||!owned.some(creature=>String(creature.id)===clean))return;selectedId=clean;syncPickerSelection();await renderSelected(clean);if(focusMain)main.querySelector("[data-ppbui-profile-name]")?.scrollIntoView?.({block:"nearest"}); }

  async function refreshOwned(preferredId=selectedId, strictPreferred=false) {
    const epoch=++loadEpoch,text=copy();selectionEpoch++;detailCache.clear();movesCache.clear();pickerState.textContent=text.loading;pickerState.dataset.error="false";refresh.disabled=true;
    try{const raw=await loadOwnedPokemon(doc),next=await Promise.all(raw.map(enrichCreature));if(!alive||epoch!==loadEpoch)return false;owned=next;reconcileChoiceNodes();pickerState.textContent="";let wanted=String(preferredId||"");if(wanted&&!owned.some(creature=>String(creature.id)===wanted)&&strictPreferred){selectedId="";renderPicker();main.replaceChildren(statusNode(text.none,true));return false;}if(!owned.some(creature=>String(creature.id)===wanted))wanted=String(owned[0]?.id||"");selectedId=wanted;renderPicker();if(wanted)await renderSelected(wanted);else main.replaceChildren(statusNode(text.none));return Boolean(wanted);}
    catch{if(!alive||epoch!==loadEpoch)return;pickerState.textContent=text.loadError;pickerState.dataset.error="true";renderPicker();}
    finally{if(alive&&epoch===loadEpoch)refresh.disabled=false;}
  }

  function hideNativeCardCell(node, role) {
    if (!node) return;
    if (!node.hasAttribute("data-ppbui-profile-native-hidden")) {
      node.dataset.ppbuiProfileNativeHidden = role;
      node.dataset.ppbuiProfileNativeWasHidden = String(node.hidden);
    }
    node.hidden = true;
  }

  function releaseNativeCard(container) {
    if (!container?.querySelectorAll) return;
    const actions = container.querySelector("[data-ppbui-profile-native-actions]");
    const actionsAnchor = container.querySelector("[data-ppbui-profile-native-actions-anchor]");
    if (actions && actionsAnchor?.parentNode) actionsAnchor.replaceWith(actions);
    actions?.removeAttribute("data-ppbui-profile-native-actions");
    container.querySelectorAll("[data-ppbui-profile-native-owned]").forEach(node => node.remove());
    container.querySelectorAll("[data-ppbui-profile-native-hidden]").forEach(node => {
      node.hidden = node.dataset.ppbuiProfileNativeWasHidden === "true";
      node.removeAttribute("data-ppbui-profile-native-hidden");
      node.removeAttribute("data-ppbui-profile-native-was-hidden");
    });
    if (container.hasAttribute("data-ppbui-profile-native-scroll-scope-owned")) {
      container.classList.remove("ppbui-scroll-scope");
      container.removeAttribute("data-ppbui-profile-native-scroll-scope-owned");
    }
    container.removeAttribute("data-ppbui-profile-native-card");
    container.removeAttribute("data-ppbui-profile-native-mode");
    container.removeAttribute("data-ppbui-profile-native-creature-id");
    container.removeAttribute("data-ppbui-profile-native-token");
    nativeCardCreatures.delete(container);
    nativeCardHydrationEpoch.delete(container);
  }

  function nativeMoveTile(move) {
    const text = copy(), node = doc.createElement("div");
    node.dataset.ppbuiProfileNativeMove = "";
    node.dataset.empty = String(!move);
    if (!move) {
      const placeholder = doc.createElement("span");
      placeholder.textContent = "—";
      node.append(placeholder);
      return node;
    }
    const icon = createMoveIcon(doc, move), bodyNode = doc.createElement("span");
    bodyNode.dataset.ppbuiProfileNativeMoveCopy = "";
    const name = doc.createElement("strong");
    name.textContent = move.name || move.id || "—";
    name.title = name.textContent;
    const meta = doc.createElement("small"), parts = [];
    if (move.element) parts.push(String(move.element).toUpperCase());
    const power = finite(move.power);
    if (power !== null) parts.push(text.movePower + " " + power.toLocaleString());
    meta.textContent = parts.join(" · ");
    bodyNode.append(name, meta);
    node.append(icon, bodyNode);
    return node;
  }

  function nativeMovesShell(container) {
    const text = copy(), section = doc.createElement("section");
    section.className = "pokemon-card__section";
    section.dataset.ppbuiProfileNativeOwned = "";
    section.dataset.ppbuiProfileNativeMoves = "";
    const heading = doc.createElement("h4");
    heading.className = "pokemon-card__title";
    heading.textContent = text.hoverMoves;
    const grid = doc.createElement("div");
    grid.dataset.ppbuiProfileNativeMoveGrid = "";
    for (let index = 0; index < 4; index += 1) grid.append(nativeMoveTile(null));
    section.append(heading, grid);
    const anchor = container.querySelector(".pokemon-card__section,.pokemon-card__actions,.pokemon-card__hint");
    if (anchor) anchor.before(section);
    else container.append(section);
    return grid;
  }

  async function hydrateNativeCardMoves(container, creature, token) {
    const id = String(creature?.id || "").trim();
    if (!id) return;
    const hydrationEpoch=(nativeCardHydrationEpoch.get(container)||0)+1;nativeCardHydrationEpoch.set(container,hydrationEpoch);
    const isCurrent=()=>alive&&container.isConnected&&container.dataset.ppbuiProfileNativeToken===String(token)&&nativeCardHydrationEpoch.get(container)===hydrationEpoch;
    try {
      const current = await readMoves(id);
      if (!isCurrent()) return;
      const metadata = await moveMetadata(creature, current);
      if (!isCurrent()) return;
      const grid = container.querySelector("[data-ppbui-profile-native-move-grid]");
      if (!grid) return;
      const moves = enrichedMoves(current?.moves || [], metadata);
      grid.replaceChildren();
      for (let index = 0; index < 4; index += 1) grid.append(nativeMoveTile(moves[index] || null));
    } catch {
      if (!isCurrent()) return;
      container.querySelector("[data-ppbui-profile-native-moves]")?.remove();
    }
  }

  function addNativeProfileAction(container, id) {
    const actions = container.querySelector(".pokemon-card__actions");
    if (!actions || !id) return;
    const action = doc.createElement("button");
    action.type = "button";
    action.className = "pokemon-card__action is-profile";
    action.dataset.ppbuiProfileNativeOwned = "";
    action.dataset.ppbuiProfileNativeProfile = "";
    const glyph = doc.createElement("span");
    glyph.className = "pokemon-card__action-icon";
    glyph.setAttribute("aria-hidden", "true");
    glyph.textContent = "◆";
    const text = copy();
    action.append(glyph, doc.createTextNode(text.profileAction));
    action.title = text.openDossier;
    action.setAttribute("aria-label", text.openDossier);
    action.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      open(id, action);
    });
    actions.append(action);
  }

  function nativeCardLabel(key, fallback) {
    const translated = String(win?.PokeIdle?.t?.(key) || "").trim();
    return translated && translated !== key ? translated : fallback;
  }

  function nativeCardCellByLabel(container, key, fallback) {
    const label = nativeCardLabel(key, fallback);
    return [...container.querySelectorAll(".pokemon-card__cell")].find(cell => cell.querySelector(".pokemon-card__cell-label")?.textContent?.trim() === label) || null;
  }

  function hideNativeHighlightsWhenEmpty(container) {
    const highlights = container.querySelector(".pokemon-card__cells");
    if (!highlights) return;
    const cells = [...highlights.children].filter(node => node.matches?.(".pokemon-card__cell"));
    const hasVisibleCell = cells.some(node => !node.hasAttribute("data-ppbui-profile-native-hidden"));
    const hasNativeExtra = [...highlights.children].some(node => !node.matches?.(".pokemon-card__cell"));
    if (!hasVisibleCell && !hasNativeExtra) hideNativeCardCell(highlights, "highlights");
  }

  function reconcileNativeStatusBadges(container) {
    const statuses = [
      [".pokemon-tooltip__badge.is-active", "active"],
      [".pokemon-tooltip__badge.is-locked", "locked"],
    ];
    for (const [selector, kind] of statuses) {
      const badge = container.querySelector(selector);
      if (!badge) continue;
      hideNativeCardCell(badge, "redundant-" + kind);
    }
  }

  function addNativeIvBadge(container, value) {
    if (!value) return;
    const badges = container.querySelector(".pokemon-tooltip__badges");
    if (!badges) return;
    const badge = doc.createElement("span");
    badge.className = "pokemon-tooltip__badge is-iv";
    badge.dataset.ppbuiProfileNativeOwned = "";
    badge.dataset.ppbuiProfileNativeIv = "";
    badge.textContent = "IV " + value;
    badge.title = "IV " + value;
    const rarity = badges.querySelector(".pokemon-tooltip__badge.is-quality");
    if (rarity) rarity.after(badge);
    else badges.append(badge);
  }

  function moveNativeActionsToTop(container) {
    const actions = container.querySelector(".pokemon-card__actions");
    const badges = container.querySelector(".pokemon-tooltip__badges");
    if (!actions || !badges || actions.hasAttribute("data-ppbui-profile-native-actions")) return;
    const anchor = doc.createElement("span");
    anchor.hidden = true;
    anchor.dataset.ppbuiProfileNativeOwned = "";
    anchor.dataset.ppbuiProfileNativeActionsAnchor = "";
    actions.before(anchor);
    actions.dataset.ppbuiProfileNativeActions = "";
    badges.after(actions);
  }

  function decorateNativeCard(container, creature) {
    if (!container?.matches?.(nativeCardSelector) || !creature) return;
    const id = String(creature?.id || "").trim(), token = ++nativeCardToken;
    if (!container.classList.contains("ppbui-scroll-scope")) {
      container.classList.add("ppbui-scroll-scope");
      container.dataset.ppbuiProfileNativeScrollScopeOwned = "";
    }
    container.dataset.ppbuiProfileNativeCard = "";
    container.dataset.ppbuiProfileNativeMode = container.classList.contains("pokemon-card--hover")
      ? "hover"
      : container.classList.contains("pokemon-card--sheet")
        ? "sheet"
        : "pinned";
    container.dataset.ppbuiProfileNativeCreatureId = id;
    container.dataset.ppbuiProfileNativeToken = String(token);
    nativeCardCreatures.set(container, creature);

    const powerCell = container.querySelector(".pokemon-card__cell.is-power");
    const powerValue = powerCell?.querySelector(".pokemon-card__cell-value")?.textContent?.trim() || "";
    const powerCellLabel = powerCell?.querySelector(".pokemon-card__cell-label")?.textContent?.trim() || "";
    if (powerCell && powerValue) {
      hideNativeCardCell(powerCell, "power");
      const badges = container.querySelector(".pokemon-tooltip__badges");
      if (badges) {
        const badge = doc.createElement("span");
        badge.className = "pokemon-tooltip__badge is-power";
        badge.dataset.ppbuiProfileNativeOwned = "";
        badge.dataset.ppbuiProfileNativePower = "";
        const translated = win?.PokeIdle?.t?.("creature_details.total_power");
        const label = translated && translated !== "creature_details.total_power" ? translated : copy().power;
        const glyph = doc.createElement("span");
        glyph.setAttribute("aria-hidden", "true");
        glyph.textContent = "⚡";
        const accessibleLabel = doc.createElement("span");
        accessibleLabel.dataset.ppbuiProfileNativeSr = "";
        accessibleLabel.textContent = label + ": ";
        const visibleValue = doc.createElement("span");
        visibleValue.dataset.ppbuiProfileNativePowerValue = "";
        visibleValue.textContent = powerValue;
        badge.append(glyph, doc.createTextNode(" "), accessibleLabel, visibleValue);
        badge.title = (powerCellLabel || label) + ": " + powerValue;
        badges.append(badge);
      }
    }

    const saleCell = nativeCardCellByLabel(container, "pokemon_card.sale", "SALE");
    hideNativeCardCell(saleCell, "sale");
    const ivCell = nativeCardCellByLabel(container, "pokemon_card.iv_total", "TOTAL IV");
    const ivValue = ivCell?.querySelector(".pokemon-card__cell-value")?.textContent?.trim() || "";
    hideNativeCardCell(ivCell, "iv");
    hideNativeCardCell(container.querySelector(".pokemon-card__cell.is-rarity") || nativeCardCellByLabel(container, "pokemon_card.rarity", "RARITY"), "rarity");
    hideNativeHighlightsWhenEmpty(container);
    addNativeIvBadge(container, ivValue);
    reconcileNativeStatusBadges(container);

    nativeMovesShell(container);
    addNativeProfileAction(container, id);
    moveNativeActionsToTop(container);
    hydrateNativeCardMoves(container, creature, token);
  }

  function ensureNativeCardAugmenter() {
    const card = win?.PokeIdle?.PokemonCard;
    if (!card || typeof card.render !== "function") return false;
    if (nativeCardOwner === card && card.render === nativeCardRenderWrapper) return true;
    if (nativeCardRenderWrapper && nativeCardOwner) {
      if (card === nativeCardOwner) return false;
      releaseNativeCardAugmenter();
    }
    nativeCardOwner = card;
    nativeCardOriginalRender = card.render;
    const originalRender = nativeCardOriginalRender;
    const wrapper = function(container, raw, options) {
      const ownsCurrentRenderer = () => alive
        && nativeCardOwner === card
        && nativeCardRenderWrapper === wrapper
        && card.render === wrapper;
      if (ownsCurrentRenderer() && container?.matches?.(nativeCardSelector) && container.hasAttribute("data-ppbui-profile-native-card")) releaseNativeCard(container);
      const creature = originalRender.call(this, container, raw, options);
      if (ownsCurrentRenderer() && container?.matches?.(nativeCardSelector)) decorateNativeCard(container, creature || raw);
      return creature;
    };
    nativeCardRenderWrapper = wrapper;
    card.render = nativeCardRenderWrapper;
    return true;
  }

  function releaseNativeCardAugmenter() {
    nativeCardToken += 1;
    if (nativeCardOwner?.render === nativeCardRenderWrapper) nativeCardOwner.render = nativeCardOriginalRender;
    doc.querySelectorAll(nativeCardSelector).forEach(releaseNativeCard);
    nativeCardOwner = null;
    nativeCardOriginalRender = null;
    nativeCardRenderWrapper = null;
  }

  function clampWindowPosition(left,top,width,height){
    const gap=8,viewportWidth=win.innerWidth||doc.documentElement.clientWidth||width,viewportHeight=win.innerHeight||doc.documentElement.clientHeight||height;
    const maxLeft=Math.max(gap,viewportWidth-width-gap),maxTop=Math.max(gap,viewportHeight-height-gap);
    return {left:Math.min(Math.max(left,gap),maxLeft),top:Math.min(Math.max(top,gap),maxTop)};
  }
  function setDraggedWindowPosition(left,top,width,height){
    const next=clampWindowPosition(left,top,width,height);dragPositioned=true;root.style.transform="none";root.style.left=`${next.left}px`;root.style.top=`${next.top}px`;
  }
  function clampMovedWindow(){if(!dragPositioned||root.hidden)return;const rect=root.getBoundingClientRect();if(!rect.width||!rect.height)return;setDraggedWindowPosition(rect.left,rect.top,rect.width,rect.height);}
  function releaseWindowDragCapture(pointerId){
    if(pointerId==null||typeof titlebar.releasePointerCapture!=="function")return;
    try{if(typeof titlebar.hasPointerCapture!=="function"||titlebar.hasPointerCapture(pointerId))titlebar.releasePointerCapture(pointerId);}catch{}
  }
  function stopWindowDrag(event){
    if(!dragState)return;if(event?.pointerId!=null&&dragState.pointerId!=null&&event.pointerId!==dragState.pointerId)return;
    const pointerId=dragState.pointerId;dragState=null;delete root.dataset.ppbuiProfileDragging;
    if(event?.type!=="lostpointercapture")releaseWindowDragCapture(pointerId);
  }
  function onTitlebarPointerDown(event){
    if(event.button!==0||event.target?.closest?.("button,input,select,textarea,a"))return;
    const rect=root.getBoundingClientRect();if(!rect.width||!rect.height)return;
    setDraggedWindowPosition(rect.left,rect.top,rect.width,rect.height);
    dragState={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,left:parseFloat(root.style.left)||0,top:parseFloat(root.style.top)||0,width:rect.width,height:rect.height};
    if(event.pointerId!=null&&typeof titlebar.setPointerCapture==="function")try{titlebar.setPointerCapture(event.pointerId);}catch{}
    root.dataset.ppbuiProfileDragging="";event.preventDefault();
  }
  function onWindowDrag(event){
    if(!dragState||(event.pointerId!=null&&dragState.pointerId!=null&&event.pointerId!==dragState.pointerId))return;
    if(event.buttons!=null&&(event.buttons&1)===0){stopWindowDrag(event);return;}
    setDraggedWindowPosition(dragState.left+(event.clientX-dragState.startX),dragState.top+(event.clientY-dragState.startY),dragState.width,dragState.height);event.preventDefault();
  }

  async function open(id="", origin=null) { const epoch=++openEpoch,requested=String(id||"").trim(),activeElement=doc.activeElement;if(origin?.isConnected)profileOrigin=origin;else if(activeElement&&activeElement!==doc.body&&!root.contains(activeElement))profileOrigin=activeElement;syncCopy();root.hidden=false;opened=true;if(dragPositioned)clampMovedWindow();const loaded=await refreshOwned(requested||selectedId,Boolean(requested));if(!alive||!opened||epoch!==openEpoch)return false;const subject=main.querySelector("[data-ppbui-profile-name]");if(subject){subject.tabIndex=-1;subject.focus({preventScroll:true});}else refresh.focus({preventScroll:true});return loaded; }
  function hide({ restoreFocus=true }={}){openEpoch++;loadEpoch++;selectionEpoch++;stopWindowDrag();root.hidden=true;opened=false;setProp(refresh,"disabled",false);if(!restoreFocus)return;const target=profileOrigin?.isConnected?profileOrigin:ensureMenu();profileOrigin=null;target?.focus?.({preventScroll:true});}
  titlebar.addEventListener("pointerdown",onTitlebarPointerDown);titlebar.addEventListener("lostpointercapture",stopWindowDrag);doc.addEventListener("pointermove",onWindowDrag,true);doc.addEventListener("pointerup",stopWindowDrag,true);doc.addEventListener("pointercancel",stopWindowDrag,true);win.addEventListener("blur",stopWindowDrag);win.addEventListener("resize",clampMovedWindow);
  close.addEventListener("click",()=>hide());refresh.addEventListener("click",()=>refreshOwned());search.addEventListener("input",renderPicker);sourceButtons.forEach((button,key)=>button.addEventListener("click",()=>{source=key;renderPicker();}));list.addEventListener("click",event=>{const choice=event.target?.closest?.("[data-ppbui-profile-choice]");if(choice?.parentElement===list)select(choice.dataset.creatureId,true);});
  rarityFilter.addEventListener("change",()=>{filters.rarity=rarityFilter.value;renderPicker();});elementFilter.addEventListener("change",()=>{filters.element=elementFilter.value;renderPicker();});tagFilter.addEventListener("change",()=>{filters.tags=tagFilter.value?[tagFilter.value]:[];renderPicker();});
  for(const [key,input] of [["minLevel",minLevelFilter],["maxLevel",maxLevelFilter]])input.addEventListener("input",()=>{const valid=input.value===""||input.checkValidity();input.setAttribute("aria-invalid",String(!valid));setProp(filterErrors.get(key),"hidden",valid);filters[key]=valid?input.value:"";renderPicker();});
  clearFilters.addEventListener("click",()=>{filters=freshFilters();rarityFilter.value="";elementFilter.value="";minLevelFilter.value="";maxLevelFilter.value="";minLevelFilter.setAttribute("aria-invalid","false");maxLevelFilter.setAttribute("aria-invalid","false");for(const error of filterErrors.values())setProp(error,"hidden",true);tagFilter.value="";renderPicker();});
  const unsubscribeTags=tags.subscribe(()=>{if(opened)renderPicker();});
  function onKey(event){if(event.key==="Escape"&&!root.hidden){event.preventDefault();hide();}}doc.addEventListener("keydown",onKey,true);
  const nativeBus = createNativeBusBindings(() => win?.PokeIdle?.Bus);
  const bind = (name, handler) => nativeBus.bind(name, handler);
  bind("moveset.saved",data=>{const id=String(data?.creature_id||"");if(id){movesCache.delete(id);for(const card of doc.querySelectorAll(nativeCardSelector)){if(card.dataset.ppbuiProfileNativeCreatureId===id){const creature=nativeCardCreatures.get(card);if(creature)hydrateNativeCardMoves(card,creature,card.dataset.ppbuiProfileNativeToken);}}}if(opened&&id===selectedId)renderSelected(id);});
  bind("team.updated",()=>{if(opened)refreshOwned(selectedId);});bind("state.resynced",()=>{if(opened)refreshOwned(selectedId);});
  const previousBridge=win.__PPBUI_POKEMON_PROFILE__;const bridge={open,refresh:()=>refreshOwned(selectedId),close:()=>hide()};win.__PPBUI_POKEMON_PROFILE__=bridge;
  nativeBus.reconcile();syncCopy();ensureNativeCardAugmenter();
  return { sync(){nativeBus.reconcile();syncCopy();ensureNativeCardAugmenter();const nextSignature=opened?JSON.stringify(teamsStore.list().map(team=>[team.id,team.updatedAt,team.name,team.activeId,team.orderVerified,team.members.map(member=>member.id)])):"";if(opened&&nextSignature!==teamStoreSignature){teamStoreSignature=nextSignature;renderSelected(selectedId);}}, cleanup(){alive=false;openEpoch++;loadEpoch++;selectionEpoch++;stopWindowDrag();unsubscribeTags();releaseNativeCardAugmenter();nativeBus.cleanup();doc.removeEventListener("keydown",onKey,true);titlebar.removeEventListener("lostpointercapture",stopWindowDrag);doc.removeEventListener("pointermove",onWindowDrag,true);doc.removeEventListener("pointerup",stopWindowDrag,true);doc.removeEventListener("pointercancel",stopWindowDrag,true);win.removeEventListener("blur",stopWindowDrag);win.removeEventListener("resize",clampMovedWindow);if(win.__PPBUI_POKEMON_PROFILE__===bridge)previousBridge===undefined?delete win.__PPBUI_POKEMON_PROFILE__:win.__PPBUI_POKEMON_PROFILE__=previousBridge;root.remove();menu?.remove();style.remove();} };
}
