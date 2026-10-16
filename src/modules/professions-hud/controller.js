import { professionsHudConfig as config, professionsCopy } from "./config.js";
import { findProfessionsScene, professionKind } from "./dom.js";
import css from "./styles.js";
import { readMenuLayoutOwner } from "../menu-bar/layout-owner.js";

const RANK_PREFIX = /^#\s*[123]\s*·\s*/i;
const EFFICIENCY = /(?:Efici[êe]ncia|Efficiency|Eficiencia)\s+([\d.,]+)%/i;

export function stripProfessionRank(text) {
  return String(text || "").replace(RANK_PREFIX, "");
}

export function parseProfessionEfficiency(option) {
  const match = stripProfessionRank(option?.textContent).match(EFFICIENCY);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

export function decorateProfessionTop3(select) {
  if (!select) return [];
  const options = [...select.options].filter(option => String(option.value || "").trim());
  const ranked = options
    .map((option, index) => ({ option, index, efficiency: parseProfessionEfficiency(option) }))
    .filter(entry => entry.efficiency !== null)
    .sort((a, b) => b.efficiency - a.efficiency || a.index - b.index);
  const rankByOption = new Map(ranked.map((entry, index) => [entry.option, index + 1]));

  for (const option of options) {
    const base = stripProfessionRank(option.textContent);
    const rank = rankByOption.get(option);
    const next = rank && rank <= 3 ? `#${rank} · ${base}` : base;
    if (option.textContent !== next) option.textContent = next;
    if (rank && rank <= 3) {
      if (option.dataset.ppbuiProfessionsRank !== String(rank)) option.dataset.ppbuiProfessionsRank = String(rank);
    } else {
      delete option.dataset.ppbuiProfessionsRank;
    }
  }
  if (select.dataset.ppbuiProfessionsRanked !== "") select.dataset.ppbuiProfessionsRanked = "";
  return ranked;
}

function unwrap(response) {
  return response?.data || response || {};
}

function identity(entry) {
  return String(entry?.id || entry?.creature_id || "");
}

function workerIdentity(entry) {
  return String(entry?.creature_id || entry?.id || "");
}

function displayName(entry) {
  return String(entry?.name || entry?.creature_name || entry?.species_name || identity(entry) || "Pokémon");
}

function efficiencyBasis(entry) {
  const value = Number(entry?.efficiency?.total_basis);
  return Number.isFinite(value) ? value : 0;
}

function efficiencyText(entry) {
  return `${(efficiencyBasis(entry) / 100).toFixed(1)}%`;
}

function hideUnusedProfessionNavigation(root) {
  const stage = root.closest(".prof-workforce")?.querySelector(".prof-work-stage");
  if (!stage) return;
  for (const button of stage.querySelectorAll("button")) {
    if (/^ENTRAR NA (?:MINA|FAZENDA)$/i.test(button.textContent.trim())) {
      button.hidden = true;
    }
  }
}

function hideLegacyMiningLicense(root) {
  const scope = root.closest(".prof-workforce") || root.ownerDocument;
  scope.querySelectorAll?.(".prof-work-license, .prof-work-license:not([hidden])").forEach(node => {
    node.hidden = true;
    node.dataset.ppbuiLegacyHidden = "";
  });
}

function productionTotal(rewards) {
  return Object.values(rewards || {}).reduce((total, quantity) => total + (Number(quantity) || 0), 0);
}

function professionApi(win, kind) {
  const api = win?.PokeIdle?.Api;
  if (!api) return null;
  const methods = kind === "miner"
    ? ["getMiningWorkforce", "collectMiningRewards", "removeMiningWorker", "assignMiningWorker"]
    : kind === "farmer"
      ? ["getFarmWorkforce", "collectFarmRewards", "removeFarmWorker", "assignFarmWorker"]
      : [];
  if (!methods.length || methods.some(name => typeof api[name] !== "function")) return null;
  const [get, collect, remove, assign] = methods;
  return {
    owner: api,
    get: () => api[get](),
    collect: slot => api[collect](slot),
    remove: slot => api[remove](slot),
    assign: (creatureId, slot) => api[assign](creatureId, slot),
  };
}

function notify(win, kind, message) {
  const toast = win?.PokeIdle?.Toast;
  const method = toast?.[kind];
  if (typeof method === "function") method.call(toast, message);
}

function emitNativeInvalidation(win) {
  const bus = win?.PokeIdle?.Bus;
  if (typeof bus?.emit !== "function") return;
  bus.emit("inventory.updated", {});
  bus.emit("creatures.updated", {});
}

const STAGE_ANIMATION_KEY = "ppbui:professions-stage-animation:v1";

function stageAnimationEnabled(win) {
  try {
    return win.localStorage?.getItem(STAGE_ANIMATION_KEY) === "true";
  } catch {
    return true;
  }
}

function setStageAnimationEnabled(win, enabled) {
  try {
    win.localStorage?.setItem(STAGE_ANIMATION_KEY, String(enabled));
  } catch {
    // Presentation preference is best effort only.
  }
}

async function refreshNative(root, kind) {
  const win = root.ownerDocument.defaultView;
  const scene = findProfessionsScene(root);
  if (scene) {
    await scene.reloadWorkforce();
    return;
  }
  const controller = win?.PokeIdle?.ProfessionWorkforceMaps;
  const currentKind = controller?.kind || controller?.mapKind?.();
  if (controller?.active && currentKind === kind && typeof controller.refresh === "function") {
    await controller.refresh(true);
  }
}

async function confirmSwap(win, copy, current, replacement, slot, stored) {
  const message = copy.confirmMessage(displayName(current), displayName(replacement), slot, stored);
  if (typeof win?.PokeIdle?.Dialog?.confirm === "function") {
    return Boolean(await win.PokeIdle.Dialog.confirm(message, {
      title: copy.confirmTitle,
      acceptLabel: copy.confirm,
    }));
  }
  return typeof win?.confirm === "function" ? Boolean(win.confirm(message)) : false;
}

function rankedCandidates(state) {
  return [...(Array.isArray(state?.candidates) ? state.candidates : [])]
    .filter(candidate => identity(candidate))
    .sort((a, b) => efficiencyBasis(b) - efficiencyBasis(a));
}

function candidateOptionText(candidate, rank) {
  const prefix = rank <= 3 ? `#${rank} · ` : "";
  return `${prefix}${displayName(candidate)} · ${efficiencyText(candidate)}`;
}

export function mountProfessionsHud(root) {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const currentCopy = () => professionsCopy(doc, root);
  const style = doc.createElement("style");
  style.dataset.ppbuiModule = config.id;
  style.textContent = css;
  root.append(style);

  const previousEnhanced = root.getAttribute("data-ppbui-professions-hud-enhanced");
  root.dataset.ppbuiProfessionsHudEnhanced = "";

  let active = true;
  let busy = false;
  let confirmationPending = false;
  let openGeneration = 0;
  let swapPanel = null;
  let swapTrigger = null;
  let animationToggle = null;
  let collectAllButton = null;
  let collectAllOwner = "", collectAllEpoch = -1;
  let lifecycleEpoch = 0, restoreSwapState = null;
  const currentOwner = () => readMenuLayoutOwner(win).owner;
  let observedOwner = currentOwner();
  const observeOwner = () => {
    const nextOwner = currentOwner();
    if (nextOwner !== observedOwner) {
      observedOwner = nextOwner;
      // A→B→A is not the same session as the first A. Revoke every prior
      // swap/Collect All intent even if Api retains its object identity.
      lifecycleEpoch += 1;
      openGeneration += 1;
      confirmationPending = false;
      restoreSwapState?.();
      restoreSwapState = null;
      closeSwap(false);
      if (active) setBusy(false);
    }
    return nextOwner;
  };
  const intentFor = (api, kind) => ({ owner: observeOwner(), api: api?.owner, kind, epoch: lifecycleEpoch });
  const stillCurrent = intent => {
    const nowOwner = observeOwner();
    return Boolean(active && root.isConnected && intent?.owner && intent.epoch === lifecycleEpoch
      && nowOwner === intent.owner && win.PokeIdle?.Api === intent.api && professionKind(root) === intent.kind);
  };

  const syncStageAnimation = () => {
    const stage = root.closest(".prof-workforce")?.querySelector(".prof-work-stage.miner, .prof-work-stage.farmer");
    if (!stage) return;

    const enabled = stageAnimationEnabled(win);
    stage.dataset.ppbuiProfessionsAnimation = enabled ? "shown" : "hidden";

    if (!animationToggle) {
      animationToggle = doc.createElement("button");
      animationToggle.type = "button";
      animationToggle.className = "pokeidle-btn ppbui-button ppbui-professions-animation-toggle";
      animationToggle.addEventListener("click", () => {
        const next = !stageAnimationEnabled(win);
        setStageAnimationEnabled(win, next);
        syncStageAnimation();
      });
    }

    const workforce = root.closest(".prof-workforce");
    const updateButton = [...(workforce?.querySelectorAll("button") || [])]
        .find(button => /ATUALIZAR|UPDATE/i.test(button.textContent));
    if (updateButton?.parentElement && animationToggle !== updateButton.previousElementSibling) {
      updateButton.parentElement.insertBefore(animationToggle, updateButton);
    } else if (!animationToggle.isConnected) {
      stage.parentElement?.append(animationToggle);
    }
    animationToggle.textContent = enabled ? "OCULTAR ANIMAÇÃO" : "MOSTRAR ANIMAÇÃO";
    animationToggle.setAttribute("aria-pressed", String(enabled));
  };

  const syncCollectAll = () => {
    const actions = root.closest(".prof-workforce")?.querySelector(".profession-workforce");
    if (!actions) return;
    if (collectAllButton && (collectAllOwner !== observedOwner || collectAllEpoch !== lifecycleEpoch)) {
      collectAllButton.remove();
      collectAllButton = null;
    }
    if (!collectAllButton) {
      collectAllOwner = observedOwner;
      collectAllEpoch = lifecycleEpoch;
      const boundOwner = collectAllOwner, boundEpoch = collectAllEpoch;
      collectAllButton = doc.createElement("button");
      collectAllButton.type = "button";
      collectAllButton.className = "pokeidle-btn ppbui-button ppbui-professions-collect-all";
      collectAllButton.textContent = "COLETAR TUDO";
      collectAllButton.addEventListener("click", () => {
        if (currentOwner() !== boundOwner || lifecycleEpoch !== boundEpoch) {
          // A displayed A control must not become B's collection trigger just
          // because the host reused the same DOM and native API before sync.
          observeOwner();
          sync();
          return;
        }
        void collectAll(boundOwner, boundEpoch);
      });
      actions.querySelector(".profession-workforce__slots")?.before(collectAllButton);
    }
  };

  const collectAll = async (boundOwner, boundEpoch) => {
    if (busy || confirmationPending || !active
      || currentOwner() !== boundOwner || lifecycleEpoch !== boundEpoch) return;
    const kind = professionKind(root);
    const api = professionApi(win, kind);
    const intent = intentFor(api, kind);
    if (!api || intent.owner !== boundOwner || intent.epoch !== boundEpoch || !stillCurrent(intent)) return;
    setBusy(true);
    try {
      const state = unwrap(await api.get());
      if (!stillCurrent(intent)) return;
      const workers = Array.isArray(state.workers) ? state.workers : [];
      for (const worker of workers) {
        if (!stillCurrent(intent)) return;
        const slot = Number(worker.slot_index);
        if (!slot || productionTotal(worker.rewards) <= 0) continue;
        await api.collect(slot);
        if (!stillCurrent(intent)) return;
      }
      if (!stillCurrent(intent)) return;
      emitNativeInvalidation(win);
      await refreshNative(root, kind);
    } catch (error) {
      if (stillCurrent(intent)) notify(win, "error", error?.message || "Não foi possível coletar a produção.");
    } finally {
      if (active) { setBusy(false); sync(); }
    }
  };

  const closeSwap = (restoreFocus = false) => {
    const trigger = swapTrigger;
    swapPanel?.remove();
    swapPanel = null;
    swapTrigger = null;
    if (trigger?.isConnected) {
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus) trigger.focus();
    }
  };

  const restoreTop3 = () => {
    for (const select of root.querySelectorAll("[data-ppbui-professions-ranked]")) {
      for (const option of select.options) {
        const next = stripProfessionRank(option.textContent);
        if (option.textContent !== next) option.textContent = next;
        delete option.dataset.ppbuiProfessionsRank;
      }
      delete select.dataset.ppbuiProfessionsRanked;
    }
    root.querySelectorAll("[data-ppbui-professions-top3-hint]").forEach(node => node.remove());
    root.querySelectorAll("[data-ppbui-professions-state]").forEach(card => {
      delete card.dataset.ppbuiProfessionsState;
    });
  };

  const setBusy = value => {
    busy = value;
    for (const button of root.querySelectorAll("[data-ppbui-professions-swap]")) button.disabled = value;
  };

  const focusSlotControl = slot => {
    const card = [...root.querySelectorAll(config.selectors.workerCard)]
      .find(candidate => Number(candidate.dataset.slotIndex) === slot);
    const target = card?.querySelector("[data-ppbui-professions-swap]")
      || card?.querySelector(".profession-worker__empty select:not(:disabled)")
      || card?.querySelector(".profession-worker__actions button:not(:disabled)")
      || card?.querySelector(".profession-worker__empty button:not(:disabled)")
      || root.closest(".prof-workforce")?.querySelector(".prof-work-tab.active");
    target?.focus?.();
  };

  const buildSwapPanel = (button, state, current, slot, intent) => {
    const copy = currentCopy();
    const candidates = rankedCandidates(state);
    if (!candidates.length) {
      notify(win, "error", copy.noCandidates);
      return;
    }

    closeSwap(false);
    const panel = doc.createElement("div");
    panel.dataset.ppbuiProfessionsSwapPanel = "";
    panel.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closeSwap(true);
    });

    const head = doc.createElement("div");
    head.className = "ppbui-professions-swap-head";
    const title = doc.createElement("strong");
    title.textContent = copy.swapTitle;
    const slotLabel = doc.createElement("span");
    slotLabel.textContent = copy.slot(slot);
    head.append(title, slotLabel);

    const field = doc.createElement("label");
    field.className = "ppbui-professions-swap-field";
    field.append(doc.createTextNode(copy.choose));
    const select = doc.createElement("select");
    select.className = "game-window__select ppbui-select";
    select.dataset.ppbuiProfessionsSwapCandidate = "";
    candidates.forEach((candidate, index) => {
      const option = new win.Option(candidateOptionText(candidate, index + 1), identity(candidate));
      option.dataset.efficiencyBasis = String(efficiencyBasis(candidate));
      option.dataset.candidateName = displayName(candidate);
      select.add(option);
    });
    field.append(select);

    const summary = doc.createElement("div");
    summary.className = "ppbui-professions-swap-summary";
    summary.setAttribute("role", "status");
    summary.setAttribute("aria-live", "polite");
    const summaryFact = (label, className) => {
      const fact = doc.createElement("div");
      fact.className = `ppbui-professions-swap-fact ${className}`;
      const caption = doc.createElement("span");
      caption.textContent = label;
      const value = doc.createElement("b");
      fact.append(caption, value);
      return { fact, value };
    };
    const currentFact = summaryFact(copy.current, "is-current");
    const nextFact = summaryFact(copy.next, "is-next");
    const deltaFact = summaryFact(copy.difference, "is-delta");
    currentFact.value.textContent = `${displayName(current)} · ${efficiencyText(current)}`;
    summary.append(currentFact.fact, nextFact.fact, deltaFact.fact);
    const updateSummary = () => {
      const selected = candidates.find(candidate => identity(candidate) === select.value);
      if (!selected) {
        nextFact.value.textContent = "—";
        deltaFact.value.textContent = "—";
        deltaFact.fact.removeAttribute("data-direction");
        return;
      }
      const delta = (efficiencyBasis(selected) - efficiencyBasis(current)) / 100;
      nextFact.value.textContent = `${displayName(selected)} · ${efficiencyText(selected)}`;
      deltaFact.value.textContent = `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} p.p.`;
      deltaFact.fact.dataset.direction = delta > 0 ? "up" : delta < 0 ? "down" : "same";
    };
    select.addEventListener("change", updateSummary);
    updateSummary();

    const actions = doc.createElement("div");
    actions.className = "ppbui-professions-swap-actions";
    const cancel = doc.createElement("button");
    cancel.type = "button";
    cancel.className = "pokeidle-btn ppbui-button ppbui-button--ghost";
    cancel.textContent = copy.cancel;
    cancel.addEventListener("click", () => closeSwap(true));

    const confirm = doc.createElement("button");
    confirm.type = "button";
    confirm.className = "pokeidle-btn ppbui-button ppbui-button--primary";
    confirm.textContent = copy.applySwap;
    confirm.addEventListener("click", async () => {
      if (busy || confirmationPending || !active || !select.value) return;
      if (!stillCurrent(intent)) { closeSwap(false); return; }
      const selectedId = select.value;
      const preview = candidates.find(candidate => identity(candidate) === selectedId);
      if (!preview) return;
      const previewStored = productionTotal(current?.rewards);
      const restoreOwnedFocus = panel.contains(doc.activeElement) || button === doc.activeElement;
      confirmationPending = true;
      confirm.disabled = true;
      let accepted = false;
      try {
        accepted = await confirmSwap(win, copy, current, preview, slot, previewStored);
      } catch (error) {
        if (stillCurrent(intent)) notify(win, "error", error?.message || copy.unavailable);
        return;
      } finally {
        confirmationPending = false;
        if (confirm.isConnected && !busy) confirm.disabled = false;
      }
      if (!accepted) {
        if (!stillCurrent(intent) && swapPanel === panel) closeSwap(false);
        return;
      }
      if (!stillCurrent(intent) || swapPanel !== panel || !panel.isConnected || !button.isConnected) {
        if (swapPanel === panel) closeSwap(false);
        return;
      }

      const kind = professionKind(root);
      const api = professionApi(win, kind);
      if (!kind || !api || !stillCurrent(intent)) {
        notify(win, "error", copy.unavailable);
        return;
      }

      setBusy(true);
      const priorBusy = root.getAttribute("aria-busy");
      const priorInert = root.hasAttribute("inert");
      root.setAttribute("aria-busy", "true");
      root.setAttribute("inert", "");
      const restoreNativeState = () => {
        if (!priorInert) root.removeAttribute("inert");
        if (priorBusy === null) root.removeAttribute("aria-busy");
        else root.setAttribute("aria-busy", priorBusy);
      };
      restoreSwapState = restoreNativeState;
      confirm.textContent = copy.swapping;
      let writeStarted = false;
      let refreshNeeded = false;

      try {
        const fresh = unwrap(await api.get());
        if (!stillCurrent(intent)) return;
        refreshNeeded = true;
        const worker = (Array.isArray(fresh.workers) ? fresh.workers : []).find(entry =>
          Number(entry.slot_index) === slot && workerIdentity(entry) === workerIdentity(current)
        );
        if (!worker) throw new Error(copy.staleWorker);
        const replacement = (Array.isArray(fresh.candidates) ? fresh.candidates : [])
          .find(entry => identity(entry) === selectedId);
        if (!replacement) throw new Error(copy.staleCandidate);
        if (slot > Math.max(0, Number(fresh.max_slots) || 0)) throw new Error(copy.lockedSlot);

        const stored = productionTotal(worker.rewards);
        if (stored > 0) {
          writeStarted = true;
          await api.collect(slot);
          if (!stillCurrent(intent)) return;
        }
        if (!stillCurrent(intent)) return;
        writeStarted = true;
        await api.remove(slot);
        if (!stillCurrent(intent)) return;
        try {
          await api.assign(selectedId, slot);
          if (!stillCurrent(intent)) return;
        } catch {
          throw new Error(copy.incomplete);
        }

        if (stillCurrent(intent)) notify(win, "success", copy.success(displayName(worker), displayName(replacement)));
      } catch (error) {
        if (stillCurrent(intent)) notify(win, "error", error?.message || copy.incomplete);
      } finally {
        if (writeStarted && stillCurrent(intent)) emitNativeInvalidation(win);
        if ((refreshNeeded || writeStarted) && stillCurrent(intent)) {
          try { await refreshNative(root, kind); } catch {}
        }
        if (restoreSwapState === restoreNativeState) {
          restoreSwapState = null;
          restoreNativeState();
        }
        if (active) setBusy(false);
        if (stillCurrent(intent)) {
          closeSwap(false);
          sync();
          if (restoreOwnedFocus) focusSlotControl(slot);
        }
      }
    });

    actions.append(cancel, confirm);
    panel.append(head, field, summary, actions);
    button.closest(config.selectors.actions)?.append(panel);
    swapPanel = panel;
    swapTrigger = button;
    button.setAttribute("aria-expanded", "true");
    select.focus();
  };

  const openSwap = async button => {
    const copy = currentCopy();
    if (busy || confirmationPending || !active) return;
    if (swapTrigger === button && swapPanel?.isConnected) {
      closeSwap(true);
      return;
    }
    if (swapPanel?.isConnected) closeSwap(false);
    const generation = ++openGeneration;
    const card = button.closest(config.selectors.workerCard);
    const slot = Number(card?.dataset.slotIndex);
    const currentId = String(card?.dataset.creatureId || "");
    const kind = professionKind(root);
    const api = professionApi(win, kind);
    const intent = intentFor(api, kind);
    if (!card || !slot || !currentId || !kind || !api || !stillCurrent(intent)) {
      notify(win, "error", copy.unavailable);
      return;
    }

    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = copy.loading;
    try {
      const state = unwrap(await api.get());
      if (
        generation !== openGeneration || busy || confirmationPending || !active
        || !button.isConnected || !stillCurrent(intent)
      ) return;
      const current = (Array.isArray(state.workers) ? state.workers : []).find(entry =>
        Number(entry.slot_index) === slot && workerIdentity(entry) === currentId
      );
      if (!current) {
        const restoreOwnedFocus = doc.activeElement === button;
        notify(win, "error", copy.staleWorker);
        await refreshNative(root, kind);
        if (active) {
          sync();
          if (restoreOwnedFocus) focusSlotControl(slot);
        }
        return;
      }
      if (slot > Math.max(0, Number(state.max_slots) || 0)) {
        notify(win, "error", copy.lockedSlot);
        return;
      }
      buildSwapPanel(button, state, current, slot, intent);
    } catch (error) {
      if (stillCurrent(intent)) notify(win, "error", error?.message || copy.unavailable);
    } finally {
      if (button.isConnected && active) {
        button.disabled = busy || confirmationPending;
        button.textContent = originalLabel;
      }
    }
  };

  const syncSwapButtons = () => {
    const copy = currentCopy();
    hideUnusedProfessionNavigation(root);
    for (const card of root.querySelectorAll(config.selectors.workerCard)) {
      const actions = card.querySelector(config.selectors.actions);
      const currentId = String(card.dataset.creatureId || "");
      const locked = card.classList.contains("is-locked");
      const state = locked ? "locked" : currentId ? "occupied" : "empty";
      if (card.dataset.ppbuiProfessionsState !== state) card.dataset.ppbuiProfessionsState = state;
      const existing = actions?.querySelector(":scope > [data-ppbui-professions-swap]");
      const collect = actions?.querySelector(':scope > [data-role="worker-collect"]');
      const remove = actions ? [...actions.children].find(node =>
        node.tagName === "BUTTON" && node !== collect && !node.hasAttribute("data-ppbui-professions-swap")
      ) : null;
      if (remove) {
        if (remove.textContent.trim() !== "REMOVER") remove.textContent = "REMOVER";
        if (remove.getAttribute("aria-label") !== "Remover Pokémon do trabalho") {
          remove.setAttribute("aria-label", "Remover Pokémon do trabalho");
        }
      }
      if (!actions || !currentId || locked) {
        existing?.remove();
        continue;
      }
      const workerName = card.querySelector('[data-role="worker-name"]')?.textContent?.trim() || currentId;
      const accessibleLabel = copy.swapLabel(workerName, Number(card.dataset.slotIndex));
      if (existing) {
        if (remove && existing.nextElementSibling !== remove) actions.insertBefore(existing, remove);
        if (existing.textContent !== copy.swap) existing.textContent = copy.swap;
        if (existing.getAttribute("aria-label") !== accessibleLabel) existing.setAttribute("aria-label", accessibleLabel);
        continue;
      }
      const button = doc.createElement("button");
      button.type = "button";
      button.className = "pokeidle-btn ppbui-button ppbui-button--action ppbui-professions-swap-button";
      button.dataset.ppbuiProfessionsSwap = "";
      button.textContent = copy.swap;
      button.setAttribute("aria-label", accessibleLabel);
      button.setAttribute("aria-expanded", "false");
      button.addEventListener("click", () => openSwap(button));
      if (remove) actions.insertBefore(button, remove);
      else actions.append(button);
    }
  };

  const sync = () => {
    if (!active) return;
    observeOwner();
    const copy = currentCopy();
    hideLegacyMiningLicense(root);
    for (const select of root.querySelectorAll(config.selectors.emptySelect)) {
      const ranked = decorateProfessionTop3(select);
      const parent = select.parentElement;
      let hint = parent?.querySelector(":scope > [data-ppbui-professions-top3-hint]");
      if (!ranked.length) {
        hint?.remove();
        continue;
      }
      if (!hint) {
        hint = doc.createElement("small");
        hint.dataset.ppbuiProfessionsTop3Hint = "";
        select.before(hint);
      }
      if (hint.textContent !== copy.top3) hint.textContent = copy.top3;
    }
    syncSwapButtons();
    syncStageAnimation();
    syncCollectAll();
    if (swapPanel && !swapPanel.isConnected) closeSwap(false);
  };

  sync();

  return {
    sync,
    cleanup() {
      active = false;
      lifecycleEpoch += 1;
      openGeneration += 1;
      restoreSwapState?.();
      restoreSwapState = null;
      closeSwap(false);
      restoreTop3();
      root.querySelectorAll("[data-ppbui-professions-swap]").forEach(button => button.remove());
      animationToggle?.remove();
      collectAllButton?.remove();
      if (previousEnhanced === null) root.removeAttribute("data-ppbui-professions-hud-enhanced");
      else root.setAttribute("data-ppbui-professions-hud-enhanced", previousEnhanced);
      style.remove();
    },
  };
}
