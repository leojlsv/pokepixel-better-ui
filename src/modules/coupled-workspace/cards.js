import { teamPresetMemberSnapshot, teamPresetVisualReader } from "../team-presets/dom.js";
import { levelExperience } from "../team-hud/dom.js";
import { normalizeNativeMoveset } from "../team-movesets/actions.js";
import { createMoveIcon } from "../team-movesets/dom.js";
import { pokemonTypes } from "../hunts/type-chart.js";
import { createElementIcon } from "../../core/element-icons.js";
import { explicitNativeLeaderId, runAnalyzerSessionAction, setActiveTeamMember, teamControlSnapshot } from "./hunt-controls.js";

const SPECIAL_RARITIES = Object.freeze(["epic", "legendary", "mythical"]);
const SPECIAL_RARITY_SET = new Set(SPECIAL_RARITIES);
const ITEM_RARITIES = Object.freeze(["weak", "common", "uncommon", "rare", "epic", "legendary", "mythical"]);
const ITEM_RARITY_SET = new Set(ITEM_RARITIES);
const NATIVE_SPECIES_MAX_ATTEMPTS = 4;
const PLAYER_MOVESET_MAX_ATTEMPTS = 4;
const LOOT_CATALOG_RETRY_MS = 5_000;

const COPY = Object.freeze({
  en: Object.freeze({
    locale: "en-US", unavailable: "Unavailable", waitingTarget: "Waiting for target", noAttempts: "No attempts recorded in this Hunt.", noFilteredAttempts: "No attempts match these filters.", analyzerUnavailable: "Hunt Analyzer data unavailable.",
    huntConsole: "Hunt console", active: "ACTIVE", target: "TARGET", lastSessionTarget: "LAST IN HUNT", lastSeenInHunt: "Last seen in this Hunt", lastExpeditionTarget: "LAST IN EXP.", lastSeenInExpedition: "Last seen in this Expedition", expeditionInProgress: "Expedition in progress", moves: "Moves", noImage: "NO IMG", noTarget: "NO TARGET", switchPokemon: "Switch Pokémon", switchPokemonShort: "Team", teamUnavailable: "Team unavailable", defeated: "defeated",
    huntSummary: "Hunt summary", status: "Status", time: "Time", seen: "Seen", captured: "Captured", failed: "Failed", seenHour: "Seen/h", capturedSeen: "Captured / Seen", rarityCaption: "C/S · ✦ Shiny C/S",
    capture: "Capture", huntRate: "Hunt rate", lastAttemptChance: "Last attempt chance", epicFailed: "Epic+ failed", shinySeen: "Shiny seen", shinyCaptured: "Shiny captured",
    economyXp: "Economy / XP", revenue: "Revenue", totalRevenue: "Total revenue", directGold: "Direct gold", lootValue: "Loot value", autoSell: "Auto-sell", result: "Result", totalProfit: "Total profit", profitHour: "Profit/h", expenses: "Expenses", expensesHour: "Expenses/h", experience: "Experience", pokemonXpHour: "Pokémon XP/h", pokemonTotal: "Pokémon total", trainerHour: "Trainer/h", trainerTotal: "Trainer total",
    history: "Story", historyCaption: "Session events", huntStory: "Hunt Story", lootStory: "Loot Story", rarity: "Rarity", all: "All", none: "None", outcome: "Result", shiny: "Shiny", yes: "Yes", no: "No",
    noLoot: "No loot recorded in this Hunt.", noFilteredLoot: "No loot matches this item rarity.", lootTotal: "Total", genetics: "Genetics", showGenetics: "Show captured genetics", hideGenetics: "Hide captured genetics", items: "Items", itemRarity: "Item rarity", noItemRarity: "No rarity", noItems: "No item drops",
    hour: "Time", pokemon: "Pokémon", ball: "Ball", chance: "Chance", ivTotal: "IV Total", elements: "Types", quality: "Quality",
    running: "Hunting", paused: "Paused", waiting: "Waiting", noCanonicalTarget: "No single canonical target", exactValue: "Exact value", capturedOfSeen: "captured of", seenWord: "seen", shinyCv: "Shiny C/S",
    pause: "Pause", resume: "Resume", reset: "Reset", resetting: "Resetting…", resuming: "Resuming…", pausing: "Pausing…", huntReset: "Hunt reset and paused", huntResumed: "Hunt resumed", huntPaused: "Hunt paused", analyzerControlUnavailable: "Analyzer control unavailable",
    switching: "Switching…", activeUpdated: "Active Pokémon updated", switchUnavailable: "Switch unavailable",
    leaderAwaitHud: "POST accepted; waiting for Team HUD", leaderSyncUnavailable: "POST accepted; Team update was not delivered. Check Game or reload.", leaderSuperseded: "Another leader change occurred while the POST was pending", leaderHudUnexpected: "HUD changed to another leader",
    raritySummaryAll: "Rarity · All", raritySummaryNone: "Rarity · None", raritySummarySome: count => `Rarity · ${count}/3`, gender: "Gender", nature: "Nature", iv: "IV", male: "Male", female: "Female", unknown: "Unknown", shinyFilterHelp: "Shiny exceptions use the Shiny filter.",
    sectionNavigation: "Jump to section", navTop: "Top", navSummary: "Summary", navEconomy: "Economy", navStory: "Story", copySummary: "Copy", copySummaryPending: "Copying…", copySummarySuccess: "Summary copied", copySummaryError: "Could not copy summary", copySummaryUnavailable: "Clipboard unavailable",
  }),
  pt: Object.freeze({
    locale: "pt-BR", unavailable: "Indisponível", waitingTarget: "Aguardando alvo", noAttempts: "Nenhuma tentativa registrada nesta hunt.", noFilteredAttempts: "Nenhuma tentativa corresponde aos filtros.", analyzerUnavailable: "Dados do Hunt Analyzer indisponíveis.",
    huntConsole: "Console de hunt", active: "ATIVO", target: "ALVO", lastSessionTarget: "ÚLTIMO DA HUNT", lastSeenInHunt: "Último visto nesta Hunt", lastExpeditionTarget: "ÚLTIMO DA EXP.", lastSeenInExpedition: "Último visto nesta expedição", expeditionInProgress: "Expedição em andamento", moves: "Golpes", noImage: "SEM IMG", noTarget: "SEM ALVO", switchPokemon: "Trocar Pokémon", switchPokemonShort: "Team", teamUnavailable: "Team indisponível", defeated: "derrotado",
    huntSummary: "Resumo da hunt", status: "Status", time: "Tempo", seen: "Vistos", captured: "Capturados", failed: "Falharam", seenHour: "Vistos/h", capturedSeen: "Capturados / Vistos", rarityCaption: "C/V · ✦ Shiny C/V",
    capture: "Captura", huntRate: "Taxa da hunt", lastAttemptChance: "Chance última tentativa", epicFailed: "Epic+ falharam", shinySeen: "Shiny vistos", shinyCaptured: "Shiny capturados",
    economyXp: "Economia / XP", revenue: "Receita", totalRevenue: "Receita total", directGold: "Gold direto", lootValue: "Loot (valor)", autoSell: "Auto-sell", result: "Resultado", totalProfit: "Lucro total", profitHour: "Lucro/h", expenses: "Gastos", expensesHour: "Gastos/h", experience: "Experiência", pokemonXpHour: "Pokémon XP/h", pokemonTotal: "Pokémon total", trainerHour: "Treinador/h", trainerTotal: "Treinador total",
    history: "Story", historyCaption: "Eventos da sessão", huntStory: "Hunt Story", lootStory: "Loot Story", rarity: "Raridade", all: "Todos", none: "Nenhuma", outcome: "Resultado", shiny: "Shiny", yes: "Sim", no: "Não",
    noLoot: "Nenhum loot registrado nesta hunt.", noFilteredLoot: "Nenhum loot corresponde à raridade de item selecionada.", lootTotal: "Total", genetics: "Genética", showGenetics: "Exibir genética capturada", hideGenetics: "Ocultar genética capturada", items: "Itens", itemRarity: "Raridade do item", noItemRarity: "Sem raridade", noItems: "Sem drop de item",
    hour: "Hora", pokemon: "Pokémon", ball: "Ball", chance: "Chance", ivTotal: "IV Total", elements: "Elementos", quality: "Quality",
    running: "Caçando", paused: "Pausado", waiting: "Aguardando", noCanonicalTarget: "Sem alvo canônico único", exactValue: "Valor exato", capturedOfSeen: "capturados de", seenWord: "vistos", shinyCv: "Shiny C/V",
    pause: "Pausar", resume: "Retomar", reset: "Resetar", resetting: "Resetando…", resuming: "Retomando…", pausing: "Pausando…", huntReset: "Hunt resetada e pausada", huntResumed: "Hunt retomada", huntPaused: "Hunt pausada", analyzerControlUnavailable: "Controle do Analyzer indisponível",
    switching: "Trocando…", activeUpdated: "Ativo atualizado", switchUnavailable: "Troca indisponível",
    leaderAwaitHud: "POST aceito; aguardando Team HUD", leaderSyncUnavailable: "POST aceito; atualização não chegou ao Team. Confira Game ou recarregue.", leaderSuperseded: "Outro líder foi ativado durante a troca", leaderHudUnexpected: "HUD mudou para outro líder",
    raritySummaryAll: "Raridade · Todas", raritySummaryNone: "Raridade · Nenhuma", raritySummarySome: count => `Raridade · ${count}/3`, gender: "Gender", nature: "Nature", iv: "IV", male: "Male", female: "Female", unknown: "Unknown", shinyFilterHelp: "Exceções Shiny usam o filtro Shiny.",
    sectionNavigation: "Ir para seção", navTop: "Topo", navSummary: "Resumo", navEconomy: "Economia", navStory: "Histórico", copySummary: "Copiar", copySummaryPending: "Copiando…", copySummarySuccess: "Resumo copiado", copySummaryError: "Não foi possível copiar o resumo", copySummaryUnavailable: "Área de transferência indisponível",
  }),
});

const RARITY_LABELS = Object.freeze({
  en: Object.freeze({ unknown: "Unknown", weak: "Weak", common: "Common", uncommon: "Uncommon", rare: "Rare", epic: "Epic", legendary: "Legendary", mythical: "Mythical" }),
  pt: Object.freeze({ unknown: "Unknown", weak: "Fraca", common: "Comum", uncommon: "Incomum", rare: "Rara", epic: "Épica", legendary: "Lendária", mythical: "Mítica" }),
});

function knownRarity(value) {
  const key = String(value || "").trim().toLowerCase();
  if (ITEM_RARITY_SET.has(key)) return key;
  const aliases = {
    fraca:"weak", comum:"common", incomum:"uncommon", rara:"rare",
    épica:"epic", epica:"epic", lendária:"legendary", lendaria:"legendary",
    mítica:"mythical", mitica:"mythical",
  };
  return aliases[key] || "";
}

const TYPE_LABELS_PT = Object.freeze({ normal:"Normal",fire:"Fogo",water:"Água",electric:"Elétrico",grass:"Planta",ice:"Gelo",fighting:"Lutador",poison:"Veneno",ground:"Terra",flying:"Voador",psychic:"Psíquico",bug:"Inseto",rock:"Pedra",ghost:"Fantasma",dragon:"Dragão",dark:"Sombrio",steel:"Aço",fairy:"Fada" });

function localeContext(win) {
  let raw = "";
  try { raw = String(win?.PokeIdle?.Localization?.get?.() || ""); } catch {}
  raw = raw || String(win?.document?.documentElement?.lang || "") || "en-US";
  const base = raw.toLowerCase().split(/[-_]/)[0];
  const key = base === "pt" ? "pt" : "en";
  return { key, locale: COPY[key].locale, copy: COPY[key], rarity: RARITY_LABELS[key] };
}

function number(value, digits = 0, locale = "en-US") {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
}

function compactNumber(value, digits = 0, locale = "en-US") {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) < 1000) return number(value, digits, locale);
  const tiers = [
    { value: 1_000_000_000, suffix: "B" },
    { value: 1_000_000, suffix: "M" },
    { value: 1_000, suffix: "k" },
  ];
  let index = tiers.findIndex(tier => Math.abs(value) >= tier.value);
  if (index < 0) return number(value, digits, locale);
  let tier = tiers[index];
  let scaled = value / tier.value;
  let decimals = Math.abs(scaled) < 100 ? 1 : 0;
  let rounded = Number(scaled.toFixed(decimals));
  if (Math.abs(rounded) >= 1000 && index > 0) {
    tier = tiers[index - 1];
    scaled = value / tier.value;
    decimals = Math.abs(scaled) < 100 ? 1 : 0;
    rounded = Number(scaled.toFixed(decimals));
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: decimals }).format(rounded)}${tier.suffix}`;
}

function percent(value, digits = 1, locale = "en-US") {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

function money(value, digits = 0, signed = false, locale = "en-US") {
  if (!Number.isFinite(value)) return "—";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}$ ${number(value, digits, locale)}`;
}

function compactMoney(value, digits = 0, signed = false, locale = "en-US") {
  if (!Number.isFinite(value)) return "—";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}$ ${compactNumber(value, digits, locale)}`;
}

function duration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s` : `${m}m ${String(s).padStart(2, "0")}s`;
}

function relativeTime(atMs, locale = "en-US", now = Date.now()) {
  if (!Number.isFinite(atMs) || atMs < 0) return "—";
  const delta = Math.max(0, now - atMs);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "always", style: "narrow" });
  if (delta < 60_000) return formatter.format(-Math.floor(delta / 1000), "second");
  if (delta < 3_600_000) return formatter.format(-Math.floor(delta / 60_000), "minute");
  return formatter.format(-Math.floor(delta / 3_600_000), "hour");
}

function nextRelativeTimeAt(atMs, now) {
  if (!Number.isFinite(atMs) || atMs < 0) return Infinity;
  const delta = Math.max(0, now - atMs);
  const step = delta < 60_000 ? 1000 : delta < 3_600_000 ? 60_000 : 3_600_000;
  return atMs + (Math.floor(delta / step) + 1) * step;
}

function refreshRelativeTimes(entries, locale, now) {
  for (const entry of entries) {
    const time = entry.time || entry;
    if (now < time.nextAt) continue;
    const value = relativeTime(time.atMs, locale, now);
    if (time.node.textContent !== value) {
      writeText(time.node, value);
      if (time.label) {
        time.node.title = `${time.label}: ${value}`;
        time.node.setAttribute("aria-label", time.node.title);
      }
    }
    time.nextAt = nextRelativeTimeAt(time.atMs, now);
  }
}

function normalizedElements(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(type => String(type || "").trim().toLowerCase()).filter(type => pokemonTypes.includes(type)))].slice(0, 2);
}

function typeLabel(type, localeKey) {
  if (localeKey === "pt") return TYPE_LABELS_PT[type] || type;
  return type ? `${type[0].toUpperCase()}${type.slice(1)}` : "—";
}

function text(value, fallback = "—") {
  const result = String(value || "").trim();
  return result || fallback;
}

function validPlayerSprite(value, win) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^data:image\/png;base64,[a-z0-9+/=]+$/i.test(raw) && raw.length <= 1_500_000) return raw;
  try {
    const url = new URL(raw, win.location.href);
    if (url.protocol !== "https:" || url.hostname === "img.pokemondb.net") return "";
    return url.href;
  } catch {
    return "";
  }
}

function playerSpeciesKey(active) {
  const speciesId = String(active?.species_id ?? active?.species?.id ?? active?.species?.species_id ?? "").trim();
  return speciesId ? `${speciesId}:${active?.is_shiny === true ? "shiny" : "normal"}` : "";
}

function requestPlayerSpeciesSprite(win, state, active) {
  const key = playerSpeciesKey(active);
  if (!key) return "";
  if (state.playerSpeciesKey !== key) {
    state.playerSpeciesKey = key;
    state.playerSpeciesSprite = "";
    state.playerSpeciesRequest = null;
    state.playerSpeciesAttempts = 0;
  }
  if (state.playerSpeciesSprite) return state.playerSpeciesSprite;
  if (!state.playerSpeciesRequest && state.playerSpeciesAttempts < 4 && typeof win?.PokeIdle?.Api?.getSpecies === "function") {
    const speciesId = key.split(":", 1)[0];
    state.playerSpeciesAttempts += 1;
    state.playerSpeciesRequest = Promise.resolve()
      .then(() => state.disposed ? null : win.PokeIdle.Api.getSpecies(speciesId))
      .then(response => {
        if (state.disposed) return;
        const species = response?.data && typeof response.data === "object" ? response.data : response;
        if (state.playerSpeciesKey !== key || !species || typeof species !== "object") return;
        const member = teamPresetMemberSnapshot(win.document, {
          ...active,
          species: { ...(active?.species || {}), ...species },
        });
        state.playerSpeciesSprite = validPlayerSprite(member?.sprite, win);
        if (state.playerSpeciesSprite) state.rerender?.();
      })
      .catch(() => {})
      .finally(() => {
        if (!state.disposed && state.playerSpeciesKey === key) state.playerSpeciesRequest = null;
      });
  }
  return state.playerSpeciesSprite;
}

function requestPlayerMoveset(win, state, creatureId) {
  const id = String(creatureId || "").trim();
  if (!id) return [];
  if (state.playerMovesetId !== id) {
    state.playerMovesetEpoch += 1;
    state.playerMovesetId = id;
    state.playerMoveset = [];
    state.playerMovesetLoaded = false;
    state.playerMovesetRequest = null;
    state.playerMovesetAttempts = 0;
  }
  if (state.playerMovesetLoaded) return state.playerMoveset;
  if (!state.playerMovesetRequest
    && state.playerMovesetAttempts < PLAYER_MOVESET_MAX_ATTEMPTS
    && typeof win?.PokeIdle?.Api?.getMoveset === "function") {
    state.playerMovesetAttempts += 1;
    const epoch = state.playerMovesetEpoch;
    state.playerMovesetRequest = Promise.resolve()
      .then(() => state.disposed ? null : win.PokeIdle.Api.getMoveset(id))
      .then(response => {
        if (state.disposed || state.playerMovesetId !== id || state.playerMovesetEpoch !== epoch || !response) return;
        const normalized = normalizeNativeMoveset(response?.data ?? response);
        state.playerMoveset = normalized.moves.slice(0, 4);
        state.playerMovesetLoaded = true;
        state.rerender?.();
      })
      .catch(() => {})
      .finally(() => {
        if (!state.disposed && state.playerMovesetId === id && state.playerMovesetEpoch === epoch) state.playerMovesetRequest = null;
      });
  }
  return state.playerMoveset;
}

function requestNativeSpeciesSprite(win, state, speciesId, shiny = false) {
  const id = String(speciesId || "").trim();
  if (!id) return "";
  const key = `${id}:${shiny === true ? "shiny" : "normal"}`;
  const cached = state.nativeSpeciesSprites.get(key);
  if (cached) return cached;
  const attempts = state.nativeSpeciesAttempts.get(key) || 0;
  if (!state.nativeSpeciesRequests.has(key) && attempts < NATIVE_SPECIES_MAX_ATTEMPTS && typeof win?.PokeIdle?.Api?.getSpecies === "function") {
    state.nativeSpeciesAttempts.set(key, attempts + 1);
    const request = Promise.resolve()
      .then(() => state.disposed ? null : win.PokeIdle.Api.getSpecies(id))
      .then(response => {
        if (state.disposed || !response) return;
        const species = response?.data && typeof response.data === "object" ? response.data : response;
        const member = species && typeof species === "object"
          ? teamPresetMemberSnapshot(win.document, { id, species_id:id, is_shiny:shiny === true, species })
          : null;
        const sprite = validPlayerSprite(member?.sprite, win);
        if (!sprite) return;
        state.nativeSpeciesSprites.set(key, sprite);
        state.nativeSpeciesAttempts.delete(key);
        state.speciesSpriteRevision += 1;
        state.rerender?.();
      })
      .catch(() => {})
      .finally(() => {
        if (!state.disposed) state.nativeSpeciesRequests.delete(key);
      });
    state.nativeSpeciesRequests.set(key, request);
  }
  return "";
}

function inventoryResponseItems(response) {
  const payload = response?.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.inventory)) return payload.inventory;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function nativeItemRarity(win, item, itemId, name) {
  const direct = knownRarity(
    item?.rarity ?? item?.quality ?? item?.tier
    ?? item?.item?.rarity ?? item?.item?.quality ?? item?.item?.tier
  );
  if (direct) return direct;
  const slots = win?.document?.querySelectorAll?.("button.inventory-slot:not(.is-empty)") || [];
  const normalizedName = String(name || "").trim().toLowerCase();
  for (const slot of slots) {
    const slotId = String(slot.dataset?.itemId || slot.dataset?.item || "").trim();
    const aria = String(slot.getAttribute?.("aria-label") || "").trim().toLowerCase();
    if (slotId !== itemId && (!normalizedName || !aria.startsWith(normalizedName))) continue;
    const rarity = ITEM_RARITIES.find(key => slot.classList?.contains(`rarity-${key}`));
    if (rarity) return rarity;
  }
  return "";
}

function requestLootCatalog(win, state, requiredItemIds = []) {
  const required = [...new Set(requiredItemIds.map(itemId => String(itemId || "").trim()).filter(Boolean))];
  const now = Date.now();
  const needsRefresh = !state.lootCatalogLoaded || required.some(itemId => (
    !state.lootCatalog.has(itemId)
    && now - (state.lootCatalogCheckedAt.get(itemId) || 0) >= LOOT_CATALOG_RETRY_MS
  ));
  if (!needsRefresh || state.lootCatalogRequest || typeof win?.PokeIdle?.Api?.getInventory !== "function") return;
  state.lootCatalogRequest = Promise.resolve()
    .then(() => state.disposed ? null : win.PokeIdle.Api.getInventory())
    .then(response => {
      if (state.disposed || !response) return;
      const next = new Map(state.lootCatalog);
      for (const item of inventoryResponseItems(response)) {
        const itemId = String(item?.item_id ?? item?.id ?? item?.item?.id ?? "").trim();
        if (!itemId) continue;
        const name = String(item?.name || item?.item?.name || itemId).trim() || itemId;
        next.set(itemId, { itemId, name, rarity:nativeItemRarity(win, item, itemId, name) });
      }
      state.lootCatalog = next;
      state.lootCatalogLoaded = true;
      const checkedAt = Date.now();
      required.forEach(itemId => state.lootCatalogCheckedAt.set(itemId, checkedAt));
      state.lootCatalogRevision += 1;
      state.rerender?.();
    })
    .catch(() => {
      if (state.disposed) return;
      const checkedAt = Date.now();
      required.forEach(itemId => state.lootCatalogCheckedAt.set(itemId, checkedAt));
    })
    .finally(() => {
      if (!state.disposed) state.lootCatalogRequest = null;
    });
}

function cssImageUrl(value) {
  const match = String(value || "").match(/^url\((['"]?)(.*?)\1\)$/i);
  return match?.[2] || "";
}

function canvasHasVisiblePixels(canvas) {
  const width = Number(canvas?.width || 0);
  const height = Number(canvas?.height || 0);
  if (!(width > 0 && height > 0)) return false;
  if (width * height > 65_536) return true;
  try {
    const context = canvas.getContext?.("2d", { willReadFrequently: true });
    if (!context?.getImageData) return true;
    const pixels = context.getImageData(0, 0, width, height)?.data;
    if (!pixels) return true;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] !== 0) return true;
    }
    return false;
  } catch {
    // If native canvas inspection is unavailable/tainted, keep the previous safe path.
    return true;
  }
}

function activePortraitSprite(root, win) {
  const portrait = root?.querySelector?.(".pokeidle-team-hud__active-portrait");
  if (!portrait) return "";
  const image = portrait.matches?.("img") ? portrait : portrait.querySelector("img");
  if (image) {
    const source = image.currentSrc || image.getAttribute("src") || image.getAttribute("data-src") || "";
    if (source) return source;
  }
  const canvas = portrait.matches?.("canvas") ? portrait : portrait.querySelector("canvas");
  if (canvas && canvasHasVisiblePixels(canvas)) {
    try {
      const data = canvas.toDataURL?.("image/png");
      if (data?.startsWith("data:image/png;base64,")) return data;
    } catch {
      // Native/cross-origin canvas may be tainted; fall through to CSS/native metadata.
    }
  }
  const candidates = [portrait, ...portrait.querySelectorAll(".pokeidle-team-card__charset,.pokemon-sprite")];
  for (const node of candidates) {
    const inline = cssImageUrl(node.style?.backgroundImage) || cssImageUrl(node.style?.content);
    if (inline) return inline;
    try {
      const computed = win.getComputedStyle?.(node);
      const computedAsset = cssImageUrl(computed?.backgroundImage) || cssImageUrl(computed?.content);
      if (computedAsset) return computedAsset;
    } catch {
    }
  }
  return "";
}

function playerSnapshot(win, state) {
  const root = win.document.querySelector(".pokeidle-team-hud");
  const runtime = win.PokeIdle?.PersistentHud?._teamHud;
  const creatures = Array.isArray(runtime?._creatures) ? runtime._creatures : [];
  if (creatures.length === 0) return null;
  const visualRoot = root && runtime?.el === root ? root : null;
  const active = creatures.find((creature) => creature?.is_leader) || creatures[0];
  if (!active) return null;
  const activeId = String(active.id ?? "");
  const identityChanged = state.playerRoot !== visualRoot || state.playerVisualId !== activeId;
  if (identityChanged) {
    state.playerRoot = visualRoot;
    state.playerVisualId = activeId;
    state.playerVisualReader = null;
    state.playerSpriteAttempts = 0;
    state.playerSpeciesKey = "";
    state.playerSpeciesSprite = "";
    state.playerSpeciesRequest = null;
    state.playerSpeciesAttempts = 0;
  }
  if (!state.textOnly && visualRoot && !state.playerVisualReader && state.playerSpriteAttempts < 4) {
    state.playerVisualReader = teamPresetVisualReader(visualRoot, { resolveSprites: true, retryMissing: true });
  }
  const visual = state.textOnly ? {} : (state.playerVisualReader?.(active) || {});
  const portraitSprite = state.textOnly || visual.sprite || !visualRoot ? "" : activePortraitSprite(visualRoot, win);
  const sprite = state.textOnly ? "" : (visual.sprite || portraitSprite || requestPlayerSpeciesSprite(win, state, active));
  if (!state.textOnly && !sprite && state.playerSpriteAttempts < 4) {
    state.playerSpriteAttempts += 1;
    state.playerVisualReader = null;
  } else if (!state.textOnly && sprite) {
    state.playerSpriteAttempts = 4;
  }
  const hp = Number.isFinite(active.hp) ? active.hp : null;
  const maxHp = Number.isFinite(active.max_hp) ? active.max_hp : null;
  const level = Number.isFinite(active.level) ? active.level : null;
  const name = active.nickname || active.name || active.species_name || active.species?.name || active.species_id || "Pokémon ativo";
  return {
    id: activeId,
    species: text(name, "Pokémon ativo"),
    level: Number.isFinite(level) ? Math.max(0, Math.floor(level)) : null,
    hp: Number.isFinite(hp) ? Math.max(0, hp) : null,
    maxHp: Number.isFinite(maxHp) && maxHp > 0 ? maxHp : null,
    fainted: active.fainted === true
      || active.is_fainted === true
      || (Number.isFinite(hp) && hp <= 0),
    elements: normalizedElements(active.elements || active.species?.elements),
    experience: levelExperience(active),
    spriteUrl: validPlayerSprite(sprite, win),
  };
}

function writeText(node, value) {
  if (node && node.textContent !== String(value)) node.textContent = value;
}

function writeBoolean(node, key, value) {
  if (node && node[key] !== Boolean(value)) node[key] = Boolean(value);
}

const cardNodeCache = new WeakMap();
function cardNode(root, selector) {
  let nodes = cardNodeCache.get(root);
  if (!nodes) {
    nodes = new Map();
    cardNodeCache.set(root, nodes);
  }
  if (!nodes.has(selector)) nodes.set(selector, root.querySelector(selector));
  return nodes.get(selector);
}

const elementRenderState = new WeakMap();

function setText(root, key, value) {
  const node = cardNode(root, `[data-card-field="${key}"]`);
  writeText(node, value);
}

function setMetric(root, key, display, exact = display, copy = COPY.en) {
  const node = cardNode(root, `[data-card-field="${key}"]`);
  if (!node) return;
  writeText(node, display);
  const label = node.parentElement?.querySelector("span")?.textContent?.trim() || key;
  if (exact && exact !== display) node.title = `${copy.exactValue}: ${exact}`;
  else node.removeAttribute("title");
  if (exact) node.setAttribute("aria-label", `${label}: ${exact}`);
  else node.removeAttribute("aria-label");
}

function renderElements(root, key, types, win, localeKey, copy, { textOnly = false } = {}) {
  const node = cardNode(root, `[data-card-elements="${key}"]`);
  if (!node) return;
  const normalized = normalizedElements(types);
  const icons = textOnly ? null : win?.PokeIdle?.ElementIcons;
  const signature = JSON.stringify([normalized, localeKey, copy.elements, textOnly,
    icons?.revision ?? null, icons?.version ?? null]);
  const previous = elementRenderState.get(node);
  if (previous?.signature === signature && previous.icons === icons &&
      previous.create === icons?.create && previous.definition === icons?.definition) return;
  node.replaceChildren();
  writeBoolean(node, "hidden", normalized.length === 0);
  if (!normalized.length) {
    node.removeAttribute("aria-label");
    elementRenderState.set(node, { signature, icons, create: icons?.create, definition: icons?.definition });
    return;
  }
  for (const type of normalized) {
    const item = root.ownerDocument.createElement("span");
    item.className = "ppbui-cards-element";
    if (!textOnly) item.append(createElementIcon(root.ownerDocument, icons, type, { small: true }));
    const label = root.ownerDocument.createElement("i");
    label.textContent = typeLabel(type, localeKey);
    item.append(label);
    node.append(item);
  }
  node.setAttribute("aria-label", `${copy.elements}: ${normalized.map(type => typeLabel(type, localeKey)).join(", ")}`);
  // Commit only after a successful full render. A transient native icon error
  // must not cache a partial DOM and prevent the next reconciliation retry.
  elementRenderState.set(node, { signature, icons, create: icons?.create, definition: icons?.definition });
}

function renderPlayerMoves(root, state, moves) {
  const node = cardNode(root, "[data-card-player-moves]");
  if (!node) return;
  const list = Array.isArray(moves) ? moves.slice(0, 4) : [];
  const signature = JSON.stringify(list.map(move => [move.id, move.name, move.element]));
  if (node.dataset.signature === signature) return;
  node.dataset.signature = signature;
  node.replaceChildren();
  node.hidden = list.length === 0;
  node.setAttribute("aria-label", `${state.copy.moves}: ${list.map(move => move.name || move.id).join(", ")}`);
  for (const move of list) {
    const item = root.ownerDocument.createElement("span");
    item.className = "ppbui-cards-move";
    const label = text(move.name || move.id);
    item.title = label;
    item.setAttribute("aria-label", label);
    const image = createMoveIcon(root.ownerDocument, move);
    image.loading = "eager";
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.onerror = () => { if (!state.disposed) image.hidden = true; };
    item.append(image);
    node.append(item);
  }
}

function levelText(target) {
  return Number.isFinite(target?.level) ? `Lv. ${target.level}` : "Lv. —";
}

function genderLabel(value, copy) {
  const key = String(value || "").trim().toLowerCase();
  if (["male", "m", "masculino", "♂"].includes(key)) return `♂ ${copy.male}`;
  if (["female", "f", "feminino", "♀"].includes(key)) return `♀ ${copy.female}`;
  return "—";
}

function captureDetailText(details, copy) {
  const source = details && typeof details === "object" ? details : {};
  const ivs = source.ivs && typeof source.ivs === "object" ? source.ivs : {};
  const stat = (label, key) => `${label} ${Number.isFinite(ivs[key]) ? ivs[key] : "—"}`;
  return `${copy.gender} ${genderLabel(source.gender, copy)} · ${copy.nature} ${text(source.nature)} · ${copy.iv} ${Number.isFinite(source.ivTotal) ? source.ivTotal : "—"} · ${stat("HP", "hp")} · ${stat("ATK", "atk")} · ${stat("SpA", "spa")} · ${stat("DEF", "def")} · ${stat("SpD", "spd")} · ${stat("SPE", "spe")}`;
}

function setSprite(root, state, key, src, fallbackText = "SEM IMG") {
  const image = cardNode(root, `[data-card-sprite="${key}"]`);
  const fallback = cardNode(root, `[data-card-sprite-fallback="${key}"]`);
  if (!image || !fallback) return;
  if (!image.dataset.ppbuiFallbackBound) {
    image.dataset.ppbuiFallbackBound = "true";
    const onError = () => {
      if (state.disposed) return;
      image.dataset.failedSrc = image.getAttribute("src") || "";
      image.hidden = true;
      fallback.hidden = false;
    };
    image.addEventListener("error", onError);
    state.spriteErrorBindings.push([image, onError]);
  }
  writeText(fallback, fallbackText);
  if (!src) {
    if (image.hasAttribute("src")) image.removeAttribute("src");
    delete image.dataset.failedSrc;
    writeBoolean(image, "hidden", true);
    writeBoolean(fallback, "hidden", false);
    return;
  }
  if (image.dataset.failedSrc === src) {
    writeBoolean(image, "hidden", true);
    writeBoolean(fallback, "hidden", false);
    return;
  }
  if (image.getAttribute("src") !== src) {
    delete image.dataset.failedSrc;
    image.src = src;
  }
  writeBoolean(image, "hidden", false);
  writeBoolean(fallback, "hidden", true);
}

function raritySummary(summary) {
  const flatSeen = {
    weak: summary?.seenWeak, common: summary?.seenCommon, uncommon: summary?.seenUncommon,
    rare: summary?.seenRare, epic: summary?.seenEpic, legendary: summary?.seenLegendary,
    mythical: summary?.seenMythical,
  };
  return ITEM_RARITIES.map(key => {
    const bucket = summary?.rarityCounts?.[key];
    return [key, {
      captured: Number.isFinite(bucket?.captured) ? bucket.captured : null,
      seen: Number.isFinite(bucket?.seen) ? bucket.seen : flatSeen[key],
      shinyCaptured: Number.isFinite(bucket?.shinyCaptured) ? bucket.shinyCaptured : 0,
      shinySeen: Number.isFinite(bucket?.shinySeen) ? bucket.shinySeen : 0,
    }];
  });
}

function renderRarity(root, summary, state) {
  const wrap = cardNode(root, "[data-card-rarity-grid]");
  if (!wrap) return;
  const copy = state.copy || COPY.en;
  const rarityLabels = state.rarityLabels || RARITY_LABELS.en;
  const locale = state.locale || copy.locale;
  for (const [key, bucket] of raritySummary(summary)) {
    const tile = wrap.querySelector(`[data-rarity-key="${key}"]`);
    const node = tile?.querySelector("strong");
    const shiny = tile?.querySelector("[data-rarity-shiny]");
    const captured = Number.isFinite(bucket.captured) ? bucket.captured : null;
    const seen = Number.isFinite(bucket.seen) ? bucket.seen : null;
    if (node) {
      writeText(node, `${captured == null ? "—" : compactNumber(captured, 0, locale)}/${seen == null ? "—" : compactNumber(seen, 0, locale)}`);
      const exact = `${captured == null ? copy.unavailable : number(captured, 0, locale)} ${copy.capturedOfSeen} ${seen == null ? copy.unavailable : number(seen, 0, locale)} ${copy.seenWord}`;
      node.title = exact;
      node.setAttribute("aria-label", `${rarityLabels[key]}: ${exact}`);
    }
    const shinySeen = Number.isFinite(bucket.shinySeen) ? bucket.shinySeen : 0;
    const shinyCaptured = Number.isFinite(bucket.shinyCaptured) ? bucket.shinyCaptured : 0;
    if (shiny) {
      writeBoolean(shiny, "hidden", shinySeen <= 0 && shinyCaptured <= 0);
      writeText(shiny, `✦ ${compactNumber(shinyCaptured, 0, locale)}/${compactNumber(shinySeen, 0, locale)}`);
      shiny.title = `${copy.shinyCv}: ${number(shinyCaptured, 0, locale)} ${copy.capturedOfSeen} ${number(shinySeen, 0, locale)} ${copy.seenWord}`;
      shiny.setAttribute("aria-label", shiny.title);
    }
  }
}

function createAttemptEntry(root, attempt, filters, columns, now) {
  const copy = filters.copy || COPY.en;
  const locale = filters.locale || copy.locale;
  const rarityLabels = filters.rarityLabels || RARITY_LABELS.en;
  const row = root.ownerDocument.createElement("div");
  row.className = "ppbui-cards-attempt";
  row.setAttribute("role", "listitem");
  row.dataset.rarity = attempt.rarity || "unknown";
  row.dataset.result = attempt.result;
  row.dataset.shiny = attempt.shiny === true ? "true" : "false";
  const values = [
    relativeTime(attempt.atMs, locale, now),
    knownRarity(attempt.rarity) ? (rarityLabels[attempt.rarity] || text(attempt.rarity)) : "—",
    text(attempt.species),
    Number.isFinite(attempt.qualityMultiplier) ? `×${number(attempt.qualityMultiplier, 3, locale)}` : "—",
    attempt.result === "captured" ? copy.captured : copy.failed,
    text(attempt.ball),
    percent(attempt.chance, 3, locale),
    Number.isFinite(attempt.ivTotal) ? number(attempt.ivTotal, 0, locale) : "—"
  ];
  let timeNode = null;
  let image = null;
  values.forEach((value, columnIndex) => {
    const cell = root.ownerDocument.createElement("span");
    cell.dataset.attemptColumn = String(columnIndex);
    cell.dataset.label = columns[columnIndex];
    cell.setAttribute("role", "group");
    const accessibleValue = columnIndex === 2 && attempt.shiny === true ? `${value} · SHINY` : value;
    cell.setAttribute("aria-label", `${columns[columnIndex]}: ${accessibleValue}`);
    cell.title = `${columns[columnIndex]}: ${accessibleValue}`;
    if (columnIndex === 0) timeNode = cell;
    if (columnIndex === 2) {
      cell.className = "ppbui-cards-attempt-pokemon";
      if (!filters.textOnly) {
        image = root.ownerDocument.createElement("img");
        const sprite = requestNativeSpeciesSprite(root.ownerDocument.defaultView, filters, attempt.speciesId, attempt.shiny === true);
        image.alt = ""; image.setAttribute("aria-hidden", "true");
        if (sprite) image.src = sprite; else image.hidden = true;
        cell.append(image);
      }
      const name = root.ownerDocument.createElement("strong");
      name.textContent = `${value}${attempt.shiny === true ? " ✦\u00a0SHINY" : ""}`;
      cell.append(name);
    } else cell.textContent = value;
    row.append(cell);
  });
  if (attempt.result === "captured") {
    const details = root.ownerDocument.createElement("div");
    details.className = "ppbui-cards-attempt-details";
    details.dataset.label = copy.genetics;
    details.textContent = captureDetailText(attempt.captureDetails, copy);
    row.append(details);
  }
  return {
    key: JSON.stringify(attempt),
    row,
    time: { node:timeNode, atMs:attempt.atMs, nextAt:nextRelativeTimeAt(attempt.atMs, now), label:columns[0] },
    image,
    speciesId:attempt.speciesId,
    shiny:attempt.shiny === true,
  };
}

function renderAttempts(root, attempts, available, filters) {
  const body = cardNode(root, "[data-card-attempt-body]");
  if (!body) return;
  const copy = filters.copy || COPY.en;
  const locale = filters.locale || copy.locale;
  const rows = Array.isArray(attempts) ? attempts.filter(attempt => (
    attempt && typeof attempt === "object" && Number.isFinite(attempt.atMs)
    && (attempt.result === "captured" || attempt.result === "fled")
  )) : [];
  const filtered = rows.filter(attempt => (
    (SPECIAL_RARITY_SET.has(attempt.rarity) ? filters.attemptRarities.has(attempt.rarity) : attempt.shiny === true)
    && (filters.attemptShiny === "" || (filters.attemptShiny === "yes") === (attempt.shiny === true))
    && (filters.attemptResult === "" || filters.attemptResult === attempt.result)
  ));
  const signature = JSON.stringify([available, filters.localeKey, locale, filters.speciesSpriteRevision,
    [...filters.attemptRarities].sort(), filters.attemptShiny, filters.attemptResult, rows]);
  const now = Date.now();
  const view = filters.attemptView;
  if (body.dataset.signature === signature) {
    refreshRelativeTimes(view.entries, locale, now);
    return;
  }
  const controls = JSON.stringify([filters.localeKey, locale, ...[...filters.attemptRarities].sort(),
    filters.attemptShiny, filters.attemptResult, filters.textOnly]);
  if (filtered.length === 0) {
    const emptyRow = root.ownerDocument.createElement("div");
    emptyRow.className = "ppbui-cards-empty-row";
    emptyRow.setAttribute("role", "listitem");
    const empty = root.ownerDocument.createElement("span");
    empty.className = "ppbui-cards-empty";
    empty.textContent = !available
      ? copy.analyzerUnavailable
      : rows.length ? copy.noFilteredAttempts : copy.noAttempts;
    emptyRow.append(empty);
    body.replaceChildren(emptyRow);
    view.entries = [];
    view.controls = controls;
    view.spriteRevision = filters.speciesSpriteRevision;
    body.dataset.signature = signature;
    return;
  }
  const nextKeys = filtered.map(attempt => JSON.stringify(attempt));
  const previous = view.controls === controls ? view.entries : [];
  let prefix = 0;
  while (prefix < previous.length && prefix < nextKeys.length && previous[prefix].key === nextKeys[prefix]) prefix++;
  let suffix = 0;
  while (suffix < previous.length - prefix && suffix < nextKeys.length - prefix
    && previous[previous.length - suffix - 1].key === nextKeys[nextKeys.length - suffix - 1]) suffix++;
  const columns = [copy.hour, copy.rarity, copy.pokemon, copy.quality, copy.outcome, copy.ball, copy.chance, copy.ivTotal];
  const fragment = root.ownerDocument.createDocumentFragment();
  const inserted = [];
  for (let index = prefix; index < nextKeys.length - suffix; index++) {
    const entry = createAttemptEntry(root, filtered[index], filters, columns, now);
    fragment.append(entry.row);
    inserted.push(entry);
  }
  if (!previous.length) body.replaceChildren(fragment);
  else {
    for (let index = prefix; index < previous.length - suffix; index++) previous[index].row.remove();
    body.insertBefore(fragment, suffix ? previous[previous.length - suffix].row : null);
  }
  view.entries = [...previous.slice(0, prefix), ...inserted, ...previous.slice(previous.length - suffix)];
  view.controls = controls;
  if (view.spriteRevision !== filters.speciesSpriteRevision && !filters.textOnly) {
    for (const entry of view.entries) {
      if (!entry.image) continue;
      const sprite = requestNativeSpeciesSprite(root.ownerDocument.defaultView, filters, entry.speciesId, entry.shiny);
      if (!sprite) continue;
      if (entry.image.getAttribute("src") !== sprite) entry.image.src = sprite;
      writeBoolean(entry.image, "hidden", false);
    }
  }
  view.spriteRevision = filters.speciesSpriteRevision;
  body.dataset.signature = signature;
  refreshRelativeTimes(view.entries, locale, now);
}

function renderLootHistory(root, lootHistory, available, state) {
  const body = cardNode(root, "[data-card-loot-body]");
  if (!body) return;
  const copy = state.copy || COPY.en;
  const locale = state.locale || copy.locale;
  const rows = Array.isArray(lootHistory) ? lootHistory.filter(entry => entry && typeof entry === "object" && Number.isFinite(entry.atMs)) : [];
  const itemsOf = entry => Array.isArray(entry?.items) ? entry.items.filter(item => item && typeof item === "object") : [];
  const itemIds = rows.flatMap(row => itemsOf(row).map(item => item.itemId));
  if (itemIds.some(Boolean)) requestLootCatalog(root.ownerDocument.defaultView, state, itemIds);
  const itemMeta = item => state.lootCatalog.get(String(item?.itemId || "")) || { itemId:String(item?.itemId || ""), name:String(item?.itemId || ""), rarity:"" };
  const itemMatches = item => {
    if (!state.lootRarity) return true;
    const rarity = itemMeta(item).rarity;
    return state.lootRarity === "none" ? !rarity : rarity === state.lootRarity;
  };
  const filteredRows = state.lootRarity ? rows.filter(row => itemsOf(row).some(itemMatches)) : rows;
  const signature = JSON.stringify([available, state.localeKey, locale, state.lootRarity, state.lootCatalogRevision, rows]);
  const now = Date.now();
  if (body.dataset.signature === signature) {
    refreshRelativeTimes(state.lootTimes, locale, now);
    return;
  }
  body.dataset.signature = signature;
  body.replaceChildren();
  state.lootTimes = [];
  if (filteredRows.length === 0) {
    const emptyRow = root.ownerDocument.createElement("div");
    emptyRow.className = "ppbui-cards-empty-row";
    emptyRow.setAttribute("role", "listitem");
    const empty = root.ownerDocument.createElement("span");
    empty.className = "ppbui-cards-empty";
    empty.textContent = !available ? copy.analyzerUnavailable : rows.length ? copy.noFilteredLoot : copy.noLoot;
    emptyRow.append(empty);
    body.append(emptyRow);
    return;
  }
  filteredRows.forEach((entry) => {
    const row = root.ownerDocument.createElement("div");
    row.className = "ppbui-cards-loot-row";
    row.setAttribute("role", "listitem");
    const head = root.ownerDocument.createElement("div"); head.className = "ppbui-cards-loot-head";
    const when = root.ownerDocument.createElement("span"); when.textContent = relativeTime(entry.atMs, locale, now); when.dataset.label = copy.hour;
    state.lootTimes.push({ node:when, atMs:entry.atMs, nextAt:nextRelativeTimeAt(entry.atMs, now) });
    const pokemon = root.ownerDocument.createElement("strong"); pokemon.textContent = text(entry.species); pokemon.dataset.label = copy.pokemon;
    const total = root.ownerDocument.createElement("strong");
    const totalDisplay = compactMoney(entry.totalValue, 0, false, locale), totalExact = money(entry.totalValue, 0, false, locale);
    total.textContent = `${copy.lootTotal} ${totalDisplay}`; total.dataset.label = copy.lootTotal; total.dataset.cardLootTotal = "";
    total.title = `${copy.lootTotal}: ${totalExact}`; total.setAttribute("aria-label", total.title);
    head.append(when, pokemon, total);
    const items = root.ownerDocument.createElement("div"); items.className = "ppbui-cards-loot-items"; items.dataset.label = copy.items;
    const visibleItems = itemsOf(entry).filter(itemMatches);
    if (!visibleItems.length) {
      const empty = root.ownerDocument.createElement("span"); empty.className = "ppbui-cards-loot-item ppbui-cards-loot-item--empty"; empty.textContent = copy.noItems; items.append(empty);
    } else for (const item of visibleItems) {
      const meta = itemMeta(item), chip = root.ownerDocument.createElement("span"); chip.className = "ppbui-cards-loot-item"; chip.dataset.rarity = meta.rarity || "none";
      const name = root.ownerDocument.createElement("strong"); name.textContent = meta.name || meta.itemId || item.itemId;
      const detail = root.ownerDocument.createElement("small"); detail.textContent = `×${number(item.qty, 0, locale)} · ${meta.rarity ? (state.rarityLabels[meta.rarity] || meta.rarity) : copy.noItemRarity}`;
      chip.append(name, detail); items.append(chip);
    }
    const finance = root.ownerDocument.createElement("div"); finance.className = "ppbui-cards-loot-finance";
    for (const [label, value] of [[copy.directGold, entry.directGold], [copy.lootValue, entry.lootSellValue], [copy.autoSell, entry.autoSellValue]]) {
      const metric = root.ownerDocument.createElement("span"), labelNode = root.ownerDocument.createElement("b"), valueNode = root.ownerDocument.createElement("strong");
      labelNode.textContent = label; valueNode.textContent = compactMoney(value, 0, false, locale); valueNode.title = money(value, 0, false, locale); metric.append(labelNode, valueNode); finance.append(metric);
    }
    row.append(head, items, finance);
    body.append(row);
  });
}

function setControlStatus(root, key, message, tone = "", source = "") {
  const node = cardNode(root, `[data-card-control-status="${key}"]`);
  if (!node) return;
  const nextText = String(message || "");
  if (node.textContent !== nextText) node.textContent = nextText;
  if (node.dataset.tone !== tone) node.dataset.tone = tone;
  if (node.dataset.source !== source) node.dataset.source = source;
}

function copyableSessionSummary(root, state) {
  if (!state.summary) return "";
  const copy = state.copy;
  const lines = [copy.huntSummary];
  const fields = [
    [copy.status, "status"], [copy.time, "time"],
    [copy.seen, "seen"], [copy.captured, "captured"],
    [copy.failed, "failed"], [copy.seenHour, "seen-hour"],
    [copy.huntRate, "capture-rate"], [copy.lastAttemptChance, "last-chance"],
    [copy.totalRevenue, "revenue"], [copy.totalProfit, "profit"],
    [copy.profitHour, "profit-hour"], [copy.pokemonXpHour, "pokemon-xp-hour"],
    [copy.trainerHour, "trainer-xp-hour"],
  ];
  for (const [label, key] of fields) {
    const field = cardNode(root, `[data-card-field="${key}"]`);
    const displayed = field?.textContent?.trim();
    if (!displayed || displayed === "—" || displayed === copy.unavailable) continue;
    const exact = field.title?.startsWith(`${copy.exactValue}: `)
      ? field.title.slice(copy.exactValue.length + 2) : displayed;
    lines.push(`${label}: ${exact}`);
  }
  return lines.length > 1 ? lines.join("\n") : "";
}

function markup(context) {
  const { copy, rarity: rarityLabels } = context;
  const rarityTiles = Object.entries(rarityLabels)
    .filter(([key]) => key !== "unknown")
    .map(([key, label]) => `<div data-rarity-key="${key}" data-rarity="${key}"><span data-card-rarity-label="${key}">${label}</span><strong>—/—</strong><small data-rarity-shiny hidden>✦ —/—</small></div>`)
    .join("");
  const historyRarities = SPECIAL_RARITIES.map(key => `<label><input type="checkbox" data-card-attempt-rarity value="${key}" checked><span data-card-rarity-label="${key}">${rarityLabels[key]}</span></label>`).join("");
  const lootRarities = ITEM_RARITIES.map(key => `<option value="${key}" data-card-rarity-label="${key}">${rarityLabels[key]}</option>`).join("");
  return `
    <nav class="ppbui-cards-shortcuts" data-card-shortcuts hidden aria-label="${copy.sectionNavigation}">
      <div class="ppbui-cards-shortcuts-inner">
        <button type="button" data-card-jump="top" data-card-copy="navTop">${copy.navTop}</button>
        <button type="button" data-card-jump="summary" data-card-copy="navSummary">${copy.navSummary}</button>
        <button type="button" data-card-jump="economy" data-card-copy="navEconomy">${copy.navEconomy}</button>
        <button type="button" data-card-jump="story" data-card-copy="navStory">${copy.navStory}</button>
      </div>
    </nav>
    <section class="ppbui-cards-battle" data-card-aria="battle">
      <div class="ppbui-cards-battle-pair">
        <aside class="ppbui-cards-team-switch" data-card-aria="teamRoster">
          <div class="ppbui-cards-team-switch-head"><span data-card-copy="switchPokemon">${copy.switchPokemon}</span><span class="ppbui-cards-team-switch-short" data-card-copy="switchPokemonShort" aria-hidden="true">${copy.switchPokemonShort}</span><small data-card-control-status="team" role="status" aria-live="polite"></small></div>
          <div class="ppbui-cards-team-list" data-card-team-list></div>
        </aside>
        <article class="ppbui-cards-combat-card ppbui-cards-combat-card--player" data-card-combat="player">
          <div class="ppbui-cards-combat-art"><img data-card-sprite="player" alt="" aria-hidden="true"><span data-card-sprite-fallback="player" aria-hidden="true" data-card-copy="noImage">${copy.noImage}</span></div>
          <div class="ppbui-cards-combat-copy"><small data-card-copy="active">${copy.active}</small><strong data-card-field="player-name">${copy.unavailable}</strong><span data-card-field="player-meta">—</span><div class="ppbui-cards-elements" data-card-elements="player" hidden></div><div class="ppbui-cards-moves" data-card-player-moves hidden aria-label="${copy.moves}"></div><div class="ppbui-cards-meter-stack"><div class="ppbui-cards-meter-row" data-card-player-hp-row hidden><span><b>HP</b><i data-card-player-hp-value>—</i></span><div class="ppbui-cards-hp-meter" data-card-player-hp-meter role="progressbar"><i data-card-player-hp-bar></i></div></div><div class="ppbui-cards-meter-row" data-card-player-exp-row hidden><span><b>EXP</b><i data-card-player-exp-value>—</i></span><div class="ppbui-cards-exp-meter" data-card-player-exp-meter role="progressbar"><i data-card-player-exp-bar></i></div></div></div></div>
        </article>
        <article class="ppbui-cards-combat-card ppbui-cards-combat-card--target" data-card-combat="target" data-rarity="unknown" data-shiny="false">
          <div class="ppbui-cards-combat-art"><img data-card-sprite="target" alt="" aria-hidden="true"><span data-card-sprite-fallback="target" aria-hidden="true" data-card-copy="noTarget">${copy.noTarget}</span></div>
          <div class="ppbui-cards-combat-copy"><div class="ppbui-cards-combat-kicker"><small data-card-copy="target">${copy.target}</small><b class="ppbui-cards-rarity-badge" data-card-target-rarity hidden>—</b><b class="ppbui-cards-shiny-badge" data-card-shiny-badge hidden>✦ SHINY</b></div><strong data-card-field="target-name">${copy.waitingTarget}</strong><span data-card-field="target-meta">—</span><div class="ppbui-cards-elements" data-card-elements="target" hidden></div></div>
        </article>
      </div>
    </section>
    <section class="ppbui-cards-grid" data-card-aria="huntData">
      <article class="ppbui-cards-card ppbui-cards-card--overview ppbui-cards-card--summary"><div class="ppbui-cards-summary-head"><h2 data-card-copy="huntSummary">${copy.huntSummary}</h2><div class="ppbui-cards-session-actions"><button type="button" data-card-copy-summary data-card-copy="copySummary">${copy.copySummary}</button><button type="button" data-card-session-pause>${copy.pause}</button><button type="button" data-card-session-reset data-card-copy="reset">${copy.reset}</button></div><small data-card-control-status="analyzer" role="status" aria-live="polite"></small></div><small class="ppbui-cards-copy-status" data-card-control-status="copy-summary" role="status" aria-live="polite"></small><div class="ppbui-cards-stat-grid">
        <div><span data-card-copy="status">${copy.status}</span><strong data-card-field="status">—</strong></div>
        <div><span data-card-copy="time">${copy.time}</span><strong data-card-field="time">—</strong></div>
        <div><span data-card-copy="seen">${copy.seen}</span><strong data-card-field="seen">—</strong></div>
        <div><span data-card-copy="captured">${copy.captured}</span><strong data-card-field="captured">—</strong></div>
        <div><span data-card-copy="failed">${copy.failed}</span><strong data-card-field="failed">—</strong></div>
        <div><span data-card-copy="seenHour">${copy.seenHour}</span><strong data-card-field="seen-hour">—</strong></div>
      </div></article>
      <article class="ppbui-cards-card ppbui-cards-card--overview ppbui-cards-card--capture"><h2 data-card-copy="capture">${copy.capture}</h2><div class="ppbui-cards-stat-grid">
        <div><span data-card-copy="huntRate">${copy.huntRate}</span><strong data-card-field="capture-rate">—</strong></div>
        <div><span data-card-copy="lastAttemptChance">${copy.lastAttemptChance}</span><strong data-card-field="last-chance">—</strong></div>
        <div><span data-card-copy="epicFailed">${copy.epicFailed}</span><strong data-card-field="epic-failed">—</strong></div>
        <div><span data-card-copy="shinySeen">${copy.shinySeen}</span><strong data-card-field="shiny-seen">—</strong></div>
        <div><span data-card-copy="shinyCaptured">${copy.shinyCaptured}</span><strong data-card-field="shiny-captured">—</strong></div>
      </div></article>
      <article class="ppbui-cards-card ppbui-cards-card--overview ppbui-cards-card--rarity"><h2><span data-card-copy="capturedSeen">${copy.capturedSeen}</span><small data-card-copy="rarityCaption">${copy.rarityCaption}</small></h2><div class="ppbui-cards-rarity" data-card-rarity-grid>
        ${rarityTiles}
      </div></article>
      <article class="ppbui-cards-card ppbui-cards-economy"><h2 data-card-copy="economyXp">${copy.economyXp}</h2>
        <div class="ppbui-cards-economy-groups">
          <section class="ppbui-cards-economy-group ppbui-cards-economy-group--revenue"><h3 data-card-copy="revenue">${copy.revenue}</h3><div class="ppbui-cards-stat-grid">
            <div class="ppbui-cards-kpi-primary"><span data-card-copy="totalRevenue">${copy.totalRevenue}</span><strong data-card-field="revenue">—</strong></div>
            <div><span>$/h</span><strong data-card-field="revenue-hour">—</strong></div>
            <div><span data-card-copy="directGold">${copy.directGold}</span><strong data-card-field="direct-gold">—</strong></div>
            <div><span data-card-copy="lootValue">${copy.lootValue}</span><strong data-card-field="loot-value">—</strong></div>
            <div><span data-card-copy="autoSell">${copy.autoSell}</span><strong data-card-field="auto-sell">—</strong></div>
          </div></section>
          <section class="ppbui-cards-economy-group ppbui-cards-economy-group--profit"><h3 data-card-copy="result">${copy.result}</h3><div class="ppbui-cards-stat-grid">
            <div class="ppbui-cards-kpi-primary"><span data-card-copy="totalProfit">${copy.totalProfit}</span><strong data-card-field="profit">—</strong></div>
            <div><span data-card-copy="profitHour">${copy.profitHour}</span><strong data-card-field="profit-hour">—</strong></div>
            <div><span data-card-copy="expenses">${copy.expenses}</span><strong data-card-field="expenses">—</strong></div>
            <div><span data-card-copy="expensesHour">${copy.expensesHour}</span><strong data-card-field="expenses-hour">—</strong></div>
          </div></section>
          <section class="ppbui-cards-economy-group ppbui-cards-economy-group--xp"><h3 data-card-copy="experience">${copy.experience}</h3><div class="ppbui-cards-stat-grid">
            <div class="ppbui-cards-kpi-primary"><span data-card-copy="pokemonXpHour">${copy.pokemonXpHour}</span><strong data-card-field="pokemon-xp-hour">—</strong></div>
            <div><span data-card-copy="pokemonTotal">${copy.pokemonTotal}</span><strong data-card-field="pokemon-xp">—</strong></div>
            <div><span data-card-copy="trainerHour">${copy.trainerHour}</span><strong data-card-field="trainer-xp-hour">—</strong></div>
            <div><span data-card-copy="trainerTotal">${copy.trainerTotal}</span><strong data-card-field="trainer-xp">—</strong></div>
          </div></section>
        </div>
      </article>
      <article class="ppbui-cards-card ppbui-cards-history">
        <div class="ppbui-cards-story-head">
          <h2><span data-card-copy="history">${copy.history}</span><small data-card-copy="historyCaption">${copy.historyCaption}</small></h2>
          <div class="ppbui-cards-story-tabs" role="tablist" aria-label="${copy.history}">
            <button type="button" id="ppbui-card-story-tab-hunt" role="tab" aria-selected="true" aria-controls="ppbui-card-story-panel-hunt" tabindex="0" data-card-story-tab="hunt" data-card-copy="huntStory">${copy.huntStory}</button>
            <button type="button" id="ppbui-card-story-tab-loot" role="tab" aria-selected="false" aria-controls="ppbui-card-story-panel-loot" tabindex="-1" data-card-story-tab="loot" data-card-copy="lootStory">${copy.lootStory}</button>
          </div>
        </div>
        <section class="ppbui-cards-story-panel" id="ppbui-card-story-panel-hunt" role="tabpanel" aria-labelledby="ppbui-card-story-tab-hunt" data-card-story-panel="hunt">
          <div class="ppbui-cards-history-filters">
            <details class="ppbui-cards-rarity-filter"><summary data-card-attempt-rarity-summary>${copy.raritySummaryAll}</summary><fieldset>${historyRarities}</fieldset></details>
            <div class="ppbui-cards-result-filter" role="group" aria-label="${copy.outcome}"><span data-card-copy="outcome">${copy.outcome}</span><div class="ppbui-cards-result-options"><button type="button" data-card-attempt-result="" aria-pressed="true" tabindex="0" data-card-copy="all">${copy.all}</button><button type="button" data-card-attempt-result="captured" aria-pressed="false" tabindex="-1" data-card-copy="captured">${copy.captured}</button><button type="button" data-card-attempt-result="fled" aria-pressed="false" tabindex="-1" data-card-copy="failed">${copy.failed}</button></div></div>
            <label><span data-card-copy="shiny">${copy.shiny}</span><select data-card-attempt-shiny><option value="" data-card-copy="all">${copy.all}</option><option value="yes" data-card-copy="yes">${copy.yes}</option><option value="no" data-card-copy="no">${copy.no}</option></select></label>
          </div>
          <div class="ppbui-cards-attempt-scroll" data-card-attempt-scroll>
            <div class="ppbui-cards-attempt-labels" aria-hidden="true">
              <span data-attempt-column="0" data-card-copy="hour">${copy.hour}</span>
              <span data-attempt-column="1" data-card-copy="rarity">${copy.rarity}</span>
              <span data-attempt-column="2" data-card-copy="pokemon">${copy.pokemon}</span>
              <span data-attempt-column="3" data-card-copy="quality">${copy.quality}</span>
              <span data-attempt-column="4" data-card-copy="outcome">${copy.outcome}</span>
              <span data-attempt-column="5" data-card-copy="ball">${copy.ball}</span>
              <span data-attempt-column="6" data-card-copy="chance">${copy.chance}</span>
              <span data-attempt-column="7" data-card-copy="ivTotal">${copy.ivTotal}</span>
            </div>
            <div class="ppbui-cards-attempt-table" role="list" data-card-aria="historyTable">
              <div data-card-attempt-body></div>
            </div>
          </div>
        </section>
        <section class="ppbui-cards-story-panel" id="ppbui-card-story-panel-loot" role="tabpanel" aria-labelledby="ppbui-card-story-tab-loot" data-card-story-panel="loot" hidden>
          <div class="ppbui-cards-history-filters ppbui-cards-loot-filters">
            <label><span data-card-copy="itemRarity">${copy.itemRarity}</span><select data-card-loot-rarity><option value="" data-card-copy="all">${copy.all}</option>${lootRarities}<option value="none" data-card-copy="noItemRarity">${copy.noItemRarity}</option></select></label>
          </div>
          <div class="ppbui-cards-loot-table" role="list" data-card-aria="lootTable">
            <div data-card-loot-body></div>
          </div>
        </section>
      </article>
    </section>`;
}

function applyStaticLocale(root, context) {
  const { copy, rarity: rarityLabels } = context;
  root.querySelectorAll("[data-card-copy]").forEach(node => {
    const value = copy[node.dataset.cardCopy];
    if (typeof value === "string") node.textContent = value;
  });
  root.querySelectorAll("[data-card-rarity-label]").forEach(node => {
    node.textContent = rarityLabels[node.dataset.cardRarityLabel] || "—";
  });
  const shiny = cardNode(root, "[data-card-attempt-shiny]");
  if (shiny?.options?.length >= 3) {
    shiny.options[0].textContent = copy.all;
    shiny.options[1].textContent = copy.yes;
    shiny.options[2].textContent = copy.no;
  }
  const specialRarityLabels = SPECIAL_RARITIES.map(key => rarityLabels[key] || key).join(", ");
  root.setAttribute("aria-label", copy.huntConsole);
  cardNode(root, "[data-card-shortcuts]")?.setAttribute("aria-label", copy.sectionNavigation);
  cardNode(root, ".ppbui-cards-result-filter")?.setAttribute("aria-label", copy.outcome);
  cardNode(root, '[data-card-aria="battle"]')?.setAttribute("aria-label", `${copy.active} / ${copy.target}`);
  cardNode(root, '[data-card-aria="teamRoster"]')?.setAttribute("aria-label", copy.switchPokemon);
  cardNode(root, '[data-card-aria="huntData"]')?.setAttribute("aria-label", copy.huntSummary);
  cardNode(root, '[data-card-aria="historyTable"]')?.setAttribute("aria-label", `${copy.huntStory}: ${specialRarityLabels} + ${copy.shiny}`);
  cardNode(root, '[data-card-aria="lootTable"]')?.setAttribute("aria-label", copy.lootStory);
  cardNode(root, ".ppbui-cards-story-tabs")?.setAttribute("aria-label", copy.history);
  const rarityFieldset = cardNode(root, ".ppbui-cards-rarity-filter fieldset");
  rarityFieldset?.setAttribute("aria-label", `${copy.rarity}: ${specialRarityLabels}. ${copy.shinyFilterHelp}`);
  cardNode(root, "[data-card-player-hp-meter]")?.setAttribute("aria-label", `HP · ${copy.active}`);
  cardNode(root, "[data-card-player-exp-meter]")?.setAttribute("aria-label", `EXP · ${copy.active}`);
}

function styles() {
  return `
    .ppbui-coupled-cards{position:fixed;inset:0;z-index:2147482000;box-sizing:border-box;overflow:auto;padding:8px;background:var(--ppbui-bg-1,rgba(22,29,32,.92));color:var(--ppbui-text,#ebecdc);font:12px/1.35 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif);scrollbar-color:var(--ppbui-scrollbar-thumb,#6b6543) var(--ppbui-scrollbar-track,rgba(22,29,32,.85));scrollbar-width:thin}
    .ppbui-coupled-cards[hidden]{display:none!important}.ppbui-coupled-cards *{box-sizing:border-box}.ppbui-coupled-cards h2{margin:0 0 9px;color:var(--section-accent,var(--ppbui-selected,#e3c054));font-size:12px;font-weight:800;letter-spacing:.045em;text-transform:uppercase}.ppbui-coupled-cards h2 small{margin-left:8px;color:var(--ppbui-text-subtle,#c3d5c7);font:600 10px/1.2 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif);letter-spacing:0;text-transform:none}.ppbui-coupled-cards h3{margin:0 0 6px;color:var(--group-accent,var(--ppbui-text,#ebecdc));font-size:10px;letter-spacing:.04em;text-transform:uppercase}
    .ppbui-coupled-cards[data-ppbui-text-only="true"]{position:relative;inset:auto;z-index:auto;min-height:100vh;contain:layout paint style}
    .ppbui-coupled-cards[data-ppbui-text-only="true"] .ppbui-cards-combat-art{display:none!important}
    .ppbui-coupled-cards[data-ppbui-text-only="true"] .ppbui-cards-combat-card{grid-template-columns:minmax(0,1fr)}
    .ppbui-coupled-cards[data-ppbui-text-only="true"] .ppbui-element-icon{display:none!important}
    .ppbui-coupled-cards[data-ppbui-text-only="true"] .ppbui-cards-element i{display:inline}
    .ppbui-coupled-cards[data-ppbui-text-only="true"] .ppbui-cards-meter-row{grid-template-columns:minmax(0,1fr)}
    .ppbui-coupled-cards[data-ppbui-text-only="true"] :is(.ppbui-cards-hp-meter,.ppbui-cards-exp-meter){display:none!important}
    .ppbui-coupled-cards [data-rarity="weak"]{--rarity-color:var(--quality-weak,#878573)}.ppbui-coupled-cards [data-rarity="common"]{--rarity-color:var(--quality-common,#c3d5c7)}.ppbui-coupled-cards [data-rarity="uncommon"]{--rarity-color:var(--quality-uncommon,#55a058)}.ppbui-coupled-cards [data-rarity="rare"]{--rarity-color:var(--quality-rare,#2485a6)}.ppbui-coupled-cards [data-rarity="epic"]{--rarity-color:var(--quality-epic,#e3c054)}.ppbui-coupled-cards [data-rarity="legendary"]{--rarity-color:var(--quality-legendary,#e6928a)}.ppbui-coupled-cards [data-rarity="mythical"]{--rarity-color:var(--quality-mythical,#54bad2)}.ppbui-coupled-cards [data-rarity="unknown"]{--rarity-color:var(--ppbui-border-strong,#6b6543)}
    .ppbui-cards-battle{height:158px;max-height:164px;margin:0 0 8px}.ppbui-cards-battle-pair{display:grid;grid-template-columns:minmax(126px,.58fr) minmax(0,1fr) minmax(0,1fr);align-items:stretch;gap:5px;height:100%;min-height:0}.ppbui-cards-team-switch{display:grid;grid-template-rows:18px minmax(0,1fr);min-width:0;padding:4px;border:1px solid var(--ppbui-accent-hi,#54bad2);border-radius:var(--ppbui-radius,0px);background:var(--ppbui-bg-2,rgba(35,44,46,.96))}.ppbui-cards-team-switch-head{display:flex;align-items:center;justify-content:space-between;gap:4px;min-width:0;color:var(--ppbui-accent-hi,#54bad2);font:800 8px/1 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif);letter-spacing:.04em;text-transform:uppercase}.ppbui-cards-team-switch-head>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ppbui-cards-team-switch-head>small{min-width:0;overflow:hidden;color:var(--ppbui-text-subtle,#c3d5c7);font:700 7px/1 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif);letter-spacing:0;text-overflow:ellipsis;text-transform:none;white-space:nowrap}.ppbui-cards-team-switch-head>small[data-tone="success"]{color:var(--ppbui-success-text,#69a66f)}.ppbui-cards-team-switch-head>small[data-tone="error"]{color:var(--ppbui-danger-hi,#e6928a)}.ppbui-cards-team-switch-head>small[data-tone="busy"]{color:var(--ppbui-selected,#e3c054)}.ppbui-cards-team-list{display:grid;grid-template-rows:repeat(6,minmax(0,1fr));gap:2px;min-height:0}.ppbui-cards-team-member{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:4px;min-width:0;min-height:0;padding:1px 4px;border:1px solid var(--ppbui-border,#6b6543);border-radius:var(--ppbui-radius-badge,0px);background:var(--ppbui-bg-0,rgba(22,29,32,.85));color:var(--ppbui-text,#ebecdc);font:700 8px/1 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif);text-align:left}.ppbui-cards-team-member>strong{min-width:0;overflow:hidden;font:800 9px/1 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif);text-overflow:ellipsis;white-space:nowrap}.ppbui-cards-team-member>span{color:var(--ppbui-text-muted,#c3d5c7);font:700 8px/1 var(--ppbui-font-data,"Inter","Segoe UI",Arial,sans-serif);white-space:nowrap}.ppbui-cards-team-member[aria-pressed="true"]{border-color:var(--ppbui-accent-hi,#54bad2);background:color-mix(in srgb,var(--ppbui-accent-hi,#54bad2) 12%,var(--ppbui-bg-0,rgba(22,29,32,.85)));color:var(--ppbui-accent-hi,#54bad2)}.ppbui-cards-team-member:not(:disabled):hover{border-color:var(--ppbui-accent-hi,#54bad2);background:var(--ppbui-bg-2,rgba(35,44,46,.96));cursor:pointer}.ppbui-cards-team-member:focus-visible{outline:2px solid var(--ppbui-focus,#54bad2);outline-offset:1px}.ppbui-cards-team-member:disabled{cursor:default;opacity:.52}.ppbui-cards-team-member--empty{color:var(--ppbui-text-subtle,#c3d5c7);opacity:.42}.ppbui-cards-combat-card{--combat-accent:var(--ppbui-border-strong,#6b6543);display:grid;grid-template-columns:72px minmax(0,1fr);align-items:center;gap:8px;min-width:0;padding:7px 8px;border:1px solid var(--combat-accent);border-bottom-width:1px;border-radius:var(--ppbui-radius,0px);background:var(--ppbui-bg-2,rgba(35,44,46,.96))}.ppbui-cards-combat-card--player{--combat-accent:var(--ppbui-accent-hi,#54bad2)}.ppbui-cards-combat-card--target{--combat-accent:var(--rarity-color,var(--ppbui-border-strong,#6b6543))}.ppbui-cards-combat-card--target[data-shiny="true"]{border-top-color:var(--ppbui-accent-hi,#54bad2);border-right-color:var(--ppbui-accent-hi,#54bad2);background:var(--ppbui-bg-2,rgba(35,44,46,.96))}.ppbui-cards-combat-art{display:grid;width:70px;height:70px;place-items:center;overflow:hidden;border:1px solid var(--combat-accent);border-radius:var(--ppbui-radius,0px);background:var(--ppbui-bg-0,rgba(22,29,32,.85))}.ppbui-cards-combat-art img{max-width:66px;max-height:66px;image-rendering:pixelated}.ppbui-cards-combat-art span{padding:3px;color:var(--ppbui-text-subtle,#c3d5c7);font:800 8px/1.1 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif);text-align:center}.ppbui-cards-combat-copy{min-width:0}.ppbui-cards-combat-card small{display:block;margin-bottom:2px;color:var(--combat-accent);font-size:8px;font-weight:800;letter-spacing:.09em}.ppbui-cards-combat-card strong{display:block;overflow:hidden;color:var(--ppbui-text,#ebecdc);font-size:13px;text-overflow:ellipsis;white-space:nowrap}.ppbui-cards-combat-card>div:last-child>span{display:block;margin-top:2px;overflow:hidden;color:var(--ppbui-text-muted,#c3d5c7);font:600 10px/1.2 var(--ppbui-font-data,"Inter","Segoe UI",Arial,sans-serif);text-overflow:ellipsis;white-space:nowrap}.ppbui-cards-combat-kicker{display:flex;align-items:center;gap:4px;min-width:0;overflow:hidden}.ppbui-cards-combat-kicker>small{margin:0;flex:0 0 auto}.ppbui-cards-rarity-badge,.ppbui-cards-shiny-badge{display:inline-grid!important;place-items:center;min-height:16px;padding:1px 4px;border-radius:var(--ppbui-radius-badge,0px);font:900 8px/1 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif)!important;letter-spacing:.07em;white-space:nowrap}.ppbui-cards-rarity-badge{border:1px solid var(--rarity-color,var(--ppbui-border-strong,#6b6543));background:color-mix(in srgb,var(--rarity-color,var(--ppbui-border-strong,#6b6543)) 14%,var(--ppbui-bg-0,rgba(22,29,32,.85)));color:var(--rarity-color,var(--ppbui-text-muted,#c3d5c7))!important}.ppbui-cards-shiny-badge{border:1px solid var(--ppbui-accent-hi,#54bad2);background:color-mix(in srgb,var(--ppbui-accent-hi,#54bad2) 18%,var(--ppbui-bg-0,rgba(22,29,32,.85)));color:var(--ppbui-selected,#e3c054)!important}.ppbui-cards-rarity-badge[hidden],.ppbui-cards-shiny-badge[hidden]{display:none!important}.ppbui-cards-elements{display:flex;align-items:center;gap:4px;min-width:0;margin-top:3px;overflow:hidden}.ppbui-cards-elements[hidden]{display:none!important}.ppbui-cards-element{display:flex;align-items:center;gap:2px;min-width:0}.ppbui-cards-element .ppbui-element-icon{flex:0 0 auto}.ppbui-cards-element i{overflow:hidden;color:var(--ppbui-text-subtle,#c3d5c7);font:700 8px/1 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif);font-style:normal;text-overflow:ellipsis;white-space:nowrap}.ppbui-cards-moves{display:flex;align-items:center;gap:3px;min-height:19px;margin-top:3px}.ppbui-cards-moves[hidden]{display:none!important}.ppbui-cards-move{display:grid;width:19px;height:19px;place-items:center;overflow:hidden;border:1px solid var(--ppbui-border,#6b6543);border-radius:var(--ppbui-radius-badge,0px);background:var(--ppbui-bg-0,rgba(22,29,32,.85))}.ppbui-cards-move img{width:17px;height:17px;object-fit:contain;image-rendering:pixelated}.ppbui-cards-meter-stack{display:grid;gap:2px;margin-top:3px}.ppbui-cards-meter-row{display:grid;grid-template-columns:max-content minmax(0,1fr);align-items:center;gap:4px;min-width:0}.ppbui-cards-meter-row[hidden]{display:none!important}.ppbui-cards-meter-row>span{display:flex!important;justify-content:flex-start;gap:3px;margin:0!important;color:var(--ppbui-text-subtle,#c3d5c7)!important;font:700 8px/1 var(--ppbui-font-data,"Inter","Segoe UI",Arial,sans-serif)!important;white-space:nowrap}.ppbui-cards-meter-row>span b{color:var(--combat-accent);font:800 8px/1 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif)}.ppbui-cards-meter-row>span i{max-width:105px;overflow:hidden;font-style:normal;text-overflow:ellipsis;white-space:nowrap}.ppbui-cards-hp-meter,.ppbui-cards-exp-meter{width:100%;height:4px;overflow:hidden;border:1px solid var(--ppbui-border,#6b6543);border-radius:var(--ppbui-radius-badge,0px);background:var(--ppbui-bg-0,rgba(22,29,32,.85))}.ppbui-cards-hp-meter>i,.ppbui-cards-exp-meter>i{display:block;width:0;height:100%}.ppbui-cards-hp-meter>i{background:var(--ppbui-success,#55a058)}.ppbui-cards-hp-meter[data-state="low"]>i{background:var(--ppbui-danger-hi,#e6928a)}.ppbui-cards-exp-meter>i{background:var(--ppbui-accent-hi,#54bad2)}
    .ppbui-cards-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;align-items:stretch}.ppbui-cards-card{--section-accent:var(--ppbui-border-strong,#6b6543);min-width:0;height:100%;padding:10px;border:1px solid var(--ppbui-border,#6b6543);border-top:1px solid var(--section-accent);border-radius:var(--ppbui-radius,0px);background:var(--ppbui-bg-1,rgba(22,29,32,.92))}.ppbui-cards-card--summary{--section-accent:var(--ppbui-accent-hi,#54bad2)}.ppbui-cards-card--rarity{--section-accent:var(--ppbui-selected,#e3c054);grid-column:1/-1}.ppbui-cards-card--capture{--section-accent:var(--ppbui-success,#55a058)}.ppbui-cards-history{--section-accent:var(--ppbui-info,#2485a6);grid-column:1/-1}.ppbui-cards-economy{--section-accent:var(--ppbui-selected,#e3c054);grid-column:1/-1}.ppbui-cards-stat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px}.ppbui-cards-stat-grid>div{min-width:0;padding:7px 8px;border-left:1px solid color-mix(in srgb,var(--section-accent,var(--group-accent,#878573)) 68%,transparent);background:var(--ppbui-bg-0,rgba(22,29,32,.85))}.ppbui-cards-stat-grid span{display:block;color:var(--ppbui-text-subtle,#c3d5c7);font-size:10px;font-weight:650}.ppbui-cards-stat-grid strong{display:block;margin-top:3px;color:var(--ppbui-text,#ebecdc);font:800 14px/1.15 var(--ppbui-font-data,"Inter","Segoe UI",Arial,sans-serif);font-variant-numeric:tabular-nums}.ppbui-cards-stat-grid strong[data-tone="positive"]{color:var(--ppbui-success-text,#69a66f)}.ppbui-cards-stat-grid strong[data-tone="negative"]{color:var(--ppbui-danger-hi,#e6928a)}
    .ppbui-cards-rarity{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.ppbui-cards-rarity>div{display:grid;grid-template-columns:minmax(58px,1fr) auto;grid-template-rows:auto auto;align-items:center;min-width:0;min-height:36px;border:1px solid color-mix(in srgb,var(--rarity-color) 65%,var(--ppbui-border,#6b6543));border-left:1px solid var(--rarity-color);border-radius:var(--ppbui-radius,0px);background:var(--ppbui-bg-0,rgba(22,29,32,.85))}.ppbui-cards-rarity span{grid-row:1/-1;min-width:0;padding:0 6px;color:var(--rarity-color);font-size:9px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ppbui-cards-rarity strong{padding:2px 7px 0;color:var(--ppbui-text,#ebecdc);font:800 13px/1 var(--ppbui-font-data,"Inter","Segoe UI",Arial,sans-serif);font-variant-numeric:tabular-nums;text-align:right}.ppbui-cards-rarity small{padding:1px 7px 2px;color:var(--ppbui-selected,#e3c054);font:800 8px/1 var(--ppbui-font-data,"Inter","Segoe UI",Arial,sans-serif);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}.ppbui-cards-rarity small[hidden]{display:none!important}
    .ppbui-cards-story-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}.ppbui-cards-story-head h2{margin:0}.ppbui-cards-story-tabs{display:inline-flex;min-width:0;border:1px solid var(--ppbui-border-strong,#6b6543);border-radius:var(--ppbui-radius,0px);overflow:hidden}.ppbui-cards-story-tabs button{height:26px;padding:2px 9px;border:0;border-left:1px solid var(--ppbui-border-strong,#6b6543);background:var(--ppbui-bg-2,rgba(35,44,46,.96));color:var(--ppbui-text-subtle,#c3d5c7);font:800 9px/1 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif);white-space:nowrap}.ppbui-cards-story-tabs button:first-child{border-left:0}.ppbui-cards-story-tabs button[aria-selected="true"]{background:var(--ppbui-bg-0,rgba(22,29,32,.85));color:var(--ppbui-accent-hi,#54bad2)}.ppbui-cards-story-tabs button:focus-visible{position:relative;z-index:1;outline:2px solid var(--ppbui-focus,#54bad2);outline-offset:-2px}.ppbui-cards-story-panel[hidden]{display:none!important}.ppbui-cards-history-filters{display:flex;align-items:end;justify-content:flex-end;gap:6px;margin-bottom:6px}.ppbui-cards-history-filters label{display:grid;gap:2px;color:var(--ppbui-text-subtle,#c3d5c7);font-size:10px;font-weight:700;letter-spacing:.025em;text-transform:uppercase}.ppbui-cards-history-filters select{min-width:106px;height:26px;padding:2px 22px 2px 6px;border:1px solid var(--ppbui-border-strong,#6b6543);border-radius:var(--ppbui-control-radius,var(--ppbui-radius,0px));background:var(--ppbui-bg-2,rgba(35,44,46,.96));color:var(--ppbui-text,#ebecdc);font:600 10px/1.2 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif)}.ppbui-cards-history-filters select:focus-visible{outline:2px solid var(--ppbui-focus,#54bad2);outline-offset:1px}.ppbui-cards-loot-filters{justify-content:flex-start}.ppbui-cards-attempt-scroll{width:100%;min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-color:var(--ppbui-scrollbar-thumb,#6b6543) var(--ppbui-scrollbar-track,rgba(22,29,32,.85));scrollbar-width:thin}.ppbui-cards-attempt-labels,.ppbui-cards-attempt{display:grid;grid-template-columns:64px 74px minmax(140px,1fr) 72px 72px 92px 68px 64px;align-items:center;min-width:648px}.ppbui-cards-attempt-labels{margin:0 1px;padding:0;border:1px solid var(--ppbui-border,#6b6543);border-bottom:0;background:var(--ppbui-bg-2,rgba(35,44,46,.96));color:var(--ppbui-text-subtle,#c3d5c7);font:800 8px/1 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif);letter-spacing:.025em;text-transform:uppercase}.ppbui-cards-attempt-labels>span{min-width:0;padding:4px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ppbui-cards-attempt-labels>[data-attempt-column="1"]{text-align:center}.ppbui-cards-attempt-labels>[data-attempt-column="3"],.ppbui-cards-attempt-labels>[data-attempt-column="6"],.ppbui-cards-attempt-labels>[data-attempt-column="7"]{text-align:right}.ppbui-cards-attempt-table,.ppbui-cards-loot-table{width:100%;min-width:0;max-height:190px;overflow-y:auto;overflow-x:hidden;border:1px solid var(--ppbui-border,#6b6543);border-radius:var(--ppbui-radius,0px);background:var(--ppbui-bg-0,rgba(22,29,32,.85));scrollbar-color:var(--ppbui-scrollbar-thumb,#6b6543) var(--ppbui-scrollbar-track,rgba(22,29,32,.85));scrollbar-width:thin}.ppbui-cards-attempt-table{min-width:648px}.ppbui-cards-attempt,.ppbui-cards-loot-row{align-items:center;min-width:0;border-top:1px solid var(--ppbui-border,#6b6543)}.ppbui-cards-attempt{min-height:36px;border-left:1px solid var(--rarity-color,var(--ppbui-border,#6b6543))}.ppbui-cards-attempt:first-child,.ppbui-cards-loot-row:first-child{border-top:0}.ppbui-cards-attempt[data-shiny="true"]{background:var(--ppbui-bg-0,rgba(22,29,32,.85));box-shadow:none}.ppbui-cards-attempt>span{min-width:0;padding:4px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ppbui-cards-attempt>[data-attempt-column="1"]{color:var(--rarity-color,var(--ppbui-text-muted,#c3d5c7));font-weight:800;text-align:center}.ppbui-cards-attempt>[data-attempt-column="3"],.ppbui-cards-attempt>[data-attempt-column="6"],.ppbui-cards-attempt>[data-attempt-column="7"]{text-align:right}.ppbui-cards-attempt>[data-attempt-column="5"]{color:var(--ppbui-text-subtle,#c3d5c7)}.ppbui-cards-attempt[data-shiny="true"]>[data-attempt-column="2"]{color:var(--ppbui-selected,#e3c054)}.ppbui-cards-attempt[data-result="captured"]>[data-attempt-column="4"]{color:var(--ppbui-success-text,#69a66f);font-weight:800}.ppbui-cards-attempt[data-result="fled"]>[data-attempt-column="4"]{color:var(--ppbui-danger-hi,#e6928a);font-weight:800}.ppbui-cards-attempt-pokemon{display:flex;align-items:center;gap:5px}.ppbui-cards-attempt-pokemon img{width:28px;height:28px;flex:0 0 28px;object-fit:contain;image-rendering:pixelated}.ppbui-cards-attempt-pokemon strong{min-width:0;overflow:hidden;text-overflow:ellipsis}.ppbui-cards-attempt>.ppbui-cards-attempt-details{grid-column:1/-1;padding:5px 7px;border-top:1px solid var(--ppbui-border,#6b6543);color:var(--ppbui-text-subtle,#c3d5c7);font:600 9px/1.25 var(--ppbui-font-data,"Inter","Segoe UI",Arial,sans-serif);text-align:left;white-space:normal}.ppbui-cards-attempt>.ppbui-cards-attempt-details::before{content:attr(data-label) ': ';color:var(--ppbui-text,#ebecdc);font-weight:800}.ppbui-cards-loot-row{display:grid;gap:5px;padding:7px 8px}.ppbui-cards-loot-head{display:grid;grid-template-columns:72px minmax(100px,1fr) auto;align-items:center;gap:8px}.ppbui-cards-loot-head>*{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ppbui-cards-loot-head>span{color:var(--ppbui-text-subtle,#c3d5c7)}.ppbui-cards-loot-head>strong:last-child{color:var(--ppbui-selected,#e3c054);text-align:right}.ppbui-cards-loot-items{display:flex;flex-wrap:wrap;gap:4px;padding:5px 0;border-top:1px solid var(--ppbui-border,#6b6543)}.ppbui-cards-loot-items::before{content:attr(data-label) ':';align-self:center;color:var(--ppbui-text-subtle,#c3d5c7);font-size:9px;font-weight:800}.ppbui-cards-loot-item{display:inline-grid;grid-template-columns:auto auto;align-items:center;gap:4px;padding:3px 5px;border-left:2px solid var(--quality-common,#c3d5c7);background:var(--ppbui-bg-2,rgba(35,44,46,.96))}.ppbui-cards-loot-item[data-rarity="weak"]{border-color:var(--quality-weak,#878573)}.ppbui-cards-loot-item[data-rarity="uncommon"]{border-color:var(--quality-uncommon,#55a058)}.ppbui-cards-loot-item[data-rarity="rare"]{border-color:var(--quality-rare,#2485a6)}.ppbui-cards-loot-item[data-rarity="epic"]{border-color:var(--quality-epic,#e3c054)}.ppbui-cards-loot-item[data-rarity="legendary"]{border-color:var(--quality-legendary,#e6928a)}.ppbui-cards-loot-item[data-rarity="mythical"]{border-color:var(--quality-mythical,#54bad2)}.ppbui-cards-loot-item[data-rarity="none"]{border-color:var(--ppbui-border-strong,#6b6543)}.ppbui-cards-loot-item strong{font-size:9px}.ppbui-cards-loot-item small{color:var(--ppbui-text-subtle,#c3d5c7);font-size:8px}.ppbui-cards-loot-item--empty{color:var(--ppbui-text-subtle,#c3d5c7)}.ppbui-cards-loot-finance{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px}.ppbui-cards-loot-finance>span{display:flex;align-items:center;justify-content:space-between;gap:5px;min-width:0;padding:4px 5px;background:var(--ppbui-bg-2,rgba(35,44,46,.96))}.ppbui-cards-loot-finance b{overflow:hidden;color:var(--ppbui-text-subtle,#c3d5c7);font-size:8px;text-overflow:ellipsis;white-space:nowrap}.ppbui-cards-loot-finance strong{font:800 9px/1 var(--ppbui-font-data,"Inter","Segoe UI",Arial,sans-serif);white-space:nowrap}.ppbui-cards-empty-row{display:block}.ppbui-cards-empty{display:block;margin:0;padding:14px;color:var(--ppbui-text-subtle,#c3d5c7);text-align:center}
    .ppbui-cards-summary-head{position:relative;display:flex;align-items:start;justify-content:space-between;gap:8px;margin-bottom:8px}.ppbui-cards-summary-head h2{margin:0}.ppbui-cards-session-actions{display:flex;gap:4px}.ppbui-cards-session-actions button{height:24px;padding:2px 7px;border:1px solid var(--ppbui-border-strong,#6b6543);border-radius:var(--ppbui-radius);background:var(--ppbui-bg-2,rgba(35,44,46,.96));color:var(--ppbui-text,#ebecdc);font:700 9px/1 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif)}.ppbui-cards-session-actions button:focus-visible{outline:2px solid var(--ppbui-focus,#54bad2);outline-offset:1px}.ppbui-cards-session-actions button:disabled{color:var(--ppbui-text-subtle,#c3d5c7)}.ppbui-cards-summary-head>small{position:absolute;right:0;top:27px;color:var(--ppbui-text-subtle,#c3d5c7);font-size:9px}.ppbui-cards-summary-head>small[data-tone="success"]{color:var(--ppbui-success-text,#69a66f)}.ppbui-cards-summary-head>small[data-tone="error"]{color:var(--ppbui-danger-hi,#e6928a)}
    .ppbui-cards-rarity-filter{position:relative}.ppbui-cards-rarity-filter>summary{min-width:118px;height:26px;padding:5px 22px 2px 6px;border:1px solid var(--ppbui-border-strong,#6b6543);border-radius:var(--ppbui-control-radius,var(--ppbui-radius,0px));background:var(--ppbui-bg-2,rgba(35,44,46,.96));color:var(--ppbui-text,#ebecdc);font:600 10px/1.2 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif);cursor:pointer;list-style:none}.ppbui-cards-rarity-filter>summary::-webkit-details-marker{display:none}.ppbui-cards-rarity-filter>summary:focus-visible{outline:2px solid var(--ppbui-focus,#54bad2);outline-offset:1px}.ppbui-cards-rarity-filter fieldset{position:absolute;right:0;z-index:6;display:grid;grid-template-columns:repeat(2,minmax(88px,1fr));gap:4px;width:210px;margin:3px 0 0;padding:6px;border:1px solid var(--ppbui-border-strong,#6b6543);border-radius:var(--ppbui-radius,0px);background:var(--ppbui-bg-2,rgba(35,44,46,.96))}.ppbui-cards-rarity-filter fieldset label{display:flex;align-items:center;gap:5px;text-transform:none}.ppbui-cards-rarity-filter input{accent-color:var(--ppbui-focus,#54bad2)}.ppbui-cards-rarity-filter input:focus-visible{outline:2px solid var(--ppbui-focus,#54bad2);outline-offset:1px}
    .ppbui-cards-economy{border-top-width:1px;background:var(--ppbui-bg-1,rgba(22,29,32,.92))}.ppbui-cards-economy-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.ppbui-cards-economy-group{--group-accent:var(--ppbui-border-strong,#6b6543);min-width:0;padding:8px;border:1px solid color-mix(in srgb,var(--group-accent) 72%,var(--ppbui-border,#6b6543));border-left:1px solid var(--group-accent);border-radius:var(--ppbui-radius,0px);background:var(--ppbui-bg-1,rgba(22,29,32,.92))}.ppbui-cards-economy-group h3{display:flex;align-items:center;min-height:22px;padding:0 5px;border-bottom:1px solid var(--ppbui-border,#6b6543);background:var(--ppbui-bg-2,rgba(35,44,46,.96))}.ppbui-cards-economy-group .ppbui-cards-stat-grid>div{--section-accent:var(--group-accent)}.ppbui-cards-economy-group .ppbui-cards-kpi-primary{grid-column:1/-1;min-height:48px;padding:8px 10px;border-left-width:1px;background:var(--ppbui-bg-0,rgba(22,29,32,.85))}.ppbui-cards-economy-group .ppbui-cards-kpi-primary span{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.035em}.ppbui-cards-economy-group .ppbui-cards-kpi-primary strong{font-size:20px;line-height:1.05}.ppbui-cards-economy-group--revenue{--group-accent:var(--ppbui-selected,#e3c054)}.ppbui-cards-economy-group--profit{--group-accent:var(--ppbui-success,#55a058)}.ppbui-cards-economy-group--xp{--group-accent:var(--ppbui-accent-hi,#54bad2)}
    @media(max-width:640px){.ppbui-cards-story-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px}.ppbui-cards-history-filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:end}.ppbui-cards-history-filters select,.ppbui-cards-rarity-filter>summary{width:100%;min-width:0}}
    @media(max-width:519px){.ppbui-coupled-cards{padding:6px}.ppbui-cards-attempt-table{max-height:218px}.ppbui-cards-loot-table{max-height:260px}.ppbui-cards-battle{height:162px}.ppbui-cards-battle-pair{grid-template-columns:minmax(92px,.62fr) minmax(0,1fr) minmax(0,1fr);gap:3px}.ppbui-cards-team-switch{grid-template-rows:16px minmax(0,1fr);padding:3px}.ppbui-cards-team-switch-head{display:grid;grid-template-columns:minmax(0,1fr);align-content:center;justify-content:stretch;gap:1px;font-size:7px}.ppbui-cards-team-switch-head>small{font-size:6px}.ppbui-cards-team-member{gap:2px;padding:1px 2px}.ppbui-cards-team-member>strong{font-size:8px}.ppbui-cards-team-member>span{font-size:7px}.ppbui-cards-combat-card{grid-template-columns:52px minmax(0,1fr);gap:4px;padding:5px}.ppbui-cards-combat-art{width:50px;height:50px}.ppbui-cards-combat-art img{max-width:46px;max-height:46px}.ppbui-cards-combat-art span{font-size:7px}.ppbui-cards-combat-card strong{font-size:11px}.ppbui-cards-combat-card>div:last-child>span{font-size:8px}.ppbui-cards-combat-card--player>div:last-child>span{line-height:1.1;white-space:normal}.ppbui-cards-elements{gap:2px;margin-top:2px}.ppbui-cards-element i{display:none}.ppbui-cards-moves{gap:2px;min-height:16px;margin-top:2px}.ppbui-cards-move{width:16px;height:16px}.ppbui-cards-move img{width:14px;height:14px}.ppbui-cards-combat-kicker{flex-wrap:wrap;overflow:visible;gap:2px}.ppbui-cards-rarity-badge,.ppbui-cards-shiny-badge{flex:0 0 auto;min-height:13px;padding:1px 2px;font-size:7px!important;letter-spacing:0}.ppbui-cards-shiny-badge{width:auto;min-width:0;max-width:none;overflow:visible}.ppbui-cards-meter-stack{gap:1px;margin-top:2px}.ppbui-cards-meter-row{grid-template-columns:max-content minmax(0,1fr);gap:2px}.ppbui-cards-meter-row>span,.ppbui-cards-meter-row>span b{font-size:7px!important}.ppbui-cards-meter-row>span i{max-width:76px}.ppbui-cards-grid{grid-template-columns:1fr;gap:6px}.ppbui-cards-card{padding:8px}.ppbui-cards-card--rarity,.ppbui-cards-history,.ppbui-cards-economy{grid-column:1}.ppbui-cards-economy-groups{grid-template-columns:1fr}.ppbui-cards-story-head{grid-template-columns:1fr}.ppbui-cards-story-tabs{justify-self:start}.ppbui-cards-loot-finance{grid-template-columns:1fr}.ppbui-cards-loot-head{grid-template-columns:64px minmax(0,1fr) auto}}
    .ppbui-cards-shortcuts{position:sticky;top:0;height:0;z-index:10;pointer-events:none}.ppbui-cards-shortcuts[hidden]{display:none!important}.ppbui-cards-shortcuts-inner{position:absolute;right:0;top:0;display:flex;gap:3px;padding:3px;border:1px solid var(--ppbui-border,#6b6543);background:var(--ppbui-bg-2,rgba(35,44,46,.96));pointer-events:auto}.ppbui-cards-shortcuts button{min-height:26px;padding:3px 7px;border:1px solid var(--ppbui-border,#6b6543);background:var(--ppbui-bg-0,rgba(22,29,32,.85));color:var(--ppbui-text,#ebecdc);font:700 10px/1 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif);cursor:pointer}.ppbui-cards-shortcuts button:focus-visible{outline:2px solid var(--ppbui-focus,#54bad2);outline-offset:1px}.ppbui-cards-battle:focus-visible,.ppbui-cards-card:focus-visible{outline:2px solid var(--ppbui-focus,#54bad2);outline-offset:-2px}
    .ppbui-cards-team-switch-short{display:none}.ppbui-cards-result-filter{display:grid;gap:2px;min-width:0;color:var(--ppbui-text-subtle,#c3d5c7);font-size:10px;font-weight:700;letter-spacing:.025em;text-transform:uppercase}.ppbui-cards-result-options{display:flex;gap:2px}.ppbui-cards-result-options button{min-height:26px;padding:3px 7px;border:1px solid var(--ppbui-border,#6b6543);background:var(--ppbui-bg-2,rgba(35,44,46,.96));color:var(--ppbui-text,#ebecdc);font:700 10px/1 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif);white-space:nowrap;cursor:pointer}.ppbui-cards-result-options button[aria-pressed="true"]{border-color:var(--ppbui-selected,#e3c054);color:var(--ppbui-selected,#e3c054)}.ppbui-cards-result-options button:focus-visible{outline:2px solid var(--ppbui-focus,#54bad2);outline-offset:1px}.ppbui-cards-copy-status{display:block;margin:-4px 0 6px;color:var(--ppbui-text-subtle,#c3d5c7);font:600 10px/1.3 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif)}.ppbui-cards-copy-status:empty{display:none}.ppbui-cards-copy-status[data-tone="success"]{color:var(--ppbui-success-text,#69a66f)}.ppbui-cards-copy-status[data-tone="error"]{color:var(--ppbui-danger-hi,#e6928a)}.ppbui-cards-copy-status[data-tone="busy"]{color:var(--ppbui-selected,#e3c054)}
    @media(max-width:640px){.ppbui-cards-history-filters{grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-areas:"rarity shiny" "result result"}.ppbui-cards-history-filters>.ppbui-cards-rarity-filter{grid-area:rarity}.ppbui-cards-history-filters>label{grid-area:shiny}.ppbui-cards-history-filters>.ppbui-cards-result-filter{grid-area:result}.ppbui-cards-result-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.ppbui-cards-result-options button{min-width:0}.ppbui-cards-attempt-scroll{overflow-x:hidden;overflow-y:visible}.ppbui-cards-attempt-labels{display:none}.ppbui-cards-attempt-table{min-width:0;max-height:252px}.ppbui-cards-team-switch-head{font-size:9px}.ppbui-cards-team-switch-head>small{font-size:8px}.ppbui-cards-team-member>strong{font-size:10px}.ppbui-cards-team-member>span{font-size:9px}.ppbui-cards-meter-row>span,.ppbui-cards-meter-row>span b{font-size:9px!important}}
    @media(max-width:640px){.ppbui-cards-meter-row{grid-template-columns:minmax(0,1fr);row-gap:1px}.ppbui-cards-meter-row>span{min-width:0;max-width:100%;overflow:hidden}.ppbui-cards-meter-row>span i{min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis}.ppbui-cards-hp-meter,.ppbui-cards-exp-meter{width:100%}}
    @media(max-width:519px){.ppbui-cards-attempt-table{max-height:218px}.ppbui-cards-team-switch-head>[data-card-copy="switchPokemon"]{display:none}.ppbui-cards-team-switch-head>.ppbui-cards-team-switch-short{display:inline}}
    @media(max-width:640px){
      .ppbui-cards-attempt-table{container-type:inline-size}
      .ppbui-cards-attempt{min-width:0;min-height:80px;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-areas:"pokemon pokemon rarity" "time result ball" "quality chance iv";column-gap:3px;row-gap:0;padding:5px 6px;align-items:stretch}
      .ppbui-cards-attempt>span{display:flex;min-width:0;flex-direction:column;align-items:flex-start;justify-content:center;gap:2px;padding:4px 3px;font-size:11px;line-height:1.2;text-align:left!important;white-space:normal;overflow-wrap:anywhere}
      .ppbui-cards-attempt>span:not(.ppbui-cards-attempt-pokemon)::before{content:attr(data-label);color:var(--ppbui-text-subtle,#c3d5c7);font:700 9px/1.15 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif);text-transform:uppercase}
      .ppbui-cards-attempt>.ppbui-cards-attempt-pokemon{grid-area:pokemon;display:flex;flex-direction:row;flex-wrap:wrap;align-content:center;align-items:center;justify-content:flex-start;gap:2px 4px;min-height:34px;border-bottom:1px solid var(--ppbui-border,#6b6543)}
      .ppbui-cards-attempt>.ppbui-cards-attempt-pokemon::before{content:attr(data-label);flex:0 0 100%;color:var(--ppbui-text-subtle,#c3d5c7);font:700 9px/1.15 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif);text-transform:uppercase}
      .ppbui-cards-attempt-pokemon img{width:20px;height:20px;flex-basis:20px}
      .ppbui-cards-attempt-pokemon strong{flex:1 1 0;min-width:0;font:800 12px/1.2 var(--ppbui-font-body,"Inter","Segoe UI",Arial,sans-serif);white-space:normal;overflow-wrap:anywhere;text-overflow:clip}
      .ppbui-cards-attempt>[data-attempt-column="0"]{grid-area:time;align-items:flex-start}
      .ppbui-cards-attempt>[data-attempt-column="1"]{grid-area:rarity;text-align:right!important;align-items:flex-end;border-bottom:1px solid var(--ppbui-border,#6b6543)}
      .ppbui-cards-attempt>[data-attempt-column="3"]{grid-area:quality;text-align:left!important;align-items:flex-start;border-top:1px solid var(--ppbui-border,#6b6543);font-variant-numeric:tabular-nums}
      .ppbui-cards-attempt>[data-attempt-column="4"]{grid-area:result;border-top:0}
      .ppbui-cards-attempt>[data-attempt-column="5"]{grid-area:ball;border-top:0}
      .ppbui-cards-attempt>[data-attempt-column="6"]{grid-area:chance;text-align:left!important;align-items:flex-start;border-top:1px solid var(--ppbui-border,#6b6543);font-variant-numeric:tabular-nums}
      .ppbui-cards-attempt>[data-attempt-column="7"]{grid-area:iv;text-align:left!important;align-items:flex-start;border-top:1px solid var(--ppbui-border,#6b6543);font-variant-numeric:tabular-nums}
      .ppbui-cards-attempt>.ppbui-cards-attempt-details{grid-column:1/-1;min-width:0;overflow-wrap:anywhere}
    }
    @container (max-width:320px){
      .ppbui-cards-attempt{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-areas:"pokemon rarity" "time result" "ball chance" "quality iv";min-height:0}
      .ppbui-cards-attempt>[data-attempt-column="0"]{align-items:flex-start}
      .ppbui-cards-attempt>[data-attempt-column="3"],.ppbui-cards-attempt>[data-attempt-column="7"]{border-top:1px solid var(--ppbui-border,#6b6543)}
      .ppbui-cards-attempt>[data-attempt-column="5"],.ppbui-cards-attempt>[data-attempt-column="6"]{border-top:1px solid var(--ppbui-border,#6b6543)}
      .ppbui-cards-attempt-pokemon img{width:18px;height:18px;flex-basis:18px}
      .ppbui-cards-attempt-pokemon strong{font-size:11px}
    }
    /* Narrow WebView2 panes must not spend the available target-label width
       on three parallel cards. Reflow the layout instead of hiding CURRENT. */
    @media(max-width:519px){
      .ppbui-cards-battle{height:auto;max-height:none}
      .ppbui-cards-battle-pair{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:108px minmax(112px,auto);height:auto;gap:4px}
      .ppbui-cards-team-switch{grid-column:1/-1;grid-row:1}
      .ppbui-cards-combat-card--player{grid-column:1;grid-row:2}
      .ppbui-cards-combat-card--target{grid-column:2;grid-row:2}
      .ppbui-cards-combat-card{min-height:112px;align-content:center}
      .ppbui-cards-combat-card strong,.ppbui-cards-combat-card>div:last-child>span{white-space:normal;overflow-wrap:anywhere}
    }
    @media(min-width:520px) and (max-width:899px){
      .ppbui-cards-combat-card strong,.ppbui-cards-combat-card>div:last-child>span{white-space:normal;overflow-wrap:anywhere}
      .ppbui-cards-combat-kicker{flex-wrap:wrap;overflow:visible}
    }
    @media(min-width:520px) and (max-width:640px){
      .ppbui-cards-elements{flex-wrap:wrap;overflow:visible}
      .ppbui-cards-element i{white-space:normal;overflow:visible;text-overflow:clip}
    }
    @media(max-width:319px){
      .ppbui-cards-battle-pair{grid-template-columns:minmax(0,1fr);grid-template-rows:104px minmax(96px,auto) minmax(96px,auto)}
      .ppbui-cards-team-switch{grid-column:1;grid-row:1}
      .ppbui-cards-combat-card--player{grid-column:1;grid-row:2}
      .ppbui-cards-combat-card--target{grid-column:1;grid-row:3}
      .ppbui-cards-combat-card{min-height:96px}
    }
    @media(min-width:900px){.ppbui-cards-battle{height:158px}.ppbui-cards-battle-pair{grid-template-columns:minmax(126px,.6fr) minmax(0,1.4fr) minmax(0,1fr);gap:8px}.ppbui-cards-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.ppbui-cards-card--overview{min-height:168px}.ppbui-cards-card--rarity{grid-column:auto}.ppbui-cards-economy-groups{grid-template-columns:repeat(3,minmax(0,1fr))}}
  `;
}

export function createCoupledCards({ win, textOnly = false }) {
  const doc = win.document;
  const initialLocale = localeContext(win);
  const style = doc.createElement("style");
  style.dataset.ppbuiCoupledCardsStyle = "";
  style.textContent = styles();
  (doc.head || doc.documentElement).append(style);
  const root = doc.createElement("main");
  root.className = "ppbui-coupled-cards";
  root.dataset.ppbuiCoupledCards = "";
  if (textOnly) root.dataset.ppbuiTextOnly = "true";
  root.setAttribute("aria-label", "Hunt console");
  root.innerHTML = markup(initialLocale);
  // Standalone mode scrolls the document and already owns a sticky Cards/Game switch.
  // Its navigation remains unchanged; the compact section shortcuts belong to the host pane.
  if (textOnly) cardNode(root, "[data-card-shortcuts]")?.remove();
  (doc.body || doc.documentElement).append(root);
  applyStaticLocale(root, initialLocale);
  const state = {
    playerRoot: null,
    playerVisualId: "",
    playerVisualReader: null,
    playerSpriteAttempts: 0,
    playerSpeciesKey: "",
    playerSpeciesSprite: "",
    playerSpeciesRequest: null,
    playerSpeciesAttempts: 0,
    playerMovesetId: "",
    playerMoveset: [],
    playerMovesetLoaded: false,
    playerMovesetRequest: null,
    playerMovesetAttempts: 0,
    playerMovesetEpoch: 0,
    nativeSpeciesSprites: new Map(),
    nativeSpeciesRequests: new Map(),
    nativeSpeciesAttempts: new Map(),
    speciesSpriteRevision: 0,
    lootCatalog: new Map(),
    lootCatalogLoaded: false,
    lootCatalogRequest: null,
    lootCatalogCheckedAt: new Map(),
    lootCatalogRevision: 0,
    lootRarity: "",
    mode: "game",
    attemptRarities: new Set(SPECIAL_RARITIES),
    attemptShiny: "",
    attemptResult: "",
    attemptView: { entries:[], controls:"", spriteRevision:-1 },
    lootTimes: [],
    storyTab: "hunt",
    summary: null,
    localeKey: initialLocale.key,
    locale: initialLocale.locale,
    copy: initialLocale.copy,
    rarityLabels: initialLocale.rarity,
    teamActionBusy: false,
    activeLeaderAction: null,
    awaitingLeaderSyncId: "",
    awaitingPreviousLeaderId: "",
    pendingTeamFocusId: "",
    analyzerActionBusy: false,
    copySummaryRequestId: 0,
    spriteErrorBindings: [],
    disposed: false,
    rerender: null,
    textOnly: Boolean(textOnly),
  };
  const rarityFilters = [...root.querySelectorAll("[data-card-attempt-rarity]")];
  const rarityFilterSummary = cardNode(root, "[data-card-attempt-rarity-summary]");
  const shinyFilter = cardNode(root, "[data-card-attempt-shiny]");
  const resultFilters = [...root.querySelectorAll("[data-card-attempt-result]")];
  const lootRarityFilter = cardNode(root, "[data-card-loot-rarity]");
  const sectionShortcuts = cardNode(root, "[data-card-shortcuts]");
  const copySummaryButton = cardNode(root, "[data-card-copy-summary]");
  const storyTabs = [...root.querySelectorAll("[data-card-story-tab]")];
  const storyPanels = [...root.querySelectorAll("[data-card-story-panel]")];
  const teamList = cardNode(root, "[data-card-team-list]");
  const pauseButton = cardNode(root, "[data-card-session-pause]");
  const resetButton = cardNode(root, "[data-card-session-reset]");
  let mountedNativeBus = null;
  const usableNativeBus = bus => typeof bus?.on === "function" && typeof bus?.off === "function";
  const busBindings = [];
  const bindBus = (name, handler) => {
    busBindings.push([name, handler]);
    if (usableNativeBus(mountedNativeBus)) mountedNativeBus.on(name, handler);
  };
  const reconcileNativeBus = () => {
    const candidate = win?.PokeIdle?.Bus;
    const next = usableNativeBus(candidate) ? candidate : null;
    if (next === mountedNativeBus) return;
    // Cards may mount before the game's native Bus has finished initializing.
    // Rebind existing listeners after hydration, keeping a single native owner.
    if (mountedNativeBus) {
      if (state.activeLeaderAction) state.activeLeaderAction.superseded = true;
      for (const [name, handler] of busBindings) mountedNativeBus.off(name, handler);
    }
    mountedNativeBus = next;
    if (mountedNativeBus) {
      for (const [name, handler] of busBindings) mountedNativeBus.on(name, handler);
    }
  };
  bindBus("moveset.saved", data => {
    if (state.disposed) return;
    const creatureId = String(data?.creature_id || "").trim();
    if (!creatureId || creatureId !== state.playerMovesetId) return;
    state.playerMovesetEpoch += 1;
    state.playerMoveset = [];
    state.playerMovesetLoaded = false;
    state.playerMovesetRequest = null;
    state.playerMovesetAttempts = 0;
    state.rerender?.();
  });
  for (const name of ["team.updated", "combat.leader_changed", "state.resynced"]) {
    bindBus(name, data => {
      if (state.disposed) return;
      const action = state.activeLeaderAction;
      const leaderId = String(data?.leader_id ?? data?.creature_id ?? "").trim();
      if (action && leaderId && leaderId !== action.previous && leaderId !== action.target) action.superseded = true;
      if (name === "state.resynced" && action) action.superseded = true;
      if (state.teamActionBusy) return;
      if (state.mode === "cards") renderActivePlayerCard();
    });
  }
  for (const event of ["ws.disconnected", "hunt.stopped", "auth.accountChangedInAnotherWindow", "auth.loggedOut", "auth.sessionExpired", "auth.characterMissing"]) {
    bindBus(event, () => {
      if (state.activeLeaderAction) state.activeLeaderAction.superseded = true;
    });
  }
  bindBus("huntsim.lifecycle", data => {
    if ((data?.state === "inactive" || data?.state === "activating") && state.activeLeaderAction)
      state.activeLeaderAction.superseded = true;
  });
  for (const name of ["loot.received", "level.up"]) {
    bindBus(name, () => {
      if (!state.disposed && state.mode === "cards") renderActivePlayerCard();
    });
  }
  for (const name of ["xp_share.confirmed", "creature.updated", "creatures.updated"]) {
    bindBus(name, () => {
      if (!state.disposed && state.mode === "cards") renderActivePlayerCard();
    });
  }
  reconcileNativeBus();
  const rerenderAttempts = () => renderAttempts(root, state.summary?.specialHistory, Boolean(state.summary), state);
  const syncRarityFilterSummary = () => {
    if (!rarityFilterSummary) return;
    const selected = state.attemptRarities.size;
    rarityFilterSummary.textContent = selected === SPECIAL_RARITIES.length
      ? state.copy.raritySummaryAll
      : selected === 0 ? state.copy.raritySummaryNone : state.copy.raritySummarySome(selected);
  };
  rarityFilters.forEach(input => input.addEventListener("change", () => {
    if (state.disposed) return;
    state.attemptRarities = new Set(rarityFilters.filter(option => option.checked).map(option => option.value));
    syncRarityFilterSummary();
    rerenderAttempts();
  }));
  shinyFilter?.addEventListener("change", () => { if (state.disposed) return; state.attemptShiny = shinyFilter.value; rerenderAttempts(); });
  const selectResult = value => {
    if (state.disposed || !["", "captured", "fled"].includes(value)) return;
    state.attemptResult = value;
    for (const button of resultFilters) {
      const selected = button.dataset.cardAttemptResult === value;
      button.setAttribute("aria-pressed", String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    rerenderAttempts();
  };
  resultFilters.forEach((button, index) => {
    button.addEventListener("click", () => selectResult(button.dataset.cardAttemptResult));
    button.addEventListener("keydown", event => {
      if (state.disposed || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End"
        ? resultFilters.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + resultFilters.length) % resultFilters.length;
      selectResult(resultFilters[next].dataset.cardAttemptResult);
      resultFilters[next].focus();
    });
  });
  lootRarityFilter?.addEventListener("change", () => {
    if (state.disposed) return;
    state.lootRarity = lootRarityFilter.value;
    renderLootHistory(root, state.summary?.lootHistory, Boolean(state.summary), state);
  });
  const setStoryTab = tab => {
    if (state.disposed) return;
    state.storyTab = tab === "loot" ? "loot" : "hunt";
    storyTabs.forEach(button => {
      const selected = button.dataset.cardStoryTab === state.storyTab;
      button.setAttribute("aria-selected", selected ? "true" : "false");
      button.tabIndex = selected ? 0 : -1;
    });
    storyPanels.forEach(panel => { panel.hidden = panel.dataset.cardStoryPanel !== state.storyTab; });
  };
  storyTabs.forEach(button => button.addEventListener("click", () => setStoryTab(button.dataset.cardStoryTab)));
  storyTabs.forEach((button, index) => button.addEventListener("keydown", event => {
    if (state.disposed || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = storyTabs.length - 1;
    else nextIndex = (index + (event.key === "ArrowRight" ? 1 : -1) + storyTabs.length) % storyTabs.length;
    const target = storyTabs[nextIndex];
    setStoryTab(target.dataset.cardStoryTab);
    target.focus();
  }));
  const onCardsScroll = () => {
    if (!state.disposed && sectionShortcuts)
      sectionShortcuts.hidden = root.scrollTop <= 120 && !sectionShortcuts.contains(doc.activeElement);
  };
  root.addEventListener("scroll", onCardsScroll, { passive: true });
  sectionShortcuts?.addEventListener("focusout", event => {
    if (!state.disposed && root.scrollTop <= 120 && !sectionShortcuts.contains(event.relatedTarget))
      sectionShortcuts.hidden = true;
  });
  root.querySelectorAll("[data-card-jump]").forEach(button => button.addEventListener("click", () => {
    if (state.disposed) return;
    const target = {
      top: cardNode(root, ".ppbui-cards-battle"),
      summary: cardNode(root, ".ppbui-cards-card--summary"),
      economy: cardNode(root, ".ppbui-cards-economy"),
      story: cardNode(root, ".ppbui-cards-history"),
    }[button.dataset.cardJump];
    if (!target) return;
    const desiredTop = button.dataset.cardJump === "top" ? 0 : Math.max(0,
      target.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 36);
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    root.scrollTop = desiredTop;
    onCardsScroll();
  }));
  copySummaryButton?.addEventListener("click", async () => {
    if (state.disposed) return;
    const requestId = ++state.copySummaryRequestId;
    const content = copyableSessionSummary(root, state);
    if (!content || typeof win.navigator?.clipboard?.writeText !== "function") {
      setControlStatus(root, "copy-summary", state.copy.copySummaryUnavailable, "error");
      return;
    }
    try {
      setControlStatus(root, "copy-summary", state.copy.copySummaryPending, "busy");
      await win.navigator.clipboard.writeText(content);
      if (!state.disposed && requestId === state.copySummaryRequestId)
        setControlStatus(root, "copy-summary", state.copy.copySummarySuccess, "success");
    } catch {
      if (!state.disposed && requestId === state.copySummaryRequestId)
        setControlStatus(root, "copy-summary", state.copy.copySummaryError, "error");
    }
  });
  const explicitLeaderId = () => explicitNativeLeaderId(win);
  const renderTeamControl = () => {
    reconcileNativeBus();
    const team = teamControlSnapshot(win);
    if (!teamList) return;
    const currentLeaderId = team.activeId;
    if (state.awaitingLeaderSyncId) {
      const nativeLeaderId = explicitLeaderId();
      if (nativeLeaderId && nativeLeaderId !== state.awaitingPreviousLeaderId) {
        setControlStatus(root, "team", nativeLeaderId === state.awaitingLeaderSyncId
          ? state.copy.activeUpdated : state.copy.leaderHudUnexpected,
        nativeLeaderId === state.awaitingLeaderSyncId ? "success" : "error");
        state.awaitingLeaderSyncId = "";
        state.awaitingPreviousLeaderId = "";
      }
    }
    const awaitingLeaderSync = Boolean(state.awaitingLeaderSyncId);
    const focusedTeamId = teamList.contains(doc.activeElement) ? doc.activeElement?.dataset?.cardTeamMember || "" : "";
    const focusLost = !doc.activeElement || doc.activeElement === doc.body || doc.activeElement === doc.documentElement;
    const focusToRestore = focusedTeamId || (!state.teamActionBusy && !awaitingLeaderSync && state.mode === "cards" && focusLost ? state.pendingTeamFocusId : "");
    const rosterSignature = JSON.stringify([state.localeKey, team.available, currentLeaderId,
      state.teamActionBusy, awaitingLeaderSync, team.members.map(member => [member.id, member.name, member.level, member.fainted])]);
    if (teamList.dataset.rosterSignature !== rosterSignature) {
      const fragment = doc.createDocumentFragment();
      for (let index = 0; index < 6; index++) {
        const member = team.members[index];
        if (!member) {
          const empty = doc.createElement("div");
          empty.className = "ppbui-cards-team-member ppbui-cards-team-member--empty";
          empty.setAttribute("aria-hidden", "true");
          const name = doc.createElement("strong"); name.textContent = "—";
          const level = doc.createElement("span"); level.textContent = "Lv. —";
          empty.append(name, level); fragment.append(empty); continue;
        }
        const button = doc.createElement("button");
        button.type = "button";
        button.className = "ppbui-cards-team-member";
        button.dataset.cardTeamMember = member.id;
        button.dataset.fainted = member.fainted ? "true" : "false";
        button.setAttribute("aria-pressed", member.id === currentLeaderId ? "true" : "false");
        button.disabled = state.teamActionBusy || awaitingLeaderSync || !team.available || member.fainted;
        const levelText = Number.isFinite(member.level) ? `Lv. ${member.level}` : "Lv. —";
        button.setAttribute("aria-label", `${index + 1}, ${member.name}, ${levelText}${member.fainted ? `, ${state.copy.defeated}` : ""}`);
        button.title = member.fainted ? `${member.name} · ${levelText} · ${state.copy.defeated}` : `${member.name} · ${levelText}`;
        const name = doc.createElement("strong"); name.textContent = member.name;
        const level = doc.createElement("span"); level.textContent = levelText;
        button.append(name, level); fragment.append(button);
      }
      teamList.replaceChildren(fragment);
      teamList.dataset.rosterSignature = rosterSignature;
    }
    if (focusToRestore && !state.teamActionBusy) {
      [...teamList.querySelectorAll("[data-card-team-member]")]
        .find(button => button.dataset.cardTeamMember === focusToRestore && !button.disabled)
        ?.focus({ preventScroll: true });
    }
    if (!state.teamActionBusy && (!awaitingLeaderSync || (!focusLost && !focusedTeamId))) state.pendingTeamFocusId = "";
    const teamStatus = cardNode(root, '[data-card-control-status="team"]');
    if (!team.members.length && !state.teamActionBusy) setControlStatus(root, "team", state.copy.teamUnavailable, "error", "availability");
    else if (team.members.length && teamStatus?.dataset.source === "availability") setControlStatus(root, "team", "");
  };
  const renderAnalyzerControl = () => {
    const control = win?.__POKEPIXEL_HUNT_ANALYZER_CONTROL__;
    const ready = control?.protocol === 1 && typeof control?.act === "function" && state.summary?.leadershipActive === true;
    const pausable = state.summary?.status === "running" || state.summary?.status === "paused";
    if (pauseButton) {
      writeText(pauseButton, state.summary?.status === "paused" ? state.copy.resume : state.copy.pause);
      writeBoolean(pauseButton, "disabled", state.analyzerActionBusy || !ready || !pausable);
    }
    writeBoolean(resetButton, "disabled", state.analyzerActionBusy || !ready);
  };
  const runSessionAction = (action) => {
    if (state.disposed || state.analyzerActionBusy) return;
    state.analyzerActionBusy = true;
    renderAnalyzerControl();
    const label = action === "reset" ? state.copy.resetting : action === "resume" ? state.copy.resuming : state.copy.pausing;
    setControlStatus(root, "analyzer", label, "busy");
    void runAnalyzerSessionAction(win, action).then(result => {
      if (state.disposed) return;
      const success = action === "reset" ? state.copy.huntReset : action === "resume" ? state.copy.huntResumed : state.copy.huntPaused;
      setControlStatus(root, "analyzer", result.ok ? success : state.copy.analyzerControlUnavailable, result.ok ? "success" : "error");
    }).finally(() => {
      if (state.disposed) return;
      state.analyzerActionBusy = false;
      renderAnalyzerControl();
    });
  };
  pauseButton?.addEventListener("click", () => runSessionAction(state.summary?.status === "paused" ? "resume" : "pause"));
  resetButton?.addEventListener("click", () => runSessionAction("reset"));
  const switchTeamMember = selectedId => {
    if (state.disposed || state.teamActionBusy || !selectedId) return;
    const previousLeaderId = explicitLeaderId();
    const action = { previous: previousLeaderId, target: selectedId, superseded: false };
    state.activeLeaderAction = action;
    state.teamActionBusy = true;
    state.pendingTeamFocusId = teamList.contains(doc.activeElement)
      ? selectedId : "";
    renderTeamControl();
    setControlStatus(root, "team", state.copy.switching, "busy");
    void setActiveTeamMember(win, selectedId, {
      expectedLeaderId: previousLeaderId,
      isCurrentIntent: () => !state.disposed && state.activeLeaderAction === action && !action.superseded,
    }).then(result => {
      if (state.disposed) return;
      const nativeAtAck = explicitLeaderId();
      state.awaitingLeaderSyncId = result.ok && !result.superseded && nativeAtAck !== selectedId ? selectedId : "";
      state.awaitingPreviousLeaderId = state.awaitingLeaderSyncId ? previousLeaderId : "";
      const status = !result.ok ? state.copy.switchUnavailable
        : result.superseded ? state.copy.leaderSuperseded
          : state.awaitingLeaderSyncId && !result.eventDelivered ? state.copy.leaderSyncUnavailable
            : state.awaitingLeaderSyncId ? state.copy.leaderAwaitHud : state.copy.activeUpdated;
      setControlStatus(root, "team", status, !result.ok || result.superseded || (state.awaitingLeaderSyncId && !result.eventDelivered) ? "error"
        : state.awaitingLeaderSyncId ? "busy" : "success");
    }).catch(() => {
      if (state.disposed) return;
      state.awaitingLeaderSyncId = "";
      state.awaitingPreviousLeaderId = "";
      setControlStatus(root, "team", state.copy.switchUnavailable, "error");
    }).finally(() => {
      if (state.disposed) return;
      if (state.activeLeaderAction === action) state.activeLeaderAction = null;
      state.teamActionBusy = false;
      if (state.mode === "cards") renderActivePlayerCard(); else renderTeamControl();
      if (state.pendingTeamFocusId && !state.awaitingLeaderSyncId && state.mode === "cards" && (!doc.activeElement || doc.activeElement === doc.body || doc.activeElement === doc.documentElement)) {
        [...teamList.querySelectorAll("[data-card-team-member]")]
          .find(button => button.dataset.cardTeamMember === state.pendingTeamFocusId && !button.disabled)
          ?.focus({ preventScroll: true });
      }
      if (!state.awaitingLeaderSyncId || state.mode !== "cards" || (doc.activeElement && doc.activeElement !== doc.body && doc.activeElement !== doc.documentElement)) {
        state.pendingTeamFocusId = "";
      }
    });
  };
  teamList?.addEventListener("click", event => {
    if (state.disposed || state.mode !== "cards") return;
    const button = event.target?.closest?.("[data-card-team-member]");
    if (!button || !teamList.contains(button) || button.disabled || state.teamActionBusy || button.getAttribute("aria-pressed") === "true") return;
    switchTeamMember(button.dataset.cardTeamMember);
  });
  state.rerender = () => {
    if (!state.disposed && state.mode === "cards") render(state.summary);
  };
  root.hidden = true;

  function renderActivePlayerCard() {
    if (state.disposed) return;
    const player = playerSnapshot(win, state);
    setText(root, "player-name", player?.species || state.copy.unavailable);
    setText(root, "player-meta", player
      ? `${Number.isFinite(player.level) ? `Lv. ${player.level}` : "Lv. —"}${player.fainted ? ` · ${state.copy.defeated.toUpperCase()}` : ""}`
      : state.copy.teamUnavailable);
    if (!state.textOnly) setSprite(root, state, "player", player?.spriteUrl || "", state.copy.noImage);
    renderElements(root, "player", player?.elements, win, state.localeKey, state.copy, { textOnly: state.textOnly });
    renderPlayerMoves(root, state, player ? requestPlayerMoveset(win, state, player.id) : []);
    const playerHpRow = cardNode(root, "[data-card-player-hp-row]");
    const playerHpMeter = cardNode(root, "[data-card-player-hp-meter]");
    const playerHpBar = cardNode(root, "[data-card-player-hp-bar]");
    const playerHpValue = cardNode(root, "[data-card-player-hp-value]");
    const playerHpRatio = player && Number.isFinite(player.hp) && Number.isFinite(player.maxHp) && player.maxHp > 0
      ? Math.max(0, Math.min(1, player.hp / player.maxHp))
      : null;
    writeBoolean(playerHpRow, "hidden", playerHpRatio == null);
    if (playerHpMeter) {
      playerHpMeter.dataset.state = playerHpRatio != null && playerHpRatio <= 0.25 ? "low" : "normal";
      if (playerHpRatio != null) {
        playerHpMeter.setAttribute("aria-valuemin", "0");
        playerHpMeter.setAttribute("aria-valuemax", String(player.maxHp));
        playerHpMeter.setAttribute("aria-valuenow", String(player.hp));
        playerHpMeter.setAttribute("aria-valuetext", `${number(player.hp, 0, state.locale)} / ${number(player.maxHp, 0, state.locale)} HP`);
      } else {
        for (const name of ["aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-valuetext"]) playerHpMeter.removeAttribute(name);
      }
    }
    if (playerHpBar) playerHpBar.style.width = playerHpRatio == null ? "0%" : `${Math.round(playerHpRatio * 100)}%`;
    if (playerHpValue) {
      writeText(playerHpValue, playerHpRatio == null ? "—" : `${compactNumber(player.hp, 0, state.locale)}/${compactNumber(player.maxHp, 0, state.locale)}`);
      playerHpValue.title = playerHpRatio == null ? "" : `${number(player.hp, 0, state.locale)} / ${number(player.maxHp, 0, state.locale)}`;
    }
    const playerExpRow = cardNode(root, "[data-card-player-exp-row]");
    const playerExpMeter = cardNode(root, "[data-card-player-exp-meter]");
    const playerExpBar = cardNode(root, "[data-card-player-exp-bar]");
    const playerExpValue = cardNode(root, "[data-card-player-exp-value]");
    const experience = player?.experience || null;
    writeBoolean(playerExpRow, "hidden", !experience);
    if (playerExpBar) playerExpBar.style.width = experience ? `${experience.percent}%` : "0%";
    if (playerExpValue) {
      writeText(playerExpValue, experience ? `${compactNumber(experience.current, 0, state.locale)}/${compactNumber(experience.required, 0, state.locale)} · ${experience.percent}%` : "—");
      playerExpValue.title = experience ? `${number(experience.current, 0, state.locale)} / ${number(experience.required, 0, state.locale)} · ${experience.percent}%` : "";
    }
    if (playerExpMeter) {
      if (experience) {
        playerExpMeter.setAttribute("aria-valuemin", "0");
        playerExpMeter.setAttribute("aria-valuemax", String(experience.required));
        playerExpMeter.setAttribute("aria-valuenow", String(experience.current));
        playerExpMeter.setAttribute("aria-valuetext", `${number(experience.current, 0, state.locale)} / ${number(experience.required, 0, state.locale)} EXP, ${experience.percent}%`);
      } else {
        for (const name of ["aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-valuetext"]) playerExpMeter.removeAttribute(name);
      }
    }
    renderTeamControl();
  }

  function render(summary) {
    if (state.disposed) return;
    const context = localeContext(win);
    if (state.localeKey !== context.key || state.locale !== context.locale) {
      state.localeKey = context.key;
      state.locale = context.locale;
      state.copy = context.copy;
      state.rarityLabels = context.rarity;
      applyStaticLocale(root, context);
      syncRarityFilterSummary();
      setControlStatus(root, "copy-summary", "");
    }
    if (state.summary && !summary) {
      state.copySummaryRequestId += 1;
      setControlStatus(root, "copy-summary", "");
    }
    state.summary = summary;
    writeBoolean(copySummaryButton, "disabled", !summary);
    renderActivePlayerCard();

    const isExpedition = summary?.activityKind === "expedition" && summary?.status === "running";
    const liveTarget = !isExpedition && summary?.status === "running" ? summary.currentTarget || null : null;
    const lastSessionSpecies = !isExpedition ? summary?.currentSessionSpecies || null : null;
    const target = liveTarget || lastSessionSpecies;
    const lastSeen = !liveTarget && Boolean(lastSessionSpecies);
    const lastExpeditionSpecies = lastSeen && summary.activityKind === "expedition";
    writeText(cardNode(root, '[data-card-copy="target"]'),
      lastExpeditionSpecies ? state.copy.lastExpeditionTarget : lastSeen ? state.copy.lastSessionTarget : state.copy.target);
    setText(root, "target-name", summary ? (isExpedition ? "EXPEDITION" : target?.species || state.copy.waitingTarget) : state.copy.unavailable);
    setText(root, "target-meta", !summary
      ? state.copy.analyzerUnavailable
      : isExpedition ? state.copy.expeditionInProgress
        : liveTarget ? levelText(liveTarget)
        : lastExpeditionSpecies ? state.copy.lastSeenInExpedition
          : lastSeen ? state.copy.lastSeenInHunt : state.copy.noCanonicalTarget);
    const targetCard = cardNode(root, '[data-card-combat="target"]');
    if (targetCard) {
      targetCard.dataset.rarity = liveTarget?.rarity || "";
      targetCard.dataset.shiny = liveTarget?.shiny === true ? "true" : "false";
    }
    const shinyBadge = cardNode(root, "[data-card-shiny-badge]");
    writeBoolean(shinyBadge, "hidden", liveTarget?.shiny !== true);
    const rarityBadge = cardNode(root, "[data-card-target-rarity]");
    if (rarityBadge) {
      writeBoolean(rarityBadge, "hidden", !liveTarget?.rarity);
      writeText(rarityBadge, liveTarget?.rarity ? (state.rarityLabels[liveTarget.rarity] || liveTarget.rarity).toUpperCase() : "—");
    }
    const nativeTargetSprite = !state.textOnly && target
      ? requestNativeSpeciesSprite(win, state, String(target.speciesId || ""), false) : "";
    if (!state.textOnly) setSprite(root, state, "target", nativeTargetSprite || "", target ? state.copy.noImage : state.copy.noTarget);
    renderElements(root, "target", liveTarget?.elements, win, state.localeKey, state.copy, { textOnly: state.textOnly });
    renderAnalyzerControl();

    setText(root, "status", !summary ? state.copy.unavailable : summary.status === "running" ? state.copy.running : summary.status === "paused" ? state.copy.paused : state.copy.waiting);
    setText(root, "time", duration(summary?.activeMs));
    setMetric(root, "seen", compactNumber(summary?.seen, 0, state.locale), number(summary?.seen, 0, state.locale), state.copy);
    setMetric(root, "captured", compactNumber(summary?.captured, 0, state.locale), number(summary?.captured, 0, state.locale), state.copy);
    setMetric(root, "failed", compactNumber(summary?.failed, 0, state.locale), number(summary?.failed, 0, state.locale), state.copy);
    setMetric(root, "seen-hour", compactNumber(summary?.seenPerHour, 1, state.locale), number(summary?.seenPerHour, 1, state.locale), state.copy);
    setText(root, "capture-rate", percent(summary?.captureRate, 1, state.locale));
    setText(root, "last-chance", percent(summary?.latestCaptureChance, 3, state.locale));
    setMetric(root, "epic-failed", compactNumber(summary?.epicPlusFailed, 0, state.locale), number(summary?.epicPlusFailed, 0, state.locale), state.copy);
    setMetric(root, "shiny-seen", compactNumber(summary?.shinySeen, 0, state.locale), number(summary?.shinySeen, 0, state.locale), state.copy);
    setMetric(root, "shiny-captured", compactNumber(summary?.shinyCaptured, 0, state.locale), number(summary?.shinyCaptured, 0, state.locale), state.copy);
    const revenue = summary?.revenue ?? summary?.dollar;
    const revenueHour = summary?.revenuePerHour ?? summary?.dollarPerHour;
    setMetric(root, "revenue", compactMoney(revenue, 0, false, state.locale), money(revenue, 0, false, state.locale), state.copy);
    setMetric(root, "revenue-hour", compactMoney(revenueHour, 1, false, state.locale), money(revenueHour, 1, false, state.locale), state.copy);
    setMetric(root, "direct-gold", compactMoney(summary?.directGold, 0, false, state.locale), money(summary?.directGold, 0, false, state.locale), state.copy);
    setMetric(root, "loot-value", compactMoney(summary?.lootSellValue, 0, false, state.locale), money(summary?.lootSellValue, 0, false, state.locale), state.copy);
    setMetric(root, "auto-sell", compactMoney(summary?.autoSellValue, 0, false, state.locale), money(summary?.autoSellValue, 0, false, state.locale), state.copy);
    setMetric(root, "profit", compactMoney(summary?.profit, 0, true, state.locale), money(summary?.profit, 0, true, state.locale), state.copy);
    setMetric(root, "profit-hour", compactMoney(summary?.profitPerHour, 1, true, state.locale), money(summary?.profitPerHour, 1, true, state.locale), state.copy);
    setMetric(root, "expenses", compactMoney(summary?.expenses, 0, false, state.locale), money(summary?.expenses, 0, false, state.locale), state.copy);
    setMetric(root, "expenses-hour", compactMoney(summary?.expensesPerHour, 1, false, state.locale), money(summary?.expensesPerHour, 1, false, state.locale), state.copy);
    setMetric(root, "trainer-xp", compactNumber(summary?.trainerExp, 0, state.locale), number(summary?.trainerExp, 0, state.locale), state.copy);
    setMetric(root, "trainer-xp-hour", compactNumber(summary?.trainerExpPerHour, 1, state.locale), number(summary?.trainerExpPerHour, 1, state.locale), state.copy);
    setMetric(root, "pokemon-xp", compactNumber(summary?.pokemonExp, 0, state.locale), number(summary?.pokemonExp, 0, state.locale), state.copy);
    setMetric(root, "pokemon-xp-hour", compactNumber(summary?.pokemonExpPerHour, 1, state.locale), number(summary?.pokemonExpPerHour, 1, state.locale), state.copy);
    for (const key of ["profit", "profit-hour"]) {
      const node = cardNode(root, `[data-card-field="${key}"]`);
      const value = key === "profit" ? summary?.profit : summary?.profitPerHour;
      if (node) node.dataset.tone = Number.isFinite(value) ? (value > 0 ? "positive" : value < 0 ? "negative" : "") : "";
    }
    renderRarity(root, summary, state);
    renderAttempts(root, summary?.specialHistory, Boolean(summary), state);
    renderLootHistory(root, summary?.lootHistory, Boolean(summary), state);
  }

  function setMode(mode) {
    if (state.disposed) return;
    state.mode = mode === "game" ? "game" : "cards";
    root.hidden = state.mode !== "cards";
    if (state.mode === "cards" && !cardNode(root, '[data-card-sprite="player"]')?.getAttribute("src")) {
      state.playerVisualReader = null;
      state.playerSpriteAttempts = 0;
    }
  }

  return {
    root,
    render,
    setMode,
    cleanup() {
      if (state.activeLeaderAction) state.activeLeaderAction.superseded = true;
      state.disposed = true;
      root.removeEventListener("scroll", onCardsScroll);
      state.playerMovesetEpoch += 1;
      state.rerender = null;
      const bus = mountedNativeBus;
      if (typeof bus?.off === "function") for (const [name, handler] of busBindings) bus.off(name, handler);
      state.spriteErrorBindings.forEach(([image, handler]) => image.removeEventListener("error", handler));
      state.spriteErrorBindings.length = 0;
      root.remove();
      style.remove();
    }
  };
}
