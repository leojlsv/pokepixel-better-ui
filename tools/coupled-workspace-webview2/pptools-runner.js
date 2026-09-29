// Inject only into a dedicated PPTools WebView2 after navigation has completed.
(() => {
  'use strict';

  const pageUrl = 'https://www.pptools.com.br/hunt-analyzer';
  const bundlePath = '/_next/static/chunks/app/hunt-analyzer/page-9d9eef42c7a86dae.js';
  const labels = ['Pos.', 'Pokemon / hunt', 'Nível', 'Move principal', 'Média de hits',
    'Resultados ruins', 'KOH simulado', 'XP/h', 'Gold/h'];
  const maxInputLength = 20_000;
  const overallTimeoutMs = 180_000;
  const pollMs = 50;
  const text = node => String(node?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const folded = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let active = null;

  function requirePage() {
    if (window !== window.top || location.origin + location.pathname !== pageUrl ||
      location.search || location.hash) throw Error('Origem ou rota PPTools não autorizada.');
    const pinnedUrl = value => {
      try {
        const url = new URL(value);
        return url.origin === location.origin && url.pathname === bundlePath && !url.search && !url.hash;
      } catch { return false; }
    };
    const matches = [...document.scripts].filter(script => pinnedUrl(script.src));
    // Next.js can remove a dynamically loaded route script after execution.
    // Resource Timing retains the exact URL and initiator for this document.
    const loaded = [...(window.performance?.getEntriesByType?.('resource') || [])]
      .filter(entry => entry.initiatorType === 'script' && pinnedUrl(entry.name));
    if (matches.length > 1 || (matches.length !== 1 && loaded.length !== 1)) {
      throw Error('Versão pública do PPTools não verificada.');
    }
  }

  function ensureCurrent(job) {
    if (active !== job || job.document !== document) throw Error('Consulta PPTools substituída.');
    requirePage();
    if (Date.now() > job.deadline) throw Error('Tempo limite da simulação PPTools excedido.');
  }

  function byButtonText(root, label) {
    const found = [...root.querySelectorAll('button')].filter(node => text(node) === label);
    if (found.length > 1) throw Error(`Controle PPTools ambíguo: ${label}.`);
    return found[0] || null;
  }

  async function until(job, name, condition, maxMs = 20_000) {
    const deadline = Math.min(job.deadline, Date.now() + maxMs);
    for (;;) {
      ensureCurrent(job);
      const found = condition();
      if (found) return found;
      if (Date.now() >= deadline) throw Error(`Tempo limite aguardando ${name}.`);
      await new Promise(resolve => setTimeout(resolve, pollMs));
    }
  }

  function dialog() {
    const found = [...document.querySelectorAll('[role="dialog"]')]
      .filter(node => /Preencher com JSON/.test(text(node)));
    if (found.length > 1) throw Error('Mais de um formulário JSON do PPTools.');
    return found[0] || null;
  }

  function textareaFor(modal) {
    const areas = [...modal.querySelectorAll('textarea')];
    if (areas.length !== 1) throw Error('Campo JSON do PPTools ausente ou ambíguo.');
    const area = areas[0];
    const label = [...(area.labels || [])].map(text).join(' ');
    const aria = [area.getAttribute('aria-label') || '',
      document.getElementById(area.getAttribute('aria-labelledby') || '')?.textContent || ''].join(' ');
    if (!folded(label + ' ' + aria).includes('json do atacante') || area.disabled || area.readOnly) {
      throw Error('O campo do atacante não corresponde ao formulário esperado.');
    }
    return area;
  }

  function formNumber(label) {
    const found = [...document.querySelectorAll('label')].filter(node =>
      folded(text(node)).startsWith(folded(label)));
    if (found.length !== 1) throw Error(`Campo de conferência ambíguo: ${label}.`);
    const field = document.getElementById(found[0].htmlFor);
    if (!field || field.tagName !== 'INPUT') throw Error(`Campo de conferência ausente: ${label}.`);
    return Number(field.value);
  }

  function simulationError(previous) {
    for (const node of document.querySelectorAll('[role="alert"]')) {
      const message = text(node);
      if (message && (!previous.has(node) || previous.get(node) !== message)) return message;
    }
    return null;
  }

  function resultSection() {
    const found = [...document.querySelectorAll('section[aria-labelledby="hunt-results-title"]')];
    if (found.length > 1) throw Error('Mais de uma tabela de resultados PPTools.');
    return found[0] || null;
  }

  function requireValue(value, label, max = 160) {
    if (!value || value.length > max) throw Error(`Campo ${label} ausente ou inválido.`);
    return value;
  }

  function parseRows(section) {
    const matches = [...section.querySelectorAll('table')].filter(table => {
      const cells = [...(table.tHead?.rows[0]?.cells ?? [])];
      return cells.length === labels.length && cells.every((cell, index) =>
        folded(cell.querySelector('button[aria-label]')?.getAttribute('aria-label')) ===
        folded(`Ordenar por ${labels[index]}`));
    });
    if (matches.length !== 1 || matches[0].tBodies.length !== 1) {
      throw Error('Cabeçalhos ou tabela do PPTools não reconhecidos.');
    }
    const table = matches[0];
    const activeSort = [];
    [...table.tHead.rows[0].cells].forEach((cell, index) => {
      const arrow = text(cell.querySelector('button[aria-label] span[aria-hidden="true"]'));
      if (!['↕', '↑', '↓'].includes(arrow)) throw Error('Ordenação PPTools não verificável.');
      if (arrow !== '↕') activeSort.push([index, arrow]);
    });
    if (activeSort.length !== 1 || activeSort[0][0] !== 7 || activeSort[0][1] !== '↓') {
      throw Error('A tabela PPTools não está em ordem XP/h decrescente.');
    }
    if (section.querySelector('[data-virtualized], [data-virtualizer], [aria-rowcount], ' +
      '[class*="Pagination-root"], [class*="pagination"], [role="rowgroup"][aria-rowcount]')) {
      throw Error('Paginação ou virtualização PPTools não comprovada.');
    }
    const filters = [...section.querySelectorAll('input[aria-label="Buscar Pokemon por nome"]')];
    if (filters.length !== 1 || filters[0].value.trim()) throw Error('Filtro PPTools inesperado.');
    const rows = [];
    for (const node of table.tBodies[0].children) {
      if (node.tagName !== 'TR') throw Error('Linha PPTools não reconhecida.');
      const cells = [...node.cells];
      if (cells.length === 1 && cells[0].colSpan === 9) continue;
      if (cells.length !== 9 || node.hidden || node.getAttribute('aria-hidden') === 'true' ||
        node.style.display === 'none') throw Error('Linha PPTools oculta ou alterada.');
      if (text(cells[0]) !== String(rows.length + 1)) throw Error('Ranks PPTools descontínuos.');
      rows.push(cells);
      if (rows.length > 3000) throw Error('Resultado PPTools acima do limite de linhas.');
    }
    const summary = text(section).match(/(\d[\d.]*)\s+Pokemon simulados\b/i);
    if (!summary || !rows.length || Number(summary[1].replace(/\./g, '')) !== rows.length) {
      throw Error('Simulação PPTools incompleta ou sem resultados.');
    }
    const metric = (cell, label) => requireValue(
      text(cell.querySelector('.mantine-Text-root')) ||
        (text(cell) === 'Indisponível' ? 'Indisponível' : ''), label, 100);
    return rows.slice(0, 3).map((cells, index) => {
      const names = [...cells[1].querySelectorAll('.mantine-Text-root')];
      const wildLevelText = requireValue(text(cells[2]), 'nível', 48);
      const numeric = /^\d+$/.test(wildLevelText) ? Number(wildLevelText) : null;
      return {
        rank: index + 1,
        wildSpeciesName: requireValue(text(names[0]), 'Pokémon'),
        huntName: requireValue(text(names[1]), 'hunt'),
        wildLevelText,
        wildLevel: Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : null,
        xpPerHourText: metric(cells[7], 'XP/h'),
        goldPerHourText: metric(cells[8], 'Gold/h'),
      };
    });
  }

  async function run(job) {
    ensureCurrent(job);
    job.alerts = new Map([...document.querySelectorAll('[role="alert"]')].map(node => [node, text(node)]));
    const open = await until(job, 'Preencher com JSON', () => byButtonText(document, 'Preencher com JSON'));
    if (open.disabled) throw Error('Importação JSON PPTools indisponível.');
    open.click();
    const modal = await until(job, 'formulário JSON', dialog);
    const area = textareaFor(modal);
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    if (!setter) throw Error('Setter nativo do campo JSON indisponível.');
    setter.call(area, job.input);
    area.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, pollMs));
    ensureCurrent(job);
    if (area.value !== job.input) throw Error('Campo JSON alterado durante preenchimento.');
    const fill = byButtonText(modal, 'Preencher campos');
    if (!fill || fill.disabled) throw Error('Confirmação do JSON PPTools indisponível.');
    fill.click();
    await until(job, 'importação do JSON', () => {
      if (dialog()) {
        const failure = simulationError(job.alerts);
        if (failure) throw Error(`Importação PPTools recusada: ${failure}`);
        return null;
      }
      return true;
    });
    ensureCurrent(job);
    if (formNumber('Nível do Pokemon') !== job.level ||
      (job.trainerLevel !== null && formNumber('Nível do treinador') !== job.trainerLevel)) {
      throw Error('Formulário PPTools não corresponde ao JSON solicitado.');
    }
    const sim = await until(job, 'Simular 1.000 abates por hunt', () =>
      byButtonText(document, 'Simular 1.000 abates por hunt'));
    if (sim.disabled) throw Error('Simulação PPTools desabilitada para este atacante.');
    const oldSection = resultSection();
    job.alerts = new Map([...document.querySelectorAll('[role="alert"]')].map(node => [node, text(node)]));
    sim.click();
    const next = await until(job, 'resultado dos 1.000 abates', () => {
      const error = simulationError(job.alerts);
      if (error) throw Error(`Simulação PPTools falhou: ${error}`);
      const section = resultSection();
      return section && section !== oldSection && !sim.disabled &&
        sim.getAttribute('data-loading') !== 'true' ? section : null;
    }, overallTimeoutMs);
    ensureCurrent(job);
    return {
      schema: 'ppbui.pptools.hunt-recommendations', version: 1,
      source: {
        url: pageUrl, capturedAt: new Date().toISOString(),
        sort: { key: 'xp', direction: 'desc' }, filter: '',
        scope: { kind: 'all-results', page: null },
      },
      // The public PPTools result DOM does not authenticate the game instance.
      attacker: { speciesId: null, speciesNameText: null, level: null },
      recommendations: parseRows(next),
    };
  }

  function complete(job, result, error) {
    if (active !== job) return;
    active = null;
    if (job.document !== document || location.origin + location.pathname !== pageUrl) return;
    let resultJson;
    if (!error) {
      resultJson = JSON.stringify(result);
      if (new TextEncoder().encode(resultJson).byteLength > 16_000) {
        error = Error('Resultado PPTools excede o limite de 16 KB.');
        resultJson = undefined;
      }
    }
    window.chrome?.webview?.postMessage?.({
      type: 'ppbui.pptools.complete', requestId: job.requestId,
      ok: !error, ...(error ? { error: String(error.message || error) } : { result, resultJson }),
    });
  }

  function start(requestId, attackerJson) {
    requirePage();
    if (!window.chrome?.webview?.postMessage) return { accepted: false, error: 'Ponte WebView2 indisponível.' };
    if (typeof requestId !== 'string' || !/^[a-zA-Z0-9._:-]{1,128}$/.test(requestId)) {
      return { accepted: false, error: 'requestId inválido.' };
    }
    if (active) return { accepted: false, error: 'Uma simulação PPTools já está em andamento.' };
    if (typeof attackerJson !== 'string' || !attackerJson.trim() || attackerJson.length > maxInputLength) {
      return { accepted: false, error: 'JSON do atacante ausente ou excessivo.' };
    }
    let input;
    try { input = JSON.parse(attackerJson); } catch { return { accepted: false, error: 'JSON do atacante inválido.' }; }
    const level = input?.level, trainerLevel = input?.trainerLevel ?? input?.trainer_level;
    if (!input || Array.isArray(input) || typeof input !== 'object' ||
      !(typeof input.pokemon === 'string' || typeof input.species_id === 'string') ||
      !Number.isInteger(level) || level < 1 ||
      (trainerLevel !== undefined && (!Number.isInteger(trainerLevel) || trainerLevel < 0))) {
      return { accepted: false, error: 'Identidade ou nível do atacante inválidos.' };
    }
    const job = { requestId, input: attackerJson, document,
      level, trainerLevel: trainerLevel ?? null,
      alerts: new Map(), deadline: Date.now() + overallTimeoutMs };
    active = job;
    setTimeout(() => {
      void run(job).then(result => complete(job, result, null), error => complete(job, null, error));
    }, 0);
    return { accepted: true, requestId };
  }

  if (!window.__PPBUI_PPTOOLS_RUNNER__) {
    Object.defineProperty(window, '__PPBUI_PPTOOLS_RUNNER__', {
      value: Object.freeze({ start }), configurable: false, writable: false,
    });
  }
})();
