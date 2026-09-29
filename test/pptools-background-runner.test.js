import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { parsePptoolsRecommendations } from '../src/modules/hunts/pptools-recommendations.js';

const driver = readFileSync(new URL('../tools/coupled-workspace-webview2/pptools-runner.js', import.meta.url), 'utf8');
const bundle = 'https://www.pptools.com.br/_next/static/chunks/app/hunt-analyzer/page-9d9eef42c7a86dae.js';
const headings = ['Pos.', 'Pokemon / hunt', 'Nível', 'Move principal', 'Média de hits',
  'Resultados ruins', 'KOH simulado', 'XP/h', 'Gold/h'];
const attacker = {
  pokemon: 'wartortle', level: 72, trainerLevel: 73, qualityTier: 'raro',
  exactMultiplier: 1.3, isShiny: false, nature: 'adamant', gender: 'male',
  expBuff: 1, isStarter: true,
  ivs: { hp: 18, atk: 30, def: 1, spAtk: 29, spDef: 30, speed: 8 },
};
const species = [
  ['Gengar', 'Torre', '90', '120 mil/h', '17 mil/h'],
  ['Gengar', 'Caverna', '82', '100 mil/h', '19 mil/h'],
  ['Pikachu', 'Floresta', '20', '98 mil/h', '8 mil/h'],
  ['Zubat', 'Túnel', '15', '93 mil/h', '3 mil/h'],
];

function tableMarkup(rows, options = {}) {
  const header = headings.map((heading, index) =>
    `<th><button aria-label="Ordenar por ${heading}">${heading}<span aria-hidden="true">${index === 7 && options.sort !== 'gold' ? '↓' : index === 8 && options.sort === 'gold' ? '↓' : '↕'}</span></button></th>`).join('');
  const body = rows.map(([pokemon, hunt, level, xp, gold], index) =>
    `<tr><td>${index + 1}</td><td><div><p class="mantine-Text-root">${pokemon}</p><div><p class="mantine-Text-root">${hunt}</p></div></div></td>
      <td>${level}</td><td>Move</td><td>3</td><td>0%</td><td>10/h</td>
      <td><p class="mantine-Text-root" title="120000">${xp}</p></td>
      <td><p class="mantine-Text-root" title="17000">${gold}</p></td></tr>`).join('');
  return `<section aria-labelledby="hunt-results-title">
    <h2 id="hunt-results-title">Resultados por hunt</h2>
    <input aria-label="Buscar Pokemon por nome" value="${options.filter || ''}">
    <p>${options.total ?? rows.length} Pokemon simulados · 1.000 abates cada</p>
    ${options.pagination || ''}
    <table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>
  </section>`;
}

function fakeSite(options = {}) {
  const dom = new JSDOM(`<!doctype html><html><head><script src="${options.bundle || bundle}"></script></head>
    <body><main><button type="button">Preencher com JSON</button>
    <label for="level">Nível do Pokemon</label><input id="level" value="100">
    <label for="trainer">Nível do treinador</label><input id="trainer" value="100">
    <button type="button" disabled>Simular 1.000 abates por hunt</button></main></body></html>`, {
    url: options.url || 'https://www.pptools.com.br/hunt-analyzer',
    runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const { window } = dom, { document } = window;
  window.TextEncoder = TextEncoder;
  const messages = [], imported = [], clicks = { open: 0, fill: 0, simulate: 0 };
  window.chrome = { webview: { postMessage(value) { messages.push(value); } } };

  const main = document.querySelector('main');
  if (options.existingAlert) main.insertAdjacentHTML('afterbegin',
    '<div role="alert">Modelo de dano experimental</div>');
  const open = [...main.querySelectorAll('button')].find(node => node.textContent === 'Preencher com JSON');
  const sim = [...main.querySelectorAll('button')].find(node => node.textContent === 'Simular 1.000 abates por hunt');
  open.addEventListener('click', () => {
    clicks.open++;
    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    modal.innerHTML = `<h2>Preencher com JSON</h2><label for="attacker">JSON do atacante</label>
      <textarea id="attacker"></textarea><button type="button">Cancelar</button>
      <button type="button">Preencher campos</button>`;
    const textarea = modal.querySelector('textarea');
    let controlled = JSON.stringify({ pokemon: 'dummy', level: 1 });
    textarea.value = controlled;
    textarea.addEventListener('input', () => { controlled = textarea.value; });
    modal.querySelectorAll('button')[1].addEventListener('click', () => {
      clicks.fill++;
      let json;
      try {
        json = JSON.parse(controlled);
        if (options.rejectInput || !json.pokemon || !Number.isInteger(json.level)) throw Error('Bad input');
      } catch {
        const alert = document.createElement('div');
        alert.setAttribute('role', 'alert');
        alert.textContent = 'JSON inválido';
        modal.append(alert);
        return;
      }
      imported.push(json);
      document.querySelector('#level').value = String(options.wrongLevel ? json.level + 1 : json.level);
      document.querySelector('#trainer').value = String(json.trainerLevel ?? json.trainer_level ?? 100);
      modal.remove();
      sim.disabled = Boolean(options.disabledSimulation);
    });
    main.append(modal);
  });
  sim.addEventListener('click', () => {
    clicks.simulate++;
    sim.disabled = true;
    sim.dataset.loading = 'true';
    const stale = document.querySelector('section[aria-labelledby="hunt-results-title"]');
    if (options.simulationError) {
      window.setTimeout(() => {
        const alert = document.createElement('div');
        alert.setAttribute('role', 'alert');
        alert.textContent = 'Simulação falhou';
        main.append(alert);
        sim.disabled = false;
        delete sim.dataset.loading;
      }, 5);
      return;
    }
    window.setTimeout(() => {
      if (options.advanceClock) options.advanceClock();
      if (!options.leaveStale) stale?.remove();
      if (!options.noResult) {
        const container = document.createElement('div');
        container.innerHTML = tableMarkup(options.rows || species, options);
        if (options.corrupt) options.corrupt(container);
        main.append(container.firstElementChild);
      }
      sim.disabled = false;
      delete sim.dataset.loading;
    }, 5);
  });
  if (options.initialResults) main.insertAdjacentHTML('beforeend', tableMarkup(species));
  window.eval(driver);
  return { dom, window, document, messages, imported, clicks,
    start: (id, json = JSON.stringify(attacker)) => window.__PPBUI_PPTOOLS_RUNNER__.start(id, json) };
}

async function completed(fixture, count = 1) {
  const deadline = Date.now() + 1200;
  while (fixture.messages.length < count && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  assert.equal(fixture.messages.length, count, 'expected one correlated completion');
  return fixture.messages[count - 1];
}

test('one click fills React-like controlled form, returns immediately, and posts verified Top 3 JSON', async t => {
  const f = fakeSite({ existingAlert: true }); t.after(() => f.dom.window.close());
  const ack = await f.start('req-1');
  assert.deepEqual(JSON.parse(JSON.stringify(ack)), { accepted: true, requestId: 'req-1' });
  assert.equal(f.clicks.simulate, 0, 'start must not block ExecuteScriptAsync until a 1000-kill simulation finishes');
  const message = await completed(f);
  assert.equal(message.type, 'ppbui.pptools.complete');
  assert.equal(message.requestId, 'req-1');
  assert.equal(message.ok, true);
  assert.equal(typeof message.resultJson, 'string');
  assert.deepEqual(JSON.parse(JSON.stringify(message.result)), JSON.parse(message.resultJson));
  assert.deepEqual(JSON.parse(JSON.stringify(f.imported)), [attacker]);
  assert.deepEqual(f.clicks, { open: 1, fill: 1, simulate: 1 });
  const parsed = parsePptoolsRecommendations(message.resultJson);
  assert.deepEqual(parsed.attacker, { speciesId: null, speciesNameText: null, level: null });
  assert.deepEqual(parsed.source.sort, { key: 'xp', direction: 'desc' });
  assert.deepEqual(parsed.recommendations.map(row => [row.wildSpeciesName, row.huntName]),
    [['Gengar', 'Torre'], ['Gengar', 'Caverna'], ['Pikachu', 'Floresta']]);
  assert.equal(parsed.recommendations[0].xpPerHourText, '120 mil/h');
  assert.equal(parsed.recommendations[0].goldPerHourText, '17 mil/h');
});

test('Next.js may detach the exact loaded page script; the resource-timing script still proves the pinned bundle', async t => {
  const f = fakeSite(); t.after(() => f.dom.window.close());
  f.document.querySelector('script[src]').remove();
  Object.defineProperty(f.window.performance,'getEntriesByType',{configurable:true,
    value:type=>type==='resource'?[{name:bundle,initiatorType:'script'}]:[]});
  assert.equal(f.start('detached-script').accepted,true);
  assert.equal((await completed(f)).ok,true);
  const absent = fakeSite(); t.after(() => absent.dom.window.close());
  absent.document.querySelector('script[src]').remove();
  Object.defineProperty(absent.window.performance,'getEntriesByType',{configurable:true,
    value:type=>type==='resource'?[{name:bundle,initiatorType:'fetch'}]:[]});
  assert.throws(()=>absent.start('unproven'),/Versão pública do PPTools não verificada/);
  for (const resources of [
    [],
    [{name:bundle,initiatorType:'script'}, {name:bundle,initiatorType:'script'}],
    [{name:bundle+'?version=other',initiatorType:'script'}],
    [{name:bundle+'#old',initiatorType:'script'}],
    [{name:bundle.replace('www.pptools.com.br','example.invalid'),initiatorType:'script'}],
    [{name:bundle.replace('page-9d9eef42c7a86dae','page-other'),initiatorType:'script'}],
  ]) {
    const rejected=fakeSite(); t.after(() => rejected.dom.window.close());
    rejected.document.querySelector('script[src]').remove();
    Object.defineProperty(rejected.window.performance,'getEntriesByType',{configurable:true,
      value:type=>type==='resource'?resources:[]});
    assert.throws(()=>rejected.start('unverified-resource'),/Versão pública do PPTools não verificada/);
  }
});

test('busy request fails closed, then a new request ignores old result section', async t => {
  const f = fakeSite({ initialResults: true }); t.after(() => f.dom.window.close());
  assert.equal((await f.start('old')).accepted, true);
  assert.deepEqual(JSON.parse(JSON.stringify(await f.start('duplicate'))), {
    accepted: false, error: 'Uma simulação PPTools já está em andamento.',
  });
  assert.equal((await completed(f)).ok, true);
  const replacement = { ...attacker, level: 80, trainerLevel: 90 };
  assert.equal((await f.start('new', JSON.stringify(replacement))).accepted, true);
  const next = await completed(f, 2);
  assert.equal(next.ok, true);
  assert.equal(next.requestId, 'new');
  assert.deepEqual(JSON.parse(JSON.stringify(f.imported)), [attacker, replacement]);
});

test('origin, bundle, bridge and malformed requests are rejected without interacting with page', async t => {
  for (const options of [{ url: 'https://evil.example/hunt-analyzer' },
    { url: 'https://www.pptools.com.br/elsewhere' },
    { bundle: 'https://www.pptools.com.br/_next/static/chunks/app/hunt-analyzer/page-other.js' }]) {
    const f = fakeSite(options); t.after(() => f.dom.window.close());
    await assert.rejects(async () => f.start('bad'), /não autorizada|não verificada/);
    assert.equal(f.clicks.open, 0);
  }
  const f = fakeSite(); t.after(() => f.dom.window.close());
  assert.equal((await f.start('bad id')).accepted, false);
  assert.equal((await f.start('bad-json', '{')).accepted, false);
  assert.equal((await f.start('over', JSON.stringify(attacker).repeat(101))).accepted, false);
  assert.equal((await f.start('bad-level', JSON.stringify({ ...attacker, level: 0 }))).accepted, false);
  assert.equal(f.clicks.open, 0);
  f.window.chrome = undefined;
  assert.equal((await f.start('no-bridge')).accepted, false);
});

test('invalid source JSON, altered values and disabled simulations fail without publishing results', async t => {
  for (const [options, expected] of [
    [{ rejectInput: true }, /Importação PPTools recusada/],
    [{ wrongLevel: true }, /não corresponde/],
    [{ disabledSimulation: true }, /desabilitada/],
    [{ simulationError: true }, /Simulação PPTools falhou/],
  ]) {
    const f = fakeSite(options); t.after(() => f.dom.window.close());
    assert.equal((await f.start('reject')).accepted, true);
    const message = await completed(f);
    assert.equal(message.ok, false);
    assert.match(message.error, expected);
    assert.equal(message.resultJson, undefined);
  }
});

test('rejects unsupported table markup, non-XP sorting, incomplete output and virtual pagination', async t => {
  const cases = [
    [{ corrupt: root => root.querySelector('thead button').setAttribute('aria-label', 'Mudou') }, /Cabeçalhos/],
    [{ sort: 'gold' }, /XP\/h decrescente/],
    [{ total: species.length + 1 }, /incompleta/],
    [{ pagination: '<nav class="mantine-Pagination-root"></nav>' }, /Paginação/],
    [{ corrupt: root => { root.querySelectorAll('tbody tr')[1].cells[0].textContent = '99'; } }, /Ranks/],
    [{ corrupt: root => { root.querySelector('tbody tr td:nth-child(8)').textContent = ''; } }, /XP\/h ausente/],
    [{ filter: 'gen' }, /Filtro/],
  ];
  for (const [options, expected] of cases) {
    const f = fakeSite(options); t.after(() => f.dom.window.close());
    assert.equal((await f.start('bad-result')).accepted, true);
    const message = await completed(f);
    assert.equal(message.ok, false);
    assert.match(message.error, expected);
  }
});

test('a stale preexisting section never counts as a fresh simulation', async t => {
  let offset = 0;
  const f = fakeSite({ initialResults: true, leaveStale: true, noResult: true,
    advanceClock: () => { offset = 180_001; } });
  t.after(() => f.dom.window.close());
  const NativeDate = f.window.Date;
  f.window.Date = class extends NativeDate { static now() { return NativeDate.now() + offset; } };
  assert.equal((await f.start('stale')).accepted, true);
  const reply = await completed(f);
  assert.equal(reply.ok, false);
  assert.match(reply.error, /Tempo limite/);
  assert.equal(reply.result, undefined);
});

test('a missing result cannot be misidentified as the previous query after a new click', async t => {
  let offset = 0;
  const f = fakeSite({ noResult: true, advanceClock: () => { offset = 180_001; } });
  t.after(() => f.dom.window.close());
  const NativeDate = f.window.Date;
  f.window.Date = class extends NativeDate { static now() { return NativeDate.now() + offset; } };
  await f.start('missing');
  const message = await completed(f);
  assert.equal(message.ok, false);
  assert.match(message.error, /Tempo limite/);
});
