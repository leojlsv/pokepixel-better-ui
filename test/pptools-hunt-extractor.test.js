import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { parsePptoolsRecommendations } from '../src/modules/hunts/pptools-recommendations.js';

const script = readFileSync(new URL('../tools/pptools-hunt-extractor/ppbui-pptools-hunt-extractor.user.js', import.meta.url), 'utf8');
const bundle = 'https://www.pptools.com.br/_next/static/chunks/app/hunt-analyzer/page-9d9eef42c7a86dae.js';
const columns = [
  ['rank', 'Pos.'],
  ['pokemon', 'Pokemon / hunt'],
  ['level', 'Nível'],
  ['move', 'Move principal'],
  ['hits', 'Média de hits'],
  ['bad', 'Resultados ruins'],
  ['koh', 'KOH simulado'],
  ['xp', 'XP/h'],
  ['gold', 'Gold/h'],
];
const sample = [
  { species: 'Gengar', hunt: 'Caverna', level: '88', xp: '12,5 mil/h', gold: '300/h' },
  { species: 'Gengar', hunt: 'Torre', level: '90', xp: '11,9 mil/h', gold: '450/h' },
  { species: 'Zubat', hunt: 'Túnel', level: '7', xp: '10 mil/h', gold: '1,2 mil/h' },
  { species: 'Golbat', hunt: 'Caverna', level: '65', xp: '9 mil/h', gold: '200/h' },
];

function makeFixture({
  rows = sample, sort = 'xp', direction = 'desc', filter = '', total = rows.length,
  scriptUrl = bundle, pagination = '', section = true, url = 'https://www.pptools.com.br/hunt-analyzer',
  expanded = false,
} = {}) {
  const headings = columns.map(([key, name]) => {
    const arrow = key === sort ? direction === 'desc' ? '↓' : '↑' : '↕';
    return `<th><span><button type="button" aria-label="Ordenar por ${name}">${name}<span aria-hidden="true">${arrow}</span></button></span></th>`;
  }).join('');
  const data = rows.map((row, index) => {
    const tr = `<tr><td>${index + 1}</td><td><div><p class="mantine-Text-root">${row.species}</p><div><p class="mantine-Text-root">${row.hunt}</p><span class="mantine-Badge-root">Ghost</span></div></div></td><td>${row.level}</td><td>Shadow Ball</td><td>4,5</td><td>0%</td><td>120/h</td><td><p class="mantine-Text-root" title="12500">${row.xp}</p><p class="mantine-Text-root">50 XP/abate</p></td><td><p class="mantine-Text-root" title="300">${row.gold}</p><p class="mantine-Text-root">base + drop</p></td></tr>`;
    const detail = expanded ? '<tr class="debug-expanded"><td colspan="9"><table><tbody><tr><td>Detalhes</td></tr></tbody></table></td></tr>' : '';
    return tr + detail;
  }).join('');
  const results = section
    ? `<section aria-labelledby="hunt-results-title"><h2 id="hunt-results-title">Resultados por hunt</h2>
         <input aria-label="Buscar Pokemon por nome" value="${filter}">
         <p>${total} Pokemon simulados · 1.000 abates cada</p>
         ${pagination}
         <table><thead><tr>${headings}</tr></thead><tbody>${data}</tbody></table></section>`
    : '';
  const html = `<!doctype html><html><head><script src="${scriptUrl}"></script></head><body><main>${results}</main></body></html>`;
  const dom = new JSDOM(html, { url, runScripts: 'outside-only' });
  const writes = [];
  Object.defineProperty(dom.window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async value => { writes.push(value); } },
  });
  dom.window.eval(script);
  const button = dom.window.document.querySelector('#ppbui-pptools-export-panel button');
  const status = dom.window.document.querySelector('#ppbui-pptools-export-panel [role=status]');
  const textarea = dom.window.document.querySelector('#ppbui-pptools-export-panel textarea');
  return { dom, writes, button, status, textarea };
}

async function click(fixture) {
  fixture.button.click();
  await new Promise(resolve => setImmediate(resolve));
  return fixture.writes[0] && JSON.parse(fixture.writes[0]);
}

test('exports first three logical rows, preserves repeated species and text metrics', async () => {
  const fixture = makeFixture();
  const payload = await click(fixture);
  assert.equal(payload.schema, 'ppbui.pptools.hunt-recommendations');
  assert.equal(payload.version, 1);
  assert.deepEqual(payload.source.sort, { key: 'xp', direction: 'desc' });
  assert.deepEqual(payload.source.scope, { kind: 'all-results', page: null });
  assert.equal(payload.source.filter, '');
  assert.match(payload.source.capturedAt, /^\d{4}-\d\d-\d\dT/);
  assert.deepEqual(payload.attacker, { speciesId: null, speciesNameText: null, level: null });
  assert.deepEqual(payload.recommendations.map(({ rank, wildSpeciesName, huntName }) => [rank, wildSpeciesName, huntName]),
    [[1, 'Gengar', 'Caverna'], [2, 'Gengar', 'Torre'], [3, 'Zubat', 'Túnel']]);
  assert.equal(payload.recommendations[0].xpPerHourText, '12,5 mil/h');
  assert.equal(payload.recommendations[0].goldPerHourText, '300/h');
  assert.equal(payload.recommendations[0].wildLevelText, '88');
  assert.equal(payload.recommendations[0].wildLevel, 88);
  assert.equal(parsePptoolsRecommendations(fixture.writes[0]).recommendations.length, 3);
  assert.match(fixture.status.textContent, /copiadas/);
  fixture.dom.window.close();
});

test('captures effective Gold/h descending sort and active name filter, not default XP/h', async () => {
  const f = makeFixture({ rows: sample.slice(0, 2), total: 4, sort: 'gold', direction: 'desc', filter: 'gen' });
  const payload = await click(f);
  assert.deepEqual(payload.source.sort, { key: 'gold', direction: 'desc' });
  assert.equal(payload.source.filter, 'gen');
  assert.deepEqual(payload.recommendations.map(r => r.rank), [1, 2]);
  assert.equal(payload.source.scope.kind, 'all-results');
  f.dom.window.close();
});

test('retains rank ascending sort without recasting it as XP ranking', async () => {
  const f = makeFixture({ sort: 'rank', direction: 'asc' });
  const payload = await click(f);
  assert.deepEqual(payload.source.sort, { key: 'rank', direction: 'asc' });
  f.dom.window.close();
});

test('export ignores scroll position and subordinate detail rows, returning top of complete logical list', async () => {
  const f = makeFixture({ expanded: true });
  f.dom.window.document.querySelector('section').scrollTop = 1000;
  const payload = await click(f);
  assert.equal(payload.recommendations.length, 3);
  assert.equal(payload.recommendations[0].wildSpeciesName, 'Gengar');
  f.dom.window.close();
});

test('rejects changed renderer bundle even with similar-looking table', async () => {
  const f = makeFixture({ scriptUrl: 'https://www.pptools.com.br/_next/static/chunks/app/hunt-analyzer/page-changed.js' });
  assert.equal(await click(f), undefined);
  assert.match(f.status.textContent, /Versão do PPTools não verificada/);
  f.dom.window.close();
});

test('rejects missing simulation result section and leaves clipboard empty', async () => {
  const f = makeFixture({ section: false });
  assert.equal(await click(f), undefined);
  assert.match(f.status.textContent, /Execute a simulação/);
  f.dom.window.close();
});

test('rejects altered column headers', async () => {
  const f = makeFixture();
  f.dom.window.document.querySelector('thead button[aria-label="Ordenar por XP/h"]').setAttribute('aria-label', 'Ordenar por Outro');
  assert.equal(await click(f), undefined);
  assert.match(f.status.textContent, /Cabeçalhos/);
  f.dom.window.close();
});

test('rejects unexpected rank gaps (partial or virtualized DOM)', async () => {
  const f = makeFixture();
  f.dom.window.document.querySelectorAll('table > tbody > tr')[1].cells[0].textContent = '4';
  assert.equal(await click(f), undefined);
  assert.match(f.status.textContent, /Posições incompletas/);
  f.dom.window.close();
});

test('rejects truncated unfiltered DOM even if the first three ranks are present', async () => {
  const f = makeFixture({ rows: sample.slice(0, 3), total: 4 });
  assert.equal(await click(f), undefined);
  assert.match(f.status.textContent, /Nem todas as linhas/);
  f.dom.window.close();
});

test('rejects explicit pagination and virtualization rather than asserting global scope', async () => {
  for (const pagination of ['<nav class="mantine-Pagination-root">2</nav>', '<div data-virtualizer="active"></div>']) {
    const f = makeFixture({ pagination });
    assert.equal(await click(f), undefined);
    assert.match(f.status.textContent, /Paginação ou virtualização/);
    f.dom.window.close();
  }
});

test('rejects ambiguous active sorting', async () => {
  const f = makeFixture();
  const button = f.dom.window.document.querySelector('thead button[aria-label="Ordenar por Gold/h"] span[aria-hidden]');
  button.textContent = '↑';
  assert.equal(await click(f), undefined);
  assert.match(f.status.textContent, /ordenação ativa/);
  f.dom.window.close();
});

test('accepts one or two results and rejects empty results', async () => {
  for (const count of [1, 2]) {
    const f = makeFixture({ rows: sample.slice(0, count), total: count });
    assert.equal((await click(f)).recommendations.length, count);
    f.dom.window.close();
  }
  const f = makeFixture({ rows: [], total: 0 });
  assert.equal(await click(f), undefined);
  assert.match(f.status.textContent, /Nenhum resultado/);
  f.dom.window.close();
});

test('preserves textual level range and does not invent numeric level', async () => {
  const f = makeFixture({ rows: [{ ...sample[0], level: '90–100' }], total: 1 });
  const payload = await click(f);
  assert.equal(payload.recommendations[0].wildLevelText, '90–100');
  assert.equal(payload.recommendations[0].wildLevel, null);
  f.dom.window.close();
});

test('missing primary metric prevents exporting a misleading breakdown value', async () => {
  const f = makeFixture();
  f.dom.window.document.querySelector('tbody tr td:nth-child(8) .mantine-Text-root').remove();
  f.dom.window.document.querySelector('tbody tr td:nth-child(8) .mantine-Text-root').remove();
  assert.equal(await click(f), undefined);
  assert.match(f.status.textContent, /XP\/h ausente/);
  f.dom.window.close();
});

test('manual selectable JSON fallback works when clipboard API is denied', async () => {
  const f = makeFixture();
  Object.defineProperty(f.dom.window.navigator, 'clipboard', {
    configurable: true, value: { writeText: async () => { throw new Error('NotAllowedError'); } },
  });
  f.button.focus();
  assert.equal(await click(f), undefined);
  assert.equal(f.textarea.hidden, false);
  assert.equal(f.dom.window.document.activeElement, f.textarea);
  assert.equal(JSON.parse(f.textarea.value).recommendations.length, 3);
  assert.match(f.status.textContent, /Ctrl\+C/);
  assert.doesNotMatch(f.status.textContent, /linhas copiadas/);
  f.dom.window.close();
});

test('keyboard-activated copy preserves button focus and prevents repeated requests while pending', async () => {
  const f = makeFixture();
  let finishCopy;
  let copies = 0;
  Object.defineProperty(f.dom.window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: () => {
      copies++;
      return new Promise(resolve => { finishCopy = resolve; });
    } },
  });
  f.button.focus();
  assert.equal(f.dom.window.document.activeElement, f.button);
  // jsdom does not dispatch the default click for Enter; model the browser activation.
  f.button.dispatchEvent(new f.dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  f.button.click();
  assert.equal(f.dom.window.document.activeElement, f.button);
  assert.equal(f.button.disabled, false);
  assert.equal(f.button.getAttribute('aria-busy'), 'true');
  f.button.click();
  assert.equal(copies, 1);
  finishCopy();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.button.getAttribute('aria-busy'), null);
  assert.equal(f.dom.window.document.activeElement, f.button);
  assert.equal(f.textarea.hidden, true);
  assert.match(f.status.textContent, /linhas copiadas/);
  f.dom.window.close();
});

test('manual JSON fallback is available if clipboard API does not exist', async () => {
  const f = makeFixture();
  Object.defineProperty(f.dom.window.navigator, 'clipboard', { configurable: true, value: undefined });
  assert.equal(await click(f), undefined);
  assert.equal(f.textarea.hidden, false);
  assert.equal(JSON.parse(f.textarea.value).source.scope.kind, 'all-results');
  f.dom.window.close();
});

test('refuses export from a different page even when manually evaluated', async () => {
  const f = makeFixture({ url: 'https://www.pptools.com.br/other' });
  assert.equal(await click(f), undefined);
  assert.match(f.status.textContent, /Abra a página pública/);
  f.dom.window.close();
});
