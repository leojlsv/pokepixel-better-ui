import { currentPptoolsLeader, samePptoolsLeader } from './pptools-leader.js';

const IV_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const QUALITY = new Set(['weak', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical']);
const GENDER = new Set(['male', 'female', 'genderless']);
const PPTOOLS_NEUTRAL_EXP_FACTOR = 1;

export class PptoolsNativeInputError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PptoolsNativeInputError';
    this.code = code;
  }
}

const fail = (code, message) => { throw new PptoolsNativeInputError(code, message); };
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, label) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 100 || /[\u0000-\u001f\u007f]/.test(value)) {
    fail('missing-field', `Campo nativo obrigatório indisponível: ${label}.`);
  }
  return value.trim();
};
const integer = (value, label, min = 0, max = 10000) => {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    fail('missing-field', `Campo numérico nativo inválido ou indisponível: ${label}.`);
  }
  return value;
};
const finite = (value, label, min = 0, max = 100) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    fail('missing-field', `Campo numérico nativo inválido ou indisponível: ${label}.`);
  }
  return value;
};
const boolean = (value, label) => {
  if (typeof value !== 'boolean') fail('missing-field', `Campo booleano nativo indisponível: ${label}.`);
  return value;
};

export function currentPptoolsProfileId(win) {
  let presence, auth;
  try {
    presence = win.PokeIdle?.WorldPresence?.getSelfTrainerId?.();
    auth = win.PokeIdle?.Auth?.getTrainerSummary?.()?.id;
  } catch { fail('profile', 'Não foi possível verificar o perfil nativo.'); }
  const ids = [presence, auth].filter(id => id !== null && id !== undefined && String(id).trim());
  if (!ids.length || ids.some(id => String(id).trim() !== String(ids[0]).trim())) {
    fail('profile', 'Perfil nativo indisponível ou divergente nesta pane.');
  }
  return text(String(ids[0]), 'trainerId');
}

function leaderCreature(win, leader) {
  const runtime = win.PokeIdle?.PersistentHud?._teamHud;
  const members = runtime?._creatures;
  if (!Array.isArray(members)) fail('leader', 'Team nativo indisponível.');
  const matches = members.filter(item => String(item?.id ?? '').trim() === leader.id);
  if (matches.length !== 1 || matches[0].is_leader !== true) fail('leader', 'Líder nativo ambíguo.');
  return matches[0];
}

function assertSameLeader(win, expected, profileId) {
  if (!samePptoolsLeader(expected, currentPptoolsLeader(win)) || currentPptoolsProfileId(win) !== profileId) {
    fail('stale', 'O líder ou perfil mudou durante a leitura.');
  }
  return leaderCreature(win, expected);
}

function assertKnownFieldAgreement(left, right, key, name = key) {
  if (!record(right) || !(key in right) || right[key] === undefined || right[key] === null ||
      !record(left) || !(key in left) || left[key] === undefined || left[key] === null) return;
  const identical = key === 'ivs' && record(left.ivs) && record(right.ivs)
    ? IV_KEYS.every(iv => left.ivs[iv] == null || right.ivs[iv] == null ||
      left.ivs[iv] === right.ivs[iv])
    : JSON.stringify(left[key]) === JSON.stringify(right[key]);
  if (!identical) {
    fail('stale', `Dados nativos divergentes para ${name}.`);
  }
}

function verifyCreatureIdentity(candidate, leader, partial = false) {
  if (!record(candidate) || String(candidate.id ?? '').trim() !== leader.id) {
    fail('stale', 'Identidade da instância divergiu entre leituras nativas.');
  }
  const speciesIds = [candidate.species_id, candidate.species?.id, candidate.species?.species_id]
    .filter(value => value != null && String(value).trim());
  if ((!partial && !speciesIds.length) ||
      speciesIds.some(value => String(value).trim() !== leader.speciesId)) {
    fail('stale', 'Espécie da instância divergiu entre leituras nativas.');
  }
  if (candidate.level == null && partial) return;
  if (candidate.level !== leader.level) {
    const error = new PptoolsNativeInputError('stale', 'Nível da instância divergiu entre leituras nativas.');
    error.retryableLevel = Number.isSafeInteger(candidate.level);
    throw error;
  }
}

function mergedCreature(base, candidate, leader) {
  if (!candidate) return base;
  verifyCreatureIdentity(candidate, leader, true);
  for (const key of ['species_id', 'level', 'ivs', 'iv_total', 'quality', 'quality_multiplier',
    'nature', 'gender', 'is_shiny', 'is_starter']) assertKnownFieldAgreement(base, candidate, key);
  const merged = { ...base };
  for (const [key, value] of Object.entries(candidate)) {
    if (value != null) merged[key] = value;
  }
  if (record(base.ivs) && record(candidate.ivs)) {
    merged.ivs = { ...base.ivs };
    for (const [key,value] of Object.entries(candidate.ivs)) {
      if (value != null) merged.ivs[key] = value;
    }
  }
  if (record(base.species) && record(candidate.species)) {
    merged.species = { ...base.species };
    for (const [key,value] of Object.entries(candidate.species)) {
      if (value != null) merged.species[key] = value;
    }
  }
  return merged;
}

function readIvs(creature) {
  const raw = creature.ivs;
  if (!record(raw) || IV_KEYS.some(key => !Object.hasOwn(raw, key))) {
    fail('missing-field', 'Os seis IVs do líder não estão disponíveis em dados nativos.');
  }
  const ivs = Object.fromEntries(IV_KEYS.map(key => [key, integer(raw[key], `ivs.${key}`, 0, 31)]));
  if (creature.iv_total != null && creature.iv_total !== Object.values(ivs).reduce((sum, item) => sum + item, 0)) {
    fail('stale', 'Total de IVs diverge dos seis valores nativos.');
  }
  return ivs;
}

function projectInput(creature, trainer, leader) {
  verifyCreatureIdentity(creature, leader);
  const qualityTier = text(creature.quality, 'quality');
  if (!QUALITY.has(qualityTier)) fail('missing-field', 'Raridade nativa desconhecida.');
  const nature = text(creature.nature, 'nature');
  const gender = text(creature.gender, 'gender');
  if (!GENDER.has(gender)) fail('missing-field', 'Gênero nativo desconhecido.');
  const multiplier = finite(creature.quality_multiplier, 'quality_multiplier', 0.01, 10);
  const trainerLevel = integer(trainer?.level, 'trainer.level', 1, 10000);
  return {
    speciesId: text(leader.speciesId, 'species_id'),
    lvl: integer(leader.level, 'level'),
    ivs: readIvs(creature),
    qualityTier,
    multiplier,
    nature,
    gender,
    trainerLevel,
    // Native COPIAR JSON contains neither exp_buff nor is_starter. The PPTools
    // EXP factor is a simulation setting, not a verified game trainer field.
    expBuff: null,
    starter: creature.is_starter == null ? null : boolean(creature.is_starter, 'is_starter'),
    shiny: boolean(creature.is_shiny, 'is_shiny'),
  };
}

/** Map observed native fields to the PPTools importer. Optional simulation-only
 * settings use its documented neutral initial values; actual active EXP buffs
 * and an unspecified starter bonus remain unknown. */
export function toPptoolsAttackerInput(native) {
  if (!record(native)) fail('contract', 'Projeção de atacante PPTools indisponível.');
  const ivs = native.ivs;
  if (!record(ivs) || IV_KEYS.some(key => !Object.hasOwn(ivs,key))) {
    fail('contract', 'IVs insuficientes para o importador PPTools.');
  }
  const qualityTier = text(native.qualityTier,'qualityTier');
  if (!QUALITY.has(qualityTier)) fail('contract', 'Qualidade desconhecida para o importador PPTools.');
  const gender = text(native.gender,'gender');
  if (!GENDER.has(gender)) fail('contract','Gênero desconhecido para o importador PPTools.');
  return {
    pokemon:text(native.speciesId,'speciesId'),
    level:integer(native.lvl,'lvl',1),
    trainerLevel:integer(native.trainerLevel,'trainerLevel',1),
    qualityTier,
    quality:qualityTier,
    exactMultiplier:finite(native.multiplier,'multiplier',0.01,10),
    nature:text(native.nature,'nature'),
    gender,
    isShiny:boolean(native.shiny,'shiny'),
    isStarter:native.starter == null ? false : boolean(native.starter,'starter'),
    expBuff:PPTOOLS_NEUTRAL_EXP_FACTOR,
    ivs:{
      hp:integer(ivs.hp,'ivs.hp',0,31),
      atk:integer(ivs.atk,'ivs.atk',0,31),
      def:integer(ivs.def,'ivs.def',0,31),
      spAtk:integer(ivs.spa,'ivs.spa',0,31),
      spDef:integer(ivs.spd,'ivs.spd',0,31),
      speed:integer(ivs.spe,'ivs.spe',0,31),
    },
  };
}

/** Read-only native projection. Its field names do not claim byte-equivalence
 * with PokePixel's unverified hover COPIAR JSON serialization contract. */
async function readPptoolsNativeInputOnce(win, leader, profileId) {
  const runtime = win.PokeIdle?.PersistentHud?._teamHud;
  const original = leaderCreature(win, leader);
  const api = win.PokeIdle?.Api;
  let creature = original;

  if (typeof api?.getTeam === 'function' && typeof api?.getCreatures === 'function') {
    let teamResult, creaturesResult;
    try { teamResult = await api.getTeam(); }
    catch { fail('native-read', 'Não foi possível consultar o Team nativo.'); }
    assertSameLeader(win, leader, profileId);
    try { creaturesResult = await api.getCreatures('team'); }
    catch { fail('native-read', 'Não foi possível consultar as criaturas do Team nativo.'); }
    const latest = assertSameLeader(win, leader, profileId);
    const team = teamResult?.team ?? teamResult?.data?.team ?? teamResult?.data ?? teamResult;
    const list = creaturesResult?.data ?? creaturesResult;
    const ids = team?.member_ids?.map(value => String(value ?? '').trim());
    if (!Array.isArray(ids) || ids.filter(id => id === leader.id).length !== 1 ||
        String(team?.leader_id ?? '').trim() !== leader.id || !Array.isArray(list)) {
      fail('native-read', 'O Team nativo não confirmou o líder atual.');
    }
    const matches = list.filter(item => String(item?.id ?? '').trim() === leader.id);
    if (matches.length !== 1) fail('native-read', 'O Team retornou uma instância ambígua.');
    creature = mergedCreature(latest, matches[0], leader);
  }

  const detail = win.PokeIdle?.PokemonCardData?.loadDetail;
  if (typeof detail === 'function') {
    let response;
    try { response = await detail(leader.id, leader.speciesId, creature); }
    catch { fail('native-read', 'Falha ao consultar os detalhes nativos da instância.'); }
    const latest = assertSameLeader(win, leader, profileId);
    if (response?.creature != null) creature = mergedCreature(mergedCreature(latest, creature, leader), response.creature, leader);
    else creature = mergedCreature(latest, creature, leader);
  }

  const latest = assertSameLeader(win, leader, profileId);
  creature = mergedCreature(latest, creature, leader);
  const trainer = runtime?._trainer;
  if (win.PokeIdle?.PersistentHud?._teamHud !== runtime) fail('stale', 'O HUD do treinador foi substituído.');
  const summary = win.PokeIdle?.Auth?.getTrainerSummary?.();
  if (summary?.level != null && summary.level !== trainer?.level) {
    fail('stale', 'Nível do treinador divergiu entre fontes nativas.');
  }
  const payload = projectInput(creature, trainer, leader);
  assertSameLeader(win, leader, profileId);
  if (['ivs', 'quality', 'quality_multiplier', 'nature', 'gender', 'is_shiny', 'is_starter'].every(key => latest[key] != null) &&
      JSON.stringify(projectInput(latest, trainer, leader)) !== JSON.stringify(payload)) {
    fail('stale', 'Os dados do líder mudaram durante o carregamento.');
  }
  return { leader: { ...leader }, profileId, payload };
}

export async function readPptoolsNativeInput(win) {
  const leader = currentPptoolsLeader(win);
  if (!leader || !leader.speciesId) fail('leader', 'Líder nativo indisponível nesta pane.');
  const profileId = currentPptoolsProfileId(win);
  try {
    return await readPptoolsNativeInputOnce(win, leader, profileId);
  } catch (error) {
    if (!(error instanceof PptoolsNativeInputError) || error.retryableLevel !== true) throw error;
    assertSameLeader(win, leader, profileId);
    // A creature list or detail can briefly lag behind the same live HUD level.
    // Re-read once with the original leader/profile fence; never reuse stale data.
    await new Promise(resolve => win.setTimeout(resolve, 150));
    assertSameLeader(win, leader, profileId);
    return readPptoolsNativeInputOnce(win, leader, profileId);
  }
}
