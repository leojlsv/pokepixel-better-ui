// ==UserScript==
// @name         PPTools Hunt Recommendations — manual export
// @namespace    https://github.com/pokepixel-better-ui
// @version      0.1.0
// @description  Export the first three verified PPTools Hunt Analyzer results as versioned JSON.
// @match        https://www.pptools.com.br/hunt-analyzer*
// @run-at       document-idle
// @grant        none
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  // Reviewed public PPTools bundle: see README.md. A new release requires a new
  // completeness audit before we may claim to export the global first three rows.
  const verifiedBundle = /\/_next\/static\/chunks\/app\/hunt-analyzer\/page-9d9eef42c7a86dae\.js(?:[?#].*)?$/;
  const schema = 'ppbui.pptools.hunt-recommendations';
  const headers = [
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

  const text = element => String(element?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const folded = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const requireValue = (value, label, max = 160) => {
    if (!value || value.length > max) throw new Error(`Campo ${label} ausente ou inválido.`);
    return value;
  };

  function currentPage() {
    if (location.protocol !== 'https:' || location.hostname !== 'www.pptools.com.br' ||
        !/^\/hunt-analyzer\/?$/.test(location.pathname)) {
      throw new Error('Abra a página pública Hunt Analyzer do PPTools.');
    }
    if (![...document.scripts].some(script => verifiedBundle.test(script.src))) {
      throw new Error('Versão do PPTools não verificada. É preciso revisar a tabela pública antes de exportar.');
    }
  }

  function getResults() {
    const sections = [...document.querySelectorAll('section[aria-labelledby="hunt-results-title"]')];
    if (sections.length !== 1) throw new Error('Execute a simulação e aguarde os resultados da hunt.');
    const section = sections[0];
    const matches = [...section.querySelectorAll('table')].filter(table => {
      const cells = [...(table.tHead?.rows[0]?.cells ?? [])];
      return cells.length === headers.length && cells.every((cell, index) => {
        const button = cell.querySelector('button[aria-label]');
        return folded(button?.getAttribute('aria-label')) === folded(`Ordenar por ${headers[index][1]}`);
      });
    });
    if (matches.length !== 1 || matches[0].tBodies.length !== 1) {
      throw new Error('Cabeçalhos ou estrutura da tabela de resultados mudaram.');
    }
    return { section, table: matches[0] };
  }

  function currentSort(table) {
    const active = [];
    [...table.tHead.rows[0].cells].forEach((cell, index) => {
      const button = cell.querySelector('button[aria-label]');
      const arrow = text(button?.querySelector('span[aria-hidden="true"]'));
      if (!['↕', '↑', '↓'].includes(arrow)) throw new Error('Estado da ordenação não verificável.');
      if (arrow !== '↕') active.push({ key: headers[index][0], direction: arrow === '↑' ? 'asc' : 'desc' });
    });
    if (active.length !== 1) throw new Error('Há mais de uma ordenação ativa, ou nenhuma.');
    return active[0];
  }

  function getResultRows(table) {
    const found = [];
    for (const tr of table.tBodies[0].children) {
      if (tr.tagName !== 'TR') throw new Error('A estrutura de linhas da tabela mudou.');
      const cells = [...tr.cells];
      // Public debug mode adds a subordinate row with one colSpan=9 cell.
      if (cells.length === 1 && cells[0].colSpan === 9) continue;
      if (cells.length !== 9 || tr.hidden || tr.getAttribute('aria-hidden') === 'true' ||
          tr.style.display === 'none') {
        throw new Error('Há uma linha de resultado oculta ou não reconhecida.');
      }
      const position = text(cells[0]);
      if (!/^\d+$/.test(position) || Number(position) !== found.length + 1) {
        throw new Error('Posições incompletas: paginação ou virtualização não comprovada.');
      }
      found.push(cells);
      if (found.length > 3000) throw new Error('A tabela excede o limite de linhas verificáveis.');
    }
    if (!found.length) throw new Error('Nenhum resultado da simulação disponível para exportar.');
    return found;
  }

  function readMetric(cell, label) {
    const primary = cell.querySelector('.mantine-Text-root');
    const value = text(primary) || (text(cell) === 'Indisponível' ? 'Indisponível' : '');
    return requireValue(value, label, 100);
  }

  function parseRow(cells, rank) {
    const pokemonTexts = [...cells[1].querySelectorAll('.mantine-Text-root')];
    // Source renders wild species and hunt as the first two Text components.
    const wildSpeciesName = requireValue(text(pokemonTexts[0]), 'Pokémon');
    const huntName = requireValue(text(pokemonTexts[1]), 'hunt');
    const wildLevelText = requireValue(text(cells[2]), 'nível', 48);
    const numeric = /^\d+$/.test(wildLevelText) ? Number(wildLevelText) : null;
    const wildLevel = Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : null;
    return {
      rank,
      wildSpeciesName,
      huntName,
      wildLevelText,
      wildLevel,
      xpPerHourText: readMetric(cells[7], 'XP/h'),
      goldPerHourText: readMetric(cells[8], 'Gold/h'),
    };
  }

  function verifyCompleteness(section, table, rows) {
    // The audited renderer maps the complete sorted/filtered array to tbody;
    // pagination/virtualization introduced in a later release must be reviewed.
    if (section.querySelector('[data-virtualized], [data-virtualizer], [aria-rowcount], ' +
      '[class*="Pagination-root"], [class*="pagination"], [role="rowgroup"][aria-rowcount]')) {
      throw new Error('Paginação ou virtualização detectada; não é possível afirmar Top 3 geral.');
    }
    const filterInputs = [...section.querySelectorAll('input[aria-label="Buscar Pokemon por nome"]')];
    if (filterInputs.length !== 1) throw new Error('Filtro da simulação não identificável.');
    const filter = filterInputs[0].value;
    if (filter.length > 160) throw new Error('Filtro muito extenso.');
    const summary = text(section).match(/(\d[\d.]*)\s+Pokemon simulados\b/i);
    if (!summary) throw new Error('Total da simulação não verificável.');
    const total = Number(summary[1].replace(/\./g, ''));
    if (!Number.isSafeInteger(total) || total < 1 || rows.length > total) {
      throw new Error('Total da simulação incompatível com a tabela.');
    }
    if (!filter.trim() && rows.length !== total) {
      throw new Error('Nem todas as linhas da simulação estão no DOM.');
    }
    // With a name filter the displayed total is still the unfiltered count.
    // The pinned renderer proves that it iterates the entire filtered list;
    // contiguous ranks and absence of paging are checked again above.
    return filter;
  }

  function extract() {
    currentPage();
    const { section, table } = getResults();
    const rows = getResultRows(table);
    const sort = currentSort(table);
    const filter = verifyCompleteness(section, table, rows);
    return {
      schema,
      version: 1,
      source: {
        url: 'https://www.pptools.com.br/hunt-analyzer',
        capturedAt: new Date().toISOString(),
        sort,
        filter,
        scope: { kind: 'all-results', page: null },
      },
      // Public results do not expose a reliable attacker identity contract.
      attacker: { speciesId: null, speciesNameText: null, level: null },
      recommendations: rows.slice(0, 3).map((cells, index) => parseRow(cells, index + 1)),
    };
  }

  function mount() {
    if (document.getElementById('ppbui-pptools-export-panel')) return;
    const style = document.createElement('style');
    style.textContent = `
      #ppbui-pptools-export-panel{position:fixed;right:12px;bottom:12px;z-index:110;box-sizing:border-box;
        width:min(340px,calc(100vw - 24px));max-height:75vh;overflow:auto;padding:12px;border:1px solid #657d90;
        border-radius:8px;background:#16222b;color:#f2f7fa;box-shadow:0 6px 26px #0008;
        font:13px/1.4 system-ui,sans-serif}
      #ppbui-pptools-export-panel *{box-sizing:border-box}
      #ppbui-pptools-export-panel strong{display:block;margin:0 0 4px;font-size:14px}
      #ppbui-pptools-export-panel button{width:100%;min-height:34px;margin:8px 0;padding:6px 10px;
        border:1px solid #9bcad8;border-radius:5px;background:#265766;color:#fff;font:inherit;cursor:pointer}
      #ppbui-pptools-export-panel button:hover{background:#346c7b}
      #ppbui-pptools-export-panel button:focus-visible,#ppbui-pptools-export-panel textarea:focus-visible{
        outline:2px solid #b0eaff;outline-offset:2px}
      #ppbui-pptools-export-panel button[aria-busy="true"]{cursor:progress}
      #ppbui-pptools-export-panel textarea{width:100%;min-height:110px;resize:vertical;font:11px/1.4 monospace}
      #ppbui-pptools-export-panel [hidden]{display:none!important}
      #ppbui-pptools-export-panel small{display:block;color:#ccdce1}
      #ppbui-pptools-export-panel [role="status"]{display:block;min-height:18px;overflow-wrap:anywhere}
    `;
    const panel = document.createElement('aside');
    panel.id = 'ppbui-pptools-export-panel';
    panel.setAttribute('aria-label', 'Exportação manual PPTools');
    const heading = document.createElement('strong');
    heading.textContent = 'PPTools → recomendações JSON';
    const description = document.createElement('small');
    description.textContent = 'PPTools (Eric / bar): estimativas da simulação; exportação manual.';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Copiar Top 3 / recorte';
    const status = document.createElement('span');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Execute a simulação e clique para exportar.';
    const fallback = document.createElement('textarea');
    fallback.setAttribute('aria-label', 'JSON para copiar manualmente');
    fallback.readOnly = true;
    fallback.hidden = true;
    panel.append(heading, description, button, status, fallback);
    document.head.append(style);
    document.body.append(panel);

    let copying = false;
    button.addEventListener('click', async () => {
      if (copying) return;
      fallback.hidden = true;
      fallback.value = '';
      let payload;
      try {
        payload = extract();
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : 'Não foi possível ler a tabela.';
        return;
      }
      const json = JSON.stringify(payload, null, 2);
      const criterion = `${payload.source.sort.key.toUpperCase()} ${payload.source.sort.direction === 'desc' ? '↓' : '↑'}`;
      copying = true;
      button.setAttribute('aria-busy', 'true');
      try {
        if (typeof navigator.clipboard?.writeText !== 'function') throw new Error('Clipboard indisponível');
        await navigator.clipboard.writeText(json);
        status.textContent = `${payload.recommendations.length} linhas copiadas em ordem ${criterion}. Cole o JSON no Better UI.`;
      } catch {
        fallback.hidden = false;
        fallback.value = json;
        fallback.focus();
        fallback.select();
        status.textContent = `Clipboard indisponível. JSON selecionado (${criterion}); pressione Ctrl+C para copiar.`;
      } finally {
        copying = false;
        button.removeAttribute('aria-busy');
      }
    });
  }

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount, { once: true });
})();
