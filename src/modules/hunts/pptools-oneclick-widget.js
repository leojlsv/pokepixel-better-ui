import { currentPptoolsLeader, samePptoolsLeader } from './pptools-leader.js';
import { currentPptoolsProfileId, readPptoolsNativeInput, toPptoolsAttackerInput } from './pptools-native-input.js';
import { parsePptoolsRecommendations, resolvePptoolsHunt } from './pptools-recommendations.js';
import { huntScene } from './dom.js';

const labels = {
  pt: { idle:'Consulte hunts para o líder atual.', missing:'Líder nativo não identificado.', host:'A consulta automática requer Coupled Workspace com PPTools habilitado.', loading:'Consultando os dados nativos do líder…', running:'Executando simulação no PPTools…', inputTimeout:'Tempo limite da leitura nativa excedido.', simTimeout:'Tempo limite da simulação PPTools excedido.', loaded:'Recomendações do PPTools recebidas.', changed:'Líder, perfil ou sessão alterado. Faça uma nova consulta.', failed:'Consulta PPTools indisponível.', invalid:'Resposta PPTools inválida ou incompleta.', empty:'Nenhuma recomendação retornada.', locate:'Localizar', located:'Hunt localizada.', unavailable:'Hunt não localizada neste mundo ou filtro.', ambiguous:'Mais de uma hunt correspondente.', noNavigation:'Navegação indisponível.', lvl:'Lv.', source:'Estimativas PPTools', noExact:'EXP simulada em ×1, sem bônus ativos apurados. XP/h e ordem das recomendações podem variar; equivalência total com COPIAR JSON não comprovada.', starterUnknown:'Inicial não identificado: bônus de inicial não aplicado.' },
  en: { idle:'Find hunts for the current leader.', missing:'Native leader unavailable.', host:'Automatic queries require PPTools-enabled Coupled Workspace.', loading:'Reading current leader data…', running:'Running PPTools simulation…', inputTimeout:'Native read timed out.', simTimeout:'PPTools simulation timed out.', loaded:'PPTools recommendations received.', changed:'Leader, profile or session changed. Run a new query.', failed:'PPTools query unavailable.', invalid:'Invalid or incomplete PPTools reply.', empty:'No recommendations returned.', locate:'Locate', located:'Hunt located.', unavailable:'Hunt unavailable in this world or filter.', ambiguous:'Multiple matching hunts.', noNavigation:'Navigation unavailable.', lvl:'Lv.', source:'PPTools estimates', noExact:'EXP simulated at ×1 without verified active bonuses. XP/h and ranking may vary; full native COPY JSON parity unverified.', starterUnknown:'Starter status unknown: starter bonus not applied.' },
  es: { idle:'Consulta hunts para el líder actual.', missing:'Líder nativo no disponible.', host:'Las consultas automáticas requieren Coupled Workspace con PPTools habilitado.', loading:'Leyendo datos del líder…', running:'Ejecutando simulación PPTools…', inputTimeout:'Tiempo de lectura nativa excedido.', simTimeout:'Tiempo de simulación PPTools excedido.', loaded:'Recomendaciones PPTools recibidas.', changed:'El líder, perfil o sesión ha cambiado.', failed:'Consulta PPTools no disponible.', invalid:'Respuesta PPTools inválida o incompleta.', empty:'Sin recomendaciones.', locate:'Localizar', located:'Hunt localizada.', unavailable:'Hunt no disponible.', ambiguous:'Varias hunts coincidentes.', noNavigation:'Navegación no disponible.', lvl:'Nv.', source:'Estimaciones PPTools', noExact:'EXP simulada con ×1, sin bonos activos verificados. XP/h y orden pueden variar; equivalencia total con COPIAR JSON sin comprobar.', starterUnknown:'Estado inicial desconocido: bono inicial no aplicado.' },
  zh: { idle:'查询当前队长的狩猎推荐。', missing:'无法确认原生队长。', host:'自动查询需要启用 PPTools 功能的 Coupled Workspace。', loading:'正在读取队长数据…', running:'正在运行 PPTools 模拟…', inputTimeout:'原生数据读取超时。', simTimeout:'PPTools 模拟超时。', loaded:'已获取 PPTools 推荐。', changed:'队长、角色或会话已变更。', failed:'PPTools 查询不可用。', invalid:'PPTools 响应无效或不完整。', empty:'没有推荐。', locate:'定位', located:'已定位狩猎区域。', unavailable:'当前世界或过滤条件下无法定位。', ambiguous:'匹配多个区域。', noNavigation:'导航不可用。', lvl:'等级', source:'PPTools 估算', noExact:'EXP 按 ×1 计算，实际加成未经核实。XP/小时与排名可能不同；尚未验证与原生复制 JSON 完全一致。', starterUnknown:'初始宝可梦状态未知：未应用初始加成。' },
};

const listActions = {
  pt: {locate:'Search',located:'Busca na lista:',searchHint:'Se não aparecer, confira mundo e filtros.',searchChanged:'A lista ou o mundo mudou. Clique Search novamente.',unavailable:'Busca nativa da lista indisponível.'},
  en: {locate:'Search',located:'Search in list:',searchHint:'If absent, check world and filters.',searchChanged:'The list or world changed. Click Search again.',unavailable:'Native Hunts list search unavailable.'},
  es: {locate:'Search',located:'Búsqueda en lista:',searchHint:'Si no aparece, comprueba mundo y filtros.',searchChanged:'La lista o el mundo cambió. Pulsa Search de nuevo.',unavailable:'Búsqueda nativa de Hunts no disponible.'},
  zh: {locate:'Search',located:'列表搜索：',searchHint:'如未显示，请检查世界和筛选条件。',searchChanged:'列表或世界已变化，请重新点击 Search。',unavailable:'原生狩猎列表搜索不可用。'},
};

const transportLabels={
  pt:{profileMissing:'Perfil nativo do treinador indisponível.',transportChanged:'Transporte PPTools alterado. Execute a consulta novamente.'},
  en:{profileMissing:'Native trainer profile unavailable.',transportChanged:'PPTools transport changed. Run the query again.'},
  es:{profileMissing:'Perfil nativo del entrenador no disponible.',transportChanged:'Cambió el transporte PPTools. Vuelve a consultar.'},
  zh:{profileMissing:'无法获取原生训练家资料。',transportChanged:'PPTools 传输已变化，请重新查询。'},
};

const styleText = `
.ppbui-hunts-pptools-oneclick{display:grid;gap:6px;min-width:0;padding:8px 10px;border:1px solid var(--ppbui-border);background:var(--ppbui-bg-2);color:var(--ppbui-text);font:var(--ppbui-font-size-body)/var(--ppbui-line-height-body) var(--ppbui-font-body)}
.ppbui-hunts-pptools-oneclick__header{display:flex;align-items:center;flex-wrap:wrap;gap:6px 9px;min-width:0}
.ppbui-hunts-pptools-oneclick button{min-height:30px;border:1px solid var(--ppbui-border-strong);border-radius:var(--ppbui-radius);background:var(--ppbui-bg-3);color:var(--ppbui-text);font:600 var(--ppbui-font-size-secondary)/var(--ppbui-line-height-tight) var(--ppbui-font-body);padding:4px 9px;cursor:pointer}
.ppbui-hunts-pptools-oneclick button:disabled{opacity:.6;cursor:not-allowed}
.ppbui-hunts-pptools-oneclick button:focus-visible{outline:2px solid var(--ppbui-focus);outline-offset:2px}
.ppbui-hunts-pptools-oneclick__status{color:var(--ppbui-text-muted);min-width:0;overflow-wrap:anywhere}
.ppbui-hunts-pptools-oneclick__status[data-error="true"]{color:var(--ppbui-danger-text,var(--ppbui-text))}
.ppbui-hunts-pptools-oneclick__meta{font:var(--ppbui-font-size-meta)/var(--ppbui-line-height-meta) var(--ppbui-font-data);color:var(--ppbui-text-muted);overflow-wrap:anywhere}
.ppbui-hunts-pptools-oneclick__notice{font:var(--ppbui-font-size-secondary)/var(--ppbui-line-height-body) var(--ppbui-font-data);color:var(--ppbui-text);border-left:2px solid var(--ppbui-border-strong);padding-left:7px;overflow-wrap:anywhere}
.ppbui-hunts-pptools-oneclick__notice:empty{display:none}
.ppbui-hunts-pptools-oneclick__results{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,185px),1fr));gap:6px;min-width:0}
.ppbui-hunts-pptools-oneclick__result{display:grid;align-content:start;gap:4px;min-width:0;padding:6px;border:1px solid var(--ppbui-border);overflow-wrap:anywhere}
.ppbui-hunts-pptools-oneclick__result strong{color:var(--ppbui-text);overflow-wrap:anywhere}
.ppbui-hunts-pptools-oneclick__result small{color:var(--ppbui-text-muted);overflow-wrap:anywhere}
.ppbui-hunts-pptools-oneclick__stats{display:flex;flex-wrap:wrap;gap:2px 8px;color:var(--ppbui-text-subtle);font:600 var(--ppbui-font-size-meta)/1.3 var(--ppbui-font-data)}
.ppbui-hunts-pptools-oneclick__result button{justify-self:start}
@media(pointer:coarse){.ppbui-hunts-pptools-oneclick button{min-height:40px}}
`;

function node(doc, tag, className, content) {
  const result = doc.createElement(tag);
  if (className) result.className = className;
  if (content !== undefined) result.textContent = content;
  return result;
}

function language(doc,mode) {
  const locale = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || 'pt';
  const lang=String(locale).split(/[-_]/)[0];
  return {...(labels[lang]||labels.en),...(transportLabels[lang]||transportLabels.en),
    ...(mode==='list'?(listActions[lang]||listActions.en):{})};
}

function hostBridge(win) {
  const bridge = win?.chrome?.webview;
  const native = win?.__PPBUI_COUPLED_WORKSPACE__?.pptoolsBackground === true &&
    typeof bridge?.postMessage === 'function' &&
    typeof bridge?.addEventListener === 'function' &&
    typeof bridge?.removeEventListener === 'function' ? bridge : null;
  return native;
}

function requestId(win) {
  const values = new Uint8Array(16);
  if (typeof win.crypto?.getRandomValues !== 'function') throw new Error('Identificador seguro da consulta indisponível.');
  win.crypto.getRandomValues(values);
  return 'pptools-' + [...values].map(value => value.toString(16).padStart(2, '0')).join('');
}

/** The controller owns insertion and all Locate effects. This widget does not
 * click host controls, copy clipboard content, or call gameplay APIs. */
export function createPptoolsOneclickWidget(root, {mode, locate, canLocate = () => true} = {}) {
  const doc = root.ownerDocument, win = doc.defaultView;
  const element = node(doc, 'section', 'ppbui-hunts-pptools-oneclick');
  element.dataset.ppbuiPptoolsOneclick = '';
  const header = node(doc, 'div', 'ppbui-hunts-pptools-oneclick__header');
  const run = node(doc, 'button', '', 'PPTools Recommendation');
  run.type = 'button';run.dataset.ppbuiPptoolsRun = '';
  const status = node(doc, 'span', 'ppbui-hunts-pptools-oneclick__status');
  status.setAttribute('role', 'status');status.setAttribute('aria-live', 'polite');
  const meta = node(doc, 'small', 'ppbui-hunts-pptools-oneclick__meta');
  const notice = node(doc, 'small', 'ppbui-hunts-pptools-oneclick__notice');
  notice.setAttribute('role','note');notice.setAttribute('aria-live','polite');
  const results = node(doc, 'div', 'ppbui-hunts-pptools-oneclick__results');
  header.append(run, status);element.append(header, meta, notice, results);
  const style = node(doc, 'style');style.dataset.ppbuiModule = 'hunts-pptools-oneclick';style.textContent = styleText;
  root.append(style);

  let alive = true, epoch = 0, pending = null, imported = null, bound = null, rows = [];
  let bus = null, registeredBridge = null, pendingLeaderId = '', invalidSession = false;
  const busListeners = new Map();
  const events = ['team.updated', 'combat.leader_changed', 'creature.updated', 'creatures.updated',
    'level.up', 'state.resynced', 'auth.loggedOut', 'auth.sessionExpired',
    'auth.accountChangedInAnotherWindow', 'auth.characterMissing'];
  const connected = () => alive && root.isConnected && element.isConnected &&
    root.ownerDocument === doc && doc.defaultView === win;
  const say = (message, error = false) => {
    if (!alive) return;
    if (status.textContent !== message) status.textContent = message;
    const state = String(error);
    if (status.dataset.error !== state) status.dataset.error = state;
  };
  const leader = () => {
    if (invalidSession) return null;
    const value = currentPptoolsLeader(win);
    if (pendingLeaderId) {
      if (value?.id !== pendingLeaderId) return null;
      pendingLeaderId = '';
    }
    return value;
  };
  const profile = () => {
    try { return currentPptoolsProfileId(win); } catch { return null; }
  };
  const compatible = reference => Boolean(reference && connected() && hostBridge(win) &&
    (!reference.bridge || reference.bridge === hostBridge(win)) &&
    samePptoolsLeader(reference.leader, leader()) && reference.profileId === profile());
  const cancelRequest = task => {
    if (task?.timeout) { win.clearTimeout(task.timeout);task.timeout = null; }
    if (!task?.requestId) return;
    try { task.bridge?.postMessage({type:'ppbui.pptools.cancel',protocol:1,requestId:task.requestId}); }
    catch { /* Cancellation is best effort; requestId and epoch still invalidate replies. */ }
  };
  const armTimeout = (task, ms, message) => {
    if (task.timeout) win.clearTimeout(task.timeout);
    task.timeout = win.setTimeout(() => {
      if (pending === task && epoch === task.epoch) clear(message,true);
    },ms);
  };
  const releaseRows = () => {
    if (results.contains(doc.activeElement) && run.isConnected) run.focus({preventScroll:true});
    rows=[];results.replaceChildren();meta.textContent='';notice.textContent='';
  };
  const clear = (message, error = false) => {
    ++epoch;cancelRequest(pending);pending=null;imported=null;bound=null;releaseRows();
    if (message) say(message,error);
  };
  const recalcRows = () => {
    if (!imported || !bound) return;
    const t = language(doc,mode);
    for (const row of rows) {
      const match = mode==='list'?null:resolvePptoolsHunt(root,huntScene(root),row.entry,mode);
      let eligible = false;
      try { eligible = (mode==='list'||match.state==='matched') && typeof locate === 'function' && canLocate(match,row.entry) === true; }
      catch { eligible = false; }
      if (row.button.disabled !== !eligible) row.button.disabled = !eligible;
      const note = eligible ? '' : mode==='list' ? t.unavailable : match.state === 'ambiguous' ? t.ambiguous :
        match.state === 'matched' ? t.noNavigation : t.unavailable;
      if (row.note.textContent !== note) row.note.textContent = note;
      if (row.button.textContent !== t.locate) row.button.textContent = t.locate;
      const label=`${t.locate}: ${row.entry.rank}. ${row.entry.wildSpeciesName} — ${row.entry.huntName}`;
      if (row.button.getAttribute('aria-label') !== label) row.button.setAttribute('aria-label',label);
    }
  };
  const render = () => {
    releaseRows();
    if (!imported || !bound) return;
    const t = language(doc,mode), query = imported;
    const scope = query.source.scope.kind === 'page' ? `p.${query.source.scope.page}` : 'All';
    const order = query.source.sort.key ? `${query.source.sort.key.toUpperCase()} ${query.source.sort.direction === 'desc' ? '↓' : '↑'}` : '?';
    meta.textContent = `${t.source} · ${scope} · ${order} · ${bound.leader.name} ${t.lvl}${bound.leader.level}`;
    notice.textContent = `${t.noExact}${bound.payload.starter == null ? ' ' + t.starterUnknown : ''}`;
    for (const entry of query.recommendations) {
      const item = node(doc,'article','ppbui-hunts-pptools-oneclick__result');
      const title = node(doc,'strong','',`${entry.rank}. ${entry.wildSpeciesName}`);
      const name = node(doc,'small','',entry.huntName);
      const stats = node(doc,'div','ppbui-hunts-pptools-oneclick__stats');
      stats.append(node(doc,'span','',`${t.lvl} ${entry.wildLevelText}`),
        node(doc,'span','','XP/h '+entry.xpPerHourText),
        node(doc,'span','','Gold/h '+entry.goldPerHourText));
      const button = node(doc,'button','',t.locate);button.type = 'button';
      button.setAttribute('aria-label',`${t.locate}: ${entry.rank}. ${entry.wildSpeciesName} — ${entry.huntName}`);
      const note = node(doc,'small');
      button.addEventListener('click', async () => {
        if (!connected() || imported !== query || !results.contains(button) || !compatible(bound)) {
          sync();return;
        }
        const actionEpoch = epoch;
        const startingScene=mode==='list'?huntScene(root):null;
        const startingWorld=startingScene?._tab;
        const sameListContext=()=>mode!=='list'||
          (huntScene(root)===startingScene&&startingScene?._tab===startingWorld);
        let fresh;
        try { fresh = await readPptoolsNativeInput(win); }
        catch { if (actionEpoch === epoch) clear(t.changed,true);return; }
        if (actionEpoch !== epoch || imported !== query || !results.contains(button) ||
            !compatible(bound) || JSON.stringify(fresh.payload) !== JSON.stringify(bound.payload)) {
          if (actionEpoch === epoch) clear(t.changed,true);
          return;
        }
        if(!sameListContext()){say(t.searchChanged,true);return;}
        const match = mode==='list'?null:resolvePptoolsHunt(root,huntScene(root),entry,mode);
        let canNavigate = false;
        try { canNavigate = (mode==='list'||match.state==='matched') && typeof locate === 'function' && canLocate(match,entry) === true; }
        catch { canNavigate = false; }
        if (!canNavigate) {
          recalcRows();say(t.unavailable,true);return;
        }
        let success = false;
        try { success = locate(match,entry) === true; } catch { success = false; }
        if(actionEpoch!==epoch||imported!==query||!results.contains(button)||!compatible(bound))return;
        if(!sameListContext()){say(t.searchChanged,true);return;}
        say(success ? (mode==='list'?`${t.located} ${entry.huntName}. ${t.searchHint}`:t.located) : t.unavailable,!success);
        recalcRows();
      });
      item.append(title,name,stats,button,note);results.append(item);
      rows.push({entry,button,note});
    }
    recalcRows();
  };

  const onHostMessage = async event => {
    const data = event?.data;
    if (!connected() || !data || typeof data !== 'object' || data.type !== 'ppbui.pptools.result') return;
    const task = pending;
    if (!task?.requestId || task.receiving || data.requestId !== task.requestId) return;
    if (data.leaderId !== undefined && String(data.leaderId) !== task.leader.id ||
        data.leaderLevel !== undefined && data.leaderLevel !== task.leader.level ||
        data.leaderSpeciesId !== undefined && data.leaderSpeciesId !== task.leader.speciesId) {
      clear(language(doc).changed,true);return;
    }
    if (!compatible(task)) { clear(language(doc).changed,true);return; }
    task.receiving = true;
    const currentEpoch = epoch;
    try {
      if (data.ok !== true) {
        const error=new Error(typeof data.error === 'string' && data.error.trim()
          ? data.error.slice(0,180) : language(doc).failed);
        error.pptoolsExecutionFailure=true;
        throw error;
      }
      if(typeof data.resultJson!=='string')throw Error('Resultado PPTools ausente.');
      const parsed = parsePptoolsRecommendations(data.resultJson);
      const current = await readPptoolsNativeInput(win);
      if (pending !== task || currentEpoch !== epoch || !compatible(task) ||
          JSON.stringify(current.payload) !== JSON.stringify(task.payload)) {
        if (pending === task) clear(language(doc).changed,true);
        return;
      }
      if (parsed.attacker.speciesId !== null && parsed.attacker.speciesId !== task.leader.speciesId ||
          parsed.attacker.level !== null && parsed.attacker.level !== task.leader.level) {
        throw new Error('Identidade do atacante retornada pelo PPTools diverge da consulta.');
      }
      if (task.timeout) { win.clearTimeout(task.timeout);task.timeout=null; }
      pending = null;imported = parsed;bound = task;
      render();say(language(doc).loaded);
    } catch (error) {
      if (pending === task && currentEpoch === epoch) {
        if (task.timeout) { win.clearTimeout(task.timeout);task.timeout=null; }
        pending = null;imported = null;bound = null;releaseRows();
        say(`${error?.pptoolsExecutionFailure?language(doc).failed:language(doc).invalid} ${String(error?.message || '').slice(0,180)}`,true);
      }
    } finally { if (pending === task) task.receiving = false; }
  };

  const reconcileBridge = () => {
    const current = hostBridge(win);
    if (registeredBridge === current) return;
    if (registeredBridge && (pending || bound)) {
      const t=language(doc,mode);
      clear(current?t.transportChanged:t.host,true);
    }
    registeredBridge?.removeEventListener('message',onHostMessage);
    registeredBridge = current;
    registeredBridge?.addEventListener('message',onHostMessage);
  };
  const onNativeEvent = (name,data) => {
    if (!alive) return;
    if (name.startsWith('auth.')) {
      invalidSession = true;clear(language(doc).changed,true);
    } else {
      const nextId = name === 'team.updated' ? String(data?.leader_id ?? '').trim() :
        name === 'combat.leader_changed' ? String(data?.leader_id ?? data?.creature_id ?? '').trim() : '';
      const activeId = currentPptoolsLeader(win)?.id;
      if (nextId) pendingLeaderId = nextId === activeId ? '' : nextId;
      const tracked = pending || bound;
      const updatedId = String(data?.creature_id ?? data?.creature?.id ?? data?.id ?? '').trim();
      const invalidate = name === 'state.resynced' || name === 'creatures.updated' ||
        (nextId && (!tracked || tracked.leader.id !== nextId)) ||
        (name === 'creature.updated' && (!updatedId || updatedId === tracked?.leader.id)) ||
        (name === 'level.up' && (!updatedId || updatedId === tracked?.leader.id)) ||
        (tracked && !samePptoolsLeader(tracked.leader,leader()));
      if (invalidate) clear(language(doc).changed,true);
    }
    if (connected()) sync();
  };
  const reconcileBus = () => {
    const candidate = win.PokeIdle?.Bus;
    const next = typeof candidate?.on === 'function' && typeof candidate?.off === 'function' ? candidate : null;
    if (bus === next) return;
    if (bus && (pending || bound)) clear(language(doc).changed,true);
    if (bus) for (const [name,handler] of busListeners) bus.off(name,handler);
    busListeners.clear();bus=next;
    if (bus) for (const name of events) {
      const handler = data => onNativeEvent(name,data);
      busListeners.set(name,handler);bus.on(name,handler);
    }
  };

  const sync = () => {
    if (!alive) return;
    reconcileBus();reconcileBridge();
    const current = leader(), bridge = hostBridge(win), currentProfile=profile(), t = language(doc,mode);
    const actionLabel = pending ? (t.rerun || 'Reiniciar consulta PPTools') : 'PPTools Recommendation';
    if (run.textContent !== actionLabel) run.textContent = actionLabel;
    const disabled = !connected() || !bridge || !current || !currentProfile;
    if (run.disabled !== disabled) run.disabled = disabled;
    const tracked = pending || bound;
    if (tracked && !compatible(tracked)) clear(t.changed,true);
    if(!pending&&!imported){
      const state=!bridge?t.host:!current?t.missing:!currentProfile?t.profileMissing:null;
      const availability=[t.idle,t.host,t.missing,t.profileMissing];
      if(!status.textContent||availability.includes(status.textContent)){
        if(state)say(state,true);
        else say(t.idle);
      }
    }
    recalcRows();
  };

  const onRun = async () => {
    if (!connected()) return;
    sync();
    const t = language(doc), nativeLeader = leader(), bridge = hostBridge(win), profileId = profile();
    if (!bridge || !nativeLeader || !profileId) { say(!bridge ? t.host : t.missing,true);return; }
    clear();const task = {epoch,leader:{...nativeLeader},profileId,bridge,requestId:null,timeout:null};
    pending = task;say(t.loading);armTimeout(task,15_000,t.inputTimeout);
    try {
      const input = await readPptoolsNativeInput(win);
      if (pending !== task || epoch !== task.epoch) return;
      if (!compatible(task) || !samePptoolsLeader(task.leader,input.leader) || input.profileId !== profileId) {
        clear(t.changed,true);return;
      }
      task.payload = input.payload;
      const attackerInput = toPptoolsAttackerInput(input.payload);
      task.requestId = requestId(win);
      task.bridge.postMessage({
        type:'ppbui.pptools.run',protocol:1,requestId:task.requestId,
        leaderId:task.leader.id,leaderLevel:task.leader.level,
        leaderSpeciesId:task.leader.speciesId,nativeProfileId:task.profileId,
        inputJson:JSON.stringify(attackerInput),
      });
      armTimeout(task,200_000,t.simTimeout);
      say(t.running);
    } catch (error) {
      if (pending !== task || epoch !== task.epoch) return;
      clear();say(`${t.failed} ${String(error?.message || '').slice(0,180)}`,true);
    }
  };
  run.addEventListener('click',onRun);
  sync();
  return {
    element,sync,
    cleanup() {
      if (!alive) return;
      clear();alive=false;
      if (bus) for (const [name,handler] of busListeners) bus.off(name,handler);
      busListeners.clear();bus=null;
      registeredBridge?.removeEventListener('message',onHostMessage);registeredBridge=null;
      run.removeEventListener('click',onRun);
      element.remove();style.remove();
    },
  };
}
