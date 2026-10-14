export const professionsHudConfig = Object.freeze({
  id: "professions-hud",
  selectors: {
    root: ".profession-workforce",
    workerCard: ".profession-worker[data-slot-index]",
    actions: ".profession-worker__actions",
    emptySelect: ".profession-worker__empty > select",
  },
});

const copy = {
  pt: {
    swap: "TROCAR",
    swapLabel: (name, slot) => `Trocar ${name}, Slot ${slot}`,
    swapTitle: "Troca de trabalhador",
    current: "Atual",
    next: "Novo",
    difference: "Diferença",
    top3: "Top 3 por eficiência",
    slot: slot => `Slot ${slot}`,
    choose: "Substituir por",
    cancel: "CANCELAR",
    applySwap: "TROCAR",
    confirm: "CONFIRMAR TROCA",
    confirmTitle: "TROCAR TRABALHADOR",
    loading: "CARREGANDO...",
    swapping: "TROCANDO...",
    noCandidates: "Nenhum Pokémon disponível para troca.",
    unavailable: "Não foi possível identificar a profissão atual.",
    staleWorker: "O trabalhador deste slot mudou. A troca foi cancelada.",
    staleCandidate: "O Pokémon escolhido não está mais disponível. A troca foi cancelada.",
    lockedSlot: "Este slot não está mais disponível para troca.",
    incomplete: "Não foi possível confirmar a conclusão da troca. O estado da profissão será atualizado; confira o slot antes de tentar novamente.",
    success: (from, to) => `${from} foi trocado por ${to}.`,
    confirmMessage: (from, to, slot, stored) =>
      `Trocar ${from} por ${to} no Slot ${slot}? ${stored > 0 ? `${stored} item(ns) guardado(s) serão coletados antes da troca.` : ""}`.trim(),
  },
  en: {
    swap: "SWAP",
    swapLabel: (name, slot) => `Swap ${name}, Slot ${slot}`,
    swapTitle: "Worker swap",
    current: "Current",
    next: "New",
    difference: "Difference",
    top3: "Top 3 by efficiency",
    slot: slot => `Slot ${slot}`,
    choose: "Replace with",
    cancel: "CANCEL",
    applySwap: "SWAP",
    confirm: "CONFIRM SWAP",
    confirmTitle: "SWAP WORKER",
    loading: "LOADING...",
    swapping: "SWAPPING...",
    noCandidates: "No Pokémon available for this swap.",
    unavailable: "Could not identify the current profession.",
    staleWorker: "The worker in this slot changed. The swap was cancelled.",
    staleCandidate: "The selected Pokémon is no longer available. The swap was cancelled.",
    lockedSlot: "This slot is no longer available for swapping.",
    incomplete: "The swap result could not be confirmed. The profession state will be refreshed; check the slot before trying again.",
    success: (from, to) => `${from} was swapped for ${to}.`,
    confirmMessage: (from, to, slot, stored) =>
      `Swap ${from} for ${to} in Slot ${slot}? ${stored > 0 ? `${stored} stored item(s) will be collected first.` : ""}`.trim(),
  },
  es: {
    swap: "CAMBIAR",
    swapLabel: (name, slot) => `Cambiar ${name}, espacio ${slot}`,
    swapTitle: "Cambio de trabajador",
    current: "Actual",
    next: "Nuevo",
    difference: "Diferencia",
    top3: "Top 3 por eficiencia",
    slot: slot => `Espacio ${slot}`,
    choose: "Sustituir por",
    cancel: "CANCELAR",
    applySwap: "CAMBIAR",
    confirm: "CONFIRMAR CAMBIO",
    confirmTitle: "CAMBIAR TRABAJADOR",
    loading: "CARGANDO...",
    swapping: "CAMBIANDO...",
    noCandidates: "No hay Pokémon disponible para el cambio.",
    unavailable: "No se pudo identificar la profesión actual.",
    staleWorker: "El trabajador de este espacio cambió. El cambio fue cancelado.",
    staleCandidate: "El Pokémon elegido ya no está disponible. El cambio fue cancelado.",
    lockedSlot: "Este espacio ya no está disponible para cambios.",
    incomplete: "No se pudo confirmar el resultado del cambio. El estado de la profesión se actualizará; revisa el espacio antes de intentarlo de nuevo.",
    success: (from, to) => `${from} fue cambiado por ${to}.`,
    confirmMessage: (from, to, slot, stored) =>
      `¿Cambiar ${from} por ${to} en el espacio ${slot}? ${stored > 0 ? `Se recogerán primero ${stored} objeto(s) guardado(s).` : ""}`.trim(),
  },
  zh: {
    swap: "更换",
    swapLabel: (name, slot) => `更换 ${name}，槽位 ${slot}`,
    swapTitle: "更换工作宝可梦",
    current: "当前",
    next: "新",
    difference: "差值",
    top3: "效率前三",
    slot: slot => `槽位 ${slot}`,
    choose: "替换为",
    cancel: "取消",
    applySwap: "更换",
    confirm: "确认更换",
    confirmTitle: "更换工作宝可梦",
    loading: "加载中...",
    swapping: "更换中...",
    noCandidates: "没有可用于更换的宝可梦。",
    unavailable: "无法识别当前职业。",
    staleWorker: "该槽位的工作宝可梦已变化，更换已取消。",
    staleCandidate: "所选宝可梦已不可用，更换已取消。",
    lockedSlot: "该槽位当前不可用于更换。",
    incomplete: "无法确认更换结果。职业状态将刷新；再次尝试前请先检查该槽位。",
    success: (from, to) => `${from} 已更换为 ${to}。`,
    confirmMessage: (from, to, slot, stored) =>
      `将槽位 ${slot} 的 ${from} 更换为 ${to}？${stored > 0 ? `更换前会先领取 ${stored} 个已存物品。` : ""}`,
  },
};

function surfaceLanguage(root) {
  const text = String(root?.textContent || "");
  if (/(?:EQUIPE DE TRABALHO|Selecionar Pokémon|COMEÇAR TRABALHO|COLETAR|REMOVER POKÉMON)/i.test(text)) return "pt";
  return "";
}

export function professionsCopy(doc = document, root = null) {
  const surface = surfaceLanguage(root);
  if (surface && copy[surface]) return copy[surface];
  const lang = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en";
  return copy[lang.split(/[-_]/)[0]] || copy.en;
}
